/**
 * ConstitutionSession (SPEC §9, v0.48) — the §9 layer as an event-sourced
 * fold, engine-core's Session pattern exactly: commands validate → emit →
 * apply; everything state-affecting happens in the fold, never the command
 * layer; follow-on emission (the maybeAdopt pattern) happens only in
 * commands; caller-supplied non-decreasing t; hash-chained log with
 * static replay() re-verifying and re-folding bit-identically.
 *
 * What is left in this file is that command layer and the plain reads. The
 * fold itself is `fold.ts` (Q1352 (s)), the motions `motions.ts` (r), the
 * acknowledgements `owed.ts` (q). `emit` and `replay` stay here, being the
 * only two doors into the fold and the only writers of the log — and the
 * fold's state is one field, `this.fold`, read through getters of the names
 * it used to be declared under.
 */

import { chainHash } from './hash.js';
import type {
  ApplicantRecord, ConstitutionEvent, ConvenorInput, ConvenorRef,
  CrownQuestionId, CrownQuestionRecord,
  LogEntry, MemberId, MemberRecord, MotionAnswer, MotionId,
  MotionRecord, Power, Powers, SettingState, DoorId, PowerKey,
  DepartureBy, ReleaseBatchRecord, MailGiveUpBatchRecord,
} from './types.js';
import { isDoor, PEOPLE_SCHEMA_VERSION, SCHEMA_VERSION, versionOf } from './types.js';
import type { People, PersonId, ResolvedPerson } from './people.js';
import { InMemoryPeople, resolvePerson } from './people.js';
import type { SettingId } from './catalogue.js';
import { CATALOGUE, entryOf, mayApply, validateFor } from './catalogue.js';
import type { ApplicationsValue, EndingValue, LapseValue, PaceValue,
  Price, PriceValue, QuorumValue, SettingValue, SlugValue, TextValue } from './values.js';
import { eqValue } from './values.js';
import { resolveConsent } from './consent.js';
import * as owed from './owed.js';
import type { OwedState } from './owed.js';
import * as motions from './motions.js';
import { CONSTITUTIONAL } from './motions.js';
// `MotionInput` moved with the code it names; index.ts has always published
// it from here, so the module's own exports do not move with the file.
import type { MotionInput } from './motions.js';
export type { MotionInput };
// The fold is `fold.ts` (Q1352 (s)); `MANAGED` and `HELD` are the catalogue
// derivations the birth folds over, so they moved with it and come back here
// for the commands and the readiness readouts that walk them.
import * as fold from './fold.js';
import { FoldState, HELD, MANAGED } from './fold.js';
import { eOf, inE, motionElectorateOf, quorumCount,
  adoptionFloorTerm } from './populations.js';
import { barAt } from './threshold.js';
import { lapseDue, warningDue } from './clocks.js';
import type { ShapeName } from './shapes.js';
import { shapeOf } from './shapes.js';

export interface OpenInput {
  title: string;
  slug: string;
  convenor: ConvenorInput;
  /** The 🧭 shape chosen before the birth (entry 166); absent is custom. */
  shape?: ShapeName;
}

/**
 * Why 🍾 is waiting on one question (Q826). Five of the six are a state the
 * founding will leave by itself; **`one-voice` is the one that needs an act** —
 * a delegated question with a membership of one has not been delegated to
 * anybody (`maybeResolve`), and no amount of answering will clear it.
 * The text holds nothing up since Q1080 (2026-08-29): 🍾 confirms whatever
 * stands where nothing ever did, in `begin`. `deps-unsettled` (entry 69) is a wait on
 * *another question* — §9.0a serves a dependent only once its dependency has
 * settled — so the block is upstream and the dependency's own hold names the
 * reason: a wait, never a dead end, and never a reason to invite anybody.
 */
export type WaitingWhy = 'judge-gate' | 'invitation-open' | 'one-voice'
  | 'collecting' | 'deps-unsettled';

/**
 * One hold on 🍾: which question, why, and — for `deps-unsettled` alone — the
 * settings it is waiting on, in catalogue order (entry 69). Named so that the
 * page and the tests read the module's own `on` rather than keeping a second
 * copy of the catalogue's `deps`.
 */
export interface WaitingHold {
  setting: SettingId;
  why: WaitingWhy;
  on?: SettingId[];
}

/**
 * **No legacy fold** (Q1329, Ed 2026-09-11: *we are still in alpha — please
 * get rid of old formats, there are no old documents*). The module once read
 * three older shapes onto the present ones at replay — 🪪 under its pre-Q903
 * id `membership`, 🤝's pre-Q506 `holder` and pre-entry-94 `joinPolicy`,
 * 🥾's pre-entry-94 `rung` — and replayed the pre-R-088 `signed-out` ·
 * `frozen` · `thawed` as no-ops. Every one of them is gone: an event naming
 * a setting the catalogue does not have, or carrying a value its entry does
 * not validate, **throws at the fold** (`readValue`), and an event type the
 * fold does not know throws as it always did. The host quarantines the
 * document rather than half-reading it (`DocStore.loadAll`, Q1322).
 */

/** Q459: a read refreshes the activity clock at most this often. */
const SEEN_EVERY_MS = 60 * 60_000;

export class ConstitutionSession {
  private log: LogEntry[] = [];

  /**
   * **The rows beside the log** (decision 1253): every person's email, name
   * and picture, keyed by the `PersonId` the events carry. An argument, never
   * a global — the host hands in the store's own; a test or the page hands in
   * an `InMemoryPeople`, which is also what a session gets when handed
   * nothing, that being the only sensible meaning of *no port*. The fold
   * never writes it; commands write it beside the event they emit; readers
   * resolve through it at read time, so an erased row reads as erased at once.
   */
  readonly people: People;

  constructor(people: People = new InMemoryPeople()) {
    this.people = people;
    this.fold = new FoldState(people);
  }

  // ---- the fold, and the session's own reads of it -------------------------
  //
  // **`fold.ts` writes; everything above and below it reads** (Q1352 (s)).
  // Every field that used to be declared here is `FoldState`'s, one object the
  // session owns, and the getters below keep the names the commands and the
  // projections have always used — `this.settings`, `this.members`,
  // `this.convenor` — so not one command body moved with the fold. None of
  // them is assignable, and that is the property worth having: after the
  // split the only code in the package that can assign a fold field is the
  // fold, which is what `replay` rebuilding bit-identically rests on.
  private readonly fold: FoldState;

  private get lastT() { return this.fold.lastT; }
  private get convenor() { return this.fold.convenor; }
  private get crownLapsedFlag() { return this.fold.crownLapsedFlag; }
  private get members() { return this.fold.members; }
  private get departed() { return this.fold.departed; }
  private get settings() { return this.fold.settings; }
  private get quorumFormValue() { return this.fold.quorumFormValue; }
  private get startingText() { return this.fold.startingText; }
  private get textConfirmedFlag() { return this.fold.textConfirmedFlag; }
  private get slugHistory() { return this.fold.slugHistory; }
  private get createdT() { return this.fold.createdT; }
  private get shapeName() { return this.fold.shapeName; }
  private get constitutedT() { return this.fold.constitutedT; }
  private get closedFlag() { return this.fold.closedFlag; }
  private get closedT() { return this.fold.closedT; }
  private get anchors() { return this.fold.anchors; }
  private get motions() { return this.fold.motions; }
  private get crownQuestions() { return this.fold.crownQuestions; }
  private get applicants() { return this.fold.applicants; }
  private get releaseBatches() { return this.fold.releaseBatches; }
  private get lastReleaseT() { return this.fold.lastReleaseT; }
  private get lastReleaseBatch() { return this.fold.lastReleaseBatch; }
  private get nextReleaseN() { return this.fold.nextReleaseN; }
  private get mailGiveUpBatches() { return this.fold.mailGiveUpBatches; }
  private get nextMailGiveUpN() { return this.fold.nextMailGiveUpN; }
  private get nextMemberN() { return this.fold.nextMemberN; }
  private get nextMotionN() { return this.fold.nextMotionN; }
  private get nextCrownN() { return this.fold.nextCrownN; }
  private get nextApplicantN() { return this.fold.nextApplicantN; }
  private get nextPersonN() { return this.fold.nextPersonN; }
  private get penFrom() { return this.fold.penFrom; }

  // -------------------------------------------------------------------------
  // Opening and replay

  static open(input: OpenInput, t: number, people?: People): ConstitutionSession {
    const s = new ConstitutionSession(people);
    if (!input.title.trim()) throw new Error('a document begins with its title (§9.7a)');
    const slugErr = validateFor(entryOf('link'), { slug: input.slug });
    if (slugErr) throw new Error(slugErr);
    // a shape the table does not know is refused here, before anything is
    // written — the server has already dropped anything but a row's name
    const shape = input.shape === undefined ? null : shapeOf(input.shape);
    // the founder's row first, the event after it (decision 1253): the log
    // names the person, the row holds who they are
    const c = input.convenor;
    const person = s.personFor(c.email);
    s.people.set(person, { email: c.email, name: c.name ?? null, picture: c.picture ?? null });
    const ref: ConvenorRef = { id: c.id, person, isMember: c.isMember,
      ...(c.name !== undefined ? { nameSet: true as const } : {}),
      ...(c.picture !== undefined ? { pictureSet: true as const } : {}) };
    s.emit({ type: 'created', t, title: input.title, slug: input.slug,
      convenor: ref,
      ...(shape === null ? {} : { shape: shape.name }) });
    // **The shape is folded as the founder's own sets** (entry 166, SPEC
    // §9.0a): ordinary `setting-set` events at the birth's own `t`, so the
    // values are *given* rather than defaulted — every setting stays
    // convenor-held with both powers and its question shut, nothing is
    // delegated (Q511's damage was *delegated from creation*), and nothing
    // is owed: `oweOks` skips the convenor and nobody else has arrived.
    // ⏰ first where the row has one, because `setSetting` refuses a 🪜
    // ramp under a perpetual ending and reads ⏰ to know; then the rest in
    // catalogue order, which is the order the band states them in.
    if (shape !== null) {
      const ids = Object.keys(shape.sets) as SettingId[];
      const ordered = [
        ...ids.filter((id) => id === 'ending'),
        ...CATALOGUE.map((e) => e.id).filter((id) => id !== 'ending' && ids.includes(id)),
      ];
      for (const id of ordered) s.setSetting(t, id, shape.sets[id]!);
    }
    return s;
  }

  /**
   * Rebuild a session by replaying a log (verifies the hash chain). The rows
   * are handed in, never rebuilt: replay writes nothing to `people`.
   *
   * **The pre-people shape is refused, never read** (decision 1253): an entry
   * written below `PEOPLE_SCHEMA_VERSION` carries addresses and names in the
   * event and no `person`, and folding it would make a roster of ghosts. The
   * alpha's documents were wiped rather than migrated, so a store never holds
   * one; a dev data dir might, until its own wipe, and the host skips the
   * document by name on this error rather than crashing.
   */
  static replay(log: LogEntry[], people?: People): ConstitutionSession {
    const s = new ConstitutionSession(people);
    const old = log.find((e) => versionOf(e) < PEOPLE_SCHEMA_VERSION);
    if (old !== undefined) {
      throw new Error(`entry ${old.seq} is schema version ${versionOf(old)}, below ` +
        `${PEOPLE_SCHEMA_VERSION}: the pre-people shape (decision 1253) is not read`);
    }
    let prev = '';
    for (const entry of log) {
      const expected = chainHash(prev, entry.event);
      if (entry.hash !== expected || entry.prevHash !== prev) {
        throw new Error(`hash chain broken at seq ${entry.seq}`);
      }
      s.log.push(entry);
      s.apply(entry.event, entry.seq);
      prev = entry.hash;
    }
    return s;
  }

