#!/usr/bin/env node
/**
 * revealed-votes-walk — **the revealed votes drawn on the sealed record**
 * (issue #225, Q996, Ed 2026-10-05: layout (a), faces under each wording;
 * SPEC §3.5a → why: R-146; SURFACE §9's sealed-record row).
 *
 *   npm run revealed-votes-walk -- [http://127.0.0.1:8181]
 *
 * Founds two documents on a dev server, a room of six each, a quorum of
 * three, 👤 *public*:
 *
 *   decision — 👁️ *revealed as each decision is made*. Ana proposes
 *     *Thursday* and Bo *Friday* on one clause; the room votes on both
 *     against the current text and on the two against each other. Before
 *     anything seals no page draws a vote. *Thursday* carries; *Friday*
 *     stays in its race against the new text (R-141), and is refused there.
 *     Asserted on Ana's page, at the card the record opens:
 *       1. *Thursday*'s record: *Preferred to the current text by* Ana (its
 *          author), Cy and Dee under the wording; *Kept by* Eli and Bo under
 *          *Previous text*; *Indifferent:* the unnamed member, *Anonymous*,
 *          under the wording; and no fold — the votes between the two
 *          wordings stay unsaid while *Friday* still runs;
 *       2. *Friday*'s record, once it seals: *Preferred … by* Bo alone, its
 *          author; *Kept by* who refused it; the fold *Votes between the
 *          proposals (2)* — Cy's and Bo's, cast while both ran — one line each,
 *          each wording named by the words it puts in (*‘Thursday’*,
 *          *‘Friday’*);
 *   never — 👁️ *never*: the same room, a record sealed, and nothing drawn
 *     on it and nothing served;
 *   the door — a signed-out reader of the decision document is served no
 *     `revealed` and draws no vote.
 *
 * Needs a dev server (no RESEND_API_KEY: the outbox is read for the links).
 * Red on the page before #225 at 1 (nothing drawn). Joins the sprint tier
 * from its first day (Q1547). Exit 0 when every check passes, 1 on a defect,
 * 2 on a set-up that never got there.
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, sleep, say } from './lib/walk.mjs';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8181');
const die = (m) => { say(`SET-UP · ${m}`); process.exit(2); };
await assertServerBuild(BASE, 'revealed-votes-walk');
const health = await (await fetch(`${BASE}/healthz`)).json();
if (health.devMail !== true) die(`${BASE} is not a dev server`);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);

const fails = [];
const check = (what, ok, detail = '') => {
  say(`${ok ? 'PASS · ' : 'FAIL · '}${what}${detail ? ` · ${detail}` : ''}`);
  if (!ok) fails.push(what);
};

/** a room of six, begun: Ana the founder and a member; Bo, Cy, Dee, Eli named; F unnamed */
async function room(tag, rung) {
  const run = Date.now().toString(36) + tag;
  const refused = [];
  const created = await (await post('/api/docs', { title: `Votes ${run}`, email: `rv-a-${run}@example.org`, isMember: true })).json();
  if (!created.ok || !created.devLink) die(`creation refused: ${JSON.stringify(created)}`);
  const slug = created.slug;
  const S = { A: (await followLink(created.devLink)).cookie };
  const cmd = async (who, name, args = {}) => {
    const r = await post(`/api/d/${slug}/cmd`, { cmd: name, args }, S[who]);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { refused.push(`${who} ${name}: ${r.status} ${JSON.stringify(j).slice(0, 160)}`); return null; }
    return j.result ?? j;
  };
  const view = (who) => fetch(`${BASE}/api/d/${slug}/view`, { headers: who ? { cookie: S[who] } : {} }).then((r) => r.json());
  await cmd('A', 'confirm-starting-text', { text: [`# Votes ${run}`, '## Meetings',
    'The club meets on the first Monday of each month.', 'Minutes are read aloud at the start.'].join('\n') });
  await cmd('A', 'set-convenor-membership', { isMember: true });
  for (const [setting, value] of Object.entries({
    rate: { grant: 5, cap: 8, dripMinutes: 60 }, pace: { shape: 'fixed' }, quorum: { form: 'count', n: 3 },
    authorship: { rung: 'public' }, judgments: { rung }, applications: { apply: false },
    admission: { price: 'pen' }, removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
    lapse: { afterMs: 24 * 3_600_000 }, ending: { endsAtMs: Date.now() + 30 * 86_400_000 }, bar: { pct: 50 },
    chamber: { rung: 'link' },
  })) {
    await (await post(`/api/d/${slug}/cmd`, { cmd: 'reclaim', args: { setting } }, S.A)).text();
    await cmd('A', 'set-setting', { setting, value });
  }
  const names = { B: 'Bo', C: 'Cy', D: 'Dee', E: 'Eli', F: null };
  const mails = Object.fromEntries(Object.keys(names).map((k) => [k, `rv-${k.toLowerCase()}-${run}@example.org`]));
  for (const e of Object.values(mails)) await cmd('A', 'invite', { email: e });
  await cmd('A', 'begin', {});
  const ob = await (await fetch(`${BASE}/api/dev/outbox`)).json();
  for (const [k, e] of Object.entries(mails)) {
    const m = (ob.mails ?? []).find((x) => x.to === e && x.link);
    if (!m) die(`no invitation for ${e} in the dev outbox`);
    S[k] = (await followLink(m.link)).cookie;
  }
  await cmd('A', 'set-identity', { name: 'Ana' });
  for (const [k, n] of Object.entries(names)) if (n) await cmd(k, 'set-identity', { name: n });
  if (refused.length) die(`${tag}: the room could not be set up: ${refused.join(' / ')}`);
  const lines = String((await view('A')).text).split('\n');
  const propose = async (who, text) => {
    const v = await view(who);
    return cmd(who, 'propose-text', { baseVersion: v.textVersion,
      hunks: [{ start: 2, end: 3, lines: [text], was: [lines[2]] }], why: 'Mondays clash with the choir' });
  };
  const vote = (who, a, b, outcome) => cmd(who, 'judge-race', { a, b, outcome });
  const incOf = async (cand) => ((await view('C')).clauses || []).find((c) => (c.candidates || []).some((x) => x.id === cand))?.incumbentId;
  const recOf = async (cand, who = 'A') => ((await view(who)).records || []).find((r) => r.field.some((f) => f.candidateId === cand && f.outcome !== 'live'));
  return { slug, S, cmd, view, propose, vote, incOf, recOf, refused };
}

