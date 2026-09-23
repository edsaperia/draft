#!/usr/bin/env node
/**
 * stranger-records — **a stranger reads a closed document with its ✔s, wherever 🌍 lets
 * them read it** (Q1508, Ed 2026-09-23, checking Q1504 on docs.vote/d/nh2026 signed out).
 *
 *   PORT=8261 DRAFT_BASE_URL=http://127.0.0.1:8261 DRAFT_DATA_DIR=<fresh> npm run server
 *   node scripts/repro/stranger-records.mjs http://127.0.0.1:8261 [--seed=7272]
 *
 * The phase ladder closes a document (from `--seed` up, until one lands at 🌍 link or
 * public); a member's seat says how many records the room has; then a **signed-out**
 * browser opens `/d/<slug>` and must meet the closed page with those records filed: the
 * door's payload carries them, the gutter carries their ✔ tabs, and one opens its card.
 * Before Q1508 the door's payload had no `records` and the page drew the text alone.
 *
 * **…and the rest of the closed page** (Q1512 (d), Ed 2026-09-23): the door's payload
 * carries the signatures and the carried rule changes the member's view does, and the
 * signed-out page brackets the text with the **Amendments** and the **Signatures**, block
 * for block the member's own closed page. Before Q1512 the door drew neither.
 *
 * Exit 0 when every check passes, 1 on the defect, 2 on a set-up that never got there.
 */
import { chromium } from 'playwright';
import { assertServerBuild, walkBase } from '../lib/assert-server.mjs';
import { say, arg, landOn } from '../lib/walk.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8261');
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
const viewAs = (slug, cookie) => fetch(`${BASE}/api/d/${slug}/view`,
  { headers: cookie ? { cookie } : {} }).then((r) => r.json()).catch(() => null);

await assertServerBuild(BASE, 'stranger-records');

// a closed document a stranger may read: the ladder draws 🌍 from its seed, so the seed
// moves on until the door says `canRead` — asked of the door, never of the manifest
let slug = null, door = null, seatsOf = [];
for (let seed = SEED; seed < SEED + 12 && !slug; seed++) {
  const ladder = await post('/api/dev/ladder', { to: 'closed', seed });
  if (ladder.json.phase !== 'closed' || !ladder.json.slug) continue;
  const d = await viewAs(ladder.json.slug, null);
  if (d && d.stranger && d.closed && d.canRead) {
    slug = ladder.json.slug; door = d; seatsOf = ladder.json.seats ?? [];
    say(`seed ${seed} · /d/${slug} · closed, 🌍 readable`);
  }
}
if (!slug) bail(`no seed from ${SEED} closed a document a stranger may read`);

// how many records the room itself is served
const member = seatsOf.find((s) => !s.founder) ?? seatsOf[0];
const seat = await post('/api/dev/seat', { slug, member: member.id });
const wire = await viewAs(slug, seat.cookie);
const RECORDS = (wire && wire.records ? wire.records : []).length;
if (!RECORDS) bail(`the room itself has no records on /d/${slug}`);
const ADOPTED = wire.records.filter((r) => r.outcome === 'adopted').length;

check('the door carries the closed document\'s records',
  Array.isArray(door.records) && door.records.length === RECORDS,
  `${Array.isArray(door.records) ? door.records.length : 'no'} records at the door for ${RECORDS} in the room`);
check('…with nobody\'s vote in them',
  !JSON.stringify(door.records ?? []).includes('"judgedByMe":true'));
// the signatures and the amendments ride the door too (Q1512), as many as the room's
const SIGS = ((wire.view && wire.view.closed && wire.view.closed.signatures) || []).length;
const AMENDS = ((wire.view && wire.view.motions) || []).filter((m) => m.status === 'carried' &&
  m.payload && (m.payload.kind === 'set' || m.payload.kind === 'text')).length;
if (!SIGS || !AMENDS) bail(`the room has ${SIGS} signatures and ${AMENDS} amendments on /d/${slug}`);
const doorSigs = (door.closed && door.closed.signatures) || [];
check('the door carries the signatures', doorSigs.length === SIGS,
  `${doorSigs.length} at the door for ${SIGS} in the room`);
check('…with no member id in them', !doorSigs.some((x) => 'member' in x));
check('the door carries the amendments', (door.amendmentRecords || []).length === AMENDS,
  `${(door.amendmentRecords || []).length} at the door for ${AMENDS} in the room`);
