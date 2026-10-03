#!/usr/bin/env node
/**
 * push-walk — **push instead of polling** (Scaling Stage 4, issue #162;
 * design/spec-pass/plan-scaling.md *Stage 4*'s acceptance).
 *
 *   npm run push-walk -- [http://127.0.0.1:8140]
 *
 * Founds a begun document of two members on a dev server and seats both at
 * 1600, then reads each page's own stream (`window.__push()`), its requests
 * and its rail:
 *
 *   1. both pages open `/api/d/:slug/events` and say so (`open`);
 *   2. **a proposal on one seat reaches the other seat's page in under a
 *      second** — B's rail gains the race's entry;
 *   3. **a vote on one seat reaches the other seat's page in under a
 *      second** — B votes, the proposal passes, A's rail changes;
 *   4. **nothing rebuilds under a press**: with B's poll held
 *      (`__pollPaused`, the walks' stand-in for a gesture) a change lands and
 *      B's rail does not move; let go, it arrives within a second — the event
 *      was kept, not dropped;
 *   5. **idle pages cost no requests beyond the backstop**: B's view requests
 *      over `IDLE_S` seconds with nothing happening, against a third page with
 *      push switched off in the page (`__noPush`), which polls at 4 s as every
 *      page did before push. Printed as the before and the after;
 *   6. **the differential** (plan-scaling Invariant 4): after one more change,
 *      B's page with push and B's page with the poll alone hold the same text
 *      and the same rail, word for word — push moves when a page learns, never
 *      what it learns.
 *
 * Needs a dev server (no RESEND_API_KEY: the outbox is read for the links).
 * Red on the page before Stage 4 at 1 (no stream) and 5 (sixteen polls).
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, sleep, say, withWas } from './lib/walk.mjs';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
const IDLE_S = Number(process.env.PUSH_IDLE_S || 65);
const die = (m) => { console.error(`push-walk: ${m}`); process.exit(2); };

await assertServerBuild(BASE, 'push-walk');
const health = await (await fetch(`${BASE}/healthz`)).json();
if (health.devMail !== true) die(`${BASE} is not a dev server`);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);
const run = Date.now().toString(36);
const stuck = [];
const fail = (what, why) => { say('FAIL: ' + why); stuck.push(what); };
const ok = (what) => say('ok   · ' + what);
const check = (what, cond, why) => { if (cond) ok(what); else fail(what, what + ' — ' + why); return !!cond; };
const refused = [];

/* ---- the document -------------------------------------------------------- */
const created = await (await post('/api/docs', { title: `Push ${run}`, email: `push-a-${run}@example.org`, isMember: true })).json();
if (!created.ok || !created.devLink) die(`creation refused: ${JSON.stringify(created)}`);
const SLUG = created.slug;
const A = (await followLink(created.devLink)).cookie;
const cmdAs = async (cookie, name, args = {}) => {
  const r = await post(`/api/d/${SLUG}/cmd`, { cmd: name, args }, cookie);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { refused.push(`${name}: ${r.status} ${JSON.stringify(j).slice(0, 160)}`); return null; }
  return j.result ?? j;
};
const viewAs = (cookie) => fetch(`${BASE}/api/d/${SLUG}/view`, { headers: { cookie } }).then((r) => r.json());
const LINES = [`# Push ${run}`, '## Meetings',
  'The society meets on the first Tuesday of every month.',
  'Every meeting opens with the minutes of the last one.',
  'A member who misses three meetings is written to, kindly.',
  '## Money', 'Subscriptions are due in January.'];
