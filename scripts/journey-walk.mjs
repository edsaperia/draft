/**
 * The whole journey, against a **running server**: found a document, answer
 * every task the rail offers, begin it, acknowledge the grants, then put a
 * caret in the charter and check that a keystroke opens a proposal.
 *
 * This exists because "can I get from founding a document to proposing an
 * amendment?" is a question about the *live* path, and the two probes and
 * `founding-walk.mjs` all drive the fixture — which never reaches `hydrateS`,
 * never polls, and never sends a command. Every live-only bug this project
 * has hit was invisible to them.
 *
 *   npm run server          # in another shell, with a dev outbox
 *   node scripts/journey-walk.mjs [<base-url>]
 *
 * The base defaults to `DRAFT_BASE_URL`, then `PORT`, then 8140 — the
 * server's own default. Under plan-queue the environment names the slot's
 * own server, which is the one to walk.
 *
 * CI's `walks` job runs this at every push, against a dev server it boots
 * itself and hands to all four walks (Q917 (a)).
 *
 * What it does NOT prove: anything that depends on an animation completing.
 * The automation tab runs backgrounded — rAF never fires, transitions never
 * advance — so no flight is asserted here. The **holds themselves** are a
 * different matter and were wrongly lumped in with them until 2026-08-22: a
 * hold needs a pointer held down, not a running animation, and the propose
 * hold is now driven for its full length with a render forced into the
 * middle of it — the case that used to cancel it in silence.
 * Every commit below is driven by a real pointer press for the same reason a
 * synthetic .click() is not enough, and each control is scrolled into view
 * first: a pointer cannot press what is off screen.
 */
import { chromium } from 'playwright';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
// --empty-text: found the document on a confirmed-empty text (Q649 (a)) and
// propose its first paragraph into the one empty clause the charter renders.
const EMPTY_TEXT = process.argv.includes('--empty-text');
// --new-clause (backlog 204, Q261): instead of rewriting a clause, press
// Enter at the end of the last one — a **gap site**, `G<nLines>` — and propose
// a new clause into it; the wire then holds a candidate whose hunk is a pure
// insertion (`start === end === nLines`).
const NEW_CLAUSE = process.argv.includes('--new-clause');
// **The three foundings** (Q774). The base walk answers everything itself,
// which is one founder in one mood; the two variants below are the other two,
// and each was written to break something. `--delegate-all` hands every
// delegable setting to the membership as it is served, which is the path that
// found Q775 — a delegated 🌡️ left 🪜 owed and unservable, and not one of the
// eleven questions came back. `--proposals-first` takes 🍾 💡 ⚖️ 🏛️ the moment
// any of them is offered rather than in rail order, which is the Q645 shape:
// acknowledging what a question hands you before answering the question.
// A delegating founding cannot *begin* — §9.0b resolves no blind question on
// one voice — so it ends at a served 🍾 that says what it is waiting for,
// which is the whole of what Q773 asks for and is asserted as such.
const DELEGATE_ALL = process.argv.includes('--delegate-all');
// **The sign control** (Q770, plan-queue 59): `--authorship=<rung>` is the 👤
// rung the founding takes, `sealedElective` by default — the rung under which
// the editing card carries the sign choice. The propose step asserts the
// control is there, signs, and reads the founder's name back off the wire;
// under a fixed rung (`--authorship=sealed`) it asserts the control is absent
// and the proposal unsigned.
//
// **The rung is named by its value, never by its words** (entry 136,
// 2026-09-01). This carried a frozen map of the five 👤 labels until Ed's copy
// sweeps of 2026-08-31/09-01 made every rung a clause sentence — after which
// `sealedElective` matched nothing, the walk silently took the *first* option
// on the card (`anonymous`), and the three steps below reported a missing sign
// control as the page's fault. It is the same shape as entry 87's delegate
// rung: copy is Ed's to change, `data-val` is the page's own name for the
// value and survives every rewording of it (CP1 leaves it on the button).
const AUTHORSHIP = (process.argv.find((a) => a.startsWith('--authorship=')) || '').split('=')[1] || 'sealedElective';
const ELECTIVE = AUTHORSHIP === 'anonymousElective' || AUTHORSHIP === 'sealedElective';
const PROPOSALS_FIRST = process.argv.includes('--proposals-first');
// **One founding per shape** (entry 166): `--shape=<meeting|conference|ongoing>`
// picks that rung on 🧭 at the birth; CI's `walks` job loops the three. Per
// shape the walk asserts that 🍾 is reachable after the unavoidable cards,
// that every shaped clause carries *As for a meeting.* while it is still the
// shape's, that touching 👥 by hand removes that clause's sentence and 🍾's
// line names 👥, and that no clause carries it after the press. Default
// custom, which is today's founding untouched.
const SHAPE = (process.argv.find((a) => a.startsWith('--shape=')) || '').split('=')[1] || 'custom';
const SHAPED_RUN = SHAPE !== 'custom';
// **Which gesture this run drives** (backlog 184): no override by default, so
// the walk follows the page's own `COMMIT_GESTURE`; `--gesture=hold|click`
// pins it, which is how both positions are walked from one build.
const GESTURE = (process.argv.find((a) => a.startsWith('--gesture=')) || '').split('=')[1] || '';
const PROPOSALS = ['begin', 'canpropose', 'canjudge', 'grant-voice'];
const say = (...a) => console.log(...a);
/**
 * **SURFACE §2's card lifecycle, L1–L9, each row mapped to the step of this
 * walk that performs it** (Q1239, Ed 2026-09-07; built 2026-09-08).
 * `spec-check`'s `checkLifecycle` reads this literal: every row of the table
 * has a key here and every key is printed by an `L('Ln')` line below, so the
 * table and the walk cannot drift apart in silence. Each line asserts the
 * row's *Close* and *Persistence* cells on the live path — the value is the
 * line's label, the comment the cells it holds. Where a cell reads false the
 * red line is the finding (QUESTIONS 1286), never a line softened to pass.
 */
