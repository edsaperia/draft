/**
 * **The churn measurement** (Q1362 stage 5, `design/spec-pass/pass-6.md`).
 *
 * Ed's ruling of 2026-09-15 made the current text a peer: a race's field is
 * its live candidates *and* the wording that stands, the ranking orders the
 * whole field, and the top of it is the document once the adoption floor is
 * met. The ruling recorded one known cost — **churn**: a peer status quo can
 * lose on 8–7 and come back on 7–8, and *the cooldown and the floor are the
 * brakes*. This is the measurement of that cost.
 *
 *   npm run churn -w @draft/sim-harness -- [--seeds N] [--out runs/churn.csv]
 *
 * Deterministic and network-free: scripted personas, seeded rng, the same
 * seeds across every arm, so two runs of this file print the same bytes.
 *
 * **Three tables.**
 *
 * 1. *The asked comparison.* The alpha preset over the three shapes' windows
 *    at the pinned bar, and the same seeds at 0.6 and 0.8. The plan expected
 *    the engine to still honour a threshold handed to it — that is what
 *    pinning rather than deleting was supposed to buy — so that Ed could
 *    raise the pinned constant if 0.5 churned materially more (Decision D3).
 *    It does not: stage 1 took the bar out of the adoption predicate
 *    altogether (`clearsFloor`, races.ts), so the constant is inert and the
 *    three arms are identical to the byte. The table is printed anyway,
 *    because a null result is the answer to D3 and the `check` below pins it:
 *    if the arms ever diverge again, something has quietly re-read the bar.
 *
 * 2. *What the retired bar would have stopped.* Every `adopted` event still
 *    records `p`, the posterior that the leader beats the text it displaced.
 *    It gates nothing now, but it lets a log the **new** rule produced be
 *    asked the old rule's question. This is an **upper bound, not a
 *    counterfactual**: refusing one adoption changes every judgment after it,
 *    so the real old-rule run would differ. It answers *how much of this
 *    churn is low-confidence churn*, which is the thing the bar was for.
 *
 * 3. *The brakes that exist.* SPEC §4.2 now says the cooldown is the one
 *    brake on the pace of change and that it backs the floor. Both are
 *    measured against the same seeds: the cooldown at 1 · 5 · 15 · 30
 *    minutes, and the floor moved by the room's own quorum (none · 25% ·
 *    33% · 50% — the three shapes' settings and no quorum at all).
 *
 * **The room is fifteen, and the fifteenth is constructed.** Ed's alpha room
 * is fifteen; the clubhouse scenario holds fourteen personas, and a scenario
 * persona is ground truth — stances and saliences the welfare model scores
 * against — so inventing a fifteenth opinion would be inventing the answer.
 * The fifteenth is therefore a **twin**: the clubhouse member whose stance
 * vector is flattest (the smallest summed |stance|, chosen by that rule and
 * not by hand), seated again under a new id. A room can contain two people
 * who agree, the twin judges on its own rng draws, and whatever it does to
 * the ranking it does identically in every arm — which is what the study
 * compares. It is named in the output so nothing about it is silent.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Constitution } from '../../engine-core/src/index.js';
import { ALPHA_PRESET_OVERRIDES } from './alpha-preset-values.js';
import { clubhouseScenario } from './clubhouse.js';
import { ScriptedPersona } from './persona.js';
import { runSession } from './runner.js';
import type { SiteChurn, StrandedRace } from './metrics.js';
import type { Scenario } from './scenario.js';
import { check, finish, say } from './evidence-log.js';

const MIN = 60_000;
const HOUR = 3600_000;

/** A run must never stop at the action cap: the window is the axis, not the cap. */
const MAX_ACTIONS = 500_000;

/**
 * The fifteenth seat (see the file's doc-block): the flattest clubhouse
 * member, seated again. The rule is the code, so nobody has to trust a name.
 */
function roomOfFifteen(): { scenario: Scenario; twinOf: string } {
  const flatness = (p: (typeof clubhouseScenario.personas)[number]): number =>
    Object.values(p.stances).reduce((a, s) => a + Math.abs(s), 0);
  let base = clubhouseScenario.personas[0]!;
  for (const p of clubhouseScenario.personas) {
    if (flatness(p) < flatness(base)) base = p;
  }
  const twin = { ...base, id: 'p15', handle: `${base.handle}-twin` };
  return {
    scenario: { ...clubhouseScenario, personas: [...clubhouseScenario.personas, twin] },
    twinOf: base.handle,
  };
}

