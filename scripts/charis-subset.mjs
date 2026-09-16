/**
 * The document's face, subset and committed (Q1402, Ed 2026-09-16: *use
 * Charis SIL*).
 *
 *   npm run charis-subset
 *
 * Downloads SIL's Charis release once into a cache directory, subsets each
 * of the four faces the surface uses to the Latin the surface can print, and
 * writes `design/fonts/CharisSIL-{Regular,Italic,Bold,BoldItalic}.woff2`
 * beside the licence, `design/fonts/OFL.txt`. **The outputs are committed**,
 * like `emoji-data.js` and `fluent-glyphs.svg`: the build never reaches the
 * network, and a page push carries the four files as it carries the sprite.
 *
 * The subsetter is `subset-font` (harfbuzz compiled to wasm) — there is no
 * python on the builder's machine, and a dependency that runs by hand and
 * whose outputs are checked in costs the build nothing. The run is
 * deterministic: the same release and the same subsetter version write the
 * same bytes, which is what lets a re-run prove the committed files.
 *
 * The release is fetched as SIL's zip and read here with no dependency
 * (a zip is a central directory of local headers; deflate is node's), so
 * the one runtime dependency stays the subsetter.
 *
 *   --cache=<dir>   where the release zip is kept (default: the OS temp dir)
 *   --check         write nothing; compare against the committed files
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import subsetFont from 'subset-font';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = join(ROOT, 'design', 'fonts');

/** The release: SIL's tag, the asset, and the faces the surface wears. */
export const RELEASE = {
  version: '7.000',
  url: 'https://github.com/silnrsi/font-charis/releases/download/v7.000/Charis-7.000.zip',
  dir: 'Charis-7.000',
  // the four faces (Q1402: Regular · Italic · Bold · Bold Italic — Charis's
  // own 600 is not taken, so every 600 on a text element became 700 or 400)
  faces: {
    'CharisSIL-Regular.woff2': 'Charis-Regular.ttf',
    'CharisSIL-Italic.woff2': 'Charis-Italic.ttf',
    'CharisSIL-Bold.woff2': 'Charis-Bold.ttf',
    'CharisSIL-BoldItalic.woff2': 'Charis-BoldItalic.ttf',
  },
  licence: 'OFL.txt',
};

/**
 * What the subset holds, as code-point ranges — the same list system.css
 * states as `unicode-range`, so the two cannot drift: Basic Latin, Latin-1
 * Supplement, Latin Extended-A, General Punctuation (the typographic quotes,
 * the dashes, the ellipsis, the middle dot's neighbours) and the euro. The
 * pound and the dollar are Latin-1 and ASCII; the middle dot is Latin-1.
 */
export const RANGES = [
  [0x0020, 0x007E],   // Basic Latin
  [0x00A0, 0x00FF],   // Latin-1 Supplement — £ · é ü and the rest
  [0x0100, 0x017F],   // Latin Extended-A — ő ł š ž
  [0x2000, 0x206F],   // General Punctuation — ‘ ’ “ ” – — … ‰ †
  [0x20AC, 0x20AC],   // €
];
export const UNICODE_RANGE = RANGES
  .map(([a, b]) => (a === b ? `U+${a.toString(16).toUpperCase().padStart(4, '0')}`
    : `U+${a.toString(16).toUpperCase().padStart(4, '0')}-${b.toString(16).toUpperCase().padStart(4, '0')}`))
  .join(', ');

/** The OpenType features kept: kerning and ligatures for the text, the
 *  figure styles and small caps the surface may adopt (Q1402 (5) is open),
 *  and the shaping features Latin needs. */
export const FEATURES = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'onum', 'pnum', 'lnum', 'tnum', 'smcp', 'c2sc', 'frac'];

const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.split('=').slice(1).join('=') : dflt;
};
const CACHE = arg('cache', join(tmpdir(), 'draft-charis'));
const CHECK = process.argv.includes('--check');

