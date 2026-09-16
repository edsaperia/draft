import { describe, expect, it } from 'vitest';
import { buildConstituted } from './helpers.js';
import { ConstitutionSession } from '../src/session.js';
import type { InMemoryPeople } from '../src/people.js';
import { view } from '../src/view.js';

describe('applications (§9.7½, entry 94): one switch, 🪪’s price, one identity rule', () => {
  it('invitation only refuses the front door', () => {
    const { s } = buildConstituted(); // apply: false
    expect(() => s.startApplication(3, 'dee@example.org')).toThrow(/invitation-only/);
  });

  // **Submission is the act** (entry 97): a change of rule never moves a
  // person, so what was lodged before the door shut goes on to its judgment,
  // and what was not lodged is refused at the door like any stranger.
  it('the door shutting: a submitted application goes on, an unsubmitted one is refused', () => {
    const { s, bo, cy } = buildConstituted({
      applications: { apply: true }, admission: { price: 'proposal' } });
    const lodged = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, lodged);
    s.submitApplication(5, lodged, { name: 'Dee' });
    const late = s.startApplication(5, 'eve@example.org');
    s.verifyApplication(6, late);
    s.setSetting(7, 'applications', { apply: false }); // the crown shuts the door
    expect(() => s.submitApplication(8, late)).toThrow(/invitation-only/);
    expect(s.applicantRecords().get(late)!.status).toBe('verified'); // lodged nothing; moved nowhere
    const motion = s.applicantRecords().get(lodged)!.motion!;
    expect(s.motionRecords().get(motion)!.status).toBe('running'); // the room has this one
    s.adjudicateOrdinaryMotion(9, motion, 'carried');
    expect(s.applicantRecords().get(lodged)!.status).toBe('admitted');
    expect(s.E()).toBe(4);
    void bo; void cy;
  });

  // **And the applicant is told, and says they read it** (Ed, 2026-09-14,
  // Q901; SURFACE E33). The refusal itself stays derived from the rule as it
  // stands — there is no motion and no event to refuse — so only the OK is
  // recorded, on the applicant's own row, and the room hears nothing of it.
  it('the shut door takes an OK on the applicant’s own row, and nowhere else', () => {
    const { s, bo } = buildConstituted({
      applications: { apply: true }, admission: { price: 'proposal' } });
    const late = s.startApplication(3, 'eve@example.org');
    s.verifyApplication(4, late);
    expect(s.applicantRecords().get(late)!.shutAcked).toBe(false);
    s.setSetting(5, 'applications', { apply: false });
    const roomBefore = JSON.stringify(view(s, bo));
    s.ackApplyShut(6, late);
    // the room hears nothing of a stranger: their whole view is unmoved
    expect(JSON.stringify(view(s, bo))).toBe(roomBefore);
    expect(s.applicantRecords().get(late)!.shutAcked).toBe(true);
    // idempotent, and it refuses an applicant nobody has
    expect(() => s.ackApplyShut(7, late)).not.toThrow();
    expect(() => s.ackApplyShut(7, 'ap-nobody')).toThrow(/unknown applicant/);
    // and the applicant row the members read carries no flag of it either
    expect(Object.keys(view(s, bo).applicants[0] ?? {})).not.toContain('shutAcked');
    // replay reproduces it, and the OK survives the close — the close is one
    // of the things that shuts the door, so it may never refuse one
    const again = ConstitutionSession.replay([...s.logEntries()]);
    expect(again.rollingHash()).toBe(s.rollingHash());
    expect(again.applicantRecords().get(late)!.shutAcked).toBe(true);
    const fresh = buildConstituted({
      applications: { apply: true }, admission: { price: 'proposal' } });
    const ap2 = fresh.s.startApplication(3, 'eve@example.org');
    fresh.s.verifyApplication(4, ap2);
    fresh.s.tick(1_000_001);
    expect(fresh.s.closed).toBe(true);
    expect(() => fresh.s.ackApplyShut(1_000_002, ap2)).not.toThrow();
    expect(fresh.s.applicantRecords().get(ap2)!.shutAcked).toBe(true);
  });

  it('a member address is told to log in instead — one address, one member', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'proposal' } });
    expect(() => s.startApplication(3, 'bo@example.org')).toThrow(/log in/);
  });

  it('at ✏️: verified before anything can be submitted; straight to the bar, free', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'proposal' } });
    const ap = s.startApplication(3, 'dee@example.org');
    expect(() => s.submitApplication(4, ap)).toThrow(/magic link/);
    s.verifyApplication(4, ap);
    s.submitApplication(5, ap, { name: 'Dee', words: 'I keep bees.' });
    const rec = s.applicantRecords().get(ap)!;
    expect(rec.status).toBe('submitted');
    const motion = s.motionRecords().get(rec.motion!)!;
    expect(motion.route).toBe('ordinary');
    expect(motion.stake).toBe(0); // the tasks its price, the bar its filter
    s.adjudicateOrdinaryMotion(6, rec.motion!, 'carried');
    expect(s.applicantRecords().get(ap)!.status).toBe('admitted');
    expect(s.E()).toBe(4);
    const dee = [...s.memberRecords().values()].find((m) => m.email === 'dee@example.org')!;
    expect(dee.name).toBe('Dee');
    // an admitted applicant inherits the constitution and is owed nothing
    // for it — a setting that predates you is what the document says (§9.0a)
    expect(dee.okOwed.size).toBe(0);
  });

  it('a refused application is told so', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'proposal' } });
    const ap = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, ap);
    s.submitApplication(5, ap); // an empty application is a real application
    s.adjudicateOrdinaryMotion(6, s.applicantRecords().get(ap)!.motion!, 'held');
    expect(s.applicantRecords().get(ap)!.status).toBe('refused');
    expect(s.E()).toBe(3);
  });

  it('at 🏛️: the application is its own constitutional motion, nobody’s mover, free', () => {
    const { s, bo, cy } = buildConstituted({
      applications: { apply: true } }); // 🪪 at assembly by default
    const ap = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, ap);
    s.submitApplication(5, ap, { words: 'dee ran the sister club for two years' });
    const rec = s.applicantRecords().get(ap)!;
    const motion = s.motionRecords().get(rec.motion!)!;
    expect(motion.route).toBe('constitutional');
    expect(motion.stake).toBe(0);
    expect(motion.by).toBeNull(); // the applicant stands as nobody's mover
    s.answerMotion(6, 'ada', rec.motion!, 'accept');
    s.answerMotion(7, bo, rec.motion!, 'accept');
    expect(s.applicantRecords().get(ap)!.status).toBe('submitted'); // cy still owed
    s.answerMotion(8, cy, rec.motion!, 'accept');
    expect(s.applicantRecords().get(ap)!.status).toBe('admitted');
    expect(s.E()).toBe(4);
  });

  it('open: 🤝 yes and 🪪 at ✒️ — anyone with the link joins on arrival, identity still verified', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'pen' } });
    const ap = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, ap);
    s.submitApplication(5, ap, { name: 'Dee' });
    expect(s.applicantRecords().get(ap)!.status).toBe('admitted');
    expect(s.E()).toBe(4);
  });

  // **A fresh application starts blank, whoever you were** (Q1366, Ed
  // 2026-09-15). The row outlives the seat — the register's departure line
  // still names who left — so a returning address knocks on a row already
  // carrying a name and a face, and the applicant's record used to read them
  // back as if they had been given: ✋ showed the old name, 🖼️ opened on
  // *Chosen*. Nothing is given until the submission, and the submission is
  // the whole of it.
  it('a returning address applies blank, and the submission is what stands (Q1366)', () => {
    const { s, bo } = buildConstituted({
      applications: { apply: true }, admission: { price: 'proposal' } });
    s.setIdentity(2, bo, { name: 'Bo Before', picture: 'e🦊' });
    s.resign(3, bo);
    expect(s.memberRecords().get(bo)!.name).toBe('Bo Before'); // the departure line still has a name
    const ap = s.startApplication(4, 'bo@example.org');
    s.verifyApplication(5, ap);
    const a = s.applicantRecords().get(ap)!;
    expect(a.person).toBe(s.memberRecords().get(bo)!.person); // one person, one row
    expect(a.email).toBe('bo@example.org');
    expect(a.name).toBeNull(); // nothing given yet, whatever the row holds
    expect(a.picture).toBeNull();
    expect(view(s, bo).applicants.find((x) => x.id === ap)!.name).toBeNull();
    s.submitApplication(6, ap, { name: 'Bo Again' }); // a name, no picture
    expect(a.name).toBe('Bo Again');
    expect(a.picture).toBeNull(); // not given, so not carried from the old seat
    // the row is the person's, so the departed seat now reads the new name
    // too — the record resolves live (decision 1253), as it does for a
    // member who renames
    expect(s.memberRecords().get(bo)!.name).toBe('Bo Again');
    expect(s.memberRecords().get(bo)!.picture).toBeNull();
  });

  // **What the applicant answered at the door arrives with them** (Q1405,
  // Ed's live-room note 2026-09-16: *after I have chosen name and picture,
  // the tasks still appear yellow*). The admission copied the row across —
  // the name and the picture — but ✋ and 🖼️ ask *were you ever asked*
  // (Q645), and only `identity-set` had ever set those flags, so a member
  // admitted from an application met both cards again. The flags ride
  // `member-admitted` in `ConvenorRef`'s shape, and a replay reads them off
  // the event, never the row.
  const admittedFrom = (s: ConstitutionSession, email: string) =>
    [...s.memberRecords().values()].find((m) => m.email === email)!;
  const admissionEvent = (s: ConstitutionSession) =>
    s.logEntries().map((e) => e.event).find((e) => e.type === 'member-admitted')!;

  it('an applicant who gave a name and a picture is admitted having answered both (Q1405)', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'proposal' } });
    const ap = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, ap);
    s.submitApplication(5, ap, { name: 'Dee', picture: 'e🦡', words: 'I keep bees.' });
    s.adjudicateOrdinaryMotion(6, s.applicantRecords().get(ap)!.motion!, 'carried');
    const dee = admittedFrom(s, 'dee@example.org');
    expect(dee.name).toBe('Dee');
    expect(dee.picture).toBe('e🦡');
    expect(dee.nameSet).toBe(true);
    expect(dee.pictureSet).toBe(true);
    expect(view(s, dee.id).identity)
      .toEqual({ name: 'Dee', picture: 'e🦡', nameSet: true, pictureSet: true });
    // the act is in the log, in the founder's own shape (`ConvenorRef`)
    expect(admissionEvent(s)).toMatchObject({ nameSet: true, pictureSet: true });
  });

  it('one who gave neither is admitted having answered nothing, and the event is as it was', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'pen' } });
    const ap = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, ap);
    s.submitApplication(5, ap); // an empty application is a real application
    const dee = admittedFrom(s, 'dee@example.org');
    expect(dee.nameSet).toBe(false);
    expect(dee.pictureSet).toBe(false);
    expect(view(s, dee.id).identity)
      .toEqual({ name: null, picture: null, nameSet: false, pictureSet: false });
    // no key at all, so the common admission serialises exactly as before
    expect(Object.keys(admissionEvent(s)).sort()).toEqual(['applicant', 'member', 't', 'type']);
  });

  it('a name alone answers ✋ alone, and a replay reads the flags off the log', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'pen' } });
    const ap = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, ap);
    s.submitApplication(5, ap, { name: 'Dee' });
    const dee = admittedFrom(s, 'dee@example.org');
    expect(dee.nameSet).toBe(true);
    expect(dee.pictureSet).toBe(false);
    expect(admissionEvent(s)).toMatchObject({ nameSet: true });
    expect('pictureSet' in admissionEvent(s)).toBe(false);
    const again = ConstitutionSession.replay([...s.logEntries()], s.people);
    expect(again.rollingHash()).toBe(s.rollingHash());
    expect(again.memberRecords().get(dee.id)!.nameSet).toBe(true);
    expect(again.memberRecords().get(dee.id)!.pictureSet).toBe(false);
    // and the flags outlive the row: an erased person was still asked
    (s.people as InMemoryPeople).erase(dee.person);
    const erased = ConstitutionSession.replay([...s.logEntries()], s.people);
    expect(erased.memberRecords().get(dee.id)!.name).toBeNull();
    expect(erased.memberRecords().get(dee.id)!.nameSet).toBe(true);
  });
});

