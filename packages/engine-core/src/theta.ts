/**
 * The confidence bar on the evidence clock (SPEC §4.3).
 *
 * theta ramps from thetaStart to thetaEnd as a smooth function of total
 * edge comparisons made session-wide — the document stabilises in
 * proportion to the judgment it has absorbed. Wall-clock never moves it.
 */

import type { Constitution } from './types.js';

/** Smoothstep: 3x^2 - 2x^3 on [0,1], clamped. */
function smoothstep(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x * x * (3 - 2 * x);
}

export function theta(constitution: Constitution, totalEdgeComparisons: number): number {
  const { thetaStart, thetaEnd, evidenceHorizon } = constitution;
  const x = evidenceHorizon <= 0 ? 1 : totalEdgeComparisons / evidenceHorizon;
  return thetaStart + (thetaEnd - thetaStart) * smoothstep(x);
}