const TEXT = LINES.join('\n');
await cmdAs(A, 'confirm-starting-text', { text: TEXT });
await cmdAs(A, 'set-convenor-membership', { isMember: true });
await cmdAs(A, 'set-identity', { name: 'Ada Quill' });
for (const [setting, value] of Object.entries({
  rate: { grant: 6, cap: 8, dripMinutes: 60 }, quorum: { form: 'count', n: 1 },
  authorship: { rung: 'public' }, judgments: { rung: 'after' }, applications: { apply: false },
  admission: { price: 'pen' }, removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
  lapse: { afterMs: 24 * 3_600_000 }, ending: { endsAtMs: Date.now() + 30 * 86_400_000 },
  chamber: { rung: 'link' },
})) {
  await (await post(`/api/d/${SLUG}/cmd`, { cmd: 'reclaim', args: { setting } }, A)).text();
  await cmdAs(A, 'set-setting', { setting, value });
}
const bEmail = `push-b-${run}@example.org`;
await cmdAs(A, 'invite', { email: bEmail });
await cmdAs(A, 'begin', {});
if (refused.length) die(`the document could not be set up: ${refused.join(' / ')}`);
const outboxMails = (await (await fetch(`${BASE}/api/dev/outbox`)).json()).mails ?? [];
const bLink = outboxMails.find((m) => m.to === bEmail && m.link)?.link;
if (!bLink) die(`no invitation for ${bEmail}`);
const B = (await followLink(bLink)).cookie;
await cmdAs(B, 'set-identity', { name: 'Bo Tanner' });
const ME = { A: (await viewAs(A)).me, B: (await viewAs(B)).me };
say(`founded ${BASE}/d/${SLUG} — begun, two members`);

