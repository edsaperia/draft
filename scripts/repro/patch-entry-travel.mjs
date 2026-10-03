#!/usr/bin/env node
/**
 * patch-entry-travel — **a patch's rail entry travels to its own place's
 * card** (issue #204, Ed 2026-10-03: *when clicking one of the queue cards of
 * a patch, the view should go to the corresponding decision-card of that
 * patch. At the moment I think the view always go to the first one*).
 *
 *   PORT=8201 DRAFT_BASE_URL=http://127.0.0.1:8201 DRAFT_DATA_DIR=<fresh> DRAFT_DEMO_KEY=walk DRAFT_DEMO_STUB=1 npm run server
 *   node scripts/repro/patch-entry-travel.mjs http://127.0.0.1:8201
 *
 * The demo's K1 (the swap across two days, #189) is a patch of two places
 * with a rail entry beside each. A visitor's seat at 1600, for each place:
 *
 *   far     from the top of the page, its entry pressed: that place's card
 *           comes to the reading line, and the other place's card is out of
 *           view wherever the two stand more than a window apart
 *   still   with that place's clause already on screen and the card shut, its
 *           entry pressed: the clause is still where it was, 0px (Q1465,
 *           *the tab you click does not move*, space-above)
 *
 * The rail press handed `toggle` the item's id alone, so the travel and the
 * hold both aimed at the patch's topmost place (`topTarget`). Red on main at
 * place 2; exit 0 only if all pass, 1 on a failure, 2 on a broken set-up.
 */
import { chromium } from 'playwright';
import { sleep } from '../lib/walk.mjs';

const B = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://127.0.0.1:8201').replace(/\/+$/, '');
const say = (s) => console.log(s);
const fails = [];
const check = (name, ok, detail = '') => {
  say((ok ? 'PASS · ' : 'FAIL · ') + name + (ok ? '' : ' · ' + detail));
  if (!ok) fails.push(name);
};
const die = (s) => { say('BROKEN · ' + s); process.exit(2); };

const health = await fetch(B + '/healthz').then((r) => r.json()).catch(() => null);
if (!health) die('no server at ' + B);
if (!health.demo || health.demo.state !== 'built') die('the demo document is not built on ' + B + ' · ' + JSON.stringify(health.demo));

// the page's reading line (session.js `READ_LINE`), and how far from it an
// arrival may land: the card's label takes its room above the head
// (space-above), so the head stands a label's height or so below the line
const READ_LINE = 150;
const NEAR = 60;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(B + '/d/demo?try=1');
if (!(await page.waitForSelector('[data-strtry]', { timeout: 15000 }).catch(() => null))) die('no Try It');
await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => null), page.locator('[data-strtry]').first().click()]);
const ready = await page.waitForFunction(() => window.SESSION && Array.isArray(window.SESSION.SUGGS) &&
  window.SESSION.SUGGS.length > 3, null, { timeout: 20000 }).catch(() => null);
if (!ready) die('no seat');
await sleep(2500);

// K1's live patch, and its two places
const it = await page.evaluate(() => {
  const S = window.SESSION;
  const at = (re) => (S.DOC.find((l) => re.test(l.x)) || {}).key;
  const k1 = at(/Four Crusts, One Idea/);
  const g = S.SUGGS.find((x) => x.state !== 'sealed' && x.kind === 'patch' &&
    (x.sites || []).some((s) => (s.keys || []).includes(k1)));
  return g ? { id: g.id, sites: g.sites.map((s) => s.key) } : null;
});
if (!it || it.sites.length !== 2) die('no two-place patch for K1 · ' + JSON.stringify(it));
say('patch ' + it.id + ' · places ' + it.sites.join(', '));

const esc = (s) => String(s).replace(/["\\]/g, '\\$&');
// shut whatever is open and wait for the page to come to rest
const shut = async () => {
  await page.evaluate(() => { if (window.SESSION.openId) window.SESSION.toggle(window.SESSION.openId, false); });
  await sleep(1500);
};
const press = (id, site) => page.evaluate(({ id, site }) => {
  const b = document.querySelector('#queue li[data-q="' + id + '"][data-site="' + site + '"] > button') ||
    document.querySelector('li[data-q="' + id + '"][data-site="' + site + '"] > button');
  if (!b) return false;
  b.click();
  return true;
}, { id: esc(id), site: esc(site) });
// where each place's card (open) or clause (shut) stands on the glass
const where = (id, site) => page.evaluate(({ id, site }) => {
  const card = document.querySelector('.sugg[data-card="' + id + '"][data-site="' + site + '"]');
  const head = card && (card.querySelector('.clausehead .headclause') || card);
  const para = document.querySelector('[data-key="' + site + '"]:not(.sugg [data-key])');
  const r = (el) => (el ? el.getBoundingClientRect() : null);
  const h = r(head), c = r(card), p = r(para);
  return { open: !!card, headTop: h ? h.top : null, cardTop: c ? c.top : null, cardBottom: c ? c.bottom : null,
    paraTop: p ? p.top : null, inner: innerHeight, scrollY };
}, { id: esc(id), site: esc(site) });

for (let i = 0; i < 2; i++) {
  const site = it.sites[i], other = it.sites[1 - i];
  const tag = 'place ' + (i + 1) + ' (' + site + ') · ';

  // far: from the top of the page
  await shut();
  await page.evaluate(() => scrollTo(0, 0));
  await sleep(600);
  if (!(await press(it.id, site))) { check(tag + 'far · its rail entry is there', false, 'no entry'); continue; }
  await sleep(3000);
  const me = await where(it.id, site), them = await where(it.id, other);
  check(tag + 'far · its own card opens at the reading line',
    me.open && me.headTop !== null && Math.abs(me.headTop - READ_LINE) <= NEAR,
    JSON.stringify(me));
  const apart = them.cardTop !== null && me.cardTop !== null ? Math.abs(them.cardTop - me.cardTop) : null;
  if (apart !== null && apart > me.inner) {
    check(tag + 'far · the other place\'s card is out of view',
      them.cardBottom <= 0 || them.cardTop >= me.inner, JSON.stringify(them));
  } else say('  n/a · ' + tag + 'the two cards stand ' + apart + 'px apart, inside one window');

  // still: its clause already on screen, the card shut — high enough that
  // the card's ✓ row is in reach, so `fitOpened` (Q1465) owes no move
  await shut();
  const y0 = await page.evaluate((site) => {
    const p = document.querySelector('[data-key="' + site + '"]');
    if (!p) return null;
    scrollTo(0, scrollY + p.getBoundingClientRect().top - 190);
    return true;
  }, esc(site));
  if (!y0) { check(tag + 'still · its clause is in the column', false); continue; }
  await sleep(800);
  const before = await where(it.id, site);
  await press(it.id, site);
  await sleep(3000);
  const after = await where(it.id, site);
  const moved = after.headTop !== null && before.paraTop !== null ? after.headTop - before.paraTop : null;
  check(tag + 'still · its clause stays where it was, 0px',
    after.open && moved !== null && Math.abs(moved) <= 1,
    'moved ' + (moved === null ? '?' : moved.toFixed(1)) + 'px · ' + JSON.stringify({ before, after }));
}
check('no page error', errors.length === 0, errors.join(' | '));
await browser.close();
say(fails.length ? `patch-entry-travel: ${fails.length} failed` : 'patch-entry-travel: all pass');
process.exit(fails.length ? 1 : 0);
