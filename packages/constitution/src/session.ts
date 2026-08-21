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
  MotionRecord, Power, Powers, SettingState,
} from './types.js';
import { holderOf, SCHEMA_VERSION } from './types.js';
import type { MotionRoute, SettingId } from './catalogue.js';
import { CATALOGUE, entryOf, motionRouteOf, validateFor } from './catalogue.js';
import type { ApplicationsValue, EndingValue, LadderValue, LapseValue, PaceValue,
  PercentValue, QuorumValue, SettingValue, SlugValue, TextValue } from './values.js';
import { eqValue } from './values.js';
import { resolveConsent } from './consent.js';
import { eOf, inE, motionElectorateOf, quorumBaseOf, quorumCount,
  adoptionFloorTerm } from './populations.js';
import type { ThresholdAnchors } from './threshold.js';
import { barAt, reAnchor, seedAnchors } from './threshold.js';
import { lapseDue } from './clocks.js';

export interface OpenInput {
  title: string;
  slug: string;
  convenor: ConvenorInput;
}

/** The settings the map manages: everything except the register, the text and the personal pair. */
const MANAGED: readonly SettingId[] = CATALOGUE
  .filter((e) => e.kind !== 'personal' && e.id !== 'membership' && e.id !== 'startingText')
  .map((e) => e.id);

/** Everything that carries a crown pair: the managed map plus the Text (Q440, 2026-08-21). */
const HELD: readonly SettingId[] = [...MANAGED, 'startingText'];

const CONSTITUTIONAL: ReadonlySet<SettingId> = new Set(
  CATALOGUE.filter((e) => e.kind === 'constitutional' && e.id !== 'membership').map((e) => e.id),
);

/** Q459: a read refreshes the activity clock at most this often. */
const SEEN_EVERY_MS = 60 * 60_000;

export class ConstitutionSession {
  private log: LogEntry[] = [];
  private lastT = -Infinity;

