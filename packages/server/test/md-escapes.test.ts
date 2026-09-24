// Backslash escapes (Ed, 2026-09-24, rulings 13 and 14): reading hides an
// escape before ASCII punctuation and never takes the escaped character for a
// mark; a paste keeps only the escapes docs.vote needs. Both are pure
// functions in design/cards.js, loaded here in a vm the way
// design/tools/clock-check.mjs loads the grammar — copy.js first, since the
// grammar reads its words off window.COPY at load.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const design = join(import.meta.dirname, '..', '..', '..', 'design');
const win: Record<string, any> = {};
const ctx: Record<string, any> = { window: win, console, Math, Date, Set, Map, JSON };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['copy.js', 'cards.js']) {
  vm.runInContext(readFileSync(join(design, f), 'utf8'), ctx, { filename: f });
}
const C = win.CARDS;
// the text a reader would see: tags gone, hidden `.mdesc` backslashes gone
const seen = (html: string) => String(html)
  .replace(/<span class="mdesc">\\<\/span>/g, '')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

describe('mdUnescape — the plain reading (ruling 13)', () => {
  it('hides a backslash before punctuation', () => {
    expect(C.mdUnescape('5\\. Expiry')).toBe('5. Expiry');
    expect(C.mdUnescape('Section 2\\. and 29 November 2026\\.')).toBe('Section 2. and 29 November 2026.');
    expect(C.mdUnescape('\\*not bold\\*')).toBe('*not bold*');
    expect(C.mdUnescape('\\# not a heading')).toBe('# not a heading');
  });
  it('reads `\\\\` as one backslash', () => {
    expect(C.mdUnescape('a\\\\b')).toBe('a\\b');
  });
  it('leaves a backslash before a letter or a digit', () => {
    expect(C.mdUnescape('C:\\new\\5')).toBe('C:\\new\\5');
  });
  it('plainLabel reads a title through it', () => {
    expect(C.plainLabel('§ 5\\. Expiry')).toBe('5. Expiry');
  });
  it('mdPlain takes the marks off, escape-aware', () => {
    expect(C.mdPlain('# 5\\. **Expiry**')).toBe('5. Expiry');
    expect(C.mdPlain('\\*not bold\\*')).toBe('*not bold*');
    expect(C.mdPlain('\\# not a heading')).toBe('# not a heading');
  });
});

