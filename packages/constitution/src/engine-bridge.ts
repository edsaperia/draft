/**
 * The engine-bridge (367b, Q390, Q397): marries a ConstitutionSession — §9's
 * truth about who may act, what stands and which route a motion takes —
 * to an engine-core Session, which runs the races. The division of labour:
 *
 * - an **ordinary set-motion** becomes a setting candidate in the engine
 *   (the standing value its incumbent, rival values in the same race);
 *   when the race adopts, the bridge reports the verdict through the
 *   `adjudicateOrdinaryMotion` seam — the same seam the mock's dev button
 *   spoke, now with a real adjudicator behind it;
 * - the engine **never applies a value** (Q390): the constitution session
 *   applies it — or parks it behind a 👑 question (§9.7) — and the bridge
 *   relays whatever then actually stands back into the engine as a
 *   `standing-set`, which is the ground shift for any race in flight;
 * - carried **amendments** to engine-consumed settings (the bar, the
 *   ending, the rate, quorum, authorship) also `amend` the engine
 *   constitution, so races in flight run under the constitution as it
 *   stands (§9.6/Q328) and the threshold never jumps (§4.3);
 * - roster truth flows one way, cs → engine: arrivals add, removals
 *   remove, lapse suspends (out of E, §9.5a), revival resumes.
 *
 * Deliberately NOT exported from index.ts: browser.ts re-exports index
 * wholesale, and the bridge would drag engine-core into the page bundle
 * before the page's motion-race surface exists (Q391). Hosts — sim-harness
 * now, the thin server (Q368) later — import it by path, the way
 * sim-harness already imports engine-core.
 *
 * Admit motions (§9.7½ v0.56, Q397): each is its own one-candidate race
 * against `the membership as it stands` — a synthetic per-applicant
 * setting (`admit:<id>`, standing {member: false}), which is what makes
 * two applicants structurally unable to share a race. The author is the
 * seconder under `proposed` (their ✏️ the stake, their why the rationale)
 * or the applicant themself under `apply` — added as a voice for exactly
 * this one act and suspended in the same breath, so they author their own
 * admission (§3.3's author-preference is truly theirs) while counting
 * toward no E, no quorum and no floor.
 */

import { Session as EngineSession } from '../../engine-core/src/session.js';
import type { ConstitutionAmendment, Event as EngineEvent,
  LogEntry as EngineLogEntry } from '../../engine-core/src/types.js';
import type { Outcome } from '../../engine-core/src/ranking/types.js';
import type { PatchSet } from '../../engine-core/src/text/types.js';
import { stableStringify } from './hash.js';
import { CATALOGUE, entryOf, motionRouteOf } from './catalogue.js';
import type { SettingId } from './catalogue.js';
import type { ConstitutionSession } from './session.js';
import { inE } from './populations.js';
import { DEFAULT_TUNING, engineFieldsFor, toEngineConstitution,
  type EngineTuning } from './adapter.js';
import type { MemberId, MotionId } from './types.js';
import type { SettingValue } from './values.js';

/** Settings that never carry a raceable standing value. */
const UNRACED: ReadonlySet<string> = new Set(['admission', 'startingText']);

/**
 * What a host must keep beside the engine log to resume a bridge: the
 * cs-log cursor sync() has consumed to, and the motion ↔ candidate
 * pairing (which lives in no log — the engine does not know motions and
 * the constitution does not know candidates).
 */
export interface BridgeState {
  cursor: number;
  motionCandidates: Record<string, string>;
}

export class EngineBridge {
  readonly engine: EngineSession;
  private readonly cs: ConstitutionSession;
  private readonly candidateOfMotion = new Map<MotionId, string>();
  private readonly motionOfCandidate = new Map<string, MotionId>();
  private readonly known = new Set<string>();
  private cursor: number;

