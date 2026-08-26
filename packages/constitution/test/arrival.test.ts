/**
 * The arrival record and the power source (Q524, Ed 2026-08-21).
 *
 * A grant card says who conferred the power, and until this it *guessed*:
 * 🏛️ read who currently holds the roster, which is a different question from
 * how this member got in and gives the wrong answer the moment the roster
 * changes hands after somebody arrived. Both facts fold from events the log
 * already carried, so nothing here changes the hash chain — the golden log
 * is the assertion of that, and it is untouched.
 */
import { describe, it, expect } from 'vitest';
import { buildConstituted } from './helpers.js';
import { ConstitutionSession } from '../src/session.js';

describe('how a member got in (Q524)', () => {
  it('the convenor was there from the first moment, and nobody let them in', () => {
    const { s } = buildConstituted();
    expect(s.memberRecords().get('ada')!.arrival).toEqual({ via: 'founding', by: null });
  });

  it('a clerk who later ticks themselves a member arrives by the founding too', () => {
    const s = ConstitutionSession.open({
      title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: false },
    }, 0);
    expect(s.memberRecords().has('ada')).toBe(false);
    s.setConvenorMembership(1, true);
    expect(s.memberRecords().get('ada')!.arrival).toEqual({ via: 'founding', by: null });
  });

  it('the founder inviting directly is the convenor’s own act', () => {
    const { s, bo } = buildConstituted();
    expect(s.memberRecords().get(bo)!.arrival).toEqual({ via: 'invitation', by: 'convenor' });
  });

  it('an invitation carried as a motion is the membership’s act', () => {
    const { s, bo, cy } = buildConstituted();
    const m = s.openMotion(3, bo, { kind: 'invite', email: 'dee@example.org' });
    s.answerMotion(4, 'ada', m, 'accept');
    s.answerMotion(5, cy, m, 'accept');   // bo stands at accept from the open
    const dee = [...s.memberRecords().values()].find((r) => r.email === 'dee@example.org')!;
    expect(dee.arrival).toEqual({ via: 'invitation', by: 'members' });
    // and the two roads stay distinguishable on one roster
    expect(s.memberRecords().get(bo)!.arrival.by).toBe('convenor');
  });

  it('an admitted applicant came in on their own application, by the membership', () => {
    const { s } = buildConstituted({
      applications: { holder: 'members', apply: true }, membership: { price: 'proposal' } });
    const ap = s.startApplication(3, 'dee@example.org');
    s.verifyApplication(4, ap);
    s.submitApplication(5, ap, { name: 'Dee', words: 'I keep bees.' });
    s.adjudicateOrdinaryMotion(6, s.applicantRecords().get(ap)!.motion!, 'carried');
    const dee = [...s.memberRecords().values()].find((r) => r.email === 'dee@example.org')!;
    expect(dee.arrival).toEqual({ via: 'application', by: 'members' });
  });

  it('replay reproduces the arrival record', () => {
    const { s } = buildConstituted();
    const again = ConstitutionSession.replay([...s.logEntries()]);
    for (const [id, rec] of s.memberRecords()) {
      expect(again.memberRecords().get(id)!.arrival).toEqual(rec.arrival);
    }
  });
});

describe('where a held power came from (Q524)', () => {
  it('both powers are the convenor’s by construction at the birth', () => {
    const { s } = buildConstituted();
    expect(s.settingState('title').powerFrom)
      .toEqual({ unilateral: 'founding', assent: 'founding' });
  });

  it('a power given up loses its source with it', () => {
    const { s } = buildConstituted();
    s.delegate(3, 'title');
    expect(s.settingState('title').powerFrom)
      .toEqual({ unilateral: null, assent: null });
  });

  it('a carried reserve motion is the one source that is not the birth', () => {
    const { s, bo, cy } = buildConstituted();
    s.delegate(3, 'title');
    const m = s.openMotion(10, bo, { kind: 'reserve', setting: 'title', power: 'assent' });
    s.answerMotion(11, 'ada', m, 'accept');
    s.answerMotion(12, cy, m, 'accept');
    expect(s.settingState('title').powerFrom)
      .toEqual({ unilateral: null, assent: 'motion' });
  });

  it('a power already held keeps the source it arrived with', () => {
    const { s } = buildConstituted();
    // relinquishing assent must not restamp the pen the founder never let go
    s.relinquish(3, 'title', 'assent');
    expect(s.settingState('title').powerFrom)
      .toEqual({ unilateral: 'founding', assent: null });
  });

  it('replay reproduces the power source', () => {
    const { s, bo, cy } = buildConstituted();
    s.delegate(3, 'title');
    const m = s.openMotion(10, bo, { kind: 'reserve', setting: 'title', power: 'assent' });
    s.answerMotion(11, 'ada', m, 'accept');
    s.answerMotion(12, cy, m, 'accept');
    const again = ConstitutionSession.replay([...s.logEntries()]);
    expect(again.settingState('title').powerFrom).toEqual(s.settingState('title').powerFrom);
  });
});
