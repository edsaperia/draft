#!/usr/bin/env node
/**
 * pile-lift — **an open rail entry with cards beneath lifts as one stack** (issue #190, SURFACE M20;
 * Ed 2026-10-02 on /demo: *visually the whole stack should lift when it's active, not just the top card*).
 *
 *   node scripts/repro/pile-lift.mjs [--width=1600]
 *
 * The Hollow Oak fixture off the file system, which carries `queue-card-stack`s (`beneath`). Each piled
 * entry is opened in turn, and:
 *   - the open step (`--shadow-xl`) is cast by one box, and that box is the whole stack — the top card's
 *     left, width and top, its height the card's plus 3px an edge — never the top card's alone;
 *   - every edge moves with the top card: the same edges, at the same offsets under the same box, open
 *     as closed (min(beneath, 5) of them, Q1462);
 *   - the lift is a transition on the stack (`settleLift`'s paint-at-rest, then lift);
 * and, closed, nothing casts the open step and the top card keeps its resting shadow over its edges.
 * Exit 0 on a pass, 1 on the defect, 2 on a set-up that never got there.
 */
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const width = Number((process.argv.find((a) => a.startsWith('--width=')) || '--width=1600').split('=')[1]);
const fails = [];
const say = (s) => console.log(s);
const check = (what, ok, detail = '') => { say(`${ok ? 'PASS' : 'FAIL'} · ${what}${detail ? ' · ' + detail : ''}`); if (!ok) fails.push(what); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 1000 } });
page.on('pageerror', (e) => say('pageerror: ' + e.message));
await page.goto(pathToFileURL(resolve('design/session-view.html')).href + '?fixture=session');
await page.waitForFunction(() => window.SESSION && document.querySelector('#rail .qitem'), null, { timeout: 30000 })
  .catch(() => { say('SET-UP · the fixture never drew'); process.exit(2); });
await page.waitForTimeout(800);

// the stack as drawn: who casts the open step, the top card's box, its edges (no blur, no spread)
const READ = (q) => {
  const layers = (s) => {
    const out = []; let depth = 0, cur = '';
    for (const ch of s) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out.filter((l) => l && l !== 'none');
  };
  const probe = document.createElement('div');
  document.body.appendChild(probe);
  const shadow = (v) => { probe.style.boxShadow = v; return layers(getComputedStyle(probe).boxShadow); };
  const xl = shadow('var(--shadow-xl)'), sm = shadow('var(--shadow-sm)');
  probe.remove();
  const li = document.querySelector('#rail .qitem[data-q="' + q.replace(/["\\]/g, '\\$&') + '"]');
  const b = li && li.querySelector(':scope > button');
  if (!b) return null;
  const R = (r) => [r.left, r.top, r.width, r.height].map((x) => Math.round(x * 100) / 100);
  const has = (el, set) => { const l = layers(getComputedStyle(el).boxShadow); return set.every((x) => l.includes(x)); };
  const casters = [li, b].filter((el) => has(el, xl)).map((el) => ({ who: el === li ? 'li' : 'button', box: R(el.getBoundingClientRect()) }));
  return { pile: +li.dataset.pile, open: b.getAttribute('aria-current') === 'true', card: R(b.getBoundingClientRect()),
    casters, rest: has(b, sm), edges: layers(getComputedStyle(b).boxShadow).filter((l) => / 0px \d+px 0px 0px$/.test(l)) };
};

const piled = await page.evaluate(() => [...document.querySelectorAll('#rail .qitem[data-pile]')].map((li) => li.dataset.q));
if (!piled.length) { say('SET-UP · the fixture drew no queue card stack'); process.exit(2); }

for (const q of piled) {
  const closed = await page.evaluate(READ, q);
  check(`${q} closed: nothing casts the open step`, !!closed && closed.casters.length === 0, JSON.stringify(closed && closed.casters));
  check(`${q} closed: the top card rests on its edges`, !!closed && closed.rest && closed.edges.length === 2 * Math.min(5, closed.pile),
    closed ? `${closed.edges.length / 2} edge(s) for a pile of ${closed.pile}` : 'gone');
  // open it by a press on its rail entry, the member's own way in, and watch the stack as it lands
  await page.evaluate((id) => {
    const S = window.SESSION;
    if (S.openId) S.closeCard?.();
    document.querySelector('#rail .qitem[data-q="' + id.replace(/["\\]/g, '\\$&') + '"]').scrollIntoView({ block: 'center' });
  }, q);
  await page.waitForTimeout(600);
  await page.evaluate((id) => {
    window.__lift = new Set();
    const t0 = performance.now();
    const tick = () => {
      const li = document.querySelector('#rail .qitem[data-q="' + id.replace(/["\\]/g, '\\$&') + '"]');
      for (const a of li ? li.getAnimations() : []) if (a.transitionProperty) window.__lift.add(a.transitionProperty);
      if (performance.now() - t0 < 1500) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, q);
  await page.evaluate((id) => document.querySelector('#rail .qitem[data-q="' + id.replace(/["\\]/g, '\\$&') + '"] > button').click(), q);
  await page.waitForTimeout(1600);
  const lifted = await page.evaluate((id) => ({ opened: window.SESSION.openId === id, seen: [...window.__lift] }), q);
  if (!lifted.opened) { check(`${q} opens`, false); continue; }
  await page.waitForTimeout(400);
  const open = await page.evaluate(READ, q);
  if (!open || !open.open) { check(`${q} open: its rail entry is the open one`, false); continue; }
  const want = [open.card[0], open.card[1], open.card[2], Math.round((open.card[3] + 3 * open.pile) * 100) / 100];
  const one = open.casters.length === 1 ? open.casters[0] : null;
  check(`${q} open: one box casts the open step`, open.casters.length === 1, JSON.stringify(open.casters));
  check(`${q} open: the open step is cast by the whole stack, not the top card alone`,
    !!one && one.box.every((v, i) => Math.abs(v - want[i]) <= 0.5), `caster ${one ? one.who + ' ' + one.box.join(',') : '—'} · stack ${want.join(',')}`);
  check(`${q} open: every edge moves with the top card`,
    open.edges.length === 2 * Math.min(5, open.pile) && JSON.stringify(open.edges) === JSON.stringify(closed.edges),
    `${open.edges.length / 2} edge(s) open, ${closed.edges.length / 2} closed`);
  check(`${q} open: the stack lifts by a transition`, !!one && one.who === 'li' ? lifted.seen.includes('box-shadow') : false,
    'transitions on the stack: ' + (lifted.seen.join(', ') || 'none'));
  await page.evaluate(() => window.SESSION.closeCard?.());
  await page.waitForTimeout(600);
}
await browser.close();
say(fails.length ? `pile-lift: ${fails.length} failing` : 'pile-lift: all pass');
process.exit(fails.length ? 1 : 0);
