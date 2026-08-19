/**
 * The session: an event-sourced, deterministic state machine over the
 * hash-chained log (SPEC §§1–4, 7–9, 11).
 *
 * Commands take caller-supplied timestamps (monotonic, ms); events are
 * appended to the log; all state is a fold over events. Replaying a log
 * reproduces the session exactly, including every routing decision.
 */

import type {
  Candidate,
  Card,
  Constitution,
  ConstitutionAmendment,
  Event,
  LogEntry,
  PairKind,
  Participant,
  RaceView,
} from './types.js';
import type { Hunk, PatchSet, Span } from './text/types.js';
import type { Comparison, Fit, Outcome } from './ranking/types.js';
import { applyPatch, footprint, footprintsConflict, validateHunks } from './text/patch.js';
import { splitLines, joinLines } from './text/diff.js';
import { rebaseHunks } from './text/rebase.js';
import { fitDavidson } from './ranking/davidson.js';
import { chainHash, sha256Hex, stableStringify } from './hash.js';
import { makeRng, type Rng } from './rng.js';
import { adoptionThreshold, smoothstep } from './adoption-threshold.js';
import {
  balanceAt,
  credit,
  dripIntervalMs,
  materialize,
  openLedger,
  performanceRefund,
  rephaseDrip,
  spend,
  type Ledger,
} from './tokens.js';

export interface OpenInput {
  text: string;
  roster: Participant[];
  constitution: Constitution;
  /** Initial standing values for settings (SPEC §9.6, Q390) — see types.ts. */
  settings?: Record<string, unknown>;
}

export const DEFAULT_CONSTITUTION: Omit<
  Constitution,
  'windowStartMs' | 'windowEndMs' | 'rngSeed'
> = {
  adoptionThresholdStart: 0.6,
  adoptionThresholdEnd: 0.95,
  adoptionFloorMax: 12,
  quorum: null,
  deadlockMinComparisons: 20,
  deadlockEpsilon: 0.02,
  cooldownMs: 5 * 60 * 1000,
  redraftLimit: 2,
  tokenGrant: 4,
  tokenDripMinutes: 240,
  tokenCap: 8,
  stake: 1,
  rationaleMaxChars: 300,
  boutGapMs: 90 * 1000,
  // 3, not 6: calibration sweep 2026-08-13 — at small-roster scale, depth
  // of evidence per race beats breadth of coverage (SPEC §8.3).
  hotSetSize: 3,
  explorationEvery: 7,
  salienceEvery: 10,
  authorshipVisibility: 'sealed',
  // Rival-pair gate (SPEC §8.3, Q48): a challenger shows displacement
  // evidence when P(beats incumbent) > 0.5 on >= 3 incumbent-involving
  // comparisons. 0.5 because probBeats' no-data prior is exactly 0.5:
  // the gate opens on the first posterior that actually favors a
  // challenger, and the minimum-evidence clause keeps prior noise from
  // opening it.
  rivalGateProb: 0.5,
  rivalGateMinComparisons: 3,
  // Ground-shift re-serving (SPEC §4.4, Q50): re-opened races are
  // near-adoption by construction, so they outrank equal-salience
  // unstarted races until re-measured.
  reopenedBoost: 1.5,
};

export function makeConstitution(
  overrides: Partial<Constitution> &
    Pick<Constitution, 'windowStartMs' | 'windowEndMs' | 'rngSeed'>,
): Constitution {
  return { ...DEFAULT_CONSTITUTION, ...overrides };
}

interface StoredComparison {
  seq: number;
  t: number;
  participantId: string;
  aId: string;
  bId: string;
  kind: PairKind;
  outcome: Outcome;
  /**
   * The race's ground when the judgment was cast (SPEC §4.4, Q50): its
   * incumbent pseudo-id, a content hash of the contested spans. Derived
   * in the fold, so replay reproduces it. Edge comparisons feed the live
   * posterior only while this matches the race's current incumbent id —
   * a material ground shift (adoption within the race, or a rebase that
   * alters the contested text) changes the id and locks every judgment
   * cast on the old ground, rival-vs-rival pairs included. Context
   * drift (same words, new position) leaves the hash unchanged and
   * locks nothing. Null for diagonals: salience judgments rank the
   * questions in dispute, which a ground shift does not change.
   */
  groundId: string | null;
  /**
   * Not in the log: the author's standing preference for their own live
   * candidate, derived against the current incumbent (SPEC §3.3, Q245(b)).
   *
   * The distinction it carries is **preference versus measurement**. A derived
   * preference is a real preference — it feeds the ranking and counts toward
   * the floor, which is what "an author is a voice" means (§8.2). It is not
   * evidence *about* anything: no sampling effort was spent on it and its
   * answer was known in advance. So everything asking "what does the room
   * prefer, and how many voices are in?" counts it, and everything asking
   * "have we measured this enough?" — the deadlock test, the rival-pair gate,
   * the performance a refund pays on — does not.
   */
  derived?: true;
}

/** A judgment as the record sees it, with derived supersession/locking. */
export interface JudgmentView {
  seq: number;
  t: number;
  participantId: string;
  aId: string;
  bId: string;
  kind: PairKind;
  outcome: Outcome;
  /** A later judgment by the same participant on the same pair and ground supersedes this one. */
  superseded: boolean;
  /** Locked judgments stay in the log and record but no longer feed the live posterior and cannot be revised (SPEC §4.4). */
  locked: boolean;
}

interface RosterEntry {
  participant: Participant;
  removed: boolean;
  /** Lapsed (SPEC §9.5a): out of E, cannot act, judgments cast stand. */
  suspended: boolean;
  ledger: Ledger;
  /** Response-time samples within bouts, for c_p (SPEC §8.1). */
  latencies: number[];
  lastActionT: number | null;
}

const INC_PREFIX = 'inc:';

function candidateNum(id: string): number {
  return Number(id.slice(1));
}

export class Session {
  readonly log: LogEntry[] = [];
  private constitutionValue!: Constitution;
  private versions: string[][] = [];
  private roster = new Map<string, RosterEntry>();
  private candidates = new Map<string, Candidate>();
  private supporters = new Map<string, Set<string>>();
  private comparisons: StoredComparison[] = [];
  /**
   * Contextual pair keys already judged, per participant (feed
   * exclusion only — revision stays open, SPEC §4.4). Edge keys carry
   * the ground id, so a ground shift re-opens the pair to everyone,
   * including participants who judged the old ground.
   */
  private judgedPairs = new Map<string, Set<string>>();
  /** Comparisons at seq < evidenceSince[id] are dead for candidate id (SPEC §2.4). */
  private evidenceSince = new Map<string, number>();
  private edgeCount = 0;
  private lastAdoptionT: number | null = null;
  private closedFlag = false;
  private lastT = -Infinity;
  private candidateCounter = 0;
  /**
   * The threshold ramp's current anchor (SPEC §4.3): where the live
   * segment starts. Re-anchored by amendments to the close or the
   * ceiling — keep the current value, ride to the ceiling over the new
   * remainder — so a bar never jumps because timings changed.
   */
  private thresholdAnchor!: { t: number; value: number };
  /** Standing values for settings (SPEC §9.6, Q390): opaque, hash-only. */
  private settingsMap = new Map<string, unknown>();
  private fitCache = new Map<string, { key: string; fit: Fit }>();

  private constructor() {}

  // -------------------------------------------------------------------------
  // Opening

  static open(input: OpenInput, t: number): Session {
    const s = new Session();
    if (input.roster.length === 0) throw new Error('roster must not be empty');
    const ids = new Set(input.roster.map((p) => p.id));
    if (ids.size !== input.roster.length) throw new Error('duplicate participant ids');
    s.emit({
      type: 'opened',
      t,
      constitution: input.constitution,
      text: input.text.replace(/\r\n?/g, '\n'),
      roster: input.roster,
      ...(input.settings ? { settings: input.settings } : {}),
    });
    return s;
  }

