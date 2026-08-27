/**
 * **Promise-coverage — 🌡️ the bar, the threshold at the close** (backlog
 * entry 86, series 77, batch L). One setting, its values and holder states,
 * what each promises the room in the room's words, and where that promise is
 * enforced — in the fold and on the surface — in all three epochs. What holds
 * is locked below; what does not is filed as a backlog entry and named here
 * as an `it.todo`. **This file fixes nothing.**
 *
 * ## The promises (SPEC §4.2, §4.3, §9.0a, §9.6, §9.7.1)
 *
 *  P1 *A proposal is adopted only when the room is this sure*, and every
 *     adoption records the bar it cleared.
 *  P2 *When we delegate this, the question collects the bar at the close, not
 *     the ramp* — the ramp is 🪜's (entry 87).
 *  P3 *Changing the bar afterwards needs everyone, and it never re-judges what
 *     was adopted* — the engine re-anchors at the bar as it stands (§4.3).
 *  P4 *The mover of a constitutional change stands at accept from the open.*
 *  P5 *A motion nobody consented to carries nothing.*
 *  P6 *Before the document begins, judging waits on this* — 🌡️ is a
 *     judge-gate, and its question is not answerable until ⏰ settles.
 *
 * ## The table: value shape × holder state × epoch
 *
 * `PercentValue` is `{ pct }`, 50–100 inclusive, any finite number
 * (`values.ts` `validateValue` `'percent'`). Read *fold* · *surface*.
 *
 * | holder state          | before 🍾                          | live                                | closed                        |
 * |-----------------------|------------------------------------|-------------------------------------|-------------------------------|
 * | founder-held, set     | P6 `waitingWith` judge-gate ✓ · the 🌡️ card's `opt(S,'barBy','founder')` | P3 `setSetting` → `by:'crown'` + `oweOks` ✓ · `founderDirect` composer | P3 `requireOpen` refuses ✓ · card read-only |
 * | founder-held, unset   | P6 `begin` refuses, why `judge-gate` ✓ · rail carries 🌡️ | unreachable (`begin` refused) | unreachable |
 * | delegated, collecting | P2/P6 `begin` refuses, why `collecting`/`one-voice`/`invitation-open` ✓ · `theyDecide('bar')` | unreachable | unreachable |
 * | delegated, by ceremony| P2 `resolveConsent` ascending on `pct` → the maximum ✓ · `ANSWER.bar` slider **gap, see F1** | P3/P4/P5 `openMotion` 🏛️ ✓ · `PROPOSE.bar` | P3 `requireOpen` refuses ✓ |
 * | members-held post-start | n/a (hand-over is live)          | P3/P4/P5 as above ✓                 | as above ✓                    |
 *
 * | value shape        | fold                    | the founder's card | the room's answer | verdict |
 * |--------------------|-------------------------|--------------------|-------------------|---------|
 * | `pct` 50           | accepted                | `min="50"`         | slider min 50     | holds   |
 * | `pct` 63 (odd)     | accepted                | any integer        | **step 5** — not statable | **F1** |
 * | `pct` 96–99        | accepted                | `max="99"`         | **slider max 95** | **F1** |
 * | `pct` 100          | accepted                | not statable (99)  | not statable (95) | **F1**, and unadoptable by construction — Q840's ceiling, answered and owed, not refiled |
 * | the ceremony max   | `resolveConsent` order ascending → the highest stated | — | — | holds |
 *
 * The three epochs, deliberately (step 4 of the plan):
 *  · **before 🍾** the founder may set, delegate, reclaim and re-set freely
 *    (§9.6a); the delegated question is served only once ⏰ settles; `begin`
 *    refuses while it collects.
 *  · **live** the pen where held, else 🏛️; the engine re-anchors; the
 *    ceremony's maximum is what the engine opened with (`toEngineConstitution`,
 *    `adoptionThresholdEnd = bar.pct / 100`).
 *  · **closed** `requireOpen` refuses `setSetting` and `openMotion`; the final
 *    batch at T=0 runs at `adoptionThreshold(windowEndMs)`, which is the
 *    ceiling. **A perpetual document has no third epoch** and its bar is fixed
 *    at `endPct` for ever (`barAt` with `endT === null`) — its own case, below.
 *
 * The stranger's door serves 🌡️'s standing value, holder and powers to a
 * seatless caller **at every rung including `closed`** (`server.ts`
 * `strangerView`'s `view.settings`, ungated on `canRead`). That is the door's
 * documented rule — *the constitution is public while the text is private* —
 * and it was audited by entry 82; it is recorded here, not filed again.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { EngineBridge } from '../src/engine-bridge.js';
import { entryOf, motionRouteOf } from '../src/catalogue.js';
import { engineFieldsFor } from '../src/adapter.js';
import { buildConstituted } from './helpers.js';
import type { PercentValue } from '../src/values.js';

/**
 * A constituted document the founder never delegated: every setting is theirs
 * by pen, so 🌡️ is founder-held and set and the pen route below is real.
 * `buildConstituted` cannot serve this — it resolves `bar` by ceremony, which
 * is the other holder state and the one the 🏛️ cases use.
 */
