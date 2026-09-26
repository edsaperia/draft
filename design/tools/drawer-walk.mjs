/**
 * The phone's `task-sheet` (Ed, 2026-09-24), and what the task drawer it
 * replaced was guarded for (Q1387, Q1388, Q1484 (c)).
 *
 *   npm run drawer-walk                     (--shots=<dir> saves the peek and the raised sheet)
 *
 * At 390×844 on the session fixture, touch on:
 *
 *   1. at rest the sheet peeks: its bar stands at the window's foot, holds the
 *      first entry's own card — its title row, its wash and its progress fill
 *      as the list draws them (Ed, 2026-09-26) — and *+n more* for the rest
 *      of the door's count; nothing of the list shows above the glass;
 *   2. a tap on the bar beside the card raises it, three quarters of the window at most, over
 *      the darkened ground; the ≣ door says it is expanded;
 *   3. raised, every two neighbouring entries are exactly `--s2` (8px) apart
 *      in the list's *visual* order (Q1387 — the column sorts with flex
 *      `order`, so the DOM's last child can stand anywhere), and no entry
 *      carries a margin; ↻ stands in the list, red (Q1484 (c));
 *   4. a tap on the ground lowers it; a tap on the list's own empty space
 *      lowers it (Q1388); a drag on that space does not;
 *   5. a finger on the bar is followed: mid-drag the sheet is where the
 *      finger put it and the root says a press is in flight
 *      (`data-sheetdrag`), a rail rebuild under the drag changes nothing, and
 *      let go past half way it rises, short of it it falls back; a quick
 *      flick rises by its speed; a drag down lowers it; a real touch drag too;
 *   6. a tap on an entry opens its card and the sheet goes back to the peek,
 *      the peek now naming the open entry; closing the card, the peek names
 *      the most urgent entry again; a tap on the peeked card opens its card;
 *   7. reading down slides the peek out of view, any scroll up brings it
 *      back, and at the document's foot it stays;
 *   8. the ≣ door raises it too;
 *   9. no horizontal overflow, no page errors; with reduced motion nothing
 *      eases; at 1600 there is no sheet at all.
 *
 * Exit 1 on any failure; every line printed is an assertion.
 */
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { join, extname, normalize, sep, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserFor } from '../../scripts/lib/walk.mjs';

const DESIGN = join(resolve(fileURLToPath(new URL('../..', import.meta.url))), 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const SIZE = { width: 390, height: 844 };
const FIXTURE = '/session-view.html?fixture=session&band=1';
const GAP = 8;   // --s2
const shotsArg = process.argv.find((a) => a.startsWith('--shots='));
const SHOTS = shotsArg ? shotsArg.slice('--shots='.length) : null;

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
const px = (n) => (Math.round(n * 10) / 10) + 'px';

/** the visible entries in list order, each with its box, margins and title line */
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
      const ql = el.querySelector('.ql');
      return { id: el.dataset.q, top: r.top, bottom: r.bottom, left: r.left, right: r.right, mt: s.marginTop, mb: s.marginBottom,
        last: el === ul.lastElementChild, title: (ql ? ql.textContent : el.textContent).replace(/\s+/g, ' ').trim() };
    }),
  };
});
/** the sheet as the page holds it: its state, its box, its bar's box and words */
const sheet = (page) => page.evaluate(() => {
  const root = document.documentElement;
  const q = document.querySelector('.layout > .queue');
  const bar = document.querySelector('.sheetbar');
  const r = q.getBoundingClientRect(); const b = bar ? bar.getBoundingClientRect() : null;
  const lineEl = bar ? bar.querySelector('.sheetline') : null;
  const line = lineEl ? (lineEl.querySelector('.ql') || lineEl) : null;
  const moreEl = bar ? bar.querySelector('.sheetmore') : null;
  const m = moreEl && moreEl.textContent ? moreEl.getBoundingClientRect() : null;
  return {
    rest: m ? { left: m.left, right: m.right, top: m.top, bottom: m.bottom } : null,
    state: root.getAttribute('data-sheet'), hide: root.hasAttribute('data-sheethide'), drag: root.hasAttribute('data-sheetdrag'),
    top: r.top, bottom: r.bottom, height: r.height, vis: getComputedStyle(q).visibility,
    bar: b && { top: b.top, bottom: b.bottom, left: b.left, right: b.right, height: b.height },
    line: line ? line.textContent.replace(/\s+/g, ' ').trim() : null,
    more: bar ? bar.querySelector('.sheetmore').textContent : null,
    count: +(document.getElementById('drawercount') || {}).textContent || 0,
    door: document.getElementById('drawerright').getAttribute('aria-expanded'),
    ground: getComputedStyle(document.body, '::after').content,
    vw: innerWidth, vh: innerHeight, sw: document.scrollingElement.scrollWidth,
  };
});
/** the sheet at rest: no transition still running on it — a box read mid-ease is
 *  wherever the ease had got to (a cold first run met the peek at its start) */
