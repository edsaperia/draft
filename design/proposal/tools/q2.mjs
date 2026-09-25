// q2.mjs — open one band card on the band fixture and evaluate an expression against it (scratch)
import { chromium } from 'playwright';
const [url, key, expr] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
p.on('pageerror', (e) => console.log('pageerror ' + e.message));
await p.goto(url); await p.waitForTimeout(1200);
for (let i = 0; i < 6; i++) { const n = await p.evaluate(() => { const t = [...document.querySelectorAll('#band .sectoggle')].find((b) => b.getAttribute('aria-expanded') === 'false'); if (!t) return 0; t.click(); return 1; }); if (!n) break; await p.waitForTimeout(300); }
if (key) { await p.evaluate((k) => { const el = document.querySelector('[data-tab="' + CSS.escape(k) + '"]') || document.querySelector('.achip[data-anchor="' + CSS.escape(k) + '"]'); el && el.click(); }, key); await p.waitForTimeout(400); }
console.log(await p.evaluate(expr));
await b.close();
