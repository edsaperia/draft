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
 * motion running on it** (Q1367, SURFACE E10, M18) and its records (Q942). The title's
 * paragraph was drawn by `titleGovPara` from a list of its own — the 🪶 tab and the two power
 * tabs — so a motion on the title had a rail entry and no tab, `anchorOf` found nothing to lay
 * the entry beside and fell through to its last resort, the heading.
 *
 * **It asserts the motion it made itself**, `mo:<id>`, and from two seats: an ordinary member
 * and the founder. A freshly seated ladder member still owes the OKs on 💡 ⚖️ and 🏛️, and a
 * motion that waits on a grant they have not taken up is nowhere on their page at all (C9,
 * Q1344) — which is *the rule*, not this defect — so the walk gives those OKs first and then
 * reads. Needs a dev server (the ladder and the seat switch).
 *
 * Exit 0 only if every check passes; 1 on a failure, 2 on a broken set-up.
 */
import { chromium } from 'playwright';
import { landOn } from '../lib/walk.mjs';

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
const seats = ladder.json.seats || [];
const members = seats.filter((m) => !m.founder).map((m) => m.id);
const founderId = (seats.find((m) => m.founder) || {}).id;
if (members.length < 2 || !founderId) {
  say('SET-UP · the ladder seated no founder and two members: ' + JSON.stringify(seats).slice(0, 300));
  process.exit(2);
}
const [moverId, readerId] = members;
const mover = await post('/api/dev/seat', { slug, member: moverId });
const reader = await post('/api/dev/seat', { slug, member: readerId });
const founder = await post('/api/dev/seat', { slug, member: founderId });
const moved = await post(`/api/d/${slug}/cmd`, { cmd: 'open-motion',
  args: { payload: { kind: 'set', setting: 'title', value: { text: 'A Better Title For The Probe' } }, why: 'because the probe says so' } },
  mover.cookie);
if (moved.status !== 200 || !moved.json.result) { say('SET-UP · the title motion was refused: ' + JSON.stringify(moved.json)); process.exit(2); }
// **the motion this walk put**, never *some* motion: the ladder puts several of its own, and a
// check that passed on any `mo:` key passed on the unfixed page
const MO = 'mo:' + moved.json.result;
say(`document /d/${slug} · mover ${moverId} · reader ${readerId} · motion ${MO}`);

const browser = await chromium.launch();

/** One seat: give the grant OKs it still owes, then read the title's pile, shut and open. */
const readSeat = async (who, cookie) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const [cname, cval] = cookie.split(/=(.*)/s);
  await ctx.addCookies([{ name: cname, value: cval, url: BASE }]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await landOn(page, `${BASE}/d/${slug}`);
  await page.waitForSelector('#band .cpara', { timeout: 20000 });
  await page.waitForTimeout(2500);

  // **A motion waits on a grant the member has not taken up** (C9, Q1344): 💡 ⚖️ and 🏛️ stand
  // in a freshly seated member's rail as tasks, and until they are pressed no motion at all
  // reaches their page — so a walk that read the rail before them would be testing the grants
  // and not this. The founder set the gates themselves and owes none, so each is pressed only
  // where it is offered.
  for (const k of ['canpropose', 'canjudge', 'grant-voice']) {
    const opened = await page.evaluate((kk) => {
      const t = document.querySelector('#rail [data-card="' + kk + '"]');
      if (!t) return false;
      t.click();
      return true;
    }, k);
    if (!opened) continue;
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const b = document.querySelector('.setupcard [data-ok]');
      if (b && !b.disabled) { b.scrollIntoView({ block: 'center' }); b.click(); }
    });
    await page.waitForTimeout(1800);
  }
  await page.waitForTimeout(1200);

  // shut: the tab stands in the 🪶 paragraph's own pile, and nothing of it on the big heading
  const shut = await page.evaluate((mo) => {
    const titleChip = document.querySelector('#band .achip[data-chip="title"]');
    const titlePara = titleChip ? titleChip.closest('.cpara') : null;
    const moChip = document.querySelector('#band .achip[data-chip="' + mo + '"]');
    const tp = document.getElementById('titlepara');
    return {
      hasTitlePara: !!titlePara,
      rail: [...document.querySelectorAll('#rail [data-q]')].map((el) => el.dataset.q),
      inTitlePile: !!(moChip && titlePara && titlePara.contains(moChip)),
      // the 🪶 tab stays at the front of its own pile (Q1299) — the motion files behind it
      frontIsRule: !!(titlePara && titlePara.querySelector('.achip') &&
        titlePara.querySelector('.achip').dataset.chip === 'title'),
      onHeading: !!(tp && tp.querySelector('.achip[data-chip="' + mo + '"]')),
      moChips: [...document.querySelectorAll('#band .achip')]
        .map((c) => c.dataset.chip).filter((k) => /^mo:/.test(k || '')),
    };
  }, MO);
  check(who + ' · the 🪶 paragraph stands in the constitution', shut.hasTitlePara, JSON.stringify(shut));
  check(who + ' · the rail carries this rename', shut.rail.includes(MO), JSON.stringify(shut));
  check(who + ' · the rename has a tab, in the 🪶 paragraph’s own pile', shut.inTitlePile, JSON.stringify(shut));
  check(who + ' · the 🪶 tab is still the front of its own pile', shut.frontIsRule, JSON.stringify(shut));
  check(who + ' · nothing of the rename hangs on the big heading', !shut.onHeading, JSON.stringify(shut));

  // open: pressing the rail entry opens that motion's card at the 🪶 paragraph, its strip
  // carrying the rule's own tab — never over the heading
  if (shut.rail.includes(MO)) {
    await page.click(`#rail [data-q="${MO}"]`);
    await page.waitForTimeout(1500);
    const opened = await page.evaluate((mo) => {
      const cardEl = document.querySelector('.setupcard[data-setupcard="' + mo + '"]');
      const para = cardEl ? cardEl.closest('.cpara') : null;
      const tp = document.getElementById('titlepara');
      return { open: !!cardEl, inBand: !!(cardEl && cardEl.closest('#band')),
        inHeading: !!(cardEl && tp && tp.contains(cardEl)),
        stripHasRule: !!(para && para.querySelector('.achip[data-chip="title"]')) };
    }, MO);
    check(who + ' · pressing the rail entry opens the rename’s card in the constitution, never over the heading',
      opened.open && opened.inBand && !opened.inHeading, JSON.stringify(opened));
    check(who + ' · the open card stands in the title’s own pile, the 🪶 tab in its strip',
      opened.stripHasRule, JSON.stringify(opened));
  }
  check(who + ' · no page error', errs.length === 0, errs.join(' | '));
  await ctx.close();
};

await readSeat('member ', reader.cookie);
await readSeat('founder', founder.cookie);
await browser.close();
say(fails.length ? `FAILED: ${fails.join(' · ')}` : 'all checks pass');
process.exit(fails.length ? 1 : 0);
