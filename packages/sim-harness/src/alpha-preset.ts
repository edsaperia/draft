/**
 * **The alpha preset: what a 10–20 minute room should be founded at**
 * (entry 77, the alpha-readiness pass).
 *
 * The sweep answers *which knob matters*, one factor at a time, over an
 * 8-hour window. The alpha is a supervised room of five to ten people for
 * fifteen minutes, which is two orders of magnitude away, and nothing had
 * ever measured the operating point there. This does: it runs whole
 * candidate constitutions — combinations, not one factor at a time — at the
 * window and roster the day will actually have, and scores them on the one
 * thing the day is for.
 *
 *   npm run preset -w @draft/sim-harness -- [--seeds N] [--out runs/preset.csv]
 *
 * **The success measure is not welfare.** Ed's bar for the alpha is
 * *everyone gets in and presses things*, with a genuine adoption a stretch
 * goal — so what this reports first is `alive`, the share of seeds in which
 * **the document changed at least once**. A room that watches a perfect
 * ranking converge on a text it never adopts has had the worse afternoon,
 * whatever the welfare ratio says.
 *
 * It exits non-zero if the recommended preset misses its sanity target, so
 * a change to the engine that makes the alpha room inert is a red run
 * rather than a surprise in front of friends.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Constitution } from '../../engine-core/src/index.js';
import { SHAPES } from '../../constitution/src/index.js';
import type { EndingValue, PaceValue, PercentValue, SettingValue } from '../../constitution/src/index.js';
import { engineFieldsFor } from '../../constitution/src/adapter.js';
import { ScriptedPersona } from './persona.js';
import { clubhouseScenario } from './clubhouse.js';
import { runSession } from './runner.js';
import { check, finish, say } from './evidence-log.js';

const MIN = 60_000;

interface Candidate {
  name: string;
  note: string;
  overrides: Partial<Constitution>;
}

/**
 * The shipped defaults, and then one change at a time toward the preset, so
 * the table reads as an argument rather than as a verdict. Only values the
 * **founding surface can actually express** appear here: the bar is 🌡️'s
 * (50–99), a fixed bar is 🪜's own `fixed`, and the grant/cap/drip are ⏱️'s
 * three numbers. The cooldown is the one exception and it is the reason
 * `DRAFT_COOLDOWN_MS` exists — it is engine tuning, never a room decision
 * (§4.2), so the room cannot state it and the operator must.
 */
const CANDIDATES: Candidate[] = [
  {
    name: 'shipped defaults',
    note: 'what a founder gets by accepting everything: a 95% bar ramping from 60, a 5-minute cooldown, one ✏️ every four hours',
    overrides: {},
  },
  {
    name: 'fixed bar at 95',
    note: 'the ramp alone removed — at fifteen minutes it is already near its end by minute ten, so it changes little',
    overrides: { adoptionThresholdStart: 0.95, adoptionThresholdEnd: 0.95 },
  },
  {
    name: 'fixed bar at 85',
    note: 'the bar the room can actually reach on the evidence eight people produce in a quarter of an hour',
    overrides: { adoptionThresholdStart: 0.85, adoptionThresholdEnd: 0.85 },
  },
  {
    name: 'fixed 85 + 1-minute cooldown',
    note: "Ed's cooldown (2026-08-21), inside §4.2's ≤5 min: fifteen moments when the document can change instead of three",
    overrides: {
      adoptionThresholdStart: 0.85, adoptionThresholdEnd: 0.85, cooldownMs: 1 * MIN,
    },
  },
  {
    name: 'ALPHA PRESET',
    note: 'and a rate that fires inside the session: 6 ✏️ to start, capped at 8, one more every 5 real minutes',
    overrides: {
      adoptionThresholdStart: 0.85, adoptionThresholdEnd: 0.85, cooldownMs: 1 * MIN,
      tokenGrant: 6, tokenCap: 8, tokenDripMinutes: 5,
    },
  },
];

/**
 * **The shape table is the sweep's input** (entry 166): one derived row per
 * 🧭 shape, folded through `engineFieldsFor` over the row's own `sets` — never
 * typed here, so a cell edited in `shapes.ts` is what the sweep measures. A
 * shape is a tested constitution once its cell is green; today these are
 * **reported only**, no `check` on them, because every number in the table is
 * a placeholder until this sweep has been read (Q960). The ramp start rides
 * `adoptionThresholdStart` exactly as `toEngineConstitution` reads it: a
 * ramp's `startPct`, else the bar itself; the perpetual pin is 0 since the
 * sweep's window is the cell's.
 */
function shapeCandidates(): Candidate[] {
  return SHAPES.map((row) => {
    const sets = row.sets as Record<string, SettingValue>;
    let overrides: Partial<Constitution> = {};
    for (const id of ['bar', 'rate', 'authorship'] as const) {
      if (sets[id]) overrides = { ...overrides, ...engineFieldsFor(id, sets[id]!, 0) };
    }
    const pace = sets.pace as PaceValue | undefined;
    const bar = sets.bar as PercentValue | undefined;
    if (bar) {
      overrides.adoptionThresholdStart =
        (pace && pace.shape === 'ramp' && !(sets.ending && (sets.ending as EndingValue).endsAtMs === null)
          ? pace.startPct : bar.pct) / 100;
    }
    return { name: `shape: ${row.name}`, note: row.say, overrides };
  });
}
CANDIDATES.push(...shapeCandidates());

