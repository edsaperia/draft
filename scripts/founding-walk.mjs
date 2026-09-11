/**
 * A founder's walk, from a blank arrival to a settled constitution.
 *
 * Drives design/session-view.html headless: the birth (title, link, email and
 * the magic link), then every task the rail offers, one at a time — opening
 * each, recording what it says, choosing an answer and committing it. What it
 * prints is the founder's own sequence: the order tasks arrive, the sentence
 * each clause carries, and every string on the card. That is the material a
 * STYLE.md audit reads.
 *
 *   node scripts/founding-walk.mjs            # the walk
 *   node scripts/founding-walk.mjs --json     # the same, as data
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DESIGN = join(resolve(fileURLToPath(new URL('..', import.meta.url))), 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const AS_JSON = process.argv.includes('--json');
/**
 * `--delegate=<key>` hands one setting to the membership instead of answering
 * it, and then asserts the founder is served **their own** question before
 * 🍾 (Q645). It has to be its own mode, because the ordinary walk can never
 * reach the case: with the founder alone on the roster `roomExists()` is
 * false, so the founder's answer tasks depend entirely on Q408's *unless
 * nothing else is outstanding* — which 🍾 made unreachable by counting itself
 * as outstanding. It cannot ride `journey-walk.mjs` either, and for a reason
 * worth keeping: a delegated question never resolves on one voice (Q413), so
 * `begin` refuses and the live journey would correctly stall short of a begun
 * document. What it checks is pure page logic, identical in the fixture and
 * live, so the fixture is an honest place to check it.
 */
/**
 * `--takeback=<key>` (Q1318, Ed 2026-09-11: *I should be able to choose a
 * value to take it back with ✒️, but I wasn't able to do that here*). Hands
 * the setting over exactly as `--delegate=` does, then re-opens its card,
 * chooses a value and presses ✒️ — the take-back, `commitSetting` reclaiming
 * and setting in one act — and asserts the setting is the founder's again:
 * the card's own radios before the press (the delegate rung off, the value
 * on), the module's holder after it, the clause no longer waiting, the
 * founder's own answer card gone from the rail. With nothing left delegated
 * the walk then ends on a begun document, as the plain walk does, so the
 * one-voice refusal below is not asserted in this mood. Two shapes of card
 * are worth walking: one whose value and holder are separate fields (🤝,
 * Ed's own case) and one where they are the same field (🌍).
 */
const TAKEBACK = (process.argv.find((a) => a.startsWith('--takeback=')) || '').split('=')[1] || null;
const DELEGATE = TAKEBACK || (process.argv.find((a) => a.startsWith('--delegate')) || '')
  .split('=')[1] || (process.argv.includes('--delegate') ? 'chamber' : null);
/**
 * `--shape=<meeting|conference|ongoing|custom>` (entry 166) picks that rung on
 * 🧭 before 📧, so the walk prints the **shortened** order — the rail as it
 * stands at the save and every task the founder is still served — which is
 * what Ed asked to see. Default none: the walk answers 🧭 *custom*, which is
 * today's founding untouched.
 */
