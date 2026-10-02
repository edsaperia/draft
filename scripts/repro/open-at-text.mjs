#!/usr/bin/env node
/**
 * open-at-text — **the page opens at the Text, the Rules a page above** (issue #197; Ed,
 * 2026-10-02: *when the page opens, it aligns near the top of The Text page, and people could
 * just scroll upwards*), behind `?rules=below`. SURFACE M26.
 *
 *   PORT=8297 DRAFT_BASE_URL=http://127.0.0.1:8297 DRAFT_DATA_DIR=<fresh> \
 *     DRAFT_DEMO_KEY=walk DRAFT_DEMO_STUB=1 npm run server
 *   node scripts/repro/open-at-text.mjs http://127.0.0.1:8297 [--demo=<base>] [--shots=<dir>]
 *
 * A dev server (the ladder) is the base; `--demo=<base>` names a server whose demo is built (the
 * same one will do); the fixture is served from design/ by the walk itself. At 1600×1000 and
 * 390×844 it asserts:
 *
 *   at text     with the flag, past 🍾 — the demo's stranger and visitor, the ladder's member at
 *               `session`, the closed ladder document, the fixture and the closed fixture — the
 *               Text sheet's top stands `--sheet-margin` under the bar (±1px), the Rules' last
 *               line is above the window, and the page is still there after a poll;
 *   at top      without the flag the same pages open at the top; with it, the ladder at `ready`
 *               (before 🍾) still does, and so do an address with a fragment and the demo's
 *               `?try=1`, which opens 👋;
 *   runway      the read-mode runway is tall enough for any Text, however short, to reach the
 *               line (issue #197 case 4): `#runway` ≥ the window less the bar and the margin;
 *   released    a wheel ends the pin, and the next poll leaves the reader where they went;
 *   reload      on the live path, where nothing restores the place, a reload opens at the Text
 *               again; on the fixture, where the browser restores it, the restored place stands.
 *
 * Exit 0 only if all pass; 1 on a failure, 2 on a broken set-up.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { sleep } from '../lib/walk.mjs';

const BASE = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2]
  : process.env.DRAFT_BASE_URL || 'http://127.0.0.1:8297').replace(/\/$/, '');
const opt = (name) => { const a = process.argv.find((x) => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : null; };
const DEMO = opt('demo') ? opt('demo').replace(/\/$/, '') : null;
const SHOTS = opt('shots');
const say = (s) => console.log(s);
const fails = [];
const check = (name, ok, detail) => {
  say((ok ? 'PASS · ' : 'FAIL · ') + name + (ok ? '' : ' · ' + detail));
  if (!ok) fails.push(name);
};
const die = (s) => { say('SET-UP · ' + s); process.exit(2); };

/* ---- the fixture, served from design/ ------------------------------------ */
const DESIGN = join(resolve(fileURLToPath(new URL('../..', import.meta.url))), 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.woff2': 'font/woff2' };
const srv = await new Promise((ok) => {
  const s = createServer(async (req, res) => {
    const p = join(DESIGN, decodeURIComponent(req.url.split('?')[0].split('#')[0]));
    try {
      const body = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404).end('no'); }
  });
  s.listen(0, '127.0.0.1', () => ok(s));
});
const FIX = `http://127.0.0.1:${srv.address().port}/session-view.html?fixture=session&band=1`;

