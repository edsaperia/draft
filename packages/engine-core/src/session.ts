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
import { chainHash, sha256Hex } from './hash.js';
import { makeRng, type Rng } from './rng.js';
import { theta } from './theta.js';
import {
  balanceAt,
  credit,
  openLedger,
  performanceRefund,
  spend,
  type Ledger,
} from './tokens.js';

export interface OpenInput {
  text: string;
  roster: Participant[];
  constitution: Constitution;
}

export const DEFAULT_CONSTITUTION: Omit<
  Constitution,
  'windowStartMs' | 'windowEndMs' | 'rngSeed' | 'evidenceHorizon'
> = {
  thetaStart: 0.6,
  thetaEnd: 0.95,
  adoptionFloorMax: 12,
  saturationMinComparisons: 20,
  saturationEpsilon: 0.02,
  cooldownMs: 5 * 60 * 1000,
  redraftLimit: 2,
  tokenGrant: 4,
  tokenDripPerTenth: 1,
  tokenCap: 8,
  stake: 1,
  rationaleMaxChars: 300,
  boutGapMs: 90 * 1000,
  hotSetSize: 6,
  explorationEvery: 7,
  salienceEvery: 10,
  authorshipVisibility: 'sealed',
};

export function makeConstitution(
  overrides: Partial<Constitution> &
    Pick<Constitution, 'windowStartMs' | 'windowEndMs' | 'rngSeed'>,
  rosterSize: number,
): Constitution {
  return {
    ...DEFAULT_CONSTITUTION,
    // Evidence horizon default: 40 comparisons per participant at open
    // (pending Ed's sign-off — QUESTIONS #22).
    evidenceHorizon: 40 * Math.max(1, rosterSize),
    ...overrides,
  };
}

interface StoredComparison {
  seq: number;
  t: number;
  participantId: string;
  aId: string;
  bId: string;
  kind: PairKind;
  outcome: Outcome;
}

