/**
 * The phone's task drawer: its spacing and its closing (Q1387, Q1388; Ed's
 * phone QA, 2026-09-12 and 2026-09-15).
 *
 *   npm run drawer-walk
 *
 * At 390×844 on the session fixture, the right-hand door open:
 *
 *   1. every two neighbouring entries are exactly `--s2` (8px) apart, in the
 *      drawer's *visual* order — the column sorts with flex `order`, so the
 *      DOM's last child can stand anywhere, and Q1387 was a `:last-child`
 *      margin rule taking the gap from under whichever entry was born last;
 *      the list is spaced by its `gap`, and no entry carries a margin;
 *   2. a tap on the drawer's own empty space — inside the panel, on no entry —
 *      closes it, by mouse and by touch (iOS reaches the page as a pointerup,
 *      the desktop as a click; both paths are driven);
 *   3. a drag on that same empty space does not close it: the pointer moved,
 *      so it was a scroll and not a tap;
 *   4. a tap on an entry still opens the entry's card and closes the drawer
 *      a beat later, as the first cut had it.
 *
 * Exit 1 on any failure; every line printed is an assertion.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, sep, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserFor } from '../../scripts/lib/walk.mjs';

const DESIGN = join(resolve(fileURLToPath(new URL('../..', import.meta.url))), 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain' };
const SIZE = { width: 390, height: 844 };
const FIXTURE = '/session-view.html?fixture=session&band=1';
const GAP = 8;   // --s2

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

/** the visible entries in drawer order, each with its box and margins */
const entries = (page) => page.evaluate(() => {
  const ul = document.querySelector('.layout > .queue ul');
  const all = [...ul.querySelectorAll('.qitem')];
  const shown = all.filter((el) => getComputedStyle(el).display !== 'none');
  shown.sort((a, b) => (+a.style.order || 0) - (+b.style.order || 0));
  const cs = getComputedStyle(ul);
  return {
    rowGap: cs.rowGap, display: cs.display,
    rows: shown.map((el) => {
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      return { id: el.dataset.q, top: r.top, bottom: r.bottom, left: r.left, right: r.right, mt: s.marginTop, mb: s.marginBottom, last: el === ul.lastElementChild };
    }),
  };
});
const drawer = (page) => page.evaluate(() => document.documentElement.getAttribute('data-drawer'));
const openRight = async (page) => {
  if (await drawer(page) !== 'right') await page.click('#drawerright');
  await page.waitForTimeout(250);
};
/** a point inside the panel that no entry covers: below the last entry, inside the panel's box */
const emptySpot = async (page) => {
  const q = await page.evaluate(() => { const r = document.querySelector('.layout > .queue').getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; });
  const e = await entries(page);
  const lastBottom = e.rows.length ? Math.max(...e.rows.map((r) => r.bottom)) : q.top;
  const y = Math.min(lastBottom + 40, q.bottom - 20);
  const x = (q.left + q.right) / 2;
  const on = await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return el ? el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : '') + (el.closest('li, a, button') ? ' (in an entry)' : '') : 'nothing'; }, [x, y]);
  return { x, y, on };
};

const server = await serveDesign();
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await browserFor().launch();
const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1, hasTouch: true, locale: 'en-GB', timezoneId: 'Europe/London' });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
await page.goto(base + FIXTURE);
await page.waitForTimeout(900);
console.log('drawer-walk @ ' + SIZE.width + '×' + SIZE.height + ' — ' + FIXTURE);

// 1. spacing
await openRight(page);
say(await drawer(page) === 'right', 'the right door opens the task drawer');
const e = await entries(page);
say(e.display === 'flex' && e.rowGap === GAP + 'px', 'the list is a flex column spaced by its gap (' + e.rowGap + ')');
say(e.rows.length >= 3, 'the drawer holds ' + e.rows.length + ' entries (enough to measure)');
say(e.rows.every((r) => r.mt === '0px' && r.mb === '0px'), 'no entry carries a margin of its own');
for (let i = 1; i < e.rows.length; i++) {
  const g = e.rows[i].top - e.rows[i - 1].bottom;
  say(Math.abs(g - GAP) < 0.5, 'gap under ' + e.rows[i - 1].id + ' → ' + e.rows[i].id + ' is ' + g.toFixed(1) + 'px' + (e.rows[i - 1].last ? ' (the DOM\'s last child, sorted mid-list)' : ''));
}
// the case Ed's phone met: the DOM's last child sorted into the middle. The
// fixture's newest entry may be filed and hidden, so the case is staged —
// the last child shown and ordered first — and measured like any other.
const staged = await page.evaluate(() => {
  const ul = document.querySelector('.layout > .queue ul');
  const last = ul.lastElementChild; if (!last) return null;
  last.style.display = ''; last.style.order = '-1';
  const shown = [...ul.querySelectorAll('.qitem')].filter((el) => getComputedStyle(el).display !== 'none');
  shown.sort((a, b) => (+a.style.order || 0) - (+b.style.order || 0));
  const i = shown.indexOf(last);
  const next = shown[i + 1];
  const out = next ? { id: last.dataset.q, next: next.dataset.q, gap: next.getBoundingClientRect().top - last.getBoundingClientRect().bottom } : null;
  last.style.display = 'none'; last.style.order = '';
  return out;
});
if (staged) say(Math.abs(staged.gap - GAP) < 0.5, 'the DOM\'s last child sorted first keeps its gap: ' + staged.gap.toFixed(1) + 'px under ' + staged.id + ' → ' + staged.next);

