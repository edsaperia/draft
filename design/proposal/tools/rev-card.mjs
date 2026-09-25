// rev-card.mjs — Q1541 revision pass working tool: open one card (by data-tab key, optionally from a strip) and print its HTML and geometry
//   node design/proposal/tools/rev-card.mjs <url> <key>[,<strip-key>] [width] [--html] [--shot=path] [--seat=n]
import { chromium } from 'playwright';
const url = process.argv[2]; const keys = process.argv[3].split(','); const w = +(process.argv[4] || 1600);
const arg = (n) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.split('=').slice(1).join('=') : null; };
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: w, height: w > 600 ? 1000 : 844 } });
await p.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = (q) => (/prefers-reduced-motion/.test(q) ? { matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, onchange: null, dispatchEvent() { return false; } } : mm(q)); });
const errs = []; p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
await p.goto(url); await p.waitForTimeout(1200);
if (arg('seat')) { await p.selectOption('#devwho', arg('seat')); await p.waitForTimeout(800); }
for (let i = 0; i < 6; i++) { const n = await p.evaluate(() => { const t = [...document.querySelectorAll('#band .sectoggle')].find((b) => b.getAttribute('aria-expanded') === 'false'); if (!t) return 0; t.click(); return 1; }); if (!n) break; await p.waitForTimeout(300); }
const pre = await p.evaluate((k) => { const el = document.querySelector('[data-tab="' + CSS.escape(k) + '"]') || document.querySelector('.achip[data-anchor="' + CSS.escape(k) + '"]'); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { tab: [r.x, r.y] }; }, keys[0]);
for (const k of keys) {
  await p.evaluate((k) => { const el = document.querySelector('.clausehead .chipcol [data-tab="' + CSS.escape(k) + '"]') || document.querySelector('[data-tab="' + CSS.escape(k) + '"]') || document.querySelector('.achip[data-anchor="' + CSS.escape(k) + '"]'); if (el) el.click(); }, k);
  await p.waitForTimeout(500);
}
const r = await p.evaluate((wantHtml) => {
  const c = document.querySelector('.gcard') || document.querySelector('.sugg');
  if (!c) return null;
  const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; };
  const kids = [...c.children].map((e) => ({ cls: e.className.slice(0, 40), slot: e.getAttribute('data-slot'), r: R(e), t: e.innerText.replace(/\s+/g, ' ').slice(0, 120) }));
  const strip = c.querySelector('.chipcol');
  const prev = c.parentElement && c.parentElement.previousElementSibling;
  return { card: R(c), strip: R(strip), prev: prev ? [prev.className.slice(0, 30), R(prev)] : null, kids, html: wantHtml ? c.outerHTML : '' };
}, process.argv.includes('--html'));
console.log(JSON.stringify({ pre, ...r, html: undefined }, null, 1));
if (r && r.html) console.log(r.html.replace(/<svg[^>]*data-char="([^"]*)"[^>]*>.*?<\/svg>/g, '[$1]').replace(/<use[^>]*><\/use>/g, ''));
if (arg('shot')) { const box = await p.evaluate(() => { const c = document.querySelector('.gcard') || document.querySelector('.sugg'); c.scrollIntoView({ block: 'start' }); window.scrollBy(0, -100); const r = c.getBoundingClientRect(); return { x: Math.max(0, r.left - 70), y: Math.max(0, r.top - 40), width: Math.min(r.width + 90, innerWidth - Math.max(0, r.left - 70)), height: Math.min(r.height + 60, 2000) }; }); await p.screenshot({ path: arg('shot'), clip: box }); }
console.log(errs.join('\n'));
await b.close();
