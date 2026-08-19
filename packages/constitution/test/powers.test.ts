/**
 * The two crown powers (§9.7 v0.54): reservation is unilateral change and
 * assent, held and relinquished separately. Assent may be given up from
 * creation; unilateral change only once proposing opens (Ed, 2026-08-19,
 * corrected the same day — the assent-only state is inert before the
 * start). The road back is the reserve motion, which may name one power.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import type { ApplicationsValue } from '../src/values.js';

/** A constituted three-member document: ada (convenor-member), bo, cy. */
const constituted = (apps: ApplicationsValue = { holder: 'members', joinPolicy: 'invite' }) => {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  const cy = s.invite(1, 'cy@example.org');
  s.arrive(1, bo);
  s.arrive(1, cy);
  for (const q of ['ending', 'bar', 'chamber'] as const) {
    for (const m of ['ada', bo, cy]) {
      s.answer(1, m, q,
        q === 'ending' ? { endsAtMs: 1_000_000 }
          : q === 'bar' ? { pct: 66 } : { rung: 'link' });
    }
  }
  const values = {
    pace: { shape: 'fixed' },
    quorum: { form: 'share', n: 60 },
    authorship: { rung: 'sealed' },
    signing: { rung: 'each' },
    judgments: { rung: 'after' },
    applications: apps,
    machines: { enabled: false, budget: 0 },
    lapse: { afterMs: null },
  } as const;
  s.confirmStartingText(2, 'The clubhouse shall be kept open.');
  // rate stays reserved (ordinary default): ada holds both powers on it
  s.setSetting(2, 'rate', { grant: 4, cap: 8, dripMinutes: 240 });
  for (const [id, v] of Object.entries(values)) {
    s.reclaim(2, id as never);
    s.setSetting(2, id as never, v as never);
  }
  expect(s.constitutedAtT).toBe(2);
  return { s, bo, cy };
};

const crownQuestionFor = (s: ConstitutionSession, motion: string) =>
  (s.logEntries().map((e) => e.event)
    .find((e) => e.type === 'crown-question-opened' &&
      (e as { motion: string }).motion === motion) as { question: string } | undefined);

