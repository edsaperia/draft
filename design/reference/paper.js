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

   Loaded after session.js, whose breakpoint it reads; it starts itself once
   the document has parsed, and does nothing on a page with no `#doc`.
   ========================================================================== */
(function () {
  'use strict';
  const NARROW = window.matchMedia((window.SESSION && window.SESSION.NARROW_Q) || '(max-width: 900px)');
  let desk, rules, text, doc;

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

  function lay() {
    if (!doc) return;
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
    window.PAPER = { lay };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
