import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { buildConstituted } from './helpers.js';

describe('lapsing (§9.5a): absence read by the clock', () => {
  it('warns, lapses, and revival is just logging in again', () => {
    const HOUR = 3_600_000;
    // a three-hour spell: the hour's warning is the one that fits (R-097)
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 3 * HOUR }, endsAtMs: 10 * HOUR });
    // keep ada and bo active late; cy goes quiet after t=2
    s.setIdentity(2 * HOUR + 1, 'ada', { name: 'Ada' });
    s.setIdentity(2 * HOUR + 1, bo, { name: 'Bo' });
    s.tick(2 * HOUR + 30_000); // cy quiet since t≈1: the hour's point has passed
    expect(s.memberRecords().get(cy)!.lapseWarned).toBe(true);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
    s.tick(3 * HOUR + 30_000); // past the consented quiet spell
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
    expect(s.E()).toBe(2); // a lapsed member leaves E entirely (v0.48)
    s.memberReturn(3 * HOUR + 60_000, cy); // revival needs no motion — the rule was consented
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
    expect(s.E()).toBe(3);
  });

  // **Seeing is presence** (Ed, 2026-09-08, Q1284's follow-up): a lapsed
  // member who opens the document is returned by the read itself — *if they
  // were seeing things they wouldn't be lapsed* — so a live cookie never
  // shows the room to somebody the room is not counting. The same for the
  // crown, which lapses like a member (§9.7 rule 6).
  it('a read returns a lapsed member, and a lapsed crown', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    s.setIdentity(9_000, 'ada', { name: 'Ada' });
    s.setIdentity(9_000, bo, { name: 'Bo' });
    s.tick(10_500);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
    expect(s.E()).toBe(2);
    expect(s.seen(11_000, cy)).toBe(true); // something to commit: the return
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
    expect(s.memberRecords().get(cy)!.lapseWarned).toBe(false);
    expect(s.E()).toBe(3);
    expect(s.seen(11_001, cy)).toBe(false); // and then the hourly stamp as ever
    const r = ConstitutionSession.replay([...s.logEntries()]);
    expect(r.memberRecords().get(cy)!.lapsed).toBe(false);
    expect(r.rollingHash()).toBe(s.rollingHash());
  });

  it('never means no clock runs at all', () => {
    const { s, cy } = buildConstituted(); // lapse: never
    s.tick(50_000_000);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
    expect(s.E()).toBe(3);
  });

  // **Lapse is a reading of the rule, re-read when the rule changes** (entry
  // 97): a lapsed member is in that status by no act of their own, so a rule
  // that no longer puts them there returns them at once.
  it('💤 turned off returns every lapsed member at once — no status a rule cannot produce', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    s.setIdentity(9_000, 'ada', { name: 'Ada' });
    s.setIdentity(9_000, bo, { name: 'Bo' });
    s.tick(10_500);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
    expect(s.E()).toBe(2);
    s.setSetting(11_000, 'lapse', { afterMs: null }); // the crown's pen
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
    expect(s.E()).toBe(3);
    s.tick(50_000_000); // and nothing lapses them again
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
  });

  it('a longer spell returns whoever now falls within it; a shorter one waits for the clock', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    s.setIdentity(9_000, 'ada', { name: 'Ada' });
    s.setIdentity(9_000, bo, { name: 'Bo' });
    s.tick(10_500);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
    s.setSetting(11_000, 'lapse', { afterMs: 100_000 }); // cy's quiet is now well within the spell
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
    expect(s.memberRecords().get(cy)!.lapseWarned).toBe(false);
    expect(s.E()).toBe(3);
    // shortening moves nobody at the change — the next sweep does, as ever
    s.setSetting(12_000, 'lapse', { afterMs: 5_000 });
    expect(s.E()).toBe(3);
    s.tick(20_000); // cy returned at 11_000 and has been quiet since
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
  });

  it('a lapsed member leaving can complete a motion, like any departure', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    s.answerMotion(9_000, 'ada', m, 'accept');
    s.answerMotion(9_500, bo, m, 'accept'); // cy silent since t≈1
    expect(s.motionRecords().get(m)!.status).toBe('running');
    s.tick(12_000); // cy lapses out of the electorate
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    // and cy, who had no say, is owed the decision on their return
    expect(s.memberRecords().get(cy)!.okOwed.has('bar')).toBe(true);
  });
});

describe('the 👑 marks any reservation (Q379 wide)', () => {
  it('reads holdership, not the membership — and a sleeping crown keeps it', () => {
    const { s } = buildConstituted(); // membership is the members' here…
    expect(s.membershipReserved()).toBe(false);
    expect(s.crowned()).toBe(true); // …but the title and link are still ada's
  });
});