  constructor(
    cs: ConstitutionSession,
    opts: {
      t: number; rngSeed: string; tuning?: EngineTuning;
      /** Resume from a persisted engine log + bridge state (Q391). */
      resume?: { log: EngineLogEntry[] } & BridgeState;
    },
  ) {
    if (cs.constitutedAtT === null) {
      throw new Error('the engine starts where the constitution is settled (§9.0b)');
    }
    this.cs = cs;
    if (opts.resume !== undefined) {
      this.engine = EngineSession.replay([...opts.resume.log]);
      for (const entry of opts.resume.log) {
        const e = entry.event;
        if (e.type === 'opened') for (const p of e.roster) this.known.add(p.id);
        else if (e.type === 'participant-added') this.known.add(e.participant.id);
      }
      for (const [m, c] of Object.entries(opts.resume.motionCandidates)) {
        this.candidateOfMotion.set(m, c);
        this.motionOfCandidate.set(c, m);
      }
      this.cursor = opts.resume.cursor;
      return;
    }
    const { constitution } = toEngineConstitution(
      cs,
      opts.tuning ?? DEFAULT_TUNING,
      opts.rngSeed,
    );
    const roster = [...cs.memberRecords().values()].filter(inE).map((m) => ({
      id: m.id,
      handle: m.name ?? m.email,
    }));
    for (const p of roster) this.known.add(p.id);
    const settings: Record<string, unknown> = {};
    for (const entry of CATALOGUE) {
      if (entry.kind === 'personal' || UNRACED.has(entry.id)) continue;
      const st = cs.settingState(entry.id);
      if (st.value !== null) settings[entry.id] = st.value;
    }
    this.engine = EngineSession.open(
      { text: cs.text ?? '', roster, constitution, settings },
      opts.t,
    );
    this.cursor = cs.logEntries().length;
  }

  /**
   * Open an ordinary set-motion and enter it in its setting's race; a
   * value that routes constitutionally opens the unanimity vote instead
   * (the route belongs to what the motion changes, §9.6/Q329).
   */
  openSetMotion(
    t: number,
    by: MemberId,
    setting: SettingId,
    value: SettingValue,
    why?: string,
  ): { motion: MotionId; route: 'ordinary' | 'constitutional'; candidate?: string } {
    this.sync(t);
    const standing = this.cs.settingState(setting).value;
    // A null standing routes constitutionally (the session will refuse the
    // motion; the route only gates the stake check here) — motionRouteOf's
    // own null case, the same rule openMotion derives rec.route by.
    const route = motionRouteOf(entryOf(setting), value, standing);
    if (
      route === 'ordinary' &&
      this.engine.balance(by, t) < this.engine.constitution.stake
    ) {
      throw new Error('insufficient ✏️ for the stake (§7)');
    }
    const motion = this.cs.openMotion(t, by, { kind: 'set', setting, value }, why);
    const rec = this.cs.motionRecords().get(motion)!;
    // `route` and `rec.route` are the same value by construction (both come
    // from motionRouteOf, above and inside openMotion) — this reads the local
    // one because a **raised** motion is never the pen, and the local is
    // typed to say so. A 'pen' amendment is folded, never opened.
    if (rec.route !== 'ordinary') return { motion, route };
    // Two append-only logs cannot be written in one act, so a candidate
    // the engine refuses — a duplicate, an exhausted wallet, a race that
    // has since closed — used to leave a motion standing in the
    // constitution with nothing racing behind it: unjudgeable, and
    // unwithdrawable by anybody but its mover (review #1, finding 6a).
    // The cure in an event-sourced design is not a rollback, which does
    // not exist, but a **compensating event**: the withdrawal is written,
    // the stake and the seat come back whole (§3.3a), and the log tells
    // the truth about what happened rather than hiding it.
    let id: string;
    try {
      ({ id } = this.engine.submitCandidate(t, {
        author: by,
        setting: { settingId: setting, value },
        rationale: why ?? '',
      }));
    } catch (e) {
      this.cs.withdrawMotion(t, by, motion);
      throw e;
    }
    this.candidateOfMotion.set(motion, id);
    this.motionOfCandidate.set(id, motion);
    return { motion, route: 'ordinary', candidate: id };
  }

