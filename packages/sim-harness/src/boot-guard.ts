/**
 * **The boot guard** (plan-scaling.md Stage 0): red when replaying a stated
 * seeded set of documents, scaled to a stated fleet, would take more than a
 * stated share of Render's health-check window.
 *
 *   npm run boot-guard -w @draft/sim-harness [-- --keep <dir>]
 *
 * Why it exists: every deploy and every restart replays every document
 * before `/healthz` answers (`store.loadAll()`, `server.ts`), and on
 * 2026-09-19 one bot room's replay outgrew the window and the host could not
 * come back (Q1469, Q1470). Nothing caught it before a deploy did.
 *
 * **What it does.** Seeds `SET` — ten documents in the proportions of the
 * Stage 0 pool, one of them a convention on nh2026's scale — through the real
 * command path (`scale-seed.ts`, in a child), then boots the host's own
 * `createDraftServer` over them in a fresh process `RUNS` times and takes the
 * median replay. The fleet's boot is that replay × `FLEET / 10` × `RENDER`,
 * and the guard fails when it passes `SHARE` × `WINDOW_S`.
 *
 * **Every number is stated here, and each says where it came from**, so a
 * red guard is read, not re-tuned: raise `FLEET` when Stages 1–3 make boot
 * independent of it, and never raise `SHARE` to make a red go away.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Render's deploy window: a new instance not passing its health check in 15
 *  minutes is cancelled (render.com/docs/health-checks, read 2026-09-23;
 *  `render.yaml` sets the path, not the time). */
export const WINDOW_S = 900;
/** The share of the window boot may take: half, so a deploy is never a race. */
export const SHARE = 0.5;
/** This desktop to Render's starter: the moon room's ratio (PRODUCTION.md
 *  *Measurements*, 2026-09-11: Render ran at about a seventh of this machine).
 *  A CI runner slower than the desktop makes the guard stricter, never laxer. */
export const RENDER = 7;
/** The fleet the guard speaks for — not the plan's 300, which no code today
 *  boots inside the window (PRODUCTION.md *Measurements*, 2026-09-23: about
 *  190 documents of this mix fill it). Sixty reads about a fifth of the
 *  window on the desktop, so a CI runner twice as slow stays green and a
 *  replay that gets two and a half times slower goes red. Raised when Stages
 *  1–3 make boot stop growing with the fleet, and only then. */
export const FLEET = 60;
/** The set: the pool's mix (1 in 10 unbegun, 5 small, 3 medium, 1 convention). */
export const SET = 'convention:1,medium:3,small:5,unbegun:1';
export const SET_DOCS = 10;
export const RUNS = 3;

const HERE = dirname(fileURLToPath(import.meta.url));
const say = (s: string): void => { process.stdout.write(s + '\n'); };

/** A fresh process's boot replay over `dir`, in milliseconds. */
function replayOnce(dir: string): number {
  const r = spawnSync(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url),
    '--replay', dir], { encoding: 'utf8', cwd: join(HERE, '..', '..', 'server') });
  const m = /replay-ms (\d+(?:\.\d+)?) docs (\d+) quarantined (\d+)/.exec(r.stdout ?? '');
  if (r.status !== 0 || m === null) throw new Error(`the replay child failed: ${r.stderr}`);
  if (Number(m[2]) !== SET_DOCS || Number(m[3]) !== 0) {
    throw new Error(`the set did not load whole: ${m[2]} documents, ${m[3]} quarantined`);
  }
  return Number(m[1]);
}

async function replayChild(dir: string): Promise<void> {
  console.log = (): void => {};
  const { configFromEnv } = await import('../../server/src/config.js');
  const { createDraftServer } = await import('../../server/src/server.js');
  const env: NodeJS.ProcessEnv = { ...process.env, DRAFT_DATA_DIR: dir, DRAFT_STORE: 'file',
    DRAFT_NOTIFY_EMAIL: '', PORT: '0' };
  delete env.RESEND_API_KEY;
  const t0 = performance.now();
  const draft = await createDraftServer(configFromEnv(env));
  const ms = performance.now() - t0;
  process.stdout.write(`replay-ms ${ms.toFixed(1)} docs ${[...draft.store.all()].length} `
    + `quarantined ${draft.store.quarantined().length}\n`);
  await draft.close();
}

/**
 * Seed indexes [from, to) of the set in a child of their own. The convention
 * is most of the seeding time, so it gets a child to itself and the other
 * nine run beside it: the guard's wall time is the convention's, not the sum.
 */
function seedPart(dir: string, from: number, to: number): Promise<Array<{ logEntries: number; engineEntries: number }>> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...process.execArgv, join(HERE, 'scale-seed.ts'),
      '--child', '--out', dir, '--seed', 'boot-guard', '--from', String(from), '--to', String(to),
      '--mix', SET], { stdio: ['ignore', 'ignore', 'inherit'], cwd: join(HERE, '..', '..', 'server') });
    child.on('exit', (code) => {
      if (code !== 0) { reject(new Error(`seeding ${from}–${to} failed (exit ${code})`)); return; }
      resolve(JSON.parse(readFileSync(join(dir, 'rows.json'), 'utf8')) as
        Array<{ logEntries: number; engineEntries: number }>);
    });
  });
}

async function main(): Promise<void> {
  const keep = process.argv.indexOf('--keep');
  const root = keep >= 0 ? process.argv[keep + 1]! : mkdtempSync(join(tmpdir(), 'boot-guard-'));
  const dir = join(root, 'set');
  try {
    const t0 = Date.now();
    const parts = await Promise.all([seedPart(join(root, 'a'), 0, 1),
      seedPart(join(root, 'b'), 1, SET_DOCS)]);
    // one data dir, as a host would hold them
    mkdirSync(join(dir, 'docs'), { recursive: true });
    for (const part of ['a', 'b']) {
      for (const id of readdirSync(join(root, part, 'docs'))) {
        renameSync(join(root, part, 'docs', id), join(dir, 'docs', id));
      }
    }
    const rows = parts.flat();
    const entries = rows.reduce((s, r) => s + r.logEntries + r.engineEntries, 0);
    say(`boot guard: seeded ${SET} (${entries} entries) in ${Math.round((Date.now() - t0) / 1000)} s`);
    const runs = Array.from({ length: RUNS }, () => replayOnce(dir)).sort((x, y) => x - y);
    const median = runs[Math.floor(RUNS / 2)]!;
    const projected = (median / 1000) * (FLEET / SET_DOCS) * RENDER;
    const budget = SHARE * WINDOW_S;
    say(`  replay of the set: ${runs.map((r) => r.toFixed(0)).join(' / ')} ms (median ${median.toFixed(0)})`);
    say(`  projected boot of ${FLEET} such documents on Render: ${projected.toFixed(0)} s `
      + `(× ${FLEET / SET_DOCS} × ${RENDER}); budget ${budget} s = ${SHARE} × the ${WINDOW_S} s window`);
    if (projected > budget) {
      say(`  FAIL: boot would take ${(projected / WINDOW_S * 100).toFixed(0)}% of Render's `
        + `health-check window — replay got slower, or FLEET outgrew the host (plan-scaling.md)`);
      process.exitCode = 1;
    } else {
      say(`  ok: ${(projected / WINDOW_S * 100).toFixed(0)}% of the window`);
    }
  } finally {
    if (keep < 0) rmSync(root, { recursive: true, force: true });
  }
}

const at = process.argv.indexOf('--replay');
if (at >= 0) await replayChild(process.argv[at + 1]!);
else await main();
