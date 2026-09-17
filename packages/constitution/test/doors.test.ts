/**
 * The doors (entry 94, Ed 2026-08-26): ✉️ and ❌ hold the founder's ✒️/🛡️
 * pair over the *act* — invite or exile at will, refuse any one invitation
 * or removal — while 🪪 and 🥾 price what the room pays. Resignation is the
 * one act always at ✒️. A lapsed member is outside every electorate and
 * counts as abstaining (ruling 5).
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
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
    const { s, bo } = buildConstituted({ admission: { price: 'pen' } });
    const dee = s.invite(3, 'dee@example.org', bo);
    expect(s.memberRecords().get(dee)!.arrival)
      .toEqual({ via: 'invitation', by: 'member', inviter: bo });
    // a motion is the wrong instrument at ✒️
    expect(() => s.openMotion(4, bo, { kind: 'invite', email: 'eve@example.org' }))
      .toThrow(/invite directly/);
  });

  it('a member’s word is refused above ✒️, and the founder’s needs the door’s pen', () => {
    const { s, bo } = buildConstituted({ admission: { price: 'proposal' } });
    expect(() => s.invite(3, 'dee@example.org', bo)).toThrow(/not at ✒️/);
    expect(() => s.invite(3, 'dee@example.org')).toThrow(/motion at 🪪/);
    const held = buildConstituted({ admission: { price: 'proposal' },
      doors: { invite: { unilateral: true, assent: false } } }).s;
    expect(() => held.invite(3, 'dee@example.org')).not.toThrow();
  });

  /**
   * **One address is one member** (issue #6, F2; §9.7½, decision 1253). Every
   * road in checks the address when it *starts* — `requireEmailFree` at the
   * invitation, at the motion and at the door — and nothing checked it again
   * when a motion carried, which can be hours later. Two roads open at once
   * on the same person is an ordinary thing in a live room: a motion running
   * while the Founder's ✒️ invites the same address, a motion running while
   * that person applies. The second arrival minted a second member row, and
   * a second row is a second wallet, a second place in E and a second voice
   * in every unanimity and every quorum from then on.
   */
  it('a carried invitation whose address was seated meanwhile seats nobody twice', () => {
    const { s, bo, cy } = buildConstituted({
      doors: { invite: { unilateral: true, assent: false } } });
    const m = s.openMotion(3, bo, { kind: 'invite', email: 'dee@example.org' });
    // …and while the room is answering, the Founder's own ✒️ invites her
    const direct = s.invite(4, 'dee@example.org');
    s.answerMotion(5, 'ada', m, 'accept');
    s.answerMotion(6, cy, m, 'accept');
    // the motion carried — the room said yes, and that is what the record says
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    // …but it seats nobody, because she is already seated
    const rows = [...s.memberRecords().values()].filter((r) => r.email === 'dee@example.org');
    expect(rows.map((r) => r.id)).toEqual([direct]);
    expect(s.E()).toBe(3); // an invitee counts toward nothing until they arrive
  });

  /**
   * **The third pair, at the other door in** (issue #6, F2). The carry arms
   * are two, and the guard above covers one of them: an *application* is
   * verified before it is submitted, and the pen can invite that address in
   * between — refused at the door, the test below — but it can equally
   * invite it while the room is deciding the admission it opened, which
   * nothing refuses and nothing can. So the `admit` arm asks the same
   * question at its own carry (`personOfApplicant` → `personSeated`), and
   * this is what says so: red on the pre-fix arm at a second row and at
   * E=4, the applicant having been seated twice for one person.
   */
  it('a carried admission whose applicant was seated meanwhile seats nobody twice', () => {
    const { s } = buildConstituted({ applications: { apply: true },
      admission: { price: 'proposal' },
      doors: { invite: { unilateral: true, assent: false } } });
    const ap = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, ap);
    s.submitApplication(5, ap, { name: 'Dee' });
    const motion = s.applicantRecords().get(ap)!.motion!;
    // …and while the room is judging it, the Founder's own ✒️ invites her
    const direct = s.invite(6, 'dee@example.org');
    s.adjudicateOrdinaryMotion(7, motion, 'carried');
    expect(s.motionRecords().get(motion)!.status).toBe('carried');
    const rows = [...s.memberRecords().values()].filter((r) => r.email === 'dee@example.org');
    expect(rows.map((r) => r.id)).toEqual([direct]);
    expect(s.E()).toBe(3); // her seat is the invitation's, and waits for her
  });

  it('a submitted application whose address was seated meanwhile is refused at the door', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'assembly' },
      doors: { invite: { unilateral: true, assent: false } } });
    const ap = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, ap);
    s.invite(5, 'dee@example.org'); // the Founder's pen gets there first
    expect(() => s.submitApplication(6, ap, { name: 'Dee' }))
      .toThrow(/already on the membership/);
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
    // and the convenor's membership is ordinary membership (§9.6a, entry
    // 248): after the start they leave by the same door as anybody, and
    // the seat they leave behind is R-060's vacancy
    s.resign(4, 'ada');
    expect(s.memberRecords().get('ada')!.removed).toBe(true);
    expect(s.memberRecords().get('ada')!.removedBy).toBe('self');
    expect(s.E()).toBe(1);
    expect(s.convenorSeatVacant()).toBe(true);
  });

  it('before the start it is still the 🎩 untick, and resign says so', () => {
    const s = ConstitutionSession.open({
      title: 'Hollow Oak Club Charter', slug: 'hollow-oak',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    expect(() => s.resign(1, 'ada')).toThrow(/unticks their own row/);
    expect(s.memberRecords().get('ada')!.removed).toBe(false);
  });
});