const atRest = (page) => page.evaluate(() => {
  const q = document.querySelector('.layout > .queue');
  return q ? Promise.all(q.getAnimations().map((a) => a.finished.catch(() => {}))) : null;
});
const settle = async (page, ms = 450) => { await page.waitForTimeout(ms); await atRest(page); };
const barMid = (s) => ({ x: (s.bar.left + s.bar.right) / 2, y: (s.bar.top + s.bar.bottom) / 2 });
/** the bar's own part, off the peeked card: *+n more*, else the grab strip — a tap
 *  there raises; a tap on the card opens the entry's card (Ed, 2026-09-26) */
const barRest = (s) => s.rest ? { x: (s.rest.left + s.rest.right) / 2, y: (s.rest.top + s.rest.bottom) / 2 }
  : { x: (s.bar.left + s.bar.right) / 2, y: s.bar.top + 5 };
/** the peeked card beside the entry it copies: which entry, its box, its wash and fill on both */
const peekCard = (page) => page.evaluate(() => {
  const card = document.querySelector('.sheetbar .sheetcard');
  const bar = document.querySelector('.sheetbar');
  const ul = document.querySelector('.layout > .queue ul');
  const shown = [...ul.querySelectorAll('.qitem')].filter((el) => getComputedStyle(el).display !== 'none');
  shown.sort((a, b) => (+a.style.order || 0) - (+b.style.order || 0));
  const top = shown[0];
  const src = top && (top.querySelector('button:not(.sealdot)') || top.querySelector('button'));
  const paint = (el) => el && {
    ground: getComputedStyle(el, '::after').backgroundColor,
    fillW: parseFloat(getComputedStyle(el, '::before').width) || 0,
    fillBg: getComputedStyle(el, '::before').backgroundColor,
    fill: el.dataset.fill ?? null, key: el.dataset.washkey ?? null, w: el.getBoundingClientRect().width,
  };
  const r = card && card.getBoundingClientRect(); const b = bar && bar.getBoundingClientRect();
  return card && {
    id: top ? top.dataset.q : null, key: card.dataset.washkey ?? null, hasQ: card.hasAttribute('data-q'),
    box: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height },
    bar: b && { top: b.top, bottom: b.bottom },
    title: (card.querySelector('.ql') || card).textContent.replace(/\s+/g, ' ').trim(),
    card: paint(card), src: paint(src),
  };
});
const alphaOf = (c) => { const m = String(c || '').match(/rgba?\(([^)]+)\)/); if (!m) return 0; const p = m[1].split(',').map((x) => +x.trim()); return p.length > 3 ? p[3] : 1; };

/** a mouse drag on the bar, in steps; `hold` waits before letting go, so the release carries no speed */
async function mouseDrag(page, from, dy, { steps = 8, stepMs = 16, hold = 160, mid } = {}) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) { await page.mouse.move(from.x, from.y + (dy * i) / steps); await page.waitForTimeout(stepMs); }
  if (mid) await mid();
  if (hold) await page.waitForTimeout(hold);
  await page.mouse.up();
}

