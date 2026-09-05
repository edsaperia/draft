import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import { ParticipantApi, authorVisible } from '../src/participant-api.js';
import type { Event } from '../src/types.js';
import { roster } from './helpers.js';

const HOUR = 3600_000;

const DOC = [
  '# Charter',
  'Membership is open to anyone.',
  'Decisions are made by consensus.',
  'Meetings happen when someone calls one.',
].join('\n');

function openSession(overrides: Record<string, unknown> = {}, size = 5): Session {
  const constitution = makeConstitution({
    windowStartMs: 0,
    windowEndMs: 10 * HOUR,
    rngSeed: 'test-seed',
    // Real-minutes drip (Q353, 367b): hourly, matching this file's HOUR-based
    // expectations from the per-tenth era.
    tokenDripMinutes: 60,
    cooldownMs: 0,
    ...overrides,
  });
  return Session.open({ text: DOC, roster: roster(size), constitution }, 0);
}

/**
 * A roster of twelve, so F = 4 rather than 2. For tests that need a race to
 * survive a judgment or two before adopting: at five, the floor is met by the
 * author's own derived preference (§3.3, §8.2) plus one other person, so
 * almost anything adopts on first contact.
 */
function openWide(): Session {
  return openSession({}, 12);
}

/**
 * A session whose bar is out of reach, for tests whose subject is not
 * adoption. Since SPEC v0.16 a submission carries its author's own recorded
 * preference (§3.3) and the author counts toward the floor (§8.2), so a small
 * race left to itself now reaches both and resolves out from under whatever
 * the test was actually exercising. Holding the bar at 0.999 says "not about
 * adoption" in one place instead of scattering timestamps.
 */
