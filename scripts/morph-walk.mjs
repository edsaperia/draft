#!/usr/bin/env node
/**
 * morph-walk — **the open card stays open and morphs into its successor**
 * (issue #143, Ed 2026-10-01: *the decision card will remain open but change
 * smoothly into the record card*; SURFACE C5, M24; the calls of PR #146).
 *
 *   npm run morph-walk -- [http://127.0.0.1:8140]
 *
 * Founds a document on a dev server, begins it and seats members at 1600,
 * then puts four changes under a card a reader has open, decided by the
 * other seats' votes over the wire, and reads the reader's page before and
 * after:
 *
 *   1. a pass — C has the race open as a pair card; B's and D's votes carry
 *      it into the Founder's park (the Text's 🛡️ kept), and C's card becomes
 *      the park's ⏳ card; the Founder lets it through, and it becomes the ✔
 *      record (call A, SURFACE E36);
 *   2. a fail — C has a second race open; B's and D's refusals close it, and
 *      C's card becomes what that race left (call A, or E's read card);
 *   3. a motion — C has B's ⏱️ motion open in the band; the room carries it
 *      and C's card becomes the rule's record (call C);
 *   4. an application — C has a stranger's application open; the room admits
 *      them, nothing follows it, and C's card becomes §9's `read` card, its
 *      head and its entry kept (calls C and E, `adm:`);
 *   5. reduced motion — 1's first road on a second page of C's under
 *      `prefers-reduced-motion`: the card stays and changes, nothing glides.
 *
 * For each: the open card's frame is the same Element before and after, and
 * so is its rail entry; the entry moved 0px; the card's head and its pressed
 * tab moved 0px; the entry's mark changed; the page logged a morph
 * (`CARD_SHELL.morphs`) under the card's lineage; no page error.
 * Needs a dev server (no RESEND_API_KEY: the outbox is read for the links).
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, sleep, say } from './lib/walk.mjs';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
const die = (m) => { console.error(`morph-walk: ${m}`); process.exit(2); };

await assertServerBuild(BASE, 'morph-walk');
const health = await (await fetch(`${BASE}/healthz`)).json();
if (health.devMail !== true) die(`${BASE} is not a dev server`);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);
const run = Date.now().toString(36);
const stuck = [];
const fail = (what, why) => { say('FAIL: ' + why); stuck.push(what); };
const refused = [];

/* ---- the document -------------------------------------------------------- */
const created = await (await post('/api/docs', { title: `Morph ${run}`, email: `morph-a-${run}@example.org`, isMember: true })).json();
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
const LINES = [
  `# Morph ${run}`, '## Meetings',
  'The society shall meet on the first Tuesday of every month, in the upstairs room, at seven.',
  'Every meeting opens with the minutes of the last one, read aloud by whoever kept them.',
  'A member who misses three meetings in a row shall be written to, kindly, by the secretary.',
  '## Money',
  'Subscriptions are due in January and are the same for every member, whatever their means.',
  'The treasurer may spend up to fifty pounds without asking; anything more goes to a meeting.',
];
await cmdAs(A, 'confirm-starting-text', { text: LINES.join('\n') });
await cmdAs(A, 'set-convenor-membership', { isMember: true });
for (const [setting, value] of Object.entries({
  // a quorum of three in a room of four: the author's voice and one vote
  // leave a race live, a second vote carries it, two refusals close it
  rate: { grant: 5, cap: 8, dripMinutes: 60 }, pace: { shape: 'fixed' }, quorum: { form: 'count', n: 3 },
  authorship: { rung: 'public' }, judgments: { rung: 'after' }, applications: { apply: true },
  admission: { price: 'proposal' }, removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
  lapse: { afterMs: 24 * 3_600_000 }, ending: { endsAtMs: Date.now() + 30 * 86_400_000 }, bar: { pct: 50 },
  chamber: { rung: 'link' },
})) {
  await (await post(`/api/d/${SLUG}/cmd`, { cmd: 'reclaim', args: { setting } }, A)).text();
  await cmdAs(A, 'set-setting', { setting, value });
}
const seats = { B: `morph-b-${run}@example.org`, C: `morph-c-${run}@example.org`, D: `morph-d-${run}@example.org` };
for (const e of Object.values(seats)) await cmdAs(A, 'invite', { email: e });
// ⏱️'s and ✉️'s vetoes laid down, so a carried motion or admission stands at
// once (steps 3, 4); the Text's pair kept, so a carried race parks (step 1)
await cmdAs(A, 'begin', { laidDown: [{ setting: 'rate', power: 'assent' }, { setting: 'door:invite', power: 'assent' }] });
if (refused.length) die(`the document could not be set up: ${refused.join(' / ')}`);
say(`founded ${BASE}/d/${SLUG} — begun, a room of four, quorum three`);

