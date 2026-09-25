// critique-one.mjs — throwaway (critic): open one tab by title on old and new, screenshot the viewport around it
//   node design/proposal/tools/critique-one.mjs <width> <query> <title-substring> <tag>
import { chromium } from 'playwright';
const [W0, q, sub, tag] = process.argv.slice(2); const W = +W0;
const b = await chromium.launch();
for (const [v, path] of [['old', '/session-view.html'], ['new', '/proposal/proto/session-view.html']]) {
  const ctx = await b.newContext({ viewport: { width: W, height: W > 600 ? 1000 : 844 }, reducedMotion: 'reduce', hasTouch: W < 600 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => console.log(v, 'pageerror', e.message));
  await p.goto('http://localhost:8197' + path + q); await p.waitForTimeout(1500);
  for (let i = 0; i < 6; i++) { const n = await p.evaluate(() => { const t = [...document.querySelectorAll('.sectoggle')].filter((e) => /Unfold/.test(e.title) && e.getBoundingClientRect().height); t.forEach((e) => e.click()); return t.length; }); if (!n) break; await p.waitForTimeout(400); }
  const ok = await p.evaluate((s) => { const e = [...document.querySelectorAll('.achip:not(.behind), .needs li, [data-q], .clock')].find((x) => (x.title || x.textContent).includes(s)); if (!e) return false; e.scrollIntoView({ block: 'center' }); e.click(); return true; }, sub);
  await p.waitForTimeout(1000);
  await p.evaluate(() => { const c = document.querySelector('.gcard, .sugg.sealed-open, .sugg[class*="open"], .editcard, [data-setupcard].open'); if (c) c.scrollIntoView({ block: 'start' }); scrollBy(0, -60); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'design/proposal/data/critique/one-' + tag + '-' + v + '-' + W + '.png' });
  console.log(v, ok);
  await ctx.close();
}
await b.close();
