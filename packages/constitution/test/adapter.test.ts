/**
 * **The engine seam, field by field** (entry 77, the alpha-readiness pass).
 *
 * `toEngineConstitution`, `engineFieldsFor` and `DEFAULT_TUNING` had **zero
 * test references in any package** before this file. That is the one seam
 * where the room's agreed constitution becomes the engine's: a
 * mistranslation here means the room consents to one bar and the engine runs
 * another — the founding is honest, the record is honest, the arithmetic is
 * honest, and the number they are all honest about is the wrong one. Both
 * packages' suites stay green throughout, because neither of them is looking
 * at the join.
 *
 * So the shape of this file is: settle a document, then assert **every field
 * of the engine constitution** against the settled value or the tuning
 * constant it came from, with nothing left unaccounted for. The
 * "unaccounted" half is the load-bearing one — `KNOWN` below is checked
 * against the object's own keys, so a field added to `Constitution` without a
 * decision about where it comes from fails here rather than silently taking
 * whatever the spread left behind.
 *
 * The three conventions worth naming, because each is a place a reader would
 * expect something else:
 *
 * - **A perpetual ending pins the ramp** rather than removing it: no close
 *   means `windowEndMs` is the window *start*, a zero-span window, which is
 *   how §9.0's fixed bar is expressed to an engine that only knows ramps.
 * - **`salienceEvery` is `Number.MAX_SAFE_INTEGER`** — §8.3a's gate replaced
 *   the rate, and the field survives only because `Constitution` still has
 *   it.
 * - **The floor closure re-derives the quorum from the E it is handed**, so
 *   a share quorum tracks the roster instead of freezing the number the
 *   founding happened to settle at.
 */
import { describe, expect, it } from 'vitest';
import type { Constitution } from '../../engine-core/src/types.js';
import { DEFAULT_TUNING, authorshipBase, engineFieldsFor, toEngineConstitution } from '../src/adapter.js';
import { ConstitutionSession } from '../src/session.js';
import { adoptionFloor, quorumCount } from '../src/populations.js';
import type { EndingValue, LadderValue, PercentValue, QuorumValue, RateValue } from '../src/values.js';
import { buildConstituted } from './helpers.js';

/**
 * A document settled by the founder's own hand at every setting, so each
 * engine field has exactly one settled value behind it and the assertion
 * below can name it. `buildConstituted` resolves ending/bar/chamber by the
 * consent rule instead, which is the *other* road in and is walked at the
 * end of the file.
 */
function founderSet(over: {
  bar?: number; endsAtMs?: number | null; pace?: { shape: 'fixed' } | { shape: 'ramp'; startPct: number };
  quorum?: QuorumValue; rate?: RateValue; authorship?: string;
} = {}): ConstitutionSession {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  s.arrive(1, bo);
  s.confirmStartingText(2, 'The clubhouse shall be kept open.');
  const values: Array<[string, unknown]> = [
    ['ending', { endsAtMs: over.endsAtMs === undefined ? 1_000_000 : over.endsAtMs }],
    ['bar', { pct: over.bar ?? 66 }],
    ['pace', over.pace ?? { shape: 'fixed' }],
    ['quorum', over.quorum ?? { form: 'share', n: 60 }],
    ['rate', over.rate ?? { grant: 3, cap: 7, dripMinutes: 90 }],
    ['authorship', { rung: over.authorship ?? 'sealed' }],
    ['judgments', { rung: 'after' }],
    ['chamber', { rung: 'link' }],
    ['applications', { apply: false }],
    ['admission', { price: 'assembly' }],
    ['removal', { price: 'consent' }],
    ['machines', { enabled: false, budget: 0 }],
    ['lapse', { afterMs: null }],
  ];
  for (const [id, v] of values) s.setSetting(2, id as never, v as never);
  for (const door of ['door:invite', 'door:remove'] as const) {
    s.relinquish(2, door, 'unilateral');
    s.relinquish(2, door, 'assent');
  }
  s.begin(2);
  return s;
}

