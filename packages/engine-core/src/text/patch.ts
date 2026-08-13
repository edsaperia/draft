/**
 * Patch validation, application, footprints, and conflict semantics.
 *
 * Conflict semantics (normative, SPEC §2.2/§2.3):
 * - A replacement hunk touches lines [start, end). A pure insertion
 *   (start === end) touches the gap before line `start`.
 * - Two replacements conflict iff their [start, end) intervals intersect;
 *   sharing only a boundary is NOT a conflict.
 * - Insertion at p vs replacement [s, e): conflict iff s < p < e; insertion
 *   at the boundary (p === s or p === e) is NOT a conflict.
 * - Insertion vs insertion: conflict iff same position (they contest the
 *   same empty incumbent).
 */

import type { Hunk, Span } from "./types.js";

/**
 * Validate a hunk set against a base document of `baseLength` lines.
 * Throws an Error with a descriptive message unless:
 * - every hunk has integer 0 <= start <= end <= baseLength and a string[]
 *   `lines`;
 * - hunks are sorted by start and non-overlapping: for consecutive hunks
 *   h1, h2, h1.end <= h2.start;
 * - no two insertions sit at the same position (touching boundaries are
 *   otherwise allowed — consistent with the conflict semantics, and
 *   unambiguous to apply).
 */
export function validateHunks(baseLength: number, hunks: Hunk[]): void {
  if (!Number.isInteger(baseLength) || baseLength < 0) {
    throw new Error(`validateHunks: baseLength must be a non-negative integer, got ${baseLength}`);
  }
  hunks.forEach((h, i) => {
    if (!Number.isInteger(h.start) || !Number.isInteger(h.end)) {
      throw new Error(`validateHunks: hunk ${i} has non-integer bounds [${h.start}, ${h.end})`);
    }
    if (h.start < 0 || h.start > h.end || h.end > baseLength) {
      throw new Error(
        `validateHunks: hunk ${i} out of range: [${h.start}, ${h.end}) against base of ${baseLength} lines`,
      );
    }
    if (!Array.isArray(h.lines) || !h.lines.every((l) => typeof l === "string")) {
      throw new Error(`validateHunks: hunk ${i} lines must be an array of strings`);
    }
  });
  for (let i = 1; i < hunks.length; i++) {
    const h1 = hunks[i - 1];
    const h2 = hunks[i];
    if (h1 === undefined || h2 === undefined) continue;
    if (h1.start > h2.start) {
      throw new Error(`validateHunks: hunks ${i - 1} and ${i} are not sorted by start (${h1.start} > ${h2.start})`);
    }
    if (h1.end > h2.start) {
      throw new Error(
        `validateHunks: hunks ${i - 1} and ${i} overlap: [${h1.start}, ${h1.end}) and [${h2.start}, ${h2.end})`,
      );
    }
    if (h1.start === h1.end && h2.start === h2.end && h1.start === h2.start) {
      throw new Error(
        `validateHunks: hunks ${i - 1} and ${i} are both insertions at position ${h1.start} (ambiguous order)`,
      );
    }
  }
}

/**
 * Apply a validated hunk set to `base`, returning a new line array.
 * Hunks are applied last-to-first so earlier indices stay stable.
 * Throws (via `validateHunks`) if the hunk set is malformed.
 */
export function applyPatch(base: string[], hunks: Hunk[]): string[] {
  validateHunks(base.length, hunks);
  const result = base.slice();
  for (let i = hunks.length - 1; i >= 0; i--) {
    const h = hunks[i];
    if (h === undefined) continue;
    result.splice(h.start, h.end - h.start, ...h.lines);
  }
  return result;
}

/**
 * The footprint of a hunk set: one span per hunk, with adjacent non-empty
 * spans (prev.end === next.start) merged into a single span. Insertions
 * yield empty spans (start === end) which never merge into neighbors —
 * an insertion point at a replacement's boundary is a distinct, non-
 * conflicting site.
 */
export function footprint(hunks: Hunk[]): Span[] {
  const spans = hunks
    .map((h): Span => ({ start: h.start, end: h.end }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Span[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (
      last !== undefined &&
      last.start < last.end && // last is non-empty
      s.start < s.end && // s is non-empty
      last.end === s.start
    ) {
      last.end = s.end;
    } else {
      merged.push({ start: s.start, end: s.end });
    }
  }
  return merged;
}

/** The normative conflict predicate over two spans (see module docs). */
export function spansConflict(a: Span, b: Span): boolean {
  const aInsert = a.start === a.end;
  const bInsert = b.start === b.end;
  if (aInsert && bInsert) return a.start === b.start;
  if (aInsert) return b.start < a.start && a.start < b.end;
  if (bInsert) return a.start < b.start && b.start < a.end;
  return a.start < b.end && b.start < a.end;
}

/** True iff any span of `a` conflicts with any span of `b`. */
export function footprintsConflict(a: Span[], b: Span[]): boolean {
  return a.some((sa) => b.some((sb) => spansConflict(sa, sb)));
}

/**
 * Partition whole hunks by whether they conflict with any of the given
 * spans (surgery, SPEC §2.5). No sub-hunk splitting: a hunk is `inside`
 * iff its own span conflicts with at least one of `spans`. Order is
 * preserved within each partition.
 */
export function splitHunks(hunks: Hunk[], spans: Span[]): { inside: Hunk[]; outside: Hunk[] } {
  const inside: Hunk[] = [];
  const outside: Hunk[] = [];
  for (const h of hunks) {
    const span: Span = { start: h.start, end: h.end };
    if (spans.some((s) => spansConflict(span, s))) {
      inside.push(h);
    } else {
      outside.push(h);
    }
  }
  return { inside, outside };
}
