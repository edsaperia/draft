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
// and the proposal unsigned. The labels are the 👤 card's own (`opt`), one
// per rung (K27).
const AUTHORSHIP = (process.argv.find((a) => a.startsWith('--authorship=')) || '').split('=')[1] || 'sealedElective';
const AUTHORSHIP_LABEL = {
  anonymous: 'Nobody’s name, ever', anonymousElective: 'Nobody’s name unless they choose',
  sealed: 'Names at the close', sealedElective: 'Names at the close, or earlier by choice',
  public: 'Names from the start',
}[AUTHORSHIP];
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
// The hairline and the title are facts about the document, not about 📄's
// task, so they stand at the head of the column the founder is invited to
// write in — while the **pile** waits for 📄's own turn at the end of the
// founding, and the pre-save heading that said the same thing a screen higher
// is gone by the same act. Checked live because this is the one step the
// fixture cannot reach: the save is a real POST and a real magic link.
const proseHead = await page.evaluate(() => ({
  dochead: (document.getElementById('dochead') || {}).textContent || null,
  hairline: !!document.querySelector('.cpara.docsep'),
  chips: document.querySelectorAll('.cpara.textanchor .achip').length,
  presave: !!(document.getElementById('titlepara') || {}).offsetParent,
}));
const headOk = proseHead.dochead === TITLE && proseHead.hairline &&
  proseHead.chips === 0 && !proseHead.presave;
say('at save    · prose head ' + JSON.stringify(proseHead) +
  (headOk ? '' : '  FAIL: the column should head with the hairline and the title, and nowhere else'));
if (!headOk) stuck.push('the prose column head at the save');

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
  return (wanted.length ? wanted : all).map((x) => x.textContent.trim().slice(0, 48));
}, wantDelegate);
// the same question the other way round: which of the labels on the open card
// belong to the delegate rung, so *what was chosen* can be told apart from its
// wording at the two sites below that used to match on it
const delegLabels = () => page.evaluate(() =>
  [...document.querySelectorAll('.setupcard .delegrung [data-set],.setupcard .delegrung [data-ans]')]
    .filter((x) => (x.dataset.val || x.dataset.ansval))
    .map((x) => x.textContent.trim().slice(0, 48)));
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
      // `.value` the way every other field is. Snapped to its own step: 👥's
      // share runs 5–100 by 5s, and an off-grid answer is not one a member
      // could give. (🌡️ was the other one until entry 165 made it rungs.)
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
const closeCard = async () => {
  await page.evaluate(() => {
    const a = document.querySelector('.setupcard .chipcol .achip');
    if (a) a.click();
  });
  await T(420);
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
const inviteFrom = async (addr, byEnter) => {
  await typeIn('.setupcard [data-add]', addr);
  await T(120);
  if (byEnter) {
    // **Enter sends** (Q814): a lone field with a button beside it and no
    // form around it swallowed the return key, which is the one gesture
    // everybody makes after typing an address.
    await page.focus('.setupcard [data-add]');
    await page.keyboard.press('Enter');
  } else await clickIn('.setupcard [data-act="add"]');
  await T(900);
};
const inviteDoorPreBegin = async () => {
  await inviteFrom(GUEST1, false);
  await inviteFrom(GUEST2, true);
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
  await inviteFrom(GUEST1.toUpperCase(), false);
  const said = await refusalLine();
  const refusalOk = /already on the membership/i.test(said);
  say('refusal    · ' + (refusalOk ? '“' + said + '”'
    : 'FAIL: a duplicate address said ' + JSON.stringify(said)));
  if (!refusalOk) stuck.push('the refusal sentence on ✉️');
  // and it is about what is in the field, so the next keystroke retires it
  await typeIn('.setupcard [data-add]', '');
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
  const marks = await page.evaluate(() => {
    const c = document.querySelector('.setupcard');
    const send = c && c.querySelector('.addrow button');
    const row = c && c.querySelector('.commitrow');
    return {
      send: send ? (send.textContent || '').trim() : '(no send button)',
      h: send ? Math.round(send.getBoundingClientRect().height) : 0,
      title: send ? send.title : '',
      bin: !!(row && row.querySelector('[data-revert]')),
      close: !!(row && row.querySelector('[data-close]')),
      confirm: !!(row && row.querySelector('[data-confirm]')),
    };
  });
  const marksOk = marks.send === '✒️' && marks.bin && marks.close && !marks.confirm;
  say('the mark   · send ' + JSON.stringify(marks.send) + ' (' + marks.h + 'px, “' +
    marks.title + '”) · row 🗑️ ' + marks.bin + ' ✓ ' + marks.close +
    ' confirm ' + marks.confirm +
    (marksOk ? '' : '  FAIL: the ✒️ belongs on the send, and the row only closes'));
  if (!marksOk) stuck.push('the ✒️ on ✉️’s send and the closing ✓ on its row');
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
    await inviteFrom(GUEST1, false);
    const after = await oneVoiceState();
    const gone = !after.holds.some((h) => h.why === 'one-voice') && !after.rail.includes('invite');
    say('invited    · ' + (gone ? 'the ✉️ task leaves and the reason is no longer one-voice'
      : 'FAIL: holds ' + JSON.stringify(after.holds) + ' · rail ' + JSON.stringify(after.rail)));
    if (!gone) stuck.push('the ✉️ remedy did not clear after an invitation');
  } else { say('invited    · FAIL: no ✉️ to invite from'); stuck.push('the ✉️ tab at the dead end'); }
};

