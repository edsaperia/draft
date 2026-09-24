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
  /**
   * **What this hunk believes it is replacing** (SPEC §2.1 → why: R-136):
   * the exact lines of `baseVersion` at [start, end), so
   * `was.length === end - start`. A replacement carries it; a pure
   * insertion carries `after` instead. Required at every participant
   * boundary and **never written to the log** — `text/attest.ts` fills it,
   * checks it and strips it before anything is emitted.
   */
  was?: string[];
  /**
   * A pure insertion's attestation (`start === end`): the exact line
   * immediately before the insertion point, `null` only at `start === 0`.
   */
  after?: string | null;
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

/**
 * **The three roads a live patch takes when the text changes under it**
 * (SPEC §2.4 → why: R-141). `rebased`: it touches none of the change's
 * lines, and its lines move while its words do not. `reaimed`: it **covers**
 * the change — every changed hunk lies inside one of its own — so the
 * document it would make is the document it would have made, and it now
 * replaces the words the change put there. `stranded`: it touches the
 * change's lines without covering them, and goes back to its author.
 */
export type CarryResult =
  | { road: 'rebased'; hunks: Hunk[] }
  | { road: 'reaimed'; hunks: Hunk[] }
  | { road: 'stranded'; conflicts: Span[] };

export type ComposeResult =
  | { ok: true; hunks: Hunk[] }
  | { ok: false };
