/**
 * The dedup-gate — submission-time duplicate check (SPEC §5.1): exact
 * match, then edit distance, then LLM equivalence.
 *
 * This is an ADVISORY helper that lives OUTSIDE the Session state
 * machine. Session commands are synchronous and replay must stay
 * bit-identical, so nothing async ever feeds the fold; the caller (a
 * client, the sim runner, later the composer UI) consults the gate
 * before submitting and decides what to do with a duplicate verdict —
 * co-sign the existing candidate, sharpen the draft, or insist. The gate
 * itself never touches session state.
 *
 * The first two stages are pure and free; the oracle stage is optional
 * and skipped silently when no oracle is configured. An oracle failure
 * must never block a submission: any throw degrades to `fresh`.
 */

import type { OracleCandidate, SemanticOracle } from './oracle.js';

export type DedupVerdict =
  | { kind: 'fresh' }
  | {
      kind: 'duplicate';
      /** Id of the live candidate this draft duplicates. */
      of: string;
      via: 'exact' | 'edit-distance' | 'oracle';
      reason: string;
    };

export interface DedupGateOptions {
  /**
   * Maximum relative Levenshtein distance (distance / longer length, on
   * normalized text) at which two texts count as duplicates. Default
   * 0.15: candidate lines in this domain run ~40–80 characters, so 0.15
   * admits roughly 6–12 character edits — typo-level noise, punctuation,
   * "each"/"every" — while genuinely rival clauses, which tend to share a
   * sentence stem but replace the operative phrase, land well above it.
   * Calibrate downward before trusting the gate on very short texts,
   * where a few edits can flip the meaning.
   */
  editDistanceThreshold?: number;
  /**
   * Oracle verdicts below this confidence are ignored (treated as
   * fresh). Default 0.5.
   */
  oracleMinConfidence?: number;
}

export class DedupGate {
  private readonly threshold: number;
  private readonly minConfidence: number;

  constructor(
    private readonly oracle?: SemanticOracle,
    options: DedupGateOptions = {},
  ) {
    this.threshold = options.editDistanceThreshold ?? 0.15;
    this.minConfidence = options.oracleMinConfidence ?? 0.5;
  }

  /**
   * Check a draft's replacement text against the live candidates'.
   * Pipeline: exact match → normalized edit distance → oracle (if any).
   * Purely advisory: returns a verdict, changes nothing.
   */
  async check(
    patchText: string,
    liveCandidates: OracleCandidate[],
    documentText: string,
  ): Promise<DedupVerdict> {
    if (liveCandidates.length === 0) return { kind: 'fresh' };

    // Stage 1: exact text match (free).
    for (const c of liveCandidates) {
      if (c.text === patchText) {
        return { kind: 'duplicate', of: c.id, via: 'exact', reason: 'identical text' };
      }
    }

    // Stage 2: relative Levenshtein on normalized text (free). Nearest
    // match wins so the author is pointed at the closest twin.
    const normalized = normalizeForDedup(patchText);
    let best: { id: string; d: number } | null = null;
    for (const c of liveCandidates) {
      const d = relativeEditDistance(normalized, normalizeForDedup(c.text));
      if (best === null || d < best.d) best = { id: c.id, d };
    }
    if (best !== null && best.d <= this.threshold) {
      return {
        kind: 'duplicate',
        of: best.id,
        via: 'edit-distance',
        reason: `relative edit distance ${best.d.toFixed(3)} ≤ ${this.threshold}`,
      };
    }

    // Stage 3: semantic equivalence, only if an oracle is configured.
    // Skipped silently otherwise; a throw or a hallucinated id is "no
    // opinion" — the oracle never blocks a submission.
    if (this.oracle) {
      try {
        const verdict = await this.oracle.checkEquivalence(patchText, liveCandidates, {
          documentText,
        });
        if (
          verdict.duplicateOf !== null &&
          verdict.confidence >= this.minConfidence &&
          liveCandidates.some((c) => c.id === verdict.duplicateOf)
        ) {
          return {
            kind: 'duplicate',
            of: verdict.duplicateOf,
            via: 'oracle',
            reason: verdict.reason,
          };
        }
      } catch {
        // Degrade to fresh: LLM judgment is never load-bearing.
      }
    }

    return { kind: 'fresh' };
  }
}

/** Lowercase, collapse all whitespace runs to single spaces, trim. */
export function normalizeForDedup(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Classic Levenshtein distance, two-row dynamic programming. Pure. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length]!;
}

/** Levenshtein over the longer length; 0 for two empty strings. */
export function relativeEditDistance(a: string, b: string): number {
  const longer = Math.max(a.length, b.length);
  if (longer === 0) return 0;
  return levenshtein(a, b) / longer;
}
