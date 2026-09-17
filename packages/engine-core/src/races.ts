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

import type { Candidate, Constitution, PairKind, RaceView } from './types.js';
import { INC_PREFIX } from './types.js';
import type { Span } from './text/types.js';
import type { Comparison, Fit } from './ranking/types.js';
import { footprintsConflict } from './text/patch.js';
import { fitDavidson } from './ranking/davidson.js';
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
 * **F = max(Q′, min(⌈E/3⌉, F_max))** (SPEC §4.2; Q1439 → why: R-125, R-126).
 *
 * Two bases, deliberately different. **Q′ is read against the group** the
 * leader is waiting on — its approvers, its opposers and the members of E it
 * is still awaiting — because a quorum is what the room asks of the people who
 * are actually deciding this question, and a silence that has run its 💤
 * period is not one of them (§8.2). It is a share of that group, rounded up,
 * or a fixed count; and **in either form never more than half of it**, since
 * ✏️ is *enough of the room* and 🏛️ is *everybody*, and an approval quorum of
 * 100% would make them one rung. **The statistical minimum's third is read
 * against the whole of E**, where it has always been (R-073): it is a
 * sufficiency floor, not a consent rule, and reading it against a shrinking
 * group would let two people carry a room of a hundred — the moon room's
 * defect (R-102) returning by the back door.
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
  const quorumN = Math.min(asked, Math.ceil(group / 2));
  return Math.max(quorumN, Math.min(Math.ceil(e / 3), c.adoptionFloorMax));
}

/**
 * **The time-free half of a race** (Q1439): everything the state alone
 * decides, which is what the session's per-state-version memo may hold.
 * `approvals`, `group`, `floor`, `closeness` and `blockedByPark` are not here
 * — they move with the clock, because a silence becomes an abstention with no
 * event to mark it, and the memo would hand back an answer from before the
 * period ran.
 */
type RaceCore = Omit<RaceView, 'approvals' | 'group' | 'floor' | 'closeness' | 'blockedByPark'>;

/**
 * The approval count and the group, held in the one shape that does not
 * depend on the clock: who has approved, how many have answered either way,
 * and — for each member of E who has not answered — the moment their own
 * period on this pair began (§8.2). Whether that period has run is the only
 * question left for `t`.
 */
interface ApprovalCore {
  approvals: number;
  /** Approvers and opposers together: answered, and in the group wherever they now are. */
  answered: number;
  /** One period start per awaited member of E, in engine ms. */
  awaitedFrom: number[];
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
  races(t: number): RaceView[] {
    const cores = this.host.derived('races', () => this.buildRaces());
    // **One picture per state version *and per set of abstentions*** (Q1439,
    // extending Q1324). The clock enters a race in exactly one place — how
    // many of the awaited have run out their 💤 period — so the views are
    // identical at every `t` that reads the same counts, which is every `t`
    // between two abstentions. Keying on the counts rather than on `t` keeps
    // the memo exact *and* keeps it hitting: a key of `t` itself would miss on
    // every poll and rebuild every race view per seat per poll, which is the
    // read path the second moon room measured at 91% of a saturated host.
    // The array is a fresh copy each call and the views in it are shared and
    // read-only, exactly as before.
    const awaited = cores.map((c) => this.awaitedAt(c.approval, t));
    return this.host.derived(`races@${awaited.join(',')}`, () => {
      const parks = this.parkedFootprints();
      const e = this.host.eMembers().length;
      return cores.map((c, i) => this.viewAt(c.core, c.approval, awaited[i]!, e, parks));
    }).slice();
  }

  /**
   * How many of the members awaited on this race are still awaited at `t`:
   * everyone whose period has not run out, all of them where 💤 is *never*
   * (R-127, and R-089's letter — nothing is imputed from silence then).
   */
  private awaitedAt(approval: ApprovalCore, t: number): number {
    const after = this.host.constitution().abstainAfterMs ?? null;
    if (after === null) return approval.awaitedFrom.length;
    return approval.awaitedFrom.reduce((n, from) => n + (t < from + after ? 1 : 0), 0);
  }

  /**
   * **The clock's own numbers, put on a race** (Q1439): the group as it stands
   * at `t`, the floor read against it, the meter over that floor, and the park
   * flag — which asks `clearsFloor` and so cannot be decided before the floor
   * is. Everything else is the memo's, untouched.
   */
  private viewAt(
    core: RaceCore,
    approval: ApprovalCore,
    awaited: number,
    e: number,
    parks: Span[][],
  ): RaceView {
    const group = approval.answered + awaited;
    const floor = floorFor(this.host.constitution(), e, group);
    const view: RaceView = {
      ...core,
      approvals: approval.approvals,
      group,
      floor,
      // **Progress toward the quorum** (Q1362 (c), R-118): the leader's
      // *judges* over the floor, and judges is deliberately still the word —
      // Ed's ruling (b), Q1439: *the evidence meter counts towards judgements
      // not approvals (it's just a progress bar)*. So it may read full on a
      // race that does not carry, which was already true and is still
      // direction-free: the number says how far the room has got, never which
      // way it is going.
      closeness: Math.min(1, core.leaderJudges / Math.max(1, floor)),
      // set below for a text race, which alone can wait behind a park
      blockedByPark: false,
    };
    if (parks.length > 0 && core.settingId === undefined && this.clearsFloor(view)) {
      view.blockedByPark = this.overlapsPark(this.host.candidate(view.leaderId!).footprint, parks);
    }
    return view;
  }

