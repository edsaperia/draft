/**
 * The uploader's refusals, said out loud (2026-09-17).
 *
 * `wirePicDrop`'s `refuse` writes into a `.picnote` inside the drop box, and
 * for as long as nothing rendered that element every refused file closed the
 * file dialog and changed nothing on screen. This walks the founding to 🖼️,
 * opens *Upload an image*, hands the input three files a member could
 * plausibly choose, and asserts the box says something about each — then that
 * a picture which lands, and choosing another block, clear it again.
 * `node design/tools/picture-walk.mjs`; exit 1 on a failure. It needs no
 * server of its own — `design/` is static, served here as card-audit does.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DESIGN = join(resolve(fileURLToPath(new URL('../..', import.meta.url))), 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.woff2': 'font/woff2' };

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
const num = (f, d) => Number((process.argv.find((a) => a.startsWith('--' + f + '=')) || '').split('=')[1] || d);
const page = await browser.newPage({ viewport: { width: num('width', 1600), height: num('height', 1000) } });
const fails = [];
const say = (s) => console.log(s);
page.on('pageerror', (e) => fails.push('page error: ' + e.message));

await page.goto(`http://127.0.0.1:${port}/session-view.html`, { waitUntil: 'networkidle' });

// Driven the setup-probe's way — synthetic events through public DOM — since
// these are the same controls in the same order it walks (pic-measure.mjs).
const step = async (kind, sel, text) => {
  const err = await page.evaluate(([k, s, t]) => {
    const pick = (q) => document.querySelector(q);
    const el = k === 'tab'
      ? (pick('#rail [data-card="' + s + '"]') || pick('#rail [data-tab="' + s + '"]') ||
         pick('#doc [data-card="' + s + '"]') || pick('#doc [data-tab="' + s + '"]'))
      : pick(s);
    if (!el) return 'no such target: ' + s;
    if (k === 'type') {
      if ('value' in el && el.tagName !== 'DIV' && el.tagName !== 'SPAN') {
        el.value = t;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        el.textContent = t;
        el.dispatchEvent(new InputEvent('input', { bubbles: true }));
      }
      return null;
    }
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return null;
  }, [kind, sel, text]);
  if (err) throw new Error(err);
  await page.waitForTimeout(420);          // a commit closes its card first
};
const tab = (k) => step('tab', k);
const click = (s) => step('click', s);
const type = (s, t) => step('type', s, t);

await tab('title');
await type('.setupcard [data-titlelane]', 'Hollow Oak Club Charter');
await click('.setupcard [data-confirm]');
await tab('slug');
await click('.setupcard [data-confirm]');
await tab('myemail');
await type('.setupcard input[type="email"]', 'ada@example.org');
await click('.setupcard [data-confirm]');
await click('[data-act="clickmail"]');
await tab('mypic');
await click('.setupcard [data-set="picPick"][data-val="upload"]');

const noteNow = () => page.evaluate(() => {
  const n = document.querySelector('.setupcard .picdrop .picnote');
  return n === null ? null : n.textContent;
});
const hand = async (name, mimeType, buffer) => {
  await page.setInputFiles('.setupcard .picdrop input[data-picfile]', { name, mimeType, buffer });
  await page.waitForTimeout(500);
  return noteNow();
};
const is = (label, ok, shown) => {
  say(`  ${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(26)} ${shown}`);
  if (!ok) fails.push(`${label} — ${shown}`);
};
// a refused file has to say something; one that lands has to say nothing
const check = (label, got, want) => is(label,
  want === '' ? got === '' : typeof got === 'string' && got.length > 0, 'note ' + JSON.stringify(got));

if ((await noteNow()) === null) fails.push('no .picnote in the drop box — every refusal is silent again');
say('🖼️ Upload an image');
// an empty note must cost the box nothing: the drop zone at rest, measured
// against itself with the note lifted straight back out of the DOM
const box = await page.evaluate(() => {
  const z = document.querySelector('.setupcard .picdrop'), n = z.querySelector('.picnote');
  const r = (b) => Math.round(b.height) + '×' + Math.round(b.width);
  const a = r(z.getBoundingClientRect()); n.remove();
  const b = r(z.getBoundingClientRect()); z.appendChild(n);
  return [a, b];
});
is('an empty note costs nothing', box[0] === box[1], `box ${box[0]} → ${box[1]} without it`);
check('a file that is not one', await hand('notes.txt', 'text/plain', Buffer.from('dear members')), 'said');
check('a text file named .png', await hand('cat.png', 'image/png', Buffer.from('not a picture at all')), 'said');
check('25 MB', await hand('huge.png', 'image/png', Buffer.alloc(25 * 1024 * 1024, 7)), 'said');
// …and a said refusal stays inside the dashed box, at a phone's width too
const over = await page.evaluate(() => {
  const z = document.querySelector('.setupcard .picdrop');
  return [z.scrollWidth, z.clientWidth];
});
is('the refusal stays in the box', over[0] <= over[1], `scroll ${over[0]} within ${over[1]}`);
// the smallest real PNG: 1×1, transparent
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
check('a picture that lands', await hand('dot.png', 'image/png', PNG), '');
// and the refusal does not outlive the block it was said in
await hand('cat.png', 'image/png', Buffer.from('not a picture at all'));
await click('.setupcard [data-set="picPick"][data-val="anon"]');
await click('.setupcard [data-set="picPick"][data-val="upload"]');
check('after Anonymous and back', await noteNow(), '');

await browser.close();
srv.close();
if (fails.length) { console.log('\nFAIL\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('\nok · the uploader says why it refused a file');
