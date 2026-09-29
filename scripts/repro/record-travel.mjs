#!/usr/bin/env node
/**
 * record-travel — **the card you are reading when its race is decided travels
 * to its record** (Q1565, Ed 2026-09-28 and 2026-09-29; Q1541 stage 7).
 *
 *   node scripts/repro/record-travel.mjs
 *
 * Serves `design/` itself and drives the session fixture. A live card is
 * opened, given a race id as the live path's items carry one, and then the
 * race is decided the way a poll decides it — `SESSION.setData` with the item
 * gone and its record (`rec:<race>`) arrived. Three cases, each opening the
 * record in the card's place **already read** (1565 (b), Ed 2026-09-29 17:27
 * UTC, ruling (a): a record you watched decide is read at the travel):
 *
 *   pass  — a wording carried: the ✔ record;
 *   fail  — the text held (1565 (a)): the ✖ record;
 *   mine  — your own proposal passed: its ✔ record.
 *
 * Before stage 7 each card closed by itself on the swap and the record stood
 * unread behind its tab. Joins the sprint tier from its first day (Q1547).
 * Exit 0 when every check passes, 1 on a defect.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, sep, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DESIGN = join(resolve(fileURLToPath(new URL('../..', import.meta.url))), 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = normalize(join(DESIGN, path === '/' ? '/session-view.html' : path));
    if (!file.startsWith(DESIGN + sep) && file !== DESIGN) { res.writeHead(403); return res.end(); }
    const s = await stat(file);
    const body = await readFile(s.isDirectory() ? join(file, 'index.html') : file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const BASE = 'http://127.0.0.1:' + server.address().port;

const fails = [];
const check = (what, ok, detail = '') => {
  console.log(`${ok ? 'PASS · ' : 'FAIL · '}${what}${detail ? ` · ${detail}` : ''}`);
  if (!ok) fails.push(what);
};

const browser = await chromium.launch();
async function travel(name, { kind, carried, mine }) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + '/session-view.html?fixture=session');
  await page.waitForFunction(() => !!(window.SESSION && window.SESSION.SUGGS && document.querySelector('#rail li')), null, { timeout: 20000 });
  await page.waitForTimeout(600);
  const r = await page.evaluate(async ({ kind, carried, mine }) => {
    const S = window.SESSION;
    const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
    S.smoothScrollBy = (dy, done) => { window.scrollBy(0, dy); if (done) done(); };
    const it = S.SUGGS.find((g) => (kind === 'mine' ? g.kind === 'draft' && g.mine && !g.unproposed
      : g.kind === 'quick' && g.state !== 'sealed' && !g.isInsert));
    if (!it) return { setup: 'no ' + kind + ' card in the fixture' };
    const race = 'rtravel';
    const cand = 'ctravel';
    // the live path's shape: a judgment item carries its race, a proposal of
    // yours its candidate
    S.setData({ SUGGS: S.SUGGS.map((g) => (g.id === it.id ? Object.assign({}, g, kind === 'mine' ? { candidate: cand } : { raceId: race }) : g)) });
    S.toggle(it.id, true);
    await wait(1400);
    const openBefore = !!document.querySelector('.sugg[data-card="' + it.id + '"]');
    const key = (it.keys || (it.sites && it.sites[0] && it.sites[0].keys) || [])[0];
    const rec = {
      id: 'rec:' + race, kind: 'quick', keys: [key], state: 'sealed', unread: true,
      qLabel: it.qLabel, urgency: 0, pct: 100,
      optionA: 'The text as it stood.', optionB: 'The wording that was proposed.',
      ...(carried ? { won: 'b' } : {}),
      ...(mine ? { mineIn: [cand] } : { verdict: 'preferred this wording' }),
      decided: { outcome: carried ? 'adopted' : 'retired — the current text stood', when: 'just now', p: carried ? 0.8 : 0.3, judges: 5 },
    };
    S.setData({ SUGGS: S.SUGGS.filter((g) => g.id !== it.id).concat([rec]) });
    await wait(1200);
    const card = document.querySelector('.sugg[data-card="' + rec.id + '"]');
    return {
      from: it.id, openBefore,
      opened: !!card,
      oldGone: !document.querySelector('.sugg[data-card="' + it.id + '"]'),
      label: card ? (card.querySelector('.glab') || {}).textContent : null,
      ok: !!(card && card.querySelector('[data-slot="row"] [data-seen]')),
      read: [...S.readSeals].includes(rec.id),
    };
  }, { kind, carried, mine });
  if (r.setup) { check(name + ': set-up', false, r.setup); await page.close(); return; }
  check(name + ': the card was open on ' + r.from, r.openBefore);
  check(name + ': it became its record, in place', r.opened && r.oldGone, JSON.stringify({ label: r.label }));
  check(name + ': read at the travel, nothing owed on it', r.read && !r.ok, JSON.stringify({ read: r.read, ok: r.ok }));
  check(name + ': the page threw nothing', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

await travel('pass (a wording carried)', { kind: 'quick', carried: true, mine: false });
await travel('fail (1565 (a): the text held)', { kind: 'quick', carried: false, mine: false });
await travel('mine (1565 (b): your own passed)', { kind: 'mine', carried: true, mine: true });

await browser.close();
server.close();
console.log(fails.length ? `\n✗ ${fails.length} failed: ${fails.join('; ')}` : '\n✓ an open card travels to its record');
process.exit(fails.length ? 1 : 0);
