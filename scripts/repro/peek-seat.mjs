// peek-seat — open a member's page headless from a magic link and print what the
// page is serving: rail entries, constitution sections, tabs, and the page's own
// verdict on the founding predicates. Read-only apart from arriving.
//   node peek-seat.mjs <magic link> [--width 390]
import { chromium } from 'playwright';
import { landOn } from '../lib/walk.mjs';

const link = process.argv[2];
const width = Number((process.argv.find((a) => a.startsWith('--width=')) ?? '').slice(8)) || 1600;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 1000 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await landOn(page, link, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
console.log('url', page.url());
const out = await page.evaluate(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const rail = [...document.querySelectorAll('.qitem')].map((el) => ({
    q: el.dataset.q, text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 80), visible: vis(el) }));
  const heads = [...document.querySelectorAll('#band h2, #band h3, #band .eyebrow, .csec > h2, .csec h3')]
    .map((el) => el.textContent.trim()).filter(Boolean);
  const paras = [...document.querySelectorAll('[data-para]')].map((el) => el.dataset.para);
  const tabs = [...document.querySelectorAll('[data-tab]')].map((el) => el.dataset.tab);
  const rev = window.__REVIEW__ || window.review || null;
  return { rail, heads, paras, tabs, hasReview: !!rev, title: document.title };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
