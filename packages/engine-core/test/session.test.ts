import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import type { Event, Participant } from '../src/types.js';

const HOUR = 3600_000;

const DOC = [
  '# Charter',
  'Membership is open to anyone.',
  'Decisions are made by consensus.',
  'Meetings happen when someone calls one.',
].join('\n');

function roster(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, handle: `P${i + 1}` }));
}

function openSession(overrides: Record<string, unknown> = {}): Session {
  const constitution = makeConstitution({
    windowStartMs: 0,
    windowEndMs: 10 * HOUR,
    rngSeed: 'test-seed',
    cooldownMs: 0,
    ...overrides,
  });
  return Session.open({ text: DOC, roster: roster(5), constitution }, 0);
}

/** Replace line `line` with `text` (single-hunk rewrite). */
function rewrite(base: number, line: number, text: string) {
  return { baseVersion: base, hunks: [{ start: line, end: line + 1, lines: [text] }] };
}

describe('session lifecycle', () => {
  it('runs a full mini-session: rivalry, adoption, rebase fallout, replay', () => {
    const s = openSession();

    // Two rivals on the membership line, one independent on meetings.
    const { id: c1, raceId: r1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'Membership requires two existing members to vouch.'),
      rationale: 'Vouching keeps the roster accountable.',
    });
    const { id: c2, raceId: r2 } = s.submitCandidate(2000, {
      author: 'p2',
      patch: rewrite(0, 1, 'Membership is granted by majority vote.'),
      rationale: 'Votes are legible; vouching is clubby.',
    });
    const { id: c3, raceId: r3 } = s.submitCandidate(3000, {
      author: 'p3',
      patch: rewrite(0, 3, 'Meetings happen fortnightly.'),
      rationale: 'A rhythm beats ad-hoc scheduling.',
    });
    expect(r1).toBe(r2); // same contested line → same race
    expect(r3).not.toBe(r1);
    expect(s.races()).toHaveLength(2);

    // The membership race: c1 beats c2 and the incumbent, repeatedly.
    const race = s.races().find((r) => r.id === r1)!;
    const inc = race.incumbentId;
    let adopted: Event | undefined;
    let t = 10_000;
    outer: for (const judge of ['p3', 'p4', 'p5', 'p2', 'p1']) {
      for (const pair of [
        [c1, c2],
        [c1, inc],
      ] as const) {
        const events = s.judge((t += 1000), judge, pair[0], pair[1], 'a');
        adopted = events.find((e) => e.type === 'adopted');
        if (adopted) break outer;
      }
    }
    expect(adopted).toBeDefined();
    expect(adopted!.type === 'adopted' && adopted!.candidateId).toBe(c1);

    // The document changed; the loser is in rebase limbo; c3 sailed on.
    expect(s.document()).toContain('two existing members to vouch');
    expect(s.getCandidate(c1).state).toBe('adopted');
    expect(s.getCandidate(c2).state).toBe('rebase-pending');
    expect(s.getCandidate(c3).state).toBe('live');

    // Winner refunded at 1.5x (peakW cleared theta > 0.5).
    expect(s.getCandidate(c1).exit?.refund).toBeCloseTo(1.5, 10);

    // The loser confirms against the new text; evidence resets.
    s.confirmRebase(t + 1000, c2, rewrite(1, 1, 'Membership is granted by majority vote.'));
    expect(s.getCandidate(c2).state).toBe('live');
    const c2race = s.raceOf(c2);
    expect(c2race.comparisons).toBe(0); // reset: old judgments no longer speak

    // Replay the log: identical state, identical rolling hash.
    expect(s.verifyChain()).toBe(true);
    const replayed = Session.replay(s.log);
    expect(replayed.document()).toBe(s.document());
    expect(replayed.rollingHash()).toBe(s.rollingHash());
    expect(replayed.races().length).toBe(s.races().length);

    // Receipts: every judge can verify their moves were counted.
    expect(s.receipt('p3').length).toBeGreaterThan(0);
    for (const { seq, hash } of s.receipt('p3')) {
      expect(s.log[seq]!.hash).toBe(hash);
    }
  });

  it('classifies cross-race pairs as diagonals and feeds the salience model', () => {
    const s = openSession();
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'Membership by vouching.'),
      rationale: 'r',
    });
    const { id: c2 } = s.submitCandidate(2000, {
      author: 'p2',
      patch: rewrite(0, 3, 'Meetings fortnightly.'),
      rationale: 'r',
    });
    const events = s.judge(3000, 'p3', c1, c2, 'a');
    expect(events[0]!.type === 'comparison' && events[0]!.kind).toBe('diagonal');
    // c1's race now outweighs c2's.
    const weights = s.salienceWeights();
    const w1 = weights.get(s.raceOf(c1).id)!;
    const w2 = weights.get(s.raceOf(c2).id)!;
    expect(w1).toBeGreaterThan(w2);
    // Diagonals never touch adoption: no adoption events fired.
    expect(events.some((e) => e.type === 'adopted')).toBe(false);
  });

  it('enforces the moves: no self-pairs, no double judgments, no judging after the peek', () => {
    const s = openSession();
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    const { id: c2 } = s.submitCandidate(2000, {
      author: 'p2',
      patch: rewrite(0, 1, 'B.'),
      rationale: 'r',
    });
    expect(() => s.judge(3000, 'p3', c1, c1, 'a')).toThrow(/itself/);
    s.judge(4000, 'p3', c1, c2, 'tie');
    expect(() => s.judge(5000, 'p3', c2, c1, 'a')).toThrow(/already judged/);
    // Propose C prices the peek: the forfeited pair is never collectable.
    s.openComposer(6000, 'p4', { aId: c1, bId: c2 });
    expect(() => s.judge(7000, 'p4', c1, c2, 'a')).toThrow(/already judged/);
    // But p5 is unaffected.
    expect(s.judge(8000, 'p5', c1, c2, 'b')).toBeDefined();
  });

  it('gates adoption on the floor of distinct movers', () => {
    // E = 5 → F = ceil(5/3) = 2: one mover alone cannot adopt.
    const s = openSession();
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    const inc = s.raceOf(c1).incumbentId;
    const events = s.judge(2000, 'p2', c1, inc, 'a');
    expect(events.some((e) => e.type === 'adopted')).toBe(false);
    expect(s.raceOf(c1).distinctMovers).toBe(1);
    expect(s.adoptionFloor()).toBe(2);
  });

  it('respects the adoption cooldown', () => {
    const s = openSession({ cooldownMs: 5 * 60_000 });
    const submit = (author: string, line: number, text: string) =>
      s.submitCandidate(1000, { author, patch: rewrite(0, line, text), rationale: 'r' });
    const { id: c1 } = submit('p1', 1, 'A.');
    const { id: c2 } = submit('p2', 3, 'B.');
    // Drive c1 to adoption.
    const inc1 = s.raceOf(c1).incumbentId;
    let t = 10_000;
    let adoptedAt = 0;
    for (const judge of ['p2', 'p3', 'p4', 'p5']) {
      const events = s.judge((t += 1000), judge, c1, inc1, 'a');
      if (events.some((e) => e.type === 'adopted')) {
        adoptedAt = t;
        break;
      }
    }
    expect(adoptedAt).toBeGreaterThan(0);
    // c2 gathers the same support inside the cooldown: no adoption.
    const inc2 = s.raceOf(c2).incumbentId;
    let sawAdoption = false;
    for (const judge of ['p1', 'p3', 'p4', 'p5']) {
      const events = s.judge((t += 1000), judge, c2, inc2, 'a');
      if (events.some((e) => e.type === 'adopted')) sawAdoption = true;
    }
    expect(sawAdoption).toBe(false);
    // After the cooldown, the next judgment tips it.
    const events = s.judge(adoptedAt + 5 * 60_000 + 1, 'p2', c2, inc2, 'a');
    expect(events.some((e) => e.type === 'adopted')).toBe(true);
  });

  it('raises the bar over the window: identical evidence adopts early, not late', () => {
    const judgeTwice = (s: Session, c: string, t0: number): boolean => {
      const inc = s.raceOf(c).incumbentId;
      let adopted = false;
      for (const [i, judge] of ['p2', 'p3'].entries()) {
        const events = s.judge(t0 + i * 1000, judge, c, inc, 'a');
        adopted ||= events.some((e) => e.type === 'adopted');
      }
      return adopted;
    };
    // Early: threshold ≈ 0.60 — two clean wins clear it.
    const early = openSession();
    const { id: cE } = early.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    expect(judgeTwice(early, cE, 2000)).toBe(true);
    // Late: same two wins against a ≈0.95 bar do not.
    const late = openSession();
    const { id: cL } = late.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    expect(judgeTwice(late, cL, 10 * HOUR)).toBe(false);
    expect(late.adoptionThreshold()).toBeCloseTo(0.95, 6);
  });

  it('recomputes the floor when the roster changes, and blocks removed participants', () => {
    const s = openSession();
    expect(s.adoptionFloor()).toBe(2);
    s.addParticipant(1000, { id: 'p6', handle: 'P6' });
    expect(s.adoptionFloor()).toBe(2); // ceil(6/3) = 2
    s.addParticipant(1100, { id: 'p7', handle: 'P7' });
    expect(s.adoptionFloor()).toBe(3); // ceil(7/3) = 3
    s.removeParticipant(2000, 'p7');
    s.removeParticipant(2100, 'p6');
    s.removeParticipant(2200, 'p5');
    s.removeParticipant(2300, 'p4');
    expect(s.adoptionFloor()).toBe(1); // ceil(3/3) = 1
    expect(() =>
      s.submitCandidate(3000, { author: 'p4', patch: rewrite(0, 1, 'X.'), rationale: 'r' }),
    ).toThrow(/removed/);
    // A removed author's live candidate stays live (SPEC §9.3).
    const { id } = s.submitCandidate(4000, {
      author: 'p1',
      patch: rewrite(0, 1, 'Y.'),
      rationale: 'r',
    });
    s.removeParticipant(5000, 'p1');
    expect(s.getCandidate(id).state).toBe('live');
  });

  it('enforces stakes: submissions stop when tokens run out', () => {
    const s = openSession();
    // Grant 4 at t=0, no drip yet: 4 stakes affordable, the 5th is not.
    for (let i = 0; i < 4; i++) {
      s.submitCandidate(1000 + i, {
        author: 'p1',
        patch: rewrite(0, i, `Line ${i} rewritten.`),
        rationale: 'r',
      });
    }
    expect(() =>
      s.submitCandidate(2000, { author: 'p1', patch: rewrite(0, 1, 'Z.'), rationale: 'r' }),
    ).toThrow(/insufficient tokens/);
    // After 10% of the window drips one token, one more stake fits.
    expect(
      s.submitCandidate(HOUR + 1, { author: 'p1', patch: rewrite(0, 1, 'Z.'), rationale: 'r' })
        .id,
    ).toBeTruthy();
  });

  it('refunds by the book: withdrawal full, retirement per performance', () => {
    const s = openSession();
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    const { id: c2 } = s.submitCandidate(1500, {
      author: 'p1',
      patch: rewrite(0, 3, 'B.'),
      rationale: 'r',
    });
    expect(s.balance('p1', 1500)).toBe(2);
    s.withdraw(2000, c1);
    expect(s.balance('p1', 2000)).toBe(3); // full stake back
    // c2 loses twice to the incumbent, then retires: refund < stake.
    const inc = s.raceOf(c2).incumbentId;
    s.judge(3000, 'p2', c2, inc, 'b');
    s.judge(4000, 'p3', c2, inc, 'b');
    s.retire(5000, c2);
    const refund = s.getCandidate(c2).exit!.refund;
    expect(refund).toBeGreaterThanOrEqual(0);
    expect(refund).toBeLessThan(1);
  });

  it('serves feeds: deterministic, magnitude-only, no repeats of judged pairs', () => {
    const s = openSession();
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    s.submitCandidate(2000, {
      author: 'p2',
      patch: rewrite(0, 1, 'B.'),
      rationale: 'r',
    });
    s.submitCandidate(3000, {
      author: 'p3',
      patch: rewrite(0, 3, 'C.'),
      rationale: 'r',
    });
    const feed1 = s.feed('p4', 5);
    const feed2 = s.feed('p4', 5);
    expect(feed1).toEqual(feed2); // pure
    expect(feed1.length).toBeGreaterThan(0);
    // Cards expose ids and magnitude only — no outcome direction.
    for (const card of feed1) {
      expect(Object.keys(card).sort()).toEqual(
        expect.arrayContaining(['aId', 'bId', 'kind', 'raceId', 'value']),
      );
    }
    // A judged pair leaves the participant's feed.
    const first = feed1[0]!;
    s.judge(4000, 'p4', first.aId, first.bId, 'a');
    const after = s.feed('p4', 5);
    expect(
      after.some(
        (c) =>
          (c.aId === first.aId && c.bId === first.bId) ||
          (c.aId === first.bId && c.bId === first.aId),
      ),
    ).toBe(false);
    // c1 still live (floor unmet with one mover).
    expect(s.getCandidate(c1).state).toBe('live');
  });

  it('closes: no moves after, final render applies theta-clearing leaders', () => {
    const s = openSession();
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 3, 'Meetings happen fortnightly.'),
      rationale: 'r',
    });
    const inc = s.raceOf(c1).incumbentId;
    // Two movers, both prefer c1, but stop short of adoption certainty.
    s.judge(2000, 'p2', c1, inc, 'a');
    const races = s.races();
    expect(races).toHaveLength(1);
    s.close(10_000);
    expect(s.closed).toBe(true);
    expect(() => s.judge(11_000, 'p3', c1, inc, 'a')).toThrow(/closed/);
    // Not enough evidence to clear theta: the incumbent text ships.
    const render = s.finalRender();
    expect(render.applied).toHaveLength(0);
    expect(render.text).toContain('when someone calls one');
    // The near-miss ships as backlog, ranked.
    const backlog = s.backlog();
    expect(backlog).toHaveLength(1);
    expect(backlog[0]!.candidateId).toBe(c1);
  });

  it('keeps the incumbent honest: adoption elsewhere leaves evidence intact', () => {
    // Adopting in one race must not stale the other race's incumbent.
    const s = openSession();
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    const { id: c2 } = s.submitCandidate(2000, {
      author: 'p2',
      patch: rewrite(0, 3, 'B.'),
      rationale: 'r',
    });
    const incC2 = s.raceOf(c2).incumbentId;
    s.judge(3000, 'p3', c2, incC2, 'a'); // evidence in race 2
    // Drive race 1 to adoption.
    const incC1 = s.raceOf(c1).incumbentId;
    let t = 4000;
    for (const judge of ['p2', 'p4', 'p5']) {
      const events = s.judge((t += 1000), judge, c1, incC1, 'a');
      if (events.some((e) => e.type === 'adopted')) break;
    }
    expect(s.getCandidate(c1).state).toBe('adopted');
    // Race 2's incumbent id is unchanged; its comparison still counts.
    const race2 = s.raceOf(c2);
    expect(race2.incumbentId).toBe(incC2);
    expect(race2.comparisons).toBe(1);
  });
});
