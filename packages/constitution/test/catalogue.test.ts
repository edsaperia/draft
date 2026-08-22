import { describe, expect, it } from 'vitest';
import {
  CATALOGUE, CATALOGUE_BY_ID, JUDGE_GATES, entryOf, motionRouteOf, validateFor,
} from '../src/catalogue.js';
import type { SettingId } from '../src/catalogue.js';
import { resolveConsent } from '../src/consent.js';
import type { SettingValue } from '../src/values.js';
import { eqValue, validateValue } from '../src/values.js';

describe('catalogue integrity (SPEC §9.0–§9.7½)', () => {
  it('holds the nineteen settings, ids unique, email deliberately absent', () => {
    expect(CATALOGUE.length).toBe(19);
    expect(new Set(CATALOGUE.map((e) => e.id)).size).toBe(19);
    expect(CATALOGUE_BY_ID.has('email' as SettingId)).toBe(false);
  });

  it('judge gate is exactly the seven of §9.0b (machines left with Q352)', () => {
    expect([...JUDGE_GATES].sort()).toEqual(
      ['authorship', 'bar', 'chamber', 'judgments', 'lapse', 'quorum', 'signing'].sort(),
    );
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
      applications: [
        { holder: 'members', joinPolicy: 'invite' },
        { holder: 'members', joinPolicy: 'open' },
      ],
    };
    for (const [id, values] of Object.entries(samples)) {
      const order = entryOf(id as SettingId).consent!.order;
      for (const a of values!) for (const b of values!) {
        expect(Math.sign(order(a, b)) + 0, `${id}`).toBe(-Math.sign(order(b, a)) + 0);
      }
    }
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
    expect(validateFor(entryOf('membership'), { anything: 1 })).toMatch(/command/);
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
    expect(resolveConsent(entryOf('signing'),
      [{ rung: 'everybody' }, { rung: 'nobody' }]).value).toEqual({ rung: 'nobody' });
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

  it('applications: the most restrictive rung wins', () => {
    expect(resolveConsent(entryOf('applications'), [
      { holder: 'members', joinPolicy: 'open' },
      { holder: 'members', joinPolicy: 'proposed' },
    ]).value).toEqual({ holder: 'members', joinPolicy: 'proposed' });
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
