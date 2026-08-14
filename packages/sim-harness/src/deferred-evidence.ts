/**
 * Deferred-questions evidence pass (QUESTIONS #8, #9, #10, #13): scripted,
 * deterministic, LLM-free sweeps producing the evidence those items wait
 * on. One study per question; every configuration runs across multiple
 * seeds and reports means and spreads, never single runs.
 *
 *   npm run evidence -w @draft/sim-harness -- [--q all|8|9|10|13]
 *       [--seeds N] [--hours H]
 *
 * Output: per-question tables on stdout plus a CSV per question in runs/.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Session } from '../../engine-core/src/index.js';
import { ScriptedPersona, type PersonaTelemetry } from './persona.js';
import { ProposeCPersona } from './propose-c-persona.js';
import {
  optimalAssignment,
  assignmentWelfare,
  type Assignment,
  type PersonaProfile,
  type Scenario,
} from './scenario.js';
import { clubhouseScenario } from './clubhouse.js';
import { charterScenario } from './scenario.js';
import { careMapScenario, computeCareMap, spearman, type CareMapIssueRow } from './care-map.js';
import { auditTokens } from './token-audit.js';
import { runSession, type RosterEvent, type RunResult } from './runner.js';

const HOURS = 3600_000;

// ---------------------------------------------------------------------------
// Small helpers

interface Stat {
  mean: number;
  sd: number;
  min: number;
  max: number;
}

function stat(xs: number[]): Stat {
  const mean = xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const sd = Math.sqrt(
    xs.reduce((a, x) => a + (x - mean) ** 2, 0) / Math.max(1, xs.length),
  );
  return { mean, sd, min: Math.min(...xs), max: Math.max(...xs) };
}

const f2 = (x: number): string => (Number.isFinite(x) ? x.toFixed(2) : '—');
const pm = (s: Stat): string => `${f2(s.mean)}±${f2(s.sd)}`;

class Telemetry implements PersonaTelemetry {
  starvedEvents: Array<{ id: string; t: number }> = [];
  blockedEvents: Array<{ id: string; t: number }> = [];
  starved(id: string, t: number): void {
    this.starvedEvents.push({ id, t });
  }
  proposeCBlocked(id: string, t: number): void {
    this.blockedEvents.push({ id, t });
  }
}

function slice(scenario: Scenario, n: number): Scenario {
  return {
    ...scenario,
    name: `${scenario.name}-${n}`,
    personas: scenario.personas.slice(0, n),
  };
}

/** Adoption events with movers-at-adoption recovered by prefix replay. */
interface AdoptionDetail {
  seq: number;
  t: number;
  candidateId: string;
  p: number;
  threshold: number;
  movers: number;
}

function adoptionDetails(session: Session): AdoptionDetail[] {
  const out: AdoptionDetail[] = [];
  for (const entry of session.log) {
    const e = entry.event;
    if (e.type !== 'adopted') continue;
    const before = Session.replay(session.log.slice(0, entry.seq));
    const race = before.races().find((r) => r.members.includes(e.candidateId));
    out.push({
      seq: entry.seq,
      t: e.t,
      candidateId: e.candidateId,
      p: e.p,
      threshold: e.threshold,
      movers: race?.distinctMovers ?? NaN,
    });
  }
  return out;
}

/**
 * Welfare ratio of a final text over an arbitrary persona subset — the
 * same accounting as computeMetrics, but with the roster swapped, so
 * roster-change arms can be scored over exactly the members present (or
 * a common subset, for apples-to-apples across arms).
 */
