#!/usr/bin/env node
/**
 * reconnecting — **warn before anybody acts, never after** (Q1505; Ed, 2026-09-23).
 *
 *   PORT=8263 DRAFT_BASE_URL=http://127.0.0.1:8263 DRAFT_DATA_DIR=<fresh> npm run server
 *   node scripts/repro/reconnecting.mjs http://127.0.0.1:8263
 *
 * A page that has lost the host drew nothing until a press failed. Now it learns it from the
 * browser's `offline` event, or from two view polls in a row that fail or go unanswered (the
 * poll has a time limit), and draws a red bar along the top reading *Reconnecting…* plus the
 * cause where it is known; every commit is held while it stands, the page stays readable and
 * scrollable, typed work is kept, and the first good poll lifts it. Founds a three-member
 * document over the wire, one proposal from m1, and drives m2's page — every cut made by the
 * browser itself (`context.setOffline`) or by routing the page's own view request:
 *
 *   offline   the device goes offline: the bar says so; scrolling still works; a chosen ✓
 *             sends nothing; a draft typed in edit mode is kept and its ✏️ sends nothing;
 *             back online, the bar lifts, the draft is still there and the ✓ sends.
 *   502       the view answered 502 twice: the bar says docs.vote is not answering; lifts.
 *   hang      the view never answers: after two polls run out of time the bar reads
 *             *Reconnecting…* and nothing more; lifts.
 *   pause     the view answers the announced pause (503 with `paused`): the maintenance
 *             modal and no bar — a pause is not a disconnection.
 *   refused   a vote refused at the press (500 on `judge-race`): the card says Y25's
 *             *That was refused: …* under it, and the next choice on it retires the sentence.
 *
 * Exit 0 only if all pass; 1 on a failure, 2 on a broken set-up. Red on the pre-Q1505 page
 * at `offline`, `502`, `hang` and `refused`; `pause` is a pin, green on both.
 */
import { chromium } from 'playwright';
import { post, followLink, outbox, linkIn, sleep, landOn } from '../lib/walk.mjs';

const B = process.argv[2] || 'http://127.0.0.1:8263';
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
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

// ---- the document, over the wire: long enough that the page scrolls -------------
const u = Date.now().toString(36);
const created = await (await post(B, '/api/docs', { title: 'Reconnect ' + u, email: `founder-${u}@example.com` })).json();
const slug = created.slug;
const jars = { founder: (await followLink(created.devLink)).cookie };
const lines = ['# Charter'];
for (let i = 1; i <= 30; i++) lines.push(`Clause ${i} of the charter says something the club agreed on the night it met.`);
await cmd(slug, jars.founder, 'confirm-starting-text', { text: lines.join('\n') });
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
{
  const v = await view(slug, jars.m1);
  const p = await cmd(slug, jars.m1, 'propose-text', { baseVersion: v.textVersion,
    hunks: [{ start: 2, end: 3, lines: ['Clause 2 of the charter says something else.'], was: [String(v.text || '').split('\n')[2]] }], why: 'x' });
  if (p.status !== 200) { say('SET-UP · proposal refused ' + JSON.stringify(p.body)); process.exit(2); }
}

