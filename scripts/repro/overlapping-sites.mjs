#!/usr/bin/env node
/**
 * overlapping-sites — **can a draft hold two places over the same lines?** (Q1492)
 *
 *   node scripts/repro/overlapping-sites.mjs http://127.0.0.1:8261 [--case=run|inside|edit]
 *
 * The nh2026 convention refused two patches outright — `validateHunks: hunks 0 and 1 overlap:
 * [73, 86) and [74, 80)` at 15:49 and `[85, 95) and [86, 95)` at 16:05 — one member rewriting
 * a long section each time, the whole patch and all the work in it lost. SURFACE K14–K16: one
 * site is a run of adjacent blocks, and two sites never share a line — a second site inside the
 * first *is* the first.
 *
 *   run     the way it happens. A selection dragged across an **open editing card**: the column's
 *           editable blocks are the ones the card is not covering, so `selectedBlocks` comes back
 *           with the blocks on either side of it and nothing in between — not a run at all, and
 *           sent as one it spans every line between its ends, the site inside it included.
 *   inside   a keystroke inside a multi-line site, which is the site's own and must make no
 *           second place.
 *   edit     ✏️ *propose edit* on a card whose span the draft already covers.
 *
 * Exit 0 only if every case passes; 1 on any failure, 2 on a broken set-up.
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, sleep, withWas, landOn } from '../lib/walk.mjs';

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8208').replace(/\/$/, '');
const ONLY = (argv.find((a) => a.startsWith('--case=')) || '').slice(7);
const say = (s) => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${s}`);
const die = (m) => { console.error(`overlapping-sites: ${m}`); process.exit(2); };

const health = await (await fetch(`${BASE}/healthz`)).json();
if (health.devMail !== true) die(`${BASE} is not a dev server`);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);

const fails = [];
const check = (name, ok, detail) => {
  say(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails.push(name);
};

const TEXT = [
  '# The long section',
  'Alpha one. The society meets on the first Tuesday of every month, upstairs, at seven.',
  'Bravo two. Every meeting opens with the minutes of the last one, read aloud by the keeper.',
  'Charlie three. A member who misses three meetings in a row shall be written to, kindly.',
  'Delta four. Subscriptions are due in January and are the same for every member, whatever.',
  'Echo five. The treasurer may spend up to fifty pounds without asking anybody at all.',
  'Foxtrot six. Accounts are shown at the annual meeting and may be inspected by a member.',
  'Golf seven. This compact may be amended by the members at any ordinary meeting of theirs.',
];

/** a begun document, a page seat, and a rival wording over lines 2–4 */
async function room(run) {
  const created = await (await post('/api/docs',
    { title: `Overlap ${run}`, email: `founder-${run}@example.org`, isMember: true })).json();
  if (!created.ok || !created.devLink) die(`creation refused: ${JSON.stringify(created)}`);
  const slug = created.slug;
  const founder = (await followLink(created.devLink)).cookie;
  const cmd = async (name, args = {}, cookie = founder) => {
    const r = await post(`/api/d/${slug}/cmd`, { cmd: name, args }, cookie);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) die(`${name} refused (${r.status}): ${JSON.stringify(j)}`);
    return j.result ?? j;
  };
  await cmd('confirm-starting-text', { text: TEXT.join('\n') });
  await cmd('set-convenor-membership', { isMember: true });
  for (const [setting, value] of Object.entries({
    rate: { grant: 8, cap: 8, dripMinutes: 1 }, pace: { shape: 'fixed' },
    quorum: { form: 'count', n: 2 }, authorship: { rung: 'sealedElective' },
    judgments: { rung: 'after' }, applications: { apply: false }, admission: { price: 'pen' },
    removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
    lapse: { afterMs: 5 * 60_000 }, bar: { pct: 50 }, chamber: { rung: 'link' },
    ending: { endsAtMs: Date.now() + 6 * 3_600_000 },
  })) {
    await (await post(`/api/d/${slug}/cmd`, { cmd: 'reclaim', args: { setting } }, founder)).text();
    await cmd('set-setting', { setting, value });
  }
  for (const who of ['member', 'rival']) await cmd('invite', { email: `${who}-${run}@example.org` });
  const tail = await (await fetch(`${BASE}/api/dev/outbox`)).json();
  const linkFor = (who) => {
    const m = (tail.mails ?? []).find((x) => x.to === `${who}-${run}@example.org` && x.link);
    if (!m) die(`no invitation for ${who}`);
    return m.link;
  };
  const v = await (await fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie: founder } })).json();
  const me = (v.view.members || []).find((r) => r.email === `member-${run}@example.org`).id;
  await cmd('begin', { laidDown: [] });
  // a rival's wording over three lines, so ✏️ *propose edit* has a multi-line span
  const rival = (await followLink(linkFor('rival'))).cookie;
  const rv = await (await fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie: rival } })).json();
  await cmd('propose-text', { baseVersion: rv.textVersion, why: 'tidier',
    hunks: withWas(rv.text, [{ start: 2, end: 5,
      lines: ['Bravo two, tidied.', 'Charlie three, tidied.', 'Delta four, tidied.'] }]) }, rival);
  return { slug, me, link: linkFor('member') };
}

