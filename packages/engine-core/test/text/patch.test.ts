import { describe, expect, it } from "vitest";
import type { Span } from "../../src/text/types.js";
import {
  applyPatch,
  footprint,
  footprintsConflict,
  spansConflict,
  splitHunks,
  validateHunks,
} from "../../src/text/patch.js";

describe("validateHunks", () => {
  it("accepts an empty hunk set", () => {
    expect(() => validateHunks(5, [])).not.toThrow();
  });

  it("accepts sorted, disjoint hunks including boundary-touching ones", () => {
    expect(() =>
      validateHunks(10, [
        { start: 0, end: 2, lines: ["x"] },
        { start: 2, end: 4, lines: [] }, // touches previous boundary: allowed
        { start: 5, end: 5, lines: ["ins"] },
        { start: 5, end: 7, lines: ["y"] }, // insertion at its start boundary: allowed
      ]),
    ).not.toThrow();
  });

  it("rejects unsorted hunks", () => {
    expect(() =>
      validateHunks(10, [
        { start: 5, end: 6, lines: [] },
        { start: 2, end: 3, lines: [] },
      ]),
    ).toThrow(/sorted/);
  });

  it("rejects negative start", () => {
    expect(() => validateHunks(10, [{ start: -1, end: 0, lines: [] }])).toThrow(/out of range/);
  });

  it("rejects start > end", () => {
    expect(() => validateHunks(10, [{ start: 3, end: 2, lines: [] }])).toThrow(/out of range/);
  });

  it("rejects end beyond baseLength", () => {
    expect(() => validateHunks(3, [{ start: 1, end: 4, lines: [] }])).toThrow(/out of range/);
  });

  it("rejects non-integer bounds", () => {
    expect(() => validateHunks(10, [{ start: 0.5, end: 1, lines: [] }])).toThrow(/non-integer/);
  });

  it("rejects non-string lines", () => {
    expect(() =>
      validateHunks(10, [{ start: 0, end: 1, lines: [1 as unknown as string] }]),
    ).toThrow(/array of strings/);
  });

  it("rejects overlapping hunks", () => {
    expect(() =>
      validateHunks(10, [
        { start: 0, end: 3, lines: [] },
        { start: 2, end: 5, lines: [] },
      ]),
    ).toThrow(/overlap/);
  });

  it("rejects two insertions at the same point", () => {
    expect(() =>
      validateHunks(10, [
        { start: 4, end: 4, lines: ["a"] },
        { start: 4, end: 4, lines: ["b"] },
      ]),
    ).toThrow(/insertions at position 4/);
  });
});

describe("applyPatch", () => {
  const base = ["a", "b", "c", "d"];

  it("applies the empty patch as identity (new array)", () => {
    const out = applyPatch(base, []);
    expect(out).toEqual(base);
    expect(out).not.toBe(base);
  });

  it("inserts at position 0", () => {
    expect(applyPatch(base, [{ start: 0, end: 0, lines: ["top"] }])).toEqual(["top", "a", "b", "c", "d"]);
  });

  it("inserts at baseLength", () => {
    expect(applyPatch(base, [{ start: 4, end: 4, lines: ["tail"] }])).toEqual(["a", "b", "c", "d", "tail"]);
  });

  it("inserts into the empty document", () => {
    expect(applyPatch([], [{ start: 0, end: 0, lines: ["only"] }])).toEqual(["only"]);
  });

  it("replaces and deletes", () => {
    expect(applyPatch(base, [{ start: 1, end: 3, lines: ["X"] }])).toEqual(["a", "X", "d"]);
    expect(applyPatch(base, [{ start: 0, end: 4, lines: [] }])).toEqual([]);
  });

  it("applies multiple hunks with stable offsets (last-to-first)", () => {
    const out = applyPatch(base, [
      { start: 0, end: 1, lines: ["A", "A2"] },
      { start: 2, end: 2, lines: ["mid"] },
      { start: 3, end: 4, lines: [] },
    ]);
    expect(out).toEqual(["A", "A2", "b", "mid", "c"]);
  });

  it("does not mutate the base", () => {
    const copy = base.slice();
    applyPatch(base, [{ start: 1, end: 2, lines: ["X"] }]);
    expect(base).toEqual(copy);
  });

  it("throws on invalid hunk sets", () => {
    expect(() => applyPatch(base, [{ start: 2, end: 6, lines: [] }])).toThrow();
  });
});

