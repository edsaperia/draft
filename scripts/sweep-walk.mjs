#!/usr/bin/env node
/**
 * sweep-walk — **the queue card wash sweep transition** (`wash-sweep`,
 * `mark-stamp`; SWEEP.md §2, Q1571, Ed 2026-09-30).
 *
 *   npm run sweep-walk -- [http://127.0.0.1:8140] [--render=replace]
 *
 * Founds a document on a dev server, begins it and seats four members at
 * 1600 — A, B and C, and D under reduced motion — then drives votes over the
 * wire (a quorum of three, so one vote leaves a race live) and reads what each
 * page's rail played, two ways at once: the page's own instrument
 * (`SESSION.sweeps`, what `playSweeps` decided) and a sampler on each page
 * reading `document.getAnimations({ subtree: true })` every 40 ms, so the Web
 * Animations the rail ran — their targets and their keyframes — are what is
 * asserted, not what the page says it meant.
 *
 *   1. A proposes; B votes for it → within two polls A's pinned entry plays
 *      one sweep, its keyframes x → 100 → 0 → x′, rightward only, and so does
 *      the race's entry on C's rail (1571.2);
 *   2. B revises the same vote → the bar does not move and the entry sweeps
 *      all the same (1571.1: the tick, not the fill);
 *   3. B and C vote inside one poll → one sweep per entry, never two;
 *   4. the race carries → A's record arrives with the pass ending, x → full,
 *      ✔ stamping on the glyph's transform alone, the mark's box unmoved;
 *   5. A proposes again; B and C refuse → the proposal is dominated (Q1440)
 *      and A's early ✖ arrives with the fail ending, x → full → empty;
 *   6. under `prefers-reduced-motion` (a fourth seat) no width keyframe is
 *      played: the fill steps and the leading edge brightens;
 *   7. B puts an ordinary settings motion (⏱️) and C votes on it → the
 *      motion's entry in A's rail — the band's own — sweeps on the vote
 *      (1573.5: every vote on every race in your rail).
 *
 * Under `--render=replace` the node is replaced on every render, so the
 * animations are printed and not asserted (stage 9's comparison switch).
 * Needs a dev server (no RESEND_API_KEY: the outbox is read for the links).
 * Red on the page before this walk's build at 1 (no animation at all).
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, sleep, say } from './lib/walk.mjs';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';

const argv = process.argv.slice(2);
const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
const MODE = (argv.find((a) => a.startsWith('--render=')) || '').slice(9) || 'patch';
const QUERY = MODE === 'replace' ? '?render=replace' : '';
const die = (m) => { console.error(`sweep-walk: ${m}`); process.exit(2); };

await assertServerBuild(BASE, 'sweep-walk');
const health = await (await fetch(`${BASE}/healthz`)).json();
if (health.devMail !== true) die(`${BASE} is not a dev server`);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);
const run = Date.now().toString(36);
const stuck = [];
const fail = (what, why) => { say('FAIL: ' + why); stuck.push(what); };
const refused = [];

/* ---- the document -------------------------------------------------------- */
const founderEmail = `sweep-a-${run}@example.org`;
const created = await (await post('/api/docs', { title: `Sweep ${run}`, email: founderEmail, isMember: true })).json();
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
  `# Sweep ${run}`, '## Meetings',
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
  // a quorum of three in a room of four: the author's own voice and one vote
  // leave a race live (step 1), a second vote carries it (step 4), and two
  // refusals of four close a proposal no answer still to come could carry
  // (step 5, Q1440: a + w = 2 ≤ o = 2)
  rate: { grant: 5, cap: 8, dripMinutes: 60 }, pace: { shape: 'fixed' }, quorum: { form: 'count', n: 3 },
  authorship: { rung: 'public' }, judgments: { rung: 'after' }, applications: { apply: false },
  admission: { price: 'pen' }, removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
  lapse: { afterMs: 24 * 3_600_000 }, ending: { endsAtMs: Date.now() + 30 * 86_400_000 }, bar: { pct: 50 },
  chamber: { rung: 'link' },
})) {
  await (await post(`/api/d/${SLUG}/cmd`, { cmd: 'reclaim', args: { setting } }, A)).text();
  await cmdAs(A, 'set-setting', { setting, value });
}
const seats = { B: `sweep-b-${run}@example.org`, C: `sweep-c-${run}@example.org`, D: `sweep-d-${run}@example.org` };
for (const e of Object.values(seats)) await cmdAs(A, 'invite', { email: e });
await cmdAs(A, 'begin', {});
if (refused.length) die(`the document could not be set up: ${refused.join(' / ')}`);
say(`founded ${BASE}/d/${SLUG} — begun, three members invited (a room of four, quorum three)`);