  // -------------------------------------------------------------------------
  // Event plumbing

  private emit(event: ConstitutionEvent): void {
    // **A refused event must never reach the log** (Q679). The clock rule
    // lives in `apply`, which `emit` used to call *after* pushing — so a
    // backwards timestamp threw with the entry already in the chain, and
    // the entry was validly hashed, so `verifyChain` still passed and the
    // next `persist` wrote it out. `replay` then threw on it for ever:
    // the document became unloadable, quarantined at every boot, with a
    // log nothing could repair. Reachable, and not exotically: both
    // closes stamp themselves at the *ending* rather than at t
    // (`runClose(ending.endsAtMs)`, engine `runClose(windowEndMs)`), and
    // an ending may legally be moved to a time already past — so a motion
    // that closes the document "now", landing a moment later, is exactly
    // this. Checking here leaves the refusal where it always was and the
    // log untouched by it. `apply`'s own check stays: `replay` calls it
    // directly, and a log that arrives out of order must still be refused.
    if (event.t < this.lastT) throw new Error('timestamps must be non-decreasing');
    const prevHash = this.log.length > 0 ? this.log[this.log.length - 1]!.hash : '';
    const seq = this.log.length;
    const hash = chainHash(prevHash, event);
    // the version rides the envelope and never the hash (Q480(a)): an
    // entry written before this field existed is still a valid entry
    this.log.push({ seq, hash, prevHash, event, schemaVersion: SCHEMA_VERSION });
    this.apply(event, seq);
  }

  /**
   * **The fold is `fold.ts`** (Q1352 (s)): every event this module knows,
   * turned into state. It is called from two places and only two — `emit`,
   * one method up, after the entry is in the log, and `replay`, which calls
   * it directly with no log push because the entry is already there. That
   * relationship is why nothing in the fold may emit (Q1034).
   */
  private apply(event: ConstitutionEvent, seq: number): void {
    fold.apply(this.fold, event, seq);
  }

  /** What an act on the membership costs, as the document stands — unset
   *  reads as the most protective rung. Public since #26: the bridge asks it
   *  to price a press before the motion is opened. */
  priceOf(id: 'admission' | 'removal'): Price {
    const st = this.settings.get(id);
    const v = st ? (st.value as PriceValue | null) : null;
    return v?.price ?? (id === 'admission' ? 'assembly' : 'consent');
  }

  private touch(member: MemberId, t: number): void { fold.touch(this.fold, member, t); }

  /** Does this motion's target sit behind the crown's assent (§9.7)? The fold's
   *  own read, kept as a name here because the motions ask it too. */
  private reservedTarget(rec: MotionRecord): boolean {
    return fold.reservedTarget(this.fold, rec);
  }

  // -------------------------------------------------------------------------
  // Commands — the pre-start free hand (§9.6a)

  private requirePreStart(what: string): void {
    if (this.constitutedT !== null) {
      throw new Error(`${what} is pre-start only — after the start it is a motion (§9.6a)`);
    }
  }

  /** After the close nothing changes but the signing (SPEC §4.6). */
  private requireOpen(what: string): void {
    if (this.closedFlag) throw new Error(`the document has closed — ${what} is over (§4.6)`);
  }

  setConvenorMembership(t: number, isMember: boolean): void {
    this.requireOpen("the founder's membership");
    this.requirePreStart('re-ticking the convenor row');
    const current = this.members.has(this.convenor.id);
    if (current === isMember) {
      // **Answering is an act even when the value does not move** (Q682). A
      // founder who is already a member and answers *member* has answered 🎩,
      // and nothing else in the document can say so — which is why the surface
      // had to keep it in page state, and why a reload re-asked. Recorded once
      // and only once, so a founder working the radios does not fill the log
      // with an answer they have already given; the roster does not churn,
      // because nothing about the roster moved.
      if (!this.convenor.membershipSet) {
        this.emit({ type: 'convenor-membership-set', t, isMember });
      }
      return;
    }
    this.emit({ type: 'convenor-membership-set', t, isMember });
    this.afterRosterChange(t, isMember ? 'arrival' : 'departure', this.convenor.id);
  }

  /**
   * The convenor's own hand (Q530 added `why`): a reason for the change,
   * optional and blank-is-real like every other rationale on the surface.
   * It is emitted only when there is one, so an event without a reason
   * serialises exactly as it did before the field existed.
   */
  setSetting(t: number, setting: SettingId, value: SettingValue, why?: string): void {
    this.requireOpen('setting');
    const entry = entryOf(setting);
    if (setting === 'startingText') {
      throw new Error('the text is confirmed once, then changed by drafting (Q440)');
    }
    if (!this.settings.has(setting)) {
      throw new Error(`'${setting}' is not set this way`);
    }
    const st = this.settings.get(setting)!;
    if (!st.powers.unilateral) {
      if (this.constitutedT !== null) {
        throw new Error(st.powers.assent
          ? `'${setting}' — the unilateral power is given up; propose like a member (§9.7 v0.54)`
          : `'${setting}' is the members' — not the convenor's to set (§9.7)`);
      }
      throw new Error(`'${setting}' is delegated — reclaim it first (§9.0a)`);
    }
    const err = validateFor(entry, value);
    if (err) throw new Error(err);
    if (setting === 'pace') {
      const ending = this.settings.get('ending')!.value as EndingValue | null;
      if (ending && ending.endsAtMs === null && (value as PaceValue).shape === 'ramp') {
        throw new Error('perpetual forces a fixed bar — a ramp needs an endpoint (§9.0)');
      }
    }
    const postStart = this.constitutedT !== null;
    const reason = typeof why === 'string' && why.trim() !== '' ? why.trim() : undefined;
    // whether this is a *change* has to be read before the event folds
    const changed = st.value !== null;
    // and whether the *value* moves: a pen that restates what stands shifts
    // no ground (Q1348, R-105)
    const moved = st.value === null || !eqValue(st.value, value);
    // Post-start a reserved setting is the convenor's to change directly —
    // the assent was consented on the way in (§9.7, Ed's 366; NOTES.md).
    this.emit({ type: 'setting-set', t, setting, value,
      by: postStart ? 'crown' : 'convenor',
      ...(reason === undefined ? {} : { why: reason }) });
    // **The Founder's ✒️ on the setting shifts its rivals the same way** a
    // carry does (Q1348, R-105): the ground moved, whoever moved it.
    if (postStart && moved) this.shiftRivals(t, setting, 'pen');
    // **A change is owed an acknowledgement whatever its kind** (Q530, Ed
    // 2026-08-22). A constitutional setting owes one on any set, because a
    // rule you had no say in is a decision you are owed however it arose.
    // An **ordinary** one owes nothing when the founder first decides it —
    // nothing is being asked, and anybody may motion it whenever they like —
    // but a founder *changing* one has undone something the room was living
    // under, and that is news by the same argument. So the ordinary case
    // keys on `changed`, which is also Ed's own exception: the founder
    // deciding something for the first time is not a change at all.
    if (CONSTITUTIONAL.has(setting) || changed) this.oweOks(t, setting);
    if (setting === 'lapse') this.rereadLapse(t); // entry 97: the rule is re-read
  }

  setQuorumForm(t: number, form: 'count' | 'share'): void {
    this.requireOpen("the quorum's form");
    this.requirePreStart('re-framing the quorum question');
    if (this.quorumFormValue === form) return;
    const st = this.settings.get('quorum')!;
    if (st.settledBy !== null && st.holder === 'convenor') {
      throw new Error('quorum is set — change it by setting a value in the new form');
    }
    if (st.answers.size > 0) {
      throw new Error('the question is collecting in the current form — answers would change meaning');
    }
    this.emit({ type: 'quorum-form-set', t, form });
  }

  /**
   * Delegation — the one verb for handing a setting to the members (§9.7
   * v0.52, Ed 2026-08-19: the founder may delegate anything as soon as
   * proposing opens). Before the start a delegable setting delegates into
   * its founding question (§9.0a). Past that — and for the title and link,
   * which no blind question can collect (there is no most-protective title
   * for maxima to find) — the same verb is a hand-over: the settled value
   * stands and only the holder changes. One-way, the founder's own free
   * act; the road back is a constitutional motion (the reserve payload).
   */
  delegate(t: number, setting: PowerKey): void {
    this.requireOpen('delegating');
    // a door has no question to open — delegating it is the hand-over
    // below, both powers off, like the Text's (entry 94)
    const entry = isDoor(setting) ? null : entryOf(setting);
    if (entry?.kind === 'personal') {
      throw new Error(`'${setting}' is a member's own (§9.0c) — never held, never delegated`);
    }
    const st = this.settings.get(setting)!;
    if (this.constitutedT === null && entry?.delegable && !isDoor(setting)) {
      if (st.holder === 'members') return;
      this.emit({ type: 'setting-delegated', t, setting });
      return;
    }
    // available from whichever comes first: proposing opening (text
    // confirmed) or the constitution settling — a constituted document
    // whose text never confirmed must not hold its settings hostage
    if (!this.textConfirmedFlag && this.constitutedT === null) {
      throw new Error('delegation opens with proposing — confirm the starting text first (§9.7)');
    }
    if (st.holder !== 'convenor') return; // already the members'
    this.emit({ type: 'setting-handed-over', t, setting });
  }

  /**
   * Has this setting been set at least once? — the pre-start gate on laying a
   * power down (R-048). The Text carries no managed value (Q440), so its own
   * answer to *has it been set* is whether it has been confirmed.
   */
  private everSet(st: SettingState): boolean {
    if (st.id === 'startingText') return this.textConfirmedFlag;
    if (isDoor(st.id)) return true; // a door has no value to have been set (entry 94)
    return st.value !== null;
  }

  /** The power as the *founder's own card* reads it: a pending release is given. */
  private stillHeld(st: SettingState, power: Power): boolean {
    return st.powers[power] && !st.pendingRelease[power];
  }

