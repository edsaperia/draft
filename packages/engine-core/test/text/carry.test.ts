import { describe, expect, it } from 'vitest';
import type { Hunk } from '../../src/text/types.js';
import { applyPatch } from '../../src/text/patch.js';
import { carryHunks } from '../../src/text/rebase.js';

/**
 * **§2.4's three roads** (SPEC v0.141, Ed 2026-09-24, Q1534 → why: R-141):
 * a live patch the text changed under is **rebased** where it touches none of
 * the changed lines, **re-aimed** where it covers them — every hunk of the
 * change inside one of its own, so the document it makes is the document it
 * made — and **stranded** where it touches them without covering them. One
 * case per row of the proposal's table (§2), and for every re-aim the proof
 * the rule is named for: the same document from either side of the change.
 */

const BASE = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];

const h = (start: number, end: number, ...lines: string[]): Hunk => ({ start, end, lines });

/** The re-aimed patch, applied to the changed text, makes what the patch made from the old. */
function sameDocument(patch: Hunk[], change: Hunk[], reaimed: Hunk[]): void {
  expect(applyPatch(applyPatch(BASE, change), reaimed)).toEqual(applyPatch(BASE, patch));
}

describe('carryHunks — rebased (touches none of the changed lines)', () => {
  it('a patch below the change moves by its growth, words unchanged', () => {
    const r = carryHunks([h(4, 5, 'X')], [h(1, 2, 'a', 'b')], BASE);
    expect(r).toEqual({ road: 'rebased', hunks: [h(5, 6, 'X')] });
  });

  it('the chain case: a patch sharing only a boundary with the change is rebased', () => {
    const r = carryHunks([h(2, 3, 'X')], [h(1, 2, 'W')], BASE);
    expect(r).toEqual({ road: 'rebased', hunks: [h(2, 3, 'X')] });
  });
});

describe('carryHunks — re-aimed (covers the change)', () => {
  it('the ordinary contested clause: the same line, one hunk each', () => {
    const patch = [h(2, 3, 'X')];
    const change = [h(2, 3, 'W')];
    const r = carryHunks(patch, change, BASE);
    expect(r).toEqual({ road: 'reaimed', hunks: [h(2, 3, 'X')] });
    sameDocument(patch, change, [h(2, 3, 'X')]);
  });

  it('the winner grows the line: the re-aimed hunk replaces all of what it put there', () => {
    const patch = [h(2, 3, 'X')];
    const change = [h(2, 3, 'W1', 'W2', 'W3')];
    const r = carryHunks(patch, change, BASE);
    expect(r).toEqual({ road: 'reaimed', hunks: [h(2, 5, 'X')] });
    sameDocument(patch, change, [h(2, 5, 'X')]);
  });

  it('the same footprint, several hunks each at the same places', () => {
    const patch = [h(1, 2, 'X1'), h(4, 5, 'X4')];
    const change = [h(1, 2), h(4, 5, 'W4', 'W4b')];
    const r = carryHunks(patch, change, BASE);
    expect(r.road).toBe('reaimed');
    if (r.road !== 'reaimed') return;
    // the deletion above takes a line away; the growth at 4 widens the hunk
    expect(r.hunks).toEqual([h(1, 1, 'X1'), h(3, 5, 'X4')]);
    sameDocument(patch, change, r.hunks);
  });

  it('a patch spanning the winner’s lines and more (3–5 over 4)', () => {
    const patch = [h(3, 6, 'X')];
    const change = [h(4, 5, 'W', 'W')];
    const r = carryHunks(patch, change, BASE);
    expect(r).toEqual({ road: 'reaimed', hunks: [h(3, 7, 'X')] });
    sameDocument(patch, change, [h(3, 7, 'X')]);
  });

  it('an insertion at the same gap becomes a replacement of the inserted lines', () => {
    const patch = [h(3, 3, 'X')];
    const change = [h(3, 3, 'W1', 'W2')];
    const r = carryHunks(patch, change, BASE);
    expect(r).toEqual({ road: 'reaimed', hunks: [h(3, 5, 'X')] });
    sameDocument(patch, change, [h(3, 5, 'X')]);
  });

  it('a replacement covers an insertion strictly inside it', () => {
    const patch = [h(1, 4, 'X')];
    const change = [h(2, 2, 'W')];
    const r = carryHunks(patch, change, BASE);
    expect(r).toEqual({ road: 'reaimed', hunks: [h(1, 5, 'X')] });
    sameDocument(patch, change, [h(1, 5, 'X')]);
  });

  it('a composed candidate A+B covers A: A+B against the current text is the lattice’s next step', () => {
    const patch = [h(1, 2, 'A'), h(4, 5, 'B')]; // A+B
    const change = [h(1, 2, 'A')];              // A
    const r = carryHunks(patch, change, BASE);
    expect(r).toEqual({ road: 'reaimed', hunks: [h(1, 2, 'A'), h(4, 5, 'B')] });
    sameDocument(patch, change, r.road === 'reaimed' ? r.hunks : []);
  });

  it('a run over several blocks is one hunk and takes the same test (Q1418)', () => {
    const patch = [h(1, 4, 'X1', 'X2')];
    const change = [h(1, 4, 'W')];
    const r = carryHunks(patch, change, BASE);
    expect(r).toEqual({ road: 'reaimed', hunks: [h(1, 2, 'X1', 'X2')] });
  });

  it('a change above the covered hunk shifts it, as a rebase would', () => {
    const patch = [h(4, 5, 'X')];
    const change = [h(0, 0, 'top'), h(4, 5, 'W')];
    // the insertion at 0 is not inside X, so this is not covered…
    expect(carryHunks(patch, change, BASE).road).toBe('stranded');
    // …while a patch whose other hunk takes the top in covers both
    const both = [h(0, 1, 'T'), h(4, 5, 'X')];
    const r = carryHunks(both, [h(0, 1, 't1', 't2'), h(4, 5, 'W')], BASE);
    expect(r).toEqual({ road: 'reaimed', hunks: [h(0, 2, 'T'), h(5, 6, 'X')] });
  });
});

