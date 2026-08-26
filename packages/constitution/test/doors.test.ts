/**
 * The doors (entry 94, Ed 2026-08-26): ✉️ and ❌ hold the founder's ✒️/🛡️
 * pair over the *act* — invite or exile at will, refuse any one invitation
 * or removal — while 🪪 and 🥾 price what the room pays. Resignation is the
 * one act always at ✒️. A lapsed member is outside every electorate and
 * counts as abstaining (ruling 5).
 */
import { describe, expect, it } from 'vitest';
import { view } from '../src/view.js';
import { buildConstituted } from './helpers.js';

const crownQuestionFor = (s: ReturnType<typeof buildConstituted>['s'], motion: string) =>
  [...s.crownQuestionRecords().values()]
    .find((q) => q.motion === motion && q.status === 'pending');

describe('✉️ — the invite door', () => {
  it('a carried invitation waits on the door’s 🛡️ and passes on the crown’s accept', () => {
    const { s, bo, cy } = buildConstituted({
      doors: { invite: { unilateral: false, assent: true } } });
    const m = s.openMotion(3, bo, { kind: 'invite', email: 'dee@example.org' });
    expect(s.motionRecords().get(m)!.route).toBe('constitutional'); // 🪪 at assembly
    s.answerMotion(4, 'ada', m, 'accept');
    s.answerMotion(5, cy, m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    const q = crownQuestionFor(s, m)!;
    expect(q).toBeDefined();
    s.answerCrownQuestion(6, q.id, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    const dee = [...s.memberRecords().values()].find((r) => r.email === 'dee@example.org')!;
    expect(dee.arrival).toEqual({ via: 'invitation', by: 'members' });
  });

  it('with 🪪 at ✒️ any member’s word admits, and the record names them', () => {
    const { s, bo } = buildConstituted({ membership: { price: 'pen' } });
    const dee = s.invite(3, 'dee@example.org', bo);
    expect(s.memberRecords().get(dee)!.arrival)
      .toEqual({ via: 'invitation', by: 'member', inviter: bo });
    // a motion is the wrong instrument at ✒️
    expect(() => s.openMotion(4, bo, { kind: 'invite', email: 'eve@example.org' }))
      .toThrow(/invite directly/);
  });

  it('a member’s word is refused above ✒️, and the founder’s needs the door’s pen', () => {
    const { s, bo } = buildConstituted({ membership: { price: 'proposal' } });
    expect(() => s.invite(3, 'dee@example.org', bo)).toThrow(/not at ✒️/);
    expect(() => s.invite(3, 'dee@example.org')).toThrow(/motion at 🪪/);
    const held = buildConstituted({ membership: { price: 'proposal' },
      doors: { invite: { unilateral: true, assent: false } } }).s;
    expect(() => held.invite(3, 'dee@example.org')).not.toThrow();
  });

  it('the view serves both doors’ pairs', () => {
    const { s, bo } = buildConstituted({
      doors: { invite: { unilateral: true, assent: false } } });
    const v = view(s, bo);
    expect(v.doors.invite.powers).toEqual({ unilateral: true, assent: false });
    expect(v.doors.invite.holder).toBe('convenor');
    expect(v.doors.remove.powers).toEqual({ unilateral: false, assent: false });
    expect(v.doors.remove.holder).toBe('members');
  });
});

describe('❌ — the remove door', () => {
  it('exile at will needs the door’s ✒️, is immediate, and settles what the exile was holding up', () => {
    const { s, bo, cy } = buildConstituted({
      doors: { remove: { unilateral: true, assent: false } } });
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    s.answerMotion(4, 'ada', m, 'accept');
    s.answerMotion(5, bo, m, 'accept');
    s.answerMotion(6, cy, m, 'keep'); // the sole refuser
    expect(s.motionRecords().get(m)!.status).toBe('running');
    s.remove(7, cy);
    expect(s.memberRecords().get(cy)!.removed).toBe(true);
    expect(s.memberRecords().get(cy)!.removedBy).toBe('convenor');
    expect(s.E()).toBe(2);
    expect(s.motionRecords().get(m)!.status).toBe('carried'); // re-settled in the same beat
    expect(() => s.remove(8, 'ada')).toThrow(/unticks their own row/);
  });

  it('without the pen, exile is refused — removal goes by 🥾', () => {
    const { s, cy } = buildConstituted();
    expect(() => s.remove(3, cy)).toThrow(/🥾/);
  });

  it('a removed member’s standing accept no longer counts', () => {
    const { s, bo, cy } = buildConstituted({
      doors: { remove: { unilateral: true, assent: false } } });
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    s.answerMotion(4, cy, m, 'accept');
    s.answerMotion(5, bo, m, 'accept'); // ada still owes
    s.remove(6, cy);
    expect(s.motionRecords().get(m)!.status).toBe('running');
    s.answerMotion(7, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
  });

  it('a carried removal waits on the door’s 🛡️', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'assembly' },
      doors: { remove: { unilateral: false, assent: true } } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    expect(view(s, bo).members.find((r) => r.id === cy)!.removalPending).toBe(m);
    expect(view(s, bo).members.find((r) => r.id === bo)!.removalPending).toBeNull();
    s.answerMotion(4, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    s.answerCrownQuestion(5, crownQuestionFor(s, m)!.id, 'reject');
    expect(s.motionRecords().get(m)!.status).toBe('held');
    expect(s.memberRecords().get(cy)!.removed).toBe(false);
  });
});

describe('resignation — always at ✒️', () => {
  it('is free, immediate and nobody’s to refuse, even under 🥾 consent with the shield held', () => {
    const { s, cy } = buildConstituted({ removal: { price: 'consent' },
      doors: { remove: { unilateral: true, assent: true } } });
    s.resign(3, cy);
    expect(s.memberRecords().get(cy)!.removed).toBe(true);
    expect(s.memberRecords().get(cy)!.removedBy).toBe('self');
    expect(s.E()).toBe(2);
    expect([...s.crownQuestionRecords().values()].filter((q) => q.status === 'pending')).toHaveLength(0);
    expect(() => s.resign(4, cy)).toThrow(/unknown member/);
    expect(() => s.resign(4, 'ada')).toThrow(/unticks their own row/);
  });
});

describe('lapse counts as abstaining (ruling 5)', () => {
  it('a running 🏛️ does not wait on a lapsed member, and logging in puts them back', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    s.setIdentity(9_000, 'ada', { name: 'Ada' });
    s.setIdentity(9_000, bo, { name: 'Bo' });
    s.answerMotion(9_100, 'ada', m, 'accept');
    s.answerMotion(9_200, bo, m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('running'); // cy owes
    s.tick(10_500); // cy lapses — and the motion no longer waits on them
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    s.memberReturn(11_000, cy);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
    expect(s.E()).toBe(3);
  });
});
