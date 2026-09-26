/**
 * **A card that asks nothing closes by a tap outside it, on a phone**
 * (Q1541 stage 2; design/redesign/BUILD.md stage 2: *the 390 exit measured
 * first*). 1541.8 (a) took the close-only OK off every card that asks
 * nothing — its tab, a click outside and Escape close it — and on a phone the
 * click outside is a finger, where Chromium hit-tests the click after the
 * pointerup (the task sheet's gotcha, 2026-09-24). So before the OK could go,
 * this proves the finger's way out: at 390×844 on the session fixture, touch
 * on, each read-only card of stage 2 is opened from its tab, a tap is put on
 * the page outside it — on text that is no control, the way a reader taps
 * away — and the walk asserts
 *
 *   1. the card closed, and no other card opened in its place;
 *   2. nothing beneath the tap was pressed: the point held no control, no
 *      element under it took focus as a control does, and no command left
 *      the page;
 *   3. the page threw nothing.
 *
 *   npm run tap-outside-walk
 *
 * The cards are stage 2's with no row on the fixture: the three grants and
 * the two gates accepted, 🍾 settled, and a park — owed on the fixture, so
 * its OK is pressed first to reach the state where it asks nothing.
 *
 * Exit 1 on any failure; every line printed is an assertion.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, sep, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserFor } from '../../scripts/lib/walk.mjs';

const DESIGN = join(resolve(fileURLToPath(new URL('../..', import.meta.url))), 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const SIZE = { width: 390, height: 844 };
const FIXTURE = '/session-view.html?fixture=session&band=1';
const BAND = ['grant-pen', 'grant-shield', 'grant-voice', 'canpropose', 'canjudge', 'begin'];
const CHARTER = ['park-accounts'];
// a tab behind a closed pile is reached through the pile's front card, whose
// strip holds it (the Founded line's grants; 🍾's pile on the Proposals clause)
const HOST = { 'grant-shield': 'grant-pen', 'grant-voice': 'grant-pen', canpropose: 'begin', canjudge: 'begin' };

function serveDesign() {
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = normalize(join(DESIGN, path === '/' ? '/session-view.html' : path));
      if (!file.startsWith(DESIGN + sep) && file !== DESIGN) { res.writeHead(403); return res.end(); }
      const s = await stat(file);
      const body = await readFile(s.isDirectory() ? join(file, 'index.html') : file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

const fails = [];
const say = (ok, line) => { console.log((ok ? '  ok   ' : '  FAIL ') + line); if (!ok) fails.push(line); };

const server = await serveDesign();
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await browserFor().launch();
const ctx = await browser.newContext({ viewport: SIZE, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const posts = [];
page.on('request', (r) => { if (r.method() !== 'GET') posts.push(r.method() + ' ' + r.url()); });
await page.goto(base + FIXTURE);
await page.waitForSelector('#rail .qitem', { timeout: 20000, state: 'attached' });
await page.waitForTimeout(600);
// the fixture folds the Rules: unfold every section, as card-audit's band walk does
for (let i = 0; i < 8; i++) {
  const n = await page.evaluate(() => {
    const t = [...document.querySelectorAll('#band .sectoggle')].find((b) => b.getAttribute('aria-expanded') === 'false');
    if (!t) return 0;
    t.click(); return 1;
  });
  if (!n) break;
  await page.waitForTimeout(300);
}

/** the card open on the page for `k`, by either surface's hook */
const openSel = (k) => '.setupcard[data-setupcard="' + k + '"], .sugg[data-card="' + k + '"]';