  private buildRaces(): Array<{ core: RaceCore; approval: ApprovalCore }> {
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
    return this.host.derived('groundIds',
      () => this.raceGroups().flatMap((members) => members.map((m) => this.pairGround(m))));
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

  private buildRaceCore(members: string[]): { core: RaceCore; approval: ApprovalCore } {
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
    //
    // **Equal means equal within the fit's noise** (the stage-1 build's first
    // finding, 2026-09-15): at a dead-even split the two strengths differ by
    // a residual of ~1e-16 whose *sign is set by the order the judgments
    // arrived in*, so a strict `>` let arrival order decide a tie. `TIE_EPS`
    // is far above any residual the optimiser leaves and far below the
    // smallest difference one judgment makes (~1e-1 at any room size), so it
    // changes nothing but the tie.
    const leaderOnTop =
      leaderId !== null && leaderStrength > (fit.strengths.get(incumbentId) ?? 0) + TIE_EPS;
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
        leaderJudges,
        leaderMeasured,
        leaderP,
        leaderId,
        leaderOnTop,
        certification,
        deadlocked,
        rivalGateOpen,
        ...(setting ? { settingId: setting.settingId } : {}),
      },
      approval: this.approvalCore(leaderId, incumbentId, usable),
    };
  }

  /**
   * **Who has approved the leader, who has answered, and who is still awaited**
   * (SPEC §4.2, §8.2; Q1439 → why: R-125, R-127). Strict approval, ruling (k):
   * only *this over the current text* counts, so a judgment of the leader
   * against a **rival** approves neither of them — it says which challenger is
   * better, not that either beats what stands, and counting it as backing
   * would count a member for a change they may well oppose and reward dodging
   * the pair. *Indifferent* is an answer and approves nothing: the member is
   * out of the group at once (ruling i), which is what stops an indifferent
   * room raising the share everyone else has to clear.
   *
   * The author's own preference arrives here as a `derived` comparison on
   * exactly today's terms (§3.3): one approval of their own candidate and of
   * nothing else, absent while they are suspended, and overridden by any
   * explicit judgment of theirs. `usable` has already reduced each participant
   * to their latest judgment per pair on this ground (§4.4), so nobody is
   * counted twice.
   *
   * **A judgment cast keeps counting after its author leaves E** (§9.5a), so
   * approvers and opposers are counted wherever they now are; only the
   * *awaited* set is restricted to E, because only somebody still in the room
   * can be waited on.
   */
  private approvalCore(
    leaderId: string | null,
    incumbentId: string,
    usable: readonly StoredComparison[],
  ): ApprovalCore {
    if (leaderId === null) return { approvals: 0, answered: 0, awaitedFrom: [] };
    const answeredBy = new Set<string>();
    let approvals = 0;
    let answered = 0;
    for (const c of usable) {
      const onPair =
        (c.aId === leaderId && c.bId === incumbentId) ||
        (c.bId === leaderId && c.aId === incumbentId);
      if (!onPair) continue;
      answeredBy.add(c.participantId);
      if (c.outcome === 'tie') continue; // answered, and out of the group
      answered++;
      if (c.outcome === 'a' ? c.aId === leaderId : c.bId === leaderId) approvals++;
    }
    const from = this.answerableSince(leaderId, incumbentId);
    const awaitedFrom: number[] = [];
    for (const m of this.host.eMembers()) {
      if (answeredBy.has(m)) continue;
      // **The later of the pair's own moment and the member's** (§8.2):
      // nobody's period runs before they were there to be asked.
      awaitedFrom.push(Math.max(from, this.host.arrivalT(m)));
    }
    return { approvals, answered, awaitedFrom };
  }

  /**
   * **When the pair *as it now stands* became answerable** (Q1439; SPEC §8.2):
   * the latest of the three moments that can void every earlier answer to it —
   * the candidate's own submission, an evidence reset on revision (§2.4), and
   * the ground its own pair now stands on (§4.4, as Q1441 narrowed it). A
   * change to the text under those lines locks the judgments cast against the
   * old wording, so it has to restart the period too: otherwise it would
   * abstain, instantly, everyone who had already answered — which is the
   * defect this whole rule exists to close, arriving from the other side.
   */
  private answerableSince(leaderId: string, _incumbentId: string): number {
    const reset = this.host.evidenceSinceT(leaderId);
    return Math.max(
      // **the pair's own ground, not the race's** (Q1441): a rival joining
      // voids nothing, so it restarts nobody's period either
      this.host.groundSince(this.pairGround(leaderId)),
      this.host.candidate(leaderId).submittedT,
      reset ?? -Infinity,
    );
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
   */
  clearsFloor(r: RaceView): boolean {
    return r.approvals >= r.floor &&
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
