/* ============================================================================
   paper.js — **paper on a desk** (Q1516 (6), Ed 2026-09-23: *a page ends and
   there's a shadow and then a new page begins with the text on it*; built into
   the page after three rounds on the mockup, branch `paper-mockup`, and
   *This looks fantastic*). The look itself is system.css's, under `html.desk`.

   It draws the two sheets — the Rules and the Text — as two absolutely
   positioned boxes on the body, behind everything (z-index -1, the canvas
   being the desk), and lays them over the document column's own box every
   time that box or its contents change. They are drawn, not wrapped: the
   column's DOM is the page's, byte for byte, so no clause, tab or card moves
   because the paper is there, and `card-audit` measures the same geometry
   either way.

   The break is the `.cpara.docsep` hairline's own place: system.css turns the
   hairline into a transparent block exactly the desk gap tall, with a sheet's
   margin either side, and this file ends the Rules sheet at its top and
   starts the Text sheet at its bottom. No docsep (the birth before the save,
   or the session fixture without `&band=1`) means one sheet, the whole column.

   The drawn left edge comes in `--sheet-trim` over the clause-tab gutter, and
   the last sheet ends `--sheet-margin` below the last line rather than
   running through the scroll runway (system.css states both). In edit mode
   the card's foot is the page's foot (Q1292), so there the sheet runs to the
   column's end. At narrow (session.js's `NARROW_Q`) the sheets bleed through
   `.wrap`'s side padding to the glass, untrimmed.

   **The credit** (issue #165, Ed 2026-10-02): one line on the desk, centred
   a desk gap under the last sheet's foot, *Created by the London College of
   Political Technology*, the name a link to newspeak.house (copy.js
   `page.credit`). It stands in the runway, so a short document shows it
   beneath the page and a long one meets it at the end of the text; it is
   not drawn in edit mode, where the column is lifted and the sheet runs on.

   Loaded after session.js, whose breakpoint it reads; it starts itself once
   the document has parsed, and does nothing on a page with no `#doc`.
   ========================================================================== */
