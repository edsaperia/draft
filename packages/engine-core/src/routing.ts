/**
 * Routing (SPEC §8) — one policy, identical for everyone, seeded RNG.
 *
 * The serving half of the engine, lifted out of `session.ts` whole
 * (Q1352 (o), 2026-09-14): which pair a race can still ask a participant,
 * the hand `feed` deals from the hot set, the salience diagonals and the
 * exploration slot. Nothing here changes state; every read goes through
 * `RoutingHost`, the narrow view of the session these rules need, and the
 * session hands itself over as that host. The memo (`derived`, Q1324) is
 * the session's, so a hand is still one per seat per state version.
 *
 * `pairKey` / `contextKey` / `pairValue` live here because they are the
 * routing's vocabulary; the session imports them for the fold's own
 * bookkeeping of what has been judged on which ground.
 */

import type { Card, Constitution, RaceView } from './types.js';
import { INC_PREFIX } from './types.js';
import type { Fit } from './ranking/types.js';
import type { StoredComparison } from './session.js';
import { makeRng, type Rng } from './rng.js';

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Ground-contextual pair key (SPEC §4.4, Q50): edge pairs are keyed to
 * the ground they were judged on, so a material shift re-opens the pair
 * as a fresh question for everyone; diagonals (groundId null) are keyed
 * by the pair alone.
 */