const linkFor = async (to) => {
  const t = await (await fetch(`${BASE}/api/dev/outbox`)).json();
  const m = (t.mails ?? []).find((x) => x.to === to && x.link);
  if (!m) die(`no invitation for ${to} in the dev outbox`);
  return m.link;
};
const cookieOf = async (email) => (await followLink(await linkFor(email))).cookie;
const B = await cookieOf(seats.B), C = await cookieOf(seats.C), D = await cookieOf(seats.D);

/* ---- the pages ----------------------------------------------------------- */
const browser = await chromium.launch();
const errors = [];
// the sampler: every animation the page runs on a rail entry's bar (`::before`)
// or on a mark's glyph (`.mk`), noted once with its target entry and keyframes
const SAMPLER = () => {
  const seen = new WeakSet();
  window.__anims = [];
  setInterval(() => {
    let list = [];
    try { list = document.getAnimations({ subtree: true }); } catch { return; }
    for (const a of list) {
      if (seen.has(a) || !a.effect) continue;
      const t = a.effect.target;
      if (!t || !t.closest) continue;
      const li = t.closest('#rail li');
      if (!li) continue;
      const pseudo = a.effect.pseudoElement || null;
      const isMark = !pseudo && t.classList && (t.classList.contains('mk') || !!t.closest('.qmark'));
      if (!pseudo && !isMark) continue;
      seen.add(a);
      let kf = [];
      try { kf = a.effect.getKeyframes().map((k) => ({ o: k.computedOffset, w: k.width, s: k.boxShadow, x: k.transform })); } catch { /* none */ }
      window.__anims.push({ q: li.dataset.q, pseudo, mark: isMark, kf,
        box: (() => { const m = li.querySelector('.qmark'); if (!m) return null; const r = m.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })(),
        t: Date.now() });
    }
  }, 40);
};
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
  await page.addInitScript(SAMPLER);
  await page.goto(`${BASE}/d/${SLUG}${QUERY}`);
  await page.waitForSelector('#rail', { timeout: 20_000 });
  await sleep(1500);
  return page;
};
const pa = await seat(A, 'A'), pb = await seat(B, 'B'), pc = await seat(C, 'C');
const pd = await seat(D, 'D', { reducedMotion: 'reduce' });
const PAGES = { A: pa, B: pb, C: pc, D: pd };

