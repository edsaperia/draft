import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import type { RaceView } from '../src/types.js';
import { roster } from './helpers.js';

/**
 * **The floor counts approvals** (Q1439, Ed 2026-09-17; SPEC §4.2, §8.2 →
 * why: R-125, R-126, R-127).
 *
 * The defect this file exists to close: the floor counted distinct *judges* of
 * the leader whichever way they judged (R-102), and silence was never imputed
 * (R-089) — so a judgment *against* a proposal helped it reach its floor and an
 * absence did not. Wherever a proposal's supporters outnumbered its opponents
 * but were fewer than F, its opponents defeated it by staying away and lost by
 * voting. At a quorum of 100% one member did it alone, for ever.
 *
 * Four properties are what the shape was chosen for, and each has a test of
 * its own below:
 *
 *  1. a judgment *against* X never lowers F and never raises approvals — it
 *     can never help X;
 *  2. abstaining never raises F — silence can only delay, by one period;
 *  3. an approval always helps — approvals by one, F by at most a half;
 *  4. with 💤 *never* the rule is a plain approval quorum capped at half of E.
 *
 * **And since v0.133 the card's number is the only number** (Ed, 2026-09-18,
 * Q1439 ruling s: *if the membership want a smaller quorum they should be able
 * to choose it* → why: R-131, reversing R-073). `F = max(1, Q′)`: the built-in
 * minimum of ⌈E/3⌉ has gone, so a room that asks for a small quorum gets one.
 * The consequence Ed confirmed when he ruled it has a test of its own below —
 * *a room of ten at 30% with seven silent carries a proposal 2 to 1 once the
 * period has run*.
 *
 * One consequence runs through this whole file: **with no quorum settled F is
 * 1**, so a race is held open only by §4.2's measured clause and by the leader
 * being on top. Every test here whose subject is not adoption therefore names
 * a quorum, where before the ⌈E/3⌉ term supplied one for free.
 */

const HOUR = 3600_000;
const MINUTE = 60_000;

const DOC = [
  '# Charter',
  'Membership is open to anyone.',
  'Decisions are made by consensus.',
  'Meetings happen when someone calls one.',
].join('\n');

function open(
  overrides: Record<string, unknown> = {},
  size = 5,
): Session {
  return Session.open(
    {
      text: DOC,
      roster: roster(size),
      constitution: makeConstitution({
        windowStartMs: 0,
        windowEndMs: 1000 * HOUR,
        rngSeed: 'approval-floor',
        cooldownMs: 0,
        ...overrides,
      }),
    },
    0,
  );
}

/** Replace line `line` with `text`. */
const rewrite = (base: number, line: number, text: string) =>
  ({ baseVersion: base, hunks: [{ start: line, end: line + 1, lines: [text] }] });

/** Replace lines `[from, to)` with one line. */
const rewriteSpan = (base: number, from: number, to: number, text: string) =>
  ({ baseVersion: base, hunks: [{ start: from, end: to, lines: [text] }] });

const only = (s: Session, t: number): RaceView => {
  const rs = s.races(t);
  expect(rs.length).toBe(1);
  return rs[0]!;
};

/** p1 proposes on line 1 at t=1000; nobody has answered yet. */
function proposed(overrides: Record<string, unknown> = {}, size = 5): {
  s: Session; id: string;
} {
  const s = open(overrides, size);
  const { id } = s.submitCandidate(1000, {
    author: 'p1',
    rationale: 'because',
    patch: rewrite(s.currentVersion(), 1, 'Membership is open to members.'),
  });
  return { s, id };
}

