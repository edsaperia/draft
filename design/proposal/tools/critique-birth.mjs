// critique-birth.mjs — throwaway (critic): the founding — open 🪶 from the rail, type a title, commit, then the next task; shots each step
import { chromium } from 'playwright';
const W = +(process.argv[2] || 1600);
const b = await chromium.launch();
for (const [v, path] of [['old', '/session-view.html'], ['new', '/proposal/proto/session-view.html']]) {
  const ctx = await b.newContext({ viewport: { width: W, height: W > 600 ? 1000 : 844 }, reducedMotion: 'reduce', hasTouch: W < 600 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => console.log(v, 'pageerror', e.message));
  await p.goto('http://localhost:8197' + path); await p.waitForTimeout(1800);
  if (v === 'new') console.log('PROTO NOTE', await p.evaluate(() => { const d = [...document.querySelectorAll('details, div')].find((x) => /what is not converted/.test(x.textContent) && x.textContent.length < 4000); return d ? d.textContent.replace(/\s+/g, ' ') : 'none'; }));
  const dump = async (n) => console.log(v, n, await p.evaluate(() => { const c = [...document.querySelectorAll('[data-setupcard]:not(.achip), .gcard')].filter((e) => e.getBoundingClientRect().height > 40).sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0]; return c ? c.innerText.replace(/\n+/g, ' | ').slice(0, 600) + ' BTNS ' + [...c.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().height).map((x) => (x.textContent.trim() || x.title) + (x.disabled ? '[dark]' : '')).join(',') : 'none'; }));
  for (let step = 0; step < 6; step++) {
    const clicked = await p.evaluate(() => { const e = document.querySelector('#queue li, .needs li, .qitem'); if (!e) return null; const t = e.textContent.trim().slice(0, 40); (e.querySelector('button, a') || e).click(); return t; });
    await p.waitForTimeout(900);
    await p.screenshot({ path: `design/proposal/data/critique/birth-${v}-${W}-s${step}a.png` });
    console.log(v, 'step', step, 'rail:', clicked); await dump('a');
    const inp = await p.$('.gcard input[type=text]:visible, [data-setupcard] input[type=text]:visible, [data-setupcard] input[type=email]:visible, .gcard input[type=email]:visible');
    if (inp) { await inp.fill(step === 0 ? 'Test Charter' : step === 2 ? 'ed@example.com' : 'test-charter-x'); await p.waitForTimeout(600); }
    await p.screenshot({ path: `design/proposal/data/critique/birth-${v}-${W}-s${step}b.png` }); await dump('b');
    const pressed = await p.evaluate(() => { const c = document.querySelector('[data-setupcard].open, .gcard') || document; const bs = [...c.querySelectorAll('button:not([disabled])')].filter((x) => x.getBoundingClientRect().height && !/🗑|close/i.test(x.textContent + x.title)); const t = bs[bs.length - 1]; if (!t) return null; t.click(); return t.textContent.trim() || t.title; });
    // a hold: press and hold the commit if a click did nothing
    await p.waitForTimeout(1500);
    console.log(v, 'pressed', pressed);
    if (!clicked) break;
  }
  await ctx.close();
}
await b.close();
