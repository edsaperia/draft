import { describe, expect, it } from 'vitest';
import {
  CATALOGUE, CATALOGUE_BY_ID, JUDGE_GATES, entryOf, motionRouteOf, validateFor,
} from '../src/catalogue.js';
import type { SettingId } from '../src/catalogue.js';
import { authorshipBase } from '../src/adapter.js';
import { resolveConsent } from '../src/consent.js';
import type { Price, SettingValue } from '../src/values.js';
import { eqValue, validateValue } from '../src/values.js';

describe('catalogue integrity (SPEC §9.0–§9.7½)', () => {
  // eighteen since Q767: ✍️ signing folded into 👤's own ladder
  it('holds the eighteen settings, ids unique, email deliberately absent', () => {
    expect(CATALOGUE.length).toBe(18);
    expect(new Set(CATALOGUE.map((e) => e.id)).size).toBe(18);
    expect(CATALOGUE_BY_ID.has('email' as SettingId)).toBe(false);
  });

  it('judge gate is exactly the six of §9.0b (machines Q352, signing Q767)', () => {
    expect([...JUDGE_GATES].sort()).toEqual(
      ['authorship', 'bar', 'chamber', 'judgments', 'lapse', 'quorum'].sort(),
    );
  });

  // **Every reader of the rung goes through `authorshipBase`** (Q767). The
  // ladder is five rungs; what a document *does* is still the engine's three,
  // and the two elective rungs ride their base until the per-proposal sign
  // control exists (Q770). A site testing the raw rung reads
  // `anonymousElective` as *not anonymous* and names everybody.
  it('the elective rungs ride their base (Q767)', () => {
    expect(entryOf('authorship').rungs!.map(authorshipBase))
      .toEqual(['anonymous', 'anonymous', 'sealed', 'sealed', 'public']);
  });

  it('machines is ordinary and convenor-held (Q352, Ed 2026-08-18)', () => {
    expect(entryOf('machines').kind).toBe('ordinary');
    expect(entryOf('machines').delegable).toBe(true); // the consent question survives
  });

  it('deps are acyclic and reference real settings', () => {
    const seen = new Set<SettingId>();
    const visiting = new Set<SettingId>();
    const visit = (id: SettingId) => {
      if (seen.has(id)) return;
      expect(visiting.has(id)).toBe(false); // cycle
      visiting.add(id);
      for (const d of entryOf(id).deps) visit(d);
      visiting.delete(id);
      seen.add(id);
    };
    for (const e of CATALOGUE) visit(e.id);
  });

  it('every delegable setting carries a consent order; personal ones carry none', () => {
    for (const e of CATALOGUE) {
      if (e.delegable) expect(e.consent, e.id).toBeDefined();
      if (e.kind === 'personal') {
        expect(e.delegable).toBe(false);
        expect(e.consent).toBeUndefined();
      }
    }
  });

  it('consent orders are antisymmetric on samples', () => {
    const samples: Partial<Record<SettingId, SettingValue[]>> = {
      ending: [{ endsAtMs: null }, { endsAtMs: 100 }, { endsAtMs: 200 }],
      bar: [{ pct: 60 }, { pct: 95 }],
      quorum: [{ form: 'share', n: 50 }, { form: 'share', n: 100 }],
      authorship: [{ rung: 'anonymous' }, { rung: 'public' }],
      rate: [
        { grant: 4, cap: 8, dripMinutes: 240 },
        { grant: 6, cap: 8, dripMinutes: 240 },
        { grant: 4, cap: 8, dripMinutes: 60 },
      ],
      lapse: [{ afterMs: null }, { afterMs: 1000 }],
      machines: [{ enabled: false, budget: 0 }, { enabled: true, budget: 4 }],
      applications: [{ apply: false }, { apply: true }],
      admission: [{ price: 'assembly' }, { price: 'proposal' }, { price: 'pen' }],
      removal: [{ price: 'consent' }, { price: 'assembly' }, { price: 'proposal' }],
    };
    for (const [id, values] of Object.entries(samples)) {
      const order = entryOf(id as SettingId).consent!.order;
      for (const a of values!) for (const b of values!) {
        expect(Math.sign(order(a, b)) + 0, `${id}`).toBe(-Math.sign(order(b, a)) + 0);
      }
    }
  });

  /**
   * **Antisymmetry is not enough, and the failure is silent** (entry 77, the
   * alpha-readiness pass). `resolveConsent` takes the founding maximum with
   * `Array.sort`, and `Array.prototype.sort` is only specified for a
   * comparator that is a *consistent total preorder*: give it a
   * non-transitive one and the result is implementation-defined, so the
   * founding takes a maximum nobody stated and binds the room to a rule
   * nobody consented to — with every existing test still green, because the
   * value it lands on is a real member's answer and the distribution it
   * publishes is a real permutation. The sample-based antisymmetry check
   * above cannot see it: a comparator can be perfectly antisymmetric on
   * every pair and still cycle on a triple.
   *
   * These sets are enumerable, so this is exhaustive rather than sampled —
   * every value of every family in the value's own grid, every ordered
   * triple. A new consent question with no entry here fails the first case,
   * which is the point: the check has to be complete to mean anything.
   */
  describe('consent orders are transitive (exhaustive over each family)', () => {
    const range = (from: number, to: number, step = 1): number[] => {
      const out: number[] = [];
      for (let v = from; v <= to; v += step) out.push(v);
      return out;
    };
    /** Every value the control can express, per family. */
    const FAMILIES: Partial<Record<SettingId, SettingValue[]>> = {
      // the ladders and the prices are their own full sets
      authorship: entryOf('authorship').rungs!.map((rung) => ({ rung })),
      judgments: entryOf('judgments').rungs!.map((rung) => ({ rung })),
      chamber: entryOf('chamber').rungs!.map((rung) => ({ rung })),
      admission: entryOf('admission').rungs!.map((price) => ({ price: price as Price })),
      removal: entryOf('removal').rungs!.map((price) => ({ price: price as Price })),
      // the sliders, at the granularity the surface offers (§9.7.1: the bar
      // is 50–99, and moves in fives on the card — every whole value here,
      // since a motion may state any of them)
      bar: range(50, 99).map((pct) => ({ pct })),
      // both forms and both ends of each, because the order reads `n` alone
      quorum: [
        ...range(0, 10).map((n) => ({ form: 'count' as const, n })),
        ...range(0, 100, 10).map((n) => ({ form: 'share' as const, n })),
      ],
      // null is *never*, which the order puts highest
      ending: [{ endsAtMs: null }, ...range(0, 5).map((k) => ({ endsAtMs: k * 3_600_000 }))],
      lapse: [{ afterMs: null }, ...range(0, 5).map((k) => ({ afterMs: k * 86_400_000 }))],
      // three fields, so the grid rather than one axis at a time: this is
      // the only family whose comparator has more than one tie-break in it
      rate: range(1, 4).flatMap((grant) =>
        range(4, 8, 2).flatMap((cap) =>
          [30, 60, 240].map((dripMinutes) => ({ grant, cap, dripMinutes })))),
      machines: [false, true].flatMap((enabled) =>
        range(0, 4, 2).map((budget) => ({ enabled, budget }))),
      // the legacy `holder` field rides along deliberately: an old log
      // carries it, the fold strips it, and the order must not read it
      applications: [
        { apply: false }, { apply: true },
        { apply: false, holder: 'members' as const }, { apply: true, holder: 'members' as const },
      ],
    };

    it('every consent question in the catalogue has a value set here', () => {
      const asked = CATALOGUE.filter((e) => e.consent).map((e) => e.id).sort();
      expect(Object.keys(FAMILIES).sort()).toEqual(asked);
    });

    for (const [id, values] of Object.entries(FAMILIES)) {
      it(`${id}: every ordered triple`, () => {
        const order = entryOf(id as SettingId).consent!.order;
        const vs = values!;
        // `+ 0` for the same reason as the sample check above: Math.sign
        // keeps the sign of zero, and -0 is not 0 under Object.is
        const sgn = (a: SettingValue, b: SettingValue) => Math.sign(order(a, b)) + 0;
        for (const a of vs) for (const b of vs) {
          // antisymmetry again, but over the whole set rather than a sample
          expect(sgn(a, b), `${id}: antisymmetry ${JSON.stringify([a, b])}`)
            .toBe(-sgn(b, a) + 0);
          for (const c of vs) {
            // a ≼ b and b ≼ c must give a ≼ c, or `sort` is undefined
            if (sgn(a, b) <= 0 && sgn(b, c) <= 0) {
              expect(sgn(a, c), `${id}: ${JSON.stringify([a, b, c])}`)
                .toBeLessThanOrEqual(0);
            }
            // and equivalence must be an equivalence relation, or two
            // members who stated the same thing sort against each other
            if (sgn(a, b) === 0 && sgn(b, c) === 0) {
              expect(sgn(a, c), `${id}: equivalence ${JSON.stringify([a, b, c])}`).toBe(0);
            }
          }
        }
      });
    }

    it('and the maximum resolveConsent takes is the set maximum, whatever the input order', () => {
      // the property the transitivity is *for*: the value taken must be the
      // one no answer is ordered above, found the slow honest way and
      // compared against what `sort` produced from three different shufflings
      for (const [id, values] of Object.entries(FAMILIES)) {
        const entry = entryOf(id as SettingId);
        const order = entry.consent!.order;
        const vs = values!;
        const top = vs.reduce((best, v) => (order(v, best) > 0 ? v : best), vs[0]!);
        for (const rotate of [0, 1, Math.floor(vs.length / 2)]) {
          const shuffled = [...vs.slice(rotate), ...vs.slice(0, rotate)];
          expect(order(resolveConsent(entry, shuffled).value, top), id).toBe(0);
        }
      }
    });
  });

  it('routeOf: moving the close is ordinary, touching whether it ends is constitutional', () => {
    const ending = entryOf('ending');
    expect(motionRouteOf(ending, { endsAtMs: 500 }, { endsAtMs: 100 })).toBe('ordinary');
    expect(motionRouteOf(ending, { endsAtMs: null }, { endsAtMs: 100 })).toBe('constitutional');
    expect(motionRouteOf(ending, { endsAtMs: 100 }, { endsAtMs: null })).toBe('constitutional');
    expect(motionRouteOf(entryOf('title'), { text: 'x' }, { text: 'y' })).toBe('ordinary');
    expect(motionRouteOf(entryOf('bar'), { pct: 80 }, { pct: 66 })).toBe('constitutional');
    // pace is ordinary by the test, and the founder's — not delegable (Q415)
    expect(entryOf('pace').delegable).toBe(false);
    expect(motionRouteOf(entryOf('pace'), { shape: 'fixed' }, { shape: 'ramp', startPct: 55 }))
      .toBe('ordinary');
    expect(() => motionRouteOf(entryOf('displayName'), { text: 'a' }, { text: 'b' })).toThrow();
  });

  it('validates values structurally, rungs included', () => {
    expect(validateFor(entryOf('bar'), { pct: 66 })).toBeNull();
    expect(validateFor(entryOf('bar'), { pct: 40 })).toMatch(/50/);
    expect(validateFor(entryOf('chamber'), { rung: 'link' })).toBeNull();
    expect(validateFor(entryOf('chamber'), { rung: 'sealed' })).toMatch(/not one of/);
    expect(validateFor(entryOf('link'), { slug: 'hollow-oak' })).toBeNull();
    expect(validateFor(entryOf('link'), { slug: 'Hollow Oak' })).toMatch(/slug/);
    expect(validateFor(entryOf('pace'), { shape: 'fixed', startPct: 60 })).toMatch(/no startPct/);
    expect(validateFor(entryOf('rate'), { grant: 9, cap: 8, dripMinutes: 240 })).toMatch(/cap/);
    expect(validateFor(entryOf('admission'), { price: 'consent' })).toMatch(/not one of/);
    expect(validateFor(entryOf('removal'), { price: 'pen' })).toMatch(/not one of/);
    expect(validateFor(entryOf('applications'), { anything: 1 })).toMatch(/apply/);
    expect(validateValue('ending', { endsAtMs: null })).toBeNull();
  });

  it('eqValue is key-order independent', () => {
    expect(eqValue({ form: 'share', n: 60 }, { n: 60, form: 'share' } as SettingValue)).toBe(true);
    expect(eqValue({ pct: 66 }, { pct: 67 })).toBe(false);
  });
});

