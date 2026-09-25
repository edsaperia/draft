// still-probe.mjs — quick 2D still + head-registration probe for a list of cards (Q1541 stage 5 working tool)
//   node design/proposal/tools/still-probe.mjs <url> <width> key,key,...
import { chromium } from 'playwright';
const [url, w0, list] = process.argv.slice(2); const w = +w0;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: w, height: w > 600 ? 1000 : 844 } });
await p.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = (q) => (/prefers-reduced-motion/.test(q) ? { matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, onchange: null, dispatchEvent() { return false; } } : mm(q)); });
p.on('pageerror', (e) => console.log('pageerror ' + e.message));
await p.goto(url); await p.waitForTimeout(1200);
await p.evaluate(() => { if (window.SESSION) window.SESSION.smoothScrollBy = (dy, done) => { window.scrollBy(0, dy); if (done) done(); }; });
for (let i = 0; i < 6; i++) { const n = await p.evaluate(() => { const t = [...document.querySelectorAll('#band .sectoggle')].find((b) => b.getAttribute('aria-expanded') === 'false'); if (!t) return 0; t.click(); return 1; }); if (!n) break; await p.waitForTimeout(300); }
const keys = list ? list.split(',') : await p.evaluate(() => [...new Set([...document.querySelectorAll('#band [data-tab], #doc .achip[data-anchor]')].map((e) => e.getAttribute('data-tab') || e.getAttribute('data-anchor')))]);
const measure = (k, open) => p.evaluate(([k, open]) => {
  const R = (r) => r ? [Math.round((r.left + scrollX) * 10) / 10, Math.round((r.top + scrollY) * 10) / 10] : null;
  const tab = document.querySelector('.achip[data-tab="' + CSS.escape(k) + '"]') || document.querySelector('.achip[data-anchor="' + CSS.escape(k) + '"]') ||
    document.querySelector('.clausehead .achip.wmark');
  const g = tab && (tab.querySelector('svg, .mk, .mkg') || tab);
  const firstLine = (el) => { if (!el) return null; const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.nodeValue.trim() && !n.parentElement.closest('.chipcol, .av, .glabel') ? 1 : 3 }); const n = tw.nextNode(); if (!n) return null; const r = document.createRange(); r.setStart(n, n.nodeValue.search(/\S/)); r.setEnd(n, n.nodeValue.search(/\S/) + 1); return r.getClientRects()[0]; };
  let para;
  if (open) { const c = document.querySelector('.gcard, .sugg.setupcard, #charter .sugg, .sugg'); para = c && (c.querySelector(':scope > .clausehead .headclause > .rtext') || c.querySelector('.rtext, .headrule')); }
  else { para = tab && (tab.closest('.anch') || (tab.closest('.cpara') && tab.closest('.cpara').querySelector('.cptext, .memlist')) ); }
  const sh = [...document.querySelectorAll('.desksheets .sheet')].map((s) => { const r = s.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.top + scrollY)]; });
  const docR = document.getElementById('doc').getBoundingClientRect();
  return { tab: R(g && g.getBoundingClientRect()), text: R(firstLine(para)), sheets: sh, col: [Math.round(docR.left), Math.round(docR.width)] };
}, [k, open]);
for (const k of keys) {
  await p.evaluate((k) => { const el = document.querySelector('[data-tab="' + CSS.escape(k) + '"]') || document.querySelector('.achip[data-anchor="' + CSS.escape(k) + '"]'); if (el) el.scrollIntoView({ block: 'center' }); }, k);
  await p.waitForTimeout(150);
  const a = await measure(k, false);
  const ok = await p.evaluate((k) => { const el = document.querySelector('[data-tab="' + CSS.escape(k) + '"]') || document.querySelector('.achip[data-anchor="' + CSS.escape(k) + '"]'); if (!el) return false; el.click(); return true; }, k);
  if (!ok) { console.log(k + ': no tab'); continue; }
  await p.waitForTimeout(400);
  const o = await measure(k, true);
  const d = (x, y) => (x && y ? [Math.round((y[0] - x[0]) * 10) / 10, Math.round((y[1] - x[1]) * 10) / 10] : 'n/a');
  const sheetMoved = JSON.stringify(a.sheets) !== JSON.stringify(o.sheets) ? ' SHEETS ' + JSON.stringify(a.sheets) + '→' + JSON.stringify(o.sheets) : '';
  const colMoved = JSON.stringify(a.col) !== JSON.stringify(o.col) ? ' COL ' + a.col + '→' + o.col : '';
  console.log(k.padEnd(28) + ' tab Δ ' + JSON.stringify(d(a.tab, o.tab)).padEnd(14) + ' head Δ ' + JSON.stringify(d(a.text, o.text)) + sheetMoved + colMoved);
  await p.evaluate(() => { const el = document.querySelector('.clausehead .achip.wmark'); if (el) el.click(); });
  await p.waitForTimeout(300);
}
await b.close();
