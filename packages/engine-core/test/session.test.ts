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
 * A roster of twelve **asking for four**, so F = 4. For tests that need a race
 * to survive a judgment or two before adopting: at a floor of one or two the
 * author's own derived preference (§3.3, §8.2) plus one other person meets it,
 * and almost anything adopts on first contact.
 *
 * **The four has to be asked for since v0.133** (Q1439 ruling s, R-131): the
 * built-in ⌈E/3⌉ supplied it here for free, and with the third gone a room
 * that has settled no quorum is held to one. Four is the number twelve used to
 * give, so every test downstream of this helper reads as it did.
 */
function openWide(): Session {
  return openSession({ quorum: { form: 'count', n: 4 } }, 12);
}

/**
 * A session whose **floor** is out of reach, for tests whose subject is not
 * adoption. Since SPEC v0.16 a submission carries its author's own recorded
 * preference (§3.3) and the author counts toward the floor (§8.2), so a small
 * race left to itself reaches the floor and resolves out from under whatever
 * the test was actually exercising.
 *
 * It held the *bar* at 0.999 until v0.128 (Q1362 (a), R-114): with the bar
 * gone the floor is the only thing that holds a supported race open, so a
 * quorum of 99 in a room of five says "not about adoption" in the one place
 * the rule still reads.
 */
function openHeld(): Session {
  return openSession({ quorum: { form: 'count', n: 99 } });
}

/** Replace line `line` with `text` (single-hunk rewrite). */
function rewrite(base: number, line: number, text: string) {
  return { baseVersion: base, hunks: [{ start: line, end: line + 1, lines: [text] }] };
}