describe('mdToHtml / mdLine — the column (ruling 13)', () => {
  it('hides the backslash in a span and shows the character', () => {
    const h = C.mdToHtml('5\\. Expiry');
    expect(h).toBe('5<span class="mdesc">\\</span>. Expiry');
    expect(seen(h)).toBe('5. Expiry');
  });
  it('never reads an escaped star as a mark', () => {
    const h = C.mdToHtml('\\*not bold\\*');
    expect(h).not.toContain('<em>');
    expect(seen(h)).toBe('*not bold*');
    expect(C.mdToHtml('**bold** and \\*\\*not\\*\\*')).toContain('<strong>bold</strong>');
  });
  it('`\\\\` reads as one backslash, and the star after it is still a mark', () => {
    const h = C.mdToHtml('\\\\*it*');
    expect(seen(h)).toBe('\\it');
    expect(h).toContain('<em>it</em>');
  });
  it('a backslash before a letter is text', () => {
    expect(seen(C.mdToHtml('a\\b'))).toBe('a\\b');
  });
  it('keeps the backslash inside a code span, as CommonMark does', () => {
    expect(seen(C.mdToHtml('`a\\.b`'))).toBe('a\\.b');
  });
  it('round-trips: what the DOM holds is the source (htmlToMd reads text nodes)', () => {
    // the span's text node is the backslash, so the column's read-back keeps it
    const h = C.mdToHtml('\\*x\\* 5\\.');
    expect(h.replace(/<[^>]+>/g, '').replace(/&#39;/g, "'")).toBe('\\*x\\* 5\\.');
  });
  it('mdStrip keeps the backslashes and is escape-aware', () => {
    expect(C.mdStrip('\\*x\\* **y**')).toBe('\\*x\\* y');
  });
  it('sourceToRich counts the hidden backslash as the rendered block holds it', () => {
    // source `\*x\*`, rendered text `\*x\*` (the span holds the backslash)
    expect(C.sourceToRich('\\*x\\*', 3)).toBe(3);
    expect(C.sourceToRich('**b** \\.', 8)).toBe(4);
  });
});

describe('mdBlocksHtml / mdDiffHtml — cards (ruling 13)', () => {
  it('an escaped heading is a heading with its escape read', () => {
    const h = C.mdBlocksHtml(null, '# 5\\. Expiry');
    expect(h).toContain('hblock lvl1');
    expect(seen(h)).toBe('5. Expiry');
    expect(h).not.toContain('\\');
  });
  it('a line-leading `\\#` is a paragraph showing the hash', () => {
    const h = C.mdBlocksHtml(null, '\\# not a heading');
    expect(h).not.toContain('hblock');
    expect(seen(h)).toBe('# not a heading');
  });
  it('a line-leading `\\-` is a paragraph showing the dash', () => {
    const h = C.mdBlocksHtml(null, '\\- not a bullet');
    expect(h).not.toContain('lp bullet');
    expect(seen(h)).toBe('- not a bullet');
  });
  it('an escaped star is no emphasis', () => {
    const h = C.mdBlocksHtml(null, '\\*not bold\\*');
    expect(h).not.toContain('<em>');
    expect(seen(h)).toBe('*not bold*');
  });
  it('`\\\\` reads as one backslash', () => {
    expect(seen(C.mdBlocksHtml(null, 'a \\\\ b'))).toBe('a \\ b');
  });
  it('a backslash before a letter stays', () => {
    expect(seen(C.mdBlocksHtml(null, 'C:\\new'))).toBe('C:\\new');
  });
  it('a change that only adds or takes away a backslash is no visible change', () => {
    const add = C.mdDiffHtml('Section 2. Expiry', 'Section 2\\. Expiry', true);
    expect(add).not.toContain('<ins>');
    expect(add).not.toContain('<del>');
    expect(seen(add)).toBe('Section 2. Expiry');
    const cut = C.mdBlocksHtml('Section 2\\. Expiry', 'Section 2. Expiry', true);
    expect(cut).not.toContain('<ins>');
    expect(seen(cut)).toBe('Section 2. Expiry');
  });
  it('a diff never shows a stray backslash', () => {
    const h = C.mdDiffHtml('Ends 29 November 2026\\.', 'Ends 30 November 2026\\.', true);
    expect(seen(h).replace(/\s+/g, ' ')).not.toMatch(/\\[!-/:-@[-`{-~]/);
    expect(h).toContain('<ins>30</ins>');
  });
  it('an escaped star turned into a real mark is a visible change', () => {
    const h = C.mdBlocksHtml('\\*x\\* stays', '*x* stays', true);
    expect(h).toContain('<em>');
  });
});

describe('pasteClean — a paste keeps only the escapes docs.vote needs (ruling 14)', () => {
  it('drops the escapes docs.vote does not read', () => {
    expect(C.pasteClean('5\\. Expiry')).toBe('5. Expiry');
    expect(C.pasteClean('Section 2\\. \\(a\\) \\[b\\] done\\!')).toBe('Section 2. (a) [b] done!');
    expect(C.pasteClean('# 5\\. Expiry')).toBe('# 5. Expiry');
  });
  it('keeps the inline ones and `\\\\`', () => {
    expect(C.pasteClean('\\*not bold\\*')).toBe('\\*not bold\\*');
    expect(C.pasteClean('snake\\_case and \\`tick\\`')).toBe('snake\\_case and \\`tick\\`');
    expect(C.pasteClean('a\\\\b')).toBe('a\\\\b');
    expect(C.pasteClean('\\\\.')).toBe('\\\\.');
  });
  it('keeps a line-leading `\\#` or `\\-` that would become a marker', () => {
    expect(C.pasteClean('\\# not a heading')).toBe('\\# not a heading');
    expect(C.pasteClean('\\- not a bullet')).toBe('\\- not a bullet');
    expect(C.pasteClean('## \\# still a heading')).toBe('## # still a heading');
    expect(C.pasteClean('a \\- b \\# c')).toBe('a - b # c');
    expect(C.pasteClean('\\-5 degrees')).toBe('-5 degrees');
  });
  it('leaves a backslash before a letter, and works line by line', () => {
    expect(C.pasteClean('C:\\new')).toBe('C:\\new');
    expect(C.pasteClean('1\\. one\n\\# two\n3\\. three')).toBe('1. one\n\\# two\n3. three');
  });
  it('takes nothing away that reading would show', () => {
    for (const s of ['5\\. Expiry', '\\*x\\*', '\\# h', 'a\\\\b', '\\- b', 'x \\( y \\)', 'C:\\new']) {
      expect(seen(C.mdBlocksHtml(null, C.pasteClean(s)))).toBe(seen(C.mdBlocksHtml(null, s)));
    }
  });
});
