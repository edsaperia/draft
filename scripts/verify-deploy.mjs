/**
 * Live-deploy verification (PRODUCTION.md stage 4, and again at stage 10).
 *
 * The boot smoke in CI proves the artifact serves; this proves the
 * *environment* does — the class of truth a source review cannot reach and
 * a localhost test cannot see: TLS, HSTS, the proxy's redirect, the dev
 * outbox's absence from a real deploy, the design tree's notes staying
 * unreachable. **Almost everything here is a GET**, and the exceptions are
 * POSTs made to be refused: the phase ladder and the seat switch asked
 * with their real methods (Q674), the pause, the resume and the surface
 * upload asked with a wrong key (Q1345, Q1347), a cross-origin login. Each
 * asserts its own refusal — 401, 403 or 404 — so on the host this script is
 * for, none of them reaches a handler at all: nothing written to a log,
 * nothing mailed, and safe to run against production. Against a *dev* host
 * the ladder's POST is a real route and does build a document, which is the
 * check going red and the reason it is here. (`--limits` is the one that
 * leaves a mark either way: a 429 in the platform's logs.)
 *
 *   node scripts/verify-deploy.mjs https://staging.example.com
 *   node scripts/verify-deploy.mjs https://docs.vote --limits
 *   node scripts/verify-deploy.mjs https://docs.vote --before=before.json \
 *     --booted=$GITHUB_SHA
 *
 * --limits additionally hammers the one rate-limited door that neither
 * sends mail nor writes to a log (/api/docs/pending, which 404s on an
 * unknown id), with a *spoofed* x-forwarded-for on every request. The
 * limiter reads the client Cloudflare states (cf-connecting-ip, which it
 * overwrites on the way in) and falls back to a hop count from the right
 * (stage 4), so a client that invents x-forwarded-for entries must still
 * be limited — behind Cloudflare the spoof is simply ignored; on a bare
 * proxy it is counted past. Skipped by default because it leaves a 429
 * in the platform's logs.
 */

import { readFileSync } from 'node:fs';

const USAGE = `usage: node scripts/verify-deploy.mjs <base-url> [options]

  --limits            also hammer the rate limiter (leaves a 429 in the logs)
  --before=<file>     a /healthz body read before the deploy, to compare against
  --booted=<sha|same> the commit the host must have booted with: a commit for a
                      full deploy, \`same\` for a surface-only one (needs --before)
  --store=<pg|file>   the store this host must be serving from
`;
const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(USAGE); process.exit(0); }
const flag = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? null : hit.slice(name.length + 3);
};
const base = (argv.find((a) => !a.startsWith('-')) ?? '').replace(/\/$/, '');
const limits = argv.includes('--limits');
if (!/^https?:\/\//.test(base)) {
  console.error(USAGE);
  process.exit(2);
}

/**
 * **What the host said before the deploy** (issue #8): CI reads `/healthz`
 * before it touches anything and hands the body here, so the checks below
 * can be about the *change* rather than about an absolute nobody can state
 * — which store was answering, how many documents were loaded, how many of
 * them were quarantined. Absent (the read failed, or somebody ran this by
 * hand), every comparison says so and passes.
 */
const beforeFile = flag('before');
let before = null;
if (beforeFile !== null) {
  try { before = JSON.parse(readFileSync(beforeFile, 'utf8')); }
  catch (e) { console.error(`--before=${beforeFile} could not be read: ${e.message}`); }
}
/** The commit the host must have booted with, or `same` (issue #8, F1). */
const bootedWanted = flag('booted');
/** The store this host must be serving from (issue #8, F5). */
const storeWanted = flag('store');

const results = [];
/** The live `/healthz` body, once the check below has read it. */
let health = null;
/** Run one named assertion; a throw is a failure, a returned string a note. */
async function check(name, fn) {
  try {
    const note = await fn();
    results.push({ name, ok: true, note: note ?? '' });
  } catch (e) {
    results.push({ name, ok: false, note: e instanceof Error ? e.message : String(e) });
  }
}
const get = (path, init) =>
  fetch(base + path, { redirect: 'manual', ...init });
function expect(cond, message) { if (!cond) throw new Error(message); }

await check('GET / serves the surface', async () => {
  const r = await get('/');
  expect(r.status === 200, `status ${r.status}`);
  expect((r.headers.get('content-type') ?? '').startsWith('text/html'),
    `content-type ${r.headers.get('content-type')}`);
  return `${r.status} html`;
});

