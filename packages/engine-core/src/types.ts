/**
 * Core domain types for the draft engine (SPEC v0.12).
 *
 * The engine is an event-sourced, deterministic state machine: commands
 * (with caller-supplied timestamps) produce events; events append to a
 * hash-chained log; all state is a fold over the log. No wall clock, no
 * unseeded randomness anywhere in this package.
 */

import type { PatchSet, Span } from './text/types.js';
import type { Outcome } from './ranking/types.js';

// ---------------------------------------------------------------------------
// Constitution (SPEC Appendix A)

export interface Constitution {
  /**
   * The adoption threshold — the confidence bar a challenger must clear —
   * ramps smoothly from start to end over [windowStartMs, windowEndMs],
   * the session clock (SPEC §4.3).
   */
  adoptionThresholdStart: number;
  adoptionThresholdEnd: number;
  /** F = min(ceil(E/3), adoptionFloorMax) distinct movers per race. */
  adoptionFloorMax: number;
  /** Saturation requires at least this many comparisons in the race. */
  saturationMinComparisons: number;
  /** Max pair value below which a race counts as saturated. */
  saturationEpsilon: number;
  /** No adoption fires within this many ms of the previous adoption. */
  cooldownMs: number;
  /** Informed redrafts before a position carries to the backlog. */
  redraftLimit: number;
  tokenGrant: number;
  tokenDripPerTenth: number;
  tokenCap: number;
  stake: number;
  rationaleMaxChars: number;
  /** Latency gaps above this are discarded from c_p (bout boundary). */
  boutGapMs: number;
  hotSetSize: number;
  /** ~1 slot in `explorationEvery` explores under-measured candidates. */
  explorationEvery: number;
  /** ~1 slot in `salienceEvery` serves a salience diagonal. */
  salienceEvery: number;
  windowStartMs: number;
  windowEndMs: number;
  authorshipVisibility: 'public' | 'sealed' | 'anonymous';
  rngSeed: string;
  /**
   * Rival-pair gate (SPEC §8.3, Q48): rival-vs-rival pairs are served
   * sparingly until some challenger's posterior P(beats incumbent)
   * exceeds this level on at least rivalGateMinComparisons
   * incumbent-involving comparisons (current ground).
   */
  rivalGateProb: number;
  rivalGateMinComparisons: number;
  /**
   * Routing-value multiplier for a race whose ground shifted (SPEC §4.4,
   * Q50): applied while the re-opened race has fewer fresh judgments
   * than live candidates, so re-served pairs price like new-candidate
   * measurement or better (SPEC §8.1).
   */
  reopenedBoost: number;
}

export interface Participant {
  id: string;
  /** Display / contact handle; the engine never interprets it. */
  handle: string;
  machine?: boolean;
}

// ---------------------------------------------------------------------------
// Candidates and races

export type CandidateState =
  | 'live'
  | 'adopted'
  | 'retired'
  | 'merged'
  | 'carried'
  | 'withdrawn'
  /** Displaced incumbent or rebase-failure limbo: not live, kept for the model. */
  | 'displaced'
  | 'rebase-pending';

export interface Candidate {
  id: string;
  author: string;
  rationale: string;
  patch: PatchSet;
  /** Footprint on the version the patch currently targets. */
  footprint: Span[];
  state: CandidateState;
  stakePaid: number;
  /** Peak modeled P(beats incumbent) — refund basis (SPEC §7). */
  peakW: number;
  /** Informed redrafts consumed by this position (SPEC §6.2). */
  redrafts: number;
  machineAuthored?: boolean;
  /** Set when the candidate left play; records the cause of death. */
  exit?: { t: number; cause: string; refund: number };
}

/**
 * A race is DERIVED state: a connected component of mutually conflicting
 * live candidates on the current document version, plus the incumbent
 * text of the contested spans (SPEC §2.3). Race identity is the smallest
 * member candidate id, so ids are stable while membership is.
 */
