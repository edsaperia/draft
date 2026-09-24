#!/usr/bin/env node
/**
 * escape-paste — **a paste keeps only the backslash escapes docs.vote needs**
 * (Ed, 2026-09-24, ruling 14; nh2026's text, pasted out of a markdown editor
 * that wrote `5\. Expiry` and `Section 2\.`).
 *
 *   node scripts/repro/escape-paste.mjs [--width=1600]
 *
 * docs.vote reads a line's `# `/`- ` marker and inline `**`, `*` and
 * backticks, nothing else, so an escape before any other punctuation is a
 * backslash printed for ever. `pasteClean` (design/cards.js) drops those at
 * the paste and keeps the ones docs.vote needs: `\*`, `\_`, a backtick,
 * `\\`, and a line-leading `\#` or `\-` that would otherwise become a
 * heading or a bullet. Four roads are driven: a paste into a clause in edit
 * mode (the composer's `pastedText`), a paste into the lane that opens (the
 * lane's own `paste` listener, session.js), a paste into the draft's reason
 * (session.js's document-level reason listener, Q1533), and a paste into the
 * founder's column before 🍾 (the page's `#prose` listener).
 *
 * It needs no server — `design/` is static, served here as `crlf-paste`
 * does — and changes nothing: no proposal is sent.
 *
 * Exit 0 when nothing is wrong; 1 on a finding, 2 on a broken set-up.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DESIGN = join(resolve(fileURLToPath(new URL('../..', import.meta.url))), 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.woff2': 'font/woff2' };
const WIDTH = +((process.argv.find((a) => a.startsWith('--width=')) || '').slice(8) || 1600);
const say = (s) => console.log(s);
const die = (m) => { console.error(`escape-paste: ${m}`); process.exit(2); };

const serve = () => new Promise((ok) => {
  const s = createServer(async (req, res) => {
    const p = join(DESIGN, decodeURIComponent(req.url.split('?')[0]));
    try {
      const body = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404).end('no'); }
  });
  s.listen(0, '127.0.0.1', () => ok([s, s.address().port]));
});

// what a markdown editor puts on the clipboard, and what the draft must hold
const BS = '\\';
const PASTED = `5${BS}. Expiry ends ${BS}(see Section 2${BS}.${BS}) ${BS}*not bold${BS}* ${BS}${BS} C:${BS}new`;
const WANT = `5. Expiry ends (see Section 2.) ${BS}*not bold${BS}* ${BS}${BS} C:${BS}new`;
const PASTED_LINES = `5${BS}. Expiry${BS}!\n${BS}# not a heading\n${BS}- not a bullet`;
const WANT_LINES = ['5. Expiry!', `${BS}# not a heading`, `${BS}- not a bullet`];

const [srv, port] = await serve();
const browser = await chromium.launch();
const fails = [];
const T = (page, ms) => page.waitForTimeout(ms);

const HOOKS = `window.__escPaste = (el, text) => {
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  return el.dispatchEvent(new InputEvent('beforeinput', {
    bubbles: true, cancelable: true, inputType: 'insertFromPaste', dataTransfer: dt }));
};
window.__clipPaste = (el, text) => {
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  return el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
};`;

/* ---- 1 and 2: the charter, a clause and then its lane --------------------- */
{
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 1000 } });
  page.on('pageerror', (e) => fails.push('page error: ' + e.message));
  await page.goto(`http://127.0.0.1:${port}/session-view.html?fixture=session`, { waitUntil: 'networkidle' });
  await page.addScriptTag({ content: HOOKS });
  await T(page, 500);
  const opened = await page.evaluate(() => {
    const tab = document.querySelector('#ridetab .achip[data-tab="text"]') || document.querySelector('#editdoor');
    if (!tab) return false;
    tab.click();
    return true;
  });
  if (!opened) die('no 📝 door on the fixture');
  await T(page, 700);
  if (!(await page.evaluate(() => document.getElementById('doc').classList.contains('editing')))) die('📝 did not enter edit mode');

  const draft = () => page.evaluate(() => {
    const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
    return d ? d.sites.map((s) => s.text) : null;
  });

  // a paste into a clause: the caret at its end, the clipboard's text after it
  const err = await page.evaluate((text) => {
    const ps = [...document.querySelectorAll('#charter .prose p.editable[data-key]')]
      .filter((p) => !p.classList.contains('gap') && p.textContent.trim().length > 5);
    const p = ps[1];
    if (!p) return 'no clause to paste into';
    p.scrollIntoView({ block: 'center' });
    const tn = [...p.childNodes].reverse().find((x) => x.nodeType === 3);
    if (!tn) return 'the clause holds no text node';
    const r = document.createRange();
    r.setStart(tn, tn.length); r.collapse(true);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    window.__escPaste(p, ' ' + text);
    return null;
  }, PASTED);
  if (err) die(`a clause: ${err}`);
  await T(page, 800);
  const d1 = await draft();
  if (!d1) fails.push('clause: the paste opened no draft');
  else if (!d1.join('\n').endsWith(' ' + WANT)) {
    fails.push(`clause: the draft ends ${JSON.stringify(d1.join('\n').slice(-WANT.length - 8))}, wanted …${JSON.stringify(WANT)}`);
  } else say(`clause    · the draft holds ${JSON.stringify(WANT)}`);

  // the lane that opened: its own paste listener, the caret at its end
  const lerr = await page.evaluate((text) => {
    const lane = document.querySelector('[data-lane]');
    if (!lane) return 'no lane opened';
    lane.focus();
    const r = document.createRange(); r.selectNodeContents(lane); r.collapse(false);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    window.__clipPaste(lane, text);
    return null;
  }, '\n' + PASTED_LINES);
  if (lerr) die(`the lane: ${lerr}`);
  await T(page, 800);
  const d2 = await draft();
  const lines = d2 ? d2.join('\n').split('\n') : [];
  const tail = lines.slice(-3);
  if (JSON.stringify(tail) !== JSON.stringify(WANT_LINES)) {
    fails.push(`lane: the draft's last lines are ${JSON.stringify(tail)}, wanted ${JSON.stringify(WANT_LINES)}`);
  } else say(`lane      · the draft's last lines are ${JSON.stringify(WANT_LINES)}`);

  // …and the reason under it (Q1533, Ed 2026-09-24): a reason is light
  // markdown now, so the one document-level listener (session.js) cleans a
  // paste into it too
  const werr = await page.evaluate((text) => {
    const why = document.querySelector('.edit-why');
    if (!why) return 'no reason field on the draft';
    why.focus();
    const r = document.createRange(); r.selectNodeContents(why); r.collapse(false);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    window.__clipPaste(why, text);
    return null;
  }, PASTED);
  if (werr) die(`the reason: ${werr}`);
  await T(page, 600);
  const why = await page.evaluate(() => {
    const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
    return d ? d.rationale : null;
  });
  if (!why || !why.endsWith(WANT)) fails.push(`reason: the draft's reason is ${JSON.stringify(why)}, wanted …${JSON.stringify(WANT)}`);
  else say(`reason    · the draft's reason holds ${JSON.stringify(WANT)}`);
  await page.close();
}

