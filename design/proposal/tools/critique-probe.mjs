import { chromium } from 'playwright';
const b = await chromium.launch();
for (const path of ['/proposal/proto/session-view.html']) {
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  await p.goto('http://localhost:8197' + path + '?fixture=session&band=1'); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector("#band .sectoggle").click()); await p.waitForTimeout(800); console.log(await p.evaluate(() => { const band = document.querySelector('#band'); if (!band) return 'noband'; return [...band.querySelectorAll('[title], button, [data-q], [data-sec]')].slice(0, 80).map((e) => e.tagName + '.' + e.className + ' ' + JSON.stringify(e.dataset) + ' ' + (e.title || '').slice(0, 40)).join('\n'); }));
}
await b.close();
