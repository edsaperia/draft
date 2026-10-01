#!/usr/bin/env node
/**
 * render-hold-walk — **nothing you are in the middle of is taken by the page
 * updating** (principle 10; grammar U1, U2; redesign stage 9).
 *
 *   node scripts/render-hold-walk.mjs [http://127.0.0.1:8202] [--render=replace] [--only=a,b]
 *
 * Founds a document on a dev server, begins it, and seats three pages: the
 * Founder at 1600, a member at 1600 and a member at 390. For each in-flight
 * kind it places the thing on an open card, marks the node (a property set on
 * the element, which only survives if the element does), records its state,
 * and then puts two renders under it: a **forced poll** (the 4 s tick's body,
 * re-rendering as a poll that brought news does) and a **room event** (another
 * seat's command over HTTP, then the tick's own fetch). Each kind asserts:
 *
 *  · **same** — the node is the node that was marked;
 *  · **state** — its state intact: caret offset, selection, focus, pressed,
 *    value, `scrollTop`, as the kind reads it;
 *  · **still** — the page's scroll unmoved (±1 px), or moved by the
 *    browser's scroll anchoring to hold the node still on the glass; a line
 *    added above that moves the node with the scroll unmoved is noted.
 *
 * The page's own 4 s tick is paused (`window.__pollPaused`) for the length of
 * each kind, so a render lands when the walk says and nowhere else; the tick's
 * deferral (`pressInFlight`) is kept — a poll that waits under a gesture is the
 * gesture held. After a held press is let go, one more poll proves the room's
 * event was not lost, only waited for.
 *
 * `--render=replace` opens every page at `?render=replace`, the switch that
 * restores wholesale replacement (stage 9's dev switch), so the two can be
 * compared: there the node's identity is printed and not asserted, and the
 * state is read off whichever node stands. Exit 1 on any kind red, on a page
 * error, or on a refused command.
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, sleep, say } from './lib/walk.mjs';
import { assertServerBuild } from './lib/assert-server.mjs';

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || process.env.WALK_BASE || 'http://127.0.0.1:8202').replace(/\/$/, '');
const MODE = (argv.find((a) => a.startsWith('--render=')) || '').slice(9) || 'patch';
const ONLY = ((argv.find((a) => a.startsWith('--only=')) || '').slice(7)).split(',').filter(Boolean);
const QUERY = MODE === 'replace' ? '?render=replace' : '';
const want = (k) => !ONLY.length || ONLY.includes(k);
const die = (m) => { console.error(`render-hold-walk: ${m}`); process.exit(2); };

await assertServerBuild(BASE, 'render-hold-walk');
const health = await (await fetch(`${BASE}/healthz`)).json();
if (health.devMail !== true) die(`${BASE} is not a dev server`);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);
const run = Date.now().toString(36);

/* ---- the document -------------------------------------------------------- */
const founderEmail = `founder-${run}@example.org`;
const created = await (await post('/api/docs', { title: `Hold ${run}`, email: founderEmail, isMember: true })).json();
if (!created.ok || !created.devLink) die(`creation refused: ${JSON.stringify(created)}`);
const SLUG = created.slug;
const founder = (await followLink(created.devLink)).cookie;
const refused = [];
const cmdAs = async (cookie, name, args = {}) => {
  const r = await post(`/api/d/${SLUG}/cmd`, { cmd: name, args }, cookie);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { refused.push(`${name}: ${r.status} ${JSON.stringify(j).slice(0, 160)}`); return null; }
  return j.result ?? j;
};
const cmd = (name, args) => cmdAs(founder, name, args);
await cmd('confirm-starting-text', { text: [
  `# Hold ${run}`, '## Meetings',
  'The society shall meet on the first Tuesday of every month, in the upstairs room, at seven.',
  'Every meeting opens with the minutes of the last one, read aloud by whoever kept them.',
  'A member who misses three meetings in a row shall be written to, kindly, by the secretary.',
  '## Money',
  'Subscriptions are due in January and are the same for every member, whatever their means.',
  'The treasurer may spend up to fifty pounds without asking; anything more goes to a meeting.',
].join('\n') });
await cmd('set-convenor-membership', { isMember: true });
for (const [setting, value] of Object.entries({
  rate: { grant: 5, cap: 8, dripMinutes: 60 }, pace: { shape: 'fixed' }, quorum: { form: 'share', n: 30 },
  authorship: { rung: 'sealedElective' }, judgments: { rung: 'after' }, applications: { apply: false },
  admission: { price: 'pen' }, removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
  lapse: { afterMs: 24 * 3_600_000 }, ending: { endsAtMs: Date.now() + 30 * 86_400_000 }, bar: { pct: 50 },
  chamber: { rung: 'link' },
})) {
  await (await post(`/api/d/${SLUG}/cmd`, { cmd: 'reclaim', args: { setting } }, founder)).text();
  await cmd('set-setting', { setting, value });
}
const seats = { wide: `wide-${run}@example.org`, narrow: `narrow-${run}@example.org` };
for (const e of Object.values(seats)) await cmd('invite', { email: e });
await cmd('begin', {});
if (refused.length) die(`the document could not be set up: ${refused.join(' / ')}`);
say(`founded ${BASE}/d/${SLUG} — begun, two members invited`);

