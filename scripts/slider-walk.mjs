/**
 * **The two blind number questions, driven** (Q779–Q782). A founder who is
 * also a member delegates 🌡️ and 👥, is served their own answer cards, and
 * answers them with the control a member actually uses.
 *
 * **Since entry 165 only one of them is a slider.** 🌡️ is three rungs and a
 * number of your own, so its half of this walk drives rungs and a number box
 * (see *the rungs*, below) and everything about a pointer on a track belongs
 * to 👥 alone. The three assertions below still describe 🌡️'s half exactly;
 * only the control they are made against changed.
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
const openCard = async (k) => {
  const ok = await page.evaluate((kk) => {
    const sel = '[data-card="' + kk + '"], [data-tab="' + kk + '"]';
    const el = document.querySelector('#rail ' + sel) || document.querySelector('#band ' + sel);
    if (!el) return false;
    el.click(); return true;
  }, k);
  await page.waitForTimeout(320);
  return ok;
};
const clickIn = async (sel) => {
  const ok = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el || el.disabled) return false;
    el.click(); return true;
  }, sel);
  await page.waitForTimeout(280);
  return ok;
};
const typeIn = async (sel, v) => {
  await page.evaluate((a) => {
    const el = document.querySelector(a[0]);
    if (!el) return;
    if (el.isContentEditable) { el.textContent = a[1]; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
    else { el.value = a[1]; el.dispatchEvent(new Event('input', { bubbles: true })); }
  }, [sel, v]);
  await page.waitForTimeout(260);
};

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

// 👥 is two questions on one card (the founder's *Asked as*, the room's *The
// number*), so delegating it means picking the form as well — the value half
// stays the founder's whatever happens to the number.
const FORM = { bar: null, quorum: '[data-set="quorumForm"][data-val="share"]' };
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
      // nothing else is outstanding, which for 🌡️ is never — so the walk
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

/** The slider's own state, and where on screen it is. */
const readSlider = () => page.evaluate(() => {
  const c = document.querySelector('.setupcard');
  const sl = c && c.querySelector('[data-slide]');
  if (!sl) return null;
  sl.scrollIntoView({ block: 'center' });
  const r = sl.getBoundingClientRect();
  const commit = c.querySelector('[data-confirm]');
  return {
    key: sl.dataset.slide, min: +sl.min, max: +sl.max, step: +sl.step, value: +sl.value,
    unset: !!c.querySelector('.cs.unset'), readout: (c.querySelector('.csval') || {}).textContent,
    pct: sl.style.getPropertyValue('--pct').trim(),
    commitOff: !commit || commit.disabled,
    x: r.x, y: r.y, w: r.width, h: r.height,
  };
});
/** Press on the track and pull the thumb to `frac` of its width. */
const dragTo = async (s, frac) => {
  await page.mouse.move(s.x + s.w / 2, s.y + s.h / 2);
  await page.mouse.down();
  for (const f of [0.5, (0.5 + frac) / 2, frac, frac]) {
    await page.mouse.move(s.x + s.w * f, s.y + s.h / 2);
    await page.waitForTimeout(60);
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
  return readSlider();
};

/* ---- the two answer cards ---------------------------------------------- */
// what the readout must look like once it carries a value: the founder's
// chosen form — a share, and what it comes to
const SHAPE = { quorum: /^\d+% — \d+ of \d+$/ };
// **The track the member is offered, read off the DOM** (promise-coverage 👥,
// backlog entry 85). The two blind questions are the only place a member
// states a number, so what the track can *express* is half of what the
// setting promises: 👥's share cannot state 0 (a quorum nobody has to meet)
// and cannot leave the 0–100 `validateValue` accepts; 🌡️'s cannot state a
// bar below the coin flip. Both are deliberate narrowings of the fold's own
// range, and neither is asserted anywhere else — `ANSWER` in setup.js is one
// literal per bound and a typo in it is silent.
//
// **The count form is not walked**, and cannot cheaply be: `slider(A,
// 'quorum', 1, E, …)` is bounded at E, the walk's founding has one arrived
// member, and a track whose min and max are both 1 has no drag in it. The
// count form's bounds are locked in the fold instead
// (`packages/constitution/test/promise-quorum.test.ts`).
const BOUNDS = {
  quorum: { min: 5, max: 100, step: 5 },
};

/* ---- 🌡️: the rungs ------------------------------------------------------
   Since entry 165 🌡️'s blind answer is not a slider at all: three rungs and a
   fourth holding the precise number. So its half of this walk drives rungs,
   and what it asserts is the same three things transposed — **born untouched**
   (no rung on, and the number box not in the DOM at all, because it lives
   inside a rung nobody has chosen), **the control does what the pointer says**
   (a rung lights, a number reaches the ✓), and **the range is the question's
   own** (50–99 off the box, where the slider's ends used to be read off the
   track). One thing is new and is the point of the entry: each rung carries a
   sentence about *this room*, and it must be there rather than a percent
   repeated back. */
const readRungs = () => page.evaluate(() => {
  const c = document.querySelector('.setupcard');
  if (!c) return null;
  const picks = [...c.querySelectorAll('.pick')].map((p) => {
    const b = p.querySelector('[data-ans]');
    return {
      val: b ? b.dataset.ansval : null,
      on: p.classList.contains('on'),
      label: (b ? b.textContent : '').replace(/\s+/g, ' ').trim(),
      exp: ((p.querySelector('.exp') || {}).textContent || '').trim(),
    };
  });
  const box = c.querySelector('[data-ansnum]');
  const commit = c.querySelector('[data-confirm]');
  return {
    picks,
    box: box ? { value: box.value, min: +box.min, max: +box.max } : null,
    commitOff: !commit || commit.disabled,
  };
});

{
  const want = 'ans-bar';
  console.log('\n' + want);
  seen = new Set();
  await birth();
  const at = await walkTo(want, 'bar');
  if (at !== want) {
    check('the founder is served ' + want, false, 'rail: ' + (await rail()).join(', '));
  } else {
    seen.add(want);
    check('the founder is served ' + want, await openCard(want));

    const born = await readRungs();
    const rungs = born.picks.filter((p) => p.val && p.val !== 'own');
    check('it offers three rungs and a number of your own', rungs.length === 3 &&
      born.picks.some((p) => p.val === 'own'), born.picks.map((p) => p.val).join(', '));
    check('most protective first', rungs.map((p) => p.val).join(',') === '90,80,60',
      rungs.map((p) => p.val).join(','));
    check('each rung says what it would mean for this room',
      rungs.every((p) => /^In a room of one, /.test(p.exp)),
      rungs.map((p) => p.exp).join(' | '));
    check('born untouched', !born.picks.some((p) => p.val && p.on),
      born.picks.filter((p) => p.on).map((p) => p.val).join(','));
    check('and the number box is not even in the DOM', born.box === null);
    check('the commit is dark until it is touched', born.commitOff);

    await clickIn('.setupcard [data-ans="bar"][data-ansval="own"]');
    const own = await readRungs();
    check('a number of my own opens an empty box', own.box !== null && own.box.value === '',
      own.box ? JSON.stringify(own.box) : 'no box');
    check('the box is the range the question offers',
      !!own.box && own.box.min === 50 && own.box.max === 99,
      own.box ? own.box.min + '…' + own.box.max : '');
    check('choosing where to answer is not answering', own.commitOff);

    await typeIn('.setupcard [data-ansnum="bar"]', '72');
    const typed = await readRungs();
    const ownRow = typed.picks.find((p) => p.val === 'own');
    check('a typed number wakes the ✓', !typed.commitOff);
    check('and says what it would mean, rather than repeating itself',
      !!ownRow && /^In a room of one, /.test(ownRow.exp) && !/72/.test(ownRow.exp), ownRow && ownRow.exp);

    await clickIn('.setupcard [data-ans="bar"][data-ansval="80"]');
    const rung = await readRungs();
    check('a rung takes the answer back off the box', rung.box === null);
    check('the rung is the one that is on',
      rung.picks.filter((p) => p.on).map((p) => p.val).join(',') === '80',
      rung.picks.filter((p) => p.on).map((p) => p.val).join(','));
    check('the ✓ is live', !rung.commitOff);

    await clickIn('.setupcard [data-confirm]');
    await page.waitForTimeout(400);
    check('the ✓ files the answer', !(await rail()).includes(want), 'rail: ' + (await rail()).join(', '));
  }
}

/* ---- 👥: the slider, still ---------------------------------------------- */
for (const key of ['quorum']) {
  const want = 'ans-' + key;
  console.log('\n' + want);
  seen = new Set();
  await birth();
  const at = await walkTo(want, key);
  if (at !== want) { check('the founder is served ' + want, false, 'rail: ' + (await rail()).join(', ')); continue; }
  seen.add(want);
  check('the founder is served ' + want, await openCard(want));

  const born = await readSlider();
  if (!born) { check(want + ' has a slider', false); continue; }
  check('born untouched', born.unset && born.pct === '0',
    'unset=' + born.unset + ' --pct=' + born.pct);
  check('the readout asks rather than answers', born.readout === 'Drag to answer', born.readout);
  check('the commit is dark until it is touched', born.commitOff);

  const low = await dragTo(born, 0);
  check('dragged to the left edge it reads min', low.value === low.min,
    low.value + ' of ' + low.min + '…' + low.max);
  const high = await dragTo(low, 1);
  check('dragged to the right edge it reads max', high.value === high.max,
    high.value + ' of ' + high.min + '…' + high.max);
  const mid = await dragTo(high, 0.5);
  check('and stops in between', mid.value > mid.min && mid.value < mid.max, String(mid.value));

  // the ends of the track are the ends `ANSWER` states, and the member
  // cannot walk off either of them
  const track = BOUNDS[key];
  check('the track starts where the question does', low.min === track.min,
    low.min + ' want ' + track.min);
  check('and ends where it does', high.max === track.max,
    high.max + ' want ' + track.max);
  check('in the steps it offers', mid.step === track.step, mid.step + ' want ' + track.step);

  check('the readout carries the value', SHAPE[key].test(mid.readout || ''), mid.readout);
  check('the touched control is no longer unset', !mid.unset && mid.pct !== '0', '--pct=' + mid.pct);
  check('the ✓ wakes', !mid.commitOff);

  await clickIn('.setupcard [data-confirm]');
  await page.waitForTimeout(400);
  check('the ✓ files the answer', !(await rail()).includes(want), 'rail: ' + (await rail()).join(', '));
}

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' / '));
console.log('\n' + (fails.length ? 'FAIL\n  ' + fails.join('\n  ') : 'all good'));
await browser.close();
srv.close();
if (fails.length) process.exit(1);
