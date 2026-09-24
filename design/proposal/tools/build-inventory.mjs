/**
 * build-inventory.mjs — Q1541 stage 1: fold the instrument payloads into
 * design/proposal/inventory.json and inventory.md. Throwaway.
 *
 *   node design/proposal/tools/build-inventory.mjs
 *
 * Reads design/proposal/data/{audit,band,live,edit,zones}-{1600,390}.json.
 */
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROP = resolve(HERE, '..');
const DESIGN = resolve(PROP, '..');
const DATA = join(PROP, 'data');
const SHOTS = join(PROP, 'shots', 'current');
const WIDTHS = [1600, 390];
const load = async (f) => (existsSync(join(DATA, f)) ? JSON.parse(await readFile(join(DATA, f), 'utf8')) : null);

/* --- the fixture's own states, read from its source --------------------- */
const fx = await readFile(join(DESIGN, 'fixture-session.js'), 'utf8');
const FIX = {};
for (const m of fx.matchAll(/id: '([a-z0-9-]+)',([\s\S]*?)(?=\n\s*\{\s*\n|\n\s*\/\/ \*\*|id: '[a-z0-9-]+',)/g)) {
  const body = m[2].slice(0, 900);
  const g = (re) => { const x = body.match(re); return x ? x[1] : null; };
  FIX[m[1]] = { kind: g(/kind: '([a-z]+)'/), state: g(/state: '([a-z]+)'/), deadlocked: /deadlocked: true/.test(body),
    stranded: /stranded: true/.test(body), mine: /mine: true/.test(body), outcome: g(/outcome: '([^']+)'/),
    insert: /insertAfterKey/.test(body) };
}

