/**
 * The rail follows the text as each face lands (2026-09-21, the convention
 * plan's Stage 0b: the session-probe's 43 rail differences, read).
 *
 * The document's face is `font-display: swap` (Q1402), so the page lays
 * itself out in the fallback and the text reflows when Charis arrives —
 * 24.6px at the first charter clause of the Hollow Oak fixture — and every
 * absolutely placed thing beside the text is stale until something re-lays
 * it. session.js handed itself a resize on the font set's `loadingdone`,
 * **which fires once, when the last pending face is in**: Regular landing
 * moves every clause, and the rail stood a line off its clauses for as long
 * as the slowest face took. That gap is the session-probe's flake (every
 * charter entry 24–25px off, the clauses agreeing, files byte-identical on
 * both sides — seen 2026-09-16 and 2026-09-21), and on a slow connection it
 * is what a member sees.
 *
 * This walk holds the Bold face back, watches the first charter clause and
 * the rail entry beside it, and asserts the entry's **target** (`style.top`,
 * never its rect — the 220ms glide is the entry arriving, not the entry
 * stale) is re-laid within `SLACK` of the clause reaching its final place.
 * `node design/tools/rail-font-walk.mjs`; exit 1 on a failure. It serves
 * `design/` itself, as picture-walk does, and needs no server.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DESIGN = join(resolve(fileURLToPath(new URL('../..', import.meta.url))), 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.woff2': 'font/woff2' };
const HOLD = 700;    // how long the slow face is held back
const SLACK = 200;   // how long the rail may stand stale once the text has moved

const serve = () => new Promise((ok) => {
  const s = createServer(async (req, res) => {
    const name = decodeURIComponent(req.url.split('?')[0]);
    try {
      const body = await readFile(join(DESIGN, name));
      if (/CharisSIL-Bold\.woff2$/.test(name)) await new Promise((r) => setTimeout(r, HOLD));
      res.writeHead(200, { 'content-type': TYPES[extname(name)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404).end('no'); }
  });
  s.listen(0, '127.0.0.1', () => ok([s, s.address().port]));
});

const [srv, port] = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const fails = [];
const check = (name, ok, detail) => {
  console.log('   ' + (ok ? '·' : '✗') + ' ' + name + (detail ? ' — ' + detail : ''));
  if (!ok) fails.push(name + (detail ? ' (' + detail + ')' : ''));
};

// every change of the clause's place and of the entry's target, timed
await page.addInitScript(() => {
  const t0 = performance.now();
  window.__railFont = [];
  let last = '';
  const tick = () => {
    const a = document.querySelector('#doc .anch');
    // the first charter entry: the constitution's own entries stand above it
    const q = a && [...document.querySelectorAll('.qitem')]
      .find((x) => x.style.top && parseFloat(x.style.top) > 0 &&
        x.getBoundingClientRect().top + scrollY > a.getBoundingClientRect().top + scrollY - 60);
    if (a && q) {
      const at = Math.round((a.getBoundingClientRect().top + scrollY) * 10) / 10;
      const faces = [...document.fonts].filter((f) => f.status === 'loaded').length;
      const s = at + '|' + q.style.top + '|' + faces;
      if (s !== last) { window.__railFont.push({ ms: Math.round(performance.now() - t0), anch: at, target: parseFloat(q.style.top), faces }); last = s; }
    }
    setTimeout(tick, 4);
  };
  tick();
});

console.log('\nrail-font-walk — the Bold face held back ' + HOLD + 'ms');
await page.goto('http://127.0.0.1:' + port + '/session-view.html?fixture=session', { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);
const log = await page.evaluate(() => window.__railFont);

const end = log[log.length - 1];
check('the fixture drew a charter clause with a rail entry beside it', !!end, end ? '' : 'nothing sampled');
if (end) {
  // when the clause first stood where it ends, and when the entry's target did
  const textAt = log.find((s) => s.anch === end.anch).ms;
  const railAt = log.find((s) => s.anch === end.anch && s.target === end.target).ms;
  // the held face is the last to land; if it was in before the text settled
  // there was no gap to stand stale in, and this walk measured nothing
  const lastFaceAt = log.find((s) => s.faces === end.faces).ms;
  check('the held face landed well after the text had settled (else this walk measured nothing)',
    lastFaceAt - textAt >= HOLD / 2, 'text at ' + textAt + 'ms, last face at ' + lastFaceAt + 'ms');
  check('the rail is re-laid within ' + SLACK + 'ms of the text moving',
    railAt - textAt <= SLACK, 'text at ' + textAt + 'ms, rail at ' + railAt + 'ms — stale for ' + (railAt - textAt) + 'ms');
}
check('no page errors', errors.length === 0, errors.slice(0, 3).join(' / '));
console.log('\n' + (fails.length ? 'FAIL\n  ' + fails.join('\n  ') : 'all good'));
await browser.close();
srv.close();
if (fails.length) process.exit(1);