describe('the floor counts approvals (Q1439, R-125)', () => {
  it('an approval is a preference for the leader over the current text', () => {
    // a quorum of half, so the race is still open after the second approval
    const { s } = proposed({ quorum: { form: 'share', n: 50 } });
    // the author's derived preference (§3.3) is one approval and the group is
    // everybody: two approvers-or-awaited short of nobody
    let r = only(s, 2000);
    expect(r.approvals).toBe(1);
    expect(r.group).toBe(5);
    s.judge(2000, 'p2', r.leaderId!, r.incumbentId, 'a');
    r = only(s, 2001);
    expect(r.approvals).toBe(2);
    expect(r.group).toBe(5); // p2 was awaited; approving moves them inside it
  });

  it('a judgment for the current text is no approval, and leaves the group alone', () => {
    const { s } = proposed();
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'b'); // prefers what stands
    const r = only(s, 2001);
    expect(r.approvals).toBe(1);
    expect(r.group).toBe(5);
  });

  it('Indifferent steps out of the group the share is taken of (ruling i)', () => {
    // a count of two, so the race is still open with one approval on it: with
    // no quorum at all F would be 1 and p2's tie would carry the proposal
    const { s } = proposed({ quorum: { form: 'count', n: 2 } });
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'tie');
    const r = only(s, 2001);
    expect(r.approvals).toBe(1);
    expect(r.group).toBe(4); // answered, and out of the group
    // and the meter still counts it: it is a judgment (ruling b)
    expect(r.leaderJudges).toBe(2);
  });

  it('a rival-pair judgment approves neither candidate (strict approval, ruling k)', () => {
    // a count of three: p3's rival judgment is a measured judgment of the
    // leader, so at F = 1 the race would adopt out from under the subject
    const { s, id } = proposed({ quorum: { form: 'count', n: 3 } });
    // a rival on the same line, so the two race each other
    const second = s.submitCandidate(1500, {
      author: 'p2',
      rationale: 'other',
      patch: rewrite(s.currentVersion(), 1, 'Membership is open to the invited.'),
    });
    const r0 = only(s, 2000);
    expect(r0.members).toEqual([id, second.id]);
    const before = r0.approvals;
    s.judge(2000, 'p3', id, second.id, 'a'); // X over the rival, not over the text
    const r = only(s, 2001);
    expect(r.approvals).toBe(before); // nothing approved
    expect(r.leaderJudges).toBeGreaterThan(r0.leaderJudges); // but the meter moved
  });

  it('the author counts once, and only for their own candidate', () => {
    // a count of three again: p1's explicit judgment of their own text is a
    // measured one, so nothing but the floor holds the race open here
    const { s, id } = proposed({ quorum: { form: 'count', n: 3 } });
    const r0 = only(s, 2000);
    // an explicit judgment of their own text overrides the derived one (R-062)
    s.judge(2000, 'p1', id, r0.incumbentId, 'a');
    expect(only(s, 2001).approvals).toBe(1);
    // and a rival's author is no approver of this one
    s.submitCandidate(2500, {
      author: 'p2',
      rationale: 'other',
      patch: rewrite(s.currentVersion(), 1, 'Membership is open to the invited.'),
    });
    const r = only(s, 3000);
    expect(r.leaderId).toBe(id);
    expect(r.approvals).toBe(1);
  });

  it('a suspended author approves nothing — their derived preference is not cast', () => {
    const { s } = proposed();
    expect(only(s, 2000).approvals).toBe(1);
    s.suspendParticipant(2000, 'p1');
    const r = only(s, 2001);
    expect(r.approvals).toBe(0);
    expect(r.group).toBe(4); // and p1 is out of E, so out of the awaited too
  });

  it('a judgment cast before its author left E keeps counting (§9.5a)', () => {
    const { s } = proposed({ quorum: { form: 'share', n: 50 } });
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    s.suspendParticipant(2500, 'p2');
    const r = only(s, 2600);
    expect(r.approvals).toBe(2);          // p2's approval still stands
    expect(r.group).toBe(5);              // p1, p2 (departed) and three awaited
  });
});