describe('the invite door holds its own pair (entry 94; was 🤝’s, §9.7 v0.52)', () => {
  it('handing ✉️ over shuts the direct door; handing 🤝 over does not touch it', () => {
    const { s } = buildConstituted({ applications: { apply: false },
      doors: { invite: { unilateral: true, assent: true } } });
    expect(s.doorPen('door:invite')).toBe(true);
    s.invite(3, 'dee@example.org'); // the crown invites unilaterally (§9.7)
    s.delegate(4, 'applications');   // the policy's pair goes…
    expect(s.settingState('applications').holder).toBe('members');
    expect(s.doorPen('door:invite')).toBe(true); // …and the door's stays
    s.delegate(5, 'door:invite');
    expect(s.doorPen('door:invite')).toBe(false);
    expect(s.settingState('door:invite').holder).toBe('members');
    expect(() => s.invite(6, 'em@example.org')).toThrow(/motion at 🪪/);
  });
});

describe('the crown lapses like a member (§9.7 v0.49): automatic assent', () => {
  it('a quiet clerk-crown lapses; pending 👑 questions pass; nothing changes hands; return revives', () => {
    // a three-hour spell, so the hour's warning is the one that fits (R-097);
    // every clock time below rides on H
    const H = 3 * 3_600_000;
    const { s, bo, cy } = buildConstituted({ clerk: true, lapse: { afterMs: H }, endsAtMs: 4 * H });
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'rate',
      value: { grant: 6, cap: 10, dripMinutes: 120 } });
    s.adjudicateOrdinaryMotion(4, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    // keep the members active; the convenor stays silent after t=2
    s.setIdentity(H - 3_600_000 + 1, bo, { name: 'Bo' });
    s.setIdentity(H - 3_600_000 + 1, cy, { name: 'Cy' });
    s.tick(H - 3_600_000 + 30_000); // past the hour's point
    expect(s.convenorRecord().lapseWarned).toBe(true); // warned by email first
    s.tick(H + 12_500);
    expect(s.crownLapsed).toBe(true);
    // lapse is automatic abstention, and on an assent, abstaining is granting
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    // and the record says which nobody passed it (Q1033): the lapse, not a vacancy
    expect(s.crownQuestionRecords().get('cq-1')!.autoPassedBy).toBe('lapse');
    expect(s.settingState('rate').value).toEqual({ grant: 6, cap: 10, dripMinutes: 120 });
    expect(s.settingState('title').holder).toBe('convenor'); // nothing changes hands (v0.49)
    expect(() => s.answerCrownQuestion(H + 13_000, 'cq-1', 'reject')).toThrow(); // passed already
    // while the crown sleeps, a members-passed change on a reserved setting
    // applies as if accepted
    const m2 = s.openMotion(H + 13_500, bo, { kind: 'set', setting: 'title',
      value: { text: 'The Hollow Oak Charter' } });
    s.adjudicateOrdinaryMotion(H + 14_000, m2, 'carried');
    expect(s.motionRecords().get(m2)!.status).toBe('carried');
    expect(s.titleOf).toBe('The Hollow Oak Charter');
    // revival is logging in: the assent requirement resumes from that moment
    s.memberReturn(H + 15_000, 'ada');
    expect(s.crownLapsed).toBe(false);
    const m3 = s.openMotion(H + 15_500, bo, { kind: 'set', setting: 'rate',
      value: { grant: 5, cap: 9, dripMinutes: 180 } });
    s.adjudicateOrdinaryMotion(H + 16_000, m3, 'carried');
    expect(s.motionRecords().get(m3)!.status).toBe('awaiting-crown');
  });
});

describe('replay sweep: the whole lifecycle re-folds bit-identically', () => {
  it('founding → motions → lapse → revival', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'chamber',
      value: { rung: 'closed' } });
    s.answerMotion(4, 'ada', m, 'accept');
    s.answerMotion(5, bo, m, 'accept');
    s.answerMotion(6, cy, m, 'keep');
    expect(s.motionRecords().get(m)!.status).toBe('running'); // one keep blocks
    // keep ada and bo active; cy goes quiet after their keep
    s.setIdentity(9_000, 'ada', { name: 'Ada' });
    s.setIdentity(9_000, bo, { name: 'Bo' });
    // a lapsed member's standing keep leaves with them: the electorate is E,
    // evaluated live (§9.5, §9.5a, R-088), and a lapsed member is outside it
    s.tick(12_000);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.canJudge()).toBe(true); // nothing stops: there is no freeze
    s.memberReturn(13_000, cy); // revival is logging in again
    expect(s.E()).toBe(3);
    const r = ConstitutionSession.replay([...s.logEntries()]);
    expect(r.rollingHash()).toBe(s.rollingHash());
    expect(r.E()).toBe(s.E());
    expect(r.canJudge()).toBe(s.canJudge());
    expect(r.motionRecords().get(m)!.status).toBe(s.motionRecords().get(m)!.status);
    expect(r.memberRecords().get(cy)!.lapsed).toBe(s.memberRecords().get(cy)!.lapsed);
  });
});
