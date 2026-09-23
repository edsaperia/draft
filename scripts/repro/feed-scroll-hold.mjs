/**
 * **A projector scrolled back does not move when an entry arrives or
 * leaves** (issue #87 F2; #68 finding 6).
 *
 * The spectator feed replaces every node on every poll, newest first, so an
 * entry arriving above the reader pushed what they were reading down — #68
 * carried them back by the height the list gained, but only when it *grew*.
 * Since #87 F1 an entry also **leaves** (a rules motion withdrawn, voted
 * down or kept at the close), which moves everything older up by its height,
 * and the guard `grew > 0` refused exactly that correction.
 *
 * No server: the page is `design/feed.html` served from disk through
 * Playwright's route interception, and the feed answer is fabricated — twelve
 * rules proposals, then the same twelve with the newest gone, then with a new
 * one on top. After each poll the entry the reader was looking at must stand
 * where it stood. Red on the pre-fix `feed.js` at the leaving case.
 *
 *   node scripts/repro/feed-scroll-hold.mjs
 */
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const DESIGN = join(import.meta.dirname, '..', '..', 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

/** A rules proposal: ⏱️ from one drip interval to another, its own reason. */
const entry = (i) => ({
  t: 1_790_000_000_000 + i * 60_000, kind: 'proposed', motionId: 'mo-' + i, setting: 'rate',
  glyph: '⏱️', route: 'ordinary', from: { grant: 3, cap: 3, dripMinutes: 240 },
  to: { grant: 3, cap: 3, dripMinutes: 60 + i }, rationale: 'reason number ' + i,
});
// **and the oldest is a text proposal naming its author by reference** (Q1509
// (a)): the picture travels once, in `members.list`, and `author` indexes it
const OLDEST = { t: 1_790_000_000_000 - 60_000, kind: 'proposed', candidateId: 'c-old', author: 0,
  rationale: 'the oldest reason', changes: [{ heading: null, above: null,
    before: ['The club meets weekly.'], after: ['The club meets every other week.'] }] };
let entries = [...Array.from({ length: 12 }, (_, i) => entry(i)).reverse(), OLDEST]; // newest first
let eseq = 1;
const answer = () => JSON.stringify({ title: 'Scroll Charter', begun: true, canRead: true,
  closed: null, paused: null, stalled: false, founderIsMember: true,
  members: { arrived: 5, list: [{ name: 'Rae Author', picture: 'e🦊', erased: false }] },
  admissionPrice: 'assembly', eseq: eseq++, entries });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.route('**/*', (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/api/d/scroll/feed') {
    return route.fulfill({ status: 200, contentType: 'application/json', body: answer() });
  }
  const file = path === '/d/scroll/feed' ? 'feed.html' : path.slice(1);
  try {
    return route.fulfill({ status: 200, body: readFileSync(join(DESIGN, file)),
      contentType: TYPES[extname(file)] || 'application/octet-stream' });
  } catch { return route.fulfill({ status: 404, body: '' }); }
});
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://feed.test/d/scroll/feed');
await page.waitForFunction(() => document.querySelectorAll('#feed article').length >= 12);

/** Where the entry carrying this reason stands in the window, in px. */
const topOf = (why) => page.evaluate((w) => {
  const a = [...document.querySelectorAll('#feed article')].find((x) => x.textContent.includes(w));
  return a ? Math.round(a.getBoundingClientRect().top) : null;
}, why);
const poll = async () => {
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(400);
};

const fails = [];
const check = (ok, msg) => { console.log((ok ? '  ok   · ' : '  FAIL · ') + msg); if (!ok) fails.push(msg); };

// the reader scrolls back to an older entry
await page.evaluate(() => window.scrollTo(0, 1400));
await page.waitForTimeout(200);
const READING = 'reason number 4';
const before = await topOf(READING);
check(before !== null && before > 0 && before < 800, 'the reader is looking at ' + READING + ' (top ' + before + ')');

// an entry leaves above them: the newest motion was voted down
entries = entries.slice(1);
await poll();
const afterLeave = await topOf(READING);
check(afterLeave === before, 'an entry leaving above does not move the reader (' + before + ' → ' + afterLeave + ')');

// an entry arrives above them
entries = [entry(20), ...entries];
await poll();
const afterArrive = await topOf(READING);
check(afterArrive === before, 'an entry arriving above does not move the reader (' + before + ' → ' + afterArrive + ')');

const oldestBy = await page.evaluate(() => {
  const a = [...document.querySelectorAll('#feed article')].find((x) => x.textContent.includes('the oldest reason'));
  const n = a && a.querySelector('.fwho .name');
  return n ? n.textContent : null;
});
check(oldestBy === 'Rae Author', 'an entry’s author is read from members.list by reference (' + JSON.stringify(oldestBy) + ')');

check(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 2)));
await browser.close();
console.log(fails.length ? '\nFAILED (' + fails.length + ')' : '\nall good');
process.exit(fails.length ? 1 : 0);