describe('the floor is read against the group X is waiting on (R-126, R-139)', () => {
  it('a count-form quorum above the group is capped at the group', () => {
    // count 9 in a room of 5: the cap is the group itself, 5 — R-088's
    // property, that however few are left the quorum never outgrows them,
    // and all that is left of R-126's cap since Q1490 (R-139)
    const { s } = proposed({ quorum: { form: 'count', n: 9 } });
    expect(only(s, 2000).floor).toBe(5);
    expect(s.adoptionFloor()).toBe(5);
  });

  it('a count at the whole group is unanimity, and asks for it', () => {
    // and below the group it is simply the number asked for: the cap at half
    // used to make this 3 (Q1490 reversed it, R-139)
    const { s } = proposed({ quorum: { form: 'count', n: 5 } });
    expect(only(s, 2000).floor).toBe(5);
  });

  it('a share-form quorum is a share of the group, to 100% of it', () => {
    const { s } = proposed({ quorum: { form: 'share', n: 50 } });
    // the whole room is still in the group: ⌈50×5/100⌉ = 3, and nothing caps
    // it — 50% of five is 3, as it reads, not a majority (Q1490)
    expect(only(s, 2000).floor).toBe(3);
    // …and the whole scale is available above it
    expect(only(proposed({ quorum: { form: 'share', n: 100 } }).s, 2000).floor).toBe(5);
    expect(only(proposed({ quorum: { form: 'share', n: 90 } }).s, 2000).floor).toBe(5);
    expect(only(proposed({ quorum: { form: 'share', n: 51 } }).s, 2000).floor).toBe(3);
  });

  /**
   * **At 100% one member preferring the current text ends the proposal**
   * (Q1490, R-139): the quorum is the whole group, so the best future — every
   * member still to answer approving — cannot reach it once anybody has
   * answered the other way, and §4.4 closes the candidate. It was put to Ed
   * before he confirmed the ruling, and taken.
   */
  it('at 100% one vote for the current text closes the proposal (§4.4)', () => {
    const { s, id } = proposed({ quorum: { form: 'share', n: 100 } });
    const r = only(s, 2000);
    expect(r.floor).toBe(5);
    s.judge(2000, 'p2', r.leaderId!, r.incumbentId, 'b');   // prefer the text
    s.tick(2100);
    expect(s.getCandidate(id).state).toBe('retired');
    expect(s.getCandidate(id).exit?.cause).toBe('dominated');
  });

  /**
   * **And 💤 is what keeps such a room moving** (Q1490): a silence that has
   * run its period leaves the group the quorum is read against (§8.2), so
   * 100% is *everybody still deciding* rather than everybody on the roster.
   */
  it('silence past 💤 shrinks the group, and unanimity with it', () => {
    const P = 30 * MINUTE;
    const { s } = proposed({ quorum: { form: 'share', n: 100 }, abstainAfterMs: P });
    expect(only(s, 2000).floor).toBe(5);
    // three of the five say nothing for their period: the group is the author
    // and the one member still inside it
    const r = only(s, 2000);
    s.judge(2000, 'p2', r.leaderId!, r.incumbentId, 'a');
    const late = only(s, 2000 + P + 1);
    expect(late.group).toBe(2);
    expect(late.floor).toBe(2);
    expect(late.approvals).toBe(2);
  });

  it('no third sits under the room’s number any more (ruling s, R-131 reversing R-073)', () => {
    // E = 12, where ⌈12/3⌉ = 4 was the floor whatever the room asked for: a
    // count of three is three now, on the race and on the room's own reading
    const { s } = proposed({ quorum: { form: 'count', n: 3 } }, 12);
    expect(only(s, 2000).floor).toBe(3);
    expect(s.adoptionFloor()).toBe(3);
  });

  /**
   * **A proposal needs a seconder** (Ed, 2026-09-18, Q1439 ruling u, out of
   * the churn re-run). The floor is never fewer than two approvals — the
   * author and one other member — because one approval is the author's own
   * derived preference and so no floor at all: at `max(Q′, 1)` a room of
   * fifteen made 904 adoptions in a month, 888 of them reversions.
   */
  it('the floor is never fewer than two approvals (ruling u)', () => {
    // E = 5 at a share of 5 %: Q′ = ⌈5×5/100⌉ = 1, and F is 2
    const { s } = proposed({ quorum: { form: 'share', n: 5 } });
    const r0 = only(s, 2000);
    expect(r0.floor).toBe(2);
    expect(r0.approvals).toBe(1);        // the author, alone
    expect(s.tick(2000)).toEqual([]);    // and waiting
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    // the seconder carries it
    expect(s.log.map((e) => e.event).some((e) => e.type === 'adopted')).toBe(true);
    expect(s.document()).toContain('Membership is open to members.');
  });

  it('the seconder is min(2, E): unanimity at E = 2, one at E = 1', () => {
    // E = 2: a room that settled no quorum has Q′ = 0, so the seconder is the
    // whole floor — and it is unanimity there
    const two = proposed({}, 2);
    expect(two.s.adoptionFloor()).toBe(2);
    expect(only(two.s, 2000).floor).toBe(2);
    // E = 1 is R-063's room of one, where the sole member is author and room
    expect(open({ quorum: { form: 'count', n: 99 } }, 1).adoptionFloor()).toBe(1);
  });

  it('a room that settled no quorum is held to the seconder and nothing more', () => {
    const { s } = proposed({}, 12);
    expect(s.adoptionFloor()).toBe(2);
    const r = only(s, 2000);
    expect(r.floor).toBe(2);
    expect(r.approvals).toBe(1);   // the author's own preference, one short
    expect(r.leaderMeasured).toBe(0);
    expect(s.tick(2000)).toEqual([]); // and nothing carries on it alone
  });

  it('`adoptionFloorMax` enters no formula (Q1439 ruling s)', () => {
    // it stays on the `Constitution` for the logs that carry it, and a room of
    // forty — where ⌈40/3⌉ = 14 once sat, clamped to 12 — reads its own number
    for (const fMax of [0, 1, 12, 99]) {
      const { s } = proposed({ quorum: { form: 'count', n: 3 }, adoptionFloorMax: fMax }, 40);
      expect(s.adoptionFloor(), `fMax ${fMax}`).toBe(3);
      expect(only(s, 2000).floor, `fMax ${fMax}`).toBe(3);
    }
  });
});

