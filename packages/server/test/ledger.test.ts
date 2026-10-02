/**
 * `scripts/ledger.mjs` — the coordinator's byte-safe writer for CHANGELOG.md,
 * QUESTIONS.md and design/DECISIONS.md (issue #179).
 *
 * It lives here for the reason `walk-base.test.ts` does: `scripts/` is outside
 * every workspace's vitest, so the helper is imported through a computed URL
 * and tsc resolves nothing outside this package's `include`.
 *
 * What is pinned: each file keeps its own line endings, CRLF or LF, and every
 * byte the tool did not add (the Q1491 gotcha's lone CR among them, the thing
 * #174 broke by hand); each refusal writes nothing to any file; a re-run is
 * refused rather than doubled; and on a copy of the real ledgers the change is
 * insertions only.
 */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

interface Plan { rel: string; added: number; changed: number }
interface Result { ok: boolean; refusals: string[]; plans: Plan[] }
interface Ledger {
  applyLedgers: (root: string, input: unknown, opts?: { dryRun?: boolean }) => Result;
  endings: (s: string) => { crlf: number; lf: number };
  diffStat: (plans: Plan[]) => string;
  commitMessage: (input: unknown, plans: Plan[]) => string;
}

const HELPER = new URL('../../../scripts/ledger.mjs', import.meta.url).href;
const REPO = new URL('../../../', import.meta.url).pathname;
let L: Ledger;
beforeAll(async () => { L = (await import(/* @vite-ignore */ HELPER)) as Ledger; });

const CHANGELOG = [
  '# Changelog', '', 'Intro.', '', '---', '',
  '## 2026-10-01: older', '', '### Fixed', '- a thing.', '',
];
const QUESTIONS = [
  '# Open and deferred items', '', '## Open', '',
  '| # | Title |', '|---|---|', '| 1500 | open item |', '',
  '1499. **A backlog item with a lone CR \r here**', '',
  '## Spent numbers', '',
  '**The next free number is 1587** — claim by writing the block here, then commit it alone.', '',
  '**1585 is the plan** (claimed).', '',
  '**1584 is older** (claimed).', '',
];
const DECISIONS = ['# Decisions', '', '## An old section (#1, 2026-08-13)', '', 'Body.', ''];

function scratch(eol: '\r\n' | '\n', files = { CHANGELOG, QUESTIONS, DECISIONS }): string {
  const dir = mkdtempSync(join(tmpdir(), 'ledger-'));
  mkdirSync(join(dir, 'design'));
  writeFileSync(join(dir, 'CHANGELOG.md'), files.CHANGELOG.join(eol));
  writeFileSync(join(dir, 'QUESTIONS.md'), files.QUESTIONS.join(eol));
  writeFileSync(join(dir, 'design/DECISIONS.md'), files.DECISIONS.join(eol));
  return dir;
}
const bytesOf = (dir: string, rel: string) => readFileSync(join(dir, rel)).toString('utf8');
const snapshot = (dir: string) => ['CHANGELOG.md', 'QUESTIONS.md', 'design/DECISIONS.md'].map((f) => bytesOf(dir, f));

const INPUT = {
  pr: 170,
  changelog: '## 2026-10-02: a new section\n\n### For contributors\n- **Nothing a member sees changes.** A tool.\n',
  questions: '**1591 is the ledger builder\'s calls** (claimed 2026-10-02).\n',
  nextFree: 1592,
  decisions: '## The ledger tool (#179, 2026-10-02)\n\nWhy it reads bytes.',
};