async function seat(browser, { slug, me, link }) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1400 } });
  await context.addInitScript(([s, m]) => {
    try {
      localStorage.setItem('draft:grants:' + s + ':' + m,
        JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge']));
    } catch { /* private mode */ }
  }, [slug, me]);
  const page = await context.newPage();
  page.on('pageerror', (e) => say(`  pageerror: ${e.message}`));
  await landOn(page, link);
  await page.waitForSelector('#charter', { timeout: 20_000, state: 'attached' });
  await sleep(2000);
  // past the resting 📝 tab, then in by the door
  await page.evaluate(() => {
    const c = document.querySelector('#ridetab .achip[data-tab="text"]');
    if (c) { c.scrollIntoView({ block: 'start' }); window.scrollBy(0, -200); }
  });
  await sleep(300);
  const door = page.locator('#editdoor [data-act="edit-door"]');
  if (await door.count()) { await door.click(); await sleep(800); }
  return { page, context };
}

/** the draft's places, as hunks: `[start, end)` per site, the way `hunksOf` reads them */
const places = (page) => page.evaluate(() => {
  const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
  if (!d) return null;
  const n = (k) => Number(String(k).slice(1));
  return { refusal: d.refusal || null,
    sites: d.sites.map((s) => ({ keys: s.keys, gap: /^G\d+$/.test(s.keys[0]),
      span: [n(s.keys[0]), n(s.keys[s.keys.length - 1]) + 1] })) };
});

/** two places over one line, and a "run" whose blocks are not neighbours */
function faults(model) {
  const bad = [];
  const spans = (model.sites || []).filter((s) => !s.gap).map((s) => s.span)
    .sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < spans.length; i++) {
    if (spans[i][0] < spans[i - 1][1]) bad.push(`[${spans[i - 1]}) and [${spans[i]}) overlap`);
  }
  for (const s of model.sites || []) {
    if (s.gap) continue;
    const ns = s.keys.map((k) => Number(String(k).slice(1)));
    if (ns.some((n, i) => i > 0 && n !== ns[i - 1] + 1)) bad.push(`${JSON.stringify(s.keys)} is not a run`);
  }
  return bad;
}

async function selectAndType(page, k1, k2, words) {
  const got = await page.evaluate(([a, b]) => {
    const x = document.querySelector('#charter [data-key="' + a + '"]');
    const y = document.querySelector('#charter [data-key="' + b + '"]');
    if (!x || !y) return false;
    const r = document.createRange();
    r.setStart(x.firstChild || x, 0);
    const last = y.lastChild || y;
    r.setEnd(last, last.nodeType === 3 ? last.textContent.length : last.childNodes.length);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    return true;
  }, [k1, k2]);
  if (!got) return false;
  await page.keyboard.type(words, { delay: 25 });
  await sleep(900);
  return true;
}

/** the row's ✏️, and every /cmd that leaves under it */
async function pressPropose(page) {
  const sent = [];
  const onResp = async (r) => {
    if (!r.url().endsWith('/cmd')) return;
    sent.push({ status: r.status(), sent: r.request().postData() || '',
      body: (await r.text().catch(() => '')).slice(0, 220) });
  };
  page.on('response', onResp);
  let btn = page.locator('#charter [data-proposalrow] [data-act="row-commit"]:not([data-pen])').first();
  if (!(await btn.count())) btn = page.locator('[data-act="draft-propose"]:not([data-pen])').first();
  await btn.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
  const box = await btn.boundingBox({ timeout: 4000 }).catch(() => null);
  if (!box) { page.off('response', onResp); return { sent, pressed: false }; }
  const held = await page.evaluate(() => window.SESSION.gesture === 'hold');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  if (held) { await page.mouse.down(); await sleep(1600); await page.mouse.up(); }
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(2500);
  page.off('response', onResp);
  return { sent, pressed: true };
}

const browser = await chromium.launch();

/* ================================================================== *
 * 1 · run — a selection dragged across an open editing card
 * ================================================================== */
