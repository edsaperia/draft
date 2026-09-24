/**
 * edit-shots.mjs — Q1541 stage 1: the editing card (a draft), a two-site
 * patch in the making and a gap site, on the session fixture in edit mode.
 * Throwaway; borrows card-audit's in-page half from inventory-audit.mjs.
 *
 *   node design/proposal/tools/edit-shots.mjs --width=1600 --height=1000
 */
import { createServer } from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DESIGN = join(resolve(HERE, '..', '..', '..'), 'design');
const SHOTS = join(DESIGN, 'proposal', 'shots', 'current');
const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith('--' + n + '=')); return h ? h.split('=')[1] : d; };
const W = +arg('width', 1600); const H = +arg('height', 1000);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const src = await readFile(join(HERE, 'inventory-audit.mjs'), 'utf8');
const a = src.indexOf('const IN_PAGE = () => {'); const b = src.indexOf('\n};', a);
const IN_PAGE_SRC = src.slice(a + 'const IN_PAGE = '.length, b + 3);

const server = createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const f = normalize(join(DESIGN, p === '/' ? '/session-view.html' : p));
    if (!f.startsWith(DESIGN + sep)) { res.writeHead(403); return res.end(); }
    const st = await stat(f);
    res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(await readFile(st.isDirectory() ? join(f, 'index.html') : f));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: 'en-GB', timezoneId: 'Europe/London' });
await ctx.addInitScript({ content: '(' + IN_PAGE_SRC.replace(/;\s*$/, '') + ')();' });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
const wait = (ms) => page.waitForTimeout(ms);
const cards = [];

async function open() {
  await page.goto(base + '/session-view.html?fixture=session');
  await page.waitForFunction(() => !!(window.SESSION && window.SESSION.SUGGS.length && document.querySelector('.qitem')), null, { timeout: 20000 });
  await page.evaluate(() => { window.scrollTo(0, 0); window.SESSION.smoothScrollBy = (dy, done) => { window.scrollBy(0, dy); if (done) done(); }; });
  await wait(400);
  await page.evaluate(() => { const d = document.querySelector('#editdoor [data-act="edit-door"]') || document.querySelector('#ridetab .achip[data-tab="text"]'); if (d) d.click(); });
  await wait(700);
}
/** put a real caret at the end of the nth plain clause and type */
async function typeAt(n, text, { enter = false } = {}) {
  const pt = await page.evaluate((n) => {
    const paras = [...document.querySelectorAll('#charter [contenteditable="true"] .anch, #charter .anch')].filter((p) => p.offsetHeight > 0 && !p.closest('.sugg'));
    const p = paras[n]; if (!p) return null;
    p.scrollIntoView({ block: 'center' });
    const r = p.getBoundingClientRect();
    return [r.right - 4, r.bottom - 6];
  }, n);
  if (!pt) return false;
  await wait(200);
  await page.mouse.click(pt[0], pt[1]);
  await page.keyboard.press('End');
  if (enter) await page.keyboard.press('Enter');
  await page.keyboard.type(text, { delay: 20 });
  await wait(600);
  return true;
}
async function measureOpen(name, state) {
  const k = await page.evaluate(() => { const c = [...document.querySelectorAll('.sugg[data-card]')].pop(); return c ? c.dataset.card : null; });
  if (!k) { errors.push(state + ': no card open'); return; }
  const m = await page.evaluate((k) => window.__CA.measure('.sugg[data-card="' + k.replace(/"/g, '\\"') + '"]', k, null), k);
  if (!m) { errors.push(state + ': measure failed'); return; }
  m.walk = 'edit'; m.state = state; m.kindHint = name;
  const r = m.card.r;
  const file = name + '-' + state + '-' + W + '.png';
  const pw = await page.evaluate(() => document.documentElement.scrollWidth);
  const x = Math.max(0, r[0] - 64);
  await page.screenshot({ path: join(SHOTS, file), fullPage: true, clip: { x, y: Math.max(0, r[1] - 12), width: Math.min(pw - x, r[2] + (r[0] - x) + 12), height: Math.min(r[3] + 24, 3000) } });
  m.shot = file;
  // the proposal row as it stands over the draft
  const row = await page.evaluate(() => { const el = document.querySelector('[data-proposalrow]'); if (!el) return null; const r = el.getBoundingClientRect();
    return { text: window.__CA.txt(el), buttons: [...el.querySelectorAll('button')].map((b) => ({ t: window.CARDS ? window.CARDS.glyphTextOf(b) : b.textContent, title: b.title, disabled: b.disabled })), r: [r.left, r.top, r.width, r.height] }; });
  m.proposalRow = row;
  cards.push(m);
}

await open();
if (await typeAt(3, ' and more')) await measureOpen('editing', 'one-site');
await page.screenshot({ path: join(SHOTS, 'page-editing-one-site-' + W + '.png') });
if (await typeAt(6, ' also')) await measureOpen('editing', 'patch-second-site');
await page.screenshot({ path: join(SHOTS, 'page-editing-patch-' + W + '.png') });
await open();
if (await typeAt(4, 'A new clause.', { enter: true })) await measureOpen('editing', 'gap-site');

await writeFile(join(DESIGN, 'proposal', 'data', 'edit-' + W + '.json'), JSON.stringify({ viewport: { w: W, h: H }, cards, errors }, null, 1));
console.log(cards.length + ' edit cards · errors: ' + JSON.stringify(errors));
await browser.close(); server.close();
