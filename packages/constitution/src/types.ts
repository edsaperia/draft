/**
 * Event vocabulary and public record shapes (SPEC §9, v0.48). All events
 * carry a caller-supplied non-decreasing t; everything state-affecting
 * happens in the fold (session.ts), never in the command layer; follow-on
 * emission (the maybeAdopt pattern) happens only in commands.
 *
 * Blindness note (NOTES.md): answers ride in events in plaintext — the
 * projection layer (view.ts) is what withholds. The log is not a member
 * surface; view() is the only sanctioned member-facing read path.
 *
 * **Identity never rides an event** (decision 1253, 2026-09-08): a person's
 * email, name and picture live in a `People` row keyed by `PersonId`
 * (people.ts), and every event that used to carry one carries the id instead.
 * The hash chain covers events, so erasing a row breaks no hash.
 */

import type { MotionRoute, SettingId } from './catalogue.js';
import type { SettingValue } from './values.js';
import type { ShapeName } from './shapes.js';
import type { PersonId } from './people.js';

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

/**
 * **The doors** (entry 94, Ed 2026-08-26): ✉️ where invitations are made
 * and ❌ where removals are. A door is not a setting — it has no value, and
 * what an act at it costs is a setting of its own (🪪, 🥾) — but it holds
 * the founder's ✒️/🛡️ pair exactly as a setting does, over the *act*
 * rather than the rule: ✒️ invites or exiles at will, 🛡️ refuses any one
 * invitation or removal. So a door is a `SettingState` in the same map,
 * born with both powers, relinquished one-way, lapsing into assent, and
 * every reader of powers meets it without learning a second kind of thing
 * — the Text (Q440) set the precedent. The pen is any unilateral act in
 * the document; the founder only starts with it.
 */
export type DoorId = 'door:invite' | 'door:remove';
export const DOORS: readonly DoorId[] = ['door:invite', 'door:remove'];
/** Anything that carries a crown pair: a managed setting, the Text, a door. */
export type PowerKey = SettingId | DoorId;
export function isDoor(key: PowerKey): key is DoorId {
  return key === 'door:invite' || key === 'door:remove';
}

/** §9.7 v0.54: holder derives from powers — the convenor's iff any is held. */
export function holderOf(powers: Powers): 'convenor' | 'members' {
  return powers.unilateral || powers.assent ? 'convenor' : 'members';
}

/** What a motion proposes. Membership changes ride motions as actions, never as a scalar. */
export type MotionPayload =
  | { kind: 'set'; setting: SettingId; value: SettingValue }
  /** The invitee's person row holds the address (decision 1253). */
  | { kind: 'invite'; person: PersonId }
  | { kind: 'remove'; member: MemberId }
  | { kind: 'admit'; applicant: ApplicantId }
  // returning powers to the convenor's reserve (§9.7 v0.52; v0.54 names
  // which — omitted means both, the pre-v0.54 behaviour; Q394)
  | { kind: 'reserve'; setting: SettingId; power?: Power | 'both' }
  /**
   * ✒️ on the Text (R-058, Q1020): the Founder's amendment to the document's
   * own words, which passed the instant it was submitted. It carries no
   * `setting` — the document's text is not a managed value — so the readers
   * that file a motion behind a rule (`settledMotionsFor`, `lastAmendment`,
   * `stoodBefore`) skip it by construction, and the ones that describe an
   * amendment (`amendmentBlocks`) learn the kind. **Additive**: every existing
   * site narrows with `payload.kind === '<kind>'` rather than switching
   * exhaustively, so nothing breaks by omission.
   */
  | { kind: 'text'; candidateId: string; summary: string };

/** What `open` is handed: the founder as the host knows them. The fields go
 *  to the person row; only `ConvenorRef` reaches the log. */
export interface ConvenorInput {
  id: MemberId;
  email: string;
  /** The hat question: ticked = the convenor invites themselves (§9.6a). */
  isMember: boolean;
  name?: string;
  picture?: string;
}