/* ---- the ladder: a document before 🍾, one in session, one closed --------- */
const post = async (path, body) => {
  const r = await fetch(BASE + path, { method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE }, body: JSON.stringify(body) });
  return { cookie: (r.headers.get('set-cookie') ?? '').split(';')[0], json: await r.json().catch(() => ({})) };
};
const health = await fetch(BASE + '/healthz').then((r) => r.json()).catch(() => null);
if (!health || health.devMail !== true) die('not a dev server: ' + BASE);
const ladder = async (to, who) => {
  const l = await post('/api/dev/ladder', { to });
  const seat = (l.json.seats || []).find((m) => (who === 'founder' ? m.founder : !m.founder));
  if (!l.json.slug || !seat) die(`the ladder seated nobody at ${to}: ` + JSON.stringify(l.json).slice(0, 200));
  const s = await post('/api/dev/seat', { slug: l.json.slug, member: seat.id });
  if (!s.cookie) die('the seat switch gave no cookie');
  const [name, value] = s.cookie.split('=');
  return { url: BASE + '/d/' + l.json.slug, cookie: { name, value, url: BASE } };
};
const READY = await ladder('ready', 'founder');
const SESSION_DOC = await ladder('session', 'member');
const CLOSED = await ladder('closed', 'member');
say(`ladder ${READY.url} (ready) · ${SESSION_DOC.url} (session) · ${CLOSED.url} (closed)` + (DEMO ? ` · demo ${DEMO}` : ''));

/* ---- the measure ----------------------------------------------------------- */
/** where the page stands: the bar, the Text sheet's top, the Rules' last line, all on the glass */
const measure = (page) => page.evaluate(() => {
  const root = getComputedStyle(document.documentElement);
  const nav = parseFloat(root.getPropertyValue('--nav-h')) || 58;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--sheet-margin)';
  document.body.appendChild(probe);
  const margin = probe.getBoundingClientRect().width;
  probe.remove();
  const sep = document.querySelector('.cpara.docsep');
  // the Rules' last line: the last block above the break that has a box
  let last = sep && sep.previousElementSibling;
  while (last && !last.getClientRects().length) last = last.previousElementSibling;
  const runway = document.getElementById('runway');
  return {
    y: Math.round(scrollY), nav, margin, h: innerHeight,
    text: sep ? Math.round(sep.getBoundingClientRect().bottom * 10) / 10 : null,
    rulesLast: last ? Math.round(last.getBoundingClientRect().bottom) : null,
    runway: runway ? runway.offsetHeight : null,
    begun: document.getElementById('doc')?.classList.contains('begun') ?? false,
    pin: window.PAPER && window.PAPER.pinState ? window.PAPER.pinState() : 'none',
    hello: !!document.querySelector('.gshell'),
  };
});
const atText = (m) => m.text != null && Math.abs(m.text - (m.nav + m.margin)) <= 1 && m.rulesLast != null && m.rulesLast <= m.nav;
const show = (m) => JSON.stringify(m);

const browser = await chromium.launch();
async function seatPage(w, h, cookie) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  if (cookie) await ctx.addCookies([cookie]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fails.push('page error: ' + e.message));
  return { ctx, page };
}
const SETTLE = 3500;
async function opens(tag, url, want, { w, h, cookie, poll = false, shot = null } = {}) {
  const { ctx, page } = await seatPage(w, h, cookie);
  await page.goto(url);
  await sleep(SETTLE);
  const m = await measure(page);
  if (want === 'text') {
    check(`${tag} · opens at the Text, the Rules above`, atText(m), show(m));
    if (poll) {
      await sleep(4500);
      const n = await measure(page);
      check(`${tag} · still at the Text after a poll`, atText(n), show(n));
    }
  } else {
    check(`${tag} · opens at the top`, m.y === 0 && m.pin !== 'pinned', show(m));
  }
  if (SHOTS && shot) await page.screenshot({ path: join(SHOTS, shot) });
  await ctx.close();
  return m;
}