const optimalCache = new Map<string, { assignment: Assignment; scenario: Scenario }>();
function welfareRatioOver(
  base: Scenario,
  personas: PersonaProfile[],
  finalText: string,
): number {
  const key = `${base.name}|${personas.map((p) => p.id).join(',')}`;
  let entry = optimalCache.get(key);
  if (!entry) {
    const scenario = { ...base, personas };
    entry = { assignment: optimalAssignment(scenario), scenario };
    optimalCache.set(key, entry);
  }
  const { scenario, assignment: optimal } = entry;
  const finalLines = finalText.split('\n');
  const achieved: Assignment = new Map();
  const incumbent: Assignment = new Map();
  for (const issue of scenario.issues) {
    const matched = issue.alternatives.find((a) => a.text === finalLines[issue.line]);
    achieved.set(issue.key, matched ?? issue.alternatives[0]!);
    incumbent.set(issue.key, issue.alternatives[0]!);
  }
  const wAch = assignmentWelfare(scenario, achieved);
  const wOpt = assignmentWelfare(scenario, optimal);
  const wInc = assignmentWelfare(scenario, incumbent);
  const span = wOpt - wInc;
  return span > 1e-9 ? (wAch - wInc) / span : 1;
}

function writeCsv(name: string, header: string, rows: string[]): string {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'runs');
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, name);
  fs.writeFileSync(out, [header, ...rows].join('\n') + '\n', 'utf8');
  return out;
}

// ---------------------------------------------------------------------------
// Q8 — mixed clocks feel: wall-clock drip vs wall-clock threshold ramp

interface Q8Row {
  arm: string;
  seed: string;
  adoptions: number;
  quarters: [number, number, number, number];
  firstAdoptionH: number | null;
  meanThreshold: number | null;
  starved: number;
  wastedDrip: number;
  personasCapped: number;
  welfare: number;
  backlog: number;
  judgments: number;
}

async function q8(seeds: number, hours: number): Promise<void> {
  const windowMs = hours * HOURS;
  const arms: Array<{ name: string; scenario: Scenario }> = [
    { name: 'roster-5', scenario: slice(clubhouseScenario, 5) },
    { name: 'roster-8', scenario: slice(clubhouseScenario, 8) },
    { name: 'roster-14', scenario: clubhouseScenario },
    {
      // Slow early participation: everyone's first bout lands after 40%
      // of the window — the low-threshold phase passes with nobody there.
      name: 'roster-8-slow-start',
      scenario: {
        ...slice(clubhouseScenario, 8),
        name: 'clubhouse-8-slow',
        personas: slice(clubhouseScenario, 8).personas.map((p) => ({
          ...p,
          arrivalDelayMs: 0.4 * windowMs,
        })),
      },
    },
  ];
  const rows: Q8Row[] = [];
  for (const arm of arms) {
    for (let i = 0; i < seeds; i++) {
      const seed = `ev8-${i}`;
      const telemetry = new Telemetry();
      const { session, metrics } = await runSession({
        scenario: arm.scenario,
        windowMs,
        seed,
        makePersona: (profile, rng) =>
          new ScriptedPersona(profile, arm.scenario, rng, telemetry),
      });
      const adoptions = adoptionDetails(session);
      const quarters: [number, number, number, number] = [0, 0, 0, 0];
      for (const a of adoptions) {
        const qi = Math.min(3, Math.floor((a.t * 4) / windowMs));
        quarters[qi]!++;
      }
      const audit = auditTokens(session);
      if (!audit.consistent) console.error(`WARNING: token audit inconsistent (${arm.name}/${seed})`);
      let wasted = 0;
      let capped = 0;
      for (const a of audit.perParticipant.values()) {
        wasted += a.wastedDrip;
        if (a.wastedDrip > 0) capped++;
      }
      rows.push({
        arm: arm.name,
        seed,
        adoptions: adoptions.length,
        quarters,
        firstAdoptionH: adoptions.length > 0 ? adoptions[0]!.t / HOURS : null,
        meanThreshold:
          adoptions.length > 0
            ? adoptions.reduce((x, a) => x + a.threshold, 0) / adoptions.length
            : null,
        starved: telemetry.starvedEvents.length,
        wastedDrip: wasted,
        personasCapped: capped,
        welfare: metrics.welfareRatio,
        backlog: metrics.backlogSize,
        judgments: metrics.edgeComparisons + metrics.diagonalComparisons,
      });
    }
  }

  console.log(`\n=== Q8: mixed clocks (window ${hours}h, ${seeds} seeds/arm) ===`);
  for (const arm of arms) {
    const g = rows.filter((r) => r.arm === arm.name);
    const q = [0, 1, 2, 3].map((k) => stat(g.map((r) => r.quarters[k]!)));
    const withAdoptions = g.filter((r) => r.firstAdoptionH !== null);
    console.log(
      `  ${arm.name.padEnd(22)} adoptions ${pm(stat(g.map((r) => r.adoptions)))} ` +
        `by quarter [${q.map((s) => f2(s.mean)).join(', ')}] · ` +
        `first at ${withAdoptions.length > 0 ? f2(stat(withAdoptions.map((r) => r.firstAdoptionH!)).mean) : '—'}h · ` +
        `bar cleared ${withAdoptions.length > 0 ? f2(stat(withAdoptions.map((r) => r.meanThreshold!)).mean) : '—'}`,
    );
    console.log(
      `  ${''.padEnd(22)} starved ${pm(stat(g.map((r) => r.starved)))}/run · ` +
        `drip lost to cap ${pm(stat(g.map((r) => r.wastedDrip)))} tokens/run over ` +
        `${pm(stat(g.map((r) => r.personasCapped)))} personas · ` +
        `welfare ${pm(stat(g.map((r) => r.welfare)))} · backlog ${pm(stat(g.map((r) => r.backlog)))} · ` +
        `judgments ${f2(stat(g.map((r) => r.judgments)).mean)}`,
    );
  }
  const csv = writeCsv(
    'evidence-q8.csv',
    'arm,seed,adoptions,q1,q2,q3,q4,firstAdoptionH,meanThreshold,starved,wastedDrip,personasCapped,welfare,backlog,judgments',
    rows.map((r) =>
      [
        r.arm, r.seed, r.adoptions, ...r.quarters,
        r.firstAdoptionH === null ? '' : r.firstAdoptionH.toFixed(3),
        r.meanThreshold === null ? '' : r.meanThreshold.toFixed(4),
        r.starved, r.wastedDrip.toFixed(2), r.personasCapped,
        r.welfare.toFixed(4), r.backlog, r.judgments,
      ].join(','),
    ),
  );
  console.log(`  CSV: ${csv}`);
}