const LIFECYCLE = {
  L1: 'L1 set',        // a setting of yours is set: on commit; the tab goes grey (every founder set in the loop)
  L2: 'L2 ✋ saved',    // an answer about yourself: on Save; your member row, and still there after a reload
  L3: 'L3 answered',   // a blind question answered (--delegate-all): on ✓; the entry leaves the rail, the card shows the count
  L4: 'L4 judged',     // a judgment cast: ✓ closes; the entry keeps its mark while a pair is left, files as ⏳ once none is (deck 3, deck 7)
  L5: 'L5 proposed',   // a motion committed: on Propose; the ✏️ entry pinned
  L6: 'L6 📧 sent',    // 📧 send: the card closes on send; the clause says to check your inbox
  L7: 'L7 owed OK',    // a decision you are owed: on OK, one press, persisted per member; the clause keeps the change line
  L8: 'L8 grant OK',   // a power arrives: on OK; ACK_KEYS per seat — not served again after a reload, the socket held
  L9: 'L9 🗑️',        // 🗑️: always closes; un-actioned input reverted (⏱️'s number, ✋'s text), the set value untouched
};
const L = (k) => LIFECYCLE[k].padEnd(11) + '· ';
// Q911: a walk on a default port will drive whatever process is listening,
// and a stale one serves today's page over a week-old engine — so the first
// thing this does is refuse a server that is not this tree.
const health = await assertServerBuild(BASE, 'journey-walk');
// which server this run drove, said out loud: the base is now the
// environment's as often as it is a person's (entry 105)
say(`journey-walk against ${BASE} · build ${health.build ?? 'unreported'}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
if (GESTURE) await page.addInitScript((g) => { window.COMMIT_GESTURE_OVERRIDE = g; }, GESTURE);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
// **A refused command is a failure even when the walk recovers from it**
// (2026-08-22). Both of the day's birth bugs went straight past this walk:
// a held commit fired twice, so the second 📧 send asked for the address the
// first had just reserved and was told 409 *that address is taken* — and the
// page dutifully walked back to 📍, which the walk simply drove through. The
// surface's own recovery is what hid it, so the check belongs at the wire.
const refused = [];
// the propose command, watched at the wire: the page’s own state says a draft
// is "mine" either way, so the only unambiguous answer is what the server was
// asked and what it said back
let proposeStatus = null;
page.on('response', (r) => { if (r.request().method() === 'POST' &&
  /propose-text/.test(r.request().postData() || '')) proposeStatus = r.status(); });
// …and it says **which** command and why. `400 POST /cmd` names the wire and
// nothing else, which on a page that posts every act through one route is a
// line you have to go and reproduce by hand.
/**
 * **A refusal a step is *about*** (plan-queue 43). The rule above stands for
 * everything else; what this excuses is the one act the walk performs in
 * order to be refused — the ❌ door pressed against an invitee after 🍾,
 * whose 400 *is* the assertion. It excuses by naming the command in the
 * body, never by a blanket allowance, and only for as long as the step that
 * pushed the pattern is running: the step that adds one takes it back out.
 */
const expectRefused = [];
page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) {
  const body = String(r.request().postData() || '');
  if (expectRefused.some((re) => re.test(body))) return;
  const at = refused.push(r.status() + ' ' + r.request().method() + ' ' + new URL(r.url()).pathname +
    ' ' + String(r.request().postData() || '').slice(0, 120)) - 1;
  r.text().then((b) => { refused[at] += ' → ' + b.slice(0, 160); }).catch(() => {});
} });
const T = (ms) => page.waitForTimeout(ms);

const rail = () => page.evaluate(() => [...document.querySelectorAll('#rail li')]
  .map((li) => li.dataset.q || ((li.querySelector('[data-card]') || { dataset: {} }).dataset.card) || '?'));
// the page's own founding readout (`window.__founding`): what is served, what
// is owed, where every key in ORDER stands, and the module's `readiness()`.
// The rail is read from the DOM above because that is what a founder sees;
// *why* it holds what it holds cannot be read from the DOM at all.
const founding = () => page.evaluate(() => (window.__founding ? window.__founding() : null));
const open = async (k) => {
  const ok = await page.evaluate((kk) => {
    const el = document.querySelector('#rail [data-card="' + kk + '"], #band [data-tab="' + kk + '"]');
    if (!el) return false;
    el.click();
    return true;
  }, k);
  await T(420);
  return ok;
};
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
const typeIn = (sel, v) => page.evaluate((a) => {
  const el = document.querySelector(a[0]);
  if (!el) return false;
  if (el.isContentEditable) {
    el.textContent = a[1];
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  } else {
    el.value = a[1];
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  return true;
}, [sel, v]);
// **A commit is a press, and what a press *is* depends on the gesture**
// (backlog 184). Under `hold` it is down · wait · up, as it always was; under
// `click` the click starts the flight and the wait is the flight's own length,
// with nothing to let go of. Asked of the page rather than assumed, so this
// walk follows `COMMIT_GESTURE` wherever it is set — including the
// `--gesture=` override, which rides `window.COMMIT_GESTURE_OVERRIDE` because
// an init script survives every `goto` where a query does not.
const pageGesture = () => page.evaluate(() => (window.SESSION && window.SESSION.gesture) || 'hold');
// a commit is a press, and a press needs the control under the pointer
const press = async (holdMs) => {
  const box = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.setupcard .commitrow button')]
      .find((x) => !x.disabled && !/🗑/.test(x.textContent));
    if (!b) return null;
    b.scrollIntoView({ block: 'center' });
    const r = b.getBoundingClientRect();
    // **A drawn commit has no text** (2026-08-22). ✋ and 🖼️ commit with the
    // drawn ✓ — two SVG paths, not the character — so `textContent` is empty
    // and the walk read a perfectly good commit as a failure to find a
    // button. It reported both as STUCK while the rail behind it was empty,
    // which is the one shape a check must not have: a false alarm on a page
    // that is working. The title is what the button says when the glyph is a
    // drawing.
    const label = b.textContent.trim() || b.getAttribute('title') || 'commit';
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, label };
  });
  if (!box) return null;
  await T(160);
  await page.mouse.move(box.x, box.y);
  if (await pageGesture() === 'click') {
    await page.mouse.click(box.x, box.y);
    await T(holdMs);
  } else {
    await page.mouse.down();
    await T(holdMs);
    await page.mouse.up();
  }
  await T(460);
  return box.label;
};

/* ---- the birth: title, link, address, then the magic link saves it ---- */
const stuck = [];
/* **A control that is not there is a FAIL line, never a TypeError** (item 261,
 * deferred until now). `page.$` answers `null` for a miss, and every
 * `scrollIntoViewIfNeeded()` / `boundingBox()` on that answer threw — which on
 * 2026-08-31 crashed the walk one step after `typing · FAIL`, so the run ended
 * with a stack trace where the report should have been and CI could say only
 * *it died*. Every such handle comes through here: the miss is said, counted,
 * and handed back as `null` for the caller to skip on. */
const handle = async (sel, what) => {
  const h = await page.$(sel);
  if (h) return h;
  say(what.padEnd(11).slice(0, 11) + '· FAIL: no ' + what + ' on the page — ' + sel);
  stuck.push(what);
  return null;
};
const TITLE = 'Journey ' + Date.now();
await page.goto(BASE + '/');
await T(800);
// on its own line, so the gesture is on the record without moving any line
// another check reads (backlog 184)
say('gesture    · ' + (await pageGesture()) + (GESTURE ? ' (--gesture=' + GESTURE + ')' : ' (the page\'s own)'));
await open('title');
await typeIn('.setupcard [data-titlelane]', TITLE);
await press(1250);
// **The birth says which card it has just pressed** (entry 203): the birth is
// four cards in a fixed order and any one of them can stop it, so a walk that
// prints only its end cannot say where it stopped. The lines are this walk's
// too, though it was never the one that stalled — the next card added to the
// order will stall whichever walk was not taught it.
say('birth      · 📝 title pressed');
await open('slug');
await press(1250);
say('birth      · 📍 slug pressed');
await open('shape');
if (!(await clickIn('.setupcard [data-set="docShape"][data-val="' + SHAPE + '"]'))) {
  say('FAIL: 🧭 offers no rung named ' + SHAPE);
  stuck.push('the 🧭 rung ' + SHAPE);
}
await press(1250);
say('birth      · 🧭 shape pressed (' + SHAPE + ')');
await open('myemail');
await typeIn('.setupcard input[type="email"]', 'ada@example.org');
await press(1250);
say('birth      · 📧 sent');
await T(1600);
// L6 — the card closes on send, and the clause reads the cell's own words:
// *checking their email* (the ⏳ it wears is the wait that is about you). Y2's
// re-open on refusal is not driven here: the address is fresh, and a refused
// birth address is `slug-walk`'s ground.
{
  const l6 = await page.evaluate(() => {
    const chip = document.querySelector('.achip[data-chip="myemail"]');
    const para = document.querySelector('.cpara[data-para="myemail"]') || (chip && chip.closest('.cpara'));
    return { card: !!document.querySelector('.setupcard'),
      clause: para ? para.textContent.replace(/\s+/g, ' ').trim() : null };
  });
  const l6Ok = !l6.card && !!l6.clause && /checking their email/i.test(l6.clause);
  say(L('L6') + (l6Ok ? 'the card closed on send; the clause reads “' + l6.clause.slice(0, 80) + '”'
    : 'FAIL: card still open ' + l6.card + ' · clause ' + JSON.stringify(l6.clause)));
  if (!l6Ok) stuck.push('L6: 📧 closes on send and the clause says to check your inbox');
}

const outbox = await (await fetch(BASE + '/api/dev/outbox')).json();
const held = outbox.mails || outbox;
const mails = held.filter((m) => JSON.stringify(m).includes(TITLE));
if (!mails.length) {
  const openCard = await page.evaluate(() => {
    const c = document.querySelector('.setupcard');
    return c ? (c.dataset.k || (c.querySelector('[data-tab]') || { dataset: {} }).dataset.tab || 'some card') : null;
  });
  say('FAIL: no creation mail for ' + TITLE + ' — the outbox held ' + held.length +
    ' mail(s), none for this title; the open card was ' + JSON.stringify(openCard) +
    ' (null means the birth is done and the mail is genuinely missing)');
  await browser.close();
  process.exit(1);
}
const link = (JSON.stringify(mails[mails.length - 1]).match(/http:[A-Za-z0-9_?=/:.-]+/) || [])[0];
await page.goto(link);
for (let i = 0; i < 40 && !page.url().includes('/d/'); i++) await T(500);
await T(2200);
say('birth      · saved at ' + page.url());
// **The pen, ✋ and 🖼️ are what the save asks for** (Ed, 2026-08-22, widened by
// Q980). Every *setting* below ✒️ in the founding order commits with the pen it
// hands over, so until it is acknowledged they are tasks the founder may not
// action — and a task you may not action is not shown at all. The two personal
// cards are the exception the pen's rule does not reach: they are committed
// with no power at all, so they stand at the save and block nothing (F2, F3).
const atSave = await rail();
const saveWant = ['grant-pen', 'myname', 'mypic'];
const saveOk = JSON.stringify([...atSave].sort()) === JSON.stringify(saveWant);
say('at save    · rail ' + JSON.stringify(atSave) +
  (saveOk ? '' : '  FAIL: expected the pen with ✋ and 🖼️, and nothing else'));
if (!saveOk) stuck.push('rail at save');
// **The column carries the document's name from the save** (backlog 33, Ed:
// *immediately after the birth, when my named document opens for the first
// time, the Text area should already have the title and hairline above it*).
// The hairline and the title are facts about the document, so they stand at
// the head of the column the founder is invited to write in — and since
// backlog 204 the text's 📝 tab stands beside them **from the save**, in the
// riding `#ridetab`, there being no task whose turn it waits for; the
// pre-save heading that said the same thing a screen higher is gone by the
// same act. Checked live because this is the one step the fixture cannot
// reach: the save is a real POST and a real magic link.
const proseHead = await page.evaluate(() => ({
  dochead: (document.getElementById('dochead') || {}).textContent || null,
  hairline: !!document.querySelector('.cpara.docsep'),
  chips: document.querySelectorAll('.cpara.textanchor .achip').length,
  tab: !!document.querySelector('#ridetab .achip[data-tab="text"]'),
  editable: document.getElementById('prose').getAttribute('contenteditable'),
  presave: !!(document.getElementById('titlepara') || {}).offsetParent,
}));
const headOk = proseHead.dochead === TITLE && proseHead.hairline &&
  proseHead.chips === 0 && proseHead.tab && proseHead.editable === 'false' && !proseHead.presave;
say('at save    · prose head ' + JSON.stringify(proseHead) +
  (headOk ? '' : '  FAIL: the column should head with the hairline, the title and the riding 📝 tab, in read mode'));
if (!headOk) stuck.push('the prose column head at the save');

/* ---- the text, written from the save (backlog 204) ----------------------
 * 📄's task is gone: the founder presses 📝, writes, and the row's ✒️ saves
 * — no OK anywhere, and nothing in the founding waits for it. With
 * --empty-text the column is left alone and 🍾 confirms it empty (Q1080). */
if (!EMPTY_TEXT) {
  const wrote = await page.evaluate(() => {
    const tab = document.querySelector('#ridetab .achip[data-tab="text"]');
    if (!tab) return { tab: false };
    tab.click();
    const pr = document.getElementById('prose');
    const ghost = document.querySelector('#charter > .prose');
    const out = { tab: true, editable: pr.getAttribute('contenteditable'),
      editing: document.getElementById('doc').classList.contains('editing'),
      row: !!document.querySelector('#proserow [data-proposalrow]'),
      // the charter's empty pre-🍾 column must stay invisible: no height,
      // no card (Ed's QA, 2026-08-30 — the edit-mode lift once gave it 100vh)
      ghostH: ghost ? Math.round(ghost.getBoundingClientRect().height) : 0 };
    pr.innerHTML = '<div>The clubhouse shall be kept open on Tuesdays.</div>' +
      '<div>Every member may bring one guest.</div>';
    pr.classList.remove('empty');
    pr.dispatchEvent(new InputEvent('input', { bubbles: true }));
    // **the card's geometry before 🍾** (Ed's QA, 2026-08-30): the tab rests
    // level with the first line; at the page's end the card's foot is
    // `.doc`'s own and the row floats over it at the window's foot
    return out;
  });
  await T(300);
  Object.assign(wrote, await page.evaluate(() => {
    const pr = document.getElementById('prose');
    const tab = document.querySelector('#ridetab .achip[data-tab="text"]');
    const row = document.querySelector('#proserow [data-proposalrow]');
    const o = { lineDelta: tab && pr.firstElementChild ? Math.round(tab.getBoundingClientRect().top - pr.firstElementChild.getBoundingClientRect().top) : null };
    window.scrollTo(0, document.body.scrollHeight);
    const doc = document.querySelector('.doc').getBoundingClientRect();
    o.footDelta = Math.round(doc.bottom - pr.getBoundingClientRect().bottom);
    o.rowAtFoot = row ? Math.round(doc.bottom - row.getBoundingClientRect().bottom) : null;
    o.tabRode = tab ? tab.getBoundingClientRect().top < innerHeight / 2 : null;
    window.scrollTo(0, 0);
    return o;
  }));
  await T(300);
  const saved = await page.evaluate(() => {
    const b = document.querySelector('#proserow [data-act="row-commit"]');
    const glyph = b ? b.textContent.trim() : null;
    if (!b || b.disabled) return { glyph, live: false };
    b.click();
    return { glyph, live: true };
  });
  await T(600);
  const confirmed = await page.evaluate(() =>
    fetch(location.pathname.replace('/d/', '/api/d/') + '/view').then((r) => r.json())
      .then((v) => ({ textConfirmed: !!v.textConfirmed, text: v.text })));
  const wroteOk = wrote.tab && wrote.editable === 'true' && wrote.editing && wrote.row && wrote.ghostH === 0 &&
    Math.abs(wrote.lineDelta) <= 1 && Math.abs(wrote.footDelta) <= 1 && Math.abs(wrote.rowAtFoot) <= 2 && wrote.tabRode &&
    saved.glyph === '✒️' && saved.live && confirmed.textConfirmed && /Tuesdays/.test(String(confirmed.text || ''));
  say('text       · ' + (wroteOk ? '📝 enters edit mode, the row wears ✒️, the charter column stays invisible, and one press saves the column — no OK'
    : 'FAIL: ' + JSON.stringify({ wrote, saved, confirmed })));
  if (!wroteOk) stuck.push('writing the text from the save');
  // leaving: 📝 again, the column back to read mode
  await page.evaluate(() => document.querySelector('#ridetab .achip[data-tab="text"]').click());
  await T(200);
}

/* ---- the founding: whatever the rail asks, one task at a time ---- */
// how many options an open card offers, so the walk can try the next one when
// the first leaves the ✓ dark: a blind answer's rungs are not interchangeable
// (*At a set time* wants a date beside it), and the walk must not assume that
// the first thing it can click is a complete answer.
const options = (wantDelegate) => page.evaluate((del) => {
  const all = [...document.querySelectorAll('.setupcard [data-set],.setupcard [data-ans]')]
    .filter((x) => (x.dataset.val || x.dataset.ansval) && x.offsetParent !== null);
  // **The delegate rung is found by its own class, never by its words.** This
  // read `/delegate/i` over the label until entry 87 renamed it *Let the
  // membership decide this* — after which `--delegate-all` silently handed over
  // nothing at all, answered every question itself, walked to a begun document
  // and failed at its own last line. Copy is Ed's to change; `.delegrung` is the
  // page's own name for the rung and survives every rewording of it.
  const isDel = (x) => !!x.closest('.delegrung');
  const wanted = del ? all.filter(isDel) : all.filter((x) => !isDel(x));
  // **The label is the block's text, not the button's** (CP1, 2026-08-31):
  // every radio reads *Prefer this* now, so the words that name an option
  // live on its `.opttext`; the button is the fallback for a textless block
  // (Indifferent), whose radio names the act itself.
  // **And it is the whole text** (entry 136, 2026-09-01): it was cut to 48
  // characters for the log, and once the rungs became clause sentences 👤's
  // *sealed* and *sealedElective* shared their first 64 — so the walk asked
  // for one and clicked the other, silently. Cutting is the printing's job
  // now (`short`), never the matching's.
  const labelOf = (x) => { const p = x.closest('.pick');
    const t = p && p.querySelector('.opttext');
    return ((t && t.textContent) || x.textContent).trim(); };
  return (wanted.length ? wanted : all).map(labelOf);
}, wantDelegate);
const short = (s) => (s && s.length > 48 ? s.slice(0, 47) + '…' : s);
// the same question the other way round: which of the labels on the open card
// belong to the delegate rung, so *what was chosen* can be told apart from its
// wording at the two sites below that used to match on it
const delegLabels = () => page.evaluate(() =>
  [...document.querySelectorAll('.setupcard .delegrung [data-set],.setupcard .delegrung [data-ans]')]
    .filter((x) => (x.dataset.val || x.dataset.ansval))
    .map((x) => { const p = x.closest('.pick');
      const t = p && p.querySelector('.opttext');
      return ((t && t.textContent) || x.textContent).trim(); }));
// the label a value wears **right now**, read off the open card: the one
// bridge between a run's `--authorship=<rung>` and a picker that works in
// labels, so no wording is ever written down here (see AUTHORSHIP above)
const labelForValue = (key, val) => page.evaluate(([k, v]) => {
  const o = document.querySelector('.setupcard [data-set="' + k + '"][data-val="' + v + '"]');
  if (!o || o.offsetParent === null) return null;
  const p = o.closest('.pick');
  const t = p && p.querySelector('.opttext');
  return ((t && t.textContent) || o.textContent).trim();
}, [key, val]);
const pickOption = (label) => page.evaluate((l) => {
  const labelOf = (x) => { const p = x.closest('.pick');
    const t = p && p.querySelector('.opttext');
    return ((t && t.textContent) || x.textContent).trim(); };
  const o = [...document.querySelectorAll('.setupcard [data-set],.setupcard [data-ans]')]
    .filter((x) => (x.dataset.val || x.dataset.ansval) && x.offsetParent !== null)
    .find((x) => labelOf(x) === l);
  if (!o) return null;
  o.scrollIntoView({ block: 'center' });
  const r = o.getBoundingClientRect();
  return { x: r.x + 14, y: r.y + r.height / 2 };
}, label);
const fillFields = () => page.evaluate(() => {
  // **One number per choice group** (Q1162): 👥 draws two blocks each with
  // its own box, and filling both would answer in two forms at once — the
  // last claim winning, which committed a count of 5 in a room of 2. The
  // first block is the share form, which is what the walk always answered.
  const takenChoice = new Set();
  return document.querySelectorAll('.setupcard input, .setupcard textarea').forEach((n) => {
    // **A consent slider always has a value and still needs touching** — it is
    // greyed until it is, because a range control with no default still paints
    // its thumb somewhere. So it cannot be skipped for having a `.value` the
    // way every other field is: the walk has to move it and say so.
    // **and both events, because the page listens for both**: a blind answer's
    // own fields (`[data-ansnum]`, `[data-ansdate]`) write on `change`, where
    // every founder-side field writes on `input`. Dispatching only `input` left
    // ⏱️'s answer reading *Not answered yet* beside a filled-in number.
    const fire = () => { for (const e of ['input', 'change'])
      n.dispatchEvent(new Event(e, { bubbles: true })); };
    if (n.type === 'range') {
      // A consent slider always has a value and still needs touching — it is
      // greyed until it is, because a range control with no default still
      // paints its thumb somewhere. So it cannot be skipped for having a
      // `.value` the way every other field is. Snapped to its own step: 👥's
      // share runs 5–100 by 5s, and an off-grid answer is not one a member
      // could give. (🌡️ was the other one until entry 165 made it rungs.)
      const lo = +n.min || 0; const hi = +n.max || 100; const st = +n.step || 1;
      n.value = String(Math.min(hi, lo + Math.round((hi - lo) / 2 / st) * st));
      return fire();
    }
    if (n.value || /^(email|radio|checkbox|file|hidden|color)$/.test(n.type)) return;
    if (n.type === 'number') {
      const ch = n.closest('.choice');
      if (ch && takenChoice.has(ch)) return;
      if (ch) takenChoice.add(ch);
      n.value = String(Math.max(+n.min || 1, 5));
    }
    else if (n.type === 'datetime-local') n.value = '2026-09-18T18:00';
    else n.value = 'The club shall meet on the first Tuesday.';
    fire();
  });
});
const committable = () => page.evaluate(() =>
  [...document.querySelectorAll('.setupcard .commitrow button')]
    .some((x) => !x.disabled && !/🗑/.test(x.textContent)));

/* ---- the invite door (backlog 51, Q811–Q816) ---------------------------
 * Ed, on genesis: *I managed to invite one additional member … and further
 * ones don't work; their names don't appear in the list, and they don't
 * receive emails.* Every act on the 🪪 card was fire-and-forget, so a refusal
 * and a success looked identical — which is why this is checked **here**: the
 * fixture never sends a command, so no refusal exists there to be swallowed.
 * Three things, at the two moments they can each go wrong. */
const STAMP = String(Date.now()).slice(-8);
const GUEST1 = 'bo' + STAMP + '@example.org';
const GUEST2 = 'cy' + STAMP + '@example.org';
// the membership as the clause states it: address and chips, per row
// **and the name and the face on it** (Q850): the register is public, so
// what a row *says* about a person is as checkable as that it is there.
// `.nm` carries the chips too, so the name is its first text node; the face
// is an `.emojiface` glyph or the `.av` that stood in for one.
/* **The register is the document's own text now** (entry 95, Q916). This
 * read `.roster.clauselist .rperson` inside the 🪪 card, and once that
 * markup went it matched nothing at all — so every row assertion in this
 * walk was reading an empty array. Membership is one lvl-3 subsection per
 * status, `.memrow` beneath each. Three consequences worth knowing:
 *
 *  · `memSub` renders **the card instead of its rows** whenever a card in
 *    that subsection's pile is open, so a row can only be read with the
 *    card shut — hence `closeCard` before every read below.
 *  · **status is the heading, not a chip.** Somebody is an invitee because
 *    they sit under *Invitees*; there is no `invited` chip to test.
 *  · `memRow` prints an address only until a name arrives, so an invitee is
 *    found by address and a joined member by name — never both. */
const MEM_SEC = { members: 'cs-mem-members', invitees: 'cs-mem-invitees',
  applicants: 'cs-mem-applicants', removal: 'cs-mem-proposed-for-removal' };
// **A click on nothing outside the card closes it** (SURFACE C2, Ed
// 2026-09-06): every close in this walk is that gesture, with a real pointer,
// on the blank column left of the document — so the rule is exercised at each
// of its call sites, and a card that stays open under it is a failure that
// names itself. The chip was the old way; it still works, but is not the rule.
const closeCard = async () => {
  const had = await page.evaluate(() => !!document.querySelector('.setupcard'));
  if (!had) return;
  // the spot has to be nothing *now*: the page scrolls as the walk goes, and
  // the column left of the document holds the contents rail's links at the
  // top — so it is searched for, by the page's own test, rather than assumed
  const spot = await page.evaluate(() => {
    const d = document.getElementById('doc').getBoundingClientRect();
    const x = Math.max(8, d.left - 60);
    const control = 'a, button, input, textarea, select, label, [role="button"], [contenteditable="true"], ' +
      '.achip, [data-tab], [data-card], [data-anchor], [data-q], [data-toc], .setupcard, .sugg, nav, aside';
    for (let y = window.innerHeight - 60; y > 80; y -= 40) {
      const el = document.elementFromPoint(x, y);
      if (el && !el.closest(control)) return { x, y };
    }
    return null;
  });
  if (!spot) { stuck.push('no dead spot to click beside the document'); return; }
  await page.mouse.click(spot.x, spot.y);
  await T(480);
  const still = await page.evaluate(() => !!document.querySelector('.setupcard'));
  if (still) {
    stuck.push('a click on nothing outside the open card did not close it (SURFACE C2)');
    await page.evaluate(() => { const a = document.querySelector('.setupcard .chipcol .achip'); if (a) a.click(); });
    await T(420);
  }
};
/** Rows under one Membership subsection, or null if the heading is absent. */
const rowsUnder = (which) => page.evaluate((id) => {
  const h = document.getElementById(id);
  if (!h) return null;
  const body = h.nextElementSibling;
  if (!body) return [];
  return [...body.querySelectorAll('.memrow')]
    .filter((r) => !r.classList.contains('nobody'))
    .map((r) => ({
      t: ((r.querySelector('.mn') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
      face: ((r.querySelector('.emojiface') || {}).textContent ||
        ((r.querySelector('.av') || {}).className || '(no avatar)')).trim(),
    }));
}, MEM_SEC[which]);
const refusalLine = () => page.evaluate(() =>
  ((document.querySelector('.setupcard .why.refusal') || {}).textContent || '').trim());
// **One box since Q1166** (Ed's card review, 2026-09-02): the single-address
// field and its Enter-sends promise (Q814) retired with it — Enter in a
// multi-line box is a newline — and the send is the commit row's ✒️.
const inviteFrom = async (addr) => {
  await typeIn('.setupcard [data-emails]', addr);
  await T(120);
  await clickIn('.setupcard .commitrow [data-act="invite"]');
  await T(900);
};
const inviteDoorPreBegin = async () => {
  await inviteFrom(GUEST1);
  await inviteFrom(GUEST2);
  // the rows live under *Invitees*, which the open ✉️ card is standing in
  // front of — so it is shut to read them, and opened again to carry on
  await closeCard();
  const rows = (await rowsUnder('invitees')) || [];
  // an invitee has given no name, so `memRow` shows the address — as its
  // local part, which is what the row prints and all there is to match on
  const isRowFor = (r, a) => r.t.includes(a) || r.t === a.split('@')[0];
  const listed = [GUEST1, GUEST2].filter((a) => rows.some((r) => isRowFor(r, a)));
  say('invite ×2  · ' + JSON.stringify(rows.map((r) => r.t)) +
    (listed.length === 2 ? '' : '  FAIL: both should be listed under Invitees'));
  if (listed.length !== 2) stuck.push('two invitations from the single-name field');
  await open('invite');

  const ob = await (await fetch(BASE + '/api/dev/outbox')).json();
  const posted = JSON.stringify(ob.mails || ob);
  const mailed = [GUEST1, GUEST2].filter((a) => posted.includes(a));
  say('their mail · ' + mailed.length + ' of 2 in the outbox' +
    (mailed.length === 2 ? '' : '  FAIL: an invitation with no mail is the reported symptom'));
  if (mailed.length !== 2) stuck.push('invitation mail');

  // **A door that will not open says why** (Q811), and the address is
  // compared the way the store compares it (Q815): the store lowercases
  // every address it takes, so a case variant used to walk past the page's
  // own check into a server refusal nobody could see.
  await inviteFrom(GUEST1.toUpperCase());
  const said = await refusalLine();
  const refusalOk = /already on the membership/i.test(said);
  say('refusal    · ' + (refusalOk ? '“' + said + '”'
    : 'FAIL: a duplicate address said ' + JSON.stringify(said)));
  if (!refusalOk) stuck.push('the refusal sentence on ✉️');
  // and it is about what is in the field, so the next keystroke retires it
  await typeIn('.setupcard [data-emails]', '');
  await T(220);
  const cleared = !(await refusalLine());
  say('cleared    · ' + (cleared ? 'the next keystroke retires it'
    : 'FAIL: the refusal outlived the field'));
  if (!cleared) stuck.push('the refusal did not clear');

  // **The mark sits on the act, and the row only closes** (entry 37). The
  // direct ✉️ sends from the field, so the ✒️ belongs on the send; the row's
  // own ✒️ was a pen over a card with no value to set — `invite` is a
  // `DOOR_KEY`, never a `MANAGED_KEY`, so `[data-confirm]` closed the card
  // having done nothing, after running the hold and flying the pen out of the
  // wallet. What is asserted is the whole of the correction: the send wears
  // ✒️, and the row holds 🗑️ and a ✓ that closes and **no** `[data-confirm]`.
  // The button's height rides along because a 52×40 glyph button in a flex row
  // beside a `flex: 1` input is the one thing that could come out a different
  // size from every other pen button on the page.
  // **The send is the row's commit since Q1166** (Ed's card review): the box
  // is the body, ✒️ sends from the commit row, and there is no closing ✓ and
  // no [data-confirm] pen — the mark still sits on the act.
  const marks = await page.evaluate(() => {
    const c = document.querySelector('.setupcard');
    const row = c && c.querySelector('.commitrow');
    const send = row && row.querySelector('[data-act="invite"]');
    return {
      send: send ? (send.textContent || '').trim() : '(no send button)',
      h: send ? Math.round(send.getBoundingClientRect().height) : 0,
      title: send ? send.title : '',
      bin: !!(row && row.querySelector('[data-revert]')),
      confirm: !!(row && row.querySelector('[data-confirm]')),
    };
  });
  const marksOk = marks.send === '✒️' && marks.bin && !marks.confirm;
  say('the mark   · send ' + JSON.stringify(marks.send) + ' (' + marks.h + 'px, “' +
    marks.title + '”) · row 🗑️ ' + marks.bin + ' confirm ' + marks.confirm +
    (marksOk ? '' : '  FAIL: the ✒️ send belongs on the row, with 🗑️ and no pen'));
  if (!marksOk) stuck.push('the ✒️ on ✉️’s row');
};

/* ---- a second seat (backlog 50, Q842–Q848) ------------------------------
 * Ed's ruling, and the whole of what it changes: *a setting that predates you
 * is simply what the document says; a power handed to you is news addressed
 * to you.* Neither half of it can be seen from the founder's chair, and
 * nothing else in the project drives a second one — `dev-ladder.ts` presses
 * every owed OK for every member in one go at the constitution rung, and
 * `founding-walk.mjs` is the founder alone in the fixture. So an invited
 * member follows their own invitation into a second browser context here,
 * and their seat is asked the two questions:
 *   1 — pre-Begin, is anything the founder set before this arrival being
 *       served as an acknowledgement? (Nine were, on every real document.)
 *   2 — post-Begin, does **one** press of OK dismiss an amendment's task?
 *       It took two: the press sent `give-ok` and re-rendered against the
 *       view fetched before it, which put the task straight back. The
 *       reload is the tell — the second half of the check passed before the
 *       fix only *after* a reload, which is the signature of the mechanism.
 */
// the constitutional settings, in the page's own keys: what a founder settles
// during the founding and what a late arrival used to be handed nine of
const PREDATING = ['ending', 'bar', 'quorum', 'authorship', 'judgments',
  'chamber', 'lapse', 'applications', 'removal'];
const AMENDED = 'chamber'; // 🌍, constitutional and founder-held after this founding
let guestPage = null;
let guestOks = 0;
// the readout and the rail, read the way `founding()` and `rail()` read the
// founder's — the rail from the DOM, because that is what the member sees
const guestState = () => guestPage.evaluate(() => ({
  f: window.__founding ? window.__founding() : null,
  rail: [...document.querySelectorAll('#rail li')].map((li) => li.dataset.q ||
    ((li.querySelector('[data-card]') || { dataset: {} }).dataset.card) || '?'),
}));
const invitationLink = async (addr) => {
  const ob = await (await fetch(BASE + '/api/dev/outbox')).json();
  const mail = (ob.mails || ob).find((m) => JSON.stringify(m).includes(addr));
  return mail ? (JSON.stringify(mail).match(/http:[A-Za-z0-9_?=/:.-]+/) || [])[0] : null;
};
const guestLand = async (url) => {
  await guestPage.goto(url);
  for (let i = 0; i < 40 && !guestPage.url().includes('/d/'); i++) {
    await guestPage.waitForTimeout(500);
  }
  await guestPage.waitForTimeout(2600);
};
const secondSeatPreBegin = async () => {
  const link = await invitationLink(GUEST1);
  if (!link) {
    say('second seat· FAIL: no invitation link in the outbox for ' + GUEST1);
    stuck.push('the invitation link'); return;
  }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  guestPage = await ctx.newPage();
  guestPage.on('pageerror', (e) => errors.push('[guest] ' + String(e)));
  guestPage.on('response', (r) => { if (r.request().method() === 'POST' &&
    /give-ok/.test(r.request().postData() || '')) guestOks += 1; });
  guestPage.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) {
    refused.push('[guest] ' + r.status() + ' ' + r.request().method() + ' ' +
      new URL(r.url()).pathname + ' ' + String(r.request().postData() || '').slice(0, 120));
  } });
  await guestLand(link);
  const { f } = await guestState();
  if (!f) {
    say('second seat· FAIL: no window.__founding in the invited seat at ' + guestPage.url());
    stuck.push('the member seat'); return;
  }
  say('second seat· ' + GUEST1.split('@')[0] + ' at ' + guestPage.url() +
    ' · founder=' + f.amFounder + ' begun=' + f.constituted);
  if (f.amFounder || f.constituted) {
    say('             FAIL: the invited seat should be a member of an unbegun document');
    stuck.push('the invited seat');
  }
  const owed = (f.served || []).filter((k) => PREDATING.includes(k));
  say('predates   · ' + (owed.length === 0
    ? 'nothing set before this arrival is served · served ' + JSON.stringify(f.served)
    : 'FAIL: ' + JSON.stringify(owed) + ' are served as acknowledgements before 🍾'));
  if (owed.length) stuck.push('pre-Begin acks in the member seat: ' + owed.join(','));
};
/* ---- names and faces reach every seat (backlog 42, Q850–Q853) -----------
 * The register is public by the spec's own test — names, pictures, who has
 * arrived — and the module has always projected all three to every seat. The
 * page threw two thirds of it away: it read `rec.name` only on the push that
 * *created* a row, and skipped the founder's row outright, so an invitee read
 * the founder as *Anonymous*, never saw their face, and never saw a name
 * anybody chose after their row already existed.
 *
 * It is a second-seat bug by construction. From the founder's own chair every
 * name on the page is one the founder's page put there, so no fixture walk and
 * no single-seat walk can see it — which is why it is checked here, and why
 * both directions run through the **4s poll** rather than a reload: a reload
 * rebuilds the rows from the module and would pass either way.
 */
const FOUNDER_NAME = 'Ada Lovelace';
const FOUNDER_FACE = 'e🦉';
const GUEST_NAME = 'Bo Marlowe';
const GUEST_FACE = 'e🦊';
// Set at the wire, for the reason the amendment below is: what is under test
// is what the *other* seat renders, and driving ✋ and 🖼️ through their own
// cards would be two more things to go wrong inside one check. Both were
// committed through their own cards earlier in this walk, so the surface half
// of setting an identity is covered where it belongs.
const setIdentityAt = (pg, args) => pg.evaluate((a) =>
  fetch(location.pathname.replace('/d/', '/api/d/') + '/cmd', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cmd: 'set-identity', args: a }),
  }).then((r) => r.json()).catch((e) => ({ error: String(e && e.message) })), args);
