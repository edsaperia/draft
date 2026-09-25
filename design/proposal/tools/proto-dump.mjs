// proto-dump.mjs — open every tab on a page and print each card's slots as the shell drew them (Q1541 stage 5 working tool)
//   node design/proposal/tools/proto-dump.mjs <url> [width] [--shots=dir] [--only=key,key] [--seat=n]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const url = process.argv[2]; const w = +(process.argv[3] || 1600);
const arg = (n) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.split('=').slice(1).join('=') : null; };
const shots = arg('shots'); const only = arg('only') ? arg('only').split(',') : null; const seat = arg('seat');
if (shots) mkdirSync(shots, { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: w, height: w > 600 ? 1000 : 844 } });
await p.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = (q) => (/prefers-reduced-motion/.test(q) ? { matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, onchange: null, dispatchEvent() { return false; } } : mm(q)); });
const errs = []; p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
await p.goto(url); await p.waitForTimeout(1200);
if (seat) { await p.selectOption('#devwho', seat); await p.waitForTimeout(800); }
for (let i = 0; i < 6; i++) { const n = await p.evaluate(() => { const t = [...document.querySelectorAll('#band .sectoggle')].find((b) => b.getAttribute('aria-expanded') === 'false'); if (!t) return 0; t.click(); return 1; }); if (!n) break; await p.waitForTimeout(300); }
const keys = await p.evaluate(() => [...new Set([...document.querySelectorAll('#band [data-tab], #titlepara [data-tab], #doc .achip[data-anchor], #ridetab [data-tab]')].map((e) => e.getAttribute('data-tab') || e.getAttribute('data-anchor')))]);
const seenK = new Set(keys); const stripOf = new Map();
for (let ki = 0; ki < keys.length; ki++) { const k = keys[ki];
  if (only && !only.includes(k)) continue;
  if (!stripOf.has(k)) await p.evaluate(() => window.scrollTo(0, 0));
  const ok = await p.evaluate((k) => { const el = document.querySelector('.clausehead .chipcol [data-tab="' + CSS.escape(k) + '"]') || document.querySelector('[data-tab="' + CSS.escape(k) + '"]') || document.querySelector('.achip[data-anchor="' + CSS.escape(k) + '"]'); if (!el) return false; el.click(); return true; }, k);
  if (!ok) continue;
  await p.waitForTimeout(350);
  const r = await p.evaluate(() => {
    const c = document.querySelector('.gcard') || document.querySelector('.sugg');
    if (!c) return null;
    const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim().slice(0, 90) : '');
    const seq = [...c.children].map((e) => e.classList.contains('ghair') ? '—' : (e.getAttribute('data-slot') || e.className) + (e.hidden ? '(hidden)' : ''));
    const row = c.querySelector(':scope > [data-slot=row]');
    return { g: c.classList.contains('gcard'), shape: c.getAttribute('data-gshape'), seq: seq.join(' '),
      head: t(c.querySelector(':scope > [data-slot=head] .rtext')), fact: t(c.querySelector(':scope > [data-slot=fact]')),
      row: row ? [...row.querySelectorAll('button')].filter((b) => !b.hidden).map((b) => (b.querySelector('svg[data-char]') || {}).getAttribute?.('data-char') || b.innerText.trim()).join(' ') : '',
      dropped: c.getAttribute('data-gdropped') || '' };
  });
  console.log('## ' + k + (r ? '  [' + r.shape + ']  ' + r.seq + '\n   head: ' + r.head + (r.fact ? '\n   fact: ' + r.fact : '') + '\n   row: ' + r.row + (r.dropped ? '\n   dropped: ' + r.dropped : '') : '  (no card)'));
  for (const t of await p.evaluate(() => [...document.querySelectorAll('.gcard .chipcol .achip[data-tab], .sugg .chipcol .achip[data-tab]')].map((e) => e.getAttribute('data-tab')))) if (!seenK.has(t)) { seenK.add(t); keys.splice(ki + 1, 0, t); stripOf.set(t, k); }
  if (shots && r) { const box = await p.evaluate(() => { const c = document.querySelector('.gcard') || document.querySelector('.sugg'); const r0 = c.getBoundingClientRect(); window.scrollBy(0, r0.top - 140); const r = c.getBoundingClientRect(); return { x: Math.max(0, r.left - 70), y: Math.max(0, r.top - 12), width: Math.min(r.width + 90, innerWidth), height: Math.min(r.height + 24, 3000) }; }); try { await p.screenshot({ path: shots + '/' + k.replace(/[^A-Za-z0-9_-]+/g, '_') + '-' + w + '.png', clip: box }); } catch (e) { console.log('shot fail ' + e.message); } }
  if (!(keys[ki + 1] && stripOf.get(keys[ki + 1]) && (stripOf.get(keys[ki + 1]) === k || stripOf.get(keys[ki + 1]) === stripOf.get(k)))) await p.evaluate((k) => { const el = document.querySelector('.clausehead .achip.wmark') || document.querySelector('[data-tab="' + CSS.escape(k) + '"]'); if (el) el.click(); }, k);
  await p.waitForTimeout(250);
}
console.log(errs.join('\n'));
await b.close();