describe('pre-start, powers are as revisable as values (§9.6a)', () => {
  it('reclaim restores a relinquished power without touching the set value', () => {
    const s = ConstitutionSession.open({
      title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    s.setSetting(1, 'rate', { grant: 4, cap: 8, dripMinutes: 240 });
    s.relinquish(2, 'rate', 'assent');
    expect(s.settingState('rate').powers).toEqual({ unilateral: true, assent: false });
    // the founder changes their mind before anything has started
    s.reclaim(3, 'rate');
    const st = s.settingState('rate');
    expect(st.powers).toEqual({ unilateral: true, assent: true });
    expect(st.holder).toBe('convenor');
    // the value the founder set is untouched — only the power came back
    expect(st.value).toEqual({ grant: 4, cap: 8, dripMinutes: 240 });
    expect(st.settledBy).toBe('convenor');
  });

  it('post-start, reclaim is refused — relinquishment has become one-way', () => {
    const { s } = constituted();
    s.relinquish(3, 'rate', 'assent');
    expect(() => s.reclaim(4, 'rate')).toThrow();
  });
});

describe('giving up assent alone (available from creation)', () => {
  it('a carried motion on a unilateral-only setting applies with nobody asked', () => {
    const s = ConstitutionSession.open({
      title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    // before the text even confirms — assent may go from creation
    s.relinquish(0, 'rate', 'assent');
    expect(s.settingState('rate').powers).toEqual({ unilateral: true, assent: false });
    expect(s.settingState('rate').holder).toBe('convenor'); // still held

    const { s: cs, bo, cy } = constituted();
    cs.relinquish(3, 'rate', 'assent');
    const m = cs.openMotion(10, bo, {
      kind: 'set', setting: 'rate', value: { grant: 6, cap: 8, dripMinutes: 240 },
    });
    cs.adjudicateOrdinaryMotion(20, m, 'carried');
    // no 👑 question: the assent power is not held (§9.7 v0.54)
    expect(cs.motionRecords().get(m)!.status).toBe('carried');
    expect(crownQuestionFor(cs, m)).toBeUndefined();
    expect(cs.settingState('rate').value).toEqual({ grant: 6, cap: 8, dripMinutes: 240 });
    // and the founder may still act alone — unilateral is still theirs
    cs.setSetting(30, 'rate', { grant: 5, cap: 8, dripMinutes: 240 });
    expect(cs.settingState('rate').value).toEqual({ grant: 5, cap: 8, dripMinutes: 240 });
    void cy;
  });
});

describe('giving up unilateral change (waits until proposing opens)', () => {
  it('is refused before the text confirms, and afterwards leaves assent standing', () => {
    const s = ConstitutionSession.open({
      title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    expect(() => s.relinquish(0, 'rate', 'unilateral'))
      .toThrow(/waits until proposing opens/);

    const { s: cs, bo } = constituted();
    cs.relinquish(3, 'rate', 'unilateral');
    expect(cs.settingState('rate').powers).toEqual({ unilateral: false, assent: true });
    // the founder can no longer move it alone…
    expect(() => cs.setSetting(4, 'rate', { grant: 9, cap: 9, dripMinutes: 240 }))
      .toThrow(/propose like a member/);
    // …and a change the members carry still waits on their accept
    const m = cs.openMotion(10, bo, {
      kind: 'set', setting: 'rate', value: { grant: 6, cap: 8, dripMinutes: 240 },
    });
    cs.adjudicateOrdinaryMotion(20, m, 'carried');
    expect(cs.motionRecords().get(m)!.status).toBe('awaiting-crown');
    const q = crownQuestionFor(cs, m)!;
    cs.answerCrownQuestion(30, q.question, 'accept');
    expect(cs.settingState('rate').value).toEqual({ grant: 6, cap: 8, dripMinutes: 240 });
    expect(cs.settingState('rate').settledBy).toBe('crown');
  });

  it('giving up the last power is a hand-over', () => {
    const { s, bo } = constituted();
    s.relinquish(3, 'rate', 'assent');
    s.relinquish(4, 'rate', 'unilateral');
    expect(s.settingState('rate').holder).toBe('members');
    expect(s.settingState('rate').powers).toEqual({ unilateral: false, assent: false });
    const m = s.openMotion(10, bo, {
      kind: 'set', setting: 'rate', value: { grant: 6, cap: 8, dripMinutes: 240 },
    });
    s.adjudicateOrdinaryMotion(20, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.settingState('rate').value).toEqual({ grant: 6, cap: 8, dripMinutes: 240 });
  });
});

describe('the road back may restore one power (Q394)', () => {
  it('a reserve motion naming assent crowns assent alone', () => {
    const { s, bo, cy } = constituted();
    s.delegate(3, 'title'); // hand-over: the value stands, the holder flips
    expect(s.settingState('title').holder).toBe('members');
    const m = s.openMotion(10, bo, { kind: 'reserve', setting: 'title', power: 'assent' });
    expect(s.motionRecords().get(m)!.route).toBe('constitutional');
    s.answerMotion(11, 'ada', m, 'accept');
    s.answerMotion(12, cy, m, 'accept'); // bo stood at accept from the open
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.settingState('title').powers).toEqual({ unilateral: false, assent: true });
    expect(s.crowned()).toBe(true); // either power held marks the 👑
    // assent without unilateral: the founder still cannot re-title alone
    expect(() => s.setSetting(20, 'title', { text: 'Renamed' }))
      .toThrow(/propose like a member/);
  });

  it('a reserve motion for a power already held is refused', () => {
    const { s, bo } = constituted();
    expect(() => s.openMotion(10, bo, { kind: 'reserve', setting: 'rate', power: 'assent' }))
      .toThrow(/already the convenor's/);
  });
});

describe("the register's powers (Ed's own example, §9.7½ v0.54)", () => {
  it('reserved-unilateral: the founder invites directly, carried motions need no accept', () => {
    const { s, bo, cy } = constituted({ holder: 'reserved-unilateral', joinPolicy: 'invite' });
    const dee = s.invite(10, 'dee@example.org'); // unilateral invite, post-start
    expect(typeof dee).toBe('string');
    const m = s.openMotion(20, bo, { kind: 'invite', email: 'eve@example.org' }, 'eve chairs the sister club');
    s.answerMotion(21, 'ada', m, 'accept');
    s.answerMotion(22, cy, m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(crownQuestionFor(s, m)).toBeUndefined(); // no assent power on the register
  });

  it('reserved-assent: no direct invite, and a carried invitation waits on the crown', () => {
    const { s, bo, cy } = constituted({ holder: 'reserved-assent', joinPolicy: 'invite' });
    expect(() => s.invite(10, 'dee@example.org'))
      .toThrow(/constitutional motion/);
    const m = s.openMotion(20, bo, { kind: 'invite', email: 'eve@example.org' }, 'eve chairs the sister club');
    s.answerMotion(21, 'ada', m, 'accept');
    s.answerMotion(22, cy, m, 'accept');
    const q = crownQuestionFor(s, m)!;
    expect(q).toBeDefined();
    s.answerCrownQuestion(30, q.question, 'accept');
    const invited = [...s.memberRecords().values()].find((r) => r.email === 'eve@example.org');
    expect(invited).toBeDefined();
  });
});

describe('replay (§11)', () => {
  it('reproduces a session with power events bit-identically', () => {
    const { s, bo } = constituted();
    s.relinquish(3, 'rate', 'assent');
    s.delegate(4, 'title');
    const m = s.openMotion(10, bo, { kind: 'reserve', setting: 'title', power: 'unilateral' });
    s.answerMotion(11, 'ada', m, 'accept');
    const r = ConstitutionSession.replay(s.logEntries().slice());
    expect(r.rollingHash()).toBe(s.rollingHash());
    expect(r.settingState('rate').powers).toEqual({ unilateral: true, assent: false });
    expect(r.settingState('title').powers).toEqual(s.settingState('title').powers);
  });
});

describe('delegation is the state of holding no powers (Q403, Ed 2026-08-19)', () => {
  it('pre-start, giving up the second power on a delegable setting IS delegation', () => {
    const s = ConstitutionSession.open({
      title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    s.setSetting(1, 'rate', { grant: 4, cap: 8, dripMinutes: 240 });
    s.relinquish(2, 'rate', 'assent');
    // the second power going pre-start opens the blind founding question,
    // exactly as the delegate verb always did — one state, one meaning
    s.relinquish(3, 'rate', 'unilateral');
    const st = s.settingState('rate');
    expect(st.holder).toBe('members');
    expect(st.powers).toEqual({ unilateral: false, assent: false });
    expect(st.collecting).toBe(true);
    expect(st.value).toBeNull();
  });

  it('pre-start, unilateral alone still waits — the assent-only state is inert', () => {
    const s = ConstitutionSession.open({
      title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    // assent still held: not a delegation, and proposing has not opened
    expect(() => s.relinquish(1, 'rate', 'unilateral'))
      .toThrow(/waits until proposing opens/);
  });

  it('post-start, giving up the second power hands the settled value over', () => {
    const { s } = constituted();
    s.relinquish(3, 'rate', 'assent');
    s.relinquish(4, 'rate', 'unilateral');
    const st = s.settingState('rate');
    expect(st.holder).toBe('members');
    // no question to open past the start: the value stands, only the
    // holder changed — the same hand-over the delegate verb performs
    expect(st.value).toEqual({ grant: 4, cap: 8, dripMinutes: 240 });
  });
});
