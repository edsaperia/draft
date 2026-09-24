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
// — and the grammar reads its words off window.COPY, so copy.js goes before it
vm.runInContext(readFileSync(join(here, '..', 'copy.js'), 'utf8'), ctx, { filename: 'copy.js' });
vm.runInContext(readFileSync(join(here, '..', 'cards.js'), 'utf8'), ctx, { filename: 'cards.js' });
// and since Q1352 (h) and (i) session.js makes its flights and its composer
// as it is evaluated, so the page loads both before it — the same order here
for (const f of ['flights.js', 'composer.js']) {
  vm.runInContext(readFileSync(join(here, '..', f), 'utf8'), ctx, { filename: f });
}
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

// **The abstention countdown's own ladder** (Q1460) — hh:mm, and the
// opposite rounding rule to the clock above: every figure rounds **up**, so
// the line never reads 00:00 while a vote of yours would still be counted.
// Null once the moment is behind us, which is what the renderer reads as
// *💤 abstained* (Q1460 (a)).
const { abstainHhmm, abstainLeft, abstainNoteHtml, tickAbstain } = ctx.window.CARDS;
const hhmm = [
  [abstainHhmm(0), null],
  [abstainHhmm(-5 * MIN), null],
  [abstainHhmm(1), '00:01'],                 // a millisecond left is still a minute
  [abstainHhmm(MIN), '00:01'],
  [abstainHhmm(MIN + 1), '00:02'],
  [abstainHhmm(59 * MIN), '00:59'],
  [abstainHhmm(HOUR), '01:00'],
  [abstainHhmm(HOUR + 30 * MIN + 1), '01:31'],
  [abstainHhmm(7 * DAY), '168:00'],          // past two figures it goes on counting
];
for (const [got, want] of hhmm) {
  if (got !== want) {
    failed++;
    console.error(`✗ abstainHhmm: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
}
cases.push(...hhmm);

// **And past a day the card counts in days** (Q1460 (f), Ed 2026-09-19: *If
// it's more than a day away, the card should show e.g. "abstain in 3 days &
// hh:mm"*). Whole days, then the hours and minutes left over; *1 day* in the
// singular; under twenty-four hours it is the hh:mm alone, so `abstainLeft`
// and `abstainHhmm` agree everywhere below a day and part company above it.
// The same rounding-up rule throughout, which is what puts 23:59:59.999 in
// the day column rather than at 24:00.
const days = [
  [abstainLeft(0), null],
  [abstainLeft(-1), null],
  [abstainLeft(1), '00:01'],
  [abstainLeft(23 * HOUR + 58 * MIN), '23:58'],
  [abstainLeft(DAY - 1), '1 day & 00:00'],       // rounded up over the boundary, never 24:00
  [abstainLeft(DAY), '1 day & 00:00'],
  [abstainLeft(DAY + MIN), '1 day & 00:01'],
  [abstainLeft(DAY + 4 * HOUR + 12 * MIN), '1 day & 04:12'],
  [abstainLeft(2 * DAY), '2 days & 00:00'],      // and the plural from two
  [abstainLeft(3 * DAY + 4 * HOUR + 11 * MIN + 1), '3 days & 04:12'],  // Ed's own example
  [abstainLeft(7 * DAY), '7 days & 00:00'],
];
for (const [got, want] of days) {
  if (got !== want) {
    failed++;
    console.error(`✗ abstainLeft: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
}
cases.push(...days);

// **The note itself, and the flip at zero** (Q1460 (a), (e)). The renderer
// is a string function with no DOM behind it, so its two forms and its one
// rewrite can be read here rather than only in a browser: the card's
// sentence, the rail's glyph-and-figures — drawn only inside the last day —
// and *abstained* on both once the moment is behind us. The glyph comes back
// as drawn markup, so each case asks what the note *says* rather than
// matching its whole HTML.
const NOW = Date.now();
const says = (html) => String(html).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
const note = [
  [says(abstainNoteHtml(NOW + 20 * MIN)), 'abstain in 00:20'],
  [says(abstainNoteHtml(NOW + 3 * DAY + 4 * HOUR + 12 * MIN)), 'abstain in 3 days & 04:12'],
  [says(abstainNoteHtml(NOW - MIN)), 'abstained'],
  [abstainNoteHtml(undefined), ''],
  // the rail: the figures alone inside the last day, nothing beyond it, and
  // the same *abstained* once the period has run (Ed, 2026-09-19)
  // the rail's own line has no words in it at all — the glyph is markup, so
  // what is left when the markup goes is the figures and nothing else
  [says(abstainNoteHtml(NOW + 20 * MIN, 'rail')), '00:20'],
  [says(abstainNoteHtml(NOW + 23 * HOUR, 'rail')), '23:00'],
  [abstainNoteHtml(NOW + 25 * HOUR, 'rail'), ''],
  [says(abstainNoteHtml(NOW - MIN, 'rail')), 'abstained'],
];
// the figures the rail draws are inside the markup, so they are read off the
// one element the ticker patches rather than off the stripped sentence
const railFigs = (ms) => (/<span class="abst">([^<]*)</.exec(abstainNoteHtml(NOW + ms, 'rail')) || [])[1] ?? null;
note.push([railFigs(20 * MIN), '00:20'], [railFigs(23 * HOUR), '23:00'], [railFigs(25 * HOUR), null]);
// …and the card's, which keeps its figures in the same element
const cardFigs = (ms) => (/<span class="abst">([^<]*)</.exec(abstainNoteHtml(NOW + ms)) || [])[1] ?? null;
note.push([cardFigs(20 * MIN), '00:20'], [cardFigs(3 * DAY), '3 days &amp; 00:00']);
for (const [got, want] of note) {
  if (got !== want) {
    failed++;
    console.error(`✗ abstainNoteHtml: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
}
cases.push(...note);

// **The ticker patches, and flips once** (Q1460 (a)): a countdown's figures
// are the only thing it writes while the moment is ahead, and at zero it
// rewrites that one note to *abstained* and leaves it alone afterwards. A
// hand-made element stands for the page here — `tickAbstain` walks whatever
// it is handed and touches nothing else.
const el = (at) => {
  const inner = { html: abstainNoteHtml(at) };
  const m = /<span class="abst">([^<]*)</.exec(inner.html);
  const abst = { textContent: m ? m[1] : '', tagName: 'SPAN' };
  const attrs = { 'data-abstain-at': String(at) };
  if (!/data-abstained/.test(inner.html)) delete attrs['data-abstained'];
  else attrs['data-abstained'] = '1';
  return { abst, attrs, writes: 0,
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    setAttribute: (k, v) => { attrs[k] = v; },
    querySelector: () => abst,
    set innerHTML(v) { this.writes++; this.said = says(v); },
  };
};
const scopeOf = (e) => ({ querySelectorAll: () => [e] });
const ticked = [];
{
  const e = el(NOW + 20 * MIN);
  e.abst.textContent = 'stale';
  tickAbstain(scopeOf(e));
  ticked.push([e.abst.textContent, '00:20'], [e.writes, 0]);
}
{
  const e = el(NOW - MIN);          // born past: already flipped, and left alone
  ticked.push([e.attrs['data-abstained'], '1']);
  tickAbstain(scopeOf(e));
  ticked.push([e.writes, 0]);
}
{
  const e = el(NOW - MIN);          // and one that arrives ahead and runs out
  delete e.attrs['data-abstained'];
  tickAbstain(scopeOf(e));
  tickAbstain(scopeOf(e));
  ticked.push([e.writes, 1], [e.said, 'abstained'], [e.attrs['data-abstained'], '1']);
}
for (const [got, want] of ticked) {
  if (got !== want) {
    failed++;
    console.error(`✗ tickAbstain: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
}
cases.push(...ticked);

// **A rail entry's title names its own subject** (Q1523, Ed 2026-09-24):
// the words where two wordings differ, read from the two texts alone, and a
// rail entry's moment on one ladder. Pure string functions in cards.js, so
// every recipe is read here rather than only on a page.
const { railPair, railChange, railWhen, railAt, railArrow, railPlain } = ctx.window.CARDS;
const G = 'Guests';
const titles = [
  // a pair: the two sides as the card presents them
  [railPair('A quorum is six members.', 'A quorum is seven members.', G), '‘six’ or ‘seven’'],
  [railPair('Guests are welcome.', 'Guests are welcome, and until the quiet hours begin.', G),
    'with or without ‘and until the…’'],
  [railPair('Guests come whenever a member is in, up to three at a time without telling anybody.',
    'Guests come whenever a member is in, and until the quiet hours begin.', G),
    '‘up to three…’ or ‘and until the…’'],
  // two rewrites are read from where they stop agreeing
  [railPair('The Purse-holder pays only bills approved under the budget.',
    'The Purse-holder pays the house’s bills as good sense directs.', G), '‘only bills…’ or ‘the house’s…’'],
  // a decided change: what went out, what came in
  [railChange('Subscriptions are reviewed monthly by the house.', 'Subscriptions are reviewed quarterly by the house.', G),
    '‘monthly’ → ‘quarterly’'],
  [railChange('Friends of the house are welcome.', 'Friends of the house are welcome, and so are their dogs.', G),
    '‘and so are their dogs’'],
  [railChange('The Club has no head, and has managed without one.', 'The Club has no head.', G), 'without ‘and has managed without…’'],
  // a rewrite with no short difference: the first words of the new wording
  [railChange('One two three four five six seven.', 'Completely different words entirely in this new sentence.', G),
    '‘Completely different words…’'],
  // punctuation or spacing alone: the clause's name, said so; nothing at all: the name
  [railChange('A b c.', 'A b c!', G), 'Guests (punctuation)'],
  [railPair('A,  b c', 'A b c', G), 'Guests (punctuation)'],
  [railChange('Same words.', 'Same  words.', G), 'Guests'],
  // a gap: all of it went in
  [railChange('', 'A new clause.', G), '‘A new clause’'],
  // markdown never reaches a title
  [railChange('# **The Kitchen** is open', '# **The Kitchen** is shut', G), '‘open’ → ‘shut’'],
  [railPlain('- *good* coffee, \\*not\\* the tin'), 'good coffee, *not* the tin'],
  // several changes: the first that says anything, and the ellipsis where
  // the rest says anything too — a scrap (*or* → *and*) is no reason for one
  [railChange('It is open in May, and closed in winter.', 'It is shut in May, and heated in winter.', G), '‘open’ → ‘shut’ …'],
  [railChange('It is open in May or June, daily.', 'It is shut in May and June, daily.', G), '‘open’ → ‘shut’'],
  [railChange('Knives are not used on bone or frozen food.', 'Knives are not used on bone, frozen food, or the garden.', G), '‘or the garden’'],
  // *not* is never a scrap
  [railPair('Members may vote.', 'Members may not vote.', G), 'with or without ‘not’'],
  // only punctuation between two changes: one change
  [railPair('It is said once and not more.', 'It is said once. No further reminder is given.', G),
    '‘and not more’ or ‘No further…’'],
  // a rule's value, old → new, a shared tail said once
  [railArrow('10 minutes', '5 minutes'), '10 → 5 minutes'],
  [railArrow('6 of 12', '8 of 12'), '6 → 8 of 12'],
  [railArrow('1 hour', '30 minutes'), '1 hour → 30 minutes'],
  [railArrow('members only', 'public'), 'members only → public'],
  [railArrow('all agree', 'all others agree'), 'all agree → all others agree'],
];
// the rail's moment: 24-hour, shortest by distance, against a pinned now
const T0 = new Date(2026, 8, 30, 12, 0).getTime();        // Wednesday 30 September 2026, noon
const on = (y, m, d, h, mi) => new Date(y, m - 1, d, h, mi).getTime();
titles.push(
  [railWhen(on(2026, 9, 30, 9, 5), T0), '09:05'],          // today
  [railWhen(on(2026, 9, 30, 23, 59), T0), '23:59'],
  [railWhen(on(2026, 9, 29, 15, 25), T0), 'Tue 15:25'],    // the last seven days
  [railWhen(on(2026, 9, 24, 0, 1), T0), 'Thu 00:01'],
  [railWhen(on(2026, 9, 23, 15, 25), T0), '23 Sep'],       // a week ago: the weekday would repeat
  [railWhen(on(2026, 1, 2, 8, 0), T0), '2 Jan'],
  [railWhen(on(2025, 9, 20, 15, 25), T0), '20 Sep 2025'],  // another year
  [railWhen(undefined, T0), null],
  // a rule's moment either side of now, always with its time
  [railAt(on(2026, 9, 30, 17, 10), T0), '17:10'],
  [railAt(on(2026, 10, 4, 17, 10), T0), 'Sun 17:10'],
  [railAt(on(2026, 10, 20, 17, 10), T0), '20 Oct 17:10'],
  [railAt(on(2027, 1, 3, 9, 0), T0), '3 Jan 2027 09:00'],
);
for (const [got, want] of titles) {
  if (got !== want) {
    failed++;
    console.error(`✗ rail title: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
}
cases.push(...titles);
console.log(failed ? `clock-check: ${failed} of ${cases.length} failed` : `clock-check: ${cases.length} cases ok`);
process.exit(failed ? 1 : 0);
