/**
 * **A proposal is the minimum it changes** (SPEC §2.1 → why: R-147; Ed,
 * 2026-10-01, issue #144).
 *
 * A client may send a hunk wider than its change: a demo bot proposed a
 * one-paragraph deletion as a four-line rewrite whose heading, speaker line
 * and next paragraph came back unchanged. Such a hunk races every proposal
 * its *stated* lines overlap rather than the ones its *changed* lines do, and
 * a disguised insertion races as a replacement. So every text patch is
 * normalised to the lines it actually changes, where it enters:
 *
 *   1. unchanged lines at either end of a hunk are trimmed, the replaced span
 *      and the replacement losing them together;
 *   2. an unchanged run inside a hunk splits it, so one hunk may become
 *      several and a proposal a multi-site patch;
 *   3. a hunk that trims to an insertion is one (`start === end`), and one
 *      that trims to a deletion is one (`lines: []`);
 *   4. a hunk that trims to nothing is dropped; a patch left with no hunk is
 *      for the caller to refuse (*nothing has changed*).
 *
 * The alignment is `diffLines`' (Myers, the engine's own line diff) on each
 * hunk's old and new lines, so a deletion or insertion inside a hunk is found
 * as one even where the lengths differ, and the same input always gives the
 * same hunks — repeated identical lines included.
 *
 * Pure: neither `base` nor `hunks` is mutated. The hunks must already be
 * valid against `base` (`validateHunks`) and checked against their own
 * attestation (`checkAttestation`) **as sent**; every hunk this returns
 * carries an attestation re-derived from `base`, so the checks downstream of
 * the door hold for the trimmed patch too.
 */

import { attest } from './attest.js';
import { diffLines } from './diff.js';
import type { Hunk } from './types.js';

export function minimalHunks(base: readonly string[], hunks: readonly Hunk[]): Hunk[] {
  const out: Hunk[] = [];
  for (const h of hunks) {
    const old = base.slice(h.start, h.end);
    for (const d of diffLines(old, h.lines)) {
      const next: Hunk = { start: h.start + d.start, end: h.start + d.end, lines: d.lines };
      const prev = out[out.length - 1];
      // Two hunks that each trim to an insertion at one point would be two
      // insertions at the same position, which no patch may hold. Applied in
      // order they put the first's lines before the second's, so they are
      // one insertion of both, in that order.
      if (prev !== undefined && prev.start === prev.end && next.start === next.end &&
          prev.start === next.start) {
        prev.lines = [...prev.lines, ...next.lines];
        continue;
      }
      out.push(next);
    }
  }
  return attest(base, out);
}
