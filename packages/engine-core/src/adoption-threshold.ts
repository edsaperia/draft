/**
 * The adoption threshold on the session clock (SPEC §4.3) —
 * the confidence bar a challenger's win-probability had to clear.
 *
 * **Pinned at 0.5 since v0.128** (Q1362 (b), Ed 2026-09-15, R-117). Adoption
 * is the top of the ranking with the floor met (SPEC §4.2), so nothing gates
 * on this value any more: it is recorded on every `adopted` event, it divides
 * the routing weight as a constant, and it moves nothing. The ramp and its
 * re-anchoring stay for one release — `DEFAULT_CONSTITUTION` pins start and
 * end equal, so the curve below is flat — and the deletion pass removes this
 * module, §4.3 and the two fields together. Nothing new may read it.
 *
 * It ramps smoothly from adoptionThresholdStart to adoptionThresholdEnd
 * over the session window (wall clock). The bar tracks irreversibility:
 * early adoptions can still be challenged within the session; late ones
 * are permanent. Unscrutinised text is protected not by the clock but by
 * the adoption floor and the posterior itself.
 *
 * (An evidence-clock variant — the threshold as a function of total
 * comparisons, so the document stabilises in proportion to absorbed
 * judgment — is deferred to the sim to explore; QUESTIONS #26.)
 */

import type { Constitution } from './types.js';

/** Smoothstep: 3x^2 - 2x^3 on [0,1], clamped. */
export function smoothstep(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x * x * (3 - 2 * x);
}

export function adoptionThreshold(constitution: Constitution, nowMs: number): number {
  const { adoptionThresholdStart, adoptionThresholdEnd, windowStartMs, windowEndMs } =
    constitution;
  const span = windowEndMs - windowStartMs;
  const x = span <= 0 ? 1 : (nowMs - windowStartMs) / span;
  return adoptionThresholdStart + (adoptionThresholdEnd - adoptionThresholdStart) * smoothstep(x);
}
