/* ============================================================================
   setup.js — the machinery the two setup surfaces share.

   document-creation and founding-ceremony are the same screen seen by two
   people. The convenor sets what is theirs to set and watches the room answer
   the rest; a member answers what the room was given and reads what the
   convenor settled. Same document, same tab group at its head, same rail, same
   cards — only *who may act on which* differs.

   So the cards themselves, the tab group, the cable and the read-only and
   watching bodies live here, once. What stays in each surface is its own
   fixture and the bodies of the cards **it** is allowed to fill in.
   ========================================================================== */
window.SETUP = (function () {
  'use strict';

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const TICK = '<svg class="mkg" viewBox="0 0 12 12"><path d="M2 6.4 L4.7 9.2 L10 2.9"/></svg>';
  const initials = (n) => String(n).trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  /* ---- avatars ------------------------------------------------------------
     `me` in the glossary reads "initials, not a photograph: there are no
     accounts behind it yet". There are now — choosing how you appear is one of
     the cards — so the initials become the *default* rather than the rule, and
     what the picker offers is a ground for them or a drawn mark instead.

     No uploads in a mockup, and no invented photographs of people who do not
     exist: a face on this screen would be the one piece of fiction that reads
     as a claim about a real person. */
  const GROUNDS = ['#3b5bdb', '#0b7285', '#2b8a3e', '#e8590c', '#862e9c', '#495057'];
  const MARKS = [
    ['#d6336c', '<circle cx="22" cy="22" r="9" fill="#fff"/><circle cx="22" cy="22" r="18" fill="none" stroke="#fff" stroke-width="3"/>'],
    ['#1098ad', '<path d="M8 30 L22 10 L36 30 Z" fill="#fff"/>'],
    ['#5c940d', '<rect x="10" y="10" width="10" height="10" fill="#fff"/><rect x="24" y="10" width="10" height="10" fill="#fff"/><rect x="10" y="24" width="10" height="10" fill="#fff"/><rect x="24" y="24" width="10" height="10" fill="#fff"/>'],
  ];
  const avatarOptions = () =>
    [{ id: '' }].concat(GROUNDS.map((g, i) => ({ id: 'c' + i })), MARKS.map((m, i) => ({ id: 'm' + i })));

  function avHtml(person, cls) {
    const pic = person && person.pic;
    const c = 'av ' + (cls || '') + (pic ? ' set' : '');
    if (pic && pic[0] === 'c') {
      return '<span class="' + c + '" style="background:' + GROUNDS[+pic.slice(1)] + '">' +
        esc(initials(person.n)) + '</span>';
    }
    if (pic && pic[0] === 'm') {
      const m = MARKS[+pic.slice(1)];
      return '<span class="' + c + '" style="background:' + m[0] + '">' +
        '<svg viewBox="0 0 44 44" aria-hidden="true">' + m[1] + '</svg></span>';
    }
    return '<span class="' + c + '">' + esc(initials(person ? person.n : '?')) + '</span>';
  }

  /* ---- the lifecycle of a setting -----------------------------------------
     Two states and one rule, and the rule is the palette's own: **grey means
     nothing is being asked of you**. A card you owe an answer to is yellow; a
     card somebody else owes, or a card that is finished, is grey — including
     the convenor's unconfirmed cards seen by a member, which block them and ask
     them nothing. Blocked is not the same as wanted. */
  const hueOf = (c, ctx) => (ctx.mustAct(c) ? 'open' : 'closed');
  const washOf = (c, ctx) => {
    const h = hueOf(c, ctx);
    return { col: 'rgba(var(--lc-' + h + '), ' + (h === 'open' ? '0.22' : '0.16') + ')',
      bg: 'rgba(var(--lc-' + h + '), 0.06)' };
  };

  /* ---- the piles ----------------------------------------------------------
     **These are clause-tabs, and they pile like clause-tabs** (Ed, 2026-08-18,
     overruling the flat group of the morning: *I'd like all of these tabs to act
     like clause-tabs and pile like clause tabs. The convenor's settings sit in
     one pile, and participants' in the pile below*).

     Which is the right call and settles Q316 the other way. The flat group was
     defended on the grounds that a pile of fourteen shows one glyph and a
     constitution deserves better — but that argument was really about the wrong
     thing being in one pile. **Two piles by who decides** says something a flat
     row of fourteen could not say at all, and it says it in the vocabulary the
     gutter already has: the front tab is what most wants you, the slivers behind
     carry hue and no count, one stack is one target, and opening it expands the
     pile into the strip down the card's left edge.

     It also makes one behaviour visible that was previously only in the rail:
     handing a setting to the room **moves its tab from the top pile to the
     bottom one**. Delegation stops being a radio you ticked and becomes a thing
     you can see happen.

     One departure from the gutter, and it is a difference in the objects rather
     than in the design: **a settled setting stays in the closed pile**. In the
     document a filed decision leaves, because it is history at that clause; a
     settled setting is not history, it is *the rule*. So it goes grey and stays,
     which is what leaves the head of the document holding the constitution. */
  const chipHtml = (c, ctx, o) =>
    '<span class="achip' + (o.active ? ' wmark' : '') + (o.inert ? ' behind' : '') + '"' +
    (o.inert ? ' aria-hidden="true"' : ' role="button" tabindex="0" data-tab="' + c.k + '"') +
    ' style="--chiphue: var(--lc-' + hueOf(c, ctx) + ')' + (o.z ? '; z-index:' + o.z : '') + '"' +
    (o.inert ? '' : ' title="' + esc(c.t + (o.active ? ' — close it'
      : ctx.mustAct(c) ? ' — waiting on you' : ctx.settled(c) ? ' — settled' : '')) + '"') +
    '><span aria-hidden="true">' + c.g + '</span>' +
    (o.inert ? '' : '<span class="sr">' + esc(c.t) + '</span>') + '</span>';

  /* **The front of a pile is what most wants you**, which is deliberately not
     the order the rail uses. The rail ranks by what must not be lost; a stack
     ranks by what is being asked — and you do not click into a pile to be shown
     something that is finished. Stable within each half, so the strip a card
     opens into is the pile expanded and the two never disagree about what sits
     where. */
  const stackOrder = (cards, ctx) =>
    cards.slice().sort((a, b) => (ctx.mustAct(b) ? 1 : 0) - (ctx.mustAct(a) ? 1 : 0));

  /* Closed: the pile, in the gutter, standing where the card's strip will be.
     Open: the same tabs lined up down the side of the card. One list, two
     postures — `stripHtml` is `pileHtml` with the peek taken off. */
  const pileHtml = (cards, ctx) => {
    const gs = stackOrder(cards, ctx);
    return '<span class="chipcol' + (gs.length > 1 ? ' stack' : '') + '">' +
      gs.map((c, i) => chipHtml(c, ctx, { inert: i > 0, z: gs.length - i })).join('') + '</span>';
  };
  const stripHtml = (cards, ctx) => '<span class="chipcol">' +
    stackOrder(cards, ctx).map((c) => chipHtml(c, ctx, { active: ctx.open === c.k })).join('') + '</span>';

  /* The band at the head of the document: one row per pile, in flow, so the
     second pile stands under the first exactly as a second clause's marks stand
     under a first's. The row whose pile holds the open card shows the card
     instead — the card is where its pile was, which is the same move a decision
     card makes on its paragraph. */
  function bandHtml(groups, ctx, cardFor) {
    return groups.map((g) => {
      const holds = g.cards.some((c) => ctx.open === c.k);
      if (holds) return cardFor(g);
      const left = g.cards.filter((c) => ctx.mustAct(c)).length;
      return '<div class="setrow" data-pile="' + g.key + '">' + pileHtml(g.cards, ctx) +
        '<div class="pilelab"><span class="eyebrow">' + esc(g.label) + '</span>' +
        '<span class="pilen">' + esc(g.note(left)) + '</span></div></div>';
    }).join('');
  }

  /* A pile may reach down as far as the next thing in the band and no further,
     which is `fitStacks` doing the same job one column over; and a row is never
     shorter than the pile standing beside it, because there is no clause here to
     give it a height of its own. */
  function fitBand(band) {
    if (!band) return;
    band.querySelectorAll('.setrow').forEach((row) => {
      const col = row.querySelector('.chipcol');
      if (!col) return;
      const n = col.children.length;
      if (n > 1) col.style.setProperty('--peek', Math.max(1.5, Math.min(4, 60 / (n - 1))).toFixed(2) + 'px');
      row.style.minHeight = Math.ceil(col.getBoundingClientRect().height + 8) + 'px';
    });
    // the card grows to hold its strip: a floor, not a height, so the card is
    // still as tall as what it says and the strip only stops it being shorter
    band.querySelectorAll('.setupcard').forEach((card) => {
      card.style.minHeight = '';
      const col = card.querySelector('.chipcol');
      if (!col) return;
      const r = card.getBoundingClientRect();
      const need = col.getBoundingClientRect().bottom - r.top + 14;
      if (need > r.height) card.style.minHeight = Math.ceil(need) + 'px';
    });
  }

  /* ---- the rail entry -----------------------------------------------------
     The same object session-view's queue draws, with the subject glyph where a
     lifecycle mark would be. `--fill` is the completion bar: 100% for anything
     that is only yours to decide, and how far the room has got on anything that
     is theirs (Ed, 2026-08-18). */
  function railEntry(c, ctx) {
    const w = washOf(c, ctx);
    const done = ctx.settled(c);
    const room = ctx.isRoom(c);
    const fill = room ? Math.min(100, Math.round((c.in || 0) / ctx.E * 100)) + '%' : '100%';
    return '<li class="qitem" data-q="' + c.k + '">' +
      '<button class="' + (done || !ctx.mustAct(c) ? 'deciding' : 'needs') + '"' +
      ' data-card="' + c.k + '" data-washkey="set:' + c.k + '"' +
      ' aria-current="' + (ctx.open === c.k) + '"' +
      ' title="' + esc(room ? (c.in || 0) + ' of ' + ctx.E + ' have answered' : c.t) + '"' +
      ' style="--washcol: ' + w.col + '; --washbg: ' + w.bg + '; --fill: ' + fill + '">' +
      '<span class="ql"><span class="subj" aria-hidden="true">' + c.g + '</span>' +
      '<span class="qt">' + esc(c.t) + '</span>' +
      '<span class="setmark">' + (done ? TICK : '') + '</span></span>' +
      '<span class="qwhy">' + ctx.summary(c) + '</span></button></li>';
  }

  /* ---- the card shell -----------------------------------------------------
     The `decision card`'s own shape, down to the markup: a `clausehead` whose
     `headclause` carries the tab strip in the gutter, then the field, then the
     commit row. The head holds the card's title where a clause would be —
     because a setting has no clause, and what it is *about* is the document it
     has opened at the top of. Everything else is the same object, so the strip
     lands in the same gutter column the pile stood in and the tab you clicked
     does not move. */
  function cardHtml(c, ctx, body, foot, siblings) {
    return '<div class="sugg setupcard quick-open" role="tabpanel" data-setupcard="' + c.k + '">' +
      '<div class="clausehead">' +
      '<div class="headlab"><span>' + esc(ctx.bandLabel(c)) + '</span></div>' +
      '<div class="headclause">' + stripHtml(siblings || [c], ctx) +
      '<h2 class="rtext">' + esc(c.t) + '</h2></div></div>' +
      '<div class="field">' + body + '</div>' +
      '<div class="race-mid commitrow">' + foot + '</div></div>';
  }

  /* ---- the bodies that are the same on both surfaces ----------------------- */

  /* What a **member** sees when they open one of the convenor's cards, and what
     anybody sees once a setting is closed: the value, and who it came from.
     Read-only is not the same as hidden — the whole point of the tab group is
     that the constitution is legible to everyone it binds. */
  function readBody(c, ctx) {
    return '<h2>' + esc(c.t) + '</h2>' +
      '<div class="lockline">' + TICK + '<span>' + esc(c.setBy || 'Set by the convenor when the document was made') +
      '. Fixed for the life of the document.</span></div>' +
      '<div class="statline"><span class="k">Set to</span><span class="v">' +
      ctx.value(c) + '</span></div>' +
      (c.readNote ? '<p class="setnote">' + c.readNote + '</p>' : '');
  }

  /* What the **convenor** sees when they open a card they handed to the room —
     and what a member sees on one they have already answered. While it runs it
     can say only how many have answered: any of the values, or a running
     maximum, would let the room read itself before it had finished, which is
     the whole reason the ceremony is blind.

     Once it closes there is nothing left to anchor, so the card carries the
     `distribution-strip` — the shape of what people asked for, without names.
     A consent rule is worth seeing the shape of: the number the document took
     is one person's, and the strip is what says how far it sat from the rest. */
  function watchBody(c, ctx) {
    const inN = c.in || 0, done = inN >= ctx.E;
    // No heading of its own: this half is always appended under a card that has
    // already said what it is about, and a second <h2> repeating the card's own
    // title was the surest sign the two halves were not reading as one card.
    let h = '<div class="eyebrow fieldlab">' + esc(done ? 'What the room said' : 'What the room is saying') + '</div>' +
      '<div class="lockline">' + (done ? TICK : '') +
      '<span>The participants decide' + (done ? '' : ' — asked at the opening ceremony, blind') + '.</span></div>' +
      '<p class="why">' + (c.rule || '') + '</p>';
    if (!done) {
      h += '<div class="pips">' + Array.from({ length: ctx.E }, (_, i) =>
        '<span class="pip' + (i < inN ? ' in' : '') + '"></span>').join('') + '</div>' +
        '<div class="statline"><span class="k">Answered</span><span class="v">' + inN + ' of ' + ctx.E + '</span></div>' +
        '<p class="setnote">Nobody sees anybody’s answer until every one of them is in, and that includes you. ' +
        'A running total is the one thing that can be shown without anchoring the answers still to come.</p>';
      return h;
    }
    h += distHtml(c) +
      '<div class="statline"><span class="k">Answered</span><span class="v">' + ctx.E + ' of ' + ctx.E + '</span></div>' +
      '<div class="statline"><span class="k">' + esc(c.takes || 'The document takes') + '</span>' +
      '<span class="v">' + esc(c.result || '—') + '</span></div>';
    return h;
  }

  /* `distribution-strip` — published without names (SPEC §9.0a). The bar the
     document ended up taking is the accent one; it is not necessarily the tall
     one, and that is exactly what makes the strip worth drawing. */
  function distHtml(c) {
    if (!c.dist || !c.dist.length) return '';
    const max = Math.max(...c.dist, 1);
    return '<div class="dist">' + c.dist.map((n, i) =>
      '<span' + (i === c.distTop ? ' class="top"' : '') + ' style="height:' +
      Math.max(2, Math.round(n / max * 54)) + 'px" title="' + n + '"></span>').join('') + '</div>' +
      '<div class="distx"><span>' + esc((c.distEnds || ['', ''])[0]) + '</span>' +
      '<span>' + esc((c.distEnds || ['', ''])[1]) + '</span></div>' +
      '<p class="setnote">What the fourteen asked for, without names.</p>';
  }

  /* **A name and a picture are two cards** (Ed, 2026-08-18: *picture and name
     separate!*). They were one, on the reasoning that they are answered in one
     sitting — which is a fact about when you happen to do them and not about
     what they are. They are also the pair that most clearly earns the split:
     one is a word other people will type at you and the other is a shape they
     will recognise across a rail, and a room where everybody has a name and
     nobody has a picture is a perfectly ordinary room.

     Neither is authorship. A name is how you appear **in the room** — the
     roster, the presence row, beside your own wallet — where authorship is
     whether a name is attached to a **proposal**, which is sealed by default
     (SPEC §9.0c). Both are written by `setup.js` because both are the same
     question for a convenor and for a member. */
  const nameBody = (me) =>
    '<p class="why">What other people call you here. It is not authorship: who proposed what is settled by the disclosure rule, and under most of its settings your name never appears beside a proposal at all — a document showing fourteen named people and not one named candidate is the ordinary case.</p>' +
    '<div class="idrow">' + avHtml(me, 'big') +
    '<span class="fld"><label for="myname">Your name</label>' +
    '<input id="myname" data-txt="myname" value="' + esc(me.n || '') + '" placeholder="Your name"></span></div>' +
    '<p class="setnote">Change it whenever you like; it is yours and it binds nobody.</p>';

  const pictureBody = (me) =>
    '<p class="why">The shape people will recognise you by in the roster and the presence row. Your initials are a real answer — most rooms run on them.</p>' +
    '<div class="avpick">' + avatarOptions().map((o) =>
      '<button class="avopt" data-pic="' + o.id + '" aria-pressed="' + ((me.pic || '') === o.id) + '"' +
      ' title="' + (o.id ? 'A picture' : 'Your initials') + '">' +
      avHtml({ n: me.n, pic: o.id }, 'big') + '</button>').join('') + '</div>' +
    '<p class="setnote">Photographs arrive with real accounts; a mockup has no business inventing faces for people who do not exist.</p>';

  /* ---- the cable ----------------------------------------------------------
     `queue-wire`, lifted from session-view with its rules intact: 6px, opaque,
     exactly the colour of its own queue card (the wash composited over white,
     painted on a white cable of the same weight), a 10px cap at the document
     end only, lifted to the cards' own height by a hand-drawn shadow clipped so
     that every card on the surface is punched out of it.

     Only the open card draws one. Its existence is what says *this is the open
     one*, which is the whole job the accent used to do.  */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const GROUND_A = 0.06;
  const prevWire = new Map();

  function wireColor(el) {
    const host = !el ? null : (el.dataset && el.dataset.washkey ? el : el.querySelector('[data-washkey]'));
    const raw = host ? getComputedStyle(host).getPropertyValue('--washcol').trim() : '';
    const m = raw.match(/^rgba\((.+?),\s*([\d.]+)\s*\)$/);
    if (!m) return { rgb: 'rgb(var(--lc-closed))', a: 0.16 };
    const a = +m[2];
    return { rgb: 'rgb(' + m[1] + ')', a: +(a + GROUND_A * (1 - a)).toFixed(3) };
  }

  function drawWire(wiresEl, key) {
    if (!wiresEl) return;
    while (wiresEl.firstChild) wiresEl.removeChild(wiresEl.firstChild);
    if (!key) return;
    const start = document.querySelector('.queue [data-card="' + key + '"]');
    const target = document.querySelector('[data-setupcard="' + key + '"]');
    const mainEl = document.querySelector('main');
    if (!start || !target || !mainEl) return;

    const b = start.getBoundingClientRect(), r = target.getBoundingClientRect();
    const mainR = mainEl.getBoundingClientRect();
    const railX = (start.closest('.qitem') || start).getBoundingClientRect().left;
    const gx = (mainR.right + railX) / 2;
    const sx = b.left, sy = b.top + Math.min(b.height / 2, 18);
    const tx = r.right;
    const ty = Math.min(Math.max(sy, r.top + 8), Math.max(r.top + 8, r.bottom - 8));
    const down = ty > sy;
    const rad = Math.max(0, Math.min(8, Math.abs(ty - sy) / 2, (sx - gx) / 2, (gx - tx) / 2));
    const d = 'M ' + sx + ' ' + sy + ' H ' + (gx + rad) +
      ' Q ' + gx + ' ' + sy + ' ' + gx + ' ' + (sy + (down ? rad : -rad)) +
      ' V ' + (ty + (down ? -rad : rad)) +
      ' Q ' + gx + ' ' + ty + ' ' + (gx - rad) + ' ' + ty + ' H ' + tx;

    const shapes = (g, col) => {
      const p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', d); p.setAttribute('stroke', col); g.appendChild(p);
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('class', 'cap'); c.setAttribute('cx', tx); c.setAttribute('cy', ty);
      c.setAttribute('r', 7); c.setAttribute('fill', col); g.appendChild(c);
    };
    const paint = (col, alpha) => {
      const g = document.createElementNS(SVGNS, 'g');
      if (alpha != null) { g.setAttribute('class', 'ink'); g.setAttribute('opacity', alpha); }
      shapes(g, col); wiresEl.appendChild(g); return g;
    };
    // A thing does not shadow its own layer, so every card, tab and rail entry
    // is punched out. Overlapping holes have to be **merged**: the clip is one
    // `evenodd` path, so two rectangles that overlap XOR back to solid.
    const boxes = [...document.querySelectorAll('.sugg, .achip, .queue button')]
      .map((e) => e.getBoundingClientRect()).filter((x) => x.width && x.height);
    const merged = [];
    for (const x of boxes) {
      let cur = { left: x.left, top: x.top, right: x.right, bottom: x.bottom };
      for (let i = merged.length - 1; i >= 0; i--) {
        const m = merged[i];
        if (cur.left < m.right && m.left < cur.right && cur.top < m.bottom && m.top < cur.bottom) {
          cur = { left: Math.min(cur.left, m.left), top: Math.min(cur.top, m.top),
            right: Math.max(cur.right, m.right), bottom: Math.max(cur.bottom, m.bottom) };
          merged.splice(i, 1);
        }
      }
      merged.push(cur);
    }
    const defs = document.createElementNS(SVGNS, 'defs');
    let path = 'M0 0H' + innerWidth + 'V' + innerHeight + 'H0Z';
    for (const m of merged) path += 'M' + m.left + ' ' + m.top + 'H' + m.right + 'V' + m.bottom + 'H' + m.left + 'Z';
    const cp = document.createElementNS(SVGNS, 'clipPath');
    cp.setAttribute('id', 'wire-not-cards'); cp.setAttribute('clipPathUnits', 'userSpaceOnUse');
    const cpp = document.createElementNS(SVGNS, 'path');
    cpp.setAttribute('d', path); cpp.setAttribute('clip-rule', 'evenodd');
    cp.appendChild(cpp); defs.appendChild(cp);
    for (const bl of [1, 3]) {
      const f = document.createElementNS(SVGNS, 'filter');
      f.setAttribute('id', 'wire-blur-' + bl);
      const fe = document.createElementNS(SVGNS, 'feGaussianBlur');
      fe.setAttribute('stdDeviation', bl); f.appendChild(fe); defs.appendChild(f);
    }
    wiresEl.appendChild(defs);
    // two nested groups: clip on the outer, offset on the inner — a clip-path
    // resolves *after* the referencing element's own transform
    const shadow = (dy, blur, alpha) => {
      const outer = document.createElementNS(SVGNS, 'g');
      outer.setAttribute('clip-path', 'url(#wire-not-cards)');
      outer.setAttribute('opacity', alpha);
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('filter', 'url(#wire-blur-' + blur + ')');
      g.setAttribute('transform', 'translate(0 ' + dy + ')');
      shapes(g, '#000'); outer.appendChild(g); wiresEl.appendChild(outer);
    };
    shadow(1, 1, 0.13); shadow(3, 3, 0.20);
    paint('#FFFFFF', null);
    const color = wireColor(start);
    const from = prevWire.get(key) || color;
    const ink = paint(from.rgb, from.a);
    if (from.rgb !== color.rgb || from.a !== color.a) {
      void wiresEl.getBoundingClientRect();
      ink.setAttribute('opacity', color.a);
      ink.querySelectorAll('path').forEach((p) => p.setAttribute('stroke', color.rgb));
      ink.querySelectorAll('circle').forEach((cc) => cc.setAttribute('fill', color.rgb));
    }
    prevWire.set(key, color);
  }

  /* ---- small shared builders ----------------------------------------------
     `opt` draws the session-view's own `.lanepick` radio (Ed, 2026-08-18). The
     option's name is the pill's label; its explanation sits under it, and any
     settings the option carries appear only while it is chosen. */
  const opt = (S, key, val, ttl, exp, inner, off, extra) => {
    const on = S[key] === val;
    return '<div class="pick' + (on ? ' on' : '') + (off ? ' off' : '') + (extra || '') + '">' +
      '<button class="lanepick" aria-pressed="' + on + '"' + (off ? ' disabled' : '') +
      (off ? '' : ' data-set="' + key + '" data-val="' + val + '"') + '>' +
      '<span class="dot"></span><span>' + ttl + '</span></button>' +
      (exp ? '<span class="exp">' + exp + '</span>' : '') +
      (inner ? '<span class="inner">' + inner + '</span>' : '') + '</div>';
  };

  const num = (S, key, label, min, max, suffix) =>
    '<span class="fld"><label>' + label + '</label><span class="setrow">' +
    '<input class="num" type="number" data-num="' + key + '" value="' + S[key] + '" min="' + min + '" max="' + max + '">' +
    (suffix ? '<span class="setnote" style="margin:0">' + suffix + '</span>' : '') + '</span></span>';

  const someIn = (n, E) => (n >= E ? 'everyone in' : n + ' of ' + E + ' in');

  const faces = (roster, meName) => '<div class="faces">' + roster.map((p) =>
    '<span class="pf' + (p.n === meName ? ' me' : '') + '">' + avHtml(p) +
    esc(p.n) + (p.n === meName ? ' (you)' : '') + '</span>').join('') + '</div>';

  return { esc, TICK, initials, avHtml, avatarOptions, hueOf, washOf, railEntry,
    bandHtml, fitBand, pileHtml, stripHtml, cardHtml, readBody, watchBody, distHtml,
    nameBody, pictureBody, drawWire, opt, num, faces, someIn };
})();