/* ---- the pages ------------------------------------------------------------ */
const browser = await chromium.launch();
const errors = [];
async function seat(slug, cookie, label) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  if (cookie) {
    const [name, ...rest] = cookie.split('=');
    await ctx.addCookies([{ name, value: rest.join('='), url: BASE }]);
  }
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  if (cookie) {
    const me = (await (await fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie } })).json()).me || '';
    await page.addInitScript(([s, m]) => {
      try { localStorage.setItem('draft:grants:' + s + ':' + m,
        JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge'])); } catch { /* none */ }
    }, [slug, me]);
  }
  await page.goto(`${BASE}/d/${slug}`);
  await page.waitForSelector('#rail', { timeout: 20_000 });
  await sleep(1500);
  return page;
}
const refresh = async (page) => { await page.evaluate(() => (window.__poll ? window.__poll({ force: true }) : null)); await sleep(900); };
/** every vote line and fold the page draws, anywhere */
const drawn = (page) => page.evaluate(() => document.querySelectorAll('.votes, .votefold').length);
/** open a record's card and read what stands under each of its blocks */
const readRecord = (page, raceId) => page.evaluate(async (id) => {
  const S = window.SESSION;
  S.smoothScrollBy = (dy, done) => { window.scrollBy(0, dy); if (done) done(); };
  if (!S.SUGGS.some((g) => g.id === id)) return { missing: S.SUGGS.filter((g) => g.state === 'sealed').map((g) => g.id) };
  S.toggle(id, true);
  await new Promise((ok) => setTimeout(ok, 1400));
  const card = document.querySelector('.sugg[data-card="' + CSS.escape(id) + '"]');
  if (!card) return { missing: 'no card drawn' };
  const line = (el, kind) => { const v = el.querySelector('.votes[data-votes="' + kind + '"]'); return v ? [...v.querySelectorAll('.vname')].map((n) => n.textContent) : []; };
  const blocks = [...card.querySelectorAll('[data-slot="block"]')].map((b) => ({
    label: (b.querySelector('.glab') || {}).textContent,
    preferred: line(b, 'preferred'), kept: line(b, 'kept'), indifferent: line(b, 'indifferent') }));
  // the head: everything in the card before the blocks slot
  const head = document.createElement('div');
  for (const n of card.children) { if (n.matches('[data-slot="blocks"]')) break; head.appendChild(n.cloneNode(true)); }
  const fold = card.querySelector('.votefold');
  return {
    label: (card.querySelector('.glab') || {}).textContent,
    head: { preferred: line(head, 'preferred'), kept: line(head, 'kept'), indifferent: line(head, 'indifferent') },
    blocks,
    fold: fold ? { summary: fold.querySelector('summary').textContent, lines: [...fold.querySelectorAll('li')].map((l) => l.textContent) } : null,
    faces: card.querySelectorAll('.votes .voter .av, .votes .voter .emojiface').length,
  };
}, raceId);
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

