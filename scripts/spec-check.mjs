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
  // 🏛️ was skipped here while its clause hung off whichever question the
  // grant arrived with; Q750 pins the clause to the Proposals preamble, so
  // there is a section to name. It is deliberately not in `SEC.rate.keys`
  // (admitting it would make the whole section live from its place in ORDER),
  // hence an override rather than a `secOf` lookup.
  const hosts = { 'grant-pen': 'lead', 'grant-shield': 'lead', 'grant-voice': 'rate', title: 'lead', slug: 'lead', myemail: 'lead', chamber: 'lead' };
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
 * E19's condition (Q838). *A proposal of your own* is yours to withdraw and
 * not to judge — but that is a claim about a room bigger than one, and the
 * page enforced it unconditionally: in a document of one every race is only
 * yours, so the sole member was served no judgment card at all, the engine's
 * measured `comparisons` stayed 0 for ever and the document could not change
 * its own text. There is no walk at E = 1 anywhere (the ladder's cast is 20
 * and asserts `members > 1`), so this one-line predicate is the only thing
 * standing between that bug and its return, and the failure is silent by
 * construction — a rail with nothing in it looks like a document at rest.
 */
function checkSoloJudgment() {
  note('The sole member’s own judgment — SURFACE.md E19 against the page');
  const page = js('design/session-view.html');
  const at = page.indexOf('function itemsFromView(');
  const items = at < 0 ? '' : page.slice(at, at + 4000);
  if (!/r\.candidates\.every\(\(c\) => c\.mine\) && E\(\) > 1/.test(items))
    find('events', "the all-mine race is skipped unconditionally again — E19 exempts it only where somebody else in the room could judge it, and at E = 1 that skip is every race (Q835)");
  else note('  the `mine` exemption carries its E > 1 condition');
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

function checkComposer(M, pm) {
  note('The composer maps — PROPOSE · ANSWER · the rung values · PW_*');
  const page = js('design/session-view.html'); const setup = js('design/setup.js');
  const cards = [...page.matchAll(/\{ k: '([a-z-]+)', g: [^,]+, t: '[^']*',[^\n]*?kind: '([a-z]+)'/g)].map((m) => ({ k: m[1], kind: m[2] }));
  const composable = cards.filter((c) => c.kind !== 'personal' && c.k !== 'text' && c.k !== 'admission').map((c) => c.k);
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
  for (const n of ['PWWHY', 'PW_OPTS']) {
    const got = pw(n).sort().join(' ');
    if (got !== base) find('composer', `${n} keys (${got}) differ from PW_PHRASE's (${base})`);
  }
  note(`  ${propose.length} composable; ${answer.length} answer bodies; ${ladders} ladders compared`);
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
checkSoloJudgment();
checkApplicantJudged();
checkComposer(M, pm);
checkPicture();
checkBannedWords();
checkListJoiner();
checkClaudeMd();
checkMergeable();

console.log(findings.length ? `\n${findings.length} disagreement(s)` : '\nspec and code agree');
process.exit(findings.length ? 1 : 0);
