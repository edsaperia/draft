/**
 * Races and their ranking (SPEC §2.3, §4.1) — what is competing with what,
 * and how the room's judgments rank it.
 *
 * The derived half of the engine, lifted out of `session.ts` whole
 * (Q1352 (p), 2026-09-14): the union-find over footprints that makes a race,
 * the `RaceView` each one publishes, the positional incumbent, the usable
 * comparison set behind every fit, the per-race Davidson fit and the peak a
 * candidate reached. Nothing here appends to the log; `updatePeaks` alone
 * writes, and only to a candidate's `peakW`. Every read goes through
 * `RacesHost`, the narrow view of the session these rules need, and the
 * session hands itself over as that host.
 *
 * The memo (`derived`, Q1324) stays the session's own — the state version it
 * keys on is bumped at every mutation the fold makes (Q1326), so a fold that
 * reads `races()` twice with the state changing between the reads still sees
 * both states, and one that reads it twice with nothing changing between pays
 * for one. Nothing here could hold that invariant, because nothing here can
 * see an event land; `updatePeaks` is the one writer in this file, and the
 * session touches for it.
 */

import type { Candidate, Constitution, PairKind, RaceView } from './types.js';
import { INC_PREFIX } from './types.js';
import type { Span } from './text/types.js';
import type { Comparison, Fit } from './ranking/types.js';
import { footprintsConflict } from './text/patch.js';
import { fitDavidson } from './ranking/davidson.js';
import { sha256Hex, stableStringify } from './hash.js';
import { pairKey } from './routing.js';
import type { StoredComparison } from './session.js';

/** Candidate ids are `c<n>`; the number orders them by submission. */
export function candidateNum(id: string): number {
  return Number(id.slice(1));
}

/** What the races may read of the session: live closures, no copies. */
export interface RacesHost {
  /** The session's per-state-version memo (Q1324). */
  derived<T>(key: string, compute: () => T): T;
  /** Every candidate the session holds, live and dead, by id. */
  candidates(): ReadonlyMap<string, Candidate>;
  /** Throws for an unknown candidate. */
  candidate(id: string): Candidate;
  /** Edge judgments cast on this ground, as the fold indexed them. */
  edgesByGround(incumbentId: string): readonly StoredComparison[];
  /** Comparisons at seq below this are dead for the candidate (SPEC §2.4). */
  evidenceSince(id: string): number | undefined;
  /** Out of E (SPEC §8.2): removed or lapsed, and false for a stranger. */
  suspended(participantId: string): boolean;
  /** The standing value of a setting (SPEC §9.6), opaque and hash-only. */
  settingStanding(settingId: string): unknown;
  /** The document as it stands, one entry per line. */
  currentLines(): readonly string[];
  constitution(): Constitution;
  adoptionFloor(): number;
  /** The session's per-race fit cache, cleared by every fold that moves it. */
  fitCache(): Map<string, { key: string; fit: Fit }>;
  /** The routing's active-sampling maximum over a race's pairs (SPEC §8.3). */
  maxPairValue(
    fit: Fit,
    members: string[],
    incumbentId: string,
    excludeJudgedBy: string | null,
    rivalGateOpen: boolean,
  ): number;
  /** The E = 1 half of the adoption gate (R-063): the author is the room. */
  soleMemberIsLeadersAuthor(r: RaceView): boolean;
}

export class Races {
  constructor(private readonly host: RacesHost) {}

  // -------------------------------------------------------------------------
  // What is racing (derived state, SPEC §2.3)

  /**
   * The live races, built once per state version (Q1324) and shared: the
   * array is a fresh copy each call, the `RaceView`s in it are the same
   * objects and are read, never written. `askOn`, `feed`, `judgments` and
   * the host's view all read this, so one judgment costs one rebuild
   * however many seats poll between it and the next.
   */
  races(): RaceView[] {
    return this.host.derived('races', () => this.buildRaces()).slice();
  }

