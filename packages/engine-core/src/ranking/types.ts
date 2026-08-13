/**
 * Ranking-model types — Bradley–Terry with ties (Davidson 1970),
 * MAP-fitted with a Gaussian prior on log-strengths and a Laplace
 * approximation for posterior uncertainty (SPEC §4.1).
 */

export type Outcome = 'a' | 'b' | 'tie';

export interface Comparison {
  a: string;
  b: string;
  outcome: Outcome;
}

export interface FitOptions {
  /** Std-dev of the Normal(0, sigma^2) prior on log-strengths. Default 2. */
  priorSigma?: number;
  /**
   * Davidson tie parameter nu (>= 0). If omitted, fitted by MAP with a
   * weak lognormal prior; if provided, held fixed.
   */
  nu?: number;
  maxIterations?: number;
  tolerance?: number;
}

export interface Fit {
  /** Member ids, in the order used by `cov`. */
  ids: string[];
  /** MAP log-strengths, centered (sum = 0). */
  strengths: ReadonlyMap<string, number>;
  /** Fitted (or fixed) Davidson tie parameter. */
  nu: number;
  /** Laplace posterior covariance of log-strengths, ids order. */
  cov: ReadonlyArray<ReadonlyArray<number>>;
  /**
   * P(strength_i > strength_j | data): posterior probability that i is
   * truly preferred to j. This is the quantity theta gates (SPEC §4.2).
   */
  probBeats(i: string, j: string): number;
  /**
   * Model point estimate of a single comparison outcome
   * P(i chosen over j), ties excluded from the win.
   */
  winProb(i: string, j: string): number;
  /** Posterior variance of (strength_i - strength_j). */
  varDiff(i: string, j: string): number;
}
