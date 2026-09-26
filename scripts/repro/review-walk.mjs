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
 * passed (b's), passed (r's own) — line 4 once (c's), and line 1 twice, both rejected
 * with r's vote against; then the Founder changes a rule over r's head. So r is owed
 * seven records and one Rules OK: line 1's two ✖s, which fold into a card that says the
 * text is unchanged, line 2's three that fold, r's own ✔ that never folds, the lone ✔ on
 * line 4, and 💤's news in the Rules.
 *
 * What it asserts, on r's own page (Ed's rulings of 2026-09-25 on the builder's calls):
 *   fold      one rail entry and one card for line 2's three records, no entry for any of
 *             them; r's own ✔ and the line-4 ✔ keep their own
 *   tabs (B)  the fold has no tab; its records keep theirs — the clause's pile — and each
 *             tab opens that record's own card wearing the clause's OK, the tab unmoved
 *   net       the fold's head is the clause now, marked against the text before the
 *             first of them; each record is listed, and opens its own card with the
 *             clause's OK beneath it and the way back
 *   same (A)  a fold of ✖s alone says under its plain head that nothing changed
 *   pin       the one pinned owed text record is the next clause card in document order
 *   walk (C)  Enter on the line-4 ✔ wraps to the top: the Rules' owed news, the keyboard
 *             on its tab; Enter there takes its OK and goes on down to line 1's fold, then
 *             line 2's, filing all three, then r's own ✔; Enter there files it and,
 *             nothing being owed, closes the card — every opening travelled to
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
// line 1: two ✖s r voted against, which fold into a card with nothing to mark (A)
const Y1 = await propose('a', 1, 'Alpha line worse.');
await decide(Y1, ['r', 'founder', 'b'], 'a');
const Y2 = await propose('b', 1, 'Alpha line worse still.');
await decide(Y2, ['r', 'founder', 'c'], 'a');
const text = String((await view()).text).split('\n');
if (text[1] !== 'Alpha line stays.' || text[2] !== 'Beta by r.' || text[4] !== 'Delta changed.') bail(`the text is not what the walk decided: ${JSON.stringify(text)}`);
say(`document /d/${slug} · R1 ${R1} · X ${X} · R2 ${R2} · R3 ${R3} (r's) · R4 ${R4} · Y1 ${Y1} · Y2 ${Y2}`);
/* ---- and a rule changed over r's head, which the Rules owe r an OK for (C8) ---- */
await cmd('set-setting', { setting: 'lapse', value: { afterMs: 2 * 60 * 60_000 } });
await sleep(6000);   // a poll or two, so the page holds every record

/* ---- what r is owed, as the page holds it ---- */
const read = () => page.evaluate(() => {
  const S = window.SESSION;
  const sealed = S.SUGGS.filter((g) => g.state === 'sealed');
  const rail = [...document.querySelectorAll('#rail li')].map((li) => ({ q: li.dataset.q,
    pinned: li.classList.contains('pinned'), owed: !!li.querySelector('button.unread:not(.filed)'),
    rules: !!li.querySelector('button.st-news'), current: !!li.querySelector('button[aria-current="true"]') }));
  const tabs = [...document.querySelectorAll('#charter .achip[data-anchor]')].map((t) => t.dataset.anchor);
  const band = document.querySelector('.setupcard');
  return { open: S.openId, rail, tabs, band: band ? band.dataset.setupcard : null,
    sealed: sealed.map((g) => ({ id: g.id, keys: g.keys, fold: g.fold ? g.fold.map((m) => m.id) : null, mineIn: g.mineIn || null })) };
});
const at = await read();
const folds = at.sealed.filter((g) => g.fold);
const fold = folds.find((g) => g.keys[0] === 'L2');
const same = folds.find((g) => g.keys[0] === 'L1');
check('one fold at line 2, holding three records', !!fold && fold.fold.length === 3, JSON.stringify(folds));
check('one fold at line 1, holding its two ✖s', !!same && same.fold.length === 2 && folds.length === 2, JSON.stringify(folds));
const mine = at.sealed.find((g) => (g.mineIn || []).includes(R3));
check('r\'s own ✔ is not folded in, and stands on its own', !!mine && !(fold && fold.fold.includes(mine.id)), JSON.stringify(mine));
const members = fold ? fold.fold : [];
const loose = at.sealed.filter((g) => !g.fold && g !== mine && !members.includes(g.id));
const r4 = loose.find((g) => g.keys[0] === 'L4');
check('the line-4 ✔ stands on its own', !!r4, JSON.stringify(loose.map((g) => [g.id, g.keys])));
check('one rail entry for the fold, none for its records',
  at.rail.filter((e) => e.q === fold?.id).length === 1 && !at.rail.some((e) => members.includes(e.q)),
  JSON.stringify(at.rail));
// **B** (Ed, 2026-09-25: *each keeps its tab — tabs are ok, it's stacks of queue cards
// that we're trying to fix here*): the fold has no tab, its records keep theirs — the
// clause's closed pile is its front record's tab with the other three records as edges
const door = await page.evaluate(() => {
  const t = document.querySelector('#charter p[data-key="L2"] .achip[data-anchor]');
  return t ? { id: t.dataset.anchor, pile: t.dataset.pile || null } : null;
});
check('the fold has no tab of its own; its records keep theirs, piled at the clause',
  !at.tabs.includes(fold?.id) && !!door && members.includes(door.id) && door.pile === '3',
  JSON.stringify({ tabs: at.tabs, door }));
const pinnedOwed = at.rail.filter((e) => e.pinned && e.owed).map((e) => e.q);
check('the pinned record is the first owed in document order — line 1\'s fold', pinnedOwed.length === 1 && pinnedOwed[0] === same?.id,
  JSON.stringify(pinnedOwed));
const rules = at.rail.filter((e) => e.rules).map((e) => e.q);
check('the Rules owe r one OK, for the rule changed over their head', JSON.stringify(rules) === JSON.stringify(['lapse']),
  JSON.stringify(rules));

/* ---- C: from the lowest owed record, Enter wraps to the top — the Rules first ---- */
const inView = (id) => page.evaluate((id) => {
  const c = [...document.querySelectorAll('.sugg[data-card]')].find((x) => x.dataset.card === id);
  if (!c) return false;
  const r = c.getBoundingClientRect();
  return r.top < innerHeight && r.bottom > 0;
}, id);
const bandInView = () => page.evaluate(() => {
  const c = document.querySelector('.setupcard');
  if (!c) return false;
  const r = c.getBoundingClientRect();
  return r.top < innerHeight && r.bottom > 0;
});
await page.evaluate((id) => document.querySelector('#rail li[data-q="' + id + '"] button').click(), r4?.id);
await sleep(2200);
check('the line-4 ✔ opens from its entry', (await read()).open === r4?.id);
await page.keyboard.press('Enter');
await sleep(2800);
let now = await read();
check('Enter on it files it and the walk wraps to the top: the Rules\' owed news', now.open === null && now.band === 'lapse'
  && await bandInView(), `open ${now.open} · band ${now.band}`);
check('…the keyboard on its own tab', await page.evaluate(() => {
  const a = document.activeElement;
  return !!a && a.matches('.achip[data-tab]') && a.dataset.tab === 'lapse';
}));
check('…and line 1\'s fold is the one owed text record pinned', JSON.stringify(now.rail.filter((e) => e.pinned && e.owed).map((e) => e.q)) === JSON.stringify([same?.id]),
  JSON.stringify(now.rail.filter((e) => e.pinned)));
await page.keyboard.press('Enter');
await sleep(3200);
now = await read();
check('Enter there takes the Rules\' OK and the walk goes on down, to line 1\'s fold', now.band === null && now.open === same?.id
  && await inView(same?.id) && !now.rail.some((e) => e.rules), `open ${now.open} · band ${now.band} · rules ${JSON.stringify(now.rail.filter((e) => e.rules))}`);
// **A** (Ed, 2026-09-25): a fold of ✖s alone says so under its plain head
const plain = await page.evaluate((id) => {
  const c = [...document.querySelectorAll('.sugg[data-card]')].find((x) => x.dataset.card === id);
  if (!c) return null;
  const head = c.querySelector('.clausehead .rtext');
  const s = c.querySelector('.foldsame');
  return { head: head ? head.textContent.trim() : null, ins: c.querySelectorAll('.clausehead ins, .clausehead del').length,
    same: s ? s.textContent.trim() : null };
}, same?.id);
check('line 1\'s fold of ✖s: its head the clause, unmarked, and a line saying it is unchanged',
  plain && plain.head === 'Alpha line stays.' && plain.ins === 0 && !!plain.same, JSON.stringify(plain));
await page.keyboard.press('Enter');
await sleep(3000);
now = await read();
check('Enter files both and the walk goes on down, to line 2\'s fold', now.open === fold?.id && await inView(fold?.id)
  && !now.rail.some((e) => e.q === same?.id), `open ${now.open}`);

/* ---- the fold's card: the net change and its records ---- */
const card = await page.evaluate((id) => {
  const c = [...document.querySelectorAll('.sugg[data-card]')].find((x) => x.dataset.card === id);
  if (!c) return null;
  const head = c.querySelector('.clausehead .rtext');
  return {
    head: head ? head.textContent.trim() : null,
    ins: [...c.querySelectorAll('.clausehead ins')].map((e) => e.textContent).join('|'),
    base: (window.SESSION.SUGGS.find((g) => g.id === id) || {}).replaced,
    same: !!c.querySelector('.foldsame'),
    rows: [...c.querySelectorAll('[data-foldopen]')].map((b) => b.dataset.foldopen),
    strip: [...c.querySelectorAll('.clausehead .achip[data-anchor]')].map((t) => t.dataset.anchor),
    ok: (c.querySelector('.okbtn[data-seen]') || { dataset: {} }).dataset.seen,
  };
}, fold?.id);
check('the fold\'s head is the clause now', card && card.head === 'Beta by r.', JSON.stringify(card));
check('…marked against the text before the first of them, and not said to be unchanged',
  card && card.base === 'Beta line one.' && card.ins === 'by r' && !card.same, `ins ${card?.ins} · against ${card?.base}`);
check('each of its three records is listed', card && JSON.stringify(card.rows) === JSON.stringify(members), JSON.stringify(card?.rows));
check('…and each has its own tab in the card\'s strip', card && members.every((m) => card.strip.includes(m)), JSON.stringify(card?.strip));
check('its one OK is the fold\'s', card && card.ok === fold?.id, card?.ok);
await page.evaluate(() => document.querySelector('[data-foldopen]').click());
await sleep(1200);
const cardOf = (id) => page.evaluate((id) => {
  const c = [...document.querySelectorAll('.sugg[data-card]')].find((x) => x.dataset.card === id);
  return c ? { back: !!c.querySelector('[data-foldback]'), ok: (c.querySelector('.okbtn[data-seen]') || { dataset: {} }).dataset.seen,
    // the participation line: the eyebrow's `.reccounts`, or the fact line
    // of a record built on the one shell (Q1541 stage 1)
    oks: c.querySelectorAll('.okbtn').length, counts: !!c.querySelector('.reccounts, [data-slot="fact"]'),
    focus: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.anchor : null } : null;
}, id);
let inner = await cardOf(members[0]);
now = await read();
check('a listed record opens its own card, the fold\'s OK beneath it and the way back', now.open === members[0] && inner && inner.back
  && inner.ok === fold?.id && inner.oks === 1 && inner.counts && inner.focus === members[0], JSON.stringify({ open: now.open, inner }));
check('…its rail entry still the fold\'s one, open', now.rail.filter((e) => e.q === fold?.id && e.current).length === 1
  && !now.rail.some((e) => members.includes(e.q)), JSON.stringify(now.rail));
// **B**: a record's own tab opens its own card, wearing the clause's OK — and does not move
const tabTop = (id) => page.evaluate((id) => {
  const t = [...document.querySelectorAll('.sugg[data-card] .clausehead .achip[data-anchor]')].find((x) => x.dataset.anchor === id);
  return t ? t.getBoundingClientRect().top : null;
}, id);
const before = await tabTop(members[2]);
await page.evaluate((id) => [...document.querySelectorAll('.sugg[data-card] .clausehead .achip[data-anchor]')]
  .find((x) => x.dataset.anchor === id).click(), members[2]);
await sleep(1500);
const after = await tabTop(members[2]);
inner = await cardOf(members[2]);
now = await read();
check('a record\'s tab opens its own card, the clause\'s OK on it', now.open === members[2] && inner && inner.ok === fold?.id && inner.oks === 1,
  JSON.stringify({ open: now.open, inner }));
check('…and the tab clicked does not move', before != null && after != null && Math.abs(after - before) <= 0.5, `${before} → ${after}`);
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
check('Enter on the last thing owed files it and closes the card', now.open === null && now.band === null
  && !now.rail.some((e) => e.owed || e.rules),
  `open ${now.open} · band ${now.band} · owed ${JSON.stringify(now.rail.filter((e) => e.owed || e.rules))}`);

/* ---- kept across a reload ---- */
await page.reload();
await page.waitForSelector('#charter', { timeout: 20_000, state: 'attached' });
await sleep(2500);
now = await read();
check('after a reload nothing is owed and nothing folds', !now.rail.some((e) => e.owed || e.rules) && !now.sealed.some((g) => g.fold),
  JSON.stringify(now.rail.filter((e) => e.owed || e.rules)));
check('the three records stand filed in the clause\'s pile', members.every((m) => now.sealed.some((g) => g.id === m)));

check('the page threw nothing', errors.length === 0, errors.join(' · '));
await browser.close();
say(fails.length ? `\n✗ ${fails.length} failed: ${fails.join('; ')}` : '\n✓ one OK per clause, and the walk between them');
process.exit(fails.length ? 1 : 0);