  private buildRaces(): RaceView[] {
    const liveAll = [...this.host.candidates().values()].filter((c) => c.state === 'live');
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
    // **Waiting behind a park** (R-100): a text race whose leader would carry
    // this batch but whose footprint overlaps a standing park is passed over
    // by the sweep, and the view says so. The same two tests the sweep runs —
    // `clearsFloor` and `overlapsPark` — so the flag and the batch cannot
    // disagree about which race is waiting.
    const parks = this.parkedFootprints();
    const floor = this.host.adoptionFloor();
    for (const members of groups.values()) {
      members.sort((a, b) => candidateNum(a) - candidateNum(b));
      const view = this.buildRaceView(members);
      if (parks.length && this.clearsFloor(view, floor)) {
        view.blockedByPark = this.overlapsPark(this.host.candidate(view.leaderId!).footprint, parks);
      }
      views.push(view);
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
    const setting = this.host.candidate(members[0]!).setting;
    const contested = setting
      ? []
      : mergeSpans(members.flatMap((id) => this.host.candidate(id).footprint));
    const incumbentId = setting
      ? this.incumbentIdForSetting(setting.settingId)
      : this.incumbentIdFor(contested);
    const id = `r:${members[0]!}`;
    const fit = this.fitRaceMembers(members, incumbentId);
    const usable = this.usableComparisons(members, incumbentId);
    const movers = new Set(usable.map((c) => c.participantId));
    // **The top of the field, the current text among it** (Q1362, R-114): a
    // race's field is its live candidates *and* the current text, a candidate
    // authored by nobody and staked with nothing, and the document's text on
    // a footprint is whichever of them the ranking puts on top. So the leader
    // is the argmax of the *fitted strength* — the model's own ordering of the
    // field — and not the argmax of P(beats the incumbent), which is the right
    // statistic for a single challenger and the wrong one for a cyclic field:
    // where rivals sit in a cycle the two orderings disagree, and only the
    // strength ordering is the ranking's.
    let leaderId: string | null = null;
    let leaderStrength = -Infinity;
    for (const m of members) {
      const s = fit.strengths.get(m) ?? 0;
      if (s > leaderStrength) {
        leaderStrength = s;
        leaderId = m;
      }
    }
    // P(leader beats the current text): the record's number and the routing
    // weight. It gates nothing since v0.128 (R-117 pins the bar).
    const leaderP = leaderId === null ? null : fit.probBeats(leaderId, incumbentId);
    // The other half of the adoption test (R-114): the leader's strength
    // strictly greater than the current text's, which is to say the top of the
    // whole field is not the current text. Equal strengths are a tie, and a
    // tie leaves the current text standing — the one asymmetry that survives.
    const leaderOnTop =
      leaderId !== null && leaderStrength > (fit.strengths.get(incumbentId) ?? 0);
    const certification = leaderId === null ? null : 1 - (leaderP ?? 0.5);
    // **The floor counts judges of the winner** (Q1337, Ed 2026-09-11,
    // R-102). The moon room carried changes on 3 to 16 judgments in a room of
    // 168 under a quorum of 60%, and a room of fifteen adopted at p 0.88 with
    // one comparison touching the winner: `movers` above is every voice on
    // the race, and a race holding many rivals reaches F while its leader has
    // been judged by almost nobody. So the floor is read on the leader alone:
    // a usable comparison with the leader on either side — against the
    // incumbent or a rival, both are a judgment of it — one voice each. The
    // author's derived preference (§3.3) is a voice for its own candidate
    // and never touches another, so the leader's author counts once and a
    // rival's author not at all. `leaderMeasured` is R-063's line drawn at
    // the winner: how many of those judgments the room actually made.
    const onLeader = leaderId === null ? []
      : usable.filter((c) => c.aId === leaderId || c.bId === leaderId);
    const leaderJudges = new Set(onLeader.map((c) => c.participantId)).size;
    const leaderMeasured = onLeader.filter((c) => !c.derived).length;
    const rivalGateOpen = this.rivalGateOpen(fit, members, incumbentId, usable);
    // Deadlock considers only servable pairs: while the rival gate is
    // closed, unmeasured rival pairs must not hold a race open — there
    // is little decision value in finely ranking challengers that are
    // all losing to the status quo (SPEC §8.3).
    // Measured evidence only: a derived author preference is a preference, not
    // a measurement, so it cannot help a race look sufficiently sampled.
    const measured = usable.filter((c) => !c.derived);
    const bestValue = this.host.maxPairValue(fit, members, incumbentId, null, rivalGateOpen);
    const deadlocked =
      measured.length >= this.host.constitution().deadlockMinComparisons &&
      bestValue < this.host.constitution().deadlockEpsilon;
    // **Progress toward the quorum** (Q1362 (c), Ed 2026-09-15, R-118): the
    // leader's judges over the floor, clamped — voters so far over voters
    // required, the one number the room controls. The lesser-of-two-distances
    // reading (R-101) is superseded with the bar it measured against: there is
    // no distance to a bar left to be the shorter of. Still a magnitude and
    // never a direction (SPEC §8.3) — the count says how far the room has got,
    // and nothing about which way it is going. A newborn race reads 1/F, its
    // author being one judge of their own text, and each new judge is a step.
    const closeness = Math.min(1, leaderJudges / Math.max(1, this.host.adoptionFloor()));
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
      leaderJudges,
      leaderMeasured,
      leaderP,
      leaderId,
      leaderOnTop,
      certification,
      deadlocked,
      rivalGateOpen,
      closeness,
      // set by `races()` for a text race, which alone can wait behind a park
      blockedByPark: false,
      ...(setting ? { settingId: setting.settingId } : {}),
    };
  }

  /** The footprints of every candidate parked `awaiting-assent` (R-100). */
  parkedFootprints(): Span[][] {
    return [...this.host.candidates().values()]
      .filter((c) => c.state === 'awaiting-assent')
      .map((c) => c.footprint);
  }