const flag = (u) => u + (u.includes('?') ? '&' : '?') + 'rules=below';
for (const [w, h] of [[1600, 1000], [390, 844]]) {
  const at = { w, h };
  say(`\n— ${w}×${h}`);
  // the fixture
  await opens(`${w} fixture`, flag(FIX), 'text', at);
  await opens(`${w} fixture, no flag`, FIX, 'top', at);
  await opens(`${w} fixture, closed`, flag(FIX + '&closed=1'), 'text', at);
  await opens(`${w} fixture, a fragment`, flag(FIX) + '#dochead', 'top', at);
  // the ladder
  await opens(`${w} ladder ready (before 🍾), founder`, flag(READY.url), 'top', { ...at, cookie: READY.cookie });
  const s = await opens(`${w} ladder session, member`, flag(SESSION_DOC.url), 'text', { ...at, cookie: SESSION_DOC.cookie, poll: true });
  check(`${w} ladder session · the runway lets any Text reach the line`,
    s.runway != null && s.runway >= s.h - s.nav - s.margin, show(s));
  await opens(`${w} ladder session, no flag`, SESSION_DOC.url, 'top', { ...at, cookie: SESSION_DOC.cookie });
  await opens(`${w} ladder closed, member`, flag(CLOSED.url), 'text', { ...at, cookie: CLOSED.cookie });

  // released by the reader, then a reload: nothing restores the live place, so the Text again
  {
    const { ctx, page } = await seatPage(w, h, SESSION_DOC.cookie);
    await page.goto(flag(SESSION_DOC.url));
    await sleep(SETTLE);
    await page.mouse.move(w / 2, h / 2);
    await page.mouse.wheel(0, -300);
    await sleep(600);
    const a = await measure(page);
    await sleep(4500);
    const b = await measure(page);
    check(`${w} live · a wheel releases the pin, and a poll leaves the reader there`,
      a.pin === 'released' && !atText(a) && Math.abs(b.y - a.y) <= 1, show(a) + ' then ' + show(b));
    await page.reload();
    await sleep(SETTLE);
    const r = await measure(page);
    check(`${w} live · a reload opens at the Text (nothing restores the place)`, atText(r), show(r));
    await ctx.close();
  }
  // the fixture's reload: the browser restores the place, and that place stands
  {
    const { ctx, page } = await seatPage(w, h);
    await page.goto(flag(FIX));
    await sleep(SETTLE);
    await page.mouse.move(w / 2, h / 2);
    await page.mouse.wheel(0, 2000);
    await sleep(600);
    const a = await measure(page);
    await page.reload();
    await sleep(SETTLE);
    const r = await measure(page);
    check(`${w} fixture · a reload keeps the browser's restored place`, Math.abs(r.y - a.y) <= 2 && !atText(r), show(a) + ' then ' + show(r));
    await ctx.close();
  }

  // the demo: a stranger, a visitor, the QR's ?try=1
  if (DEMO) {
    await opens(`${w} demo stranger`, flag(DEMO + '/d/demo'), 'text', { ...at, poll: true, shot: `after-stranger-${w}.png` });
    await opens(`${w} demo stranger, no flag`, DEMO + '/d/demo', 'top', { ...at, shot: `before-stranger-${w}.png` });
    const { ctx, page } = await seatPage(w, h);
    await page.goto(flag(DEMO + '/d/demo?try=1'));
    await page.waitForSelector('[data-strtry]', { timeout: 15000 }).catch(() => null);
    await sleep(800);
    const t = await measure(page);
    check(`${w} demo ?try=1 · 👋 open, the page at the top`, t.y === 0 && t.pin !== 'pinned' && t.hello, show(t));
    await page.locator('[data-strtry]').first().click();
    await sleep(4000);
    await page.goto(flag(DEMO + '/d/demo'));
    await sleep(SETTLE);
    const v = await measure(page);
    check(`${w} demo visitor · opens at the Text, the Rules above`, atText(v), show(v));
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `after-visitor-${w}.png`) });
    await page.goto(DEMO + '/d/demo');
    await sleep(SETTLE);
    const nv = await measure(page);
    check(`${w} demo visitor, no flag · opens at the top`, nv.y === 0, show(nv));
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `before-visitor-${w}.png`) });
    await ctx.close();
  }
}

await browser.close();
srv.close();
if (fails.length) { say(`\n✗ ${fails.length} failed:\n   ${fails.join('\n   ')}`); process.exit(1); }
say('\n✓ the page opens at the Text');
