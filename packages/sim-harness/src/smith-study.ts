/**
 * **The Smith study** (Q1538, Q1539; R-142, R-143; `design/DECISIONS.md`,
 * 2026-09-25).
 *
 *   npm run smith -w @draft/sim-harness -- [--seeds N] [--rooms 5,7,10,15,20]
 *     [--windows meeting,conference] [--quorums none,50] [--churn-seeds N]
 *
 * **The engine as it stands** — the leader measured against its rivals and
 * ranked inside the Smith set — over seeded rooms that file clones. Before the
 * merge the study ran three arms (`main`, A, A+B) through a process-wide
 * engine switch; the switch left at the merge, so the comparison with `main`
 * lives in R-142, R-143 and DECISIONS, and this file now measures one arm, the
 * engine's own, labelled `A+B`. The named next step (R-143: Schulze inside the
 * Smith set) is what it is kept for. Deterministic and network-free: scripted
 * personas, seeded rng.
 *
 * **The room.** The clubhouse scenario's personas, the first N for rooms up to
 * fourteen and the flattest members seated again as twins above it (churn.ts's
 * rule). Every issue gains a **clone** of each alternative: the same position,
 * its quality lowered by `DELTA` — so every persona ranks the copy just below
 * the original, by more than a judge's honest indifference. Two personas file
 * clones: p1 **naive** (re-files a live wording it prefers to the text that
 * stands) and p2 **strategic** (re-files one it prefers only where the room,
 * which it can read, prefers the text that stands to it — the attack B
 * exists for). Nobody else ever proposes a clone, the original always being
 * worth more to them.
 *
 * **What is measured, per decision.** A decision is an adoption, or a race
 * whose every member left play in one step with nothing adopted — the text
 * stood. Its field is the race's members just before, and the text that stood.
 * From the scenario's latent utilities (no noise; a difference under
 * `TIE_THRESHOLD` is indifference, as a scripted judge reads it):
 *
 *   - **Condorcet efficiency**: of decisions whose field has a Condorcet
 *     winner, the share that chose it;
 *   - **clone wins**: adoptions of a wording a direct majority of the room
 *     preferred the text that stood to (`refused`), and those in a race that
 *     held a clone (`clone`);
 *   - **rival-pair share**: edge judgments between two proposals over all edge
 *     judgments — Ed's *surprisingly few non-status-quo pairs*;
 *   - **judgments per adoption**, **median minutes from submission to
 *     adoption**, the welfare ratio, and flips and reversions.
 *
 * And **the churn baseline**, churn.ts's own room (the clubhouse fifteen, no
 * clones, no filers, the alpha preset) at no quorum and at half: flips and
 * reversions, where the merge bar's *no more reversions* was read.
 */
import { attest, splitLines } from '../../engine-core/src/index.js';
import type { Constitution, Rng, ParticipantApi, Session } from '../../engine-core/src/index.js';
import { ALPHA_PRESET_OVERRIDES } from './alpha-preset-values.js';
import { clubhouseScenario } from './clubhouse.js';
import { ScriptedPersona, TIE_THRESHOLD, type DraftProposal } from './persona.js';
import { runSession } from './runner.js';
import {
  conditionalUtility, currentPositions,
  type Alternative, type Issue, type PersonaProfile, type Scenario,
} from './scenario.js';
import { finish, say } from './evidence-log.js';

const MIN = 60_000;
const HOUR = 3600_000;
const MAX_ACTIONS = 500_000;

/** How far below the original every persona rates its copy: above a judge's indifference (0.08). */
const DELTA = 0.12;
const CLONE = ' (as amended)';

type ArmName = 'A+B';
/** One arm since the merge: the engine as it stands. */
const ARM_SET: Array<{ name: ArmName }> = [{ name: 'A+B' }];

const WINDOWS: Record<string, number> = { meeting: 4, conference: 72, ongoing: 720 };

// ---------------------------------------------------------------------------
// the room

const flatness = (p: PersonaProfile): number =>
  Object.values(p.stances).reduce((a, s) => a + Math.abs(s), 0);