  /**
   * Give up one crown power on one setting (§9.7 v0.54): free, separate,
   * one-way after the start — the road back is the room's reserve motion.
   *
   * **Once a setting has a value, either power may go** (Ed, 2026-08-25;
   * R-048), and before the start the release is *pending*: recorded when it
   * is made, effective at 🍾. The old clocks — assent from creation, the pen
   * only once the text confirmed — are both retired. What replaces them is
   * one gate on the setting rather than two on the calendar: a setting nobody
   * has set has nothing to hand over, and the text's own confirmation is one
   * setting's value among the catalogue's eighteen (SPEC §9.7.1) rather than
   * the whole document's clock.
   */
  relinquish(t: number, setting: PowerKey, power: Power): void {
    this.requireOpen('giving up a power');
    // a door's pair is laid down like a setting's; it just never delegates
    // into a question, having none (entry 94)
    const entry = isDoor(setting) ? null : entryOf(setting);
    if (entry?.kind === 'personal') {
      throw new Error(`'${setting}' is a member's own (§9.0c) — never held`);
    }
    const st = this.settings.get(setting)!;
    if (!this.stillHeld(st, power)) {
      throw new Error(`the ${power} power on '${setting}' is not held`);
    }
    if (this.constitutedT === null) {
      // Q403 (Ed, 2026-08-19): delegation IS the state of holding no powers,
      // so pre-start, giving up the *second* power on a delegable setting is
      // delegation — it opens the blind founding question like the verb
      // always did, and it takes effect at once, because a question that
      // waited for the start would never be collected. Symmetric in the two
      // powers since R-048: with the pen relinquishable pre-start, the order
      // the founder happens to press them in must not decide whether they
      // end up delegating.
      const other: Power = power === 'unilateral' ? 'assent' : 'unilateral';
      if (!this.stillHeld(st, other) && entry?.delegable && !isDoor(setting)) {
        this.emit({ type: 'setting-delegated', t, setting });
        return;
      }
      if (!this.everSet(st)) {
        throw new Error(
          `'${setting}' has no value yet — a power can only be laid down once the setting is set (§9.7)`);
      }
    }
    this.emit({ type: 'power-relinquished', t, setting, power });
    // **News when the power comes down, not when the act was recorded** (entry
    // 162). Pre-start the power has not moved — R-048 keeps the release
    // pending until 🍾 — so there is nothing to tell the room yet, and 🍾
    // reports what it actually spent. A command path, never a fold: `replay`
    // calls `apply` directly, so an emitter reached from the fold would append
    // events to every document it loaded.
    if (this.constitutedT !== null) this.oweReleases(t, [{ setting, power }]);
  }

  reclaim(t: number, setting: PowerKey): void {
    this.requireOpen('reclaiming');
    this.requirePreStart('reclaiming');
    const st = this.settings.get(setting);
    if (!st) throw new Error(`'${setting}' is not a delegable setting`);
    // nothing to take back: held, with both powers intact and neither of them
    // promised away at the start (R-048 — a pending release is exactly what a
    // pre-start reclaim is for)
    if (st.holder === 'convenor' && st.powers.unilateral && st.powers.assent
      && !st.pendingRelease.unilateral && !st.pendingRelease.assent) return;
    this.emit({ type: 'setting-reclaimed', t, setting });
  }

  confirmStartingText(t: number, text: string): void {
    this.requireOpen('the text');
    if (this.constitutedT !== null) {
      throw new Error('after the start the text changes by proposing in the document itself');
    }
    this.emit({ type: 'starting-text-confirmed', t, text });
  }

  setIdentity(t: number, member: MemberId,
    identity: { name?: string | null; picture?: string | null }): void {
    this.requireOpen('a name or picture');
    if (member !== this.convenor.id && !this.members.has(member)) {
      throw new Error(`unknown member '${member}'`);
    }
    // the answer to the row, the act to the log (decision 1253); a key present
    // is an answer, null included — a blank name is Anonymous (§9.0c)
    const person = this.members.get(member)?.person ?? this.convenor.person;
    const patch: { name?: string | null; picture?: string | null } = {};
    const e: ConstitutionEvent = { type: 'identity-set', t, member };
    if (identity.name !== undefined) { patch.name = identity.name; e.nameSet = true; }
    if (identity.picture !== undefined) { patch.picture = identity.picture; e.pictureSet = true; }
    this.people.set(person, patch);
    this.emit(e);
  }

  // -------------------------------------------------------------------------
  // The roster (§9.6a)

  /**
   * A direct invitation — the act that is its own consent (entry 94). Whose
   * word suffices is one gate, named once, and what the surface draws the
   * door on is what refuses here (Q812): before the start, the founder's;
   * after it, the founder's while they hold ✉️'s ✒️, and **any member's**
   * while 🪪 stands at `pen`. Anything else is a motion at 🪪's price.
   * `by` names the member whose word it is; absent, the founder's.
   */
  invite(t: number, email: string, by?: MemberId): MemberId {
    this.requireOpen('inviting');
    const byMember = by !== undefined && by !== this.convenor.id;
    if (byMember) {
      const m = this.members.get(by);
      if (!m || !inE(m)) throw new Error(`'${by}' is not an arrived member`);
      if (this.constitutedT === null) {
        throw new Error('before the start the founder invites (§9.6a)');
      }
      if (this.priceOf('admission') !== 'pen') {
        throw new Error('admission is not at ✒️ — propose the invitation at 🪪\'s price (§9.7½)');
      }
    } else if (this.constitutedT !== null && !this.doorPen('door:invite') &&
      this.priceOf('admission') !== 'pen') {
      throw new Error('after the start an invitation is a motion at 🪪\'s price (§9.6a)');
    }
    this.requireEmailFree(email);
    const id = `m-${this.nextMemberN}`;
    // the row before the event (decision 1253): the address lives there, and
    // an address already on a row — a removed member re-invited — is the same
    // person, so the row is theirs again rather than a second one
    const person = this.personFor(email);
    this.people.set(person, { email });
    this.emit({ type: 'member-invited', t, member: id, person,
      ...(byMember ? { by } : {}) });
    // An invitee counts toward nothing until they arrive — no roster
    // follow-ons: E is unchanged (§9.6a).
    return id;
  }

  /**
   * Exile at will — ❌'s ✒️, arguably a 👑's biggest power (Ed, 2026-08-26),
   * and immediate: the member is gone, their standing answers leave with
   * them, and every motion they were holding up re-settles now. That is the
   * power, not a defect in it; a room that does not want it takes the pen
   * off the door.
   */
  remove(t: number, member: MemberId): void {
    this.requireOpen('removing');
    if (!this.doorPen('door:remove')) {
      throw new Error('removal at will needs ❌\'s ✒️ — propose it at 🥾\'s price instead');
    }
    const m = this.members.get(member);
    if (!m || m.removed) throw new Error(`unknown member '${member}'`);
    if (member === this.convenor.id) {
      throw new Error('the convenor unticks their own row instead (§9.6a)');
    }
    const wasInE = inE(m);
    this.emit({ type: 'member-removed', t, member, by: 'convenor' });
    // **the room is told, and owes an OK for it** (Q901): before the roster's
    // own follow-ons, so the news of the act sits beside the act in the log
    // rather than behind whatever a re-settle carried
    this.oweDeparture(t, member, this.convenor.id); // ❌ is the convenor's act (Q1358)
    if (wasInE) this.afterRosterChange(t, 'departure', member);
    else this.maybeResolveAll(t);                   // Q1482: E did not move, a gate did
  }

  /**
   * Resignation (entry 94): free, immediate, refusable by nobody — a
   * person's consent to their own leaving is the purest case of ✒️. It is
   * not a removal, so ❌'s 🛡️ does not reach it, and under 🥾 at `consent`
   * it is the only way out, which is the point of that rung. The lapse
   * clock was always a silent exit; this is the spoken one.
   *
   * **The convenor's membership is ordinary membership** (§9.6a; entry 248,
   * written under the recommended reading with Ed's ruling asked), so after
   * the start a member convenor resigns like anybody. Before the start they
   * untick 🎩 instead: that *deletes* the record and leaves a clerk convenor
   * whose shield stands (X15), where a pre-start resignation would mark the
   * record `removed` and manufacture a vacant seat in a document that has
   * not begun.
   */
  resign(t: number, member: MemberId): void {
    this.requireOpen('resigning');
    const m = this.members.get(member);
    if (!m || m.removed) throw new Error(`unknown member '${member}'`);
    if (member === this.convenor.id && this.constitutedT === null) {
      throw new Error('the convenor unticks their own row instead (§9.6a)');
    }
    const wasInE = inE(m);
    this.emit({ type: 'member-removed', t, member, by: 'self' });
    this.oweDeparture(t, member);   // Q901, `remove`'s rule and its placing
    if (wasInE) this.afterRosterChange(t, 'departure', member);
    else this.maybeResolveAll(t);   // Q1482: E did not move, a gate did
    // after the roster's own follow-ons, never inside them: the seat this
    // may have just vacated is R-060's vacancy however it arose, and the
    // auto-pass is the last word on a settled roster rather than a step in
    // one. A no-op for anybody but the convenor — the guard is the
    // predicate's.
    this.crownSeatVacated(t);
  }

  uninvite(t: number, member: MemberId): void {
    this.requireOpen('uninviting');
    this.requirePreStart('uninviting');
    const m = this.members.get(member);
    if (!m || m.removed) throw new Error(`unknown member '${member}'`);
    if (member === this.convenor.id) {
      throw new Error('the convenor unticks their own row instead (§9.6a)');
    }
    const wasInE = inE(m);
    this.emit({ type: 'member-uninvited', t, member });
    if (wasInE) this.afterRosterChange(t, 'departure', member);
    else this.maybeResolveAll(t);   // Q1482: E did not move, a gate did
  }

  arrive(t: number, member: MemberId): void {
    if (this.closedFlag) throw new Error('the document has closed; there is nothing left to join, only to read (§4.6)');
    const m = this.members.get(member);
    if (!m || m.removed) throw new Error(`unknown member '${member}'`);
    if (m.arrivedAtT !== null) { this.touch(member, t); return; }
    this.emit({ type: 'member-arrived', t, member });
    // **A setting that predates you is simply what the document says** (Ed,
    // 2026-08-25; §9.0a, §9.6a): an arrival inherits the constitution and is
    // owed nothing for it. What is news to a joiner is a power handed to
    // them, which is a grant and never an `ok-owed`.
    this.afterRosterChange(t, 'arrival', member);
  }

  // -------------------------------------------------------------------------
  // The ceremony (§9.0a)

  answer(t: number, member: MemberId, setting: SettingId, value: SettingValue): void {
    this.requireOpen('answering');
    const m = this.members.get(member);
    if (!m || !inE(m)) throw new Error(`'${member}' is not an arrived member`);
    const st = this.settings.get(setting);
    if (!st || !st.collecting) {
      throw new Error(`'${setting}' is not collecting answers`);
    }
    const entry = entryOf(setting);
    const err = validateFor(entry, value);
    if (err) throw new Error(err);
    // **A quorum answer states its form as well as its number** (Ed,
    // 2026-09-02, Q1162, R-082 — Q341 reversed for 👥 alone): the old
    // refusal of a form other than the convenor's is gone; mixed answers
    // resolve strictest against E at the settle (Q1172).
    if (setting === 'pace') {
      const ending = this.settings.get('ending')!.value as EndingValue | null;
      if (ending && ending.endsAtMs === null && (value as PaceValue).shape === 'ramp') {
        throw new Error('perpetual forces a fixed bar — a ramp needs an endpoint (§9.0)');
      }
    }
    // Dependency serving: a question whose meaning depends on another setting
    // is not answerable until that setting settles (§9.0a).
    for (const dep of entry.deps) {
      const depSt = this.settings.get(dep);
      if (depSt && depSt.settledBy === null) {
        throw new Error(`'${setting}' waits on '${dep}' (§9.0a)`);
      }
    }
    this.emit({ type: 'answer-given', t, member, setting, value });
    this.maybeResolve(t, setting);
  }

