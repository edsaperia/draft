/**
 * spec-check — does the spec's governance table still equal the code's
 * catalogue, and does the surface's event matrix still name every key the
 * page speaks?
 *
 * Governance oracle: `CATALOGUE` in the committed browser bundle
 * (design/constitution.js), evaluated in a vm sandbox — so the check needs
 * no TypeScript loader and touches nothing under packages/.
 * Communication oracle: the page's own maps, read as a buffer (the file
 * holds deliberate NUL bytes).
 *
 * Tables are parsed from SPEC.md (<!-- spec-check: settings -->) and
 * SURFACE.md (<!-- spec-check: events -->); until those exist the pass
 * document design/spec-pass/pass-1.md holds both, and the report says which
 * file it read.
 *
 * Exit code 1 on any disagreement. `--quiet` prints findings only.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const quiet = process.argv.includes('--quiet');
const findings = [];
const note = (s) => { if (!quiet) console.log(s); };
const find = (area, s) => { findings.push({ area, s }); console.log(`  ✗ [${area}] ${s}`); };

// ---- oracles ----------------------------------------------------------------

function loadCatalogue() {
  const src = readFileSync(join(ROOT, 'design/constitution.js'), 'utf8');
  const ctx = {};
  vm.runInNewContext(src, ctx);
  return ctx.CONSTITUTION;
}

function motionRoutes() {
  const src = readFileSync(join(ROOT, 'packages/constitution/src/catalogue.ts'), 'utf8');
  const m = src.match(/export type MotionRoute = ([^;]+);/);
  if (!m) throw new Error('MotionRoute not found in catalogue.ts');
  return [...m[1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]);
}

function pageMaps() {
  const buf = readFileSync(join(ROOT, 'design/session-view.html'));
  const s = buf.toString('utf8');
  const arr = (name) => {
    const m = s.match(new RegExp(`const ${name} = (?:GRANT_KEYS\\.concat\\()?\\[([\\s\\S]*?)\\]`));
    if (!m) throw new Error(`${name} not found in session-view.html`);
    return [...m[1].matchAll(/'([a-z-]+)'/g)].map((x) => x[1]);
  };
  const objKeys = (name) => {
    const i = s.indexOf(`const ${name} = {`);
    if (i < 0) throw new Error(`${name} not found`);
    // walk to the matching brace
    let depth = 0; let j = s.indexOf('{', i);
    for (; j < s.length; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}' && --depth === 0) break;
    }
    const body = s.slice(i, j);
    return [...body.matchAll(/^\s{4}'?([a-z-]+)'?:/gm)].map((x) => x[1]);
  };
  const grant = arr('GRANT_KEYS');
  const ack = grant.concat(arr('ACK_KEYS'));
  const mid = {};
  const mm = s.match(/const MID = \{([^}]*)\}/);
  for (const [, k, v] of mm[1].matchAll(/([a-z]+): '([A-Za-z]+)'/g)) mid[k] = v;
  const cards = [...new Set([...s.matchAll(/\{ k: '([a-z-]+)'/g)].map((x) => x[1]))];
  return { ORDER: arr('ORDER'), GRANT_KEYS: grant, ACK_KEYS: ack,
    CHOSEN: objKeys('CHOSEN'), PROPOSE: objKeys('PROPOSE'), MID: mid, cards };
}

// ---- table parsing ----------------------------------------------------------

function tableAfter(file, marker) {
  if (!existsSync(file)) return null;
  const s = readFileSync(file, 'utf8');
  const i = s.indexOf(`<!-- spec-check: ${marker} -->`);
  if (i < 0) return null;
  // the table is the run of pipe lines after the marker — stop at its end,
  // or every later table in the file would be read as part of this one
  const lines = [];
  for (const l of s.slice(i).split(/\r?\n/).slice(1)) {
    if (l.startsWith('|')) lines.push(l);
    else if (lines.length) break;
  }
  if (lines.length < 3) return null;
  const cells = (l) => l.slice(1, -1).split('|').map((c) => c.trim());
  const head = cells(lines[0]);
  return lines.slice(2).map((l) => Object.fromEntries(cells(l).map((c, k) => [head[k], c])));
}

function locate(marker, primary) {
  const p = join(ROOT, primary);
  const t = tableAfter(p, marker);
  if (t) { note(`  ${marker}: read from ${primary}`); return t; }
  const f = join(ROOT, 'design/spec-pass/pass-1.md');
  const u = tableAfter(f, marker);
  if (u) { note(`  ${marker}: ${primary} holds no table yet — read from design/spec-pass/pass-1.md`); return u; }
  throw new Error(`no ${marker} table in ${primary} or the pass file`);
}

// ---- governance -------------------------------------------------------------

const yes = (c) => /^yes$/i.test(c);
const list = (c) => (c === '—' || c === '' ? [] : c.split(/\s*[·,]\s*/).map((x) => x.replace(/\s*\(.*\)$/, '')));

