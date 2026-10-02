#!/usr/bin/env node
/**
 * `ledger.mjs` — the coordinator's writer for the three shared ledgers
 * (issue #179, Ed 2026-10-02: *ledger entries — let's go!*).
 *
 * Since dev-ops CONVENTIONS 8e9d9aa no builder edits CHANGELOG.md,
 * QUESTIONS.md or design/DECISIONS.md in its PR: it puts the text in its
 * FINAL, and the coordinator writes it to main at the merge. Doing that by
 * hand is how #174 flipped CLAUDE.md from CRLF to LF and broke the Q1491
 * gotcha's literal CR. So this tool never decodes a file: it works on a
 * latin1 view of the bytes (one character per byte, an exact round trip),
 * inserts text converted to the file's own line ending, and checks before
 * writing that every byte it did not add is still there.
 *
 *   node scripts/ledger.mjs <input.json> [--dry-run] [--root=<dir>]
 *
 * The input is one JSON object, every field optional:
 *   changelog  a whole section, `## YYYY-MM-DD: …` and its `###` parts —
 *              inserted at the top of the entries, after the intro's `---`
 *   questions  a block `**NNNN is …**` — inserted at the top of *Spent numbers*
 *   nextFree   the *next free* line becomes the higher of itself and this
 *   decisions  a section `## …` — appended at the end of design/DECISIONS.md
 *   pr         the PR number, for the suggested commit message
 *
 * Refused, with nothing written: a file that already mixes CRLF and LF; a
 * QUESTIONS number already present; a CHANGELOG or DECISIONS heading already
 * present (so a re-run is refused, never doubled); a *next free* line left at
 * or below any number the file holds; an unknown field.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FILES = {
  changelog: 'CHANGELOG.md',
  questions: 'QUESTIONS.md',
  decisions: 'design/DECISIONS.md',
};
const FIELDS = new Set(['changelog', 'questions', 'nextFree', 'decisions', 'pr']);

/** CRLF and bare-LF line endings in a byte string; a lone CR is content (Q1491). */
export function endings(s) {
  let crlf = 0, lf = 0;
  for (let i = s.indexOf('\n'); i >= 0; i = s.indexOf('\n', i + 1)) {
    if (i > 0 && s.charCodeAt(i - 1) === 13) crlf++; else lf++;
  }
  return { crlf, lf };
}

const bytes = (text) => Buffer.from(text, 'utf8').toString('latin1');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The input text as lines, its own endings and surrounding blank lines dropped. */
function linesOf(text) {
  return text.replace(/\r\n/g, '\n').replace(/^\s*\n/, '').replace(/\s+$/, '').split('\n');
}

/** Does any line of `s` (latin1, either ending) equal `line`? */
const hasLine = (s, line) => new RegExp(`(^|\\n)${esc(bytes(line))}\\r?(\\n|$)`).test(s);

/**
 * Plans every write without touching the disk. Returns `{ refusals, plans }`;
 * a plan is `{ rel, before, after, added, changed, inserted }`, the two texts
 * latin1 byte strings, `inserted` the input as written (utf8).
 */