const identityReachesEverySeat = async () => {
  if (!guestPage) return; // its own failure, already reported
  const said = await setIdentityAt(page, { name: FOUNDER_NAME, picture: FOUNDER_FACE });
  if (said && said.error) {
    say('identity   · FAIL: the founder could not set a name and a face · ' +
      JSON.stringify(said.error));
    stuck.push('set-identity for the founder'); return;
  }
  await T(5500); // one poll in the member's seat, and a little air
  // the Founded line is where the founder appears in the document, and it is
  // drawn from the founder's own roster row — the row that was skipped
  const founded = await guestPage.evaluate(() => {
    const p = document.querySelector('.cpv.founded');
    return p ? { text: p.textContent.replace(/\s+/g, ' ').trim(),
      face: ((p.querySelector('.emojiface') || {}).textContent ||
        ((p.querySelector('.av') || {}).className || '(no avatar)')).trim() } : null;
  });
  if (!founded) {
    say('the founder· FAIL: no Founded line in the invited seat');
    stuck.push('the Founded line in the member seat'); return;
  }
  const named = founded.text.includes(FOUNDER_NAME) && !/Anonymous/.test(founded.text);
  say('the founder· ' + JSON.stringify(founded) +
    (named ? '' : '  FAIL: the invited seat should read the founder’s name, never Anonymous'));
  if (!named) stuck.push('the founder’s name in the member seat');
  const faced = founded.face === FOUNDER_FACE.slice(1);
  say('their face · ' + (faced ? 'the founder’s face reaches the invited seat'
    : 'FAIL: expected ' + FOUNDER_FACE.slice(1) + ', got ' + JSON.stringify(founded.face)));
  if (!faced) stuck.push('the founder’s face in the member seat');

  // …and the other way, which is the half that has nothing to do with the
  // founder at all: a member chooses a name and a face on their own seat,
  // long after their row was pushed, and it reaches the register everybody
  // else is reading.
  const back = await setIdentityAt(guestPage, { name: GUEST_NAME, picture: GUEST_FACE });
  if (back && back.error) {
    say('identity   · FAIL: the member could not set a name and a face · ' +
      JSON.stringify(back.error));
    stuck.push('set-identity for the member'); return;
  }
  await T(5500);
  // the register is document text now (entry 95), so it is read with every
  // card shut — and by this point the guest has joined and named themselves,
  // so they are under *Members* and found by name: `memRow` prints an
  // address only while there is no name to print instead
  await closeCard();
  const rows = await rowsUnder('members');
  if (rows === null) {
    say('their seat · FAIL: no Members subsection to read the register from');
    stuck.push('the Members subsection'); return;
  }
  const row = rows.find((r) => r.t.includes(GUEST_NAME));
  const reached = !!row && row.face === GUEST_FACE.slice(1);
  say('their seat · ' + JSON.stringify(row || rows.map((r) => r.t)) +
    (reached ? '' : '  FAIL: a name and a face chosen after the row existed did not reach the founder'));
  if (!reached) stuck.push('the member’s name and face in the founder’s register');
};

/* ---- L2 and L9 (SURFACE §2, Q1239) --------------------------------------
 * The two presses the walk did not make. **L2**: an answer about yourself is
 * saved — ✋ typed and Saved on the live path closes on Save, lands on your
 * member row, and is still there after a reload. **L9**: 🗑️ on a card with
 * un-actioned input puts it back — ⏱️'s set number typed over and binned is
 * untouched in the document and the reopened card shows the set value; text
 * typed on ✋ and binned is gone on reopen, the row unchanged. Both at the
 * last moment before 🍾, where every founder card is still the founder's own
 * and the register is on the page. Read with the card shut where the rows
 * are read (`memSub` draws the card in place of its rows). */
const lifecycleL2 = async () => {
  if (!(await open('myname'))) { say(L('L2') + 'FAIL: no ✋ tab to open'); stuck.push('L2: the ✋ tab'); return; }
  await typeIn('.setupcard input[data-txt="myname"]', FOUNDER_NAME);
  await T(200);
  const label = await press(1250);
  const closed = !(await page.evaluate(() => !!document.querySelector('.setupcard')));
  const rowNow = ((await rowsUnder('members')) || []).find((r) => r.t.includes(FOUNDER_NAME)) || null;
  await page.reload();
  await T(3200);
  const rowAfter = ((await rowsUnder('members')) || []).find((r) => r.t.includes(FOUNDER_NAME)) || null;
  const ok = !!label && closed && !!rowNow && !!rowAfter;
  say(L('L2') + (ok ? '✋ Saved (' + label + ') closes the card; the member row reads “' + rowNow.t + '” and still does after a reload'
    : 'FAIL: pressed ' + JSON.stringify(label) + ' · closed ' + closed + ' · row ' + JSON.stringify(rowNow) +
      ' · after reload ' + JSON.stringify(rowAfter)));
  if (!ok) stuck.push('L2: ✋ saved on the live path');
};
const lifecycleL9 = async () => {
  const rateValue = () => page.evaluate(() => fetch(location.pathname.replace('/d/', '/api/d/') + '/view')
    .then((r) => r.json())
    // the module's view rides under `view` on the wire (`cs.v.view` in the page)
    .then((v) => JSON.stringify((((v.view || v).settings || []).find((s) => s.setting === 'rate') || {}).value)));
  const field = (sel) => page.evaluate((s) => (document.querySelector(s) || {}).value, sel);
  const cardOpen = () => page.evaluate(() => !!document.querySelector('.setupcard'));
  // ⏱️ — the set number typed over, then binned
  if (!(await open('rate'))) { say(L('L9') + 'FAIL: no ⏱️ tab to open'); stuck.push('L9: the ⏱️ tab'); return; }
  const before = await rateValue();
  const v0 = await field('.setupcard input[data-num="dripN"]');
  const typed = String((+v0 || 5) + 7);
  await typeIn('.setupcard input[data-num="dripN"]', typed);
  await T(250);
  await clickIn('.setupcard [data-revert]');
  const closed = !(await cardOpen());
  const after = await rateValue();
  const reopened = (await open('rate')) ? await field('.setupcard input[data-num="dripN"]') : '(would not reopen)';
  await closeCard();
  const rateOk = closed && before === after && reopened === v0 && v0 !== undefined;
  say(L('L9') + (rateOk ? '⏱️ ' + v0 + ' typed over as ' + typed + ', 🗑️ closes; the document still holds ' + before +
      ' and the reopened card reads ' + reopened
    : 'FAIL: ⏱️ · closed ' + closed + ' · value ' + before + ' → ' + after + ' · reopened reads ' +
      JSON.stringify(reopened) + ' (set ' + JSON.stringify(v0) + ')'));
  if (!rateOk) stuck.push('L9: 🗑️ on ⏱️');
  // ✋ — text typed, then binned: gone on reopen, the row untouched
  if (!(await open('myname'))) { say(L('L9') + 'FAIL: no ✋ tab to open'); stuck.push('L9: the ✋ tab'); return; }
  const n0 = await field('.setupcard input[data-txt="myname"]');
  await typeIn('.setupcard input[data-txt="myname"]', 'Scratch Name');
  await T(250);
  await clickIn('.setupcard [data-revert]');
  const closed2 = !(await cardOpen());
  const n1 = (await open('myname')) ? await field('.setupcard input[data-txt="myname"]') : '(would not reopen)';
  await closeCard();
  const rows = (await rowsUnder('members')) || [];
  const nameOk = closed2 && n1 === n0 && rows.some((r) => r.t.includes(FOUNDER_NAME)) &&
    !rows.some((r) => r.t.includes('Scratch Name'));
  say(L('L9') + (nameOk ? '✋ typed “Scratch Name”, 🗑️ closes; reopened, the field reads ' + JSON.stringify(n1) +
      ' and the row still reads ' + FOUNDER_NAME
    : 'FAIL: ✋ · closed ' + closed2 + ' · field before ' + JSON.stringify(n0) + ' after ' + JSON.stringify(n1) +
      ' · rows ' + JSON.stringify(rows.map((r) => r.t))));
  if (!nameOk) stuck.push('L9: 🗑️ on ✋');
};

const secondSeatOnAmendment = async () => {
  if (!guestPage) return; // its own failure, already reported
  // the founder amends a constitutional setting they still hold, at the wire:
  // what is under test is the *member's* single press, and driving 🌍's card
  // through the band would be a second thing to go wrong in the same check
  const said = await page.evaluate((k) => fetch(location.pathname.replace('/d/', '/api/d/') + '/cmd', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cmd: 'set-setting', args: { setting: k,
      value: { rung: 'public' }, why: 'so the cohort can read along' } }),
  }).then((r) => r.json()).catch((e) => ({ error: String(e && e.message) })), AMENDED);
  if (said && said.error) {
    say('amendment  · FAIL: the founder could not amend 🌍 · ' + JSON.stringify(said.error));
    stuck.push('the post-start amendment'); return;
  }
  await T(5000); // one poll in the member's seat, and a little air
  const arrived = await guestState();
  const isServed = (s) => ((s.f || {}).served || []).includes(AMENDED) ||
    (s.rail || []).includes(AMENDED);
  say('amendment  · ' + (isServed(arrived)
    ? '🌍 reaches the member as a task · rail ' + JSON.stringify(arrived.rail)
    : 'FAIL: an amendment made after this member arrived is not served · served ' +
      JSON.stringify((arrived.f || {}).served) + ' · rail ' + JSON.stringify(arrived.rail)));
  if (!isServed(arrived)) {
    stuck.push('the amendment did not reach the member'); return;
  }
  // …and the start is not a second chance to serve what predates them: 🍾
  // ends the era in which the founder may re-set freely, so everything they
  // settled before this member arrived is now simply what the document says.
  const before2 = (arrived.f.served || [])
    .filter((k) => PREDATING.includes(k) && k !== AMENDED);
  say('predates 2 · ' + (before2.length === 0
    ? 'and 🍾 serves none of what was settled before this arrival'
    : 'FAIL: ' + JSON.stringify(before2) + ' predate this member and are served · ' +
      JSON.stringify((arrived.f.order || [])
        .filter((l) => before2.some((k) => String(l).startsWith(k + ' ')))) +
      ' · okd ' + JSON.stringify(arrived.f.okd) + ' · owed ' + JSON.stringify(arrived.f.owed)));
  if (before2.length) stuck.push('post-🍾 acks that predate the member: ' + before2.join(','));
  // one press, and one only
  const before = guestOks;
  await guestPage.evaluate((k) => {
    const el = document.querySelector('#rail [data-card="' + k + '"]');
    if (el) el.click();
  }, AMENDED);
  await guestPage.waitForTimeout(500);
  const pressed = await guestPage.evaluate(() => {
    const b = document.querySelector('.setupcard [data-ok]');
    if (!b || b.disabled) return false;
    b.scrollIntoView({ block: 'center' });
    b.click();
    return true;
  });
  if (!pressed) {
    say('one press  · FAIL: no OK on the member’s 🌍 card');
    stuck.push('the member’s OK button'); return;
  }
  await T(5000); // >4s: a poll lands, carrying the view the press was not in
  const after = await guestState();
  const gone = !isServed(after);
  say('one press  · ' + (gone ? 'the task leaves and stays gone through a poll'
    : 'FAIL: one press did not dismiss it · served ' + JSON.stringify((after.f || {}).served) +
      ' · rail ' + JSON.stringify(after.rail)));
  if (!gone) stuck.push('the OK took more than one press');
  // …and the module agrees, which is what a reload asks it
  await guestLand(guestPage.url());
  const reloaded = await guestState();
  const stillGone = !isServed(reloaded);
  say('reloaded   · ' + (stillGone ? 'the module has the acknowledgement'
    : 'FAIL: the task came back on a reload · served ' + JSON.stringify((reloaded.f || {}).served)));
  if (!stillGone) stuck.push('the OK did not reach the module');
  say('give-ok    · ' + (guestOks - before) + ' sent for one press' +
    (guestOks - before === 1 ? '' : '  FAIL: expected exactly one'));
  if (guestOks - before !== 1) stuck.push('give-ok was sent ' + (guestOks - before) + ' times');
  // L7 — the close and the persistence are the three lines above (one press,
  // gone through a poll, still gone after a reload); what is left is the
  // clause keeping the change line: the settled card, opened from its tab
  // after the reload, carries `changeHalf`'s *has changed … from … to …*.
  const opened = await guestPage.evaluate((k) => {
    const t = document.querySelector('#band [data-tab="' + k + '"]');
    if (!t) return false;
    t.click();
    return true;
  }, AMENDED);
  await guestPage.waitForTimeout(700);
  const l7 = await guestPage.evaluate(() => {
    const c = document.querySelector('.setupcard');
    const ch = c && c.querySelector('.body.changed');
    return { card: !!c, changed: ch ? ch.textContent.replace(/\s+/g, ' ').trim().slice(0, 140) : null };
  });
  const l7Ok = opened && l7.card && !!l7.changed && /has changed/.test(l7.changed);
  say(L('L7') + (l7Ok ? 'one press, kept through a poll and a reload; the clause keeps the change line: “' + l7.changed + '”'
    : 'FAIL: tab ' + opened + ' · ' + JSON.stringify(l7)));
  if (!l7Ok) stuck.push('L7: the change line on the acknowledged clause');
  await guestPage.evaluate(() => { const a = document.querySelector('.setupcard .chipcol .achip'); if (a) a.click(); });
  await guestPage.waitForTimeout(400);
};

/* ---- the room, as a row of faces (backlog 15, Q858–Q864) ----------------
 * Ed: *where we currently say "n in the room" in the topbar we should show a
 * row / stack of user avatars.* Two seats is the smallest room in which the
 * row can be wrong in the way that matters — it is built from *other* people,
 * so a page with one member and a page with two are the only two states, and
 * the founder's own chair cannot tell them apart. Checked here rather than in
 * the fixture for the ordinary reason: `members()` on a live document is fed
 * by `syncFromCs`, and only a real arrival sets `in`.
 * Presence, and only presence: an invitation is not an arrival, so GUEST2 —
 * invited above and never opened — is in neither stack. */
const facesIn = (pg) => pg.evaluate(() => ({
  seats: [...document.querySelectorAll('#faces .seat')].map((s) => s.dataset.mid || '?'),
  more: ((document.querySelector('#faces .more') || {}).textContent || '').trim(),
  title: (document.getElementById('faces') || {}).title || '(no #faces)',
  count: (document.getElementById('quorum') || {}).textContent || '',
}));
const topbarAlone = async () => {
  const f = await facesIn(page);
  say('faces ×0   · ' + (f.seats.length === 0
    ? 'a room of one draws no stack — the two addresses above are invitations, not arrivals'
    : 'FAIL: the founder alone sees ' + JSON.stringify(f.seats)));
  if (f.seats.length !== 0) stuck.push('the face row in a room of one');
};
const topbarFaces = async () => {
  if (!guestPage) return;                       // its own failure, already reported
  const mine = await facesIn(page);
  const theirs = await facesIn(guestPage);
  // the founder sees the one member who arrived, and not their own face: that
  // is `me`, two sockets along the same bar
  const founderOk = mine.seats.length === 1 && mine.seats[0] !== 'founder' &&
    mine.seats[0] !== '?' && mine.title === '2 members here';
  say('faces ×1   · the founder sees ' + JSON.stringify(mine.seats) + ' · ' + JSON.stringify(mine.title) +
    (founderOk ? '' : '  FAIL: expected one seat that is not their own, titled “2 members here”'));
  if (!founderOk) stuck.push("the founder's face row");
  // and the member sees the founder, whose row is the one with the minted id
  const guestOk = theirs.seats.length === 1 && theirs.seats[0] === 'founder' &&
    theirs.title === '2 members here';
  say('their view · the member sees ' + JSON.stringify(theirs.seats) + ' · ' + JSON.stringify(theirs.title) +
    (guestOk ? '' : '  FAIL: expected the founder’s face and nobody else’s'));
  if (!guestOk) stuck.push("the member's face row");
  // **the count is still reachable** (Q860): the row replaced the pre-Begin
  // head count, never the quorum reading, which is the engine's and is a fact
  // about a decision rather than about who is here
  const countOk = /^quorum \d+ of \d+$/.test(mine.count.trim());
  say('the count  · ' + JSON.stringify(mine.count) +
    (countOk ? '' : '  FAIL: a begun document must still read quorum k of n'));
  if (!countOk) stuck.push('the quorum reading beside the faces');
};

/* ---- the dead end, and the way out of it (Q826–Q830) --------------------
 * Ed, founding alone: *I did all my open tasks and then got served Begin while
 * being unable to action it. My guess is this is because I delegated things to
 * the members and I'm the only member.* He was right, and he had to guess: the
 * card's counts read *1 of 1 have answered* and said nothing about what would
 * end the wait. `--delegate-all` is the only walk that reaches this state, so
 * everything the state now owes the founder is asserted here — the reason on
 * the module's own readout, the sentence on the card, the remedy in the rail,
 * and that the remedy actually works. */
const oneVoiceState = () => page.evaluate(() => {
  const f = window.__founding ? window.__founding() : null;
  const c = document.querySelector('.setupcard');
  return { served: (f && f.served) || [], rail: (f && f.rail) || [],
    holds: ((f && f.readiness) || {}).holds || [],
    owedUnservable: (f && f.owedUnservable) || [],
    card: c ? c.textContent.replace(/\s+/g, ' ').trim() : '' };
});
const stuckAtBegin = async () => {
  const st = await oneVoiceState();
  // 1 — the module names the reason. Without it no page wording can say why:
  // the id alone is a question that looks finished.
  const oneVoice = st.holds.filter((h) => h.why === 'one-voice').map((h) => h.setting);
  say('one voice  · ' + JSON.stringify(oneVoice) +
    (oneVoice.length ? '' : '  FAIL: readiness gives no `one-voice` reason for a delegating founder alone'));
  if (!oneVoice.length) stuck.push('readiness has no one-voice reason');
  // 2 — and 🍾 says it, naming both acts. Read off the open card, which is what
  // the founder is actually looking at.
  const saysWhy = /delegated to the membership/.test(st.card) &&
    /only member/.test(st.card) && /Invite somebody/.test(st.card) && /take it back|take them back/.test(st.card);
  say('says why   · ' + (saysWhy ? 'names the delegation, the room of one and both remedies'
    : 'FAIL: the 🍾 card does not say why it cannot be pressed · ' + JSON.stringify(st.card.slice(0, 300))));
  if (!saysWhy) stuck.push("🍾's hold sentence");
  // 3 — and the remedy is in the rail, not only in a sentence. Entry 94 moved
  // the invitation box off 🪪 and onto the door, so the remedy task is ✉️.
  say('remedy     · rail ' + JSON.stringify(st.rail) +
    (st.rail.includes('invite') ? '' : '  FAIL: ✉️ is not served while the waiting is one-voice'));
  if (!st.rail.includes('invite')) stuck.push('✉️ is not served as the remedy');
  // 4 — and it works: one address is enough to end the wait it names
  if (await open('invite')) {
    await inviteFrom(GUEST1);
    const after = await oneVoiceState();
    const gone = !after.holds.some((h) => h.why === 'one-voice') && !after.rail.includes('invite');
    say('invited    · ' + (gone ? 'the ✉️ task leaves and the reason is no longer one-voice'
      : 'FAIL: holds ' + JSON.stringify(after.holds) + ' · rail ' + JSON.stringify(after.rail)));
    if (!gone) stuck.push('the ✉️ remedy did not clear after an invitation');
  } else { say('invited    · FAIL: no ✉️ to invite from'); stuck.push('the ✉️ tab at the dead end'); }
};

/* ---- the shape's provenance (entry 166) ---------------------------------
 * Read off the band: every clause's text by its page key. The shaped keys are
 * the row's own `sets` off the bundle, less whatever the row hides and less
 * the two settings with no clause to carry a sentence: 🪜, which lives inside
 * 🌡️'s stack, and `machines`, whose card left the surface on 2026-08-29
 * (backlog 251) while the setting stayed in the catalogue for replay — every
 * shape sets it, so all three shaped runs had been red on it since.
 * Asserted at the moment 🍾 is served, which is the first moment every
 * section of the constitution is on the page. */
const NO_CLAUSE = ['pace', 'machines'];
const clauses = () => page.evaluate(() => Object.fromEntries(
  [...document.querySelectorAll('#band .cpara')].map((el) => [
    el.dataset.para || (el.querySelector('[data-tab]') || { dataset: {} }).dataset.tab,
    ((el.querySelector('.cpv') || {}).textContent || '').replace(/\s+/g, ' ').trim()])
  .filter(([k, t]) => k && t)));
const shapedKeys = () => page.evaluate(([name, noClause]) => {
  const row = window.CONSTITUTION.shapeOf(name);
  return Object.keys(row.sets).filter((id) => !noClause.includes(id) && !row.hides.includes(id));
}, [SHAPE, NO_CLAUSE]);
const PROVENANCE = /\bAs for (a meeting|a conference|an ongoing document)\./;
let shapeTouched = false;
const shapeAtBegin = async () => {
  const keys = await shapedKeys();
  const cl = await clauses();
  const missing = keys.filter((k) => !PROVENANCE.test(cl[k] || ''));
  say('provenance · ' + keys.length + ' shaped clauses' +
    (missing.length ? '  FAIL: no *As for…* on ' + JSON.stringify(missing.map((k) => [k, cl[k] || '(no clause)'])) : ''));
  if (missing.length) stuck.push('provenance missing at 🍾 on ' + missing.join(','));
  // 💤 hidden where the row says so: no clause, no rail entry
  const hidden = await page.evaluate((name) => window.CONSTITUTION.shapeOf(name).hides, SHAPE);
  const shown = hidden.filter((k) => cl[k] || false);
  if (shown.length) { say('hidden     · FAIL: ' + shown.join(',') + ' has a clause under ' + SHAPE); stuck.push('hidden card drawn: ' + shown.join(',')); }
  // touch 👥 by hand: the sentence leaves that clause and 🍾 names it
  if (!(await open('quorum'))) { say('touch      · FAIL: no 👥 tab to touch'); stuck.push('👥 tab'); return; }
  await page.evaluate(() => {
    const n = document.querySelector('.setupcard [data-num="quorumPct"], .setupcard [data-num="quorumN"]');
    if (!n) return;
    n.value = String(+n.value === 40 ? 45 : 40);
    for (const e of ['input', 'change']) n.dispatchEvent(new Event(e, { bubbles: true }));
  });
  await T(250);
  const label = await press(1250);
  const after = await clauses();
  const gone = !!label && !PROVENANCE.test(after.quorum || '');
  say('touch 👥   · ' + (gone ? 'its sentence left with the founder’s hand' : 'FAIL: ' + (label ? 'still ' + JSON.stringify(after.quorum) : 'could not commit 👥')));
  if (!gone) stuck.push('👥 kept its provenance after being touched');
  shapeTouched = gone;
  await open('begin');
  const line = await page.evaluate(() => ((document.querySelector('.setupcard .shapeline') || {}).textContent || '').trim());
  const lineOk = /^The rules are as for /.test(line) && /except .*Quorum, which the Founder changed\.$/.test(line);
  say('🍾 line    · ' + (lineOk ? '“' + line + '”' : 'FAIL: ' + JSON.stringify(line)));
  if (!lineOk) stuck.push('🍾 does not state the diff');
};