export interface RaceView {
  id: string;
  /** Live member candidate ids, sorted. */
  members: string[];
  /** Union of member footprints on the current version. */
  contested: Span[];
  /** Pseudo-member id representing the incumbent text of the spans. */
  incumbentId: string;
  comparisons: number;
  distinctMovers: number;
  /** P(leader beats incumbent) for the best live challenger, if any. */
  leaderP: number | null;
  leaderId: string | null;
  /** P(incumbent beats best live challenger) — certification (SPEC §4.4). */
  certification: number | null;
  saturated: boolean;
  /**
   * Rival-pair gate state (SPEC §8.3, Q48): true once some challenger
   * shows displacement evidence against the incumbent, unlocking
   * rival-vs-rival pairs for ordinary value-based sampling.
   */
  rivalGateOpen: boolean;
}

// ---------------------------------------------------------------------------
// Events (the log's vocabulary)

export type PairKind = 'edge' | 'diagonal';

export type Event =
  | {
      type: 'opened';
      t: number;
      constitution: Constitution;
      /** LF-normalized starting document. */
      text: string;
      roster: Participant[];
    }
  | { type: 'participant-added'; t: number; participant: Participant }
  | { type: 'participant-removed'; t: number; participantId: string }
  | {
      type: 'candidate-submitted';
      t: number;
      id: string;
      author: string;
      patch: PatchSet;
      rationale: string;
      machineAuthored?: boolean;
    }
  | {
      /**
       * A judgment. Judgments are living while their question is (SPEC
       * §4.4, Q50): re-judging the same pair on the same ground is a
       * revision — the log keeps every event, the ranking uses each
       * participant's latest, supersession and locking are derivable
       * from the fold (see Session.judgments()).
       */
      type: 'comparison';
      t: number;
      participantId: string;
      /** For edges: a/b are candidate ids or an incumbent pseudo-id. */
      aId: string;
      bId: string;
      kind: PairKind;
      outcome: Outcome;
    }
  | {
      /** Propose C: the peek is priced by the forfeited pair (SPEC §3.3). */
      type: 'composer-opened';
      t: number;
      participantId: string;
      forfeited?: { aId: string; bId: string };
    }
  | { type: 'candidate-withdrawn'; t: number; id: string; refund: number }
  | { type: 'candidate-retired'; t: number; id: string; refund: number }
  | {
      /** Author folds their support into an existing candidate (SPEC §5.1). */
      type: 'co-signed';
      t: number;
      candidateId: string;
      byParticipant: string;
      /** If the co-signer withdrew their own candidate to do it. */
      withdrewCandidateId?: string;
      refund: number;
    }
  | {
      type: 'adopted';
      t: number;
      candidateId: string;
      /** Document version the adoption produced. */
      newVersion: number;
      /** Posterior P(winner beats incumbent) at adoption. */
      p: number;
      /** The adoption threshold the winner cleared. */
      threshold: number;
    }
  | { type: 'candidate-rebased'; t: number; id: string; patch: PatchSet }
  | {
      /** Rebase conflict: returned to author (SPEC §2.4). */
      type: 'rebase-failed';
      t: number;
      id: string;
      conflicts: Span[];
    }
  | {
      /** Author confirms a rebase-failed candidate against the new text; evidence resets. */
      type: 'candidate-confirmed';
      t: number;
      id: string;
      patch: PatchSet;
    }
  | { type: 'closed'; t: number };

export interface LogEntry {
  seq: number;
  hash: string;
  prevHash: string;
  event: Event;
}

// ---------------------------------------------------------------------------
// Feeds (SPEC §8)

export type CardKind = 'edge' | 'diagonal' | 'exploration';

/**
 * Edge subtype (SPEC §8.3, Q48). Incumbent-involving pairs ask the
 * adoption question outright; rival pairs ask the conditional question
 * ("if this text changes, which change is better?") and never offer
 * "keep the current text".
 */
export type EdgeSubtype = 'incumbent' | 'rival';

export interface Card {
  kind: CardKind;
  /** Present on edge/exploration cards; absent on diagonals. */
  subtype?: EdgeSubtype;
  aId: string;
  bId: string;
  /** Race of the pair (edge/exploration) or of side A (diagonal). */
  raceId: string;
  /** Race of side B for diagonals. */
  raceIdB?: string;
  /** Routing value v for the pair (SPEC §8.1); feeds order by it. */
  value: number;
}
