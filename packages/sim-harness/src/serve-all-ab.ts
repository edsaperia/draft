/**
 * The serve-all A/B (Q1178, Ed 2026-09-09): the hot-3 hand against a hand
 * that holds every live race, on the sim, before SPEC §8.3's sentence is
 * written. Scripted, deterministic, LLM-free, in the style of
 * `deferred-evidence.ts`: every cell runs many seeds and reports means and
 * spreads, never single runs, and the two arms share every seed so the
 * welfare difference is read *paired* — per seed, then mean and sd of the
 * differences — which is the honest answer to "larger than seed noise?".
 *
 *   npm run ab:serve -w @draft/sim-harness -- [--seeds N] [--hours H]
 *       [--rosters 5,10,14,20] [--scenario clubhouse|charter|both]
 *       [--out runs/serve-all-ab.csv]
 *
 * What the arms are. Both hands are `feed()` as it stands after Part 1 of
 * the plan (no unheard slot): ordered by v / c_p, the ×1.25 unheard boost a
 * value, the exploration roll and the idle diagonal unchanged. `hot-3` is
 * `hotSetSize: 3`, the shipped default; `serve-all` is `hotSetSize: 1000`,
 * every race — a number rather than Infinity so the knob stays a serialised
 * `Constitution` field. A persona draws one card at a time
 * (`nextCards(1, t)`), and the round robin restarts per call, so the two
 * differ for a persona only when the top three races have nothing left to
 * ask them: under hot-3 the draw comes back empty and the bout ends, under
 * serve-all it continues down the ordered list. That is what is measured.
 *
 * Rosters are slices of each scenario's fourteen personas; a roster above
 * fourteen is the fourteen plus clones of the first profiles (same stances,
 * salience and rhythm, a new id and handle), stated in the output as such.
 *
 * Output: one markdown table per scenario on stdout, a paired-difference
 * table, and a CSV of every run in runs/.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Constitution } from '../../engine-core/src/index.js';
import { ScriptedPersona } from './persona.js';
import { charterScenario, type PersonaProfile, type Scenario } from './scenario.js';
import { clubhouseScenario } from './clubhouse.js';
import { runSession } from './runner.js';
import type { Metrics } from './metrics.js';

const HOURS = 3600_000;

interface Arm {
  name: string;
  overrides: Partial<Constitution>;
}

const ARMS: Arm[] = [
  { name: 'hot-3', overrides: { hotSetSize: 3 } },
  { name: 'serve-all', overrides: { hotSetSize: 1000 } },
];

interface Args {
  seeds: number;
  hours: number;
  rosters: number[];
  scenarios: Scenario[];
  out: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    seeds: 30, hours: 8, rosters: [5, 10, 14, 20],
    scenarios: [clubhouseScenario, charterScenario], out: '',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seeds') args.seeds = Number(argv[++i]) || 30;
    else if (a === '--hours') args.hours = Number(argv[++i]) || 8;
    else if (a === '--rosters') {
      args.rosters = (argv[++i] ?? '').split(',').map((s) => Number(s)).filter((n) => n > 0);
    } else if (a === '--scenario') {
      const s = argv[++i] ?? 'both';
      args.scenarios = s === 'clubhouse' ? [clubhouseScenario]
        : s === 'charter' ? [charterScenario] : [clubhouseScenario, charterScenario];
    } else if (a === '--out') args.out = argv[++i] ?? '';
  }
  return args;
}

/**
 * The room at size n. Up to the cast, a slice (the sweep's `atRoster`, the
 * latent model and the issues unchanged); above it, clones of the first
 * profiles under new ids — a member with the same preferences and rhythm,
 * which is the only honest way to a roster the scenario never wrote.
 */
function atRoster(scenario: Scenario, n: number): Scenario {
  const cast = scenario.personas;
  if (n <= cast.length) {
    return { ...scenario, name: `${scenario.name}-${n}`, personas: cast.slice(0, n) };
  }
  const personas: PersonaProfile[] = [...cast];
  for (let k = 0; personas.length < n; k++) {
    const src = cast[k % cast.length]!;
    const gen = Math.floor(k / cast.length) + 2;
    personas.push({ ...src, id: `${src.id}x${gen}`, handle: `${src.handle} ${gen}` });
  }
  return { ...scenario, name: `${scenario.name}-${n}`, personas };
}

interface Row {
  scenario: string;
  roster: number;
  arm: string;
  seed: string;
  m: Metrics;
}

interface Stat { mean: number; sd: number }

function stat(xs: number[]): Stat {
  if (xs.length === 0) return { mean: NaN, sd: NaN };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / xs.length);
  return { mean, sd };
}

const f2 = (x: number): string => (Number.isFinite(x) ? x.toFixed(2) : '—');
const f3 = (x: number): string => (Number.isFinite(x) ? x.toFixed(3) : '—');
const pm = (s: Stat, f = f3): string => `${f(s.mean)}±${f(s.sd)}`;

async function runOne(scenario: Scenario, hours: number, seed: string, arm: Arm): Promise<Metrics> {
  const result = await runSession({
    scenario,
    windowMs: hours * HOURS,
    seed,
    constitutionOverrides: arm.overrides,
    makePersona: (profile, rng) => new ScriptedPersona(profile, scenario, rng),
  });
  return result.metrics;
}

