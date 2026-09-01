/**
 * spec-check — does the spec's governance table still equal the code's
 * catalogue, and does the surface's event matrix still name every key the
 * page speaks?
 *
 * Governance oracle: `CATALOGUE` in the committed browser bundle
 * (design/constitution.js), evaluated in a vm sandbox — no TypeScript
 * loader, nothing imported from packages/. Communication oracle: the
 * page's own maps, read as a buffer (the file holds deliberate NUL bytes).
 *
 * What it asserts (SPEC pass 1, 2026-08-22; pass 2 the same day — see the
 * section at the foot: marks, wallets, holds, the founding order, the
 * composer maps, the banned-word scan):
 *  - SPEC.md §9.7.1 settings table == CATALOGUE on glyph, kind, delegable,
 *    judge-gate, deps, value type, rungs, and whether a consent order exists
 *  - every MotionRoute value in catalogue.ts has a row in §9.7.2
 *  - every exception row (X/Y) carries rule · why · ruling
 *  - SURFACE.md §4 page-key map covers every catalogue id, and agrees with
 *    the page's MID wherever the two names differ
 *  - SPEC.md's decisions-that-are-not-settings are keys the page speaks
 *  - every key the page speaks (ORDER, ACK_KEYS, CHOSEN, PROPOSE, every
 *    card) sits on the key map or on an event row, and no row names a key
 *    the page does not speak
 *
 * Exit code 1 on any disagreement. `--quiet` prints findings only.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const quiet = process.argv.includes('--quiet');
const findings = [];
const note = (s) => { if (!quiet) console.log(s); };
const find = (area, s) => { findings.push({ area, s }); console.log(`  ✗ [${area}] ${s}`); };
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

// ---- oracles ----------------------------------------------------------------

// *judgment* and the maths behind it (entry 164, Ed 2026-08-27: the surface
// says **vote**; the argument for the threshold being a confidence lives at
// docs.vote/pairwise). Deliberately not `bradley`: 🌡️'s one linking sentence
// (entry 163) names the method, and it is the sole place it may stand.
// Shared by `checkBannedWords` (the four page files) and `checkShapes`, whose
// strings live in the bundle (entry 166).
// *room* for the people who decide (entry 215, Ed 2026-08-28, QA on
// `/pairwise`: *rather than using "room" in this way, use "the current
// membership" or "the membership at that time" or "the membership as it
// changes"*). §1's row: **the membership**, and *Room* survives only as a
// place — which is what BANNED_OK below is for.
const BANNED = [/SPEC §/, /\(§\d/, /\broster\b/, /\bparticipant\b/, /\bthe Founder[’']s OK\b/, /\bcarried change/,
  /\bjudg(?:e|es|ed|ing|ment|ments)\b/i, /\bcomparisons?\b/i, /\bconfidence\b/i, /\broom\b/i];

/**
 * **The one allowance, shared by both readers** — exact strings, never a
 * pattern, so it cannot grow by accident and cannot silently readmit *room*
 * for the people who decide. Every entry is the physical sense, which Ed's
 * ruling leaves standing (entry 215); each says which surface it is on.
 */
const BANNED_OK = [
  // 🧭's `meeting` row (entry 166) — the one string in the bundle that needs
  // it, and Ed named it explicitly: a few hours, everybody actually present.
  'A few hours in one room: everyone is here, changes pass easily early on, and nobody is removed or lapses.',
];
const bannedOk = (lit) => BANNED_OK.includes(lit);

function loadCatalogue() {
  const ctx = {};
  vm.runInNewContext(read('design/constitution.js'), ctx);
  return ctx.CONSTITUTION;
}

function motionRoutes() {
  const m = read('packages/constitution/src/catalogue.ts').match(/export type MotionRoute = ([^;]+);/);
  if (!m) throw new Error('MotionRoute not found in catalogue.ts');
  return [...m[1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]);
}

function pageMaps() {
  const s = readFileSync(join(ROOT, 'design/session-view.html')).toString('utf8');
  const arr = (name) => {
    const m = s.match(new RegExp(`const ${name} = (?:GRANT_KEYS\\.concat\\()?\\[([\\s\\S]*?)\\]`));
    if (!m) throw new Error(`${name} not found in session-view.html`);
    return [...m[1].matchAll(/'([a-z-]+)'/g)].map((x) => x[1]);
  };
  const objKeys = (name) => {
    const i = s.indexOf(`const ${name} = {`);
    if (i < 0) throw new Error(`${name} not found`);
    let depth = 0; let j = s.indexOf('{', i);
    for (; j < s.length; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}' && --depth === 0) break;
    }
    return [...s.slice(i, j).matchAll(/^\s{4}'?([a-z-]+)'?:/gm)].map((x) => x[1]);
  };
  const grant = arr('GRANT_KEYS');
  const mid = {};
  // the doors are `door:invite` / `door:remove` in the module (entry 94), so
  // the value half takes a colon — without it MID silently loses the two keys
  // that have no SURFACE §4 row to fall back on
  for (const [, k, v] of s.match(/const MID = \{([^}]*)\}/)[1].matchAll(/([a-z]+): '([A-Za-z:]+)'/g)) mid[k] = v;
  const cards = [...new Set([...s.matchAll(/\{ k: '([a-z-]+)'/g)].map((x) => x[1]))];
  // 🍾's zone table (entry 158): one `{ name, glyph?, down?, keys }` per zone.
  // Pulled out row by row so a reshape that keeps the literal's shape needs no
  // edit here, and a reshape that does not goes red with a sentence rather
  // than an empty list quietly passing.
  const zoneSrc = s.match(/const BEGIN_ZONES = \[([\s\S]*?)\n  \];/);
  if (!zoneSrc) throw new Error('BEGIN_ZONES not found in session-view.html');
  const BEGIN_ZONES = [...zoneSrc[1].matchAll(/name: '([^']+)'[\s\S]*?keys: \[([^\]]*)\]/g)]
    .map((m) => ({ name: m[1], keys: [...m[2].matchAll(/'([a-z-]+)'/g)].map((x) => x[1]) }));
  if (!BEGIN_ZONES.length) throw new Error('BEGIN_ZONES holds no zone the checker can read');
  return { ORDER: arr('ORDER'), ACK_KEYS: grant.concat(arr('ACK_KEYS')), CHOSEN: objKeys('CHOSEN'),
    PROPOSE: objKeys('PROPOSE'), MID: mid, cards, BEGIN_ZONES };
}

// ---- table parsing ----------------------------------------------------------

function tableAfter(rel, marker) {
  const s = read(rel);
  const i = s.indexOf(`<!-- spec-check: ${marker} -->`);
  if (i < 0) throw new Error(`no "${marker}" table in ${rel}`);
  // the table is the run of pipe lines after the marker — stop at its end
  const lines = [];
  for (const l of s.slice(i).split(/\r?\n/).slice(1)) {
    if (l.startsWith('|')) lines.push(l);
    else if (lines.length) break;
  }
  const cells = (l) => l.slice(1, -1).split('|').map((c) => c.trim());
  const head = cells(lines[0]);
  return lines.slice(2).map((l) => Object.fromEntries(cells(l).map((c, k) => [head[k], c])));
}

function exceptions(rel, prefix) {
  return read(rel).split(/\r?\n/).filter((l) => new RegExp(`^\\| ${prefix}\\d+ \\|`).test(l))
    .map((l) => l.slice(1, -1).split('|').map((x) => x.trim()));
}

const yes = (c) => /^yes$/i.test(c);
const list = (c) => (c === '—' || c === '' ? [] : c.split(/\s*[·,]\s*/).map((x) => x.replace(/\s*\(.*\)$/, '')));
const keysOf = (c) => (c || '').replace(/\(.*?\)/g, '').split(/\s+/).filter((k) => /^[a-z-]+$/.test(k));

// ---- governance -------------------------------------------------------------

function checkGovernance() {
  note('Governance — SPEC.md §9.7 against the catalogue');
  const M = loadCatalogue();
  const rows = tableAfter('SPEC.md', 'settings');
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const e of M.CATALOGUE) {
    const r = byId.get(e.id);
    if (!r) { find('settings', `catalogue has '${e.id}', the table does not`); continue; }
    const cmp = (col, want, got) => {
      if (JSON.stringify(want) !== JSON.stringify(got))
        find('settings', `${e.id}.${col}: table says ${JSON.stringify(got)}, catalogue says ${JSON.stringify(want)}`);
    };
    cmp('glyph', e.glyph, r.glyph);
    cmp('kind', e.kind, r.kind);
    cmp('delegable', e.delegable, yes(r.delegable));
    cmp('judge-gate', e.judgeGate, yes(r['judge-gate']));
    cmp('deps', [...e.deps], list(r.deps));
    cmp('value', e.valueType, r.value);
    cmp('rungs', e.rungs ? [...e.rungs] : [], list(r['rungs (most protective first)']));
    const hasConsent = !!e.consent;
    const tableConsent = r['consent scalar'] !== '—';
    if (hasConsent !== tableConsent)
      find('settings', `${e.id}: catalogue ${hasConsent ? 'has' : 'has no'} consent order, table ${tableConsent ? 'states one' : 'states none'}`);
    if (!r['hand-over from']) find('settings', `${e.id}: no hand-over moment stated`);
  }
  for (const r of rows) if (!M.CATALOGUE_BY_ID.has(r.id)) find('settings', `table has '${r.id}', the catalogue does not`);
  note(`  ${rows.length} table rows against ${M.CATALOGUE.length} catalogue entries`);

  const routes = motionRoutes();
  const sect = read('SPEC.md');
  const i = sect.indexOf('**9.7.2 Routes**');
  for (const rt of routes) {
    if (!new RegExp(`route \`${rt}\``).test(sect.slice(i))) find('routes', `MotionRoute '${rt}' is not a row of §9.7.2`);
  }
  note(`  routes: ${routes.join(' · ')}`);

  const ex = exceptions('SPEC.md', 'X');
  for (const c of ex) if (c.length < 5 || c.slice(1).some((x) => !x)) find('exceptions', `${c[0]} is missing a column`);
  note(`  ${ex.length} governance exceptions, each with rule · why · ruling`);
  return M;
}

/**
 * Every `→ why: R-nnn` in SPEC.md lands in design/SPEC-REASONING.md. Spec pass
 * 3 (v0.90) roughly doubled the pointers and nothing checked that any of them
 * resolved. Anchored on `R-\d+` so §9's opening, which spells the *form* as
 * `→ why: R-nnn`, is not read as a broken id. The converse — an entry nothing
 * points at — is history, not a finding.
 */