/**
 * **The register tells the room** (Q901, SURFACE E31–E32): a departure is a
 * fact about the membership, so the view lists who left after arriving, when
 * and by whose act — the room reads a sentence, not a row going missing.
 * Withdrawing an invitation is a kind of removal to the founder (entry 96)
 * but nobody left the membership, so it is not one.
 */
describe('departures — what the view says about who left (Q901)', () => {
  it('after exile the view lists one departure by the convenor, with the time', () => {
    const { s, bo, cy } = buildConstituted({
      doors: { remove: { unilateral: true, assent: false } } });
    expect(view(s, bo).departures).toEqual([]);
    s.remove(7, cy);
    const v = view(s, bo);
    expect(v.departures).toEqual([{ id: cy, name: v.departures[0]!.name,
      picture: v.departures[0]!.picture, email: 'cy@example.org', erased: false, t: 7, by: 'convenor' }]);
    expect(v.members.some((m) => m.id === cy)).toBe(false);
    // the address rides since Q1375 (Ed, 2026-09-15: *use [email] if no name
    // chosen*) — the rail entry names them by it where they chose no name
    expect(v.departures[0]!.email).toBe('cy@example.org');
  });

  it('after resignation the view lists one departure by the member themself', () => {
    const { s, bo, cy } = buildConstituted();
    s.resign(3, cy);
    expect(view(s, bo).departures.map((d) => [d.id, d.t, d.by])).toEqual([[cy, 3, 'self']]);
    // the module's own reader says the same, in log order
    expect(s.departures()).toEqual([{ member: cy, t: 3, by: 'self' }]);
  });

  it('an uninvited invitee is not a departure — nobody left the membership', () => {
    // pre-start, since withdrawing an invitation is a pre-start act
    const s = ConstitutionSession.open({
      title: 'Hollow Oak Club Charter', slug: 'hollow-oak',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    const dee = s.invite(1, 'dee@example.org');
    s.uninvite(2, dee);
    expect(s.memberRecords().get(dee)!.removed).toBe(true);
    expect(s.departures()).toEqual([]);
    expect(view(s, 'ada').departures).toEqual([]);
  });

  it('a removed invitee who never arrived is a departure all the same (Q1012)', () => {
    // Ed, 2026-08-28: *keep the mail and also record the departure* — the
    // `member-removed` mail tells them they are no longer a member of the
    // document, so the register says the same about the same act. The
    // page routes an invitee to `uninvite`, so this is the module's own
    // door (`remove`, and a carried removal by the same fold).
    const { s, bo } = buildConstituted({ admission: { price: 'pen' },
      doors: { remove: { unilateral: true, assent: false } } });
    const dee = s.invite(3, 'dee@example.org', bo);
    expect(s.memberRecords().get(dee)!.arrivedAtT).toBeNull();
    s.remove(4, dee);
    expect(s.departures()).toEqual([{ member: dee, t: 4, by: 'convenor' }]);
    // nameless, since they never gave one: the view carries the fact, and
    // since Q1375 the address, which is what the rail entry names them by
    const v = view(s, bo);
    expect(v.departures.map((d) => [d.id, d.name, d.t, d.by])).toEqual([[dee, null, 4, 'convenor']]);
    expect(v.departures[0]!.email).toBe('dee@example.org');
  });
});

/**
 * **And every departure owes an OK** (Ed, 2026-09-14, Q901; SURFACE E31, E32,
 * E40). The grey sentence asked nothing, so a member who was not reading the
 * list the day somebody left never met it. One rule over all three routes out:
 * the Founder's ❌, a carried 🥾 motion, and a resignation.
 */
describe('departures — the OK every remaining member is owed (Q901)', () => {
  it('❌ at will owes every other present member, and the OK clears it', () => {
    const { s, bo, cy } = buildConstituted({
      doors: { remove: { unilateral: true, assent: false } } });
    expect(view(s, bo).owedDepartures).toEqual([]);
    s.remove(7, cy);
    expect(view(s, bo).owedDepartures).toEqual([cy]);
    // **the actor is not inside the audience** (Ed, 2026-09-14, Q1358): ❌ is
    // the Founder's own act, and as with a power laid down or an amendment the
    // one who did it is not told of it
    expect(view(s, 'ada').owedDepartures).toEqual([]);
    // and never the person it happened to: their record is already removed
    expect(s.memberRecords().get(cy)!.departuresOwed.size).toBe(0);
    s.ackDeparture(8, bo, cy);
    expect(view(s, bo).owedDepartures).toEqual([]);
    expect(view(s, 'ada').owedDepartures).toEqual([]);   // and the actor was never owed it (Q1358)
    // the OK is idempotent and refuses nothing it can ignore (ackRelease's
    // posture): a second press, and a press for a departure nobody owes you
    expect(() => s.ackDeparture(9, bo, cy)).not.toThrow();
    expect(() => s.ackDeparture(9, bo, 'nobody')).not.toThrow();
  });

  it('a resignation owes it too, and a later joiner is owed nothing', () => {
    const { s, bo, cy } = buildConstituted({ admission: { price: 'pen' },
      doors: { remove: { unilateral: true, assent: false } } });
    s.resign(3, cy);
    expect(view(s, bo).owedDepartures).toEqual([cy]);
    // **never a later joiner** (C8: were you here when it happened): dee is
    // invited and arrives after the act, and the register is simply what the
    // document says to them
    const dee = s.invite(4, 'dee@example.org', bo);
    s.arrive(5, dee);
    expect(view(s, dee).owedDepartures).toEqual([]);
    // and an invitee who has not arrived is owed nothing either, on the same
    // rule — they meet the membership as it stands when they get here
    const eve = s.invite(6, 'eve@example.org', bo);
    s.remove(7, dee);
    expect(s.memberRecords().get(eve)!.departuresOwed.size).toBe(0);
    expect(view(s, bo).owedDepartures).toEqual([cy, dee]);   // oldest first
  });

  it('a carried 🥾 motion owes it, by the same rule and the same arm', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'proposal' } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    s.adjudicateOrdinaryMotion(4, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.departures().map((d) => [d.member, d.by])).toEqual([[cy, 'members']]);
    expect(view(s, bo).owedDepartures).toEqual([cy]);
    expect(view(s, 'ada').owedDepartures).toEqual([cy]);
  });

  it('replay reproduces what is owed, and the OK with it', () => {
    const { s, bo, cy } = buildConstituted({
      doors: { remove: { unilateral: true, assent: false } } });
    s.remove(7, cy);
    s.ackDeparture(8, bo, cy);
    const again = ConstitutionSession.replay([...s.logEntries()]);
    expect(again.rollingHash()).toBe(s.rollingHash());
    expect([...again.memberRecords().get(bo)!.departuresGiven]).toEqual([cy]);
    expect(again.memberRecords().get(bo)!.departuresOwed.size).toBe(0);
    expect([...again.memberRecords().get('ada')!.departuresOwed]).toEqual([]); // the actor, Q1358
  });
});