  giveOk(t: number, member: MemberId, setting: SettingId): void {
    this.requireOpen('acknowledging');
    const m = this.members.get(member);
    if (!m) throw new Error(`unknown member '${member}'`);
    if (!m.okOwed.has(setting)) return;
    this.emit({ type: 'ok-given', t, member, setting });
  }

  // -------------------------------------------------------------------------
  // Follow-on emitters (the maybeAdopt pattern — command layer only)

  private maybeResolve(t: number, setting: SettingId): void {
    const st = this.settings.get(setting)!;
    if (!st.collecting) return;
    const entry = entryOf(setting);
    for (const dep of entry.deps) {
      const depSt = this.settings.get(dep);
      if (depSt && depSt.settledBy === null) return;
    }
    // **A blind question does not resolve while invitations are in flight**
    // (Ed, 2026-08-19, closing Q413 as (b)). The electorate is the *arrived*
    // membership, so resolving while invitations are outstanding settles the
    // room's rule on the voices of whoever happened to open their email
    // first — and in the limit on the founder's alone, which is not a
    // delegation at all: *a founder obviously does not intend to delegate to
    // themselves, nor would they use this tool if they were writing a
    // document on their own — more members are coming.* Answers stand and
    // stay revisable while it waits; only the resolution is held.
    //
    // §9.6a warned that a rule like this hands one unopened email a veto
    // over the whole start. It does, and the remedy is the founder's and
    // already exists: until judging opens the roster is theirs to re-shape,
    // so an invitation that will never be opened can simply be withdrawn.
    if ([...this.members.values()].some((m) => m.arrivedAtT === null && !m.removed)) return;
    // **The electorate is E as it stands** (§9.0a, §9.5, → why: R-015,
    // R-088; Ed 2026-09-06, Q1196 — E is the only base). It is the live set,
    // re-read on every answer and every departure, the same set the motion
    // side resolves against and the same one `view()` counts *n of E* over.
    // Both gates below read it.
    const electorate = motionElectorateOf(this.members.values());
    // **and never on one voice**, which is the other half of the same reason:
    // a consent rule computed over a single answer is that answer, so a
    // delegated question with a membership of one has not been delegated to
    // anybody. The founder's remedy is either half of the choice they already
    // have — invite somebody, or take the setting back and set it.
    if (electorate.length < 2) return;
    if (!electorate.every((m) => st.answers.has(m.id))) return;
    const answers = electorate.map((m) => st.answers.get(m.id)!);
    // the room at the settle (R-082, Q1172): quorum's mixed-form answers
    // resolve against this E, and the promise each member holds is *no
    // looser than what I accepted, judged when it settles*
    const { value, distribution } = resolveConsent(entry, answers, { e: electorate.length });
    this.emit({ type: 'question-resolved', t, setting, value, distribution,
      electorate: electorate.map((m) => m.id).sort() });
  }

  /**
   * **Somebody leaving is not the only thing a departure changes** (Q1482;
   * Ed, the nh2026 convention 2026-09-20: *why can't I begin?* under *12 out
   * of 12 of the membership have voted*).
   *
   * `afterRosterChange` is the road for a departure out of **E** — the
   * electorate moved, so the ground shifted, the floor is re-read and
   * everything is asked again. Somebody who never arrived was never in E, so
   * that road was skipped entirely; but the *other* gate `maybeResolve` holds
   * a blind question on is **invitations in flight** (Q413 (b)), and
   * withdrawing an unopened invitation is exactly the thing that lifts it.
   * The hold went and nobody looked again, so the question the withdrawal was
   * meant to free went on collecting for ever and 🍾 went on refusing —
   * §9.6a's own remedy for a veto by one unopened email, and it did nothing.
   *
   * So every road out of the roster ends here, whether or not E moved. It
   * emits nothing of its own, which is why it is safe on a road that changed
   * no ground: a question either resolves or it does not.
   */
  private maybeResolveAll(t: number): void {
    for (const id of MANAGED) this.maybeResolve(t, id);
  }

  /**
   * 🍾 **Begin — the founder's explicit act of starting the document**
   * (CLAUDE.md `🍾 Begin`, Q443; built 2026-08-21). Until now the
   * constitution constituted itself the moment its last judge-gate setting
   * settled; now nothing starts until the founder says so. Judging needs the
   * whole constitution (§9.0b: a judgment is recorded under a disclosure
   * setting and counted towards a quorum, neither settleable afterwards), so
   * 🍾 refuses while any judge-gate setting is still being decided — and
   * names it, which is what the readiness readout is for. The batch is the
   * `constituted` fold: the Text's ✒️/🛡️ laid down, the ramp anchored,
   * judging open. Readiness informs and never blocks (Q443c): a member who
   * has not answered a question the room has already resolved holds nothing up.
   *
   * **…and what the founder carries across the line is 🍾's own question**
   * (Ed, 2026-08-27, entry 158; Q1018, R-057). `laidDown` is what the card's
   * power switches collected — one list of `{ setting, power }`, validated
   * here because this is the one place a page bug could release the wrong
   * power. Omitted, the fold is the one it always was. A **list** rather than
   * a pair, and one command rather than N, because the batch is the act: N
   * `relinquish` calls at N stamps would be N news cards (entry 162), and
   * before the start they would *delegate* on a delegable setting's second
   * power (R-045) instead of handing over.
   */
  begin(t: number, laidDown?: ReadonlyArray<{ setting: PowerKey; power: Power }>): void {
    this.requireOpen('beginning');
    if (this.constitutedT !== null) throw new Error('the document has already begun');
    const waiting = this.waitingOn();
    if (waiting.length > 0) {
      throw new Error(`the document cannot begin while '${waiting.join("', '")}' ${waiting.length === 1 ? 'is' : 'are'} still being decided (§9.0b)`);
    }
    // validated before the emit, never after: an event in the log is a fact
    const list = laidDown === undefined ? undefined : laidDown.map((r) => {
      if (!HELD.includes(r.setting)) {
        throw new Error(`'${r.setting}' carries no power to lay down at the start (§9.7)`);
      }
      if (r.power !== 'unilateral' && r.power !== 'assent') {
        throw new Error(`'${String(r.power)}' is not a power on '${r.setting}' (§9.7)`);
      }
      return { setting: r.setting, power: r.power };
    });
    // **A question nobody could answer reads as answered at its default,
    // once, with a line in the log** (Ed, 2026-08-29, entry 259; → why:
    // R-080). 🤖's card left the surface while the setting stayed for replay,
    // so a founder who had delegated it held a question no member could be
    // served and no card could reclaim — the start refused for ever. The
    // moment is 🍾 rather than first sight because a fold cannot emit and a
    // sweep somewhere else would be a second mechanism; and it is *here*,
    // past both refusals and past `laidDown`'s validation, so a refused Begin
    // writes nothing. The existing `question-resolved` carries it — a new
    // event type would be a log-format break for no gain — with
    // `distribution` and `electorate` empty, which is the record that nobody
    // answered. Not routed through `maybeResolve`, whose gates are the whole
    // point of that method. After it the question is no longer collecting, so
    // nothing can write the line twice.
    for (const id of MANAGED) {
      if (!this.retiredQuestion(id) || !this.settings.get(id)!.collecting) continue;
      this.emit({ type: 'question-resolved', t, setting: id,
        value: entryOf(id).retiredAnswer!, distribution: [], electorate: [] });
    }
    // **What 🍾 lays down is read off what it spent, not off a list of
    // causes** (entry 162). The `constituted` fold lays the Text's pair down
    // and spends every pending release, and 158 is about to change what else
    // it lays down — so the batch is a *diff* of every `HELD` key's held pair
    // either side of the emit, and 🍾 reports the new answer with no edit
    // here. One act, so one batch and one OK, whatever it moved.
    // **🍾 confirms whatever stands if nothing ever did** (Q1080, Ed
    // 2026-08-29 21:20). 📄's OK was the confirm; with it retired the
    // founder's ✒️ on the proposal-row confirms every press, and a document
    // that reaches the start never confirmed is confirmed here — empty, since
    // the module holds no column; the page flushes its column into
    // `confirmStartingText` before it sends `begin`. Written *here*, past both
    // refusals and `laidDown`'s validation, so every caller of `begin` reaches
    // it (`commands.ts`, the ladder) and a started document is never wedged
    // with no text and no way to propose one — `canPropose` reads the flag.
    if (!this.textConfirmedFlag) this.emit({ type: 'starting-text-confirmed', t, text: '' });
    this.emit(list === undefined ? { type: 'constituted', t }
      : { type: 'constituted', t, laidDown: list });
    // **The start owes no acknowledgement for what it lays down** (Ed,
    // 2026-09-05, Q1184; SPEC §9.7 rule 3's exception, R-087). It used to
    // owe every member one release batch for the whole of what 🍾 laid down,
    // so a member arriving at the start met three news cards for one press —
    // 💡, ⚖️ and *What the Founder Has Laid Down* — where the start's own
    // news already says the document has begun and the settled 🍾 card
    // lists what beginning did. A power laid down **after** the start is
    // still one batch per act (`relinquish` → `oweReleases`), unchanged.
  }

  /** What 🍾 waits on (§9.0b, §9.7.1): a delegated question on **any** setting
   *  blocks the start while it collects, and every judge-gate must be settled
   *  however it is held. → why: R-045 */
  private waitingOn(): SettingId[] {
    return this.waitingWith().map((w) => w.setting);
  }

  /**
   * **A question on a setting that has left the surface is nobody's to
   * answer** (entry 259, Ed 2026-08-29; → why: R-080). The catalogue carries
   * the fact — `retiredAnswer`, the value 🍾 resolves such a question at — so
   * the module never has to read the page. Four sites share the predicate:
   * `waitingWith` (it holds nothing up), `readiness` (it is in neither list,
   * collecting or settled — the 🍾 card prints those rows and would print a
   * bare id, having no card to take a title from), `canPropose` (it gates
   * nothing, there being no card to answer it on) and `begin` (it writes the
   * line). `machines` carried it alone until 2026-09-15, when 🌡️ and 🪜 left
   * the surface the same way (Q1362 (b), R-117) and took the same road: a
   * founder who delegated the bar before the change is resolved at 50 here,
   * and the document starts.
   */
  private retiredQuestion(id: SettingId): boolean {
    return entryOf(id).retiredAnswer !== undefined;
  }

