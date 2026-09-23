// peek-tab — open a seat from a magic link, press one gutter tab, and print the
// card it opens: its text and controls. Read-only apart from arriving.
//   node peek-tab.mjs <magic link> <tab key e.g. invite>
import { chromium } from 'playwright';
import { landOn } from '../lib/walk.mjs';

const [link, tab] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 160)); });
await landOn(page, link, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const out = await page.evaluate(async (tab) => {
  const rail = [...document.querySelectorAll('.qitem')].map((el) => el.dataset.q);
  const tabs = [...document.querySelectorAll('[data-tab]')].map((el) => el.dataset.tab);
  const t = document.querySelector('[data-tab="' + tab + '"]');
  if (!t) return { rail, tabs, card: 'no tab ' + tab };
  const r = t.getBoundingClientRect();
  t.click();
  await new Promise((s) => setTimeout(s, 800));
  const card = document.querySelector('.setupcard');
  if (!card) return { rail, tabs, tabBox: [r.x, r.y, r.width, r.height], card: 'tab pressed, no .setupcard; open card: ' + (document.querySelector('.card, .decision, [data-card-open]')?.className ?? 'none') };
  const ctl = [...card.querySelectorAll('input, textarea, button, [contenteditable=true]')]
    .map((e) => e.tagName.toLowerCase() + (e.dataset.act ? '#' + e.dataset.act : '') + (e.disabled ? '(disabled)' : '') + (e.placeholder || e.dataset.ph ? '[' + (e.placeholder || e.dataset.ph) + ']' : '') + (e.title ? '{' + e.title + '}' : ''));
  return { rail, tabs, card: card.dataset.setupcard, text: card.textContent.trim().replace(/\s+/g, ' ').slice(0, 500), controls: ctl };
}, tab);
console.log(JSON.stringify(out, null, 1));
if (logs.length) console.log('console:', logs.slice(0, 10).join('\n  '));
await browser.close();
