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
  | 'rebase-pending'
  /** Unresolved at the close (SPEC §4.6): the incumbent stood, but this is not *kept*. */
  | 'undecided';

export interface Candidate {
  id: string;
  author: string;
  rationale: string;
  /** A text proposal's patch — absent on a setting candidate (Q390). */
  patch?: PatchSet;
  /**
   * An ordinary motion's proposed value (SPEC §9.6, Q390): opaque to the
   * engine — hashed for identity and dedup, never interpreted. A setting
   * candidate races in the race of its setting; a text candidate in the
   * race of its footprint. Exactly one of patch/setting is present.
   */
  setting?: { settingId: string; value: unknown };
  /** Footprint on the version the patch currently targets; [] for settings. */
  footprint: Span[];
  state: CandidateState;
  stakePaid: number;
  /** Peak modeled P(beats incumbent) — refund basis (SPEC §7). */
  peakW: number;
  /** Informed redrafts consumed by this position (SPEC §6.2). */
  redrafts: number;
  machineAuthored?: boolean;
  /**
   * The author chose to sign it (SPEC §3.5a, Q770): named from the moment
   * it is proposed, whatever the disclosure rung. Present only when true —
   * an unsigned candidate carries no field, exactly as `machineAuthored`.
   */
  signed?: true;
  /**
   * The disclosure base standing when it was submitted (SPEC §3.5a, entry
   * 31 — *a proposal keeps the privacy it was made under*). The reveal rule
   * (`authorVisible`) reads this, never the constitution's current value,
   * so a 👤 motion binds proposals made after it and none made before.
   * Absent on a candidate from a log older than the field; the rule falls
   * back to the current value for those.
   */
  disclosure?: Constitution['authorshipVisibility'];
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
   * Closeness to resolution as a magnitude, never a direction (SPEC §8.3:
   * "closeness-to-resolution as a single number"): how far the room's
   * evidence has moved the leader from a coin flip, scaled so the carry
   * boundary is 1 — |2p − 1| / (2θ − 1) with p = P(leader beats incumbent)
   * and θ the adoption threshold now, clamped to [0, 1]. A fresh race
   * (p = ½) sits at 0; a race about to carry and a race the incumbent is
   * about to see off both read 1, because |2p − 1| is exactly invariant
   * under p ↔ 1 − p — the number cannot be inverted into "which way".
   *
   * The denominator never falls below `MIN_CLOSENESS_SPAN` (Q836), so a bar
   * of exactly ½ — where there is no distance from the coin flip to the bar
   * to measure — reads as the lowest bar above it rather than as 0.
   */
  closeness: number;
  /**
   * Rival-pair gate state (SPEC §8.3, Q48): true once some challenger
   * shows displacement evidence against the incumbent, unlocking
   * rival-vs-rival pairs for ordinary value-based sampling.
   */
  rivalGateOpen: boolean;
  /**
   * Present on a setting race (SPEC §9.6, Q390): the race is over this
   * setting's standing value rather than over contested text, and
   * `contested` is empty.
   */
  settingId?: string;
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
      /** Exactly one of patch/setting (Q390). */
      patch?: PatchSet;
      setting?: { settingId: string; value: unknown };
      rationale: string;
      machineAuthored?: boolean;
      /** Emitted only when true (Q770). */
      signed?: true;
      /** The disclosure base at submission (entry 31); always emitted since Q770. */
      disclosure?: Constitution['authorshipVisibility'];
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
  | { type: 'candidate-retired'; t: number; id: string; refund: number; raceId?: string }
  | {
      /**
       * The third outcome (SPEC §4.6): live at the close, neither adopted nor
       * beaten. The incumbent stands, but the record keeps *undecided* apart
       * from *kept* — the minority map and the backlog's stake-waived
       * re-entry both live on the difference. Tokens are worthless at the
       * close (§7), so the refund is 0 and recorded as such.
       */
      type: 'candidate-undecided';
      t: number;
      id: string;
      raceId: string;
      refund: number;
    }
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
      /** The race the candidate resolved in (stage 8; absent on older logs). */
      raceId?: string;
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
  | {
      /**
       * T=0 (SPEC §4.6). Emitted by the engine itself when a tick or an act
       * crosses the window's end — after the final adoption batch and the
       * undecided verdicts — or by the host's explicit `close`. An event in
       * the log, never a wall-clock inference at load.
       */
      type: 'closed';
      t: number;
    };

/**
 * The event format this build writes (Q480(a), PRODUCTION.md stage 5).
 * The engine keeps its own number: the two logs sit side by side in the
 * stage-6 schema and change for entirely different reasons, and one
 * version covering both would be bumped by every change to either.
 */
export const SCHEMA_VERSION = 1;

export interface LogEntry {
  seq: number;
  hash: string;
  prevHash: string;
  event: Event;
  /**
   * The format `event` was written in; **absent means 1**, and the hash
   * covers the event alone, so adding this broke no chain. Read it with
   * `versionOf` rather than directly.
   */
  schemaVersion?: number;
}

/** The format an entry was written in; absent means 1 (Q480). */
export function versionOf(entry: Pick<LogEntry, 'schemaVersion'>): number {
  return entry.schemaVersion ?? 1;
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
