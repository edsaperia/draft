// Q1467 (Ed, 2026-09-19, the residency room: *I can't edit headings in the
// text. the #s are not editable*). Drives the fixture's edit mode over a
// heading four ways and prints what the lane holds after each:
//   node scripts/repro/heading-marker.mjs [base]   (default http://127.0.0.1:8212, `npm run design -- 8212`)
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://127.0.0.1:8212';
const b = await chromium.launch();
const tries = [
  ['click the # itself, then type x', async (p, h) => { const r = await h.evaluate((el) => { const g = document.createRange(); g.selectNodeContents(el.querySelector('.mdmark')); const q = g.getBoundingClientRect(); return { x: q.left, y: q.top, width: q.width, height: q.height }; }); await p.mouse.click(r.x + 3, r.y + r.height / 2); await p.keyboard.type('x'); }],
  ['click the words, Home, Backspace', async (p, h) => { const r = await h.boundingBox(); await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2); await p.keyboard.press('Home'); await p.keyboard.press('Backspace'); }],
  ['click the words, Home, type #', async (p, h) => { const r = await h.boundingBox(); await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2); await p.keyboard.press('Home'); await p.keyboard.type('#'); }],
  ['click the words, type x, then Home Home Delete', async (p, h) => { const r = await h.boundingBox(); await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2); await p.keyboard.type('x'); await p.waitForTimeout(500); await p.keyboard.press('Home'); await p.keyboard.press('Delete'); }],
];
for (const [name, act] of tries) {
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(BASE + '/session-view.html?fixture=session'); await p.waitForSelector('#charter'); await p.waitForTimeout(1200);
  // 📝 is the door
  await p.click('#editdoor [data-act="edit-door"]');
  await p.waitForTimeout(800);
  await p.evaluate(() => { const m = [...document.querySelectorAll('#charter .mdmark')].find((x) => x.parentElement.getClientRects().length && /^#/.test(x.textContent)); if (m) m.parentElement.setAttribute('data-repro', '1'); });
  const h = await p.$('[data-repro="1"]');
  if (!h) { console.log(name, '· no heading with a marker found in edit mode'); await p.close(); continue; }
  await h.scrollIntoViewIfNeeded();
  await act(p, h); await p.waitForTimeout(900);
  const out = await p.evaluate(() => {
    const lane = document.querySelector('.editcard [contenteditable="true"]');
    const a = document.activeElement;
    return { lane: lane ? lane.innerText.slice(0, 60) : null, active: a ? (a.id || a.className || a.tagName).toString().slice(0, 50) : null,
      draft: (window.SESSION.SUGGS || []).filter((s) => s.unproposed).map((s) => (s.sites || []).map((x) => (x.text ?? x.draft ?? '').slice(0, 60))) };
  });
  console.log(name, '·', JSON.stringify(out), errs.length ? errs : '');
  await p.close();
}
await b.close();