/* ---- decision ------------------------------------------------------------- */
const D = await room('d', 'decision');
const X = await D.propose('A', 'The club meets on the first Thursday of each month.');
const Y = await D.propose('B', 'The club meets on the first Friday of each month.');
if (!X?.id || !Y?.id) die(`decision: the proposals were refused: ${D.refused.join(' / ')}`);
const inc0 = await D.incOf(X.id);
if (!inc0) die('decision: the proposal reached no race');
const pa = await seat(D.slug, D.S.A, 'Ana');
// votes on a race still running: none drawn, none served
await D.vote('C', X.id, inc0, 'a');
await D.vote('C', X.id, Y.id, 'a');
await D.vote('B', Y.id, X.id, 'a');
await D.vote('D', Y.id, inc0, 'b');
await D.vote('E', X.id, inc0, 'b');
await D.vote('F', X.id, inc0, 'tie');
await D.vote('B', X.id, inc0, 'b');
await refresh(pa);
const running = await D.view('A');
check('a running race: nothing served', !JSON.stringify(running).includes('"revealed"'));
check('a running race: no vote drawn on any card', (await drawn(pa)) === 0);
// Thursday carries: Dee's vote meets the quorum
await refresh(pa);
check('a running race, many votes in: still nothing drawn', (await drawn(pa)) === 0);
await D.vote('D', X.id, inc0, 'a');
// Thursday leads on every pair it waits on once enough of the room has
// weighed Friday against the text too: those votes go in one at a time
// until it carries
for (const who of ['A', 'E', 'F']) {
  if (await D.recOf(X.id)) break;
  await D.vote(who, Y.id, inc0, 'b');
}
const recX = await D.recOf(X.id);
if (!recX || recX.outcome !== 'adopted') die(`decision: Thursday did not carry: ${JSON.stringify(recX)} · ${D.refused.join(' / ')}`);
const yLive = ((await D.view('A')).clauses || []).some((c) => (c.candidates || []).some((x) => x.id === Y.id));
say(`decision · /d/${D.slug} · Thursday adopted · Friday ${yLive ? 'still running against the new text' : 'sealed with it'}`);
await refresh(pa);
const r1 = await readRecord(pa, 'rec:' + recX.raceId);
if (r1.missing) die(`decision: Thursday's record is not on Ana's page: ${JSON.stringify(r1.missing)}`);
say('     ' + JSON.stringify(r1));
check('1 · Thursday: Preferred to the current text by Ana (its author), Cy, Dee — under the wording',
  same(r1.head.preferred, ['Ana', 'Cy', 'Dee']), JSON.stringify(r1.head.preferred));
check('1 · Thursday: Indifferent: Anonymous — under the wording', same(r1.head.indifferent, ['Anonymous']), JSON.stringify(r1.head.indifferent));
const prev1 = r1.blocks.find((b) => b.label === 'Previous text');
check('1 · Thursday: Kept by Eli and Bo — under Previous text', !!prev1 && same(prev1.kept, ['Eli', 'Bo']), JSON.stringify(prev1));
check('1 · Thursday: nothing kept under the wording, nothing preferred under Previous text',
  r1.head.kept.length === 0 && !!prev1 && prev1.preferred.length === 0 && prev1.indifferent.length === 0);
