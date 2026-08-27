import { describe, expect, it } from 'vitest';
import { BAR_CEILING_PCT, barAt, barCeilingPct, reAnchor, seedAnchors, smoothstep } from '../src/threshold.js';
import { adoptionThreshold } from '../../engine-core/src/adoption-threshold.js';
import { ceilingPct } from '../../engine-core/src/ranking/ceiling.js';
import type { Constitution } from '../../engine-core/src/types.js';
import { adoptionFloor, adoptionFloorTerm, quorumCount } from '../src/populations.js';

describe('threshold anchors (§4.3, v0.48)', () => {
  it('matches engine-core’s adoptionThreshold in the plain single-anchor case', () => {
    const anchors = seedAnchors('ramp', 60, 95, 1000, 11_000);
    const constitution = {
      adoptionThresholdStart: 0.60,
      adoptionThresholdEnd: 0.95,
      windowStartMs: 1000,
      windowEndMs: 11_000,
    } as Constitution;
    for (const t of [0, 1000, 2500, 6000, 9999, 11_000, 20_000]) {
      expect(barAt(anchors, t)).toBeCloseTo(adoptionThreshold(constitution, t) * 100, 10);
    }
  });

  it('fixed holds the close bar for the whole life; perpetual forces fixed', () => {
    const fixed = seedAnchors('fixed', null, 78, 0, 10_000);
    expect(barAt(fixed, 0)).toBe(78);
    expect(barAt(fixed, 9_999)).toBe(78);
    expect(() => seedAnchors('ramp', 55, 78, 0, null)).toThrow(/perpetual/);
    const perpetual = seedAnchors('fixed', null, 78, 0, null);
    expect(barAt(perpetual, 1e12)).toBe(78);
  });

  it('postponing the close never lowers the bar (§4.3)', () => {
    const a = seedAnchors('ramp', 60, 95, 0, 10_000);
    const atMove = barAt(a, 5_000);
    const b = reAnchor(a, 5_000, 20_000);
    expect(barAt(b, 5_000)).toBeCloseTo(atMove, 10);   // keeps its value
    expect(barAt(b, 5_001)).toBeGreaterThanOrEqual(atMove); // and only rises
    expect(barAt(b, 20_000)).toBeCloseTo(95, 10);      // same ceiling, more slowly
    expect(barAt(b, 10_000)).toBeLessThan(barAt(a, 10_000));
  });

  it('a close moved earlier keeps the value and rises over the shorter remainder', () => {
    const a = seedAnchors('ramp', 60, 95, 0, 10_000);
    const atMove = barAt(a, 2_000);
    const b = reAnchor(a, 2_000, 5_000);
    expect(barAt(b, 2_000)).toBeCloseTo(atMove, 10);
    expect(barAt(b, 5_000)).toBeCloseTo(95, 10);
  });

  it('removing the ending pins the bar at the ceiling (fixed, perpetual)', () => {
    const a = seedAnchors('ramp', 60, 95, 0, 10_000);
    const b = reAnchor(a, 4_000, null);
    expect(b.shape).toBe('fixed');
    expect(barAt(b, 4_000)).toBe(95);
  });

  it('smoothstep clamps', () => {
    expect(smoothstep(-1)).toBe(0);
    expect(smoothstep(2)).toBe(1);
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 10);
  });

  /**
   * The bar ceiling table (Q840). `BAR_CEILING_PCT` is engine-core's
   * `ceilingPct` copied out for the browser bundle, which carries no
   * engine-core; this is the case that keeps the copy honest. If it goes red,
   * the fit moved and the table has to move with it — never the other way.
   */
  it('BAR_CEILING_PCT is engine-core’s ceilingPct, entry for entry', () => {
    for (let e = 1; e <= 40; e++) expect(barCeilingPct(e)).toBe(ceilingPct(e));
    expect([...BAR_CEILING_PCT]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(ceilingPct));
    // past the table's end the answer is 99, and it is exact rather than a
    // clamp: E = 10 already floors to 99 and the series is monotone
    expect(barCeilingPct(11)).toBe(99);
    expect(barCeilingPct(1000)).toBe(99);
    // a count that arrives empty reads as the sole member, not as no data
    expect(barCeilingPct(0)).toBe(79);
  });
});

describe('populations (§4.2, §8.2, v0.48: one E, three uses)', () => {
  it('quorum: a fixed count, or ⌈share × E⌉', () => {
    expect(quorumCount({ form: 'count', n: 5 }, 14)).toBe(5);
    expect(quorumCount({ form: 'share', n: 60 }, 14)).toBe(9); // ⌈8.4⌉
    expect(quorumCount({ form: 'share', n: 100 }, 7)).toBe(7);
  });

  it('F = max(Q, min(⌈E/3⌉, F_max)) — the room’s number rides the minimum', () => {
    expect(adoptionFloorTerm(14)).toBe(5);
    expect(adoptionFloor(3, 14, 12)).toBe(5);  // formula floor wins
    expect(adoptionFloor(9, 14, 12)).toBe(9);  // the room raises it
    expect(adoptionFloor(2, 100, 12)).toBe(12); // F_max caps the formula, not Q
    expect(adoptionFloor(20, 100, 12)).toBe(20);
  });
});