/** The first N clubhouse members, twins of the flattest seated above fourteen. */
function roomOf(n: number, clones: boolean): Scenario {
  const base = clubhouseScenario.personas;
  let personas: PersonaProfile[];
  if (n <= base.length) personas = base.slice(0, n);
  else {
    const flat = [...base].sort((a, b) => flatness(a) - flatness(b) || a.id.localeCompare(b.id));
    personas = [...base, ...flat.slice(0, n - base.length).map((p, i) =>
      ({ ...p, id: `p${base.length + i + 1}`, handle: `${p.handle}-twin` }))];
  }
  const issues: Issue[] = clones
    ? clubhouseScenario.issues.map((i) => ({ ...i, alternatives: [...i.alternatives,
      ...i.alternatives.slice(1).map((a) => ({ ...a, text: a.text + CLONE,
        quality: a.quality - DELTA, rationale: `${a.rationale} Tidied.` }))] }))
    : clubhouseScenario.issues;
  return { ...clubhouseScenario, personas, issues };
}

const UNKNOWN: Alternative = { text: '', position: 0, quality: 0.3, rationale: '' };

function altOf(scenario: Scenario, text: string): { issue: Issue; alt: Alternative } | null {
  for (const issue of scenario.issues) {
    for (const alt of issue.alternatives) if (alt.text === text) return { issue, alt };
  }
  return null;
}

/** Members of the room preferring `a` to `b`, and `b` to `a`, latent and noise-free. */
function headToHead(scenario: Scenario, key: string, a: Alternative, b: Alternative,
  positions: Map<string, number>): { forA: number; forB: number } {
  let forA = 0;
  let forB = 0;
  for (const p of scenario.personas) {
    const d = conditionalUtility(p, scenario, key, a, positions)
      - conditionalUtility(p, scenario, key, b, positions);
    if (d > TIE_THRESHOLD) forA++;
    else if (d < -TIE_THRESHOLD) forB++;
  }
  return { forA, forB };
}

/**
 * **A clone-filer** (plan §5, Stage 5): a scripted persona that, before its
 * ordinary drafting, looks for a live wording it prefers to the text that
 * stands and files its copy. *Naive* does so whenever; *strategic* only where
 * the room it can read prefers the text that stands to that wording — the
 * one place a copy could lift a loser.
 */
class CloneFiler extends ScriptedPersona {
  constructor(profile: PersonaProfile, scenario: Scenario, rng: Rng,
    private readonly mode: 'naive' | 'strategic') {
    super(profile, scenario, rng);
  }

  override async draft(api: ParticipantApi, now: number): Promise<DraftProposal | null> {
    // every bout it can pay for, before any ordinary drafting: a filer is
    // the room's most determined proposer, which is what makes it a test
    if (api.balance(now) >= 1) {
      const doc = api.document();
      const lines = doc.split('\n');
      const positions = currentPositions(this.scenario, lines);
      const live = api.liveCandidates().flatMap((c) => c.changes.map((ch) => ch.after));
      const liveSet = new Set(live);
      for (const text of live) {
        if (text.endsWith(CLONE)) continue;
        const found = altOf(this.scenario, text);
        if (found === null) continue;
        const { issue, alt } = found;
        const copy = text + CLONE;
        if (liveSet.has(copy) || lines[issue.line] === copy) continue;
        const cur = issue.alternatives.find((a) => a.text === lines[issue.line]) ?? UNKNOWN;
        const mine = conditionalUtility(this.profile, this.scenario, issue.key, alt, positions)
          - conditionalUtility(this.profile, this.scenario, issue.key, cur, positions);
        if (mine <= TIE_THRESHOLD) continue;
        if (this.mode === 'strategic') {
          const h = headToHead(this.scenario, issue.key, alt, cur, positions);
          if (h.forB <= h.forA) continue; // it is not losing: nothing to lift
        }
        return {
          patch: { baseVersion: api.currentVersion(),
            hunks: attest(splitLines(doc), [{ start: issue.line, end: issue.line + 1, lines: [copy] }]) },
          rationale: alt.rationale,
        };
      }
    }
    return super.draft(api, now);
  }
}