function checkReasoning() {
  note('Spec reasoning — SPEC.md’s `→ why:` pointers against SPEC-REASONING.md');
  const named = new Set();
  // A pointer's list may mix `R-nnn` with `entry n` and `Qn` in either order
  // (`→ why: R-024, entry 94`), so the list is matched as a whole and the
  // R-ids picked out of it — anchoring on a leading `R-\d+` alone skipped
  // every id that happened to sit behind a non-R item.
  for (const m of read('SPEC.md').matchAll(/→ why: ((?:R-\d+|entry \d+|Q\d+)(?:, *(?:R-\d+|entry \d+|Q\d+))*)/g))
    for (const id of m[1].split(',')) { const t = id.trim(); if (/^R-\d+$/.test(t)) named.add(t); }
  const why = read('design/SPEC-REASONING.md');
  const entries = new Set([...why.matchAll(/^\*\*(R-\d+) /gm)].map((m) => m[1]));
  for (const id of [...named].sort())
    if (!entries.has(id)) find('reasoning', `SPEC.md points at ${id}; SPEC-REASONING.md has no entry for it`);
  note(`  ${named.size} ids pointed at, of ${entries.size} entries`);
}

// ---- the shapes (entry 166) -------------------------------------------------

/**
 * The 🧭 table off the bundle: every row sets every id in `SHAPED`, every
 * value passes `validateFor`, no row names an unavoidable, no key outside
 * `SHAPED ∪ { ending }`, `hides ⊆ keys(sets)`, a perpetual row fixes 🪜, a
 * row with a unit leaves ⏰ for the card, and each `say` is under H4's 200
 * and carries none of `BANNED` — the table's copy reaches the page through
 * the bundle, outside `checkBannedWords`' four-file corpus.
 *
 * …and the page's `SHAPE_NOUN` is asserted to name every row and nothing
 * else. It is the one part of the table the page keeps a copy of — the noun
 * phrase the provenance and 🍾's line are built from — and the copy fails
 * silently in both directions: an unnamed row prints *As for undefined.* on
 * every shaped clause, and `shapeInput()`, which gates on the same map, drops
 * the founder's choice on the way into `open`.
 */
function checkShapes(M) {
  note('Shapes — the 🧭 table against the catalogue');
  const rows = M.SHAPES;
  const allowed = new Set([...M.SHAPED, 'ending']);
  for (const r of rows) {
    for (const id of M.SHAPED) if (!(id in r.sets)) find('shapes', `${r.name} does not set '${id}'`);
    for (const [id, v] of Object.entries(r.sets)) {
      if (!M.CATALOGUE_BY_ID.has(id)) { find('shapes', `${r.name} names '${id}', which is not a setting`); continue; }
      const err = M.validateFor(M.entryOf(id), v);
      if (err) find('shapes', `${r.name}.${id}: ${err}`);
      if (M.UNSHAPED.includes(id)) find('shapes', `${r.name} names '${id}', which is unavoidable and never shaped`);
      if (!allowed.has(id)) find('shapes', `${r.name} names '${id}', outside SHAPED ∪ { ending }`);
    }
    for (const h of r.hides) if (!(h in r.sets)) find('shapes', `${r.name} hides '${h}' without setting it`);
    const ending = r.sets.ending;
    if (ending && ending.endsAtMs === null && !(r.sets.pace && r.sets.pace.shape === 'fixed'))
      find('shapes', `${r.name} is perpetual but 🪜 is not fixed`);
    if (r.unit !== null && ending !== undefined) find('shapes', `${r.name} has a unit and sets ⏰ — the shape is ⏰'s unit, never its answer`);
    if (r.unit === null && ending === undefined) find('shapes', `${r.name} has no unit and leaves ⏰ unset`);
    if (r.say.length > 200) find('shapes', `${r.name}.say is ${r.say.length} characters (H4: 200)`);
    if (!bannedOk(r.say)) for (const b of BANNED) if (b.test(r.say)) find('shapes', `${r.name}.say — ${b}`);
    if (r.say.length < 12) find('shapes', `${r.name}.say says nothing`);
  }
  const nm = readFileSync(join(ROOT, 'design/session-view.html')).toString('utf8')
    .match(/const SHAPE_NOUN = \{([^}]*)\}/);
  if (!nm) find('shapes', 'SHAPE_NOUN not found in session-view.html');
  else {
    const nouns = [...nm[1].matchAll(/([a-z]+)\s*:/g)].map((x) => x[1]);
    for (const r of rows) if (!nouns.includes(r.name)) find('shapes', `SHAPE_NOUN has no phrase for '${r.name}'`);
    for (const n of nouns) if (!rows.some((r) => r.name === n)) find('shapes', `SHAPE_NOUN names '${n}', which is not a shape`);
  }
  note(`  ${rows.length} shapes, ${M.SHAPED.length} shaped settings, ${M.UNSHAPED.length} unavoidable`);
}

// ---- the page-key map -------------------------------------------------------

function checkKeys(M, pm) {
  note('Page keys — SURFACE.md §4 against the catalogue and the page');
  const map = tableAfter('SURFACE.md', 'keys');
  const toId = new Map(map.map((r) => [r['page key'], r.setting]));
  for (const e of M.CATALOGUE) {
    if (![...toId.values()].includes(e.id)) find('keys', `catalogue id '${e.id}' has no page key in SURFACE.md`);
  }
  for (const [k, id] of toId) {
    if (!M.CATALOGUE_BY_ID.has(id)) find('keys', `SURFACE.md maps '${k}' to '${id}', which is not a catalogue id`);
    const pageSays = pm.MID[k] || k;
    if (pageSays !== id) find('keys', `page key '${k}' → '${id}' in SURFACE.md, but the page's MID reads it as '${pageSays}'`);
  }
  const decisions = tableAfter('SPEC.md', 'decisions');
  for (const d of decisions) {
    if (!pm.cards.includes(d['page key'])) find('decisions', `§9.7.1 decision '${d['page key']}' is not a card the page draws`);
  }
  note(`  ${map.length} keys mapped; ${decisions.length} decisions that are not settings`);
  return new Set(toId.keys());
}

// ---- communication ----------------------------------------------------------

function checkCommunication(pm, settingKeys) {
  note('Communication — SURFACE.md §2 against the page');
  const rows = tableAfter('SURFACE.md', 'events');
  const named = new Set(rows.flatMap((r) => keysOf(r.Keys)));
  const spoken = new Set([...pm.ORDER, ...pm.ACK_KEYS, ...pm.CHOSEN, ...pm.PROPOSE, ...pm.cards]);
  for (const k of spoken) {
    if (settingKeys.has(k)) continue;
    if (!named.has(k)) find('events', `page key '${k}' is not placed on any event row`);
  }
  for (const k of named) if (!spoken.has(k)) find('events', `event row names '${k}', which the page does not speak`);
  const unbuilt = rows.filter((r) => /unbuilt/i.test(r.Channel)).map((r) => r['#']);
  note(`  ${rows.length} event rows; ${spoken.size} page keys; unbuilt channels: ${unbuilt.join(' ') || 'none'}`);
  const ex = exceptions('SURFACE.md', 'Y');
  for (const c of ex) if (c.length < 5 || c.slice(1, 4).some((x) => !x)) find('exceptions', `${c[0]} is missing a column`);
  note(`  ${ex.length} communication exceptions`);
}

const M = checkGovernance();
checkReasoning();
checkShapes(M);
const pm = pageMaps();
const settingKeys = checkKeys(M, pm);
checkCommunication(pm, settingKeys);

// ---- spec pass 2 (2026-08-22, Q586 c): marks · wallets · holds · the order · the composer maps ----

const js = (rel) => readFileSync(join(ROOT, rel)).toString('utf8');
const arrLit = (src, name) => {
  const m = src.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  if (!m) throw new Error(`${name} not found`);
  return [...m[1].matchAll(/'([A-Za-z-]+)'/g)].map((x) => x[1]);
};
const numLit = (src, name) => {
  const m = src.match(new RegExp(`const ${name} = (\\d+)`));
  if (!m) throw new Error(`${name} not found`);
  return +m[1];
};
const strLit = (src, name) => {
  const m = src.match(new RegExp(`const ${name} = '([a-z]+)'`));
  if (!m) throw new Error(`${name} not found`);
  return m[1];
};
const objLit = (src, name) => {
  const i = src.indexOf(`const ${name} = {`);
  if (i < 0) throw new Error(`${name} not found`);
  let depth = 0; let j = src.indexOf('{', i);
  for (; j < src.length; j++) { if (src[j] === '{') depth++; else if (src[j] === '}' && --depth === 0) break; }
  return src.slice(i, j + 1);
};
const topKeys = (body) => [...body.matchAll(/^\s{2,4}'?([A-Za-z][A-Za-z0-9-]*)'?:/gm)].map((x) => x[1]);
// the same slice `topKeys` names, but keeping each key's body: one entry per
// top-level key, running to the next one
const keyBodies = (body) => {
  const at = [...body.matchAll(/^\s{2,4}'?([A-Za-z][A-Za-z0-9-]*)'?:/gm)];
  return at.map((m, i) => [m[1], body.slice(m.index, i + 1 < at.length ? at[i + 1].index : body.length)]);
};
// a module-level array literal, raw — `arrLit` returns its bare identifiers,
// and a lane list is pairs of sentences rather than identifiers
const arrRaw = (src, name) => {
  const i = src.indexOf(`const ${name} = [`);
  if (i < 0) return null;
  let depth = 0; let j = src.indexOf('[', i);
  for (; j < src.length; j++) { if (src[j] === '[') depth++; else if (src[j] === ']' && --depth === 0) break; }
  return src.slice(i, j + 1);
};
// comments are stripped before any of these is matched: both MVAL and PROPOSE
// carry long prose comments full of quoted strings (checkBannedWords' idiom,
// which leaves `://` alone)
const uncomment = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/([^:])\/\/ .*$/gm, '$1');
// the arguments of a call whose `(` is at `at`, split at depth 0 and quote-aware
const argsAt = (src, at) => {
  const args = []; let depth = 0; let cur = ''; let q = null;
  for (let i = at + 1; i < src.length; i++) {
    const c = src[i];
    if (q) { cur += c; if (c === '\\') cur += src[++i]; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; cur += c; continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; cur += c; continue; }
    if (c === ')' && depth === 0) { args.push(cur); return args; }
    if (c === ')' || c === ']' || c === '}') { depth--; cur += c; continue; }
    if (c === ',' && depth === 0) { args.push(cur); cur = ''; continue; }
    cur += c;
  }
  return args;
};

