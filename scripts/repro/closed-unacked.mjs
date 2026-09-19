#!/usr/bin/env node
/**
 * closed-unacked — **a closed document asks nothing but the signature** (Q1479 (a), Ed
 * 2026-09-19; issue #30 findings 2 and 3).
 *
 *   PORT=8341 DRAFT_BASE_URL=http://127.0.0.1:8341 DRAFT_DATA_DIR=<fresh> npm run server
 *   node scripts/repro/closed-unacked.mjs http://127.0.0.1:8341 [--seed=7272]
 *
 * ⚖️'s OK lives in `localStorage`, per browser and per seat, and `withheld` (session.js)
 * drops **every entry a race made** until it is given (C9 as amended by Q1328). That rule
 * is about a document with judging left in it. On a *closed* one there is no ⚖️ card left
 * to press — the rail keeps only 🥂 — so a member who acknowledged on their laptop and
 * opens the closing mail's link on their phone meets the final document reading as still
 * being decided: seventeen `mk-deciding` marks, seventeen greyed tabs that open nothing,
 * and not one of the sealed records the server has already sent them.
 *
 * The seat is chosen by the wire, never by name: the ladder's closed rung signs for four
 * of the cast, and a seat that has already signed is served no 🥂 and so cannot show the
 * second half of this. The browser context is **fresh** — that is the whole point, since
 * an empty `localStorage` is what makes this seat the one the mail's link produces.
 *
 * Exit 0 when every check passes, 1 on the defect, 2 on a set-up that never got there.
 */
import { chromium } from 'playwright';
import { assertServerBuild, walkBase } from '../lib/assert-server.mjs';
import { say, arg } from '../lib/walk.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8341');
const SEED = Number(arg('seed') ?? 7272);

const fails = [];
const check = (what, ok, detail = '') => {
  say(`${ok ? 'PASS · ' : 'FAIL · '}${what}${detail ? ` · ${detail}` : ''}`);
  if (!ok) fails.push(what);
};
const bail = (why) => { say(`SET-UP · ${why}`); process.exit(2); };

const post = async (path, body, cookie) => {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, cookie: (r.headers.get('set-cookie') ?? '').split(';')[0],
    json: await r.json().catch(() => ({})) };
};
const viewAs = (slug, cookie) => fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie } })
  .then((r) => r.json()).catch(() => null);

// Q911: a walk on a default port drives whatever is listening, and a stale process serves
// today's page over a week-old engine — so this asks the process first.
await assertServerBuild(BASE, 'closed-unacked');

const ladder = await post('/api/dev/ladder', { to: 'closed', seed: SEED });
if (ladder.json.phase !== 'closed' || !ladder.json.slug) {
  bail(`the ladder did not close a document: ${JSON.stringify(ladder.json).slice(0, 300)}`);
}
const slug = ladder.json.slug;
const members = (ladder.json.seats ?? []).filter((s) => !s.founder).map((s) => s.id);
if (members.length < 2) bail(`the ladder seated no room: ${JSON.stringify(ladder.json.seats).slice(0, 300)}`);

// **Who has not signed** — asked of the wire, because the rung signs for part of the cast
// and a signed seat is served no 🥂 at all. Any seat's own view carries the signatures.
const first = await post('/api/dev/seat', { slug, member: members[0] });
const probe = await viewAs(slug, first.cookie);
if (!probe || !probe.record) bail(`no closed record on the wire for /d/${slug}`);
const signed = new Set((probe.record.signatures ?? []).map((s) => s.member));
const ME = members.find((m) => !signed.has(m));
if (!ME) bail(`every member signed already, so no seat is left to read 🥂 from`);

const seat = await post('/api/dev/seat', { slug, member: ME });
if (seat.status !== 200) bail(`the seat switch refused ${ME}: ${seat.status}`);
const wire = await viewAs(slug, seat.cookie);
const RECORDS = (wire.records ?? []).length;
// The whole finding is that the page withholds what the server already sent, so a document
// whose wire carries no records could not show it either way.
if (!RECORDS) bail(`the server sent ${ME} no records, so there is nothing to withhold`);
say(`document /d/${slug} · seat ${ME} (unsigned) · ${RECORDS} records on the wire`
  + ` · ${(probe.record.signatures ?? []).length} signatures already`);

