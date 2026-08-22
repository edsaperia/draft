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
 * What it asserts (SPEC pass 1, 2026-08-22; extended at each pass):
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
console.log(findings.length ? `\n${findings.length} disagreement(s)` : '\nspec and code agree');
process.exit(findings.length ? 1 : 0);
