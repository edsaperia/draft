import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import { roster } from './helpers.js';

/**
 * **A judgment's ground is its own pair's** (Q1441, Ed 2026-09-17: *a new
 * rival joining a clause shouldn't change a preference between two other
 * rivals*; SPEC §4.4 → why: R-076, R-129).
 *
 * The defect. A race's ground was the hash of the current text under the
 * **union** of every live member's footprint, and a judgment was stamped with
 * that at the fold; `buildUsableComparisons` then dropped every comparison
 * whose stamp was not the race's ground *now*. So a newcomer whose patch
 * touched other lines as well — or that newcomer leaving — widened or narrowed
 * the union, changed the hash, and voided **every** judgment in the race,
 * rival-vs-rival pairs included. R-076's reason for voiding is only that a
 * judgment about text that no longer exists must not count: that is about
 * adoptions, not about who else has joined.
 *
 * The rule now: a comparison is usable while **the current text under its own
 * pair's lines is what it was when the judgment was cast** — for X against the
 * incumbent, the text under X's footprint; for A against B, the text under
 * footprint(A) ∪ footprint(B). A newcomer or a leaver voids nothing. An
 * adoption that rewrites those lines still voids exactly the pairs it touches.
 *
 * Why it matters twice over: under Q1439's approval floor a wiped vote is a
 * lost **approval**, so the race-wide ground was a second road to the very
 * deadlock Q1439 exists to end — the tims-birthday room (2026-09-16), where
 * one whole-document rewrite joined every one-line proposal's race and wiped
 * their votes.
 */

const HOUR = 3600_000;

const DOC = [
  'Clause one stands.',
  'Clause two stands.',
  'Clause three stands.',
  'Clause four stands.',
  'Clause five stands.',
].join('\n');

function open(overrides: Record<string, unknown> = {}, size = 9): Session {
  return Session.open({
    text: DOC,
    roster: roster(size),
    constitution: makeConstitution({
      windowStartMs: 0,
      windowEndMs: 1000 * HOUR,
      rngSeed: 'pair-ground',
      cooldownMs: 0,
      // out of reach for the handful of approvals these walks cast, so a race
      // stays up to be read (Q1439: the cap makes this ⌈9/2⌉ = 5)
      quorum: { form: 'count', n: 99 },
      ...overrides,
    }),
  }, 0);
}

/** A patch replacing lines [from, to) with one line. */
const span = (base: number, from: number, to: number, text: string) =>
  ({ baseVersion: base, hunks: [{ start: from, end: to, lines: [text] }] });

/** A pure insertion at `at` — a gap site (SPEC §4.4, Q1202). */
const gap = (base: number, at: number, text: string) =>
  ({ baseVersion: base, hunks: [{ start: at, end: at, lines: [text] }] });

const raceOf = (s: Session, id: string) =>
  s.races().find((r) => r.members.includes(id))!;

const standing = (s: Session, who: string, a: string, b: string) =>
  s.judgments().find((j) => j.participantId === who &&
    [j.aId, j.bId].includes(a) && [j.aId, j.bId].includes(b) && !j.superseded);

