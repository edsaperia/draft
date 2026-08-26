/**
 * The two crown powers (§9.7 v0.54): reservation is unilateral change and
 * assent, held and relinquished separately.
 *
 * Since R-048 (Ed, 2026-08-25) both are laid down on one clock: **once the
 * setting has a value**, either may go, and a release made before the start
 * is *pending* — recorded when it is made, effective at 🍾, revisable by
 * `reclaim` until then. The road back after the start is the reserve motion,
 * which may name one power.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { buildConstituted } from './helpers.js';

/**
 * A document one press short of beginning, with every setting the founder's
 * and every one of them set — which is what a pre-start release needs
 * (R-048), and what `buildConstituted` cannot give, having already begun.
 */
const readyToBegin = (): ConstitutionSession => {
  const s = ConstitutionSession.open({
    title: 'T', slug: 't',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  s.arrive(1, bo);
  s.confirmStartingText(1, 'x');
  const values = {
    ending: { endsAtMs: 1_000_000 }, bar: { pct: 66 }, chamber: { rung: 'link' },
    rate: { grant: 4, cap: 8, dripMinutes: 240 }, pace: { shape: 'fixed' },
    quorum: { form: 'share', n: 60 }, authorship: { rung: 'sealed' },
    judgments: { rung: 'after' }, applications: { apply: false },
    admission: { price: 'assembly' },
    removal: { price: 'consent' }, machines: { enabled: false, budget: 0 },
    lapse: { afterMs: null },
  };
  for (const [id, v] of Object.entries(values)) s.setSetting(1, id as never, v as never);
  return s;
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
    // pending, not gone: the shield is still the founder's until 🍾 (R-048)
    expect(s.settingState('rate').powers).toEqual({ unilateral: true, assent: true });
    expect(s.settingState('rate').pendingRelease)
      .toEqual({ unilateral: false, assent: true });
    // the founder changes their mind before anything has started
    s.reclaim(3, 'rate');
    const st = s.settingState('rate');
    expect(st.powers).toEqual({ unilateral: true, assent: true });
    expect(st.pendingRelease).toEqual({ unilateral: false, assent: false });
    expect(st.holder).toBe('convenor');
    // the value the founder set is untouched — only the power came back
    expect(st.value).toEqual({ grant: 4, cap: 8, dripMinutes: 240 });
    expect(st.settledBy).toBe('convenor');
  });

  it('post-start, reclaim is refused — relinquishment has become one-way', () => {
    const { s } = buildConstituted();
    s.relinquish(3, 'rate', 'assent');
    expect(() => s.reclaim(4, 'rate')).toThrow();
  });
});