describe('carryHunks — stranded (touches without covering)', () => {
  it('a patch inside the winner’s span (4 inside 3–5)', () => {
    const r = carryHunks([h(4, 5, 'X')], [h(3, 6, 'W')], BASE);
    expect(r).toEqual({ road: 'stranded', conflicts: [{ start: 3, end: 6 }] });
  });

  it('a patch covering only one of the winner’s several hunks', () => {
    const r = carryHunks([h(1, 2, 'X')], [h(1, 2, 'W1'), h(4, 5, 'W4')], BASE);
    expect(r.road).toBe('stranded');
  });

  it('an insertion inside the lines the winner replaced covers nothing', () => {
    const r = carryHunks([h(2, 2, 'X')], [h(1, 4, 'W')], BASE);
    expect(r.road).toBe('stranded');
  });

  it('a partial overlap either way strands', () => {
    expect(carryHunks([h(1, 3, 'X')], [h(2, 4, 'W')], BASE).road).toBe('stranded');
    expect(carryHunks([h(2, 4, 'X')], [h(1, 3, 'W')], BASE).road).toBe('stranded');
  });
});

describe('carryHunks — the re-aim is a claim about documents, and holds on random patches', () => {
  /** Tiny deterministic LCG, as rebase.test.ts's. */
  function makeLcg(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 2 ** 32;
    };
  }
  /** A random valid hunk set against BASE: sorted, non-overlapping, no twin insertions. */
  function randomHunks(rnd: () => number, tag: string): Hunk[] {
    const out: Hunk[] = [];
    let at = 0;
    while (at <= BASE.length && out.length < 3) {
      const start = at + Math.floor(rnd() * 3);
      if (start > BASE.length) break;
      const end = Math.min(BASE.length, start + Math.floor(rnd() * 3));
      const n = Math.floor(rnd() * 3);
      const last = out[out.length - 1];
      if (start === end && last && last.start === last.end && last.start === start) break;
      out.push({ start, end, lines: Array.from({ length: n }, (_, i) => `${tag}${start}.${i}`) });
      at = end + (start === end ? 1 : 0);
    }
    return out.length ? out : [{ start: 0, end: 1, lines: [`${tag}0`] }];
  }

  it('every re-aim, over 4000 random pairs, makes exactly the document the patch made', () => {
    const rnd = makeLcg(1534);
    let reaimed = 0;
    for (let i = 0; i < 4000; i++) {
      const patch = randomHunks(rnd, 'x');
      const change = randomHunks(rnd, 'w');
      const r = carryHunks(patch, change, BASE);
      if (r.road !== 'reaimed') continue;
      reaimed++;
      sameDocument(patch, change, r.hunks);
    }
    expect(reaimed).toBeGreaterThan(50);
  });
});