describe('the view withholds (§3.5/§9.0a): blindness is the projection layer', () => {
  it('a running question shows a count and your own answer, never anybody else’s', () => {
    const { s, bo } = buildConstituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    s.answerMotion(4, 'ada', m, 'accept');
    s.answerMotion(5, bo, m, 'keep');
    const forCy = view(s, s.motionElectorate().find((id) => id !== 'ada' && id !== bo)!);
    const mv = forCy.motions.find((x) => x.id === m)!;
    expect(mv.answeredCount).toBe(2);   // only the count shows while it runs
    expect(mv.myAnswer).toBeNull();     // cy has not answered
    expect(JSON.stringify(mv)).not.toMatch(/accept|keep/); // no split, no names
    const forBo = view(s, bo);
    expect(forBo.motions.find((x) => x.id === m)!.myAnswer).toBe('keep'); // your own, always
  });

  it('resolutions publish the distribution without names', () => {
    const { s } = buildConstituted();
    const forBo = view(s, 'ada');
    const ending = forBo.resolutions.find((r) => r.setting === 'ending')!;
    expect(ending.value).toEqual({ endsAtMs: 1_000_000 });
    expect(ending.distribution.length).toBe(3);
    expect(JSON.stringify(ending)).not.toMatch(/ada|m-1|m-2/);
  });

  it('gates read per member; crown tasks only reach the convenor', () => {
    const { s, bo } = buildConstituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'title',
      value: { text: 'The Hollow Oak Charter' } });
    s.adjudicateOrdinaryMotion(4, m, 'carried'); // title reserved → 👑 question
    expect(view(s, 'ada').crownTasks.length).toBe(1);
    expect(view(s, bo).crownTasks.length).toBe(0);
    expect(view(s, bo).gates.judging).toBe(true);
    expect(view(s, bo).gates.proposing).toBe(true);
  });
});
