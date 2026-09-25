// critique-strip.mjs — throwaway (critic): open a card by tab title, then a tab in its strip by title; shot old and new
//   node design/proposal/tools/critique-strip.mjs <width> <query> <first-title> <strip-title-substring> <tag>
import { chromium } from 'playwright';
const [W0, q, first, sub, tag] = process.argv.slice(2); const W = +W0;
const b = await chromium.launch();
for (const [v, path] of [['old', '/session-view.html'], ['new', '/proposal/proto/session-view.html']]) {
  const ctx = await b.newContext({ viewport: { width: W, height: W > 600 ? 1000 : 844 }, reducedMotion: 'reduce', hasTouch: W < 600 });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8197' + path + q); await p.waitForTimeout(1500);
  for (let i = 0; i < 6; i++) { const n = await p.evaluate(() => { const t = [...document.querySelectorAll('.sectoggle')].filter((e) => /Unfold/.test(e.title) && e.getBoundingClientRect().height); t.forEach((e) => e.click()); return t.length; }); if (!n) break; await p.waitForTimeout(400); }
  await p.evaluate((s) => { const e = [...document.querySelectorAll('.achip')].find((x) => (x.title || '').startsWith(s)); e.scrollIntoView({ block: 'center' }); e.click(); }, first); await p.waitForTimeout(900);
  const ok = await p.evaluate((s) => { const e = [...document.querySelectorAll('.achip, button')].find((x) => (x.title || '').includes(s) && x.getBoundingClientRect().height); if (!e) return false; e.click(); return true; }, sub); await p.waitForTimeout(1000);
  const txt = await p.evaluate(() => { const c = [...document.querySelectorAll('.gcard, [data-setupcard]:not(.achip), .sugg[class*=open]')].filter((e) => e.getBoundingClientRect().height > 40).sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0]; if (!c) return ''; c.scrollIntoView({ block: 'start' }); scrollBy(0, -80); return c.innerText.replace(/\n+/g, ' / ').slice(0, 500); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `design/proposal/data/critique/strip-${tag}-${v}-${W}.png` });
  console.log(v, ok, txt);
  await ctx.close();
}
await b.close();
