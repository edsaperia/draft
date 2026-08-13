import { describe, expect, it } from "vitest";
import type { Hunk } from "../../src/text/types.js";
import { applyPatch } from "../../src/text/patch.js";
import { rebaseHunks } from "../../src/text/rebase.js";

/** Tiny deterministic LCG (Numerical Recipes constants). */
function makeLcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe("rebaseHunks — shifts", () => {
  it("shifts a hunk after an adopted hunk by its line-count delta", () => {
    // Adopted grows [0,1) into 3 lines: delta +2.
    const result = rebaseHunks(
      [{ start: 3, end: 5, lines: ["X"] }],
      [{ start: 0, end: 1, lines: ["a1", "a2", "a3"] }],
    );
    expect(result).toEqual({ ok: true, hunks: [{ start: 5, end: 7, lines: ["X"] }] });
  });

  it("leaves a hunk before an adopted hunk unshifted", () => {
    const result = rebaseHunks(
      [{ start: 0, end: 1, lines: ["X"] }],
      [{ start: 3, end: 4, lines: [] }],
    );
    expect(result).toEqual({ ok: true, hunks: [{ start: 0, end: 1, lines: ["X"] }] });
  });

  it("shifts by a deletion's negative delta", () => {
    // Adopted deletes [1,3): delta -2.
    const result = rebaseHunks(
      [{ start: 4, end: 4, lines: ["ins"] }],
      [{ start: 1, end: 3, lines: [] }],
    );
    expect(result).toEqual({ ok: true, hunks: [{ start: 2, end: 2, lines: ["ins"] }] });
  });

  it("accumulates deltas from all adopted hunks strictly before", () => {
    const result = rebaseHunks(
      [{ start: 6, end: 7, lines: ["X"] }],
      [
        { start: 0, end: 1, lines: ["a", "b"] }, // +1
        { start: 2, end: 4, lines: [] }, // -2
        { start: 8, end: 9, lines: ["z", "z"] }, // after: ignored
      ],
    );
    expect(result).toEqual({ ok: true, hunks: [{ start: 5, end: 6, lines: ["X"] }] });
  });

  it("an adopted insertion at exactly hunk.start shifts the hunk", () => {
    const result = rebaseHunks(
      [{ start: 2, end: 4, lines: ["X"] }],
      [{ start: 2, end: 2, lines: ["ins"] }],
    );
    expect(result).toEqual({ ok: true, hunks: [{ start: 3, end: 5, lines: ["X"] }] });
  });

  it("an adopted insertion at hunk.end does not shift the hunk", () => {
    const result = rebaseHunks(
      [{ start: 2, end: 4, lines: ["X"] }],
      [{ start: 4, end: 4, lines: ["ins"] }],
    );
    expect(result).toEqual({ ok: true, hunks: [{ start: 2, end: 4, lines: ["X"] }] });
  });

  it("a candidate insertion at p is shifted by an adopted replacement ending at p", () => {
    // Adopted [0,2) -> 1 line: delta -1; candidate insertion at 2 moves to 1.
    const result = rebaseHunks(
      [{ start: 2, end: 2, lines: ["ins"] }],
      [{ start: 0, end: 2, lines: ["x"] }],
    );
    expect(result).toEqual({ ok: true, hunks: [{ start: 1, end: 1, lines: ["ins"] }] });
  });

  it("a candidate insertion at p is NOT shifted by an adopted replacement starting at p", () => {
    const result = rebaseHunks(
      [{ start: 2, end: 2, lines: ["ins"] }],
      [{ start: 2, end: 4, lines: ["x", "y", "z"] }],
    );
    expect(result).toEqual({ ok: true, hunks: [{ start: 2, end: 2, lines: ["ins"] }] });
  });

  it("returns hunks sorted by start", () => {
    const result = rebaseHunks(
      [
        { start: 6, end: 7, lines: ["B"] },
        { start: 0, end: 1, lines: ["A"] },
      ],
      [],
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.hunks.map((h) => h.start)).toEqual([0, 6]);
    }
  });

  it("rebased hunks land on the intended text", () => {
    const base = ["a", "b", "c", "d", "e"];
    const adopted: Hunk[] = [{ start: 0, end: 1, lines: ["A1", "A2"] }];
    const candidate: Hunk[] = [{ start: 3, end: 4, lines: ["D"] }];
    const result = rebaseHunks(candidate, adopted);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const merged = applyPatch(applyPatch(base, adopted), result.hunks);
      expect(merged).toEqual(["A1", "A2", "b", "c", "D", "e"]);
    }
  });
});