const server = await serveDesign();
const base = 'http://127.0.0.1:' + server.address().port;
const engine = browserFor();
const browser = await engine.launch();
const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1, hasTouch: true, locale: 'en-GB', timezoneId: 'Europe/London' });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
await page.goto(base + FIXTURE);
await page.waitForTimeout(1200);
await page.waitForFunction(() => document.documentElement.hasAttribute('data-sheet'), null, { timeout: 8000 }).catch(() => {});
await settle(page, 0);
console.log('drawer-walk (the task sheet) @ ' + SIZE.width + '×' + SIZE.height + ' — ' + FIXTURE);
if (SHOTS) await mkdir(SHOTS, { recursive: true });

// 1. the peek
let s = await sheet(page);
let e = await entries(page);
say(s.state === 'peek', 'at rest the sheet peeks (data-sheet=' + s.state + ')');
const peekH = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sheet-peek')) || 0);
say(!!s.bar && peekH > 0 && s.bar.bottom <= s.vh + 0.5 && s.bar.top >= s.vh - peekH - 0.5 && s.bar.top < s.vh,
  'its bar stands at the window\'s foot: ' + (s.bar ? px(s.bar.top) + '–' + px(s.bar.bottom) : 'no bar') + ' of ' + s.vh + (s.hide ? ' — scrolled away (data-sheethide)' : ''));
say(e.rows.length >= 3 && e.rows[0].top >= s.vh - 0.5, 'nothing of the list shows above the glass (first entry at ' + px(e.rows[0] ? e.rows[0].top : -1) + ')');
say(s.line === e.rows[0].title, 'the bar says the first entry\'s own title line: «' + s.line + '»' + (s.line === e.rows[0].title ? '' : ' — the entry says «' + e.rows[0].title + '»'));
// **the peek is the entry's own card** (Ed, 2026-09-26): the most urgent
// entry, washed and filled as it is in the list, and not a bare title line
let pk = await peekCard(page);
say(!!pk && pk.id === e.rows[0].id && pk.key && pk.key === (pk.src && pk.src.key) && !pk.hasQ,
  'the peek holds the most urgent entry\'s own card: ' + (pk ? pk.id + ' (wash key ' + pk.key + ')' : 'no card in the bar'));
say(!!pk && alphaOf(pk.card.ground) > 0 && pk.card.ground === pk.src.ground,
  'its wash is not transparent, and is the entry\'s: ' + (pk ? pk.card.ground + ' (the entry ' + (pk.src && pk.src.ground) + ')' : '—'));
const wantFill = !!pk && !!pk.src && parseFloat(pk.src.fill) > 0;
say(!!pk && (!wantFill || (pk.card.fillW > 0 && alphaOf(pk.card.fillBg) > 0 &&
    Math.abs(pk.card.fillW / pk.card.w - pk.src.fillW / pk.src.w) < 0.02)),
  'its progress fill is drawn as the entry\'s: ' + (pk ? (wantFill ? px(pk.card.fillW) + ' of ' + px(pk.card.w) + ' in ' + pk.card.fillBg +
    ' (the entry ' + px(pk.src.fillW) + ' of ' + px(pk.src.w) + ', --fill ' + pk.src.fill + ')' : 'the entry has no fill') : '—'));
say(!!pk && wantFill, 'the fixture\'s most urgent entry has progress to show (--fill ' + (pk && pk.src ? pk.src.fill : '—') + ')');
say(!!pk && pk.box.top >= pk.bar.top - 0.5 && pk.box.bottom <= s.vh - 4 && pk.box.left >= 0 && pk.box.right <= s.vw,
  'the card stands inside the peek, clear of the glass: ' + (pk ? px(pk.box.top) + '–' + px(pk.box.bottom) + ', ' + px(pk.box.height) + ' tall, ' + px(s.vh - pk.box.bottom) + ' above the foot' : '—'));
