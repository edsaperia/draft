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
import { readFileSync } from 'node:fs';
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

checkMarks();
checkWallets(pm);
checkOrder(pm);
checkComposer(M, pm);
checkBannedWords();

console.log(findings.length ? `\n${findings.length} disagreement(s)` : '\nspec and code agree');
process.exit(findings.length ? 1 : 0);
