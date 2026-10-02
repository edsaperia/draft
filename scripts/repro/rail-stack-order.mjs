#!/usr/bin/env node
/**
 * rail-stack-order — **the rail keeps a clause's tab-stack order around the open entry** (issue #154,
 * SURFACE M6; Ed 2026-10-02 on /demo: *Why do the queue cards and tabs come in a different order?*).
 *
 *   node scripts/repro/rail-stack-order.mjs [--width=1600]
 *
 * The Hollow Oak fixture off the file system, with two entries added at § The Guest Bedroom — claims,
 * beside its unread ✔ (`race-claims`): a 💡 asking for a vote and a judged ⏳. With each of the
 * clause's entries opened in turn, the rail's top-to-bottom order of the clause's shown entries must
 * equal the order of the open strip's tabs (M6: one comparator for both columns, M4: the open entry
 * on its clause's line). Exit 0 on a pass, 1 on the defect, 2 on a set-up that never got there.
 */
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const width = Number((process.argv.find((a) => a.startsWith('--width=')) || '--width=1600').split('=')[1]);
const KEY = 'claims';
const ADDED = [
  { id: 'quick-claims-notice', kind: 'quick', keys: [KEY], state: 'needs', qLabel: '§ The Guest Bedroom — notice',
    urgency: 0.3, pct: 20, cap: 'one of the fourteen has voted — quorum is 5',
    marked: 'A claim is made by writing in the book on the landing<ins>, a week ahead</ins>.', rationale: 'A week is enough.' },
  { id: 'quick-claims-hours', kind: 'quick', keys: [KEY], state: 'deciding', verdict: 'kept the current text', pick: 'keep',
    qLabel: '§ The Guest Bedroom — hours', urgency: 0.2, pct: 60, cap: 'you have voted — three of the fourteen so far, quorum is 5',
    marked: 'A claim is made by writing in the book on the landing<ins> before nine</ins>.', rationale: 'Nobody reads the book at night.' },
];
const fails = [];
const say = (s) => console.log(s);
const check = (what, ok, detail = '') => { say(`${ok ? 'PASS' : 'FAIL'} · ${what}${detail ? ' · ' + detail : ''}`); if (!ok) fails.push(what); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 1000 } });
page.on('pageerror', (e) => say('pageerror: ' + e.message));
// the fixture is a function's return value, so the two entries are pushed as it is assigned
await page.addInitScript((added) => {
  let v;
  Object.defineProperty(window, 'FIXTURE_SESSION', { configurable: true,
    get: () => v, set: (x) => { if (x && Array.isArray(x.SUGGS)) x.SUGGS.push(...added); v = x; } });
}, ADDED);
await page.goto(pathToFileURL(resolve('design/session-view.html')).href + '?fixture=session');
await page.waitForFunction(() => window.SESSION && document.querySelector('#charter [data-key]'), null, { timeout: 30000 })
  .catch(() => { say('SET-UP · the fixture never drew'); process.exit(2); });
await page.waitForTimeout(800);

const ids = await page.evaluate((k) => window.SESSION.SUGGS.filter((g) => (g.keys || []).includes(k)).map((g) => g.id), KEY);
if (ids.length < 3) { say('SET-UP · the clause holds ' + ids.length + ' entries'); process.exit(2); }

for (const id of ids) {
  // open it as a click on its gutter tab would, then let the rail settle
  const ok = await page.evaluate(async (q) => {
    const S = window.SESSION;
    if (S.openId) S.closeCard?.();
    document.querySelector('[data-key="claims"]')?.scrollIntoView({ block: 'center' });
    S.toggle(q);
    return S.openId === q;
  }, id);
  await page.waitForTimeout(1500);
  if (!ok) { check(`${id} opens`, false); continue; }
  const m = await page.evaluate((all) => {
    window.SESSION.layoutQueue();
    const card = document.querySelector('#charter .sugg[data-card="' + window.SESSION.openId + '"]');
    // the strip's tabs, top to bottom, among the clause's own entries
    const tabs = card ? [...card.querySelectorAll('.achip[data-anchor]')]
      .filter((t) => t.getClientRects().length).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
      .map((t) => t.dataset.anchor).filter((q, i, a) => all.includes(q) && a.indexOf(q) === i) : [];
    const rail = [...document.querySelectorAll('li.qitem[data-q]')].filter((e) => all.includes(e.dataset.q) &&
      getComputedStyle(e).display !== 'none' && e.getClientRects().length)
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top).map((e) => e.dataset.q);
    return { tabs, rail };
  }, ids);
  const tabsShown = m.tabs.filter((q) => m.rail.includes(q));
  check(`${id} open: rail order is the strip's`, m.rail.length > 1 && JSON.stringify(m.rail) === JSON.stringify(tabsShown),
    `rail ${m.rail.join(' > ')} · tabs ${m.tabs.join(' > ')}`);
}
await browser.close();
say(fails.length ? `rail-stack-order: ${fails.length} failing` : 'rail-stack-order: all pass');
process.exit(fails.length ? 1 : 0);