say(s.count === e.rows.length, 'the door counts the list: ' + s.count + ' of ' + e.rows.length);
say(s.more === '+' + (s.count - 1) + ' more', 'and the bar counts the rest: «' + s.more + '»');
say(s.sw <= s.vw, 'no horizontal overflow at rest (' + s.sw + ' of ' + s.vw + ')');
if (SHOTS) await page.screenshot({ path: join(SHOTS, 'sheet-peek.png') });
const firstTitle = e.rows[0].title;

// 2. a tap raises it — on the bar's own part, off the card
await page.touchscreen.tap(barRest(s).x, barRest(s).y);
await settle(page);
s = await sheet(page);
say(s.state === 'open', 'a tap on the bar beside the card (its «+n more») raises the sheet');
say(Math.abs(s.bottom - s.vh) < 1 && s.height <= s.vh * 0.75 + 1, 'raised, it stands on the foot, ' + px(s.height) + ' tall (at most ' + px(s.vh * 0.75) + ')');
say(s.ground !== 'none' && s.ground !== 'normal', 'over the darkened ground');
say(s.door === 'true', 'and the ≣ door says it is expanded');
if (SHOTS) await page.screenshot({ path: join(SHOTS, 'sheet-open.png') });

// 3. spacing, and ↻
e = await entries(page);
say(e.display === 'flex' && e.rowGap === GAP + 'px', 'the list is a flex column spaced by its gap (' + e.rowGap + ')');
say(e.rows.every((r) => r.mt === '0px' && r.mb === '0px'), 'no entry carries a margin of its own');
for (let i = 1; i < e.rows.length; i++) {
  const g = e.rows[i].top - e.rows[i - 1].bottom;
  say(Math.abs(g - GAP) < 0.5, 'gap under ' + e.rows[i - 1].id + ' → ' + e.rows[i].id + ' is ' + g.toFixed(1) + 'px' + (e.rows[i - 1].last ? ' (the DOM\'s last child, sorted mid-list)' : ''));
}
// the case Ed's phone met: the DOM's last child sorted into the middle,
// staged — the last child shown and ordered first — and measured
const staged = await page.evaluate(() => {
  const ul = document.querySelector('.layout > .queue ul');
  const last = ul.lastElementChild; if (!last) return null;
  const was = [last.style.display, last.style.order];
  last.style.display = ''; last.style.order = '-1';
  const shown = [...ul.querySelectorAll('.qitem')].filter((el) => getComputedStyle(el).display !== 'none');
  shown.sort((a, b) => (+a.style.order || 0) - (+b.style.order || 0));
  const i = shown.indexOf(last);
  const next = shown[i + 1];
  const out = next ? { id: last.dataset.q, next: next.dataset.q, gap: next.getBoundingClientRect().top - last.getBoundingClientRect().bottom } : null;
  last.style.display = was[0]; last.style.order = was[1];
  return out;
});
if (staged) say(Math.abs(staged.gap - GAP) < 0.5, 'the DOM\'s last child sorted first keeps its gap: ' + staged.gap.toFixed(1) + 'px under ' + staged.id + ' → ' + staged.next);
// **↻ is in the list** (Q1484 (c)), and red: the page is asked which entry
// is stranded rather than told — a check that cannot find its subject has
// not run, and says so
const stranded = await page.evaluate(() => {
  const ul = document.querySelector('.layout > .queue ul');
  const mine = (window.SESSION.SUGGS || []).filter((g) => g.mine && g.stranded && !g.unproposed);
  const el = mine.length ? ul.querySelector('[data-q="' + String(mine[0].id).replace(/["\\]/g, '\\$&') + '"]') : null;
  const btn = el && el.querySelector('button');
  const mk = el && el.querySelector('.qmark .mk');
  return { any: mine.length, id: mine[0] ? mine[0].id : null, there: !!el,
    shown: !!el && getComputedStyle(el).display !== 'none',
    mark: mk ? mk.className : (el ? el.className : null),
    wash: btn ? getComputedStyle(btn).getPropertyValue('--washcol').trim() : null,
    ink: mk ? getComputedStyle(mk).color : null,
    red: getComputedStyle(document.documentElement).getPropertyValue('--lc-wrong').trim() };
});
say(stranded.any > 0, 'the fixture holds a stranded proposal to look for' + (stranded.id ? ' (' + stranded.id + ')' : ''));
say(stranded.shown, 'the stranded proposal ↻ stands in the sheet' +
  (stranded.shown ? ' as ' + stranded.mark : ': there ' + stranded.there + ', shown ' + stranded.shown));
const chans = (stranded.red || '').split(',').map((x) => x.trim()).filter(Boolean);
const wantRgb = chans.length === 3 ? 'rgb(' + chans.join(', ') + ')' : null;
const washRed = !!wantRgb && (stranded.wash || '').replace(/\s+/g, ' ').startsWith('rgba(' + chans.join(', ') + ',');
say(!!wantRgb && washRed && stranded.ink === wantRgb,
  'the stranded entry is red in the sheet: ground ' + stranded.wash + ', ↻ ' + stranded.ink +
  (wantRgb ? ' (--lc-wrong is ' + wantRgb + ')' : ' — the palette has no --lc-wrong'));

// 4. the ground lowers it; the list's empty space lowers it; a drag there does not
s = await sheet(page);
await page.touchscreen.tap(SIZE.width / 2, Math.max(s.top - 40, 200));
await settle(page);
say((await sheet(page)).state === 'peek', 'a tap on the darkened ground lowers it to the peek');
const openAgain = async () => { const t = await sheet(page); if (t.state !== 'open') { await page.touchscreen.tap(barRest(t).x, barRest(t).y); await settle(page); } };
await openAgain();
// the list's empty space: its side padding, low down, where no entry reaches
const spot = await page.evaluate(() => {
  const ul = document.querySelector('.layout > .queue ul'); const r = ul.getBoundingClientRect();
  const x = r.left + 6, y = r.bottom - 6;
  const el = document.elementFromPoint(x, y);
  return { x, y, on: el ? el.tagName + (el.closest('li, a, button') ? ' (in an entry)' : '') : 'nothing' };
});
say(!spot.on.includes('(in an entry)'), 'the list\'s empty spot (' + spot.x.toFixed(0) + ',' + spot.y.toFixed(0) + ') is on ' + spot.on);
await page.mouse.move(spot.x, spot.y); await page.mouse.down();
for (let i = 1; i <= 6; i++) await page.mouse.move(spot.x, spot.y - 20 * i);
await page.mouse.up();
await page.waitForTimeout(150);
say((await sheet(page)).state === 'open', 'a drag of 120px on the list\'s empty space leaves it raised');
// by mouse: a finger's tap this near an entry is moved onto the entry by the
// browser's touch adjustment, which is the browser being kind, not the page
await page.mouse.click(spot.x, spot.y);
await settle(page);
say((await sheet(page)).state === 'peek', 'a click on the list\'s empty space lowers it (Q1388)');
// the ground's own tap is a pointerup the page lowers the sheet on, and the
// click Chromium fires after it hit-tests the document the ground no longer
// covers: that click is eaten, so it reaches no clause and no tab
await openAgain();
await page.evaluate(() => { window.__fell = null; document.addEventListener('click', (ev) => { window.__fell = ev.target.tagName + '.' + ev.target.className; }, { once: true }); });
await page.touchscreen.tap(SIZE.width / 2, 200);
await settle(page);
const fell = await page.evaluate(() => window.__fell);
say((await sheet(page)).state === 'peek' && fell === null, 'a tap on the ground lowers it and its click reaches nothing beneath' + (fell ? ' — it reached ' + fell : ''));

// 5. the drag
s = await sheet(page);
const peekTop = s.top;
const travel = s.height - s.bar.height;              // the whole way from peek to raised
let mid = null;
await mouseDrag(page, barMid(s), -(travel * 0.3), { mid: async () => {
  const before = await sheet(page);
  // a rail rebuild under the finger, as the 4 s poll's would be if it came
  await page.evaluate(() => { if (window.SESSION.renderAll) window.SESSION.renderAll(); dispatchEvent(new Event('resize')); });
  await page.waitForTimeout(60);
  mid = { before, after: await sheet(page) };
} });
await settle(page);
say(!!mid && mid.before.drag && Math.abs((peekTop - mid.before.top) - travel * 0.3) < 2,
  'mid-drag the sheet is under the finger: ' + (mid ? px(peekTop - mid.before.top) + ' up for ' + px(travel * 0.3) : '—') + ', a press in flight (data-sheetdrag)');
say(!!mid && mid.after.drag && mid.after.state === 'peek' && Math.abs(mid.after.top - mid.before.top) < 1 && !!mid.after.bar,
  'a rail rebuild under the drag moves nothing (' + (mid ? px(mid.after.top - mid.before.top) : '—') + ') and keeps the state');
s = await sheet(page);
say(s.state === 'peek' && !s.drag, 'let go short of half way, it falls back to the peek');
await mouseDrag(page, barMid(s), -(travel * 0.7));
await settle(page);
s = await sheet(page);
say(s.state === 'open' && Math.abs(s.bottom - s.vh) < 1, 'let go past half way, it rises and settles raised');
await mouseDrag(page, barMid(s), travel * 0.7);
await settle(page);
s = await sheet(page);
say(s.state === 'peek', 'a drag down lowers it');
await mouseDrag(page, barMid(s), -60, { steps: 3, stepMs: 8, hold: 0 });
await settle(page);
s = await sheet(page);
say(s.state === 'open', 'a quick flick of 60px up raises it by its speed');
await mouseDrag(page, barMid(s), 60, { steps: 3, stepMs: 8, hold: 0 });
await settle(page);
s = await sheet(page);
say(s.state === 'peek', 'and a quick flick down lowers it');
// a real touch drag, on the engine that can send one
if (engine.name() === 'chromium') {
  const cdp = await context.newCDPSession(page);
  const m = barMid(s);
  const tp = (y) => [{ x: m.x, y }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(m.y) });
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(m.y - travel * 0.08 * i) }); await page.waitForTimeout(16); }
  await page.waitForTimeout(160);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await settle(page);
  s = await sheet(page);
  say(s.state === 'open', 'a touch drag of 80% raises it');
  await page.touchscreen.tap(SIZE.width / 2, Math.max(s.top - 40, 200));
  await settle(page);
}