  /**
   * **…and *why* it waits** (Q826, Ed 2026-08-25: *I did all my open tasks and
   * then got served Begin while being unable to action it*). The list of ids
   * says which questions are outstanding and nothing about what would end the
   * wait — and the four ways a question can be outstanding want four different
   * acts of the founder. `one-voice` in particular is the one the founder can
   * do nothing about *on the card that names it*: the remedy is a second member
   * or taking the setting back, neither of which the id alone points at. The
   * reason is computed here rather than worded here: what a founder reads is
   * the surface's business, and the module owes it the fact.
   *
   * The order matches `maybeResolve`'s own gates, because that is what is
   * actually holding the resolution: an invitation in flight stops it before
   * the electorate is even counted, so a room of one with an unopened
   * invitation reads `invitation-open` and not `one-voice` — which is right,
   * since the invitation is already the remedy. And it is the same *set*, not
   * just the same order: `soleVoice` counts the electorate (E as it stands,
   * R-088), so a readout that says `collecting` while the resolver
   * is refusing on one voice — the Q826 defect over again — cannot arise.
   *
   * The deps loop is `maybeResolve`'s **first** gate, before the invitation
   * check and before the electorate is counted, so `deps-unsettled` is the
   * first reason after the judge-gate (entry 69). It is a wait the founding
   * leaves by itself: what ends it is the dependency's own hold, or the
   * founder's own task where the dependency is theirs and undecided. A room of
   * one with 🌡️ handed over and ⏰ undecided therefore reads `deps-unsettled`
   * and not `one-voice` — a second member could not answer it either, so
   * *invite somebody* is the wrong remedy to have been served.
   */
  private waitingWith(): WaitingHold[] {
    const invitationOut = [...this.members.values()]
      .some((m) => m.arrivedAtT === null && !m.removed);
    const soleVoice = motionElectorateOf(this.members.values()).length < 2;
    return CATALOGUE
      .filter((e) => {
        const st = this.settings.get(e.id);
        if (!st) return false;            // the register and the personal pair
        // The text holds nothing up (Q1080, 2026-08-29): 📄's OK — the press
        // that used to confirm it — is gone, so a text never confirmed by the
        // founder's ✒️ is confirmed by `begin` itself with whatever stands.
        // It used to be the one prerequisite outside the gate rule, because a
        // start without a confirm left the document wedged (2026-08-22); the
        // start now writes the confirm rather than waiting for it.
        if (e.id === 'startingText') return false;
        // a retired question holds nothing up: 🍾 answers it on the way
        // through (entry 259). Written ahead of the gate clause as well as
        // the collecting one so a retired judge-gate could not slip past —
        // none exists, and the field is not the place to find that out.
        if (this.retiredQuestion(e.id)) return false;
        return st.collecting || (e.judgeGate && st.settledBy === null);
      })
      .map((e) => {
        const st = this.settings.get(e.id)!;
        const why: WaitingWhy = !st.collecting ? 'judge-gate'
          : !this.answerable(e.id) ? 'deps-unsettled'
          : invitationOut ? 'invitation-open'
          : soleVoice ? 'one-voice'
          : 'collecting';
        if (why !== 'deps-unsettled') return { setting: e.id, why };
        // the dependency is named beside the reason, so the surface never
        // needs its own copy of the catalogue's `deps`
        const on = entryOf(e.id).deps.filter((dep) => {
          const d = this.settings.get(dep);
          return !!d && d.settledBy === null;
        });
        return { setting: e.id, why, on: [...on] };
      });
  }

  /**
   * The founder's readiness readout (Q443 (a)(i), both halves; founder-only
   * by the host's choice — it is part of the 🍾 task, not of the document).
   * Per question: whether it stands, and how many have answered. Per person:
   * how many of the questions they owe they have answered. **Participation
   * itemised by name, never preference** — no value, no running maximum.
   *
   * **Counted over the electorate** (R-088; Q648 before it): `electorate` is
   * E as it stands and `answered` counts only that set's answers, the way
   * `view()` counts a collecting question's `answeredCount` — the two readouts
   * of one question read one electorate. A member outside E (lapsed) is still
   * **listed** among the members and simply owes nothing: `owed` and
   * `answered` are both 0, since the itemisation is of participation in a
   * question they are no longer part of.
   */
  readiness(): {
    ready: boolean;
    waiting: SettingId[];
    /** the same list with `waitingWith`'s reason beside each id (Q826), and
     *  the dependencies beside a `deps-unsettled` one (entry 69) — `waiting`
     *  is kept as bare ids because `begin`'s own refusal and every existing
     *  reader want exactly that */
    holds: WaitingHold[];
    questions: Array<{ setting: SettingId; settled: boolean; collecting: boolean;
      answered: number; electorate: number }>;
    members: Array<{ id: MemberId; name: string | null; arrived: boolean;
      owed: number; answered: number }>;
  } {
    const E = motionElectorateOf(this.members.values());
    const eIds = new Set(E.map((m) => m.id));
    // a retired question is in neither list, before 🍾 or after it (entry
    // 259): nobody owes it an answer, and a settled row for it would be the
    // same bare id the founder could do nothing with
    const open = MANAGED.filter((id) => !this.retiredQuestion(id)
      && this.settings.get(id)!.collecting);
    const questions = MANAGED
      .filter((id) => {
        if (this.retiredQuestion(id)) return false;
        const st = this.settings.get(id)!; return st.collecting || st.distribution !== null; })
      .map((id) => {
        const st = this.settings.get(id)!;
        let answered = 0;
        for (const member of st.answers.keys()) if (eIds.has(member)) answered += 1;
        return { setting: id, settled: st.settledBy !== null, collecting: st.collecting,
          answered, electorate: E.length };
      });
    const members = [...this.members.values()]
      .filter((m) => !m.removed && !m.invitationExpired)
      .map((m) => {
        // …and the **same** set the questions above are counted over: `eIds`
        // is the electorate, so a member outside it (not yet arrived, or
        // lapsed) owes nothing. Counting a lapsed member's
        // owed questions while `answered`/`electorate` exclude them reported
        // somebody holding the founding up whom `maybeResolve` never waits for.
        const out = !eIds.has(m.id);
        return { id: m.id, name: this.personOf(m.person).name, arrived: m.arrivedAtT !== null,
          owed: out ? 0 : open.length,
          answered: out ? 0
            : open.filter((id) => this.settings.get(id)!.answers.has(m.id)).length };
      });
    const holds = this.waitingWith();
    const waiting = holds.map((w) => w.setting);
    return { ready: this.constitutedT === null && waiting.length === 0, waiting, holds, questions, members };
  }

  /**
   * Presence is presence (Q459 (a)): an authenticated read refreshes the
   * member's activity clock, so nobody lapses with the page open in front of
   * them. At most one event an hour per member, or a polling page would write
   * the log every four seconds. Returns whether anything was recorded.
   */
  seen(t: number, member: MemberId): boolean {
    if (this.closedFlag) return false;
    const m = this.members.get(member);
    const rec = m ?? (member === this.convenor.id ? this.convenor : null);
    if (!rec || (m && m.removed)) return false;
    if (m && m.arrivedAtT === null) return false;
    // **Seeing is presence** (Ed, 2026-09-08, Q1284's follow-up): a lapsed
    // member who opens the document is back — *if they were seeing things
    // they wouldn't be lapsed* — so a read returns them exactly as a login
    // or an act does, and the questions still open are served to them. The
    // crown lapses like a member (§9.7 rule 6) and returns the same way.
    // Until this date a read recorded nothing for the lapsed (*an act, not a
    // read*), and a member with a live cookie could read the room lapsed.
    if ((m && m.lapsed) || (member === this.convenor.id && this.crownLapsedFlag)) {
      this.memberReturn(t, member);
      return true;
    }
    if (t - rec.lastActivityT < SEEN_EVERY_MS) return false;
    this.emit({ type: 'member-seen', t, member });
    return true;
  }

  // -------------------------------------------------------------------------
  // The acknowledgements — what a member is owed and the OK that answers it
  // — are `owed.ts` (Q1352 (q)): the audience rules, the batching and every
  // ruling behind them (Q530, entry 162, D47, E34) are written there. The
  // session hands that family exactly the fields it reads, live, and keeps
  // these names so that the commands (`give-ok`'s siblings) and the callers
  // in this file do not move.

  private owedState(): OwedState {
    // a snapshot at the call, not a live view: every function in owed.ts
    // reads its counters before it emits, exactly as the methods did here
    return {
      members: this.members,
      convenorId: this.convenor.id,
      people: this.people,
      closed: this.closedFlag,
      lastReleaseT: this.lastReleaseT,
      lastReleaseBatch: this.lastReleaseBatch,
      nextReleaseN: this.nextReleaseN,
      nextMailGiveUpN: this.nextMailGiveUpN,
      emit: (e) => this.emit(e),
      requireOpen: (what) => this.requireOpen(what),
    };
  }

  private oweOks(t: number, setting: SettingId): void {
    owed.oweOks(this.owedState(), t, setting);
  }

  private oweReleases(t: number, releases: Array<{ setting: PowerKey; power: Power }>): void {
    owed.oweReleases(this.owedState(), t, releases);
  }

  ackRelease(t: number, member: MemberId, batch: string): void {
    owed.ackRelease(this.owedState(), t, member, batch);
  }

  private oweAmendment(t: number, candidate: string): void {
    owed.oweAmendment(this.owedState(), t, candidate);
  }

  ackAmendment(t: number, member: MemberId, candidate: string): void {
    owed.ackAmendment(this.owedState(), t, member, candidate);
  }

  mailGaveUp(t: number, addresses: readonly string[]): void {
    owed.mailGaveUp(this.owedState(), t, addresses);
  }

  ackMailGaveUp(t: number, member: MemberId, batch: string): void {
    owed.ackMailGaveUp(this.owedState(), t, member, batch);
  }

  /** Every departure is news owed an OK (Q901): the three routes call this,
   *  the carried motion's through `MotionHost`. */
  private oweDeparture(t: number, departed: MemberId, actor: MemberId | null = null): void {
    owed.oweDeparture(this.owedState(), t, departed, actor);
  }

  ackDeparture(t: number, member: MemberId, departed: MemberId): void {
    owed.ackDeparture(this.owedState(), t, member, departed);
  }

  /** The OK on one failed motion of your own (SURFACE E41, Q1447). The owing
   *  has no delegate beside it: every road to a failure is inside
   *  `motions.ts`, which calls `oweHeld` through its own host. */
  ackHeld(t: number, member: MemberId, motion: MotionId): void {
    owed.ackHeld(this.owedState(), t, member, motion);
  }

  resendInvite(t: number, member: MemberId, by: MemberId): void {
    owed.resendInvite(this.owedState(), t, member, by);
  }

  private afterRosterChange(t: number, cause: 'arrival' | 'departure',
    member: MemberId): void {
    // The roster is the ground of every ceremony answer (§9.6a): a change
    // while a question collects is a ground shift — answers stand, authors
    // are notified, each may revise until the question settles.
    const shifted = MANAGED.filter((id) => {
      const st = this.settings.get(id)!;
      return st.collecting && st.answers.size > 0;
    });
    if (shifted.length > 0) {
      this.emit({ type: 'ceremony-ground-shifted', t, settings: shifted, cause, member });
    }
    const E = eOf(this.members.values()).length;
    const q = this.settings.get('quorum')!.value as QuorumValue | null;
    this.emit({ type: 'floor-recomputed', t, E,
      quorumN: q ? quorumCount(q, E) : null,
      floorTerm: adoptionFloorTerm(E) });
    // A departure can complete a question (live electorate); an arrival can
    // only re-open one, which the resolve check reads for itself. The same
    // live-electorate rule settles motions (v0.48).
    this.maybeResolveAll(t);
    this.maybeSettleMotions(t);
  }

  // -------------------------------------------------------------------------
  // Motions (§9.6, v0.48): the one act by which a settled document changes
  // its own rules. The route is a fact about the setting. The family itself
  // lives in motions.ts since Q1352 (r); what stays here is the host it reads
  // the session through, and one delegate per name the callers know.

