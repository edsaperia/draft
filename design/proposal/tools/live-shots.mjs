/**
 * live-shots.mjs — Q1541 stage 1: the cards only the live path draws, read on
 * a phase-ladder document at each rung and from several seats. Throwaway.
 *
 *   node design/proposal/tools/live-shots.mjs --base=http://127.0.0.1:8177 --width=1600 --height=1000
 *
 * Borrows card-audit's in-page half (`IN_PAGE`) by reading it out of
 * inventory-audit.mjs's source, so a live card is measured exactly as a
 * fixture card is. Writes design/proposal/data/live-<width>.json and crops to
 * design/proposal/shots/current/<key>-live_<rung>_<seat>-<width>.png.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DESIGN = join(resolve(HERE, '..', '..', '..'), 'design');
const SHOTS = join(DESIGN, 'proposal', 'shots', 'current');
const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith('--' + n + '=')); return h ? h.split('=').slice(1).join('=') : d; };
const BASE = arg('base', 'http://127.0.0.1:8177');
const W = +arg('width', 1600); const H = +arg('height', 1000);
const RUNGS = arg('rungs', 'constitution,ready,session,closing,closed').split(',');
const SEED = +arg('seed', 42);
const PER_FAMILY = +arg('per', 3);

const src = await readFile(join(HERE, 'inventory-audit.mjs'), 'utf8');
const a = src.indexOf('const IN_PAGE = () => {');
const b = src.indexOf('\n};', a);
if (a < 0 || b < 0) throw new Error('could not find IN_PAGE in inventory-audit.mjs');
const IN_PAGE_SRC = src.slice(a + 'const IN_PAGE = '.length, b + 3);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: 'en-GB', timezoneId: 'Europe/London' });
await ctx.addInitScript({ content: '(' + IN_PAGE_SRC.replace(/;\s*$/, '') + ')();' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('page error: ' + String(e).slice(0, 200)));
const wait = (ms) => page.waitForTimeout(ms);
const cards = [];
const railDumps = [];
const hashes = new Map();
const safe = (s) => String(s).replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);

const post = async (path, body) => {
  const r = await page.request.post(BASE + path, { data: body, headers: { origin: BASE } });
  return { status: r.status(), json: await r.json().catch(() => null) };
};

async function shoot(m, walk) {
  const r = m.card && m.card.r;
  if (!r) return;
  const pageW = await page.evaluate(() => document.documentElement.scrollWidth);
  const x = Math.max(0, r[0] - 64); const y = Math.max(0, r[1] - 12);
  const w = Math.min(pageW - x, r[2] + (r[0] - x) + 12); const h = Math.min(r[3] + 24, 4000);
  if (w <= 0 || h <= 0) return;
  let buf;
  try { buf = await page.screenshot({ fullPage: true, clip: { x, y, width: w, height: h } }); } catch { return; }
  const hash = createHash('sha1').update(buf).digest('hex');
  if (hashes.has(hash)) { m.shot = hashes.get(hash); m.shotDup = true; return; }
  const name = safe(m.key) + '-' + safe(walk) + '-' + W + '.png';
  await writeFile(join(SHOTS, name), buf);
  hashes.set(hash, name); m.shot = name;
}

const family = (k) => String(k).replace(/[0-9a-f]{8,}/g, 'H').replace(/\d+/g, 'N');

async function readSeat(slug, rung, seat) {
  const walk = 'live_' + rung + '_' + seat;
  await page.goto(BASE + '/d/' + slug);
  try { await page.waitForSelector('#rail .qitem, #band [data-tab]', { timeout: 20000 }); } catch { errors.push(walk + ': page never drew'); return; }
  await page.evaluate(() => { window.scrollTo(0, 0); if (window.SESSION) window.SESSION.smoothScrollBy = (dy, done) => { window.scrollBy(0, dy); if (done) done(); }; });
  await wait(700);
  // the page, the rail, as they stand
  await page.screenshot({ path: join(SHOTS, 'page-' + safe(walk) + '-' + W + '.png') });
  railDumps.push({ walk, rail: await page.evaluate(() => [...document.querySelectorAll('#rail li')].map((li) => ({
    q: li.dataset.q || (li.querySelector('[data-card]') || { dataset: {} }).dataset.card || null,
    text: window.__CA.txt(li), cls: li.className,
    mark: (li.querySelector('[data-char]') || { getAttribute: () => null }).getAttribute('data-char') }))) });
  const keys = await page.evaluate(() => [...new Set([...window.__CA.offered(),
    ...[...document.querySelectorAll('#rail li[data-q]')].map((li) => li.dataset.q)])]);
  const seen = new Set(); const fam = new Map();
  const queue = [...keys];
  const closeAll = () => page.evaluate(() => {
    const m = document.querySelector('.setupcard .chipcol .achip.wmark') || document.querySelector('.setupcard .chipcol .achip');
    if (m) { m.click(); return; }
    const s = document.querySelector('.sugg[data-card]');
    if (s && window.SESSION) { try { window.SESSION.toggle(s.dataset.card, false); } catch (e) { /* */ } }
  });
  while (queue.length) {
    const k = queue.shift();
    if (seen.has(k)) continue;
    seen.add(k);
    const f = family(k);
    if ((fam.get(f) || 0) >= PER_FAMILY) continue;
    const before = await page.evaluate((k) => window.__CA.closedGeo(k), k);
    const opened = await page.evaluate((k) => {
      const q = String(k).replace(/["\\]/g, '\\$&');
      const sel = ['data-card', 'data-tab', 'data-anchor', 'data-q'].map((x) => '[' + x + '="' + q + '"]').join(', ');
      const el = document.querySelector('#rail button[data-q="' + q + '"], #rail button[data-card="' + q + '"]') ||
        document.querySelector('#band [data-tab="' + q + '"], #charter [data-anchor="' + q + '"], #charter [data-tab="' + q + '"]') ||
        document.querySelector(sel);
      if (!el) return false;
      el.click(); return true;
    }, k);
    if (!opened) continue;
    const findSel = () => page.evaluate((k) => {
      const q = String(k).replace(/["\\]/g, '\\$&');
      if (document.querySelector('.sugg[data-card="' + q + '"]')) return '.sugg[data-card="' + q + '"]';
      if (document.querySelector('.setupcard')) return '.setupcard';
      if (document.querySelector('.sugg[data-card]')) return '.sugg[data-card]';
      return null;
    }, k);
    await wait(900);
    let sel = await findSel();
    if (!sel) { await wait(900); sel = await findSel(); }
    if (!sel) {
      await page.evaluate((k) => {
        const q = String(k).replace(/["\\]/g, '\\$&');
        const el = document.querySelector('#rail [data-card="' + q + '"], #rail [data-q="' + q + '"] button, [data-tab="' + q + '"], [data-anchor="' + q + '"]');
        if (el) el.click();
      }, k);
      await wait(1000); sel = await findSel();
    }
    if (!sel) { errors.push(walk + ': ' + k + ' opened nothing'); continue; }
    const m = await page.evaluate((a) => window.__CA.measure(a[0], a[1], a[2]), [sel, k, before]);
    if (!m) { errors.push(walk + ': ' + k + ' measured nothing'); continue; }
    m.walk = walk; m.cardSel = sel;
    await shoot(m, walk);
    cards.push(m);
    fam.set(f, (fam.get(f) || 0) + 1);
    // harvest the open strip's other tabs
    const strip = await page.evaluate(() => [...document.querySelectorAll('.setupcard .chipcol .achip[data-tab], .sugg .chipcol .achip[data-tab], .sugg .chipcol .achip[data-anchor]')]
      .map((el) => el.dataset.tab || el.dataset.anchor).filter(Boolean));
    for (const t of strip) if (!seen.has(t)) queue.push(t);
    await closeAll();
    await wait(250);
  }
}

const seatsFor = (rung, seats) => {
  const members = seats.filter((s) => !s.founder).map((s) => s.id);
  const pick = ['founder', members[0], members[1]].filter(Boolean);
  return rung === 'constitution' ? ['founder', members[0]] : pick;
};

let slug = null;
for (const rung of RUNGS) {
  const res = await post('/api/dev/ladder', slug ? { slug, to: rung } : { to: rung, seed: SEED });
  if (res.status !== 200) { errors.push('ladder ' + rung + ': ' + res.status + ' ' + JSON.stringify(res.json).slice(0, 200)); break; }
  slug = res.json.slug;
  const seats = res.json.seats || [];
  const man = await page.request.get(BASE + '/api/dev/ladder?slug=' + slug).then((r) => r.json()).catch(() => null);
  railDumps.push({ rung, manifest: man && man.manifest });
  for (const seat of seatsFor(rung, seats)) {
    const r = await post('/api/dev/seat', { slug, member: seat });
    if (r.status !== 200) { errors.push('seat ' + seat + ' at ' + rung + ': ' + r.status); continue; }
    await readSeat(slug, rung, seat === 'founder' ? 'founder' : seat);
  }
  // and the stranger at the door: no cookie for this document
  if (rung === 'session' || rung === 'closed') {
    await ctx.clearCookies();
    await readSeat(slug, rung, 'stranger');
  }
}

await writeFile(join(DESIGN, 'proposal', 'data', 'live-' + W + '.json'), JSON.stringify({ viewport: { w: W, h: H }, slug, cards, railDumps, errors }, null, 1));
console.log(cards.length + ' live cards · ' + [...hashes.values()].length + ' shots · ' + errors.length + ' errors');
for (const e of errors.slice(0, 30)) console.log('  ' + e);
await browser.close();