// 6. an entry opens its card; the peek follows
await openAgain();
e = await entries(page);
// an entry that is not the most urgent, so the peek has something to change to
// — a clause's entry, whose card `SESSION.openId` names (a setting's is the
// band's), and not one of your own, which on a phone opens no composer
const charterIds = await page.evaluate(() => (window.SESSION.SUGGS || []).filter((g) => !g.mine).map((g) => g.id));
const pick = e.rows.find((r) => r.title !== firstTitle && charterIds.includes(r.id) && r.bottom < SIZE.height - 20) || e.rows[1];
await page.touchscreen.tap((pick.left + pick.right) / 2, (pick.top + pick.bottom) / 2);
// the card opens once the page has travelled to it, so the walk waits on the page
await page.waitForFunction((id) => window.SESSION.openId === id, pick.id, { timeout: 4000 }).catch(() => {});
await page.waitForTimeout(500);
s = await sheet(page);
const opened = await page.evaluate(() => window.SESSION.openId);
say(opened === pick.id, 'a tap on an entry opens its card (' + opened + ')');
say(s.state === 'peek', 'and the sheet goes back to the peek');
say(s.line === pick.title, 'the peek names the open entry: «' + s.line + '»');
await page.evaluate(() => window.SESSION.closeCard());
await page.waitForTimeout(900);
s = await sheet(page);
say(s.line === firstTitle, 'closing the card, the peek names the most urgent entry again: «' + s.line + '»');
// a tap on the peeked card opens that entry's card, and the sheet stays at the peek
pk = await peekCard(page);
await page.touchscreen.tap((pk.box.left + pk.box.right) / 2, (pk.box.top + pk.box.bottom) / 2);
await page.waitForFunction((id) => window.SESSION.openId === id, pk.id, { timeout: 4000 }).catch(() => {});
await page.waitForTimeout(500);
s = await sheet(page);
const peekOpened = await page.evaluate(() => window.SESSION.openId);
say(peekOpened === pk.id, 'a tap on the peeked card opens that entry\'s card (' + peekOpened + ', wanted ' + pk.id + ')');
say(s.state === 'peek', 'and the sheet stays at the peek (data-sheet=' + s.state + ')');
await page.evaluate(() => window.SESSION.closeCard());
await page.waitForTimeout(900);

