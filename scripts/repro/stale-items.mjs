#!/usr/bin/env node
/**
 * stale-items — **are the cards and the rail built from the document they are about to
 * replace?** (issue #66; Ed, 2026-09-19)
 *
 *   node scripts/repro/stale-items.mjs http://127.0.0.1:8311
 *
 * `syncCharter` hands the new `DOC` and the new `SUGGS` to one `setData` call — and an
 * argument is evaluated before the call, so `LIVE_HOOKS.items()` runs while `SESSION.DOC`
 * still holds the pre-adoption text. `itemsFromView` reads that `DOC` for every site's
 * remembered wording (`origin`) and for every label, so on a page that was open when a
 * wording carried, the items are one render behind the column beside them:
 *
 *   - a site keyed in the **new** line space, its origin looked up in the **old** column —
 *     blank where the key is new, somebody else's clause where a line went away above it;
 *   - and that stale origin read straight back by `misaimed` (live.js), the predicate
 *     `standDown` refuses the ✏️ Re-make press by, so the press sends nothing at all.
 *
 * Two cases, each on its own document, with the Founder keeping the Text's pen so an
 * adoption lands on demand (`pen-text` passes the instant it is submitted):
 *
 *   origin    a member's live proposal on the last clause, their page open; the Founder
 *             turns line 0 into two, which moves every key below it down one. The item's
 *             origin must still be the wording the proposal replaces, and `misaimed` must
 *             refuse nothing. The issue's own repro, in the page.
 *   remake    the same member's proposal, their page open; the Founder rewrites the very
 *             clause it was made against, so a rival's wording carries and the proposal is
 *             handed back `rebase-pending` — ↻. Its card's head must read the clause as it
 *             now stands (SURFACE E38), and ✏️ Re-make must send `rebase-text`.
 *
 * Exit 0 only if both pass; exit 1 on any failure, 2 on a broken set-up.
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, sleep, withWas } from '../lib/walk.mjs';

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8311').replace(/\/$/, '');
const ONLY = (argv.find((a) => a.startsWith('--case=')) || '').slice(7);
const say = (s) => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${s}`);
const die = (m) => { console.error(`stale-items: ${m}`); process.exit(2); };

const health = await (await fetch(`${BASE}/healthz`)).json();
if (health.devMail !== true) die(`${BASE} is not a dev server`);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);

// the clause every case proposes against — the last line of three
const LAST = 'Minutes are kept.';
const TEXT = ['# Charter', 'The club meets weekly.', LAST];

// ---- a document per case: the Founder keeps the pen, one member is seated ----
async function found(run) {
  const founderEmail = `founder-${run}@example.org`, memberEmail = `member-${run}@example.org`;
  const created = await (await post('/api/docs', { title: `Stale items ${run}`, email: founderEmail, isMember: true })).json();
  if (!created.ok || !created.devLink) die(`creation refused: ${JSON.stringify(created)}`);
  const slug = created.slug;
  const founder = (await followLink(created.devLink)).cookie;
  const cmd = async (name, args = {}, cookie = founder) => {
    const r = await post(`/api/d/${slug}/cmd`, { cmd: name, args }, cookie);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) die(`${name} refused (${r.status}): ${JSON.stringify(j)}`);
    return j.result ?? j;
  };
  const view = async (cookie = founder) =>
    (await fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie } })).json();
  // the ✒️ decree, always against the version the document holds now, and stating the
  // wording it replaces like any other client (Q1463 (1))
  const decree = async (hunks, why) => {
    const v = await view();
    return cmd('pen-text', { baseVersion: v.textVersion ?? 0, hunks: withWas(v.text, hunks), why });
  };
  await cmd('confirm-starting-text', { text: TEXT.join('\n') });
  await cmd('set-convenor-membership', { isMember: true });
  for (const [setting, value] of Object.entries({
    rate: { grant: 5, cap: 8, dripMinutes: 1 }, pace: { shape: 'fixed' }, quorum: { form: 'share', n: 30 },
    authorship: { rung: 'sealedElective' }, judgments: { rung: 'after' }, applications: { apply: false },
    admission: { price: 'pen' }, removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
    lapse: { afterMs: 5 * 60_000 }, ending: { endsAtMs: Date.now() + 6 * 3_600_000 }, bar: { pct: 50 },
    chamber: { rung: 'link' },
  })) {
    await (await post(`/api/d/${slug}/cmd`, { cmd: 'reclaim', args: { setting } }, founder)).text();
    await cmd('set-setting', { setting, value });
  }
  await cmd('invite', { email: memberEmail });
  // **an empty `laidDown` keeps every power**, the Text's pen included (SPEC §9.7 rule 8)
  await cmd('begin', { laidDown: [] });
  const tail = await (await fetch(`${BASE}/api/dev/outbox`)).json();
  const mail = (tail.mails ?? []).find((m) => m.to === memberEmail && m.link);
  if (!mail) die('no invitation for the page seat in the dev outbox');
  const member = (await followLink(mail.link)).cookie;
  return { slug, cmd, view, decree, link: mail.link, member };
}

// ---- the page seat, every grant already acknowledged ----------------------
// the magic link is single use and has already been spent for the member's cookie
// (the proposal is posted over the wire before the page is opened), so the seat is
// the cookie itself, as `repro-lib`'s own `seatPage` does it
async function seat(browser, cookie, slug) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const [n, ...rest] = cookie.split('=');
  await ctx.addCookies([{ name: n, value: rest.join('='), url: BASE }]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => { errs.push(e.message); say(`pageerror: ${e.message}`); });
  await page.goto(`${BASE}/d/${slug}`);
  await page.waitForSelector('#charter', { timeout: 20_000 });
  await sleep(1200);
  await page.evaluate(() => fetch(location.pathname.replace('/d/', '/api/d/') + '/view').then((r) => r.json())
    .then((v) => localStorage.setItem('draft:grants:' + location.pathname.split('/')[2] + ':' + (v.me || ''),
      JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge']))));
  await page.reload();
  await page.waitForSelector('#charter', { timeout: 20_000 });
  await sleep(1500);
  return { page, errs };
}

// the member's own entry, as the page holds it — the site's keys and the wording it
// remembers replacing, which is what `misaimed` (the predicate `standDown` refuses the
// Re-make press by) reads back against the served text. `LIVE_HOOKS` is a page const
// and not on `SESSION`, so the refusal is asserted where a member meets it: the press.
const mine = (page) => page.evaluate(() => {
  const d = (window.SESSION.SUGGS || []).find((x) => x.kind === 'draft' && x.mine);
  if (!d) return null;
  return {
    id: d.id, stranded: !!d.stranded,
    sites: d.sites.map((s) => ({ keys: s.keys, text: s.text, origin: s.origin.map((o) => o.text) })),
    keysInColumn: d.sites.flatMap((s) => s.keys).every((k) => window.SESSION.DOC.some((l) => l.key === k)),
    // the column's own wording at that key: the two must be one line space
    column: d.sites.map((s) => s.keys.map((k) => (window.SESSION.DOC.find((l) => l.key === k) || {}).x)),
  };
});

const fails = [];
const check = (name, ok, detail) => { say(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };
const browser = await chromium.launch();

/* ======================================================================== *
 * 1 · origin — a line carried in above a live proposal of your own
 * ======================================================================== */
