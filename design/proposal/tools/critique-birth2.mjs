// critique-birth2.mjs — throwaway (critic): the founding by keyboard — each rail task opened, typed into, committed; shots per step
import { chromium } from 'playwright';
const W = +(process.argv[2] || 1600);
const b = await chromium.launch();
const vals = ['Test Charter', 'ed@example.com', 'ed@example.com', 'x'];
for (const [v, path] of [['old', '/session-view.html'], ['new', '/proposal/proto/session-view.html']]) {
  const ctx = await b.newContext({ viewport: { width: W, height: W > 600 ? 1000 : 844 }, reducedMotion: 'reduce', hasTouch: W < 600 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => console.log(v, 'pageerror', e.message));
  await p.goto('http://localhost:8197' + path); await p.waitForTimeout(1800);
  for (let step = 0; step < 5; step++) {
    const rail = await p.evaluate(() => { const e = [...document.querySelectorAll('#queue li, .needs li')].find((x) => x.getBoundingClientRect().height); if (!e) return null; e.click(); return e.textContent.trim().slice(0, 50); });
    await p.waitForTimeout(1000);
    const info = await p.evaluate(() => { const c = document.querySelector('[data-setupcard].open, .gcard, .setcard.open') || [...document.querySelectorAll('[data-setupcard]:not(.achip)')].sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0]; if (!c) return null; const r = c.getBoundingClientRect(); return { key: c.dataset.setupcard, txt: c.innerText.replace(/\n+/g, ' | ').slice(0, 400), btns: [...c.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().height).map((x) => (x.textContent.trim() || '') + '{' + x.title + '}' + (x.disabled ? '[dark]' : '')), r: [r.top, r.height] }; });
    console.log(v, step, 'rail', rail, JSON.stringify(info));
    await p.screenshot({ path: `design/proposal/data/critique/birth2-${v}-${W}-s${step}a.png` });
    const ed = await p.$('.gcard [contenteditable="true"], .gcard [contenteditable="plaintext-only"], .gcard input:visible, [data-setupcard] [contenteditable="true"], [data-setupcard] [contenteditable="plaintext-only"], [data-setupcard] input:visible');
    if (ed) { await ed.click(); await p.keyboard.type(vals[step] || 'x'); await p.waitForTimeout(700); }
    await p.screenshot({ path: `design/proposal/data/critique/birth2-${v}-${W}-s${step}b.png` });
    const btn = await p.evaluate(() => { const c = document.querySelector('[data-setupcard].open, .gcard') || document; const bs = [...c.querySelectorAll('button:not([disabled])')].filter((x) => x.getBoundingClientRect().height && !/🗑|close|back/i.test(x.textContent + x.title)); const t = bs[bs.length - 1]; if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: t.title }; });
    if (btn) { await p.mouse.move(btn.x, btn.y); await p.mouse.down(); await p.waitForTimeout(1300); await p.mouse.up(); await p.waitForTimeout(1200); }
    console.log(v, step, 'pressed', btn && btn.t);
    await p.screenshot({ path: `design/proposal/data/critique/birth2-${v}-${W}-s${step}c.png` });
  }
  await ctx.close();
}
await b.close();