/* ---- 🍾's power table (entry 158, Q1018, R-057; per setting since Q1195 (c),
 * R-098) -------------------------------------------------------------------
 * The Begin card carries a toggle per setting × power, and what it collects is
 * handed to one `begin` at one `t`. Two rules are walked here because neither
 * can be seen anywhere else on the surface.
 *
 * **(i) The table reflects the tabs.** A power promised away on one setting's
 * own ✒️ tab must show that setting's cell as **given** — struck and disabled —
 * never as *kept*, and no other setting's cell may move with it: the two
 * controls read one truth (`pwPair`/`pwPend`) and a disagreement between them
 * is a founder told they are keeping something they have already given.
 *
 * **(ii) The press is one act.** The table's *lay down* positions travel as
 * one list, so the holders afterwards are asserted through the ✒️/🛡️ tabs'
 * own head sentences rather than through a readout: a stagehand and a page
 * that disagree are both wrong.
 *
 * ⏱️ is the setting whose pen goes on its own tab — nothing later in this walk
 * needs it, where ✉️'s pen is `doorShuts`' subject and 🌍's is the amendment's.
 * ✉️'s **🛡️** is the cell that moves, for the same reason: its ✒️ has to
 * survive to the door checks after the start. */
// The table's controls are glyph toggles since Q1181 (Ed's card review round
// 3, 2026-09-05), one row per setting since Q1195 (c): each `tr[data-bkey]`
// holds a `.pwtoggle` per power carrying `data-bkey` and `data-bpw`,
// `aria-pressed="true"` for kept, `"false"` for laid down — and a given cell
// (the power promised away on the setting's own tab) is struck and
// `disabled`. `says` reports the word the toggle spells, so every assertion
// below keeps reading what it always read. `brSet` presses only where the
// toggle does not already stand at the wanted position, a toggle being a
// flip rather than a choice.
const BR_SEL = (k, pw) =>
  '.setupcard .begintable .pwtoggle[data-bkey="' + k + '"][data-bpw="' + pw + '"]';
const brRows = () => page.evaluate(() =>
  [...document.querySelectorAll('.setupcard .begintable tr[data-bkey]')].map((r) => ({
    key: r.dataset.bkey,
    name: ((r.querySelector('.bname') || {}).textContent || '').trim(),
    cells: ['u', 'a'].map((pw) => {
      const b = r.querySelector('.pwtoggle[data-bpw="' + pw + '"]');
      const kept = !!b && b.getAttribute('aria-pressed') === 'true';
      const given = !!b && !kept && b.disabled;
      return { pw, says: kept ? 'Kept' : given ? 'Given' : 'Laid down' };
    }),
  })));
const brSet = async (k, pw, val) => {
  const rows = await brRows();
  const row = rows.find((r) => r.key === k);
  const cell = row && row.cells.find((c) => c.pw === pw);
  const want = val === 'keep' ? 'Kept' : 'Laid down';
  if (cell && cell.says === want) return true;
  return clickIn(BR_SEL(k, pw));
};
// the ✒️/🛡️ tab's own head sentence for one key — the surface's word on who
// holds what, written by `powerHeadLine` off `pwPair`. The tabs are inert
// peeks on a closed pile, so the base card is opened first, exactly as
// `doorShuts` reaches them.
const pwSays = async (base, pw) => {
  if (!(await open(base))) return null;
  if (!(await open('pw:' + pw + ':' + base))) return null;
  return page.evaluate(() =>
    ((document.querySelector('.setupcard') || {}).textContent || '').replace(/\s+/g, ' ').trim());
};
let rowsWalked = false;
const beginRowsBeforeStart = async () => {
  rowsWalked = true;
  // one power promised away on its own tab, which is what makes a cell given
  let laid = null;
  if (await open('rate') && await open('pw:u:rate')) {
    const chose = await clickIn('[data-set="pw:u:rate"][data-val="given"]');
    laid = chose ? await press(1250) : null;
  }
  say('row tab    · ' + (laid ? '⏱️’s ✒️ promised away on its own tab (' + laid + ')'
    : 'FAIL: ⏱️’s ✒️ tab would not commit'));
  if (!laid) { stuck.push('laying ⏱️’s pen down before 🍾'); return; }
  if (!(await open('begin'))) {
    say('rows       · FAIL: no 🍾 card to read the power table off');
    stuck.push('the 🍾 card before its power table'); return;
  }
  const rows = await brRows();
  say('rows       · ' + JSON.stringify(rows.map((r) => r.key + ' ' +
    r.cells.map((c) => c.pw + '=' + c.says).join(' '))));
  // one row per power-holder — seventeen, since the machines row went (Ed,
  // 2026-09-09: *we are not having machines*; BEGIN_ROWS in session-view.html
  // is the literal) — ⏱️'s ✒️ the one given cell, 📝 alone laid down
  const givenPen = rows.filter((r) => r.cells.some((c) => c.pw === 'u' && c.says === 'Given')).map((r) => r.key);
  const downPen = rows.filter((r) => r.cells.some((c) => c.pw === 'u' && c.says === 'Laid down')).map((r) => r.key);
  const ok = rows.length === 17 && givenPen.join() === 'rate' && downPen.join() === 'text';
  say('given      · ' + (ok ? '⏱️’s ✒️ cell reads Given and no other row’s does; 📝 alone starts laid down'
    : 'FAIL: ' + rows.length + ' rows · given ' + JSON.stringify(givenPen) +
      ' · laid down ' + JSON.stringify(downPen)));
  if (!ok) stuck.push('the 🍾 row holding a promised-away pen did not read given, alone');
  // …and one row's 🛡️ set to lay down, which is what the press must carry
  const set = await brSet('invite', 'a', 'down');
  const after = await brRows();
  const door = after.find((r) => r.key === 'invite');
  const down = !!door && door.cells.some((c) => c.pw === 'a' && c.says === 'Laid down');
  say('toggle     · ' + (set && down ? '✉️’s 🛡️ set to lay down at Begin'
    : 'FAIL: set ' + set + ' · reads ' + JSON.stringify(door && door.cells)));
  if (!(set && down)) stuck.push('the ✉️ 🛡️ toggle');
};
/* …and what the press actually did, read back off the same tabs. Four claims:
 * the cell toggled down went, the same row's other power stayed, a row left
 * alone kept its ✒️ (keeping lays nothing further down), and the tab's own
 * pre-start release was spent all the same. */
const beginRowsAfterStart = async () => {
  if (!rowsWalked) return;
  const want = [
    ['invite', 'a', false, 'refuse invitations', '✉️’s 🛡️ went with the toggle'],
    ['invite', 'u', true, 'invite people at will', '…and ✉️’s ✒️ was kept'],
    ['title', 'u', true, 'amend this at will', 'a row left alone kept its ✒️'],
    ['rate', 'u', false, 'amend this at will', '⏱️’s own tab release was spent all the same'],
  ];
  for (const [base, pw, held, phrase, what] of want) {
    const line = await pwSays(base, pw);
    if (line === null) {
      say('after 🍾   · FAIL: no ' + (pw === 'u' ? '✒️' : '🛡️') + ' tab on ' + base);
      stuck.push('the ' + pw + ' tab on ' + base + ' after 🍾'); continue;
    }
    const neg = new RegExp('Founder may not ' + phrase);
    const pos = new RegExp('Founder may ' + phrase);
    const ok = held ? (pos.test(line) && !neg.test(line)) : neg.test(line);
    say('after 🍾   · ' + (ok ? what
      : 'FAIL: ' + base + ' ' + pw + ' · ' + JSON.stringify(line.slice(0, 220))));
    if (!ok) stuck.push('the holder on ' + base + '’s ' + pw + ' after 🍾');
  }
  await closeCard();
};

const seen = new Set();
const order = [];
// Ed's list from entry 181 — the Membership section's rules, whose standing is
// the whole of what summons the ✉️ task below
const MEMBERSHIP_RULES = ['admission', 'applications', 'hat', 'lapse', 'removal'];
const handedOver = [];
// L1's ledger: every setting the founder set in the loop, and whether its tab
// went grey (`st-done`) on the commit — said once after the loop
const l1Set = [], l1Miss = [];
let waitingAtBegin = false;
let doorWalked = false;
for (let i = 0; i < 60; i++) {
  const standing = await rail();
  // --proposals-first: the four tabs of the Proposals opening jump the queue
  const next = (PROPOSALS_FIRST ? PROPOSALS.find((k) => standing.includes(k) && !seen.has(k)) : undefined)
    || standing.find((k) => !seen.has(k));
  if (!next) {
    // **The founding never runs out of tasks before 🍾** (Q773, Ed 2026-08-25:
    // *before begin, there shouldn't be a situation where I don't see any
    // queue-cards*). This loop used to `break` on an empty rail and let
    // everything below report on whatever it found — so a founder left with
    // nothing to do and no way on was, to this walk, simply the end of the
    // founding. It is a failure, and it is printed with the page's own
    // readout: naming the symptom would leave the next reader to reconstruct
    // by hand which card was owed, which was hidden, and what the module was
    // waiting for.
    // Read from the DOM, not from the readout: a page too old to carry
    // `window.__founding` is exactly the page this has to fail on. And the
    // test is *the document has not begun*, not *the rail is empty* — the
    // first pre-fix run left a seen entry standing that the founder could not
    // get past, which is the same dead end wearing one queue card.
    if (!(await page.evaluate(() => !!document.querySelector('.doc.begun')))) {
      const f = await founding();
      say('FAIL: the founding has run out of tasks and the document has not begun · rail ' +
        JSON.stringify(standing));
      say(f ? JSON.stringify(f, null, 1) : '(no window.__founding on this page)');
      stuck.push('the founding ran dry before Begin');
    }
    break;
  }
  // **✉️ is a task before 🍾 now, and the walk asserts it rather than acting on
  // it** (entry 181, F23). Once the Membership rules stand the door stands in
  // the rail beside whatever is being asked next, until an invitation goes out
  // or the document begins. Inviting *here* would cost two assertions that have
  // nowhere else to live: `topbarAlone` below is the only place in this walk
  // where the founder can be said to be alone in a saved document, and in
  // `--delegate-all` an early invitation would clear the one-voice dead end the
  // run exists to reach. So it is asserted where it first appears and walked at
  // 🍾 exactly as before. It stays out of `order` too — that list is the
  // founding's own sequence (Q776), and a task that paces nothing (F3, F7) has
  // no place in it.
  if (next === 'invite' && !(await page.evaluate(() => !!document.querySelector('.doc.begun')))) {
    seen.add('invite');
    const f = (await founding()) || {};
    // **Which of the two reasons is it?** ✉️ is a task for F19's `one-voice`
    // remedy as well, and that one arrives from the founder's first delegation
    // — well before the Membership rules stand, which is exactly what
    // `--delegate-all` produces. Asserting the five rules over both reasons
    // would call the remedy a defect. The remedy names itself in `readiness`,
    // so the reason is read rather than guessed, and only the plain task is
    // held to entry 181's condition.
    const oneVoice = (((f.readiness || {}).holds) || []).filter((h) => h.why === 'one-voice');
    if (oneVoice.length) {
      say('✉️ remedy  · standing as F19 while ' +
        JSON.stringify(oneVoice.map((h) => h.setting)) + ' waits on one voice');
      continue;
    }
    // a hidden rule is a decision nobody has (entry 166) and completes the
    // section by not existing, so `vis=0` counts as standing
    const ord = f.order || [];
    const unsettled = MEMBERSHIP_RULES.filter((k) => {
      const row = ord.find((r) => String(r).split(' ')[0] === k);
      return row && !/ set=1/.test(row) && !/ vis=0/.test(row);
    });
    say('✉️ task    · ' + (unsettled.length
      ? 'FAIL: standing with ' + unsettled.join(',') + ' not yet settled'
      : 'standing — the Membership rules stand and nobody has been invited'));
    if (unsettled.length) stuck.push('the ✉️ task stands with ' + unsettled.join(',') + ' unsettled');
    continue;
  }
  seen.add(next);
  order.push(next);
  // **`owedUnservable` is an assertion now, not a readout** (Q831). It was
  // written to *name* the Q775 shape — a card `mustAct` says is owed that no
  // rail can reach — for whoever came to read the dump after a founding had
  // already run dry. But it is a complete statement of the defect, checkable at
  // every step, and a walk that prints it and passes is a walk that watched the
  // bug go by. Read each turn, because the state that produces it is transient:
  // it appears the moment a setting is handed over and is gone once the rail
  // moves on.
  const owed = ((await founding()) || {}).owedUnservable || [];
  if (owed.length) {
    say('  UNSERVED · at ' + next + ' these are owed and beyond any rail: ' + JSON.stringify(owed));
    stuck.push('owedUnservable at ' + next + ': ' + owed.join(','));
  }
  if (!(await open(next))) { stuck.push(next + ' (would not open)'); continue; }
  // **The door is ✉️, and it stopped being 🪪 on 2026-08-26** (entry 94,
  // Q916). This opened `admission` and typed into an invitation box that used
  // to be drawn there; 🪪 is the *price of admission* now — a constitutional
  // setting with four rungs on `data-set="admission"`, so the old comment
  // here (*🪪 is always settled, having no value to settle*) was doubly
  // wrong — and the box belongs to ✉️, which carries its own ✒️/🛡️ pair
  // over the act. The walk died at `.setupcard [data-add]` for a day.
  //
  // Still walked at the last moment before 🍾, which is the state the door
  // is drawn in: pre-start, `constituted()` false, so ✉️ shows the box
  // rather than the composer whatever the price says.
  if (next === 'begin' && SHAPED_RUN && !shapeTouched) await shapeAtBegin();
  if (next === 'begin' && !DELEGATE_ALL && !doorWalked) {
    doorWalked = true;
    if (await open('invite')) {
      await inviteDoorPreBegin();
      await clickIn('.setupcard [data-revert]');
      // the founder is still alone in the room at this exact moment, which is
      // the only place in the walk where that can be said of a saved document
      await topbarAlone();
      // an invitation is a seat, so one of them is taken here: what a member
      // is owed on arrival can only be read from the member's own page
      await secondSeatPreBegin();
      // L2 — ✋ typed and Saved through its own card, before the wire sets
      // the same name below (Q1239)
      await lifecycleL2();
      // …and once there are two seats, whether each of them can see who the
      // other is (Q850–Q853)
      await identityReachesEverySeat();
      // L9 — 🗑️ puts back what was typed and touches nothing set (Q1239)
      await lifecycleL9();
    } else {
      say('invite ×2  · FAIL: no ✉️ tab in the band to invite from');
      stuck.push('the ✉️ tab');
    }
    await open('begin');
  }
  // 🍾's own power table, at the last moment before the press (entry 158).
  // It leaves 🍾 open behind it — re-opening the card that is already open
  // clicks its own tab and closes it, and the press below would find no
  // commit row at all.
  if (next === 'begin' && !DELEGATE_ALL && !rowsWalked) await beginRowsBeforeStart();
  if (next === 'begin') {
    // 🍾 is served either because it can be pressed or because it is the last
    // thing standing (Q773) — or, since Q830, because the document is waiting on
    // something the founding cannot clear by itself. That is this founding: its
    // questions went to a room that is still one person, §9.0b resolves no blind
    // question on one voice, and the card's whole job there is to say so and
    // point at the two acts that end it. Asserted rather than driven through a
    // disabled commit.
    if (!(await committable())) {
      const f = await founding();
      const wait = ((f && f.readiness) || {}).waiting || [];
      say('waiting    · 🍾 is served and cannot be pressed yet — waiting on ' + JSON.stringify(wait));
      if (!wait.length) stuck.push('🍾 is dead and says it is waiting for nothing');
      waitingAtBegin = true;
      if (DELEGATE_ALL) await stuckAtBegin();
      break;
    }
  }
  if (await clickIn('.setupcard [data-ok]')) { say('  ok       · ' + next); continue; }
  // (the text is no task since backlog 204 — it was written at the save, above;
  // a `text` step here would be a finding)
  if (next === 'text') { say('  FAIL     · the text is served as a task'); stuck.push('📝 served as a task'); }
  // --delegate-all hands over what can be handed over. The founder's own
  // questions (✋ 🖼️ 🎩) and the undelegable settings have no such rung, so
  // `options` falls back to the ordinary ones and the walk answers them.
  // **⏰ is held back, and that is a finding rather than a convenience**
  // (Q778). It is the one delegable setting anything depends on — 🌡️ and 🪜
  // are `deps: ['ending']` — and §9.0a refuses an answer to a dependent while
  // its dependency is still collecting (`session.ts:1129`). Handing over both
  // in a room of one puts 🌡️'s question in the rail with a live ✓ that the
  // module answers `'bar' waits on 'ending'`: the surface offers a question the
  // spec says is not answerable, and the cascade behind it stalls on an answer
  // that cannot be given. That is its own defect and its own fix — the page has
  // no copy of the catalogue's `deps`, and whether a blocked question pauses
  // the cascade or is looked through is a real call — so it is filed, not
  // guessed at here. Holding ⏰ leaves the other ten to test what this walk is
  // for: that every question a founder hands over comes back to them.
  const wantDelegate = DELEGATE_ALL && !next.startsWith('ans-') && next !== 'ending';
  let chose = null;
  let offered = await options(wantDelegate);
  const delegs = await delegLabels();
  // 👤 takes the rung the run asked for (Q770), tried first; the rest stay
  // as the walk's ordinary fallback. The label is read off the card by its
  // `data-val`, so a reworded rung moves the walk with it rather than past it.
  const authLabel = next === 'authorship' && !wantDelegate
    ? await labelForValue('authorship', AUTHORSHIP) : null;
  if (authLabel && offered.includes(authLabel)) {
    offered = [authLabel, ...offered.filter((l) => l !== authLabel)];
  } else if (next === 'authorship' && !wantDelegate) {
    // and a rung the card does not offer is said out loud rather than fallen
    // through: the silent fallback is what hid the stale label map for a day
    say('👤 rung    · FAIL: no rung with data-val=' + AUTHORSHIP + ' on the open card · ' +
      JSON.stringify(offered.map(short)));
    stuck.push('the 👤 rung this run asked for');
  }
  for (const label of offered) {
    const at = await pickOption(label);
    if (!at) continue;
    await page.mouse.click(at.x, at.y);
    await T(320);
    chose = label;
    // **A delegated setting takes no value with it** — picking one is the
    // taking-back — so the fields are left alone on that branch. Filling them
    // is what made the first `--delegate-all` run hand over five of eleven and
    // look like the page's doing.
    if (!delegs.includes(label)) await fillFields();
    await T(220);
    if (await committable()) break;
  }
  if (chose === null) await fillFields();
  await T(220);
  if (chose !== null && delegs.includes(chose)) handedOver.push(next);
  const label = await press(1250);
  const open2 = await page.evaluate((kk) => {
    const c = document.querySelector('.setupcard');
    return !!c && (c.dataset.card === kk || !!c.querySelector('[data-tab="' + kk + '"]'));
  }, next);
  if (!label || open2) {
    stuck.push(next);
    // a stuck card says *why* it is stuck: which controls its commit row holds
    // and which of them are dark. "STUCK: ans-rate" alone is a line somebody
    // has to go and reproduce by hand.
    say('  STUCK    · ' + next + (chose ? ' — ' + short(chose) : '') + ' · commit row ' +
      JSON.stringify(await page.evaluate(() =>
        [...document.querySelectorAll('.setupcard .commitrow button')]
          .map((b) => (b.textContent.trim() || b.getAttribute('title') || '?') + (b.disabled ? ' [dark]' : '')))));
  } else {
    say('  committed· ' + next + ' (' + label + ')' + (chose ? ' — ' + short(chose) : ''));
    // L1 — a setting of yours is set: the tab goes grey on the commit. The
    // personal pair is L2's, the grants L8's, a handed-over setting is
    // waiting rather than set, and the door and 🍾 are neither.
    if (!next.startsWith('ans-') && !next.startsWith('grant-') && !PROPOSALS.includes(next) &&
        !['myname', 'mypic', 'invite'].includes(next) && !handedOver.includes(next)) {
      const cls = await page.evaluate((k) => {
        const t = document.querySelector('.achip[data-chip="' + k + '"]');
        return t ? t.className : null;
      }, next);
      if (cls && /\bst-done\b/.test(cls)) l1Set.push(next); else l1Miss.push(next + ' (' + (cls || 'no tab') + ')');
    }
    // L3 — a blind question answered (--delegate-all): the entry leaves the
    // rail on ✓, and the host's card shows how far the room has got. Where
    // the entry stays, the red line is finding (a) of QUESTIONS 1286.
    if (next.startsWith('ans-')) {
      const host = next.slice(4);
      const left = !(await rail()).includes(next);
      // the count — *(n of E have answered so far)* — is drawn only where the
      // page says a room exists (`roomExists()`, session-view.html); in a room
      // of one there is nobody else to have answered, so the cell's precondition
      // is read off the page rather than assumed, and said on the line
      const room = !!(((await founding()) || {}).roomExists);
      let count = null, text = null;
      if (await open(host)) {
        text = await page.evaluate(() => ((document.querySelector('.setupcard') || {}).textContent || '').replace(/\s+/g, ' ').trim());
        count = (text.match(/\b\d+ of \d+\b/) || [])[0] || null;
        await closeCard();
      }
      const l3Ok = left && (room ? !!count : text !== null);
      say(L('L3') + (l3Ok ? next + ' · the entry left the rail; ' + host + '’s card ' +
          (room ? 'reads “' + count + '”' : 'shows no count yet — roomExists false, a room of one')
        : 'FAIL: ' + next + ' · left the rail ' + left + ' · room ' + room + ' · count ' + JSON.stringify(count) +
          (text === null ? ' · ' + host + ' would not open' : count ? '' : ' · card “' + text.slice(0, 120) + '”')));
      if (!l3Ok) stuck.push('L3: ' + next + (left ? '' : ' stays in the rail') + (room && !count ? ' shows no count' : ''));
    }
  }
}
say('founding   · rail ' + JSON.stringify(await rail()) + (stuck.length ? ' STUCK: ' + stuck.join(', ') : ''));
say(L('L1') + (l1Miss.length ? 'FAIL: committed but the tab is not grey: ' + l1Miss.join(', ')
  : l1Set.length + ' settings set, every tab grey (st-done) on the commit'));