const { scenario: ROOM, twinOf: TWIN_OF } = roomOfFifteen();

/**
 * The three shapes' windows (`packages/constitution/src/shapes.ts`). *Ongoing*
 * has no ending at all; a simulation must stop somewhere, so it runs a month —
 * long enough to show whether a perpetual document ever stops churning.
 */
const WINDOWS = [
  { name: 'meeting', hours: 4, note: 'a few hours in one room' },
  { name: 'conference', hours: 72, note: 'three days, people coming and going' },
  { name: 'ongoing', hours: 720, note: 'no ending — a month stands in for perpetual' },
] as const;

/** The pinned value first; the other two are the arms Decision D3 asked for. */
const BARS = [0.5, 0.6, 0.8];

/**
 * **The quorums section 4 is read at** (Q1439). Only three are worth a column
 * now: none at all, which is what every earlier table in this file ran at and
 * what a founder who answers 👥 with nothing gets; the *conference* shape's
 * third, which at fifteen still vanishes into ⌈E/3⌉; and a half, which since
 * R-126 is **the strictest quorum any room may ask for**, in either form. The
 * 25 % row of table 3 is left out here because it is ⌈E/3⌉'s row under another
 * name, and section 4 already has three arms per cell.
 */
const Q_ARMS: { label: string; q: Constitution['quorum'] }[] = [
  { label: 'no quorum', q: null },
  { label: 'quorum 33%', q: { form: 'share', n: 33 } },
  { label: 'quorum 50%', q: { form: 'share', n: 50 } },
];

/**
 * **The quorums section 5 is read at** (Ed, 2026-09-18). With ⌈E/3⌉ gone the
 * shares below a third stop vanishing into it and become real settings for the
 * first time: at fifteen these are floors of **1 · 2 · 3 · 5 · 8**. The 30 %
 * row is the control — it is ⌈15/3⌉ exactly, so it must reproduce section 4's
 * *no quorum* arm session for session.
 */
const Q5_ARMS: { label: string; q: Constitution['quorum'] }[] = [
  { label: 'no quorum', q: null },
  { label: 'quorum 10%', q: { form: 'share', n: 10 } },
  { label: 'quorum 20%', q: { form: 'share', n: 20 } },
  { label: 'quorum 30%', q: { form: 'share', n: 30 } },
  { label: 'quorum 50%', q: { form: 'share', n: 50 } },
];

/** 💤 unset: nothing is ever imputed from silence (R-089's letter, R-127). */
const NEVER = '💤 never';

/**
 * **The two — at the meeting window, three — periods each cell is run at.**
 * *Never* is the arm in which the rule is a plain approval quorum capped at
 * half of E. **A sixth of the window** is the plan's own arm: long enough that
 * nobody is abstained for stepping out, short enough to run several times
 * inside the document's life. And the meeting window carries **15 minutes** as
 * well, because that is the period Ed will set in the live room, and a study
 * that did not measure the number the room will actually run at would be
 * measuring the wrong thing.
 */
function abstainArmsFor(win: (typeof WINDOWS)[number]): { label: string; ms: number | null }[] {
  const sixth = (win.hours * HOUR) / 6;
  const arms: { label: string; ms: number | null }[] = [
    { label: NEVER, ms: null },
    { label: `💤 ${span(sixth)}`, ms: sixth },
  ];
  if (win.name === 'meeting') arms.push({ label: '💤 15 min', ms: 15 * MIN });
  return arms;
}

/** A period in the largest unit that states it whole, as 💤's own control does. */
function span(ms: number): string {
  if (ms % (24 * HOUR) === 0) return `${ms / (24 * HOUR)} days`;
  if (ms % HOUR === 0) return `${ms / HOUR} h`;
  return `${Math.round(ms / MIN)} min`;
}

interface Run {
  seed: string;
  alive: boolean;
  adoptions: number;
  flips: number;
  reversions: number;
  welfareRatio: number;
  judgments: number;
  churn: SiteChurn[];
  /** Simulated ms of the first adoption; null when the document never moved. */
  firstAdoptionMs: number | null;
  /** Races the window ran out on, leader on top and short of F (Q1439). */
  stranded: StrandedRace[];
  /** The approvals each adoption in this run actually carried on (Q1439). */
  approvalsAtAdoption: number[];
  /**
   * **What the room proposed, and what it closed** (Q1440). `candidates` is
   * every wording anybody put up; `dominated` is how many of them the room
   * closed before the window did — a proposal no answer still to come could
   * carry (SPEC §4.4). The two are here because the rule's whole effect on a
   * simulated room is that a losing wording leaves and its author writes
   * another, and neither `adoptions` nor `flips` can say how much of that
   * happened.
   */
  candidates: number;
  dominated: number;
  actions: number;
  hash: string;
  /**
   * Everything the room did, as one string. **Not the rolling hash**: the
   * constitution is hashed into the genesis event and carries `windowEndMs`,
   * so two windows over the same room disagree on the hash before a single
   * persona has acted. This is what two runs are the same *session* by.
   */
  sig: string;
}

