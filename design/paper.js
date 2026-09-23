/* ============================================================================
   paper.js — **paper on a desk, the mockup** (Q1516 (6), Ed 2026-09-23: *a page
   ends and there's a shadow and then a new page begins with the text on it*).

   Loaded only by `?paper=1` (the head of session-view.html). It draws the two
   sheets — the Rules and the Text — as two absolutely positioned boxes on the
   body, behind everything (z-index -1, the canvas being the desk), and lays
   them over the document column's own box every time that box or its
   contents change. They are drawn, not wrapped: the column's DOM is the
   page's, byte for byte, so no clause, tab or card moves because the paper
   is there, and `card-audit` measures the same geometry either way.

   The break is the `.cpara.docsep` hairline's own place: paper.css turns the
   hairline into a transparent block exactly the desk gap tall, with a sheet's
   padding either side, and this file ends the Rules sheet at its top and
   starts the Text sheet at its bottom. No docsep (the birth before the save,
   or the session fixture without `&band=1`) means one sheet, the whole column.

   The drawn left edge comes in `--sheet-trim` over the clause-tab gutter, and
   the last sheet ends `--sheet-margin` below the last line rather than
   running through the scroll runway (paper.css states both). At narrow the
   sheets bleed through `.wrap`'s side padding to the glass, untrimmed.
   ========================================================================== */
(function () {
  'use strict';
  const NARROW = window.matchMedia('(max-width: 900px)');   // NARROW_Q (mockup)
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
    // the drawn edge comes in by --sheet-trim over the tab gutter (paper.css)
    const trim = NARROW.matches ? 0 : token('--sheet-trim');
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