/* ---- the shape's provenance (entry 166) ---------------------------------
 * Read off the band: every clause's text by its page key. The shaped keys are
 * the row's own `sets` off the bundle, less 🪜 (no clause of its own) and
 * whatever the row hides. Asserted at the moment 🍾 is served, which is the
 * first moment every section of the constitution is on the page. */
const clauses = () => page.evaluate(() => Object.fromEntries(
  [...document.querySelectorAll('#band .cpara')].map((el) => [
    el.dataset.para || (el.querySelector('[data-tab]') || { dataset: {} }).dataset.tab,
    ((el.querySelector('.cpv') || {}).textContent || '').replace(/\s+/g, ' ').trim()])
  .filter(([k, t]) => k && t)));
const shapedKeys = () => page.evaluate((name) => {
  const row = window.CONSTITUTION.shapeOf(name);
  return Object.keys(row.sets).filter((id) => id !== 'pace' && !row.hides.includes(id));
}, SHAPE);
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

/* ---- 🍾's power switches (entry 158, Q1018, R-057) ---------------------
 * The Begin card carries a switch per zone × power, and what it collects is
 * handed to one `begin` at one `t`. Two rules are walked here because neither
 * can be seen anywhere else on the surface.
 *
 * **(i) A switch reflects the tabs.** A power promised away on one setting's
 * own ✒️ tab must show its zone as **mixed**, never as *kept* — the two
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
 * Membership's **🛡️** is the switch that moves, for the same reason: its ✒️
 * has to survive to the door checks after the start. */
// Selected as switches rather than as buttons (Ed, 254): the table's controls
// are the design system's `.switch`, not `.lanepick`'s radio, and `role` is the
// half of that a walk can hold — a regression to a radio is then a dead
// selector here rather than a green walk over the wrong control.
const BZ_SEL = (z, pw) =>
  '.setupcard [role="switch"][data-bzone="' + z + '"][data-bpower="' + pw + '"]';
const bzCells = () => page.evaluate(() =>
  [...document.querySelectorAll('.setupcard .beginzone')].map((z) => ({
    name: (z.querySelector('.fieldlab') || {}).textContent.trim(),
    cells: [...z.querySelectorAll('[role="switch"][data-bzone]')].map((b) => ({
      pw: b.dataset.bpower, says: b.textContent.trim() })),
  })));
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
let zonesWalked = false;
const beginZonesBeforeStart = async () => {
  zonesWalked = true;
  // one power promised away on its own tab, which is what makes a zone mixed
  let laid = null;
  if (await open('rate') && await open('pw:u:rate')) {
    const chose = await clickIn('[data-set="pw:u:rate"][data-val="given"]');
    laid = chose ? await press(1250) : null;
  }
  say('zone tab   · ' + (laid ? '⏱️’s ✒️ promised away on its own tab (' + laid + ')'
    : 'FAIL: ⏱️’s ✒️ tab would not commit'));
  if (!laid) { stuck.push('laying ⏱️’s pen down before 🍾'); return; }
  if (!(await open('begin'))) {
    say('zones      · FAIL: no 🍾 card to read the power table off');
    stuck.push('the 🍾 card before its power table'); return;
  }
  const zones = await bzCells();
  say('zones      · ' + JSON.stringify(zones.map((z) => z.name + ' ' +
    z.cells.map((c) => c.pw + '=' + c.says).join(' '))));
  const mixed = zones.filter((z) => z.cells.some((c) => c.pw === 'u' && /Mixed/.test(c.says)));
  const keptPen = zones.filter((z) => z.cells.some((c) => c.pw === 'u' && /Kept/.test(c.says)));
  const ok = zones.length === 3 && mixed.length === 1 &&
    !mixed.some((z) => keptPen.includes(z));
  say('mixed      · ' + (ok ? 'the zone holding ⏱️ reads ✒️ Mixed, and never Kept'
    : 'FAIL: ' + zones.length + ' zones · mixed ' + JSON.stringify(mixed.map((z) => z.name)) +
      ' · kept ' + JSON.stringify(keptPen.map((z) => z.name))));
  if (!ok) stuck.push('the 🍾 zone holding a promised-away pen did not read mixed');
  // …and one zone's 🛡️ set to lay down, which is what the press must carry
  const set = await clickIn(BZ_SEL('Membership', 'a'));
  const after = await bzCells();
  const memb = after.find((z) => /Membership/.test(z.name));
  const down = !!memb && memb.cells.some((c) => c.pw === 'a' && /Laid down/.test(c.says));
  say('switch     · ' + (set && down ? 'Membership’s 🛡️ set to lay down at Begin'
    : 'FAIL: set ' + set + ' · reads ' + JSON.stringify(memb && memb.cells)));
  if (!(set && down)) stuck.push('the Membership 🛡️ switch');
};
/* …and what the press actually did, read back off the same tabs. Four claims:
 * the zone switched down went, the same zone's other power stayed, a zone left
 * alone kept its powers even though it read *mixed* (keeping lays nothing
 * further down), and the tab's own pre-start release was spent all the same. */