const SHAPE = (process.argv.find((a) => a.startsWith('--shape=')) || '').split('=')[1] || 'custom';

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
// **The walk pins its locale** (Q628 (a), 2026-08-22). The page dates the
// Founded line with the *reader's* own locale, so this machine renders
// "22 August 2026" and a CI runner renders "August 22, 2026" — and the
// golden's mask matches one form, so the guard failed every push from CI and
// passed every run here, which is the worst shape a check can have. Pinning
// it makes the golden record one deterministic string, and a real change to
// the date's copy still shows as a diff. It deliberately does **not** pin the
// locale in the page: what every member reads is a product question, open as
// Q628 (c).
const page = await browser.newPage({ locale: 'en-GB', timezoneId: 'Europe/London',
  viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(base + '/session-view.html');
await page.waitForTimeout(400);

const snap = () => page.evaluate(() => {
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
  const rail = [...document.querySelectorAll('#rail li')].map((li) => ({
    k: li.dataset.q || (li.querySelector('[data-card]') || {dataset:{}}).dataset.card || null,
    title: txt(li.querySelector('.qt')),
    sub: txt(li.querySelector('.qwhy')),
    all: txt(li),
  }));
  const paras = [...document.querySelectorAll('#band .cpara')].map((p) => ({
    k: p.dataset.para || (p.querySelector('[data-tab]') || { dataset: {} }).dataset.tab || '?',
    text: txt(p.querySelector('.cpv')),
  })).filter((p) => p.text);
  const c = document.querySelector('.setupcard');
  const card = c ? {
    eyebrow: txt(c.querySelector('.headlab')),
    head: txt(c.querySelector('.headrule, .headtitle')),
    lock: txt(c.querySelector('.lockline')),
    body: txt(c.querySelector('.field')),
    options: [...c.querySelectorAll('[data-set],[data-ans]')].map((el) => ({
      set: el.dataset.set || el.dataset.ans || null,
      val: el.dataset.val || el.dataset.ansval || null,
      on: el.classList.contains('on') || el.getAttribute('aria-checked') === 'true',
      // an option block's radio says it is chosen with `aria-pressed`, and
      // `.on` sits on the block, not the button (CP1); `on` above is kept as
      // it was so the plain walk's choices — and the founding golden — stand
      pressed: el.getAttribute('aria-pressed') === 'true' ||
        !!(el.closest('.pick') && el.closest('.pick').classList.contains('on')),
      label: txt(el),
    })),
    inputs: [...c.querySelectorAll('input,textarea')].map((i) => ({
      type: i.type || 'text', value: i.value, ph: i.placeholder || null,
    })),
    foot: [...c.querySelectorAll('.commitrow button, .race-mid button')].map((b) => ({
      label: txt(b) || b.title, title: b.title || null, disabled: b.disabled,
    })),
  } : null;
  // the title as the founder sees it: the big heading before the save, the
  // charter's own heading at the head of the prose column after it (backlog
  // 33) — the pre-save heading is still in the DOM, hidden, so the first
  // `.doctitle` in document order is no longer the one on screen
  const shown = [...document.querySelectorAll('.doctitle')].find((el) => el.offsetParent);
  return { rail, paras, card, title: txt(shown || null) };
});

const openCard = async (k) => {
  const ok = await page.evaluate((kk) => {
    const sel = '[data-card="' + kk + '"], [data-tab="' + kk + '"]';
    const el = document.querySelector('#rail ' + sel) || document.querySelector('#band ' + sel);
    if (!el) return false;
    el.click();
    return true;
  }, k);
  await page.waitForTimeout(320);
  return ok;
};
const clickIn = async (sel) => {
  const ok = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el || el.disabled) return false;
    el.click();
    return true;
  }, sel);
  await page.waitForTimeout(280);
  return ok;
};
const typeIn = async (sel, v) => {
  const ok = await page.evaluate((a) => {
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
  await page.waitForTimeout(260);
  return ok;
};

/**
 * **A power laid down before the start takes effect at 🍾** (R-048), and this
 * is the walk that can see both halves of that: the founder releases 👥's pen
 * the moment the setting has a value, and the surface has to say *released,
 * from the start* while still handing them the pen they are holding until the
 * press. The pen wallet's own count is the witness for the second half —
 * unchanged by the release, one lower after 🍾 — because a page that says
 * *may not amend this at will* while the tooltip still counts the setting
 * would be telling the founder two different things about one hand.
 */
const clauseText = (k) => page.evaluate((kk) => {
  const p = [...document.querySelectorAll('#band .cpara')].find((el) =>
    (el.dataset.para || (el.querySelector('[data-tab]') || { dataset: {} }).dataset.tab) === kk);
  const v = p && p.querySelector('.cpv');
  return v ? v.textContent.replace(/\s+/g, ' ').trim() : null;
}, k);
const penCount = async () => {
  const t = await page.evaluate(() => {
    const el = document.querySelector('#penwallet');
    return el ? el.title || '' : '';
  });
  const m = /\b(\d+)\s+settings?\b/.exec(t);
  return m ? +m[1] : null;
};

/**
 * **The column stays live until 🍾** (Q824, backlog 56), and since backlog 204
 * **there is no OK**: 📝 is the door into edit mode, the founder writes, and
 * the row's ✒️ is the confirm (`confirm-starting-text`, every press — Q1080).
 * So this runs *after the founder's first ✒️*, keeping the two halves Q824
 * needed. The **caret**: is the column on screen and editable in edit mode,
 * and read-only again on leaving? The **text**: do words written after the
 * first ✒️ reach the charter at 🍾? A column left editable with nowhere to
 * send its keystrokes is the phantom power the old freeze existed to prevent,
 * so a page that passes the first and fails the second is worse than one that
 * fails both.
 */
const POST_OK_LINE = 'Written after the first ✒️, before the cork.';
let proseWasLive = false;
const afterFirstPen = async () => {
  // 📝: the riding tab, from the save
  const entered = await page.evaluate(() => {
    const tab = document.querySelector('#ridetab .achip[data-tab="text"]');
    if (!tab) return null;
    tab.click();
    const el = document.getElementById('prose');
    return { shown: !!el.offsetParent, editable: el.getAttribute('contenteditable'),
      row: !!document.querySelector('#proserow [data-act="row-commit"]') };
  });
  if (!entered) { errors.push('there is no 📝 tab at the save'); return; }
  if (!entered.shown) errors.push('the prose column is hidden at the save — it is the founder’s until 🍾');
  if (entered.editable !== 'true') {
    errors.push('📝 did not make the column editable (contenteditable=' + entered.editable + ')');
  }
  if (!entered.row) errors.push('edit mode drew no proposal-row under the column');
  // the first ✒️: a line, the page's own input event, the row's commit
  await page.evaluate(() => {
    const el = document.getElementById('prose');
    const d = document.createElement('div');
    d.textContent = 'The first line, saved by the first ✒️.';
    el.appendChild(d);
    el.classList.remove('empty');
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  });
  await page.waitForTimeout(200);
  const pressed = await clickIn('#proserow [data-act="row-commit"]');
  if (!pressed) errors.push('the row’s ✒️ would not press with a changed column');
  await record('first ✒️ on the text');
  // …and the column is still live afterwards: a second line, written after
  // the first confirm — unsent until ✒️ or 🍾, which is the only save since
  // Ed's ruling of 2026-08-30 (Q821's debounced re-confirm is gone)
  const st = await page.evaluate((line) => {
    const el = document.getElementById('prose');
    const d = document.createElement('div');
    d.textContent = line;
    el.appendChild(d);
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    return { shown: !!el.offsetParent, editable: el.getAttribute('contenteditable') };
  }, POST_OK_LINE);
  proseWasLive = st.shown && st.editable === 'true';
  if (!proseWasLive) errors.push('the prose column is not live after the first ✒️ (contenteditable=' + st.editable + ')');
  await page.waitForTimeout(200);
  await record('write after the first ✒️');
  // leaving: 📝 again, and the column is read-only
  await page.evaluate(() => document.querySelector('#ridetab .achip[data-tab="text"]').click());
  await page.waitForTimeout(200);
  const left = await page.evaluate(() => document.getElementById('prose').getAttribute('contenteditable'));
  if (left !== 'false') errors.push('📝 again did not leave edit mode (contenteditable=' + left + ')');
};

const log = [];
const record = async (step, note) => {
  const s = await snap();
  log.push(Object.assign({ step: step, note: note || null }, s));
  return s;
};

/**
 * **At the birth the title clause says who the Founder is** (Ed, 2026-08-27,
 * backlog 140). The birth's first clause is the founder's first meeting with
 * the word *Founder*, and until this sentence nothing on the page has told
 * them it means them — so it carries *(that’s you!)*, once, on the title and
 * nowhere else. Three assertions, because the aside has three ways to be
 * wrong: absent at the birth, still there after the save (where the clause is
 * read by members who are *not* the Founder, and must be byte-identical to
 * what it always was), or repeated down the band, where it reads as a tic.
 * The apostrophe is the page's own curly `Q`, which `snap()` preserves — it
 * only collapses whitespace — so a straight quote here would pass vacuously.
 */
const BIRTH_TITLE =
  /^The document is titled “Hollow Oak Club Charter”\. The Founder \(that’s you!\) may amend this at will\.$/;
const SAVED_TITLE =
  'The document is titled “Hollow Oak Club Charter”. The Founder may amend this at will.';
const ASIDE = 'that’s you';
const titleClauseAtBirth = async () => {
  const said = await clauseText('title');
  if (!BIRTH_TITLE.test(said || '')) {
    errors.push('the birth’s title clause does not tell the founder who the Founder is: ' +
      (said === null ? '(no title clause in the band)' : said));
  }
};
const titleClauseAfterSave = async (s) => {
  const said = await clauseText('title');
  // a shaped document (entry 166) has a membership decision from the save —
  // 🥾 is the shape's — so the title's power sentence already carries its
  // assent half; what is asserted there is that the aside is gone and the
  // sentence still opens as it always did
  const ok = SHAPE === 'custom' ? said === SAVED_TITLE
    : typeof said === 'string' && said.startsWith(SAVED_TITLE.slice(0, -1)) && !said.includes(ASIDE);
  if (!ok) {
    errors.push('the aside outlived the birth: ' +
      (said === null ? '(no title clause in the band)' : said));
  }
  const carried = (s.paras || []).filter((p) => String(p.text).includes(ASIDE));
  if (carried.length) {
    errors.push('the aside outlived the birth: ' +
      carried.map((p) => p.k).join(', ') + ' still say it after the save');
  }
};
const asideOnTitleAlone = (s) => {
  const carried = (s.paras || []).filter((p) => String(p.text).includes(ASIDE));
  if (carried.length !== 1 || carried[0].k !== 'title') {
    errors.push('the aside is on ' + carried.length + ' clauses at the birth (' +
      (carried.map((p) => p.k).join(', ') || 'none') + '), and it belongs on the title alone');
  }
};

await record('arrive');

/* ---- the birth ------------------------------------------------------- */
await openCard('title');
await record('open title');
await typeIn('.setupcard [data-titlelane]', 'Hollow Oak Club Charter');
await clickIn('.setupcard [data-confirm]');
await record('commit title');
await titleClauseAtBirth();

await openCard('slug');
await record('open slug');
await clickIn('.setupcard [data-confirm]');
const atCommitSlug = await record('commit slug');
asideOnTitleAlone(atCommitSlug);

await openCard('shape');
await record('open shape');
if (!(await clickIn('.setupcard [data-set="docShape"][data-val="' + SHAPE + '"]'))) {
  errors.push('🧭 offers no rung named ' + SHAPE);
}
await clickIn('.setupcard [data-confirm]');
await record('commit shape (' + SHAPE + ')');

await openCard('myemail');
await record('open myemail');
await typeIn('.setupcard input[type="email"]', 'ada@example.org');
await clickIn('.setupcard [data-confirm]');
await record('commit myemail (sends)');
await clickIn('[data-act="clickmail"]');
await page.waitForTimeout(600);
const atMagicLink = await record('follow the magic link');
await titleClauseAfterSave(atMagicLink);
// the text, written from the save (backlog 204): no task, no OK
await afterFirstPen();

/* ---- then whatever the rail asks for, one at a time ------------------- */
const PEN_RELEASE = 'quorum';         // 👥, whose value the walk sets itself
let penHeldAtRelease = null;
let penReleased = false;          // the walk got all the way through the release
const releasePen = async (k) => {
  penHeldAtRelease = await penCount();
  if (penHeldAtRelease === null) {
    // a guard that cannot read its own witness is not a guard — say so rather
    // than skipping the whole of R-048 in silence
    errors.push('the ✒️ wallet states no settings count, so the pen half of R-048 cannot be checked');
    return;
  }
  // a settled setting's tabs are a closed pile, and the ones behind the front
  // carry no click hook — open the value's own card first and the pile becomes
  // the card's tabs, which is the only way a founder reaches ✒️ either
  await openCard(k);
  if (!(await openCard('pw:u:' + k))) {
    errors.push('no ✒️ tab on ' + k + ' to lay the pen down from');
    return;
  }
  await record('open pw:u:' + k);
  const gave = await clickIn('.setupcard [data-set="pw:u:' + k + '"][data-val="given"]');
  if (!gave) {
    errors.push('the ✒️ tab on ' + k + ' would not let the pen go on a setting that has a value');
    return;
  }
  await clickIn('.setupcard [data-confirm]');
  await record('commit pw:u:' + k);
  // **The paragraph states the release; the card does not** (Ed, 2026-09-03,
  // correcting the QA round's over-reach): this helper reads `#band .cpara
  // .cpv` — the document's own paragraph — so R-048's pending sentence is
  // back where it always was. The card head's power-free text is the copy
  // golden's to hold.
  const said = await clauseText(k);
  if (!/From the start, the Founder may not amend this at will\./.test(said || '')) {
    errors.push(k + ' released the pen but its clause does not say so: ' + said);
  }
  const now = await penCount();
  if (now !== penHeldAtRelease) {
    errors.push('the pen left before 🍾 — the wallet counted ' + penHeldAtRelease +
      ' settings before the release and ' + now + ' after');
  }
  penReleased = true;
};

const seen = new Set();
// **Began means the cork was pressed, not that 🍾 was visited** (Q1177,
// 2026-09-09). The two post-🍾 checks below once gated on the *step* `commit
// begin` being in the log, which `record` writes whether or not the press
// landed — so in `--delegate` mode, where 🍾 is rightly refused on one voice
// (R-015, R-045), three assertions about a begun document ran against one
// that had never begun and read as three product defects for a week.
let began = false;
// **A door is recorded in the rail, never driven** (entry 181). ✉️ stands as the
// founder's task once the Membership rules stand, and this loop answers whatever
// it picks up — it would delegate a door, or send an invitation the golden has no
// business containing. The rail column of every step records it either way, which
// is the whole of what the golden is for here.
const DOORS = new Set(['invite', 'remove']);
/* ---- Q331 (b): the rail asks, the settled tab names (Q1209) ------------
   Two labels on one card (Ed, 2026-09-07): the rail entry reads the ask while
   the card is outstanding — *Choose the Quorum* — and the band's tab reads the
   noun once it is settled — *Quorum* — `labelOf` in setup.js being the one
   reader. 👥 is the card, Ed's own example. The settled half is skipped when
   👥 is the delegated card, a delegated setting not being settled here. */
const TWO_LABELS = 'quorum';
const TWO_LABELS_ASK = 'Choose the Quorum';
const TWO_LABELS_NOUN = 'Quorum';
const tabLabel = (k) => page.evaluate((kk) => {
  const el = document.querySelector('#band .achip[data-tab="' + kk + '"] .sr');
  return el ? el.textContent.trim() : null;
}, k);
/* ---- Q1318: a delegated card is taken back by choosing a value ---------
   Before 🍾 the founder takes a delegated setting back by choosing a value on
   its card and pressing ✒️ (`commitSetting` reclaims and sets in one act, and
   🍾's hold sentence tells them to do exactly that). The module's holder is
   the witness that the press reclaimed rather than delegated again; the
   card's own radios are read *before* the press, since a value press already
   moves the delegate rung off on a card that is working. The module id is the
   page key for every delegable setting, so `settingState(k)` needs no map. */
const holderOf = (k) => page.evaluate((kk) => {
  try { const st = window.cs && window.cs.settingState(kk);
    return st ? { holder: st.holder, value: st.value } : null; } catch { return null; }
}, k);
const takeBack = async (k) => {
  const was = await holderOf(k);
  if (!was || was.holder !== 'members') {
    errors.push(k + ' was not delegated before the take-back (holder ' + JSON.stringify(was) + '), so the take-back proves nothing');
    return;
  }
  if (!(await openCard(k))) { errors.push('cannot re-open ' + k + ' to take it back'); return; }
  const before = await record('reopen ' + k + ' (delegated)');
  const opts = (before.card && before.card.options) || [];
  // the last value rung — Ed's own press on 🤝 was its second block — and
  // never the delegate rung, which carries 'roster' whatever key it writes
  const rung = [...opts].reverse().find((o) => o.set && o.val && o.val !== 'roster' && !o.pressed);
  if (!rung) { errors.push(k + ' offers no value rung to take it back with: ' + JSON.stringify(opts)); return; }
  await clickIn('.setupcard [data-set="' + rung.set + '"][data-val="' + rung.val + '"]');
  const chosen = await record('take back ' + k + ' (' + rung.set + '=' + rung.val + ')');
  const radios = (chosen.card && chosen.card.options) || [];
  const delegOn = radios.some((o) => o.val === 'roster' && o.pressed);
  const valOn = radios.some((o) => o.set === rung.set && o.val === rung.val && o.pressed);
  if (delegOn || !valOn) {
    errors.push(k + ': choosing ' + rung.val + ' did not take the card back on its own radios — delegate rung ' +
      (delegOn ? 'still on' : 'off') + ', value ' + (valOn ? 'on' : 'off'));
  }
  const committed = await clickIn('.setupcard [data-confirm]');
  const after = await record('commit take back ' + k, committed ? null : 'no commit control');
  if (!committed) { errors.push(k + ': no ✒️ to take it back with'); return; }
  const now = await holderOf(k);
  if (!now || now.holder !== 'convenor' || now.value === null || now.value === undefined) {
    errors.push(k + ': ✒️ after choosing ' + rung.val + ' did not take the setting back — the module holds ' +
      JSON.stringify(now) + ' where convenor with a value was expected (✒️ delegated again, Q1318)');
  }
  const said = await clauseText(k);
  if (/waiting for members\.$/.test(said || '')) {
    errors.push(k + ' was taken back but its clause still says it is waiting: ' + said);
  }
  const left = (after.rail || []).filter((e) => e.k === k || e.k === 'ans-' + k).map((e) => e.k);
  if (left.length) {
    errors.push(k + ' was taken back but the rail still holds ' + JSON.stringify(left) +
      ' — a founder-held setting has no question of its own to answer');
  }
  // …and the card, re-opened, is the founder's: the delegate rung is off
  if (await openCard(k)) {
    const again = await record('reopen ' + k + ' (taken back)');
    const still = ((again.card && again.card.options) || []).some((o) => o.val === 'roster' && o.pressed);
    if (still) errors.push(k + ' re-opened after the take-back with its delegate rung still on');
  }
};
for (let i = 0; i < 40; i++) {
  const s = await snap();
  const next = s.rail.find((e) => e.k && !seen.has(e.k) && !DOORS.has(e.k));
  if (!next) break;
  seen.add(next.k);
  if (next.k === TWO_LABELS && next.title !== TWO_LABELS_ASK) {
    errors.push('👥 outstanding, but its rail entry reads “' + next.title + '”, not the ask “' +
      TWO_LABELS_ASK + '” (Q331 (b), Q1209)');
  }
  const opened = await openCard(next.k);
  if (!opened) {
    log.push({ step: 'cannot open ' + next.k, rail: s.rail, paras: s.paras, card: null });
    continue;
  }
  const before = await record('open ' + next.k);
  const opts = (before.card && before.card.options) || [];
  // delegation is an option on the card like any value (Q511), so handing the
  // setting over is the same gesture as answering it
  const opt = next.k === DELEGATE ? null : opts.find((o) => o.set && o.val && !o.on);
  if (next.k === DELEGATE) {
    const gave = await clickIn('.setupcard .delegrung [data-val="roster"]');
    if (!gave) log.push({ step: 'could not delegate ' + next.k, rail: before.rail, card: null });
  }
  if (opt) {
    const picked = await clickIn('.setupcard [data-set="' + opt.set + '"][data-val="' + opt.val + '"]');
    if (!picked) await clickIn('.setupcard [data-ans="' + opt.set + '"][data-ansval="' + opt.val + '"]');
  }
  // **A delegated setting takes no value with it, so its card's fields are left
  // alone** (Q832, `journey-walk.mjs`'s own guard, ported). Typing into a
  // rung's field *chooses that rung*, so the fill below un-delegated whatever
  // `--delegate=` had just handed over — silently, and only for a setting whose
  // value rung carries a field. 🌡️ is exactly that (one `number` input), which
  // is Ed's own case: `--delegate=bar` walked all the way to a begun document
  // with 🌡️ founder-held, and the verdict blamed the page.
  // with no defaults a card waits for its numbers: fill whatever is empty
  if (next.k !== DELEGATE) await page.evaluate(() => {
    document.querySelectorAll('.setupcard input, .setupcard textarea').forEach((i) => {
      if (i.value || /^(email|radio|checkbox|file|hidden|range|color)$/.test(i.type)) return;
      if (i.type === 'number') i.value = String(Math.max(+i.min || 1, 5));
      else if (i.type === 'datetime-local') i.value = '2026-09-18T18:00';
      else i.value = 'Ada Lovell';
      i.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  await page.waitForTimeout(200);
  const committed = (await clickIn('.setupcard [data-confirm]')) ||
    (await clickIn('.setupcard [data-ok]')) || (await clickIn('.setupcard [data-hatgo]'));
  await record('commit ' + next.k, committed ? null : 'no commit control');
  if (next.k === 'begin' && committed) began = true;
  // Q1318: hand it over, then take it back before the rail can serve the
  // founder their own question on it
  if (next.k === TAKEBACK && committed) await takeBack(next.k);
  if (next.k === TWO_LABELS && next.k !== DELEGATE && committed) {
    const said = await tabLabel(next.k);
    if (said !== TWO_LABELS_NOUN) {
      errors.push('👥 settled, but its tab reads ' + (said === null ? 'nothing (no front tab with a name)' : '“' + said + '”') +
        ', not the noun “' + TWO_LABELS_NOUN + '” (Q331 (b), Q1209)');
    }
  }
  // …and not when 👥 is the delegated card: delegation already took both
  // powers (SPEC §9.0a), so there is no pen to lay down and the clause reads
  // the membership's *waiting* sentence, never R-048's *from the start*
  if (next.k === PEN_RELEASE && next.k !== DELEGATE) await releasePen(next.k);
  if (next.k === 'text') errors.push('📝 the text was served as a task; it is a card with two modes, never a task (backlog 204)');
}

/* ---- and what was written after the first ✒️ is what began (Q824) ------ */
if (proseWasLive && began) {
  const charter = await page.evaluate(() => {
    const el = document.getElementById('charter');
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  });
  if (!charter.includes(POST_OK_LINE)) {
    errors.push('the line written after the first ✒️ is not in the charter after 🍾 — ' +
      'the column was live but its keystrokes went nowhere');
  }
}

/* ---- and at 🍾 the release is spent (R-048) ---------------------------- */
if (penReleased && began) {
  const said = await clauseText(PEN_RELEASE);
  if (/may (not )?amend this at will/.test(said || '')) {
    errors.push(PEN_RELEASE + ' still speaks of the pen after 🍾: ' + said);
  }
  // two settings leave the pen wallet at the press: 👥, released above, and
  // 📝 the Text, which 🍾 lays down by itself (§9.7 rule 8)
  const now = await penCount();
  if (now !== null && now !== penHeldAtRelease - 2) {
    errors.push('🍾 did not spend the release — the wallet counted ' + penHeldAtRelease +
      ' settings before it and ' + now + ' after, where ' + (penHeldAtRelease - 2) +
      ' is 👥 released and 📝 laid down');
  }
}

/* ---- --delegate: 🍾 is refused on one voice (R-015, R-045) ------------- */
// The founder alone answers the question they delegated, and that resolves
// nothing: *never on one voice* (SPEC §9.0a) and *the start is refused while
// a delegated question is still collecting* (§9.0b). So this mood ends short
// of a begun document by design, and what is asserted is the refusal itself —
// the cork dark, the card saying why (Q826–Q830's readout), the clause still
// waiting — rather than skipping the two blocks above in silence.
/* ---- --takeback: nothing is delegated any more, so 🍾 begins ------------ */
if (TAKEBACK && !began) {
  errors.push('🍾 did not begin after ' + TAKEBACK + ' was taken back — with nothing delegated the walk should end on a begun document');
}
if (DELEGATE && !TAKEBACK) {
  if (began) {
    errors.push('🍾 began the document with ' + DELEGATE + ' delegated and the founder its only voice (R-015)');
  } else {
    const st = await page.evaluate(() => {
      const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
      const c = document.querySelector('.setupcard');
      const cork = c && [...c.querySelectorAll('.commitrow button')].find((b) => /🍾/.test(t(b) || b.title));
      return { open: !!c, cork: cork ? (cork.disabled ? 'off' : 'on') : 'none', said: t(c) };
    });
    if (!st.open || st.cork !== 'off') {
      errors.push('🍾 is ' + (st.open ? st.cork : 'not the open card') + ' with ' + DELEGATE +
        ' delegated and one voice on it — the start should be refused (R-045)');
    } else if (!/answered by one voice has not been handed to anybody/.test(st.said)) {
      errors.push('🍾 is refused but does not say why (one voice, R-015): ' + st.said.slice(0, 200));
    }
    const said = await clauseText(DELEGATE);
    if (!/waiting for members\.$/.test(said || '')) {
      errors.push(DELEGATE + ' is delegated and unresolved, but its clause does not say it is waiting: ' + said);
    }
  }
}

/* ---- --delegate: is the founder served their own question? ------------ */
let verdict = null;
if (DELEGATE && !TAKEBACK) {
  const want = 'ans-' + DELEGATE;
  // **Offered, not still pending.** The founder answers their own question as
  // soon as it is served, so by the end of the walk it is settled and gone
  // from the rail — asserting on the *final* rail fails on a surface that is
  // working. What this is about is whether the question was ever put to them.
  const steps = log.map((e) => e.step);
  const at = steps.indexOf('open ' + want);
  const ok = at >= 0;
  const answered = steps.includes('commit ' + want);
  verdict = { want, ok, answered, after: ok ? steps[at - 1] : null };
  // The founder answers on their own surface (§9.0b) and the Proposing gate
  // waits on it, so a founder who is never asked cannot begin their own
  // document — the module refuses while the question is still collecting.
  if (!ok) errors.push('the founder was never served ' + want +
    ' — the walk was offered [' + steps.filter((s) => s.startsWith('open ')).map((s) => s.slice(5)).join(', ') + ']');
  else if (!answered) errors.push(want + ' was offered but could not be answered');
}

const out = { log: log, errors: errors, ...(verdict ? { verdict } : {}) };
if (AS_JSON) {
  console.log(JSON.stringify(out, null, 1));
} else {
  for (const e of log) {
    console.log('\n=== ' + e.step + (e.note ? '  [' + e.note + ']' : ''));
    const rail = (e.rail || []).map((r) => (r.k || '?') + '·' + (r.title || r.all || '').slice(0, 44));
    console.log('  rail: ' + (rail.join(' | ') || '(empty)'));
    if (e.card) {
      console.log('  head: ' + e.card.head);
      if (e.card.lock) console.log('  lock: ' + e.card.lock);
      console.log('  body: ' + (e.card.body || '').slice(0, 240));
      if (e.card.options.length) {
        console.log('  options: ' + e.card.options.map((o) => (o.on ? '[x] ' : '[ ] ') + (o.label || '').slice(0, 44)).join(' / '));
      }
      console.log('  foot: ' + e.card.foot.map((f) => (f.label || '') + (f.disabled ? ' (off)' : '')).join(' | '));
    }
    if (e.paras && e.paras.length) {
      console.log('  clauses:');
      for (const p of e.paras) console.log('    ' + p.k + ': ' + (p.text || '').slice(0, 78));
    }
  }
  if (verdict) {
    console.log('\ndelegated ' + DELEGATE + ' · ' + (verdict.ok
      ? 'the founder is served ' + verdict.want + ' (after ' + verdict.after + ')' +
        (verdict.answered ? ' and answers it' : ' but CANNOT answer it')
      : 'FAIL: the founder was never served ' + verdict.want));
  }
  console.log('\npage errors: ' + (errors.length ? errors.slice(0, 4).join(' / ') : 'none'));
}
await browser.close();
srv.close();
// **An error is red** (Q1177): a walk that prints `page errors:` and exits 0
// cannot guard anything. Under `--json` the verdict is the reader's —
// `founding-golden.mjs` lifts `errors` from the payload and prints its own
// diff line, and a non-zero status there would make it dump the raw JSON.
if ((verdict && !verdict.ok) || (!AS_JSON && errors.length)) process.exit(1);
