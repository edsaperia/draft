#!/usr/bin/env node
/**
 * refused-acts — **does the page believe the host?** (issue #37)
 *
 *   PORT=8232 DRAFT_BASE_URL=http://127.0.0.1:8232 DRAFT_DATA_DIR=<fresh> npm run server
 *   node scripts/repro/refused-acts.mjs http://127.0.0.1:8232
 *
 * `LIVE_HOOKS.propose` has always read the host's answer and put a refused draft back;
 * `judge` and `withdraw` drew the act as done and dropped the answer, and `api.cmd` chained
 * every command behind the last with no timeout. Founds a three-member document over the
 * wire (quorum 4, so no race carries under the steps), puts one proposal each from m1 and m2,
 * and drives m2's page — every refusal made by routing the page's own request:
 *
 *   judge     a judgment answered 500: two polls later the entry asks again, never ⏳.
 *   double    the ✓ pressed twice in a row: one `judge-race` leaves the page, not two.
 *   withdraw  m2's withdrawal answered 500: the proposal is back in the rail and the
 *             wallet reads what the host holds.
 *   hang      a judgment that never answers, then a withdrawal: with the chain's timeout
 *             shortened to 3 s (`window.__cmdTimeoutMs`), the withdrawal still leaves the page.
 *
 * Exit 0 only if all pass; 1 on a failure, 2 on a broken set-up. Red on the pre-#37 page at
 * `judge`, `double`, `withdraw` and `hang`.
 */
import { chromium } from 'playwright';
import { post, followLink, outbox, linkIn, sleep } from '../lib/walk.mjs';

const B = process.argv[2] || 'http://127.0.0.1:8232';
const say = (s) => console.log(s);
const fails = [];
const check = (name, ok, detail) => {
  say((ok ? 'PASS · ' : 'FAIL · ') + name + (ok ? '' : ' · ' + detail));
  if (!ok) fails.push(name);
};
const cmd = async (slug, cookie, name, args = {}) => {
  const r = await post(B, `/api/d/${slug}/cmd`, { cmd: name, args }, cookie);
  return { status: r.status, body: await r.json().catch(() => null) };
};
const view = async (slug, cookie) => (await fetch(`${B}/api/d/${slug}/view`, { headers: { cookie } })).json();
const mailTo = async (to) => {
  for (let i = 0; i < 30; i++) {
    const m = (await outbox(B)).find((x) => x.to === to && linkIn(x));
    if (m) return m;
    await sleep(300);
  }
  throw new Error('no mail to ' + to);
};

// ---- the document, over the wire ----------------------------------------------
const u = Date.now().toString(36);
const created = await (await post(B, '/api/docs', { title: 'Refused ' + u, email: `founder-${u}@example.com` })).json();
const slug = created.slug;
const jars = { founder: (await followLink(created.devLink)).cookie };
await cmd(slug, jars.founder, 'confirm-starting-text', { text: '# Charter\nThe club meets weekly.\nMinutes are kept.\nDues are paid yearly.' });
await cmd(slug, jars.founder, 'set-convenor-membership', { isMember: true });
const values = { rate: { grant: 3, cap: 3, dripMinutes: 60 }, quorum: { form: 'count', n: 4 }, authorship: { rung: 'sealed' },
  judgments: { rung: 'after' }, applications: { apply: true }, admission: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
  lapse: { afterMs: null }, ending: { endsAtMs: Date.now() + 7 * 864e5 }, chamber: { rung: 'link' }, removal: { price: 'proposal' } };
for (const [setting, value] of Object.entries(values)) await cmd(slug, jars.founder, 'set-setting', { setting, value });
for (const w of ['m1', 'm2']) {
  const e = `${w}-${u}@example.com`;
  await cmd(slug, jars.founder, 'invite', { email: e });
  jars[w] = (await followLink(linkIn(await mailTo(e)))).cookie;
}
await cmd(slug, jars.founder, 'begin', {});
const prop = async (w, n, t) => {
  const v = await view(slug, jars[w]);
  return cmd(slug, jars[w], 'propose-text', { baseVersion: v.textVersion,
    hunks: [{ start: n, end: n + 1, lines: [t], was: [String(v.text || '').split('\n')[n]] }], why: 'x' });
};
const p1 = await prop('m1', 1, 'The club meets fortnightly.');
const p2 = await prop('m2', 2, 'Minutes are kept by the secretary.');
if (p1.status !== 200 || p2.status !== 200) { say('SET-UP · proposals refused ' + JSON.stringify([p1.body, p2.body])); process.exit(2); }