describe('toEngineConstitution: every engine field against the value it came from', () => {
  it('the whole object, field by field, with nothing unaccounted for', () => {
    const s = founderSet();
    const { constitution: c, quorumN, floor } = toEngineConstitution(s, DEFAULT_TUNING, 'seed-1');

    // -- from the room's settled values ----------------------------------
    const bar = s.settingState('bar').value as PercentValue;
    const ending = s.settingState('ending').value as EndingValue;
    const rate = s.settingState('rate').value as RateValue;
    const quorum = s.settingState('quorum').value as QuorumValue;
    const authorship = s.settingState('authorship').value as LadderValue;
    expect(c.adoptionThresholdEnd).toBe(bar.pct / 100);
    // pace is fixed here, so the ramp starts where it ends: one number, and
    // the engine is never told about a ramp the room did not ask for
    expect(c.adoptionThresholdStart).toBe(bar.pct / 100);
    expect(c.windowStartMs).toBe(s.constitutedAtT);
    expect(c.windowEndMs).toBe(ending.endsAtMs);
    expect(c.tokenGrant).toBe(rate.grant);
    expect(c.tokenCap).toBe(rate.cap);
    expect(c.tokenDripMinutes).toBe(rate.dripMinutes);
    expect(c.quorum).toEqual({ form: quorum.form, n: quorum.n });
    expect(c.authorshipVisibility).toBe(authorshipBase(authorship.rung));

    // -- from the tuning, which is the engine's and un-motionable (Q335) --
    expect(c.adoptionFloorMax).toBe(DEFAULT_TUNING.adoptionFloorMax);
    expect(c.deadlockMinComparisons).toBe(DEFAULT_TUNING.deadlockMinComparisons);
    expect(c.deadlockEpsilon).toBe(DEFAULT_TUNING.deadlockEpsilon);
    expect(c.cooldownMs).toBe(DEFAULT_TUNING.cooldownMs);
    expect(c.redraftLimit).toBe(DEFAULT_TUNING.redraftLimit);
    expect(c.rationaleMaxChars).toBe(DEFAULT_TUNING.rationaleMaxChars);
    expect(c.boutGapMs).toBe(DEFAULT_TUNING.boutGapMs);
    expect(c.hotSetSize).toBe(DEFAULT_TUNING.hotSetSize);
    expect(c.explorationEvery).toBe(DEFAULT_TUNING.explorationEvery);
    expect(c.rivalGateProb).toBe(DEFAULT_TUNING.rivalGateProb);
    expect(c.rivalGateMinComparisons).toBe(DEFAULT_TUNING.rivalGateMinComparisons);

    // -- from neither: constants the seam itself decides ------------------
    expect(c.stake).toBe(1); // flat and non-configurable (§13/Q335)
    expect(c.salienceEvery).toBe(Number.MAX_SAFE_INTEGER); // §8.3a's gate replaced the rate
    expect(c.rngSeed).toBe('seed-1');

    // -- and nothing else ------------------------------------------------
    // Every key above, once. A field added to `Constitution` and left out of
    // the mapper fails here rather than arriving as `undefined` in an engine
    // that never asked where it came from.
    const KNOWN: Array<keyof Constitution> = [
      'adoptionThresholdStart', 'adoptionThresholdEnd', 'adoptionFloorMax',
      'deadlockMinComparisons', 'deadlockEpsilon', 'cooldownMs', 'redraftLimit',
      'tokenGrant', 'tokenDripMinutes', 'tokenCap', 'stake', 'rationaleMaxChars',
      'boutGapMs', 'hotSetSize', 'explorationEvery', 'salienceEvery',
      'windowStartMs', 'windowEndMs', 'authorshipVisibility', 'quorum', 'rngSeed',
      'rivalGateProb', 'rivalGateMinComparisons',
    ];
    expect(Object.keys(c).sort()).toEqual([...KNOWN].sort());
    for (const k of KNOWN) expect(c[k], k).toBeDefined();

    // -- the two numbers beside it ---------------------------------------
    expect(quorumN).toBe(quorumCount(quorum, s.E()));
    // the closure re-derives the quorum per E, so a share tracks the roster
    for (const E of [1, 2, 5, 9, 20]) {
      expect(floor(E), `floor(${E})`)
        .toBe(adoptionFloor(quorumCount(quorum, E), E, DEFAULT_TUNING.adoptionFloorMax));
    }
  });

  it('a ramping pace puts the start where the room said and the end at the bar', () => {
    const s = founderSet({ bar: 78, pace: { shape: 'ramp', startPct: 55 } });
    const { constitution: c } = toEngineConstitution(s, DEFAULT_TUNING, 's');
    expect(c.adoptionThresholdStart).toBe(0.55);
    expect(c.adoptionThresholdEnd).toBe(0.78);
  });

  it('a perpetual document pins the window shut rather than losing its ramp', () => {
    // §9.0: perpetual forces a fixed bar, and the engine only knows ramps —
    // so the window is zero-span at the start and the ramp has nowhere to go
    const s = founderSet({ endsAtMs: null, bar: 70 });
    const { constitution: c } = toEngineConstitution(s, DEFAULT_TUNING, 's');
    expect(c.windowEndMs).toBe(c.windowStartMs);
    expect(c.adoptionThresholdStart).toBe(0.7);
    expect(c.adoptionThresholdEnd).toBe(0.7);
  });

  it('a ramp on a perpetual document never reaches the seam: the module refuses it', () => {
    // `ramping` in the adapter reads the *ending* as well as the pace, and
    // it is a belt to a brace: `setSetting` will not let the pair exist in
    // the first place (§9.0). Worth an assertion because the adapter's guard
    // is only reachable through a log that predates the module's, and a
    // later reader who "simplifies" the adapter to trust the pace alone
    // should have to delete a test that says why it is there.
    expect(() => founderSet({ endsAtMs: null, bar: 70, pace: { shape: 'ramp', startPct: 55 } }))
      .toThrow(/perpetual forces a fixed bar/);
  });

  it('a count quorum passes through, and the floor stops tracking E', () => {
    const s = founderSet({ quorum: { form: 'count', n: 4 } });
    const { constitution: c, quorumN, floor } = toEngineConstitution(s, DEFAULT_TUNING, 's');
    expect(c.quorum).toEqual({ form: 'count', n: 4 });
    expect(quorumN).toBe(4);
    for (const E of [1, 5, 20]) expect(floor(E)).toBe(Math.max(4, Math.min(Math.ceil(E / 3), 12)));
  });

  it('the five elective and plain authorship rungs all reach an engine value', () => {
    for (const rung of ['anonymous', 'anonymousElective', 'sealed', 'sealedElective', 'public']) {
      const s = founderSet({ authorship: rung });
      const { constitution: c } = toEngineConstitution(s, DEFAULT_TUNING, 's');
      expect(c.authorshipVisibility, rung).toBe(authorshipBase(rung));
      expect(['anonymous', 'sealed', 'public']).toContain(c.authorshipVisibility);
    }
  });

  it('tuning is the caller\'s: a non-default cooldown reaches the engine intact', () => {
    // what 1.3's server knob rides on — nothing in the room's own values can
    // move any of these, and nothing in the mapper overrides the caller
    const s = founderSet();
    const tuned = { ...DEFAULT_TUNING, cooldownMs: 60_000, hotSetSize: 5 };
    const { constitution: c } = toEngineConstitution(s, tuned, 's');
    expect(c.cooldownMs).toBe(60_000);
    expect(c.hotSetSize).toBe(5);
    // and DEFAULT_TUNING is not mutated by having been spread
    expect(DEFAULT_TUNING.cooldownMs).toBe(5 * 60_000);
    expect(DEFAULT_TUNING.hotSetSize).toBe(3);
  });

  it('refuses a document that has not begun (§9.0b)', () => {
    const s = ConstitutionSession.open({
      title: 'x', slug: 'x', convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    expect(() => toEngineConstitution(s, DEFAULT_TUNING, 's')).toThrow(/settled/);
  });

  it('the consent road in: a resolved bar is the maximum the room stated', () => {
    // the other way a value reaches the engine — three members answer, the
    // consent rule takes the maximum, and *that* is what the engine runs.
    // The seam must not read the founder's own answer, or a delegated
    // question would bind the room to one member's number.
    const { s } = buildConstituted({ bar: 66 });
    const { constitution: c } = toEngineConstitution(s, DEFAULT_TUNING, 's');
    const resolved = s.settingState('bar').value as PercentValue;
    expect(c.adoptionThresholdEnd).toBe(resolved.pct / 100);
    const ending = s.settingState('ending').value as EndingValue;
    expect(c.windowEndMs).toBe(ending.endsAtMs);
  });
});

describe('engineFieldsFor: the per-setting mapper the bridge amends through', () => {
  const PIN = 12_345;

  it('maps exactly the five settings the engine knows, and nothing else', () => {
    expect(engineFieldsFor('bar', { pct: 66 }, PIN)).toEqual({ adoptionThresholdEnd: 0.66 });
    expect(engineFieldsFor('ending', { endsAtMs: 900 }, PIN)).toEqual({ windowEndMs: 900 });
    expect(engineFieldsFor('quorum', { form: 'count', n: 3 }, PIN))
      .toEqual({ quorum: { form: 'count', n: 3 } });
    expect(engineFieldsFor('rate', { grant: 2, cap: 5, dripMinutes: 30 }, PIN))
      .toEqual({ tokenGrant: 2, tokenCap: 5, tokenDripMinutes: 30 });
    expect(engineFieldsFor('authorship', { rung: 'public' }, PIN))
      .toEqual({ authorshipVisibility: 'public' });
  });

  it('every other setting maps to nothing at all', () => {
    // the empty ones are the claim that changing them changes no engine
    // arithmetic — 🪜 pace, 🤖 machines, 💤 lapse, the doors, the identity
    for (const id of ['pace', 'machines', 'lapse', 'chamber', 'judgments', 'applications',
      'admission', 'removal', 'title', 'link', 'startingText', 'displayName', 'picture'] as const) {
      expect(engineFieldsFor(id, { rung: 'x' } as never, PIN), id).toEqual({});
    }
  });

  it('the perpetual pin is the mapper\'s, shared with the bridge', () => {
    // one convention in one place: an ending of *never* becomes the pin the
    // caller passes, whether that is the window start (at open) or the
    // moment of the change (on an amendment)
    expect(engineFieldsFor('ending', { endsAtMs: null }, PIN)).toEqual({ windowEndMs: PIN });
  });

  it('the same mapper produced the settled fields, so the two cannot drift', () => {
    // the property that makes one mapper worth having: fold the mapper over
    // a settled document by hand and get the object `toEngineConstitution`
    // built for the same values
    const s = founderSet({ bar: 80, quorum: { form: 'count', n: 2 },
      rate: { grant: 1, cap: 4, dripMinutes: 15 }, authorship: 'public' });
    const { constitution: c } = toEngineConstitution(s, DEFAULT_TUNING, 's');
    const byHand = {
      ...engineFieldsFor('bar', s.settingState('bar').value!, c.windowStartMs),
      ...engineFieldsFor('ending', s.settingState('ending').value!, c.windowStartMs),
      ...engineFieldsFor('quorum', s.settingState('quorum').value!, c.windowStartMs),
      ...engineFieldsFor('rate', s.settingState('rate').value!, c.windowStartMs),
      ...engineFieldsFor('authorship', s.settingState('authorship').value!, c.windowStartMs),
    };
    for (const [k, v] of Object.entries(byHand)) {
      expect(c[k as keyof Constitution], k).toEqual(v);
    }
  });
});

describe('DEFAULT_TUNING: the engine\'s own numbers (Appendix A, Q335)', () => {
  it('is the shipped set, and none of it is a room decision', () => {
    expect(DEFAULT_TUNING).toEqual({
      adoptionFloorMax: 12,
      deadlockMinComparisons: 20,
      deadlockEpsilon: 0.005,
      cooldownMs: 5 * 60_000,
      redraftLimit: 2,
      rationaleMaxChars: 300,
      boutGapMs: 90_000,
      hotSetSize: 3,
      explorationEvery: 7,
      rivalGateProb: 0.35,
      rivalGateMinComparisons: 6,
    });
  });

  it('the cooldown is inside §4.2\'s ceiling', () => {
    expect(DEFAULT_TUNING.cooldownMs).toBeGreaterThan(0);
    expect(DEFAULT_TUNING.cooldownMs).toBeLessThanOrEqual(5 * 60_000);
  });
});
