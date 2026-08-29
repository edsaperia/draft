/**
 * The birth's **address**, against a running server.
 *
 * Ed's report, 2026-08-22: *during the birth, after I set my email, the link
 * card opens* — because the address was taken. The walk-back was correct: the
 * defect was that 📍 let a taken address be committed at all, so the send was
 * the first thing in the world to ask about it.
 *
 * Two halves, and this walks both.
 *   · **A suggested address moves** (Q534c). The address 📍 pre-fills from
 *     the title is the machine's, so a collision is resolved before the
 *     founder ever meets it — and the note names the address the title
 *     wanted and the one this document landed on, because silently handing
 *     somebody a suffixed address is the machine deciding without saying so.
 *   · **A typed address is refused, and stays refused.** Once the founder has
 *     typed, the address is theirs: a collision is a refusal to read and
 *     correct, never something the page quietly moves. Commit dark, note
 *     naming the nearest free address, nothing sent at the wire.
 *
 *   npm run server                                  # in another shell
 *   npm run slug-walk -- [<base-url>] [<slug>]      # slug must be reserved
 *
 * Neither argument is positional: the base is the first `http(s)://`
 * argument, defaulting to `DRAFT_BASE_URL`, then `PORT`, then 8140, and the
 * slug is the first argument that is neither a URL nor a flag — so naming
 * only one of the two is unambiguous.
 *
 * Reserve one first, if the server is fresh:
 *   curl -X POST <base>/api/docs -H 'content-type: application/json' \
 *     -d '{"title":"Test Charter","slug":"test-charter","email":"a@b.com"}'
 *
 * CI's `walks` job runs this at every push, against a dev server it boots
 * itself; that curl is the job's own reservation step (Q917 (a)).
 *
 * Why it is not part of `journey-walk.mjs`: the journey births with a unique
 * title, so it can never meet a taken address; and both probes drive the
 * fixture, where the check is synchronous and the live path is never reached.
 * It fails on the pre-fix page at *the commit is dark on a typed address that
 * is taken*, which is the only reason to trust it. Q535 (a).
 */
import { chromium } from 'playwright';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
// the slug is a search too, not `argv[3]`: once the base can come from the
// environment, a positional slug behind a positional base reads the URL's
// old seat as the slug the moment somebody omits the URL
const TAKEN = process.argv.slice(2)
  .find((a) => !/^https?:\/\//.test(a) && !a.startsWith('-')) || 'test-charter';
const say = (...a) => console.log(...a);
// Q911: a walk on a default port will drive whatever process is listening,
// and a stale one serves today's page over a week-old engine — so the first
// thing this does is refuse a server that is not this tree.
await assertServerBuild(BASE, 'slug-walk');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const refused = [];
page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400)
  refused.push(r.status() + ' ' + r.request().method() + ' ' + new URL(r.url()).pathname); });
const T = (ms) => page.waitForTimeout(ms);
const fails = [];
const check = (ok, msg) => { say((ok ? '  ok   · ' : '  FAIL · ') + msg); if (!ok) fails.push(msg); };

const open = async (k) => {
  await page.evaluate((kk) => {
    const el = document.querySelector('#rail [data-card="' + kk + '"], #band [data-tab="' + kk + '"]');
    if (el) el.click();
  }, k);
  await T(420);
};
const typeIn = (sel, v) => page.evaluate((a) => {
  const el = document.querySelector(a[0]);
  if (!el) return false;
  if (el.isContentEditable) { el.textContent = a[1]; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
  else { el.value = a[1]; el.dispatchEvent(new Event('input', { bubbles: true })); }
  return true;
}, [sel, v]);
// journey's, lifted: a rung is chosen with a click, and a selector that names
// no rung is reported rather than passed over in silence
const clickIn = async (sel) => {
  const ok = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el || el.disabled) return false;
    el.scrollIntoView({ block: 'center' });
    el.click();
    return true;
  }, sel);
  await T(420);
  return ok;
};
// **What a press is depends on the gesture** (backlog 184): under `hold` it is
// down · wait · up, as it always was; under `click` the click starts the
// flight and `holdMs` is the flight's own length, with nothing to let go of.
// Asked of the page, so this walk follows `COMMIT_GESTURE` wherever it is set.
const pageGesture = () => page.evaluate(() => (window.SESSION && window.SESSION.gesture) || 'hold');
const press = async (holdMs) => {
  const box = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.setupcard .commitrow button')]
      .find((x) => !x.disabled && !/🗑/.test(x.textContent));
    if (!b) return null;
    b.scrollIntoView({ block: 'center' });
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: b.textContent.trim() };
  });
  if (!box) return null;
  await T(160);
  await page.mouse.move(box.x, box.y);
  if (await pageGesture() === 'click') { await page.mouse.click(box.x, box.y); await T(holdMs); }
  else { await page.mouse.down(); await T(holdMs); await page.mouse.up(); }
  await T(460);
  return box.label;
};
/* the state of the 📍 card: what is in the field, whether the commit is
   pressable, what it says for itself, and what the note under it reads */