await check('/healthz says which build and store are answering (stage 7)', async () => {
  const r = await get('/healthz');
  expect(r.status === 200, `status ${r.status}`);
  expect(r.headers.get('cache-control') === 'no-store', 'health is cacheable');
  const body = await r.json();
  expect(body.ok === true, 'not ok');
  expect(body.store === 'file' || body.store === 'pg', `store ${body.store}`);
  expect(typeof body.documents === 'number', 'no document count');
  // the birth page reads this to ask for the stagehand's controls (Q1349)
  expect(typeof body.devMail === 'boolean', 'no devMail');
  health = body;
  return `store ${body.store} · ${body.documents} documents · devMail ${body.devMail}`
    + ` · build ${String(body.build ?? 'unknown').slice(0, 12)}`
    + ` · booted ${String(body.booted ?? 'unreported').slice(0, 12)}`;
});

/**
 * **Which server is running** (issue #8, F1). `build` is what `x-build`
 * says, and a surface upload moves it without restarting anything — so
 * after one of those, `build` naming the pushed commit means only that the
 * pushed *page* is being served. `booted` is the process's own commit,
 * which no upload can touch: CI asserts it becomes the pushed commit after
 * a full deploy, and that it has not moved after a surface-only one. The
 * deploy this exists for is design/DECISIONS.md:6907 — new page, old
 * engine, x-build swearing to the new commit, a real applicant stuck.
 */
if (bootedWanted !== null) {
  await check('the commit the host booted with (issue #8)', async () => {
    const got = health?.booted ?? null;
    expect(health !== null, 'no /healthz body to read it from');
    if (bootedWanted === 'same') {
      const was = before?.booted ?? null;
      expect(before !== null, 'no --before to compare against');
      expect(got === was, `booted ${got ?? 'unreported'}, was ${was ?? 'unreported'}`
        + ' — a surface upload restarted the host, or a deploy landed under it');
      return `unchanged at ${String(got ?? 'unreported').slice(0, 12)} — the page moved, the server did not`;
    }
    expect(typeof got === 'string' && got.length >= 7,
      'the host reports no booted commit — it is running an artifact from before issue #8');
    expect(got === bootedWanted || bootedWanted.startsWith(got) || got.startsWith(bootedWanted),
      `booted ${got}, expected ${bootedWanted} — the deploy did not land`);
    return `${String(got).slice(0, 12)} — the pushed engine is the one answering`;
  });
}

/**
 * **The store and the counts, against what was there before** (issue #8,
 * F5). The health check above accepts either store, which is right for a
 * script anybody may point anywhere and wrong for a deploy: docs.vote has
 * served from Postgres since 2026-08-20 (OPERATING §7), and a deploy that
 * came up on `file` would answer every check here perfectly while serving
 * an empty disk. So CI names the store it expects, and where it has a
 * pre-deploy reading the three numbers are compared with it: the store the
 * same, the documents no fewer, the quarantined no more. Absolutes are no
 * use for the last two — production carries three quarantined logs today
 * (Q1322), so `=== 0` would redden every deploy, and only the *change*
 * across this deploy is this deploy's business.
 */
if (storeWanted !== null || before !== null) {
  await check('the store and the counts across the deploy (issue #8)', async () => {
    expect(health !== null, 'no /healthz body to read them from');
    const notes = [];
    if (storeWanted !== null) {
      expect(health.store === storeWanted, `store ${health.store}, expected ${storeWanted}`);
      notes.push(`store ${health.store} as asked`);
    }
    if (before !== null) {
      if (typeof before.store === 'string') {
        expect(health.store === before.store,
          `store was ${before.store} and is ${health.store} — this deploy changed the store`);
        notes.push(`store unchanged (${health.store})`);
      }
      if (typeof before.documents === 'number') {
        expect(health.documents >= before.documents,
          `${health.documents} documents, was ${before.documents} — documents are missing`);
        notes.push(`${health.documents} documents, was ${before.documents}`);
      }
      if (typeof before.documentsQuarantined === 'number') {
        expect(health.documentsQuarantined <= before.documentsQuarantined,
          `${health.documentsQuarantined} quarantined, was ${before.documentsQuarantined}`
          + ' — this deploy could not replay a document it used to serve');
        notes.push(`${health.documentsQuarantined} quarantined, was ${before.documentsQuarantined}`);
      }
    }
    expect(notes.length > 0, 'nothing to compare: the --before file carried none of the three');
    return notes.join(' · ');
  });
}