/* --- kinds ---------------------------------------------------------------- */
// family → kinds; each kind names its SURFACE §9 row and the rule labels that govern it
const KINDS = {
  'quick':            { fam: 'judgment', row: 'quick / insert', rules: ['§9 quick', 'CP1', 'CP2', 'CP4', 'CP7 (Q1500)', 'M18', 'K19', '§9.1'] },
  'insert':           { fam: 'judgment', row: 'quick / insert (gap)', rules: ['§9 quick', 'M19', 'K31 gap', 'CP4', 'Q1379'] },
  'race':             { fam: 'judgment', row: 'race', rules: ['§9 race', 'CP2', 'CP4', 'M18', 'M20'] },
  'judged-pair':      { fam: 'judgment', row: '⏳ judged pair', rules: ['§9 ⏳ judged pair', 'Q1367', 'CP8'] },
  'patch':            { fam: 'judgment', row: 'patch', rules: ['§9 patch', 'Q1108', 'Q1382', 'K17–K18'] },
  'deadlock':         { fam: 'judgment', row: 'deadlock ⚔️', rules: ['§9 deadlock', 'M16', 'Q613'] },
  'diagonal':         { fam: 'judgment', row: 'diagonal 🌶️', rules: ['§9 diagonal', 'SPEC §8.3a'] },
  'sealed-record':    { fam: 'record', row: 'sealed record', rules: ['§9 sealed record', 'Q1531', 'Y20', 'M13', 'M1'] },
  'backlog':          { fam: 'record', row: 'backlog (closed page)', rules: ['§9 backlog', 'Y20'] },
  'editing':          { fam: 'composer', row: 'editing (a draft)', rules: ['§9 editing', 'K13–K31', 'Q1306', 'Q1382'] },
  'mine':             { fam: 'composer', row: 'mine (proposed)', rules: ['§9 mine', 'Q1485 (A)', 'K17–K18'] },
  'stranded':         { fam: 'composer', row: 'mine (stranded, E38)', rules: ['E38', 'Q1484', '§6 stranded'] },
  'park':             { fam: 'news', row: 'park ⏳ (news; E36)', rules: ['§9 park', 'E36', 'E37'] },
  'setting':          { fam: 'setting', row: 'setting (founder, pen) / the composer', rules: ['§9 setting', '§9 composer', 'CP1', 'CP2', 'CP10', 'F6', 'F15', 'Q1151', 'Q1293', 'K1–K12'] },
  'birth':            { fam: 'setting', row: 'setting — the birth (🪶 📍)', rules: ['§9 setting', 'F2', 'F11', 'F12', 'Q1151'] },
  'admissions':       { fam: 'setting', row: '🪪 Admissions', rules: ['§9 🪪', 'SPEC §9.7½'] },
  'applications':     { fam: 'setting', row: '🤝 Applications', rules: ['§9 🤝'] },
  'hat':              { fam: 'setting', row: '🎩', rules: ['§9 🎩', 'CP9', 'CP11'] },
  'blind-answer':     { fam: 'setting', row: 'blind answer (member)', rules: ['§9 blind answer', 'Q1175', 'C4', 'Q1182'] },
  'power':            { fam: 'power', row: 'power cards ✒️ 🛡️', rules: ['§9 power cards', 'Q1430', 'Q1404', 'CP9', 'T6'] },
  'motion-constitutional': { fam: 'motion', row: 'constitutional motion (consent)', rules: ['§9 consent', 'Q1182', 'Q1377', 'CP2'] },
  'motion-ordinary':  { fam: 'motion', row: 'ordinary motion (a race card)', rules: ['§9 ordinary motion', 'Q1331', 'Q1460'] },
  'crown':            { fam: 'motion', row: '👑 question', rules: ['§9 👑', 'CP5', 'Q1154', 'Q1475'] },
  'crown-other':      { fam: 'motion', row: '👑 question, for anybody but the Founder', rules: ['§9 👑 other', 'Q1475'] },
  'crown-text':       { fam: 'motion', row: '👑 question (the Text)', rules: ['§9 👑 Text', 'CP5'] },
  'motion-record':    { fam: 'record', row: 'settled motion record', rules: ['§9 settled motion record', 'Q1522', 'Q1186', 'Q1188'] },
  'failed-news':      { fam: 'news', row: 'settled motion record — mover’s unacknowledged rejection (E41)', rules: ['E41', 'Q1447', 'Q1522 (6)'] },
  'grant':            { fam: 'news', row: 'grants 🏛️ ✒️ 🛡️', rules: ['§9 grants', 'Q1501', 'Q1502', 'Q1373'] },
  'gate':             { fam: 'news', row: 'gates 💡 ⚖️', rules: ['§9 gates', 'Q1501', 'Q1373', 'C13'] },
  'begin':            { fam: 'lifecycle', row: '🍾 Begin', rules: ['§9 🍾', 'F5', 'BEGIN_ROWS', 'CP9'] },
  'closing':          { fam: 'lifecycle', row: '🥂 The Close', rules: ['§9 🥂', 'Q1450', 'Y20'] },
  'door-invite':      { fam: 'door', row: '✉️ Invite', rules: ['§9 ✉️', 'Q1166', 'Q1187', 'F19', 'F23', 'CP6'] },
  'door-remove':      { fam: 'door', row: '❌ Remove', rules: ['§9 ❌', 'CP6', 'entry 96'] },
  'door-leave':       { fam: 'door', row: '🌂 Leave the Membership', rules: ['§9 🌂', 'Q1400', 'E32'] },
  'admit':            { fam: 'door', row: '`adm:` an admission', rules: ['§9 adm:', 'E21', 'Q1371', 'Q1473'] },
  'identity':         { fam: 'identity', row: 'identity ✋ 🖼️ 📧', rules: ['§9 identity', 'Q1164', 'Q1165', 'K26', 'F21'] },
  'stranger':         { fam: 'door', row: 'the stranger’s two', rules: ['§9 stranger’s two', 'Q1390', 'reading 1194'] },
  'news':             { fam: 'news', row: 'news / owed OK', rules: ['§9 news', 'E5', 'C8'] },
  'watching':         { fam: 'setting', row: 'watching', rules: ['§9 watching', 'Q1176'] },
  'applicant':        { fam: 'door', row: 'the applicant’s five', rules: ['§9 applicant', 'Q1366'] },
};
const SETTINGS = ['chamber', 'lapse', 'removal', 'rate', 'ending', 'quorum', 'authorship', 'judgments'];