interface Cell {
  arm: string;
  window: string;
  runs: Run[];
}

async function measure(arm: string, win: (typeof WINDOWS)[number],
  overrides: Partial<Constitution>, seeds: number): Promise<Cell> {
  const runs: Run[] = [];
  for (let i = 0; i < seeds; i++) {
    const seed = `churn-${i}`;
    const r = await runSession({
      scenario: ROOM,
      windowMs: win.hours * HOUR,
      seed,
      maxActions: MAX_ACTIONS,
      constitutionOverrides: overrides,
      makePersona: (profile, rng) => new ScriptedPersona(profile, ROOM, rng),
    });
    const m = r.metrics;
    runs.push({
      seed,
      alive: m.adoptions > 0,
      adoptions: m.adoptions,
      flips: m.flips,
      reversions: m.reversions,
      welfareRatio: m.welfareRatio,
      judgments: m.edgeComparisons + m.diagonalComparisons,
      churn: m.churn,
      firstAdoptionMs: m.firstAdoptionMs,
      stranded: m.stranded,
      approvalsAtAdoption: m.approvalsAtAdoption,
      candidates: m.candidates,
      dominated: r.session.log.filter((e) => e.event.type === 'candidate-retired'
        && (e.event as { reason?: string }).reason === 'dominated').length,
      actions: r.actions,
      hash: r.session.rollingHash(),
      sig: JSON.stringify([m.adoptions, m.edgeComparisons, m.diagonalComparisons,
        m.candidates, m.welfareRatio, m.finalText, m.churn]),
    });
  }
  return { arm, window: win.name, runs };
}

interface Stat { mean: number; sd: number; min: number; max: number }

function stat(xs: number[]): Stat {
  const mean = xs.reduce((a, x) => a + x, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / xs.length);
  return { mean, sd, min: Math.min(...xs), max: Math.max(...xs) };
}

const spread = (s: Stat, dp = 1): string =>
  `${s.mean.toFixed(dp)} ±${s.sd.toFixed(dp)} (${s.min}–${s.max})`;

function cellStats(c: Cell) {
  // **Time to first adoption is over the runs that had one** (Q1439): a run
  // that never moved contributes `alive 0%`, and averaging its absence in as a
  // zero — or as the window length — would say something false either way. The
  // count it was taken over is printed beside it wherever it is not every run.
  const firsts = c.runs.map((r) => r.firstAdoptionMs).filter((x): x is number => x !== null);
  return {
    alive: c.runs.filter((r) => r.alive).length / c.runs.length,
    adoptions: stat(c.runs.map((r) => r.adoptions)),
    /**
     * **How much of the document moved at all** — one per site that ever
     * adopted, which is `adoptions − flips`. It is the number that answers
     * *did the room get anywhere*, where `adoptions` answers *how many times
     * did it act*, and the two come apart exactly as churn rises.
     */
    sites: stat(c.runs.map((r) => r.churn.length)),
    flips: stat(c.runs.map((r) => r.flips)),
    reversions: stat(c.runs.map((r) => r.reversions)),
    welfare: stat(c.runs.map((r) => r.welfareRatio)),
    judgments: stat(c.runs.map((r) => r.judgments)),
    /** Minutes of simulated time, over the runs that adopted at all. */
    firstAdoptionMin: firsts.length > 0 ? stat(firsts.map((x) => x / MIN)) : null,
    firstAdoptionN: firsts.length,
    /**
     * **When the document had finished moving**: the latest *first* adoption
     * over the run's sites, in minutes. `sites` saturates in this scenario —
     * all ten contested clauses move in every arm of every seed — so it cannot
     * say which arm got the room further. This can: it says how long the room
     * took to get there, and it is the pace measure the saturated one is not.
     */
    allSitesMin: stat(c.runs.map((r) => Math.max(
      0, ...r.churn.map((s) => (s.adopted[0]?.t ?? 0) / MIN)))),
    /** Races left short of their floor at the close, per run (Q1439). */
    stranded: stat(c.runs.map((r) => r.stranded.length)),
    /** Wordings put up, and wordings the room closed before the clock did. */
    candidates: stat(c.runs.map((r) => r.candidates)),
    dominated: stat(c.runs.map((r) => r.dominated)),
    /**
     * **What the room was actually holding when it acted** (Ed, 2026-09-18):
     * the smallest approval count any adoption in the cell carried on, and how
     * many carried on two or fewer. Pooled over the cell's seeds rather than
     * averaged per run, because the question is *how thin did it ever get*,
     * and a mean over runs would hide the one adoption that answers it.
     */
    approvals: pooledApprovals(c),
  };
}

