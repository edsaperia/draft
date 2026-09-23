/**
 * **N documents of realistic shape, written to a scratch file store**
 * (plan-scaling.md Stage 0, the seeding tool).
 *
 *   npm run scale-seed -w @draft/sim-harness -- --n 1000 --out <dir> [--seed S]
 *       [--batch 25]
 *
 * Writes `<out>/pool/docs/<id>/…` (the file store's own layout) and
 * `<out>/pool/manifest.json`, one row per document in seed order with its
 * shape and its two logs' lengths. Re-running resumes: a batch whose rows are
 * in the manifest is not seeded again, so `--n 300` then `--n 1000` adds 700.
 *
 * **How a document is made.** A real server, in this process, on a scratch
 * data dir, listening on an ephemeral 127.0.0.1 port: the founder is created
 * by `POST /api/docs` and arrives by the magic link; members are invited by
 * the founder's `invite` and seated by the dev seat switch; the constitution
 * is set, sometimes partly delegated and answered blind; 🍾 is pressed; then
 * the room proposes, judges and withdraws through `POST /api/d/:slug/cmd`
 * with the engine live, each act off a full member view. So every entry on
 * disk was emitted by the module through the command path, and replay
 * accepts it by construction. A closed document has its ending moved to a
 * second away by the founder's pen, and the host's own `tick()` closes it.
 *
 * **Deterministic by seed in shape, not in bytes**: the shapes, the charters,
 * the wordings and every choice are drawn from `--seed`; document ids, tokens
 * and timestamps are the host's own and differ run to run.
 *
 * **Memory-sane**: a batch is a child process holding only its own
 * documents, and each finished batch is moved into the pool before the next
 * starts — the seeder never holds more than `--batch` documents in memory.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync }
  from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import { makeRng } from '../../engine-core/src/rng.js';
import type { Rng } from '../../engine-core/src/rng.js';
import { configFromEnv } from '../../server/src/config.js';
import { createDraftServer } from '../../server/src/server.js';
import { sweepBuckets } from '../../server/src/routes.js';
import { CATALOGUE } from '../../constitution/src/index.js';
import { Poller, act, charterOf, cmd, consume, post, seat, shapeOf } from './scale-room.js';
import type { ActSeat, Shape, Wire } from './scale-room.js';

const HERE = dirname(fileURLToPath(import.meta.url));

export interface ManifestRow {
  index: number; id: string; slug: string; shape: Shape;
  logEntries: number; engineEntries: number; bytes: number;
  acts: Record<string, number>; seedMs: number;
}

interface Args { n: number; out: string; seed: string; batch: number;
  child: boolean; from: number; to: number; kind: string; mix: string }

function parseArgs(argv: string[]): Args {
  const a: Args = { n: 30, out: '', seed: 'scale', batch: 25, child: false, from: 0, to: 0, kind: '',
    mix: '' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]!;
    const v = (): string => argv[++i] ?? '';
    if (k === '--n') a.n = Number(v());
    else if (k === '--out') a.out = resolve(v());
    else if (k === '--seed') a.seed = v();
    else if (k === '--batch') a.batch = Number(v());
    else if (k === '--child') a.child = true;
    else if (k === '--from') a.from = Number(v());
    else if (k === '--to') a.to = Number(v());
    // one kind only (a trial, or the boot guard's convention document)
    else if (k === '--kind') a.kind = v();
    // a stated mix, one kind per index in order (`convention:1,medium:3,…`):
    // the boot guard's set, where the proportions are the point
    else if (k === '--mix') a.mix = v();
  }
  if (a.out === '') throw new Error('--out <dir> is required (a scratch directory, never data/)');
  return a;
}

const say = (s: string): void => { process.stdout.write(s + '\n'); };

/* -- the parent: batches, the pool, the manifest ------------------------ */

function parent(a: Args): void {
  const pool = join(a.out, 'pool');
  mkdirSync(join(pool, 'docs'), { recursive: true });
  const manifestPath = join(pool, 'manifest.json');
  const rows: ManifestRow[] = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8')) as ManifestRow[] : [];
  const done = new Set(rows.map((r) => r.index));
  say(`== scale-seed: ${a.n} documents, seed '${a.seed}', ${done.size} already in the pool ==`);
  for (let from = 0; from < a.n; from += a.batch) {
    const to = Math.min(a.n, from + a.batch);
    if ([...Array(to - from).keys()].every((k) => done.has(from + k))) continue;
    const dir = join(a.out, 'batches', `b${from}`);
    rmSync(dir, { recursive: true, force: true });
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url),
      '--child', '--out', dir, '--seed', a.seed, '--from', String(from), '--to', String(to),
      ...(a.kind ? ['--kind', a.kind] : []), ...(a.mix ? ['--mix', a.mix] : [])],
    { stdio: ['ignore', 'inherit', 'inherit'], cwd: join(HERE, '..', '..', 'server') });
    if (r.status !== 0) throw new Error(`batch ${from}–${to} failed (exit ${r.status})`);
    const got = JSON.parse(readFileSync(join(dir, 'rows.json'), 'utf8')) as ManifestRow[];
    for (const row of got) {
      if (done.has(row.index)) continue;
      renameSync(join(dir, 'docs', row.id), join(pool, 'docs', row.id));
      rows.push(row);
      done.add(row.index);
    }
    rows.sort((x, y) => x.index - y.index);
    writeFileSync(manifestPath, JSON.stringify(rows, null, 1));
    rmSync(dir, { recursive: true, force: true });
    say(`  batch ${from}–${to - 1}: ${Math.round((Date.now() - t0) / 1000)} s, pool ${rows.length}`);
  }
  const sum = (f: (r: ManifestRow) => number): number => rows.slice(0, a.n).reduce((s, r) => s + f(r), 0);
  say(`  pool: ${Math.min(rows.length, a.n)} documents, ${sum((r) => r.logEntries)} document-log `
    + `entries, ${sum((r) => r.engineEntries)} engine entries, `
    + `${(sum((r) => r.bytes) / 1e6).toFixed(1)} MB`);
}

