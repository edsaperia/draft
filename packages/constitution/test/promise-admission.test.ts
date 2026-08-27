/**
 * **Promise-coverage — 🪪 admissions and 🤝 applications** (backlog entry 78,
 * the first of series 77). A founded document is a promise per setting; this
 * file is the fold half of the audit of the pair that governs *who is in the
 * room*. One `it` per promise that the fold actually keeps, so that a later
 * change has to break a named sentence rather than a behaviour nobody wrote
 * down. Promises the fold does **not** keep are not inverted into green tests
 * here — they were filed as backlog entries by the session that wrote this
 * file, and a fix is a plan of its own.
 *
 * What is deliberately not duplicated, because an existing test already locks
 * it: a member's word at 🪪 `pen` naming the inviter, and the founder's word
 * after the start needing ✉️'s ✒️ (`doors.test.ts` *with 🪪 at ✒️ any member's
 * word admits* and *a member's word is refused above ✒️*); the shut door
 * refusing an unsubmitted application while a submitted one goes on
 * (`applications.test.ts` *the door shutting*); a member's address told to log
 * in instead (`applications.test.ts`); the three shapes of an admit motion
 * (`admit-view.test.ts`).
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { EngineBridge } from '../src/engine-bridge.js';
import { buildConstituted } from './helpers.js';

/** A pre-start document with two arrived members and nothing settled. */
function preStart() {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  s.arrive(1, bo);
  return { s, bo };
}

describe('🪪/🤝 promise 4 + 8: a pair still collecting admits nobody, and before the start the founder alone re-shapes the membership', () => {
  // Unset 🪪 reads `assembly` and unset 🤝 reads shut (`priceOf`, `mayApply`)
  // — the most protective answer while the room decides, which is what makes
  // a delegated-and-collecting pair safe rather than a hole.
  it('delegated and collecting: 🤝 reads shut, 🪪 reads assembly, and no stranger has a road in', () => {
    const { s, bo } = preStart();
    s.delegate(1, 'applications');
    s.delegate(1, 'admission');
    expect(s.settingState('applications').value).toBeNull();
    expect(s.settingState('applications').collecting).toBe(true);
    expect(s.settingState('admission').value).toBeNull();

    // 🤝 unset reads shut: the front door refuses
    expect(() => s.startApplication(2, 'dee@example.org')).toThrow(/invitation-only/);
    // 🪪 unset reads assembly, so a member's word is not enough — and before
    // the start it is not enough at any price (§9.6a)
    expect(() => s.invite(2, 'dee@example.org', bo)).toThrow(/before the start the founder invites/);
    // and nothing is proposed before the start either
    expect(() => s.openMotion(2, bo, { kind: 'invite', email: 'dee@example.org' }))
      .toThrow(/before the start nothing is amended/);
    // the founder's own word is the one road in, and it asks nobody (§9.6a)
    const dee = s.invite(2, 'dee@example.org');
    expect(s.memberRecords().get(dee)!.arrival).toEqual({ via: 'invitation', by: 'convenor' });
  });

  it('a settled 🤝 *no* leaves the stranger nothing, whatever 🪪 says', () => {
    for (const price of ['assembly', 'proposal', 'pen'] as const) {
      const { s } = buildConstituted({
        applications: { apply: false }, admission: { price } });
      expect(() => s.startApplication(3, 'dee@example.org')).toThrow(/invitation-only/);
    }
  });
});