describe("rebaseHunks — conflicts", () => {
  it("overlapping replacement is a conflict", () => {
    const result = rebaseHunks(
      [{ start: 1, end: 3, lines: ["X"] }],
      [{ start: 2, end: 5, lines: ["Y"] }],
    );
    expect(result).toEqual({ ok: false, conflicts: [{ start: 2, end: 5 }] });
  });

  it("insertion vs insertion at the same point is a conflict", () => {
    const result = rebaseHunks(
      [{ start: 3, end: 3, lines: ["mine"] }],
      [{ start: 3, end: 3, lines: ["theirs"] }],
    );
    expect(result).toEqual({ ok: false, conflicts: [{ start: 3, end: 3 }] });
  });

  it("candidate insertion strictly inside an adopted replacement is a conflict", () => {
    const result = rebaseHunks(
      [{ start: 2, end: 2, lines: ["ins"] }],
      [{ start: 1, end: 4, lines: [] }],
    );
    expect(result).toEqual({ ok: false, conflicts: [{ start: 1, end: 4 }] });
  });

  it("boundary sharing is NOT a conflict", () => {
    const result = rebaseHunks(
      [{ start: 2, end: 4, lines: ["X"] }],
      [{ start: 0, end: 2, lines: ["Y"] }, { start: 4, end: 6, lines: ["Z"] }],
    );
    expect(result.ok).toBe(true);
  });

  it("collects ALL conflicting adopted spans, sorted and deduplicated", () => {
    // One candidate hunk conflicting with two adopted hunks.
    const result = rebaseHunks(
      [{ start: 1, end: 6, lines: ["wide"] }],
      [
        { start: 3, end: 4, lines: ["b"] },
        { start: 0, end: 2, lines: ["a"] },
        { start: 7, end: 8, lines: ["clean"] },
      ],
    );
    expect(result).toEqual({
      ok: false,
      conflicts: [
        { start: 0, end: 2 },
        { start: 3, end: 4 },
      ],
    });
  });

  it("reports conflicts from multiple candidate hunks", () => {
    const result = rebaseHunks(
      [
        { start: 0, end: 2, lines: ["A"] },
        { start: 5, end: 5, lines: ["B"] },
      ],
      [
        { start: 1, end: 3, lines: ["x"] },
        { start: 4, end: 6, lines: ["y"] },
      ],
    );
    expect(result).toEqual({
      ok: false,
      conflicts: [
        { start: 1, end: 3 },
        { start: 4, end: 6 },
      ],
    });
  });
});

describe("rebaseHunks — well-formedness property (randomized, fixed seed)", () => {
  it("applyPatch(applyPatch(base, adopted), rebased) never throws and matches the union", () => {
    const rand = makeLcg(0xc0ffee);
    for (let iter = 0; iter < 30; iter++) {
      const baseLen = 4 + Math.floor(rand() * 12);
      const base = Array.from({ length: baseLen }, (_, i) => `line${i}`);

      // Generate a mutually non-conflicting hunk set (each hunk separated
      // from the previous by at least one untouched line), then partition
      // it randomly into adopted vs candidate.
      const all: Hunk[] = [];
      let pos = Math.floor(rand() * 2);
      let counter = 0;
      while (pos <= baseLen) {
        const roll = rand();
        if (roll < 0.3) {
          all.push({ start: pos, end: pos, lines: [`ins${counter++}`] });
        } else if (roll < 0.75 && pos < baseLen) {
          const len = 1 + Math.floor(rand() * Math.min(3, baseLen - pos));
          const repl = rand() < 0.3 ? [] : [`rep${counter++}`, `rep${counter++}`].slice(0, 1 + Math.floor(rand() * 2));
          all.push({ start: pos, end: pos + len, lines: repl });
          pos += len;
        }
        pos += 1 + Math.floor(rand() * 3);
      }

      const adopted: Hunk[] = [];
      const candidate: Hunk[] = [];
      for (const h of all) {
        (rand() < 0.5 ? adopted : candidate).push(h);
      }

      const result = rebaseHunks(candidate, adopted);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;

      const afterAdopted = applyPatch(base, adopted);
      let merged: string[] = [];
      expect(() => {
        merged = applyPatch(afterAdopted, result.hunks);
      }).not.toThrow();

      // Stronger check: rebasing then applying equals applying the whole
      // non-conflicting set at once against the base.
      const union = all.slice().sort((a, b) => a.start - b.start || a.end - b.end);
      expect(merged).toEqual(applyPatch(base, union));
    }
  });
});