/**
 * The founder as the `created` event records them (decision 1253): the seat,
 * the person row, the hat — and, only where the input carried one, that a
 * name or picture arrived with them, which is Q645's *answered* flag for the
 * founder. Both optional, so the common birth serialises without them.
 */
export interface ConvenorRef {
  id: MemberId;
  person: PersonId;
  isMember: boolean;
  nameSet?: true;
  pictureSet?: true;
}

export type ConstitutionEvent =
  /* -- creation and the pre-start free hand (§9.6a, §9.7a) ---------------- */
  /**
   * `shape` (entry 166) is the 🧭 choice the founder made before the birth,
   * **optional on purpose** like `why` below: absent, the event serialises
   * exactly as it did before the field existed and every older log replays
   * bit-identically. The shape's own values are not on this event — the
   * save folds them as the convenor's `setting-set` events right after it.
   */
  | { type: 'created'; t: number; title: string; slug: string; convenor: ConvenorRef;
      shape?: ShapeName }
  | { type: 'convenor-membership-set'; t: number; isMember: boolean }
  /**
   * The convenor's own hand on a setting. `why` is the reason they gave for
   * it (Q530) and is **optional on purpose**: `stableStringify` drops
   * undefined keys, so an event without one serialises exactly as it did
   * before this field existed and every log written before today replays
   * bit-identically. `motion-opened` has carried the same field, spelled
   * the same way, since it existed.
   */
  | { type: 'setting-set'; t: number; setting: SettingId; value: SettingValue;
      by: 'convenor' | 'crown'; why?: string }
  | { type: 'setting-delegated'; t: number; setting: SettingId }
  | { type: 'setting-reclaimed'; t: number; setting: PowerKey }
  /** One crown power given up — free, separate, one-way (§9.7 v0.54). On a door, over the act. */
  | { type: 'power-relinquished'; t: number; setting: PowerKey; power: Power }
  | { type: 'starting-text-confirmed'; t: number; text: string }
  /**
   * ✒️ on the Text after the start (Ed, 2026-08-27, backlog entry 160;
   * Q1020, R-058): the Founder's amendment passed the instant they submitted
   * it, and this is the constitution's record of it. The words themselves are
   * the engine's — `candidateId` is the decreed candidate and `summary` a
   * short blind line for the record; the document is its own record of what
   * it says, so no before-and-after wording rides here.
   *
   * `why` is the reason they gave, **optional and blank-is-real**, exactly as
   * `setting-set`'s is: `stableStringify` drops undefined keys, so nothing
   * about any older log moves. The fold turns it into a `route: 'pen'` motion
   * record — an amendment joins the motions where every other amendment lives
   * (R-004) — and owes 📄's OK to every arrived member but the Founder.
   */
  | { type: 'text-amended'; t: number; candidateId: string; summary: string; why?: string }
  /** The form is the convenor's even when the number is the room's (§9.0a). */
  | { type: 'quorum-form-set'; t: number; form: 'count' | 'share' }
  /**
   * **The act, never the value** (Q645; decision 1253): a flag present says
   * the member answered that question, and the answer itself — a name, a
   * picture, or the blank that is a real answer — went to their person row.
   */
  | { type: 'identity-set'; t: number; member: MemberId;
      nameSet?: true; pictureSet?: true }
  /* -- the roster (§9.6a: membership begins at first arrival) ------------- */
  /** `viaMotion` where a motion carried it; `by` where a member's own word
   *  did, 🪪 standing at ✒️ (entry 94, Q2b); neither is the founder's pen.
   *  `person` is the row holding the address (decision 1253). */
  | { type: 'member-invited'; t: number; member: MemberId; person: PersonId;
      viaMotion?: MotionId; by?: MemberId }
  | { type: 'member-uninvited'; t: number; member: MemberId }
  | { type: 'member-arrived'; t: number; member: MemberId }
  /** `viaMotion` where a motion carried it; `by` 'convenor' for exile at
   *  will (❌'s ✒️), 'self' for a resignation; absent both, an old log's
   *  motion. Immediate in every case: standing answers leave with them. */
  | { type: 'member-removed'; t: number; member: MemberId; viaMotion?: MotionId;
      by?: 'convenor' | 'self' }
  /* -- the ceremony (§9.0a) ----------------------------------------------- */
  | { type: 'answer-given'; t: number; member: MemberId; setting: SettingId;
      value: SettingValue }
  | { type: 'question-resolved'; t: number; setting: SettingId; value: SettingValue;
      distribution: SettingValue[]; electorate: MemberId[] }
  /** Founding questions only — motions have no electorate shift (v0.48). */
  | { type: 'ceremony-ground-shifted'; t: number; settings: SettingId[];
      cause: 'arrival' | 'departure'; member: MemberId }
  /**
   * 🍾. **The start lays down whatever it was not told to keep** (Ed,
   * 2026-08-27, entry 158; Q1018, R-057, overturning Q387 / R-043's first
   * clause). The Begin card carries a switch per zone × power, and what it
   * collected rides the event: one act, one `t`, so entry 162 reports the
   * whole of it as one news card. **Optional is load-bearing.** Absent means
   * the old fold — the Text's pair down and nothing else — so every log
   * already on disk replays byte for byte; present, the list is authoritative
   * and complete over `HELD`, and an empty list therefore keeps everything,
   * the Text included. Derived at the fold rather than emitted per release,
   * like the Text's own lay-down and Q506's applications pair.
   */
  | { type: 'constituted'; t: number;
      laidDown?: Array<{ setting: PowerKey; power: Power }> }
  /* -- owed decisions (§9.6a: inheritance as unacknowledged decisions) ---- */
  | { type: 'ok-owed'; t: number; member: MemberId; settings: SettingId[] }
  | { type: 'ok-given'; t: number; member: MemberId; setting: SettingId }
  /* -- powers laid down (§9.7 rule 3, SURFACE C8a) ------------------------ */
  /**
   * **What one act lays down is one news entry** (Ed, 2026-08-27, entry 162;
   * Q1013, extending R-044). Laying a power down is news owed to every member,
   * and 🍾 can lay down thirty-four of them in one press — so the owed object
   * is the **batch**, not the power: one event per member, exactly as `ok-owed`
   * is emitted, carrying every release the act made. `setting` is a `PowerKey`
   * rather than a `SettingId`, which is what makes the two doors and the Text
   * expressible. A batch grows by re-emitting under the same `batch` id, so
   * nothing already in the log is ever rewritten.
   */
  | { type: 'release-owed'; t: number; batch: string; member: MemberId;
      releases: Array<{ setting: PowerKey; power: Power }> }
  | { type: 'release-ok'; t: number; batch: string; member: MemberId }
  /* -- a text amendment the Founder's pen made (SURFACE E35, Q1034) -------- */
  /**
   * **A text amendment is news beside the clause it changed** (Ed, 2026-08-29,
   * decision D47, answering Q1021; R-058). `release-owed`'s shape — one event
   * per member, the audience rule of `ok-owed` — and deliberately **not** its
   * batching: 🍾 lays down thirty-four powers that belong to no clause and they
   * are one card, where one ✒️ commit is one amendment at one place and the
   * card's whole job is to name that place. Two amendments are two cards.
   *
   * The candidate id is the whole of what is remembered: the motion record
   * `pen:text:<candidate>` already holds the summary, the reason and the
   * moment, and the engine holds the wording.
   */
  | { type: 'amendment-owed'; t: number; candidate: string; member: MemberId }
  | { type: 'amendment-ok'; t: number; candidate: string; member: MemberId }
  /* -- mail that gave up (SURFACE E34, Q947 (c), backlog 173) -------------- */
  /**
   * **One sender pass's worth of dead mail is one piece of news** (entry 162's
   * rule applied to mail). The outbox gives up on a row at its attempt cap and
   * revokes the token it carried; until this event the fact lived nowhere a
   * member could read it. The batch is the act — one pass — so a pass that
   * killed three mails is one card and one OK, exactly as a release batch is.
   *
   * `member` is who is *told*, and it is **null when nobody was**: the
   * subjects still have to be recorded, because the founder's ✉️ row reads
   * the subject's own flag rather than anybody's owed set, and a document
   * whose founder is a clerk has no member to tell. `people` rides every
   * copy of the event, so the fold marks the subjects whichever one it meets
   * first and the batch's contents never need a second event. **Persons, not
   * addresses** (decision 1253): the address is read off the row at view time.
   */
  | { type: 'mail-gave-up'; t: number; batch: string; member: MemberId | null;
      people: PersonId[] }
  | { type: 'mail-gave-up-ok'; t: number; batch: string; member: MemberId }
  /** 📨: the founder puts the invitation back in the queue (SURFACE E34). */
  | { type: 'mail-resent'; t: number; member: MemberId; by: MemberId }
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
  /** Passed by no hand: the crown's clock (`lapse`, the default — a log
   *  written before Q1033 carries no `cause` and reads as it always did) or
   *  a seat nobody occupies (`vacancy`, R-060 and Q1033). The record keeps
   *  the cause, so it can say the seat was vacant rather than that the
   *  convenor agreed. */
  | { type: 'crown-question-auto-passed'; t: number; question: CrownQuestionId;
      cause?: 'lapse' | 'vacancy' }
  | { type: 'setting-handed-over'; t: number; setting: PowerKey }
  | { type: 'crown-lapsed'; t: number }
  | { type: 'crown-returned'; t: number }
  /* -- presence (§9.5, §9.5a) --------------------------------------------- */
  /** legacy (v0.99, Q1196): there is no sign-out; a log written before R-088 replays this as a no-op. */
  | { type: 'signed-out'; t: number; member: MemberId; mode: 'holding' | 'abstaining' }
  /** Coming back. Absent `cause` is the member's own return — logging in;
   *  `rule` is 💤 re-read (entry 97) returning them by a change of rule
   *  they did not make, which is what a 💤 change line names (Y26, Q902). */
  | { type: 'member-returned'; t: number; member: MemberId; cause?: 'rule' }
  /** One of the three warnings (R-097): `lead` is how long before the lapse it went, in ms. */
  | { type: 'lapse-warned'; t: number; member: MemberId; lead: number }
  /** Presence is presence (Q459a): an authenticated read refreshed the member's clock — at most hourly. */
  | { type: 'member-seen'; t: number; member: MemberId }
  | { type: 'member-lapsed'; t: number; member: MemberId }
  /** legacy (v0.99, Q1196): there is no freeze; replays as a no-op. */
  | { type: 'frozen'; t: number }
  /** legacy (v0.99, Q1196): there is no thaw; replays as a no-op. */
  | { type: 'thawed'; t: number }
  /** Follow-on of every roster change (§9.3/Q10): the gazette's floor announcement. */
  | { type: 'floor-recomputed'; t: number; E: number; quorumN: number | null;
      floorTerm: number }
  /* -- applications (§9.7½) ----------------------------------------------- */
  /** `person` is the row holding the address (decision 1253). */
  | { type: 'application-started'; t: number; applicant: ApplicantId; person: PersonId }
  | { type: 'application-verified'; t: number; applicant: ApplicantId }
  /** Name and picture went to the row; `words` is free text and stays
   *  (stage 12's second part, redaction at the projection, is not this). */
  | { type: 'application-submitted'; t: number; applicant: ApplicantId; words?: string }
  | { type: 'application-proposed'; t: number; applicant: ApplicantId; by: MemberId }
  | { type: 'member-admitted'; t: number; applicant: ApplicantId; member: MemberId }
  | { type: 'application-refused'; t: number; applicant: ApplicantId }
  /** The close (SPEC §4.6): the clock reached the ending; nobody pressed anything. */
  | { type: 'closed'; t: number }
  /** A constitutional motion unresolved at T=0: what stands stands (SPEC §4.6). */
  | { type: 'motion-kept-at-close'; t: number; motion: MotionId }
  /** A 👑 question pending at T=0 fails closed — carried-but-unassented (SPEC §4.6). */
  | { type: 'crown-failed-closed'; t: number; question: CrownQuestionId }
  /** An invitation outstanding at T=0: nothing left to join, only to read (SPEC §4.6). */
  | { type: 'invitation-expired'; t: number; member: MemberId }
  /** The closing acknowledgment IS the signature; the comment is its rationale (SPEC §4.6). */
  | { type: 'close-acknowledged'; t: number; member: MemberId; comment: string }
  /** Clock-driven bookkeeping rides through one host-called tick (no wall clock here). */
  | { type: 'tick'; t: number };