describe.each([['CRLF', '\r\n'], ['LF', '\n']] as const)('a %s ledger set', (_name, eol) => {
  it('inserts in each file\'s own ending, in the right places, and keeps every other byte', () => {
    const dir = scratch(eol);
    const before = snapshot(dir);
    const r = L.applyLedgers(dir, INPUT);
    expect(r.refusals).toEqual([]);
    expect(r.ok).toBe(true);
    const [cl, q, d] = snapshot(dir);
    for (const a of [cl, q, d]) {
      const e = L.endings(a);
      expect(eol === '\r\n' ? e.lf : e.crlf).toBe(0);
    }
    expect(cl).toBe(['# Changelog', '', 'Intro.', '', '---', '',
      '## 2026-10-02: a new section', '', '### For contributors', '- **Nothing a member sees changes.** A tool.', '',
      '## 2026-10-01: older', '', '### Fixed', '- a thing.', ''].join(eol));
    expect(q).toContain(['**The next free number is 1592** — claim by writing the block here, then commit it alone.', '',
      '**1591 is the ledger builder\'s calls** (claimed 2026-10-02).', '', '**1585 is the plan** (claimed).'].join(eol));
    expect(q).toContain('lone CR \r here');
    expect(d).toBe(before[2] + eol + ['## The ledger tool (#179, 2026-10-02)', '', 'Why it reads bytes.', ''].join(eol));
  });

  it('dry-run writes nothing and reports the same plan', () => {
    const dir = scratch(eol);
    const before = snapshot(dir);
    const r = L.applyLedgers(dir, INPUT, { dryRun: true });
    expect(r.ok).toBe(true);
    expect(snapshot(dir)).toEqual(before);
    expect(L.diffStat(r.plans)).toContain('3 files changed, 12 insertions(+), 1 deletion(-)');
    expect(L.commitMessage(INPUT, r.plans)).toBe(
      'Ledgers for #170: CHANGELOG 2026-10-02: a new section; QUESTIONS 1591, next free 1592; DECISIONS The ledger tool (#179, 2026-10-02)');
  });

  it('a re-run is refused, not doubled', () => {
    const dir = scratch(eol);
    expect(L.applyLedgers(dir, INPUT).ok).toBe(true);
    const once = snapshot(dir);
    const r = L.applyLedgers(dir, INPUT);
    expect(r.ok).toBe(false);
    expect(r.refusals.join('\n')).toMatch(/already has the section '## 2026-10-02: a new section'/);
    expect(r.refusals.join('\n')).toMatch(/already holds number 1591/);
    expect(r.refusals.join('\n')).toMatch(/already has the section '## The ledger tool/);
    expect(snapshot(dir)).toEqual(once);
  });
});

describe('refusals write nothing to any file', () => {
  const refused = (input: unknown, pattern: RegExp, files?: Parameters<typeof scratch>[1]) => {
    const dir = scratch('\r\n', files);
    const before = snapshot(dir);
    const r = L.applyLedgers(dir, input);
    expect(r.ok).toBe(false);
    expect(r.refusals.join('\n')).toMatch(pattern);
    expect(snapshot(dir)).toEqual(before);
  };

  it('a QUESTIONS number already present — as a block, an item or an index row', () => {
    refused({ ...INPUT, questions: '**1585 is again**' }, /already holds number 1585/);
    refused({ ...INPUT, questions: '**1499 is again**' }, /already holds number 1499/);
    refused({ ...INPUT, questions: '**1500 is again**' }, /already holds number 1500/);
  });

  it('a CHANGELOG section whose heading already exists', () => {
    refused({ ...INPUT, changelog: '## 2026-10-01: older\n\n### Fixed\n- again.' }, /already has the section '## 2026-10-01: older'/);
  });

  it('a next-free line that would be left at or below a claimed number', () => {
    refused({ questions: '**1591 is x**' }, /next free number would be 1587, at or below 1591/);
    refused({ questions: '**1591 is x**', nextFree: 1591 }, /next free number would be 1591, at or below 1591/);
    refused({ ...INPUT, nextFree: 1500 }, /next free number would be 1587, at or below 1591/);
  });

  it('a file that already mixes endings, naming it', () => {
    refused(INPUT, /QUESTIONS\.md already mixes line endings \(\d+ CRLF, 1 LF\)/,
      { CHANGELOG, DECISIONS, QUESTIONS: [...QUESTIONS.slice(0, -1), 'tail\n'] });
  });

  it('a malformed input', () => {
    refused({ ...INPUT, changelogs: 'x' }, /unknown field 'changelogs'/);
    refused({ changelog: '### Fixed\n- no heading' }, /changelog must open with '## YYYY-MM-DD: …'/);
    refused({ questions: '1591 is x', nextFree: 1592 }, /questions must open with '\*\*NNNN is …'/);
    refused({ decisions: 'no heading' }, /decisions must open with '## …'/);
  });
});

describe('the next-free line alone', () => {
  it('moves up and never down', () => {
    const dir = scratch('\r\n');
    expect(L.applyLedgers(dir, { nextFree: 1600 }).ok).toBe(true);
    expect(bytesOf(dir, 'QUESTIONS.md')).toContain('**The next free number is 1600**');
    expect(L.applyLedgers(dir, { nextFree: 1590 }).plans[0]?.changed).toBe(0);
    expect(bytesOf(dir, 'QUESTIONS.md')).toContain('**The next free number is 1600**');
  });
});

describe('on a copy of the real ledgers', () => {
  it('adds lines only, each file keeping its own endings and every other byte', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-real-'));
    mkdirSync(join(dir, 'design'));
    for (const f of ['CHANGELOG.md', 'QUESTIONS.md', 'design/DECISIONS.md']) copyFileSync(join(REPO, f), join(dir, f));
    const before = snapshot(dir);
    const top = Math.max(...[...before[1].matchAll(/^\*\*(\d+) is /gm)].map((m) => Number(m[1])));
    const n = top + 1000;
    const r = L.applyLedgers(dir, { ...INPUT, changelog: '## 2099-01-01: a test section\n\n### Fixed\n- x.', questions: `**${n} is a test**`, nextFree: n + 1 });
    expect(r.refusals).toEqual([]);
    const after = snapshot(dir);
    for (let i = 0; i < 3; i++) {
      const b = L.endings(before[i]), a = L.endings(after[i]);
      // a file never gains the ending it does not use
      if (b.lf === 0) expect(a.lf).toBe(0);
      if (b.crlf === 0) expect(a.crlf).toBe(0);
      expect(a.crlf + a.lf - b.crlf - b.lf).toBe(r.plans[i].added);
    }
    // everything before the insertion point is untouched; DECISIONS only grew at its end
    expect(after[2].startsWith(before[2])).toBe(true);
  });
});