/** One cell: an arm at a roster in a scenario, over every seed. */
function cell(rows: Row[], hours: number): string {
  const ms = rows.map((r) => r.m);
  const welfare = stat(ms.map((m) => m.welfareRatio));
  const adopted = ms.filter((m) => m.firstAdoptionMs !== null);
  const first = stat(adopted.map((m) => m.firstAdoptionMs! / HOURS));
  const adoptions = ms.reduce((a, m) => a + m.adoptions, 0);
  const judgments = ms.reduce((a, m) => a + m.edgeComparisons + m.diagonalComparisons, 0);
  const turns = ms.reduce((a, m) => a + m.turns, 0);
  const idle = ms.reduce((a, m) => a + m.idleTurns, 0);
  const never = stat(ms.map((m) => m.candidatesNeverJudged));
  const cands = stat(ms.map((m) => m.candidates));
  return [
    pm(welfare),
    `${f2(first.mean)}h` + (adopted.length < ms.length ? ` (${ms.length - adopted.length} never)` : ''),
    f2(adoptions / ms.length / hours),
    adoptions > 0 ? f2(judgments / adoptions) : '—',
    `${(100 * idle / Math.max(1, turns)).toFixed(1)}%`,
    `${pm(never, f2)} of ${f2(cands.mean)}`,
  ].join(' | ');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const seeds = Array.from({ length: args.seeds }, (_, i) => `ab-${i}`);
  const rows: Row[] = [];
  const t0 = Date.now();
  console.log(`serve-all A/B: ${args.scenarios.map((s) => s.name).join(' + ')} · rosters ` +
    `${args.rosters.join(', ')} · ${args.seeds} seeds · ${args.hours}h window · arms ` +
    ARMS.map((a) => `${a.name} (hotSetSize ${a.overrides.hotSetSize})`).join(' vs '));

  for (const base of args.scenarios) {
    for (const n of args.rosters) {
      const scenario = atRoster(base, n);
      const cloned = scenario.personas.length - base.personas.length;
      for (const arm of ARMS) {
        for (const seed of seeds) {
          rows.push({ scenario: base.name, roster: n, arm: arm.name, seed,
            m: await runOne(scenario, args.hours, seed, arm) });
        }
      }
      console.log(`  ${scenario.name} done` + (cloned > 0 ? ` (${cloned} cloned personas)` : '') +
        ` — ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }

  // the CSV of every run
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'runs');
  fs.mkdirSync(dir, { recursive: true });
  const out = args.out || path.join(dir, 'serve-all-ab.csv');
  const header = 'scenario,roster,arm,seed,welfareRatio,adoptions,firstAdoptionMs,judgments,' +
    'turns,idleTurns,candidates,candidatesNeverJudged,backlogSize';
  fs.writeFileSync(out, [header, ...rows.map((r) => [
    r.scenario, r.roster, r.arm, r.seed, r.m.welfareRatio.toFixed(4), r.m.adoptions,
    r.m.firstAdoptionMs ?? '', r.m.edgeComparisons + r.m.diagonalComparisons, r.m.turns,
    r.m.idleTurns, r.m.candidates, r.m.candidatesNeverJudged, r.m.backlogSize,
  ].join(','))].join('\n') + '\n', 'utf8');

  // the tables
  console.log(`\n=== serve-all A/B (${rows.length} runs, ${args.seeds} seeds per cell, ` +
    `${args.hours}h window; CSV: ${out}) ===`);
  for (const base of args.scenarios) {
    console.log(`\n**${base.name}**\n`);
    console.log('| roster | arm | welfare (mean±sd) | first adoption | adoptions / h | ' +
      'judgments / adoption | idle turns | never judged (of candidates) |');
    console.log('|---|---|---|---|---|---|---|---|');
    for (const n of args.rosters) {
      for (const arm of ARMS) {
        const cellRows = rows.filter((r) => r.scenario === base.name && r.roster === n && r.arm === arm.name);
        const tag = n > base.personas.length ? `${n} (${n - base.personas.length} cloned)` : `${n}`;
        console.log(`| ${tag} | ${arm.name} | ${cell(cellRows, args.hours)} |`);
      }
    }
    console.log('\n| roster | Δ welfare, serve-all − hot-3 (paired mean±sd) | seeds serve-all wins / ties / loses |');
    console.log('|---|---|---|');
    for (const n of args.rosters) {
      const of = (arm: string) => new Map(rows
        .filter((r) => r.scenario === base.name && r.roster === n && r.arm === arm)
        .map((r) => [r.seed, r.m.welfareRatio]));
      const a = of('hot-3');
      const b = of('serve-all');
      const diffs = seeds.map((s) => (b.get(s) ?? NaN) - (a.get(s) ?? NaN));
      const wins = diffs.filter((d) => d > 1e-9).length;
      const losses = diffs.filter((d) => d < -1e-9).length;
      console.log(`| ${n} | ${pm(stat(diffs))} | ${wins} / ${diffs.length - wins - losses} / ${losses} |`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
