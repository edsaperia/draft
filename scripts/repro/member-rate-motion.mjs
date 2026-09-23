#!/usr/bin/env node
/**
 * member-rate-motion — **can a member propose a change to ⏱️, the proposal rate?** (Q1486, Ed from
 * the room of 2026-09-20 at 5929a6e: *a member was unable to propose to change the proposal rate*.)
 *
 *   PORT=8403 DRAFT_BASE_URL=http://127.0.0.1:8403 DRAFT_DATA_DIR=<fresh> npm run server
 *   node scripts/repro/member-rate-motion.mjs http://127.0.0.1:8403 [--shots=<dir>] [--only=<scenario>] [--lanes=1]
 *
 * **What it drives.** It founds a document shaped like `docs.vote/d/nh2026`: a clerk Founder (not a
 * member), four invited members who arrive, every setting Founder-set with nothing delegated, ⏱️ at
 * 3 · 3 · every 10 minutes, and 🍾 pressed **keeping both powers on ⏱️** (and on ⏰ 👥 💤 🥾 🪪 🤝;
 * 🛡️ alone on 🪶 📍 🌍; both laid down on 👤 👁️ and the Text). Then, as a **member in a real page**
 * with real keys and a real pointer — never `el.value =` and never `el.click()`, which is how every
 * other walk drives a composer and why none of them could see this — it opens ⏱️ and tries to move it:
 *
 *   wide-type-press     type a new interval, then press ✏️ straight away (no click elsewhere): how many presses?
 *   grant-cap           is there any control for the grant or the cap at all?
 *   unacked             a member who has not pressed OK on 💡 ⚖️ 🏛️ (the OKs are per browser)
 *   same-as-stands      type the value that already stands and press
 *   wide-hour · wide-120 · wide-one   type 60 · 120 · 1, click away: what number does the field show back?
 *   narrow              390 × 844 with touch: the same type-and-press
 *   narrow-ways         on a phone, which taps wake the ✏️ once a number is typed
 *   others-under-poll   🪶 and 👥's composers: a value typed and not yet left, and the room moves (the 4s poll renders)
 *   one-under-poll      the same on ⏱️ with the likeliest number in a starved room, 1
 *   bad-numbers         0 · 2.5 · 5000
 *   typing-under-poll   a number typed and not yet left; another member acts, then the Founder decrees ⏱️
 *   decree-under        the Founder ✒️-decrees a new rate while the member's card is open and composed, then decrees
 *                       the very value the member composed
 *   empty-wallet        three ✏️ spent first, then the same press
 *
 * `--browser=chromium|webkit|firefox` (scripts/lib/walk.mjs's `browserFor`): **the under-poll scenarios and `narrow`
 * differ by engine** — Blink fires `change` when a render removes the focused field and a tap on a disabled button
 * blurs it; WebKit and Gecko do neither, so there the typed number is simply gone.
 *
 * **What it records.** Every `POST /api/d/:slug/cmd` the page makes with the server's answer (a
 * refused command is a finding), the open card's visible text, the field's value, and the commit
 * button's state at each step. **What it asserts** is one sentence per scenario: after the member's
 * gesture, a motion on `rate` by that member is running in the module (`view().motions`), or the
 * page says in words why not. Exit 0 only if every scenario ends one of those two ways.
 *
 * Needs a dev server (the dev outbox carries the magic links). Changes nothing in the tree.
 */
import { devices } from 'playwright';
import { browserFor, landOn } from '../lib/walk.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { AsyncLocalStorage } from 'node:async_hooks';

const BASE = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2]
  : process.env.DRAFT_BASE_URL || 'http://127.0.0.1:8403').replace(/\/$/, '');
const argOf = (n, d = null) => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const SHOTS = argOf('shots');
const ONLY = argOf('only');
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const clock = () => new Date().toTimeString().slice(0, 8);
/**
 * **Lanes** (plan-ci-speed.md Stage 5). The scenarios ran one after another
 * on one document, 320 s on CI's runner, most of it fixed waits: the three
 * welcomes a fresh page OKs, and the two polls each under-poll scenario sits
 * through. They now run in `LANES`, each lane its own document founded the
 * same way and its scenarios in the same relative order, the lanes side by
 * side. `lane` carries the lane's document and the scenario's own log, so a
 * scenario's lines are held and printed, whole, in the order below — the
 * verdict lines read in the order they always did.
 */
