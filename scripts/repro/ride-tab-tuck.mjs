/**
 * ride-tab-tuck — **the 📝 tab beside the text's first clause** (issue #194,
 * Ed 2026-10-02: *the 📝 tab seems incorrectly drawn here … it should tuck into
 * the card*). On the live path the riding tab (`#ridetab`, `renderRideTab`)
 * rests beside the text's first block, so when that block carries tabs of its
 * own the two meet:
 *
 *   rest   with nothing open, the first clause's pile is seen and pressed by a
 *          real pointer — 📝 had covered it, 1px off, at z-index 8 — and 📝
 *          stands above it in the same column, the strip's gap between them
 *   open   the pile's own tab pressed: it does not move (0px on both axes); 📝
 *          stands at the head of the card's strip, its top the first tab's top
 *          less a tab and the strip's gap, inside the card's top edge, its right
 *          edge on the card's left edge with a resting strip tab's tuck (−2px,
 *          right corners square), and its glyph does not move
 *   close  the same tab again: 📝 is back where it rested
 *
 * The demo document (design/DEMO.md) is the room: its preset opens with a race
 * on the first clause, and a visitor's seat is one tap. Desktop only — the
 * riding tab is not drawn under 900px (MOBILE.md).
 *
 *   node scripts/repro/ride-tab-tuck.mjs http://127.0.0.1:8202 [--shots=<dir>]
 *
 * Exit 0 only if all pass; 1 on a failure, 2 on a broken set-up. The sprint
 * tier's `sprint-doors` group runs it on the demo's stub-bot server.
 */
import { join } from 'node:path';
import { chromium } from 'playwright';
import { sleep } from '../lib/walk.mjs';

const B = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://127.0.0.1:8201').replace(/\/+$/, '');
const opt = (name, dflt) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : dflt;
};
const SHOTS = opt('shots', null);
const say = (s) => console.log(s);
const fails = [];
const check = (name, ok, detail = '') => {
  say((ok ? 'PASS · ' : 'FAIL · ') + name + (ok ? '' : ' · ' + detail));
  if (!ok) fails.push(name);
};
const die = (s) => { say('BROKEN · ' + s); process.exit(2); };
const near = (a, b, tol = 0.5) => Math.abs(a - b) <= tol;
// a resting place for the pointer: the desk at the window's left, below the tabs
const restY = (r) => Math.min(990, r.tab.b + 200);
const shot = async (page, name) => {
  if (!SHOTS) return;
  await page.screenshot({ path: join(SHOTS, name) });
  say('  shot · ' + join(SHOTS, name));
};

const health = await fetch(B + '/healthz').then((r) => r.json()).catch(() => null);
if (!health) die('no server at ' + B);
if (!health.demo || health.demo.state !== 'built') die('the demo document is not built on ' + B + ' · ' + JSON.stringify(health.demo));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// ---- a visitor's seat ----------------------------------------------------------
await page.goto(B + '/d/demo?try=1');
await page.waitForSelector('[data-strtry]', { timeout: 15000 }).catch(() => die('no 👋 Try It on the demo door'));
await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => null), page.locator('[data-strtry]').first().click()]);
await page.waitForFunction(() => window.SESSION && Array.isArray(window.SESSION.SUGGS), null, { timeout: 15000 })
  .catch(() => die('the visitor\'s page never drew the charter'));
await sleep(1500);

/** Everything measured, in viewport px: 📝, the first block's front tab, the card. */
const read = () => page.evaluate(() => {
  const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, h: r.height }; };
  const ride = document.querySelector('#ridetab .achip[data-tab="text"]');
  const charter = document.getElementById('charter');
  let first = null;
  for (const el of charter ? charter.children : []) {
    first = el.classList.contains('prose') ? el.firstElementChild : el;
    if (first) break;
  }
  const card = first && first.classList.contains('sugg') ? first : null;
  const col = first && first.querySelector(card ? '.clausehead .chipcol' : ':scope > .chipcol');
  const tab = col && col.querySelector('.achip');
  const cs = ride && getComputedStyle(ride);
  let topmost = null;
  if (tab) {
    const r = tab.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    topmost = !!hit && (hit === tab || tab.contains(hit));
  }
  return {
    ride: box(ride), glyph: box(ride && ride.querySelector('svg, span')), tab: box(tab), tabGlyph: box(tab && tab.querySelector('svg, span')), card: box(card),
    firstKey: first ? (first.dataset.key || first.className) : null, cardOpen: !!card, topmost,
    radiusTR: cs && cs.borderTopRightRadius, radiusBR: cs && cs.borderBottomRightRadius, mr: cs && cs.marginRight,
  };
});

