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
import type { SiteChurn } from './metrics.js';
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

interface Run {
  seed: string;
  alive: boolean;
  adoptions: number;
  flips: number;
  reversions: number;
  welfareRatio: number;
  judgments: number;
  churn: SiteChurn[];
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
  return {
    alive: c.runs.filter((r) => r.alive).length / c.runs.length,
    adoptions: stat(c.runs.map((r) => r.adoptions)),
    flips: stat(c.runs.map((r) => r.flips)),
    reversions: stat(c.runs.map((r) => r.reversions)),
    welfare: stat(c.runs.map((r) => r.welfareRatio)),
    judgments: stat(c.runs.map((r) => r.judgments)),
  };
}

function row(label: string, c: Cell): string {
  const s = cellStats(c);
  return `  ${label.padEnd(34)}`
    + ` alive ${(s.alive * 100).toFixed(0).padStart(3)}%`
    + ` · adoptions ${spread(s.adoptions).padEnd(20)}`
    + ` · flips ${spread(s.flips).padEnd(20)}`
    + ` · reversions ${spread(s.reversions).padEnd(20)}`
    + ` · welfare ${s.welfare.mean.toFixed(3)}`;
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
  // The floor is `max(Q, min(⌈E/3⌉, 12))` (SPEC §4.2), so at fifteen the
  // statistical minimum is 5 and a quorum below a third of the room buys
  // nothing — which is why the label carries the floor rather than the share.
  // The share is ⌈n·E/100⌉, the product before the quotient, exactly as
  // `adoptionFloor` computes it (issue #24) — a label that read one apart
  // from the floor the run actually used would be worse than no label.
  const floorAt = (q: Constitution['quorum']): number => {
    const e = ROOM.personas.length;
    const n = q === null ? 0 : q.form === 'count' ? q.n : Math.ceil((q.n * e) / 100);
    return Math.max(n, Math.min(Math.ceil(e / 3), 12));
  };
  const QUORUMS: { label: string; q: Constitution['quorum'] }[] = [
    { label: 'no quorum', q: null },
    { label: 'quorum 25% — ongoing', q: { form: 'share', n: 25 } },
    { label: 'quorum 33% — conference', q: { form: 'share', n: 33 } },
    { label: 'quorum 50% — meeting', q: { form: 'share', n: 50 } },
    { label: 'quorum 80%', q: { form: 'share', n: 50 } },
  ];
  for (const { label, q } of QUORUMS) {
    const cell = await measure(label, conference,
      { ...ALPHA_PRESET_OVERRIDES, quorum: q }, seeds);
    all.push(cell);
    say(row(`${label} · floor ${floorAt(q)}`, cell));
  }

  // **A perpetual document is not a document that churns for ever.** If the
  // month-long window produces the same session as the three-day one on every
  // seed, the room reached a fixed point inside three days and the extra
  // twenty-seven days are idle turns. Asserted rather than eyeballed, because
  // it is the answer to *does this ever stop*.
  {
    const c = barCells.get('0.5/conference')!;
    const o = barCells.get('0.5/ongoing')!;
    check(o.runs.every((r, i) => r.sig === c.runs[i]!.sig),
      'the month-long window runs the same session as the three-day one on '
      + 'every seed: the room reaches a fixed point and stops, it does not '
      + 'churn on');
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
    const head = 'arm,window,seed,alive,adoptions,flips,reversions,welfareRatio,judgments\n';
    fs.writeFileSync(file, head + all.flatMap((c) => c.runs.map((r) =>
      `"${c.arm}",${c.window},${r.seed},${r.alive ? 1 : 0},${r.adoptions},`
      + `${r.flips},${r.reversions},${r.welfareRatio.toFixed(4)},${r.judgments}`))
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