describe('🪪/🤝 promise 1: at assembly nobody joins without everyone’s consent', () => {
  // X11's second half: *under assembly nobody stands at accept for them*. The
  // mover's own accept (X16) is what an ordinary constitutional motion opens
  // with; an application has no mover, so the motion opens with no answer at
  // all and every member is still owed.
  it('the admit motion opens with no answer standing for the applicant (X11)', () => {
    const { s, bo, cy } = buildConstituted({
      applications: { apply: true }, admission: { price: 'assembly' } });
    const ap = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, ap);
    s.submitApplication(5, ap, { words: 'I bake.' });
    const rec = s.motionRecords().get(s.applicantRecords().get(ap)!.motion!)!;
    expect(rec.route).toBe('constitutional');
    expect(rec.by).toBeNull();
    expect(rec.answers.size).toBe(0);
    // one keep blocks: two accepts out of three settle nothing
    s.answerMotion(6, 'ada', rec.id, 'accept');
    s.answerMotion(7, bo, rec.id, 'accept');
    s.answerMotion(8, cy, rec.id, 'keep');
    expect(s.motionRecords().get(rec.id)!.status).toBe('running');
    expect(s.applicantRecords().get(ap)!.status).toBe('submitted');
    expect(s.E()).toBe(3);
  });
});

describe('🪪/🤝 promise 2: at proposal each application is its own one-candidate race', () => {
  it('two applicants make two `admit:` races, never one (§9.7½)', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'proposal' } });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'promise-admission' });
    const dee = s.startApplication(4, 'dee@example.org');
    s.verifyApplication(4, dee);
    s.submitApplication(5, dee, { name: 'Dee' });
    const eve = s.startApplication(5, 'eve@example.org');
    s.verifyApplication(5, eve);
    s.submitApplication(6, eve, { name: 'Eve' });
    bridge.sync(7);
    const admitRaces = bridge.engine.races()
      .filter((r) => String(r.settingId).startsWith('admit:'));
    expect(admitRaces.map((r) => r.settingId).sort())
      .toEqual([`admit:${dee}`, `admit:${eve}`]);
    // one candidate each: two applicants are never raced against each other
    for (const r of admitRaces) expect(r.members).toHaveLength(1);
    // and the applicant's own voice is suspended in the same breath (X11),
    // so a wallet-less voice is never its own mover toward the floor
    expect(s.E()).toBe(3);
  });
});

describe('🪪/🤝 promise 6: a change of rule never moves a person (entry 97)', () => {
  it('a re-pricing from proposal to pen leaves a running admit motion running at its stored route', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'proposal' } });
    const ap = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, ap);
    s.submitApplication(5, ap, { name: 'Dee' });
    const motion = s.applicantRecords().get(ap)!.motion!;
    expect(s.motionRecords().get(motion)!.route).toBe('ordinary');
    s.setSetting(6, 'admission', { price: 'pen' });
    // the act stands under the rule it was done under: still ordinary, still
    // running, still adjudicated as a race
    expect(s.motionRecords().get(motion)!.route).toBe('ordinary');
    expect(s.motionRecords().get(motion)!.status).toBe('running');
    s.adjudicateOrdinaryMotion(7, motion, 'carried');
    expect(s.applicantRecords().get(ap)!.status).toBe('admitted');
  });

  it('a re-pricing from pen to proposal between verify and submit makes the submit a motion at the new price', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'pen' } });
    const ap = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, ap);
    // **Submission is the act**: nothing was lodged at ✒️, so the new price
    // is the one this application pays.
    s.setSetting(5, 'admission', { price: 'proposal' });
    s.submitApplication(6, ap, { name: 'Dee' });
    expect(s.applicantRecords().get(ap)!.status).toBe('submitted');
    const motion = s.motionRecords().get(s.applicantRecords().get(ap)!.motion!)!;
    expect(motion.route).toBe('ordinary');
    expect(motion.by).toBeNull();
  });

  it('a re-pricing moves no invitation already sent: the invitee arrives as they were invited', () => {
    const { s, bo } = buildConstituted({ admission: { price: 'pen' } });
    const dee = s.invite(3, 'dee@example.org', bo);
    s.setSetting(4, 'admission', { price: 'assembly' });
    s.arrive(5, dee);
    expect(s.memberRecords().get(dee)!.arrival)
      .toEqual({ via: 'invitation', by: 'member', inviter: bo });
    expect(s.E()).toBe(4);
  });
});

