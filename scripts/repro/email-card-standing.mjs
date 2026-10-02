#!/usr/bin/env node
/**
 * email-card-standing — **📧 on a live seat follows the standing pattern** (issue #169; Ed,
 * 2026-10-02, a demo visitor's 📧 card: *Your current email should be in the top half (it can
 * be under your avatar and name), where there should also be a radio button that shows that the
 * current email is selected. The second half gives the new option and the "Choose this" radio.*)
 *
 *   PORT=8291 DRAFT_BASE_URL=http://127.0.0.1:8291 DRAFT_DATA_DIR=<fresh> npm run server
 *   node scripts/repro/email-card-standing.mjs http://127.0.0.1:8291 [--demo=<base>] [--shots=<dir>]
 *
 * Seats a ladder member (and, with `--demo=<base>` naming a server whose demo is built, a demo
 * visitor by 👋 Try It), opens their 📧 from their own row, and asserts at 1600 and at 390:
 *
 *   standing  the first line holds the address that stands, under the member's row, and a
 *             pressed *Chosen* radio (`data-standpick`, 1541.47);
 *   new       below it, one block: an empty address field and its own unpressed *Choose this*;
 *             the ✓ dark (P22) and the 🗑️ dark;
 *   typed     typing a new address presses the second radio, releases the first, arms the ✓;
 *   restore   pressing the first radio again puts the card back exactly — the address, the
 *             pressed radio, the empty field, the dark ✓ — and so does 🗑️ after a second typing.
 *
 * Screenshots (with `--shots`): `email-<seat>-<width>.png`. Exit 0 only if all pass; 1 on a
 * failure, 2 on a broken set-up.
 */
import { join } from 'node:path';
import { chromium } from 'playwright';
import { landOn, sleep } from '../lib/walk.mjs';

const BASE = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2]
  : process.env.DRAFT_BASE_URL || 'http://127.0.0.1:8291').replace(/\/$/, '');
const opt = (name) => { const a = process.argv.find((x) => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : null; };
const DEMO = opt('demo') ? opt('demo').replace(/\/$/, '') : null;
const SHOTS = opt('shots');
const say = (s) => console.log(s);
const fails = [];
const check = (name, ok, detail) => {
  say((ok ? 'PASS · ' : 'FAIL · ') + name + (ok ? '' : ' · ' + detail));
  if (!ok) fails.push(name);
};
const die = (s) => { say('SET-UP · ' + s); process.exit(2); };
const post = async (path, body, cookie) => {
  const r = await fetch(BASE + path, { method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body) });
  return { status: r.status, cookie: (r.headers.get('set-cookie') ?? '').split(';')[0],
    json: await r.json().catch(() => ({})) };
};

const health = await fetch(BASE + '/healthz').then((r) => r.json()).catch(() => null);
if (!health || health.devMail !== true) die('not a dev server: ' + BASE);
const ladder = await post('/api/dev/ladder', { to: 'session' });
const slug = ladder.json.slug;
const memberId = ((ladder.json.seats || []).find((m) => !m.founder) || {}).id;
if (!slug || !memberId) die('the ladder seated no member: ' + JSON.stringify(ladder.json).slice(0, 300));
const founderId = ((ladder.json.seats || []).find((m) => m.founder) || {}).id;
const seat = await post('/api/dev/seat', { slug, member: memberId });
const fseat = founderId ? await post('/api/dev/seat', { slug, member: founderId }) : {};
if (!seat.cookie || !fseat.cookie) die('the seat switch gave no cookie');
say(`document /d/${slug} · member ${memberId} · founder ${founderId}` + (DEMO ? ` · demo ${DEMO}` : ''));

const browser = await chromium.launch();
const CARDS = ['myemail', 'myname', 'mypic'];
const GLYPH = { myemail: '📧', myname: '✋', mypic: '🖼️' };
const PICK = { myname: 'namePick', mypic: 'picPick' };

