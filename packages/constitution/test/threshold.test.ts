import { describe, expect, it } from 'vitest';
import { barAt, reAnchor, seedAnchors, smoothstep } from '../src/threshold.js';
import { adoptionThreshold } from '../../engine-core/src/adoption-threshold.js';
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
