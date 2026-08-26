/**
 * copy-check — every card's words, frozen, and diffed at every push.
 *
 * Copy on this project is audited by passes — STYLE.md §7 has twelve — and a
 * pass is a snapshot: nothing pinned a card's words *between* passes, so the
 * next change to a card silently undid the last audit and the stale sentence
 * was found by a person in a sitting. `design/tools/card-audit.mjs` already
 * opens every decision card on every surface and records its strings beside
 * its pixels; this takes the strings half of that payload, normalises the
 * wall clock out of it and diffs it against a committed golden. A copy change
 * is now a red build and a reviewed diff, and moving the golden is a separate,
 * named act whose diff is what the next STYLE.md pass reads.
 *
 *   node scripts/copy-check.mjs            # compare, exit 1 on a diff
 *   node scripts/copy-check.mjs --update   # refresh the golden on purpose
 *
 * **Why a script of its own** rather than a `--strings` mode of `card-audit`,
 * and not a check inside `spec-check`. The time is in the walks, not in the
 * measuring: every card costs a fixed `waitForTimeout` (300 ms per open, 320–700
 * after each confirm, 200 per close), which is ~150 s of the ~169, while the
 * `measure` evaluate is a handful of `getComputedStyle` calls — so skipping the
 * pixels would save single-digit percent and leave one slow instrument with two
 * shapes of output to keep in step. And `spec-check` is static and browser-less
 * — it reads files, a `vm` sandbox and `git ls-files` — and runs in CI's `ci`
 * job, which installs no Chromium; a three-minute headless walk belongs in the
 * `probe` job beside `founding-golden`, which is the shape this file copies.
 *
 * **The golden is words only** (Ed, 2026-08-26, entry 128): no viewport, no
 * seconds, no geometry, so a layout change never dirties it. It is keyed by
 * walk and card key, never by position, so reordering `ORDER` does not dirty it
 * either. What it cannot see is listed by name in its own `meta.normalised`.
 *
 * **The instrument failing is not a copy change.** A non-zero exit from
 * `card-audit`, or a `page error:` / `walk threw` line among its errors, exits
 * **2** whatever the golden says. Its *other* errors — the applicant seat that
 * offers no cards, the closed page with no backlog records — are recorded in
 * the golden and diffed like everything else: a new one is a difference, a
 * known one is a fact on the file, and fixing one is a diff somebody reads.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const GOLDEN = join(ROOT, 'design', 'tools', 'card-copy.golden.json');
const update = process.argv.includes('--update');

const run = spawnSync(process.execPath, [join(ROOT, 'design', 'tools', 'card-audit.mjs'), '--json'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
if (run.status !== 0) {
  console.error(run.stderr || run.stdout || '(no output)');
  console.error('\ncard-audit did not complete — the instrument failed, which is not a copy change');
  process.exit(2);
}
const raw = JSON.parse(run.stdout.slice(run.stdout.indexOf('{')));

const errors = (raw.errors || []).map((e) => String(e));
const broken = errors.filter((e) => /page error:|walk threw/.test(e));
if (broken.length) {
  console.error(broken.join('\n'));
  console.error('\nthe walk itself failed — the surface was not read, so nothing here is a copy verdict');
  process.exit(2);
}

/**
 * What the golden cannot see. Each class is one thing the fixture derives from
 * the wall clock or from the room's counts, and each is named in `meta.normalised`
 * so a reader of the file knows what a green run is silent about. Lifted from
 * `founding-golden`'s own `norm`; **do not widen it** — a wider net hides copy.
 */
