#!/usr/bin/env node
/* Q1401 — the subject, wallet and commit glyphs in Fluent Flat.
 *
 * Fetches Microsoft's Fluent Emoji, Flat style, one file per glyph, and writes
 * `design/fluent-glyphs.svg`: one `<symbol>` per key, on the set's own
 * `viewBox="0 0 32 32"`, under the set's MIT notice. Committed, exactly like
 * `design/emoji-test.txt` and `design/emoji-data.js`, so **the build never
 * reaches the network** — this script is run by hand when the table changes.
 *
 * The table of keys, characters and names is **cards.js's `GLYPH`**, which is
 * the one the page reads; what lives here is only where each picture comes
 * from (folder and stem), which is a build-time fact. The two key sets are
 * asserted equal at every run, so a glyph added to one and not the other is
 * loud rather than silent.
 *
 * Two asset shapes, tried in order, because the hand glyphs carry skin tones:
 *   assets/<Folder>/Flat/<stem>_flat.svg
 *   assets/<Folder>/Default/Flat/<stem>_flat_default.svg
 * A key that resolves to neither is a **finding**: it is printed, left out of
 * the sprite, and the renderer falls back to the character. Never guessed.
 *
 * Usage:  npm run fluent-glyphs        (writes the sprite)
 *         npm run fluent-glyphs -- --check   (fails if the sprite would change)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'design', 'fluent-glyphs.svg');
const CARDS = path.join(ROOT, 'design', 'cards.js');
const BASE = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets';

// key -> [Fluent folder, file stem]. The folder is also the glyph's name in
// cards.js's `GLYPH`, lower-cased; the assertion below keeps the two honest.
const SOURCE = {
  quill: ['Feather', 'feather'],
  pin: ['Round pushpin', 'round_pushpin'],
  card: ['Identification card', 'identification_card'],
  handshake: ['Handshake', 'handshake'],
  zzz: ['Zzz', 'zzz'],
  boot: ['Hiking boot', 'hiking_boot'],
  stopwatch: ['Stopwatch', 'stopwatch'],
  alarm: ['Alarm clock', 'alarm_clock'],
  busts: ['Busts in silhouette', 'busts_in_silhouette'],
  bust: ['Bust in silhouette', 'bust_in_silhouette'],
  writing: ['Writing hand', 'writing_hand'],
  eye: ['Eye', 'eye'],
  globe: ['Globe showing europe-africa', 'globe_showing_europe-africa'],
  memo: ['Memo', 'memo'],
  tophat: ['Top hat', 'top_hat'],
  bulb: ['Light bulb', 'light_bulb'],
  scale: ['Balance scale', 'balance_scale'],
  crown: ['Crown', 'crown'],
  horn: ['Postal horn', 'postal_horn'],
  umbrella: ['Closed umbrella', 'closed_umbrella'],
  hand: ['Raised hand', 'raised_hand'],
  picture: ['Framed picture', 'framed_picture'],
  email: ['E-mail', 'e-mail'],
  envelope: ['Envelope', 'envelope'],
  cross: ['Cross mark', 'cross_mark'],
  bottle: ['Bottle with popping cork', 'bottle_with_popping_cork'],
  glasses: ['Clinking glasses', 'clinking_glasses'],
  'mailbox-gave-up': ['Open mailbox with lowered flag', 'open_mailbox_with_lowered_flag'],
  incoming: ['Incoming envelope', 'incoming_envelope'],
  mailbox: ['Open mailbox with raised flag', 'open_mailbox_with_raised_flag'],
  wave: ['Waving hand', 'waving_hand'],
  pen: ['Black nib', 'black_nib'],
  shield: ['Shield', 'shield'],
  voice: ['Classical building', 'classical_building'],
  pencil: ['Pencil', 'pencil'],
  bin: ['Wastebasket', 'wastebasket'],
  snowflake: ['Snowflake', 'snowflake'],
  link: ['Link', 'link'],
  label: ['Label', 'label'],
  thumbs: ['Thumbs up', 'thumbs_up'],
};

// ---- the page's own table, read out of cards.js ---------------------------
// `GLYPH` is written one entry per line, in the rigid shape this regex reads,
// exactly so this file and that one cannot drift apart in silence.
function readGlyphTable() {
  const src = fs.readFileSync(CARDS, 'utf8');
  const block = src.match(/const GLYPH = \{([\s\S]*?)\n  \};/);
  if (!block) throw new Error('cards.js: no `const GLYPH = {` block found');
  const out = {};
  const rx = /^\s*'([^']+)': \['([^']+)', '([^']+)'\],\s*$/;
  for (const line of block[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('//')) continue;
    const m = line.match(rx);
    if (!m) throw new Error('cards.js: GLYPH entry not in the expected shape: ' + line.trim());
    out[m[1]] = { char: m[2], name: m[3] };
  }
  return out;
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.text();
}

// The file's own paths, verbatim: `width`/`height`/`xmlns` dropped so the CSS
// box decides the size, the `viewBox` kept because it is what the paths are
// drawn against.
//
// **An id is namespaced, never dropped.** A handful of the Flat files carry a
// `<clipPath id="clip0_…">` and one `url(#clip0_…)` that reads it; two files
// in one sprite could name the same id, and then one picture would be clipped
// by another's mask. The rewrite is mechanical — every id in the file gains
// the key as a prefix, and every `url(#…)` with it — so nothing is guessed
// and nothing is lost. It is reported, because a picture that needs a mask is
// worth knowing about.
function innerOf(svg, key, notes) {
  const open = svg.match(/<svg\b[^>]*>/);
  if (!open) return { error: 'no <svg> element in the fetched file' };
  const vb = open[0].match(/viewBox="([^"]+)"/);
  if (!vb) return { error: 'the fetched file states no viewBox' };
  let body = svg.slice(open.index + open[0].length, svg.lastIndexOf('</svg>'))
    .replace(/\r?\n\s*/g, '').trim();
  const ids = [...body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  for (const id of ids) {
    const rx = new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    body = body.replace(rx, 'fl-' + key + '-' + id);
    notes.push(key + ': id "' + id + '" namespaced to "fl-' + key + '-' + id + '"');
  }
  return { viewBox: vb[1], body };
}