/** an identity card as it stands on the glass */
const readCard = (page, k) => page.evaluate(([k, pk]) => {
  const sh = document.querySelector('.setupcard[data-setupcard="' + k + '"]');
  if (!sh) return null;
  const head = sh.querySelector('.clausehead, .headrule');
  const pill = sh.querySelector('[data-standpick]');
  const field = sh.querySelector('input[data-txt="' + k + '"]');
  const fieldBlock = field && field.closest('.pick');
  const pick = fieldBlock && fieldBlock.querySelector('[data-pickinput], [data-set]');
  const row = sh.querySelector('[data-slot="row"]');
  const ok = row && row.querySelector('[data-confirm], [data-resend]');
  const bin = row && row.querySelector('[data-revert], [data-act="bin"]');
  const radios = pk ? [...sh.querySelectorAll('[data-set="' + pk + '"]')] : [];
  return {
    headText: head ? head.textContent.replace(/\s+/g, ' ').trim() : '',
    pillInHead: !!(pill && head && head.contains(pill)),
    pillPressed: pill ? pill.getAttribute('aria-pressed') : null,
    pillWords: pill ? pill.innerText.trim() : null,
    field: field ? field.value : null,
    fieldInHead: !!(field && head && head.contains(field)),
    pickPressed: pick ? pick.getAttribute('aria-pressed') : null,
    pickWords: pick ? pick.innerText.trim() : null,
    blocks: radios.map((b) => b.dataset.val),
    pressed: radios.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.val),
    okDark: ok ? ok.disabled : null,
    binDark: bin ? bin.disabled : null,
  };
}, [k, PICK[k] || null]);

/** an identity card from your own row: its tab may stand behind another in the row's pile,
 *  so the pile's front opens the strip and the strip's own tab switches to it */
const openId = async (page, k) => {
  for (let i = 0; i < 3; i++) {
    const r = await page.evaluate((k) => {
      if (document.querySelector('.setupcard[data-setupcard="' + k + '"]')) return 'open';
      const live = document.querySelector('#band [data-tab="' + k + '"]');
      if (live) { live.scrollIntoView({ block: 'center' }); live.click(); return 'pressed'; }
      const chip = document.querySelector('#band .achip[data-chip="' + k + '"]');
      const pile = chip && (chip.closest('.chipcol') || chip.parentElement);
      const front = pile && pile.querySelector('[data-tab]');
      if (!front) return 'none';
      front.scrollIntoView({ block: 'center' }); front.click(); return 'front';
    }, k);
    if (r === 'open') return true;
    if (r === 'none') return false;
    await sleep(1400);
  }
  return page.evaluate((k) => !!document.querySelector('.setupcard[data-setupcard="' + k + '"]'), k);
};
const sel = (k, s) => '.setupcard[data-setupcard="' + k + '"] ' + s;
/** a change on the card: a new address, a new name, another picture block */
const change = async (page, k, width) => {
  if (k === 'myemail') await page.fill(sel(k, 'input[data-txt="myemail"]'), 'changed.' + width + '@example.org');
  else if (k === 'myname') await page.fill(sel(k, 'input[data-txt="myname"]'), 'Somebody New');
  else await page.click(sel(k, '[data-set="picPick"][data-val="upload"]'), { timeout: 3000 }).catch(() => {});
  await sleep(700);
};
/** what stands, checked: the pressed Chosen on the first line, and below it nothing chosen
 *  and nothing drawn twice */
const standing = (tag, k, a, address, when) => {
  const g = GLYPH[k] + ' ';
  check(tag + g + when + ' · the first line wears a pressed Chosen', !!a && a.pillInHead && a.pillPressed === 'true' &&
    a.pillWords === 'Chosen' && (k !== 'myemail' || a.headText.includes(address)), JSON.stringify(a));
  if (k === 'myemail') {
    check(tag + g + when + ' · below it an empty field with an unpressed Choose this', !!a && !a.fieldInHead && a.field === '' &&
      a.pickPressed === 'false' && a.pickWords === 'Choose this', JSON.stringify(a));
  } else {
    check(tag + g + when + ' · below it nothing is chosen, and what stands is not drawn again', !!a &&
      a.pressed.length === 0 && !a.blocks.includes('keep') && (k !== 'myname' || a.field === ''), JSON.stringify(a));
  }
  check(tag + g + when + ' · the ✓ and the 🗑️ are dark over what stands', !!a && a.okDark === true && a.binDark === true,
    JSON.stringify(a));
};

