/**
 * write-mockups.mjs — Q1541 stage 4: design/proposal/mockups.html from
 * data/mockup-pairs.json (mockup-pairs.mjs) and the captions below.
 *
 *   node design/proposal/tools/write-mockups.mjs
 *
 * Every image path is relative (shots/current/…, shots/proposed/…), every
 * image lazy, with its intrinsic size read from the PNG header so the page
 * does not jump as it loads. Also prunes shots/proposed/ to the files the
 * page shows.
 */
import { readFile, writeFile, readdir, stat, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const P = join(resolve(fileURLToPath(new URL('../../..', import.meta.url))), 'design', 'proposal');
const data = JSON.parse(await readFile(join(P, 'data', 'mockup-pairs.json'), 'utf8'));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/`(.+?)`/g, '<code>$1</code>');

async function dims(dir, f) {
  try { const b = await readFile(join(P, 'shots', dir, f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; } catch { return null; }
}
const shown = new Set();
async function img(dir, f, alt) {
  if (!f) return '<div class="none">no crop</div>';
  const d = await dims(dir, f);
  if (!d) return '<div class="none">missing: ' + esc(f) + '</div>';
  if (dir === 'proposed') shown.add(f);
  return '<a href="shots/' + dir + '/' + esc(f) + '"><img loading="lazy" decoding="async" src="shots/' + dir + '/' + esc(f) +
    '" width="' + d[0] + '" height="' + d[1] + '" alt="' + esc(alt) + '"></a>';
}

const C = JSON.parse(await readFile(join(P, 'tools', 'mockup-captions.json'), 'utf8'));
const FAMILY = [
  ['judgment', 'Judgment cards (the charter)'], ['composer', 'Your own drafts and proposals'], ['record', 'Records'],
  ['setting', 'Settings (the band)'], ['power', 'Power cards'], ['motion', 'Motions'], ['news', 'News, grants and gates'],
  ['lifecycle', 'Begin and close'], ['door', 'Doors'], ['identity', 'Identity'],
];

async function pairHtml(p, cap, title) {
  const alt = (w, side) => title + ' — ' + p.state + ' — ' + side + ' at ' + w;
  const widths = [];
  for (const w of [1600, 390]) {
    widths.push('<div class="w w' + w + '"><div class="wlab">' + w + '</div><div class="pair">' +
      '<figure><figcaption>Today</figcaption>' + await img('current', p.cur[w], alt(w, 'today')) + '</figure>' +
      '<figure class="pro"><figcaption>Proposed</figcaption>' + await img('proposed', p.pro[w], alt(w, 'proposed')) + '</figure>' +
      '</div></div>');
  }
  return '<article class="pairbox" id="' + esc((p.key + '-' + p.walk).replace(/[^A-Za-z0-9_-]+/g, '_')) + '">' +
    '<h4>' + esc(title) + ' <span class="st">' + esc(p.state) + '</span></h4>' +
    '<p class="meta"><span class="why">' + esc(p.why) + '</span> · <code>' + esc(p.key) + '</code> · walk <code>' + esc(p.walk) + '</code>' +
    (p.h && p.h.cur && p.h.pro ? ' · card height at 1600: ' + p.h.cur + ' → ' + p.h.pro + ' px' : '') + '</p>' +
    (cap ? '<p class="cap">' + (cap.by ? '<span class="by">' + md(cap.by) + '</span> ' : '') + md(cap.text) + '</p>' : '') +
    (cap && cap.worse ? '<p class="worse"><b>Worse than today:</b> ' + md(cap.worse) + '</p>' : '') +
    (cap && cap.resolved ? '<p class="fixed"><b>Worse in v1, resolved in v2:</b> ' + md(cap.resolved) + '</p>' : '') +
    widths.join('') + '</article>';
}

let body = '';
const index = [['lead', 'The five worked cards (grammar §6)']];

// --- lead ---------------------------------------------------------------------
body += '<section id="lead"><h2>The five worked cards (grammar §6)</h2>' +
  '<p>grammar.md §6 builds five cards slot by slot. Here each is shot from the prototype beside today\'s page. Where §6 names a live-only state, the fixture\'s nearest card stands in, and the caption says so.</p>';
for (const p of data.lead) {
  const cap = C.lead[p.sec];
  body += await pairHtml(p, cap, '§' + p.sec + ' — ' + cap.title);
}
body += '</section>';

// --- kinds by family -------------------------------------------------------------
for (const [fam, label] of FAMILY) {
  const kinds = data.kinds.filter((k) => k.family === fam);
  if (!kinds.length) continue;
  index.push([fam, label]);
  body += '<section id="' + fam + '"><h2>' + esc(label) + '</h2>';
  for (const k of kinds) {
    const cap = C.kinds[k.kind] || {};
    body += '<div class="kind"><h3><code>' + esc(k.kind) + '</code> — ' + esc(k.row) + '</h3>';
    if (cap.intro) body += '<p class="cap">' + (cap.by ? '<span class="by">' + md(cap.by) + '</span> ' : '') + md(cap.intro) + '</p>';
    if (!k.reached) body += '<p class="nc"><b>Not reached.</b> ' + md(cap.missing || 'Stage 1 could not open this card on today\'s page either (inventory.md, *Not reached*), so there is nothing to compare.') + '</p>';
    else if (k.liveOnly || cap.notConverted) {
      body += '<p class="nc"><b>Not converted in the prototype.</b> ' + md(cap.missing || 'This card is reached only on a live document; the prototype runs on the fixture and was never opened on one, so no proposed crop is shown rather than a fake.') + '</p>';
      if (k.current) body += '<div class="solo"><figure><figcaption>Today, ' + esc(k.current.state) + ', 1600</figcaption>' + await img('current', k.current[1600], k.kind + ' today') + '</figure>' +
        '<figure class="narrow"><figcaption>390</figcaption>' + await img('current', k.current[390], k.kind + ' today at 390') + '</figure></div>';
    } else {
      for (const p of k.pairs) body += await pairHtml(p, (cap.pairs && cap.pairs[p.key + '|' + p.walk]) || null, k.kind);
    }
    body += '</div>';
  }
  body += '</section>';
}

// --- zones --------------------------------------------------------------------
index.push(['zones', 'Zones: the page, the band, the desk, the phone']);
body += '<section id="zones"><h2>Zones: the page, the band, the desk, the phone</h2><p>' + md(C.zonesIntro) + '</p>';
for (const zg of C.zones) {
  body += '<div class="kind"><h3>' + esc(zg.title) + '</h3><p class="cap">' + (zg.by ? '<span class="by">' + md(zg.by) + '</span> ' : '') + md(zg.text) + '</p>' +
    (zg.worse ? '<p class="worse"><b>Worse than today:</b> ' + md(zg.worse) + '</p>' : '') +
    (zg.resolved ? '<p class="fixed"><b>Worse in v1, resolved in v2:</b> ' + md(zg.resolved) + '</p>' : '');
  if (zg.notConverted) {
    body += '<p class="nc"><b>Not converted in the prototype.</b> ' + md(zg.notConverted) + '</p><div class="solo">';
    for (const s of zg.shots) body += '<figure' + (s.endsWith('-390.png') ? ' class="narrow"' : '') + '><figcaption>Today · ' + esc(s.replace(/\.png$/, '')) + '</figcaption>' + await img('current', s, zg.title) + '</figure>';
    body += '</div>';
  } else {
    for (const s of zg.shots) {
      const z = data.zones.find((q) => q.cur === s);
      const w = s.endsWith('-390.png') ? 390 : 1600;
      body += '<div class="w w' + w + '"><div class="wlab">' + esc(s.replace(/\.png$/, '')) + '</div><div class="pair">' +
        '<figure><figcaption>Today</figcaption>' + await img('current', s, zg.title + ' today') + '</figure>' +
        '<figure class="pro"><figcaption>Proposed</figcaption>' + await img('proposed', z && z.pro, zg.title + ' proposed') + '</figure></div></div>';
    }
  }
  body += '</div>';
}
body += '</section>';

const pairs = data.lead.length + data.kinds.reduce((s, k) => s + (k.liveOnly || !k.reached || (C.kinds[k.kind] || {}).notConverted ? 0 : k.pairs.length), 0);
const zonePairs = C.zones.filter((z) => !z.notConverted).reduce((s, z) => s + z.shots.length, 0);

const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Surface Redesign Mockups</title>
<meta name="description" content="Q1541 stage 4: every card kind and zone, today beside the prototype, at 1600 and 390.">
<style>
  :root {
    --bg: #FFFFFF; --desk: #EEF0F2; --ink: #212529; --muted: #6B747C; --border: #DEE2E6;
    --primary: #0D6EFD; --ok: #198754; --wrong: #B02A37; --warn-bg: #FFF4E5;
    --font-text: 'Charis SIL', Charter, Georgia, 'Times New Roman', serif;
    --font-ui: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --t-body: 1rem; --t-ui: 0.889rem; --t-small: 0.79rem; --t-cap: 0.702rem; --t-micro: 0.624rem;
    --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 24px; --r-md: 0.375rem;
    --shadow-sm: 0 1px 1px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.10);
    color-scheme: light;
  }
  * { box-sizing: border-box; }
  html { background: var(--desk); }
  body { margin: 0; background: var(--desk); color: var(--ink); font: var(--t-body)/1.55 var(--font-ui); }
  main { max-width: 1520px; margin: 0 auto; padding: var(--s5) var(--s4) 64px; }
  h1 { font: 700 1.6rem/1.25 var(--font-text); margin: 0 0 var(--s2); }
  h2 { font: 400 1.333rem/1.25 var(--font-text); border-bottom: 1px solid var(--border); padding-bottom: var(--s2); margin: 48px 0 var(--s4); }
  h3 { font: 700 1.05rem/1.3 var(--font-ui); margin: 0 0 var(--s2); }
  h4 { font: 600 var(--t-ui)/1.3 var(--font-ui); margin: 0 0 var(--s1); }
  p { max-width: 80ch; }
  code { font-size: .9em; background: rgba(0,0,0,.05); padding: 0 3px; border-radius: 3px; }
  .lede { font-family: var(--font-text); font-size: 1.05rem; }
  nav.idx { background: var(--bg); border-radius: var(--r-md); box-shadow: var(--shadow-sm); padding: var(--s3) var(--s4); margin: var(--s4) 0; }
  nav.idx ol { margin: 0; padding-left: 1.4em; columns: 2 18rem; }
  nav.idx a { color: var(--primary); text-decoration: none; }
  .kind, section > .pairbox { background: var(--bg); border-radius: var(--r-md); box-shadow: var(--shadow-sm); padding: var(--s4); margin: 0 0 var(--s4); }
  .kind .pairbox { border-top: 1px solid var(--border); padding-top: var(--s3); margin-top: var(--s3); }
  .st { font-weight: 400; color: var(--muted); }
  .meta { font-size: var(--t-cap); color: var(--muted); margin: 0 0 var(--s2); }
  .cap { font-size: var(--t-small); margin: 0 0 var(--s2); }
  .by { display: inline-block; font-size: var(--t-cap); color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: 0 var(--s2); margin-right: var(--s1); }
  .worse { font-size: var(--t-small); background: var(--warn-bg); border-left: 3px solid #E8A33D; padding: var(--s2) var(--s3); margin: 0 0 var(--s3); max-width: none; }
  .fixed { font-size: var(--t-small); background: #EDF7F0; border-left: 3px solid var(--ok); padding: var(--s2) var(--s3); margin: 0 0 var(--s3); max-width: none; }
  .nc { font-size: var(--t-small); color: var(--muted); }
  .w { margin: var(--s3) 0 0; }
  .wlab { font-size: var(--t-micro); text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin-bottom: var(--s1); }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s3); align-items: start; }
  .w390 .pair { grid-template-columns: repeat(2, minmax(0, 330px)); }
  figure { margin: 0; min-width: 0; }
  figcaption { font-size: var(--t-cap); color: var(--muted); margin-bottom: 2px; }
  figure.pro figcaption { color: var(--primary); font-weight: 600; }
  img { display: block; max-width: 100%; height: auto; border: 1px solid var(--border); border-radius: 4px; background: #fff; }
  .solo { display: flex; flex-wrap: wrap; gap: var(--s3); align-items: flex-start; }
  .solo figure { flex: 1 1 420px; max-width: 760px; }
  .solo figure.narrow { flex: 0 1 330px; }
  .none { font-size: var(--t-cap); color: var(--muted); border: 1px dashed var(--border); border-radius: 4px; padding: var(--s3); }
  table { border-collapse: collapse; font-size: var(--t-small); }
  td, th { border-bottom: 1px solid var(--border); padding: var(--s1) var(--s2); text-align: left; vertical-align: top; }
  @media (max-width: 700px) {
    main { padding: var(--s4) var(--s4) 48px; }
    .pair, .w390 .pair { grid-template-columns: 1fr; }
    nav.idx ol { columns: 1; }
    .kind, section > .pairbox { padding: var(--s3); }
  }
</style>
</head>
<body>
<main>
<h1>Surface redesign: mockups (grammar v2)</h1>
<p class="lede">${md(C.intro)}</p>
<p>${md(C.howToRead)}</p>
${C.v2 ? '<p>' + md(C.v2) + '</p>' : ''}
<nav class="idx"><b>Families</b><ol>${index.map(([id, l]) => '<li><a href="#' + id + '">' + esc(l) + '</a></li>').join('')}</ol></nav>
<p class="meta">${pairs} card pairs and ${zonePairs} zone pairs, each at 1600 and 390 where the width has the crop · generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC by <code>tools/write-mockups.mjs</code>.</p>
${body}
</main>
</body>
</html>
`;
await writeFile(join(P, 'mockups.html'), html);

// prune proposed crops the page does not show
let kept = 0, bytes = 0, pruned = 0;
for (const f of await readdir(join(P, 'shots', 'proposed'))) {
  if (!shown.has(f)) { await unlink(join(P, 'shots', 'proposed', f)); pruned++; continue; }
  kept++; bytes += (await stat(join(P, 'shots', 'proposed', f))).size;
}
console.log('mockups.html: ' + pairs + ' card pairs, ' + zonePairs + ' zone pairs · shots/proposed ' + kept + ' files, ' + (bytes / 1048576).toFixed(2) + ' MB (pruned ' + pruned + ')');
