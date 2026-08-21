/**
 * Event vocabulary and public record shapes (SPEC §9, v0.48). All events
 * carry a caller-supplied non-decreasing t; everything state-affecting
 * happens in the fold (session.ts), never in the command layer; follow-on
 * emission (the maybeAdopt pattern) happens only in commands.
 *
 * Blindness note (NOTES.md): answers ride in events in plaintext — the
 * projection layer (view.ts) is what withholds. The log is not a member
 * surface; view() is the only sanctioned member-facing read path.
 */

import type { MotionRoute, SettingId } from './catalogue.js';
import type { SettingValue } from './values.js';

export type MemberId = string;
export type ApplicantId = string;
export type MotionId = string;
export type CrownQuestionId = string;

export type MotionAnswer = 'accept' | 'keep' | 'abstain';

/**
 * The two crown powers (§9.7 v0.54), held and relinquished separately:
 * 'unilateral' — the convenor may change the setting directly, no motion;
 * 'assent' — a change the members carry waits on the convenor's accept
 * (the 👑 question). Reservation-as-it-stood is both at once.
 */
export type Power = 'unilateral' | 'assent';
export interface Powers { unilateral: boolean; assent: boolean }

/** §9.7 v0.54: holder derives from powers — the convenor's iff any is held. */
export function holderOf(powers: Powers): 'convenor' | 'members' {
  return powers.unilateral || powers.assent ? 'convenor' : 'members';
}

/** What a motion proposes. Membership changes ride motions as actions, never as a scalar. */
export type MotionPayload =
  | { kind: 'set'; setting: SettingId; value: SettingValue }
  | { kind: 'invite'; email: string }
  | { kind: 'remove'; member: MemberId }
  | { kind: 'admit'; applicant: ApplicantId }
  // returning powers to the convenor's reserve (§9.7 v0.52; v0.54 names
  // which — omitted means both, the pre-v0.54 behaviour; Q394)
  | { kind: 'reserve'; setting: SettingId; power?: Power | 'both' };

export interface ConvenorInput {
  id: MemberId;
  email: string;
  /** The hat question: ticked = the convenor invites themselves (§9.6a). */
  isMember: boolean;
  name?: string;
  picture?: string;
}

export type ConstitutionEvent =
  /* -- creation and the pre-start free hand (§9.6a, §9.7a) ---------------- */
  | { type: 'created'; t: number; title: string; slug: string; convenor: ConvenorInput }
  | { type: 'convenor-membership-set'; t: number; isMember: boolean }
  | { type: 'setting-set'; t: number; setting: SettingId; value: SettingValue;
      by: 'convenor' | 'crown' }
  | { type: 'setting-delegated'; t: number; setting: SettingId }
  | { type: 'setting-reclaimed'; t: number; setting: SettingId }
  /** One crown power given up — free, separate, one-way (§9.7 v0.54). */
  | { type: 'power-relinquished'; t: number; setting: SettingId; power: Power }
  | { type: 'starting-text-confirmed'; t: number; text: string }
  /** The form is the convenor's even when the number is the room's (§9.0a). */
  | { type: 'quorum-form-set'; t: number; form: 'count' | 'share' }
  | { type: 'identity-set'; t: number; member: MemberId;
      name?: string | null; picture?: string | null }
  /* -- the roster (§9.6a: membership begins at first arrival) ------------- */
  | { type: 'member-invited'; t: number; member: MemberId; email: string;
      viaMotion?: MotionId }
  | { type: 'member-uninvited'; t: number; member: MemberId }
  | { type: 'member-arrived'; t: number; member: MemberId }
  | { type: 'member-removed'; t: number; member: MemberId; viaMotion: MotionId }
  /* -- the ceremony (§9.0a) ----------------------------------------------- */
  | { type: 'answer-given'; t: number; member: MemberId; setting: SettingId;
      value: SettingValue }
  | { type: 'question-resolved'; t: number; setting: SettingId; value: SettingValue;
      distribution: SettingValue[]; electorate: MemberId[] }
  /** Founding questions only — motions have no electorate shift (v0.48). */
  | { type: 'ceremony-ground-shifted'; t: number; settings: SettingId[];
      cause: 'arrival' | 'departure'; member: MemberId }
  | { type: 'constituted'; t: number }
  /* -- owed decisions (§9.6a: inheritance as unacknowledged decisions) ---- */
  | { type: 'ok-owed'; t: number; member: MemberId; settings: SettingId[] }
  | { type: 'ok-given'; t: number; member: MemberId; setting: SettingId }
  /* -- motions (§9.6, v0.48) ---------------------------------------------- */
  | { type: 'motion-opened'; t: number; motion: MotionId; by: MemberId | null;
      payload: MotionPayload; route: MotionRoute; stake: number; why?: string }
  | { type: 'motion-answer'; t: number; motion: MotionId; member: MemberId;
      answer: MotionAnswer }
  | { type: 'motion-withdrawn'; t: number; motion: MotionId }
  /** Constitutional: the live-electorate settle check fired. Applies the payload in the fold. */
  | { type: 'motion-carried'; t: number; motion: MotionId }
  /** Ordinary-route seam: the host/engine ran the race and reports the outcome. */
  | { type: 'motion-adjudicated'; t: number; motion: MotionId;
      outcome: 'carried' | 'held' }
  /* -- the crown (§9.7) --------------------------------------------------- */
  /** A 👑 question: on a parked motion, or (Q440, 2026-08-21) on a text
   *  adoption the engine has already made while the founder holds 🛡️ on
   *  the Text — then `motion` is null and `text` names the candidate.
   *  Absent `text` means a motion question, so older logs read unchanged. */
  | { type: 'crown-question-opened'; t: number; question: CrownQuestionId;
      motion: MotionId | null; text?: { candidateId: string; summary: string } }
  | { type: 'crown-question-answered'; t: number; question: CrownQuestionId;
      outcome: 'accept' | 'reject' }
  | { type: 'crown-question-auto-passed'; t: number; question: CrownQuestionId }
  | { type: 'setting-handed-over'; t: number; setting: SettingId }
  | { type: 'crown-lapsed'; t: number }
  | { type: 'crown-returned'; t: number }
  /* -- presence and the freeze (§9.5, §9.5a) ------------------------------ */
  | { type: 'signed-out'; t: number; member: MemberId; mode: 'holding' | 'abstaining' }
  | { type: 'member-returned'; t: number; member: MemberId }
  | { type: 'lapse-warned'; t: number; member: MemberId }
  | { type: 'member-lapsed'; t: number; member: MemberId }
  | { type: 'frozen'; t: number }
  | { type: 'thawed'; t: number }
  /** Follow-on of every roster change (§9.3/Q10): the gazette's floor announcement. */
  | { type: 'floor-recomputed'; t: number; E: number; quorumN: number | null;
      floorTerm: number }
  /* -- applications (§9.7½) ----------------------------------------------- */
  | { type: 'application-started'; t: number; applicant: ApplicantId; email: string }
  | { type: 'application-verified'; t: number; applicant: ApplicantId }
  | { type: 'application-submitted'; t: number; applicant: ApplicantId;
      name?: string; picture?: string; words?: string }
  | { type: 'application-proposed'; t: number; applicant: ApplicantId; by: MemberId }
  | { type: 'member-admitted'; t: number; applicant: ApplicantId; member: MemberId }
  | { type: 'application-refused'; t: number; applicant: ApplicantId }
  /** Clock-driven bookkeeping rides through one host-called tick (no wall clock here). */
  | { type: 'tick'; t: number };

