/**
 * **A sealed record follows its clause, not the line index it had at
 * adoption** (Q1333, Ed 2026-09-11, the moon room: a ✔ *Food* whose tab sat
 * beside the FOOD heading, because r:c215 adopted the rota paragraph at line
 * 41 of version 55 and line 41 of version 71 was `## Food`).
 *
 * The page keys a record's entry, tab and card by line index against the
 * *current* text (`blocksOf`: one block is one engine line), and the record
 * carries its span in the coordinates of the version it was decided against.
 * Every later adoption or decree that inserts or deletes lines above shifts
 * the index. This module translates a span forward.
 *
 * **The walk, not an alignment.** Engine-core holds every version, so the
 * span could be recovered by aligning `documentAt(version)` with the current
 * text line by line — but the engine also holds the exact hunks each step
 * applied (the adopted candidate's patch, frozen at adoption; a decree's own
 * patch), and applying each step's `[start, end) → lines.length` to the span
 * is exact where an alignment guesses, and cheaper. One rule per hunk:
 *
 *   - a hunk wholly before the span shifts it by the hunk's growth;
 *   - a hunk wholly after it leaves it alone;
 *   - a hunk touching it folds the span into the union of what survives and
 *     the replacement — so a clause changed again stands on its replacement,
 *     and a clause deleted stands on the gap where it stood
 *     (`start === end`, the page's gap key).
 *
 * Nothing here reads a seat: the host memoises the result per state version
 * (`host:recordSpans`, the way `host:judgedBy` is — Q1324).
 */
import type { Session } from '../../engine-core/src/session.js';
import type { Hunk } from '../../engine-core/src/text/types.js';

export type Span = { start: number; end: number };

/** One version step: the hunks that took `v - 1` to `v`. */
export type VersionStep = { v: number; hunks: Hunk[] };

/**
 * A span through one step's hunks. Hunks are applied highest first: each is
 * addressed in the step's *pre*-version coordinates, and a higher hunk moves
 * nothing below it, so every hunk's coordinates stay valid as the span moves.
 */
export function shiftSpan(span: Span, hunks: Hunk[]): Span {
  let { start, end } = span;
  for (const h of hunks.slice().sort((a, b) => b.start - a.start)) {
    const delta = h.lines.length - (h.end - h.start);
    const touches = h.start < end && h.end > start;
    if (touches) {
      // the replacement plus whatever of the span the hunk did not cover
      start = Math.min(start, h.start);
      end = Math.max(end, h.end) + delta;
    } else if (h.end <= start) {
      // wholly before, an insertion at the span's own start included: the
      // span moves down under it
      start += delta;
      end += delta;
    }
    // wholly after: nothing
  }
  return { start, end };
}

/**
 * The span an adoption *produced*: the field's span at the version it was
 * decided against, with the winner's own hunks applied. Not `shiftSpan`,
 * whose rule for an insertion at an empty span is to move the span under
 * it — right for a stranger's insertion landing on a deleted clause's gap,
 * wrong for the record of the insertion itself, which stands on the lines
 * it put there. Every winner hunk lies within the span by construction (the
 * span is the union of the field's hunks), so the produced span is the
 * span grown by the winner's growth.
 */
export function adoptedSpan(span: Span, winner: Hunk[]): Span {
  let start = span.start, growth = 0;
  for (const h of winner) {
    start = Math.min(start, h.start);
    growth += h.lines.length - (h.end - h.start);
  }
  return { start, end: Math.max(start, span.end + growth) };
}

/**
 * A span in `version`'s coordinates, carried to the current version. Steps
 * whose `v` is at or below `version` are already in the span's coordinates.
 */
export function spanNow(span: Span, version: number, steps: VersionStep[]): Span {
  let out = span;
  for (const s of steps) if (s.v > version) out = shiftSpan(out, s.hunks);
  return out;
}

/**
 * Every version step the log holds, in order: an `adopted` text candidate
 * (its patch is frozen at adoption — `rebaseOthers` excludes the winner, so
 * `patch.hunks` is exactly what the fold applied) and a `text-decreed`
 * patch. A setting race's `adopted` bumps no version and is skipped.
 */
export function versionSteps(engine: Session): VersionStep[] {
  const out: VersionStep[] = [];
  for (const entry of engine.log) {
    const ev = entry.event;
    if (ev.type === 'adopted') {
      const c = engine.getCandidate(ev.candidateId);
      if (c.patch === undefined) continue;
      out.push({ v: ev.newVersion, hunks: c.patch.hunks });
    } else if (ev.type === 'text-decreed') {
      out.push({ v: ev.newVersion, hunks: ev.patch.hunks });
    }
  }
  return out;
}
