/**
 * Q440 and Q506 (2026-08-21): the Text is a held setting like any other,
 * and 🤝 Applications keeps its crown pair on the setting rather than
 * inside its value.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { view } from '../src/view.js';
import { buildConstituted, reserveTextShield } from './helpers.js';

const openDoc = () => ConstitutionSession.open({
  title: 'Hollow Oak Club Charter', slug: 'hollow-oak',
  convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
}, 0);

describe('the Text carries a crown pair (Q440)', () => {
  it('both powers are the founder’s from creation, and the Text is never set', () => {
    const s = openDoc();
    expect(s.settingState('startingText').powers).toEqual({ unilateral: true, assent: true });
    expect(s.settingState('startingText').holder).toBe('convenor');
    expect(() => s.setSetting(1, 'startingText', { text: 'x' })).toThrow(/drafting/);
  });

  it('assent goes from creation; the pen waits for proposing to open; reclaim restores pre-start', () => {
    const s = openDoc();
    expect(() => s.relinquish(1, 'startingText', 'unilateral')).toThrow(/proposing opens/);
    s.relinquish(1, 'startingText', 'assent');
    expect(s.settingState('startingText').powers).toEqual({ unilateral: true, assent: false });
    s.confirmStartingText(2, 'The clubhouse shall be kept open.');
    s.relinquish(3, 'startingText', 'unilateral');
    expect(s.settingState('startingText').holder).toBe('members');
    s.reclaim(4, 'startingText');
    expect(s.settingState('startingText').powers).toEqual({ unilateral: true, assent: true });
    expect(s.text).toBe('The clubhouse shall be kept open.'); // reclaim touches no value
  });

  it('the start lays the founder’s hand off the Text (🍾); a reserve motion is the road back', () => {
    const { s, bo, cy } = buildConstituted();
    // the start lays both powers down, derived at the fold — no event
    expect(s.settingState('startingText').powers).toEqual({ unilateral: false, assent: false });
    for (const id of ['title', 'link', 'pace', 'rate', 'machines', 'quorum', 'authorship',
      'judgments', 'applications', 'removal', 'lapse'] as const) {
      s.delegate(3, id);
    }
    expect(s.crowned()).toBe(false); // nothing held anywhere, the Text included
    expect(() => s.openMotion(4, bo, { kind: 'set', setting: 'startingText',
      value: { text: 'x' } })).toThrow(/not moved this way/);
    const m = s.openMotion(4, bo, { kind: 'reserve', setting: 'startingText', power: 'assent' });
    s.answerMotion(5, 'ada', m, 'accept');
    s.answerMotion(6, cy, m, 'accept');
    expect(s.settingState('startingText').powers).toEqual({ unilateral: false, assent: true });
    expect(s.crowned()).toBe(true);
  });

  it('the view serves the Text’s powers like any setting’s, with no managed value', () => {
    const { s, bo } = buildConstituted();
    const row = view(s, bo).settings.find((x) => x.setting === 'startingText')!;
    expect(row.powers).toEqual({ unilateral: false, assent: false }); // post-start: laid down at 🍾
    const pre = openDoc();
    expect(view(pre, 'ada').settings.find((x) => x.setting === 'startingText')!.powers)
      .toEqual({ unilateral: true, assent: true }); // pre-start: both the founder's
    expect(row.value).toBeNull();
    expect(view(s, bo).questions.some((q) => q.setting === 'startingText')).toBe(false);
  });
});

describe('🛡️ on the Text: an adoption waits on the founder’s accept (Q440)', () => {
  it('opens a 👑 question the host reads; accept and reject are recorded', () => {
    const { s, bo, cy } = buildConstituted();
    expect(s.textAdoptionNeedsAssent()).toBe(false); // the start laid the shield down
    reserveTextShield(s, bo, ['ada', cy], 2); // the room hands it back
    expect(s.textAdoptionNeedsAssent()).toBe(true);
    const q = s.openTextCrownQuestion(3, { candidateId: 'c1', summary: 'keeps the clubhouse open' });
    const rec = s.crownQuestionRecords().get(q)!;
    expect(rec.motion).toBeNull();
    expect(rec.text).toEqual({ candidateId: 'c1', summary: 'keeps the clubhouse open' });
    expect(rec.status).toBe('pending');
    expect(view(s, 'ada').crownTasks).toEqual([{ id: q, motion: null,
      text: { candidateId: 'c1', summary: 'keeps the clubhouse open' } }]);
    expect(() => s.openTextCrownQuestion(3, { candidateId: 'c1', summary: 'again' }))
      .toThrow(/already awaits/);
    s.answerCrownQuestion(4, q, 'accept');
    expect(s.crownQuestionRecords().get(q)!.status).toBe('accepted');
    const q2 = s.openTextCrownQuestion(5, { candidateId: 'c2', summary: 'closes it' });
    s.answerCrownQuestion(6, q2, 'reject');
    expect(s.crownQuestionRecords().get(q2)!.status).toBe('rejected');
    // no motion was parked: the one motion on record is the reserve that handed the shield back
    expect([...s.motionRecords().values()].filter((m) => m.status === 'awaiting-crown')).toHaveLength(0);
  });

  it('without the shield — the post-start default — the adoption stands by itself', () => {
    const { s } = buildConstituted();
    expect(s.textAdoptionNeedsAssent()).toBe(false);
    expect(() => s.openTextCrownQuestion(3, { candidateId: 'c1', summary: 'x' }))
      .toThrow(/no assent/);
  });

  it('a sleeping crown grants: lapse auto-passes a pending text question', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 100 } });
    reserveTextShield(s, bo, ['ada', cy], 2);
    const q = s.openTextCrownQuestion(3, { candidateId: 'c1', summary: 'x' });
    s.tick(3 + 1000);
    expect(s.crownLapsed).toBe(true);
    expect(s.crownQuestionRecords().get(q)!.status).toBe('auto-passed');
    expect(s.textAdoptionNeedsAssent()).toBe(false);
    s.memberReturn(3 + 1001, 'ada');
    expect(s.textAdoptionNeedsAssent()).toBe(true);
  });

  it('replays a log holding a text question bit-identically', () => {
    const { s, bo, cy } = buildConstituted();
    reserveTextShield(s, bo, ['ada', cy], 2);
    const q = s.openTextCrownQuestion(3, { candidateId: 'c1', summary: 'x' });
    s.answerCrownQuestion(4, q, 'accept');
    const r = ConstitutionSession.replay([...s.logEntries()]);
    expect(r.rollingHash()).toBe(s.rollingHash());
    expect(r.crownQuestionRecords().get(q)).toEqual(s.crownQuestionRecords().get(q));
  });
});

describe('🤝 keeps its crown pair on the setting (Q506)', () => {
  it('a legacy value’s holder folds onto the powers and leaves the value', () => {
    const { s } = buildConstituted({
      applications: { holder: 'reserved-unilateral', joinPolicy: 'invite' } });
    expect(s.settingState('applications').value).toEqual({ joinPolicy: 'invite' });
    expect(s.settingState('applications').powers).toEqual({ unilateral: true, assent: false });
    expect(s.registerPowers()).toEqual({ unilateral: true, assent: false });
    expect(s.membershipReserved()).toBe(true);
    const bo = view(s, 'bo');
    expect(bo.register.powers).toEqual({ unilateral: true, assent: false });
    expect(bo.settings.find((x) => x.setting === 'applications')!.powers)
      .toEqual({ unilateral: true, assent: false });
  });

  it('new style: the policy is the value and the pair changes like any setting’s', () => {
    const { s, bo, cy } = buildConstituted({ applications: { joinPolicy: 'invite' } });
    // buildConstituted reclaims before it sets, so both powers are held
    expect(s.registerPowers()).toEqual({ unilateral: true, assent: true });
    s.invite(3, 'dee@example.org'); // the pen on the register: a direct invitation
    s.relinquish(3, 'applications', 'unilateral');
    expect(() => s.invite(4, 'eve@example.org')).toThrow(/constitutional motion/);
    s.relinquish(4, 'applications', 'assent');
    expect(s.membershipReserved()).toBe(false);
    // the road back is a reserve motion on the setting itself
    const m = s.openMotion(5, bo, { kind: 'reserve', setting: 'applications' });
    s.answerMotion(6, 'ada', m, 'accept');
    s.answerMotion(7, cy, m, 'accept');
    expect(s.registerPowers()).toEqual({ unilateral: true, assent: true });
  });

  it('an old log and a fresh session reach the same state', () => {
    const legacy = buildConstituted({
      applications: { holder: 'reserved-assent', joinPolicy: 'apply' } }).s;
    const replayed = ConstitutionSession.replay([...legacy.logEntries()]);
    const fresh = buildConstituted({ applications: { joinPolicy: 'apply' } }).s;
    fresh.relinquish(3, 'applications', 'unilateral');
    const pick = (x: ConstitutionSession) => {
      const st = x.settingState('applications');
      return { value: st.value, powers: st.powers, holder: st.holder, rp: x.registerPowers() };
    };
    expect(pick(replayed)).toEqual(pick(legacy));
    expect(pick(replayed)).toEqual(pick(fresh));
    expect(replayed.rollingHash()).toBe(legacy.rollingHash());
  });

  it('handing the setting over un-crowns the register in the same act', () => {
    const { s } = buildConstituted({
      applications: { holder: 'reserved', joinPolicy: 'invite' } });
    s.delegate(3, 'applications');
    expect(s.registerPowers()).toEqual({ unilateral: false, assent: false });
    expect(s.settingState('applications').value).toEqual({ joinPolicy: 'invite' });
  });
});
