/**
 * Q440 and Q506 (2026-08-21): the Text is a held setting like any other,
 * and 🤝 Applications keeps its crown pair on the setting rather than
 * inside its value.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { EngineBridge } from '../src/engine-bridge.js';
import { ParticipantApi } from '../../engine-core/src/participant-api.js';
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

  it('both powers wait for the text to be confirmed — its own value (R-048)', () => {
    const s = openDoc();
    // the Text carries no managed value, so *has it been set* is *has it been
    // confirmed*: before that there is nothing to lay a power down over
    expect(() => s.relinquish(1, 'startingText', 'unilateral')).toThrow(/has no value yet/);
    expect(() => s.relinquish(1, 'startingText', 'assent')).toThrow(/has no value yet/);
    s.confirmStartingText(2, 'The clubhouse shall be kept open.');
    s.relinquish(3, 'startingText', 'assent');
    s.relinquish(3, 'startingText', 'unilateral');
    // both pending: the founder's hand is on the Text until 🍾 lays it down
    expect(s.settingState('startingText').powers).toEqual({ unilateral: true, assent: true });
    expect(s.settingState('startingText').pendingRelease)
      .toEqual({ unilateral: true, assent: true });
    expect(s.settingState('startingText').holder).toBe('convenor');
    s.reclaim(4, 'startingText');
    expect(s.settingState('startingText').powers).toEqual({ unilateral: true, assent: true });
    expect(s.settingState('startingText').pendingRelease)
      .toEqual({ unilateral: false, assent: false });
    expect(s.text).toBe('The clubhouse shall be kept open.'); // reclaim touches no value
  });

  it('the start lays the founder’s hand off the Text (🍾); a reserve motion is the road back', () => {
    const { s, bo, cy } = buildConstituted();
    // the start lays both powers down, derived at the fold — no event
    expect(s.settingState('startingText').powers).toEqual({ unilateral: false, assent: false });
    for (const id of ['title', 'link', 'pace', 'rate', 'machines', 'quorum', 'authorship',
      'judgments', 'applications', 'admission', 'removal', 'lapse'] as const) {
      s.delegate(3, id);
    }
    expect(s.crowned()).toBe(false); // nothing held anywhere, the Text and the doors included
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

/**
 * R-056 (Ed, 2026-08-27): a shielded Text **parks** an adoption, it does not
 * revert one. The engine never applies it; the 👑 question is the answer to
 * whether it ever will be. Driven through the bridge, which is the only
 * harness that exercises engine-core, the bridge and the crown record
 * together and needs no server.
 */