const browser = await chromium.launch();
// **fresh**: an empty `localStorage` is this seat's defining fact — the ⚖️ OK was never
// given *in this browser*, which is what the closing mail's link produces every time.
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const [cname, cval] = seat.cookie.split(/=(.*)/s);
await ctx.addCookies([{ name: cname, value: cval, url: BASE }]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}/d/${slug}`);
await page.waitForSelector('.doc.closedpage', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(4500);   // the boot render and one poll

const state = await page.evaluate(() => {
  const keyOf = (li) => li.dataset.q
    || (li.querySelector('[data-card]') ?? { dataset: {} }).dataset.card || '?';
  const marks = {};
  for (const el of document.querySelectorAll('#doc .mk')) {
    const k = [...el.classList].find((c) => c.startsWith('mk-'));
    if (k) marks[k] = (marks[k] ?? 0) + 1;
  }
  return {
    closedPage: !!document.querySelector('.doc.closedpage'),
    rail: [...document.querySelectorAll('#rail li')].map(keyOf),
    // a greyed tab stands for a question held back and is not a control at all
    // (Q1413) — on a closed page there is nothing left it could ever lead to
    held: document.querySelectorAll('#charter .achip.held').length,
    deciding: marks['mk-deciding'] ?? 0,
    marks,
  };
});
if (!state.closedPage) bail(`the page did not render as the closed one for ${ME}`);

const recs = state.rail.filter((k) => k.startsWith('rec:'));
check('no clause still says *being decided*', state.deciding === 0,
  `${state.deciding} mk-deciding marks · ${JSON.stringify(state.marks)}`);
check('no tab in the gutter opens nothing', state.held === 0, `${state.held} greyed tabs`);
check('the sealed records stand in the rail', recs.length === RECORDS,
  `${recs.length} rec: entries for ${RECORDS} records on the wire · rail ${JSON.stringify(state.rail)}`);

// …and one of them opens. A rail entry that draws and leads nowhere is the same defect
// wearing a different face, so the record is opened rather than counted.
const key = recs[0];
const opened = key ? await page.evaluate(async (k) => {
  const q = String(k).replace(/["\\]/g, '\\$&');
  const b = document.querySelector('#rail li[data-q="' + q + '"] button');
  if (!b) return null;
  b.click();
  await new Promise((r) => setTimeout(r, 1500));
  const card = document.querySelector('.sugg[data-card="' + q + '"]');
  return card ? card.textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : '';
}, key) : null;
check('a record opens its card', !!opened, key ? `${key} → ${JSON.stringify(opened)}` : 'no rec: entry to open');

// **And the one thing a closed page does still ask is untouched**: 🥂's OK is the
// signature, so this presses it and reads the wire back rather than the page.
const railHasClosing = state.rail.includes('closing');
check('🥂 is still served to a seat that has not signed', railHasClosing,
  `rail ${JSON.stringify(state.rail)}`);
if (railHasClosing) {
  const pressed = await page.evaluate(async () => {
    document.querySelector('#rail li[data-q="closing"] button')?.click();
    await new Promise((r) => setTimeout(r, 900));
    const ok = document.querySelector('[data-setupcard="closing"] .okbtn');
    if (!ok || ok.disabled) return false;
    ok.scrollIntoView({ block: 'center' });
    ok.click();
    return true;
  });
  await page.waitForTimeout(2500);
  const after = await viewAs(slug, seat.cookie);
  const nowSigned = ((after?.record?.signatures) ?? []).some((s) => s.member === ME);
  check('and the signature lands', pressed && nowSigned,
    `pressed ${pressed} · signatures ${JSON.stringify(((after?.record?.signatures) ?? []).map((s) => s.member))}`);
}

check('the page threw nothing', errors.length === 0, errors.join(' · '));

await browser.close();
say(fails.length ? `\n✗ ${fails.length} failed: ${fails.join('; ')}` : '\n✓ the closed page asks nothing but the signature');
process.exit(fails.length ? 1 : 0);
