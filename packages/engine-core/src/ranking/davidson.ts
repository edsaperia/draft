/**
 * Davidson (1970) Bradley–Terry-with-ties ranking model, MAP-fitted with a
 * Gaussian prior on log-strengths and a Laplace approximation for posterior
 * uncertainty (SPEC §4.1–4.3).
 *
 * Model: strengths pi_i = exp(s_i). For a comparison of i vs j,
 *   P(i wins) = pi_i / D,
 *   P(j wins) = pi_j / D,
 *   P(tie)    = nu * sqrt(pi_i * pi_j) / D,
 *   D = pi_i + pi_j + nu * sqrt(pi_i * pi_j),  nu >= 0.
 *
 * The tie parameter is optimized on the log scale (tau = ln nu) so it stays
 * positive; tau is clamped to [-10, 3]. Log-denominators are computed with a
 * log-sum-exp shift for numerical stability.
 */
import type { Comparison, Fit, FitOptions, Outcome } from './types.js';

const LN_HALF = Math.log(0.5);
const TAU_MIN = -10;
const TAU_MAX = 3;
const DEGENERATE_VAR = 1e-12;

/** Abramowitz–Stegun 7.1.26 erf approximation, |error| <= 1.5e-7. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
    t;
  return sign * (1 - poly * Math.exp(-ax * ax));
}

/** Standard normal CDF. */
function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/**
 * Solve A x = b by Gaussian elimination with partial pivoting.
 * A and b are not mutated. Returns null if A is (numerically) singular.
 */
function solveLinear(A: ReadonlyArray<ReadonlyArray<number>>, b: ReadonlyArray<number>): number[] | null {
  const n = b.length;
  const M: number[][] = A.map((row, r) => [...row, b[r]!]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r]![col]!) > Math.abs(M[pivot]![col]!)) pivot = r;
    }
    if (Math.abs(M[pivot]![col]!) < 1e-300) return null;
    if (pivot !== col) {
      const tmp = M[col]!;
      M[col] = M[pivot]!;
      M[pivot] = tmp;
    }
    const prow = M[col]!;
    for (let r = col + 1; r < n; r++) {
      const row = M[r]!;
      const f = row[col]! / prow[col]!;
      if (f === 0) continue;
      for (let c = col; c <= n; c++) row[c] = row[c]! - f * prow[c]!;
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    const row = M[r]!;
    let acc = row[n]!;
    for (let c = r + 1; c < n; c++) acc -= row[c]! * x[c]!;
    x[r] = acc / row[r]!;
  }
  return x;
}

/**
 * Invert a square matrix by Gauss–Jordan elimination with partial pivoting.
 * Throws if the matrix is (numerically) singular.
 */
function invertMatrix(A: ReadonlyArray<ReadonlyArray<number>>): number[][] {
  const n = A.length;
  const M: number[][] = A.map((row, r) => {
    const aug = new Array<number>(2 * n).fill(0);
    for (let c = 0; c < n; c++) aug[c] = row[c]!;
    aug[n + r] = 1;
    return aug;
  });
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r]![col]!) > Math.abs(M[pivot]![col]!)) pivot = r;
    }
    if (Math.abs(M[pivot]![col]!) < 1e-300) {
      throw new Error('Laplace covariance: Hessian is singular and cannot be inverted');
    }
    if (pivot !== col) {
      const tmp = M[col]!;
      M[col] = M[pivot]!;
      M[pivot] = tmp;
    }
    const prow = M[col]!;
    const pv = prow[col]!;
    for (let c = 0; c < 2 * n; c++) prow[c] = prow[c]! / pv;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const row = M[r]!;
      const f = row[col]!;
      if (f === 0) continue;
      for (let c = 0; c < 2 * n; c++) row[c] = row[c]! - f * prow[c]!;
    }
  }
  return M.map((row) => row.slice(n));
}

interface IndexedComparison {
  i: number;
  j: number;
  outcome: Outcome;
}

interface Derivs {
  obj: number;
  grad: number[];
  /** Negative Hessian of the log-posterior (positive definite). */
  negHess: number[][];
}