function penHeld(opts: { bar?: number; perpetual?: boolean; ramp?: number } = {}) {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  const cy = s.invite(1, 'cy@example.org');
  s.arrive(1, bo);
  s.arrive(1, cy);
  s.confirmStartingText(2, 'The clubhouse shall be kept open.');
  const values = {
    ending: { endsAtMs: opts.perpetual ? null : 1_000_000 },
    bar: { pct: opts.bar ?? 66 },
    pace: opts.ramp === undefined ? { shape: 'fixed' } : { shape: 'ramp', startPct: opts.ramp },
    quorum: { form: 'share', n: 60 },
    authorship: { rung: 'sealed' },
    judgments: { rung: 'after' },
    chamber: { rung: 'link' },
    applications: { apply: false },
    admission: { price: 'assembly' },
    removal: { price: 'consent' },
    rate: { grant: 4, cap: 8, dripMinutes: 240 },
    machines: { enabled: false, budget: 0 },
    lapse: { afterMs: null },
  } as const;
  for (const [id, v] of Object.entries(values)) s.setSetting(2, id as never, v as never);
  s.begin(2);
  return { s, bo, cy };
}

/** A pre-start document with everything but `bar` settled by the founder's pen. */
function preStartAllButBar(opts: { endingSettled?: boolean } = {}) {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  const cy = s.invite(1, 'cy@example.org');
  s.arrive(1, bo);
  s.arrive(1, cy);
  s.confirmStartingText(2, 'The clubhouse shall be kept open.');
  const values: Record<string, unknown> = {
    pace: { shape: 'fixed' },
    quorum: { form: 'share', n: 60 },
    authorship: { rung: 'sealed' },
    judgments: { rung: 'after' },
    chamber: { rung: 'link' },
    applications: { apply: false },
    admission: { price: 'assembly' },
    removal: { price: 'consent' },
    rate: { grant: 4, cap: 8, dripMinutes: 240 },
    machines: { enabled: false, budget: 0 },
    lapse: { afterMs: null },
  };
  if (opts.endingSettled !== false) values.ending = { endsAtMs: 1_000_000 };
  for (const [id, v] of Object.entries(values)) s.setSetting(2, id as never, v as never);
  return { s, bo, cy };
}

// ---------------------------------------------------------------------------

