// critique-still.mjs — throwaway (critic): does the pressed tab / the paragraph's first line / the line above move when a card opens? old vs new
import { chromium } from 'playwright';
const [W0, q = '?fixture=session&band=1'] = process.argv.slice(2); const W = +W0 || 1600;
const b = await chromium.launch();
const rows = [];
for (const [v, path] of [['old', '/session-view.html'], ['new', '/proposal/proto/session-view.html']]) {
  const ctx = await b.newContext({ viewport: { width: W, height: W > 600 ? 1000 : 844 }, reducedMotion: 'reduce', hasTouch: W < 600 });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8197' + path + q); await p.waitForTimeout(1500);
  for (let i = 0; i < 6; i++) { const n = await p.evaluate(() => { const t = [...document.querySelectorAll('.sectoggle')].filter((e) => /Unfold/.test(e.title) && e.getBoundingClientRect().height); t.forEach((e) => e.click()); return t.length; }); if (!n) break; await p.waitForTimeout(400); }
  const titles = await p.evaluate(() => [...document.querySelectorAll('.achip:not(.behind)')].map((e) => e.title).filter(Boolean));
  for (const t of titles) {
    const pre = await p.evaluate((t) => {
      const e = [...document.querySelectorAll('.achip:not(.behind)')].find((x) => x.title === t); if (!e) return null;
      e.scrollIntoView({ block: 'center' });
      const para = e.closest('[data-para], .cpara, .anch, p, li, div');
      // the first text line of the paragraph the tab hangs on: a range over its first text node
      const host = document.querySelector('[data-para="' + (e.dataset.tab || '') + '"]') || e.parentElement.parentElement;
      const r = e.getBoundingClientRect();
      window.__tab = t;
      // the element just above the tab's paragraph, to see whether it moves
      const above = document.elementFromPoint(r.left + 200, r.top - 30);
      window.__above = above; const ar = above && above.getBoundingClientRect();
      return { tab: [r.left, r.top], above: ar ? [ar.left, ar.top] : null, aboveTag: above && above.className };
    }, t);
    if (!pre) continue;
    await p.evaluate((t) => [...document.querySelectorAll('.achip:not(.behind)')].find((x) => x.title === t).click(), t);
    await p.waitForTimeout(900);
    const post = await p.evaluate(() => {
      const act = [...document.querySelectorAll('.achip')].find((x) => /close/i.test(x.title) && x.getBoundingClientRect().height);
      const r = act && act.getBoundingClientRect();
      const ar = window.__above && window.__above.isConnected ? window.__above.getBoundingClientRect() : null;
      const card = [...document.querySelectorAll('.gcard, .sugg[class*=open], [data-setupcard].open')].filter((e) => e.getBoundingClientRect().height > 40)[0];
      const cr = card && card.getBoundingClientRect();
      return { tab: r ? [r.left, r.top] : null, above: ar ? [ar.left, ar.top, ar.bottom] : null, cardTop: cr && cr.top };
    });
    rows.push({ v, t: t.slice(0, 45), dTab: post.tab ? [Math.round(post.tab[0] - pre.tab[0]), Math.round(post.tab[1] - pre.tab[1])] : 'gone', dAbove: pre.above && post.above ? Math.round(post.above[1] - pre.above[1]) : 'n/a', overlap: post.above && post.cardTop != null ? Math.round(post.above[2] - post.cardTop) : null });
    await p.evaluate(() => { const act = [...document.querySelectorAll('.achip')].find((x) => /close/i.test(x.title) && x.getBoundingClientRect().height); if (act) act.click(); });
    await p.waitForTimeout(700);
  }
  await ctx.close();
}
await b.close();
const by = {}; for (const r of rows) (by[r.t] ||= {})[r.v] = r;
for (const [t, o] of Object.entries(by)) console.log(t.padEnd(46), 'old tab', JSON.stringify(o.old?.dTab), 'above', o.old?.dAbove, '| new tab', JSON.stringify(o.new?.dTab), 'above', o.new?.dAbove, 'overlapAbove', o.new?.overlap);
