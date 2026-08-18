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

/** What a motion proposes. Membership changes ride motions as actions, never as a scalar. */
export type MotionPayload =
  | { kind: 'set'; setting: SettingId; value: SettingValue }
  | { kind: 'invite'; email: string }
  | { kind: 'remove'; member: MemberId }
  | { kind: 'admit'; applicant: ApplicantId }
  // returning an unreserved setting to the convenor's reserve (§9.7 v0.51)
  | { kind: 'reserve'; setting: SettingId };

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
  | { type: 'crown-question-opened'; t: number; question: CrownQuestionId;
      motion: MotionId }
  | { type: 'crown-question-answered'; t: number; question: CrownQuestionId;
      outcome: 'accept' | 'reject' }
  | { type: 'crown-question-auto-passed'; t: number; question: CrownQuestionId }
  | { type: 'setting-unreserved'; t: number; setting: SettingId }
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

export interface LogEntry {
  seq: number;
  hash: string;
  prevHash: string;
  event: ConstitutionEvent;
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
  /** Who holds it now — reserved means the convenor (§9.7). */
  holder: 'convenor' | 'members';
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
  motion: MotionId;
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