describe('🌡️ — what the catalogue promises (§9.7.1)', () => {
  it('is constitutional, delegable, a judge-gate, waits on ⏰, and takes the highest', () => {
    const e = entryOf('bar');
    expect(e.kind).toBe('constitutional');
    expect(e.delegable).toBe(true);
    expect(e.judgeGate).toBe(true);
    expect(e.deps).toEqual(['ending']);
    // *the lowest bar at the close you will accept* — ascending on `pct`, so
    // `resolveConsent` takes the maximum: never easier than any one member
    // wanted. The ask string is the room's own words.
    expect(e.consent?.ask).toBe('the lowest bar at the close you will accept');
    expect(e.consent!.order({ pct: 55 } as PercentValue, { pct: 90 } as PercentValue))
      .toBeLessThan(0);
    // no `routeOf`: **every** 🌡️ motion is constitutional, up or down (P3)
    expect(e.routeOf).toBeUndefined();
    for (const [from, to] of [[60, 90], [90, 60], [50, 100]] as const) {
      expect(motionRouteOf(e, { pct: to }, { pct: from })).toBe('constitutional');
    }
  });

  it('the seam carries the close bar and nothing about the ramp (P2)', () => {
    // 🌡️ is the binding scalar; 🪜's `startPct` reaches the engine only
    // through `toEngineConstitution` at open (entry 87 audits that half).
    expect(engineFieldsFor('bar', { pct: 78 }, 0)).toEqual({ adoptionThresholdEnd: 0.78 });
    expect(Object.keys(engineFieldsFor('pace', { shape: 'ramp', startPct: 55 }, 0))).toEqual([]);
  });
});

describe('P1 — a proposal is adopted only when the room is this sure', () => {
  it('every adoption records the bar it cleared, and the bar is the document’s', () => {
    const { s, bo, cy } = buildConstituted(); // bar resolves to 66 by ceremony
    expect(s.settingState('bar').value).toEqual({ pct: 66 });
    expect(s.settingState('bar').settledBy).toBe('ceremony');
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'promise-bar-p1' });
    // the ceremony's maximum is what the engine opened with
    expect(bridge.engine.constitution.adoptionThresholdEnd).toBeCloseTo(0.66, 10);
    expect(bridge.engine.adoptionThreshold(10)).toBeCloseTo(0.66, 10);

    const { candidate } = bridge.openSetMotion(10, bo, 'ending', { endsAtMs: 2_000_000 });
    const race = bridge.engine.races().find((r) => r.settingId === 'ending')!;
    bridge.judge(20, cy, candidate!, race.incumbentId, 'a');
    const adopted = bridge.engine.log.map((e) => e.event)
      .filter((e): e is { type: 'adopted'; p: number; threshold: number } => e.type === 'adopted');
    expect(adopted.length).toBe(1);
    // the recorded bar is the document's own, and the winner cleared it
    expect(adopted[0]!.threshold).toBeCloseTo(0.66, 10);
    expect(adopted[0]!.p).toBeGreaterThan(adopted[0]!.threshold);
  });
});

