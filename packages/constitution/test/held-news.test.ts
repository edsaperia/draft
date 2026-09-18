import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import type { ConstitutionEvent } from '../src/types.js';
import { view } from '../src/view.js';
import { LAPSE_MIN_MS } from '../src/values.js';
import { buildConstituted } from './helpers.js';

/** The shortest spell a room can state (Q1453): five minutes. */
const SPELL = LAPSE_MIN_MS;

/**
 * **A failed motion tells its mover** (Ed, 2026-09-17 23:45, Q1447: *someone
 * that proposes a motion should get an acknowledgement task if it fails*;
 * SURFACE E41, SPEC §9.6a, R-130).
 *
 * The acknowledgement family's sixth kind, and the one whose audience is one
 * person. What is asserted here is the audience on every road to a failure,
 * the three roads that are **not** failures, the OK, and that the pair of
 * events folds and replays like every other.
 */

/** Every `held-owed` in the log, as `[motion, member]`. */
const owings = (s: ConstitutionSession): Array<[string, string]> =>
  s.logEntries().map((e) => e.event)
    .filter((e): e is Extract<ConstitutionEvent, { type: 'held-owed' }> =>
      e.type === 'held-owed')
    .map((e) => [e.motion, e.member]);

describe('a failed motion is owed to its mover (Q1447, SURFACE E41)', () => {
  it('an ordinary motion held by the race owes exactly one, to the mover', () => {
    const { s, bo, cy } = buildConstituted();
    // moving the close is ordinary (Q329), and ending is the members' here
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'ending',
      value: { endsAtMs: 2_000_000 } });
    expect(owings(s)).toEqual([]);
    s.adjudicateOrdinaryMotion(4, m, 'held');
    expect(s.motionRecords().get(m)!.status).toBe('held');
    expect(view(s, bo).motions.find((x) => x.id === m)!.heldBy).toBe('members');
    // one owing, to the mover and to nobody else
    expect(owings(s)).toEqual([[m, bo]]);
    expect(s.memberRecords().get(bo)!.heldOwed).toEqual(new Set([m]));
    expect(s.memberRecords().get(cy)!.heldOwed.size).toBe(0);
    expect(s.memberRecords().get('ada')!.heldOwed.size).toBe(0);
    // and the view serves it to the mover alone
    expect(view(s, bo).owedHeld).toEqual([m]);
    expect(view(s, cy).owedHeld).toEqual([]);
    expect(view(s, 'ada').owedHeld).toEqual([]);
  });

  it("the Founder's 🛡️ refusing a carried motion owes the mover", () => {
    // the title is the convenor's, so a carried motion on it parks at the
    // crown (§9.7) and the Founder's answer is what fails it
    const { s, bo } = buildConstituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'title',
      value: { text: 'The Hollow Oak Charter' } });
    s.adjudicateOrdinaryMotion(4, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    expect(owings(s)).toEqual([]);
    const q = [...s.crownQuestionRecords().values()].find((x) => x.motion === m)!;
    s.answerCrownQuestion(5, q.id, 'reject');
    expect(s.motionRecords().get(m)!.status).toBe('held');
    expect(owings(s)).toEqual([[m, bo]]);
    expect(view(s, bo).owedHeld).toEqual([m]);
    // the card says *refused*, not *rejected* (STYLE T8), and `status` alone
    // cannot tell the two apart — `heldBy` is what the page reads for it
    expect(view(s, bo).motions.find((x) => x.id === m)!.heldBy).toBe('crown');
  });

  it("the system's own withdrawal owes the mover — the mover's does not", () => {
    const { s, bo } = buildConstituted();
    const mine = s.openMotion(3, bo, { kind: 'set', setting: 'ending',
      value: { endsAtMs: 2_000_000 } });
    s.withdrawMotion(4, bo, mine);
    expect(s.motionRecords().get(mine)!.status).toBe('withdrawn');
    // letting go of your own proposal is not news to you
    expect(owings(s)).toEqual([]);

    // the host could not enter the race (#26): the mover pressed and nothing
    // happened, which is the silence the ruling is about
    const theirs = s.openMotion(5, bo, { kind: 'set', setting: 'ending',
      value: { endsAtMs: 3_000_000 } });
    s.abandonMotion(6, theirs);
    expect(s.motionRecords().get(theirs)!.status).toBe('withdrawn');
    expect(owings(s)).toEqual([[theirs, bo]]);
    // both withdrawals read `system` — the module emits one event for either,
    // and `owedHeld` is what tells the host's apart from the mover's own
    expect(view(s, bo).motions.find((x) => x.id === theirs)!.heldBy).toBe('system');
    expect(view(s, bo).owedHeld).toEqual([theirs]);
  });

  it('a carried motion owes nobody a rejection', () => {
    const { s, bo } = buildConstituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'ending',
      value: { endsAtMs: 2_000_000 } });
    s.adjudicateOrdinaryMotion(4, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(owings(s)).toEqual([]);
  });

  it('kept-at-close owes nobody — the 🥂 card is what speaks at the close', () => {
    const { s, bo } = buildConstituted();
    // 🌍 is constitutional, so this settles by unanimity and cy never answers
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'chamber',
      value: { rung: 'closed' } });
    expect(s.motionRecords().get(m)!.status).toBe('running');
    s.close(9);
    expect(s.motionRecords().get(m)!.status).toBe('kept-at-close');
    expect(owings(s)).toEqual([]);
    expect(s.memberRecords().get(bo)!.heldOwed.size).toBe(0);
  });

  it('a refused application owes nobody — it has no mover, and reads *refused*', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'proposal' } });
    const ap = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, ap);
    s.submitApplication(5, ap);
    const m = s.applicantRecords().get(ap)!.motion!;
    expect(s.motionRecords().get(m)!.by).toBe(null);
    s.adjudicateOrdinaryMotion(6, m, 'held');
    expect(s.applicantRecords().get(ap)!.status).toBe('refused');
    expect(owings(s)).toEqual([]);
  });
});