  /**
   * Judge a pair (SPEC §3.1). A setting race that adopts reports its
   * verdict through the adjudication seam; what then actually stands —
   * applied, or parked behind a 👑 — flows back via sync().
   */
  judge(t: number, who: MemberId, aId: string, bId: string, outcome: Outcome): void {
    this.reportAdoptions(t, this.engine.judge(t, who, aId, bId, outcome));
    this.sync(t);
  }

  /**
   * The host's minute tick (SPEC §4.2, Ed 2026-08-19): release any
   * adoption batch the cooldown has made due, without waiting for a
   * judgment to serve as the timer. Setting verdicts go through the
   * seam exactly as a judgment-triggered adoption's would.
   */
  tick(t: number): void {
    this.sync(t); // the sweep runs under the current ground
    this.reportAdoptions(t, this.engine.tick(t)); // may run the engine's own close
    this.sync(t); // relay what carried (the ground shift)
    if (this.engine.closed && !this.cs.closed) this.finishClose();
  }

  /**
   * Every setting race among the adoptions reports 'carried' through the
   * seam; a text race that **parked** under the Text's shield (Q440,
   * R-056) opens the 👑 question — assent over the drafting mechanism
   * itself (SPEC §9.7 rule 8). A text race that adopted needs nothing said
   * about it: the engine has applied it and the served text is the
   * engine's document.
   */
  private reportAdoptions(t: number, events: EngineEvent[]): void {
    for (const e of events) {
      if (e.type === 'candidate-awaiting-assent') {
        // **The park is the question**, and the park is where it is asked.
        // Asking `textAdoptionNeedsAssent()` again here would re-open the
        // lapse race the park already closed — the engine only parks
        // because the shield was declared to it, and a crown that fell
        // asleep in between has an answer, not a second question. Where
        // the shield really has gone down since (laid down, or a lapse the
        // engine has not been told about yet) there is nobody to ask, so
        // the adoption stands by itself — which is what §9.7 rule 8 says
        // of an unshielded Text.
        if (this.cs.closed) continue;
        if (this.cs.textAdoptionNeedsAssent()) {
          this.cs.openTextCrownQuestion(t, {
            candidateId: e.id, summary: this.textSummary(e.id),
          });
        } else if (this.engine.getCandidate(e.id).state === 'awaiting-assent') {
          this.engine.assent(t, e.id, 'accept');
        }
        continue;
      }
      if (e.type !== 'adopted') continue;
      const motion = this.motionOfCandidate.get(e.candidateId);
      if (motion === undefined) continue; // a text race adopting
      this.cs.adjudicateOrdinaryMotion(t, motion, 'carried');
    }
  }

  /**
   * The 👑's answer, both halves: the constitution records it, and `sync`'s
   * own cursor walk carries it into the engine. The server's
   * `answer-crown-question` comes here wherever a document has an engine.
   */
  answerCrownQuestion(t: number, question: string, outcome: 'accept' | 'reject'): void {
    this.cs.answerCrownQuestion(t, question, outcome);
    this.sync(t);
  }

  /**
   * *Proposal refused by ‹name› 🛡️* — the reason the refused author reads
   * on their sealed record. Composed here because the engine has never
   * heard of a name, and **refuse** because that is the Founder's word:
   * *reject* is the membership's (SURFACE §9).
   */
  private refusalReason(): string {
    const name = this.cs.convenorRecord().name;
    return `Proposal refused by ${name ?? 'the Founder'} 🛡️`;
  }

  /** The parked candidate a text 👑 question is about, or null. */
  private parkedOf(question: string): string | null {
    const q = this.cs.crownQuestionRecords().get(question);
    if (!q || !q.text) return null;
    const id = q.text.candidateId;
    try {
      return this.engine.getCandidate(id).state === 'awaiting-assent' ? id : null;
    } catch {
      return null; // a bridge resumed beside a log that never held it
    }
  }