/* ---- the reads ----------------------------------------------------------- */
const poll = (page) => page.evaluate(() => (window.__poll ? window.__poll({ force: true }) : 'no seam'));
const pollAll = async () => { for (const p of Object.values(PAGES)) await poll(p); await sleep(400); };
const sweepsOf = (page) => page.evaluate(() => (window.SESSION && window.SESSION.sweeps) ? window.SESSION.sweeps.slice() : []);
const animsOf = (page) => page.evaluate(() => (window.__anims || []).slice());
const counts = async () => {
  const out = {};
  for (const [k, p] of Object.entries(PAGES)) out[k] = { s: (await sweepsOf(p)).length, a: (await animsOf(p)).length };
  return out;
};
// wait until a page's sweeps grew past `n`, at most `ms` (two polls and change)
const grew = async (page, n, ms = 9_500) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if ((await sweepsOf(page)).length > n) return true; await sleep(120); }
  return false;
};
const widths = (anim) => anim.kf.map((k) => k.w).filter((w) => w != null);
const pct = (w) => Number(String(w).replace('%', ''));
const rightward = (ws) => ws.every((w, i) => i === 0 || pct(w) >= pct(ws[i - 1]) || pct(w) === 0);
const sweepShape = (ws, from, to) => ws.length === 4 && pct(ws[0]) === from && pct(ws[1]) === 100 && pct(ws[2]) === 0 && pct(ws[3]) === to;
const barAnimsFor = (anims, test) => anims.filter((a) => a.pseudo === '::before' && widths(a).length && test(a.q));
const markAnimsFor = (anims, test) => anims.filter((a) => a.mark && test(a.q));
const assertOrPrint = (what, ok, why) => {
  if (ok) say('ok   · ' + what);
  else if (MODE === 'replace') say('note · ' + what + ' — ' + why + ' (replace mode: printed, not asserted)');
  else fail(what, what + ' — ' + why);
};

// a line nothing is racing on yet
const v0 = await viewAs(A);
const lines = String(v0.text || '').split('\n');
const propose = async (cookie, at, text, why) => {
  const v = await viewAs(cookie);
  return cmdAs(cookie, 'propose-text', { baseVersion: v.textVersion,
    hunks: [{ start: at, end: at + 1, lines: [text], was: [lines[at]] }], why });
};

/* ---- 1. a vote lands: A's pinned entry and C's pair entry sweep ---------- */
const put1 = await propose(A, 2, 'The society shall meet on the first Wednesday of every month, in the upstairs room, at seven.', 'Tuesdays clash with the choir');
if (!put1 || !put1.id) die(`A could not propose: ${refused.join(' / ')}`);
const X = put1.id, R = put1.raceId;
await sleep(4_600); await pollAll();           // the proposal reaches every rail
const raceRow = (v0b) => (v0b.clauses || []).find((c) => (c.candidates || []).some((x) => x.id === X));
const inc = raceRow(await viewAs(B));
if (!inc) die('the proposal reached no race in B\'s view');
const fillBefore = Math.round((inc.closeness || 0) * 100);
const c1 = await counts();
await cmdAs(B, 'judge-race', { a: X, b: inc.incumbentId, outcome: 'a' });
await sleep(4_600); await pollAll();
const grewA = await grew(pa, c1.A.s), grewC = await grew(pc, c1.C.s);
const sa1 = (await sweepsOf(pa)).slice(c1.A.s), sc1 = (await sweepsOf(pc)).slice(c1.C.s);
const aa1 = (await animsOf(pa)).slice(c1.A.a), ac1 = (await animsOf(pc)).slice(c1.C.a);
const mineKey = (q) => q && q.includes(X);
const raceKey = (q) => q && q.includes(R);
const aBar = barAnimsFor(aa1, mineKey), cBar = barAnimsFor(ac1, raceKey);
assertOrPrint('1 · B votes: A\'s pinned entry plays one sweep', grewA && sa1.filter((s) => s.kind === 'vote').length === 1 && aBar.length === 1,
  `sweeps ${JSON.stringify(sa1)} · bar animations ${aBar.length}`);
if (aBar.length) {
  const ws = widths(aBar[0]);
  assertOrPrint('1 · its keyframes run x → 100 → 0 → x′, rightward only', sweepShape(ws, sa1[0] ? sa1[0].from : -1, sa1[0] ? sa1[0].to : -1) && rightward(ws), JSON.stringify(ws));
  say('     x ' + (sa1[0] ? sa1[0].from : '?') + ' → x′ ' + (sa1[0] ? sa1[0].to : '?') + ' (the bar read ' + fillBefore + ' before the vote)');
}
assertOrPrint('1 · the race\'s entry on C\'s rail sweeps too (1571.2)', grewC && sc1.some((s) => s.kind === 'vote' && raceKey(s.key)) && cBar.length >= 1,
  `sweeps ${JSON.stringify(sc1)} · bar animations ${cBar.length}`);
