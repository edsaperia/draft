/**
 * The design probes, headless (Q504(b), 2026-08-21).
 *
 * A probe nobody runs rots silently: the setup reference had drifted 200
 * diffs from HEAD before the merge noticed, and nine of the setup-probe's
 * founding steps had been missing their targets on both sides for days.
 * This runner makes both probes a CI step: it serves design/ on a free
 * port, opens a headless Chromium at ONE viewport (1600×1000 — both sides
 * of every comparison are measured at this size, which is the probes' own
 * precondition), walks the frozen reference and then the live page through
 * each probe, and fails on any diff the probe itself does not allow.
 *
 *   npm run probe            # both probes; dead steps are warnings
 *   npm run probe -- --strict  # dead steps (a step whose target is
 *                              # missing on the live side) fail too
 *
 * The probes stay authoritative about what they compare: this file never
 * interprets a diff, it only reads each probe's own report
 * (window.__probeReport) and its stored run (localStorage). Each probe gets
 * a fresh browser context, so the two sides share an origin and nothing
 * else. The one known flake — the *Founded at [time]* line is stamped from
 * the load-time clock, so a minute boundary between the two sides changes
 * every band hash from ⏩ onward — is retried once, and said so.
 *
 * --strict IS on in CI, and has been since 2026-08-21 (ci.yml's `probe`
 * job). The job was `continue-on-error: true` alongside it — advisory until
 * it had run green for a week — so it went red, the run read green, and
 * nobody looked: it swallowed a real failure on every push from 2026-08-25
 * onward, first 136 diffs (the reference stale after the plan-queue batch),
 * then the thirteen dead steps of Q910. **Ed promoted it on 2026-08-26
 * (Q910 (b)) and the job gates now.**
 *
 * This paragraph has been wrong twice — it said --strict was off, which is
 * how Q910 came to be written against a premise four days out of date, and
 * then it said the job was advisory for a day after it stopped being. Both
 * facts live in `.github/workflows/ci.yml` and neither lives here: **check
 * ci.yml, not this comment.**
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DESIGN = join(ROOT, 'design');
const VIEWPORT = { width: 1600, height: 1000 };
const STRICT = process.argv.includes('--strict');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

/** A static file server over design/, no traversal, no caching. */
function serveDesign() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = normalize(join(DESIGN, path));
    if (!file.startsWith(DESIGN + sep) && file !== DESIGN) { res.writeHead(403); return res.end(); }
    try {
      const s = await stat(file);
      const target = s.isDirectory() ? join(file, 'index.html') : file;
      const body = await readFile(target);
      res.writeHead(200, {
        'content-type': TYPES[extname(target)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404); res.end();
    }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

/**
 * Each probe: the URLs of its two sides (ref first — the probe compares only
 * once both runs exist, so the live run is the one whose report has the
 * verdict), how to read the verdict off the report, and how to list the
 * steps that missed their targets on the live side.
 */
const PROBES = [
  {
    name: 'session-probe',
    script: '/tools/session-probe.js',
    ref: '/reference/session-view.html?fixture=session',
    live: '/session-view.html?fixture=session',
    // the fixture session has rendered when the Hollow Oak cards are on the page
    ready: () => !!(window.SESSION && window.SESSION.SUGGS.length && document.querySelector('.qitem')),
    verdict: (r) => ({
      ok: r.ok && r.compare && r.compare.status === 'IDENTICAL',
      line: r.ok ? `${r.compare.status} — counts ${JSON.stringify(r.summary.counts)}` : `probe threw: ${r.error}`,
      diffs: (r.compare && r.compare.diffs) || [],
      allowed: [],
    }),
    // a card that threw on toggle; one that simply did not open is by design
    // (the salience diagonal is served only to an empty queue) and equal on
    // both sides, so it is not a dead step
    dead: (r) => Object.entries((r.summary && r.summary.cards) || {})
      .filter(([, c]) => c.err)
      .map(([id, c]) => `${id}: ${c.err}`),
    bandOnly: () => false,
  },
  {
    name: 'setup-probe',
    script: '/tools/setup-probe.js',
    ref: '/reference/session-view.html',
    live: '/session-view.html',
    // the birth has rendered when the rail holds its one task, 🪶 Title
    ready: () => !!document.querySelector('#rail .qitem'),
    verdict: (r) => ({
      ok: r.compared && r.diffs.length === 0,
      line: r.compared ? `${r.steps} steps, ${r.diffs.length} diffs, ${r.allowed.length} allowed` : 'not compared',
      diffs: r.diffs,
      allowed: r.allowed,
    }),
    // the stored live run: every step whose driver returned a miss
    dead: (r, run) => {
      const out = [];
      for (const [sc, steps] of Object.entries(run || {})) {
        for (const [st, snap] of steps) {
          if (snap && snap.err) out.push(`${sc}:${st}: ${snap.err}`);
        }
      }
      return out;
    },
    bandOnly: (diffs) => diffs.length > 0 && diffs.every((d) => /^[^ ]+:band — /.test(d)),
  },
];

async function runSide(context, base, probe, side) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base + probe[side], { waitUntil: 'load' });
  await page.waitForFunction(probe.ready, null, { timeout: 20_000 });
  // the probes' precondition: both pages from scroll 0, one settled frame
  await page.evaluate(() => { window.scrollTo(0, 0); });
  await page.waitForTimeout(250);
  await page.addScriptTag({ url: base + probe.script });
  await page.waitForFunction(() => !!window.__probeReport, null, { timeout: 60_000 });
  const report = await page.evaluate(() => window.__probeReport);
  const run = side === 'live'
    ? await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), 'setup-probe:live')
    : null;
  await page.close();
  return { report, run, errors };
}

async function runProbe(browser, base, probe) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  try {
    const ref = await runSide(context, base, probe, 'ref');
    const live = await runSide(context, base, probe, 'live');
    return { ref, live };
  } finally {
    await context.close();
  }
}

async function main() {
  const server = await serveDesign();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  let failed = false;
  const t0 = Date.now();
  try {
    for (const probe of PROBES) {
      let { ref, live } = await runProbe(browser, base, probe);
      let v = probe.verdict(live.report);
      if (!v.ok && probe.bandOnly(v.diffs)) {
        console.log(`${probe.name}: only band hashes differ — the Founded-at minute boundary; retrying once`);
        ({ ref, live } = await runProbe(browser, base, probe));
        v = probe.verdict(live.report);
      }
      const dead = probe.dead(live.report, live.run);
      console.log(`${probe.name} @ ${VIEWPORT.width}×${VIEWPORT.height}: ${v.line}`);
      for (const d of v.allowed) console.log(`  allowed: ${d}`);
      for (const d of v.diffs) console.log(`  DIFF: ${d}`);
      for (const e of [...ref.errors, ...live.errors]) console.log(`  page error: ${e}`);
      if (dead.length) {
        console.log(`  ${STRICT ? 'DEAD' : 'warning — dead'} steps on the live side (${dead.length}; Q910):`);
        for (const d of dead) console.log(`    ${d}`);
      }
      if (!v.ok || ref.errors.length || live.errors.length || (STRICT && dead.length)) failed = true;
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`${failed ? 'FAILED' : 'ok'} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