  /**
   * The motions' view of the session — **getters, not a snapshot**, unlike
   * `owedState()`: the settle loop reads `nextCrownN` and `nextMemberN` again
   * after emitting, and a stale counter would mint an id twice.
   */
  private motionHost(): motions.MotionHost {
    // arrows rather than an alias of `this`: each getter below reads the
    // fold's own field at the moment the motions ask for it, which is what
    // makes the counters safe inside a settle loop
    const constitutedT = () => this.constitutedT;
    const members = () => this.members;
    const motionRecords = () => this.motions;
    const crownQuestions = () => this.crownQuestions;
    const settings = () => this.settings;
    const people = () => this.people;
    const crownLapsed = () => this.crownLapsedFlag;
    const nextMotionN = () => this.nextMotionN;
    const nextCrownN = () => this.nextCrownN;
    const nextMemberN = () => this.nextMemberN;
    return {
      get constitutedT() { return constitutedT(); },
      get members() { return members(); },
      get motions() { return motionRecords(); },
      get crownQuestions() { return crownQuestions(); },
      get settings() { return settings(); },
      get people() { return people(); },
      get crownLapsed() { return crownLapsed(); },
      get nextMotionN() { return nextMotionN(); },
      get nextCrownN() { return nextCrownN(); },
      get nextMemberN() { return nextMemberN(); },
      emit: (e) => this.emit(e),
      requireOpen: (what) => this.requireOpen(what),
      priceOf: (id) => this.priceOf(id),
      reservedTarget: (rec) => this.reservedTarget(rec),
      requireEmailFree: (email) => this.requireEmailFree(email),
      personSeated: (person) => this.personSeated(person),
      personOfApplicant: (applicant) => this.applicants.get(applicant)?.person ?? null,
      personFor: (email) => this.personFor(email),
      convenorSeatVacant: () => this.convenorSeatVacant(),
      afterRosterChange: (t, cause, member) => this.afterRosterChange(t, cause, member),
      rereadLapse: (t) => this.rereadLapse(t),
      answeredAtDoor: (applicant) => this.answeredAtDoor(applicant),
    };
  }

  openMotion(t: number, by: MemberId, input: MotionInput, why?: string): MotionId {
    return motions.openMotion(this.motionHost(), t, by, input, why);
  }

  answerMotion(t: number, member: MemberId, motion: MotionId,
    answer: MotionAnswer): void {
    motions.answerMotion(this.motionHost(), t, member, motion, answer);
  }

  withdrawMotion(t: number, member: MemberId, motion: MotionId): void {
    motions.withdrawMotion(this.motionHost(), t, member, motion);
  }

  /** The host could not enter the race this motion needs (#26): the
   *  compensating withdrawal, which is nobody's act and never throws. */
  abandonMotion(t: number, motion: MotionId): void {
    motions.abandonMotion(this.motionHost(), t, motion);
  }

  adjudicateOrdinaryMotion(t: number, motion: MotionId,
    outcome: 'carried' | 'held' | 'held-at-close'): void {
    motions.adjudicateOrdinaryMotion(this.motionHost(), t, motion, outcome);
  }

  answerCrownQuestion(t: number, question: string, outcome: 'accept' | 'reject'): void {
    motions.answerCrownQuestion(this.motionHost(), t, question, outcome);
  }

  private maybeSettleMotions(t: number): void {
    motions.maybeSettleMotions(this.motionHost(), t);
  }

  private shiftRivals(t: number, setting: SettingId, cause: MotionId | 'pen',
    except?: MotionId): void {
    motions.shiftRivals(this.motionHost(), t, setting, cause, except);
  }

  private settleCarriedEffects(t: number, rec: MotionRecord,
    everyoneHadSay: boolean): void {
    motions.settleCarriedEffects(this.motionHost(), t, rec, everyoneHadSay);
  }

  private crownSeatVacated(t: number): void {
    motions.crownSeatVacated(this.motionHost(), t);
  }

  // -------------------------------------------------------------------------
  // Presence and the lapse clocks (§9.5, §9.5a). There is no sign-out and no
  // freeze since v0.99 (R-088): plain silence is nothing, and the ways out of
  // E are resignation, removal and lapse.

  /**
   * Revival is just logging in again (§9.5a) — the host calls this on any
   * authenticated return. Emits only when there is something to revive;
   * routine activity rides the member's own commands (NOTES.md).
   */
  memberReturn(t: number, member: MemberId): void {
    // The convenor's return revives a lapsed crown (§9.7 v0.49): the assent
    // requirement resumes from this moment. A clerk is not in the members
    // map, so for them this is the whole revival.
    if (member === this.convenor.id && this.crownLapsedFlag) {
      this.emit({ type: 'crown-returned', t });
    }
    const m = this.members.get(member);
    if (!m || m.removed) {
      if (member === this.convenor.id) return;
      throw new Error(`unknown member '${member}'`);
    }
    // nothing to revive → no event, no state: the clock only moves on events
    if (!m.lapsed && !m.lapseWarned) return;
    const wasLapsed = m.lapsed;
    this.emit({ type: 'member-returned', t, member });
    if (wasLapsed) this.afterRosterChange(t, 'arrival', member); // E grew back
  }

  /**
   * **Lapse is a reading of the rule, re-read when the rule changes** (entry
   * 97, Ed 2026-08-26). A change of rule never moves a person — but a lapsed
   * member is in that status by no act of their own; the clock put them there
   * under the old spell. So when 💤 turns off, or lengthens past their quiet,
   * the reading is simply no longer true and they are returned at once, the
   * crown included: the room chose to count them again, and the cost of that
   * is the room's. A shorter spell needs nothing here — the next tick lapses
   * whoever is now due. Before this the sweep just stopped when 💤 went to
   * *never*, and the lapsed stayed lapsed in a status no rule produced until
   * they happened to log in.
   */
  private rereadLapse(t: number): void {
    const lapse = this.settings.get('lapse')!.value as LapseValue | null;
    const afterMs = lapse ? lapse.afterMs : null;
    const lapseStillDue = (lastT: number): boolean =>
      afterMs !== null && t >= lapseDue(lastT, afterMs)!.lapseAtT;
    // a warning still stands if the point of the shortest lead sent is
    // still in the past under the new spell (R-097); a lengthened 💤 moves
    // it into the future and the member is returned, to be warned afresh
    const warningStillDue = (lastT: number, lead: number | null): boolean =>
      afterMs !== null && lead !== null && t >= lastT + afterMs - lead;
    for (const m of [...this.members.values()]) {
      if (m.removed || m.arrivedAtT === null) continue;
      const revive = m.lapsed ? !lapseStillDue(m.lastActivityT)
        : m.lapseWarned && !warningStillDue(m.lastActivityT, m.lapseWarnedLead);
      if (!revive) continue;
      const wasLapsed = m.lapsed;
      this.emit({ type: 'member-returned', t, member: m.id, cause: 'rule' });
      if (wasLapsed) this.afterRosterChange(t, 'arrival', m.id); // E grew back
    }
    if (this.crownLapsedFlag && !lapseStillDue(this.convenor.lastActivityT)) {
      this.emit({ type: 'crown-returned', t });
    }
  }

  /**
   * All clock-driven events flow through one host-called tick (the package
   * has no wall clock): lapse warnings, lapses, the crown's own clock, and
   * the freeze line.
   */
  tick(t: number): void {
    // The clock closes the document (SPEC §4.6): the lapse and freeze
    // clocks stop at T=0, so the close is tested first and returns.
    if (this.constitutedT !== null && !this.closedFlag) {
      const ending = this.settings.get('ending')!.value as EndingValue | null;
      if (ending && ending.endsAtMs !== null && t >= ending.endsAtMs) {
        this.runClose(ending.endsAtMs);
        return;
      }
    }
    if (this.closedFlag) return;
    const lapse = this.settings.get('lapse')!.value as LapseValue | null;
    if (lapse && lapse.afterMs !== null) {
      for (const m of [...this.members.values()]) {
        if (!inE(m)) continue;
        const due = lapseDue(m.lastActivityT, lapse.afterMs)!;
        if (t >= due.lapseAtT) {
          this.emit({ type: 'member-lapsed', t, member: m.id });
          this.afterRosterChange(t, 'departure', m.id);
        } else {
          // a week, a day, an hour before (R-097): one per tick, in order
          const lead = warningDue(due, m.lapseWarnedLead, t);
          if (lead !== null) this.emit({ type: 'lapse-warned', t, member: m.id, lead });
        }
      }
      // The §9.5a clock runs on the convenor too (§9.7): a quiet crown
      // lapses into automatic assent (v0.49) — nothing changes hands.
      if (!this.crownLapsedFlag && this.holdsAnythingReserved()) {
        const due = lapseDue(this.convenor.lastActivityT, lapse.afterMs)!;
        if (t >= due.lapseAtT) {
          this.emit({ type: 'crown-lapsed', t });
          for (const q of [...this.crownQuestions.values()]) {
            if (q.status !== 'pending') continue;
            // Lapse is automatic abstention; on an assent, abstaining grants.
            this.emit({ type: 'crown-question-auto-passed', t, question: q.id });
            if (q.motion !== null) {
              const mrec = this.motions.get(q.motion)!;
              this.settleCarriedEffects(t, mrec, mrec.route === 'constitutional');
            }
          }
        } else if (!this.members.has(this.convenor.id)) {
          const lead = warningDue(due, this.convenor.lapseWarnedLead, t);
          if (lead !== null) this.emit({ type: 'lapse-warned', t, member: this.convenor.id, lead });
        }
      }
    }
  }

  private holdsAnythingReserved(): boolean {
    for (const st of this.settings.values()) {
      if (st.holder === 'convenor') return true;
    }
    return false;
  }

  /**
   * The host's explicit close (SPEC §4.6) — a perpetual document's freeze
   * made final, or a caller standing in for the clock. The windowed close
   * runs itself from `tick` when the ending is crossed.
   */
  close(t: number): void {
    if (this.constitutedT === null) throw new Error('nothing to close before the start');
    if (this.closedFlag) return;
    this.runClose(t);
  }

  /**
   * T=0 (SPEC §4.6): the closing act already happened when the close was
   * set, so this is the room's own decision executing. A constitutional
   * motion still running resolves *kept* (what stands stands, the mover's
   * 🏛️ returns); a 👑 question pending fails closed (carried-but-
   * unassented — lapse auto-pass does not fire, because the close is
   * everybody's deadline, not one absence); an invitation outstanding
   * expires. Ordinary motions are the engine's races — the bridge holds
   * them at the close and reports through `adjudicateOrdinaryMotion`.
   */
  private runClose(t: number): void {
    this.emit({ type: 'closed', t });
    for (const rec of [...this.motions.values()]) {
      if (rec.status === 'running' && rec.route === 'constitutional') {
        this.emit({ type: 'motion-kept-at-close', t, motion: rec.id });
      }
    }
    for (const q of [...this.crownQuestions.values()]) {
      if (q.status === 'pending') {
        this.emit({ type: 'crown-failed-closed', t, question: q.id });
      }
    }
    for (const m of [...this.members.values()]) {
      if (!m.removed && m.arrivedAtT === null && !m.invitationExpired) {
        this.emit({ type: 'invitation-expired', t, member: m.id });
      }
    }
  }

