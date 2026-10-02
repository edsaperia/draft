#!/usr/bin/env node
/**
 * heading-rank — **the Text's headings take their look from the levels it
 * uses** (issue #152, Ed 2026-10-02: *headings are too small … can we have
 * headings get larger depending on what the smallest level that's used in
 * the text?*; `CARDS.rankCls`, system.css's `--h-part`).
 *
 *   node scripts/repro/heading-rank.mjs
 *
 * Serves design/ itself and reads the Hollow Oak fixture at 1600:
 *   1. the fixture's Text uses `#`, `##` and `###`: each heading's computed
 *      size is its rank's — `###` 1.333rem, `##` 1.777rem, `#` 2.369rem —
 *      and the title steps up to 3.157rem;
 *   2. a card opened on a heading of each level draws the heading at the size
 *      the column drew it, its first line where the heading's stood (P13);
 *   3. the Text re-bound without its `#` headings (`##` + `###`): the ranks
 *      move down — `###` 1.333rem, `##` 1.777rem — the title back to
 *      2.369rem, and 2 holds again;
 *   4. no Text heading is ever under 1.333rem;
 *   5. the Rules' own headings carry no rank and keep their fixed sizes
 *      (`##` 1.333rem, `###` 1.125rem), on the founding page settled by ⏩.
 * Red on the page before #152 at 1 (a `###` at 1.125rem).
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DESIGN = join(resolve(fileURLToPath(new URL('../..', import.meta.url))), 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const srv = createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  try { const b = await readFile(join(DESIGN, p)); res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'text/plain' }); res.end(b); } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => srv.listen(0, r));
const base = 'http://127.0.0.1:' + srv.address().port;
const browser = await chromium.launch();
const fails = [];
const say = (s) => console.log(s);
const check = (what, ok, why) => { if (ok) say('PASS · ' + what); else { say('FAIL · ' + what + ' — ' + why); fails.push(what); } };
const REM = 16;
const px = (rem) => +(rem * REM).toFixed(2);
const near = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;

const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(base + '/session-view.html?fixture=session');
await page.waitForFunction(() => !!(window.SESSION && window.SESSION.SUGGS.length && document.querySelector('#charter h2.docline')), null, { timeout: 20_000 });
await page.evaluate(() => { window.scrollTo(0, 0); window.SESSION.smoothScrollBy = (dy, done) => { window.scrollBy(0, dy); if (done) done(); }; });
await page.evaluate(() => document.fonts && document.fonts.ready);
await page.waitForTimeout(500);

/** every Text heading's level and computed size, and the title's */
const sizes = () => page.evaluate(() => ({
  ranks: document.documentElement.dataset.headRanks || null,
  title: parseFloat(getComputedStyle(document.querySelector('#charter .doctitle, .doc .doctitle') || document.body).fontSize),
  heads: [...document.querySelectorAll('#charter h2.docline')].map((h) => ({
    lvl: +(h.className.match(/\blvl(\d)/) || [0, 0])[1], size: parseFloat(getComputedStyle(h).fontSize), key: h.dataset.key })),
}));
const ladder = (want, label) => async () => {
  const s = await sizes();
  for (const [lvl, rem] of Object.entries(want.levels)) {
    const hs = s.heads.filter((h) => h.lvl === +lvl);
    check(label + ' · every `' + '#'.repeat(+lvl) + '` at ' + rem + 'rem', hs.length > 0 && hs.every((h) => near(h.size, px(rem))),
      hs.length ? JSON.stringify([...new Set(hs.map((h) => h.size))]) + 'px' : 'no heading of that level');
  }
  check(label + ' · the title at ' + want.title + 'rem', near(s.title, px(want.title)), s.title + 'px');
  check(label + ' · no Text heading under 1.333rem', s.heads.every((h) => h.size >= px(1.333) - 0.6),
    JSON.stringify(s.heads.filter((h) => h.size < px(1.333) - 0.6).slice(0, 3)));
};
/** a card opened on a heading of each level: its head drawn at the column's size, in the heading's place */
const opened = (levels, label) => async () => {
  for (const lvl of levels) {
    const r = await page.evaluate(async (lvl) => {
      const S = window.SESSION;
      const h = [...document.querySelectorAll('#charter h2.docline.lvl' + lvl)][1] || document.querySelector('#charter h2.docline.lvl' + lvl);
      if (!h) return { err: 'no heading' };
      h.scrollIntoView({ block: 'center' });
      await new Promise((r) => setTimeout(r, 150));
      const key = h.dataset.key;
      const id = 'rank-probe-' + lvl;
      const words = h.textContent.replace('▸', '').trim();
      S.setData({ SUGGS: S.SUGGS.filter((g) => !/^rank-probe-/.test(g.id)).concat([{ id, kind: 'quick', keys: [key], state: 'needs', qLabel: words,
        urgency: 0.5, pct: 10, cap: 'one has voted', marked: '<del>' + words + '</del><ins>A new heading</ins>', rationale: 'Shorter.' }]) });
      await new Promise((r) => setTimeout(r, 300));
      const h2 = document.querySelector('#charter h2.docline[data-key="' + key + '"]');
      const size = parseFloat(getComputedStyle(h2).fontSize);
      const top = h2.getBoundingClientRect().top;
      S.toggle(id, false);
      await new Promise((r) => setTimeout(r, 1000));
      const card = document.querySelector('.sugg[data-card="' + id + '"]');
      const txt = card && (card.querySelector('.headclause .hblock') || card.querySelector('.headclause .rtext'));
      const out = { key, size, top, headSize: txt ? parseFloat(getComputedStyle(txt).fontSize) : null,
        headTop: txt ? txt.getBoundingClientRect().top : null, cls: card && card.className };
      S.toggle(id, false);
      await new Promise((r) => setTimeout(r, 700));
      S.setData({ SUGGS: S.SUGGS.filter((g) => g.id !== id) });
      await new Promise((r) => setTimeout(r, 200));
      return out;
    }, lvl);
    if (r.err) { check(label + ' · `' + '#'.repeat(lvl) + '` card', false, r.err); continue; }
    check(label + ' · a card on a `' + '#'.repeat(lvl) + '` draws it at the column\'s size', r.headSize != null && near(r.headSize, r.size),
      'column ' + r.size + 'px · card head ' + r.headSize + 'px · ' + r.cls);
    check(label + ' · …its first line where the heading stood (P13)', r.headTop != null && Math.abs(r.headTop - r.top) <= 1,
      'heading ' + r.top.toFixed(1) + ' → head ' + (r.headTop == null ? null : r.headTop.toFixed(1)));
  }
};

