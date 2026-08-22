/**
 * founding-golden — does the founder still meet the founding in the order
 * SURFACE.md §8 states, with the clauses it states?
 *
 * Runs `scripts/founding-walk.mjs --json` (headless Chromium, the page
 * served from design/), reduces each step to what the order table is about
 * — the step, the rail's keys, and the first words of every clause in the
 * band — and diffs that against design/tools/founding-walk.golden.json.
 * The static checker (spec-check) reads ORDER and SEC; this is the one
 * assertion that catches a regression in a predicate (blocksOrder, hide,
 * ansGate) that the static read cannot see. Spec pass 2, Q586 (c),
 * 2026-08-22; whether it stays at every push is Q625.
 *
 *   node scripts/founding-golden.mjs            # compare, exit 1 on a diff
 *   node scripts/founding-golden.mjs --update   # refresh the golden on purpose
 *
 * Times and dates are normalised away (the Founded line carries the
 * wall clock), and so are counts of the form "n of m".
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const GOLDEN = join(ROOT, 'design', 'tools', 'founding-walk.golden.json');
const update = process.argv.includes('--update');

const run = spawnSync(process.execPath, [join(ROOT, 'scripts', 'founding-walk.mjs'), '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
if (run.status !== 0) { console.error(run.stderr || run.stdout); process.exit(run.status || 1); }
const raw = JSON.parse(run.stdout.slice(run.stdout.indexOf('{')));

const norm = (s) => String(s || '')
  .replace(/\b\d{1,2}:\d{2}\b/g, 'HH:MM')
  .replace(/\b\d{1,2} [A-Z][a-z]+ \d{4}\b/g, 'D Month YYYY')
  .replace(/\b(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\b/g, 'Weekday')
  .replace(/\b\d+ of \d+\b/g, 'n of m')
  .replace(/\s+/g, ' ').trim();
const reduced = raw.log.map((e) => ({
  step: e.step,
  rail: (e.rail || []).map((r) => norm(typeof r === 'string' ? r : r.k || r.title || JSON.stringify(r))),
  clauses: (e.paras || []).map((p) => p.k + ': ' + norm(p.text).slice(0, 60)),
}));
const out = { errors: raw.errors || [], steps: reduced };

if (update || !existsSync(GOLDEN)) {
  writeFileSync(GOLDEN, JSON.stringify(out, null, 1) + '\n');
  console.log((update ? 'updated ' : 'wrote ') + GOLDEN + ' (' + reduced.length + ' steps)');
  process.exit(0);
}
const golden = JSON.parse(readFileSync(GOLDEN, 'utf8'));
const diffs = [];
if (out.errors.length) diffs.push('page errors: ' + out.errors.join(' / '));
const n = Math.max(golden.steps.length, out.steps.length);
for (let i = 0; i < n; i++) {
  const a = golden.steps[i]; const b = out.steps[i];
  if (!a || !b) { diffs.push(`step ${i}: ${a ? 'missing now' : 'new'}: ${(a || b).step}`); continue; }
  if (a.step !== b.step) { diffs.push(`step ${i}: golden '${a.step}', now '${b.step}'`); continue; }
  if (a.rail.join('|') !== b.rail.join('|')) diffs.push(`${a.step}: rail golden [${a.rail.join(' | ')}] now [${b.rail.join(' | ')}]`);
  const ga = a.clauses.join('\n'); const gb = b.clauses.join('\n');
  if (ga !== gb) {
    const onlyA = a.clauses.filter((c) => !b.clauses.includes(c)); const onlyB = b.clauses.filter((c) => !a.clauses.includes(c));
    diffs.push(`${a.step}: clauses differ — golden-only: ${onlyA.join(' ‖ ') || '(none)'}; now-only: ${onlyB.join(' ‖ ') || '(none)'}`);
  }
}
if (diffs.length) {
  console.log(diffs.join('\n'));
  console.log(`\n${diffs.length} difference(s) from the golden walk — if intentional, run with --update`);
  process.exit(1);
}
console.log(`the founding walk matches the golden (${reduced.length} steps)`);