const glyphs = (c) => (c.buttons || []).map((b) => b.label || '').join(' ');
function kindOf(c) {
  const k = c.key; const w = c.walk; const fxi = FIX[k];
  // a decided rule that owes you an OK is the news card, whatever setting it is about
  if ((SETTINGS.includes(k) || k === 'admission' || k === 'applications' || k === 'slug') && (c.buttons || []).some((b) => b.label === 'OK') && !/closed/.test(w)) return 'news';
  if (w === 'edit') return 'editing';
  if (k === 'title' || k === 'slug') return 'birth';
  if (/^(myemail|myname|mypic)$/.test(k)) return 'identity';
  if (/^grant-/.test(k)) return 'grant';
  if (/^(canpropose|canjudge)$/.test(k)) return 'gate';
  if (k === 'hat') return 'hat';
  if (k === 'begin') return 'begin';
  if (k === 'closing') return 'closing';
  if (k === 'invite') return 'door-invite';
  if (k === 'remove') return 'door-remove';
  if (k === 'leave') return 'door-leave';
  if (k === 'admission') return 'admissions';
  if (k === 'applications') return 'applications';
  if (SETTINGS.includes(k)) return 'setting';
  if (/^ans-/.test(k)) return 'blind-answer';
  if (/^pw:/.test(k)) return 'power';
  if (/^held:/.test(k)) return 'failed-news';
  if (/^rec:fx-u/.test(k)) return 'backlog';
  if (/^rec:r:/.test(k)) return 'sealed-record';
  if (/^rec:/.test(k)) return 'motion-record';
  if (/^crown:/.test(k)) return 'crown-text';
  if (/^adm:/.test(k)) return 'admit';
  if (/^str(login|apply)$/.test(k)) return 'stranger';
  if (/^mine:/.test(k)) return 'mine';
  if (/^park:/.test(k)) return 'park';
  if (/^mo:/.test(k)) {
    const g = glyphs(c);
    if (/🛡️|🛡/.test(g) && /✒️|✒/.test(g)) return 'crown';
    if (/🏛️|🏛/.test(g)) return 'motion-constitutional';
    if (/✓/.test(g) || c.strings && /Keep this|Indifferent/.test(c.strings.all || '')) return 'motion-ordinary';
    if (/Chosen by the membership/.test((c.strings && c.strings.all) || '')) return 'crown-other';
    return 'motion-constitutional';
  }
  if (/^r:c\d+#/.test(k)) {
    if (c.rail && c.rail.mark === '⏳') return 'judged-pair';
    return /inc:/.test(k) ? 'quick' : 'race';
  }
  if (fxi) {
    if (w === 'closed') return fxi.state === 'sealed' ? 'sealed-record' : fxi.mine ? (fxi.stranded ? 'stranded' : 'mine') : fxi.kind === 'park' ? 'park' : (fxi.insert ? 'insert' : fxi.kind === 'patch' ? 'patch' : fxi.kind === 'race' ? 'race' : 'quick');
    if (fxi.stranded) return 'stranded';
    if (fxi.mine) return 'mine';
    if (fxi.kind === 'park') return 'park';
    if (fxi.state === 'sealed') return 'sealed-record';
    if (fxi.deadlocked && fxi.state === 'deciding') return 'deadlock';
    if (fxi.state === 'deciding') return 'judged-pair';
    if (fxi.insert) return 'insert';
    if (fxi.kind === 'patch') return 'patch';
    if (fxi.kind === 'diagonal') return 'diagonal';
    if (fxi.kind === 'race') return 'race';
    return 'quick';
  }
  return 'unknown';
}

const WALK_STATE = {
  founding: 'founding, unanswered (founder)',
  answers: 'founding, 🌍 delegated → the founder’s own answer card',
  delegated: 'founding, handed to the membership and collecting',
  settled: 'settled by ⏩ + seeded motions — the founder',
  'seat:1': 'settled + seeded — a member (seat 1, the mover)',
  'seat:stranger': 'settled + seeded — a stranger at the door',
  charter: 'the session fixture (Hollow Oak)',
  closed: 'the closed page (fixture &closed=1)',
  sessionband: 'the session fixture, band cards (&band=1)',
  closedband: 'the closed page, band cards (&closed=1&band=1)',
  edit: 'edit mode on the session fixture',
};
function stateOf(c, kind) {
  let s = WALK_STATE[c.walk];
  if (!s && /^live_/.test(c.walk)) {
    const [, rung, seat] = c.walk.match(/^live_([a-z]+)_(.+)$/) || [];
    s = 'live ladder · rung ' + rung + ' · ' + (seat === 'founder' ? 'the founder' : seat === 'stranger' ? 'a stranger' : 'member ' + seat);
  }
  if (c.walk === 'edit') s += ' · ' + c.state;
  const fxi = FIX[c.key];
  if (fxi && (c.walk === 'charter' || c.walk === 'closed')) {
    const bits = [fxi.state];
    if (fxi.deadlocked) bits.push('deadlocked');
    if (fxi.outcome) bits.push(fxi.outcome.split(' — ')[0]);
    s += ' · ' + bits.join(', ');
  }
  if (c.rail && c.rail.mark) s += ' · rail ' + c.rail.mark;
  return s || c.walk;
}

