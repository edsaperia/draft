import { describe, expect, it } from 'vitest';
import {
  balanceAt,
  credit,
  openLedger,
  performanceRefund,
  spend,
} from '../src/tokens.js';
import { makeConstitution } from '../src/session.js';

// 10-hour window; the drip is real minutes (Q353) — one tick per hour here.
const HOUR = 3600_000;
const constitution = makeConstitution({
  windowStartMs: 0,
  windowEndMs: 10 * HOUR,
  tokenDripMinutes: 60,
  rngSeed: 's',
});

describe('token economy (SPEC §7, §9.3)', () => {
  it('grants 4 at open', () => {
    const l = openLedger(constitution, 0);
    expect(balanceAt(l, constitution, 0)).toBe(4);
  });

  it('drips one token per interval of real minutes, up to the cap', () => {
    const l = openLedger(constitution, 0);
    expect(balanceAt(l, constitution, 1 * HOUR)).toBe(5);
    expect(balanceAt(l, constitution, 4 * HOUR)).toBe(8);
    // Cap: further drip is forfeit.
    expect(balanceAt(l, constitution, 9 * HOUR)).toBe(8);
  });

  it('a mid-session joiner receives grant plus accrued drip, capped', () => {
    const l = openLedger(constitution, 3 * HOUR);
    expect(balanceAt(l, constitution, 3 * HOUR)).toBe(7);
    const late = openLedger(constitution, 9 * HOUR);
    expect(balanceAt(late, constitution, 9 * HOUR)).toBe(8);
  });

  it('spend requires balance and interleaves with drip deterministically', () => {
    const l = openLedger(constitution, 0);
    spend(l, constitution, 0, 4);
    expect(balanceAt(l, constitution, 0)).toBe(0);
    expect(() => spend(l, constitution, 0, 1)).toThrow(/insufficient/);
    expect(balanceAt(l, constitution, 2 * HOUR)).toBe(2);
  });

  it('drip lost at cap is not retroactively recovered after spending', () => {
    const l = openLedger(constitution, 0);
    // At 4h the balance hit cap 8; ticks 5..9 are forfeit.
    balanceAt(l, constitution, 9 * HOUR);
    spend(l, constitution, 9 * HOUR, 8);
    expect(balanceAt(l, constitution, 9 * HOUR)).toBe(0);
    // Only tick 10 remains.
    expect(balanceAt(l, constitution, 10 * HOUR)).toBe(1);
  });

  it('refunds are never forfeited to the cap', () => {
    const l = openLedger(constitution, 0);
    balanceAt(l, constitution, 4 * HOUR); // at cap 8
    credit(l, constitution, 4 * HOUR, 1.5);
    expect(balanceAt(l, constitution, 4 * HOUR)).toBe(9.5);
  });

  it('a perpetual document drips on the same clock (Q353)', () => {
    const perpetual = makeConstitution({
      windowStartMs: 0,
      windowEndMs: 0, // perpetual: zero-span window, drip unaffected
      tokenDripMinutes: 60,
      rngSeed: 's',
    });
    const l = openLedger(perpetual, 0);
    expect(balanceAt(l, perpetual, 3 * HOUR)).toBe(7);
  });

  it('a non-finite interval disables the drip', () => {
    const still = makeConstitution({
      windowStartMs: 0,
      windowEndMs: 10 * HOUR,
      tokenDripMinutes: Infinity,
      rngSeed: 's',
    });
    const l = openLedger(still, 0);
    expect(balanceAt(l, still, 9 * HOUR)).toBe(4);
  });

  it('performance refund follows stake × min(w/0.5, 1.5)', () => {
    expect(performanceRefund(1, 0)).toBe(0);
    expect(performanceRefund(1, 0.25)).toBe(0.5);
    expect(performanceRefund(1, 0.5)).toBe(1);
    expect(performanceRefund(1, 0.75)).toBe(1.5);
    expect(performanceRefund(1, 0.99)).toBe(1.5);
    expect(performanceRefund(2, 0.25)).toBe(1);
  });
});