describe('P3 — changing the bar never re-judges what was adopted (§4.3)', () => {
  /**
   * Both routes, the same assertion. `bridge.test.ts`'s *a constitutional
   * carry ground-shifts the raced motion and re-anchors the engine* already
   * asserts re-anchoring for **⏰**; the bar's own ceiling change is not
   * covered there, and neither route is covered for a past `adopted`.
   */
  function assertGlide(bridge: EngineBridge, at: number, was: number, now: number) {
    // continuous at the moment of the change — no jump, in either direction
    expect(bridge.engine.adoptionThreshold(at)).toBeCloseTo(was, 10);
    // and it glides to the new ceiling over what is left of the window
    const end = bridge.engine.constitution.windowEndMs;
    const mid = bridge.engine.adoptionThreshold(at + (end - at) / 2);
    expect(mid).toBeGreaterThan(Math.min(was, now));
    expect(mid).toBeLessThan(Math.max(was, now));
    expect(bridge.engine.adoptionThreshold(end)).toBeCloseTo(now, 10);
  }

  it('by 🏛️ motion: the engine glides from the bar as it stood, and past adoptions keep theirs', () => {
    const { s, bo, cy } = buildConstituted();
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'promise-bar-p3-motion' });
    const { candidate } = bridge.openSetMotion(10, bo, 'ending', { endsAtMs: 2_000_000 });
    const race = bridge.engine.races().find((r) => r.settingId === 'ending')!;
    bridge.judge(20, cy, candidate!, race.incumbentId, 'a');
    const before = bridge.engine.log.map((e) => e.event)
      .filter((e): e is { type: 'adopted'; threshold: number } => e.type === 'adopted')
      .map((e) => e.threshold);
    expect(before).toEqual([expect.closeTo(0.66, 10)]);

    // 🌡️ is the room's here, so unanimity carries it into the document
    const m = s.openMotion(30, cy, { kind: 'set', setting: 'bar', value: { pct: 90 } });
    expect(s.motionRecords().get(m)!.route).toBe('constitutional');
    s.answerMotion(31, 'ada', m, 'accept');
    s.answerMotion(32, bo, m, 'accept'); // cy stood at accept from the open (P4)
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.settingState('bar').value).toEqual({ pct: 90 });

    bridge.sync(40);
    expect(bridge.engine.standing('bar')).toEqual({ pct: 90 });
    expect(bridge.engine.constitution.adoptionThresholdEnd).toBeCloseTo(0.9, 10);
    assertGlide(bridge, 40, 0.66, 0.9);

    // **nothing already adopted is re-tested**: the recorded threshold is the
    // bar that adoption actually cleared, and it does not move with the rule
    const after = bridge.engine.log.map((e) => e.event)
      .filter((e): e is { type: 'adopted'; threshold: number } => e.type === 'adopted')
      .map((e) => e.threshold);
    expect(after).toEqual(before);
  });

  it('by the founder’s pen: the same glide, and the change is owed to the room (§9.7 rule 5)', () => {
    const { s, bo, cy } = penHeld({ bar: 66 });
    expect(s.settingState('bar').powers.unilateral).toBe(true);
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'promise-bar-p3-pen' });
    expect(bridge.engine.adoptionThreshold(10)).toBeCloseTo(0.66, 10);

    s.setSetting(40, 'bar', { pct: 90 }, 'the clubhouse deserves more certainty');
    // the pen post-start is an amendment and is reported as one (Q530)
    expect(s.settingState('bar').settledBy).toBe('crown');
    // and it is owed to every arrived member who had no say — which, on the
    // pen route, is all of them
    for (const m of [bo, cy]) {
      expect(s.memberRecords().get(m)!.okOwed.has('bar'), m).toBe(true);
    }

    bridge.sync(40);
    assertGlide(bridge, 40, 0.66, 0.9);
  });

  it('lowering the bar glides down: it never drops onto the room in one step', () => {
    const { s } = penHeld({ bar: 90 });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'promise-bar-p3-down' });
    s.setSetting(40, 'bar', { pct: 60 });
    bridge.sync(40);
    assertGlide(bridge, 40, 0.9, 0.6);
  });
});

describe('P4 and P5 — the mover stands, and nobody’s consent carries nothing', () => {
  it('the mover’s accept is in the motion’s answers from the open (v0.49, X16)', () => {
    const { s, cy } = buildConstituted();
    const m = s.openMotion(30, cy, { kind: 'set', setting: 'bar', value: { pct: 90 } });
    expect(s.motionRecords().get(m)!.answers.get(cy)).toBe('accept');
    // and it is one act: the answer rides the same t as the open
    const opened = s.logEntries().map((e) => e.event)
      .filter((e) => (e.type === 'motion-opened' || e.type === 'motion-answer') &&
        (e as { motion: string }).motion === m);
    expect(opened.map((e) => e.type)).toEqual(['motion-opened', 'motion-answer']);
    expect(opened.every((e) => (e as { t: number }).t === 30)).toBe(true);
  });

  it('all-abstain does not carry the bar (NOTES: nobody consented to anything)', () => {
    // `motions.test.ts` *pure abstention carries nothing — even the mover may
    // stand down to it* says this for ⏰; said here for 🌡️ because the bar is
    // the setting where a silent carry would be worst.
    const { s, bo, cy } = buildConstituted();
    const m = s.openMotion(30, cy, { kind: 'set', setting: 'bar', value: { pct: 90 } });
    s.answerMotion(31, cy, m, 'abstain'); // the mover stands down
    s.answerMotion(32, 'ada', m, 'abstain');
    s.answerMotion(33, bo, m, 'abstain');
    expect(s.motionRecords().get(m)!.status).toBe('running');
    expect(s.settingState('bar').value).toEqual({ pct: 66 });
    // one accept is all it takes to complete the same set of answers
    s.answerMotion(34, bo, m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.settingState('bar').value).toEqual({ pct: 90 });
  });

  it('one keep blocks it, and what stands stands (§9.6)', () => {
    const { s, bo, cy } = buildConstituted();
    const m = s.openMotion(30, cy, { kind: 'set', setting: 'bar', value: { pct: 90 } });
    s.answerMotion(31, 'ada', m, 'accept');
    s.answerMotion(32, bo, m, 'keep');
    expect(s.motionRecords().get(m)!.status).toBe('running');
    expect(s.settingState('bar').value).toEqual({ pct: 66 });
  });
});

