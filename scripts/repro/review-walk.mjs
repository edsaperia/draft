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
 *   tabs      the fold wears its own tab, the ✔✔✔ (Q1561 (n)), in front of the clause's
 *             pile; its records keep theirs, and each opens that record's own card
 *             whose OK acknowledges that record only (Q1561), the tab unmoved
 *   net       the fold's head is the clause now, marked against the text before the
 *             first of them; every record in it is drawn in full, newest first, the
 *             original once at the bottom (Q1561; Ed, 2026-10-01)
 *   same (A)  a fold of ✖s alone says under its plain head that nothing changed
 *   pin       the one pinned owed text record is the next clause card in document order
 *   walk (C)  Enter on the line-4 ✔ wraps to the top: the Rules' owed news, the keyboard
 *             on its tab; Enter there takes its OK and goes on down to line 1's fold, then
 *             line 2's, filing all three, then r's own ✔; Enter there files it and,
 *             nothing being owed, closes the card — every opening travelled to
 *   kept      after a reload nothing is owed and nothing folds
 *   #149      an insertion's lone ✔ reads *(no text here)* below its wording, green whole;
 *             then, reworded, the fold over the two is labelled *Current text*, draws the
 *             current text once, says no *since replaced* or *Marked against*, and its
 *             bottom *Previous text* reads *(no text here)* (Ed, 2026-10-02)
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
// **Q1561 (n)** (Ed, 2026-09-28, amending 2026-09-25's B): the fold wears its own tab, a
// stack of three ✔s always, at the front of the clause's closed pile — its three records
// and r's own ✔ the edges behind it
const door = await page.evaluate(() => {
  const t = document.querySelector('#charter p[data-key="L2"] .achip[data-anchor]');
  return t ? { id: t.dataset.anchor, pile: t.dataset.pile || null, fold: !!t.querySelector('.mk-fold') } : null;
});
check('the fold wears its own ✔✔✔ tab, in front of the clause\'s pile',
  at.tabs.includes(fold?.id) && !!door && door.id === fold?.id && door.fold && door.pile === '4',
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
  // the card's fact line (the one shell's `[data-slot="fact"]`, Q1541 stage 7)
  const s = c.querySelector('[data-slot="fact"]');
  const t = s ? s.textContent.trim() : '';
  return { head: head ? head.textContent.trim() : null, ins: c.querySelectorAll('.clausehead ins, .clausehead del').length,
    same: /^Unchanged/.test(t) ? t : null,
    // nothing passed, so there is no version to draw before them (Ed, 2026-10-01)
    prevs: [...c.querySelectorAll('.ranked .glab')].filter((g) => g.textContent.trim() === 'Previous text').length };
}, same?.id);
check('line 1\'s fold of ✖s: its head the clause, unmarked, and a line saying it is unchanged',
  plain && plain.head === 'Alpha line stays.' && plain.ins === 0 && !!plain.same && plain.prevs === 0, JSON.stringify(plain));
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
    same: /^Unchanged/.test(((c.querySelector('[data-slot="fact"]') || {}).textContent || '').trim()),
    // every record drawn in full, oldest first (Q1561): one block each, its own label
    parts: [...c.querySelectorAll('.foldpart')].map((b) => ((b.querySelector('.glab') || {}).textContent || '').trim()),
    fold: ((window.SESSION.SUGGS.find((g) => g.id === id) || {}).fold || []).map((m) => m.id),
    strip: [...c.querySelectorAll('.clausehead .achip[data-anchor]')].map((t) => t.dataset.anchor),
    ok: (c.querySelector('.okbtn[data-seen]') || { dataset: {} }).dataset.seen,
  };
}, fold?.id);
check('the fold\'s head is the clause now', card && card.head === 'Beta by r.', JSON.stringify(card));
check('…marked against the text before the first of them, and not said to be unchanged',
  card && card.base === 'Beta line one.' && card.ins === 'by r' && !card.same, `ins ${card?.ins} · against ${card?.base}`);
check('every record in it is drawn in full', card && card.parts.length === 3
  && JSON.stringify(card.fold) === JSON.stringify(members), JSON.stringify({ parts: card?.parts, fold: card?.fold }));