describe('a rival joining or leaving voids nothing (Q1441, R-129)', () => {
  /**
   * Two rivals on line 1, both judged, and then a third whose patch covers
   * lines 1–3. The race's own union widens from one line to three — which is
   * what used to change the ground and wipe the lot.
   */
  const withWidening = () => {
    const s = open();
    const { id: a } = s.submitCandidate(1000, {
      author: 'p1', rationale: 'r', patch: span(0, 0, 1, 'Clause one is rewritten.') });
    const { id: b } = s.submitCandidate(1100, {
      author: 'p2', rationale: 'r', patch: span(0, 0, 1, 'Clause one is reworded.') });
    const inc = raceOf(s, a).incumbentId;
    s.judge(2000, 'p3', a, inc, 'a');   // an approval of A over the text
    s.judge(2100, 'p4', a, b, 'a');     // and a preference between the rivals
    s.judge(2200, 'p5', b, inc, 'b');   // and one for the text over B
    return { s, a, b, inc };
  };

  it('a wider newcomer leaves every earlier judgment usable, and the fit unmoved on those pairs', () => {
    const { s, a, b, inc } = withWidening();
    const before = raceOf(s, a);
    const fitBefore = s.raceFit(before.id);
    const pBefore = fitBefore.probBeats(a, inc);
    expect(before.comparisons).toBe(3);
    expect(before.contested).toEqual([{ start: 0, end: 1 }]);

    // the newcomer covers lines 1–3: the union is three lines now
    const { id: w } = s.submitCandidate(3000, {
      author: 'p6', rationale: 'r', patch: span(0, 0, 3, 'One rule for the first three.') });
    const after = raceOf(s, a);
    expect(after.members).toEqual([a, b, w]);
    expect(after.contested).toEqual([{ start: 0, end: 3 }]);
    expect(after.incumbentId).not.toBe(inc); // the race's own ground did move

    // and nothing was voided: all three judgments still count
    expect(after.comparisons).toBe(3);
    expect(standing(s, 'p3', a, inc)!.locked).toBe(false);
    expect(standing(s, 'p4', a, b)!.locked).toBe(false);
    expect(standing(s, 'p5', b, inc)!.locked).toBe(false);
    // the fit still holds what the room said about A against the text. Not to
    // the last decimal: the field gained a node, and a Davidson fit over one
    // more wording is a different optimisation — what matters is that the
    // evidence is the same evidence, which the counts above say, and that the
    // posterior it produces has not been reset to the prior
    const pAfter = s.raceFit(after.id).probBeats(a, after.incumbentId);
    expect(pAfter).toBeGreaterThan(0.8);
    expect(Math.abs(pAfter - pBefore)).toBeLessThan(0.05);
  });

  it('and the newcomer withdrawing leaves them usable too — the narrowing voids nothing either', () => {
    const { s, a, b, inc } = withWidening();
    const { id: w } = s.submitCandidate(3000, {
      author: 'p6', rationale: 'r', patch: span(0, 0, 3, 'One rule for the first three.') });
    s.withdraw(3100, w);
    const after = raceOf(s, a);
    expect(after.members).toEqual([a, b]);
    expect(after.incumbentId).toBe(inc); // back to the narrow ground
    expect(after.comparisons).toBe(3);
    expect(standing(s, 'p3', a, inc)!.locked).toBe(false);
    expect(standing(s, 'p4', a, b)!.locked).toBe(false);
  });

  it('a judgment cast on the narrow race still names the incumbent when the race is wide', () => {
    // the old comparison carries the *old* race-wide incumbent id on its own
    // pair; the fit has to read it as the incumbent of the race the candidate
    // is now in, or the room's votes for A land on a node of their own
    const { s, a, inc } = withWidening();
    s.submitCandidate(3000, {
      author: 'p6', rationale: 'r', patch: span(0, 0, 3, 'One rule for the first three.') });
    const after = raceOf(s, a);
    const fit = s.raceFit(after.id);
    // exactly the field's nodes: the three members and the one incumbent
    expect([...fit.strengths.keys()].filter((k) => k.startsWith('inc:'))).toEqual([
      after.incumbentId,
    ]);
    expect(standing(s, 'p3', a, inc)!.aId).toBe(a);
    expect(standing(s, 'p3', a, inc)!.bId).toBe(inc); // the record is untouched
  });

  it('revision still replaces, across a widening: one usable judgment per pair', () => {
    const { s, a, inc } = withWidening();
    s.submitCandidate(3000, {
      author: 'p6', rationale: 'r', patch: span(0, 0, 3, 'One rule for the first three.') });
    const wide = raceOf(s, a);
    // p3 changes their mind, against the race's *current* incumbent id
    s.judge(4000, 'p3', a, wide.incumbentId, 'b');
    const mine = s.judgments().filter((j) => j.participantId === 'p3' && !j.superseded);
    expect(mine).toHaveLength(1);
    expect(mine[0]!.outcome).toBe('b');
    expect(mine[0]!.bId).toBe(wide.incumbentId);
    // and the record keeps the first one, superseded
    const all = s.judgments().filter((j) => j.participantId === 'p3');
    expect(all).toHaveLength(2);
    expect(all[0]!.superseded).toBe(true);
    expect(all[0]!.bId).toBe(inc);
    // the room's count of what it has measured is one per voice per pair
    expect(raceOf(s, a).comparisons).toBe(3);
  });

  it('the pair a member is served is not re-opened by a newcomer either', () => {
    // feed exclusion is keyed on the pair's own ground too (`contextKey`), so
    // a judged pair stays judged when somebody else joins the race
    const { s, a, inc } = withWidening();
    expect(s.askOn('p3', raceOf(s, a).id)).not.toBeNull(); // the rival pair is left
    s.submitCandidate(3000, {
      author: 'p6', rationale: 'r', patch: span(0, 0, 3, 'One rule for the first three.') });
    const asks = s.races().flatMap((r) => {
      const card = s.askOn('p3', r.id);
      return card === null ? [] : [[card.aId, card.bId].sort().join('|')];
    });
    expect(asks).not.toContain([a, inc].sort().join('|'));
  });
});

