/**
 * zone-shots-proto.mjs — Q1541 stage 4: zone-shots.mjs pointed at the
 * prototype, writing to shots/proposed/ under the same names, so a zone's
 * current and proposed crops pair by filename. `--base=` attaches to a
 * running `npm run design` (else it serves design/ itself).
 *
 *   node design/proposal/tools/zone-shots-proto.mjs --width=1600 --height=1000 --base=http://127.0.0.1:8161
 *   node design/proposal/tools/zone-shots-proto.mjs --width=390 --height=844 --base=…
 *
 * Writes design/proposal/shots/proposed/<zone>-<state>-<width>.png and
 * design/proposal/data/zones-proto-<width>.json.
 */
import { createServer } from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DESIGN = join(resolve(fileURLToPath(new URL('../../..', import.meta.url))), 'design');
const SHOTS = join(DESIGN, 'proposal', 'shots', 'proposed');
const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith('--' + n + '=')); return h ? h.slice(n.length + 3) : d; };
const PAGE = '/proposal/proto/session-view.html';
const BASE = arg('base', null);
const W = +arg('width', 1600); const H = +arg('height', 1000);
const NARROW = W <= 900;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain' };

function serve() {
  const s = createServer(async (req, res) => {
    try {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const f = normalize(join(DESIGN, p === '/' ? '/session-view.html' : p));
      if (!f.startsWith(DESIGN + sep)) { res.writeHead(403); return res.end(); }
      const st = await stat(f);
      const body = await readFile(st.isDirectory() ? join(f, 'index.html') : f);
      res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise((ok) => s.listen(0, '127.0.0.1', () => ok(s)));
}
const wait = (page, ms) => page.waitForTimeout(ms);

const server = BASE ? null : await serve();
const base = BASE ? BASE.replace(/\/+$/, '') : 'http://127.0.0.1:' + server.address().port;
{ const { mkdir } = await import('node:fs/promises'); await mkdir(SHOTS, { recursive: true }); }
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: 'en-GB',
  timezoneId: 'Europe/London', reducedMotion: 'reduce', hasTouch: NARROW, isMobile: false });
// the prototype's own *what is not converted* note is furniture today's page does not have: hidden, so the crops compare
await ctx.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
  const s = document.createElement('style'); s.textContent = '#gnote{display:none!important}'; document.head.appendChild(s);
}));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const zones = [];

/** read a zone: its box, its visible text, and a few styles; then crop it */
async function zone(name, state, sel, { viewport = false, maxH = 1600, note = '' } = {}) {
  const info = await page.evaluate(([s, vp]) => {
    const R = (x) => Math.round(x * 100) / 100;
    const el = s ? document.querySelector(s) : null;
    if (s && !el) return null;
    const vis = (n) => { const c = getComputedStyle(n); return c.display !== 'none' && c.visibility !== 'hidden'; };
    const text = (n) => {
      let out = '';
      for (const c of n.childNodes) {
        if (c.nodeType === 3) out += c.nodeValue;
        else if (c.nodeType === 1 && vis(c)) out += (c.getAttribute('data-char') && c.tagName.toLowerCase() === 'svg') ? c.getAttribute('data-char') : text(c) + (/^(DIV|P|LI|H\d|SECTION)$/.test(c.tagName) ? '\n' : '');
      }
      return out;
    };
    if (vp) return { r: [0, R(window.scrollY), innerWidth, innerHeight], text: '', styles: {} };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      r: [R(r.left + scrollX), R(r.top + scrollY), R(r.width), R(r.height)],
      fixed: cs.position === 'fixed' || cs.position === 'sticky',
      text: text(el).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim().slice(0, 3000),
      styles: { bg: cs.backgroundColor, shadow: cs.boxShadow, fontSize: cs.fontSize, fontFamily: cs.fontFamily.split(',')[0],
        padding: cs.padding, radius: cs.borderRadius, border: cs.borderTopWidth + ' ' + cs.borderTopStyle },
      children: el.children.length,
    };
  }, [sel, viewport]);
  if (!info) { zones.push({ zone: name, state, sel, missing: true, note }); return; }
  const file = name + '-' + state + '-' + W + '.png';
  try {
    if (viewport) await page.screenshot({ path: join(SHOTS, file) });
    else {
      const [x, y, w, h] = info.r;
      if (w < 1 || h < 1) { zones.push({ zone: name, state, sel, empty: true, ...info, note }); return; }
      if (info.fixed) {
        const vr = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }, sel);
        await page.screenshot({ path: join(SHOTS, file), clip: { x: Math.max(0, vr[0]), y: Math.max(0, vr[1]), width: Math.min(vr[2], W), height: Math.min(vr[3], H, maxH) } });
      } else {
        await page.screenshot({ path: join(SHOTS, file), fullPage: true,
          clip: { x: Math.max(0, x), y: Math.max(0, y), width: Math.min(w, W - Math.max(0, x)), height: Math.min(h, maxH) } });
      }
    }
    zones.push({ zone: name, state, sel, shot: file, clippedTo: info.r && info.r[3] > maxH ? maxH : null, ...info, note });
  } catch (e) { zones.push({ zone: name, state, sel, error: String(e.message || e), ...info, note }); }
}