/**
 * The event format this build writes. Bump it when an event's *shape*
 * changes in a way a reader must know about — a field gaining a meaning,
 * a value changing units — never for a new event type, which old readers
 * simply do not encounter, and never for a change confined to the fold.
 *
 * 2 (2026-09-08, decision 1253): identity left the events for the `People`
 * rows. **A log holding any entry below `PEOPLE_SCHEMA_VERSION` is refused
 * by `replay`, never read** — the alpha's documents were wiped rather than
 * migrated, so nothing in a store carries the old shape, and a reader that
 * met one would fold an event with no `person` into a roster of ghosts.
 */
export const SCHEMA_VERSION = 2;
/** The first version whose events carry person ids and no identity. */
export const PEOPLE_SCHEMA_VERSION = 2;

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

/**
 * How somebody came to be a member (Q524, Ed 2026-08-21). A power arriving
 * unattributed reads as weather, and 🏛️ — the voice every member holds — is
 * conferred by whoever brought them in. Derived wholly from events that
 * already exist (`member-invited` has carried `viaMotion` from the start),
 * so this adds no event shape and leaves the hash chain untouched.
 *
 *  founding    — the convenor, who made the document and was in it from the
 *                first moment; `by` is null, because nobody let them in.
 *  invitation  — invited: `by` is 'convenor' where the convenor's own
 *                drafting power did it, 'members' where a motion carried it,
 *                'member' where one member's word did (🪪 at ✒️, entry 94) —
 *                and then `inviter` names them, because the promise-coverage
 *                audit of 🪪 wants to know who exercised the price (Ed, Q2b).
 *  application — admitted on their own application, by the membership.
 */