describe('silence on one candidate becomes an abstention (R-127)', () => {
  /**
   * **The deadlock this exists to end, with the numbers worked** (the plan's
   * §4, stage 1). E = 5, a quorum of 50%, the author and one other approve,
   * three say nothing.
   */
  it('the worked example: three silences, one period, and it carries', () => {
    const P = 30 * MINUTE;
    const { s } = proposed({ quorum: { form: 'share', n: 50 }, abstainAfterMs: P });
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');

    // G = 5, Q′ = min(⌈50×5/100⌉, ⌈5/2⌉) = 3, M = ⌈5/3⌉ = 2, F = 3 > 2 — it waits
    const waiting = only(s, 3000);
    expect(waiting.group).toBe(5);
    expect(waiting.floor).toBe(3);
    expect(waiting.approvals).toBe(2);
    expect(s.tick(3000)).toEqual([]);
    expect(s.document()).toContain('Membership is open to anyone.');

    // once the three periods have run: G = 2, Q′ = min(⌈50×2/100⌉, ⌈2/2⌉) = 1,
    // and the seconder holds F at 2 (ruling u) — it adopts on the nose. It was
    // F = 2 under R-073's ⌈5/3⌉ too: the third has gone (ruling s, R-131) and
    // two approvals is what a proposal needs from a room of five either way.
    const after = 1000 + P + 1;
    const ready = only(s, after);
    expect(ready.group).toBe(2);
    expect(ready.floor).toBe(2);
    expect(ready.approvals).toBe(2);
    expect(s.tick(after).map((e) => e.type)).toContain('adopted');
    expect(s.document()).toContain('Membership is open to members.');
  });

  /**
   * **Ed's own consequence, put to him and confirmed when he ruled** (2026-09-18,
   * Q1439 ruling s): *in a room of ten at 30% with seven silent, a proposal
   * adopts 2 to 1 once the period has run.* Under R-073 it never adopted at
   * all — ⌈10/3⌉ = 4 sat above every number the room could reach, so two
   * members backing a proposal against one opposing it waited for ever on
   * seven who had said nothing.
   */
  it('a room of ten at 30% carries a proposal 2 to 1 once the period has run (ruling s)', () => {
    const P = 30 * MINUTE;
    const { s } = proposed({ quorum: { form: 'share', n: 30 }, abstainAfterMs: P }, 10);
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a'); // with the author, two for
    s.judge(2100, 'p3', r0.leaderId!, r0.incumbentId, 'b'); // and one against

    // G = 10, Q′ = min(⌈30×10/100⌉, ⌈10/2⌉) = 3, F = 3 > 2 — it waits
    const waiting = only(s, 3000);
    expect(waiting.group).toBe(10);
    expect(waiting.floor).toBe(3);
    expect(waiting.approvals).toBe(2);
    expect(s.tick(3000)).toEqual([]);

    // the seven periods run: G = 3, Q′ = min(⌈30×3/100⌉, ⌈3/2⌉) = 1, and the
    // seconder holds F at 2 (ruling u) — which the two approvals meet exactly
    const after = 1000 + P + 1;
    const ready = only(s, after);
    expect(ready.group).toBe(3);
    expect(ready.floor).toBe(2);
    expect(ready.approvals).toBe(2);
    expect(s.tick(after).map((e) => e.type)).toContain('adopted');
    expect(s.document()).toContain('Membership is open to members.');
  });

  it('with 💤 never, it waits for ever (property 4)', () => {
    const { s } = proposed({ quorum: { form: 'share', n: 50 }, abstainAfterMs: null });
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    const r = only(s, 400 * HOUR);
    expect(r.group).toBe(5);
    expect(r.floor).toBe(3);
    expect(s.tick(400 * HOUR)).toEqual([]);
  });

  it('an unset 💤 is never — the field absent on an old log imputes nothing', () => {
    const { s } = proposed({ quorum: { form: 'share', n: 50 } });
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    expect(only(s, 400 * HOUR).group).toBe(5);
  });

  it('a judgment against is never worse for X than the silence it replaced (property 1)', () => {
    const P = 30 * MINUTE;
    const { s } = proposed({ quorum: { form: 'share', n: 50 }, abstainAfterMs: P });
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    s.judge(2100, 'p3', r0.leaderId!, r0.incumbentId, 'b'); // p3 prefers what stands
    const after = 1000 + P + 1;
    const r = only(s, after);
    // G = two approvers and one opposer; Q′ = min(⌈50×3/100⌉, ⌈3/2⌉) = 2, F = 2
    expect(r.group).toBe(3);
    expect(r.floor).toBe(2);
    expect(r.approvals).toBe(2);
    // it still adopts, two to one — which is the whole point: voting against
    // cannot do what staying away did
    expect(s.tick(after).map((e) => e.type)).toContain('adopted');
  });

  it('abstaining never raises the floor (property 2)', () => {
    const P = 10 * MINUTE;
    const { s } = proposed({ quorum: { form: 'share', n: 90 }, abstainAfterMs: P }, 8);
    const before = only(s, 2000);
    const after = only(s, 1000 + P + 1);
    expect(after.group).toBeLessThan(before.group);
    expect(after.floor).toBeLessThanOrEqual(before.floor);
  });

  it('an approval never costs X ground (property 3)', () => {
    const { s } = proposed({ quorum: { form: 'share', n: 50 }, abstainAfterMs: 10 * MINUTE }, 15);
    let r = only(s, 2000);
    let margin = r.approvals - r.floor;
    for (const who of ['p2', 'p3', 'p4', 'p5', 'p6']) {
      s.judge(2000, who, r.leaderId!, r.incumbentId, 'a');
      r = only(s, 2000);
      expect(r.approvals - r.floor).toBeGreaterThanOrEqual(margin);
      margin = r.approvals - r.floor;
    }
  });

  it('an abstention is undone by answering', () => {
    const P = 10 * MINUTE;
    const { s } = proposed({ abstainAfterMs: P });
    const late = 1000 + P + 1;
    const gone = only(s, late);
    expect(gone.group).toBe(1);
    const r0 = only(s, late);
    s.judge(late, 'p3', r0.leaderId!, r0.incumbentId, 'b');
    expect(only(s, late + 1).group).toBe(2);
  });

  it('a rival joining restarts nobody’s period — it changes no text (Q1441)', () => {
    const P = 10 * MINUTE;
    const { s } = proposed({ abstainAfterMs: P });
    const late = 1000 + P + 1;
    expect(only(s, late).group).toBe(1); // four abstentions
    // a rival whose footprint widens the contested area. The race's own
    // fingerprint moves — and **a judgment's ground is its own pair's**
    // (Q1441, R-129), so nothing about the leader's pair became answerable
    // afresh and nobody is awaited again. This test read the other way for
    // one commit, which is what the ruling corrected.
    s.submitCandidate(late, {
      author: 'p2',
      rationale: 'wider',
      patch: rewriteSpan(s.currentVersion(), 1, 3, 'One rule for both.'),
    });
    const r = only(s, late + 1);
    expect(r.group).toBe(1);
    // and the newcomer's own pair is answerable from *its* submission, so the
    // room is awaited on it for a period of its own
    expect(r.leaderId).toBeDefined();
  });

  it('the period restarts when the pair’s own ground changes (SPEC §4.4)', () => {
    // **A setting race is where this is visible** (Q1441, and the finding in
    // the hand-back): a text candidate's pair ground is the text under its own
    // footprint, and anything that rewrites that text either leaves its words
    // alone with moved offsets — no change — or conflicts with its patch and
    // strands it out of every race until `confirmRebase`, whose evidence reset
    // dates the restart. A setting race's ground is the standing value, which
    // moves under a live candidate: `setStanding` is the ground shift, and
    // every period on it starts again.
    const P = 10 * MINUTE;
    const s = open({ abstainAfterMs: P });
    s.setStanding(500, 'ending', { endsAtMs: 1_000 });
    s.submitCandidate(1000, {
      author: 'p1', rationale: 'later',
      setting: { settingId: 'ending', value: { endsAtMs: 9_000_000 } },
    });
    const late = 1000 + P + 1;
    expect(only(s, late).group).toBe(1); // four abstentions
    s.setStanding(late, 'ending', { endsAtMs: 2_000 });
    expect(only(s, late + 1).group).toBe(5); // everybody is awaited again
    expect(only(s, late + 1 + P + 1).group).toBe(1);
  });

  it("a member's own arrival starts their period, not the candidate's submission", () => {
    const P = 10 * MINUTE;
    const { s } = proposed({ abstainAfterMs: P });
    const late = 1000 + P + 1;
    expect(only(s, late).group).toBe(1);
    s.addParticipant(late, { id: 'p9', handle: 'P9' });
    expect(only(s, late + 1).group).toBe(2);       // the newcomer is awaited
    expect(only(s, late + P + 2).group).toBe(1);   // and abstains a period later
  });

  it('a returning member is awaited again (§9.5a)', () => {
    const P = 10 * MINUTE;
    const { s } = proposed({ abstainAfterMs: P });
    s.suspendParticipant(1500, 'p3');
    const late = 1000 + P + 1;
    expect(only(s, late).group).toBe(1);
    s.resumeParticipant(late, 'p3');
    expect(only(s, late + 1).group).toBe(2);
  });
});

