/**
 * Rebase (SPEC §2.4): reposition a live patch's hunks onto the text
 * produced by adopting another patch against the same base version.
 */

import type { Hunk, RebaseResult, Span } from "./types.js";
import { spansConflict } from "./patch.js";

/**
 * Rebase `hunks` over `adopted`. Both hunk sets are expressed against the
 * SAME base version; the result is expressed against
 * `applyPatch(base, adopted)`.
 *
 * If any candidate hunk conflicts with any adopted hunk (normative
 * semantics in patch.ts), rebase fails: `{ ok: false, conflicts }` where
 * `conflicts` is the deduplicated, sorted list of ADOPTED hunk spans that
 * conflicted — the contested regions, suitable for feeding `splitHunks`
 * for surgery (§2.5).
 *
 * Otherwise every hunk is shifted by the cumulative line-count delta of
 * adopted hunks strictly before it. An adopted hunk [as, ae, lines) counts
 * as "before" a candidate hunk h iff ae <= h.start; this single rule
 * encodes both required boundary behaviors:
 * - an adopted insertion at exactly h.start (as === ae === h.start) shifts h;
 * - a candidate insertion at p with an adopted replacement ending at
 *   ae === p is shifted by that hunk (p >= ae counts as before).
 * Adopted hunks at or beyond h.end (non-conflicting, not before) leave h
 * unshifted.
 */
export function rebaseHunks(hunks: Hunk[], adopted: Hunk[]): RebaseResult {
  // Conflict pass: collect every adopted span that conflicts with any
  // candidate hunk.
  const conflicting = new Set<Hunk>();
  for (const h of hunks) {
    const hSpan: Span = { start: h.start, end: h.end };
    for (const a of adopted) {
      if (spansConflict(hSpan, { start: a.start, end: a.end })) {
        conflicting.add(a);
      }
    }
  }
  if (conflicting.size > 0) {
    const conflicts = dedupeSpans(
      [...conflicting].map((a): Span => ({ start: a.start, end: a.end })),
    );
    return { ok: false, conflicts };
  }

  const rebased = hunks
    .map((h): Hunk => {
      let delta = 0;
      for (const a of adopted) {
        if (a.end <= h.start) {
          delta += a.lines.length - (a.end - a.start);
        }
      }
      return { start: h.start + delta, end: h.end + delta, lines: h.lines.slice() };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  return { ok: true, hunks: rebased };
}

/** Sort spans by (start, end) and drop exact duplicates. */
function dedupeSpans(spans: Span[]): Span[] {
  const sorted = spans.slice().sort((a, b) => a.start - b.start || a.end - b.end);
  const out: Span[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last === undefined || last.start !== s.start || last.end !== s.end) {
      out.push({ start: s.start, end: s.end });
    }
  }
  return out;
}