describe('🪪/🤝 promise 7 (as read today): at ✒️ the act is its own consent, and ✉️’s 🛡️ never asks', () => {
  /**
   * **The reading this locks.** §9.7 rule 9 says two things in one sentence —
   * *🛡️ at a door is the veto of any one act* and *(a carried invitation or
   * removal is a 👑 question)* — and they agree only if *any one act* means
   * *any one **carried** act*. Under that reading `pen` is a full bypass **by
   * design**: the whole point of the rung is that the act is its own consent,
   * so there is nothing carried for the shield to refuse. `doors.test.ts` *a
   * carried invitation waits on the door's 🛡️* already encodes the same
   * reading from the other side, and `reservedTarget` is consulted only for a
   * *motion*.
   *
   * The competing reading — the shield refuses **any** admission, carried or
   * direct — would make these two cases defects rather than behaviour. The
   * ✉️ 🛡️ tab's own title (*Does the Founder Have a Veto over Invitations?*)
   * is absolute and is offered at `pen`, where it can never bite; that copy
   * gap is filed as a backlog entry rather than fixed here.
   */
  it('under the carried-acts reading: a member’s pen invitation with ✉️’s 🛡️ held admits with no 👑 question', () => {
    const { s, bo } = buildConstituted({
      admission: { price: 'pen' },
      doors: { invite: { unilateral: false, assent: true } } });
    expect(s.settingState('door:invite').powers.assent).toBe(true);
    const dee = s.invite(3, 'dee@example.org', bo);
    expect(s.memberRecords().get(dee)!.arrival)
      .toEqual({ via: 'invitation', by: 'member', inviter: bo });
    expect([...s.crownQuestionRecords().values()]).toHaveLength(0);
  });

  it('under the carried-acts reading: an application at pen with ✉️’s 🛡️ held admits on submit with no 👑 question', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'pen' },
      doors: { invite: { unilateral: false, assent: true } } });
    const ap = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, ap);
    s.submitApplication(5, ap, { name: 'Dee' });
    expect(s.applicantRecords().get(ap)!.status).toBe('admitted');
    expect(s.applicantRecords().get(ap)!.motion).toBeFalsy();
    expect([...s.crownQuestionRecords().values()]).toHaveLength(0);
    expect(s.E()).toBe(4);
  });
});

describe('🪪/🤝 promise 8: after the close there is nothing left to join, only to read (§4.6, X14)', () => {
  it('every entrance refuses, and an outstanding invitation expires', () => {
    const { s, bo } = buildConstituted({
      applications: { apply: true }, admission: { price: 'pen' } });
    const outstanding = s.invite(3, 'dee@example.org');
    const started = s.startApplication(3, 'eve@example.org');
    s.tick(1_000_000); // past the ending buildConstituted's ceremony took
    expect(s.closed).toBe(true);

    expect(() => s.invite(1_000_001, 'fay@example.org')).toThrow(/document has closed/);
    expect(() => s.invite(1_000_001, 'fay@example.org', bo)).toThrow(/document has closed/);
    expect(() => s.startApplication(1_000_001, 'fay@example.org')).toThrow(/document has closed/);
    expect(() => s.verifyApplication(1_000_001, started)).toThrow(/document has closed/);
    expect(() => s.submitApplication(1_000_001, started)).toThrow(/document has closed/);
    expect(() => s.openMotion(1_000_001, bo, { kind: 'invite', email: 'fay@example.org' }))
      .toThrow(/document has closed/);
    // X14: the invitation outstanding at the close expired, and following the
    // link is refused with the sentence the door serves
    expect(s.memberRecords().get(outstanding)!.invitationExpired).toBe(true);
    expect(() => s.arrive(1_000_001, outstanding))
      .toThrow(/nothing left to join, only to read/);
  });
});