// ---- m2's page -------------------------------------------------------------------
const browser = await chromium.launch();
const openPage = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 700 } });
  const [n, ...v] = jars.m2.split('='); await ctx.addCookies([{ name: n, value: v.join('='), url: B }]);
  const page = await ctx.newPage();
  page.sent = [];
  page.errs = [];
  page.on('pageerror', (e) => page.errs.push(String(e)));
  page.on('request', (r) => { if (r.url().endsWith('/cmd')) page.sent.push(r.postData() || ''); });
  await landOn(page, `${B}/d/${slug}`); await sleep(3000);
  // every OK the page asks for, so the rail holds the race
  for (let i = 0; i < 20; i++) {
    // a card the review walk has already opened (Q1536) takes its OK where it stands
    const k = await page.evaluate(() => { if (document.querySelector('.setupcard [data-ok]:not([disabled])')) return 'open';
      const e = [...document.querySelectorAll('#rail [data-card]')]
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
const openPair = async (page, q, v = 'approve') => {
  const open = await page.$(`.sugg[data-card="${q}"]`);
  if (!open) { await page.click(`#rail li[data-q="${q}"] button`); await sleep(1400); }
  await page.click(`.sugg[data-card="${q}"] [data-v="${v}"]`); await sleep(300);
};
// the bar as a member sees it: there, and what it says
const bar = (page) => page.evaluate(() => {
  const b = document.getElementById('reconnectbar');
  if (!b || b.hidden || !b.getClientRects().length) return null;
  const r = b.getBoundingClientRect();
  const cs = getComputedStyle(b);
  const nav = document.querySelector('.navbar');
  return { text: b.textContent.replace(/\s+/g, ' ').trim(), top: Math.round(r.top), h: Math.round(r.height),
    nav: nav ? Math.round(nav.getBoundingClientRect().bottom) : null, w: Math.round(r.width), vw: innerWidth,
    live: b.getAttribute('aria-live') || b.getAttribute('role'), bg: cs.backgroundColor };
});
const waitFor = async (page, fn, ms) => {
  const t0 = Date.now();
  for (;;) {
    const v = await fn(page);
    if (v || Date.now() - t0 > ms) return { v, after: Date.now() - t0 };
    await sleep(250);
  }
};
const judges = (page) => page.sent.filter((b) => b.includes('"judge-race"')).length;
const proposes = (page) => page.sent.filter((b) => b.includes('"propose-text"')).length;
const VIEW = '**/api/d/*/view**';

// offline
if (!only || only === 'offline') {
  const page = await openPage();
  const e = await pairEntry(page);
  if (!e) { say('SET-UP · no pair in m2\'s rail'); await browser.close(); process.exit(2); }
  await page.context().setOffline(true);
  const { v: b, after } = await waitFor(page, bar, 3000);
  say(`  · the bar after ${after} ms`);
  check('offline · the bar appears at once and says the device is offline',
    !!b && /^Reconnecting…/.test(b.text) && /offline/i.test(b.text) && !!b.live, JSON.stringify({ b, after }));
  // along the top: flush under the topbar, the window's full width, in the one red
  check('offline · the bar runs the full width, flush under the topbar, in the surface\'s one red',
    !!b && b.nav !== null && Math.abs(b.top - b.nav) <= 1 && b.w === b.vw && b.bg === 'rgb(222, 72, 58)', JSON.stringify(b));
  // readable and scrollable: no modal, the page moves under the wheel
  await page.mouse.move(800, 450);
  await page.mouse.wheel(0, 700); await sleep(600);
  const scrolled = await page.evaluate(() => ({ y: Math.round(scrollY), modal: !!document.getElementById('pausemodal'),
    over: !!(document.elementFromPoint(800, 450) || { closest: () => null }).closest('#reconnectbar') }));
  check('offline · the page still scrolls, and nothing covers it', scrolled.y > 0 && !scrolled.modal && !scrolled.over,
    JSON.stringify(scrolled));
  await page.evaluate(() => scrollTo(0, 0)); await sleep(300);
  // a chosen ✓ is held
  const j0 = judges(page);
  await openPair(page, e.q);
  const tick = await page.evaluate((q) => { const t = document.querySelector(`.sugg[data-card="${q}"] [data-act="submit"]`);
    return t && { aria: t.getAttribute('aria-disabled'), title: t.title }; }, e.q);
  await page.click(`.sugg[data-card="${e.q}"] [data-act="submit"]`, { force: true });
  await sleep(1500);
  const heldTick = await pairEntry(page);
  check('offline · a chosen ✓ is held, greyed with the reason, and sends nothing',
    judges(page) === j0 && tick && tick.aria === 'true' && /reconnect/i.test(tick.title) && heldTick && heldTick.mark !== 'wait' &&
      !!(await page.$(`.sugg[data-card="${e.q}"]`)),
    JSON.stringify({ sent: judges(page) - j0, tick, heldTick }));
  // close the card, write a draft in edit mode
  await page.keyboard.press('Escape'); await page.mouse.click(1590, 690); await sleep(900);
  await page.click('#editdoor [data-act="edit-door"]'); await sleep(900);
  const at = await page.evaluate(() => {
    const p = [...document.querySelectorAll('#charter .prose [data-key]')]
      .find((x) => !x.closest('.sugg') && /Clause 20 /.test(x.textContent) && x.getClientRects().length);
    if (!p) return null;
    p.scrollIntoView({ block: 'center' });
    const q = p.getBoundingClientRect();
    return { x: q.left + 30, y: q.top + 8 };
  });
  let draft = null;
  if (!at) check('offline · a clause to type into', false, 'no Clause 20 block in edit mode');
  else {
    await sleep(300);
    const at2 = await page.evaluate(() => { const p = [...document.querySelectorAll('#charter .prose [data-key]')]
      .find((x) => !x.closest('.sugg') && /Clause 20 /.test(x.textContent)); const q = p.getBoundingClientRect(); return { x: q.left + 30, y: q.top + 8 }; });
    await page.mouse.click(at2.x, at2.y);
    await page.keyboard.press('End');
    await page.keyboard.type(' Typed while offline.', { delay: 20 });
    await sleep(900);
    const p0 = proposes(page);
    const row = await page.$('#charter [data-proposalrow] [data-act="row-commit"]:not([data-pen])');
    const rowHeld = row && await row.evaluate((x) => ({ aria: x.getAttribute('aria-disabled'), title: x.title }));
    if (row) { await row.click({ force: true }); await sleep(2500); }
    draft = await page.evaluate(() => { const d = (window.SESSION.SUGGS || []).find((s) => s.unproposed);
      return d ? JSON.stringify(d.sites || []) : null; });
    check('offline · the ✏️ is held and the typed draft is kept', !!row && proposes(page) === p0 && rowHeld && rowHeld.aria === 'true' &&
      !!draft && draft.includes('Typed while offline'), JSON.stringify({ row: !!row, rowHeld, sent: proposes(page) - p0, draft }));
  }
  // back online: the first good poll lifts it, the draft stands, the ✓ sends
  await page.context().setOffline(false);
  const { v: gone, after: liftMs } = await waitFor(page, async (p) => !(await bar(p)), 9000);
  const kept = await page.evaluate(() => { const d = (window.SESSION.SUGGS || []).find((s) => s.unproposed);
    return d ? JSON.stringify(d.sites || []) : null; });
  const rowFree = await page.evaluate(() => { const r = document.querySelector('#charter [data-proposalrow] [data-act="row-commit"]:not([data-pen])');
    return r ? r.getAttribute('aria-disabled') : 'none'; });
  check('offline · back online the bar lifts, the draft is still there and its ✏️ is free',
    !!gone && !!kept && kept.includes('Typed while offline') && rowFree !== 'true', JSON.stringify({ gone, liftMs, kept, rowFree }));
  await page.keyboard.press('Escape'); await page.mouse.click(1590, 690); await sleep(900);
  const j1 = judges(page);
  // the held press left *approve* chosen — closing is not discarding — so it is chosen still
  if (!(await page.$(`.sugg[data-card="${e.q}"]`))) { await page.click(`#rail li[data-q="${e.q}"] button`); await sleep(1400); }
  const chosen = await page.$eval(`.sugg[data-card="${e.q}"] [data-v="approve"]`, (x) => x.getAttribute('aria-checked') === 'true');
  if (!chosen) await openPair(page, e.q);
  await page.click(`.sugg[data-card="${e.q}"] [data-act="submit"]`);
  await sleep(2500);
  check('offline · back online a ✓ sends', judges(page) === j1 + 1, (judges(page) - j1) + ' sent');
  check('offline · no page error', !page.errs.length, page.errs.join(' | '));
  await page.context().close();
}

// 502
if (!only || only === '502') {
  const page = await openPage();
  await page.route(VIEW, (r) => r.fulfill({ status: 502, contentType: 'text/html', body: '<h1>502 Bad Gateway</h1>' }));
  const { v: b, after } = await waitFor(page, bar, 12000);
  say(`  · the bar after ${after} ms`);
  check('502 · two server errors put the bar up saying docs.vote is not answering',
    !!b && /^Reconnecting…/.test(b.text) && /docs\.vote is not answering/i.test(b.text), JSON.stringify({ b, after }));
  await page.unroute(VIEW);
  const { v: gone, after: liftMs } = await waitFor(page, async (p) => !(await bar(p)), 9000);
  check('502 · the first good poll lifts it', !!gone, 'still up after ' + liftMs + ' ms');
  await page.context().close();
}

// hang
if (!only || only === 'hang') {
  const page = await openPage();
  await page.route(VIEW, () => { /* never answered */ });
  const { v: b, after } = await waitFor(page, bar, 16000);
  say(`  · the bar after ${after} ms`);
  check('hang · two polls out of time put the bar up, saying nothing more',
    !!b && b.text === 'Reconnecting…', JSON.stringify({ b, after }));
  await page.unroute(VIEW);
  const { v: gone, after: liftMs } = await waitFor(page, async (p) => !(await bar(p)), 10000);
  check('hang · the first good poll lifts it', !!gone, 'still up after ' + liftMs + ' ms');
  await page.context().close();
}

// pause
if (!only || only === 'pause') {
  const page = await openPage();
  await page.route(VIEW, (r) => r.fulfill({ status: 503, contentType: 'application/json',
    body: JSON.stringify({ paused: { elapsedMs: 1000, expectedMs: 120000 } }) }));
  await sleep(10000);
  const seen = { bar: await bar(page), modal: !!(await page.$('#pausemodal')) };
  check('pause · the announced pause keeps its modal and draws no bar', seen.modal && !seen.bar, JSON.stringify(seen));
  await page.unroute(VIEW);
  await sleep(6000);
  check('pause · the modal goes when the pause does', !(await page.$('#pausemodal')), 'modal still up');
  await page.context().close();
}

// refused
if (!only || only === 'refused') {
  const page = await openPage();
  const e = await pairEntry(page);
  if (!e) { say('SET-UP · no pair in m2\'s rail'); await browser.close(); process.exit(2); }
  await page.route('**/api/d/*/cmd', (r) => ((r.request().postData() || '').includes('"judge-race"')
    ? r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"refused by the repro"}' }) : r.continue()));
  // the offline case left this pair voted *approve*; *keep* is a fresh choice either way
  await openPair(page, e.q, 'keep');
  await page.click(`.sugg[data-card="${e.q}"] [data-act="submit"]`);
  const said = await waitFor(page, (p) => p.evaluate((q) => { const f = document.querySelector(`.sugg[data-card="${q}"] .foot.refusal`);
    return f && f.textContent.trim(); }, e.q), 9000);
  check('refused · the card says *That was refused: …* under it', said.v === 'That was refused: refused by the repro.',
    JSON.stringify(said));
  if (!said.v) check('refused · the next choice on the card retires the sentence', false, 'no sentence to retire');
  else {
    await page.click(`.sugg[data-card="${e.q}"] [data-v="approve"]`); await sleep(400);
    const left = await page.evaluate((q) => !!document.querySelector(`.sugg[data-card="${q}"] .foot.refusal`), e.q);
    check('refused · the next choice on the card retires the sentence', !left, 'the sentence stayed');
  }
  await page.context().close();
}

await browser.close();
say(fails.length ? `FAILED: ${fails.join(' · ')}` : 'all cases pass');
process.exit(fails.length ? 1 : 0);