export function contextKey(a: string, b: string, groundId: string | null): string {
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

/** What the routing reads of the session — reads only, every one live. */
export interface RoutingHost {
  /** The session's per-state-version memo (Q1324). */
  derived<T>(key: string, compute: () => T): T;
  /** Edge judgments touching a candidate, as the fold indexed them. */
  edgesByCandidate(id: string): readonly StoredComparison[];
  /** Comparisons at seq below this are dead for the candidate (SPEC §2.4). */
  evidenceSince(id: string): number | undefined;
  /** Every comparison in log order. */
  comparisons(): readonly StoredComparison[];
  /** Throws for an unknown participant. */
  latenciesOf(participantId: string): readonly number[];
  /** Throws for an unknown, removed or suspended participant. */
  assertActive(participantId: string): void;
  /** The latency samples of every participant still in E. */
  activeLatencies(): number[][];
  /** Feed exclusion: already judged on this ground (SPEC §4.4). */
  servedOut(participantId: string, key: string): boolean;
  authorOf(candidateId: string): string | undefined;
  usableComparisons(members: string[], incumbentId: string): StoredComparison[];
  fitRaceMembers(members: string[], incumbentId: string): Fit;
  /** The races as they stand at `t` — the floor rides the clock (Q1439). */
  races(t: number): RaceView[];
  eCount(): number;
  salienceFitOver(races: RaceView[]): Fit | null;
  salienceWeightsOver(races: RaceView[], fit: Fit | null): Map<string, number>;
  adoptionThreshold(t: number): number;
  constitution(): Constitution;
  logLength(): number;
}

export type BestPair = { aId: string; bId: string; value: number };

export class Routing {
  constructor(private readonly host: RoutingHost) {}

  /**
   * True when a race carries evidence locked by a ground shift or a
   * rebase confirmation — i.e. the race was re-opened (SPEC §4.4, Q50)
   * and its live members were judged before on ground that no longer
   * exists.
   */
  hasLockedEvidence(race: RaceView): boolean {
    // a walk over every comparison, per race — once per state version (Q1324)
    return this.host.derived(`locked|${race.id}`, () => this.scanLockedEvidence(race));
  }

  private scanLockedEvidence(race: RaceView): boolean {
    const memberSet = new Set(race.members);
    // a locked judgment touches at least one member (the test below), so the
    // members' own buckets hold every candidate; one between two members is
    // read twice, harmlessly — the answer is a boolean
    const pool = race.members.flatMap((m) => this.host.edgesByCandidate(m));
    for (const c of pool) {
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
        const since = this.host.evidenceSince(id);
        if (since !== undefined && c.seq < since) return true;
      }
    }
    return false;
  }

  /** Mean in-bout response time; participants without data count as cheap. */
  judgmentCost(participantId: string): number | null {
    const latencies = this.host.latenciesOf(participantId);
    if (latencies.length === 0) return null;
    return latencies.reduce((a, b) => a + b, 0) / latencies.length;
  }

  maxPairValue(
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
        if (excludeJudgedBy && this.host.servedOut(excludeJudgedBy, contextKey(a, b, incumbentId))) {
          continue;
        }
        const v = pairValue(fit, a, b);
        if (v > max) max = v;
      }
    }
    return max;
  }

  /**
   * **An author is never asked about their own text against the incumbent**
   * (Ed, 2026-08-29, backlog 253; SPEC §3.3, R-062). The answer is already
   * held — while a candidate is live its author prefers it to the current
   * text, derived and never stale — so serving the pair asks a question
   * whose answer the engine wrote itself. A **rival** pair of theirs is
   * untouched: by proposing you only say you beat the status quo, so which
   * of two challengers wins is a real question and stays one.
   *
   * The exclusion lives here rather than in `judge`, which still takes an
   * explicit own-vs-incumbent judgment and lets it supersede the derived
   * preference (R-062's *an explicit judgment always wins*); what changes
   * is only what is **served**.
   */
  private ownIncumbentPair(
    a: string,
    b: string,
    incumbentId: string,
    participantId: string,
  ): boolean {
    const other = a === incumbentId ? b : b === incumbentId ? a : null;
    if (other === null) return false;
    return this.host.authorOf(other) === participantId;
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
    leaderFirst: string | null = null,
  ): BestPair | null {
    const ids = [...members, incumbentId];
    const scan = (
      include: (a: string, b: string) => boolean,
    ): BestPair | null => {
      let best: BestPair | null = null;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = ids[i]!;
          const b = ids[j]!;
          if (!include(a, b)) continue;
          // in the scan itself, so both passes see it (R-062, backlog 253)
          if (this.ownIncumbentPair(a, b, incumbentId, participantId)) continue;
          if (this.host.servedOut(participantId, contextKey(a, b, incumbentId))) continue;
          const v = pairValue(fit, a, b);
          if (best === null || v > best.value) best = { aId: a, bId: b, value: v };
        }
      }
      return best;
    };
    // **The pair that decides it, first** (Q1439; SPEC §8.2's *the unheard are
    // asked at the moment their silence would be foreclosed*). Where a race is
    // short of its floor, the only answer that can move it is *the leader
    // against the current text* — an approval, now that the floor counts
    // those — and this member has not given one. Serving anything else first
    // spends their attention on a question the adoption does not turn on and
    // lets their period run out meanwhile. The scan's own exclusions still
    // apply, so an author is not asked about their own text (R-062) and a pair
    // already judged on this ground is skipped, in which case this falls
    // through to the ordinary value order below.
    if (leaderFirst !== null) {
      const decisive = scan((a, b) =>
        (a === leaderFirst && b === incumbentId) || (b === leaderFirst && a === incumbentId));
      if (decisive !== null) return decisive;
    }
    if (rivalGateOpen) return scan(() => true);
    const isIncumbentPair = (a: string, b: string): boolean =>
      a === incumbentId || b === incumbentId;
    return (
      scan(isIncumbentPair) ?? scan((a, b) => !isIncumbentPair(a, b))
    );
  }

  /**
   * **A deadlocked race still asks the members it has never heard from**
   * (SPEC §8.3b, R-072; Ed, 2026-09-07, Q1283). Deadlock is a fact about the
   * evidence so far, and a participant with no usable comparison on the race
   * is the one source of evidence that fact does not cover — their judgments
   * can tip it, or are what a bridge (§6.3) needs. So the race is served to
   * them as an ordinary race, and is disclosed as deadlocked only once it has
   * nothing left to ask them. One test, read by the feed and by the
   * empty-queue check alike.
   */
  private deadlockStillAsks(r: RaceView, participantId: string): boolean {
    if (!r.deadlocked) return false;
    const usable = this.host.usableComparisons(r.members, r.incumbentId);
    return !usable.some((c) => c.participantId === participantId);
  }

  /**
   * **What can still be asked of a participant on one race** (SPEC §8.3,
   * §8.3b; Q1202): the best pair `bestPairFor` would deal them — their own
   * incumbent pair skipped (R-062), every pair judged on this ground skipped
   * (§4.4), incumbent pairs first while the rival gate is shut — or null
   * once nothing is left; a deadlocked race asks only the members it has
   * never heard from (`deadlockStillAsks`). The one test, read by the feed's
   * two dealing loops, by the empty-queue check and by `askOn`, so the hand
   * and the per-race read can never disagree about whether a race still
   * wants this participant.
   */
  private askOnRace(r: RaceView, participantId: string): BestPair | null {
    if (r.deadlocked && !this.deadlockStillAsks(r, participantId)) return null;
    const fit = this.host.fitRaceMembers(r.members, r.incumbentId);
    // short of its floor as the batch reads it (Q1439): then the leader
    // against the current text is the pair that decides it, and it goes first
    const decisive = r.leaderId !== null && r.approvals < r.floor ? r.leaderId : null;
    return this.bestPairFor(
      fit, r.members, r.incumbentId, participantId, r.rivalGateOpen, decisive);
  }

  /** The edge card `feed` deals for a pair `askOnRace` found on a race. */
  private edgeCard(r: RaceView, best: BestPair): Card {
    return {
      kind: 'edge',
      subtype: best.aId === r.incumbentId || best.bId === r.incumbentId ? 'incumbent' : 'rival',
      aId: best.aId,
      bId: best.bId,
      raceId: r.id,
      value: best.value,
    };
  }

  /**
   * **The pair a race can still ask this participant, dealt or not**
   * (Q1202, Ed 2026-09-07: *if there are things you can do, it shows the
   * symbol of that action, even if it is not urgent*). The feed is a hand
   * of `n` drawn from the hot set, so a race can hold an unjudged pair for a
   * participant and still be absent from their hand; this is the per-race
   * read that says so, and hands over the pair — exactly the card `feed`
   * would deal on the race, built by the same test, so `judge` accepts it
   * as it accepts any dealt pair. Null for a race that has nothing left to
   * ask them, an unknown race, or a race of their own text alone (R-062).
   * Pure, like `feed`; blind, like `feed` — the routing value rides the
   * `Card` and the participant API strips it.
   *
   * **And it takes a clock since Q1439**: *whether* a pair is left to ask is
   * still clock-free, but *which* one comes first is not — a race short of its
   * floor leads with the leader against the current text, and whether it is
   * short depends on who has abstained by now.
   */
  askOn(participantId: string, raceId: string, t: number): Card | null {
    this.host.assertActive(participantId);
    const r = this.host.races(t).find((x) => x.id === raceId);
    if (!r) return null;
    const best = this.askOnRace(r, participantId);
    return best === null ? null : this.edgeCard(r, best);
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
  feed(participantId: string, n: number, t: number): Card[] {
    this.host.assertActive(participantId);
    // **One hand per seat per state version** (Q1324) — **and per floor**
    // (Q1439). The clock used to enter the feed in exactly one place,
    // `adoptionThreshold(t)`, a common divisor that moves no race past
    // another; since Q1439 it enters in two more — the unheard boost and the
    // decisive-pair preference both ask *is this race short of its floor*,
    // and a silence crosses its 💤 period with no event to mark it. So the
    // answer to that one question rides in the key: the hand is the same at
    // every `t` that reads the same races as short, which is every `t`
    // between two abstentions. The memo stays exact rather than approximate,
    // and it still hits across the page's 4s poll — keying on `t` itself
    // would miss on every poll and put back the read path the second moon
    // room measured (91% of a saturated host).
    const races = this.host.races(t);
    const short = races.filter((r) => r.approvals < r.floor).map((r) => r.id).join(',');
    return this.host
      .derived(`feed|${participantId}|${n}|${short}`,
        () => this.dealFeed(participantId, n, t, races))
      .slice();
  }

  private dealFeed(participantId: string, n: number, t: number, allRaces: RaceView[]): Card[] {
    // a deadlocked race leaves everybody's feed except the members it has
    // never heard from (§8.3b; until Q1283 it left every feed, and the
    // disclosure rule below was only half of the spec's sentence)
    const races = allRaces.filter((r) => !r.deadlocked || this.deadlockStillAsks(r, participantId));
    if (allRaces.length === 0) return [];
    const E = this.host.eCount();
    const liveQuestions = allRaces.length;
    const audienceGateOpen = E > 0 && liveQuestions >= E;
    const streamOpen = E > 0 && liveQuestions >= 2 * E;
    // One salience fit per feed call: the weights and every diagonal in
    // this call price against the same (deterministic) fit.
    const salienceFit = this.host.salienceFitOver(allRaces);
    const weights = this.host.salienceWeightsOver(allRaces, salienceFit);
    const threshold = this.host.adoptionThreshold(t);
    const constitution = this.host.constitution();
    const judgedRaces = new Set<string>();
    for (const r of races) {
      const usable = this.host.usableComparisons(r.members, r.incumbentId);
      if (usable.some((c) => c.participantId === participantId)) judgedRaces.add(r.id);
    }
    // Race value: closeness to adoption × salience — `leaderP / threshold`,
    // and since v0.128 (R-117) the threshold is a pinned constant divisor of
    // ½, so the factor is simply twice P(leader beats the current text) and
    // the *ordering* it produces is unchanged. Left as it is: the routing
    // weight is not an adoption test, and the deletion pass takes the divisor
    // with the rest. Races short of the
    // floor that this participant hasn't judged get the unheard boost
    // (SPEC §8.2) — **short of it as the batch reads it**, which since Q1439
    // is approvals against the race's own floor at this `t`, the two numbers
    // `clearsFloor` compares; ground-shifted races get the re-opened boost
    // until re-measured (SPEC §4.4, Q50 — near-adoption by construction, so
    // their fresh pairs price like new-candidate measurement or better).
    const valued = races
      .map((r) => {
        let v = ((r.leaderP ?? 0.5) / threshold) * (weights.get(r.id) ?? 1);
        if (r.approvals < r.floor && !judgedRaces.has(r.id)) v *= 1.25;
        if (r.comparisons < r.members.length && this.hasLockedEvidence(r)) {
          v *= constitution.reopenedBoost;
        }
        return { race: r, value: v };
      })
      .sort((a, b) => b.value - a.value || a.race.id.localeCompare(b.race.id));
    const hot = valued.slice(0, constitution.hotSetSize);

    const costs = this.host.activeLatencies()
      .filter((l) => l.length > 0)
      .map((l) => l.reduce((a, b) => a + b, 0) / l.length)
      .sort((a, b) => a - b);
    const myCost = this.judgmentCost(participantId);
    const median = costs.length > 0 ? costs[Math.floor(costs.length / 2)]! : null;
    const cheap = myCost === null || median === null || myCost <= median;

    const rng = this.feedRng(participantId);
    const cards: Card[] = [];
    const served = new Set<string>();
    let hotIndex = 0;
    // **No unheard slot** (Q1178, ruled by Ed 2026-09-09). From 2026-09-05
    // to 2026-09-09 the hand's leading slots went to the races this
    // participant had not judged that were still short of the floor,
    // least-measured first — a guarantee built against `room-walk`'s
    // finding that a fresh proposal reached nobody while the hot set held
    // older races. It went on Ed's ordering: serving never considers how
    // recently a card was made, only how close it is to resolving; the
    // least-measured are not prioritised; the races closest to sealing come
    // first — v / c_p alone, the exploration roll below the only push toward
    // a new race, §8.2's ×1.25 on `valued` a value and not a slot.
    // Reaching every live race is `askOn`'s job (Q1202): the server's view
    // carries a working pair per race the hand did not deal, so the hand
    // is an emphasis, never a gate on what a member can be asked.
    // §8.3a idle serving: with the audience gate open and nothing else to
    // judge, the diagonal simply arrives — capped so the participant is
    // never asked more than three in a row, counting ones already judged.
    let idleBudget = 0;
    if (audienceGateOpen &&
        this.nothingElseToJudge(participantId, allRaces, races, cheap)) {
      idleBudget = Math.max(0, 3 - this.trailingDiagonalRun(participantId));
    }
    for (let slot = 1; cards.length < n && slot <= n * 4; slot++) {
      let card: Card | null = null;
      // Seeded per-slot roll: ~1 in salienceEvery serves a diagonal (only
      // at saturation, §8.3a), ~1 in explorationEvery explores (SPEC
      // §8.3). A roll rather than a slot index so the mix holds even for
      // clients fetching one card at a time.
      const roll = rng.next();
      const pSalience = 1 / constitution.salienceEvery;
      const pExplore = 1 / constitution.explorationEvery;
      if (roll < pSalience) {
        if (streamOpen) card = this.diagonalCard(allRaces, salienceFit, participantId, served);
      } else if (cheap && roll < pSalience + pExplore) {
        card = this.explorationCard(races, participantId);
      }
      if (card === null && idleBudget > 0) {
        card = this.diagonalCard(allRaces, salienceFit, participantId, served);
        if (card !== null) idleBudget--;
      }
      if (card === null && hot.length > 0) {
        for (let tries = 0; tries < hot.length && card === null; tries++) {
          const { race } = hot[(hotIndex + tries) % hot.length]!;
          const best = this.askOnRace(race, participantId);
          if (best) card = this.edgeCard(race, best);
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
      `${this.host.constitution().rngSeed}/feed/${participantId}/${this.host.logLength()}`,
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
    fit: Fit | null,
    participantId: string,
    exclude: ReadonlySet<string>,
  ): Card | null {
    const withLeaders = allRaces.filter((r) => r.leaderId !== null);
    if (withLeaders.length < 2) return null;
    let best: { a: RaceView; b: RaceView; value: number } | null = null;
    for (let i = 0; i < withLeaders.length; i++) {
      for (let j = i + 1; j < withLeaders.length; j++) {
        const ra = withLeaders[i]!;
        const rb = withLeaders[j]!;
        const key = pairKey(ra.leaderId!, rb.leaderId!);
        if (exclude.has(key)) continue;
        if (this.host.servedOut(participantId, key)) continue;
        // An unmeasured ranking is always moved by a pair (value 1); a
        // fitted one prices the pair like any active sample.
        const v = fit === null ? 1 : pairValue(fit, ra.id, rb.id);
        if (best === null || v > best.value) best = { a: ra, b: rb, value: v };
      }
    }
    if (best === null) return null;
    if (fit !== null && best.value < this.host.constitution().deadlockEpsilon) {
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
    allRaces: RaceView[],
    races: RaceView[],
    cheap: boolean,
  ): boolean {
    for (const r of allRaces) {
      if (this.deadlockStillAsks(r, participantId)) return false;
    }
    for (const r of races) {
      if (this.askOnRace(r, participantId) !== null) return false;
    }
    if (cheap && this.explorationCard(races, participantId) !== null) return false;
    return true;
  }

  /** Consecutive diagonal judgments at the tail of a participant's history. */
  private trailingDiagonalRun(participantId: string): number {
    let run = 0;
    const comparisons = this.host.comparisons();
    for (let i = comparisons.length - 1; i >= 0 && run < 3; i--) {
      const c = comparisons[i]!;
      if (c.participantId !== participantId) continue;
      if (c.kind !== 'diagonal') break;
      run++;
    }
    return run;
  }

  private explorationCard(races: RaceView[], participantId: string): Card | null {
    // Least-measured live candidate, served against its incumbent — never
    // one of the participant's own, which would be their own text against
    // the incumbent by another door (R-062, backlog 253).
    let target: { race: RaceView; id: string; count: number } | null = null;
    for (const r of races) {
      const usable = this.host.usableComparisons(r.members, r.incumbentId);
      for (const m of r.members) {
        if (this.host.authorOf(m) === participantId) continue;
        const count = usable.filter((c) => c.aId === m || c.bId === m).length;
        if (target === null || count < target.count) target = { race: r, id: m, count };
      }
    }
    if (!target) return null;
    const key = contextKey(target.id, target.race.incumbentId, target.race.incumbentId);
    if (this.host.servedOut(participantId, key)) return null;
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