/* -- the child: one batch, one in-process server ------------------------ */

async function child(a: Args): Promise<void> {
  mkdirSync(a.out, { recursive: true });
  // the host writes a line per request and prints every dev mail: silence it,
  // this process's own lines go to stdout directly
  console.log = (): void => {};
  const cfg = configFromEnv({ ...process.env, DRAFT_DATA_DIR: a.out, PORT: '0',
    DRAFT_NOTIFY_EMAIL: '', RESEND_API_KEY: undefined, DRAFT_STORE: 'file' });
  const draft = await createDraftServer(cfg);
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', () => r()));
  const port = (draft.server.address() as AddressInfo).port;
  cfg.baseUrl = `http://127.0.0.1:${port}`;
  const w: Wire = { base: cfg.baseUrl };

  const rows: ManifestRow[] = [];
  const closing: Array<{ row: ManifestRow; slug: string; founder: string; seats: ActSeat[] }> = [];
  for (let i = a.from; i < a.to; i++) {
    const rng = makeRng(`scale/${a.seed}/${i}`);
    const shape = shapeOf(rng.fork('shape'), kindAt(a, i));
    const t0 = Date.now();
    const made = await seedOne(w, rng, i, shape);
    const row: ManifestRow = { index: i, id: '', slug: made.slug, shape, logEntries: 0,
      engineEntries: 0, bytes: 0, acts: made.acts, seedMs: Date.now() - t0 };
    rows.push(row);
    if (shape.closed) closing.push({ row, slug: made.slug, founder: made.founder, seats: made.seats });
    say(`    #${i} ${shape.kind} m${shape.members} l${shape.lines} p${shape.proposals} `
      + `j${shape.judgments}${shape.closed ? ' closed' : ''}: ${JSON.stringify(made.acts)} `
      + `${Math.round((Date.now() - t0) / 100) / 10} s`);
  }
  // the closes: the founder's pen moves each ending a second out, then the
  // host's own clock closes them, and a few members sign
  if (closing.length > 0) {
    for (const c of closing) {
      await cmd(w, c.slug, c.founder, 'set-setting',
        { setting: 'ending', value: { endsAtMs: Date.now() + 1500 } });
    }
    await new Promise((r) => setTimeout(r, 2500));
    await draft.tick();
    for (const c of closing) {
      for (const s of c.seats.slice(0, 1 + Math.floor(c.seats.length / 3))) {
        try { await cmd(w, c.slug, s.cookie, 'acknowledge-close', { comment: '' }); } catch { /* not owed */ }
      }
    }
  }
  await draft.close();

  // read the pool's own ids and sizes back off disk, never the run's report
  const docsDir = join(a.out, 'docs');
  for (const id of readdirSync(docsDir)) {
    const log = readFileSync(join(docsDir, id, 'log.jsonl'), 'utf8');
    const first = JSON.parse(log.slice(0, log.indexOf('\n'))) as { event: { slug: string } };
    const row = rows.find((r) => r.slug === first.event.slug);
    if (row === undefined) continue;
    row.id = id;
    row.logEntries = log.split('\n').filter((l) => l.length > 0).length;
    const ePath = join(docsDir, id, 'engine.jsonl');
    const elog = existsSync(ePath) ? readFileSync(ePath, 'utf8') : '';
    row.engineEntries = elog.split('\n').filter((l) => l.length > 0).length;
    row.bytes = log.length + elog.length;
  }
  writeFileSync(join(a.out, 'rows.json'), JSON.stringify(rows));
}

/** The kind index `i` is held to, if any: `--kind` for all, `--mix` per index. */
export function kindAt(a: { kind: string; mix: string }, i: number): string | undefined {
  if (a.mix !== '') {
    const kinds = a.mix.split(',').flatMap((part) => {
      const [k, n] = part.split(':');
      return Array<string>(Number(n ?? 1)).fill(k!);
    });
    return kinds[i];
  }
  return a.kind === '' ? undefined : a.kind;
}

