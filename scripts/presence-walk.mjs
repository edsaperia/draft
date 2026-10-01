#!/usr/bin/env node
/**
 * presence-walk — **where each member is reading** (`reading-margin`;
 * design/PRESENCE.md §2, Q1570, Ed 2026-09-30).
 *
 *   npm run presence-walk -- [http://127.0.0.1:8140]
 *
 * Founds a document on a dev server under 👤 `public`, begins it and seats
 * three members at 1600 (A, B, C) and a fourth at 390 (D), then drives the
 * reading line and reads the margin on B's page and the view B is served:
 *
 *   1. A scrolls to a clause and dwells → within two polls B's margin shows
 *      A's face beside that block, keyed by A's id, and never B's own;
 *   2. A scrolls on inside the dwell → nothing moves (dwell, not scroll);
 *      A dwells on the new block → the same node glides there (stage 9's
 *      identity rule, `render-hold-walk`'s shape);
 *   3. A and C on one block → two marks in one column, lined up, 2px apart,
 *      in arrival order, no stack and no +n;
 *   4. hover → the name alone, as the mark's title;
 *   5. the Founder moves 👤 to `sealed` → both marks 👀 with no title, and
 *      B's view payload carries no member id beside a place (1570.3);
 *   6. D at 390 reports (B is served D's place) and draws nothing;
 *   7. A's page closes → A is gone from B's margin inside the TTL.
 *
 * Needs a dev server (no RESEND_API_KEY: the outbox is read for the links).
 * Red on the page before this walk's build at 1 (no `#reading`, no `at`).
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, sleep, say } from './lib/walk.mjs';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
const die = (m) => { console.error(`presence-walk: ${m}`); process.exit(2); };

await assertServerBuild(BASE, 'presence-walk');
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
const founderEmail = `presence-a-${run}@example.org`;
const created = await (await post('/api/docs', { title: `Presence ${run}`, email: founderEmail, isMember: true })).json();
if (!created.ok || !created.devLink) die(`creation refused: ${JSON.stringify(created)}`);
const SLUG = created.slug;
const A = (await followLink(created.devLink)).cookie;
const cmdAs = async (cookie, name, args = {}) => {
  const r = await post(`/api/d/${SLUG}/cmd`, { cmd: name, args }, cookie);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { refused.push(`${name}: ${r.status} ${JSON.stringify(j).slice(0, 160)}`); return null; }
  return j.result ?? j;
};
const viewAs = (cookie, q = '') => fetch(`${BASE}/api/d/${SLUG}/view${q}`, { headers: { cookie } }).then((r) => r.json());
const LINES = [
  `# Presence ${run}`, '## Meetings',
  'The society shall meet on the first Tuesday of every month, in the upstairs room, at seven.',
  'Every meeting opens with the minutes of the last one, read aloud by whoever kept them.',
  'A member who misses three meetings in a row shall be written to, kindly, by the secretary.',
  '## Money',
  'Subscriptions are due in January and are the same for every member, whatever their means.',
  'The treasurer may spend up to fifty pounds without asking; anything more goes to a meeting.',
  '## The house',
  'The upstairs room is swept after every meeting by whoever arrived last.',
  'Nothing is left in the room overnight but the chairs, the table and the kettle.',
  'A member may bring one guest, who is introduced to the room before anything else is said.',
  '## Changes',
  'These rules are changed by the members, in the document, and in no other way.',
];
await cmdAs(A, 'confirm-starting-text', { text: LINES.join('\n') });
await cmdAs(A, 'set-convenor-membership', { isMember: true });
await cmdAs(A, 'set-identity', { name: 'Ada Quill' });
for (const [setting, value] of Object.entries({
  rate: { grant: 5, cap: 8, dripMinutes: 60 }, pace: { shape: 'fixed' }, quorum: { form: 'count', n: 3 },
  authorship: { rung: 'public' }, judgments: { rung: 'after' }, applications: { apply: false },
  admission: { price: 'pen' }, removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
  lapse: { afterMs: 24 * 3_600_000 }, ending: { endsAtMs: Date.now() + 30 * 86_400_000 }, bar: { pct: 50 },
  chamber: { rung: 'link' },
})) {
  await (await post(`/api/d/${SLUG}/cmd`, { cmd: 'reclaim', args: { setting } }, A)).text();
  await cmdAs(A, 'set-setting', { setting, value });
}
const seats = { B: `presence-b-${run}@example.org`, C: `presence-c-${run}@example.org`, D: `presence-d-${run}@example.org` };
for (const e of Object.values(seats)) await cmdAs(A, 'invite', { email: e });
await cmdAs(A, 'begin', {});
if (refused.length) die(`the document could not be set up: ${refused.join(' / ')}`);
say(`founded ${BASE}/d/${SLUG} — begun under 👤 public, three members invited`);

const linkFor = async (to) => {
  const t = await (await fetch(`${BASE}/api/dev/outbox`)).json();
  const m = (t.mails ?? []).find((x) => x.to === to && x.link);
  if (!m) die(`no invitation for ${to} in the dev outbox`);
  return m.link;
};
const cookieOf = async (email) => (await followLink(await linkFor(email))).cookie;
const B = await cookieOf(seats.B), C = await cookieOf(seats.C), D = await cookieOf(seats.D);
await cmdAs(C, 'set-identity', { name: 'Cyd Marrow' });
const ME = {};
for (const [k, cookie] of Object.entries({ A, B, C, D })) ME[k] = (await viewAs(cookie)).me;
say(`seats · A ${ME.A} · B ${ME.B} · C ${ME.C} · D ${ME.D}`);

/* ---- the pages ----------------------------------------------------------- */
const browser = await chromium.launch();
const errors = [];
const seat = async (cookie, label, viewport = { width: 1600, height: 1000 }) => {
  const ctx = await browser.newContext({ viewport });
  const [name, ...rest] = cookie.split('=');
  await ctx.addCookies([{ name, value: rest.join('='), url: BASE }]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('response', async (r) => {
    if (!r.url().endsWith('/cmd') || r.ok()) return;
    refused.push(`${label} ${r.status()} ${(await r.text().catch(() => '')).slice(0, 160)}`);
  });
  await page.addInitScript(([slug, me]) => {
    try { localStorage.setItem('draft:grants:' + slug + ':' + me,
      JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge'])); } catch { /* none */ }
  }, [SLUG, ME[label] || '']);
  await page.goto(`${BASE}/d/${SLUG}`);
  await page.waitForSelector('#rail', { timeout: 20_000 });
  await sleep(1200);
  return { page, ctx };
};
const pa = await seat(A, 'A'), pb = await seat(B, 'B'), pc = await seat(C, 'C');
const pd = await seat(D, 'D', { width: 390, height: 844 });

/* ---- the reads ----------------------------------------------------------- */
// a real poll — `__poll()` runs `api.refresh()`, whose request carries the
// place; `__poll({ force: true })` only re-renders and fetches nothing
const poll = (p) => p.page.evaluate(() => (window.__poll ? window.__poll() : 'no seam'));
// put a block's top on the reading line, so the page notes it
const scrollTo = (p, key) => p.page.evaluate((k) => {
  const b = document.querySelector('#charter [data-key="' + k + '"]');
  if (!b) return false;
  // the block's top a little under the reading line (READ_LINE, 150), so
  // the line is plainly inside it and not on its edge
  window.scrollTo(0, b.getBoundingClientRect().top + window.scrollY - 140);
  return true;
}, key);
const DWELL = await pa.page.evaluate(() => window.SESSION.READING_DWELL_MS);
// what a page's margin draws: one row per mark
const margin = (p) => p.page.evaluate(() => {
  const el = document.getElementById('reading');
  if (!el) return null;
  return [...el.children].map((m) => {
    const r = m.getBoundingClientRect();
    return { k: m.dataset.k, cls: m.className, title: m.getAttribute('title'), left: Math.round(r.left), top: Math.round(r.top * 10) / 10,
      w: Math.round(r.width), h: Math.round(r.height), eyes: !!m.querySelector('[data-gl="eyes"]'), text: m.textContent.trim() };
  });
});
const blockTop = (p, key) => p.page.evaluate((k) => {
  const b = document.querySelector('#charter [data-key="' + k + '"]');
  if (!b) return null;
  // the line a tab stands on: the tab's own top where one is drawn, else
  // 0.15em of the page's size under the block's top (M12's `.chipcol`)
  const tab = b.querySelector('.chipcol');
  const em = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const top = tab ? tab.getBoundingClientRect().top : b.getBoundingClientRect().top + 0.15 * em;
  return { top: Math.round(top * 10) / 10, left: Math.round(b.getBoundingClientRect().left) };
}, key);
const sheetLeft = (p) => p.page.evaluate(() => { const s = document.querySelector('.desksheets .sheet'); return s ? Math.round(s.getBoundingClientRect().left) : null; });
// report and receive: the reporter's poll carries its place, the reader's poll brings it
const relay = async (reporters, reader) => {
  for (const p of reporters) await poll(p);
  await sleep(300);
  await poll(reader);
  await sleep(500);
};

/* ---- 1. A dwells on a clause → B's margin shows A's face there ----------- */
const K1 = 'L6';
if (!(await scrollTo(pa, K1))) die(`A's page has no block ${K1}`);
await sleep(DWELL + 300);
await relay([pa], pb);
let m = await margin(pb);
const aMark = () => (m || []).find((x) => x.k === 'm:' + ME.A);
check('1 · B\'s margin shows A beside ' + K1, !!aMark() && aMark().eyes === false,
  'marks on B: ' + JSON.stringify(m));
if (aMark()) {
  const bt = await blockTop(pb, K1);
  check('1 · …at the block\'s own line, 20px, on the desk left of the sheet',
    Math.abs(aMark().top - bt.top) <= 1.5 && aMark().w === 20 && aMark().h === 20 && aMark().left + 20 < (await sheetLeft(pb) ?? bt.left),
    `mark ${JSON.stringify(aMark())} · tab top ${bt.top} · sheet left ${await sheetLeft(pb)}`);
}
check('1 · never B\'s own', !(m || []).some((x) => x.k === 'm:' + ME.B), 'B is in B\'s margin');
const vB = await viewAs(B);
check('1 · B\'s view carries A\'s place by id under public', Array.isArray(vB.reading) && vB.reading.some((r) => r.id === ME.A && r.at === K1),
  JSON.stringify(vB.reading));
check('1 · …and never B\'s own', !(vB.reading || []).some((r) => r.id === ME.B), JSON.stringify(vB.reading));

/* ---- 2. scrolling on inside the dwell moves nobody; dwelling glides ------- */
const K2 = 'L9', K3 = 'L13';
await pb.page.evaluate((me) => { const el = document.querySelector('#reading [data-k="m:' + me + '"]'); if (el) el.__walkTag = 'before-move'; }, ME.A);
await scrollTo(pa, K2);
await sleep(Math.max(200, DWELL / 4));
await scrollTo(pa, K3);
await sleep(Math.max(200, DWELL / 4));
await relay([pa], pb);
m = await margin(pb);
const bt1 = await blockTop(pb, K1);
check('2 · inside the dwell A stays at ' + K1 + ' on B\'s page', !!aMark() && Math.abs(aMark().top - bt1.top) <= 1.5,
  `mark ${JSON.stringify(aMark())} · ${K1} at ${bt1 && bt1.top}`);
check('2 · …and in B\'s view', (await viewAs(B)).reading.some((r) => r.id === ME.A && r.at === K1), 'the view moved before the dwell');
// the glide's length is the page's own token (--reading-ms), never a literal here
const READING_MS = await pb.page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--reading-ms')));
check('2 · the move has its own token', READING_MS > 0, '--reading-ms ' + READING_MS);
await sleep(DWELL + 300);
await relay([pa], pb);
// relay's own 500 ms after B's poll are already in the glide
await sleep(Math.max(0, READING_MS / 2 - 500));
// mid-glide: the same node, between the two lines
const midTop = (await margin(pb) || []).find((x) => x.k === 'm:' + ME.A);
await sleep(READING_MS / 2 + 300);
m = await margin(pb);
const bt3 = await blockTop(pb, K3);
const same = await pb.page.evaluate((me) => { const el = document.querySelector('#reading [data-k="m:' + me + '"]'); return el ? el.__walkTag : null; }, ME.A);
check('2 · after the dwell A stands at ' + K3, !!aMark() && Math.abs(aMark().top - bt3.top) <= 1.5,
  `mark ${JSON.stringify(aMark())} · ${K3} at ${bt3 && bt3.top}`);
check('2 · the mark is the node it was (stage 9)', same === 'before-move', 'tag ' + same);
check('2 · …and it glided (a top between the two lines was seen)',
  !!midTop && !!aMark() && midTop.top > Math.min(bt1.top, bt3.top) - 1 && midTop.top < Math.max(bt1.top, bt3.top) + 1 && Math.abs(midTop.top - bt3.top) > 1,
  `mid ${midTop && midTop.top} · from ${bt1.top} to ${bt3.top}`);

/* ---- 3. A and C on one block: one column, lined up, arrival order --------- */
await scrollTo(pc, K3);
await sleep(DWELL + 300);
await relay([pa, pc], pb);
m = await margin(pb);
const cMark = () => (m || []).find((x) => x.k === 'm:' + ME.C);
check('3 · two marks in one column: same left, C 22px under A (arrival order), no +n',
  !!aMark() && !!cMark() && aMark().left === cMark().left && Math.abs(cMark().top - aMark().top - 22) <= 1
    && !(m || []).some((x) => /\+\d/.test(x.text)),
  `A ${JSON.stringify(aMark())} · C ${JSON.stringify(cMark())}`);

/* ---- 4. hover: the name alone ------------------------------------------- */
check('4 · the mark\'s title is the name alone', !!aMark() && aMark().title === 'Ada Quill' && !!cMark() && cMark().title === 'Cyd Marrow',
  `A title ${aMark() && JSON.stringify(aMark().title)} · C title ${cMark() && JSON.stringify(cMark().title)}`);
check('4 · pressing a face does nothing (no control inside it)', await pb.page.evaluate(() =>
  ![...document.querySelectorAll('#reading .rd')].some((el) => el.closest('a,button') || el.querySelector('a,button'))), 'a control was found');

/* ---- 5. 👤 moves to sealed → 👀, no title, no id in the payload ---------- */
const moved = await cmdAs(A, 'set-setting', { setting: 'authorship', value: { rung: 'sealed' } });
if (moved === null) die(`the Founder could not move 👤: ${refused.join(' / ')}`);
await sleep(4_600);
await relay([pa, pc], pb);
m = await margin(pb);
const vB5 = await viewAs(B);
check('5 · B\'s view carries tokens, no id, beside each place', Array.isArray(vB5.reading) && vB5.reading.length >= 2
  && vB5.reading.every((r) => typeof r.k === 'string' && r.id === undefined)
  && !JSON.stringify(vB5.reading).includes(ME.A) && !JSON.stringify(vB5.reading).includes(ME.C),
  JSON.stringify(vB5.reading));
check('5 · both marks are 👀 with no title', (m || []).filter((x) => !x.cls.includes('leaving')).length >= 2
  && (m || []).filter((x) => !x.cls.includes('leaving')).every((x) => x.eyes && x.title === null && x.k.startsWith('k:')),
  JSON.stringify(m));
const eyesHtml = await pb.page.evaluate(() => { const g = document.querySelector('#reading [data-gl="eyes"] use'); return g ? g.getAttribute('href') : null; });
check('5 · the 👀 is drawn from the sprite', eyesHtml === '#fl-eyes', String(eyesHtml));

/* ---- 6. a phone reports and draws nothing ------------------------------- */
await scrollTo(pd, K1);
await sleep(DWELL + 300);
await relay([pd], pb);
const vB6 = await viewAs(B);
check('6 · D at 390 reports: B is served a fourth place', Array.isArray(vB6.reading) && vB6.reading.length === 3, JSON.stringify(vB6.reading));
const dm = await margin(pd);
check('6 · …and draws nothing', dm !== null && dm.length === 0, JSON.stringify(dm));

/* ---- 7. a page that closes is gone inside the TTL ------------------------ */
await pa.ctx.close();
const t0 = Date.now();
let gone = false;
while (Date.now() - t0 < 40_000) {
  await poll(pb); await sleep(1_500);
  const v = await viewAs(B);
  if ((v.reading || []).length === 2) { gone = true; break; }
}
check('7 · A\'s place is gone from B\'s view inside the TTL', gone, `after ${Math.round((Date.now() - t0) / 1000)}s`);
// B's own next poll brings the same answer; the mark fades for one wash
await poll(pb); await sleep(1_200);
m = await margin(pb);
check('7 · …and from B\'s margin', (m || []).filter((x) => !x.cls.includes('leaving')).length === 2, JSON.stringify(m));

/* ---- verdict ------------------------------------------------------------- */
await browser.close();
if (errors.length) { say('page errors: ' + errors.join(' | ')); stuck.push('page errors'); }
if (refused.length) { say('refused: ' + refused.join(' | ')); stuck.push('refused commands'); }
if (stuck.length) { say(`presence-walk: ${stuck.length} stuck — ${stuck.join('; ')}`); process.exit(1); }
say('presence-walk: all green');
