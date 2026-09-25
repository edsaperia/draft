// write-review.mjs — writes design/proposal/questions.md and the review page
// design/proposal/review/index.html (+ review/img/) from questions-data.mjs.
// Run from the repo root: node design/proposal/tools/write-review.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { questions, findings, findingOptions, backlog, lead, families } from './questions-data.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const P = path.resolve(HERE, '..');
const SHOTS = path.join(P, 'shots');
const REVIEW = path.join(P, 'review');
const IMG = path.join(REVIEW, 'img');

// ---- numbering -------------------------------------------------------------
const items = [];
questions.forEach((q) => items.push({ ...q, kind: 'q' }));
findings.forEach((f) => items.push({ ...f, kind: 'f', options: findingOptions }));
items.forEach((it, i) => { it.n = i + 1; it.id = '1541.' + it.n; it.key = '1541-' + it.n; });

// ---- markup ----------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const html = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/\*(.+?)\*/g, '<i>$1</i>')
  .replace(/⟨(.+?)⟩/g, '<code>$1</code>');
const md = (s) => String(s).replace(/⟨(.+?)⟩/g, '`$1`');

// ---- the mockups' pairs, for real filenames per id and width ----------------
const mock = fs.readFileSync(path.join(P, 'mockups.html'), 'utf8');
const pairOf = {};
for (const m of mock.matchAll(/<article class="pairbox" id="([^"]*)">(.*?)<\/article>/gs)) {
  const srcs = [...m[2].matchAll(/src="shots\/([^"]*)"/g)].map((x) => x[1]);
  if (pairOf[m[1]]) continue;
  const w = {};
  for (let i = 0; i + 1 < srcs.length; i += 2) {
    const wid = /-390\.png$/.test(srcs[i + 1]) ? '390' : '1600';
    w[wid] = [srcs[i].replace(/^current\//, ''), srcs[i + 1].replace(/^proposed\//, '')];
  }
  pairOf[m[1]] = w;
}

// ---- image set -------------------------------------------------------------
const used = new Map(); // review name -> source path
function img(side, name) {
  if (!name) return null;
  const dir = side === 'c' ? 'current' : 'proposed';
  const src = path.join(SHOTS, dir, name);
  if (!fs.existsSync(src)) throw new Error('missing shot ' + dir + '/' + name);
  const rn = side + '-' + name;
  used.set(rn, src);
  return 'img/' + rn;
}

// ---- questions.md ------------------------------------------------------------
function mdItem(it) {
  const L = [];
  L.push(`### ${it.id} — ${md(it.title)}`, '');
  if (it.kind === 'q') {
    L.push(`**What you see now.** ${md(it.now)}`, '');
    L.push(`**What the proposal changes.** ${md(it.change)}`, '');
    if (it.ruling) L.push(`**The ruling it touches.** ${md(it.ruling)}`, '');
    if (it.buys && it.buys !== '—') L.push(`**What it buys.** ${md(it.buys)}`, '');
    if (it.costs && it.costs !== '—') L.push(`**What it costs.** ${md(it.costs)}`, '');
  } else {
    L.push(`**What you see now.** ${md(it.now)}`, '');
    L.push(`**The fix.** ${md(it.change)}`, '');
    L.push(`**Settled how.** ${md(it.settles)} **Lands in** BUILD.md stage ${it.stage}.`, '');
  }
  if (it.shots && it.shots.length) {
    L.push('**Screenshots** (today → proposed):');
    for (const [c, p, cap] of it.shots) {
      L.push(`- ${md(cap)}: ${c ? '`shots/current/' + c + '`' : '—'} → ${p ? '`shots/proposed/' + p + '`' : '*(today only)*'}`);
    }
    L.push('');
  }
  L.push('**Options** (recommended first):');
  it.options.forEach(([lab, desc], i) => {
    L.push(`- **(${'abcd'[i]}) ${md(lab)}** — ${md(desc)}${i === 0 ? ' *(recommended)*' : ''}`);
  });
  L.push('', '');
  return L.join('\n');
}

const qmd = [];
qmd.push('# Questions for Ed — the surface redesign (Q1541, stage 6)', '');
qmd.push(`Written 2026-09-25 from \`grammar.md\` v2 (breaks B1–B13, open choices O1–O11), \`critique.md\`, \`checks.md\`, \`diagnosis.md\` and the mockups' captions. **${questions.length} questions and ${findings.length} findings, numbered 1541.1–1541.${items.length} in one sequence.** Answer by number (*do 3 and 7*) or on the review page, which saves each answer.`, '');
qmd.push('**Questions** are genuine choices, the recommended option first; the prototype builds every recommendation, and BUILD.md assumes them. **Findings** are faults in today\'s page that any design should fix; each is fixed in the BUILD.md stage named unless you veto it. Every item is written to stand alone; the internal labels (B1, O6, CP2 …) appear only as pointers into grammar.md and SURFACE.md.', '');
qmd.push('Screenshots are named as files under `design/proposal/shots/` on branch `redesign`; *today* is `current/`, the prototype `proposed/`. The same pairs are on the review page and in `mockups.html`.', '');
qmd.push('## Where each break and open choice went', '');
qmd.push('| grammar.md | question |', '|---|---|');
const where = [
  ['B1 provenance as text', 5], ['B2 the head is the line', 3], ['B3 (withdrawn in v2; O6 (b))', 12], ['B4 v2 and O1 (d) — the label slot', 4],
  ['B5 the bin with a job; J2 *Withdraw*', 9], ['B6 and O2 — no row where nothing is owed', 8], ['B7 v2 — settings rungs, not proposals', 6], ['B8 v2 — the power card', 11],
  ['B9 one ✏️ in edit mode', 22], ['B10 ✓ not green (with P7 v2)', 13], ['B11 *Set to / Set by*', 14], ['B12 🥂 once', 23], ['B13 the reason box with the change', 21],
  ['O3 *Accept 🏛️*', 24], ['O4 the 390 margin', 20], ['O5 no line on a text clause', 26], ['O7 where acts are worked out', 19], ['O8 keyed re-render (P10)', 18],
  ['O9 empty lists', 25], ['O10 🥂 discharges owed OKs', 7], ['O11 / G6 the strip hangs on', 16], ['P3 v2 against STYLE §3', 10], ['G5\'s 4 px', 15],
  ['G4 v2 the 📝 door', 17], ['§10 go to phase two (the sorter, the 40 bodies)', 1], ['§1 the ten principles', 2], ['the new words (STYLE)', 27], ['✋ 🖼️ after the close', 28],
];
for (const [g, n] of where) qmd.push(`| ${g} | 1541.${n} |`);
qmd.push('', '## Backlog 1541 — the held items, judged', '');
qmd.push('QUESTIONS.md backlog row 1541 (Ed, 2026-09-25: *do the redesign and then decide if you think these things are still relevant*) held four card faults and the diagnosis\'s plain bugs until this file existed. Each, judged against the grammar:', '');
for (const [a, b] of backlog) qmd.push(`- **${md(a)}** — ${md(b)}`);
qmd.push('', 'So the row can close once the answers are in: nothing it held needs a question of its own beyond the numbers above.', '');
qmd.push('## Part 1 — Questions', '');
items.filter((i) => i.kind === 'q').forEach((it) => qmd.push(mdItem(it)));
qmd.push('## Part 2 — Findings', '');
qmd.push('Faults in today\'s page. Each is fixed in the BUILD.md stage named, whatever the questions decide, unless you veto it; option (b) brings one forward as a patch on main.', '');
items.filter((i) => i.kind === 'f').forEach((it) => qmd.push(mdItem(it)));
fs.writeFileSync(path.join(P, 'questions.md'), qmd.join('\n').replace(/\n{3,}/g, '\n\n'));

// ---- the review page -------------------------------------------------------
const shotPair = (c, p, cap, w, eager) => {
  const ci = img('c', c), pi = img('p', p);
  return `<figure class="pair${w === '390' ? ' narrow' : ''}">` +
    (cap ? `<figcaption>${html(cap)}${w ? ' <span class="w">' + w + '</span>' : ''}</figcaption>` : '') +
    '<div class="two">' +
    (ci ? `<div class="side"><span class="tag">Today</span><img loading="${eager ? 'eager' : 'lazy'}" src="${ci}" alt="Today: ${esc(cap || c)}"></div>` : '') +
    (pi ? `<div class="side"><span class="tag new">Proposed</span><img loading="${eager ? 'eager' : 'lazy'}" src="${pi}" alt="Proposed: ${esc(cap || p)}"></div>` : '<div class="side none"><span class="tag new">Proposed</span><p>Not in the prototype — a live-only or edit-mode card.</p></div>') +
    '</div></figure>';
};

function itemHtml(it) {
  const lab = it.kind === 'q' ? 'Question' : 'Finding';
  let h = `<article class="item ${it.kind}" id="i${it.key}" data-id="${it.id}" data-key="${it.key}">`;
  h += `<header><span class="num">${it.id}</span><span class="kind">${lab}</span></header><h3>${html(it.title)}</h3>`;
  h += `<p><span class="lbl">Now.</span> ${html(it.now)}</p>`;
  h += `<p><span class="lbl">${it.kind === 'q' ? 'Proposed.' : 'The fix.'}</span> ${html(it.change)}</p>`;
  if (it.kind === 'q') {
    if (it.ruling) h += `<p class="ruling"><span class="lbl">The ruling it touches.</span> ${html(it.ruling)}</p>`;
    const bc = [];
    if (it.buys && it.buys !== '—') bc.push(`<p><span class="lbl">Buys.</span> ${html(it.buys)}</p>`);
    if (it.costs && it.costs !== '—') bc.push(`<p><span class="lbl">Costs.</span> ${html(it.costs)}</p>`);
    h += bc.join('');
  } else {
    h += `<p><span class="lbl">Settled how.</span> ${html(it.settles)} Lands in build stage ${esc(it.stage)}.</p>`;
  }
  if (it.shots && it.shots.length) {
    h += '<details class="shots"' + (it.n <= 6 ? ' open' : '') + '><summary>Screenshots (' + it.shots.length + ')</summary>';
    for (const [c, p, cap] of it.shots) h += shotPair(c, p, cap, /-390\.png$/.test(c || p) ? '390' : '');
    h += '</details>';
  }
  h += `<fieldset class="answer"><legend>Your answer to ${it.id}</legend>`;
  it.options.forEach(([olab, desc], i) => {
    const k = 'abcd'[i];
    h += `<label class="opt"><input type="radio" name="r${it.key}" value="${k}"><span class="ot"><b>(${k}) ${html(olab)}</b>${i === 0 ? ' <span class="rec">Recommended</span>' : ''}<br><span class="od">${html(desc)}</span></span></label>`;
  });
  h += `<label class="note">Note <textarea rows="2" name="n${it.key}" placeholder="Anything to add, or why"></textarea></label>`;
  h += `<div class="saved" aria-live="polite"></div></fieldset></article>`;
  return h;
}

const principles = [
  ['A card opens in place of the line it is about, and that line stays where it was, word for word, as the card\'s first line.', 'Four stated exceptions: a record, a patch over several places, a gap, and 🪶 at the birth.'],
  ['Opening a card moves nothing above it or beside it.', 'The paper, the text column, the tab you pressed and the first line move 0 px, at 1600 and at 390; only what lies below is pushed down.'],
  ['Every fact on a card has one home.', 'Nothing is said twice, in the same words or in others.'],
  ['A card shows what this reader can do now.', 'A closed document offers nothing to do but 🥂, and keeps everything it recorded readable.'],
  ['A control is drawn only while it has a job.', 'A dark one says, in words on the card, what will wake it — a phone has no hover.'],
  ['An empty part is not drawn, and takes its hairline with it.', 'Hairlines only stand between two things; a card is never taller than what it holds.'],
  ['A fact is text, a choice is a radio, an act is a button — and each drawing means one thing.', 'Nothing that already happened looks pressable; no button is green.'],
  ['One button row.', '🗑️ at the left only when something of yours can be removed, one note in the middle, at most two buttons at the right, one way to acknowledge.'],
  ['The same thing is drawn the same way everywhere.', 'And every card says what it is about, or what it asks, in one place.'],
  ['Nothing you are in the middle of is taken by the page updating.', 'A caret, a press, a drag or a half-typed value survives every update. <b>Not built yet</b> — BUILD.md stage 9.'],
];

const checks = [
  ['Opening moves nothing above or beside the card', 185, 52, 185, 52],
  ['The first line lands on its paragraph', 242, 57, 242, 57],
  ['Nothing drawn above the first line', 102, 0, 102, 0],
  ['A card never covers the line above', 120, 0, 141, 0],
  ['No padded blank under a card', 30, 0, 24, 0],
  ['Hairlines only between two things', 24, 0, 24, 0],
  ['No empty part drawn', 232, 0, 232, 0],
  ['No control without a job', 193, 0, 193, 0],
  ['A dark button says why, in words', 107, 0, 107, 0],
  ['🗑️ only with something to remove', 216, 13, 216, 13],
  ['Every button row one of six shapes', 119, 0, 119, 0],
  ['Each drawing means one thing', 84, 0, 84, 0],
  ['Labels in one place', 102, 0, 102, 0],
  ['The closed page offers nothing but 🥂', 268, 0, 210, 0],
  ['The closed page keeps what it recorded', 31, 0, 31, 0],
  ['No present-tense power on a closed page', 10, 0, 10, 0],
  ['Nothing floats over text', 2, 1, 1, 0],
  ['No *undefined* printed (fixture)', 0, 0, 0, 0],
];

const stages = [
  ['0', 'Measure and guard', 'The new checks in the card audit, reporting today\'s counts; the fixture\'s closed page fixed. Nothing a member sees changes.', 'S · 1 session'],
  ['1', 'One state and one shell', 'CardState and the card shell, the tokens, the STYLE pass on the new words; two read-only cards as pilots.', 'L · 3 sessions, 1 QA'],
  ['2', 'Read-only and acknowledgement cards', 'News, grants, gates, the park, 🍾: OK only while owed, no close-only OK, *Accept 🏛️*; the four live-only news cards seen for the first time.', 'M · 2 sessions, 1 QA'],
  ['3', 'The band\'s settings', 'Settings, the birth, 🪪 🤝 🎩, power cards, the composer: the first line is the rule, who chose it is text, no *Set to*. Fixes *Set to undefined*.', 'XL · 5–6 sessions, 2 QA'],
  ['4', 'Motions, 👑 and motion records', 'Records lead with their outcome; the mover\'s unlabelled radio and 👑\'s green ✒️ go.', 'M · 2–3 sessions, 1 QA'],
  ['5', 'Doors and people', '✉️ ❌ 🌂, ✋ 🖼️ 📧, admissions, the applicant\'s cards: the asks, the 4 px, the empty-list sentences.', 'M · 2 sessions, 1 QA'],
  ['6', 'The charter\'s judgment cards', 'Quick, gap, race, ⏳, deadlock, patch, yours: the tab you press stops dropping; labels in one place; the phone\'s wider card.', 'L · 3–4 sessions, 1–2 QA'],
  ['7', 'Records and the closed page', 'The closed page offers only 🥂 and keeps everything; 🥂 discharges owed OKs (the one host change, a full deploy).', 'L · 3 sessions, 1 QA'],
  ['8', 'Edit mode, the rows, the 📝 door, the drawers', 'Overlays never cover text; one ✏️ in edit mode; the phone\'s contents drawer.', 'M · 2 sessions, 1 QA'],
  ['9', 'Keyed re-render', 'Nothing you are holding is taken by an update (principle 10); the guard flags retired where a walk proves it.', 'L · 3–4 sessions, 1 QA'],
  ['10', 'Retire and fold', 'The old shells deleted; every check strict on every card; SURFACE read end to end.', 'S–M · 1–2 sessions'],
];

// Lead: the 🪶 card, both widths, and the birth.
const t = pairOf['title-settled'];
const tf = pairOf['title-founding'];
let leadHtml = shotPair(t['1600'][0], t['1600'][1], '🪶 Title, settled, opened by the Founder', '1600', true) +
  shotPair(t['390'][0], t['390'][1], 'The same card on a phone', '390', true) +
  shotPair(tf['1600'][0], tf['1600'][1], '🪶 at the birth, before there is a title', '1600', true);

// Gallery: the five worked cards at both widths, then one pair per family.
let gal = '<h3>The five worked cards, at both widths</h3>';
for (const [id, cap] of lead) {
  const w = pairOf[id];
  gal += `<details class="fam"><summary>${html(cap)}</summary>` + shotPair(w['1600'][0], w['1600'][1], cap, '1600') + shotPair(w['390'][0], w['390'][1], cap, '390') + '</details>';
}
gal += '<h3>One pair per card family, at 1600</h3>';
for (const [cap, id] of families) {
  const w = pairOf[id];
  if (!w || !w['1600']) throw new Error('no pair ' + id);
  gal += `<details class="fam"><summary>${html(cap)}</summary>` + shotPair(w['1600'][0], w['1600'][1], cap, '') + '</details>';
}

const nQ = questions.length, nF = findings.length, N = items.length;
const answerIndex = items.map((it) => ({ key: it.key, id: it.id, opts: it.options.map(([l]) => l.replace(/\*/g, '')) }));

const page = `<title>Surface Redesign Review</title>
<style>
:root{
  --desk:#EEF0F2; --sheet:#FFFFFF; --ink:#212529; --muted:#6B747C; --border:#DEE2E6;
  --primary:#0D6EFD; --primary-subtle:#CFE2FF; --ok:#198754; --ok-subtle:#D1E7DD;
  --amber:#8a5a00; --amber-bg:#FFF3CD; --frame:#FFFFFF; --code-bg:#F1F3F5;
  --font-text: Georgia, 'Charis SIL', Cambria, 'Times New Roman', serif;
  --font-ui: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color-scheme: light;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --desk:#15181b; --sheet:#1f2327; --ink:#E6E8EA; --muted:#9AA3AB; --border:#343a40;
    --primary:#6EA8FE; --primary-subtle:#1c2f4d; --ok:#5BC08A; --ok-subtle:#17352a;
    --amber:#f0c060; --amber-bg:#3a2f12; --frame:#F5F6F7; --code-bg:#2b3035;
    color-scheme: dark;
  }
}
:root[data-theme="dark"]{
  --desk:#15181b; --sheet:#1f2327; --ink:#E6E8EA; --muted:#9AA3AB; --border:#343a40;
  --primary:#6EA8FE; --primary-subtle:#1c2f4d; --ok:#5BC08A; --ok-subtle:#17352a;
  --amber:#f0c060; --amber-bg:#3a2f12; --frame:#F5F6F7; --code-bg:#2b3035;
  color-scheme: dark;
}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--desk);color:var(--ink);font-family:var(--font-ui);font-size:15px;line-height:1.5;padding-inline:16px;padding-block:0 48px;overflow-x:hidden}
.wrap{max-width:980px;margin:0 auto}
.sheet{background:var(--sheet);border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08);padding:24px 28px;margin:16px 0}
@media (max-width:600px){.sheet{padding:18px 14px}}
h1{font-family:var(--font-text);font-weight:400;font-size:2rem;line-height:1.2;margin:8px 0 4px}
h2{font-family:var(--font-text);font-weight:400;font-size:1.5rem;margin:0 0 12px;padding-bottom:6px;border-bottom:1px solid var(--border)}
h3{font-family:var(--font-text);font-size:1.15rem;margin:18px 0 8px;line-height:1.3}
p{margin:0 0 10px}
.prose p, .item p{font-family:var(--font-text);font-size:1.02rem;line-height:1.55}
.eyebrow,.num,.kind,.tag,.w,.lbl{font-family:var(--font-ui)}
.eyebrow{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.lbl{font-weight:700;font-size:.9rem}
code{font-family:ui-monospace,Consolas,monospace;font-size:.85em;background:var(--code-bg);padding:1px 4px;border-radius:4px;overflow-wrap:anywhere}
a{color:var(--primary)}
.bar{position:sticky;top:0;z-index:5;background:var(--desk);padding:10px 0;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;border-bottom:1px solid var(--border)}
.bar .count{font-weight:600}
nav.toc{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.88rem;padding:8px 0 0}
nav.toc a{text-decoration:none}
section,.item{scroll-margin-top:64px}
@media (max-width:600px){.bar{gap:4px 10px;padding:8px 0}.bar .status{font-size:.75rem;flex-basis:100%}}
button{font:inherit;cursor:pointer;border-radius:8px;border:1px solid var(--border);background:var(--sheet);color:var(--ink);padding:6px 12px}
button.primary{background:var(--primary);border-color:var(--primary);color:#fff;font-weight:600}
:root[data-theme="dark"] button.primary{color:#0b1320}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) button.primary{color:#0b1320}}
.status{font-size:.85rem;color:var(--muted)}
.status.warn{color:var(--amber)}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0}
.stat{border:1px solid var(--border);border-radius:8px;padding:10px 12px}
.stat b{display:block;font-size:1.5rem;font-family:var(--font-text);font-weight:400}
.stat span{font-size:.82rem;color:var(--muted)}
figure.pair{margin:14px 0}
figure.pair figcaption{font-size:.88rem;color:var(--muted);margin-bottom:6px}
.w{font-size:.72rem;border:1px solid var(--border);border-radius:4px;padding:0 4px;margin-left:4px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}
@media (max-width:700px){.two{grid-template-columns:1fr}}
.narrow .two{grid-template-columns:repeat(2,minmax(0,300px))}
@media (max-width:700px){.narrow .two{grid-template-columns:minmax(0,300px)}}
.side{background:var(--frame);border:1px solid var(--border);border-radius:8px;padding:6px;min-width:0}
.side img{display:block;max-width:100%;height:auto;border-radius:4px}
.side.none p{color:#6B747C;font-size:.85rem;margin:6px}
.tag{display:inline-block;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#6B747C;margin:0 0 4px 2px}
.tag.new{color:#0D6EFD}
ol.principles{padding-left:1.4em;margin:0}
ol.principles li{margin:0 0 10px;font-family:var(--font-text);font-size:1.02rem}
ol.principles li b{font-weight:700}
ol.principles li span{color:var(--muted);display:block;font-size:.95rem}
.tablewrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
table{border-collapse:collapse;width:100%;font-size:.9rem;min-width:520px}
th,td{padding:6px 8px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
th{font-size:.78rem;text-transform:uppercase;letter-spacing:.03em;color:var(--muted)}
td.n{text-align:right;font-variant-numeric:tabular-nums}
td.good{color:var(--ok);font-weight:700}
.item{border-top:1px solid var(--border);padding:18px 0 8px}
.item:first-of-type{border-top:0}
.item header{display:flex;gap:8px;align-items:center}
.num{font-weight:700;color:var(--primary);font-size:.95rem}
.kind{font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);border:1px solid var(--border);border-radius:4px;padding:0 5px}
.item.f .kind{color:var(--amber);border-color:var(--amber)}
.item h3{margin-top:6px}
.ruling{border-left:3px solid var(--border);padding-left:10px}
details.shots, details.fam{margin:8px 0}
details summary{cursor:pointer;font-size:.9rem;color:var(--primary)}
fieldset.answer{border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin:12px 0 4px}
fieldset.answer legend{font-size:.8rem;font-weight:700;color:var(--muted);padding:0 4px}
label.opt{display:flex;gap:10px;align-items:flex-start;padding:6px 4px;border-radius:6px;cursor:pointer;font-size:.93rem}
label.opt:hover{background:var(--primary-subtle)}
label.opt input{margin-top:4px;flex:none;width:16px;height:16px;accent-color:var(--primary)}
.od{color:var(--muted);font-size:.88rem}
.rec{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--primary);border:1px solid var(--primary);border-radius:4px;padding:0 4px;margin-left:4px;white-space:nowrap}
label.note{display:block;font-size:.85rem;color:var(--muted);margin-top:6px}
label.note textarea{display:block;width:100%;margin-top:4px;font:inherit;font-size:.93rem;color:var(--ink);background:var(--sheet);border:1px solid var(--border);border-radius:6px;padding:6px 8px;resize:vertical}
.saved{font-size:.78rem;color:var(--muted);min-height:1.2em;margin-top:4px}
.saved.ok{color:var(--ok)}
.saved.err{color:var(--amber)}
ul.backlog li{margin:0 0 8px;font-family:var(--font-text)}
.stagelist{list-style:none;padding:0;margin:0}
.stagelist li{display:grid;grid-template-columns:2.2em 1fr;gap:6px 10px;padding:8px 0;border-bottom:1px solid var(--border)}
.stagelist .sn{font-weight:700;color:var(--primary);font-family:var(--font-text);font-size:1.2rem}
.stagelist .st b{display:block}
.stagelist .sz{font-size:.8rem;color:var(--muted)}
.notice{background:var(--amber-bg);color:var(--amber);border-radius:8px;padding:8px 12px;font-size:.9rem;margin:8px 0}
#copybox{width:100%;min-height:8em;font-family:ui-monospace,Consolas,monospace;font-size:.82rem;margin-top:8px;display:none;background:var(--sheet);color:var(--ink);border:1px solid var(--border);border-radius:6px}
.lead-q{font-family:var(--font-text);font-size:1.1rem}
</style>
<div class="wrap">
<div class="bar" id="bar">
  <span class="count" id="count">0 of ${N} answered</span>
  <button class="primary" id="copyall" type="button">Copy all answers</button>
  <span class="status" id="status">Loading saved answers…</span>
</div>
<nav class="toc"><a href="#lead">The 🪶 card</a><a href="#principles">Principles</a><a href="#checks">Checks</a><a href="#questions">Questions</a><a href="#findings">Findings</a><a href="#gallery">Every family</a><a href="#build">Build</a><a href="#proto">Prototype</a></nav>
<textarea id="copybox" readonly aria-label="All answers, to copy"></textarea>

<section class="sheet prose" id="lead">
  <div class="eyebrow">Q1541 · the surface redesign · phase one review · 25 September 2026</div>
  <h1>Every card, one grammar</h1>
  <p>On 24 September the 🪶 title card showed four faults at once: the tab you pressed turned grey, a block under the rule restated the rule, a 🗑️ offered to put back nothing, and the paper's edge moved when the card opened. You asked for a better design for the cards and the page. This is it — proposed, not built: nothing a member sees has changed.</p>
  ${leadHtml}
  <h2 style="margin-top:22px">What the audit found</h2>
  <p>Every card kind was opened in every state it has — <b>1,336 openings of 37 of the 40 kinds</b>, at 1600 and at 390 — and <b>1,226 of them (92%) carry at least one fault</b>. The faults fall into ten kinds. By volume the biggest is a fact drawn as a button (who chose a rule, as a pressed blue pill: 490 cards). By severity the worst is a card saying something false: a closed document offering <i>Accept</i>, <i>Send</i> and <i>Save</i>, and a member reading <i>Set to undefined</i>.</p>
  <div class="stats">
    <div class="stat"><b>92%</b><span>of card openings carry a fault</span></div>
    <div class="stat"><b>33–99 px</b><span>the tab you press drops on every charter card</span></div>
    <div class="stat"><b>23</b><span>shapes of button row, for one rule</span></div>
    <div class="stat"><b>388</b><span>🗑️ with nothing to put back</span></div>
  </div>
  <p>They come from four causes: <b>the card's frame is drawn whatever it holds</b>; <b>where the document is in its life and who is looking are not given to the card</b>, so each of 40 builders works them out again; <b>one fact has several readers</b> (who chose a rule has three, and they disagree); and <b>two different shells</b> draw the band's cards and the charter's.</p>
  <h2>The verdict</h2>
  <p>The proposal answers all four: every card is drawn by one shell from one description of its state, every fact has one home, and a part or a button exists only while it has something in it or a job to do. In the prototype the band's settled cards read clearly better at once; after an adversarial critique and a revision, records, the closed page and the charter's labels are at least as good as today, and the tab you press stops moving. Measured by the same instrument on both pages (below), the prototype passes checks today's page fails hundreds of times.</p>
  <p class="notice"><b>The honest part.</b> The prototype is a sorter: it rearranges what today's cards already draw. The checks pass against the sorter, and the real build must pass them again. Converting the 40 card bodies is most of the work — BUILD.md estimates 27–32 builder sessions and 10–11 QA rounds. Principle 10 (nothing you are holding is taken by an update) is not built yet. The recommendation is to go ahead in stages: question 1541.1.</p>
  <p class="lead-q">${nQ} questions and ${nF} findings follow. Every answer saves as you choose it; <i>Copy all answers</i> gives the paste-back lines.</p>
</section>

<section class="sheet" id="principles">
  <h2>The ten principles</h2>
  <p class="prose">Each is a sentence you can hold against a screenshot, and each has a check that measures it.</p>
  <ol class="principles">${principles.map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join('')}</ol>
</section>

<section class="sheet" id="checks">
  <h2>The checks: today against the prototype</h2>
  <p class="prose">Cards failing each check, measured by one instrument on both pages over 352 card openings per run (grammar-audit, a copy of card-audit with the new checks). What the prototype still fails is explained in <code>checks.md</code>: mostly stated exceptions and measurement choices, and 13 bins the sorter cannot judge because it cannot tell a sent choice from an unsent one.</p>
  <div class="tablewrap"><table>
    <thead><tr><th>Check</th><th>Today 1600</th><th>Proposed 1600</th><th>Today 390</th><th>Proposed 390</th></tr></thead>
    <tbody>${checks.map(([n, a, b, c, d]) => `<tr><td>${html(n)}</td><td class="n">${a}</td><td class="n${b === 0 && a > 0 ? ' good' : ''}">${b}</td><td class="n">${c}</td><td class="n${d === 0 && c > 0 ? ' good' : ''}">${d}</td></tr>`).join('')}</tbody>
  </table></div>
  <p class="prose" style="margin-top:10px;font-size:.92rem">Not measured on either page: principle 10 (not built), and six live-only card kinds no fixture opens. <i>No undefined printed</i> reads 0 because the fixture never reaches the one live state that prints it (finding 1541.29).</p>
</section>

<section class="sheet" id="questions">
  <h2>Questions (1541.1–1541.${nQ})</h2>
  <p class="prose">Genuine choices, most consequential first, the recommended option first. The prototype builds every recommendation.</p>
  ${items.filter((i) => i.kind === 'q').map(itemHtml).join('\n')}
</section>

<section class="sheet" id="findings">
  <h2>Findings (1541.${nQ + 1}–1541.${N})</h2>
  <p class="prose">Faults in today's page that any design should fix. Each is fixed in the build stage named unless you veto it; (b) brings one forward as a patch now.</p>
  ${items.filter((i) => i.kind === 'f').map(itemHtml).join('\n')}
  <h3>The items you held for the redesign (backlog 1541)</h3>
  <ul class="backlog">${backlog.map(([a, b]) => `<li><b>${html(a)}</b> — ${html(b)}</li>`).join('')}</ul>
</section>

<section class="sheet" id="gallery">
  <h2>Every card family, before and after</h2>
  <p class="prose">Today on the left, the prototype on the right. The full set — 80 card pairs and 19 zones at both widths, each captioned — is <code>mockups.html</code> in the prototype's folder.</p>
  ${gal}
</section>

<section class="sheet" id="build">
  <h2>The build, in stages</h2>
  <p class="prose">From <code>BUILD.md</code>. SURFACE stays the rule until your answers amend it, and each amendment lands with the stage that changes those cards. Each stage ends with every CI gate and its walks green, the probes re-frozen with their diff read, and a deploy only on your word. The screenshots and the branch itself never reach main — the repository is public; the build brings code and docs only.</p>
  <ol class="stagelist">${stages.map(([n, a, b, c]) => `<li><span class="sn">${n}</span><span class="st"><b>${html(a)}</b>${html(b)}<br><span class="sz">${html(c)}</span></span></li>`).join('')}</ol>
</section>

<section class="sheet prose" id="proto">
  <h2>Open the prototype yourself</h2>
  <p>In <code>C:\\users\\edsap\\dev\\draft-wt-redesign</code>, run <code>npm run design</code> and open the address it prints, then:</p>
  <ul>
    <li><code>/proposal/proto/session-view.html?fixture=session&amp;band=1</code> — the Hollow Oak session with the Rules unfolded; add <code>&amp;closed=1</code> for the closed page, or drop the query for the founding.</li>
    <li><code>/proposal/proto/session-view.html?fixture=session</code> — the charter alone. Narrow the window below 900 px for the phone's drawers and task sheet.</li>
    <li><code>/proposal/mockups.html</code> — every pair, captioned, at both widths.</li>
    <li>Today's page for comparison: <code>/session-view.html</code> with the same queries.</li>
  </ul>
  <p>The prototype lists what it does not build in a panel at its top: the sorter, principle 10, the live-only cards, the unchanged topbar, rails and edit mode, the phone's wider card, and the words that have not passed STYLE.</p>
</section>
</div>
<script>
(function(){
  var ITEMS = ${JSON.stringify(answerIndex)};
  var LSKEY = 'q1541-review-answers';
  var state = {};
  var db = null, readOnly = false, dbTried = false;
  var timers = {}, chain = Promise.resolve();
  var $ = function(s, r){ return (r||document).querySelector(s); };
  var statusEl = $('#status');
  function setStatus(t, warn){ statusEl.textContent = t; statusEl.className = 'status' + (warn ? ' warn' : ''); }
  function lsRead(){ try { var v = localStorage.getItem(LSKEY); return v ? JSON.parse(v) : {}; } catch(e){ return {}; } }
  function lsWrite(){ try { localStorage.setItem(LSKEY, JSON.stringify(state)); } catch(e){} }
  function box(key){ return document.getElementById('i' + key); }
  function mark(key, text, cls){ var b = box(key); if (!b) return; var s = $('.saved', b); s.textContent = text; s.className = 'saved' + (cls ? ' ' + cls : ''); }
  function count(){ var n = 0; ITEMS.forEach(function(it){ if (state[it.key] && state[it.key].choice) n++; }); $('#count').textContent = n + ' of ' + ITEMS.length + ' answered'; }
  function apply(key, v){
    if (!v) return; state[key] = { choice: v.choice || '', note: v.note || '', at: v.at || '' };
    var b = box(key); if (!b) return;
    var r = v.choice ? b.querySelector('input[type=radio][value="' + v.choice + '"]') : null;
    b.querySelectorAll('input[type=radio]').forEach(function(x){ x.checked = (x === r); });
    var ta = $('textarea', b); if (ta && document.activeElement !== ta) ta.value = v.note || '';
    if (v.choice || v.note) mark(key, db && !readOnly ? 'Saved' : 'Saved in this browser', 'ok');
  }
  function write(key){
    var v = state[key]; lsWrite();
    if (!db || readOnly) { mark(key, 'Saved in this browser only', 'ok'); return Promise.resolve(); }
    mark(key, 'Saving…');
    var doc = { choice: v.choice || '', note: v.note || '', at: v.at };
    var attempt = function(retry){
      return db.doc('answers/' + key).set(doc).then(function(){ mark(key, 'Saved', 'ok'); }, function(e){
        var code = e && e.code;
        if (code === 'unavailable' && !retry) return new Promise(function(r){ setTimeout(r, 400 + Math.random()*600); }).then(function(){ return attempt(true); });
        if (code === 'invalid_argument' || code === 'revoked' || code === 'not_granted') { readOnly = true; setStatus('Your answers can only be saved in this browser here', true); }
        mark(key, 'Not saved to the page — kept in this browser', 'err');
      });
    };
    return attempt(false);
  }
  function changed(key){
    var b = box(key); var r = b.querySelector('input[type=radio]:checked'); var ta = $('textarea', b);
    state[key] = { choice: r ? r.value : '', note: ta ? ta.value : '', at: new Date().toISOString() };
    count(); mark(key, 'Unsaved…');
    clearTimeout(timers[key]);
    timers[key] = setTimeout(function(){ chain = chain.then(function(){ return write(key); }); }, 700);
  }
  ITEMS.forEach(function(it){
    var b = box(it.key); if (!b) return;
    b.querySelectorAll('input[type=radio]').forEach(function(x){ x.addEventListener('change', function(){ changed(it.key); }); });
    var ta = $('textarea', b); if (ta) ta.addEventListener('input', function(){ changed(it.key); });
  });
  // Load: this browser's copy first, then the page's store, which wins. Nothing is written on load.
  var local = lsRead(); Object.keys(local).forEach(function(k){ apply(k, local[k]); }); count();
  function noDb(){ setStatus('Answers are saved only in this browser — use Copy all answers to send them', true); }
  try {
    var c = window.claude, p = c && typeof c.use === 'function' ? c.use('db') : null;
    if (!p) noDb();
    else Promise.race([p, new Promise(function(r){ setTimeout(function(){ r(null); }, 12000); })]).then(function(d){
      if (!d) { noDb(); return; }
      db = d;
      return db.collection('answers').get().then(function(snap){
        snap.docs.forEach(function(s){ if (s.exists) apply(s.id, s.data()); });
        count(); setStatus('Answers save to this page as you choose');
      }, function(){ db = null; noDb(); });
    }, function(){ noDb(); });
  } catch(e){ noDb(); }
  // Copy all answers.
  function lines(){
    var out = [];
    ITEMS.forEach(function(it){
      var v = state[it.key]; if (!v || (!v.choice && !v.note)) return;
      var i = v.choice ? 'abcd'.indexOf(v.choice) : -1;
      var ch = i >= 0 ? '(' + v.choice + ') ' + it.opts[i] : 'no choice';
      out.push(it.id + ': ' + ch + (v.note ? ' — ' + v.note.replace(/\\s+/g, ' ').trim() : ''));
    });
    return out.length ? out.join('\\n') : '(no answers yet)';
  }
  $('#copyall').addEventListener('click', function(){
    var text = lines(); var btn = this; var tb = $('#copybox');
    var fallback = function(){ tb.style.display = 'block'; tb.value = text; tb.focus(); tb.select(); btn.textContent = 'Selected — copy it'; };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function(){ btn.textContent = 'Copied'; setTimeout(function(){ btn.textContent = 'Copy all answers'; }, 2000); }, fallback);
      else fallback();
    } catch(e){ fallback(); }
  });
})();
</script>
`;

fs.mkdirSync(IMG, { recursive: true });
for (const f of fs.readdirSync(IMG)) fs.unlinkSync(path.join(IMG, f));
let bytes = 0;
for (const [rn, src] of used) { fs.copyFileSync(src, path.join(IMG, rn)); bytes += fs.statSync(src).size; }
fs.writeFileSync(path.join(REVIEW, 'index.html'), page);
fs.writeFileSync(path.join(REVIEW, 'files.txt'), [...used.keys()].sort().map((f) => 'img/' + f).join('\n') + '\n');
console.log('items', N, '(q', nQ, 'f', nF, ') images', used.size, 'MB', (bytes / 1048576).toFixed(2), 'html KB', (Buffer.byteLength(page) / 1024).toFixed(0));