  /** Withdrawal returns the stake whole on both ledgers (§3.3a). */
  withdrawMotion(t: number, by: MemberId, motion: MotionId): void {
    this.cs.withdrawMotion(t, by, motion);
    const cand = this.candidateOfMotion.get(motion);
    if (cand !== undefined) this.engine.withdraw(t, cand);
    this.sync(t);
  }

  /**
   * A text proposal (stage 8, Q418): a patch against the document as it
   * stands, raced in the engine like any candidate — the footprint finds
   * its race, the stake leaves the engine wallet, adoption rewrites the
   * engine's document. The constitution is not told: it knows the text
   * only as the starting text (§9.7a), and the live text is the engine's.
   * `signed` is the author's per-proposal choice under an elective 👤 rung
   * (Q770); whether the rung offers it is the host's gate, not this door's.
   */
  proposeText(t: number, by: MemberId, patch: PatchSet, why: string, signed = false):
    { id: string; raceId: string } {
    this.sync(t);
    if (this.engine.balance(by, t) < this.engine.constitution.stake) {
      throw new Error('insufficient ✏️ for the stake (§7)');
    }
    const out = this.engine.submitCandidate(t, { author: by, patch, rationale: why, signed });
    this.sync(t);
    return out;
  }

  /** Withdrawing a text proposal: the author's alone, refunded whole (§3.3a). */
  withdrawText(t: number, by: MemberId, candidateId: string): void {
    const c = this.engine.getCandidate(candidateId);
    if (c.author !== by) throw new Error('only the proposer may withdraw it');
    if (c.patch === undefined) throw new Error('that is a motion, not a text proposal');
    this.engine.withdraw(t, candidateId);
    this.sync(t);
  }

  /**
   * The close (SPEC §4.6), engine first then constitution. The engine runs
   * its final batch — text and setting races clearing bar and floor adopt,
   * everything else is recorded *undecided* — and `reportAdoptions` turns
   * those verdicts into the constitution's language (a carried setting
   * motion, a text-shield 👑 question) while the constitution is still
   * open. Then `finishClose` holds every ordinary motion the batch did not
   * carry and closes the constitution, which keeps the constitutional
   * motions, fails the pending 👑 questions closed, and expires the
   * invitations. The two ends meet at one T=0.
   */
  close(t: number): ReturnType<EngineSession['finalRender']> {
    this.sync(t);
    const before = this.engine.log.length;
    this.engine.close(t);
    const closedAt = this.engine.closedAt ?? t;
    this.reportAdoptions(closedAt, this.engine.log.slice(before).map((e) => e.event));
    const render = this.engine.finalRender();
    if (!this.cs.closed) this.finishClose();
    return render;
  }

  /**
   * With the engine already closed: hold every ordinary motion whose
   * candidate did not carry in the final batch (the value stood), relay
   * the ground, and close the constitution at the engine's own T=0.
   */
  private finishClose(): void {
    const at = this.engine.closedAt!;
    const carried = new Set(this.engine.finalRender().appliedSettings.map((a) => a.candidateId));
    for (const [cand, motion] of this.motionOfCandidate) {
      const rec = this.cs.motionRecords().get(motion);
      if (!rec || rec.status !== 'running') continue;
      this.cs.adjudicateOrdinaryMotion(at, motion, carried.has(cand) ? 'carried' : 'held');
    }
    this.sync(at);
    if (!this.cs.closed) this.cs.close(at);
  }

  /** A short, blind summary of an adopted text candidate for the 👑 question. */
  private textSummary(candidateId: string): string {
    const c = this.engine.getCandidate(candidateId);
    const lines = (c.patch?.hunks ?? []).flatMap((h) => h.lines);
    const s = lines.join(' ').trim();
    return s.length > 80 ? `${s.slice(0, 77)}…` : s;
  }

