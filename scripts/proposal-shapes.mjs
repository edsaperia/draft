/**
 * proposal-shapes.mjs — one proposal of every shape, and then every seat's
 * page read back against what was proposed.
 *
 * Every proposal-display defect of the last fortnight was found by eye, in a
 * bot room, by Ed: a gap race filed beside the clause after it (Q1308), a
 * race wearing its tab twice (Q1379), markdown printed as source (Q1368), a
 * multi-block clause read as one paragraph (Q1406), a one-line proviso
 * drawing the whole document at its head (Q1407), a whole-document rewrite
 * wearing a tab beside every clause (Q1408). Each was a *shape* of proposal —
 * a gap, a merge, a deletion, a heading, a two-site patch — that no walk had
 * ever made. So this walk makes one proposal of each shape through the real
 * API, and then opens every seat's page and asserts what the document draws.
 *
 * It is the generator and the oracle: the shapes are enumerated here rather
 * than waited for, and the invariants are asked of the DOM the page actually
 * draws — the tabs in the gutter, the entries in the rail, the blocks the
 * open card swallows, the text in the head and in the lanes.
 *
 *   PORT=8171 DRAFT_DATA_DIR=/tmp/shapes DRAFT_COOLDOWN_MS=0 npm run server
 *   node scripts/proposal-shapes.mjs [<base-url>] [--out=<file>] [--shots=<dir>]
 *
 * **The cooldown must be 0** and the walk refuses a server where it is not:
 * phase 1b adopts an insertion above the title and then re-reads every other
 * item's tab, which no walk can sit a five-minute cooldown out for.
 *
 * The invariants, and what each traces to:
 *
 *   I1  tabs, closed   — one tab per site, at the site's first block
 *                        (Q1408, session.js `tabKeysOf`); a gap site stands
 *                        on its own 30px `.insert-anchor` (Q261, Q1311, M19).
 *   I2  rail           — one entry per site, titled (session.js
 *                        `queueEntries`); **at 390 the drawer holds only what
 *                        asks you** (MOBILE.md Status), so it is recorded and
 *                        not asserted there.
 *   I3  open           — the card swallows exactly its run and nothing else
 *                        (Q1407, `swallowOpen`); no tab of its own outside it
 *                        (Q1379, P10); a gap item's held-open anchor is gone.
 *   I4  head           — the head is the run's current blocks, one `.lp` each
 *                        (Q1406, Q1308); a gap head is `(no text here)`
 *                        (Q1379).
 *   I5  lanes          — each lane is its own candidate's reading of the
 *                        pair's own span (Q1407), rendered not printed
 *                        (Q1368, Q1403, Q1406).
 *   I6  close          — closing restores the closed state exactly (M17).
 *   I7  label          — the rail entry is titled by the nearest heading above
 *                        the site (live.js `labelFor`).
 *
 * **No rule** — recorded, never failed, and marked `unruled` in the payload:
 * what a deletion's card draws (C6); what a gap at the very start is titled
 * (C3 — there is no heading above it); I2 at 390 (the drawer holds only what
 * asks you); what a record's field looks like (I5 on a sealed item); the
 * sections a two-site patch folds between its sites (I3-else); a draft's gap
 * sites keeping their anchors under the open card (I3-tabs, I3-gap); and A2,
 * where the brief asked for three distinct gap incumbents and the tree says
 * every gap race shares one — see the note at A2 itself.
 *
 * It changes no file and asserts nothing about the constitution: a finding
 * here is a finding about the page, and belongs to Ed, not to this script.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';
import { say, post as postTo, arg, openCard, press, browserFor } from './lib/walk.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8171');
const OUT = arg('out', join(ROOT, 'design', 'tools', 'proposal-shapes.json'));
const SHOTS = arg('shots', join(process.env.CLAUDE_SCRATCHPAD || tmpdir(), 'proposal-shapes-shots'));
const die = (m) => { console.error(`proposal-shapes: ${m}`); process.exit(1); };
const T0 = Date.now();

const health = await assertServerBuild(BASE, 'proposal-shapes');
say(`proposal-shapes against ${BASE} · build ${health.build ?? 'unreported'}`);
if (health.cooldownMs !== 0) {
  die(`this server's adoption cooldown is ${health.cooldownMs}ms — phase 1b adopts and ` +
    `re-reads every tab, and cannot wait a real cooldown out. Boot with DRAFT_COOLDOWN_MS=0.`);
}
await mkdir(SHOTS, { recursive: true });

/* ==========================================================================
   The ledger: every assertion, and the screenshots for the ones that failed.
   ========================================================================== */
const REC = [];
let failures = 0;
let shots = 0;
const ctx = { seat: '-', width: 0, phase: 'setup', page: null };
const shotName = (cell, rule) =>
  `${ctx.phase}-${ctx.seat}-${ctx.width}-${String(cell || 'x').replace(/[^\w.-]+/g, '_')}-${rule}.png`;

