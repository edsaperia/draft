#!/usr/bin/env node
/**
 * title-motion-tab — **a proposal to rename the document has a tab, and its rail entry is
 * joined to it** (Ed's screenshot from `docs.vote/d/tea`, 2026-09-19: *name the document
 * proposal not showing correctly* — the rail entry's wire ran to a bare dot beside the big
 * heading, and the 🪶 paragraph showed no tab for the proposal).
 *
 *   PORT=8281 DRAFT_BASE_URL=http://127.0.0.1:8281 DRAFT_DATA_DIR=<fresh> npm run server
 *   node scripts/repro/title-motion-tab.mjs http://127.0.0.1:8281
 *
 * Every setting's pile is built by `chipsFor` — the rule's tab, its power tabs, **one tab per
 * motion running on it** (Q1367) and its records (Q942). The title's paragraph was drawn by
 * `titleGovPara` from a list of its own — the 🪶 tab and the two power tabs — so a motion on
 * the title had a rail entry and no tab, `anchorOf` found nothing to lay the entry beside and
 * fell through to its last resort, the heading. Needs a dev server (the ladder and the seat
 * switch): it walks a document to the session rung, has one member move a new title, and
 * reads the page from another member's seat.
 *
 * Exit 0 only if every check passes; 1 on a failure, 2 on a broken set-up.
 */
import { chromium } from 'playwright';

const BASE = (process.argv[2] || process.env.DRAFT_BASE_URL || 'http://127.0.0.1:8281').replace(/\/$/, '');
const say = (s) => console.log(s);
const fails = [];
const check = (name, ok, detail) => {
  say((ok ? 'PASS · ' : 'FAIL · ') + name + (ok ? '' : ' · ' + detail));
  if (!ok) fails.push(name);
};
const post = async (path, body, cookie) => {
  const r = await fetch(BASE + path, { method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body) });
  return { status: r.status, cookie: (r.headers.get('set-cookie') ?? '').split(';')[0],
    json: await r.json().catch(() => ({})) };
};

const health = await fetch(BASE + '/healthz').then((r) => r.json()).catch(() => null);
if (!health || health.devMail !== true) { say('SET-UP · not a dev server: ' + BASE); process.exit(2); }

const ladder = await post('/api/dev/ladder', { to: 'session' });
const slug = ladder.json.slug;
if (!slug) { say('SET-UP · the ladder gave no document: ' + JSON.stringify(ladder.json).slice(0, 300)); process.exit(2); }
// the ladder's own answer names the seats; a lapsed seat is revived by the seat switch
const members = (ladder.json.seats || []).filter((m) => !m.founder).map((m) => m.id);
if (members.length < 2) { say('SET-UP · fewer than two members to seat: ' + JSON.stringify(ladder.json.seats || null).slice(0, 300)); process.exit(2); }
const [moverId, readerId] = members;
const mover = await post('/api/dev/seat', { slug, member: moverId });
const reader = await post('/api/dev/seat', { slug, member: readerId });
const moved = await post(`/api/d/${slug}/cmd`, { cmd: 'open-motion',
  args: { payload: { kind: 'set', setting: 'title', value: { text: 'A Better Title For The Probe' } }, why: 'because the probe says so' } },
  mover.cookie);
if (moved.status !== 200) { say('SET-UP · the title motion was refused: ' + JSON.stringify(moved.json)); process.exit(2); }
say(`document /d/${slug} · mover ${moverId} · reader ${readerId} · motion ${JSON.stringify(moved.json).slice(0, 120)}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const [cname, cval] = reader.cookie.split(/=(.*)/s);
await ctx.addCookies([{ name: cname, value: cval, url: BASE }]);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(`${BASE}/d/${slug}`);
await page.waitForSelector('#band .cpara', { timeout: 20000 });
await page.waitForTimeout(2500);

const seen = await page.evaluate(() => {
  const titlePara = (() => {
    const chip = document.querySelector('#band .achip[data-chip="title"]');
    return chip ? chip.closest('.cpara') : null;
  })();
  const moChips = [...document.querySelectorAll('#band .achip')]
    .filter((c) => /^mo:/.test(c.dataset.chip || ''));
  const inTitle = titlePara ? moChips.filter((c) => titlePara.contains(c)).map((c) => c.dataset.chip) : [];
  const rail = [...document.querySelectorAll('[data-q]')]
    .map((el) => el.dataset.q).filter((k) => /^mo:/.test(k || ''));
  return { hasTitlePara: !!titlePara, moChips: moChips.map((c) => c.dataset.chip), inTitle, rail };
});
check('the 🪶 paragraph stands in the constitution', seen.hasTitlePara, JSON.stringify(seen));
check('the rail carries the title motion', seen.rail.length >= 1, JSON.stringify(seen));
check('the title motion has a tab, in the 🪶 paragraph’s own pile', seen.inTitle.length >= 1, JSON.stringify(seen));

// the rail entry travels to the 🪶 paragraph and the card opens there, not beside the heading
if (seen.rail.length) {
  await page.click(`[data-q="${seen.rail[0]}"]`);
  await page.waitForTimeout(1500);
  const opened = await page.evaluate((k) => {
    const cardEl = document.querySelector('.setupcard[data-setupcard="' + k + '"]');
    const tp = document.getElementById('titlepara');
    return { open: !!cardEl, inBand: !!(cardEl && cardEl.closest('#band')), inHeading: !!(cardEl && tp && tp.contains(cardEl)) };
  }, seen.rail[0]);
  check('pressing the rail entry opens the motion’s card in the constitution, never over the heading',
    opened.open && opened.inBand && !opened.inHeading, JSON.stringify(opened));
}
check('no page error', errs.length === 0, errs.join(' | '));
await browser.close();
say(fails.length ? `FAILED: ${fails.join(' · ')}` : 'all checks pass');
process.exit(fails.length ? 1 : 0);
