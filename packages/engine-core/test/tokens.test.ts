import { describe, expect, it } from 'vitest';
import {
  balanceAt,
  credit,
  dripIntervalMs,
  materialize,
  openLedger,
  performanceRefund,
  spend,
  type Ledger,
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

/**
 * Issue #4: the drip was a `while (nextDripT <= t) nextDripT += interval`
 * loop, and at an interval below float precision at epoch milliseconds the
 * increment is a no-op, so the loop never ends and the single Node thread
 * stops serving every document, at boot as well. The constitution layer now
 * floors the interval at a whole minute; the library counts instead of
 * looping, so it cannot spin whatever it is handed.
 */
describe('the drip is counted, never looped (issue #4)', () => {
  /** `materialize` exactly as it stood before issue #4: the reference. */
  const looped = (ledger: Ledger, cap: number, interval: number, t: number): void => {
    if (!Number.isFinite(interval) || interval <= 0) return;
    while (ledger.nextDripT <= t) {
      ledger.balance = Math.min(ledger.balance + 1, Math.max(ledger.balance, cap));
      ledger.nextDripT += interval;
    }
  };

  const at = (dripMinutes: number, cap: number) =>
    makeConstitution({ windowStartMs: 0, windowEndMs: 10 * HOUR, rngSeed: 's',
      tokenDripMinutes: dripMinutes, tokenCap: cap });

  it('credits exactly what the loop credited, over a sweep', () => {
    // Every interval a founder can now reach (whole minutes), the two the
    // engine's own tests use at either end, and balances a refund can leave
    // fractional or over the cap.
    const minutes = [1, 2, 3, 5, 7, 13, 60, 90, 240, 1440, 10080, 1e9];
    const starts = [0, 1, 59_999, 60_000, 1_726_000_000_000];
    const balances = [0, 1, 4, 7.5, 9];
    const caps = [1, 3, 8];
    let rng = 1;
    const next = () => (rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648;
    let cases = 0;
    for (const m of minutes)
      for (const start of starts)
        for (const balance of balances)
          for (const cap of caps)
            for (const span of [0, 1, m * 60_000 - 1, m * 60_000, m * 30_000,
              Math.floor(next() * 40) * m * 60_000, 37 * m * 60_000]) {
              const interval = m * 60_000;
              const t = start + span;
              const mine = { balance, nextDripT: start + interval };
              const theirs = { balance, nextDripT: start + interval };
              materialize(mine, at(m, cap), t);
              looped(theirs, cap, interval, t);
              expect(mine).toEqual(theirs);
              cases += 1;
            }
    expect(cases).toBeGreaterThan(2000);
  });

  it('terminates on an interval below the clock\'s precision', () => {
    // The attack of issue #4: 1e-9 minutes at a real epoch time, where
    // `next + interval === next`. The loop hung here; the count returns.
    const start = 1_726_000_000_000;
    const c = at(1e-9, 3);
    const l = { balance: 0, nextDripT: start + dripIntervalMs(c) };
    const began = Date.now();
    materialize(l, c, start + 24 * HOUR);
    expect(Date.now() - began).toBeLessThan(1000);
    expect(l.balance).toBe(3); // the cap, and never more
    expect(Number.isNaN(l.nextDripT)).toBe(false);
  });

  it('a denormal interval cannot spin either', () => {
    const c = at(Number.MIN_VALUE, 8);
    const l = { balance: 0, nextDripT: 1 };
    materialize(l, c, 2_000_000_000_000);
    expect(l.balance).toBe(8);
  });
});
