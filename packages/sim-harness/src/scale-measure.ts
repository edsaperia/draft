/**
 * **How the host scales with the number of documents** (plan-scaling.md
 * Stage 0, the measurement).
 *
 *   npm run scale-measure -w @draft/sim-harness -- --pool <dir> --ns 30,100,300
 *       [--port 8260] [--shares 0.1,0.3] [--active 0.03] [--seconds 60]
 *       [--heap 4096] [--cold <docdir>] [--out <file.json>]
 *
 * For each N it copies the pool's first N documents (`scale-seed.ts`'s
 * manifest order) into a fresh data dir, boots `scale-host.ts` on it as a
 * child — the dev path, tsx over the sources, `npm run server`'s own boot —
 * and reads:
 *
 *  - **boot**: spawn to the first `/healthz` 200, and inside it the replay
 *    (`createDraftServer`, which is `loadAll` plus every engine's resume);
 *  - **memory**: RSS and live heap after boot, and again after a forced GC;
 *  - **one `tick()` pass**, three times, the minute's metronome over every
 *    document;
 *  - **polling load**: a share of every document's members seated (the dev
 *    seat switch) and polling `view` every 4 s as `live.js` does, with
 *    `since`/`tv`/`rk`; in a small share of the open documents (`--active`)
 *    each polling seat also acts every ~30 s. View p50/p95, split into short
 *    and full answers, the host's CPU busy, and its event-loop delay.
 *
 * `--cold <docdir>` instead boots a host over one document alone: its replay
 * and the first full view are the cold-open cost of that document.
 *
 * **Never 8140 and never docs.vote**: the host is a child on `--port`, over a
 * data dir under the pool's own scratch directory.
 */
import { fork, spawn, spawnSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync }
  from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRng } from '../../engine-core/src/rng.js';
import { Poller, act, seat } from './scale-room.js';
import type { ActSeat, Wire } from './scale-room.js';
import type { ManifestRow } from './scale-seed.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const say = (s: string): void => { process.stdout.write(s + '\n'); };
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

interface Args {
  pool: string; ns: number[]; port: number; shares: number[]; active: number;
  seconds: number; heap: number; cold: string | null; out: string | null; artifact: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { pool: '', ns: [30], port: 8260, shares: [0.1, 0.3], active: 0.03,
    seconds: 60, heap: 4096, cold: null, out: null, artifact: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]!;
    const v = (): string => argv[++i] ?? '';
    if (k === '--pool') a.pool = resolve(v());
    else if (k === '--ns') a.ns = v().split(',').map(Number);
    else if (k === '--port') a.port = Number(v());
    else if (k === '--shares') a.shares = v().split(',').map(Number);
    else if (k === '--active') a.active = Number(v());
    else if (k === '--seconds') a.seconds = Number(v());
    else if (k === '--heap') a.heap = Number(v());
    else if (k === '--cold') a.cold = resolve(v());
    else if (k === '--out') a.out = resolve(v());
    // also boot the production artifact over the same set (boot time and RSS)
    else if (k === '--artifact') a.artifact = true;
  }
  if (a.port === 8140) throw new Error('never 8140: that is the ordinary dev server');
  return a;
}

/* -- the host child ------------------------------------------------------ */

class Host {
  private next = 1;
  private waiting = new Map<number, (b: unknown) => void>();
  ready: Promise<Record<string, number>>;
  constructor(readonly child: ChildProcess) {
    let resolveReady!: (b: Record<string, number>) => void;
    this.ready = new Promise((r) => { resolveReady = r; });
    child.on('message', (raw) => {
      const { id, body } = raw as { id: number; body: unknown };
      if (id === 0) { resolveReady(body as Record<string, number>); return; }
      this.waiting.get(id)?.(body);
      this.waiting.delete(id);
    });
  }
  ask<T = Record<string, number>>(op: string): Promise<T> {
    const id = this.next++;
    return new Promise((r) => {
      this.waiting.set(id, r as (b: unknown) => void);
      this.child.send({ op, id });
    });
  }
  async stop(): Promise<void> {
    if (this.child.exitCode !== null) return;
    const gone = new Promise((r) => this.child.once('exit', r));
    this.child.send({ op: 'exit', id: -1 });
    await Promise.race([gone, sleep(5000)]);
    if (this.child.exitCode === null) this.child.kill('SIGKILL');
  }
}

/** The dev path's environment: no Resend key at all (an empty one is a key,
 *  and would close the dev seat switch), mail off, the file store. */
function hostEnv(dataDir: string, port: number, base: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, DRAFT_DATA_DIR: dataDir, PORT: String(port),
    DRAFT_BASE_URL: base, DRAFT_NOTIFY_EMAIL: '', DRAFT_STORE: 'file', DRAFT_MAIL_OFF: '1' };
  delete env.RESEND_API_KEY;
  delete env.DATABASE_URL;
  return env;
}

