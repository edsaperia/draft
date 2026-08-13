/**
 * Line splitting/joining and minimal line diff (Myers O(ND)).
 *
 * The document is an array of lines. `splitLines` and `joinLines` define the
 * canonical text <-> lines mapping; `diffLines` produces a sorted,
 * non-overlapping hunk set such that `applyPatch(base, diffLines(base, t))`
 * equals `t`.
 */

import type { Hunk } from "./types.js";

/**
 * Split text into lines. Line endings are normalized first: '\r\n' and bare
 * '\r' both become '\n', then the text is split on '\n'.
 *
 * The empty string maps to `[]` (zero lines), NOT `['']` — an empty document
 * has no lines. This makes `splitLines`/`joinLines` a clean inverse pair for
 * the empty document and keeps line indices meaningful. Note the mapping is
 * otherwise `text.split('\n')`, so a trailing newline yields a final empty
 * line ('a\n' → ['a', '']).
 */
export function splitLines(text: string): string[] {
  if (text === "") return [];
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

/** Inverse of `splitLines`: join lines with '\n'. `[]` maps back to ''. */
export function joinLines(lines: string[]): string {
  return lines.join("\n");
}

/** Internal edit-script operation produced by the Myers backtrack. */
type Op = "eq" | "del" | "ins";

/**
 * Minimal line diff via Myers' O(ND) shortest-edit-script algorithm.
 *
 * Returns hunks that are sorted by start, non-overlapping, and separated by
 * at least one unchanged line (adjacent/overlapping change regions are merged
 * into a single hunk by construction: each hunk is a maximal run of
 * non-equal edit operations). Deterministic: ties in the Myers search are
 * broken by the standard "prefer deletion" rule.
 */
export function diffLines(base: string[], target: string[]): Hunk[] {
  const ops = myersOps(base, target);
  const hunks: Hunk[] = [];
  let baseIdx = 0;
  let targetIdx = 0;
  let current: Hunk | null = null;

  for (const op of ops) {
    if (op === "eq") {
      current = null;
      baseIdx += 1;
      targetIdx += 1;
    } else {
      if (current === null) {
        current = { start: baseIdx, end: baseIdx, lines: [] };
        hunks.push(current);
      }
      if (op === "del") {
        baseIdx += 1;
        current.end = baseIdx;
      } else {
        const line = target[targetIdx];
        if (line === undefined) throw new Error("diffLines: internal error (target index out of range)");
        current.lines.push(line);
        targetIdx += 1;
      }
    }
  }
  return hunks;
}

/** Myers O(ND) shortest edit script, returned as a flat op sequence. */
function myersOps(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  if (max === 0) return [];

  // v[k + max] = furthest x on diagonal k. trace[d] is v before round d.
  const size = 2 * max + 1;
  let v = new Array<number>(size).fill(0);
  const trace: number[][] = [];
  let foundD = -1;

  outer: for (let d = 0; d <= max; d++) {
    trace.push(v.slice());
    const next = v.slice();
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      const down = v[k + 1 + max];
      const right = v[k - 1 + max];
      if (k === -d || (k !== d && (right ?? 0) < (down ?? 0))) {
        x = down ?? 0; // move down (insertion)
      } else {
        x = (right ?? 0) + 1; // move right (deletion)
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x += 1;
        y += 1;
      }
      next[k + max] = x;
      if (x >= n && y >= m) {
        v = next;
        foundD = d;
        break outer;
      }
    }
    v = next;
  }
  if (foundD < 0) throw new Error("diffLines: internal error (no edit path found)");

  // Backtrack. trace[d] holds the v-state entering round d; the endpoint of
  // round d on diagonal k came from trace[d]'s k±1 entry.
  const reversed: Op[] = [];
  let x = n;
  let y = m;
  for (let d = foundD; d >= 0; d--) {
    const vd = trace[d];
    if (vd === undefined) throw new Error("diffLines: internal error (missing trace)");
    const k = x - y;
    let prevK: number;
    const down = vd[k + 1 + max];
    const right = vd[k - 1 + max];
    if (k === -d || (k !== d && (right ?? 0) < (down ?? 0))) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = vd[prevK + max] ?? 0;
    const prevY = prevX - prevK;
    // Walk back along the snake (equal lines): while both coordinates exceed
    // the pre-step point's coordinates, the step back is diagonal.
    while (d > 0 ? x > prevX && y > prevY : x > 0 && y > 0) {
      reversed.push("eq");
      x -= 1;
      y -= 1;
    }
    if (d > 0) {
      if (x === prevX) {
        reversed.push("ins"); // vertical step: b[y-1] inserted
        y -= 1;
      } else {
        reversed.push("del"); // horizontal step: a[x-1] deleted
        x -= 1;
      }
    }
  }
  return reversed.reverse();
}