  // ---- fold state ----------------------------------------------------------
  private convenor!: { id: MemberId; email: string; isMember: boolean;
    name: string | null; picture: string | null;
    lastActivityT: number; lapseWarned: boolean };
  private crownLapsedFlag = false;
  private members = new Map<MemberId, MemberRecord>();
  private settings = new Map<SettingId, SettingState>();
  private quorumFormValue: 'count' | 'share' = 'share';
  private startingText: string | null = null;
  private textConfirmedFlag = false;
  private slugHistory: string[] = [];
  private constitutedT: number | null = null;
  private closedFlag = false;
  private closedT: number | null = null;
  private anchors: ThresholdAnchors | null = null;
  private frozenFlag = false;
  private motions = new Map<MotionId, MotionRecord>();
  private crownQuestions = new Map<string, CrownQuestionRecord>();
  private applicants = new Map<string, ApplicantRecord>();
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
    s.emit({ type: 'created', t, title: input.title, slug: input.slug,
      convenor: input.convenor });
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
    const prevHash = this.log.length > 0 ? this.log[this.log.length - 1]!.hash : '';
    const seq = this.log.length;
    const hash = chainHash(prevHash, event);
    // the version rides the envelope and never the hash (Q480(a)): an
    // entry written before this field existed is still a valid entry
    this.log.push({ seq, hash, prevHash, event, schemaVersion: SCHEMA_VERSION });
    this.apply(event, seq);
  }

  private apply(event: ConstitutionEvent, _seq: number): void {
    if (event.t < this.lastT) throw new Error('timestamps must be non-decreasing');
    this.lastT = event.t;
    switch (event.type) {
      case 'created': {
        const c = event.convenor;
        this.convenor = { ...c, name: c.name ?? null, picture: c.picture ?? null,
          lastActivityT: event.t, lapseWarned: false };
        for (const id of HELD) {
          const entry = entryOf(id);
          const delegated = entry.delegable && entry.holderDefault === 'members';
          this.settings.set(id, {
            id,
            holder: delegated ? 'members' : 'convenor',
            powers: { unilateral: !delegated, assent: !delegated },
            value: null,
            settledBy: null,
            settledAtT: null,
            collecting: delegated,
            answers: new Map(),
            distribution: null,
          });
        }
        this.foldSet('title', { text: event.title }, 'convenor', event.t);
        this.foldSet('link', { slug: event.slug }, 'convenor', event.t);
        this.slugHistory.push(event.slug);
        if (c.isMember) this.members.set(c.id, this.freshMember(c.id, c.email, event.t, event.t));
        break;
      }
      case 'convenor-membership-set': {
        if (event.isMember) {
          this.members.set(this.convenor.id,
            this.freshMember(this.convenor.id, this.convenor.email, event.t, event.t));
        } else {
          this.members.delete(this.convenor.id);
        }
        break;
      }
      case 'setting-set': {
        this.touch(this.convenor.id, event.t); // a convenor act moves their clock
        this.foldSet(event.setting, event.value, event.by, event.t);
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
      case 'quorum-form-set': {
        this.quorumFormValue = event.form;
        break;
      }
      case 'identity-set': {
        if (event.member === this.convenor.id && !this.members.has(event.member)) {
          if (event.name !== undefined) this.convenor.name = event.name;
          if (event.picture !== undefined) this.convenor.picture = event.picture;
          break;
        }
        const m = this.members.get(event.member)!;
        if (event.name !== undefined) m.name = event.name;
        if (event.picture !== undefined) m.picture = event.picture;
        this.touch(event.member, event.t);
        break;
      }
      case 'member-invited': {
        this.members.set(event.member,
          this.freshMember(event.member, event.email, event.t, null));
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
        // **The start lays the founder's hand off the Text** (CLAUDE.md `🍾
        // Begin`: the batch is *the founder lays down ✒️ and 🛡️ on the Text,
        // members gain ✏️ on it, judging opens*). Derived at the fold rather
        // than emitted, like Q506's applications pair, so every document
        // constituted before 2026-08-21 replays the same way — a shield kept
        // on the Text would make every adoption wait on founder assent, which
        // is no drafting engine's default. The road to a held Text is a
        // post-start reserve motion; 🍾, when it is an explicit act, takes
        // this over.
        this.setPowers(this.settings.get('startingText')!, { unilateral: false, assent: false });
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
        const powers: Powers = { ...st.powers, [event.power]: false };
        this.setPowers(st, powers);
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
          this.setPowers(st, {
            unilateral: st.powers.unilateral || p !== 'assent',
            assent: st.powers.assent || p !== 'unilateral',
          });
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
        const rec = this.freshMember(event.member, a.email, event.t, event.t);
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
    this.foldApplications(st);
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
    if (rec.payload.kind === 'reserve') return false;
    return this.registerPowers().assent;
  }

  /** §9.7 v0.54: holder derives from powers — the convenor's iff any is held. */
  private setPowers(st: SettingState, powers: Powers): void {
    st.powers = powers;
    st.holder = holderOf(powers);
  }

  private freshMember(id: MemberId, email: string, invitedAtT: number,
    arrivedAtT: number | null): MemberRecord {
    return {
      id, email, invitedAtT, arrivedAtT,
      removed: false, lapsed: false, lapseWarned: false, signedOut: null,
      name: null, picture: null,
      lastActivityT: arrivedAtT ?? invitedAtT,
      okOwed: new Set(), okGiven: new Set(),
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
    this.foldApplications(st);
  }

  /**
   * Q506 migration (2026-08-21): a legacy applications value carried the
   * register's crown as `holder`; the pair now lives on the setting's own
   * powers like every held-able setting. The event keeps its bytes -- the
   * fold reads the holder onto the powers and strips it from what stands,
   * so an old log and a fresh session reach the same state.
   */
  private foldApplications(st: SettingState): void {
    if (st.id !== 'applications' || st.value === null) return;
    const v = st.value as ApplicationsValue;
    if (v.holder === undefined) return;
    const h = v.holder;
    this.setPowers(st, {
      unilateral: h === 'reserved' || h === 'reserved-unilateral',
      assent: h === 'reserved' || h === 'reserved-assent',
    });
    st.value = { joinPolicy: v.joinPolicy };
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
    if (current === isMember) return;
    this.emit({ type: 'convenor-membership-set', t, isMember });
    this.afterRosterChange(t, isMember ? 'arrival' : 'departure', this.convenor.id);
  }

  setSetting(t: number, setting: SettingId, value: SettingValue): void {
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
    // Post-start a reserved setting is the convenor's to change directly —
    // the assent was consented on the way in (§9.7, Ed's 366; NOTES.md).
    this.emit({ type: 'setting-set', t, setting, value,
      by: postStart ? 'crown' : 'convenor' });
    if (CONSTITUTIONAL.has(setting)) this.oweOks(t, setting);
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
  delegate(t: number, setting: SettingId): void {
    this.requireOpen('delegating');
    const entry = entryOf(setting);
    if (entry.kind === 'personal') {
      throw new Error(`'${setting}' is a member's own (§9.0c) — never held, never delegated`);
    }
    if (setting === 'membership') {
      throw new Error("the register is held through 'applications' -- delegate that (§9.7½)");
    }
    const st = this.settings.get(setting)!;
    if (this.constitutedT === null && entry.delegable) {
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
   * Give up one crown power on one setting (§9.7 v0.54): free, separate,
   * one-way — the road back is the room's reserve motion. Assent may go
   * from creation; unilateral change only once proposing opens, because
   * the assent-only state is inert before the start (Ed, 2026-08-19,
   * corrected the same day: delegation keeps its earlier clock).
   */
  relinquish(t: number, setting: SettingId, power: Power): void {
    this.requireOpen('giving up a power');
    const entry = entryOf(setting);
    if (entry.kind === 'personal') {
      throw new Error(`'${setting}' is a member's own (§9.0c) — never held`);
    }
    if (setting === 'membership') {
      throw new Error("the register's powers are the applications setting's -- relinquish there (§9.7½)");
    }
    const st = this.settings.get(setting)!;
    if (!st.powers[power]) {
      throw new Error(`the ${power} power on '${setting}' is not held`);
    }
    if (power === 'unilateral' && this.constitutedT === null) {
      // Q403 (Ed, 2026-08-19): delegation IS the state of holding no
      // powers, so pre-start, giving up the second power on a delegable
      // setting is delegation — it opens the blind founding question like
      // the verb always did. Giving up unilateral change *alone* stays
      // barred until proposing opens (the assent-only state is inert
      // before the start, §9.7 v0.54).
      if (!st.powers.assent && entry.delegable) {
        this.emit({ type: 'setting-delegated', t, setting });
        return;
      }
      if (!this.textConfirmedFlag) {
        throw new Error('giving up unilateral change waits until proposing opens (§9.7 v0.54)');
      }
    }
    this.emit({ type: 'power-relinquished', t, setting, power });
  }

  reclaim(t: number, setting: SettingId): void {
    this.requireOpen('reclaiming');
    this.requirePreStart('reclaiming');
    const st = this.settings.get(setting);
    if (!st) throw new Error(`'${setting}' is not a delegable setting`);
    // nothing to take back: held, with both powers intact
    if (st.holder === 'convenor' && st.powers.unilateral && st.powers.assent) return;
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

  invite(t: number, email: string): MemberId {
    this.requireOpen('inviting');
    if (this.constitutedT !== null &&
        !(this.registerPowers().unilateral && !this.crownLapsedFlag)) {
      throw new Error('after the start an invitation is a constitutional motion (§9.6a)');
    }
    this.requireEmailFree(email);
    const id = `m-${this.nextMemberN}`;
    this.emit({ type: 'member-invited', t, member: id, email });
    // An invitee counts toward nothing until they arrive — no roster
    // follow-ons: E is unchanged (§9.6a).
    return id;
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
    this.oweOnJoining(t, member);
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
    const electorate = eOf(this.members.values());
    // **and never on one voice**, which is the other half of the same reason:
    // a consent rule computed over a single answer is that answer, so a
    // delegated question with a membership of one has not been delegated to
    // anybody. The founder's remedy is either half of the choice they already
    // have — invite somebody, or take the setting back and set it.
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
   */
  begin(t: number): void {
    this.requireOpen('beginning');
    if (this.constitutedT !== null) throw new Error('the document has already begun');
    const waiting = this.waitingOn();
    if (waiting.length > 0) {
      throw new Error(`the document cannot begin while '${waiting.join("', '")}' ${waiting.length === 1 ? 'is' : 'are'} still being decided (§9.0b)`);
    }
    this.emit({ type: 'constituted', t });
  }

  /** The judge-gate settings not yet settled — what 🍾 waits on. */
  private waitingOn(): SettingId[] {
    return CATALOGUE
      .filter((e) => e.judgeGate && this.settings.get(e.id)!.settledBy === null)
      .map((e) => e.id);
  }

  /**
   * The founder's readiness readout (Q443 (a)(i), both halves; founder-only
   * by the host's choice — it is part of the 🍾 task, not of the document).
   * Per question: whether it stands, and how many have answered. Per person:
   * how many of the questions they owe they have answered. **Participation
   * itemised by name, never preference** — no value, no running maximum.
   */
  readiness(): {
    ready: boolean;
    waiting: SettingId[];
    questions: Array<{ setting: SettingId; settled: boolean; collecting: boolean;
      answered: number; electorate: number }>;
    members: Array<{ id: MemberId; name: string | null; arrived: boolean;
      owed: number; answered: number }>;
  } {
    const E = eOf(this.members.values());
    const open = MANAGED.filter((id) => this.settings.get(id)!.collecting);
    const questions = MANAGED
      .filter((id) => { const st = this.settings.get(id)!; return st.collecting || st.distribution !== null; })
      .map((id) => {
        const st = this.settings.get(id)!;
        return { setting: id, settled: st.settledBy !== null, collecting: st.collecting,
          answered: st.answers.size, electorate: E.length };
      });
    const members = [...this.members.values()]
      .filter((m) => !m.removed && !m.invitationExpired)
      .map((m) => ({ id: m.id, name: m.name, arrived: m.arrivedAtT !== null,
        owed: m.arrivedAtT === null ? 0 : open.length,
        answered: m.arrivedAtT === null ? 0
          : open.filter((id) => this.settings.get(id)!.answers.has(m.id)).length }));
    const waiting = this.waitingOn();
    return { ready: this.constitutedT === null && waiting.length === 0, waiting, questions, members };
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

  private oweOks(t: number, setting: SettingId): void {
    for (const m of eOf(this.members.values())) {
      if (m.id === this.convenor.id) continue; // the convenor had their say
      if (m.okOwed.has(setting)) continue;
      this.emit({ type: 'ok-owed', t, member: m.id, settings: [setting] });
    }
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
      if (payload.setting === 'membership') {
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
      route = 'constitutional'; // membership's own kind — reservation adds assent, never a route (§9.7 v0.49)
    } else if (payload.kind === 'remove') {
      const target = this.members.get(payload.member);
      if (!target || !inE(target)) throw new Error(`'${payload.member}' is not a member`);
      // The route is the 🚪 removal setting's (Q401, Ed 2026-08-19):
      // 'ordinary' races at the bar; 'others' and 'everyone' are consent —
      // the difference lives in the settle check, not the route.
      route = this.removalRung() === 'ordinary' ? 'ordinary' : 'constitutional';
    } else {
      // admit rides submitApplication/proposeApplicant (§9.7½)
      route = 'ordinary';
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
      throw new Error('the subject of a removal is not asked on this route (🚪 Q401a) — they see it, and it settles without them');
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

  /** 🚪 (Q401): the removal rung as it stands — unset reads as today's rule,
   *  everyone's consent with the subject's own answer counted. */
  private removalRung(): 'everyone' | 'others' | 'ordinary' {
    const st = this.settings.get('removal');
    const v = st ? (st.value as LadderValue | null) : null;
    return (v?.rung as 'everyone' | 'others' | 'ordinary' | undefined) ?? 'everyone';
  }

  /** Under 'others', the subject of a removal stands outside its electorate
   *  (Q401a) — they see the motion, and it settles without them. Read live,
   *  like the electorate itself: a rung change mid-motion is a ground shift. */
  private motionExcludes(rec: MotionRecord): MemberId | null {
    return rec.payload.kind === 'remove' && this.removalRung() === 'others'
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
        // 🏛️ without [avatar] (Q401a): a removal under 'others' settles by
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
    }
    if (rec.payload.kind === 'admit') {
      const id = `m-${this.nextMemberN}`;
      this.emit({ type: 'member-admitted', t, applicant: rec.payload.applicant,
        member: id });
      this.oweOnJoining(t, id); // an admitted applicant inherits (§9.6a)
      this.afterRosterChange(t, 'arrival', id); // and is present
    }
  }

  /** A joiner is owed an OK on every constitutional setting they had no say in. */
  private oweOnJoining(t: number, member: MemberId): void {
    const owed = this.settledConstitutionalIds()
      .filter((id) => !this.settings.get(id)!.answers.has(member));
    if (owed.length > 0) this.emit({ type: 'ok-owed', t, member, settings: owed });
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
    // document can freeze — plain silence never does either (§9.5).
    this.maybeSettleMotions(t);
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

  private joinPolicy(): 'invite' | 'proposed' | 'apply' | 'open' {
    const apps = this.settings.get('applications')!.value as ApplicationsValue | null;
    return apps ? apps.joinPolicy : 'invite';
  }

  startApplication(t: number, email: string): string {
    this.requireOpen('applying');
    if (this.joinPolicy() === 'invite') {
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
    const a = this.applicants.get(applicant);
    if (!a || a.status !== 'verified') {
      throw new Error('an application is verified by magic link before it can be submitted (§9.7½)');
    }
    const e: ConstitutionEvent = { type: 'application-submitted', t, applicant };
    if (fields.name !== undefined) (e as { name?: string }).name = fields.name;
    if (fields.picture !== undefined) (e as { picture?: string }).picture = fields.picture;
    if (fields.words !== undefined) (e as { words?: string }).words = fields.words;
    this.emit(e);
    const policy = this.joinPolicy();
    if (policy === 'open') {
      // anyone with the link joins on arrival — no motion in the way
      const id = `m-${this.nextMemberN}`;
      this.emit({ type: 'member-admitted', t, applicant, member: id });
      this.oweOnJoining(t, id);
      this.afterRosterChange(t, 'arrival', id);
    } else if (policy === 'apply') {
      // straight to the bar, free — the tasks its price, the bar its filter
      this.emit({ type: 'motion-opened', t, motion: `mo-${this.nextMotionN}`,
        by: null, payload: { kind: 'admit', applicant },
        route: 'ordinary', stake: 0 });
    }
    // under 'proposed' the application waits for a member's second
  }

  /** A second is a proposed application (§9.7½, Q348a): the member stakes the ✏️.
   *  The rationale is theirs to write or leave blank (v0.57) — the lane is
   *  offered by the surface, never demanded by the mechanism. */
  proposeApplicant(t: number, member: MemberId, applicant: string, why?: string): void {
    this.requireOpen('proposing');
    if (this.joinPolicy() !== 'proposed') {
      throw new Error("this document's applications are not proposed (§9.7½)");
    }
    const m = this.members.get(member);
    if (!m || !inE(m)) throw new Error(`'${member}' is not an arrived member`);
    const a = this.applicants.get(applicant);
    if (!a || a.status !== 'submitted') throw new Error('no submitted application to propose');
    this.emit({ type: 'application-proposed', t, applicant, by: member });
    const e: ConstitutionEvent = { type: 'motion-opened', t,
      motion: `mo-${this.nextMotionN}`, by: member,
      payload: { kind: 'admit', applicant }, route: 'ordinary', stake: 1 };
    if (why !== undefined && why.trim() !== '') (e as { why?: string }).why = why;
    this.emit(e);
  }

  // -------------------------------------------------------------------------
  // Reads used by projections (view.ts owns the member-facing surface)

  /** The register's crown as the two powers (§9.7 v0.54), lapse ignored —
   *  a sleeping crown still holds; callers check the lapse where it bites. */
  registerPowers(): Powers {
    return { ...this.settings.get('applications')!.powers }; // Q506: one pair, on the setting
  }

  /** Any register power held and the crown awake — the direct-invite gate. */
  membershipReserved(): boolean {
    const rp = this.registerPowers();
    return (rp.unilateral || rp.assent) && !this.crownLapsedFlag;
  }

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
   * Q440: the shield on the Text means an **adoption** waits on the
   * founder's accept -- assent over the drafting mechanism itself. The
   * engine has already adopted; the host asks here whether the document it
   * serves may follow, and a sleeping crown grants (lapse is abstention).
   */
  textAdoptionNeedsAssent(): boolean {
    return this.settings.get('startingText')!.powers.assent && !this.crownLapsedFlag;
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

  private settledConstitutionalIds(): SettingId[] {
    return [...CONSTITUTIONAL].filter((id) => this.settings.get(id)!.settledBy !== null);
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
   * order they signed, each with their comment. Names follow the ✍️ signing
   * setting — `nobody` anonymises every signature, `each` lets the signer's
   * own name stand, `everybody` names all. The comment is always shown; it
   * is the rationale, and blank is a real signature.
   */
  closingSignatures(): Array<{ member: MemberId; name: string | null; comment: string; t: number }> {
    const signing = this.settings.get('signing')!.value as LadderValue | null;
    const rung = (signing?.rung as 'nobody' | 'each' | 'everybody' | undefined) ?? 'each';
    const out: Array<{ member: MemberId; name: string | null; comment: string; t: number }> = [];
    for (const m of this.members.values()) {
      if (m.closingAck === null) continue;
      out.push({
        member: m.id,
        name: rung === 'nobody' ? null : m.name,
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
  memberRecords(): ReadonlyMap<MemberId, MemberRecord> { return this.members; }
  settingState(id: SettingId): Readonly<SettingState> {
    const st = this.settings.get(id);
    if (!st) throw new Error(`'${id}' has no setting state`);
    return st;
  }
  motionRecords(): ReadonlyMap<MotionId, MotionRecord> { return this.motions; }
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