/* ---- the pages ----------------------------------------------------------- */
const browser = await chromium.launch();
const errors = [];
const seat = async (cookie, label, { noPush = false } = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const [name, ...rest] = cookie.split('=');
  await ctx.addCookies([{ name, value: rest.join('='), url: BASE }]);
  const page = await ctx.newPage();
  const views = [];
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('request', (r) => { if (r.url().includes(`/api/d/${SLUG}/view`)) views.push(Date.now()); });
  await page.addInitScript(([slug, me, off]) => {
    try { localStorage.setItem('draft:grants:' + slug + ':' + me,
      JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge'])); } catch { /* none */ }
    if (off) window.__noPush = true;
  }, [SLUG, ME[label] || ME.B, noPush]);
  await page.goto(`${BASE}/d/${SLUG}`);
  await page.waitForSelector('#rail', { timeout: 20_000 });
  await sleep(1500);
  return { page, ctx, views };
};
const pa = await seat(A, 'A');
const pb = await seat(B, 'B');

const pushOf = (p) => p.page.evaluate(() => (window.__push ? window.__push() : null));
const railOf = (p) => p.page.evaluate(() => (document.querySelector('#rail') || {}).innerText || '');
/** ms until the page's rail reads differently from `before`, or null past `ms`. */
const railMoves = async (p, before, ms = 3_000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if ((await railOf(p)) !== before) return Date.now() - t0;
    await sleep(25);
  }
  return null;
};

/* ---- 1. both pages hold a stream ----------------------------------------- */
for (const [label, p] of [['A', pa], ['B', pb]]) {
  let st = null;
  for (let i = 0; i < 40 && !(st && st.open); i++) { st = await pushOf(p); await sleep(100); }
  check(`${label}'s page holds the stream`, st && st.open, `__push() = ${JSON.stringify(st)}`);
}

/* ---- 2. a proposal on A reaches B in under a second ---------------------- */
let before = await railOf(pb);
let t0 = Date.now();
const hunks = [{ start: 4, end: 5, lines: ['A member who misses three meetings is written to, warmly.'] }];
await cmdAs(A, 'propose-text', { baseVersion: 0, hunks: withWas(TEXT, hunks), why: 'warmth' });
let took = await railMoves(pb, before);
const cmdMs = Date.now() - t0 - (took ?? 0);
check('a proposal on one seat reaches the other seat\'s rail in under a second',
  took !== null && took < 1_000, `B's rail moved after ${took} ms (the command itself took ${cmdMs} ms)`);
say(`     · proposal → B's rail: ${took} ms after the command answered`);

/* ---- 3. a vote on B reaches A in under a second -------------------------- */
const v = await viewAs(B);
const card = (v.raceCards || []).find((c) => c.kind === 'edge');
if (!card) die(`B was dealt no pair: ${JSON.stringify(v.raceCards)}`);
const inc = v.clauses.find((c) => c.incumbentId === card.a.id || c.incumbentId === card.b.id)?.incumbentId;
before = await railOf(pa);
await cmdAs(B, 'judge-race', { a: card.a.id, b: card.b.id, outcome: card.a.id === inc ? 'b' : 'a' });
took = await railMoves(pa, before);
check('a vote on one seat reaches the other seat\'s rail in under a second',
  took !== null && took < 1_000, `A's rail moved after ${took} ms`);
say(`     · vote → A's rail: ${took} ms after the command answered`);

/* ---- 4. an event under a press is kept, not dropped ---------------------- */
await sleep(1_000);
await pb.page.evaluate(() => { window.__pollPaused = true; });
before = await railOf(pb);
const v2 = await viewAs(A);
const lines2 = v2.text ?? TEXT;
const hunks2 = [{ start: 6, end: 7, lines: ['Subscriptions are due in February.'] }];
await cmdAs(A, 'propose-text', { baseVersion: v2.textVersion ?? 0, hunks: withWas(lines2, hunks2), why: 'a later month' });
const held = await railMoves(pb, before, 1_500);
check('nothing lands while a press is held', held === null, `B's rail moved ${held} ms into the hold`);
await pb.page.evaluate(() => { window.__pollPaused = false; });
took = await railMoves(pb, before, 2_000);
check('the held change lands within a second of letting go', took !== null && took < 1_000,
  `B's rail moved ${took} ms after the hold ended`);

/* ---- 5. idle: the backstop alone, against a page with push off ----------- */
const pc = await seat(B, 'B', { noPush: true });
await sleep(2_000);
const mark = Date.now();
pb.views.length = 0; pc.views.length = 0;
say(`     · idling ${IDLE_S} s …`);
await sleep(IDLE_S * 1_000);
const pushed = pb.views.filter((t) => t >= mark).length;
const polled = pc.views.filter((t) => t >= mark).length;
say(`     · idle ${IDLE_S} s: ${pushed} view requests with push (the 30 s backstop), ${polled} with push off (the 4 s poll)`);
check('an idle page costs no requests beyond the backstop',
  pushed <= Math.ceil(IDLE_S / 30) + 1, `${pushed} view requests in ${IDLE_S} s`);
check('a page with push off polls as before', polled >= Math.floor(IDLE_S / 4) - 2, `${polled} view requests in ${IDLE_S} s`);

/* ---- 6. the differential: the same seat, push and the poll alone --------- */
const v3 = await viewAs(A);
const hunks3 = [{ start: 3, end: 4, lines: ['Every meeting opens with the minutes, read aloud.'] }];
await cmdAs(A, 'propose-text', { baseVersion: v3.textVersion ?? 0, hunks: withWas(v3.text ?? TEXT, hunks3), why: 'aloud' });
// the poll's page learns within its 4 s tick; give it two
await sleep(9_000);
const shown = (p) => p.page.evaluate(() => ({
  text: (document.querySelector('#charter') || {}).innerText || '',
  rail: (document.querySelector('#rail') || {}).innerText || '',
}));
const [withPush, withPoll] = [await shown(pb), await shown(pc)];
check('push and the poll alone show the same text', withPush.text === withPoll.text && withPush.text.length > 0,
  'the two pages of one seat read differently');
check('push and the poll alone show the same rail', withPush.rail === withPoll.rail,
  `push: ${JSON.stringify(withPush.rail.slice(0, 200))} / poll: ${JSON.stringify(withPoll.rail.slice(0, 200))}`);

check('no page threw', errors.length === 0, errors.join(' / '));
check('no command was refused', refused.length === 0, refused.join(' / '));
await browser.close();
say(stuck.length ? `push-walk: RED — ${stuck.join('; ')}` : 'push-walk: green');
process.exit(stuck.length ? 1 : 0);