function checkMarks() {
  note('Marks — SURFACE.md §6 against cards.js and session.js');
  const cards = js('design/cards.js'); const sess = js('design/session.js'); const css = js('design/system.css');
  const rows = tableAfter('SURFACE.md', 'marks');
  const kinds = rows.map((r) => r.kind);
  const markKeys = topKeys(objLit(cards, 'MARK'));
  for (const k of markKeys) if (!kinds.includes(k)) find('marks', `MARK has '${k}', the table does not`);
  for (const k of kinds) if (!markKeys.includes(k)) find('marks', `the table has '${k}', MARK does not`);
  const drawn = arrLit(cards, 'DRAWN');
  for (const r of rows) {
    const isDrawn = drawn.includes(r.kind);
    if (isDrawn !== /^yes/.test(r['drawn?'])) find('marks', `${r.kind}: table says drawn=${r['drawn?']}, DRAWN ${isDrawn ? 'has' : 'lacks'} it`);
  }
  const keep = arrLit(sess, 'KEEP_ORDER'); const stack = arrLit(sess, 'STACK_ORDER');
  for (const k of markKeys) {
    if (!keep.includes(k)) find('marks', `'${k}' has no place in KEEP_ORDER`);
    if (!stack.includes(k)) find('marks', `'${k}' has no place in STACK_ORDER`);
  }
  if (keep.indexOf('propose') > keep.indexOf('needs')) find('marks', 'KEEP_ORDER: propose should rank ahead of needs (retention)');
  if (stack.indexOf('propose') < stack.indexOf('needs')) find('marks', 'STACK_ORDER: propose should rank behind needs (priority)');
  const live = sess.match(/const live = (kind === [^;]+);/);
  if (!live) find('marks', 'the `live` literal (what pins) not found in session.js');
  else {
    const pinKinds = [...live[1].matchAll(/kind === '([a-z]+)'/g)].map((x) => x[1]);
    for (const r of rows) {
      if (r['pins?'] === 'if unread') continue;
      const pins = /^yes/.test(r['pins?']);
      const inLive = pinKinds.includes(r.kind) || r.kind === 'adopted';
      if (pins !== inLive) find('marks', `${r.kind}: table says pins=${r['pins?']}, the live literal says ${inLive}`);
    }
  }
  if (!/classList\.contains\('mosturgent'\) && !holdsFocus\(r\.el\) && !r\.mine\) continue;/.test(sess)) find('marks', 'the fit-cap exemption literal (🔥 · open · mine) not found');
  for (const r of rows) {
    const ex = /^yes/.test(r['exempt?']);
    if (ex !== (r.kind === 'urgent' || r.kind === 'propose')) find('marks', `${r.kind}: exempt column disagrees with the exemption literal`);
  }
  if (!/\.mk-shifted\s*\{\s*color:\s*var\(--muted\)/.test(css)) find('marks', '↻ (.mk-shifted) is not grey (Q612)');
  const lc = (n) => (css.match(new RegExp(`--lc-${n}:\\s*([0-9, ]+)`)) || [])[1];
  if (lc('deciding') !== lc('closed')) find('marks', '--lc-deciding and --lc-closed are not one grey');
  note(`  ${rows.length} marks; KEEP_ORDER ${keep.length}, STACK_ORDER ${stack.length}`);
}

function checkWallets(pm) {
  note('Wallets and holds — SURFACE.md §7 against the page');
  const page = js('design/session-view.html'); const sess = js('design/session.js');
  const rows = tableAfter('SURFACE.md', 'wallets');
  const grants = rows.map((r) => r['grant key']).filter((k) => k !== '—');
  for (const g of pm.ACK_KEYS) if (!grants.includes(g)) find('wallets', `ACK_KEYS has '${g}', the wallets table does not`);
  for (const g of grants) if (!pm.ACK_KEYS.includes(g)) find('wallets', `the table names grant '${g}', ACK_KEYS does not`);
  for (const r of rows) {
    if (r.socket !== '—' && !new RegExp(`id="${r.socket}"`).test(page)) find('wallets', `socket #${r.socket} is not in the topbar markup`);
  }
  // **Every hold on the surface is one second, and there is one number**
  // (Ed, 2026-08-29, backlog 206; R-059). This used to read three literals —
  // `PEN_HOLD_MS` and the assembly's `HOLD_MS` out of the page, the charter's
  // `HOLD_MS` out of session.js — and check each against its own rows. There
  // is one now: `session.js` owns it, the page reads `SESSION.holdMs`, and
  // **every numeric *hold ms* cell in both tables must equal it**, which is a
  // stronger assertion than the three it replaces — a row that drifts off the
  // one number is red wherever it is.
  const hold = numLit(sess, 'HOLD_MS');
  const holds = tableAfter('SURFACE.md', 'holds');
  // a cell that is not a number is a row with no hold to state (🛡️ and ⚖️ in
  // the wallets table read `—`, *a grant's OK* reads `a click`) — exempt by being
  // non-numeric rather than by a list of glyphs, so a new such row is exempt
  // by construction and a row that states a number is never skipped
  const cells = [...rows, ...holds].map((r) => ({ what: r.control || r.wallet, ms: r['hold ms'] }))
    .filter((c) => /^\d+$/.test(c.ms));
  for (const c of cells) if (+c.ms !== hold) find('holds', `HOLD_MS is ${hold}; the tables say ${c.what} ${c.ms}`);
  if (cells.length < 8) find('holds', `only ${cells.length} hold-ms cells parsed across the two tables — the columns have moved`);
  const want = (ctl) => +((holds.find((h) => h.control.startsWith(ctl)) || {})['hold ms'] || NaN);
  for (const ctl of ['🪶', '✒️', '🍾', '✏️ Propose (a draft', '✏️ Propose (a motion', '🏛️'])
    if (!Number.isFinite(want(ctl))) find('holds', `the ladder has no hold ms for ${ctl}`);
  if (holds.some((h) => h.control.startsWith('✏️ Propose (a motion')) && !/data-putmotion/.test(page.slice(page.indexOf('const holdWallet')))) find('holds', 'the motion ✏️ Propose is not a hold in holdWallet (Q614)');
  // **and the page keeps no copy of the length.** The ban is on a *duration*,
  // never on a floor: `floorAt: 288` and `floorAt || 250` are quarter-way
  // points of two easings and stay literals, asserted just below. What may
  // not come back is a hold timer's own number — a `HOLD_MS`-shaped constant
  // holding a numeral, or a `holdWallet` branch carrying `ms:`.
  if (!/const HOLD_MS = SESSION\.holdMs;/.test(page)) find('holds', 'the page does not read SESSION.holdMs — "one constant" is only true while it does');
  if (/const \w*HOLD_MS\w* = \d/.test(page)) find('holds', 'the page declares a numeric hold duration of its own — it must read SESSION.holdMs');
  const hw = page.slice(page.indexOf('const holdWallet'), page.indexOf('let penHold ='));
  if (/\bms: *\d/.test(hw)) find('holds', 'a holdWallet branch carries its own length — since backlog 206 only the floor differs per branch');
  if (!/get holdMs\(\) \{ return HOLD_MS; \}/.test(sess)) find('holds', 'session.js does not export holdMs beside gesture');
  // the two floors: each is the point at which its own easing has covered a
  // quarter of the **distance** at the hold's length — 250 of 1000 for the
  // pen and the quill's `linear`, 288 of 1000 for the pencil's
  // `cubic-bezier(.45, .05, .3, 1)`, whose 0.288 is a property of the curve
  // and not of the length (which is why it was 864 of 3000)
  const floor = (frac) => Math.round(hold * frac);
  if (!new RegExp(`floorAt(?::| \\|\\|) ${floor(0.25)}\\b`).test(page)) find('holds', `the pen release floor (${floor(0.25)}, a quarter of ${hold} on \`linear\`) not found in the page`);
  if (!new RegExp(`floorAt: ${floor(0.288)}\\b`).test(sess)) find('holds', `the pencil release floor (${floor(0.288)}, the 0.288 solve for that bezier at ${hold}) not found in session.js`);
  if (!new RegExp(`floorAt: ${floor(0.288)}\\b`).test(page)) find('holds', `the motion ✏️ flies the pencil's easing, so its floor is ${floor(0.288)} too`);
  if (numLit(sess, 'REFUND_MS') !== 640) find('holds', 'REFUND_MS is not 640');
  // **A hold is released by letting go, never by the surface moving** (2026-08-22).
  // Both holds on this product release on pointerup and pointercancel and on
  // nothing else. `pointerleave` was fatal on the charter’s: a render during a
  // hold detaches the button under the pointer, the browser fires a boundary
  // event at the node it removed, and the proposal silently never went in — and
  // `.holding`’s scale(0.97) could do it with no render at all, by insetting the
  // hit box 0.78px under a stationary cursor. Nothing here can see a live
  // browser, so it asserts the policy in the source, which is the thing that was
  // wrong: no propose-hold release may name pointerleave.
  const holdBind = sess.slice(sess.indexOf("flyStart(b);"), sess.indexOf("function renderDoc"));
  if (/pointerleave/.test(holdBind)) find('holds', 'the propose hold releases on pointerleave — a render or the .holding shrink cancels it silently');
  for (const e of ['pointerup', 'pointercancel'])
    if (!holdBind.includes("addEventListener('" + e + "'")) find('holds', `the propose hold does not release on ${e}`);
  if (sess.includes(`doc.querySelectorAll('[data-act="draft-propose"]')`)) find('holds', 'the propose hold is bound per button again — it must be delegated, or a render orphans it');
  // **The commit gesture is a switch, and the documentation of it must not
  // drift from it** (backlog 184, 2026-08-28). Two frozen instruments follow
  // `COMMIT_GESTURE` — SURFACE §7.2's bold word, read here, and the 🏛️ label
  // in `card-copy.golden.json` — so flipping the trial is two edits and a
  // `npm run copy-freeze`, and this is what says so out loud. Ed's call, B36:
  // an agreement check, not a legality check, because the only thing that
  // stops the trial's own documentation going stale is a red build.
  const gesture = strLit(sess, 'COMMIT_GESTURE');
  if (gesture !== 'click' && gesture !== 'hold') find('holds', `COMMIT_GESTURE is '${gesture}' — it is 'click' or 'hold'`);
  const said = (read('SURFACE.md').match(/The commit gesture is \*\*(\w+)\*\*/) || [])[1];
  if (!said) find('holds', 'SURFACE §7.2 does not say **The commit gesture is <word>**');
  else if (said !== gesture) find('holds', `COMMIT_GESTURE is '${gesture}'; SURFACE §7.2 says '${said}'`);
  // and the hold path is still reachable: the release listeners asserted above
  // are guarded by the switch rather than deleted
  if (!holdBind.includes('GESTURE')) find('holds', 'the propose hold\'s release is not guarded by GESTURE — the switch is not read here');
  note(`  ${rows.length} wallets; every hold ${hold}ms across ${cells.length} cells (floors ${floor(0.25)} linear · ${floor(0.288)} bezier); gesture ${gesture}`);
}