// ---- m2's page -------------------------------------------------------------------
const browser = await chromium.launch();
const openPage = async (init) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const [n, ...v] = jars.m2.split('='); await ctx.addCookies([{ name: n, value: v.join('='), url: B }]);
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.sent = [];
  page.on('request', (r) => { if (r.url().endsWith('/cmd')) page.sent.push(r.postData() || ''); });
  await page.goto(`${B}/d/${slug}`); await sleep(3000);
  // every OK the page asks for, so the rail holds the race
  for (let i = 0; i < 20; i++) {
    const k = await page.evaluate(() => { const e = [...document.querySelectorAll('#rail [data-card]')]
      .find((x) => !['myname', 'mypic'].includes(x.dataset.card) && !x.dataset.card.includes('#') && !x.dataset.card.startsWith('mine:'));
      if (!e) return null; e.click(); return e.dataset.card; });
    if (!k) break;
    await sleep(700);
    const ok = await page.$('.setupcard [data-ok]:not([disabled])');
    if (ok) { await ok.click(); await sleep(1200); } else break;
  }
  await sleep(4500);
  return page;
};
const pairEntry = (page) => page.evaluate(() => {
  const li = [...document.querySelectorAll('#rail li')].find((x) => (x.dataset.q || '').includes('#'));
  if (!li) return null;
  const mk = li.querySelector('.qmark .mk');
  return { q: li.dataset.q, mark: mk ? ([...mk.classList].find((c) => c.startsWith('mk-')) || '').slice(3) : '' };
});
// `v` is the lane: the double case leaves the pair judged *approve*, and a
// press on the chosen lane un-chooses it, so the hang case keeps
const openPair = async (page, q, v = 'approve') => {
  await page.click(`#rail li[data-q="${q}"] button`); await sleep(1400);
  await page.click(`.sugg[data-card="${q}"] [data-v="${v}"]`); await sleep(300);
};
const route500 = (page, c) => page.route('**/api/d/*/cmd', (r) => ((r.request().postData() || '').includes(`"${c}"`)
  ? r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"refused by the repro"}' }) : r.continue()));

// judge
{
  const page = await openPage();
  const e = await pairEntry(page);
  if (!e) { say('SET-UP · no pair in m2\'s rail'); await browser.close(); process.exit(2); }
  await route500(page, 'judge-race');
  await openPair(page, e.q);
  await page.click(`.sugg[data-card="${e.q}"] [data-act="submit"]`);
  await sleep(9500);
  const after = await pairEntry(page);
  const judged = (await view(slug, jars.m2)).clauses.flatMap((c) => c.myJudgments || []).length;
  check('judge · a refused judgment leaves the entry asking', after && (after.mark === 'needs' || after.mark === 'urgent') && judged === 0,
    JSON.stringify({ after, judged }));
  await page.context().close();
}

// double
{
  const page = await openPage();
  const e = await pairEntry(page);
  await openPair(page, e.q);
  const n0 = page.sent.filter((b) => b.includes('"judge-race"')).length;
  await page.evaluate((q) => { const s = document.querySelector(`.sugg[data-card="${q}"] [data-act="submit"]`); s.click(); s.click(); }, e.q);
  await sleep(3000);
  const n = page.sent.filter((b) => b.includes('"judge-race"')).length - n0;
  check('double · two presses of ✓ send one judgment', n === 1, n + ' sent');
  await page.context().close();
}

// withdraw
{
  const page = await openPage();
  const mine = await page.evaluate(() => ([...document.querySelectorAll('#rail li')].find((x) => (x.dataset.q || '').startsWith('mine:')) || {}).dataset);
  if (!mine || !mine.q) { check('withdraw · m2\'s own proposal is in the rail', false, 'no mine: entry'); }
  else {
    await route500(page, 'withdraw-text');
    await page.click(`#rail li[data-q="${mine.q}"] button`); await sleep(1200);
    await page.click(`.sugg[data-card="${mine.q}"] [data-act="draft-withdraw"]`);
    await sleep(6000);
    const back = await page.evaluate((q) => !![...document.querySelectorAll('#rail li')].find((x) => x.dataset.q === q), mine.q);
    const held = await page.evaluate(() => window.SESSION.editsHeld);
    const v = await view(slug, jars.m2);
    const live = (v.mine || []).some((m) => m.state === 'live');
    // the wire's balance is fractional (it accrues by the minute): the tray holds its whole part
    const wallet = typeof v.wallet === 'number' ? Math.floor(v.wallet) : null;
    check('withdraw · a refused withdrawal leaves the proposal in the rail and the ✏️ spent',
      back && live && wallet !== null && held === wallet, JSON.stringify({ back, live, held, wallet }));
  }
  await page.context().close();
}

// hang
{
  const page = await openPage(() => { window.__cmdTimeoutMs = 3000; });
  const e = await pairEntry(page);
  await page.route('**/api/d/*/cmd', (r) => ((r.request().postData() || '').includes('"judge-race"') ? undefined : r.continue()));
  await openPair(page, e.q, 'keep');
  await page.click(`.sugg[data-card="${e.q}"] [data-act="submit"]`);
  await sleep(1500);
  const mine = await page.evaluate(() => ([...document.querySelectorAll('#rail li')].find((x) => (x.dataset.q || '').startsWith('mine:')) || {}).dataset);
  if (mine && mine.q) {
    await page.click(`#rail li[data-q="${mine.q}"] button`); await sleep(1200);
    await page.click(`.sugg[data-card="${mine.q}"] [data-act="draft-withdraw"]`);
  }
  await sleep(9000);
  const sent = page.sent.filter((b) => b.includes('"withdraw-text"')).length;
  check('hang · a judgment that never answers does not hold the withdrawal behind it', sent === 1, sent + ' withdraw-text sent');
  await page.context().close();
}

await browser.close();
say(fails.length ? `FAILED: ${fails.join(' · ')}` : 'all four cases pass');
process.exit(fails.length ? 1 : 0);