/* ---- 1, 2: `#` + `##` + `###` --------------------------------------------- */
await ladder({ levels: { 3: 1.333, 2: 1.777, 1: 2.369 }, title: 3.157 }, '1 three levels')();
await opened([1, 2, 3], '2 three levels')();

/* ---- 3: the Text re-bound as `##` + `###` --------------------------------- */
await page.evaluate(() => {
  const S = window.SESSION;
  S.setData({ DOC: S.DOC.filter((l) => !(l.t === 'h' && (l.level ?? 1) === 1)) });
  window.scrollTo(0, 0);
});
await page.waitForTimeout(600);
const after = await sizes();
check('3 two levels · the ranks counted again', after.ranks === '2', 'data-head-ranks ' + after.ranks);
await ladder({ levels: { 3: 1.333, 2: 1.777 }, title: 2.369 }, '3 two levels')();
await opened([2, 3], '3 two levels')();

/* ---- 5: the Rules keep their fixed headings -------------------------------- */
const rp = await ctx.newPage();
rp.on('pageerror', (e) => errors.push('rules: ' + e.message));
await rp.goto(base + '/session-view.html');
await rp.waitForTimeout(1500);
await rp.click('#devff').catch(() => {});
await rp.waitForTimeout(1500);
const rules = await rp.evaluate(() => [...document.querySelectorAll('h2.docline[id^="cs-"]')]
  .map((h) => ({ id: h.id, lvl: +(h.className.match(/\blvl(\d)/) || [0, 0])[1], rank: /\brank\d/.test(h.className), size: parseFloat(getComputedStyle(h).fontSize) })));
check('5 the Rules · their headings carry no rank', rules.length > 0 && rules.every((h) => !h.rank), JSON.stringify(rules.filter((h) => h.rank).slice(0, 3)));
check('5 the Rules · `##` 1.333rem and `###` 1.125rem, as ever',
  rules.some((h) => h.lvl === 2) && rules.filter((h) => h.lvl === 2).every((h) => near(h.size, px(1.333))) &&
  rules.filter((h) => h.lvl === 3).every((h) => near(h.size, px(1.125))), JSON.stringify(rules.slice(0, 6)));

check('the page threw nothing', errors.length === 0, errors.join(' / '));
await browser.close();
srv.close();
if (fails.length) { console.error('\nheading-rank: ' + fails.length + ' failure(s)'); process.exit(1); }
say('\n✓ the Text\'s headings take their look from the levels it uses');