/** The name in CANDIDATES the sanity target is asserted against. */
const RECOMMENDED = 'ALPHA PRESET';

interface Cell {
  candidate: string;
  minutes: number;
  roster: number;
  seeds: number;
  /** Share of seeds in which the document changed at least once. */
  alive: number;
  adoptions: number;
  judgments: number;
  welfareRatio: number;
  backlog: number;
}

async function measure(c: Candidate, minutes: number, roster: number,
  seeds: number): Promise<Cell> {
  const scenario = { ...clubhouseScenario,
    personas: clubhouseScenario.personas.slice(0, roster) };
  let alive = 0, adoptions = 0, judgments = 0, welfare = 0, backlog = 0;
  for (let i = 0; i < seeds; i++) {
    const m = (await runSession({
      scenario,
      windowMs: minutes * MIN,
      seed: `preset-${i}`,
      constitutionOverrides: c.overrides,
      makePersona: (profile, rng) => new ScriptedPersona(profile, scenario, rng),
    })).metrics;
    if (m.adoptions > 0) alive += 1;
    adoptions += m.adoptions;
    judgments += m.edgeComparisons + m.diagonalComparisons;
    welfare += m.welfareRatio;
    backlog += m.backlogSize;
  }
  return { candidate: c.name, minutes, roster, seeds,
    alive: alive / seeds, adoptions: adoptions / seeds, judgments: judgments / seeds,
    welfareRatio: welfare / seeds, backlog: backlog / seeds };
}

function line(cell: Cell): string {
  return `  ${cell.candidate.padEnd(30)} ${String(cell.minutes).padStart(2)}min r${cell.roster}`
    + ` · alive ${(cell.alive * 100).toFixed(0).padStart(3)}%`
    + ` · adoptions ${cell.adoptions.toFixed(2)}`
    + ` · judgments ${cell.judgments.toFixed(0).padStart(3)}`
    + ` · welfare ${cell.welfareRatio.toFixed(3)}`
    + ` · backlog ${cell.backlog.toFixed(1)}`;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let seeds = 25;
  let out = '';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--seeds') seeds = Number(argv[++i]) || 25;
    else if (argv[i] === '--out') out = argv[++i] ?? '';
  }
  const cells: Cell[] = [];

  say(`\n== the ladder to the preset (roster 8, 15 minutes, ${seeds} seeds) =====`);
  say('  each row is the row above it with one thing changed');
  for (const c of CANDIDATES) {
    const cell = await measure(c, 15, 8, seeds);
    cells.push(cell);
    say(line(cell));
    say(`      ${c.note}`);
  }

  const preset = CANDIDATES.find((c) => c.name === RECOMMENDED)!;
  say('\n== the preset across the day\'s shapes ==================================');
  say('  10–20 minutes, rosters five to ten — the room Ed described');
  for (const minutes of [10, 15, 20]) {
    for (const roster of [5, 8, 10]) {
      const cell = await measure(preset, minutes, roster, seeds);
      cells.push(cell);
      say(line(cell));
    }
  }

  say('\n== the sanity target ===================================================');
  const target = cells.find((c) =>
    c.candidate === RECOMMENDED && c.minutes === 15 && c.roster === 8)!;
  const shipped = cells.find((c) => c.candidate === 'shipped defaults')!;
  check(target.alive > 0.5,
    `at the preset, a 15-minute room of 8 changes its document in a majority of seeds `
    + `(${(target.alive * 100).toFixed(0)}%)`);
  check(target.alive > shipped.alive,
    `and more often than at the shipped defaults `
    + `(${(shipped.alive * 100).toFixed(0)}%)`);
  // **Not a mean-adoptions target.** The plan's bar is *at least one
  // adoption in a healthy majority of seeds*, which is `alive` above; a
  // mean of 1.0 is a different and stricter claim, and at fifteen minutes
  // it is one the scripted room does not meet (0.92 at 25 seeds). Reported,
  // never asserted — a threshold nobody chose is a threshold that will be
  // moved to whatever the run produced.
  say(`     · mean adoptions at the target cell: ${target.adoptions.toFixed(2)}`);
  say(`     · judgments cast: ${target.judgments.toFixed(0)} — the binding constraint`);
  // the whole room in ten minutes is the hardest cell, and it is allowed to
  // be worse — but a room that never changes anything is the failure this
  // preset exists to prevent, so every shape must move at least sometimes
  for (const c of cells.filter((x) => x.candidate === RECOMMENDED)) {
    check(c.alive > 0,
      `the preset is not inert at ${c.minutes} minutes, roster ${c.roster} `
      + `(${(c.alive * 100).toFixed(0)}%)`);
  }

  if (out !== '') {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const file = path.resolve(here, '..', out);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const head = 'candidate,minutes,roster,seeds,alive,adoptions,judgments,welfareRatio,backlog\n';
    fs.writeFileSync(file, head + cells.map((c) =>
      `"${c.candidate}",${c.minutes},${c.roster},${c.seeds},${c.alive.toFixed(3)},`
      + `${c.adoptions.toFixed(3)},${c.judgments.toFixed(2)},`
      + `${c.welfareRatio.toFixed(4)},${c.backlog.toFixed(2)}`).join('\n') + '\n', 'utf8');
    say(`\n  CSV: ${file}`);
  }
  finish();
}

void main();
