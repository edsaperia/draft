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

const BASE = process.argv[2] || 'http://127.0.0.1:8199';
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
page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400)
  refused.push(r.status() + ' ' + r.request().method() + ' ' + new URL(r.url()).pathname); });
const T = (ms) => page.waitForTimeout(ms);

const rail = () => page.evaluate(() => [...document.querySelectorAll('#rail li')]
  .map((li) => li.dataset.q || ((li.querySelector('[data-card]') || { dataset: {} }).dataset.card) || '?'));
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
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: b.textContent.trim() };
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
const seen = new Set();
for (let i = 0; i < 60; i++) {
  const next = (await rail()).find((k) => !seen.has(k));
  if (!next) break;
  seen.add(next);
  if (!(await open(next))) { stuck.push(next + ' (would not open)'); continue; }
  if (await clickIn('.setupcard [data-ok]')) { say('  ok       · ' + next); continue; }
  if (next === 'text') {
    // 📄's value lives in the document column, never in a field
    await page.evaluate(() => {
      const pr = document.getElementById('prose');
      pr.innerHTML = '<div>The clubhouse shall be kept open on Tuesdays.</div>' +
        '<div>Every member may bring one guest.</div>';
      pr.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
    await T(400);
  }
  const picked = await page.evaluate(() => {
    const o = [...document.querySelectorAll('.setupcard [data-set],.setupcard [data-ans]')]
      .filter((x) => (x.dataset.val || x.dataset.ansval) && x.offsetParent !== null)
      .find((x) => !/delegate/i.test(x.textContent));
    if (!o) return null;
    o.scrollIntoView({ block: 'center' });
    const r = o.getBoundingClientRect();
    return { x: r.x + 14, y: r.y + r.height / 2 };
  });
  if (picked) { await page.mouse.click(picked.x, picked.y); await T(320); }
  await page.evaluate(() => document.querySelectorAll('.setupcard input, .setupcard textarea').forEach((n) => {
    if (n.value || /^(email|radio|checkbox|file|hidden|range|color)$/.test(n.type)) return;
    if (n.type === 'number') n.value = String(Math.max(+n.min || 1, 5));
    else if (n.type === 'datetime-local') n.value = '2026-09-18T18:00';
    else n.value = 'The club shall meet on the first Tuesday.';
    n.dispatchEvent(new Event('input', { bubbles: true }));
  }));
  await T(220);
  const label = await press(1250);
  const open2 = await page.evaluate((kk) => {
    const c = document.querySelector('.setupcard');
    return !!c && (c.dataset.card === kk || !!c.querySelector('[data-tab="' + kk + '"]'));
  }, next);
  if (!label || open2) stuck.push(next);
  else say('  committed· ' + next + ' (' + label + ')');
}
say('founding   · rail ' + JSON.stringify(await rail()) + (stuck.length ? ' STUCK: ' + stuck.join(', ') : ''));

const state = await page.evaluate(() => ({
  begun: !!document.querySelector('.doc.begun'),
  clauses: document.querySelectorAll('#charter .prose p').length,
  editable: (document.querySelector('#charter .prose') || {}).getAttribute
    ? document.querySelector('#charter .prose').getAttribute('contenteditable') : '(none)',
}));
say('begun      · ' + JSON.stringify(state));
await T(4200);                                   // the grant flights and their safety nets
say('wallet     · ' + await page.evaluate(() =>
  getComputedStyle(document.getElementById('wallet')).display + ' ' +
  document.getElementById('wallet').textContent.trim()));

/* ---- proposing: a caret in the charter, then one keystroke ---- */
const caret = await page.evaluate(() => {
  const p = [...document.querySelectorAll('#charter .prose p')].find((x) => x.textContent.trim().length > 5);
  if (!p) return null;
  p.scrollIntoView({ block: 'center' });
  const tn = [...p.childNodes].find((n) => n.nodeType === 3);
  if (!tn) return null;
  const r = document.createRange();
  r.setStart(tn, Math.min(3, tn.length));
  r.collapse(true);
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
  return p.dataset.key || '(no key)';
});
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