describe('the edges of E', () => {
  it('at E = 1 the author is the room, whatever the quorum says (R-063)', () => {
    // it carries on submission, so the race is already gone: the numbers are
    // read off the record the batch wrote (Q1439)
    const { s } = proposed({ quorum: { form: 'count', n: 99 } }, 1);
    expect(s.races(1000)).toEqual([]);
    expect(s.document()).toContain('Membership is open to members.');
    const adopted = s.log.map((e) => e.event).find((e) => e.type === 'adopted');
    // the cap is ⌈1/2⌉ = 1 however high the count: a quorum of 99 in a room
    // of one is one, and the author's own preference is both floor and room
    expect((adopted as { approvals?: number; floor?: number }).approvals).toBe(1);
    expect((adopted as { approvals?: number; floor?: number }).floor).toBe(1);
  });

  // **A departed author is out of E** (issue #65 F1, SPEC §8.2): the derived
  // preference counts *unless its author is out of E*, and §9.5 names three
  // roads out — the engine honoured lapse alone, so a member who resigned or
  // was removed went on approving the proposal they left behind.
  it('a removed author is out of E, so their preference is not an approval', () => {
    const { s } = proposed({ quorum: { form: 'count', n: 2 } });
    expect(only(s, 2000).approvals).toBe(1);   // the author's own (§3.3)
    s.removeParticipant(2100, 'p1');           // a resignation folds to the same event
    expect(only(s, 2200).approvals).toBe(0);
  });

  // **A whole room lapsing at one tick retires nothing** (issue #65 F2, SPEC
  // §4.4 → why: R-140): with E empty every count is nought, `0 ≤ 0` held,
  // and every live proposal was closed for good — though §9.5a returns each
  // of those members on their next read.
  it('a room that all lapses at once retires nothing', () => {
    const { s } = proposed({ quorum: { form: 'count', n: 2 } });
    for (const p of ['p1', 'p2', 'p3', 'p4', 'p5']) s.suspendParticipant(2100, p);
    expect(only(s, 2200).dominated).toEqual([]);
    expect(s.tick(2200).map((e) => e.type)).not.toContain('candidate-retired');
    for (const p of ['p1', 'p2', 'p3', 'p4', 'p5']) s.resumeParticipant(2300, p);
    expect(only(s, 2400).leaderId, 'the proposal is still there when they return').toBeTruthy();
  });

  it('at E = 2 the seconder is unanimity, and the measured clause still binds', () => {
    const { s } = proposed({}, 2);
    const r = only(s, 2000);
    expect(r.approvals).toBe(1);
    expect(r.floor).toBe(2);          // min(2, E), which at E = 2 is everybody
    expect(r.leaderMeasured).toBe(0);
    expect(s.tick(2000)).toEqual([]); // nobody but the author has spoken
  });
});