describe('a text change voids the pairs it touches, and only those (R-076 kept)', () => {
  it('an adoption on one clause leaves another clause’s judgments standing', () => {
    // the case R-076 is actually about: the text a judgment compared is gone,
    // so the judgment is a locked fact about text that no longer exists — and
    // the far clause's text is not gone, so its vote is not a locked fact
    const s = open(); // E = 9, F = 5
    const { id: a } = s.submitCandidate(1000, {
      author: 'p1', rationale: 'r', patch: span(0, 0, 1, 'Clause one is rewritten.') });
    const { id: c } = s.submitCandidate(1100, {
      author: 'p2', rationale: 'r', patch: span(0, 4, 5, 'Clause five is rewritten.') });
    const incA = raceOf(s, a).incumbentId;
    const incC = raceOf(s, c).incumbentId;
    expect(incA).not.toBe(incC);
    s.judge(2000, 'p3', c, incC, 'a'); // a vote on the far clause
    // five approvals carry the near one
    let t = 2100;
    for (const who of ['p2', 'p4', 'p5', 'p6']) s.judge((t += 10), who, a, incA, 'a');
    expect(s.getCandidate(a).state).toBe('adopted');
    // the far clause's own ground never moved, so its vote stands
    expect(standing(s, 'p3', c, incC)!.locked).toBe(false);
    expect(raceOf(s, c).comparisons).toBe(1);
  });

  it('a decree over a candidate’s own lines voids that candidate’s pairs', () => {
    const s = open();
    const { id: a } = s.submitCandidate(1000, {
      author: 'p1', rationale: 'r', patch: span(0, 0, 1, 'Clause one is rewritten.') });
    const { id: b } = s.submitCandidate(1100, {
      author: 'p2', rationale: 'r', patch: span(0, 0, 1, 'Clause one is reworded.') });
    const inc = raceOf(s, a).incumbentId;
    s.judge(2000, 'p3', a, inc, 'a');
    s.judge(2100, 'p4', a, b, 'a');
    expect(raceOf(s, a).comparisons).toBe(2);
    // the convenor rewrites line 1 under both of them (§9.7 rule 8)
    s.decreeText(3000, {
      author: 'p1', rationale: '',
      patch: span(s.currentVersion(), 0, 1, 'Clause one says something else.'),
    });
    // every judgment on this race compared text that is gone: all locked
    expect(standing(s, 'p3', a, inc)!.locked).toBe(true);
    expect(standing(s, 'p4', a, b)!.locked).toBe(true);
  });

  /**
   * **The tims-birthday room, 2026-09-16** — the field case R-129 is named
   * for. One member proposed a rewrite of the whole document; its footprint
   * conflicted with every one-line proposal in flight, so the union widened to
   * the whole text, the race-wide fingerprint changed, and **every vote in the
   * room was voided at once**. Under Q1439's approval floor those are lost
   * approvals, so it is a second road to the deadlock Q1439 exists to end.
   */
  it('a whole-document rewrite joins every race and wipes no vote', () => {
    const s = open();
    const ids: string[] = [];
    const incs: string[] = [];
    let t = 1000;
    for (const [i, line] of [0, 2, 4].entries()) {
      const { id } = s.submitCandidate((t += 10), {
        author: `p${i + 1}`, rationale: 'r',
        patch: span(0, line, line + 1, `Clause ${line + 1} is rewritten.`),
      });
      ids.push(id);
      incs.push(raceOf(s, id).incumbentId);
    }
    for (const [i, id] of ids.entries()) {
      s.judge((t += 10), `p${i + 4}`, id, incs[i]!, 'a');
      s.judge((t += 10), `p${i + 7}`, id, incs[i]!, 'b');
    }
    expect(s.races()).toHaveLength(3);
    expect(s.races().map((r) => r.comparisons)).toEqual([2, 2, 2]);

    // the whole document, in one patch
    s.submitCandidate((t += 10), {
      author: 'p9', rationale: 'everything',
      patch: span(0, 0, 5, 'One rule for the whole club.'),
    });
    const one = s.races();
    expect(one).toHaveLength(1);              // they are all one race now
    expect(one[0]!.members).toHaveLength(4);
    expect(one[0]!.comparisons).toBe(6);      // and every vote still counts
    expect(s.judgments().every((j) => !j.locked)).toBe(true);
  });
});

