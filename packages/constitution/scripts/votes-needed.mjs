/**
 * Prints the `VOTES_NEEDED` literal for `src/threshold.ts` (entry 163).
 *
 * Run **once, by hand**, and paste the output — never at build, and never
 * imported by anything that ships. The table is engine-core's Davidson fit
 * copied out for the browser bundle, exactly as `BAR_CEILING_PCT` is, because
 * `design/constitution.js` carries no engine-core and the explainer page at
 * /pairwise has to draw its chart from something. What keeps the copy honest
 * is `test/threshold.test.ts`, which re-runs the fit cell by cell.
 *
 *   npx tsx packages/constitution/scripts/votes-needed.mjs
 *
 * The cell is the **smallest** `k` such that `k` votes for the change and
 * `n − k` against put the posterior P(challenger beats incumbent) strictly
 * above the bar — `sweepAdoptions` adopts on `leaderP > threshold` — or `0`
 * where no `k ≤ n` does, which is Q840's ceiling seen from the other side.
 */
import { fitDavidson } from '../../engine-core/src/ranking/davidson.js';

const MAX_N = 100;
const LO_PCT = 50;
const HI_PCT = 99;

/** The posterior after `k` votes for the challenger and `n − k` against. */
function posterior(k, n) {
  const comps = [];
  for (let i = 0; i < n; i++) comps.push({ a: 'c', b: 'inc', outcome: i < k ? 'a' : 'b' });
  return fitDavidson(['c', 'inc'], comps).probBeats('c', 'inc');
}

// one column of posteriors per vote count, reused by all fifty rows
const column = [];
for (let n = 1; n <= MAX_N; n++) {
  const ps = [];
  for (let k = 0; k <= n; k++) ps.push(posterior(k, n));
  column.push(ps);
}

const lines = [];
for (let pct = LO_PCT; pct <= HI_PCT; pct++) {
  const row = [];
  for (let n = 1; n <= MAX_N; n++) {
    const ps = column[n - 1];
    let need = 0;
    for (let k = 0; k <= n; k++) if (ps[k] > pct / 100) { need = k; break; }
    row.push(need);
  }
  lines.push('  /* ' + pct + '% */ [' + row.join(', ') + '],');
}

console.log('export const VOTES_NEEDED: readonly (readonly number[])[] = [');
console.log(lines.join('\n'));
console.log('];');
