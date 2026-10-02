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
const seat = await post('/api/dev/seat', { slug, member: memberId });
if (!seat.cookie) die('the seat switch gave no cookie');
say(`document /d/${slug} · member ${memberId}` + (DEMO ? ` · demo ${DEMO}` : ''));

const browser = await chromium.launch();

/** the 📧 card as it stands on the glass */
const readCard = (page) => page.evaluate(() => {
  const sh = document.querySelector('.setupcard[data-setupcard="myemail"]');
  if (!sh) return null;
  const head = sh.querySelector('.clausehead, .headrule');
  const pill = sh.querySelector('[data-standpick]');
  const field = sh.querySelector('input[data-txt="myemail"]');
  const fieldBlock = field && field.closest('.pick');
  const pick = fieldBlock && fieldBlock.querySelector('[data-pickinput]');
  const row = sh.querySelector('[data-slot="row"]');
  const ok = row && row.querySelector('[data-confirm], [data-resend]');
  const bin = row && row.querySelector('[data-revert], [data-act="bin"]');
  return {
    label: (sh.querySelector('[data-slot="label"]') || {}).textContent || '',
    headText: head ? head.textContent.replace(/\s+/g, ' ').trim() : '',
    pillInHead: !!(pill && head && head.contains(pill)),
    pillPressed: pill ? pill.getAttribute('aria-pressed') : null,
    pillWords: pill ? pill.innerText.trim() : null,
    field: field ? field.value : null,
    fieldInHead: !!(field && head && head.contains(field)),
    pickPressed: pick ? pick.getAttribute('aria-pressed') : null,
    pickWords: pick ? pick.innerText.trim() : null,
    okDark: ok ? ok.disabled : null,
    binDark: bin ? bin.disabled : null,
  };
});

/** 📧 from your own row: its tab stands behind ✋'s in the row's pile, so the pile's front
 *  opens the strip and the strip's 📧 tab switches to it */
const openEmail = async (page) => {
  for (let i = 0; i < 2; i++) {
    const r = await page.evaluate(() => {
      if (document.querySelector('.setupcard[data-setupcard="myemail"]')) return 'open';
      const live = document.querySelector('#band [data-tab="myemail"]');
      if (live) { live.scrollIntoView({ block: 'center' }); live.click(); return 'pressed'; }
      const chip = document.querySelector('#band .achip[data-chip="myemail"]');
      const pile = chip && (chip.closest('.chipcol') || chip.parentElement);
      const front = pile && pile.querySelector('[data-tab]');
      if (!front) return 'none';
      front.scrollIntoView({ block: 'center' }); front.click(); return 'front';
    });
    if (r === 'open') return true;
    if (r === 'none') return false;
    await sleep(1400);
  }
  return page.evaluate(() => !!document.querySelector('.setupcard[data-setupcard="myemail"]'));
};