// the first clause in the middle of the glass, clear of the topbar
await page.evaluate(() => {
  const f = document.querySelector('#charter > .prose > *');
  if (f) window.scrollBy(0, f.getBoundingClientRect().top - innerHeight / 2);
});
await sleep(600);
const rest = await read();
if (!rest.ride) die('no 📝 riding tab on the visitor\'s page');
if (!rest.tab) die('the demo\'s first clause (' + rest.firstKey + ') carries no tab to meet 📝 — has the preset changed?');
await shot(page, 'ride-tab-rest-1600.png');

// ---- rest ------------------------------------------------------------------------
const overlap = rest.ride.b > rest.tab.t && rest.ride.t < rest.tab.b;
check('rest · the first clause\'s tab is not under 📝', !overlap && rest.topmost,
  `📝 ${rest.ride.t.toFixed(2)}–${rest.ride.b.toFixed(2)}, its tab ${rest.tab.t.toFixed(2)}–${rest.tab.b.toFixed(2)}, topmost ${rest.topmost}`);
check('rest · 📝 stands above the pile in its column, the strip\'s gap between',
  near(rest.ride.r, rest.tab.r) && near(rest.tab.t - rest.ride.b, 3),
  `right edges ${rest.ride.r} / ${rest.tab.r}, gap ${(rest.tab.t - rest.ride.b).toFixed(2)}`);

// ---- open, by a real pointer on the pile's own tab --------------------------------
const at = { x: (rest.tab.l + rest.tab.r) / 2, y: (rest.tab.t + rest.tab.b) / 2 };
await page.mouse.click(at.x, at.y);
// off the tab before reading: a hovered tab wears a 1px lift (`.achip:hover`)
await page.mouse.move(5, restY(rest));
await sleep(1200);
const open = await read();
check('open · a pointer on the first clause\'s tab opens its card', open.cardOpen, 'first block ' + open.firstKey);
if (open.cardOpen) {
  await shot(page, 'ride-tab-open-1600.png');
  check('open · the tab pressed does not move', near(open.tabGlyph.t, rest.tabGlyph.t) && near(open.tabGlyph.l, rest.tabGlyph.l),
    `its glyph ${rest.tabGlyph.l},${rest.tabGlyph.t.toFixed(2)} → ${open.tabGlyph.l},${open.tabGlyph.t.toFixed(2)}`);
  check('open · 📝\'s right edge is on the card\'s left edge', near(open.ride.r, open.card.l),
    `📝 right ${open.ride.r}, card left ${open.card.l}`);
  check('open · 📝 heads the strip: a tab and the strip\'s gap above its first tab',
    near(open.ride.t, open.tab.t - open.ride.h - 3), `📝 top ${open.ride.t.toFixed(2)}, first tab ${open.tab.t.toFixed(2)}`);
  check('open · 📝 lies inside the card\'s top edge', open.ride.t >= open.card.t - 0.5,
    `📝 top ${open.ride.t.toFixed(2)}, card top ${open.card.t.toFixed(2)}`);
  check('open · 📝 takes a resting strip tab\'s tuck', open.mr === '-2px' && open.radiusTR === '0px' && open.radiusBR === '0px',
    `margin-right ${open.mr}, right radii ${open.radiusTR} ${open.radiusBR}`);
  check('open · 📝\'s glyph does not move sideways', near(open.glyph.l, rest.glyph.l),
    `${rest.glyph.l} → ${open.glyph.l}`);
  say(`  📝 moved ${(open.ride.t - rest.ride.t).toFixed(2)}px on open`);

  // ---- close, by the same tab -----------------------------------------------------
  await page.mouse.click((open.tab.l + open.tab.r) / 2, (open.tab.t + open.tab.b) / 2);
  await page.mouse.move(5, restY(rest));
  await sleep(1200);
  const shut = await read();
  check('close · the card closes', !shut.cardOpen, 'first block ' + shut.firstKey);
  check('close · 📝 is back where it rested', near(shut.ride.t, rest.ride.t) && near(shut.ride.r, rest.ride.r),
    `${rest.ride.t.toFixed(2)},${rest.ride.r} → ${shut.ride.t.toFixed(2)},${shut.ride.r}`);
}

check('no page threw', errors.length === 0, errors.join(' | ').slice(0, 400));
await browser.close();
say(fails.length ? `\n${fails.length} FAILED: ${fails.join('; ')}` : '\nall passed');
process.exit(fails.length ? 1 : 0);
