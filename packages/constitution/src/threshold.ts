/**
 * The approval threshold on the session clock (SPEC §4.3, v0.48), as
 * anchors. The ramp runs from the moment judging opens (constituted,
 * §9.6a/Q342) to the close; postponing the close never lowers the bar —
 * the threshold keeps the value it has at that moment and rises from there
 * to the same ceiling over the new remainder, which is exactly an appended
 * anchor. A close moved earlier keeps the current value too and rises over
 * the shorter remainder (author call, NOTES.md). Same smoothstep as
 * engine-core's adoptionThreshold, so the plain single-anchor case is
 * parity (asserted in test/threshold.test.ts).
 */

/** Smoothstep: 3x^2 - 2x^3 on [0,1], clamped — engine-core's curve. */
export function smoothstep(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x * x * (3 - 2 * x);
}

export interface ThresholdAnchors {
  /** 'fixed' holds endPct for the whole life; 'ramp' rises anchor → close. */
  shape: 'fixed' | 'ramp';
  /** The bar at the close (§9.0: the binding scalar), in percent 50–100. */
  endPct: number;
  /** Where the current ramp segment starts: (t, pct). Reseeded on re-anchor. */
  anchorT: number;
  anchorPct: number;
  /** The close. null = perpetual, which forces fixed (§9.0). */
  endT: number | null;
}

export function seedAnchors(
  shape: 'fixed' | 'ramp',
  startPct: number | null,
  endPct: number,
  constitutedT: number,
  endT: number | null,
): ThresholdAnchors {
  if (endT === null && shape === 'ramp')
    throw new Error('a ramp needs an endpoint — perpetual forces fixed (§9.0)');
  if (shape === 'ramp' && startPct === null)
    throw new Error('a ramp needs a start');
  return {
    shape,
    endPct,
    anchorT: constitutedT,
    anchorPct: shape === 'ramp' ? startPct! : endPct,
    endT,
  };
}

/** The bar now, in percent. */
export function barAt(a: ThresholdAnchors, t: number): number {
  if (a.shape === 'fixed' || a.endT === null) return a.endPct;
  const span = a.endT - a.anchorT;
  const x = span <= 0 ? 1 : (t - a.anchorT) / span;
  return a.anchorPct + (a.endPct - a.anchorPct) * smoothstep(x);
}

/**
 * The close moved (§4.3): keep the current value, rise to the same ceiling
 * over the new remainder — in both directions.
 */
export function reAnchor(a: ThresholdAnchors, tNow: number, newEndT: number | null): ThresholdAnchors {
  const current = barAt(a, tNow);
  return {
    shape: newEndT === null ? 'fixed' : a.shape,
    endPct: a.endPct,
    anchorT: tNow,
    anchorPct: newEndT === null ? a.endPct : current,
    endT: newEndT,
  };
}