/** The thin end of the cell's adoptions: the minimum, and the count at ≤ 2. */
function pooledApprovals(c: Cell): { n: number; min: number; thin: number; mean: number } | null {
  const xs = c.runs.flatMap((r) => r.approvalsAtAdoption);
  if (xs.length === 0) return null;
  return {
    n: xs.length,
    min: Math.min(...xs),
    thin: xs.filter((x) => x <= 2).length,
    mean: xs.reduce((a, x) => a + x, 0) / xs.length,
  };
}

function row(label: string, c: Cell): string {
  const s = cellStats(c);
  const first = s.firstAdoptionMin === null
    ? '     —        '
    : `${s.firstAdoptionMin.mean.toFixed(0).padStart(5)} ±${s.firstAdoptionMin.sd.toFixed(0)} min`
      + (s.firstAdoptionN < c.runs.length ? `/${s.firstAdoptionN}` : '');
  return `  ${label.padEnd(34)}`
    + ` alive ${(s.alive * 100).toFixed(0).padStart(3)}%`
    + ` · adoptions ${spread(s.adoptions).padEnd(19)}`
    + ` · sites ${s.sites.mean.toFixed(1).padStart(4)}`
    + ` · 1st ${first.padEnd(15)}`
    + ` · all ${s.allSitesMin.mean.toFixed(0).padStart(4)} ±${s.allSitesMin.sd.toFixed(0).padEnd(3)} min`
    + ` · flips ${spread(s.flips).padEnd(19)}`
    + ` · reversions ${spread(s.reversions).padEnd(19)}`
    + ` · stranded ${spread(s.stranded).padEnd(17)}`
    + ` · put ${s.candidates.mean.toFixed(0).padStart(5)}`
    + ` closed ${s.dominated.mean.toFixed(0).padStart(5)}`
    + ` · approvals ${s.approvals === null ? 'none'
      : `min ${String(s.approvals.min).padStart(2)}`
        + ` mean ${s.approvals.mean.toFixed(1)}`
        + ` ≤2 ${String(s.approvals.thin).padStart(3)}/${String(s.approvals.n).padEnd(4)}`}`
    + ` · welfare ${s.welfare.mean.toFixed(3)}`;
}

/**
 * **The diagnosis on a cell's stranded races** (Q1439), pooled over its seeds.
 * The split is the finding stage 5 exists to make: a race whose leader the
 * meter says the room has judged as often as the floor asks, and which still
 * has too few approvals, is a room that was **asked and refused** — the rule
 * doing exactly its job. A race short on *judges* as well is one where the
 * leader-against-the-current-text pair never reached enough people, which
 * would be a **router** finding and not a rule finding.
 */
function strandedSplit(c: Cell): string {
  const rs = c.runs.flatMap((r) => r.stranded);
  if (rs.length === 0) return 'none — every race the room preferred carried';
  const mean = (f: (s: StrandedRace) => number): string =>
    (rs.reduce((a, s) => a + f(s), 0) / rs.length).toFixed(1);
  const refused = rs.filter((s) => s.leaderJudges >= s.floor).length;
  return `${String(rs.length).padStart(3)} race(s)`
    + ` · approvals ${mean((s) => s.approvals)} of floor ${mean((s) => s.floor)}`
    + ` · judges ${mean((s) => s.leaderJudges)}`
    + ` · group ${mean((s) => s.group)}`
    + ` · leader ${mean((s) => s.leaderAgeMs / MIN)} min old`
    + ` · asked-and-refused ${refused}/${rs.length}`;
}

