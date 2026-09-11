/**
 * The span walk behind a sealed record's `at` (Q1333): a span decided in one
 * version's coordinates, carried through the hunks of every later version
 * step to the current text. The HTTP half — three adoptions over a real
 * document — is in server.test.ts; this file pins the rule per hunk.
 */
import { describe, expect, it } from 'vitest';
import { adoptedSpan, shiftSpan, spanNow } from '../src/record-spans.js';

const ins = (at: number, n: number) => ({ start: at, end: at, lines: Array.from({ length: n }, (_, i) => `i${i}`) });
const del = (start: number, end: number) => ({ start, end, lines: [] });
const rep = (start: number, end: number, n: number) => ({ start, end, lines: Array.from({ length: n }, (_, i) => `r${i}`) });

describe('shiftSpan — one version step over a span', () => {
  it('a hunk wholly before the span shifts it by the hunk’s growth', () => {
    expect(shiftSpan({ start: 5, end: 6 }, [ins(2, 2)])).toEqual({ start: 7, end: 8 });
    expect(shiftSpan({ start: 5, end: 6 }, [del(0, 3)])).toEqual({ start: 2, end: 3 });
    expect(shiftSpan({ start: 5, end: 6 }, [rep(1, 2, 1)])).toEqual({ start: 5, end: 6 });
  });
  it('an insertion at the span’s own start pushes the span down; one at its end leaves it', () => {
    expect(shiftSpan({ start: 5, end: 6 }, [ins(5, 1)])).toEqual({ start: 6, end: 7 });
    expect(shiftSpan({ start: 5, end: 6 }, [ins(6, 1)])).toEqual({ start: 5, end: 6 });
  });
  it('a hunk wholly after the span leaves it alone', () => {
    expect(shiftSpan({ start: 5, end: 6 }, [rep(8, 9, 3)])).toEqual({ start: 5, end: 6 });
    expect(shiftSpan({ start: 5, end: 6 }, [del(6, 9)])).toEqual({ start: 5, end: 6 });
  });
  it('a clause changed again stands on its replacement', () => {
    expect(shiftSpan({ start: 5, end: 6 }, [rep(5, 6, 1)])).toEqual({ start: 5, end: 6 });
    expect(shiftSpan({ start: 5, end: 6 }, [rep(5, 6, 3)])).toEqual({ start: 5, end: 8 });
    // a wider replacement swallowing the clause: the record stands on the whole replacement
    expect(shiftSpan({ start: 5, end: 6 }, [rep(4, 7, 2)])).toEqual({ start: 4, end: 6 });
  });
  it('a clause deleted stands on the gap where it stood', () => {
    expect(shiftSpan({ start: 5, end: 6 }, [del(5, 6)])).toEqual({ start: 5, end: 5 });
    expect(shiftSpan({ start: 5, end: 7 }, [del(4, 8)])).toEqual({ start: 4, end: 4 });
  });
  it('a hunk overlapping one edge keeps what survives beside the replacement', () => {
    // lines 5–6 stood; 6–8 replaced by one line: line 5 survives, the replacement follows it
    expect(shiftSpan({ start: 5, end: 7 }, [rep(6, 9, 1)])).toEqual({ start: 5, end: 7 });
    // 3–6 replaced by two lines: the replacement, then the surviving line 6
    expect(shiftSpan({ start: 5, end: 7 }, [rep(3, 6, 2)])).toEqual({ start: 3, end: 6 });
  });
  it('several hunks in one step apply highest first, each in the step’s own coordinates', () => {
    // an insertion above and a replacement below, one step: the span moves for the first only
    expect(shiftSpan({ start: 5, end: 6 }, [ins(1, 2), rep(9, 10, 4)])).toEqual({ start: 7, end: 8 });
    // both above: the shifts add
    expect(shiftSpan({ start: 5, end: 6 }, [ins(1, 2), ins(3, 1)])).toEqual({ start: 8, end: 9 });
  });
  it('a gap span moves with the text and folds into a replacement that spans it', () => {
    expect(shiftSpan({ start: 5, end: 5 }, [ins(2, 1)])).toEqual({ start: 6, end: 6 });
    expect(shiftSpan({ start: 5, end: 5 }, [rep(4, 7, 1)])).toEqual({ start: 4, end: 5 });
  });
});

describe('adoptedSpan — the lines the winner put there', () => {
  it('a rewrite stands on its replacement, an insertion on the lines it inserted, a deletion on its gap', () => {
    expect(adoptedSpan({ start: 1, end: 2 }, [rep(1, 2, 1)])).toEqual({ start: 1, end: 2 });
    expect(adoptedSpan({ start: 1, end: 2 }, [rep(1, 2, 3)])).toEqual({ start: 1, end: 4 });
    expect(adoptedSpan({ start: 0, end: 0 }, [ins(0, 2)])).toEqual({ start: 0, end: 2 });
    expect(adoptedSpan({ start: 3, end: 4 }, [del(3, 4)])).toEqual({ start: 3, end: 3 });
  });
  it('a field wider than the winner keeps the survivors beside the replacement', () => {
    // a rival touched lines 3–5, the winner rewrote line 3 alone: lines 4–5 survive
    expect(adoptedSpan({ start: 3, end: 5 }, [rep(3, 4, 2)])).toEqual({ start: 3, end: 6 });
  });
});

describe('spanNow — the steps after the record’s version, in order', () => {
  const steps = [
    { v: 1, hunks: [rep(1, 2, 1)] },   // the record's own adoption: line 1 rewritten
    { v: 2, hunks: [ins(0, 2)] },      // two lines inserted above
    { v: 3, hunks: [del(3, 4)] },      // the rewritten clause deleted
  ];
  it('applies only the steps above the record’s version', () => {
    expect(spanNow({ start: 1, end: 2 }, 0, steps.slice(0, 1))).toEqual({ start: 1, end: 2 });
    expect(spanNow({ start: 1, end: 2 }, 0, steps.slice(0, 2))).toEqual({ start: 3, end: 4 });
    expect(spanNow({ start: 1, end: 2 }, 0, steps)).toEqual({ start: 3, end: 3 });
    // a record decided against version 2 is untouched by steps 1 and 2
    expect(spanNow({ start: 3, end: 4 }, 2, steps)).toEqual({ start: 3, end: 3 });
  });
});
