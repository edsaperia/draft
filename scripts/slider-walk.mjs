/**
 * **The blind number question, driven** (Q779–Q782). A founder who is also a
 * member delegates 👥, is served their own answer card, and answers it with
 * the control a member actually uses.
 *
 * **It was two questions and it is one.** 🌡️ was the other, and this walk
 * drove its three rungs and its number box until the card left the surface on
 * 2026-09-15 (Q1362) with the bar it set. The three assertions are unchanged
 * and 👥 carries all of them; no control on the surface is a track any more,
 * so *slider* is the name of the walk and nothing else.
 *
 *   node scripts/slider-walk.mjs        # npm run slider-walk
 *
 * It exists because the two defects it guards are both invisible to every
 * other walk here. `founding-walk.mjs` fills a card's inputs by assignment and
 * skips `type=range` outright, so it never touches a slider; nothing at all
 * drags one. And a dispatched `input` event is not a drag: the page answered
 * one correctly the whole time it was broken.
 *
 * So both assertions are about a **pointer**:
 *
 *  1. **Born untouched.** Before the first press the control carries no value
 *     — `.cs.unset`, the readout *Drag to answer*, no fill and a dark commit.
 *     A blind collection that paints a thumb somewhere is offering an anchor,
 *     which is the one thing it exists not to do.
 *  2. **The thumb follows the pointer to the end of the track.** Drag to the
 *     left edge and the value is `min`; drag to the right edge and it is
 *     `max`. This is the assertion a re-render under the press fails: the
 *     first step moves the thumb, the render replaces the element the pointer
 *     is capturing, and every move after that goes nowhere.
 *  3. **The track is the question's own range.** The ends and the step read
 *     off the DOM against what `ANSWER` states (`BOUNDS` below): what a blind
 *     control can express is half of what the setting promises, and nothing
 *     else here reads those literals.
 *
 * Like every walk here it drives the fixture, because what it checks is pure
 * page logic — the same `slider()` and the same `input` handler serve the live
 * path — and the fixture is the only place a founding can be walked from blank
 * without a server, a mailbox and a real address.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { onPage } from './lib/walk.mjs';

const DESIGN = join(resolve(fileURLToPath(new URL('..', import.meta.url))), 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  try {
    const buf = await readFile(join(DESIGN, p === '/' ? '/session-view.html' : p));
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'text/plain' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => srv.listen(0, r));
const base = 'http://127.0.0.1:' + srv.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'en-GB', timezoneId: 'Europe/London',
  viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

// `--trace` names every task the founding walk answers on the way, which is
// how a walk that ends up in the wrong place is read
const TRACE = process.argv.includes('--trace');
const fails = [];
const check = (what, ok, detail = '') => {
  console.log(`   ${ok ? '·' : '✗'} ${what}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails.push(`${what}${detail ? ` (${detail})` : ''}`);
};

const rail = () => page.evaluate(() => [...document.querySelectorAll('#rail li')]
  .map((li) => li.dataset.q || (li.querySelector('[data-card]') || { dataset: {} }).dataset.card)
  .filter(Boolean));
// the walks' shared hands (scripts/lib/walk.mjs), bound with founding-walk's
// drive, which this walk borrowed: no scroll on a click, 280ms to settle,
// 260ms after typing
const { openCard, clickIn, typeIn } = onPage(page,
  { click: { settleMs: 280, scroll: false }, type: { settleMs: 260 } });

/* ---- one founding per slider ------------------------------------------- */
// **One delegation per walk, and it is not fastidiousness.** Handing over both
// questions at once empties the rail before 🍾 — a founder with nothing left to
// press and no document to begin, which is a defect of its own and queued as
// its own plan. So each slider gets a founding of its own, walked from blank.
const birth = async () => {
  await page.goto(base + '/session-view.html');
  await page.waitForTimeout(400);
  await openCard('title');
  await typeIn('.setupcard [data-titlelane]', 'Hollow Oak Club Charter');
  await clickIn('.setupcard [data-confirm]');
  await openCard('slug');
  await clickIn('.setupcard [data-confirm]');
  await openCard('myemail');
  await typeIn('.setupcard input[type="email"]', 'ada@example.org');
  await clickIn('.setupcard [data-confirm]');
  await clickIn('[data-act="clickmail"]');
  await page.waitForTimeout(600);
};