export type ArrivalVia = 'founding' | 'invitation' | 'application';
export interface Arrival {
  via: ArrivalVia;
  by: 'convenor' | 'members' | 'member' | null;
  inviter?: MemberId;
}

/** How a member left (entry 94): a motion, the founder's exile at will, or their own resignation. */
export type DepartureBy = 'members' | 'convenor' | 'self';

/** Where a held crown power came from (Q524): the birth, or a reserve motion. */
export type PowerSource = 'founding' | 'motion';

/**
 * What the fold holds about a member: everything the log says, and the
 * `person` whose row says the rest. **No email, name or picture** — those are
 * read off the row at read time (decision 1253), which is what lets an
 * erasure take effect without a log entry.
 */
export interface MemberState {
  id: MemberId;
  person: PersonId;
  invitedAtT: number;
  arrivedAtT: number | null;
  /** How this member got in, and whose act it was (Q524). */
  arrival: Arrival;
  removed: boolean;
  /** Whose act the removal was, null while they are here (entry 94). */
  removedBy: DepartureBy | null;
  lapsed: boolean;
  /** At least one of the three warnings has gone in this quiet spell (R-097). */
  lapseWarned: boolean;
  /** The shortest lead warned for in this quiet spell, null where none has been — what the next warning is judged against. */
  lapseWarnedLead: number | null;
  /**
   * Whether this member has ever *answered* ✋ and 🖼️ (Q645). Null is not the
   * answer to that question: a blank name is a real answer — §9.0c shows it as
   * **Anonymous**, "a name, not a gap" — and a picture is removed by choosing
   * initials, so `name === null` covers both *never asked* and *asked, left
   * empty*. The surface has to tell those apart to know whether the task is
   * still owed, so the fold records the act rather than inferring it from the
   * value. Folded from the `identity-set` events the log already carries, like
   * `arrival` (Q524) and `previousValue` (Q530): no new event, no envelope
   * change, hash chain untouched.
   */
  nameSet: boolean;
  pictureSet: boolean;
  lastActivityT: number;
  /** Settings this member has been told they are owed an OK on, minus OKs given. */
  okOwed: Set<SettingId>;
  okGiven: Set<SettingId>;
  /**
   * Release batches this member is owed an OK on, minus the ones they have
   * given (entry 162, Q1013). **Separate from `okOwed` on purpose**: a release
   * is news about a *power*, not about a value, so landing it in `okOwed`
   * would fire the setting's own value-news card with the wrong copy — and
   * `syncOwedOks` would then resurrect it. The batch's contents live once on
   * the session (`releaseBatchRecords`), never copied per member.
   */
  releasesOwed: Set<string>;
  releasesGiven: Set<string>;
  /**
   * Text amendments the Founder's pen made that this member is owed the news
   * of, minus the ones they have acknowledged (SURFACE E35, Q1034), by
   * candidate id. **Separate from `okOwed` for `releasesOwed`'s own reason**:
   * this is news about a clause, not about a setting's value, and landing it
   * in `okOwed` would fire 📄's own value-news card with the wrong copy — which
   * is exactly the reading Ed's ruling of 2026-08-29 replaced. Nothing of the
   * amendment is copied here: the motion record `pen:text:<candidate>` holds
   * its summary and its reason, and the engine holds the wording.
   */
  amendmentsOwed: Set<string>;
  amendmentsGiven: Set<string>;
  /**
   * Mail-give-up batches this member is owed the news of, minus the ones they
   * have acknowledged (SURFACE E34). **Separate from `okOwed` for
   * `releasesOwed`'s own reason**: this is news about a mail, not about a
   * value, and landing it in `okOwed` would fire a setting's value-news card
   * with the wrong copy. The addresses live once on the session
   * (`mailGiveUpBatchRecords`), never copied per member.
   */
  mailGaveUpOwed: Set<string>;
  mailGaveUpGiven: Set<string>;
  /**
   * **The subject's own flag**, not the audience's: true when a mail to *this*
   * address reached the outbox's attempt cap, cleared by a re-send. It is what
   * the founder's ✉️ row under *Invitees* reads to say *that did not send*,
   * and it is live state where the batches above are history.
   */
  mailGaveUp: boolean;
  /** An invitation that expired unopened at the close (SPEC §4.6). */
  invitationExpired: boolean;
  /** The member's closing acknowledgment — signature and comment (SPEC §4.6). */
  closingAck: { t: number; comment: string } | null;
}

