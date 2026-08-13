/**
 * The token economy (SPEC §7): anti-flooding, nothing more.
 * Equal grants are a hard invariant; the drip is wall-clock (1 per 10% of
 * the window, by design — SPEC §7 vs §4.3: soft early, hardening tracks
 * absorbed judgment). The cap applies to grant and drip accrual only;
 * refunds are never forfeited to the cap.
 */

import type { Constitution } from './types.js';

export interface Ledger {
  balance: number;
  ticksMaterialized: number;
}

export function openLedger(constitution: Constitution, joinedAtMs: number): Ledger {
  const ledger: Ledger = {
    balance: Math.min(constitution.tokenGrant, constitution.tokenCap),
    ticksMaterialized: 0,
  };
  // A mid-session joiner receives the base grant plus drip accrued to
  // date, capped (SPEC §9.3).
  materialize(ledger, constitution, joinedAtMs);
  return ledger;
}

/** Credit all drip ticks due at time t, respecting the cap per tick. */
export function materialize(ledger: Ledger, constitution: Constitution, t: number): void {
  const { windowStartMs, windowEndMs, tokenDripPerTenth, tokenCap } = constitution;
  const windowMs = windowEndMs - windowStartMs;
  if (windowMs <= 0) return;
  const due = Math.max(0, Math.min(10, Math.floor(((t - windowStartMs) * 10) / windowMs)));
  while (ledger.ticksMaterialized < due) {
    ledger.ticksMaterialized++;
    ledger.balance = Math.min(ledger.balance + tokenDripPerTenth, Math.max(ledger.balance, tokenCap));
  }
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
