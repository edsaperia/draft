import { describe, expect, it } from 'vitest';
import { fitDavidson } from '../../src/ranking/davidson.js';
import type { Comparison, Outcome } from '../../src/ranking/types.js';

/** k copies of the comparison a-vs-b with the given outcome. */
function rep(a: string, b: string, outcome: Outcome, k: number): Comparison[] {
  return Array.from({ length: k }, () => ({ a, b, outcome }));
}

describe('fitDavidson', () => {
  it('symmetry: equal head-to-head record gives equal strengths and probBeats 0.5', () => {
    const fit = fitDavidson(
      ['A', 'B'],
      [...rep('A', 'B', 'a', 5), ...rep('A', 'B', 'b', 5)],
    );
    const sA = fit.strengths.get('A')!;
    const sB = fit.strengths.get('B')!;
    expect(Math.abs(sA - sB)).toBeLessThan(1e-6);
    expect(fit.probBeats('A', 'B')).toBeCloseTo(0.5, 6);
    expect(fit.probBeats('B', 'A')).toBeCloseTo(0.5, 6);
  });

  it('dominance: probBeats grows with evidence volume', () => {
    const p3 = fitDavidson(['A', 'B'], rep('A', 'B', 'a', 3)).probBeats('A', 'B');
    const p10 = fitDavidson(['A', 'B'], rep('A', 'B', 'a', 10)).probBeats('A', 'B');
    const p30 = fitDavidson(['A', 'B'], rep('A', 'B', 'a', 30)).probBeats('A', 'B');
    expect(p10).toBeGreaterThan(0.9);
    expect(p30).toBeGreaterThan(p10);
    // Uncertainty scales with data: 3-0 sits well below the 30-0 value.
    expect(p3).toBeLessThan(p10);
    expect(p30 - p3).toBeGreaterThan(0.05);
  });

  it('all ties: probBeats 0.5 and fitted nu large', () => {
    const fit = fitDavidson(['A', 'B'], rep('A', 'B', 'tie', 10));
    expect(fit.probBeats('A', 'B')).toBeCloseTo(0.5, 6);
    expect(fit.nu).toBeGreaterThan(1);
  });

  it('zero ties in mixed data: fitted nu collapses toward 0', () => {
    const fit = fitDavidson(
      ['A', 'B'],
      [...rep('A', 'B', 'a', 100), ...rep('A', 'B', 'b', 100)],
    );
    expect(fit.nu).toBeLessThan(0.05);
    expect(fit.nu).toBeGreaterThan(0);
  });

  it('fixed nu is respected verbatim', () => {
    const fit = fitDavidson(
      ['A', 'B'],
      [...rep('A', 'B', 'a', 4), ...rep('A', 'B', 'tie', 2)],
      { nu: 0.5 },
    );
    expect(fit.nu).toBe(0.5);
  });

  it('two-player closed form: with nu = 0 and near-flat prior, strength diff = ln(w/l)', () => {
    const w = 8;
    const l = 2;
    const fit = fitDavidson(
      ['A', 'B'],
      [...rep('A', 'B', 'a', w), ...rep('A', 'B', 'b', l)],
      { nu: 0, priorSigma: 50 },
    );
    const diff = fit.strengths.get('A')! - fit.strengths.get('B')!;
    expect(Math.abs(diff - Math.log(w / l))).toBeLessThan(1e-3);
  });

  it('transitivity: A>B and B>C order strengths and give probBeats(A,C) > 0.5 with no direct data', () => {
    const fit = fitDavidson(
      ['A', 'B', 'C'],
      [
        ...rep('A', 'B', 'a', 8),
        ...rep('A', 'B', 'b', 2),
        ...rep('B', 'C', 'a', 8),
        ...rep('B', 'C', 'b', 2),
      ],
    );
    const sA = fit.strengths.get('A')!;
    const sB = fit.strengths.get('B')!;
    const sC = fit.strengths.get('C')!;
    expect(sA).toBeGreaterThan(sB);
    expect(sB).toBeGreaterThan(sC);
    expect(fit.probBeats('A', 'C')).toBeGreaterThan(0.5);
  });

  it('varDiff decreases monotonically as identical evidence is duplicated', () => {
    const base: Comparison[] = [
      ...rep('A', 'B', 'a', 3),
      ...rep('A', 'B', 'b', 1),
      ...rep('A', 'B', 'tie', 1),
    ];
    const vd = (times: number): number => {
      const data: Comparison[] = [];
      for (let t = 0; t < times; t++) data.push(...base);
      return fitDavidson(['A', 'B'], data, { nu: 0.5 }).varDiff('A', 'B');
    };
    const v1 = vd(1);
    const v2 = vd(2);
    const v4 = vd(4);
    expect(v2).toBeLessThan(v1);
    expect(v4).toBeLessThan(v2);
  });

  it('centering: strengths sum to 0 and varDiff matches the returned cov exactly', () => {
    const fit = fitDavidson(
      ['A', 'B', 'C'],
      [
        ...rep('A', 'B', 'a', 6),
        ...rep('A', 'B', 'b', 2),
        ...rep('B', 'C', 'a', 5),
        ...rep('B', 'C', 'tie', 2),
        ...rep('A', 'C', 'a', 4),
      ],
      { priorSigma: 2 },
    );
    let sum = 0;
    for (const s of fit.strengths.values()) sum += s;
    expect(Math.abs(sum)).toBeLessThan(1e-9);

    // varDiff(i,j) must equal C_ii + C_jj - 2*C_ij from the returned
    // (centered) covariance — the quantity is invariant to centering.
    for (let a = 0; a < fit.ids.length; a++) {
      for (let b = 0; b < fit.ids.length; b++) {
        const fromCov = fit.cov[a]![a]! + fit.cov[b]![b]! - 2 * fit.cov[a]![b]!;
        expect(Math.abs(fit.varDiff(fit.ids[a]!, fit.ids[b]!) - fromCov)).toBeLessThan(1e-12);
      }
    }
  });

  it('determinism: identical calls give identical results', () => {
    const data: Comparison[] = [
      ...rep('A', 'B', 'a', 7),
      ...rep('A', 'B', 'b', 3),
      ...rep('B', 'C', 'tie', 2),
      ...rep('A', 'C', 'a', 4),
      ...rep('A', 'C', 'b', 1),
    ];
    const snapshot = (f: ReturnType<typeof fitDavidson>): string =>
      JSON.stringify({
        ids: f.ids,
        strengths: [...f.strengths.entries()],
        nu: f.nu,
        cov: f.cov,
        pb: f.probBeats('A', 'C'),
        wp: f.winProb('A', 'C'),
        vd: f.varDiff('A', 'C'),
      });
    const one = snapshot(fitDavidson(['A', 'B', 'C'], data));
    const two = snapshot(fitDavidson(['A', 'B', 'C'], data));
    expect(one === two).toBe(true);
  });

  it('uncompared member: prior keeps it at 0 and plausible against a strong winner', () => {
    const fit = fitDavidson(['A', 'B', 'C'], rep('A', 'B', 'a', 10));
    expect(Math.abs(fit.strengths.get('C')!)).toBeLessThan(1e-6);
    const p = fit.probBeats('C', 'A');
    expect(p).toBeLessThan(0.5);
    expect(p).toBeGreaterThan(0.01);
  });

  it('zero comparisons overall: all strengths 0, probBeats 0.5', () => {
    const fit = fitDavidson(['A', 'B', 'C'], []);
    for (const id of fit.ids) expect(fit.strengths.get(id)).toBeCloseTo(0, 9);
    expect(fit.probBeats('A', 'B')).toBeCloseTo(0.5, 6);
    // Uncompared pair: posterior variance of the difference is ~2*sigma^2.
    expect(fit.varDiff('A', 'B')).toBeGreaterThan(1);
  });

  it('single id: fits without error', () => {
    const fit = fitDavidson(['A'], []);
    expect(fit.strengths.get('A')).toBe(0);
    expect(fit.probBeats('A', 'A')).toBe(0.5);
    expect(fit.varDiff('A', 'A')).toBe(0);
  });

  it('error: comparison referencing an unknown id throws', () => {
    expect(() => fitDavidson(['A', 'B'], [{ a: 'A', b: 'Z', outcome: 'a' }])).toThrow(
      /unknown id/i,
    );
    expect(() => fitDavidson(['A', 'B'], [{ a: 'Z', b: 'B', outcome: 'b' }])).toThrow(
      /unknown id/i,
    );
  });

  it('error: duplicate ids throw', () => {
    expect(() => fitDavidson(['A', 'B', 'A'], [])).toThrow(/duplicate id/i);
  });
});
