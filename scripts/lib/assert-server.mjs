/**
 * Is this server running *your* tree? (Q911, Ed 2026-08-26.)
 *
 * A walk that attaches to a server on a default port will happily drive a
 * process another session left listening. On 2026-08-26 two were up, and the
 * one on 8140 was old enough to still know the `signing` setting that spec
 * v0.70 retired — so `applicants-walk` produced a page of confident,
 * entirely fictitious failures and cost an hour. Nothing noticed it was
 * talking to a stranger.
 *
 * **Why the check has to ask the process, not the page.** A running server
 * holds two copies of the work at different ages. `design/` is served from
 * disk, so the page and the browser bundle are always current — edit
 * `session-view.html` and the running server serves the edit. The mechanism
 * is loaded at boot (`tsx src/main.ts`, no watch), so the catalogue, the
 * engine and the server logic are frozen at whenever the process started.
 * A stale server therefore serves *today's page over a week-old engine*,
 * which is precisely why the failures read as product bugs rather than as
 * an environment problem. Nothing fetched off disk can detect it.
 *
 * So the probe is the catalogue's own setting ids, reported by `/healthz`
 * from the process's memory, against the tree's. Ids rather than a hash, so
 * the failure names what differs — *this server knows `signing`, your tree
 * does not* ends the hour immediately, where *fingerprint mismatch* does not.
 *
 * The tree's side comes from `design/constitution.js`, the committed browser
 * bundle, read the way `spec-check` reads it; `bundle-fresh.test.ts` asserts
 * the bundle matches source, so it is a sound stand-in for the TS a plain
 * .mjs cannot import.
 *
 * **Two questions, asked in this order** (entry 105, 2026-08-27). *Which
 * server?* is `walkBase` below — argv, then the environment, then the port,
 * then the server's own default — because a walk that picks its server by a
 * literal port drives whatever answers there, which is how the B2 batch review
 * started a server on 8160 and walked 8199. *Is it this tree?* is
 * `assertServerBuild`: the **sha** first when the server reports one — the
 * same `cfg.buildSha` the `x-build` response header carries, against `git
 * rev-parse HEAD` here — because a commit pair is the plainer fact; then the
 * catalogue, which is the only evidence available for the ordinary dev server,
 * whose `build` is null because nothing sets `RENDER_GIT_COMMIT` or
 * `DRAFT_BUILD_SHA` for it.
 *
 *   import { assertServerBuild, walkBase } from './lib/assert-server.mjs';
 *   const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
 *   await assertServerBuild(BASE, 'applicants-walk');
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/**
 * Which server a walk attaches to, surest first — one ladder for all five
 * attaching walks, so the answer cannot drift between them.
 *
 *   · an `http(s)://` argument — a person named it, and a person outranks
 *     every default; this is the rung CI uses.
 *   · `DRAFT_BASE_URL` — the environment named it, and it is the very
 *     variable the server reads for its own origin (`config.ts`
 *     `configFromEnv` → `baseUrl`). Under plan-queue it is the build slot's
 *     own server (slot *n* carries `PORT=816n`), which is what lets the
 *     slot's port reclaim reach whatever a walk leaves behind.
 *   · `PORT` — a server started with only the port set.
 *   · the fallback — the caller passes the server's own default (8140,
 *     `config.ts`: `env.PORT ? Number(env.PORT) : 8140`), so a bare
 *     `npm run server` and a bare walk meet.
 *
 * Pure and synchronous, argv and env passed in rather than read, so the
 * precedence can be asserted without a server (`walk-base.test.ts`). One
 * trailing slash is stripped, as `verify-deploy.mjs` strips it and for the
 * same reason: every caller appends a path.
 */
export function walkBase(argv, env, fallback) {
  const named = (argv || []).find((a) => /^https?:\/\//.test(a));
  const base =
    named ||
    (env && env.DRAFT_BASE_URL) ||
    (env && env.PORT ? `http://127.0.0.1:${env.PORT}` : '') ||
    fallback;
  return String(base).replace(/\/$/, '');
}

/**
 * This tree's HEAD, or null when there is no git to ask — a walk run from an
 * exported tarball has no HEAD, and the honest answer is *could not read it*
 * rather than a refusal. In a plan-queue worktree `ROOT` is that worktree's
 * root, so this is that branch's HEAD, which is the one wanted.
 */
function treeHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Do a server-reported build sha and this tree's HEAD name the same commit?
 * Render and a hand-set `DRAFT_BUILD_SHA` may be 7 characters or 40, so the
 * shorter is matched as a prefix of the longer — with a **floor of seven**,
 * below which a sha identifies no commit at all (a one-character one would
 * match nearly every tree) and is reported as unreadable rather than as a
 * match. Returns 'same' | 'differs' | 'unreadable'.
 */
function shaVerdict(serverSha, head) {
  const a = String(serverSha).trim().toLowerCase();
  const b = String(head).trim().toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(a)) return 'unreadable';
  const same = a.length <= b.length ? b.startsWith(a) : a.startsWith(b);
  return same ? 'same' : 'differs';
}

