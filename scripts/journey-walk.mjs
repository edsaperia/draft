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
 *   node scripts/journey-walk.mjs [http://127.0.0.1:8199]
 *
 * What it does NOT prove: anything that depends on an animation completing.
 * The automation tab runs backgrounded — rAF never fires, transitions never
 * advance — so no flight is asserted here. The **holds themselves** are a
 * different matter and were wrongly lumped in with them until 2026-08-22: a
 * hold needs a pointer held down, not a running animation, and the propose
 * hold is now driven for its full three seconds with a render forced into the
 * middle of it — the case that used to cancel it in silence.
 * Every commit below is driven by a real pointer press for the same reason a
 * synthetic .click() is not enough, and each control is scrolled into view
 * first: a pointer cannot press what is off screen.
 */
import { chromium } from 'playwright';

const BASE = process.argv.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8199';
// --empty-text: found the document on a confirmed-empty text (Q649 (a)) and
// propose its first paragraph into the one empty clause the charter renders.
const EMPTY_TEXT = process.argv.includes('--empty-text');
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
const PROPOSALS_FIRST = process.argv.includes('--proposals-first');
const PROPOSALS = ['begin', 'canpropose', 'canjudge', 'grant-voice'];
const say = (...a) => console.log(...a);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
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
page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) {
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
  await page.mouse.down();
  await T(holdMs);
  await page.mouse.up();
  await T(460);
  return box.label;
};

/* ---- the birth: title, link, address, then the magic link saves it ---- */
const stuck = [];
const TITLE = 'Journey ' + Date.now();
await page.goto(BASE + '/');
await T(800);
await open('title');
await typeIn('.setupcard [data-titlelane]', TITLE);
await press(1250);
await open('slug');
await press(1250);
await open('myemail');
await typeIn('.setupcard input[type="email"]', 'ada@example.org');
await press(1250);
await T(1600);

const outbox = await (await fetch(BASE + '/api/dev/outbox')).json();
const mails = (outbox.mails || outbox).filter((m) => JSON.stringify(m).includes(TITLE));
if (!mails.length) {
  say('FAIL: no creation mail for', TITLE, '- is this server using a dev outbox?');
  await browser.close();
  process.exit(1);
}
const link = (JSON.stringify(mails[mails.length - 1]).match(/http:[A-Za-z0-9_?=/:.-]+/) || [])[0];
await page.goto(link);
for (let i = 0; i < 40 && !page.url().includes('/d/'); i++) await T(500);
await T(2200);
say('birth      · saved at ' + page.url());
// **The pen is the only thing asked for at the save** (Ed, 2026-08-22).
// Every card below ✒️ in the founding order commits with the pen it hands
// over, so until it is acknowledged they are tasks the founder may not
// action — and a task you may not action is not shown at all.
const atSave = await rail();
say('at save    · rail ' + JSON.stringify(atSave) +
  (atSave.length === 1 && atSave[0] === 'grant-pen' ? '' : '  FAIL: the pen should stand alone'));
if (!(atSave.length === 1 && atSave[0] === 'grant-pen')) stuck.push('rail at save');

/* ---- the founding: whatever the rail asks, one task at a time ---- */
// how many options an open card offers, so the walk can try the next one when
// the first leaves the ✓ dark: a blind answer's rungs are not interchangeable
// (*At a set time* wants a date beside it), and the walk must not assume that
// the first thing it can click is a complete answer.
const options = (wantDelegate) => page.evaluate((del) => {
  const all = [...document.querySelectorAll('.setupcard [data-set],.setupcard [data-ans]')]
    .filter((x) => (x.dataset.val || x.dataset.ansval) && x.offsetParent !== null);
  const isDel = (x) => /delegate/i.test(x.textContent);
  const wanted = del ? all.filter(isDel) : all.filter((x) => !isDel(x));
  return (wanted.length ? wanted : all).map((x) => x.textContent.trim().slice(0, 48));
}, wantDelegate);
const pickOption = (label) => page.evaluate((l) => {
  const o = [...document.querySelectorAll('.setupcard [data-set],.setupcard [data-ans]')]
    .filter((x) => (x.dataset.val || x.dataset.ansval) && x.offsetParent !== null)
    .find((x) => x.textContent.trim().slice(0, 48) === l);
  if (!o) return null;
  o.scrollIntoView({ block: 'center' });
  const r = o.getBoundingClientRect();
  return { x: r.x + 14, y: r.y + r.height / 2 };
}, label);
const fillFields = () => page.evaluate(() =>
  document.querySelectorAll('.setupcard input, .setupcard textarea').forEach((n) => {
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
      // `.value` the way every other field is. Snapped to its own step: 🌡️
      // runs 50–95 by 5s, and an off-grid answer is not one a member could give.
      const lo = +n.min || 0; const hi = +n.max || 100; const st = +n.step || 1;
      n.value = String(Math.min(hi, lo + Math.round((hi - lo) / 2 / st) * st));
      return fire();
    }
    if (n.value || /^(email|radio|checkbox|file|hidden|color)$/.test(n.type)) return;
    if (n.type === 'number') n.value = String(Math.max(+n.min || 1, 5));
    else if (n.type === 'datetime-local') n.value = '2026-09-18T18:00';
    else n.value = 'The club shall meet on the first Tuesday.';
    fire();
  }));
