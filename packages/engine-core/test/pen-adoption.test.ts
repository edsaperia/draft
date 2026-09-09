/**
 * ✒️ on the Text (SPEC §9.7 rule 8, R-058; backlog entry 160): the Founder's
 * amendment passes the instant it is submitted. A direct adoption — no stake,
 * no race, no judgment — that rebases everything in flight through the *same*
 * loop an ordinary adoption uses, so a race on the same footprint is
 * **ground-shifted, not killed**.
 *
 * The four things this file exists to hold: the act lands from an author with
 * no seat and moves no ledger; a rival is rebased and still live; a rival
 * whose rebase conflicts goes to `rebase-pending` exactly as under an ordinary
 * adoption; and a log holding the new event replays bit for bit.
 */
import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
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
    rngSeed: 'pen-seed',
    tokenDripMinutes: 60,
    cooldownMs: 0,
    ...overrides,
  });
  return Session.open({ text: DOC, roster: roster(size), constitution }, 0);
}

/** Replace line `line` with `text` (single-hunk rewrite). */
const rewrite = (base: number, line: number, text: string) =>
  ({ baseVersion: base, hunks: [{ start: line, end: line + 1, lines: [text] }] });

/** Every roster ledger's balance, as one comparable object. */
const wallets = (s: Session, t: number) =>
  Object.fromEntries(roster(5).map((p) => [p.id, s.balance(p.id, t)]));