// 7. reading down hides it, up shows it, the foot keeps it
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(1400);   // past the quiet a choice's own scroll gets
for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(80); }
await settle(page, 350);
s = await sheet(page);
say(s.hide && s.top >= s.vh, 'reading down slides the peek out of view (' + px(s.top) + ' of ' + s.vh + ')');
await page.mouse.wheel(0, -60);
await settle(page, 350);
s = await sheet(page);
say(!s.hide && s.bar.top < s.vh && s.bar.bottom <= s.vh + 0.5, 'a scroll up brings it back (' + (s.hide ? 'still hidden' : 'bar at ' + px(s.bar.top)) + ')');
await page.evaluate(() => scrollTo(0, document.scrollingElement.scrollHeight));
await settle(page, 350);
s = await sheet(page);
say(!s.hide && s.bar.top < s.vh, 'at the document\'s foot it stays');
const foot = await page.evaluate(() => {
  const d = document.querySelector('.layout > main') || document.querySelector('.doc');
  return d ? d.getBoundingClientRect().bottom : null;
});
say(foot !== null && foot <= s.bar.top + 0.5, 'and the document\'s foot ends above the bar (' + px(foot) + ' ≤ ' + px(s.bar.top) + ')');

// 8. the door
await page.click('#drawerright');
await settle(page);
s = await sheet(page);
say(s.state === 'open', 'the ≣ door raises the sheet');
await page.click('#drawerright');
await settle(page);
say((await sheet(page)).state === 'peek', 'and lowers it again');

