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

  if (!window.CARDS) throw new Error('cards.js must load before setup.js');
  // The shared card grammar (cards.js), bound for the setup surfaces:
  // motion-judging radios speak data-motion, their "suggestion" is the
  // motion object with its live pick merged in by the surface, and the
  // seal tooltip carries the audited copy (no spec citations on cards).
  const CB = window.CARDS.make({
    valAttr: 'data-motion',
    pickOf: (m) => (m ? m.pick : null),
    speakerTitle: 'A member wrote this. Who, is sealed until the closing record.',
  });
  // Full five-character escaping (PRODUCTION.md stage 3, defect 4): esc'd
  // strings land in attribute values (titles, tooltips, data-*) as well as
  // text, and an unescaped quote in an attribute is an injection. For text
  // nodes the extra entities parse back to the identical DOM.
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const TICK = '<svg class="mkg" viewBox="0 0 12 12"><path d="M2 6.4 L4.7 9.2 L10 2.9"/></svg>';
  // **The answer ladders speak the clause** (Q1112 (b)): a rung says the
  // sentence that answer would put into the document, off `cards.js`'s one
  // table — the same string the founder's own card and the composer's lane
  // print, so a value cannot read two ways depending on who is looking.
  // `escaped`, because a rung's text is written into markup unescaped by
  // `ansRow`, as every other rung label here is.
  // `x` is the clause context the surface hands the answer bodies as their
  // sixth argument: the two settings whose sentence names a fact outside
  // itself — 🌍's clerk deviation, 🤝's price — read it, the rest ignore it.
  const RULE = (k, v, x) => esc(window.CARDS.clauseOf(k, v, x));
  /* ---- avatars ------------------------------------------------------------
     `initials`, `PERSON` and `avHtml` moved down to `cards.js` (backlog 255):
     the sealed speaker draws a face now, `cards.js` loads first, and a helper
     two files share belongs in the lower of them rather than being reached for
     sideways at call time. They are re-exported on `SETUP` below, so every
     caller — `session-view.html`'s nineteen sites, `pictureBody`, the emoji
     grid — is unchanged, and the reasoning travelled with the code. */
  const { initials, avHtml } = window.CARDS;
  /* **`FACE_EMOJI` is the exemption list**, and nothing else since Q732 took
     the curated grid away. It used to be the People row of the picker *and*
     the set subtracted from the surface's vocabulary to make
     `RESERVED_EMOJI`; the grid is Unicode's now, but the subtraction has to
     stay — every one of these person-glyphs is also furniture somewhere on
     the surface, and without the exemption the picker would refuse a member
     the commonest faces there are. It is mirrored in `packages/server/src/
     faces.ts` and asserted byte-identical by the parity test, which reads
     this declaration with a regex: keep its shape. */
  const FACE_EMOJI = ['👩', '👨', '🧑', '👧', '👦', '🧒', '👶', '👵', '👴', '🧓',
    '👩‍🦰', '👨‍🦰', '🧑‍🦰', '👩‍🦱', '👨‍🦱', '🧑‍🦱',
    '👩‍🦲', '👨‍🦲', '🧑‍🦲', '👩‍🦳', '👨‍🦳', '🧑‍🦳',
    '👱‍♀️', '👱‍♂️', '👱', '👳‍♀️', '👳‍♂️', '👳',
    '🧔', '🧔‍♂️', '🧔‍♀️'];
  const FACE_TONES = ['', '\u{1F3FB}', '\u{1F3FC}', '\u{1F3FD}', '\u{1F3FE}', '\u{1F3FF}'];
  let FACE_TONE = '';
  const setFaceTone = (v) => { FACE_TONE = v; };
  const faceToned = (f) => {
    const cps = [...f];
    return cps[0] + FACE_TONE + cps.slice(1).join('');
  };
  const faceToneRow = () =>
    '<div class="avpick">' + FACE_TONES.map((tn) =>
      '<button class="avopt" data-tone="' + tn + '" aria-pressed="' + (FACE_TONE === tn) + '"' +
      ' title="Skin tone"><span class="emojiface grid">\u270B' + tn + '</span></button>').join('') + '</div>';
  // Any emoji may be a face EXCEPT the surface's own vocabulary (Ed,
  // 2026-08-19): a member whose face is ✏️ would turn every wallet and
  // compose button into a possible mention of them. SURFACE_EMOJI is a scan
  // of session-view.html + setup.js + session.js + fixture-session.js + cards.js for pictographic
  // characters (variation selectors stripped; re-run the scan from the
  // 2026-08-19 commit when the furniture changes); 🛡 arrived with the
  // governance tabs (Q454, 2026-08-21 — 🔧 and ⚙ left the vocabulary with
  // it); 🌡 🪜 🥾 arrived and 📈 🚪 left with the glyph rename of
  // 2026-08-22 (the threshold, the ramp and removal); 🍾 🥂 📨 were three the
  // scan had never been re-run for and joined it with Q734 (2026-08-23,
  // closing Q632) — a member whose face is 🍾 turns every mention of
  // beginning the document into a possible mention of them; the reserved set
  // is that minus the offered faces.
  // Tones are stripped before the test, so ✋🏽 is as reserved as ✋.
  const SURFACE_EMOJI = ('↔ ⏩ ⏰ ⏱ ⏳ ☑ ⚔ ⚖ ✅ ✉ ✋ ✍ ✏ ✒ ✔ ✖ ❄ ❌ ❎ ❓ ' +
    '🌍 🌡 🌶 🍾 🎩 🏛 🏷 👁 👋 👍 👑 👤 👥 💡 💤 📌 📍 📝 📧 📨 📬 📯 🔄 🔗 ' +
    '🔥 🖼 🗑 🗝 🛡 🤖 🤝 🥂 🥾 🪜 🪪 🪶 ' +
    '👦 👧 👨 👩 👱 👳 👴 👵 👶 🧑 🧒 🧓 🧔').split(' ');
  const normEmoji = (s) => s.replace(/[\u{FE0F}\u{FE0E}\u{1F3FB}-\u{1F3FF}]/gu, '');
  const RESERVED_EMOJI = new Set(SURFACE_EMOJI.filter((g) =>
    !FACE_EMOJI.some((f) => normEmoji(f) === g)));
  // Two members cannot wear one emoji — first come, first served (Ed,
  // 2026-08-19). Who already wears what is page state, so the test is a
  // hook the page installs (the wirePicDrop pattern): ('e'+emoji) → the
  // holder's name, or null. Exact match on the stored string — 👩🏻 and
  // 👩🏽 are visibly different people and both claimable.
  let FACE_TAKEN = () => null;
  const setFaceTaken = (fn) => { FACE_TAKEN = fn; };
  const faceTakenBy = (e2) => FACE_TAKEN(e2);
  /* The page had its own `emojiFaceOf` beside the server's, as the free
     input's validator: *Or any emoji* existed for a glyph the shortlist did
     not carry, and it had to be told what a face may be. Entry 186 removes
     the input — the grid is the whole of Unicode, so there is no such glyph —
     and the validator goes with it. `packages/server/src/faces.ts` keeps its
     own, which is the one that guards what is stored. */
  // **Reserved and taken are both greyed, in the picker itself** (Ed,
  // 2026-08-19: *a normal emoji picker, but with reserved and used emoji
  // greyed out*). The two refusals had lived only in the type-any-emoji box,
  // which meant the grid could offer you something it would then refuse.
  /* The grid's glyphs are `.emojiface.grid` — the size an emoji face takes on
     a member row (entry 186, Ed: *at the size they currently appear as
     avatars*), not the 38px `.emojiface.big` the shortlist wore. `.big` stays
     for the *Currently* line. */
  const faceBtn = (f2, ownPic, dataAttr, n) => {
    const own = (ownPic || '') === 'e' + f2;
    const hol = own ? null : FACE_TAKEN('e' + f2);
    const reserved = !own && RESERVED_EMOJI.has(normEmoji(f2));
    if (reserved) {
      return '<button class="avopt taken" disabled title="Reserved — docs.vote uses this one">' +
        avHtml({ n, pic: 'e' + f2 }, 'grid') + '</button>';
    }
    return hol
      ? '<button class="avopt taken" disabled title="Taken — ' + esc(hol) + ' got there first">' +
        avHtml({ n, pic: 'e' + f2 }, 'grid') + '</button>'
      : '<button class="avopt" ' + dataAttr + '="' + 'e' + f2 + '" aria-pressed="' + own + '"' +
        ' title="' + esc(f2) + '">' + avHtml({ n, pic: 'e' + f2 }, 'grid') + '</button>';
  };
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
  // **One wash ramp for both columns** (Q623 (a), 2026-08-22). The charter's
  // entries take their alpha from urgency — session.js's `washCol`, URG_LO at
  // no urgency to URG_HI at the most — where a setup entry took a fixed 0.22,
  // so the two families of entry in one rail wore two strengths. A surface
  // that knows an entry's urgency hands it over as `ctx.urgencyOf`; grey
  // entries keep 0.16, the charter's own closed alpha. The two constants
  // restate session.js:360 (`URG_LO`, `URG_HI`), which the SESSION export
  // does not carry.
  const URG_LO = 0.05, URG_HI = 0.30;
  const washOf = (c, ctx) => {
    const h = hueOf(c, ctx);
    const u = ctx.urgencyOf ? ctx.urgencyOf(c) : null;
    const a = h === 'closed' ? 0.16 : u == null ? 0.22 : URG_LO + (URG_HI - URG_LO) * u;
    return { col: 'rgba(var(--lc-' + h + '), ' + (+a.toFixed(3)) + ')',
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
    // **A constitutional question waiting on the room keeps its own glyph**
    // (Ed, 2026-08-21). ⏳ replaces the subject with a state, and the state
    // is one nobody can act on — the room is answering, and the reader is
    // either not being asked or has already answered. So the tab stays
    // *which rule it is*, on the grey the wait state already wears, and the
    // entry leaves the rail entirely (see the rail's own filter). ⏳ survives
    // where the wait is about **you**: 📧 waiting on your own verification,
    // a gate waiting on its conditions, 🍾 waiting on the founder.
    if (st === 'wait' && c.kind === 'constitutional') return c.g;
    // **A grant wears the glyph of the power it grants** (entry 180, Ed: *users
    // don't realise that anything will change when they click OK, it just looks
    // like information*). Every other news card is decided-and-owed-a-reading;
    // a grant's press hands you an object, so the tab and the rail entry alike
    // say *take this* rather than wearing the ✔ that means seen. `ask` still
    // wears the subject glyph (💡 while blocked shows 💡) and `done` is
    // untouched, so an acknowledged grant settles exactly as before.
    if (st === 'news' && c.grants) return c.grants;
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
     which is what leaves the head of the document holding the constitution —
     and since entry 72 (Q942, 2026-08-27) the pile also holds, behind the rule,
     one grey record chip per motion that passed or was rejected at that clause:
     the rule stays because it is the rule, and the motion files because it is
     history. Both halves of the 2026-08-18 sentence survive; what changed is
     that a pile may now hold more than the rule and its power tabs. */
  const chipHtml = (c, ctx, o) => {
    const st = stateOf(c, ctx);
    // `data-chip` names the card on every chip, clickable or not; `data-tab`
    // is the *click* hook and stays off the inert ones. Anything that needs to
    // find a tab's own paragraph reads `data-chip`, since a pile behind the
    // front tab has no other handle (the surface's `anchorOf`).
    return '<span class="achip st-' + st + (o.active ? ' wmark' : '') + (o.inert ? ' behind' : '') + '"' +
    ' data-chip="' + c.k + '"' +
    (o.inert ? ' aria-hidden="true"' : ' role="button" tabindex="0" data-tab="' + c.k + '"') +
    ' style="--chiphue: var(--lc-' + HUE[st] + ')' + (o.z ? '; z-index:' + o.z : '') + '"' +
    (o.inert ? '' : ' title="' + esc(c.t + (o.active ? ' — close it'
      : st === 'ask' ? ' — waiting on you' : st === 'wait' ? ' — waiting on others'
      : st === 'news' ? (c.grants ? ' — yours to take' : ' — decided; it waits for your OK')
      : st === 'yours' ? ' — yours, being voted on' : ' — settled')) + '"') +
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
        // **The governance tab group** (403, Ed 2026-08-19): a setting may
        // carry more than its own tab — ctx.chipsFor names the pile (the
        // value in front, the power tabs beneath), and opening any of them
        // opens its card at the setting's own paragraph with the whole
        // group as the strip.
        const para = (c) => {
          const chips = ctx.chipsFor ? ctx.chipsFor(c) : [c];
          const openHere = ctx.open === c.k || chips.some((x) => x.k === ctx.open);
          // data-para carries the decision's own key so a birth is
          // detectable across wholesale re-renders (Ed, 2026-08-19: new
          // sections fade in) — same key open or closed, so opening is
          // never mistaken for being born
          return openHere
            ? '<div class="cpara open" data-para="' + c.k + '">' + cardFor({ ...g, cards: chips }) + '</div>'
            : c.inDoc ? ''  // the document displays this itself (the title heading)
            // the lone tab is the **group's**, not necessarily the host's:
            // a group whose other members are not being served yet leaves one
            // chip standing on the host's paragraph, and it must be that one
            : '<div class="cpara" data-para="' + c.k + '">' + (chips.length > 1 ? pileHtml(chips, ctx)
              : '<span class="chipcol">' + (chips.length ? chipHtml(chips[0], ctx, {}) : '') + '</span>') +
              '<div class="cptext"><p class="cpv">' +
              (ctx.decisionLine ? ctx.decisionLine(c) : ctx.summary(c)) + '</p></div></div>';
        };
        const withTasks = (c) => para(c) +
          (ctx.tasksFor ? ctx.tasksFor(c).map(para).join('') : '');
        const H = { para, chip: (c) => chipHtml(c, ctx, {}),
          pile: (cards) => pileHtml(cards, ctx),
          paraWith: (c, sibs) => (ctx.open === c.k
            ? '<div class="cpara open">' + cardFor({ ...g, cards: sibs }) + '</div>' : ''),
          tasks: (c) => (ctx.tasksFor ? ctx.tasksFor(c).map(para).join('') : '') };
        // **the whole constitution folds** (Ed, 2026-08-19): its heading is
        // a heading like any other — folded, it keeps the heading and the
        // document text below; the surface decides (ctx.foldedGroup), so an
        // open card is never folded out from under its own tab
        const gFold = ctx.foldedGroup && ctx.foldedGroup(g);
        if (gFold) {
          return '<div class="setrow constsec" id="pile-' + g.key + '">' +
            // **A group with no label draws no heading** (Ed, 2026-08-21):
            // during the birth there is no constitution to head yet, so the
            // surface passes an empty label rather than this helper knowing
            // anything about phases. The fold control goes with it — there
            // is nothing to fold away at the birth.
            (g.label ? '<div class="pilelab"><span class="pilehead" id="cs-constitution">' +
              (ctx.groupToggle ? ctx.groupToggle(g) : '') + esc(g.label) + '</span></div>' : '') +
            (g.textAnchor ? g.textAnchor(H) : '') + '</div>';
        }
        return '<div class="setrow constsec" id="pile-' + g.key + '">' +
          (g.label ? '<div class="pilelab"><span class="pilehead" id="cs-constitution">' +
            (ctx.groupToggle ? ctx.groupToggle(g) : '') + esc(g.label) + '</span>' +
            (g.intro ? g.intro() : '') + '</div>' : '') +
          // **the link stands right at the top, under the Constitution
          // heading** (Ed, 2026-08-18) — the document's address is the
          // first thing the constitution states
          (g.lead ? g.lead(H) : '') +
          // an inDoc card (the title) has no paragraph and its section may
          // be rail-only, so its open card renders here, right under the
          // heading it opens from
          (ctx.inDocOpenSlot === false ? '' :
          (() => { const c0 = g.sections.flatMap((sec) => sec.cards)
            .find((c) => c.inDoc && ctx.open === c.k);
            return c0 ? '<div class="cpara open">' + cardFor({ ...g, cards: [c0] }) + '</div>' : ''; })()) +
          // a section may compose its own body from the shared helpers —
          // the Membership section does (Ed, 2026-08-18: a Members
          // subsection that is the list itself, an Applications subsection
          // with the applicants under it) — everything else takes the
          // default run of decision paragraphs
          // the constitution is document text, so its headings are the
          // document's own (Ed, 2026-08-18): sections at lvl2, subsections
          // at lvl3, state lines plain paragraphs — only avatars and names
          // keep their compact dress
          // **Headings fold** (Ed, 2026-08-19): the ▸ is session-view's own
          // sectoggle; a folded section keeps its heading and gives up its
          // body. The surface decides (ctx.foldedSec) so an open card can
          // never be folded out from under its own tab.
          g.sections.filter((sec) => !sec.railOnly).map((sec) => {
            const fold = ctx.foldedSec && ctx.foldedSec(sec);
            return '<div class="csec">' +
            '<h2 class="docline lvl2" id="cs-' + sec.key + '">' +
            (ctx.secToggle ? ctx.secToggle(sec) : '') + esc(sec.title) + '</h2>' +
            (fold ? '' :
            (sec.text ? '<p class="csintro">' + sec.text + '</p>' : '') +
            // a section's own opening paragraph (the Proposals preamble,
            // Ed 2026-08-19) — constitution text, not an intro line
            (sec.lead ? sec.lead(H) : '') +
            (sec.who ? '<div class="pilewho">' + sec.who() + '</div>' : '') +
            (sec.body ? sec.body(H) : sec.cards.map(withTasks).join('')) +
            (sec.block ? sec.block() : '')) + '</div>'; }).join('') +
          // **the charter heading at the band's end** (Ed, 2026-08-18; backlog
          // 204): the hairline and the document's own name — the text's 📝
          // tab rides beside it in the surface's own sticky `#ridetab`, there
          // from the save, since the text is a card with two modes and no task
          (g.textAnchor ? g.textAnchor(H) : '') + '</div>';
      }
      const holds = g.cards.some((c) => ctx.open === c.k);
      if (holds) return '<div class="setrow open" id="pile-' + g.key + '">' + cardFor(g) + '</div>';
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
        (g.block ? g.block() : '') + '</div></div>';
    }).join('');
  }

  /* Two measurement passes (a third fitted the .setrow piles with a
     hard-coded 60/(n-1) peek; it went with the piles themselves when they
     dissolved into the constitution section, 2026-08-18 — a paragraph's
     pile runs on the CSS default, and if a deep pile ever appears there
     the fit belongs at the .cpara level, measured the way session-view's
     fitStacks measures: to the next mark, never by constant). */
  function fitBand(band) {
    if (!band) return;
    // **The rule does not move when its card opens** — session-view's own
    // discipline, by session-view's own means: measurement, not a constant
    // (Ed, 2026-08-18: *can we re-use infrastructure from the session-view?*).
    // A closed paragraph tells us where text sits inside a .cpara; the open
    // card is shifted until its head-rule sits at exactly that offset. Runs
    // before the strip alignment below, which re-measures against the moved
    // card.
    band.querySelectorAll('.cpara.open > .setupcard').forEach((card) => {
      const rule = card.querySelector('.clausehead .headrule');
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
      // measured, not 2.4: the strip lands where a closed paragraph's tab
      // sits — asked of a closed sibling, because the open card's own
      // closed posture no longer exists to measure (sweep, 2026-08-18)
      const holderP = card.closest('.cpara');
      const refCol = holderP && card.closest('.constsec, body')
        .querySelector('.cpara:not(.open):not(.textanchor) > .chipcol');
      const want = holderP && refCol
        ? holderP.getBoundingClientRect().top +
          (refCol.getBoundingClientRect().top - refCol.closest('.cpara').getBoundingClientRect().top)
        : card.getBoundingClientRect().top + 2.4;
      const have = col.getBoundingClientRect().top;
      if (Math.abs(have - want) > 0.5) {
        col.style.top = (parseFloat(getComputedStyle(col).top || 0) + (want - have)).toFixed(1) + 'px';
      }
      const r = card.getBoundingClientRect();
      const need = col.getBoundingClientRect().bottom - r.top + 14;
      if (need > r.height) card.style.minHeight = Math.ceil(need) + 'px';
    });
    // **The pile is fitted, not fixed** — the same move session-view's
    // fitStacks makes: a stacked pile shrinks its peek until it reaches no
    // further than the next mark below it in the same gutter column (the
    // 🪪 pile grew to four tabs, 2026-08-19, and stood on the me-row's ✋).
    // Three phases — clear every peek, snapshot every mark's box once, then
    // assign — so the pass reads layout once rather than re-measuring the
    // whole gutter per stack with a write between every read.
    const stacks = [...band.querySelectorAll('.cpara .chipcol.stack')];
    stacks.forEach((col) => col.style.removeProperty('--peek'));
    const marks = stacks.length === 0 ? [] : [...band.querySelectorAll('.achip')]
      .map((a2) => ({ el: a2, box: a2.getBoundingClientRect() }));
    stacks.forEach((col) => {
      const chips = col.querySelectorAll('.achip');
      if (chips.length < 2) return;
      const r = col.getBoundingClientRect();
      const next = marks
        .filter((m2) => !col.contains(m2.el))
        .map((m2) => m2.box)
        .filter((b2) => b2.top > r.top + 1 && Math.abs(b2.left - r.left) < 20)
        .reduce((m, b2) => (m === null || b2.top < m ? b2.top : m), null);
      if (next === null) return;
      const peek = Math.max(0, Math.min(4, (next - 3 - r.top - 30) / (chips.length - 1)));
      if (peek < 4) col.style.setProperty('--peek', peek.toFixed(1) + 'px');
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
      '<button class="' + (st === 'ask' || st === 'news' ? 'needs' : 'qwait') + ' st-' + st + '"' +
      ' data-card="' + c.k + '" data-washkey="set:' + c.k + '"' +
      ' aria-current="' + (ctx.open === c.k) + '"' +
      ' title="' + esc(room ? (c.in || 0) + ' of ' + ctx.E + ' have answered' : c.t) + '"' +
      ' style="--washcol: ' + w.col + '; --washbg: ' + w.bg + '; --fill: ' + fill + '">' +
      '<span class="ql"><span class="subj" aria-hidden="true">' + markOf(c, ctx) + '</span>' +
      '<span class="qt">' + esc(c.t) + '</span></span>' +
      (ctx.summary(c) ? '<span class="qwhy">' + ctx.summary(c) + '</span>' : '') + '</button></li>';
  }

  /* ---- the card shell -----------------------------------------------------
     The `decision card`'s own shape, down to the markup: a `clausehead` whose
     `headclause` carries the tab strip in the gutter, then the field, then the
     commit row. The head holds the card's title where a clause would be —
     because a setting has no clause, and what it is *about* is the document it
     has opened at the top of. Everything else is the same object, so the strip
     lands in the same gutter column the pile stood in and the tab you clicked
     does not move. */
  function cardHtml(c, ctx, body, foot, siblings, o) {
    // **The kind line left the card heads** (Ed, 2026-08-18: *this
    // information is conveyed through the controls on the card*): a
    // constitutional change commits with the 🏛️ hold, and a reserved
    // change the membership passes ends at the founder's 👑 question —
    // so an eyebrow restating either was chrome.
    // **The head is session-view's own clauseHeadHtml** (Phase 4 of the
    // cards.js extraction, 2026-08-18): the strip crosses through the
    // o.marks seam already wrapped, no eyebrow, no wash. The rule-or-title
    // and the clause-thing (ctx.clauseFor — the membership card keeps the
    // membership list at its head, because the list IS the clause) ride
    // inside the head's own rtext. A motion card may put the keep-lane on
    // the head (o.v, o.s) — the quick card's grammar: the head has a lane
    // exactly when keeping the clause is one of the answers.
    const oo = o || {};
    const rule = ctx.headFor && ctx.headFor(c);
    // **An option-block settings card carries no title head** (Ed's card
    // review, 2026-09-02, Q1151; SURFACE F15): since CP1 its blocks state the
    // rule completely, so the question the head restated is gone — the name
    // survives on the rail entry, the tab tooltip and the record. The head
    // element itself stays: it is what carries the tab strip.
    const noTitle = !rule && ctx.noTitleHead && ctx.noTitleHead(c);
    // **A settled setting's rule reads as the first block** (Q1167 a): the
    // rule keeps the head's slot — the strip hangs there and the open/close
    // geometry is measured against it — and wears the option block's own
    // treatment, so the card reads status quo first, alternatives beneath.
    const asBlock = rule && ctx.blockHead && ctx.blockHead(c);
    // **A hairline earns its place** (Q1173): the head↔field rule draws only
    // under a head with content over real controls. `nohead` — nothing in the
    // head but the strip; `rulehead` — the settled rule as the first block,
    // whose .asblock border-bottom is already the separator; `textcard` — a
    // head over plain text (the grants), flagged on the card literal.
    const clauseHtml = ctx.clauseFor ? (ctx.clauseFor(c) || '') : '';
    const shellCls = 'sugg setupcard' +
      (asBlock ? ' rulehead' : !rule && noTitle && !clauseHtml ? ' nohead' : '') +
      (c.textcard ? ' textcard' : '');
    return '<div class="' + shellCls + '" role="tabpanel" data-setupcard="' + c.k + '">' +
      CB.clauseHeadHtml(oo.s || c, {
        label: null, wash: false,
        marks: stripHtml(siblings || [c], ctx),
        html: (rule ? '<div class="headrule' + (asBlock ? ' asblock' : '') + '">' + rule + '</div>'
            : noTitle ? ''
            : '<div class="headtitle">' + esc(c.t) + '</div>') +
          clauseHtml,
        v: oo.v, edit: false,
      }) +
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
    // What changing it takes is the constitution's to say — the preamble
    // states the routes once, the clause states its deviations — so the
    // lockline says only where the value came from (Ed's copy pass,
    // 2026-08-19, which also removed the dead setBy/readNote branches:
    // no card ever set either).
    return '<div class="lockline">' + TICK + '<span>' +
      esc(ctx.lockline ? ctx.lockline(c) : 'Set by the founder when the document was made.') +
      '</span></div>' +
      '<div class="statline"><span class="k">Set to</span><span class="v">' +
      ctx.value(c) + '</span></div>';
  }

  /* **The watch-half is retired** (Q1176, Ed 2026-09-02 pm). `watchBody`,
     `distHtml` and `rungStripHtml` — *What the membership said*, the
     distribution strip, the taken line and the running answered-count — are
     deleted with their last callers: provenance is the standing block's own
     chosen radio now, the per-question counts moved to 🍾 (Q1169 finishes
     that card's design), and the blindness story returns with the same
     redesign. The strip's reasoning is preserved in design/DECISIONS.md. */

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
  /* **✋ is an option-block card** (Ed's card review, 2026-09-02; Q1164,
     SPEC §9.0c as amended): the name composer as the first block — inert
     until something is typed, and typing chooses it (F6's rule) — and
     *Anonymous* as its own block, because anonymity is chosen and a blank is
     no answer. The label, the avatar preview and the two helper paragraphs
     are gone. The clerk's block keeps the one fact only ✋ still states
     (🎩's *a clerk can stay unnamed* was cut): where their blank lands. */
  const nameBody = (me, opts) => {
    const o = opts || {};
    const pk = { namePick: o.pick || null };
    // `locked` is the closed document (CP9): the blocks stay readable and
    // nothing on them commits
    return '<div class="choice" role="radiogroup">' +
      opt(pk, 'namePick', 'name',
        '<input id="myname" class="namein" data-txt="myname" value="' + esc(me.n || '') +
        '" placeholder="Your name"' + (o.locked ? ' disabled' : '') + '>', '', '', o.locked) +
      opt(pk, 'namePick', 'anon', ctlWord('Anonymous'),
        (o.optional ? 'The Founded by line shows no name.' : ''), '', o.locked) +
      '</div>';
  };

  /* **It is an uploader** (Ed, 2026-08-18). The card had offered a ground for
     your initials or a drawn mark, on the reasoning that a mockup has no
     business inventing faces — which is a good rule about *fixtures* and was
     the wrong rule for a *control*, because the thing a member will actually
     do here is give the room their own face. The file never leaves the page:
     it is read into a data URL and drawn, so the mockup invents nothing and
     still behaves like the real control. The initials stay underneath as a
     real answer rather than a fallback — most rooms run on them. */
  /* **Two ways, and then what you get with neither** (Q733, Ed 2026-08-23).
     It had been three sections — a ground for your initials, then an emoji,
     then an upload — which put a decision where there is none: the initials
     are not a third answer you pick, they are what the room shows when you
     have given no picture. So the card is *pick an emoji* → *upload an image*
     → what you are wearing now, and the sentence underneath says what nothing
     means. */
  /* **A normal emoji picker** (Q732, Ed 2026-08-23). What stood here was six
     hand-kept rows — about 150 glyphs somebody chose — which is a fine
     shortlist and a poor picker: it cannot be searched, it goes stale every
     Unicode release, and since one emoji is worn by one member the offered
     set is a hard cap on how many people can have a face at all. The list now
     comes from Unicode's own `emoji-test.txt`, generated into
     `design/emoji-data.js` by `scripts/emoji-data.mjs` and committed beside
     its input, on the same discipline as the `design/constitution.js` bundle.

     **And then the picker is only the grid** (entry 186, Ed's QA of batch Q:
     the picture card is too large). *Remove the search, the section tabs, the
     "or any emoji" input, just have all the available emoji in the picker
     box, at the size they currently appear as avatars.* So the search field,
     the nine category tabs, the sub-group headings and the free-emoji input
     are gone, and what is left is one scroll box holding the whole list.

     That **supersedes the other half of Q732**, which ruled that *only the
     open category may be drawn*, because 1906 buttons is not a thing to build
     on a keystroke and this body is rebuilt by every `render()` — the live
     page polling every four seconds. Ed's later instruction wins, and the
     keystroke half of the reason goes with the search box, since nothing is
     typed here any more. The poll half is real, and was measured rather than
     assumed: 1912 options, ~1.2 ms to build the HTML and **~136 ms for the
     whole render** with the card open, so the cost is putting the buttons in
     the document, not making them. Against a 4 s poll that is 3% of the
     interval. A finding for the backlog if it ever bites, not a reason to
     draw less than was asked for.

     Reserved and taken glyphs are greyed **in place** with their reason,
     which `faceBtn` already did and needed no change: the whole of Unicode is
     offered now, so the surface's own marks are in the grid and have to
     refuse themselves where a member meets them. */
  const EMOJI_DATA = () => (typeof window !== 'undefined' && window.EMOJI_DATA) || [];

  /* Flat and complete: every group and every sub-group, in the file's own
     order so like glyphs stay beside each other, with no boundary drawn
     between them. The tone row is the first row inside the box, and the
     chosen tone goes on every glyph whose data row says it takes one — the
     third element of the item, which is per-glyph, so there is no category to
     test any more. */
  const emojiGridHtml = (ownPic, name, dataAttr) => {
    const groups = EMOJI_DATA();
    if (!groups.length) return '<p class="setnote">The emoji list is still loading.</p>';
    const opts = [];
    for (const [, subs] of groups) {
      for (const [, items] of subs) {
        for (const [g, , tonable] of items) {
          opts.push(faceBtn(tonable ? faceToned(g) : g, ownPic, dataAttr, name));
        }
      }
    }
    return faceToneRow() + '<div class="avpick">' + opts.join('') + '</div>';
  };

  const emojiPicker = (ownPic, name, dataAttr) =>
    '<div class="emojibox">' + emojiGridHtml(ownPic, name, dataAttr) + '</div>';

  /* One body, two seats (Q733): the applicant's 🖼️ used to hand-roll its own
     copy of the grounds and the picker and carried no uploader at all, which
     is an asymmetry nobody chose. Everything that differs between the two is
     an attribute name and where the file lands. */
  /* **🖼️ is an option-block card of three answers** (Ed's card review,
     2026-09-02; Q1165): *Anonymous* first — the status quo, initials where
     the member has a name (`avHtml`'s own fallback) — then *Upload an image*,
     then *Pick an emoji*, each control appearing only when its block is
     chosen. The eyebrow labels, the *Currently* line with Remove, the
     drag-note and the what-nothing-means paragraph are gone: choosing
     Anonymous IS remove, and the chosen block is the status readout. */
  const pictureBody = (me, o) => {
    const oo = o || {};
    const at = oo.picAttr || 'data-pic';
    const into = oo.into || 'me';
    const pk = oo.pickKey || 'picPick';
    const pic = me.pic || '';
    const uploaded = pic[0] === 'u';
    const pickState = { [pk]: oo.pick || null };
    // `locked` is the closed document (CP9): readable, nothing commits
    return '<div class="choice" role="radiogroup">' +
      opt(pickState, pk, 'anon', ctlWord('Anonymous'), '', '', oo.locked) +
      opt(pickState, pk, 'upload', ctlWord('Upload an image'), '',
        oo.pick === 'upload' && !oo.locked
          ? '<div class="picdrop" data-picinto="' + into + '"><div class="picact">' +
            '<label class="btn">' + (uploaded ? 'Choose another' : 'Choose a picture') +
            '<input type="file" accept="image/*" data-picfile="1"></label>' +
            (uploaded ? avHtml(me, 'big') : '') + '</div></div>'
          : '', oo.locked) +
      opt(pickState, pk, 'emoji', ctlWord('Pick an emoji'), '',
        oo.pick === 'emoji' && !oo.locked ? emojiPicker(pic, me.n, at) : '', oo.locked) +
      '</div>';
  };

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
  // The KIND/kindNote pair is gone (Ed's copy pass, 2026-08-19): the kind
  // line on every card restated the preamble, which is where the routes are
  // stated once. "Ordinary" stays engine vocabulary only — SPEC, code,
  // never a card.

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
    // **The card grammar proper** (3b, 2026-08-18): what stands is the
    // card's head, wearing the keep-lane — the quick card's own shape —
    // so the body holds only the proposal: one propblock, the sealed
    // speaker, the lane radio, all session-view's builders. The route is
    // said once (the old KIND header + kindNote pair stated the threshold
    // twice in two sentences — Ed's copy pass, 2026-08-19).
    return '<div class="unlocks"><b>✏️ A proposed change.</b> It carries at the approval threshold, with quorum.' +
      // **Reserved is assent, not silence** (Ed, 2026-08-18): the room may
      // pass a change to a reserved setting; what reservation means is that
      // it then goes to the founder as a 👑 question, theirs to accept or
      // reject.
      (ctx.reserved && ctx.reserved(c)
        ? ' It is <b>reserved</b>: carrying does not change it by itself — it goes to the founder as a <b>👑 question</b>, theirs to assent to or refuse.'
        : '') + '</div>' +
      CB.proposalHtml(m, { tag: 'As proposed', html: esc(m.to), why: m.why, v: 'proposed', edit: false }) +
      // Indifferent is a full option block — textless, its radio naming the
      // act instead of *Prefer this* (CP4, Q1099); it left the commit row on
      // 2026-08-31
      '<div class="pick' + (m.pick === 'either' ? ' on' : '') + '">' +
      '<button class="lanepick" aria-pressed="' + (m.pick === 'either') + '" data-motion="either">' +
      '<span class="dot"></span><span>Indifferent</span></button></div>' +
      '<p class="setnote">' + (m.judged || 0) + ' of ' + ctx.E + ' have voted on it.</p>';
  }

  /* A **constitutional motion**, which is not a judgment and has no card of its
     own: somebody has asked to re-open a founding question, so the founding
     question is live again and you answer it exactly as you did at the ceremony.
     This band is the whole of the addition — everything below it is the consent
     control that was always there. */
  const motionReopen = (c, ctx, m) =>
    '<div class="unlocks"><b>Re-opened.</b> A member has proposed an amendment' +
    (m.why ? ' — <i>' + esc(m.why) + '</i>' : '') + '. ' +
    'It is constitutional, so all members must agree: there is no vote and nothing is ranked — ' +
    'you accept the amendment or keep what stands, and one refusal keeps what stands. ' +
    'Until every one of the ' + ctx.E + ' has answered, what stands stands.</div>' +
    '<p class="setnote">' + (m.judged || 0) + ' of ' + ctx.E + ' have answered. ' +
    'Only the count shows while it runs — no names, no split — and you may change your answer until it settles.</p>';

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

  // The commit follows the route the typed value asks for (329a): a
  // proposal goes in with a click, a constitutional change with the
  // assembly-press. One builder, because the input handler must swap the
  // button in place as typing flips the route — a full re-render would
  // throw the caret out of the lane. (Moved from founding-ceremony.html,
  // 2026-08-18 — it was the only motion commit-foot on either surface and
  // document-creation will need it; the surface passes what it knows.)
  // **The label follows the gesture** (backlog 184, entry 187's hand-off).
  // This is the one control whose words name the gesture that works it, so
  // under `click` the leading *Hold to* goes and the verb is capitalised. The
  // noun is entry 187's — *all members*, the phrase that describes the 🏛️
  // route everywhere else on the surface (STYLE §1) — which 187 deliberately
  // left standing here for this entry to close. Derived from the same constant
  // the gesture is, in one place, so the two cannot disagree.
  const motionCommitHtml = (c, dto, heldOut) => {
    const constitutional = routeFor(c, dto) === 'constitutional';
    const clickGesture = !!(window.SESSION && window.SESSION.gesture === 'click');
    // **the commit wears its glyph alone** (Ed, 2026-09-02, Q1155/Q1171,
    // STYLE T47): the act's words move to the title, where the price and the
    // gesture were already said
    return constitutional
      ? '<button class="btn btn-approve glyphbtn emojibtn holdmotion"' +
        (!dto || heldOut ? ' disabled' : '') +
        ' title="' + (heldOut ? 'One 🏛️ each — withdraw yours first'
          : clickGesture ? 'Ask all members — a full one-second assembly'
          : 'Ask all members — a full one-second hold') + '"' +
        ' data-holdmotion="' + c.k + '">🏛️</button>'
      : '<button class="btn btn-approve glyphbtn emojibtn"' + (dto ? '' : ' disabled') +
        ' data-putmotion="1" title="Propose it">✏️</button>';
  };

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
  /* The formatters of whichever sliders are on screen, kept so the readout can
     be repainted **without re-running the body** — see `syncSlider`. Rewritten
     every time the body renders, so the entry is always the current question's
     (quorum's wording follows the founder's chosen form, and its second half
     follows E). */
  const SLIDERS = {};
  const slider = (A, key, min, max, fmt, mean, step) => {
    const v = A[key], st = step || 1;
    // **Unset is "no value", not "null"** (Q779). This tested `v === null`
    // alone, and a question nobody has answered arrives as `undefined`: a
    // member's answers object starts empty and the live hydration skips a
    // `myAnswer` of null outright, so on every real document the unset branch
    // never fired. What the founder-member met on 👥 was `value="undefined"` —
    // invalid, so the browser parks the thumb at the midpoint — under a
    // readout reading `undefined% — NaN of 5`. That is a **suggested value**,
    // painted in the live colour, which is the one thing a blind collection
    // must not show; and a click on the thumb where it already sits fires no
    // `input` at all, so the control read as dead.
    const unset = v === null || v === undefined;
    const at = (unset ? Math.round((min + max) / 2 / st) * st : v);
    SLIDERS[key] = { fmt: fmt, mean: mean, min: min, max: max };
    return '<div class="cs' + (unset ? ' unset' : '') + '">' +
      '<div class="csval' + (unset ? ' unset' : '') + '">' + (unset ? 'Drag to answer' : fmt(v)) + '</div>' +
      '<input type="range" min="' + min + '" max="' + max + '" step="' + st + '" value="' + at + '"' +
      ' style="--n:' + Math.max(1, Math.round((max - min) / st)) + ';--pct:' +
      (unset ? 0 : max > min ? (v - min) / (max - min) * 100 : 100) + '"' +
      ' data-slide="' + key + '">' +
      '<div class="csends"><span>' + fmt(min) + '</span><span>' + fmt(max) + '</span></div>' +
      '<div class="csmean">' + (unset ? mean(min) + '<br>' + mean(max) : mean(v)) + '</div></div>';
  };
  /* **Nothing rebuilds under a press**, and a drag is a press held down. The
     surface answers a slider by re-rendering, and a re-render replaces the very
     `<input>` the pointer is capturing — so the thumb moved once and then
     froze, which is the other half of what read as a dead control. This paints
     the readout, the mean and the fill **in place** from the element's own
     value, so the drag survives; the caller repaints the rail and the commit
     around it, and leaves the full render to `change`. */
  const syncSlider = (sl) => {
    const f = sl && SLIDERS[sl.dataset.slide], cs = sl && sl.closest('.cs');
    if (!f || !cs) return;
    const v = +sl.value;
    cs.classList.remove('unset');
    const val = cs.querySelector('.csval');
    if (val) { val.classList.remove('unset'); val.textContent = f.fmt(v); }
    const mn = cs.querySelector('.csmean');
    if (mn) mn.textContent = f.mean(v);
    // a one-answer track (👥 as a count in a room of one) has no span to
    // divide by, so the fill is full rather than `NaN`, which CSS drops
    sl.style.setProperty('--pct', f.max > f.min ? (v - f.min) / (f.max - f.min) * 100 : 100);
  };

  const ansRow = (on, key, val, ttl, exp, extra, inner) =>
    // the answer ladder's rung, in the option-block shape (CP1) — the rung's
    // text above, the fixed *Prefer this* radio beneath it. *Prefer*, not
    // *Choose* (Q1110, Ed 2026-09-01): your answer is yours alone, but it
    // feeds the rule the room takes together — the collective register.
    '<div class="pick' + (on ? ' on' : '') + (extra || '') + '">' +
    '<span class="opttext">' + ttl + '</span>' +
    (exp ? '<span class="exp">' + exp + '</span>' : '') +
    '<button class="lanepick" aria-pressed="' + !!on + '" data-ans="' + key + '" data-ansval="' + esc(String(val)) + '">' +
    '<span class="dot"></span><span class="off">Prefer this</span>' +
    '<span class="on">Preferred</span></button>' +
    (inner ? '<span class="inner">' + inner + '</span>' : '') + '</div>';

  // rungs *above* your answer are dimmed rather than hidden — "the most I will
  // accept" only reads as a ladder if you can see what you are refusing.
  // String() on both sides so a boolean-valued question compares at all:
  // 'false' === false is how such a rung quietly never lit (found in this move).
  // `tail` is rows that belong to the same radiogroup but **not to the
  // ladder's own ordering** (entry 165): 🌡️'s *A number of my own* is the
  // ladder's escape rather than a rung of it, so it sits inside the one
  // `.choice` — a second `.choice` would read as a second question — and takes
  // no part in the above/below dimming, which is a statement about refusing
  // more than you have to and says nothing about naming a number.
  const ladder = (A, key, rungs, tail) => '<div class="choice" role="radiogroup">' + rungs.map((r, i) => {
    const at = rungs.findIndex((x) => String(x.v) === String(A[key]));
    return ansRow(String(A[key]) === String(r.v), key, r.v, r.t, r.e, (at >= 0 && i > at) ? ' above' : '',
      r.inner);
  }).join('') + (tail || '') + '</div>';

  // A gate card says one thing: what it is waiting for, and whether that has
  // happened. What it is waiting *on* is drawn as the cards themselves, so a
  // member reads it as “these, and then you can write” rather than as a rule.
  // (One copy since 2026-08-18 — it had been byte-identical in both surfaces.)
  //
  // **A card body says what the thing is, never what the control does**
  // (Ed, 2026-09-01, Q1129, STYLE T45: *You don't even have to say “nothing is
  // being asked here”; just say what proposals/voting/✏️/✒️ are and then they
  // can press OK*). Three sentences went with that ruling — *Nothing is being
  // asked here*, *OK files it and it leaves your queue* and *OK puts ‹glyph›
  // in your wallet* — because each named the commit rather than the power, and
  // naming the commit is what left a dangling reference when T44 took the
  // glyph off the button. What the power **is** is the card's `why`, and it is
  // true whether or not the card has been acknowledged, so there is nothing
  // left here to branch on: `taken` is gone with the sentences it selected.
  //
  // The one surviving sentence is about the **task**, not the power — T45
  // narrows T43's task carve-out rather than closing it, and *what this card
  // is waiting for* is exactly what stays open under both.
  const gateNote = (c) => (c.open() ? '' : 'It comes back to you the moment it opens.');
  const gateBody = (c) => {
    const open = c.open();
    const note = gateNote(c);
    return (c.why ? '<p class="why">' + c.why + '</p>' : '') +
      // an open grant states no lockline (Ed, 2026-08-31): *You hold Founder
      // Actions* restated a state the wallet says the moment it is taken.
      // Gates keep theirs — a gate's lockline is what the card is waiting for,
      // or that it opened.
      (open && c.isGrant ? '' :
        '<div class="lockline">' + (open ? TICK : '') + '<span>' +
        (open ? c.done : c.waiting) + '</span></div>') +
      (open ? '' : '<div class="gatelist">' + c.blockers().map((b) =>
        '<span class="gaterow"><span class="gg">' + b.g + '</span>' + esc(b.t) + '</span>').join('') + '</div>') +
      (note ? '<p class="setnote">' + note + '</p>' : '');
  };

  /* The uploader, one copy for both surfaces: the file is read locally and
     never sent anywhere; where the data lands stays the caller's, named by
     the drop zone's own `data-picinto` so one handler can serve the founder's
     🖼️ and the applicant's.

     **It downscales and re-encodes** (Q735, 2026-08-23). It used to hand the
     raw file straight to `readAsDataURL`, which is three defects in one line:
     a phone photograph previewed perfectly and then failed on Save, because
     the server caps a picture well under what a camera produces; every
     picture change appended the whole thing to an append-only log that is
     replayed on every load; and `readAsDataURL` preserves EXIF, so an
     uploaded photograph carried its own GPS coordinates into a log that holds
     answers in plaintext.

     `imageOrientation: 'from-image'` is load-bearing rather than a nicety: a
     canvas re-encode drops EXIF, and the orientation flag goes with it, so a
     portrait photograph comes out on its side unless the rotation is applied
     at decode. */
  const PIC_SIDE = 256;
  const PIC_MAX_SOURCE = 20 * 1024 * 1024;
  // the server's own `LIMITS.picture`, over the stored string
  const PIC_MAX_STORED = 40_000;
  const wirePicDrop = (onFile) => {
    const refuse = (zone, msg) => {
      const note = zone && zone.querySelector('.picnote');
      if (note) note.textContent = msg;
    };
    const take = async (file, zone) => {
      const into = (zone && zone.dataset.picinto) || 'me';
      if (!file) return;
      if (!/^image\//.test(file.type)) return refuse(zone, 'That is not a picture.');
      if (file.size > PIC_MAX_SOURCE) return refuse(zone, 'That picture is too big to open here.');
      let bmp;
      try {
        bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch (e) { return refuse(zone, 'That picture could not be opened.'); }
      const cv = document.createElement('canvas');
      cv.width = PIC_SIDE; cv.height = PIC_SIDE;
      const cx = cv.getContext('2d');
      // a white ground rather than transparency: the encoding is JPEG, and
      // transparency in a JPEG is black
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, PIC_SIDE, PIC_SIDE);
      // fitted, never cropped and never enlarged — the room is being given a
      // picture, not a thumbnail somebody else framed
      const s = Math.min(PIC_SIDE / bmp.width, PIC_SIDE / bmp.height, 1);
      const w = Math.max(1, Math.round(bmp.width * s));
      const h = Math.max(1, Math.round(bmp.height * s));
      cx.drawImage(bmp, (PIC_SIDE - w) / 2, (PIC_SIDE - h) / 2, w, h);
      if (bmp.close) bmp.close();
      // **What is handed over has to fit what the server will take.** The cap
      // is on the *stored string* (commands.ts `LIMITS.picture`), and 256px at
      // 0.8 only *usually* lands under it — a noisy photograph encodes past it,
      // and a picture that previews perfectly and then fails on Save is exactly
      // the defect this encoder was written to remove. So quality steps down
      // until it fits rather than hand over something that will be refused.
      let out = 'u' + cv.toDataURL('image/jpeg', 0.8);
      for (let q = 0.6; out.length > PIC_MAX_STORED && q >= 0.3; q -= 0.15) {
        out = 'u' + cv.toDataURL('image/jpeg', q);
      }
      // …and the ladder runs out somewhere, so the last rung is checked
      // rather than assumed: handing over a string the Save will refuse is
      // the very defect above, arrived at by the other road.
      if (out.length > PIC_MAX_STORED) {
        return refuse(zone, 'That picture will not compress small enough — try a simpler one.');
      }
      onFile(out, into);
    };
    document.addEventListener('change', (ev) => {
      if (ev.target.matches('[data-picfile]')) {
        take(ev.target.files[0], ev.target.closest('.picdrop'));
      }
    });
    document.addEventListener('dragover', (ev) => {
      const z = ev.target.closest && ev.target.closest('.picdrop');
      if (z) { ev.preventDefault(); z.classList.add('over'); }
    });
    document.addEventListener('dragleave', (ev) => {
      const z = ev.target.closest && ev.target.closest('.picdrop');
      if (z) z.classList.remove('over');
    });
    document.addEventListener('drop', (ev) => {
      const z = ev.target.closest && ev.target.closest('.picdrop');
      if (!z) return;
      ev.preventDefault(); z.classList.remove('over');
      take(ev.dataTransfer.files && ev.dataTransfer.files[0], z);
    });
  };

  const BLINDNOTE = '<p class="blindnote">Nobody sees your answer, and you will see nobody else’s until every one of them is in.</p>';

  /* **One joiner for every sentence that names several things** (Q630, Ed
     2026-08-26). The shape of a list of three is a copy decision and it is
     STYLE.md §1's — *A, B and C*, no serial comma — so it is made once here
     rather than at each site. Takes whatever the caller already has (escaped
     text, a glyph and a title, a count phrase) and adds no markup of its own:
     it is punctuation between strings, never an escaper. An empty list is the
     empty string, every caller having guarded that case before it calls. */
  const listOf = (items) => {
    const xs = (items || []).filter((x) => x !== null && x !== undefined && x !== '');
    if (!xs.length) return '';
    if (xs.length === 1) return xs[0];
    return xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
  };

  /* **The threshold card names the ceiling its own room can reach** (Q840, Ed
     2026-08-26 (a)). The bar is a confidence, and a confidence is bounded by
     the evidence the room can produce: an ordinary race holds one comparison
     per member on the incumbent pair, so a room of one that agrees with
     itself gets to 79% and no further, and a bar of 80 can never be cleared
     however long the document runs. The mechanism is untouched — the room may
     still answer 85%; it is told what 85% will mean for a room this size
     before it answers.

     The number is `barCeilingPct` from the module bundle, which is
     engine-core's own fit copied out (the page carries no engine-core). It is
     read **live, on every render, from the room as it stands** — no snapshot
     at the founding — so the sentence is present-tense about the room now and
     says the ceiling rises as members arrive, which is what keeps it true a
     minute later.

     `max` is what the control the note sits under can express: 95 for the
     founding slider, 99 for the founder's own number field. A room that can
     already reach everything its control offers is told nothing, which is most
     rooms. And it is its own line rather than a third sentence in `.why`,
     because `.why` is capped at 200 characters (card-audit H4) and 🌡️'s body
     was cut to fit under Q764. */
  /* **The one place the method is named** (entry 163). 🌡️ asks for a number
     nobody can answer with conviction, because the number is not what it looks
     like: it is a confidence rather than a share of the votes, and what one
     confidence means in people depends on how many votes a change has
     collected. Ed's ruling was to leave the question and the input alone and
     explain it once, properly, on a page of its own — so this sentence names
     the method, says in plain words what it buys, and links out.

     Its own element, never inside `.why`: `.why` is capped at 200 characters
     (card-audit H4) and 🌡️'s body was cut to fit under Q764, which is exactly
     why `ceilingNote` sits outside it too.

     **A new tab**, because the founder card is met during the birth, when the
     page holds unsaved state a same-tab navigation would lose (`birth-pass`,
     the stash) — the charter's `linkify` anchors open the same way. Inert
     markup with no handler and no state, so the 4s poll re-rendering the card
     wholesale costs it nothing, and an anchor is a real control to the
     dead-click nudge, which is structural. */
  // Ed's own sentences (card review 2026-09-02, Q1156 — T15 amended for this
  // note alone); the link to /pairwise is load-bearing and stays
  const methodNote = () =>
    '<p class="methodnote">docs.vote uses the Bradley–Terry–Davidson voting method to decide ' +
    'whether a proposal ✏️ passes. It uses probability to compensate for when only a small ' +
    'fraction of the membership vote — ' +
    '<a href="/pairwise" target="_blank" rel="noopener">read more</a>.</p>';

  /* **What choosing this would do, in this room** (entry 167). One line, one
     class, one home for the sentence: the module writes it and every surface
     that offers a value prints it — the founder's card, the member's answer
     card, the composer's lane and the settled strip — so none of them writes
     one of its own.

     `.meaning`, deliberately **not** `.why`: `.why` is the card's body, which
     `card-audit`'s H4 measures at 200 characters, and this is a note under a
     control. Under a *rung* the sentence is the rung's own `.exp` instead,
     which is the slot a rung explanation has always used; `.meaning` is for
     the bare number fields, which have no rung to hang off. Its own budget is
     the module's `fit()` and `meaning.test.ts`.

     Empty until there is a value: a sentence about a number nobody has typed
     is a suggested answer, and painting one is what these cards exist not to
     do. The `data-meaning` hook is how the `input` handlers repaint it in
     place — **nothing rebuilds under a press**. */
  /* A member's answer is stated in the page's vocabulary — a number of days,
     a count, a grant — and what the module wants is the typed value. That
     mapping is the caller's (`ANSTYPED` in session-view.html, the one place
     it is spelled either way), so it is handed in rather than copied here: a
     ⏱️ answer states the grant alone and the cap and drip come from
     elsewhere, which is exactly the kind of thing setup.js must not learn.
     An unanswered question is `null` and gets no sentence. */
  const ansValue = (typed, key, v) =>
    ((typeof v === 'number' && typed && typed[key]) ? typed[key](v) : null);

  const meaningLine = (key, value, room) =>
    '<p class="meaning" data-meaning="' + esc(key) + '">' +
    esc((value && window.CONSTITUTION.meaningOf(key, value, room || { e: 1 })) || '') + '</p>';

  // `ceilingNote` deleted (Ed, 2026-09-02, Q1159, reversing Q840's note):
  // the ceiling lines go and nothing replaces them anywhere — /pairwise
  // carries the account. Q840's mechanism finding is untouched
  // (`barCeilingPct` and threshold.test.ts stand).

  /* 🌡️'s blind answer, as a ladder (entry 165). The meaning under each rung
     is read live from the room as it stands: a sentence about a room of five
     stops being true when a sixth arrives, and naming the room in the
     sentence is what lets the reader see that it moved. */
  const barMeaning = (pct, room) =>
    window.CONSTITUTION.meaningOf('bar', { pct: +pct }, room) || '';
  // **Exactly three rungs, and no free-number block** (Ed, 2026-09-02, Q1158,
  // reversing Q1104 (b) for 🌡️ alone — the pattern survives on 🪜, 👥 and
  // ⏱️). The `'own'` rung, its box and its `data-ansnum` hook are gone; the
  // % figure went with Ed's QA of 2026-09-02 pm (*Remove %s*).
  const barLadder = (A, room) => ladder(A, 'bar',
    window.CONSTITUTION.BAR_RUNGS.map((r) => ({
      // the rung's block text is the rule as it would stand (Q1104 (b))
      v: r.pct, t: esc(r.sentence), e: barMeaning(r.pct, room),
    })));

  /* One body per delegable question — the copy a member answers against,
     identical on both surfaces because it is the same question.
     `room` is the fourth argument since entry 167: what a value would mean is
     the module's to say, and it needs the room to say it. */
  const ANSWER = {
    quorum: (A, E, _form, room) => {
      // **The member states a form as well as a number** (Ed, 2026-09-02,
      // Q1162 — Q341 reversed for 👥 alone, R-082): two blocks, each the rule
      // as it would stand with its number inline (Q1137's pattern), the form
      // chosen by the block. The consent slider retires with this — 👥 was
      // its last user. Mixed answers resolve strictest against E at the
      // settle (Q1172), which is what the blind note now promises.
      const f = A.quorumForm || null;
      const mean = (frm, v) => (typeof v === 'number'
        ? window.CONSTITUTION.meaningOf('quorum', { form: frm, n: +v }, room || { e: E }) || ''
        : '');
      const box = (frm, min, max) =>
        '<input class="num numin" type="number" data-ansnum="quorum" min="' + min + '" max="' + max + '"' +
        (f === frm && typeof A.quorum === 'number' ? ' value="' + A.quorum + '"' : '') + '>';
      // **Bare blocks** (Q1175, Ed 2026-09-02 pm): the question paragraph and
      // the blind note are gone from every answer body — the clause text is
      // the explanation, and the blindness story returns with the 🍾 redesign
      // (Q1169). The meaning lines stay: they are meaningOf's, not copy.
      return '<div class="choice" role="radiogroup">' +
      ansRow(f === 'share', 'quorumForm', 'share',
        box('share', 5, 100) + '% of the membership must vote on a proposal ✏️ before it can pass.',
        f === 'share' ? mean('share', A.quorum) : '') +
      ansRow(f === 'count', 'quorumForm', 'count',
        box('count', 1, Math.max(1, E)) + ' members must vote on a proposal ✏️ before it can pass.',
        f === 'count' ? mean('count', A.quorum) : '') +
      '</div>';
    },
    bar: (A, E, _form, room) =>
      // Q1175: the question paragraph and blind note are gone; the rungs and
      // the method note (Ed's own, Q1156, with its /pairwise link) remain
      // **Three rungs and a number** (entry 165, Ed 2026-08-27: *we need to
      // help them with 3 preset buttons, and they can edit the precise % if
      // they really want to*). The slider that stood here asked for a percent
      // and offered a sentence about what living at it feels like; a rung asks
      // for a judgment and says what it would cost this room in votes, which
      // is a thing a member can actually hold an opinion about. Same rungs,
      // same order and same labels as the founder's card, from the one list
      // (T5, Q620) — and the same `.above` dimming as 👁️, so *the most I will
      // accept* still reads as a ladder of what you are refusing.
      barLadder(A, room || { e: E }) +
      methodNote(),
    authorship: (A) =>
      ladder(A, 'authorship', [
        { v: 'anonymous', t: RULE('authorship', 'anonymous'), e: '' },
        { v: 'anonymousElective', t: RULE('authorship', 'anonymousElective'), e: '' },
        { v: 'sealed', t: RULE('authorship', 'sealed'), e: '' },
        { v: 'sealedElective', t: RULE('authorship', 'sealedElective'), e: '' },
        { v: 'public', t: RULE('authorship', 'public'), e: '' }]),
    judgments: (A) =>
      ladder(A, 'judgments', [
        { v: 'never', t: RULE('judgments', 'never'), e: '' },
        { v: 'after', t: RULE('judgments', 'after'), e: '' }]),
    applications: (A, E, _form, _room, _typed, x) =>
      ladder(A, 'applications', [
        { v: 'invite', t: RULE('applications', 'invite', x), e: '' },
        { v: 'apply', t: RULE('applications', 'apply', x), e: '' }]),
    chamber: (A, E, _form, _room, _typed, x) =>
      ladder(A, 'chamber', [
        // Public left every ladder on 2026-08-22 (Q603): offered nowhere,
        // read back everywhere a document that took it still states it
        { v: 'closed', t: RULE('chamber', 'closed', x), e: '' },
        { v: 'link', t: RULE('chamber', 'link', x), e: '' }]),
    // **One price scale** (entry 94): 🪪 and 🥾 are answered in the same
    // three verbs, most protective first, and 🥾 keeps the one rung
    // admission has no analogue for
    // …and since Q1112 (b) each rung says the clause that answer would set,
    // read off `cards.js`'s one table — the same sentence the founder's own
    // card offers and the same one the composer's lane types, so 🪪 and 🥾
    // read identically wherever they are met. The explainer stays only where
    // it carries a fact the sentence does not (T36); where it restated the
    // rung it went, as the founder card's own explainers did at Q1109.
    admission: (A) =>
      ladder(A, 'admission', [
        { v: 'assembly', t: RULE('admission', 'assembly'), e: '' },
        { v: 'proposal', t: RULE('admission', 'proposal'), e: '' },
        { v: 'pen', t: RULE('admission', 'pen'), e: '' }]),
    removal: (A) =>
      ladder(A, 'removal', [
        { v: 'consent', t: RULE('removal', 'consent'), e: '' },
        { v: 'assembly', t: RULE('removal', 'assembly'), e: '' },
        { v: 'proposal', t: RULE('removal', 'proposal'), e: '' }]),
    ending: (A) =>
      '<div class="choice" role="radiogroup">' +
      // **Unset is "no value", not "null"** (Q779) — the same defect the
      // consent slider carried, in the one other answer body that tests for
      // null by hand. An unanswered question arrives as `undefined` (the live
      // hydration skips a `myAnswer` of null outright), so `!== null` read
      // true and painted *At a set time* as chosen, beside an empty date and
      // a dark ✓: a suggested answer on a blind collection.
      ansRow(A.ending !== null && A.ending !== undefined && A.ending !== 'never',
        'ending', 'date', ctlWord('At a set time'), '',
        '', '<span class="fld"><label>Ends</label><input type="datetime-local" data-ansdate="ending"' +
        (A.ending && A.ending !== 'never' ? ' value="' + esc(A.ending) + '"' : '') + '></span>') +
      ansRow(A.ending === 'never', 'ending', 'never', ctlWord('Never'), '') +
      '</div>',
    // **Never first** (entry 167, rule 4): the document takes the *longest*
    // asked for and *never* is the longest of all, so it heads the ladder as
    // the most-protective answer does everywhere else — the rung's own
    // sentence is the family's now, and the field below carries a `.meaning`
    // that repaints as the number is typed.
    lapse: (A, E, _form, room, typed) =>
      '<div class="choice" role="radiogroup">' +
      ansRow(A.lapse === 'never', 'lapse', 'never', ctlWord('Never'),
        esc(window.CONSTITUTION.meaningOf('lapse', { afterMs: null }, room || { e: E }) || '')) +
      '</div>' +
      '<span class="fld"><label>The shortest period of inactivity you will accept</label>' +
      '<span class="setrow2"><input class="num" type="number" min="7" max="365"' +
      ' data-ansnum="lapse"' + (typeof A.lapse === 'number' ? ' value="' + A.lapse + '"' : '') + '>' +
      '<span class="setnote" style="margin:0">days</span></span></span>' +
      meaningLine('lapse', ansValue(typed, 'lapse', A.lapse), room),
    rate: (A, E, _form, room, typed) => {
      // **The answer is the interval** (Ed, 2026-09-02, Q1160/Q1161, R-083):
      // the grant and maximum are the mechanism's fixed 3, so a member
      // states how often — the number in their own unit, minutes stored.
      // The whole typed value still comes from the caller's own `ANSTYPED`.
      const unit = A.rateUnit || 'minutes';
      const sel = '<select class="num numin dripunit" data-ansunit="rate">' +
        ['minutes', 'hours', 'days'].map((u) =>
          '<option value="' + u + '"' + (u === unit ? ' selected' : '') + '>' + u + '</option>').join('') +
        '</select>';
      return '<span class="opttext">Members may make a new proposal ✏️ every ' +
        '<input class="num numin" type="number" min="1" max="2880" data-ansnum="rate"' +
        (typeof A.rate === 'number' ? ' value="' + A.rate + '"' : '') + '> ' + sel + '.</span>' +
        meaningLine('rate', ansValue(typed, 'rate', A.rate), room);
    },
  };

  /* ---- the mails -----------------------------------------------------------
     Templates as data (soon enough these are real emails; the words must not
     be tangled into a view) and one modal that stands for the reader's inbox.
     Its styles live in setup.css behind a NOT-DESIGN-SYSTEM fence: the mail
     previews another medium, and its look must owe nothing to this surface. */
  const MAILS = {
    // Q460: the click is the creation — the address was chosen first
    verify: (title, to, slug) => ({
      to, from: 'docs.vote',
      subject: 'Create “' + title + '”',
      // the address as the server serves it, `/d/<slug>` — this body is the
      // mockup twin of mailer.ts's `create` and must state the same one
      body: 'You have named a document <b>' + esc(title) + '</b> and chosen its address, <b>docs.vote/d/' + esc(slug || '…') + '</b>.',
      action: 'Open the link to create it there',
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
     Retired from this file at the merge (stage 8, 2026-08-21): the queue-wire
     is drawn once, by session.js's drawWires, for whichever card is open —
     a setup card included. Its rules (6px, opaque, the card's own colour, a
     cap at the document end only, the shadow punched out of every card) live
     there; the frozen reference copy keeps the old drawWire for the probe. */

  /* ---- small shared builders ----------------------------------------------
     `opt` draws the session-view's own `.lanepick` radio (Ed, 2026-08-18). The
     option's name is the pill's label; its explanation sits under it, and any
     settings the option carries appear only while it is chosen. */
  const opt = (S, key, val, ttl, exp, inner, off, extra) => {
    const on = S[key] === val;
    // **The option block** (CP1, Q1096): the option's text is document text,
    // its explanation beneath, and the radio under both. The radio names the
    // register (Ed, 2026-08-31 evening, re-ruling Q1097): *Choose this /
    // Chosen* here, because every card drawn with `opt` is the chooser's
    // alone to decide — a founder-held setting, the delegate rung; *Prefer
    // this / Preferred* is for a choice put to more than one person. The
    // data attributes stay on the button: every handler and every walk finds
    // the act exactly where it always was.
    return '<div class="pick' + (on ? ' on' : '') + (off ? ' off' : '') + (extra || '') + '">' +
      '<span class="opttext">' + ttl + '</span>' +
      (exp ? '<span class="exp">' + exp + '</span>' : '') +
      '<button class="lanepick" aria-pressed="' + on + '"' + (off ? ' disabled' : '') +
      (off ? '' : ' data-set="' + key + '" data-val="' + val + '"') + '>' +
      '<span class="dot"></span><span class="off">Choose this</span>' +
      '<span class="on">Chosen</span></button>' +
      (inner ? '<span class="inner">' + inner + '</span>' : '') + '</div>';
  };

  const num = (S, key, label, min, max, suffix) =>
    '<span class="fld"><label>' + label + '</label><span class="numrow">' +
    '<input class="num" type="number" data-num="' + key + '" value="' + S[key] + '" min="' + min + '" max="' + max + '">' +
    (suffix ? '<span class="setnote" style="margin:0">' + suffix + '</span>' : '') + '</span></span>';

  /* **A number set in the middle of a clause** (Q1137). `num` builds a field —
     a label stacked over an input in a `.fld` column — which is a form, and a
     clause with a form in it does not read as a sentence. This is the same
     input with the sentence's own words around it in place of a label, so a
     rule builder can be handed three of them and write its own line. The
     `data-num` hook is unmoved: every handler and every walk finds the number
     exactly where it always was. */
  const numIn = (S, key, min, max) =>
    '<input class="num numin" type="number" data-num="' + key + '" value="' + S[key] +
    '" min="' + min + '" max="' + max + '">';

  /* **A control's own word, marked as not being clause text** (Q1138, T46).
     The rule is about clause text, not about every radio, and telling the two
     apart cleanly needs a flag — the plan's own condition for adding one. This
     is it: `.opttext` wears the clause font, and a label that never was a
     document sentence wears this. See `setup.css`'s `.pick .opttext.ctl`. */
  const ctlWord = (s) => '<span class="ctl">' + s + '</span>';

  const someIn = (n, E) => (n >= E ? 'everyone in' : n + ' of ' + E + ' in');

  /* ---- births --------------------------------------------------------------
     **What is born arrives, it does not appear** (Ed, 2026-08-19: new
     sections should fade in; new queue-cards should transition in). The
     document and both rails are rebuilt wholesale on every render, so a
     newly-created paragraph, section or rail entry would otherwise pop in
     fully formed between two frames — the wash-fade problem again, solved
     the wash-fade way: key every element by what it is *about*, remember
     every key ever seen, and hand a new one its full presence only after a
     forced reflow. The key set is cumulative — a section folded away and
     unfolded is not reborn, and a seat switched away from and back does not
     replay its entrances.

     Two entrances, by what the element does to its neighbours. A **rail
     entry** grows open from zero height while it fades, because the jarring
     half of a rail birth is the neighbours jumping down by its height in one
     frame — growing makes them part instead. A **document paragraph or
     section** only fades: the prose column is something you read, and text
     that slides while you read it is worse than text that arrives. Under
     reduced motion everything fades and nothing moves. */
  const REDUCED_MQ = matchMedia('(prefers-reduced-motion: reduce)');
  const bornKeys = new Set();
  let bornPrimed = false;
  // FADE_MS is the document lane's: a new constitution clause, and a new
  // section heading, fading onto the page. **Doubled from 420 to 840** (Ed,
  // 2026-08-21) — a clause arriving in the band is text to be read rather
  // than a control responding to a press, and it was going by at the pace of
  // the latter. GROW_MS stays the rail's, where an entry grows from zero
  // height and its neighbours move with it, so it is paced against the
  // movement rather than against reading.
  const GROW_MS = 240, FADE_MS = 840, STAGGER_MS = 55, STAGGER_MAX = 5;
  function birthPass(band, rail, mute, done) {
    const found = [];
    if (rail) rail.querySelectorAll('.qitem[data-q]').forEach((el) =>
      found.push({ key: 'q:' + el.dataset.q, el, grow: true }));
    if (band) {
      band.querySelectorAll('.cpara[data-para]').forEach((el) =>
        found.push({ key: 'p:' + el.dataset.para, el, grow: false }));
      band.querySelectorAll('.csec > h2[id]').forEach((h) =>
        found.push({ key: 's:' + h.id, el: h.parentElement, grow: false }));
      // **A subsection is its own birth** (entry 185). A section heading's
      // element is its whole `.csec`, which is right for a section: the thing
      // arriving is the section. A lvl3 subsection heading had no container of
      // its own, so it was charged to its section too — and the section that
      // owns *Applicants* is the one the open 🤝 card stands in, so the first
      // pick of *Anyone may apply* faded the card the founder was pressing.
      // `memSub` gives each subsection a `.csub` block (session-view.html), and
      // its birth is that block: the heading and its rows arrive, the section
      // around them is not touched.
      band.querySelectorAll('.csub > h2[id]').forEach((h) =>
        found.push({ key: 's:' + h.id, el: h.parentElement, grow: false }));
    }
    // first render, or a stagehand act (seat switch, ⏩): absorb, don't act
    if (!bornPrimed || mute) {
      found.forEach((f) => bornKeys.add(f.key));
      bornPrimed = true;
      return;
    }
    const born = found.filter((f) => !bornKeys.has(f.key));
    found.forEach((f) => bornKeys.add(f.key));
    if (!born.length) return;
    const reduced = REDUCED_MQ.matches;
    const undo = [];
    // **A batch cascades, it does not land as a block** (Ed, 2026-08-19,
    // choosing grow-and-fade with a stagger): several tasks born at once are
    // several things that happened, and arriving in one frame says they are
    // one thing. They come in document order — top to bottom, the order you
    // would read them — with each column keeping its own count, so a rail
    // cascade and a document cascade run beside each other rather than end
    // to end. Capped, because a cascade long enough to notice waiting for is
    // a cascade that has become a loading spinner.
    const step = { rail: 0, doc: 0 };
    const delayOf = (f) => {
      const lane = f.grow ? 'rail' : 'doc';
      return Math.min(step[lane]++, STAGGER_MAX) * STAGGER_MS;
    };
    let last = 0;
    born.forEach((f) => {
      const el = f.el;
      const wait = delayOf(f);
      if (wait > last) last = wait;
      if (f.grow && !reduced) {
        const cs2 = getComputedStyle(el);
        const h = el.offsetHeight, mt = cs2.marginTop, mb = cs2.marginBottom;
        el.style.overflow = 'hidden';
        el.style.height = '0px'; el.style.marginTop = '0px'; el.style.marginBottom = '0px';
        el.style.opacity = '0';
        undo.push(() => {
          el.style.transition = 'height ' + GROW_MS + 'ms cubic-bezier(.22, .61, .36, 1) ' + wait + 'ms, ' +
            'margin ' + GROW_MS + 'ms cubic-bezier(.22, .61, .36, 1) ' + wait + 'ms, ' +
            'opacity ' + (GROW_MS + 40) + 'ms ease-out ' + (wait + 60) + 'ms';
          el.style.height = h + 'px'; el.style.marginTop = mt; el.style.marginBottom = mb;
          el.style.opacity = '1';
        });
      } else {
        el.style.opacity = '0';
        undo.push(() => {
          el.style.transition = 'opacity ' + FADE_MS + 'ms ease ' + wait + 'ms';
          el.style.opacity = '1';
        });
      }
    });
    void document.body.offsetHeight;      // one reflow for the whole batch
    undo.forEach((fn) => fn());
    setTimeout(() => {
      born.forEach((f) => {
        ['transition', 'opacity', 'height', 'margin-top', 'margin-bottom', 'overflow']
          .forEach((p) => f.el.style.removeProperty(p));
      });
      if (done) done();
    }, FADE_MS + last + 40);
  }

  const faces = (roster, meName) => '<div class="faces">' + roster.map((p) =>
    '<span class="pf' + (p.n === meName ? ' me' : '') + '">' + avHtml(p) +
    esc(p.n) + (p.n === meName ? ' (you)' : '') + '</span>').join('') + '</div>';

  return { esc, TICK, initials, avHtml, hueOf, washOf, stateOf, markOf, railEntry,
    bandHtml, fitBand, pileHtml, stripHtml, cardHtml, readBody,
    nameBody, pictureBody, opt, num, numIn, ctlWord, faces, someIn, FACE_EMOJI,
    FACE_TONES, faceToneRow, faceToned, setFaceTone,
    setFaceTaken, faceTakenBy, faceBtn, emojiPicker,
    motionBody, motionReopen, routeFor, motionCommitHtml,
    slider, syncSlider, ladder, ANSWER, BLINDNOTE, methodNote, meaningLine, listOf, gateBody, wirePicDrop, MAILS, renderMailModal, birthPass };
})();
