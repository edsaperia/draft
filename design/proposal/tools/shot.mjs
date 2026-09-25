// shot.mjs — a full-window screenshot of a page at a width, optionally after a click (Q1541 stage 5 working tool)
//   node design/proposal/tools/shot.mjs <url> <width> <out.png> [css-selector-to-click]
import { chromium } from 'playwright';
const [url, w0, out, click] = process.argv.slice(2); const w = +w0;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: w, height: w > 600 ? 1000 : 844 } });
await p.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = (q) => (/prefers-reduced-motion/.test(q) ? { matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, onchange: null, dispatchEvent() { return false; } } : mm(q)); });
p.on('pageerror', (e) => console.log('pageerror ' + e.message));
await p.goto(url); await p.waitForTimeout(1500);
if (click) { await p.evaluate((s) => { const e = document.querySelector(s); if (e) e.click(); else console.log('no ' + s); }, click); await p.waitForTimeout(700); }
await p.screenshot({ path: out });
await b.close();