/**
 * Fit the Davidson model by MAP with full-Newton optimization and a Laplace
 * approximation to the posterior covariance of the log-strengths.
 */
export function fitDavidson(ids: string[], comparisons: Comparison[], opts: FitOptions = {}): Fit {
  const n = ids.length;
  const index = new Map<string, number>();
  for (let k = 0; k < n; k++) {
    const id = ids[k]!;
    if (index.has(id)) throw new Error(`Duplicate id: "${id}"`);
    index.set(id, k);
  }

  const sigma = opts.priorSigma ?? 2;
  if (!Number.isFinite(sigma) || sigma <= 0) {
    throw new Error(`priorSigma must be a positive finite number, got ${sigma}`);
  }
  const fixedNu = opts.nu;
  if (fixedNu !== undefined && (!Number.isFinite(fixedNu) || fixedNu < 0)) {
    throw new Error(`nu must be a finite number >= 0, got ${fixedNu}`);
  }
  const fitTau = fixedNu === undefined;

  const cmp: IndexedComparison[] = comparisons.map((c) => {
    const i = index.get(c.a);
    if (i === undefined) throw new Error(`Comparison references unknown id: "${c.a}"`);
    const j = index.get(c.b);
    if (j === undefined) throw new Error(`Comparison references unknown id: "${c.b}"`);
    if (i === j) throw new Error(`Comparison pits id "${c.a}" against itself`);
    if (c.outcome === 'tie' && fixedNu === 0) {
      throw new Error('A tie was observed but nu is fixed at 0 (ties have probability zero)');
    }
    return { i, j, outcome: c.outcome };
  });

  const dim = n + (fitTau ? 1 : 0);
  const priorPrec = 1 / (sigma * sigma);
  const lnFixedNu = fixedNu !== undefined && fixedNu > 0 ? Math.log(fixedNu) : -Infinity;

  /** Log-posterior only (used by the line search). */
  const objective = (x: ReadonlyArray<number>): number => {
    const lnNu = fitTau ? x[n]! : lnFixedNu;
    let obj = 0;
    for (const { i, j, outcome } of cmp) {
      const si = x[i]!;
      const sj = x[j]!;
      const lt = lnNu === -Infinity ? -Infinity : lnNu + 0.5 * (si + sj);
      const m = Math.max(si, sj, lt);
      const logD =
        m + Math.log(Math.exp(si - m) + Math.exp(sj - m) + (lt === -Infinity ? 0 : Math.exp(lt - m)));
      obj += (outcome === 'a' ? si : outcome === 'b' ? sj : lt) - logD;
    }
    for (let k = 0; k < n; k++) obj -= (x[k]! * x[k]!) * priorPrec * 0.5;
    if (fitTau) {
      const dt = x[n]! - LN_HALF;
      obj -= 0.5 * dt * dt;
    }
    return obj;
  };

  /**
   * Log-posterior with analytic gradient and negative Hessian.
   *
   * For one comparison, ln D is a log-sum-exp of three exponents with feature
   * vectors f_i = e_i, f_j = e_j, f_tie = (e_i + e_j)/2 + e_tau, so
   * grad(ln D) = E_p[f] and Hess(ln D) = Cov_p(f), with p = (p_i, p_j, p_tie).
   * The log-likelihood is linear-in-params minus ln D, hence its negative
   * Hessian is exactly the sum of these covariance matrices — positive
   * semidefinite, made positive definite by the prior precision.
   */
  const derivs = (x: ReadonlyArray<number>): Derivs => {
    const lnNu = fitTau ? x[n]! : lnFixedNu;
    let obj = 0;
    const grad = new Array<number>(dim).fill(0);
    const H: number[][] = [];
    for (let r = 0; r < dim; r++) H.push(new Array<number>(dim).fill(0));

    for (const { i, j, outcome } of cmp) {
      const si = x[i]!;
      const sj = x[j]!;
      const lt = lnNu === -Infinity ? -Infinity : lnNu + 0.5 * (si + sj);
      const m = Math.max(si, sj, lt);
      const ei = Math.exp(si - m);
      const ej = Math.exp(sj - m);
      const et = lt === -Infinity ? 0 : Math.exp(lt - m);
      const sum = ei + ej + et;
      const logD = m + Math.log(sum);
      const pi = ei / sum;
      const pj = ej / sum;
      const pt = et / sum;

      obj += (outcome === 'a' ? si : outcome === 'b' ? sj : lt) - logD;

      const ui = pi + pt / 2; // d(ln D)/d s_i
      const uj = pj + pt / 2; // d(ln D)/d s_j
      grad[i] = grad[i]! + (outcome === 'a' ? 1 : outcome === 'tie' ? 0.5 : 0) - ui;
      grad[j] = grad[j]! + (outcome === 'b' ? 1 : outcome === 'tie' ? 0.5 : 0) - uj;

      H[i]![i] = H[i]![i]! + (pi + pt / 4 - ui * ui);
      H[j]![j] = H[j]![j]! + (pj + pt / 4 - uj * uj);
      const off = pt / 4 - ui * uj;
      H[i]![j] = H[i]![j]! + off;
      H[j]![i] = H[j]![i]! + off;

      if (fitTau) {
        grad[n] = grad[n]! + (outcome === 'tie' ? 1 : 0) - pt;
        const cit = pt / 2 - ui * pt;
        const cjt = pt / 2 - uj * pt;
        H[i]![n] = H[i]![n]! + cit;
        H[n]![i] = H[n]![i]! + cit;
        H[j]![n] = H[j]![n]! + cjt;
        H[n]![j] = H[n]![j]! + cjt;
        H[n]![n] = H[n]![n]! + pt * (1 - pt);
      }
    }

    for (let k = 0; k < n; k++) {
      obj -= (x[k]! * x[k]!) * priorPrec * 0.5;
      grad[k] = grad[k]! - x[k]! * priorPrec;
      H[k]![k] = H[k]![k]! + priorPrec;
    }
    if (fitTau) {
      const dt = x[n]! - LN_HALF;
      obj -= 0.5 * dt * dt;
      grad[n] = grad[n]! - dt;
      H[n]![n] = H[n]![n]! + 1;
    }
    return { obj, grad, negHess: H };
  };

  const clampTau = (x: number[]): void => {
    if (fitTau) x[n] = Math.min(TAU_MAX, Math.max(TAU_MIN, x[n]!));
  };

  /**
   * Backtracking line search along `dir` (factor 0.5, max 30 halvings).
   * Returns the accepted point, or null if no step increases the objective.
   */
  const lineSearch = (
    x: ReadonlyArray<number>,
    dir: ReadonlyArray<number>,
    obj0: number,
  ): number[] | null => {
    let t = 1;
    for (let h = 0; h <= 30; h++) {
      const cand = x.map((v, k) => v + t * dir[k]!);
      clampTau(cand);
      if (objective(cand) > obj0) return cand;
      t *= 0.5;
    }
    return null;
  };

  // --- MAP optimization: full Newton with gradient-ascent fallback ---------
  let x = new Array<number>(dim).fill(0);
  if (fitTau) x[n] = LN_HALF;
  const maxIterations = opts.maxIterations ?? 200;
  const tolerance = opts.tolerance ?? 1e-9;

  let last = derivs(x);
  // Which of the three exits ran, and how far it got. Before entry 77 all
  // three broke the same loop and said nothing, so a fit that ran out of
  // iterations with the gradient still moving was reported exactly like one
  // that met its tolerance on step two — and an adoption decision is taken
  // off the numbers such a fit produces.
  let stop: Fit['stop'] = 'max-iterations';
  let iterations = 0;
  for (let iter = 0; iter < maxIterations; iter++) {
    let gmax = 0;
    for (const g of last.grad) gmax = Math.max(gmax, Math.abs(g));
    if (gmax < tolerance) { stop = 'tolerance'; break; }

    const newton = solveLinear(last.negHess, last.grad);
    let next = newton === null ? null : lineSearch(x, newton, last.obj);
    if (next === null) next = lineSearch(x, last.grad, last.obj); // damped gradient ascent
    if (next === null) { stop = 'no-ascent'; break; } // nothing left to try
    x = next;
    last = derivs(x);
    iterations += 1;
  }
  // Measured at the point actually returned, whichever exit ran, so
  // `converged` is a fact about the answer rather than about the road to it.
  let gradMax = 0;
  for (const g of last.grad) gradMax = Math.max(gradMax, Math.abs(g));
  // **`no-ascent` is convergence, and measuring it by the gradient alone
  // would say otherwise.** Perfect separation is the ordinary case here:
  // the prior stops the strengths running away, the line search then finds
  // no step in double precision that increases the objective, and the fit
  // is as good as this arithmetic gets — with `gradMax` around 3e-8, thirty
  // times the default tolerance. So the flag asks whether the optimiser has
  // anything left to do, and `gradMax` is published beside it for a caller
  // that wants the stricter test.
  const converged = stop === 'no-ascent' || gradMax < tolerance;

  // --- Laplace approximation ----------------------------------------------
  // Invert the FULL negative Hessian (including tau if fitted) and take the
  // strength sub-block of the inverse: this marginalizes over tau and so
  // propagates tie-parameter uncertainty into the strength covariance.
  let covRaw: number[][];
  if (dim === 0) {
    covRaw = [];
  } else {
    const full = invertMatrix(last.negHess);
    covRaw = [];
    for (let r = 0; r < n; r++) {
      const row = new Array<number>(n).fill(0);
      for (let c = 0; c < n; c++) row[c] = (full[r]![c]! + full[c]![r]!) / 2; // symmetrize
      covRaw.push(row);
    }
  }

  // --- Center for reporting: s -> s - mean, C -> P C P^T, P = I - ones/n ---
  const strengthArr = new Array<number>(n).fill(0);
  let mean = 0;
  for (let k = 0; k < n; k++) mean += x[k]!;
  mean = n > 0 ? mean / n : 0;
  for (let k = 0; k < n; k++) strengthArr[k] = x[k]! - mean;

  const cov: number[][] = [];
  if (n > 0) {
    const rowMean = new Array<number>(n).fill(0);
    let total = 0;
    for (let r = 0; r < n; r++) {
      let acc = 0;
      for (let c = 0; c < n; c++) acc += covRaw[r]![c]!;
      rowMean[r] = acc / n;
      total += acc;
    }
    total /= n * n;
    for (let r = 0; r < n; r++) {
      const row = new Array<number>(n).fill(0);
      for (let c = 0; c < n; c++) row[c] = covRaw[r]![c]! - rowMean[r]! - rowMean[c]! + total;
      cov.push(row);
    }
  }

  const nu = fitTau ? Math.exp(x[n]!) : fixedNu;

  const idsCopy = [...ids];
  const strengths = new Map<string, number>();
  for (let k = 0; k < n; k++) strengths.set(idsCopy[k]!, strengthArr[k]!);

  const lookup = (id: string): number => {
    const k = index.get(id);
    if (k === undefined) throw new Error(`Unknown id: "${id}"`);
    return k;
  };

  const varDiff = (i: string, j: string): number => {
    const a = lookup(i);
    const b = lookup(j);
    return cov[a]![a]! + cov[b]![b]! - 2 * cov[a]![b]!;
  };

  const probBeats = (i: string, j: string): number => {
    const a = lookup(i);
    const b = lookup(j);
    const d = strengthArr[a]! - strengthArr[b]!;
    const v = varDiff(i, j);
    if (v <= DEGENERATE_VAR) {
      // Degenerate posterior: decide by sign of the point estimate.
      return Math.abs(d) <= DEGENERATE_VAR ? 0.5 : d > 0 ? 1 : 0;
    }
    return normalCdf(d / Math.sqrt(v));
  };

  const winProb = (i: string, j: string): number => {
    const a = lookup(i);
    const b = lookup(j);
    const pa = Math.exp(strengthArr[a]!);
    const pb = Math.exp(strengthArr[b]!);
    return pa / (pa + pb + nu * Math.sqrt(pa * pb));
  };

  return { ids: idsCopy, strengths, nu, cov, probBeats, winProb, varDiff,
    stop, iterations, gradMax, converged };
}
