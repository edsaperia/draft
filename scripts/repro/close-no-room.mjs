/**
 * close-no-room — a card on the one shell closed where the page cannot give
 * its label's room back (Q1560 (3), Ed 2026-09-26: *fix it properly*).
 *
 *   node scripts/repro/close-no-room.mjs [--fast] [--width=390] [--cpu=4] [--runs=5] [--keys=title,slug,chamber]
 *
 * Serves design/ itself. For each key, on `?fixture=session&band=1` with
 * every section unfolded: scroll to 0, press the card's tab (the page-top
 * open: the page scrolls down by the label's room), put the scroll back
 * under it to less than the room, press the tab again to close, wait for the
 * collapse to finish, and read where the scroll and the clause's first line
 * stand. Then open it again and watch the scroll for a second. `--fast` is
 * card-audit's own timing instead — the close pressed 300 ms after the
 * page-top open, no scroll between — which with `--cpu=4` is the
 * deterministic reproduction: the close lands while the opening is still
 * settling, so the page cannot give the whole room back.
 *
 * What it asserts, each a sentence of SURFACE F-rules / answers Part 6.5:
 *   - **the close gives back only what the page can**: after it, the scroll
 *     is 0 (the room given back as far as it goes), never pushed down again
 *     to hold the clause on the glass — holding it there is what pushes the
 *     content above up, the opposite of giving the room back;
 *   - **the clause lands at home**: its first line stands where it stood
 *     before the card opened, within 1px;
 *   - **nothing scrolls afterwards**: a card reopened right after the close
 *     is never moved by a late correction from the close before it (the
 *     card-audit flake at 390 on CI: *the first line moves 0, -32px on
 *     screen … the ink above moves 7px (the room says 39)*).
 *
 * Red before the fix at 390 on 🪶: the close left the page at scroll 32 with
 * the clause 32px above its home. `--cpu=` throttles the CPU the way a CI
 * runner is slow, which is what let the late correction land inside the next
 * reading.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const WIDTH = +arg('width', 390);
const CPU = +arg('cpu', 1);
const RUNS = +arg('runs', 1);
const KEYS = arg('keys', 'title,slug,chamber,rate').split(',');
// `--fast`: card-audit's own timing — the close pressed 300 ms after the
// page-top open, while the opening may still be settling, with no scroll in
// between; the default waits the open out and scrolls back to 0 first
const FAST = process.argv.includes('--fast');
const DESIGN = join(resolve(fileURLToPath(new URL('../..', import.meta.url))), 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const srv = createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  try { const b = await readFile(join(DESIGN, p)); res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'text/plain' }); res.end(b); } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => srv.listen(0, r));
const base = 'http://127.0.0.1:' + srv.address().port;
const browser = await chromium.launch();
const fails = [];
for (let run = 1; run <= RUNS; run++) {
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: WIDTH < 900 ? 844 : 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  if (CPU > 1) { const c = await ctx.newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: CPU }); }
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(base + '/session-view.html?fixture=session&band=1');
  await page.waitForSelector('#rail .qitem', { state: 'attached', timeout: 30000 });
  await page.waitForTimeout(600);
  for (let i = 0; i < 8; i++) {
    const n = await page.evaluate(() => { const t = [...document.querySelectorAll('#band .sectoggle')].find((b) => b.getAttribute('aria-expanded') === 'false'); if (!t) return 0; t.click(); return 1; });
    if (!n) break;
    await page.waitForTimeout(300);
  }
  for (const k of KEYS) {
    const r = await page.evaluate(async ([k, OPEN_MS, TO_TOP]) => {
      const sleep = (ms) => new Promise((x) => setTimeout(x, ms));
      const q = (s) => document.querySelector(s);
      const para = () => q('#band .cpara:not(.open)[data-para="' + k + '"] .cpv');
      const lineTop = (el) => (el ? window.CARD_SHELL.lineTop(el) : null);
      const tab = () => q('#band .cpara:not(.open)[data-para="' + k + '"] [data-tab="' + k + '"]');
      if (!tab()) return { skip: 'no tab' };
      // the page top: the clause as high as the page lets it stand
      scrollTo(0, 0); await sleep(250);
      const home = lineTop(para());
      tab().click(); await sleep(OPEN_MS);
      const card = q('.setupcard[data-setupcard="' + k + '"]');
      if (!card) return { skip: 'did not open' };
      const room = window.CARD_SHELL.roomOf(card) || 0;
      const openedAt = scrollY;
      // put the page back under the open card to less than its room, as a
      // reader scrolling up to the top would
      if (TO_TOP) { scrollTo(0, 0); await sleep(250); }
      const close = card.querySelector('.chipcol [data-tab="' + k + '"]') || card.querySelector('.chipcol .achip');
      close.click(); await sleep(1400);
      const after = { sy: Math.round(scrollY), line: lineTop(para()) };
      // reopen at once and watch the scroll: nothing may move it afterwards
      const sy0 = scrollY;
      const moves = [];
      const t2 = tab();
      if (t2) {
        t2.click();
        const settled = scrollY;
        await sleep(60);
        const base2 = scrollY;
        for (let i = 0; i < 20; i++) { await sleep(60); if (Math.abs(scrollY - base2) > 0.5) moves.push(Math.round(scrollY - base2)); }
        const c2 = q('.setupcard[data-setupcard="' + k + '"]');
        const x = c2 && (c2.querySelector('.chipcol [data-tab="' + k + '"]') || c2.querySelector('.chipcol .achip'));
        if (x) { x.click(); await sleep(1400); }
        return { room, openedAt, home, after, sy0, lateMoves: moves, settled };
      }
      return { room, openedAt, home, after, sy0, lateMoves: moves };
    }, [k, FAST ? 300 : 1400, !FAST]);
    if (r.skip) { console.log('  ' + k + ': skipped — ' + r.skip); continue; }
    const landed = r.home != null && r.after.line != null ? Math.round((r.after.line - r.home) * 100) / 100 : null;
    const ok = r.after.sy === 0 && landed !== null && Math.abs(landed) <= 1 && !r.lateMoves.length;
    const line = 'run ' + run + ' · ' + k + ' · room ' + Math.round(r.room) + ' · after the close: scroll ' + r.after.sy +
      ', the clause ' + (landed === null ? 'unread' : (landed >= 0 ? '+' : '') + landed + 'px from home') +
      ' · late scrolls after the reopen ' + JSON.stringify(r.lateMoves);
    console.log((ok ? '  ok   ' : '  FAIL ') + line);
    if (!ok) fails.push(line);
  }
  if (errs.length) { console.log('  FAIL page errors ' + errs.join(' | ')); fails.push('page errors'); }
  await ctx.close();
}
await browser.close(); srv.close();
console.log(fails.length ? '✗ ' + fails.length + ' failed' : '✓ a close with no room to give back leaves the clause at home and the page still');
process.exit(fails.length ? 1 : 0);