// ---------------------------------------------------------------------------
// Q9 — propose-C staking: does peek-price + stake over-deter drafting?

interface Q9Row {
  arm: string;
  seed: string;
  entries: number;
  cSubmissions: number;
  cAdopted: number;
  blocked: number;
  starved: number;
  candidates: number;
  adoptions: number;
  welfare: number;
  backlog: number;
  edges: number;
}

async function q9(seeds: number, hours: number): Promise<void> {
  const windowMs = hours * HOURS;
  const scenario = clubhouseScenario;
  const arms: Array<{ name: string; proposeC: number; stake?: number }> = [
    { name: 'propensity-0.0', proposeC: 0 },
    { name: 'propensity-0.3', proposeC: 0.3 },
    { name: 'propensity-0.6', proposeC: 0.6 },
    // Same propensity, stake removed session-wide: how much drafting was
    // the stake itself deterring? (The engine has no per-path stake knob,
    // so this is the honest available contrast.)
    { name: 'propensity-0.3-stake-0', proposeC: 0.3, stake: 0 },
  ];
  const rows: Q9Row[] = [];
  for (const arm of arms) {
    const armScenario: Scenario = {
      ...scenario,
      personas: scenario.personas.map((p) => ({ ...p, proposeC: arm.proposeC })),
    };
    for (let i = 0; i < seeds; i++) {
      const seed = `ev9-${i}`;
      const telemetry = new Telemetry();
      const { session, metrics } = await runSession({
        scenario: armScenario,
        windowMs,
        seed,
        constitutionOverrides: arm.stake !== undefined ? { stake: arm.stake } : {},
        makePersona: (profile, rng) =>
          new ProposeCPersona(profile, armScenario, rng, telemetry),
      });
      // Composer entries and the drafts that followed them (adjacent in
      // the log at the same time by the same participant).
      let entries = 0;
      const cIds: string[] = [];
      for (let s = 0; s < session.log.length; s++) {
        const e = session.log[s]!.event;
        if (e.type !== 'composer-opened') continue;
        entries++;
        const following = session.log[s + 1]?.event;
        if (
          following &&
          following.type === 'candidate-submitted' &&
          following.t === e.t &&
          following.author === e.participantId
        ) {
          cIds.push(following.id);
        }
      }
      const cAdopted = cIds.filter(
        (id) => session.getCandidate(id).state === 'adopted',
      ).length;
      rows.push({
        arm: arm.name,
        seed,
        entries,
        cSubmissions: cIds.length,
        cAdopted,
        blocked: telemetry.blockedEvents.length,
        starved: telemetry.starvedEvents.length,
        candidates: metrics.candidates,
        adoptions: metrics.adoptions,
        welfare: metrics.welfareRatio,
        backlog: metrics.backlogSize,
        edges: metrics.edgeComparisons,
      });
    }
  }

  console.log(`\n=== Q9: propose-C staking (clubhouse-14, ${hours}h, ${seeds} seeds/arm) ===`);
  for (const arm of arms) {
    const g = rows.filter((r) => r.arm === arm.name);
    console.log(
      `  ${arm.name.padEnd(24)} composer entries ${pm(stat(g.map((r) => r.entries)))} · ` +
        `C-drafts ${pm(stat(g.map((r) => r.cSubmissions)))} ` +
        `(adopted ${f2(stat(g.map((r) => r.cAdopted)).mean)}) · ` +
        `stake-blocked ${pm(stat(g.map((r) => r.blocked)))} · starved ${f2(stat(g.map((r) => r.starved)).mean)}`,
    );
    console.log(
      `  ${''.padEnd(24)} candidates ${pm(stat(g.map((r) => r.candidates)))} · ` +
        `adoptions ${pm(stat(g.map((r) => r.adoptions)))} · ` +
        `welfare ${pm(stat(g.map((r) => r.welfare)))} · backlog ${pm(stat(g.map((r) => r.backlog)))} · ` +
        `edge judgments ${f2(stat(g.map((r) => r.edges)).mean)}`,
    );
  }
  const csv = writeCsv(
    'evidence-q9.csv',
    'arm,seed,entries,cSubmissions,cAdopted,blocked,starved,candidates,adoptions,welfare,backlog,edges',
    rows.map((r) =>
      [
        r.arm, r.seed, r.entries, r.cSubmissions, r.cAdopted, r.blocked, r.starved,
        r.candidates, r.adoptions, r.welfare.toFixed(4), r.backlog, r.edges,
      ].join(','),
    ),
  );
  console.log(`  CSV: ${csv}`);
}