const NORMALISED = ['HH:MM', 'D Month YYYY', 'weekday', 'n of m', 'whitespace'];
const norm = (s) => String(s == null ? '' : s)
  // "Founded by AB Ash Bellamy 👑 at 15:19 on 26 August 2026" (the ⏳ grant heads)
  .replace(/\b\d{1,2}:\d{2}\b/g, 'HH:MM')
  .replace(/\b\d{1,2} [A-Z][a-z]+ \d{4}\b/g, 'D Month YYYY')
  // "The drafting process will end on Thursday at 18:00" (⏰, and the clock line)
  .replace(/\b(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\b/g, 'Weekday')
  // "3 of 3 have opened it", "1 of 1 have answered", "1 of 14"
  .replace(/\b\d+ of \d+\b/g, 'n of m')
  .replace(/\s+/g, ' ').trim();

/**
 * One card, reduced to its copy. `all` is dropped — a concatenation of every
 * other field, which would print every change twice — and so is `copy`, for the
 * same reason at one remove: it is `.headlab, .headrule, .headtitle, .lockline,
 * .setnote, .rsub, .qwhy, .exp, .why, .lanepick, .commitrow button` plus the
 * placeholders and titles, which is exactly `eyebrow` + `head` + `lock` +
 * `options` + `foot` + `hints` + the helper sentences kept below. `on`,
 * `value` and `disabled` go too: a radio's state, what the walk typed and a
 * button's greyness are the walk's doing, not the surface's words.
 */
const copyOf = (c) => {
  const s = c.strings || {};
  return {
    eyebrow: norm(s.eyebrow),
    head: norm(s.head),
    lock: norm(s.lock),
    body: norm(s.body),
    options: (s.options || []).map((o) => ({ set: o.set, val: o.val, label: norm(o.label) })),
    inputs: (s.inputs || []).map((i) => ({ type: i.type, ph: i.ph == null ? null : norm(i.ph) })),
    foot: (s.foot || []).map((f) => ({ label: norm(f.label), title: f.title == null ? null : norm(f.title) })),
    hints: (s.hints || []).map(norm),
    // the `.why`, `.setnote`, `.rsub`, `.qwhy` and `.exp` sentences: the
    // twelfth pass's whole subject was these bodies, so they are copy
    helpers: (c.helpers || []).map((h) => norm(h.text)),
  };
};

/**
 * Keyed by walk, then by card key, both sorted — so the file is byte-identical
 * whatever order the walks ran in or `ORDER` listed the cards in. A `walk`·`key`
 * seen twice is exit 2 with the pair named: a map cannot hold it, and a silent
 * last-wins would freeze half a card while reading as full coverage.
 */
const byWalk = {};
const seen = new Set();
const dupes = [];
for (const c of raw.cards || []) {
  const pair = c.walk + '·' + c.key;
  if (seen.has(pair)) { dupes.push(pair); continue; }
  seen.add(pair);
  (byWalk[c.walk] ||= {})[c.key] = copyOf(c);
}
if (dupes.length) {
  console.error('two cards share one walk·key: ' + dupes.join(', '));
  console.error('\nthe golden is keyed by the pair, so one of them would be frozen and the other lost');
  process.exit(2);
}
const sortKeys = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
const cards = sortKeys(Object.fromEntries(Object.entries(byWalk).map(([w, ks]) => [w, sortKeys(ks)])));
const walks = Object.keys(cards);
const nCards = seen.size;
const out = {
  meta: { cards: nCards, walks, normalised: NORMALISED },
  errors: errors.map(norm).sort(),
  cards,
};

if (update || !existsSync(GOLDEN)) {
  writeFileSync(GOLDEN, JSON.stringify(out, null, 1) + '\n');
  console.log(`${update ? 'updated ' : 'wrote '}${GOLDEN} (${nCards} cards over ${walks.length} walks)`);
  process.exit(0);
}

const golden = JSON.parse(readFileSync(GOLDEN, 'utf8'));
const diffs = [];
const q = (v) => JSON.stringify(v);

/** one line per string that moved, in the shape a review's copy-changes list uses */
const fieldDiff = (where, field, a, b) => {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const x = a[i]; const y = b[i];
      if (JSON.stringify(x) === JSON.stringify(y)) continue;
      if (x === undefined) { diffs.push(`${where} · ${field}[${i}]: (new) → ${q(y)}`); continue; }
      if (y === undefined) { diffs.push(`${where} · ${field}[${i}]: ${q(x)} → (removed)`); continue; }
      if (x && y && typeof x === 'object' && typeof y === 'object') {
        for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
          if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) diffs.push(`${where} · ${field}[${i}].${k}: ${q(x[k])} → ${q(y[k])}`);
        }
        continue;
      }
      diffs.push(`${where} · ${field}[${i}]: ${q(x)} → ${q(y)}`);
    }
    return;
  }
  diffs.push(`${where} · ${field}: ${q(a)} → ${q(b)}`);
};

const gw = golden.cards || {};
for (const walk of [...new Set([...Object.keys(gw), ...Object.keys(cards)])].sort()) {
  const a = gw[walk] || {}; const b = cards[walk] || {};
  for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const where = walk + '·' + key;
    if (!b[key]) { diffs.push(`gone: ${where}`); continue; }
    if (!a[key]) { diffs.push(`new: ${where}`); continue; }
    for (const field of [...new Set([...Object.keys(a[key]), ...Object.keys(b[key])])]) {
      fieldDiff(where, field, a[key][field], b[key][field]);
    }
  }
}
const ga = (golden.errors || []).join('\n'); const gb = out.errors.join('\n');
if (ga !== gb) {
  const onlyA = (golden.errors || []).filter((e) => !out.errors.includes(e));
  const onlyB = out.errors.filter((e) => !(golden.errors || []).includes(e));
  diffs.push(`errors differ — fixed since the golden: ${onlyA.join(' ‖ ') || '(none)'}; new: ${onlyB.join(' ‖ ') || '(none)'}`);
}

if (diffs.length) {
  console.log(diffs.join('\n'));
  console.log(`\n${diffs.length} difference(s) from the copy golden — a copy change is deliberate: ` +
    'run npm run copy-freeze and read the diff against STYLE.md §8');
  process.exit(1);
}
console.log(`the copy matches the golden (${nCards} cards over ${walks.length} walks)`);
