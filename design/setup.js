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
  const initials = (n) => String(n).trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  /* ---- avatars ------------------------------------------------------------
     `me` in the glossary reads "initials, not a photograph: there are no
     accounts behind it yet". There are now — choosing how you appear is one of
     the cards — so the initials become the *default* rather than the rule.

     **A picture is an emoji, an uploaded image, or none** (Q687, 2026-08-23).
     The grounds for your initials and the three drawn marks are gone: they
     were a mockup device from before either of the real answers existed, and
     with a real uploader in the card a ground is a fourth thing to choose
     between two that mean something. Nothing is left tolerating them — we are
     in alpha and there are no real documents (Ed, 2026-08-23) — so `c0`–`c5`
     and `m0`–`m2` are refused by the server as well as un-offered here, and
     everything that is not `e`+emoji or `u`+image is simply the empty answer.

     **And an emoji is a glyph, not a disc** (Q685/Q688, Ed 2026-08-23: they
     render *very small and right aligned*, and should be *sized like the text
     around them and replace the circle that images use*). So the emoji branch
     stops emitting an `.av` altogether: `.emojiface` has no box, no ground and
     no size of its own, and inherits whatever text it stands in. The circle
     survives exactly where it is doing work — behind an uploaded photograph
     and behind initials, which need a ground to be legible. */
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
      ' title="Skin tone"><span class="emojiface big">\u270B' + tn + '</span></button>').join('') + '</div>';
  // Any emoji may be a face EXCEPT the surface's own vocabulary (Ed,
  // 2026-08-19): a member whose face is ✏️ would turn every wallet and
  // compose button into a possible mention of them. SURFACE_EMOJI is a scan
  // of session-view.html + setup.js + session.js + fixture-session.js + cards.js for pictographic
  // characters (variation selectors stripped; re-run the scan from the
  // 2026-08-19 commit when the furniture changes); 🛡 arrived with the
  // governance tabs (Q454, 2026-08-21 — 🔧 and ⚙ left the vocabulary with
  // it); 🌡 🪜 🥾 arrived and 📈 🚪 left with the glyph rename of
  // 2026-08-22 (the threshold, the ramp and removal); 🍾 🥂 📨 were three the
  // scan had never been re-run for and joined it with Q687 (2026-08-23,
  // closing Q632) — a member whose face is 🍾 turns every mention of
  // beginning the document into a possible mention of them; the reserved set
  // is that minus the offered faces.
  // Tones are stripped before the test, so ✋🏽 is as reserved as ✋.
  const SURFACE_EMOJI = ('↔ ⏩ ⏰ ⏱ ⏳ ☑ ⚔ ⚖ ✅ ✉ ✋ ✍ ✏ ✒ ✔ ✖ ❄ ❌ ❎ ❓ ' +
    '🌍 🌡 🌶 🍾 🎩 🏛 🏷 👁 👍 👑 👤 👥 💡 💤 📄 📌 📍 📝 📧 📨 📬 📯 🔄 🔗 ' +
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
  // one grapheme, pictographic, not furniture — or 'reserved', or null
  const emojiFaceOf = (raw) => {
    const s = raw.trim();
    if (!s) return null;
    const segs = typeof Intl !== 'undefined' && Intl.Segmenter
      ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].map((x) => x.segment)
      : [s];
    if (segs.length !== 1) return null;
    const g = segs[0];
    if (!/\p{Extended_Pictographic}/u.test(g)) return null;
    if (RESERVED_EMOJI.has(normEmoji(g))) return 'reserved';
    return g;
  };
  const anyEmojiRow = (attr) =>
    '<div class="eyebrow fieldlab">Or any emoji</div>' +
    '<div class="freemoji"><input class="emojin" ' + attr + '="1" maxlength="20"' +
    ' placeholder="🦉 🌵 🫖…">' +
    '<span class="emojinote"></span></div>';
  // **Reserved and taken are both greyed, in the picker itself** (Ed,
  // 2026-08-19: *a normal emoji picker, but with reserved and used emoji
  // greyed out*). The two refusals had lived only in the type-any-emoji box,
  // which meant the grid could offer you something it would then refuse.
  const faceBtn = (f2, ownPic, dataAttr, n) => {
    const own = (ownPic || '') === 'e' + f2;
    const hol = own ? null : FACE_TAKEN('e' + f2);
    const reserved = !own && RESERVED_EMOJI.has(normEmoji(f2));
    if (reserved) {
      return '<button class="avopt taken" disabled title="Reserved — docs.vote uses this one">' +
        avHtml({ n, pic: 'e' + f2 }, 'big') + '</button>';
    }
    return hol
      ? '<button class="avopt taken" disabled title="Taken — ' + esc(hol) + ' got there first">' +
        avHtml({ n, pic: 'e' + f2 }, 'big') + '</button>'
      : '<button class="avopt" ' + dataAttr + '="' + 'e' + f2 + '" aria-pressed="' + own + '"' +
        ' title="' + esc(f2) + '">' + avHtml({ n, pic: 'e' + f2 }, 'big') + '</button>';
  };
  // Mirrors wirePicDrop: the machinery lives here, where the picked value
  // lands stays the caller's.
  const wireFreeEmoji = (attr, onPick) => {
    document.addEventListener('input', (ev) => {
      if (!ev.target.matches || !ev.target.matches('[' + attr + ']')) return;
      const box = ev.target.closest('.freemoji');
      const note = box && box.querySelector('.emojinote');
      const g = emojiFaceOf(ev.target.value);
      const holder = g && g !== 'reserved' ? FACE_TAKEN('e' + g) : null;
      const msg = g === 'reserved'
        ? 'That one is part of the furniture — the marks docs.vote itself uses are reserved.'
        : holder ? 'Taken — ' + holder + ' got there first.' : '';
      if (note) note.textContent = msg;
      if (box) box.classList.toggle('bad', msg !== '');
      if (g && g !== 'reserved' && !holder) onPick(g);
    });
  };
  // **Before there is a name there is still a person** (Ed, 2026-08-19: the
  // picture card offers *initials with a colour picker — or, if they have not
  // given us their name, an anonymous user symbol with a colour picker, which
  // becomes initials when the name is filled*). Drawn rather than a glyph, for
  // the same reason the sealed speaker is: a bare disc reads as a bullet.
  const PERSON = '<svg class="anonav" viewBox="0 0 44 44" aria-hidden="true">' +
    '<circle cx="22" cy="16" r="7.5" fill="currentColor"/>' +
    '<path d="M8.5 37c0-7.2 6-12 13.5-12s13.5 4.8 13.5 12z" fill="currentColor"/></svg>';
  function avHtml(person, cls) {
    const pic = person && person.pic;
    const c = 'av ' + (cls || '');
    // **An emoji is not a disc** (Q688): no ground, no border, no box — it
    // takes the size of the text it stands in, which is what makes one rule
    // right at all nineteen sites at once instead of a specificity race
    // against every context that tunes a two-letter initials size.
    if (pic && pic[0] === 'e') {
      return '<span class="emojiface ' + (cls || '') + '">' + esc(pic.slice(1)) + '</span>';
    }
    // An uploaded picture is stored as 'u' + a data URL, downscaled and
    // re-encoded in the browser before it is ever stored (Q688): the file
    // itself never leaves the page.
    if (pic && pic[0] === 'u') {
      // Only a data-URI image may enter a style attribute (PRODUCTION.md
      // stage 3, defect 4): the server whitelists this shape at
      // set-identity, and the page enforces it again at the sink, because
      // the sink is what survives a data path nobody audited. Anything
      // else stored here renders as nobody — never as markup.
      const u = pic.slice(1);
      if (/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(u)) {
        return '<span class="' + c + ' photo" style="background-image:url(' + u + ')"></span>';
      }
      return '<span class="' + c + ' anon">' + PERSON + '</span>';
    }
    // anything else stored here is the empty answer — a ground index, a mark
    // index, a string nobody audited — and renders as nobody, never as markup
    if (pic) return '<span class="' + c + ' anon">' + PERSON + '</span>';
    // no name yet: the anonymous person, so a disc never reads as a bullet
    if (!person || !person.n) return '<span class="' + c + ' anon">' + PERSON + '</span>';
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
            : '<div class="cpara" data-para="' + c.k + '">' + (chips.length > 1 ? pileHtml(chips, ctx)
              : '<span class="chipcol">' + chipHtml(c, ctx, {}) + '</span>') +
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
        const wants = g.sections.reduce((n, sec) => n + sec.cards
          .reduce((m, c) => m + (ctx.mustAct(c) ? 1 : 0) +
            (ctx.tasksFor ? ctx.tasksFor(c).filter((t) => ctx.mustAct(t)).length : 0), 0), 0);
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
    return '<div class="sugg setupcard" role="tabpanel" data-setupcard="' + c.k + '">' +
      CB.clauseHeadHtml(oo.s || c, {
        label: null, wash: false,
        marks: stripHtml(siblings || [c], ctx),
        html: (rule ? '<div class="headrule">' + rule + '</div>'
            : '<div class="headtitle">' + esc(c.t) + '</div>') +
          (ctx.clauseFor ? (ctx.clauseFor(c) || '') : ''),
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
      // 'the fourteen' was a fixture literal that lied on every roster but
      // one (copy pass, 2026-08-19) — the strip says the same true thing
      // whatever the membership is
      '<p class="setnote">What everyone asked for, without names.</p>';
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
    '<div class="idrow">' + avHtml(me, 'big') +
    '<span class="fld"><label for="myname">Your name</label>' +
    '<input id="myname" data-txt="myname" value="' + esc(me.n || '') + '" placeholder="Your name"></span></div>' +
    ((opts && opts.optional)
      ? '<p class="setnote">You are not a member, so this is <b>optional</b> — leave it blank and the constitution simply shows no name.</p>'
      // a blank name is a real answer (§9.0c), and since the card can be
      // saved empty it has to say what saving it empty does
      : '<p class="setnote">Leave it blank and you appear as <b>Anonymous</b>. You can set it later from any seat.</p>');

  /* **It is an uploader** (Ed, 2026-08-18). The card had offered a ground for
     your initials or a drawn mark, on the reasoning that a mockup has no
     business inventing faces — which is a good rule about *fixtures* and was
     the wrong rule for a *control*, because the thing a member will actually
     do here is give the room their own face. The file never leaves the page:
     it is read into a data URL and drawn, so the mockup invents nothing and
     still behaves like the real control. The initials stay underneath as a
     real answer rather than a fallback — most rooms run on them. */
  /* **Two ways, and then what you get with neither** (Q686, Ed 2026-08-23).
     It had been three sections — a ground for your initials, then an emoji,
     then an upload — which put a decision where there is none: the initials
     are not a third answer you pick, they are what the room shows when you
     have given no picture. So the card is *pick an emoji* → *upload an image*
     → what you are wearing now, and the sentence underneath says what nothing
     means. */
  const EMOJI_GROUPS = [
    ['People', FACE_EMOJI, true],
    ['Faces', ['😀', '😄', '😁', '😆', '😊', '🙂', '😉', '😌', '😍', '🥰', '😎', '🤓',
      '🧐', '🤠', '🥳', '😇', '🤔', '😴', '🤗', '😺', '😸', '🙀'], false],
    ['Animals', ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
      '🐷', '🐸', '🐵', '🦉', '🦄', '🐢', '🐙', '🦋', '🐝', '🦔', '🦥', '🦦', '🦫',
      '🐧', '🦅', '🦆', '🐿️', '🦎', '🐳', '🐬', '🦀', '🐌'], false],
    ['Growing things', ['🌵', '🌲', '🌳', '🌴', '🌱', '🍀', '🌿', '🍁', '🍄', '🌸', '🌼',
      '🌻', '🌹', '🪴', '🍎', '🍊', '🍋', '🍇', '🍓', '🫐', '🍒', '🍑', '🥑', '🥕',
      '🌽', '🍞', '🧀', '🍯', '☕', '🫖'], false],
    ['Things', ['🎸', '🎺', '🎻', '🥁', '🎹', '🎨', '📚', '🔭', '🧭', '🗿', '🏰', '⛵',
      '🚲', '🛶', '🪁', '🎲', '🧩', '🕯️', '🔔', '🪞', '🧵', '🪚', '⚓', '🧲', '🔑',
      '🪄', '🎁', '🧊', '🪵', '🛎️', '🎩', '✏️', '🗝️'], false],
    ['Sky and sea', ['⭐', '🌟', '✨', '🌈', '🌙', '☀️', '🪐', '🌊', '🍃', '☂️', '🌋',
      '🏔️', '🏝️', '🔥', '❄️', '⚡'], false],
  ];
  const emojiPicker = (ownPic, name, dataAttr, freeAttr) =>
    '<div class="emojibox">' + EMOJI_GROUPS.map(([label, set, toned]) =>
      '<div class="eyebrow fieldlab emojilab">' + esc(label) + '</div>' +
      (toned ? faceToneRow() : '') +
      '<div class="avpick">' + set.map((g) =>
        faceBtn(toned ? faceToned(g) : g, ownPic, dataAttr, name)).join('') + '</div>').join('') +
    '</div>' + anyEmojiRow(freeAttr);

  /* One body, two seats (Q686): the applicant's 🖼️ used to hand-roll its own
     copy of the grounds and the picker and carried no uploader at all, which
     is an asymmetry nobody chose. Everything that differs between the two is
     an attribute name and where the file lands. */
  const pictureBody = (me, o) => {
    const opt = o || {};
    const at = opt.picAttr || 'data-pic';
    const free = opt.freeAttr || 'data-picfree';
    const into = opt.into || 'me';
    const pic = me.pic || '';
    const uploaded = pic[0] === 'u';
    return '<div class="eyebrow fieldlab">Pick an emoji</div>' +
      emojiPicker(pic, me.n, at, free) +
      '<div class="eyebrow fieldlab" style="margin-top:var(--s5)">Or upload an image</div>' +
      '<div class="picdrop" data-picinto="' + into + '"><div class="picact">' +
      '<label class="btn">' + (uploaded ? 'Choose another' : 'Choose a picture') +
      '<input type="file" accept="image/*" data-picfile="1"></label>' +
      // it is scaled down and re-encoded here rather than stored whole, so the
      // card has to say what that costs a picture that moves
      '<span class="picnote">or drag one onto this box. It is scaled down and' +
      ' saved as a still, so an animated picture stops moving.</span></div></div>' +
      '<div class="piccur"><span class="piccurlab">Currently:</span> ' + avHtml(me, 'big') +
      (pic ? '<button class="btn" ' + at + '="">Remove</button>' : '') + '</div>' +
      // T28's rule for the picture: the card says what choosing nothing means
      '<p class="setnote">' + (me.n
        ? 'With no picture you appear as your initials.'
        : 'With no picture you appear as an anonymous mark, and as your initials once you have a name.') +
      '</p>';
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
      '<p class="setnote">' + (m.judged || 0) + ' of ' + ctx.E + ' have judged it.</p>';
  }

  /* A **constitutional motion**, which is not a judgment and has no card of its
     own: somebody has asked to re-open a founding question, so the founding
     question is live again and you answer it exactly as you did at the ceremony.
     This band is the whole of the addition — everything below it is the consent
     control that was always there. */
  const motionReopen = (c, ctx, m) =>
    '<div class="unlocks"><b>Re-opened.</b> A member has proposed an amendment' +
    (m.why ? ' — <i>' + esc(m.why) + '</i>' : '') + '. ' +
    'It is constitutional, so it takes everyone: nothing is judged and nothing is ranked — ' +
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
  const motionCommitHtml = (c, dto, heldOut) => {
    const constitutional = routeFor(c, dto) === 'constitutional';
    return constitutional
      ? '<button class="btn btn-approve emojibtn holdmotion"' +
        (!dto || heldOut ? ' disabled' : '') +
        ' title="' + (heldOut ? 'One 🏛️ each — withdraw yours first' : 'A full ten-second hold') + '"' +
        ' data-holdmotion="' + c.k + '">🏛️ Hold to ask everyone</button>'
      // ✏️ on the ordinary commit, to match the 🏛️ on the other route (Ed,
      // 2026-08-19): the two commits are the two routes, and a bare word
      // beside a glyphed hold said only one of them out loud
      : '<button class="btn btn-approve emojibtn"' + (dto ? '' : ' disabled') +
        ' data-putmotion="1">✏️ Propose</button>';
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

  // A gate card says one thing: what it is waiting for, and whether that has
  // happened. What it is waiting *on* is drawn as the cards themselves, so a
  // member reads it as “these, and then you can write” rather than as a rule.
  // (One copy since 2026-08-18 — it had been byte-identical in both surfaces.)
  const gateBody = (c) =>
    '<p class="why">' + c.why + '</p>' +
    '<div class="lockline">' + (c.open() ? TICK : '') + '<span>' +
    (c.open() ? c.done : c.waiting) + '</span></div>' +
    (c.open() ? '' : '<div class="gatelist">' + c.blockers().map((b) =>
      '<span class="gaterow"><span class="gg">' + b.g + '</span>' + esc(b.t) + '</span>').join('') + '</div>') +
    '<p class="setnote">' + (c.open()
      ? 'Nothing is being asked here — <b>OK</b> files it and it leaves your queue.'
      : 'It comes back to you the moment it opens.') + '</p>';

  /* The uploader, one copy for both surfaces: the file is read locally and
     never sent anywhere; where the data lands stays the caller's, named by
     the drop zone's own `data-picinto` so one handler can serve the founder's
     🖼️ and the applicant's.

     **It downscales and re-encodes** (Q688, 2026-08-23). It used to hand the
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

  /* One body per delegable question — the copy a member answers against,
     identical on both surfaces because it is the same question. */
  const ANSWER = {
    quorum: (A, E, form) => {
      const share = form === 'share';
      const asN = (v) => (share ? Math.max(1, Math.ceil(v / 100 * E)) : v);
      const mean = (v) => (asN(v) >= E
        ? 'Nothing moves unless every member has weighed in. A document that cannot change without all of them is a perfectly reasonable thing to want.'
        : asN(v) <= Math.ceil(E / 4) ? 'A small part of the room can carry a change while the rest are elsewhere.'
        : 'Rather more than half the room has to have looked at a question before it can move.');
      return '<p class="why">How many ' + (E >= 2 ? 'of the ' + E : 'of the membership') + ' must weigh in before a question can change the document — short of that it waits; silence is never a vote. Asked as a <b>' + (share ? 'share of the membership' : 'count') + '</b>: the wording is the founder’s, the number is the room’s.</p>' +
      (share
        ? slider(A, 'quorum', 5, 100, (v) => v + '% — ' + asN(v) + ' of ' + E, mean, 5)
        : slider(A, 'quorum', 1, E, (v) => v + ' of ' + E, mean)) +
      '<p class="blindnote">Nobody sees your answer. The document takes the <b>highest</b> given, so it is never lower than yours.</p>';
    },
    bar: (A) =>
      '<p class="why">How sure the room must be that a new wording beats the one it replaces, <b>at the close, where an adoption is permanent</b>. A confidence, not a vote share. Everything earlier can still be challenged, so this one number covers the whole way; how it climbs is the founder’s pacing.</p>' +
      slider(A, 'bar', 50, 95, (v) => v + '%', (v) =>
        v >= 85 ? 'Only near-agreement changes anything. Expect the document to move slowly and keep most of what it started with.'
        : v <= 60 ? 'A modest preference is enough. The document will move quickly, and reverse itself more often.'
        : 'A clear preference is needed, but not agreement.', 5) +
      '<p class="blindnote">Nobody sees your answer. The document takes the <b>highest</b> given.</p>',
    authorship: (A) =>
      '<p class="why">Rationales are always visible; what varies is whether a name is attached. The <b>most private</b> answer wins: one person who wants no names keeps the document unnamed.</p>' +
      ladder(A, 'authorship', [
        { v: 'anonymous', t: 'Nobody’s name, ever', e: 'Not during the session and not in the closing record.' },
        { v: 'sealed', t: 'Names at the close', e: 'Hidden while the document is being written; published with the record.' },
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
        { v: 'after', t: 'Revealed after the decision', e: 'Published with the record, never before it.' }]) + BLINDNOTE,
    policy: (A) =>
      '<p class="why">How somebody who is not a member can become one. The <b>least open</b> answer wins: one member who wants invitation only keeps it so.</p>' +
      ladder(A, 'policy', [
        { v: 'invite', t: 'Invitation only', e: 'Nobody joins unless a member brings them in.' },
        { v: 'proposed', t: 'Applications must be proposed by members', e: 'Anybody can apply, but nothing happens until a member takes the application up and proposes it.' },
        { v: 'apply', t: 'Anyone may apply', e: 'An application goes straight to the members, who judge it like any other proposal.' },
        { v: 'open', t: 'Open', e: 'Anyone with the link becomes a member the moment they open it.' }]) + BLINDNOTE,
    chamber: (A) =>
      '<p class="why">Who may read the document besides the members — readers only, never counted. The <b>most private</b> answer wins: one member who wants the room closed closes it.</p>' +
      ladder(A, 'chamber', [
        { v: 'closed', t: 'Members only', e: 'Nobody outside the membership sees anything at all.' },
        // Public left every ladder on 2026-08-22 (Q603): offered nowhere,
        // read back everywhere a document that took it still states it
        { v: 'link', t: 'Anyone with the link', e: 'The chamber view only, to whoever the link reaches.' }]) + BLINDNOTE,
    removal: (A) =>
      '<p class="why">How this room may remove a member. Whichever is chosen, the member always sees a removal proposed against them. The <b>most protective</b> answer wins: one member who wants everyone asked keeps everyone asked.</p>' +
      ladder(A, 'removal', [
        { v: 'everyone', t: 'Everyone has to agree, including them', e: 'One refusal keeps them in, their own counted: effectively, nobody is removed against their will.' },
        { v: 'others', t: 'Everyone else has to agree', e: 'The whole room, minus the member in question, must agree.' },
        { v: 'ordinary', t: 'A proposal ✏️ like any other', e: 'Judged at the approval threshold like any change, with quorum.' }]) + BLINDNOTE,
    machines: (A) =>
      '<p class="why">An AI that patrols the document for drift and proposes fixes — it never judges, and counts toward no quorum; its proposals compete on the same terms as anybody’s. The <b>most restrictive</b> answer wins: if you would rather not have AI proposals, they stay out.</p>' +
      ladder(A, 'machines', [
        { v: false, t: 'No AI proposals', e: 'People write everything in this document.' },
        { v: true, t: 'AI proposals are permitted', e: 'They compete on the same terms as anybody’s and can be out-judged like anybody’s.' }]) + BLINDNOTE,
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
      '<p class="blindnote">Nobody sees your answer. The document takes the <b>longest</b> asked for, <b>never</b> the longest of all.</p>',
    rate: (A) =>
      '<p class="why">The most sparing proposal rate you would accept. The document takes the <b>most generous</b> answer given.</p>' +
      '<span class="fld"><label>The fewest ✏️ to start with</label><input class="num" type="number" min="0" max="40"' +
      ' data-ansnum="rate"' + (typeof A.rate === 'number' ? ' value="' + A.rate + '"' : '') + '></span>' + BLINDNOTE,
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
      body: 'You have named a document <b>' + esc(title) + '</b> and chosen its address, <b>docs.vote/' + esc(slug || '…') + '</b>.',
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
    return '<div class="pick' + (on ? ' on' : '') + (off ? ' off' : '') + (extra || '') + '">' +
      '<button class="lanepick" aria-pressed="' + on + '"' + (off ? ' disabled' : '') +
      (off ? '' : ' data-set="' + key + '" data-val="' + val + '"') + '>' +
      '<span class="dot"></span><span>' + ttl + '</span></button>' +
      (exp ? '<span class="exp">' + exp + '</span>' : '') +
      (inner ? '<span class="inner">' + inner + '</span>' : '') + '</div>';
  };

  const num = (S, key, label, min, max, suffix) =>
    '<span class="fld"><label>' + label + '</label><span class="numrow">' +
    '<input class="num" type="number" data-num="' + key + '" value="' + S[key] + '" min="' + min + '" max="' + max + '">' +
    (suffix ? '<span class="setnote" style="margin:0">' + suffix + '</span>' : '') + '</span></span>';

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
    bandHtml, fitBand, pileHtml, stripHtml, cardHtml, readBody, watchBody, distHtml,
    nameBody, pictureBody, opt, num, faces, someIn, FACE_EMOJI,
    FACE_TONES, faceToneRow, faceToned, setFaceTone,
    anyEmojiRow, wireFreeEmoji, emojiFaceOf, setFaceTaken, faceTakenBy, faceBtn, emojiPicker,
    motionBody, motionReopen, routeFor, motionCommitHtml,
    slider, ladder, ANSWER, BLINDNOTE, gateBody, wirePicDrop, MAILS, renderMailModal, birthPass };
})();