interface RosterEntry {
  participant: Participant;
  removed: boolean;
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
  /** Unordered pair keys already judged, per participant. */
  private judgedPairs = new Map<string, Set<string>>();
  /** Comparisons at seq < evidenceSince[id] are dead for candidate id (SPEC §2.4). */
  private evidenceSince = new Map<string, number>();
  private edgeCount = 0;
  private lastAdoptionT: number | null = null;
  private closedFlag = false;
  private lastT = -Infinity;
  private candidateCounter = 0;
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
        this.versions = [splitLines(event.text)];
        for (const p of event.roster) {
          this.roster.set(p.id, {
            participant: p,
            removed: false,
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
      case 'candidate-submitted': {
        const hunks = event.patch.hunks;
        this.candidates.set(event.id, {
          id: event.id,
          author: event.author,
          rationale: event.rationale,
          patch: event.patch,
          footprint: footprint(hunks),
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
        this.comparisons.push({
          seq,
          t: event.t,
          participantId: event.participantId,
          aId: event.aId,
          bId: event.bId,
          kind: event.kind,
          outcome: event.outcome,
        });
        this.markJudged(event.participantId, event.aId, event.bId);
        if (event.kind === 'edge') this.edgeCount++;
        this.touchParticipant(event.participantId, event.t);
        break;
      }
      case 'composer-opened': {
        if (event.forfeited) {
          // The peek prices the pair: it is never collected (SPEC §3.3).
          this.markJudged(event.participantId, event.forfeited.aId, event.forfeited.bId);
        }
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
        const newLines = applyPatch(this.currentLines(), winner.patch.hunks);
        this.versions.push(newLines);
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

  private markJudged(participantId: string, aId: string, bId: string): void {
    let set = this.judgedPairs.get(participantId);
    if (!set) {
      set = new Set();
      this.judgedPairs.set(participantId, set);
    }
    set.add(pairKey(aId, bId));
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

  theta(): number {
    return theta(this.constitutionValue, this.edgeCount);
  }

  adoptionFloor(): number {
    const e = [...this.roster.values()].filter((r) => !r.removed).length;
    return Math.min(Math.ceil(e / 3), this.constitutionValue.adoptionFloorMax);
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

  // -------------------------------------------------------------------------
  // Commands

  addParticipant(t: number, participant: Participant): void {
    this.assertOpen();
    if (this.roster.has(participant.id)) throw new Error('participant id already exists');
    this.emit({ type: 'participant-added', t, participant });
  }

  removeParticipant(t: number, participantId: string): void {
    this.assertOpen();
    this.activeParticipant(participantId);
    this.emit({ type: 'participant-removed', t, participantId });
  }

  submitCandidate(
    t: number,
    input: {
      author: string;
      patch: PatchSet;
      rationale: string;
      machineAuthored?: boolean;
    },
  ): { id: string; raceId: string } {
    this.assertOpen();
    const entry = this.activeParticipant(input.author);
    if (input.rationale.length > this.constitutionValue.rationaleMaxChars) {
      throw new Error(
        `rationale exceeds ${this.constitutionValue.rationaleMaxChars} chars`,
      );
    }
    if (input.patch.baseVersion !== this.currentVersion()) {
      throw new Error(
        `patch targets version ${input.patch.baseVersion}; current is ${this.currentVersion()}`,
      );
    }
    if (input.patch.hunks.length === 0) throw new Error('empty patch');
    validateHunks(this.currentLines().length, input.patch.hunks);
    if (balanceAt(entry.ledger, this.constitutionValue, t) < this.constitutionValue.stake) {
      throw new Error('insufficient tokens for stake');
    }
    const id = `c${++this.candidateCounter}`;
    this.emit({
      type: 'candidate-submitted',
      t,
      id,
      author: input.author,
      patch: input.patch,
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
    if (this.judgedPairs.get(participantId)?.has(pairKey(aId, bId))) {
      throw new Error('pair already judged by this participant');
    }
    this.emit({ type: 'comparison', t, participantId, aId, bId, kind, outcome });
    this.fitCache.clear();
    if (kind === 'edge') {
      const raceId = this.raceIdOfEndpoint(aId) ?? this.raceIdOfEndpoint(bId);
      if (raceId) {
        const race = this.races().find((r) => r.id === raceId);
        if (race) {
          this.updatePeaks(race);
          this.maybeAdopt(t, race);
        }
      }
    }
    return this.log.slice(before).map((e) => e.event);
  }

  /** Propose C: opening the composer forfeits the served pair (SPEC §3.3). */
  openComposer(
    t: number,
    participantId: string,
    forfeited?: { aId: string; bId: string },
  ): void {
    this.assertOpen();
    this.activeParticipant(participantId);
    this.emit({
      type: 'composer-opened',
      t,
      participantId,
      ...(forfeited ? { forfeited } : {}),
    });
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

  close(t: number): void {
    this.assertOpen();
    this.emit({ type: 'closed', t });
  }

  // -------------------------------------------------------------------------
  // Races (derived state, SPEC §2.3)

  races(): RaceView[] {
    const live = [...this.candidates.values()].filter((c) => c.state === 'live');
    // Union-find over footprint conflicts.
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
    views.sort((a, b) => candidateNum(a.id.slice(2)) - candidateNum(b.id.slice(2)));
    return views;
  }

  private buildRaceView(members: string[]): RaceView {
    const contested = mergeSpans(
      members.flatMap((id) => this.candidate(id).footprint),
    );
    const incumbentId = this.incumbentIdFor(contested);
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
    const saturated =
      usable.length >= this.constitutionValue.saturationMinComparisons &&
      this.maxPairValue(fit, members, incumbentId, null) <
        this.constitutionValue.saturationEpsilon;
    return {
      id,
      members,
      contested,
      incumbentId,
      comparisons: usable.length,
      distinctMovers: movers.size,
      leaderP,
      leaderId,
      certification,
      saturated,
    };
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
    return INC_PREFIX + sha256Hex(parts.join(' ')).slice(0, 16);
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
    return this.comparisons.filter((c) => {
      if (c.kind !== 'edge') return false;
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
    const fit = this.fitRaceMembers(race.members, race.incumbentId);
    const usable = this.usableComparisons(race.members, race.incumbentId);
    const compared = new Set<string>();
    for (const c of usable) {
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

  private maybeAdopt(t: number, race: RaceView): void {
    if (this.closedFlag) return;
    if (
      this.lastAdoptionT !== null &&
      t - this.lastAdoptionT < this.constitutionValue.cooldownMs
    ) {
      return;
    }
    if (race.distinctMovers < this.adoptionFloor()) return;
    if (race.leaderId === null || race.leaderP === null) return;
    const th = this.theta();
    if (race.leaderP <= th) return;
    this.adopt(t, race.leaderId, race.leaderP, th);
  }

  private adopt(t: number, candidateId: string, p: number, th: number): void {
    const winner = this.candidate(candidateId);
    const adoptedHunks = winner.patch.hunks;
    const newVersion = this.currentVersion() + 1;
    this.emit({ type: 'adopted', t, candidateId, newVersion, p, theta: th });
    // Rebase every other live patch onto the new text (SPEC §2.4).
    const others = [...this.candidates.values()].filter(
      (c) => c.state === 'live' && c.id !== candidateId,
    );
    for (const c of others) {
      const result = rebaseHunks(c.patch.hunks, adoptedHunks);
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
  salienceWeights(): Map<string, number> {
    const races = this.races();
    const raceOf = new Map<string, string>();
    for (const r of races) for (const m of r.members) raceOf.set(m, r.id);
    const comps: Comparison[] = [];
    for (const c of this.comparisons) {
      if (c.kind !== 'diagonal') continue;
      const ra = raceOf.get(c.aId);
      const rb = raceOf.get(c.bId);
      if (!ra || !rb || ra === rb) continue;
      comps.push({ a: ra, b: rb, outcome: c.outcome });
    }
    const ids = races.map((r) => r.id);
    const weights = new Map<string, number>();
    if (ids.length === 0) return weights;
    if (comps.length === 0) {
      for (const id of ids) weights.set(id, 1);
      return weights;
    }
    const fit = fitDavidson(ids, comps);
    for (const id of ids) {
      weights.set(id, Math.exp(fit.strengths.get(id) ?? 0));
    }
    return weights;
  }

  // -------------------------------------------------------------------------
  // Dominated / bounty / backlog (SPEC §6.2, §8.3, §1)

  /**
   * Candidates that look very unlikely to win (SPEC §6.2): the incumbent
   * would clear current theta against them, on real evidence.
   */
  dominated(raceId: string): string[] {
    const race = this.races().find((r) => r.id === raceId);
    if (!race) throw new Error(`unknown race ${raceId}`);
    const fit = this.fitRaceMembers(race.members, race.incumbentId);
    const th = this.theta();
    const usable = this.usableComparisons(race.members, race.incumbentId);
    const counts = new Map<string, number>();
    for (const c of usable) {
      for (const id of [c.aId, c.bId]) {
        if (!id.startsWith(INC_PREFIX)) counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return race.members.filter((m) => {
      if ((counts.get(m) ?? 0) < 5) return false;
      return fit.probBeats(m, race.incumbentId) < 1 - th;
    });
  }

  /** Saturated races ranked by resolvable disagreement × salience (SPEC §6.2). */
  bountyBoard(): Array<{ raceId: string; score: number }> {
    const weights = this.salienceWeights();
    return this.races()
      .filter((r) => r.saturated)
      .map((r) => {
        const closeness = r.leaderP === null ? 0 : 1 - Math.abs(2 * r.leaderP - 1);
        return { raceId: r.id, score: closeness * (weights.get(r.id) ?? 1) };
      })
      .sort((a, b) => b.score - a.score || a.raceId.localeCompare(b.raceId));
  }

  /** Unresolved positions ranked by closeness × salience (SPEC §1). */
  backlog(): Array<{ candidateId: string; raceId: string; score: number }> {
    const weights = this.salienceWeights();
    const races = this.races();
    const out: Array<{ candidateId: string; raceId: string; score: number }> = [];
    for (const r of races) {
      for (const m of r.members) {
        const c = this.candidate(m);
        const closeness = Math.min(c.peakW / this.theta(), 1);
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
   * Render each race to its posterior leader among theta-clearing,
   * floor-satisfying candidates; ties and ordering break by hash.
   */
  finalRender(): { text: string; applied: string[] } {
    const races = this.races();
    const th = this.theta();
    const floor = this.adoptionFloor();
    const winners: Candidate[] = [];
    for (const r of races) {
      if (r.leaderId === null || r.leaderP === null) continue;
      if (r.leaderP <= th) continue;
      if (r.distinctMovers < floor) continue;
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
      batch.push(...w.patch.hunks);
      applied.push(w.id);
    }
    batch.sort((a, b) => a.start - b.start || a.end - b.end);
    const lines = applyPatch(this.currentLines(), batch);
    return { text: joinLines(lines), applied };
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
  ): number {
    let max = 0;
    const ids = [...members, incumbentId];
    const judged = excludeJudgedBy ? this.judgedPairs.get(excludeJudgedBy) : undefined;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i]!;
        const b = ids[j]!;
        if (judged?.has(pairKey(a, b))) continue;
        const v = pairValue(fit, a, b);
        if (v > max) max = v;
      }
    }
    return max;
  }

  private bestPairFor(
    fit: Fit,
    members: string[],
    incumbentId: string,
    participantId: string,
  ): { aId: string; bId: string; value: number } | null {
    const ids = [...members, incumbentId];
    const judged = this.judgedPairs.get(participantId);
    let best: { aId: string; bId: string; value: number } | null = null;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i]!;
        const b = ids[j]!;
        if (judged?.has(pairKey(a, b))) continue;
        const v = pairValue(fit, a, b);
        if (best === null || v > best.value) best = { aId: a, bId: b, value: v };
      }
    }
    return best;
  }

  /**
   * A participant's feed (SPEC §8.3): hot-set edges by value, ~1 in
   * `explorationEvery` slots explores under-measured candidates (only for
   * abundant/cheap judges), ~1 in `salienceEvery` serves a diagonal.
   * Pure: same state, same feed.
   */
  feed(participantId: string, n: number): Card[] {
    this.activeParticipant(participantId);
    const races = this.races().filter((r) => !r.saturated);
    if (races.length === 0) return [];
    const weights = this.salienceWeights();
    const th = this.theta();
    const floor = this.adoptionFloor();
    const judgedRaces = new Set<string>();
    for (const r of races) {
      const usable = this.usableComparisons(r.members, r.incumbentId);
      if (usable.some((c) => c.participantId === participantId)) judgedRaces.add(r.id);
    }
    // Race value: closeness to adoption × salience; races short of the
    // floor that this participant hasn't judged get the unheard boost
    // (SPEC §8.2).
    const valued = races
      .map((r) => {
        let v = ((r.leaderP ?? 0.5) / th) * (weights.get(r.id) ?? 1);
        if (r.distinctMovers < floor && !judgedRaces.has(r.id)) v *= 1.25;
        return { race: r, value: v };
      })
      .sort((a, b) => b.value - a.value || a.race.id.localeCompare(b.race.id));
    const hot = valued.slice(0, this.constitutionValue.hotSetSize);

    const costs = [...this.roster.values()]
      .filter((r) => !r.removed && r.latencies.length > 0)
      .map((r) => r.latencies.reduce((a, b) => a + b, 0) / r.latencies.length)
      .sort((a, b) => a - b);
    const myCost = this.judgmentCost(participantId);
    const median = costs.length > 0 ? costs[Math.floor(costs.length / 2)]! : null;
    const cheap = myCost === null || median === null || myCost <= median;

    const rng = this.feedRng(participantId);
    const cards: Card[] = [];
    const served = new Set<string>();
    let hotIndex = 0;
    for (let slot = 1; cards.length < n && slot <= n * 4; slot++) {
      let card: Card | null = null;
      if (slot % this.constitutionValue.salienceEvery === 0) {
        card = this.diagonalCard(races, weights, rng);
      } else if (cheap && slot % this.constitutionValue.explorationEvery === 0) {
        card = this.explorationCard(races, participantId);
      }
      if (card === null && hot.length > 0) {
        for (let tries = 0; tries < hot.length && card === null; tries++) {
          const { race } = hot[(hotIndex + tries) % hot.length]!;
          const fit = this.fitRaceMembers(race.members, race.incumbentId);
          const best = this.bestPairFor(fit, race.members, race.incumbentId, participantId);
          if (best) {
            card = {
              kind: 'edge',
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

  private diagonalCard(
    races: RaceView[],
    weights: Map<string, number>,
    rng: Rng,
  ): Card | null {
    const withLeaders = races.filter((r) => r.leaderId !== null);
    if (withLeaders.length < 2) return null;
    const i = rng.int(withLeaders.length);
    let j = rng.int(withLeaders.length - 1);
    if (j >= i) j++;
    const ra = withLeaders[i]!;
    const rb = withLeaders[j]!;
    return {
      kind: 'diagonal',
      aId: ra.leaderId!,
      bId: rb.leaderId!,
      raceId: ra.id,
      raceIdB: rb.id,
      value: (weights.get(ra.id) ?? 1) + (weights.get(rb.id) ?? 1),
    };
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
    const key = pairKey(target.id, target.race.incumbentId);
    if (this.judgedPairs.get(participantId)?.has(key)) return null;
    return {
      kind: 'exploration',
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