describe('a power may be laid down as soon as the setting has a value (R-048)', () => {
  it('an unset setting refuses both powers — there is nothing to hand over', () => {
    const s = ConstitutionSession.open({
      title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    expect(() => s.relinquish(0, 'rate', 'assent')).toThrow(/has no value yet/);
    expect(() => s.relinquish(0, 'rate', 'unilateral')).toThrow(/has no value yet/);
    expect(s.settingState('rate').powers).toEqual({ unilateral: true, assent: true });
    // the title was set at the birth, so it is relinquishable from the birth
    s.relinquish(0, 'title', 'unilateral');
    expect(s.settingState('title').pendingRelease)
      .toEqual({ unilateral: true, assent: false });
  });

  it('a pre-start release is spent at 🍾, and nothing moves before it', () => {
    const s = readyToBegin();
    s.relinquish(2, 'rate', 'assent');
    // still the founder's hand, all the way to the press
    expect(s.settingState('rate').powers).toEqual({ unilateral: true, assent: true });
    expect(s.crowned()).toBe(true);
    s.begin(3);
    expect(s.settingState('rate').powers).toEqual({ unilateral: true, assent: false });
    expect(s.settingState('rate').pendingRelease)
      .toEqual({ unilateral: false, assent: false });
    expect(s.settingState('rate').holder).toBe('convenor');
    // and the log replays to the same state, the release being an event
    const r = ConstitutionSession.replay(s.logEntries().slice());
    expect(r.rollingHash()).toBe(s.rollingHash());
    expect(r.settingState('rate').powers).toEqual({ unilateral: true, assent: false });
  });

  it('a pending release is undone by a pre-start reclaim, and the start finds nothing', () => {
    const s = readyToBegin();
    s.relinquish(2, 'rate', 'unilateral');
    s.reclaim(2, 'rate');
    expect(s.settingState('rate').pendingRelease)
      .toEqual({ unilateral: false, assent: false });
    s.begin(3);
    expect(s.settingState('rate').powers).toEqual({ unilateral: true, assent: true });
    // the value the founder set is untouched by either act
    expect(s.settingState('rate').value).toEqual({ grant: 4, cap: 8, dripMinutes: 240 });
  });

  it('both powers pending on a non-delegable setting hand it over at the start', () => {
    // 🪶 the title takes no founding question, so neither release is a
    // delegation — the pair is spent together at 🍾 as a hand-over
    const s = readyToBegin();
    s.relinquish(2, 'title', 'unilateral');
    s.relinquish(2, 'title', 'assent');
    expect(s.settingState('title').holder).toBe('convenor'); // still, until 🍾
    s.begin(3);
    const st = s.settingState('title');
    expect(st.holder).toBe('members');
    expect(st.powers).toEqual({ unilateral: false, assent: false });
    expect(st.value).toEqual({ text: 'T' }); // the value stands: a hand-over
  });

  it('a carried motion on a unilateral-only setting applies with nobody asked', () => {
    const { s: cs, bo, cy } = buildConstituted();
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

describe('giving up unilateral change', () => {
  it('leaves assent standing, and a carried change waits on the crown', () => {
    const { s: cs, bo } = buildConstituted();
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
    const { s, bo } = buildConstituted();
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
    const { s, bo, cy } = buildConstituted();
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
    const { s, bo } = buildConstituted();
    expect(() => s.openMotion(10, bo, { kind: 'reserve', setting: 'rate', power: 'assent' }))
      .toThrow(/already the convenor's/);
  });
});

describe("the register's powers (Ed's own example, §9.7½ v0.54)", () => {
  it('reserved-unilateral: the founder invites directly, carried motions need no accept', () => {
    const { s, bo, cy } = buildConstituted({
      applications: { holder: 'reserved-unilateral', apply: false },
    });
    const dee = s.invite(10, 'dee@example.org'); // unilateral invite, post-start
    expect(typeof dee).toBe('string');
    const m = s.openMotion(20, bo, { kind: 'invite', email: 'eve@example.org' }, 'eve chairs the sister club');
    s.answerMotion(21, 'ada', m, 'accept');
    s.answerMotion(22, cy, m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(crownQuestionFor(s, m)).toBeUndefined(); // no assent power on the register
  });

  it('reserved-assent: no direct invite, and a carried invitation waits on the crown', () => {
    const { s, bo, cy } = buildConstituted({
      applications: { holder: 'reserved-assent', apply: false },
    });
    expect(() => s.invite(10, 'dee@example.org'))
      .toThrow(/motion at 🪪/);
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
    const { s, bo } = buildConstituted();
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
    // exactly as the delegate verb always did — one state, one meaning. It
    // takes effect at once, unlike a lone release (R-048): a question that
    // waited for the start would never be collected.
    s.relinquish(3, 'rate', 'unilateral');
    const st = s.settingState('rate');
    expect(st.holder).toBe('members');
    expect(st.powers).toEqual({ unilateral: false, assent: false });
    expect(st.pendingRelease).toEqual({ unilateral: false, assent: false });
    expect(st.collecting).toBe(true);
    expect(st.value).toBeNull();
  });

  it('the shortcut is symmetric — the press order does not decide it (R-048)', () => {
    const s = ConstitutionSession.open({
      title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    s.setSetting(1, 'rate', { grant: 4, cap: 8, dripMinutes: 240 });
    s.relinquish(2, 'rate', 'unilateral');   // the pen first, this time
    expect(s.settingState('rate').holder).toBe('convenor');
    s.relinquish(3, 'rate', 'assent');
    const st = s.settingState('rate');
    expect(st.holder).toBe('members');
    expect(st.collecting).toBe(true);
  });

  it('post-start, giving up the second power hands the settled value over', () => {
    const { s } = buildConstituted();
    s.relinquish(3, 'rate', 'assent');
    s.relinquish(4, 'rate', 'unilateral');
    const st = s.settingState('rate');
    expect(st.holder).toBe('members');
    // no question to open past the start: the value stands, only the
    // holder changed — the same hand-over the delegate verb performs
    expect(st.value).toEqual({ grant: 4, cap: 8, dripMinutes: 240 });
  });
});