const bSweeps = (await sweepsOf(pb)).slice(c1.B.s).filter((s) => s.kind === 'vote');
say('     B\'s own rail: ' + bSweeps.length + ' sweep(s) on its own vote (its entry filed ⏳: ' + ((await animsOf(pb)).slice(c1.B.a).some((a) => a.mark) ? 'stamped' : 'no stamp') + ')');

/* ---- 2. a vote that does not move the bar still sweeps (1571.1) ---------- */
const c2 = await counts();
const fill2 = Math.round(((raceRow(await viewAs(A)) || {}).closeness || 0) * 100);
await cmdAs(B, 'judge-race', { a: X, b: inc.incumbentId, outcome: 'a' });   // the same judgment again: a revision
await sleep(4_600); await pollAll();
const grewA2 = await grew(pa, c2.A.s);
const sa2 = (await sweepsOf(pa)).slice(c2.A.s).filter((s) => s.kind === 'vote');
const fill2b = Math.round(((raceRow(await viewAs(A)) || {}).closeness || 0) * 100);
assertOrPrint('2 · B revises the same vote: the bar stays at ' + fill2 + ' and A\'s entry sweeps on the tick', grewA2 && sa2.length === 1 && fill2 === fill2b && sa2[0].from === sa2[0].to,
  `fill ${fill2} → ${fill2b} · sweeps ${JSON.stringify(sa2)}`);

/* ---- 3. two votes inside one poll make one sweep ------------------------- */
// the race's second vote carries it (quorum 2) — so the aggregation is read on
// a fresh proposal that two refusals will not yet close
const put3 = await propose(A, 6, 'Subscriptions are due in February and are the same for every member, whatever their means.', 'January is too soon after Christmas');
if (!put3 || !put3.id) die(`A could not propose a second time: ${refused.join(' / ')}`);
const Y = put3.id;
await sleep(4_600); await pollAll();
const rowY = ((await viewAs(B)).clauses || []).find((c) => (c.candidates || []).some((x) => x.id === Y));
if (!rowY) die('the second proposal reached no race');
for (const p of Object.values(PAGES)) await p.evaluate(() => { window.__pollPaused = true; });
const c3 = await counts();
await cmdAs(B, 'judge-race', { a: Y, b: rowY.incumbentId, outcome: 'b' });   // B keeps the text
await cmdAs(C, 'judge-race', { a: Y, b: rowY.incumbentId, outcome: 'a' });   // C prefers Y: a + w = 3 against o = 1, still live
await sleep(300);
for (const p of Object.values(PAGES)) await p.evaluate(() => { window.__pollPaused = false; });
// the page's own tick fetches both votes in one answer; wait for it
await grew(pa, c3.A.s); await poll(pa); await sleep(600);
const sa3 = (await sweepsOf(pa)).slice(c3.A.s).filter((s) => s.kind === 'vote' && s.key.includes(Y));
const aa3 = barAnimsFor((await animsOf(pa)).slice(c3.A.a), (q) => q && q.includes(Y));
assertOrPrint('3 · B and C vote inside one poll: one sweep on A\'s entry, not two', sa3.length === 1 && aa3.length === 1,
  `sweeps ${JSON.stringify(sa3)} · bar animations ${aa3.length}`);