/** open `k` from its own tab in the gutter, wherever it stands */
const openFromTab = async (k) => (await openTab(k)) || (!!HOST[k] && (await openTab(HOST[k])) && openTab(k, true));
const openTab = (k, inStrip) => page.evaluate(async ([k, inStrip]) => {
  const q = String(k).replace(/["\\]/g, '\\$&');
  const t = inStrip ? document.querySelector('.setupcard .chipcol [data-tab="' + q + '"]')
    : document.querySelector('#band .cpara:not(.open) [data-tab="' + q + '"], #titlepara [data-tab="' + q + '"], #charter [data-anchor="' + q + '"]');
  if (!t) return false;
  t.scrollIntoView({ block: 'center' });
  await new Promise((r) => setTimeout(r, 200));
  t.click();
  await new Promise((r) => setTimeout(r, 1200));
  return !!document.querySelector('.setupcard[data-setupcard="' + q + '"], .sugg[data-card="' + q + '"]');
}, [k, !!inStrip]);

/**
 * **A point outside the card that holds no control**: down the column's
 * middle, the first spot on the glass whose element is document text — not
 * inside the card, not a control or a tab, not the topbar, the task sheet or
 * a drawer — above the card first, then below it.
 */
const pointOutside = (k) => page.evaluate((k) => {
  const q = String(k).replace(/["\\]/g, '\\$&');
  const card = document.querySelector('.setupcard[data-setupcard="' + q + '"], .sugg[data-card="' + q + '"]');
  if (!card) return null;
  const cr = card.getBoundingClientRect();
  const CONTROL = 'h1, h2, h3, h4, .pilehead, a, button, input, textarea, select, label, [role=button], [contenteditable="true"], [contenteditable="plaintext-only"], .chipcol, .achip, [data-tab], [data-card], [data-anchor]';
  const AWAY = '.navbar, .layout > .queue, .layout > .toc, .sheetbar, .alpha, .devbar, #ridetab, .editdoor';
  const x = Math.round(cr.left + cr.width / 2);
  const ys = [];
  for (let y = Math.floor(cr.top) - 12; y > 80; y -= 14) ys.push(y);
  for (let y = Math.ceil(cr.bottom) + 12; y < innerHeight - 80; y += 14) ys.push(y);
  for (const y of ys) {
    const el = document.elementFromPoint(x, y);
    if (!el || card.contains(el) || el.closest(CONTROL) || el.closest(AWAY)) continue;
    if (!el.closest('#band, #charter, #doc, .doc')) continue;
    if (!(el.textContent || '').trim()) continue;
    return { x, y, el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).join('.') : '') };
  }
  return null;
}, k);

const openCards = () => page.evaluate(() => [...document.querySelectorAll('.setupcard[data-setupcard], .sugg.gshell[data-card], .sugg[data-card].quick-open, .sugg[data-card].sealed-open')]
  .map((c) => c.dataset.setupcard || c.dataset.card));

console.log('tap-outside-walk @ 390×844, touch · ' + FIXTURE);
for (const k of [...BAND, ...CHARTER]) {
  const opened = await openFromTab(k);
  say(opened, k + ': opens from its tab');
  if (!opened) continue;
  // a park is owed its OK on the fixture: pressed, it asks nothing and keeps no row
  if (CHARTER.includes(k)) {
    await page.evaluate((k) => { document.querySelector('.sugg[data-card="' + k + '"] [data-seen]')?.click(); }, k);
    await page.waitForTimeout(900);
    if (!(await page.$(openSel(k)))) { say(await openFromTab(k), k + ': reopens once seen'); }
  }
  const row = await page.evaluate((sel) => { const c = document.querySelector(sel); return c ? c.querySelectorAll('.commitrow button').length : -1; }, openSel(k));
  say(row === 0, k + ': asks nothing — no control in a row (' + row + ')');
  const pt = await pointOutside(k);
  say(!!pt, k + ': a point outside the card holding no control' + (pt ? ' — ' + pt.el + ' at ' + pt.x + ',' + pt.y : ''));
  if (!pt) continue;
  const before = posts.length;
  await page.touchscreen.tap(pt.x, pt.y);
  await page.waitForTimeout(1200);
  const still = await page.$(openSel(k));
  say(!still, k + ': the tap outside closes it');
  const others = (await openCards()).filter((c) => c !== k);
  say(others.length === 0, k + ': and opens nothing in its place' + (others.length ? ' — ' + others.join(', ') : ''));
  const focus = await page.evaluate(() => { const a = document.activeElement; return a && a !== document.body && a.matches('button, a, input, select, [role=button]') ? a.outerHTML.slice(0, 80) : null; });
  say(!focus, k + ': no control beneath took the tap' + (focus ? ' — ' + focus : ''));
  say(posts.length === before, k + ': no command left the page' + (posts.length > before ? ' — ' + posts.slice(before).join(', ') : ''));
  if (still) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
}
say(errors.length === 0, 'the page threw nothing' + (errors.length ? ' — ' + errors.join(' · ') : ''));

await browser.close();
server.close();
console.log(fails.length ? '\n✗ ' + fails.length + ' failed' : '\n✓ every read-only card closes by a tap outside it, and nothing beneath is pressed');
process.exit(fails.length ? 1 : 0);