if (!ONLY || ONLY === 'origin') {
  say('case origin: a member’s live proposal, one line carried in above it');
  const run = 'o' + Date.now().toString(36);
  const { slug, cmd, view, decree, member } = await found(run);
  const v0 = await view(member);
  await cmd('propose-text', { baseVersion: v0.textVersion,
    hunks: withWas(v0.text, [{ start: 2, end: 3, lines: ['Minutes are kept carefully.'] }]), why: 'clearer' }, member);
  say('  proposed: line 2 → “Minutes are kept carefully.”');

  // the page is opened **before** the adoption and stays open through it
  const { page } = await seat(browser, member, slug);
  const before = await mine(page);
  if (!before) die('the member’s own proposal is not in SUGGS on their page');
  say('  before: ' + JSON.stringify(before.sites));
  check('the entry starts on the clause it replaces',
    before.sites[0].keys[0] === 'L2' && before.sites[0].origin[0] === LAST, JSON.stringify(before.sites[0]));

  // the pen turns line 0 into two, so every key below it moves down one
  await decree([{ start: 0, end: 1, lines: ['# Charter', 'Adopted by the club.'] }], '');
  say('  the Founder’s pen turned line 0 into two');
  await sleep(9_000);                          // two turns of the 4s poll

  const after = await mine(page);
  say('  after: ' + JSON.stringify({ sites: after.sites, column: after.column }));
  check('the entry follows its clause', after.sites[0].keys[0] === 'L3', 'key ' + after.sites[0].keys[0]);
  check('every key it carries names a block the column holds', after.keysInColumn === true);
  // **the finding**: the origin is read out of the document the column is replacing
  check('the entry remembers the wording it replaces', after.sites[0].origin[0] === LAST,
    JSON.stringify(after.sites[0].origin));
  check('the entry and the column are one line space',
    after.sites[0].origin[0] === after.column[0][0],
    JSON.stringify({ origin: after.sites[0].origin, column: after.column[0] }));
  await page.context().close();
}

/* ======================================================================== *
 * 2 · remake — the clause itself rewritten: ↻, and the press that saves it
 * ======================================================================== */
