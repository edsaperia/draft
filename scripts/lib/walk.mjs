/**
 * The walks' shared hands (refactor item 26, 2026-09-13).
 *
 * Ten walk scripts had grown the same helpers by copy — `say` eight times,
 * `typeIn` six, `clickIn` five, `press` four — each pasted from journey-walk
 * and drifting a settle time or a scroll at a time. What is here is the set
 * whose bodies were the same in intent across every copy; a helper that
 * differs on purpose stays in its walk (applicants-walk types with real
 * keystrokes at the door, seat-matrix opens tabs on the Founded line too,
 * room-bots' `say` carries a clock) and is not pretended into one here.
 *
 * Two shapes. The page helpers take `page` first, which is how seat-matrix
 * drives several seats at once; `onPage(page, defaults)` binds them to one
 * page with that walk's own timings — founding-walk clicks without scrolling
 * and settles 280ms, journey scrolls and settles 420ms — so a walk keeps
 * exactly the drive it had before the move. The wire helpers take `base`.
 *
 * Nothing in here asserts anything. A walk's verdicts are the walk's.
 */

/* ---- the terminal and argv ---------------------------------------------- */

import { chromium, firefox, webkit } from 'playwright';

/**
 * **Which engine a walk drives** (2026-09-17, the cross-browser pass before
 * the first live test). Every walk hardcoded `chromium`, so nothing this
 * project has ever measured was measured anywhere but Blink — and the people
 * arriving on Sunday bring Safari and Firefox with them.
 *
 * `--browser=chromium|webkit|firefox` on argv, else `DRAFT_BROWSER`, else
 * chromium: the default is the whole of the compatibility promise, since every
 * golden, every baseline and every CI job below this line was frozen against
 * Blink and must stay byte-identical. Answers the Playwright launcher itself,
 * so a caller writes `const browser = await browserFor().launch()` and keeps
 * whatever launch options it had.
 *
 * An engine nobody installed fails at `launch()` with Playwright's own message,
 * which names the install command; an engine that is not one of the three is
 * refused here, because a typo would otherwise run chromium and read as proof.
 */
const ENGINES = { chromium, webkit, firefox };
export const browserFor = (argv = process.argv, env = process.env) => {
  const named = (argv || []).find((a) => a.startsWith('--browser='));
  const name = (named ? named.slice('--browser='.length) : (env && env.DRAFT_BROWSER) || '') || 'chromium';
  const engine = ENGINES[name];
  if (!engine) {
    console.error(`no such browser: ${name} — engines are ${Object.keys(ENGINES).join(', ')}`);
    process.exit(2);
  }
  return engine;
};

export const say = (...a) => console.log(...a);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** `--name=value` from argv, else `dflt` (null when none is given). */
export const arg = (name, dflt = null) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? dflt : hit.slice(name.length + 3);
};

/* ---- the wire ------------------------------------------------------------ */

/** The first http link in a mail, whatever field it stands in. */
export const linkIn = (mail) => (JSON.stringify(mail).match(/http:[A-Za-z0-9_?=/:.-]+/) || [])[0];
/**
 * The dev outbox's mails — the tail as an array, whichever shape the route
 * answers. **Newest first**, which is `outboxTail`'s own order and is worth
 * saying here because every caller filters and then picks an end: the first
 * match is the mail that has just been sent, and the *last* is the oldest one
 * the tail still holds. A walk that takes the last therefore follows a link a
 * previous run against the same `DRAFT_DATA_DIR` has already consumed, which
 * is a walk failing on its own history — applicants-walk lost a run to it.
 */
export const outbox = async (base) => {
  const ob = await (await fetch(base + '/api/dev/outbox')).json();
  return ob.mails || ob;
};
/** A JSON POST as the page sends one: same-origin header, the seat's cookie if any. */
export const post = (base, path, body, cookie) => fetch(base + path, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: base,
    ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
});
/**
 * Follow a magic link the way a browser does: the interstitial GET, then its
 * own token POSTed back (server.test.ts's `consume`). Answers the status, the
 * cookie the 302 set and where it sends you; what a refusal means is the
 * caller's to decide.
 */
export const followLink = async (link) => {
  const u = new URL(link);
  await fetch(u.origin + u.pathname + u.search); // the interstitial
  const r = await fetch(u.origin + u.pathname, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
    body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(),
    redirect: 'manual',
  });
  return { status: r.status,
    cookie: (r.headers.get('set-cookie') ?? '').split(';')[0],
    location: r.headers.get('location') ?? '' };
};

/* ---- the page ------------------------------------------------------------ */

/**
 * **A commit is a press, and what a press *is* depends on the gesture**
 * (backlog 184). Under `hold` it is down · wait · up, as it always was; under
 * `click` the click starts the flight and the wait is the flight's own length,
 * with nothing to let go of. Asked of the page rather than assumed, so a walk
 * follows `COMMIT_GESTURE` wherever it is set — including journey's
 * `--gesture=` override, which rides `window.COMMIT_GESTURE_OVERRIDE` because
 * an init script survives every `goto` where a query does not.
 */
export const pageGesture = (page) =>
  page.evaluate(() => (window.SESSION && window.SESSION.gesture) || 'hold');

/** Set a field or a contenteditable and fire its input event; true if it was there. */
export const typeIn = async (page, sel, v, { settleMs = 0 } = {}) => {
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
  if (settleMs) await page.waitForTimeout(settleMs);
  return ok;
};

