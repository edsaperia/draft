/* grammar.js — the prototype's one card shell (Q1541 stage 5, grammar.md §2).

   Every decision card on the prototype — band and charter alike — leaves
   through `GRAMMAR.card(html, state)`. The builders upstream still write their
   old markup (converting 40 kinds of body to read a `CardState` alone is
   phase two's work, grammar.md O7); this shell takes what they wrote, sorts
   every part into **the six slots in fixed order** — head, fact, body, blocks,
   input, row (§2.3) — and then decides, from the parts and the state and
   nothing else:

   - which slots are drawn at all (L1: an empty slot is not in the DOM);
   - where the hairlines go (H1: a hairline belongs to the gap between two
     drawn things, never to a slot, never at a card's top or foot);
   - which controls survive (J1/J2: a control only while it has a job; 🗑️ only
     to remove what is yours; no close-only OK; nothing but 🥂 on a closed
     document);
   - which of the six row shapes the row is (§2.6), or no row;
   - provenance as text in the fact line (§2.7, B1), never a pressed radio;
   - nothing above the head (G2, B4): an eyebrow's job moves into the head's
     lane (O1 (a)), a record's dateline into the fact line.

   The state arrives from the page (`GRAMMAR.provide`) as the few fields the
   shell needs: phase, reader, the place's own rendering (S2), provenance. */
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
  // the two provenance labels (T48), whether they arrive as a pressed radio or
  // as a lockline; and the lockline's own sentences, which say the same fact
  const PROV = /^(Chosen by the (Founder|membership)[^]*|Set by the founder[^]*|Decided by the members[^]*)$/i;
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
          if (c.classList && c.classList.contains('chipcol')) continue;
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
  const hasCtl = (el) => !!(el.matches && el.matches('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]')) ||
    !!el.querySelector('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]');
  const isBin = (b) => GLYPH(b) === '🗑️' || /🗑/.test(b.textContent || '');
  const isWithdraw = (b) => b.hasAttribute('data-withdrawmotion') || /withdraw/i.test(b.getAttribute('data-act') || '') ||
    /withdraw|comes back|take .* back/i.test(b.getAttribute('title') || '');
  const BLOCK = '.pick, .propblock, .vinblock, .ranked, .recbox';

  const HAIR = (gap) => '<div class="ghair" data-gap="' + gap + '" aria-hidden="true"></div>';

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
      dropped: [], provenance: null, headLabel: null };
    const head = root.querySelector(':scope > .clausehead');
    out.head = head;
    if (head) {
      // G2: nothing above the head. The charter's eyebrow — *The clause as it
      // stands*, *The gap as it stands* — says which lane is the current
      // text, so its words move into that lane (O1 (a)); where the head has
      // no lane the eyebrow had nothing to label and simply goes.
      const lab = head.querySelector(':scope > .headlab');
      if (lab) { out.headLabel = textOf(lab); out.dropped.push('eyebrow: ' + out.headLabel); lab.remove(); }
      const lane = head.querySelector(':scope > .lanebar');
      if (lane) out.lane = lane;
      // the band's settled head drawn as a block, provenance radio and all
      // (Q1167 a, CP2): the rule stays as the head's text, the radio's label
      // becomes the fact line (B1)
      head.querySelectorAll('.headrule .lanepick[disabled], .headrule .lanepick[aria-pressed="true"]').forEach((r) => {
        const t = textOf(r);
        if (PROV.test(t)) { out.provenance = out.provenance || t; r.remove(); }
      });
    }
    const addField = (f) => {
      for (const ch of [...f.children]) place(ch, true);
    };
    const place = (el, inField) => {
      const cl = el.classList;
      if (!cl) return;
      if (cl.contains('fieldlab')) {
        // O1 (a): a field label is a block label, and a block's label lives
        // in its lane beside the radio. Kept for the first block.
        out.pendingLabel = textOf(el);
        return;
      }
      if (cl.contains('rechead') || (cl.contains('rsub') && !inField)) { out.fact.push(el); return; }
      if (cl.contains('statline') || cl.contains('lockline')) {
        // B11: the value is the head; who chose it is the fact line
        const t = textOf(el);
        if (cl.contains('lockline') && t) out.provenanceLine = out.provenanceLine || t;
        out.dropped.push(cl.contains('statline') ? 'Set to line' : 'lockline');
        return;
      }
      if (cl.contains('commitrow') || cl.contains('race-mid')) { sortRow(el, out); return; }
      if (cl.contains('field') || cl.contains('body')) { addField(el); return; }
      if (cl.contains('choice')) {
        // a radiogroup of blocks: kept as one container, its picks the blocks
        if (el.querySelector(BLOCK)) { out.blocks.push(el); return; }
        out.body.push(el); return;
      }
      if (el.matches(BLOCK)) {
        if (out.pendingLabel && el.matches('.propblock')) { el.setAttribute('data-glabel', out.pendingLabel); }
        out.blocks.push(el); return;
      }
      if (cl.contains('whylane') || el.querySelector('.whylane')) { out.input.push({ el, why: true }); return; }
      if (cl.contains('foot') && cl.contains('refusal')) { out.rowNote.push(el); return; }
      if (cl.contains('pnav') || cl.contains('foot') || cl.contains('srationale') || cl.contains('setnote') ||
        cl.contains('why') || cl.contains('unlocks') || cl.contains('memrow') || cl.contains('readiness')) {
        if (hasCtl(el)) { out.input.push({ el }); return; }
        out.body.push(el); return;
      }
      if (el.tagName === 'SPAN' && !textOf(el) && !el.querySelector('button,svg,img')) return;   // spacers
      if (hasCtl(el)) { out.input.push({ el }); return; }
      if (!textOf(el) && !el.querySelector('button, svg, img, .av')) { out.dropped.push('empty ' + el.className); return; }
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
    return out;
  }

  function sortRow(row, out) {
    for (const b of [...row.querySelectorAll('button, .rowcount, .absnote, .wcount, .ctlnote')]) {
      if (b.tagName !== 'BUTTON') { out.rowNote.push(b); continue; }
      if (isBin(b)) { (isWithdraw(b) ? out.rowL : out.rowL).push(b); continue; }
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
      if (isWithdraw(b)) { b.setAttribute('data-gbin', 'withdraw'); keepL.push(b); continue; }
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

    // B1 + B7: blocks. A provenance radio leaves its block; the standing
    // block (the head again) leaves the list; on a card with no act, blocks
    // whose radio nobody may press are not drawn.
    // a head with nothing in it is not a head (L1): where the old card left
    // its head empty and drew what stands as a chosen block (🎩 locked, the
    // Founder's own answer), the chosen block's words are the head
    const headRt = o.head && o.head.querySelector('.headclause > .rtext');
    if (headRt && !textOf(headRt)) {
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
    const headText = norm(textOf(o.head && o.head.querySelector('.rtext, .headrule')));
    const anyAct = o.rowR.length > 0 || o.rowL.length > 0;
    const keptBlocks = [];
    const visitBlock = (blk) => {
      const radios = [...blk.querySelectorAll('.lanepick')];
      let prov = null;
      radios.forEach((r) => { const t = textOf(r);
        if ((r.disabled || r.hasAttribute('disabled')) && PROV.test(t)) { prov = t; r.remove(); } });
      if (prov) {
        const t = norm(textOf(blk.querySelector('.opttext, .rtext') || blk));
        if (t && headText && (t === headText || headText.includes(t) || t.includes(headText))) {
          o.provenance = o.provenance || prov; o.dropped.push('standing block (the head again)'); return null;
        }
        blk.setAttribute('data-glabel', prov);
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
        if (pressed && t && t.length > 2 && headText && (t === headText || headText.includes(t))) {
          o.standingPressed = true; o.dropped.push('standing block, pressed (the head again)'); return null;
        }
      }
      if (closed || (!anyAct && dead.length && !live.length)) {
        if (blk.matches('.ranked, .recbox') || blk.querySelector('.ranked')) { dead.forEach((r) => r.remove()); return blk; }
        if (dead.length || blk.matches('.vinblock')) { o.dropped.push('block nobody may press'); return null; }
      }
      if (dead.length && live.length === 0 && !blk.matches('.ranked, .recbox')) {
        // CP11's greyed radio on a live card: the block stays readable, the
        // dead radio goes (a radio exists only on a live lane, R1)
        dead.forEach((r) => { const bar = r.closest('.lanebar'); if (bar && bar.children.length <= 1) bar.remove(); else r.remove(); });
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
        if (/^(OK|Accept|Activate)/i.test(textOf(b))) return;
        b.setAttribute('disabled', ''); b.setAttribute('data-until', 'choose');
      });
    }
    // the head's own lane dies with the card's acts too
    if (o.lane && (closed || !anyAct)) {
      const r = o.lane.querySelector('.lanepick');
      if (r && (closed || r.disabled || r.hasAttribute('disabled'))) { o.lane.remove(); o.lane = null; }
    }
    // closed: inputs go (nothing can be sent), and so does the rationale lane
    if (closed) {
      o.input = o.input.filter((x) => { if (x.el.querySelector && x.el.querySelector('[data-sign], [data-signwhy]')) return true;
        o.dropped.push('closed: input'); return false; });
    }
    // B13: the rationale lane rides a change
    o.input.forEach((x) => { if (x.why) { x.el.setAttribute('data-gwait', 'dirty'); if (!st.dirty) x.el.setAttribute('hidden', ''); } });
  }

  function couldHold(root, o) {
    if (root.querySelector('input:not([type=hidden]), textarea, [contenteditable="true"], [contenteditable="plaintext-only"]')) return true;
    const hasIndiff = !!root.querySelector('.vinblock, .lanepick.vin, [data-v="either"]');
    return !hasIndiff && !!root.querySelector('.pick .lanepick:not([disabled]), .propblock .lanepick:not([disabled])');
  }

  function untilOf(b, root) {
    const t = (b.getAttribute('title') || '') + ' ' + textOf(b);
    if (b.hasAttribute('data-begin')) return 'readiness';
    if (b.classList.contains('grantok')) return 'readiness';
    if (/\d\d:\d\d|next ✏️|✏️ in/i.test(t)) return 'drip';
    if (/accept/i.test(t)) return 'accept:pen';
    if (/reconnect/i.test(t)) return 'reconnect';
    if (root.querySelector('input:not([type=hidden]), textarea, [contenteditable="true"], [contenteditable="plaintext-only"]') &&
      !root.querySelector('.lanepick:not([disabled])')) return 'type';
    return 'choose';
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

  /* ---- the one shell -------------------------------------------------------- */
  function assemble(root, o, st) {
    const parts = [];   // [slotName, html]
    // HEAD — the anchor's own rendering, the strip hanging off its first line
    if (o.head) {
      o.head.setAttribute('data-slot', 'head');
      o.head.setAttribute('data-fact', 'place');
      if (o.lane && o.headLabel) {
        // O1 (a): the eyebrow's words are the head lane's label
        const lab = document.createElement('span');
        lab.className = 'glabel'; lab.textContent = /gap/i.test(o.headLabel) ? 'The gap as it stands' : 'Current text';
        const pick = o.lane.querySelector('.lanepick');
        if (pick) pick.after(lab); else o.lane.prepend(lab);
      }
      parts.push(['head', o.head.outerHTML]);
    }
    // FACT — provenance or outcome, one line (§2.7)
    const factBits = [];
    // a record's dateline row reads *Decided · 6/14👤* over *Tuesday, 29
    // September, 16:05*, and its counts line *6 of 14 weighed in* says the
    // 6/14 again in words — so the outcome word, the moment and the counts,
    // once each, in one line (§2.2, F1)
    o.fact.forEach((el) => {
      if (el.classList.contains('rechead')) {
        const kids = [...el.children].map(textOf).filter(Boolean);
        const word = (kids[0] || '').split(' · ')[0];
        factBits.push([word].concat(kids.slice(1)).filter(Boolean).join(' · '));
        return;
      }
      const t = textOf(el); if (t) factBits.push(t);
    });
    const prov = st.provenance || o.provenance || (o.provenanceLine && provFromLock(o.provenanceLine));
    if (prov && !st.noFact) factBits.unshift(prov + (st.when ? ' · ' + st.when : ''));
    if (factBits.length) {
      const fx = esc(dedupe(factBits).join(' · '));
      parts.push(['fact', '<p class="gfact" data-slot="fact" data-fact="' + (o.fact.length ? 'outcome' : 'provenance') + '">' +
        (window.CARDS.glyphify ? window.CARDS.glyphify(fx) : fx) + '</p>']);
    }
    // BODY
    const bodyHtml = o.body.map((e) => e.outerHTML).join('');
    if (bodyHtml && textOf(wrap(bodyHtml))) parts.push(['body', '<div class="gbody" data-slot="body">' + bodyHtml + '</div>']);
    // BLOCKS — a hairline between every two (H1)
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
        o.input.map((x) => x.el.outerHTML).join('') + '</div>']);
    }
    // ROW
    const shape = shapeOf(o.rowL.filter((b) => !b.hasAttribute('hidden')), o.rowR);
    const shapeAll = shapeOf(o.rowL, o.rowR);
    if (shapeAll !== 'absent') {
      parts.push(['row', '<div class="race-mid commitrow grow" data-slot="row" data-shape="' + shape + '">' +
        '<span class="gleft">' + o.rowL.map((b) => b.outerHTML).join('') + '</span>' +
        '<span class="gnote">' + o.rowNote.map((b) => b.outerHTML).join('') + '</span>' +
        '<span class="rightpair">' + o.rowR.map((b) => b.outerHTML).join('') + '</span></div>']);
    } else if (o.rowNote.length) {
      parts.push(['body', '<div class="gbody" data-slot="body">' + o.rowNote.map((b) => b.outerHTML).join('') + '</div>']);
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
    const bar = b.querySelector('.lanebar');
    const sp = document.createElement('span'); sp.className = 'glabel'; sp.textContent = lab;
    if (bar) { const p = bar.querySelector('.lanepick'); if (p) p.after(sp); else bar.prepend(sp); }
    else b.appendChild(sp);
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
    const st = { closed: P.closed(), phase: P.phase(), reader: P.reader() };
    for (const [k, v] of Object.entries(st0 || {})) if (v !== undefined) st[k] = v;
    if (st.place != null) placeHead(root, st.place);
    const o = sort(root, st);
    judge(o, root, st);
    assemble(root, o, st);
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
    const row = cardEl.querySelector(':scope > [data-slot="row"]');
    if (row) {
      const L = [...row.querySelectorAll('.gleft > button')].filter((b) => !b.hasAttribute('hidden'));
      const R = [...row.querySelectorAll('.rightpair > button')];
      row.setAttribute('data-shape', shapeOf(L, R));
    }
  }
  const onEdit = (e) => { const c = e.target && e.target.closest && e.target.closest('.gcard'); if (c) setTimeout(() => resync(c), 0); };
  document.addEventListener('input', onEdit, true);
  document.addEventListener('click', onEdit, true);

  window.GRAMMAR = { card, provide, dirty, resync, UNTIL };
})();