if (l1Miss.length) stuck.push('L1: a set tab not grey: ' + l1Miss.join(','));
// what the press actually laid down, read back off the ✒️/🛡️ tabs
await beginRowsAfterStart();
if (SHAPED_RUN && order.includes('begin')) {
  // after the press nothing is the shape's: the marks are gone from every clause
  const cl = await clauses();
  const still = Object.entries(cl).filter(([, t]) => PROVENANCE.test(t)).map(([k]) => k);
  say('after 🍾   · ' + (still.length ? 'FAIL: still shaped ' + still.join(',') : 'no clause is the shape’s any more'));
  if (still.length) stuck.push('provenance survived 🍾 on ' + still.join(','));
  // and the unavoidable cards were the whole of what the founder was asked
  const asked = order.filter((k) => !k.startsWith('grant-') && !['begin', 'canpropose', 'canjudge'].includes(k));
  say('asked      · ' + JSON.stringify(asked));
}

// L8 — a power arrives and is OK'd (`ok · grant-…` above); the acknowledgement
// is the seat's (`ACK_KEYS` per seat), so after a reload no grant is served
// again and the sockets read held rather than struck. *Re-asked on every
// not-held → held* is not driven here: nothing in this walk takes a power
// back and hands it out again. Under --delegate-all the document has not
// begun, so ✏️ is legitimately not yet held and only the pen is read.
{
  const okd = order.filter((k) => k.startsWith('grant-') || k === 'canpropose' || k === 'canjudge');
  await page.reload();
  await T(3200);
  const l8 = await page.evaluate((keys) => {
    const f = window.__founding ? window.__founding() : null;
    const served = (f && f.served) || [];
    const cls = (id) => ((document.getElementById(id) || {}).className || '(none)');
    return { back: keys.filter((k) => served.includes(k)), served, pen: cls('penwallet'), wallet: cls('wallet') };
  }, okd);
  const struck = (DELEGATE_ALL ? ['pen'] : ['pen', 'wallet']).filter((k) => /\bnotheld\b/.test(l8[k]));
  const l8Ok = okd.length > 0 && l8.back.length === 0 && struck.length === 0;
  say(L('L8') + (l8Ok ? okd.length + ' grants OK’d; after a reload none is served again and the sockets read held (✏️ “' +
      l8.wallet + '”, ✒️ “' + l8.pen + '”)'
    : 'FAIL: OK’d ' + JSON.stringify(okd) + ' · served again ' + JSON.stringify(l8.back) + ' · struck ' +
      JSON.stringify(struck) + ' · served ' + JSON.stringify(l8.served)));
  if (!l8Ok) stuck.push('L8: a grant served again, or a socket struck, after a reload');
}

if (DELEGATE_ALL) {
  // **A founder who delegates is asked each question back, in ORDER** (Q776).
  // The founding order is the constitution's order and the answer tasks
  // cascade in it (`ansWaveReady`), so this is checked as a *sequence* and not
  // as a set: arriving in the wrong place is its own failure, the same
  // argument the identity check below makes.
  const f = (await founding()) || { order: [] };
  const ORDER = (f.order || []).map((l) => String(l).split(' ')[0]);
  const asked = order.filter((k) => k.startsWith('ans-'));
  const want = ORDER.filter((k) => handedOver.includes(k)).map((k) => 'ans-' + k);
  const gotAll = JSON.stringify(asked) === JSON.stringify(want);
  say('delegated  · handed over ' + handedOver.length + ', asked back ' + asked.length);
  say('as a member· ' + JSON.stringify(asked) + (gotAll ? '' : '  FAIL: expected ' + JSON.stringify(want)));
  if (!gotAll) stuck.push('the founder-member was not served every delegated question in ORDER');
  // **🏛️ is served the moment it is granted** (Q829, Ed 2026-08-25: *when I (as
  // a founder-member) was granted 🏛️ I did not get a task — the 🏛️ tab was
  // grey*). Its host was the first blind question asking you, else ⚖️, which is
  // hidden until 🍾 — so the grant was reachable only after the very press it
  // stood in front of. Checked as *before* 🍾 rather than merely present.
  const iVoice = order.indexOf('grant-voice');
  const iBegin = order.indexOf('begin');
  const voiceOk = iVoice >= 0 && (iBegin < 0 || iVoice < iBegin);
  say('the voice  · ' + (voiceOk ? 'served as a task before 🍾 (at ' + iVoice + ' of ' + order.length + ')'
    : 'FAIL: 🏛️ was ' + (iVoice < 0 ? 'never served' : 'served only after 🍾')));
  if (!voiceOk) stuck.push('🏛️ was not served to a founder-member before 🍾');
  say('ends at 🍾 · ' + (waitingAtBegin ? 'served, waiting on the room'
    : 'FAIL: the founding did not end at a served 🍾'));
  if (!waitingAtBegin) stuck.push('a delegating founding did not end at 🍾');
  say('errors     · ' + (errors.length ? errors.slice(0, 4).join(' / ') : 'none'));
  say('refused    · ' + (refused.length ? refused.join(' / ') : 'none'));
  await browser.close();
  process.exit(stuck.length || errors.length || refused.length ? 1 : 0);
}

// **The founder is asked who they are, before they begin** (Q645, Ed's live
// walk 2026-08-22: *I'm never offered the "Your Name" and "Your Picture"
// tasks*) — and they were dead on every live document, because `hydrateS`
// declared them settled rather than ask the module whether they had ever been
// answered. The assertion belongs **here** and nowhere else: both probes and
// `founding-walk.mjs` drive the fixture, where the pair always worked, so the
// bug was invisible to all three. It is checked as *position*, not mere
// presence, because arriving in the wrong place is its own failure.
// **Served at the save, and never blocking** (Q980): the pair sits between
// 📧 and ✒️ in `ORDER` and neither holds the file, so the position that can be
// asserted is *after the save and before 🌍* rather than adjacency to the pen —
// this walk takes rail entries in document order, so it meets ✒️ first and may
// meet 🛡️ before ✋. Adjacency to each other and their own order still hold:
// 🖼️ follows ✋ and ✋ blocks nothing, which is what makes them arrive together.
const iEmail = order.indexOf('myemail');
const iName = order.indexOf('myname');
const iPic = order.indexOf('mypic');
const iChamber = order.indexOf('chamber');
const identityOk = iName >= 0 && iPic === iName + 1 &&
  (iEmail < 0 || iName > iEmail) && (iChamber < 0 || iPic < iChamber);
say('identity   · the rail asks [' + order.slice(iName, iName + 2).join(',') + '] at ' + iName +
  ', after 📧 (' + iEmail + ') and before 🌍 (' + iChamber + ')' +
  (identityOk ? '' : '  FAIL: expected myname,mypic adjacent, after myemail and before chamber'));
if (!identityOk) stuck.push('identity tasks (order ' + order.join(' ') + ')');

// Asserted, not printed (2026-08-22): this block used to report `begun` and
// pass whatever it said. A begun document hides the founder's pre-start
// editor `#prose` and mounts the charter; the charter is the only column
// that takes a caret, and `#prose` must be neither visible nor editable.
// **And the caret is edit mode's** (backlog 204): the charter mounts in read
// mode — no caret, no row — and 📝 is the door: pressed once the host is
// editable, the column lifted and the row drawn with its commit greyed
// (nothing has changed); pressed again, read mode.
const hostEditable = () => page.evaluate(() =>
  (document.querySelector('#charter .prose') || {}).getAttribute
    ? document.querySelector('#charter .prose').getAttribute('contenteditable') : '(none)');
const state = await page.evaluate(() => ({
  begun: !!document.querySelector('.doc.begun'),
  clauses: document.querySelectorAll('#charter .prose p').length,
  editable: (document.querySelector('#charter .prose') || {}).getAttribute
    ? document.querySelector('#charter .prose').getAttribute('contenteditable') : '(none)',
  row: !!document.querySelector('#charter [data-proposalrow]'),
  tab: !!document.querySelector('#ridetab .achip[data-tab="text"]'),
  proseShown: getComputedStyle(document.getElementById('prose')).display !== 'none',
  proseEditable: document.getElementById('prose').getAttribute('contenteditable'),
}));
const begunOk = state.begun && state.editable === 'false' && !state.row && state.tab && !state.proseShown;
say('begun      · ' + JSON.stringify(state) + (begunOk ? '' : '  FAIL: the charter should mount in read mode with the 📝 tab'));
if (!begunOk) stuck.push('begun state');
await page.evaluate(() => document.querySelector('#ridetab .achip[data-tab="text"]').click());
await T(300);
// **the rest position is measured at rest** (entry 136). The tab rides with
// the reader by design (K31), so `lineDelta` only means *the tab rests level
// with the document's first line* while the first line is on the page: read
// anywhere else it measures the sticky clamp instead, which is how this step
// began failing at 81px without the page having changed.
await page.evaluate(() => window.scrollTo(0, 0));
await T(200);
const editState = await page.evaluate(() => {
  const b = document.querySelector('#charter [data-proposalrow] [data-act="row-commit"]');
  const row = document.querySelector('#charter [data-proposalrow]');
  const rs = row && getComputedStyle(row);
  const ride = document.querySelector('#ridetab .achip[data-tab="text"]');
  const consTab = document.querySelector('#band .constsec .chipcol .achip');
  const col = document.querySelector('#charter .prose');
  const first = col && col.querySelector('p');
  return { editing: document.getElementById('doc').classList.contains('editing'),
    row: !!b, greyed: !!(b && b.disabled), glyph: b ? b.textContent.trim() : null,
    // Ed's QA of 2026-08-30: the pen-holding founder-member is offered ✒️ *and* ✏️ (entry 161)
    commits: [...document.querySelectorAll('#charter [data-proposalrow] [data-act="row-commit"]')].map((x) => x.textContent.trim()),
    // the row has no ground of its own
    rowGround: rs ? { bg: rs.backgroundColor, shadow: rs.boxShadow, border: rs.borderTopStyle } : null,
    // the pile is the strip in edit mode: every tab pressable
    rideTabs: document.querySelectorAll('#ridetab .achip[data-tab]').length,
    // the riding tab's gutter is the constitution's — right edges, since the
    // active 📝 grows 8px out to the left (M12) and a resting tab does not.
    // In edit mode the strip tucks 2px under the card it is attached to, as
    // every clausehead strip does (Ed, 2026-08-17: every tab's right edge
    // lands on the card's left edge; Ed, 2026-08-31: tabs should always
    // tuck) — so the ride tab's right edge is the resting column's plus 2
    rideRight: ride ? Math.round(ride.getBoundingClientRect().right) : null,
    consRight: consTab ? Math.round(consTab.getBoundingClientRect().right) : null,
    // the outline rose above the first line by the gutter, and the text did not move
    padTop: col ? Math.round(first.getBoundingClientRect().top - col.getBoundingClientRect().top) : null,
    // the tab rests level with the document's first line, not the title (Ed's QA, 2026-08-30)
    lineDelta: ride && first ? Math.round(ride.getBoundingClientRect().top - first.getBoundingClientRect().top) : null,
    // which block the delta above was measured against, said out loud: the
    // page's own rule reads `col.firstElementChild` (`rideLine`), so a walk
    // reading anything else is comparing two different lines
    firstTag: first ? first.tagName + '.' + first.className + (first === col.firstElementChild ? '' : ' (not the column’s first child: ' + col.firstElementChild.tagName + '.' + col.firstElementChild.className + ')') : null,
    // the runway is the card's: no .doc padding under it, and the card's foot is .doc's
    runway: Math.round(parseFloat(getComputedStyle(document.getElementById('doc')).paddingBottom)),
    gap: !!document.querySelector('#charter .prose p.editable.blank.gap[data-key^="G"]') };
});
const rowBare = editState.rowGround && /rgba\(0, 0, 0, 0\)|transparent/.test(editState.rowGround.bg) &&
  editState.rowGround.shadow === 'none' && editState.rowGround.border === 'none';
// ✏️ always; ✒️ only ever *beside* it, never instead (the founder has not
// taken the pen at this step, so one ✏️ is the expected shape here)
const pairOk = editState.commits[editState.commits.length - 1] === '✏️' &&
  (editState.commits.length === 1 || editState.commits.join('') === '✒️✏️');
const editOk = (await hostEditable()) === 'true' && editState.editing && editState.row && editState.greyed &&
  pairOk && rowBare && editState.rideTabs === 3 &&
  editState.rideRight === editState.consRight + 2 && editState.padTop === 24 &&
  Math.abs(editState.lineDelta) <= 1 && editState.runway === 0 &&
  (EMPTY_TEXT ? !editState.gap : editState.gap);
say('edit mode  · ' + JSON.stringify(editState) + (editOk ? '' : '  FAIL: 📝 should lift the column (24px over the first line), fan the pile to three tabs on the constitution\'s gutter, draw the bare row greyed with ✏️ (✒️ only beside it), and the trailing gap'));
if (!editOk) stuck.push('edit mode');
await page.evaluate(() => document.querySelector('#ridetab .achip[data-tab="text"]').click());
await T(300);
const readAgain = (await hostEditable()) === 'false' && !(await page.evaluate(() => !!document.querySelector('#charter [data-proposalrow]')));
say('read mode  · ' + (readAgain ? '📝 again leaves edit mode: no caret, no row' : 'FAIL: still in edit mode'));
if (!readAgain) stuck.push('leaving edit mode');

// the other half of backlog 50: what *is* news to a member is a rule changed
// while they were here, and one press of OK is what dismisses it
await secondSeatOnAmendment();

// and with two seats standing, each of them is the other's face in the topbar
await topbarFaces();

/* ---- each door, once its own pen is laid down (Q812/Q813, Q916) --------
 * The state the backlog report was made in: the founder gives up the ✒️ and
 * keeps the 🛡️, and the card goes on drawing a control that cannot act — a
 * field that could not send, and pressing it did nothing whatever. The
 * direct control must be gone, and the card must say where to go instead.
 *
 * **Both doors, on their own pens** (Ed, 2026-08-26). Until entry 94 this
 * laid down the *register's* pen and then inspected 🪪 — and both halves of
 * that stopped being true on the same day: 🪪 is the price of admission now
 * and never draws a door control at all, while ✉️ and ❌ each carry their
 * own ✒️/🛡️ pair over the act (`door:invite`, `door:remove`). So the check
 * lays down each door's own pen and asks that door.
 *
 * It has to run **after 🍾**: before the start `directInvite` and
 * `directRemove` are both plain `amFounder()` — §9.6a, the convenor
 * re-shapes the roster freely — so no pen laid down pre-begin shuts
 * anything, and the check would pass while asserting nothing. */
// the power tabs are inert peeks on a closed pile — no `data-tab` until the
// pile is the open card's own strip — so the door is opened first and its
// ✒️ tab clicked from that strip, which is the founder's own route to it
const doorShuts = async (k, glyph, direct, label) => {
  await open(k);
  if (!(await open('pw:u:' + k))) {
    say('the pen    · FAIL: no ✒️ tab on ' + glyph + ' to lay its pen down with');
    stuck.push('the ' + glyph + ' pen tab'); return;
  }
  const chose = await clickIn('[data-set="pw:u:' + k + '"][data-val="given"]');
  const laid = chose ? await press(1250) : null;
  say('the pen    · ' + (laid ? 'laid down on ' + glyph + ' (' + laid + ')'
    : 'FAIL: ' + glyph + '’s ✒️ tab would not commit'));
  if (!laid) stuck.push('laying ' + glyph + '’s pen down');
  await open(k);
  const door = await page.evaluate((sel) => {
    const c = document.querySelector('.setupcard');
    // the whole card, not its `.why`: once the pen is down the door draws a
    // composer, and a missing `.why` would otherwise read as a shut door —
    // which is the very confusion this check exists to catch
    return { found: !!c, direct: !!(c && c.querySelector(sel)),
      says: ((c || {}).textContent || '').replace(/\s+/g, ' ').trim() };
  }, direct);
  // what is left must be the collective route: the card is still there, no
  // control that acts alone, and a sentence saying who decides instead
  const ok = door.found && !door.direct && /propos|every/i.test(door.says);
  say('shut ' + label.padEnd(5) + ' · ' + (ok ? 'no ' + label + ', and the card says who decides instead'
    : 'FAIL: found ' + door.found + ' · ' + label + ' ' + door.direct +
      ' · says ' + JSON.stringify(door.says.slice(0, 160))));
  if (!ok) stuck.push('the ' + glyph + ' door after its pen goes');
  await clickIn('.setupcard [data-revert]');
};
/* ---- an invitation cannot be withdrawn after the start (plan-queue 43) ---
 * **Nobody enters or leaves except by the routes the document names** (SPEC
 * §9.7 rule 9, X4). ❌'s subject picker lists members and invitees alike
 * (entry 96) and `data-exile` routes somebody who has not arrived to
 * `cs.uninvite` — which the fold refuses after the start (*uninviting is
 * pre-start only — after the start it is a motion*), while there is no
 * `uninvite` motion payload for the sentence to point at. So an outstanding
 * invitation stands until the close expires it, and the control invites the
 * act all the same.
 *
 * The step **states the fact rather than the wish**: the invitee is offered,
 * the press is refused, the refusal is printed under the control (Y25), and
 * the row is still there afterwards. If the surface ever shuts the door —
 * the invitee dropped from the picker, or a route built for it — this goes
 * red and is rewritten to the new fact rather than deleted.
 *
 * GUEST2 is the one address this walk invites and never stands up, so it is
 * an invitee for the whole run; and this must precede `doorShuts`, which
 * lays ❌'s pen down for good and takes the picker with it. */
const invitationStandsAfterBegin = async () => {
  if (!(await open('remove'))) {
    say('❌ invitee · FAIL: no ❌ card after 🍾');
    stuck.push('the ❌ card after 🍾'); return;
  }
  const offered = await page.evaluate((local) => {
    const sel = document.querySelector('.setupcard [data-removewho]');
    if (!sel) return null;
    const o = [...sel.options].find((x) => x.textContent.includes(local));
    return o ? { value: o.value, label: o.textContent.trim() } : { value: '', label: '' };
  }, GUEST2.split('@')[0]);
  if (!offered) {
    say('❌ invitee · FAIL: ❌ draws no subject picker for a founder holding its ✒️');
    stuck.push('the ❌ subject picker'); return;
  }
  if (!offered.value) {
    say('❌ invitee · FAIL: the picker no longer offers the invitee — the fact has ' +
      'changed, so rewrite this step against the new one');
    stuck.push('the ❌ picker’s invitee row'); return;
  }
  say('❌ invitee · offered as ' + JSON.stringify(offered.label));
  expectRefused.push(/"cmd":"uninvite"/);
  try {
    // the 4s poll can re-render between the two evaluates, so the select is
    // re-found and its absence reported — a bare `sel.value` would throw
    // inside the page and take the whole walk down with it
    const chosen = await page.evaluate((v) => {
      const sel = document.querySelector('.setupcard [data-removewho]');
      if (!sel) return false;
      sel.value = v;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return sel.value === v;
    }, offered.value);
    await T(420);
    // **an unsent press is not a refusal** — the ❌ button is disabled until
    // the picker has a subject, and a press that never left the page would
    // otherwise read as an empty refusal line and blame the door's wording
    const pressed = chosen && await clickIn('.setupcard [data-exile]');
    if (!pressed) {
      say('withdrawn? · FAIL: ❌ Remove could not be pressed on the invitee' +
        (chosen ? '' : ' — the picker would not take them'));
      stuck.push('the ❌ press on an invitee after 🍾');
      await closeCard();
      return;
    }
    await T(1600);
    const said = await refusalLine();
    const refusedOk = /pre-start only/.test(said);
    say('withdrawn? · ' + (refusedOk ? 'refused, and the door says why: “' + said + '”'
      : 'FAIL: the press said ' + JSON.stringify(said)));
    if (!refusedOk) stuck.push('the ❌ door’s refusal on an invitee after 🍾');
    await closeCard();
    const left = (await rowsUnder('invitees')) || [];
    const stands = left.some((r) => r.t.includes(GUEST2.split('@')[0]));
    say('stands     · ' + (stands
      ? 'the invitation is still there — nothing withdraws it until the close expires it'
      : 'FAIL: the row went, so the act landed after all'));
    if (!stands) stuck.push('the invitee row after a refused withdrawal');
  } finally {
    // the allowance is the step's, and it ends with the step however it ends
    expectRefused.length = 0;
  }
};
await invitationStandsAfterBegin();

await doorShuts('invite', '✉️', '[data-emails]', 'box');
await doorShuts('remove', '❌', '[data-exile]', 'exile');

/* ---- a caret on the column itself, not in a clause (Ed, 2026-08-22) ----
 * Clicking the charter's whitespace, an empty charter, or select-all puts the
 * selection on the host rather than in a block; the page used to let that
 * keystroke through to the browser, which edited the column in place with no
 * card and no proposal. Refused now: the text must not change and nothing
 * may open or send. */