describe('✒️ on the Text: the direct adoption (R-058)', () => {
  it('lands from an author with no seat, and no ledger anywhere moves', () => {
    // the bar is out of reach, so nothing here can adopt the ordinary way and
    // the version bump can only be the decree's
    const s = openSession({ adoptionThresholdStart: 0.999, adoptionThresholdEnd: 0.999 });
    const v0 = s.currentVersion();
    const before = wallets(s, 100);
    // `ada-the-clerk` is on no roster: a clerk is a Founder who is not a
    // member and holds no engine participant at all (SPEC §9.6a)
    const { id } = s.decreeText(100, {
      author: 'ada-the-clerk',
      patch: rewrite(v0, 2, 'Decisions are made by the Founder.'),
      rationale: 'the room asked for one hand on the tiller',
    });
    expect(s.currentVersion()).toBe(v0 + 1);
    expect(s.document()).toContain('Decisions are made by the Founder.');
    expect(s.getCandidate(id).state).toBe('adopted');
    expect(s.getCandidate(id).stakePaid).toBe(0);
    expect(s.getCandidate(id).exit).toMatchObject({ cause: 'decreed', refund: 0 });
    // nothing was staked, so nothing is refunded — and no seat was charged
    expect(wallets(s, 101)).toEqual(before);
    expect(s.log.map((e) => e.event).some((e) => e.type === 'adopted')).toBe(false);
    expect(s.log.map((e) => e.event).some((e) => e.type === 'candidate-submitted')).toBe(false);
  });

  it('ground-shifts a live rival rather than killing it', () => {
    const s = openSession({ adoptionThresholdStart: 0.999, adoptionThresholdEnd: 0.999 });
    const v0 = s.currentVersion();
    // a member's proposal in flight on a *different* paragraph
    const { id: rival } = s.submitCandidate(50, {
      author: 'p2',
      patch: rewrite(v0, 3, 'Meetings happen monthly.'),
      rationale: 'a rhythm',
    });
    // the Founder amends the paragraph above it, which shifts nothing but the
    // ground under the rival's line numbers
    s.decreeText(100, {
      author: 'p1',
      patch: { baseVersion: v0, hunks: [{ start: 2, end: 3,
        lines: ['Decisions are made by the Founder.', 'And recorded.'] }] },
      rationale: 'two lines where there was one',
    });
    const events = s.log.map((e) => e.event);
    const rebased = events.find((e) => e.type === 'candidate-rebased' && e.id === rival);
    expect(rebased).toBeDefined();
    // never retired, never withdrawn, never gone from the field
    expect(s.getCandidate(rival).state).toBe('live');
    expect(s.getCandidate(rival).exit).toBeUndefined();
    expect(s.races().some((r) => r.members.includes(rival))).toBe(true);
    // and it now targets the version the decree produced
    expect(s.getCandidate(rival).patch!.baseVersion).toBe(v0 + 1);
    expect(events.some((e) => e.type === 'candidate-retired')).toBe(false);
  });

  it('a rival whose rebase genuinely conflicts goes to rebase-pending', () => {
    const s = openSession({ adoptionThresholdStart: 0.999, adoptionThresholdEnd: 0.999 });
    const v0 = s.currentVersion();
    const { id: rival } = s.submitCandidate(50, {
      author: 'p2',
      patch: rewrite(v0, 2, 'Decisions are made by a show of hands.'),
      rationale: 'hands',
    });
    // the same line, rewritten under it
    s.decreeText(100, {
      author: 'p1',
      patch: rewrite(v0, 2, 'Decisions are made by the Founder.'),
      rationale: 'mine',
    });
    expect(s.log.map((e) => e.event).some((e) => e.type === 'rebase-failed' && e.id === rival))
      .toBe(true);
    expect(s.getCandidate(rival).state).toBe('rebase-pending');
    // exactly as under an ordinary adoption: the author confirms against the
    // new text and the evidence resets (SPEC §2.4)
    s.confirmRebase(110, rival, rewrite(s.currentVersion(), 2, 'Decisions are by a show of hands.'));
    expect(s.getCandidate(rival).state).toBe('live');
  });

  it('replays bit for bit over a log holding the new event', () => {
    const s = openSession({ adoptionThresholdStart: 0.999, adoptionThresholdEnd: 0.999 });
    const v0 = s.currentVersion();
    const { id: rival } = s.submitCandidate(50, {
      author: 'p2', patch: rewrite(v0, 3, 'Meetings happen monthly.'), rationale: 'a rhythm',
    });
    const { id } = s.decreeText(100, {
      author: 'ada-the-clerk', patch: rewrite(v0, 2, 'Decisions are made by the Founder.'),
      rationale: 'because I say so',
    });
    const r = Session.replay(s.log);
    expect(r.rollingHash()).toBe(s.rollingHash());
    expect(r.document()).toBe(s.document());
    expect(r.currentVersion()).toBe(s.currentVersion());
    expect(r.getCandidate(id)).toEqual(s.getCandidate(id));
    expect(r.getCandidate(rival)).toEqual(s.getCandidate(rival));
    expect(wallets(r, 200)).toEqual(wallets(s, 200));
  });

  it('refuses what `submitCandidate` refuses about a patch, and a closed document', () => {
    const s = openSession();
    const v0 = s.currentVersion();
    expect(() => s.decreeText(100, { author: 'p1',
      patch: rewrite(v0 + 3, 2, 'x'), rationale: '' })).toThrow(/targets version/);
    expect(() => s.decreeText(100, { author: 'p1',
      patch: { baseVersion: v0, hunks: [] }, rationale: '' })).toThrow(/empty patch/);
    expect(() => s.decreeText(100, { author: 'p1',
      patch: rewrite(v0, 99, 'x'), rationale: '' })).toThrow();
    s.close(200);
    expect(() => s.decreeText(210, { author: 'p1',
      patch: rewrite(s.currentVersion(), 2, 'x'), rationale: '' })).toThrow();
  });

  /**
   * R-056's one-at-a-time rule reaching the second door (R-058). A parked
   * candidate is not `live`, so `rebaseOthers` skips it — and `assent`'s
   * accept would then apply a patch written against a version the decree had
   * moved. The refusal is the whole of the fix.
   */
  it('refuses while a candidate is parked awaiting assent', () => {
    const s = openSession({ textAssent: true }, 5);
    const v0 = s.currentVersion();
    const { id, raceId } = s.submitCandidate(50, {
      author: 'p2', patch: rewrite(v0, 2, 'Decisions are made by a show of hands.'),
      rationale: 'hands',
    });
    const race = s.races().find((r) => r.id === raceId)!;
    s.judge(60, 'p3', id, race.incumbentId, 'a');
    expect(s.getCandidate(id).state).toBe('awaiting-assent');
    expect(() => s.decreeText(80, { author: 'p1',
      patch: rewrite(s.currentVersion(), 3, 'Meetings happen monthly.'),
      rationale: 'while you were out' })).toThrow(/parked awaiting assent/);
    // answered, the door opens again and the decree lands on the new version
    s.assent(90, id, 'accept');
    const v1 = s.currentVersion();
    expect(() => s.decreeText(100, { author: 'p1',
      patch: rewrite(v1, 3, 'Meetings happen monthly.'), rationale: 'now' })).not.toThrow();
  });
});