// ---------------------------------------------------------------------------
// the decisions, observed

interface Decision {
  t: number;
  adopted: boolean;
  /** Condorcet winner of the field (latent), or null where there is none. */
  cw: string | null;
  chosen: string;
  /** The room's direct majority preferred the text that stood to what was adopted. */
  refused: boolean;
  /** The field held a clone. */
  clone: boolean;
  fieldSize: number;
}

interface Snapshot {
  lines: string[];
  logLen: number;
  races: Array<{ members: string[] }>;
}

function candidateText(session: Session, id: string): string {
  return session.getCandidate(id).patch?.hunks[0]?.lines[0] ?? '';
}

function observe(scenario: Scenario, decisions: Decision[]) {
  let snap: Snapshot | null = null;
  return (phase: 'before' | 'after', session: Session, t: number): void => {
    if (phase === 'before') {
      snap = { lines: session.document().split('\n'), logLen: session.log.length,
        races: session.races(t).filter((r) => r.settingId === undefined)
          .map((r) => ({ members: [...r.members] })) };
      return;
    }
    if (snap === null) return;
    const events = session.log.slice(snap.logLen).map((e) => e.event);
    const positions = currentPositions(scenario, snap.lines);
    const decide = (members: string[], chosenText: string, adopted: boolean): void => {
      const texts = members.map((id) => candidateText(session, id));
      const first = altOf(scenario, texts[0] ?? '');
      if (first === null) return;
      const key = first.issue.key;
      const curText = snap!.lines[first.issue.line] ?? '';
      const opts = [curText, ...texts];
      const alts = opts.map((x) => altOf(scenario, x)?.alt ?? UNKNOWN);
      let cw: string | null = null;
      for (let i = 0; i < opts.length && cw === null; i++) {
        let wins = true;
        for (let j = 0; j < opts.length && wins; j++) {
          if (i === j) continue;
          const h = headToHead(scenario, key, alts[i]!, alts[j]!, positions);
          if (!(h.forA > h.forB)) wins = false;
        }
        if (wins) cw = opts[i]!;
      }
      const chosenAlt = altOf(scenario, chosenText)?.alt ?? UNKNOWN;
      const vsCur = headToHead(scenario, key, chosenAlt, alts[0]!, positions);
      decisions.push({ t, adopted, cw, chosen: chosenText,
        refused: adopted && vsCur.forB > vsCur.forA,
        clone: texts.some((x) => x.endsWith(CLONE)), fieldSize: texts.length });
    };
    const adoptedNow = new Set<string>();
    for (const e of events) {
      if (e.type !== 'adopted') continue;
      const race = snap.races.find((r) => r.members.includes(e.candidateId));
      if (race === undefined) continue;
      adoptedNow.add(e.candidateId);
      decide(race.members, candidateText(session, e.candidateId), true);
    }
    // a race whose every member left play this step with nothing adopted: the text stood
    for (const race of snap.races) {
      if (race.members.some((id) => adoptedNow.has(id))) continue;
      const gone = race.members.every((id) => {
        const st = session.getCandidate(id).state;
        return st === 'retired' || st === 'undecided';
      });
      const endedNow = events.some((e) =>
        (e.type === 'candidate-retired' || e.type === 'candidate-undecided') && race.members.includes(e.id));
      if (gone && endedNow) {
        const first = altOf(scenario, candidateText(session, race.members[0]!));
        if (first) decide(race.members, snap.lines[first.issue.line] ?? '', false);
      }
    }
  };
}

// ---------------------------------------------------------------------------
// one cell

interface RunOut {
  decisions: Decision[];
  adoptions: number;
  flips: number;
  reversions: number;
  welfare: number;
  edge: number;
  rival: number;
  passMinutes: number[];
  hash: string;
}