/* --- slots and dividers --------------------------------------------------- */
const ROLE = [
  [/chipcol/, 'strip'],
  [/headlab|eyebrow/, 'eyebrow'],
  [/asblock/, 'standing block'],
  [/statline/, 'standing (readBody statline)'],
  [/clausehead|headclause|headrule|headtitle/, 'head'],
  [/recbox|ranked|recpass|reclist/, 'record block'],
  [/commitrow|race-mid|proposalrow/, 'commit row'],
  [/propblock|lanes|choice|\bpick\b|opt/, 'choices'],
  [/lockline|setnote|rsub|qwhy|\bexp\b|\bwhy\b|note/, 'note'],
  [/speaker|sealed|rationale/, 'speaker'],
  [/field|fld|lanebox/, 'field'],
  [/powtable|begintable|switch/, 'table'],
];
const roleOf = (el) => { for (const [re, r] of ROLE) if (re.test(el)) return r; return 'other'; };
function flatSlots(slots) {
  // the card's body is usually one wrapper deep; unwrap single-child wrappers
  let top = slots || [];
  for (let i = 0; i < 3 && top.length === 1 && top[0].kids; i++) top = top[0].kids;
  if (top.length <= 2 && top.some((s) => s.kids && s.kids.length > 2)) {
    top = top.flatMap((s) => (s.kids && s.kids.length > 2 ? s.kids : [s]));
  }
  return top.map((s) => ({ role: roleOf(s.el), el: s.el, h: s.h, lines: s.lines || [], text: s.text,
    ...(s.control ? { control: true } : {}), ...(s.disabled ? { disabled: true } : {}) }));
}
function dividersOf(flat) {
  const out = [];
  flat.forEach((s, i) => {
    for (const side of s.lines) {
      if (side === 'boxed') continue;
      const hasText = (x) => !!(x && ((x.text && x.text.trim()) || x.control || x.h > 20));
      const above = side === 'top' ? flat[i - 1] : s;
      const below = side === 'top' ? s : flat[i + 1];
      out.push({ on: s.el + ' (' + side + ')', between: [above ? above.role : '(card edge)', below ? below.role : '(card edge)'],
        contentBothSides: hasText(above) && hasText(below) });
    }
  });
  return out;
}
const controlsOf = (c) => [
  ...(c.buttons || []).map((b) => ({ kind: 'button', label: b.label, title: b.title, disabled: b.disabled, pressed: b.pressed,
    does: b.disabled ? 'nothing (disabled)' : (b.title || (b.label === 'OK' ? 'acknowledge and close' : '(untitled)')) })),
  ...(c.radios || []).map((r) => ({ kind: 'radio', label: r.label, on: r.on })),
  ...(((c.strings && c.strings.inputs) || []).map((i) => ({ kind: 'input', type: i.type, placeholder: i.ph, value: i.value }))),
];

