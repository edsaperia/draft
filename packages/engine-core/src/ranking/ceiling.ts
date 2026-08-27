/**
 * The highest confidence a room of E can produce on an ordinary race, and
 * therefore the highest approval threshold it can ever clear (Q840).
 *
 * A race carries at most one usable comparison per participant per pair per
 * ground (`session.ts` `usableComparisons` keeps each participant's latest
 * judgment), so an ordinary race — one proposal against the standing text —
 * can hold at most E head-to-head comparisons on that pair. Fit those as E
 * unanimous wins for the challenger and the posterior P(challenger beats
 * incumbent) is the ceiling: `sweepAdoptions` requires `leaderP > threshold`
 * strictly, so a bar at or above that posterior can never be cleared,
 * however long the document runs.
 *
 * Three choices, each load-bearing:
 *
 * - **One challenger.** A race that also holds a rival can go higher, since
 *   the rival's comparisons inform the incumbent pair transitively (0.919 at
 *   E = 1 against 0.798). The number here is the ceiling of the *ordinary*
 *   race, which is what the surface copy speaks about — "a proposal", never
 *   "any race".
 * - **The default prior.** `fitRaceMembers` calls `fitDavidson(ids, comps)`
 *   with no options, so `priorSigma` 2 is the live one; `opts` is here for
 *   tests and sweeps, not for the product.
 * - **Floor, never round** (STYLE §2). 0.7978 must read 79%: a bar of 80 is
 *   *not* clearable, because 0.7978 > 0.80 is false. The printed number is
 *   one the room can clear; the next one up is not.
 *
 * Nothing in the engine enforces this — the room may still set 85%. The
 * card says what 85% will mean for a room this size (Ed, 2026-08-26, Q840
 * option (a)).
 */
import { fitDavidson } from './davidson.js';
import type { Comparison, FitOptions } from './types.js';

/**
 * The posterior P(challenger beats incumbent) after `e` unanimous wins of one
 * challenger over the standing text. `e < 1` is the no-data prior, 0.5.
 */
export function unanimousCeiling(e: number, opts: FitOptions = {}): number {
  if (!Number.isFinite(e) || e < 1) return 0.5;
  const n = Math.floor(e);
  const comps: Comparison[] = [];
  for (let k = 0; k < n; k++) comps.push({ a: 'c', b: 'inc', outcome: 'a' });
  return fitDavidson(['c', 'inc'], comps, opts).probBeats('c', 'inc');
}

/**
 * `unanimousCeiling` as the highest whole-percent bar a room of `e` can
 * clear: floored, and capped at 99.
 *
 * **The cap is a backstop, not the table.** Measured, the floor alone gives
 * 99 from e = 10 out past e = 20,000 — the posterior rises towards 1 but
 * never reaches it, so 99 at e ≥ 10 is exact rather than clamped. The cap
 * fires only where the normal-CDF approximation in `davidson.ts` saturates
 * at 1 (somewhere under e = 30,000, no room this project will ever see), and it is kept
 * because a printed 100 would claim a bar the strict `>` cannot clear.
 * `test/ranking/ceiling.test.ts` asserts both halves of that.
 */
export function ceilingPct(e: number, opts: FitOptions = {}): number {
  return Math.min(99, Math.floor(100 * unanimousCeiling(e, opts)));
}