async function runOne(scenario: Scenario, windowMs: number,
  seed: string, overrides: Partial<Constitution>, filers: boolean): Promise<RunOut> {
  const decisions: Decision[] = [];
  {
    const r = await runSession({
      scenario, windowMs, seed, maxActions: MAX_ACTIONS,
      constitutionOverrides: overrides,
      makePersona: (profile, rng) => (filers && profile.id === 'p1'
        ? new CloneFiler(profile, scenario, rng, 'naive')
        : filers && profile.id === 'p2'
          ? new CloneFiler(profile, scenario, rng, 'strategic')
          : new ScriptedPersona(profile, scenario, rng)),
      observe: observe(scenario, decisions),
    });
    const events = r.session.log.map((e) => e.event);
    let edge = 0;
    let rival = 0;
    for (const e of events) {
      if (e.type !== 'comparison' || e.kind !== 'edge') continue;
      edge++;
      if (!e.aId.startsWith('inc:') && !e.bId.startsWith('inc:')) rival++;
    }
    const passMinutes = events.flatMap((e) => {
      if (e.type !== 'adopted') return [];
      const c = r.session.getCandidate(e.candidateId);
      return c.patch ? [(e.t - c.submittedT) / MIN] : [];
    });
    return { decisions, adoptions: r.metrics.adoptions, flips: r.metrics.flips,
      reversions: r.metrics.reversions, welfare: r.metrics.welfareRatio, edge, rival,
      passMinutes, hash: r.session.rollingHash() };
  }
}

interface CellSum {
  arm: ArmName;
  decisions: number;
  withCw: number;
  cwChosen: number;
  multi: { withCw: number; cwChosen: number };
  refused: number;
  refusedMulti: number;
  refusedClone: number;
  adoptions: number;
  flips: number;
  reversions: number;
  welfare: number;
  rivalShare: number;
  judgmentsPerAdoption: number;
  medianPassMin: number | null;
  digest: string;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1]! + s[m]!) / 2 : s[m]!;
}

function summarise(arm: ArmName, runs: RunOut[]): CellSum {
  const ds = runs.flatMap((r) => r.decisions);
  const withCw = ds.filter((d) => d.cw !== null);
  const multi = withCw.filter((d) => d.fieldSize > 1);
  const adoptions = runs.reduce((a, r) => a + r.adoptions, 0);
  const edge = runs.reduce((a, r) => a + r.edge, 0);
  return {
    arm,
    decisions: ds.length,
    withCw: withCw.length,
    cwChosen: withCw.filter((d) => d.chosen === d.cw).length,
    multi: { withCw: multi.length, cwChosen: multi.filter((d) => d.chosen === d.cw).length },
    refused: ds.filter((d) => d.refused).length,
    refusedMulti: ds.filter((d) => d.refused && d.fieldSize > 1).length,
    refusedClone: ds.filter((d) => d.refused && d.clone).length,
    adoptions: adoptions / runs.length,
    flips: runs.reduce((a, r) => a + r.flips, 0) / runs.length,
    reversions: runs.reduce((a, r) => a + r.reversions, 0) / runs.length,
    welfare: runs.reduce((a, r) => a + r.welfare, 0) / runs.length,
    rivalShare: edge === 0 ? 0 : runs.reduce((a, r) => a + r.rival, 0) / edge,
    judgmentsPerAdoption: adoptions === 0 ? 0 : edge / adoptions,
    medianPassMin: median(runs.flatMap((r) => r.passMinutes)),
    digest: runs.map((r) => r.hash.slice(0, 6)).join(''),
  };
}

const pct = (a: number, b: number): string => (b === 0 ? '  —  ' : `${((a / b) * 100).toFixed(1)}%`);

function line(label: string, c: CellSum): string {
  return `  ${label.padEnd(30)} ${c.arm.padEnd(4)}`
    + ` · CE ${pct(c.cwChosen, c.withCw).padStart(6)} (${c.cwChosen}/${c.withCw})`
    + ` · CE multi ${pct(c.multi.cwChosen, c.multi.withCw).padStart(6)} (${c.multi.cwChosen}/${c.multi.withCw})`
    + ` · refused ${String(c.refused).padStart(3)} (multi ${c.refusedMulti}, clone ${c.refusedClone})`
    + ` · adopt ${c.adoptions.toFixed(1).padStart(6)}`
    + ` · flips ${c.flips.toFixed(1).padStart(6)} · rev ${c.reversions.toFixed(1).padStart(6)}`
    + ` · rival ${(c.rivalShare * 100).toFixed(1).padStart(5)}%`
    + ` · j/adopt ${c.judgmentsPerAdoption.toFixed(1).padStart(5)}`
    + ` · pass ${c.medianPassMin === null ? '  —  ' : `${c.medianPassMin.toFixed(1)} min`.padStart(9)}`
    + ` · welfare ${c.welfare.toFixed(3)}`;
}