/** Read the named entries out of a zip, no dependency: the central directory
 *  at the end names each file and where its local header is; a local header
 *  is followed by the name, the extra field and the bytes, deflated or stored. */
function unzip(buf, wanted) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('not a zip: no end-of-central-directory');
  const count = buf.readUInt16LE(eocd + 10);
  let at = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(at) !== 0x02014b50) throw new Error('zip: bad central directory entry');
    const method = buf.readUInt16LE(at + 10);
    const csize = buf.readUInt32LE(at + 20);
    const nameLen = buf.readUInt16LE(at + 28), extraLen = buf.readUInt16LE(at + 30), commentLen = buf.readUInt16LE(at + 32);
    const local = buf.readUInt32LE(at + 42);
    const name = buf.toString('utf8', at + 46, at + 46 + nameLen);
    at += 46 + nameLen + extraLen + commentLen;
    if (!wanted.includes(name)) continue;
    if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error('zip: bad local header for ' + name);
    const lName = buf.readUInt16LE(local + 26), lExtra = buf.readUInt16LE(local + 28);
    const start = local + 30 + lName + lExtra;
    const raw = buf.subarray(start, start + csize);
    if (method === 0) out.set(name, Buffer.from(raw));
    else if (method === 8) out.set(name, inflateRawSync(raw));
    else throw new Error(`zip: ${name} uses method ${method}`);
  }
  for (const w of wanted) if (!out.has(w)) throw new Error('zip: ' + w + ' is not in the release');
  return out;
}

async function release() {
  mkdirSync(CACHE, { recursive: true });
  const zip = join(CACHE, `Charis-${RELEASE.version}.zip`);
  if (!existsSync(zip)) {
    console.log('fetching ' + RELEASE.url);
    const r = await fetch(RELEASE.url);
    if (!r.ok) throw new Error(`fetch ${r.status} ${RELEASE.url}`);
    writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
  } else {
    console.log('release cached at ' + zip);
  }
  const wanted = [...Object.values(RELEASE.faces), RELEASE.licence].map((n) => RELEASE.dir + '/' + n);
  return unzip(readFileSync(zip), wanted);
}

/** Every character the subset holds, as one string for the subsetter. */
const text = RANGES.map(([a, b]) => {
  let s = '';
  for (let c = a; c <= b; c++) s += String.fromCodePoint(c);
  return s;
}).join('');

const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);
const files = await release();
if (!CHECK) mkdirSync(OUT, { recursive: true });
let differ = 0;
for (const [out, ttf] of Object.entries(RELEASE.faces)) {
  const src = files.get(RELEASE.dir + '/' + ttf);
  const woff2 = await subsetFont(src, text, { targetFormat: 'woff2', keepFeatures: FEATURES });
  const to = join(OUT, out);
  const same = existsSync(to) && readFileSync(to).equals(woff2);
  if (!same) differ++;
  if (!CHECK && !same) writeFileSync(to, woff2);
  console.log(`  ${same ? 'same   ' : CHECK ? 'DIFFERS' : 'written'} ${out.padEnd(28)} ${String(woff2.length).padStart(7)} bytes  sha256 ${sha(woff2)}  (from ${ttf}, ${src.length} bytes)`);
}
const ofl = files.get(RELEASE.dir + '/' + RELEASE.licence);
const oflTo = join(OUT, RELEASE.licence);
const oflSame = existsSync(oflTo) && readFileSync(oflTo).equals(ofl);
if (!oflSame) differ++;
if (!CHECK && !oflSame) writeFileSync(oflTo, ofl);
console.log(`  ${oflSame ? 'same   ' : CHECK ? 'DIFFERS' : 'written'} ${RELEASE.licence.padEnd(28)} ${String(ofl.length).padStart(7)} bytes`);
console.log(`unicode-range: ${UNICODE_RANGE}`);
if (CHECK) {
  console.log(differ ? `${differ} file(s) differ from the committed set` : 'the committed set is what this release and subsetter write');
  process.exit(differ ? 1 : 0);
}