/** The constitution every seeded document is founded under, founder-held. */
function settingsFor(rng: Rng): Array<[string, unknown]> {
  return [
    // a generous wallet: the budgets below say how much the room proposes,
    // not the drip, which runs on real minutes the seeder does not wait for
    ['rate', { grant: 40, cap: 60, dripMinutes: 60 }],
    ['quorum', { form: 'share', n: 25 + rng.int(21) }],
    ['authorship', { rung: 'sealed' }],
    ['judgments', { rung: 'after' }],
    ['chamber', { rung: 'link' }],
    ['applications', { apply: false }],
    ['admission', { price: 'proposal' }],
    ['removal', { price: 'consent' }],
    ['lapse', { afterMs: null }],
    ['ending', { endsAtMs: Date.now() + 30 * 24 * 3600_000 }],
  ];
}

async function seedOne(w: Wire, rng: Rng, i: number, shape: Shape): Promise<{
  slug: string; founder: string; seats: ActSeat[]; acts: Record<string, number>;
}> {
  const acts: Record<string, number> = {};
  const count = (k: string): void => { acts[k] = (acts[k] ?? 0) + 1; };
  const title = `Scale Charter ${i}`;
  // the creation door is a mail-minting door with a per-IP bucket; this
  // process is one IP making hundreds, so the bucket is emptied first — the
  // limiter's own housekeeping, called by hand
  sweepBuckets(Number.MAX_SAFE_INTEGER);
  const created = await (await post(w, '/api/docs',
    { title, email: `founder-${i}@example.org` })).json() as
    { ok?: boolean; slug?: string; devLink?: string; error?: string };
  if (!created.ok || !created.slug || !created.devLink) {
    throw new Error(`creation refused: ${JSON.stringify(created)}`);
  }
  const slug = created.slug;
  const founder = await consume(created.devLink);
  const f = (name: string, args: unknown): Promise<unknown> => cmd(w, slug, founder, name, args);

  await f('set-identity', { name: `Founder ${i}` });
  await f('set-convenor-membership', { isMember: true });
  await f('confirm-starting-text', { text: charterOf(rng.fork('charter'), shape.lines, title) });
  const seats: ActSeat[] = [];
  for (let k = 1; k < shape.members; k++) {
    const member = await f('invite', { email: `m${k}-${i}@scale.invalid` }) as string;
    const cookie = await seat(w, slug, member);
    await cmd(w, slug, cookie, 'set-identity', { name: `Member ${k} of ${i}` });
    seats.push({ member, cookie, poller: new Poller(w, slug, cookie) });
  }
  const founderSeat: ActSeat = { member: 'founder', cookie: founder, poller: new Poller(w, slug, founder) };

  // the constitution, founder-held — or, three documents in ten, two
  // questions delegated and answered blind by the room (nh2026 delegated three)
  const delegated = shape.delegate ? new Set(['authorship', 'chamber']) : new Set<string>();
  await f('set-quorum-form', { form: 'share' });
  for (const [setting, value] of settingsFor(rng.fork('settings'))) {
    if (delegated.has(setting)) {
      await f('delegate', { setting });
      const rungs = CATALOGUE.find((e) => e.id === setting)?.rungs ?? [];
      for (const s of [founderSeat, ...seats]) {
        await cmd(w, slug, s.cookie, 'answer', { setting, value: { rung: rungs[rng.int(rungs.length)] } });
      }
    } else {
      await f('set-setting', { setting, value });
    }
  }
  if (shape.kind === 'unbegun') return { slug, founder, seats, acts };
  const ready = await founderSeat.poller.full();
  if (ready.readiness && !ready.readiness.ready) {
    throw new Error(`${slug}: 🍾 not ready, waiting on ${ready.readiness.waiting.join(', ')}`);
  }
  await f('begin', {});

  // the session: budgets spent by whoever is picked, every act off a full view
  const room = [founderSeat, ...seats];
  let p = shape.proposals, j = shape.judgments, idle = 0, n = 0;
  while ((p > 0 || j > 0) && idle < 12 * room.length) {
    const s = room[rng.int(room.length)]!;
    const proposeFirst = p > 0 && rng.next() < p / (p + j / 5);
    const got = await act(w, slug, s, rng, { judge: j > 0 && !proposeFirst, propose: p > 0,
      withdrawShare: shape.withdrawShare / 4, n: n++ });
    count(got);
    if (got === 'judged') { j--; idle = 0; }
    else if (got === 'proposed') { p--; idle = 0; }
    else if (got === 'withdrew') idle = 0;
    // nothing on offer to this seat: another may still be dealt a pair, and
    // after enough misses in a row the room has nothing left to judge
    else idle++;
  }
  return { slug, founder, seats: room, acts };
}

const args = parseArgs(process.argv.slice(2));
if (args.child) await child(args);
else parent(args);
