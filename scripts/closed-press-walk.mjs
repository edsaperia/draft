#!/usr/bin/env node
/**
 * closed-press-walk — **the host refuses nothing a closed page offers**
 * (Q1541 stage 7, BUILD.md §4's acceptance; 1541.7 (a), 1541.30).
 *
 *   PORT=8341 DRAFT_BASE_URL=http://127.0.0.1:8341 DRAFT_DATA_DIR=<fresh> npm run server
 *   node scripts/closed-press-walk.mjs http://127.0.0.1:8341 [--seed=7272]
 *
 * The ladder closes a document. Then, for the Founder, a member who has not
 * signed and a stranger — each in a fresh browser — every tab in the gutter,
 * every tab in the Rules and every rail entry is opened, and **every enabled
 * control on the card it opens is pressed**, 🥂's signature last. A closed
 * page is meant to offer nothing but 🥂, so almost nothing should be pressed;
 * what the walk guards is the other half of that promise — whatever the page
 * *does* offer, the host accepts: no refused `/api/` call, no page error, and
 * no row written to the error log while the walk ran.
 *
 * And the signature answers every OK owed (the host's fold, `close-owed.test`
 * in @draft/constitution; the page's `SESSION.setSigned`): after it, the
 * member's rail holds no sealed record still owed.
 *
 * Joins the sprint tier from its first day (`scripts/ci-walks.sh`, Q1547).
 * Exit 0 when every check passes, 1 on a defect, 2 on a set-up that never got there.
 */
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';
import { say, arg, landOn, browserFor } from './lib/walk.mjs';

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
const viewAs = (slug, cookie) => fetch(`${BASE}/api/d/${slug}/view`, { headers: cookie ? { cookie } : {} })
  .then((r) => r.json()).catch(() => null);
const errorRows = () => fetch(BASE + '/api/dev/errors').then((r) => r.json()).then((d) => d.errors || []).catch(() => null);

await assertServerBuild(BASE, 'closed-press-walk');

const ladder = await post('/api/dev/ladder', { to: 'closed', seed: SEED });
if (ladder.json.phase !== 'closed' || !ladder.json.slug) {
  bail(`the ladder did not close a document: ${JSON.stringify(ladder.json).slice(0, 300)}`);
}
const slug = ladder.json.slug;
const seats = ladder.json.seats ?? [];
const founder = seats.find((s) => s.founder);
const members = seats.filter((s) => !s.founder).map((s) => s.id);
if (!founder || members.length < 1) bail(`the ladder seated nobody: ${JSON.stringify(seats).slice(0, 300)}`);
const first = await post('/api/dev/seat', { slug, member: members[0] });
const probe = await viewAs(slug, first.cookie);
const signed = new Set(((probe && probe.record && probe.record.signatures) || []).map((s) => s.member));
const unsigned = members.find((m) => !signed.has(m));
if (!unsigned) bail('every member signed already, so no seat is left to sign from');

// the error log's rows before the walk, so only what the walk caused is read
const before = await errorRows();
if (before === null) bail('the error log could not be read (/api/dev/errors)');
const seen = new Set(before.map((r) => JSON.stringify(r)));
say(`document /d/${slug} · seed ${SEED} · Founder ${founder.id} · unsigned member ${unsigned}`);

const browser = await browserFor().launch();