/**
 * A member as a reader meets them: the fold's state plus the person row
 * resolved at read time. `erased` is true, and the three fields null, where
 * the row the log names is gone (decision 1253).
 */
export interface MemberRecord extends MemberState {
  email: string | null;
  name: string | null;
  picture: string | null;
  erased: boolean;
}

/**
 * One act's worth of laid-down powers (entry 162, Q1013). The contents are
 * kept here, once, rather than copied into every member's record: the members
 * hold only the id. Folded from the `release-owed` events themselves, so a
 * replay rebuilds it without anything new being written down.
 */
export interface ReleaseBatchRecord {
  id: string;
  t: number;
  releases: Array<{ setting: PowerKey; power: Power }>;
}

/**
 * One sender pass's worth of mail that gave up (SURFACE E34), folded from the
 * `mail-gave-up` events themselves like `ReleaseBatchRecord`. The subjects are
 * kept here, once, as person ids; the members hold only the batch id, and the
 * view reads each address off its row (decision 1253).
 */
export interface MailGiveUpBatchRecord {
  id: string;
  t: number;
  people: PersonId[];
}

export type SettledBy = 'convenor' | 'ceremony' | 'motion' | 'crown';

export interface SettingState {
  /** A managed setting, the Text, or a door (entry 94) — whatever carries a crown pair. */
  id: PowerKey;
  /** Derived from powers: the convenor's iff any power is held (§9.7 v0.54). */
  holder: 'convenor' | 'members';
  /** The crown powers held on this setting (§9.7 v0.54). */
  powers: Powers;
  /**
   * Where each *currently held* power came from (Q524), null where it is not
   * held: 'founding' if it has been the convenor's since the birth (a
   * pre-start reclaim included — §9.6a makes that a re-set, not a grant),
   * 'motion' if the membership put it back with a carried `reserve`.
   */
  powerFrom: { unilateral: PowerSource | null; assent: PowerSource | null };
  /**
   * A power laid down **before the start**, which takes effect at 🍾 (§9.7
   * rule 3, R-048). The act is recorded when it is made — the log carries the
   * `power-relinquished` event and the clause says so — but the power is
   * still the convenor's until `constituted`, so nothing else in the module
   * has to ask whether a holder is a real one. `reclaim` clears it, which is
   * what keeps a pre-start release as revisable as any other pre-start act.
   * Both flags are false at every moment after the start: the fold at
   * `constituted` spends them into `powers` and never sets one again.
   */
  pendingRelease: Powers;
  value: SettingValue | null;
  /**
   * What this setting held before the convenor last set it directly, and the
   * reason they gave (Q530). Both stay null until the pen changes a value
   * that already stood — which is exactly what tells a **first decision**
   * from a **change**, and so what the acknowledgement keys on: nobody is
   * owed a receipt for the founder answering a question for the first time.
   * Folded from `setting-set` events the log already carried, so no event
   * shape changed to get it and the hash chain is untouched.
   *
   * Only the convenor's direct hand moves them. A carried motion changes a
   * value too, but the room watched that happen and voted on it; there is
   * nothing to announce.
   */
  previousValue: SettingValue | null;
  setWhy: string | null;
  settledBy: SettledBy | null;
  settledAtT: number | null;
  /**
   * Who the latest set of this setting returned from lapse (Y26, Q902):
   * 💤 turned off or lengthened past somebody's quiet returns them at once
   * (entry 97), and the change line names them. Reset by every set; only
   * ever filled on `lapse`.
   */
  returned: MemberId[];
  /** A delegated question, while it collects (pre-resolution). */
  collecting: boolean;
  answers: Map<MemberId, SettingValue>;
  distribution: SettingValue[] | null;
}

