/* grammar.js — the prototype's one card shell (Q1541 stage 5, grammar.md §2;
   revised for grammar.md v2 after the critique).

   Every decision card on the prototype — band and charter alike — leaves
   through `GRAMMAR.card(html, state)`. The builders upstream still write their
   old markup (converting 40 kinds of body to read a `CardState` alone is
   phase two's work, grammar.md §10); this shell takes what they wrote, sorts
   every part into **the six slots in fixed order** — head, fact, body, blocks,
   input, row (§2.3) — and then decides, from the parts and the state and
   nothing else:

   - which slots are drawn at all (L1: an empty slot is not in the DOM);
   - where the hairlines go (H1: a hairline belongs to the gap between two
     drawn things, never to a slot, never at a card's top or foot);
   - which controls survive (J1/J2: a control only while it has a job; 🗑️ only
     to remove what is yours, and a withdraw says so in its word; no
     close-only OK; no act on a closed document but 🥂's signature);
   - which of the six row shapes the row is (§2.6), or no row, and the row's
     note: each dark commit's reason as text (P5 v2);
   - provenance as text in the fact line (§2.7, B1), never a pressed radio;
   - **the label slot** (§2.3a, v2): every block's label its first line, the
     head's in the card's top inset — its role, a record's outcome, or the
     card's ask;
   - **what a closed document keeps** (P4 v2): proposals, rivals and what the
     close cut off stay as labelled blocks with no control; settings rungs
     nobody may choose are not drawn (B7 v2);
   - nothing above the head in the flow (G2).

   It is a **sorter**: it recognises parts by class and by words, which is
   exactly what a `CardState` build would not need to do (§10). */
