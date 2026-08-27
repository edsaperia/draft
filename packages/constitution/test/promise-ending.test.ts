/**
 * **Promise-coverage — ⏰ ending, the window** (backlog entry 88, series 77,
 * batch L). One setting, two shapes of value, and every promise it makes to
 * the room about **the close**: enumerate them, find the enforcement twice —
 * in the fold and on the surface — in all three epochs, lock what holds and
 * file what does not. **This file fixes nothing.** Where it locks behaviour
 * the audit calls a gap, the `it` says so in its own name and its comment
 * names the finding, so the lock fails the day either side of the
 * disagreement moves without the other.
 *
 * `EndingValue` is `{ endsAtMs: number | null }` (`values.ts`), null meaning
 * *never*. The catalogue entry is **constitutional**, **delegable**, no
 * `deps`, **not** a judge-gate, its consent order `neverIsHighest` (*the
 * earliest close you will accept — never being the latest of all*), and it
 * carries the one `routeOf` in the catalogue: the line between ordinary and
 * constitutional falls **inside** the setting (Q329, SPEC §9.7.1 X2).
 *
 * ## The enumeration — every promise, in every epoch
 *
 * Fold = the method that keeps or breaks it. Surface = the control on
 * `design/session-view.html`. **holds** · **gap (fold)** · **gap (surface)**.
 *
 * | # | the promise, in the room's words | before 🍾 | live | after the close |
 * | --- | --- | --- | --- | --- |
 * | 1 | *at the ending the record is cut, on the clock, with nobody pressing anything* | n/a — `tick`'s close is guarded on `constitutedT !== null`, so a founding that runs past its own date is not closed under the founder (locked below) | **holds** — `session.ts` `tick` tests the close **first** and returns; `runClose` stamps at the **ending**, not at `t`, however late the tick lands (locked below). The server drives it: `main.ts`'s `setInterval` → `server.ts` `tick` → `driveBridge` (engine first, §4.6) → `cs.tick(tOf(…))` | **holds** — a second `tick` past the close does nothing |
 * | 2 | *after the cut nothing changes but the signing* | n/a | n/a | **holds** — `requireOpen` guards every mutator with §4.6's own sentence; `acknowledgeClose` is the one exception, and `arrive` refuses in its own words. Sixteen doors locked below |
 * | 3 | *a constitutional motion still running is kept — what stands stands* | n/a | n/a | **holds** — `runClose` emits `motion-kept-at-close` (`close.test.ts:33`); a pending 👑 fails closed and an outstanding invitation expires (`close.test.ts:47`) |
 * | 4 | *never means a perpetual document: the clock never closes it* | **holds** — `tick` reads `endsAtMs !== null` | **gap (fold), and the sharpest one here** — through the bridge, **amending ⏰ to *never* closes the document at once**. `engineFieldsFor('ending', …, t)` pins a perpetual window to the *moment of the change*, so `windowEndMs = t > windowStartMs`: the engine's `windowed()` reads **true** and `dueToClose(t)` is `t >= t`. The next `engine.tick` runs the final batch and `finishClose` closes the constitution behind it. Locked below | n/a — a perpetual document has **no third epoch**, which is a case in itself |
 * | 5 | *a perpetual document's bar is fixed* (§9.0) | **holds** — `setSetting`/`answer` refuse a ramp against a null ending | **holds, by the anchors and not by the value** — `computeAnchors` reads `shape: 'fixed'` whenever `endT === null`, and `reAnchor(a, t, null)` returns `shape: 'fixed'` at the ceiling. But the **`pace` value is left saying `ramp`**: nothing refuses ⏰→never while 🪜 stands ramp, which is the mirror of entry 87's promise 4 (`promise-pace.test.ts`, the `pace`-motion side). Locked below | n/a |
 * | 6 | *giving or removing an ending is constitutional; moving the date is ordinary* | n/a — before the start nothing is amended, only set (§9.6a) | **holds in the fold** — `motionRouteOf` → `catalogue.ts`'s `routeOf`, symmetric across never (NOTES.md; `catalogue.test.ts:92`/`:93`, `motions.test.ts:261`). **gap (surface)** — the page's own second `routeOf` is a regex over the *composed proposed prose* and never looks at what stands, so a date proposed against a standing **never** composes as ✏️ ordinary and opens 🏛️ constitutional. Locked below | **holds** — `requireOpen` refuses the motion |
 * | 7 | *…and the founder's pen is not the route* | n/a | **holds by design, worth saying out loud** — `setSetting` consults `requireOpen`, the powers and `validateFor`, and **never `routeOf`**: a founder holding ⏰ removes the ending outright, alone. That is the retained unilateral power working as §9.7 says (a pen change is an amendment, reported as one, `MotionRoute` `'pen'`), and X2's split simply has no purchase on it. Locked below so a later reading of X2 cannot quietly assume otherwise | **holds** — `requireOpen` |
 * | 8 | *a close moved into the past is handled, not a corrupted record* | — | **gap (fold)** — it is *refused*, and refused for ever. Both closes stamp at the **ending**, so `runClose` emits behind the log and `emit`'s Q679 guard throws before pushing. The chain is intact (`close.test.ts:190`) — but the document **can never close and can never tick again**, and because the close is tested first, the **lapse, crown and freeze clocks stop with it**. `server.ts:388` contains the blast radius to one document and logs once a minute; nothing repairs it. Locked below, including the stopped lapse clock | n/a |
 * | 9 | *a close moved backwards but still ahead of the log closes cleanly* | — | **holds** — `runClose(endsAtMs)` with `endsAtMs >= lastT` is legal, the close stamps in the past relative to real now, and a motion still running settles at the ending — never before its own opening, which is the record-ordering worry answered. Locked below | **holds** |
 *
 * ## The two `routeOf`s, side by side
 *
 * ```
 * catalogue.ts:129   (p, c) => p.endsAtMs === null || c.endsAtMs === null
 *                                ? 'constitutional' : 'ordinary'
 * session-view.html:1654  (v) => /never|perpetual|no end/i.test(v)
 *                                ? 'constitutional' : 'ordinary'
 * ```
 *
 * One is typed and reads **both** sides; the other is a regex over the
 * member-facing sentence the composer built and reads only the **proposed**
 * one. They agree on three of the four transitions and disagree on
 * never→date. SPEC X2's own wording (*moving the date is ordinary, removing
 * the ending constitutional*) and both of the ⏰ card's notes describe only
 * the removal direction too — so the page is faithful to the spec and the
 * **fold** is the stricter of the three. NOTES.md is where the symmetry was
 * decided, and it says so: *the plan's phrasing covered only the
 * proposed-value side*.
 *
 * ## The server clock, in one paragraph
 *
 * `main.ts:30` is a bare `setInterval` over `draft.tick()`; `server.ts:383`
 * walks `store.all()`, skips anything unconstituted, and for each document
 * runs `driveBridge(doc, tOf(…))` then `doc.cs.tick(tOf(…))` inside a
 * per-document `try`. `tOf` is `Math.max(nowMs, lastEventT)` — the module
 * requires non-decreasing time and this is where it is supplied. The engine
 * goes first because the final adoption batch must land while the
 * constitution is still open (§4.6). The only exemption is `ladderClock`
 * (`server.ts:1135`), which is inside a `DEV:` label, additionally gated on
 * `mailer.dev` and on the slug starting `ladder-`, and touches **presence**
 * (Q681), not the close — production has no exemption of any kind.
 *
 * Cites rather than duplicates: `close.test.ts` (the clock close, the kept
 * motion, the expired invitation, signing, replay across the close, the
 * backwards close's intact chain), `motions.test.ts:261` and
 * `catalogue.test.ts:92`/`:93` (the route both ways), `catalogue.test.ts:134`
 * (never is the latest of all), `bridge.test.ts:114` (the perpetual motion
 * carrying), `promise-pace.test.ts` (the anchors, the ramp, the close in the
 * past read as a bar). The surface half of promises 1–3 is locked by the seat
 * matrix's `ladder-closing`/`ladder-closed` steps (`scripts/seat-matrix.mjs:383`).
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { EngineBridge } from '../src/engine-bridge.js';
import { entryOf, motionRouteOf } from '../src/catalogue.js';
import { engineFieldsFor } from '../src/adapter.js';
import { view } from '../src/view.js';
import { buildConstituted } from './helpers.js';
import type { EndingValue, LapseValue, PaceValue } from '../src/values.js';

/**
 * A constituted document the founder holds **outright**, so the pen can move
 * ⏰ after the start without a motion — the shape `close.test.ts`'s own
 * `penHeld` uses, with the window, the pacing and the lapse rule named by the
 * caller and a second member so the roster is not a special case.
 */
