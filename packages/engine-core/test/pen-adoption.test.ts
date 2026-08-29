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