(function () {
  'use strict';
  const NARROW = window.matchMedia((window.SESSION && window.SESSION.NARROW_Q) || '(max-width: 900px)');
  let desk, rules, text, doc, credit;
  const CREDIT_HREF = 'https://newspeak.house';

  function build() {
    doc = document.getElementById('doc');
    if (!doc) return false;
    desk = document.createElement('div');
    desk.className = 'desksheets';
    desk.setAttribute('aria-hidden', 'true');
    rules = document.createElement('div'); rules.className = 'sheet sheet-rules';
    text = document.createElement('div'); text.className = 'sheet sheet-text';
    desk.append(rules, text);
    document.body.appendChild(desk);
    // the credit is read and pressed, so it stands outside the aria-hidden desk
    const words = window.COPY && window.COPY.page && window.COPY.page.credit;
    if (words) {
      credit = document.createElement('p');
      credit.className = 'deskcredit';
      const a = document.createElement('a');
      a.href = CREDIT_HREF; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = words.name;
      credit.append(document.createTextNode(words.lead), a);
      document.body.appendChild(credit);
    }
    return true;
  }

  const px = (n) => Math.round(n * 100) / 100 + 'px';
  function place(el, left, top, width, height) {
    if (height <= 0) { el.hidden = true; return; }
    el.hidden = false;
    el.style.left = px(left); el.style.top = px(top);
    el.style.width = px(width); el.style.height = px(height);
  }

  // a length token off the root, resolved: `--sheet-margin` may be a calc()
  const probe = document.createElement('div');
  function token(name) {
    probe.style.cssText = 'position:absolute;visibility:hidden;width:var(' + name + ')';
    document.body.appendChild(probe);
    const w = probe.getBoundingClientRect().width;
    probe.remove();
    return w;
  }

  // a resting tab's width, read off the design system's own `.achip` rather
  // than written here a second time
  function restingTab() {
    const t = document.createElement('span');
    t.className = 'achip';
    t.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0';
    document.body.appendChild(t);
    const w = t.getBoundingClientRect().width;
    t.remove();
    return w;
  }

  // where the text ends: the top of the scroll runway, which is `#runway`
  // after 🍾 in read mode and the column's `::after` otherwise (system.css,
  // *the runway is content*); in edit mode the card's foot is the page's
  // foot (Q1292), so the paper runs to the column's end
  function textEnd(r, sy) {
    if (doc.classList.contains('editing')) return null;
    const rw = document.getElementById('runway');
    if (rw && rw.offsetHeight > 0) return rw.getBoundingClientRect().top + sy;
    const after = parseFloat(getComputedStyle(doc, '::after').height) || 0;
    return after > 0 ? r.bottom + sy - after : null;
  }

  // **The edit area is one sheet** (issue #153, Ed 2026-10-02: *the proposal
  // card should look like it's floating above the text container/composer.
  // The text composer should not look like there's a break in it*). An open
  // card splits the lifted column into `.prose` segments (session.js's
  // `renderDoc`), each painting its own outline (system.css); each segment a
  // later one follows is handed the distance to it as `--sheet-join`, and
  // its outline runs on through the card to the next one's top, the joins'
  // corners and shadows clipped — so the outline is one box behind the card
  // and the card lies on it. Paint only: no box moves.
  function joinEdit() {
    const segs = [...doc.querySelectorAll('#charter > .prose')];
    const on = doc.classList.contains('editing');
    segs.forEach((seg, i) => {
      const next = on ? segs[i + 1] : null;
      const v = next ? px(Math.max(0, next.getBoundingClientRect().top - seg.getBoundingClientRect().bottom)) : '';
      // set only when it moves: the style write is a mutation this file observes
      if (seg.style.getPropertyValue('--sheet-join') !== v) {
        if (v) seg.style.setProperty('--sheet-join', v); else seg.style.removeProperty('--sheet-join');
      }
    });
  }

  function lay() {
    if (!doc) return;
    joinEdit();
    const r = doc.getBoundingClientRect();
    const sx = window.scrollX, sy = window.scrollY;
    const wrap = doc.closest('.wrap');
    const bleed = NARROW.matches && wrap ? parseFloat(getComputedStyle(wrap).paddingLeft) || 0 : 0;
    // the drawn edge comes in over the tab gutter to `--s5` short of the tabs
    // (system.css): measured off the tab column, since that column steps in
    // below 1440 and a constant `--sheet-trim` left the tabs 9px of paper
    // there (Ed, 2026-09-24: *on narrow desktop screens the tabs look
    // cluttered*); the token stands where no tab is drawn. 88px at 1600.
    // **…off the column's right edge, less a resting tab** (Ed, 2026-09-24:
    // *the left edge of the document moves when I open the tab*): a column's
    // left edge is its widest tab's, and an open card's active tab grows 8px
    // out to the left (M12) — so where the first column on the page was an
    // open card's strip, 🪶's at the head of the Rules, the sheet stepped 8px
    // with it. The right edge is the joint every tab keeps still, open or
    // resting, which is why the glyph moves 0px (P2).
    const col = NARROW.matches ? null : [...doc.querySelectorAll('.chipcol')].find((c) => c.offsetWidth);
    const trim = NARROW.matches ? 0
      : col ? Math.max(0, col.getBoundingClientRect().right - restingTab() - r.left - token('--s5')) : token('--sheet-trim');
    const left = r.left + sx - bleed + trim, width = r.width + 2 * bleed - trim;
    const top = r.top + sy;
    // the last line's box stands --s4 above the runway's top (a block's own
    // trailing leading), so the foot adds the margin less that
    const end = textEnd(r, sy);
    const bottom = end == null ? r.bottom + sy : end + token('--sheet-margin') - token('--s4');
    // the credit, a desk gap under the last sheet's foot, centred on it
    if (credit) {
      if (doc.classList.contains('editing')) credit.hidden = true;
      else {
        credit.hidden = false;
        credit.style.left = px(left); credit.style.width = px(width);
        credit.style.top = px(bottom + token('--desk-gap'));
      }
    }
    const sep = doc.querySelector('.cpara.docsep');
    const s = sep && sep.getClientRects().length ? sep.getBoundingClientRect() : null;
    if (!s) {
      place(rules, left, top, width, bottom - top);
      place(text, left, 0, 0, 0);
      desk.dataset.sheets = '1';
      return;
    }
    const breakTop = s.top + sy, breakBottom = s.bottom + sy;
    place(rules, left, top, width, breakTop - top);
    place(text, left, breakBottom, width, bottom - breakBottom);
    desk.dataset.sheets = '2';
    openAtText(breakBottom);
  }

  // ---- the opening place (issue #197; the default since #212) --------------
  // Ed, 2026-10-02: *when the page opens, it aligns near the top of The Text
  // page, and people could just scroll upwards* — the Rules being, in the
  // members' word, a menu. SURFACE M26. The page opens with the Text sheet's
  // top `--sheet-margin` under the bar: the desk gap and the Rules' blank foot
  // show above it, never a Rules line. Behind `?rules=below` from #197 until
  // Ed's *merge and make it the default* (2026-10-03, #212).
  //
  // **Decided once, at the first lay that has the break** — the docsep is
  // drawn only once the page holds a document, so this is the boot's first
  // render, whichever boot — and only for a begun one (`.doc.begun`, which
  // the closed page and the stranger's door wear too): a founding page opens
  // at the top, and a 🍾 pressed later is not an opening. A fragment in the
  // address, or a card already open (`?try=1`'s 👋), is a place of its own and
  // wins.
  //
  // **Pinned, not jumped**: `overflow-anchor` is off (system.css, *the page
  // holds its own scroll*), and the faces landing, the band settling and the
  // poll all move the Text after the first render, so every lay re-pins it,
  // instantly, until the reader does anything at all — a wheel, a touch, a
  // key, a press, or a scroll this code did not make.
  //
  // **A reload or a return keeps whatever restores the reader's place**: the
  // browser's own restoration, landing after `load`. It lands where the
  // reader was only where the page is already whole by then (the fixture);
  // on the live path the column arrives on the view's fetch and the browser
  // restores against a page a fraction of its height, which lands nowhere in
  // particular (233px for a reader who left at 1800, measured on the demo).
  // So the place is noted as the page is left, and on a reload or a return
  // the decision waits for the restoration: where the browser put the reader
  // back, it stands; where it did not, the page opens at the Text.
  // **`?open=top` is a dev seam, not a member's option** (#212): the old
  // opening, for a walk or a probe whose measurements are frozen at scroll 0.
  const SEAM_TOP = new URLSearchParams(location.search).get('open') === 'top';
  const ON = !SEAM_TOP;
  let pinState = ON ? 'undecided' : 'off';
  let pinnedY = null;
  const PLACE_KEY = 'open-at:' + location.pathname + location.search;
  const navType = (() => {
    try { const n = performance.getEntriesByType('navigation')[0]; return n ? n.type : 'navigate'; } catch (e) { return 'navigate'; }
  })();
  let leftAt = 0;
  if (ON && (navType === 'reload' || navType === 'back_forward')) {
    try { leftAt = Number(sessionStorage.getItem(PLACE_KEY)) || 0; } catch (e) { /* no place noted */ }
  }
  // the restoration is the browser's, a frame or so after `load`; a timer,
  // never rAF, for the backgrounded tabs (CLAUDE.md, *Checking a mockup*)
  let restoreSettled = !leftAt;
  if (!restoreSettled) {
    const settle = () => setTimeout(() => { restoreSettled = true; if (window.PAPER) window.PAPER.lay(); }, 150);
    if (document.readyState === 'complete') settle(); else addEventListener('load', settle);
  }
  if (ON) {
    addEventListener('pagehide', () => {
      try { sessionStorage.setItem(PLACE_KEY, String(Math.round(window.scrollY))); } catch (e) { /* the place goes unnoted */ }
    });
  }
  function unpin() {
    if (pinState !== 'pinned') return;
    pinState = 'released';
    for (const t of ['wheel', 'touchstart', 'keydown', 'pointerdown']) removeEventListener(t, unpin, true);
  }
  function openAtText(breakBottom) {
    if (pinState === 'undecided') {
      if (!restoreSettled) return;
      const restored = leftAt > 0 && Math.abs(window.scrollY - leftAt) <= 2;
      const take = doc.classList.contains('begun') && !location.hash && !doc.querySelector('.gshell') && !restored;
      pinState = take ? 'pinned' : 'off';
      if (!take) return;
      for (const t of ['wheel', 'touchstart', 'keydown', 'pointerdown']) addEventListener(t, unpin, { capture: true, passive: true });
      addEventListener('scroll', () => {
        if (pinState === 'pinned' && pinnedY != null && Math.abs(window.scrollY - pinnedY) > 1) unpin();
      }, { passive: true });
    }
    if (pinState !== 'pinned') return;
    // a card opened by anything — an evaluated click carries no pointerdown —
    // is a place of its own, as at the decision
    if (doc.querySelector('.gshell')) { unpin(); return; }
    const max = document.documentElement.scrollHeight - innerHeight;
    // …and so is a scroll made since the last pin and not yet announced by
    // its event (a walk's `scrollTo(0, 0)`, a travel's first frame): the
    // reader's, unless it is the page clamping a scroll it no longer has room for
    if (pinnedY != null && Math.abs(window.scrollY - pinnedY) > 1 && window.scrollY < max - 1) { unpin(); return; }
    const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 58;
    const y = Math.max(0, Math.min(max, Math.round(breakBottom - nav - token('--sheet-margin'))));
    pinnedY = y;
    if (Math.abs(window.scrollY - y) > 1) window.scrollTo(window.scrollX, y);
  }

  let queued = false;
  function soon() {
    if (queued) return;
    queued = true;
    // a microtask rather than rAF: the probes' and the audit's tabs may run
    // backgrounded, where rAF never fires (CLAUDE.md, *Checking a mockup*)
    Promise.resolve().then(() => { queued = false; lay(); });
  }

  function start() {
    if (!build()) return;
    lay();
    new ResizeObserver(soon).observe(doc);
    new MutationObserver(soon).observe(doc, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
    window.addEventListener('resize', soon);
    NARROW.addEventListener('change', soon);
    if (document.fonts) document.fonts.addEventListener('loadingdone', soon);
    // the page lays itself out over several ticks after boot (the fixture's
    // washes, the fonts); a last pass once it has settled
    setTimeout(lay, 300); setTimeout(lay, 1200);
    window.PAPER = { lay, pinState: () => pinState };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