// 9. overflow, errors, reduced motion, wide
s = await sheet(page);
say(s.sw <= s.vw, 'no horizontal overflow (' + s.sw + ' of ' + s.vw + ')');
say(pageErrors.length === 0, 'no page errors' + (pageErrors.length ? ': ' + pageErrors.join(' | ') : ''));

const still = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1, hasTouch: true, reducedMotion: 'reduce' });
const sp = await still.newPage();
await sp.goto(base + FIXTURE); await sp.waitForTimeout(900);
const eased = await sp.evaluate(() => getComputedStyle(document.querySelector('.layout > .queue')).transitionDuration);
say(/^0s(, 0s)*$/.test(eased), 'with reduced motion the sheet does not ease (' + eased + ')');
await still.close();

const wide = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const wp = await wide.newPage();
await wp.goto(base + FIXTURE); await wp.waitForTimeout(900);
const w = await wp.evaluate(() => ({ bar: !!document.querySelector('.sheetbar'), attr: document.documentElement.getAttribute('data-sheet') }));
say(!w.bar && w.attr === null, 'at 1600 there is no sheet at all (bar ' + w.bar + ', data-sheet ' + w.attr + ')');
await wide.close();

await browser.close();
server.close();
console.log(fails.length ? '\n' + fails.length + ' failed' : '\nall green');
process.exit(fails.length ? 1 : 0);
