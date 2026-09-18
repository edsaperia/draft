#!/usr/bin/env node
// rail-open-where — press each live rail entry from a member's seat and report where its card came to rest:
// the card's top, its active tab, how many tabs its strip holds (Ed, 2026-09-19: *I clicked on this queue card
// and this is where it opened*). Read-only — opening a card sends nothing.
//   node scripts/repro/rail-open-where.mjs <document url> <cookie file> [--max 6]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const [url, cookieFile] = process.argv.slice(2);
const MAX = Number((process.argv[process.argv.indexOf('--max') + 1]) || 6) || 6;
const u = new URL(url);
const [name, ...rest] = readFileSync(cookieFile, 'utf8').trim().split('=');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.addCookies([{ name, value: rest.join('='), domain: u.hostname, path: '/' }]);
const page = await ctx.newPage();
// --local swaps this tree's design/session.js into the page (the browser only — the host is untouched), so a fix
// can be measured against a live room's real state before it is pushed
if (process.argv.includes('--local')) await page.route('**/session.js*', (r) => r.fulfill({ contentType: 'text/javascript; charset=utf-8', body: readFileSync('design/session.js', 'utf8') }));
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(url); await page.waitForSelector('#charter', { timeout: 30000 }); await page.waitForTimeout(1500);
await page.evaluate(() => fetch(location.pathname.replace('/d/', '/api/d/') + '/view').then((r) => r.json()).then((v) =>
  localStorage.setItem('draft:grants:' + location.pathname.split('/')[2] + ':' + (v.me || ''),
    JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge']))));
await page.reload(); await page.waitForSelector('#charter', { timeout: 30000 }); await page.waitForTimeout(3000);
const ids = await page.evaluate(() => [...document.querySelectorAll('#rail button[data-q]')]
  .filter((b) => /#/.test(b.dataset.q)).map((b) => b.dataset.q));
console.log(ids.length, 'pair entries in the rail');
for (const id of ids.slice(0, MAX)) {
  // where the entry's own clause stands before the press, then where the card's head stands after it
  const pre = await page.evaluate((q) => { const b = [...document.querySelectorAll('#rail button[data-q]')].find((x) => x.dataset.q === q);
    if (!b) return null; const y0 = scrollY; b.click(); return { y0 }; }, id);
  if (!pre) continue;
  await page.waitForTimeout(3200);
  const m = await page.evaluate((q) => {
    const S = window.SESSION;
    const cards = [...document.querySelectorAll('#charter .sugg')].filter((c) => c.dataset.card === q);
    const open = cards[0] || null;
    const head = open && (open.querySelector('.clausehead, .headclause') || open);
    const r = open ? open.getBoundingClientRect() : null;
    const others = [...document.querySelectorAll('#charter .sugg')].filter((c) => c.dataset.card !== q && c.getBoundingClientRect().height > 60).length;
    return { openId: (S.openId || '').slice(0, 24), found: cards.length, cardTop: r && Math.round(r.top), cardH: r && Math.round(r.height), cardBottom: r && Math.round(r.bottom), winH: innerHeight,
      headTop: head && Math.round(head.getBoundingClientRect().top), tabs: open ? open.querySelectorAll('.achip').length : null,
      otherCardsOpen: others, gap: /e3b0c44298fc/.test(q), y: Math.round(scrollY) };
  }, id);
  console.log(JSON.stringify({ id: id.slice(0, 24), scrolledBy: m.y - Math.round(pre.y0), ...m }));
}
await browser.close();
