#!/usr/bin/env node
/**
 * rail-second-press — **a press on the open card's own rail entry travels to
 * it and never closes it; a click outside closes it** (issue #168, Ed
 * 2026-10-02: *when I then click on it a second time … I want to … not close
 * it, but instead bring it back into view as with the first click (because,
 * e.g., you may have scrolled away from it). If users want to deactivate it,
 * they can instead click outside of it*; SURFACE C2).
 *
 *   node scripts/repro/rail-second-press.mjs
 *
 * Serves `design/` itself and drives the session fixture with its band
 * (`?fixture=session&band=1`), so one page holds both rails' entries: a text
 * card (session.js's `button[data-q]`) and a Rules card (the band's
 * `[data-card]`). For each:
 *
 *   1 — press the entry: the card opens;
 *   2 — scroll the card fully out of view;
 *   3 — press the same entry again: the card is still open (the same
 *       `SESSION.openId` / `S.open`) and its first line is back in the
 *       reading band;
 *   4 — click on nothing outside it: it closes.
 *
 * And on a phone (390), the text card again through the raised `task-sheet`:
 * a real press on its open entry lowers the sheet and travels to the card,
 * which stays open.
 *
 * Before #168 step 3 closed the card. Joins the sprint tier from its first
 * day (Q1547). Exit 0 when every check passes, 1 on a defect, 2 on set-up.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, sep, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DESIGN = join(resolve(fileURLToPath(new URL('../..', import.meta.url))), 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.woff2': 'font/woff2' };
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
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const BASE = 'http://127.0.0.1:' + server.address().port;

const fails = [];
const check = (what, ok, detail = '') => {
  console.log(`${ok ? 'PASS · ' : 'FAIL · '}${what}${detail ? ` · ${detail}` : ''}`);
  if (!ok) fails.push(what);
};
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const bail = async (why) => { console.log('SET-UP · ' + why); await browser.close(); server.close(); process.exit(2); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(BASE + '/session-view.html?fixture=session&band=1');
await page.waitForFunction(() => !!(window.SESSION && window.SESSION.SUGGS && document.querySelector('#rail li')), null, { timeout: 20000 });
await sleep(800);
// the travel is the page's own smooth scroll; an instant one keeps the walk short
await page.evaluate(() => { window.SESSION.smoothScrollBy = (dy, done) => { window.scrollBy(0, dy); if (done) done(); }; });

/** what is open on either rail, and where the open card's first line stands */
const state = () => page.evaluate(() => {
  const id = window.SESSION.openId;
  const card = (id != null && document.querySelector('.sugg[data-card="' + id + '"]')) || document.querySelector('.setupcard');
  const head = card && (card.querySelector('.clausehead .headclause, .clausehead, .headrule') || card);
  const r = head ? head.getBoundingClientRect() : null;
  const sc = document.querySelector('.setupcard');
  return { text: id ?? null, rules: sc ? sc.dataset.setupcard ?? null : null,
    top: r ? Math.round(r.top) : null, winH: innerHeight, y: Math.round(scrollY) };
});
const press = (sel) => page.evaluate((s) => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
/** a click on nothing, beside the document, found by the page's own dead-click test */
const outside = async () => {
  const spot = await page.evaluate(() => {
    // outside the document's column, never on a control, the rails, the
    // text or a card: searched for rather than assumed, as the page scrolls
    const d = document.getElementById('doc').getBoundingClientRect();
    const control = 'a, button, input, textarea, select, label, [role="button"], [contenteditable="true"], ' +
      '.achip, [data-tab], [data-card], [data-anchor], [data-q], [data-toc], .setupcard, .sugg, nav, aside, #doc, .devdrop, .devswitch';
    for (let x = 8; x < innerWidth - 8; x += 24) {
      if (x >= d.left && x <= d.right) continue;
      for (let y = innerHeight - 60; y > 80; y -= 40) {
        const el = document.elementFromPoint(x, y);
        if (el && !el.closest(control)) return { x, y };
      }
    }
    return null;
  });
  if (!spot) return false;
  await page.mouse.click(spot.x, spot.y);
  return true;
};
/** scroll so the open card stands wholly past the window, below it where the page has room */
const scrollAway = () => page.evaluate(() => {
  const id = window.SESSION.openId;
  const card = (id != null && document.querySelector('.sugg[data-card="' + id + '"]')) || document.querySelector('.setupcard');
  const r = card.getBoundingClientRect();
  const past = r.bottom + scrollY + 40;
  const max = document.documentElement.scrollHeight - innerHeight;
  window.scrollTo(0, past <= max ? past : Math.max(0, r.top + scrollY - innerHeight - 40));
  const r2 = card.getBoundingClientRect();
  return r2.bottom < 0 || r2.top > innerHeight;
});
const inBand = (s) => s.top !== null && s.top >= 40 && s.top <= s.winH * 0.6;

async function walk(name, sel, openOf) {
  await page.evaluate(() => window.scrollTo(0, 0)); await sleep(300);
  if (!(await press(sel))) return bail('no ' + name + ' entry at ' + sel);
  await sleep(2200);
  const a = await state();
  check(name + ' 1 · the entry opens its card', !!openOf(a), JSON.stringify(a));
  if (!openOf(a)) return;
  const away = await scrollAway(); await sleep(400);
  check(name + ' 2 · the card is scrolled wholly out of view', away, JSON.stringify(await state()));
  await press(sel); await sleep(2200);
  const c = await state();
  check(name + ' 3 · a second press on its entry keeps the same card open', openOf(c) === openOf(a), JSON.stringify(c));
  check(name + ' 3 · …and travels back to it, its first line in the reading band', !!openOf(c) && inBand(c), JSON.stringify(c));
  // closed by nothing but the click: a card the second press shut proves nothing here
  if (!openOf(c)) return check(name + ' 4 · a click on nothing outside it closes it', false, 'the card was not open to close');
  const clicked = await outside(); await sleep(1600);
  const d = await state();
  check(name + ' 4 · a click on nothing outside it closes it', clicked && !openOf(d), clicked ? JSON.stringify(d) : 'no dead spot beside the document');
}

// a text card: the first live judgment entry in the charter's rail
const textId = await page.evaluate(() => {
  const g = window.SESSION.SUGGS.find((x) => x.kind === 'quick' && x.state !== 'sealed' &&
    document.querySelector('#rail li[data-q="' + CSS.escape(x.id) + '"] > button'));
  return g ? g.id : null;
});
if (!textId) await bail('no live text entry in the fixture rail');
await walk('text', '#rail li[data-q="' + textId + '"] > button', (s) => (s.text === textId ? s.text : null));

// a Rules card: the first band entry in the rail
const ruleKey = await page.evaluate(() => { const b = document.querySelector('#rail button[data-card]'); return b ? b.dataset.card : null; });
if (!ruleKey) await bail('no Rules entry in the fixture rail');
await walk('rules', '#rail button[data-card="' + ruleKey + '"]', (s) => (s.rules === ruleKey ? s.rules : null));

// **On a phone** the rail is the `task-sheet`, and its entries are the same
// entries: with the card open and scrolled away, the sheet raised and its open
// entry pressed by a real pointer, the sheet lowers and the card travels back,
// still open (MOBILE.md *The task sheet*)
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + '/session-view.html?fixture=session&band=1');
await page.waitForFunction(() => !!(window.SESSION && window.SESSION.SUGGS && document.querySelector('#rail li')), null, { timeout: 20000 });
await sleep(800);
await page.evaluate(() => { window.SESSION.smoothScrollBy = (dy, done) => { window.scrollBy(0, dy); if (done) done(); }; });
{
  const sel = '#rail li[data-q="' + textId + '"] > button';
  await press(sel); await sleep(2200);
  const a = await state();
  check('phone 1 · the entry opens its card', a.text === textId, JSON.stringify(a));
  if (a.text === textId) {
    check('phone 2 · the card is scrolled wholly out of view', await scrollAway(), JSON.stringify(await state()));
    await page.click('#drawerright'); await sleep(700);
    const raised = await page.evaluate(() => document.documentElement.getAttribute('data-sheet'));
    check('phone 2 · the sheet is raised', raised === 'open', String(raised));
    await page.locator(sel).click(); await sleep(2400);
    const c = await state();
    const sheet = await page.evaluate(() => document.documentElement.getAttribute('data-sheet'));
    check('phone 3 · a second press on its entry keeps the same card open', c.text === textId, JSON.stringify(c));
    check('phone 3 · …the sheet lowers and the card is back in the reading band', sheet !== 'open' && c.text === textId && inBand(c),
      JSON.stringify({ sheet, ...c }));
  }
}

check('no page error', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
server.close();
console.log(fails.length ? `rail-second-press · RED · ${fails.length} defect(s)` : 'rail-second-press · GREEN');
process.exit(fails.length ? 1 : 0);
