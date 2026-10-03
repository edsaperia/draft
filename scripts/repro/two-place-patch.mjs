#!/usr/bin/env node
/**
 * two-place-patch — **a proposal at two places opens as a patch** (issue #189).
 *
 *   PORT=8201 DRAFT_BASE_URL=http://127.0.0.1:8201 DRAFT_DATA_DIR=<fresh> DRAFT_DEMO_KEY=walk DRAFT_DEMO_STUB=1 npm run server
 *   node scripts/repro/two-place-patch.mjs http://127.0.0.1:8201 [--shots=<dir>]
 *
 * The demo's K1 (design/demo/pizzacon-2027.md, *Clause K, a swap across two
 * days*) rewrites Day 1's 15:45 session and Day 2's 16:00 session, three lines
 * each, and the engine holds it as two hunks with twenty-odd clauses between.
 * The page took the two hunks from the first start to the last end and drew
 * one card swallowing every clause between them, with one tab. A visitor's
 * seat (`?try=1`, one tap), at 1600 and at 390:
 *
 *   item     K1's pair is a `patch` of two sites, its keys the sites' own
 *   tabs     closed, a tab stands at each place
 *   cards    open, a card at each place, *Current text · 1 of 2* / *2 of 2*,
 *            ↑ ↓ on both
 *   between  every heading between the two places is still in the column
 *            (an open patch folds the sections between, keeping their
 *            headings), and neither card holds a clause from between
 *   vote     the proposal picked on a site card and the floating ✓ pressed
 *            send one `judge-race`, and the host takes it
 *
 * Red on main at `item`; exit 0 only if all pass, 1 on a failure, 2 on a
 * broken set-up. `--shots` writes `k1-<width>.png` with the first card open.
 */
import { join } from 'node:path';
import { chromium } from 'playwright';
import { sleep } from '../lib/walk.mjs';

const B = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://127.0.0.1:8201').replace(/\/+$/, '');
const opt = (name, dflt) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : dflt;
};
const SHOTS = opt('shots', null);
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