  /** Does this footprint touch any of these parks? The classifier's own test. */
  overlapsPark(fp: Span[], parks: Span[][]): boolean {
    return parks.some((p) => footprintsConflict(fp, p));
  }

  /**
   * **Ready to carry** (SPEC §4.2; Q1362 (a), R-114): the leader is on top of
   * the field — the current text among it, and a tie leaving the current text
   * standing — F distinct participants have judged *it* (Q1337, R-102 — never
   * the race at large), and the room has judged it at least once, or, at
   * E = 1, the author is the room (`soleMemberIsLeadersAuthor`). There is no
   * bar: the threshold left the test at v0.128. One function, read by the
   * sweep's snapshot, by `finalRender` and by `races()`'s `blockedByPark`, so
   * none can drift.
   */
  clearsFloor(r: RaceView, floor: number): boolean {
    return r.leaderJudges >= floor &&
      r.leaderId !== null &&
      r.leaderOnTop &&
      (r.leaderMeasured > 0 || this.host.soleMemberIsLeadersAuthor(r));
  }

  /**
   * The rival-pair gate (SPEC §8.3, Q48): open once at least one
   * challenger plausibly displaces the incumbent — posterior
   * P(challenger beats incumbent) above rivalGateProb on at least
   * rivalGateMinComparisons incumbent-involving comparisons (current
   * ground). The minimum-evidence clause exists because the no-data prior
   * sits exactly at 0.5.
   *
   * Since v0.128 (R-117) `rivalGateProb` of 0.5 makes this predicate the
   * adoption predicate less the floor — *some challenger is preferred to the
   * current text* — which is the intended reading of R-071 and not a
   * coincidence: the gate asks whether displacement is plausible at all, and
   * with the bar gone that question is the same question adoption asks.
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
        n >= this.host.constitution().rivalGateMinComparisons &&
        fit.probBeats(m, incumbentId) > this.host.constitution().rivalGateProb
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

  raceIdOfEndpoint(id: string): string | null {
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
    const lines = this.host.currentLines();
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
    const standing = stableStringify(this.host.settingStanding(settingId));
    return INC_PREFIX + sha256Hex(`setting:${settingId}\u0000${standing}`).slice(0, 16);
  }

  classifyPair(aId: string, bId: string): PairKind {
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

  /**
   * Per race and per state version (Q1324): the race view, its fit, the
   * rival gate, the deadlock test and the feed each asked for this, and each
   * walked every comparison the session holds — once per race per seat per
   * poll. Shared and read-only, like `races()`.
   */
  usableComparisons(members: string[], incumbentId: string): StoredComparison[] {
    return this.host.derived(`usable|${members.join(',')}|${incumbentId}`,
      () => this.buildUsableComparisons(members, incumbentId));
  }

  private buildUsableComparisons(members: string[], incumbentId: string): StoredComparison[] {
    const memberSet = new Set(members);
    // only judgments cast on this race's ground can be usable (the ground
    // lock below), and the ground bucket holds exactly those, in seq order
    const filtered = this.host.edgesByGround(incumbentId).filter((c) => {
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
          const since = this.host.evidenceSince(id);
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
      const cand = this.host.candidates().get(m);
      if (!cand) continue;
      // A suspended author is out of E (§8.2), and a voice out of E cannot be
      // a mover toward a floor: the applicant authoring their own admit race
      // (§9.7.3 X11, Q583) is the case this was written for, and a lapsed
      // author falls under the same definition. Their judgments *cast* keep
      // counting (§9.5a); a derived preference was never cast.
      if (this.host.suspended(cand.author)) continue;
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

  fitRaceMembers(members: string[], incumbentId: string): Fit {
    const usable = this.usableComparisons(members, incumbentId);
    const raceId = `r:${members[0] ?? 'none'}`;
    const key = `${members.join(',')}|${incumbentId}|${usable.length}|${
      usable.length > 0 ? usable[usable.length - 1]!.seq : -1
    }`;
    const cached = this.host.fitCache().get(raceId);
    if (cached && cached.key === key) return cached.fit;
    const ids = [...members, incumbentId];
    const comps: Comparison[] = usable.map((c) => ({
      a: c.aId,
      b: c.bId,
      outcome: c.outcome,
    }));
    const fit = fitDavidson(ids, comps);
    this.host.fitCache().set(raceId, { key, fit });
    return fit;
  }

  raceFit(raceId: string): Fit {
    const race = this.races().find((r) => r.id === raceId);
    if (!race) throw new Error(`unknown race ${raceId}`);
    return this.fitRaceMembers(race.members, race.incumbentId);
  }

  updatePeaks(race: RaceView): void {
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
      const cand = this.host.candidate(m);
      const w = fit.probBeats(m, race.incumbentId);
      if (w > cand.peakW) cand.peakW = w;
    }
  }
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
