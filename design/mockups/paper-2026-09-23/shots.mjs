/**
 * shots.mjs — the paper-on-a-desk mockup's screenshots (Q1516 (6)).
 *
 *   node design/mockups/paper-2026-09-23/shots.mjs http://localhost:8177
 *
 * Against `npm run design`'s address. The session fixture with the band
 * shown (`?fixture=session&band=1`), the Rules section unfolded, at 1600×1000
 * and 390×844, each view with the switch off and on (`&paper=1`); plus the
 * founding page's first minute at 1600. Writes PNGs beside this file.
 */
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.argv[2] || 'http://localhost:8177').replace(/\/$/, '');
const OUT = dirname(fileURLToPath(import.meta.url));
const SIZES = { desk: { width: 1600, height: 1000 }, phone: { width: 390, height: 844 } };
const RULES_CARD = 'rate';            // ⏱️ Proposal Rate, a settled setting
const TEXT_CARD = 'quick-armchair';   // 💡 The Common Room, a pair to judge

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const errors = [];

async function fresh(size, paper, query = '?fixture=session&band=1') {
  const page = await browser.newPage({ viewport: SIZES[size], deviceScaleFactor: size === 'phone' ? 2 : 1 });
  page.on('pageerror', (e) => errors.push(size + (paper ? ' paper' : ' plain') + ': ' + e.message));
  await page.goto(BASE + '/session-view.html' + query + (paper ? (query ? '&' : '?') + 'paper=1' : ''));
  await sleep(2200);
  // the stagehand's dropdown stands over the phone's text; off the shots
  // (both sides alike) except on the founding page, where ⏩ is pressed
  if (query) await page.addStyleTag({ content: '.devswitch { display: none !important; }' });
  return page;
}
async function unfoldRules(page) {
  await page.evaluate(() => {
    const t = document.querySelector('#pile-constitution .sectoggle');
    if (t && t.getAttribute('aria-expanded') !== 'true') t.click();
  });
  await sleep(700);
}
async function shot(page, name) {
  await sleep(500);
  await page.screenshot({ path: join(OUT, name + '.png') });
  console.log('  ' + name + '.png');
}
// scroll so the element's top stands at a fraction of the window
async function scrollTo(page, sel, at = 0.4) {
  await page.evaluate(([s, a]) => {
    const el = document.querySelector(s);
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight * a);
  }, [sel, at]);
  await sleep(600);
}

for (const size of Object.keys(SIZES)) {
  for (const paper of [false, true]) {
    const tag = size + '-' + (paper ? 'paper' : 'plain');
    console.log(tag);
    let page = await fresh(size, paper);
    await unfoldRules(page);
    await shot(page, tag + '-1-top');
    await scrollTo(page, '.cpara.docsep', size === 'phone' ? 0.45 : 0.5);
    await shot(page, tag + '-2-break');
    // a setting card on the Rules sheet
    await page.evaluate((k) => document.querySelector('#band .achip[data-tab="' + k + '"]').click(), RULES_CARD);
    await sleep(1600);
    await scrollTo(page, '#band .setupcard', size === 'phone' ? 0.12 : 0.2);
    await shot(page, tag + '-3-rules-card');
    await page.close();
    // a race card on the Text sheet, opened from its rail entry
    page = await fresh(size, paper);
    await unfoldRules(page);
    await page.evaluate((id) => window.SESSION.toggle(id, true), TEXT_CARD);
    await sleep(2200);
    await shot(page, tag + '-4-text-card');
    if (size === 'phone') {
      await page.close();
      page = await fresh(size, paper);
      await unfoldRules(page);
      await page.click('#drawerleft');
      await sleep(800);
      await shot(page, tag + '-5-contents-drawer');
    }
    await page.close();
  }
}
// the founding page's first minute: one sheet, no break yet
for (const paper of [false, true]) {
  const page = await fresh('desk', paper, '');
  await shot(page, 'desk-' + (paper ? 'paper' : 'plain') + '-6-founding');
  // ⏩ settles the founding: the Rules exist, and the break with them
  await page.click('#devff');
  await sleep(3000);
  await scrollTo(page, '.cpara.docsep', 0.5);
  await shot(page, 'desk-' + (paper ? 'paper' : 'plain') + '-7-founded-break');
  await page.close();
}
await browser.close();
if (errors.length) { console.log('PAGE ERRORS:\n' + errors.join('\n')); process.exitCode = 1; }
