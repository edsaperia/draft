// critique-walk.mjs — throwaway (critic): open every tab on old and proto, screenshot each card, dump its text and the tab's movement
//   node design/proposal/tools/critique-walk.mjs <width> <query>
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const [w0, q = '?fixture=session&band=1'] = process.argv.slice(2); const W = +w0; const H = W > 600 ? 1000 : 844;
const OUT = 'design/proposal/data/critique/';
const qtag = q.replace(/[?&=]/g, '_');
const b = await chromium.launch();
const res = {};
for (const [tag, path] of [['old', '/session-view.html'], ['new', '/proposal/proto/session-view.html']]) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, reducedMotion: 'reduce', hasTouch: W < 600 });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8197' + path + q); await p.waitForTimeout(1500);
  const unfold = async () => { for (let i = 0; i < 6; i++) { const n = await p.evaluate(() => { const t = [...document.querySelectorAll('.sectoggle')].filter((e) => /Unfold/.test(e.title) && e.getBoundingClientRect().height); t.forEach((e) => e.click()); return t.length; }); if (!n) break; await p.waitForTimeout(400); } };
  await unfold();
  const keys = await p.evaluate(() => [...document.querySelectorAll('.achip:not(.behind)')].map((e, i) => ({ i, key: e.dataset.tab || '', title: e.title || '', band: !!e.closest('#band') })).filter((k) => k.title));
  const cards = [];
  for (const k of keys) {
    await p.goto('http://localhost:8197' + path + q); await p.waitForTimeout(900); await unfold();
    const before = await p.evaluate((k) => { const e = [...document.querySelectorAll('.achip:not(.behind)')].find((x) => x.title === k.title && (x.dataset.tab || '') === k.key); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top }; }, k);
    if (!before) continue;
    await p.evaluate((k) => { const e = [...document.querySelectorAll('.achip:not(.behind)')].find((x) => x.title === k.title && (x.dataset.tab || '') === k.key); e.click(); }, k);
    await p.waitForTimeout(900);
    const info = await p.evaluate(() => {
      const c = [...document.querySelectorAll('.sugg.sealed-open, .sugg.open, .gcard, [data-setupcard]:not(.achip), .sugg[class*="open"], .csetcard, .setcard')]
        .filter((e) => e.getBoundingClientRect().height > 40 && !e.closest('#queue, .queue, #toc') && !e.classList.contains('achip'))
        .sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
      if (!c) return null;
      const r = c.getBoundingClientRect();
      const act = document.querySelector('.achip.active, .achip.on, .achip.open, .achip[aria-pressed="true"]');
      const ar = act && act.getBoundingClientRect();
      const btns = [...c.querySelectorAll('button, [role=button], .lanepick')].filter((x) => x.getBoundingClientRect().height).map((x) => (x.textContent.trim() || (x.querySelector('svg[data-char]') || {}).getAttribute?.('data-char') || '') + (x.disabled || x.getAttribute('aria-disabled') === 'true' ? '[dark]' : '') + (x.title ? '{' + x.title.slice(0, 70) + '}' : ''));
      return { cls: c.className, key: c.dataset.card || c.dataset.setupcard, rect: [r.left, r.top + scrollY, r.width, r.height], text: c.innerText.replace(/\n{2,}/g, '\n').slice(0, 1500), btns, act: ar ? { x: ar.left, y: ar.top } : null };
    });
    if (!info) { cards.push({ ...k, missing: true }); continue; }
    const file = tag + qtag + '-' + W + '-' + String(k.i).padStart(2, '0') + '-' + (k.key || 'c') + '.png';
    try { await p.screenshot({ path: OUT + file, clip: { x: Math.max(0, info.rect[0] - 60), y: info.rect[1] - 20, width: Math.min(W, info.rect[2] + 120), height: Math.min(1800, info.rect[3] + 40) }, fullPage: true }); } catch (e) { info.shotErr = e.message; }
    cards.push({ ...k, file, before, ...info });
  }
  res[tag] = { errs, cards };
  await ctx.close();
}
await b.close();
writeFileSync(OUT + 'walk' + qtag + '-' + W + '.json', JSON.stringify(res, null, 1));
console.log('old', res.old.cards.length, 'new', res.new.cards.length, 'errs', res.old.errs.length, res.new.errs.length);
