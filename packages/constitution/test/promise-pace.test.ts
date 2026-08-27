/**
 * **Promise-coverage — 🪜 pace, the ramp** (backlog entry 87, series 77, batch
 * L). One setting, two values, six promises about *the shape of the bar over
 * time*: enumerate them, find the enforcement in the fold and on the surface
 * in all three epochs, lock what holds here and file what does not. **This
 * file fixes nothing** — where it locks behaviour the audit calls a gap, the
 * `it` says so in its own name and its comment names the finding, so the lock
 * fails the day either side of the disagreement moves without the other.
 *
 * `PaceValue` is `{ shape: 'fixed' }` or `{ shape: 'ramp', startPct }`, 50–100
 * (`values.ts`). The catalogue entry is **ordinary**, **not delegable** (Q415,
 * Q560 — the bar at the close is consent, the ramp that reaches it is
 * *pacing*, and pacing stays with the founder, Q341), `deps: ['ending']`, no
 * `consent` order, `judgeGate: false`. So 🪜 has **no ceremony state**: it
 * never collects, and its holder states are founder-held-and-set,
 * founder-held-and-unset, and members-held after a post-start hand-over.
 *
 * ## The enumeration — every promise, in every epoch
 *
 * Fold = the method that keeps or breaks it. Surface = the control on
 * `design/session-view.html`. **holds** · **gap (fold)** · **gap (surface)**.
 *
 * | # | the promise, in the room's words | before 🍾 | live | after the close |
 * | --- | --- | --- | --- | --- |
 * | 1 | *a ramp starts at `startPct` when judging opens and reaches the close's bar* | **holds** — no anchors exist yet; `begin` seeds them from `computeAnchors(t)` at the start, so a pre-start re-set is simply what the document says | **holds** — `seedAnchors('ramp', startPct, …)` then `barAt`'s smoothstep over `[anchorT, endT]`; endpoints exact (`founding.test.ts:426`) | **holds** — `t ≥ endT` clamps x to 1, so the bar stands at the ceiling for ever |
 * | 2 | *fixed holds the close's bar the whole way through* | **holds** | **holds** — `barAt` returns `endPct` on `shape: 'fixed'` (`threshold.test.ts:21`) | **holds** |
 * | 3 | *a moved close keeps the bar's current value and re-rides to the same ceiling — it never jumps, in either direction* | n/a — no anchors | **holds** — `reAnchor` keeps `barAt(a, tNow)` as the new `anchorPct` (§4.3 v0.49, Ed's; `threshold.test.ts:30`/`:40`). Locked below **in numbers**: continuous to 1e-10, and the remainder slackens on a postponement and steepens on an earlier close | **holds** — `requireOpen` refuses the ⏰ change |
 * | 4 | *a close set to never forces a fixed bar* | **holds by the pen** — `setSetting`'s guard (`founding.test.ts:113`); `seedAnchors` throws behind it | **gap (fold)** — the guard is on `setSetting` and `answer` only. A **`pace` set-motion** carrying a ramp against a perpetual ending is refused nowhere: `openMotion` validates the value's shape and never the cross-setting rule, and `applyPayloadSet` stores it. `computeAnchors` then silently reads `shape: 'fixed'`, so the document *says* rising and *is* flat. Locked below | **holds** — `requireOpen` |
 * | 5 | *an ordinary change of shape mid-window does not step the bar* | n/a | **gap (fold), deliberate on one side** — `reseedAnchorsIfLive(t, 'pace')` calls `computeAnchors(t)`, which **re-seeds** at `startPct` rather than re-anchoring at the current value, so `cs.bar()` steps; and `engineFieldsFor('pace')` returns `{}`, so the engine is **never told** and does not move at all. The two then disagree for the **whole remainder of the window**, not for a frame. NOTES.md's author call — *a room-decided ramp can lower the bar from its fixed-interim ceiling* — endorses the cs step, not the engine's silence. Locked below in numbers | n/a |
 * | 6 | *the bar never falls* (§4.3's *a bar never jumps because timings changed*, and the ramp's own word *rising*) | **gap (both)** — nothing refuses `startPct > bar.pct`. `validateValue` bounds `startPct` at 50–100 alone, and the page's `num(S, 'tStart', …, 50, 99)` carries no dependency on `tClose`. The result is an **inverted ramp**: the bar starts high and falls to the ceiling. The page's clause then goes *silent* about the ramp (`prose.bar`: *a ramp that starts where it ends is not a ramp*, `+start2 < +pct`), so the document reads as fixed while the bar descends | as before 🍾 | the ceiling, reached from above |
 *
 * ## The close in the past
 *
 * `reAnchor` to an `endT` already behind `tNow` is legal (timestamps are
 * non-decreasing, never rewound) and throws nothing: `barAt`'s `span <= 0`
 * branch takes x to 1, so the bar reads the ceiling from that instant. Note
 * the anchors' `shape` stays `'ramp'` — only `newEndT === null` makes it
 * `'fixed'` — so *fixed at the ceiling* is `barAt`'s arithmetic and not the
 * record's word. Locked below.
 *
 * ## The surface, in one line
 *
 * 🪜 is **not in `ORDER`** and has no clause of its own (SURFACE X8, Q512): a
 * fixed threshold is one sentence and a rising one is the same sentence saying
 * where it starts, so the ramp is a tab in 🌡️'s stack and 🌡️'s commit answers
 * it on **both** branches (F18, `session-view.html:804`). `PROPOSE.pace`
 * composes the motion. Nothing on the page ever draws `cs.bar()` — its one
 * caller outside this package is `sim-harness/src/founding-evidence.ts:171` —
 * which is what keeps promise 5's disagreement **latent** rather than visible.
 *
 * Cites rather than duplicates: `threshold.test.ts` (anchor parity, the two
 * close moves, perpetual pinning, smoothstep clamping), `catalogue.test.ts:96`
 * (ordinary, not delegable, `no startPct`), `founding.test.ts:113`/`:206`/`:426`.
 * 🌡️ (entry 86) and ⏰ (entry 88) own the rest of `threshold.ts`.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { barAt, reAnchor, seedAnchors } from '../src/threshold.js';
import { DEFAULT_TUNING, engineFieldsFor, toEngineConstitution } from '../src/adapter.js';
import { entryOf } from '../src/catalogue.js';
import { validateValue } from '../src/values.js';
import type { PaceValue } from '../src/values.js';
import { adoptionThreshold } from '../../engine-core/src/adoption-threshold.js';

/**
 * A constituted solo document, founder-held throughout, with the window, the
 * close bar and the pacing named by the caller. `t = 0` is both the founding
 * and 🍾, so the ramp's anchor is the window's own start.
 */
