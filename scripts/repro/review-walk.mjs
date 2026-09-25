#!/usr/bin/env node
/**
 * review-walk — **one OK per clause, and the walk from one owed record to the next**
 * (Q1536, Ed 2026-09-24: *if the doc is busy, someone can come back to a page with dozens
 * of green ticks to acknowledge, which is a lot of clicks* — options 3 + 4).
 *
 *   PORT=8341 DRAFT_BASE_URL=http://127.0.0.1:8341 DRAFT_DATA_DIR=<fresh> npm run server
 *   node scripts/repro/review-walk.mjs http://127.0.0.1:8341
 *
 * A room of five on a six-line text. While the reader `r` looks on, the clause at line 2
 * is decided four times — passed (a's), rejected with r's vote against it (a's again),
 * passed (b's), passed (r's own) — and line 4 once (c's). So r is owed five records: three
 * that fold into the clause's one card, r's own ✔ that never folds, and the lone ✔ below.
 *
 * What it asserts, on r's own page:
 *   fold      one rail entry, one tab and one card for line 2's three records, none of
 *             the three standing alone; r's own ✔ and the line-4 ✔ keep their own
 *   net       the fold's head is the clause now, marked against the text before the
 *             first of them; each record is listed, and opens inside the card with the
 *             clause's OK beneath it and the way back
 *   pin       the one pinned owed record is the next clause card in document order
 *   walk      Enter on the line-4 ✔ wraps to the fold at the top; Enter there files all
 *             three and opens r's own ✔; Enter there files it and, nothing being owed,
 *             closes the card — every opening travelled to
 *   kept      after a reload nothing is owed and nothing folds
 *
 * Exit 0 when every check passes, 1 on the defect, 2 on a set-up that never got there.
 */
import { chromium } from 'playwright';
import { assertServerBuild, walkBase } from '../lib/assert-server.mjs';
import { post as postTo, followLink, sleep, landOn, say } from '../lib/walk.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8341');
const post = (p, b, c) => postTo(BASE, p, b, c);
const bail = (why) => { say(`SET-UP · ${why}`); process.exit(2); };
const fails = [];
const check = (what, ok, detail = '') => {
  say(`${ok ? 'PASS · ' : 'FAIL · '}${what}${detail ? ` · ${detail}` : ''}`);
  if (!ok) fails.push(what);
};

await assertServerBuild(BASE, 'review-walk');

const TEXT = ['# House rules', 'Alpha line stays.', 'Beta line one.', 'Gamma line.', 'Delta line.', 'Epsilon line.'].join('\n');
const MEMBERS = ['a', 'b', 'c', 'r'];