// **each version once, not each change** (Ed, 2026-10-01: *not [(v0->v1), (v1->v2),
// (v2->v3)] but instead [v0, v1, v2, v3]*), **newest first** (Ed, the same day: *each
// change getting older as you go down, with the oldest at the bottom*): the records R2,
// X, R1 top to bottom, one *Previous text* in the fold, the original, after every record
// and inside none; each ✔ marked against the text it replaced (result-only, K25: what
// it inserted), and X's ✖ draws no head of its own, making no version
const versions = await page.evaluate((id) => {
  const c = [...document.querySelectorAll('.sugg[data-card]')].find((x) => x.dataset.card === id);
  if (!c) return null;
  const isPrev = (el) => ((el.querySelector('.glab') || {}).textContent || '').trim() === 'Previous text';
  const prevs = [...c.querySelectorAll('.ranked')].filter((b) => !b.classList.contains('foldpart') && isPrev(b));
  const parts = [...c.querySelectorAll('.foldpart')];
  const tops = [...c.querySelectorAll('.ranked')].filter((b) => !(b.parentElement && b.parentElement.closest('.ranked')));
  // a block's head is its own `.rtext`; the wordings it weighed are nested blocks
  const head = (b) => { const t = b.querySelector(':scope > .rtext'); return t && t.textContent.trim() ? t : null; };
  return {
    prevs: prevs.length,
    prevLast: tops.length > 0 && prevs[0] === tops[tops.length - 1],
    prevText: prevs[0] ? (prevs[0].querySelector('.rtext') || prevs[0]).textContent.replace(/^Previous text/, '').trim() : null,
    inside: parts.filter((b) => [...b.querySelectorAll('.ranked')].some(isPrev)).length,
    heads: parts.map((b) => { const t = head(b); return t ? { ins: [...t.querySelectorAll('ins')].map((e) => e.textContent).join('|'),
      del: [...t.querySelectorAll('del')].map((e) => e.textContent).join('|'), text: t.textContent.trim() } : null; }),
  };
}, fold?.id);
check('the fold draws one Previous text, last, the text before them all, and no record draws its own',
  versions && versions.prevs === 1 && versions.prevLast && /Beta line one\./.test(versions.prevText || '') && versions.inside === 0,
  JSON.stringify(versions));
check('…newest first: R2 marked against the text it replaced, X\'s ✖ no head, R1 marked against the original',
  versions && versions.heads.length === 3 && !!versions.heads[0] && versions.heads[0].ins === 'three' && versions.heads[0].text === 'Beta line three.'
    && versions.heads[1] === null
    && !!versions.heads[2] && versions.heads[2].ins === 'two' && versions.heads[2].text === 'Beta line two.',
  JSON.stringify(versions && versions.heads));
check('…and the fold and each record have their own tab in the card\'s strip',
  card && card.strip.includes(fold?.id) && members.every((m) => card.strip.includes(m)), JSON.stringify(card?.strip));
check('its one OK is the fold\'s', card && card.ok === fold?.id, card?.ok);
const cardOf = (id) => page.evaluate((id) => {
  const c = [...document.querySelectorAll('.sugg[data-card]')].find((x) => x.dataset.card === id);
  return c ? { back: !!c.querySelector('[data-foldback]'), ok: (c.querySelector('.okbtn[data-seen]') || { dataset: {} }).dataset.seen,
    // the participation line: the eyebrow's `.reccounts`, or the fact line
    // of a record built on the one shell (Q1541 stage 1)
    oks: c.querySelectorAll('.okbtn').length, counts: !!c.querySelector('.reccounts, [data-slot="fact"]'),
    focus: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.anchor : null } : null;
}, id);
// **Q1561**: a record's own tab opens its own card, whose OK acknowledges that record
// only — and the tab clicked does not move
const tabTop = (id) => page.evaluate((id) => {
  const t = [...document.querySelectorAll('.sugg[data-card] .clausehead .achip[data-anchor]')].find((x) => x.dataset.anchor === id);
  return t ? t.getBoundingClientRect().top : null;
}, id);
const before = await tabTop(members[2]);
await page.evaluate((id) => [...document.querySelectorAll('.sugg[data-card] .clausehead .achip[data-anchor]')]
  .find((x) => x.dataset.anchor === id).click(), members[2]);
await sleep(1500);
const after = await tabTop(members[2]);
let inner = await cardOf(members[2]);
now = await read();
check('a record\'s tab opens its own card, its own OK on it and no way back', now.open === members[2] && inner
  && inner.ok === members[2] && inner.oks === 1 && !inner.back && inner.counts, JSON.stringify({ open: now.open, inner }));
check('…and the tab clicked does not move', before != null && after != null && Math.abs(after - before) <= 0.5, `${before} → ${after}`);
await page.keyboard.press('Enter');
await sleep(2800);
now = await read();
let seals = await page.evaluate(() => [...window.SESSION.readSeals]);
check('Enter there files that record alone', seals.includes(members[2]) && !seals.includes(members[0]) && !seals.includes(members[1]),
  JSON.stringify(seals));
const rest = now.sealed.find((g) => g.fold && g.keys[0] === 'L2');
check('…and the walk goes on to the clause\'s fold of the two left', !!rest && now.open === rest.id
  && JSON.stringify(rest.fold) === JSON.stringify(members.slice(0, 2)) && await inView(rest.id), `open ${now.open} · ${JSON.stringify(rest)}`);