const slugState = () => page.evaluate(() => {
  const b = [...document.querySelectorAll('.setupcard .commitrow button')]
    .find((x) => !/🗑/.test(x.textContent));
  return {
    value: (document.querySelector('.setupcard [data-slug]') || {}).value,
    disabled: b ? b.disabled : null,
    title: b ? b.title : null,
    note: ((document.querySelector('.setupcard [data-slugnote]') || {}).textContent || '')
      .replace(/\s+/g, ' ').trim(),
  };
});

/* ---- a title whose address is already taken --------------------------- */
const TITLE = TAKEN.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
await page.goto(BASE + '/');
await T(800);
await open('title');
await typeIn('.setupcard [data-titlelane]', TITLE);
await press(1250);
say('birth     · 📝 title pressed');
await open('slug');
await T(1400);                    // the check is asked on arrival, not on a keystroke
let s = await slugState();
say('suggested · ' + JSON.stringify(s));
check(s.value !== TAKEN, 'the suggested address moves off the taken one (' + s.value + ')');
check((s.value || '').startsWith(TAKEN + '-'),
  'it moves to the nearest free address, not to something unrelated');
check(new RegExp(TAKEN + '\\b').test(s.note) && /is taken/.test(s.note),
  'the note names the address the title wanted');
check(s.note.includes(s.value || '\u0000'), 'the note names the address it landed on');
check(s.disabled === false, 'the commit is live on the address it moved to');

/* ---- an address the founder types is refused, and stays refused ------- */
await typeIn('.setupcard [data-slug]', TAKEN);
await T(1400);
s = await slugState();
say('typed     · ' + JSON.stringify(s));
check(s.value === TAKEN, 'a typed address is not moved out from under the founder');
check(s.disabled === true, 'the commit is dark on a typed address that is taken');
check(/is taken/.test(s.note), 'the card says the address is taken');
check(new RegExp(TAKEN + '-\\d').test(s.note), 'the card offers the nearest free address');
check(/taken/i.test(s.title || ''), 'the dark commit says why: ' + JSON.stringify(s.title));

const before = refused.length;
await press(1250);
await T(600);
check(refused.length === before, 'a press on the dark commit sends nothing');

/* ---- correct it, and the birth goes through --------------------------- */
const FREE = TAKEN + '-' + Date.now().toString(36);
await typeIn('.setupcard [data-slug]', FREE);
await T(1400);
s = await slugState();
say('corrected · ' + JSON.stringify(s));
check(s.disabled === false, 'the commit lights once the address is free');
check(!/is taken/.test(s.note), 'the taken note is gone');

await press(1250);
say('birth     · 📍 slug pressed (' + FREE + ')');
// **🧭 sits between 📍 and 📧 in the birth order** (entry 166): a card in
// ORDER that is not settled blocks everything under it, so this walk could not
// reach a live 📧 commit either — and passed anyway, because it never asked
// whether the birth it is named for had happened. The check below is what
// makes this step necessary rather than merely correct (entry 203).
await open('shape');
if (!(await clickIn('.setupcard [data-set="docShape"][data-val="custom"]'))) {
  check(false, '🧭 offers a rung named custom');
}
await press(1250);
say('birth     · 🧭 shape pressed (custom)');
await open('myemail');
await typeIn('.setupcard input[type="email"]', 'ada@example.org');
await press(1250);
say('birth     · 📧 sent');
await T(1800);
const openCard = await page.evaluate(() => {
  const c = document.querySelector('.setupcard');
  return c ? (c.dataset.k || (c.querySelector('[data-tab]') || { dataset: {} }).dataset.tab || 'some card') : null;
});
check(openCard === null, 'after the send no card is open — 📍 does not re-open (was: ' + openCard + ')');
// **This walk is named *the birth goes through* and never checked that it
// did** (entry 203): with no card open and no mail sent it read as green,
// which is how the 🧭 blocker hid here while it was reddening its neighbour.
// The filter is the **address**, not the title: CI reserves `test-charter`
// with a document of the same title, whose own creation mail would answer for
// this one. The creation mail states `/d/<slug>` in its prose (MAILS.create).
const ob = await (await fetch(BASE + '/api/dev/outbox')).json();
const held = ob.mails || ob;
const mine = held.filter((m) => JSON.stringify(m).includes('/d/' + FREE));
check(mine.length > 0, 'the send wrote a creation mail for /d/' + FREE +
  ' (the outbox held ' + held.length + ' mail(s), ' + mine.length + ' for this address' +
  (openCard ? '; the open card was ' + openCard : '') + ')');
check(refused.length === 0, 'nothing refused at the wire: ' + JSON.stringify(refused));
check(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 2)));

say(fails.length ? '\nFAILED (' + fails.length + ')' : '\nall good');
await browser.close();
process.exit(fails.length ? 1 : 0);