describe('the OK on a failed motion', () => {
  it('clears it in one press, and a second press is silently nothing', () => {
    const { s, bo, cy } = buildConstituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'ending',
      value: { endsAtMs: 2_000_000 } });
    s.adjudicateOrdinaryMotion(4, m, 'held');
    s.ackHeld(5, bo, m);
    expect(s.memberRecords().get(bo)!.heldOwed.size).toBe(0);
    expect(s.memberRecords().get(bo)!.heldGiven).toEqual(new Set([m]));
    expect(view(s, bo).owedHeld).toEqual([]);
    const at = s.logEntries().length;
    // `ackRelease`'s posture: nothing owed, nothing refused, nothing written
    s.ackHeld(6, bo, m);
    s.ackHeld(6, cy, m); // somebody else's motion is not theirs to acknowledge
    expect(s.logEntries().length).toBe(at);
    expect(() => s.ackHeld(6, 'nobody', m)).toThrow(/unknown member/);
  });

  it('is refused on a shut document, as every acknowledgement is', () => {
    const { s, bo } = buildConstituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'ending',
      value: { endsAtMs: 2_000_000 } });
    s.adjudicateOrdinaryMotion(4, m, 'held');
    s.close(9);
    expect(() => s.ackHeld(10, bo, m)).toThrow();
  });
});

describe('who the mover has to be', () => {
  it('a removed mover is owed nothing; the survivors are owed nothing either', () => {
    // ❌ kept at 🍾, so the convenor can exile the mover at will
    const { s, bo, cy } = buildConstituted({
      doors: { remove: { unilateral: true, assent: false } } });
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'ending',
      value: { endsAtMs: 2_000_000 } });
    s.remove(4, bo); // ❌, the convenor's own act
    s.adjudicateOrdinaryMotion(5, m, 'held');
    expect(owings(s)).toEqual([]);
    expect(s.memberRecords().get(cy)!.heldOwed.size).toBe(0);
  });

  it('a lapsed mover is owed it — lapse is a stall, not a departure', () => {
    const { s, bo } = buildConstituted({ lapse: { afterMs: SPELL } });
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'ending',
      value: { endsAtMs: 2_000_000 } });
    s.tick(2 * SPELL);
    expect(s.memberRecords().get(bo)!.lapsed).toBe(true);
    s.adjudicateOrdinaryMotion(2 * SPELL + 1, m, 'held');
    expect(owings(s)).toEqual([[m, bo]]);
    expect(view(s, bo).owedHeld).toEqual([m]);
  });

  it("the founder's own failed motion is owed to them like anybody's", () => {
    // the doors are laid down at 🍾 here, so ❌ is a motion even for ada
    const { s, cy } = buildConstituted({ removal: { price: 'proposal' } });
    const m = s.openMotion(3, 'ada', { kind: 'remove', member: cy });
    s.adjudicateOrdinaryMotion(4, m, 'held');
    expect(owings(s)).toEqual([[m, 'ada']]);
    expect(view(s, 'ada').owedHeld).toEqual([m]);
  });
});

describe('the pair folds and replays like every other event', () => {
  it('replays to the same hash and the same owed set', () => {
    const { s, bo } = buildConstituted();
    const m1 = s.openMotion(3, bo, { kind: 'set', setting: 'ending',
      value: { endsAtMs: 2_000_000 } });
    s.adjudicateOrdinaryMotion(4, m1, 'held');
    const m2 = s.openMotion(5, bo, { kind: 'set', setting: 'ending',
      value: { endsAtMs: 3_000_000 } });
    s.adjudicateOrdinaryMotion(6, m2, 'held');
    s.ackHeld(7, bo, m1);
    const again = ConstitutionSession.replay([...s.logEntries()], s.people);
    expect(again.logEntries().at(-1)!.hash).toBe(s.logEntries().at(-1)!.hash);
    expect(again.memberRecords().get(bo)!.heldOwed).toEqual(new Set([m2]));
    expect(again.memberRecords().get(bo)!.heldGiven).toEqual(new Set([m1]));
    // oldest first, as every owed list in the view is
    expect(view(again, bo).owedHeld).toEqual([m2]);
  });
});
