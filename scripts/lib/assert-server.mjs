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
 *   import { assertServerBuild } from './lib/assert-server.mjs';
 *   await assertServerBuild(BASE, 'applicants-walk');
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

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
  console.error('\nStart a server from this tree, or pass the right base URL.');
  process.exit(2);
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
  // a server that predates this check cannot be vouched for, and saying so
  // is the point: silence here is how Q911 happened
  if (!Array.isArray(got)) {
    return die(label, [
      `${base} does not report its catalogue, so it predates this check (Q911).`,
      `Its build is ${health.build ?? 'unreported'}; restart it from this tree.`,
    ]);
  }
  const serverOnly = got.filter((id) => !want.includes(id));
  const treeOnly = want.filter((id) => !got.includes(id));
  if (serverOnly.length || treeOnly.length) {
    return die(label, [
      `${base} is running a different catalogue.`,
      serverOnly.length ? `it has, and your tree does not: ${serverOnly.join(', ')}` : null,
      treeOnly.length ? `your tree has, and it does not: ${treeOnly.join(', ')}` : null,
      `its build: ${health.build ?? 'unreported'}; up ${health.uptimeSeconds}s.`,
    ].filter(Boolean));
  }
  return health;
}