// 1b. **↻ is in the drawer** (Q1484 (c), the nh2026 convention 2026-09-20).
// The wide rail lists `stranded` among the entries that pin and the drawer's
// own list did not, so on a phone a proposal the text had moved out from
// under was in neither the one list of what asks something of you nor the
// door's count. The page is asked which entry is stranded rather than told:
// a check that cannot find its subject has not run, and says so.
const stranded = await page.evaluate(() => {
  const ul = document.querySelector('.layout > .queue ul');
  const mine = (window.SESSION.SUGGS || []).filter((g) => g.mine && g.stranded && !g.unproposed);
  const el = mine.length ? ul.querySelector('[data-q="' + String(mine[0].id).replace(/["\\]/g, '\\$&') + '"]') : null;
  const btn = el && el.querySelector('button');
  const mk = el && el.querySelector('.qmark .mk');
  return { any: mine.length, id: mine[0] ? mine[0].id : null, there: !!el,
    shown: !!el && getComputedStyle(el).display !== 'none',
    mark: mk ? mk.className : (el ? el.className : null),
    // **and it is red** (Q1484, Ed 2026-09-21: *Red entry, words unchanged*).
    // The entry's ground is a wash of the surface's one red and the ↻ is
    // painted it; at 390 the drawer is the only list there is, so the rule
    // has to hold here as well as in the wide rail.
    wash: btn ? getComputedStyle(btn).getPropertyValue('--washcol').trim() : null,
    ink: mk ? getComputedStyle(mk).color : null,
    red: getComputedStyle(document.documentElement).getPropertyValue('--lc-wrong').trim(),
    count: (document.querySelector('#drawerright .dcount') || {}).textContent || null };
});
say(stranded.any > 0, 'the fixture holds a stranded proposal to look for' + (stranded.id ? ' (' + stranded.id + ')' : ''));
say(stranded.shown, 'the stranded proposal ↻ stands in the drawer' +
  (stranded.shown ? ' as ' + stranded.mark : ': there ' + stranded.there + ', shown ' + stranded.shown));
// the channels as the stylesheet holds them, read back rather than written
// down here, so the walk cannot disagree with the palette about what red is
const chans = (stranded.red || '').split(',').map((x) => x.trim()).filter(Boolean);
const wantRgb = chans.length === 3 ? 'rgb(' + chans.join(', ') + ')' : null;
const washRed = !!wantRgb && (stranded.wash || '').replace(/\s+/g, ' ')
  .startsWith('rgba(' + chans.join(', ') + ',');
say(!!wantRgb && washRed && stranded.ink === wantRgb,
  'the stranded entry is red in the drawer: ground ' + stranded.wash + ', ↻ ' + stranded.ink +
  (wantRgb ? ' (--lc-wrong is ' + wantRgb + ')' : ' — the palette has no --lc-wrong'));

// 2. a tap on the empty space closes it — by mouse
const spot = await emptySpot(page);
say(!spot.on.includes('(in an entry)'), 'the empty spot (' + spot.x.toFixed(0) + ',' + spot.y.toFixed(0) + ') is on ' + spot.on);
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(150);
say(await drawer(page) === null, 'a mouse click on the drawer\'s empty space closes it');
// — and by touch (the pointerup path, iOS's)
await openRight(page);
await page.touchscreen.tap(spot.x, spot.y);
await page.waitForTimeout(150);
say(await drawer(page) === null, 'a touch tap on the drawer\'s empty space closes it');

// 3. a drag on the empty space does not
await openRight(page);
await page.mouse.move(spot.x, spot.y);
await page.mouse.down();
for (let i = 1; i <= 6; i++) await page.mouse.move(spot.x, spot.y - 20 * i);
await page.mouse.up();
await page.waitForTimeout(150);
say(await drawer(page) === 'right', 'a drag of 120px on the empty space leaves the drawer open');

// 4. an entry still opens and the drawer follows. Measured again here: the
// drawer has been opened and closed three times since the spacing pass, and
// the list is laid out by flex `order`, so an entry's box then is not a
// promise about its box now.
const now = await entries(page);
const first = now.rows[0] || e.rows[0];
await page.mouse.click((first.left + first.right) / 2, (first.top + first.bottom) / 2);
await page.waitForTimeout(900);
const opened = await page.evaluate(() => {
  const el = document.querySelector('[class*="-open"]');
  return el ? el.className : null;
});
say(await drawer(page) === null, 'a tap on an entry closes the drawer a beat later');
say(!!opened, 'and the entry\'s card is open on the page' + (opened ? ' (' + opened + ')' : ''));

say(pageErrors.length === 0, 'no page errors' + (pageErrors.length ? ': ' + pageErrors.join(' | ') : ''));
await browser.close();
server.close();
console.log(fails.length ? '\n' + fails.length + ' failed' : '\nall green');
process.exit(fails.length ? 1 : 0);
