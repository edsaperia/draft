/* card-shell.js — one shell for every card (Q1541 stage 1).
 *
 * The redesign's second cause (grammar.md L2, BUILD.md §1): the band and the
 * charter drew their cards with two shells (`cardHtml` in setup.js,
 * `suggCardHtml` in session.js), and every difference the inventory found
 * between them — an eyebrow on one side, a 🗑️ spacer on the other, the tab
 * dropping on one side — was a fault in one of them. This is the one shell,
 * in two halves:
 *
 * **The slots** (`cardHtml`), built from `CardState` (card-state.js) and the
 * copy table alone — the `state-only` rule, which `npm run spec-check`
 * holds over the marked region below. A card is the strip plus six slots,
 * always in this order (grammar §2.3, as answers.md rules it):
 *
 *   label   the one label above the first line — what the line is, or what
 *           the card asks (1541.46 (a)); `.glab`, all capitals at `--t-cap`,
 *           700, `--muted`, a record's outcome in its colour (Part 4 .27)
 *   head    the first line: the anchor as the column's renderer draws it,
 *           carrying the strip; on a rule, the standing pill (1541.47)
 *   fact    one line — a record's participation (answers Part 6.3)
 *   body    prose about the thing, by kind
 *   blocks  the alternatives, or a record's field — each block's label its
 *           own first line (1541.45)
 *   row     the commit row, one of six shapes (grammar §2.6 as ruled)
 *
 * A slot with nothing in it is not drawn (`PRESENT`, the presence predicates
 * card-audit's P19 reads), with the two stated exceptions of principle 6:
 * the reason box on a card that can take a change, and the card's floor.
 *
 * **The geometry** (`space-above`, 1541.44): an opened card makes its
 * label's room by sliding the content above it up, the scroll adjusted in
 * the same frame, so the first line and the pressed tab stay still on the
 * glass; where the page cannot scroll that far — the page top, or a line
 * so close under the topbar that its label would land under it — the first
 * line moves down by the shortfall (answers Part 6.4). Close and switch take
 * the room back by the same rule (6.5). The card's box begins exactly where
 * its paragraph's box began and its label stands exactly where the
 * paragraph's first line stood (`fit`), so the room made is exactly the
 * label's (card-audit P16).
 *
 * Load order: … cards.js → card-state.js → **card-shell.js** → setup.js → …
 */
