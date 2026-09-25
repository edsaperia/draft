// critique-slug.mjs — throwaway (critic): name the document, then open 📍, old and new; measure overlap of the card with the paragraph above
import { chromium } from 'playwright';
const W = +(process.argv[2] || 1600);
const b = await chromium.launch();
for (const [v, path] of [['old', '/session-view.html'], ['new', '/proposal/proto/session-view.html']]) {
  const ctx = await b.newContext({ viewport: { width: W, height: W > 600 ? 1000 : 844 }, reducedMotion: 'reduce', hasTouch: W < 600 });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8197' + path); await p.waitForTimeout(1800);
  console.log(v, 'rail sel', await p.evaluate(() => { const e = [...document.querySelectorAll('*')].find((x) => x.children.length < 3 && /Name the Document/.test(x.textContent) && x.getBoundingClientRect().left > 1100); return e ? e.tagName + '.' + e.className + ' parent ' + e.parentElement.tagName + '.' + e.parentElement.className : 'none'; }));
  await p.click('text=Name the Document'); await p.waitForTimeout(900);
  await p.keyboard.type('Test Charter'); await p.waitForTimeout(500);
  const btn = await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter((x) => /Name it/.test(x.title) && x.getBoundingClientRect().height); const r = bs[0].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p.mouse.move(btn.x, btn.y); await p.mouse.down(); await p.waitForTimeout(2500); await p.mouse.up(); await p.waitForTimeout(1500);
  await p.screenshot({ path: `design/proposal/data/critique/slug-${v}-${W}-0.png` });
  const before = await p.evaluate(() => { const e = [...document.querySelectorAll('.achip')].find((x) => x.dataset.tab === 'title'); const r = e && e.closest('.cpara, p, div').getBoundingClientRect(); return r ? r.bottom : null; });
  await p.click('text=Choose the Link').catch(() => console.log('no link entry')); await p.waitForTimeout(1000);
  await p.screenshot({ path: `design/proposal/data/critique/slug-${v}-${W}-1.png` });
  console.log(v, await p.evaluate(() => { const c = document.querySelector('[data-setupcard="slug"]:not(.achip)'); const r = c && c.getBoundingClientRect(); const t = [...document.querySelectorAll('[data-para], .cpara')].find((x) => /titled/.test(x.textContent)); const tr = t && t.getBoundingClientRect(); return { card: r && [r.top, r.height], cardText: c && c.innerText.replace(/\n+/g, ' | ').slice(0, 300), titlePara: tr && [tr.top, tr.bottom] }; }));
  await ctx.close();
}
await b.close();
