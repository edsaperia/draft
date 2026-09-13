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
/** The dev outbox's mails — the tail as an array, whichever shape the route answers. */
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