/** Every way into a card on this page, then every enabled control on each. */
async function pressEverything(who, cookie, { sign }) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  if (cookie) {
    const [cname, cval] = cookie.split(/=(.*)/s);
    await ctx.addCookies([{ name: cname, value: cval, url: BASE }]);
  }
  const page = await ctx.newPage();
  const errors = [];
  const refused = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('response', (r) => {
    if (r.url().includes('/api/') && r.status() >= 400) {
      refused.push(r.status() + ' ' + r.request().method() + ' ' + new URL(r.url()).pathname + ' ' +
        String(r.request().postData() || '').slice(0, 120));
    }
  });
  await landOn(page, `${BASE}/d/${slug}`);
  await page.waitForTimeout(3500);
  // the Rules unfolded, so its tabs can be reached
  for (let i = 0; i < 8; i++) {
    const n = await page.evaluate(() => {
      const t = [...document.querySelectorAll('#band .sectoggle')].find((b) => b.getAttribute('aria-expanded') === 'false');
      if (!t) return 0; t.click(); return 1;
    });
    if (!n) break;
    await page.waitForTimeout(250);
  }
  const ways = await page.evaluate(() => [...new Set([
    ...[...document.querySelectorAll('#band .chipcol [data-tab]')].map((e) => 'tab:' + e.dataset.tab),
    ...[...document.querySelectorAll('#doc .chipcol [data-anchor]')].map((e) => 'anchor:' + e.dataset.anchor),
    ...[...document.querySelectorAll('#rail li[data-q]')].map((e) => 'rail:' + e.dataset.q),
  ])]);
  let pressed = 0;
  const pressedWhat = [];
  for (const way of ways) {
    const [kind, key] = way.split(/:(.*)/s);
    await page.evaluate(({ kind, key }) => {
      const q = String(key).replace(/["\\]/g, '\\$&');
      const el = kind === 'tab' ? document.querySelector('#band .chipcol [data-tab="' + q + '"]')
        : kind === 'anchor' ? document.querySelector('#doc .chipcol [data-anchor="' + q + '"]')
        : document.querySelector('#rail li[data-q="' + q + '"] button');
      if (el) { el.scrollIntoView({ block: 'center' }); el.click(); }
    }, { kind, key });
    await page.waitForTimeout(700);
    // every enabled control on the open card, but its tabs and 🥂's signature
    const n = await page.evaluate(async () => {
      const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      const card = document.querySelector('.setupcard, .sugg.gshell, .sugg[data-card]');
      if (!card) return [];
      const ctl = [...card.querySelectorAll('button, [role="button"], input[type="checkbox"], input[type="radio"]')]
        .filter((e) => vis(e) && !e.disabled && !e.closest('.chipcol') && !e.matches('[data-sign]'));
      const out = [];
      for (const e of ctl) {
        out.push((e.title || e.textContent || e.className).replace(/\s+/g, ' ').trim().slice(0, 40));
        e.click();
        await new Promise((r) => setTimeout(r, 250));
      }
      return out;
    });
    pressed += n.length;
    pressedWhat.push(...n.map((x) => key + ' → ' + x));
    // close whatever stands open, by its own tab, as a reader does
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  let signedNow = null;
  // what the rail still owes this seat: an unread record's mark (✔ ✖, or a
  // clause's ✔✔✔), and 🥂 while unsigned — a filed record stands in the rail
  // too, drained, and is owed nothing
  const owedInRail = (pg) => pg.evaluate(() => [...document.querySelectorAll('#rail li')]
    .filter((li) => li.querySelector('.mk-adopted, .mk-retired, .mk-fold') || li.dataset.q === 'closing')
    .map((li) => li.dataset.q || '?'));
  const owedBefore = await owedInRail(page);
  if (sign) {
    await page.evaluate(() => {
      if (!document.querySelector('.setupcard[data-setupcard="closing"]')) {
        document.querySelector('#rail li[data-q="closing"] button, #band [data-tab="closing"]')?.click();
      }
    });
    await page.waitForTimeout(900);
    const hit = await page.evaluate(() => {
      const ok = document.querySelector('.setupcard[data-setupcard="closing"] [data-sign]');
      if (!ok || ok.disabled) return false;
      ok.scrollIntoView({ block: 'center' }); ok.click(); return true;
    });
    await page.waitForTimeout(3000);
    const after = await viewAs(slug, cookie);
    signedNow = hit && ((after && after.record && after.record.signatures) || []).some((s) => s.member === unsigned);
    // **the signature answers every OK owed**: nothing sealed still owed in
    // the rail, and 🥂 itself gone from it
    const owedNow = await owedInRail(page);
    check(who + ': the signature lands', !!signedNow);
    check(who + ': something was owed before it', owedBefore.length > 0, owedBefore.length + ' owed');
    check(who + ': and nothing is owed after it — no ✔ ✖ ✔✔✔ unread, no 🥂', owedNow.length === 0,
      JSON.stringify(owedNow.slice(0, 8)));
  }
  say(`   ${who}: ${ways.length} ways in, ${pressed} controls pressed${pressedWhat.length ? ' — ' + pressedWhat.slice(0, 6).join(' | ') : ''}`);
  check(who + ': the host refused nothing', refused.length === 0, refused.slice(0, 3).join(' | '));
  check(who + ': the page threw nothing', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

const fcookie = (await post('/api/dev/seat', { slug, member: founder.id })).cookie;
await pressEverything('the Founder', fcookie, { sign: false });
const mcookie = (await post('/api/dev/seat', { slug, member: unsigned })).cookie;
await pressEverything('a member who has not signed (' + unsigned + ')', mcookie, { sign: true });
await pressEverything('a stranger', null, { sign: false });

const after = await errorRows();
const fresh = (after || []).filter((r) => !seen.has(JSON.stringify(r)) && (!r.slug || r.slug === slug));
check('the error log holds nothing the walk caused', after !== null && fresh.length === 0,
  JSON.stringify(fresh.slice(0, 3)).slice(0, 400));

await browser.close();
say(fails.length ? `\n✗ ${fails.length} failed: ${fails.join('; ')}` : '\n✓ a closed page offers only what the host accepts');
process.exit(fails.length ? 1 : 0);
