/**
 * **A proposal is the minimum it changes** (SPEC §2.1 → why: R-147; issue
 * #144): `minimalHunks` trims what a hunk restates unchanged, splits it at an
 * unchanged run, and drops what changes nothing.
 */
import { describe, expect, it } from "vitest";
import { minimalHunks } from "../../src/text/minimal.js";
import { applyPatch, validateHunks } from "../../src/text/patch.js";
import { normalizeLines } from "../../src/text/diff.js";
import { stripAttestation } from "../../src/text/attest.js";
import type { Hunk } from "../../src/text/types.js";

const base = ["# Talks", "Ada:", "First paragraph.", "Second paragraph.", "Third paragraph.", "End."];

/** The trimmed patch applies to the same text the patch as sent did. */
function same(b: string[], hunks: Hunk[]): Hunk[] {
  const out = minimalHunks(b, hunks);
  validateHunks(b.length, out);
  expect(applyPatch(b, stripAttestation(out))).toEqual(applyPatch(b, hunks));
  return stripAttestation(out);
}

describe("minimalHunks (issue #144)", () => {
  it("trims unchanged lines at both ends", () => {
    expect(same(base, [{ start: 1, end: 4, lines: ["Ada:", "First, rewritten.", "Second paragraph."] }]))
      .toEqual([{ start: 2, end: 3, lines: ["First, rewritten."] }]);
  });

  it("splits a hunk at an unchanged run inside it", () => {
    expect(same(base, [{ start: 2, end: 5, lines: ["First, new.", "Second paragraph.", "Third, new."] }]))
      .toEqual([
        { start: 2, end: 3, lines: ["First, new."] },
        { start: 4, end: 5, lines: ["Third, new."] },
      ]);
  });

  it("trims to a deletion: the demo's four lines replaced by three", () => {
    // heading, speaker line and next paragraph restated; one paragraph gone
    expect(same(base, [{ start: 0, end: 4, lines: ["# Talks", "Ada:", "Second paragraph."] }]))
      .toEqual([{ start: 2, end: 3, lines: [] }]);
  });

  it("trims to an insertion", () => {
    expect(same(base, [{ start: 2, end: 3, lines: ["First paragraph.", "A new one."] }]))
      .toEqual([{ start: 3, end: 3, lines: ["A new one."] }]);
  });

  it("drops a hunk that changes nothing, and a patch of nothing is empty", () => {
    expect(minimalHunks(base, [{ start: 1, end: 3, lines: ["Ada:", "First paragraph."] }])).toEqual([]);
    expect(same(base, [
      { start: 0, end: 1, lines: ["# Talks"] },
      { start: 5, end: 6, lines: ["The end."] },
    ])).toEqual([{ start: 5, end: 6, lines: ["The end."] }]);
  });

  it("normalises every hunk of a multi-hunk patch on its own", () => {
    expect(same(base, [
      { start: 0, end: 2, lines: ["# Talks", "Ada Lovelace:"] },
      { start: 3, end: 6, lines: ["Second paragraph.", "Third, new.", "End."] },
    ])).toEqual([
      { start: 1, end: 2, lines: ["Ada Lovelace:"] },
      { start: 4, end: 5, lines: ["Third, new."] },
    ]);
  });

  it("is deterministic over repeated identical lines", () => {
    const b = ["x", "x", "x", "y"];
    const h: Hunk[] = [{ start: 0, end: 4, lines: ["x", "x", "y"] }];
    const one = same(b, h);
    expect(one).toHaveLength(1);
    expect(one[0]!.lines).toEqual([]);
    expect(one[0]!.end - one[0]!.start).toBe(1);
    expect(minimalHunks(b, h)).toEqual(minimalHunks(b, h));
  });

  it("sees a CRLF-normalised line as the line it is (Q1491)", () => {
    const lines = normalizeLines(["Ada:\r\nFirst, new."]);
    expect(same(base, [{ start: 1, end: 3, lines: [...lines] }]))
      .toEqual([{ start: 2, end: 3, lines: ["First, new."] }]);
  });

  it("merges two trimmed insertions at one point into one", () => {
    const out = same(base, [
      { start: 1, end: 2, lines: ["Ada:", "Inserted A."] },
      { start: 2, end: 2, lines: ["Inserted B."] },
    ]);
    expect(out).toEqual([{ start: 2, end: 2, lines: ["Inserted A.", "Inserted B."] }]);
  });

  it("attests what it returns against the base, and mutates nothing", () => {
    const h: Hunk[] = [{ start: 1, end: 4, lines: ["Ada:", "First, rewritten.", "Second paragraph."] }];
    const before = JSON.stringify(h);
    const out = minimalHunks(base, h);
    expect(out[0]!.was).toEqual(["First paragraph."]);
    expect(JSON.stringify(h)).toBe(before);
    const ins = minimalHunks(base, [{ start: 2, end: 3, lines: ["First paragraph.", "New."] }]);
    expect(ins[0]!.after).toBe("First paragraph.");
  });
});
