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
  /**
   * F = max(Q, min(ceil(E/3), adoptionFloorMax)) distinct movers per race
   * (SPEC §4.2, v0.48): the statistical minimum, which the room's quorum
   * can raise but never lower.
   */
  adoptionFloorMax: number;
  /**
   * The room's settled quorum (SPEC §4.2, §9.0a): a fixed count, or a
   * share of E (share × E, rounded up), re-derived from current E so a
   * share-quorum tracks the roster. null = no quorum settled (Q = 0),
   * which leaves the statistical minimum governing alone.
   */
  quorum: { form: 'count' | 'share'; n: number } | null;
  /** Deadlock requires at least this many comparisons in the race. */
  deadlockMinComparisons: number;
  /** Max pair value below which a race counts as deadlocked. */
  deadlockEpsilon: number;
  /** No adoption fires within this many ms of the previous adoption. */
  cooldownMs: number;
  /** Informed redrafts before a position carries to the backlog. */
  redraftLimit: number;
  tokenGrant: number;
  /**
   * The drip runs on real minutes everywhere (SPEC §7, Q353, v0.48): one
   * token lands every this-many minutes from the window's start, windowed
   * and perpetual documents alike — moving the close touches nobody's
   * wallet. Non-positive or non-finite disables the drip.
   */
  tokenDripMinutes: number;
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

/**
 * The fields a carried amendment may change mid-session (SPEC §9.6, Q328:
 * a carried amendment binds races in flight — a race is always evaluated
 * against the constitution as it stands; past adoptions keep their
 * recorded bar). Everything else in the Constitution is engine tuning or
 * fixed at open (§9.0), and stake stays flat (§13).
 */
export interface ConstitutionAmendment {
  adoptionThresholdEnd?: number;
  windowEndMs?: number;
  tokenGrant?: number;
  tokenDripMinutes?: number;
  tokenCap?: number;
  authorshipVisibility?: Constitution['authorshipVisibility'];
  quorum?: Constitution['quorum'];
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
  deadlocked: boolean;
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
      /**
       * Initial standing values for settings the session may hold races
       * over (SPEC §9.6, Q390): opaque to the engine — hashed for ground
       * identity, never interpreted. Absent = no setting races possible
       * until standings are set.
       */
      settings?: Record<string, unknown>;
    }
  | { type: 'participant-added'; t: number; participant: Participant }
  | { type: 'participant-removed'; t: number; participantId: string }
  | {
      /**
       * Lapse, engine-side (SPEC §9.5a, §8.2): a suspended participant
       * leaves E — the floor, a share-quorum and the freeze base stop
       * counting them — and cannot act, but every judgment they cast
       * keeps counting and their wallet keeps dripping. Revival is
       * `participant-resumed`; the host calls it on any authenticated
       * act.
       */
      type: 'participant-suspended';
      t: number;
      participantId: string;
    }
  | { type: 'participant-resumed'; t: number; participantId: string }
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
      /** Propose C. Costs no comparison since SPEC v0.16 (§3.3, §3.5). */
      type: 'composer-opened';
      t: number;
      participantId: string;
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
  | {
      /**
       * A carried amendment (SPEC §9.6, Q328): the constitution as it
       * stands changes from here forward. The threshold never jumps
       * because timings changed (§4.3): a windowEnd or ceiling change
       * re-anchors the ramp at its current value.
       */
      type: 'constitution-amended';
      t: number;
      changes: ConstitutionAmendment;
    }
  | {
      /**
       * The standing value of a setting changed — by a carried motion the
       * host applied, or a constitutional amendment (SPEC §9.6). For any
       * setting race in flight this is a ground shift (§4.4): the
       * incumbent id is a hash of the standing value.
       */
      type: 'standing-set';
      t: number;
      settingId: string;
      value: unknown;
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
