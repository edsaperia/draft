/**
 * The calibration sweep (QUESTIONS #28, resolved 2026-08-13): one-factor-
 * at-a-time over the constitution's tuning knobs, many scripted seeds per
 * setting, scored by the latent welfare model. Scripted runs are LLM-free,
 * so the sweep costs only CPU.
 *
 *   npm run sweep -w @draft/sim-harness -- [--seeds N] [--hours H]
 *       [--scenario clubhouse|charter] [--out runs/sweep.csv]
 *
 * Output: a CSV of every run, plus a per-knob summary table on stdout.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Constitution } from '../../engine-core/src/index.js';
import { ScriptedPersona } from './persona.js';
import { charterScenario } from './scenario.js';
import { clubhouseScenario } from './clubhouse.js';
import { runSession } from './runner.js';
import type { Metrics } from './metrics.js';

type Knob = keyof Constitution;

interface KnobSpec {
  knob: Knob;
  /** First value is the baseline (engine default); the rest are variants. */
  values: number[];
}

/** Baseline first in each list — variants re-use the shared baseline runs. */
const KNOBS: KnobSpec[] = [
  { knob: 'adoptionThresholdStart', values: [0.6, 0.5, 0.7, 0.8] },
  { knob: 'adoptionThresholdEnd', values: [0.95, 0.85, 0.9, 0.99] },
  { knob: 'tokenGrant', values: [4, 2, 6, 8] },
  { knob: 'tokenDripPerTenth', values: [1, 0, 2] },
  { knob: 'tokenCap', values: [8, 4, 16] },
  { knob: 'cooldownMs', values: [5 * 60_000, 0, 15 * 60_000, 30 * 60_000] },
  { knob: 'hotSetSize', values: [6, 3, 10] },
  { knob: 'explorationEvery', values: [7, 4, 12] },
  { knob: 'salienceEvery', values: [10, 5, 20] },
];

interface Row {
  knob: string;
  value: number;
  seed: string;
  welfareRatio: number;
  adoptions: number;
  overturnedIssues: number;
  issuesResolvedOptimally: number;
  backlogSize: number;
  judgments: number;
}

function parseArgs(argv: string[]): { seeds: number; hours: number; scenario: string; out: string } {
  const args = { seeds: 25, hours: 8, scenario: 'clubhouse', out: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seeds') args.seeds = Number(argv[++i]) || 25;
    else if (a === '--hours') args.hours = Number(argv[++i]) || 8;
    else if (a === '--scenario') args.scenario = argv[++i] ?? 'clubhouse';
    else if (a === '--out') args.out = argv[++i] ?? '';
  }
  return args;
}

async function runOne(
  scenario: typeof clubhouseScenario,
  windowMs: number,
  seed: string,
  overrides: Partial<Constitution>,
): Promise<Metrics> {
  const result = await runSession({
    scenario,
    windowMs,
    seed,
    constitutionOverrides: overrides,
    makePersona: (profile, rng) => new ScriptedPersona(profile, scenario, rng),
  });
  return result.metrics;
}

function toRow(knob: string, value: number, seed: string, m: Metrics): Row {
  return {
    knob,
    value,
    seed,
    welfareRatio: m.welfareRatio,
    adoptions: m.adoptions,
    overturnedIssues: m.overturnedIssues,
    issuesResolvedOptimally: m.issuesResolvedOptimally,
    backlogSize: m.backlogSize,
    judgments: m.edgeComparisons + m.diagonalComparisons,
  };
}

function summarize(rows: Row[], key: (r: Row) => string): string[] {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const k = key(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  const lines: string[] = [];
  for (const [k, g] of groups) {
    const mean = (f: (r: Row) => number): number => g.reduce((a, r) => a + f(r), 0) / g.length;
    const sd = (f: (r: Row) => number): number => {
      const m = mean(f);
      return Math.sqrt(g.reduce((a, r) => a + (f(r) - m) ** 2, 0) / g.length);
    };
    lines.push(
      `  ${k.padEnd(34)} welfare ${mean((r) => r.welfareRatio).toFixed(3)}±${sd((r) => r.welfareRatio).toFixed(3)}` +
        ` · optimal ${mean((r) => r.issuesResolvedOptimally).toFixed(1)}` +
        ` · adoptions ${mean((r) => r.adoptions).toFixed(1)}` +
        ` · overturns ${mean((r) => r.overturnedIssues).toFixed(1)}` +
        ` · backlog ${mean((r) => r.backlogSize).toFixed(1)}` +
        ` · judgments ${mean((r) => r.judgments).toFixed(0)}`,
    );
  }
  return lines;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const scenario = args.scenario === 'charter' ? charterScenario : clubhouseScenario;
  const windowMs = args.hours * 3600_000;
  const seeds = Array.from({ length: args.seeds }, (_, i) => `sweep-${i}`);
  const rows: Row[] = [];
  const t0 = Date.now();

  // Shared baseline: every knob's first value is the engine default.
  console.log(`sweep: scenario "${scenario.name}", ${args.seeds} seeds, ${args.hours}h window`);
  for (const seed of seeds) {
    rows.push(toRow('baseline', NaN, seed, await runOne(scenario, windowMs, seed, {})));
  }
  console.log(`baseline done (${rows.length} runs, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);

  for (const spec of KNOBS) {
    for (const value of spec.values.slice(1)) {
      for (const seed of seeds) {
        const m = await runOne(scenario, windowMs, seed, { [spec.knob]: value });
        rows.push(toRow(spec.knob, value, seed, m));
      }
    }
    console.log(`${spec.knob} done (${((Date.now() - t0) / 1000).toFixed(0)}s elapsed)`);
  }

  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'runs');
  fs.mkdirSync(dir, { recursive: true });
  const out = args.out || path.join(dir, `sweep-${scenario.name}.csv`);
  const header = 'knob,value,seed,welfareRatio,adoptions,overturnedIssues,issuesResolvedOptimally,backlogSize,judgments';
  fs.writeFileSync(
    out,
    [
      header,
      ...rows.map((r) =>
        [r.knob, r.value, r.seed, r.welfareRatio.toFixed(4), r.adoptions, r.overturnedIssues,
          r.issuesResolvedOptimally, r.backlogSize, r.judgments].join(','),
      ),
    ].join('\n') + '\n',
    'utf8',
  );

  console.log(`\n=== sweep summary (${rows.length} runs, CSV: ${out}) ===`);
  console.log('baseline (engine defaults):');
  console.log(...summarize(rows.filter((r) => r.knob === 'baseline'), () => 'baseline'));
  for (const spec of KNOBS) {
    console.log(`${spec.knob} (baseline ${spec.values[0]}):`);
    const knobRows = rows.filter(
      (r) => r.knob === spec.knob || (r.knob === 'baseline' && false),
    );
    // Include the baseline runs as this knob's default-value group.
    const withBase = [
      ...rows
        .filter((r) => r.knob === 'baseline')
        .map((r) => ({ ...r, knob: spec.knob, value: spec.values[0]! })),
      ...knobRows,
    ];
    for (const line of summarize(withBase, (r) => `${r.knob}=${r.value}`)) console.log(line);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
