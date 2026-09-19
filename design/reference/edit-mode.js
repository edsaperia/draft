/**
 * design/edit-mode.js — the text's second mode and the strip before the
 * start (lifted out of session-view.html's inline script as refactor Q1352
 * (d), 2026-09-14).
 *
 * **The text is always a card, with two modes**, and the 📝 tab is the door
 * between them (backlog 204; SURFACE K13, K31): the door and its two handles
 * (Q1335), the riding tab and its rest line, the founder's row under
 * `#prose` before 🍾 and the column's strip (Q1313) with the caret carried
 * across the two views as a source offset, and the keystroke that enters
 * edit mode with that character applied (Q1085).
 *
 * `make(env)` is called by the page where this code stood — early, before
 * the page has reached `S`, `prose`, `ctx` or `cs` — so those four are read
 * through env's accessors at call time, and every page function arrives as
 * a wrapper the page makes. Load order: after begin.js, before the inline
 * script.
 */
window.EDIT_MODE = (function () {
  function make(env) {
    const { PAGE_COPY, SESSION } = env;
    // the drawn glyphs (Q1401): every glyph this file emits as markup is one
    // picture from the Fluent Flat set, and the sentences take glyphify
    const { glyphHtml, glyphify } = window.CARDS;
    const { amFounder, beatEl, card, closeThen, constituted, esc, focusProse, isStranger, mayPropose,
      pileHtml, proseText, render, renderToc, srcDivs, stripHtml, tabFor, textDivs } = env;
    // **The text is always a card, with two modes**, and the 📝 tab is the door
    // between them. Read mode: no caret, no row; a click in the prose beats the
    // tab and says nothing; a keystroke enters edit mode with that character
    // applied. Edit mode: the column lifts onto a card, the proposal-row sticks
    // to the foot of the window, and the caret is live. Leaving — 📝 again, or
    // opening any other card — keeps the draft (leaving is not discarding).
    //
    // The state is page-only and provisional (`S.editMode`; nothing in the
    // log). Before 🍾 the column is `#prose` and the row's ✒️ is the founder's
    // confirm; after it the column is session.js's charter and the row's commit
    // follows entry 160 (✒️ under `MAY_PEN`, ✏️ otherwise) — two columns, one
    // row helper, one tab (Q1088: the pre-🍾 half of session.js's host
    // predicate was unreachable, so the page draws the tab and the row around
    // `#prose` instead of mounting the charter early).
    const canEditText = () => !!env.cs && !isStranger() && env.S.viewer !== 'applicant' &&
      !(env.cs.closed) && (constituted() ? mayPropose() : amFounder());
    function setEditMode(on) {
      on = !!on && canEditText();
      if (env.S.editMode === on) return;
      env.S.editMode = on;
      document.getElementById('doc').classList.toggle('editing', on);
      if (constituted()) {
        // the charter re-renders read-at-call-time (`PROSE()` reads `editing`),
        // the band does not change; the tab and the row follow
        SESSION.renderAll();
        if (on) {
          const host = document.querySelector('#charter .prose');
          if (host) { try { host.focus({ preventScroll: true }); } catch (e) { host.focus(); } }
        }
      } else {
        render();
        if (on) focusProse();
      }
      renderRideTab();
      renderEditDoor();
    }
    // **The door has two handles after 🍾** (Q1335, Ed 2026-09-11: *an
    // additional way to open 📝 edit mode on a floating action button in the
    // bottom right, in the same place and size as the floating ✏️ appears in
    // edit mode*). The `edit-door` is not a control placed at a number: it is
    // **the proposal-row itself** with one button — the same `.proposalrow`
    // box on the same containing width, the same `--s2` of padding, the same
    // `.btn.glyphbtn` — wearing 📝 and the riding tab's own tooltip, so the
    // row's ✏️ takes its box to the pixel when edit mode opens and the eye sees
    // one control change role (card-audit's D1 holds them equal). Drawn in
    // read mode only, under the tab's own gate — a member who may propose, not
    // the stranger, the applicant or a closed document (C9) — and only once the
    // document has begun: before 🍾 the founder's row is `#proserow`'s.
    function renderEditDoor() {
      const ed = document.getElementById('editdoor');
      if (!ed) return;
      const show = !!env.cs && constituted() && !env.S.editMode && canEditText();
      ed.innerHTML = show
        ? '<div class="race-mid commitrow proposalrow" data-editdoor="1"><span class="rowmid"></span>' +
          '<button class="btn btn-propose glyphbtn emojibtn" data-act="edit-door" title="' +
          esc(PAGE_COPY.ride.textDash + PAGE_COPY.ride.pressToWrite) + '">' + glyphHtml('📝') + '</button></div>'
        : '';
      syncEditDoor();
    }
    // **The floating 📝 never rises above the 📝 tab** (Q1380, Ed 2026-09-15:
    // *floating 📝 button shouldn't go above the 📝 tab*). The door is stuck to
    // the window's foot; the riding tab rests beside the charter's first line
    // until that line scrolls under the navbar, and on a page whose charter
    // begins below the fold — the founder's, with the band open; any member's
    // on a long constitution — the resting tab is *lower* on the screen than
    // the door, so the second handle to the text stood above the first. The
    // door is hidden while the tab's box is below the door's top and shown
    // once the tab has risen past it; `visibility` rather than `display`, so
    // its box — D1's promise that the row's ✏️ takes it — is unchanged, and
    // the stuck row still says where the control will be. Measured, never
    // computed from offsets: both are sticky, and the rects are the truth.
    function syncEditDoor() {
      const ed = document.getElementById('editdoor');
      const door = ed && ed.querySelector('[data-act="edit-door"]');
      if (!door) return;
      const chip = document.querySelector('#ridetab .achip[data-tab="text"]');
      const below = !!chip && chip.getBoundingClientRect().bottom > door.getBoundingClientRect().top;
      ed.classList.toggle('belowtab', below);
    }
    document.addEventListener('click', (ev) => {
      const b = ev.target.closest('#editdoor [data-act="edit-door"]');
      if (!b) return;
      ev.stopPropagation();
      toggleEditMode();
    });
    // 📝 pressed: the door. With a card open the card closes into its paragraph
    // first (one card at a time, and the closing is animated); a reader who may
    // not write gets the beat and nothing else (SURFACE K31).
    function toggleEditMode() {
      if (!canEditText()) { ringTab(); return; }
      // **The door leaves in one press, editing card and all** (Q1133, Ed's QA
      // 2026-09-02). The card is inside the mode, so leaving closes it into its
      // own clause — the same act entering performs, one line down, and the
      // asymmetry is what made *leave* mean *close the card and stay*. The draft
      // is untouched: leaving is not discarding, and 🗑️ on the row is the only
      // bin (K31).
      if (env.S.editMode) { leaveEditMode(); return; }
      if (SESSION.openId != null) SESSION.closeCard();
      if (env.S.open) { closeThen(() => { env.S.open = null; setEditMode(true); }); return; }
      setEditMode(true);
    }
    // **One way out, whichever act takes it** (Q1315, Ed 2026-09-11: *clicking
    // outside of cards should close them*): 📝 again and a click on nothing
    // outside the lifted column both leave through here — the editing card
    // closed into its clause, the mode off, the draft kept in either era.
    function leaveEditMode() {
      if (SESSION.openId != null) SESSION.closeCard();
      setEditMode(false);
    }
    // **The beat**: the birth's own lift on the tab — `beatEl`, the same two
    // rises F17 gives a waiting task (Q1295, Ed 2026-09-10: *the pump that 📝
    // does should be like the pump that the title card does during the birth*).
    // It replaced a one-shot halo of its own; no copy, ever (Ed: no nudge copy).
    function ringTab() { beatEl(tabFor('text')); }
    // **The riding tab** (SURFACE K31): the text's pile — 📝 in front, the ✒️ 🛡️
    // power tabs beneath — drawn once, in `#ridetab`, a sticky child of `.doc`
    // that rests beside the charter heading and travels with the reader. Empty
    // while a power tab's card is open (the strip has the tabs then), and
    // before the save (no document, no text). It carries the draft's count
    // while one is pending, and wears the active treatment in edit mode and
    // while detached (Q1087: one treatment, one meaning — *this is the open
    // card's tab*, and in edit mode the text is the open card).
    function renderRideTab() {
      const rt = document.getElementById('ridetab');
      if (!rt) return;
      if (!env.cs || /^pw:[ua]:text$/.test(env.S.open || '')) { rt.innerHTML = ''; return; }
      const chips = isStranger() ? [card('text')] : env.ctx.chipsFor(card('text'));
      // **In edit mode the pile is the strip** (Ed's QA, 2026-08-30): the text
      // is the open card, and an open card's tabs are lined up down its side
      // with every one of them pressable — the ✒️ 🛡️ beneath 📝 are where the
      // pen on the Text is laid down, and a pile keeps them inert. `.ridein` is
      // the positioned box the pile measures from (system.css: its gutter is
      // the constitution's).
      const fanned = env.S.editMode && !isStranger();
      rt.innerHTML = '<div class="ridein">' +
        (fanned ? stripHtml(chips, Object.assign({}, env.ctx, { open: 'text' })) : pileHtml(chips, env.ctx)) + '</div>';
      const front = rt.querySelector('.achip[data-tab="text"]');
      if (front) {
        front.title = PAGE_COPY.ride.textDash + (env.S.editMode ? PAGE_COPY.ride.writing : canEditText() ? PAGE_COPY.ride.pressToWrite : PAGE_COPY.ride.readOnly);
        const rs = constituted() ? SESSION.draftRowState() : { count: 0 };
        if (rs.count) front.insertAdjacentHTML('beforeend', '<span class="ridecount" aria-hidden="true">' + rs.count + '</span>');
      }
      rt.classList.toggle('editing', !!env.S.editMode);
      // **the rest position is a measurement, not a constant** (the band's
      // gotcha about `fitBand`): the pile is lifted from the sticky box's
      // natural top — the band's bottom edge — back up to the **first line of
      // the document** (Ed's QA, 2026-08-30: beside the text, not the title),
      // so the tab rests level with the column's first line box whatever
      // margins stand between them; the sticky `top` carries the same distance
      const line = rideLine();
      if (line) {
        // the sticky box's *natural* top: measured with the stickiness off for
        // one reflow, since a stuck box reports where it is, not where it lives.
        // **Centred on the line box, not flush with it** (Q1402): a 30px tab
        // on the title's old 30px line box was centred by coincidence; the
        // title's line is 35.5px in the document's face, so the tab's own
        // height — measured, never 30 — is centred on the line's own height.
        // The lift may be negative: where the box's natural top is the
        // first line's own top (the charter), centring a 30px tab on a
        // 35.5px line moves it 2.8px *down*, which the old `Math.max(0, …)`
        // clamp swallowed.
        const tab = rt.querySelector('.achip');
        const tabH = tab ? tab.getBoundingClientRect().height : 30;
        rt.style.position = 'static';
        const up = rt.getBoundingClientRect().top - (line.top + (line.lineBox - tabH) / 2);
        rt.style.position = '';
        rt.style.setProperty('--ride-up', up.toFixed(2) + 'px');
      }
      syncRideTab();
    }
    // **the line the tab rests beside**: the first block of whichever column
    // is in use — the charter's post-🍾, `#prose` before — or, in an empty
    // column, its content top (edit mode's padding-top is paid for by a
    // negative margin, so the line is where it was and the tab does not move).
    // `lineBox` is the first line's own height: the block's computed
    // line-height, or its box where that is `normal` (Q1402).
    function rideLine() {
      const col = constituted() ? document.querySelector('#charter > .prose') : document.getElementById('prose');
      if (!col) return null;
      const first = col.firstElementChild;
      if (first) {
        const r = first.getBoundingClientRect();
        const lh = parseFloat(getComputedStyle(first).lineHeight);
        const pt = parseFloat(getComputedStyle(first).paddingTop) || 0;
        return { top: r.top + pt, bottom: r.bottom, lineBox: Number.isFinite(lh) ? lh : r.height };
      }
      const r = col.getBoundingClientRect(), pt = parseFloat(getComputedStyle(col).paddingTop) || 0;
      return { top: r.top + pt, bottom: r.top + pt + 24, lineBox: 24 };
    }
    // detached: the line the tab rests beside has scrolled out under the
    // navbar, so the tab is riding rather than resting
    function syncRideTab() {
      const rt = document.getElementById('ridetab');
      if (!rt || !rt.firstChild) return;
      const line = rideLine();
      const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 58;
      const detached = !!line && line.bottom < navH + 8;
      rt.classList.toggle('detached', detached);
      // the door follows the tab it must stay beneath (Q1380)
      syncEditDoor();
    }
    // …and the column's strip rides on the same scroll (Q1313): its ground and
    // shadow come once it has left the card's top edge
    addEventListener('scroll', () => { syncRideTab(); syncProseCtl(); syncEditDoor(); }, { passive: true });
    addEventListener('resize', syncEditDoor, { passive: true });
    // **the row before the start**: the founder's ✒️ under `#prose`, drawn by
    // session.js's helper. Live until the column matches what the server holds;
    // a never-confirmed column is always sendable (an empty text is a real
    // answer, §9.0b). Refreshed in place on input so it never re-renders the
    // column under the caret.
    const proseDirty = () => !!env.cs && (!env.cs.textConfirmed || proseText() !== String(env.cs.text || ''));
    function renderProseRow() {
      const pr = document.getElementById('proserow');
      if (!pr) return;
      const show = !!env.cs && !constituted() && env.S.editMode && amFounder();
      pr.innerHTML = show ? SESSION.proposalRowHtml({
        count: 0, pen: true, disabled: !proseDirty(),
        discardDisabled: !proseDirty(),
        discardTitle: PAGE_COPY.proseRow.discard,
        title: proseDirty() ? PAGE_COPY.proseRow.save : PAGE_COPY.proseRow.saved,
      }) : '';
    }
    function syncProseRow() {
      const pr = document.getElementById('proserow');
      const b = pr && pr.querySelector('[data-act="row-commit"]');
      if (!b) return;
      const dirty = proseDirty();
      b.disabled = !dirty;
      b.title = dirty ? PAGE_COPY.proseRow.save : PAGE_COPY.proseRow.saved;
      const bin = pr.querySelector('[data-act="row-discard"]');
      if (bin) bin.disabled = !dirty;
    }
    // ---- the column's strip before the start (Q1313) --------------------------
    // **The same strip as after 🍾** (Ed, 2026-09-11 14:08): B · I at the top
    // right of the lifted column, `laneCtlHtml` from cards.js in the
    // `.editctl` box system.css places for the charter, drawn where the row is
    // drawn — edit mode, the founder's seat, before the start — and empty
    // otherwise. **`[]` went with Q1467** (Ed, 2026-09-19): edit mode *is* the
    // source, in this column as in the charter's, and outside edit mode the
    // column is rendered (K22). So the strip and the source view are one
    // question, and the strip showing is the whole of it.
    const proseStrip = () => document.getElementById('prosectl');
    const proseStripShown = () => !!env.cs && !constituted() && env.S.editMode && amFounder();
    // the view the column should wear: source while it is being edited
    const proseWantRaw = () => proseStripShown();
    // …and the view it wears now — what every read-out asks, never the wish
    const proseIsRaw = () => env.prose.classList.contains('mdsrc');
    function renderProseCtl() {
      const pc = proseStrip();
      if (!pc) return;
      const show = proseStripShown();
      pc.className = show ? 'editctl' : '';
      // rewritten only when its state changed: `render` follows every keystroke
      if (!show) pc.innerHTML = '';
      else if (!pc.firstChild) pc.innerHTML = window.CARDS.laneCtlHtml();
      syncProseView();
      syncProseCtl();
    }
    // B and I follow the caret — live while the column holds it — and the strip
    // takes its ground and shadow once it rides: session.js's own sync, handed
    // this strip and this column's answer
    function syncProseCtl() {
      const pc = proseStrip();
      if (!pc || !pc.firstChild) return;
      SESSION.syncEditCtl(pc, document.activeElement === env.prose);
    }
    document.addEventListener('focusin', () => syncProseCtl());
    document.addEventListener('focusout', () => setTimeout(syncProseCtl, 0));
    // **Where the caret is, as an offset into the block's source** — a sentinel
    // dropped at the caret and read out of the block's markdown, so a caret
    // inside a rendered mark counts the mark's characters too; and the caret
    // put back at a source offset in whichever view the block wears
    // (`sourceToRich`, the lane's own conversion — Q1294). The block's marker
    // is the class in rendered view and text in source view, so a whole-column
    // position (`proseCaret`) counts it in and takes it off again.
    const SENTINEL = ' ';   // private use: never in anybody's text
    function sourceOffsetIn(b) {
      const sel = getSelection();
      if (!sel || !sel.rangeCount) return null;
      const r = sel.getRangeAt(0);
      if (!(b === r.endContainer || b.contains(r.endContainer))) return null;
      const mark = document.createTextNode(SENTINEL);
      const r2 = r.cloneRange(); r2.collapse(false); r2.insertNode(mark);
      const src = proseIsRaw() ? b.textContent : window.CARDS.htmlToMd(b);
      mark.remove();
      return Math.max(0, src.indexOf(SENTINEL));
    }
    function caretAtSource(b, off) {
      const n = proseIsRaw() ? off : window.CARDS.sourceToRich(window.CARDS.htmlToMd(b), off);
      const r = document.createRange();
      const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      let node, rest = n, placed = false;
      while ((node = w.nextNode())) {
        if (rest <= node.length) { r.setStart(node, rest); placed = true; break; }
        rest -= node.length;
      }
      if (!placed) r.selectNodeContents(b);
      r.collapse(placed);
      const sel = getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(r); }
    }
    const markerLen = (b) => {
      if (proseIsRaw()) return 0;
      const m = b.className.match(/lvl(\d)/);
      return m ? +m[1] + 1 : b.classList.contains('bullet') ? 2 : 0;
    };
    function proseCaret() {
      if (document.activeElement !== env.prose) return null;
      const sel = getSelection();
      if (!sel || !sel.rangeCount) return null;
      const end = sel.getRangeAt(0).endContainer;
      const blocks = [...env.prose.children];
      const b = blocks.find((x) => x === end || x.contains(end));
      if (!b) return null;
      // the block's index among the blocks a rebuild keeps (blank ones go)
      let i = 0;
      for (const x of blocks) { if (x === b) break; if (x.textContent.trim()) i++; }
      const off = sourceOffsetIn(b);
      return off == null ? null : { i, off: markerLen(b) + off };
    }
    function placeProseCaret(at) {
      const blocks = [...env.prose.children].filter((x) => x.textContent.trim());
      const b = blocks[Math.min(at.i, blocks.length - 1)];
      if (!b) return;
      try { env.prose.focus({ preventScroll: true }); } catch (e) { env.prose.focus(); }
      caretAtSource(b, Math.max(0, at.off - markerLen(b)));
    }
    // **The column in the view the strip says** (Q1313): rebuilt only when the
    // view it wears and the view wanted disagree — never on the 4s poll, never
    // under the caret for nothing — through `proseText`, the one read-out both
    // views share, so the stash, ✒️ and 🍾 see the same text whichever is
    // showing; the caret survives as a source offset.
    function syncProseView() {
      const raw = proseWantRaw();
      if (proseIsRaw() === raw) return;
      const at = proseCaret();
      const text = proseText();
      env.prose.classList.toggle('mdsrc', raw);
      env.prose.innerHTML = raw ? srcDivs(text) : textDivs(text);
      env.prose.classList.toggle('empty', env.prose.innerHTML === '');
      if (at) placeProseCaret(at);
      renderToc();
    }
    // **The strip's presses** — a prevented mousedown, so the column keeps its
    // selection (the charter's handlers do the same): B and I write the
    // markdown marks round the selection where the caret is, and take them off
    // again where it already carries them (`markSelection`, Q1467, the one act
    // both columns make). Then `relabel` redraws the marks.
    document.addEventListener('mousedown', (ev) => {
      const b = ev.target.closest('#prosectl .lfmt');
      if (!b || ev.button !== 0) return;
      ev.preventDefault(); ev.stopPropagation();
      if (b.disabled || document.activeElement !== env.prose) return;
      SESSION.markSelection(b.dataset.fmt === 'bold' ? '**' : '*',
        (n) => { const el = n.nodeType === 1 ? n : n.parentElement;
          return el && env.prose.contains(el) ? [...env.prose.children].find((c) => c === el || c.contains(el)) || null : null; });
      env.prose.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatText' }));
    });
    // **A keystroke in read mode enters edit mode with that character applied**
    // (Q1085): a read-mode column is not a keydown target — the event fires at
    // `body` — so the listener is the document's and filters by reading
    // position: nothing else focused, no card open, and the selection (if any)
    // standing in the column.
    document.addEventListener('keydown', (ev) => {
      if (!env.cs || env.S.editMode || env.S.open || SESSION.openId != null) return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.key.length !== 1) return;
      const ae = document.activeElement;
      if (ae && ae !== document.body && ae !== document.documentElement &&
        (ae.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(ae.tagName))) return;
      const sel = getSelection();
      const node = sel && sel.rangeCount ? sel.getRangeAt(0).startContainer : null;
      const el = node ? (node.nodeType === 1 ? node : node.parentElement) : null;
      const inCol = !!(el && el.closest && el.closest('#prose, #charter .prose'));
      if (!inCol && ae && ae !== document.body && ae !== document.documentElement) return;
      // **Space with no caret in the column is the reader's page-down**, not a
      // keystroke: with no caret the character lands at the end of the last
      // clause, so swallowing Space would take scrolling away from every reader
      // and open a draft they never asked for. A caret in the column means they
      // are writing, and there Space is a space like any other.
      if (ev.key === ' ' && !inCol) return;
      if (!canEditText()) return;
      // post-🍾 the character opens the editing card straight away — the card
      // is the open card, and opening it is what leaves edit mode — so the
      // column never needs to enter edit mode first; a caret on the column
      // itself is refused there, as always-on typing refuses it
      if (constituted()) { if (SESSION.typeAt(ev.key)) ev.preventDefault(); return; }
      ev.preventDefault();
      setEditMode(true);
      focusProse();
      // the character, applied at the caret by hand — `execCommand` is
      // unreliable without window focus — and announced as the input it is,
      // so the write channel and the row hear it
      const sel2 = getSelection();
      let r = sel2 && sel2.rangeCount ? sel2.getRangeAt(0) : null;
      if (!r || !env.prose.contains(r.startContainer)) {
        let last = env.prose.lastElementChild;
        if (!last) { last = document.createElement('div'); env.prose.appendChild(last); }
        r = document.createRange(); r.selectNodeContents(last); r.collapse(false);
      }
      r.deleteContents();
      const tn = document.createTextNode(ev.key);
      r.insertNode(tn); r.setStartAfter(tn); r.collapse(true);
      if (sel2) { sel2.removeAllRanges(); sel2.addRange(r); }
      env.prose.classList.remove('empty');
      env.prose.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ev.key }));
    });

    return { canEditText, setEditMode, renderEditDoor, toggleEditMode, leaveEditMode, ringTab,
      renderRideTab, syncRideTab, proseDirty, renderProseRow, syncProseRow, proseStripShown,
      proseIsRaw, renderProseCtl, syncProseCtl, proseCaret, placeProseCaret, syncProseView, sourceOffsetIn, caretAtSource };
  }
  return { make };
})();
