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
    // An uploaded picture is stored as 'u' + a data URL: the file never leaves
    // the browser, which is what lets a mockup have a real uploader in it
    // without inventing a face for anybody (Ed, 2026-08-18).
    if (pic && pic[0] === 'u') {
      return '<span class="' + c + ' photo" style="background-image:url(' + pic.slice(1) + ')"></span>';
    }
    if (pic && pic[0] === 'c') {
      return '<span class="' + c + '" style="background:' + GROUNDS[+pic.slice(1)] + '">' +
        esc(initials(person.n)) + '</span>';
    }
    if (pic && pic[0] === 'm') {
      const m = MARKS[+pic.slice(1)];
      return '<span class="' + c + '" style="background:' + m[0] + '">' +
        '<svg viewBox="0 0 44 44" aria-hidden="true">' + m[1] + '</svg></span>';
    }
    // nobody yet: a blank disc rather than initials of the word "undefined"
    if (!person || !person.n) return '<span class="' + c + '"></span>';
    return '<span class="' + c + '">' + esc(initials(person.n)) + '</span>';
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
     one pile, and members' in the pile below*).

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
      if (holds) return '<div class="setrow open" id="pile-' + g.key + '">' + cardFor(g) + '</div>';
      const left = g.cards.filter((c) => ctx.mustAct(c)).length;
      // **The heading is the people** (Ed, 2026-08-18: *"Convenor" heading gets a
      // name and picture under it as soon as they exist; "Membership" heading
      // gets the roster's names and pictures under it as those appear*). Which
      // turns the band at the head of the document from a list of settings into
      // *the room* — who is here, and what they have settled — and it costs
      // nothing, because both piles were already named after a holder and the
      // holder is a person or a set of them. Before anybody has a name it holds
      // a placeholder rather than nothing, so the shape of the row does not
      // change as people arrive.
      return '<div class="setrow" id="pile-' + g.key + '" data-pile="' + g.key + '">' + pileHtml(g.cards, ctx) +
        '<div class="pilelab"><span class="pilehead">' + esc(g.label) + '</span>' +
        (g.who ? '<div class="pilewho">' + g.who() + '</div>' : '') +
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
    // A card under motion wants you again even though it is settled, so the
    // class follows `mustAct` and the tick follows both.
    const done = ctx.settled(c) && !ctx.mustAct(c);
    const room = ctx.isRoom(c);
    const fill = room ? Math.min(100, Math.round((c.in || 0) / ctx.E * 100)) + '%' : '100%';
    return '<li class="qitem" data-q="' + c.k + '">' +
      '<button class="' + (ctx.mustAct(c) ? 'needs' : 'deciding') + '"' +
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
    // No heading of its own, for the reason `watchBody` gives below: the card
    // head has already said what this is about, and a second copy of the title
    // three lines under the first is the surest sign a body is not reading as
    // part of its own card. Caught 2026-08-18, on the one card whose title is a
    // question — which asked itself twice.
    return '<div class="lockline">' + TICK + '<span>' + esc(c.setBy || 'Set by the convenor when the document was made') +
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
      '<span>The members decide' + (done ? '' : ' — asked of everyone before drafting began, blind') + '.</span></div>' +
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

  /* **It is an uploader** (Ed, 2026-08-18). The card had offered a ground for
     your initials or a drawn mark, on the reasoning that a mockup has no
     business inventing faces — which is a good rule about *fixtures* and was
     the wrong rule for a *control*, because the thing a member will actually
     do here is give the room their own face. The file never leaves the page:
     it is read into a data URL and drawn, so the mockup invents nothing and
     still behaves like the real control. The initials stay underneath as a
     real answer rather than a fallback — most rooms run on them. */
  const pictureBody = (me) =>
    '<p class="why">The shape people will recognise you by in the membership and the presence row.</p>' +
    '<div class="picdrop">' + avHtml(me, 'big') +
    '<div class="picact">' +
    '<label class="btn">' + (me.pic && me.pic[0] === 'u' ? 'Choose another' : 'Choose a picture') +
    '<input type="file" accept="image/*" data-picfile="1"></label>' +
    (me.pic && me.pic[0] === 'u' ? '<button class="btn" data-pic="">Remove</button>' : '') +
    '<span class="picnote">or drag one onto this box</span></div></div>' +
    '<div class="eyebrow fieldlab">Or your initials</div>' +
    '<div class="avpick">' + avatarOptions().map((o) =>
      '<button class="avopt" data-pic="' + o.id + '" aria-pressed="' + ((me.pic || '') === o.id) + '"' +
      ' title="' + (o.id ? 'A ground for your initials' : 'Plain') + '">' +
      avHtml({ n: me.n, pic: o.id }, 'big') + '</button>').join('') + '</div>' +
    '<p class="setnote">Initials are a real answer, not a placeholder — most rooms run on them. Whichever you choose is how you appear in the room, and it is not authorship: whether your name sits beside a <i>proposal</i> is the disclosure rule, not this.</p>';

  /* ---- ordinary and constitutional ----------------------------------------
     **This is a constitution editor, and what we need to decide is which
     decisions are ordinary and which are constitutional** (Ed, 2026-08-18) —
     and then, in his own words, the test: **a constitutional decision is one
     that makes past decisions mean something different.** Everything follows
     from that sentence, and it is a structural test rather than a matter of
     taste, so the list can be derived rather than argued.

       **the disclosure family** — the clearest case. A judgment was cast under
       a promise about who would ever see it; changing the promise afterwards
       reaches back and breaks it. Same for the chamber: a rationale was written
       knowing who could read it.
       **quorum, and the bar** — every past judgment was cast knowing what it
       was being counted towards, and every past adoption means *this cleared
       that bar with that many people behind it*. Move either and the record
       stops saying what it said.
       **the roster** — quorum is a fraction of it, so adding or removing anybody
       silently re-rates every judgment already cast and every race still parked.
       Which is why an invitation is constitutional, and why a machine member is
       too: it is one more participant with a wallet.
       **whether it ends at all** — windowed to perpetual abolishes the ramp,
       and the ramp is the bar.

     Everything else is **ordinary**, and the same test says so: no past
     judgment means anything different because the title changed, or the link,
     or the end date, or the size of the wallet. A proposal to change one of
     those is a proposal like any other.

     And there are two routes, not one rule with a dial on it:

       **ordinary** — judged pairwise, adopted when it clears the document's
       bar with the document's quorum. The race this engine already is.
       **constitutional** — **the ceremony's question, asked again.** Each
       member states the least they will accept and the document takes the
       maximum, so the new answer satisfies every stated minimum by
       construction and nobody is bound by a rule they did not consent to. It
       is the same consent rule that escaped the constitutional bootstrap in
       the first place, and it is the only rule that can be run *on* the
       constitution without begging the question.

     Ed's first instinct was full quorum and full approval, and it lands in the
     same place — the consent rule *is* unanimity — but it gets there by
     construction rather than by collecting votes, and that difference is the
     whole point. A unanimity rule is still a vote, and a vote on the
     constitution has to be governed by the constitution: *by what quorum do you
     decide the quorum?* Taking the maximum of stated minimums has no vote in it
     to govern. Which also means the amendment rule and the founding rule are
     one rule, so the opening question is the amendment question — a constitutional
     motion simply makes that question live again, and there is no new object on
     the surface at all.

     A `motion` is the act; which route it takes is a fact about the setting.
     `personal` is neither — your name and your picture bind nobody, so there is
     nothing to pass. */
  const KIND = {
    constitutional: 'Constitutional',
    ordinary: 'Ordinary',
    personal: 'Yours alone',
  };
  const kindNote = {
    constitutional: 'Changing it would make past decisions mean something different, so it is not judged — the founding question is asked again, and the document takes the most demanding answer anybody gives.',
    ordinary: 'Changing it is an ordinary proposal — anybody may put one, and it carries if it clears the bar with quorum.',
    personal: 'Yours to change whenever you like. It binds nobody.',
  };

  /* An **ordinary motion in flight**: the value as it stands, the value as
     proposed, a `lane-bar` radio on each, the rationale behind a
     `sealed-speaker`. Nothing here is new — it is the decision card with a
     setting where the prose would be, which is the point.

     There is no constitutional equivalent of this function, and that is the
     good news: a constitutional motion re-opens the **ceremony question**, so
     the card that answers it is the one the surface already had. What a
     constitutional motion draws is `motionReopen` below — a line saying the
     question is live again — and then the ordinary consent control underneath
     it. */
  function motionBody(c, ctx, m) {
    const kind = m.kind || c.motionKind || c.kind || 'ordinary';
    const need = 'the bar, with quorum';
    const speaker = (why) => '<div class="speaker">' +
      '<span class="disc" aria-hidden="true" title="A member of the roster wrote this. Who, is sealed until the record (SPEC §3.4)."></span>' +
      (why ? '<div class="said">' + esc(why) + '</div>' : '<div class="said none">No reason given.</div>') +
      '</div>';
    const lane = (val, key, label) =>
      '<div class="propblock"><div class="eyebrow fieldlab">' + esc(label) + '</div>' +
      '<div class="rtext">' + esc(val) + '</div>' +
      '<div class="lanebar"><button class="lanepick" aria-pressed="' + (m.pick === key) + '"' +
      ' data-motion="' + key + '"><span class="dot"></span>' +
      '<span class="off">Prefer this</span><span class="on">Preferred</span></button></div></div>';
    return '<div class="unlocks"><b>' + esc(KIND[kind]) + '.</b> ' + kindNote[kind] +
      ' To carry, it needs ' + esc(need) + '.</div>' +
      lane(ctx.value(c), 'stands', 'As it stands') +
      lane(m.to, 'proposed', 'As proposed') +
      speaker(m.why) +
      '<p class="setnote">' + (m.judged || 0) + ' of ' + ctx.E + ' have judged it.</p>';
  }

  /* A **constitutional motion**, which is not a judgment and has no card of its
     own: somebody has asked to re-open a founding question, so the founding
     question is live again and you answer it exactly as you did at the ceremony.
     This band is the whole of the addition — everything below it is the consent
     control that was always there. */
  const motionReopen = (c, ctx, m) =>
    '<div class="unlocks"><b>Re-opened.</b> A member has asked the room to look at this again' +
    (m.why ? ' — <i>' + esc(m.why) + '</i>' : '') + '. ' +
    'It is constitutional, so nothing is being judged: you are asked what you will accept, ' +
    'as you were at the founding, and the document takes the most demanding answer. ' +
    'Until every one of the ' + ctx.E + ' has answered, what stands stands.</div>' +
    '<p class="setnote">' + (m.judged || 0) + ' of ' + ctx.E + ' have answered again. ' +
    'Your own previous answer is not carried over — it would anchor you to it.</p>';

  /* Writing one. The same `.lanebox` the `editing-card` writes a clause in,
     because a motion is a proposal and proposing is one gesture on this
     surface however small the thing being proposed. */
  const motionCompose = (c, ctx, draft) =>
    '<div class="unlocks">You are proposing a change to <b>' + esc(c.t) + '</b>. ' +
    kindNote[c.motionKind || c.kind || 'ordinary'] + '</div>' +
    // **What it costs, said where the price is paid** (Ed, 2026-08-18). An
    // ordinary motion is a proposal, so it costs an edit like every other
    // proposal — the wallet is what prices proposals, and one that cost nothing
    // would be one anybody could spam. A constitutional motion costs nothing,
    // and that is not an oversight: it is not a proposal against the text, it is
    // a member asking to be asked again about a rule that binds them. Charging
    // for that would price consent, which is the one thing here that must stay
    // free. What stops it being spammed is a limit rather than a price (Q327).
    '<p class="setnote">' + ((c.motionKind || c.kind) === 'constitutional'
      ? '<b>Free.</b> You are not proposing against the charter, you are asking the room to be asked again about a rule that binds you — and consent should not have a price.'
      : '<b>Costs one ✏️.</b> A motion is a proposal, so it is priced like every other proposal, and you get it back if you withdraw it.') + '</p>'
    + '<div class="propblock"><div class="eyebrow fieldlab">As it stands</div>' +
    '<div class="rtext">' + ctx.value(c) + '</div></div>' +
    '<div class="propblock"><div class="eyebrow fieldlab">As you would have it</div>' +
    '<div class="lanebox"><div class="lp editlane" contenteditable="plaintext-only" spellcheck="false"' +
    ' data-motionlane="to" data-ph="The value you are proposing">' + esc(draft.to || '') + '</div>' +
    '<div class="lp edit-why' + (draft.why ? '' : ' blank') + '" contenteditable="plaintext-only"' +
    ' spellcheck="false" data-motionlane="why" data-ph="We should change this because…">' +
    esc(draft.why || '') + '</div></div></div>';

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
    nameBody, pictureBody, drawWire, opt, num, faces, someIn,
    KIND, kindNote, motionBody, motionReopen, motionCompose };
})();
