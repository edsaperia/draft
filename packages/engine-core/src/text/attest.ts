/**
 * **What a patch says it is replacing** (SPEC §2.1, §2.4 → why: R-136).
 *
 * A patch is line numbers against a version. That is enough while nothing
 * moves, and not enough the moment something does: a client that drafted
 * against line 8, and is still drafting when a line is adopted above it, is
 * holding a stale number against a version that is nonetheless **current** —
 * so the engine's *targets version N* guard has nothing to fire on and the
 * wrong clause is rewritten, silently, with the author's own words.
 *
 * Nothing but the wording itself can tell the two apart. So every hunk
 * carries it:
 *
 *   - a **replacement** carries `was` — the exact lines of the base version
 *     it believes it is replacing, so `was.length === end - start`;
 *   - a **pure insertion** (`start === end`) replaces nothing, and carries
 *     `after` instead — the exact line immediately before the insertion
 *     point, `null` only at the top of the document (`start === 0`).
 *
 * The comparison is **exact**: no trimming, no marker normalising, no
 * collapsing of whitespace. Blank lines are lines. A surface may compare
 * more loosely for its own purposes (the page does, to decide whether it can
 * carry a draft to its paragraph's new line); this is the door, and a door
 * that guesses is not a guard.
 *
 * The attestation is **validation, not record**: it is checked where the act
 * enters and stripped before anything is emitted, so an event's shape does
 * not move and every log on disk replays byte for byte.
 */

import type { Hunk } from './types.js';

/** The attestation's own failure, so a caller can tell it from a shape error. */
export class AttestationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttestationError';
  }
}

/** Does this hunk replace nothing — a pure insertion (SPEC §2.1)? */
function isInsertion(h: Hunk): boolean {
  return h.start === h.end;
}

/**
 * Fill every hunk's attestation from the base version's lines: what a
 * well-behaved participant sends. The hunks are not otherwise touched, and
 * the input is not mutated.
 *
 * It states what the base version **holds**, which is not the same as
 * stating what the client believes — a caller that fills from lines it has
 * just fetched is attesting to nothing. Fill from the text the draft was
 * written against, which on every client is the text it is showing.
 */
export function attest(baseLines: readonly string[], hunks: readonly Hunk[]): Hunk[] {
  return hunks.map((h) => (isInsertion(h)
    ? { ...h, after: h.start === 0 ? null : (baseLines[h.start - 1] ?? null) }
    : { ...h, was: baseLines.slice(h.start, h.end) }));
}

/** The attestation off a hunk set, so nothing it carries reaches a log. */
export function stripAttestation(hunks: readonly Hunk[]): Hunk[] {
  return hunks.map((h) => ({ start: h.start, end: h.end, lines: h.lines }));
}

/** Is every hunk attested at all — whatever the wording says? */
export function isAttested(hunks: readonly Hunk[]): boolean {
  return hunks.every((h) => (isInsertion(h)
    ? h.after !== undefined
    : Array.isArray(h.was)));
}

/**
 * **The door** (SPEC §2.4). Throws an `AttestationError` naming the first
 * hunk that does not hold; returns silently otherwise.
 *
 * `required` is what separates the two kinds of caller. At a participant
 * boundary — `ParticipantApi.submit`, the host's `propose-text`, `pen-text`
 * and `rebase-text` — it is true and an unattested patch is refused. Inside
 * the engine it is false: the attestation is checked wherever it is present
 * and a direct call that does not carry one is the engine's own business,
 * which is what keeps replay and the library's own callers unmoved.
 *
 * `baseLines` must be the lines of the patch's own `baseVersion`. Callers
 * that cannot be sure the version is current should let the version guard
 * speak first: *targets version N* is the truer sentence where it applies.
 */
export function checkAttestation(
  baseLines: readonly string[],
  hunks: readonly Hunk[],
  opts: { required: boolean },
): void {
  hunks.forEach((h, i) => {
    if (isInsertion(h)) {
      if (h.after === undefined) {
        if (!opts.required) return;
        throw new AttestationError(
          `hunk ${i} carries no 'after' — an insertion must state the line it follows (§2.1)`,
        );
      }
      const want = h.start === 0 ? null : (baseLines[h.start - 1] ?? null);
      if (h.after !== want) {
        throw new AttestationError(
          `the line before line ${h.start} is not what this proposal was written after (§2.4)`,
        );
      }
      return;
    }
    if (h.was === undefined) {
      if (!opts.required) return;
      throw new AttestationError(
        `hunk ${i} carries no 'was' — a proposal must state the wording it replaces (§2.1)`,
      );
    }
    if (h.was.length !== h.end - h.start) {
      throw new AttestationError(
        `hunk ${i} states ${h.was.length} line(s) replaced where it replaces ${h.end - h.start} (§2.1)`,
      );
    }
    for (let k = 0; k < h.was.length; k++) {
      if (h.was[k] !== baseLines[h.start + k]) {
        throw new AttestationError(
          `the text at lines ${h.start + 1}–${h.end} is not what this proposal replaces (§2.4)`,
        );
      }
    }
  });
}
