#!/usr/bin/env node
/**
 * poll-race — **the two refusals the page answers itself** (Q1493 (a); Ed,
 * 2026-09-21: *The page handles both*).
 *
 *   node scripts/repro/poll-race.mjs http://127.0.0.1:8261 [--case=judge|propose]
 *
 * Sixteen of the nh2026 convention's forty refusals were a race with the 4 s
 * poll. A member pressed ✓ on a pair that had closed since their card was
 * drawn; a member pressed ✏️ in the second after somebody else's adoption and
 * had their own words refused as *targets version 40; current is 41*, with
 * nothing of theirs moved. Q1330's rule is that a member is not expected to
 * meet a refusal at all, so both are the page's to answer.
 *
 *   judge      the author withdraws their candidate while the reader's card
 *              still stands. The reader presses ✓ before their next poll.
 *              **Green**: the judgment is refused on the wire, nothing is
 *              printed, the card files as closed by the command's own refresh,
 *              and `/healthz` counts one `judged-closed` with no line in the
 *              error log.
 *
 *   propose    the Founder decrees a change to a clause the reader is not
 *              writing on, moving the version under a draft whose own wording
 *              still stands. The reader presses ✏️ before their next poll.
 *              **Green**: the first `propose-text` is refused for the version
 *              alone, the page re-sends once by itself, the second lands, the
 *              proposal stands in the member's own rail, nothing is printed,
 *              and `/healthz` counts one `stale-version` with no line in the
 *              error log.
 *
 * Both cases are red on the pre-fix page: the refusal is printed under the
 * stagehand's line, the proposal never lands, and the error log carries it.
 *
 * Exit 0 only if every case passes; 1 on any failure, 2 on a broken set-up.
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, sleep, withWas } from '../lib/walk.mjs';

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8208').replace(/\/$/, '');
const ONLY = (argv.find((a) => a.startsWith('--case=')) || '').slice(7);
const say = (s) => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${s}`);
const die = (m) => { console.error(`poll-race: ${m}`); process.exit(2); };

const health = await (await fetch(`${BASE}/healthz`)).json();
if (health.devMail !== true) die(`${BASE} is not a dev server`);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);

const fails = [];
const check = (name, ok, detail) => {
  say(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails.push(name);
};

/** the counters and the log, as an operator reads them */
const racesNow = async () => ((await (await fetch(`${BASE}/healthz`)).json()).races) || null;
const errorLines = async () => {
  const r = await fetch(`${BASE}/api/dev/errors`);
  if (!r.ok) return [];
  const j = await r.json().catch(() => ({}));
  return j.errors || [];
};

const TEXT = [
  '# The Hollow Oak Club',
  'The club meets on the first Sunday of every month.',
  'Guests are welcome at every meeting.',
  'The larder is stocked by whoever opens the room.',
  'Decisions bind the two members and nobody else.',
  'The key hangs on the hook by the door.',
].join('\n');

/* a document with two members beside the founder, begun, the pen kept */
const SETTINGS = {
  rate: { grant: 8, cap: 8, dripMinutes: 1 }, pace: { shape: 'fixed' },
  quorum: { form: 'count', n: 2 }, authorship: { rung: 'sealedElective' },
  judgments: { rung: 'after' }, applications: { apply: false }, admission: { price: 'pen' },
  removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
  lapse: { afterMs: 30 * 60_000 }, bar: { pct: 50 }, chamber: { rung: 'link' },
};

async function found(run, seats) {
  const created = await (await post('/api/docs',
    { title: `Poll Race ${run}`, email: `founder-${run}@example.org`, isMember: true })).json();
  if (!created.ok || !created.devLink) die(`creation refused: ${JSON.stringify(created)}`);
  const slug = created.slug;
  const founder = (await followLink(created.devLink)).cookie;
  const cmd = async (name, args = {}, cookie = founder) => {
    const r = await post(`/api/d/${slug}/cmd`, { cmd: name, args }, cookie);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) die(`${name} refused (${r.status}): ${JSON.stringify(j)}`);
    return j.result ?? j;
  };
  await cmd('confirm-starting-text', { text: TEXT });
  await cmd('set-convenor-membership', { isMember: true });
  for (const [setting, value] of Object.entries({
    ...SETTINGS, ending: { endsAtMs: Date.now() + 6 * 3_600_000 },
  })) {
    await (await post(`/api/d/${slug}/cmd`, { cmd: 'reclaim', args: { setting } }, founder)).text();
    await cmd('set-setting', { setting, value });
  }
  const links = {}, emails = {};
  for (const who of seats) {
    const email = `${who}-${run}@example.org`;
    await cmd('invite', { email });
    const tail = await (await fetch(`${BASE}/api/dev/outbox`)).json();
    const mail = (tail.mails ?? []).find((m) => m.to === email && m.link);
    if (!mail) die(`no invitation for ${who} in the dev outbox`);
    links[who] = mail.link; emails[who] = email;
  }
  await cmd('begin', { laidDown: [] });
  const view = async (cookie = founder) =>
    (await (await fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie } })).json());
  const decree = async (hunks, why) => {
    const v = await view();
    return cmd('pen-text', { baseVersion: v.textVersion ?? 0, hunks: withWas(v.text, hunks), why });
  };
  return { slug, cmd, view, decree, links, emails, founder };
}

