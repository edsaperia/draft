import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { buildConstituted } from './helpers.js';

describe('signing out and the freeze (§9.5)', () => {
  it('holding stays in the base; abstaining leaves it; the line freezes the document', () => {
    const { s, bo, cy } = buildConstituted(); // share 60 of E=3 → quorum 2
    s.signOut(3, 'ada', 'holding');
    expect(s.quorumBase()).toBe(3); // holding: I do not consent to you finishing without me
    expect(s.frozen).toBe(false);
    s.signOut(4, cy, 'abstaining');
    expect(s.quorumBase()).toBe(2); // abstaining: I trust you to finish up
    expect(s.frozen).toBe(false);   // 2 ≥ 2
    s.signOut(5, bo, 'abstaining');
    expect(s.frozen).toBe(true);    // 1 < 2: a stall with an alarm, not a death
    expect(s.canJudge()).toBe(false);
    s.memberReturn(6, bo);          // it thaws if enough return
    expect(s.frozen).toBe(false);
    expect(s.canJudge()).toBe(true);
  });

  it('an abstainer leaving the electorate can complete a motion', () => {
    const { s, bo, cy } = buildConstituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    s.answerMotion(4, 'ada', m, 'accept');
    s.answerMotion(5, bo, m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('running'); // cy silent
    s.signOut(6, cy, 'abstaining');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
  });

  it('judgments cast keep counting after sign-out — the base is never the active remainder', () => {
    const { s, cy } = buildConstituted();
    // the rule lives in populations: the base is E minus abstainers, so a
    // holding walkout is visible and the last two members cannot adopt anything
    s.signOut(3, cy, 'holding');
    expect(s.quorumBase()).toBe(3);
    expect(s.E()).toBe(3);
  });
});

describe('lapsing (§9.5a): sign-out applied by clock', () => {
  it('warns, lapses, and revival is just logging in again', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    // keep ada and bo active late; cy goes quiet after t=2
    s.setIdentity(9_000, 'ada', { name: 'Ada' });
    s.setIdentity(9_000, bo, { name: 'Bo' });
    s.tick(9_600); // cy quiet since t≈1: warn point (75%) long passed
    expect(s.memberRecords().get(cy)!.lapseWarned).toBe(true);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
    s.tick(10_500); // past the consented quiet spell
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
    expect(s.E()).toBe(2); // a lapsed member leaves E entirely (v0.48)
    s.memberReturn(11_000, cy); // revival needs no motion — the rule was consented
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
    expect(s.E()).toBe(3);
  });

  it('never means no clock runs at all', () => {
    const { s, cy } = buildConstituted(); // lapse: never
    s.tick(50_000_000);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
    expect(s.E()).toBe(3);
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
    const { s, bo, cy } = buildConstituted({ clerk: true, lapse: { afterMs: 10_000 } });
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'rate',
      value: { grant: 6, cap: 10, dripMinutes: 120 } });
    s.adjudicateOrdinaryMotion(4, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    // keep the members active; the convenor stays silent after t=2
    s.setIdentity(9_000, bo, { name: 'Bo' });
    s.setIdentity(9_000, cy, { name: 'Cy' });
    s.tick(9_700);
    expect(s.convenorRecord().lapseWarned).toBe(true); // warned by email first
    s.tick(12_500);
    expect(s.crownLapsed).toBe(true);
    // lapse is automatic abstention, and on an assent, abstaining is granting
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.settingState('rate').value).toEqual({ grant: 6, cap: 10, dripMinutes: 120 });
    expect(s.settingState('title').holder).toBe('convenor'); // nothing changes hands (v0.49)
    expect(() => s.answerCrownQuestion(13_000, 'cq-1', 'reject')).toThrow(); // passed already
    // while the crown sleeps, a members-passed change on a reserved setting
    // applies as if accepted
    const m2 = s.openMotion(13_500, bo, { kind: 'set', setting: 'title',
      value: { text: 'The Hollow Oak Charter' } });
    s.adjudicateOrdinaryMotion(14_000, m2, 'carried');
    expect(s.motionRecords().get(m2)!.status).toBe('carried');
    expect(s.titleOf).toBe('The Hollow Oak Charter');
    // revival is logging in: the assent requirement resumes from that moment
    s.memberReturn(15_000, 'ada');
    expect(s.crownLapsed).toBe(false);
    const m3 = s.openMotion(15_500, bo, { kind: 'set', setting: 'rate',
      value: { grant: 5, cap: 9, dripMinutes: 180 } });
    s.adjudicateOrdinaryMotion(16_000, m3, 'carried');
    expect(s.motionRecords().get(m3)!.status).toBe('awaiting-crown');
  });
});

describe('replay sweep: the whole lifecycle re-folds bit-identically', () => {
  it('founding → motions → sign-out → lapse → revival', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'chamber',
      value: { rung: 'closed' } });
    s.answerMotion(4, 'ada', m, 'accept');
    s.answerMotion(5, bo, m, 'accept');
    s.answerMotion(6, cy, m, 'keep');
    // a document-abstainer's standing keep leaves with them: abstaining is
    // "I trust you to finish up", and the electorate is live (NOTES.md)
    s.signOut(7, cy, 'abstaining');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    s.tick(15_000);
    const r = ConstitutionSession.replay([...s.logEntries()]);
    expect(r.rollingHash()).toBe(s.rollingHash());
    expect(r.E()).toBe(s.E());
    expect(r.frozen).toBe(s.frozen);
    expect(r.motionRecords().get(m)!.status).toBe(s.motionRecords().get(m)!.status);
    expect(r.quorumBase()).toBe(s.quorumBase());
  });
});
