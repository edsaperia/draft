/**
 * The birth's **refusals**, against a running server.
 *
 * Ed's report, 2026-08-22: *during the birth, after I set my email, the link
 * card opens* — because the address was taken. The walk-back was correct: the
 * defect was that 📍 let a taken address be committed at all, so the send was
 * the first thing in the world to ask about it. This drives a live birth onto
 * an address that is already reserved and asserts the card refuses it *there*
 * — commit dark, the note naming the nearest free address, nothing sent at
 * the wire — then corrects the address and walks the birth through clean.
 *
 *   npm run server                                  # in another shell
 *   node scripts/slug-walk.mjs [base] [slug]        # slug must be reserved
 *
 * Reserve one first, if the server is fresh:
 *   curl -X POST <base>/api/docs -H 'content-type: application/json' \
 *     -d '{"title":"Test Charter","slug":"test-charter","email":"a@b.com"}'
 *
 * Why it is not part of `journey-walk.mjs`: the journey births with a unique
 * title, so it can never meet a taken address; and both probes drive the
 * fixture, where the check is synchronous and the live path is never reached.
 * It fails on the pre-fix page at *the commit is dark on an address that is
 * taken*, which is the only reason to trust it. See Q535.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:8140';
const TAKEN = process.argv[3] || 'test-charter';
const say = (...a) => console.log(...a);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const refused = [];
page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400)
  refused.push(r.status() + ' ' + r.request().method() + ' ' + new URL(r.url()).pathname); });
const T = (ms) => page.waitForTimeout(ms);
const fails = [];
const check = (ok, msg) => { say((ok ? '  ok   · ' : '  FAIL · ') + msg); if (!ok) fails.push(msg); };

const open = async (k) => {
  await page.evaluate((kk) => {
    const el = document.querySelector('#rail [data-card="' + kk + '"], #band [data-tab="' + kk + '"]');
    if (el) el.click();
  }, k);
  await T(420);
};
const typeIn = (sel, v) => page.evaluate((a) => {
  const el = document.querySelector(a[0]);
  if (!el) return false;
  if (el.isContentEditable) { el.textContent = a[1]; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
  else { el.value = a[1]; el.dispatchEvent(new Event('input', { bubbles: true })); }
  return true;
}, [sel, v]);
const press = async (holdMs) => {
  const box = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.setupcard .commitrow button')]
      .find((x) => !x.disabled && !/🗑/.test(x.textContent));
    if (!b) return null;
    b.scrollIntoView({ block: 'center' });
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: b.textContent.trim() };
  });
  if (!box) return null;
  await T(160);
  await page.mouse.move(box.x, box.y);
  await page.mouse.down(); await T(holdMs); await page.mouse.up();
  await T(460);
  return box.label;
};
/* the state of the 📍 card: what is in the field, whether the commit is
   pressable, what it says for itself, and what the note under it reads */
const slugState = () => page.evaluate(() => {
  const b = [...document.querySelectorAll('.setupcard .commitrow button')]
    .find((x) => !/🗑/.test(x.textContent));
  return {
    value: (document.querySelector('.setupcard [data-slug]') || {}).value,
    disabled: b ? b.disabled : null,
    title: b ? b.title : null,
    note: (document.querySelector('.setupcard [data-slugnote]') || {}).textContent || '',
  };
});

/* ---- a title whose address is already reserved ------------------------ */
const TITLE = TAKEN.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
await page.goto(BASE + '/');
await T(800);
await open('title');
await typeIn('.setupcard [data-titlelane]', TITLE);
await press(1250);
await open('slug');
await T(1200);                       // the check is asked on arrival, not on a keystroke
let s = await slugState();
say('taken address · ' + JSON.stringify(s));
check(s.value === TAKEN, 'the address pre-fills from the title (' + TAKEN + ')');
check(s.disabled === true, 'the commit is dark on an address that is taken');
check(/is taken/.test(s.note), 'the card says the address is taken');
check(new RegExp(TAKEN + '-2').test(s.note), 'the card offers the nearest free address');
check(/taken/i.test(s.title || ''), 'the dark commit says why: ' + JSON.stringify(s.title));

/* pressing it must do nothing at all — no send, no walk-on */
const before = refused.length;
await press(1250);
await T(600);
check(refused.length === before, 'a press on the dark commit sends nothing');

/* ---- correct it, and the birth goes through --------------------------- */
const FREE = TAKEN + '-' + Date.now().toString(36);
await typeIn('.setupcard [data-slug]', FREE);
await T(1200);
s = await slugState();
say('free address  · ' + JSON.stringify(s));
check(s.disabled === false, 'the commit lights once the address is free');
check(!/is taken/.test(s.note), 'the taken note is gone');

await press(1250);
await open('myemail');
await typeIn('.setupcard input[type="email"]', 'ada@example.org');
await press(1250);
await T(1800);
const openCard = await page.evaluate(() => {
  const c = document.querySelector('.setupcard');
  return c ? (c.dataset.k || (c.querySelector('[data-tab]') || { dataset: {} }).dataset.tab || 'some card') : null;
});
check(openCard === null, 'after the send no card is open — 📍 does not re-open (was: ' + openCard + ')');
check(refused.length === 0, 'nothing refused at the wire: ' + JSON.stringify(refused));
check(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 2)));

say(fails.length ? '\nFAILED (' + fails.length + ')' : '\nall good');
await browser.close();
process.exit(fails.length ? 1 : 0);