// ---------------------------------------------------------------------------
// Q10 — roster-change mechanics (§9.3): join, author removal, F drop

interface Q10Row {
  arm: string;
  seed: string;
  adoptions: number;
  lateAdoptions: number;
  /** Adoptions after the 60% mark — the F-drop arm's like-for-like window. */
  lateAdoptions60: number;
  belowOldFloorAdoptions: number;
  joinerBalance: number | null;
  othersMeanBalance: number | null;
  joinerJudgments: number | null;
  joinerDrafts: number | null;
  orphansAtRemoval: number | null;
  orphansAdopted: number | null;
  /**
   * Welfare of the final text scored over each fixed roster subset, for
   * every arm — so any arm compares to baseline over the same people.
   */
  welfare8: number;
  welfare9: number;
  welfare7: number;
  welfare6: number;
  backlog: number;
}

async function q10(seeds: number, hours: number): Promise<void> {
  const windowMs = hours * HOURS;
  const base8 = slice(clubhouseScenario, 8);
  const rosa = clubhouseScenario.personas.find((p) => p.id === 'p13')!;
  const joinT = 0.5 * windowMs;
  const removeT = 0.5 * windowMs;
  const dropT = 0.6 * windowMs;
  const oldFloor = Math.ceil(8 / 3); // 3 movers before any removal

  const roster8 = base8.personas;
  const roster9 = [...base8.personas, rosa];
  const roster7 = base8.personas.filter((p) => p.id !== 'p7');
  const roster6 = base8.personas.filter((p) => p.id !== 'p2' && p.id !== 'p5');

  const arms: Array<{ name: string; events: RosterEvent[] }> = [
    { name: 'baseline', events: [] },
    { name: 'join-50pct', events: [{ atMs: joinT, kind: 'join', profile: rosa }] },
    {
      // p7 Gale: high draftiness, so live candidates at removal are likely.
      name: 'remove-author-50pct',
      events: [{ atMs: removeT, kind: 'remove', participantId: 'p7' }],
    },
    {
      // Removing two members drops E 8→6, so F drops ceil(8/3)=3 → 2:
      // any race waiting at 2 movers becomes adoptable the next judgment.
      name: 'f-drop-60pct',
      events: [
        { atMs: dropT, kind: 'remove', participantId: 'p2' },
        { atMs: dropT + 1, kind: 'remove', participantId: 'p5' },
      ],
    },
  ];

  const rows: Q10Row[] = [];
  for (const arm of arms) {
    for (let i = 0; i < seeds; i++) {
      const seed = `ev10-${i}`;
      const result: RunResult = await runSession({
        scenario: base8,
        windowMs,
        seed,
        rosterEvents: arm.events,
        makePersona: (profile, rng) => new ScriptedPersona(profile, base8, rng),
      });
      const { session, metrics } = result;
      const adoptions = adoptionDetails(session);
      const changeT = arm.name === 'f-drop-60pct' ? dropT : joinT;
      const late = adoptions.filter((a) => a.t >= changeT);
      const late60 = adoptions.filter((a) => a.t >= dropT);

      let joinerBalance: number | null = null;
      let othersMean: number | null = null;
      let joinerJudgments: number | null = null;
      let joinerDrafts: number | null = null;
      if (arm.name === 'join-50pct') {
        const audit = auditTokens(session, [joinT]);
        joinerBalance = audit.perParticipant.get('p13')?.balanceAtJoin ?? null;
        const others = [...audit.perParticipant.entries()]
          .filter(([id]) => id !== 'p13')
          .map(([, a]) => a.snapshots.get(joinT) ?? 0);
        othersMean = stat(others).mean;
        joinerJudgments = metrics.participation['p13']?.judgments ?? 0;
        joinerDrafts = metrics.participation['p13']?.drafts ?? 0;
      }

      let orphansAtRemoval: number | null = null;
      let orphansAdopted: number | null = null;
      if (arm.name === 'remove-author-50pct') {
        const removalSeq = session.log.find(
          (l) => l.event.type === 'participant-removed',
        )?.seq;
        if (removalSeq !== undefined) {
          const before = Session.replay(session.log.slice(0, removalSeq));
          const orphans = before
            .allCandidates()
            .filter((c) => c.author === 'p7' && c.state === 'live')
            .map((c) => c.id);
          orphansAtRemoval = orphans.length;
          orphansAdopted = orphans.filter(
            (id) => session.getCandidate(id).state === 'adopted',
          ).length;
        }
      }

      rows.push({
        arm: arm.name,
        seed,
        adoptions: adoptions.length,
        lateAdoptions: late.length,
        lateAdoptions60: late60.length,
        belowOldFloorAdoptions: late.filter((a) => a.movers < oldFloor).length,
        joinerBalance,
        othersMeanBalance: othersMean,
        joinerJudgments,
        joinerDrafts,
        orphansAtRemoval,
        orphansAdopted,
        welfare8: welfareRatioOver(base8, roster8, metrics.finalText),
        welfare9: welfareRatioOver(base8, roster9, metrics.finalText),
        welfare7: welfareRatioOver(base8, roster7, metrics.finalText),
        welfare6: welfareRatioOver(base8, roster6, metrics.finalText),
        backlog: metrics.backlogSize,
      });
    }
  }

  console.log(`\n=== Q10: roster changes (clubhouse-8, ${hours}h, ${seeds} seeds/arm) ===`);
  for (const arm of arms) {
    const g = rows.filter((r) => r.arm === arm.name);
    console.log(
      `  ${arm.name.padEnd(22)} adoptions ${pm(stat(g.map((r) => r.adoptions)))} ` +
        `(after change ${f2(stat(g.map((r) => r.lateAdoptions)).mean)}, ` +
        `after 60% ${f2(stat(g.map((r) => r.lateAdoptions60)).mean)}, ` +
        `below old floor ${f2(stat(g.map((r) => r.belowOldFloorAdoptions)).mean)}) · ` +
        `welfare 8/9/7/6: ${pm(stat(g.map((r) => r.welfare8)))} / ` +
        `${pm(stat(g.map((r) => r.welfare9)))} / ` +
        `${pm(stat(g.map((r) => r.welfare7)))} / ` +
        `${pm(stat(g.map((r) => r.welfare6)))} · ` +
        `backlog ${f2(stat(g.map((r) => r.backlog)).mean)}`,
    );
    if (arm.name === 'join-50pct') {
      const jb = g.map((r) => r.joinerBalance ?? 0);
      const ob = g.map((r) => r.othersMeanBalance ?? 0);
      console.log(
        `  ${''.padEnd(22)} joiner balance at join ${pm(stat(jb))} vs roster mean ${pm(stat(ob))} · ` +
          `joiner judgments ${f2(stat(g.map((r) => r.joinerJudgments ?? 0)).mean)}, ` +
          `drafts ${f2(stat(g.map((r) => r.joinerDrafts ?? 0)).mean)}`,
      );
    }
    if (arm.name === 'remove-author-50pct') {
      console.log(
        `  ${''.padEnd(22)} orphan candidates at removal ${pm(stat(g.map((r) => r.orphansAtRemoval ?? 0)))} · ` +
          `of which later adopted ${f2(stat(g.map((r) => r.orphansAdopted ?? 0)).mean)}`,
      );
    }
  }
  const csv = writeCsv(
    'evidence-q10.csv',
    'arm,seed,adoptions,lateAdoptions,lateAdoptions60,belowOldFloorAdoptions,joinerBalance,othersMeanBalance,joinerJudgments,joinerDrafts,orphansAtRemoval,orphansAdopted,welfare8,welfare9,welfare7,welfare6,backlog',
    rows.map((r) =>
      [
        r.arm, r.seed, r.adoptions, r.lateAdoptions, r.lateAdoptions60, r.belowOldFloorAdoptions,
        r.joinerBalance ?? '', r.othersMeanBalance?.toFixed(2) ?? '',
        r.joinerJudgments ?? '', r.joinerDrafts ?? '',
        r.orphansAtRemoval ?? '', r.orphansAdopted ?? '',
        r.welfare8.toFixed(4), r.welfare9.toFixed(4), r.welfare7.toFixed(4),
        r.welfare6.toFixed(4), r.backlog,
      ].join(','),
    ),
  );
  console.log(`  CSV: ${csv}`);
}