if (!ONLY || ONLY === 'remake') {
  say('case remake: the clause under a member’s proposal rewritten, and ✏️ Re-make pressed');
  const run = 'r' + Date.now().toString(36);
  const { slug, cmd, view, decree, member } = await found(run);
  const v0 = await view(member);
  await cmd('propose-text', { baseVersion: v0.textVersion,
    hunks: withWas(v0.text, [{ start: 2, end: 3, lines: ['Minutes are kept carefully.'] }]), why: 'clearer' }, member);
  say('  proposed: line 2 → “Minutes are kept carefully.”');

  const { page } = await seat(browser, member, slug);
  if (!(await mine(page))) die('the member’s own proposal is not in SUGGS on their page');

  // a rival wording carries on the very clause it was made against, **and** a line is
  // carried in above it, so the stranded patch is carried forward to a key the old
  // column never had — which is the shape the reader's page is left holding
  const STANDS = 'Minutes are kept by whoever the meeting asks.';
  await decree([{ start: 0, end: 1, lines: ['# Charter', 'Adopted by the club.'] }], '');
  await decree([{ start: 3, end: 4, lines: [STANDS] }], 'plainer');
  say('  a line carried in above, and the clause itself rewritten');
  await sleep(9_000);

  const after = await mine(page);
  say('  after: ' + JSON.stringify({ stranded: after.stranded, sites: after.sites, column: after.column }));
  check('the proposal is handed back stranded', after.stranded === true);
  // **one alphabet in all three columns** (SURFACE §6): the gutter and the
  // contents rail read `markKindOf`, and the margin index must draw the same ↻
  const marks = await page.evaluate((id) => ({
    rail: [...document.querySelectorAll(`#rail li[data-q="${id}"] .mk`)].map((m) => m.className),
    toc: [...document.querySelectorAll(`#toc .mk`)].map((m) => m.className),
  }), after.id);
  say('  marks: ' + JSON.stringify(marks));
  check('the margin index draws ↻ for a stranded proposal',
    marks.rail.length > 0 && marks.rail.every((c) => /mk-stranded/.test(c)), JSON.stringify(marks));
  check('the entry remembers the clause as it now stands', after.sites[0].origin[0] === STANDS,
    JSON.stringify(after.sites[0].origin));

  // the ↻ card, and the head SURFACE E38 promises
  await page.evaluate((id) => {
    const e = document.querySelector(`#rail li[data-q="${id}"] button`) || document.querySelector(`#charter [data-tab="${id}"]`);
    if (e) e.click();
  }, after.id);
  await sleep(1800);
  const head = await page.evaluate(() => {
    const h = document.querySelector('.sugg .clausehead, .sugg .headclause');
    return h ? h.textContent.replace(/\s+/g, ' ').trim() : null;
  });
  say('  card: ' + JSON.stringify(await page.evaluate(() => ({ openId: window.SESSION.openId,
    q: [...document.querySelectorAll('#rail li[data-q]')].map((e) => e.dataset.q),
    acts: [...document.querySelectorAll('.sugg [data-act]')].map((e) => e.dataset.act) }))));
  check('the head shows the clause as it now stands',
    new RegExp('whoever the meeting asks').test(String(head)), JSON.stringify(head));

  // ✏️ Re-make: the stranded entry becomes the draft, and the commit confirms it
  const sent = [];
  page.on('response', async (r) => {
    if (!r.url().endsWith('/cmd')) return;
    sent.push({ status: r.status(), sent: r.request().postData() || '' });
  });
  const remake = page.locator('.sugg [data-act="draft-remake"]').first();
  if (!(await remake.count())) { check('the card offers ✏️ Re-make', false, 'no [data-act="draft-remake"]'); }
  else {
    await remake.click();
    await sleep(1500);
    const btn = page.locator('#charter [data-proposalrow] [data-act="row-commit"]:not([data-pen])').first();
    const box = await btn.boundingBox().catch(() => null);
    if (!box) check('the proposal row offers a commit', false, 'no row-commit');
    else {
      const held = await page.evaluate(() => window.SESSION.gesture === 'hold');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      if (held) { await page.mouse.down(); await sleep(1600); await page.mouse.up(); }
      else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await sleep(2500);
    }
  }
  const out = sent.filter((c) => /"rebase-text"/.test(c.sent));
  say('  sent: ' + JSON.stringify(sent.map((c) => c.status + ' ' + c.sent.slice(0, 70))));
  check('✏️ Re-make sent rebase-text', out.length === 1 && out[0].status === 200,
    JSON.stringify(sent.map((c) => c.status + ' ' + c.sent.slice(0, 90))));
  if (out.length) {
    const v = await view(member);
    const m = (v.mine || []).find((x) => x.state === 'live');
    check('and the candidate is live again', !!m, JSON.stringify((v.mine || []).map((x) => x.state)));
  }
  await page.context().close();
}

await browser.close();
say(fails.length ? `FAILED: ${fails.join(' · ')}` : 'all cases pass');
process.exit(fails.length ? 1 : 0);
