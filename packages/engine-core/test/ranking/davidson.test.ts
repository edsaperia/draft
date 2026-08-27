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

/**
 * The convergence signal, and the branches that had no test (entry 77, the
 * alpha-readiness pass).
 *
 * The optimiser had three exits — tolerance met, no ascent direction, the
 * iteration cap — and the caller could not tell them apart, so a fit that ran
 * out of iterations with the gradient still moving produced the same
 * `probBeats` numbers an adoption decision is taken off, indistinguishable
 * from a healthy one. `stop` names the exit, `iterations` counts the steps,
 * `gradMax` is measured at the point returned and `converged` is
 * `gradMax < tolerance` — a fact about the answer, not about the road to it.
 *
 * What the engine should *do* about a non-converged fit near an adoption is
 * Q945 and deliberately not decided here: nothing in `session.ts` reads these
 * fields yet.
 */
describe('fitDavidson: convergence signal', () => {
  /** Ordinary data, well inside every default. */
  const ordinary: Comparison[] = [
    ...rep('A', 'B', 'a', 6), ...rep('A', 'B', 'b', 2),
    ...rep('B', 'C', 'a', 5), ...rep('B', 'C', 'tie', 2),
    ...rep('A', 'C', 'a', 4),
  ];

  it('an ordinary fit stops on tolerance, converged, in a handful of steps', () => {
    const fit = fitDavidson(['A', 'B', 'C'], ordinary);
    expect(fit.stop).toBe('tolerance');
    expect(fit.converged).toBe(true);
    expect(fit.gradMax).toBeLessThan(1e-9);
    expect(fit.iterations).toBeGreaterThan(0);
    expect(fit.iterations).toBeLessThan(20);
  });

  it('opts.maxIterations: the cap is honoured and reported, and is not convergence', () => {
    const fit = fitDavidson(['A', 'B', 'C'], ordinary, { maxIterations: 1 });
    expect(fit.iterations).toBe(1);
    expect(fit.stop).toBe('max-iterations');
    expect(fit.converged).toBe(false);
    expect(fit.gradMax).toBeGreaterThan(1e-9);
    // and it still answers: a truncated fit is wrong, never broken
    for (const id of fit.ids) expect(Number.isFinite(fit.strengths.get(id)!)).toBe(true);
    expect(fit.probBeats('A', 'C')).toBeGreaterThan(0.5);
  });

  it('maxIterations 0: no step is taken at all and it says so', () => {
    const fit = fitDavidson(['A', 'B', 'C'], ordinary, { maxIterations: 0 });
    expect(fit.iterations).toBe(0);
    expect(fit.stop).toBe('max-iterations');
    expect(fit.converged).toBe(false);
    for (const id of fit.ids) expect(fit.strengths.get(id)).toBeCloseTo(0, 12);
  });

  it('opts.tolerance: a loose tolerance stops earlier and still calls itself converged', () => {
    const loose = fitDavidson(['A', 'B', 'C'], ordinary, { tolerance: 0.5 });
    const tight = fitDavidson(['A', 'B', 'C'], ordinary, { tolerance: 1e-12 });
    expect(loose.stop).toBe('tolerance');
    expect(loose.converged).toBe(true);
    expect(loose.gradMax).toBeLessThan(0.5);
    expect(loose.iterations).toBeLessThanOrEqual(tight.iterations);
    // `converged` is relative to the tolerance asked for, which is the only
    // honest reading — the loose fit would not pass the tight one's test
    expect(loose.gradMax).toBeGreaterThan(tight.gradMax);
  });

  it('a flat prior makes the Hessian singular, and the gradient-ascent fallback carries it', () => {
    // priorSigma^2 overflows to Infinity, so the prior precision is exactly
    // 0 and the strength block of the Hessian is singular — the model is
    // invariant to adding a constant to every strength — for every step on
    // which the tie term has died away. `solveLinear` returns null there and
    // the damped gradient ascent is the only road left. It gets to the same
    // place, and it takes visibly longer to do it, which is the only way to
    // see the branch from outside.
    const flat = fitDavidson(['A', 'B'], rep('A', 'B', 'a', 8), { priorSigma: 1e200 });
    const ordinaryPrior = fitDavidson(['A', 'B'], rep('A', 'B', 'a', 8));
    expect(flat.converged).toBe(true);
    expect(flat.iterations).toBeGreaterThan(ordinaryPrior.iterations);
    for (const id of flat.ids) expect(Number.isFinite(flat.strengths.get(id)!)).toBe(true);
    // and with no prior to stop them the strengths run away — 8-0 puts them
    // twenty-odd apart, which is the divergence the prior exists to prevent
    expect(flat.strengths.get('A')!).toBeGreaterThan(10);
    expect(ordinaryPrior.strengths.get('A')!).toBeLessThan(3);
  });

  it('TAU_MAX: an all-ties record clamps the tie parameter at e^3', () => {
    const fit = fitDavidson(['A', 'B'], rep('A', 'B', 'tie', 400));
    expect(fit.nu).toBeCloseTo(Math.exp(3), 6);
    expect(fit.probBeats('A', 'B')).toBeCloseTo(0.5, 6);
  });

  it('TAU_MIN: unreachable from any record a room could produce', () => {
    // The other clamp is not symmetric with TAU_MAX, and it is worth having
    // written down: the prior on tau is unit-variance around ln(0.5), so a
    // no-ties record settles where the likelihood's pull balances it —
    // around nu = 0.11 at 180 comparisons, and ~0.06 at six thousand. It
    // approaches e^-10 = 4.5e-5 only at hundreds of thousands of judgments,
    // which is several orders past anything §4.2 will ever see. TAU_MIN is
    // therefore a guard rail, never a resting place, where TAU_MAX above is
    // reached by four hundred ties.
    const some = fitDavidson(
      ['A', 'B', 'C'],
      [...rep('A', 'B', 'a', 60), ...rep('B', 'C', 'a', 60), ...rep('A', 'C', 'a', 60)],
    );
    const many = fitDavidson(['A', 'B'], rep('A', 'B', 'a', 6000));
    expect(some.nu).toBeLessThan(0.5); // below the prior's own centre
    expect(many.nu).toBeLessThan(some.nu); // and falling with volume
    expect(many.nu).toBeGreaterThan(Math.exp(-10) * 100); // nowhere near the clamp
  });

  it('perfect separation: the prior keeps it finite, and it stops with no ascent left', () => {
    // A beats B every time, B beats C every time: without a prior the MAP
    // runs to infinity. With one it stops — but it stops because no step in
    // double precision increases the objective, at a gradient thirty times
    // the default tolerance, not because the tolerance was met. That is
    // exactly the case `converged` must not report as a failure.
    const fit = fitDavidson(
      ['A', 'B', 'C'],
      [...rep('A', 'B', 'a', 200), ...rep('B', 'C', 'a', 200)],
    );
    expect(fit.stop).toBe('no-ascent');
    expect(fit.gradMax).toBeGreaterThan(1e-9); // above the default tolerance
    expect(fit.converged).toBe(true);
    for (const id of fit.ids) expect(Number.isFinite(fit.strengths.get(id)!)).toBe(true);
    expect(fit.strengths.get('A')!).toBeGreaterThan(fit.strengths.get('C')!);
    // **And it is exactly 1.0** — not through the degenerate-variance branch
    // below but through `normalCdf` itself, whose erf approximation
    // saturates well before the posterior does. So a separated pair clears
    // any bar §4.2 can state, at 400 judgments, with the variance perfectly
    // healthy. Pinned rather than corrected: the ranking is doing what it
    // was asked, and whether a confidence of *exactly* one should be
    // expressible at all is the question a mechanism-auditor is for.
    expect(fit.probBeats('A', 'C')).toBe(1);
    expect(fit.varDiff('A', 'C')).toBeGreaterThan(1e-12); // not the degenerate path
  });

  it('DEGENERATE_VAR: a vanishing posterior returns exactly 1, which clears any bar', () => {
    // The finding this test exists to pin (entry 77): `probBeats` decides by
    // the sign of the point estimate when the posterior variance of the
    // difference collapses below 1e-12, and 1.0 trivially clears every
    // threshold §4.2 can express. A prior tight enough to squeeze the
    // variance flat is what reaches it; nothing in the product sets one, so
    // this is a latent trapdoor rather than a live defect.
    const fit = fitDavidson(['A', 'B'], rep('A', 'B', 'a', 100), { priorSigma: 3e-7 });
    expect(fit.varDiff('A', 'B')).toBeLessThanOrEqual(1e-12);
    expect(fit.probBeats('A', 'B')).toBe(1);
    expect(fit.probBeats('B', 'A')).toBe(0);
    // the pair still sums to 1, which is the invariant the auditor wants
    expect(fit.probBeats('A', 'B') + fit.probBeats('B', 'A')).toBe(1);
  });

  it('DEGENERATE_VAR: an identical pair under the same prior is 0.5, not 1', () => {
    const fit = fitDavidson(
      ['A', 'B'],
      [...rep('A', 'B', 'a', 50), ...rep('A', 'B', 'b', 50)],
      { priorSigma: 3e-7 },
    );
    expect(fit.varDiff('A', 'B')).toBeLessThanOrEqual(1e-12);
    expect(fit.probBeats('A', 'B')).toBe(0.5);
  });
});
