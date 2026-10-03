#!/usr/bin/env node
/**
 * load-walk — **load on demand, unload when idle** (Scaling Stage 2, issue
 * #219; design/spec-pass/plan-scaling.md *Stage 2*'s acceptance).
 *
 *   npm run load-walk -- [http://127.0.0.1:8187]
 *
 * Needs a dev server with a short idle period and a fast metronome:
 * `DRAFT_IDLE_MS=3000 DRAFT_TICK_MS=1000` (`scripts/ci-walks.sh` boots one).
 * Founds two begun documents of two members and asks `/api/dev/loaded`
 * whether each is in memory:
 *
 *   1. **a page holding an open push stream keeps its document loaded**: A's
 *      page stands on document P for several idle periods and P stays;
 *   2. **closed, the document goes idle and is unloaded**;
 *   3. **the next page loads it again with nothing lost**: concurrent first
 *      views share one load, every seat's view reads as it did before the
 *      unload (the clock's two fields aside), and the reopened page draws the
 *      same text and the same rail as the page before it;
 *   4. **a tick that falls due while a document is unloaded loads it and runs
 *      the clock**: document Q, ending a little ahead, is unloaded before its
 *      ending and found closed after it — at the ending, its close mailed —
 *      without a page or a request touching it.
 *
 * Red on the host before Stage 2 at 2 (nothing ever unloads).
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, sleep, say, withWas } from './lib/walk.mjs';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8187');
const die = (m) => { console.error(`load-walk: ${m}`); process.exit(2); };

await assertServerBuild(BASE, 'load-walk');
const health = await (await fetch(`${BASE}/healthz`)).json();
if (health.devMail !== true) die(`${BASE} is not a dev server`);
if (health.loads?.mode !== 'lazy') die(`${BASE} does not load on demand (loads: ${JSON.stringify(health.loads)})`);
const IDLE = health.loads.idleMs;
if (IDLE > 10_000) die(`${BASE}'s idle period is ${IDLE} ms — boot it with DRAFT_IDLE_MS=3000 DRAFT_TICK_MS=1000`);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);
const run = Date.now().toString(36);
const stuck = [];
const fail = (what, why) => { say('FAIL: ' + why); stuck.push(what); };
const ok = (what) => say('ok   · ' + what);
const check = (what, cond, why) => { if (cond) ok(what); else fail(what, what + ' — ' + why); return !!cond; };
const refused = [];

const loaded = async (slug) => (await fetch(`${BASE}/api/dev/loaded?slug=${slug}`)).json();
/** Wait until `pred(state)` holds, or `ms` pass; the last state read. */
const waitLoaded = async (slug, pred, ms) => {
  const t0 = Date.now();
  let st = await loaded(slug);
  while (!pred(st) && Date.now() - t0 < ms) { await sleep(250); st = await loaded(slug); }
  return st;
};