function paced(pace: PaceValue, endsAtMs: number | null, barPct = 66) {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  s.confirmStartingText(0, 'The clubhouse shall be kept open.');
  // ending first: 🪜's guard and 🌡️'s ceiling are both read off it
  const values = {
    ending: { endsAtMs },
    bar: { pct: barPct },
    pace,
    quorum: { form: 'count', n: 1 },
    authorship: { rung: 'sealed' },
    judgments: { rung: 'after' },
    chamber: { rung: 'link' },
    applications: { apply: false },
    admission: { price: 'assembly' },
    rate: { grant: 4, cap: 8, dripMinutes: 240 },
    machines: { enabled: false, budget: 0 },
    removal: { price: 'consent' },
    lapse: { afterMs: null },
  } as const;
  for (const [id, v] of Object.entries(values)) s.setSetting(0, id as never, v as never);
  s.begin(0);
  expect(s.constitutedAtT).toBe(0);
  return s;
}

/**
 * The engine's bar for the document **as it was opened**. The engine learns a
 * constitution once, at open, and thereafter only through `amend` — so the
 * honest comparison snapshots it before the change and reads it afterwards,
 * exactly as an engine that was never told would.
 */
function engineAtOpen(s: ConstitutionSession) {
  const c = toEngineConstitution(s, DEFAULT_TUNING, 'seed').constitution;
  return (t: number) => adoptionThreshold(c, t) * 100;
}