const lane = new AsyncLocalStorage();
const doc = () => lane.getStore().doc;
const say = (s) => { const line = `[${clock()}] ${s}`; const st = lane.getStore();
  if (st && st.out) st.out.push(line); else console.log(line); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const verdict = (name, ok, detail) => { say((ok ? 'OK   · ' : 'FAIL · ') + name + ' · ' + detail);
  if (!ok) { const st = lane.getStore(); (st && st.findings ? st.findings : FINDINGS_LOOSE).push(name + ' · ' + detail); } };
const FINDINGS_LOOSE = [];

const post = async (path, body, cookie) => {
  const r = await fetch(BASE + path, { method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
const followLink = async (link) => {
  const u = new URL(link);
  await fetch(u.origin + u.pathname + u.search);
  const r = await fetch(u.origin + u.pathname, { method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
    body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(), redirect: 'manual' });
  return { status: r.status, cookie: (r.headers.get('set-cookie') ?? '').split(';')[0], location: r.headers.get('location') ?? '' };
};
const outbox = async () => { const ob = await (await fetch(BASE + '/api/dev/outbox')).json(); return ob.mails || ob; };
const linkIn = (mail) => (JSON.stringify(mail).match(/http:[A-Za-z0-9_?=/:.-]+/) || [])[0];
const linkFor = async (to, used) => {
  for (let i = 0; i < 20; i++) {
    const m = (await outbox()).find((x) => x.to === to && linkIn(x) && !used.has(linkIn(x)));
    if (m) { used.add(linkIn(m)); return linkIn(m); }
    await sleep(500);
  }
  throw new Error('no mail for ' + to);
};

const health = await fetch(BASE + '/healthz').then((r) => r.json()).catch(() => null);
if (!health || health.devMail !== true) { say('SET-UP · not a dev server: ' + BASE); process.exit(2); }

/* ---- found a document shaped like nh2026 ---------------------------------- */
const STAMP = Date.now().toString(36);
const used = new Set();
const cmdAs = async (cookie, name, args = {}) => post(`/api/d/${doc().slug}/cmd`, { cmd: name, args }, cookie);
const must = async (cookie, name, args) => { const r = await cmdAs(cookie, name, args);
  if (r.status !== 200) throw new Error(`${name} refused (${r.status}): ${JSON.stringify(r.json)}`); return r.json.result; };
const viewAs = async (cookie) => fetch(`${BASE}/api/d/${doc().slug}/view`, { headers: { cookie } }).then((r) => r.json());

/** one lane's document: `tag` keeps its slug and its five addresses apart from every other lane's */
const found = async (tag) => {
  const D = lane.getStore().doc;
  const STAMP_L = STAMP + tag;
  const SLUG = D.slug = 'rate-' + STAMP_L;
  const FOUNDER = `founder-${STAMP_L}@walk.docs.vote`;
  const MEMBERS = ['ann', 'bob', 'cyd', 'dee'].map((n) => `${n}-${STAMP_L}@walk.docs.vote`);
  const saved = await post('/api/docs', { title: 'Rate Motion Probe', email: FOUNDER, slug: SLUG, isMember: false });
  if (saved.status !== 200 && saved.status !== 201) { console.log(`[${clock()}] SET-UP · save refused: ` + JSON.stringify(saved)); process.exit(2); }
  const fArr = await followLink(await linkFor(FOUNDER, used));
  const FCOOKIE = D.fcookie = fArr.cookie;

  const TEXT = ['# Purpose', 'The club exists to keep the oak.', '# Meetings', 'The club meets monthly.',
    'Minutes are kept by the recorder.', '# Money', 'Dues are five pounds.', 'The treasurer reports yearly.'].join('\n');
  await must(FCOOKIE, 'confirm-starting-text', { text: TEXT });
  await must(FCOOKIE, 'set-convenor-membership', { isMember: false });
  for (const e of MEMBERS) await must(FCOOKIE, 'invite', { email: e });
  await cmdAs(FCOOKIE, 'set-quorum-form', { form: 'share' });
  const HELD = {
    quorum: { form: 'share', n: 50 }, rate: { grant: 3, cap: 3, dripMinutes: 10 },
    lapse: { afterMs: null }, authorship: { rung: 'public' }, judgments: { rung: 'never' },
    chamber: { rung: 'link' }, applications: { apply: false }, admission: { price: 'assembly' },
    removal: { price: 'consent' }, ending: { endsAtMs: Date.now() + 6 * 3600_000 },
  };
  for (const [setting, value] of Object.entries(HELD)) await must(FCOOKIE, 'set-setting', { setting, value });
  const MCOOKIES = D.mcookies = [];
  for (const e of MEMBERS) {
    const a = await followLink(await linkFor(e, used));
    if (!a.cookie) throw new Error('no seat for ' + e + ': ' + JSON.stringify(a));
    MCOOKIES.push(a.cookie);
    await must(a.cookie, 'set-identity', { name: e.split('-')[0].replace(/^./, (c) => c.toUpperCase()) });
  }
  // 🍾: what nh2026 kept — both powers on ⏱️ ⏰ 👥 💤 🥾 🪪 🤝, 🛡️ alone on 🪶 📍 🌍, nothing on 👤 👁️ or the Text
  const KEEP_BOTH = ['rate', 'ending', 'quorum', 'lapse', 'removal', 'admission', 'applications', 'bar', 'pace', 'machines'];
  const KEEP_VETO = ['title', 'link', 'chamber'];
  const managed = health.catalogue.filter((id) => !['displayName', 'picture', 'startingText'].includes(id));
  let laidDown = [...managed, 'startingText', 'door:invite', 'door:remove'].flatMap((setting) =>
    [{ setting, power: 'unilateral' }, { setting, power: 'assent' }])
    .filter((p) => !KEEP_BOTH.includes(p.setting) && !(KEEP_VETO.includes(p.setting) && p.power === 'assent'));
  for (let tries = 0; tries < 8; tries++) {
    const r = await cmdAs(FCOOKIE, 'begin', { laidDown });
    if (r.status === 200) break;
    const m = /'([^']+)' carries no power/.exec(JSON.stringify(r.json));
    if (!m) { console.log(`[${clock()}] SET-UP · 🍾 refused: ` + JSON.stringify(r.json)); process.exit(2); }
    laidDown = laidDown.filter((p) => p.setting !== m[1]);
  }
  const v0 = await viewAs(MCOOKIES[0]);
  const rate0 = ((v0.view || v0).settings || []).find((s) => s.setting === 'rate');
  say(`document /d/${SLUG} begun · ⏱️ ${JSON.stringify(rate0 && { value: rate0.value, holder: rate0.holder, powers: rate0.powers })}`);
};

/* ---- one member's real page ------------------------------------------------ */
const browser = await browserFor().launch();
const seat = async (cookie, { narrow = false, unacked = false } = {}) => {
  const ctx = await browser.newContext(narrow
    ? { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }
    : { viewport: { width: 1600, height: 1000 } });
  const [cname, cval] = cookie.split(/=(.*)/s);
  await ctx.addCookies([{ name: cname, value: cval, url: BASE }]);
  const page = await ctx.newPage();
  const wire = [], errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('response', async (res) => {
    if (res.request().method() !== 'POST' || !/\/api\/d\/[^/]+\/cmd$/.test(res.url())) return;
    let body = null; try { body = JSON.parse(res.request().postData() || 'null'); } catch {}
    let ans = null; try { ans = await res.json(); } catch {}
    wire.push({ cmd: body && body.cmd, args: body && body.args, status: res.status(), answer: ans });
  });
  await landOn(page, `${BASE}/d/${doc().slug}`);
  await page.waitForSelector('#band .cpara', { timeout: 20000 });
  await page.waitForTimeout(2000);
  // the three welcomes a fresh member owes (C9): nothing composes until 💡 is OK'd
  for (const k of (unacked ? [] : ['canpropose', 'canjudge', 'grant-voice'])) {
    const opened = await page.evaluate((kk) => { const t = document.querySelector('#rail [data-card="' + kk + '"]');
      if (!t) return false; t.click(); return true; }, k);
    if (!opened) continue;
    await page.waitForTimeout(600);
    await page.evaluate(() => { const b = document.querySelector('.setupcard [data-ok]');
      if (b && !b.disabled) { b.scrollIntoView({ block: 'center' }); b.click(); } });
    await page.waitForTimeout(1800);
  }
  await page.waitForTimeout(800);
  return { ctx, page, wire, errs, narrow };
};
const openRate = async (s, again = false) => {
  const how = await s.page.evaluate(() => {
    const t = document.querySelector('#band [data-tab="rate"]') || document.querySelector('#band .achip[data-chip="rate"]');
    if (!t) return 'no ⏱️ tab in the constitution';
    t.scrollIntoView({ block: 'center' });
    const r = t.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height,
      visible: r.width > 0 && r.height > 0 && r.x >= 0 && r.x < innerWidth };
  });
  if (typeof how === 'string') return how;
  if (s.narrow) await s.page.touchscreen.tap(how.x, how.y); else await s.page.mouse.click(how.x, how.y);
  await s.page.waitForTimeout(1200);
  // **a Founder's decree is news first** (issue #80, SURFACE E7): once the
  // Founder has ✒️-changed ⏱️, every member is owed its OK, and the card
  // opens on the news until it is pressed — the composer returns the moment
  // it is. The decree scenarios share a document, so a seat reaching ⏱️
  // after one meets that OK; it presses it as the welcomes are pressed, then
  // opens the composer again. Asserts nothing: the scenarios' own verdicts
  // are unchanged, and a card that never gives the composer back still
  // reads as no field.
  const news = await s.page.evaluate(() => { const c = document.querySelector('.setupcard[data-setupcard="rate"]');
    const b = c && !c.querySelector('[data-mrate]') && c.querySelector('[data-ok]');
    if (!b || b.disabled) return false; b.scrollIntoView({ block: 'center' }); b.click(); return true; });
  if (news && !again) {
    say('   ⏱️ opened on the Founder’s news: OK pressed, then the composer');
    await s.page.waitForTimeout(1800);
    if (!await s.page.evaluate(() => !!document.querySelector('.setupcard[data-setupcard="rate"] [data-mrate]'))) return openRate(s, true);
  }
  return how;
};
const readCard = (s) => s.page.evaluate(() => {
  const c = document.querySelector('.setupcard');
  if (!c) return null;
  const f = c.querySelector('[data-mrate]');
  const b = c.querySelector('[data-putmotion], [data-holdmotion]');
  const G = window.CARDS && window.CARDS.glyphTextOf;
  const r = f ? f.getBoundingClientRect() : null;
  return { key: c.dataset.setupcard, text: (G ? G(c) : c.innerText).replace(/\s+/g, ' ').trim().slice(0, 700),
    inputs: [...c.querySelectorAll('input, select, textarea')].map((i) => (i.dataset.mrate ? 'mrate=' : '') + i.type + ':' + i.value),
    field: f ? f.value : null, fieldBox: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
    commit: b ? { kind: b.hasAttribute('data-putmotion') ? '✏️ put' : '🏛️ hold', disabled: b.disabled, title: b.title } : null,
    pickOn: !!c.querySelector('.pick.on'), err: (c.querySelector('.doorerr, .seterr, .refusal, .mrange') || {}).textContent || null,
    // **the empty wallet's countdown** (Q1486 (E), Ed 2026-09-21: *dark, with
    // ✏️ hh:mm countdown*) — the glyph is drawn, so the characters come back
    // through `glyphTextOf`, and the moment it counts to is its own attribute
    drip: (() => { const all = c.querySelectorAll('.pdrip'); const n = all[0]; return n
      ? { text: ((G ? G(n) : n.textContent) || '').trim(), at: +n.getAttribute('data-abstain-at'), n: all.length } : null; })(),
    wallet: document.querySelectorAll('#wallet i:not(.gone)').length, focus: document.activeElement && (document.activeElement.dataset.mrate ? 'the ⏱️ field' : document.activeElement.tagName) };
});
const typeRate = async (s, n) => {
  const box = await s.page.evaluate(() => { const f = document.querySelector('.setupcard [data-mrate]');
    if (!f) return null; f.scrollIntoView({ block: 'center' }); const r = f.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (!box) return false;
  if (s.narrow) await s.page.touchscreen.tap(box.x, box.y); else await s.page.mouse.click(box.x, box.y);
  await s.page.waitForTimeout(200);
  await s.page.keyboard.press('Control+A');
  await s.page.keyboard.type(String(n), { delay: 60 });
  await s.page.waitForTimeout(300);
  return true;
};
/** a real press on the card's commit, wherever it is and whether or not it is lit */
const pressCommit = async (s, holdMs = 1500) => {
  const box = await s.page.evaluate(() => { const b = document.querySelector('.setupcard [data-putmotion], .setupcard [data-holdmotion]');
    if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, disabled: b.disabled }; });
  if (!box) return null;
  const gesture = await s.page.evaluate(() => (window.SESSION && window.SESSION.gesture) || 'hold');
  if (s.narrow) { await s.page.touchscreen.tap(box.x, box.y); await s.page.waitForTimeout(holdMs); }
  else {
    await s.page.mouse.move(box.x, box.y);
    if (gesture === 'click') { await s.page.mouse.click(box.x, box.y); await s.page.waitForTimeout(holdMs); }
    else { await s.page.mouse.down(); await s.page.waitForTimeout(holdMs); await s.page.mouse.up(); }
  }
  await s.page.waitForTimeout(1500);
  return { ...box, gesture };
};
const rateMotionsOf = async (cookie) => { const v = await viewAs(cookie); const vw = v.view || v;
  return (vw.motions || []).filter((m) => JSON.stringify(m).includes('"rate"')); };
const shot = async (s, name) => { if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}.png` }); };
const wireOf = (s) => s.wire.map((w) => `${w.cmd} ${JSON.stringify(w.args).slice(0, 160)} → ${w.status} ${JSON.stringify(w.answer).slice(0, 200)}`);

// **what the rail says for a few seconds after a press** (Q1485 (A), Ed
// 2026-09-21: *Close, and say so*) — `COPY.session.rail.justProposed`, quoted
// rather than read off the page, so a copy edit that drops it reddens this
// walk instead of passing in silence
const JUST_PROPOSED = 'Proposed — the members are deciding';
const SCENARIOS = {};
const typeThenPress = (n) => async (s, cookie, name) => {
  say(`   opened: ${JSON.stringify(await openRate(s))}`);
  const c0 = await readCard(s); say('   card as opened: ' + JSON.stringify(c0));
  await shot(s, name + '-1-open');
  if (!c0 || !c0.inputs.length) return verdict(name, false, 'the ⏱️ card offers the member no field at all');
  await typeRate(s, n);
  const c1 = await readCard(s); say('   after typing ' + n + ' (no blur): ' + JSON.stringify({ field: c1.field, commit: c1.commit, pickOn: c1.pickOn, focus: c1.focus }));
  await shot(s, name + '-2-typed');
  const before = s.wire.length;
  const p1 = await pressCommit(s); say('   press 1: ' + JSON.stringify(p1));
  const c2 = await readCard(s); say('   after press 1: ' + JSON.stringify(c2 && { key: c2.key, field: c2.field, commit: c2.commit, pickOn: c2.pickOn, err: c2.err, wallet: c2.wallet }));
  await shot(s, name + '-3-pressed');
  let posted = s.wire.slice(before).filter((w) => w.cmd === 'open-motion');
  let presses = 1;
  if (!posted.length && c2 && c2.commit && !c2.commit.disabled) {
    const p2 = await pressCommit(s); presses = 2; say('   press 2: ' + JSON.stringify(p2));
    posted = s.wire.slice(before).filter((w) => w.cmd === 'open-motion');
    const c3 = await readCard(s); say('   after press 2: ' + JSON.stringify(c3 && { key: c3.key, field: c3.field, commit: c3.commit, err: c3.err }));
  }
  await shot(s, name + '-4-after');
  const after = await readCard(s);
  say('   the card once the motion is put: ' + JSON.stringify(after && { key: after.key, text: after.text, field: after.field, commit: after.commit }));
  say('   rail: ' + JSON.stringify(await s.page.evaluate(() => [...document.querySelectorAll('#rail [data-q]')].map((e) => e.dataset.q + ' “' + (window.CARDS.glyphTextOf(e) || '').replace(/\s+/g, ' ').trim().slice(0, 60) + '”'))));
  wireOf(s).slice(-4).forEach((l) => say('   wire: ' + l));
  const running = await rateMotionsOf(cookie);
  const want = posted.length && posted[0].args && posted[0].args.payload && posted[0].args.payload.value;
  // **the card closes and the rail says so** (Q1485 (A), Ed 2026-09-21:
  // *Close, and say so* — text and rules alike). The close is Q1485 (D),
  // built in Stage 3; the sentence is this. Red before it: no `.qjust`
  // anywhere, the put leaving the rail entry reading its rule's name alone.
  const shut = await s.page.evaluate(() => {
    const j = document.querySelector('#rail .qjust');
    return { open: !!document.querySelector('.setupcard'), just: j ? j.textContent.trim() : null };
  });
  say('   after the put: ' + JSON.stringify(shut));
  const shutOk = !shut.open && shut.just === JUST_PROPOSED;
  verdict(name, posted.length === 1 && posted[0].status === 200 && presses === 1 && want && want.dripMinutes === n && shutOk,
    `typed ${n}: ${posted.length} open-motion posted after ${presses} press(es)` +
    (posted[0] ? `, value ${JSON.stringify(want)}, answer ${posted[0].status} ${JSON.stringify(posted[0].answer).slice(0, 120)}` : '') +
    ` · motions on ⏱️ in the module: ${running.length}` +
    ` · card ${shut.open ? 'STILL OPEN' : 'closed'}, the rail says ${JSON.stringify(shut.just)}`);
  return { c1, c2, posted };
};
SCENARIOS['wide-type-press'] = typeThenPress(7);
SCENARIOS['wide-hour'] = typeThenPress(60);
SCENARIOS['wide-120'] = typeThenPress(120);
SCENARIOS['wide-one'] = typeThenPress(1);
SCENARIOS['narrow'] = typeThenPress(4);

const run = async (name, fn, cookieIx, opts) => {
  const MCOOKIES = doc().mcookies;
  say('— ' + name + ' —');
  const s = await seat(MCOOKIES[cookieIx], opts);
  try { await fn(s, MCOOKIES[cookieIx], name); } catch (e) { verdict(name, false, 'threw: ' + (e && e.stack || e)); }
  if (s.errs.length) verdict(name + ' page errors', false, s.errs.join(' | '));
  // leave the room as found: withdraw whatever this seat put on ⏱️, so the next scenario meets a free composer
  for (const m of await rateMotionsOf(MCOOKIES[cookieIx])) {
    if (m.status === 'running') await cmdAs(MCOOKIES[cookieIx], 'withdraw-motion', { motion: m.id });
  }
  await s.ctx.close();
};

/** type, then click on the card's own standing sentence (a blur, as a careful member would), then read */
const typeBlur = async (s, n) => {
  await typeRate(s, n);
  const box = await s.page.evaluate(() => { const p = document.querySelector('.setupcard .pick .opttext');
    const r = p.getBoundingClientRect(); return { x: r.x + 8, y: r.y + 6 }; });
  if (s.narrow) await s.page.touchscreen.tap(box.x, box.y); else await s.page.mouse.click(box.x, box.y);
  await s.page.waitForTimeout(700);
  return readCard(s);
};
// what the field shows back once the page has re-rendered the composer round the typed value
const echo = (n) => async (s, cookie, name) => {
  await openRate(s);
  const c = await typeBlur(s, n);
  await shot(s, name + '-echo');
  say('   typed ' + n + ', clicked away: ' + JSON.stringify(c && { field: c.field, commit: c.commit, pickOn: c.pickOn, text: c.text.slice(-200) }));
  verdict(name, !!c && String(c.field) === String(n), `typed ${n}; after the render the field reads ${c && c.field}` +
    ` while the draft behind the lit ✏️ holds ${n}`);
  const before = s.wire.length;
  await pressCommit(s);
  const put = s.wire.slice(before).filter((w) => w.cmd === 'open-motion');
  say('   and the press posts: ' + (put.map((w) => JSON.stringify(w.args.payload.value) + ' → ' + w.status + ' ' + JSON.stringify(w.answer).slice(0, 140)).join(' | ') || 'nothing'));
};
// **Minutes only, as now** — Ed's ruling of 2026-09-21 on this walk's own
// finding (Q1486 (D)), keeping Q1160: a ⏱️ motion carries the interval and
// the standing grant and cap ride through unchanged. So the question the
// walk asked here is answered, and what it asserts is the answer: one field,
// and it is the interval's.
SCENARIOS['grant-cap'] = async (s, cookie, name) => {
  await openRate(s);
  const c = await readCard(s);
  const one = !!c && c.inputs.length === 1 && /^mrate=/.test(c.inputs[0]);
  verdict(name, one, `the member's ⏱️ composer holds ${c ? c.inputs.length : 0} field(s): ${c && c.inputs.join(', ')} — ` +
    'the interval alone since Q1160, ruled again by Ed 2026-09-21 (Q1486 (D)); the grant and the cap ride through');
};
SCENARIOS['same-as-stands'] = async (s, cookie, name) => {
  await openRate(s);
  const vw = await viewAs(cookie);
  const st = (((vw.view || vw).settings || []).find((x) => x.setting === 'rate') || {}).value;
  const c = await typeBlur(s, st.dripMinutes);
  say('   typed what stands (' + st.dripMinutes + '): ' + JSON.stringify(c && { field: c.field, commit: c.commit, pickOn: c.pickOn }));
  const before = s.wire.length;
  await pressCommit(s);
  const put = s.wire.slice(before).filter((w) => w.cmd === 'open-motion');
  const c2 = await readCard(s);
  await shot(s, name);
  say('   press posts: ' + (put.map((w) => w.status + ' ' + JSON.stringify(w.answer)).join(' | ') || 'nothing') + ' · the card says: ' + JSON.stringify(c2 && c2.err));
  verdict(name, !put.length || !!(c2 && c2.err) || /could not|already/i.test((c2 && c2.text) || ''),
    put.length ? `lit ✏️ on the standing value; the server answered ${put[0].status} ${JSON.stringify(put[0].answer).slice(0, 160)}; sentence on the card: ${/could not be proposed[^.]*\./.exec((c2 && c2.text) || '') || 'none'}`
      : 'the ✏️ stayed dark on the standing value');
};
SCENARIOS['empty-wallet'] = async (s, cookie, name) => {
  // spend the three ✏️ on the wire first: three renames, an ordinary motion each
  for (let i = 0; i < 3; i++) {
    const r = await cmdAs(cookie, 'open-motion', { payload: { kind: 'set', setting: 'title', value: { text: 'Rate Motion Probe ' + (i + 1) } } });
    say('   spend ' + (i + 1) + ': ' + r.status + ' ' + JSON.stringify(r.json).slice(0, 120));
  }
  // **a decree is filed as the Founder's, never as *Passed*** (Q1514, Ed
  // 2026-09-23: *Changed by the Founder: ‹value›*): the Founder ✒️-decrees
  // once here, so the scenario carries a decree whether it runs in its lane
  // behind decree-under or alone under `--only`
  const dec = await cmdAs(doc().fcookie, 'set-setting', { setting: 'rate', value: { grant: 3, cap: 3, dripMinutes: 4 }, why: '' });
  say('   the Founder ✒️ decrees every 4 minutes: ' + dec.status + ' ' + JSON.stringify(dec.json).slice(0, 120));
  await s.page.waitForTimeout(5500);
  await openRate(s);
  const c0 = await readCard(s);
  say('   ⏱️ opened with an empty wallet: ' + JSON.stringify(c0 && { wallet: c0.wallet, inputs: c0.inputs, commit: c0.commit, text: c0.text }));
  const hist = (c0 && c0.text) || '';
  const decreeLine = hist.includes('Changed by the Founder: a new proposal every 4 minutes');
  const passedDecree = /Passed: a new proposal every/.test(hist);
  verdict(name + ' · history', decreeLine && !passedDecree, 'the decree’s filed history line reads ' +
    (decreeLine ? '“Changed by the Founder: a new proposal every 4 minutes”' : 'NO “Changed by the Founder:” line') +
    (passedDecree ? ' · and a decree still reads “' + /Passed: a new proposal every \d+ minutes?/.exec(hist)[0] + '”' : ''));
  const c1 = await typeBlur(s, 3);
  say('   typed 3, clicked away: ' + JSON.stringify(c1 && { field: c1.field, commit: c1.commit, wallet: c1.wallet }));
  await shot(s, name + '-1');
  const before = s.wire.length;
  await pressCommit(s);
  const put = s.wire.slice(before).filter((w) => w.cmd === 'open-motion');
  const c2 = await readCard(s);
  await shot(s, name + '-2');
  say('   press posts: ' + (put.map((w) => w.status + ' ' + JSON.stringify(w.answer)).join(' | ') || 'nothing'));
  say('   the card then: ' + JSON.stringify(c2 && { text: c2.text, err: c2.err, commit: c2.commit, field: c2.field }));
  // **Dark, with the countdown beside it** (Q1486 (E), Ed 2026-09-21, ruling
  // the question this scenario raised: *dark, with ✏️ hh:mm countdown (for
  // proposals as well as rule changes, the same anywhere you would want to
  // press the button but you have no ✏️s)*). Red before it: the ✏️ was lit
  // with an empty wallet, the press posted, and the module answered
  // *insufficient ✏️ for the stake* — engine vocabulary, told to the one
  // member who most wants the rule moved and has nothing to move it with.
  const dark = !!(c1 && c1.commit && c1.commit.disabled);
  // **one countdown, however many keystrokes** — the commit is swapped in
  // place by its own node and the countdown stands beside it, so a swap that
  // does not clear it stacks another on every press (found by this walk, the
  // afternoon it was written)
  const clock = !!(c1 && c1.drip) && c1.drip.n === 1 &&
    /^✏️ \d\d:\d\d$/.test(c1.drip.text) && c1.drip.at > Date.now();
  const quiet = put.length === 0;
  verdict(name, dark && clock && quiet, 'with no ✏️ left: the commit is ' +
    (dark ? 'dark' : 'LIT') + ' ' + JSON.stringify(c1 && c1.commit) +
    ' · beside it ' + (c1 && c1.drip ? '“' + c1.drip.text + '”' : 'NO COUNTDOWN') +
    ' · the press posted ' + put.length +
    (put[0] ? ' → ' + put[0].status + ' ' + JSON.stringify(put[0].answer).slice(0, 160) : ' (nothing)') +
    ' · the words the card added: “' + ((c2 && c2.text) || '').slice(-160) + '”');
};
SCENARIOS['decree-under'] = async (s, cookie, name) => {
  await openRate(s);
  const c1 = await typeBlur(s, 7);
  say('   composed 7: ' + JSON.stringify(c1 && { field: c1.field, commit: c1.commit, pickOn: c1.pickOn }));
  const d = await cmdAs(doc().fcookie, 'set-setting', { setting: 'rate', value: { grant: 3, cap: 3, dripMinutes: 5 }, why: '' });
  say('   the Founder ✒️ decrees every 5 minutes: ' + d.status + ' ' + JSON.stringify(d.json).slice(0, 120));
  await s.page.waitForTimeout(9000); // two polls
  const c2 = await readCard(s);
  await shot(s, name + '-1-after-decree');
  say('   the member’s open card two polls later: ' + JSON.stringify(c2 && { key: c2.key, text: c2.text, field: c2.field, commit: c2.commit, pickOn: c2.pickOn }));
  say('   rail: ' + JSON.stringify(await s.page.evaluate(() => [...document.querySelectorAll('#rail [data-q]')].map((e) => e.dataset.q))));
  const before = s.wire.length;
  await pressCommit(s);
  const put = s.wire.slice(before).filter((w) => w.cmd === 'open-motion');
  const c3 = await readCard(s);
  await shot(s, name + '-2-pressed');
  say('   press posts: ' + (put.map((w) => JSON.stringify(w.args.payload.value) + ' → ' + w.status + ' ' + JSON.stringify(w.answer).slice(0, 160)).join(' | ') || 'nothing'));
  say('   the card then: ' + JSON.stringify(c3 && { key: c3.key, text: c3.text, err: c3.err, field: c3.field, commit: c3.commit }));
  verdict(name, put.length === 1 && put[0].status === 200, 'a decree under an open composer: ' +
    (put.length ? put[0].status + ' ' + JSON.stringify(put[0].answer).slice(0, 160) : 'the press posted nothing; commit was ' + JSON.stringify(c2 && c2.commit)));
  // and the second decree, onto the very value the member has composed.
  // **The card is shut by now** (Q1485 (D), built 2026-09-22): a put closes
  // its card with the closing animation, so the second half opens ⏱️ again
  // rather than measuring a field that is no longer in the document.
  await openRate(s);
  const c4 = await typeBlur(s, 2);
  await cmdAs(doc().fcookie, 'set-setting', { setting: 'rate', value: { grant: 3, cap: 3, dripMinutes: 2 }, why: '' });
  await s.page.waitForTimeout(9000);
  const c5 = await readCard(s);
  const b2 = s.wire.length;
  await pressCommit(s);
  const put2 = s.wire.slice(b2).filter((w) => w.cmd === 'open-motion');
  const c6 = await readCard(s);
  await shot(s, name + '-3-same-value');
  say('   composed 2 (' + JSON.stringify(c4 && c4.commit) + '), the Founder decreed 2; card: ' + JSON.stringify(c5 && { field: c5.field, commit: c5.commit }) +
    ' · press posts: ' + (put2.map((w) => w.status + ' ' + JSON.stringify(w.answer).slice(0, 160)).join(' | ') || 'nothing') +
    ' · the card says: ' + JSON.stringify(c6 && (c6.err || c6.text.slice(-200))));
};
SCENARIOS['wide-hour'] = echo(60);
SCENARIOS['wide-120'] = echo(120);
SCENARIOS['wide-one'] = echo(1);