describe('the consent rule (SPEC §9.0a): maxima along the protective direction', () => {
  it('bar: the highest stated minimum binds', () => {
    const { value, distribution } = resolveConsent(entryOf('bar'),
      [{ pct: 60 }, { pct: 78 }, { pct: 66 }]);
    expect(value).toEqual({ pct: 78 });
    expect(distribution).toEqual([{ pct: 78 }, { pct: 66 }, { pct: 60 }]);
  });

  it('ending: never wins over any date; otherwise the latest', () => {
    expect(resolveConsent(entryOf('ending'),
      [{ endsAtMs: 100 }, { endsAtMs: null }, { endsAtMs: 900 }]).value)
      .toEqual({ endsAtMs: null });
    expect(resolveConsent(entryOf('ending'),
      [{ endsAtMs: 100 }, { endsAtMs: 900 }]).value).toEqual({ endsAtMs: 900 });
  });

  it('lapse: the longest spell wins, never the longest of all (§9.5a)', () => {
    expect(resolveConsent(entryOf('lapse'),
      [{ afterMs: 5 }, { afterMs: 50 }]).value).toEqual({ afterMs: 50 });
    expect(resolveConsent(entryOf('lapse'),
      [{ afterMs: 5 }, { afterMs: null }]).value).toEqual({ afterMs: null });
  });

  it('disclosure ladders: one private answer keeps the whole document private', () => {
    expect(resolveConsent(entryOf('authorship'),
      [{ rung: 'public' }, { rung: 'sealed' }, { rung: 'public' }]).value)
      .toEqual({ rung: 'sealed' });
    expect(resolveConsent(entryOf('authorship'),
      [{ rung: 'public' }, { rung: 'anonymous' }]).value).toEqual({ rung: 'anonymous' });
    expect(resolveConsent(entryOf('chamber'),
      [{ rung: 'public' }, { rung: 'closed' }]).value).toEqual({ rung: 'closed' });
    expect(resolveConsent(entryOf('judgments'),
      [{ rung: 'after' }, { rung: 'never' }]).value).toEqual({ rung: 'never' });
    // Q767: one ladder of five, ✍️ folded into it — the elective rungs sit
    // between never-named and named-at-the-close, and the order is total
    expect(entryOf('authorship').rungs).toEqual(
      ['anonymous', 'anonymousElective', 'sealed', 'sealedElective', 'public']);
    expect(resolveConsent(entryOf('authorship'),
      [{ rung: 'sealedElective' }, { rung: 'sealed' }]).value).toEqual({ rung: 'sealed' });
    expect(resolveConsent(entryOf('authorship'),
      [{ rung: 'sealed' }, { rung: 'anonymousElective' }]).value)
      .toEqual({ rung: 'anonymousElective' });
  });

  it('rate: the most generous wins (§9.0)', () => {
    expect(resolveConsent(entryOf('rate'), [
      { grant: 4, cap: 8, dripMinutes: 240 },
      { grant: 6, cap: 8, dripMinutes: 480 },
    ]).value).toEqual({ grant: 6, cap: 8, dripMinutes: 480 });
    expect(resolveConsent(entryOf('rate'), [
      { grant: 4, cap: 8, dripMinutes: 240 },
      { grant: 4, cap: 8, dripMinutes: 60 },
    ]).value).toEqual({ grant: 4, cap: 8, dripMinutes: 60 });
  });

  it('machines: the most restrictive wins — one refusal keeps them out', () => {
    expect(resolveConsent(entryOf('machines'), [
      { enabled: true, budget: 4 },
      { enabled: false, budget: 0 },
    ]).value).toEqual({ enabled: false, budget: 0 });
  });

  it('applications: one refusal keeps the door shut (entry 94: no beats yes)', () => {
    expect(resolveConsent(entryOf('applications'), [
      { apply: true }, { apply: false }, { apply: true },
    ]).value).toEqual({ apply: false });
  });

  it('the prices (entry 94): the dearest admission and the hardest removal win', () => {
    expect(resolveConsent(entryOf('admission'), [
      { price: 'pen' }, { price: 'proposal' }, { price: 'assembly' },
    ]).value).toEqual({ price: 'assembly' });
    expect(resolveConsent(entryOf('removal'), [
      { price: 'proposal' }, { price: 'consent' }, { price: 'assembly' },
    ]).value).toEqual({ price: 'consent' });
  });

  it('is deterministic under ties (canonical tiebreak)', () => {
    const a = resolveConsent(entryOf('bar'), [{ pct: 66 }, { pct: 66 }, { pct: 60 }]);
    const b = resolveConsent(entryOf('bar'), [{ pct: 60 }, { pct: 66 }, { pct: 66 }]);
    expect(a.distribution).toEqual(b.distribution);
  });

  it('refuses non-consent settings and empty answer sets', () => {
    expect(() => resolveConsent(entryOf('title'), [{ text: 'x' }])).toThrow();
    expect(() => resolveConsent(entryOf('bar'), [])).toThrow();
  });
});
