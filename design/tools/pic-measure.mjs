/**
 * Where an emoji face sits, measured (Q732, 2026-08-23).
 *
 * The 7px face survived because nothing on any surface had ever worn an
 * emoji: every fixture picture was the empty string, so the only rule that
 * sized one — `span.av.emoji`, at (0,2,1) — was silently outvoted by every
 * three-class contextual rule and nobody could see it. This walks the
 * founding to a settled document with two emoji faces in it and reports, per
 * site, the glyph's computed font-size against its own parent's.
 *
 *   node design/tools/pic-measure.mjs          # the table
 *   node design/tools/pic-measure.mjs --json
 *
 * It asserts nothing on its own: `npm run probe` is what holds the surface
 * still. This is the instrument for reading a change to the avatar rules.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DESIGN = join(resolve(fileURLToPath(new URL('../..', import.meta.url))), 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const AS_JSON = process.argv.includes('--json');

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
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(`http://127.0.0.1:${port}/session-view.html`, { waitUntil: 'networkidle' });

/* The founding, far enough to have a face on every site: the birth, the
   name, an emoji picture, then ⏩ for the membership and the Founded line.
   Driven the setup-probe's way — synthetic events through public DOM — since
   these are the same controls and the same order it walks. */
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
  // a commit closes its card first (`closeThen`), so each step has to outlast
  // one collapse before the next card exists to be opened
  await page.waitForTimeout(420);
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
await tab('grant-pen');
await click('.setupcard [data-ok]');
await tab('chamber');
await click('.setupcard [data-set="chamber"][data-val="closed"]');
await click('.setupcard [data-confirm]');
await tab('policy');
await click('.setupcard [data-set="joinBy"][data-val="invite"]');
await click('.setupcard [data-confirm]');
await tab('hat');
await click('.setupcard [data-set="hatPick"][data-val="member"]');
await click('.setupcard [data-confirm]');
await tab('myname');
await type('.setupcard input[data-txt="myname"]', 'Ada Lovell');
await click('.setupcard [data-confirm]');
await tab('mypic');
await type('.setupcard [data-emojisearch]', 'fox');
await click('.setupcard .avopt[data-pic="e🦊"]');
await click('.setupcard [data-confirm]');
await click('#devff');
await page.waitForTimeout(400);

/* The inline sites, and the one place a glyph is deliberately not text-sized:
   the navbar's `me` sets the topbar's height (the sockets are 24px because it
   is 26), so it takes an explicit size rather than the 13.3px of the bar. */
const SITES = [
  ['the Founded line', '.cpv.founded', true],
  ['a member row', '.memrow', true],
  ['the members list', '.memlist .memrow', true],
  ['the invitations list', '.rperson', true],
  ['a speaker', '.speaker', true],
  ['the navbar me', '#mebtn', false],
];

const rows = await page.evaluate((sites) => {
  const px = (el, prop) => parseFloat(getComputedStyle(el)[prop]);
  const out = [];
  for (const [label, sel, inherits] of sites) {
    document.querySelectorAll(sel).forEach((host) => {
      const g = host.querySelector('.emojiface');
      if (!g) return;
      const parent = g.parentElement;
      const r = g.getBoundingClientRect();
      const same = Math.abs(px(g, 'fontSize') - px(parent, 'fontSize')) < 0.01;
      out.push({
        site: label,
        glyph: g.textContent,
        fontSize: px(g, 'fontSize'),
        parentFontSize: px(parent, 'fontSize'),
        matches: inherits ? same : null,
        stated: !inherits,
        w: +r.width.toFixed(2), h: +r.height.toFixed(2),
        overflow: getComputedStyle(g).overflow,
      });
    });
  }
  // and a disc beside them, so the two treatments can be compared
  const disc = document.querySelector('.memrow .av') || document.querySelector('.av');
  if (disc) {
    const r = disc.getBoundingClientRect();
    out.push({ site: 'a disc, for comparison', glyph: disc.className,
      fontSize: px(disc, 'fontSize'), parentFontSize: px(disc.parentElement, 'fontSize'),
      matches: null, w: +r.width.toFixed(2), h: +r.height.toFixed(2),
      overflow: getComputedStyle(disc).overflow });
  }
  return out;
}, SITES);

await browser.close();
srv.close();

if (AS_JSON) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  for (const r of rows) {
    const verdict = r.stated ? '  · a stated size, by design'
      : r.matches === null ? ''
        : r.matches ? '  ✔ sized like its text' : '  ✖ NOT its parent size';
    console.log(`${r.site.padEnd(24)} ${String(r.glyph).slice(0, 18).padEnd(20)} ` +
      `${String(r.fontSize).padStart(6)}px  parent ${String(r.parentFontSize).padStart(6)}px  ` +
      `box ${r.w}×${r.h}${verdict}`);
  }
  const bad = rows.filter((r) => r.matches === false);
  console.log(bad.length ? `\n${bad.length} site(s) do not take their own text's size` : '\nevery emoji face is the size of the text it stands in');
}