await page.keyboard.press('Enter');
await sleep(2800);
now = await read();
seals = await page.evaluate(() => [...window.SESSION.readSeals]);
check('Enter on the fold files the rest at once', members.length === 3 && members.every((m) => seals.includes(m)), JSON.stringify(seals));
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

/* ---- #149 (Ed, 2026-10-02): an insertion's lone ✔, then a fold over it ---- */
// a's line inserted after the last and passed, r not voting: r is owed its lone ✔,
// which says it replaced nothing — *(no text here)* — and wears the passed green whole
const v6 = await view();
const L6 = String(v6.text).split('\n');
const INS = (await cmd('propose-text', { baseVersion: v6.textVersion, why: 'walk: insert',
  hunks: [{ start: L6.length, end: L6.length, lines: ['Zeta line.'], after: L6[L6.length - 1] }] }, cookies.a)).id;
await decide(INS, ['founder', 'b', 'c'], 'b');
await sleep(6000);
const cardText = (id) => page.evaluate((id) => {
  const c = [...document.querySelectorAll('.sugg[data-card]')].find((x) => x.dataset.card === id);
  if (!c) return null;
  const glabs = [...c.querySelectorAll('.glab')].map((g) => g.textContent.trim());
  const prev = [...c.querySelectorAll('.ranked')].filter((b) => ((b.querySelector('.glab') || {}).textContent || '').trim() === 'Previous text');
  const head = c.querySelector('.clausehead .rtext');
  return { glabs, first: glabs[0] || null, text: c.textContent,
    head: head ? head.textContent.trim() : null, headIns: head ? [...head.querySelectorAll('ins')].map((e) => e.textContent).join('|') : '',
    prev: prev.map((b) => b.textContent.replace(/^\s*Previous text/, '').trim()),
    lastPrev: prev.length ? prev[prev.length - 1].textContent.replace(/^\s*Previous text/, '').trim() : null };
}, id);
const sealedAt = async (key) => (await read()).sealed.filter((g) => (g.keys || [])[0] === key);
const KEY = 'L' + L6.length;
const lone = (await sealedAt(KEY)).find((g) => !g.fold);
if (!lone) bail(`no record for the insertion at ${KEY}`);
await page.evaluate((id) => { const b = document.querySelector('#rail li[data-q="' + id + '"] button'); if (b) b.click(); }, lone.id);
await sleep(2200);
const one = await cardText(lone.id);
check('#149 · the lone ✔ of an insertion draws its Previous text, reading (no text here)',
  !!one && one.prev.length === 1 && one.prev[0] === '(no text here)', JSON.stringify(one && { prev: one.prev }));
check('#149 · …and its passed wording is green whole, what passed against nothing',
  !!one && one.head === 'Zeta line.' && one.headIns === 'Zeta line.', JSON.stringify(one && { head: one.head, ins: one.headIns }));
// closed again by its own entry, never by its OK: an open record is never folded in
await page.evaluate((id) => { const b = document.querySelector('#rail li[data-q="' + id + '"] button'); if (b) b.click(); }, lone.id);
await sleep(1500);
if ((await read()).open === lone.id) bail('the insertion\'s lone card would not close from its entry');
// b's rewording of that line, passed: r is owed two ✔ on one clause, which fold
const RW = await propose('b', L6.length, 'Zeta line two.');
await decide(RW, ['founder', 'a', 'c'], 'b');
await sleep(6000);
const zfold = (await sealedAt(KEY)).find((g) => g.fold);
check('#149 · the insertion and its rewording fold into one card', !!zfold && zfold.fold.length === 2,
  JSON.stringify(await sealedAt(KEY)));
if (zfold) {
  await page.evaluate((id) => { const b = document.querySelector('#rail li[data-q="' + id + '"] button'); if (b) b.click(); }, zfold.id);
  await sleep(2200);
  const z = await cardText(zfold.id);
  const times = z ? z.text.split('Zeta line two.').length - 1 : -1;
  check('#149 · the fold is labelled Current text', !!z && z.first === 'Current text', JSON.stringify(z && z.glabs));
  check('#149 · …the current text drawn once, at the top', !!z && times === 1 && z.head === 'Zeta line two.', `${times} times · head ${z && z.head}`);
  check('#149 · …no since replaced and no Marked against inside it', !!z && !/since replaced/.test(z.text) && !/Marked against/.test(z.text),
    JSON.stringify(z && z.glabs));
  check('#149 · …and its bottom Previous text reads (no text here), never a deletion', !!z && z.lastPrev === '(no text here)'
    && !/This clause would be removed/.test(z.text), JSON.stringify(z && z.prev));
}

check('the page threw nothing', errors.length === 0, errors.join(' · '));
await browser.close();
say(fails.length ? `\n✗ ${fails.length} failed: ${fails.join('; ')}` : '\n✓ one OK per clause, and the walk between them');
process.exit(fails.length ? 1 : 0);