describe('P6 — before the document begins, judging waits on 🌡️', () => {
  it('`begin` refuses while the bar collects, and names it', () => {
    const { s } = preStartAllButBar();
    s.delegate(2, 'bar');
    expect(s.settingState('bar').collecting).toBe(true);
    expect(() => s.begin(3)).toThrow(/'bar'/);
    expect(s.readiness().holds).toEqual([{ setting: 'bar', why: 'collecting' }]);
    expect(s.readiness().ready).toBe(false);
  });

  it('and while it is simply unset — a judge-gate is a gate however it is held', () => {
    const { s } = preStartAllButBar();
    expect(s.settingState('bar').value).toBeNull();
    expect(s.settingState('bar').holder).toBe('convenor');
    expect(() => s.begin(3)).toThrow(/'bar'/);
    expect(s.readiness().holds).toEqual([{ setting: 'bar', why: 'judge-gate' }]);
  });

  it('the question is not answerable until ⏰ settles (§9.0a deps)', () => {
    const { s, bo } = preStartAllButBar({ endingSettled: false });
    s.delegate(2, 'ending');
    s.delegate(2, 'bar');
    expect(() => s.answer(3, bo, 'bar', { pct: 66 }))
      .toThrow("'bar' waits on 'ending' (§9.0a)");
    // ⏰ settles, and only then does 🌡️ take an answer
    s.reclaim(3, 'ending');
    s.setSetting(3, 'ending', { endsAtMs: 1_000_000 });
    expect(() => s.answer(4, bo, 'bar', { pct: 66 })).not.toThrow();
  });

  it('the founder’s free hand before 🍾: set, delegate, reclaim, re-set (§9.6a)', () => {
    const { s } = preStartAllButBar();
    s.setSetting(2, 'bar', { pct: 55 });
    expect(s.settingState('bar').settledBy).toBe('convenor');
    s.delegate(2, 'bar');
    expect(s.settingState('bar').collecting).toBe(true);
    s.reclaim(2, 'bar');
    s.setSetting(2, 'bar', { pct: 72 });
    expect(s.settingState('bar').value).toEqual({ pct: 72 });
    // nothing is amended before the start — it is only set (§9.6a)
    expect(() => s.openMotion(2, 'ada', { kind: 'set', setting: 'bar', value: { pct: 80 } }))
      .toThrow('before the start nothing is amended — only set (§9.6a)');
  });
});

