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
 * **And a race moves with the clock since Q1439**, not only with the log: a
 * silence becomes an abstention when 💤's period runs, with no event to mark
 * it, so the floor is a function of `t`. The split is the discipline that
 * keeps the memo honest — the memo holds `RaceCore` and `ApprovalCore`, which
 * the state alone decides (who approved, who opposed, and when each awaited
 * member's period began), and `viewAt` puts the clock's own numbers on top at
 * every call. Nothing time-dependent may move into `buildRaces`, and
 * `races()` without a `t` does not exist: the session's door defaults it to
 * `lastT`, which is the only honest default a pure fold has.
 *
 * The memo (`derived`, Q1324) stays the session's own — the state version it
 * keys on is bumped at every mutation the fold makes (Q1326), so a fold that
 * reads `races()` twice with the state changing between the reads still sees
 * both states, and one that reads it twice with nothing changing between pays
 * for one. Nothing here could hold that invariant, because nothing here can
 * see an event land; `updatePeaks` is the one writer in this file, and the
 * session touches for it.
 */

import type { Candidate, Constitution, Domination, PairKind, RaceView } from './types.js';
import { INC_PREFIX } from './types.js';
import type { Span } from './text/types.js';
import type { Comparison, Fit } from './ranking/types.js';
import { footprintsConflict } from './text/patch.js';
import { fitDavidson } from './ranking/davidson.js';
import { smithSet } from './ranking/smith.js';
import { sha256Hex, stableStringify } from './hash.js';
import { pairKey } from './routing.js';
import type { StoredComparison } from './session.js';

/**
 * How far above the current text's strength a leader must sit to be *on top*
 * (Q1362, R-114): a tolerance, since two strengths the fit meant to be equal
 * differ by an optimiser residual of ~1e-16 whose sign follows the order the
 * judgments arrived in. One judgment moves a strength by ~1e-1 in any room.
 */
const TIE_EPS = 1e-9;

/** Candidate ids are `c<n>`; the number orders them by submission. */
export function candidateNum(id: string): number {
  return Number(id.slice(1));
}

/**
 * **F = max(Q′, min(2, E))** (SPEC §4.2; Q1439 → why: R-125, R-131; Q1490 →
 * why: R-139).
 *
 * **Q′ is read against the group** the leader is waiting on — its approvers,
 * its opposers and the members of E it is still awaiting — because a quorum is
 * what the room asks of the people who are actually deciding this question,
 * and a silence that has run its 💤 period is not one of them (§8.2). Q′ is a
 * share of that group, rounded up, or a fixed count; and **in either form
 * never more than the whole of it** (R-139, Ed 2026-09-21, reversing R-126's
 * cap at half): a membership that wants unanimity may ask for it, and 💤 is
 * what keeps such a room moving — a silence that has run its period leaves
 * the group, so 100% is four of four where four are still deciding. The cap
 * that is left binds the **count** form alone, which E moves under: however
 * few are left, the quorum never outgrows them (§9.5a, R-088).
 *
 * **The built-in minimum of a third of E has gone** (Ed, 2026-09-18, Q1439
 * ruling s: *if the membership want a smaller quorum they should be able to
 * choose it* → why: R-131, reversing R-073): the card's number is the number
 * the room is held to, at every size.
 *
 * **What is left under it is a seconder** (ruling u, the same day, out of the
 * churn re-run): **never fewer than two approvals**, the author and one other
 * member preferring the candidate to the current text. One is no floor at all
 * — the author's own derived preference (§3.3) is the one — and the sims
 * measured what that costs: a room of fifteen made 904 adoptions in a month at
 * a floor of 1, 888 of them reversions, the text never settling.
 * `min(2, E)` rather than a flat 2, because at E = 1 the sole member is the
 * room (R-063, unchanged) and at E = 2 it is unanimity. **The seconder is
 * counted on E and not on the group**: it is a sufficiency rule about the
 * room, not a consent rule about the people still deciding.
 *
 * The share's arithmetic is `⌈n·G/100⌉`, **the product before the quotient**
 * (issue #24): `(n / 100) * G` is not the same number, and 56 % of 25 landed a
 * hair above 14. `populations.ts`'s `adoptionFloor` keeps the constitution
 * layer's copy of this line, and `floor-agreement.test.ts` holds the two
 * equal — they move together or not at all.
 */
export function floorFor(c: Constitution, e: number, group: number): number {
  const q = c.quorum;
  const asked = q === null ? 0 : q.form === 'count' ? q.n : Math.ceil((q.n * group) / 100);
  const quorumN = Math.min(asked, group);
  return Math.max(quorumN, Math.min(2, e));
}

/**
 * **The engine arms of the Q1538/Q1539 sim study** (plan Stage 5): process-wide
 * dev switches, like `Session.memo`, so `smith-study.ts` can run `main`, A and
 * A+B over one room. **Both on in every shipped path; removed at the merge.**
 * The memo does not key on them — flip them only between sessions.
 */
export const ARMS = { rivalMeasure: true, smith: true };

/**
 * **The time-free half of a race** (Q1439): everything the state alone
 * decides, which is what the session's per-state-version memo may hold.
 * Since v0.142 (Q1538, Q1539) that is less than it was: which pairs are
 * **measured** depends on each pair's own floor, which moves when a silence
 * runs its 💤 period, so the Smith set, and with it the leader and everything
 * read off the leader, is the clock's — `viewAt` computes it from the per-pair
 * tallies below, which the state alone decides.
 */
type RaceCore = Pick<RaceView, 'id' | 'members' | 'contested' | 'incumbentId' | 'comparisons'
  | 'distinctMovers' | 'rivalGateOpen' | 'settingId'>;

/**
 * **One pair's tally, held in the shape that does not depend on the clock**
 * (Q1439, generalised to every pair by Q1538): who preferred each side, how
 * many answered at all, and — for each member of E who has not answered — the
 * moment their own period on this pair began (§8.2). Whether that period has
 * run is the only question left for `t`. For a candidate against the current
 * text this is the approval pair exactly: `for` the candidate is its
 * approvals, its author's derived preference among them (§3.3).
 */
interface PairCore {
  /** The two ends, `a` before `b` in the race's node order (members, then the current text). */
  a: string;
  b: string;
  /** Decisive answers for each end: answered, and in the pair's group wherever they now are. */
  forA: number;
  forB: number;
  /** Distinct members who answered, *Indifferent* included — the meter's count (Q1362 (d)). */
  answeredBy: number;
  /**
   * One awaited member of E per entry, with the moment their own period on
   * this pair began, in engine ms. **The id rides with the moment** (Q1460):
   * the countdown a member is shown is their own entry's `from` plus 💤's
   * period, so the number on the page and the number that abstains them are
   * read off the same row rather than recomputed by a second rule.
   */
  awaited: Array<{ id: string; from: number }>;
}

/** A pair read at `t`, from one end's side. */
interface PairAt {
  forX: number;
  forY: number;
  answeredBy: number;
  /** Members of E who have not answered, abstained or not — settled's count (R-132). */
  unanswered: number;
  awaitedAt: number;
  group: number;
  floor: number;
  /** Answered by its own floor, or settled: its lead beyond every member still to answer (R-142). */
  measured: boolean;
}

/** Everything the memo holds for one race. */
interface RaceBuild {
  core: RaceCore;
  fit: Fit;
  /** By `pairKey`, every pair of the race's nodes. */
  pairs: Map<string, PairCore>;
  /** Per candidate: distinct voices on it, and the room's own (non-derived) judgments of it. */
  judges: Map<string, { judges: number; measured: number }>;
  /** The time-free half of deadlock: enough evidence, and no pair left worth asking. */
  baseDeadlocked: boolean;
}

/** What the races may read of the session: live closures, no copies. */
export interface RacesHost {
  /** The session's per-state-version memo (Q1324). */
  derived<T>(key: string, compute: () => T): T;
  /** Every candidate the session holds, live and dead, by id. */
  candidates(): ReadonlyMap<string, Candidate>;
  /** Throws for an unknown candidate. */
  candidate(id: string): Candidate;
  /**
   * Edge judgments touching a candidate, as the fold indexed them (Q1441): the
   * ground-keyed bucket went with the race-wide ground, and this is the index
   * that survives it — a usable judgment shares no key with its race, only
   * with the candidates it names.
   */
  edgesByCandidate(id: string): readonly StoredComparison[];
  /** Comparisons at seq below this are dead for the candidate (SPEC §2.4). */
  evidenceSince(id: string): number | undefined;
  /** When that evidence reset landed (Q1439): the pair became answerable afresh. */
  evidenceSinceT(id: string): number | undefined;
  /** Out of E (SPEC §8.2): removed or lapsed, and false for a stranger. */
  suspended(participantId: string): boolean;
  /** E itself (SPEC §8.2), by id: arrived, non-removed, non-lapsed. */
  eMembers(): readonly string[];
  /**
   * When this member last arrived or returned (Q1439): `participant-added`,
   * or the later `participant-resumed` where they have lapsed and come back.
   * Nobody's period on a pair starts before they were there to be asked.
   */
  arrivalT(participantId: string): number;
  /**
   * When this ground first stood (Q1439; SPEC §4.4): the moment every answer
   * cast against the race as it now stands became answerable. Recorded by the
   * fold at each event that can move a ground, so a ground shift restarts
   * every member's period rather than abstaining the people who had answered.
   */
  groundSince(groundId: string): number;
  /** The standing value of a setting (SPEC §9.6), opaque and hash-only. */
  settingStanding(settingId: string): unknown;
  /** The document as it stands, one entry per line. */
  currentLines(): readonly string[];
  constitution(): Constitution;
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
  soleMemberIsLeadersAuthor(leaderId: string | null): boolean;
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
  races(t: number): RaceView[] {
    const builds = this.host.derived('races', () => this.buildRaces());
    // **One picture per state version *and per set of abstentions*** (Q1439,
    // extending Q1324). The clock enters a race in exactly one place — which
    // of the awaited have run out their 💤 period, on which pair — so the
    // views are identical at every `t` that reads the same abstentions, which
    // is every `t` between two of them. Keying on the abstentions rather than
    // on `t` keeps the memo exact *and* keeps it hitting: a key of `t` itself
    // would miss on every poll and rebuild every race view per seat per poll,
    // which is the read path the second moon room measured at 91% of a
    // saturated host.
    //
    // **One number is the whole key since Q1538**, though every pair now has
    // its own awaited set: on one state the abstentions only accumulate as
    // `t` grows, every expiry moment fixed, so the set of them passed by `t`
    // is nested in the set passed by any later `t` — and two nested sets of
    // the same size are the same set. The count of expiry moments at or
    // before `t`, over every pair of every race, names the picture exactly.
    // The array is a fresh copy each call and the views in it are shared and
    // read-only, exactly as before.
    const expiries = this.host.derived('raceExpiries', () => this.expiryMoments(builds));
    const passed = upperBound(expiries, t);
    return this.host.derived(`races@${passed}`, () => {
      const parks = this.parkedFootprints();
      const e = this.host.eMembers().length;
      return builds.map((b) => this.viewAt(b, t, e, parks));
    }).slice();
  }

  /** Every moment a silence on some pair runs its period, sorted; none where 💤 is *never*. */
  private expiryMoments(builds: RaceBuild[]): number[] {
    const after = this.host.constitution().abstainAfterMs ?? null;
    if (after === null) return [];
    const out: number[] = [];
    for (const b of builds) {
      for (const p of b.pairs.values()) for (const w of p.awaited) out.push(w.from + after);
    }
    return out.sort((x, y) => x - y);
  }

  /**
   * How many of the members awaited on this pair are still awaited at `t`:
   * everyone whose period has not run out, all of them where 💤 is *never*
   * (R-127, and R-089's letter — nothing is imputed from silence then).
   */
  private awaitedAt(p: PairCore, t: number): number {
    const after = this.host.constitution().abstainAfterMs ?? null;
    if (after === null) return p.awaited.length;
    return p.awaited.reduce((n, w) => n + (t < w.from + after ? 1 : 0), 0);
  }

  /**
   * **When this member's silence on this race becomes an abstention** (Q1460,
   * Ed 2026-09-18): their own entry in the race's awaited set plus 💤's
   * period, in engine ms — the moment `awaitedAt` above stops counting them,
   * read off the same row so the page's countdown and the abstention are one
   * number and not two rules.
   *
   * The unit is **the race's approval pair**, because that is the unit the
   * engine abstains on: the awaited set is the members of E who have not
   * answered the leader against the current text (§8.2, R-127). Null where
   * 💤 is *never*, where the race has no leader, where this seat is not
   * awaited — out of E, or it has answered that pair — and, deliberately,
   * never null merely because the moment has passed: the reader decides what
   * a run-out period says, and only the reader knows what `t` is.
   */
  abstainDeadline(raceId: string, participantId: string, t: number): number | null {
    const after = this.host.constitution().abstainAfterMs ?? null;
    if (after === null) return null;
    const builds = this.host.derived('races', () => this.buildRaces());
    const found = builds.find((b) => b.core.id === raceId);
    if (found === undefined) return null;
    // the leader is the clock's since v0.142 (the Smith set moves when a pair
    // becomes measured), so it is read off the view at `t`
    const leaderId = this.races(t).find((r) => r.id === raceId)?.leaderId ?? null;
    if (leaderId === null) return null;
    const pair = found.pairs.get(pairKey(leaderId, found.core.incumbentId));
    const mine = pair?.awaited.find((w) => w.id === participantId);
    return mine === undefined ? null : mine.from + after;
  }

  /**
   * **The clock's own numbers, put on a race** (Q1439; Q1538, Q1539): each
   * pair's group and floor as they stand at `t`, which pairs that makes
   * **measured** (R-142), the **Smith set** those measured results give
   * (R-143), the leader and whether it is on top read inside it, what can no
   * longer win, the pairs the leader still waits on, the meter over every
   * vote those pairs need, and the park flag — which asks `clearsFloor` and so
   * comes last. The per-pair tallies are the memo's, untouched.
   */
  private viewAt(b: RaceBuild, t: number, e: number, parks: Span[][]): RaceView {
    const { core, fit } = b;
    const c = this.host.constitution();
    const cur = core.incumbentId;
    const members = core.members;
    const nodes = [...members, cur];
    const seen = new Map<string, PairAt>();
    const pairAt = (x: string, y: string): PairAt => {
      const key = `${x}\u0000${y}`;
      const hit = seen.get(key);
      if (hit) return hit;
      const p = b.pairs.get(pairKey(x, y))!;
      const awaitedAt = this.awaitedAt(p, t);
      const answered = p.forA + p.forB;
      const group = answered + awaitedAt;
      const floor = floorFor(c, e, group);
      const unanswered = p.awaited.length;
      const forX = x === p.a ? p.forA : p.forB;
      const forY = x === p.a ? p.forB : p.forA;
      const at: PairAt = { forX, forY, answeredBy: p.answeredBy, unanswered, awaitedAt,
        group, floor,
        // **measured** (§4.2 → why: R-142): answered by the pair's own floor,
        // or **settled** — its lead larger than every member of E still to
        // answer it, the abstained among them, which is R-132's rival count
        // read the other way round and keeps settled time-free
        measured: answered >= floor || Math.abs(p.forA - p.forB) > unanswered };
      seen.set(key, at);
      return at;
    };
    const strength = (id: string): number => fit.strengths.get(id) ?? 0;

    // **The Smith set** (§4.2 → why: R-143): every node that reaches every
    // other through measured results it did not lose at its own link — an
    // unmeasured pair a gap, never a draw (Q1539 ruling 2) — at the close as
    // much as before it (Ed, 2026-09-25): a wording that reaches the top only
    // through an unmeasured pair does not pass, and the race files undecided
    const smith = ARMS.smith ? smithSet(nodes, (x, y) => {
      const p = pairAt(x, y);
      return p.measured && p.forX >= p.forY;
    }) : [];

    // **smith-rank**: the Smith set above the rest, the fit's order within each
    // part — and while the set is empty, the fit's order alone
    const rankAbove = (inS: ReadonlySet<string>) => (x: string, y: string): boolean =>
      (inS.has(x) && !inS.has(y)) ||
      (inS.has(x) === inS.has(y) && strength(x) > strength(y) + TIE_EPS);
    const topOf = (set: string[]): { leaderId: string | null; leaderOnTop: boolean } => {
      const inS = new Set(set);
      const within = members.some((m) => inS.has(m));
      // the strongest candidate in the set, or in the field where the set
      // holds none — so routing, the meter and `leaderP` always have a
      // challenger to talk about (argmax by strength, the oldest on a tie)
      let leaderId: string | null = null;
      let best = -Infinity;
      for (const m of members) {
        if (within && !inS.has(m)) continue;
        if (strength(m) > best) { best = strength(m); leaderId = m; }
      }
      // **on top** (§4.2; R-114, read inside the Smith set by R-143): above the
      // current text where the current text is in the set — equal within the
      // fit's noise a tie, and a tie leaves the current text standing — and
      // simply in the set where the current text is not. With the set empty
      // this is exactly the fit's rule of v0.141.
      const leaderOnTop = leaderId !== null && (set.length === 0
        ? best > strength(cur) + TIE_EPS
        : inS.has(leaderId) && (!inS.has(cur) || best > strength(cur) + TIE_EPS));
      return { leaderId, leaderOnTop };
    };
    const { leaderId, leaderOnTop } = topOf(smith);

    const dominated = this.dominations(b, e, pairAt, rankAbove(new Set(smith)));
    const closing = new Set(dominated.map((d) => d.id));

    // **the leader's own reading**: its approval pair, its judges, its rivals
    const reading = (id: string | null) => {
      if (id === null) {
        return { approvals: 0, group: 0, abstained: 0, floor: floorFor(c, e, 0), leaderJudges: 0,
          leaderMeasured: 0, leaderP: null, rivals: { measured: 0, of: 0 }, short: [] as string[] };
      }
      const p = pairAt(id, cur);
      // a rival the batch is about to close is not waited on — it is leaving
      // (§4.2); a race of one candidate waits on nothing
      const rivals = members.filter((m) => m !== id && !closing.has(m));
      const short = rivals.filter((r) => !pairAt(id, r).measured);
      return {
        approvals: p.forX,
        group: p.group,
        // **The silences the group has already lost** (Q1452): everyone awaited
        // on the pair, less those still awaited at `t`. Read here and nowhere
        // else, so the number the batch stamps on its record and the number the
        // page prints are the same arithmetic on the same moment.
        abstained: p.unanswered - p.awaitedAt,
        floor: p.floor,
        leaderJudges: b.judges.get(id)?.judges ?? 0,
        leaderMeasured: b.judges.get(id)?.measured ?? 0,
        // P(leader beats the current text): the record's number and the
        // routing weight. It gates nothing since v0.128 (R-117 pins the bar).
        leaderP: fit.probBeats(id, cur),
        rivals: { measured: rivals.length - short.length, of: rivals.length },
        short,
      };
    };
    const now = reading(leaderId);

    // **The pairs the leader waits on, in the order the router asks them**
    // (§8.2 → why: R-142): the leader against each live rival short of
    // measured, oldest rival first; then, where some node beats the leader
    // head to head, the pairs among those nodes still short — the current
    // text's first — since that is where a chain back to the leader (or the
    // Smith set's own top) has to be measured.
    const measureShort: string[] = [];
    if (ARMS.rivalMeasure && leaderId !== null) {
      for (const r of now.short) measureShort.push(pairKey(leaderId, r));
      if (ARMS.smith) {
        const beaters = nodes.filter((n) => {
          if (n === leaderId || closing.has(n)) return false;
          const p = pairAt(n, leaderId);
          return p.measured && p.forX > p.forY;
        }).sort((x, y) => Number(y === cur) - Number(x === cur));
        for (let i = 0; i < beaters.length; i++) {
          for (let j = i + 1; j < beaters.length; j++) {
            if (!pairAt(beaters[i]!, beaters[j]!).measured) {
              measureShort.push(pairKey(beaters[i]!, beaters[j]!));
            }
          }
        }
      }
    }

    // **meter-need** (§8.3 → why: R-118, R-142; Q1538 ruling 1): the votes cast
    // on every pair the leader waits on, over the votes those pairs still
    // need — the leader against the current text counted to its floor, and
    // once there always wanting one vote more than it has; each rival pair
    // short of measured counted to its own floor. Answers, never approvals,
    // so a vote either way moves it alike, and never full on a live race.
    let got = 0;
    let need = 0;
    if (leaderId !== null) {
      const p = pairAt(leaderId, cur);
      const n = p.answeredBy;
      const nd = n < p.floor ? p.floor : n + 1;
      got += Math.min(n, nd);
      need += nd;
      if (ARMS.rivalMeasure) {
        for (const r of now.short) {
          const q = pairAt(leaderId, r);
          got += Math.min(q.answeredBy, q.floor);
          need += q.floor;
        }
      }
    }

    // **never deadlocked while a pair it waits on is short** and somebody of
    // that pair's group could still answer it (§8.3 → why: R-142)
    const deadlocked = b.baseDeadlocked && !measureShort.some((k) => {
      const [x, y] = k.split('|') as [string, string];
      return pairAt(x, y).awaitedAt > 0;
    });

    const { short: _short, ...leaderNumbers } = now;
    const view: RaceView = {
      ...core,
      ...leaderNumbers,
      leaderId,
      leaderOnTop,
      certification: leaderId === null ? null : 1 - (now.leaderP ?? 0.5),
      deadlocked,
      closeness: need === 0 ? 0 : got / need,
      dominated,
      smith,
      // the ranked-note's numbers (Q1539 ruling 6): the fit above the current
      // text, a direct majority of those answering for the text
      headToHead: members.flatMap((m) => {
        const p = pairAt(m, cur);
        return strength(m) > strength(cur) + TIE_EPS && p.forY > p.forX
          ? [{ id: m, p: fit.probBeats(m, cur), n: p.forY, m: p.answeredBy }] : [];
      }),
      measureShort,
      // set below for a text race, which alone can wait behind a park
      blockedByPark: false,
    };
    if (parks.length > 0 && core.settingId === undefined && this.clearsFloor(view)) {
      view.blockedByPark = this.overlapsPark(this.host.candidate(view.leaderId!).footprint, parks);
    }
    return view;
  }

  private buildRaces(): RaceBuild[] {
    return this.raceGroups().map((members) => this.buildRaceCore(members));
  }

  /**
   * **The field, grouped, and nothing derived from it** (Q1439): the union-find
   * over footprints and the setting buckets, in the order the views come out
   * in. Lifted out of `buildRaces` so that the fold can ask for the grounds
   * alone (`groundIds`) without computing an approval count that would, at
   * that moment, be asking after the very ground it is about to record.
   */
  private raceGroups(): string[][] {
    return this.host.derived('raceGroups', () => this.buildRaceGroups());
  }

  private buildRaceGroups(): string[][] {
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
    const all: string[][] = [];
    for (const members of groups.values()) {
      members.sort((a, b) => candidateNum(a) - candidateNum(b));
      all.push(members);
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
      all.push(members);
    }
    // the views used to be sorted by `candidateNum(id.slice(2))` after the
    // two loops, which is exactly this: a race is named for its oldest member
    all.sort((a, b) => candidateNum(a[0]!) - candidateNum(b[0]!));
    return all;
  }

  /**
   * **Every pair ground in play** (Q1439, narrowed by Q1441), in `raceGroups`
   * order: one per live candidate, the ground of *that candidate against the
   * current text*. The fold records the time each first stood, and a member's
   * 💤 period on a candidate runs from it (`answerableSince`) — so it must be
   * able to ask which grounds exist without asking anything that reads those
   * times back.
   */
  groundIds(): string[] {
    // **and every rival pair's since Q1538**: a leader now waits on its pair
    // with each rival, a silence on that pair leaves its group a period after
    // the pair became answerable, and a ground nobody dated would read as
    // standing since the last event and restart that period at every one
    return this.host.derived('groundIds', () => this.raceGroups().flatMap((members) => [
      ...members.map((m) => this.pairGround(m)),
      ...members.flatMap((m, i) => members.slice(i + 1).map((r) => this.pairGround(m, r))),
    ]));
  }

  /** A race's incumbent id: the text on its contested spans, or a standing. */
  private groundOf(members: string[]): string {
    const setting = this.host.candidate(members[0]!).setting;
    return setting
      ? this.incumbentIdForSetting(setting.settingId)
      : this.incumbentIdFor(mergeSpans(members.flatMap((id) => this.host.candidate(id).footprint)));
  }

  /**
   * **A judgment's ground is its own pair's** (Q1441, Ed 2026-09-17; SPEC §4.4
   * → why: R-129): the current text under the lines of the wordings it
   * compares — X's footprint where X is judged against the current text, and
   * footprint(A) ∪ footprint(B) where two challengers are compared. An
   * incumbent endpoint contributes nothing: it *is* the text under those
   * lines. A setting candidate's ground is the standing value, as it always
   * was, since a setting race displaces no text.
   *
   * It replaces the race-wide fingerprint, which hashed the union of **every**
   * member's footprint and so conflated *the text changed* with *the contested
   * area changed*: a newcomer touching other lines as well widened the union
   * and voided every judgment in the race, rival pairs included. A judgment
   * about text that no longer exists must not count (R-076, which stands);
   * a judgment about text that still stands must.
   *
   * Memoised per candidate set per state version, so the hash is computed once
   * per distinct pair however many comparisons carry it.
   */
  pairGround(aId: string, bId?: string): string {
    const ids = (bId === undefined ? [aId] : [aId, bId])
      .filter((id) => !id.startsWith(INC_PREFIX))
      .sort();
    return this.host.derived(`pg|${ids.join(',')}`, () => {
      const setting = ids.length > 0 ? this.host.candidates().get(ids[0]!)?.setting : undefined;
      if (setting) return this.incumbentIdForSetting(setting.settingId);
      const spans = ids.flatMap((id) => this.host.candidates().get(id)?.footprint ?? []);
      return this.incumbentIdFor(mergeSpans(spans));
    });
  }

  /**
   * **A pair's ground over the lines of a version that has just been left**
   * (R-141): `pairGround`'s own hash, read against `lines` rather than the
   * current text and with every footprint where it stood before the change.
   * The one reader is `rebaseOthers`, which runs after the change has been
   * folded and asks, of each judgment it might carry, whether it was still
   * standing on its own ground at the moment before — the test the usable
   * set would have applied a moment earlier. Not memoised: it is asked once
   * per change, of the judgments on the rivals that change carries.
   */
  pairGroundOn(lines: readonly string[], aId: string, bId: string): string {
    const ids = [aId, bId].filter((id) => !id.startsWith(INC_PREFIX)).sort();
    const setting = ids.length > 0 ? this.host.candidates().get(ids[0]!)?.setting : undefined;
    if (setting) return this.incumbentIdForSetting(setting.settingId);
    const spans = ids.flatMap((id) => this.host.candidates().get(id)?.footprint ?? []);
    return this.incumbentIdFor(mergeSpans(spans), lines);
  }

  private buildRaceCore(members: string[]): RaceBuild {
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
    // a footprint is whichever of them the ranking puts on top. The leader is
    // read off the *fitted strength* — the model's own ordering of the field —
    // and since v0.142 **inside the Smith set** (R-143): which pairs count as
    // results moves with the clock, so the leader, whether it is on top
    // (equal within `TIE_EPS` a tie, and a tie leaves the current text
    // standing), its approvals and its judges are all `viewAt`'s. What stays
    // here is what they are read off: the tally of every pair.
    //
    // **The floor counts judges of the winner** (Q1337, Ed 2026-09-11,
    // R-102): a usable comparison with the candidate on either side — against
    // the incumbent or a rival, both are a judgment of it — one voice each.
    // The author's derived preference (§3.3) is a voice for its own candidate
    // and never touches another. `measured` is R-063's line drawn at the
    // winner: how many of those judgments the room actually made.
    const judges = new Map<string, { judges: number; measured: number }>();
    for (const m of members) {
      const on = usable.filter((c) => c.aId === m || c.bId === m);
      judges.set(m, { judges: new Set(on.map((c) => c.participantId)).size,
        measured: on.filter((c) => !c.derived).length });
    }
    const pairs = this.pairCores(members, incumbentId, usable);
    const rivalGateOpen = this.rivalGateOpen(fit, members, incumbentId, usable);
    // Deadlock considers only servable pairs: while the rival gate is
    // closed, unmeasured rival pairs must not hold a race open — there
    // is little decision value in finely ranking challengers that are
    // all losing to the status quo (SPEC §8.3).
    // Measured evidence only: a derived author preference is a preference, not
    // a measurement, so it cannot help a race look sufficiently sampled.
    const measured = usable.filter((c) => !c.derived);
    const bestValue = this.host.maxPairValue(fit, members, incumbentId, null, rivalGateOpen);
    const baseDeadlocked =
      measured.length >= this.host.constitution().deadlockMinComparisons &&
      bestValue < this.host.constitution().deadlockEpsilon;
    return {
      core: {
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
        rivalGateOpen,
        ...(setting ? { settingId: setting.settingId } : {}),
      },
      fit,
      pairs,
      judges,
      baseDeadlocked,
    };
  }

  /**
   * **Every pair's tally: who preferred each side, who answered, and who is
   * still awaited** (SPEC §4.2, §8.2; Q1439 → why: R-125, R-127; every pair
   * since Q1538 → why: R-142). On a candidate against the current text this is
   * the approval pair: strict approval, ruling (k) — only *this over the
   * current text* counts, so a judgment of a candidate against a **rival**
   * approves neither of them; it is that rival pair's own result, which the
   * Smith set reads (R-143). *Indifferent* is an answer and prefers nothing:
   * the member is out of the pair's group at once (ruling i).
   *
   * The author's own preference arrives as a `derived` comparison on exactly
   * the old terms (§3.3): one approval of their own candidate against the
   * current text and of nothing else, absent while they are suspended, and
   * overridden by any explicit judgment of theirs. `usable` has already
   * reduced each participant to their latest judgment per pair on its own
   * ground (§4.4), so nobody is counted twice.
   *
   * **A judgment cast keeps counting after its author leaves E** (§9.5a), so
   * answers are counted wherever their authors now are; only the *awaited* set
   * is restricted to E, because only somebody still in the room can be waited
   * on — and its moments are the pair's own (`answerableSince`).
   */
  private pairCores(
    members: string[],
    incumbentId: string,
    usable: readonly StoredComparison[],
  ): Map<string, PairCore> {
    const nodes = [...members, incumbentId];
    const pairs = new Map<string, PairCore & { by: Set<string> }>();
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        pairs.set(pairKey(nodes[i]!, nodes[j]!), { a: nodes[i]!, b: nodes[j]!, forA: 0, forB: 0,
          answeredBy: 0, awaited: [], by: new Set() });
      }
    }
    for (const c of usable) {
      const p = pairs.get(pairKey(c.aId, c.bId));
      if (p === undefined) continue;
      p.by.add(c.participantId);
      if (c.outcome === 'tie') continue; // answered, and out of the group
      const chose = c.outcome === 'a' ? c.aId : c.bId;
      if (chose === p.a) p.forA++; else p.forB++;
    }
    const e = this.host.eMembers();
    const out = new Map<string, PairCore>();
    for (const [key, { by, ...p }] of pairs) {
      const from = this.answerableSince(p.a, p.b);
      for (const m of e) {
        if (by.has(m)) continue;
        // **The later of the pair's own moment and the member's** (§8.2):
        // nobody's period runs before they were there to be asked.
        p.awaited.push({ id: m, from: Math.max(from, this.host.arrivalT(m)) });
      }
      p.answeredBy = by.size;
      out.set(key, p);
    }
    return out;
  }

  /**
   * **A proposal that can never win is closed** (Q1440, Ed 2026-09-18; SPEC
   * §4.4 → why: R-132): *as soon as it's dominated by another option (e.g. it
   * can never win unless people change votes they already cast) then it should
   * be counted as closed.*
   *
   * Over the members of E, for a live candidate X:
   *
   *   **a** — whose latest judgment of X against the current text prefers X,
   *   its author among them by their derived preference (§3.3);
   *   **o** — whose latest such judgment prefers the current text;
   *   **w** — who have not answered that pair at all.
   *
   * *Indifferent* is in none of the three: it is an answer, and answering
   * again is revising a cast vote, which is the one rescue Ed's sentence
   * declines to wait for. **w counts the abstained** — 💤's period takes a
   * silent member out of the group a quorum is read against (§8.2) and takes
   * nothing away from their right to answer — which is what makes the whole
   * test **time-free** and lets it live in the state's own memo beside the
   * counts it reads, rather than in `viewAt` with the clock.
   *
   * **Dominated by the current text** when X's best possible future fails
   * either half of §4.2's test: `a + w <= o` — a tie leaves the current text
   * standing — or `a + w < F(a + o + w)`. That the best future is *every one
   * of the w approves* is R-125's properties 2 and 3 read together: an
   * approval raises approvals by one and cannot raise the floor, the approver
   * having already been inside the group; an abstention lowers the floor by at
   * most one and raises approvals by nothing. `dominated.test.ts` brute-forces
   * it rather than trusting the argument.
   *
   * **Dominated by a rival Y** when, on the X-vs-Y pair, the members
   * preferring Y outnumber those preferring X plus every member of E who has
   * not answered that pair: no answer still to come could put X above Y.
   *
   * **The floor clause is exact; the other two are counts approximating a
   * ranking.** `a + w < F` is arithmetic about a number §4.2 tests directly,
   * so nothing can rescue it and it needs no guard. The majority clause and
   * the rival clause are about being *on top of the field*, and §4.2 adopts
   * the top of the **fitted** ranking and accepts that a cyclic field can put
   * on top a wording a direct majority preferred the current text to. So a
   * count can say *dominated* about a candidate the fit still rates above the
   * text that stands, and where the two disagree the count is the one that is
   * wrong about the rule. Hence a guard on each of them, and each against the
   * thing its own clause is about: the majority clause does not close a
   * candidate **the ranking puts above the current text**, and the rival
   * clause does not close one the ranking puts above **that rival**. Between
   * them they make it impossible for a race to close its own leader, which is
   * the absurdity a pure count would eventually produce. What remains of the
   * approximation, stated so it can be reversed by one line: a judgment still
   * to come on a *rival* pair can move X's fitted strength without moving a
   * or o, so a candidate closed by the majority clause in a crowded race is
   * closed on the room's direct preference and not on a proof about the fit.
   *
   * And a dominated candidate dominates nobody: a rival that is itself on its
   * way out of the race is no reason to close anything behind it.
   */
  private dominations(
    b: RaceBuild,
    e: number,
    pairAt: (x: string, y: string) => PairAt,
    rankAbove: (x: string, y: string) => boolean,
  ): Domination[] {
    const members = b.core.members;
    const incumbentId = b.core.incumbentId;
    if (members.length === 0) return [];
    const c = this.host.constitution();
    // **nothing is dominated while E is empty** (SPEC §4.4 → why: R-140;
    // issue #65 F2): every count is nought, `0 ≤ 0` holds, and a room that
    // lapsed at one tick lost every live proposal for good — though §9.5a
    // returns each of them on their next read, so an empty E is a room not
    // yet back rather than an answer
    if (e === 0) return [];
    // **The guards read smith-rank since v0.142** (§4.4 → why: R-132, R-143):
    // the Smith set above the rest, the fit's order within each part. So a
    // wording outside the Smith set is no longer protected by a fitted
    // strength above the current text's — the clone case seals at once — and
    // since the set moves when a pair becomes measured, which a silence can
    // do by running its period, a domination can arrive with no judgment.
    const above = (id: string): boolean => rankAbove(id, incumbentId);
    const byIncumbent = new Set<string>();
    for (const m of members) {
      const p = pairAt(m, incumbentId);
      const a = p.forX;
      const o = p.forY;
      const w = p.unanswered;
      const floored = a + w < floorFor(c, e, a + o + w);
      if (floored || (a + w <= o && !above(m))) byIncumbent.add(m);
    }
    // the rival clause, over the candidates the incumbent clause left
    // standing; the guard here is against **the rival**, not against the
    // current text — X may well be better than what stands and still never be
    // the wording the room takes, which is the whole of what this clause is
    // about — and it is what makes it impossible to close a race's leader,
    // the leader being above every rival by definition
    const byRival = new Map<string, string>();
    for (const m of members) {
      if (byIncumbent.has(m)) continue;
      for (const y of members) {
        if (y === m || byIncumbent.has(y)) continue;
        if (rankAbove(m, y)) continue;
        // Y beats X by more than every member of E who could still answer
        const p = pairAt(m, y);
        if (p.forY > p.forX + p.unanswered) { byRival.set(m, y); break; }
      }
    }
    // one pass of conservatism, which can only shrink the set: a candidate
    // closed by a rival that is itself closing stays open
    for (const [m, y] of [...byRival]) if (byRival.has(y)) byRival.delete(m);
    const out: Domination[] = [];
    for (const m of members) {
      if (byIncumbent.has(m)) out.push({ id: m, by: 'incumbent' });
      else if (byRival.has(m)) out.push({ id: m, by: 'rival' });
    }
    return out;
  }

  /**
   * **When the pair *as it now stands* became answerable** (Q1439; SPEC §8.2):
   * the latest of the moments that can void every earlier answer to it — each
   * candidate end's own submission, an evidence reset on its revision (§2.4),
   * and the ground the pair now stands on (§4.4, as Q1441 narrowed it). A
   * change to the text under those lines locks the judgments cast against the
   * old wording, so it has to restart the period too: otherwise it would
   * abstain, instantly, everyone who had already answered — which is the
   * defect this whole rule exists to close, arriving from the other side.
   * The current text as an end contributes nothing: it *is* the ground.
   */
  private answerableSince(x: string, y: string): number {
    // **the pair's own ground, not the race's** (Q1441): a rival joining
    // voids nothing, so it restarts nobody's period either
    let since = this.host.groundSince(this.pairGround(x, y));
    for (const id of [x, y]) {
      if (id.startsWith(INC_PREFIX)) continue;
      since = Math.max(since, this.host.candidate(id).submittedT,
        this.host.evidenceSinceT(id) ?? -Infinity);
    }
    return since;
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
   * **Ready to carry** (SPEC §4.2; Q1362 (a), R-114; Q1439, R-125): the leader
   * is on top of the field — the current text among it, and a tie leaving the
   * current text standing — **F members have approved it** (Q1439, amending
   * R-102's *judged it*, which let an opponent help it reach its floor), and
   * the room has judged it at least once, or, at E = 1, the author is the room
   * (`soleMemberIsLeadersAuthor`). There is no bar: the threshold left the test
   * at v0.128.
   *
   * **It reads the two numbers off the view** rather than taking a floor from
   * its caller, because both now move with the clock: the sweep's snapshot,
   * `finalRender` and `races()`'s own `blockedByPark` all ask this one
   * function about one view, so none of them can be reading a floor from a
   * different moment than the approvals it is comparing.
   *
   * **And since v0.142 two clauses more** (§4.2 → why: R-142, R-143): the top
   * was read inside a Smith set that is not empty — never off the fit's
   * fallback, which exists for routing and the meter and never to carry —
   * and **the leader has been measured against every live rival** (a rival
   * the batch is about to close excepted). **At the close** only that wait is
   * waived (§4.6): `clearsAtClose`.
   */
  clearsFloor(r: RaceView): boolean {
    return r.approvals >= r.floor &&
      this.clearsAtClose(r) &&
      !(ARMS.rivalMeasure && r.rivals.measured < r.rivals.of);
  }

  /**
   * **Ready to carry at the close** (SPEC §4.6 → why: R-142, R-143): the
   * batch's own test with the wait for rivals waived and nothing else — the
   * Smith set is the same one, **an unmeasured pair a gap at the close as
   * before it** (Ed, 2026-09-25, overruling the plan's *level at the close*),
   * so a wording that reaches the top only through an unmeasured pair does
   * not pass, and the race files undecided with the current text standing.
   */
  clearsAtClose(r: RaceView): boolean {
    return r.approvals >= r.floor &&
      r.leaderId !== null &&
      r.leaderOnTop &&
      (r.leaderMeasured > 0 || this.host.soleMemberIsLeadersAuthor(r.leaderId)) &&
      !(ARMS.smith && r.smith.length === 0);
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

  raceOf(candidateId: string, t: number): RaceView {
    const race = this.races(t).find((r) => r.members.includes(candidateId));
    if (!race) throw new Error(`candidate ${candidateId} is not in a live race`);
    return race;
  }

  /**
   * Which race an endpoint is in — membership, which no clock touches, so the
   * grouping alone answers it and no floor is computed to find out.
   */
  raceIdOfEndpoint(id: string): string | null {
    if (id.startsWith(INC_PREFIX)) return null;
    const members = this.raceGroups().find((g) => g.includes(id));
    return members ? `r:${members[0]!}` : null;
  }

  /**
   * The incumbent is positional (SPEC §4.4): its identity is the hash of
   * the contested spans' current text, so evidence goes stale exactly
   * when the text it judged stops being the status quo.
   */
  private incumbentIdFor(contested: Span[],
    lines: readonly string[] = this.host.currentLines()): string {
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
      // membership and the ground, both time-free: classifying a pair asks
      // nothing about a floor, so it takes no clock (Q1439)
      const members = this.raceGroups().find((g) => g.includes(candId));
      if (!members) throw new Error(`candidate ${candId} is not in a live race`);
      if (this.groundOf(members) !== incId) {
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
    // **Every judgment touching a member, from the members' own buckets**
    // (Q1441). It used to be the race-wide ground's bucket, which is exactly
    // what the ground-lock defect was made of; a usable judgment now shares
    // no key with its race, only with the candidates it names, so the pool is
    // the union of their buckets — deduped by `seq`, since a judgment between
    // two members sits in both, and re-sorted, since the merge of two
    // seq-ordered lists is not one.
    const pool = new Map<number, StoredComparison>();
    for (const m of members) {
      for (const c of this.host.edgesByCandidate(m)) pool.set(c.seq, c);
    }
    // One ground per distinct pair for the length of this scan. `pairGround`
    // is memoised per state version too, but the memo is a dev switch away
    // from being off (`Session.memo.off`, and `audit` recomputes every hit),
    // and a hash per comparison rather than per pair is ten times the work on
    // a race with hundreds of judgments — measured.
    const grounds = new Map<string, string>();
    const groundOf = (c: StoredComparison): string => {
      const key = pairKey(c.aId, c.bId);
      let g = grounds.get(key);
      if (g === undefined) { g = this.pairGround(c.aId, c.bId); grounds.set(key, g); }
      return g;
    };
    const filtered = [...pool.values()].filter((c) => {
      if (c.kind !== 'edge') return false;
      // **The ground lock, on the pair's own lines** (SPEC §4.4; Q1441 →
      // why: R-076, R-129). A judgment is a fact about the wordings it
      // compared *and the text they displaced*: it stops counting when that
      // text changes, and not before. A rival joining or leaving the race
      // changes no text and voids nothing.
      if (c.groundId !== groundOf(c)) return false;
      for (const id of [c.aId, c.bId]) {
        if (id.startsWith(INC_PREFIX)) {
          // **Any incumbent id on a still-valid pair is *this* race's
          // incumbent** (Q1441). A judgment cast when the race was narrower
          // carries the race-wide id of that moment, which is no longer the
          // race's — but its pair's own ground is intact, so the text it
          // compared is the text that stands, and the endpoint means the
          // current text. It is normalised below, before the supersession
          // key, so one member's two judgments of one pair cannot count
          // twice under two spellings of *the current text*.
          continue;
        }
        if (!memberSet.has(id)) return false;
        const since = this.host.evidenceSince(id);
        if (since !== undefined && c.seq < since) return false;
      }
      return true;
    }).map((c) => (
      c.aId.startsWith(INC_PREFIX) && c.aId !== incumbentId ? { ...c, aId: incumbentId }
        : c.bId.startsWith(INC_PREFIX) && c.bId !== incumbentId ? { ...c, bId: incumbentId }
          : c
    )).sort((a, b) => a.seq - b.seq);
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

  /** A race's fit, by race id: the grouping and the ground, and no clock. */
  raceFit(raceId: string): Fit {
    const members = this.raceGroups().find((g) => `r:${g[0]!}` === raceId);
    if (!members) throw new Error(`unknown race ${raceId}`);
    return this.fitRaceMembers(members, this.groundOf(members));
  }

  updatePeaks(race: RaceView): void {
    // Performance is how the **room** received a candidate, and an author is
    // not the room — so the peak is taken on a fit with no derived preference
    // in it, and a candidate has no performance at all until somebody else
    // has judged it. Without the second half, submitting would open an
    // account out of nothing. The peak stopped pricing the refund at Q1454 —
    // §7 hands the stake back on a pass and nothing on a failure — and goes
    // on ranking the graveyard and the backlog (§8), which is the reading
    // that must not take a wording's own author for evidence.
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

/** How many of the sorted numbers are at or below `t`. */
function upperBound(sorted: readonly number[], t: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid]! <= t) lo = mid + 1; else hi = mid;
  }
  return lo;
}