/* --- gather ------------------------------------------------------------------ */
const records = [];
const zones = [];
const meta = { sources: {}, errors: {} };
for (const W of WIDTHS) {
  for (const src of ['audit', 'deleg', 'band', 'live', 'edit']) {
    const j = await load(src + '-' + W + '.json');
    if (!j) { meta.sources[src + '-' + W] = 'missing'; continue; }
    meta.sources[src + '-' + W] = (j.cards || []).length + ' cards';
    meta.errors[src + '-' + W] = (j.errors || []).slice(0, 60);
    for (const c of j.cards || []) {
      if (src === 'audit' && c.walk === 'delegated' && existsSync(join(DATA, 'deleg-' + W + '.json'))) continue;
      const kind = kindOf(c);
      const flat = flatSlots(c.slots);
      const s = c.strings || {};
      records.push({
        id: c.key + '|' + c.walk + (c.state ? ':' + c.state : '') + '|' + W,
        key: c.key, walk: c.walk + (c.state ? ':' + c.state : ''), width: W, source: src,
        kind, family: (KINDS[kind] || { fam: 'unknown' }).fam, surfaceRow: (KINDS[kind] || {}).row || null, rules: (KINDS[kind] || {}).rules || [],
        state: stateOf(c, kind),
        slots: flat,
        dividers: dividersOf(flat),
        orphanHairlines: c.hairlines || [],
        controls: controlsOf(c),
        commitRow: (c.buttons || []).map((b) => b.label || b.title || '?'),
        strings: { eyebrow: s.eyebrow, head: s.head, standing: s.standing, lock: s.lock,
          helpers: (c.helpers || []).map((h) => h.text).filter(Boolean), options: (s.options || []).map((o) => o.label + (o.on ? ' [on]' : '')),
          hints: s.hints || [], all: s.all },
        tab: { glyph: c.tabGlyph, travel: c.tab && c.tab.travel, boxTravel: c.tab && c.tab.boxTravel, front: c.tab && c.tab.front, outside: c.tab && c.tab.outside },
        clauseTravel: c.clause && c.clause.travel,
        rail: c.rail || null,
        card: c.card, screen: c.screen && { w: c.screen.w, scrollW: c.screen.scrollW },
        readBodyStatline: /statline/.test(JSON.stringify(c.slots || [])),
        findings: (c.findings || []).map((f) => f.rule + ': ' + f.saw),
        shot: c.shot || null, shotDup: !!c.shotDup,
        ...(c.proposalRow ? { proposalRow: c.proposalRow } : {}),
      });
    }
    if (src === 'audit') meta.cross = [...(meta.cross || []), ...((j.cross || []).map((f) => ({ width: W, rule: f.rule, saw: f.saw })))];
  }
  const z = await load('zones-' + W + '.json');
  if (z) for (const x of z.zones) zones.push({ width: W, ...x });
}

/* --- the tonight findings, located in the data ---------------------------- */
const hasStanding = (r) => r.slots.some((s) => s.role === 'standing block') || /Set to|Set by|Decided by/.test(r.strings.all || '');
const evidence = {
  E1_readBody_standing_block: records.filter((r) => r.readBodyStatline).map((r) => r.id + ' — ' + ((r.strings.all || '').match(/Set to.{0,80}/) || [''])[0]),
  E2_bin_alone_rows: records.filter((r) => r.commitRow.length === 1 && /🗑/.test(r.commitRow[0])).map((r) => r.id),
  E3_P12_orphan_hairlines: records.filter((r) => r.orphanHairlines.length).map((r) => r.id + ' — ' + r.orphanHairlines.map((h) => h.kind + ':' + (h.a || '') + (h.b ? '/' + h.b : '')).join(', ')),
  E4_rate_provenance_contradiction: records.filter((r) => r.walk.startsWith('closed') && r.key === 'rate').map((r) => r.id + ' — ' + (r.strings.all || '').slice(0, 400)),
  E5_closed_takeback_live_radios: records.filter((r) => r.walk === 'closedband' && (/Picking a value here takes it back/.test(r.strings.all || '') || r.controls.some((c) => c.kind === 'radio' && /Choose this/.test(c.label || '')))).map((r) => r.id),
};