  /**
   * A member acknowledges the close (SPEC §4.6): OK on the 🥂 card. The
   * acknowledgment *is* the signature, and the comment — freely blank,
   * dissent as welcome as praise — is the signing rationale. Per member,
   * once, on their own clock; a clerk who was never a member cannot sign.
   */
  acknowledgeClose(t: number, member: MemberId, comment: string): void {
    if (!this.closedFlag) throw new Error('the document has not closed');
    const m = this.members.get(member);
    if (!m || m.removed) throw new Error(`'${member}' is not a member`);
    if (m.closingAck !== null) throw new Error('already signed');
    this.emit({ type: 'close-acknowledged', t, member, comment });
  }

  // -------------------------------------------------------------------------
  // Applications (§9.7½)

  /** 🤝 as it stands — unset reads as the door shut, as a legacy log did. */
  private mayApply(): boolean {
    return mayApply(this.settings.get('applications')!.value as ApplicationsValue | null);
  }

  startApplication(t: number, email: string): string {
    this.requireOpen('applying');
    if (!this.mayApply()) {
      throw new Error('this document is invitation-only (§9.7½)');
    }
    this.requireEmailFree(email);
    const known = this.people.byEmail(email);
    for (const a of this.applicants.values()) {
      if (known !== null && a.person === known && a.status !== 'refused') {
        throw new Error('an application from that address is already underway');
      }
    }
    const id = `ap-${this.nextApplicantN}`;
    const person = known ?? this.personFor(email);
    this.people.set(person, { email });
    this.emit({ type: 'application-started', t, applicant: id, person });
    return id;
  }

  verifyApplication(t: number, applicant: string): void {
    this.requireOpen('applying');
    const a = this.applicants.get(applicant);
    if (!a || a.status !== 'started') throw new Error('nothing to verify');
    this.emit({ type: 'application-verified', t, applicant });
  }

  /**
   * **The OK on a door that shut under you** (Ed, 2026-09-14, Q901; SURFACE
   * E33). The refusal itself is derived from the rule as it stands, so this
   * records only that the applicant read it — and it deliberately **does not**
   * `requireOpen`. Every other acknowledgement in the module refuses a shut
   * document, on the ground that nothing is owed after the close; here the
   * close is one of the things that shuts the door, so an OK that refused one
   * would leave the card standing on the applicant's surface for ever behind a
   * button that throws (`mailGaveUp`'s own reasoning, from the other side).
   * Idempotent: a second press is silently nothing, `ackRelease`'s posture.
   */
  ackApplyShut(t: number, applicant: string): void {
    const a = this.applicants.get(applicant);
    if (!a) throw new Error(`unknown applicant '${applicant}'`);
    if (a.shutAcked) return;
    this.emit({ type: 'apply-shut-ok', t, applicant });
  }

  /** Nothing is sent before Submit; an empty application is a real application. */
  submitApplication(t: number, applicant: string,
    fields: { name?: string; picture?: string; words?: string } = {}): void {
    this.requireOpen('applying');
    // **Submission is the act** (entry 97, Ed 2026-08-26). A change of rule
    // never moves a person: an application already submitted when 🤝 shuts
    // goes on to its judgment, because the room has it. One only started or
    // verified has lodged nothing, so the shut door refuses it here exactly
    // as it does at the start — before this, an application begun under the
    // open rule could still be submitted into an admit motion after it.
    if (!this.mayApply()) {
      throw new Error('the door has shut since you began — this document is now invitation-only (§9.7½)');
    }
    const a = this.applicants.get(applicant);
    if (!a || a.status !== 'verified') {
      throw new Error('an application is verified by magic link before it can be submitted (§9.7½)');
    }
    // **One address is one member** (issue #6, F2): verifying is not
    // submitting, and between the two the Founder's ✒️ can have invited this
    // very address. Submitting would open an admit motion on somebody who
    // already holds a seat, and its carry would mint a second one. The
    // sentence is `requireEmailFree`'s, because it is the same refusal: your
    // road in is already open, so log in by the link you were sent.
    if (this.personSeated(a.person)) {
      throw new Error('that address is already on the membership — log in instead (§9.7½)');
    }
    // the name and picture to the row, the words to the log (decision 1253;
    // free text is stage 12's second part and stays in the event)
    // **The submission is the whole of the identity it gives** (Q1366, Ed
    // 2026-09-15: a fresh application starts blank, whoever you were). A
    // returning address knocks on a row that still carries the seat it gave
    // up, and until now a field left out of the submission left the row's
    // old value standing — so an applicant whose page showed nothing could be
    // put before the members under a name they never gave. What is not
    // given is nothing, and the row says so.
    this.people.set(a.person, { name: fields.name ?? null, picture: fields.picture ?? null });
    const e: ConstitutionEvent = { type: 'application-submitted', t, applicant };
    if (fields.words !== undefined) e.words = fields.words;
    this.emit(e);
    // An application is a stranger proposing their own invitation (entry
    // 94), so it pays 🪪's price: at `pen` the act is its own consent and
    // they are admitted on submit; otherwise it opens the admit race at
    // that price, free — the bar (or the room) is its filter, and the
    // applicant stands as nobody's mover. The old second (a member staking
    // a ✏️ to propose an applicant) went with the `proposed` rung: the
    // application *is* the proposal.
    if (this.priceOf('admission') === 'pen') {
      const id = `m-${this.nextMemberN}`;
      this.emit({ type: 'member-admitted', t, applicant, member: id,
        ...this.answeredAtDoor(applicant) });
      this.afterRosterChange(t, 'arrival', id);
    } else {
      this.emit({ type: 'motion-opened', t, motion: `mo-${this.nextMotionN}`,
        by: null, payload: { kind: 'admit', applicant },
        route: this.priceOf('admission') === 'assembly' ? 'constitutional' : 'ordinary',
        stake: 0 });
    }
  }

  /**
   * **What the applicant answered at the door, for the seat being born**
   * (Q1405). ✋ and 🖼️ are asked of a member as *were you ever asked* (Q645),
   * and an admission used to carry the name and picture across on the row
   * while leaving both flags false — so a member who had chosen both at the
   * door met the two cards again. The answer is read off the record, which
   * after a submission is exactly what the submission gave: it writes both
   * fields, absent → null (Q1366), so a null here is *not given* and a blank
   * string is the Anonymous answer, as it is on `identity-set`. Read at the
   * emit and written into the event, never derived at the fold — the shape
   * `created` uses for a founder who arrives already named.
   */
  private answeredAtDoor(applicant: string): { nameSet?: true; pictureSet?: true } {
    const a = this.applicants.get(applicant);
    if (!a) throw new Error(`unknown applicant '${applicant}'`);
    return { ...(a.name !== null ? { nameSet: true as const } : {}),
      ...(a.picture !== null ? { pictureSet: true as const } : {}) };
  }

  // -------------------------------------------------------------------------
  // Reads used by projections (view.ts owns the member-facing surface)

  /** A door's crown pair (entry 94), lapse ignored — a sleeping crown still
   *  holds; callers check the lapse where it bites. */
  doorPowers(door: DoorId): Powers { return fold.doorPowers(this.fold, door); }

  /**
   * The door's pen as a gate, and **exactly the act's own test** (Q812): the
   * pen is what acts alone; the shield only refuses, so it can never be what
   * opens a door (§9.6a, R-048). A sleeping crown does not act.
   */
  doorPen(door: DoorId): boolean {
    return this.doorPowers(door).unilateral && !this.crownLapsedFlag;
  }

  /** @deprecated entry 94 — ✉️'s pair; the page reads it until step 5 rewrites the 🪪 card. */
  registerPowers(): Powers { return this.doorPowers('door:invite'); }
  /** @deprecated entry 94 — `doorPen('door:invite')`. */
  membershipReserved(): boolean { return this.doorPen('door:invite'); }

  /**
   * 👑 by any reservation (Ed, 2026-08-18, Q379 wide): the mark reads what
   * the convenor holds, not the membership alone — and a sleeping crown
   * still holds it (lapse grants assent, it does not transfer anything).
   * The Text counts (Q440, 2026-08-21): a founder who keeps the pen or the
   * shield on the document itself is a crown by the same rule as anywhere.
   */
  crowned(): boolean {
    for (const st of this.settings.values()) {
      if (st.holder === 'convenor') return true;
    }
    return false;
  }

  /**
   * The seat has been **vacated**: the person who held it was removed from
   * the membership (Ed, 2026-08-29, R-060). A claim about *state* and never
   * about which event produced it, so it reads the same after a replay as
   * after the act. That is why the free resignation of §9.6a needed no
   * second rule when `resign` opened its door to the convenor (entry 248):
   * a seat is vacant because the record says so, and a carried removal and
   * a resignation say it the same way.
   *
   * **A convenor who is not a member is not a vacant seat**, which is the
   * line a reader will get wrong: unticking 🎩 *deletes* the record from
   * `this.members`, and exception X15 says a convenor with no powers and no
   * membership is still a person the room may restore powers to. The clerk
   * convenor is the ordinary founding and their shield stands. Vacated
   * means the record is here and wears `removed`.
   */
  convenorSeatVacant(): boolean {
    return this.members.get(this.convenor.id)?.removed === true;
  }

  /**
   * Q440: the shield on the Text means an **adoption** waits on the
   * founder's accept -- assent over the drafting mechanism itself. The
   * engine has already adopted; the host asks here whether the document it
   * serves may follow, and a sleeping crown grants (lapse is abstention).
   *
   * **A vacated seat holds no shield either** (R-060, this build's reading
   * beside Ed's ruling). `!this.crownLapsedFlag` already says the shield
   * reads *down* where nobody is awake to hold it, and R-056 declares
   * *whether assent is owed* rather than the raw power to the engine
   * precisely so a sleeping crown falls out of the mechanism instead of
   * needing a second rule. A vacated seat is that fact in a stronger form —
   * nobody asleep, nobody at all — so the same clause covers it. Without
   * this the vacancy auto-pass clears the park that is standing and the
   * very next race parks against an empty seat, which is the same defect
   * one adoption later.
   */
  textAdoptionNeedsAssent(): boolean {
    return this.settings.get('startingText')!.powers.assent &&
      !this.crownLapsedFlag && !this.convenorSeatVacant();
  }

  /**
   * ✒️ on the Text (Ed, 2026-08-27, backlog entry 160; Q1020, R-058): the
   * Founder's amendment passes the instant they submit it. `doorPen`'s shape,
   * for `doorPen`'s reason — the pen is what acts alone, and **a sleeping
   * crown does not act**: lapse grants assent (the shield's road) and performs
   * nothing (this one).
   */
  textPen(): boolean {
    return this.settings.get('startingText')!.powers.unilateral && !this.crownLapsedFlag;
  }

  /**
   * Record an amendment the Founder's pen made to the document's text. The
   * words are the engine's — this is the constitution's half: the motion
   * record every other amendment gets, and the acknowledgement it owes.
   *
   * Guarded on the same three things the act itself needs: the document is
   * open, judging has begun (before the start nothing is amended, only set —
   * §9.6a, and `confirmStartingText` is that road), and the pen is held.
   */
  recordTextAmendment(t: number,
    text: { candidateId: string; summary: string; why?: string }): void {
    this.requireOpen('amending the text');
    if (this.constitutedT === null) {
      throw new Error('before the start the text is confirmed, not amended (§9.6a)');
    }
    if (!this.textPen()) {
      throw new Error('the Text carries no pen — propose the change instead (§9.7 rule 8)');
    }
    this.emit({ type: 'text-amended', t, candidateId: text.candidateId,
      summary: text.summary, ...(text.why !== undefined ? { why: text.why } : {}) });
    // and it is news beside the clause it changed, to everybody who had no
    // say (Q1034, D47) — on the command path, never in the fold
    this.oweAmendment(t, text.candidateId);
  }

