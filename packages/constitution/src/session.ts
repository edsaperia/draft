/**
 * ConstitutionSession (SPEC §9, v0.48) — the §9 layer as an event-sourced
 * fold, engine-core's Session pattern exactly: commands validate → emit →
 * apply; everything state-affecting happens in the fold, never the command
 * layer; follow-on emission (the maybeAdopt pattern) happens only in
 * commands; caller-supplied non-decreasing t; hash-chained log with
 * static replay() re-verifying and re-folding bit-identically.
 */

import { chainHash } from './hash.js';
import type {
  ApplicantRecord, ConstitutionEvent, ConvenorInput, CrownQuestionId, CrownQuestionRecord,
  LogEntry, MemberId, MemberRecord, MotionAnswer, MotionId, MotionPayload,
  MotionRecord, Power, Powers, SettingState, Arrival, PowerSource, DoorId, PowerKey,
  DepartureBy, ReleaseBatchRecord, MailGiveUpBatchRecord,
} from './types.js';
import { DOORS, holderOf, isDoor, SCHEMA_VERSION } from './types.js';
import type { MotionRoute, SettingId } from './catalogue.js';
import { CATALOGUE, entryOf, mayApply, motionRouteOf, validateFor } from './catalogue.js';
import type { ApplicationsValue, EndingValue, LapseValue, PaceValue,
  PercentValue, Price, PriceValue, QuorumValue, SettingValue, SlugValue, TextValue } from './values.js';
import { eqValue } from './values.js';
import { resolveConsent } from './consent.js';
import { eOf, inE, motionElectorateOf, quorumBaseOf, quorumCount,
  adoptionFloorTerm } from './populations.js';
import type { ThresholdAnchors } from './threshold.js';
import { barAt, reAnchor, seedAnchors } from './threshold.js';
import { lapseDue } from './clocks.js';
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
 * `text-unconfirmed` is the text's own prerequisite (§9.0b), which is not a
 * question anybody is being asked. `deps-unsettled` (entry 69) is a wait on
 * *another question* — §9.0a serves a dependent only once its dependency has
 * settled — so the block is upstream and the dependency's own hold names the
 * reason: a wait, never a dead end, and never a reason to invite anybody.
 */
export type WaitingWhy = 'judge-gate' | 'invitation-open' | 'one-voice'
  | 'collecting' | 'text-unconfirmed' | 'deps-unsettled';

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

/** The settings the map manages: everything except the text and the personal pair.
 *  🪪 is among them since entry 94 — a price, not the register. */
const MANAGED: readonly SettingId[] = CATALOGUE
  .filter((e) => e.kind !== 'personal' && e.id !== 'startingText')
  .map((e) => e.id);

/** Everything that carries a crown pair: the managed map, the Text (Q440, 2026-08-21)
 *  and the two doors (entry 94, 2026-08-26). */
const HELD: readonly PowerKey[] = [...MANAGED, 'startingText', ...DOORS];

const CONSTITUTIONAL: ReadonlySet<SettingId> = new Set(
  CATALOGUE.filter((e) => e.kind === 'constitutional').map((e) => e.id),
);

/**
 * Setting ids a log may name that the catalogue no longer has (Q903, Ed
 * 2026-08-26): 🪪 was `membership` while it *was* the register, and entry 94
 * made it the price of admission. Every log written before the rename names
 * the old id, so it is read onto the new one at the fold — the same
 * migration `foldLegacy` performs for 🤝's four-rung `joinPolicy`, one level
 * up, on the id rather than the value.
 */
const LEGACY_SETTING_IDS: ReadonlyMap<string, SettingId> = new Map([
  ['membership', 'admission' as SettingId],
]);

/**
 * One event read through `LEGACY_SETTING_IDS`, or the event itself where
 * nothing is legacy. **The entry keeps its bytes**: only the copy handed to
 * the fold is rewritten, so the hash chain is exactly what was written and
 * an old log verifies as it always did.
 *
 * It rewrites by shape rather than by listing the event types, because the
 * shapes are the whole set: `setting` (setting-set · setting-delegated ·
 * setting-reclaimed · setting-handed-over · power-relinquished · answer-given ·
 * question-resolved · ok-given), `settings` (ok-owed · ceremony-ground-shifted) and
 * `payload.setting` (motion-opened, on a `set` or a `reserve`). A door key in
 * a `setting` field simply never matches.
 */
function foldLegacyIds(event: ConstitutionEvent): ConstitutionEvent {
  const e = event as unknown as
    { setting?: string; settings?: string[]; payload?: { setting?: string } };
  let out: Record<string, unknown> | null = null;
  const touch = (): Record<string, unknown> =>
    (out ??= { ...(event as unknown as Record<string, unknown>) });
  if (e.setting !== undefined && LEGACY_SETTING_IDS.has(e.setting)) {
    touch()['setting'] = LEGACY_SETTING_IDS.get(e.setting);
  }
  if (e.settings !== undefined && e.settings.some((s) => LEGACY_SETTING_IDS.has(s))) {
    touch()['settings'] = e.settings.map((s) => LEGACY_SETTING_IDS.get(s) ?? s);
  }
  const ps = e.payload?.setting;
  if (ps !== undefined && LEGACY_SETTING_IDS.has(ps)) {
    touch()['payload'] = { ...e.payload, setting: LEGACY_SETTING_IDS.get(ps) };
  }
  return out === null ? event : (out as unknown as ConstitutionEvent);
}

/** Q459: a read refreshes the activity clock at most this often. */
const SEEN_EVERY_MS = 60 * 60_000;

export class ConstitutionSession {
  private log: LogEntry[] = [];
  private lastT = -Infinity;

  // ---- fold state ----------------------------------------------------------
  private convenor!: { id: MemberId; email: string; isMember: boolean;
    name: string | null; picture: string | null;
    // the clerk's half of Q645's *was it ever answered* — a clerk is never a
    // MemberRecord, and their name and picture are optional (§9.6a), so the
    // question is asked of them exactly as it is of anybody
    nameSet: boolean; pictureSet: boolean;
    /**
     * **Whether 🎩 has been answered** (Q682), and the same lesson as
     * `nameSet` one line above. `isMember` is a value with a default, so it
     * cannot say whether the question was ever put — and pre-🍾 the surface
     * had nowhere else to look: it kept 🎩's settledness in page state alone,
     * which no reload can rebuild. Since 🎩 blocks the founding order, a
     * founder who answered it and then reloaded was asked again *and* had
     * everything below it withheld again. Folded from the
     * `convenor-membership-set` events the log already carries: no new event,
     * no envelope change, hash chain untouched.
     */
    membershipSet: boolean;
    lastActivityT: number; lapseWarned: boolean };
  private crownLapsedFlag = false;
  private members = new Map<MemberId, MemberRecord>();
  /** The departures, folded (Q901): see `departures()`. */
  private departed: Array<{ member: MemberId; t: number; by: DepartureBy }> = [];
  private settings = new Map<PowerKey, SettingState>();
  private quorumFormValue: 'count' | 'share' = 'share';
  private startingText: string | null = null;
  private textConfirmedFlag = false;
  private slugHistory: string[] = [];
  /** The birth's own `t` and its 🧭 shape (entry 166), read off `created` so `replay` rebuilds both. */
  private createdT: number | null = null;
  private shapeName: ShapeName | null = null;
  private constitutedT: number | null = null;
  private closedFlag = false;
  private closedT: number | null = null;
  private anchors: ThresholdAnchors | null = null;
  private frozenFlag = false;
  private motions = new Map<MotionId, MotionRecord>();
  private crownQuestions = new Map<string, CrownQuestionRecord>();
  private applicants = new Map<string, ApplicantRecord>();
  /**
   * The release batches, by id (entry 162, Q1013), and the two fields that
   * decide whether a further release **joins** one or opens a new one. All
   * three are recomputed **in the fold** and never only in the command: a
   * batch id minted in the command would replay differently from the session
   * that wrote it.
   */
  private releaseBatches = new Map<string, ReleaseBatchRecord>();
  private lastReleaseT: number | null = null;
  private lastReleaseBatch: string | null = null;
  private nextReleaseN = 1;
  /** The mail-give-up batches, by id (SURFACE E34). One pass, one batch, so
   *  there is no open-batch pair here — the counter alone, moved in the fold
   *  for `nextReleaseN`'s reason. */
  private mailGiveUpBatches = new Map<string, MailGiveUpBatchRecord>();
  private nextMailGiveUpN = 1;
  private nextMemberN = 1;
  private nextMotionN = 1;
  private nextCrownN = 1;
  private nextApplicantN = 1;

  // -------------------------------------------------------------------------
  // Opening and replay

