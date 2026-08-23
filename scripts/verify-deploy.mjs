/**
 * Live-deploy verification (PRODUCTION.md stage 4, and again at stage 10).
 *
 * The boot smoke in CI proves the artifact serves; this proves the
 * *environment* does — the class of truth a source review cannot reach and
 * a localhost test cannot see: TLS, HSTS, the proxy's redirect, the dev
 * outbox's absence from a real deploy, the design tree's notes staying
 * unreachable. Everything here is a GET; nothing it does writes to a log
 * or mints a mail, so it is safe to run against production.
 *
 *   node scripts/verify-deploy.mjs https://staging.example.com
 *   node scripts/verify-deploy.mjs https://docs.vote --limits
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

const base = (process.argv[2] ?? '').replace(/\/$/, '');
const limits = process.argv.includes('--limits');
if (!/^https?:\/\//.test(base)) {
  console.error('usage: node scripts/verify-deploy.mjs <base-url> [--limits]');
  process.exit(2);
}

const results = [];
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
  return `store ${body.store} · ${body.documents} documents · build ${String(body.build ?? 'unknown').slice(0, 12)}`;
});

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
  for (const p of ['/design/setup.notes.md', '/design/session-view.notes.md',
                   '/design/tools/session-probe.js', '/design/reference/system.css',
                   '/design/reference/session-view.html', '/design/../SPEC.md']) {
    const r = await get(p);
    expect(r.status === 404, `${p} status ${r.status}`);
  }
  return 'assets 200 · notes 404';
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
