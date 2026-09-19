#!/usr/bin/env node
/**
 * propose-edit-wakes — **a draft begun from a proposal's own ✏️ *propose edit* wakes its
 * commit as it is typed** (Q1476; Ed's screenshot from `docs.vote/d/tea`, 2026-09-19: *why
 * can't I submit — after a wait then I could*, the wallet not empty).
 *
 *   npm run design -- 8263
 *   node scripts/repro/propose-edit-wakes.mjs http://127.0.0.1:8263
 *
 * The draft is seeded with the wording it starts from, so its card is born with the ✏️ greyed
 * — nothing has changed yet. `syncProposeCtls` is what wakes it on every lane input (Q1461),
 * and it returns at once outside 📝 edit mode; *propose edit* opens a draft without entering
 * edit mode, so the button slept until some other render redrew it.
 *
 * Exit 0 only if every check passes; 1 on a failure, 2 on a broken set-up.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:8263';
const say = (s) => console.log(s);
const fails = [];
const check = (name, ok, detail) => { say((ok ? 'PASS · ' : 'FAIL · ') + name + (ok ? '' : ' · ' + detail)); if (!ok) fails.push(name); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(BASE + '/session-view.html?fixture=session');
await page.waitForSelector('#charter', { state: 'attached' });
await page.waitForTimeout(1500);

// open cards from the rail until one carries a *propose edit*
const opened = await page.evaluate(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const q of [...document.querySelectorAll('#rail button[data-q]')].map((b) => b.dataset.q).slice(0, 40)) {
    const b = document.querySelector('#rail button[data-q="' + q + '"]');
    if (!b) continue;
    b.click(); await wait(900);
    if (document.querySelector('[data-propose-from]')) return true;
  }
  return false;
});
if (!opened) { say('SET-UP · no card with a propose-edit lane could be opened'); await browser.close(); process.exit(2); }
await page.click('[data-propose-from]');
await page.waitForTimeout(1200);
const state = () => page.evaluate(() => {
  const b = document.querySelector('.sugg [data-act="draft-propose"]:not([data-pen])');
  const lane = document.querySelector('.sugg [data-lane]');
  return { button: !!b, disabled: b ? b.disabled : null, title: b ? b.title : null, lane: !!lane,
    editMode: document.body.className + ' | ' + (document.getElementById('doc') || {}).className };
});
const born = await state();
if (!born.button || !born.lane) { say('SET-UP · the draft card did not open: ' + JSON.stringify(born)); await browser.close(); process.exit(2); }
check('the draft is born with its ✏️ greyed: nothing has changed yet', born.disabled === true, JSON.stringify(born));
await page.click('.sugg [data-lane]');
await page.keyboard.press('End');
await page.keyboard.type(' unless everyone agrees');
await page.waitForTimeout(600);
const typed = await state();
check('typing in the lane wakes the ✏️', typed.disabled === false, JSON.stringify(typed));
check('no page error', errs.length === 0, errs.join(' | '));
await browser.close();
say(fails.length ? `FAILED: ${fails.join(' · ')}` : 'all checks pass');
process.exit(fails.length ? 1 : 0);
