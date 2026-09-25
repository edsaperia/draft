// smoke.mjs — open a page, report console errors and card counts (Q1541 stage 5 scratch tool)
import { chromium } from 'playwright';
const url = process.argv[2]; const w = +(process.argv[3] || 1600);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: w, height: w > 600 ? 1000 : 844 } });
const errs = []; p.on('pageerror', (e) => errs.push('pageerror ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(url); await p.waitForTimeout(1500);
const r = await p.evaluate(() => ({ tabs: document.querySelectorAll('.achip').length, rail: document.querySelectorAll('#queue li').length, band: !!document.getElementById('band') }));
console.log(JSON.stringify(r)); console.log(errs.join('\n'));
await b.close();
