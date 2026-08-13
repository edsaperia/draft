import { describe, expect, it } from "vitest";
import type { Hunk } from "../../src/text/types.js";
import { composeTextual } from "../../src/text/compose.js";
import { applyPatch } from "../../src/text/patch.js";
import { rebaseHunks } from "../../src/text/rebase.js";

const base = ["a", "b", "c", "d", "e", "f"];

/** Apply a then b-rebased-onto-a: the sequential reference result. */
function sequential(doc: string[], a: Hunk[], b: Hunk[]): string[] {
  const rebased = rebaseHunks(b, a);
  if (!rebased.ok) throw new Error("test setup: expected rebase to succeed");
  return applyPatch(applyPatch(doc, a), rebased.hunks);
}

describe("composeTextual — success", () => {
  it("composes disjoint patches and matches the manual expectation", () => {
    const a: Hunk[] = [{ start: 0, end: 1, lines: ["A"] }];
    const b: Hunk[] = [{ start: 3, end: 4, lines: ["D1", "D2"] }];
    const result = composeTextual(base, a, b);
    expect(result).toEqual({
      ok: true,
      hunks: [
        { start: 0, end: 1, lines: ["A"] },
        { start: 3, end: 4, lines: ["D1", "D2"] },
      ],
    });
    if (result.ok) {
      expect(applyPatch(base, result.hunks)).toEqual(["A", "b", "c", "D1", "D2", "e", "f"]);
    }
  });

  it("composes boundary-touching replacements (h1.end === h2.start)", () => {
    const a: Hunk[] = [{ start: 0, end: 2, lines: ["AB"] }];
    const b: Hunk[] = [{ start: 2, end: 3, lines: ["C"] }];
    const result = composeTextual(base, a, b);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(applyPatch(base, result.hunks)).toEqual(["AB", "C", "d", "e", "f"]);
    }
  });

  it("composes an insertion at a replacement's boundary", () => {
    const a: Hunk[] = [{ start: 2, end: 2, lines: ["ins"] }];
    const b: Hunk[] = [{ start: 2, end: 4, lines: ["CD"] }];
    const result = composeTextual(base, a, b);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(applyPatch(base, result.hunks)).toEqual(["a", "b", "ins", "CD", "e", "f"]);
    }
  });

  it("composes insertions at different points, including 0 and end", () => {
    const a: Hunk[] = [{ start: 0, end: 0, lines: ["top"] }];
    const b: Hunk[] = [{ start: 6, end: 6, lines: ["tail"] }];
    const result = composeTextual(base, a, b);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(applyPatch(base, result.hunks)).toEqual(["top", "a", "b", "c", "d", "e", "f", "tail"]);
    }
  });

  it("composed patch applied once equals sequential application (both orders)", () => {
    const a: Hunk[] = [
      { start: 0, end: 1, lines: [] }, // delete 'a'
      { start: 4, end: 4, lines: ["mid"] }, // insert before 'e'
    ];
    const b: Hunk[] = [
      { start: 2, end: 4, lines: ["CD"] },
      { start: 5, end: 6, lines: ["F1", "F2"] },
    ];
    const result = composeTextual(base, a, b);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const composed = applyPatch(base, result.hunks);
      expect(composed).toEqual(sequential(base, a, b));
      expect(composed).toEqual(sequential(base, b, a));
    }
  });

  it("composes with an empty patch (identity)", () => {
    const a: Hunk[] = [{ start: 1, end: 2, lines: ["B"] }];
    const result = composeTextual(base, a, []);
    expect(result).toEqual({ ok: true, hunks: a });
  });
});

describe("composeTextual — failure (Gate 1)", () => {
  it("returns ok:false for overlapping replacements", () => {
    const a: Hunk[] = [{ start: 1, end: 4, lines: ["X"] }];
    const b: Hunk[] = [{ start: 3, end: 5, lines: ["Y"] }];
    expect(composeTextual(base, a, b)).toEqual({ ok: false });
  });

  it("returns ok:false for identical footprints", () => {
    const a: Hunk[] = [{ start: 2, end: 3, lines: ["X"] }];
    const b: Hunk[] = [{ start: 2, end: 3, lines: ["Y"] }];
    expect(composeTextual(base, a, b)).toEqual({ ok: false });
  });

  it("returns ok:false for two insertions at the same point", () => {
    const a: Hunk[] = [{ start: 3, end: 3, lines: ["X"] }];
    const b: Hunk[] = [{ start: 3, end: 3, lines: ["Y"] }];
    expect(composeTextual(base, a, b)).toEqual({ ok: false });
  });

  it("returns ok:false for an insertion strictly inside a replacement", () => {
    const a: Hunk[] = [{ start: 2, end: 2, lines: ["X"] }];
    const b: Hunk[] = [{ start: 1, end: 4, lines: ["Y"] }];
    expect(composeTextual(base, a, b)).toEqual({ ok: false });
  });

  it("conflicts through merged footprints: insertion at the seam of adjacent hunks", () => {
    // a's two adjacent hunks merge into footprint [0,4). An insertion at 2
    // touches neither hunk's interior (boundary for both), but sits strictly
    // inside the merged span — Gate 1 rejects it.
    const a: Hunk[] = [
      { start: 0, end: 2, lines: ["x"] },
      { start: 2, end: 4, lines: ["y"] },
    ];
    const b: Hunk[] = [{ start: 2, end: 2, lines: ["seam"] }];
    expect(composeTextual(base, a, b)).toEqual({ ok: false });
  });

  it("throws (not ok:false) on malformed input", () => {
    expect(() => composeTextual(base, [{ start: 0, end: 99, lines: [] }], [])).toThrow();
  });
});
