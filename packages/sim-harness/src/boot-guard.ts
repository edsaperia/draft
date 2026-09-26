/**
 * **The boot guard** (plan-scaling.md Stage 0): red when replaying a stated
 * seeded set of documents, scaled to a stated fleet, would take more than a
 * stated share of Render's health-check window.
 *
 *   npm run boot-guard -w @draft/sim-harness [-- --keep <dir>]
 *   npm run boot-guard -w @draft/sim-harness -- --reseed    # re-make the fixed set
 *
 * Why it exists: every deploy and every restart replays every document
 * before `/healthz` answers (`store.loadAll()`, `server.ts`), and on
 * 2026-09-19 one bot room's replay outgrew the window and the host could not
 * come back (Q1469, Q1470). Nothing caught it before a deploy did.
 *
 * **What it does.** Unpacks `FIXTURE` — ten documents in the proportions of
 * the Stage 0 pool (`SET`), one of them a convention on nh2026's scale — into
 * a scratch data dir, then boots the host's own `createDraftServer` over them
 * in a fresh process `RUNS` times and takes the median replay. The fleet's
 * boot is that replay × `FLEET / 10` × `RENDER`, and the guard fails when it
 * passes `SHARE` × `WINDOW_S`.
 *
 * **One fixed set, committed** (Q1554, Ed 2026-09-26: *fixed set now*). The
 * guard used to seed its ten documents afresh through the real command path
 * at every run, and the seeding is not deterministic: the constitution logs
 * come out the same entry for entry, but each engine is seeded by its
 * document's id, which the host mints at random, and the rooms' judgments
 * follow what the engine serves — two seedings of one tree on 2026-09-26
 * gave the convention 6,487 and 6,415 engine entries, and Q1553 found 13,299,
 * 9,698 and 10,709 entries across three trees. So a before/after pair of
 * runs timed two different sets. The set is now seeded once, by `--reseed`
 * (the old path: `scale-seed.ts` in two children), and committed as
 * `FIXTURE`; every run replays exactly those bytes, which is also what a real
 * boot does — today's code replaying logs an older build wrote. **Re-seed
 * only when the set stops loading** (a log schema the host no longer
 * replays): the guard says so rather than timing a partial set, and a
 * re-seed is a new set, so the runs either side of it are not a comparison.
 *
 * **Every number is stated here, and each says where it came from**, so a
 * red guard is read, not re-tuned: raise `FLEET` when Stages 1–3 make boot
 * independent of it, and never raise `SHARE` to make a red go away.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync }
  from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

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
/** The fixed set (Q1554): every file of the ten documents' data dir, keyed by
 *  its path under the dir, as one gzipped JSON — `.gitattributes` marks it
 *  binary, and `--reseed` is the only thing that writes it. */
export const FIXTURE = join(HERE, '..', 'fixtures', 'boot-guard-set.json.gz');
const say = (s: string): void => { process.stdout.write(s + '\n'); };

interface Packed { meta: { set: string; seed: string; seededAt: string; entries: number };
  files: Record<string, string> }

/** Every line of every document's two logs: the set's size, read off disk. */
function entriesIn(dir: string): number {
  let n = 0;
  for (const id of readdirSync(join(dir, 'docs'))) {
    for (const f of ['log.jsonl', 'engine.jsonl']) {
      try { n += readFileSync(join(dir, 'docs', id, f), 'utf8').split('\n').filter((l) => l.length > 0).length; }
      catch { /* an unbegun document has no engine log */ }
    }
  }
  return n;
}