function openHeld(): Session {
  return openSession({ adoptionThresholdStart: 0.999, adoptionThresholdEnd: 0.999 });
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

    // Winner refunded above its stake, capped at 1.5× (SPEC §7). A property
    // rather than a number since v0.16: the author's own vote is a mover, so
    // this race reaches its floor and adopts a judge earlier than it used to,
    // on thinner outside evidence — and the refund pays on how the *room*
    // received it, so it lands near 1.25 where it used to hit the cap. Both
    // movements are the mechanism working.
    const won = s.getCandidate(c1).exit!.refund;
    expect(won).toBeGreaterThan(1);
    expect(won).toBeLessThanOrEqual(1.5);

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

  it('enforces the moves: no self-pairs, revision supersedes, the composer costs nothing', () => {
    // Late in the window, so the ≈0.95 bar keeps the race open while the
    // moves are exercised: since SPEC v0.16 each submission carries its
    // author's own recorded preference, so an early-window race of this
    // size would adopt out from under the test.
    const t0 = 10 * HOUR;
    const s = openSession();
    const { id: c1 } = s.submitCandidate(t0 + 1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    const { id: c2 } = s.submitCandidate(t0 + 2000, {
      author: 'p2',
      patch: rewrite(0, 1, 'B.'),
      rationale: 'r',
    });
    expect(() => s.judge(t0 + 3000, 'p3', c1, c1, 'a')).toThrow(/itself/);
    s.judge(t0 + 4000, 'p3', c1, c2, 'tie');
    // Re-judging the same pair on the same ground is a revision (SPEC
    // §4.4, Q50): superseded in the ranking, both kept in the log.
    s.judge(t0 + 5000, 'p3', c2, c1, 'a');
    const mine = s.judgments().filter((j) => j.participantId === 'p3');
    expect(mine).toHaveLength(2);
    expect(mine[0]!.superseded).toBe(true);
    expect(mine[1]!.superseded).toBe(false);
    // Opening the composer no longer forfeits anything (SPEC v0.16 §3.3):
    // the briefing is withheld from a race still being judged (§3.5), so
    // there is no peek to price and the drafter still judges the pair.
    s.openComposer(t0 + 6000, 'p4');
    expect(s.judge(t0 + 7000, 'p4', c1, c2, 'a')).toBeDefined();
    expect(s.judge(t0 + 8000, 'p5', c1, c2, 'b')).toBeDefined();
  });

  it('gates adoption on the floor of distinct movers, the author among them', () => {
    // E = 5 → F = ceil(5/3) = 2. Since SPEC v0.16 the author is one of the
    // movers (§8.2, "you are a voice" — Ed), so submitting is itself the first
    // mover and one other person meets the floor. Written out plainly because
    // it is a real loosening at this size: author + 1 adopts.
    const s = openSession();
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    expect(s.adoptionFloor()).toBe(2);
    expect(s.raceOf(c1).distinctMovers).toBe(1); // the author, alone, is short
    const inc = s.raceOf(c1).incumbentId;
    const events = s.judge(2000, 'p2', c1, inc, 'a');
    expect(events.some((e) => e.type === 'adopted')).toBe(true);
    expect(s.getCandidate(c1).state).toBe('adopted');
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

  it('adopts every cleared race in one batch at the tick (Ed, 2026-08-19)', () => {
    // The cooldown paces how often the document changes, never how many
    // decisions land: once it elapses, everything outstanding adopts at
    // once — released here by the host's tick, with no judgment as timer.
    const s = openSession({ cooldownMs: 5 * 60_000 });
    const submit = (author: string, line: number, text: string) =>
      s.submitCandidate(1000, { author, patch: rewrite(0, line, text), rationale: 'r' });
    const { id: c0 } = submit('p1', 1, 'A.');
    const { id: c1 } = submit('p2', 2, 'B.');
    const { id: c2 } = submit('p3', 3, 'C.');
    // c0 adopts and starts the cooldown.
    let t = 10_000;
    let adoptedAt = 0;
    for (const judge of ['p2', 'p3', 'p4', 'p5']) {
      const events = s.judge((t += 1000), judge, c0, s.raceOf(c0).incumbentId, 'a');
      if (events.some((e) => e.type === 'adopted')) {
        adoptedAt = t;
        break;
      }
    }
    expect(adoptedAt).toBeGreaterThan(0);
    // c1 and c2 both gather clearing support inside the cooldown: blocked.
    for (const [cand, judges] of [
      [c1, ['p1', 'p3', 'p4', 'p5']],
      [c2, ['p1', 'p2', 'p4', 'p5']],
    ] as const) {
      const inc = s.raceOf(cand).incumbentId;
      for (const judge of judges) {
        const events = s.judge((t += 1000), judge, cand, inc, 'a');
        expect(events.some((e) => e.type === 'adopted')).toBe(false);
      }
    }
    // The tick releases both in one batch, oldest race first.
    const batch = s.tick(adoptedAt + 5 * 60_000 + 1);
    const adopted = batch.filter((e) => e.type === 'adopted');
    expect(adopted.map((e) => e.type === 'adopted' && e.candidateId)).toEqual([c1, c2]);
    expect(s.getCandidate(c1).state).toBe('adopted');
    expect(s.getCandidate(c2).state).toBe('adopted');
    // A batch replays bit-identically like anything else.
    const replayed = Session.replay(s.log);
    expect(replayed.document()).toBe(s.document());
    expect(replayed.rollingHash()).toBe(s.rollingHash());
  });

  it('lands one decision per race per batch: the runner-up never rides along', () => {
    // A race's losers stay live after its winner adopts, and their evidence
    // was gathered against the old text — the ready set is snapshotted
    // before anything lands, so a race contributes one adoption per tick.
    const s = openSession({ cooldownMs: 5 * 60_000 });
    const submit = (author: string, line: number, text: string) =>
      s.submitCandidate(1000, { author, patch: rewrite(0, line, text), rationale: 'r' });
    const { id: c0 } = submit('p1', 3, 'A.');
    const { id: c1 } = submit('p2', 1, 'B.');
    const { id: c2 } = submit('p3', 1, 'C.'); // rival: same line as c1
    let t = 10_000;
    let adoptedAt = 0;
    for (const judge of ['p2', 'p3', 'p4', 'p5']) {
      const events = s.judge((t += 1000), judge, c0, s.raceOf(c0).incumbentId, 'a');
      if (events.some((e) => e.type === 'adopted')) {
        adoptedAt = t;
        break;
      }
    }
    expect(adoptedAt).toBeGreaterThan(0);
    // Both rivals beat the incumbent; c1 leads the pair.
    const inc = s.raceOf(c1).incumbentId;
    for (const judge of ['p1', 'p4', 'p5']) {
      s.judge((t += 1000), judge, c1, inc, 'a');
      s.judge((t += 1000), judge, c2, inc, 'a');
      s.judge((t += 1000), judge, c1, c2, 'a');
    }
    const batch = s.tick(adoptedAt + 5 * 60_000 + 1);
    const adopted = batch.filter((e) => e.type === 'adopted');
    expect(adopted.map((e) => e.type === 'adopted' && e.candidateId)).toEqual([c1]);
    expect(s.getCandidate(c2).state).not.toBe('adopted');
  });

  it('raises the bar over the window: identical evidence adopts early, not late', () => {
    const judgeTwice = (s: Session, c: string, t0: number): boolean => {
      const inc = s.raceOf(c).incumbentId;
      // Stops at the first adoption: the author is already a mover, so an
      // early race can meet floor and bar on the first judgment, and a second
      // would be cast into a race that has closed.
      for (const [i, judge] of ['p2', 'p3'].entries()) {
        const events = s.judge(t0 + i * 1000, judge, c, inc, 'a');
        if (events.some((e) => e.type === 'adopted')) return true;
      }
      return false;
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
    // After one drip interval lands a token, one more stake fits.
    expect(
      s.submitCandidate(HOUR + 1, { author: 'p1', patch: rewrite(0, 1, 'Z.'), rationale: 'r' })
        .id,
    ).toBeTruthy();
  });

  it('an author cannot open their own performance account (SPEC §3.3, §7)', () => {
    // The refund is stake × min(w/0.5, 1.5), and one favourable comparison is
    // already enough to reach the cap — so if an author's own recorded
    // preference counted as performance, submit-then-retire would pay 1.5× the
    // stake with nobody else involved. Somebody else has to open the account.
    const s = openSession();
    const { id } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    const before = s.balance('p1', 1000);
    s.retire(2000, id);
    expect(s.getCandidate(id).exit!.refund).toBe(0);
    expect(s.balance('p1', 2000)).toBe(before); // strictly no better off
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
    // c2 loses to the incumbent, then retires: refund < stake. Three losses
    // rather than two since v0.16 — the author's own preference is in the
    // ranking and offsets the first of them.
    const inc = s.raceOf(c2).incumbentId;
    s.judge(3000, 'p2', c2, inc, 'b');
    s.judge(4000, 'p3', c2, inc, 'b');
    s.judge(4500, 'p4', c2, inc, 'b');
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

  /**
   * **The unheard slot** (SPEC §8.2 made structural; Q1178, 2026-09-05): a
   * race this participant hasn't judged, still short of the adoption floor,
   * takes the hand's first card — least-measured first. Without it a fresh
   * proposal in a document whose hot set is already full of evidenced races
   * reached nobody: the hot set is the top-`hotSetSize` *valued* races, and
   * a race with no evidence values below every race with some, so the new
   * card arrived only after a member cleared their whole hand (found by
   * `scripts/room-walk.mjs` playing a real room over HTTP). Exploration is
   * switched off here so the slot is proven structural, not a lucky roll;
   * the hot set is narrowed to 2 so the evidenced races genuinely crowd
   * the fresh one out.
   */
  it('reserves the first slot for an unheard race a full hot set would starve', () => {
    const s = openSession({
      // bar out of reach, so the evidenced races stay live and hot
      adoptionThresholdStart: 0.999, adoptionThresholdEnd: 0.999,
      hotSetSize: 2, explorationEvery: 1_000_000,
    }, 12); // floor 4
    const { id: cA } = s.submitCandidate(1000, {
      author: 'p1', patch: rewrite(0, 1, 'A.'), rationale: 'r' });
    const { id: cB } = s.submitCandidate(2000, {
      author: 'p2', patch: rewrite(0, 2, 'B.'), rationale: 'r' });
    // four judges each: both races meet the floor and carry real evidence
    for (const [i, p] of ['p3', 'p4', 'p5', 'p6'].entries()) {
      s.judge(3000 + 2 * i, p, cA, s.raceOf(cA).incumbentId, 'a');
      s.judge(3001 + 2 * i, p, cB, s.raceOf(cB).incumbentId, 'a');
    }
    // the fresh proposal: no measured comparisons, floor unmet
    const { id: cC } = s.submitCandidate(5000, {
      author: 'p7', patch: rewrite(0, 3, 'C.'), rationale: 'r' });
    const raceC = s.raceOf(cC).id;
    // p8 has judged nothing: their very next hand leads with the unheard race
    const hand = s.feed('p8', 4, 6000);
    expect(hand.length).toBeGreaterThan(0);
    expect(hand[0]!.raceId).toBe(raceC);
    expect([hand[0]!.aId, hand[0]!.bId]).toContain(cC);
    // and the slot is per-participant: once p8 has judged it, their next
    // hand's first card is one of the evidenced races again
    s.judge(7000, 'p8', cC, s.raceOf(cC).incumbentId, 'a');
    const next = s.feed('p8', 4, 8000);
    expect(next.length).toBeGreaterThan(0);
    expect(next[0]!.raceId).not.toBe(raceC);
  });

  /**
   * **An author is never served their own text against the incumbent** (Ed,
   * 2026-08-29, backlog 253; SPEC §3.3, R-062): the preference is derived
   * and already held, so the card asks a question the engine answered
   * itself. Both doors are walked — the edge scan and exploration, which
   * also serves against the incumbent — over several `t`, because the
   * exploration roll is per slot.
   *
   * The other half is the rule's limit: **a rival pair is still asked**. By
   * proposing you say only that your text beats the status quo, so which of
   * two challengers wins is a real question and stays one.
   */
  it('never serves an author their own text against the incumbent, and still serves their rivals', () => {
    const s = openWide(); // twelve, so the floor is 4 and nothing adopts here
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1', patch: rewrite(0, 1, 'A.'), rationale: 'r',
    });
    const { id: c2 } = s.submitCandidate(2000, {
      author: 'p2', patch: rewrite(0, 1, 'B.'), rationale: 'r',
    });
    s.submitCandidate(3000, { author: 'p3', patch: rewrite(0, 3, 'C.'), rationale: 'r' });
    const incumbents = new Set(s.races().map((r) => r.incumbentId));
    const ownIncumbentPair = (card: { aId: string; bId: string }) =>
      (card.aId === c1 && incumbents.has(card.bId)) ||
      (card.bId === c1 && incumbents.has(card.aId));

    for (const t of [3000, 4000, 5000, 6000]) {
      for (const card of s.feed('p1', 8, t)) {
        expect(ownIncumbentPair(card), `${card.kind} ${card.aId} vs ${card.bId}`).toBe(false);
      }
      // p2's own text against the incumbent is a question p1 can answer, and
      // the same pair is the one p2 is never served
      for (const card of s.feed('p2', 8, t)) {
        expect(
          (card.aId === c2 && incumbents.has(card.bId)) ||
            (card.bId === c2 && incumbents.has(card.aId)),
          `${card.kind} ${card.aId} vs ${card.bId}`,
        ).toBe(false);
      }
    }

    // the incumbent pairs p1 *is* served are other people's; once that one is
    // spent, their own race's rival pair arrives — a real question, still asked
    const inc = s.raceOf(c1).incumbentId;
    expect(s.feed('p1', 8, 3000).some((c) =>
      (c.aId === c2 && c.bId === inc) || (c.bId === c2 && c.aId === inc))).toBe(true);
    s.judge(3500, 'p1', c2, inc, 'b');
    expect(s.feed('p1', 8, 4000).some((c) =>
      (c.aId === c1 && c.bId === c2) || (c.bId === c1 && c.aId === c2))).toBe(true);
  });

  it('closes: no moves after, final render applies theta-clearing leaders', () => {
    const s = openHeld();
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 3, 'Meetings happen fortnightly.'),
      rationale: 'r',
    });
    const inc = s.raceOf(c1).incumbentId;
    // Two movers — the author and p2 — both preferring c1, and short of the
    // bar, which is what leaves a near-miss to ship as backlog.
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
    const s = openHeld();
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    const inc = s.raceOf(c1).incumbentId;
    // p3 backs the incumbent, then changes their mind. Asserted as movement
    // rather than against 0.5 since v0.16: the author's own vote is in the
    // ranking, so p3's dissent lands at parity rather than below it.
    s.judge(2000, 'p3', c1, inc, 'b');
    const pBefore = s.raceOf(c1).leaderP!;
    s.judge(3000, 'p3', c1, inc, 'a');
    const pAfter = s.raceOf(c1).leaderP!;
    expect(pAfter).toBeGreaterThan(pBefore);
    // The revision replaces, never double-counts: p3's three judgments leave
    // one usable comparison and one mover however often they revise. Two of
    // each in total, the other being the author's own (§3.3).
    s.judge(4000, 'p3', c1, inc, 'tie');
    const race = s.raceOf(c1);
    expect(race.comparisons).toBe(1);   // p3's latest; the author's is a voice, not a measurement
    expect(race.distinctMovers).toBe(2);
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
    // Cast *against* c2 so race 2 stays open: its author is already a mover,
    // so a favourable judgment here would meet the floor and adopt it.
    s.judge(3000, 'p3', c2, incC2, 'b');
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
    expect(race2.comparisons).toBe(1); // p3's; the authors' own are derived, not measured
  });
});