  /** Rebuild a session by replaying a log (verifies the hash chain). */
  static replay(log: LogEntry[]): Session {
    const s = new Session();
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

  private emit(event: Event): void {
    const prevHash = this.log.length > 0 ? this.log[this.log.length - 1]!.hash : '';
    const seq = this.log.length;
    const hash = chainHash(prevHash, event);
    this.log.push({ seq, hash, prevHash, event });
    this.apply(event, seq);
  }

  private apply(event: Event, seq: number): void {
    if (event.t < this.lastT) throw new Error('timestamps must be non-decreasing');
    this.lastT = event.t;
    switch (event.type) {
      case 'opened': {
        this.constitutionValue = event.constitution;
        this.thresholdAnchor = {
          t: event.constitution.windowStartMs,
          value: event.constitution.adoptionThresholdStart,
        };
        if (event.settings) {
          for (const [k, v] of Object.entries(event.settings)) this.settingsMap.set(k, v);
        }
        this.versions = [splitLines(event.text)];
        for (const p of event.roster) {
          this.roster.set(p.id, {
            participant: p,
            removed: false,
            suspended: false,
            ledger: openLedger(event.constitution, event.t),
            latencies: [],
            lastActionT: null,
          });
        }
        break;
      }
      case 'participant-added': {
        this.roster.set(event.participant.id, {
          participant: event.participant,
          removed: false,
          suspended: false,
          ledger: openLedger(this.constitutionValue, event.t),
          latencies: [],
          lastActionT: null,
        });
        break;
      }
      case 'participant-removed': {
        const entry = this.roster.get(event.participantId);
        if (entry) entry.removed = true;
        break;
      }
      case 'participant-suspended': {
        const entry = this.roster.get(event.participantId);
        if (entry) entry.suspended = true;
        break;
      }
      case 'participant-resumed': {
        const entry = this.roster.get(event.participantId);
        if (entry) entry.suspended = false;
        break;
      }
      case 'candidate-submitted': {
        this.candidates.set(event.id, {
          id: event.id,
          author: event.author,
          rationale: event.rationale,
          ...(event.patch
            ? { patch: event.patch, footprint: footprint(event.patch.hunks) }
            : { footprint: [] }),
          ...(event.setting ? { setting: event.setting } : {}),
          state: 'live',
          stakePaid: this.constitutionValue.stake,
          peakW: 0,
          redrafts: 0,
          ...(event.machineAuthored ? { machineAuthored: true } : {}),
        });
        this.supporters.set(event.id, new Set([event.author]));
        spend(
          this.rosterEntry(event.author).ledger,
          this.constitutionValue,
          event.t,
          this.constitutionValue.stake,
        );
        this.touchParticipant(event.author, event.t);
        break;
      }
      case 'comparison': {
        // The ground the judgment was cast against (SPEC §4.4, Q50) —
        // derived here, in the fold, so replay reproduces it exactly.
        // Computed before the push: race membership and incumbent ids
        // do not depend on comparisons.
        const groundId = event.kind === 'edge' ? this.groundOfPair(event.aId, event.bId) : null;
        this.comparisons.push({
          seq,
          t: event.t,
          participantId: event.participantId,
          aId: event.aId,
          bId: event.bId,
          kind: event.kind,
          outcome: event.outcome,
          groundId,
        });
        this.markJudged(
          this.judgedPairs,
          event.participantId,
          contextKey(event.aId, event.bId, groundId),
        );
        if (event.kind === 'edge') this.edgeCount++;
        this.touchParticipant(event.participantId, event.t);
        // peakW moves here, in the fold, not in the command layer: refunds
        // are computed from it at adoption, so replaying the log must
        // reproduce it exactly or ledgers drift (a real bug, once).
        if (event.kind === 'edge') {
          const candidateId = !event.aId.startsWith(INC_PREFIX)
            ? event.aId
            : !event.bId.startsWith(INC_PREFIX)
              ? event.bId
              : null;
          if (candidateId !== null) {
            const race = this.races().find((r) => r.members.includes(candidateId));
            if (race) this.updatePeaks(race);
          }
        }
        break;
      }
      case 'composer-opened': {
        // No forfeit since SPEC v0.16: drafting against a race still being
        // judged shows the text and nothing else (§3.5), so there is no peek
        // left to price, and the drafter still judges the pair they were
        // asked about.
        this.touchParticipant(event.participantId, event.t);
        break;
      }
      case 'candidate-withdrawn': {
        this.exitCandidate(event.id, 'withdrawn', event.t, 'withdrawn', event.refund);
        break;
      }
      case 'candidate-retired': {
        this.exitCandidate(event.id, 'retired', event.t, 'retired', event.refund);
        break;
      }
      case 'co-signed': {
        this.supporters.get(event.candidateId)?.add(event.byParticipant);
        if (event.withdrewCandidateId) {
          this.exitCandidate(
            event.withdrewCandidateId,
            'merged',
            event.t,
            `co-signed ${event.candidateId}`,
            event.refund,
          );
        }
        this.touchParticipant(event.byParticipant, event.t);
        break;
      }
      case 'adopted': {
        const winner = this.candidate(event.candidateId);
        if (winner.patch) {
          // A text adoption changes the document. A setting adoption is
          // the room's verdict only: the value is applied by the host via
          // standing-set once any §9.7 assent is given (Q390), which is
          // what lets rivals keep racing against the old standing while
          // assent is pending.
          this.versions.push(applyPatch(this.currentLines(), winner.patch.hunks));
        }
        winner.state = 'adopted';
        const refund = performanceRefund(winner.stakePaid, winner.peakW);
        winner.exit = { t: event.t, cause: 'adopted', refund };
        const author = this.roster.get(winner.author);
        if (author) credit(author.ledger, this.constitutionValue, event.t, refund);
        this.lastAdoptionT = event.t;
        this.fitCache.clear();
        break;
      }
      case 'candidate-rebased': {
        const c = this.candidate(event.id);
        c.patch = event.patch;
        c.footprint = footprint(event.patch.hunks);
        break;
      }
      case 'rebase-failed': {
        const c = this.candidate(event.id);
        c.state = 'rebase-pending';
        break;
      }
      case 'candidate-confirmed': {
        const c = this.candidate(event.id);
        c.state = 'live';
        c.patch = event.patch;
        c.footprint = footprint(event.patch.hunks);
        // Evidence resets: pre-confirmation comparisons no longer speak
        // for this candidate (SPEC §2.4).
        this.evidenceSince.set(event.id, seq);
        this.fitCache.clear();
        break;
      }
      case 'constitution-amended': {
        const changes = event.changes;
        // Drip re-phase first, under the old interval (§7): ticks accrued
        // stand, the next lands one new interval after the amendment.
        if (changes.tokenDripMinutes !== undefined) {
          for (const entry of this.roster.values()) {
            materialize(entry.ledger, this.constitutionValue, event.t);
            rephaseDrip(entry.ledger, event.t, changes.tokenDripMinutes * 60_000);
          }
        }
        // The bar as it stands at this moment, before the merge —
        // re-anchoring keeps it (§4.3: a bar never jumps because timings
        // changed; a new ceiling is glided to, in either direction).
        const barBefore = this.adoptionThreshold(event.t);
        this.constitutionValue = { ...this.constitutionValue, ...changes };
        if (changes.windowEndMs !== undefined || changes.adoptionThresholdEnd !== undefined) {
          this.thresholdAnchor = { t: event.t, value: barBefore };
        }
        break;
      }
      case 'standing-set': {
        // For a setting race in flight this is the ground shift (§4.4):
        // the race's incumbent id hashes this value, so judgments cast
        // against the old standing lock and pairs re-open fresh.
        this.settingsMap.set(event.settingId, event.value);
        this.fitCache.clear();
        break;
      }
      case 'closed': {
        this.closedFlag = true;
        break;
      }
    }
  }

  private exitCandidate(
    id: string,
    state: Candidate['state'],
    t: number,
    cause: string,
    refund: number,
  ): void {
    const c = this.candidate(id);
    c.state = state;
    c.exit = { t, cause, refund };
    const author = this.roster.get(c.author);
    if (author && refund > 0) credit(author.ledger, this.constitutionValue, t, refund);
    this.fitCache.clear();
  }

  private touchParticipant(id: string, t: number): void {
    const entry = this.roster.get(id);
    if (!entry) return;
    if (entry.lastActionT !== null) {
      const gap = t - entry.lastActionT;
      if (gap > 0 && gap <= this.constitutionValue.boutGapMs) entry.latencies.push(gap);
    }
    entry.lastActionT = t;
  }

  private markJudged(
    map: Map<string, Set<string>>,
    participantId: string,
    key: string,
  ): void {
    let set = map.get(participantId);
    if (!set) {
      set = new Set();
      map.set(participantId, set);
    }
    set.add(key);
  }

  /**
   * The ground a pair is judged on: the incumbent id of the race that
   * contains its candidate endpoint(s), or null for cross-race
   * (diagonal) and unresolvable pairs.
   */
  private groundOfPair(aId: string, bId: string): string | null {
    const aInc = aId.startsWith(INC_PREFIX);
    const bInc = bId.startsWith(INC_PREFIX);
    if (aInc && bInc) return null;
    if (!aInc && !bInc) {
      const ra = this.raceIdOfEndpoint(aId);
      const rb = this.raceIdOfEndpoint(bId);
      if (ra === null || rb === null || ra !== rb) return null; // diagonal or dead
    }
    const candId = aInc ? bId : aId;
    const race = this.races().find((r) => r.members.includes(candId));
    return race ? race.incumbentId : null;
  }

  /** Feed exclusion: already judged on this ground (revisable, SPEC §4.4). */
  private servedOut(participantId: string, key: string): boolean {
    return this.judgedPairs.get(participantId)?.has(key) ?? false;
  }

  // -------------------------------------------------------------------------
  // Guards and small accessors

  get constitution(): Constitution {
    return this.constitutionValue;
  }

  get closed(): boolean {
    return this.closedFlag;
  }

  get totalEdgeComparisons(): number {
    return this.edgeCount;
  }

  private assertOpen(): void {
    if (this.closedFlag) throw new Error('session is closed');
    if (this.log.length === 0) throw new Error('session not opened');
  }

  private rosterEntry(id: string): RosterEntry {
    const entry = this.roster.get(id);
    if (!entry) throw new Error(`unknown participant ${id}`);
    return entry;
  }

  private activeParticipant(id: string): RosterEntry {
    const entry = this.rosterEntry(id);
    if (entry.removed) throw new Error(`participant ${id} was removed`);
    if (entry.suspended) {
      throw new Error(`participant ${id} is suspended (lapsed, §9.5a) — resume first`);
    }
    return entry;
  }

  private candidate(id: string): Candidate {
    const c = this.candidates.get(id);
    if (!c) throw new Error(`unknown candidate ${id}`);
    return c;
  }

  currentVersion(): number {
    return this.versions.length - 1;
  }

  private currentLines(): string[] {
    return this.versions[this.versions.length - 1]!;
  }

  document(): string {
    return joinLines(this.currentLines());
  }

  documentAt(version: number): string {
    const lines = this.versions[version];
    if (!lines) throw new Error(`unknown version ${version}`);
    return joinLines(lines);
  }

  /**
   * The adoption threshold at time t (SPEC §4.3, session clock). Defaults
   * to the time of the last event, which keeps log replays and post-close
   * queries exact; live callers should pass their current time. Anchor-
   * based since 367b: amendments to the close or the ceiling re-anchor
   * the ramp at its current value (never a jump), so the plain pure
   * function only matches while no amendment has landed.
   */
  adoptionThreshold(t: number = this.lastT): number {
    const { adoptionThresholdEnd, windowEndMs } = this.constitutionValue;
    const a = this.thresholdAnchor;
    const span = windowEndMs - a.t;
    const x = span <= 0 ? 1 : (t - a.t) / span;
    return a.value + (adoptionThresholdEnd - a.value) * smoothstep(x);
  }

  /**
   * F = max(Q, min(ceil(E/3), F_max)) — SPEC §4.2: the room's quorum
   * riding on the statistical minimum. A share-quorum is re-derived from
   * current E on every call, so it tracks the roster (§9.3).
   */
  adoptionFloor(): number {
    const e = this.eCount();
    const q = this.constitutionValue.quorum;
    const quorumN =
      q === null ? 0 : q.form === 'count' ? q.n : Math.ceil((q.n / 100) * e);
    return Math.max(quorumN, Math.min(Math.ceil(e / 3), this.constitutionValue.adoptionFloorMax));
  }

  /** E (SPEC §8.2): arrived, non-removed, non-lapsed — engine-side. */
  private eCount(): number {
    return [...this.roster.values()].filter((r) => !r.removed && !r.suspended).length;
  }

  balance(participantId: string, t: number): number {
    return balanceAt(this.rosterEntry(participantId).ledger, this.constitutionValue, t);
  }

  getCandidate(id: string): Readonly<Candidate> {
    return this.candidate(id);
  }

  allCandidates(): ReadonlyArray<Readonly<Candidate>> {
    return [...this.candidates.values()];
  }

  supportersOf(id: string): ReadonlySet<string> {
    return this.supporters.get(id) ?? new Set();
  }

  /**
   * Every judgment ever cast, with derived supersession and locking
   * (SPEC §4.4, Q50) — the record keeps all. A judgment is superseded
   * when the same participant judged the same pair on the same ground
   * later; it is locked when its question ended: the session closed, an
   * endpoint left play, or the race's ground materially shifted.
   */
  judgments(): JudgmentView[] {
    const races = this.races();
    const raceOfMember = new Map<string, RaceView>();
    for (const r of races) for (const m of r.members) raceOfMember.set(m, r);
    // Latest seq per (participant, pair, ground): everything earlier is
    // superseded.
    const latestSeq = new Map<string, number>();
    for (const c of this.comparisons) {
      latestSeq.set(
        `${c.participantId}|${contextKey(c.aId, c.bId, c.groundId)}`,
        c.seq,
      );
    }
    return this.comparisons.map((c) => {
      const superseded =
        latestSeq.get(`${c.participantId}|${contextKey(c.aId, c.bId, c.groundId)}`) !== c.seq;
      let locked = this.closedFlag;
      if (!locked && c.kind === 'edge') {
        const candidates = [c.aId, c.bId].filter((id) => !id.startsWith(INC_PREFIX));
        const race = candidates.length > 0 ? raceOfMember.get(candidates[0]!) : undefined;
        locked =
          race === undefined ||
          race.incumbentId !== c.groundId ||
          candidates.some((id) => {
            if (!race.members.includes(id)) return true;
            const since = this.evidenceSince.get(id);
            return since !== undefined && c.seq < since;
          });
      } else if (!locked) {
        // Diagonals lock only when an endpoint's question left play.
        locked = [c.aId, c.bId].some((id) => !raceOfMember.has(id));
      }
      return {
        seq: c.seq,
        t: c.t,
        participantId: c.participantId,
        aId: c.aId,
        bId: c.bId,
        kind: c.kind,
        outcome: c.outcome,
        superseded,
        locked,
      };
    });
  }

  // -------------------------------------------------------------------------
  // Commands

  addParticipant(t: number, participant: Participant): void {
    this.assertOpen();
    if (this.roster.has(participant.id)) throw new Error('participant id already exists');
    this.emit({ type: 'participant-added', t, participant });
  }

  removeParticipant(t: number, participantId: string): void {
    this.assertOpen();
    const entry = this.rosterEntry(participantId);
    if (entry.removed) throw new Error(`participant ${participantId} was removed`);
    this.emit({ type: 'participant-removed', t, participantId });
  }

  /** Lapse (SPEC §9.5a): out of E, still counted where already cast. */
  suspendParticipant(t: number, participantId: string): void {
    this.assertOpen();
    const entry = this.rosterEntry(participantId);
    if (entry.removed) throw new Error(`participant ${participantId} was removed`);
    if (entry.suspended) return;
    this.emit({ type: 'participant-suspended', t, participantId });
  }

  /** Revival (SPEC §9.5a): just logging in — any authenticated act. */
  resumeParticipant(t: number, participantId: string): void {
    this.assertOpen();
    const entry = this.rosterEntry(participantId);
    if (entry.removed) throw new Error(`participant ${participantId} was removed`);
    if (!entry.suspended) return;
    this.emit({ type: 'participant-resumed', t, participantId });
  }

  submitCandidate(
    t: number,
    input: {
      author: string;
      rationale: string;
      machineAuthored?: boolean;
      /** A text proposal (SPEC §2.1) — exactly one of patch/setting. */
      patch?: PatchSet;
      /** An ordinary motion's proposed value (SPEC §9.6, Q390). */
      setting?: { settingId: string; value: unknown };
    },
  ): { id: string; raceId: string } {
    this.assertOpen();
    const entry = this.activeParticipant(input.author);
    if ((input.patch === undefined) === (input.setting === undefined)) {
      throw new Error('a candidate is a patch or a setting value — exactly one');
    }
    if (input.rationale.length > this.constitutionValue.rationaleMaxChars) {
      throw new Error(
        `rationale exceeds ${this.constitutionValue.rationaleMaxChars} chars`,
      );
    }
    if (input.patch) {
      if (input.patch.baseVersion !== this.currentVersion()) {
        throw new Error(
          `patch targets version ${input.patch.baseVersion}; current is ${this.currentVersion()}`,
        );
      }
      if (input.patch.hunks.length === 0) throw new Error('empty patch');
      validateHunks(this.currentLines().length, input.patch.hunks);
    } else if (input.setting) {
      // Q390: values are simpler than prose in exactly one way — equality
      // is decidable — so §5's dedup gate collapses to it (SPEC v0.53).
      if (!this.settingsMap.has(input.setting.settingId)) {
        throw new Error(
          `unknown setting '${input.setting.settingId}' — set its standing first`,
        );
      }
      const proposed = stableStringify(input.setting.value);
      if (proposed === stableStringify(this.settingsMap.get(input.setting.settingId))) {
        throw new Error('proposes what already stands (§9.6)');
      }
      for (const c of this.candidates.values()) {
        if (
          c.state === 'live' &&
          c.setting?.settingId === input.setting.settingId &&
          stableStringify(c.setting.value) === proposed
        ) {
          throw new Error(`an identical value is already live (${c.id}) — co-sign it (§5)`);
        }
      }
    }
    if (balanceAt(entry.ledger, this.constitutionValue, t) < this.constitutionValue.stake) {
      throw new Error('insufficient tokens for stake');
    }
    const id = `c${++this.candidateCounter}`;
    this.emit({
      type: 'candidate-submitted',
      t,
      id,
      author: input.author,
      ...(input.patch ? { patch: input.patch } : {}),
      ...(input.setting ? { setting: input.setting } : {}),
      rationale: input.rationale,
      ...(input.machineAuthored ? { machineAuthored: true } : {}),
    });
    this.fitCache.clear();
    const race = this.raceOf(id);
    return { id, raceId: race.id };
  }

  /**
   * The move (SPEC §3.1): judge a pair. Sides are candidate ids, or the
   * race's current incumbent pseudo-id (from the served card).
   * Returns the events the move caused (comparison, possibly adoption
   * and its rebase fallout).
   *
   * Judging a pair this participant already judged on the same ground
   * is a revision (SPEC §4.4, Q50): the new judgment supersedes the
   * old, which stays in the log. Locked judgments (sealed race, shifted
   * ground) cannot be revised — their pair is either gone or, after a
   * ground shift, a fresh question served anew.
   */
  judge(
    t: number,
    participantId: string,
    aId: string,
    bId: string,
    outcome: Outcome,
  ): Event[] {
    this.assertOpen();
    this.activeParticipant(participantId);
    if (aId === bId) throw new Error('cannot judge an id against itself');
    const before = this.log.length;
    const kind = this.classifyPair(aId, bId);
    this.emit({ type: 'comparison', t, participantId, aId, bId, kind, outcome });
    this.fitCache.clear();
    if (kind === 'edge') {
      // peakW was already updated by apply(); only adoption (which emits
      // new events and so must never run during replay) stays here. The
      // sweep is field-wide (Ed, 2026-08-19): a judgment anywhere can
      // release a batch another race was waiting on.
      this.sweepAdoptions(t);
    }
    return this.log.slice(before).map((e) => e.event);
  }

  /**
   * Propose C. Since SPEC v0.16 this costs no comparison: the forfeit priced
   * a peek at mid-flight state, and §3.5 now withholds the briefing from any
   * race still in the judgment stream, so there is nothing left to price.
   */
  openComposer(t: number, participantId: string): void {
    this.assertOpen();
    this.activeParticipant(participantId);
    this.emit({ type: 'composer-opened', t, participantId });
  }

  withdraw(t: number, candidateId: string): void {
    this.assertOpen();
    const c = this.candidate(candidateId);
    if (c.state !== 'live' && c.state !== 'rebase-pending') {
      throw new Error(`candidate ${candidateId} is not in play (${c.state})`);
    }
    // Withdrawals refund fully (SPEC §7).
    this.emit({ type: 'candidate-withdrawn', t, id: candidateId, refund: c.stakePaid });
  }

  retire(t: number, candidateId: string): void {
    this.assertOpen();
    const c = this.candidate(candidateId);
    if (c.state !== 'live') throw new Error(`candidate ${candidateId} is not live`);
    this.emit({
      type: 'candidate-retired',
      t,
      id: candidateId,
      refund: performanceRefund(c.stakePaid, c.peakW),
    });
  }

  coSign(
    t: number,
    participantId: string,
    candidateId: string,
    withdrawOwnCandidateId?: string,
  ): void {
    this.assertOpen();
    this.activeParticipant(participantId);
    const target = this.candidate(candidateId);
    if (target.state !== 'live') throw new Error('can only co-sign a live candidate');
    let refund = 0;
    if (withdrawOwnCandidateId) {
      const own = this.candidate(withdrawOwnCandidateId);
      if (own.author !== participantId) throw new Error('can only fold in your own candidate');
      if (own.state !== 'live') throw new Error('own candidate is not live');
      refund = own.stakePaid; // co-signs refund fully (SPEC §7)
    }
    this.emit({
      type: 'co-signed',
      t,
      candidateId,
      byParticipant: participantId,
      ...(withdrawOwnCandidateId ? { withdrewCandidateId: withdrawOwnCandidateId } : {}),
      refund,
    });
  }

  /**
   * After a failed rebase the author confirms (or revises) against the
   * new text; evidence resets (SPEC §2.4).
   */
  confirmRebase(t: number, candidateId: string, patch: PatchSet): void {
    this.assertOpen();
    const c = this.candidate(candidateId);
    if (c.state !== 'rebase-pending') {
      throw new Error(`candidate ${candidateId} is not awaiting confirmation`);
    }
    if (patch.baseVersion !== this.currentVersion()) {
      throw new Error('confirmation must target the current version');
    }
    if (patch.hunks.length === 0) throw new Error('empty patch');
    validateHunks(this.currentLines().length, patch.hunks);
    this.emit({ type: 'candidate-confirmed', t, id: candidateId, patch });
  }

  /**
   * A carried amendment lands (SPEC §9.6, Q328): the host — the bridge
   * from the constitution layer, or a sim — reports the room's decision;
   * races in flight run under the constitution as it stands from here.
   */
  amend(t: number, changes: ConstitutionAmendment): void {
    this.assertOpen();
    if (Object.keys(changes).length === 0) throw new Error('empty amendment');
    this.emit({ type: 'constitution-amended', t, changes });
  }

  /**
   * The standing value of a setting changed (SPEC §9.6, Q390). The engine
   * never applies a setting race's outcome itself — the host applies it
   * here once any assent it needs (§9.7's crown) has been given, which is
   * also what lets rivals keep racing against the old standing while
   * assent is pending.
   */
  setStanding(t: number, settingId: string, value: unknown): void {
    this.assertOpen();
    this.emit({ type: 'standing-set', t, settingId, value });
  }

  /** The standing value of a setting, as the host last reported it. */
  standing(settingId: string): unknown {
    return this.settingsMap.get(settingId);
  }

  close(t: number): void {
    this.assertOpen();
    this.emit({ type: 'closed', t });
  }

  // -------------------------------------------------------------------------
  // Races (derived state, SPEC §2.3)

  races(): RaceView[] {
    const liveAll = [...this.candidates.values()].filter((c) => c.state === 'live');
    const live = liveAll.filter((c) => !c.setting);
    // Union-find over footprint conflicts (text candidates).
    const parent = new Map<string, string>(live.map((c) => [c.id, c.id]));
    const find = (x: string): string => {
      let root = x;
      while (parent.get(root) !== root) root = parent.get(root)!;
      parent.set(x, root);
      return root;
    };
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        if (footprintsConflict(live[i]!.footprint, live[j]!.footprint)) {
          parent.set(find(live[i]!.id), find(live[j]!.id));
        }
      }
    }
    const groups = new Map<string, string[]>();
    for (const c of live) {
      const root = find(c.id);
      const g = groups.get(root);
      if (g) g.push(c.id);
      else groups.set(root, [c.id]);
    }
    const views: RaceView[] = [];
    for (const members of groups.values()) {
      members.sort((a, b) => candidateNum(a) - candidateNum(b));
      views.push(this.buildRaceView(members));
    }
    // Setting races (SPEC §9.6, Q390): all live values on one setting are
    // one race — rivalry needs no footprint test, the setting is the site.
    const bySetting = new Map<string, string[]>();
    for (const c of liveAll) {
      if (!c.setting) continue;
      const g = bySetting.get(c.setting.settingId);
      if (g) g.push(c.id);
      else bySetting.set(c.setting.settingId, [c.id]);
    }
    for (const members of bySetting.values()) {
      members.sort((a, b) => candidateNum(a) - candidateNum(b));
      views.push(this.buildRaceView(members));
    }
    views.sort((a, b) => candidateNum(a.id.slice(2)) - candidateNum(b.id.slice(2)));
    return views;
  }

  private buildRaceView(members: string[]): RaceView {
    const setting = this.candidate(members[0]!).setting;
    const contested = setting
      ? []
      : mergeSpans(members.flatMap((id) => this.candidate(id).footprint));
    const incumbentId = setting
      ? this.incumbentIdForSetting(setting.settingId)
      : this.incumbentIdFor(contested);
    const id = `r:${members[0]!}`;
    const fit = this.fitRaceMembers(members, incumbentId);
    const usable = this.usableComparisons(members, incumbentId);
    const movers = new Set(usable.map((c) => c.participantId));
    let leaderId: string | null = null;
    let leaderP: number | null = null;
    for (const m of members) {
      const p = fit.probBeats(m, incumbentId);
      if (leaderP === null || p > leaderP) {
        leaderP = p;
        leaderId = m;
      }
    }
    const certification = leaderId === null ? null : 1 - (leaderP ?? 0.5);
    const rivalGateOpen = this.rivalGateOpen(fit, members, incumbentId, usable);
    // Deadlock considers only servable pairs: while the rival gate is
    // closed, unmeasured rival pairs must not hold a race open — there
    // is little decision value in finely ranking challengers that are
    // all losing to the status quo (SPEC §8.3).
    // Measured evidence only: a derived author preference is a preference, not
    // a measurement, so it cannot help a race look sufficiently sampled.
    const measured = usable.filter((c) => !c.derived);
    const deadlocked =
      measured.length >= this.constitutionValue.deadlockMinComparisons &&
      this.maxPairValue(fit, members, incumbentId, null, rivalGateOpen) <
        this.constitutionValue.deadlockEpsilon;
    return {
      id,
      members,
      contested,
      incumbentId,
      // Measured comparisons: what the room actually judged, which is the
      // number the record reports and the number a reader means by "how much
      // evidence is there". Derived author preferences are voices, not
      // measurements, so they show up in `distinctMovers` and not here.
      comparisons: measured.length,
      distinctMovers: movers.size,
      leaderP,
      leaderId,
      certification,
      deadlocked,
      rivalGateOpen,
      ...(setting ? { settingId: setting.settingId } : {}),
    };
  }

  /**
   * The rival-pair gate (SPEC §8.3, Q48): open once at least one
   * challenger plausibly displaces the incumbent — posterior
   * P(challenger beats incumbent) above rivalGateProb on at least
   * rivalGateMinComparisons incumbent-involving comparisons (current
   * ground). probBeats is the same posterior quantity the
   * adoption-threshold gates, so the criterion needs no new machinery;
   * the minimum-evidence clause exists because the no-data prior sits
   * exactly at 0.5.
   */
  private rivalGateOpen(
    fit: Fit,
    members: string[],
    incumbentId: string,
    usable: StoredComparison[],
  ): boolean {
    for (const m of members) {
      // Displacement *evidence*, so the author's own derived preference does
      // not count toward the minimum — it would open the gate on every
      // candidate the moment it was submitted.
      const n = usable.filter(
        (c) =>
          !c.derived &&
          (c.aId === m || c.bId === m) &&
          (c.aId === incumbentId || c.bId === incumbentId),
      ).length;
      if (
        n >= this.constitutionValue.rivalGateMinComparisons &&
        fit.probBeats(m, incumbentId) > this.constitutionValue.rivalGateProb
      ) {
        return true;
      }
    }
    return false;
  }

  raceOf(candidateId: string): RaceView {
    const race = this.races().find((r) => r.members.includes(candidateId));
    if (!race) throw new Error(`candidate ${candidateId} is not in a live race`);
    return race;
  }

  private raceIdOfEndpoint(id: string): string | null {
    if (id.startsWith(INC_PREFIX)) return null;
    const race = this.races().find((r) => r.members.includes(id));
    return race ? race.id : null;
  }

  /**
   * The incumbent is positional (SPEC §4.4): its identity is the hash of
   * the contested spans' current text, so evidence goes stale exactly
   * when the text it judged stops being the status quo.
   */
  private incumbentIdFor(contested: Span[]): string {
    const lines = this.currentLines();
    const parts = contested.map((s) => lines.slice(s.start, s.end).join('\n'));
    return INC_PREFIX + sha256Hex(parts.join('\u0000')).slice(0, 16);
  }

  /**
   * A setting race's incumbent is the standing value (SPEC §9.6, Q390):
   * its identity hashes the value, so evidence goes stale exactly when
   * the standing it was judged against stops being what stands — a
   * standing-set is a ground shift by construction (§4.4).
   */
  private incumbentIdForSetting(settingId: string): string {
    const standing = stableStringify(this.settingsMap.get(settingId));
    return INC_PREFIX + sha256Hex(`setting:${settingId}\u0000${standing}`).slice(0, 16);
  }

  private classifyPair(aId: string, bId: string): PairKind {
    const aInc = aId.startsWith(INC_PREFIX);
    const bInc = bId.startsWith(INC_PREFIX);
    if (aInc && bInc) throw new Error('cannot judge incumbent against incumbent');
    if (aInc || bInc) {
      const candId = aInc ? bId : aId;
      const incId = aInc ? aId : bId;
      const race = this.raceOf(candId);
      if (race.incumbentId !== incId) {
        throw new Error('stale card: incumbent text has changed');
      }
      return 'edge';
    }
    const ra = this.raceIdOfEndpoint(aId);
    const rb = this.raceIdOfEndpoint(bId);
    if (ra === null || rb === null) throw new Error('candidate is not live');
    return ra === rb ? 'edge' : 'diagonal';
  }

  // -------------------------------------------------------------------------
  // Ranking (SPEC §4.1) — per-race Davidson fit over usable comparisons

  private usableComparisons(members: string[], incumbentId: string): StoredComparison[] {
    const memberSet = new Set(members);
    const filtered = this.comparisons.filter((c) => {
      if (c.kind !== 'edge') return false;
      // Ground lock (SPEC §4.4, Q50): a judgment cast on a different
      // ground — including rival-vs-rival pairs — no longer feeds the
      // live posterior. The race's ranking restarts from nothing.
      if (c.groundId !== incumbentId) return false;
      for (const id of [c.aId, c.bId]) {
        if (id.startsWith(INC_PREFIX)) {
          if (id !== incumbentId) return false;
        } else {
          if (!memberSet.has(id)) return false;
          const since = this.evidenceSince.get(id);
          if (since !== undefined && c.seq < since) return false;
        }
      }
      return true;
    });
    // Supersession (SPEC §4.4, Q50): the ranking uses only each
    // participant's latest judgment per pair (per ground); the log and
    // record keep them all.
    const latest = new Map<string, StoredComparison>();
    for (const c of filtered) {
      latest.set(`${c.participantId}|${pairKey(c.aId, c.bId)}`, c);
    }

    // The author's own preference (SPEC §3.3), **derived rather than
    // recorded** (Ed, Q245(b)).
    //
    // It was first built as a comparison emitted at submission, and that does
    // not work: a comparison is stamped with the ground it was cast on, and
    // the ground is a fingerprint of the race's whole contested area. The
    // moment another candidate joins, the area widens, the fingerprint
    // changes, and every judgment on the old ground locks — including the
    // author's. A human recovers, because the pair is re-served and they
    // answer again; nobody re-asks an automatic vote, so it just evaporated.
    // Measured: in a four-candidate chain the first author's vote was
    // stranded and the three who submitted after them kept theirs, which made
    // the floor a function of submission order.
    //
    // The error was modelling a standing fact as a dated one. *While your
    // candidate is live, you prefer it to the current text* — that is what a
    // live candidate means, and if you stopped preferring it you would
    // withdraw it (§3.3a). So it is computed against the current incumbent,
    // every time, and cannot go stale. Your submission is already an event in
    // the log, so nothing is lost from the record: "you proposed this" carries
    // "you preferred it" by construction.
    //
    // An explicit judgment always wins: an author who judges their own
    // candidate against the incumbent and says otherwise has said something,
    // and it is not the engine's business to overrule them.
    for (const m of members) {
      const cand = this.candidates.get(m);
      if (!cand) continue;
      const key = `${cand.author}|${pairKey(m, incumbentId)}`;
      if (latest.has(key)) continue;
      latest.set(key, {
        seq: -1,
        t: 0,
        participantId: cand.author,
        aId: m,
        bId: incumbentId,
        kind: 'edge',
        outcome: 'a',
        groundId: incumbentId,
        derived: true,
      });
    }
    return [...latest.values()].sort((a, b) => a.seq - b.seq);
  }

  private fitRaceMembers(members: string[], incumbentId: string): Fit {
    const usable = this.usableComparisons(members, incumbentId);
    const raceId = `r:${members[0] ?? 'none'}`;
    const key = `${members.join(',')}|${incumbentId}|${usable.length}|${
      usable.length > 0 ? usable[usable.length - 1]!.seq : -1
    }`;
    const cached = this.fitCache.get(raceId);
    if (cached && cached.key === key) return cached.fit;
    const ids = [...members, incumbentId];
    const comps: Comparison[] = usable.map((c) => ({
      a: c.aId,
      b: c.bId,
      outcome: c.outcome,
    }));
    const fit = fitDavidson(ids, comps);
    this.fitCache.set(raceId, { key, fit });
    return fit;
  }

  raceFit(raceId: string): Fit {
    const race = this.races().find((r) => r.id === raceId);
    if (!race) throw new Error(`unknown race ${raceId}`);
    return this.fitRaceMembers(race.members, race.incumbentId);
  }

  private updatePeaks(race: RaceView): void {
    // Performance is how the **room** received a candidate, and an author is
    // not the room — so the refund (§7) pays on a fit without any derived
    // preference in it, and a candidate has no performance at all until
    // somebody else has judged it. Without the second half, submitting would
    // open an account out of nothing, and since the refund is
    // stake × min(w/0.5, 1.5) — where one favourable comparison already
    // reaches the cap — submit-then-retire would pay 1.5× the stake with
    // nobody else involved.
    const room = this.usableComparisons(race.members, race.incumbentId)
      .filter((c) => !c.derived);
    const fit = fitDavidson(
      [...race.members, race.incumbentId],
      room.map((c) => ({ a: c.aId, b: c.bId, outcome: c.outcome })),
    );
    const compared = new Set<string>();
    for (const c of room) {
      if (!c.aId.startsWith(INC_PREFIX)) compared.add(c.aId);
      if (!c.bId.startsWith(INC_PREFIX)) compared.add(c.bId);
    }
    for (const m of race.members) {
      // peakW only moves on evidence; the prior's 0.5 is not a performance.
      if (!compared.has(m)) continue;
      const cand = this.candidate(m);
      const w = fit.probBeats(m, race.incumbentId);
      if (w > cand.peakW) cand.peakW = w;
    }
  }

  // -------------------------------------------------------------------------
  // Adoption (SPEC §4.2)

  /**
   * The adoption sweep (SPEC §4.2, Ed 2026-08-19): when the cooldown from
   * the last batch has elapsed, EVERY race whose leader clears bar and
   * floor adopts at once — the document changes at most once per cooldown,
   * by as much as the room has decided. Two rules keep the batch honest:
   * the ready set is snapshotted before any adoption lands, so it is one
   * decision per race per batch (a race's runner-up stays live after its
   * winner adopts, and must not ride the same batch on evidence gathered
   * against the old text); and adoptions land oldest race first, each
   * rebasing the field for the next, a leader whose ground shifted
   * mid-batch (rebase-pending) simply skipped to wait like anybody.
   */
  private sweepAdoptions(t: number): void {
    if (this.closedFlag) return;
    if (
      this.lastAdoptionT !== null &&
      t - this.lastAdoptionT < this.constitutionValue.cooldownMs
    ) {
      return;
    }
    const threshold = this.adoptionThreshold(t);
    const floor = this.adoptionFloor();
    const ready = this.races()
      .filter(
        (r) =>
          r.distinctMovers >= floor &&
          r.leaderId !== null &&
          r.leaderP !== null &&
          r.leaderP > threshold &&
          // The room must have spoken here at least once: two rival authors
          // meet a floor of 2 on derived self-preferences alone, and the
          // old one-race trigger enforced this structurally (adoption fired
          // only from a judgment in the race). Same doctrine as the refund:
          // the author's own preference is counted but is not the room.
          this.usableComparisons(r.members, r.incumbentId).some((c) => !c.derived),
      )
      .map((r) => ({ leaderId: r.leaderId as string, p: r.leaderP as number }));
    for (const { leaderId, p } of ready) {
      if (this.candidate(leaderId).state !== 'live') continue;
      this.adopt(t, leaderId, p, threshold);
    }
  }

  /**
   * The host's clock (Ed, 2026-08-19): release any adoption batch the
   * cooldown has made due, without waiting for a judgment to serve as
   * the timer. No-op while nothing clears, and on a closed session.
   */
  tick(t: number): Event[] {
    const before = this.log.length;
    this.sweepAdoptions(t);
    return this.log.slice(before).map((e) => e.event);
  }

  private adopt(t: number, candidateId: string, p: number, threshold: number): void {
    const winner = this.candidate(candidateId);
    if (!winner.patch) {
      // A setting race carried (Q390): the verdict is recorded and the
      // stake refunded; the value lands via setStanding, host-called,
      // once any §9.7 assent is given. No version bump, no rebase.
      this.emit({
        type: 'adopted',
        t,
        candidateId,
        newVersion: this.currentVersion(),
        p,
        threshold,
      });
      return;
    }
    const adoptedHunks = winner.patch.hunks;
    const newVersion = this.currentVersion() + 1;
    this.emit({ type: 'adopted', t, candidateId, newVersion, p, threshold });
    // Rebase every other live patch onto the new text (SPEC §2.4).
    // Setting candidates have no text ground and are untouched (Q390).
    const others = [...this.candidates.values()].filter(
      (c) => c.state === 'live' && c.id !== candidateId && c.patch !== undefined,
    );
    for (const c of others) {
      const result = rebaseHunks(c.patch!.hunks, adoptedHunks);
      if (result.ok) {
        this.emit({
          type: 'candidate-rebased',
          t,
          id: c.id,
          patch: { baseVersion: newVersion, hunks: result.hunks },
        });
      } else {
        this.emit({ type: 'rebase-failed', t, id: c.id, conflicts: result.conflicts });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Salience (SPEC §4.1): race-level Bradley–Terry over diagonals

  /**
   * Fit the global salience model. Diagonal endpoints map to the race
   * currently containing the candidate; comparisons whose endpoints have
   * left play (or converged into one race) are dropped.
   */
  /** The race-level fit behind the salience model, or null if unmeasured. */
  private salienceFitOver(races: RaceView[]): Fit | null {
    const raceOf = new Map<string, string>();
    for (const r of races) for (const m of r.members) raceOf.set(m, r.id);
    // Supersession (SPEC §4.4): latest per participant per pair. Ground
    // shifts do not lock diagonals — they rank the questions in
    // dispute, which outlive any particular text.
    const latest = new Map<string, StoredComparison>();
    for (const c of this.comparisons) {
      if (c.kind !== 'diagonal') continue;
      latest.set(`${c.participantId}|${pairKey(c.aId, c.bId)}`, c);
    }
    const comps: Comparison[] = [];
    for (const c of latest.values()) {
      const ra = raceOf.get(c.aId);
      const rb = raceOf.get(c.bId);
      if (!ra || !rb || ra === rb) continue;
      comps.push({ a: ra, b: rb, outcome: c.outcome });
    }
    if (comps.length === 0) return null;
    return fitDavidson(races.map((r) => r.id), comps);
  }

  salienceWeights(): Map<string, number> {
    const races = this.races();
    const ids = races.map((r) => r.id);
    const weights = new Map<string, number>();
    if (ids.length === 0) return weights;
    const fit = this.salienceFitOver(races);
    if (fit === null) {
      for (const id of ids) weights.set(id, 1);
      return weights;
    }
    for (const id of ids) {
      weights.set(id, Math.exp(fit.strengths.get(id) ?? 0));
    }
    return weights;
  }

  // -------------------------------------------------------------------------
  // Dominated / bounty / backlog (SPEC §6.2, §8.3, §1)

  /**
   * Candidates that look very unlikely to win (SPEC §6.2): the incumbent
   * would clear the current adoption threshold against them, on real
   * evidence.
   */
  dominated(raceId: string, t: number = this.lastT): string[] {
    const race = this.races().find((r) => r.id === raceId);
    if (!race) throw new Error(`unknown race ${raceId}`);
    const fit = this.fitRaceMembers(race.members, race.incumbentId);
    const threshold = this.adoptionThreshold(t);
    const usable = this.usableComparisons(race.members, race.incumbentId);
    const counts = new Map<string, number>();
    for (const c of usable) {
      for (const id of [c.aId, c.bId]) {
        if (!id.startsWith(INC_PREFIX)) counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return race.members.filter((m) => {
      if ((counts.get(m) ?? 0) < 5) return false;
      return fit.probBeats(m, race.incumbentId) < 1 - threshold;
    });
  }

  /** Deadlocked races ranked by resolvable disagreement × salience (SPEC §6.2). */
  bountyBoard(): Array<{ raceId: string; score: number }> {
    const weights = this.salienceWeights();
    return this.races()
      .filter((r) => r.deadlocked)
      .map((r) => {
        const closeness = r.leaderP === null ? 0 : 1 - Math.abs(2 * r.leaderP - 1);
        return { raceId: r.id, score: closeness * (weights.get(r.id) ?? 1) };
      })
      .sort((a, b) => b.score - a.score || a.raceId.localeCompare(b.raceId));
  }

  /** Unresolved positions ranked by closeness × salience (SPEC §1). */
  backlog(t: number = this.lastT): Array<{ candidateId: string; raceId: string; score: number }> {
    const weights = this.salienceWeights();
    const races = this.races();
    const out: Array<{ candidateId: string; raceId: string; score: number }> = [];
    for (const r of races) {
      for (const m of r.members) {
        const c = this.candidate(m);
        const closeness = Math.min(c.peakW / this.adoptionThreshold(t), 1);
        out.push({
          candidateId: m,
          raceId: r.id,
          score: closeness * (weights.get(r.id) ?? 1),
        });
      }
    }
    return out.sort(
      (a, b) => b.score - a.score || candidateNum(a.candidateId) - candidateNum(b.candidateId),
    );
  }

  // -------------------------------------------------------------------------
  // Close and render (SPEC §4.2, §9.2)

  /**
   * Render each race to its posterior leader among threshold-clearing,
   * floor-satisfying candidates; ties and ordering break by hash.
   * Uses the last event's time (normally the close) for the threshold.
   */
  finalRender(): {
    text: string;
    applied: string[];
    /** Setting races whose leader cleared bar and floor at the close (Q390) — reported for the host to apply, never applied here. */
    appliedSettings: Array<{ settingId: string; candidateId: string }>;
  } {
    const races = this.races();
    const threshold = this.adoptionThreshold();
    const floor = this.adoptionFloor();
    const winners: Candidate[] = [];
    const appliedSettings: Array<{ settingId: string; candidateId: string }> = [];
    for (const r of races) {
      if (r.leaderId === null || r.leaderP === null) continue;
      if (r.leaderP <= threshold) continue;
      if (r.distinctMovers < floor) continue;
      if (r.settingId !== undefined) {
        appliedSettings.push({ settingId: r.settingId, candidateId: r.leaderId });
        continue;
      }
      winners.push(this.candidate(r.leaderId));
    }
    winners.sort((a, b) =>
      sha256Hex(a.id + this.constitutionValue.rngSeed).localeCompare(
        sha256Hex(b.id + this.constitutionValue.rngSeed),
      ),
    );
    // Winners come one per race, and distinct races cannot conflict, so
    // all their hunks share current-version coordinates and apply as one
    // batch. The hash order above only breaks would-be conflicts.
    const applied: string[] = [];
    const batch: Hunk[] = [];
    let claimed: Span[] = [];
    for (const w of winners) {
      if (footprintsConflict(claimed, w.footprint)) continue; // defensive
      claimed = [...claimed, ...w.footprint];
      batch.push(...w.patch!.hunks);
      applied.push(w.id);
    }
    batch.sort((a, b) => a.start - b.start || a.end - b.end);
    const lines = applyPatch(this.currentLines(), batch);
    return { text: joinLines(lines), applied, appliedSettings };
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

  /** Every participant can verify their own moves were counted (SPEC §11). */
  receipt(participantId: string): Array<{ seq: number; hash: string }> {
    return this.log
      .filter((entry) => {
        const e = entry.event;
        return (
          ('participantId' in e && e.participantId === participantId) ||
          ('byParticipant' in e && e.byParticipant === participantId) ||
          ('author' in e && e.author === participantId)
        );
      })
      .map((entry) => ({ seq: entry.seq, hash: entry.hash }));
  }

  // -------------------------------------------------------------------------
  // Routing (SPEC §8) — one policy, identical for everyone, seeded RNG

  /**
   * True when a race carries evidence locked by a ground shift or a
   * rebase confirmation — i.e. the race was re-opened (SPEC §4.4, Q50)
   * and its live members were judged before on ground that no longer
   * exists.
   */
  private hasLockedEvidence(race: RaceView): boolean {
    const memberSet = new Set(race.members);
    for (const c of this.comparisons) {
      if (c.kind !== 'edge') continue;
      const aMember = memberSet.has(c.aId);
      const bMember = memberSet.has(c.bId);
      const aOk = aMember || c.aId.startsWith(INC_PREFIX);
      const bOk = bMember || c.bId.startsWith(INC_PREFIX);
      if (!aOk || !bOk || (!aMember && !bMember)) continue;
      if (c.groundId !== race.incumbentId) return true;
      for (const [id, isMember] of [
        [c.aId, aMember],
        [c.bId, bMember],
      ] as const) {
        if (!isMember) continue;
        const since = this.evidenceSince.get(id);
        if (since !== undefined && c.seq < since) return true;
      }
    }
    return false;
  }

  /** Mean in-bout response time; participants without data count as cheap. */
  judgmentCost(participantId: string): number | null {
    const entry = this.rosterEntry(participantId);
    if (entry.latencies.length === 0) return null;
    return entry.latencies.reduce((a, b) => a + b, 0) / entry.latencies.length;
  }

  private maxPairValue(
    fit: Fit,
    members: string[],
    incumbentId: string,
    excludeJudgedBy: string | null,
    rivalGateOpen: boolean,
  ): number {
    let max = 0;
    const ids = [...members, incumbentId];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i]!;
        const b = ids[j]!;
        // While the rival gate is closed, rival pairs carry no serving
        // value (SPEC §8.3, Q48).
        if (!rivalGateOpen && a !== incumbentId && b !== incumbentId) continue;
        if (excludeJudgedBy && this.servedOut(excludeJudgedBy, contextKey(a, b, incumbentId))) {
          continue;
        }
        const v = pairValue(fit, a, b);
        if (v > max) max = v;
      }
    }
    return max;
  }

  /**
   * Best unjudged pair in a race for a participant (SPEC §8.1, §8.3).
   * While the rival gate is closed, incumbent-involving pairs dominate:
   * rival pairs are served only to a participant whose incumbent pairs
   * in the race are exhausted — the "sparingly" of SPEC §8.3.
   */
  private bestPairFor(
    fit: Fit,
    members: string[],
    incumbentId: string,
    participantId: string,
    rivalGateOpen: boolean,
  ): { aId: string; bId: string; value: number } | null {
    const ids = [...members, incumbentId];
    const scan = (
      include: (a: string, b: string) => boolean,
    ): { aId: string; bId: string; value: number } | null => {
      let best: { aId: string; bId: string; value: number } | null = null;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = ids[i]!;
          const b = ids[j]!;
          if (!include(a, b)) continue;
          if (this.servedOut(participantId, contextKey(a, b, incumbentId))) continue;
          const v = pairValue(fit, a, b);
          if (best === null || v > best.value) best = { aId: a, bId: b, value: v };
        }
      }
      return best;
    };
    if (rivalGateOpen) return scan(() => true);
    const isIncumbentPair = (a: string, b: string): boolean =>
      a === incumbentId || b === incumbentId;
    return (
      scan(isIncumbentPair) ?? scan((a, b) => !isIncumbentPair(a, b))
    );
  }

  /**
   * A participant's feed (SPEC §8.3): hot-set edges by value, ~1 in
   * `explorationEvery` slots explores under-measured candidates (only for
   * abundant/cheap judges). Salience diagonals are NOT a rate (§8.3a):
   * none below E live questions (a race counts once, deadlocked included —
   * an open dispute is an open dispute); from E, served only to a
   * participant with nothing else to judge; from 2E the old ~1-in-
   * `salienceEvery` stream returns for everybody. The idle serving
   * terminates — only while a pair would still move the salience ranking
   * (the same active-sampling rule races use), and never more than three
   * in a row per participant. Pure: same state and time, same feed.
   */
  feed(participantId: string, n: number, t: number = this.lastT): Card[] {
    this.activeParticipant(participantId);
    const allRaces = this.races();
    const races = allRaces.filter((r) => !r.deadlocked);
    if (allRaces.length === 0) return [];
    const E = this.eCount();
    const liveQuestions = allRaces.length;
    const audienceGateOpen = E > 0 && liveQuestions >= E;
    const streamOpen = E > 0 && liveQuestions >= 2 * E;
    const weights = this.salienceWeights();
    const threshold = this.adoptionThreshold(t);
    const floor = this.adoptionFloor();
    const judgedRaces = new Set<string>();
    for (const r of races) {
      const usable = this.usableComparisons(r.members, r.incumbentId);
      if (usable.some((c) => c.participantId === participantId)) judgedRaces.add(r.id);
    }
    // Race value: closeness to adoption × salience; races short of the
    // floor that this participant hasn't judged get the unheard boost
    // (SPEC §8.2); ground-shifted races get the re-opened boost until
    // re-measured (SPEC §4.4, Q50 — near-adoption by construction, so
    // their fresh pairs price like new-candidate measurement or better).
    const valued = races
      .map((r) => {
        let v = ((r.leaderP ?? 0.5) / threshold) * (weights.get(r.id) ?? 1);
        if (r.distinctMovers < floor && !judgedRaces.has(r.id)) v *= 1.25;
        if (r.comparisons < r.members.length && this.hasLockedEvidence(r)) {
          v *= this.constitutionValue.reopenedBoost;
        }
        return { race: r, value: v };
      })
      .sort((a, b) => b.value - a.value || a.race.id.localeCompare(b.race.id));
    const hot = valued.slice(0, this.constitutionValue.hotSetSize);

    const costs = [...this.roster.values()]
      .filter((r) => !r.removed && !r.suspended && r.latencies.length > 0)
      .map((r) => r.latencies.reduce((a, b) => a + b, 0) / r.latencies.length)
      .sort((a, b) => a - b);
    const myCost = this.judgmentCost(participantId);
    const median = costs.length > 0 ? costs[Math.floor(costs.length / 2)]! : null;
    const cheap = myCost === null || median === null || myCost <= median;

    const rng = this.feedRng(participantId);
    const cards: Card[] = [];
    const served = new Set<string>();
    let hotIndex = 0;
    // §8.3a idle serving: with the audience gate open and nothing else to
    // judge, the diagonal simply arrives — capped so the participant is
    // never asked more than three in a row, counting ones already judged.
    let idleBudget = 0;
    if (audienceGateOpen &&
        this.nothingElseToJudge(participantId, races, cheap)) {
      idleBudget = Math.max(0, 3 - this.trailingDiagonalRun(participantId));
    }
    for (let slot = 1; cards.length < n && slot <= n * 4; slot++) {
      let card: Card | null = null;
      // Seeded per-slot roll: ~1 in salienceEvery serves a diagonal (only
      // at saturation, §8.3a), ~1 in explorationEvery explores (SPEC
      // §8.3). A roll rather than a slot index so the mix holds even for
      // clients fetching one card at a time.
      const roll = rng.next();
      const pSalience = 1 / this.constitutionValue.salienceEvery;
      const pExplore = 1 / this.constitutionValue.explorationEvery;
      if (roll < pSalience) {
        if (streamOpen) card = this.diagonalCard(allRaces, participantId, served);
      } else if (cheap && roll < pSalience + pExplore) {
        card = this.explorationCard(races, participantId);
      }
      if (card === null && idleBudget > 0) {
        card = this.diagonalCard(allRaces, participantId, served);
        if (card !== null) idleBudget--;
      }
      if (card === null && hot.length > 0) {
        for (let tries = 0; tries < hot.length && card === null; tries++) {
          const { race } = hot[(hotIndex + tries) % hot.length]!;
          const fit = this.fitRaceMembers(race.members, race.incumbentId);
          const best = this.bestPairFor(
            fit,
            race.members,
            race.incumbentId,
            participantId,
            race.rivalGateOpen,
          );
          if (best) {
            card = {
              kind: 'edge',
              subtype:
                best.aId === race.incumbentId || best.bId === race.incumbentId
                  ? 'incumbent'
                  : 'rival',
              aId: best.aId,
              bId: best.bId,
              raceId: race.id,
              value: best.value,
            };
          }
        }
        hotIndex++;
      }
      if (card) {
        const key = pairKey(card.aId, card.bId);
        if (!served.has(key)) {
          served.add(key);
          cards.push(card);
        }
      }
    }
    return cards;
  }

  private feedRng(participantId: string): Rng {
    return makeRng(
      `${this.constitutionValue.rngSeed}/feed/${participantId}/${this.log.length}`,
    );
  }

  /**
   * The next diagonal for a participant (§8.3a): active pair selection
   * over the race-level salience fit — the pair that would most move the
   * ranking, leader vs leader (§4.1: a weak draft must not make its
   * question look unimportant). Serves nothing once no unjudged pair
   * clears the same epsilon races stop sampling at: prioritisations
   * terminate, and past the limit the queue is simply empty.
   */
  private diagonalCard(
    allRaces: RaceView[],
    participantId: string,
    exclude: ReadonlySet<string>,
  ): Card | null {
    const withLeaders = allRaces.filter((r) => r.leaderId !== null);
    if (withLeaders.length < 2) return null;
    const fit = this.salienceFitOver(allRaces);
    let best: { a: RaceView; b: RaceView; value: number } | null = null;
    for (let i = 0; i < withLeaders.length; i++) {
      for (let j = i + 1; j < withLeaders.length; j++) {
        const ra = withLeaders[i]!;
        const rb = withLeaders[j]!;
        const key = pairKey(ra.leaderId!, rb.leaderId!);
        if (exclude.has(key)) continue;
        if (this.servedOut(participantId, key)) continue;
        // An unmeasured ranking is always moved by a pair (value 1); a
        // fitted one prices the pair like any active sample.
        const v = fit === null ? 1 : pairValue(fit, ra.id, rb.id);
        if (best === null || v > best.value) best = { a: ra, b: rb, value: v };
      }
    }
    if (best === null) return null;
    if (fit !== null && best.value < this.constitutionValue.deadlockEpsilon) {
      return null; // the remaining pairs are already ordered confidently
    }
    return {
      kind: 'diagonal',
      aId: best.a.leaderId!,
      bId: best.b.leaderId!,
      raceId: best.a.id,
      raceIdB: best.b.id,
      value: best.value,
    };
  }

  /**
   * §8.3a's audience gate: nothing else to judge means no edge pair left
   * in any live race, no exploration card (for a judge who would be
   * served one), and no deadlocked race this participant has not judged —
   * §8.3b: an unjudged deadlocked race counts as work to do and defers
   * the diagonal.
   */
  private nothingElseToJudge(
    participantId: string,
    races: RaceView[],
    cheap: boolean,
  ): boolean {
    for (const r of this.races()) {
      if (!r.deadlocked) continue;
      const usable = this.usableComparisons(r.members, r.incumbentId);
      if (!usable.some((c) => c.participantId === participantId)) return false;
    }
    for (const r of races) {
      const fit = this.fitRaceMembers(r.members, r.incumbentId);
      if (this.bestPairFor(fit, r.members, r.incumbentId, participantId,
        r.rivalGateOpen) !== null) {
        return false;
      }
    }
    if (cheap && this.explorationCard(races, participantId) !== null) return false;
    return true;
  }

  /** Consecutive diagonal judgments at the tail of a participant's history. */
  private trailingDiagonalRun(participantId: string): number {
    let run = 0;
    for (let i = this.comparisons.length - 1; i >= 0 && run < 3; i--) {
      const c = this.comparisons[i]!;
      if (c.participantId !== participantId) continue;
      if (c.kind !== 'diagonal') break;
      run++;
    }
    return run;
  }

  private explorationCard(races: RaceView[], participantId: string): Card | null {
    // Least-measured live candidate, served against its incumbent.
    let target: { race: RaceView; id: string; count: number } | null = null;
    for (const r of races) {
      const usable = this.usableComparisons(r.members, r.incumbentId);
      for (const m of r.members) {
        const count = usable.filter((c) => c.aId === m || c.bId === m).length;
        if (target === null || count < target.count) target = { race: r, id: m, count };
      }
    }
    if (!target) return null;
    const key = contextKey(target.id, target.race.incumbentId, target.race.incumbentId);
    if (this.servedOut(participantId, key)) return null;
    return {
      kind: 'exploration',
      subtype: 'incumbent',
      aId: target.id,
      bId: target.race.incumbentId,
      raceId: target.race.id,
      value: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Ground-contextual pair key (SPEC §4.4, Q50): edge pairs are keyed to
 * the ground they were judged on, so a material shift re-opens the pair
 * as a fresh question for everyone; diagonals (groundId null) are keyed
 * by the pair alone.
 */
function contextKey(a: string, b: string, groundId: string | null): string {
  return groundId === null ? pairKey(a, b) : `${pairKey(a, b)}@${groundId}`;
}

/**
 * Active-sampling value of a pair: posterior uncertainty × outcome
 * unpredictability — pairs whose result would move the model most.
 */
export function pairValue(fit: Fit, a: string, b: string): number {
  const unpredictable = 1 - Math.abs(2 * fit.winProb(a, b) - 1);
  return fit.varDiff(a, b) * unpredictable;
}

function mergeSpans(spans: Span[]): Span[] {
  const sorted = [...spans].sort((x, y) => x.start - y.start || x.end - y.end);
  const out: Span[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start <= last.end && !(s.start === s.end) && !(last.start === last.end)) {
      last.end = Math.max(last.end, s.end);
    } else if (last && last.start === s.start && last.end === s.end) {
      continue; // identical span (e.g. duplicate insertion point)
    } else {
      out.push({ start: s.start, end: s.end });
    }
  }
  return out;
}