const hostBefore = await page.evaluate(() => {
  const host = document.querySelector('#charter .prose');
  host.scrollIntoView({ block: 'center' });
  const r = document.createRange();
  r.setStart(host, host.childNodes.length);      // after the last block: the host itself
  r.collapse(true);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  return host.textContent;
});
await page.keyboard.type('Z');
await T(500);
const hostAfter = await page.evaluate(() => ({
  text: document.querySelector('#charter .prose').textContent,
  editCard: !!document.querySelector('.sugg.editcard'),
}));
const hostOk = hostAfter.text === hostBefore && !hostAfter.editCard && proposeStatus === null;
say('host caret · ' + (hostOk ? 'keystroke refused, column unchanged'
  : 'FAIL: changed ' + (hostAfter.text !== hostBefore) + ' · card ' + hostAfter.editCard +
    ' · propose-text ' + proposeStatus));
if (!hostOk) stuck.push('host caret');
await T(4200);                                   // the grant flights and their safety nets
say('wallet     · ' + await page.evaluate(() =>
  getComputedStyle(document.getElementById('wallet')).display + ' ' +
  document.getElementById('wallet').textContent.trim()));

/* ---- proposing: 📝 the door, a caret in the charter, then one keystroke ----
 * **📝 is the door** (SURFACE K13 as amended — Ed, 2026-09-01, choosing between
 * *typing should still work* and *design moved*: **"Design moved: click/📝
 * first."**). The charter mounts in read mode with no caret of its own, and a
 * printable character there is refused at `beforeinput` — which is what the
 * `host caret` step above asserts. So **both** branches enter through the tab
 * and write inside edit mode: the ordinary `'X'` extends a clause into the
 * editing card, and `--new-clause` presses Enter at the end of the last clause
 * for a gap site (K31, Q261). The lane starts empty either way.
 *
 * The tab is re-found rather than assumed: `renderRideTab` empties `#ridetab`
 * while a power tab's card is the open one, and by this point in the walk the
 * doors have opened and reverted several cards. A bare `.click()` on the miss
 * would throw inside the page and take the whole walk down with it, hiding the
 * very FAIL lines below. */
const doorPressed = await page.evaluate(() => {
  const t = document.querySelector('#ridetab .achip[data-tab="text"]');
  if (!t) return false;
  t.click();
  return true;
});
await T(300);
const editAgain = { tab: doorPressed, editable: await hostEditable(),
  editing: await page.evaluate(() => document.getElementById('doc').classList.contains('editing')) };
const editAgainOk = doorPressed && editAgain.editable === 'true' && editAgain.editing;
say('edit again · ' + (editAgainOk ? 'editable=true editing=true'
  : 'FAIL: 📝 did not re-enter edit mode · ' + JSON.stringify(editAgain)));