async function boot(a: Args, dataDir: string): Promise<{ host: Host; bootMs: number;
  ready: Record<string, number>; base: string }> {
  const base = `http://127.0.0.1:${a.port}`;
  // a stale host on this port would answer the health check for us
  const stale = await fetch(`${base}/healthz`).then(() => true, () => false);
  if (stale) throw new Error(`port ${a.port} is already answering — pick another --port`);
  const spawned = performance.now();
  const child = fork(join(HERE, 'scale-host.ts'), [], {
    execArgv: ['--expose-gc', `--max-old-space-size=${a.heap}`, '--import', 'tsx'],
    cwd: join(HERE, '..', '..', 'server'),
    env: hostEnv(dataDir, a.port, base),
    stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
  });
  const host = new Host(child);
  let bootMs = -1;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`the host exited during boot (${child.exitCode})`);
    const ok = await fetch(`${base}/healthz`).then((r) => r.ok, () => false);
    if (ok) { bootMs = performance.now() - spawned; break; }
    await sleep(25);
  }
  return { host, bootMs, ready: await host.ready, base };
}

/**
 * **The production artifact over the same set**: `dist/server.mjs` (run
 * `npm run build` first), under render.yaml's own start line, told it is
 * production by the variables it refuses to boot without — a dummy Resend
 * key with mail off, so nothing is ever sent. Boot to the first `/healthz`
 * 200, and the process's working set read from outside (Windows' RSS),
 * since this process has no channel to report through.
 */
async function artifactBoot(a: Args, dataDir: string): Promise<{ bootMs: number; rss: number }> {
  const base = `http://127.0.0.1:${a.port}`;
  const root = join(HERE, '..', '..', '..');
  const env: NodeJS.ProcessEnv = { ...process.env, DRAFT_DATA_DIR: dataDir, PORT: String(a.port),
    DRAFT_BASE_URL: 'https://scale.invalid', DRAFT_SECRET: 'scale-measure', RESEND_API_KEY: 're_scale',
    DRAFT_MAIL_OFF: '1', DRAFT_NOTIFY_EMAIL: '', DRAFT_STORE: 'file' };
  delete env.DATABASE_URL;
  const spawned = performance.now();
  const child = spawn(process.execPath, ['--max-old-space-size=384', join(root, 'dist', 'server.mjs')],
    { cwd: root, env, stdio: ['ignore', 'ignore', 'inherit'] });
  try {
    for (;;) {
      if (child.exitCode !== null) throw new Error(`the artifact exited during boot (${child.exitCode})`);
      const ok = await fetch(`${base}/healthz`).then((r) => r.ok, () => false);
      if (ok) break;
      await sleep(25);
    }
    const bootMs = performance.now() - spawned;
    await sleep(2000); // let the first collections run, as a live host would
    const ps = spawnSync('powershell', ['-NoProfile', '-Command',
      `(Get-Process -Id ${child.pid}).WorkingSet64`], { encoding: 'utf8' });
    return { bootMs, rss: Number(ps.stdout.trim()) };
  } finally {
    child.kill();
    await new Promise((r) => { if (child.exitCode !== null) r(null); else child.once('exit', r); });
  }
}

/* -- the documents' seats ------------------------------------------------ */

interface DocSeats { slug: string; members: string[]; open: boolean; begun: boolean }

/** Who is seated in a document, read off its own log (arrivals, removals, the close). */
function seatsOf(docDir: string): DocSeats {
  const lines = readFileSync(join(docDir, 'log.jsonl'), 'utf8').split('\n');
  let slug = '', open = true, begun = false;
  const members = new Set<string>(['founder']);
  for (const l of lines) {
    if (l.length === 0) continue;
    if (!/"type":"(created|member-arrived|member-removed|member-resigned|closed|constituted)"/.test(l)) continue;
    const e = (JSON.parse(l) as { event: { type: string; slug?: string; member?: string } }).event;
    if (e.type === 'created') slug = e.slug!;
    else if (e.type === 'member-arrived') members.add(e.member!);
    else if (e.type === 'member-removed' || e.type === 'member-resigned') members.delete(e.member!);
    else if (e.type === 'closed') open = false;
    else if (e.type === 'constituted') begun = true;
  }
  return { slug, members: [...members], open, begun };
}

const pct = (xs: number[], p: number): number => {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]!;
};

/* -- one load run ---------------------------------------------------------- */