/* ---- 3: the founder's column before 🍾 ------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 1000 } });
  page.on('pageerror', (e) => fails.push('page error: ' + e.message));
  await page.goto(`http://127.0.0.1:${port}/session-view.html`, { waitUntil: 'networkidle' });
  await page.addScriptTag({ content: HOOKS });
  await T(page, 500);
  const err = await page.evaluate((text) => {
    const prose = document.getElementById('prose');
    if (!prose) return 'no #prose column';
    window.__clipPaste(prose, text);
    return null;
  }, PASTED + '\n' + PASTED_LINES);
  if (err) die(`the founder's column: ${err}`);
  await T(page, 600);
  // the column's own read-out keeps a hidden backslash as text, so the
  // blocks' textContent is the source the stash would send
  const got = await page.evaluate(() => [...document.getElementById('prose').children].map((b) => b.textContent));
  const want = [WANT, ...WANT_LINES];
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    fails.push(`founder's column: the blocks read ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
  } else say(`column    · ${got.length} blocks, the unneeded escapes gone and the needed ones kept`);
  // …and reading hides the ones kept (ruling 13): nothing shown carries one
  const shown = await page.evaluate(() => document.getElementById('prose').innerText);
  if (/\\[!-/:-@[-`{-~]/.test(shown.replace(/\\\\/g, ''))) {
    fails.push(`founder's column: an escape is shown — ${JSON.stringify(shown)}`);
  }
  await page.close();
}

await browser.close();
srv.close();
if (fails.length) {
  say('');
  for (const f of fails) say('FAIL: ' + f);
  process.exit(1);
}
say('');
say('escape-paste · green: a markdown editor\'s escapes are cleaned at the paste, by all four roads');