(function () {
  'use strict';
  if (!window.CARDS) throw new Error('cards.js must load before grammar.js');
  const esc = window.CARDS.esc;

  /* ---- the state the page provides -------------------------------------- */
  const P = {
    closed: () => false,         // the document has closed (phase = closed)
    phase: () => 'live',
    reader: () => 'member',
  };
  function provide(o) { Object.assign(P, o || {}); }

  /* ---- vocabulary --------------------------------------------------------- */
  // J1's list of reasons a dark control may give, each able to come true in a
  // phase other than *closed*
  const UNTIL = /^(choose|type|drip|voice-out|readiness|reconnect|flight|accept:[a-z]+)$/;
  // …and the sentence each one prints in the row's note (P5 v2: a reason is
  // text on the card, never a tooltip alone). A dark commit whose own tooltip
  // already says what to do *first* keeps those words.
  const REASON = {
    choose: 'Choose one first', type: 'Make a change first', drip: 'Your next ✏️ is on its way',
    readiness: 'Waiting for the membership to answer', 'voice-out': 'Your 🏛️ is out on another motion',
    reconnect: 'Reconnecting…', flight: 'On its way', 'accept:pen': 'Accept Founder Actions first',
    'accept:voice': 'Accept your membership first',
  };
  // the two provenance labels (T48), whether they arrive as a pressed radio or
  // as a lockline; and the lockline's own sentences, which say the same fact
  const PROV = /^(Chosen by the (Founder|membership)[^]*|Set by the founder[^]*|Decided by the members[^]*)$/i;
  // the label slot's head words for a charter card (§2.3a): one name for the
  // head's role, *Current text*, where today says it three ways
  const HEADLAB = (t) => (/still standing/i.test(t) ? 'Current text — and it is still standing' : 'Current text');
  const GLYPH = (el) => {
    const s = el.querySelector && el.querySelector('svg[data-char]');
    return s ? s.getAttribute('data-char') : '';
  };
  const textOf = (el) => {
    if (!el) return '';
    let s = '';
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) s += c.nodeValue;
        else if (c.nodeType === 1) {
          if (c.hasAttribute('hidden')) continue;
          if (c.tagName === 'svg' && c.getAttribute('data-char')) { s += c.getAttribute('data-char'); continue; }
          if (c.classList && (c.classList.contains('chipcol') || c.classList.contains('glab'))) continue;
          if (c.classList && c.classList.contains('on') && c.parentNode && c.parentNode.classList &&
            c.parentNode.classList.contains('lanepick')) continue;
          walk(c);
        }
      }
    };
    walk(el);
    return s.replace(/\s+/g, ' ').trim();
  };
  const norm = (s) => String(s || '').replace(/[“”"«»]/g, '').replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim().toLowerCase();
  const cap = (s) => String(s || '').replace(/^\s*(\S)/, (m, c) => c.toUpperCase());
  const hasCtl = (el) => !!(el.matches && el.matches('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]')) ||
    !!el.querySelector('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]');
  const isBin = (b) => GLYPH(b) === '🗑️' || /🗑/.test(b.textContent || '');
  const isWithdraw = (b) => b.hasAttribute('data-withdrawmotion') || /withdraw/i.test(b.getAttribute('data-act') || '') ||
    /withdraw|comes back|take .* back/i.test(b.getAttribute('title') || '');
  const isAck = (b) => /^(OK|Accept|Activate)/i.test(textOf(b));
  const BLOCK = '.pick, .propblock, .vinblock, .ranked, .recbox, .replaced';
  // what a block *is*: a settings rung is a control (it exists to be chosen);
  // a proposal, a rival, a record's field and what the close cut off are
  // content (B7 v2)
  const isIndiff = (blk) => blk.matches('.vinblock') ||
    [...blk.querySelectorAll('.lanepick')].some((r) => /^Indifferent$/i.test(textOf(r)) || r.getAttribute('data-motion') === 'either' ||
      r.getAttribute('data-motion') === 'abstain');
  const isContent = (blk) => blk.matches('.propblock, .ranked, .recbox, .replaced') ||
    (blk.matches('.pick') && !!blk.querySelector('.speaker'));

  const HAIR = (gap) => '<div class="ghair" data-gap="' + gap + '" aria-hidden="true"></div>';
  const LAB = (text, extra) => '<div class="glab' + (extra ? ' ' + extra : '') + '" data-slot="label" title="' + esc(text) + '">' + esc(text) + '</div>';

  /* ---- is anything on this card unsent? (J2's first half) ---------------- */
  // An input or a typed lane holding something, or a radio this reader chose
  // among blocks with no Indifferent to undo it by. Read off the live DOM by
  // the listener below and off the fragment at build time — the same test.
  // *Unsent* is measured against what the card held when it opened: a
  // Founder's own fields arrive holding what stands (K1), so a value in a box
  // is not by itself a change. The first build of a card that is not already
  // on screen records its baseline; every later build and every keystroke
  // compares with it.
  const baselines = new Map();
  function sigOf(card) {
    const parts = [];
    for (const i of card.querySelectorAll('input:not([type=hidden]), textarea, select')) {
      if (i.type === 'radio' || i.type === 'checkbox') { parts.push(i.checked || i.hasAttribute('checked') ? '1' : '0'); continue; }
      parts.push(String(i.value !== undefined && i.isConnected ? i.value : (i.getAttribute('value') || i.textContent || '')).trim());
    }
    for (const e of card.querySelectorAll('[contenteditable="true"], [contenteditable="plaintext-only"]')) parts.push((e.textContent || '').trim());
    const hasIndiff = !!card.querySelector('.vinblock, .lanepick.vin, [data-v="either"]');
    if (!hasIndiff) {
      for (const r of card.querySelectorAll('.pick .lanepick:not([disabled]), .propblock .lanepick:not([disabled])')) {
        parts.push(r.getAttribute('aria-checked') === 'true' || r.getAttribute('aria-pressed') === 'true' ? 'p' : '-');
      }
    }
    return parts.join('\u0001');
  }
  const keyOf = (el) => el.getAttribute('data-setupcard') || el.getAttribute('data-card') || '';
  function dirty(card) {
    const k = keyOf(card);
    // a choice already made among blocks with no Indifferent is unsent
    // whatever the baseline says (a Founder's pick carried across renders)
    const hasIndiff = !!card.querySelector('.vinblock, .lanepick.vin, [data-v="either"]');
    if (!hasIndiff && card.querySelector('.gblocks .lanepick[aria-checked="true"]:not([disabled]), .gblocks .lanepick[aria-pressed="true"]:not([disabled])')) return true;
    const s = sigOf(card);
    if (!baselines.has(k)) return false;
    return baselines.get(k) !== s;
  }
  function baseline(card) {
    const k = keyOf(card);
    const onScreen = k && document.querySelector('.gcard[data-setupcard="' + CSS.escape(k) + '"], .gcard[data-card="' + CSS.escape(k) + '"]');
    if (!onScreen || !baselines.has(k)) baselines.set(k, sigOf(card));
  }

  /* ---- the classifier: an old card's parts, sorted into slots ------------- */
  function sort(root, st) {
    const out = { head: null, lane: null, fact: [], body: [], blocks: [], input: [], rowL: [], rowNote: [], rowR: [],
      dropped: [], provenance: null, headLabel: null, recLabel: null, nav: null, replaced: false };
    const head = root.querySelector(':scope > .clausehead');
    out.head = head;
    if (head) {
      // G2: nothing above the head in the flow. The charter's eyebrow — *The
      // clause as it stands*, *The gap as it stands* — becomes the head label
      // (§2.3a v2), which stands in the card's top inset and moves nothing
      const lab = head.querySelector(':scope > .headlab');
      if (lab) { out.headLabel = HEADLAB(textOf(lab)); out.dropped.push('eyebrow → head label'); lab.remove(); }
      const lane = head.querySelector(':scope > .lanebar');
      if (lane) out.lane = lane;
      // a title drawn as the head (🌂's *Leave the Membership*, 🎩's ask) is
      // the card's ask: it moves to the label slot
      const ht = head.querySelector('.headtitle');
      if (ht && textOf(ht)) { out.askFromTitle = textOf(ht); ht.remove(); }
      // the band's settled head drawn as a block, provenance radio and all
      // (Q1167 a, CP2): the rule stays as the head's text, the radio's label
      // becomes the fact line (B1)
      head.querySelectorAll('.headrule .lanepick[disabled], .headrule .lanepick[aria-pressed="true"]').forEach((r) => {
        const t = textOf(r);
        if (PROV.test(t)) { out.provenance = out.provenance || t; r.remove(); }
      });
    }
    let pending = null;              // a field's label, waiting for what it names
    const takeLabel = (el) => { if (pending && !el.hasAttribute('data-glabel')) el.setAttribute('data-glabel', pending.text); if (pending && !pending.all) pending = null; };
    const addField = (f) => {
      const outer = pending;
      for (const ch of [...f.children]) place(ch, true);
      pending = outer;
    };
    const place = (el, inField) => {
      const cl = el.classList;
      if (!cl) return;
      // a reason for what stands is spoken under the head (§2.2)
      if (cl.contains('gheadspk') && head) { [...el.children].forEach((k) => head.appendChild(k)); return; }
      // a body that already knows its head and its fact hands them over
      if (cl.contains('gheadtext') && head) {
        const rt = head.querySelector('.headclause > .rtext');
        if (rt) { rt.innerHTML = el.innerHTML; rt.classList.add('gplace'); }
        return;
      }
      if (cl.contains('gfactsrc')) { out.fact.push(el); out.factIsOutcome = true; return; }
      // a record's outcome, for the head label (§2.3a: first, in its colour)
      if (cl.contains('glabsrc')) { out.recLabel = { text: textOf(el), tone: el.getAttribute('data-tone') || '' }; return; }
      if (cl.contains('fieldlab')) {
        // §2.3a: a label naming what a block is (*Proposed*, *What you
        // proposed*) is each block's first line; the count after it
        // (*8 proposals, oldest first*) is a note about the field
        const t = textOf(el).replace(/^✏️\s*/, '');
        const parts = t.split(' · ');
        const role = /everything in flight/i.test(parts[0]) ? 'Proposed' : cap(parts[0]);
        pending = { text: role, all: /^(Proposed|What you proposed)$/.test(role) };
        // (two rivals need no count — the foot already says *neither of these*)
        if (parts.length > 1 && +((parts[1].match(/\d+/) || ['0'])[0]) > 2) {
          const n = document.createElement('p'); n.className = 'gfieldnote'; n.textContent = cap(parts.slice(1).join(' · ')) + '.';
          out.body.push(n);
        }
        return;
      }
      if (cl.contains('rechead')) {
        // a record's dateline row, *Decided · 7/14👤* over *Tuesday, 29
        // September, 20:15*: its word and its moment are the head label (Q1522
        // kept, B4 v2); its count is the participation line's, said in words
        const kids = [...el.children].map(textOf).filter(Boolean);
        const word = (kids[0] || '').split(' · ')[0];
        out.recLabel = { text: [word].concat(kids.slice(1)).filter(Boolean).join(' · '),
          tone: root.classList.contains('recpass') ? 'ok' : '' };
        return;
      }
      if (cl.contains('rsub') && !inField) { out.fact.push(el); return; }
      if (cl.contains('statline') || cl.contains('lockline')) {
        // B11: the value is the head; who chose it is the fact line
        const t = textOf(el);
        if (cl.contains('lockline') && t) out.provenanceLine = out.provenanceLine || t;
        out.dropped.push(cl.contains('statline') ? 'Set to line' : 'lockline');
        return;
      }
      if (cl.contains('commitrow') || cl.contains('race-mid')) { sortRow(el, out); return; }
      if (cl.contains('pnav')) {
        // the patch's navigator: its place in the head label (§2.3a, amber 9)
        out.nav = el; return;
      }
      if (cl.contains('field') || cl.contains('body')) { addField(el); return; }
      if (cl.contains('choice')) {
        // a radiogroup of blocks: kept as one container, its picks the blocks
        if (el.querySelector(BLOCK)) { out.blocks.push(el); return; }
        out.body.push(el); return;
      }
      if (cl.contains('replaced')) {
        // ↻: the wording this reader voted on, since changed — a labelled
        // block, never a pressed radio on the clause that replaced it (P7 v2)
        const tag = el.querySelector(':scope > .rtag');
        if (tag) { el.setAttribute('data-glabel', textOf(tag.cloneNode(true)).replace(/\s*(the clause changed)/i, ' — $1')); tag.remove(); }
        out.replaced = true;
        out.blocks.push(el); return;
      }
      if (el.matches(BLOCK)) {
        // the deadlock's desk: an editable lane is an input, not a block —
        // labelled by its field's heading, its reason waiting for a change
        if (el.matches('.propblock') && el.querySelector('.editlane, [data-deadlane]')) {
          takeLabel(el);
          el.querySelectorAll('.speaker').forEach((s) => { if (s.querySelector('.edit-why')) { s.setAttribute('data-gwait', 'dirty'); s.setAttribute('hidden', ''); } });
          out.input.push({ el }); return;
        }
        if (el.matches('.ranked')) {
          // a record's field: its share and its role in the label slot
          const tag = el.querySelector(':scope > .rtag');
          const t = tag ? textOf(tag) : '';
          const pct = (t.match(/\d+%/) || [''])[0];
          const lab = el.classList.contains('wasthere') || /previous/i.test(t) ? 'Previous text' + (pct ? ' · ' + pct : '')
            : /stands/i.test(t) ? cap(t) : 'Rival' + (pct ? ' · ' + pct : '');
          el.setAttribute('data-glabel', lab);
          if (tag) tag.remove();
        }
        if (el.matches('.recbox')) {
          const g = el.querySelector(':scope > .glabel, :scope > .fieldlab');
          if (g) { if (!el.hasAttribute('data-glabel')) el.setAttribute('data-glabel', textOf(g)); g.remove(); }
        }
        if (el.matches('.propblock')) takeLabel(el);
        out.blocks.push(el); return;
      }
      if (cl.contains('whylane') || el.querySelector('.whylane')) { out.input.push({ el, why: true }); return; }
      if (cl.contains('foot') && cl.contains('refusal')) { out.rowNote.push(el); return; }
      // a note about the act is the row's (*One vote for all 3 places*, *OK
      // signs the document*), a note about a field stays with the field
      if ((cl.contains('foot') || cl.contains('setnote')) && (cl.contains('grownote') || /^(one vote for all|OK\b)/i.test(textOf(el)))) { out.rowNote.push(el); return; }
      // a reason spoken after a block is that block's (§2.2: *why* is under
      // the speaker of what it argues for — the 👑 card's, amber 24, 25)
      if (cl.contains('speaker') && el.previousElementSibling && out.blocks.includes(el.previousElementSibling)) {
        const blk = el.previousElementSibling;
        const radio = blk.querySelector(':scope > .lanepick, :scope > .lanebar');
        if (radio) radio.before(el); else blk.appendChild(el);
        return;
      }
      // …and a note straight after a field explains the field (📍's *Previous
      // links still work.* — amber 14): it stays with its input
      if (cl.contains('setnote') && el.previousElementSibling && hasCtl(el.previousElementSibling)) {
        const prev = el.previousElementSibling;
        if (out.blocks.includes(prev)) {
          const pk = [...prev.querySelectorAll('.pick, .propblock')].reverse().find((x) => hasCtl(x)) || prev;
          const bar = pk.querySelector(':scope > .lanepick, :scope > .lanebar');
          if (bar) bar.before(el); else pk.appendChild(el);
          return;
        }
        if (out.input.length) { out.input[out.input.length - 1].after = el; return; }
      }
      if (cl.contains('srationale') && cl.contains('locked')) {
        // ↻'s account of a vote about a wording that has gone: a fact about
        // the past, so text (P7 v2) — the body's
        out.body.push(el); return;
      }
      if (cl.contains('pnav') || cl.contains('foot') || cl.contains('srationale') || cl.contains('setnote') ||
        cl.contains('why') || cl.contains('unlocks') || cl.contains('memrow') || cl.contains('readiness')) {
        if (hasCtl(el)) { takeLabel(el); out.input.push({ el }); return; }
        takeLabel(el); out.body.push(el); return;
      }
      if (hasCtl(el)) { takeLabel(el); out.input.push({ el }); return; }
      if (el.tagName === 'SPAN' && !textOf(el) && !el.querySelector('button,svg,img')) { out.dropped.push('spacer'); return; }
      if (!textOf(el) && !el.querySelector('button, svg, img, .av')) { out.dropped.push('empty ' + el.className); return; }
      // an eyebrow with nothing under it names nothing (🍾's *The questions*
      // over an empty list — amber 32)
      if (el.matches('.eyebrow, .fieldlab') && !(el.nextElementSibling && textOf(el.nextElementSibling))) { out.dropped.push('eyebrow over nothing'); return; }
      takeLabel(el);
      out.body.push(el);
    };
    let afterHead = false;
    for (const ch of [...root.children]) {
      if (ch === head) { afterHead = true; continue; }
      // a record's winner is the head, so its speaker is the head's (§2.3):
      // drawn inside it, never as a body of its own
      if (afterHead && head && ch.classList.contains('speaker')) { head.appendChild(ch); continue; }
      // the rsub straight after a record's head says *changed again since* —
      // a fact about the record, in the fact line
      if (afterHead && ch.classList.contains('rsub')) { out.fact.push(ch); continue; }
      afterHead = false;
      place(ch, false);
    }
    // the participation line of a record stands after the head's speaker
    // (§6.3): it was drawn above the head; the fact slot is its home
    return out;
  }

  function sortRow(row, out) {
    for (const b of [...row.querySelectorAll('button, .rowcount, .absnote, .wcount, .ctlnote')]) {
      if (b.tagName !== 'BUTTON') { out.rowNote.push(b); continue; }
      if (isBin(b)) { out.rowL.push(b); continue; }
      out.rowR.push(b);
    }
  }

  /* ---- the rules that decide what survives -------------------------------- */
  function judge(o, root, st) {
    const closed = st.closed;
    // The row: J1, J2, B5, B6
    const keepR = [];
    for (const b of o.rowR) {
      const word = textOf(b);
      if (b.hasAttribute('data-close')) { o.dropped.push('close-only OK'); continue; }          // B6
      if (closed && !b.hasAttribute('data-sign')) { o.dropped.push('closed: ' + (word || GLYPH(b))); continue; } // P4
      // O3 (a), built in v2: one acknowledgement word per meaning
      if (/^Activate\b/.test(word)) {
        for (const n of b.childNodes) if (n.nodeType === 3 && /Activate/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/Activate\s*/, 'Accept ');
      }
      if (b.disabled || b.hasAttribute('disabled')) {
        if (closed) { o.dropped.push('closed: dark ' + (word || GLYPH(b))); continue; }
        if (!b.getAttribute('data-until')) b.setAttribute('data-until', untilOf(b, root));
      }
      keepR.push(b);
    }
    o.rowR = keepR;
    const keepL = [];
    for (const b of o.rowL) {
      if (closed) { o.dropped.push('closed: 🗑️'); continue; }
      if (isWithdraw(b)) {
        // J2 v2: a withdraw is irreversible, and a bare bin read as *skip*
        // (Q1500), so it carries its word
        b.setAttribute('data-gbin', 'withdraw');
        if (!b.querySelector('.gword')) b.insertAdjacentHTML('beforeend', '<span class="gword">Withdraw</span>');
        keepL.push(b); continue;
      }
      // a discard: drawn only while there is something unsent (J2) — the
      // listener shows and hides it as the card is typed into
      if (couldHold(root, o)) {
        b.setAttribute('data-gbin', 'discard');
        b.setAttribute('data-gwait', 'dirty');
        if (!st.dirty) b.setAttribute('hidden', '');
        keepL.push(b);
      } else o.dropped.push('🗑️ with nothing to remove');
    }
    o.rowL = keepL;

    // ↻ (P7 v2): a vote about a wording that has since changed is not a
    // pressed *Preferred* on the clause that replaced it, and the ✓ that
    // recorded it is not pressed either — the reader may vote on this pair
    if (o.replaced) {
      if (o.lane) o.lane.querySelectorAll('.lanepick[aria-checked="true"]').forEach((r) => r.setAttribute('aria-checked', 'false'));
      o.rowR.forEach((b) => { if (b.getAttribute('aria-pressed') === 'true' && !isAck(b)) {
        b.setAttribute('aria-pressed', 'false'); b.setAttribute('disabled', ''); b.setAttribute('data-until', 'choose'); } });
      o.dropped.push('vote on a vanished wording → a fact, not a pressed radio');
    }

    const headRt = o.head && o.head.querySelector('.headclause > .rtext');
    // at the birth the title is being written where it will stand, so the
    // lane it is written in is the head (the place, in the making)
    if (headRt && !textOf(headRt)) {
      const i = o.input.findIndex((x) => x.el.querySelector && x.el.querySelector('.titlelane'));
      if (i >= 0) { headRt.appendChild(o.input[i].el); headRt.classList.add('gplace'); o.input.splice(i, 1); o.dropped.push('title lane → head'); }
    }
    // a head with nothing in it is not a head (L1): where the old card left
    // its head empty and drew what stands as a chosen block (🎩 locked, the
    // Founder's own answer), the chosen block's words are the head
    if (headRt && !textOf(headRt) && !headRt.querySelector('.titlelane')) {
      for (const b of o.blocks) {
        const chosen = b.matches('.pick.on') ? b : b.querySelector && b.querySelector('.pick.on');
        if (!chosen) continue;
        const words = chosen.querySelector('.opttext');
        if (!words) continue;
        headRt.innerHTML = '<p class="cpv">' + words.innerHTML + '</p>';
        headRt.classList.add('gplace');
        chosen.remove();
        o.dropped.push('chosen block → head');
        break;
      }
    }
    // …and a card with no line to stand in for is placeless (§2.3 row 1):
    // it heads with its own name, the tab's (`labelOf`), never with nothing
    if (headRt && !textOf(headRt) && !headRt.querySelector('.titlelane, input, [contenteditable]')) {
      const nm = o.head.querySelector('.achip.wmark .sr') || o.head.querySelector('.achip .sr');
      if (nm && textOf(nm)) {
        headRt.innerHTML = '<p class="gtitle">' + esc(textOf(nm)) + '</p>';
        o.dropped.push('placeless: name → head');
      }
    }
    // P4 v2's tense: a head is true in the card's phase — a power clause on
    // a closed document is in the past (B8 v2)
    // (only a power card: a rule's own words — *Any member may bring any
    // worry…* — are the document's, and are never rewritten)
    if (closed && o.head && st.isPower) tensePast(o.head);
    const headText = norm(textOf(o.head && o.head.querySelector('.rtext, .headrule')));
    const anyAct = o.rowR.length > 0 || o.rowL.length > 0;
    const keptBlocks = [];
    // J1: a radio has a job only where a commit can send the choice — the
    // mover's own motion card (withdraw alone), a news card (OK alone) and
    // a read-only card draw no radios and no Indifferent (§6.4's mover)
    // (a patch's one judgment is sent from the floating row, Q1382, so its
    // site cards keep their lanes though they carry no row of their own)
    const choiceAct = !closed && (o.rowR.some((b) => !isAck(b)) || root.matches('.patch-open'));
    const withdrawing = o.rowL.some((b) => b.getAttribute('data-gbin') === 'withdraw');
    const stripCtls = (blk) => {
      blk.querySelectorAll('.lanebar').forEach((bar) => bar.remove());
      blk.querySelectorAll('.lanepick, .lanepropose').forEach((r) => r.remove());
    };
    const visitBlock = (blk) => {
      if (!choiceAct) {
        // **B7 v2 — what a reader who cannot choose sees.** No Indifferent;
        // no settings rung (a rung is a control, and nobody may press it);
        // but every proposal, rival and record block stays, labelled, with
        // no control (P4 v2: a closed document keeps what it recorded)
        if (isIndiff(blk)) { o.dropped.push('Indifferent with nothing to send'); return null; }
        if (!isContent(blk)) {
          const t0 = norm(textOf(blk.querySelector('.opttext, .rtext') || blk));
          if (blk.querySelector('input, textarea, [contenteditable]') && !closed) return blk;
          o.dropped.push(t0 && headText && (t0 === headText || headText.includes(t0)) ? 'the head again, no act' : 'rung nobody may choose');
          return null;
        }
        // a motion's first pick restating the rule that stands is the head
        const t1 = norm(textOf(blk.querySelector('.opttext, .rtext') || blk));
        if (blk.matches('.pick') && t1 && headText && t1 === headText) { o.dropped.push('the head again, no act'); return null; }
        const pr = [...blk.querySelectorAll('.lanepick')].find((r) => PROV.test(textOf(r)));
        if (pr && !blk.hasAttribute('data-glabel')) blk.setAttribute('data-glabel', textOf(pr));
        stripCtls(blk);
        if (!blk.hasAttribute('data-glabel')) {
          blk.setAttribute('data-glabel', withdrawing ? 'What you proposed' : 'Proposed');
        }
        if (closed && !blk.matches('.ranked, .recbox, .replaced')) o.cutOff = true;
        return blk;
      }
      const radios = [...blk.querySelectorAll('.lanepick')];
      let prov = null;
      radios.forEach((r) => { const t = textOf(r);
        if ((r.disabled || r.hasAttribute('disabled')) && PROV.test(t)) { prov = t; r.remove(); } });
      if (prov) {
        const t = norm(textOf(blk.querySelector('.opttext, .rtext') || blk));
        if (t && headText && (t === headText || headText.includes(t) || t.includes(headText))) {
          o.provenance = o.provenance || prov; o.dropped.push('standing block (the head again)'); return null;
        }
        // a proposal the membership has chosen, awaiting the Founder (👑):
        // its provenance is its label
        blk.setAttribute('data-glabel', prov);
      }
      // a block with no radio at all that says what the head says is the
      // head again (👑's standing rule — amber 24)
      if (!radios.length && !prov) {
        const t2 = norm(textOf(blk.querySelector('.opttext, .rtext') || blk));
        if (t2 && headText && t2 === headText) { o.dropped.push('the head again'); return null; }
      }
      const live = radios.filter((r) => blk.contains(r) && !(r.disabled || r.hasAttribute('disabled')));
      const dead = radios.filter((r) => (r.disabled || r.hasAttribute('disabled')) && blk.contains(r));
      // K4 made general: what stands is the head, so a block restating it is
      // not offered back — even where the old card drew it pressed (✋ 🖼️
      // 📧's *current* block). Pressing the commit on it would send what
      // already stands, so that commit has no job until something else is
      // chosen.
      if (!prov && live.length && !blk.querySelector('input, textarea, [contenteditable]')) {
        const t = norm(textOf(blk.querySelector('.opttext, .rtext') || blk));
        const pressed = live.some((r) => r.getAttribute('aria-checked') === 'true' || r.getAttribute('aria-pressed') === 'true');
        const same = t && t.length > 2 && headText && (t === headText || headText.includes(t));
        if (pressed && same && !blk.closest('.choice.gpeer') && !isPeerCard(o)) {
          o.standingPressed = true; o.dropped.push('standing block, pressed (the head again)'); return null;
        }
        // …and where what stands is itself one of the answers (Q1362's peer:
        // the consent and ordinary motion cards), the head carries its lane
        // (§2.3, §6.4) — the block that restated it gives its radio to the
        // head and goes
        if (same && o.head && !o.lane) {
          const bar = document.createElement('div'); bar.className = 'lanebar ghlane';
          live.forEach((r) => bar.appendChild(r));
          o.head.appendChild(bar); o.lane = bar;
          o.peer = true;
          o.dropped.push('standing block → the head\'s lane'); return null;
        }
      }
      if (dead.length && live.length === 0 && !blk.matches('.ranked, .recbox')) {
        // CP11's greyed radio on a live card: a rung nobody may press is not
        // drawn (B7 v2); a proposal keeps its words and its label, no radio
        if (!isContent(blk)) { o.dropped.push('rung nobody may choose'); return null; }
        stripCtls(blk);
      }
      // §2.3a: a proposal is labelled — *Proposed* by default, the field's own
      // word where it had one (*What you proposed*)
      // (a block that is a two-state choice with its own radio — a power
      // card's other half — is labelled by its radio's words, CP1)
      if (isContent(blk) && !blk.hasAttribute('data-glabel') && (!blk.querySelector('.lanepick:not([disabled])') || blk.querySelector('.speaker'))) {
        blk.setAttribute('data-glabel', withdrawing ? 'What you proposed' : 'Proposed');
      }
      return blk;
    };
    for (const b of o.blocks) {
      if (b.matches('.choice')) {
        [...b.querySelectorAll(':scope > ' + BLOCK.split(', ').join(', :scope > '))].forEach((p) => { if (!visitBlock(p)) p.remove(); });
        if (b.querySelector(BLOCK)) keptBlocks.push(b);
      } else {
        const v = visitBlock(b);
        if (v) keptBlocks.push(v);
      }
    }
    o.blocks = keptBlocks;
    if (o.standingPressed) {
      o.rowR.forEach((b) => {
        if (isAck(b)) return;
        b.setAttribute('disabled', ''); b.setAttribute('data-until', 'choose');
      });
    }
    // the head's own lane dies with the card's acts too
    if (o.lane && (closed || !anyAct)) {
      const r = o.lane.querySelector('.lanepick');
      if (r && (closed || r.disabled || r.hasAttribute('disabled') || !choiceAct)) { o.lane.remove(); o.lane = null; }
    }
    // closed: inputs go (nothing can be sent), and so does the rationale lane
    if (closed) {
      const signing = o.rowR.some((b) => b.hasAttribute('data-sign'));
      o.input = o.input.filter((x) => { if (signing || (x.el.querySelector && x.el.querySelector('[data-sign], [data-signwhy]'))) return true;
        o.dropped.push('closed: input'); return false; });
      // …and no control anywhere on the card but its tabs and 🥂's signature
      // (P4): the ✏️ *propose edit* on a lane, a stepper, a toggle
      const strays = [o.head, ...o.body, ...o.blocks].filter(Boolean)
        .flatMap((e) => [...e.querySelectorAll('button, [role="button"], input, select')])
        .filter((b) => !b.closest('.chipcol') && !b.hasAttribute('data-sign'));
      strays.forEach((b) => { const bar = b.closest('.lanebar'); if (bar && !bar.querySelector('.glab')) bar.remove(); else b.remove(); });
      if (strays.length) o.dropped.push('closed: ' + strays.length + ' stray control(s)');
    }
    // an eyebrow with nothing under it names nothing, however deep it stands
    // (🍾's *The questions* over an empty list — amber 32; L1 inside a body)
    [...o.body, ...o.input.map((x) => x.el)].forEach((e) => e.querySelectorAll('.eyebrow, .fieldlab').forEach((eb) => {
      let nx = eb.nextElementSibling;
      while (nx && !textOf(nx) && !nx.querySelector('button, input, img, .av')) nx = nx.nextElementSibling;
      if (!nx || nx.matches('.eyebrow, .fieldlab')) { o.dropped.push('eyebrow over nothing: ' + textOf(eb)); eb.remove(); }
    }));
    // a note about the field goes with the field
    if (!o.blocks.length) o.body = o.body.filter((e) => !e.classList.contains('gfieldnote'));
    // B12 made general: a body line restating a moment the head already
    // states (🥂's *final as of 01:51* under *closed at 01:51*) is the same
    // fact twice (F1)
    const headTxt = textOf(o.head);
    const times = headTxt.match(/\b\d\d:\d\d\b/g) || [];
    o.body = o.body.filter((e) => {
      const t = textOf(e);
      if (times.length && e.matches('.unlocks, .setnote') && times.some((x) => t.includes(x)) && t.length < 80) {
        o.dropped.push('moment stated twice: ' + t); return false;
      }
      return true;
    });
    // B13: the rationale lane rides a change
    o.input.forEach((x) => { if (x.why) { x.el.setAttribute('data-gwait', 'dirty'); if (!st.dirty) x.el.setAttribute('hidden', ''); } });
    // J1 / critique 8: a commit whose act would change nothing is not lit —
    // ✉️'s ✒️ over an empty address box waits for an address like its 🏛️
    const boxes = [...root.querySelectorAll('textarea[data-emails], input.addr, input[type="email"]')];
    if (!closed && boxes.length && boxes.every((i) => !(i.value || i.textContent || '').trim())) {
      o.rowR.forEach((b) => { if (isAck(b) || b.disabled || b.hasAttribute('disabled')) return;
        b.setAttribute('disabled', ''); b.setAttribute('data-until', 'type'); b.setAttribute('data-gtype', '1'); });
    }
    // P4 v2: what the close cut off says so (a fact about the record)
    if (o.cutOff && !o.fact.length) {
      const f = document.createElement('p'); f.className = 'gcutoff'; f.textContent = 'Undecided when the document closed';
      o.fact.push(f); o.factIsOutcome = true;
    }
  }

  // "The Founder may X" → "Until the document closed, the Founder could X"
  function tensePast(head) {
    const w = document.createTreeWalker(head, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.parentElement && n.parentElement.closest('.chipcol')) continue;
      n.nodeValue = n.nodeValue
        .replace(/\bThe Founder \(that’s you!\) may not\b/g, 'The Founder could not')
        .replace(/\bThe Founder \(that’s you!\) may\b/g, 'Until the document closed, the Founder could')
        .replace(/\bThe Founder may not\b/g, 'The Founder could not')
        .replace(/\bThe Founder may\b/g, 'Until the document closed, the Founder could');
    }
    // a bold *not* in a power's other half reads through the same rewrite
    head.querySelectorAll('b').forEach((b) => {
      if (/^not$/i.test(b.textContent) && /\bmay\s*$/.test((b.previousSibling && b.previousSibling.nodeValue) || '')) {
        b.previousSibling.nodeValue = b.previousSibling.nodeValue.replace(/\bmay\s*$/, 'could ');
      }
    });
  }

  // a card whose answers include Indifferent is a judgment among peers, so
  // what stands is one of its answers rather than the head restated
  const isPeerCard = (o) => o.blocks.some((b) => b.matches('.vinblock') ||
    !!(b.querySelector && b.querySelector('.vinblock, .lanepick.vin, [data-v="either"]')) ||
    [...(b.querySelectorAll ? b.querySelectorAll('.lanepick') : [])].some((r) => /^Indifferent$/i.test(textOf(r))));
  function couldHold(root, o) {
    if (root.querySelector('input:not([type=hidden]), textarea, [contenteditable="true"], [contenteditable="plaintext-only"]')) return true;
    const hasIndiff = !!root.querySelector('.vinblock, .lanepick.vin, [data-v="either"]');
    return !hasIndiff && !!root.querySelector('.pick .lanepick:not([disabled]), .propblock .lanepick:not([disabled])');
  }

  function untilOf(b, root) {
    const t = (b.getAttribute('title') || '') + ' ' + textOf(b);
    if (b.hasAttribute('data-begin') || b.closest('.begintable, .readiness')) return 'readiness';
    if (b.classList.contains('grantok')) return 'readiness';
    if (/\d\d:\d\d|next ✏️|✏️ in/i.test(t)) return 'drip';
    if (/accept/i.test(t)) return 'accept:pen';
    if (/reconnect/i.test(t)) return 'reconnect';
    if (root.querySelector('input:not([type=hidden]), textarea, [contenteditable="true"], [contenteditable="plaintext-only"]') &&
      !root.querySelector('.lanepick:not([disabled])')) return 'type';
    return 'choose';
  }
  // the words a dark commit's reason prints (P5 v2)
  function reasonOf(b, root) {
    const title = (b.getAttribute('title') || '').trim();
    if (/\bfirst\b\.?$/i.test(title)) return title.replace(/\.$/, '');
    const u = b.getAttribute('data-until') || untilOf(b, root);
    if (u === 'type' && root.querySelector('textarea[data-emails], input.addr, input[type="email"]')) return 'Type an address first';
    if (u === 'drip') return title || REASON.drip;
    return REASON[u] || REASON.choose;
  }

  /* ---- the shapes (§2.6) --------------------------------------------------- */
  function shapeOf(L, R) {
    const words = R.map((b) => textOf(b));
    if (!L.length && !R.length) return 'absent';
    if (L.length && !R.length) return L.every((b) => b.getAttribute('data-gbin') === 'withdraw') ? 'withdraw' : 'commit';
    if (R.length === 1 && /^OK$/i.test(words[0])) return L.length ? 'odd' : 'acknowledge';
    if (R.length === 1 && /^(Accept|Activate)/i.test(words[0])) return L.length ? 'odd' : 'accept';
    if (R.length === 1) return 'commit';
    if (R.length === 2) return 'pair';
    return 'odd';
  }
  // the note slot's reasons: one line per distinct reason, glyph first when
  // two dark commits wait on different things (P8 v2)
  function reasonsHtml(R, root) {
    const dark = R.filter((b) => (b.disabled || b.hasAttribute('disabled')) && !isAck(b));
    if (!dark.length) return '';
    const by = new Map();
    dark.forEach((b) => { const r = reasonOf(b, root); if (!by.has(r)) by.set(r, []); by.get(r).push(GLYPH(b) || (b.querySelector('svg.mkg') ? '✓' : textOf(b))); });
    const many = by.size > 1;
    return [...by.entries()].map(([r, gs]) => '<span class="greason" data-greason="1">' +
      (many ? esc(gs.join(' ')) + ' ' : '') + esc(r) + '</span>').join('');
  }

  /* ---- the one shell -------------------------------------------------------- */
  function assemble(root, o, st) {
    const parts = [];   // [slotName, html]
    // HEAD LABEL (§2.3a): the card's ask, a record's outcome, or the head's
    // role wherever the card draws a block — in the top inset, moving nothing
    const ask = st.ask || o.askFromTitle || null;
    let lab = null;
    if (ask) lab = { text: ask, tone: 'ask' };
    else if (o.recLabel && o.recLabel.text) lab = o.recLabel;
    else if (o.blocks.length || o.nav) lab = { text: o.headLabel || (st.surface === 'charter' ? 'Current text' : 'Current rule') };
    // HEAD — the anchor's own rendering, the strip hanging off its first line
    if (o.head) {
      o.head.setAttribute('data-slot', 'head');
      o.head.setAttribute('data-fact', 'place');
      if (lab) {
        const d = document.createElement('div');
        d.innerHTML = LAB(lab.text, 'ghlab' + (lab.tone ? ' gtone-' + lab.tone : ''));
        const el = d.firstChild;
        if (o.nav) {
          // the patch's place: *Current text · § The Purse-holder's Office ·
          // place 3 of 3* with its ↑ ↓, one line (amber 9)
          const where = o.nav.querySelector('.pwhere');
          if (where) el.textContent = lab.text + ' · ' + textOf(where);
          const steps = o.nav.querySelector('.psteps');
          if (steps) el.appendChild(steps);
        }
        o.head.prepend(el);
      }
    }
    // FACT — provenance or outcome, one line (§2.7)
    const factBits = [];
    o.fact.forEach((el) => { const t = textOf(el); if (t) factBits.push(t); });
    const prov = o.factIsOutcome ? null : (st.provenance || o.provenance || (o.provenanceLine && provFromLock(o.provenanceLine)));
    if (prov && !st.noFact) factBits.unshift(prov + (st.when ? ' · ' + st.when : ''));
    const factHtml = factBits.length
      ? (() => { const fx = esc(dedupe(factBits).join(' · '));
        return '<p class="gfact" data-slot="fact" data-fact="' + (o.fact.length ? 'outcome' : 'provenance') + '">' +
          (window.CARDS.glyphify ? window.CARDS.glyphify(fx) : fx) + '</p>'; })() : '';
    // where the head has a lane and a fact, the fact reads with the head's
    // words and the lane closes the head's group (§2.3 row 2, v2)
    let laneOut = null;
    if (o.head && o.lane && factHtml && o.head.contains(o.lane)) { laneOut = o.lane; o.lane.remove(); laneOut.setAttribute('data-slot', 'lane'); }
    if (o.head) parts.push(['head', o.head.outerHTML]);
    if (factHtml) parts.push(['fact', factHtml]);
    if (laneOut) parts.push(['lane', laneOut.outerHTML]);
    // BODY
    const bodyHtml = o.body.map((e) => labelBefore(e) + e.outerHTML).join('');
    if (bodyHtml && textOf(wrap(bodyHtml))) parts.push(['body', '<div class="gbody" data-slot="body">' + bodyHtml + '</div>']);
    // BLOCKS — a hairline between every two (H1), each block's label its
    // first line (§2.3a)
    if (o.blocks.length) {
      const inner = [];
      o.blocks.forEach((b, i) => {
        if (b.matches('.choice')) {
          const kids = [...b.children].filter((k) => k.matches(BLOCK));
          kids.forEach((k, j) => { if (j) k.before(hairEl('block')); labelIn(k); });
          if (i) inner.push(HAIR('block'));
          inner.push(b.outerHTML);
        } else {
          labelIn(b);
          if (i) inner.push(HAIR('block'));
          inner.push(b.outerHTML);
        }
      });
      parts.push(['blocks', '<div class="field gblocks" data-slot="blocks">' + inner.join('') + '</div>']);
    }
    // INPUT
    if (o.input.length) {
      const allWait = o.input.every((x) => x.el.hasAttribute('hidden'));
      parts.push(['input', '<div class="ginput" data-slot="input"' + (allWait ? ' data-gwait="dirty" hidden' : '') + '>' +
        o.input.map((x) => labelBefore(x.el) + x.el.outerHTML + (x.after ? x.after.outerHTML : '')).join('') + '</div>']);
    }
    // ROW
    const shape = shapeOf(o.rowL.filter((b) => !b.hasAttribute('hidden')), o.rowR);
    const shapeAll = shapeOf(o.rowL, o.rowR);
    if (shapeAll !== 'absent') {
      parts.push(['row', '<div class="race-mid commitrow grow" data-slot="row" data-shape="' + shape + '">' +
        '<span class="gleft">' + o.rowL.map((b) => b.outerHTML).join('') + '</span>' +
        '<span class="gnote" data-slot="note">' + o.rowNote.map((b) => b.outerHTML).join('') + reasonsHtml(o.rowR, root) + '</span>' +
        '<span class="rightpair">' + o.rowR.map((b) => b.outerHTML).join('') + '</span></div>']);
    } else if (o.rowNote.length) {
      // a note about an act sent from elsewhere (the patch's floating row):
      // the row's note slot, standing where the row would be
      parts.push(['note', '<div class="gbody gnoteonly" data-slot="note">' + o.rowNote.map((b) => b.outerHTML).join('') + '</div>']);
    }
    // the gaps (H1)
    const html = [];
    parts.forEach(([name, h], i) => {
      if (i) {
        const prev = parts[i - 1][0];
        const hair = name === 'row' || (name === 'blocks' && prev !== 'input');
        if (hair) html.push(HAIR(prev + '-' + name));
      }
      html.push(h);
    });
    root.setAttribute('data-gshape', shapeAll);
    root.classList.add('gcard');
    if (lab) root.classList.add('ghaslab');
    if (o.dropped.length) root.setAttribute('data-gdropped', o.dropped.join(' | '));
    root.innerHTML = html.join('');
    return root.outerHTML;
  }
  const hairEl = (gap) => { const d = document.createElement('div'); d.className = 'ghair'; d.setAttribute('data-gap', gap);
    d.setAttribute('aria-hidden', 'true'); return d; };
  function labelIn(b) {
    const lab = b.getAttribute('data-glabel');
    if (!lab) return;
    b.removeAttribute('data-glabel');
    const d = document.createElement('div'); d.innerHTML = LAB(lab);
    // a rejected motion's wording carries its outcome in its label (amber 27)
    b.prepend(d.firstChild);
  }
  // an input's or a body line's label stands as its own first line, before
  // it (a speaker lane is a flex row, and a label inside it would be a column)
  function labelBefore(el) {
    const lab = el.getAttribute && el.getAttribute('data-glabel');
    if (!lab) return '';
    el.removeAttribute('data-glabel');
    return LAB(lab);
  }
  const wrap = (h) => { const d = document.createElement('div'); d.innerHTML = h; return d; };
  const dedupe = (a) => a.filter((x, i) => a.findIndex((y) => norm(y) === norm(x)) === i);
  const provFromLock = (t) => (/member/i.test(t) ? 'Chosen by the membership' : /founder/i.test(t) ? 'Chosen by the Founder ✒️' : t);

  /* ---- the entry point ------------------------------------------------------ */
  function card(html, st0) {
    if (!html || typeof html !== 'string') return html;
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    const root = t.content.firstElementChild;
    if (!root || !root.classList.contains('sugg') || t.content.children.length !== 1) return html;
    // the working tools read what the builders wrote, before the sort
    (window.__gin = window.__gin || {})[root.getAttribute('data-setupcard') || root.getAttribute('data-card') || '?'] = html;
    const st = { closed: P.closed(), phase: P.phase(), reader: P.reader() };
    for (const [k, v] of Object.entries(st0 || {})) if (v !== undefined) st[k] = v;
    if (st.place != null) placeHead(root, st.place);
    const o = sort(root, st);
    judge(o, root, st);
    assemble(root, o, st);
    // J1: every dark control anywhere on the card says what will wake it
    root.querySelectorAll('button[disabled]:not([data-until]), .lanepick[disabled]:not([data-until])')
      .forEach((b) => b.setAttribute('data-until', untilOf(b, root)));
    // what the card held when it opened is its baseline; what differs from
    // it is unsent, and shows the bin and the reason lane (J2, B13)
    baseline(root);
    resync(root);
    return root.outerHTML;
  }
  // S2: the head is the document's own rendering of the anchor
  function placeHead(root, placeHtml) {
    const rt = root.querySelector(':scope > .clausehead .headclause > .rtext');
    if (!rt) return;
    rt.innerHTML = placeHtml;
    rt.classList.add('gplace');
  }

  /* ---- the listener that keeps J2 and B13 true while typing ---------------- */
  function resync(cardEl) {
    if (!cardEl) return;
    const d = dirty(cardEl);
    cardEl.querySelectorAll('[data-gwait="dirty"]').forEach((e) => { if (d) e.removeAttribute('hidden'); else e.setAttribute('hidden', ''); });
    // a commit held dark over an empty box wakes when something is typed
    const typed = [...cardEl.querySelectorAll('textarea[data-emails], input.addr, input[type="email"]')].some((i) => (i.value || '').trim());
    const row = cardEl.querySelector(':scope > [data-slot="row"]');
    cardEl.querySelectorAll('[data-gtype]').forEach((b) => { if (typed) b.removeAttribute('disabled'); else b.setAttribute('disabled', ''); });
    if (row) {
      const L = [...row.querySelectorAll('.gleft > button')].filter((b) => !b.hasAttribute('hidden'));
      const R = [...row.querySelectorAll('.rightpair > button')];
      row.setAttribute('data-shape', shapeOf(L, R));
      const note = row.querySelector('.gnote');
      if (note && cardEl.isConnected) {
        note.querySelectorAll('[data-greason]').forEach((e) => e.remove());
        note.insertAdjacentHTML('beforeend', reasonsHtml(R, cardEl));
      }
    }
  }
  const onEdit = (e) => { const c = e.target && e.target.closest && e.target.closest('.gcard'); if (c) setTimeout(() => resync(c), 0); };
  document.addEventListener('input', onEdit, true);
  document.addEventListener('click', onEdit, true);

  /* ---- the layout rules the shell owns (v2) -------------------------------- */
  // the bottom of the last line of ink above `card`: the previous visible
  // thing in the flow, its last text line's box (a Range's rect is the line's
  // content area, not its padding or its leading)
  function inkAbove(card) {
    let el = card;
    for (let i = 0; i < 6 && el; i++) {
      let prev = el.previousElementSibling;
      while (prev && (!prev.getBoundingClientRect().height || getComputedStyle(prev).display === 'none' ||
        prev.matches('.chipcol, script, style, [hidden]'))) prev = prev.previousElementSibling;
      if (prev) {
        const w = document.createTreeWalker(prev, NodeFilter.SHOW_TEXT);
        let last = null;
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          if (!n.nodeValue.trim()) continue;
          const host = n.parentElement;
          if (!host || host.closest('.chipcol, .sr, [hidden]')) continue;
          last = n;
        }
        if (last) {
          const r = document.createRange(); r.selectNodeContents(last);
          const rs = [...r.getClientRects()].filter((q) => q.width > 0 && q.height > 0);
          if (rs.length) return Math.max(...rs.map((q) => q.bottom));
        }
        return prev.getBoundingClientRect().bottom;
      }
      el = el.parentElement;
      if (el && el.matches('.doc, #doc, #band, body')) break;
    }
    return null;
  }
  // the top of the head's first line of text (the label and the strip aside)
  function firstTextTop(head) {
    const w = document.createTreeWalker(head, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!n.nodeValue.trim()) continue;
      const host = n.parentElement;
      if (!host || host.closest('.chipcol, .glab, .sr, [hidden], .lanebar, .speaker')) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      const rs = [...r.getClientRects()].filter((q) => q.width > 0 && q.height > 0);
      if (rs.length) {
        const t = Math.min(...rs.map((q) => q.top));
        // a face on the same line stands taller than its letters
        const boxes = [...head.querySelectorAll('.rtext .av, .rtext img, .rtext .emojiface')].map((e) => e.getBoundingClientRect())
          .filter((q) => q.height && q.top < t + 12);
        return boxes.length ? Math.min(t, ...boxes.map((q) => q.top)) : t;
      }
    }
    const av = head.querySelector('.rtext .av, .rtext img, .rtext input, .rtext [contenteditable]');
    return av ? av.getBoundingClientRect().top : null;
  }
  // **G5 — the top edge** and **G6 — the card ends where its content ends**.
  // Called by the band's and the charter's fit passes in place of today's
  // floor (`minHeight` = the strip's height).
  function fitCard(card) {
    if (!card || !card.classList.contains('gcard')) return false;
    // G6: no floor; the strip hangs on down the gutter, and what follows is
    // pushed only as far as the strip needs to clear it
    card.style.minHeight = '';
    card.style.marginBottom = '';
    const col = card.querySelector('.chipcol');
    if (col) {
      const r = card.getBoundingClientRect();
      const over = col.getBoundingClientRect().bottom + 8 - r.bottom;
      if (over > 0) card.style.marginBottom = Math.ceil(over) + 'px';
    }
    // G5: the card's box never rises over the ink above it; where the clear
    // space is smaller than its inset, the inset shrinks and the head stays.
    // Relative, like the head-landing pass before it: padding and margin move
    // by the same amount, so the head does not.
    if (!card.dataset.gpt0) {
      const was = card.style.paddingTop; card.style.paddingTop = '';
      card.dataset.gpt0 = String(parseFloat(getComputedStyle(card).paddingTop) || 0);
      card.style.paddingTop = was;
    }
    const pt0 = +card.dataset.gpt0;
    // P1 v2's fourth exception: at the birth the 🪶 head is the title lane
    // itself, at --h-title, its line where the heading's line stood
    const tl = card.querySelector(':scope > .clausehead .titlelane');
    const para = card.closest('.cpara');
    if (tl && para && para.id === 'titlepara') {
      const d = para.getBoundingClientRect().top - tl.getBoundingClientRect().top;
      if (Math.abs(d) > 0.5) {
        card.style.marginTop = ((parseFloat(getComputedStyle(card).marginTop) || 0) + d).toFixed(1) + 'px';
        // …and the strip, which hangs off the card, is held where it was: the
        // tab you pressed does not move
        const col = card.querySelector(':scope > .clausehead .chipcol');
        if (col) col.style.top = ((parseFloat(getComputedStyle(col).top) || 0) - d).toFixed(1) + 'px';
      }
    }
    // the head label's foot stands 2 px above the head's first line of text
    const lab = card.querySelector(':scope > .clausehead > .ghlab');
    if (lab) {
      const head = lab.parentElement;
      const ft = firstTextTop(head);
      if (ft != null) {
        const lh = lab.getBoundingClientRect().height;
        lab.style.top = (ft - 2 - lh - head.getBoundingClientRect().top).toFixed(1) + 'px';
      }
    }
    const ink = inkAbove(card.closest('.cpara.open') || card);
    if (ink != null) {
      const top = card.getBoundingClientRect().top;
      const pt = parseFloat(getComputedStyle(card).paddingTop) || 0;
      const need = ink + 1 - top;                // > 0: over the ink; < 0: room to spare
      const d = need > 0 ? Math.min(need, pt) : -Math.min(-need, pt0 - pt);
      if (Math.abs(d) > 0.5) {
        card.style.paddingTop = (pt - d).toFixed(1) + 'px';
        card.style.marginTop = ((parseFloat(getComputedStyle(card).marginTop) || 0) + d).toFixed(1) + 'px';
      }
    }
    return true;
  }

  // …and for a card no fit pass of the page reaches (the birth's 🪶, which
  // opens outside the band): fitted whenever a card enters the page
  let fitQ = null;
  new MutationObserver((ms) => {
    if (!ms.some((m) => [...m.addedNodes].some((n) => n.nodeType === 1 && (n.matches('.gcard') || n.querySelector('.gcard'))))) return;
    clearTimeout(fitQ);
    fitQ = setTimeout(() => document.querySelectorAll('.gcard').forEach((c) => { try { fitCard(c); } catch (e) { /* a card mid-render */ } }), 30);
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.GRAMMAR = { card, provide, dirty, resync, fitCard, inkAbove, UNTIL, REASON, closed: () => P.closed() };
})();
