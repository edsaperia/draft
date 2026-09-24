/**
 * Rebase (SPEC §2.4): reposition a live patch's hunks onto the text
 * produced by adopting another patch against the same base version.
 */

import type { CarryResult, Hunk, RebaseResult, Span } from "./types.js";
import { applyPatch, spansConflict } from "./patch.js";

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

/**
 * **Does the patch hunk `h` cover the changed hunk `a`?** (SPEC §2.4 → why:
 * R-141). A replacement covers a replacement lying wholly inside it, shared
 * boundaries included; a replacement covers an insertion strictly inside it
 * (at an edge an insertion is a neighbour, not a part — it does not conflict,
 * and a patch that rebases over it keeps it); an insertion covers an
 * insertion at the same place, and nothing else, since an insertion replaces
 * no line.
 */
function covers(h: Hunk, a: Hunk): boolean {
  const hInsert = h.start === h.end;
  const aInsert = a.start === a.end;
  if (hInsert) return aInsert && a.start === h.start;
  if (aInsert) return h.start < a.start && a.start < h.end;
  return h.start <= a.start && a.end <= h.end;
}

/**
 * **Carry a live patch onto the text a change produced** (SPEC §2.4 → why:
 * R-141): one of three roads. Both hunk sets are against the SAME base
 * version, and `base` is that version's lines.
 *
 * - **rebased** — no hunk of the patch conflicts with any hunk of the change:
 *   `rebaseHunks`, unchanged.
 * - **reaimed** — they conflict, and **every** hunk of the change lies inside
 *   one of the patch's own (`covers`). The patch's words are kept; each of its
 *   hunks is shifted by the change's hunks above it and grown by the ones
 *   inside it, so it now replaces the words the change put there. A change
 *   with a hunk the patch does not cover would put that hunk into the
 *   patch's document, which is a document nobody judged — so that is
 *   stranded, however much else is covered.
 * - **stranded** — they conflict without cover: `rebaseHunks`' own failure,
 *   the contested spans for surgery (§2.5).
 *
 * **The re-aim is checked, not trusted**: the document the re-aimed patch
 * makes from the new text must be, line for line, the document the patch made
 * from `base`. Where it is not — which the cover test should make impossible —
 * the patch strands rather than carry a vote to a document nobody judged.
 */
export function carryHunks(hunks: Hunk[], adopted: Hunk[], base: readonly string[]): CarryResult {
  const plain = rebaseHunks(hunks, adopted);
  if (plain.ok) return { road: 'rebased', hunks: plain.hunks };
  const inside = new Map<Hunk, Hunk[]>();
  for (const a of adopted) {
    const host = hunks.find((h) => covers(h, a));
    if (host === undefined) return { road: 'stranded', conflicts: plain.conflicts };
    const list = inside.get(host);
    if (list) list.push(a); else inside.set(host, [a]);
  }
  const grow = (a: Hunk): number => a.lines.length - (a.end - a.start);
  const reaimed = hunks
    .map((h): Hunk => {
      const mine = inside.get(h) ?? [];
      let delta = 0;
      for (const a of adopted) {
        if (!mine.includes(a) && a.end <= h.start) delta += grow(a);
      }
      const growth = mine.reduce((n, a) => n + grow(a), 0);
      return { start: h.start + delta, end: h.end + delta + growth, lines: h.lines.slice() };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);
  // the proof, per call: the same document from either side of the change
  try {
    const was = applyPatch(base.slice(), hunks);
    const now = applyPatch(applyPatch(base.slice(), adopted), reaimed);
    if (was.length !== now.length || was.some((l, i) => l !== now[i])) {
      return { road: 'stranded', conflicts: plain.conflicts };
    }
  } catch {
    return { road: 'stranded', conflicts: plain.conflicts };
  }
  return { road: 'reaimed', hunks: reaimed };
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