check('1 · every person drawn wears a face', r1.faces === 6, `${r1.faces} faces`);
check('1 · no fold while Friday still runs', r1.fold === null, JSON.stringify(r1.fold));
// Friday, refused against the new text
const inc1 = await D.incOf(Y.id);
if (!yLive) die('decision: Friday closed with Thursday, so nothing shows the fold waiting for it');
// refused by three who cast no vote between the two wordings
const keptY = ['Dee'];
for (const [who, name] of [['A', 'Ana'], ['E', 'Eli'], ['F', 'Anonymous']]) {
  if (await D.recOf(Y.id)) break;
  if (await D.vote(who, Y.id, inc1, 'b')) keptY.push(name);
}
const recY = await D.recOf(Y.id);
if (!recY) die(`decision: Friday never sealed: ${D.refused.join(' / ')}`);
await refresh(pa);
const r2 = await readRecord(pa, 'rec:' + recY.raceId);
if (r2.missing) die(`decision: Friday's record is not on Ana's page: ${JSON.stringify(r2.missing)}`);
say('     ' + JSON.stringify(r2));
const fri = r2.blocks.find((b) => b.label !== 'Previous text') || { preferred: [] };
const friPref = r2.head.preferred.length ? r2.head.preferred : fri.preferred;
check('2 · Friday: Preferred to the current text by Bo alone, its author', same(friPref, ['Bo']), JSON.stringify(friPref));
check('2 · Friday: Kept by ' + keptY.join(', ') + ' — under the text that stood, its head', same(r2.head.kept, keptY), JSON.stringify(r2.head.kept));
check('2 · Friday: the fold reads Votes between the proposals (2)', !!r2.fold && r2.fold.summary === 'Votes between the proposals (2)' && r2.fold.lines.length === 2,
  JSON.stringify(r2.fold && r2.fold.summary));
const want = ['Cy preferred ‘Thursday’ to ‘Friday’', 'Bo preferred ‘Friday’ to ‘Thursday’'];
check('2 · one line per vote, each wording named by the words it puts in', !!r2.fold && same(r2.fold.lines, want), JSON.stringify(r2.fold && r2.fold.lines));
check('1 · Thursday\'s record carries no fold once Friday seals either', (await readRecord(pa, 'rec:' + recX.raceId)).fold === null);

/* ---- the door -------------------------------------------------------------- */
const door = await (await fetch(`${BASE}/api/d/${D.slug}/view`)).json();
check('the door: a stranger is served no revealed vote', !JSON.stringify(door).includes('"revealed"'));
const ps = await seat(D.slug, null, 'stranger');
check('the door: a stranger\'s page draws no vote', (await drawn(ps)) === 0);

/* ---- never ------------------------------------------------------------------ */
const N = await room('n', 'never');
const NX = await N.propose('A', 'The club meets on the first Thursday of each month.');
if (!NX?.id) die(`never: the proposal was refused: ${N.refused.join(' / ')}`);
const ninc = await N.incOf(NX.id);
await N.vote('C', NX.id, ninc, 'a');
await N.vote('E', NX.id, ninc, 'b');
await N.vote('D', NX.id, ninc, 'a');
const recN = await N.recOf(NX.id);
if (!recN || recN.outcome !== 'adopted') die(`never: the proposal did not carry: ${JSON.stringify(recN)}`);
check('never: the record is served no revealed vote', !JSON.stringify(await N.view('A')).includes('"revealed"'));
const pn = await seat(N.slug, N.S.A, 'Ana (never)');
const rn = await readRecord(pn, 'rec:' + recN.raceId);
check('never: the record\'s card draws no vote and no fold', !rn.missing && rn.faces === 0 && rn.fold === null && (await drawn(pn)) === 0, JSON.stringify(rn));

check('the pages threw nothing', errors.length === 0, errors.slice(0, 3).join(' | '));
check('no command was refused', D.refused.length + N.refused.length === 0, D.refused.concat(N.refused).join(' / '));
await browser.close();
say(fails.length ? `\n✗ ${fails.length} failed: ${fails.join('; ')}` : '\n✓ the revealed votes are drawn where 👁️ reveals them, and nowhere else');
process.exit(fails.length ? 1 : 0);