describe('gap races: one incumbent id, and never one another’s judgments', () => {
  it('two gaps displace no text and share a ground — and a vote on one is not a vote on the other', () => {
    const s = open();
    const { id: g1 } = s.submitCandidate(1000, {
      author: 'p1', rationale: 'r', patch: gap(0, 1, 'A new clause here.') });
    const { id: g2 } = s.submitCandidate(1100, {
      author: 'p2', rationale: 'r', patch: gap(0, 3, 'A new clause there.') });
    const r1 = raceOf(s, g1);
    const r2 = raceOf(s, g2);
    expect(r1.id).not.toBe(r2.id);
    // **the gotcha, pinned** (Q1202): the incumbent is the hash of the text a
    // race displaces, and a pure insertion displaces none — so every gap
    // shares one id, and only the candidate ids tell the pairs apart
    expect(r1.incumbentId).toBe(r2.incumbentId);
    s.judge(2000, 'p3', g1, r1.incumbentId, 'a');
    expect(raceOf(s, g1).comparisons).toBe(1);
    expect(raceOf(s, g2).comparisons).toBe(0);
    expect(raceOf(s, g2).approvals).toBe(1); // p2's own preference, and nobody else's
    expect(raceOf(s, g1).approvals).toBe(2);
  });
});

describe('what a judgment may be cast against is unchanged', () => {
  it('only the race’s current incumbent id is accepted', () => {
    const s = open();
    const { id: a } = s.submitCandidate(1000, {
      author: 'p1', rationale: 'r', patch: span(0, 0, 1, 'Clause one is rewritten.') });
    const inc = raceOf(s, a).incumbentId;
    s.submitCandidate(2000, {
      author: 'p2', rationale: 'r', patch: span(0, 0, 3, 'One rule for the first three.') });
    // the narrow incumbent id is stale now: the card is refused
    expect(() => s.judge(3000, 'p3', a, inc, 'a')).toThrow(/stale card/);
    expect(s.judge(3000, 'p3', a, raceOf(s, a).incumbentId, 'a')).toBeDefined();
  });
});
