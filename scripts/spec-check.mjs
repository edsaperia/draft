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
  for (const [, k, v] of s.match(/const MID = \{([^}]*)\}/)[1].matchAll(/([a-z]+): '([A-Za-z]+)'/g)) mid[k] = v;
  const cards = [...new Set([...s.matchAll(/\{ k: '([a-z-]+)'/g)].map((x) => x[1]))];
  return { ORDER: arr('ORDER'), ACK_KEYS: grant.concat(arr('ACK_KEYS')), CHOSEN: objKeys('CHOSEN'),
    PROPOSE: objKeys('PROPOSE'), MID: mid, cards };
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
const objLit = (src, name) => {
  const i = src.indexOf(`const ${name} = {`);
  if (i < 0) throw new Error(`${name} not found`);
  let depth = 0; let j = src.indexOf('{', i);
  for (; j < src.length; j++) { if (src[j] === '{') depth++; else if (src[j] === '}' && --depth === 0) break; }
  return src.slice(i, j + 1);
};
const topKeys = (body) => [...body.matchAll(/^\s{2,4}'?([A-Za-z][A-Za-z0-9-]*)'?:/gm)].map((x) => x[1]);

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
  const pen = numLit(page, 'PEN_HOLD_MS'); const assembly = numLit(page, 'HOLD_MS'); const propose = numLit(sess, 'HOLD_MS');
  const holds = tableAfter('SURFACE.md', 'holds');
  const want = (ctl) => +((holds.find((h) => h.control.startsWith(ctl)) || {})['hold ms'] || NaN);
  if (want('🪶') !== pen || want('✒️') !== pen || want('🍾') !== pen) find('holds', `PEN_HOLD_MS is ${pen}; the ladder says 🪶 ${want('🪶')} ✒️ ${want('✒️')} 🍾 ${want('🍾')}`);
  if (want('✏️ Propose (a draft') !== propose) find('holds', `the charter's HOLD_MS is ${propose}; the ladder says ${want('✏️ Propose (a draft')}`);
  if (want('🏛️') !== assembly) find('holds', `the assembly HOLD_MS is ${assembly}; the ladder says ${want('🏛️')}`);
  if (holds.some((h) => h.control.startsWith('✏️ Propose (a motion')) && !/data-putmotion/.test(page.slice(page.indexOf('const holdWallet')))) find('holds', 'the motion ✏️ Propose is not a hold in holdWallet (Q614)');
  if (!/floorAt(?::| \|\|) 250/.test(page)) find('holds', 'the pen release floor (250) not found');
  if (!/floorAt: 864/.test(sess)) find('holds', 'the pencil release floor (864) not found');
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
  note(`  ${rows.length} wallets; holds 🪶✒️🍾 ${pen} · ✏️ ${propose} · 🏛️ ${assembly}`);
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
  const hosts = { 'grant-pen': 'lead', 'grant-shield': 'lead', 'grant-voice': null, title: 'lead', slug: 'lead', myemail: 'lead', chamber: 'lead' };
  for (const r of rows) {
    const want = r.section.split(/[,—(]/)[0].trim();
    const got = (r.key in hosts) ? hosts[r.key] : secOf(r.key);
    if (got === null) continue;
    if (got !== want) find('order', `${r.key}: table puts it in '${want}', SEC puts it in '${got || '(none)'}'`);
  }
  const blocks = page.match(/const blocksOrder = \(p\) => \(?p\.k === '([a-z-]+)'/);
  const blocker = blocks ? blocks[1] : null;
  const gates = [...page.matchAll(/\{ k: '([a-z-]+)',[^\n]*isGate: true/g)].map((m) => m[1]);
  for (const r of rows) {
    const isGate = gates.includes(r.key);
    const want = r['blocks?'] === 'yes';
    const got = isGate ? r.key === blocker : true;
    if (want !== got) find('order', `${r.key}: table says blocks=${r['blocks?']}, blocksOrder says ${got}`);
  }
  const glyphs = {};
  for (const m of page.matchAll(/\{ k: '([a-z-]+)', g: '([^']+)'/g)) glyphs[m[1]] = m[2];
  for (const r of rows) if (glyphs[r.key] && glyphs[r.key] !== r.glyph) find('order', `${r.key}: glyph ${r.glyph} vs the card's ${glyphs[r.key]}`);
  // F16, the half a table cannot hold (Q639): ✒️ and 🛡️ write no clause of
  // their own — the count they used to state is already on every setting
  // `holderLine` touches and on the wallet's own tooltip — and each is the
  // holder's alone, which is E8's audience column. Both are one-line
  // predicates that a refactor could drop without anything else noticing.
  if (/holds the (pen|shield) on '/.test(page))
    find('order', 'the pen or shield clause is back — F16 retires it: the count is already stated per setting and on the wallet');
  for (const k of ['grant-pen', 'grant-shield']) {
    const def = page.slice(page.indexOf(`{ k: '${k}',`), page.indexOf(`{ k: '${k}',`) + 900);
    if (!/hide: \(\) => !amFounder\(\)/.test(def))
      find('order', `${k} is not hidden from a non-founder — E8 gives a grant to the holder, and a member cannot acknowledge somebody else's power`);
  }
  note(`  ${rows.length} steps; blocking grant: ${blocker}; ${secs.length} sections`);
}

function checkComposer(M, pm) {
  note('The composer maps — PROPOSE · ANSWER · the rung values · PW_*');
  const page = js('design/session-view.html'); const setup = js('design/setup.js');
  const cards = [...page.matchAll(/\{ k: '([a-z-]+)', g: [^,]+, t: '[^']*',[^\n]*?kind: '([a-z]+)'/g)].map((m) => ({ k: m[1], kind: m[2] }));
  const composable = cards.filter((c) => c.kind !== 'personal' && c.k !== 'text' && c.k !== 'roster').map((c) => c.k);
  const propose = topKeys(objLit(page, 'PROPOSE'));
  for (const k of composable) if (!propose.includes(k)) find('composer', `'${k}' is composable but has no PROPOSE entry`);
  for (const k of propose) if (!composable.includes(k)) find('composer', `PROPOSE has '${k}', which is not a composable card`);
  const answer = topKeys(objLit(setup, 'ANSWER'));
  const delegable = M.CATALOGUE.filter((e) => e.delegable).map((e) => e.id);
  const pageKey = (id) => Object.entries(pm.MID).find(([, v]) => v === id)?.[0] || id;
  for (const id of delegable) if (!answer.includes(pageKey(id))) find('composer', `delegable '${id}' has no ANSWER body`);
  for (const k of answer) if (!delegable.includes(pm.MID[k] || k)) find('composer', `ANSWER has '${k}', which is not delegable`);
  // rung values: the member's ladder must offer exactly the catalogue's rungs (minus what the surface retired)
  const ans = objLit(setup, 'ANSWER');
  let ladders = 0;
  for (const e of M.CATALOGUE.filter((x) => x.rungs && x.delegable)) {
    const k = pageKey(e.id);
    const rungs = [...e.rungs].filter((r) => !(e.id === 'chamber' && r === 'public'));
    const at = ans.indexOf(`\n  ${k}:`); if (at < 0) continue;
    const next = ans.slice(at + 1).search(/\n  [a-z]+:/);
    const block = ans.slice(at, next < 0 ? undefined : at + 1 + next);
    const vals = [...block.matchAll(/v: '([a-z]+)'/g)].map((m) => m[1]);
    if (!vals.length) continue;
    ladders++;
    for (const r of rungs) if (!vals.includes(r)) find('composer', `ANSWER.${k} lacks rung '${r}'`);
    for (const v of vals) if (!rungs.includes(v)) find('composer', `ANSWER.${k} offers '${v}', which the catalogue does not (or the surface retired)`);
  }
  const pw = (n) => topKeys(objLit(page, n)).filter((x) => x !== '*');
  const noun = [...objLit(page, 'PW_NOUN').matchAll(/\b([a-z]+): '/g)].map((m) => m[1]);
  for (const k of propose.concat(['text'])) if (!['invite', 'remove'].includes(k) && !noun.includes(k)) find('composer', `PW_NOUN lacks '${k}'`);
  const base = pw('PW_PHRASE').sort().join(' ');
  for (const n of ['PWWHY', 'PW_OPTS']) {
    const got = pw(n).sort().join(' ');
    if (got !== base) find('composer', `${n} keys (${got}) differ from PW_PHRASE's (${base})`);
  }
  note(`  ${propose.length} composable; ${answer.length} answer bodies; ${ladders} ladders compared`);
}

/* What a picture may be — SURFACE.md §9 against the page's sink and the
   server's gate (Q687, 2026-08-23). The two ends of this had drifted before
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
  const accepted = [];
  if (/pic\.startsWith\('e'\)/.test(cmd)) accepted.push('e');
  if (/\^udata:image\\\//.test(cmd)) accepted.push('u');
  // avHtml's own branches: what the sink will draw as something other than nobody
  const drawn = [...new Set([...setup.matchAll(/pic\[0\] === '([a-z])'/g)].map((m) => m[1]))];
  const same = (a, b) => [...a].sort().join('') === [...b].sort().join('');
  if (!same(said, accepted)) {
    find('picture', `SURFACE names ${said.join('/')}; the server accepts ${accepted.join('/') || 'nothing'}`);
  }
  if (!same(said, drawn)) {
    find('picture', `SURFACE names ${said.join('/')}; avHtml draws ${drawn.join('/') || 'nothing'}`);
  }
  // the retired shapes, named so a re-addition is red rather than quiet
  for (const [where, src] of [['the server', cmd], ['the page', setup]]) {
    for (const gone of [/c\[0-5\]/, /m\[0-2\]/, /GROUNDS/, /MARKS\b/]) {
      if (gone.test(src)) find('picture', `${where} still carries the retired ${gone} (Q687)`);
    }
  }
  note(`  ${said.length} stored shapes: ${said.join(' · ')}; the grounds and marks are gone from both ends`);
}

function checkBannedWords() {
  note('Banned words — STYLE.md §1–2 over every file a member reads from');
  const files = ['design/cards.js', 'design/session.js', 'design/setup.js', 'design/session-view.html'];
  const banned = [/SPEC §/, /\(§\d/, /\broster\b/, /\bparticipant\b/, /\bthe Founder[’']s OK\b/, /\bcarried change/];
  for (const f of files) {
    // comments are exempt (CLAUDE.md: code comments may cite the spec); class names in markup are not copy
    const src = js(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/([^:])\/\/ .*$/gm, '$1');
    // only string literals count: single- or double-quoted, on one line, and long enough to be a sentence
    for (const m of src.matchAll(/(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
      const lit = m[2].replace(/class="[^"]*"/g, '').replace(/\bclass=\\"[^"]*\\"/g, '');
      if (lit.length < 12) continue;
      for (const b of banned) if (b.test(lit)) { find('copy', `${f}: "${lit.slice(0, 70)}" — ${b}`); break; }
    }
  }
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
 * the clock. Three assertions hold the rule in *What goes in this file*:
 *
 *  - every glossary bullet that names something leads with a backticked name
 *    and declares its kind, and no Gotchas bullet leads with one — which is
 *    what keeps the two lists from re-merging into one
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
  const entries = [];
  for (const l of lines.slice(gloss, gotcha)) {
    if (!/^\s*- /.test(l)) continue;
    const m = l.match(NAMED);
    if (m) { entries.push({ name: m[1], kind: m[2] }); continue; }
    // a bullet that opens with a backticked name but declares no kind
    if (/^\s*- `/.test(l)) find('claude', `glossary bullet names something and declares no kind: ${l.trim().slice(0, 70)}`);
  }
  note(`  ${entries.length} glossary entries`);

  for (const l of lines.slice(gotcha, end)) {
    if (/^\s*- `/.test(l)) find('claude', `Gotchas bullet leads with a backticked name — it belongs in the glossary: ${l.slice(0, 70)}`);
  }

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
  for (const [, mark, n] of src.matchAll(/STYLE\.md (§|T)([0-9]+)/g)) {
    const re = mark === 'T' ? new RegExp(`^\\| T${n} \\|`, 'm') : new RegExp(`^## ${n}\\. `, 'm');
    if (!has('design/STYLE.md', re)) find('claude', `STYLE.md ${mark}${n} points at no ${mark === 'T' ? 'rule' : 'section'} of design/STYLE.md`);
  }
}

checkMarks();
checkWallets(pm);
checkOrder(pm);
checkComposer(M, pm);
checkPicture();
checkBannedWords();
checkClaudeMd();

console.log(findings.length ? `\n${findings.length} disagreement(s)` : '\nspec and code agree');
process.exit(findings.length ? 1 : 0);