export function planLedgers(root, input) {
  const refusals = [];
  const plans = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { refusals: ['the input is not a JSON object'], plans };
  }
  for (const k of Object.keys(input)) if (!FIELDS.has(k)) refusals.push(`unknown field '${k}' (known: ${[...FIELDS].join(', ')})`);
  for (const k of ['changelog', 'questions', 'decisions']) {
    if (input[k] !== undefined && (typeof input[k] !== 'string' || !input[k].trim())) refusals.push(`'${k}' must be non-empty text`);
  }
  if (input.nextFree !== undefined && !(Number.isInteger(input.nextFree) && input.nextFree > 0)) refusals.push(`'nextFree' must be a positive whole number`);
  if (refusals.length) return { refusals, plans };

  const load = (key) => {
    const rel = FILES[key];
    let before;
    try { before = readFileSync(join(root, rel)).toString('latin1'); } catch (e) {
      refusals.push(`${rel} cannot be read: ${e.message}`); return null;
    }
    const n = endings(before);
    if (n.crlf && n.lf) { refusals.push(`${rel} already mixes line endings (${n.crlf} CRLF, ${n.lf} LF) — fix the file first; nothing written`); return null; }
    return { rel, before, eol: n.crlf ? '\r\n' : '\n' };
  };

  // ---- CHANGELOG.md: a section at the top of the entries ----
  if (input.changelog !== undefined) {
    const lines = linesOf(input.changelog);
    const f = load('changelog');
    if (!/^## \d{4}-\d{2}-\d{2}: \S/.test(lines[0])) refusals.push(`changelog must open with '## YYYY-MM-DD: …', not '${lines[0]}'`);
    else if (f) {
      const { rel, before, eol } = f;
      const hr = before.search(/(^|\n)---\r?\n/);
      if (hr < 0) refusals.push(`${rel} has no '---' line closing its intro`);
      else if (hasLine(before, lines[0])) refusals.push(`${rel} already has the section '${lines[0]}'`);
      else {
        const after0 = before.indexOf('\n', hr + (before[hr] === '\n' ? 1 : 0)) + 1;
        const next = before.slice(after0).search(/(^|\n)## /);
        // at the first entry's heading, or after the rule's blank line when there is none
        const at = next < 0 ? before.length : after0 + next + (before[after0 + next] === '\n' ? 1 : 0);
        const block = bytes(lines.join(eol)) + eol + (next < 0 ? '' : eol);
        const lead = next < 0 && !before.slice(after0).trim() ? (before.endsWith(eol + eol) ? '' : eol) : '';
        plans.push({ rel, before, after: before.slice(0, at) + lead + block + before.slice(at),
          added: lines.length + (next < 0 ? (lead ? 1 : 0) : 1), changed: 0, inserted: lines.join('\n'), eol });
      }
    }
  }

  // ---- QUESTIONS.md: a block at the top of *Spent numbers*, and *next free* ----
  if (input.questions !== undefined || input.nextFree !== undefined) {
    const f = load('questions');
    const lines = input.questions !== undefined ? linesOf(input.questions) : null;
    const m = lines && /^\*\*(\d+) is /.exec(lines[0]);
    if (lines && !m) refusals.push(`questions must open with '**NNNN is …', not '${lines[0]}'`);
    else if (f) {
      const { rel, before, eol } = f;
      const NEXT = /^\*\*The next free number is (\d+)\*\*/m;
      const nm = NEXT.exec(before);
      if (!nm) refusals.push(`${rel} has no '**The next free number is N**' line`);
      else {
        const num = m ? Number(m[1]) : null;
        const present = (n) => new RegExp(`^(?:\\*\\*${n} is |${n}\\. |\\| ${n} \\|)`, 'm').test(before);
        if (num !== null && present(num)) refusals.push(`${rel} already holds number ${num}`);
        const claimed = [...before.matchAll(/^(?:\*\*(\d+) is |(\d+)\. |\| (\d+) \|)/gm)].map((x) => Number(x[1] ?? x[2] ?? x[3]));
        if (num !== null) claimed.push(num);
        const cur = Number(nm[1]);
        const next = Math.max(cur, input.nextFree ?? cur);
        const top = Math.max(...claimed);
        if (next <= top) refusals.push(`${rel}'s next free number would be ${next}, at or below ${top}, which is already claimed — pass "nextFree": ${top + 1} or more`);
        else {
          let after = before;
          let changed = 0;
          if (next !== cur) {
            after = after.slice(0, nm.index) + nm[0].replace(String(cur), String(next)) + after.slice(nm.index + nm[0].length);
            changed = 1;
          }
          let added = 0;
          if (lines) {
            const lineEnd = after.indexOf('\n', nm.index) + 1;
            const first = after.slice(lineEnd).search(/^\*\*\d+ is /m);
            const at = first < 0 ? after.length : lineEnd + first;
            const block = bytes(lines.join(eol)) + eol + (first < 0 ? '' : eol);
            const lead = first < 0 && !after.endsWith(eol + eol) ? eol : '';
            after = after.slice(0, at) + lead + block + after.slice(at);
            added = lines.length + (first < 0 ? (lead ? 1 : 0) : 1);
          }
          plans.push({ rel, before, after, added, changed, inserted: lines ? lines.join('\n') : '', eol, next, cur });
        }
      }
    }
  }

  // ---- design/DECISIONS.md: a section at the end ----
  if (input.decisions !== undefined) {
    const lines = linesOf(input.decisions);
    const f = load('decisions');
    if (!/^## \S/.test(lines[0])) refusals.push(`decisions must open with '## …', not '${lines[0]}'`);
    else if (f) {
      const { rel, before, eol } = f;
      if (hasLine(before, lines[0])) refusals.push(`${rel} already has the section '${lines[0]}'`);
      else {
        const lead = before.endsWith(eol) ? eol : eol + eol;
        plans.push({ rel, before, after: before + lead + bytes(lines.join(eol)) + eol,
          added: lines.length + 1, changed: 0, inserted: lines.join('\n'), eol });
      }
    }
  }

  // ---- the self-check: endings move only by the lines added, and every
  // byte the tool did not add is where it was ----
  for (const p of plans) {
    const a = endings(p.before), b = endings(p.after);
    const grew = p.after.length - p.before.length;
    const want = p.eol === '\r\n' ? { crlf: a.crlf + p.added, lf: a.lf } : { crlf: a.crlf, lf: a.lf + p.added };
    // a DECISIONS file with no final newline gains one ending more than it has lines
    const extra = p.rel === FILES.decisions && !p.before.endsWith(p.eol) ? 1 : 0;
    if (p.eol === '\r\n') want.crlf += extra; else want.lf += extra;
    if (b.crlf !== want.crlf || b.lf !== want.lf) {
      refusals.push(`self-check: ${p.rel} would go from ${a.crlf} CRLF / ${a.lf} LF to ${b.crlf} / ${b.lf}, not ${want.crlf} / ${want.lf}`);
    }
    if (p.changed) continue; // the *next free* line moved: checked by the counts above
    let i = 0;
    while (i < p.before.length && p.before[i] === p.after[i]) i++;
    if (p.before.slice(i) !== p.after.slice(i + grew)) refusals.push(`self-check: ${p.rel} would change bytes outside the inserted text`);
  }
  return { refusals, plans: refusals.length ? [] : plans };
}

/** git's `--stat`, from the plans. */
export function diffStat(plans) {
  const w = Math.max(...plans.map((p) => p.rel.length));
  const rows = plans.map((p) => {
    const ins = p.added + p.changed, del = p.changed;
    return ` ${p.rel.padEnd(w)} | ${String(ins + del).padStart(3)} ${'+'.repeat(ins)}${'-'.repeat(del)}`;
  });
  const ins = plans.reduce((s, p) => s + p.added + p.changed, 0);
  const del = plans.reduce((s, p) => s + p.changed, 0);
  rows.push(` ${plans.length} file${plans.length === 1 ? '' : 's'} changed, ${ins} insertion${ins === 1 ? '' : 's'}(+)${del ? `, ${del} deletion${del === 1 ? '' : 's'}(-)` : ''}`);
  return rows.join('\n');
}

/** `Ledgers for #n: …`, naming what each ledger gained. */
export function commitMessage(input, plans) {
  const parts = [];
  for (const p of plans) {
    if (p.rel === FILES.changelog) parts.push(`CHANGELOG ${p.inserted.split('\n')[0].slice(3)}`);
    if (p.rel === FILES.questions) {
      const n = /^\*\*(\d+) is /.exec(p.inserted);
      parts.push(`QUESTIONS ${[n ? n[1] : null, p.changed ? `next free ${p.next}` : null].filter(Boolean).join(', ')}`);
    }
    if (p.rel === FILES.decisions) parts.push(`DECISIONS ${p.inserted.split('\n')[0].slice(3)}`);
  }
  return `Ledgers for #${input.pr ?? '?'}: ${parts.join('; ')}`;
}

/** Plans, checks, and writes all or nothing. Returns `{ ok, refusals, plans }`. */
export function applyLedgers(root, input, { dryRun = false } = {}) {
  const { refusals, plans } = planLedgers(root, input);
  if (refusals.length) return { ok: false, refusals, plans: [] };
  if (!dryRun) for (const p of plans) writeFileSync(join(root, p.rel), Buffer.from(p.after, 'latin1'));
  return { ok: true, refusals, plans };
}

function main(argv) {
  const dryRun = argv.includes('--dry-run');
  const rootArg = argv.find((a) => a.startsWith('--root='));
  const root = rootArg ? resolve(rootArg.slice(7)) : resolve(fileURLToPath(new URL('..', import.meta.url)));
  const file = argv.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error('usage: node scripts/ledger.mjs <input.json> [--dry-run] [--root=<dir>]');
    return 2;
  }
  let input;
  try { input = JSON.parse(readFileSync(file, 'utf8')); } catch (e) {
    console.error(`ledger: cannot read ${file}: ${e.message}`);
    return 2;
  }
  const { ok, refusals, plans } = applyLedgers(root, input, { dryRun });
  if (!ok) {
    console.error('ledger: refused, nothing written:');
    for (const r of refusals) console.error(`  ✗ ${r}`);
    return 1;
  }
  if (!plans.length) { console.log('ledger: nothing to write'); return 0; }
  console.log(dryRun ? 'ledger: dry run, nothing written\n' : 'ledger: written\n');
  console.log(diffStat(plans));
  if (dryRun) {
    for (const p of plans) {
      console.log(`\n--- ${p.rel} (${p.eol === '\r\n' ? 'CRLF' : 'LF'})${p.changed ? ` — next free ${p.cur} → ${p.next}` : ''}`);
      if (p.inserted) console.log(p.inserted);
    }
  }
  console.log(`\nSuggested commit message:\n${commitMessage(input, plans)}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