/* ---- 4. the race carries: the pass ending and the ✔ stamp ---------------- */
const c4 = await counts();
const markBoxBefore = await pa.evaluate((x) => { const li = [...document.querySelectorAll('#rail li')].find((l) => (l.dataset.q || '').includes(x)); const m = li && li.querySelector('.qmark'); if (!m) return null; const r = m.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }, X);
await cmdAs(C, 'judge-race', { a: X, b: inc.incumbentId, outcome: 'a' });   // the seconder: X meets its floor of two
await sleep(4_600); await pollAll();
await grew(pa, c4.A.s);
const sa4 = (await sweepsOf(pa)).slice(c4.A.s);
const pass = sa4.find((s) => s.kind === 'pass');
const aa4 = (await animsOf(pa)).slice(c4.A.a);
const recBar = barAnimsFor(aa4, (q) => q && q.startsWith('rec:'));
const recMark = markAnimsFor(aa4, (q) => q && q.startsWith('rec:'));
const recState = await pa.evaluate(() => { const li = [...document.querySelectorAll('#rail li')].find((l) => (l.dataset.q || '').startsWith('rec:')); return li ? { q: li.dataset.q, mark: (li.querySelector('.mk') || {}).className || null } : null; });
assertOrPrint('4 · the race carries: A\'s record arrives with the pass ending (x → full and stays)', !!pass && recBar.length >= 1 && recBar.some((a) => { const ws = widths(a); return ws.length === 2 && pct(ws[1]) === 100 && pct(ws[0]) === pass.from; }),
  `sweeps ${JSON.stringify(sa4)} · bar animations ${JSON.stringify(recBar.map(widths))}`);
assertOrPrint('4 · ✔ stamps on the glyph\'s transform', recMark.length >= 1 && recMark.every((a) => a.kf.some((k) => k.x && /scale/.test(k.x))) && /mk-(adopted|filedYes)/.test((recState || {}).mark || ''),
  `mark animations ${JSON.stringify(recMark.map((a) => a.kf))} · mark ${JSON.stringify(recState)}`);
if (recMark.length && recMark[0].box) {
  await sleep(600);
  const boxAfter = await pa.evaluate((q) => { const li = [...document.querySelectorAll('#rail li')].find((l) => l.dataset.q === q); const m = li && li.querySelector('.qmark'); if (!m) return null; const r = m.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }, recMark[0].q);
  assertOrPrint('4 · the stamp moves no box: the mark\'s box is the same during and after it', JSON.stringify(boxAfter) === JSON.stringify(recMark[0].box),
    `during ${JSON.stringify(recMark[0].box)} · after ${JSON.stringify(boxAfter)}`);
  say('     (the pinned entry\'s mark stood at ' + JSON.stringify(markBoxBefore) + '; the record is its own entry at its clause)');
}

/* ---- 5. a dominated proposal: the fail ending and the ✖ stamp ------------ */
// B kept the text on Y in step 3; A's own voice and C's approval stand against
// one refusal. A third proposal nobody approves is the clean case: two
// refusals of three with a quorum of two, and no answer still to come could
// carry it (Q1440) — it retires at the batch and A is owed its early ✖.
const put5 = await propose(A, 7, 'The treasurer may spend up to five pounds without asking; anything more goes to a meeting.', 'fifty is a lot');
if (!put5 || !put5.id) die(`A could not propose a third time: ${refused.join(' / ')}`);
const Z = put5.id;
await sleep(4_600); await pollAll();
const rowZ = ((await viewAs(B)).clauses || []).find((c) => (c.candidates || []).some((x) => x.id === Z));
if (!rowZ) die('the third proposal reached no race');
const c5 = await counts();
await cmdAs(B, 'judge-race', { a: Z, b: rowZ.incumbentId, outcome: 'b' });
await cmdAs(C, 'judge-race', { a: Z, b: rowZ.incumbentId, outcome: 'b' });
await sleep(4_600); await pollAll();
await grew(pa, c5.A.s);
const sa5 = (await sweepsOf(pa)).slice(c5.A.s);
const failS = sa5.find((s) => s.kind === 'fail');
const aa5 = (await animsOf(pa)).slice(c5.A.a);
const earlyBar = barAnimsFor(aa5, (q) => q && q.includes(Z));
const earlyMark = markAnimsFor(aa5, (q) => q && q.includes(Z));
const mineZ = ((await viewAs(A)).mine || []).find((m) => m.id === Z);
assertOrPrint('5 · a dominated proposal: A\'s early ✖ arrives with the fail ending (x → full → empty, and stays)',
  !!failS && earlyBar.some((a) => { const ws = widths(a); return ws.length === 3 && pct(ws[1]) === 100 && pct(ws[2]) === 0 && rightward(ws.slice(0, 2)); }) && earlyMark.length >= 1,
  `state ${JSON.stringify(mineZ && mineZ.state)} · sweeps ${JSON.stringify(sa5)} · bar ${JSON.stringify(earlyBar.map(widths))} · marks ${earlyMark.length}`);