/**
 * Q1033 (Ed, 2026-08-29, (a)): a motion-backed 👑 question standing when the
 * convenor's seat is vacated auto-passes *exactly as the lapse case does* —
 * the carried effects apply — and the record says the seat was vacant, not
 * that the convenor agreed. R-060's text half is `text-powers.test.ts`.
 */
describe('a vacated seat auto-passes a motion-backed 👑 question too (Q1033)', () => {
  it('a carried invitation parked on ✉️’s 🛡️ lands when the convenor is removed, marked vacancy', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'assembly' },
      doors: { invite: { unilateral: false, assent: true } } });
    const m = s.openMotion(3, bo, { kind: 'invite', email: 'dee@example.org' });
    s.answerMotion(4, 'ada', m, 'accept');
    s.answerMotion(5, cy, m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    const q = crownQuestionFor(s, m)!;
    expect(q.autoPassedBy).toBeNull();

    // the seat empties: cy moves ada's removal (bo's 🏛️ is still out on the
    // parked invitation, §9.6), bo accepts, ada is not asked
    const rm = s.openMotion(6, cy, { kind: 'remove', member: 'ada' });
    s.answerMotion(7, bo, rm, 'accept');
    expect(s.memberRecords().get('ada')!.removed).toBe(true);
    expect(s.convenorSeatVacant()).toBe(true);

    // passed by nobody's hand, and the record says which nobody
    expect(q.status).toBe('auto-passed');
    expect(q.autoPassedBy).toBe('vacancy');
    expect(s.crownLapsed).toBe(false); // a vacancy is not a lapse
    const passed = s.logEntries().map((e) => e.event)
      .find((e) => e.type === 'crown-question-auto-passed' && e.question === q.id);
    expect(passed).toMatchObject({ cause: 'vacancy' });
    // and the motion the room carried lands: dee is invited by the members
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    const dee = [...s.memberRecords().values()].find((r) => r.email === 'dee@example.org')!;
    expect(dee).toBeDefined();
    expect(dee.arrival).toEqual({ via: 'invitation', by: 'members' });
    expect([...s.crownQuestionRecords().values()].filter((x) => x.status === 'pending'))
      .toHaveLength(0);
  });

  it('a carried rule change parked on the crown lands the same way, the setting still the membership’s', () => {
    // 🪜 is ordinary and the founder's with both powers intact after the
    // founding, so the room's race carries it and it parks on the assent
    const { s, bo } = buildConstituted({ removal: { price: 'assembly' } });
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'pace',
      value: { shape: 'ramp', startPct: 50 } });
    s.adjudicateOrdinaryMotion(4, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    const q = crownQuestionFor(s, m)!;

    s.resign(6, 'ada'); // free, immediate, nobody's to refuse (entry 248)
    expect(q.status).toBe('auto-passed');
    expect(q.autoPassedBy).toBe('vacancy');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.settingState('pace').value).toEqual({ shape: 'ramp', startPct: 50 });
    // the value is the membership's: `crown` is the route it took, and the
    // page's provenance reads it as chosen by the membership
    expect(s.settingState('pace').settledBy).toBe('crown');
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
