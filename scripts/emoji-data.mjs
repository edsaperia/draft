/**
 * design/emoji-data.js, generated from Unicode's own emoji-test.txt (Q732).
 *
 * The picker used to be six hand-kept rows — about 150 glyphs somebody chose
 * — which is fine as a shortlist and wrong as a picker: it cannot be searched,
 * it goes stale every Unicode release, and one-emoji-one-member makes the
 * offered set a hard cap on how many people can wear a face. So the data comes
 * from the source of record and is regenerated rather than curated, on the
 * same discipline as the committed design/constitution.js bundle: the input is
 * committed beside the output, the generator is dependency-free, and the run
 * is reproducible from the tree alone.
 *
 *   curl -sS -o design/emoji-test.txt https://unicode.org/Public/emoji/16.0/emoji-test.txt
 *   node scripts/emoji-data.mjs
 *
 * Three things are dropped on the way through, each for a reason:
 *
 *   - anything but **fully-qualified**. The minimally-qualified and unqualified
 *     rows are the same emoji missing its variation selector; offering both
 *     would put two buttons in the grid that look identical and store
 *     different strings, and the takenness test is an exact match on the
 *     stored string.
 *   - anything carrying a **skin tone**. The tone is a selector on the People
 *     row (`FACE_TONES`/`faceToned`), applied at render, so the toned variants
 *     would be the same glyph six times over — and they are most of the file.
 *   - the **Component** group entirely: skin-tone swatches and hair pieces are
 *     parts of an emoji, not emoji somebody can be.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SRC = join(ROOT, 'design', 'emoji-test.txt');
const OUT = join(ROOT, 'design', 'emoji-data.js');

const src = readFileSync(SRC, 'utf8');
const version = (src.match(/^# Version: (.+)$/m) || [, 'unknown'])[1].trim();
const dated = (src.match(/^# Date: (.+)$/m) || [, 'unknown'])[1].trim();

// non-global for the test, global for the strip: a shared /g regex carries
// lastIndex between calls and would answer differently on alternate rows
const TONE = /[\u{1F3FB}-\u{1F3FF}]/u;
const TONE_G = /[\u{1F3FB}-\u{1F3FF}]/gu;
// "1F600 ; fully-qualified # 😀 E1.0 grinning face"
const ROW = /^([0-9A-F ]+?)\s*;\s*([a-z-]+)\s*#\s*(\S+)\s+E[\d.]+\s+(.+)$/;

/* Which glyphs a skin tone may be put on, read off the file rather than
   guessed: a toned row's glyph with its tone stripped IS the base sequence,
   so the file states the answer. It matters because the tone selector sits on
   the People row and that group also holds 🦴 and 👣 — applying a Fitzpatrick
   modifier to something with no skin in it produces a sequence no font has.

   **The question is not "may this be toned" but "may the page's own toning
   produce something real"**, and those are not the same set. `faceToned`
   inserts one modifier after the *first* code point, which is right for every
   one-person glyph and wrong for the thirteen two-person ones — 🧑‍🤝‍🧑,
   👩‍❤️‍👨, 🫱‍🫲 and their kin, which Unicode tones by giving *each*
   person their own modifier. Stripping tones off `🧑🏻‍🤝‍🧑🏻` names
   `🧑‍🤝‍🧑` as tonable, but `🧑🏽‍🤝‍🧑` is a sequence no font has and no
   row of this file lists, so a member who picked a tone on it stored a face
   that renders as three separate emoji. So a base is tonable only when the
   single-insertion form the page actually builds is itself fully-qualified. */
const faceToned = (g, tone) => {
  const cp = [...g];
  return cp[0] + tone + cp.slice(1).join('');
};
const fullyQualified = new Set();
const toneStripped = new Set();
for (const line of src.split(/\r?\n/)) {
  const m = line.match(ROW);
  if (!m || m[2] !== 'fully-qualified') continue;
  fullyQualified.add(m[3]);
  if (TONE.test(m[3])) toneStripped.add(m[3].replace(TONE_G, ''));
}
const tonable = new Set([...toneStripped]
  .filter((g) => fullyQualified.has(faceToned(g, '\u{1F3FB}'))));

const groups = [];
let group = null;
let sub = null;
let kept = 0;
let dropped = 0;

for (const line of src.split(/\r?\n/)) {
  const g = line.match(/^# group: (.+)$/);
  if (g) {
    group = { name: g[1].trim(), subs: [] };
    sub = null;
    if (group.name !== 'Component') groups.push(group);
    continue;
  }
  const s = line.match(/^# subgroup: (.+)$/);
  if (s) { sub = { name: s[1].trim(), items: [] }; continue; }
  if (!group || line.startsWith('#') || !line.trim()) continue;
  const m = line.match(ROW);
  if (!m) continue;
  const [, , status, glyph, name] = m;
  if (status !== 'fully-qualified') { dropped += 1; continue; }
  if (TONE.test(glyph)) { dropped += 1; continue; }
  if (group.name === 'Component') { dropped += 1; continue; }
  if (!sub) continue;
  if (!group.subs.includes(sub)) group.subs.push(sub);
  sub.items.push(tonable.has(glyph) ? [glyph, name, 1] : [glyph, name]);
  kept += 1;
}

for (const g of groups) g.subs = g.subs.filter((x) => x.items.length);

const q = (s) => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const body = groups.map((g) =>
  '  [' + q(g.name) + ', [\n' + g.subs.map((s2) =>
    '    [' + q(s2.name) + ', [' +
    s2.items.map(([e, n, t]) => '[' + q(e) + ',' + q(n) + (t ? ',1' : '') + ']').join(',') + ']]',
  ).join(',\n') + '\n  ]]').join(',\n');

const out = `/* GENERATED by scripts/emoji-data.mjs — do not edit.
   Source: design/emoji-test.txt, Unicode Emoji ${version} (${dated}).
   Fully-qualified glyphs only, skin tones and the Component group dropped;
   ${kept} glyphs in ${groups.length} groups. Shape:
     [[group, [[subgroup, [[glyph, cldrName, tonable?], …]], …]], …]
   The third element is 1 where a skin tone may be applied, which the file
   states by listing the toned variants — the People group also holds 🦴.
   Re-run the generator rather than editing this file — the picker's
   categories, its search and what a member may wear all read from here. */
window.EMOJI_DATA = [
${body}
];
`;

writeFileSync(OUT, out);
console.log(`emoji-data.js — Unicode Emoji ${version}: ${kept} glyphs, ` +
  `${groups.length} groups, ${groups.reduce((n, g) => n + g.subs.length, 0)} subgroups ` +
  `(${dropped} rows dropped)`);
