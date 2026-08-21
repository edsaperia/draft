// The session-clock's ladder (Q471), checked at its boundaries.
// design/ has no test runner; run `node design/tools/clock-check.mjs`.
// Loads session.js in a vm with a stub window and asserts clockText.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'session.js'), 'utf8');
// session.js only touches the DOM inside init(); loading it needs a window
// and a document object to hang the namespace on, nothing more
const win = { addEventListener() {}, matchMedia: () => ({ matches: true }),
  localStorage: { getItem: () => null, setItem() {} }, location: { search: '' } };
const ctx = { window: win, document: { getElementById: () => null, querySelector: () => null,
  addEventListener() {}, documentElement: { style: {} } }, console, setTimeout, clearTimeout,
  setInterval, clearInterval, requestAnimationFrame: (f) => setTimeout(f, 0),
  getComputedStyle: () => ({}), navigator: {}, performance, Math, Date, Set, Map, JSON };
ctx.globalThis = ctx;
vm.createContext(ctx);
// session.js destructures window.CARDS at load, so the card grammar goes first
vm.runInContext(readFileSync(join(here, '..', 'cards.js'), 'utf8'), ctx, { filename: 'cards.js' });
vm.runInContext(src, ctx, { filename: 'session.js' });
const { clockText, dateWords } = win.SESSION;

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const left = (ms) => clockText({ kind: 'left', ms });
const cases = [
  // days beyond a week, floored
  [left(30 * DAY + 5 * HOUR), '30 days left'],
  [left(8 * DAY - 1), '7 days left'],
  [left(7 * DAY + MIN), '7 days left'],
  // hours inside a week
  [left(7 * DAY), '168 hours left'],
  [left(31 * HOUR + 59 * MIN), '31 hours left'],
  [left(6 * HOUR + 1), '6 hours left'],
  // 20-minute steps inside six hours — 2h 11m is the Hollow Oak fixture
  [left(6 * HOUR), '6h 00m left'],
  [left(4 * HOUR + 40 * MIN), '4h 40m left'],
  [left(4 * HOUR + 59 * MIN), '4h 40m left'],
  [left(131 * MIN), '2h 00m left'],
  [left(HOUR + 1), '1h 00m left'],
  // 10-minute steps inside the hour, never finer
  [left(HOUR), '60 minutes left'],
  [left(40 * MIN), '40 minutes left'],
  [left(49 * MIN + 59_000), '40 minutes left'],
  [left(10 * MIN), '10 minutes left'],
  [left(9 * MIN + 59_000), 'under 10 minutes left'],
  [left(1), 'under 10 minutes left'],
  [left(0), 'closing now'],
  [left(-5 * MIN), 'closing now'],
  // the other states
  [clockText({ kind: 'none' }), ''],
  [clockText(null), ''],
  [clockText({ kind: 'frozen' }), 'Frozen'],
  [clockText({ kind: 'frozen', mustReturn: 3 }), 'Frozen — 3 must return'],
  [clockText({ kind: 'closed', atMs: Date.UTC(2026, 8, 3, 12), todayMs: Date.UTC(2026, 8, 4, 12) }), 'Closed 3 September'],
  [clockText({ kind: 'closed', atMs: Date.UTC(2025, 8, 3, 12), todayMs: Date.UTC(2026, 8, 4, 12) }), 'Closed 3 September 2025'],
  [dateWords(Date.UTC(2026, 0, 15, 12), Date.UTC(2026, 5, 1, 12)), '15 January'],
];
let failed = 0;
for (const [got, want] of cases) {
  if (got !== want) { failed++; console.error(`✗ got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
}
// never seconds, anywhere on the ladder
for (let ms = 1; ms < 9 * DAY; ms += 7 * MIN + 13_000) {
  assert.doesNotMatch(left(ms), /second|\d+s\b/, `seconds leaked at ${ms}`);
}
console.log(failed ? `clock-check: ${failed} of ${cases.length} failed` : `clock-check: ${cases.length} cases ok`);
process.exit(failed ? 1 : 0);