const outbox = async () => (await (await fetch(`${BASE}/api/dev/outbox`)).json()).mails ?? [];
const linkFor = async (to) => {
  const m = (await outbox()).find((x) => x.to === to && x.link);
  if (!m) die(`no invitation for ${to} in the dev outbox`);
  return m.link;
};
const cookieOf = async (email) => (await followLink(await linkFor(email))).cookie;
const B = await cookieOf(seats.B), C = await cookieOf(seats.C), D = await cookieOf(seats.D);

/* ---- the reader's page --------------------------------------------------- */
const browser = await chromium.launch();
const errors = [];
const seat = async (cookie, label, opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, ...opts });
  const [name, ...rest] = cookie.split('=');
  await ctx.addCookies([{ name, value: rest.join('='), url: BASE }]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('response', async (r) => {
    if (!r.url().endsWith('/cmd') || r.ok()) return;
    refused.push(`${label} ${r.status()} ${(await r.text().catch(() => '')).slice(0, 160)}`);
  });
  const v = await viewAs(cookie);
  await page.addInitScript(([slug, me]) => {
    try { localStorage.setItem('draft:grants:' + slug + ':' + me,
      JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge'])); } catch { /* none */ }
  }, [SLUG, v.me || '']);
  await page.goto(`${BASE}/d/${SLUG}`);
  await page.waitForSelector('#rail', { timeout: 20_000 });
  await sleep(1500);
  return page;
};
const pc = await seat(C, 'C');
// the same member on a second page, under reduced motion (step 5)
const pcr = await seat(C, 'C (reduced motion)', { reducedMotion: 'reduce' });
const poll = (page) => page.evaluate(() => (window.__poll ? window.__poll({ force: true }) : 'no seam'));

const v0 = await viewAs(A);
const lines = String(v0.text || '').split('\n');
const propose = async (cookie, at, text, why) => {
  const v = await viewAs(cookie);
  return cmdAs(cookie, 'propose-text', { baseVersion: v.textVersion,
    hunks: [{ start: at, end: at + 1, lines: [text], was: [lines[at]] }], why });
};
/** the pair a seat is served on a setting's race (live.js's `raceCardOf`) */
const askOn = (v, settingId) => (v.raceCards || []).find((x) =>
  (x.a.setting && x.a.setting.settingId === settingId) || (x.b.setting && x.b.setting.settingId === settingId))
  || ((v.settingRaces || []).find((r) => r.settingId === settingId && r.ask) || {}).ask || null;
/** a vote for the change on it (live.js's `judgeRaceCard`, pick `prefer`) */
const voteFor = async (cookie, settingId, what) => {
  const card = askOn(await viewAs(cookie), settingId);
  if (!card) { fail(what, what + ' · no card served on ' + settingId); return; }
  await cmdAs(cookie, 'judge-race', { a: card.a.id, b: card.b.id, outcome: card.a.incumbent ? 'b' : 'a' });
};
const raceOf = async (cookie, id) => ((await viewAs(cookie)).clauses || []).find((c) => (c.candidates || []).some((x) => x.id === id));

/** open the rail entry whose key passes `test`, and read the open card */
const openEntry = (page, test) => page.evaluate(async (src) => {
  const test = new Function('q', 'return (' + src + ')(q)');
  const li = [...document.querySelectorAll('#rail li')].find((l) => test(l.dataset.q || ''));
  if (!li) return { err: 'no entry', rail: [...document.querySelectorAll('#rail li')].map((l) => l.dataset.q) };
  (li.querySelector('button') || li).click();
  return { q: li.dataset.q };
}, test.toString());

/** what the reader has open: its frame, its entry, their boxes, and the mark;
 *  the Elements are kept on the page as `window.__mw` for the identity test */
const READ = (keep) => {
  const frame = document.querySelector('.gshell[data-lineage].open, .sugg.gshell[data-lineage], #band .setupcard.gshell[data-lineage]');
  const lin = frame && frame.dataset.lineage;
  const li = lin ? [...document.querySelectorAll('#rail li[data-lineage]')].find((l) => l.dataset.lineage === lin) : null;
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
  const head = frame && (frame.querySelector('[data-slot="head"]') || frame.querySelector('.clausehead .headclause') || frame.querySelector('.headrule'));
  const tab = frame && frame.querySelector('.achip.active, .achip.on, .clausehead .achip');
  const mk = li && li.querySelector('.mk');
  if (keep) window.__mw = { frame, li };
  return {
    lineage: lin || null, kind: frame && frame.dataset.kind, card: frame && frame.dataset.card,
    label: frame ? ((frame.querySelector('[data-slot="label"]') || {}).textContent || '').trim() : null,
    q: li && li.dataset.q, mark: mk ? String(mk.className) : null,
    li: box(li), head: box(head), tab: box(tab),
    sameFrame: window.__mw ? window.__mw.frame === frame : null,
    sameLi: window.__mw ? window.__mw.li === li : null,
    gliding: !!(frame && (frame.dataset.morphing || frame.style.height)),
    morphs: (window.CARD_SHELL && window.CARD_SHELL.morphs || []).slice(),
  };
};
const read = (page, keep) => page.evaluate(READ, keep);

/** the one assertion, four times */
async function judgeMorph(name, before, decide, page = pc) {
  say(`${name} · open: ${before.lineage} (${before.kind}, “${before.label}”) · entry ${before.q} · mark ${before.mark}`);
  if (!before.lineage || !before.li) { fail(name, `${name}: no open card with a rail entry to watch — ${JSON.stringify(before)}`); return; }
  await decide();
  // the reader's polls: until the mark changes, at most four — a record can
  // reach the view a poll after its race leaves it, and the card reads as §9's
  // `read` card between the two (call E) before it travels on
  let after = null;
  const seen = [];
  for (let i = 0; i < 4; i++) {
    await sleep(4_600); await poll(page); await sleep(900);
    after = await read(page, false);
    seen.push(after.kind);
    if (after.mark !== before.mark) break;
  }
  say(`${name} · now:  ${after.lineage} (${seen.join(' → ')}, “${after.label}”) · entry ${after.q} · mark ${after.mark}`);
  const ok = (what, cond, why) => { if (cond) say('ok   · ' + name + ' · ' + what); else fail(name, name + ' · ' + what + ' — ' + why); };
  ok('the same frame Element', after.sameFrame === true, `frame ${after.sameFrame}`);
  ok('the same entry Element', after.sameLi === true, `entry ${after.sameLi}`);
  ok('the entry moved 0px', JSON.stringify(after.li && after.li.slice(0, 2)) === JSON.stringify(before.li.slice(0, 2)), `${JSON.stringify(before.li)} → ${JSON.stringify(after.li)}`);
  ok('the head moved 0px', !!before.head && JSON.stringify(after.head && after.head.slice(0, 2)) === JSON.stringify(before.head.slice(0, 2)), `${JSON.stringify(before.head)} → ${JSON.stringify(after.head)}`);
  ok('the pressed tab moved 0px', !!before.tab && JSON.stringify(after.tab && after.tab.slice(0, 2)) === JSON.stringify(before.tab.slice(0, 2)), `${JSON.stringify(before.tab)} → ${JSON.stringify(after.tab)}`);
  ok('the mark changed', !!after.mark && after.mark !== before.mark, `${before.mark} → ${after.mark}`);
  const m = after.morphs.slice(before.morphs.length);
  const reduced = page === pcr;
  ok(reduced ? 'the page stepped it: a morph noted under reduced motion, nothing gliding' : 'the page morphed the card under its lineage',
    m.some((x) => x.lineage === before.lineage && x.reduced === reduced) && (!reduced || !after.gliding), JSON.stringify(m) + ' · gliding ' + after.gliding);
  return after;
}

/* ---- 1. a pass, through a park ---------------------------------------------- */
// The Founder keeps the Text's 🛡️ (the `laidDown` list above leaves it), so a
// race that carries parks first (SURFACE E36): C's open pair becomes the
// park's ⏳ card, and when the Founder lets it through, the ✔ record (call A)
if (!ONLY || ONLY === 'pass') {
  const put = await propose(A, 2, 'The society shall meet on the first Wednesday of every month, in the upstairs room, at seven.', 'Tuesdays clash with the choir');
  if (!put || !put.id) die(`A could not propose: ${refused.join(' / ')}`);
  const X = put.id, R = put.raceId;
  const row = await raceOf(B, X);
  await cmdAs(B, 'judge-race', { a: X, b: row.incumbentId, outcome: 'a' });
  await sleep(4_600); await poll(pc); await sleep(800);
  const o = await openEntry(pc, `(q) => q.includes(${JSON.stringify(R)}) && !q.startsWith('rec:')`);
  if (o.err) fail('pass', 'pass: ' + JSON.stringify(o));
  else {
    await sleep(1200);
    const before = await read(pc, true);
    const parked = await judgeMorph('1a pass → park', before, async () => { await cmdAs(D, 'judge-race', { a: X, b: row.incumbentId, outcome: 'a' }); });
    const vA = await viewAs(A);
    const crown = (((vA.view || vA).crownTasks) || []).find((t) => t.text && t.text.candidateId === X);
    if (!crown) fail('pass', '1b · no 👑 question stands for the Founder on the parked race');
    else {
      await read(pc, true);
      await judgeMorph('1b park → record', parked, async () => { await cmdAs(A, 'answer-crown-question', { question: crown.id, outcome: 'accept' }); });
    }
  }
}

/* ---- 2. a fail ------------------------------------------------------------ */
// two refusals of four at a quorum of three: the author's voice and C's
// answer still to come cannot carry it (Q1440), so it closes at the batch
if (!ONLY || ONLY === 'fail') {
  const put = await propose(A, 7, 'The treasurer may spend up to five pounds without asking; anything more goes to a meeting.', 'fifty is a lot');
  if (!put || !put.id) die(`A could not propose a second time: ${refused.join(' / ')}`);
  const Z = put.id, R = put.raceId;
  await sleep(4_600); await poll(pc); await sleep(800);
  const row = await raceOf(B, Z);
  const o = await openEntry(pc, `(q) => q.includes(${JSON.stringify(R)}) && !q.startsWith('rec:')`);
  if (o.err) fail('fail', 'fail: ' + JSON.stringify(o));
  else {
    await sleep(1200);
    const before = await read(pc, true);
    await judgeMorph('2 fail', before, async () => {
      await cmdAs(B, 'judge-race', { a: Z, b: row.incumbentId, outcome: 'b' });
      await cmdAs(D, 'judge-race', { a: Z, b: row.incumbentId, outcome: 'b' });
    });
  }
}

/* ---- 3. a motion ---------------------------------------------------------- */
if (!ONLY || ONLY === 'motion') {
  const moId = await cmdAs(B, 'open-motion', { payload: { kind: 'set', setting: 'rate', value: { grant: 6, cap: 8, dripMinutes: 60 } },
    why: 'one more to start with' });
  if (!moId) die(`B could not put a settings motion: ${refused.join(' / ')}`);
  await sleep(4_600); await poll(pc); await sleep(800);
  const o = await openEntry(pc, `(q) => q === ${JSON.stringify('mo:' + moId)}`);
  if (o.err) fail('motion', 'motion: ' + JSON.stringify(o));
  else {
    await sleep(1200);
    const before = await read(pc, true);
    await judgeMorph('3 motion', before, async () => {
      for (const ck of [A, D]) await voteFor(ck, 'rate', '3 motion');
    });
  }
}

/* ---- 4. an application ------------------------------------------------------ */
if (!ONLY || ONLY === 'application') {
  const knock = await (await post(`/api/d/${SLUG}/apply`, { email: `morph-rowan-${run}@example.org` })).json().catch(() => null);
  if (!knock || !knock.devLink) die(`the door refused the knock: ${JSON.stringify(knock)}`);
  const R = (await followLink(knock.devLink)).cookie;
  const sub = await post(`/api/d/${SLUG}/cmd`, { cmd: 'submit-application', args: { name: 'Rowan Vale' } }, R);
  if (!sub.ok) die(`the application could not be submitted: ${sub.status} ${(await sub.text()).slice(0, 160)}`);
  await sleep(4_600); await poll(pc); await sleep(800);
  const o = await openEntry(pc, `(q) => q.startsWith('adm:') || q.includes('admit:')`);
  if (o.err) fail('application', 'application: ' + JSON.stringify(o));
  else {
    await sleep(1200);
    const before = await read(pc, true);
    const apId = o.q.replace(/^adm:/, '');
    await judgeMorph('4 application', before, async () => {
      for (const ck of [A, B, D]) await voteFor(ck, 'admit:' + apId, '4 application');
    });
  }
}

/* ---- 5. reduced motion ------------------------------------------------------ */
// the same road as 1, read on a page under prefers-reduced-motion: the card
// still stays and becomes the record, and nothing glides (the content steps)
if (!ONLY || ONLY === 'reduced') {
  const put = await propose(A, 3, 'Every meeting opens with the minutes of the last one, read aloud by the secretary.', 'whoever kept them is vague');
  if (!put || !put.id) die(`A could not propose for step 5: ${refused.join(' / ')}`);
  const X = put.id, R = put.raceId;
  const row = await raceOf(B, X);
  await cmdAs(B, 'judge-race', { a: X, b: row.incumbentId, outcome: 'a' });
  await sleep(4_600); await poll(pcr); await sleep(800);
  const o = await openEntry(pcr, `(q) => q.includes(${JSON.stringify(R)}) && !q.startsWith('rec:')`);
  if (o.err) fail('reduced', 'reduced: ' + JSON.stringify(o));
  else {
    await sleep(1200);
    const before = await read(pcr, true);
    await judgeMorph('5 reduced motion', before, async () => { await cmdAs(D, 'judge-race', { a: X, b: row.incumbentId, outcome: 'a' }); }, pcr);
  }
}

/* ---- the verdict ---------------------------------------------------------- */
for (const e of errors) fail('page error', 'page error — ' + e);
for (const r of refused) fail('refused', 'a command was refused — ' + r);
await browser.close();
if (stuck.length) { console.error('morph-walk: ' + stuck.length + ' failure(s)'); process.exit(1); }
say('morph-walk: the open card stays open and morphs into what its item became');
