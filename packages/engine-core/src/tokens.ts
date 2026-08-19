/**
 * The token economy (SPEC §7): anti-flooding, nothing more.
 * Equal grants are a hard invariant; the drip runs on **real minutes**
 * everywhere (Q353, v0.48) — one token every tokenDripMinutes from the
 * window's start, windowed and perpetual documents alike, so moving the
 * close touches nobody's wallet. The cap applies to grant and drip accrual
 * only; refunds are never forfeited to the cap.
 */

import type { Constitution } from './types.js';

export interface Ledger {
  balance: number;
  /** When the next drip token lands (ms); advances one interval per tick. */
  nextDripT: number;
}

/** The drip interval in ms; non-positive/non-finite means no drip. */
export function dripIntervalMs(constitution: Constitution): number {
  return constitution.tokenDripMinutes * 60_000;
}

export function openLedger(constitution: Constitution, joinedAtMs: number): Ledger {
  const ledger: Ledger = {
    balance: Math.min(constitution.tokenGrant, constitution.tokenCap),
    nextDripT: constitution.windowStartMs + dripIntervalMs(constitution),
  };
  // A mid-session joiner receives the base grant plus drip accrued to
  // date, capped per tick (SPEC §9.3).
  materialize(ledger, constitution, joinedAtMs);
  return ledger;
}

/** Credit all drip ticks due at time t, respecting the cap per tick. */
export function materialize(ledger: Ledger, constitution: Constitution, t: number): void {
  const interval = dripIntervalMs(constitution);
  if (!Number.isFinite(interval) || interval <= 0) return;
  while (ledger.nextDripT <= t) {
    ledger.balance = Math.min(ledger.balance + 1, Math.max(ledger.balance, constitution.tokenCap));
    ledger.nextDripT += interval;
  }
}

/**
 * Re-phase the drip after its interval is amended (§9.6, 367b): ticks
 * accrued under the old interval stand; the next lands one new interval
 * after the amendment. Never retro-credits and never double-pays.
 */
export function rephaseDrip(ledger: Ledger, t: number, newIntervalMs: number): void {
  ledger.nextDripT =
    !Number.isFinite(newIntervalMs) || newIntervalMs <= 0
      ? Infinity
      : t + newIntervalMs;
}

export function spend(ledger: Ledger, constitution: Constitution, t: number, amount: number): void {
  materialize(ledger, constitution, t);
  if (ledger.balance < amount) {
    throw new Error(`insufficient tokens: balance ${ledger.balance}, need ${amount}`);
  }
  ledger.balance -= amount;
}

export function credit(ledger: Ledger, constitution: Constitution, t: number, amount: number): void {
  materialize(ledger, constitution, t);
  ledger.balance += amount;
}

export function balanceAt(ledger: Ledger, constitution: Constitution, t: number): number {
  materialize(ledger, constitution, t);
  return ledger.balance;
}

/** refund = stake × min(peakW / 0.5, 1.5) (SPEC §7). */
export function performanceRefund(stake: number, peakW: number): number {
  return stake * Math.min(peakW / 0.5, 1.5);
}
