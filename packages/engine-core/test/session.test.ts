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
    // Ledger parity: refunds depend on peakW, which must be reproduced by
    // the fold alone (regression: peakW once lived only in the command
    // layer, so replayed sessions paid different refunds).
    for (const p of ['p1', 'p2', 'p3', 'p4', 'p5']) {
      expect(replayed.balance(p, t + 10_000)).toBe(s.balance(p, t + 10_000));
    }
    expect(replayed.getCandidate(c1).peakW).toBe(s.getCandidate(c1).peakW);

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

  it('enforces the moves: no self-pairs, revision supersedes, no judging after the peek', () => {
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
    // Re-judging the same pair on the same ground is a revision (SPEC
    // §4.4, Q50): superseded in the ranking, both kept in the log.
    s.judge(5000, 'p3', c2, c1, 'a');
    expect(s.raceOf(c1).comparisons).toBe(1); // latest only
    const mine = s.judgments().filter((j) => j.participantId === 'p3');
    expect(mine).toHaveLength(2);
    expect(mine[0]!.superseded).toBe(true);
    expect(mine[1]!.superseded).toBe(false);
    // Propose C prices the peek: the forfeited pair is never collectable,
    // and unlike a judgment the forfeit cannot be revised away.
    s.openComposer(6000, 'p4', { aId: c1, bId: c2 });
    expect(() => s.judge(7000, 'p4', c1, c2, 'a')).toThrow(/forfeited/);
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

  it('revises judgments while the ground stands: ranking follows the latest, floors count once', () => {
    const s = openSession();
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    const inc = s.raceOf(c1).incumbentId;
    // p3 backs the incumbent, then changes their mind.
    s.judge(2000, 'p3', c1, inc, 'b');
    const pBefore = s.raceOf(c1).leaderP!;
    expect(pBefore).toBeLessThan(0.5);
    s.judge(3000, 'p3', c1, inc, 'a');
    const pAfter = s.raceOf(c1).leaderP!;
    expect(pAfter).toBeGreaterThan(0.5);
    // The revision replaces, never double-counts: one usable comparison,
    // one distinct mover, however often p3 revises.
    s.judge(4000, 'p3', c1, inc, 'tie');
    const race = s.raceOf(c1);
    expect(race.comparisons).toBe(1);
    expect(race.distinctMovers).toBe(1);
    // Replay reproduces revisions exactly.
    const replayed = Session.replay(s.log);
    expect(replayed.rollingHash()).toBe(s.rollingHash());
    expect(replayed.raceOf(c1).comparisons).toBe(1);
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

describe('ground shifts lock judgments and re-serve pairs (SPEC §4.4, Q50)', () => {
  it('an adoption within the race locks ALL its judgments, rival-vs-rival included', () => {
    const s = openSession();
    // A chain race: w (lines 2-3) — cA (lines 1-2) — cB (line 1) — cC (line 1).
    // cB and cC survive w's adoption by clean rebase; cA conflicts.
    const { id: w } = s.submitCandidate(1000, {
      author: 'p1',
      patch: {
        baseVersion: 0,
        hunks: [{ start: 2, end: 4, lines: ['Decisions by vote.', 'Meetings fortnightly.'] }],
      },
      rationale: 'r',
    });
    const { id: cA } = s.submitCandidate(2000, {
      author: 'p2',
      patch: {
        baseVersion: 0,
        hunks: [{ start: 1, end: 3, lines: ['Members decide together.'] }],
      },
      rationale: 'r',
    });
    const { id: cB } = s.submitCandidate(3000, {
      author: 'p3',
      patch: rewrite(0, 1, 'Membership by vouching.'),
      rationale: 'r',
    });
    const { id: cC } = s.submitCandidate(4000, {
      author: 'p4',
      patch: rewrite(0, 1, 'Membership by vote.'),
      rationale: 'r',
    });
    // One connected component.
    expect(s.races()).toHaveLength(1);
    const oldInc = s.races()[0]!.incumbentId;

    // A rival-vs-rival judgment on the old ground.
    s.judge(5000, 'p5', cB, cC, 'a');

    // Drive w to adoption.
    let t = 6000;
    let adopted = false;
    for (const judge of ['p2', 'p3', 'p4']) {
      const events = s.judge((t += 1000), judge, w, oldInc, 'a');
      if (events.some((e) => e.type === 'adopted')) {
        adopted = true;
        break;
      }
    }
    expect(adopted).toBe(true);
    expect(s.getCandidate(cA).state).toBe('rebase-pending');

    // The survivors' race re-forms on the new ground: same words on the
    // contested line, but the race's incumbent changed (adoption within
    // the race) — a material shift. Everything locks, including the
    // rival pair Ed's conservative reading covers.
    const race = s.raceOf(cB);
    expect(race.members).toEqual([cB, cC]);
    expect(race.incumbentId).not.toBe(oldInc);
    expect(race.comparisons).toBe(0); // ranking restarts from nothing
    expect(race.distinctMovers).toBe(0); // certification from scratch
    expect(race.leaderP).toBeCloseTo(0.5, 6); // no prior smuggled in
    const rival = s
      .judgments()
      .find((j) => j.participantId === 'p5' && j.kind === 'edge');
    expect(rival?.locked).toBe(true);
    expect(rival?.superseded).toBe(false); // locked, not superseded

    // The pair re-enters as a fresh question: the same participant may
    // judge it again on the new ground, and it counts.
    s.judge(t + 1000, 'p5', cB, cC, 'b');
    expect(s.raceOf(cB).comparisons).toBe(1);

    // The re-opened race gets router priority: its fresh pairs are back
    // in the feed even for participants who judged the old ground.
    const feed = s.feed('p5', 5, t + 2000);
    expect(feed.length).toBeGreaterThan(0);
    expect(feed.some((c) => c.raceId === s.raceOf(cB).id)).toBe(true);

    // Replay reproduces the shift, the locks, and the fresh evidence.
    const replayed = Session.replay(s.log);
    expect(replayed.rollingHash()).toBe(s.rollingHash());
    expect(replayed.raceOf(cB).comparisons).toBe(1);
  });

  it('context drift is not material: adoption elsewhere that moves a span locks nothing', () => {
    const s = openSession();
    // w rewrites line 1 into TWO lines, so races below it shift position.
    const { id: w } = s.submitCandidate(1000, {
      author: 'p1',
      patch: {
        baseVersion: 0,
        hunks: [{ start: 1, end: 2, lines: ['Membership is open.', 'Guests are welcome.'] }],
      },
      rationale: 'r',
    });
    const { id: c2 } = s.submitCandidate(2000, {
      author: 'p2',
      patch: rewrite(0, 3, 'Meetings fortnightly.'),
      rationale: 'r',
    });
    const { id: c3 } = s.submitCandidate(3000, {
      author: 'p3',
      patch: rewrite(0, 3, 'Meetings monthly.'),
      rationale: 'r',
    });
    const incMeetings = s.raceOf(c2).incumbentId;
    // Evidence in the meetings race: one incumbent pair, one rival pair
    // (the incumbent wins its pair, so this race cannot adopt early).
    s.judge(4000, 'p4', c2, incMeetings, 'b');
    s.judge(5000, 'p5', c2, c3, 'a');
    // Adopt w; the meetings race moves down a line but keeps its words.
    const incW = s.raceOf(w).incumbentId;
    let t = 6000;
    for (const judge of ['p2', 'p3', 'p4']) {
      const events = s.judge((t += 1000), judge, w, incW, 'a');
      if (events.some((e) => e.type === 'adopted')) break;
    }
    expect(s.getCandidate(w).state).toBe('adopted');
    expect(s.getCandidate(c2).footprint[0]!.start).toBe(4); // moved
    // Same words, same ground: the positional incumbent id is a content
    // hash, so nothing locks — both judgments still feed the posterior.
    const race = s.raceOf(c2);
    expect(race.incumbentId).toBe(incMeetings);
    expect(race.comparisons).toBe(2);
    for (const j of s.judgments().filter((x) => ['p4', 'p5'].includes(x.participantId))) {
      expect(j.locked).toBe(false);
    }
  });
});

describe('rival-pair gating (SPEC §8.3, Q48)', () => {
  /** Freeze the threshold out of reach so no adoption interferes. */
  const openGated = () =>
    openSession({ adoptionThresholdStart: 0.99, adoptionThresholdEnd: 0.99 });

  const twoRivals = (s: Session) => {
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'Membership by vouching.'),
      rationale: 'r',
    });
    const { id: c2 } = s.submitCandidate(2000, {
      author: 'p2',
      patch: rewrite(0, 1, 'Membership by vote.'),
      rationale: 'r',
    });
    return { c1, c2, inc: s.raceOf(c1).incumbentId };
  };

  it('serves incumbent pairs first; rival pairs only when a judge has exhausted them', () => {
    const s = openGated();
    const { c1, c2, inc } = twoRivals(s);
    // No displacement evidence yet: the gate is closed.
    expect(s.raceOf(c1).rivalGateOpen).toBe(false);
    // A fresh participant sees only incumbent-involving cards for this race.
    for (const card of s.feed('p4', 6, 3000)) {
      if (card.kind === 'diagonal') continue;
      expect(card.subtype).toBe('incumbent');
      expect([card.aId, card.bId]).toContain(inc);
    }
    // A participant who has judged both incumbent pairs is owed the rival
    // pair — served sparingly, as the fallback.
    s.judge(3000, 'p4', c1, inc, 'b');
    s.judge(4000, 'p4', c2, inc, 'b');
    const fallback = s.feed('p4', 6, 5000);
    const rivalCard = fallback.find((c) => c.subtype === 'rival');
    expect(rivalCard).toBeDefined();
    expect([rivalCard!.aId, rivalCard!.bId].sort()).toEqual([c1, c2].sort());
  });

  it('opens on displacement evidence: P(beats incumbent) above the gate on minimum comparisons', () => {
    const s = openGated();
    const { c1, inc } = twoRivals(s);
    // Two wins: minimum evidence not met, gate stays closed.
    s.judge(3000, 'p3', c1, inc, 'a');
    s.judge(4000, 'p4', c1, inc, 'a');
    expect(s.raceOf(c1).rivalGateOpen).toBe(false);
    // Third incumbent comparison crosses the minimum with P > 0.5.
    s.judge(5000, 'p5', c1, inc, 'a');
    expect(s.raceOf(c1).rivalGateOpen).toBe(true);
    // Rival pairs now compete on value like any other pair — and being
    // unmeasured, the rival pair is the most informative card for a
    // fresh judge.
    const feed = s.feed('p2', 6, 6000);
    expect(feed.some((c) => c.subtype === 'rival')).toBe(true);
  });

  it('renders the conditional framing: rival cards never offer "keep the current text"', async () => {
    const s = openGated();
    const { c1, c2, inc } = twoRivals(s);
    s.judge(3000, 'p4', c1, inc, 'b');
    s.judge(4000, 'p4', c2, inc, 'b');
    const { ParticipantApi } = await import('../src/participant-api.js');
    const api = new ParticipantApi(s, 'p4');
    const cards = api.nextCards(6, 5000);
    const rival = cards.find((c) => c.subtype === 'rival');
    expect(rival).toBeDefined();
    expect(rival!.prompt).toBe('If this text changes, which change is better?');
    // Neither option is the status quo.
    for (const option of [rival!.a, rival!.b]) {
      expect(option.changes.every((ch) => ch.before !== ch.after)).toBe(true);
    }
    // Incumbent-involving cards still ask the adoption question outright.
    const incumbent = api.nextCards(6, 5000).find((c) => c.subtype === 'incumbent');
    if (incumbent) {
      expect(incumbent.prompt).toBe('Which should the group adopt?');
    }
    // And the API's own-judgment view supports revision from the client
    // side: p4 sees both judgments, neither locked while the ground stands.
    const mine = api.myJudgments();
    expect(mine).toHaveLength(2);
    expect(mine.every((j) => !j.locked && !j.superseded)).toBe(true);
  });
});