/* --- summarise ---------------------------------------------------------------- */
const kindsReached = new Map();
for (const r of records) {
  if (!kindsReached.has(r.kind)) kindsReached.set(r.kind, { states: new Set(), w1600: 0, w390: 0 });
  const k = kindsReached.get(r.kind);
  k.states.add(r.walk.replace(/^live_([a-z]+)_.*/, 'live:$1'));
  if (r.width === 1600) k.w1600++; else k.w390++;
}
const NOT_REACHED = [
  { kind: 'diagonal', row: 'diagonal 🌶️', why: 'The fixture carries one (`diag-quorum-keys`) but it is unserved — SPEC §8.3a serves a diagonal, never offers it, and neither the fixture page nor the ladder\'s rooms served one to any seat opened. `SESSION.toggle` on it draws no card. Two attempts: the charter walk\'s toggle, and three seats at each live rung.' },
  { kind: 'applicant', row: 'the applicant’s five', why: 'Only the applicant\'s own seat draws them. The ladder leaves one applicant *submitted* at the door, but `POST /api/dev/seat` seats members only (an applicant has no member record), and the file fixture cannot seat one (`allApplicants` reads the live view; card-audit\'s own EXEMPT note). `npm run applicants-walk` drives them end to end but asserts rather than photographs. Not reached.' },
  { kind: 'watching', row: 'watching (as its own card)', why: 'Reached only as the *delegated* walk\'s collecting state of each setting card (13 kinds × 2 widths); §9\'s separate "watching" row — the band tab of a setting you handed over and do not answer — draws the same setting card, so it is inventoried under `setting` / delegated rather than as its own kind.' },
  { kind: 'news-families', row: '👑 release-batch · amendment-news · 📭 mail-give-up · 🥾 departure-news', why: 'Each needs an act the ladder does not perform (a power laid down after 🍾, a ✒️ text decree, a bounced mail via `/api/dev/outbox/give-up`, a departure). Reaching them means scripting those acts on a live document seat by seat; the run did the phase ladder at five rungs × three seats and the fixture\'s seeded motions, and none of the four appeared in any rail. Recorded as not reached; they share the news card\'s grammar (one sentence and an OK).' },
];
const kindsSummary = Object.keys(KINDS).map((k) => {
  const x = kindsReached.get(k);
  return { kind: k, row: KINDS[k].row, family: KINDS[k].fam, reached: !!x, states: x ? [...x.states].sort() : [], at1600: x ? x.w1600 : 0, at390: x ? x.w390 : 0 };
});

/* --- prune: one crop per kind × state × width; the rest point at them ---- */
const { unlink } = await import('node:fs/promises');
const PRUNE = !process.argv.includes('--no-prune');
const groups = new Map();
for (const r of records) {
  const g = r.kind + '|' + r.state.replace(/ · (the founder|a stranger|member m-d+)/, '') + '|' + r.width;
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(r);
}
const keepFiles = new Set();
for (const rs of groups.values()) {
  const withShot = rs.filter((r) => r.shot && existsSync(join(SHOTS, r.shot)));
  for (const r of rs) if (r.shot && !existsSync(join(SHOTS, r.shot))) { r.shotMissing = r.shot; r.shot = null; }
  const ALWAYS = /^(rate|closedband|chamber|live_constitution_m-1|remove|live_constitution_m-1)|/;
  const reps = [...new Set([...withShot.filter((r) => ALWAYS.test(r.id)), ...withShot.slice(0, 1)])];
  for (const r of reps) keepFiles.add(r.shot);
  for (const r of rs) if (!reps.includes(r)) { r.shotOf = reps[0] ? reps[0].shot : null; r.shot = null; }
}
for (const z of zones) if (z.shot) keepFiles.add(z.shot);
if (PRUNE) {
  for (const f of await readdir(SHOTS)) {
    if (!/\.png$/.test(f) || keepFiles.has(f)) continue;
    if (/^page-live_/.test(f)) { keepFiles.add(f); continue; }   // the live pages, one per rung × seat
    await unlink(join(SHOTS, f));
  }
}

let shotBytes = 0; let shotCount = 0;
for (const f of await readdir(SHOTS)) { if (/\.png$/.test(f)) { shotCount++; shotBytes += (await stat(join(SHOTS, f))).size; } }

const out = {
  generated: new Date().toISOString(), viewport: { wide: '1600×1000', narrow: '390×844' },
  counts: { records: records.length, kinds: kindsSummary.filter((k) => k.reached).length, kindsListed: kindsSummary.length,
    states: new Set(records.map((r) => r.kind + '|' + r.walk)).size, zones: zones.length, shots: shotCount, shotMB: +(shotBytes / 1048576).toFixed(1) },
  meta, kinds: kindsSummary, notReached: NOT_REACHED, evidence, records, zones,
};
await writeFile(join(PROP, 'inventory.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.counts));
console.log('unknown kinds:', records.filter((r) => r.kind === 'unknown').map((r) => r.id).slice(0, 20));
for (const [k, v] of Object.entries(evidence)) console.log(k, v.length);
