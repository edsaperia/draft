// Links in reasons (Q1533, Ed 2026-09-24: *it would be nice for rationales to
// be able to have links in them*, markdown links too), and the rail title's
// struck quote (Q1523 (c)). Both are pure functions in design/cards.js,
// loaded in a vm as md-escapes.test.ts loads them — copy.js first, since the
// grammar reads its words off window.COPY at load.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const design = join(import.meta.dirname, '..', '..', '..', 'design');
const win: Record<string, any> = {};
const ctx: Record<string, any> = { window: win, console, Math, Date, Set, Map, JSON, URL };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['copy.js', 'cards.js']) {
  vm.runInContext(readFileSync(join(design, f), 'utf8'), ctx, { filename: f });
}
const C = win.CARDS;
const EXT = 'target="_blank" rel="noopener noreferrer nofollow ugc"';
const leaves = '<span class="sr-only"> (opens outside docs.vote)</span>';

describe('reasonHtml — a reason may carry links (Q1533)', () => {
  it('makes a bare address a link that says it leaves docs.vote', () => {
    expect(C.reasonHtml('See https://example.org/rules for the text'))
      .toBe('See <a class="extlink" href="https://example.org/rules" ' + EXT + '>https://example.org/rules' +
        leaves + '</a> for the text');
  });
  it('makes a markdown link its words', () => {
    expect(C.reasonHtml('As [the minutes](https://example.org/m) say.'))
      .toBe('As <a class="extlink" href="https://example.org/m" ' + EXT + '>the minutes' + leaves + '</a> say.');
  });
  it('keeps a bracket pair inside the words', () => {
    expect(C.reasonHtml('[see [1]](https://example.org/n)'))
      .toBe('<a class="extlink" href="https://example.org/n" ' + EXT + '>see [1]' + leaves + '</a>');
  });
  it('leaves trailing punctuation out of a bare address, and a ) it did not open', () => {
    expect(C.reasonHtml('Read https://example.org/a.')).toContain('href="https://example.org/a"');
    expect(C.reasonHtml('Read https://example.org/a.')).toMatch(/<\/a>\.$/);
    expect(C.reasonHtml('(see https://example.org/b)')).toMatch(/href="https:\/\/example.org\/b"[^>]*>https:\/\/example.org\/b<span/);
    expect(C.reasonHtml('https://en.wikipedia.org/wiki/Quorum_(law)')).toContain('href="https://en.wikipedia.org/wiki/Quorum_(law)"');
  });
  it('refuses anything but http and https, printing it as the text typed', () => {
    const js = C.reasonHtml('[click](javascript:alert(1))');
    expect(js).not.toContain('<a');
    expect(js).toBe('[click](javascript:alert(1))');
    expect(C.reasonHtml('data:text/html,<b>x</b>')).toBe('data:text/html,&lt;b&gt;x&lt;/b&gt;');
    expect(C.reasonHtml('[x](ftp://example.org/f)')).not.toContain('<a');
  });
  it('escapes an address carrying < or ", and everything round it', () => {
    const q = C.reasonHtml('[x](https://example.org/"onmouseover="alert(1))');
    expect(q).not.toMatch(/href="[^"]*"onmouseover/);
    expect(q).toContain('href="https://example.org/%22onmouseover=%22alert(1)"');
    const lt = C.reasonHtml('https://example.org/a<script>alert(1)</script>');
    expect(lt).not.toContain('<script');
    expect(lt).toContain('href="https://example.org/a"');
    expect(lt).toContain('&lt;script&gt;');
    expect(C.reasonHtml('<b>bold</b> & more')).toBe('&lt;b&gt;bold&lt;/b&gt; &amp; more');
    expect(C.reasonHtml('[<img src=x onerror=alert(1)>](https://example.org)'))
      .toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
  it('keeps a docs.vote address in the site: .doclink, bare or with its scheme', () => {
    expect(C.reasonHtml('See docs.vote/d/hollow-oak'))
      .toBe('See <a class="doclink" href="https://docs.vote/d/hollow-oak" target="_blank" rel="noopener">docs.vote/d/hollow-oak</a>');
    expect(C.reasonHtml('[our rules](https://docs.vote/d/hollow-oak)'))
      .toBe('<a class="doclink" href="https://docs.vote/d/hollow-oak" target="_blank" rel="noopener">our rules</a>');
  });
  it('reads the escapes and draws no bold or italic', () => {
    expect(C.reasonHtml('5\\. Expiry, **not** bold')).toBe('5. Expiry, **not** bold');
    expect(C.reasonHtml('\\[not a link](https://example.org)')).toContain('[not a link](<a class="extlink"');
  });
});

describe('reasonPlain — a reason as words (a rail teaser)', () => {
  it('reads a markdown link as its words and a bare address as itself', () => {
    expect(C.reasonPlain('As [the minutes](https://example.org/m) say, see https://example.org/x.'))
      .toBe('As the minutes say, see https://example.org/x.');
    expect(C.reasonPlain('5\\. Expiry')).toBe('5. Expiry');
  });
});

describe('railTitleHtml — words taken out, struck (Q1523 (c))', () => {
  it('draws a deletion as <del> with its meaning for a screen reader', () => {
    expect(C.railTitleHtml(C.railChange('The Club has no head, and has managed.', 'The Club has no head.', 'G')))
      .toBe('<del class="struck"><span class="sr-only">without </span>‘and has managed’</del>');
    expect(C.railTitleText(C.railChange('The Club has no head, and has managed.', 'The Club has no head.', 'G')))
      .toBe('without ‘and has managed’');
  });
  it('escapes what a member wrote before any markup goes round it', () => {
    const t = C.railChange('Keep it <b>bold</b>.', 'Keep it.', 'G');
    expect(C.railTitleHtml(t)).toBe('<del class="struck"><span class="sr-only">without </span>‘&lt;b&gt;bold&lt;/b&gt;’</del>');
    expect(C.railTitleHtml('Doc <img src=x onerror=alert(1)>')).toBe('Doc &lt;img src=x onerror=alert(1)&gt;');
  });
});