  static open(input: OpenInput, t: number): ConstitutionSession {
    const s = new ConstitutionSession();
    if (!input.title.trim()) throw new Error('a document begins with its title (§9.7a)');
    const slugErr = validateFor(entryOf('link'), { slug: input.slug });
    if (slugErr) throw new Error(slugErr);
    // a shape the table does not know is refused here, before anything is
    // written — the server has already dropped anything but a row's name
    const shape = input.shape === undefined ? null : shapeOf(input.shape);
    s.emit({ type: 'created', t, title: input.title, slug: input.slug,
      convenor: input.convenor,
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

  /** Rebuild a session by replaying a log (verifies the hash chain). */
  static replay(log: LogEntry[]): ConstitutionSession {
    const s = new ConstitutionSession();
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

  private apply(rawEvent: ConstitutionEvent, _seq: number): void {
    const event = foldLegacyIds(rawEvent);
    if (event.t < this.lastT) throw new Error('timestamps must be non-decreasing');
    this.lastT = event.t;
    switch (event.type) {
      case 'created': {
        const c = event.convenor;
        this.createdT = event.t;
        this.shapeName = event.shape ?? null;
        this.convenor = { ...c, name: c.name ?? null, picture: c.picture ?? null,
          // a founder who arrives already carrying one has answered it (Q645)
          nameSet: c.name !== undefined, pictureSet: c.picture !== undefined,
          // 🎩 is asked, never assumed: `isMember` arrives with the creation
          // and answers nothing about whether the founder was put the question
          membershipSet: false,
          lastActivityT: event.t, lapseWarned: false };
        // **Nothing arrives delegated** (Ed, 2026-08-21, amending SPEC §9.0a,
        // closing Q511). Every held setting is born with the founder holding
        // it, both powers intact and its question shut, because a default
        // holder states an answer the founder has not given — the clause
        // reads *The Founder is deciding X* until they decide it, and
        // delegating is the ✒️/🛡️ act like any other, which is what emits
        // `setting-delegated` and opens the blind question.
        //
        // §9.0a used to say the roster was the default holder of the
        // constitutional ones, on the argument that a default you must argue
        // out of is stronger than a ticked radio. The cost was that ten
        // questions opened for answering at the instant of creation, before
        // the founder had seen one of them — so the room could be answering
        // while the founder was still naming the document, and the surface
        // could not tell a default apart from a decision.
        // Birth is uniform; the catalogue carried a `holderDefault` column as
        // doctrine until 2026-08-22 (spec pass 1, finding 554), read by nothing.
        for (const id of HELD) {
          this.settings.set(id, {
            id,
            holder: 'convenor',
            powers: { unilateral: true, assent: true },
            // both powers are the convenor's by construction at the birth
            powerFrom: { unilateral: 'founding', assent: 'founding' },
            pendingRelease: { unilateral: false, assent: false },
            value: null,
            previousValue: null,
            setWhy: null,
            settledBy: null,
            settledAtT: null,
            collecting: false,
            answers: new Map(),
            distribution: null,
          });
        }
        this.foldSet('title', { text: event.title }, 'convenor', event.t);
        this.foldSet('link', { slug: event.slug }, 'convenor', event.t);
        this.slugHistory.push(event.slug);
        if (c.isMember) {
          const rec = this.freshMember(c.id, c.email, event.t, event.t,
            { via: 'founding', by: null });
          // readers prefer the MemberRecord over the convenor struct, so a
          // founder created already carrying a name has to arrive with it here
          // too, or the two disagree from the first event (Q645)
          rec.name = this.convenor.name;
          rec.picture = this.convenor.picture;
          rec.nameSet = this.convenor.nameSet;
          rec.pictureSet = this.convenor.pictureSet;
          this.members.set(c.id, rec);
        }
        break;
      }
      case 'convenor-membership-set': {
        // **🎩 decides where the founder sits, not who they are** (Q646). This
        // rebuilt the record from `freshMember` on every tick, so a founder who
        // named themselves and then revisited 🎩 — the radios stay live until
        // the start (SURFACE C9) — lost their name, their picture, the OKs they
        // were owed and the ones they had given. Identity binds nobody (§9.0c,
        // exception X15: *the convenor with no powers and no membership keeps
        // their name and picture*), so nothing about it belongs to the seat.
        // It carries **both** ways: while they are a member their identity
        // lives on the MemberRecord and the convenor struct goes stale, so
        // unticking without carrying it back served a name from before they
        // joined.
        // the seat only moves when the answer differs from where they sit;
        // an answer that repeats itself records the act and nothing else
        if (event.isMember === this.members.has(this.convenor.id)) {
          this.convenor.membershipSet = true;
          break;
        }
        if (event.isMember) {
          const rec = this.freshMember(this.convenor.id, this.convenor.email,
            event.t, event.t, { via: 'founding', by: null });
          const prev = this.members.get(this.convenor.id);
          rec.name = prev ? prev.name : this.convenor.name;
          rec.picture = prev ? prev.picture : this.convenor.picture;
          rec.nameSet = prev ? prev.nameSet : this.convenor.nameSet;
          rec.pictureSet = prev ? prev.pictureSet : this.convenor.pictureSet;
          if (prev) {
            rec.okOwed = prev.okOwed;
            rec.okGiven = prev.okGiven;
            // the release batches travel with the OKs, for the same reason:
            // what is owed belongs to the person, not to the seat (entry 162)
            rec.releasesOwed = prev.releasesOwed;
            rec.releasesGiven = prev.releasesGiven;
            // and the amendment news with them, for the same reason
            // (SURFACE E35)
            rec.amendmentsOwed = prev.amendmentsOwed;
            rec.amendmentsGiven = prev.amendmentsGiven;
            // and the mail news with them, for the same reason (SURFACE E34)
            rec.mailGaveUpOwed = prev.mailGaveUpOwed;
            rec.mailGaveUpGiven = prev.mailGaveUpGiven;
            rec.mailGaveUp = prev.mailGaveUp;
            rec.lastActivityT = prev.lastActivityT;
          } else {
            rec.lastActivityT = Math.max(rec.lastActivityT, this.convenor.lastActivityT);
          }
          this.members.set(this.convenor.id, rec);
        } else {
          const prev = this.members.get(this.convenor.id);
          if (prev) {
            this.convenor.name = prev.name;
            this.convenor.picture = prev.picture;
            this.convenor.nameSet = prev.nameSet;
            this.convenor.pictureSet = prev.pictureSet;
            this.convenor.lastActivityT = prev.lastActivityT;
          }
          this.members.delete(this.convenor.id);
        }
        // the act, not the value (Q682): whichever way it went, 🎩 was asked
        this.convenor.membershipSet = true;
        break;
      }
      case 'setting-set': {
        this.touch(this.convenor.id, event.t); // a convenor act moves their clock
        // read before foldSet overwrites it: this is the whole of what tells
        // a first decision from a change (Q530)
        const prevOf = this.settings.get(event.setting);
        const wasValue = prevOf ? prevOf.value : null;
        this.foldSet(event.setting, event.value, event.by, event.t);
        const nowSt = this.settings.get(event.setting);
        if (nowSt) {
          nowSt.previousValue = wasValue;
          nowSt.setWhy = event.why ?? null;
        }
        // **A pen change is an amendment, and is recorded as one** (Ed,
        // 2026-08-22: *a unilateral rule change by the founder is still just
        // a kind of amendment and so should be treated in the same way in
        // terms of how it's communicated and reported*). So it does not get
        // a list of its own — it joins the motions, where every other
        // amendment already lives, and the record renders it beside them
        // without knowing it is different. It is **folded, not emitted**:
        // synthesised here from the `setting-set` event the log already
        // carried, so no event shape changed and the hash chain is untouched,
        // the same technique as `arrival` in Q524.
        //
        // A **first decision is not in it**, by the same test the
        // acknowledgement uses: nothing was amended, so there is no
        // amendment. §9.6a in the spec's own words.
        if (wasValue !== null) {
          const id = ('pen:' + event.setting + ':' + event.t) as MotionId;
          this.motions.set(id, {
            id,
            by: this.convenor.id,
            payload: { kind: 'set', setting: event.setting, value: event.value },
            route: 'pen',
            stake: 0,
            openedAtT: event.t,
            why: event.why ?? null,
            // it opens and settles in one act — nobody had to agree
            status: 'carried',
            answers: new Map(),
            settledAtT: event.t,
          });
          this.penFrom.set(id, wasValue);
        }
        if (event.setting === 'quorum') {
          this.quorumFormValue = (event.value as QuorumValue).form;
        }
        if (event.setting === 'link') {
          const slug = (event.value as SlugValue).slug;
          if (!this.slugHistory.includes(slug)) this.slugHistory.push(slug);
        }
        if (CONSTITUTIONAL.has(event.setting)) {
          for (const m of this.members.values()) m.okGiven.delete(event.setting);
        }
        this.reseedAnchorsIfLive(event.t, event.setting);
        break;
      }
      case 'setting-delegated': {
        const st = this.settings.get(event.setting)!;
        this.setPowers(st, { unilateral: false, assent: false });
        st.collecting = true;
        st.value = null;
        st.settledBy = null;
        st.settledAtT = null;
        st.distribution = null;
        break;
      }
      case 'setting-reclaimed': {
        const st = this.settings.get(event.setting)!;
        // reclaiming a delegation withdraws the question; reclaiming a
        // relinquished power on a still-held setting (§9.6a: pre-start the
        // founder's powers are as revisable as their values) must not touch
        // the value the founder has already set
        const wasDelegated = st.holder === 'members';
        this.setPowers(st, { unilateral: true, assent: true });
        if (wasDelegated) {
          st.collecting = false;
          st.answers.clear();
          st.value = null;
          st.settledBy = null;
          st.settledAtT = null;
          st.distribution = null;
        }
        break;
      }
      case 'starting-text-confirmed': {
        this.startingText = event.text.replace(/\r\n?/g, '\n');
        this.textConfirmedFlag = true;
        break;
      }
      case 'text-amended': {
        this.touch(this.convenor.id, event.t); // a convenor act moves their clock
        // **The same record shape the pen fold above builds** (R-004, R-058):
        // a unilateral change by the Founder is still just a kind of
        // amendment, so it joins the motions rather than getting a list of
        // its own, and every existing reader already says *The Founder* for
        // `route === 'pen'` without knowing this kind exists. It opens and
        // settles in one act — nobody had to agree.
        const id = ('pen:text:' + event.candidateId) as MotionId;
        this.motions.set(id, {
          id,
          by: this.convenor.id,
          payload: { kind: 'text', candidateId: event.candidateId, summary: event.summary },
          route: 'pen',
          stake: 0,
          openedAtT: event.t,
          why: event.why ?? null,
          status: 'carried',
          answers: new Map(),
          settledAtT: event.t,
        });
        // **The owing is not done here** (Q1034, and see `oweAmendment`).
        // `replay` calls `apply` directly while `emit` pushes to the log, so
        // an owing performed in a fold appends events to every session that
        // replays that log. It rides `recordTextAmendment`, on the command
        // path, where every other owing in this file rides.
        break;
      }
      case 'quorum-form-set': {
        this.quorumFormValue = event.form;
        break;
      }
      case 'identity-set': {
        // **The act is what is recorded, not the value** (Q645). A key present
        // on the event means the member answered that question; the answer may
        // perfectly well be null — a blank name is Anonymous (§9.0c) and a
        // picture is removed by choosing initials — so `!== undefined` is the
        // test, never truthiness.
        if (event.member === this.convenor.id && !this.members.has(event.member)) {
          if (event.name !== undefined) { this.convenor.name = event.name; this.convenor.nameSet = true; }
          if (event.picture !== undefined) { this.convenor.picture = event.picture; this.convenor.pictureSet = true; }
          break;
        }
        const m = this.members.get(event.member)!;
        if (event.name !== undefined) { m.name = event.name; m.nameSet = true; }
        if (event.picture !== undefined) { m.picture = event.picture; m.pictureSet = true; }
        this.touch(event.member, event.t);
        break;
      }
      case 'member-invited': {
        // a motion carried it, one member's word did (🪪 at ✒️), or the
        // convenor's own drafting power did
        const arrival: Arrival = event.viaMotion !== undefined
          ? { via: 'invitation', by: 'members' }
          : event.by !== undefined
            ? { via: 'invitation', by: 'member', inviter: event.by }
            : { via: 'invitation', by: 'convenor' };
        this.members.set(event.member,
          this.freshMember(event.member, event.email, event.t, null, arrival));
        this.nextMemberN += 1;
        break;
      }
      case 'member-uninvited': {
        const m = this.members.get(event.member)!;
        m.removed = true;
        break;
      }
      case 'member-arrived': {
        const m = this.members.get(event.member)!;
        m.arrivedAtT = event.t;
        m.lastActivityT = event.t;
        break;
      }
      case 'member-removed': {
        const m = this.members.get(event.member)!;
        m.removed = true;
        m.removedBy = event.by ?? 'members';
        // Q901 / E31–E32: a departure is a fact about the membership and the
        // record keeps no time for it, so it is folded here — once per event,
        // at replay or at the act — rather than read off the log by every
        // `view()`. An invitee who never arrived is not a departure: nobody
        // left the membership (entry 96).
        if (m.arrivedAtT !== null) {
          this.departed.push({ member: event.member, t: event.t, by: m.removedBy });
        }
        break;
      }
      case 'answer-given': {
        const st = this.settings.get(event.setting)!;
        st.answers.set(event.member, event.value);
        this.touch(event.member, event.t);
        break;
      }
      case 'question-resolved': {
        const st = this.settings.get(event.setting)!;
        st.collecting = false;
        st.value = event.value;
        st.settledBy = 'ceremony';
        st.settledAtT = event.t;
        st.distribution = event.distribution;
        if (event.setting === 'quorum') {
          this.quorumFormValue = (event.value as QuorumValue).form;
        }
        this.reseedAnchorsIfLive(event.t, event.setting);
        break;
      }
      case 'ceremony-ground-shifted':
        break; // answers stand — the event is the notification (§9.6a)
      case 'constituted': {
        this.constitutedT = event.t;
        this.anchors = this.computeAnchors(event.t);
        // **A recorded act beats the card's reading of it, so it is spent
        // first** (entry 158). 🍾 spends every **pending** release (R-048): a
        // power laid down while the founding ran was recorded then and takes
        // effect now. Where that and `laidDown` disagree, the recorded
        // `power-relinquished` wins — and since `setPowers` clears
        // `pendingRelease`, winning is a matter of running first. Derived at
        // the fold, so no event shape changed and the frozen log replays byte
        // for byte.
        for (const st of this.settings.values()) {
          if (!st.pendingRelease.unilateral && !st.pendingRelease.assent) continue;
          this.setPowers(st, {
            unilateral: st.powers.unilateral && !st.pendingRelease.unilateral,
            assent: st.powers.assent && !st.pendingRelease.assent,
          });
        }
        if (event.laidDown === undefined) {
          // **The start lays the founder's hand off the Text** — the fold as
          // it stood before entry 158, and what every log written before it
          // replays into. A shield kept on the Text would have made every
          // adoption wait on founder assent, which is no drafting engine's
          // default; the road to a held Text was a post-start reserve motion.
          this.setPowers(this.settings.get('startingText')!, { unilateral: false, assent: false });
        } else {
          // **…and where 🍾 was asked, the start lays down whatever it was
          // not told to keep** (Ed, 2026-08-27; SPEC §9.7 rule 8 as amended,
          // R-057). The list is authoritative and complete over `HELD` — the
          // Text included, which is why keeping ✒️ or 🛡️ on it is expressible
          // at all for the first time. **Lowering only**: a power the list
          // names goes, a power it does not is left exactly as it stands, so
          // nothing here can ever re-grant. One `setPowers` per key rather
          // than per pair, since the pair is one hand.
          const down = new Map<PowerKey, { unilateral: boolean; assent: boolean }>();
          for (const r of event.laidDown) {
            const cur = down.get(r.setting) ?? { unilateral: false, assent: false };
            cur[r.power] = true;
            down.set(r.setting, cur);
          }
          for (const [k, d] of down) {
            const st = this.settings.get(k);
            if (!st) continue;  // a key the catalogue no longer has
            this.setPowers(st, {
              unilateral: st.powers.unilateral && !d.unilateral,
              assent: st.powers.assent && !d.assent,
            });
          }
        }
        break;
      }
      case 'ok-owed': {
        const m = this.members.get(event.member)!;
        for (const id of event.settings) m.okOwed.add(id);
        break;
      }
      case 'ok-given': {
        const m = this.members.get(event.member)!;
        m.okOwed.delete(event.setting);
        m.okGiven.add(event.setting);
        this.touch(event.member, event.t);
        break;
      }
      case 'release-owed': {
        const m = this.members.get(event.member)!;
        m.releasesOwed.add(event.batch);
        // **The batch grows by union, and the id counter moves here** (entry
        // 162). A second `relinquish` at the same `t` re-emits under the id
        // that is already open, so the batch gains releases without a byte of
        // the log being rewritten; a first sighting of an id is what mints it,
        // which is why `nextReleaseN` is advanced in the fold and nowhere else.
        const rec = this.releaseBatches.get(event.batch);
        if (rec) {
          for (const r of event.releases) {
            if (!rec.releases.some((x) => x.setting === r.setting && x.power === r.power)) {
              rec.releases.push({ ...r });
            }
          }
        } else {
          this.releaseBatches.set(event.batch,
            { id: event.batch, t: event.t, releases: event.releases.map((r) => ({ ...r })) });
          this.nextReleaseN += 1;
        }
        this.lastReleaseT = event.t;
        this.lastReleaseBatch = event.batch;
        break;
      }
      case 'release-ok': {
        const m = this.members.get(event.member)!;
        m.releasesOwed.delete(event.batch);
        m.releasesGiven.add(event.batch);
        this.touch(event.member, event.t);
        break;
      }
      case 'amendment-owed': {
        // **Nothing is minted here** — the release fold above mints a batch id
        // and grows the batch by union, because one act can lay down
        // thirty-four powers. An amendment carries the candidate id it is
        // about, so there is nothing to mint and nothing to join: the whole of
        // what is remembered is which candidate, and where it changed the text
        // is a question for the engine (SURFACE E35, Q1034).
        this.members.get(event.member)!.amendmentsOwed.add(event.candidate);
        break;
      }
      case 'amendment-ok': {
        const m = this.members.get(event.member)!;
        m.amendmentsOwed.delete(event.candidate);
        m.amendmentsGiven.add(event.candidate);
        this.touch(event.member, event.t);
        break;
      }
      case 'mail-gave-up': {
        // the batch is minted by its first sighting, exactly as a release
        // batch is, so a replay rebuilds the counter without it being written
        if (!this.mailGiveUpBatches.has(event.batch)) {
          this.mailGiveUpBatches.set(event.batch,
            { id: event.batch, t: event.t, addresses: [...event.addresses] });
          this.nextMailGiveUpN += 1;
        }
        // **The subject is marked whoever is told** (SURFACE E34): the row's
        // fact belongs to the address, not to the audience, so it is set from
        // every copy of the event and from the told-nobody one too. Case-blind:
        // an older log holds an address as it was typed.
        for (const rec of this.members.values()) {
          if (event.addresses.some((a) => a.toLowerCase() === rec.email.toLowerCase())) {
            rec.mailGaveUp = true;
          }
        }
        if (event.member !== null) {
          this.members.get(event.member)!.mailGaveUpOwed.add(event.batch);
        }
        break;
      }
      case 'mail-gave-up-ok': {
        const m = this.members.get(event.member)!;
        m.mailGaveUpOwed.delete(event.batch);
        m.mailGaveUpGiven.add(event.batch);
        this.touch(event.member, event.t);
        break;
      }
      case 'mail-resent': {
        // the row's line clears; nobody's owed batch does. The card is the
        // record of something that happened, and a re-send does not un-happen
        // it (SURFACE E34's Persistence column; Q1030).
        this.members.get(event.member)!.mailGaveUp = false;
        this.touch(event.by, event.t);
        break;
      }
      case 'floor-recomputed':
        break; // an announcement (§9.3/Q10); the numbers ride in the event
      case 'tick':
        break;
      default:
        this.applyLifecycle(event);
    }
  }

  /** Motions and the crown (§9.6–§9.7, v0.48). */
  private applyLifecycle(event: ConstitutionEvent): void {
    switch (event.type) {
      case 'motion-opened': {
        this.motions.set(event.motion, {
          id: event.motion,
          by: event.by,
          payload: event.payload,
          route: event.route,
          stake: event.stake,
          openedAtT: event.t,
          why: event.why ?? null,
          status: 'running',
          answers: new Map(),
          settledAtT: null,
        });
        this.nextMotionN += 1;
        if (event.payload.kind === 'admit') {
          this.applicants.get(event.payload.applicant)!.motion = event.motion;
        }
        if (event.by) this.touch(event.by, event.t);
        break;
      }
      case 'motion-answer': {
        const rec = this.motions.get(event.motion)!;
        rec.answers.set(event.member, event.answer);
        this.touch(event.member, event.t);
        break;
      }
      case 'power-relinquished': {
        const st = this.settings.get(event.setting)!;
        // **A pre-start release takes effect at Begin** (Ed, 2026-08-25;
        // R-048). The act is recorded here and now — this event is the
        // record of it — but the power stays the convenor's until 🍾, so
        // everything that reads `powers` before the start reads the hand
        // that is actually on the setting. `constituted` spends it.
        if (this.constitutedT === null) {
          st.pendingRelease = { ...st.pendingRelease, [event.power]: true };
        } else {
          const powers: Powers = { ...st.powers, [event.power]: false };
          this.setPowers(st, powers);
        }
        this.touch(this.convenor.id, event.t);
        break;
      }
      case 'motion-withdrawn': {
        const rec = this.motions.get(event.motion)!;
        rec.status = 'withdrawn';
        rec.settledAtT = event.t;
        break;
      }
      case 'motion-carried': {
        const rec = this.motions.get(event.motion)!;
        rec.status = 'carried';
        rec.settledAtT = event.t;
        if (rec.payload.kind === 'set') {
          this.applyPayloadSet(rec.payload.setting, rec.payload.value, 'motion', event.t);
        }
        if (rec.payload.kind === 'reserve') {
          // The room crowned the convenor — willing or lapsed (§9.7 v0.52,
          // Ed: a lapsed one is a constitutional monarchy, powers held and
          // auto-abstained). An unwilling crown's release is delegation,
          // which stays the convenor's own free act. v0.54: the motion may
          // restore one power or both (Q394); omitted means both.
          const st = this.settings.get(rec.payload.setting)!;
          const p = rec.payload.power ?? 'both';
          // 'motion' (Q524): this is the only door a power comes back
          // through from outside, so it is the only source that is not the
          // birth — and the one thing the crown's own card can truthfully
          // say about where it got its pen.
          this.setPowers(st, {
            unilateral: st.powers.unilateral || p !== 'assent',
            assent: st.powers.assent || p !== 'unilateral',
          }, 'motion');
        }
        // membership payloads apply through their follow-on events
        break;
      }
      case 'motion-adjudicated': {
        const rec = this.motions.get(event.motion)!;
        rec.settledAtT = event.t;
        if (event.outcome === 'held') {
          rec.status = 'held';
        } else if (this.reservedTarget(rec)) {
          // Reserved is assent, not silence (§9.7): the carried change goes
          // to the convenor as a 👑 question rather than applying.
          rec.status = 'awaiting-crown';
          rec.settledAtT = null;
        } else {
          rec.status = 'carried';
          if (rec.payload.kind === 'set') {
            this.applyPayloadSet(rec.payload.setting, rec.payload.value, 'motion', event.t);
          }
        }
        break;
      }
      case 'crown-question-opened': {
        this.crownQuestions.set(event.question, {
          id: event.question,
          motion: event.motion,
          ...(event.text ? { text: event.text } : {}),
          openedAtT: event.t,
          status: 'pending',
        });
        // Either route parks here (§9.7 v0.49): the change is the members'
        // and the assent is still owed. A text question (Q440) parks no
        // motion -- the engine already adopted; the host holds the text.
        if (event.motion !== null) {
          const parked = this.motions.get(event.motion)!;
          parked.status = 'awaiting-crown';
          parked.settledAtT = null;
        }
        this.nextCrownN += 1;
        break;
      }
      case 'crown-question-answered':
      case 'crown-question-auto-passed': {
        const q = this.crownQuestions.get(event.question)!;
        const accepted = event.type === 'crown-question-auto-passed' ||
          event.outcome === 'accept';
        q.status = event.type === 'crown-question-auto-passed'
          ? 'auto-passed'
          : accepted ? 'accepted' : 'rejected';
        if (q.motion !== null) {
          const rec = this.motions.get(q.motion)!;
          rec.status = accepted ? 'carried' : 'held';
          rec.settledAtT = event.t;
          if (accepted && rec.payload.kind === 'set') {
            this.applyPayloadSet(rec.payload.setting, rec.payload.value, 'crown', event.t);
          }
        }
        if (event.type === 'crown-question-answered') {
          this.touch(this.convenor.id, event.t);
        }
        break;
      }
      case 'setting-handed-over': {
        const st = this.settings.get(event.setting)!;
        this.setPowers(st, { unilateral: false, assent: false });
        this.touch(this.convenor.id, event.t);
        break;
      }
      case 'crown-lapsed': {
        // Lapse is automatic abstention (§9.7 v0.49): nothing changes hands —
        // every reserved setting stays reserved, and while the flag stands
        // assent is granted by itself (reservedTarget reads it).
        this.crownLapsedFlag = true;
        break;
      }
      case 'crown-returned': {
        // Revival is logging in (§9.5a): the assent requirement resumes.
        this.crownLapsedFlag = false;
        this.convenor.lapseWarned = false;
        this.touch(this.convenor.id, event.t);
        break;
      }
      default:
        this.applyPresence(event);
    }
  }

  /** Presence, the freeze, lapsing and applications (§9.5, §9.5a, §9.7½). */
  private applyPresence(event: ConstitutionEvent): void {
    switch (event.type) {
      case 'signed-out': {
        const m = this.members.get(event.member)!;
        m.signedOut = event.mode;
        this.touch(event.member, event.t);
        break;
      }
      case 'member-returned': {
        const m = this.members.get(event.member)!;
        m.signedOut = null;
        m.lapsed = false;
        m.lapseWarned = false;
        this.touch(event.member, event.t);
        break;
      }
      case 'member-seen':
        this.touch(event.member, event.t);
        break;
      case 'lapse-warned': {
        if (event.member === this.convenor.id && !this.members.has(event.member)) {
          this.convenor.lapseWarned = true;
        } else {
          this.members.get(event.member)!.lapseWarned = true;
        }
        break;
      }
      case 'member-lapsed': {
        this.members.get(event.member)!.lapsed = true;
        break;
      }
      case 'frozen': {
        this.frozenFlag = true;
        break;
      }
      case 'thawed': {
        this.frozenFlag = false;
        break;
      }
      case 'closed': {
        this.closedFlag = true;
        this.closedT = event.t;
        break;
      }
      case 'motion-kept-at-close': {
        const rec = this.motions.get(event.motion)!;
        rec.status = 'kept-at-close';
        rec.settledAtT = event.t;
        break;
      }
      case 'crown-failed-closed': {
        const q = this.crownQuestions.get(event.question)!;
        q.status = 'failed-closed';
        if (q.motion !== null) {
          const rec = this.motions.get(q.motion)!;
          rec.status = 'held';
          rec.settledAtT = event.t;
        }
        break;
      }
      case 'invitation-expired': {
        this.members.get(event.member)!.invitationExpired = true;
        break;
      }
      case 'close-acknowledged': {
        const m = this.members.get(event.member);
        if (m) m.closingAck = { t: event.t, comment: event.comment };
        break;
      }
      case 'application-started': {
        this.applicants.set(event.applicant, {
          id: event.applicant,
          email: event.email,
          status: 'started',
          name: null, picture: null, words: null,
          motion: null,
        });
        this.nextApplicantN += 1;
        break;
      }
      case 'application-verified': {
        this.applicants.get(event.applicant)!.status = 'verified';
        break;
      }
      case 'application-submitted': {
        const a = this.applicants.get(event.applicant)!;
        a.status = 'submitted';
        a.name = event.name ?? null;
        a.picture = event.picture ?? null;
        a.words = event.words ?? null;
        break;
      }
      case 'application-proposed': {
        this.applicants.get(event.applicant)!.status = 'proposed';
        this.touch(event.by, event.t);
        break;
      }
      case 'member-admitted': {
        const a = this.applicants.get(event.applicant)!;
        a.status = 'admitted';
        // an application is admitted by an ordinary motion, always the room's act
        const rec = this.freshMember(event.member, a.email, event.t, event.t,
          { via: 'application', by: 'members' });
        rec.name = a.name;
        rec.picture = a.picture;
        this.members.set(event.member, rec);
        this.nextMemberN += 1;
        break;
      }
      case 'application-refused': {
        this.applicants.get(event.applicant)!.status = 'refused';
        break;
      }
      default:
        throw new Error(`unhandled event '${event.type}'`);
    }
  }

  /** A carried change lands on the setting, keeping who holds it. */
  private applyPayloadSet(id: SettingId, value: SettingValue,
    by: 'motion' | 'crown', t: number): void {
    const st = this.settings.get(id)!;
    st.value = value;
    st.settledBy = by;
    st.settledAtT = t;
    st.collecting = false;
    this.foldLegacy(st, t);
    if (id === 'quorum') this.quorumFormValue = (value as QuorumValue).form;
    if (id === 'link') {
      const slug = (value as SlugValue).slug;
      if (!this.slugHistory.includes(slug)) this.slugHistory.push(slug);
    }
    this.reseedAnchorsIfLive(t, id);
  }

  /** Does this motion's target sit behind the crown's assent (§9.7)?
   *  v0.54: the assent power specifically — a setting held unilateral-only
   *  applies a carried change with nobody's accept asked. */
  private reservedTarget(rec: MotionRecord): boolean {
    if (this.crownLapsedFlag) return false;
    if (rec.payload.kind === 'set') {
      return this.settings.get(rec.payload.setting)!.powers.assent;
    }
    // a reserve motion's target is the members' by construction — it lands
    // without assent, the crown's release being delegation (§9.7 v0.52)
    // a text amendment (R-058) waits on nothing either: it is the pen's own
    // act and it has already landed — nobody assents to their own decree
    if (rec.payload.kind === 'reserve' || rec.payload.kind === 'text') return false;
    // an act at a door waits on that door's 🛡️ (entry 94): admissions of
    // every kind on ✉️'s, removals on ❌'s
    return this.doorPowers(rec.payload.kind === 'remove' ? 'door:remove' : 'door:invite').assent;
  }

  /** §9.7 v0.54: holder derives from powers — the convenor's iff any is held. */
  /**
   * `from` (Q524) says where a power *newly held* came from; a power that was
   * already held keeps the source it arrived with, and one being given up
   * loses its source with it. Defaulting to 'founding' is right for every
   * caller but the carried reserve motion, which is the only way a power
   * reaches the convenor from outside.
   */
  private setPowers(st: SettingState, powers: Powers,
    from: PowerSource = 'founding'): void {
    const was = st.powers;
    st.powerFrom = {
      unilateral: !powers.unilateral ? null
        : was.unilateral ? st.powerFrom.unilateral : from,
      assent: !powers.assent ? null
        : was.assent ? st.powerFrom.assent : from,
    };
    st.powers = powers;
    st.holder = holderOf(powers);
    // whatever moves a power decides it: a pre-start release that has been
    // spent at 🍾, reclaimed, or overtaken by a delegation is no longer
    // pending anything (R-048)
    st.pendingRelease = { unilateral: false, assent: false };
  }

  private freshMember(id: MemberId, email: string, invitedAtT: number,
    arrivedAtT: number | null, arrival: Arrival): MemberRecord {
    return {
      id, email, invitedAtT, arrivedAtT, arrival,
      removed: false, removedBy: null, lapsed: false, lapseWarned: false, signedOut: null,
      name: null, picture: null, nameSet: false, pictureSet: false,
      lastActivityT: arrivedAtT ?? invitedAtT,
      okOwed: new Set(), okGiven: new Set(),
      releasesOwed: new Set(), releasesGiven: new Set(),
      amendmentsOwed: new Set(), amendmentsGiven: new Set(),
      mailGaveUpOwed: new Set(), mailGaveUpGiven: new Set(), mailGaveUp: false,
      invitationExpired: false, closingAck: null,
    };
  }

  private foldSet(id: SettingId, value: SettingValue, by: 'convenor' | 'crown',
    t: number): void {
    const st = this.settings.get(id)!;
    // holder untouched: setting a value never changes who holds the setting
    // (§9.7 v0.54 — a {unilateral, no-assent} crown must stay exactly that)
    st.collecting = false;
    st.value = value;
    st.settledBy = by === 'crown' ? 'crown' : 'convenor';
    st.settledAtT = t;
    this.foldLegacy(st, t);
  }

  /**
   * Legacy values, read onto the present shapes and stripped from what
   * stands, so an old log and a fresh session reach the same state; the
   * event keeps its bytes. Two migrations live here:
   *
   * - **Q506 (2026-08-21):** a legacy applications value carried the
   *   register's crown as `holder`; the pair now lives on the setting's own
   *   powers like every held-able setting.
   * - **Entry 94 (2026-08-26):** 🤝's four-rung `joinPolicy` became the one
   *   switch `apply`, the price moved to 🪪, and 🥾's rungs moved onto the
   *   same price scale. `open` was "the door is open *and* free", so it also
   *   seeds 🪪 to `pen` where 🪪 has no value yet — the only way a legacy log
   *   keeps meaning what it meant.
   */
  private foldLegacy(st: SettingState, t: number): void {
    if (st.value === null) return;
    if (st.id === 'applications') {
      const v = st.value as ApplicationsValue;
      if (v.holder !== undefined) {
        const h = v.holder;
        const powers = {
          unilateral: h === 'reserved' || h === 'reserved-unilateral',
          assent: h === 'reserved' || h === 'reserved-assent',
        };
        this.setPowers(st, powers);
        // the legacy holder was the *register's* crown, which since entry 94
        // is ✉️'s pair — so a log that laid it down laid the door's down
        this.setPowers(this.settings.get('door:invite')!, powers);
      }
      if (v.apply === undefined || v.holder !== undefined || v.joinPolicy !== undefined) {
        st.value = { apply: mayApply(v) };
      }
      if (v.joinPolicy === 'open') {
        const adm = this.settings.get('admission')!;
        if (adm.value === null) {
          adm.value = { price: 'pen' };
          adm.collecting = false;
          adm.settledBy = st.settledBy;
          adm.settledAtT = t;
        }
      }
    } else if (st.id === 'removal') {
      const rung = (st.value as { rung?: string }).rung;
      if (rung === undefined) return;
      const price: Price = rung === 'everyone' ? 'consent' : rung === 'others' ? 'assembly' : 'proposal';
      st.value = { price };
    }
  }

  /** What an act on the membership costs, as the document stands — unset
   *  reads as the most protective rung, exactly as a legacy log did. */
  private priceOf(id: 'admission' | 'removal'): Price {
    const st = this.settings.get(id);
    const v = st ? (st.value as PriceValue | null) : null;
    return v?.price ?? (id === 'admission' ? 'assembly' : 'consent');
  }

  private touch(member: MemberId, t: number): void {
    const m = this.members.get(member);
    if (m) { m.lastActivityT = t; m.lapseWarned = false; }
    if (member === this.convenor.id) {
      this.convenor.lastActivityT = t;
      this.convenor.lapseWarned = false;
    }
  }

  // -------------------------------------------------------------------------
  // Threshold anchors (§4.3): seeded at constituted, reseeded when the room's
  // pacing settings settle late (prospective application, NOTES.md).

  private computeAnchors(t: number): ThresholdAnchors {
    const bar = this.settings.get('bar')!.value as PercentValue | null;
    const pace = this.settings.get('pace')!.value as PaceValue | null;
    const ending = this.settings.get('ending')!.value as EndingValue | null;
    const endPct = bar ? bar.pct : 95;
    const endT = ending ? ending.endsAtMs : null;
    const shape: 'fixed' | 'ramp' =
      endT !== null && pace?.shape === 'ramp' ? 'ramp' : 'fixed';
    return seedAnchors(shape, shape === 'ramp' ? (pace as { shape: 'ramp'; startPct: number }).startPct : null,
      endPct, t, endT);
  }

  private reseedAnchorsIfLive(t: number, setting: SettingId): void {
    if (this.constitutedT === null || this.anchors === null) return;
    if (setting === 'ending') {
      const ending = this.settings.get('ending')!.value as EndingValue | null;
      this.anchors = reAnchor(this.anchors, t, ending ? ending.endsAtMs : null);
    } else if (setting === 'bar' || setting === 'pace') {
      this.anchors = this.computeAnchors(t);
    }
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
    // Post-start a reserved setting is the convenor's to change directly —
    // the assent was consented on the way in (§9.7, Ed's 366; NOTES.md).
    this.emit({ type: 'setting-set', t, setting, value,
      by: postStart ? 'crown' : 'convenor',
      ...(reason === undefined ? {} : { why: reason }) });
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
   * setting's value among nineteen rather than the whole document's clock.
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
    const e: ConstitutionEvent = { type: 'identity-set', t, member };
    if (identity.name !== undefined) (e as { name?: string | null }).name = identity.name;
    if (identity.picture !== undefined) (e as { picture?: string | null }).picture = identity.picture;
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
    this.emit({ type: 'member-invited', t, member: id, email,
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
    if (wasInE) this.afterRosterChange(t, 'departure', member);
  }

  /**
   * Resignation (entry 94): free, immediate, refusable by nobody — a
   * person's consent to their own leaving is the purest case of ✒️. It is
   * not a removal, so ❌'s 🛡️ does not reach it, and under 🥾 at `consent`
   * it is the only way out, which is the point of that rung. The lapse
   * clock was always a silent exit; this is the spoken one.
   */
  resign(t: number, member: MemberId): void {
    this.requireOpen('resigning');
    const m = this.members.get(member);
    if (!m || m.removed) throw new Error(`unknown member '${member}'`);
    if (member === this.convenor.id) {
      throw new Error('the convenor unticks their own row instead (§9.6a)');
    }
    const wasInE = inE(m);
    this.emit({ type: 'member-removed', t, member, by: 'self' });
    if (wasInE) this.afterRosterChange(t, 'departure', member);
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
    if (setting === 'quorum' && (value as QuorumValue).form !== this.quorumFormValue) {
      throw new Error(`the quorum question is asked as a ${this.quorumFormValue} (§9.0a)`);
    }
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
    // **The electorate is E minus those who have signed out abstaining**
    // (§9.0a, → why: R-015, R-049; Ed 2026-08-25 closing Q647 as (b)). An
    // abstainer has said they are done and are not to be counted, so waiting
    // on their answer waits on somebody who has declared they will not give
    // one — a question that reads complete on the card and can never settle,
    // with nothing on the surface naming who holds it up. A member signed out
    // **holding** stays in: holding is *I am done and still count*. It is the
    // live set, re-read on every answer and every departure, the same set the
    // motion side has resolved against since v0.48 and the same one `view()`
    // counts *n of E* over. Both gates below read it.
    const electorate = motionElectorateOf(this.members.values());
    // **and never on one voice**, which is the other half of the same reason:
    // a consent rule computed over a single answer is that answer, so a
    // delegated question with a membership of one has not been delegated to
    // anybody. The founder's remedy is either half of the choice they already
    // have — invite somebody, or take the setting back and set it. Read
    // against the smaller set, so a room of two where one abstains does not
    // resolve on the survivor's single answer either.
    if (electorate.length < 2) return;
    if (!electorate.every((m) => st.answers.has(m.id))) return;
    const answers = electorate.map((m) => st.answers.get(m.id)!);
    const { value, distribution } = resolveConsent(entry, answers);
    this.emit({ type: 'question-resolved', t, setting, value, distribution,
      electorate: electorate.map((m) => m.id).sort() });
  }

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
    // **What 🍾 lays down is read off what it spent, not off a list of
    // causes** (entry 162). The `constituted` fold lays the Text's pair down
    // and spends every pending release, and 158 is about to change what else
    // it lays down — so the batch is a *diff* of every `HELD` key's held pair
    // either side of the emit, and 🍾 reports the new answer with no edit
    // here. One act, so one batch and one OK, whatever it moved.
    const before = new Map(HELD.map((k) => [k, { ...this.settings.get(k)!.powers }]));
    this.emit(list === undefined ? { type: 'constituted', t }
      : { type: 'constituted', t, laidDown: list });
    const laid: Array<{ setting: PowerKey; power: Power }> = [];
    for (const k of HELD) {
      const was = before.get(k)!;
      const now = this.settings.get(k)!.powers;
      for (const p of ['unilateral', 'assent'] as const) {
        if (was[p] && !now[p]) laid.push({ setting: k, power: p });
      }
    }
    this.oweReleases(t, laid);
  }

  /** What 🍾 waits on (§9.0b, §9.7.1): a delegated question on **any** setting
   *  blocks the start while it collects, and every judge-gate must be settled
   *  however it is held. → why: R-045 */
  private waitingOn(): SettingId[] {
    return this.waitingWith().map((w) => w.setting);
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
   * just the same order: `soleVoice` counts the electorate (E minus
   * abstainers, R-049), so a readout that says `collecting` while the resolver
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
        // The text is the one prerequisite outside the gate rule: §9.0b makes
        // the start wait on a *confirmed decision* about it (empty is fine),
        // and a start that landed without one could never be answered after —
        // confirmStartingText refuses post-start, so the document would be
        // wedged with no text and no way to propose one (2026-08-22).
        if (e.id === 'startingText') return !this.textConfirmedFlag;
        return st.collecting || (e.judgeGate && st.settledBy === null);
      })
      .map((e) => {
        const st = this.settings.get(e.id)!;
        const why: WaitingWhy = e.id === 'startingText' ? 'text-unconfirmed'
          : !st.collecting ? 'judge-gate'
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
      })
      // the text is the founding's last clause, so it is named last
      .sort((a, b) => (a.setting === 'startingText' ? 1 : 0) - (b.setting === 'startingText' ? 1 : 0));
  }

  /**
   * The founder's readiness readout (Q443 (a)(i), both halves; founder-only
   * by the host's choice — it is part of the 🍾 task, not of the document).
   * Per question: whether it stands, and how many have answered. Per person:
   * how many of the questions they owe they have answered. **Participation
   * itemised by name, never preference** — no value, no running maximum.
   *
   * **Counted over the electorate, not over E** (R-049, Q648): `electorate`
   * is E minus abstainers and `answered` counts only that set's answers, the
   * way `view()` has counted a collecting question's `answeredCount` all
   * along — the two readouts of one question now read one electorate. An
   * abstainer is still **listed** among the members (they are arrived and not
   * removed) and simply owes nothing: `owed` and `answered` are both 0, since
   * the itemisation is of participation in a question they are no longer part
   * of. They may still call `answer()`; it is recorded and not counted.
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
    const open = MANAGED.filter((id) => this.settings.get(id)!.collecting);
    const questions = MANAGED
      .filter((id) => { const st = this.settings.get(id)!; return st.collecting || st.distribution !== null; })
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
        // is the electorate, so a member outside it (not yet arrived, lapsed,
        // or signed out abstaining) owes nothing. Counting a lapsed member's
        // owed questions while `answered`/`electorate` exclude them reported
        // somebody holding the founding up whom `maybeResolve` never waits for.
        const out = !eIds.has(m.id);
        return { id: m.id, name: m.name, arrived: m.arrivedAtT !== null,
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
    if (m && m.lapsed) return false; // revival is memberReturn's — an act, not a read
    if (t - rec.lastActivityT < SEEN_EVERY_MS) return false;
    this.emit({ type: 'member-seen', t, member });
    return true;
  }

  /**
   * **A lapsed member is owed it too** (Q530, Ed 2026-08-22). E excludes the
   * lapsed, and for every other purpose that is right: they are out of the
   * quorum base and out of the electorate, because those are about who is
   * deciding. An acknowledgement is not a decision — it is a thing owed to
   * somebody about a document they are **still a member of**. Lapse is a
   * stall with an alarm rather than a departure (§9.5a): revival is just
   * logging in, and their cast judgments keep counting. So the person who
   * was living under the old rule and went quiet is exactly the one a change
   * ought to find, and owing it now is how they meet it on the way back in.
   *
   * The two exclusions that stay are the two that mean something. A
   * **removed** member is gone. Somebody who has **not arrived** never knew
   * the old rule, so the change is not news to them — it is simply what the
   * document says, which they will read like anybody arriving.
   */
  /** What each pen amendment changed *from* — a motion proposes a value and
   *  never needs the old one, so this rides alongside rather than bending the
   *  payload every other amendment shares. */
  private readonly penFrom = new Map<MotionId, SettingValue>();

  private oweOks(t: number, setting: SettingId): void {
    for (const m of this.members.values()) {
      if (m.arrivedAtT === null || m.removed) continue;
      if (m.id === this.convenor.id) continue; // the convenor had their say
      if (m.okOwed.has(setting)) continue;
      this.emit({ type: 'ok-owed', t, member: m.id, settings: [setting] });
    }
  }

  /**
   * **Everything one act lays down is one news entry and one OK** (Ed,
   * 2026-08-27, entry 162; Q1013, extending R-044). SPEC §9.7 rule 3 has said
   * since R-044 that laying a power down is news; what entry 162 adds is the
   * batching, because 158 gives 🍾 a table of zone switches and one press can
   * lay down about thirty-four powers — thirty-four separate acknowledgements
   * landing in every rail at the moment the document opens is the flood that
   * makes members stop reading acknowledgements at all.
   *
   * **The audience rule is `oweOks`'s**, one method up: every member, skipping
   * the un-arrived, the removed and the convenor. The convenor is skipped for
   * `oweOks`'s stated reason and for a stronger one here — the founder is the
   * *actor*, and E9's other half, *the actor*, is already served by the power
   * card's own confirmation. That is Q918's reading (b) on the cell and (c) on
   * the audience; **this does not settle Q918**, and it is one predicate to
   * reverse if Ed rules otherwise. The one skip of `oweOks` with no analogue
   * here is `okOwed.has(setting)`: every batch carries a fresh id, so there is
   * nothing to be already owed — the omission is deliberate, not an oversight.
   *
   * **A release joins an open batch rather than always opening one**: Ed's
   * rule is that releases sharing one event, or one `t` and one actor, are one
   * group, and `relinquish` admits only the convenor as actor, so the actor
   * half needs no field. On a **solo document** the loop emits nothing — the
   * founder is the only member and is the actor — and then nothing is
   * recomputed either, `lastReleaseT` included, since all three fields move in
   * the fold. A later release therefore opens a fresh batch, which is right: a
   * call that told nobody anything has no group for anything to join
   * (the shape of Q835 — the page assumed a room bigger than one).
   */
  private oweReleases(t: number, releases: Array<{ setting: PowerKey; power: Power }>): void {
    if (releases.length === 0) return;
    const batch = this.lastReleaseT === t && this.lastReleaseBatch !== null
      ? this.lastReleaseBatch : `rel-${this.nextReleaseN}`;
    for (const m of this.members.values()) {
      if (m.arrivedAtT === null || m.removed) continue;
      if (m.id === this.convenor.id) continue; // the founder is the actor
      this.emit({ type: 'release-owed', t, batch, member: m.id, releases });
    }
  }

  /**
   * The OK on a release batch (entry 162) — `giveOk`'s posture exactly: it
   * refuses nothing it can simply ignore, so a batch that is not owed to this
   * member returns silently rather than throwing at a page that was a poll
   * behind.
   */
  ackRelease(t: number, member: MemberId, batch: string): void {
    this.requireOpen('acknowledging');
    const m = this.members.get(member);
    if (!m) throw new Error(`unknown member '${member}'`);
    if (!m.releasesOwed.has(batch)) return;
    this.emit({ type: 'release-ok', t, batch, member });
  }

  /**
   * **A text amendment is news beside the clause it changed** (Ed, 2026-08-29,
   * decision D47, answering Q1021; SURFACE E35, R-058). `oweReleases`' other
   * sibling, and **the audience rule is `oweOks`'s** exactly: every member,
   * skipping the un-arrived, the removed and the convenor, who is the actor.
   *
   * **Two differences from `oweReleases`, and both are the ruling.** There is
   * **no batching and no join of an open group**: entry 162 groups because one
   * press of 🍾 lays down thirty-four powers that belong to no clause, where
   * here the card *is* the clause — so two amendments at two places are two
   * cards, and collapsing them is precisely what the ruling reverses. And
   * there is **no skip for something already owed**: every amendment carries
   * its own candidate id, so there is nothing to be already owed — the same
   * deliberate omission `oweReleases` records for its batch ids.
   *
   * **Why it is called from `recordTextAmendment` and not from the fold.**
   * `replay` calls `apply` directly and `emit` pushes to `this.log`, so an
   * owing performed in a fold appends events to every session that replays
   * that log — the log growing every time it is read. That is entry 162's rule
   * and this is it kept; the reading it replaces (📄's own key through
   * `oweOks`) had the call in the `text-amended` fold and so had the bug.
   */
  private oweAmendment(t: number, candidate: string): void {
    for (const m of this.members.values()) {
      if (m.arrivedAtT === null || m.removed) continue;
      if (m.id === this.convenor.id) continue; // the Founder is the actor
      this.emit({ type: 'amendment-owed', t, candidate, member: m.id });
    }
  }

  /**
   * The OK on one text amendment (SURFACE E35) — `ackRelease`'s posture
   * exactly: an amendment this member is not owed returns silently rather than
   * throwing at a page that was a poll behind.
   */
  ackAmendment(t: number, member: MemberId, candidate: string): void {
    this.requireOpen('acknowledging');
    const m = this.members.get(member);
    if (!m) throw new Error(`unknown member '${member}'`);
    if (!m.amendmentsOwed.has(candidate)) return;
    this.emit({ type: 'amendment-ok', t, candidate, member });
  }

  /**
   * **A mail that gave up is told** (SURFACE E34, Q947 (c), backlog 173).
   * `oweReleases`' sibling: the outbox hands over the whole of one sender
   * pass's give-ups at once, and one pass is the act — entry 162's rule is
   * that the boundary of the group is the act, so a pass that killed three
   * mails is one batch, one card and one OK.
   *
   * **Two differences from `oweReleases`, both deliberate.** The convenor is
   * *not* skipped: there they are the actor, and here nobody in the room is —
   * E34's audience is *the founder; every member*. And where the audience is
   * empty the event is still emitted once with `member: null`, because the
   * addresses are a fact about the register that the founder's ✉️ row reads
   * whether or not there was anybody to tell.
   *
   * The unarrived skip stays exactly as it is, and it is the whole of E34's
   * **never the invitee**: an invitee has `arrivedAtT === null` by definition,
   * and they are precisely the person the mail could not reach.
   */
  mailGaveUp(t: number, addresses: readonly string[]): void {
    if (addresses.length === 0) return;
    const batch = `mgu-${this.nextMailGiveUpN}`;
    const list = [...addresses];
    let told = false;
    for (const m of this.members.values()) {
      if (m.arrivedAtT === null || m.removed) continue;
      told = true;
      this.emit({ type: 'mail-gave-up', t, batch, member: m.id, addresses: list });
    }
    if (!told) this.emit({ type: 'mail-gave-up', t, batch, member: null, addresses: list });
  }

  /** The OK on one pass's dead mail — `ackRelease`'s posture exactly: a batch
   *  this member is not owed returns silently rather than throwing at a page
   *  that was a poll behind. */
  ackMailGaveUp(t: number, member: MemberId, batch: string): void {
    this.requireOpen('acknowledging');
    const m = this.members.get(member);
    if (!m) throw new Error(`unknown member '${member}'`);
    if (!m.mailGaveUpOwed.has(batch)) return;
    this.emit({ type: 'mail-gave-up-ok', t, batch, member });
  }

  /**
   * 📨 — put the invitation back in the queue (SURFACE E34). Only an invitee
   * can be re-sent to: somebody who has arrived has the document, and somebody
   * who is gone is not being invited to anything. The re-send is an ordinary
   * queued mail from there on, and if it gives up too a fresh batch is raised.
   */
  resendInvite(t: number, member: MemberId, by: MemberId): void {
    this.requireOpen('re-sending an invitation');
    const m = this.members.get(member);
    if (!m || m.removed) throw new Error(`unknown member '${member}'`);
    if (m.arrivedAtT !== null) throw new Error('they are already here — there is nothing to re-send');
    this.emit({ type: 'mail-resent', t, member, by });
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
  // its own rules. The route is a fact about the setting.

  openMotion(t: number, by: MemberId, payload: MotionPayload, why?: string): MotionId {
    this.requireOpen('a motion');
    if (this.constitutedT === null) {
      throw new Error('before the start nothing is amended — only set (§9.6a)');
    }
    const mover = this.members.get(by);
    if (!mover || !inE(mover)) throw new Error(`'${by}' is not an arrived member`);
    let route: MotionRoute;
    if (payload.kind === 'set') {
      const entry = entryOf(payload.setting);
      if (entry.kind === 'personal') throw new Error(`${payload.setting} is yours alone (§9.0c)`);
      if (payload.setting === 'startingText' || !this.settings.has(payload.setting)) {
        throw new Error(`'${payload.setting}' is not moved this way`);
      }
      const st = this.settings.get(payload.setting)!;
      if (st.value === null) throw new Error(`'${payload.setting}' has no settled value to move against`);
      const err = validateFor(entry, payload.value);
      if (err) throw new Error(err);
      if (eqValue(payload.value, st.value)) {
        throw new Error('the motion proposes what already stands');
      }
      route = motionRouteOf(entry, payload.value, st.value);
    } else if (payload.kind === 'reserve') {
      const re = entryOf(payload.setting);
      if (re.kind === 'personal') {
        throw new Error(`'${payload.setting}' is never held, so it cannot be reserved (§9.7)`);
      }
      if (payload.setting === 'admission') {
        throw new Error("the register's crown is the applications setting's -- reserve that (§9.7½)");
      }
      const rst = this.settings.get(payload.setting)!;
      const want = payload.power ?? 'both';
      const already = want === 'both'
        ? rst.powers.unilateral && rst.powers.assent
        : rst.powers[want];
      if (already) {
        throw new Error(`'${payload.setting}' — ${want === 'both' ? 'both powers are' : `the ${want} power is`} already the convenor's`);
      }
      route = 'constitutional'; // returning a decision to one hand needs everyone (§9.7 v0.52)
    } else if (payload.kind === 'invite') {
      this.requireEmailFree(payload.email);
      // The route is 🪪's price (entry 94): at `pen` nobody proposes — the
      // invite command admits outright — so a motion here is a mistake.
      const price = this.priceOf('admission');
      if (price === 'pen') throw new Error('admission is at ✒️ — invite directly, nothing to propose (§9.7½)');
      route = price === 'assembly' ? 'constitutional' : 'ordinary';
    } else if (payload.kind === 'remove') {
      const target = this.members.get(payload.member);
      if (!target || !inE(target)) throw new Error(`'${payload.member}' is not a member`);
      // The route is 🥾's price (Q401, Ed 2026-08-19; entry 94): `proposal`
      // races at the bar; `assembly` and `consent` are consent — the
      // difference lives in the settle check, not the route.
      route = this.priceOf('removal') === 'proposal' ? 'ordinary' : 'constitutional';
    } else {
      // admit rides submitApplication (§9.7½): an application is a stranger
      // proposing their own invitation, so it pays 🪪's price like one.
      route = this.priceOf('admission') === 'assembly' ? 'constitutional' : 'ordinary';
    }
    if (route === 'constitutional' && this.heldOutBy(by)) {
      throw new Error('one 🏛️ out per member at a time (§9.6)');
    }
    const id = `mo-${this.nextMotionN}`;
    const e: ConstitutionEvent = { type: 'motion-opened', t, motion: id, by,
      payload, route, stake: route === 'ordinary' ? 1 : 0 };
    if (why !== undefined && why !== '') (e as { why?: string }).why = why;
    this.emit(e);
    if (route === 'constitutional') {
      // The mover's answer is accept from the moment the motion is put
      // (§9.6 v0.49): proposers prefer their own proposals, as §3.3 counts
      // an author's preference for their own candidate without asking.
      this.emit({ type: 'motion-answer', t, motion: id, member: by, answer: 'accept' });
      this.maybeSettleMotions(t);
    }
    return id;
  }

  answerMotion(t: number, member: MemberId, motion: MotionId,
    answer: MotionAnswer): void {
    this.requireOpen('answering a motion');
    const rec = this.motions.get(motion);
    if (!rec || rec.status !== 'running') throw new Error('the motion is not running');
    if (rec.route !== 'constitutional') {
      throw new Error('an ordinary motion is judged as a race, not answered (§9.6)');
    }
    const m = this.members.get(member);
    if (!m || !motionElectorateOf([m]).length) {
      throw new Error(`'${member}' is not in the motion's electorate`);
    }
    if (this.motionExcludes(rec) === member) {
      throw new Error('the subject of a removal is not asked on this route (🥾 Q401a) — they see it, and it settles without them');
    }
    this.emit({ type: 'motion-answer', t, motion, member, answer });
    this.maybeSettleMotions(t);
  }

  withdrawMotion(t: number, member: MemberId, motion: MotionId): void {
    this.requireOpen('withdrawing');
    const rec = this.motions.get(motion);
    if (!rec || rec.status !== 'running') throw new Error('the motion is not running');
    if (rec.by !== member) throw new Error('only the mover withdraws a motion');
    this.emit({ type: 'motion-withdrawn', t, motion });
  }

  /**
   * The ordinary-route seam: this package never runs races. The host — the
   * engine, the sim, a mock — judges the motion at the bar and reports the
   * outcome here; post-368 the caller is an engine-core race over the value.
   */
  adjudicateOrdinaryMotion(t: number, motion: MotionId,
    outcome: 'carried' | 'held'): void {
    this.requireOpen('a motion');
    const rec = this.motions.get(motion);
    if (!rec || rec.status !== 'running') throw new Error('the motion is not running');
    if (rec.route !== 'ordinary') {
      throw new Error('a constitutional motion settles by unanimity, not adjudication');
    }
    this.emit({ type: 'motion-adjudicated', t, motion, outcome });
    const after = this.motions.get(motion)!.status as string; // the fold moved it
    if (after === 'awaiting-crown') {
      this.emit({ type: 'crown-question-opened', t,
        question: `cq-${this.nextCrownN}`, motion: rec.id });
    } else if (after === 'carried') {
      this.settleCarriedEffects(t, rec, /* everyoneHadSay */ false);
    } else if (after === 'held') {
      this.settleHeldEffects(t, rec);
    }
  }

  answerCrownQuestion(t: number, question: string, outcome: 'accept' | 'reject'): void {
    this.requireOpen('the 👑 question');
    const q = this.crownQuestions.get(question);
    if (!q || q.status !== 'pending') throw new Error('no such pending 👑 question');
    if (this.crownLapsedFlag) throw new Error('the crown has lapsed — the question passes by itself');
    this.emit({ type: 'crown-question-answered', t, question, outcome });
    if (q.motion === null) return; // a text question: the host reads the record (Q440)
    const rec = this.motions.get(q.motion)!;
    if (outcome === 'accept') {
      // Under unanimity everyone already had their say; under the ordinary
      // route the judges are the engine's business, so everybody is owed.
      this.settleCarriedEffects(t, rec, rec.route === 'constitutional');
    } else {
      this.settleHeldEffects(t, rec);
    }
  }

  /** Under `assembly`, the subject of a removal stands outside its electorate
   *  (Q401a) — they see the motion, and it settles without them; under
   *  `consent` their own answer counts, which is what makes it leave-only.
   *  Read live, like the electorate itself: a price change mid-motion is a
   *  ground shift. */
  private motionExcludes(rec: MotionRecord): MemberId | null {
    return rec.payload.kind === 'remove' && this.priceOf('removal') === 'assembly'
      ? rec.payload.member : null;
  }

  private heldOutBy(member: MemberId): boolean {
    for (const rec of this.motions.values()) {
      if (rec.by === member && rec.route === 'constitutional' &&
        (rec.status === 'running' || rec.status === 'awaiting-crown')) {
        return true;
      }
    }
    return false;
  }

  /**
   * The settle check (v0.48): a constitutional motion carries at the moment
   * every currently active member — the quorum base, evaluated live — stands
   * at accept or abstain with no keep standing. Re-run on every answer and
   * every roster event; a standing keep blocks but does not kill.
   */
  private maybeSettleMotions(t: number): void {
    let settled = true;
    while (settled) {
      settled = false;
      for (const rec of this.motions.values()) {
        if (rec.status !== 'running' || rec.route !== 'constitutional') continue;
        // 🏛️ without [avatar] (Q401a): a removal under `assembly` settles by
        // the live electorate minus its subject — everyone but them.
        const excl = this.motionExcludes(rec);
        const electorate = motionElectorateOf(this.members.values())
          .filter((m2) => m2.id !== excl);
        if (electorate.length === 0) continue;
        const answers = electorate.map((m) => rec.answers.get(m.id));
        if (answers.some((a) => a === undefined || a === 'keep')) continue;
        if (!answers.some((a) => a === 'accept')) continue; // nobody consented to anything
        if (this.reservedTarget(rec)) {
          // Reserved is assent at the end of either route (§9.7 v0.49):
          // unanimity carries the change to the crown, not into the document.
          this.emit({ type: 'crown-question-opened', t,
            question: `cq-${this.nextCrownN}`, motion: rec.id });
          settled = true;
          break;
        }
        this.emit({ type: 'motion-carried', t, motion: rec.id });
        this.settleCarriedEffects(t, rec, true);
        settled = true; // a departure-by-removal can complete another motion
        break;
      }
    }
  }

  /** Follow-ons of a carried motion: membership events and owed OKs. */
  private settleCarriedEffects(t: number, rec: MotionRecord,
    everyoneHadSay: boolean): void {
    if (rec.payload.kind === 'invite') {
      const id = `m-${this.nextMemberN}`;
      this.emit({ type: 'member-invited', t, member: id,
        email: rec.payload.email, viaMotion: rec.id });
      // an invitee counts toward nothing until they arrive — no roster follow-ons
    } else if (rec.payload.kind === 'remove') {
      const target = rec.payload.member;
      const wasInE = inE(this.members.get(target)!);
      this.emit({ type: 'member-removed', t, member: target, viaMotion: rec.id });
      if (wasInE) this.afterRosterChange(t, 'departure', target);
      // after the roster's own follow-ons, never inside them: they can carry
      // further motions, and the auto-pass is the last word on a settled
      // roster rather than a step in one
      this.crownSeatVacated(t);
    } else if (rec.payload.kind === 'set' &&
      CONSTITUTIONAL.has(rec.payload.setting)) {
      // A constitutional value changed: anybody who had no say is owed the
      // decision. Under unanimity that is only whoever stood outside the
      // electorate (abstaining sign-outs, the lapsed); under an ordinary
      // route (an ending date-move) the judges are the engine's business,
      // so everybody is owed the news (NOTES.md).
      for (const m of this.members.values()) {
        if (m.removed) continue;
        if (m.arrivedAtT === null) continue;
        if (everyoneHadSay && rec.answers.has(m.id)) continue;
        if (m.okOwed.has(rec.payload.setting)) continue;
        this.emit({ type: 'ok-owed', t, member: m.id, settings: [rec.payload.setting] });
      }
      if (rec.payload.setting === 'lapse') this.rereadLapse(t); // entry 97
    }
    if (rec.payload.kind === 'admit') {
      const id = `m-${this.nextMemberN}`;
      this.emit({ type: 'member-admitted', t, applicant: rec.payload.applicant,
        member: id });
      // an admitted applicant inherits the constitution and is owed nothing
      // for it, like any other joiner (§9.7½, §9.0a)
      this.afterRosterChange(t, 'arrival', id); // and is present
    }
  }

  /**
   * A joiner used to be owed an OK on every settled constitutional setting
   * they had no say in — R-016's inheritance clause. **Reversed** (Ed,
   * 2026-08-25): *a setting that predates you is simply what the document
   * says; a power handed to you is news addressed to you.* Nothing is owed
   * on arrival; `oweOks` covers everything set or changed after it, and it
   * already skips whoever has not arrived.
   */

  /**
   * **A park with no convenor auto-passes, the way a lapse does** (Ed,
   * 2026-08-29, R-060). A text adoption parked under 🛡️ on the Text blocks
   * every text adoption in the document until it is answered, and the 👑
   * question is served only to the convenor — so a seat vacated while a park
   * stands would serve the question to somebody who has gone, with no clock
   * left to auto-pass it, and the room's drafting would stop for the life of
   * the document.
   *
   * Three things it does deliberately, each of which a later reader might
   * try to "fix":
   *
   * - **It reuses `crown-question-auto-passed` rather than inventing a
   *   kind.** The ruling is *the way a lapse does*, and that is the event a
   *   lapse emits: the fold already sets `auto-passed` and treats it as
   *   accepted, and the bridge's cursor walk already turns it into
   *   `engine.assent(t, parked, 'accept')`. A new kind would move the log's
   *   rolling hash and need a bridge arm to do what an arm already does.
   * - **It does not emit `crown-lapsed`.** A vacancy is not a lapse:
   *   `crownLapsedFlag` is about a crown that may wake up again
   *   (`member-returned` revives it) and a removed member does not return to
   *   the seat. The shield goes down through `convenorSeatVacant()` instead.
   * - **Text questions only** — this is a *narrowing* of the lapse loop in
   *   `tick`, not a copy of it. That loop also auto-passes motion-backed
   *   questions and settles their carried effects; applying a carried
   *   removal or invitation without assent because the convenor left is a
   *   governance consequence nobody has ruled on, and such a question blocks
   *   nothing while it stands, where a parked text adoption blocks
   *   everything. Filed as Q1033; the asymmetry is the point.
   */
  private crownSeatVacated(t: number): void {
    if (!this.convenorSeatVacant()) return;
    for (const q of [...this.crownQuestions.values()]) {
      if (q.status !== 'pending' || !q.text) continue;
      this.emit({ type: 'crown-question-auto-passed', t, question: q.id });
    }
  }

  /** Follow-ons of a held motion: a refused application is told so (§9.7½). */
  private settleHeldEffects(t: number, rec: MotionRecord): void {
    if (rec.payload.kind === 'admit') {
      this.emit({ type: 'application-refused', t, applicant: rec.payload.applicant });
    }
  }

  // -------------------------------------------------------------------------
  // Presence, the freeze and the lapse clocks (§9.5, §9.5a)

  signOut(t: number, member: MemberId, mode: 'holding' | 'abstaining'): void {
    this.requireOpen('signing out');
    const m = this.members.get(member);
    if (!m || !inE(m)) throw new Error(`'${member}' is not an arrived member`);
    this.emit({ type: 'signed-out', t, member, mode });
    // An abstainer leaves the quorum base: motions can complete, the
    // document can freeze — plain silence never does either (§9.5). Since
    // R-049 a founding question's electorate is that same live set, so an
    // abstention that shrinks it to exactly the people who have answered
    // completes the question here, at the act, rather than waiting on the
    // next unrelated answer. No ground shift is emitted: the roster has not
    // moved and the abstainer is still a member, so nobody's answer has had
    // its ground changed under it.
    this.maybeSettleMotions(t);
    this.maybeResolveAll(t);
    this.maybeFreezeOrThaw(t);
  }

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
    if (m.signedOut === null && !m.lapsed && !m.lapseWarned) return;
    const wasLapsed = m.lapsed;
    this.emit({ type: 'member-returned', t, member });
    if (wasLapsed) this.afterRosterChange(t, 'arrival', member); // E grew back
    else this.maybeSettleMotions(t); // a returned abstainer re-enters the electorate
    this.maybeFreezeOrThaw(t);
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
   * they happened to log in. A sign-out is untouched: that one is an act.
   */
  private rereadLapse(t: number): void {
    const lapse = this.settings.get('lapse')!.value as LapseValue | null;
    const afterMs = lapse ? lapse.afterMs : null;
    const stillDue = (lastT: number, at: 'lapseAtT' | 'warnAtT'): boolean =>
      afterMs !== null && t >= lapseDue(lastT, afterMs)![at];
    for (const m of [...this.members.values()]) {
      if (m.removed || m.arrivedAtT === null || m.signedOut !== null) continue;
      const revive = m.lapsed ? !stillDue(m.lastActivityT, 'lapseAtT')
        : m.lapseWarned && !stillDue(m.lastActivityT, 'warnAtT');
      if (!revive) continue;
      const wasLapsed = m.lapsed;
      this.emit({ type: 'member-returned', t, member: m.id });
      if (wasLapsed) this.afterRosterChange(t, 'arrival', m.id); // E grew back
    }
    if (this.crownLapsedFlag && !stillDue(this.convenor.lastActivityT, 'lapseAtT')) {
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
        } else if (t >= due.warnAtT && !m.lapseWarned) {
          this.emit({ type: 'lapse-warned', t, member: m.id });
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
        } else if (t >= due.warnAtT && !this.convenor.lapseWarned &&
          !this.members.has(this.convenor.id)) {
          this.emit({ type: 'lapse-warned', t, member: this.convenor.id });
        }
      }
    }
    this.maybeFreezeOrThaw(t);
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

  /** The freeze line (§9.5): counted base below quorum parks the document. */
  private maybeFreezeOrThaw(t: number): void {
    if (this.constitutedT === null) return;
    const q = this.settings.get('quorum')!.value as QuorumValue | null;
    if (!q) return;
    const E = eOf(this.members.values()).length;
    const counted = quorumBaseOf(this.members.values()).length;
    const needed = quorumCount(q, E);
    if (!this.frozenFlag && counted < needed) {
      this.emit({ type: 'frozen', t });
    } else if (this.frozenFlag && counted >= needed) {
      this.emit({ type: 'thawed', t });
    }
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
    for (const a of this.applicants.values()) {
      if (a.email === email && a.status !== 'refused') {
        throw new Error('an application from that address is already underway');
      }
    }
    const id = `ap-${this.nextApplicantN}`;
    this.emit({ type: 'application-started', t, applicant: id, email });
    return id;
  }

  verifyApplication(t: number, applicant: string): void {
    this.requireOpen('applying');
    const a = this.applicants.get(applicant);
    if (!a || a.status !== 'started') throw new Error('nothing to verify');
    this.emit({ type: 'application-verified', t, applicant });
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
    const e: ConstitutionEvent = { type: 'application-submitted', t, applicant };
    if (fields.name !== undefined) (e as { name?: string }).name = fields.name;
    if (fields.picture !== undefined) (e as { picture?: string }).picture = fields.picture;
    if (fields.words !== undefined) (e as { words?: string }).words = fields.words;
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
      this.emit({ type: 'member-admitted', t, applicant, member: id });
      this.afterRosterChange(t, 'arrival', id);
    } else {
      this.emit({ type: 'motion-opened', t, motion: `mo-${this.nextMotionN}`,
        by: null, payload: { kind: 'admit', applicant },
        route: this.priceOf('admission') === 'assembly' ? 'constitutional' : 'ordinary',
        stake: 0 });
    }
  }

  // -------------------------------------------------------------------------
  // Reads used by projections (view.ts owns the member-facing surface)

  /** A door's crown pair (entry 94), lapse ignored — a sleeping crown still
   *  holds; callers check the lapse where it bites. */
  doorPowers(door: DoorId): Powers {
    return { ...this.settings.get(door)!.powers };
  }

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
   * after the act, and so the free resignation of §9.6a — which `resign`
   * refuses today — is covered the moment that door exists, with no second
   * rule and no second call site.
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

  private requireEmailFree(email: string): void {
    for (const m of this.members.values()) {
      if (!m.removed && m.email === email) {
        throw new Error('that address is already on the membership — log in instead (§9.7½)');
      }
    }
    if (this.convenor.email === email && this.members.has(this.convenor.id)) {
      throw new Error('that address is already on the membership — log in instead (§9.7½)');
    }
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
  get frozen(): boolean { return this.frozenFlag; }
  get closed(): boolean { return this.closedFlag; }
  get closedAt(): number | null { return this.closedT; }

  /** How many must return to thaw (§9.5): the quorum shortfall while frozen, null otherwise. */
  mustReturn(): number | null {
    if (!this.frozenFlag) return null;
    const q = this.settings.get('quorum')!.value as QuorumValue | null;
    if (!q) return null;
    const E = eOf(this.members.values()).length;
    const counted = quorumBaseOf(this.members.values()).length;
    return Math.max(0, quorumCount(q, E) - counted);
  }

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
  closingSignatures(): Array<{ member: MemberId; name: string | null; comment: string; t: number }> {
    const out: Array<{ member: MemberId; name: string | null; comment: string; t: number }> = [];
    for (const m of this.members.values()) {
      if (m.closingAck === null) continue;
      out.push({
        member: m.id,
        name: m.name,
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

  convenorRecord(): Readonly<typeof this.convenor> { return this.convenor; }
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
  applicantRecords(): ReadonlyMap<string, ApplicantRecord> { return this.applicants; }

  E(): number { return eOf(this.members.values()).length; }
  quorumBase(): number { return quorumBaseOf(this.members.values()).length; }
  motionElectorate(): MemberId[] {
    return motionElectorateOf(this.members.values()).map((m) => m.id);
  }

  /** The bar now, percent (§4.3). Null before the document is constituted. */
  bar(t: number): number | null {
    return this.anchors === null ? null : barAt(this.anchors, t);
  }

  /** Judging is the room's gate (§9.0b): open from constituted, parked by freeze. */
  canJudge(): boolean { return this.constitutedT !== null && !this.frozenFlag; }

  /** Proposing is yours (§9.0b): confirmed text plus your own outstanding answers. */
  canPropose(member: MemberId): boolean {
    if (!this.textConfirmedFlag) return false;
    const m = this.members.get(member);
    if (!m || !inE(m)) return false;
    for (const id of MANAGED) {
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