/**
 * **A synthetic paste has to carry its own clipboard** (2026-09-17, answering
 * `design/REPORT-xbrowser.md`'s finding 2). A walk that pastes by handing a
 * `DataTransfer` to `new ClipboardEvent('paste', …)` is driving chromium and
 * nothing else: Gecko will not read a `DataTransfer` back out of an untrusted
 * clipboard event, so on Firefox the page's listener gets a `clipboardData`
 * whose `types` is empty and whose `getData` answers `''` — measured, all
 * three engines, 2026-09-17 — and everything downstream of the paste falls
 * over behind a column that never filled.
 *
 * The real clipboard is not the way round it. `navigator.clipboard.writeText`
 * plus a real `Control+V` delivers a trusted event on chromium and firefox,
 * but **WebKit's trusted event answers `''` for every one of the three types
 * it lists**, so a real press would turn a green run red; and chromium's
 * round trip through the Windows clipboard rewrites `\n` as `\r\n`, which
 * makes the payload the page receives differ per engine — a walk that drives
 * a control differently on each engine is testing something else. Nor does
 * `keyboard.insertText` serve: it fires no `paste` at all (all three), so the
 * handler under test never runs.
 *
 * So the event carries a hand-made `clipboardData` instead of a real one: an
 * object with the `getData`/`types` a listener reads, shadowed onto a real
 * `ClipboardEvent` instance. Every engine then hands the page exactly what
 * chromium's `DataTransfer` handed it before — byte for byte, both fields,
 * verified against this tree — and the same walk asserts the same things
 * everywhere. `getData('text')` aliases `text/plain`, as a real one does, and
 * an absent type answers `''`, which is the case Q1314's HTML-only paste is
 * about.
 *
 * Installed as an init script so it survives every `goto`, and called from
 * *inside* a walk's own `page.evaluate` — `window.__paste(el, { text, html })`
 * — because the caret the paste lands on is set in that same evaluate and the
 * live page re-renders on a 4s poll between any two of them.
 */
export const installPaste = (page) => page.addInitScript(() => {
  window.__paste = (el, payload) => {
    const p = typeof payload === 'string' ? { text: payload } : (payload || {});
    const data = new Map();
    if (p.text != null) data.set('text/plain', p.text);
    if (p.html != null) data.set('text/html', p.html);
    const clipboardData = {
      types: [...data.keys()],
      getData: (t) => data.get(t === 'text' ? 'text/plain' : t) ?? '',
    };
    const ev = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'clipboardData', { value: clipboardData });
    return el.dispatchEvent(ev);
  };
});

/** Click a control by selector; false when it is missing or disabled, so a
 *  selector that names no rung is a *reported* failure rather than a silent no-op. */
export const clickIn = async (page, sel, { settleMs = 420, scroll = true } = {}) => {
  const ok = await page.evaluate(([s, sc]) => {
    const el = document.querySelector(s);
    if (!el || el.disabled) return false;
    if (sc) el.scrollIntoView({ block: 'center' });
    el.click();
    return true;
  }, [sel, scroll]);
  await page.waitForTimeout(settleMs);
  return ok;
};

/** Open a task from the rail or its tab in the band (journey's). */
export const open = async (page, k, { settleMs = 420 } = {}) => {
  const ok = await page.evaluate((kk) => {
    const el = document.querySelector('#rail [data-card="' + kk + '"], #band [data-tab="' + kk + '"]');
    if (!el) return false;
    el.click();
    return true;
  }, k);
  await page.waitForTimeout(settleMs);
  return ok;
};

/** Open a card by key from the rail first, then the band (founding-walk's). */
export const openCard = async (page, k, { settleMs = 320 } = {}) => {
  const ok = await page.evaluate((kk) => {
    const sel = '[data-card="' + kk + '"], [data-tab="' + kk + '"]';
    const el = document.querySelector('#rail ' + sel) || document.querySelector('#band ' + sel);
    if (!el) return false;
    el.click();
    return true;
  }, k);
  await page.waitForTimeout(settleMs);
  return ok;
};

/** A commit is a press, and a press needs the control under the pointer:
 *  the open card's live commit, held (or clicked) for `holdMs`. Answers the
 *  button's label, or null when the card offers no commit. */
export const press = async (page, holdMs) => {
  const box = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.setupcard .commitrow button')]
      .find((x) => !x.disabled && !/🗑/.test(x.textContent) && !x.querySelector('[data-gl="bin"]'));
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
    const label = window.CARDS.glyphTextOf(b).trim() || b.getAttribute('title') || 'commit';
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, label };
  });
  if (!box) return null;
  await page.waitForTimeout(160);
  await page.mouse.move(box.x, box.y);
  if (await pageGesture(page) === 'click') {
    await page.mouse.click(box.x, box.y);
    await page.waitForTimeout(holdMs);
  } else {
    await page.mouse.down();
    await page.waitForTimeout(holdMs);
    await page.mouse.up();
  }
  await page.waitForTimeout(460);
  return box.label;
};

/**
 * The page helpers bound to one page, with that walk's own defaults —
 * `{ click: { settleMs, scroll }, type: { settleMs }, open: { settleMs } }`
 * — so a call site reads as it always did: `await clickIn(sel)`.
 */
export const onPage = (page, d = {}) => ({
  T: (ms) => page.waitForTimeout(ms),
  pageGesture: () => pageGesture(page),
  typeIn: (sel, v) => typeIn(page, sel, v, d.type),
  clickIn: (sel) => clickIn(page, sel, d.click),
  open: (k) => open(page, k, d.open),
  openCard: (k) => openCard(page, k, d.open),
  press: (ms) => press(page, ms),
});