/** a seat with a page, its grants already acknowledged so nothing reloads */
async function seat(browser, link, slug) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page0 = await context.newPage();
  await page0.goto(link);
  await page0.waitForURL(new RegExp(`/d/${slug}`), { timeout: 20_000 });
  const me = await page0.evaluate(() => fetch(location.pathname.replace('/d/', '/api/d/') + '/view')
    .then((r) => r.json()).then((v) => v.me || (v.view && v.view.me) || null).catch(() => null));
  await page0.evaluate(([s, m]) => {
    try {
      localStorage.setItem('draft:grants:' + s + ':' + m,
        JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge']));
    } catch { /* private mode */ }
  }, [slug, me]);
  await page0.reload();
  await page0.waitForSelector('#charter', { timeout: 20_000, state: 'attached' });
  await sleep(1800);
  const cookie = (await context.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
  const errs = [];
  page0.on('pageerror', (e) => { errs.push(e.message); say(`  pageerror: ${e.message}`); });
  return { page: page0, cookie, me, errs, context };
}

/** every /cmd that leaves the page while `fn` runs, with what came back */
async function onWire(page, fn) {
  const sent = [];
  const onResp = async (r) => {
    if (!r.url().endsWith('/cmd')) return;
    sent.push({ status: r.status(), body: r.request().postData() || '',
      answer: (await r.text().catch(() => '')).slice(0, 200) });
  };
  page.on('response', onResp);
  try { await fn(); } finally { await sleep(3000); page.off('response', onResp); }
  return sent;
}
const cmdsOf = (sent, name) => sent.filter((c) => c.body.includes(`"${name}"`));
/** the stagehand's line: the whole of what a member is shown about a refusal */
const errLine = (page) => page.evaluate(() => {
  const el = document.getElementById('errline');
  return el ? (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200) : null;
});

const browser = await chromium.launch();
const run = Math.random().toString(36).slice(2, 8);

/* ------------------------------------------------------------------ *
 * judge — a pair that closed between the card and the ✓
 * ------------------------------------------------------------------ */
if (!ONLY || ONLY === 'judge') {
  say('— judge: the pair closed under the press —');
  const doc = await found(`j${run}`, ['al', 'bee']);
  const al = await seat(browser, doc.links.al, doc.slug);
  const bee = await seat(browser, doc.links.bee, doc.slug);
  const before = await racesNow();
  const logWas = (await errorLines()).length;

  // al proposes; bee's page polls it in and is dealt the pair
  const v = await doc.view(al.cookie);
  const lines = String(v.text || '').split('\n');
  const put = await (await post(`/api/d/${doc.slug}/cmd`, { cmd: 'propose-text', args: {
    baseVersion: v.textVersion, why: 'the key belongs indoors',
    hunks: [{ start: 5, end: 6, lines: ['The key lives in the drawer of the long table.'], was: [lines[5]] }],
  } }, al.cookie)).json();
  const cand = put && put.result && put.result.id;
  check('al’s proposal is in', !!cand, JSON.stringify(put).slice(0, 160));
  await sleep(5600);                       // bee polls it in
  const dealt = await bee.page.evaluate(() => (window.SESSION.SUGGS || [])
    .filter((x) => !x.mine && x.card).map((x) => x.id));
  check('bee is dealt the pair', dealt.length > 0, JSON.stringify(dealt));

  // …and al withdraws it in the gap before bee's next poll
  if (cand) await post(`/api/d/${doc.slug}/cmd`, { cmd: 'withdraw-text', args: { candidate: cand } }, al.cookie);

  const sent = await onWire(bee.page, async () => {
    await bee.page.evaluate((id) => {
      const S = window.SESSION;
      S.toggle(id, false);
      const q = String(id).replace(/["\\]/g, '\\$&');
      const card = document.querySelector('.sugg[data-card="' + q + '"]');
      const pick = card && card.querySelector('.lanepick');
      if (pick) pick.click();
      const ok = card && card.querySelector('[data-act="judge"], .btn-approve');
      if (ok && !ok.disabled) ok.click();
    }, dealt[0]);
  });
  const judged = cmdsOf(sent, 'judge-race');
  const shown = await errLine(bee.page);
  const open = await bee.page.evaluate(() => window.SESSION.openId);
  const after = await racesNow();
  const logNow = (await errorLines()).length;
  check('the ✓ went out and was refused', judged.length === 1 && judged[0].status >= 400,
    JSON.stringify(judged.map((c) => c.status + ' ' + c.answer)).slice(0, 220));
  check('nothing is printed', shown === null, shown || '');
  check('the card is filed by the refresh', open === null, String(open));
  check('one judged-closed is counted', !!after && after['judged-closed'] === (before['judged-closed'] || 0) + 1,
    JSON.stringify(after));
  check('and no line in the error log', logNow === logWas, `${logWas} → ${logNow}`);
  check('no page errors', bee.errs.length === 0 && al.errs.length === 0, bee.errs.concat(al.errs).join(' | '));
  await al.context.close(); await bee.context.close();
}

/* ------------------------------------------------------------------ *
 * propose — the version moved in the second before the press
 * ------------------------------------------------------------------ */
if (!ONLY || ONLY === 'propose') {
  say('— propose: the version moved under the press —');
  const doc = await found(`p${run}`, ['al', 'bee']);
  const bee = await seat(browser, doc.links.bee, doc.slug);
  const before = await racesNow();
  const logWas = (await errorLines()).length;

  // bee writes on the last clause
  await bee.page.evaluate(() => {
    const c = document.querySelector('#ridetab .achip[data-tab="text"]');
    if (c) { c.scrollIntoView({ block: 'start' }); window.scrollBy(0, -200); }
  });
  await sleep(300);
  const door = bee.page.locator('#editdoor [data-act="edit-door"]');
  if (await door.count()) { await door.click(); await sleep(700); }
  const clause = bee.page.locator('#charter [data-key]').filter({ hasText: 'The key hangs' }).first();
  if (!(await clause.count())) die('no clause to write on');
  await clause.click();
  await clause.evaluate((el) => {
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  });
  await bee.page.keyboard.type(' It is never taken home.', { delay: 20 });
  await sleep(900);
  const draft = await bee.page.evaluate(() => {
    const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
    return d ? { sites: d.sites.length, keys: d.sites.map((s) => s.keys.join('+')) } : null;
  });
  check('bee holds a draft', !!draft && draft.sites === 1, JSON.stringify(draft));

  // …and the Founder decrees a change to a clause bee is not writing on, so
  // the version moves and bee's own wording is untouched
  await doc.decree([{ start: 2, end: 3, lines: ['Guests are welcome, and are asked to sign the book.'] }],
    'the book');
  const held = await bee.page.evaluate(() => window.SESSION && window.SESSION.DOC ? 1 : 0);
  check('bee’s page has not polled it in yet', held === 1);

  const sent = await onWire(bee.page, async () => {
    let btn = bee.page.locator('#charter [data-proposalrow] [data-act="row-commit"]:not([data-pen])').first();
    if (!(await btn.count())) btn = bee.page.locator('[data-act="draft-propose"]:not([data-pen])').first();
    await btn.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
    const box = await btn.boundingBox({ timeout: 4000 }).catch(() => null);
    if (!box) return;
    const hold = await bee.page.evaluate(() => window.SESSION.gesture === 'hold');
    await bee.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    if (hold) { await bee.page.mouse.down(); await sleep(1600); await bee.page.mouse.up(); }
    else await bee.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(3500);
  });
  const puts = cmdsOf(sent, 'propose-text');
  const shown = await errLine(bee.page);
  const mine = await bee.page.evaluate(() => (window.SESSION.SUGGS || [])
    .filter((x) => x.mine && x.unproposed !== true).map((x) => x.id));
  const after = await racesNow();
  const logNow = (await errorLines()).length;
  check('the press sent twice, the second one landing',
    puts.length === 2 && puts[0].status >= 400 && puts[1].status === 200,
    JSON.stringify(puts.map((c) => c.status + ' ' + c.answer.slice(0, 90))).slice(0, 300));
  check('the first was refused for the version alone',
    puts.length > 0 && /targets version \d+; current is \d+/.test(puts[0].answer),
    (puts[0] || {}).answer);
  check('nothing is printed', shown === null, shown || '');
  check('the proposal stands in bee’s own rail', mine.length === 1, JSON.stringify(mine));
  check('one stale-version is counted', !!after && after['stale-version'] === (before['stale-version'] || 0) + 1,
    JSON.stringify(after));
  check('and no line in the error log', logNow === logWas, `${logWas} → ${logNow}`);
  check('no page errors', bee.errs.length === 0, bee.errs.join(' | '));
  await bee.context.close();
}

await browser.close();
if (fails.length) { say(`FAILED (${fails.length}): ${fails.join(' · ')}`); process.exit(1); }
say('poll-race: both races are answered by the page');