const walkSeat = async (who, url, width, prepare) => {
  const ctx = await browser.newContext(width < 600
    ? { viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  const tag = `${who} @${width}`;
  const address = await prepare(ctx, page);
  if (!address) { check(tag + ' · seated with an address', false, 'no address'); await ctx.close(); return; }
  await page.waitForSelector('#band .cpara', { timeout: 20000 }).catch(() => null);
  await sleep(2000);
  // close whatever the review walk opened, then open 📧 from its own tab in your row
  await page.evaluate(() => {
    if (window.SESSION && window.SESSION.openId != null) window.SESSION.toggle(window.SESSION.openId, false);
    const open = document.querySelector('.setupcard[data-setupcard]');
    if (open && open.dataset.setupcard !== 'myemail') {
      const t = open.querySelector('.achip[data-tab="' + open.dataset.setupcard.replace(/["\\]/g, '\\$&') + '"]');
      if (t) t.click();
    }
  });
  await sleep(900);
  const opened = await openEmail(page);
  const a = await readCard(page);
  check(tag + ' · 📧 opens', opened && !!a, JSON.stringify({ opened, a }));
  if (!a) { await ctx.close(); return; }
  if (SHOTS) {
    const el = await page.$('.setupcard[data-setupcard="myemail"]');
    if (el) await el.screenshot({ path: join(SHOTS, `email-${who}-${width}.png`) }).catch(() => {});
  }
  check(tag + ' · the first line holds the address that stands', a.headText.includes(address), JSON.stringify(a));
  check(tag + ' · and wears a pressed Chosen radio', a.pillInHead && a.pillPressed === 'true' && a.pillWords === 'Chosen',
    JSON.stringify(a));
  check(tag + ' · below it an empty field with an unpressed Choose this', !a.fieldInHead && a.field === '' &&
    a.pickPressed === 'false' && a.pickWords === 'Choose this', JSON.stringify(a));
  check(tag + ' · the ✓ and the 🗑️ are dark over what stands', a.okDark === true && a.binDark === true, JSON.stringify(a));

  const fresh = 'changed.' + width + '@example.org';
  await page.fill('.setupcard[data-setupcard="myemail"] input[data-txt="myemail"]', fresh);
  await sleep(500);
  const b = await readCard(page);
  check(tag + ' · typing chooses the new block and releases the standing one',
    !!b && b.pickPressed === 'true' && b.pillPressed === 'false' && b.okDark === false && b.binDark === false, JSON.stringify(b));

  await page.click('.setupcard[data-setupcard="myemail"] [data-standpick]', { timeout: 3000 }).catch(() => {});
  await sleep(900);
  const c = await readCard(page);
  check(tag + ' · choosing what stands again restores the card', !!c && c.headText.includes(address) &&
    c.pillPressed === 'true' && c.field === '' && c.pickPressed === 'false' && c.okDark === true && c.binDark === true,
    JSON.stringify(c));

  await page.fill('.setupcard[data-setupcard="myemail"] input[data-txt="myemail"]', fresh);
  await sleep(500);
  await page.click('.setupcard[data-setupcard="myemail"] [data-slot="row"] [data-revert]', { timeout: 3000 }).catch(() => {});
  await sleep(1200);
  // the bin puts back and closes; open again and read
  await openEmail(page);
  const d = await readCard(page);
  check(tag + ' · 🗑️ after typing puts back what stands', !!d && d.headText.includes(address) &&
    d.pillPressed === 'true' && d.field === '' && d.okDark === true, JSON.stringify(d));
  check(tag + ' · no page error', errs.length === 0, errs.join(' | '));
  await ctx.close();
};

const member = async (ctx, page) => {
  const [n, v] = seat.cookie.split(/=(.*)/s);
  await ctx.addCookies([{ name: n, value: v, url: BASE }]);
  await landOn(page, `${BASE}/d/${slug}`);
  return page.evaluate(() => fetch(location.pathname.replace(/^\/d\//, '/api/d/') + '/view').then((r) => r.json())
    .then((v) => ((v.view.members || []).find((m) => m.id === v.me) || {}).email || null)).catch(() => null);
};
const visitor = async (ctx, page) => {
  await page.goto(DEMO + '/d/demo?try=1');
  const tap = await page.waitForSelector('[data-strtry]', { timeout: 15000 }).catch(() => null);
  if (!tap) return null;
  await sleep(600);
  await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => null), tap.click()]);
  await page.waitForFunction(() => window.SESSION && Array.isArray(window.SESSION.SUGGS), null, { timeout: 15000 }).catch(() => null);
  await sleep(2500);
  return page.evaluate(() => fetch('/api/d/demo/view').then((r) => r.json())
    .then((v) => ((v.view.members || []).find((m) => m.id === v.me) || {}).email || null)).catch(() => null);
};

for (const w of [1600, 390]) {
  await walkSeat('member', `${BASE}/d/${slug}`, w, member);
  if (DEMO) await walkSeat('visitor', `${DEMO}/d/demo`, w, visitor);
}
await browser.close();
say(fails.length ? `FAILED: ${fails.join(' · ')}` : 'all checks pass');
process.exit(fails.length ? 1 : 0);