export type MotionStatus = 'running' | 'carried' | 'held' | 'withdrawn' | 'awaiting-crown'
  /** Unresolved at the close (SPEC §4.6): what stands stands, the mover's 🏛️ returns. */
  | 'kept-at-close';

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
  /** `failed-closed`: pending at T=0 (SPEC §4.6) — carried-but-unassented, into the backlog. */
  status: 'pending' | 'accepted' | 'rejected' | 'auto-passed' | 'failed-closed';
  /**
   * How an `auto-passed` question passed (Q1033): the crown's lapse — its
   * holder's silence, abstaining grants — or a vacant seat, which cannot
   * refuse anything because nobody sits in it. Null on every other status.
   */
  autoPassedBy: 'lapse' | 'vacancy' | null;
}

export type ApplicationStatus =
  | 'started' | 'verified' | 'submitted' | 'proposed' | 'admitted' | 'refused';

/** The fold's state about an applicant: the log's facts and the person row's id. */
export interface ApplicantState {
  id: ApplicantId;
  person: PersonId;
  status: ApplicationStatus;
  words: string | null;
  motion: MotionId | null;
}

/** An applicant as a reader meets them — the row resolved (decision 1253). */
export interface ApplicantRecord extends ApplicantState {
  email: string | null;
  name: string | null;
  picture: string | null;
  erased: boolean;
}
