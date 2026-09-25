import { describe, expect, it } from 'vitest';
import { smithSet } from '../src/ranking/smith.js';

/**
 * **The Smith set, alone** (SPEC §4.2 → why: R-143; Q1539). `smithSet` knows
 * nothing of the engine: nodes and one edge function, *x reaches y in one
 * step*. The engine hands it a measured result x did not lose as an edge, so
 * an unmeasured pair is a gap (ruling 2); at the close, an unmeasured pair is
 * level, an edge each way. These are the shapes that matter to it.
 */

/** Edges from a list of `[from, to]` pairs. */
const edges = (list: Array<[string, string]>) => (x: string, y: string): boolean =>
  list.some(([a, b]) => a === x && b === y);

/** A complete table from wins: `beats` lists `[winner, loser]`, anything else level. */
const table = (nodes: string[], beats: Array<[string, string]>) => (x: string, y: string): boolean =>
  nodes.includes(x) && nodes.includes(y) && !beats.some(([w, l]) => w === y && l === x);

describe('smithSet', () => {
  it('a Condorcet winner is the set alone', () => {
    const nodes = ['cur', 'X', 'Y'];
    // the clone field: the current text beats X and Y, X beats Y
    expect(smithSet(nodes, table(nodes, [['cur', 'X'], ['cur', 'Y'], ['X', 'Y']]))).toEqual(['cur']);
  });

  it('a cycle is the set whole', () => {
    const nodes = ['cur', 'X', 'Y'];
    expect(smithSet(nodes, table(nodes, [['cur', 'X'], ['X', 'Y'], ['Y', 'cur']])))
      .toEqual(['cur', 'X', 'Y']);
  });

  it('a level pair joins both to the set', () => {
    const nodes = ['cur', 'X', 'Y'];
    // X and Y level, both beat the current text
    expect(smithSet(nodes, table(nodes, [['X', 'cur'], ['Y', 'cur']]))).toEqual(['X', 'Y']);
  });

  it('a gap is a result for neither: the clone field with {cur, Y} unasked is {cur}', () => {
    // plan §4.3: cur → X → Y measured, cur–Y never asked. Read as a draw, Y and
    // X would both join cur's set and the fit would pick X; read as a gap,
    // nothing reaches cur, so only cur reaches everything
    expect(smithSet(['cur', 'X', 'Y'], edges([['cur', 'X'], ['X', 'Y']]))).toEqual(['cur']);
  });

  it('with too much unmeasured, nothing reaches everything and the set is empty', () => {
    expect(smithSet(['cur', 'X', 'Y'], edges([['X', 'cur'], ['Y', 'cur']]))).toEqual([]);
    expect(smithSet(['cur', 'X'], edges([]))).toEqual([]);
  });

  it('a chain counts: a node reaching everything through others is in', () => {
    // L beaten by R, L beats the current text, the current text beats R: a
    // three-cycle through a measured chain, every node reaching every other
    expect(smithSet(['L', 'R', 'cur'], edges([['R', 'L'], ['L', 'cur'], ['cur', 'R']])))
      .toEqual(['L', 'R', 'cur']);
  });

  it('one node is its own set, and no nodes is none', () => {
    expect(smithSet(['cur'], edges([]))).toEqual(['cur']);
    expect(smithSet([], edges([]))).toEqual([]);
  });
});
