#!/usr/bin/env node
/**
 * crlf-paste — **a paste out of a Windows editor puts no carriage return in a
 * draft** (Q1491; the nh2026 convention, 2026-09-20).
 *
 *   node scripts/repro/crlf-paste.mjs [--width=1600]
 *
 * A member pasted text with '\r\n' endings into a lane. The composer read the
 * clipboard's `text/plain` unchanged and split the draft on '\n' alone, so
 * every line but the last kept a trailing '\r' — which rode the hunk into the
 * document and thereafter sat inside a "line" the text cannot represent.
 * Fifteen proposals over the four minutes before the close were told *the text
 * at lines N is not what this proposal replaces* of wording that was exactly
 * what they replaced, and the fifteen lines could never be proposed on again.
 *
 * The engine's doors normalise now, so nothing gets in from any client; this
 * is the page's own half — the draft never holds one, so what the lane shows
 * is what will be sent. Both roads into a draft are driven: a paste into a
 * clause (`startDraftFromTyping`) and a paste over a selected run of clauses
 * (`startDraftFromRun`).
 *
 * It needs no server — `design/` is static, served here as `picture-walk`
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
const die = (m) => { console.error(`crlf-paste: ${m}`); process.exit(2); };

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

const [srv, port] = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: 1000 } });
const fails = [];
page.on('pageerror', (e) => fails.push('page error: ' + e.message));
const T = (ms) => page.waitForTimeout(ms);

/**
 * A paste as the composer meets it: `beforeinput` with `insertFromPaste` and a
 * real `DataTransfer`. Not a `paste` ClipboardEvent — the column's own listener
 * is on `beforeinput`, and a synthetic clipboard event never reaches it.
 */
const PASTE = `window.__crlfPaste = (el, text) => {
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  return el.dispatchEvent(new InputEvent('beforeinput', {
    bubbles: true, cancelable: true, inputType: 'insertFromPaste', dataTransfer: dt }));
};`;

await page.goto(`http://127.0.0.1:${port}/session-view.html?fixture=session`, { waitUntil: 'networkidle' });
await page.addScriptTag({ content: PASTE });
await T(500);

/* 📝 is the door: there is no caret in read mode (K13). */
const opened = await page.evaluate(() => {
  const tab = document.querySelector('#ridetab .achip[data-tab="text"]') ||
    document.querySelector('#editdoor');
  if (!tab) return null;
  tab.click();
  return true;
});
if (!opened) die('no 📝 door on the fixture — #ridetab .achip[data-tab="text"] matched nothing');
await T(700);
if (!(await page.evaluate(() => document.getElementById('doc').classList.contains('editing')))) {
  die('📝 did not enter edit mode');
}

const WINDOWS = 'Members pay dues by March.\r\nGuests sign the book.\r\nThe bar closes at eleven.';
const WANT = ['Members pay dues by March.', 'Guests sign the book.', 'The bar closes at eleven.'];

/** The draft the page is holding, as the lanes show it and as it would be sent. */
const draftNow = () => page.evaluate(() => {
  const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
  if (!d) return null;
  return { sites: d.sites.map((s) => s.text), keys: d.sites.map((s) => s.keys.join('+')) };
});

const discard = async () => {
  await page.evaluate(() => {
    const b = document.querySelector('#charter [data-proposalrow] [data-act="row-discard"]');
    if (b && !b.disabled) b.click();
  });
  await T(500);
};

/** Put a caret at the end of the nth ordinary clause and paste over it. */
const pasteIntoClause = (n) => page.evaluate(([text, i]) => {
  const ps = [...document.querySelectorAll('#charter .prose p.editable[data-key]')]
    .filter((p) => !p.classList.contains('gap') && p.textContent.trim().length > 5);
  const p = ps[i];
  if (!p) return 'no clause to paste into';
  p.scrollIntoView({ block: 'center' });
  const tn = [...p.childNodes].find((x) => x.nodeType === 3);
  if (!tn) return 'the clause holds no text node';
  const r = document.createRange();
  r.setStart(tn, tn.length); r.collapse(true);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  window.__crlfPaste(p, text);
  return null;
}, [WINDOWS, n]);

/** Select a run of two clauses and paste over the pair. */
const pasteOverRun = () => page.evaluate((text) => {
  const ps = [...document.querySelectorAll('#charter .prose p.editable[data-key]')]
    .filter((p) => !p.classList.contains('gap') && p.textContent.trim().length > 5);
  const a = ps[0], b = ps[1];
  if (!a || !b) return 'no two clauses to select across';
  a.scrollIntoView({ block: 'center' });
  const ta = [...a.childNodes].find((x) => x.nodeType === 3);
  const tb = [...b.childNodes].find((x) => x.nodeType === 3);
  if (!ta || !tb) return 'a clause in the run holds no text node';
  const r = document.createRange();
  r.setStart(ta, 0); r.setEnd(tb, tb.length);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  window.__crlfPaste(b, text);
  return null;
}, WINDOWS);

/** What the draft holds, as lines: the split the hunk is built with. */
const linesOf = (sites) => sites.flatMap((t) => t.split('\n'));

const check = (what, d) => {
  if (!d) { fails.push(`${what}: the paste opened no draft`); return; }
  const lines = linesOf(d.sites);
  const cr = lines.filter((l) => l.includes('\r'));
  if (cr.length) {
    fails.push(`${what}: ${cr.length} of ${lines.length} draft line(s) end in a carriage return — ` +
      JSON.stringify(cr.map((l) => l.slice(-24))));
    return;
  }
  // the first pasted line joins whatever the caret stood after, so the text is
  // asked whole rather than line by line
  const whole = d.sites.join('\n');
  const lost = WANT.filter((w) => !whole.includes(w));
  if (lost.length) {
    fails.push(`${what}: the paste lost ${JSON.stringify(lost)} — the draft reads ${JSON.stringify(lines)}`);
    return;
  }
  say(`${what.padEnd(10)}· ${lines.length} lines, none ending in a carriage return, all three pasted lines stand`);
};

const inClause = await pasteIntoClause(1);
if (inClause) die(`a clause: ${inClause}`);
await T(700);
check('clause', await draftNow());
await discard();

const overRun = await pasteOverRun();
if (overRun) die(`a run: ${overRun}`);
await T(700);
check('run', await draftNow());
await discard();

await browser.close();
srv.close();
if (fails.length) {
  say('');
  for (const f of fails) say('FAIL: ' + f);
  process.exit(1);
}
say('');
say('crlf-paste · green: a Windows paste reaches a lane with its endings normalised, by both roads');