// **The form is the member's own since Q1162**: delegating 👥 hands over the
// whole question — no form is pre-picked, and clicking a form block now
// would take the question back rather than frame it.
const FORM = { quorum: null };
let seen = new Set();
const walkTo = async (stop, delegate) => {
  for (let i = 0; i < 40; i++) {
    const next = (await rail()).find((k) => !seen.has(k));
    if (!next) return null;
    if (next === stop) return next;
    seen.add(next);
    if (!(await openCard(next))) continue;
    if (next === delegate) {
      if (FORM[next]) await clickIn('.setupcard ' + FORM[next]);
      const gave = await clickIn('.setupcard .delegrung [data-val="roster"]');
      if (TRACE) console.log('   delegate ' + next + ': ' + gave + ' ' + JSON.stringify(await page.evaluate(() => {
        const c = document.querySelector('.setupcard');
        return [...c.querySelectorAll('[data-set][data-val]')].map((e) => e.dataset.set + '=' + e.dataset.val +
          (e.closest('.pick').classList.contains('on') ? '*' : ''));
      })));
    } else if (next === 'admission') {
      // **A room, so the questions come when they are delegated.** With the
      // founder alone `roomExists()` is false and an answer task waits until
      // nothing else is outstanding, which for 👥 is never — so the walk
      // invites somebody, which is the ordinary case anyway.
      //
      // **And 🪪 is a price, not the register** (entry 94): its ✓ reads
      // `!!S.admission`, so a card with an invitee on it and no rung chosen
      // never commits. This branch invited and stopped there, which stalled
      // the whole walk one task in and left both sliders unreached — found
      // by promise-coverage 👥 (entry 85), red on the batch's base commit
      // `2154ccb` as well as on HEAD, so it is the card that moved under the
      // walk and not the walk that broke.
      await typeIn('.setupcard [data-add]', 'ben@example.org');
      await clickIn('.setupcard [data-act="add"]');
      await clickIn('.setupcard [data-set="admission"][data-val="pen"]');
    } else {
      const opt = await page.evaluate(() => {
        const c = document.querySelector('.setupcard');
        const el = [...c.querySelectorAll('[data-set][data-val], [data-ans][data-ansval]')]
          .find((e) => !(e.closest('.pick') || { classList: { contains: () => false } })
            .classList.contains('on') && !e.closest('.delegrung'));
        return el ? { s: el.dataset.set || el.dataset.ans, v: el.dataset.val || el.dataset.ansval } : null;
      });
      if (opt) {
        if (!(await clickIn('.setupcard [data-set="' + opt.s + '"][data-val="' + opt.v + '"]')))
          await clickIn('.setupcard [data-ans="' + opt.s + '"][data-ansval="' + opt.v + '"]');
      }
      await page.evaluate(() => {
        document.querySelectorAll('.setupcard input, .setupcard textarea').forEach((i) => {
          if (i.value || /^(email|radio|checkbox|file|hidden|range|color)$/.test(i.type)) return;
          if (i.type === 'number') i.value = String(Math.max(+i.min || 1, 5));
          else if (i.type === 'datetime-local') i.value = '2026-09-18T18:00';
          else i.value = 'Ada Lovell';
          i.dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
      await page.waitForTimeout(200);
    }
    // **A commit that has not woken yet is not a commit that will not.** The
    // ✓ follows the card's own state, and some of it lands a tick after the
    // click that caused it — so a single attempt made the whole walk flaky
    // (one run in five stopped at ⏰ with the card still open and every task
    // below it unreachable). Try again once the surface has settled.
    const commit = async () => (await clickIn('.setupcard [data-confirm]')) ||
      (await clickIn('.setupcard [data-ok]')) || (await clickIn('.setupcard [data-hatgo]'));
    let done = await commit();
    if (!done) { await page.waitForTimeout(500); done = await commit(); }
    if (TRACE) console.log('   walked ' + next + (done ? '' : ' (no commit)'));
  }
  return null;
};

/* (readSlider and dragTo retired with the last slider — Q1162, Ed's card
   review of 2026-09-02: 👥 answers in two blocks now, and no control on the
   surface is a track.) */

/* ---- the two answer cards ---------------------------------------------- */
// **The range the member is offered, read off the DOM** (promise-coverage 👥,
// backlog entry 85). The blind question is the only place a member states a
// number, so what its box can *express* is half of what the setting promises:
// 👥's share cannot state 0 (a quorum nobody has to meet) and cannot leave
// the 0–100 `validateValue` accepts. That is a deliberate narrowing of the
// fold's own range, and it is asserted nowhere else — `ANSWER` in setup.js is
// one literal per bound and a typo in it is silent.
//
// **The count form is not walked**, and cannot cheaply be: `slider(A,
// 'quorum', 1, E, …)` is bounded at E, the walk's founding has one arrived
// member, and a track whose min and max are both 1 has no drag in it. The
// count form's bounds are locked in the fold instead
// (`packages/constitution/test/promise-quorum.test.ts`).
const BOUNDS = {
  quorum: { min: 5, max: 100, step: 5 },
};

/* ---- 👥: two blocks, the form part of the answer (Q1162) ----------------
   The consent slider retired with Ed's card review of 2026-09-02: the member
   states a **form as well as a number** — a share block and a count block,
   each the rule as it would stand with its number inline (Q1137's pattern).
   What is asserted is the same three promises transposed: **born untouched**
   (no block on, boxes empty, dark ✓), **typing into a block's box chooses
   that block** (F6's rule reaching the answer rungs), and **the range is the
   question's own** (5–100 on the share box, where the track's ends used to
   be read). */
for (const key of ['quorum']) {
  const want = 'ans-' + key;
  console.log('\n' + want);
  seen = new Set();
  await birth();
  const at = await walkTo(want, key);
  if (at !== want) { check('the founder is served ' + want, false, 'rail: ' + (await rail()).join(', ')); continue; }
  seen.add(want);
  check('the founder is served ' + want, await openCard(want));

  const readBlocks = () => page.evaluate(() => {
    const c = document.querySelector('.setupcard');
    if (!c) return null;
    const picks = [...c.querySelectorAll('.pick')].map((p) => {
      const b = p.querySelector('[data-ans]');
      const box = p.querySelector('[data-ansnum]');
      return {
        val: b ? b.dataset.ansval : null,
        on: p.classList.contains('on'),
        label: (p.querySelector('.opttext') ? p.querySelector('.opttext').textContent : '').replace(/\s+/g, ' ').trim(),
        box: box ? { value: box.value, min: +box.min, max: +box.max } : null,
      };
    }).filter((p) => p.val);
    const commit = c.querySelector('[data-confirm]');
    return { picks, commitOff: !commit || commit.disabled };
  });

  const born = await readBlocks();
  if (!born || !born.picks.length) { check(want + ' has the two blocks', false); continue; }
  check('two blocks, share first', born.picks.map((p) => p.val).join(',') === 'share,count',
    born.picks.map((p) => p.val).join(','));
  check('each block is the rule with its number inline',
    born.picks.every((p) => p.box && /must vote on a proposal ✏️ before anything changes/.test(p.label)),
    born.picks.map((p) => p.label.slice(0, 50)).join(' | '));
  check('born untouched', !born.picks.some((p) => p.on) &&
    born.picks.every((p) => p.box.value === ''),
    born.picks.map((p) => p.val + '=' + p.box.value + (p.on ? '*' : '')).join(','));
  check('the commit is dark until it is touched', born.commitOff);
  const share = born.picks.find((p) => p.val === 'share');
  check('the share box is the range the question offers',
    !!share && share.box.min === BOUNDS[key].min && share.box.max === BOUNDS[key].max,
    share ? share.box.min + '…' + share.box.max : '');

  // typing into the share block's box chooses that block and wakes the ✓
  await page.evaluate(() => {
    const p = [...document.querySelectorAll('.setupcard .pick')]
      .find((x) => (x.querySelector('[data-ans]') || { dataset: {} }).dataset.ansval === 'share');
    const box = p && p.querySelector('[data-ansnum]');
    if (box) { box.value = '40';
      for (const e of ['input', 'change']) box.dispatchEvent(new Event(e, { bubbles: true })); }
  });
  await page.waitForTimeout(400);
  const typed = await readBlocks();
  check('typing into the share box chooses the share block',
    typed.picks.filter((p) => p.on).map((p) => p.val).join(',') === 'share',
    typed.picks.filter((p) => p.on).map((p) => p.val).join(','));
  check('the ✓ wakes', !typed.commitOff);

  await clickIn('.setupcard [data-confirm]');
  await page.waitForTimeout(400);
  check('the ✓ files the answer', !(await rail()).includes(want), 'rail: ' + (await rail()).join(', '));
}

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' / '));
console.log('\n' + (fails.length ? 'FAIL\n  ' + fails.join('\n  ') : 'all good'));
await browser.close();
srv.close();
if (fails.length) process.exit(1);