if (!editAgainOk) stuck.push('edit mode again');
const caret = await page.evaluate((empty) => {
  const r = document.createRange();
  let p;
  if (empty) {
    // the one empty clause of an empty document (Q649 (a)): no text node,
    // so the caret goes at offset 0 of the block itself
    p = document.querySelector('#charter .prose p.editable.blank[data-key]');
    if (!p) return null;
    p.scrollIntoView({ block: 'center' });
    r.setStart(p, 0);
  } else {
    p = [...document.querySelectorAll('#charter .prose p')].find((x) => x.textContent.trim().length > 5);
    if (!p) return null;
    p.scrollIntoView({ block: 'center' });
    const tn = [...p.childNodes].find((n) => n.nodeType === 3);
    if (!tn) return null;
    r.setStart(tn, Math.min(3, tn.length));
  }
  r.collapse(true);
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
  return p.dataset.key || '(no key)';
}, EMPTY_TEXT);
say('caret      · ' + (caret || 'FAIL: no charter paragraph to type in'));
if (caret) {
  /* Inside edit mode the ordinary `'X'` is applied by `typeAt` to the block the
   * selection stands in and opens the editing card; `--new-clause` puts the
   * caret at the **end of the last clause** and presses Enter instead, the gap
   * branch hanging off `beforeinput`'s `insertParagraph`, which only fires on
   * an editable host. Both need the door above, and neither reaches the page
   * without it. */
  if (NEW_CLAUSE && !EMPTY_TEXT) {
    /* The last clause is looked for, never assumed — the same discipline as the
     * 📝 tab above (F18, deferred from backlog 261). An unexpected document
     * state left `ps` empty and the deref threw inside the page, which takes the
     * whole walk down and hides every FAIL line below it: an exception says
     * *something happened in a browser*, where a named step says which step
     * wanted what. */
    const lastClause = await page.evaluate(() => {
      const ps = [...document.querySelectorAll('#charter .prose p.editable[data-key]')].filter((p) => !p.classList.contains('gap'));
      const p = ps[ps.length - 1];
      if (!p) return null;
      p.scrollIntoView({ block: 'center' });
      const r = document.createRange(); r.selectNodeContents(p); r.collapse(false);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      return p.dataset.key || '(no key)';
    });
    /* …and the step that could not find its caret does not press anything.
     * Enter with no selection lands wherever focus happens to be, which is a
     * keystroke into the document under test — and the gap assertion below
     * would then fail a second time over the same one cause, so the run
     * names two broken things where there is one. */
    if (!lastClause) {
      say('clause end · FAIL: no clause to press Enter at — #charter .prose p.editable[data-key] (not .gap) matched nothing');
      stuck.push('the last clause');
    } else {
      await page.keyboard.press('Enter');
      await T(700);
      const g = await page.evaluate(() => {
        const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
        const head = document.querySelector('.sugg.editcard .clausehead .headlab');
        return { key: d && d.sites[0] ? d.sites[0].keys[0] : null, text: d && d.sites[0] ? d.sites[0].text : null,
          insertAfter: d && d.sites[0] ? d.sites[0].insertAfterKey : null, label: head ? head.textContent.trim() : null,
          anchor: !!document.querySelector('.insert-anchor[data-anchor="draft-yours"]') };
      });
      const gapOk = /^G\d+$/.test(g.key || '') && g.text === '' && /new clause/i.test(g.label || '');
      say('new clause · ' + (gapOk ? 'Enter at the end opens a draft on ' + g.key + ' — “' + g.label + '”'
        : 'FAIL: ' + JSON.stringify(g)));
      if (!gapOk) stuck.push('the gap site');
      await page.keyboard.type('A new clause, proposed into the gap.');
      await T(300);
    }
  } else {
    await page.keyboard.type('X');
    await T(700);
  }
  const r = await page.evaluate(() => ({
    editCard: !!document.querySelector('.sugg.editcard'),
    proposeBtn: !!document.querySelector('[data-act="draft-propose"]:not([disabled])'),
  }));
  say('typing     · ' + (r.editCard ? 'opens the editing card' : 'FAIL: no editing card') +
    ' · propose control ' + (r.proposeBtn ? 'present and live' : 'MISSING'));
  /* ---- **🗑️ per site on a patch** (Q1306 (a), Ed 2026-09-10: *the 🗑️ for the
   * edit in one place should only discard that edit, not the whole patch*).
   * A second site makes the draft a patch — two cards, one draft — and the
   * second card's 🗑️ must take its own place alone: one site left, the first
   * card still open on what it holds, edit mode still on. The second site is
   * a clause two blocks clear of the first where the document has one (a
   * neighbour would join the run instead, K15), and otherwise **a gap** after
   * the last clause outside the draft, since a gap never joins a run (Q261) —
   * which is this walk's own case, its document being two adjacent clauses.
   * When the first site is the gap (`--new-clause`) any clause serves. The
   * **second** site is the one discarded so that what the walk goes on to
   * propose is the site it typed first, in both branches. Before the fix the
   * press dropped the whole draft, which this reads as `sites 0`. An empty
   * document has one clause and nowhere for a second site, so the step
   * stands down there rather than inventing one. */
  if (EMPTY_TEXT) {
    say('site bin   · skipped — an empty document has one clause, so there is no patch to make');
  } else {
    // a paragraph's words without its gutter: the tab and the fold are text too
    const second = await page.evaluate(() => {
      const strip = (p) => { const c = p.cloneNode(true); c.querySelectorAll('.chipcol, .nocaret').forEach((el) => el.remove()); return c.textContent.trim(); };
      const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
      if (!d || d.sites.length !== 1) return null;
      const DOC = window.SESSION.DOC;
      const idx = (k) => DOC.findIndex((l) => l.key === k);
      const first = { key: d.sites[0].keys[0], text: d.sites[0].text };
      const gapFirst = /^G\d+$/.test(first.key);
      const held = d.sites[0].keys.map(idx);
      const ps = [...document.querySelectorAll('#charter .prose p.editable[data-key]')]
        .filter((p) => !p.closest('.sugg') && !p.classList.contains('gap') && strip(p).length > 5);
      const sel = (r) => { const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
      const p = gapFirst ? ps[0] : ps.find((x) => held.every((i) => Math.abs(idx(x.dataset.key) - i) > 1));
      if (p) {
        const tn = [...p.childNodes].find((n) => n.nodeType === 3);
        if (!tn) return null;
        p.scrollIntoView({ block: 'center' });
        const r = document.createRange(); r.setStart(tn, Math.min(3, tn.length)); r.collapse(true); sel(r);
        return { kind: 'clause', key: p.dataset.key, text: strip(p), first };
      }
      const last = ps[ps.length - 1];
      if (gapFirst || !last || d.keys.includes(last.dataset.key)) return null;
      last.scrollIntoView({ block: 'center' });
      const r = document.createRange(); r.selectNodeContents(last); r.collapse(false); sel(r);
      return { kind: 'gap', key: null, text: null, first, after: last.dataset.key };
    });
    if (!second) {
      say('site bin   · FAIL: nowhere to make a second site — no clause clear of the draft, and no clause end outside it');
      stuck.push('a second site');
    } else {
      if (second.kind === 'gap') {
        await page.keyboard.press('Enter');
        await T(700);
        second.key = await page.evaluate((firstKey) => {
          const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
          const s = d && d.sites.find((x) => x.keys[0] !== firstKey);
          return s ? s.keys[0] : null;
        }, second.first.key);
      }
      await page.keyboard.type('Y');
      await T(700);
      const two = await page.evaluate(() => {
        const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
        return { sites: d ? d.sites.length : 0, cards: document.querySelectorAll('.sugg.editcard').length,
          keys: d ? d.sites.map((s) => s.keys[0]) : [] };
      });
      const twoOk = two.sites === 2 && two.cards === 2 && !!second.key && two.keys.includes(second.key);
      const bin = twoOk && await handle('.sugg.editcard[data-site="' + second.key + '"] [data-act="draft-cancel"]',
        'the second card’s 🗑️');
      let binTitle = null;
      if (bin) {
        binTitle = await bin.getAttribute('title');
        await bin.scrollIntoViewIfNeeded();
        await bin.click();
        await T(700);
      }
      const one = await page.evaluate((k) => {
        const strip = (p) => { const c = p.cloneNode(true); c.querySelectorAll('.chipcol, .nocaret').forEach((el) => el.remove()); return c.textContent.trim(); };
        const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
        const p = document.querySelector('#charter .prose p.editable[data-key="' + k + '"]');
        return { sites: d ? d.sites.length : 0, first: d && d.sites[0] ? d.sites[0].keys[0] : null,
          firstText: d && d.sites[0] ? d.sites[0].text : null,
          cards: document.querySelectorAll('.sugg.editcard').length,
          back: !!(p && !p.closest('.sugg')), paraText: p ? strip(p) : null,
          // the gap bookkeeping is each site's own since Q1311, never the draft's
          gapKeys: d ? d.sites.filter((s) => s.gapKey).map((s) => s.gapKey) : [],
          anchor: !!document.querySelector('.insert-anchor[data-anchor="draft-yours"]'),
          openId: window.SESSION.openId, editing: document.getElementById('doc').classList.contains('editing'),
          row: !!document.querySelector('#charter [data-proposalrow]') };
      }, second.key);
      // its own place back: a clause's words as they were, a gap closed with its anchor gone
      const placeBack = second.kind === 'clause' ? one.back && one.paraText === second.text
        : !one.anchor && !one.gapKeys.includes(second.key);
      const oneOk = twoOk && !!bin && one.sites === 1 && one.first === second.first.key && one.firstText === second.first.text &&
        one.cards === 1 && placeBack && one.openId === 'draft-yours' && one.editing && one.row;
      say('site bin   · ' + (oneOk
        ? 'two sites, and the second card’s 🗑️ takes its own: ' + (second.kind === 'gap' ? 'the gap ' + second.key + ' after ' + second.after + ' closed' : second.key + ' back in the column') +
          ', ' + one.first + ' still open · “' + binTitle + '”'
        : 'FAIL: ' + JSON.stringify({ two, one, second: { kind: second.kind, key: second.key, firstKey: second.first.key } })));
      if (!oneOk) stuck.push('🗑️ per site');
    }
  }
  /* ---- **two gap sites, each on its own anchor** (Q1311, Ed 2026-09-10) ----
   * A patch may hold two gaps — a new clause after clause 2 and another after
   * clause 6 — and until this the gap bookkeeping (`gapKey`, `insertAfterKey`)
   * sat on the draft, so a second gap had nowhere to stand: one anchor, one
   * card, whichever gap wrote last. It is each site's own now. The step adds
   * gaps until the draft holds two, at the edges of clauses outside it (Enter
   * at a clause's start makes the gap before it, at its end the gap after —
   * K31), which on this walk's two-clause document means, in the default
   * shape, the gap **after the clause the draft has swallowed** (`G1` after
   * `L0` — no anchor was drawn there before this, the column's writing branch
   * leaving the loop above the anchors) and the gap after the last; under
   * `--new-clause`, whose draft already holds the last gap, the gap before
   * `L0` (the head anchor, `insertAfterKey` null) and the one between. Two
   * anchors keyed by site, a card on each with its own typing, a rail entry
   * per site, none hidden, and nothing on the draft itself; then the
   * first-added gap's card 🗑️ takes its own — the other gap's anchor, card
   * and text stand — and the rest of what was added is binned the same way,
   * so the draft is back to the site it typed first and what the walk goes on
   * to propose is unchanged. */
  if (EMPTY_TEXT) {
    say('two gaps   · skipped — an empty document has one clause, so there is no gap to add');
  } else {
    const before = await page.evaluate(() => {
      const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
      return d ? { sites: d.sites.map((s) => ({ key: s.keys[0], text: s.text })), gaps: d.sites.filter((s) => s.gapKey).map((s) => s.gapKey) } : null;
    });
    // where the gaps can go: each clause outside the draft offers the gap
    // before it and the gap after, less any the draft already holds
    const plan = before && before.sites.length === 1 ? await page.evaluate((need) => {
      const strip = (p) => { const c = p.cloneNode(true); c.querySelectorAll('.chipcol, .nocaret').forEach((el) => el.remove()); return c.textContent.trim(); };
      const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
      const held = new Set(d.sites.map((s) => s.keys[0]));
      const num = (k) => { const m = /(\d+)$/.exec(k); return m ? +m[1] : -1; };
      const ps = [...document.querySelectorAll('#charter .prose p.editable[data-key]')]
        .filter((p) => !p.closest('.sugg') && !p.classList.contains('gap') && strip(p).length > 5);
      const out = [];
      for (const p of ps) for (const edge of ['start', 'end']) {
        const gap = 'G' + (num(p.dataset.key) + (edge === 'end' ? 1 : 0));
        if (held.has(gap) || out.some((o) => o.gap === gap)) continue;
        out.push({ key: p.dataset.key, edge, gap });
      }
      return out.slice(0, need);
    }, 2 - before.gaps.length) : null;
    if (!before || before.sites.length !== 1 || !plan || plan.length !== 2 - before.gaps.length) {
      say('two gaps   · FAIL: no draft of one site to add gaps to, or nowhere to add them · ' + JSON.stringify({ before, plan }));
      stuck.push('two gaps');
    } else {
      const added = [];
      for (const step of plan) {
        await page.evaluate(({ key, edge }) => {
          const p = document.querySelector('#charter .prose p.editable[data-key="' + key + '"]');
          p.scrollIntoView({ block: 'center' });
          const r = document.createRange();
          if (edge === 'end') { r.selectNodeContents(p); r.collapse(false); }
          else { const tn = [...p.childNodes].find((n) => n.nodeType === 3); r.setStart(tn, 0); r.collapse(true); }
          const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        }, step);
        await page.keyboard.press('Enter');
        await T(700);
        await page.keyboard.type('New clause in ' + step.gap + '.');
        await T(500);
        added.push(step.gap);
      }
      const read = () => page.evaluate(() => {
        const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
        const lanes = {};
        document.querySelectorAll('.sugg.editcard[data-site]').forEach((c) => { const l = c.querySelector('[data-lane]'); lanes[c.dataset.site] = l ? l.textContent : null; });
        return {
          sites: d ? d.sites.map((s) => ({ key: s.keys[0], text: s.text, gapKey: s.gapKey ?? null, after: s.insertAfterKey === undefined ? 'undef' : s.insertAfterKey })) : [],
          gaps: d ? d.sites.filter((s) => s.gapKey).map((s) => s.gapKey) : [],
          onDraft: d ? ('gapKey' in d) || ('insertAfterKey' in d) : false,
          anchors: [...document.querySelectorAll('.insert-anchor[data-anchor="draft-yours"]')].map((a) => a.dataset.site || null),
          cards: [...document.querySelectorAll('.sugg.editcard')].map((c) => c.dataset.site),
          rail: [...document.querySelectorAll('.qitem[data-q="draft-yours"]')].map((q) => ({ site: q.dataset.site, shown: q.style.display !== 'none' })),
          lanes,
        };
      });
      const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
      const two = await read();
      const gapsHere = [...before.gaps, ...added];
      const gapsOk = same(two.gaps, gapsHere) && two.sites.every((s) => !s.gapKey || s.after !== 'undef') && !two.onDraft;
      const twoOk = gapsOk && two.gaps.length === 2 && same(two.anchors, two.gaps) && same(two.cards, two.sites.map((s) => s.key)) &&
        two.rail.length === two.sites.length && two.rail.every((r) => r.shown) &&
        added.every((g) => two.lanes[g] === 'New clause in ' + g + '.');
      say('two gaps   · ' + (twoOk
        ? 'two gap sites ' + two.gaps.join(' and ') + ' (after ' + two.sites.filter((s) => s.gapKey).map((s) => s.after === null ? 'the start' : s.after).join(', ') +
          '), two anchors keyed by site, ' + two.cards.length + ' cards, ' + two.rail.length + ' rail entries shown, nothing on the draft'
        : 'FAIL: ' + JSON.stringify({ two, added, before })));
      if (!twoOk) stuck.push('two gap sites');
      // the first-added gap's own 🗑️, and the other stands
      const other = gapsHere.find((g) => g !== added[0]);
      let stood = null;
      const bin1 = twoOk && await handle('.sugg.editcard[data-site="' + added[0] + '"] [data-act="draft-cancel"]', 'the first gap’s 🗑️');
      if (bin1) {
        await bin1.scrollIntoViewIfNeeded();
        await bin1.click();
        await T(700);
        stood = await read();
        const otherText = before.gaps.includes(other) ? before.sites.find((s) => s.key === other).text : 'New clause in ' + other + '.';
        const stoodOk = same(stood.gaps, [other]) && same(stood.anchors, [other]) && stood.cards.includes(other) && !stood.cards.includes(added[0]) &&
          stood.lanes[other] === otherText && stood.sites.length === two.sites.length - 1 && !stood.onDraft;
        say('gap bin    · ' + (stoodOk
          ? added[0] + '’s 🗑️ takes its own: its anchor and card gone, ' + other + ' standing on its anchor with its text'
          : 'FAIL: ' + JSON.stringify({ stood, added, other })));
        if (!stoodOk) stuck.push('the other gap standing');
      }
      // …and what this step added goes the same way, so the draft is what it was
      for (const g of added.slice(1)) {
        const b = await handle('.sugg.editcard[data-site="' + g + '"] [data-act="draft-cancel"]', 'the gap’s 🗑️');
        if (!b) break;
        await b.scrollIntoViewIfNeeded();
        await b.click();
        await T(700);
      }
      const after = await read();
      const backOk = same(after.sites.map((s) => s.key), before.sites.map((s) => s.key)) &&
        before.sites.every((s) => after.sites.find((x) => x.key === s.key && x.text === s.text)) && same(after.anchors, before.gaps);
      say('gaps back  · ' + (backOk ? 'the draft is its first site again, ' + before.sites.map((s) => s.key).join(', ')
        : 'FAIL: ' + JSON.stringify({ before, after })));
      if (!backOk) stuck.push('the draft back to one site');
    }
  }
  /* ---- **the door in both directions** (Q1133, Ed's QA 2026-09-02) ---------
   * The walk already leaves edit mode twice, above — but both from a column
   * with **no draft on it**, and that is the half that worked. Ed's step 5 is
   * this one: press 📝 with an editing card open. K31 says one press leaves —
   * the card closes into its clause, the lift and the caret go, the row goes —
   * and that **the draft is kept**, leaving not being discarding. The pre-fix
   * page reported `editing=true editable=true` here: the editing card closed
   * underneath a column that stayed lifted and writable, so the door opened
   * and did not close.
   *
   * The draft is read off `SUGGS` on both sides of the press rather than
   * assumed from what was typed, since the two branches above type different
   * things into different kinds of site; and then it is **found again** the
   * way a member would find it — 📝 back in, its own chip in the gutter — which
   * is also what hands the steps below the open card they expect. */
  const beforeLeave = await page.evaluate(() => {
    const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
    return d ? (d.sites || []).map((s) => s.text).join('¶') : null;
  });
  await page.evaluate(() => {
    const t = document.querySelector('#ridetab .achip[data-tab="text"]');
    if (t) t.click();
  });
  await T(400);
  const left = await page.evaluate(() => {
    const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
    return {
      editing: document.getElementById('doc').classList.contains('editing'),
      editable: (document.querySelector('#charter .prose') || {}).getAttribute
        ? document.querySelector('#charter .prose').getAttribute('contenteditable') : '(none)',
      card: !!document.querySelector('.sugg.editcard'),
      row: !!document.querySelector('#charter [data-proposalrow]'),
      openId: window.SESSION.openId,
      draft: d ? (d.sites || []).map((s) => s.text).join('¶') : null,
    };
  });
  const leftOk = !left.editing && left.editable === 'false' && !left.card && !left.row &&
    left.openId == null && left.draft !== null && left.draft === beforeLeave;
  say('leave draft· ' + (leftOk ? '📝 with a draft open leaves edit mode and keeps the draft'
    : 'FAIL: ' + JSON.stringify(left) + ' · the draft was ' + JSON.stringify(beforeLeave)));
  if (!leftOk) stuck.push('leaving edit mode with a draft open');
  /* …and back in: the draft is still on the page, reachable from its own chip,
   * with the text it had. A leave that quietly dropped the draft would pass
   * every assertion above and fail here. */
  const foundAgain = await page.evaluate(() => {
    const t = document.querySelector('#ridetab .achip[data-tab="text"]');
    if (t) t.click();
    return !!t;
  });
  await T(400);
  const reopened = await page.evaluate(() => {
    const chip = document.querySelector('.achip[data-anchor="draft-yours"]');
    if (chip) chip.click();
    return !!chip;
  });
  await T(400);
  const back = await page.evaluate(() => {
    const lane = document.querySelector('.sugg.editcard [data-lane]');
    return { editing: document.getElementById('doc').classList.contains('editing'),
      card: !!document.querySelector('.sugg.editcard'),
      lane: lane ? lane.textContent : null };
  });
  const backOk = foundAgain && reopened && back.editing && back.card && !!back.lane;
  say('draft kept · ' + (backOk ? '📝 again, its chip in the gutter, and the draft is where it was'
    : 'FAIL: ' + JSON.stringify({ foundAgain, reopened, ...back })));
  if (!backOk) stuck.push('the draft did not survive the leave');
  /* ---- the sign control (Q770): there under an elective 👤 rung, absent
   * under a fixed one; pressing *Signed* flips the draft without a render
   * (the lane keeps its caret) and the ✏️ hold's title says what leaves. */
  const sc = await page.evaluate(() => {
    const ctl = document.querySelector('.sugg.editcard .signctl');
    const picks = ctl ? [...ctl.querySelectorAll('[data-act="draft-sign"]')] : [];
    return { present: !!ctl, base: ctl ? ctl.dataset.signbase : null,
      labels: picks.map((b) => b.textContent.trim()),
      on: picks.map((b) => b.getAttribute('aria-pressed')) };
  });
  if (ELECTIVE) {
    const shape = sc.present && sc.labels.length === 2 && sc.on[0] === 'true' && sc.on[1] === 'false' &&
      sc.labels[0] === 'Anonymous' && /^Signed — as /.test(sc.labels[1]);
    say('sign ctl   · ' + (shape ? 'present under ' + AUTHORSHIP + ' (base ' + sc.base + '), Anonymous by default · ' +
      JSON.stringify(sc.labels) : 'FAIL: no sign control · ' + JSON.stringify(sc)));
    if (!shape) stuck.push('no sign control');
    const signBtn = shape && await handle('.sugg.editcard [data-act="draft-sign"][data-signed="1"]', 'sign button');
    if (signBtn) {
      await signBtn.scrollIntoViewIfNeeded();
      await signBtn.click();
      await T(300);
      const flipped = await page.evaluate(() => {
        const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
        const pb = document.querySelector('.sugg.editcard [data-act="draft-propose"]');
        const lane = document.querySelector('.sugg.editcard [data-lane]');
        return { signed: !!(d && d.signed), title: pb ? pb.title : '',
          pressed: [...document.querySelectorAll('.sugg.editcard [data-act="draft-sign"]')].map((b) => b.getAttribute('aria-pressed')),
          laneText: lane ? lane.textContent : null };
      });
      const okFlip = flipped.signed && / — signed — /.test(flipped.title) && flipped.pressed.join() === 'false,true';
      say('signed     · ' + (okFlip ? 'the draft is signed, the card patched in place · title “' + flipped.title.slice(0, 60) + '…”'
        : 'FAIL: ' + JSON.stringify(flipped)));
      if (!okFlip) stuck.push('the sign choice did not take');
    }
  } else {
    say('sign ctl   · ' + (!sc.present ? 'absent under ' + AUTHORSHIP + ', as a fixed rung offers no choice'
      : 'FAIL: a sign control under ' + AUTHORSHIP + ' · ' + JSON.stringify(sc)));
    if (sc.present) stuck.push('a sign control under a fixed rung');
  }
  /* **And now the hold itself** (2026-08-22). This step used to say the
   * gesture could not be exercised here, and the bug it could not see cost
   * two live proposals: the hold released on `pointerleave`, so a render
   * mid-hold — or `.holding`’s own 0.78px shrink under a stationary cursor —
   * cancelled it in silence. What that reasoning got wrong is that the hold
   * does not need an *animation*: it needs a **pointer held down**, which
   * Playwright can do exactly and for as long as it likes. The flight cannot
   * be judged here and is not asserted; the commit can, and now is.
   * A render is forced in the middle on purpose — that is the failing case. */
  const pb = await handle('[data-act="draft-propose"]:not([disabled])', 'propose ctl');
  if (pb) await pb.scrollIntoViewIfNeeded();
  const bx = pb ? await pb.boundingBox() : null;
  let ok = false;
  if (bx) {
    await page.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2);
    /* Under `click` the click is the whole gesture and there is nothing to let
     * go of (backlog 184), but everything this step asserts is the same in both
     * positions: 500ms in the flight is in the air (`holding` true, a
     * `.flypencil` on the page), the forced render happens *under* it, and the
     * commit lands from a button that render destroyed. */
    const proposeGesture = await pageGesture();
    if (proposeGesture === 'click') await page.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
    else await page.mouse.down();
    await T(500);
    /* **and the held button does not move** (entry 59). Two things on this page
     * answered to `holding` — the hold's own class and the stranger's sentence,
     * whose `margin: … auto …` rule centred the ✏️ in its own commit row for the
     * length of the hold. Sampled here, *before* the forced render: after it the
     * node under the pointer is a new one, and what this asserts is the held
     * button. Both axes of the box, because the sentence's rule also carried a
     * max-width — a button that keeps its centre and loses its width has moved
     * just as surely. */
    const mid = await page.evaluate(() => {
      const b = document.querySelector('[data-act="draft-propose"]');
      const r = b && b.getBoundingClientRect();
      return { holding: window.SESSION.holding,
        flying: !!document.querySelector('.flypencil'), edits: window.SESSION.editsHeld,
        cx: r ? r.x + r.width / 2 : null, w: r ? r.width : null };
    });
    // scale(0.97) moves each edge by under a pixel and the centre by none, so
    // 2px is a margin rather than a tolerance for drift; the width is allowed
    // the 3% the transform takes off it
    const movedX = mid.cx === null ? Infinity : Math.abs(mid.cx - (bx.x + bx.width / 2));
    const movedW = mid.w === null ? Infinity : Math.abs(mid.w - bx.width);
    const stillThere = movedX < 2 && movedW < bx.width * 0.05 + 1;
    await page.evaluate(() => window.SESSION && window.SESSION.renderAll());
    await T(3200);
    if (proposeGesture !== 'click') await page.mouse.up();
    await T(900);
    const after = await page.evaluate(() => ({ edits: window.SESSION.editsHeld,
      mine: (window.SESSION.SUGGS || []).filter((x) => x.mine && x.unproposed !== true).length }));
    ok = proposeStatus !== null && proposeStatus < 400 && after.edits < mid.edits
      && stillThere;
    say('propose    · ' + (ok
      ? 'held through a render · propose-text ' + proposeStatus + ' · wallet ' +
        mid.edits + '→' + after.edits + ' · ' + after.mine + ' of mine standing · stayed put'
      : 'FAIL: propose-text ' + proposeStatus + ' · wallet ' + mid.edits + '→' + after.edits +
        ' · held ' + mid.holding + ' · flying ' + mid.flying +
        (stillThere ? '' : ' · moved ' + Math.round(movedX) + 'px while held (width ' +
          Math.round(bx.width) + '→' + Math.round(mid.w) + ')')));
  }
  if (!ok) stuck.push('propose hold');
  // L5 — committed on Propose (the hold above): the proposal's ✏️ entry stands
  // in the rail, pinned (M1). *Answered 🏛️ leaves the rail* is the row's other
  // half and is not driven here: this walk raises no constitutional motion.
  if (ok) {
    await T(600);
    const l5 = await page.evaluate(() => {
      const d = (window.SESSION.SUGGS || []).find((x) => x.mine && x.unproposed !== true);
      if (!d) return { id: null };
      const q = String(d.id).replace(/["\\]/g, '\\$&');
      const li = document.querySelector('#rail li[data-q="' + q + '"]');
      return { id: d.id, entry: !!li, mark: li ? ((li.querySelector('.qmark') || {}).textContent || '').trim() : null,
        pinned: !!(li && li.classList.contains('pinned')) };
    });
    const l5Ok = l5.entry && l5.mark === '✏️' && l5.pinned;
    say(L('L5') + (l5Ok ? 'the proposal’s ✏️ entry is in the rail and pinned' : 'FAIL: ' + JSON.stringify(l5)));
    if (!l5Ok) stuck.push('L5: the ✏️ entry pinned');
  }

  /* ---- --new-clause: the wire holds a pure insertion at the end ---------- */
  if (ok && NEW_CLAUSE && !EMPTY_TEXT) {
    await T(1200);
    const ins = await page.evaluate(() => {
      const api = location.pathname.replace('/d/', '/api/d/');
      return fetch(api + '/view').then((r) => r.json()).then((v) => {
        const n = v.text === '' ? 0 : String(v.text).split('\n').length;
        const hunks = (v.clauses || []).flatMap((c) => c.candidates).flatMap((c) => c.hunks || []);
        return { n, hunks: hunks.map((h) => [h.start, h.end]) };
      });
    });
    const insOk = ins.hunks.some((h) => h[0] === h[1] && h[0] === ins.n);
    say('insertion  · ' + (insOk ? 'the candidate is a pure insertion at [' + ins.n + ', ' + ins.n + ')'
      : 'FAIL: ' + JSON.stringify(ins)));
    if (!insOk) stuck.push('the insertion hunk');
  }

  /* ---- what left (Q770): the standing `mine` item carries the choice, and
   * the wire names the founder on that clause's candidate exactly when it was
   * signed — the one reveal rule, read at the server, never on the page. */
  if (ok) {
    await T(1200);                                 // the propose's own refresh
    const wire = await page.evaluate(() => {
      const mine = (window.SESSION.SUGGS || []).filter((x) => x.mine && x.unproposed !== true);
      const api = location.pathname.replace('/d/', '/api/d/');
      return fetch(api + '/view').then((r) => r.json()).then((v) => ({
        mine: mine.map((m) => ({ signed: !!m.signed, cap: m.cap })),
        wireMine: (v.mine || []).map((m) => ({ id: m.id, signed: !!m.signed })),
        authors: (v.clauses || []).flatMap((c) => c.candidates).map((c) => (c.author && c.author.name) || null),
        // **the face travels with the name** (K30): one `authorVisible` gate,
        // two fields, so an author the wire names is one it also faces
        faces: (v.clauses || []).flatMap((c) => c.candidates)
          .filter((c) => c.author && c.author.name).map((c) => c.author.picture || null),
      }));
    });
    const named = wire.authors.filter(Boolean);
    const faced = wire.faces.every((p) => p === FOUNDER_FACE);
    const okWire = ELECTIVE
      ? wire.mine.length > 0 && wire.mine.every((m) => m.signed && / · signed$/.test(m.cap)) &&
        wire.wireMine.every((m) => m.signed) && named.length === wire.authors.length &&
        named.length > 0 && faced
      : wire.mine.every((m) => !m.signed) && wire.wireMine.every((m) => !m.signed) && named.length === 0;
    say('named      · ' + (okWire
      ? (ELECTIVE ? 'signed: the mine line says so and the wire names ' + JSON.stringify(named) +
        ', with ' + FOUNDER_FACE.slice(1) + ' on it'
        : 'unsigned under ' + AUTHORSHIP + ': the wire names nobody')
      : 'FAIL: ' + JSON.stringify(wire)));
    if (!okWire) stuck.push('the signed proposal on the wire');

    /* ---- and the face on your own line (K30) ------------------------------
     * The `minecard` is your only reading of a proposal that has left you, so
     * it has to be the *room's* reading of it: signed, so the disc gives way
     * to the founder's own picture. Read by opening the card the page's own
     * way, as the 👤 block below does — a click needs a gutter tab the reader
     * may have scrolled past, and what is under test is the card's contents. */
    if (ELECTIVE) {
      const seen = await page.evaluate(() => {
        const d = (window.SESSION.SUGGS || []).find((x) => x.mine && x.unproposed !== true);
        if (!d) return { found: false };
        try { window.SESSION.toggle(d.id, false); } catch { /* already open */ }
        const q = String(d.id).replace(/["\\]/g, '\\$&');
        const card = document.querySelector('.sugg[data-card="' + q + '"]');
        if (!card) return { found: false, id: d.id };
        const sp = card.querySelector('.speaker');
        return { found: true, id: d.id, revealed: !!(sp && sp.classList.contains('revealed')),
          face: sp ? (sp.querySelector('.spkface .emojiface, .spkface .av') || {}).textContent : null };
      });
      const okFace = seen.found && seen.revealed && seen.face === FOUNDER_FACE.slice(1);
      say('your face  · ' + (okFace
        ? 'the signed line wears ' + seen.face + ' where the sealed disc stands unsigned'
        : 'FAIL: ' + JSON.stringify(seen)));
      if (!okFace) stuck.push('the face on your own signed line');
      await page.evaluate(() => {
        const d = (window.SESSION.SUGGS || []).find((x) => x.mine && x.unproposed !== true);
        if (d) { try { window.SESSION.toggle(d.id, false); } catch { /* already shut */ } }
      });
      await T(600);
    }
  }

  /* ---- 👤 the sealed speaker: somebody else's proposal, read by a member --
   * Promise coverage for 👤 (backlog 83, batch L). What the rung governs is
   * what everybody *else* sees, so the assertion needs a proposer who is not
   * the reader. The founder proposed above, so here the **guest** proposes and
   * the **founder's** page is the reader — the founder as an ordinary member,
   * which §3.5a gives no exception to. Y9 exempts the founder's own ✒️
   * rationale from the seal and is not in play: this block is the guest's.
   *
   * The guest proposes **at the wire**, the way `secondSeatOnAmendment` amends
   * at the wire and for the same reason — what is under test is the *reader's*
   * card, and driving the guest's composer would be a second thing to go wrong
   * in one check. (It is also the only route open: the ⚖️ gate is never served
   * to a member who reloads past 🍾, so their charter withholds every race —
   * a finding of its own, filed, and nothing to do with 👤.)
   *
   * **The assertion is rung-blind, deliberately.** `design/session.js` calls
   * `speakerHtml(c.why)` with no `who` for every live proposal block at every
   * rung — no code path draws a name on a live card, `public` included, though
   * `raceCards` carries the author id under `public` (locked in
   * `packages/server/test/server.test.ts`). So this guards the seal itself and
   * prints the rung standing, so a reader can see which promise it was under. */
  if (guestPage && ok) {
    // **Its own clause, deliberately.** The founder proposed on line 0 above,
    // and a rival on the same lines joins that race — where the founder's
    // served card is the **rival pair**, their own text against the incumbent
    // being the one pair an author is never asked (backlog 253), so that card
    // draws the guest's block beside theirs. On the second line the guest's
    // proposal is a race of its own, and the founder's card for it holds
    // exactly one block: the guest's, which is what this step needs.
    const line = EMPTY_TEXT ? 0 : 1;
    const sent = await guestPage.evaluate((n) => {
      const api = location.pathname.replace('/d/', '/api/d/');
      return fetch(api + '/view').then((r) => r.json()).then((v) => fetch(api + '/cmd', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cmd: 'propose-text', args: { baseVersion: v.textVersion,
          hunks: [{ start: n, end: n + 1, lines: ['Every member may bring two guests.'] }],
          why: 'Sundays are the point' } }),
      })).then((r) => r.json()).catch((e) => ({ error: String(e && e.message) }));
    }, line);
    if (sent && sent.error) {
      say('their draft· FAIL: the member could not propose · ' + JSON.stringify(sent.error));
      stuck.push('the second seat’s proposal');
    } else {
      // **The poll does not land under an open card** (`remoteCS`), and the
      // propose step leaves the founder's own editing card open — so the card
      // is closed *first* and the poll waited for afterwards, or the reader's
      // `SUGGS` still holds the field as it stood before the guest proposed.
      await closeCard();
      await T(5600);                               // one poll in the founder's seat
      say('their draft· the member proposes at the wire · ' +
        JSON.stringify(sent.result || sent).slice(0, 60));
      // Every card in the column, until the one carrying the guest's own
      // rationale. `toggle` is the page's own opener and the one `card-audit`
      // drives; a click needs a live gutter tab, which the reader may have
      // scrolled past, and what is under test is the card's contents.
      const ids = await page.evaluate(() => (window.SESSION.SUGGS || []).map((x) => x.id));
      let seen = { ids, theirs: false };
      const all = [];
      for (const id of ids) {
        await page.evaluate((k) => { try { window.SESSION.toggle(k, false); } catch { /* already open, or already shut */ } }, id);
        await T(900);
        const r = await page.evaluate(([k, name]) => {
          const q = String(k).replace(/["\\]/g, '\\$&');
          const card = document.querySelector('.sugg[data-card="' + q + '"]');
          if (!card) return { id: k, card: false };
          // what the card is, in one line, so a failure names the card it read
          const said = card.textContent.replace(/\s+/g, ' ').trim().slice(0, 90);
          // **Every** speaker in the card, not one of them: the rung is a
          // promise about the whole card, and reading one block would let a
          // named one hide behind an unnamed incumbent.
          const sps = [...card.querySelectorAll('.speaker')];
          const rung = (document.querySelector('.cpara[data-para="authorship"]') || {}).textContent;
          return { id: k, card: true, said, speakers: sps.length,
            revealed: sps.some((s) => s.classList.contains('revealed')),
            who: sps.some((s) => !!s.querySelector('.who')),
            face: sps.some((s) => !!s.querySelector('.av, .emojiface')),
            named: sps.some((s) => s.textContent.includes(name)),
            // the guest's rationale is visible at every rung (§3.5a), and
            // finding it is what says this block is theirs, not the incumbent's
            theirs: sps.some((s) => s.textContent.includes('Sundays are the point')),
            rung: (rung || '').replace(/\s+/g, ' ').trim().slice(0, 80) };
        }, [id, GUEST_NAME]);
        await page.evaluate((k) => { try { window.SESSION.toggle(k, false); } catch { /* already open, or already shut */ } }, id);
        all.push(r);
        if (r && r.theirs) { seen = r; break; }
      }
      if (!seen.theirs) seen = { ids, all };
      const blank = seen.card && seen.theirs &&
        !seen.revealed && !seen.who && !seen.face && !seen.named;
      say('speaker    · ' + (blank
        ? 'blank on the reader’s page — the guest’s reason is there, their name is not' +
          ' (' + seen.speakers + ' speakers, none revealed) · rung: “' + seen.rung + '”'
        : 'FAIL: ' + JSON.stringify(seen)));
      if (!blank) stuck.push('the sealed speaker on somebody else’s proposal');
      await closeCard();
    }
  }

  /* ---- the pair deck (Q1200) and the ledger (Q1201) ------------------------
   * The guest proposes a **second** wording on the same clause as their
   * first, so the founder's deck on that race holds two incumbent pairs and,
   * once those are judged, the rival pair — three presses on one entry, in
   * the router's order, the entry's teaser always the next pair's case and
   * the entry filing as ⏳ only when the hand on that race is empty. Before
   * the deck the page kept the first served card and filed the race on any
   * standing vote, so a member got one comparison per race for its life.
   *
   * Then the ledger: a **reload** empties the page's provisional maps, so
   * what the ⏳ card lists is the view's own `myJudgments` — three blocks
   * with the verdicts the walk gave — and a press on the first makes it the
   * card's active pair with that verdict pre-selected; choosing the other
   * lane and ✓ sends the revision on the same pair, and a second reload
   * shows the new verdict on the block, off the wire alone.
   *
   * Everything is read off the DOM — the entry's mark, its tooltip, its
   * `.qwhy` teasers, the card's blocks and radios — never off `S`; the race
   * id comes from the wire, which is the one name the rail and the view
   * share. */
  if (guestPage && ok) {
    const line = EMPTY_TEXT ? 0 : 1;
    const WHY1 = 'Sundays are the point', WHY2 = 'One is plenty';
    // **The floor goes above the room first.** Under this walk's founding
    // the floor is one (quorum 1 of 2) and the bar 55%, and an author's
    // derived preference is a mover (§8.2) — so the first judgment anywhere
    // sweeps the *other* challenger in at p ≈ 0.83, and the deck is gone
    // with the race (two runs of this step sealed it exactly so). The founder
    // still holds ✒️ on 👥 here, so a count of three — above E — holds every
    // race at the floor for the rest of the walk, which is this step. Sent
    // from Node with the page's own cookie, so a refusal is printed here
    // rather than counted as the page's.
    const slug = new URL(page.url()).pathname.replace(/^\/d\//, '');
    const jar = (await page.context().cookies(BASE)).map((c) => c.name + '=' + c.value).join('; ');
    const floored = await fetch(BASE + '/api/d/' + slug + '/cmd', { method: 'POST',
      headers: { 'content-type': 'application/json', cookie: jar },
      body: JSON.stringify({ cmd: 'set-setting', args: { setting: 'quorum', value: { form: 'count', n: 3 } } }) })
      .then((r) => r.json()).catch((e) => ({ error: String(e && e.message) }));
    if (floored && floored.error) {
      say('deck       · FAIL: could not raise the floor above the room · ' + JSON.stringify(floored.error));
      stuck.push('the deck’s floor');
    }
    await T(4600);                                   // the founder's poll takes the new floor
    const sent2 = await guestPage.evaluate(([n, why]) => {
      const api = location.pathname.replace('/d/', '/api/d/');
      return fetch(api + '/view').then((r) => r.json()).then((v) => fetch(api + '/cmd', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cmd: 'propose-text', args: { baseVersion: v.textVersion,
          hunks: [{ start: n, end: n + 1, lines: ['Every member may bring one guest, on Sundays.'] }],
          why } }),
      })).then((r) => r.json()).catch((e) => ({ error: String(e && e.message) }));
    }, [line, WHY2]);
    if (sent2 && sent2.error) {
      say('deck       · FAIL: the member could not propose a second wording · ' + JSON.stringify(sent2.error));
      stuck.push('the second seat’s second proposal');
    } else {
      await closeCard();
      await T(5600);                               // one poll in the founder's seat
      const raceId = await page.evaluate((n) => {
        const api = location.pathname.replace('/d/', '/api/d/');
        return fetch(api + '/view').then((r) => r.json()).then((v) =>
          ((v.clauses || []).find((c) => (c.contested || []).some((sp) => sp.start === n)) || {}).id || null);
      }, line);
      // the entry as the founder sees it: how many for this race, its mark,
      // its tooltip and its teasers (the deck's race unless another is named)
      const entry = (id = raceId) => page.evaluate((id) => {
        const q = String(id).replace(/["\\]/g, '\\$&');
        const lis = [...document.querySelectorAll('#rail li[data-q="' + q + '"]')];
        const li = lis[0];
        if (!li) return { n: 0, mark: '', cap: '', teasers: [] };
        const b = li.querySelector('button');
        return { n: lis.length, mark: ((li.querySelector('.qmark') || {}).textContent || '').trim(),
          cap: b ? b.title : '', teasers: [...li.querySelectorAll('.qwhy')].map((e) => e.textContent.trim()) };
      }, id);
      // open the entry from the rail — the page's own route in — and read the
      // card: its kind, the reasons on its blocks, the radios
      const openEntry = async (id = raceId) => {
        await page.evaluate((id) => {
          const q = String(id).replace(/["\\]/g, '\\$&');
          const b = document.querySelector('#rail li[data-q="' + q + '"] button');
          if (b) b.click();
        }, id);
        await T(1400);
        return page.evaluate((id) => {
          const q = String(id).replace(/["\\]/g, '\\$&');
          const card = document.querySelector('.sugg[data-card="' + q + '"]');
          if (!card) return { card: false };
          return { card: true, cls: card.className,
            whys: [...card.querySelectorAll('.field:not(.ledger) .propblock .speaker .said')].map((e) => e.textContent.trim()),
            keepLane: !!card.querySelector('.clausehead [data-v="keep"]'),
            lanes: [...card.querySelectorAll('[data-v]')].map((b) => b.dataset.v + ':' + b.getAttribute('aria-pressed')),
            submitPressed: (card.querySelector('[data-act="submit"]') || {}).getAttribute
              ? card.querySelector('[data-act="submit"]').getAttribute('aria-pressed') : null,
            ledger: [...card.querySelectorAll('.ledgerpair')].map((p) => ({
              active: p.classList.contains('active'),
              on: [...p.querySelectorAll('.lside')].map((s) => s.classList.contains('on')),
              onIsCurrent: !!p.querySelector('.lside.on .rsub'),
            })) };
        }, id);
      };
      const judge = async (v, id = raceId) => {
        const okJ = await page.evaluate(([id, val]) => {
          const q = String(id).replace(/["\\]/g, '\\$&');
          const card = document.querySelector('.sugg[data-card="' + q + '"]');
          const lane = card && card.querySelector('[data-v="' + val + '"]');
          if (!lane) return false;
          lane.click();
          const s = card.querySelector('[data-act="submit"]');
          if (!s || s.disabled) return false;
          s.click();
          return true;
        }, [id, v]);
        await T(2400);                             // the receipt, the command, its refresh
        return okJ;
      };
      const isNeeds = (e) => e.n === 1 && (e.mark === '💡' || e.mark === '🔥');
      if (!raceId) {
        say('deck       · FAIL: no race on line ' + line + ' in the wire');
        stuck.push('the deck’s race');
      } else {
        // 1 — one entry, lit, one teaser: the front pair's case
        const e1 = await entry();
        const ok1 = isNeeds(e1) && e1.teasers.length === 1 && [WHY1, WHY2].includes(e1.teasers[0]);
        say('deck 1     · ' + (ok1 ? 'one entry ' + e1.mark + ' “' + e1.cap + '” · teaser “' + e1.teasers[0] + '”'
          : 'FAIL: ' + JSON.stringify(e1)));
        if (!ok1) stuck.push('the deck’s entry before any judgment');
        const first = e1.teasers[0], other = first === WHY1 ? WHY2 : WHY1;
        // 2 — open, judge: the entry stays lit and its teaser is the other case
        const c1 = await openEntry();
        const ok2 = c1.card && /quick-open/.test(c1.cls) && c1.keepLane && c1.whys.length === 1 && c1.whys[0] === first;
        say('deck 2     · ' + (ok2 ? 'the card is the front pair, quick, its reason “' + first + '”' : 'FAIL: ' + JSON.stringify(c1)));
        if (!ok2) stuck.push('the deck’s first card');
        // **Indifferent, deliberately**: a room of two has a floor of one, so
        // one approving vote adopts the challenger on the spot and the race
        // seals into a record (the first run of this step did exactly that).
        // A tie leaves every posterior at 0.5 and the race standing, which is
        // what a deck needs; the rival pair below touches no incumbent.
        const j1 = await judge('indifferent');
        const e2 = await entry();
        const ok3 = j1 && isNeeds(e2) && e2.teasers.length === 1 && e2.teasers[0] === other;
        say('deck 3     · ' + (ok3 ? 'judged · the entry stays ' + e2.mark + ' “' + e2.cap + '” · teaser now “' + other + '”'
          : 'FAIL: judged ' + j1 + ' · ' + JSON.stringify(e2)));
        if (!ok3) stuck.push('the entry after the first judgment');
        // 3 — press again: the other pair; judge it; the rival pair is next
        const c2 = await openEntry();
        const ok4 = c2.card && /quick-open/.test(c2.cls) && c2.whys.length === 1 && c2.whys[0] === other;
        say('deck 4     · ' + (ok4 ? 'the next press opens the other pair, its reason “' + other + '”' : 'FAIL: ' + JSON.stringify(c2)));
        if (!ok4) stuck.push('the deck’s second card');
        const j2 = await judge('indifferent');
        const e3 = await entry();
        const ok5 = j2 && isNeeds(e3) && e3.teasers.length === 2;
        say('deck 5     · ' + (ok5 ? 'judged · the entry stays ' + e3.mark + ' with two teasers: the rival pair is dealt'
          : 'FAIL: judged ' + j2 + ' · ' + JSON.stringify(e3)));
        if (!ok5) stuck.push('the entry after the second judgment');
        const c3 = await openEntry();
        const ok6 = c3.card && /race-open/.test(c3.cls) && !c3.keepLane && c3.whys.length === 2 &&
          c3.whys.includes(WHY1) && c3.whys.includes(WHY2);
        say('deck 6     · ' + (ok6 ? 'the third press opens the rival pair: a race card, two blocks, no keep lane'
          : 'FAIL: ' + JSON.stringify(c3)));
        if (!ok6) stuck.push('the rival card');
        const j3 = await judge('a');
        const e4 = await entry();
        const ok7 = j3 && e4.n === 1 && e4.mark === '⏳' && e4.teasers.length === 0;
        say('deck 7     · ' + (ok7 ? 'judged · the entry files as ⏳ “' + e4.cap + '”, no teaser — the hand is empty'
          : 'FAIL: judged ' + j3 + ' · ' + JSON.stringify(e4)));
        if (!ok7) stuck.push('the entry once the deck is empty');
        // L4 — the row's close and persistence are deck 3 and deck 7: ✓ closes
        // the card and the entry keeps its mark while a pair is left; it files
        // as ⏳ once nothing on the race can be asked of you
        say(L('L4') + (ok3 && ok7 ? '✓ closes the card, the entry keeps its mark while a pair is left (deck 3), and files as ⏳ once the hand is empty (deck 7)'
          : 'FAIL: deck 3 ' + ok3 + ' · deck 7 ' + ok7 + ' — see the lines above'));

        // 4 — the ledger, after a reload: three blocks, the verdicts given
        await page.reload();
        await page.waitForFunction(() => !!(window.SESSION && window.SESSION.SUGGS && window.SESSION.SUGGS.length &&
          document.querySelector('#rail li')), null, { timeout: 30_000 });
        await T(1500);
        const e5 = await entry();
        const l1 = await openEntry();
        // the two ties mark their Indifferent row (a third side, after the
        // two wordings), the rival pair marks its first side; nothing is active
        const okL1 = e5.mark === '⏳' && l1.card && /ledger-open/.test(l1.cls) && l1.ledger.length === 3 &&
          l1.ledger.every((p) => p.on.filter(Boolean).length === 1) &&
          l1.ledger[0].on.join() === 'false,false,true' && l1.ledger[1].on.join() === 'false,false,true' &&
          l1.ledger[2].on.join() === 'true,false' && l1.ledger.every((p) => !p.active);
        say('ledger 1   · ' + (okL1 ? 'after a reload the ⏳ card lists 3 pairs, each with the verdict given, none active'
          : 'FAIL: ' + JSON.stringify({ e5, l1 })));
        if (!okL1) stuck.push('the ledger after a reload');
        // 5 — press the first block: its pair is the card's, the verdict pre-selected and cast
        await page.evaluate((id) => {
          const q = String(id).replace(/["\\]/g, '\\$&');
          const b = document.querySelector('.sugg[data-card="' + q + '"] .ledgerpair[data-ledger]');
          if (b) b.click();
        }, raceId);
        await T(700);
        const l2 = await page.evaluate((id) => {
          const q = String(id).replace(/["\\]/g, '\\$&');
          const card = document.querySelector('.sugg[data-card="' + q + '"]');
          if (!card) return { card: false };
          return { card: true, cls: card.className,
            pressed: [...card.querySelectorAll('[data-v][aria-pressed="true"]')].map((b) => b.dataset.v),
            keepLane: !!card.querySelector('.clausehead [data-v="keep"]'),
            cast: (card.querySelector('[data-act="submit"]') || {}).getAttribute
              ? card.querySelector('[data-act="submit"]').getAttribute('aria-pressed') : null,
            active: [...card.querySelectorAll('.ledgerpair')].map((p) => p.classList.contains('active')) };
        }, raceId);
        const okL2 = l2.card && /quick-open/.test(l2.cls) && !/ledger-open/.test(l2.cls) && l2.keepLane &&
          l2.pressed.join() === 'indifferent' && l2.cast === 'true' && l2.active.join() === 'true,false,false';
        say('ledger 2   · ' + (okL2 ? 'the first block pressed: the card is that pair, quick, Indifferent pre-selected, ✓ pressed'
          : 'FAIL: ' + JSON.stringify(l2)));
        if (!okL2) stuck.push('the ledger block pressed');
        // 6 — choose the other lane, ✓: the revision goes on the same pair
        const jr = await judge('keep');
        await T(1500);
        await page.reload();
        await page.waitForFunction(() => !!(window.SESSION && window.SESSION.SUGGS && window.SESSION.SUGGS.length &&
          document.querySelector('#rail li')), null, { timeout: 30_000 });
        await T(1500);
        const l3 = await openEntry();
        // a revision is a new judgment, so *oldest first* lists the revised
        // pair last; the blocks are found by what they mark, not by position
        const kinds = l3.ledger.map((p) => (p.onIsCurrent ? 'keep' : p.on.join()));
        const okL3 = jr && l3.card && l3.ledger.length === 3 &&
          kinds.filter((k) => k === 'keep').length === 1 &&
          kinds.filter((k) => k === 'false,false,true').length === 1 &&
          kinds.filter((k) => k === 'true,false').length === 1;
        say('ledger 3   · ' + (okL3 ? 'revised to keep, and after a reload one block marks the current text, the tie and the rival verdict beside it — off the wire alone'
          : 'FAIL: judged ' + jr + ' · ' + JSON.stringify(l3)));
        if (!okL3) stuck.push('the ledger revision');
        await closeCard();

        /* ---- askable but undealt (Q1202) ----------------------------------
         * Ed, 2026-09-07: *⏳ should mean "waiting for other people to vote".
         * If there are things you can do, it should show the symbol of that
         * action, even if it's not urgent.* The hand is ten cards drawn from a
         * hot set of three races, so a race can hold an unjudged pair for the
         * founder and be out of their hand — and until this the entry filed
         * ⏳ the moment the hand was empty on it, hiding a vote they could
         * still cast (the deck step above never meets it: two races, both
         * hot). The shape: the second invitee lands with three unspent
         * proposals and puts two wordings on the gap after the last clause —
         * the target, T — and one on the gap before it (A); the founder puts
         * one on the gap at the top (B). Five races. The founder approves A's
         * challenger, whose value climbs, and keeps the text against both of
         * T's, whose leader then sits at the coin flip, below every other
         * race's — so T is fifth of five by value and out of the hot set
         * while its rival pair is still unjudged by the founder. Read off the
         * view: the hand holds no card on T. Asserted: the entry is lit, not
         * ⏳; the press opens the rival pair as a race card; the judgment
         * lands; and only then does the entry file as ⏳ — the ruling's other
         * half. The floor goes to four first: a third seat makes E three, and
         * three is what the deck step set. Skipped, and said, under
         * --new-clause and --empty-text, whose own gap proposals stand where
         * T would go. */
        if (NEW_CLAUSE || EMPTY_TEXT) {
          say('askable    · skipped under --new-clause / --empty-text (the gaps are taken)');
        } else {
          const floored4 = await fetch(BASE + '/api/d/' + slug + '/cmd', { method: 'POST',
            headers: { 'content-type': 'application/json', cookie: jar },
            body: JSON.stringify({ cmd: 'set-setting', args: { setting: 'quorum', value: { form: 'count', n: 4 } } }) })
            .then((r) => r.json()).catch((e) => ({ error: String(e && e.message) }));
          if (floored4 && floored4.error) {
            say('askable    · FAIL: could not raise the floor above three seats · ' + JSON.stringify(floored4.error));
            stuck.push('the askable case’s floor');
          }
          const link2 = await invitationLink(GUEST2);
          let cyPage = null;
          if (!link2) {
            say('askable    · FAIL: no invitation link in the outbox for ' + GUEST2);
            stuck.push('the third seat’s link');
          } else {
            const ctx2 = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
            cyPage = await ctx2.newPage();
            cyPage.on('pageerror', (e) => errors.push('[cy] ' + String(e)));
            await cyPage.goto(link2);
            for (let i = 0; i < 40 && !cyPage.url().includes('/d/'); i++) await cyPage.waitForTimeout(500);
            await cyPage.waitForTimeout(2600);
          }
          // a proposal at the wire from whichever seat, on a gap: a pure
          // insertion at line n, `start === end` (Q261)
          const proposeGap = (from, n, text, why) => from.evaluate(([n, text, why]) => {
            const api = location.pathname.replace('/d/', '/api/d/');
            return fetch(api + '/view').then((r) => r.json()).then((v) => fetch(api + '/cmd', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ cmd: 'propose-text', args: { baseVersion: v.textVersion,
                hunks: [{ start: n, end: n, lines: [text] }], why } }),
            })).then((r) => r.json()).catch((e) => ({ error: String(e && e.message) }));
          }, [n, text, why]);
          const nLines = await page.evaluate(() => {
            const api = location.pathname.replace('/d/', '/api/d/');
            return fetch(api + '/view').then((r) => r.json()).then((v) => String(v.text || '').split('\n').length);
          });
          const WHY_T1 = 'Dogs are welcome', WHY_T2 = 'Cats are welcome', WHY_A = 'The book matters';
          const sends = cyPage ? [
            await proposeGap(cyPage, nLines, 'A member may bring a dog.', WHY_T1),
            await proposeGap(cyPage, nLines, 'A member may bring a cat.', WHY_T2),
            await proposeGap(cyPage, nLines - 1, 'Guests sign the book.', WHY_A),
            await proposeGap(page, 0, 'The club is a club.', 'Tautology'),
          ] : [];
          const bad = sends.filter((s) => !s || s.error);
          const tId = sends[0] && sends[0].result && sends[0].result.raceId;
          const aId = sends[2] && sends[2].result && sends[2].result.raceId;
          if (!cyPage) { /* said above */ }
          else if (bad.length || !tId || !aId || (sends[1].result || {}).raceId !== tId) {
            say('askable    · FAIL: the four gap proposals did not land · ' + JSON.stringify(sends));
            stuck.push('the askable case’s proposals');
          } else {
            await closeCard();
            await T(5600);                               // one poll in the founder's seat
            // where T stands as the founder's view has it: dealt, askable, judged
            const tRow = () => page.evaluate((id) => {
              const api = location.pathname.replace('/d/', '/api/d/');
              return fetch(api + '/view').then((r) => r.json()).then((v) => {
                const r = (v.clauses || []).find((c) => c.id === id) || {};
                return { dealt: (v.raceCards || []).filter((c) => c.kind === 'edge' && c.raceId === id).length,
                  askable: r.askable, ask: !!r.ask, judged: !!r.judged,
                  judgments: (r.myJudgments || []).length };
              });
            }, tId);
            // 1 — A: approve its challenger; its value climbs
            const cA = await openEntry(aId);
            const jA = cA.card && /quick-open/.test(cA.cls) && await judge('approve', aId);
            say('askable 1  · ' + (jA ? 'A approved from its quick card' : 'FAIL: ' + JSON.stringify(cA)));
            if (!jA) stuck.push('the askable case’s A');
            // 2 — T: keep against both wordings, one press each; lit between
            let okT = true;
            for (const k of [1, 2]) {
              const e = await entry(tId);
              const c = await openEntry(tId);
              const j = c.card && /quick-open/.test(c.cls) && c.keepLane && await judge('keep', tId);
              const ok = isNeeds(e) && j;
              say('askable 2' + (k === 1 ? 'a' : 'b') + ' · ' + (ok ? 'T ' + e.mark + ' · kept the text against “' + (c.whys[0] || '') + '”'
                : 'FAIL: entry ' + JSON.stringify(e) + ' · card ' + JSON.stringify(c) + ' · judged ' + j));
              if (!ok) { stuck.push('the askable case’s T, pair ' + k); okT = false; break; }
            }
            if (okT) {
              // 3 — the precondition, off the wire: no card on T in the hand
              const t3 = await tRow();
              const setUp = t3.dealt === 0 && t3.judged;
              say('askable 3  · ' + (setUp ? 'T is out of the hand (' + t3.judgments + ' judged) — the case stands'
                : 'FAIL: the case was not exercised · ' + JSON.stringify(t3)));
              if (!setUp) stuck.push('the askable case’s precondition (T stayed in the hand)');
              // 4 — the ruling: the entry is lit, not ⏳, with the rival pair's two cases
              const e4 = await entry(tId);
              const ok4 = isNeeds(e4) && e4.teasers.length === 2 && e4.teasers.includes(WHY_T1) && e4.teasers.includes(WHY_T2);
              say('askable 4  · ' + (ok4 ? 'the entry stays ' + e4.mark + ' “' + e4.cap + '” with the rival pair’s two cases — nothing dealt, still askable'
                : 'FAIL: ' + JSON.stringify(e4) + ' · view ' + JSON.stringify(t3)));
              if (!ok4) stuck.push('the askable entry (lit on what can still be asked, not on the hand)');
              // 5 — the press opens that pair as a race card, and the judgment lands
              const c5 = await openEntry(tId);
              const ok5 = c5.card && /race-open/.test(c5.cls) && !c5.keepLane && c5.whys.length === 2 &&
                c5.whys.includes(WHY_T1) && c5.whys.includes(WHY_T2);
              say('askable 5  · ' + (ok5 ? 'the press opens the rival pair: a race card, two blocks, no keep lane'
                : 'FAIL: ' + JSON.stringify(c5)));
              if (!ok5) stuck.push('the askable case’s card');
              const j5 = ok5 && await judge('a', tId);
              const t5 = await tRow();
              const e5 = await entry(tId);
              const landed = j5 && t5.judged && t5.judgments === 3 && t5.askable === false && !t5.ask;
              const ok6 = landed && e5.mark === '⏳' && e5.teasers.length === 0;
              say('askable 6  · ' + (ok6 ? 'judged · 3 pairs of the founder’s stand on T · nothing left to ask, and only now the entry files as ⏳ “' + e5.cap + '”'
                : 'FAIL: judged ' + j5 + ' · view ' + JSON.stringify(t5) + ' · entry ' + JSON.stringify(e5)));
              if (!ok6) stuck.push('the askable case’s judgment' + (landed ? '’s ⏳ afterwards' : ''));
              await closeCard();
            }
          }
          if (cyPage) await cyPage.context().close();
        }
      }
    }
  }
}
say('errors     · ' + (errors.length ? errors.slice(0, 4).join(' / ') : 'none'));
say('refused    · ' + (refused.length ? refused.join(' / ') : 'none'));
await browser.close();
process.exit(stuck.length || !caret || errors.length || refused.length ? 1 : 0);