/** A begun document of two members, its text in seven lines; `endsAtMs` its ending. */
async function found(title, endsAtMs) {
  const created = await (await post('/api/docs', { title, email: `load-a-${run}-${title.length}@example.org`, isMember: true })).json();
  if (!created.ok || !created.devLink) die(`creation refused: ${JSON.stringify(created)}`);
  const slug = created.slug;
  const A = (await followLink(created.devLink)).cookie;
  const cmdAs = async (cookie, name, args = {}) => {
    const r = await post(`/api/d/${slug}/cmd`, { cmd: name, args }, cookie);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { refused.push(`${name}: ${r.status} ${JSON.stringify(j).slice(0, 160)}`); return null; }
    return j.result ?? j;
  };
  const text = [`# ${title}`, '## Meetings',
    'The society meets on the first Tuesday of every month.',
    'Every meeting opens with the minutes of the last one.',
    'A member who misses three meetings is written to, kindly.',
    '## Money', 'Subscriptions are due in January.'].join('\n');
  await cmdAs(A, 'confirm-starting-text', { text });
  await cmdAs(A, 'set-convenor-membership', { isMember: true });
  await cmdAs(A, 'set-identity', { name: 'Ada Quill' });
  for (const [setting, value] of Object.entries({
    rate: { grant: 6, cap: 8, dripMinutes: 60 }, quorum: { form: 'count', n: 2 },
    authorship: { rung: 'public' }, judgments: { rung: 'after' }, applications: { apply: false },
    admission: { price: 'pen' }, removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
    lapse: { afterMs: 24 * 3_600_000 }, ending: { endsAtMs }, chamber: { rung: 'link' },
  })) {
    await (await post(`/api/d/${slug}/cmd`, { cmd: 'reclaim', args: { setting } }, A)).text();
    await cmdAs(A, 'set-setting', { setting, value });
  }
  const bEmail = `load-b-${run}-${title.length}@example.org`;
  await cmdAs(A, 'invite', { email: bEmail });
  await cmdAs(A, 'begin', {});
  if (refused.length) die(`the document could not be set up: ${refused.join(' / ')}`);
  const mails = (await (await fetch(`${BASE}/api/dev/outbox`)).json()).mails ?? [];
  const bLink = mails.find((m) => m.to === bEmail && m.link)?.link;
  if (!bLink) die(`no invitation for ${bEmail}`);
  const B = (await followLink(bLink)).cookie;
  await cmdAs(B, 'set-identity', { name: 'Bo Tanner' });
  // a live race, so the engine and its bridge are part of what must survive
  await cmdAs(B, 'propose-text', { baseVersion: 0,
    hunks: withWas(text, [{ start: 3, end: 4, lines: ['Every meeting opens with the minutes, read aloud.'] }]),
    why: 'clarity' });
  if (refused.length) die(`the document could not be set up: ${refused.join(' / ')}`);
  return { slug, A, B, aEmail: `load-a-${run}-${title.length}@example.org` };
}

/** A seat's view with the clock's two fields taken out (the server's now, the drip's countdown). */
const viewOf = async (slug, cookie) => {
  const v = await (await fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie } })).json();
  delete v.serverNowMs;
  if (v.walletInfo) delete v.walletInfo.nextDripInMs;
  return v;
};

/* ---- 4 first: a tick due while Q is unloaded ------------------------------ */
// Q goes first so its ending is near: founded with an ending a few idle
// periods ahead, left alone, and found closed after it
const endsAtMs = Date.now() + Math.max(20_000, IDLE * 6);
const Q = await found(`Load due ${run}`, endsAtMs);
say(`founded ${BASE}/d/${Q.slug} — begun, ending in ${endsAtMs - Date.now()} ms`);
let lq = await waitLoaded(Q.slug, (s) => !s.loaded, Math.max(0, endsAtMs - Date.now() - 2_000));
const coldBeforeEnding = !lq.loaded && Date.now() < endsAtMs;
check('Q unloads before its ending', coldBeforeEnding, `at ${endsAtMs - Date.now()} ms before the ending: ${JSON.stringify(lq)}`);
const qLoadsBefore = lq.loads;
lq = await waitLoaded(Q.slug, (s) => s.loaded, endsAtMs - Date.now() + IDLE + 10_000);
check('the tick at the ending loads Q, with no request for it', lq.loaded && lq.loads > qLoadsBefore,
  `${JSON.stringify(lq)}`);
// the door's view says when it closed (`closed.at`); Q is readable by link
const qv = await (await fetch(`${BASE}/api/d/${Q.slug}/view`)).json();
check('Q is closed, at its ending', qv.closed && qv.closed.at === endsAtMs,
  `closed: ${JSON.stringify(qv.closed)}, ending ${endsAtMs}`);
const mails = (await (await fetch(`${BASE}/api/dev/outbox`)).json()).mails ?? [];
check('Q\'s close was mailed', mails.some((m) => m.to === Q.aEmail && /has closed/.test(m.subject ?? '')),
  `no close mail to ${Q.aEmail}`);


/* ---- the document a page holds -------------------------------------------- */
const P = await found(`Load ${run}`, Date.now() + 30 * 86_400_000);
say(`founded ${BASE}/d/${P.slug} — begun, two members, a live race`);