// ---------------------------------------------------------------------------
// Q13 — care-map evidence variant: incumbent-only vs all indifference

const COLD_CUTOFF = 0.5;

async function q13(seeds: number, hours: number): Promise<void> {
  const windowMs = hours * HOURS;
  const scenarios = [careMapScenario, charterScenario, clubhouseScenario];
  const csvRows: string[] = [];
  console.log(`\n=== Q13: care-map variants (${hours}h, ${seeds} seeds/scenario) ===`);
  for (const scenario of scenarios) {
    // Pool tie counts across seeds per issue; track per-seed classification
    // disagreement between the variants.
    const pooled = new Map<string, CareMapIssueRow>();
    let disagreements = 0;
    let classifiable = 0;
    for (let i = 0; i < seeds; i++) {
      const seed = `ev13-${i}`;
      const { session } = await runSession({
        scenario,
        windowMs,
        seed,
        makePersona: (profile, rng) => new ScriptedPersona(profile, scenario, rng),
      });
      for (const row of computeCareMap(session, scenario)) {
        const p = pooled.get(row.issue);
        if (p) {
          p.incTies += row.incTies;
          p.incN += row.incN;
          p.allTies += row.allTies;
          p.allN += row.allN;
        } else {
          pooled.set(row.issue, { ...row });
        }
        if (row.incN >= 3 && row.allN >= 3) {
          classifiable++;
          const coldA = row.incTies / row.incN >= COLD_CUTOFF;
          const coldB = row.allTies / row.allN >= COLD_CUTOFF;
          if (coldA !== coldB) disagreements++;
        }
      }
    }
    const issues = scenario.issues.map((i) => pooled.get(i.key)!);
    const rateA = issues.map((r) => (r.incN > 0 ? r.incTies / r.incN : 0));
    const rateB = issues.map((r) => (r.allN > 0 ? r.allTies / r.allN : 0));
    const truth = issues.map((r) => r.truthAll);
    const truthInc = issues.map((r) => r.truthInc);
    const maeA = stat(issues.map((r, k) => Math.abs(rateA[k]! - r.truthAll))).mean;
    const maeB = stat(issues.map((r, k) => Math.abs(rateB[k]! - r.truthAll))).mean;
    const maeAInc = stat(issues.map((r, k) => Math.abs(rateA[k]! - r.truthInc))).mean;
    const maeBInc = stat(issues.map((r, k) => Math.abs(rateB[k]! - r.truthInc))).mean;
    console.log(`  scenario "${scenario.name}":`);
    for (const [k, r] of issues.entries()) {
      console.log(
        `    ${r.issue.padEnd(18)} inc-only ${f2(rateA[k]!)} (n=${r.incN})` +
          ` · all ${f2(rateB[k]!)} (n=${r.allN})` +
          ` · truth(all-pairs) ${f2(r.truthAll)} · truth(vs-incumbent) ${f2(r.truthInc)}`,
      );
      csvRows.push(
        [
          scenario.name, r.issue, rateA[k]!.toFixed(4), r.incN,
          rateB[k]!.toFixed(4), r.allN, r.truthAll.toFixed(4), r.truthInc.toFixed(4),
        ].join(','),
      );
    }
    console.log(
      `    variants disagree on cold/not-cold in ${disagreements}/${classifiable} ` +
        `classifiable issue-runs (cutoff ${COLD_CUTOFF})`,
    );
    console.log(
      `    vs truth(all-pairs):    rank corr inc-only ${f2(spearman(rateA, truth))}, all ${f2(spearman(rateB, truth))} · ` +
        `mean abs error inc-only ${f2(maeA)}, all ${f2(maeB)}`,
    );
    console.log(
      `    vs truth(vs-incumbent): rank corr inc-only ${f2(spearman(rateA, truthInc))}, all ${f2(spearman(rateB, truthInc))} · ` +
        `mean abs error inc-only ${f2(maeAInc)}, all ${f2(maeBInc)}`,
    );
  }
  const csv = writeCsv(
    'evidence-q13.csv',
    'scenario,issue,incRate,incN,allRate,allN,truthAll,truthInc',
    csvRows,
  );
  console.log(`  CSV: ${csv}`);
}

// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { q: string; seeds: number; hours: number } {
  const args = { q: 'all', seeds: 10, hours: 8 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--q') args.q = argv[++i] ?? 'all';
    else if (a === '--seeds') args.seeds = Number(argv[++i]) || 10;
    else if (a === '--hours') args.hours = Number(argv[++i]) || 8;
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const t0 = Date.now();
  if (args.q === 'all' || args.q === '8') await q8(args.seeds, args.hours);
  if (args.q === 'all' || args.q === '9') await q9(args.seeds, args.hours);
  if (args.q === 'all' || args.q === '10') await q10(args.seeds, args.hours);
  if (args.q === 'all' || args.q === '13') await q13(args.seeds, args.hours);
  console.log(`\ndone in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
