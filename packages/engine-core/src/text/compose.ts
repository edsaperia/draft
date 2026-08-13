/**
 * Textual composition — Gate 1 (SPEC §2.2.1): a three-way merge tried in
 * both orders. Success means the two patches are textually independent.
 */

import type { ComposeResult, Hunk } from "./types.js";
import { diffLines } from "./diff.js";
import { applyPatch, footprint, footprintsConflict, validateHunks } from "./patch.js";
import { rebaseHunks } from "./rebase.js";

/**
 * Attempt to compose patches `a` and `b` (both against `base`) into a
 * single combined patch.
 *
 * Gate 1: if the footprints conflict, composition fails immediately.
 * Otherwise rebase each patch onto the other's result and apply in both
 * orders; if either rebase fails, either application is ill-formed, or the
 * two resulting texts differ, composition fails. On success the combined
 * patch is normalized as `diffLines(base, mergedText)` — a single clean
 * hunk set against the original base.
 *
 * Malformed inputs (hunk sets invalid against `base`) are a caller error
 * and throw; `{ ok: false }` is reserved for genuine composition failure.
 */
export function composeTextual(base: string[], a: Hunk[], b: Hunk[]): ComposeResult {
  validateHunks(base.length, a);
  validateHunks(base.length, b);

  if (footprintsConflict(footprint(a), footprint(b))) {
    return { ok: false };
  }

  const bOntoA = rebaseHunks(b, a);
  const aOntoB = rebaseHunks(a, b);
  if (!bOntoA.ok || !aOntoB.ok) {
    return { ok: false };
  }

  // With disjoint footprints both orders should succeed and agree, but
  // verify rather than assume.
  let abText: string[];
  let baText: string[];
  try {
    abText = applyPatch(applyPatch(base, a), bOntoA.hunks);
    baText = applyPatch(applyPatch(base, b), aOntoB.hunks);
  } catch {
    return { ok: false };
  }

  if (abText.length !== baText.length || abText.some((line, i) => line !== baText[i])) {
    return { ok: false };
  }

  return { ok: true, hunks: diffLines(base, abText) };
}