// a fresh member who has not yet pressed OK on 💡 ⚖️ 🏛️ — which live in localStorage, so a second browser is this seat too
SCENARIOS['unacked'] = async (s, cookie, name) => {
  const how = await openRate(s);
  const c = await readCard(s);
  await shot(s, name);
  say('   rail: ' + JSON.stringify(await s.page.evaluate(() => [...document.querySelectorAll('#rail [data-card], #rail [data-q]')].map((e) => e.dataset.card || e.dataset.q))));
  say('   ⏱️ before the welcomes are OK’d: ' + JSON.stringify(typeof how === 'string' ? how : c && { text: c.text, inputs: c.inputs, commit: c.commit, wallet: c.wallet }));
  verdict(name, !!c && (c.inputs.length > 0 || /OK|welcome|first/i.test(c.text)), c ? (c.inputs.length ? 'the composer is offered' : 'no composer, and the card does not say why: “' + c.text.slice(0, 260) + '”') : 'the card would not open');
};
// the room moves while the member is still typing (the field not yet left): is the number still there?
SCENARIOS['typing-under-poll'] = async (s, cookie, name) => {
  await openRate(s);
  await typeRate(s, 7);
  const c1 = await readCard(s);
  const MC = doc().mcookies, other = MC[(MC.indexOf(cookie) + 1) % MC.length];
  const r = await cmdAs(other, 'set-identity', { name: 'Renamed ' + Date.now().toString(36).slice(-3) });
  say('   typed 7 (field still focused: ' + c1.focus + '); another member changes their name: ' + r.status);
  await s.page.waitForTimeout(9000);
  const c2 = await readCard(s);
  say('   two polls later: ' + JSON.stringify(c2 && { field: c2.field, focus: c2.focus, commit: c2.commit, pickOn: c2.pickOn }));
  const d = await cmdAs(doc().fcookie, 'set-setting', { setting: 'rate', value: { grant: 3, cap: 3, dripMinutes: 6 }, why: '' });
  await s.page.waitForTimeout(9000);
  const c3 = await readCard(s);
  await shot(s, name);
  say('   and after the Founder decrees ⏱️ itself (' + d.status + '): ' + JSON.stringify(c3 && { field: c3.field, focus: c3.focus, commit: c3.commit, pickOn: c3.pickOn }));
  // the decree's news (issue #80) waits in the rail beside the kept composer
  say('   rail then: ' + JSON.stringify(await s.page.evaluate(() => [...document.querySelectorAll('#rail [data-q]')].map((e) => e.dataset.q + ' “' + (window.CARDS.glyphTextOf(e) || '').replace(/\s+/g, ' ').trim().slice(0, 60) + '”'))));
  verdict(name, !!c3 && c3.field === '7' && !!c2 && c2.field === '7', 'a number typed and not yet left: after another member’s act the field reads ' +
    (c2 && c2.field) + ' (focus ' + (c2 && c2.focus) + '), after the Founder’s decree ' + (c3 && c3.field) + ' (focus ' + (c3 && c3.focus) + ')');
};
// **the field's own bar, and the field's own words** (Q1486 (G)): a number
// outside `min`, `max` or the step is refused by the field, so nothing is
// sent and the module's validator prose — *dripMinutes must be a whole
// number of real minutes, at least 1 (Q353)* — never reaches a member.
SCENARIOS['bad-numbers'] = async (s, cookie, name) => {
  await openRate(s);
  const bad = [];
  for (const n of ['0', '2.5', '5000']) {
    const c = await typeBlur(s, n);
    const before = s.wire.length;
    await pressCommit(s);
    const put = s.wire.slice(before).filter((w) => w.cmd === 'open-motion');
    const c2 = await readCard(s);
    say('   typed “' + n + '”: field ' + JSON.stringify(c && c.field) + ' ✏️ lit ' + JSON.stringify(c && c.commit && !c.commit.disabled) + ' · posts ' +
      (put.map((w) => JSON.stringify(w.args.payload.value) + ' → ' + w.status + ' ' + JSON.stringify(w.answer)).join(' | ') || 'nothing') +
      ' · the card says: ' + JSON.stringify(c2 && c2.err));
    const said = (c2 && c2.err) || '';
    if (put.length) bad.push(n + ' was sent');
    if (!/whole number between/.test(said)) bad.push(n + ' said ' + JSON.stringify(said.slice(0, 90)));
    for (const m of await rateMotionsOf(cookie)) if (m.status === 'running') await cmdAs(cookie, 'withdraw-motion', { motion: m.id });
    await s.page.waitForTimeout(5000);
  }
  verdict(name, bad.length === 0, bad.length
    ? bad.join(' · ')
    : '0 · 2.5 · 5000 each refused by the field itself, nothing sent, and the card says the field’s own bar');
};

