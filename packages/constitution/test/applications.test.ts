import { describe, expect, it } from 'vitest';
import { buildConstituted } from './helpers.js';
import { view } from '../src/view.js';

describe('applications (§9.7½, entry 94): one switch, 🪪’s price, one identity rule', () => {
  it('invitation only refuses the front door', () => {
    const { s } = buildConstituted(); // apply: false
    expect(() => s.startApplication(3, 'dee@example.org')).toThrow(/invitation-only/);
  });

  it('a member address is told to log in instead — one address, one member', () => {
    const { s } = buildConstituted({
      applications: { holder: 'members', apply: true }, membership: { price: 'proposal' } });
    expect(() => s.startApplication(3, 'bo@example.org')).toThrow(/log in/);
  });

  it('at ✏️: verified before anything can be submitted; straight to the bar, free', () => {
    const { s } = buildConstituted({
      applications: { holder: 'members', apply: true }, membership: { price: 'proposal' } });
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
      applications: { holder: 'members', apply: true }, membership: { price: 'proposal' } });
    const ap = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, ap);
    s.submitApplication(5, ap); // an empty application is a real application
    s.adjudicateOrdinaryMotion(6, s.applicantRecords().get(ap)!.motion!, 'held');
    expect(s.applicantRecords().get(ap)!.status).toBe('refused');
    expect(s.E()).toBe(3);
  });

  it('at 🏛️: the application is its own constitutional motion, nobody’s mover, free', () => {
    const { s, bo, cy } = buildConstituted({
      applications: { holder: 'members', apply: true } }); // 🪪 at assembly by default
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

  it('a legacy log’s `open` folds to the door open at ✒️ (entry 94)', () => {
    const { s } = buildConstituted({
      applications: { holder: 'members', joinPolicy: 'open' } });
    expect(s.settingState('applications').value).toEqual({ apply: true });
    // buildConstituted set 🪪 to assembly before 🤝, so the legacy seed does
    // not override a standing value — the migration only fills an empty one
    expect(s.settingState('membership').value).toEqual({ price: 'assembly' });
  });

  it('open: 🤝 yes and 🪪 at ✒️ — anyone with the link joins on arrival, identity still verified', () => {
    const { s } = buildConstituted({
      applications: { holder: 'members', apply: true }, membership: { price: 'pen' } });
    const ap = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, ap);
    s.submitApplication(5, ap, { name: 'Dee' });
    expect(s.applicantRecords().get(ap)!.status).toBe('admitted');
    expect(s.E()).toBe(4);
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
