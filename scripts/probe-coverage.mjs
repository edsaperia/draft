/**
 * Which cards does the setup-probe actually open? (Q914 (9), 2026-08-26.)
 *
 * Three cards in five days turned out to have no probe coverage at all —
 * 🖼️ the picture (Q732, an emoji face at 7px for four days with every check
 * green), 🪪 Admissions (Q910, and it took thirteen steps down with it), 🛡️
 * the shield (Q914) — and each was found by somebody tripping over it rather
 * than by anything that looks. This is the thing that looks.
 *
 * **It measures opening, not naming.** A step's selector can name a card that
 * still exists and never reach it: that is precisely what Q910 was, where
 * `data-card="applications"` was present in the source the whole time and the card
 * was simply never born. So this runs the real `setup-probe.js` against the
 * live page and records every `data-setupcard` key that appears in the DOM
 * while it runs. A card is covered when the probe opened it. Nothing else
 * counts, and no selector is consulted.
 *
 * A card in ORDER that is never opened is a finding unless it is in EXEMPT
 * with a reason. Out-of-ORDER cards are reported for information: several
 * cannot be reached from the founding at all, and saying so is the point.
 *
 *   npm run probe-coverage
 *
 * Note --strict cannot replace this. A dead step needs a *miss*, and a card
 * nobody tries to open produces no miss; a grant blocks nothing in ORDER, so
 * the founding runs straight past an unacknowledged one. Q914 is exactly that
 * hole, and it is structural rather than a bug in the scenario.
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { readFile as read, stat as statP } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DESIGN = join(ROOT, 'design');
const VIEWPORT = { width: 1600, height: 1000 };

/** Cards in ORDER the probe is not expected to open, each with its reason. */
const EXEMPT = {};

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function serveDesign() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = normalize(join(DESIGN, path));
    if (!file.startsWith(DESIGN + sep) && file !== DESIGN) { res.writeHead(403); return res.end(); }
    try {
      const s = await statP(file);
      const target = s.isDirectory() ? join(file, 'index.html') : file;
      res.writeHead(200, {
        'content-type': TYPES[extname(target)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(await read(target));
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

/** ORDER and the card catalogue, read the way spec-check reads them. */
function pageMap() {
  const s = readFileSync(join(ROOT, 'design/session-view.html')).toString('utf8');
  const m = s.match(/const ORDER = \[([\s\S]*?)\]/);
  if (!m) throw new Error('ORDER not found in session-view.html');
  const ORDER = [...m[1].matchAll(/'([a-z-]+)'/g)].map((x) => x[1]);
  const titles = new Map();
  for (const c of s.matchAll(/\{ k: '([a-z-]+)', g: '([^']*)', t: '([^']*)'/g)) titles.set(c[1], `${c[2]} ${c[3]}`);
  const cards = [...new Set([...s.matchAll(/\{ k: '([a-z-]+)'/g)].map((x) => x[1]))];
  return { ORDER, cards, titles };
}

async function main() {
  const { ORDER, cards, titles } = pageMap();
  const server = await serveDesign();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  let opened = [];
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(base + '/session-view.html', { waitUntil: 'load' });
    await page.waitForFunction(() => !!document.querySelector('#rail .qitem'), null, { timeout: 20_000 });
    await page.evaluate(() => { window.scrollTo(0, 0); });
    await page.waitForTimeout(250);
    // record every card key that appears while the probe drives; the probe
    // runs synchronously, so records are drained explicitly at the end too
    await page.evaluate(() => {
      window.__opened = new Set();
      const take = (nodes) => {
        for (const n of nodes) {
          if (!n || n.nodeType !== 1) continue;
          if (n.dataset && n.dataset.setupcard) window.__opened.add(n.dataset.setupcard);
          if (n.querySelectorAll) {
            for (const e of n.querySelectorAll('[data-setupcard]')) window.__opened.add(e.dataset.setupcard);
          }
        }
      };
      take(document.querySelectorAll('[data-setupcard]'));
      window.__obs = new MutationObserver((recs) => { for (const r of recs) take(r.addedNodes); });
      window.__obs.observe(document.documentElement, { childList: true, subtree: true });
      window.__drain = () => { for (const r of window.__obs.takeRecords()) take(r.addedNodes); return [...window.__opened]; };
    });
    await page.addScriptTag({ url: base + '/tools/setup-probe.js' });
    await page.waitForFunction(() => !!window.__probeReport, null, { timeout: 60_000 });
    opened = await page.evaluate(() => window.__drain());
    await page.close();
    await context.close();
  } finally {
    await browser.close();
    server.close();
  }

  const seen = new Set(opened);
  const label = (k) => `${k}${titles.has(k) ? `  ${titles.get(k)}` : ''}`;
  const missing = ORDER.filter((k) => !seen.has(k) && !(k in EXEMPT));
  const exempted = ORDER.filter((k) => !seen.has(k) && k in EXEMPT);
  const outside = cards.filter((k) => !ORDER.includes(k));

  console.log(`setup-probe coverage — ${seen.size} cards opened across both scenarios\n`);
  console.log(`in ORDER (${ORDER.length}):`);
  for (const k of ORDER) console.log(`  ${seen.has(k) ? '✓' : k in EXEMPT ? '–' : '✗'} ${label(k)}`);
  if (exempted.length) {
    console.log(`\nexempt (${exempted.length}):`);
    for (const k of exempted) console.log(`  – ${label(k)} — ${EXEMPT[k]}`);
  }
  console.log(`\noutside ORDER (${outside.length}), for information:`);
  for (const k of outside) console.log(`  ${seen.has(k) ? '✓' : '·'} ${label(k)}`);
  for (const e of errors) console.log(`  page error: ${e}`);

  if (missing.length) {
    console.log(`\n${missing.length} card(s) in ORDER the probe never opens:`);
    for (const k of missing) console.log(`  ${label(k)}`);
    console.log('\nEither drive it in setup-probe.js, or add it to EXEMPT with the reason.');
  }
  const failed = missing.length > 0 || errors.length > 0;
  console.log(`\n${failed ? 'FAILED' : 'ok'}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