function penHeld(opts: {
  endsAtMs?: number | null;
  pace?: PaceValue;
  lapse?: LapseValue;
  bar?: number;
} = {}): { s: ConstitutionSession; bo: string } {
  const s = ConstitutionSession.open({
    title: 'Night Watch', slug: 'night-watch',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 10);
  const bo = s.invite(10, 'bo@example.org');
  s.arrive(10, bo);
  s.confirmStartingText(10, 'The watch is kept from dusk.');
  const values: [string, unknown][] = [
    // ⏰ first: 🌡️ and 🪜 are both read off it
    ['ending', { endsAtMs: opts.endsAtMs === undefined ? 1_000_000 : opts.endsAtMs }],
    ['bar', { pct: opts.bar ?? 66 }], ['pace', opts.pace ?? { shape: 'fixed' }],
    ['quorum', { form: 'count', n: 1 }], ['authorship', { rung: 'sealed' }],
    ['judgments', { rung: 'after' }], ['chamber', { rung: 'link' }],
    ['lapse', opts.lapse ?? { afterMs: null }],
    ['applications', { apply: false }], ['removal', { price: 'consent' }],
    ['admission', { price: 'assembly' }],
    ['machines', { enabled: false, budget: 0 }],
    ['rate', { grant: 4, cap: 8, dripMinutes: 240 }],
  ];
  for (const [id, v] of values) s.setSetting(10, id as never, v as never);
  s.begin(10);
  return { s, bo };
}

/** `design/session-view.html:1654`, copied verbatim — the page's second route. */
const pageRouteOf = (composed: string): 'constitutional' | 'ordinary' =>
  (/never|perpetual|no end/i.test(composed) ? 'constitutional' : 'ordinary');

const endingOf = (s: ConstitutionSession): EndingValue =>
  s.settingState('ending').value as EndingValue;

// ---------------------------------------------------------------------------
// 1 · the cut happens on the clock, at the ending, and nobody presses anything

describe('⏰ 1 — the record is cut on the clock (SPEC §4.6)', () => {
  it('the close stamps at the *ending*, not at the tick that noticed it', () => {
    const { s } = penHeld({ endsAtMs: 1_000_000 });
    // a host that was asleep for a week still cuts the record where the room
    // agreed it would be cut — which is also why a past ending is dangerous
    // at all (promise 8): every close event lands behind `t`.
    s.tick(9_000_000);
    expect(s.closed).toBe(true);
    expect(s.closedAt).toBe(1_000_000);
    expect(s.logEntries().at(-1)!.event.t).toBe(1_000_000);
  });

  it('the close is tested before the lapse and freeze clocks, and returns', () => {
    // ada and bo both quiet since t=10 under a 100_000ms lapse rule: at
    // t = 1_000_000 both are long overdue, and neither lapses, because the
    // close is the first thing `tick` tests and it returns on it.
    const { s, bo } = penHeld({ endsAtMs: 1_000_000, lapse: { afterMs: 100_000 } });
    s.tick(1_000_000);
    expect(s.closed).toBe(true);
    expect(s.memberRecords().get(bo)!.lapsed).toBe(false);
    expect(s.frozen).toBe(false);
  });

  it('a founding that runs past its own closing date is not closed under the founder', () => {
    // `tick`'s close is guarded on `constitutedT !== null` (§9.6a: before the
    // start there is nothing to cut), so ⏰ has no force in the first epoch.
    const s = ConstitutionSession.open({
      title: 'Night Watch', slug: 'night-watch',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 10);
    s.setSetting(10, 'ending', { endsAtMs: 20 });
    s.tick(1_000);
    expect(s.closed).toBe(false);
    expect(s.constitutedAtT).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// 2 · after the cut, nothing changes but the signing

describe('⏰ 2 — after the close every door is shut but the signing (SPEC §4.6)', () => {
  it('sixteen mutators refuse with §4.6’s own sentence', () => {
    const { s, bo } = penHeld({ endsAtMs: 1_000_000 });
    const dee = s.invite(20, 'dee@example.org');
    s.tick(1_000_000);
    const T = 1_000_100;
    const shut: [string, () => unknown][] = [
      ['setSetting', () => s.setSetting(T, 'ending', { endsAtMs: null })],
      ['setConvenorMembership', () => s.setConvenorMembership(T, false)],
      ['setQuorumForm', () => s.setQuorumForm(T, 'share')],
      ['delegate', () => s.delegate(T, 'bar')],
      ['relinquish', () => s.relinquish(T, 'bar', 'unilateral')],
      ['reclaim', () => s.reclaim(T, 'bar')],
      ['confirmStartingText', () => s.confirmStartingText(T, 'more')],
      ['setIdentity', () => s.setIdentity(T, bo, { name: 'Bo' })],
      ['invite', () => s.invite(T, 'eve@example.org')],
      ['remove', () => s.remove(T, bo)],
      ['resign', () => s.resign(T, bo)],
      ['uninvite', () => s.uninvite(T, dee)],
      ['answer', () => s.answer(T, bo, 'ending', { endsAtMs: 5 })],
      ['giveOk', () => s.giveOk(T, bo, 'ending')],
      ['begin', () => s.begin(T)],
      ['openMotion', () => s.openMotion(T, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } })],
      ['signOut', () => s.signOut(T, bo, 'holding')],
    ];
    for (const [name, act] of shut) {
      expect(() => act(), name).toThrow(/closed/);
    }
    // arriving refuses in its own words — there is nothing left to join
    expect(() => s.arrive(T, dee)).toThrow(/nothing left to join/);
    // and the one door that stays open is the signature
    s.acknowledgeClose(T, bo, 'signed');
    expect(view(s, bo).closed!.mySignature!.comment).toBe('signed');
  });
});

// ---------------------------------------------------------------------------
// 4 & 5 · never means perpetual

describe('⏰ 4 — never means a perpetual document', () => {
  it('a document born perpetual never closes, however far the clock runs', () => {
    const { s } = penHeld({ endsAtMs: null });
    s.tick(9_000_000_000);
    expect(s.closed).toBe(false);
    // only a host standing in for a clock that will never come can cut it
    s.close(9_000_000_000);
    expect(s.closed).toBe(true);
  });

  it('its bar is fixed for ever, and a ramp against it is refused at the pen', () => {
    const { s } = penHeld({ endsAtMs: null, bar: 66 });
    expect(s.bar(10)).toBe(66);
    expect(s.bar(9_000_000_000)).toBe(66);
    expect(() => s.setSetting(20, 'pace', { shape: 'ramp', startPct: 55 }))
      .toThrow(/perpetual forces a fixed bar/);
  });

  it('GAP (fold) — amending a live document to *never* closes it on the spot', () => {
    // `engineFieldsFor('ending', {endsAtMs: null}, t)` pins the perpetual
    // window to **the moment of the change**, so the engine's window stops
    // being zero-span the instant a live document is made perpetual:
    // `windowEndMs = t > windowStartMs` ⇒ `windowed()` true ⇒ `dueToClose(t)`
    // is `t >= t`. The very next engine tick runs the final batch and
    // `finishClose` closes the constitution behind it. *Never* is the one
    // answer to ⏰ that a live document cannot reach through the bridge.
    const { s, bo, cy } = buildConstituted(); // ⏰ members-held, stands at 1_000_000
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'ending-perpetual' });
    const m = s.openMotion(10, bo, { kind: 'set', setting: 'ending',
      value: { endsAtMs: null } });
    s.answerMotion(11, cy, m, 'accept');
    s.answerMotion(12, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(endingOf(s).endsAtMs).toBe(null); // the room got what it asked for
    expect(s.closed).toBe(false);            // …and the constitution is open

    bridge.tick(20); // the host's next minute
    // the pin, stated in the terms the adapter itself uses
    expect(engineFieldsFor('ending', { endsAtMs: null }, 20)).toEqual({ windowEndMs: 20 });
    expect(bridge.engine.closed).toBe(true);
    expect(s.closed).toBe(true);
    expect(s.closedAt).toBe(20);
  });

  it('GAP (fold) — ⏰→never leaves 🪜 saying *ramp* while the anchors go fixed', () => {
    // The mirror of entry 87's promise 4. `reAnchor(a, t, null)` returns
    // `shape: 'fixed'` at the ceiling, so the *bar* is right; nothing
    // refuses or rewrites the `pace` value, so the *record* still says
    // rising. Cited, not re-derived: `promise-pace.test.ts` owns the ramp.
    const { s } = penHeld({ endsAtMs: 1_000_000, pace: { shape: 'ramp', startPct: 55 }, bar: 66 });
    expect(s.bar(10)).toBe(55);
    s.setSetting(20, 'ending', { endsAtMs: null });
    expect(s.bar(20)).toBe(66);              // fixed, at the ceiling, at once
    expect(s.bar(9_000_000)).toBe(66);
    expect((s.settingState('pace').value as PaceValue).shape).toBe('ramp'); // the gap
  });
});

// ---------------------------------------------------------------------------
// 6 & 7 · the route splits inside the setting

describe('⏰ 6 — the route is a fact about the value (Q329, X2)', () => {
  const ending = entryOf('ending');

  it('the fold is symmetric across never; the page’s regex is not', () => {
    // Every transition, in the fold. Both directions across never are
    // constitutional (NOTES.md's author call), which `catalogue.test.ts:92`
    // already pins; what is new here is the page's copy of the rule beside
    // it. `page` is what the ⏰ card composes for that transition, or null
    // where the card cannot compose one at all: an *unset* ⏰ is refused by
    // `openMotion` before any route is asked for (*no settled value to move
    // against*), and it never reaches the composer.
    const table: {
      name: string; proposed: EndingValue; current: EndingValue | null;
      fold: 'constitutional' | 'ordinary'; page: string | null;
    }[] = [
      { name: 'date → date', proposed: { endsAtMs: 2e6 }, current: { endsAtMs: 1e6 },
        fold: 'ordinary', page: 'Saturday, 18:00' },
      { name: 'date → never', proposed: { endsAtMs: null }, current: { endsAtMs: 1e6 },
        fold: 'constitutional', page: 'Never — it runs until too few members are active' },
      { name: 'never → date', proposed: { endsAtMs: 2e6 }, current: { endsAtMs: null },
        fold: 'constitutional', page: 'Saturday, 18:00' },
      { name: 'unset → date', proposed: { endsAtMs: 2e6 }, current: null,
        fold: 'constitutional', page: null },
    ];
    for (const row of table) {
      expect(motionRouteOf(ending, row.proposed, row.current), row.name).toBe(row.fold);
    }
    // the two the page can compose *and* gets right
    for (const row of table.filter((r) => r.page !== null && r.name !== 'never → date')) {
      expect(pageRouteOf(row.page!), row.name).toBe(row.fold);
    }
    // …and never → date is the drift: the page composes an ordinary ✏️
    // proposal for a change the fold opens as a 🏛️ assembly. The regex sees
    // only what is *typed*, so a date proposed against a standing *never*
    // reads as a date like any other.
    expect(pageRouteOf('Saturday, 18:00')).toBe('ordinary');
    expect(motionRouteOf(ending, { endsAtMs: 2e6 }, { endsAtMs: null })).toBe('constitutional');
  });

  it('and the drift is reachable: the motion opens 🏛️ where the page pressed ✏️', () => {
    const { s, bo, cy } = buildConstituted();
    // the room first makes the document perpetual, unanimously
    const m1 = s.openMotion(10, bo, { kind: 'set', setting: 'ending', value: { endsAtMs: null } });
    s.answerMotion(11, cy, m1, 'accept');
    s.answerMotion(12, 'ada', m1, 'accept');
    expect(endingOf(s).endsAtMs).toBe(null);
    // now somebody gives it a close again. The page's ⏰ card filters the
    // standing *Never* lane out and offers the datetime field alone, so what
    // is composed carries no *never* and `motionCommitHtml` draws
    // "✏️ Propose" — one click, stake 1. The fold disagrees.
    const m2 = s.openMotion(13, cy, { kind: 'set', setting: 'ending', value: { endsAtMs: 2e6 } });
    const rec = s.motionRecords().get(m2)!;
    expect(rec.route).toBe('constitutional');
    expect(rec.stake).toBe(0);
    // and because it is constitutional it takes the mover's one 🏛️: a second
    // such press is refused outright, which the ordinary commit never warns of
    expect(() => s.openMotion(14, cy, { kind: 'set', setting: 'bar', value: { pct: 80 } }))
      .toThrow(/one 🏛️ out per member/);
  });
});

describe('⏰ 7 — the founder’s pen is not the route', () => {
  it('a founder holding ⏰ removes the ending alone, without unanimity', () => {
    // `setSetting` consults `requireOpen`, the powers and `validateFor` — and
    // never `routeOf`. That is §9.7's retained unilateral power behaving as
    // written (a pen change is an amendment and is reported as one), so this
    // is a lock on the shape of the rule rather than a finding: X2's split
    // governs *motions*, and has no purchase on the pen.
    const { s, bo } = penHeld({ endsAtMs: 1_000_000 });
    expect(s.settingState('ending').powers.unilateral).toBe(true);
    s.setSetting(20, 'ending', { endsAtMs: null }, 'We are not done yet.');
    expect(endingOf(s).endsAtMs).toBe(null);
    // `'crown'`, not `'convenor'`: post-start the pen is the retained power
    // being exercised, which is what makes it an amendment rather than a set
    expect(s.settingState('ending').settledBy).toBe('crown');
    // It is still reported as an amendment — `MotionRoute` gains `'pen'` and
    // a unilateral change joins the motions, folded rather than emitted
    // (Q530) — but the route it joins under is `'pen'`, never the
    // `'constitutional'` X2 would have asked of a member proposing it.
    const pen = [...s.motionRecords().values()];
    expect(pen).toHaveLength(1);
    expect(pen[0]!.route).toBe('pen');
    expect(pen[0]!.status).toBe('carried');
    // …but it is news: a constitutional setting owes every member who was
    // here an acknowledgement, whichever hand moved it (Q530).
    expect(view(s, bo).owedOks).toContain('ending');
    s.tick(9_000_000_000);
    expect(s.closed).toBe(false); // and the clock has nothing left to cross
  });

  it('a delegated ⏰ refuses the pen outright', () => {
    const { s } = buildConstituted(); // ⏰ was handed to the members
    expect(() => s.setSetting(10, 'ending', { endsAtMs: null }))
      .toThrow(/not the convenor's to set|given up/);
  });
});

// ---------------------------------------------------------------------------
// 8 & 9 · a close moved into the past

describe('⏰ 8 — a close moved behind the log is refused, and refused for ever', () => {
  it('GAP (fold) — the document can never close, and its other clocks stop too', () => {
    // `close.test.ts:190` locks the half that is right: nothing is written,
    // the chain verifies, the log replays. This locks what is left over — the
    // document is *stuck*. Every tick from here throws before reaching the
    // lapse, crown and freeze clocks, so a document with a past ending is one
    // that neither closes, nor lapses anybody, nor ever freezes.
    const { s, bo } = penHeld({ endsAtMs: 1_000_000, lapse: { afterMs: 100_000 } });
    s.setSetting(20, 'ending', { endsAtMs: 5 }); // accepted: any non-negative time
    const before = s.logEntries().length;

    for (const t of [30, 1_000_000, 9_000_000]) {
      expect(() => s.tick(t)).toThrow(/non-decreasing/);
    }
    expect(s.logEntries()).toHaveLength(before);
    expect(s.verifyChain()).toBe(true);
    expect(s.closed).toBe(false);
    // the collateral: bo was quiet from t=10 under a 100_000ms rule and is
    // hours overdue by t = 9_000_000, and nothing lapsed or warned him
    expect(s.memberRecords().get(bo)!.lapsed).toBe(false);
    expect(s.memberRecords().get(bo)!.lapseWarned).toBe(false);
    // there is one way out, and it is not the clock: a host closing at *now*
    s.close(9_000_000);
    expect(s.closedAt).toBe(9_000_000);
  });

  it('GAP (fold) — a carried ordinary motion reaches the same wall', () => {
    // The route for date→date is ordinary, so this needs no unanimity: one
    // member proposes a close already behind the log and the seam carries it.
    const { s, bo } = buildConstituted(); // ⏰ members-held, stands at 1_000_000
    const m = s.openMotion(10, bo, { kind: 'set', setting: 'ending', value: { endsAtMs: 5 } });
    expect(s.motionRecords().get(m)!.route).toBe('ordinary');
    s.adjudicateOrdinaryMotion(11, m, 'carried');
    expect(endingOf(s).endsAtMs).toBe(5);
    expect(() => s.tick(12)).toThrow(/non-decreasing/);
    expect(s.closed).toBe(false);
  });
});

describe('⏰ 9 — a close moved backwards but still ahead of the log closes cleanly', () => {
  it('it cuts at the ending, and a running motion settles at the ending, never before its own opening', () => {
    // The record-ordering worry, answered: `runClose` stamps every closing
    // event at the ending, so the only question is whether the ending can
    // fall behind an event already written. While it does not, the whole
    // batch is monotone — the kept motion's own settlement included.
    const { s, bo, cy } = buildConstituted(); // last event at t=2, ⏰ at 1_000_000
    const m = s.openMotion(10, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    // the room brings the close forward to t=50 — in the past relative to the
    // host's real clock, but still ahead of the log
    const m2 = s.openMotion(11, cy, { kind: 'set', setting: 'ending', value: { endsAtMs: 50 } });
    s.adjudicateOrdinaryMotion(12, m2, 'carried');
    expect(endingOf(s).endsAtMs).toBe(50);

    s.tick(9_000_000); // a tick from the far future
    expect(s.closed).toBe(true);
    expect(s.closedAt).toBe(50);
    const kept = s.motionRecords().get(m)!;
    expect(kept.status).toBe('kept-at-close');
    expect(kept.settledAtT).toBe(50);
    expect(kept.settledAtT!).toBeGreaterThanOrEqual(kept.openedAtT);
    // and the log is still monotone across the cut
    const ts = [...s.logEntries()].map((e) => e.event.t);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
    expect(s.verifyChain()).toBe(true);
    expect(ConstitutionSession.replay([...s.logEntries()]).rollingHash()).toBe(s.rollingHash());
  });
});
