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

/**
 * Credit all drip ticks due at time t, respecting the cap per tick.
 *
 * **Counted, never looped** (issue #4). This walked the ticks one at a time —
 * `while (nextDripT <= t) nextDripT += interval` — and an interval below
 * float precision at epoch milliseconds leaves `next + interval === next`,
 * so the loop never ended and the one Node thread stopped serving every
 * document, at boot as well as live. The constitution layer floors the
 * interval at a whole minute, and this counts the ticks instead, so the
 * library cannot spin however small an interval it is handed.
 *
 * Tick for tick the same answer: the loop credits 1 per tick while the
 * balance is under the cap and nothing once it is at or over it (a refund
 * may leave it over — refunds are never forfeit), which is the balance line
 * below; and the advance is exact for every interval the floor admits, a
 * whole minute being a whole number of milliseconds. Guard:
 * `test/tokens.test.ts`, which sweeps the two against each other.
 */
export function materialize(ledger: Ledger, constitution: Constitution, t: number): void {
  const interval = dripIntervalMs(constitution);
  if (!Number.isFinite(interval) || interval <= 0) return;
  if (!(ledger.nextDripT <= t)) return; // the loop's own test, NaN included
  const ticks = Math.floor((t - ledger.nextDripT) / interval) + 1;
  ledger.balance = Math.max(
    ledger.balance,
    Math.min(ledger.balance + ticks, constitution.tokenCap),
  );
  ledger.nextDripT += ticks * interval;
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

/**
 * The ledger as it **would** read at t, without writing it (issue #24).
 *
 * `materialize` is a write, and the only thing entitled to make one is an
 * event in the log: a grant at `openLedger`, a `spend`, a `credit`, a
 * `rephaseDrip`. A reader that materialized in place moved the wallet at
 * whatever clock it happened to be asked about, and nothing in the log said
 * so — which a replay, having only the log, then could not reproduce. Every
 * read goes through this copy, so live and replayed ledgers cannot diverge
 * however the clocks a host reads at are ordered.
 */
export function creditedAt(ledger: Ledger, constitution: Constitution, t: number): Ledger {
  const copy: Ledger = { ...ledger };
  materialize(copy, constitution, t);
  return copy;
}

export function balanceAt(ledger: Ledger, constitution: Constitution, t: number): number {
  return creditedAt(ledger, constitution, t).balance;
}

/** refund = stake × min(peakW / 0.5, 1.5) (SPEC §7). */
export function performanceRefund(stake: number, peakW: number): number {
  return stake * Math.min(peakW / 0.5, 1.5);
}