/* ---- 6. reduced motion: no width keyframe anywhere ----------------------- */
const ad = await animsOf(pd);
const dWidths = ad.filter((a) => a.pseudo === '::before' && widths(a).length);
const dMarks = ad.filter((a) => a.mark);
const dSweeps = await sweepsOf(pd);
assertOrPrint('6 · under prefers-reduced-motion the fill steps: no width keyframe and no stamp, the edge brightens', dWidths.length === 0 && dMarks.length === 0 && dSweeps.length > 0 && ad.some((a) => a.pseudo === '::before' && a.kf.some((k) => k.s)),
  `width animations ${dWidths.length} · mark animations ${dMarks.length} · sweeps noted ${dSweeps.length} · edge animations ${ad.filter((a) => a.kf.some((k) => k.s)).length}`);

/* ---- 7. a settings motion's entry sweeps too (1573.5) -------------------- */
const c7 = await counts();
const moId = await cmdAs(B, 'open-motion', { payload: { kind: 'set', setting: 'rate', value: { grant: 6, cap: 8, dripMinutes: 60 } },
  why: 'one more to start with' });
if (!moId) die(`B could not put a settings motion: ${refused.join(' / ')}`);
await sleep(4_600); await pollAll();
const moCard = ((await viewAs(C)).raceCards || []).find((c) => c.kind === 'edge' &&
  /rate/.test(String(((c.a && c.a.setting) || (c.b && c.b.setting) || {}).settingId || '')));
if (!moCard) fail('7 · setting card', '7 · C was served no card on the ⏱️ motion');
else {
  await cmdAs(C, 'judge-race', { a: moCard.a.id, b: moCard.b.id, outcome: moCard.a.incumbent ? 'b' : 'a' });
  await sleep(4_600); await pollAll();
  await grew(pa, c7.A.s);
  const sa7 = (await sweepsOf(pa)).slice(c7.A.s);
  const aa7 = (await animsOf(pa)).slice(c7.A.a);
  const moKey = (q) => q === 'mo:' + moId;
  const moBar = barAnimsFor(aa7, moKey);
  const railA = await pa.evaluate((id) => {
    const li = document.querySelector('#rail li[data-q="mo:' + id + '"]');
    return { entries: [...document.querySelectorAll('#rail li')].map((l) => l.dataset.q), mo: li ? (li.querySelector('button') || {}).getAttribute('style') : null };
  }, moId);
  assertOrPrint('7 · a settings motion\'s entry in A\'s rail sweeps on C\'s vote (the band\'s own entry)',
    sa7.some((s) => s.key === 'q:mo:' + moId + ':' && (s.kind === 'vote' || s.kind === 'pass')) && moBar.length >= 1 && moBar.every((a) => rightward(widths(a))),
    `sweeps ${JSON.stringify(sa7)} · bar ${JSON.stringify(moBar.map(widths))} · A's rail ${JSON.stringify(railA)}`);
}

/* ---- the verdict ---------------------------------------------------------- */
say('every sweep A\'s rail played: ' + JSON.stringify((await sweepsOf(pa)).map((s) => s.kind + (s.from != null ? ' ' + s.from + '→' + (s.to ?? '') : ''))));
for (const e of errors) fail('page error', 'page error — ' + e);
for (const r of refused) fail('refused', 'a command was refused — ' + r);
await browser.close();
if (stuck.length) { console.error('sweep-walk: ' + stuck.length + ' failure(s)'); process.exit(1); }
say('sweep-walk: the wash sweeps on every vote in the rail, and the mark stamps');