/* ---- 1. an open push stream keeps P loaded -------------------------------- */
const browser = await chromium.launch();
const errors = [];
const seat = async (slug, cookie, label) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const [name, ...rest] = cookie.split('=');
  await ctx.addCookies([{ name, value: rest.join('='), url: BASE }]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  const me = (await viewOf(slug, cookie)).me;
  await page.addInitScript(([s, m]) => {
    try { localStorage.setItem('draft:grants:' + s + ':' + m,
      JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge'])); } catch { /* none */ }
  }, [slug, me]);
  await page.goto(`${BASE}/d/${slug}`);
  await page.waitForSelector('#rail', { timeout: 20_000 });
  await sleep(1500);
  return { page, ctx };
};
const textOf = (p) => p.page.evaluate(() => (document.querySelector('#prose') || {}).innerText || '');
const railOf = (p) => p.page.evaluate(() => (document.querySelector('#rail') || {}).innerText || '');

const pa = await seat(P.slug, P.A, 'A');
let st = null;
for (let i = 0; i < 40 && !(st && st.open); i++) {
  st = await pa.page.evaluate(() => (window.__push ? window.__push() : null));
  await sleep(100);
}
check('A\'s page holds the push stream', st && st.open, `__push() = ${JSON.stringify(st)}`);
const textBefore = await textOf(pa);
const railBefore = await railOf(pa);
const viewsBefore = { A: await viewOf(P.slug, P.A), B: await viewOf(P.slug, P.B) };
await sleep(IDLE * 4);
let lp = await loaded(P.slug);
check('P stays loaded while a page streams it', lp.loaded,
  `after ${IDLE * 4} ms with A's page open: ${JSON.stringify(lp)}`);

/* ---- 2. closed, P goes idle and unloads ----------------------------------- */
await pa.ctx.close();
lp = await waitLoaded(P.slug, (s) => !s.loaded, IDLE * 6 + 5_000);
check('P unloads once nobody has it open', !lp.loaded, `still loaded ${IDLE * 6 + 5_000} ms after the page closed`);

/* ---- 3. reopened with nothing lost ---------------------------------------- */
const loadsBefore = lp.loads;
const burst = await Promise.all(Array.from({ length: 6 }, () => viewOf(P.slug, P.B)));
lp = await loaded(P.slug);
check('concurrent first views of a cold document share one load', lp.loaded && lp.loads === loadsBefore + 1,
  `loads ${loadsBefore} → ${lp.loads}, loaded ${lp.loaded}`);
check('every first view reads alike', new Set(burst.map((v) => JSON.stringify(v))).size === 1, 'the six views differ');
const viewsAfter = { A: await viewOf(P.slug, P.A), B: await viewOf(P.slug, P.B) };
for (const k of ['A', 'B']) {
  const was = JSON.stringify(viewsBefore[k]);
  const now = JSON.stringify(viewsAfter[k]);
  check(`${k}'s view after the reload is the view before the unload`, was === now,
    `first difference at ${[...was].findIndex((c, i) => c !== now[i])}: …${was.slice(0, 0)}`);
}
const pa2 = await seat(P.slug, P.A, 'A again');
check('the reopened page draws the same text', (await textOf(pa2)) === textBefore, 'the text differs');
check('the reopened page draws the same rail', (await railOf(pa2)) === railBefore,
  `rail was ${JSON.stringify(railBefore.slice(0, 120))}, is ${JSON.stringify((await railOf(pa2)).slice(0, 120))}`);
await pa2.ctx.close();

await browser.close();
check('no page threw', errors.length === 0, errors.join(' / '));
const after = await (await fetch(`${BASE}/healthz`)).json();
say(`healthz: ${after.documentsLoaded} of ${after.documents} loaded; loads ${JSON.stringify(after.loads)}; `
  + `memory ${JSON.stringify(after.memory)}`);
if (stuck.length) { say(`load-walk: ${stuck.length} red — ${stuck.join(' · ')}`); process.exit(1); }
say('load-walk: green');
