/**
 * Text machinery types — the patch-engine's vocabulary.
 *
 * The document is an array of lines (LF-normalized; split on '\n').
 * A patch is a sorted, non-overlapping set of hunks against a specific
 * document version. The mechanism's unit is the edit; paragraphs exist
 * for display only (SPEC §2.1).
 */

/**
 * One contiguous edit: replace lines [start, end) with `lines`.
 * Pure insertion: start === end (insert before line `start`).
 * Pure deletion: lines = [].
 * Line indices are 0-based into the base version's line array.
 */
export interface Hunk {
  start: number;
  end: number;
  lines: string[];
}

/** A candidate's transformation of the document (SPEC §2.1). */
export interface PatchSet {
  /** Index into the session's document version history. */
  baseVersion: number;
  /** Sorted by start, non-overlapping. */
  hunks: Hunk[];
}

/**
 * A footprint span: lines [start, end) touched by a patch.
 * A pure insertion has start === end; two insertions at the same
 * point contest the same (empty) incumbent and therefore overlap.
 */
export interface Span {
  start: number;
  end: number;
}

export type RebaseResult =
  | { ok: true; hunks: Hunk[] }
  | { ok: false; conflicts: Span[] };

export type ComposeResult =
  | { ok: true; hunks: Hunk[] }
  | { ok: false };
