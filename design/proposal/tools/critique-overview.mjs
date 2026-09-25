// critique-overview.mjs — throwaway (critic): full-page shots of old vs proto at both widths, and the list of tabs
import { chromium } from 'playwright';
const B = 'http://localhost:8197';
const OUT = 'design/proposal/data/critique/';
const qs = ['?fixture=session', '?fixture=session&band=1', '?fixture=session&closed=1'];
const b = await chromium.launch();
for (const [w, h] of [[1600, 1000], [390, 844]]) for (const [tag, path] of [['old', '/session-view.html'], ['new', '/proposal/proto/session-view.html']]) for (const q of qs) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(B + path + q); await p.waitForTimeout(1800);
  const name = tag + '-' + q.replace(/[?&=]/g, '_') + '-' + w;
  await p.screenshot({ path: OUT + name + '.png', fullPage: true });
  const tabs = await p.evaluate(() => [...document.querySelectorAll('.achip, [data-card], [data-setupcard]')].slice(0, 400).map((e) => (e.className + '|' + (e.dataset.card || e.dataset.setupcard || e.dataset.q || '') + '|' + (e.title || '').slice(0, 50) + '|' + e.textContent.trim().slice(0, 12))));
  console.log('##', name, 'errs', errs.length, errs.slice(0, 3).join(' / '), 'tabs', tabs.length);
  if (w === 1600) console.log(tabs.slice(0, 80).join('\n'));
  await ctx.close();
}
await b.close();
