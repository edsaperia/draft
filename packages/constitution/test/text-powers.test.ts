/**
 * Q440 and Q506 (2026-08-21): the Text is a held setting like any other,
 * and 🤝 Applications keeps its crown pair on the setting rather than
 * inside its value.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { EngineBridge } from '../src/engine-bridge.js';
import { ParticipantApi } from '../../engine-core/src/participant-api.js';
import type { Event as EngineEvent } from '../../engine-core/src/types.js';
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

/* **The start lays down whatever 🍾 was not told to keep** (Ed, 2026-08-27,
 * entry 158; Q1018, R-057, overturning Q387 / R-043's first clause). Until
 * now the only road to a held Text was a post-start `reserve` motion, because
 * the fold cleared both powers unconditionally. The Begin card's 📄 row is the
 * first place either power on the Text can be kept, and the module's half of
 * it is one optional field. */
describe('🍾 keeps on the Text what it was told to keep (entry 158)', () => {
  it('a 🍾 told to keep ✒️ leaves it held after the start', () => {
    const { s } = buildConstituted({ keepText: { unilateral: true } });
    expect(s.settingState('startingText').powers).toEqual({ unilateral: true, assent: false });
    expect(s.settingState('startingText').holder).toBe('convenor');
    expect(s.crowned()).toBe(true);
    // the shield it was not told to keep went, so an adoption still stands by
    // itself — the two halves of the pair are answered separately
    expect(s.textAdoptionNeedsAssent()).toBe(false);
  });

  it('a 🍾 told to keep 🛡️ needs no reserve motion to shield an adoption', () => {
    const { s } = buildConstituted({ keepText: { assent: true } });
    expect(s.settingState('startingText').powers).toEqual({ unilateral: false, assent: true });
    expect(s.textAdoptionNeedsAssent()).toBe(true);
    expect([...s.motionRecords().values()]).toHaveLength(0);
    const q = s.openTextCrownQuestion(3, { candidateId: 'c1', summary: 'x' });
    expect(s.crownQuestionRecords().get(q)!.status).toBe('pending');
  });

  it('told to keep neither, the start is the one it always was', () => {
    const { s, bo } = buildConstituted();
    expect(s.settingState('startingText').powers).toEqual({ unilateral: false, assent: false });
    expect(view(s, bo).settings.find((x) => x.setting === 'startingText')!.powers)
      .toEqual({ unilateral: false, assent: false });
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
/*
 * The R-056 block's own kit, at file scope so the vacancy block below reuses
 * it rather than carrying a second copy of it (R-060). Nothing about it moved.
 */
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
/**
 * One event of a kind, narrowed. `find` only infers a type predicate from a
 * bare `e.type === '…'`, so a search that also matches on the candidate id
 * comes back as the whole `Event` union and every field read is a type
 * error — the filter does the narrowing and the finder does the matching.
 */
const pick = <K extends EngineEvent['type']>(bridge: EngineBridge, type: K,
  where: (e: Extract<EngineEvent, { type: K }>) => boolean = () => true) =>
  events(bridge)
    .filter((e): e is Extract<EngineEvent, { type: K }> => e.type === type)
    .find(where)!;
const questionFor = (s: ConstitutionSession, id: string) =>
  [...s.crownQuestionRecords().values()].find((q) => q.text?.candidateId === id)!;

describe('🛡️ on the Text parks the adoption (R-056)', () => {
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
    const park = pick(bridge, 'candidate-awaiting-assent');
    bridge.answerCrownQuestion(21, questionFor(s, id).id, 'accept');
    expect(bridge.engine.document()).toBe('Open every day.');
    expect(bridge.engine.getCandidate(id).state).toBe('adopted');
    const adopted = pick(bridge, 'adopted', (e) => e.candidateId === id);
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
    const retired = pick(bridge, 'candidate-retired', (e) => e.id === id);
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
    const und = pick(bridge, 'candidate-undecided', (e) => e.id === id);
    expect(und.refund).toBe(0);
    expect(bridge.engine.getCandidate(id).state).toBe('undecided');
    expect(bridge.engine.document()).toBe(START);
    expect(s.crownQuestionRecords().get(questionFor(s, id).id)!.status).toBe('failed-closed');
    expect(bridge.closeRecord().carriedButUnassented.some((c) => c.candidateId === id)).toBe(true);
  });

  /**
   * `judge` runs the sweep, so it must first tell the engine what the ground
   * is — the shield included. The server's `commit` syncs after every command
   * and hides this; the bridge's own API does not promise it, and a shield
   * reserved since the last sync would otherwise let one judgment adopt text
   * unparked, past a 👑 that was already standing.
   */
  it('a shield reserved since the last sync still parks the judgment that follows', () => {
    const { s, bo, cy } = buildConstituted();
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'shield-mid-flight' });
    const { id, raceId } = bridge.proposeText(10, bo,
      patch(bridge.engine.currentVersion(), ['Open every day.']), 'nights too');
    // the room hands the shield back with the proposal already in flight —
    // on the constitution alone, which is all a reserve motion touches
    reserveTextShield(s, bo, ['ada', cy], 11);
    bridge.judge(20, cy, id,
      bridge.engine.races().find((r) => r.id === raceId)!.incumbentId, 'a');
    expect(bridge.engine.document()).toBe(START);
    expect(bridge.engine.getCandidate(id).state).toBe('awaiting-assent');
    expect(view(s, 'ada').crownTasks[0]!.text!.candidateId).toBe(id);
  });

  /**
   * The same close, reached the way a live document reaches it — the host's
   * minute tick, which is late by construction, against an engine that
   * stamps its final batch at the ending. The 👑 the batch's park opens must
   * be stamped there too, or `finishClose`'s `cs.close(closedAt)` goes
   * backwards and the document can never close at all.
   */
  it('a park made by the final batch does not stop the close', () => {
    const { s, bo, cy } = buildConstituted();
    reserveTextShield(s, bo, ['ada', cy], 2);
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'park-at-close' });
    // one park, answered — which is what spends the cooldown metronome (§4.2)
    const first = bridge.proposeText(10, bo,
      patch(bridge.engine.currentVersion(), ['Open every day.']), 'nights too');
    bridge.judge(20, cy, first.id,
      bridge.engine.races().find((r) => r.id === first.raceId)!.incumbentId, 'a');
    bridge.answerCrownQuestion(21, questionFor(s, first.id).id, 'accept');
    expect(bridge.engine.document()).toBe('Open every day.');
    // so this one's judgment releases no batch: it is the close that parks it
    const late = bridge.proposeText(30, bo,
      patch(bridge.engine.currentVersion(), ['Open on Sundays too.']), 'Sundays');
    bridge.judge(40, cy, late.id,
      bridge.engine.races().find((r) => r.id === late.raceId)!.incumbentId, 'a');
    expect(bridge.engine.getCandidate(late.id).state).toBe('live');

    bridge.tick(1_000_060); // the host's minute, a minute past the ending

    expect(bridge.engine.closedAt).toBe(1_000_000);
    expect(s.closed).toBe(true);
    expect(s.closedAt).toBe(1_000_000); // both ends at one T=0
    expect(questionFor(s, late.id).status).toBe('failed-closed');
    expect(bridge.closeRecord().carriedButUnassented
      .some((c) => c.candidateId === late.id)).toBe(true);
    expect(s.verifyChain()).toBe(true);
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

/**
 * R-060 (Ed, 2026-08-29): **a park with no convenor auto-passes, the way a
 * lapse does.** R-056's park is answerable only by the convenor — `crownTasks`
 * and the server's `awaitingAssent` are both gated on the reader being them —
 * and the lapse auto-pass fires once, on the transition *into* lapse. So a
 * seat vacated *after* the park served the question to somebody who had gone,
 * no clock would ever answer it, and every text adoption in the document was
 * blocked for the rest of its life.
 *
 * Today the one door that vacates the seat is a carried removal motion against
 * the convenor's own row: `remove` / `resign` / `uninvite` each refuse the
 * convenor outright, and `settleCarriedEffects`'s `remove` arm has no such
 * guard. `assembly` is the price used here because it is unanimity *minus the
 * subject*, so the convenor is not asked to consent to her own removal.
 */
describe('a vacated seat auto-passes the park and holds no shield (R-060)', () => {
  /** The removal that empties the seat: bo moves, cy accepts, ada is not asked. */
  const vacate = (s: ConstitutionSession, bo: string, cy: string, t: number) => {
    const m = s.openMotion(t, bo, { kind: 'remove', member: 'ada' });
    s.answerMotion(t, cy, m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.memberRecords().get('ada')!.removed).toBe(true);
  };

  it('the park adopts on the vacancy, on the confidence the room decided at', () => {
    const { s, bo, cy, bridge, id } = parked({ removal: { price: 'assembly' } }, 'vacancy');
    const park = pick(bridge, 'candidate-awaiting-assent');
    expect(bridge.engine.document()).toBe(START);

    vacate(s, bo, cy, 21);
    expect(questionFor(s, id).status).toBe('auto-passed');
    // `answerMotion` runs on the session, so the cursor walk needs a sync
    bridge.sync(21);

    expect(bridge.engine.document()).toBe('Open every day.');
    expect(bridge.engine.getCandidate(id).state).toBe('adopted');
    const adopted = pick(bridge, 'adopted', (e) => e.candidateId === id);
    expect(adopted).toMatchObject({ p: park.p, threshold: park.threshold });
    // a vacancy is not a lapse: nothing may wake back up
    expect(s.crownLapsed).toBe(false);
  });

  it('the seat stays vacant, so the next race adopts by itself', () => {
    const { s, bo, cy, bridge } = parked({ removal: { price: 'assembly' } }, 'vacancy-next');
    vacate(s, bo, cy, 21);
    bridge.sync(21);
    expect(s.convenorSeatVacant()).toBe(true);
    expect(s.textAdoptionNeedsAssent()).toBe(false);
    expect(bridge.engine.constitution.textAssent).toBe(false);

    // past the cooldown, so this judgment releases a batch of its own (§4.2)
    const second = bridge.proposeText(400_000, bo,
      patch(bridge.engine.currentVersion(), ['Open on Sundays too.']), 'Sundays');
    bridge.judge(400_010, cy, second.id,
      bridge.engine.races().find((r) => r.id === second.raceId)!.incumbentId, 'a');

    expect(bridge.engine.document()).toBe('Open on Sundays too.');
    expect(bridge.engine.getCandidate(second.id).state).toBe('adopted');
    expect(events(bridge).filter((e) => e.type === 'candidate-awaiting-assent')).toHaveLength(1);
    expect([...s.crownQuestionRecords().values()].filter((q) => q.status === 'pending'))
      .toHaveLength(0);
  });

  it('a clerk convenor is not a vacancy — the shield stands (X15)', () => {
    const { s, bo, cy } = buildConstituted({ clerk: true });
    reserveTextShield(s, bo, [cy], 2); // ada is not a member and is not asked
    expect(s.memberRecords().has('ada')).toBe(false); // 🎩 deleted the record
    expect(s.convenorSeatVacant()).toBe(false);
    expect(s.textAdoptionNeedsAssent()).toBe(true);
  });

  it('nothing moves when somebody else is removed: the park still waits', () => {
    const { s, bo, cy, bridge, id } = parked({ removal: { price: 'assembly' } }, 'vacancy-other');
    const m = s.openMotion(21, bo, { kind: 'remove', member: cy });
    s.answerMotion(21, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    bridge.sync(21);

    expect(s.convenorSeatVacant()).toBe(false);
    expect(questionFor(s, id).status).toBe('pending');
    expect(s.textAdoptionNeedsAssent()).toBe(true);
    expect(bridge.engine.document()).toBe(START);
    expect(bridge.engine.getCandidate(id).state).toBe('awaiting-assent');
  });

  it('the constitution log gains no new event kind, so a replay is bit-identical', () => {
    const { s, bo, cy, bridge } = parked({ removal: { price: 'assembly' } }, 'vacancy-replay');
    vacate(s, bo, cy, 21);
    bridge.sync(21);
    const r = ConstitutionSession.replay([...s.logEntries()]);
    expect(r.rollingHash()).toBe(s.rollingHash());
  });
});

/**
 * R-058 (Ed, 2026-08-27, backlog entry 160): where the Founder keeps ✒️ on the
 * Text, their amendment **passes the instant it is submitted** — direct, no
 * stake, no race. It is recorded as an amendment by the pen route (R-004) and
 * owed an acknowledgement by everybody who had no say.
 *
 * **Where that acknowledgement is served was Q1021, and Ed answered it on
 * 2026-08-29 (decision D47): a news card beside the amended clause.** The
 * R-058 build took the cheap reading first — 📄's own key `startingText`
 * through `oweOks`, one owed OK however many amendments it stood for — and
 * this section is the reversal of it: an owed kind of its own, one card and
 * one OK **per amendment**, and `startingText` never in `owedOks` again. The
 * collapse the two tests below used to assert is now the thing they assert
 * does *not* happen.
 *
 * Driven through the bridge, which is the only harness that exercises
 * engine-core, the record and the acknowledgement together.
 */
describe('✒️ on the Text: the Founder amends at will (R-058)', () => {
  const patch = (baseVersion: number, lines: string[]) =>
    ({ baseVersion, hunks: [{ start: 0, end: 1, lines }] });
  const START = 'The clubhouse shall be kept open.';

  it('textPen() is true only while the pen is held and the crown awake', () => {
    // told to keep neither: the start laid the pen down like the shield
    expect(buildConstituted().s.textPen()).toBe(false);
    // told to keep 🛡️ alone: the shield is not the pen
    expect(buildConstituted({ keepText: { assent: true } }).s.textPen()).toBe(false);
    const { s } = buildConstituted({ keepText: { unilateral: true } });
    expect(s.textPen()).toBe(true);
    // a sleeping crown grants assent and performs no act (`doorPen`'s rule)
    const lapsing = buildConstituted({ keepText: { unilateral: true },
      lapse: { afterMs: 100 } }).s;
    expect(lapsing.textPen()).toBe(true);
    lapsing.tick(2 + 1000);
    expect(lapsing.crownLapsed).toBe(true);
    expect(lapsing.textPen()).toBe(false);
    lapsing.memberReturn(2 + 1001, 'ada');
    expect(lapsing.textPen()).toBe(true);
  });

  it('the amendment lands at once, recorded as a carried pen-route motion', () => {
    const { s, bo, cy } = buildConstituted({ keepText: { unilateral: true } });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'pen' });
    expect(bridge.engine.document()).toBe(START);
    const before = bridge.engine.balance(bo, 10);
    const { id } = bridge.penText(10, 'ada',
      patch(bridge.engine.currentVersion(), ['Open every day.']), 'the room asked');
    // the document moved, with no race and no adoption event
    expect(bridge.engine.document()).toBe('Open every day.');
    expect(bridge.engine.getCandidate(id).state).toBe('adopted');
    expect(bridge.engine.getCandidate(id).stakePaid).toBe(0);
    expect(bridge.engine.log.map((e) => e.event).some((e) => e.type === 'adopted')).toBe(false);
    // nobody's wallet moved
    expect(bridge.engine.balance(bo, 11)).toBe(before);
    // and the amendment joins the motions, where every other one lives
    const rec = [...s.motionRecords().values()].find((m) => m.payload.kind === 'text')!;
    expect(rec.route).toBe('pen');
    expect(rec.status).toBe('carried');
    expect(rec.stake).toBe(0);
    expect(rec.by).toBe('ada');
    expect(rec.why).toBe('the room asked');
    expect(rec.openedAtT).toBe(10);
    expect(rec.settledAtT).toBe(10);
    expect(rec.payload).toEqual({ kind: 'text', candidateId: id, summary: 'Open every day.' });
    // no 👑 question: asking the Founder to assent to their own act asks twice
    expect(view(s, 'ada').crownTasks).toHaveLength(0);
    // every arrived member but the Founder is owed the news, **beside the
    // clause** (D47) — never on 📄's own key, which is what this replaced
    expect(view(s, bo).owedAmendments.map((a) => a.candidate)).toEqual([id]);
    expect(view(s, cy).owedAmendments.map((a) => a.candidate)).toEqual([id]);
    expect(view(s, 'ada').owedAmendments).toHaveLength(0);
    for (const seat of [bo, cy, 'ada']) {
      expect(view(s, seat).owedOks).not.toContain('startingText');
    }
  });

  it('one amendment owes one acknowledgement, and only to those who had a say to lose', () => {
    // both doors on the pen, so the audience can be shaped after the start
    const { s, bo, cy } = buildConstituted({ keepText: { unilateral: true },
      doors: { invite: { unilateral: true, assent: false },
        remove: { unilateral: true, assent: false } } });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'pen-audience' });
    // an invitee who has never arrived, and a member who is gone: neither is
    // owed anything (`oweOks`'s audience rule, which this borrows whole)
    const di = s.invite(9, 'di@example.org');
    s.remove(9, cy);
    const { id } = bridge.penText(10, 'ada',
      patch(bridge.engine.currentVersion(), ['Open every day.']), 'the room asked');
    expect(view(s, bo).owedAmendments.map((a) => a.candidate)).toEqual([id]);
    expect(view(s, di).owedAmendments).toHaveLength(0);    // never arrived
    expect(view(s, cy).owedAmendments).toHaveLength(0);    // gone
    expect(view(s, 'ada').owedAmendments).toHaveLength(0); // the actor
    // and a seat with no member record at all is served [], as `owedOks` is
    expect(view(s, 'nobody').owedAmendments).toEqual([]);
  });

  it('two amendments owe two, each naming its own candidate (D47 reverses the collapse)', () => {
    const { s, bo } = buildConstituted({ keepText: { unilateral: true } });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'pen-run' });
    const one = bridge.penText(10, 'ada',
      patch(bridge.engine.currentVersion(), ['Open every day.']), 'one');
    const two = bridge.penText(11, 'ada',
      patch(bridge.engine.currentVersion(), ['Open at dawn.']), 'two');
    expect([...s.motionRecords().values()].filter((m) => m.payload.kind === 'text'))
      .toHaveLength(2);
    // **two cards, not a bigger one** — the whole of the ruling
    const owed = view(s, bo).owedAmendments;
    expect(owed.map((a) => a.candidate)).toEqual([one.id, two.id]); // oldest first
    // the summary and the reason ride off the motion record
    expect(owed.map((a) => a.summary)).toEqual(['Open every day.', 'Open at dawn.']);
    expect(owed.map((a) => a.why)).toEqual(['one', 'two']);
    expect(owed.map((a) => a.at)).toEqual([10, 11]);
    // and 📄's key is untouched throughout
    expect(view(s, bo).owedOks).not.toContain('startingText');
  });

  it('the OK clears one amendment for one member, and is silent on one not owed', () => {
    const { s, bo, cy } = buildConstituted({ keepText: { unilateral: true } });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'pen-ack' });
    const one = bridge.penText(10, 'ada',
      patch(bridge.engine.currentVersion(), ['Open every day.']), 'one');
    const two = bridge.penText(11, 'ada',
      patch(bridge.engine.currentVersion(), ['Open at dawn.']), 'two');
    s.ackAmendment(12, bo, one.id);
    expect(view(s, bo).owedAmendments.map((a) => a.candidate)).toEqual([two.id]);
    expect(view(s, cy).owedAmendments.map((a) => a.candidate)).toEqual([one.id, two.id]);
    // `ackRelease`'s posture: not owed returns silently rather than throwing
    // at a page that was a poll behind
    const n = s.logEntries().length;
    expect(() => s.ackAmendment(13, bo, one.id)).not.toThrow();
    expect(() => s.ackAmendment(13, bo, 'c-never-was')).not.toThrow();
    expect(s.logEntries().length).toBe(n);
    expect(() => s.ackAmendment(13, 'nobody', one.id)).toThrow(/unknown member/);
    // `okOwed` is untouched by the whole run
    expect(view(s, bo).owedOks).not.toContain('startingText');
    expect(view(s, cy).owedOks).not.toContain('startingText');
  });

  it('refuses without the pen, before the start, and to anybody but the Founder', () => {
    const { s, bo } = buildConstituted(); // pen laid down at 🍾
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'pen-refuse' });
    const p = () => patch(bridge.engine.currentVersion(), ['Open every day.']);
    expect(() => bridge.penText(10, 'ada', p(), '')).toThrow(/no pen/);
    expect(bridge.engine.document()).toBe(START);
    const held = buildConstituted({ keepText: { unilateral: true } });
    const b2 = new EngineBridge(held.s, { t: 3, rngSeed: 'pen-refuse2' });
    expect(() => b2.penText(10, bo, patch(b2.engine.currentVersion(), ['x']), ''))
      .toThrow(/the Founder/);
    // and the module's own door refuses before the start
    const pre = openDoc();
    pre.confirmStartingText(1, START);
    expect(() => pre.recordTextAmendment(2, { candidateId: 'c1', summary: 'x' }))
      .toThrow(/before the start/);
  });

  it('replays bit-identically and appends nothing — the owing is on the command path', () => {
    const { s, bo } = buildConstituted({ keepText: { unilateral: true } });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'pen-replay' });
    bridge.penText(10, 'ada', patch(bridge.engine.currentVersion(), ['Open every day.']), 'why');
    const r = ConstitutionSession.replay([...s.logEntries()]);
    expect(r.rollingHash()).toBe(s.rollingHash());
    expect([...r.motionRecords().keys()]).toEqual([...s.motionRecords().keys()]);
    // **The length as well as the hash.** `rollingHash()` returns the last
    // *pushed original* entry's own hash, so a fold that emits leaves it
    // unchanged while the log grows every time it is read — which is exactly
    // what the reading this replaced did, `oweOks` being called from the
    // `text-amended` fold. This is the assertion that keeps the owing in
    // `recordTextAmendment` (Q1034).
    expect(r.logEntries().length).toBe(s.logEntries().length);
    expect([...r.memberRecords().get(bo)!.amendmentsOwed])
      .toEqual([...s.memberRecords().get(bo)!.amendmentsOwed]);
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
