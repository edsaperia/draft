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
  ApplicantRecord, ConstitutionEvent, ConvenorInput, CrownQuestionRecord,
  LogEntry, MemberId, MemberRecord, MotionAnswer, MotionId, MotionPayload,
  MotionRecord, SettingState,
} from './types.js';
import type { MotionRoute, SettingId } from './catalogue.js';
import { CATALOGUE, entryOf, motionRouteOf, validateFor } from './catalogue.js';
import type { ApplicationsValue, EndingValue, PaceValue, PercentValue,
  QuorumValue, SettingValue, SlugValue, TextValue } from './values.js';
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

const CONSTITUTIONAL: ReadonlySet<SettingId> = new Set(
  CATALOGUE.filter((e) => e.kind === 'constitutional' && e.id !== 'membership').map((e) => e.id),
);

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
    this.log.push({ seq, hash, prevHash, event });
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
        for (const id of MANAGED) {
          const entry = entryOf(id);
          const delegated = entry.delegable && entry.holderDefault === 'members';
          this.settings.set(id, {
            id,
            holder: delegated ? 'members' : 'convenor',
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
        st.holder = 'members';
        st.collecting = true;
        st.value = null;
        st.settledBy = null;
        st.settledAtT = null;
        st.distribution = null;
        break;
      }
      case 'setting-reclaimed': {
        const st = this.settings.get(event.setting)!;
        st.holder = 'convenor';
        st.collecting = false;
        st.answers.clear();
        st.value = null;
        st.settledBy = null;
        st.settledAtT = null;
        st.distribution = null;
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
          status: 'running',
          answers: new Map(),
          settledAtT: null,
        });
        this.nextMotionN += 1;
        if (event.by) this.touch(event.by, event.t);
        break;
      }
      case 'motion-answer': {
        const rec = this.motions.get(event.motion)!;
        rec.answers.set(event.member, event.answer);
        this.touch(event.member, event.t);
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
          openedAtT: event.t,
          status: 'pending',
        });
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
        const rec = this.motions.get(q.motion)!;
        rec.status = accepted ? 'carried' : 'held';
        rec.settledAtT = event.t;
        if (accepted && rec.payload.kind === 'set') {
          this.applyPayloadSet(rec.payload.setting, rec.payload.value, 'crown', event.t);
        }
        if (event.type === 'crown-question-answered') {
          this.touch(this.convenor.id, event.t);
        }
        break;
      }
      case 'crown-lapsed': {
        // A lapsed crown passes to the members (§9.7) — and with it every
        // reserved setting, since reservation has no holder left (NOTES.md).
        this.crownLapsedFlag = true;
        for (const st of this.settings.values()) {
          if (st.holder === 'convenor') st.holder = 'members';
        }
        break;
      }
      default:
        this.applyPresence(event);
    }
  }

  /** Presence, the freeze, lapsing and applications — folded in a later commit. */
  private applyPresence(event: ConstitutionEvent): void {
    throw new Error(`unhandled event '${event.type}'`);
  }

  /** A carried change lands on the setting, keeping who holds it. */
  private applyPayloadSet(id: SettingId, value: SettingValue,
    by: 'motion' | 'crown', t: number): void {
    const st = this.settings.get(id)!;
    st.value = value;
    st.settledBy = by;
    st.settledAtT = t;
    st.collecting = false;
    if (id === 'quorum') this.quorumFormValue = (value as QuorumValue).form;
    if (id === 'link') {
      const slug = (value as SlugValue).slug;
      if (!this.slugHistory.includes(slug)) this.slugHistory.push(slug);
    }
    this.reseedAnchorsIfLive(t, id);
  }

  /** Does this motion's target sit behind the crown's assent (§9.7)? */
  private reservedTarget(rec: MotionRecord): boolean {
    if (this.crownLapsedFlag) return false;
    if (rec.payload.kind === 'set') {
      return this.settings.get(rec.payload.setting)!.holder === 'convenor';
    }
    return this.membershipReserved();
  }

  private freshMember(id: MemberId, email: string, invitedAtT: number,
    arrivedAtT: number | null): MemberRecord {
    return {
      id, email, invitedAtT, arrivedAtT,
      removed: false, lapsed: false, lapseWarned: false, signedOut: null,
      name: null, picture: null,
      lastActivityT: arrivedAtT ?? invitedAtT,
      okOwed: new Set(), okGiven: new Set(),
    };
  }

  private foldSet(id: SettingId, value: SettingValue, by: 'convenor' | 'crown',
    t: number): void {
    const st = this.settings.get(id)!;
    st.holder = 'convenor';
    st.collecting = false;
    st.value = value;
    st.settledBy = by === 'crown' ? 'crown' : 'convenor';
    st.settledAtT = t;
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

  setConvenorMembership(t: number, isMember: boolean): void {
    this.requirePreStart('re-ticking the convenor row');
    const current = this.members.has(this.convenor.id);
    if (current === isMember) return;
    this.emit({ type: 'convenor-membership-set', t, isMember });
    this.afterRosterChange(t, isMember ? 'arrival' : 'departure', this.convenor.id);
  }

  setSetting(t: number, setting: SettingId, value: SettingValue): void {
    const entry = entryOf(setting);
    if (!this.settings.has(setting)) {
      throw new Error(`'${setting}' is not set this way`);
    }
    const st = this.settings.get(setting)!;
    if (st.holder !== 'convenor') {
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
    this.maybeConstitute(t);
  }

  setQuorumForm(t: number, form: 'count' | 'share'): void {
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

  delegate(t: number, setting: SettingId): void {
    this.requirePreStart('delegation');
    const entry = entryOf(setting);
    if (!entry.delegable) throw new Error(`'${setting}' is not delegable`);
    const st = this.settings.get(setting)!;
    if (st.holder === 'members') return;
    this.emit({ type: 'setting-delegated', t, setting });
  }

  reclaim(t: number, setting: SettingId): void {
    this.requirePreStart('reclaiming');
    const st = this.settings.get(setting);
    if (!st) throw new Error(`'${setting}' is not a delegable setting`);
    if (st.holder === 'convenor') return;
    this.emit({ type: 'setting-reclaimed', t, setting });
  }

  confirmStartingText(t: number, text: string): void {
    if (this.constitutedT !== null) {
      throw new Error('after the start the text changes by proposing in the document itself');
    }
    this.emit({ type: 'starting-text-confirmed', t, text });
  }

  setIdentity(t: number, member: MemberId,
    identity: { name?: string | null; picture?: string | null }): void {
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
    if (this.constitutedT !== null && !this.membershipReserved()) {
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
    const m = this.members.get(member);
    if (!m || m.removed) throw new Error(`unknown member '${member}'`);
    if (m.arrivedAtT !== null) { this.touch(member, t); return; }
    this.emit({ type: 'member-arrived', t, member });
    const owed = this.settledConstitutionalIds()
      .filter((id) => !this.settings.get(id)!.answers.has(member));
    if (owed.length > 0) this.emit({ type: 'ok-owed', t, member, settings: owed });
    this.afterRosterChange(t, 'arrival', member);
  }

  // -------------------------------------------------------------------------
  // The ceremony (§9.0a)

  answer(t: number, member: MemberId, setting: SettingId, value: SettingValue): void {
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
    this.maybeConstitute(t);
  }

  giveOk(t: number, member: MemberId, setting: SettingId): void {
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
    const electorate = eOf(this.members.values());
    if (electorate.length === 0) return;
    if (!electorate.every((m) => st.answers.has(m.id))) return;
    const answers = electorate.map((m) => st.answers.get(m.id)!);
    const { value, distribution } = resolveConsent(entry, answers);
    this.emit({ type: 'question-resolved', t, setting, value, distribution,
      electorate: electorate.map((m) => m.id).sort() });
  }

  private maybeResolveAll(t: number): void {
    for (const id of MANAGED) this.maybeResolve(t, id);
  }

  private maybeConstitute(t: number): void {
    if (this.constitutedT !== null) return;
    const gatesSettled = CATALOGUE
      .filter((e) => e.judgeGate)
      .every((e) => this.settings.get(e.id)!.settledBy !== null);
    if (!gatesSettled) return;
    this.emit({ type: 'constituted', t });
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
    this.maybeConstitute(t);
    this.maybeSettleMotions(t);
  }

  // -------------------------------------------------------------------------
  // Motions (§9.6, v0.48): the one act by which a settled document changes
  // its own rules. The route is a fact about the setting.

  openMotion(t: number, by: MemberId, payload: MotionPayload): MotionId {
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
    } else if (payload.kind === 'invite') {
      this.requireEmailFree(payload.email);
      route = this.membershipReserved() ? 'ordinary' : 'constitutional';
    } else if (payload.kind === 'remove') {
      const target = this.members.get(payload.member);
      if (!target || !inE(target)) throw new Error(`'${payload.member}' is not a member`);
      route = this.membershipReserved() ? 'ordinary' : 'constitutional';
    } else {
      // admit rides submitApplication/proposeApplicant (§9.7½)
      route = 'ordinary';
    }
    if (route === 'constitutional' && this.heldOutBy(by)) {
      throw new Error('one 🏛️ out per member at a time (§9.6)');
    }
    const id = `mo-${this.nextMotionN}`;
    this.emit({ type: 'motion-opened', t, motion: id, by, payload, route,
      stake: route === 'ordinary' ? 1 : 0 });
    return id;
  }

  answerMotion(t: number, member: MemberId, motion: MotionId,
    answer: MotionAnswer): void {
    const rec = this.motions.get(motion);
    if (!rec || rec.status !== 'running') throw new Error('the motion is not running');
    if (rec.route !== 'constitutional') {
      throw new Error('an ordinary motion is judged as a race, not answered (§9.6)');
    }
    const m = this.members.get(member);
    if (!m || !motionElectorateOf([m]).length) {
      throw new Error(`'${member}' is not in the motion's electorate`);
    }
    this.emit({ type: 'motion-answer', t, motion, member, answer });
    this.maybeSettleMotions(t);
  }

  withdrawMotion(t: number, member: MemberId, motion: MotionId): void {
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
    }
  }

  answerCrownQuestion(t: number, question: string, outcome: 'accept' | 'reject'): void {
    const q = this.crownQuestions.get(question);
    if (!q || q.status !== 'pending') throw new Error('no such pending 👑 question');
    if (this.crownLapsedFlag) throw new Error('the crown has lapsed — the question passes by itself');
    this.emit({ type: 'crown-question-answered', t, question, outcome });
    if (outcome === 'accept') {
      this.settleCarriedEffects(t, this.motions.get(q.motion)!, false);
    }
  }

  private heldOutBy(member: MemberId): boolean {
    for (const rec of this.motions.values()) {
      if (rec.by === member && rec.route === 'constitutional' && rec.status === 'running') {
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
        const electorate = motionElectorateOf(this.members.values());
        if (electorate.length === 0) continue;
        const answers = electorate.map((m) => rec.answers.get(m.id));
        if (answers.some((a) => a === undefined || a === 'keep')) continue;
        if (!answers.some((a) => a === 'accept')) continue; // nobody consented to anything
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
    // 'admit' effects ride the applications machinery (§9.7½)
  }

  // -------------------------------------------------------------------------
  // Reads used by projections (view.ts owns the member-facing surface)

  membershipReserved(): boolean {
    const apps = this.settings.get('applications')!.value as ApplicationsValue | null;
    return apps !== null && apps.holder === 'reserved' && !this.crownLapsedFlag;
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
