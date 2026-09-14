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
import { SCHEMA_VERSION, INC_PREFIX } from './types.js';
import type { Hunk, PatchSet, Span } from './text/types.js';
import type { Comparison, Fit, Outcome } from './ranking/types.js';
import { applyPatch, footprint, footprintsConflict, validateHunks } from './text/patch.js';
import { splitLines, joinLines } from './text/diff.js';
import { rebaseHunks } from './text/rebase.js';
import { fitDavidson } from './ranking/davidson.js';
import { chainHash, sha256Hex, stableStringify } from './hash.js';
import { Routing, contextKey, pairKey, type RoutingHost } from './routing.js';
import { Races, candidateNum, type RacesHost } from './races.js';
import { smoothstep } from './adoption-threshold.js';
import {
  balanceAt,
  dripIntervalMs,
  credit,
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

export interface StoredComparison {
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

// the incumbent pseudo-id's prefix is types.ts's since routing.ts reads it
// too; re-exported here so its importers need not move
export { INC_PREFIX } from './types.js';

/**
 * The polite refusal (SPEC §4.6): a judgment or submission arriving after
 * T=0. Typed so a host can show it as a sentence rather than a failure.
 */
export class DocumentClosedError extends Error {
  readonly closedAt: number;
  constructor(closedAt: number) {
    super(`the document closed at ${closedAt}`);
    this.name = 'DocumentClosedError';
    this.closedAt = closedAt;
  }
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
   * **Edge judgments indexed as they land** (the moon room, 2026-09-11): by
   * the ground they were cast on, and by each candidate they touch. Both
   * per-race scans below — the usable set behind every fit, and the
   * locked-evidence test the feed asks per race — walked every judgment in
   * the room once per race per state version, which at a hundred races
   * over thousands of judgments was a quarter of a saturated host and the
   * whole of a command's fold (the fold reads `races()` uncached). A race's
   * usable judgments all share its incumbent as ground, and a locked one
   * touches one of its members, so each scan reads its own bucket alone.
   * Comparisons only ever append, in `apply`, so the buckets are exact.
   */
  private edgesByGround = new Map<string, StoredComparison[]>();
  private edgesByCandidate = new Map<string, StoredComparison[]>();
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
  /** T=0 as the log recorded it (SPEC §4.6); null while open. */
  private closedT: number | null = null;
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
  /**
   * **Everything the session knows is a function of its log** (Q1324): the
   * state changes in `apply` and nowhere else, so a value derived from the
   * state alone is exact until the next event. `stateVersion` is bumped by
   * every `apply`, and `derived` keeps one map per version. **While an event
   * is being folded nothing is memoised at all** (`applying`): the fold
   * reads `races()` more than once with the state changing between the
   * reads — `markJudged` takes the ground before the comparison is pushed,
   * `updatePeaks` needs the fit after — and a memo taken between the two
   * paid the wrong refund (two engine tests said so). Before this the view
   * route rebuilt `races()` once per race per seat per poll (`askOn`),
   * which was 91% of a saturated host.
   */
  private stateVersion = 0;
  private applying = false;
  private derivedVersion = -1;
  private derivedMap = new Map<string, unknown>();
  /**
   * The serving rules (SPEC §8), in `routing.ts` since Q1352 (o): they read
   * the session through `routingHost()` and write nothing. Built here so
   * every read is a live closure over this instance.
   */
  private readonly routing = new Routing(this.routingHost());
  /**
   * Races and their ranking (SPEC §2.3, §4.1), in `races.ts` since Q1352 (p):
   * read through `racesHost()` the same way. The memo stays here, with the
   * state version it keys on, so what the races derive is still exact until
   * the next event and suspended for the length of a fold.
   */
  private readonly raceRules = new Races(this.racesHost());

  private constructor() {}

  /**
   * A value derived from the state alone, computed once per state version
   * and handed back until the next event. The caller's `compute` must read
   * nothing but the session and its arguments (folded into `key`); the
   * result is shared, so it is read and never mutated. Public so that the
   * participant API and the host can key their own per-state work on the
   * engine's own notion of change, rather than guessing at it from `log.length`.
   */
  derived<T>(key: string, compute: () => T): T {
    if (this.applying) return compute(); // a fold reads live state, uncached
    if (this.derivedVersion !== this.stateVersion) {
      this.derivedMap.clear();
      this.derivedVersion = this.stateVersion;
    }
    if (this.derivedMap.has(key)) return this.derivedMap.get(key) as T;
    const value = compute();
    this.derivedMap.set(key, value);
    return value;
  }

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
    // **A refused event must never reach the log** (Q679) — the same rule
    // and the same reason as `@draft/constitution`'s own `emit`: the clock
    // check lived in `apply`, which ran *after* the push, so a backwards
    // timestamp left a validly-hashed entry in the chain that `replay`
    // then threw on for ever. The engine reaches it by its own road: a
    // close runs at `windowEndMs`, and an ending moved to a time already
    // past makes that earlier than the log's last event.
    if (event.t < this.lastT) throw new Error('timestamps must be non-decreasing');
    const prevHash = this.log.length > 0 ? this.log[this.log.length - 1]!.hash : '';
    const seq = this.log.length;
    const hash = chainHash(prevHash, event);
    // the version rides the envelope, never the hash (Q480(a))
    this.log.push({ seq, hash, prevHash, event, schemaVersion: SCHEMA_VERSION });
    this.apply(event, seq);
  }

  private apply(event: Event, seq: number): void {
    if (event.t < this.lastT) throw new Error('timestamps must be non-decreasing');
    // the state is about to change: nothing derived before this survives,
    // and nothing is derived *during* it (see `derived`)
    const outer = this.applying; // a fold that folds (never today) stays uncached throughout
    this.applying = true;
    try {
      this.applyEvent(event, seq);
    } finally {
      this.applying = outer;
      this.stateVersion += 1;
    }
  }

  private applyEvent(event: Event, seq: number): void {
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
          ...(event.signed ? { signed: true } : {}),
          ...(event.disclosure ? { disclosure: event.disclosure } : {}),
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
        const stored: StoredComparison = {
          seq,
          t: event.t,
          participantId: event.participantId,
          aId: event.aId,
          bId: event.bId,
          kind: event.kind,
          outcome: event.outcome,
          groundId,
        };
        this.comparisons.push(stored);
        if (event.kind === 'edge' && groundId !== null) {
          const g = this.edgesByGround.get(groundId);
          if (g) g.push(stored); else this.edgesByGround.set(groundId, [stored]);
          for (const id of [event.aId, event.bId]) {
            if (id.startsWith(INC_PREFIX)) continue;
            const b = this.edgesByCandidate.get(id);
            if (b) b.push(stored); else this.edgesByCandidate.set(id, [stored]);
          }
        }
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
            if (race) this.raceRules.updatePeaks(race);
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
        this.exitCandidate(event.id, 'retired', event.t, event.reason ?? 'retired', event.refund);
        break;
      }
      case 'candidate-awaiting-assent': {
        // The park (§9.7 rule 8, R-056). Everything the adoption fold does
        // is deliberately **not** done here: no version, no rebase, no
        // refund, no exit, and `lastAdoptionT` untouched — the document did
        // not change. The fit cache is cleared because the candidate has
        // left `races()`, which is what takes it out of every feed.
        const c = this.candidate(event.id);
        c.state = 'awaiting-assent';
        c.awaiting = { raceId: event.raceId, p: event.p, threshold: event.threshold,
          // the cap mark rides the park with the numbers (R-051); absent
          // stays absent, so a log written before it existed folds the same
          ...(event.cappedFit ? { cappedFit: event.cappedFit } : {}) };
        this.fitCache.clear();
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
      case 'text-decreed': {
        // ✒️ on the Text (R-058). Everything `candidate-submitted` does about
        // money is deliberately absent — no `spend`, no `credit`, no
        // `performanceRefund`: nothing was staked, so nothing is refunded, and
        // `stakePaid: 0` is what keeps a later reader from computing one.
        // Everything `adopted` does about the *document* is present, because
        // the document really did change: the version, `lastAdoptionT` (the
        // cooldown metronome is spent, §4.2) and the fit cache.
        this.candidates.set(event.id, {
          id: event.id,
          author: event.author,
          rationale: event.rationale,
          patch: event.patch,
          footprint: footprint(event.patch.hunks),
          state: 'adopted',
          stakePaid: 0,
          peakW: 0,
          redrafts: 0,
          // the base standing now, stamped for good (entry 31), exactly as a
          // submitted candidate's is — `authorVisible` reads the same field
          // whichever door the candidate came through
          disclosure: this.constitutionValue.authorshipVisibility,
        });
        this.supporters.set(event.id, new Set([event.author]));
        this.versions.push(applyPatch(this.currentLines(), event.patch.hunks));
        this.candidate(event.id).exit = { t: event.t, cause: 'decreed', refund: 0 };
        this.lastAdoptionT = event.t;
        this.fitCache.clear();
        // a clerk holds no seat, and `touchParticipant` is already a no-op
        // off the roster — the author rule needs no guard of its own here
        this.touchParticipant(event.author, event.t);
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
        // revised, not merely confirmed (SPEC §2.4, Q170)
        if (event.rationale !== undefined) c.rationale = event.rationale;
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
      case 'candidate-undecided': {
        this.exitCandidate(event.id, 'undecided', event.t, 'undecided', event.refund);
        break;
      }
      case 'closed': {
        this.closedFlag = true;
        this.closedT = event.t;
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
      const ra = this.raceRules.raceIdOfEndpoint(aId);
      const rb = this.raceRules.raceIdOfEndpoint(bId);
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

  /** When the document closed (SPEC §4.6), or null while it is open. */
  get closedAt(): number | null {
    return this.closedT;
  }

  /**
   * A windowed document has an end to cross. A perpetual one is pinned
   * with a zero-span window (the adapter's convention for a fixed bar),
   * and the clock never closes it — only a host's explicit `close` does.
   */
  private windowed(): boolean {
    const { windowStartMs, windowEndMs } = this.constitutionValue;
    return windowEndMs > windowStartMs;
  }

  /**
   * The close is due (SPEC §4.6): a windowed document whose end the clock
   * has reached. The engine does not act on this itself — the host drives
   * the close through `tick`/`close` the way it drives freeze and lapse
   * (the constitution's own clock crosses the ending in the same beat) —
   * so an act carrying an arbitrary later timestamp is never a close.
   */
  dueToClose(t: number): boolean {
    return !this.closedFlag && this.windowed() && t >= this.constitutionValue.windowEndMs;
  }

  /**
   * T=0 (SPEC §4.6): a final adoption batch regardless of cooldown phase,
   * the ready set snapshotted here; then every race still live records
   * the third outcome, *undecided* — setting races included, whose motions
   * the host then holds — with the refund 0, since tokens are worthless at
   * the close (§7); then `closed`.
   */
  private runClose(t: number): void {
    this.sweepAdoptions(t, /* final */ true);
    for (const r of this.races()) {
      for (const id of r.members) {
        if (this.candidate(id).state !== 'live') continue;
        this.emit({ type: 'candidate-undecided', t, id, raceId: r.id, refund: 0 });
      }
    }
    // A candidate parked awaiting the convenor's assent (§9.7 rule 8) is
    // unresolved at the close in exactly §4.6's sense, and it is not in any
    // race any more, so the loop above cannot see it. This covers a park
    // from an earlier batch **and** one the final batch just made: a text
    // leader that clears the bar at T=0 under the shield is neither adopted
    // nor left waiting for an answer nobody has time to give — it is
    // undecided, like every other question the clock caught. The host's
    // 👑 question fails closed beside it, so the record says both: the room
    // passed it, and nobody assented.
    for (const c of [...this.candidates.values()]) {
      if (c.state !== 'awaiting-assent') continue;
      this.emit({ type: 'candidate-undecided', t, id: c.id,
        raceId: c.awaiting?.raceId ?? `r:${c.id}`, refund: 0 });
    }
    this.emit({ type: 'closed', t });
  }

  get totalEdgeComparisons(): number {
    return this.edgeCount;
  }

  private assertOpen(): void {
    if (this.closedFlag) throw new DocumentClosedError(this.closedT ?? this.lastT);
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

  /**
   * The wallet with its clock (stage 8, Q503a): the balance, when the next
   * drip lands (engine time), the interval, and the cap. `nextDripT` is
   * Infinity when the document does not drip.
   */
  ledgerInfo(participantId: string, t: number): {
    balance: number; nextDripT: number; dripIntervalMs: number; cap: number;
  } {
    const ledger = this.rosterEntry(participantId).ledger;
    const balance = balanceAt(ledger, this.constitutionValue, t);
    const interval = dripIntervalMs(this.constitutionValue);
    const drips = Number.isFinite(interval) && interval > 0;
    return { balance, nextDripT: drips ? ledger.nextDripT : Infinity,
      dripIntervalMs: drips ? interval : Infinity, cap: this.constitutionValue.tokenCap };
  }

  /** The id of the live race holding a candidate, as `races()` names it. */
  private raceIdOf(candidateId: string): string {
    const r = this.races().find((x) => x.members.includes(candidateId));
    return r ? r.id : `r:${candidateId}`;
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
  /**
   * Every comparison with its supersession and lock flags, once per state
   * version (Q1324): the host reads it for every seat's ledger on every
   * poll, and it is a walk over every judgment the session holds. A fresh
   * array each call over shared, read-only entries.
   */
  judgments(): JudgmentView[] {
    return this.derived('judgments', () => this.buildJudgments()).slice();
  }

  private buildJudgments(): JudgmentView[] {
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
      /**
       * The author signs it (SPEC §3.5a, Q770): named from submission. The
       * engine records the choice and does not judge whether the document
       * offers it — that gate is the host's (`propose-text`), which knows
       * the rung's elective half; the engine knows only the base.
       */
      signed?: boolean;
      /** A text proposal (SPEC §2.1) — exactly one of patch/setting. */
      patch?: PatchSet;
      /** An ordinary motion's proposed value (SPEC §9.6, Q390). */
      setting?: { settingId: string; value: unknown };
    },
  ): { id: string; raceId: string | null } {
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
      ...(input.signed ? { signed: true } : {}),
      // the base standing now, stamped on the candidate for good (entry 31):
      // a later 👤 motion never re-reads it. A setting candidate (Q390) takes
      // the same stamp; nothing reads it there, and one shape beats two.
      disclosure: this.constitutionValue.authorshipVisibility,
    });
    this.fitCache.clear();
    // A submission is the last moment a document of one can be waiting for
    // (backlog 253): the derived preference is the room there, so the batch
    // is due now rather than at the next `tick`. Field-wide and cooldown-
    // gated exactly as `judge`'s sweep is, and here in the command rather
    // than in the fold, because adoption emits events and must never run
    // during replay.
    this.sweepAdoptions(t);
    // **The race is read after the sweep, and it is read by membership.** At
    // E = 1 the sweep above can adopt the candidate this call just made, and
    // an adopted candidate is in no live race — a `raceId` returned regardless
    // would hand the caller an id `raceOf` throws on, the trap moved one step
    // out of the engine. So the handle is `null` where the candidate has left
    // the live field. `raceOf`'s throwing contract is right and is untouched:
    // the id is not unknown, it is *gone*, and that is a different fact.
    //
    // **And it is a membership lookup rather than an id comparison**, because
    // a race id is `r:<its lowest-numbered member>` and the sweep can rename
    // one without dissolving it: adopt a race's first member and the survivors
    // regroup under the next, and a rebase that separates two footprints
    // splits one race into two. Comparing the pre-sweep id against the live
    // field answers *does that id still exist*, which is neither the question
    // asked nor reliably the same answer — it returns `null` for a candidate
    // still racing, and a live id for a race the candidate has left.
    const race = this.races().find((r) => r.members.includes(id));
    return { id, raceId: race ? race.id : null };
  }

  /**
   * **The second door into the document** (SPEC §9.7 rule 8, R-058): ✒️ on
   * the Text, where the Founder's amendment passes the instant it is
   * submitted. Written here beside `submitCandidate` because the diff
   * between the two is the whole of what the pen is.
   *
   * It validates everything `submitCandidate` validates **about a patch** —
   * the base version, non-empty hunks, the hunks against the current line
   * count, the rationale cap — and deliberately does not: charge a stake,
   * check a balance, or require `activeParticipant`. The host is the gate
   * on *who may do this* (`textPen()` in `@draft/constitution`); the engine
   * knows only that somebody with the right did.
   *
   * `assertOpen()` still applies: a closed document takes no act.
   */
  decreeText(
    t: number,
    input: { author: string; patch: PatchSet; rationale: string },
  ): { id: string } {
    this.assertOpen();
    if (input.rationale.length > this.constitutionValue.rationaleMaxChars) {
      throw new Error(`rationale exceeds ${this.constitutionValue.rationaleMaxChars} chars`);
    }
    if (input.patch.baseVersion !== this.currentVersion()) {
      throw new Error(
        `patch targets version ${input.patch.baseVersion}; current is ${this.currentVersion()}`,
      );
    }
    if (input.patch.hunks.length === 0) throw new Error('empty patch');
    validateHunks(this.currentLines().length, input.patch.hunks);
    // **§4.2's park rule reaching the second door** (R-058, narrowed by
    // R-100). The sweep adopts no text across a parked span, and since R-100
    // `rebaseOthers` does rebase a parked patch — but only where the rebase
    // cannot cross its span, which the sweep guarantees by parking nothing
    // that overlaps and adopting nothing that overlaps. A decree is bound by
    // no footprint test at all, so the one way to keep the guarantee at this
    // door is to refuse the act while any park stands; whether a decree that
    // touches no parked line should pass instead is Ed's to rule, not this
    // door's to assume. Refusing is honest rather than restrictive: a Founder
    // holding both powers on the Text already owes the room an answer.
    if ([...this.candidates.values()].some((c) => c.state === 'awaiting-assent')) {
      throw new Error(
        'a text adoption is parked awaiting assent — answer it before amending (§9.7 rule 8)',
      );
    }
    const id = `c${++this.candidateCounter}`;
    const newVersion = this.currentVersion() + 1;
    this.emit({
      type: 'text-decreed',
      t,
      id,
      author: input.author,
      patch: input.patch,
      rationale: input.rationale,
      newVersion,
    });
    this.rebaseOthers(t, id, input.patch.hunks, newVersion);
    return { id };
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
    const kind = this.raceRules.classifyPair(aId, bId);
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
      raceId: this.raceIdOf(candidateId),
      refund: performanceRefund(c.stakePaid, c.peakW),
    });
  }

  /**
   * The convenor's answer to a parked text adoption (SPEC §9.7 rule 8,
   * R-056) — the other door beside `retire`, and the only way out of
   * `awaiting-assent` short of the close.
   *
   * **accept** adopts through the ordinary path, on the `p` and the
   * threshold recorded at the park: the room's confidence at the moment it
   * decided, not at the convenor's convenience. The cap mark (R-051) replays
   * with them, being a fact about that same moment and that same fit — the
   * shielded adoption is the likeliest of all to be read afterwards, and is
   * not the one receipt allowed to lie by omission. Everything downstream of
   * `adopted` — the version bump, the rebase of the field, the performance
   * refund, `lastAdoptionT`, the fit cache — runs unchanged.
   *
   * **refuse** retires it as a failed proposal at **refund 0**: a stake
   * that came back would price a refusal as a withdrawal. The reason is
   * the host's — the engine has never heard of a name.
   */
  assent(t: number, candidateId: string, outcome: 'accept' | 'refuse',
    reason?: string): Event[] {
    this.assertOpen();
    const c = this.candidate(candidateId);
    if (c.state !== 'awaiting-assent') {
      throw new Error(`candidate ${candidateId} is not awaiting assent (${c.state})`);
    }
    const parked = c.awaiting!;
    const before = this.log.length;
    if (outcome === 'accept') {
      this.adopt(t, candidateId, parked.p, parked.threshold, parked.raceId,
        parked.cappedFit);
    } else {
      this.emit({ type: 'candidate-retired', t, id: candidateId,
        raceId: parked.raceId, refund: 0, ...(reason ? { reason } : {}) });
    }
    return this.log.slice(before).map((e) => e.event);
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
  confirmRebase(t: number, candidateId: string, patch: PatchSet, rationale?: string): void {
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
    // **Revising is one of §2.4's three roads**, so the reason may be rewritten
    // with the wording (Q170). Optional and omitted where it is unchanged, so a
    // log written before this existed replays byte for byte.
    this.emit({ type: 'candidate-confirmed', t, id: candidateId, patch,
      ...(rationale === undefined ? {} : { rationale }) });
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

  /**
   * The host's explicit close (a sim's end, a perpetual document's freeze
   * turned final): the same T=0 sequence the clock runs (SPEC §4.6).
   */
  close(t: number): void {
    this.assertOpen();
    this.runClose(t);
  }

  // -------------------------------------------------------------------------
  // Races and ranking (SPEC §2.3, §4.1) — the rules are `races.ts`'s; these
  // are the doors

  /**
   * The live races, built once per state version (Q1324) and shared: the
   * array is a fresh copy each call, the `RaceView`s in it are the same
   * objects and are read, never written. `askOn`, `feed`, `judgments` and
   * the host's view all read this, so one judgment costs one rebuild
   * however many seats poll between it and the next.
   */
  races(): RaceView[] {
    return this.raceRules.races();
  }

  /** The live race holding a candidate; throws if it is not in one. */
  raceOf(candidateId: string): RaceView {
    return this.raceRules.raceOf(candidateId);
  }

  /** A race's Davidson fit over its usable comparisons (SPEC §4.1). */
  raceFit(raceId: string): Fit {
    return this.raceRules.raceFit(raceId);
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
  /**
   * The E = 1 half of the adoption gate (backlog 253, R-063): *the author is
   * the room*. True only where the one active participant left is the author
   * of the candidate about to carry — the case the rule was written for, and
   * the only one where the missing measurement can never arrive because there
   * is nobody but the author to make it.
   */
  private soleMemberIsLeadersAuthor(r: RaceView): boolean {
    if (r.leaderId === null) return false;
    let sole: string | null = null;
    for (const [id, entry] of this.roster) {
      if (entry.removed || entry.suspended) continue;
      if (sole !== null) return false; // more than one voice: not this rule
      sole = id;
    }
    return sole !== null && this.candidates.get(r.leaderId)?.author === sole;
  }

  private sweepAdoptions(t: number, final = false): void {
    if (this.closedFlag) return;
    // T=0 runs the batch regardless of cooldown phase (SPEC §4.6)
    if (
      !final &&
      this.lastAdoptionT !== null &&
      t - this.lastAdoptionT < this.constitutionValue.cooldownMs
    ) {
      return;
    }
    const threshold = this.adoptionThreshold(t);
    const floor = this.adoptionFloor();
    const ready = this.races()
      // `clearsBarAndFloor` is the test, shared with `races()`'s
      // `blockedByPark` (R-100). What it asks, and why:
      .filter((r) => this.raceRules.clearsBarAndFloor(r, threshold, floor))
          // Bar and floor, and then the helper's last clause, whose reason is
          // long enough to keep here beside the batch it governs.
          // The room must have spoken here at least once: two rival authors
          // meet a floor of 2 on derived self-preferences alone, and the
          // old one-race trigger enforced this structurally (adoption fired
          // only from a judgment in the race). Same doctrine as the refund:
          // the author's own preference is counted but is not the room.
          // `comparisons` is the view's own measured (non-derived) count.
          //
          // **Except at E = 1** (Ed, 2026-08-29, backlog 253; R-063). The
          // gate asks *has anybody but the author spoken*, and in a document
          // of one there is nobody else to ask — the author is the room, and
          // since the engine no longer serves them their own text against the
          // incumbent (R-062) the measurement it waits for can never arrive.
          // So the derived preference is both the floor and the room, and a
          // sole member's proposal adopts on submission. The bar still
          // applies: at θ = ½ the derived edge clears it, higher up it may
          // not, and the ceiling `ceilingNote` names is unchanged.
          //
          // **And *the author is the room* is the whole of the exception**, so
          // it is asked of the leader and not of E alone. A candidate outlives
          // its author's membership — only the author may withdraw — so a room
          // that has shrunk to one can hold a live candidate written by
          // somebody who has since been removed. There the sole member is not
          // the author, has said nothing, and *is* served the pair; letting the
          // bypass fire would carry text past the one person left before they
          // could answer it.
      // **The cap mark is read here, in the snapshot, and not at the `adopt`
      // call** (SPEC §4.2, R-051). `fitRaceMembers` is memoised on the
      // members, the incumbent and the last usable comparison's `seq`, so
      // this is a cache hit returning the very fit `buildRaceView` took
      // `leaderP` off — but the `adopted` fold clears `fitCache`, so by the
      // time the *second* ready race of a batch adopts, a refit would be a
      // different fit from the one the batch was decided on. That is the same
      // reason the ready set is snapshotted at all: one decision per race per
      // batch, on the evidence as it stood. Moving this lookup down into
      // `adopt`, where it is tidier, is wrong.
      //
      // `converged` is false in exactly one circumstance — the iteration cap
      // running out with the gradient still above tolerance — which is why
      // the record's word is *cap* and not *gradient*.
      .map((r): { leaderId: string; p: number;
        cappedFit?: { iterations: number; gradMax: number } } => {
        const fit = this.raceRules.fitRaceMembers(r.members, r.incumbentId);
        return {
          leaderId: r.leaderId as string,
          p: r.leaderP as number,
          // absent means converged, all the way out to the log (R-051)
          ...(fit.converged
            ? {}
            : { cappedFit: { iterations: fit.iterations, gradMax: fit.gradMax } }),
        };
      });
    // **NO TEXT ADOPTION ACROSS A PARKED SPAN** (R-056 as narrowed by R-100;
    // Ed, 2026-09-09, Q1179). This is the invariant the park rests on, and it
    // is stated here because it is the only thing standing between a parked
    // patch and a document that moved out from under it. `assent`'s accept
    // re-emits `adopted` with nothing but the numbers recorded at the park,
    // so the parked patch must still say what the room passed when the
    // answer comes. Since R-100 `rebaseOthers` does rebase a parked patch —
    // but a three-way rebase changes a patch's *lines* only where the
    // adopted hunks overlap its own, and this sweep never lets that happen:
    // nothing parks over a standing park, and nothing adopts over one. So
    // every rebase a park ever meets is textual composition (gate 1) — its
    // offsets move, its words cannot — which is what makes accept-in-any-
    // order safe, and what makes *park per footprint* still *the change the
    // room passed*. Any other door that adopts text has to honour the same
    // rule (`decreeText` refuses outright, being bound by no footprint), or
    // it silently applies hunks against lines they were never written for.
    //
    // A leader whose footprint overlaps a park — one standing, or one made
    // earlier in this batch — **waits like anybody** (§4.2's phrase for a
    // failed mid-batch rebase): it stays live and judgeable, `races()` marks
    // it `blockedByPark`, and it is looked at again next batch. Everything
    // else parks beside the standing parks, each its own 👑 question, oldest
    // race first as always.
    for (const { leaderId, p, cappedFit } of ready) {
      const c = this.candidate(leaderId);
      if (c.state !== 'live') continue;
      // a setting race is untouched by any of this (Q390): it carries no
      // patch, changes no text, and adopts in the same batch as before —
      // but it was decided by the same fit and takes the same mark (R-051)
      if (c.patch === undefined) {
        this.adopt(t, leaderId, p, threshold, undefined, cappedFit); continue;
      }
      // read fresh each time: a park made earlier in this batch is in the
      // set by its fold, and an adoption earlier in this batch has moved
      // every standing park's offsets through `rebaseOthers`
      if (this.raceRules.overlapsPark(c.footprint, this.raceRules.parkedFootprints())) continue;
      if (this.constitutionValue.textAssent) {
        this.emit({ type: 'candidate-awaiting-assent', t, id: leaderId,
          raceId: this.raceIdOf(leaderId), p, threshold,
          ...(cappedFit ? { cappedFit } : {}) });
        continue;
      }
      this.adopt(t, leaderId, p, threshold, undefined, cappedFit);
    }
  }

  /**
   * The host's clock (Ed, 2026-08-19): release any adoption batch the
   * cooldown has made due, without waiting for a judgment to serve as
   * the timer. No-op while nothing clears, and on a closed session.
   */
  tick(t: number): Event[] {
    const before = this.log.length;
    if (this.dueToClose(t)) this.runClose(this.constitutionValue.windowEndMs);
    else this.sweepAdoptions(t);
    return this.log.slice(before).map((e) => e.event);
  }

  /**
   * `raceId` is passed only by `assent` (R-056): a parked candidate is in
   * no live race, so `raceIdOf` would name it `r:<id>` and the record would
   * file the adoption apart from the race it was decided in.
   *
   * `cappedFit` is the cap mark (R-051), read by the caller off the fit the
   * batch was decided on — never looked up here, where `fitCache` may
   * already have been cleared by an earlier adoption in the same batch.
   * Both emit branches carry it: a setting race is decided by the same fit
   * and deserves the same honesty.
   */
  private adopt(t: number, candidateId: string, p: number, threshold: number,
    raceIdIn?: string, cappedFit?: { iterations: number; gradMax: number }): void {
    const winner = this.candidate(candidateId);
    const raceId = raceIdIn ?? this.raceIdOf(candidateId);
    const mark = cappedFit ? { cappedFit } : {};
    if (!winner.patch) {
      // A setting race carried (Q390): the verdict is recorded and the
      // stake refunded; the value lands via setStanding, host-called,
      // once any §9.7 assent is given. No version bump, no rebase.
      this.emit({
        type: 'adopted',
        t,
        candidateId,
        raceId,
        newVersion: this.currentVersion(),
        p,
        threshold,
        ...mark,
      });
      return;
    }
    const adoptedHunks = winner.patch.hunks;
    const newVersion = this.currentVersion() + 1;
    this.emit({ type: 'adopted', t, candidateId, raceId, newVersion, p, threshold, ...mark });
    this.rebaseOthers(t, candidateId, adoptedHunks, newVersion);
  }

  /**
   * **The ground shift, in one place** (SPEC §2.4, R-058). Every door that
   * moves the document rebases the field through this loop and no other —
   * `adopt` above, and `decreeText`'s pen — so *ground-shifted, not orphaned*
   * cannot drift between them. A live candidate on the same footprint is
   * rebased, or put into `rebase-pending` where the rebase genuinely
   * conflicts; **nothing retires anything**.
   *
   * Setting candidates have no text ground and are untouched (Q390).
   *
   * **A parked candidate is rebased too, and only ever across lines it does
   * not touch** (R-100, narrowing R-056's *never rebased*). `sweepAdoptions`
   * parks nothing over a standing park and adopts nothing over one, so the
   * hunks arriving here can never overlap a park's own span: the rebase is
   * textual composition (gate 1), the offsets move and the words do not,
   * and `awaiting` — the numbers the room decided on — is untouched. That is
   * the whole of what keeps a park *the change the room passed* while its
   * neighbours accept in any order. A rebase that fails on a park, or that
   * hands back different lines, is therefore not a ground shift but a bug in
   * the sweep's guarantee, and it **throws** naming both candidates rather
   * than quietly returning a passed change to its author as rebase-pending.
   * `decreeText` refuses while any park stands because a decree is bound by
   * no footprint test and could break the guarantee from the other door.
   *
   * `spec-check`'s `checkPenRebase` asserts in source that the pen reaches
   * this helper rather than a copy of its own.
   */
  private rebaseOthers(
    t: number,
    exceptId: string,
    adoptedHunks: Hunk[],
    newVersion: number,
  ): void {
    const others = [...this.candidates.values()].filter(
      (c) => (c.state === 'live' || c.state === 'awaiting-assent') &&
        c.id !== exceptId && c.patch !== undefined,
    );
    for (const c of others) {
      const result = rebaseHunks(c.patch!.hunks, adoptedHunks);
      if (c.state === 'awaiting-assent') {
        const same = result.ok && result.hunks.length === c.patch!.hunks.length &&
          result.hunks.every((h, i) => {
            const was = c.patch!.hunks[i]!;
            return h.lines.length === was.lines.length && h.lines.every((l, j) => l === was.lines[j]);
          });
        if (!same) {
          throw new Error(
            `adopting ${exceptId} would rebase parked ${c.id} across its own span — ` +
            'the sweep parks and adopts nothing over a standing park (R-100)',
          );
        }
      }
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
    return this.salienceWeightsOver(races, this.salienceFitOver(races));
  }

  /** salienceWeights over a fit already in hand (feed runs the fit once). */
  private salienceWeightsOver(races: RaceView[], fit: Fit | null): Map<string, number> {
    const ids = races.map((r) => r.id);
    const weights = new Map<string, number>();
    if (ids.length === 0) return weights;
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
    const fit = this.raceRules.fitRaceMembers(race.members, race.incumbentId);
    const threshold = this.adoptionThreshold(t);
    const usable = this.raceRules.usableComparisons(race.members, race.incumbentId);
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

  /**
   * Unresolved positions ranked by closeness × salience (SPEC §1). Live
   * while the document is open; after the close (SPEC §4.6) the backlog is
   * the *undecided* set — the races that never resolved — read from the
   * verdicts the close recorded, since `races()` is then empty.
   */
  backlog(t: number = this.lastT): Array<{ candidateId: string; raceId: string; score: number }> {
    const weights = this.salienceWeights();
    const threshold = this.adoptionThreshold(t);
    const out: Array<{ candidateId: string; raceId: string; score: number }> = [];
    if (this.closedFlag) {
      for (const e of this.log) {
        if (e.event.type !== 'candidate-undecided') continue;
        const c = this.candidate(e.event.id);
        const closeness = Math.min(c.peakW / threshold, 1);
        out.push({ candidateId: e.event.id, raceId: e.event.raceId,
          score: closeness * (weights.get(e.event.raceId) ?? 1) });
      }
    } else {
      for (const r of this.races()) {
        for (const m of r.members) {
          const closeness = Math.min(this.candidate(m).peakW / threshold, 1);
          out.push({ candidateId: m, raceId: r.id, score: closeness * (weights.get(r.id) ?? 1) });
        }
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
    // After the close (SPEC §4.6) the final batch already ran: the document
    // holds it and the log records what adopted at T=0. Report from there —
    // `races()` is empty now, and re-deriving would find nothing.
    if (this.closedFlag) {
      const applied: string[] = [];
      const appliedSettings: Array<{ settingId: string; candidateId: string }> = [];
      for (const e of this.log) {
        if (e.event.type !== 'adopted' || e.event.t !== this.closedT) continue;
        const c = this.candidate(e.event.candidateId);
        if (c.setting) appliedSettings.push({ settingId: c.setting.settingId, candidateId: c.id });
        else applied.push(c.id);
      }
      return { text: this.document(), applied, appliedSettings };
    }
    const races = this.races();
    const threshold = this.adoptionThreshold();
    const floor = this.adoptionFloor();
    const winners: Candidate[] = [];
    const appliedSettings: Array<{ settingId: string; candidateId: string }> = [];
    for (const r of races) {
      // the batch's own test (Q1337): bar, F judges of the leader, and the
      // room having judged it — the close renders nothing the sweep would not
      if (!this.raceRules.clearsBarAndFloor(r, threshold, floor)) continue;
      if (r.settingId !== undefined) {
        appliedSettings.push({ settingId: r.settingId, candidateId: r.leaderId! });
        continue;
      }
      winners.push(this.candidate(r.leaderId!));
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
  // Routing (SPEC §8) — the rules are `routing.ts`'s; these are the doors

  /** Mean in-bout response time; participants without data count as cheap. */
  judgmentCost(participantId: string): number | null {
    return this.routing.judgmentCost(participantId);
  }

  /** The pair a race can still ask this participant, dealt or not (Q1202). */
  askOn(participantId: string, raceId: string): Card | null {
    return this.routing.askOn(participantId, raceId);
  }

  /** A participant's feed (SPEC §8.3): one hand per seat per state version. */
  feed(participantId: string, n: number, t: number = this.lastT): Card[] {
    return this.routing.feed(participantId, n, t);
  }

  /** What the routing may read of this session: live closures, no copies. */
  private routingHost(): RoutingHost {
    return {
      derived: (key, compute) => this.derived(key, compute),
      edgesByCandidate: (id) => this.edgesByCandidate.get(id) ?? [],
      evidenceSince: (id) => this.evidenceSince.get(id),
      comparisons: () => this.comparisons,
      latenciesOf: (id) => this.rosterEntry(id).latencies,
      assertActive: (id) => { this.activeParticipant(id); },
      activeLatencies: () => [...this.roster.values()]
        .filter((r) => !r.removed && !r.suspended)
        .map((r) => r.latencies),
      servedOut: (participantId, key) => this.servedOut(participantId, key),
      authorOf: (id) => this.candidates.get(id)?.author,
      usableComparisons: (members, incumbentId) =>
        this.raceRules.usableComparisons(members, incumbentId),
      fitRaceMembers: (members, incumbentId) =>
        this.raceRules.fitRaceMembers(members, incumbentId),
      races: () => this.races(),
      eCount: () => this.eCount(),
      salienceFitOver: (races) => this.salienceFitOver(races),
      salienceWeightsOver: (races, fit) => this.salienceWeightsOver(races, fit),
      adoptionThreshold: (t) => this.adoptionThreshold(t),
      adoptionFloor: () => this.adoptionFloor(),
      constitution: () => this.constitutionValue,
      logLength: () => this.log.length,
    };
  }

  /** What the races may read of this session: live closures, no copies. */
  private racesHost(): RacesHost {
    return {
      derived: (key, compute) => this.derived(key, compute),
      candidates: () => this.candidates,
      candidate: (id) => this.candidate(id),
      edgesByGround: (incumbentId) => this.edgesByGround.get(incumbentId) ?? [],
      evidenceSince: (id) => this.evidenceSince.get(id),
      suspended: (id) => this.roster.get(id)?.suspended === true,
      settingStanding: (settingId) => this.settingsMap.get(settingId),
      currentLines: () => this.currentLines(),
      constitution: () => this.constitutionValue,
      adoptionThreshold: () => this.adoptionThreshold(),
      adoptionFloor: () => this.adoptionFloor(),
      fitCache: () => this.fitCache,
      maxPairValue: (fit, members, incumbentId, excludeJudgedBy, rivalGateOpen) =>
        this.routing.maxPairValue(fit, members, incumbentId, excludeJudgedBy, rivalGateOpen),
      soleMemberIsLeadersAuthor: (r) => this.soleMemberIsLeadersAuthor(r),
    };
  }
}