describe('ground shifts lock judgments and re-serve pairs (SPEC §4.4, Q50)', () => {
  it('an adoption within the race locks ALL its judgments, rival-vs-rival included', () => {
    const s = openWide();
    // A chain race: w (lines 2-3) — cA (lines 1-2) — cB (line 1) — cC (line 1).
    // cB and cC survive w's adoption by clean rebase; cA conflicts.
    //
    // All four are p1's, which is not incidental. Since SPEC v0.16 a
    // submission carries its author's own preference and its author counts
    // toward the floor (§3.3, §8.2), so four candidates by four authors would
    // meet a floor of two *before anybody read anything* — and the first
    // judgment of any kind would then adopt somebody, out from under the
    // ground shift this test is about. One author keeps the floor at one until
    // an outsider speaks, which is also the arrangement that makes the point
    // sharply: a quorum can now be made entirely of people who wrote the
    // things being judged.
    const { id: w } = s.submitCandidate(1000, {
      author: 'p1',
      patch: {
        baseVersion: 0,
        hunks: [{ start: 2, end: 4, lines: ['Decisions by vote.', 'Meetings fortnightly.'] }],
      },
      rationale: 'r',
    });
    const { id: cA } = s.submitCandidate(2000, {
      author: 'p1',
      patch: {
        baseVersion: 0,
        hunks: [{ start: 1, end: 3, lines: ['Members decide together.'] }],
      },
      rationale: 'r',
    });
    const { id: cB } = s.submitCandidate(3000, {
      author: 'p1',
      patch: rewrite(0, 1, 'Membership by vouching.'),
      rationale: 'r',
    });
    const { id: cC } = s.submitCandidate(4000, {
      author: 'p1',
      patch: rewrite(0, 1, 'Membership by vote.'),
      rationale: 'r',
    });
    // One connected component.
    expect(s.races()).toHaveLength(1);
    const oldInc = s.races()[0]!.incumbentId;

    // A rival-vs-rival judgment on the old ground, cast by the author — who
    // is already the race's only mover, so the floor stays unmet and nothing
    // adopts yet.
    s.judge(5000, 'p1', cB, cC, 'tie');

    // Drive w to adoption: the first outsider meets the floor.
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
    expect(race.comparisons).toBe(0); // measured evidence restarts from nothing
    // One mover, not none: the author's preference for their own live
    // candidates is derived against the *current* incumbent (§3.3, Q245b), so
    // unlike a judgment it does not lock on a ground shift — surviving it is
    // the whole reason it is derived rather than recorded. What restarts is
    // the room's evidence, and that is what `comparisons` counts.
    expect(race.distinctMovers).toBe(1);
    expect(race.leaderP).toBeGreaterThan(0.5); // both challengers carry their author
    const rival = s
      .judgments()
      .find((j) => j.participantId === 'p1' && j.kind === 'edge' && j.locked);
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
    const s = openWide();
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
    // Evidence in the meetings race, arranged so it cannot adopt early: the
    // incumbent takes a pair off *each* challenger and p4 casts the rival pair
    // too, so the race has three comparisons but only one outside mover — with
    // the two authors' derived preferences that is three, short of F = 4.
    // Cancelling the authors'
    // derived preferences (§3.3), which would otherwise leave both ahead and
    // one of them over the bar before this test got to its subject.
    s.judge(4000, 'p4', c2, incMeetings, 'b');
    s.judge(4500, 'p4', c3, incMeetings, 'b');
    s.judge(5000, 'p4', c2, c3, 'a');
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
    expect(race.comparisons).toBe(3); // two incumbent pairs and the rival pair
    // Scoped to this race: p4 also judged w's race, and that judgment locks
    // correctly when w adopts.
    for (const j of s.judgments().filter((x) => [x.aId, x.bId].some((id) => id === c2 || id === c3))) {
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

describe('quorum in the adoption floor (SPEC §4.2, 367b)', () => {
  it('a count quorum raises the floor above the statistical minimum', () => {
    const s = openSession({ quorum: { form: 'count', n: 4 } });
    // ceil(5/3) = 2; the room asked for 4 — the room's number governs.
    expect(s.adoptionFloor()).toBe(4);
  });

  it('a share quorum tracks E as the roster changes', () => {
    const s = openSession({ quorum: { form: 'share', n: 60 } });
    expect(s.adoptionFloor()).toBe(3); // ceil(0.6 × 5)
    s.addParticipant(1, { id: 'p6', handle: 'F' });
    expect(s.adoptionFloor()).toBe(4); // ceil(0.6 × 6)
  });

  it('a quorum below the statistical minimum never lowers the floor', () => {
    const s = openSession({ quorum: { form: 'count', n: 1 } });
    expect(s.adoptionFloor()).toBe(2); // min(ceil(5/3), F_max) still governs
  });
});

describe('suspension — lapse engine-side (SPEC §9.5a, §8.2, 367b)', () => {
  it('a suspended participant leaves E, cannot act, and their cast judgments stand', () => {
    const s = openSession({ quorum: { form: 'share', n: 60 } });
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    const inc = s.raceOf(c1).incumbentId;
    s.judge(2000, 'p2', c1, inc, 'a');
    expect(s.adoptionFloor()).toBe(3); // ceil(0.6 × 5)
    s.suspendParticipant(3000, 'p2');
    s.suspendParticipant(3000, 'p3');
    expect(s.adoptionFloor()).toBe(2); // E = 3: max(ceil(1.8), ceil(3/3))
    // The judgment already cast keeps counting (§9.5a).
    expect(s.raceOf(c1).distinctMovers).toBe(2);
    // But a suspended member cannot act until they return.
    expect(() => s.judge(4000, 'p2', c1, inc, 'a')).toThrow(/suspended/);
    s.resumeParticipant(5000, 'p2');
    expect(s.judge(6000, 'p2', c1, inc, 'b')).toBeDefined();
    expect(s.adoptionFloor()).toBe(3); // E = 4 → max(ceil(2.4), 2)
  });

  it("a suspended author's derived preference is not a mover (§9.7.3 X11, Q583)", () => {
    const s = openHeld();
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    const inc = s.raceOf(c1).incumbentId;
    s.judge(2000, 'p2', c1, inc, 'a');
    expect(s.raceOf(c1).distinctMovers).toBe(2); // p2, plus p1's own derived preference
    // An applicant under *apply* authors their own admit race and is suspended
    // in the same breath (engine-bridge); out of E, their standing preference
    // stops being a voice toward the floor — p2's cast judgment still counts.
    s.suspendParticipant(3000, 'p1');
    expect(s.raceOf(c1).distinctMovers).toBe(1);
    s.resumeParticipant(4000, 'p1');
    expect(s.raceOf(c1).distinctMovers).toBe(2);
  });

  it('a suspended participant can still be removed, and replay agrees', () => {
    const s = openSession();
    s.suspendParticipant(1000, 'p4');
    s.removeParticipant(2000, 'p4');
    const r = Session.replay(s.log.slice());
    expect(r.adoptionFloor()).toBe(s.adoptionFloor());
    expect(r.rollingHash()).toBe(s.rollingHash());
  });
});

describe('ParticipantApi.outcomes (stage 8): resolutions are public, nothing else is', () => {
  it('lists adoptions with their p and threshold, and retirements, oldest first', async () => {
    const s = openSession();
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1', patch: rewrite(0, 1, 'Membership needs a sponsor.'), rationale: 'a',
    });
    const { id: c3 } = s.submitCandidate(1500, {
      author: 'p3', patch: rewrite(0, 3, 'Meetings happen fortnightly.'), rationale: 'c',
    });
    s.retire(2000, c3);
    const inc = s.raceOf(c1).incumbentId;
    let t = 10_000;
    for (const judge of ['p2', 'p3', 'p4', 'p5']) {
      if (s.getCandidate(c1).state === 'adopted') break;
      s.judge((t += 1000), judge, c1, inc, 'a');
    }
    expect(s.getCandidate(c1).state).toBe('adopted');
    const { ParticipantApi } = await import('../src/participant-api.js');
    const out = new ParticipantApi(s, 'p5').outcomes();
    expect(out.map((o) => [o.candidateId, o.outcome])).toEqual([[c3, 'retired'], [c1, 'adopted']]);
    expect(out[1]!.p).toBeGreaterThan(0.5);
    expect(out[1]!.threshold).toBeGreaterThan(0);
    expect(JSON.stringify(out)).not.toContain('refund');
  });
});

describe('stage 8 follow-up: closeness, urgency, the record and the wallet clock', () => {
  it('closeness is a magnitude: mirror races read identically whichever side leads', () => {
    const mk = (dir: 'a' | 'b') => {
      const s = openHeld();
      const { id } = s.submitCandidate(1000, {
        author: 'p1', patch: rewrite(0, 1, 'Membership needs a sponsor.'), rationale: 'r',
      });
      const inc = s.raceOf(id).incumbentId;
      // the author's derived preference (§3.3) is one voice for the proposal
      // in both, so the mirror is 3:1 one way against 1:3 the other
      const votes: Array<'a' | 'b'> = dir === 'a' ? ['a', 'a', 'b'] : ['b', 'b', 'b'];
      let t = 2000;
      votes.forEach((v, i) => s.judge((t += 1000), ['p2', 'p3', 'p4'][i]!, id, inc, v));
      return s.raceOf(id);
    };
    const toward = mk('a');
    const against = mk('b');
    expect(toward.closeness).toBeGreaterThan(0);
    expect(toward.closeness).toBeLessThanOrEqual(1);
    expect(toward.closeness).toBeCloseTo(against.closeness, 10);
    // a fresh race sits at the bottom of the scale
    const s = openHeld();
    const { id } = s.submitCandidate(1000, {
      author: 'p1', patch: rewrite(0, 2, 'Decisions are made by vote.'), rationale: 'r',
    });
    expect(s.raceOf(id).closeness).toBeLessThan(toward.closeness);
  });

  it('cards carry their race and a relative urgency, the most pivotal at 1.0', async () => {
    const s = openHeld();
    s.submitCandidate(1000, { author: 'p1', patch: rewrite(0, 1, 'A.'), rationale: 'a' });
    s.submitCandidate(1100, { author: 'p2', patch: rewrite(0, 3, 'B.'), rationale: 'b' });
    const { ParticipantApi } = await import('../src/participant-api.js');
    const cards = new ParticipantApi(s, 'p4').nextCards(5, 2000);
    expect(cards.length).toBeGreaterThan(0);
    expect(Math.max(...cards.map((c) => c.urgency))).toBe(1);
    for (const c of cards) {
      expect(c.urgency).toBeGreaterThanOrEqual(0);
      expect(c.urgency).toBeLessThanOrEqual(1);
      expect(c.raceId).toMatch(/^r:/);
    }
    expect(JSON.stringify(cards)).not.toMatch(/value|leaderP|author/);
  });

  it('outcomes name their race and the version they resolved against', async () => {
    const s = openSession();
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1', patch: rewrite(0, 1, 'Membership needs a sponsor.'), rationale: 'a',
    });
    const { id: c2 } = s.submitCandidate(1200, {
      author: 'p2', patch: rewrite(0, 1, 'Membership needs two sponsors.'), rationale: 'b',
    });
    const raceId = s.raceOf(c1).id;
    expect(s.raceOf(c2).id).toBe(raceId);
    const inc = s.raceOf(c1).incumbentId;
    let t = 10_000;
    for (const judge of ['p3', 'p4', 'p5']) {
      if (s.getCandidate(c1).state === 'adopted') break;
      s.judge((t += 1000), judge, c1, inc, 'a');
    }
    expect(s.getCandidate(c1).state).toBe('adopted');
    const { ParticipantApi } = await import('../src/participant-api.js');
    const out = new ParticipantApi(s, 'p5').outcomes();
    const adopted = out.find((o) => o.candidateId === c1)!;
    expect(adopted.raceId).toBe(raceId);
    expect(adopted.version).toBe(0);
    expect(s.documentAt(adopted.version).split('\n')[1]).toBe('Membership is open to anyone.');
    // replay carries the race id through the log
    const again = Session.replay(s.log);
    expect(new ParticipantApi(again, 'p5').outcomes().find((o) => o.candidateId === c1)!.raceId)
      .toBe(raceId);
  });

  it('the wallet says when the next drip lands, and nothing when it never does', async () => {
    const { ParticipantApi } = await import('../src/participant-api.js');
    const s = openSession();
    const w = new ParticipantApi(s, 'p1').wallet(30 * 60_000);
    expect(w.dripIntervalMs).toBe(HOUR);
    expect(w.nextDripInMs).toBe(30 * 60_000);
    expect(w.cap).toBe(s.constitution.tokenCap);
    const still = openSession({ tokenDripMinutes: 0 });
    const w2 = new ParticipantApi(still, 'p1').wallet(1000);
    expect(w2.nextDripInMs).toBe(Infinity);
  });
});

describe('the close (SPEC §4.6)', () => {
  it('the clock closes the document at the window end, running one last batch', () => {
    // The ramp is high early and low at the end: two clean wins clear the
    // bar only once the window has run, so the candidate is still live when
    // the clock reaches the close — which is where the final batch adopts it.
    const s = openSession({ adoptionThresholdStart: 0.999, adoptionThresholdEnd: 0.55 });
    const { id } = s.submitCandidate(1000, { author: 'p1', patch: rewrite(0, 0, 'Open.'),
      rationale: 'r' });
    const inc = s.raceOf(id).incumbentId;
    s.judge(2000, 'p2', id, inc, 'a');
    s.judge(3000, 'p3', id, inc, 'a');
    expect(s.getCandidate(id).state).toBe('live'); // the early bar held it back
    expect(s.dueToClose(10 * 3600_000)).toBe(true);
    s.tick(10 * 3600_000); // the clock reaches the end
    expect(s.closed).toBe(true);
    expect(s.closedAt).toBe(10 * 3600_000);
    expect(s.getCandidate(id).state).toBe('adopted');
    expect(s.document()).toContain('Open.');
    // and a second tick past the end does nothing new
    expect(s.tick(11 * 3600_000)).toEqual([]);
  });

  it('records the undecided third outcome, and refuses moves afterwards', async () => {
    const s = openHeld(); // bar ≈ 0.999, nothing clears
    const { id } = s.submitCandidate(1000, { author: 'p1', patch: rewrite(0, 0, 'X.'),
      rationale: 'r' });
    const inc = s.raceOf(id).incumbentId;
    s.judge(2000, 'p2', id, inc, 'a');
    s.close(5000);
    expect(s.closed).toBe(true);
    const { ParticipantApi } = await import('../src/participant-api.js');
    const undecided = new ParticipantApi(s, 'p2').outcomes().filter((o) => o.outcome === 'undecided');
    expect(undecided.map((o) => o.candidateId)).toContain(id);
    // it is the backlog, ranked, after the close
    expect(s.backlog().some((b) => b.candidateId === id)).toBe(true);
    // and the incumbent stood
    expect(s.finalRender().applied).toEqual([]);
    expect(() => s.judge(6000, 'p3', id, inc, 'a')).toThrow(/closed/);
    expect(() => s.submitCandidate(6000, { author: 'p4', patch: rewrite(0, 0, 'Y.'),
      rationale: 'r' })).toThrow(/closed/);
  });

  it('replays bit-identically across the close', () => {
    const s = openSession({ adoptionThresholdStart: 0.55, adoptionThresholdEnd: 0.55 });
    const { id } = s.submitCandidate(1000, { author: 'p1', patch: rewrite(0, 0, 'Z.'),
      rationale: 'r' });
    const inc = s.raceOf(id).incumbentId;
    s.judge(2000, 'p2', id, inc, 'a');
    s.close(10 * 3600_000);
    const replayed = Session.replay(s.log);
    expect(replayed.rollingHash()).toBe(s.rollingHash());
    expect(replayed.document()).toBe(s.document());
    expect(replayed.closedAt).toBe(s.closedAt);
  });
});

describe('a refused event never reaches the log (Q679)', () => {
  /**
   * The room may move its close, and the bridge relays that to the engine
   * as an `amend` — so a close moved to a time already past leaves
   * `runClose(windowEndMs)` emitting behind the log's own last event. The
   * refusal is right; where it happened was not. `emit` pushed the entry
   * and `apply` threw after, leaving a validly hashed entry in the chain
   * that `verifyChain` still accepted and the host's next persist wrote
   * out — after which `replay` threw on it for ever and the engine was
   * quarantined at every boot. The twin of the same fix in
   * `@draft/constitution`'s own `emit`.
   */
  it('a close amended into the past throws, and leaves the chain replayable', () => {
    const s = openSession();
    s.amend(5 * HOUR, { windowEndMs: 1 * HOUR }); // the close, moved behind us
    const before = s.log.length;

    expect(() => s.tick(6 * HOUR)).toThrow(/non-decreasing/);

    expect(s.log).toHaveLength(before);
    expect(s.verifyChain()).toBe(true);
    expect(s.closed).toBe(false);
    const again = Session.replay([...s.log]);
    expect(again.rollingHash()).toBe(s.rollingHash());
    expect(again.closed).toBe(false);
  });
});

/**
 * A document of one (Q837, backlog 60; **overturned in part 2026-08-29,
 * backlog 253**). Ed: *"If I'm the only member in a document and the quorum
 * is 1 and the threshold is 50%, it did not pass."*
 *
 * The engine was never the reason: at E=1, Q=1, θ=½ the floor is 1 and the
 * author's derived preference meets it. What was missing was the **card** —
 * and the answer of 2026-08-25 was to serve the sole member their own text
 * against the incumbent so their explicit judgment could clear the room
 * gate. Ed overturned that: *an author is never asked about their own text
 * against the incumbent*, because the engine already holds the answer. So
 * at E = 1 the derived preference is both the floor and the room, and the
 * proposal adopts on submission — which is what this block now pins, in
 * both directions: the adoption, and the card that is never served.
 *
 * The two Q836 meter cases below are about the **bar**, not the room, and
 * take a second member so the race they measure still exists to be read.
 */
describe('a document of one (Q837, backlog 253)', () => {
  const atBar = (bar: number, size: number) =>
    openSession(
      {
        adoptionThresholdStart: bar,
        adoptionThresholdEnd: bar,
        quorum: { form: 'count', n: 1 },
      },
      size,
    );
  const solo = () => atBar(0.5, 1);
  const propose = (s: Session) =>
    s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'Membership requires two existing members to vouch.'),
      rationale: 'Vouching keeps the roster accountable.',
    });

  it('the sole member’s proposal adopts on submission, and no card is ever served for it', () => {
    const s = solo();
    expect(s.adoptionFloor()).toBe(1);
    expect(s.adoptionThreshold(1000)).toBeCloseTo(0.5, 10);

    const before = s.log.length;
    const { id: c1 } = propose(s);
    // the submit sweeps: the derived preference is the floor *and* the room
    const kinds = s.log.slice(before).map((e) => e.event.type);
    expect(kinds).toContain('candidate-submitted');
    expect(kinds).toContain('adopted');
    expect(s.getCandidate(c1).state).toBe('adopted');
    expect(s.document()).toContain('two existing members to vouch');

    // and nobody was asked anything on the way: there is no question here
    expect(s.feed('p1', 3, 2000)).toHaveLength(0);
  });

  /**
   * The handle's own half of the same moment (review finding F17). The sweep
   * that adopts on submission dissolves the race the candidate was submitted
   * into, so a `raceId` returned regardless would name a race `raceOf` throws
   * on — a promise the return value cannot honour. Both directions are pinned
   * here because a test of the null branch alone is half a test: E is the only
   * thing that differs between the two, the bar being 0.5 in both.
   */
  it('the handle names no race where the sweep has just dissolved it', () => {
    const s = solo();
    const { id, raceId } = propose(s);
    expect(s.getCandidate(id).state).toBe('adopted');
    expect(s.races()).toHaveLength(0);
    // the race is gone, and the handle says so rather than naming it
    expect(raceId).toBeNull();
    // `raceOf` on the candidate throws, which is what the old handle invited a
    // caller to do; the id half is still good, and is what a caller reads
    expect(() => s.raceOf(id)).toThrow();
    expect(s.getCandidate(id).state).toBe('adopted');
  });

  it('and names the race where it survives — at E > 1, on the same bar', () => {
    // two voices, so the room gate (`comparisons > 0`) is not bypassed and the
    // sweep adopts nothing: the race the submission made is still standing
    const s = atBar(0.5, 2);
    const { id, raceId } = propose(s);
    expect(s.getCandidate(id).state).toBe('live');
    expect(raceId).toBe(s.raceOf(id).id);
  });

  it('above the ceiling it stays live, and the author is still never served it', () => {
    // a room of one tops out at 0.798 (Q840), so a bar of 0.9 is one the
    // sole member's own voice cannot carry — the candidate simply waits
    const s = atBar(0.9, 1);
    const { id } = propose(s);
    expect(s.getCandidate(id).state).toBe('live');
    const inc = s.raceOf(id).incumbentId;
    // no edge pair, no exploration card, nothing: the only pair in the
    // document is the author's own text against the incumbent
    for (const t of [2000, 3000, 4000]) expect(s.feed('p1', 3, t)).toHaveLength(0);
    // an explicit judgment is still legal and still counts (R-062) — it just
    // cannot clear a bar the room's own unanimous fit does not reach
    const judged = s.judge(HOUR, 'p1', id, inc, 'a').map((e) => e.type);
    expect(judged).toContain('comparison');
    expect(judged).not.toContain('adopted');
  });

  it('the meter reads a real fraction at a bar of exactly 50% (Q836)', () => {
    const s = atBar(0.5, 2);
    const { id } = propose(s);
    // before the floor was put on the span this was identically 0, whatever
    // the posterior — the whole document read as an empty bar for ever
    expect(s.raceOf(id).closeness).toBeGreaterThan(0);
    // and it reads as the lowest bar the surface can express above the coin
    // flip does, rather than as its own singular point
    const nudged = atBar(0.51, 2);
    propose(nudged);
    expect(s.raceOf(id).closeness).toBeCloseTo(nudged.races()[0]!.closeness, 10);
  });

  it('a bar above the coin flip is untouched by the floor', () => {
    // `max` picks the real span for every threshold the surface can set above
    // the minimum, so nothing else on the surface moves: at 0.9 the reading is
    // still |2p − 1| / (2θ − 1) exactly, unclamped
    const s = openSession({ adoptionThresholdStart: 0.9, adoptionThresholdEnd: 0.9 }, 5);
    const { id } = s.submitCandidate(1000, {
      author: 'p1', patch: rewrite(0, 1, 'Membership needs a sponsor.'), rationale: 'r',
    });
    const race = s.raceOf(id);
    const want = Math.abs(2 * (race.leaderP as number) - 1) / (2 * 0.9 - 1);
    expect(want).toBeLessThan(1);
    expect(race.closeness).toBeCloseTo(want, 10);
  });
});