// ---------------------------------------------------------------------------

function arg(name: string, dflt: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1]! : dflt;
}

async function main(): Promise<void> {
  const seeds = Number(arg('seeds', '6'));
  const churnSeeds = Number(arg('churn-seeds', '6'));
  const rooms = arg('rooms', '5,7,10,15,20').split(',').map(Number);
  const windows = arg('windows', 'meeting,conference').split(',');
  const quorums = arg('quorums', 'none,50').split(',');
  const qOf = (q: string): Constitution['quorum'] => (q === 'none' ? null : { form: 'share', n: Number(q) });

  say('# The Smith study (Q1538, Q1539) — the engine as it stands (A+B)');
  say(`  seeds ${seeds} (smith-<room>-<i>) · churn seeds ${churnSeeds} (churn-<i>) · rooms ${rooms.join(', ')}`
    + ` · windows ${windows.join(', ')} · quorums ${quorums.join(', ')}`);
  say(`  clones: every alternative's copy at quality −${DELTA}; p1 files them naively, p2 strategically`);
  say('  CE = Condorcet efficiency over decisions whose field has a latent Condorcet winner;'
    + ' "multi" = fields of two or more proposals');

  const table: Array<{ room: number; window: string; quorum: string; cells: CellSum[] }> = [];
  for (const q of quorums) {
    for (const w of windows) {
      say(`\n== ${w} (${WINDOWS[w]} h) · quorum ${q} ==========================================`);
      for (const n of rooms) {
        const scenario = roomOf(n, true);
        const cells: CellSum[] = [];
        for (const arm of ARM_SET) {
          const runs: RunOut[] = [];
          for (let i = 0; i < seeds; i++) {
            runs.push(await runOne(scenario, WINDOWS[w]! * HOUR, `smith-${n}-${i}`,
              { ...ALPHA_PRESET_OVERRIDES, quorum: qOf(q) }, true));
          }
          const c = summarise(arm.name, runs);
          cells.push(c);
          say(line(`room ${n}`, c));
        }
        table.push({ room: n, window: w, quorum: q, cells });
      }
    }
  }

  say('\n== the churn baseline: churn.ts\'s room (the clubhouse fifteen, no clones) ==');
  const churn: Array<{ window: string; quorum: string; cells: CellSum[] }> = [];
  const fifteen = roomOf(15, false);
  for (const q of quorums) {
    for (const w of windows) {
      const cells: CellSum[] = [];
      for (const arm of ARM_SET) {
        const runs: RunOut[] = [];
        for (let i = 0; i < churnSeeds; i++) {
          runs.push(await runOne(fifteen, WINDOWS[w]! * HOUR, `churn-${i}`,
            { ...ALPHA_PRESET_OVERRIDES, quorum: qOf(q) }, false));
        }
        const c = summarise(arm.name, runs);
        cells.push(c);
        say(line(`${w} · quorum ${q}`, c));
      }
      churn.push({ window: w, quorum: q, cells });
    }
  }

  // the merge bar (Q1538 ruling 8) compared this arm with `main`, which left
  // with the engine switch at the merge: its reading is in DECISIONS, 2026-09-25
  say('\n== housekeeping ========================================================');
  say('  cell digests (a re-run of this file must print these unchanged):');
  for (const row of table) {
    for (const c of row.cells) say(`    room ${row.room} · ${row.window} · q ${row.quorum} · ${c.arm.padEnd(4)} ${c.digest}`);
  }
  for (const row of churn) {
    for (const c of row.cells) say(`    churn · ${row.window} · q ${row.quorum} · ${c.arm.padEnd(4)} ${c.digest}`);
  }
  finish();
}

void main();