/** The tree's catalogue ids, from the committed bundle (spec-check's route). */
export function treeCatalogueIds() {
  const ctx = {};
  vm.runInNewContext(readFileSync(join(ROOT, 'design/constitution.js'), 'utf8'), ctx);
  const cat = ctx.CONSTITUTION && ctx.CONSTITUTION.CATALOGUE;
  if (!cat) throw new Error('CONSTITUTION.CATALOGUE not found in design/constitution.js');
  return cat.map((e) => e.id).sort();
}

const die = (label, lines) => {
  console.error(`\n${label}: refusing to run — this server is not your tree.\n`);
  for (const l of lines) console.error('  ' + l);
  console.error('\nRestart the server from this tree, or pass the right base URL.');
  process.exit(2);
};

/** What the server's catalogue has that the tree's has not, and the reverse. */
const catalogueDiff = (got, want) => {
  if (!Array.isArray(got)) return [];
  const serverOnly = got.filter((id) => !want.includes(id));
  const treeOnly = want.filter((id) => !got.includes(id));
  return [
    serverOnly.length ? `it has, and your tree does not: ${serverOnly.join(', ')}` : null,
    treeOnly.length ? `your tree has, and it does not: ${treeOnly.join(', ')}` : null,
  ].filter(Boolean);
};

/**
 * Stop the walk unless the server at `base` was booted from this tree.
 * Exits 2 with a message naming what differs; never returns on mismatch.
 */
export async function assertServerBuild(base, label = 'walk') {
  const want = treeCatalogueIds();
  let health;
  try {
    const res = await fetch(base + '/healthz');
    if (!res.ok) return die(label, [`GET ${base}/healthz answered ${res.status}.`]);
    health = await res.json();
  } catch (e) {
    return die(label, [`no server answering at ${base} (${e && e.message}).`]);
  }
  const got = health.catalogue;
  // The sha rung, first when it can be asked (entry 105): `health.build` is
  // the same `cfg.buildSha` the `x-build` response header carries, so a
  // server that states its commit is judged on it — the plainer fact, and the
  // catalogue diff is appended so the reader learns what content differs too.
  // Conditional by design: a plain `npm run server` sets neither
  // RENDER_GIT_COMMIT nor DRAFT_BUILD_SHA and reports null, which is not a
  // mismatch, and such a server falls through to the catalogue as before.
  if (typeof health.build === 'string' && health.build.trim()) {
    const head = treeHead();
    const verdict = head === null ? 'no-head' : shaVerdict(health.build, head);
    if (verdict === 'differs' || verdict === 'unreadable') {
      return die(label, [
        verdict === 'unreadable'
          ? `${base} reports a build sha that names no commit: ${health.build}`
          : `${base} was built from a different commit.`,
        `its build: ${health.build}`,
        `your tree's HEAD: ${head}`,
        `up ${health.uptimeSeconds}s.`,
        ...catalogueDiff(got, want),
      ]);
    }
    // no refusal without both sides: an exported tarball has no HEAD to read,
    // so say what could not be asked and leave the catalogue to answer.
    if (verdict === 'no-head') {
      console.error(`${label}: could not read the tree's HEAD, so ${base}'s build ` +
        `(${health.build}) went unchecked; the catalogue still answers.`);
    }
  }
  // a server that predates this check cannot be vouched for, and saying so
  // is the point: silence here is how Q911 happened
  if (!Array.isArray(got)) {
    return die(label, [
      `${base} does not report its catalogue, so it predates this check (Q911).`,
      `Its build is ${health.build ?? 'unreported'}; restart it from this tree.`,
    ]);
  }
  const diff = catalogueDiff(got, want);
  if (diff.length) {
    return die(label, [
      `${base} is running a different catalogue.`,
      ...diff,
      `its build: ${health.build ?? 'unreported'}; up ${health.uptimeSeconds}s.`,
    ]);
  }
  return health;
}