  /**
   * The record the close produces (SPEC §4.6, the shape `record-builder`
   * will render): the final text, what adopted, the backlog of undecided
   * races, the changes carried-but-unassented (the 👑 questions that failed
   * closed), and the signatures. Blind by the same rule as everything
   * else — no standings, no author on a sealed document beyond the
   * anonymity ladder the signatures already obey.
   */
  closeRecord(): {
    closedAt: number | null;
    text: string;
    undecided: Array<{ candidateId: string; raceId: string }>;
    carriedButUnassented: Array<{ candidateId: string; summary: string }>;
    signatures: Array<{ member: MemberId; name: string | null; comment: string; t: number }>;
  } {
    const undecided: Array<{ candidateId: string; raceId: string }> = [];
    const carriedButUnassented: Array<{ candidateId: string; summary: string }> = [];
    for (const e of this.engine.log) {
      if (e.event.type === 'candidate-undecided') {
        undecided.push({ candidateId: e.event.id, raceId: e.event.raceId });
      }
    }
    for (const q of this.cs.crownQuestionRecords().values()) {
      if (q.status === 'failed-closed' && q.text) {
        carriedButUnassented.push({ candidateId: q.text.candidateId, summary: q.text.summary });
      }
    }
    return {
      closedAt: this.cs.closedAt,
      text: this.engine.document(),
      undecided,
      carriedButUnassented,
      signatures: this.cs.closingSignatures(),
    };
  }

  /** What to persist beside the engine log (see BridgeState). */
  state(): BridgeState {
    return {
      cursor: this.cursor,
      motionCandidates: Object.fromEntries(this.candidateOfMotion),
    };
  }

  /**
   * A membership motion is its own one-candidate race against the
   * membership as it stands (§9.7½ v0.56, Q397/Q401a): a synthetic
   * per-member setting, so it can never be raced against anything else.
   */
  private enterMembershipRace(
    t: number,
    motion: MotionId,
    settingId: string,
    standing: { member: boolean },
    proposed: { member: boolean },
    author: MemberId,
    rationale: string,
  ): void {
    if (this.candidateOfMotion.has(motion)) return;
    if (this.engine.standing(settingId) === undefined) {
      this.engine.setStanding(t, settingId, standing);
    }
    const { id } = this.engine.submitCandidate(t, {
      author,
      setting: { settingId, value: proposed },
      rationale,
    });
    this.candidateOfMotion.set(motion, id);
    this.motionOfCandidate.set(id, motion);
  }

  /**
   * An admit motion is its own race (§9.7½ v0.56, Q397): one candidate
   * against the membership as it stands, never another applicant.
   */
  private enterAdmitRace(
    t: number,
    motion: MotionId,
    applicant: string,
    by: MemberId | null,
    why: string | undefined,
  ): void {
    if (this.candidateOfMotion.has(motion)) return;
    const a = this.cs.applicantRecords().get(applicant);
    let author = by;
    let transientVoice = false;
    if (author === null) {
      // `apply`: the application is the applicant's own proposal — a voice
      // for exactly this act, suspended in the same breath (out of E).
      author = applicant;
      if (!this.known.has(applicant)) {
        this.engine.addParticipant(t, { id: applicant, handle: a?.name ?? a?.email ?? applicant });
        this.known.add(applicant);
        transientVoice = true;
      }
    }
    this.enterMembershipRace(t, motion, `admit:${applicant}`,
      { member: false }, { member: true }, author, why ?? a?.words ?? '');
    if (transientVoice) this.engine.suspendParticipant(t, applicant);
  }

  /**
   * A removal under the 🥾 'ordinary' rung is the admit race's mirror
   * (Q401a): one candidate — this member leaves — against the membership
   * as it stands, never raced against anything else.
   */
  private enterRemovalRace(
    t: number,
    motion: MotionId,
    member: string,
    by: MemberId,
    why: string | undefined,
  ): void {
    this.enterMembershipRace(t, motion, `remove:${member}`,
      { member: true }, { member: false }, by, why ?? '');
  }