check('…naming no mover', !/"(by|mine|id)"/.test(JSON.stringify(door.amendmentRecords || [])));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });   // no cookie
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await landOn(page, `${BASE}/d/${slug}`);
await page.waitForSelector('.doc.closedpage', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(4500);   // the boot render and one poll

const state = await page.evaluate(() => {
  const marks = {};
  for (const el of document.querySelectorAll('#charter .achip .mk, #doc .mk')) {
    const k = [...el.classList].find((c) => c.startsWith('mk-'));
    if (k) marks[k] = (marks[k] ?? 0) + 1;
  }
  const tabs = [...document.querySelectorAll('#charter .achip[data-anchor^="rec:"]')];
  return {
    closedPage: !!document.querySelector('.doc.closedpage'),
    stranger: !!document.getElementById('holding'),
    marks,
    recTabs: tabs.length,
    // the Backlog is records; the Amendments and the Signatures are Q1512's
    backlog: !!document.querySelector('#charter [data-key="U:head"]'),
    amendments: !!document.querySelector('#charter [data-key="A:head"]'),
    signatures: !!document.querySelector('#charter [data-key="S:head"]'),
    bracket: [...document.querySelectorAll('#charter [data-key^="A:"], #charter [data-key^="S:"]')]
      .map((el) => el.dataset.key + ' ' + el.textContent.replace(/\s+/g, ' ').trim()),
    recTabIds: [...new Set(tabs.map((t) => t.dataset.anchor))],
  };
});
if (!state.closedPage) bail(`the signed-out page did not render as the closed one: ${JSON.stringify(state)}`);
say(`page · ${JSON.stringify(state.marks)} · ${state.recTabIds.length} records tabbed`);

check('the gutter carries a ✔ tab for the records', state.recTabIds.length > 0,
  `${state.recTabIds.length} record tabs for ${RECORDS} records (${ADOPTED} adopted)`);

const UNDECIDED = wire.records.filter((r) => r.outcome === 'undecided').length;
check('the undecided races stand as the Backlog', !UNDECIDED || state.backlog,
  `${UNDECIDED} undecided · Backlog heading ${state.backlog}`);
check('the Amendments stand after the text (Q1512)', state.amendments,
  `${AMENDS} amendments · Amendments heading ${state.amendments}`);
check('the Signatures stand after them (Q1512)', state.signatures,
  `${SIGS} signatures · Signatures heading ${state.signatures}`);

// …the same tabs a member's own closed page files, since the door draws through the
// member path's drawing (`itemsFromView`) rather than a copy of it
const mctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const [cname, cval] = seat.cookie.split(/=(.*)/s);
await mctx.addCookies([{ name: cname, value: cval, url: BASE }]);
const mpage = await mctx.newPage();
await landOn(mpage, `${BASE}/d/${slug}`);
await mpage.waitForSelector('.doc.closedpage', { timeout: 20000 }).catch(() => {});
await mpage.waitForTimeout(4500);
const memberTabs = await mpage.evaluate(() => [...new Set([...document
  .querySelectorAll('#charter .achip[data-anchor^="rec:"]')].map((t) => t.dataset.anchor))].sort());
const memberBracket = await mpage.evaluate(() => [...document
  .querySelectorAll('#charter [data-key^="A:"], #charter [data-key^="S:"]')]
  .map((el) => el.dataset.key + ' ' + el.textContent.replace(/\s+/g, ' ').trim()));
await mctx.close();
check('…the very tabs a member\'s closed page files',
  JSON.stringify(memberTabs) === JSON.stringify(state.recTabIds.slice().sort()),
  `member ${JSON.stringify(memberTabs)} · stranger ${JSON.stringify(state.recTabIds)}`);

// …and the bracket: the Amendments and the Signatures drawn through the member path's
// own `closedBlocks`, so block for block what a member's closed page reads (Q1512)
const same = JSON.stringify(memberBracket) === JSON.stringify(state.bracket);
check('…and the Amendments and the Signatures a member\'s closed page draws, block for block',
  memberBracket.length > 0 && same,
  `member ${memberBracket.length} blocks · stranger ${state.bracket.length}` + (same ? ''
    : ` · first difference: ${JSON.stringify(memberBracket.find((x, i) => x !== state.bracket[i]) ?? state.bracket[memberBracket.length])}`));

// …and one opens: a tab that draws and leads nowhere is the same defect in another face
const id = state.recTabIds[0];
const opened = id ? await page.evaluate(async (k) => {
  const q = String(k).replace(/["\\]/g, '\\$&');
  const b = document.querySelector('#charter .achip[data-anchor="' + q + '"]');
  if (!b) return null;
  b.click();
  await new Promise((r) => setTimeout(r, 1500));
  const card = document.querySelector('.sugg[data-card="' + q + '"]');
  return card ? card.textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : '';
}, id) : null;
check('a record\'s tab opens its card', !!opened, id ? `${id} → ${JSON.stringify(opened)}` : 'no record tab');
check('no page error', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
say(fails.length ? `\n${fails.length} FAIL(S)` : '\nall green');
process.exit(fails.length ? 1 : 0);