describe('🛡️ on the Text parks the adoption (R-056)', () => {
  const patch = (baseVersion: number, lines: string[]) =>
    ({ baseVersion, hunks: [{ start: 0, end: 1, lines }] });
  const START = 'The clubhouse shall be kept open.';

  /** A shielded document with one text proposal over the bar, parked. */
  function parked(opts: Parameters<typeof buildConstituted>[0] = {}, seed = 'park') {
    const { s, bo, cy } = buildConstituted(opts);
    reserveTextShield(s, bo, ['ada', cy], 2);
    const bridge = new EngineBridge(s, { t: 3, rngSeed: seed });
    const v0 = bridge.engine.currentVersion();
    const { id, raceId } = bridge.proposeText(10, bo, patch(v0, ['Open every day.']), 'nights too');
    const race = bridge.engine.races().find((r) => r.id === raceId)!;
    bridge.judge(20, cy, id, race.incumbentId, 'a');
    return { s, bo, cy, bridge, id, raceId };
  }
  const events = (bridge: EngineBridge) => bridge.engine.log.map((e) => e.event);
  const questionFor = (s: ConstitutionSession, id: string) =>
    [...s.crownQuestionRecords().values()].find((q) => q.text?.candidateId === id)!;

  it('parks rather than adopting: the document stands, the race is gone, the 👑 is asked', () => {
    const { s, bridge, id, raceId, bo } = parked();
    // the whole of the defect this closes: nothing was applied
    expect(bridge.engine.document()).toBe(START);
    expect(bridge.engine.getCandidate(id).state).toBe('awaiting-assent');
    const evs = events(bridge);
    expect(evs.some((e) => e.type === 'candidate-awaiting-assent' && e.id === id)).toBe(true);
    expect(evs.some((e) => e.type === 'adopted' && e.candidateId === id)).toBe(false);
    // the candidate left every feed for free: it is in no race
    expect(bridge.engine.races().some((r) => r.members.includes(id))).toBe(false);
    expect(bridge.engine.races().some((r) => r.id === raceId)).toBe(false);
    // and it is not the author's to pull back — the room has decided
    expect(() => bridge.withdrawText(21, bo, id)).toThrow(/not in play/);
    // the founder is asked, on a question that parks no motion
    const tasks = view(s, 'ada').crownTasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.motion).toBeNull();
    expect(tasks[0]!.text!.candidateId).toBe(id);
  });

  it('accept adopts, on the confidence the room decided at', () => {
    const { s, bridge, id, bo } = parked({}, 'assent-accept');
    const park = events(bridge).find((e) => e.type === 'candidate-awaiting-assent')!;
    bridge.answerCrownQuestion(21, questionFor(s, id).id, 'accept');
    expect(bridge.engine.document()).toBe('Open every day.');
    expect(bridge.engine.getCandidate(id).state).toBe('adopted');
    const adopted = events(bridge).find((e) => e.type === 'adopted' && e.candidateId === id)!;
    expect(adopted).toMatchObject({ p: park.p, threshold: park.threshold });
    // the performance refund was paid: bo is better off than the bare stake
    expect(bridge.engine.balance(bo, 22)).toBeGreaterThan(3);
  });

  it('refuse retires it as a failed proposal at refund 0, with the reason on the record', () => {
    const { s, bridge, id, bo } = parked({}, 'assent-refuse');
    const before = bridge.engine.balance(bo, 21);
    bridge.answerCrownQuestion(21, questionFor(s, id).id, 'reject');
    expect(bridge.engine.document()).toBe(START);
    expect(bridge.engine.getCandidate(id).state).toBe('retired');
    const retired = events(bridge)
      .find((e) => e.type === 'candidate-retired' && e.id === id)!;
    expect(retired.refund).toBe(0);
    expect(retired.reason).toMatch(/^Proposal refused by .+ 🛡️$/);
    // a stake that came back would price a refusal as a withdrawal
    expect(bridge.engine.balance(bo, 22)).toBe(before);
    // and it is what the author reads on their sealed record
    const out = new ParticipantApi(bridge.engine, bo).outcomes()
      .find((o) => o.candidateId === id)!;
    expect(out.outcome).toBe('retired');
    expect(out.reason).toMatch(/🛡️/);
  });

  it('a sleeping crown grants, and the engine follows', () => {
    const { s, bridge, id } = parked({ lapse: { afterMs: 100 } }, 'assent-lapse');
    expect(bridge.engine.document()).toBe(START);
    s.tick(20 + 1000);          // the crown lapses; the question auto-passes
    expect(s.crownQuestionRecords().get(questionFor(s, id).id)!.status).toBe('auto-passed');
    bridge.tick(20 + 1000);     // and the engine hears it in the cursor walk
    expect(bridge.engine.document()).toBe('Open every day.');
    expect(bridge.engine.getCandidate(id).state).toBe('adopted');
  });

  it('pending at the close: undecided in the engine, carried-but-unassented on the record', () => {
    const { s, bridge, id } = parked({}, 'assent-close');
    bridge.close(1_000_000);
    const und = events(bridge)
      .find((e) => e.type === 'candidate-undecided' && e.id === id)!;
    expect(und.refund).toBe(0);
    expect(bridge.engine.getCandidate(id).state).toBe('undecided');
    expect(bridge.engine.document()).toBe(START);
    expect(s.crownQuestionRecords().get(questionFor(s, id).id)!.status).toBe('failed-closed');
    expect(bridge.closeRecord().carriedButUnassented.some((c) => c.candidateId === id)).toBe(true);
  });

  it('the constitution log gains no new event kind, so a replay is bit-identical', () => {
    const { s, bridge, id } = parked({}, 'assent-replay');
    bridge.answerCrownQuestion(21, questionFor(s, id).id, 'accept');
    const r = ConstitutionSession.replay([...s.logEntries()]);
    expect(r.rollingHash()).toBe(s.rollingHash());
  });

  it('no shield, no change: the ordinary path is what it was', () => {
    const { s, bo, cy } = buildConstituted();
    expect(s.textAdoptionNeedsAssent()).toBe(false);
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'assent-none' });
    const { id, raceId } = bridge.proposeText(10, bo,
      patch(bridge.engine.currentVersion(), ['Open every day.']), '');
    bridge.judge(20, cy, id, bridge.engine.races().find((r) => r.id === raceId)!.incumbentId, 'a');
    expect(bridge.engine.document()).toBe('Open every day.');
    expect(bridge.engine.getCandidate(id).state).toBe('adopted');
    expect(events(bridge).some((e) => e.type === 'candidate-awaiting-assent')).toBe(false);
    expect(view(s, 'ada').crownTasks).toHaveLength(0);
  });
});

