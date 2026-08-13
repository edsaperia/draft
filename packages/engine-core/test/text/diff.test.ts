import { describe, expect, it } from "vitest";
import { diffLines, joinLines, splitLines } from "../../src/text/diff.js";
import { applyPatch, validateHunks } from "../../src/text/patch.js";

/** Tiny deterministic LCG (Numerical Recipes constants). */
function makeLcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe("splitLines", () => {
  it("maps the empty string to zero lines (not [''])", () => {
    expect(splitLines("")).toEqual([]);
  });

  it("splits on \\n", () => {
    expect(splitLines("a\nb\nc")).toEqual(["a", "b", "c"]);
  });

  it("normalizes \\r\\n and bare \\r to \\n", () => {
    expect(splitLines("a\r\nb\rc\nd")).toEqual(["a", "b", "c", "d"]);
  });

  it("keeps a trailing empty line for a trailing newline", () => {
    expect(splitLines("a\n")).toEqual(["a", ""]);
  });

  it("maps a lone newline to two empty lines", () => {
    expect(splitLines("\n")).toEqual(["", ""]);
  });
});

describe("joinLines", () => {
  it("is the inverse of splitLines on LF-normalized text", () => {
    for (const text of ["", "a", "a\nb", "a\nb\n", "\n", "one\n\nthree"]) {
      expect(joinLines(splitLines(text))).toBe(text);
    }
  });

  it("joins with \\n", () => {
    expect(joinLines(["a", "b"])).toBe("a\nb");
    expect(joinLines([])).toBe("");
  });
});

describe("diffLines", () => {
  const check = (base: string[], target: string[]): void => {
    const hunks = diffLines(base, target);
    expect(() => validateHunks(base.length, hunks)).not.toThrow();
    expect(applyPatch(base, hunks)).toEqual(target);
  };

  it("returns no hunks for identical documents", () => {
    expect(diffLines(["a", "b", "c"], ["a", "b", "c"])).toEqual([]);
    expect(diffLines([], [])).toEqual([]);
  });

  it("pure insertion at start", () => {
    expect(diffLines(["b", "c"], ["a", "b", "c"])).toEqual([{ start: 0, end: 0, lines: ["a"] }]);
  });

  it("pure insertion in the middle", () => {
    expect(diffLines(["a", "c"], ["a", "b", "c"])).toEqual([{ start: 1, end: 1, lines: ["b"] }]);
  });

  it("pure insertion at end", () => {
    expect(diffLines(["a", "b"], ["a", "b", "c"])).toEqual([{ start: 2, end: 2, lines: ["c"] }]);
  });

  it("pure deletion at start", () => {
    expect(diffLines(["a", "b", "c"], ["b", "c"])).toEqual([{ start: 0, end: 1, lines: [] }]);
  });

  it("pure deletion in the middle", () => {
    expect(diffLines(["a", "b", "c"], ["a", "c"])).toEqual([{ start: 1, end: 2, lines: [] }]);
  });

  it("pure deletion at end", () => {
    expect(diffLines(["a", "b", "c"], ["a", "b"])).toEqual([{ start: 2, end: 3, lines: [] }]);
  });

  it("replacement in the middle", () => {
    expect(diffLines(["a", "b", "c"], ["a", "X", "c"])).toEqual([{ start: 1, end: 2, lines: ["X"] }]);
  });

  it("replacement at start and end round-trips", () => {
    check(["a", "b", "c", "d"], ["X", "b", "c", "Y"]);
  });

  it("empty base yields one insertion hunk", () => {
    expect(diffLines([], ["a", "b"])).toEqual([{ start: 0, end: 0, lines: ["a", "b"] }]);
  });

  it("empty target yields one deletion hunk", () => {
    expect(diffLines(["a", "b"], [])).toEqual([{ start: 0, end: 2, lines: [] }]);
  });

  it("merges adjacent change regions into single hunks", () => {
    // Delete 'b' and insert 'X' at the same site: one hunk, not two.
    const hunks = diffLines(["a", "b", "c"], ["a", "X", "Y", "c"]);
    expect(hunks).toHaveLength(1);
    expect(applyPatch(["a", "b", "c"], hunks)).toEqual(["a", "X", "Y", "c"]);
  });

  it("separates hunks by at least one unchanged line", () => {
    const base = ["a", "b", "c", "d", "e"];
    const target = ["X", "b", "Y", "d", "Z"];
    const hunks = diffLines(base, target);
    expect(hunks).toHaveLength(3);
    for (let i = 1; i < hunks.length; i++) {
      expect(hunks[i]!.start).toBeGreaterThan(hunks[i - 1]!.end);
    }
    expect(applyPatch(base, hunks)).toEqual(target);
  });

  it("is deterministic", () => {
    const base = ["a", "b", "c", "a", "b"];
    const target = ["b", "c", "a", "c"];
    expect(diffLines(base, target)).toEqual(diffLines(base, target));
  });

  it("round-trips on a battery of randomized cases (fixed seed)", () => {
    const rand = makeLcg(0xdecafbad);
    const alphabet = ["alpha", "beta", "gamma", "delta", "", "epsilon"];
    const randomDoc = (maxLen: number): string[] => {
      const len = Math.floor(rand() * (maxLen + 1));
      return Array.from({ length: len }, () => alphabet[Math.floor(rand() * alphabet.length)]!);
    };

    for (let i = 0; i < 20; i++) {
      const base = randomDoc(12);
      // Half the cases: independent target. Other half: mutated base, so
      // the documents share long common runs.
      let target: string[];
      if (i % 2 === 0) {
        target = randomDoc(12);
      } else {
        target = base.slice();
        const edits = 1 + Math.floor(rand() * 4);
        for (let e = 0; e < edits; e++) {
          const pos = Math.floor(rand() * (target.length + 1));
          const roll = rand();
          if (roll < 0.34 && pos < target.length) {
            target.splice(pos, 1); // delete
          } else if (roll < 0.67 && pos < target.length) {
            target[pos] = alphabet[Math.floor(rand() * alphabet.length)]!; // replace
          } else {
            target.splice(pos, 0, alphabet[Math.floor(rand() * alphabet.length)]!); // insert
          }
        }
      }
      check(base, target);
    }
  });
});