const beginZonesAfterStart = async () => {
  if (!zonesWalked) return;
  const want = [
    ['invite', 'a', false, 'refuse invitations', 'Membership’s 🛡️ went with the switch'],
    ['invite', 'u', true, 'invite people at will', '…and Membership’s ✒️ was kept'],
    ['title', 'u', true, 'amend this at will', 'a zone left alone kept its ✒️, mixed or not'],
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
      // …and once there are two seats, whether each of them can see who the
      // other is (Q850–Q853)
      await identityReachesEverySeat();
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
  if (next === 'begin' && !DELEGATE_ALL && !zonesWalked) await beginZonesBeforeStart();
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
  let offered = await options(wantDelegate);
  const delegs = await delegLabels();
  // 👤 takes the rung the run asked for (Q770), tried first; the rest stay
  // as the walk's ordinary fallback
  if (next === 'authorship' && !wantDelegate && AUTHORSHIP_LABEL && offered.includes(AUTHORSHIP_LABEL)) {
    offered = [AUTHORSHIP_LABEL, ...offered.filter((l) => l !== AUTHORSHIP_LABEL)];
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
    say('  STUCK    · ' + next + (chose ? ' — ' + chose : '') + ' · commit row ' +
      JSON.stringify(await page.evaluate(() =>
        [...document.querySelectorAll('.setupcard .commitrow button')]
          .map((b) => (b.textContent.trim() || b.getAttribute('title') || '?') + (b.disabled ? ' [dark]' : '')))));
  } else say('  committed· ' + next + ' (' + label + ')' + (chose ? ' — ' + chose : ''));
}
say('founding   · rail ' + JSON.stringify(await rail()) + (stuck.length ? ' STUCK: ' + stuck.join(', ') : ''));
// what the press actually laid down, read back off the ✒️/🛡️ tabs
await beginZonesAfterStart();
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

await doorShuts('invite', '✉️', '[data-add]', 'box');
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
    if (shape) {
      const signBtn = await page.$('.sugg.editcard [data-act="draft-sign"][data-signed="1"]');
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
  const pb = await page.$('[data-act="draft-propose"]:not([disabled])');
  await pb.scrollIntoViewIfNeeded();
  const bx = await pb.boundingBox();
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
  const ok = proposeStatus !== null && proposeStatus < 400 && after.edits < mid.edits
    && stillThere;
  say('propose    · ' + (ok
    ? 'held through a render · propose-text ' + proposeStatus + ' · wallet ' +
      mid.edits + '→' + after.edits + ' · ' + after.mine + ' of mine standing · stayed put'
    : 'FAIL: propose-text ' + proposeStatus + ' · wallet ' + mid.edits + '→' + after.edits +
      ' · held ' + mid.holding + ' · flying ' + mid.flying +
      (stillThere ? '' : ' · moved ' + Math.round(movedX) + 'px while held (width ' +
        Math.round(bx.width) + '→' + Math.round(mid.w) + ')')));
  if (!ok) stuck.push('propose hold');

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
      }));
    });
    const named = wire.authors.filter(Boolean);
    const okWire = ELECTIVE
      ? wire.mine.length > 0 && wire.mine.every((m) => m.signed && / · signed$/.test(m.cap)) &&
        wire.wireMine.every((m) => m.signed) && named.length === wire.authors.length && named.length > 0
      : wire.mine.every((m) => !m.signed) && wire.wireMine.every((m) => !m.signed) && named.length === 0;
    say('named      · ' + (okWire
      ? (ELECTIVE ? 'signed: the mine line says so and the wire names ' + JSON.stringify(named)
        : 'unsigned under ' + AUTHORSHIP + ': the wire names nobody')
      : 'FAIL: ' + JSON.stringify(wire)));
    if (!okWire) stuck.push('the signed proposal on the wire');
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
    // and a rival on the same lines joins that race — where the reader's
    // served card is their own candidate against the incumbent, so the guest's
    // block is never drawn. On the second line the guest's proposal is a race
    // of its own, and the founder's card for it holds exactly one block: theirs.
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
}
say('errors     · ' + (errors.length ? errors.slice(0, 4).join(' / ') : 'none'));
say('refused    · ' + (refused.length ? refused.join(' / ') : 'none'));
await browser.close();
process.exit(stuck.length || !caret || errors.length || refused.length ? 1 : 0);