describe('a setting race rides the same floor', () => {
  it('a motion carries on approvals, and an applicant approves nothing (X11)', () => {
    const P = 10 * MINUTE;
    const s = open({ abstainAfterMs: P, quorum: { form: 'share', n: 50 } }, 5);
    s.setStanding(500, 'ending', { endsAtMs: null });
    s.submitCandidate(1000, {
      author: 'p1', rationale: 'later',
      setting: { settingId: 'ending', value: { endsAtMs: 9_000_000 } },
    });
    const r0 = only(s, 2000);
    expect(r0.settingId).toBe('ending');
    expect(r0.approvals).toBe(1);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    const after = 1000 + P + 1;
    expect(only(s, after).approvals).toBe(2);
    expect(s.tick(after).map((e) => e.type)).toContain('adopted');
  });

  // issue #65's *Verify*: the motion races share the path, so a mover who
  // leaves stops approving their own motion as an author of a text does
  it('a mover who leaves stops approving their motion (issue #65 F1)', () => {
    const s = open({ quorum: { form: 'count', n: 2 } }, 5);
    s.setStanding(500, 'ending', { endsAtMs: null });
    s.submitCandidate(1000, {
      author: 'p1', rationale: 'later',
      setting: { settingId: 'ending', value: { endsAtMs: 9_000_000 } },
    });
    expect(only(s, 2000).approvals).toBe(1);
    s.removeParticipant(2100, 'p1');
    expect(only(s, 2200).approvals).toBe(0);
  });
});