async function load(a: Args, host: Host, base: string, docs: DocSeats[], share: number,
  seed: string): Promise<Record<string, unknown>> {
  const rng = makeRng(`scale-measure/${seed}/${share}`);
  const lat: Record<string, number[]> = {};
  let errors = 0;
  const w: Wire = { base, onStatus: (what, status, ms) => {
    if (status >= 500) errors++;
    (lat[what] ??= []).push(ms);
  } };
  // the active documents: a few of the open, begun ones, where the room is working
  const openBegun = docs.filter((d) => d.open && d.begun);
  const activeN = Math.max(a.active > 0 ? 1 : 0, Math.round(openBegun.length * a.active));
  const active = new Set(openBegun.slice(0, activeN).map((d) => d.slug));
  // a share of every document's members, at least one in any document with somebody online
  const seats: Array<ActSeat & { slug: string; acts: boolean }> = [];
  for (const d of docs) {
    for (const m of d.members) {
      if (rng.next() >= share) continue;
      seats.push({ slug: d.slug, member: m, cookie: '', poller: null as unknown as Poller,
        acts: active.has(d.slug) });
    }
  }
  say(`    seating ${seats.length} members (${Math.round(share * 100)}%), `
    + `${seats.filter((s) => s.acts).length} of them acting in ${active.size} active documents`);
  for (let i = 0; i < seats.length; i += 50) {
    await Promise.all(seats.slice(i, i + 50).map(async (s) => {
      s.cookie = await seat(w, s.slug, s.member);
      s.poller = new Poller(w, s.slug, s.cookie);
    }));
  }
  for (const k of Object.keys(lat)) delete lat[k];

  // every seat opens its page (one full view), then polls every 4 s on its own phase
  let stop = false;
  const measuring = { on: false };
  const run = async (s: typeof seats[number]): Promise<void> => {
    await sleep(rng.int(4000));
    let nextAct = performance.now() + 5000 + rng.int(30_000);
    while (!stop) {
      const t = performance.now();
      try {
        if (s.acts && t >= nextAct) {
          nextAct = t + 15_000 + rng.int(30_000);
          await act(w, s.slug, s, rng, { judge: true, propose: rng.next() < 0.2,
            withdrawShare: 0.02, n: rng.int(1e6) });
        } else {
          await s.poller.poll();
        }
      } catch { errors++; }
      const spent = performance.now() - t;
      await sleep(Math.max(0, 4000 - spent));
    }
  };
  const all = seats.map(run);
  await sleep(12_000); // every page has opened and polled at least twice
  for (const k of Object.keys(lat)) delete lat[k];
  errors = 0;
  measuring.on = true;
  await host.ask('cpu-start');
  await sleep(a.seconds * 1000);
  const cpu = await host.ask<Record<string, unknown>>('cpu-stop');
  const memUnder = await host.ask('mem');
  stop = true;
  await Promise.all(all);
  const summary = (k: string): string => {
    const xs = lat[k] ?? [];
    return xs.length === 0 ? '—' : `${xs.length} · ${pct(xs, 50).toFixed(1)} / ${pct(xs, 95).toFixed(1)} ms`;
  };
  const views = [...(lat['view'] ?? []), ...(lat['view-short'] ?? [])];
  const out = {
    share, seats: seats.length, acting: seats.filter((s) => s.acts).length,
    activeDocs: active.size, reqPerSec: views.length / a.seconds,
    viewP50: pct(views, 50), viewP95: pct(views, 95),
    fullP50: pct(lat['view'] ?? [], 50), fullP95: pct(lat['view'] ?? [], 95),
    shortP50: pct(lat['view-short'] ?? [], 50), shortP95: pct(lat['view-short'] ?? [], 95),
    judgeP95: pct(lat['judge-race'] ?? [], 95), fullViews: (lat['view'] ?? []).length,
    errors, cpu, rssUnderLoad: memUnder.rss, liveHeapUnderLoad: memUnder.liveHeap,
  };
  say(`    ${out.reqPerSec.toFixed(0)} polls/s · all views ${summary('view')} full, `
    + `${summary('view-short')} short (client side) · server side ${JSON.stringify(cpu.served)} · busy `
    + `${((cpu.busy as number) * 100).toFixed(0)}% · loop p99 ${(cpu.loopP99 as number).toFixed(1)} ms · `
    + `ticks ${JSON.stringify((cpu.ticks as number[]).map((t) => Math.round(t)))} · errors ${errors}`);
  return out;
}

/* -- the run ---------------------------------------------------------------- */

const MB = (b: number): string => `${(b / 1048576).toFixed(0)} MB`;

