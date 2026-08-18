/* ============================================================================
   setup.js — the machinery the two setup surfaces share.

   document-creation and founding-ceremony are the same screen seen by two
   people. The founder sets what is theirs to set and watches the room answer
   the rest; a member answers what the room was given and reads what the
   founder settled. Same document, same tab group at its head, same rail, same
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
     **The session-view's own grammar** (Ed, 2026-08-18: a setup task is a task
     like any on the live surface, so it speaks the same alphabet), with the
     palette's rule carried over whole: grey means nothing is being asked of
     you. Five states:

       ask   — the question is open and yours. Yellow, wearing its **subject
               glyph**: a setup rail is many questions in one state, so while
               they are asking, the informative mark is *which*.
       wait  — ⏳ grey: your part is done, or there is no part for you — the
               room is answering, the inbox holds the next move, a gate is
               waiting on the cards above it. It runs on without you.
       news  — a decision arrived: the room's number came back, a rule you
               never chose binds you, a gate opened. Drawn ✔ on the changed
               wash, pinned until you press OK — decided-but-unread is still
               asking for its OK, exactly as a sealed record is.
       yours — ✏️ blue: a thing of your own in flight — an application being
               judged. Asking nothing, settled never; you can always act on it.
       done  — drawn ✔, grey, and the entry leaves the rail. The subject glyph
               goes with the question (Ed: *they lose their custom emoji and
               just become ✔s*): all a settled tab has to say is *settled*,
               and which rule it was is the constitution block's job to name.

     mustAct still says what is being asked; waiting / news / yours are
     optional ctx predicates, so a surface without such states writes none. */
  const stateOf = (c, ctx) =>
    (ctx.yours && ctx.yours(c)) ? 'yours'
    : (ctx.news && ctx.news(c)) ? 'news'
    : (ctx.waiting && ctx.waiting(c)) ? 'wait'
    : ctx.mustAct(c) ? 'ask' : 'done';
  const HUE = { ask: 'open', wait: 'closed', news: 'changed', yours: 'yours', done: 'closed' };
  const hueOf = (c, ctx) => HUE[stateOf(c, ctx)];
  const washOf = (c, ctx) => {
    const h = hueOf(c, ctx);
    return { col: 'rgba(var(--lc-' + h + '), ' + (h === 'closed' ? '0.16' : '0.22') + ')',
      bg: 'rgba(var(--lc-' + h + '), 0.06)' };
  };
  /* The ✔ is drawn rather than an emoji plate for the session-view's own
     reason: one function draws it, so the columns cannot drift. */
  const markOf = (c, ctx, tab) => {
    const st = stateOf(c, ctx);
    // **A retired tab keeps its subject glyph** (Ed, 2026-08-18): the piles
    // stand in one place, hold the whole constitution, and most of what is
    // in them can still be acted on — they are a menu, and a menu of ✔s
    // names nothing. The grey wash still says settled; only the rail entry
    // retires to the drawn ✔, because an entry is leaving, not filing.
    if (tab && st === 'done') return c.g;
    return st === 'ask' ? c.g : st === 'wait' ? '⏳' : st === 'yours' ? '✏️' : TICK;
  };

  /* ---- the piles ----------------------------------------------------------
     **These are clause-tabs, and they pile like clause-tabs** (Ed, 2026-08-18,
     overruling the flat group of the morning: *I'd like all of these tabs to act
     like clause-tabs and pile like clause tabs. The founder's settings sit in
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
  const chipHtml = (c, ctx, o) => {
    const st = stateOf(c, ctx);
    return '<span class="achip st-' + st + (o.active ? ' wmark' : '') + (o.inert ? ' behind' : '') + '"' +
    (o.inert ? ' aria-hidden="true"' : ' role="button" tabindex="0" data-tab="' + c.k + '"') +
    ' style="--chiphue: var(--lc-' + HUE[st] + ')' + (o.z ? '; z-index:' + o.z : '') + '"' +
    (o.inert ? '' : ' title="' + esc(c.t + (o.active ? ' — close it'
      : st === 'ask' ? ' — waiting on you' : st === 'wait' ? ' — waiting on others'
      : st === 'news' ? ' — decided; it waits for your OK'
      : st === 'yours' ? ' — yours, being judged' : ' — settled')) + '"') +
    '><span aria-hidden="true">' + markOf(c, ctx, true) + '</span>' +
    (o.inert ? '' : '<span class="sr">' + esc(c.t) + '</span>') + '</span>';
  };

  /* **The front of a pile is what most wants you**, which is deliberately not
     the order the rail uses. The rail ranks by what must not be lost; a stack
     ranks by what is being asked — and you do not click into a pile to be shown
     something that is finished. Stable within each half, so the strip a card
     opens into is the pile expanded and the two never disagree about what sits
     where. */
  const RANK = { ask: 0, news: 1, yours: 2, wait: 3, done: 4 };
  const stackOrder = (cards, ctx) =>
    cards.slice().sort((a, b) => RANK[stateOf(a, ctx)] - RANK[stateOf(b, ctx)]);

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
      // **The constitution is document text** (Ed, 2026-08-18: *a distinct
      // paragraph for each decision, with the relevant tab to the left of
      // it*). A section rather than a pile: the heading, the people, the
      // intro lines, then one paragraph per decision stating the rule, its
      // tab standing in the gutter exactly as a clause-tab stands beside a
      // clause — and the open card replaces **its own paragraph**, taking
      // its own tab with it, so the tab you click does not move. The
      // membership stays a pile: it holds the people's tasks, not the
      // document's rules. Constitutional paragraphs come first; the
      // founder's ✏️-changeable settings follow, because the section is
      // read as a constitution and ends in housekeeping. `g.extra` lets a
      // surface state rules whose tab must live elsewhere (the ceremony's
      // room questions are tasks in the membership pile — one tab, one
      // card — so their rule appears here as a tabless paragraph).
      // **The constitution has sections, and the members' choices stand in
      // them** (Ed, 2026-08-18: *they're choices to be made BY THE MEMBERS
      // about the constitution, so they become tasks for members associated
      // with the relevant constitutional section. These sections should
      // each have proper subtitles, with the appropriate text underneath*).
      // Each section: a subtitle, a line of prose saying what it governs,
      // then one paragraph per decision with its tab to the left — and a
      // decision the room answers is **the same paragraph wearing the
      // task's tab**, because the rule and the question about it are one
      // object standing in one place. ctx.tasksFor lets a surface hang a
      // member's own answer-task under the setting it answers (the
      // founder's surface: the setting watches, the answer asks).
      if (g.sections) {
        // **A decision is a complete sentence describing the constitutional
        // state, open or decided** (Ed, 2026-08-18: *'Founder is deciding
        // when the drafting process will end.' … 'The drafting process
        // will end on Thursday at 18:00.' Only use subheadings as needed;
        // they aren't part of the decisions themselves*). No per-decision
        // heading — the rail keeps the question titles; the document
        // states rules — and ctx.decisionLine supplies the sentence from
        // its reader's side of the table.
        const para = (c) => (ctx.open === c.k
          ? '<div class="cpara open">' + cardFor({ ...g, cards: [c] }) + '</div>'
          : c.inDoc ? ''  // the document displays this itself (the title heading)
          : '<div class="cpara"><span class="chipcol">' + chipHtml(c, ctx, {}) + '</span>' +
            '<div class="cptext"><p class="cpv">' +
            (ctx.decisionLine ? ctx.decisionLine(c) : ctx.summary(c)) + '</p></div></div>');
        const withTasks = (c) => para(c) +
          (ctx.tasksFor ? ctx.tasksFor(c).map(para).join('') : '');
        const H = { para, chip: (c) => chipHtml(c, ctx, {}),
          pile: (cards) => pileHtml(cards, ctx),
          paraWith: (c, sibs) => (ctx.open === c.k
            ? '<div class="cpara open">' + cardFor({ ...g, cards: sibs }) + '</div>' : ''),
          tasks: (c) => (ctx.tasksFor ? ctx.tasksFor(c).map(para).join('') : '') };
        const wants = g.sections.reduce((n, sec) => n + sec.cards
          .reduce((m, c) => m + (ctx.mustAct(c) ? 1 : 0) +
            (ctx.tasksFor ? ctx.tasksFor(c).filter((t) => ctx.mustAct(t)).length : 0), 0), 0);
        return '<div class="setrow constsec" id="pile-' + g.key + '">' +
          '<div class="pilelab"><span class="pilehead" id="cs-constitution">' + esc(g.label) + '</span>' +
          (g.intro ? g.intro() : '') + '</div>' +
          // **the link stands right at the top, under the Constitution
          // heading** (Ed, 2026-08-18) — the document's address is the
          // first thing the constitution states
          (g.lead ? g.lead(H) : '') +
          // a section may compose its own body from the shared helpers —
          // the Membership section does (Ed, 2026-08-18: a Members
          // subsection that is the list itself, an Applications subsection
          // with the applicants under it) — everything else takes the
          // default run of decision paragraphs
          // the constitution is document text, so its headings are the
          // document's own (Ed, 2026-08-18): sections at lvl2, subsections
          // at lvl3, state lines plain paragraphs — only avatars and names
          // keep their compact dress
          g.sections.filter((sec) => !sec.railOnly).map((sec) => '<div class="csec">' +
            '<h2 class="docline lvl2" id="cs-' + sec.key + '">' + esc(sec.title) + '</h2>' +
            (sec.text ? '<p class="csintro">' + sec.text + '</p>' : '') +
            (sec.who ? '<div class="pilewho">' + sec.who() + '</div>' : '') +
            (sec.body ? sec.body(H) : sec.cards.map(withTasks).join('')) +
            (sec.block ? sec.block() : '') + '</div>').join('') +
          '<span class="pilen">' + esc(g.note(wants)) + '</span>' +
          // **the starting text is a task beside the text proper** (Ed,
          // 2026-08-18): a zero-height anchor at the band's end, its 📄 tab
          // hanging in the gutter beside the first block of the prose that
          // follows
          (g.textAnchor ? g.textAnchor(H) : '') + '</div>';
      }
      const holds = g.cards.some((c) => ctx.open === c.k);
      if (holds) return '<div class="setrow open" id="pile-' + g.key + '">' + cardFor(g) + '</div>';
      const left = g.cards.filter((c) => ctx.mustAct(c)).length;
      // **The heading is the people** (Ed, 2026-08-18: *"Founder" heading gets a
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
        // the Constitution heading carries a statement of itself — the
        // constitutional settings' current values, legible without opening
        // a single tab (Ed, 2026-08-18)
        (g.block ? g.block() : '') +
        '<span class="pilen">' + esc(g.note(left)) + '</span></div></div>';
    }).join('');
  }

  /* A pile may reach down as far as the next thing in the band and no further,
     which is `fitStacks` doing the same job one column over; and a row is never
     shorter than the pile standing beside it, because there is no clause here to
     give it a height of its own. */
  function fitBand(band) {
    if (!band) return;
    band.querySelectorAll('.setrow:not(.constsec)').forEach((row) => {
      const col = row.querySelector('.chipcol');
      if (!col) return;
      const n = col.children.length;
      if (n > 1) col.style.setProperty('--peek', Math.max(1.5, Math.min(4, 60 / (n - 1))).toFixed(2) + 'px');
      row.style.minHeight = Math.ceil(col.getBoundingClientRect().height + 8) + 'px';
    });
    // **The rule does not move when its card opens** — session-view's own
    // discipline, by session-view's own means: measurement, not a constant
    // (Ed, 2026-08-18: *can we re-use infrastructure from the session-view?*).
    // A closed paragraph tells us where text sits inside a .cpara; the open
    // card is shifted until its head-rule sits at exactly that offset. Runs
    // before the strip alignment below, which re-measures against the moved
    // card.
    band.querySelectorAll('.cpara.open > .setupcard').forEach((card) => {
      const rule = card.querySelector('.clausehead .rtext.headrule');
      if (!rule) return;
      const holder = card.parentElement;
      const ref = holder.closest('.constsec')?.querySelector('.cpara:not(.open):not(.textanchor) .cpv');
      if (!ref) return;
      const want = ref.getBoundingClientRect().top - ref.closest('.cpara').getBoundingClientRect().top;
      card.style.marginTop = '';
      const have = rule.getBoundingClientRect().top - holder.getBoundingClientRect().top;
      if (Math.abs(have - want) > 0.5) {
        card.style.marginTop = ((parseFloat(getComputedStyle(card).marginTop) || 0) + (want - have)).toFixed(1) + 'px';
      }
    });
    // the card grows to hold its strip: a floor, not a height, so the card is
    // still as tall as what it says and the strip only stops it being shorter
    band.querySelectorAll('.setupcard').forEach((card) => {
      card.style.minHeight = '';
      const col = card.querySelector('.chipcol');
      if (!col) return;
      // **The tab you clicked does not move.** The strip is positioned against
      // the `.headclause`, which starts below the card's own label — so left
      // alone the first tab arrives a label's height lower than the pile front
      // it replaced. Measured rather than written as a constant, because the
      // label wraps on a narrow card and the distance is not a number anybody
      // can know in advance: the same move `fitStacks` makes in the gutter.
      col.style.top = '';
      const want = card.getBoundingClientRect().top + 2.4;
      const have = col.getBoundingClientRect().top;
      if (Math.abs(have - want) > 0.5) {
        col.style.top = (parseFloat(getComputedStyle(col).top || 0) + (want - have)).toFixed(1) + 'px';
      }
      const r = card.getBoundingClientRect();
      const need = col.getBoundingClientRect().bottom - r.top + 14;
      if (need > r.height) card.style.minHeight = Math.ceil(need) + 'px';
    });
  }

  /* ---- the rail entry -----------------------------------------------------
     The same object session-view's queue draws, and since Ed's grammar pass
     (2026-08-18) the mark column says the **state** — the subject glyph is the
     mark only while the question is asking. `--fill` is the completion bar:
     100% for anything only yours to decide, how far the room has got on
     anything that is theirs, and how far judging has got on a thing of yours
     in flight (a surface may override it with ctx.fillOf). */
  function railEntry(c, ctx) {
    const w = washOf(c, ctx);
    const st = stateOf(c, ctx);
    const room = ctx.isRoom(c);
    const fill = ctx.fillOf ? ctx.fillOf(c)
      : room ? Math.min(100, Math.round((c.in || 0) / ctx.E * 100)) + '%' : '100%';
    return '<li class="qitem" data-q="' + c.k + '">' +
      '<button class="' + (st === 'ask' || st === 'news' ? 'needs' : 'deciding') + ' st-' + st + '"' +
      ' data-card="' + c.k + '" data-washkey="set:' + c.k + '"' +
      ' aria-current="' + (ctx.open === c.k) + '"' +
      ' title="' + esc(room ? (c.in || 0) + ' of ' + ctx.E + ' have answered' : c.t) + '"' +
      ' style="--washcol: ' + w.col + '; --washbg: ' + w.bg + '; --fill: ' + fill + '">' +
      '<span class="ql"><span class="subj" aria-hidden="true">' + markOf(c, ctx) + '</span>' +
      '<span class="qt">' + esc(c.t) + '</span></span>' +
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
    // **The kind line left the card heads** (Ed, 2026-08-18: *this
    // information is conveyed through the controls on the card*): a
    // constitutional change commits with the 🏛️ hold, and a reserved
    // change the membership passes ends at the founder's 👑 question —
    // so an eyebrow restating either was chrome.
    return '<div class="sugg setupcard quick-open" role="tabpanel" data-setupcard="' + c.k + '">' +
      '<div class="clausehead">' +
      '<div class="headclause">' + stripHtml(siblings || [c], ctx) +
      // **The head is the rule, not the title**, where a surface says so
      // (Ed, 2026-08-18, the Applications example): the card's first line
      // is the same sentence that stood on the page, exactly where it was
      // — the decision-card gesture, with a rule for a clause.
      (ctx.headFor && ctx.headFor(c)
        ? '<div class="rtext headrule">' + ctx.headFor(c) + '</div>'
        : '<h2 class="rtext">' + esc(c.t) + '</h2>') +
      // **The clause a setting card opens from can be a thing, not a line**
      // (Ed, 2026-08-18): the membership card keeps the membership list at
      // its head, because the list IS the clause — the current text of the
      // rule being decided about — exactly as a decision card keeps its
      // paragraph. Any card may supply one through ctx.clauseFor.
      (ctx.clauseFor ? (ctx.clauseFor(c) || '') : '') + '</div></div>' +
      '<div class="field">' + body + '</div>' +
      '<div class="race-mid commitrow">' + foot + '</div></div>';
  }

  /* ---- the bodies that are the same on both surfaces ----------------------- */

  /* What a **member** sees when they open one of the founder's cards, and what
     anybody sees once a setting is closed: the value, and who it came from.
     Read-only is not the same as hidden — the whole point of the tab group is
     that the constitution is legible to everyone it binds. */
  function readBody(c, ctx) {
    // No heading of its own, for the reason `watchBody` gives below: the card
    // head has already said what this is about, and a second copy of the title
    // three lines under the first is the surest sign a body is not reading as
    // part of its own card. Caught 2026-08-18, on the one card whose title is a
    // question — which asked itself twice.
    return '<div class="lockline">' + TICK + '<span>' + esc(c.setBy || 'Set by the founder when the document was made') +
      // what changing it takes is the kind, said plainly — “fixed for the
      // life of the document” predated motions and was simply false
      (c.kind === 'constitutional'
        ? '. 🏛️ Changing it means asking everyone again.'
        : '. ✏️ Anybody may propose changing it, any time.') + '</span></div>' +
      '<div class="statline"><span class="k">Set to</span><span class="v">' +
      ctx.value(c) + '</span></div>' +
      (c.readNote ? '<p class="setnote">' + c.readNote + '</p>' : '');
  }

  /* What the **founder** sees when they open a card they handed to the room —
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
        '<p class="setnote">Nobody sees anybody’s answer until every one is in — you included. Only the count can show without anchoring the rest.</p>';
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
     question for a founder and for a member. */
  const nameBody = (me, opts) =>
    '<p class="why">What other people call you here. It is not authorship: who proposed what is settled by the disclosure rule, and under most of its settings your name never appears beside a proposal at all — a document showing fourteen named people and not one named candidate is the usual case.</p>' +
    '<div class="idrow">' + avHtml(me, 'big') +
    '<span class="fld"><label for="myname">Your name</label>' +
    '<input id="myname" data-txt="myname" value="' + esc(me.n || '') + '" placeholder="Your name"></span></div>' +
    '<p class="setnote">Change it whenever you like; it is yours and it binds nobody.' +
    ((opts && opts.optional)
      ? ' You are not a member, so this is <b>optional</b> — an anonymous founder is a perfectly normal thing; leave it blank and the constitution simply shows no name.'
      : '') + '</p>';

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
  // The kind pair is glyphic on the surface (Ed, 2026-08-18): ✏️ already
  // means a proposal, so the word "ordinary" said the machinery twice; 🏛️
  // is the constitutional change, the ask-everyone route. "Ordinary" stays
  // engine vocabulary only — SPEC, code, never a card.
  const KIND = {
    constitutional: '🏛️ Constitutional',
    ordinary: '✏️ Open to proposals',
    personal: 'Yours alone',
  };
  const kindNote = {
    constitutional: 'Changing it would make past decisions mean something different, so it is not judged — the founding question is asked again, and the document takes the most demanding answer anybody gives.',
    ordinary: 'Anybody may propose changing it, any time; it carries if it clears the approval threshold with quorum.',
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
    const kind = m.kind || routeFor(c, m.to);
    const need = 'the approval threshold, with quorum';
    const speaker = (why) => '<div class="speaker">' +
      '<span class="disc" aria-hidden="true" title="A member wrote this. Who, is sealed until the closing record."></span>' +
      (why ? '<div class="said">' + esc(why) + '</div>' : '<div class="said none">No reason given.</div>') +
      '</div>';
    const lane = (val, key, label) =>
      '<div class="propblock"><div class="eyebrow fieldlab">' + esc(label) + '</div>' +
      '<div class="rtext">' + esc(val) + '</div>' +
      '<div class="lanebar"><button class="lanepick" aria-pressed="' + (m.pick === key) + '"' +
      ' data-motion="' + key + '"><span class="dot"></span>' +
      '<span class="off">Prefer this</span><span class="on">Preferred</span></button></div></div>';
    return '<div class="unlocks"><b>' + esc(KIND[kind]) + '.</b> ' + kindNote[kind] +
      ' To carry, it needs ' + esc(need) + '.' +
      // **Reserved is assent, not silence** (Ed, 2026-08-18): the room may
      // pass a change to a reserved setting; what reservation means is that
      // it then goes to the founder as a 👑 question, theirs to accept or
      // reject.
      (kind === 'ordinary' && ctx.reserved && ctx.reserved(c)
        ? ' It is <b>reserved</b>: carrying does not change it by itself — it goes to the founder as a <b>👑 question</b>, theirs to accept or reject.'
        : '') + '</div>' +
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
  // **The route is a fact about the value, not about the card** (Ed, 329a,
  // 2026-08-18). One setting can be changed two ways: moving a closing date
  // changes nothing that has already happened, and removing the ending
  // abolishes the ramp and makes every past adoption mean something else. So
  // the card offers a `routeOf` and the compose form asks it about whatever is
  // currently typed — the note and the price flip as you write, which is also
  // the only honest way to tell somebody what they are about to set in motion.
  const routeFor = (c, v) => (c.routeOf ? c.routeOf(v || '') : (c.motionKind || c.kind || 'ordinary'));

  const motionCompose = (c, ctx, draft, control) =>
    '<div class="unlocks">You are proposing a change to <b>' + esc(c.t) + '</b>. ' +
    kindNote[routeFor(c, draft.to)] + '</div>' +
    // **What it costs, said where the price is paid** (Ed, 2026-08-18). An
    // ordinary motion is a proposal, so it costs an edit like every other
    // proposal — the wallet is what prices proposals, and one that cost nothing
    // would be one anybody could spam. A constitutional motion costs nothing,
    // and that is not an oversight: it is not a proposal against the text, it is
    // a member asking to be asked again about a rule that binds them. Charging
    // for that would price consent, which is the one thing here that must stay
    // free. What stops it being spammed is a limit rather than a price (Q327).
    (c.routeOf ? '<p class="setnote">' + esc(c.routeNote || '') + '</p>' : '') +
    '<p class="setnote">' + (routeFor(c, draft.to) === 'constitutional'
      ? '<b>Free — and one at a time.</b> You are asking the room to be asked again about a rule that binds you, and consent should not have a price. What keeps it from being constant is a limit, not a charge: each member may have <b>one 🏛️ out at once</b>, back in hand the moment it settles or is withdrawn. Putting it is a <b>full ten-second hold</b> — long enough to mean it.'
      : '<b>Costs one ✏️.</b> A motion is a proposal, so it is priced like every other proposal, and you get it back if you withdraw it.') + '</p>'
    + (routeFor(c, draft.to) === 'ordinary' && ctx.reserved && ctx.reserved(c)
      ? '<p class="setnote">This setting is <b>reserved</b>: carrying at the threshold does not change it by itself — it goes to the founder as a <b>👑 question</b>, theirs to accept or reject.</p>'
      : '')
    + '<div class="propblock"><div class="eyebrow fieldlab">As it stands</div>' +
    '<div class="rtext">' + ctx.value(c) + '</div></div>' +
    '<div class="propblock"><div class="eyebrow fieldlab">As you would have it</div>' +
    (control ? control(draft) +
      '<div class="lanebox"><div class="lp edit-why' + (draft.why ? '' : ' blank') + '"' +
      ' contenteditable="plaintext-only" spellcheck="false" data-motionlane="why"' +
      ' data-ph="We should change this because…">' + esc(draft.why || '') + '</div></div>'
     : '<div class="lanebox"><div class="lp editlane" contenteditable="plaintext-only" spellcheck="false"' +
      ' data-motionlane="to" data-ph="The value you are proposing">' + esc(draft.to || '') + '</div>' +
      '<div class="lp edit-why' + (draft.why ? '' : ' blank') + '" contenteditable="plaintext-only"' +
      ' spellcheck="false" data-motionlane="why" data-ph="We should change this because…">' +
      esc(draft.why || '') + '</div></div>') + '</div>';


  /* ---- the consent controls, shared -----------------------------------------
     Moved out of founding-ceremony.html when Q344 closed (Ed, 2026-08-18): a
     drafter-founder answers the questions they delegated on their own surface,
     so the controls a member answers with are now vocabulary both surfaces
     speak — and two copies of a consent slider would drift like everything
     else. `A` is the answers object (the ceremony passes its S, the founder
     surface passes S.myAns), so one control serves both without either surface
     leaking its state shape into the other. Ladder rungs write `data-ans`
     rather than opt()'s `data-set`, because on the founder surface data-set
     already means "set the delegation", and one attribute must not mean two
     things on one page. */
  const slider = (A, key, min, max, fmt, mean, step) => {
    const v = A[key], st = step || 1;
    const at = (v === null ? Math.round((min + max) / 2 / st) * st : v);
    return '<div class="cs' + (v === null ? ' unset' : '') + '">' +
      '<div class="csval' + (v === null ? ' unset' : '') + '">' + (v === null ? 'Drag to answer' : fmt(v)) + '</div>' +
      '<input type="range" min="' + min + '" max="' + max + '" step="' + st + '" value="' + at + '"' +
      ' style="--n:' + Math.max(1, Math.round((max - min) / st)) + ';--pct:' + (v === null ? 0 : (v - min) / (max - min) * 100) + '"' +
      ' data-slide="' + key + '">' +
      '<div class="csends"><span>' + fmt(min) + '</span><span>' + fmt(max) + '</span></div>' +
      '<div class="csmean">' + (v === null ? mean(min) + '<br>' + mean(max) : mean(v)) + '</div></div>';
  };

  const ansRow = (on, key, val, ttl, exp, extra, inner) =>
    '<div class="pick' + (on ? ' on' : '') + (extra || '') + '">' +
    '<button class="lanepick" aria-pressed="' + !!on + '" data-ans="' + key + '" data-ansval="' + esc(String(val)) + '">' +
    '<span class="dot"></span><span>' + ttl + '</span></button>' +
    (exp ? '<span class="exp">' + exp + '</span>' : '') +
    (inner ? '<span class="inner">' + inner + '</span>' : '') + '</div>';

  // rungs *above* your answer are dimmed rather than hidden — "the most I will
  // accept" only reads as a ladder if you can see what you are refusing.
  // String() on both sides because the machines question stores booleans, and
  // 'false' === false is how its rung quietly never lit (found in this move).
  const ladder = (A, key, rungs) => '<div class="choice" role="radiogroup">' + rungs.map((r, i) => {
    const at = rungs.findIndex((x) => String(x.v) === String(A[key]));
    return ansRow(String(A[key]) === String(r.v), key, r.v, r.t, r.e, (at >= 0 && i > at) ? ' above' : '');
  }).join('') + '</div>';

  const BLINDNOTE = '<p class="blindnote">Nobody sees your answer, and you will see nobody else’s until every one of them is in.</p>';

  /* One body per delegable question — the copy a member answers against,
     identical on both surfaces because it is the same question. */
  const ANSWER = {
    quorum: (A, E, form) => {
      const share = form === 'share';
      const asN = (v) => (share ? Math.max(1, Math.ceil(v / 100 * E)) : v);
      const mean = (v) => (asN(v) >= E
        ? 'Nothing moves unless every member has weighed in. A charter that cannot change without all of them is a perfectly reasonable thing to want.'
        : asN(v) <= Math.ceil(E / 4) ? 'A small part of the room can carry a change while the rest are elsewhere.'
        : 'Rather more than half the room has to have looked at a question before it can move.');
      return '<p class="why">How many ' + (E >= 2 ? 'of the ' + E : 'of the membership') + ' must weigh in before a question can change the charter — short of that it waits; silence is never a vote. Asked as a <b>' + (share ? 'share of the membership' : 'count') + '</b>: the wording is the founder’s, the number is the room’s.</p>' +
      (share
        ? slider(A, 'quorum', 5, 100, (v) => v + '% — ' + asN(v) + ' of ' + E, mean, 5)
        : slider(A, 'quorum', 1, E, (v) => v + ' of ' + E, mean)) +
      '<p class="blindnote">Nobody sees your answer. The charter takes the <b>highest</b> given, so it is never lower than yours.</p>';
    },
    bar: (A) =>
      '<p class="why">How sure the room must be that a new wording beats the one it replaces, <b>at the close, where an adoption is permanent</b>. A confidence, not a vote share. Everything earlier can still be challenged, so this one number covers the whole way; how it climbs is the founder’s pacing.</p>' +
      slider(A, 'bar', 50, 95, (v) => v + '%', (v) =>
        v >= 85 ? 'Only near-agreement changes anything. Expect the charter to move slowly and keep most of what it started with.'
        : v <= 60 ? 'A modest preference is enough. The charter will move quickly, and reverse itself more often.'
        : 'A clear preference is needed, but not agreement.', 5) +
      '<p class="blindnote">Nobody sees your answer. The charter takes the <b>highest</b> given.</p>',
    authorship: (A) =>
      '<p class="why">Rationales are always visible; what varies is whether a name is attached. The <b>most private</b> answer wins: one person who wants no names keeps the charter unnamed.</p>' +
      ladder(A, 'authorship', [
        { v: 'anonymous', t: 'Nobody’s name, ever', e: 'Not during the session and not in the closing record.' },
        { v: 'sealed', t: 'Names at the close', e: 'Hidden while the charter is being written; published with the record.' },
        { v: 'public', t: 'Names from the start', e: 'Everyone can see who proposed what, as it happens.' }]) +
      '<p class="blindnote">Nothing is preselected — anonymity holds unless everyone is content with more.</p>',
    signing: (A) =>
      '<p class="why">Whether an author may put their name to a proposal that is otherwise unattributed.</p>' +
      ladder(A, 'signing', [
        { v: 'nobody', t: 'Nobody signs', e: 'The only setting under which an unsigned proposal says nothing about whoever wrote it.' },
        { v: 'each', t: 'Each author chooses', e: 'An unsigned proposal among signed ones says something.' },
        { v: 'everybody', t: 'Everybody signs', e: 'Uniform in the other direction.' }]) + BLINDNOTE,
    judgments: (A) =>
      '<p class="why">Never revealed while a question is live, whichever is chosen — a room that can read itself judges itself. This settles only whether they are published with the closing record.</p>' +
      ladder(A, 'judgments', [
        { v: 'never', t: 'Never revealed', e: 'What you preferred stays yours, permanently.' },
        { v: 'after', t: 'Revealed once the decision is made', e: 'Published with the record, never before it.' }]) + BLINDNOTE,
    chamber: (A) =>
      '<p class="why">Who may read the charter besides the members — readers only, never counted. The <b>most private</b> answer wins: one member who wants the room closed closes it.</p>' +
      ladder(A, 'chamber', [
        { v: 'closed', t: 'Members only', e: 'Nobody outside the membership sees anything at all.' },
        { v: 'link', t: 'Anyone with the link', e: 'The chamber view only, to whoever the link reaches.' },
        { v: 'public', t: 'Public', e: 'Listed and readable by anyone.' }]) + BLINDNOTE,
    machines: (A) =>
      '<p class="why">An AI that patrols the document for drift and proposes fixes — it never judges, and counts toward no quorum; its proposals compete on the same terms as anybody’s. The <b>most restrictive</b> answer wins: if you would rather not have AI proposals, they stay out.</p>' +
      ladder(A, 'machines', [
        { v: false, t: 'No AI proposals', e: 'People write everything in this charter.' },
        { v: true, t: 'AI proposals are fine', e: 'They compete on the same terms as anybody’s and can be out-judged like anybody’s.' }]) + BLINDNOTE,
    ending: (A) =>
      '<p class="why">When the document should close. The <b>latest</b> answer anybody gives is taken, and <b>never</b> is the latest of all — so nobody is cut off before they were ready.</p>' +
      '<div class="choice" role="radiogroup">' +
      ansRow(A.ending !== null && A.ending !== 'never', 'ending', 'date', 'At a set time', '',
        '', '<span class="fld"><label>Ends</label><input type="datetime-local" data-ansdate="ending"' +
        (A.ending && A.ending !== 'never' ? ' value="' + esc(A.ending) + '"' : '') + '></span>') +
      ansRow(A.ending === 'never', 'ending', 'never', 'Never', 'It runs until it is frozen.') +
      '</div>' + BLINDNOTE,
    lapse: (A) =>
      '<p class="why">Whether a membership <b>lapses</b> after a period of inactivity — and how long. A lapsed member leaves the quorum base like an abstainer: the room can finish without them, their judgments keep counting, and coming back is just logging in. They are warned by email first, and sent the document and record when it happens.</p>' +
      '<span class="fld"><label>The shortest period of inactivity you will accept</label>' +
      '<span class="setrow2"><input class="num" type="number" min="7" max="365"' +
      ' data-ansnum="lapse"' + (typeof A.lapse === 'number' ? ' value="' + A.lapse + '"' : '') + '>' +
      '<span class="setnote" style="margin:0">days</span></span></span>' +
      ansRow(A.lapse === 'never', 'lapse', 'never', 'Never', 'Memberships do not lapse, however long inactive.') +
      '<p class="blindnote">Nobody sees your answer. The charter takes the <b>longest</b> asked for, <b>never</b> the longest of all.</p>',
    grant: (A) =>
      '<p class="why">The fewest ✏️s you would accept being given to start with. The charter takes the <b>most generous</b> answer.</p>' +
      '<span class="fld"><label>✏️s to start with</label><input class="num" type="number" min="0" max="40"' +
      ' data-ansnum="grant"' + (A.grant !== null ? ' value="' + A.grant + '"' : '') + '></span>' + BLINDNOTE,
    drip: (A) =>
      '<p class="why">The slowest return you would accept — ✏️s given back per tenth of the window. The charter takes the <b>fastest</b> answer.</p>' +
      '<span class="fld"><label>✏️s back per 10%</label><input class="num" type="number" min="0" max="10"' +
      ' data-ansnum="drip"' + (A.drip !== null ? ' value="' + A.drip + '"' : '') + '></span>' + BLINDNOTE,
  };

  /* ---- the mails -----------------------------------------------------------
     Templates as data (soon enough these are real emails; the words must not
     be tangled into a view) and one modal that stands for the reader's inbox.
     Its styles live in setup.css behind a NOT-DESIGN-SYSTEM fence: the mail
     previews another medium, and its look must owe nothing to this surface. */
  const MAILS = {
    verify: (title, to) => ({
      to, from: 'docs.vote',
      subject: 'Log in to create “' + title + '”',
      body: 'You have created a document called <b>' + esc(title) + '</b> on docs.vote.',
      action: 'Log in to create it',
    }),
    applyVerify: (title, to) => ({
      to, from: 'docs.vote',
      subject: 'Log in to continue your application',
      body: 'You are applying to join <b>' + esc(title) + '</b> on docs.vote. This address will be your identity there.',
      action: 'Log in to continue',
    }),
  };
  function renderMailModal(open, mail) {
    let el = document.getElementById('mailmodal');
    if (!open) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'mailmodal'; document.body.appendChild(el); }
    el.innerHTML = '<div class="mailwin" role="dialog" aria-label="Email">' +
      '<div class="mw-head"><span>' + esc(mail.from) + '</span><span>to ' + esc(mail.to) + '</span>' +
      '<button data-mailclose="1" title="Close">✕</button></div>' +
      '<div class="mw-subj">' + esc(mail.subject) + '</div>' +
      '<div class="mw-body"><p>' + mail.body + '</p>' +
      '<a class="mw-act" data-act="clickmail">' + esc(mail.action) + '</a></div></div>';
  }

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

  return { esc, TICK, initials, avHtml, avatarOptions, hueOf, washOf, stateOf, markOf, railEntry,
    bandHtml, fitBand, pileHtml, stripHtml, cardHtml, readBody, watchBody, distHtml,
    nameBody, pictureBody, drawWire, opt, num, faces, someIn,
    KIND, kindNote, motionBody, motionReopen, motionCompose, routeFor,
    slider, ladder, ANSWER, BLINDNOTE, MAILS, renderMailModal };
})();