/** The largest step the bar takes between neighbouring samples of [a, b]. */
function biggestStep(bar: (t: number) => number, a: number, b: number, n = 400): number {
  let worst = 0;
  let prev = bar(a);
  for (let i = 1; i <= n; i++) {
    const here = bar(a + ((b - a) * i) / n);
    worst = Math.max(worst, Math.abs(here - prev));
    prev = here;
  }
  return worst;
}

describe('🪜 the values, and what the catalogue says they are', () => {
  it('fixed carries no start; a ramp needs one, 50–100', () => {
    expect(validateValue('pace', { shape: 'fixed' })).toBeNull();
    expect(validateValue('pace', { shape: 'ramp', startPct: 50 })).toBeNull();
    expect(validateValue('pace', { shape: 'ramp', startPct: 100 })).toBeNull();
    expect(validateValue('pace', { shape: 'ramp', startPct: 49 })).toMatch(/50–100/);
    expect(validateValue('pace', { shape: 'ramp' })).toMatch(/50–100/);
    expect(validateValue('pace', { shape: 'rising' })).toMatch(/'fixed' or 'ramp'/);
    // `fixed carries no startPct` and the ordinary route: catalogue.test.ts:96
  });

  it('🪜 is ordinary, the founder’s, dependent on ⏰, and has no question to ask', () => {
    const e = entryOf('pace');
    expect(e.kind).toBe('ordinary');
    expect(e.delegable).toBe(false);      // Q415/Q560 — pacing stays with the founder
    expect(e.deps).toEqual(['ending']);
    expect(e.judgeGate).toBe(false);      // 🍾 never waits on it
    expect(e.consent).toBeUndefined();    // nothing ever resolves a founding answer
  });

  // Q415 (`founding.test.ts:206` asserts the hand-over half). The consequence
  // this file is here for: `answer`'s own *perpetual forces a fixed bar* guard
  // (session.ts:1337) sits behind `collecting`, which 🪜 can never be — so on
  // the command layer it is **unreachable**, and `setSetting`'s copy is the
  // only one of the pair that runs.
  it('🪜 never collects — so `answer`’s copy of the perpetual guard is dead code', () => {
    const s = ConstitutionSession.open({
      title: 'T', slug: 't', convenor: { id: 'ada', email: 'a@example.org', isMember: true },
    }, 0);
    expect(s.settingState('pace').collecting).toBe(false);
    expect(() => s.answer(1, 'ada', 'pace', { shape: 'fixed' })).toThrow(/not collecting/);
    s.confirmStartingText(1, 'x');
    s.delegate(2, 'pace');                                  // a hand-over, not a question
    expect(s.settingState('pace').holder).toBe('members');
    expect(s.settingState('pace').collecting).toBe(false);
    expect(() => s.answer(3, 'ada', 'pace', { shape: 'fixed' })).toThrow(/not collecting/);
  });
});

describe('🪜 promises 1–2: the shape over the window', () => {
  it('a ramp anchors at judging’s open, rises to the close bar, and never steps', () => {
    const s = paced({ shape: 'ramp', startPct: 50 }, 100_000, 90);
    expect(s.bar(0)).toBeCloseTo(50, 10);
    expect(s.bar(50_000)).toBeCloseTo(70, 10);   // 50 + 40·smoothstep(0.5)
    expect(s.bar(100_000)).toBeCloseTo(90, 10);
    expect(s.bar(10_000_000)).toBeCloseTo(90, 10); // past the close, the ceiling stands
    // never jumps: over 400 samples of the window the largest step is the
    // curve's own, which is bounded by 1.5·(rise/n)
    expect(biggestStep((t) => s.bar(t)!, 0, 100_000)).toBeLessThan(1.5 * (40 / 400) + 1e-9);
  });

  it('fixed holds the close bar from the first instant to the last', () => {
    const s = paced({ shape: 'fixed' }, 100_000, 66);
    for (const t of [0, 1, 50_000, 99_999, 100_000, 10_000_000]) {
      expect(s.bar(t)).toBeCloseTo(66, 10);
    }
  });
});