await check('security headers (defects 2/9)', async () => {
  const h = (await get('/')).headers;
  expect(h.get('x-content-type-options') === 'nosniff', 'no nosniff');
  expect(h.get('referrer-policy') === 'no-referrer',
    `referrer-policy ${h.get('referrer-policy')}`);
  const csp = h.get('content-security-policy') ?? '';
  for (const d of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'none'"]) {
    expect(csp.includes(d), `CSP missing ${d}`);
  }
  return 'nosniff · no-referrer · CSP';
});

// HSTS and the cookie's Secure flag hang off one condition (httpsOn, an
// https baseUrl), so this check proves the cookie too — which is worth
// having, since an HttpOnly cookie is only issued behind a real token.
await check('HSTS a year, includeSubDomains', async () => {
  const hsts = (await get('/')).headers.get('strict-transport-security') ?? '';
  const age = /max-age=(\d+)/.exec(hsts);
  expect(age !== null, `absent (got ${JSON.stringify(hsts)})`);
  expect(Number(age[1]) >= 31536000, `max-age ${age[1]} < 31536000`);
  expect(hsts.includes('includeSubDomains'), 'no includeSubDomains');
  return hsts;
});

await check('http is redirected, never served', async () => {
  const r = await fetch(base.replace(/^https:/, 'http:') + '/', { redirect: 'manual' });
  expect(r.status >= 300 && r.status < 400, `status ${r.status} — plain http answered`);
  const loc = r.headers.get('location') ?? '';
  expect(loc.startsWith('https://'), `location ${loc}`);
  return `${r.status} → https`;
});

await check('/api/dev/outbox is not in the artifact (437)', async () => {
  const r = await get('/api/dev/outbox');
  expect(r.status === 404, `status ${r.status} — DEV label survived the build`);
  return '404';
});

// the error log's tail rides the same label (Q1330): the file is read on
// the host with `draft-tools errors`, never over the wire in production
await check('/api/dev/errors is not in the artifact (Q1330)', async () => {
  const r = await get('/api/dev/errors');
  expect(r.status === 404, `status ${r.status} — the error log is reachable`);
  return '404';
});

// …and the route the *page* reports to is the opposite case: a production
// route (plan stage 5b), so the check is that it is **there**. An empty body
// is a 400 and writes no line, so asking costs the live log nothing — and a
// 404 here would mean the surface has been reporting into a hole.
await check('POST /api/page-error is in the artifact (stage 5b)', async () => {
  const r = await fetch(base + '/api/page-error', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{}' });
  expect(r.status === 400 || r.status === 429,
    `status ${r.status} — the page has nowhere to report its own errors`);
  return String(r.status);
});

// **Asked with each route's real method** (Q674). A 404 for a GET on a
// POST-only route proves nothing at all — it is what a *present* route
// answers — so the ladder and the seat switch are asked the way they would
// actually be used. Between them they can build documents and mint a cookie
// for any seat, so their absence is worth checking on the live host and not
// only in the build.
await check('the phase ladder is not in the artifact (Q674)', async () => {
  const posts = await Promise.all(['/api/dev/ladder', '/api/dev/seat'].map((p) =>
    fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: '{}' })));
  const ladderGet = await get('/api/dev/ladder');
  for (const r of [...posts, ladderGet]) {
    expect(r.status === 404, `${r.url} answered ${r.status} — the ladder is reachable`);
  }
  return '404 on POST ladder · POST seat · GET ladder';
});

// The one dev-shaped route that *does* ship (Q1310): the bot outbox, which
// serves only mail to bots.docs.vote and only to the bearer of
// DRAFT_BOT_KEY. Without the key set it is an unknown path; with it, a
// request without the key is refused. Either way, never 200 to a stranger.
// the pause and resume ride the same key (Q1345): a stranger's POST is an
// unknown path without the key on the host, 401 with it — never a pause
await check('the pause and the surface reload are closed to a stranger (Q1345, Q1347)', async () => {
  const rs = await Promise.all(['/api/admin/pause', '/api/admin/resume', '/api/admin/surface?sha=abcdef0'].map((p) =>
    fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json',
      authorization: 'Bearer not-the-key' }, body: '{}' })));
  for (const r of rs) {
    expect(r.status === 401 || r.status === 404, `${r.url} answered ${r.status} — a stranger can pause the host`);
  }
  return rs[0].status === 404 ? '404 — no DRAFT_BOT_KEY on this host' : '401 on pause · 401 on resume';
});

await check('the bot outbox is closed to a stranger (Q1310)', async () => {
  const bare = await get('/api/bots/outbox');
  const wrong = await get('/api/bots/outbox', { headers: { authorization: 'Bearer not-the-key' } });
  for (const r of [bare, wrong]) {
    expect(r.status === 401 || r.status === 404,
      `status ${r.status} — the bot outbox answered a stranger`);
  }
  return bare.status === 404 ? '404 — no DRAFT_BOT_KEY on this host'
    : `401 without the key · ${wrong.status} with a wrong one`;
});