window.CARD_SHELL = (function () {
  'use strict';

  // the copy table, read once per call and handed to the slots; the slots
  // themselves never reach past the state and this table (`state-only`)
  const WORDS = () => ((window.COPY || {}).shell || {});

  /* ---- slots: state-only ------------------------------------------------- *
   * Everything between this marker and the next reads `st` (a CardState) and
   * `w` (the copy table) and nothing else: no page, no module, no DOM.
   * `npm run spec-check`'s `state-only` rule holds the region.            */

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /** the presence predicates (grammar L1): a slot is drawn exactly when its
   *  predicate holds, and card-audit's P19 reads these off `data-slot` */
  const PRESENT = {
    label: (st) => !!(st.label && st.label.text),
    head: (st) => !!(st.head && st.head.html),
    fact: (st) => !!st.fact,
    body: (st) => !!(st.body && st.body.html),
    blocks: (st) => !!(st.blocks && st.blocks.length),
    input: (st) => !!(st.input && st.input.html),
    row: (st) => rowShape(st) !== 'absent',
  };

  /** **the one label drawing** (Part 4 .27): all capitals at `--t-cap`, 700,
   *  `--muted`; a record's outcome in its colour (`.gtone-ok`, *Passed*) */
  const labelHtml = (l) => '<span class="glab' + (l.tone === 'ok' ? ' gtone-ok' : '') + '"' +
    (l.fact ? ' data-fact="' + esc(l.fact) + '"' : '') + '>' + esc(l.text) + '</span>';

  const labelSlot = (st) => (PRESENT.label(st)
    ? '<div class="glabslot" data-slot="label">' + labelHtml(st.label) + '</div>' : '');

  /** the first line — the paragraph renderer's own element, handed over drawn
   *  (S2), carrying the strip; the shell only marks the slot */
  const headSlot = (st) => (PRESENT.head(st) ? st.head.html : '');

  /** the standing pill (1541.5 (b), .47): who chose what stands, worn on the
   *  first line in today's drawing of a chosen option (1541.13 (c)) — a
   *  fact, never a control, on a card whose reader cannot choose (P26) */
  const pillHtml = (standing) => (standing && standing.label
    ? '<span class="standpill" data-fact="pill"><span class="dot"></span><span>' + esc(standing.label) + '</span></span>' : '');

  const factSlot = (st) => (PRESENT.fact(st)
    ? '<div class="gfact rsub" data-slot="fact">' + esc(st.fact) + '</div>' : '');

  const bodySlot = (st) => (PRESENT.body(st)
    ? '<div class="gbody" data-slot="body">' + st.body.html + '</div>' : '');

  /** one block: its label its own first line (1541.45), then its words, then
   *  who argued for it */
  const blockHtml = (b) => '<div class="' + esc(b.cls || 'gblock') + '" data-slot="block">' +
    labelHtml({ text: b.label, fact: b.fact, tone: b.tone }) +
    '<div class="rtext">' + (b.html || '') + '</div>' + (b.speaker || '') + '</div>';

  const blocksSlot = (st) => (PRESENT.blocks(st)
    ? '<div class="gblocks' + (st.boxed ? ' boxed' : '') + '" data-slot="blocks">' +
      st.blocks.map(blockHtml).join('') + '</div>' : '');

  const inputSlot = (st) => (PRESENT.input(st)
    ? '<div class="ginput" data-slot="input">' + st.input.html + '</div>' : '');

  /**
   * **The six row shapes** (grammar §2.6 as answers Part 4 .24 and 1541.9 (b)
   * keep them): absent · withdraw (the bare 🗑️) · commit · pair ·
   * acknowledge (OK, only while owed) · accept (*Accept ‹glyph›*). A card
   * that asks nothing has no row: its tab, a click outside and Escape close
   * it (1541.8 (a)).
   */
  function rowShape(st) {
    const acts = st.acts || [];
    if (st.owed && st.owed.kind === 'ok') return 'acknowledge';
    if (st.owed && st.owed.kind === 'accept') return 'accept';
    const commits = acts.filter((a) => a.kind === 'commit');
    if (commits.length >= 2) return 'pair';
    if (commits.length === 1) return 'commit';
    if (acts.some((a) => a.kind === 'withdraw')) return 'withdraw';
    return 'absent';
  }

  /**
   * **The row**, with its **dark furniture** (principle 5, 1541.9): the bin
   * is drawn wherever the card can ever give it a job, dark until there is
   * something of this reader's to remove (`data-until="nothing-yours"`, no
   * note — 1541.49); a dark commit says why in the middle only where the
   * reason is not already on the card — the ✏️ countdown, 🏛️ in use, 🍾
   * waiting (Part 4 .17–.22). Stage 1's pilots draw only the absent and
   * acknowledge shapes; the rest are the shell's for the stages to come.
   */
  function rowSlot(st, w) {
    const shape = rowShape(st);
    if (shape === 'absent') return '';
    const acts = st.acts || [];
    const bin = acts.find((a) => a.kind === 'bin' || a.kind === 'withdraw');
    const binHtml = bin ? '<button class="btn glyphbtn" data-act="' + esc(bin.act || 'bin') + '"' +
      (bin.until ? ' disabled data-until="' + esc(bin.until) + '"' : '') +
      ' title="' + esc(bin.title || '') + '">🗑️</button>' : '';
    const NOTE = /^(drip|voice-out|readiness)$/;
    const notes = [...new Set(acts.filter((a) => a.kind === 'commit' && a.until && NOTE.test(a.until) && a.note)
      .map((a) => a.note))];
    const noteHtml = notes.length ? '<span class="gnote">' + notes.map(esc).join(w.sep || ' · ') + '</span>' : '';
    let right = '';
    if (shape === 'acknowledge') {
      right = '<button class="btn btn-approve okbtn"' + (st.owed.attrs || '') +
        ' title="' + esc(st.owed.title || '') + '">' + esc(st.owed.word || 'OK') + '</button>';
    } else if (shape === 'accept') {
      right = '<button class="btn btn-approve okbtn"' + (st.owed.attrs || '') + '>' + esc(st.owed.word || '') + '</button>';
    } else {
      right = acts.filter((a) => a.kind === 'commit').slice(0, 2).map((a) =>
        '<button class="btn glyphbtn" data-act="' + esc(a.act || '') + '"' +
        (a.until ? ' disabled data-until="' + esc(a.until) + '"' : '') +
        ' title="' + esc(a.title || '') + '">' + esc(a.glyph || '') + '</button>').join('');
    }
    // `st.owed.left` is the one thing today's rows put at the left beside an
    // OK — the way back to a clause's list of its records (Q1536) — kept as
    // it was until the records' own stage (BUILD.md stage 7)
    const left = st.owed && st.owed.left ? st.owed.left : binHtml || '<span></span>';
    return '<div class="race-mid commitrow" data-slot="row" data-shape="' + shape + '">' + left + noteHtml + right + '</div>';
  }

  /**
   * **The card**: the frame the surface names (its root classes and keys —
   * `st.frame`), then the slots in their one order. `data-kind` is the
   * shell kind the audit holds strictly (card-audit's `GRAMMAR_KINDS`).
   */
  function cardHtml(st) {
    const w = WORDS();
    const f = st.frame || {};
    return '<div class="' + esc((f.cls || 'sugg') + ' gshell') + '"' + (f.attrs || '') +
      ' data-kind="' + esc(st.kind || '') + '">' +
      labelSlot(st) + headSlot(st) + factSlot(st) + bodySlot(st) + blocksSlot(st) + inputSlot(st) + rowSlot(st, w) +
      '</div>';
  }

  /* ---- end slots ---------------------------------------------------------- */

  /* ---- the geometry: space-above (1541.44, answers Part 6.4, 6.5) ------- */

  /** the glass's top: under the topbar, where a label must never hide */
  const glassTop = () => {
    const nav = document.querySelector('.navbar');
    if (!nav) return 0;
    const s = getComputedStyle(nav);
    return s.position === 'fixed' || s.position === 'sticky' ? Math.max(0, nav.getBoundingClientRect().bottom) : 0;
  };
  /** the first line box of the words in `el`, on the glass: the first
   *  visible text run, the strip and the labels aside */
  function lineTop(el) {
    if (!el) return null;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!n.nodeValue.trim()) continue;
      const h = n.parentElement;
      if (!h || h.closest('.chipcol, .glabslot, .sr, [hidden]')) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      for (const q of r.getClientRects()) if (q.width && q.height) return q.top;
    }
    return el.getBoundingClientRect().top;
  }
  const headOf = (card) => card && (card.querySelector('.clausehead .rtext') || card.querySelector('.clausehead'));
  const slotOf = (card) => card && card.querySelector(':scope > .glabslot');
  /** the label's room: from the label's top to the first line's — what the
   *  content above gives up so the first line can stay where it was */
  function roomOf(card) {
    const slot = slotOf(card);
    if (!slot || slot.style.display === 'none') return 0;
    const l = slot.getBoundingClientRect().top;
    const h = lineTop(headOf(card));
    return h == null ? 0 : Math.max(0, h - l);
  }
  const isShell = (card) => !!(card && card.classList && card.classList.contains('gshell') && slotOf(card));

  /**
   * **Fit the card onto its paragraph** — the card's box begins where the
   * paragraph's box began, and its label stands where the paragraph's first
   * line stood. `lineOffset` is how far below its own box a paragraph of
   * this kind carries its first line (the charter: the head's own box, which
   * is the paragraph's box by construction; the band: a closed sibling's);
   * the label's own air is the card's inset, drawn inside the label's box so
   * it is part of the label's room.
   */
  function fit(card, lineOffset) {
    const slot = slotOf(card);
    if (!slot) return;
    card.style.paddingTop = Math.max(0, lineOffset).toFixed(2) + 'px';
    // **the room is a whole number of pixels**: the scroll that gives it
    // moves by whole pixels, so a fractional room would leave the first line
    // a fraction off its place on every open and twice that on a switch;
    // the label's own air below it takes up the difference
    slot.style.marginBottom = '';
    const r = roomOf(card);
    const up = Math.ceil(r - 0.01) - r;
    if (up > 0.01) slot.style.marginBottom = ((parseFloat(getComputedStyle(slot).marginBottom) || 0) + up).toFixed(2) + 'px';
  }

  /** after an open or a switch: where the label would land above the glass
   *  (under the topbar, or above the page's own top), the first line moves
   *  down by the shortfall and no further (answers Part 6.4) */
  function clearTop(card) {
    if (!isShell(card)) return 0;
    const top = slotOf(card).getBoundingClientRect().top;
    const g = glassTop();
    if (top >= g - 0.5) return 0;
    const before = scrollY;
    scrollTo(scrollX, Math.max(0, scrollY - (g - top)));
    return before - scrollY;
  }

  /**
   * **Take the room back** before a card leaves (close, or a switch across
   * strips): the label goes, and the scroll moves with it in the same frame
   * so the first line stays where it is on the glass while the content above
   * slides back down — up only by what the scroll cannot give back (6.5).
   * The collapse that follows then runs on a card that is the paragraph's
   * shape again, as every card's collapse always has.
   */
  function takeRoomBack(card) {
    if (!isShell(card)) return 0;
    const head = headOf(card);
    const slot = slotOf(card);
    const t0 = lineTop(head);
    // the label stands where the paragraph's first line stood (`fit`), so
    // that is where the first line goes: the label is taken out and the head
    // raised onto its place, and the whole difference is the room
    const labelTop = slot.getBoundingClientRect().top;
    slot.style.display = 'none';
    const ch = card.querySelector(':scope > .clausehead');
    const t1 = lineTop(head);
    if (ch && t1 != null && Math.abs(t1 - labelTop) > 0.5) ch.style.marginTop = (labelTop - t1).toFixed(2) + 'px';
    const t2 = lineTop(head);
    if (t0 == null || t2 == null) return 0;
    const d = t2 - t0;
    if (Math.abs(d) > 0.5) scrollTo(scrollX, scrollY + d);
    return d;
  }

  /**
   * **Hold one line still across a change that replaces it** — the head of
   * a card that closes into its paragraph: measured before `fn`, found again
   * after it by `after()`, and the scroll corrected by the drift.
   */
  function holdLine(beforeEl, fn, after) {
    const t0 = beforeEl ? lineTop(beforeEl) : null;
    const out = fn();
    if (t0 != null) {
      const el = after && after();
      const t1 = el ? lineTop(el) : null;
      if (t1 != null && Math.abs(t1 - t0) > 0.5) scrollTo(scrollX, scrollY + (t1 - t0));
    }
    return out;
  }

  return { cardHtml, pillHtml, rowShape, PRESENT, esc,
    fit, roomOf, clearTop, takeRoomBack, holdLine, lineTop, isShell, glassTop };
})();