const committable = () => page.evaluate(() =>
  [...document.querySelectorAll('.setupcard .commitrow button')]
    .some((x) => !x.disabled && !/🗑/.test(x.textContent)));

const seen = new Set();
const order = [];
const handedOver = [];
let waitingAtBegin = false;
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
  seen.add(next);
  order.push(next);
  if (!(await open(next))) { stuck.push(next + ' (would not open)'); continue; }
  if (next === 'begin') {
    // 🍾 is served either because it can be pressed or because it is the last
    // thing standing (Q773). The second is a real end to a founding that has
    // handed its questions to a room that is still one person — §9.0b resolves
    // no blind question on one voice — and the card's whole job there is to say
    // so. Asserted as such rather than driven through a disabled commit.
    if (!(await committable())) {
      const f = await founding();
      const wait = ((f && f.readiness) || {}).waiting || [];
      say('waiting    · 🍾 is served and cannot be pressed yet — waiting on ' + JSON.stringify(wait));
      if (!wait.length) stuck.push('🍾 is dead and says it is waiting for nothing');
      waitingAtBegin = true;
      break;
    }
  }
  if (await clickIn('.setupcard [data-ok]')) { say('  ok       · ' + next); continue; }
  if (next === 'text' && !EMPTY_TEXT) {
    // 📄's value lives in the document column, never in a field. With
    // --empty-text the column is left empty and confirmed so (§9.0b allows
    // it), and the walk proposes the document's first paragraph instead.
    await page.evaluate(() => {
      const pr = document.getElementById('prose');
      pr.innerHTML = '<div>The clubhouse shall be kept open on Tuesdays.</div>' +
        '<div>Every member may bring one guest.</div>';
      pr.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
    await T(400);
  }
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
  for (const label of await options(wantDelegate)) {
    const at = await pickOption(label);
    if (!at) continue;
    await page.mouse.click(at.x, at.y);
    await T(320);
    chose = label;
    // **A delegated setting takes no value with it** — picking one is the
    // taking-back — so the fields are left alone on that branch. Filling them
    // is what made the first `--delegate-all` run hand over five of eleven and
    // look like the page's doing.
    if (!/delegate/i.test(label)) await fillFields();
    await T(220);
    if (await committable()) break;
  }
  if (chose === null) await fillFields();
  await T(220);
  if (chose !== null && /delegate/i.test(chose)) handedOver.push(next);
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
    say('  STUCK    · ' + next + (chose ? ' — ' + chose : '') + ' · commit row ' +
      JSON.stringify(await page.evaluate(() =>
        [...document.querySelectorAll('.setupcard .commitrow button')]
          .map((b) => (b.textContent.trim() || b.getAttribute('title') || '?') + (b.disabled ? ' [dark]' : '')))));
  } else say('  committed· ' + next + ' (' + label + ')' + (chose ? ' — ' + chose : ''));
}
say('founding   · rail ' + JSON.stringify(await rail()) + (stuck.length ? ' STUCK: ' + stuck.join(', ') : ''));

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
// tasks*). ✋ and 🖼️ are steps 9 and 10 of SURFACE §8's order, immediately
// after 🎩 — and they were dead on every live document, because `hydrateS`
// declared them settled rather than ask the module whether they had ever been
// answered. The assertion belongs **here** and nowhere else: both probes and
// `founding-walk.mjs` drive the fixture, where the pair always worked, so the
// bug was invisible to all three. It is checked as *position*, not mere
// presence, because arriving in the wrong place is its own failure.
const iHat = order.indexOf('hat');
const identityOrder = order.slice(iHat + 1, iHat + 3).join(',');
say('identity   · after 🎩 the rail asks [' + identityOrder + ']' +
  (identityOrder === 'myname,mypic' ? '' : '  FAIL: expected myname,mypic'));
