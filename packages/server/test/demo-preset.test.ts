/**
 * **The demo preset's contract** (design/DEMO.md §3.2; Q1535): each of the
 * parse rules P1–P10 refusing a fixture written to break it, the refusal
 * naming the rule and the file line — and Ed's real file passing, with the
 * decided changes worked back to the text as first published.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsePreset, presetPath, undoDecided } from '../src/demo-preset.js';
import { hunksOf, sitesToHunks } from '../src/demo-build.js';

const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');

/** A small preset that parses, piece by piece so each test breaks one piece. */
const PARTS = {
  title: '<!-- @title -->\nTiny Con\n<!-- @end -->',
  text: [
    '<!-- @text -->',
    '## Day 1',
    '### 09:00 · Opening',
    'The chair opens.',
    '### 10:00 · Talk',
    'A talk about crusts.',
    '<!-- @end -->',
  ].join('\n'),
  proposals: [
    '<!-- @proposals -->',
    '### A heading for the reader',
    '**A1** — a note',
    'Replaces: `### 09:00 · Opening`',
    'With: `### 09:00 · Welcome`',
    'Reason: *Warmer.*',
    'Proposer: Bea Two',
    'State: contested',
    '',
    '> Contest: a note for people.',
    '',
    '**S1**',
    'Place 1 replaces:',
    '  `### 09:00 · Opening`',
    '  `The chair opens.`',
    'With:',
    '  `### 09:00 · Talk`',
    '  `A talk about crusts.`',
    'Place 2 replaces:',
    '  `### 10:00 · Talk`',
    '  `A talk about crusts.`',
    'With:',
    '  `### 10:00 · Opening`',
    '  `The chair opens.`',
    'Reason: Swap them.',
    'Proposer: Cal Three',
    'State: fresh',
    '<!-- @end -->',
  ].join('\n'),
  decided: [
    '<!-- @decided -->',
    '**Decided 1**',
    'As it was: `A talk.`',
    'Adopted: `A talk about crusts.`',
    'Reason: More.',
    'Proposer: Dee Four',
    'Losing rival: `A talk about bread.`',
    'Rival reason: Wider.',
    'Rival proposer: Bea Two',
    '<!-- @end -->',
  ].join('\n'),
  insertions: [
    '<!-- @insertions -->',
    '**Insertion 1**',
    'After: `The chair opens.`',
    'With: `Coffee follows.`',
    'Reason: People ask.',
    'Proposer: Eve Five',
    'State: leaning',
    '<!-- @end -->',
  ].join('\n'),
  cast: [
    '<!-- @cast -->',
    '1. **Al One** (founder) — the chair.',
    '2. **Bea Two** — careful.',
    '3. **Cal Three** — bold.',
    '4. **Dee Four** — brief.',
    '5. **Eve Five** — kind.',
    '<!-- @end -->',
  ].join('\n'),
  rules: '<!-- @rules -->\nquorum: {"form":"count","n":3}\n> 👥 three.\nchamber: {"rung":"public"}\n<!-- @end -->',
};
type Part = keyof typeof PARTS;
const fixture = (over: Partial<Record<Part, string>> = {}): string =>
  ['# notes for Ed, ignored', ...Object.keys(PARTS).map((k) => over[k as Part] ?? PARTS[k as Part])]
    .join('\n\nprose between sections is skipped\n\n');
const rulesOf = (src: string): string[] => parsePreset(src).errors.map((e) => e.rule);