const browser = await chromium.launch();
for (const [w, h] of [[1600, 1000], [390, 844]]) {
  const narrow = w < 900;
  const ctx = await browser.newContext({ viewport: { width: w, height: h },
    ...(narrow ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  const errors = [];
  const sent = [];
  page.on('response', (r) => {
    if (!/\/cmd$/.test(r.url())) return;
    let cmd = null;
    try { cmd = JSON.parse(r.request().postData() || '{}').cmd; } catch { /* not ours */ }
    sent.push({ cmd, status: r.status() });
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(B + '/d/demo?try=1');
  if (!(await page.waitForSelector('[data-strtry]', { timeout: 15000 }).catch(() => null))) die('no Try It at ' + w);
  const tryIt = page.locator('[data-strtry]').first();
  await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => null),
    narrow ? tryIt.tap().catch(() => tryIt.click()) : tryIt.click()]);
  const ready = await page.waitForFunction(() => window.SESSION && Array.isArray(window.SESSION.SUGGS) &&
    window.SESSION.SUGGS.length > 3, null, { timeout: 20000 }).catch(() => null);
  if (!ready) die('no seat at ' + w);
  await sleep(2500);

  // K1's live pair: the item standing on Day 1's 15:45 heading, not a record
  const it = await page.evaluate(() => {
    const S = window.SESSION;
    const at = (re) => (S.DOC.find((l) => re.test(l.x)) || {}).key;
    const k1 = at(/Four Crusts, One Idea/), k2 = at(/Buffalo, Cow or Neither/);
    const g = S.SUGGS.find((x) => x.state !== 'sealed' && !x.mine &&
      ((x.keys || []).includes(k1) || (x.sites || []).some((s) => (s.keys || []).includes(k1))));
    return { k1, k2, id: g ? g.id : null, kind: g ? g.kind : null, keys: g ? g.keys : null,
      sites: g && g.sites ? g.sites.map((s) => s.keys) : null };
  });
  if (!it.id) die('no live item for K1 at ' + w + ' · ' + JSON.stringify(it));
  const tag = '@' + w + ' · ';
  check(tag + 'item · K1 is a patch of two sites', it.kind === 'patch' && (it.sites || []).length === 2 &&
    it.sites[0][0] === it.k1 && it.sites[1][0] === it.k2, JSON.stringify(it).slice(0, 300));
  const lineNo = (k) => +String(k).slice(1);
  // the clauses strictly between the two places, the ones the page draws
  const between = await page.evaluate(({ a, b }) => window.SESSION.DOC
    .filter((l) => /^L\d+$/.test(l.key) && +l.key.slice(1) > a && +l.key.slice(1) < b && String(l.x).trim())
    .map((l) => ({ key: l.key, x: String(l.x).slice(0, 40), h: l.t === 'h' })),
  { a: lineNo(it.k1) + 2, b: lineNo(it.k2) });
  check(tag + 'item · keys are the sites\' own, none between', (it.keys || []).every((k) => !between.some((x) => x.key === k)),
    JSON.stringify(it.keys));

  // the headings between them: an open patch folds the sections between its
  // places (`foldBetweenSites`), so their paragraphs may go, but a fold keeps
  // its heading — a heading missing from the column was swallowed
  const headsBetween = between.filter((b) => b.h);
  check(tag + 'between · there are headings between the places', headsBetween.length > 0, JSON.stringify(between).slice(0, 200));
  // closed: a tab beside each place
  const tabsAt = await page.evaluate((id) => {
    const q = String(id).replace(/["\\]/g, '\\$&');
    return [...document.querySelectorAll('.achip[data-anchor="' + q + '"]')]
      .map((c) => { const p = c.closest('[data-key]'); return p ? p.dataset.key : null; });
  }, it.id);
  check(tag + 'tabs · one at each place', tabsAt.includes(it.k1) && tabsAt.includes(it.k2), JSON.stringify(tabsAt));

  // open: a card at each place
  await page.evaluate((id) => window.SESSION.toggle(id, false), it.id);
  await sleep(1500);
  const open = await page.evaluate(({ id, between, all }) => {
    const q = String(id).replace(/["\\]/g, '\\$&');
    const cards = [...document.querySelectorAll('.sugg[data-card="' + q + '"]')];
    const drawn = (k) => [...document.querySelectorAll('[data-key="' + k + '"]')].some((el) => !el.closest('.sugg'));
    return {
      n: cards.length,
      sites: cards.map((c) => c.dataset.site),
      labels: cards.map((c) => ((c.querySelector('.glab') || {}).textContent || '').trim()),
      steps: cards.map((c) => c.querySelectorAll('.psteps .pstep').length),
      swallowed: between.filter((b) => !drawn(b.key)).map((b) => b.key),
      inCard: all.filter((b) => cards.some((c) => c.textContent.includes(b.x))).map((b) => b.key),
    };
  }, { id: it.id, between: headsBetween, all: between });
  check(tag + 'cards · one at each place', open.n === 2 && open.sites[0] === it.k1 && open.sites[1] === it.k2, JSON.stringify(open.sites));
  check(tag + 'cards · Current text · 1 of 2 and 2 of 2', /1 of 2/.test(open.labels[0] || '') && /2 of 2/.test(open.labels[1] || ''),
    JSON.stringify(open.labels));
  check(tag + 'cards · ↑ ↓ on both', open.steps.length === 2 && open.steps.every((n) => n === 2), JSON.stringify(open.steps));
  check(tag + 'between · every heading between the places is still in the column', open.swallowed.length === 0,
    open.swallowed.join(','));
  check(tag + 'between · neither card holds one', open.inCard.length === 0, open.inCard.join(','));
  if (SHOTS) {
    await page.evaluate((id) => {
      const q = String(id).replace(/["\\]/g, '\\$&');
      const c = document.querySelector('.sugg[data-card="' + q + '"]');
      if (c) window.scrollBy(0, c.getBoundingClientRect().top - 120);
    }, it.id);
    await sleep(600);
    const path = join(SHOTS, `k1-${w}.png`);
    await page.screenshot({ path });
    say('  shot · ' + path);
  }
  // vote: the proposal picked on one site card, the ✓ on the floating row
  await page.evaluate((id) => {
    const q = String(id).replace(/["\\]/g, '\\$&');
    const card = document.querySelector('.sugg[data-card="' + q + '"]');
    const pick = card && card.querySelector('.propblock .lanepick[data-v="approve"], .propblock .lanepick');
    if (pick) pick.click();
  }, it.id);
  await sleep(500);
  await page.evaluate(() => {
    const b = document.querySelector('#patchrow [data-act="submit"]:not([disabled])');
    if (b) b.click();
  });
  await sleep(2500);
  const judged = sent.filter((c) => c.cmd === 'judge-race');
  check(tag + 'vote · the ✓ on the floating row sends one judgment and it lands',
    judged.length === 1 && judged[0].status === 200, JSON.stringify(judged));
  check(tag + 'no page error', errors.length === 0, errors.join(' | '));
  await ctx.close();
}
await browser.close();
say(fails.length ? `two-place-patch: ${fails.length} failed` : 'two-place-patch: all pass');
process.exit(fails.length ? 1 : 0);
