import { describe, expect, it } from 'vitest';
import { buildConstituted } from './helpers.js';
import { view } from '../src/view.js';

/**
 * **The data the *Applicants* subsection renders from** (entry 96, Q900).
 *
 * The admit judgment used to hang off the 🪪 card's clause; entry 94 re-typed
 * 🪪 into a price and the judging was left behind with no caller at all, so an
 * application could be submitted to a live document and no member could ever
 * judge it. It stands on its own subsection now, one card per person asking,
 * in whatever form 🪪's price gives it — and what the page builds those cards
 * from is exactly this: the asking applicants in `view.applicants`, and the
 * admit motion each one opened.
 *
 * This is the module half of that guard. The browser half — that the cards
 * reach the pile and open — is not covered by any walk yet.
 */
describe('entry 96: what the Applicants pile is built from', () => {
  it('at 🪪 proposal an asking applicant carries a running ordinary admit motion', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'proposal' } });
    const id = s.startApplication(3, 'rowan@example.org');
    s.verifyApplication(4, id);
    s.submitApplication(5, id, { name: 'Rowan Vale', words: 'I bake.' });
    const v = view(s, 'ada');
    const asking = (v.applicants ?? [])
      .filter((a) => a.status !== 'admitted' && a.status !== 'refused');
    expect(asking).toHaveLength(1);
    expect(asking[0]!.name).toBe('Rowan Vale');
    expect(asking[0]!.id).toBe(id);
    const admit = s.motionRecords().get(s.applicantRecords().get(id)!.motion!)!;
    expect(admit.route).toBe('ordinary');
    expect(admit.status).toBe('running');
  });

  it('at 🪪 assembly the same application is a constitutional question', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'assembly' } });
    const id = s.startApplication(3, 'rowan@example.org');
    s.verifyApplication(4, id);
    s.submitApplication(5, id, { name: 'Rowan Vale' });
    const admit = s.motionRecords().get(s.applicantRecords().get(id)!.motion!)!;
    expect(admit.route).toBe('constitutional');
  });

  // **What the applicant's own readout counts** (entry 138). *Submitted. N of
  // E have judged it* used to count the roster rows marked on 🪪's setting
  // key, which entry 96 moved every admit motion off; it counts on the
  // motion now, and at `assembly` that number is exactly this field — the
  // page reads it as `rec.answers.size`, and the remote shim serves the same
  // number as `answeredCount`. At `proposal` this field is 0 by design: an
  // ordinary motion is a race and a race is blind (§9.0a), so the page counts
  // its own marker there and nothing here should be "fixed" to fill it.
  it('at 🪪 assembly an answered admit motion is counted on the record', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'assembly' } });
    const id = s.startApplication(3, 'rowan@example.org');
    s.verifyApplication(4, id);
    s.submitApplication(5, id, { name: 'Rowan Vale' });
    const motionId = s.applicantRecords().get(id)!.motion!;
    s.answerMotion(6, 'ada', motionId, 'accept');
    const m = view(s, 'ada').motions.find((x) => x.id === motionId)!;
    expect(m.route).toBe('constitutional');
    expect(m.answeredCount).toBe(1);
  });

  // at `pen` the act is its own consent, so there is nothing to ask anybody
  // and the subsection carries no card at all
  it('at 🪪 pen the applicant is admitted on submit, with no motion to judge', () => {
    const { s } = buildConstituted({
      applications: { apply: true }, admission: { price: 'pen' } });
    const id = s.startApplication(3, 'rowan@example.org');
    s.verifyApplication(4, id);
    s.submitApplication(5, id, { name: 'Rowan Vale' });
    expect(s.applicantRecords().get(id)!.status).toBe('admitted');
    expect(s.applicantRecords().get(id)!.motion).toBeFalsy();
  });
});