/**
 * **Parks are per footprint** (SPEC §4.2, R-100; Ed, 2026-09-09, Q1179). Any
 * number of parks may stand at once so long as none overlaps another; a
 * leader whose span overlaps a standing park waits like anybody, live and
 * judgeable, and the view says so (`blockedByPark`); a park is rebased under
 * a neighbour's accept only across lines it does not touch, its words and
 * its recorded numbers unchanged.
 */
describe('🛡️ on the Text parks per footprint (R-100)', () => {
  const parksOf = (s: Session) => s.log.map((e) => e.event)
    .filter((e): e is Extract<Event, { type: 'candidate-awaiting-assent' }> =>
      e.type === 'candidate-awaiting-assent');
  const judgeFor = (s: Session, t: number, by: string, id: string, raceId: string | null) => {
    const race = s.races().find((r) => r.id === raceId)!;
    s.judge(t, by, id, race.incumbentId, 'a');
  };
  /**
   * Two non-overlapping races ready in **one** batch: the cooldown holds the
   * sweep after a first (unshielded) adoption sets the metronome, the shield
   * goes up, two proposals on different paragraphs are judged inside the
   * cooldown, and one `tick` releases both.
   */
  function twoReady() {
    const s = openSession({ cooldownMs: 1000 }, 5);
    const v0 = s.currentVersion();
    const first = s.submitCandidate(50, { author: 'p2',
      patch: rewrite(v0, 1, 'Membership is open to anyone who asks.'), rationale: 'asks' });
    judgeFor(s, 60, 'p3', first.id, first.raceId);
    expect(s.getCandidate(first.id).state).toBe('adopted'); // lastAdoptionT = 60
    s.amend(70, { textAssent: true });
    const v1 = s.currentVersion();
    // `a` grows its paragraph into two lines, so an accept shifts everything below it
    const a = s.submitCandidate(80, { author: 'p2',
      patch: { baseVersion: v1, hunks: [{ start: 2, end: 3,
        lines: ['Decisions are made by a show of hands.', 'Ties go to the chair.'] }] },
      rationale: 'hands' });
    const b = s.submitCandidate(85, { author: 'p4',
      patch: rewrite(v1, 3, 'Meetings happen monthly.'), rationale: 'monthly' });
    judgeFor(s, 90, 'p3', a.id, a.raceId);
    judgeFor(s, 95, 'p5', b.id, b.raceId);
    // inside the cooldown: both ready, neither parked yet
    expect(s.getCandidate(a.id).state).toBe('live');
    expect(s.getCandidate(b.id).state).toBe('live');
    return { s, a, b, v1 };
  }

  it('two non-overlapping leaders both park in one batch, each its own event', () => {
    const { s, a, b, v1 } = twoReady();
    s.tick(2000);
    expect(s.getCandidate(a.id).state).toBe('awaiting-assent');
    expect(s.getCandidate(b.id).state).toBe('awaiting-assent');
    const parks = parksOf(s);
    expect(parks.map((e) => e.id)).toEqual([a.id, b.id]);
    expect(parks.every((e) => e.t === 2000)).toBe(true);
    expect(parks[0]!.raceId).toBe(a.raceId);
    expect(parks[1]!.raceId).toBe(b.raceId);
    expect(parks[0]!.raceId).not.toBe(parks[1]!.raceId);
    // the document did not move, and neither park is in any race
    expect(s.currentVersion()).toBe(v1);
    expect(s.races()).toHaveLength(0);
  });

  it('accepting the first rebases the second across lines it does not touch — words unchanged — and it then accepts cleanly', () => {
    const { s, a, b } = twoReady();
    s.tick(2000);
    const before = s.getCandidate(b.id);
    const parkedNumbers = { ...before.awaiting! };
    const wordsBefore = before.patch!.hunks.map((h) => h.lines.slice());
    s.assent(3000, a.id, 'accept');
    const after = s.getCandidate(b.id);
    expect(after.state).toBe('awaiting-assent');
    expect(after.patch!.baseVersion).toBe(s.currentVersion());
    expect(after.patch!.hunks.map((h) => [h.start, h.end])).toEqual([[4, 5]]);
    expect(after.patch!.hunks.map((h) => h.lines)).toEqual(wordsBefore);
    expect(after.awaiting).toEqual(parkedNumbers);
    expect(after.footprint).toEqual([{ start: 4, end: 5 }]);
    s.assent(3100, b.id, 'accept');
    expect(s.getCandidate(b.id).state).toBe('adopted');
    expect(s.document().split('\n')).toEqual([
      '# Charter',
      'Membership is open to anyone who asks.',
      'Decisions are made by a show of hands.',
      'Ties go to the chair.',
      'Meetings happen monthly.',
    ]);
  });

  it('non-overlapping parks accept in either order', () => {
    const { s, a, b } = twoReady();
    s.tick(2000);
    s.assent(3000, b.id, 'accept');
    expect(s.getCandidate(a.id).state).toBe('awaiting-assent');
    expect(s.getCandidate(a.id).patch!.hunks.map((h) => [h.start, h.end])).toEqual([[2, 3]]);
    s.assent(3100, a.id, 'accept');
    expect(s.document()).toContain('Decisions are made by a show of hands.');
    expect(s.document()).toContain('Meetings happen monthly.');
  });

  it('an overlapping leader does not park: it stays live, blockedByPark, and parks once the standing park is refused', () => {
    const s = openSession({ textAssent: true }, 5);
    const v0 = s.currentVersion();
    const first = s.submitCandidate(50, { author: 'p2',
      patch: rewrite(v0, 2, 'Decisions are made by a show of hands.'), rationale: 'hands' });
    judgeFor(s, 60, 'p3', first.id, first.raceId);
    expect(s.getCandidate(first.id).state).toBe('awaiting-assent');
    // a rival on the same paragraph, against the same version (the park moved nothing)
    const rival = s.submitCandidate(70, { author: 'p4',
      patch: rewrite(v0, 2, 'Decisions are made by lot.'), rationale: 'lot' });
    expect(s.races().find((r) => r.id === rival.raceId)!.blockedByPark).toBe(false);
    judgeFor(s, 80, 'p5', rival.id, rival.raceId);
    // ready, and passed over: live, judgeable, in its race, and marked
    const c = s.getCandidate(rival.id);
    expect(c.state).toBe('live');
    const race = s.races().find((r) => r.id === rival.raceId)!;
    expect(race.blockedByPark).toBe(true);
    expect(parksOf(s).map((e) => e.id)).toEqual([first.id]);
    // refuse retires the park at refund 0 (unchanged), and the next batch parks the waiter
    const balance = s.balance('p2', 89);
    s.assent(90, first.id, 'refuse', 'no');
    expect(s.getCandidate(first.id).state).toBe('retired');
    expect(s.getCandidate(first.id).exit).toMatchObject({ refund: 0 });
    expect(s.balance('p2', 91)).toBe(balance);
    s.tick(100);
    expect(s.getCandidate(rival.id).state).toBe('awaiting-assent');
    expect(parksOf(s).map((e) => e.id)).toEqual([first.id, rival.id]);
  });

  it('an overlapping leader whose park is accepted is ground-shifted like anybody, never parked over the new text', () => {
    const s = openSession({ textAssent: true }, 5);
    const v0 = s.currentVersion();
    const first = s.submitCandidate(50, { author: 'p2',
      patch: rewrite(v0, 2, 'Decisions are made by a show of hands.'), rationale: 'hands' });
    judgeFor(s, 60, 'p3', first.id, first.raceId);
    const rival = s.submitCandidate(70, { author: 'p4',
      patch: rewrite(v0, 2, 'Decisions are made by lot.'), rationale: 'lot' });
    judgeFor(s, 80, 'p5', rival.id, rival.raceId);
    expect(s.races().find((r) => r.id === rival.raceId)!.blockedByPark).toBe(true);
    s.assent(90, first.id, 'accept');
    // the text it was written against is gone: rebase-pending (SPEC §2.4), not a park
    expect(s.getCandidate(rival.id).state).toBe('rebase-pending');
    s.tick(100);
    expect(parksOf(s).map((e) => e.id)).toEqual([first.id]);
  });

  it('a park is rebased under an ordinary adoption too, and nothing adopts across its span', () => {
    const s = openSession({ textAssent: true }, 5);
    const v0 = s.currentVersion();
    const park = s.submitCandidate(50, { author: 'p2',
      patch: rewrite(v0, 2, 'Decisions are made by a show of hands.'), rationale: 'hands' });
    judgeFor(s, 60, 'p3', park.id, park.raceId);
    expect(s.getCandidate(park.id).state).toBe('awaiting-assent');
    // the shield comes down with the park still standing: adoptions are direct again
    s.amend(70, { textAssent: false });
    const above = s.submitCandidate(80, { author: 'p4',
      patch: { baseVersion: v0, hunks: [{ start: 1, end: 2,
        lines: ['Membership is open to anyone.', 'Guests are welcome.'] }] }, rationale: 'guests' });
    const over = s.submitCandidate(85, { author: 'p5',
      patch: rewrite(v0, 2, 'Decisions are made by lot.'), rationale: 'lot' });
    judgeFor(s, 90, 'p3', above.id, above.raceId);
    // the paragraph above grew: adopted, and the park moved down one line with its words intact
    expect(s.getCandidate(above.id).state).toBe('adopted');
    const p = s.getCandidate(park.id);
    expect(p.state).toBe('awaiting-assent');
    expect(p.patch!.hunks).toEqual([{ start: 3, end: 4, lines: ['Decisions are made by a show of hands.'] }]);
    expect(p.patch!.baseVersion).toBe(s.currentVersion());
    // the rival over the parked span is ready and blocked — no shield needed for the rule to bite
    judgeFor(s, 95, 'p4', over.id, over.raceId);
    expect(s.getCandidate(over.id).state).toBe('live');
    expect(s.races().find((r) => r.id === over.raceId)!.blockedByPark).toBe(true);
    expect(s.document()).not.toContain('by lot');
    s.assent(100, park.id, 'accept');
    expect(s.document().split('\n')[3]).toBe('Decisions are made by a show of hands.');
  });

  it('replays bit for bit with several parks standing', () => {
    const { s } = twoReady();
    s.tick(2000);
    const r = Session.replay(s.log);
    expect(r.rollingHash()).toBe(s.rollingHash());
    expect(r.races()).toEqual(s.races());
  });
});