if (!ONLY || ONLY === 'run') {
  say('case run: a second selection dragged across the card the first one opened');
  const r = await room('r' + Date.now().toString(36));
  const { page, context } = await seat(browser, r);
  if (!(await selectAndType(page, 'L4', 'L6', 'The middle, rewritten.'))) die('no L4–L6 to select');
  const one = await places(page);
  say('  the first place: ' + JSON.stringify(one && one.sites.map((s) => s.keys)));
  // a check that never ran is not a pass: the first place has to be there for
  // the second one to be about anything
  check('a selection across neighbouring paragraphs is one place',
    !!one && one.sites.length === 1 && !faults(one).length, JSON.stringify(one && one.sites));
  if (!one) die('no draft after the first selection');

  // the card now stands over L4–L6; this selection runs from above it to below
  const crossed = await selectAndType(page, 'L3', 'L7', 'The lot, rewritten.');
  const two = await places(page);
  say('  after the crossing selection: ' + JSON.stringify(two.sites.map((s) => s.span)) +
    ' · the card says ' + JSON.stringify(two.refusal));
  check('a selection that crosses an open card makes no second place',
    crossed && faults(two).length === 0, faults(two).join(' · '));
  check('…and the member is told why', !!two.refusal, JSON.stringify(two.refusal));
  check('…and the words already written are kept', two.sites.length >= 1,
    JSON.stringify(two.sites.map((s) => s.keys)));

  const { sent, pressed } = await pressPropose(page);
  const out = sent.filter((c) => /"propose-text"/.test(c.sent));
  say('  pressed: ' + pressed + ' · ' + JSON.stringify(sent.map((c) => c.status + ' ' + c.body.slice(0, 100))));
  check('the patch is taken', pressed && out.length === 1 && out[0].status === 200,
    out.map((o) => o.status + ' ' + o.body).join(' · '));
  await context.close();
}

/* ================================================================== *
 * 2 · inside — a keystroke inside a multi-line place is that place's
 * ================================================================== */
if (!ONLY || ONLY === 'inside') {
  say('case inside: a keystroke inside a place the draft already holds');
  const r = await room('i' + Date.now().toString(36));
  const { page, context } = await seat(browser, r);
  if (!(await selectAndType(page, 'L4', 'L6', 'The middle, rewritten.'))) die('no L4–L6 to select');
  // Enter inside the lane, and a character in a block the site covers
  const lane = page.locator('.sugg [data-lane]').first();
  if (await lane.count()) {
    await lane.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('And a line more.', { delay: 25 });
    await sleep(900);
  }
  const m = await places(page);
  say('  places: ' + JSON.stringify(m && m.sites.map((s) => s.span)));
  check('Enter inside a multi-line place makes no second place',
    !!m && m.sites.length === 1 && !faults(m).length,
    m ? JSON.stringify(m.sites.map((s) => s.keys)) : 'no draft in the model');
  await context.close();
}

/* ================================================================== *
 * 3 · edit — ✏️ propose edit on a card the draft already covers
 * ================================================================== */
if (!ONLY || ONLY === 'edit') {
  say('case edit: ✏️ propose edit on a card whose span the draft already covers');
  const r = await room('e' + Date.now().toString(36));
  const { page, context } = await seat(browser, r);
  // the rival's wording covers L2–L4; the draft takes L3–L5 first
  if (!(await selectAndType(page, 'L3', 'L5', 'Three to five, rewritten.'))) die('no L3–L5 to select');
  const one = await places(page);
  say('  the first place: ' + JSON.stringify(one.sites.map((s) => s.keys)));
  const clause = page.locator('#charter [data-key]').filter({ hasText: 'Bravo two' }).first();
  if (await clause.count()) {
    await clause.evaluate((el) => {
      const col = el.closest('.cpara, .anch') || el.parentElement;
      const c = col && col.querySelector('.achip');
      if (c) c.click();
    });
    await sleep(1200);
    const edit = page.locator('[data-propose-from]').first();
    if (await edit.count()) { await edit.click(); await sleep(1200); }
    else say('  (no ✏️ propose edit offered on that card)');
  }
  const m = await places(page);
  say('  places: ' + JSON.stringify(m && m.sites.map((s) => s.span)));
  check('✏️ propose edit makes no place over a line the draft already holds',
    !!m && !faults(m).length, m ? faults(m).join(' · ') : 'no draft in the model');
  await context.close();
}

await browser.close();
say(fails.length ? `FAILED: ${fails.join(' · ')}` : 'all cases pass');
process.exit(fails.length ? 1 : 0);