describe('🤝 keeps its crown pair on the setting (Q506)', () => {
  it('a legacy value’s holder folds onto the powers and leaves the value', () => {
    const { s } = buildConstituted({
      applications: { holder: 'reserved-unilateral', joinPolicy: 'invite' } });
    expect(s.settingState('applications').value).toEqual({ apply: false });
    expect(s.settingState('applications').powers).toEqual({ unilateral: true, assent: false });
    expect(s.registerPowers()).toEqual({ unilateral: true, assent: false });
    expect(s.membershipReserved()).toBe(true);
    const bo = view(s, 'bo');
    expect(bo.register.powers).toEqual({ unilateral: true, assent: false });
    expect(bo.settings.find((x) => x.setting === 'applications')!.powers)
      .toEqual({ unilateral: true, assent: false });
  });

  it('new style: the policy is the value and the pair changes like any setting’s — the door apart', () => {
    const { s, bo, cy } = buildConstituted({ applications: { apply: false },
      doors: { invite: { unilateral: true, assent: true } } });
    // buildConstituted reclaims before it sets, so both powers are held
    expect(s.settingState('applications').powers).toEqual({ unilateral: true, assent: true });
    s.invite(3, 'dee@example.org'); // the pen on the door: a direct invitation
    s.relinquish(3, 'applications', 'unilateral');
    s.relinquish(4, 'applications', 'assent');
    expect(s.settingState('applications').holder).toBe('members');
    // 🤝's pair is the policy's alone (entry 94): the door still invites
    expect(s.doorPowers('door:invite')).toEqual({ unilateral: true, assent: true });
    expect(() => s.invite(4, 'eve@example.org')).not.toThrow();
    // the road back is a reserve motion on the setting itself
    const m = s.openMotion(5, bo, { kind: 'reserve', setting: 'applications' });
    s.answerMotion(6, 'ada', m, 'accept');
    s.answerMotion(7, cy, m, 'accept');
    expect(s.settingState('applications').powers).toEqual({ unilateral: true, assent: true });
  });

  it('an old log and a fresh session reach the same state', () => {
    const legacy = buildConstituted({
      applications: { holder: 'reserved-assent', joinPolicy: 'apply' } }).s;
    const replayed = ConstitutionSession.replay([...legacy.logEntries()]);
    // a legacy holder was the register's crown, so it folds onto ✉️ too
    const fresh = buildConstituted({ applications: { apply: true },
      doors: { invite: { unilateral: false, assent: true } } }).s;
    fresh.relinquish(3, 'applications', 'unilateral');
    const pick = (x: ConstitutionSession) => {
      const st = x.settingState('applications');
      return { value: st.value, powers: st.powers, holder: st.holder, rp: x.registerPowers() };
    };
    expect(pick(replayed)).toEqual(pick(legacy));
    expect(pick(replayed)).toEqual(pick(fresh));
    expect(replayed.rollingHash()).toBe(legacy.rollingHash());
  });

  it('handing the setting over leaves the door crowned (entry 94: two pairs)', () => {
    const { s } = buildConstituted({
      applications: { holder: 'reserved', joinPolicy: 'invite' } });
    expect(s.doorPowers('door:invite')).toEqual({ unilateral: true, assent: true });
    s.delegate(3, 'applications');
    expect(s.settingState('applications').powers).toEqual({ unilateral: false, assent: false });
    expect(s.doorPowers('door:invite')).toEqual({ unilateral: true, assent: true });
    expect(s.settingState('applications').value).toEqual({ apply: false });
  });
});