describe('the demo preset (DEMO.md §3.2)', () => {
  it('the fixture parses: two sites for the swap, one each elsewhere, the rival kept', () => {
    const { preset, errors } = parsePreset(fixture());
    expect(errors).toEqual([]);
    expect(preset!.title).toBe('Tiny Con');
    expect(preset!.text).toHaveLength(5);
    expect(preset!.open.map((e) => [e.label, e.sites.length, e.state]))
      .toEqual([['A1', 1, 'contested'], ['S1', 2, 'fresh'], ['Insertion 1', 1, 'leaning']]);
    expect(preset!.decided[0]!.rival).toEqual({ to: ['A talk about bread.'], reason: 'Wider.', proposer: 'Bea Two' });
    expect(preset!.open[0]!.reason).toBe('Warmer.');
    expect(preset!.cast.filter((c) => c.founder).map((c) => c.name)).toEqual(['Al One']);
    // the text as first published: the decided change worked backwards
    expect(undoDecided(preset!.text, preset!.decided)[4]).toBe('A talk.');
  });

  it('a swap is one patch of two hunks, in document order, attested', () => {
    const { preset } = parsePreset(fixture());
    const swap = preset!.open.find((e) => e.label === 'S1')!;
    const hunks = sitesToHunks(swap.sites, preset!.text);
    expect(hunks.map((h) => [h.start, h.end])).toEqual([[1, 3], [3, 5]]);
    expect(hunks[0]!.was).toEqual(['### 09:00 · Opening', 'The chair opens.']);
    const ins = sitesToHunks(preset!.open.find((e) => e.label === 'Insertion 1')!.sites, preset!.text);
    expect(ins).toEqual([{ start: 3, end: 3, lines: ['Coffee follows.'], after: 'The chair opens.' }]);
    expect(hunksOf([{ start: 0, end: 0, lines: ['x'] }], preset!.text)[0]!.after).toBeNull();
  });

  it('P1: a missing, unclosed, repeated or unknown section', () => {
    expect(rulesOf(fixture({ rules: '' }))).toContain('P1');
    expect(rulesOf(fixture({ rules: '<!-- @rules -->\nquorum: {"form":"count","n":3}' }))).toContain('P1');
    expect(rulesOf(fixture({ rules: PARTS.rules + '\n' + PARTS.title }))).toContain('P1');
    expect(rulesOf(fixture({ rules: PARTS.rules + '\n<!-- @agenda -->' }))).toContain('P1');
  });

  it('P2: a title of two lines, an empty text', () => {
    expect(rulesOf(fixture({ title: '<!-- @title -->\nA\nB\n<!-- @end -->' }))).toContain('P2');
    expect(rulesOf(fixture({ text: '<!-- @text -->\n<!-- @end -->' }))).toContain('P2');
  });

  it('P3: an unplaceable line, a stray field, a site with no With:, no Reason:, a mis-indented run', () => {
    const p = (s: string): string => fixture({ proposals: PARTS.proposals.replace('Reason: *Warmer.*', s) });
    expect(rulesOf(p('Why: warmer'))).toContain('P3');
    expect(rulesOf(p('As it was: `x`'))).toContain('P3');
    expect(rulesOf(fixture({ proposals: PARTS.proposals.replace('With: `### 09:00 · Welcome`\n', '') })))
      .toContain('P3');
    expect(rulesOf(p(''))).toContain('P3');
    expect(rulesOf(fixture({ proposals: PARTS.proposals.replace('  `### 10:00 · Talk`', '   `### 10:00 · Talk`') })))
      .toContain('P3');
  });

  it('P4: a decided Adopted wording not in the text', () => {
    expect(rulesOf(fixture({ decided: PARTS.decided.replace('A talk about crusts.`', 'A talk about pans.`') })))
      .toContain('P4');
  });

  it('P5: a Replaces run not verbatim in the text at reset', () => {
    expect(rulesOf(fixture({ proposals: PARTS.proposals.replace('Replaces: `### 09:00 · Opening`', 'Replaces: `### 09:00 · Openings`') })))
      .toContain('P5');
  });

  it('P6: a site that stands in two places', () => {
    const text = PARTS.text.replace('A talk about crusts.', 'The chair opens.');
    expect(rulesOf(fixture({ text, decided: PARTS.decided.replace('A talk about crusts.`', 'The chair opens.`') })))
      .toContain('P6');
  });

  it('P7: overlapping sites, a wording identical to what it replaces', () => {
    expect(rulesOf(fixture({ proposals: PARTS.proposals.replace('Place 2 replaces:\n  `### 10:00 · Talk`', 'Place 2 replaces:\n  `The chair opens.`').replace('  `A talk about crusts.`\nWith:\n  `### 10:00 · Opening`', 'With:\n  `### 10:00 · Opening`') })))
      .toContain('P7');
    expect(rulesOf(fixture({ proposals: PARTS.proposals.replace('With: `### 09:00 · Welcome`', 'With: `### 09:00 · Opening`') })))
      .toContain('P7');
  });

  it('P8: an unknown State:, an insertion with no After:', () => {
    expect(rulesOf(fixture({ proposals: PARTS.proposals.replace('State: contested', 'State: hot') }))).toContain('P8');
    expect(rulesOf(fixture({ insertions: PARTS.insertions.replace('After: `The chair opens.`', 'Replaces: `The chair opens.`') })))
      .toContain('P8');
  });

  it('P9: no founder, too few bots, a proposer not in the cast', () => {
    expect(rulesOf(fixture({ cast: PARTS.cast.replace(' (founder)', '') }))).toContain('P9');
    expect(rulesOf(fixture({ cast: PARTS.cast.replace('5. **Eve Five** — kind.\n', '').replace('Proposer: Eve Five', 'Proposer: Bea Two') })))
      .toContain('P9');
    expect(rulesOf(fixture({ proposals: PARTS.proposals.replace('Proposer: Bea Two', 'Proposer: Zed Nobody') })))
      .toContain('P9');
  });

  it('P9a: an exact duplicate of another entry', () => {
    const dup = PARTS.proposals.replace('<!-- @end -->',
      '**A2**\nReplaces: `### 09:00 · Opening`\nWith: `### 09:00 · Welcome`\nReason: Again.\nProposer: Cal Three\nState: fresh\n<!-- @end -->');
    expect(rulesOf(fixture({ proposals: dup }))).toContain('P9a');
  });

  it('P10: an unknown id, a retired setting, an invariant moved, a value the catalogue refuses', () => {
    const r = (line: string): string[] => rulesOf(fixture({ rules: `<!-- @rules -->\n${line}\n<!-- @end -->` }));
    expect(r('colour: {"rung":"red"}')).toContain('P10');
    expect(r('bar: 50')).toContain('P10');
    expect(r('chamber: {"rung":"closed"}')).toContain('P10');
    expect(r('rate: {"grant":5,"cap":3,"dripMinutes":2}')).toContain('P10');
  });

  it('every refusal names its file line', () => {
    const src = fixture({ proposals: PARTS.proposals.replace('State: contested', 'State: hot') });
    const e = parsePreset(src).errors.find((x) => x.rule === 'P8')!;
    expect(src.split('\n')[e.line - 1]).toBe('State: hot');
  });

  it("Ed's file parses: 72 lines, four decided, twenty-two open, thirteen bots and a founder", () => {
    const { preset, errors } = parsePreset(readFileSync(presetPath(DESIGN_DIR), 'utf8'));
    expect(errors).toEqual([]);
    expect(preset!.title).toBe('PizzaCon 2027');
    expect(preset!.text).toHaveLength(72);
    expect(preset!.decided).toHaveLength(4);
    expect(preset!.open).toHaveLength(22);
    expect(preset!.cast.filter((c) => !c.founder)).toHaveLength(13);
    // the three reorderings across two places are two-site entries (Q1535: all kept)
    expect(preset!.open.filter((e) => e.sites.length === 2).map((e) => e.label)).toEqual(['B1', 'J2', 'K1']);
    // the Monday dates are the text as first published, not the text at reset
    const first = undoDecided(preset!.text, preset!.decided);
    expect(first.some((l) => l.includes('Monday 11 to Wednesday 13'))).toBe(true);
    expect(preset!.text.some((l) => l.includes('Monday 11'))).toBe(false);
  });
});