// the likeliest number in a room starved at ten minutes is 1 — typed, never left, and the room moves
SCENARIOS['one-under-poll'] = async (s, cookie, name) => {
  await openRate(s);
  await typeRate(s, 1);
  await s.page.waitForTimeout(9000);
  const quiet = await readCard(s);
  say('   typed 1, touched nothing, a quiet room, two polls: ' + JSON.stringify(quiet && { field: quiet.field, focus: quiet.focus, commit: quiet.commit, pickOn: quiet.pickOn }));
  const MC = doc().mcookies, other = MC[(MC.indexOf(cookie) + 1) % MC.length];
  await cmdAs(other, 'set-identity', { name: 'Renamed ' + Date.now().toString(36).slice(-3) });
  await s.page.waitForTimeout(9000);
  const c2 = await readCard(s);
  await shot(s, name);
  say('   then another member changes their name, two polls: ' + JSON.stringify(c2 && { field: c2.field, focus: c2.focus, commit: c2.commit, pickOn: c2.pickOn }));
  verdict(name, !!c2 && c2.field === '1' && c2.focus === 'the ⏱️ field',
    'typed 1 and kept the caret in the field: the field now reads ' + (c2 && c2.field) + ' and the caret is in ' + (c2 && c2.focus));
};
// the same question of the other field composers — 🪶 the title, 👥 quorum — so the fault is placed: ⏱️'s or every field's?
SCENARIOS['others-under-poll'] = async (s, cookie, name) => {
  const MC = doc().mcookies, other = MC[(MC.indexOf(cookie) + 1) % MC.length];
  for (const [k, sel, typed] of [['title', '[data-mtext]', 'A Better Name'], ['quorum', '[data-mnum]', '30']]) {
    const opened = await s.page.evaluate((kk) => {
      const t = document.querySelector('#band [data-tab="' + kk + '"]') || document.querySelector('#band .achip[data-chip="' + kk + '"]');
      if (!t) return false; t.scrollIntoView({ block: 'center' }); t.click(); return true; }, k);
    await s.page.waitForTimeout(1200);
    const box = await s.page.evaluate((q) => { const f = document.querySelector('.setupcard ' + q);
      if (!f) return null; f.scrollIntoView({ block: 'center' }); const r = f.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
    if (!opened || !box) { verdict(name + ' ' + k, false, 'no composer field ' + sel + ' on the member’s card'); continue; }
    await s.page.mouse.click(box.x, box.y);
    await s.page.keyboard.press('Control+A');
    await s.page.keyboard.type(typed, { delay: 40 });
    const lit0 = await s.page.evaluate(() => { const b = document.querySelector('.setupcard [data-putmotion], .setupcard [data-holdmotion]'); return b ? !b.disabled : null; });
    await cmdAs(other, 'set-identity', { name: 'Renamed ' + Date.now().toString(36).slice(-3) });
    await s.page.waitForTimeout(9000);
    const after = await s.page.evaluate((q) => { const f = document.querySelector('.setupcard ' + q);
      const b = document.querySelector('.setupcard [data-putmotion], .setupcard [data-holdmotion]');
      return { field: f ? f.value : null, focused: document.activeElement === f, lit: b ? !b.disabled : null }; }, sel);
    verdict(name + ' ' + k, after.field === typed && after.focused, `typed “${typed}” and stayed in the field (commit lit while typing: ${lit0}); ` +
      `after the room moved the field reads “${after.field}”, caret ${after.focused ? 'kept' : 'gone'}, commit lit: ${after.lit}`);
    await s.page.keyboard.press('Escape');
    await s.page.evaluate(() => { const b = document.querySelector('.setupcard [data-bin], .setupcard .commitrow button'); if (b) b.click(); });
    await s.page.waitForTimeout(800);
  }
};
// on a phone: which taps wake the ✏️ once a number is typed?
SCENARIOS['narrow-ways'] = async (s, cookie, name) => {
  await openRate(s);
  await typeRate(s, 4);
  const lit = () => s.page.evaluate(() => { const b = document.querySelector('.setupcard [data-putmotion]'); const f = document.querySelector('.setupcard [data-mrate]');
    return { lit: b ? !b.disabled : null, field: f && f.value, focused: document.activeElement === f }; });
  const tapOn = async (sel) => { const box = await s.page.evaluate((q) => { const e = document.querySelector(q); if (!e) return null;
    const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
    if (!box) return 'absent'; if (s.narrow) await s.page.touchscreen.tap(box.x, box.y); else await s.page.mouse.click(box.x, box.y);
    await s.page.waitForTimeout(700); return lit(); };
  const out = {};
  out['typed, nothing else'] = await lit();
  out['tap the dark ✏️'] = await tapOn('.setupcard [data-putmotion]');
  out['tap “Propose this”'] = await tapOn('.setupcard [data-pickinput]');
  out['tap the standing sentence'] = await tapOn('.setupcard .pick .opttext');
  await s.page.keyboard.press('Enter'); await s.page.waitForTimeout(700);
  out['press Enter / Go'] = await lit();
  for (const [k, v] of Object.entries(out)) say('   ' + k + ': ' + JSON.stringify(v));
  verdict(name, out['typed, nothing else'].lit === true,
    (out['typed, nothing else'].lit === true
      ? 'the ✏️ is lit by the typing itself, and stays lit through: '
      : 'the ✏️ is dark while a number is typed; what wakes it: ') +
    Object.entries(out).filter(([, v]) => v && v.lit).map(([k]) => k).join(' · '));
};


// **The order**, each scenario with the seat it sits in. Within a document the order matters: four seats share
// 3 ✏️ each, and the two scenarios that move what stands (the Founder's decrees) and the one that empties a
// wallet go last. Every lane keeps this order among its own, and the log prints in it.
const ORDER = [
  ['wide-type-press', 0], ['grant-cap', 0], ['unacked', 0, { unacked: true }], ['same-as-stands', 0],
  ['wide-hour', 1], ['wide-120', 2], ['wide-one', 3],
  ['narrow', 2, { narrow: true }], ['narrow-ways', 3, { narrow: true }],
  ['others-under-poll', 1], ['one-under-poll', 0], ['bad-numbers', 2], ['typing-under-poll', 0],
  ['decree-under', 1], ['empty-wallet', 3],
];
// **The lanes**, balanced by what each scenario waits: the under-poll scenarios sit through two polls a step,
// the rest mostly through the welcomes. The decrees stay in one lane behind typing-under-poll's, and the empty
// wallet behind them, as they ran — so the card it reads carries the same decree. `--lanes=1` is the old serial run on one
// document; `--only=<name>` founds one document for that scenario alone.
const LANES = ONLY ? [[ONLY]] : argOf('lanes') === '1' ? [ORDER.map(([n]) => n)] : [
  ['wide-type-press', 'grant-cap', 'unacked', 'same-as-stands', 'wide-hour'],
  ['wide-120', 'wide-one', 'narrow', 'narrow-ways'],
  ['others-under-poll', 'one-under-poll', 'bad-numbers'],
  ['typing-under-poll', 'decree-under', 'empty-wallet'],
];
const LOGS = {}, FOUND = {}, FINDINGS = {};
const laneRun = (names, tag) => lane.run({ doc: {}, out: [] }, async () => {
  const st = lane.getStore();
  FOUND[tag] = st.out;
  await found(tag);
  for (const name of ORDER.map(([n]) => n).filter((n) => names.includes(n))) {
    const [, cookieIx, opts] = ORDER.find(([n]) => n === name);
    st.out = LOGS[name] = [];
    st.findings = FINDINGS[name] = [];
    await run(name, SCENARIOS[name], cookieIx, opts);
  }
});
const printed = () => {
  for (const out of Object.values(FOUND)) for (const l of out) console.log(l);
  for (const [name] of ORDER) for (const l of LOGS[name] || []) console.log(l);
};
try {
  await Promise.all(LANES.map((names, i) => laneRun(names, LANES.length > 1 ? 'l' + (i + 1) : '')));
} catch (e) { printed(); throw e; }
printed();

await browser.close();
const findings = [...FINDINGS_LOOSE, ...ORDER.flatMap(([n]) => FINDINGS[n] || [])];
if (SHOTS) writeFileSync(SHOTS + '/member-rate-motion.findings.txt', findings.join('\n') + '\n');
say(findings.length ? `FINDINGS (${findings.length}):\n  ` + findings.join('\n  ') : 'every scenario ended in a motion or a sentence');
process.exit(findings.length ? 1 : 0);