describe('🪜 promise 3: a moved close keeps the value, in numbers', () => {
  const a = seedAnchors('ramp', 50, 90, 0, 100_000);

  it('postponing keeps the value exactly and slackens the remainder', () => {
    const at = barAt(a, 50_000);
    expect(at).toBeCloseTo(70, 10);
    const b = reAnchor(a, 50_000, 200_000);
    expect(barAt(b, 50_000)).toBeCloseTo(at, 10);            // continuous
    expect(barAt(b, 200_000)).toBeCloseTo(90, 10);           // same ceiling
    // slackens: the same 20 points now spread over 150_000ms rather than
    // 50_000, so the mean rate falls to a third
    const before = (90 - at) / (100_000 - 50_000);
    const after = (90 - at) / (200_000 - 50_000);
    expect(after).toBeCloseTo(before / 3, 12);
    expect(barAt(b, 75_000)).toBeLessThan(barAt(a, 75_000)); // and lags the old ramp
    // never jumps: across the move no sample-to-sample move is as much as a
    // hundredth of the climb that is left
    expect(biggestStep((t) => barAt(b, t), 49_000, 51_000)).toBeLessThan((90 - at) / 100);
  });

  it('an earlier close keeps the value exactly and steepens the remainder', () => {
    const at = barAt(a, 50_000);
    const b = reAnchor(a, 50_000, 60_000);
    expect(barAt(b, 50_000)).toBeCloseTo(at, 10);            // continuous
    expect(barAt(b, 60_000)).toBeCloseTo(90, 10);            // same ceiling, sooner
    const before = (90 - at) / (100_000 - 50_000);
    const after = (90 - at) / (60_000 - 50_000);
    expect(after).toBeCloseTo(before * 5, 12);
    expect(barAt(b, 55_000)).toBeGreaterThan(barAt(a, 55_000));
    expect(biggestStep((t) => barAt(b, t), 49_000, 51_000)).toBeLessThan((90 - at) / 100);
  });

  it('and the bar never falls across either move', () => {
    for (const newEnd of [200_000, 60_000]) {
      const b = reAnchor(a, 50_000, newEnd);
      const bar = (t: number) => (t < 50_000 ? barAt(a, t) : barAt(b, t));
      let prev = -Infinity;
      for (let t = 0; t <= 210_000; t += 250) {
        const here = bar(t);
        expect(here + 1e-12).toBeGreaterThanOrEqual(prev);
        prev = here;
      }
    }
  });

  // The entry's *a close in the past*. Nothing throws, and `barAt`'s
  // `span <= 0` branch pins the bar at the ceiling from that instant — but
  // the anchors' own word is still `'ramp'`: only `newEndT === null` rewrites
  // `shape` (threshold.ts:67), so *fixed at the ceiling* is the arithmetic's
  // answer and not the record's.
  it('a close moved into the past pins the bar at the ceiling and throws nothing', () => {
    const b = reAnchor(a, 50_000, 20_000);
    expect(b.shape).toBe('ramp');
    expect(b.endT).toBe(20_000);
    expect(b.anchorPct).toBeCloseTo(70, 10);
    for (const t of [50_000, 50_001, 1_000_000]) expect(barAt(b, t)).toBeCloseTo(90, 10);
  });
});