const linkFor = async (to) => {
  const t = await (await fetch(`${BASE}/api/dev/outbox`)).json();
  const m = (t.mails ?? []).find((x) => x.to === to && x.link);
  if (!m) die(`no invitation for ${to} in the dev outbox`);
  return m.link;
};
// **a room event**: another seat's act that moves the document log, so the
// next poll carries a full view (member-questions-walk's Q1513 step does the same)
let events = 0;
const roomEvent = () => cmd('invite', { email: `room-${run}-${++events}@example.org` });

/* ---- the pages ----------------------------------------------------------- */
const browser = await chromium.launch();
const errors = [];
const seat = async (cookie, viewport, label) => {
  const ctx = await browser.newContext({ viewport });
  const [name, ...rest] = cookie.split('=');
  await ctx.addCookies([{ name, value: rest.join('='), url: BASE }]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('request', (r) => { if (r.url().endsWith('/cmd')) { try { sent.push(JSON.parse(r.postData() || '{}').cmd); } catch { /* none */ } } });
  page.on('response', async (r) => {
    if (!r.url().endsWith('/cmd') || r.ok()) return;
    refused.push(`${label} ${r.status()} ${(await r.text().catch(() => '')).slice(0, 160)}`);
  });
  // the grants' OKs live in localStorage, one key per document and seat: given
  // before the page boots, so every seat meets its powers accepted
  const v = await (await fetch(`${BASE}/api/d/${SLUG}/view`, { headers: { cookie } })).json();
  await page.addInitScript(([slug, me]) => {
    try { localStorage.setItem('draft:grants:' + slug + ':' + me,
      JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge'])); } catch { /* none */ }
  }, [SLUG, v.me || '']);
  await page.goto(`${BASE}/d/${SLUG}${QUERY}`);
  await page.waitForSelector('#charter', { timeout: 20_000 });
  await sleep(1500);
  await page.evaluate(() => { window.__pollPaused = true; });
  return page;
};
const cookieOf = async (email) => (await followLink(await linkFor(email))).cookie;

/* ---- the probe ----------------------------------------------------------- */
// the node's state, read the same way before and after: which of these a kind
// asserts is its own choice (`keys`)
const READ = `(el) => {
  if (!el) return null;
  const s = getSelection();
  let caret = null;
  if (s && s.rangeCount && el.contains(s.getRangeAt(0).endContainer)) {
    const r = document.createRange(); r.selectNodeContents(el);
    r.setEnd(s.getRangeAt(0).endContainer, s.getRangeAt(0).endOffset);
    caret = r.toString().length;
  }
  let sel = null;
  try { if (typeof el.selectionStart === 'number') sel = [el.selectionStart, el.selectionEnd]; } catch (e) { /* none */ }
  return {
    connected: el.isConnected, marked: el.__renderHold === window.__renderHoldToken,
    focused: document.activeElement === el || (el.contains(document.activeElement) && document.activeElement !== document.body),
    caret, sel, value: 'value' in el ? el.value : (el.textContent || ''),
    scrollTop: el.scrollTop, pressed: el.classList.contains('holding') || el.classList.contains('penholding'),
    pageY: Math.round(scrollY), top: Math.round(el.getBoundingClientRect().top),
  };
}`;
const mark = (page, sel) => page.evaluate(([q, token]) => {
  const el = typeof q === 'string' ? document.querySelector(q) : null;
  if (!el) return false;
  window.__renderHoldToken = token; el.__renderHold = token; window.__renderHoldEl = el;
  return true;
}, [sel, `t${Math.random()}`]);
const readHeld = (page, sel) => page.evaluate(([q, READ]) => {
  const read = eval(READ);
  const now = document.querySelector(q);
  return { held: read(window.__renderHoldEl), now: now ? read(now) : null, same: now === window.__renderHoldEl };
}, [sel, READ]);
const poll = (page, force) => page.evaluate((f) => (window.__poll ? window.__poll({ force: f }) : 'no seam'), force);

const results = [];
const verdict = (kind, ok, detail, polls) => {
  results.push({ kind, ok });
  say(`${ok ? 'ok  ' : 'FAIL'} · ${kind}${ok ? (polls ? ` (polls: ${polls})` : '') : ' · ' + detail}`);
};
// the two renders under a placed thing, and what each left: `keys` names the
// parts of the state this kind asserts
// (a press is timed: the room's event is sent first, while the page's tick is
// paused and it cannot hear it, so both renders land inside the hold)
const underRenders = async (page, kind, sel, keys, { eventSent = false, pressed = false } = {}) => {
  if (!(await mark(page, sel))) return verdict(kind, false, `nothing to hold: ${sel} is not on the page`);
  const before = (await readHeld(page, sel)).held;
  const ran = [];
  const t0 = Date.now();
  ran.push(await poll(page, true));
  if (!eventSent) await roomEvent();
  ran.push(await poll(page, false));
  if (!eventSent) await sleep(150);
  ran.push(`${Date.now() - t0}ms`);
  const after = await readHeld(page, sel);
  const bad = [], notes = [];
  const replaced = !after.same || !after.held.connected || !after.held.marked;
  // **under `?render=replace` the node's identity is printed, not asserted**
  // (the switch *is* wholesale replacement): the state is read off whichever
  // node stands, which is what the page promised before stage 9
  const on = replaced && MODE === 'replace' && after.now ? after.now : after.held;
  if (replaced && MODE === 'replace') notes.push('replaced (replace mode)');
  else if (replaced) bad.push('replaced');
  for (const k of keys) {
    const a = on[k], b = before[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) bad.push(`${k} ${JSON.stringify(b)}→${JSON.stringify(a)}`);
  }
  if (pressed && !on.pressed) bad.push('the press was let go under the render');
  // **still**: the page's scroll unmoved — and where the browser's scroll
  // anchoring moved it to hold what the reader is looking at still on the
  // glass (a room event that adds a line above), that is the page holding
  // still too. A jump is the two together: the scroll moved *and* the node
  // with it. A line added above with the scroll unmoved is noted, not failed.
  const scrolled = Math.abs(on.pageY - before.pageY) > 1;
  const onGlass = on.connected && Math.abs(on.top - before.top) > 1;
  if (scrolled && onGlass) bad.push(`the page scrolled ${before.pageY}→${on.pageY} and the node moved on the glass ${before.top}→${on.top}`);
  else if (onGlass) notes.push(`a line above moved it ${before.top}→${on.top} on the glass`);
  // a replaced node: what its replacement holds, so a keeper that put the
  // state back (the band's `renderKeep`) reads apart from a state lost
  const now = replaced && MODE !== 'replace' && after.now
    ? ' · the replacement: ' + keys.concat(keys.includes('focused') ? [] : ['focused']).map((k) => `${k} ${JSON.stringify(after.now[k])}`).join(', ') : '';
  // (a poll that ran is `true`; one that waited under a gesture is `false`)
  verdict(kind, !bad.length, `${bad.join(', ')}${now} (polls: ${ran.join(', ')})`, ran.join(', '));
  if (notes.length) say(`       note · ${notes.join(', ')}`);
  return { before, after, ran };
};

// **a held commit** — the press is the in-flight thing: `.holding` on the
// same node through both renders; under `click` the flight's landing sends the
// command exactly once (W9: a completed hold clicks for you, and that click
// must not look like the user's), under `hold` a release before HOLD_MS sends
// nothing. The room's event is sent before the press and heard inside it.
const sent = [];
const heldCommit = async (page, kind, sel, cmdName) => {
  const gesture = await page.evaluate(() => (window.SESSION && window.SESSION.gesture) || 'hold');
  const b = page.locator(sel).first();
  if (!(await b.count())) return verdict(kind, false, `nothing to press: ${sel}`);
  await b.scrollIntoViewIfNeeded();
  const box = await b.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await roomEvent();
  const n0 = sent.filter((c) => cmdName === null || c === cmdName).length;
  if (gesture === 'click') await page.mouse.click(x, y); else await page.mouse.down();
  await sleep(60);
  const r = await underRenders(page, `${kind} (${gesture})`, sel, [], { eventSent: true, pressed: true });
  if (gesture !== 'click') await page.mouse.up();
  // under `click` the landing is waited for (a flight is HOLD_MS; the assembly
  // may be longer), up to twelve seconds
  const count = () => sent.filter((c) => cmdName === null || c === cmdName).length - n0;
  for (let i = 0; i < (gesture === 'click' ? 60 : 2); i++) { await sleep(200); if (gesture === 'click' && count() > 0) break; }
  await sleep(300);
  const n = count();
  const wantN = gesture === 'click' ? 1 : 0;
  if (n !== wantN) verdict(`…${kind}: ${cmdName || 'its command'} sent ${wantN === 1 ? 'once by the landing' : 'never, let go early'}`, false, `sent ${n} times`);
  // the room's event was waited for, not lost: one poll now lands it
  const landed = await poll(page, false);
  if (landed !== true) verdict(`…${kind}: the room's event lands once the press is over`, false, `the poll still waited (${landed})`);
  return r;
};

/* ---- the Founder, at 1600 ------------------------------------------------ */
const F = await seat(founder, { width: 1600, height: 1000 }, 'founder');

// a caret in a lane, and one in the editing card's always-shown reason box
if (want('lane') || want('why') || want('row')) {
  await F.evaluate(() => { const c = document.querySelector('#ridetab .achip[data-tab="text"]');
    if (c) { c.scrollIntoView({ block: 'start' }); scrollBy(0, -200); } });
  await sleep(300);
  await F.click('#editdoor [data-act="edit-door"]');
  await sleep(500);
  const clause = F.locator('#charter .anch, #charter [data-key]').filter({ hasText: 'minutes of the last one' }).first();
  await clause.click();
  await clause.evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  await F.keyboard.type(' Aloud.', { delay: 30 });
  await sleep(600);
  if (want('lane')) {
    await F.locator('#charter [data-lane]').first().click();
    await F.keyboard.press('Control+End');
    await F.keyboard.press('ArrowLeft');
    await F.keyboard.press('ArrowLeft');
    await underRenders(F, 'caret in a lane (edit mode)', '#charter [data-lane]', ['focused', 'caret', 'value']);
  }
  if (want('why')) {
    await F.locator('#charter .edit-why[data-why]').first().click();
    await F.keyboard.type('because it is read', { delay: 20 });
    await F.keyboard.press('ArrowLeft');
    await underRenders(F, 'caret in the reason box (edit mode)', '#charter .edit-why[data-why]', ['focused', 'caret', 'value']);
  }
  if (want('row')) {
    // **a held ✏️ on the proposal row**: under `hold` the pointer goes down and
    // both renders land inside the hold, then it is let go before HOLD_MS —
    // nothing is proposed; under `click` the click starts the flight and both
    // renders land inside it, and the flight's own landing must propose once
    const sel = '[data-proposalrow] [data-act="row-commit"]:not([data-pen]), [data-proposalrow] [data-act="draft-propose"]:not([data-pen])';
    await heldCommit(F, 'held ✏️ on the row', sel, 'propose-text');
  }
  // leave edit mode with the draft binned, so the rest runs in read mode
  await F.evaluate(() => { const b = document.querySelector('[data-proposalrow] [data-act="row-discard"], [data-proposalrow] [data-act="draft-discard-all"]'); if (b) b.click(); });
  await sleep(400);
  await F.evaluate(() => { const d = document.querySelector('#editdoor [data-act="edit-door"]'); if (d && document.getElementById('doc').classList.contains('editmode')) d.click(); });
  await sleep(400);
}

// the Founder's rule cards, in read mode: the reason lane, an open select, a
// number typed and not sent, and the two commits a card holds (✒️ and 🏛️)
const openTab = async (page, k) => {
  await page.evaluate((kk) => { if ([...document.querySelectorAll('.setupcard[data-setupcard]')].some((c) => c.dataset.setupcard === kk)) return;
    const el = document.querySelector('#rail [data-card="' + kk + '"]') || document.querySelector('#band [data-tab="' + kk + '"]');
    if (el) { el.scrollIntoView({ block: 'center' }); el.click(); } }, k);
  await sleep(700);
};
if (want('setwhy') || want('motion')) {
  await openTab(F, 'chamber');
  await F.click('.setupcard [data-set="chamber"][data-val="closed"]');
  await sleep(300);
  if (want('setwhy')) {
    await F.click('.setupcard [data-setwhy]');
    await F.keyboard.type('so that only members read it', { delay: 15 });
    await F.keyboard.press('ArrowLeft');
    await underRenders(F, "caret in the Founder's reason lane (a rule card)", '.setupcard [data-setwhy]', ['focused', 'caret', 'value']);
  }
  if (want('motion')) await heldCommit(F, 'held 🏛️ on a card', '.setupcard [data-holdmotion]', null);
}
if (want('select') || want('number') || want('pen')) {
  await openTab(F, 'rate');
  if (want('select')) {
    await F.focus('.setupcard [data-dripunit]');
    await F.keyboard.press('ArrowDown');           // a new unit, chosen and not sent
    await sleep(200);
    await underRenders(F, 'an open select (⏱️ the unit)', '.setupcard [data-dripunit]', ['focused', 'value']);
  }
  if (want('number')) {
    await F.click('.setupcard [data-num="dripN"]', { clickCount: 3 });
    await F.keyboard.type('45');
    await underRenders(F, 'a number typed, not sent (⏱️)', '.setupcard [data-num="dripN"]', ['focused', 'value', 'sel']);
  }
  if (want('pen')) {
    if (!want('number')) { await F.click('.setupcard [data-num="dripN"]', { clickCount: 3 }); await F.keyboard.type('45'); }
    await heldCommit(F, 'held ✒️ on a card', '.setupcard [data-confirm]', null);
  }
}

/* ---- a member, at 1600 --------------------------------------------------- */
if (want('picker') || want('date') || want('mwhy')) {
  const M = await seat(await cookieOf(seats.wide), { width: 1600, height: 1000 }, 'member');
  if (want('picker')) {
    await openTab(M, 'mypic');
    const emoji = M.locator('.setupcard .lanepick').filter({ hasText: /emoji/i }).first();
    if (await emoji.count()) { await emoji.click(); await sleep(400); }
    else await M.evaluate(() => { const b = [...document.querySelectorAll('.setupcard .pick')].find((x) => /emoji/i.test(x.textContent));
      const r = b && b.querySelector('.lanepick'); if (r) r.click(); });
    await sleep(400);
    await M.evaluate(() => { const g = document.querySelector('.setupcard .emojibox'); if (g) g.scrollTop = 600; });
    await underRenders(M, 'a scrolled 🖼️ picker grid', '.setupcard .emojibox', ['scrollTop']);
  }
  if (want('date') || want('mwhy')) {
    await openTab(M, 'ending');
    if (want('date')) {
      // focused, not clicked: a click lands on whichever segment is under the
      // box's middle, and the keys then fill from there
      await M.focus('.setupcard [data-mdate]');
      await M.keyboard.type('0101');                 // month and day: half a date, no value yet (Q1513)
      await underRenders(M, 'a half-typed date (⏰, Q1513)', '.setupcard [data-mdate]', ['focused']);
      await M.keyboard.type('2031');
      await M.keyboard.press('Tab');
      await M.keyboard.type('1200P');
      await sleep(300);
      if (process.env.RH_DEBUG_X) say('date: ' + JSON.stringify(await M.evaluate(() => { const b = document.querySelector('.setupcard [data-mdate]');
        return { v: b && b.value, same: b === window.__renderHoldEl, active: document.activeElement && document.activeElement.outerHTML.slice(0, 120) }; })));
      const whole = await M.evaluate(() => (document.querySelector('.setupcard [data-mdate]') || {}).value);
      if (whole !== '2031-01-01T12:00') verdict('…and the next keys complete the date', false, JSON.stringify(whole));
    }
    if (want('mwhy')) {
      await M.click('.setupcard [data-motionlane="why"]');
      await M.keyboard.type('because a year is long', { delay: 15 });
      await M.keyboard.press('ArrowLeft');
      await underRenders(M, "caret in a motion's reason box (⏰)", '.setupcard [data-motionlane="why"]', ['focused', 'caret', 'value']);
    }
  }
}

/* ---- a member, at 390: the task sheet's drag ----------------------------- */
if (want('sheet')) {
  const N = await seat(await cookieOf(seats.narrow), { width: 390, height: 844 }, 'narrow');
  const bar = N.locator('.sheetbar');
  if (!(await bar.count())) verdict('a drag on the task sheet (390)', false, 'no .sheetbar on the page');
  else {
    const b = await bar.boundingBox();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await roomEvent();
    await N.mouse.move(x, y);
    await N.mouse.down();
    await N.mouse.move(x, y - 40, { steps: 4 });
    await sleep(60);
    const dragging = await N.evaluate(() => document.documentElement.hasAttribute('data-sheetdrag'));
    if (!dragging) verdict('a drag on the task sheet (390)', false, 'the drag never started (no data-sheetdrag)');
    else {
      await N.evaluate(() => { window.__sheetT = (document.querySelector('#queue') || document.querySelector('.sheetbar').parentElement).style.transform; });
      await underRenders(N, 'a drag on the task sheet (390)', '.sheetbar', [], { eventSent: true });
      const still = await N.evaluate(() => ({ drag: document.documentElement.hasAttribute('data-sheetdrag'),
        t: (document.querySelector('#queue') || document.querySelector('.sheetbar').parentElement).style.transform, was: window.__sheetT }));
      if (!still.drag || still.t !== still.was) verdict('…the list under the finger did not move', false, JSON.stringify(still));
      await N.mouse.up();
      await sleep(400);
      const landed = await poll(N, false);
      if (landed !== true) verdict("…the room's event lands once the finger is off", false, `the poll still waited (${landed})`);
    }
  }
}

/* ---- the report ---------------------------------------------------------- */
const red = results.filter((r) => !r.ok);
say(`errors     · ${errors.length ? errors.slice(0, 4).join(' / ') : 'none'}`);
say(`refused    · ${refused.length ? refused.slice(0, 4).join(' / ') : 'none'}`);
say(`render-hold-walk (${MODE}) · ${results.length - red.length} of ${results.length} held${red.length ? ' · ' + red.length + ' FAIL' : ''}`);
await browser.close();
process.exit(red.length || errors.length || refused.length ? 1 : 0);