function checkOrder(pm) {
  note('The founding order — SURFACE.md §8 against ORDER and SEC');
  const page = js('design/session-view.html');
  const rows = tableAfter('SURFACE.md', 'order');
  const keys = rows.map((r) => r.key);
  if (JSON.stringify(keys) !== JSON.stringify(pm.ORDER)) find('order', `the table's keys differ from ORDER: table ${keys.join(' ')} / ORDER ${pm.ORDER.join(' ')}`);
  const secs = [...page.matchAll(/\{ key: '([a-z]+)', title: '([^']*)'[\s\S]*?keys: \[([^\]]*)\]/g)]
    .map((m) => ({ key: m[1], keys: [...m[3].matchAll(/'([a-z-]+)'/g)].map((x) => x[1]) }));
  const secOf = (k) => (secs.find((s) => s.keys.includes(k)) || {}).key;
  // 🏛️ was skipped here while its clause hung off whichever question the
  // grant arrived with; Q750 pins the clause to the Proposals preamble, so
  // there is a section to name. It is deliberately not in `SEC.rate.keys`
  // (admitting it would make the whole section live from its place in ORDER),
  // hence an override rather than a `secOf` lookup.
  const hosts = { 'grant-pen': 'lead', 'grant-shield': 'lead', 'grant-voice': 'rate', title: 'lead', slug: 'lead', shape: 'lead', myemail: 'lead', chamber: 'lead' };
  for (const r of rows) {
    const want = r.section.split(/[,—(]/)[0].trim();
    const got = (r.key in hosts) ? hosts[r.key] : secOf(r.key);
    if (got === null) continue;
    if (got !== want) find('order', `${r.key}: table puts it in '${want}', SEC puts it in '${got || '(none)'}'`);
  }
  const blocks = page.match(/const blocksOrder = \(p\) => \(?p\.k === '([a-z-]+)'/);
  const blocker = blocks ? blocks[1] : null;
  const gates = [...page.matchAll(/\{ k: '([a-z-]+)',[^\n]*isGate: true/g)].map((m) => m[1]);
  // the third state of the *blocks?* column (Q980): a card whose literal says
  // `blocks: false` takes its position and is skipped as a blocker, which is
  // what puts ✋ and 🖼️ in the rail at the save without holding the file. The
  // flag can sit on any line of the literal, so the scan is tempered to stop
  // at the next `{ k: '` rather than at the end of the first line — and it runs
  // over a **comment-stripped** copy, since the comments that explain the flag
  // stand between card literals and named 🤝 as exempt.
  const noComments = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const noBlock = [...noComments.matchAll(/\{ k: '([a-z-]+)',(?:(?!\{ k: ')[\s\S])*?blocks: false/g)].map((m) => m[1]);
  for (const r of rows) {
    const isGate = gates.includes(r.key);
    const want = r['blocks?'] === 'yes';
    const got = isGate ? r.key === blocker : !noBlock.includes(r.key);
    if (want !== got) find('order', `${r.key}: table says blocks=${r['blocks?']}, blocksOrder says ${got}`);
  }
  const glyphs = {};
  for (const m of page.matchAll(/\{ k: '([a-z-]+)', g: '([^']+)'/g)) glyphs[m[1]] = m[2];
  for (const r of rows) if (glyphs[r.key] && glyphs[r.key] !== r.glyph) find('order', `${r.key}: glyph ${r.glyph} vs the card's ${glyphs[r.key]}`);
  // **The Proposals opening is one clause carrying four tabs** (Y23, Q748).
  // The page names the group in `PROPOSAL_CHIPS`; the band prose above names
  // the glyph run the section opens with. Neither is derivable from the other,
  // so the stack could drift from the document that describes it — and the
  // group is what decides which tabs a reader can reach at all.
  const chipsLit = page.match(/const PROPOSAL_CHIPS = \[([^\]]*)\]/);
  if (!chipsLit) find('order', 'PROPOSAL_CHIPS is gone — the Proposals opening no longer names its own stack (Y23)');
  else {
    const chipKeys = [...chipsLit[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
    const prose = read('SURFACE.md').split('\n').find((l) => l.includes('the preamble wearing')) || '';
    const run = ((prose.match(/the preamble wearing ([^·)]+)/) || [, ''])[1] || '').trim();
    const want = chipKeys.map((k) => glyphs[k] || '?').join(' ');
    if (run !== want) find('order', `SURFACE's Proposals run is '${run}', PROPOSAL_CHIPS is '${want}'`);
    for (const k of chipKeys) if (!pm.ORDER.includes(k)) find('order', `PROPOSAL_CHIPS names '${k}', which is not in ORDER`);
  }
  // F16, the half a table cannot hold (Q639): ✒️ and 🛡️ write no clause of
  // their own — the count they used to state is already on every setting
  // `holderLine` touches and on the wallet's own tooltip — and each is the
  // holder's alone, which is E8's audience column. Both are one-line
  // predicates that a refactor could drop without anything else noticing.
  if (/holds the (pen|shield) on '/.test(page))
    find('order', 'the pen or shield clause is back — F16 retires it: the count is already stated per setting and on the wallet');
  // …and the same block keeps the pair's *retired body* out (entry 58): ✒️ and
  // 🛡️ are the first two cards a founder ever meets, so their bodies say what
  // holding one lets you do today and nothing about the mechanism. Comments are
  // stripped the way `checkBannedWords` strips them — the design-room image
  // *one shield, many locks, never spent* survives in two code comments on
  // purpose, and a comment is not copy. `card-audit`'s T38 is the browser half.
  const pageCopy = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  if (/a (pen|shield) is not spent|[Oo]ne (pen|shield), many locks/.test(pageCopy))
    find('order', 'the retired grant body is back — entry 58 redrafted ✒️ and 🛡️ for a reader one minute in');
  for (const k of ['grant-pen', 'grant-shield']) {
    const def = page.slice(page.indexOf(`{ k: '${k}',`), page.indexOf(`{ k: '${k}',`) + 900);
    if (!/hide: \(\) => !amFounder\(\)/.test(def))
      find('order', `${k} is not hidden from a non-founder — E8 gives a grant to the holder, and a member cannot acknowledge somebody else's power`);
  }
  // F9 on the one card that broke it (Q745): 🍾 is not served until it can be
  // pressed. Two independent systems decided *show* and *enable* — `blocksOrder`
  // skips every gate but the pen, `readiness()` is the module's own answer — and
  // nothing reconciled them, so the founder met a task with a dead commit.
  // Asserted as three separate claims, because each can be dropped alone: the
  // hide predicate, the readiness half, and the voice half.
  const beginDef = page.slice(page.indexOf("{ k: 'begin',"), page.indexOf("{ k: 'begin',") + 900);
  if (!/hide: \(\) => !constituted\(\) && \(!amFounder\(\) \|\| !beginOffered\(\)\)/.test(beginDef))
    find('order', "🍾 no longer hides until it can be pressed — F9: a card with a dependency does not appear until its dependency is settled, never greyed");
  const offered = page.slice(page.indexOf('const beginOffered ='), page.indexOf('const beginOffered =') + 1600);
  if (!/readinessOf\(\)/.test(offered) || !/rd\.ready/.test(offered))
    find('order', "🍾's `beginOffered` no longer asks the module's `readiness()` — the page would be deciding *show* from state the module contradicts");
  // …and the voice half is `visible(card(voiceHost()))`, never `mustAct` alone:
  // with nothing delegated 🏛️ hangs off ⚖️, which is hidden until 🍾, so a bare
  // `mustAct` holds 🍾 shut for ever (the Q645 deadlock, in a new place).
  if (!/visible\(card\(voiceHost\(\)\)\) && mustAct\(card\('grant-voice'\)\)/.test(offered))
    find('order', "🍾's voice half no longer asks whether 🏛️ is being *served* — a bare mustAct deadlocks a founder who delegates nothing");
  // F18, the two halves of *the founding never runs out of tasks* (Q773–Q777).
  // Each is a one-line predicate a refactor could drop with everything still
  // rendering, and the failure is silent by construction: a founder with an
  // empty rail sees a page that looks finished.
  if (!/nothingElseServed\(\)/.test(offered))
    find('order', "🍾 has no last-resort door — F18: when nothing else is served the rail is empty and the founding has no way on");
  // …and the door does not count the remedy (Q830, F5). 🪪 stands as the remedy
  // for a `one-voice` wait, which would make `nothingElseServed()` false in
  // exactly the state the last-resort door exists for — so without this the
  // founder is sent to 🪪 by a card that has just hidden itself, and the
  // sentence naming why is unreachable. Silent by construction: everything
  // still renders.
  if (!/servedCards\(\)\.some\(\(c\) => !c\.isBegin && !remedyOnly\(c\)\)/.test(page))
    find('order', "🍾's last-resort door counts the 🪪 remedy again — F5/Q830: serving the remedy shuts the door on the one state it was written for");
  if (!/const oneVoiceRemedy = \(\) => amFounder\(\) && !constituted\(\) && oneVoiceHolds\(\)\.length > 0/.test(page))
    find('order', "🪪 is no longer served as the `one-voice` remedy — Q828: a wait no answering can end, with no card offering the two acts that end it");
  // …and the plain ✉️ task beside it (entry 181, F23), which the remedy above
  // never reaches: it only ever finds a founder who delegated something.
  // **A containment check, deliberately.** The predicate also reads the five
  // Membership rules and the roster, so a pin asserting the *whole* body would
  // be a second copy of it, red at every honest edit. What is pinned is that it
  // exists and that it is still the founder's, and still pre-start.
  if (!/const inviteTask = \(\) => amFounder\(\) && !constituted\(\)/.test(page))
    find('order', "the founder's ✉️ task is no longer served once the Membership rules stand — entry 181, F23");
  // the remedy must not pace the questions it is the remedy *for* (Q775's rule,
  // third instance): 🪪 is owed only once a setting has been handed over, so
  // counting it would hold every delegated question shut from the first
  // delegation onwards
  if (!/mustAct\(c\) && !remedyOnly\(c\)/.test(page))
    find('order', "`otherTasksLeft` counts the 🪪 remedy again — F18/Q828: what is offered *because* the questions are stuck cannot be the reason to withhold them");
  if (!/const otherTasksLeft = \(\) => CARDS\.concat\(GATES\)\s*\n?\s*\.some\(\(c\) => !c\.isGate && railable\(c\)/.test(page))
    find('order', "`otherTasksLeft` no longer asks `railable` — F18: a task the rail can never offer would withhold every delegated question for ever (🪜)");
  const commit = page.slice(page.indexOf('function commitSetting('), page.indexOf('function commitSetting(') + 1800);
  if (commit.indexOf("if (k === 'bar')") > commit.indexOf('if (wantsDelegate(k))'))
    find('order', "🪜 rides only 🌡️'s *set* branch again — F18: it is the founder's whichever way 🌡️ goes, and nothing else on the surface can ever ask for it");
  note(`  ${rows.length} steps; blocking grant: ${blocker}; ${secs.length} sections`);
}

/**
 * **The founding rules are defined once and never renumbered** — SURFACE §8.1
 * against itself.
 *
 * Ed ruled it twice (2026-08-29, and again while the tabulation plan was
 * written): a pass over §8.1 *must not renumber F1–F22*. The ids are cited
 * from outside the file — `CLAUDE.md`, `design/STYLE.md`, `journey-walk.mjs`,
 * `ladder-walk.mjs`, `seat-matrix.mjs` and this checker — so a renumbering
 * breaks pointers that nothing else would notice. This is the mechanical half
 * of that rule.
 *
 * **Definitions, never occurrences.** A rule's *definition* is the one list
 * item in §8.1 whose lead is `- **F<n> `; its *occurrences* are that plus
 * every cross-reference — and §8.1 is built out of cross-references. F19 is
 * written seven times in this file, F5 and F18 five each, and §8's own ORDER
 * table cites F5, F9, F18 and F19 in two of its cells. So *each id appears
 * exactly once* is not merely unbuildable, it would forbid the web the rules
 * form, which is the thing worth keeping. What is asserted is that each id is
 * **defined** exactly once (Q1128).
 *
 * Three claims, each droppable on its own: the ids are exactly F1–F23 in
 * order, no gap and no duplicate; no rule is defined outside §8.1; and every
 * `F<n>` written anywhere in SURFACE.md resolves to one of those definitions,
 * so a citation cannot outlive the rule it points at.
 */
function checkFIds() {
  note("The founding rules — SURFACE §8.1's ids, defined once and never renumbered");
  const md = read('SURFACE.md');
  const head = md.indexOf('### 8.1 Rules');
  const tail = md.indexOf('\n## 9.', head);
  if (head < 0 || tail < 0) {
    find('order', 'SURFACE §8.1 is gone — the founding rules F1–F23 have no home');
    return;
  }
  const block = md.slice(head, tail);
  const defs = [...block.matchAll(/^- \*\*F(\d+) /gm)].map((m) => Number(m[1]));
  if (!defs.length) {
    find('order', '§8.1 defines no F-rule — every `F<n>` cited from CLAUDE.md, STYLE.md and scripts/ now dangles');
    return;
  }
  const want = Array.from({ length: 23 }, (_, i) => i + 1);
  if (defs.join(' ') !== want.join(' '))
    find('order', `§8.1 defines [${defs.map((n) => `F${n}`).join(' ')}]; the rule is F1–F23 in order — no id renumbered, added, removed, merged or split (Ed, twice)`);
  const elsewhere = [...md.replace(block, '').matchAll(/^- \*\*F(\d+) /gm)].map((m) => `F${m[1]}`);
  if (elsewhere.length)
    find('order', `founding rules defined outside §8.1: ${elsewhere.join(' ')} — §8.1 is the one place a founding rule is defined`);
  const known = new Set(defs.map((n) => `F${n}`));
  const cited = [...md.matchAll(/\bF(\d+)\b/g)].map((m) => `F${m[1]}`);
  const dangling = [...new Set(cited)].filter((id) => !known.has(id));
  if (dangling.length)
    find('order', `SURFACE.md cites ${dangling.join(' ')}, which §8.1 does not define`);
  note(`  ${defs.length} rules defined, F${defs[0]}–F${defs[defs.length - 1]}; ${cited.length} citations in the file, all resolving`);
}

/**
 * *A gate never withholds from the seat that set it* — SURFACE Y27, C8.
 *
 * Two halves, and each was a real failure before it was a rule. The founder
 * is exempt on both gates, which is what makes the judging surface reachable
 * from 🍾 without a card that may be hidden below ✒️, staged behind owed news
 * or remembered only in another browser. And *has this been acknowledged* has
 * **one** answer: the exemption lives in `acked`, so any site that asks it of
 * a gate through `S.okd` directly is asking a second, older question — which
 * is how the page would come to hold a gate that grants judging and still
 * stands in the rail as a task nothing waits on.
 *
 * Shape only: `spec-check` reads source text and cannot open a page. The
 * behaviour is a ladder document, founder seat, fresh profile.
 */
function checkGateSeat() {
  note('A gate never withholds from the seat that set it — SURFACE Y27 against the page');
  const page = js('design/session-view.html');
  if (!/const gateSelfSet = \(k\) => GATE_KEYS\.includes\(k\) && amFounder\(\);/.test(page))
    find('order', '`gateSelfSet` is not the founder on a gate key — SURFACE Y27 is the seat, not a per-document test');
  if (!/const acked = \(k\) => S\.okd\.has\(k\) \|\| gateSelfSet\(k\);/.test(page))
    find('order', '`acked` no longer carries the Y27 exemption — the founder is withheld their own gates again');
  const asks = [...page.matchAll(/c\.isGate[^\n]{0,60}?S\.okd[^\n]*/g)].map((m) => m[0].trim());
  for (const a of asks)
    find('order', `a gate's acknowledgement is read from S.okd directly (\`${a.slice(0, 60)}\`) — it must ask acked(), or Y27 is true in one place and false in another`);
  const gates = (page.match(/const GATE_KEYS = \[([^\]]*)\]/) || [])[1] || '';
  for (const k of ['canpropose', 'canjudge'])
    if (!gates.includes(`'${k}'`)) find('order', `GATE_KEYS does not hold '${k}'`);
  if (asks.length === 0) note(`  the exemption is the founder's seat; ${gates.split(',').length} gate keys, no gate reads S.okd behind acked()`);
}

/**
 * **An author is never asked about their own text against the incumbent**
 * (Ed, 2026-08-29, backlog 253; SPEC §3.3 / R-062, SURFACE E19) — one rule
 * spanning the engine and the page, so it is asserted at both ends.
 *
 * The engine half is source-pinned rather than behavioural, `spec-check`
 * having no way to run a session: what matters is *where* the exclusion sits
 * — inside the scan `bestPairFor` shares between its two passes, so the rival
 * pass sees it too, and inside `explorationCard`, which serves against the
 * incumbent by a second door and would otherwise re-open the one the first
 * closed. The behaviour is `packages/engine-core/test/session.test.ts`.
 *
 * The page half is the other end of the same rule. Q838 pinned the `E() > 1`
 * condition here, because at E = 1 the sole member was served their own text
 * and needed the card; that exception is overturned — at E = 1 the proposal
 * adopts on submission — so the skip is unconditional again and a condition
 * creeping back would draw a card the engine will never fill.
 */
function checkAuthorNeverAsked() {
  note('An author is never asked about their own text — SPEC §3.3 against engine and page');
  const src = readFileSync(join(ROOT, 'packages/engine-core/src/session.ts'), 'utf8');
  const at = src.indexOf('private bestPairFor(');
  const scan = at < 0 ? '' : src.slice(at, at + 1600);
  if (!/this\.ownIncumbentPair\(a, b, incumbentId, participantId\)/.test(scan))
    find('events', "`bestPairFor`'s pair scan no longer excludes the judge's own candidate against the incumbent — the preference is derived and the answer already held (SPEC §3.3, R-062, backlog 253)");
  else note('  the pair scan excludes the judge’s own incumbent pair');
  const ex = src.indexOf('private explorationCard(');
  const body = ex < 0 ? '' : src.slice(ex, ex + 900);
  if (!/this\.candidates\.get\(m\)\?\.author === participantId/.test(body))
    find('events', '`explorationCard` serves against the incumbent too, and no longer skips the participant’s own candidates (SPEC §3.3, backlog 253)');
  else note('  exploration skips the participant’s own candidates');
  const page = js('design/session-view.html');
  const pat = page.indexOf('function itemsFromView(');
  const items = pat < 0 ? '' : page.slice(pat, pat + 4000);
  if (!/r\.candidates\.every\(\(c\) => c\.mine\)\) continue;/.test(items))
    find('events', 'the all-mine skip in `itemsFromView` carries a condition again — the engine serves no pair for an all-mine race at any E, so E19 exempts nothing (backlog 253 overturns Q835)');
  else note('  the `mine` skip is unconditional');
}

/**
 * *Ground-shifted, not orphaned*, in one loop (R-058, backlog entry 160).
 *
 * The pen adoption and the ordinary one must rebase the field identically —
 * that is the whole of what makes a decree a ground shift rather than a
 * silent orphaning of everything in flight. The guarantee is structural: one
 * private `rebaseOthers`, called by both doors. A later edit that copies the
 * loop into `decreeText` would keep every test green on the day and drift
 * apart afterwards, one adoption rule at a time, which is exactly the failure
 * a behavioural test cannot see.
 *
 * `spec-check` reads source text and cannot run the engine, so only the shape
 * lives here; the behaviour is `packages/engine-core/test/pen-adoption.test.ts`.
 */
function checkPenRebase() {
  note('One rebase loop for both doors — R-058 against engine-core');
  const src = readFileSync(join(ROOT, 'packages/engine-core/src/session.ts'), 'utf8');
  const helper = 'private rebaseOthers(';
  if (!src.includes(helper)) {
    find('events', 'engine-core has no `rebaseOthers` helper — the pen adoption and the ordinary one must rebase the field through one loop (R-058)');
    return;
  }
  const at = src.indexOf('decreeText(');
  const body = at < 0 ? '' : src.slice(at, src.indexOf('\n  }', at));
  if (at < 0) {
    find('events', 'engine-core has no `decreeText` — ✒️ on the Text is SPEC §9.7 rule 8 (R-058)');
  } else if (!/this\.rebaseOthers\(/.test(body)) {
    find('events', '`decreeText` no longer calls `rebaseOthers` — a pen adoption that does not rebase the field orphans every proposal in flight (R-058)');
  } else if (/rebaseHunks\(/.test(body)) {
    find('events', '`decreeText` rebases with a loop of its own — there is one loop, so a pen adoption cannot drift from an ordinary one (R-058)');
  } else {
    note('  `decreeText` and `adopt` both reach the one loop');
  }
  const adoptAt = src.indexOf('private adopt(');
  const adopt = adoptAt < 0 ? '' : src.slice(adoptAt, src.indexOf('\n  }', adoptAt));
  if (adoptAt >= 0 && !/this\.rebaseOthers\(/.test(adopt)) {
    find('events', '`adopt` no longer calls `rebaseOthers` — the shared loop is only a guarantee while both callers use it (R-058)');
  }
  if (!/awaiting-assent/.test(body)) {
    find('events', "`decreeText` no longer refuses while a candidate is parked awaiting assent — a parked patch is not rebased, so a decree moves the document out from under it (R-056's one-at-a-time rule, R-058)");
  }
}

/**
 * Entry 138. The applicant's own 🪪 card says *Submitted. N of E have judged
 * it*, and N counted the roster rows whose `mAnsOk` held `'admission'` — the
 * **setting** key of the price card. Entry 96 moved every admit motion off
 * that card onto `adm:<applicant>`, so nothing has written the setting key
 * for an admit motion since: the readout could only read 0 until the motion
 * carried and then jump to E. The failure is silent — a fraction that reads
 * zero looks like a room that has not judged yet — and no walk renders the
 * applicant's own card (`applicants-walk` is a founder's eye, and the live
 * shim's `startApplication` throws, Q346), so this page-source assertion is
 * the only thing holding the two keys together.
 */
function checkApplicantJudged() {
  note('The applicant’s judged readout — entry 138 against the page');
  const page = js('design/session-view.html');
  const at = page.indexOf('const APPLICANT = {');
  // the whole getter, comment included; too short a window loses the
  // `judgedOn` call and goes red, never silently green
  const body = at < 0 ? '' : page.slice(at, at + 900);
  if (/mAnsOk\.has\('admission'\)/.test(body))
    find('events', "the applicant's readout counts `mAnsOk.has('admission')` again — entry 96 keys an applicant's motion `adm:<applicant>`, so the setting key can never fill the readout (entry 138)");
  else if (!/judgedOn\(rec, motionTargets\(rec\)\)/.test(body))
    find('events', "the applicant's readout no longer counts through `judgedOn(rec, motionTargets(rec))` — `motionTargets` is the one place an admit motion's key is spelled, and the readout must not spell it a second time (entry 138)");
  else note('  the readout counts on the motion’s own key');
}

/**
 * 🍾's power table covers every power-holder exactly once (entry 158).
 *
 * `BEGIN_ZONES` is the one place the page knows what a zone contains, and the
 * list it collects is handed to `begin` as **authoritative and complete over
 * `HELD`** — the fold applies it and does nothing else. So a key missing from
 * the table is a power silently kept past the start with no control anywhere
 * that says so, and a key in two zones is one the two switches disagree
 * about. Neither is visible on the surface: the card would draw three
 * perfectly ordinary rows.
 *
 * `HELD` is not exported from the bundle, so it is rebuilt from what is —
 * every `CATALOGUE` entry that is not personal, plus `DOORS` — and the page's
 * keys are page keys, so they are translated through SURFACE §4's own map,
 * which `checkKeys` has already asserted against the catalogue.
 */
function checkBeginZones(M, pm) {
  note('🍾’s power table — BEGIN_ZONES against the catalogue’s power-holders');
  const toId = new Map(tableAfter('SURFACE.md', 'keys').map((r) => [r['page key'], r.setting]));
  // the doors ride the page's own MID, having no catalogue row to map
  const idOf = (k) => pm.MID[k] || toId.get(k) || k;
  const want = new Set([
    ...M.CATALOGUE.filter((e) => e.kind !== 'personal').map((e) => e.id),
    ...M.DOORS,
  ]);
  const seen = new Map();
  for (const z of pm.BEGIN_ZONES) {
    for (const k of z.keys) {
      const id = idOf(k);
      if (!want.has(id)) find('begin', `BEGIN_ZONES puts '${k}' in ${JSON.stringify(z.name)}, which is not a power-holder`);
      else if (seen.has(id)) find('begin', `BEGIN_ZONES names '${k}' twice — ${JSON.stringify(seen.get(id))} and ${JSON.stringify(z.name)}`);
      else seen.set(id, z.name);
    }
  }
  for (const id of want) {
    if (!seen.has(id)) find('begin', `'${id}' carries a crown pair and is in no 🍾 zone — the start would keep it with nothing on the card saying so`);
  }
  note(`  ${pm.BEGIN_ZONES.length} zones, ${seen.size} of ${want.size} power-holders covered once each`);
}

function checkComposer(M, pm) {
  note('The composer maps — PROPOSE · ANSWER · MVAL · the rung values · PW_*');
  const page = js('design/session-view.html'); const setup = js('design/setup.js');
  const cards = [...page.matchAll(/\{ k: '([a-z-]+)', g: [^,]+, t: '[^']*',[^\n]*?kind: '([a-z]+)'/g)].map((m) => ({ k: m[1], kind: m[2] }));
  // 🧭 is a decision at the birth, not a setting (entry 166): no motion about
  // meeting-ness, nothing to compose. 🪪 was exempt here from the register
  // era, when it had no value — entry 94 made it a price and the exemption
  // hid its missing PROPOSE entry, so the settled card composed as free text.
  const composable = cards.filter((c) => c.kind !== 'personal' && c.k !== 'text' && c.k !== 'shape').map((c) => c.k);
  const propose = topKeys(objLit(page, 'PROPOSE'));
  for (const k of composable) if (!propose.includes(k)) find('composer', `'${k}' is composable but has no PROPOSE entry`);
  for (const k of propose) if (!composable.includes(k)) find('composer', `PROPOSE has '${k}', which is not a composable card`);
  const answer = topKeys(objLit(setup, 'ANSWER'));
  const delegable = M.CATALOGUE.filter((e) => e.delegable).map((e) => e.id);
  const pageKey = (id) => Object.entries(pm.MID).find(([, v]) => v === id)?.[0] || id;
  // **A setting can outlive its card** (R-078, 2026-08-29): `machines` stays
  // delegable in the catalogue so the golden and the live logs replay, but 🤖
  // left the surface, so nothing can delegate it and no member is ever asked
  // it — an ANSWER body for it would be copy nothing renders. Exact ids, never
  // a pattern, and re-adding the card removes the entry.
  const SURFACE_RETIRED = ['machines'];
  // …and the catalogue's own record of the same fact must be the same set
  // (entry 259, R-080). `retiredAnswer` is what 🍾 resolves a question nobody
  // can be asked at, and the module reads it as *this setting has no card*:
  // carried by a setting that still has one, it would hide a live collecting
  // question from `readiness` and let 🍾 answer it over the room's heads;
  // missing from one that has lost its card, a delegated question wedges the
  // start for ever, which is the defect R-080 exists to close.
  const withAnswer = M.CATALOGUE.filter((e) => e.retiredAnswer !== undefined).map((e) => e.id);
  for (const id of SURFACE_RETIRED) {
    if (!withAnswer.includes(id)) find('composer', `'${id}' has left the surface but carries no catalogue retiredAnswer — a delegated question on it would wedge 🍾 (R-080)`);
  }
  for (const id of withAnswer) {
    if (!SURFACE_RETIRED.includes(id)) find('composer', `'${id}' carries a retiredAnswer but is not surface-retired — 🍾 would answer a live question over the room (R-080)`);
  }
  for (const id of delegable) if (!SURFACE_RETIRED.includes(id) && !answer.includes(pageKey(id))) find('composer', `delegable '${id}' has no ANSWER body`);
  for (const k of answer) if (!delegable.includes(pm.MID[k] || k)) find('composer', `ANSWER has '${k}', which is not delegable`);
  // rung values: the member's ladder must offer exactly the catalogue's rungs (minus what the surface retired)
  const ans = objLit(setup, 'ANSWER');
  let ladders = 0;
  for (const e of M.CATALOGUE.filter((x) => x.rungs && x.delegable)) {
    const k = pageKey(e.id);
    const rungs = [...e.rungs].filter((r) => !(e.id === 'chamber' && r === 'public'));
    // **This check was dead until 2026-08-25**: `ANSWER`'s keys sit at four
    // spaces, not two, so every `indexOf` missed and the run reported *0
    // ladders compared* while claiming to assert the rungs. The rung pattern
    // was lowercase-only too, which no camelCase rung (`anonymousElective`)
    // could ever have matched. Both are anchored on `\s{2,}` / `\w` now.
    const at = ans.search(new RegExp(`\\n\\s{2,}${k}:`)); if (at < 0) continue;
    const next = ans.slice(at + 1).search(/\n\s{2,}[A-Za-z][A-Za-z0-9]*:\s*\(/);
    const block = ans.slice(at, next < 0 ? undefined : at + 1 + next);
    const vals = [...block.matchAll(/v: '([A-Za-z][A-Za-z0-9]*)'/g)].map((m) => m[1]);
    if (!vals.length) continue;
    ladders++;
    for (const r of rungs) if (!vals.includes(r)) find('composer', `ANSWER.${k} lacks rung '${r}'`);
    for (const v of vals) if (!rungs.includes(v)) find('composer', `ANSWER.${k} offers '${v}', which the catalogue does not (or the surface retired)`);
  }
  const pw = (n) => topKeys(objLit(page, n)).filter((x) => x !== '*');
  const noun = [...objLit(page, 'PW_NOUN').matchAll(/\b([a-z]+): '/g)].map((m) => m[1]);
  for (const k of propose.concat(['text'])) if (!['invite', 'remove'].includes(k) && !noun.includes(k)) find('composer', `PW_NOUN lacks '${k}'`);
  const base = pw('PW_PHRASE').sort().join(' ');
  // PWWHY left this list with the table itself (T43, Ed 2026-09-01: a power
  // card carries no why — the head and the two blocks state the rule)
  for (const n of ['PW_OPTS']) {
    const got = pw(n).sort().join(' ');
    if (got !== base) find('composer', `${n} keys (${got}) differ from PW_PHRASE's (${base})`);
  }
  // **A lane the composer draws must have a typed value behind it.** `mvalTyped`
  // looks a lane's label up in `MVAL`; a lane with no key there types nothing,
  // `draftPayload` throws *no typed value on the draft*, and the 🏛️ hold ends at
  // *That could not be proposed*. It has happened twice — 🥾's three rungs
  // spelled `PRICE_WORDS`' way, and 🤝's four lanes against two typable values
  // after entry 94 made the setting a switch — and neither was visible to any
  // check: `copy-check` saw both and froze them as ordinary copy.
  // **A rung whose lane label is the clause sentence spells neither side
  // here** (Q1112 (b)): `MVAL.admission` is `priceMval('admission')` and
  // `PROPOSE.admission` draws `ruleLanes('admission')`, both off `cards.js`'s
  // one `RULES` table, so the two agree by construction rather than by two
  // spellings matching. Both forms are resolved through that table rather
  // than skipped: what is left to catch is a list pointed at the **wrong
  // setting**, which is the same half-done-rename shape in a new dress — and
  // a `lanesFor` argument this cannot resolve is still a finding, never a
  // silent pass.
  const rules = new Map(keyBodies(uncomment(objLit(js('design/cards.js'), 'RULES')))
    .map(([k, b]) => [k, [...b.matchAll(/:\s*'((?:\\.|[^'\\])*)'/g)].map((m) => m[1])]));
  const ruleSays = (fn, arg) => {
    const m = arg.match(new RegExp(`^${fn}\\('([A-Za-z]+)'\\)$`));
    return m ? (rules.get(m[1]) || null) : null;
  };
  const mvalKeys = (b) => [...b.matchAll(/'((?:\\.|[^'\\])*)'\s*:\s*\{/g)].map((m) => m[1]);
  const mval = new Map(keyBodies(uncomment(objLit(page, 'MVAL'))).map(([k, b]) => {
    const derived = ruleSays('priceMval', (b.split(':').slice(1).join(':').trim().replace(/,\s*$/, '')));
    return [k, derived || mvalKeys(b)];
  }));
  const lanes = new Map(); let laneLabels = 0;
  for (const [k, raw] of keyBodies(uncomment(objLit(page, 'PROPOSE')))) {
    const body = raw; const found = [];
    for (const m of body.matchAll(/lanesFor\(/g)) {
      const arg = (argsAt(body, m.index + m[0].length - 1)[1] || '').trim();
      const derived = ruleSays('ruleLanes', arg);
      if (derived) { found.push(...derived); continue; }
      let lit = null;
      if (arg.startsWith('[')) lit = arg;
      else if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(arg)) lit = arrRaw(uncomment(page), arg);
      // a lanesFor argument that cannot be resolved is a finding, never a
      // silent skip — a checker that quietly compares nothing is the failure
      // ANSWER's ladder check already had once
      if (!lit) { find('composer', `PROPOSE.${k} calls lanesFor with '${arg}', which this check cannot resolve to a lane list`); continue; }
      for (const p of lit.matchAll(/\[\s*'((?:\\.|[^'\\])*)'\s*,/g)) found.push(p[1]);
    }
    if (found.length) { lanes.set(k, found); laneLabels += found.length; }
  }
  // …and a `RULES` table nothing reads is the other way this could go quiet
  for (const k of ['admission', 'removal']) {
    if (!(rules.get(k) || []).length) find('composer', `cards.js's RULES.${k} yields no sentences — MVAL.${k} and PROPOSE.${k} both resolve through it`);
  }
  for (const [k, labels] of lanes) {
    const keys = mval.get(k) || [];
    for (const l of labels) if (!keys.includes(l)) find('composer', `PROPOSE.${k} draws the lane '${l}', which MVAL.${k} does not key — picking it types no value, so the 🏛️ hold ends at *That could not be proposed*`);
    // the other side of a half-done rename, which is how the 🥾 instance arose.
    // Scoped to settings that draw lanes: MVAL.admission legitimately has no
    // PROPOSE entry at all, and flagging it would be noise.
    for (const key of keys) if (!labels.includes(key)) find('composer', `MVAL.${k} keys '${key}', which no lane of PROPOSE.${k} offers — nothing can ever type it`);
  }
  note(`  ${propose.length} composable; ${answer.length} answer bodies; ${ladders} ladders compared; ` +
    `${lanes.size} lane lists, ${laneLabels} labels against MVAL`);
}

/* What a picture may be — SURFACE.md §9 against the page's sink and the
   server's gate (Q734, 2026-08-23). The two ends of this had drifted before
   anybody looked: the picker had stopped offering the grounds while both the
   renderer and the validator still carried them, so a format the surface
   could not make was one the store would still accept. The table names the
   shapes; this asserts nothing else renders and nothing else is let in. */
function checkPicture() {
  note('What a picture may be — SURFACE.md §9 against the page and the server');
  const rows = tableAfter('SURFACE.md', 'picture');
  const said = rows.map((r) => (r['stored as'].match(/`([a-z])`\+/) || [])[1]).filter(Boolean);
  const cmd = read('packages/server/src/commands.ts');
  const setup = js('design/setup.js');
  // `avHtml` lives in `cards.js` since backlog 255 — the sealed speaker draws a
  // face, and the two files share the renderer — so the sink is read there and
  // the retired shapes are looked for in both halves of the page.
  const cards = js('design/cards.js');
  const page = setup + '\n' + cards;
  const accepted = [];
  if (/pic\.startsWith\('e'\)/.test(cmd)) accepted.push('e');
  if (/\^udata:image\\\//.test(cmd)) accepted.push('u');
  // avHtml's own branches: what the sink will draw as something other than nobody
  const drawn = [...new Set([...cards.matchAll(/pic\[0\] === '([a-z])'/g)].map((m) => m[1]))];
  const same = (a, b) => [...a].sort().join('') === [...b].sort().join('');
  if (!same(said, accepted)) {
    find('picture', `SURFACE names ${said.join('/')}; the server accepts ${accepted.join('/') || 'nothing'}`);
  }
  if (!same(said, drawn)) {
    find('picture', `SURFACE names ${said.join('/')}; avHtml draws ${drawn.join('/') || 'nothing'}`);
  }
  // the retired shapes, named so a re-addition is red rather than quiet
  for (const [where, src] of [['the server', cmd], ['the page', page]]) {
    for (const gone of [/c\[0-5\]/, /m\[0-2\]/, /GROUNDS/, /MARKS\b/]) {
      if (gone.test(src)) find('picture', `${where} still carries the retired ${gone} (Q734)`);
    }
  }
  // **The encoder's ceiling and the gate's are one number stated twice.** The
  // uploader steps its JPEG quality down until the stored string fits
  // `PIC_MAX_STORED`, precisely so a picture cannot preview and then fail on
  // Save; raise `LIMITS.picture` without the page and the ladder refuses
  // pictures the server would take, lower it and the defect comes back.
  const srvCap = (cmd.match(/picture:\s*([\d_]+)/) || [])[1];
  const pageCap = (setup.match(/PIC_MAX_STORED\s*=\s*([\d_]+)/) || [])[1];
  if (!srvCap || !pageCap) find('picture', 'the picture cap is not stated in both commands.ts and setup.js');
  else if (Number(srvCap.replace(/_/g, '')) !== Number(pageCap.replace(/_/g, ''))) {
    find('picture', `the server caps a picture at ${srvCap} and the uploader encodes to ${pageCap}`);
  }
  note(`  ${said.length} stored shapes: ${said.join(' · ')}; capped at ${srvCap} both ends; the grounds and marks are gone`);
}

function checkBannedWords() {
  note('Banned words — STYLE.md §1–2 over every file a member reads from');
  const files = ['design/cards.js', 'design/session.js', 'design/setup.js', 'design/session-view.html'];
  const banned = BANNED;
  for (const f of files) {
    // comments are exempt (CLAUDE.md: code comments may cite the spec); class names in markup are not copy
    const src = js(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/([^:])\/\/ .*$/gm, '$1');
    // only string literals count: single- or double-quoted, on one line, and long enough to be a sentence
    for (const m of src.matchAll(/(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
      const lit = m[2].replace(/class="[^"]*"/g, '').replace(/\bclass=\\"[^"]*\\"/g, '');
      if (lit.length < 12 || bannedOk(lit)) continue;
      for (const b of banned) if (b.test(lit)) { find('copy', `${f}: "${lit.slice(0, 70)}" — ${b}`); break; }
    }
  }
}

/**
 * The list-joiner — STYLE.md §1, Q630 (Ed, 2026-08-26: *add one shared
 * list-joiner and use it at every site that names several settings*). Since
 * Q626 the founder's 🍾 readout can name several delegated questions at once,
 * and seven sentences on the page joined them by hand with `' and '`, so
 * three of anything read *A and B and C*. The shape of a list of three is a
 * copy decision — commas and a final *and*, no serial comma — and a decision
 * made at seven sites is seven decisions, so `listOf` in `design/setup.js` is
 * the only speller of it.
 *
 * Three claims. The **hand-rolled join is gone** from every file a member
 * reads from, which is the same four-file corpus `checkBannedWords` audits
 * and is stripped of comments the same way (block comments blanked rather
 * than deleted, so the line number a finding reports is the line in the
 * file). `listOf` **is defined and exported** by `design/setup.js`, since the
 * page destructures it off `window.SETUP`. And the helper's own **behaviour**
 * is asserted by lifting its source and running it in a `vm`, the way the
 * catalogue bundle is loaded above — no walk can reach a three-item list (the
 * `card-audit` walks all found a document of one), so this is the only place
 * the comma is pinned at all.
 *
 * The corpus is deliberately the member-facing four rather than only the
 * files with sites today: the rule is about copy, not about a function. A
 * join in one of them that is *not* copy would go red here and want a word in
 * the finding rather than a silent exemption.
 */
function checkListJoiner() {
  note('The list-joiner — STYLE.md §1 over every file a member reads from (Q630)');
  const files = ['design/cards.js', 'design/session.js', 'design/setup.js', 'design/session-view.html'];
  let sites = 0; let hand = 0;
  for (const f of files) {
    // comments exempt, and **line numbers preserved**, which is why the block
    // comment is blanked rather than deleted and the line comment's own
    // indent is `[ \t]*` rather than `\s*` — `\s` eats the newlines above it,
    // and a finding that names the wrong line sends the reader to the wrong
    // sentence
    const src = js(f).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/^[ \t]*\/\/.*$/gm, '').replace(/([^:])\/\/ .*$/gm, '$1');
    for (const m of src.matchAll(/\.join\((['"]) and \1\)/g)) {
      hand++;
      const line = src.slice(0, m.index).split('\n').length;
      find('copy', `${f}:${line} joins a list with ' and ' by hand — three of anything reads "A and B and C"; the shape is STYLE.md §1's and \`listOf\` is its only speller (Q630)`);
    }
    sites += [...src.matchAll(/\blistOf\(/g)].length;
  }
  const setup = js('design/setup.js');
  const def = setup.match(/ {2}const listOf = [\s\S]*?\n {2}\};/);
  if (!def) { find('copy', 'design/setup.js no longer defines `listOf` — the one joiner every list sentence goes through (Q630)'); return; }
  if (!/\blistOf\b/.test(setup.slice(setup.lastIndexOf('  return {')))) {
    find('copy', 'design/setup.js defines `listOf` but does not export it on `window.SETUP` — the page destructures it there');
  }
  const ctx = {};
  vm.runInNewContext(def[0].replace(/^ {2}const/, 'const') + '\nout = [listOf([]), listOf([\'A\']), listOf([\'A\',\'B\']), listOf([\'A\',\'B\',\'C\']), listOf([\'A\',\'\',\'C\'])];', ctx);
  const want = ['', 'A', 'A and B', 'A, B and C', 'A and C'];
  const got = ctx.out;
  for (let i = 0; i < want.length; i++) {
    if (got[i] !== want[i]) find('copy', `listOf case ${i} gives "${got[i]}", not "${want[i]}" — STYLE.md §1 says A, B and C, with no serial comma (Q630)`);
  }
  note(`  ${sites} call sites, ${hand} hand-rolled; the joiner gives ${want.map((w) => `"${w}"`).join(' · ')}`);
}

/**
 * Every tracked source file, read once, as one haystack — the oracle a
 * `[symbol]` entry has to appear in. **Markdown is excluded deliberately**:
 * `design/DECISIONS.md` carries the glossary's own prose, so grepping it
 * makes every name resolve against its own definition and the check becomes
 * a no-op for exactly the entries it exists to catch. `flat` is the same
 * corpus lower-cased with hyphens dropped, so a kebab-case entry still finds
 * its camelCase identifier (`birth-pass` → `birthPass`).
 */
let CORPUS = null;
function sourceCorpus() {
  if (CORPUS) return CORPUS;
  const files = execSync('git ls-files -- packages scripts design docs package.json',
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 })
    // `design/spec-pass/` is prose in HTML clothing — a pass artifact quotes
    // the glossary's own names, so leaving it in lets six `[symbol]` entries
    // resolve against a questions document rather than against any code
    .split('\n').filter((f) => f && !f.endsWith('.md') && !f.startsWith('design/spec-pass/'));
  const exact = [files.join('\n'), ...files.map((f) => {
    try { return readFileSync(join(ROOT, f), 'utf8'); } catch { return ''; }
  })].join('\n');
  CORPUS = { exact, flat: exact.toLowerCase().replace(/-/g, '') };
  return CORPUS;
}

/**
 * CLAUDE.md's own shape (Q730, 2026-08-23). The file is loaded whole into
 * every session and had no enforcement of any kind, while the two smaller
 * documents it duplicated were already checked here. Two prior extractions
 * each pulled ~55 KB out and the file regrew past its pre-extraction size
 * within two days, because extraction without an admission rule only resets
 * the clock. Five assertions hold the rule in *What goes in this file*:
 *
 *  - every glossary bullet, at any depth, names something and declares its
 *    kind, and no Gotchas bullet leads with one — which is what keeps the two
 *    lists from re-merging into one. A bullet that names nothing is a rule, a
 *    reason or a gotcha, and each of those has a home elsewhere (Q737)
 *  - no glossary entry runs past ENTRY_CAP characters (Q737). The cap is
 *    roughly the median entry plus a third: a name, a one-line job and
 *    pointers fit inside it and a second sentence does not, which is the
 *    admission rule stated as a number
 *  - no gotcha that names an automated guard runs past ENTRY_CAP either
 *    (Q736, the eviction rule): what stops the mistake recurring is the red
 *    build, not the paragraph, so a guarded gotcha keeps the failure and the
 *    guard and sends its post-mortem to design/DECISIONS.md. The fix is
 *    always to move the post-mortem, never to stop naming the guard
 *  - `file` and `symbol` kinds resolve, against source files only — see
 *    `sourceCorpus` for why prose cannot be allowed to answer; `concept` is
 *    unchecked on purpose,
 *    since `overlap-gates`, `coherence-auditor` and `spectator-api`
 *    legitimately name ideas and planned parts rather than identifiers, and a
 *    naive every-name-appears-in-code rule would be wrong about all three
 *  - every SPEC §, SURFACE § and STYLE.md T pointer lands on something real
 *
 * Q numbers are deliberately **not** checked. QUESTIONS.md deletes an item
 * once it is folded, so a Q reference here cites a decision rather than
 * indexing a live entry; 7 of the 62 in the file today name numbers that are
 * gone by that rule, and asserting them would make the checker red for
 * doing what the numbering rules say to do.
 */
function checkClaudeMd() {
  note('CLAUDE.md — the glossary shape, the entry kinds, the pointers');
  const lines = read('CLAUDE.md').split(/\r?\n/);
  const idx = (p) => lines.findIndex((l) => l.startsWith(p));
  const gloss = idx('## Glossary'), gotcha = idx('## Gotchas'), end = idx('## The spec pass');
  if (gloss < 0 || gotcha < 0 || end < 0) return find('claude', 'the Glossary / Gotchas / spec-pass sections are not all present');

  const NAMED = /^\s*- `([^`]+)`[^—]*\[(file|symbol|concept)\]/;
  const ENTRY_CAP = 400;
  const entries = [];
  for (const l of lines.slice(gloss, gotcha)) {
    if (!/^\s*- /.test(l)) continue;
    const m = l.match(NAMED);
    if (!m) {
      // a bullet that opens with a backticked name but declares no kind, and a
      // bullet that names nothing at all, are the same failure at two depths
      find('claude', /^\s*- `/.test(l)
        ? `glossary bullet names something and declares no kind: ${l.trim().slice(0, 70)}`
        : `glossary bullet names nothing — it is a rule, a reason or a gotcha (SURFACE/SPEC/STYLE · DECISIONS · Gotchas): ${l.trim().slice(0, 70)}`);
      continue;
    }
    entries.push({ name: m[1], kind: m[2] });
    if (l.length > ENTRY_CAP) {
      find('claude', `glossary entry \`${m[1]}\` is ${l.length} chars, past the ${ENTRY_CAP} cap — send the rule, reason or post-mortem to its own file: ${l.trim().slice(0, 70)}`);
    }
  }
  note(`  ${entries.length} glossary entries`);

  // A gotcha entry is a top-level bullet plus its indented continuation lines.
  // Only the guarded ones are capped; an unguarded gotcha is capped by nothing,
  // because those are the ones that earn their place (Ed, Q723–731).
  // A named guard is a named *invocation*: an npm script, or a tool run by
  // hand. A bare tool name is not enough — half the file mentions the probes in
  // order to say what they do not cover, and a checker that cries wolf on prose
  // is worse than none.
  const GUARD = /spec-check|npm run|node scripts\/|node design\/tools\/|asserted by test|parity test|golden log|fails on the pre-fix|pinned by a server test/;
  const gotchas = [];
  for (const l of lines.slice(gotcha, end)) {
    if (/^\s*- `/.test(l)) find('claude', `Gotchas bullet leads with a backticked name — it belongs in the glossary: ${l.slice(0, 70)}`);
    // a nested bullet is a gotcha in its own right, measured on its own text:
    // folding it into its parent both misnames the offender and lets one child's
    // guard make the whole family guarded
    if (/^\s*- /.test(l)) gotchas.push({ head: l.trim().slice(2, 70), len: l.length + 1, buf: l });
    else if (gotchas.length && /^\s+\S/.test(l)) { const g = gotchas[gotchas.length - 1]; g.len += l.length + 1; g.buf += ` ${l}`; }
  }
  for (const g of gotchas) {
    if (!GUARD.test(g.buf) || g.len <= ENTRY_CAP) continue;
    find('claude', `guarded gotcha is ${g.len} chars, past the ${ENTRY_CAP} cap — move the post-mortem to design/DECISIONS.md, keeping the failure and the guard (never stop naming the guard): ${g.head}`);
  }
  note(`  ${gotchas.length} gotchas, ${gotchas.filter((g) => GUARD.test(g.buf)).length} of them guarded`);

  const roots = ['', 'design/', 'design/tools/', 'packages/', 'scripts/', 'docs/'];
  const code = sourceCorpus();
  for (const { name, kind } of entries) {
    if (kind === 'concept') continue;
    if (kind === 'file') {
      if (!roots.some((r) => existsSync(join(ROOT, r + name)))) find('claude', `[file] \`${name}\` is not a path in the repo`);
      continue;
    }
    if (!code.exact.includes(name) && !code.flat.includes(name.toLowerCase().replace(/-/g, ''))) {
      find('claude', `[symbol] \`${name}\` appears in no source file — it names an idea, so it is [concept]`);
    }
  }

  const src = lines.join('\n');
  const cache = new Map();
  const has = (rel, re) => { if (!cache.has(rel)) cache.set(rel, read(rel)); return re.test(cache.get(rel)); };
  for (const n of new Set([...src.matchAll(/SPEC §([0-9]+(?:\.[0-9]+)*[a-z]?)/g)].map((m) => m[1]))) {
    // a top-level section is a heading; a subsection is a bold-led line, `**9.5a Lapsing.**`
    const esc = n.replace(/\./g, '\\.');
    const re = n.includes('.') ? new RegExp(`^\\*\\*${esc}[. ]`, 'm') : new RegExp(`^#+ ${esc}\\. `, 'm');
    if (!has('SPEC.md', re)) find('claude', `SPEC §${n} points at no section of SPEC.md`);
  }
  for (const n of new Set([...src.matchAll(/SURFACE §([0-9]+(?:\.[0-9]+)*)/g)].map((m) => m[1]))) {
    if (!has('SURFACE.md', new RegExp(`^#+ ${n.replace(/\./g, '\\.')}[. ]`, 'm'))) find('claude', `SURFACE §${n} points at no section of SURFACE.md`);
  }
  // § and T are two numbering schemes over one file — eight sections and
  // T1–T35 — so they have to be asked separately. Accepting either for either
  // is what makes `STYLE.md §20` resolve against rule T20 and the check a
  // no-op for exactly the drift it is for.
  for (const p of new Set([...src.matchAll(/STYLE\.md (§|T)([0-9]+)/g)].map((m) => m[1] + m[2]))) {
    const mark = p[0], n = p.slice(1);
    const re = mark === 'T' ? new RegExp(`^\\| T${n} \\|`, 'm') : new RegExp(`^## ${n}\\. `, 'm');
    if (!has('design/STYLE.md', re)) find('claude', `STYLE.md ${mark}${n} points at no ${mark === 'T' ? 'rule' : 'section'} of design/STYLE.md`);
  }
}

/**
 * A raw NUL byte in the first 8000 bytes of a file makes git call the whole
 * file binary, and a binary file has no three-way merge: two branches that
 * touch it conflict entirely, however far apart their edits sit. It is not a
 * hypothetical — it stranded the production plan's branch, whose only quarrel
 * with main was two test cases in different halves of pg.test.ts.
 *
 * So the rule is the *window*, not the byte. The sentinels in session-view.html
 * are deliberate (see this file's own header) and live well past 8000, where
 * git never looks. Anywhere nearer the top, write the escape `\u0000`: the
 * string is identical at runtime and the file still merges.
 */
function checkMergeable() {
  const WINDOW = 8000; // git's FIRST_FEW_BYTES, in xdiff/xutils.c
  const files = execSync('git ls-files -- packages scripts design docs package.json',
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 })
    .split('\n').filter((f) => f && /\.(ts|js|mjs|cjs|html|css|json|md|ya?ml)$/.test(f));
  let seen = 0;
  for (const f of files) {
    let b;
    try { b = readFileSync(join(ROOT, f)); } catch { continue; }
    seen++;
    const i = b.subarray(0, WINDOW).indexOf(0);
    if (i < 0) continue;
    const line = b.subarray(0, i).toString('utf8').split('\n').length;
    find('mergeable', `${f}:${line} holds a raw NUL in git's first ${WINDOW} bytes — git will call the file binary and refuse to merge it; write the escape instead`);
  }
  note(`  ${seen} source files hold no merge-blocking NUL`);
}

checkMarks();
checkWallets(pm);
checkOrder(pm);
checkFIds();
checkGateSeat();
checkAuthorNeverAsked();
checkPenRebase();
checkApplicantJudged();
checkBeginZones(M, pm);
checkComposer(M, pm);
checkPicture();
checkBannedWords();
checkListJoiner();
checkClaudeMd();
checkMergeable();

console.log(findings.length ? `\n${findings.length} disagreement(s)` : '\nspec and code agree');
process.exit(findings.length ? 1 : 0);