/**
 * The event format this build writes. Bump it when an event's *shape*
 * changes in a way a reader must know about — a field gaining a meaning,
 * a value changing units — never for a new event type, which old readers
 * simply do not encounter, and never for a change confined to the fold.
 */
export const SCHEMA_VERSION = 1;

export interface LogEntry {
  seq: number;
  hash: string;
  prevHash: string;
  event: ConstitutionEvent;
  /**
   * The format `event` was written in (Q480(a), PRODUCTION.md stage 5).
   * On the envelope rather than inside the event, which is what the
   * stage-6 schema stores it as (a column beside `event jsonb`) and what
   * lets an entry written before versioning existed stay valid: the hash
   * covers the event alone, so adding this broke no chain, and **absent
   * means 1** — `versionOf` is the only sanctioned way to read it.
   *
   * The cost, stated plainly because it is the reason (b) was offered:
   * being outside the hash, this field is not tamper-evident. Anyone who
   * could rewrite it could rewrite the projection beside it, so it buys
   * nothing an attacker does not already have; an event whose shape truly
   * changes may still carry its own version *inside* the hashed payload,
   * and versioned and unversioned events sit in one chain quite happily.
   */
  schemaVersion?: number;
}

/** The format an entry was written in; absent means 1 (Q480). */
export function versionOf(entry: Pick<LogEntry, 'schemaVersion'>): number {
  return entry.schemaVersion ?? 1;
}

/* -- fold state records (exposed read-only through projections) ----------- */

export interface MemberRecord {
  id: MemberId;
  email: string;
  invitedAtT: number;
  arrivedAtT: number | null;
  removed: boolean;
  lapsed: boolean;
  lapseWarned: boolean;
  signedOut: 'holding' | 'abstaining' | null;
  name: string | null;
  picture: string | null;
  lastActivityT: number;
  /** Settings this member has been told they are owed an OK on, minus OKs given. */
  okOwed: Set<SettingId>;
  okGiven: Set<SettingId>;
}

export type SettledBy = 'convenor' | 'ceremony' | 'motion' | 'crown';

export interface SettingState {
  id: SettingId;
  /** Derived from powers: the convenor's iff any power is held (§9.7 v0.54). */
  holder: 'convenor' | 'members';
  /** The crown powers held on this setting (§9.7 v0.54). */
  powers: Powers;
  value: SettingValue | null;
  settledBy: SettledBy | null;
  settledAtT: number | null;
  /** A delegated question, while it collects (pre-resolution). */
  collecting: boolean;
  answers: Map<MemberId, SettingValue>;
  distribution: SettingValue[] | null;
}

export type MotionStatus = 'running' | 'carried' | 'held' | 'withdrawn' | 'awaiting-crown';

export interface MotionRecord {
  id: MotionId;
  by: MemberId | null;
  payload: MotionPayload;
  route: MotionRoute;
  stake: number;
  openedAtT: number;
  /** The rationale, public like the amendment itself (authorship stays sealed). */
  why: string | null;
  status: MotionStatus;
  answers: Map<MemberId, MotionAnswer>;
  settledAtT: number | null;
}

export interface CrownQuestionRecord {
  id: CrownQuestionId;
  /** The parked motion, or null for a text adoption awaiting assent (Q440). */
  motion: MotionId | null;
  /** Set on a text question: which engine candidate adopted, and a summary for the card. */
  text?: { candidateId: string; summary: string };
  openedAtT: number;
  status: 'pending' | 'accepted' | 'rejected' | 'auto-passed';
}

export type ApplicationStatus =
  | 'started' | 'verified' | 'submitted' | 'proposed' | 'admitted' | 'refused';

export interface ApplicantRecord {
  id: ApplicantId;
  email: string;
  status: ApplicationStatus;
  name: string | null;
  picture: string | null;
  words: string | null;
  motion: MotionId | null;
}
