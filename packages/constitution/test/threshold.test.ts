import { describe, expect, it } from 'vitest';
import { BAR_CEILING_PCT, barAt, barCeilingPct, reAnchor, seedAnchors, smoothstep, votesNeeded } from '../src/threshold.js';
import { adoptionThreshold } from '../../engine-core/src/adoption-threshold.js';
import { ceilingPct, unanimousCeiling } from '../../engine-core/src/ranking/ceiling.js';
import { fitDavidson } from '../../engine-core/src/ranking/davidson.js';
import type { Comparison } from '../../engine-core/src/ranking/types.js';
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
    expect([...BAR_CEILING_PCT]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((e) => ceilingPct(e)));
    // past the table's end the answer is 99, and it is exact rather than a
    // clamp: E = 10 already floors to 99 and the series is monotone
    expect(barCeilingPct(11)).toBe(99);
    expect(barCeilingPct(1000)).toBe(99);
    // a count that arrives empty reads as the sole member, not as no data
    expect(barCeilingPct(0)).toBe(79);
  });

  /**
   * The votes table (entry 163), pinned the same way and for the same reason:
   * `/pairwise` draws its chart from `votesNeeded` because the bundle carries
   * no engine-core, so this is the case that keeps the copy honest. Every cell
   * is re-derived from `fitDavidson` — `k − 1` votes for must **not** clear the
   * bar and `k` must, strictly, which is `sweepAdoptions`' own `>`.
   *
   * The posteriors are computed once per vote count and shared across the fifty
   * bars: two fits per cell, memoised, not two fits per assertion.
   */
  it('VOTES_NEEDED is the smallest k that clears the bar, cell by cell', () => {
    const posterior = (k: number, n: number) => {
      const comps: Comparison[] = [];
      for (let i = 0; i < n; i++) comps.push({ a: 'c', b: 'inc', outcome: i < k ? 'a' : 'b' });
      return fitDavidson(['c', 'inc'], comps).probBeats('c', 'inc');
    };
    // every vote count to 30, then every tenth: the shape of the curve is
    // settled by 30 and the tail is where a transcription slip would hide
    const counts = [...Array.from({ length: 30 }, (_, i) => i + 1), 40, 50, 60, 70, 80, 90, 100];
    for (const n of counts) {
      const ps = Array.from({ length: n + 1 }, (_, k) => posterior(k, n));
      for (let pct = 50; pct <= 99; pct++) {
        const k = votesNeeded(n, pct);
        const bar = pct / 100;
        if (k === 0) {
          // the unreachable cell: not even every vote makes the room that sure
          expect(ps[n]! > bar, `${n} votes, ${pct}%: unanimity clears it after all`).toBe(false);
        } else {
          expect(ps[k]! > bar, `${n} votes, ${pct}%: ${k} for does not clear it`).toBe(true);
          expect(ps[k - 1]! > bar, `${n} votes, ${pct}%: ${k - 1} for already clears it`).toBe(false);
        }
      }
    }
  });

  /**
   * The two facts the page's chart and its em dash rely on, asserted over the
   * whole table rather than the sample above.
   */
  it('the table is monotone along a row, and 0 is exactly Q840’s ceiling', () => {
    for (let pct = 50; pct <= 99; pct++) {
      let seenReachable = false;
      for (let n = 1; n <= 100; n++) {
        const k = votesNeeded(n, pct);
        // the share needed falls, but the count never does
        if (k !== 0) {
          expect(k, `${n} votes at ${pct}%`).toBeGreaterThanOrEqual(votesNeeded(n - 1, pct));
          seenReachable = true;
        } else {
          // unreachable cells are a prefix: a bar out of reach at n votes is
          // out of reach at every smaller n too
          expect(seenReachable, `${pct}% went unreachable again at ${n} votes`).toBe(false);
        }
        // 0 is the ceiling seen from the other side (Q840)
        expect(k === 0, `${n} votes at ${pct}%`).toBe(unanimousCeiling(n) <= pct / 100);
      }
    }
    // 5,000 cells, each a Bradley–Terry fit: ~2.9 s alone and past vitest's
    // 5 s default once the whole suite's workers are competing for the core.
    // Its own timeout, because the cost is the table's and not the lane's.
  }, 30000);

  it('votesNeeded floors and clamps like barCeilingPct', () => {
    expect(votesNeeded(0, 60)).toBe(votesNeeded(1, 60));   // below one vote reads as one
    expect(votesNeeded(5.9, 60)).toBe(votesNeeded(5, 60)); // floored, never rounded
    expect(votesNeeded(5, 49)).toBe(votesNeeded(5, 50));   // a bar off either edge
    expect(votesNeeded(5, 100)).toBe(votesNeeded(5, 99));  // reads as the nearest one held
    expect(votesNeeded(1000, 60)).toBe(votesNeeded(100, 60));
    expect(votesNeeded(Number.NaN, 60)).toBe(votesNeeded(1, 60));
    // the plan's own worked cells, so the file states them in the open
    expect(votesNeeded(5, 80)).toBe(4);
    expect(votesNeeded(10, 80)).toBe(7);
    expect(votesNeeded(100, 80)).toBe(55);
    expect(votesNeeded(1, 80)).toBe(0);
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
