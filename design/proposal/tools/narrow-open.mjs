// narrow-open.mjs — at 390: open the task drawer, tap its first entry, shoot the card (Q1541 stage 5 working tool)
import { chromium } from 'playwright';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await p.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = (q) => (/prefers-reduced-motion/.test(q) ? { matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, onchange: null, dispatchEvent() { return false; } } : mm(q)); });
p.on('pageerror', (e) => console.log('pageerror ' + e.message));
await p.goto(url); await p.waitForTimeout(1500);
await p.click('#drawerright'); await p.waitForTimeout(600);
await p.screenshot({ path: out.replace('.png', '-drawer.png') });
await p.evaluate(() => { const e = document.querySelector('#rail li button'); if (e) e.click(); }); await p.waitForTimeout(900);
await p.screenshot({ path: out });
console.log(await p.evaluate(() => { const c = document.querySelector('.gcard'); return c ? c.getAttribute('data-card') + ' ' + JSON.stringify(c.getBoundingClientRect()) : 'no gcard'; }));
await b.close();