  /** Open the 👑 question for one adopted candidate; the host reads its
   *  record (`crownQuestionRecords`) to learn accept / reject / auto-pass. */
  openTextCrownQuestion(t: number, text: { candidateId: string; summary: string }): CrownQuestionId {
    this.requireOpen('the 👑 question');
    if (this.constitutedT === null) throw new Error('nothing adopts before the start');
    if (!this.textAdoptionNeedsAssent()) {
      throw new Error('the Text carries no assent -- the adoption stands by itself');
    }
    for (const q of this.crownQuestions.values()) {
      if (q.status === 'pending' && q.text?.candidateId === text.candidateId) {
        throw new Error('that adoption already awaits the crown');
      }
    }
    const id = `cq-${this.nextCrownN}`;
    this.emit({ type: 'crown-question-opened', t, question: id, motion: null, text });
    return id;
  }

  /**
   * **Email is the identity and stays unique per document** (§9.7½), checked
   * through the rows since decision 1253: the address names a person, and the
   * membership is asked whether that person is on it now. Case-blind, as
   * `byEmail` is.
   */
  private requireEmailFree(email: string): void {
    const person = this.people.byEmail(email);
    if (person === null) return;
    if (this.personSeated(person)) {
      throw new Error('that address is already on the membership — log in instead (§9.7½)');
    }
  }

  /**
   * **Is this person on the membership now?** — the question `requireEmailFree`
   * was, split out because a *carry* must ask it too (issue #6, F2). Every
   * road in checked the address where it started and nowhere else, and a
   * motion is not an act but a permission that lands later: while it ran, the
   * Founder's ✒️ could invite the same address, or that person could apply, and
   * the carry then minted a second member row for one person — a second
   * wallet, a second place in E, and a second voice in every quorum and every
   * unanimity after it. An **invitee counts**: they hold a seat waiting for
   * them, and re-inviting them is not a second seat but a second link.
   */
  personSeated(person: PersonId): boolean {
    for (const m of this.members.values()) {
      if (!m.removed && m.person === person) return true;
    }
    return this.convenor.person === person && this.members.has(this.convenor.id);
  }

  /** The row holding this address, or the next id to hold it (minted, not yet written). */
  private personFor(email: string): PersonId {
    return this.people.byEmail(email) ?? `p-${this.nextPersonN}`;
  }

  /** One person's fields as they stand now — null throughout once erased. */
  private personOf(id: PersonId): ResolvedPerson {
    return resolvePerson(this.people, id);
  }

  // -------------------------------------------------------------------------
  // Plain accessors (host-facing; blind projections live in view.ts)

  get titleOf(): string { return (this.settings.get('title')!.value as TextValue).text; }
  get slug(): string { return (this.settings.get('link')!.value as SlugValue).slug; }
  get slugs(): readonly string[] { return this.slugHistory; }
  get constitutedAtT(): number | null { return this.constitutedT; }
  /** When the document was born — the `t` a shape's sets share (entry 166). */
  get createdAtT(): number { return this.createdT ?? 0; }
  /** The 🧭 shape chosen at the birth, or null for custom (entry 166). */
  get shape(): ShapeName | null { return this.shapeName; }
  /**
   * **Given by the shape and untouched, before the start** (entry 166): the
   * row named this setting, the convenor's set is the birth's own, nothing
   * has re-set it since (`previousValue` still null), and the document has
   * not begun. The band's provenance sentence and 🍾's diff both read this;
   * nothing is stored for it.
   */
  shaped(id: SettingId): boolean {
    if (this.shapeName === null) return false;
    if (!(id in shapeOf(this.shapeName).sets)) return false;
    const st = this.settings.get(id);
    return !!st && st.settledBy === 'convenor' && st.previousValue === null &&
      st.settledAtT === this.createdT && this.constitutedT === null;
  }
  get closed(): boolean { return this.closedFlag; }
  get closedAt(): number | null { return this.closedT; }

  /**
   * The signatures block (SPEC §4.6): who has acknowledged the close, in the
   * order they signed, each with their comment. The comment is always shown;
   * it is the rationale, and blank is a real signature.
   *
   * **A signature is always named** (Q769, Ed 2026-08-23, closing Q634 (ii)).
   * This read the ✍️ setting and anonymised the whole block under `nobody`,
   * with `?? 'each'` when nothing had been settled — a middle-rung default
   * where every other privacy default on this surface is the most private
   * one. Both are gone. ✍️ is about **proposals**: whether a name is attached
   * to a thing you wrote *while the room is still deciding*, which is what
   * the blindness discipline is for. Signing the finished document is the
   * opposite act — deliberate, after every decision is made — and an unnamed
   * signature is an anonymous comment rather than a signature.
   */
  closingSignatures(): Array<{ member: MemberId; name: string | null; erased: boolean;
    comment: string; t: number }> {
    const out: Array<{ member: MemberId; name: string | null; erased: boolean;
      comment: string; t: number }> = [];
    for (const m of this.members.values()) {
      if (m.closingAck === null) continue;
      const who = this.personOf(m.person);
      out.push({
        member: m.id,
        name: who.name,
        // an erased signatory is still a signatory: the act stands in the
        // log, the name is gone from the row (decision 1253)
        erased: who.erased,
        comment: m.closingAck.comment,
        t: m.closingAck.t,
      });
    }
    return out.sort((a, b) => a.t - b.t);
  }
  get textConfirmed(): boolean { return this.textConfirmedFlag; }
  get text(): string | null { return this.startingText; }
  get quorumForm(): 'count' | 'share' { return this.quorumFormValue; }
  get crownLapsed(): boolean { return this.crownLapsedFlag; }

  /**
   * The convenor as the view reports them. **`isMember` is the roster's
   * answer, never the struct's** (Q920 (a), Ed 2026-08-27; built 2026-09-07):
   * the field is set once at creation and 🎩's fold moves the seat on the
   * roster, so a clerk's document served `isMember: true` for ever and the
   * page read the clerk as a member — the founder's rail then carried the
   * voice grant as news before 🍾, and 🍾 waited on an OK a clerk can never
   * give (the seat matrix's clerk hat, cascading). The roster is the fact
   * (entry 94); the fold keeps the field in step as well, for any reader of
   * the struct itself.
   */
  convenorRecord(): Readonly<typeof this.convenor & ResolvedPerson> {
    return { ...this.convenor, ...this.personOf(this.convenor.person),
      isMember: this.members.has(this.convenor.id) };
  }
  /**
   * **Every change the pen has made, in order** (Q530, Ed 2026-08-22, asking
   * for the reasons to reach the record as well as the rail). `SettingState`
   * keeps only the last one, because a clause states one rule; the record
   * states a life. Folded from `setting-set` events the log already carried,
   * so this is a projection rather than anything new written down — and a
   * **first decision is not in it**, by the same test the acknowledgement
   * uses: there is no *from*, so there was no change.
   */
  amendedFrom(motion: MotionId): SettingValue | null {
    return this.penFrom.get(motion) ?? null;
  }

  /** The roster; each record's person resolves live through the rows (`withPerson`). */
  memberRecords(): ReadonlyMap<MemberId, MemberRecord> { return this.members; }
  /**
   * Every member who left the membership after arriving, in log order, with
   * the time and whose act it was (Q901, SURFACE E31–E32). Folded from
   * `member-removed`, so reading it costs nothing per view; uninvited
   * invitees are not in it, and neither is the convenor's own 🎩 change.
   */
  departures(): ReadonlyArray<{ member: MemberId; t: number; by: DepartureBy }> {
    return this.departed;
  }
  settingState(id: PowerKey): Readonly<SettingState> {
    const st = this.settings.get(id);
    if (!st) throw new Error(`'${id}' has no setting state`);
    return st;
  }
  motionRecords(): ReadonlyMap<MotionId, MotionRecord> { return this.motions; }
  /** Every act that laid a power down, by batch id (entry 162, Q1013). */
  releaseBatchRecords(): ReadonlyMap<string, ReleaseBatchRecord> { return this.releaseBatches; }
  mailGiveUpBatchRecords(): ReadonlyMap<string, MailGiveUpBatchRecord> {
    return this.mailGiveUpBatches;
  }
  crownQuestionRecords(): ReadonlyMap<string, CrownQuestionRecord> { return this.crownQuestions; }
  /** The applicants; each record's person resolves live through the rows (`withPerson`). */
  applicantRecords(): ReadonlyMap<string, ApplicantRecord> { return this.applicants; }

  E(): number { return eOf(this.members.values()).length; }
  motionElectorate(): MemberId[] {
    return motionElectorateOf(this.members.values()).map((m) => m.id);
  }

  /** The bar now, percent (§4.3). Null before the document is constituted. */
  bar(t: number): number | null {
    return this.anchors === null ? null : barAt(this.anchors, t);
  }

  /** Judging is the room's gate (§9.0b): open from constituted. There is no freeze (R-088). */
  canJudge(): boolean { return this.constitutedT !== null; }

  /** Proposing is yours (§9.0b): confirmed text plus your own outstanding answers. */
  canPropose(member: MemberId): boolean {
    if (!this.textConfirmedFlag) return false;
    const m = this.members.get(member);
    if (!m || !inE(m)) return false;
    for (const id of MANAGED) {
      // a retired question holds nothing up here either (entry 259, R-080):
      // nobody has a card to answer it with, so gating proposing on it gates
      // it on an act no member can perform — and a document constituted
      // before 🍾 existed (the old auto-constitute watched the judge-gates
      // alone, and 🤖 is not one) never reaches the `begin` that resolves it
      if (this.retiredQuestion(id)) continue;
      const st = this.settings.get(id)!;
      if (st.collecting && this.answerable(id) && !st.answers.has(member)) return false;
    }
    return true;
  }

  /** A collecting question is only outstanding once its dependencies settled. */
  private answerable(id: SettingId): boolean {
    return entryOf(id).deps.every((dep) => {
      const st = this.settings.get(dep);
      return !st || st.settledBy !== null;
    });
  }

  // -------------------------------------------------------------------------
  // Integrity (SPEC §11)

  verifyChain(): boolean {
    let prev = '';
    for (const entry of this.log) {
      if (entry.prevHash !== prev) return false;
      if (entry.hash !== chainHash(prev, entry.event)) return false;
      prev = entry.hash;
    }
    return true;
  }

  rollingHash(): string {
    return this.log.length > 0 ? this.log[this.log.length - 1]!.hash : '';
  }

  logEntries(): readonly LogEntry[] { return this.log; }

  /** Every member can verify their own moves were counted (SPEC §11). */
  receipt(memberId: MemberId): Array<{ seq: number; hash: string }> {
    return this.log
      .filter((entry) => {
        const e = entry.event as unknown as Record<string, unknown>;
        return e.member === memberId || e.by === memberId;
      })
      .map((entry) => ({ seq: entry.seq, hash: entry.hash }));
  }
}