describe("footprint", () => {
  it("returns one span per hunk when nothing is adjacent", () => {
    expect(
      footprint([
        { start: 0, end: 1, lines: [] },
        { start: 3, end: 5, lines: [] },
      ]),
    ).toEqual([
      { start: 0, end: 1 },
      { start: 3, end: 5 },
    ]);
  });

  it("merges adjacent non-empty spans", () => {
    expect(
      footprint([
        { start: 0, end: 2, lines: ["x"] },
        { start: 2, end: 4, lines: ["y"] },
        { start: 4, end: 5, lines: [] },
      ]),
    ).toEqual([{ start: 0, end: 5 }]);
  });

  it("keeps insertion (empty) spans separate from adjacent replacements", () => {
    expect(
      footprint([
        { start: 2, end: 2, lines: ["ins"] },
        { start: 2, end: 4, lines: ["x"] },
      ]),
    ).toEqual([
      { start: 2, end: 2 },
      { start: 2, end: 4 },
    ]);
    expect(
      footprint([
        { start: 0, end: 2, lines: ["x"] },
        { start: 2, end: 2, lines: ["ins"] },
      ]),
    ).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 2 },
    ]);
  });

  it("returns [] for the empty patch", () => {
    expect(footprint([])).toEqual([]);
  });
});

describe("spansConflict", () => {
  const ins = (p: number): Span => ({ start: p, end: p });
  const rep = (s: number, e: number): Span => ({ start: s, end: e });

  // Explicit truth table covering every boundary case of the semantics.
  const table: Array<[string, Span, Span, boolean]> = [
    // replacement vs replacement
    ["disjoint replacements", rep(0, 2), rep(3, 5), false],
    ["boundary-sharing replacements", rep(0, 2), rep(2, 4), false],
    ["overlapping replacements", rep(0, 3), rep(2, 5), true],
    ["identical replacements", rep(1, 3), rep(1, 3), true],
    ["nested replacements", rep(1, 5), rep(2, 3), true],
    ["single-line same replacements", rep(2, 3), rep(2, 3), true],
    // insertion vs replacement
    ["insertion strictly inside replacement", ins(2), rep(1, 4), true],
    ["insertion at replacement start (p === s)", ins(1), rep(1, 4), false],
    ["insertion at replacement end (p === e)", ins(4), rep(1, 4), false],
    ["insertion before replacement", ins(0), rep(1, 4), false],
    ["insertion after replacement", ins(5), rep(1, 4), false],
    ["insertion vs empty-adjacent single-line replacement", ins(2), rep(2, 3), false],
    // insertion vs insertion
    ["insertions at the same point", ins(3), ins(3), true],
    ["insertions at different points", ins(3), ins(4), false],
    ["insertions at adjacent points", ins(0), ins(1), false],
  ];

  it.each(table)("%s → %s", (_name, a, b, expected) => {
    expect(spansConflict(a, b)).toBe(expected);
    expect(spansConflict(b, a)).toBe(expected); // symmetric
  });
});

describe("footprintsConflict", () => {
  it("detects a conflict between any pair", () => {
    const a: Span[] = [
      { start: 0, end: 1 },
      { start: 5, end: 7 },
    ];
    const b: Span[] = [
      { start: 2, end: 3 },
      { start: 6, end: 8 },
    ];
    expect(footprintsConflict(a, b)).toBe(true);
  });

  it("returns false when no pair conflicts", () => {
    const a: Span[] = [
      { start: 0, end: 2 },
      { start: 4, end: 4 },
    ];
    const b: Span[] = [
      { start: 2, end: 4 },
      { start: 5, end: 6 },
    ];
    expect(footprintsConflict(a, b)).toBe(false);
    expect(footprintsConflict([], a)).toBe(false);
    expect(footprintsConflict(a, [])).toBe(false);
  });
});

describe("splitHunks", () => {
  it("partitions whole hunks by conflict with the given spans", () => {
    const hunks = [
      { start: 0, end: 2, lines: ["a"] },
      { start: 3, end: 3, lines: ["ins"] },
      { start: 5, end: 8, lines: ["b"] },
    ];
    const spans: Span[] = [
      { start: 1, end: 4 }, // conflicts with hunk 0 (overlap) and hunk 1 (ins strictly inside)
    ];
    const { inside, outside } = splitHunks(hunks, spans);
    expect(inside).toEqual([hunks[0], hunks[1]]);
    expect(outside).toEqual([hunks[2]]);
  });

  it("boundary-touching hunks stay outside", () => {
    const hunks = [{ start: 2, end: 4, lines: ["x"] }];
    const { inside, outside } = splitHunks(hunks, [{ start: 0, end: 2 }]);
    expect(inside).toEqual([]);
    expect(outside).toEqual(hunks);
  });

  it("empty spans list puts everything outside", () => {
    const hunks = [{ start: 0, end: 1, lines: [] }];
    expect(splitHunks(hunks, [])).toEqual({ inside: [], outside: hunks });
  });
});