const walkCard = async (page, tag, k, address, who, width) => {
  const g = GLYPH[k] + ' ';
  const opened = await openId(page, k);
  let a = await readCard(page, k);
  check(tag + g + 'opens', opened && !!a, JSON.stringify({ opened, a }));
  if (!a) return;
  // **an unanswered ✋ / 🖼️ stands on nothing** (F6): no radio on the first line and every
  // block offered; answering Anonymous makes it what stands, and the walk goes on from there
  if (k !== 'myemail' && a.pillPressed === null) {
    check(tag + g + 'unanswered · no Chosen, every block offered, nothing pressed',
      a.blocks.includes('anon') && a.pressed.length === 0, JSON.stringify(a));
    await page.click(sel(k, '[data-set="' + PICK[k] + '"][data-val="anon"]'), { timeout: 3000 }).catch(() => {});
    await sleep(600);
    await page.click(sel(k, '[data-slot="row"] [data-confirm]'), { timeout: 3000 }).catch(() => {});
    await sleep(1800);
    await openId(page, k);
    a = await readCard(page, k);
    check(tag + g + 'answered Anonymous · its block is the first line, not in the list', !!a && !a.blocks.includes('anon'),
      JSON.stringify(a));
  }
  if (SHOTS) {
    const el = await page.$('.setupcard[data-setupcard="' + k + '"]');
    if (el) await el.screenshot({ path: join(SHOTS, `${k}-${who}-${width}.png`) }).catch(() => {});
  }
  standing(tag, k, a, address, 'on open');

  await change(page, k, width);
  const b = await readCard(page, k);
  check(tag + g + 'a change chooses its block and releases what stands', !!b && b.pillPressed === 'false' &&
    (k === 'myemail' ? b.pickPressed === 'true' && b.okDark === false : b.pressed.length === 1) &&
    b.binDark === false, JSON.stringify(b));

  await page.click(sel(k, '[data-standpick]'), { timeout: 3000 }).catch(() => {});
  await sleep(900);
  standing(tag, k, await readCard(page, k), address, 'Chosen again');

  await change(page, k, width);
  await page.click(sel(k, '[data-slot="row"] [data-revert]'), { timeout: 3000 }).catch(() => {});
  await sleep(1200);
  // the bin puts back and closes; open again and read
  await openId(page, k);
  standing(tag, k, await readCard(page, k), address, 'after 🗑️');
  // and shut it, so the next card opens from a quiet page
  await page.evaluate((k) => {
    const sh = document.querySelector('.setupcard[data-setupcard="' + k + '"]');
    const t = sh && sh.querySelector('.achip[data-tab="' + k + '"]');
    if (t) t.click();
  }, k);
  await sleep(900);
};

const walkSeat = async (who, width, prepare) => {
  const ctx = await browser.newContext(width < 600
    ? { viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  const tag = `${who} @${width} · `;
  const address = await prepare(ctx, page);
  if (!address) { check(tag + 'seated with an address', false, 'no address'); await ctx.close(); return; }
  await page.waitForSelector('#band .cpara', { timeout: 20000 }).catch(() => null);
  await sleep(2000);
  // close whatever the review walk opened
  await page.evaluate(() => {
    if (window.SESSION && window.SESSION.openId != null) window.SESSION.toggle(window.SESSION.openId, false);
    const open = document.querySelector('.setupcard[data-setupcard]');
    if (open) {
      const t = open.querySelector('.achip[data-tab="' + open.dataset.setupcard.replace(/["\\]/g, '\\$&') + '"]');
      if (t) t.click();
    }
  });
  await sleep(900);
  for (const k of CARDS) await walkCard(page, tag, k, address, who, width);
  check(tag + 'no page error', errs.length === 0, errs.join(' | '));
  await ctx.close();
};

const myAddress = (page, api) => page.evaluate((api) => fetch(api).then((r) => r.json())
  .then((v) => ((v.view.members || []).find((m) => m.id === v.me) || {}).email || null), api).catch(() => null);
const ladderSeat = (cookie) => async (ctx, page) => {
  const [n, v] = cookie.split(/=(.*)/s);
  await ctx.addCookies([{ name: n, value: v, url: BASE }]);
  await landOn(page, `${BASE}/d/${slug}`);
  return myAddress(page, `/api/d/${slug}/view`);
};
const visitor = async (ctx, page) => {
  await page.goto(DEMO + '/d/demo?try=1');
  const tap = await page.waitForSelector('[data-strtry]', { timeout: 15000 }).catch(() => null);
  if (!tap) return null;
  await sleep(600);
  await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => null), tap.click()]);
  await page.waitForFunction(() => window.SESSION && Array.isArray(window.SESSION.SUGGS), null, { timeout: 15000 }).catch(() => null);
  await sleep(2500);
  return myAddress(page, '/api/d/demo/view');
};

for (const w of [1600, 390]) {
  await walkSeat('member', w, ladderSeat(seat.cookie));
  await walkSeat('founder', w, ladderSeat(fseat.cookie));
  if (DEMO) await walkSeat('visitor', w, visitor);
}
await browser.close();
say(fails.length ? `FAILED: ${fails.join(' · ')}` : 'all checks pass');
process.exit(fails.length ? 1 : 0);