if (identityOrder !== 'myname,mypic') stuck.push('identity tasks (got ' + identityOrder + ')');

// Asserted, not printed (2026-08-22): this block used to report `begun` and
// pass whatever it said. A begun document hides the founder's pre-start
// editor `#prose` and mounts the charter; the charter is the only column
// that takes a caret, and `#prose` must be neither visible nor editable.
const state = await page.evaluate(() => ({
  begun: !!document.querySelector('.doc.begun'),
  clauses: document.querySelectorAll('#charter .prose p').length,
  editable: (document.querySelector('#charter .prose') || {}).getAttribute
    ? document.querySelector('#charter .prose').getAttribute('contenteditable') : '(none)',
  proseShown: getComputedStyle(document.getElementById('prose')).display !== 'none',
  proseEditable: document.getElementById('prose').getAttribute('contenteditable'),
}));
const begunOk = state.begun && state.editable === 'true' && !state.proseShown;
say('begun      · ' + JSON.stringify(state) + (begunOk ? '' : '  FAIL: pre-start editor still live'));
if (!begunOk) stuck.push('begun state');

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

/* ---- proposing: a caret in the charter, then one keystroke ---- */
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
  await page.keyboard.type('X');
  await T(700);
  const r = await page.evaluate(() => ({
    editCard: !!document.querySelector('.sugg.editcard'),
    proposeBtn: !!document.querySelector('[data-act="draft-propose"]:not([disabled])'),
  }));
  say('typing     · ' + (r.editCard ? 'opens the editing card' : 'FAIL: no editing card') +
    ' · propose control ' + (r.proposeBtn ? 'present and live' : 'MISSING'));
  /* **And now the hold itself** (2026-08-22). This step used to say the
   * gesture could not be exercised here, and the bug it could not see cost
   * two live proposals: the hold released on `pointerleave`, so a render
   * mid-hold — or `.holding`’s own 0.78px shrink under a stationary cursor —
   * cancelled it in silence. What that reasoning got wrong is that the hold
   * does not need an *animation*: it needs a **pointer held down**, which
   * Playwright can do exactly and for as long as it likes. The flight cannot
   * be judged here and is not asserted; the commit can, and now is.
   * A render is forced in the middle on purpose — that is the failing case. */
  const pb = await page.$('[data-act="draft-propose"]:not([disabled])');
  await pb.scrollIntoViewIfNeeded();
  const bx = await pb.boundingBox();
  await page.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2);
  await page.mouse.down();
  await T(500);
  const mid = await page.evaluate(() => ({ holding: window.SESSION.holding,
    flying: !!document.querySelector('.flypencil'), edits: window.SESSION.editsHeld }));
  await page.evaluate(() => window.SESSION && window.SESSION.renderAll());
  await T(3200);
  await page.mouse.up();
  await T(900);
  const after = await page.evaluate(() => ({ edits: window.SESSION.editsHeld,
    mine: (window.SESSION.SUGGS || []).filter((x) => x.mine && x.unproposed !== true).length }));
  const ok = proposeStatus !== null && proposeStatus < 400 && after.edits < mid.edits;
  say('propose    · ' + (ok
    ? 'held through a render · propose-text ' + proposeStatus + ' · wallet ' +
      mid.edits + '→' + after.edits + ' · ' + after.mine + ' of mine standing'
    : 'FAIL: propose-text ' + proposeStatus + ' · wallet ' + mid.edits + '→' + after.edits +
      ' · held ' + mid.holding + ' · flying ' + mid.flying));
  if (!ok) stuck.push('propose hold');
}
say('errors     · ' + (errors.length ? errors.slice(0, 4).join(' / ') : 'none'));
say('refused    · ' + (refused.length ? refused.join(' / ') : 'none'));
await browser.close();
process.exit(stuck.length || !caret || errors.length || refused.length ? 1 : 0);