const NOTICE = [
  '<!-- Q1401: the subject, wallet and commit glyphs, drawn.',
  '',
  '     Microsoft Fluent Emoji, **Flat** style — the set Q1360 gave the',
  '     lifecycle marks, on the same terms and for the same reason: one set,',
  '     so the surface draws the same picture on every machine, where the',
  '     platform\'s emoji font draws a different one on each.',
  '',
  '     Source: https://github.com/microsoft/fluentui-emoji — Copyright (c)',
  '     Microsoft Corporation, **MIT licence** (its LICENSE file). Each symbol',
  '     is its file\'s paths verbatim, on the file\'s own viewBox, with',
  '     width/height/xmlns dropped so the CSS box decides the size.',
  '',
  '     GENERATED by `npm run fluent-glyphs` from cards.js\'s `GLYPH` table.',
  '     Do not edit by hand; edit the table and regenerate. -->',
].join('\n');

async function main() {
  const check = process.argv.includes('--check');
  const table = readGlyphTable();
  const findings = [];
  const notes = [];

  const only = new Set(Object.keys(table));
  for (const k of Object.keys(SOURCE)) if (!only.has(k)) findings.push(k + ': in this script\'s SOURCE but not in cards.js GLYPH');
  for (const k of only) if (!SOURCE[k]) findings.push(k + ': in cards.js GLYPH but not in this script\'s SOURCE');

  const symbols = [];
  for (const key of Object.keys(table)) {
    const src = SOURCE[key];
    if (!src) continue;
    const [folder, stem] = src;
    const tries = [
      BASE + '/' + encodeURIComponent(folder) + '/Flat/' + stem + '_flat.svg',
      BASE + '/' + encodeURIComponent(folder) + '/Default/Flat/' + stem + '_flat_default.svg',
    ];
    let text = null, used = null;
    for (const url of tries) { text = await fetchText(url); if (text) { used = url; break; } }
    if (!text) { findings.push(key + ': no Flat asset at ' + tries.join(' or ')); continue; }
    const got = innerOf(text, key, notes);
    if (got.error) { findings.push(key + ': ' + got.error); continue; }
    symbols.push('  <symbol id="fl-' + key + '" viewBox="' + got.viewBox + '">' + got.body + '</symbol>');
    process.stderr.write('  ' + key.padEnd(16) + used.slice(BASE.length + 1) + '\n');
  }

  const out = NOTICE + '\n<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n'
    + symbols.join('\n') + '\n</svg>\n';

  if (notes.length) {
    console.error('\nNotes (' + notes.length + '):');
    for (const n of notes) console.error('  - ' + n);
  }
  if (findings.length) {
    console.error('\nFindings (' + findings.length + ') — left as holes; the renderer falls back to the character:');
    for (const f of findings) console.error('  - ' + f);
  }

  if (check) {
    const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (have !== out) { console.error('\nfluent-glyphs: design/fluent-glyphs.svg is not what the table generates'); process.exit(1); }
    console.log('\nfluent-glyphs: sprite matches the table (' + symbols.length + ' symbols)');
    return;
  }
  fs.writeFileSync(OUT, out);
  console.log('\nfluent-glyphs: wrote design/fluent-glyphs.svg — ' + symbols.length + ' symbols, '
    + findings.length + ' finding' + (findings.length === 1 ? '' : 's'));
  if (findings.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