await check('api responses are never cached (finding 10)', async () => {
  const r = await get('/api/dev/outbox');
  expect((r.headers.get('cache-control') ?? '') === 'no-store',
    `cache-control ${r.headers.get('cache-control')}`);
  return 'no-store';
});

await check('design assets serve, design notes do not', async () => {
  const js = await get('/setup.js');
  expect(js.status === 200, `/setup.js status ${js.status}`);
  expect((js.headers.get('content-type') ?? '').includes('javascript'),
    `/setup.js content-type ${js.headers.get('content-type')}`);
  for (const p of ['/design/STYLE.md', '/design/DECISIONS.md',
                   '/design/tools/session-probe.js', '/design/reference/system.css',
                   '/design/reference/session-view.html', '/design/../SPEC.md']) {
    const r = await get(p);
    expect(r.status === 404, `${p} status ${r.status}`);
  }
  return 'assets 200 · notes 404';
});

// **The document's face is served** (Q1402): system.css asks for
// `fonts/CharisSIL-Regular.woff2` relative to itself, so it resolves to
// /fonts/… at the root and /d/fonts/… under a document. A host that refused
// the folder would fall back to Georgia and say nothing, so one face is
// fetched at both and must answer as a font; the notes stay 404 beside it.
await check('the document\'s face serves from design/fonts (Q1402)', async () => {
  for (const p of ['/fonts/CharisSIL-Regular.woff2', '/design/fonts/CharisSIL-Regular.woff2']) {
    const r = await get(p);
    expect(r.status === 200, `${p} status ${r.status}`);
    expect((r.headers.get('content-type') ?? '') === 'font/woff2',
      `${p} content-type ${r.headers.get('content-type')}`);
    const bytes = new Uint8Array(await r.arrayBuffer());
    expect(bytes.length > 10000 && String.fromCharCode(...bytes.subarray(0, 4)) === 'wOF2',
      `${p} is not a woff2 (${bytes.length} bytes)`);
  }
  for (const p of ['/design/fonts/deeper/x.woff2', '/fonts/x.js', '/design/fonts/x.js']) {
    expect((await get(p)).status === 404, `${p} answered`);
  }
  return 'woff2 200 at / and /design · folder locked';
});

// The explainer served here until the approval threshold left the surface
// (Q1362 (b), 2026-09-15). A live host still answering it would be serving
// last release's design, so the check is kept and inverted.
await check('the retired threshold explainer is gone from /pairwise (Q1362)', async () => {
  for (const p of ['/pairwise', '/pairwise.html']) {
    const r = await get(p);
    expect(r.status === 404, `${p} status ${r.status}`);
  }
  return '404';
});

await check('an unknown document 404s in json', async () => {
  const r = await get('/d/no-such-document-' + Date.now().toString(36));
  expect(r.status === 404, `status ${r.status}`);
  const body = await r.json();
  expect(typeof body.error === 'string', 'no json error');
  expect(!body.error.includes('Error:') && !body.error.includes('/'),
    `error leaks internals: ${body.error}`);
  return `404 ${JSON.stringify(body.error)}`;
});

await check('a cross-origin auth POST is refused (finding 13)', async () => {
  const r = await get('/auth/login', {
    method: 'POST',
    headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
    body: '{"token":"x"}',
  });
  expect(r.status === 403, `status ${r.status} — cross-site POST not refused`);
  return '403';
});

if (limits) {
  await check('the rate limiter is per real IP, unspoofable (defect 3)', async () => {
    let limited = 0;
    for (let i = 0; i < 130 && limited === 0; i++) {
      const r = await get('/api/docs/pending', {
        method: 'POST',
        headers: { 'content-type': 'application/json',
                   'x-forwarded-for': `10.0.0.${i % 250}` },
        body: JSON.stringify({ pendingId: 'verify-deploy-probe', text: '' }),
      });
      if (r.status === 429) limited = i + 1;
    }
    expect(limited > 0, 'never limited — spoofed x-forwarded-for evaded the bucket');
    return `429 after ${limited} spoofed-IP requests`;
  });
}

const pad = Math.max(...results.map((r) => r.name.length));
for (const r of results) {
  console.log(`${r.ok ? '  ok  ' : ' FAIL '} ${r.name.padEnd(pad)}  ${r.note}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed against ${base}`);
process.exit(failed === 0 ? 0 : 1);