describe('the record carries the numbers the batch decided on', () => {
  it("the adopted event states the winner's approvals and its floor", () => {
    const { s } = proposed();
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    const adopted = s.log.map((e) => e.event).find((e) => e.type === 'adopted');
    expect(adopted).toBeDefined();
    expect((adopted as { approvals?: number }).approvals).toBe(2);
    // no quorum settled, so the floor is the seconder's two, met exactly
    expect((adopted as { floor?: number }).floor).toBe(2);
  });

  // **And how many never answered** (Q1452, Ed 2026-09-18): the 👥 clause goes
  // on saying *(5 of 10)* while a proposal carries on two approvals, so the
  // outcome card says how many people did not answer in time. The number is
  // the members of E awaited on the winner-against-the-current-text pair
  // whose 💤 period had run at the batch's own `t` — read in the same
  // snapshot as the approvals and the floor, never re-derived later.
  it('the adopted event states how many did not answer in time', () => {
    const P = 10 * MINUTE;
    // a quorum of everybody holds the race open at two approvals: F is 3 —
    // the cap at half of a group of five — until the three silent members
    // abstain, when the group is two, the floor drops to the seconder's two
    // and the proposal carries
    const { s } = proposed({ abstainAfterMs: P, quorum: { form: 'share', n: 100 } });
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    expect(s.tick(2001)).toEqual([]);
    expect(only(s, 2001).abstained).toBe(0); // nobody's period has run yet
    const after = 1000 + P + 1;
    expect(only(s, after).abstained).toBe(3);
    expect(s.tick(after).map((e) => e.type)).toContain('adopted');
    const adopted = s.log.map((e) => e.event).find((e) => e.type === 'adopted');
    expect((adopted as { approvals?: number }).approvals).toBe(2);
    expect((adopted as { floor?: number }).floor).toBe(2);
    expect((adopted as { abstained?: number }).abstained).toBe(3);
  });

  it('nobody silent writes the count as zero, not as no key at all', () => {
    // the same rule as `approvals` and `floor`: every adoption written since
    // the field existed carries it, so **absent** means an older log and
    // nothing else. Zero is what the card reads as *say nothing*.
    const { s } = proposed();
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    const adopted = s.log.map((e) => e.event).find((e) => e.type === 'adopted');
    expect(adopted).toBeDefined();
    expect('abstained' in (adopted as object)).toBe(true);
    expect((adopted as { abstained?: number }).abstained).toBe(0);
  });

  it('a log written before the field existed folds unchanged', () => {
    const { s } = proposed();
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    const stripped = s.log.map((e) => e.event.type === 'adopted'
      ? { ...e, event: { ...e.event, approvals: undefined, floor: undefined } }
      : e);
    // the fields are optional, so a log without them replays to the same state
    void stripped;
    const replayed = Session.replay([...s.log]);
    expect(replayed.rollingHash()).toBe(s.rollingHash());
    expect(replayed.document()).toBe(s.document());
  });
});