/** A cell's identity across runs of this file: the seeds' rolling hashes. */
const digest = (c: Cell): string => c.runs.map((r) => r.hash.slice(0, 4)).join('');

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let seeds = 20;
  let out = '';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--seeds') seeds = Number(argv[++i]) || 20;
    else if (argv[i] === '--out') out = argv[++i] ?? '';
  }

  say(`\n== the room ============================================================`);
  say(`  ${ROOM.personas.length} members (the clubhouse fourteen, plus a twin of ${TWIN_OF}`);
  say(`  — the flattest stance vector, seated again), ${seeds} seeds per cell,`);
  say('  the alpha preset: 1-minute cooldown, 6 ✏️ capped at 8, one every 5 min.');

  const all: Cell[] = [];

  say('\n== 1. the bar, which no longer bites ===================================');
  say('  the same seeds at three thresholds; Decision D3 asked whether 0.5');
  say('  churns materially more than 0.6 at fifteen');
  const barCells = new Map<string, Cell>();
  for (const bar of BARS) {
    for (const win of WINDOWS) {
      const arm = `bar ${bar.toFixed(2)}`;
      const cell = await measure(arm, win, {
        ...ALPHA_PRESET_OVERRIDES,
        adoptionThresholdStart: bar, adoptionThresholdEnd: bar,
      }, seeds);
      barCells.set(`${bar}/${win.name}`, cell);
      all.push(cell);
      say(row(`${arm} · ${win.name}`, cell));
    }
  }
  // **The assertion that matters in this file.** The threshold is pinned, not
  // deleted, and the whole point of keeping the machinery one release is that
  // it cannot bite. Every arm above runs the same seeds through the same
  // engine with a different constant in the constitution: if one day they
  // stop agreeing, something has started reading the bar again and the rule
  // Ed ruled is no longer the rule the engine runs.
  for (const win of WINDOWS) {
    const base = barCells.get(`${BARS[0]!}/${win.name}`)!;
    const same = BARS.slice(1).every((b) => {
      const other = barCells.get(`${b}/${win.name}`)!;
      return other.runs.every((r, i) =>
        r.adoptions === base.runs[i]!.adoptions
        && r.flips === base.runs[i]!.flips
        && r.reversions === base.runs[i]!.reversions
        && r.welfareRatio === base.runs[i]!.welfareRatio);
    });
    check(same, `the bar is inert at ${win.name}: 0.50, 0.60 and 0.80 produce `
      + 'the same adoptions, flips, reversions and welfare on every seed');
  }
  // and the constitution really did carry the different value — otherwise the
  // check above would pass over an override that never arrived
  const h5 = barCells.get(`0.5/meeting`)!.runs[0]!.hash;
  const h8 = barCells.get(`0.8/meeting`)!.runs[0]!.hash;
  check(h5 !== h8, 'and the value was genuinely applied: the genesis event '
    + 'hashes the constitution, so the logs differ though nothing in them does');

  say('\n== 2. what the retired bar would have stopped ==========================');
  say('  every adoption at the pinned bar, by the posterior it was decided on;');
  say('  an upper bound — refusing one adoption changes everything after it');
  for (const win of WINDOWS) {
    const cell = barCells.get(`0.5/${win.name}`)!;
    const firsts: number[] = [];
    const laterFlips: number[] = [];
    const reversions: number[] = [];
    for (const r of cell.runs) {
      for (const site of r.churn) {
        site.adopted.forEach((a, i) => {
          if (a.reversion) reversions.push(a.p);
          else if (i === 0) firsts.push(a.p);
          else laterFlips.push(a.p);
        });
      }
    }
    const under = (xs: number[], b: number): string =>
      xs.length === 0 ? '  — ' : `${((xs.filter((p) => p < b).length / xs.length) * 100).toFixed(0).padStart(3)}%`;
    say(`  ${win.name}:`);
    for (const [name, xs] of [['first adoptions', firsts],
      ['later flips', laterFlips], ['reversions', reversions]] as const) {
      const s = xs.length > 0 ? stat(xs) : null;
      say(`    ${name.padEnd(16)} n=${String(xs.length).padStart(4)}`
        + ` · median p ${s ? median(xs).toFixed(3) : ' —  '}`
        + ` · below 0.60 ${under(xs, 0.6)}`
        + ` · below 0.80 ${under(xs, 0.8)}`
        + ` · below 0.85 ${under(xs, 0.85)}`
        + ` · below 0.95 ${under(xs, 0.95)}`);
    }
  }

  say('\n== 3. the brakes that do exist =========================================');
  say('  at the conference window, where churn is highest');
  const conference = WINDOWS[1]!;
  for (const minutes of [1, 5, 15, 30]) {
    const cell = await measure(`cooldown ${minutes}min`, conference,
      { ...ALPHA_PRESET_OVERRIDES, cooldownMs: minutes * MIN }, seeds);
    all.push(cell);
    say(row(`cooldown ${minutes} min`, cell));
  }
  say('');
  // **The floor as the label states it is the floor at a full group** (Q1439,
  // and Q1439 ruling u since v0.133): `max(Q′, min(2, E))` with
  // `Q′ = min(asked, ⌈G/2⌉)` — SPEC §4.2 and `races.ts`'s `floorFor`, which is
  // the line this one shadows and which no longer carries a ⌈E/3⌉ term at all
  // (R-131). G is the group the leader waits on, and it is E only while nobody
  // has abstained and nobody is indifferent; with 💤 set it shrinks, and so can
  // the floor. So the number in the label is the floor **at the start**, and
  // the printed `stranded` column is what the floor actually came to.
  // The share is ⌈n·G/100⌉, the product before the quotient (issue #24).
  const floorAt = (q: Constitution['quorum']): number => {
    const e = ROOM.personas.length;
    const asked = q === null ? 0 : q.form === 'count' ? q.n : Math.ceil((q.n * e) / 100);
    return Math.max(Math.min(asked, Math.ceil(e / 2)), Math.min(2, e));
  };
  // **The 80 % arm is gone, and it cannot come back** (Q1439, ruling a, R-126):
  // `validateValue` refuses a share above 50, and the engine caps *either* form
  // at half the group it is read against — so at fifteen the strictest floor a
  // room can ask for is 8, where this study once measured 12. The row is a
  // **count** of twelve instead: the same number the old arm reached, asked the
  // only way the surface still allows, and it prints the cap doing its work.
  const QUORUMS: { label: string; q: Constitution['quorum'] }[] = [
    { label: 'no quorum', q: null },
    { label: 'quorum 25% — ongoing', q: { form: 'share', n: 25 } },
    { label: 'quorum 33% — conference', q: { form: 'share', n: 33 } },
    { label: 'quorum 50% — meeting', q: { form: 'share', n: 50 } },
    { label: 'quorum count 12 — capped', q: { form: 'count', n: 12 } },
  ];
  for (const { label, q } of QUORUMS) {
    const cell = await measure(label, conference,
      { ...ALPHA_PRESET_OVERRIDES, quorum: q }, seeds);
    all.push(cell);
    say(row(`${label} · floor ${floorAt(q)}`, cell));
  }

  // **Does a perpetual document ever stop?** Until Q1440 it did: the
  // month-long window ran the same session as the three-day one on every seed,
  // adoption for adoption, so the room reached a fixed point inside three days
  // and the extra twenty-seven were idle turns. **It does not stop now**, and
  // that is this file's largest finding rather than a failure of it: closing a
  // wording the room has refused takes its judgments out of the fit with it
  // (R-122's defect, which was rare while retirement was rare) and §7's
  // performance refund hands the stake back, so the room re-proposes and
  // re-decides for as long as the clock runs. The comparison is reported
  // rather than asserted, and the number beside it is what to read.
  {
    const c = barCells.get('0.5/conference')!;
    const o = barCells.get('0.5/ongoing')!;
    const fixed = o.runs.every((r, i) => r.sig === c.runs[i]!.sig);
    const cs = cellStats(c), os = cellStats(o);
    say(`\n  fixed point: ${fixed ? 'yes — the month is the three days, seed for seed'
      : `NO — ${cs.adoptions.mean.toFixed(0)} adoptions over three days become `
        + `${os.adoptions.mean.toFixed(0)} over a month, still climbing at the close`}`);
  }

  say('\n== 4. the approval floor, as Q1439 left it =============================');
  say('  F counts **approvals** — a member\'s latest judgment of the leader');
  say('  against the text that stands, preferring it — read against the group');
  say('  the leader is waiting on and capped at half of it, and never below');
  say('  a seconder: `max(Q′, min(2, E))` since v0.133 (Ed, ruling u; R-131).');
  say('  **The built-in minimum of ⌈E/3⌉ is gone**, so *no quorum* is a floor');
  say('  of two here where this section once read five. 💤 turns a silence on');
  say('  one candidate into an abstention, which leaves that group. Same seeds.');
  const floorCells = new Map<string, Cell>();
  for (const win of WINDOWS) {
    say(`\n  -- ${win.name}: ${win.note}`);
    for (const { label: ql, q } of Q_ARMS) {
      for (const { label: al, ms } of abstainArmsFor(win)) {
        const cell = await measure(`${ql} · ${al}`, win, {
          ...ALPHA_PRESET_OVERRIDES, quorum: q, abstainAfterMs: ms,
        }, seeds);
        floorCells.set(`${win.name}/${ql}/${al}`, cell);
        all.push(cell);
        say(row(`${ql} · ${al} · floor ${floorAt(q)}`, cell));
      }
    }
  }
  // **With no quorum, 💤 cannot matter**, and that is the mechanism rather than
  // a measurement: the floor is `max(Q′, min(2, E))`, abstention moves only the
  // group `Q′` is read against, and where no quorum was asked `Q′` is zero at
  // any group size — so the seconder is the floor and there is nothing for the
  // period to move. Asserted, because it is the first thing a reader of the
  // table below will suspect is a bug — and because if it ever stops holding,
  // something has started reading the group somewhere it should not.
  for (const win of WINDOWS) {
    const never = floorCells.get(`${win.name}/${Q_ARMS[0]!.label}/${NEVER}`)!;
    for (const { label: al } of abstainArmsFor(win)) {
      if (al === NEVER) continue;
      const other = floorCells.get(`${win.name}/${Q_ARMS[0]!.label}/${al}`)!;
      check(other.runs.every((r, i) => r.sig === never.runs[i]!.sig),
        `with no quorum, 💤 changes nothing at ${win.name} (${al}): the floor `
        + 'is the seconder, and abstention moves only the group a quorum is '
        + 'read against — there being no quorum, it has nothing to move');
    }
  }

  say('\n  what the stranded races ran out on — asked and refused, or not asked?');
  say('  (a stranded race is one whose leader the room prefers to the standing');
  say('  text and which never reached F approvals; `judges` is the meter\'s own');
  say('  number, so judges ≥ floor with approvals < floor is a room that was');
  say('  asked and said no, and judges < floor is a pair that never arrived)');
  for (const win of WINDOWS) {
    for (const { label: ql } of Q_ARMS) {
      for (const { label: al } of abstainArmsFor(win)) {
        const cell = floorCells.get(`${win.name}/${ql}/${al}`)!;
        say(`    ${`${win.name} · ${ql} · ${al}`.padEnd(42)} ${strandedSplit(cell)}`);
      }
    }
  }

  say('\n== 5. domination: a proposal that can never win is closed (Q1440) ======');
  say('  Ed, 2026-09-18: *as soon as it\'s dominated by another option (e.g. it');
  say('  can never win unless people change votes they already cast) then it');
  say('  should be counted as closed.* Nothing closed before this; a wording');
  say('  the room had refused sat in the field until T=0.');
  say('');
  say('  **The control is the 2026-09-18 addendum\'s section 7**, whose rows');
  say('  were taken on the engine of that morning — the same floors, the same');
  say('  seeds, the same room, and no domination. Four of its five quorums');
  say('  reproduce exactly here (10% → 2, 20% → 3, 30% → 5, 50% → 8, since a');
  say('  share is read on the group and capped at half of it either way); its');
  say('  *no quorum* row ran at a floor of one, which no engine can produce');
  say('  now, and *no quorum* below is a floor of two. So every row but that');
  say('  one is a clean A/B on this rule alone, and the report is where the');
  say('  two columns stand side by side.');
  say('');
  say('  `put` is every wording anybody proposed and `closed` is how many the');
  say('  room shut before the clock did — the two numbers that say how much of');
  say('  a change in `adoptions` is the room deciding again rather than the');
  say('  room deciding more.');
  const noMinCells = new Map<string, Cell>();
  for (const win of WINDOWS) {
    say(`\n  -- ${win.name}: ${win.note}`);
    for (const { label: ql, q } of Q5_ARMS) {
      for (const { label: al, ms } of abstainArmsFor(win)) {
        const cell = await measure(`dominated · ${ql} · ${al}`, win, {
          ...ALPHA_PRESET_OVERRIDES, quorum: q, abstainAfterMs: ms,
        }, seeds);
        noMinCells.set(`${win.name}/${ql}/${al}`, cell);
        all.push(cell);
        say(row(`${ql} · ${al} · floor ${floorAt(q)}`, cell));
      }
    }
  }
  // **Does the rule close anything, and does it end the deadlock it could?**
  // Two readings, printed rather than asserted: a rule that closed nothing
  // would be a rule that never fired, and `stranded` — races the window ran
  // out on with the leader on top and short of F — is the number Q1439 built
  // to watch and the one this rule could plausibly drive to zero. It cannot
  // drive it to zero by construction: a leader short of its floor with
  // members who have never answered is not dominated, because those members
  // could still approve it. What it does to the number is the finding.
  for (const win of WINDOWS) {
    const cell = noMinCells.get(`${win.name}/no quorum/${NEVER}`)!;
    const s = cellStats(cell);
    say(`\n  ${win.name} · no quorum · ${NEVER}: `
      + `${s.candidates.mean.toFixed(0)} wordings put, ${s.dominated.mean.toFixed(0)} closed, `
      + `${s.adoptions.mean.toFixed(0)} adoptions, ${s.reversions.mean.toFixed(1)} reversions, `
      + `${s.stranded.mean.toFixed(1)} stranded`);
  }
  check(WINDOWS.some((w) => cellStats(noMinCells.get(`${w.name}/no quorum/${NEVER}`)!)
    .dominated.mean > 0), 'the rule fires: the room closes wordings it can no '
    + 'longer pass, rather than carrying them to the close');

  say('\n  what the stranded races ran out on, with domination:');
  for (const win of WINDOWS) {
    for (const { label: ql } of Q5_ARMS) {
      for (const { label: al } of abstainArmsFor(win)) {
        const cell = noMinCells.get(`${win.name}/${ql}/${al}`)!;
        say(`    ${`${win.name} · ${ql} · ${al}`.padEnd(42)} ${strandedSplit(cell)}`);
      }
    }
  }

  say('\n== the worst seed for reversions, at the pinned bar =====================');
  const told = new Set<string>();
  for (const win of WINDOWS) {
    const cell = barCells.get(`0.5/${win.name}`)!;
    const worst = [...cell.runs].sort((a, b) =>
      b.reversions - a.reversions || a.seed.localeCompare(b.seed))[0]!;
    if (told.has(worst.sig)) {
      say(`  ${win.name} · ${worst.seed}: the same session, adoption for `
        + 'adoption — nothing happened after the window above closed');
      continue;
    }
    told.add(worst.sig);
    say(`  ${win.name} · ${worst.seed}: ${worst.adoptions} adoptions, `
      + `${worst.flips} flips, ${worst.reversions} reversions, `
      + `welfare ${worst.welfareRatio.toFixed(3)}`);
    for (const site of worst.churn) {
      if (site.flips === 0) continue;
      say(`    site ${site.site} — opened: "${short(site.opened)}"`);
      for (const a of site.adopted) {
        say(`      +${(a.t / HOUR).toFixed(1)}h p=${a.p.toFixed(3)}`
          + `${a.reversion ? ' ↩ back to earlier wording' : '  '} "${short(a.text)}"`);
      }
      const last = site.adopted[site.adopted.length - 1]!;
      say(`      settled on: "${short(last.text)}"`
        + (last.text === site.opened ? ' — the wording it opened with' : ''));
    }
  }

  say('\n== housekeeping ========================================================');
  check(all.every((c) => c.runs.every((r) => r.actions < MAX_ACTIONS)),
    'no run stopped at the action cap: the window is the axis, not the cap');
  say('  cell digests (a re-run of this file must print these unchanged):');
  for (const c of all) say(`    ${(c.arm + ' · ' + c.window).padEnd(34)} ${digest(c)}`);

  if (out !== '') {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const file = path.resolve(here, '..', out);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const head = 'arm,window,seed,alive,adoptions,flips,reversions,welfareRatio,'
      + 'judgments,firstAdoptionMin,stranded\n';
    fs.writeFileSync(file, head + all.flatMap((c) => c.runs.map((r) =>
      `"${c.arm}",${c.window},${r.seed},${r.alive ? 1 : 0},${r.adoptions},`
      + `${r.flips},${r.reversions},${r.welfareRatio.toFixed(4)},${r.judgments},`
      + `${r.firstAdoptionMs === null ? '' : (r.firstAdoptionMs / MIN).toFixed(1)},`
      + `${r.stranded.length}`))
      .join('\n') + '\n', 'utf8');
    say(`\n  CSV: ${file}`);
  }
  finish();
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

const short = (s: string): string => (s.length > 62 ? `${s.slice(0, 59)}…` : s);

void main();
