// critique-band.mjs — throwaway (critic): the band unfolded, no card open, old and new; viewport shots scrolled through
import { chromium } from 'playwright';
const [W0, q = '?fixture=session&band=1'] = process.argv.slice(2); const W = +W0 || 1600;
const b = await chromium.launch();
for (const [tag, path] of [['old', '/session-view.html'], ['new', '/proposal/proto/session-view.html']]) {
  const p = await b.newPage({ viewport: { width: W, height: W > 600 ? 1000 : 844 } });
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.goto('http://localhost:8197' + path + q); await p.waitForTimeout(1500);
  for (let i = 0; i < 6; i++) { const n = await p.evaluate(() => { const t = [...document.querySelectorAll('#band .sectoggle')].filter((e) => /Unfold/.test(e.title)); t.forEach((e) => e.click()); return t.length; }); if (!n) break; await p.waitForTimeout(400); }
  const h = await p.evaluate(() => { const b = document.querySelector('#band'); const r = b.getBoundingClientRect(); return [r.top + scrollY, r.height]; });
  for (let y = 0, k = 0; y < h[0] + h[1] && k < 5; y += 900, k++) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(200); await p.screenshot({ path: 'design/proposal/data/critique/band-' + tag + '-' + W + '-' + k + '.png' }); }
}
await b.close();
