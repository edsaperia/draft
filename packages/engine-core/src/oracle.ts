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
 * semantic composition (Gate 2, SPEC §2.2.2), race naming/typing, change
 * ledgers — as further OPTIONAL methods on this interface (`composeSemantic?`,
 * `describeRace?`, ...). Declaring them optional means a phase-1
 * implementor (an object with just `checkEquivalence`) keeps compiling
 * unchanged; callers feature-test with `oracle.method !== undefined` and
 * degrade to "no opinion" when a capability is absent, exactly as they
 * must on a transport error.
 */

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
}