/* ---- the room: a Founder who is a member, three API seats and the reader's page ---- */
const run = `rw-${Date.now().toString(36)}`;
const created = await (await post('/api/docs', { title: `Review walk ${run}`, email: `f-${run}@example.org`, isMember: true })).json();
if (!created.ok) bail(`creation refused: ${JSON.stringify(created)}`);
const slug = created.slug;
const founder = (await followLink(created.devLink)).cookie;
const cmd = async (name, args = {}, cookie = founder) => {
  const r = await post(`/api/d/${slug}/cmd`, { cmd: name, args }, cookie);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${name} refused (${r.status}): ${JSON.stringify(j)}`);
  return j.result ?? j;
};
await cmd('confirm-starting-text', { text: TEXT });
await cmd('set-convenor-membership', { isMember: true });
for (const [setting, value] of Object.entries({
  rate: { grant: 10, cap: 12, dripMinutes: 1 }, pace: { shape: 'fixed' }, quorum: { form: 'share', n: 50 },
  authorship: { rung: 'sealedElective' }, judgments: { rung: 'after' }, applications: { apply: false },
  admission: { price: 'pen' }, removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
  lapse: { afterMs: 60 * 60_000 }, ending: { endsAtMs: Date.now() + 6 * 3_600_000 }, bar: { pct: 50 },
  chamber: { rung: 'link' },
})) {
  await (await post(`/api/d/${slug}/cmd`, { cmd: 'reclaim', args: { setting } }, founder)).text();
  await cmd('set-setting', { setting, value });
}
for (const m of MEMBERS) await cmd('invite', { email: `${m}-${run}@example.org` });
await cmd('begin', { laidDown: [{ setting: 'startingText', power: 'assent' }] });
const tail = await (await fetch(`${BASE}/api/dev/outbox`)).json();
const cookies = { founder };
let rLink = null;
for (const m of MEMBERS) {
  const mail = (tail.mails ?? []).find((x) => x.to === `${m}-${run}@example.org`);
  if (!mail) bail(`no invitation for ${m}`);
  if (m === 'r') rLink = mail.link; else cookies[m] = (await followLink(mail.link)).cookie;
}
const view = (cookie = founder) => fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie } }).then((r) => r.json());

/* ---- the reader's page, open throughout, its grants given as a member's would be ---- */
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message || e)));
await landOn(page, rLink);
await page.waitForURL(new RegExp(`/d/${slug}`), { timeout: 20_000 });
await page.waitForSelector('#charter', { timeout: 20_000, state: 'attached' });
await sleep(1200);
await page.evaluate(() => fetch(location.pathname.replace('/d/', '/api/d/') + '/view').then((r) => r.json())
  .then((v) => localStorage.setItem('draft:grants:' + location.pathname.split('/')[2] + ':' + (v.me || ''),
    JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge']))));
await page.reload();
await page.waitForSelector('#charter', { timeout: 20_000, state: 'attached' });
await sleep(1500);

/** a proposal from an API seat, or from the reader's page, on line `at` */
const withWas = (v, at, line) => {
  const lines = String(v.text).split('\n');
  return [{ start: at, end: at + 1, lines: [line], was: [lines[at]] }];
};
async function propose(who, at, line) {
  if (who === 'r') {
    return page.evaluate(async ({ at, line }) => {
      const api = location.pathname.replace('/d/', '/api/d/');
      const v = await (await fetch(api + '/view')).json();
      const lines = String(v.text).split('\n');
      const r = await fetch(api + '/cmd', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cmd: 'propose-text', args: { baseVersion: v.textVersion,
          hunks: [{ start: at, end: at + 1, lines: [line], was: [lines[at]] }], why: 'walk: mine' } }) });
      const j = await r.json();
      return (j.result || j).id || JSON.stringify(j);
    }, { at, line });
  }
  const v = await view(cookies[who]);
  return (await cmd('propose-text', { baseVersion: v.textVersion, hunks: withWas(v, at, line), why: `walk: ${who}` }, cookies[who])).id;
}
const raceOf = (v, cid) => (v.clauses ?? []).find((c) => c.candidates?.some((k) => k.id === cid));
async function judge(who, cid, outcome) {
  if (who === 'r') {
    return page.evaluate(async ({ cid, outcome }) => {
      const api = location.pathname.replace('/d/', '/api/d/');
      const v = await (await fetch(api + '/view')).json();
      const c = (v.clauses || []).find((x) => (x.candidates || []).some((k) => k.id === cid));
      if (!c) return false;
      const r = await fetch(api + '/cmd', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cmd: 'judge-race', args: { a: c.incumbentId, b: cid, outcome } }) });
      return r.ok;
    }, { cid, outcome });
  }
  const v = await view(cookies[who]);
  const c = raceOf(v, cid);
  if (!c) return false;
  try { await cmd('judge-race', { a: c.incumbentId, b: cid, outcome }, cookies[who]); return true; } catch { return false; }
}
async function settled(cid) {
  for (let i = 0; i < 40; i++) {
    if (!raceOf(await view(), cid)) return true;
    await sleep(1500);
  }
  return false;
}
/** the voters prefer `cid` (`b`) or the text that stands (`a`), and the race ends */
async function decide(cid, voters, outcome) {
  for (const m of voters) await judge(m, cid, outcome);
  if (!(await settled(cid))) bail(`${cid} was never decided — floor ${(await view()).floor}`);
}

const R1 = await propose('a', 2, 'Beta line two.');
await decide(R1, ['founder', 'b', 'c'], 'b');
const X = await propose('a', 2, 'Beta line worse.');
await decide(X, ['r', 'founder', 'b'], 'a');
const R2 = await propose('b', 2, 'Beta line three.');
await decide(R2, ['founder', 'a', 'c'], 'b');
const R3 = await propose('r', 2, 'Beta by r.');
await decide(R3, ['founder', 'a', 'b'], 'b');
const R4 = await propose('c', 4, 'Delta changed.');
await decide(R4, ['founder', 'a', 'b'], 'b');
const text = String((await view()).text).split('\n');
if (text[2] !== 'Beta by r.' || text[4] !== 'Delta changed.') bail(`the text is not what the walk decided: ${JSON.stringify(text)}`);
say(`document /d/${slug} · R1 ${R1} · X ${X} · R2 ${R2} · R3 ${R3} (r's) · R4 ${R4}`);
await sleep(6000);   // a poll or two, so the page holds every record

/* ---- what r is owed, as the page holds it ---- */
const read = () => page.evaluate(() => {
  const S = window.SESSION;
  const sealed = S.SUGGS.filter((g) => g.state === 'sealed');
  const rail = [...document.querySelectorAll('#rail li')].map((li) => ({ q: li.dataset.q,
    pinned: li.classList.contains('pinned'), owed: !!li.querySelector('button.unread:not(.filed)') }));
  const tabs = [...document.querySelectorAll('#charter .achip[data-anchor]')].map((t) => t.dataset.anchor);
  return { open: S.openId, rail, tabs,
    sealed: sealed.map((g) => ({ id: g.id, keys: g.keys, fold: g.fold ? g.fold.map((m) => m.id) : null, mineIn: g.mineIn || null })) };
});
const at = await read();
const folds = at.sealed.filter((g) => g.fold);
const fold = folds[0];
check('one fold on the page, at line 2, holding three records', folds.length === 1 && fold && fold.keys[0] === 'L2' && fold.fold.length === 3,
  JSON.stringify(folds));
const mine = at.sealed.find((g) => (g.mineIn || []).includes(R3));
check('r\'s own ✔ is not folded in, and stands on its own', !!mine && !(fold && fold.fold.includes(mine.id)), JSON.stringify(mine));
const loose = at.sealed.filter((g) => !g.fold && g !== mine);
const r4 = loose.find((g) => g.keys[0] === 'L4');
check('the line-4 ✔ stands on its own', !!r4, JSON.stringify(loose.map((g) => [g.id, g.keys])));
const members = fold ? fold.fold : [];
check('one rail entry for the fold, none for its records',
  at.rail.filter((e) => e.q === fold?.id).length === 1 && !at.rail.some((e) => members.includes(e.q)),
  JSON.stringify(at.rail));
check('one tab for the fold, none for its records',
  at.tabs.includes(fold?.id) && !at.tabs.some((t) => members.includes(t)), JSON.stringify(at.tabs));
const pinnedOwed = at.rail.filter((e) => e.pinned && e.owed).map((e) => e.q);
check('the pinned record is the first owed in document order — the fold', pinnedOwed.length === 1 && pinnedOwed[0] === fold?.id,
  JSON.stringify(pinnedOwed));

/* ---- the walk: from the lowest owed record, Enter wraps to the top ---- */
const inView = (id) => page.evaluate((id) => {
  const c = [...document.querySelectorAll('.sugg[data-card]')].find((x) => x.dataset.card === id);
  if (!c) return false;
  const r = c.getBoundingClientRect();
  return r.top < innerHeight && r.bottom > 0;
}, id);
await page.evaluate((id) => document.querySelector('#rail li[data-q="' + id + '"] button').click(), r4?.id);
await sleep(2200);
check('the line-4 ✔ opens from its entry', (await read()).open === r4?.id);
await page.keyboard.press('Enter');
await sleep(2800);
let now = await read();
check('Enter on it files it and the walk wraps to the fold at the top', now.open === fold?.id && await inView(fold?.id),
  `open ${now.open}`);
check('…and the fold is the one owed record pinned', JSON.stringify(now.rail.filter((e) => e.pinned && e.owed).map((e) => e.q)) === JSON.stringify([fold?.id]),
  JSON.stringify(now.rail.filter((e) => e.pinned)));

/* ---- the fold's card: the net change and its records ---- */
const card = await page.evaluate((id) => {
  const c = [...document.querySelectorAll('.sugg[data-card]')].find((x) => x.dataset.card === id);
  if (!c) return null;
  const head = c.querySelector('.clausehead .rtext');
  return {
    head: head ? head.textContent.trim() : null,
    ins: [...c.querySelectorAll('.clausehead ins')].map((e) => e.textContent).join('|'),
    base: (window.SESSION.SUGGS.find((g) => g.id === id) || {}).replaced,
    rows: [...c.querySelectorAll('[data-foldopen]')].map((b) => b.dataset.foldopen),
    ok: (c.querySelector('.okbtn[data-seen]') || { dataset: {} }).dataset.seen,
  };
}, fold?.id);
check('the fold\'s head is the clause now', card && card.head === 'Beta by r.', JSON.stringify(card));
check('…marked against the text before the first of them', card && card.base === 'Beta line one.' && card.ins === 'by r',
  `ins ${card?.ins} · against ${card?.base}`);
check('each of its three records is listed', card && JSON.stringify(card.rows) === JSON.stringify(members), JSON.stringify(card?.rows));
check('its one OK is the fold\'s', card && card.ok === fold?.id, card?.ok);
await page.evaluate(() => document.querySelector('[data-foldopen]').click());
await sleep(900);
const inner = await page.evaluate((id) => {
  const c = [...document.querySelectorAll('.sugg[data-card]')].find((x) => x.dataset.card === id);
  return c ? { back: !!c.querySelector('[data-foldback]'), ok: (c.querySelector('.okbtn[data-seen]') || { dataset: {} }).dataset.seen,
    oks: c.querySelectorAll('.okbtn').length, counts: !!c.querySelector('.reccounts'),
    focus: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.anchor : null } : null;
}, fold?.id);
check('a listed record opens inside the fold, the fold\'s OK beneath it and the way back', inner && inner.back && inner.ok === fold?.id
  && inner.oks === 1 && inner.counts, JSON.stringify(inner));
await page.keyboard.press('Enter');
await sleep(2800);
now = await read();
const seals = await page.evaluate(() => [...window.SESSION.readSeals]);
check('Enter files all three at once', members.length === 3 && members.every((m) => seals.includes(m)), JSON.stringify(seals));
check('…and the walk opens r\'s own ✔, the next owed in document order', now.open === mine?.id && await inView(mine?.id), `open ${now.open}`);
check('no fold is left', !now.sealed.some((g) => g.fold));
const mineOk = await page.evaluate((id) => {
  const c = [...document.querySelectorAll('.sugg[data-card]')].find((x) => x.dataset.card === id);
  return c ? (c.querySelector('.okbtn[data-seen]') || { dataset: {} }).dataset.seen : null;
}, mine?.id);
check('r\'s own ✔ takes its own OK', mineOk === mine?.id, mineOk);
await page.keyboard.press('Enter');
await sleep(2500);
now = await read();
check('Enter on the last owed record files it and closes the card', now.open === null && !now.rail.some((e) => e.owed),
  `open ${now.open} · owed ${JSON.stringify(now.rail.filter((e) => e.owed))}`);

/* ---- kept across a reload ---- */
await page.reload();
await page.waitForSelector('#charter', { timeout: 20_000, state: 'attached' });
await sleep(2500);
now = await read();
check('after a reload nothing is owed and nothing folds', !now.rail.some((e) => e.owed) && !now.sealed.some((g) => g.fold),
  JSON.stringify(now.rail.filter((e) => e.owed)));
check('the three records stand filed in the clause\'s pile', members.every((m) => now.sealed.some((g) => g.id === m)));

check('the page threw nothing', errors.length === 0, errors.join(' · '));
await browser.close();
say(fails.length ? `\n✗ ${fails.length} failed: ${fails.join('; ')}` : '\n✓ one OK per clause, and the walk between them');
process.exit(fails.length ? 1 : 0);
