/**
 * **The Smith set of a head-to-head table** (SPEC §4.2 → why: R-143; Q1539).
 *
 * Pure and engine-free: nodes are opaque ids and the table is one function,
 * `edge(x, y)` — *x reaches y in one step* — so the same code answers both
 * readings the engine needs. During the document's life an edge is a pair
 * that has been **measured** (R-142) and that x did not lose, so an unasked
 * pair is a **gap** and never a draw (Q1539 ruling 2); at the close an
 * unmeasured pair is read as level, an edge each way (§4.2, *on the evidence
 * it has*).
 *
 * The set is every node that reaches every other node through a chain of
 * edges. Over a complete table that is the textbook Smith set — the smallest
 * group each of whose members beats or ties everything outside it. Over a
 * table with gaps it can be empty: nothing yet reaches everything, and the
 * caller falls back to the fit's order (and carries nothing on it).
 *
 * Reachability is Floyd–Warshall over booleans: a race rarely holds more than
 * ten wordings, a crowded clause twenty (21³ is nine thousand steps).
 */
export function smithSet(
  nodes: readonly string[],
  edge: (from: string, to: string) => boolean,
): string[] {
  const n = nodes.length;
  if (n === 0) return [];
  const reach: boolean[][] = nodes.map((x, i) =>
    nodes.map((y, j) => i !== j && edge(x, y)));
  for (let k = 0; k < n; k++) {
    const rk = reach[k]!;
    for (let i = 0; i < n; i++) {
      const ri = reach[i]!;
      if (!ri[k]) continue;
      for (let j = 0; j < n; j++) if (rk[j]) ri[j] = true;
    }
  }
  return nodes.filter((_, i) => reach[i]!.every((r, j) => r || j === i));
}