const clickIn = (sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el || el.disabled) return false; el.click(); return true; }, sel);
const typeIn = (sel, v) => page.evaluate(([s, v]) => {
  const el = document.querySelector(s); if (!el) return false;
  if (el.isContentEditable) { el.textContent = v; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
  else { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
  return true;
}, [sel, v]);
const top = () => page.evaluate(() => window.scrollTo(0, 0));

// --- the birth -------------------------------------------------------------
await page.goto(base + PAGE);
await page.waitForSelector('#rail .qitem', { timeout: 20000 });
await top(); await wait(page, 400);
await zone('page', 'birth', null, { viewport: true });
await zone('topbar', 'birth', 'header.navbar');
if (!NARROW) await zone('rail', 'birth', 'aside.queue');
await zone('band', 'birth', '#band');
await zone('alphaflag', 'birth', '.alphaflag');
await zone('devswitch', 'birth', '.devswitch');
// through 🪶 📍 📧 to the mail modal and the save
await page.evaluate(() => document.querySelector('[data-tab="title"], [data-card="title"]').click()); await wait(page, 300);
await typeIn('.setupcard [data-titlelane]', 'Hollow Oak Club Charter');
await clickIn('.setupcard [data-confirm]'); await wait(page, 320);
await page.evaluate(() => { const e = document.querySelector('[data-tab="slug"], [data-card="slug"]'); if (e) e.click(); }); await wait(page, 300);
await clickIn('.setupcard [data-confirm]'); await wait(page, 320);
await page.evaluate(() => { const e = document.querySelector('[data-tab="myemail"], [data-card="myemail"]'); if (e) e.click(); }); await wait(page, 300);
await typeIn('.setupcard input[type="email"]', 'ada@example.org');
await clickIn('.setupcard [data-confirm]'); await wait(page, 500);
await zone('mailmodal', 'sent', '#mailmodal', { note: 'the verification mail, off the design system' });
await zone('page', 'mailmodal', null, { viewport: true });
await clickIn('[data-act="clickmail"]'); await wait(page, 800);
await top(); await wait(page, 200);
await zone('page', 'saved', null, { viewport: true });
await zone('topbar', 'saved', 'header.navbar');
await zone('wallets', 'saved', '#wallet');
if (!NARROW) { await zone('rail', 'saved', 'aside.queue'); await zone('toc', 'saved', 'nav.toc'); }
await zone('band', 'saved', '#band');

// --- the settled founding (⏩) ----------------------------------------------
await page.goto(base + PAGE);
await page.waitForSelector('#rail .qitem', { timeout: 20000 });
await clickIn('#devff'); await wait(page, 1200); await top(); await wait(page, 300);
await zone('page', 'settled', null, { viewport: true });
await zone('topbar', 'settled', 'header.navbar');
await zone('wallets', 'settled', '#wallet');
if (!NARROW) { await zone('rail', 'settled', 'aside.queue'); await zone('toc', 'settled', 'nav.toc'); }
await zone('band', 'settled', '#band', { maxH: 2600 });
await zone('ridetab', 'settled', '#ridetab .achip');
// a member's chair, and the stranger's door
for (const seat of ['1', 'stranger']) {
  await page.evaluate((v) => { const s = document.getElementById('devwho'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, seat);
  await wait(page, 800); await top(); await wait(page, 200);
  const st = seat === '1' ? 'member' : 'door';
  await zone('page', st, null, { viewport: true });
  await zone('topbar', st, 'header.navbar');
  if (!NARROW) await zone('rail', st, 'aside.queue');
  await zone('band', st, '#band', { maxH: 2600 });
}

// --- the session fixture ------------------------------------------------------
const session = async (q) => {
  await page.goto(base + PAGE + q);
  await page.waitForFunction(() => !!(window.SESSION && window.SESSION.SUGGS.length && document.querySelector('.qitem')), null, { timeout: 20000 });
  await page.evaluate(() => { window.SESSION.smoothScrollBy = (dy, done) => { window.scrollBy(0, dy); if (done) done(); }; });
  await top(); await wait(page, 500);
};
await session('?fixture=session');
await zone('page', 'session', null, { viewport: true });
await zone('topbar', 'session', 'header.navbar');
await zone('wallets', 'session', '#wallet');
await zone('toc', 'session', 'nav.toc', { maxH: 2400 });
await zone('rail', 'session', 'aside.queue', { maxH: 2400 });
await zone('doc', 'session', '#doc', { maxH: 1800 });
await zone('ridetab', 'session', '#ridetab .achip');
await zone('editdoor', 'session', '#editdoor .btn');
// the page as a whole, scrolled to the band/charter seam: the desk and the two sheets
await page.evaluate(() => { const s = document.querySelector('.docsep'); if (s) s.scrollIntoView({ block: 'center' }); });
await wait(page, 300);
await zone('page', 'sheetbreak', null, { viewport: true, note: 'the desk between the Rules and the Text sheets (.docsep)' });
await top(); await wait(page, 200);
if (NARROW) {
  await zone('sheetbar', 'peek', '.sheetbar');
  await clickIn('.sheetbar'); await wait(page, 500);
  await zone('page', 'sheet-raised', null, { viewport: true });
  await page.mouse.click(W / 2, 40); await wait(page, 400);
  await clickIn('#drawerleft'); await wait(page, 500);
  await zone('page', 'drawer-left', null, { viewport: true });
  await clickIn('#drawerleft'); await wait(page, 300);
  await page.keyboard.press('Escape'); await wait(page, 300);
}
// edit mode
await session('?fixture=session');
const entered = (await clickIn('#editdoor [data-act="edit-door"]')) || (await clickIn('#ridetab .achip[data-tab="text"]'));
await wait(page, 600);
if (entered) {
  await zone('page', 'editmode', null, { viewport: true });
  await zone('proposalrow', 'editmode', '[data-proposalrow]');
  await zone('lanectl', 'editmode', '#prosectl, .lanectl, .lanectls');
}
// the band during the session
await session('?fixture=session&band=1');
await zone('band', 'session', '#band', { maxH: 2600 });
await zone('page', 'session-band', null, { viewport: true });
// the closed page
await session('?fixture=session&closed=1&band=1');
await zone('page', 'closed', null, { viewport: true });
await zone('topbar', 'closed', 'header.navbar');
await zone('wallets', 'closed', '#wallet');
if (!NARROW) { await zone('rail', 'closed', 'aside.queue', { maxH: 2400 }); await zone('toc', 'closed', 'nav.toc', { maxH: 2400 }); }
await zone('band', 'closed', '#band', { maxH: 2600 });
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await wait(page, 400);
await zone('page', 'closed-foot', null, { viewport: true, note: 'the backlog and signatures at the closed page foot' });

await writeFile(join(DESIGN, 'proposal', 'data', 'zones-proto-' + W + '.json'), JSON.stringify({ viewport: { w: W, h: H }, zones, errors }, null, 1));
console.log(zones.length + ' zones · ' + zones.filter((z) => z.shot).length + ' shots · ' + errors.length + ' page errors');
for (const z of zones.filter((z) => !z.shot)) console.log('  no shot: ' + z.zone + '/' + z.state + ' ' + (z.missing ? 'missing' : z.error || 'empty'));
await browser.close(); if (server) server.close();