describe('🪜 promise 4: never forces fixed — kept by the pen, not by the motion', () => {
  it('the founder’s pen is refused, and `seedAnchors` refuses behind it', () => {
    const s = paced({ shape: 'fixed' }, null, 66);
    expect(() => s.setSetting(1, 'pace', { shape: 'ramp', startPct: 55 }))
      .toThrow(/perpetual forces a fixed bar/);
    expect(() => seedAnchors('ramp', 55, 66, 0, null)).toThrow(/perpetual/);
    // and the perpetual document's own bar is the ceiling, for ever
    expect(s.bar(0)).toBeCloseTo(66, 10);
    expect(s.bar(10_000_000_000)).toBeCloseTo(66, 10);
    // pre-start: founding.test.ts:113 asserts the same refusal on the way in
  });

  // **The gap.** `openMotion` validates the value's *shape* (`validateFor`)
  // and nothing about the setting it depends on; `applyPayloadSet` stores what
  // carries. So the ordinary route walks round `setSetting`'s guard, and the
  // document ends up recording a ramp that `computeAnchors` reads as fixed —
  // the clause says *starts at 55% and rises*, the bar sits at 66 for ever.
  // Filed: *🪜 · the motion route carries no perpetual guard*.
  it('gap: a `pace` motion carrying a ramp against a perpetual ⏰ is refused nowhere', () => {
    const s = paced({ shape: 'fixed' }, null, 66);
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    // the motion opens — no cross-setting check on the way in
    const m = s.openMotion(1, 'ada', {
      kind: 'set', setting: 'pace', value: { shape: 'ramp', startPct: 55 },
    });
    expect(s.motionRecords().get(m)!.route).toBe('ordinary');
    s.adjudicateOrdinaryMotion(2, m, 'carried');
    // 🪜 is founder-held, so the carry waits on the crown's assent — which is
    // the last hand the value passes through, and it is asked nothing about
    // the ending either
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    const q = [...s.crownQuestionRecords().values()].find((x) => x.motion === m)!;
    s.answerCrownQuestion(2, q.id, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    // …and lands: the value says rising, the bar says flat
    expect(s.settingState('pace').value).toEqual({ shape: 'ramp', startPct: 55 });
    expect(s.bar(2)).toBeCloseTo(66, 10);
    expect(s.bar(10_000_000)).toBeCloseTo(66, 10);
  });
});

describe('🪜 promise 5: a pace change mid-window, in numbers', () => {
  // The seam NOTES.md names — *the engine glides, the cs display re-seeds*.
  // The audit's number: the two do not re-converge until the close, because
  // `engineFieldsFor('pace', …)` is `{}`, so the engine is not told *at all*.
  // Filed: *🪜 · a pace change steps `cs.bar()` and never reaches the engine*.
  it('gap: fixed → ramp steps the cs bar down 11 points and leaves the engine at 66', () => {
    const s = paced({ shape: 'fixed' }, 100_000, 66);
    const engine = engineAtOpen(s);
    expect(s.bar(50_000)).toBeCloseTo(66, 10);
    expect(engine(50_000)).toBeCloseTo(66, 10);

    s.setSetting(50_000, 'pace', { shape: 'ramp', startPct: 55 });

    expect(s.bar(50_000)).toBeCloseTo(55, 10);          // the step: −11, instantaneous
    expect(s.bar(75_000)).toBeCloseTo(60.5, 10);        // 55 + 11·smoothstep(0.5)
    expect(s.bar(100_000)).toBeCloseTo(66, 10);         // they re-converge at the close
    // the engine's own bar never moves, because the bridge has nothing to
    // send: the mapper's `pace` case is `{}`, so `sync` assembles no
    // amendment and `engine.amend` is never called at all
    expect(engineFieldsFor('pace', { shape: 'ramp', startPct: 55 }, 50_000)).toEqual({});
    expect(engine(50_000)).toBeCloseTo(66, 10);
    expect(engine(75_000)).toBeCloseTo(66, 10);
    // …so the disagreement stands for the whole remainder, not for a frame
    expect(Math.abs(engine(75_000) - s.bar(75_000)!)).toBeCloseTo(5.5, 10);
  });

  it('gap: ramp → fixed steps the cs bar *up* to the ceiling while the engine keeps climbing', () => {
    const s = paced({ shape: 'ramp', startPct: 50 }, 100_000, 90);
    const engine = engineAtOpen(s);
    expect(s.bar(50_000)).toBeCloseTo(70, 10);
    expect(engine(50_000)).toBeCloseTo(70, 10);         // parity while nothing has moved

    s.setSetting(50_000, 'pace', { shape: 'fixed' });

    expect(s.bar(50_000)).toBeCloseTo(90, 10);          // the step: +20, instantaneous
    expect(engine(50_000)).toBeCloseTo(70, 10);         // the engine glides on, untold
    expect(engine(75_000)).toBeCloseTo(83.75, 10);
    expect(s.bar(75_000)).toBeCloseTo(90, 10);
  });

  // The other half of the seam, and the one that holds: an ⏰ change goes
  // through `reAnchor` on the cs side and `windowEndMs` on the engine's, so
  // both keep the current value and neither steps (§4.3 v0.49, Ed's).
  it('by contrast a moved close re-anchors the cs bar continuously', () => {
    const s = paced({ shape: 'ramp', startPct: 50 }, 100_000, 90);
    const at = s.bar(50_000)!;
    s.setSetting(50_000, 'ending', { endsAtMs: 200_000 });
    expect(s.bar(50_000)).toBeCloseTo(at, 10);
    expect(s.bar(200_000)).toBeCloseTo(90, 10);
    expect(biggestStep((t) => s.bar(t)!, 50_000, 51_000)).toBeLessThan(1e-2);
  });

  it('before 🍾 there are no anchors to reseed, and the start seeds them', () => {
    const s = ConstitutionSession.open({
      title: 'T', slug: 't', convenor: { id: 'ada', email: 'a@example.org', isMember: true },
    }, 0);
    expect(s.bar(0)).toBeNull();                 // nothing to display before judging opens
    const s2 = paced({ shape: 'ramp', startPct: 50 }, 100_000, 90);
    expect(s2.bar(0)).toBeCloseTo(50, 10);       // seeded at the start, not at creation
  });

  it('after the close 🪜 cannot be changed at all', () => {
    const s = paced({ shape: 'ramp', startPct: 50 }, 100_000, 90);
    s.tick(100_000);
    expect(s.closed).toBe(true);
    expect(() => s.setSetting(100_001, 'pace', { shape: 'fixed' }))
      .toThrow(/the document has closed/);
    expect(s.bar(100_001)).toBeCloseTo(90, 10);  // pinned at the ceiling
  });
});

describe('🪜 promise 6: the bar never falls', () => {
  // **The gap, in both halves.** `validateValue` bounds `startPct` at 50–100
  // and never against `bar.pct`, and the page's ramp field is
  // `num(S, 'tStart', …, 50, 99)` with no dependency on `tClose`. So a ramp
  // may start *above* the close's bar, and the bar descends over the window
  // — the opposite of what *Rising Approval Threshold?* promises. Worse on
  // the surface: `prose.bar` prints the ramp clause only while
  // `+start2 < +pct`, so the document goes silent about the ramp exactly
  // when it is inverted, and reads as a plain fixed 66.
  // Filed: *🪜 · an inverted ramp is accepted and then unsaid*.
  it('gap: nothing refuses a ramp that starts above the close bar, and it falls', () => {
    expect(validateValue('pace', { shape: 'ramp', startPct: 90 })).toBeNull();
    const s = paced({ shape: 'ramp', startPct: 90 }, 100_000, 66);
    expect(s.bar(0)).toBeCloseTo(90, 10);
    expect(s.bar(50_000)).toBeCloseTo(78, 10);   // 90 − 24·smoothstep(0.5)
    expect(s.bar(100_000)).toBeCloseTo(66, 10);
    expect(s.bar(50_000)!).toBeLessThan(s.bar(0)!);  // it falls, monotonically
    // the engine takes the same inversion through `adoptionThresholdStart`
    const engine = engineAtOpen(s);
    expect(engine(0)).toBeCloseTo(90, 10);
    expect(engine(100_000)).toBeCloseTo(66, 10);
  });
});