describe('the sign control and honour (SPEC §3.5a, Q770 and entry 31)', () => {
  type Base = 'public' | 'sealed' | 'anonymous';
  const fold = (signed: boolean, base: Base) => {
    const s = openHeld();
    s.amend(500, { authorshipVisibility: base });
    const { id } = s.submitCandidate(1000, {
      author: 'p1', patch: rewrite(0, 1, 'Membership needs a sponsor.'), rationale: 'r', signed,
    });
    return { s, c: s.getCandidate(id) };
  };

  it('folds `signed` and the base the candidate was made under, and replays to the same hash', () => {
    const { s, c } = fold(true, 'sealed');
    expect(c.signed).toBe(true);
    expect(c.disclosure).toBe('sealed');
    const ev = s.log[s.log.length - 1]!.event;
    expect(ev).toMatchObject({ type: 'candidate-submitted', signed: true, disclosure: 'sealed' });
    // **The hash covers the new fields.** A log from before this landed
    // replays unchanged, because its events carry neither field; a candidate
    // submitted since hashes *with* them — "hashes as before" is false for
    // any new candidate, and deliberately so: the stamp is part of the
    // record, not a note beside it. The lock is that replay agrees.
    const replayed = Session.replay(s.log);
    expect(replayed.rollingHash()).toBe(s.rollingHash());
    expect(replayed.getCandidate(c.id)).toMatchObject({ signed: true, disclosure: 'sealed' });
  });

  it('an unsigned candidate carries no `signed` at all, as `machineAuthored` does', () => {
    const { s, c } = fold(false, 'anonymous');
    expect(c).not.toHaveProperty('signed');
    expect(c.disclosure).toBe('anonymous');
    expect(s.log[s.log.length - 1]!.event).not.toHaveProperty('signed');
  });

  it('a setting candidate takes the same stamp (Q390) — one shape, and nothing reads it there', () => {
    const s = Session.open({ text: DOC, roster: roster(5), constitution: makeConstitution({
      windowStartMs: 0, windowEndMs: 10 * HOUR, rngSeed: 'stamp', cooldownMs: 0 }),
      settings: { ending: 1 } }, 0);
    const { id } = s.submitCandidate(1000, { author: 'p1', rationale: '',
      setting: { settingId: 'ending', value: 2 } });
    expect(s.getCandidate(id).disclosure).toBe('sealed');
  });

  it('a proposal keeps the base it was made under when the constitution moves (entry 31)', () => {
    const { s, c } = fold(false, 'anonymous');
    s.amend(2000, { authorshipVisibility: 'public' });
    const { id } = s.submitCandidate(3000, {
      author: 'p2', patch: rewrite(0, 2, 'Decisions are by vote.'), rationale: 'r',
    });
    expect(s.getCandidate(c.id).disclosure).toBe('anonymous'); // untouched by the move
    expect(s.getCandidate(id).disclosure).toBe('public');
    expect(authorVisible(s.getCandidate(c.id), s.constitution, { closed: false })).toBe(false);
    expect(authorVisible(s.getCandidate(id), s.constitution, { closed: false })).toBe(true);
    // and the option view reads the rule, never the constitution's current value
    const opts = new ParticipantApi(s, 'p3').nextCards(8, 3500).flatMap((k) => [k.a, k.b]);
    expect(opts.find((o) => o.id === c.id)?.author).toBeUndefined();
    expect(opts.find((o) => o.id === id)?.author).toBe('p2');
  });

  it('`authorVisible` — the twelve cells: three bases × signed × closed', () => {
    const table: Array<[Base, boolean, boolean, boolean]> = [
      // base        signed  closed  visible
      ['anonymous',  false,  false,  false],
      ['anonymous',  false,  true,   false],
      ['anonymous',  true,   false,  true],
      ['anonymous',  true,   true,   true],
      ['sealed',     false,  false,  false],
      ['sealed',     false,  true,   true],
      ['sealed',     true,   false,  true],
      ['sealed',     true,   true,   true],
      ['public',     false,  false,  true],
      ['public',     false,  true,   true],
      ['public',     true,   false,  true],
      ['public',     true,   true,   true],
    ];
    // the constitution's current value is a red herring for a stamped candidate
    const now = { authorshipVisibility: 'public' as const };
    for (const [base, signed, closed, want] of table) {
      const c = { ...(signed ? { signed: true as const } : {}), disclosure: base };
      expect(authorVisible(c, now, { closed }), `${base} signed=${signed} closed=${closed}`).toBe(want);
    }
    // a candidate with no stamp — a log older than the field — reads the
    // constitution as it stands (decision 3)
    const at = (v: Base) => ({ authorshipVisibility: v });
    expect(authorVisible({}, at('public'), { closed: false })).toBe(true);
    expect(authorVisible({}, at('sealed'), { closed: false })).toBe(false);
    expect(authorVisible({}, at('sealed'), { closed: true })).toBe(true);
    expect(authorVisible({}, at('anonymous'), { closed: true })).toBe(false);
  });
});