/** A fresh process's boot replay over `dir`, in milliseconds. */
function replayOnce(dir: string): number {
  const r = spawnSync(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url),
    '--replay', dir], {
    encoding: 'utf8', cwd: join(HERE, '..', '..', 'server'),
    // the demo document (Q1535) builds at every boot, in memory; the guard
    // times the stored set's replay, so it boots with the demo off
    env: { ...process.env, DRAFT_DEMO: 'off' },
  });
  const m = /replay-ms (\d+(?:\.\d+)?) docs (\d+) quarantined (\d+)/.exec(r.stdout ?? '');
  if (r.status !== 0 || m === null) throw new Error(`the replay child failed: ${r.stderr}`);
  if (Number(m[2]) !== SET_DOCS || Number(m[3]) !== 0) {
    throw new Error(`the set did not load whole: ${m[2]} documents, ${m[3]} quarantined — `
      + 'if the host no longer replays the fixture\'s log schema, re-make it with --reseed (Q1554)');
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
 * nine run beside it: the seeding's wall time is the convention's, not the sum.
 */
function seedPart(dir: string, from: number, to: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...process.execArgv, join(HERE, 'scale-seed.ts'),
      '--child', '--out', dir, '--seed', 'boot-guard', '--from', String(from), '--to', String(to),
      '--mix', SET], { stdio: ['ignore', 'ignore', 'inherit'], cwd: join(HERE, '..', '..', 'server') });
    child.on('exit', (code) => {
      if (code !== 0) { reject(new Error(`seeding ${from}–${to} failed (exit ${code})`)); return; }
      resolve();
    });
  });
}

/** `--reseed`: seed the set through the real command path, as the guard did
 *  at every run until Q1554, and write it to `FIXTURE`. */
async function reseed(root: string): Promise<void> {
  const dir = join(root, 'set');
  const t0 = Date.now();
  await Promise.all([seedPart(join(root, 'a'), 0, 1), seedPart(join(root, 'b'), 1, SET_DOCS)]);
  // one data dir, as a host would hold them
  mkdirSync(join(dir, 'docs'), { recursive: true });
  for (const part of ['a', 'b']) {
    for (const id of readdirSync(join(root, part, 'docs'))) {
      renameSync(join(root, part, 'docs', id), join(dir, 'docs', id));
    }
  }
  const files: Record<string, string> = {};
  for (const id of readdirSync(join(dir, 'docs')).sort()) {
    for (const f of readdirSync(join(dir, 'docs', id)).sort()) {
      files[`docs/${id}/${f}`] = readFileSync(join(dir, 'docs', id, f), 'utf8');
    }
  }
  const entries = entriesIn(dir);
  const packed: Packed = { meta: { set: SET, seed: 'boot-guard', seededAt: new Date().toISOString(), entries },
    files };
  mkdirSync(dirname(FIXTURE), { recursive: true });
  writeFileSync(FIXTURE, gzipSync(JSON.stringify(packed), { level: 9 }));
  say(`boot guard: re-seeded ${SET} (${entries} entries) in ${Math.round((Date.now() - t0) / 1000)} s `
    + `→ ${FIXTURE} (${Math.round(statSync(FIXTURE).size / 1024)} KB) — a new set: commit it on its own`);
}

/** Unpack `FIXTURE` into `dir`; the set's size and the fixture's hash, for
 *  the log line that says which set was timed. */
function unpack(dir: string): { entries: number; seededAt: string; sha: string } {
  const bytes = readFileSync(FIXTURE);
  const packed = JSON.parse(gunzipSync(bytes).toString('utf8')) as Packed;
  for (const [rel, text] of Object.entries(packed.files)) {
    const to = join(dir, ...rel.split('/'));
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, text);
  }
  const entries = entriesIn(dir);
  if (entries !== packed.meta.entries) {
    throw new Error(`the fixture unpacked to ${entries} entries, its own meta says ${packed.meta.entries}`);
  }
  return { entries, seededAt: packed.meta.seededAt,
    sha: createHash('sha256').update(bytes).digest('hex').slice(0, 12) };
}

async function main(): Promise<void> {
  const keep = process.argv.indexOf('--keep');
  const root = keep >= 0 ? process.argv[keep + 1]! : mkdtempSync(join(tmpdir(), 'boot-guard-'));
  const dir = join(root, 'set');
  try {
    if (process.argv.includes('--reseed')) { await reseed(root); return; }
    const set = unpack(dir);
    say(`boot guard: the fixed set ${SET} (${set.entries} entries, seeded ${set.seededAt}, `
      + `fixture ${set.sha})`);
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
