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
import type { ConstitutionAmendment, LogEntry as EngineLogEntry } from '../../engine-core/src/types.js';
import type { Outcome } from '../../engine-core/src/ranking/types.js';
import { stableStringify } from './hash.js';
import { CATALOGUE, entryOf, motionRouteOf } from './catalogue.js';
import type { SettingId } from './catalogue.js';
import type { ConstitutionSession } from './session.js';
import { inE } from './populations.js';
import { DEFAULT_TUNING, toEngineConstitution, type EngineTuning } from './adapter.js';
import type { MemberId, MotionId } from './types.js';
import type { SettingValue } from './values.js';

/** Settings that never carry a raceable standing value. */
const UNRACED: ReadonlySet<string> = new Set(['membership', 'startingText']);

/** The engine constitution fields a settled value implies (§9.6/Q328). */
function engineChangesFor(
  id: SettingId,
  value: SettingValue,
  t: number,
): ConstitutionAmendment {
  switch (id) {
    case 'bar':
      return { adoptionThresholdEnd: (value as { pct: number }).pct / 100 };
    case 'ending': {
      const ends = (value as { endsAtMs: number | null }).endsAtMs;
      // Perpetual: a zero-span window from here pins the ramp at its end
      // value — the fixed bar §9.0 requires, same convention as the adapter.
      return { windowEndMs: ends ?? t };
    }
    case 'quorum': {
      const q = value as { form: 'count' | 'share'; n: number };
      return { quorum: { form: q.form, n: q.n } };
    }
    case 'rate': {
      const r = value as { grant: number; cap: number; dripMinutes: number };
      return { tokenGrant: r.grant, tokenCap: r.cap, tokenDripMinutes: r.dripMinutes };
    }
    case 'authorship':
      return {
        authorshipVisibility: (value as { rung: string }).rung as
          'public' | 'sealed' | 'anonymous',
      };
    default:
      return {};
  }
}

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
    const route =
      standing === null
        ? 'constitutional'
        : motionRouteOf(entryOf(setting), value, standing);
    if (
      route === 'ordinary' &&
      this.engine.balance(by, t) < this.engine.constitution.stake
    ) {
      throw new Error('insufficient ✏️ for the stake (§7)');
    }
    const motion = this.cs.openMotion(t, by, { kind: 'set', setting, value }, why);
    const rec = this.cs.motionRecords().get(motion)!;
    if (rec.route !== 'ordinary') return { motion, route: rec.route };
    const { id } = this.engine.submitCandidate(t, {
      author: by,
      setting: { settingId: setting, value },
      rationale: why ?? '',
    });
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
    const events = this.engine.judge(t, who, aId, bId, outcome);
    for (const e of events) {
      if (e.type !== 'adopted') continue;
      const motion = this.motionOfCandidate.get(e.candidateId);
      if (motion === undefined) continue; // a text race adopting
      this.cs.adjudicateOrdinaryMotion(t, motion, 'carried');
    }
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
    for (const e of this.engine.tick(t)) {
      if (e.type !== 'adopted') continue;
      const motion = this.motionOfCandidate.get(e.candidateId);
      if (motion === undefined) continue; // a text race adopting
      this.cs.adjudicateOrdinaryMotion(t, motion, 'carried');
    }
    this.sync(t); // relay what carried (the ground shift)
  }

  /** A second stakes the ✏️ (§9.7½): priced at the door like any entry. */
  proposeApplicant(t: number, by: MemberId, applicant: string, why?: string): void {
    this.sync(t);
    if (this.engine.balance(by, t) < this.engine.constitution.stake) {
      throw new Error('insufficient ✏️ for the stake (§7)');
    }
    this.cs.proposeApplicant(t, by, applicant, why);
    this.sync(t);
  }

  /** Withdrawal returns the stake whole on both ledgers (§3.3a). */
  withdrawMotion(t: number, by: MemberId, motion: MotionId): void {
    this.cs.withdrawMotion(t, by, motion);
    const cand = this.candidateOfMotion.get(motion);
    if (cand !== undefined) this.engine.withdraw(t, cand);
    this.sync(t);
  }

  /**
   * The close: setting races whose leader clears bar and floor carry;
   * every other raced motion is held (the value stood).
   */
  close(t: number): ReturnType<EngineSession['finalRender']> {
    this.sync(t);
    this.engine.close(t);
    const render = this.engine.finalRender();
    const carried = new Set(render.appliedSettings.map((a) => a.candidateId));
    for (const [cand, motion] of this.motionOfCandidate) {
      const rec = this.cs.motionRecords().get(motion)!;
      if (rec.status !== 'running') continue;
      this.cs.adjudicateOrdinaryMotion(t, motion, carried.has(cand) ? 'carried' : 'held');
    }
    return render;
  }

  /** What to persist beside the engine log (see BridgeState). */
  state(): BridgeState {
    return {
      cursor: this.cursor,
      motionCandidates: Object.fromEntries(this.candidateOfMotion),
    };
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
    const settingId = `admit:${applicant}`;
    if (this.engine.standing(settingId) === undefined) {
      this.engine.setStanding(t, settingId, { member: false });
    }
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
    const { id } = this.engine.submitCandidate(t, {
      author,
      setting: { settingId, value: { member: true } },
      rationale: why ?? a?.words ?? '',
    });
    if (transientVoice) this.engine.suspendParticipant(t, applicant);
    this.candidateOfMotion.set(motion, id);
    this.motionOfCandidate.set(id, motion);
  }

  /**
   * A removal under the 🚪 'ordinary' rung is the admit race's mirror
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
    if (this.candidateOfMotion.has(motion)) return;
    const settingId = `remove:${member}`;
    if (this.engine.standing(settingId) === undefined) {
      this.engine.setStanding(t, settingId, { member: true });
    }
    const { id } = this.engine.submitCandidate(t, {
      author: by,
      setting: { settingId, value: { member: false } },
      rationale: why ?? '',
    });
    this.candidateOfMotion.set(motion, id);
    this.motionOfCandidate.set(id, motion);
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
      Object.assign(changes, engineChangesFor(entry.id, st.value, t));
    }
    if (Object.keys(changes).length > 0) this.engine.amend(t, changes);
  }
}