async function measureN(a: Args, rows: ManifestRow[], n: number): Promise<Record<string, unknown>> {
  const dataDir = join(a.pool, '..', `n${n}`);
  const docsDir = join(dataDir, 'docs');
  // a fresh copy every run: a measurement writes (presence, ticks), and the
  // next must start from the pool as seeded
  rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(docsDir, { recursive: true });
  const picked = rows.slice(0, n);
  for (const r of picked) cpSync(join(a.pool, 'docs', r.id), join(docsDir, r.id), { recursive: true });
  const entries = picked.reduce((s, r) => s + r.logEntries + r.engineEntries, 0);
  const bytes = picked.reduce((s, r) => s + r.bytes, 0);
  const result: Record<string, unknown> = { n, entries, bytes };
  say(`\n== N = ${n}: ${entries} log entries (both logs), ${(bytes / 1e6).toFixed(1)} MB ==`);

  if (a.artifact) {
    const art = await artifactBoot(a, dataDir);
    say(`  the production artifact: boot ${(art.bootMs / 1000).toFixed(2)} s to /healthz 200, RSS ${MB(art.rss)}`);
    (result as Record<string, unknown>).artifact = art;
  }
  const { host, bootMs, ready } = await boot(a, dataDir).catch((e: unknown) => {
    throw new Error(`boot at N=${n}: ${(e as Error).message}`);
  });
  Object.assign(result, { bootMs, ...ready });
  try {
    say(`  boot ${(bootMs / 1000).toFixed(2)} s to /healthz 200 (replay ${(ready.createMs! / 1000).toFixed(2)} s, `
      + `loader ${(ready.startedAtMs! / 1000).toFixed(2)} s) · ${ready.docs} docs, `
      + `${ready.quarantined} quarantined`);
    const m1 = await host.ask('mem');
    const m2 = await host.ask('gc');
    say(`  memory after boot: RSS ${MB(m1.rss!)}, live heap ${MB(m1.liveHeap!)}; after GC: RSS `
      + `${MB(m2.rss!)}, live heap ${MB(m2.liveHeap!)}`);
    const ticks: number[] = [];
    for (let k = 0; k < 3; k++) ticks.push((await host.ask('tick')).ms!);
    say(`  one tick() pass: ${ticks.map((t) => t.toFixed(0)).join(' / ')} ms`);
    Object.assign(result, { memBoot: m1, memGc: m2, tickMs: ticks });
    const docs = readdirSync(docsDir).map((id) => seatsOf(join(docsDir, id)));
    const loads = [];
    for (const share of a.shares) loads.push(await load(a, host, `http://127.0.0.1:${a.port}`, docs, share, String(n)));
    result.loads = loads;
  } finally {
    await host.stop();
    rmSync(dataDir, { recursive: true, force: true });
  }
  return result;
}

async function cold(a: Args, docDir: string): Promise<Record<string, unknown>> {
  const dataDir = join(a.pool, '..', 'cold');
  rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(join(dataDir, 'docs'), { recursive: true });
  cpSync(docDir, join(dataDir, 'docs', basename(docDir)), { recursive: true });
  const s = seatsOf(docDir);
  const count = (f: string): number => existsSync(join(docDir, f))
    ? readFileSync(join(docDir, f), 'utf8').split('\n').filter((l) => l.length > 0).length : 0;
  say(`\n== cold open: ${s.slug}, ${count('log.jsonl')} + ${count('engine.jsonl')} entries ==`);
  const { host, bootMs, ready, base } = await boot(a, dataDir);
  try {
    const m = await host.ask('gc');
    const w: Wire = { base };
    const cookie = await seat(w, s.slug, s.members[s.members.length - 1]!);
    const p = new Poller(w, s.slug, cookie);
    const t0 = performance.now(); await p.poll(); const first = performance.now() - t0;
    const t1 = performance.now(); await p.full(); const second = performance.now() - t1;
    say(`  boot ${(bootMs / 1000).toFixed(2)} s (replay ${(ready.createMs! / 1000).toFixed(2)} s), `
      + `live heap ${MB(m.liveHeap!)} after GC, first view ${first.toFixed(0)} ms, next full view ${second.toFixed(0)} ms`);
    return { slug: s.slug, log: count('log.jsonl'), engine: count('engine.jsonl'), bootMs,
      replayMs: ready.createMs, liveHeap: m.liveHeap, firstViewMs: first, nextViewMs: second };
  } finally {
    await host.stop();
    rmSync(dataDir, { recursive: true, force: true });
  }
}

const a = parseArgs(process.argv.slice(2));
const results: Record<string, unknown> = { machine: {
  node: process.version, platform: process.platform, heapLimitMb: a.heap } };
if (a.cold !== null) {
  results.cold = await cold(a, a.cold);
} else {
  const rows = JSON.parse(readFileSync(join(a.pool, 'manifest.json'), 'utf8')) as ManifestRow[];
  const runs = [];
  for (const n of a.ns) {
    if (rows.length < n) { say(`\n== N = ${n}: the pool holds ${rows.length} — skipped ==`); continue; }
    try { runs.push(await measureN(a, rows, n)); } catch (e) {
      say(`  N = ${n} FAILED: ${(e as Error).message}`);
      runs.push({ n, failed: (e as Error).message });
    }
  }
  results.runs = runs;
}
if (a.out !== null) writeFileSync(a.out, JSON.stringify(results, null, 1));