  /**
   * Relay the constitution's truth into the engine: roster events since
   * the last sync, then a standing diff — cheap, and immune to *which*
   * route changed a value (a carried motion, a crown's direct change, a
   * 👑 acceptance, a constitutional amendment). A changed standing is the
   * ground shift for any race in flight on that setting (§4.4); engine-
   * consumed settings also amend the engine constitution (§9.6/Q328).
   */
  sync(t: number): void {
    const log = this.cs.logEntries();
    for (; this.cursor < log.length; this.cursor++) {
      const e = log[this.cursor]!.event;
      if (this.engine.closed) continue;
      switch (e.type) {
        case 'member-arrived':
        case 'member-admitted': {
          const id = e.member;
          if (!this.known.has(id)) {
            const m = this.cs.memberRecords().get(id);
            this.engine.addParticipant(t, { id, handle: m?.name ?? m?.email ?? id });
            this.known.add(id);
          }
          break;
        }
        case 'motion-opened':
          if (e.payload.kind === 'admit' && e.route === 'ordinary') {
            this.enterAdmitRace(t, e.motion, e.payload.applicant, e.by, e.why);
          } else if (e.payload.kind === 'remove' && e.route === 'ordinary' && e.by) {
            this.enterRemovalRace(t, e.motion, e.payload.member, e.by, e.why);
          }
          break;
        case 'member-removed':
          if (this.known.has(e.member)) this.engine.removeParticipant(t, e.member);
          break;
        case 'member-lapsed':
          if (this.known.has(e.member)) this.engine.suspendParticipant(t, e.member);
          break;
        case 'member-returned':
          if (this.known.has(e.member)) this.engine.resumeParticipant(t, e.member);
          break;
        case 'crown-question-answered':
        case 'crown-question-auto-passed': {
          // 🛡️ on the Text answered (R-056). It lives in the cursor walk
          // rather than in a wrapper for two reasons: the **auto-pass at
          // lapse** is emitted by `cs.tick`, which the bridge never calls,
          // and `bridge.tick` already syncs either side of `engine.tick`,
          // so it lands with no extra wiring; and a replay of the
          // constitution log reaches the same engine state.
          const parked = this.parkedOf(e.question);
          if (parked === null) break; // a motion's question, or already resolved
          const accepted = e.type === 'crown-question-auto-passed' || e.outcome === 'accept';
          if (accepted) this.engine.assent(t, parked, 'accept');
          else this.engine.assent(t, parked, 'refuse', this.refusalReason());
          break;
        }
        case 'crown-failed-closed':
          // Nothing to say to the engine: its own close already recorded the
          // parked candidate *undecided* (§4.6), and `closeRecord` reads the
          // failed question as carried-but-unassented.
          break;
        default:
          break;
      }
    }
    if (this.engine.closed) return;
    const changes: ConstitutionAmendment = {};
    for (const entry of CATALOGUE) {
      if (entry.kind === 'personal' || UNRACED.has(entry.id)) continue;
      const st = this.cs.settingState(entry.id);
      if (st.value === null) continue;
      const current = this.engine.standing(entry.id);
      if (
        current !== undefined &&
        stableStringify(current) === stableStringify(st.value)
      ) {
        continue;
      }
      this.engine.setStanding(t, entry.id, st.value);
      Object.assign(changes, engineFieldsFor(entry.id, st.value, t));
    }
    // 🛡️ on the Text is not a standing value — the Text carries none — so it
    // rides the same amendment as a fact about the mechanism (R-056). It is
    // `textAdoptionNeedsAssent()` and not the raw power, because a lapsed
    // crown grants by itself (§9.7 v0.49): the engine must see the shield
    // *down* while the crown sleeps, which is what makes lapse auto-passing
    // fall out of the mechanism rather than needing a second rule.
    const owed = this.cs.textAdoptionNeedsAssent();
    if (owed !== (this.engine.constitution.textAssent ?? false)) changes.textAssent = owed;
    if (Object.keys(changes).length > 0) this.engine.amend(t, changes);
  }
}