describe('session lifecycle', () => {
  /**
   * Issue #2: the counter is state like any other, so the fold rebuilds it
   * from the ids the log already names. Before this, `Session.replay` started
   * at zero and the next submission or decree was minted `c1` again, over the
   * top of the live candidate holding that id — its author, rationale, stake
   * and race membership gone, and the duplicate replaying bit-identically.
   * The live path resumes by replay at every host restart.
   */
  it('a proposal or a decree after replay takes a fresh id', () => {
    const s = openHeld();
    const a = s.submitCandidate(1, { author: 'p1', patch: rewrite(0, 1, 'A'), rationale: 'A.' }).id;
    const r = Session.replay(s.log);
    const d = r.decreeText(2, { author: 'p1', patch: rewrite(0, 2, 'D'), rationale: 'D.' }).id;
    const last = Session.replay(r.log);
    const b = last.submitCandidate(3, {
      author: 'p2', patch: rewrite(1, 3, 'B'), rationale: 'B.',
    }).id;
    expect(new Set([a, d, b]).size).toBe(3);
    // and the first candidate is still itself, not the third one wearing its id
    const first = last.getCandidate(a);
    expect(first.author).toBe('p1');
    expect(first.rationale).toBe('A.');
    expect(first.state).toBe('live');
  });

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

    // The winner has its stake back, and exactly that (SPEC §7, Q1454). It
    // used to be refunded *above* the stake — `stake × min(w/0.5, 1.5)`, so a
    // well-received wording turned a profit on winning and a rejected one was
    // paid too. Proposing well is free now, and never better than free.
    expect(s.getCandidate(c1).exit!.refund).toBe(s.constitution.stake);

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
    // The floor keeps the race open while the moves are exercised: since SPEC
    // v0.16 each submission carries its author's own recorded preference, so a
    // race of this size would otherwise adopt out from under the test. It was
    // held late in the window for the ≈0.95 bar until v0.128 (R-114); the
    // clock no longer holds anything, so `openHeld` does.
    const t0 = 10 * HOUR;
    const s = openHeld();
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

  it('gates adoption on the floor, and on somebody who is not the author', () => {
    // **E = 5 with no quorum settled → F = 2** since v0.133 (Q1439 rulings s
    // and u, R-131): the built-in ⌈5/3⌉ = 2 has gone, and what is left under
    // the room's own number is the seconder — two approvals, the author and
    // one other member. Since SPEC v0.16 the author is one of the movers
    // (§8.2, "you are a voice" — Ed), so submitting is the first approval and
    // one other person meets the floor; §4.2's measured clause says the same
    // thing from the other side. Author + 1 adopts, as it always did here.
    const s = openSession();
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    expect(s.adoptionFloor()).toBe(2);
    expect(s.raceOf(c1).distinctMovers).toBe(1); // the author, alone, is short
    expect(s.raceOf(c1).leaderJudges).toBe(1);   // and is one judge of their own text (Q1337)
    expect(s.raceOf(c1).leaderMeasured).toBe(0); // which nobody has measured
    const inc = s.raceOf(c1).incumbentId;
    const events = s.judge(2000, 'p2', c1, inc, 'a');
    expect(events.some((e) => e.type === 'adopted')).toBe(true);
    expect(s.getCandidate(c1).state).toBe('adopted');
  });

  describe('the floor counts judges of the winner, not movers on the race (Q1337, R-102)', () => {
    // A room of fifteen at a quorum of half: F = max(8, min(5, 12)) = 8. Three
    // rivals on one line — the moon room's shape, where a race holding many
    // rivals met F on rival judgments while its leader had been judged by
    // almost nobody, and the record read *16 of 168* under a quorum of 60.
    //
    // **The quorum is 50, not 60, since Q1439** (R-126): no quorum may ask for
    // more than half, so 60 % of fifteen would be read as ⌈15/2⌉ = 8 whatever
    // the card said, and a share above 50 is refused at validation now. The
    // shape under test — a crowded race whose leader almost nobody has judged
    // — is the same at eight.
    const crowded = () => {
      const s = openSession({ quorum: { form: 'share', n: 50 },
        adoptionThresholdStart: 0.6, adoptionThresholdEnd: 0.6 }, 15);
      const { id: c1 } = s.submitCandidate(1000, { author: 'p1', patch: rewrite(0, 1, 'A.'), rationale: 'r' });
      const { id: c2 } = s.submitCandidate(2000, { author: 'p2', patch: rewrite(0, 1, 'B.'), rationale: 'r' });
      const { id: c3 } = s.submitCandidate(3000, { author: 'p3', patch: rewrite(0, 1, 'C.'), rationale: 'r' });
      expect(s.adoptionFloor()).toBe(8);
      const inc = s.raceOf(c1).incumbentId;
      // one judge of c1, which makes it the leader
      s.judge(4000, 'p4', c1, inc, 'a');
      return { s, c1, c2, c3, inc };
    };

    it('nine members judging the rivals leave the leader short: thirteen movers, two judges, no adoption', () => {
      const { s, c1, c2, c3 } = crowded();
      // nine members judge the two rivals against each other — ties, so the
      // fit moves neither toward the incumbent and c1 stays the leader
      let t = 5000;
      for (const p of ['p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13']) {
        const events = s.judge((t += 1000), p, c2, c3, 'tie');
        expect(events.some((e) => e.type === 'adopted')).toBe(false);
      }
      const race = s.raceOf(c1);
      expect(race.leaderId).toBe(c1);
      expect(race.leaderP).toBeGreaterThan(0.6); // the bar is cleared …
      expect(race.distinctMovers).toBe(13);      // … and the race is busy: three authors, ten judges
      expect(race.leaderJudges).toBe(2);         // but only p1's own voice and p4 have judged c1
      expect(race.leaderMeasured).toBe(1);
      expect(s.getCandidate(c1).state).toBe('live');
      // and the meter says so: the floor's distance is the leader's, 2 of 8,
      // where movers over F would have read full
      expect(race.closeness).toBeLessThanOrEqual(2 / 8 + 1e-9);
      // the nine tie judgments were on a rival pair, so nobody has answered
      // *c1 against the current text*: they are all still awaited (Q1439)
      expect(race.approvals).toBe(2);
      expect(race.group).toBe(15);
    });

    it('eight approvals carry it — and a win over a rival is not one (Q1439, R-125)', () => {
      const { s, c1, c2, inc } = crowded();
      // **The rule this test used to state is amended** (Q1439, ruling k). It
      // was *nine judges of the leader carry it, against the incumbent or
      // against a rival alike* (R-102): the floor counted judgments of the
      // winner whichever pair they were on. The floor counts **approvals**
      // now — *this over the current text* — so the win over a rival below
      // moves the meter and the ranking and buys the leader nothing toward
      // its floor, and it is the eighth approval that carries it.
      let t = 5000;
      s.judge((t += 1000), 'p5', c1, c2, 'a');
      expect(s.raceOf(c1).leaderJudges).toBe(3); // a judgment of c1, as before
      expect(s.raceOf(c1).approvals).toBe(2);    // and no approval of it
      // six more against the incumbent: the eighth approval is the adoption
      for (const [i, p] of ['p6', 'p7', 'p8', 'p9', 'p10', 'p11'].entries()) {
        const events = s.judge((t += 1000), p, c1, inc, 'a');
        const approvals = 3 + i;
        if (approvals < 8) {
          expect(events.some((e) => e.type === 'adopted'), `approval ${approvals} of 8`).toBe(false);
          expect(s.raceOf(c1).approvals).toBe(approvals);
        } else {
          expect(events.some((e) => e.type === 'adopted'), `approval ${approvals} of 8`).toBe(true);
        }
      }
      expect(s.getCandidate(c1).state).toBe('adopted');
    });

    it("a rival's author is nobody's judge but their own: two rivals, one judge each", () => {
      const s = openSession();
      const { id: c1 } = s.submitCandidate(1000, { author: 'p1', patch: rewrite(0, 1, 'A.'), rationale: 'r' });
      const { id: c2 } = s.submitCandidate(2000, { author: 'p2', patch: rewrite(0, 1, 'B.'), rationale: 'r' });
      const race = s.raceOf(c1);
      expect(race.members).toEqual([c1, c2]);
      expect(race.distinctMovers).toBe(2); // two voices on the race …
      expect(race.leaderJudges).toBe(1);   // … one of them for whichever leads
      expect(race.leaderMeasured).toBe(0); // and the room has not spoken
      // the E = 5 floor is 2, and two rival authors do not meet it between them
      expect(s.getCandidate(c1).state).toBe('live');
      expect(s.getCandidate(c2).state).toBe('live');
    });
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

  it('the clock no longer moves the test: identical evidence adopts early and late alike', () => {
    // **The ramp is retired** (Q1362 (b), Ed 2026-09-15, R-117). Until v0.128
    // this read *raises the bar over the window*: the same two wins carried an
    // early race and not a late one, which was the whole of what the ramp did.
    // Adoption is now the top of the ranking with the floor met, and neither
    // reads the clock, so the same evidence carries at either end of the
    // window — and the pinned bar is the same number at both.
    const judgeTwice = (s: Session, c: string, t0: number): boolean => {
      const inc = s.raceOf(c).incumbentId;
      // Stops at the first adoption: the author is already a mover, so a race
      // can meet the floor on the first judgment, and a second would be cast
      // into a race that has closed.
      for (const [i, judge] of ['p2', 'p3'].entries()) {
        const events = s.judge(t0 + i * 1000, judge, c, inc, 'a');
        if (events.some((e) => e.type === 'adopted')) return true;
      }
      return false;
    };
    const early = openSession();
    const { id: cE } = early.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    expect(judgeTwice(early, cE, 2000)).toBe(true);
    const late = openSession();
    const { id: cL } = late.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    expect(judgeTwice(late, cL, 10 * HOUR)).toBe(true);
    expect(late.adoptionThreshold()).toBeCloseTo(0.5, 6);
    expect(late.adoptionThreshold(0)).toBe(late.adoptionThreshold(10 * HOUR));
  });

  it('recomputes the floor when the roster changes, and blocks removed participants', () => {
    // **the share is the only thing left that tracks E** (Q1439 ruling s,
    // R-131): the built-in ⌈E/3⌉ used to move the floor as the roster did
    // whether or not the room had asked for anything, and a room with no
    // quorum settled now reads 1 at every size. So the tracking under test is
    // the quorum's own.
    const s = openSession({ quorum: { form: 'share', n: 50 } });
    expect(s.adoptionFloor()).toBe(3);  // ⌈50 × 5 / 100⌉
    s.addParticipant(1000, { id: 'p6', handle: 'P6' });
    expect(s.adoptionFloor()).toBe(3);  // ⌈50 × 6 / 100⌉
    s.addParticipant(1100, { id: 'p7', handle: 'P7' });
    expect(s.adoptionFloor()).toBe(4);  // ⌈50 × 7 / 100⌉
    s.removeParticipant(2000, 'p7');
    s.removeParticipant(2100, 'p6');
    s.removeParticipant(2200, 'p5');
    s.removeParticipant(2300, 'p4');
    expect(s.adoptionFloor()).toBe(2);  // ⌈50 × 3 / 100⌉
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

  it('an author cannot open their own performance account (SPEC §3.3, §8)', () => {
    // A candidate has no performance until somebody other than its author has
    // judged it: the author's own recorded preference is a voice, not
    // evidence. Since Q1454 nothing is paid for a performance at all — a
    // retirement returns nothing whatever the room thought — so what the rule
    // now protects is the peak that ranks the graveyard and the backlog (§8),
    // asserted here beside the wallet it used to protect.
    const s = openSession();
    const { id } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    const before = s.balance('p1', 1000);
    s.retire(2000, id);
    expect(s.getCandidate(id).peakW).toBe(0);
    expect(s.getCandidate(id).exit!.refund).toBe(0);
    expect(s.balance('p1', 2000)).toBe(before); // strictly no better off
  });

  it('refunds by the book: withdrawal full, a proposal that did not pass nothing', () => {
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
    // c2 loses to the incumbent and retires: nothing comes back (Q1454, where
    // this used to pay by performance). Three losses rather than two since
    // v0.16 — the author's own preference is in the ranking and offsets the
    // first of them. **And since Q1440 it retires itself**: the third loss is
    // the answer after which no answer still to come could carry it, so the
    // domination pass takes it at that same sweep and the explicit `retire`
    // this test used to make would throw.
    const inc = s.raceOf(c2).incumbentId;
    s.judge(3000, 'p2', c2, inc, 'b');
    s.judge(4000, 'p3', c2, inc, 'b');
    s.judge(4500, 'p4', c2, inc, 'b');
    expect(s.getCandidate(c2).state).toBe('retired');
    expect(s.getCandidate(c2).exit!.cause).toBe('dominated');
    expect(s.getCandidate(c2).exit!.refund).toBe(0);
    expect(s.balance('p1', 5000)).toBe(3); // the withdrawal's ✏️ and no other
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
    const { id: c3 } = s.submitCandidate(3000, {
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
    // A judged pair leaves the participant's feed. The first card is c1
    // against its incumbent: the crowded race carries two voices but its
    // leader has one judge, so it is short of the floor as the batch reads
    // it and takes the unheard boost (Q1337) — before the floor counted
    // judges of the winner, the two rival authors met F = 2 between them
    // and the boost went to c3's race alone.
    const first = feed1[0]!;
    expect(first.raceId).toBe(s.raceOf(c1).id);
    expect([first.aId, first.bId]).toContain(c1);
    s.judge(4000, 'p4', first.aId, first.bId, 'a');
    const after = s.feed('p4', 5);
    expect(
      after.some(
        (c) =>
          (c.aId === first.aId && c.bId === first.bId) ||
          (c.aId === first.bId && c.bId === first.aId),
      ),
    ).toBe(false);
    // p4 and p1's own voice are c1's two judges, the floor at E = 5: it
    // carries, and the untouched race on line 3 stays live
    expect(s.getCandidate(c1).state).toBe('adopted');
    expect(s.getCandidate(c3).state).toBe('live');
  });

  /**
   * **The hand is ordered by value, and by nothing else** (Q1178, Ed
   * 2026-09-09): serving never considers how recently a card was made, only
   * how close the race is to resolving; the least-measured are not
   * prioritised; the races closest to sealing come first. From 2026-09-05
   * to 2026-09-09 the hand's leading slots were reserved for the races this
   * participant had not judged, least-measured first — the slot this test
   * used to prove. It asserts the ordering now, in a room built to tell the
   * two apart: two unanimous races A and B (leaderP ≈ 0.97, floor met, no
   * boost), a fresh race C nobody has judged (≈ 0.80, boosted ×1.25 by
   * §8.2 — a value, not a slot) and a fresh race D one member has judged
   * for (≈ 0.89, boosted). By value D leads C leads A and B; the slot would
   * have dealt C before D, having fewer comparisons. Exploration is
   * switched off so the order is structural, not a roll. What keeps a race
   * off the hand reachable is `askOn` (Q1202), and the last assertion is
   * that seam.
   */
  it('deals races by value alone: closest to sealing first, never least-measured first', () => {
    const room = (hotSetSize: number) => {
      // the count of four is what ⌈12/3⌉ gave until v0.133 (Q1439 ruling s):
      // the floor has to be asked for now, and this room wants one of four
      const s = openSession({ hotSetSize, explorationEvery: 1_000_000,
        quorum: { form: 'count', n: 4 } }, 12); // floor 4
      const { id: cA } = s.submitCandidate(1000, {
        author: 'p1', patch: rewrite(0, 1, 'A.'), rationale: 'r' });
      const { id: cB } = s.submitCandidate(2000, {
        author: 'p2', patch: rewrite(0, 2, 'B.'), rationale: 'r' });
      // Four judges each, **and the room divided** (1 for, 3 against beside
      // each author's own preference): both races are past the floor and carry
      // real evidence, and a divided room is what leaves them live now that
      // the bar is gone (Q1362, R-114) — until v0.128 the pair were unanimous
      // and a bar of 0.999 held them. What the feed is being asked is
      // unchanged: two heavily judged races against two the reader has never
      // been asked about.
      for (const [i, p] of ['p3', 'p4', 'p5', 'p6'].entries()) {
        const v = i === 0 ? 'a' : 'b';
        s.judge(3000 + 2 * i, p, cA, s.raceOf(cA).incumbentId, v);
        s.judge(3001 + 2 * i, p, cB, s.raceOf(cB).incumbentId, v);
      }
      // C: no measured comparisons, floor unmet; D: one judgment for it
      const { id: cC } = s.submitCandidate(5000, {
        author: 'p7', patch: rewrite(0, 3, 'C.'), rationale: 'r' });
      const { id: cD } = s.submitCandidate(5500, {
        author: 'p9', patch: rewrite(0, 0, 'D.'), rationale: 'r' });
      s.judge(5600, 'p10', cD, s.raceOf(cD).incumbentId, 'a');
      const race = (id: string) => s.raceOf(id);
      expect(race(cD).comparisons).toBeGreaterThan(race(cC).comparisons);
      expect(race(cD).leaderP!).toBeGreaterThan(race(cC).leaderP!);
      // A is the heavily judged race the room has turned against, so its
      // leader prices below a fresh one — and it is past the floor, so it
      // takes no unheard boost. That is the ordering under test.
      expect(race(cA).leaderP!).toBeLessThan(race(cD).leaderP!);
      expect(race(cA).leaderJudges).toBeGreaterThanOrEqual(s.adoptionFloor());
      return { s, raceA: race(cA).id, raceB: race(cB).id, raceC: race(cC).id, raceD: race(cD).id, cA };
    };

    // The default hand of three, to p8 who has judged nothing: D, then C,
    // then the first of the tied unanimous pair — the value order, where
    // the slot would have led with C
    {
      const { s, raceA, raceB, raceC, raceD } = room(3);
      const order = s.feed('p8', 3, 6000).map((c) => c.raceId);
      expect(order).toEqual([raceD, raceC, raceA]);
      expect(order).not.toContain(raceB);
    }
    // A hand of two holds the two boosted fresh races; the unanimous races
    // are off it — and still askable of p8, which is what the view carries
    {
      const { s, raceA, raceC, raceD, cA } = room(2);
      const order = s.feed('p8', 4, 6000).map((c) => c.raceId);
      expect(order).toEqual([raceD, raceC]);
      const ask = s.askOn('p8', raceA);
      expect(ask).not.toBeNull();
      expect([ask!.aId, ask!.bId]).toContain(cA);
    }
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
  it('an adoption within the race locks the pairs whose text it changed, and only those', () => {
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

    // The survivors' race re-forms with a new **race-wide** incumbent id:
    // the field changed and the contested area with it. **And that is no
    // longer what locks a judgment** (Q1441, Ed 2026-09-17, R-129): the
    // rival pair below compared the wording on line 1, which w's adoption
    // never touched, so the room's answer about it is still an answer about
    // the text that stands. Until Q1441 the race-wide fingerprint voided it —
    // *a new rival joining a clause shouldn't change a preference between two
    // other rivals*, and neither should a neighbour's adoption.
    const race = s.raceOf(cB);
    expect(race.members).toEqual([cB, cC]);
    expect(race.incumbentId).not.toBe(oldInc);
    expect(race.comparisons).toBe(1); // the rival judgment survives the shift
    expect(race.distinctMovers).toBe(1);
    expect(race.leaderP).toBeGreaterThan(0.5); // both challengers carry their author
    const rival = s
      .judgments()
      .find((j) => j.participantId === 'p1' && [j.aId, j.bId].includes(cB) &&
        [j.aId, j.bId].includes(cC));
    expect(rival?.locked).toBe(false);
    expect(rival?.superseded).toBe(false);
    // What *did* lock is every judgment about text that is gone: the three
    // cast on w against the old text, w itself having carried
    expect(s.judgments().filter((j) => [j.aId, j.bId].includes(w))
      .every((j) => j.locked)).toBe(true);

    // The pair is not a fresh question either, so another member's judgment
    // of it adds to the evidence rather than restarting it.
    s.judge(t + 1000, 'p5', cB, cC, 'b');
    expect(s.raceOf(cB).comparisons).toBe(2);

    // The race is still in the feed for a member who has pairs left on it.
    const feed = s.feed('p5', 5, t + 2000);
    expect(feed.length).toBeGreaterThan(0);
    expect(feed.some((c) => c.raceId === s.raceOf(cB).id)).toBe(true);

    // Replay reproduces the shift, the locks, and the evidence that survived.
    const replayed = Session.replay(s.log);
    expect(replayed.rollingHash()).toBe(s.rollingHash());
    expect(replayed.raceOf(cB).comparisons).toBe(2);
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
  /**
   * Hold the floor out of reach so no adoption interferes. It froze the
   * threshold at 0.99 until v0.128, when the bar left the test (R-114).
   *
   * **And it takes a room of nine since Q1439** (R-126): no quorum may ask for
   * more than half, so a count of 99 in a room of five is read as ⌈5/2⌉ = 3
   * and the third approval below would carry the race out from under the gate
   * it is testing. At nine the same count reads 5, which the four voices here
   * never reach.
   */
  const openGated = () => openSession({ quorum: { form: 'count', n: 99 } }, 9);

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
    // **The decisive pair comes first** (Q1439): the race is short of its
    // floor and p2 has not answered *the leader against the current text*,
    // which is the only answer that can move it — so that is what they are
    // served, ahead of the unmeasured rival pair that would otherwise move
    // the model most.
    expect(s.feed('p2', 6, 6000).every((c) => c.subtype === 'incumbent')).toBe(true);
    // Once they have answered it, rival pairs compete on value like any other
    // pair — and being unmeasured, the rival pair is then the most informative
    // card for this judge.
    s.judge(5500, 'p2', c1, inc, 'b');
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
    // the card carries no prompt (Q95; the field left at SPEC v0.108) — the
    // framing is the subtype, and the client says nothing on the card
    expect('prompt' in rival!).toBe(false);
    // Neither option is the status quo.
    for (const option of [rival!.a, rival!.b]) {
      expect(option.changes.every((ch) => ch.before !== ch.after)).toBe(true);
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
    // ceil(5/3) = 2; the room asked for 4 — the room's number governs, **up
    // to half** (Q1439, R-126), so in a room of five it is read as 3
    expect(s.adoptionFloor()).toBe(3);
    // and a count under the cap is the count itself
    expect(openSession({ quorum: { form: 'count', n: 3 } }, 9).adoptionFloor()).toBe(3);
  });

  it('a share quorum tracks E as the roster changes', () => {
    // 50 rather than 60 (Q1439, R-126: a share above half is refused now)
    const s = openSession({ quorum: { form: 'share', n: 50 } });
    expect(s.adoptionFloor()).toBe(3); // ceil(50 × 5 / 100)
    s.addParticipant(1, { id: 'p6', handle: 'F' });
    expect(s.adoptionFloor()).toBe(3); // ceil(50 × 6 / 100)
    s.addParticipant(2, { id: 'p7', handle: 'G' });
    expect(s.adoptionFloor()).toBe(4); // ceil(50 × 7 / 100)
  });

  it('a quorum below the old statistical minimum meets the seconder, never ⌈E/3⌉', () => {
    // **the built-in third has gone** (Ed, 2026-09-18, Q1439 ruling s: *if the
    // membership want a smaller quorum they should be able to choose it* →
    // why: R-131, reversing R-073). ⌈5/3⌉ = 2 used to sit under this and the
    // room's own number could only raise it; what sits there now is the
    // seconder's two (ruling u), which is a flat number at every roster size
    // rather than a share of it — a room of forty reads 2, not ⌈40/3⌉.
    const s = openSession({ quorum: { form: 'count', n: 1 } });
    expect(s.adoptionFloor()).toBe(2);
    expect(openSession({ quorum: { form: 'count', n: 1 }, adoptionFloorMax: 99 }, 40)
      .adoptionFloor()).toBe(2);
    // and a room that asked for three gets three, wherever the third would
    // have put it
    expect(openSession({ quorum: { form: 'count', n: 3 } }, 40).adoptionFloor()).toBe(3);
  });
});

describe('suspension — lapse engine-side (SPEC §9.5a, §8.2, 367b)', () => {
  it('a suspended participant leaves E, cannot act, and their cast judgments stand', () => {
    // a room of nine, so the two approvals below stay short of the floor
    // whatever the roster does (Q1439: no quorum above half — at five, this
    // race would carry on p2's approval and there would be no suspension left
    // to test)
    const s = openSession({ quorum: { form: 'share', n: 50 } }, 9);
    const { id: c1 } = s.submitCandidate(1000, {
      author: 'p1',
      patch: rewrite(0, 1, 'A.'),
      rationale: 'r',
    });
    const inc = s.raceOf(c1).incumbentId;
    s.judge(2000, 'p2', c1, inc, 'a');
    expect(s.adoptionFloor()).toBe(5); // ceil(50 × 9 / 100)
    s.suspendParticipant(3000, 'p2');
    s.suspendParticipant(3000, 'p3');
    expect(s.adoptionFloor()).toBe(4); // E = 7: max(ceil(3.5), ceil(7/3))
    // The judgment already cast keeps counting (§9.5a).
    expect(s.raceOf(c1).distinctMovers).toBe(2);
    expect(s.raceOf(c1).approvals).toBe(2);
    // But a suspended member cannot act until they return.
    expect(() => s.judge(4000, 'p2', c1, inc, 'a')).toThrow(/suspended/);
    s.resumeParticipant(5000, 'p2');
    expect(s.judge(6000, 'p2', c1, inc, 'b')).toBeDefined();
    expect(s.adoptionFloor()).toBe(4); // E = 8 → max(ceil(4), 3)
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
    // the bar the adoption was recorded under: pinned at ½ since v0.128
    // (R-117) and still on every `adopted` event, so no log shape moves
    expect(out[1]!.threshold).toBe(0.5);
    expect(JSON.stringify(out)).not.toContain('refund');
  });
});

describe('stage 8 follow-up: closeness, urgency, the record and the wallet clock', () => {
  it('closeness is a magnitude: mirror races read identically whichever side leads', () => {
    // a room of nine, so the three approvals the 'a' mirror casts stay under
    // the floor (Q1439: at five, `openHeld`'s capped floor of 3 would carry
    // it mid-mirror and there would be no race left to read)
    const held = () => openSession({ quorum: { form: 'count', n: 99 } }, 9);
    const mk = (dir: 'a' | 'b') => {
      const s = held();
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
    const s = held();
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
    // **The cooldown is the brake** (Q1362, R-116). A ramp high early and low
    // at the end held this candidate back until v0.128; with the bar gone the
    // cooldown is what leaves a ready race still waiting when the clock runs
    // out, and the close's batch runs regardless of it (§4.6) — which is the
    // thing under test. One adoption starts the cooldown clock.
    const s = openSession({ cooldownMs: 24 * HOUR });
    const { id: first } = s.submitCandidate(400, { author: 'p1',
      patch: rewrite(0, 1, 'Membership is open to all comers.'), rationale: 'r' });
    s.judge(500, 'p2', first, s.raceOf(first).incumbentId, 'a');
    expect(s.getCandidate(first).state).toBe('adopted');
    const { id } = s.submitCandidate(1000, { author: 'p1',
      patch: rewrite(s.currentVersion(), 0, 'Open.'), rationale: 'r' });
    const inc = s.raceOf(id).incumbentId;
    s.judge(2000, 'p2', id, inc, 'a');
    s.judge(3000, 'p3', id, inc, 'a');
    expect(s.getCandidate(id).state).toBe('live'); // the cooldown held it back
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
    const s = openHeld(); // the floor is out of reach, so nothing carries
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

  /**
   * **A stranded proposal files as undecided** (Ed, 2026-09-14, Q1353;
   * SPEC §2.6, §4.6 → why: R-113). A patch whose rebase failed is in
   * neither set the close used to sweep — it is out of every race and it is
   * not parked — so it stayed stranded for ever: out of the record, out of
   * the backlog, and outside the stake waiver. It is a question the clock
   * caught like any other, so it files like one, under its own name and off
   * the version its patch was written against.
   */
  it('files a proposal stranded by a text change as undecided (Q1353)', () => {
    const s = openHeld(); // the bar is out of reach: only the decree moves the text
    const v0 = s.currentVersion();
    const before = s.balance('p2', 1000);
    const { id: stranded } = s.submitCandidate(1000, { author: 'p2',
      patch: rewrite(v0, 1, 'Membership is closed.'), rationale: 'closed' });
    const staked = before - s.balance('p2', 1000);
    expect(staked).toBeGreaterThan(0);
    // a live rival elsewhere in the document, which the close files the old way
    const { id: live } = s.submitCandidate(1500, { author: 'p3',
      patch: rewrite(v0, 3, 'Meetings happen fortnightly.'), rationale: 'a rhythm' });
    // the same line rewritten under it: the rebase conflicts (SPEC §2.4)
    s.decreeText(2000, { author: 'p1',
      patch: rewrite(v0, 1, 'Membership is by invitation.'), rationale: 'mine' });
    expect(s.getCandidate(stranded).state).toBe('rebase-pending');
    expect(s.getCandidate(live).state).toBe('live');
    expect(s.balance('p2', 2000)).toBe(before - staked); // nothing came back

    s.close(5000);
    const undecided = s.log.map((e) => e.event)
      .filter((e): e is Extract<Event, { type: 'candidate-undecided' }> =>
        e.type === 'candidate-undecided');
    // both of them, and nothing synthesised for the decree's own candidate
    expect(undecided.map((e) => e.id).sort()).toEqual([live, stranded].sort());
    const filed = undecided.find((e) => e.id === stranded)!;
    // the same stake waiver as the rest (§7: tokens are worthless at the close)
    expect(filed.refund).toBe(0);
    expect(s.balance('p2', 5000)).toBe(before - staked);
    // its race is gone, so it files under its own name
    expect(filed.raceId).toBe(`r:${stranded}`);
    expect(s.getCandidate(stranded).state).toBe('undecided');
    expect(s.backlog().some((b) => b.candidateId === stranded)).toBe(true);
    // and the record reads it off the version its patch was written against,
    // which is what carries the span forward to the clause that displaced it
    const o = new ParticipantApi(s, 'p2').outcomes().find((x) => x.candidateId === stranded)!;
    expect(o.outcome).toBe('undecided');
    expect(o.version).toBe(v0);
    expect(s.verifyChain()).toBe(true);
    expect(Session.replay(s.log).rollingHash()).toBe(s.rollingHash());
  });

  /** …and a close with nothing stranded emits exactly what it always did. */
  it('synthesises nothing where no patch is stranded (Q1353)', () => {
    const s = openHeld();
    const { id } = s.submitCandidate(1000, { author: 'p1', patch: rewrite(0, 0, 'X.'),
      rationale: 'r' });
    s.close(5000);
    expect(s.log.map((e) => e.event)
      .filter((e) => e.type === 'candidate-undecided')
      .map((e) => (e as { id: string }).id)).toEqual([id]);
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
 * The meter case below is about the **floor**, not the room, and takes a
 * second member so the race it measures still exists to be read. (Two Q836
 * cases about the bar's span stood here until v0.128 and went with the span
 * itself — R-117, R-118.)
 */
describe('a document of one (Q837, backlog 253)', () => {
  const roomOf = (size: number) =>
    openSession({ quorum: { form: 'count', n: 1 } }, size);
  const solo = () => roomOf(1);
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
   * thing that differs between the two.
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

  it('and names the race where it survives — at E > 1, where the room has not spoken', () => {
    // two voices, so the room gate (`comparisons > 0`) is not bypassed and the
    // sweep adopts nothing: the race the submission made is still standing
    const s = roomOf(2);
    const { id, raceId } = propose(s);
    expect(s.getCandidate(id).state).toBe('live');
    expect(raceId).toBe(s.raceOf(id).id);
  });

  it('the ceiling holds nothing back any more: the sole member carries it whatever the fit reaches', () => {
    // A room of one tops out at 0.798 (Q840), and until v0.128 a bar of 0.9
    // was therefore one the sole member's own voice could never carry — the
    // candidate simply waited, for ever. There is no bar (Q1362 (b), R-117):
    // the leader is the top of the field, the floor of one is met, and it
    // carries on submission like any other sole member's proposal.
    const s = roomOf(1);
    const { id } = propose(s);
    expect(s.getCandidate(id).state).toBe('adopted');
    // and nobody was asked anything on the way (R-062)
    for (const t of [2000, 3000, 4000]) expect(s.feed('p1', 3, t)).toHaveLength(0);
  });

  it('closeness is the leader’s judges over the floor (Q1362 (c), R-118)', () => {
    // a room of sixteen asking for six: F = 6. It was the lesser of two
    // distances until v0.128 (R-101) — the bar's and the floor's — and the
    // bar's half went with the bar. What is left is the half Ed's wash always
    // wanted: the author's derived preference alone is one judge of six.
    // (The six was ⌈16/3⌉ until v0.133, Q1439 ruling s; it is asked for now.)
    const s = openSession({ quorum: { form: 'count', n: 6 } }, 16);
    const { id } = s.submitCandidate(1000, {
      author: 'p1', patch: rewrite(0, 1, 'Membership needs a sponsor.'), rationale: 'r',
    });
    const inc = s.raceOf(id).incumbentId;
    const born = s.raceOf(id);
    expect(s.adoptionFloor()).toBe(6);
    expect(born.closeness).toBeCloseTo(1 / 6, 10);      // one mover of six
    // each new judge is one step of the floor's distance, whichever way they vote
    s.judge(2000, 'p2', id, inc, 'a');
    expect(s.raceOf(id).closeness).toBeCloseTo(2 / 6, 10);
    s.judge(3000, 'p3', id, inc, 'b');
    expect(s.raceOf(id).closeness).toBeCloseTo(3 / 6, 10);
    // and a judge who has already moved is not a second mover
    s.judge(4000, 'p3', id, inc, 'a');
    expect(s.raceOf(id).closeness).toBeCloseTo(3 / 6, 10);
  });
});

/**
 * **The status quo is a peer** (Q1362 (a), Ed 2026-09-15; SPEC §4.2, R-114).
 * A race's field is its live candidates *and* the current text, authored by
 * nobody and staked with nothing; the document's text on a footprint is
 * whichever of them the ranking puts on top, once the floor is met. There is
 * no bar. A tie leaves the current text standing — the one asymmetry left.
 *
 * The six cases here are the rule itself: the tie, the two sides of a strict
 * majority, the cycle the ruling accepted as a property, the statistic the
 * leader is read off, and the two numbers that changed with it.
 */
describe('the text is the top of the ranking (Q1362, R-114)', () => {
  /** Who each cast judgment on this pair went to, ids only. */
  const winnersOn = (s: Session, a: string, b: string): string[] =>
    s.judgments()
      .filter((j) => [j.aId, j.bId].includes(a) && [j.aId, j.bId].includes(b))
      .map((j) => (j.outcome === 'tie' ? 'tie' : j.outcome === 'a' ? j.aId : j.bId));

  it('one for and one against is a tie, and a tie leaves the current text standing', () => {
    // The author's own derived preference (§3.3) is the one for; p2 is the one
    // against. Two voices, exactly opposed: the fit centres both strengths on
    // zero, so neither is on top and nothing carries — though the floor of two
    // is met and the room has measured the race.
    const s = openSession();
    const { id } = s.submitCandidate(1000, {
      author: 'p1', patch: rewrite(0, 1, 'A.'), rationale: 'r',
    });
    const inc = s.raceOf(id).incumbentId;
    s.judge(2000, 'p2', id, inc, 'b');
    const race = s.raceOf(id);
    expect(race.leaderJudges).toBeGreaterThanOrEqual(s.adoptionFloor());
    expect(race.leaderMeasured).toBeGreaterThan(0);
    const fit = s.raceFit(race.id);
    expect(fit.strengths.get(id)).toBe(fit.strengths.get(inc)); // exactly equal
    expect(race.leaderOnTop).toBe(false);
    expect(s.getCandidate(id).state).toBe('live');
  });

  it('eight for and seven against carries; seven for and eight against does not', () => {
    // Fourteen people vote and the author's derived preference is the first
    // voice for, so the tally is 8 to 7 or 7 to 8. The floor is held out of
    // reach while they vote and dropped at the end, so the batch decides on
    // the finished tally rather than on whatever was true after some
    // particular vote — a race is otherwise carried by the first majority that
    // passes through it, which is the cooldown's business and not this rule's.
    //
    // **The room is twenty-four, not fifteen, since Q1439** (R-126): no quorum
    // may ask for more than half, so a count of 99 in a room of fifteen is
    // read as 8 — exactly the tally — and the race carried mid-vote. At
    // twenty-four the cap is 12, above either tally, and the statistical
    // minimum the amendment leaves behind is ⌈24/3⌉ = 8, which the eight
    // approvals meet and the seven do not. Ten people never vote; silence
    // imputes nothing (💤 is unset here), so they stay in the group and the
    // capped quorum stays 12.
    const run = (forVotes: number) => {
      const s = openSession({ quorum: { form: 'count', n: 99 } }, 24);
      const { id } = s.submitCandidate(1000, {
        author: 'p1', patch: rewrite(0, 1, 'A.'), rationale: 'r',
      });
      const inc = s.raceOf(id).incumbentId;
      expect(s.raceOf(id).floor).toBe(12);
      let t = 2000;
      for (let i = 2; i <= 15; i++) {
        s.judge((t += 100), `p${i}`, id, inc, i <= forVotes ? 'a' : 'b');
      }
      expect(s.raceOf(id).leaderOnTop).toBe(forVotes === 8);
      expect(s.raceOf(id).approvals).toBe(forVotes === 8 ? 8 : 7);
      s.amend((t += 100), { quorum: null });
      s.tick(t + 100);
      return s.getCandidate(id).state;
    };
    expect(run(8)).toBe('adopted');
    expect(run(7)).toBe('live');
  });

  it('a dead-even split is a tie whichever order the votes arrived in (TIE_EPS)', () => {
    // A room of fourteen: the author's derived preference and six more for,
    // seven against — 7 to 7. The fit's two strengths differ by an optimiser
    // residual of ~1e-16 whose sign follows the arrival order; without a
    // tolerance one order carried and the other stood (the stage-1 build's
    // first finding, 2026-09-15). Both orders must read *not on top*.
    // **A room of twenty, thirteen of whom vote, since Q1439** (R-126): the
    // capped quorum is 10, above the seven approvals either order produces, so
    // the dead-even fit is read on a live race in both — at fourteen the cap
    // would be exactly seven and the *for*-first order would carry the race at
    // 7–0 before the dissent arrived.
    const run = (againstFirst: boolean) => {
      const s = openSession({ quorum: { form: 'count', n: 99 } }, 20);
      const { id } = s.submitCandidate(1000, {
        author: 'p1', patch: rewrite(0, 1, 'A.'), rationale: 'r',
      });
      const inc = s.raceOf(id).incumbentId;
      const votes: Array<['a' | 'b', string]> = [];
      for (let i = 2; i <= 14; i++) votes.push([i <= 7 ? 'a' : 'b', `p${i}`]);
      if (againstFirst) votes.reverse();
      let t = 2000;
      for (const [outcome, who] of votes) s.judge((t += 100), who, id, inc, outcome);
      const race = s.raceOf(id);
      const fit = s.raceFit(race.id);
      const diff = Math.abs((fit.strengths.get(id) ?? 0) - (fit.strengths.get(inc) ?? 0));
      expect(diff).toBeLessThan(1e-9);
      expect(race.leaderOnTop).toBe(false);
      s.amend((t += 100), { quorum: null });
      s.tick(t + 100);
      return s.getCandidate(id).state;
    };
    expect(run(false)).toBe('live');
    expect(run(true)).toBe('live');
  });

  it('a cycle carries a candidate a direct majority preferred the current text to', () => {
    // **The accepted property** (ruling (a), recorded, not a bug). Y beats X,
    // X beats the current text easily, and the current text beats Y 8–7 head
    // to head — and the model, weighing the evidence as a whole, still puts Y
    // on top of the field. The floor is held out of reach while the room
    // judges, then dropped, so the batch decides on the finished evidence
    // rather than on whatever was true after some particular vote.
    //
    // **Eighteen seats, not sixteen, since Q1439** (R-126): X collects eight
    // approvals on the way, and at sixteen the capped quorum is eight, so X
    // carried before Y's own votes arrived. At eighteen the cap is nine and
    // the minimum the amendment leaves is ⌈18/3⌉ = 6, which Y's seven meet.
    const s = openSession({ quorum: { form: 'count', n: 99 } }, 18);
    const { id: x } = s.submitCandidate(1000, {
      author: 'p1', patch: rewrite(0, 1, 'X.'), rationale: 'r' });
    const { id: y } = s.submitCandidate(1100, {
      author: 'p2', patch: rewrite(0, 1, 'Y.'), rationale: 'r' });
    const inc = s.raceOf(x).incumbentId;
    let t = 2000;
    const seats = (n: number, from: number) =>
      Array.from({ length: n }, (_, i) => `p${from + i}`);
    for (const p of seats(7, 3)) s.judge((t += 10), p, y, x, 'a');    // Y over X, 7
    for (const p of seats(7, 3)) s.judge((t += 10), p, x, inc, 'a');  // X over the text, 7
    for (const p of seats(8, 3)) s.judge((t += 10), p, inc, y, 'a');  // the text over Y, 8
    for (const p of seats(6, 11)) s.judge((t += 10), p, y, inc, 'a'); // Y over the text, 6
    // the direct pair, as the room actually cast it: eight for the current
    // text against six for Y, the author's derived preference the seventh
    const direct = winnersOn(s, y, inc);
    expect(direct.filter((w) => w === inc)).toHaveLength(8);
    expect(direct.filter((w) => w === y)).toHaveLength(6);
    const race = s.raceOf(y);
    const fit = s.raceFit(race.id);
    const str = (id: string) => fit.strengths.get(id) as number;
    expect(str(y)).toBeGreaterThan(str(x));
    expect(str(x)).toBeGreaterThan(str(inc));
    expect(race.leaderId).toBe(y);
    expect(race.leaderOnTop).toBe(true);
    // and with the floor back within reach the batch carries Y
    s.amend((t += 10), { quorum: null });
    s.tick(t + 10);
    expect(s.getCandidate(y).state).toBe('adopted');
    expect(s.document()).toContain('Y.');
  });

  it('the leader is the top of the ranking, not the likeliest to beat the current text', () => {
    // **The statistic matters** (§1's *implementation of "on top"*). X is
    // judged three times and wins all three; Y is judged sixteen times and
    // wins twelve. X's fitted strength is the higher — it is the top of the
    // field — while P(beats the current text) is *higher for Y*, because Y's
    // posterior is far tighter. Until v0.128 the leader was argmax of that
    // probability, so this race would have carried Y; the ranking's own
    // ordering carries X.
    //
    // **Twenty-eight seats, not twenty, since Q1439** (R-126): Y collects
    // thirteen approvals here, and at twenty the capped quorum is ten, so Y
    // carried while it was still briefly the leader. At twenty-eight the cap
    // is fourteen, above both tallies, and the fit is read on a live race.
    const s = openSession({ quorum: { form: 'count', n: 99 } }, 28);
    const { id: x } = s.submitCandidate(1000, {
      author: 'p1', patch: rewrite(0, 1, 'X.'), rationale: 'r' });
    const { id: y } = s.submitCandidate(1100, {
      author: 'p2', patch: rewrite(0, 1, 'Y.'), rationale: 'r' });
    const inc = s.raceOf(x).incumbentId;
    let t = 2000;
    for (const p of ['p3', 'p4', 'p5']) s.judge((t += 10), p, x, inc, 'a');
    for (let i = 0; i < 16; i++) {
      s.judge((t += 10), `p${i + 3}`, y, inc, i < 12 ? 'a' : 'b');
    }
    const race = s.raceOf(x);
    const fit = s.raceFit(race.id);
    expect(fit.strengths.get(x) as number).toBeGreaterThan(fit.strengths.get(y) as number);
    expect(fit.probBeats(y, inc)).toBeGreaterThan(fit.probBeats(x, inc));
    expect(race.leaderId).toBe(x);
    expect(race.leaderP).toBeCloseTo(fit.probBeats(x, inc), 12);
  });

  it('Indifferent steps out of the group, and approves nothing (Q1439, ruling i)', () => {
    // **Q1362's ruling (d) is amended** (Ed, 2026-09-17, Q1439 ruling i). It
    // read *Indifferent counts toward the floor: the member was asked, and
    // answered*, and at a floor of two the author's own preference plus one
    // *Indifferent* carried the proposal — a change adopted with exactly one
    // person behind it. An indifferent member is still *answered*: the meter
    // counts their judgment and the race stops waiting on them. What they are
    // not is an approval, and they leave the group the quorum is a share of,
    // which is the only reading under which indifference neither helps nor
    // hinders.
    // the count of two is what ⌈5/3⌉ gave until v0.133 (Q1439 ruling s): the
    // floor is asked for now, and the point below needs one above a single
    // approval
    const s = openSession({ quorum: { form: 'count', n: 2 } });
    const { id } = s.submitCandidate(1000, {
      author: 'p1', patch: rewrite(0, 1, 'A.'), rationale: 'r',
    });
    const inc = s.raceOf(id).incumbentId;
    expect(s.adoptionFloor()).toBe(2);
    expect(s.raceOf(id).leaderJudges).toBe(1); // the author alone
    const events = s.judge(2000, 'p2', id, inc, 'tie').map((e) => e.type);
    expect(events).not.toContain('adopted');
    expect(s.getCandidate(id).state).toBe('live');
    const race = s.raceOf(id);
    expect(race.leaderJudges).toBe(2);  // the meter counted it (ruling b)
    expect(race.approvals).toBe(1);     // and the floor did not
    expect(race.group).toBe(4);         // p2 is out of the group at once
    // and the one voice left is one short of the room's own number, which is
    // where it should have been all along
    expect(race.floor).toBe(2);         // min(2, ⌈4/2⌉)
  });

  it('the backlog ranks by the peak a candidate reached, not by its distance to a bar', () => {
    // `min(peakW / θ, 1)` divided by a bar that is now a pinned ½, so every
    // candidate the room ever preferred to the current text clamped to 1 and
    // the ranking flattened into salience alone (R-117). The peak is the
    // score now. Both candidates sit in one race, so they share a salience
    // weight and the ratio of their scores is the ratio of their peaks.
    //
    // A room of nine, since X collects four approvals below and `openHeld`'s
    // capped floor in a room of five is three (Q1439, R-126).
    const s = openSession({ quorum: { form: 'count', n: 99 } }, 9);
    const { id: x } = s.submitCandidate(1000, {
      author: 'p1', patch: rewrite(0, 1, 'X.'), rationale: 'r' });
    const { id: y } = s.submitCandidate(1100, {
      author: 'p2', patch: rewrite(0, 1, 'Y.'), rationale: 'r' });
    const inc = s.raceOf(x).incumbentId;
    s.judge(2000, 'p3', y, inc, 'a');            // Y's high-water mark
    s.judge(3000, 'p3', y, inc, 'b');            // and the room turning on it
    s.judge(4000, 'p4', y, inc, 'b');
    for (const p of ['p3', 'p4', 'p5']) s.judge(5000 + Number(p[1]), p, x, inc, 'a');
    const peak = (id: string) => s.getCandidate(id).peakW;
    expect(peak(x)).toBeGreaterThan(peak(y));
    expect(peak(y)).toBeGreaterThan(0.5); // both clamped to 1 under the old arithmetic
    const backlog = s.backlog();
    expect(backlog.map((b) => b.candidateId)).toEqual([x, y]);
    expect(backlog[0]!.score / backlog[1]!.score).toBeCloseTo(peak(x) / peak(y), 10);
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