describe('the closed epoch — after the close nothing changes but the signing (§4.6)', () => {
  it('neither the pen nor a motion may move the bar', () => {
    const { s, bo } = buildConstituted();
    s.tick(1_000_000);
    expect(s.closed).toBe(true);
    expect(() => s.setSetting(1_000_001, 'bar', { pct: 90 }))
      .toThrow('the document has closed — setting is over (§4.6)');
    expect(() => s.openMotion(1_000_001, bo, { kind: 'set', setting: 'bar', value: { pct: 90 } }))
      .toThrow('the document has closed — a motion is over (§4.6)');
  });

  it('the last batch runs at the ceiling: the bar at the close is the bar', () => {
    const { s } = buildConstituted();
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'promise-bar-close' });
    // fixed shape, so this is 0.66 the whole way; the shape that matters is
    // that the close's own query is the ceiling and not something later
    expect(bridge.engine.adoptionThreshold(1_000_000))
      .toBeCloseTo(bridge.engine.constitution.adoptionThresholdEnd, 10);
  });

  it('a perpetual document has no third epoch, and its bar is fixed for ever', () => {
    const { s } = penHeld({ bar: 72, perpetual: true });
    for (const t of [2, 500_000, 9_000_000_000]) expect(s.bar(t)).toBe(72);
    s.tick(9_000_000_000);
    expect(s.closed).toBe(false);
    // and the ramp is refused outright — there is nothing to climb towards
    expect(() => s.setSetting(3, 'pace', { shape: 'ramp', startPct: 55 }))
      .toThrow('perpetual forces a fixed bar — a ramp needs an endpoint (§9.0)');
  });
});

describe('what does not hold — filed, not fixed', () => {
  /**
   * **F1 — the room cannot state the minimum the fold would accept.**
   * `values.ts` takes `pct` 50–100 inclusive, any finite number.
   * `design/setup.js`'s `ANSWER.bar` is `slider(A, 'bar', 50, 95, …, 5)` — a
   * step of **5** and a ceiling of **95** — so a member who would only accept
   * 97, or exactly 63, cannot say so. The consent rule's own promise on the
   * card, *the document takes the **highest** given*, therefore reads as *the
   * highest of what the control let anybody say*. The founder's own card and
   * the composer are a third range again (`min="50" max="99"`, any integer).
   * Filed for the run; the 100 half of it is Q840's ceiling, answered and owed.
   */
  it.todo('F1 · the answer slider caps 🌡️ at 95 in steps of 5 where the fold takes 50–100');

  /**
   * **F2 — a bar amendment steps `cs.bar()` down where the engine glides.**
   * `session.ts` `reseedAnchorsIfLive` on a `bar` change calls
   * `computeAnchors(t)`, which **re-seeds** at 🪜's `startPct` — so on a
   * ramping document `cs.bar()` drops back to the start at the moment of the
   * amendment, while `engine.adoptionThreshold` re-anchors at the value it had
   * (locked above). `packages/constitution/NOTES.md` calls this out and says
   * the engine adjudicates and `cs.bar()` is display: *reconcile if a surface
   * ever draws both*. **Nothing draws it today** — see the seam case below —
   * so the promise is not broken anywhere a person can see, and this is filed
   * as latent rather than as a live defect.
   */
  it.todo('F2 · reseedAnchorsIfLive re-seeds cs.bar() at 🪜’s start where the engine re-anchors');

  it('the seam is latent: `cs.bar()` really does step, and nothing reads it', () => {
    // The step, in numbers, so a later reconciliation has the before-picture.
    const { s } = penHeld({ bar: 90, ramp: 55 });
    const at = 500_000;
    const wasRising = s.bar(at)!;
    expect(wasRising).toBeGreaterThan(55);
    s.setSetting(at, 'bar', { pct: 91 });
    // a **step down**, not a glide: the anchor went back to 🪜's start
    expect(s.bar(at)).toBeCloseTo(55, 5);
    expect(s.bar(at)).toBeLessThan(wasRising);
    // The engine, which is what actually adjudicates, does not move:
    const { s: s2 } = penHeld({ bar: 90, ramp: 55 });
    const bridge = new EngineBridge(s2, { t: 3, rngSeed: 'promise-bar-seam' });
    const engineWas = bridge.engine.adoptionThreshold(at);
    s2.setSetting(at, 'bar', { pct: 91 });
    bridge.sync(at);
    expect(bridge.engine.adoptionThreshold(at)).toBeCloseTo(engineWas, 10);
  });
});
