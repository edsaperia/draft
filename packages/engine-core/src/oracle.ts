/**
 * The semantic oracle — the interface every LLM-backed judgment behind the
 * engine speaks (SPEC §5.1 "LLM equivalence", §10 machine participants).
 *
 * engine-core stays pure and dependency-free: this file defines the
 * CONTRACT only. Implementations (transports) live outside the engine —
 * in sim-harness for now (MockOracle for tests, LlmOracle over the Claude
 * API, SubscriptionOracle over the Agent SDK), later in the product
 * server. Nothing inside the Session state machine ever calls an oracle:
 * oracles are consulted by advisory helpers (see dedup-gate.ts) BEFORE a
 * command is issued, so the fold stays synchronous and replay stays
 * bit-identical.
 *
 * Extension intent (phases 2+): later phases add sibling capabilities —
 * semantic composition (Gate 2, SPEC §2.2.2), change ledgers — as further
 * OPTIONAL methods on this interface (`composeSemantic?`, ...), following
 * `describeRace?` (race naming/typing, Q49 interim). Declaring them
 * optional means a phase-1 implementor (an object with just
 * `checkEquivalence`) keeps compiling unchanged; callers feature-test
 * with `oracle.method !== undefined` and degrade to "no opinion" when a
 * capability is absent, exactly as they must on a transport error.
 */

import type { Span } from './text/types.js';

/** An existing candidate the oracle may match against. */
export interface OracleCandidate {
  id: string;
  /** The candidate's replacement text (what its patch writes). */
  text: string;
  rationale: string;
}

/** Shared context for oracle calls; later phases may widen it. */
export interface OracleContext {
  /** The current full document, for disambiguation. */
  documentText: string;
}

export interface EquivalenceVerdict {
  /**
   * Id of the existing candidate the draft is semantically equivalent to,
   * or null for "fresh / no opinion". Equivalence means same operative
   * effect — rival answers to the same question are NOT duplicates
   * (they race; SPEC §2.2.3).
   */
  duplicateOf: string | null;
  /** In [0, 1]. Callers may discount low-confidence matches. */
  confidence: number;
  /** One-sentence justification, surfaced to the author (SPEC §5.1). */
  reason: string;
}

/**
 * The three natures a dispute can have (Q49). The type is advisory
 * routing/record metadata — it never gates the mechanism:
 * - `copy-edit`: wording, style, typo, formatting; no change to what the
 *   document requires or permits.
 * - `substantive`: changes what the document requires, permits, or means.
 * - `structural`: adds, removes, splits, or reorganizes sections; reshapes
 *   the document's skeleton.
 */
export const RACE_TYPES = ['copy-edit', 'substantive', 'structural'] as const;
export type RaceType = (typeof RACE_TYPES)[number];

/** Context for `describeRace`: the document plus where the dispute bites. */
export interface RaceContext extends OracleContext {
  /** Contested line spans in `documentText` (the race's footprint union). */
  contested: Span[];
}

/**
 * An oracle's account of a dispute's nature: a short noun-phrase name for
 * the QUESTION in dispute ("treasurer oversight"), never any side's
 * answer, plus its type.
 */
export interface RaceDescription {
  name: string;
  type: RaceType;
}

export interface SemanticOracle {
  /**
   * Is `candidateText` semantically equivalent to any of `existing`?
   * Must never throw for "no match" — return `duplicateOf: null`.
   * Transport failures may throw; every caller treats a throw as
   * "no opinion" (fresh). An oracle must never block a submission.
   */
  checkEquivalence(
    candidateText: string,
    existing: OracleCandidate[],
    context: OracleContext,
  ): Promise<EquivalenceVerdict>;

  /**
   * Name and type the dispute over `groundText` (the incumbent text of
   * the contested spans; empty for pure insertions) among `candidates`
   * (Q49 interim, full treatment in P3). OPTIONAL capability: callers
   * feature-test and fall back to the deterministic nearest-heading label
   * (race-labeler.ts) when absent. Return null for "no opinion";
   * transport failures may throw — every caller treats a throw as no
   * opinion. Advisory only: a label never blocks or gates anything.
   */
  describeRace?(
    groundText: string,
    candidates: OracleCandidate[],
    context: RaceContext,
  ): Promise<RaceDescription | null>;
}
