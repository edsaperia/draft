#!/usr/bin/env node
/**
 * bold-across-blocks — **B over a selection that runs across two paragraphs** (Q1467; Ed,
 * 2026-09-19, his pick of three: *wrap each paragraph's part separately*).
 *
 *   npm run design -- 8262            # any free port; the address it prints is the one to use
 *   node scripts/repro/bold-across-blocks.mjs http://127.0.0.1:8262
 *
 * Edit mode is markdown source (Q1467), so **B** writes `**` round the selection. Markdown has
 * no bold that spans a paragraph break, and until this guard's fix one pair was written round
 * the whole run — break included — so both paragraphs came out of edit mode wearing literal
 * asterisks. The rule now: each paragraph's selected part takes its own pair, a block's own
 * marker (`# `, `- `) and the white space at a part's edges stay outside it, a blank line is
 * left alone, and a second press on a run whose every part is already marked takes them off.
 *
 * Three cases on the fixture's charter, in one lane split in two by an Enter:
 *
 *   wrap     select from inside the first paragraph into the second, press B: two pairs,
 *            one per paragraph, and no pair holding a line break.
 *   unwrap   press B again on the same run: the text is as it was before the first press.
 *   italic   the same run under I: one `*` pair per paragraph.
 *
 * Exit 0 only if all pass; 1 on a failure, 2 on a broken set-up.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:8262';
const say = (s) => console.log(s);
const fails = [];
const check = (name, ok, detail) => {
  say((ok ? 'PASS · ' : 'FAIL · ') + name + (ok ? '' : ' · ' + detail));
  if (!ok) fails.push(name);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(BASE + '/session-view.html?fixture=session');
await page.waitForSelector('#charter', { state: 'attached' });
await page.waitForTimeout(1200);
await page.click('#editdoor [data-act="edit-door"]');          // 📝 is the door
await page.waitForTimeout(800);

// a plain paragraph of some length, no marker, not inside a card
const found = await page.evaluate(() => {
  const blocks = [...document.querySelectorAll('#charter .prose [data-key]')]
    .filter((b) => !b.closest('.sugg') && b.getClientRects().length);
  const p = blocks.find((b) => !b.querySelector('.mdmark') && b.textContent.trim().length > 80);
  if (!p) return null;
  p.setAttribute('data-probe', 'para');
  return { key: p.dataset.key };
});
if (!found) { say('SET-UP · no plain paragraph found in the column in edit mode'); await browser.close(); process.exit(2); }
await page.$eval('[data-probe="para"]', (el) => el.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(200);

// what the composer holds for the one unproposed draft
const draftText = () => page.evaluate(() => {
  const d = (window.SESSION.SUGGS || []).find((s) => s.unproposed);
  return d && d.sites && d.sites[0] ? d.sites[0].text : null;
});

// open the lane by typing, then split the paragraph in two with an Enter
const r = await page.$eval('[data-probe="para"]', (el) => {
  const q = el.getBoundingClientRect();
  return { x: q.left + 40, y: q.top + 8 };
});
await page.mouse.click(r.x, r.y);
await page.keyboard.press('Home');
for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowRight');
await page.keyboard.type('X');                  // the keystroke that opens the draft
await page.waitForTimeout(900);
await page.keyboard.press('Backspace');
await page.keyboard.press('Enter');             // two paragraphs in one lane
await page.waitForTimeout(400);
const before = await draftText();
if (before == null || before.split('\n').filter((l) => l.trim()).length < 2) {
  say('SET-UP · the lane did not split in two: ' + JSON.stringify(before));
  await browser.close(); process.exit(2);
}

// select five characters back into the first paragraph and five on into the second
const selectRun = async () => {
  await page.evaluate(() => {
    const lane = document.activeElement.closest('[data-lane]');
    const lps = [...lane.querySelectorAll('.lp')].filter((b) => b.textContent.trim());
    const textIn = (el, fromEnd) => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes = []; let n = w.nextNode();
      while (n) { if (n.length) nodes.push(n); n = w.nextNode(); }
      return fromEnd ? nodes[nodes.length - 1] : nodes[0];
    };
    const a = textIn(lps[0], true), b = textIn(lps[1], false);
    const g = document.createRange();
    g.setStart(a, Math.max(0, a.length - 5));
    g.setEnd(b, Math.min(b.length, 5));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(g);
  });
};
const press = async (fmt) => {
  await page.dispatchEvent(`[data-editctl] .lfmt[data-fmt="${fmt}"]`, 'mousedown');
  await page.waitForTimeout(500);
};
const pairsOk = (text, marks) => {
  const lines = text.split('\n').filter((l) => l.trim());
  const esc = marks.replace(/\*/g, '\\*');
  const rx = new RegExp(esc + '[^*\\n]+' + esc);
  return lines.length >= 2 && rx.test(lines[0]) && rx.test(lines[1]);
};

await selectRun();
await press('bold');
const bolded = await draftText();
check('wrap · each paragraph takes its own ** pair, and no pair holds a line break',
  bolded != null && pairsOk(bolded, '**') && !/\*\*[^*]*\n[^*]*\*\*/.test(bolded.replace(/\*\*[^*\n]+\*\*/g, '')),
  JSON.stringify({ before, bolded }));

// the selection after the insert is collapsed; re-select the marked run, marks and all
await page.evaluate(() => {
  const lane = document.activeElement.closest('[data-lane]');
  const lps = [...lane.querySelectorAll('.lp')].filter((b) => b.textContent.trim());
  const find = (el, s, last) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n = w.nextNode(), hit = null;
    while (n) { const i = last ? n.data.lastIndexOf(s) : n.data.indexOf(s); if (i >= 0) { hit = [n, i]; if (!last) break; } n = w.nextNode(); }
    return hit;
  };
  const a = find(lps[0], '**', false), b = find(lps[1], '**', true);
  if (!a || !b) return;
  const g = document.createRange();
  g.setStart(a[0], a[1]); g.setEnd(b[0], b[1] + 2);
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(g);
});
await press('bold');
const unbolded = await draftText();
check('unwrap · a second press on the marked run takes every pair off again',
  unbolded === before, JSON.stringify({ before, unbolded }));

await selectRun();
await press('italic');
const italic = await draftText();
check('italic · one * pair per paragraph', italic != null && pairsOk(italic, '*') && !/\*\*/.test(italic),
  JSON.stringify({ italic }));

check('no page error', errs.length === 0, errs.join(' | '));
await browser.close();
say(fails.length ? `FAILED: ${fails.join(' · ')}` : 'all cases pass');
process.exit(fails.length ? 1 : 0);