function checkGovernance() {
  note('Governance');
  const M = loadCatalogue();
  const rows = locate('settings', 'SPEC.md');
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
  }
  for (const r of rows) if (!M.CATALOGUE_BY_ID.has(r.id)) find('settings', `table has '${r.id}', the catalogue does not`);
  note(`  ${rows.length} table rows against ${M.CATALOGUE.length} catalogue entries`);

  // the page's ids: MID + the checker's own map from the table
  const pm = pageMaps();
  for (const r of rows) {
    const key = r['page key'];
    const mapped = pm.MID[key] || key;
    if (mapped !== r.id)
      find('id-map', `page key '${key}' → catalogue '${r.id}' is not in the page's MID (session-view.html); the page would read it as '${mapped}'`);
  }

  // routes: every MotionRoute value must be named in the routes table
  const routes = motionRoutes();
  const specFile = join(ROOT, 'SPEC.md');
  const passFile = join(ROOT, 'design/spec-pass/pass-1.md');
  const routeText = (existsSync(specFile) && readFileSync(specFile, 'utf8').includes('| Route |'))
    ? readFileSync(specFile, 'utf8') : readFileSync(passFile, 'utf8');
  const sect = routeText.slice(routeText.indexOf('| Route |'));
  for (const rt of routes) {
    if (!new RegExp(`route \`${rt}\``).test(sect)) find('routes', `MotionRoute '${rt}' is not a row of the routes table`);
  }
  note(`  routes: ${routes.join(' · ')}`);

  // exceptions: id, rule, why, ruling
  const ex = readFileSync(passFile, 'utf8').split(/\r?\n/).filter((l) => /^\| X\d+ \|/.test(l));
  for (const l of ex) {
    const c = l.slice(1, -1).split('|').map((x) => x.trim());
    if (c.length < 5 || c.slice(1).some((x) => !x)) find('exceptions', `${c[0]} is missing a column`);
  }
  note(`  ${ex.length} governance exceptions, each with rule · why · ruling`);
  return pm;
}

// ---- communication ----------------------------------------------------------

function checkCommunication(pm) {
  note('Communication');
  const rows = locate('events', 'SURFACE.md');
  // Keys cells are space-separated page keys; '—' and any parenthesised note are not keys
  const keysOf = (c) => (c || '').replace(/\(.*?\)/g, '').split(/\s+/).filter((k) => /^[a-z-]+$/.test(k));
  const named = new Set(rows.flatMap((r) => keysOf(r.Keys)));
  // keys the page speaks that the matrix must place somewhere
  const spoken = new Set([...pm.ORDER, ...pm.ACK_KEYS, ...pm.CHOSEN, ...pm.PROPOSE, ...pm.cards]);
  // the settings are covered by the settings table, not by events
  const settings = new Set(locate('settings', 'SPEC.md').map((r) => r['page key']));
  for (const k of spoken) {
    if (settings.has(k)) continue;
    if (!named.has(k)) find('events', `page key '${k}' is not placed on any event row`);
  }
  for (const k of named) if (!spoken.has(k)) find('events', `event row names '${k}', which the page does not speak`);
  const unbuilt = rows.filter((r) => /unbuilt/i.test(r.Channel)).map((r) => r['#']);
  note(`  ${rows.length} event rows; ${spoken.size} page keys; unbuilt channels: ${unbuilt.join(' ') || 'none'}`);
  const ex = readFileSync(join(ROOT, 'design/spec-pass/pass-1.md'), 'utf8').split(/\r?\n/).filter((l) => /^\| Y\d+ \|/.test(l));
  for (const l of ex) {
    const c = l.slice(1, -1).split('|').map((x) => x.trim());
    if (c.length < 5 || c.slice(1, 4).some((x) => !x)) find('exceptions', `${c[0]} is missing a column`);
  }
  note(`  ${ex.length} communication exceptions`);
}

const pm = checkGovernance();
checkCommunication(pm);
console.log(findings.length ? `\n${findings.length} disagreement(s)` : '\nspec and code agree');
process.exit(findings.length ? 1 : 0);