async function check(rule, cell, item, ok, expected, got, opts = {}) {
  const row = { seat: ctx.seat, width: ctx.width, phase: ctx.phase, cell: cell ?? null,
    item: item ?? null, rule, ok: !!ok || !!opts.unruled, expected, got };
  if (opts.unruled) row.unruled = true;
  if (opts.note) row.note = opts.note;
  REC.push(row);
  if (!ok) {
    if (opts.unruled) { say(`  · ${rule} ${cell ?? ''} (no rule) — ${got}`); return; }
    failures++;
    say(`  ✗ ${rule} ${cell ?? ''} ${item ?? ''} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
    if (ctx.page && shots < 60) {
      const p = join(SHOTS, shotName(cell, rule));
      try { await ctx.page.screenshot({ path: p }); row.shot = p; shots++; } catch { /* the page went */ }
    }
  }
}
const note = (rule, cell, item, got, text) =>
  check(rule, cell, item, false, 'no rule — recorded', got, { unruled: true, note: text });

/* ==========================================================================
   The wire, the shapes room-walk sends.
   ========================================================================== */
const jars = new Map();
let SLUG = null;
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);
const cmd = async (who, name, args = {}, { soft = false } = {}) => {
  const r = await post(`/api/d/${SLUG}/cmd`, { cmd: name, args }, jars.get(who));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (soft) return { refused: j.error || r.status };
    die(`${who} · ${name} refused (${r.status}): ${JSON.stringify(j)}`);
  }
  return j.result ?? j;
};
const view = async (who) => {
  const r = await fetch(`${BASE}/api/d/${SLUG}/view`, { headers: { cookie: jars.get(who) } });
  if (!r.ok) die(`${who} · view answered ${r.status}`);
  return r.json();
};
const outboxLinkTo = async (addr) => {
  const r = await fetch(`${BASE}/api/dev/outbox`);
  if (!r.ok) die(`GET /api/dev/outbox answered ${r.status} — this walk needs a dev outbox (no RESEND_API_KEY)`);
  const { mails } = await r.json();
  const mail = (mails || []).find((m) => m.to === addr && m.link);
  if (!mail) die(`no outbox mail to ${addr}`);
  return mail.link;
};

/* ==========================================================================
   The seeded document. Cells are located by CONTENT, never by index.
   ========================================================================== */
const RUN = Date.now().toString(36);
/** the document's own title — `labelFor`'s fallback where nothing is above */
let DOC_TITLE = `Shapes ${RUN}`;
const SEED_LINES = [
  `# Shapes Charter ${RUN}`,
  'The club meets weekly in the oak room on the same evening each week.',
  'Minutes are kept for every meeting and published to all members.',
  '## Kitchen',
  'The kitchen is shared by everybody and cleaned by a posted rota.',
  '- Wash your own cups.',
  '- Empty the bins on Friday.',
  'A guest may attend two meetings before being proposed as a member.',
  '## Disputes',
  'Any dispute is settled by a show of hands at a meeting.',
  'The treasurer reports the accounts once a quarter.',
  '',
  'Members may bring one guest to the summer party.',
  'These rules may be changed by the members at any meeting.',
  'The secretary keeps the key.',
  '',
  'Every member has one vote.',
  'The founder chairs the first meeting.',
];
const SEATS = ['alice', 'bob', 'cara', 'dan'];
const addr = (n) => `${n}-${RUN}@example.org`;

/* ---- the page's own line arithmetic, re-implemented here so the expectations
        are not read back off the thing being tested -------------------------- */
const STRIP = (l) => String(l).replace(/^(#{1,3}|-)\s+/, '');
const NORM = (s) => String(s).replace(/\s+/g, ' ').trim();
const applySpan = (lines, sp, hunks) => {
  const region = lines.slice(sp.start, sp.end);
  for (const h of hunks.slice().sort((a, b) => b.start - a.start)) {
    region.splice(h.start - sp.start, h.end - h.start, ...h.lines);
  }
  return region;
};
const spanOf = (hunks) => ({ start: Math.min(...hunks.map((h) => h.start)),
  end: Math.max(...hunks.map((h) => h.end)) });
/** `keysOfSpan` (live.js): the non-blank lines of a span, with its fallback. */
const keysOfSpan = (sp, lines) => {
  const out = [];
  for (let i = sp.start; i < sp.end; i++) if ((lines[i] || '').trim()) out.push('L' + i);
  if (!out.length) out.push('L' + Math.min(sp.start, Math.max(0, lines.length - 1)));
  return out;
};
/** `siteOfSpan` (live.js): a clause run, or a gap with the block before it. */
const siteOfSpan = (sp, lines) => {
  if (sp.end > sp.start) return { keys: keysOfSpan(sp, lines) };
  let at = -1;
  for (let i = Math.min(sp.start, lines.length) - 1; i >= 0; i--) if ((lines[i] || '').trim()) { at = i; break; }
  return { keys: ['G' + sp.start], gapKey: 'G' + sp.start, insertAfterKey: at >= 0 ? 'L' + at : null, isInsert: true };
};
/** `labelFor` (live.js): the nearest heading above, else the document's title. */
const labelFor = (key, lines) => {
  const m = /^L(\d+)$/.exec(String(key));
  const n = m ? +m[1] : -1;
  let h = '';
  for (let i = 0; i <= n; i++) if (/^#{1,3}\s+/.test(lines[i] || '')) h = STRIP(lines[i]);
  return h || DOC_TITLE;
};

/* ==========================================================================
   Phase 1 — found, seat everybody through their own mailed link, seed the
   text, settle the constitution, begin.
   ========================================================================== */
say('\nPhase 1 — the seeded document');
const created = await (await post('/api/docs', {
  title: `Shapes ${RUN}`, email: addr('founder'),
})).json();
if (!created.ok || !created.devLink) die(`creation refused: ${JSON.stringify(created)}`);
SLUG = created.slug;
/**
 * **The browser lives at the host the server mails, not the host the walk
 * attached to.** A dev server's links say `localhost` while a walk attaches
 * to `127.0.0.1`, and the two are different origins to a browser: the
 * interstitial's own POST reads cross-site and its cookie would be set for a
 * host the page never visits — the seat came up as the stranger's door with
 * its own document open in front of it. The API half is unaffected: it posts
 * its cookie by hand.
 */
const PAGE_BASE = new URL(created.devLink).origin;
if (PAGE_BASE !== BASE) say(`  the pages are driven at ${PAGE_BASE} (the server's own base URL)`);

const browser = await browserFor().launch();   // `--browser=`, chromium by default
const CONTEXTS = new Map();
const PAGES = new Map();
const pageErrors = [];
async function seatContext(who) {
  const c = await browser.newContext({ viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1, locale: 'en-GB', timezoneId: 'Europe/London', reducedMotion: 'reduce' });
  await c.addInitScript(IN_PAGE);
  const p = await c.newPage();
  p.on('pageerror', (e) => {
    pageErrors.push({ seat: who, phase: ctx.phase, width: ctx.width, error: String(e) });
  });
  CONTEXTS.set(who, c);
  PAGES.set(who, p);
  return p;
}
/** Arrive a seat in its own browser, the way a person does, and lift its cookie
 *  out for the API half — a magic link is single-use, so one link serves both. */
async function arrive(who, link) {
  const p = PAGES.get(who) || await seatContext(who);
  await p.goto(link, { waitUntil: 'domcontentloaded' });
  await p.waitForURL(/\/d\//, { timeout: 20_000 }).catch(() => {});
  const cookies = await CONTEXTS.get(who).cookies();
  if (!cookies.length) die(`${who}: the magic link set no cookie (landed at ${p.url()})`);
  jars.set(who, cookies.map((c) => `${c.name}=${c.value}`).join('; '));
  await p.goto('about:blank');           // stop the 4s poll while the API works
}

await arrive('founder', created.devLink);
say(`  founded ${SLUG}`);
await cmd('founder', 'confirm-starting-text', { text: SEED_LINES.join('\n') });
for (const m of SEATS) await cmd('founder', 'invite', { email: addr(m) });
for (const m of SEATS) await arrive(m, await outboxLinkTo(addr(m)));
say(`  invited and arrived ${SEATS.length} members`);

await cmd('founder', 'set-setting', { setting: 'rate', value: { grant: 8, cap: 8, dripMinutes: 240 } });
const refusedSettings = [];
for (const [setting, value] of Object.entries({
  pace: { shape: 'fixed' },
  quorum: { form: 'share', n: 60 },
  authorship: { rung: 'sealedElective' },
  judgments: { rung: 'after' },
  applications: { apply: true },
  admission: { price: 'proposal' },
  machines: { enabled: false, budget: 0 },
  lapse: { afterMs: null },
  ending: { endsAtMs: Date.now() + 7 * 24 * 3600_000 },
  bar: { pct: 60 },
  chamber: { rung: 'link' },
})) {
  const a = await cmd('founder', 'reclaim', { setting }, { soft: true });
  const b = a && a.refused ? a : await cmd('founder', 'set-setting', { setting, value }, { soft: true });
  if (b && b.refused) refusedSettings.push(`${setting}: ${b.refused}`);
}
if (refusedSettings.length) say(`  settings refused and dropped: ${refusedSettings.join(' · ')}`);
const ready = await view('founder');
if (!ready.readiness?.ready) die(`🍾 not ready: ${JSON.stringify(ready.readiness?.waiting)}`);
await cmd('founder', 'begin', {});
say('  constitution settled, document begun');

{
  const v = await view('founder');
  const got = String(v.text || '').split('\n');
  if (got.length !== SEED_LINES.length || got.some((l, i) => l !== SEED_LINES[i])) {
    die(`the document's text is not what was seeded:\n${JSON.stringify(got, null, 1)}`);
  }
  say(`  text seeded verbatim, ${got.length} lines`);
}

/* ---- the cells ----------------------------------------------------------- */
const L = (needle) => {
  const i = SEED_LINES.findIndex((l) => l.includes(needle));
  if (i < 0) die(`no seeded line matching "${needle}"`);
  return i;
};
const N_LINES = SEED_LINES.length;
const CELLS = [
  { id: 'C1', who: 'alice', what: 'one block',
    hunks: [{ start: L('oak room'), end: L('oak room') + 1, lines: ['The club meets fortnightly in the oak room on a weekday evening.'] }] },
  { id: 'C2', who: 'bob', what: 'merge',
    hunks: [{ start: L('show of hands'), end: L('once a quarter') + 1,
      lines: ['Any dispute is settled by a show of hands, and the treasurer reports the accounts quarterly.'] }] },
  { id: 'C3', who: 'alice', what: 'gap at start',
    hunks: [{ start: 0, end: 0, lines: ['A preamble stands before the title.'] }] },
  { id: 'C4', who: 'bob', what: 'gap between blocks',
    hunks: [{ start: L('A guest may attend'), end: L('A guest may attend'),
      lines: ['A guest signs the book on arrival.'] }] },
  { id: 'C5', who: 'alice', what: 'gap at end',
    hunks: [{ start: N_LINES, end: N_LINES, lines: ['These rules take effect at once.'] }] },
  { id: 'C6', who: 'bob', what: 'deletion',
    hunks: [{ start: L('summer party'), end: L('summer party') + 1, lines: [] }] },
  { id: 'C7', who: 'alice', what: 'split',
    hunks: [{ start: L('changed by the members'), end: L('changed by the members') + 1,
      lines: ['These rules may be changed by the members.', 'A change is put at a meeting called for it.'] }] },
  { id: 'C8', who: 'bob', what: 'heading',
    hunks: [{ start: L('## Kitchen'), end: L('## Kitchen') + 1, lines: ['## The kitchen'] }] },
  { id: 'C9', who: 'alice', what: 'heading + paragraph',
    hunks: [{ start: L('## Kitchen'), end: L('## Kitchen') + 2,
      lines: ['## Kitchen rules', 'The kitchen is shared by everybody and cleaned by a weekly rota.'] }] },
  { id: 'C10', who: 'bob', what: 'bullet',
    hunks: [{ start: L('Wash your own cups'), end: L('Wash your own cups') + 1,
      lines: ['- Wash your own cups and plates.'] }] },
  { id: 'C11', who: 'alice', what: 'two-site patch',
    hunks: [{ start: L('Minutes are kept'), end: L('Minutes are kept') + 1,
      lines: ['Minutes are kept for every meeting and circulated within a week.'] },
    { start: L('## Disputes'), end: L('## Disputes'),
      lines: ['A member may raise a dispute in writing.'] }] },
  { id: 'C13', who: 'bob', what: 'blank-touching',
    hunks: [{ start: L('secretary keeps the key'), end: L('Every member has one vote') + 1,
      lines: ['The secretary keeps the key, and every member has one vote.'] }] },
];

const CAND = new Map();       // cell id → candidate id
const CELL_OF = new Map();    // candidate id → cell
for (const c of CELLS) {
  const v = await view(c.who);
  const r = await cmd(c.who, 'propose-text', {
    baseVersion: v.textVersion, hunks: c.hunks, why: `shape ${c.id}`,
  });
  if (!r || !r.id) die(`${c.id}: propose-text answered ${JSON.stringify(r)}`);
  CAND.set(c.id, r.id);
  CELL_OF.set(r.id, c);
  c.cand = r.id;
  say(`  ${c.id} ${c.what} · ${c.who} · ${c.hunks.length} hunk(s) ` +
    `[${c.hunks.map((h) => `${h.start},${h.end})→${h.lines.length}`).join(' ')}] → ${r.id}`);
}

/* ---- cara judges three ---------------------------------------------------- */
const pairFor = (v, cid) => {
  const clause = (v.clauses || []).find((c) => c.candidates?.some((k) => k.id === cid));
  if (!clause) return null;
  const dealt = (v.raceCards || []).find((rc) => rc.a?.id === cid || rc.b?.id === cid
    || (rc.raceId && rc.raceId === clause.id));
  return { clause, card: dealt ?? clause.ask ?? null };
};
for (const cell of ['C1', 'C4']) {
  const cid = CAND.get(cell);
  const p = pairFor(await view('cara'), cid);
  if (!p?.card) { await check('J1', cell, cid, false, 'a judgeable pair for cara', 'none'); continue; }
  await cmd('cara', 'judge-race', { a: p.card.a.id, b: p.card.b.id,
    outcome: p.card.a.id === cid ? 'a' : 'b' });
  say(`  cara judged ${cell} (approve)`);
}
{
  const cid = CAND.get('C8');
  const p = pairFor(await view('cara'), cid);
  if (!p?.card) await check('J1', 'C8/C9', cid, false, 'a judgeable pair for cara on the kitchen race', 'none');
  else {
    await cmd('cara', 'judge-race', { a: p.card.a.id, b: p.card.b.id, outcome: 'a' });
    say(`  cara judged the kitchen race (${p.card.a.id} vs ${p.card.b.id}, outcome a)`);
  }
}

/* ---- the API assertions, before any page opens ---------------------------- */
ctx.phase = 'api';
{
  const dv = await view('dan');
  const races = dv.clauses || [];
  await check('A0', null, null, races.length === 11, '11 races (C8 and C9 join one)', races.length);
  for (const c of CELLS) {
    const p = pairFor(dv, c.cand);
    await check('A1', c.id, c.cand, !!p && !!p.clause.askable && !!p.card,
      'askable in dan’s fresh view, dealt or by ask (Q1202)',
      !p ? 'no clause row' : `askable=${p.clause.askable} card=${p.card ? 'yes' : 'no'}`);
  }
  const gapIncs = ['C3', 'C4', 'C5'].map((k) => {
    const cid = CAND.get(k);
    const cl = races.find((r) => r.candidates?.some((x) => x.id === cid));
    return cl ? cl.incumbentId : null;
  });
  // **The brief asked for three distinct `incumbentId`s here; the tree says
  // otherwise.** *Every gap race shares one incumbent id* — the incumbent is
  // the hash of the text it displaces, and a gap displaces nothing — and
  // Q1202's fix was `onRace` matching **both** sides, not making the ids
  // differ (CLAUDE.md, Gotchas). So the assertion stays, recorded and never
  // failed, and A2b below asserts what Q1202 actually promises: a judgment on
  // one gap race is filed on that race alone.
  await check('A2', 'C3/C4/C5', null, new Set(gapIncs).size === 3 && !gapIncs.includes(null),
    'three distinct incumbent ids for the three gap races (Q1202)', gapIncs,
    { unruled: true, note: 'the tree says one shared incumbent id per empty span — see A2b' });
  {
    const cv = await view('cara');
    const judgedOn = ['C3', 'C4', 'C5'].map((k) => {
      const cid = CAND.get(k);
      const cl = (cv.clauses || []).find((r) => r.candidates?.some((x) => x.id === cid));
      return { cell: k, judgments: (cl?.myJudgments || []).length, judged: !!cl?.judged };
    });
    await check('A2b', 'C3/C4/C5', null,
      judgedOn.every((x) => (x.cell === 'C4') === (x.judgments === 1)),
      'cara’s judgment on C4 is filed on C4’s gap race alone (Q1202)', judgedOn);
  }
  for (const who of ['alice', 'bob']) {
    const mv = await view(who);
    const live = (mv.mine || []).filter((m) => m.state === 'live');
    await check('A3', null, who, live.length === 6, `${who}: 6 live proposals in 'mine'`, live.length);
  }
  const am = await view('alice');
  const c11 = (am.mine || []).find((m) => m.id === CAND.get('C11'));
  await check('A4', 'C11', CAND.get('C11'), !!c11 && c11.patch?.hunks?.length === 2,
    'C11 appears in alice’s `mine` with 2 hunks', c11 ? c11.patch?.hunks?.length : 'absent');
  const rec = (dv.records || []).length;
  await check('A5', null, null, rec === 0 && dv.text === SEED_LINES.join('\n'),
    'nothing adopted yet — the text is still the seeded one', `${rec} record(s), text ${dv.text === SEED_LINES.join('\n') ? 'unchanged' : 'CHANGED'}`);
}

/* ==========================================================================
   The in-page half — installed before the page boots.
   ========================================================================== */
function IN_PAGE() {
  const mmReal = window.matchMedia.bind(window);
  window.matchMedia = (q) => (/prefers-reduced-motion/.test(q)
    ? { matches: true, media: q, addListener() {}, removeListener() {},
        addEventListener() {}, removeEventListener() {}, onchange: null, dispatchEvent() { return false; } }
    : mmReal(q));
  /** Text as a member reads it (card-audit's `visText`): hidden subtrees
   *  skipped, a drawn glyph read as its `data-char`. */
  const visText = (el) => {
    let s = '';
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { s += n.nodeValue; continue; }
      if (n.nodeType !== 1) continue;
      const st = getComputedStyle(n);
      if (st.display === 'none' || st.visibility === 'hidden') continue;
      const ch = n.getAttribute && n.getAttribute('data-char');
      if (ch && String(n.tagName).toLowerCase() === 'svg') { s += ch; continue; }
      s += visText(n);
    }
    return s;
  };
  const txt = (el) => (el ? visText(el).replace(/\s+/g, ' ').trim() : null);
  const q = (k) => String(k).replace(/["\\]/g, '\\$&');
  const blocksOf = (r) => {
    if (!r) return null;
    const lp = [...r.querySelectorAll('.lp')];
    return lp.length ? lp.map((e) => ({ text: txt(e), cls: e.className })) : [{ text: txt(r), cls: '(no .lp)' }];
  };
  const visKeys = () => [...document.querySelectorAll('#charter [data-key]')]
    .filter((e) => !e.closest('.sugg')).map((e) => e.dataset.key);
  const tabsFor = (id) => [...document.querySelectorAll('#charter .achip[data-anchor="' + q(id) + '"]')]
    .map((el) => {
      const blk = el.closest('[data-key]');
      const anch = el.closest('.insert-anchor');
      return { key: blk ? blk.dataset.key : null,
        anchor: anch ? (anch.dataset.site || '(item)') : null,
        inCard: !!el.closest('.sugg'), behind: el.classList.contains('behind') };
    });
  const anchorsFor = (id) => [...document.querySelectorAll('#charter .insert-anchor[data-anchor="' + q(id) + '"]')]
    .map((a) => ({ site: a.dataset.site || null,
      h: Math.round(a.getBoundingClientRect().height * 100) / 100 }));
  // the entry's own title: a sealed row says it in `.qt`, a live one in a bare
  // span inside `.ql`, and a one-line judged row as a text node beside the mark
  const railFor = (id) => [...document.querySelectorAll('#rail .qitem[data-q="' + q(id) + '"]')]
    .map((li) => ({ site: li.dataset.site || null,
      title: txt(li.querySelector('.ql') || li) }));
  const cardsFor = (id) => [...document.querySelectorAll('#charter .sugg[data-card="' + q(id) + '"]')]
    .map((c) => ({
      site: c.dataset.site || null,
      cls: c.className,
      headNone: !!c.querySelector('.clausehead .rtext.none'),
      headText: txt(c.querySelector('.clausehead .rtext')),
      head: blocksOf(c.querySelector('.clausehead .rtext')),
      // one lane per `.propblock`, its OWN `.rtext` — an insert card nests a
      // second `.rtext` inside the first (session.js's `prop`), so a flat
      // `.propblock .rtext` counts one lane twice
      lanes: [...c.querySelectorAll('.propblock')]
        .map((pb) => pb.querySelector(':scope > .rtext')).filter(Boolean).map((r) => ({
        blocks: blocksOf(r), text: txt(r),
        markers: [...r.querySelectorAll('.mdmark')].map((m) => m.textContent),
      })),
      rawMarker: /(^|\n)(#{1,3}|-)\s/.test(c.textContent),
      keys: [...c.querySelectorAll('[data-key]')].map((e) => e.dataset.key),
    }));
  window.__PS = {
    ready: () => !!(window.SESSION && window.SESSION.SUGGS),
    count: () => (window.SESSION && window.SESSION.SUGGS ? window.SESSION.SUGGS.length : -1),
    stub: () => { window.scrollTo(0, 0);
      window.SESSION.smoothScrollBy = (dy, done) => { window.scrollBy(0, dy); if (done) done(); }; },
    noText: () => (window.COPY && window.COPY.grammar && window.COPY.grammar.head
      ? window.COPY.grammar.head.noText : null),
    /** the sentence a deletion's lane reads (Q1412) — the copy, never a literal */
    removedCopy: () => (window.COPY && window.COPY.grammar && window.COPY.grammar.lane
      ? window.COPY.grammar.lane.removed : null),
    /** **what a newcomer sees before their OKs are in** (Q1413): the greyed
     *  tabs in the gutter, the rail's own two populations, and whether any of
     *  this is a control. `qitem[data-q]` is a charter entry; `[data-card]` is
     *  a setup task — the OKs a newcomer is holding. */
    newcomer: () => ({
      items: (window.SESSION.SUGGS || []).length,
      held: [...document.querySelectorAll('#charter .achip.held')].map((el) => {
        const blk = el.closest('[data-key]');
        const mk = el.querySelector('.mk');
        return { key: blk ? blk.dataset.key : null,
          kind: mk ? (mk.className.match(/mk-(\w+)/) || [])[1] : null,
          anchor: el.getAttribute('data-anchor'), behind: el.classList.contains('behind'),
          role: el.getAttribute('role'), tabindex: el.getAttribute('tabindex'),
          grey: getComputedStyle(mk || el).filter };
      }),
      // a charter entry carries `data-q`; a setup task carries `data-card`
      // **and a `data-q` of its own**, so the charter's are the ones with no
      // card key — the OKs are counted separately below
      railQ: [...document.querySelectorAll('#rail .qitem[data-q]')]
        .filter((e) => !e.querySelector('[data-card]') && !e.closest('[data-card]') && !e.dataset.card)
        .map((e) => e.dataset.q),
      railCards: [...new Set([...document.querySelectorAll('#rail [data-card]')].map((e) => e.dataset.card))],
      cards: document.querySelectorAll('#charter .sugg').length,
      tocMarks: document.querySelectorAll('#toc .mk, .tocmarks .mk').length,
    }),
    /** press the first greyed tab and say whether anything opened (Q1413) */
    pressHeld: () => {
      const el = document.querySelector('#charter .achip.held');
      if (!el) return null;
      el.click();
      return { cards: document.querySelectorAll('#charter .sugg').length,
        openId: window.SESSION.openId === undefined ? null : window.SESSION.openId };
    },
    /** the draft the composer is holding (Q1415) — what it would send is the
     *  page's own business (`hunksOf` is closed over inside session-view.html);
     *  the wire is asserted off the server instead */
    draft: () => {
      const d = (window.SESSION.SUGGS || []).find((x) => x.unproposed && x.sites);
      if (!d) return null;
      return { sites: d.sites.map((s) => ({ keys: s.keys, text: s.text,
        origin: (s.origin || []).map((o) => o.text) })) };
    },
    doc: () => (window.SESSION.DOC || []).map((l) => ({ key: l.key || null, t: l.t || null,
      x: l.x || '', level: l.level || null, gap: !!l.gap })),
    items: () => (window.SESSION.SUGGS || []).map((s) => ({
      id: s.id, kind: s.kind, state: s.state, mine: !!s.mine, unproposed: !!s.unproposed,
      keys: s.keys || null,
      sites: s.sites ? s.sites.map((x) => ({ keys: x.keys || null, label: x.label || null,
        text: x.text == null ? null : x.text, gapKey: x.gapKey || null,
        insertAfterKey: x.insertAfterKey === undefined ? null : x.insertAfterKey })) : null,
      gapKey: s.gapKey || null,
      insertAfterKey: s.insertAfterKey === undefined ? null : s.insertAfterKey,
      candId: s.candId || null, candidate: s.candidate || null, raceId: s.raceId || null,
      race: s.race ? { a: s.race.a.id, b: s.race.b.id } : null,
      card: s.card ? { a: s.card.a, b: s.card.b, inc: s.card.inc } : null,
      pick: s.pick || null, qLabel: s.qLabel || null, isInsert: !!s.isInsert,
    })),
    closed: (id) => ({ tabs: tabsFor(id), anchors: anchorsFor(id), rail: railFor(id),
      cards: cardsFor(id).length, visKeys: visKeys() }),
    open: (id) => ({ tabs: tabsFor(id), anchors: anchorsFor(id), cards: cardsFor(id),
      visKeys: visKeys() }),
    toggle: (id) => { try { window.SESSION.toggle(id, false); return null; } catch (e) { return String(e); } },
  };
}

/* ==========================================================================
   The page phase.
   ========================================================================== */
const T = (p, ms) => p.waitForTimeout(ms);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * **A member is served no charter item until they have OK'd ⚖️** (`withheld`
 * in session.js; `mayJudge` = `canJudge() && viewerIsMember() && acked('canjudge')`).
 * The OK on a gate is remembered **per device**, not in the module, so no
 * amount of API work can stand in for it: the walk has to press it on the
 * page, once per seat, exactly as a member does. The founder is exempt —
 * `gateSelfSet` acknowledges a gate the founder set themselves.
 */
/**
 * **And ⚖️ is staged behind every constitutional OK a member is owed**
 * (SURFACE C8/E5; `staged` in session-view.html) — a member is told what room
 * they are in before they are handed the tools — so the walk clears the seat's
 * whole rail, card by card, exactly as the member would: open, OK, next. Two
 * attempts per key, then it is left alone; a key that never clears is a seat
 * that cannot be brought to the point of judging, which S0 then reports.
 */
async function clearTasks(page) {
  const tries = new Map();
  for (let round = 0; round < 8; round++) {
    const keys = await page.evaluate(() => [...new Set(
      [...document.querySelectorAll('#rail [data-card]')].map((e) => e.dataset.card))]);
    const todo = keys.filter((k) => (tries.get(k) || 0) < 2);
    if (!todo.length) break;
    for (const k of todo) {
      tries.set(k, (tries.get(k) || 0) + 1);
      if (!await openCard(page, k, { settleMs: 400 })) continue;
      await press(page, 1250);
    }
  }
}

/** Open a seat's live page at one width and hand back the item list. */
async function openSeat(who, width, height, minItems) {
  const page = PAGES.get(who);
  ctx.seat = who; ctx.width = width; ctx.page = page;
  await page.setViewportSize({ width, height });
  await page.goto(`${PAGE_BASE}/d/${SLUG}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window.SESSION && window.__PS), null, { timeout: 20_000 })
    .catch(() => {});
  if (who !== 'founder') {
    await clearTasks(page);
    await page.goto(`${PAGE_BASE}/d/${SLUG}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!(window.SESSION && window.__PS), null, { timeout: 20_000 })
      .catch(() => {});
    await T(page, 600);
  }
  try {
    await page.waitForFunction((n) => window.__PS && window.__PS.ready() && window.__PS.count() >= n,
      minItems, { timeout: 20_000 });
  } catch {
    const d = await page.evaluate(() => ({
      count: window.__PS ? window.__PS.count() : -1,
      url: location.href,
      charter: (document.querySelector('#charter') || {}).childElementCount,
      rail: document.querySelectorAll('#rail .qitem').length,
      holding: !!document.querySelector('#holding'),
      railKeys: [...document.querySelectorAll('#rail [data-card]')].map((e) => e.dataset.card),
      bandTabs: [...document.querySelectorAll('#band [data-tab]')].map((e) => e.dataset.tab),
    })).catch((err) => ({ err: String(err) }));
    await check('S0', null, who, false, `${minItems} items within 20s`, d);
  }
  await page.evaluate(() => window.__PS.stub());
  await T(page, 300);
  return page;
}

/**
 * What the page ought to draw for one item, worked out from the cells and the
 * current lines — never read back off the page.
 */
function expectOf(item, lines) {
  const cellOf = (id) => CELL_OF.get(id) || null;
  const hunksOf = (id) => (cellOf(id) ? cellOf(id).hunks : []);
  // the item's sites, in the gap-site grammar (Q261, Q1311, M19)
  let sites = [];
  let lanes = [];          // per lane: { blocks, raw } — raw keeps markers (Q1403)
  let cell = null;
  if (item.kind === 'draft') {
    const c = cellOf(item.candidate);
    cell = c ? c.id : null;
    const hs = c ? c.hunks : [];
    sites = hs.map((h) => siteOfSpan({ start: h.start, end: h.end }, lines));
    lanes = hs.map((h) => ({ blocks: h.lines.filter((l) => l.trim()).map(NORM), raw: true }));
  } else if (item.kind === 'race' && item.race) {
    const hs = [...hunksOf(item.race.a), ...hunksOf(item.race.b)];
    const sp = hs.length ? spanOf(hs) : null;
    cell = [cellOf(item.race.a)?.id, cellOf(item.race.b)?.id].filter(Boolean).join('/');
    if (sp) {
      sites = [siteOfSpan(sp, lines)];
      lanes = [item.race.a, item.race.b].map((id) => ({
        blocks: applySpan(lines, sp, hunksOf(id)).filter((l) => l.trim()).map((l) => NORM(STRIP(l))), raw: false }));
    }
  } else if (item.state === 'sealed') {
    sites = [{ keys: item.keys || [] }];
    lanes = null;                       // a record's field is its own shape
    cell = 'rec';
  } else if (item.candId) {
    cell = cellOf(item.candId)?.id || null;
    const hs = hunksOf(item.candId);
    const sp = hs.length ? spanOf(hs) : null;
    if (sp) {
      sites = [siteOfSpan(sp, lines)];
      lanes = [{ blocks: applySpan(lines, sp, hs).filter((l) => l.trim()).map((l) => NORM(STRIP(l))), raw: false }];
    }
  }
  const heads = sites.map((s) => {
    if (s.isInsert) return null;                    // the gap head: `(no text here)`
    return s.keys.map((k) => {
      const n = +String(k).slice(1);
      return NORM(STRIP(lines[n] ?? ''));
    });
  });
  return { cell, sites, lanes, heads,
    tabKeys: sites.map((s) => (s.isInsert ? null : s.keys[0])),
    labels: sites.map((s) => labelFor(s.insertAfterKey || s.keys[0], lines)) };
}

/** The whole per-item invariant run, at one seat and one width. */
async function walkItems(page, lines, { railAsserted }) {
  const items = await page.evaluate(() => window.__PS.items());
  const noText = await page.evaluate(() => window.__PS.noText());
  const removed = await page.evaluate(() => window.__PS.removedCopy());
  for (const s of items) {
    const ex = expectOf(s, lines);
    const cell = ex.cell;
    const nSites = Math.max(1, ex.sites.length);

    /* ---- I1: the tabs, closed ------------------------------------------- */
    const before = await page.evaluate((id) => window.__PS.closed(id), s.id);
    const wantClauseTabs = ex.tabKeys.filter((k) => k !== null);
    const wantGaps = ex.sites.filter((x) => x.isInsert);
    await check('I1-count', cell, s.id, before.tabs.length === nSites,
      `${nSites} tab(s) closed — one per site (Q1408)`, before.tabs.length);
    const gotKeys = before.tabs.filter((t) => t.key).map((t) => t.key).sort();
    await check('I1-keys', cell, s.id, eq(gotKeys, wantClauseTabs.slice().sort()),
      wantClauseTabs, gotKeys);
    for (const g of wantGaps) {
      const anch = before.anchors.filter((a) => a.site === null || a.site === g.gapKey);
      await check('I1-gap', cell, s.id, anch.length === 1,
        `one held-open .insert-anchor for the gap ${g.gapKey} (Q261, Q1311, M19)`,
        `${before.anchors.length} anchor(s): ${JSON.stringify(before.anchors)}`);
      if (anch.length === 1) {
        await check('I1-gap-h', cell, s.id, Math.abs(anch[0].h - 30) <= 0.5,
          'the anchor is 30px tall (Q1379, system.css)', anch[0].h);
      }
    }

    /* ---- I2 / I7: the rail ---------------------------------------------- */
    if (railAsserted) {
      await check('I2', cell, s.id, before.rail.length === nSites,
        `${nSites} rail entr(y|ies) — one per site`, before.rail.length);
      await check('I2-title', cell, s.id, before.rail.every((r) => r.title && r.title.length),
        'each rail entry carries a visible title', before.rail.map((r) => r.title));
      for (let i = 0; i < before.rail.length && i < ex.labels.length; i++) {
        const site = ex.sites[i] || {};
        const noHeading = site.isInsert && site.insertAfterKey === null;
        if (noHeading) {
          // **A gap before the document's first line has no heading above it**,
          // and `labelFor` says what happens then: *on a document with none, the
          // document's own title* (live.js). So the rule is the fallback, not
          // silence — a title taken from somewhere *below* the gap is wrong.
          await check('I7', cell, s.id,
            NORM(before.rail[i].title || '').includes(NORM(DOC_TITLE)),
            `nothing above it, so the document's own title: ${DOC_TITLE} (live.js labelFor)`,
            before.rail[i].title);
        } else {
          await check('I7', cell, s.id,
            NORM(before.rail[i].title || '').includes(NORM(ex.labels[i])),
            `titled by the nearest heading above: ${ex.labels[i]}`, before.rail[i].title);
        }
      }
    } else {
      note('I2', cell, s.id, `${before.rail.length} of ${nSites} entries drawn`,
        'at 390 the task drawer holds only what asks you (MOBILE.md Status)');
    }

    /* ---- I3: open -------------------------------------------------------- */
    const threw = await page.evaluate((id) => window.__PS.toggle(id), s.id);
    if (threw) { await check('I3-open', cell, s.id, false, 'toggle opens the card', threw); continue; }
    await T(page, 250);
    const open = await page.evaluate((id) => window.__PS.open(id), s.id);
    await check('I3-cards', cell, s.id, open.cards.length === nSites,
      `${nSites} open card(s) — a patch opens at every place it touches (Ed, 181)`, open.cards.length);
    const outside = open.tabs.filter((t) => !t.inCard).length;
    // a draft's gap sites keep their own anchors under the card (Q1311), so
    // the tab outside it is the design — but only where there IS an anchor
    const draftGap = s.kind === 'draft' && before.anchors.length > 0;
    if (draftGap) {
      note('I3-tabs', cell, s.id, `${outside} tab(s) outside the card`,
        'a draft’s gap sites keep their own anchors under the card (Q1311 against Q1379)');
    } else {
      await check('I3-tabs', cell, s.id, outside === 0,
        'no tab of this item outside its open card (Q1379, P10)', outside);
    }
    const run = new Set([].concat(...ex.sites.map((x) => (x.isInsert ? [] : x.keys))));
    const wantVis = before.visKeys.filter((k) => !run.has(k));
    const stillOut = [...run].filter((k) => open.visKeys.includes(k));
    await check('I3-swallow', cell, s.id, stillOut.length === 0,
      `the open card swallows every block of its run (Q1407): ${JSON.stringify([...run])}`,
      { stillOnThePage: stillOut });
    // …and takes nothing else with it. A patch open at two sites folds the
    // sections BETWEEN them by design (`foldBetweenSites`), so that case is
    // recorded rather than failed.
    const alsoGone = wantVis.filter((k) => !open.visKeys.includes(k));
    if (ex.sites.length > 1) {
      note('I3-else', cell, s.id, { alsoGone },
        'a patch open at two sites folds the sections between them (session.js foldBetweenSites)');
    } else {
      await check('I3-else', cell, s.id, alsoGone.length === 0,
        'nothing but the run disappears when the card opens', { alsoGone });
    }
    for (const g of wantGaps) {
      const still = open.anchors.filter((a) => a.site === null || a.site === g.gapKey).length;
      if (draftGap) note('I3-gap', cell, s.id, `${still} anchor(s) still drawn`, 'a draft site keeps its anchor');
      else {
        await check('I3-gap', cell, s.id, still === 0,
          'the held-open anchor is replaced by the open card (Q1379)', still);
      }
    }

    /* ---- I4 / I5: the head and the lanes --------------------------------- */
    for (let i = 0; i < open.cards.length; i++) {
      const card = open.cards[i];
      const site = ex.sites[i] || ex.sites[0] || {};
      const wantHead = ex.heads[i] !== undefined ? ex.heads[i] : ex.heads[0];
      if (site.isInsert) {
        await check('I4-gap', cell, s.id, card.headNone && NORM(card.headText) === NORM(noText || '(no text here)'),
          `the gap head is ${JSON.stringify(noText)} and no clause text`,
          { none: card.headNone, text: card.headText });
      } else if (wantHead) {
        const got = (card.head || []).map((b) => NORM(b.text));
        await check('I4', cell, s.id, eq(got, wantHead), wantHead, got);
        await check('I4-blocks', cell, s.id, (card.head || []).length === wantHead.length,
          `${wantHead.length} .lp block(s) in the head (Q1406)`, (card.head || []).length);
      }
      if (s.state === 'sealed') { note('I5', cell, s.id, card.lanes.length + ' lane(s)', 'a record’s field is its own shape'); continue; }
      if (!ex.lanes || !ex.lanes.length) continue;
      // **A deletion's lane is a sentence** (Q1412, Ed 2026-09-17, ruling on
      // this walk's own C6: *the lane reads "This clause would be removed." in
      // the muted note style, so the block is a sentence and not a blank*).
      // The cell was recorded and unruled until then. The lane that carries it
      // is the deleting candidate's — on a quick card the one proposal block,
      // on a challenger pair whichever side is the deletion — so the check is
      // that one lane says it and no lane is blank. Read out of `COPY`, never
      // written here twice.
      const isDeletion = cell === 'C6';
      if (isDeletion) {
        const said = card.lanes.map((l) => NORM(l.text));
        await check('I5-removed', cell, s.id,
          !!removed && said.includes(NORM(removed)) && said.every((t) => t.length),
          `one lane reads ${JSON.stringify(removed)} and none is blank (Q1412)`, said);
        continue;
      }
      const wantLanes = s.kind === 'draft' ? [ex.lanes[i] || ex.lanes[0]] : ex.lanes;
      await check('I5-lanes', cell, s.id, card.lanes.length === wantLanes.length,
        `${wantLanes.length} lane(s)`, card.lanes.length);
      for (let j = 0; j < Math.min(card.lanes.length, wantLanes.length); j++) {
        const got = (card.lanes[j].blocks || []).map((b) => NORM(b.text));
        const want = wantLanes[j].raw
          ? wantLanes[j].blocks.map((x) => NORM(x))           // the draft lane keeps its markers
          : wantLanes[j].blocks;
        await check('I5', cell, s.id, eq(got, want), want, got);
      }
      // the markers are rendered, never printed (Q1368, Q1403, Q1406)
      if (s.kind === 'draft') {
        const marked = card.lanes.some((l) => (l.markers || []).length);
        const wantsMarker = (ex.lanes[i] || {}).blocks?.some((b) => /^(#{1,3}|-)\s/.test(b));
        if (wantsMarker) {
          await check('I5-marker', cell, s.id, marked,
            'a draft lane shows its marker in a .mdmark span (Q1403)', card.lanes.map((l) => l.markers));
        }
      } else {
        await check('I5-marker', cell, s.id, !card.rawMarker,
          'no raw block marker printed anywhere on the card (Q1368, Q1406)', card.rawMarker);
      }
    }

    /* ---- I6: close ------------------------------------------------------- */
    await page.evaluate((id) => window.__PS.toggle(id), s.id);
    await T(page, 250);
    const after = await page.evaluate((id) => window.__PS.closed(id), s.id);
    await check('I6-cards', cell, s.id, after.cards === 0, 'no card for this item once closed', after.cards);
    await check('I6-tabs', cell, s.id, after.tabs.length === before.tabs.length,
      `${before.tabs.length} tab(s) restored`, after.tabs.length);
    await check('I6-doc', cell, s.id, eq(after.visKeys, before.visKeys),
      'the document is exactly as it was before the card opened (M17)',
      { missing: before.visKeys.filter((k) => !after.visKeys.includes(k)),
        extra: after.visKeys.filter((k) => !before.visKeys.includes(k)) });
  }
  return items;
}

/* ---- the seats ----------------------------------------------------------- */
const WIDTHS = [[1600, 1000], [390, 844]];
const MIN_ITEMS = { alice: 12, bob: 12, cara: 12, dan: 11, founder: 11 };
const SUMMARY = [];
ctx.phase = 'p1';
for (const who of ['alice', 'cara', 'dan', 'founder']) {
  for (const [w, h] of WIDTHS) {
    say(`\n  ${who} @ ${w}`);
    const page = await openSeat(who, w, h, MIN_ITEMS[who]);
    const items = await walkItems(page, SEED_LINES, { railAsserted: w >= 900 });
    const kinds = {};
    for (const s of items) kinds[s.kind + (s.state === 'deciding' ? ':deciding' : '')] =
      (kinds[s.kind + (s.state === 'deciding' ? ':deciding' : '')] || 0) + 1;
    SUMMARY.push({ phase: 'p1', seat: who, width: w, items: items.length, kinds });
    say(`    ${items.length} items · ${JSON.stringify(kinds)}`);
    // the per-seat population (SURFACE §2's audience column, read as counts)
    if (who === 'alice') {
      await check('E2', null, who, items.filter((s) => s.kind === 'draft').length === 6,
        'alice holds 6 proposals of her own', items.filter((s) => s.kind === 'draft').length);
    }
    if (who === 'cara') {
      const dec = items.filter((s) => s.state === 'deciding' && s.pick);
      await check('E3', null, who, dec.length === 3,
        '3 judged pairs, each with a verdict pre-selected', dec.length);
    }
    if (who === 'dan' || who === 'founder') {
      await check('E4', null, who, items.filter((s) => s.kind === 'draft').length === 0,
        'no proposals of their own', items.filter((s) => s.kind === 'draft').length);
      // **One race, one pair dealt** — C8 and C9 share a race, so the seat is
      // served one of them, not both; every other cell has a race to itself.
      const seenCell = (c) => items.some((s) => s.candId === c.cand || s.candidate === c.cand
        || (s.race && (s.race.a === c.cand || s.race.b === c.cand)));
      for (const c of CELLS) {
        if (c.id === 'C8' || c.id === 'C9') continue;
        await check('E1', c.id, c.cand, seenCell(c), 'an item on this seat for the cell', seenCell(c));
      }
      const kitchen = CELLS.filter((c) => c.id === 'C8' || c.id === 'C9');
      await check('E1b', 'C8/C9', null, kitchen.some(seenCell),
        'the kitchen race is served as one of its two candidates', kitchen.map(seenCell));
    }
    // one specimen of every cell's open card, for a human to look at
    if (who === 'dan' && w === 1600) {
      for (const c of CELLS) {
        const it = items.find((s) => s.candId === c.cand
          || (s.race && (s.race.a === c.cand || s.race.b === c.cand)));
        if (!it) continue;
        await page.evaluate((id) => window.__PS.toggle(id), it.id);
        await T(page, 280);
        try { await page.screenshot({ path: join(SHOTS, `card-${c.id}.png`) }); } catch { /* — */ }
        await page.evaluate((id) => window.__PS.toggle(id), it.id);
        await T(page, 160);
      }
    }
    await page.goto('about:blank');
  }
}

/* ==========================================================================
   Phase 1b — an adoption above the title moves every line.
   ========================================================================== */
ctx.phase = 'p1b'; ctx.seat = '-'; ctx.width = 0; ctx.page = null;
say('\nPhase 1b — adopting C3, the gap before the title');
{
  const cid = CAND.get('C3');
  const adoptedYet = async () => ((await view('founder')).records || []).some((r) => r.outcome === 'adopted');
  for (const who of ['bob', 'cara', 'dan', 'founder']) {
    // the sweep runs at every judgment on a cooldown-0 server, so the race
    // resolves the moment floor and majority are met — usually before the
    // whole room has spoken (room-walk's rule)
    if (await adoptedYet()) break;
    const p = pairFor(await view(who), cid);
    if (!p?.card) { await check('B1', 'C3', who, false, 'a judgeable pair on C3', 'none'); continue; }
    await cmd(who, 'judge-race', { a: p.card.a.id, b: p.card.b.id,
      outcome: p.card.a.id === cid ? 'a' : 'b' });
  }
  let adopted = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 20_000) {
    const v = await view('founder');
    if ((v.records || []).some((r) => r.outcome === 'adopted')) { adopted = true; break; }
    await new Promise((r) => setTimeout(r, 1000));
  }
  await check('B2', 'C3', cid, adopted, 'C3 adopted within 20s on a cooldown-0 server', adopted);
}
const AFTER = (await view('founder')).text.split('\n');
await check('B3', 'C3', null, AFTER[0] === 'A preamble stands before the title.',
  'the inserted line is the document’s new line 0', AFTER[0]);
{
  // every cell's span moves down one with its clause
  for (const c of CELLS) {
    if (c.id === 'C3') continue;
    for (const h of c.hunks) { h.start += 1; h.end += 1; }
  }
  ctx.phase = 'p1b';
  const page = await openSeat('cara', 1600, 1000, 8);
  const items = await walkItems(page, AFTER, { railAsserted: true });
  SUMMARY.push({ phase: 'p1b', seat: 'cara', width: 1600, items: items.length, kinds: {} });
  const rec = items.find((s) => s.state === 'sealed');
  await check('B4', 'C3', rec ? rec.id : null, !!rec && (rec.keys || [])[0] === 'L0',
    'the record for C3 stands on the new line 0 (Q1333)', rec ? rec.keys : 'no record item');
  await page.goto('about:blank');
}

/* ==========================================================================
   Phase 2 — Q1407's shape: a whole-document rewrite, a one-line proviso
   inside it and an insertion inside it, all in one race.
   ========================================================================== */
ctx.phase = 'p2'; ctx.seat = '-'; ctx.width = 0; ctx.page = null;
say('\nPhase 2 — the whole-document rewrite');
const P2_LINES = SEED_LINES.slice();
{
  const made = await (await post('/api/docs', {
    title: `Shapes Two ${RUN}`, email: `founder2-${RUN}@example.org`,
  })).json();
  if (!made.ok || !made.devLink) die(`second creation refused: ${JSON.stringify(made)}`);
  SLUG = made.slug;
  DOC_TITLE = `Shapes Two ${RUN}`;
  jars.clear();
  const addr2 = (n) => `${n}2-${RUN}@example.org`;
  await arrive('founder', made.devLink);
  await cmd('founder', 'confirm-starting-text', { text: P2_LINES.join('\n') });
  for (const m of SEATS) await cmd('founder', 'invite', { email: addr2(m) });
  for (const m of SEATS) await arrive(m, await outboxLinkTo(addr2(m)));
  await cmd('founder', 'set-setting', { setting: 'rate', value: { grant: 8, cap: 8, dripMinutes: 240 } });
  for (const [setting, value] of Object.entries({
    quorum: { form: 'share', n: 60 }, authorship: { rung: 'sealedElective' },
    judgments: { rung: 'after' }, lapse: { afterMs: null },
    ending: { endsAtMs: Date.now() + 7 * 24 * 3600_000 }, chamber: { rung: 'link' },
  })) {
    const a = await cmd('founder', 'reclaim', { setting }, { soft: true });
    if (!(a && a.refused)) await cmd('founder', 'set-setting', { setting, value }, { soft: true });
  }
  await cmd('founder', 'begin', {});
  say(`  founded ${SLUG} and begun`);
}
const P2_CELLS = [
  { id: 'P-all', who: 'alice', what: 'whole-document rewrite',
    hunks: [{ start: 0, end: P2_LINES.length, lines: P2_LINES.map((l, i) => {
      if (!l.trim()) return 'Nothing in these rules limits the members.';
      const m = /^(#{1,3}\s+|-\s+)/.exec(l);
      return (m ? m[1] : '') + 'Rewritten clause ' + i + ' of the shapes charter.';
    }) }] },
  { id: 'P-one', who: 'bob', what: 'one-line proviso inside the rewrite',
    hunks: [{ start: 9, end: 10, lines: ['Any dispute is settled by a secret ballot at a meeting.'] }] },
  { id: 'P-gap', who: 'cara', what: 'an insertion inside the rewrite',
    hunks: [{ start: 7, end: 7, lines: ['A guest wears a badge.'] }] },
];
CELL_OF.clear();
for (const c of P2_CELLS) {
  const v = await view(c.who);
  const r = await cmd(c.who, 'propose-text', { baseVersion: v.textVersion, hunks: c.hunks, why: `shape ${c.id}` });
  if (!r || !r.id) die(`${c.id}: propose-text answered ${JSON.stringify(r)}`);
  c.cand = r.id; CAND.set(c.id, r.id); CELL_OF.set(r.id, c);
  say(`  ${c.id} · ${c.who} → ${r.id}`);
}
{
  const dv = await view('dan');
  await check('P0', null, null, (dv.clauses || []).length === 1,
    'the three proposals join ONE race (their footprints overlap)', (dv.clauses || []).length);
  // collect several pairs for dan, so more than one pair's cut can be read
  const dealtPairs = [];
  for (let i = 0; i < 5; i++) {
    const v = await view('dan');
    const cl = (v.clauses || [])[0];
    if (!cl) break;
    const card = (v.raceCards || []).find((rc) => rc.raceId === cl.id) ?? cl.ask ?? null;
    if (!card) break;
    dealtPairs.push([card.a.id, card.b.id]);
    await cmd('dan', 'judge-race', { a: card.a.id, b: card.b.id, outcome: 'tie' });
  }
  say(`  dan was served ${dealtPairs.length} pair(s) on the race`);
  await check('P1', null, 'dan', dealtPairs.length >= 1, 'at least one pair served to dan', dealtPairs.length);
  ctx.phase = 'p2';
  const page = await openSeat('dan', 1600, 1000, 1);
  const items = await walkItems(page, P2_LINES, { railAsserted: true });
  SUMMARY.push({ phase: 'p2', seat: 'dan', width: 1600, items: items.length,
    kinds: { pairs: dealtPairs.length } });
  // the named cuts (Q1407)
  const all = CAND.get('P-all'), one = CAND.get('P-one'), gap = CAND.get('P-gap');
  const has = (s, id) => s.candId === id || (s.race && (s.race.a === id || s.race.b === id));
  const pairOf = (x, y) => items.find((s) => has(s, x) && (y ? has(s, y) : s.kind === 'quick'));
  const nonBlank = P2_LINES.filter((l) => l.trim()).length;
  {
    const it = items.find((s) => s.kind === 'quick' && s.candId === all);
    if (!it) note('P2-all', 'P-all', null, 'not served to dan', 'the pair was not dealt');
    else {
      await check('P2-all', 'P-all', it.id, (it.keys || [])[0] === 'L0' && (it.keys || []).length === nonBlank,
        `the whole-document pair spans every non-blank line (${nonBlank}), first tab at L0 (Q1408)`,
        { first: (it.keys || [])[0], n: (it.keys || []).length });
    }
  }
  {
    const it = items.find((s) => s.kind === 'quick' && s.candId === one);
    if (!it) note('P2-one', 'P-one', null, 'not served to dan', 'the pair was not dealt');
    else {
      await check('P2-one', 'P-one', it.id, eq(it.keys, ['L9']),
        'the one-line pair is cut to its own line, L9 (Q1407, Q1408)', it.keys);
    }
  }
  {
    const it = items.find((s) => s.kind === 'quick' && s.candId === gap);
    if (!it) note('P2-gap', 'P-gap', null, 'not served to dan', 'the pair was not dealt');
    else {
      await check('P2-gap', 'P-gap', it.id, it.isInsert && it.gapKey === 'G7',
        'the insertion pair is a gap card at G7 (Q1308)', { isInsert: it.isInsert, gapKey: it.gapKey });
    }
  }
  {
    const it = pairOf(all, one);
    if (!it) note('P2-race', 'P-all/P-one', null, 'not served to dan', 'the challenger pair was not dealt');
    else {
      await check('P2-race', 'P-all/P-one', it.id, (it.keys || [])[0] === 'L0' && (it.keys || []).length === nonBlank,
        'a challenger-vs-challenger card spans the union of the two (Q1407)',
        { first: (it.keys || [])[0], n: (it.keys || []).length });
    }
  }
  await page.goto('about:blank');
}

/* ==========================================================================
   Out.
   ========================================================================== */
ctx.phase = 'end'; ctx.page = null;
for (const e of pageErrors) {
  await check('X1', null, e.seat, false, 'no page error on any seat',
    `${e.phase} @ ${e.width}: ${e.error}`);
}
await browser.close();
await mkdir(join(OUT, '..'), { recursive: true }).catch(() => {});
await writeFile(OUT, JSON.stringify({ base: BASE, run: RUN, slug: SLUG,
  refusedSettings, summary: SUMMARY, pageErrors, assertions: REC }, null, 1));

const unruled = REC.filter((r) => r.unruled).length;
say('\n———');
say(`  ${Math.round((Date.now() - T0) / 1000)}s`);
for (const s of SUMMARY) say(`  ${s.phase} ${s.seat} @${s.width}: ${s.items} items ${JSON.stringify(s.kinds)}`);
say(`  ${REC.length} assertions · ${failures} finding(s) · ${unruled} recorded with no rule`);
say(`  payload ${OUT}`);
say(`  shots   ${SHOTS}`);
if (failures > 0) {
  say('\n  findings:');
  for (const r of REC.filter((x) => !x.ok)) {
    say(`   · ${r.phase} ${r.seat} @${r.width} ${r.cell ?? ''} ${r.rule}: expected ` +
      `${JSON.stringify(r.expected)}, got ${JSON.stringify(r.got)}${r.shot ? ' · ' + r.shot : ''}`);
  }
  process.exit(1);
}
say('  proposal-shapes: all green');
