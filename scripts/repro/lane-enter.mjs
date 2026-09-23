#!/usr/bin/env node
/**
 * lane-enter — **does Enter at the end of a lane you are drafting in make a line?**
 * (issue #78; the twelve-seat integration room, 2026-09-20: *"…of each month.Meetings
 * begin at seven…"* in the signed charter)
 *
 *   npm run design -- 8231            # any free port; the address it prints is the one to use
 *   node scripts/repro/lane-enter.mjs http://127.0.0.1:8231
 *
 * The fixture's charter in edit mode. A draft is opened on a paragraph by typing at its
 * end, then Enter is pressed **in the lane** and a second sentence typed. Until #78
 * `readLane` stripped the trailing newline the Enter made, the lane was redrawn from that
 * string, the new empty block vanished and the caret came back to the end of line one — so
 * the second sentence was glued onto the first with no separator.
 *
 * Four cases, each on a page of its own:
 *
 *   end     Enter at the lane's end, then a sentence: two blocks, `\n` between the sentences.
 *   bare    Enter at the lane's end and nothing after: two blocks, the caret in the second,
 *           and the draft still counts as the one sentence typed (the empty line is the
 *           lane's, never the proposal's — `sentText`).
 *   middle  the control: Enter inside the lane splits it, as it always has.
 *   twice   Enter twice at the end, then a sentence: the blank line between collapses, as a
 *           blank line always has (`blocksOf` holds none), and the sentence is line two.
 *
 * Exit 0 only if all pass; 1 on a failure, 2 on a broken set-up. Red on the pre-#78 page at
 * `end`, `bare` and `twice`; `middle` is green on both.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:8231';
const say = (s) => console.log(s);
const fails = [];
const check = (name, ok, detail) => {
  say((ok ? 'PASS · ' : 'FAIL · ') + name + (ok ? '' : ' · ' + detail));
  if (!ok) fails.push(name);
};

const browser = await chromium.launch();

// the fixture's charter in edit mode, a draft opened on a paragraph by typing
// `typed` at its end; the caret is then in that draft's lane
async function openDraft(typed) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(BASE + '/session-view.html?fixture=session');
  await page.waitForSelector('#charter', { state: 'attached' });
  await page.waitForTimeout(1200);
  await page.click('#editdoor [data-act="edit-door"]');          // 📝 is the door
  await page.waitForTimeout(800);
  const key = await page.evaluate(() => {
    const p = [...document.querySelectorAll('#charter .prose p.editable[data-key]')]
      .find((x) => !x.classList.contains('gap') && !x.closest('.sugg') &&
        !x.querySelector('.mdmark') && x.textContent.trim().length > 20);
    if (!p) return null;
    p.scrollIntoView({ block: 'center' });
    const r = document.createRange(); r.selectNodeContents(p); r.collapse(false);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    return p.dataset.key;
  });
  if (!key) { say('SET-UP · no paragraph found in the column in edit mode'); await page.close(); return null; }
  await page.keyboard.type(typed, { delay: 20 });
  await page.waitForTimeout(700);
  const inLane = await page.evaluate(() => {
    const el = document.activeElement;
    return !!(el && el.dataset && el.dataset.lane);
  });
  if (!inLane) { say('SET-UP · typing at the clause\'s end did not put the caret in a lane'); await page.close(); return null; }
  return { page, errs, key };
}

const state = (page) => page.evaluate(() => {
  const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
  const lane = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.lane
    ? document.activeElement : document.querySelector('.sugg [data-lane]');
  const blocks = lane ? [...lane.querySelectorAll('.lp')] : [];
  const sel = getSelection();
  const at = sel && sel.rangeCount ? blocks.findIndex((b) => b === sel.anchorNode || b.contains(sel.anchorNode)) : -1;
  const s = d && d.sites[0];
  return { text: s ? s.text : null, sent: s && window.CARDS.sentText ? window.CARDS.sentText(s) : null,
    blocks: blocks.length, caretBlock: at };
});

// ---- end: Enter at the lane's end, then a sentence ------------------------------
{
  const t = await openDraft(' Circulated within a week.');
  if (!t) { await browser.close(); process.exit(2); }
  const { page, errs } = t;
  await page.keyboard.press('Enter');
  await page.keyboard.type('A second sentence on its own line.', { delay: 20 });
  await page.waitForTimeout(500);
  const s = await state(page);
  check('end · two blocks, a newline between the sentences',
    s.blocks === 2 && /within a week\.\nA second sentence on its own line\.$/.test(s.text || ''),
    JSON.stringify(s));
  check('end · no page error', errs.length === 0, errs.join(' | '));
  await page.close();
}

// ---- bare: Enter at the lane's end and nothing after ------------------------------
{
  const t = await openDraft(' Circulated within a week.');
  if (!t) { await browser.close(); process.exit(2); }
  const { page, errs } = t;
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const s = await state(page);
  check('bare · the new line stands, the caret in it',
    s.blocks === 2 && s.caretBlock === 1 && /within a week\.\n$/.test(s.text || ''),
    JSON.stringify(s));
  check('bare · what goes out has no empty last line',
    s.sent != null && /within a week\.$/.test(s.sent), JSON.stringify(s));
  check('bare · no page error', errs.length === 0, errs.join(' | '));
  await page.close();
}

// ---- middle: the control ------------------------------------------------------------
{
  const t = await openDraft(' Circulated within a week.');
  if (!t) { await browser.close(); process.exit(2); }
  const { page, errs } = t;
  for (let i = 0; i < 'within a week.'.length; i++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const s = await state(page);
  check('middle · Enter inside the lane splits it',
    s.blocks === 2 && /Circulated \nwithin a week\.$/.test(s.text || '') && s.caretBlock === 1,
    JSON.stringify(s));
  check('middle · no page error', errs.length === 0, errs.join(' | '));
  await page.close();
}

// ---- twice: two Enters, then a sentence ------------------------------------------------
{
  const t = await openDraft(' Circulated within a week.');
  if (!t) { await browser.close(); process.exit(2); }
  const { page, errs } = t;
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Then this.', { delay: 20 });
  await page.waitForTimeout(500);
  const s = await state(page);
  check('twice · the blank line collapses, the sentence is line two',
    s.blocks === 2 && /within a week\.\nThen this\.$/.test(s.text || ''),
    JSON.stringify(s));
  check('twice · no page error', errs.length === 0, errs.join(' | '));
  await page.close();
}

await browser.close();
say(fails.length ? `FAILED: ${fails.join(' · ')}` : 'all four cases pass');
process.exit(fails.length ? 1 : 0);
