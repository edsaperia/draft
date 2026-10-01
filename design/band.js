/**
 * design/band.js — the bodies a founder fills in, the applicant's seat, the
 * band and the page's own render (lifted out of session-view.html's inline
 * script as refactor Q1352 (f), 2026-09-14).
 *
 * **The constitution, at the top of the document** (SURFACE §8): the band is
 * two piles and the card one of them opens into, and everything that draws
 * that card is here — `BODY`, one body per setting the founder fills in; the
 * founder's ladder drawn against a view of `S` in which what stands is blank
 * (Q1293); the applicant's five cards and the seat that serves them; the
 * band itself, whose `cardFor` picks a card's kind; the title card's own
 * pinning; the commit row's title and its live correction; and `render`,
 * the page's one repaint, which the band is the largest part of.
 *
 * One file rather than two, because the bodies and the band are one
 * readership with no seam between them: `BODY` has exactly one caller
 * (`cardFor`, inside `drawBand`), `ladderView` · `rungOpt` · `theyDecide`
 * exactly one (`BODY`), and splitting them would have put a dozen page-made
 * wrappers between two halves of the same card.
 *
 * `make(env)` is called by the page where the first of these lines stood, so
 * everything it returns — `render` above all — is bound before the wiring
 * that presses it. The env has three kinds. Values are page constants in
 * hand at that line. `cs`, `strCtx`, `WAL` and `lastOpen` are read through
 * `env` at each use: `cs` and `lastOpen` are reassigned, the other two are
 * made further down the page, and `lastOpen` is written back through
 * `setLastOpen` because the page owns it. Every page function arrives as a
 * wrapper read when called, which is what lets the door's, 🍾's and the
 * wallets' own names — all made below this line — resolve at call time. The
 * shared module's helpers come straight from `window.SETUP`, the same
 * destructure the page takes them with, rather than through twenty-two
 * wrappers that would only hand back what `window.SETUP` already holds.
 *
 * `birthsMuted` goes back as a property: it is the band's own render state —
 * what is born arrives, unless a stagehand act (a seat switch, ⏩) mutes the
 * entrances — and three of the page's handlers set it.
 *
 * Load order: after session.js and the other splits, before the inline
 * script that makes it.
 */
window.BAND = (function () {
  function make(env) {
    const { S, M, SESSION, PAGE_COPY, CC, ctx, band, rail, BIRTH, PW_KEYS, DKEY, DELEGABLE,
      CHOSEN, TYPED, ANSTYPED, PROPOSE, snaps, ADM_RULE, AUTH_RULE, CHAMBER_RULE, JUDG_RULE,
      REMOVAL_RULE, ENDING_NEVER, WHAT, OPTHEADLESS, EMAIL_OK, SLUG_OK, penWaitTitle, MANAGED_KEYS } = env;
    // the page's own functions, wrappers read when called
    const { APPL_RULE, E, LAPSE_RULE, STRCARDS, acked, admissionPrice, amFounder,
      appPicPickNow, atTheDoor, card, changedFrom, checkSlug, chosenRadio, clauseCtx, commitFor, commitReady,
      composerOn, constituted, csState, cs_titleNow, decidingOf, decisionLine,
      directInvite, directRemove, docAddr, docOpen, doorDirect, doorErrHtml, doorErrOn,
      dripParts, endsAtMsOf, fieldsOf, focusOpened, founderCommit, founderDirect,
      founderHandOff, founderInfo, founderMark, founderPairNote, founderPairOn, founderSpeakerLane, founderFace, groups, powerParts, powerOtherHtml, iDraft, isChange, isNum, isRoom, isStranger,
      judgedOn, launchFarewell, launchGrant, mayPen, mayPenOn, me, membersHold, openCardDirty, midOf, motionOn, motionTargets, nameOfMember, namePickNow, oneVoiceAsk, penTabsArrive,
      perpetual, picPickNow, policyNow, proseCounts, ready,
      removalPrice, removeSubjectPicker, renderDev,
      renderPowerWallets, renderRail, renderTitle, resolveCounts, sentenceFor,
      serverNow, settled, signedClose, slugNoteHtml, slugRefused, standsTyped,
      strangerCardHtml, strangerReadCard, syncCharter, syncFromCs, syncGrantAcks,
      syncOwedDepartures, syncOwedHeld, syncOwedMailGiveUps, syncOwedOks, syncOwedReleases,
      takeSnap, takingBack, textDivs, titlePending, titleStands, viewerIsClerk, viewerIsMember,
      wantsDelegate, whyLane, wordsFor } = env;
    // the shared module, the same names the page destructures from it
    const { esc, TICK, avHtml, bandHtml, fitBand, nameBody, pictureBody, opt, num, numIn,
      ANSWER, stateOf, MAILS, renderMailModal, pileHtml, routeFor, listOf,
      // 👥's share and 💤's unit picker (Q1439): the bounds, the (x of y) slot
      // and the select are setup.js's, so the founder's card, the member's
      // answer card and the composer draw one control between them
      SHARE, shareTail, shareSlot, quorumNote, quorumSlot,
      LAPSE_BOUNDS, lapseParts, unitSel } = window.SETUP;
    // 👥's two sentences, copy.js's (Q1439, ruling p) — one home for the
    // founder's card, the member's answer card and the composer's lane
    const RULE_QUORUM = window.COPY.page.quorumRule;
    // the drawn glyphs (Q1401): one picture per character wherever the band
    // emits a glyph as markup — a commit button, an application's hold row —
    // and `glyphify` for the glyphs inside the band's own sentences
    const { glyphHtml, glyphify } = window.CARDS;
    // ---- the bodies a founder fills in ------------------------------------
    // **Constitutional settings default to the room; ordinary ones default to
    // you** (Ed, 2026-08-18, agreeing the proposal rate back to the founder). One rule
    // where there had been a rule and three exceptions, and the ordinary /
    // constitutional cut is what explains it: an ordinary setting can be taken
    // back by the room at any time with an ordinary motion, so defaulting it to
    // the founder costs them nothing. A constitutional one cannot — changing it
    // needs everybody — so it has to be theirs from the start or it is not
    // really theirs at all.
    // §9.7 v0.52 (Ed, 2026-08-19): the verb is **delegate**, and it is never
    // a button — a constitutional sentence among the setting's own options.
    // Since 403 the sentence survives only on the applications card (whose
    // holder rides its value, so delegation IS one of its values); every
    // other setting delegates through the ✒️/🛡️ tabs.
    const POSTLABEL = 'Applications are delegated to the members';
    const POSTNOTE = 'The rule stays as it is, but from now on the members change it: you propose like anybody else, and nothing waits for your OK. You cannot take this back on your own — that would need all members to agree.';
    // 403 (Ed, 2026-08-19): “The members decide” is no longer a value —
    // delegation is the state of holding neither power, said by the ✒️ and
    // 👑 tabs. On a delegated setting the value card explains, and picking
    // a value is the taking-back.
    // **Delegation is an option on the card** (Q511, Ed 2026-08-21: *delegation
    // should be an option on the decision card … which is essentially the same
    // as “skip this and go to the next one”, because it means “don't decide
    // now”*). It stands apart from the values, after them, because it is not
    // one of them: the others answer the question, this one hands it over. It
    // is the same act the ✒️/🛡️ tabs perform — holding neither power — said
    // where a founder walking the constitution will meet it, and in a single-
    // file founding it is also the only way past a question you are not ready
    // to answer. Rendered once, for whatever card is open, so no body can
    // forget it and none of the settings that cannot be delegated can get it.
    const delegateRung = (c) => {
      const dk = DKEY[c.k];
      if (!dk || !DELEGABLE.includes(dk)) return '';
      if (!env.cs || env.cs.constitutedAtT !== null) return '';   // one-way after the start
      // **No radiogroup of its own** (Q771): this rung writes the *same* state
      // key as the values above it, so it is part of that question rather than a
      // second one. Two elements each claiming the role made two groups out of
      // one decision, which the value group's own label already covers.
      // …and since the card review (Q1150–Q1152) the rung says the question the
      // delegation hands over — `DECIDING`'s per-setting sentence — and carries
      // **no explanation of the blind collection**: the *Not now — every member
      // states…* frame and the per-setting aggregation tail are gone (Q1152).
      // **And it is not said anywhere else either** (issue #19). This said
      // blindness survived on the member's own answer card, in a `BLINDNOTE`
      // constant; Q1175 took the note off every answer body the same evening
      // — bare blocks, the clause text being the explanation — and left the
      // constant behind, defined, exported and rendered nowhere, so the
      // comment described a card nobody has been served since. The constant
      // is gone with this note. Blindness returns to the surface with the 🍾
      // redesign (Q1169); until then it is stated in no body at all.
      return '<div class="choice delegrung">' +
        opt(ladderView(c.k), dk, 'roster', decidingOf(c.k) + '.', '') +
        '</div>';
    };
    // **One fact, one home** (Q763, STYLE T36). How blind answers aggregate had
    // two homes and both printed into one body: the card record's `rule`, which
    // the delegate rung above explains itself with, and a literal note handed to
    // this function at every call site. On ⏱️, 👥 and 🥾 the two were verbatim,
    // so a delegated card said the same sentence twice a few lines apart. The
    // note argument is gone: the record owns the aggregation rule and this
    // paragraph prints the one fact only it can know — the frame, and what
    // applies **meanwhile**, while the question is still collecting.
    const theyDecide = (key) => {
      if (!wantsDelegate(key)) return '';
      // **The pre-start frame is gone** (Ed's QA, 2026-09-02 pm, finishing
      // Q1152): *Asked of everyone before drafting begins, blind — you among
      // them… Picking a value here takes it back.* and the `meanwhile` tail all
      // leave the delegated card; the blindness story returns with the 🍾
      // redesign (Q1169). The post-start sentence stays — it is about motions,
      // not the founding.
      return (env.cs && env.cs.constitutedAtT !== null)
        ? '<p class="setnote">You propose like anybody, and nothing comes to you for assent. Picking a value here takes it back.</p>'
        : '';
    };

    // Q506: the register's "and afterwards" pair is gone from this card —
    // the ✒️ and 🛡️ tabs under 🤝 are where the Founder keeps or gives up
    // inviting directly and the OK on carried applications, like any setting.
    // Founded by [avatar] [name] at [time] on [date] (Ed, 2026-08-19) —
    // the time is the start (§9.6a), never known before it. **The line itself
    // stands from the save** (Q640, Ed 2026-08-22): what is unknown before the
    // start is the *moment*, not the founding, so the sentence renders as soon
    // as there is a document and *gains* its time at the 🍾 press — the same
    // reasoning that makes an unnamed document read *Untitled* rather than
    // leave a gap where the answer goes.
    const foundedAt = () => {
      if (!env.cs || env.cs.constitutedAtT === null) return '';
      const d0 = new Date(env.cs.constitutedAtT);
      const p2 = (x) => String(x).padStart(2, '0');
      // the date in the page's own words, never the browser's locale (STYLE T16, Q1523)
      return ' at ' + p2(d0.getHours()) + ':' + p2(d0.getMinutes()) + ' on ' + window.CARDS.longDay(d0.getTime());
    };
    // **The Founded line is a clause, not a colophon** (Q639 (a), Ed 2026-08-22).
    // It is where ✒️ and 🛡️ hang their tabs now, so the sentence has to be
    // available in two places at once: as the paragraph in the band, and as the
    // *thing* at the head of the card that opens on it — the 🪪 pattern, where a
    // clause is a list rather than a sentence. It carries markup (the avatar, the
    // 👑 span), so it rides `ctx.clauseFor` beside `rosterClause()` and never
    // `headFor`, which escapes what it is given.
    const foundedClause = () =>
      (!env.cs ? '' : '<p class="cpv founded">Founded by ' +
        avHtml(founderInfo()) + ' ' + esc(founderInfo().n.trim() || 'Anonymous') +
        // 👑 by any reservation (Ed, Q379 wide); 📯 = holds nothing.
        ' ' + founderMark() + esc(foundedAt()) + '.</p>');
    // the close's moment, the same shape as the founding's
    const closedAtWords = () => {
      if (!env.cs || !env.cs.closed || env.cs.closedAt == null) return '';
      const d0 = new Date(env.cs.closedAt);
      const p2 = (x) => String(x).padStart(2, '0');
      // the date in the page's own words, never the browser's locale (STYLE T16, Q1523)
      return ' at ' + p2(d0.getHours()) + ':' + p2(d0.getMinutes()) + ' on ' + window.CARDS.longDay(d0.getTime());
    };
    // **The percent ladder left with the percent** (Q1362, 2026-09-15).
    // `pctRung` drew entry 165's rungs — the number in small type after the
    // rung's name, and an `.exp` that was the module's sentence about this
    // room as it stands — and its only two users were 🌡️'s three presets and
    // 🪜's start ladder inside *Rising*. No control on this surface asks for a
    // percent now; `opt` draws every block there is.
    // **The room every meaning is about, built once per read** (entry 167).
    // Four fields and no more, because a sentence may depend on the room and on
    // nothing else: the arrived membership, ⏰'s answer as it stands, this
    // page's own clock (the module reads none), and 🌡️'s number — the
    // founder's field where they have set one, else what the room settled,
    // which is the same source `startRungs`' dimming reads.
    // **An unanswered ⏰ is absent, not *never***: `endsAtMsOf` returns null for
    // both, and a sentence that read the two alike would promise *for as long
    // as it runs* on a card the founder meets **before** ⏰ in the order.
    const endingKnown = () => { const st = csState('ending');
      return !!(st && st.value) || S.ending === 'perpetual' || isNum(Date.parse(S.endsAt)); };
    const roomNow = () => ({
      e: E(),
      endsAtMs: endingKnown() ? endsAtMsOf() : undefined,
      nowMs: serverNow(),
    });
    // **The meaning lines went, all three** (Ed, 2026-09-18, Q1439). `meaning`,
    // `meanLine` and `syncMeaning` stood here: the module's sentence about
    // what a value would do to this room, printed under every number box and
    // repainted in place at each keystroke. Each rule sentence stands alone
    // now. `roomNow` survives because the setup context still publishes it.
    // **But (x of y) still follows the keystroke** (Q1439, ruling m). The
    // numbers a share comes to stand inside the clause the box is in, so they
    // are repainted in place rather than by a render — **nothing rebuilds
    // under a press**, and a card rebuilt under the caret is the drag bug's
    // cousin. The full render still waits for `change`, as the slider's does.
    // **…and 👥's own sentence with them** (Q1490, R-139): the one meaning
    // line left on the surface is repainted by the same rule and in the same
    // breath — only the block whose form is chosen has a number that means
    // anything, so the other block's slot is emptied rather than left stale.
    const syncShare = (el) => {
      if (!el.closest) return;
      const card = el.closest('.setupcard') || document;
      card.querySelectorAll('[data-share]').forEach((slot) => {
        const k = slot.dataset.share;
        slot.textContent = k === 'quorum' && S.quorumForm === 'share'
          ? shareTail(S.quorumPct, E()) : '';
      });
      card.querySelectorAll('[data-qnote]').forEach((slot) => {
        const [k, form] = String(slot.dataset.qnote).split(':');
        slot.textContent = k === 'quorum' && S.quorumForm === form
          ? quorumNote(form, form === 'share' ? S.quorumPct : S.quorumN, E()) : '';
      });
    };
    // ---- **What stands is not offered back** (Q1293, Ed 2026-09-09, reading
    // (a)) ------------------------------------------------------------------
    // A settled option-block card drawn for the founder's own hand carries the
    // standing rule as block one, wearing its provenance radio (Q1167 (a)), and
    // beneath it the founding ladder — which drew every rung, the standing one
    // lit from `S` and reading *Chosen ✒️ or Proposed 🏛️*, a press nobody had
    // made. The same sentence stood twice with two pressed radios that meant
    // two things. The composer had the rule already — *what stands omitted by
    // value* (Q620) — and the founder's ladder takes it now: the ladder draws
    // against a **view** of `S` in which what stands is blank, the pure rung
    // equal to what stands is omitted, the standing form's field-carrying
    // block stays with its field empty (📍 and 🪶's own rule since round 3's
    // 29/30), nothing is pressed on open (F6) and the commit is dark until the
    // card differs from what stands. `S` itself is untouched: every other
    // reader of the founder's fields — the meanings, 🪜's dimming, the bin's
    // snapshot — goes on reading the standing value.
    //
    // `standingBlock(k)` is the same test the head uses to draw the rule as
    // block one: the founder's ladder branch is the only caller of `BODY`, so
    // the seat is implied.
    const standingBlock = (k) => !!env.cs && OPTHEADLESS.has(k) && !!card(k) && settled(card(k));
    // the rung key(s) a card's blocks light on — blanked in the view only while
    // the whole card equals what stands, so a number typed into the standing
    // form lights its block (F6: typing into a rung's field is choosing it)
    const RUNG_KEYS = new Set(['chamber', 'joinBy', 'admission', 'removal', 'authorship',
      'judgments', 'lapse', 'ending', 'quorumForm', 'rateBy',
      'quorumBy', 'policyBy']);
    // the standing value as the page's own fields, on a scratch object — the
    // holder keys ride along, since a founder-set value is held `'founder'`
    const standingFields = (k) => {
      const st = csState(k);
      if (!st || st.value === null || st.value === undefined) return null;
      const T = {};
      fieldsOf(midOf(k), st.value, T);
      if (k === 'quorum') { T.quorumForm = st.value.form; T.quorumBy = 'founder'; }
      if (k === 'rate') T.rateBy = 'founder';
      if (k === 'applications') T.policyBy = 'founder';
      return T;
    };
    // does the card, as the founder's fields hold it, equal what stands — the
    // composer's own comparison (`founderProposal`), by value and never by
    // label (Q620); ⏱️ compares the one number the card can say (Q1160)
    const unchangedCard = (k) => {
      if (!standingBlock(k)) return false;
      // **A delegated card with no value has nothing to equal** (Q1318): it
      // reads settled, so it has a standing block, but `standsTyped` falls
      // back to the founder's own fields where nothing stands — a card compared
      // with itself, *unchanged* on every press, its ✒️ dark before the
      // take-back could be committed on any key
      const st = csState(k);
      if (!st || st.value === null || st.value === undefined) return false;
      if (CHOSEN[k] && !CHOSEN[k]()) return false;
      let v = null;
      try { v = TYPED[k] ? TYPED[k]() : null; } catch (e) { return false; }
      const s = standsTyped(k);
      if (!v || !s) return false;
      if (k === 'rate') return +v.dripMinutes === +s.dripMinutes;
      return JSON.stringify(v) === JSON.stringify(s);
    };
    const sameField = (a, b) => (a === b) || (isNum(a) && isNum(b) && +a === +b);
    // `S`, or — under a standing block — a copy of it with what stands blank.
    // `__stand` carries the standing fields for `rungOpt`'s omission.
    const ladderView = (k) => {
      if (!standingBlock(k)) return S;
      const st = standingFields(k);
      if (!st) return S;
      const V = Object.assign({}, S);
      const same = unchangedCard(k);
      for (const f of Object.keys(st)) {
        if (RUNG_KEYS.has(f) ? same : sameField(S[f], st[f])) V[f] = '';
      }
      V.__stand = st;
      return V;
    };
    // a pure rung — no field of its own — is omitted where it is what stands;
    // a field-carrying block is drawn with `opt` directly and stays
    const rungOpt = (V, key, val, ttl, exp, inner, off, extra) =>
      (V.__stand && sameField(V.__stand[key], val) ? '' : opt(V, key, val, ttl, exp, inner, off, extra));

    // **What 🎩 stands at, read from the module** (Q1503): the Founder's row
    // carries the role and `settled(card('hat'))` says whether it was ever
    // set (`membershipSet`, or the start, or this page's own press). Null
    // until then, so nothing is pre-answered (F6). The body and the commit
    // row read this one function, so they cannot disagree about it.
    const hatCurrent = () => (settled(card('hat')) || S.seen.has('hat'))
      ? (iDraft() ? 'member' : 'clerk') : null;
    const BODY = {
      // the retrospective branch keys on the **start**, not on the OK (Q820):
      // until 🍾 the column below is still the founder's and still the answer,
      // so the card that describes it must still describe it in the present
      text: () => (constituted()
        ? '<div class="unlocks"><b>The text the document started from.</b> Drafting changes the document in place, so the page may have moved on — this is what stood when it began.</div>' +
          '<div class="propblock"><div class="rtext">' +
          (String(env.cs.text || '').trim() === ''
            ? '<i>It began empty — the membership wrote it.</i>'
            : textDivs(env.cs.text)) +
          '</div></div>'
        // **Before the start the text is not a card body at all** (backlog
        // 204): 📝 toggles edit mode on the column itself, and the only card
        // that opens here is a power tab's, whose head is its own sentence
        // (`powerHeadLine`) and whose clause is the column below. The
        // acknowledgement this branch used to carry (Q797, an OK) is retired —
        // 📝 → write → ✒️, and no OK anywhere.
        : ''),
      hat: (locked) => {
        const started = !!(env.cs && env.cs.constitutedAtT !== null);
        // the radio is the session-view's own opt(), over the derived current
        // (the pw() pattern): the generic data-set handler lands S.hatPick
        // nothing is preselected until it has been answered once — and
        // **answered is the module's word, not this page's** (Q1503, Ed's
        // convention observation 2026-09-22): `S.seen` is page-local and no
        // reload rebuilds it, so a founder who came back past 🍾 met two
        // greyed radios with neither marked. `hatCurrent` reads the row.
        const o = { hatPick: S.hatPick || hatCurrent() };
        // 🎩 has no clause in the constitution, so its two sentences live here
        // alone, in the clause voice (Q1109; STYLE §3 — third person, about
        // the document)
        return '<div class="choice" role="radiogroup">' +
          // the consequences cut, the fact kept (Ed's card review, 2026-09-02);
          // *a clerk can stay unnamed* survives on ✋'s clerk branch alone
          opt(o, 'hatPick', 'member', window.COPY.shell.hat.member, '', '', started || !!locked) +
          opt(o, 'hatPick', 'clerk', window.COPY.shell.hat.clerk, '', '', started || !!locked) +
          '</div>';
        // the *Settled.* note went with Ed's card review round 3 (2026-09-05,
        // 39 🎩): a locked card says so by its greyed radios alone
      },
      // settled, the composer is the second option block, its lane inside the
      // sentence (Ed's QA, 2026-09-02 pm; Q1137's inline pattern) — the birth
      // keeps the big lane, the page's first act
      // **…blank, outlined, at the standing title's size, with its own radio**
      // (Ed's card review round 3, 2026-09-05, 29; A2): the lane holds only
      // what has been typed *since* the card opened — never the standing
      // title, which is block one's — and *Choose this* beneath it names the
      // block, chosen the moment something is typed (F6)
      // The branch is *does a title stand*, not *is there a document* (Ed,
      // 2026-09-06): re-opened at the birth the card is the same two blocks as
      // post-save — the composer holds only what differs from what stands (📍's
      // own rule), so it is born blank and unpressed; at the birth it is the
      // bare lane at title size, since block one is the bare name.
      title: () => (titleStands()
        ? (() => { const typed = S.titleDraft !== null && S.titleDraft !== cs_titleNow() ? S.titleDraft : '';
          const lane = '<span class="lp editlane titlelane' + (typed ? '' : ' blank') + '"' +
          ' contenteditable="plaintext-only" spellcheck="false" data-titlelane="1"' +
          ' data-ph="A new title">' + esc(typed) + '</span>';
          return '<div class="choice"><div class="pick' + (typed ? ' on' : '') + '"><span class="opttext">' +
          (env.cs ? 'The document is titled ' + lane + '.' : lane) + '</span>' +
          '<button class="lanepick" type="button" aria-pressed="' + !!typed + '" data-pickinput="1">' +
          '<span class="dot"></span><span class="off">' + PAGE_COPY.pw.chooseThis + '</span>' +
          '<span class="on">' + PAGE_COPY.pw.chosen + '</span></button></div></div>'; })()
        : '<div class="lanebox"><div class="lp editlane titlelane' + (titlePending() ? '' : ' blank') + '"' +
          ' contenteditable="plaintext-only" spellcheck="false" data-titlelane="1"' +
          ' data-ph="Give this document a title">' + esc(titlePending()) + '</div></div>'),
      // Stripped to the field on Ed's word (2026-08-19): the unlocks line, the
      // suggested-from-the-title note, "what people paste to each other", the
      // label and the Copy button all went. The card is titled Link and holds a
      // link — everything else was the surface explaining a thing that explains
      // itself. What survives is what the field cannot say: that a *collision*
      // moved your slug, whether what you have typed is legal and free, and
      // that changing it later breaks nothing.
      // **Settled, the alternative is a block that starts blank** (Ed's card
      // review round 3, 2026-09-05, 30; A2): the standing address is block one
      // (the head), the field beneath shows nothing until something is typed,
      // and the *is taken, so this one is* history goes — `slugNoteHtml` keeps
      // only a live refusal there. At the birth the field is the card, as before.
      slug: () => (env.cs
        ? (() => { const stands = ((csState('slug') || {}).value || {}).slug;
          const typed = S.slug !== stands ? S.slug : '';
          return '<div data-slugnote>' + slugNoteHtml() + '</div>' +
            '<div class="choice"><div class="pick' + (typed ? ' on' : '') + '"><span class="opttext">' +
            'The document lives at ' + docAddr('') +
            '<input data-slug="1" value="' + esc(typed) + '" spellcheck="false">.</span>' +
            '<button class="lanepick" type="button" aria-pressed="' + !!typed + '" data-pickinput="1">' +
            '<span class="dot"></span><span class="off">' + PAGE_COPY.pw.chooseThis + '</span>' +
            '<span class="on">' + PAGE_COPY.pw.chosen + '</span></button></div></div>'; })()
        : '<div data-slugnote>' + slugNoteHtml() + '</div>' +
        '<span class="fld"><span class="setrow2">' +
        '<span class="setnote" style="margin:0">' + docAddr('') + '</span>' +
        // a suggested address is the machine's until touched (Q534 (c)): marked,
        // since the bin has nothing of yours to put back
        '<input data-slug="1" value="' + esc(S.slug) + '"' + (S.slugAuto ? ' data-machine="' + esc(S.slug) + '"' : '') + ' spellcheck="false">' +
        '</span></span>') +
        // the rules recital went with the rest (Ed, 2026-08-19) — a legal link
        // says the one thing worth saying, that it is free. The illegal case
        // keeps its line: that is not helper text, it is why the ✒️ is greyed.
        // only when there is something wrong with it (Ed, 2026-08-19: *only
        // tell me when it's not free*) — a legal, free link needs no receipt
        (SLUG_OK.test(S.slug) ? ''
          : '<p class="setnote">' + PAGE_COPY.slugNote.illegal + '.</p>') +
        // **Changing it sets up a redirect** (Ed, 2026-08-18). The link is
        // changeable and it is also the thing that has already been sent to
        // fourteen people — so a change that broke the old one would make this
        // the one ordinary setting with a cost for using it as intended.
        // **Said where you might change it, not where you set it** (Ed,
        // 2026-08-19): before the save nothing has been sent to anybody, so a
        // promise about old links is answering a worry nobody has yet.
        // one short promise since Ed's QA of 2026-09-02 pm — the redirect
        // mechanics went with the rest of the explanatory copy
        (env.cs ? '<p class="setnote">Previous links still work.</p>' : ''),
      myemail: () => (S.emailVerified
        // **The standing address is the first block** (Ed's QA, 2026-09-02 pm):
        // the status quo on top wearing the chosen radio, a new address as the
        // block beneath — typing into it is the change, exactly as before. The
        // verification-restarts note is cut; the flow itself says it.
        ? '<div class="choice"><div class="pick on"><span class="opttext">' + esc(S.myemail) + '</span>' +
          chosenRadio('Chosen') + '</div>' +
          // the second option carries its own *Choose this* (Ed's card review
          // round 3, 2026-09-05, 42; A2): typing chooses it, the radio says so
          '<div class="pick"><span class="opttext"><input type="email" data-txt="myemail" value="" placeholder="you@example.com"></span>' +
          '<button class="lanepick" type="button" aria-pressed="false" data-pickinput="1">' +
          '<span class="dot"></span><span class="off">' + PAGE_COPY.pw.chooseThis + '</span>' +
          '<span class="on">' + PAGE_COPY.pw.chosen + '</span></button></div></div>'
        : S.emailSent
        // **The document says it was sent** (Ed, 2026-08-21): the clause reads
        // *The Founder is checking their email for a link*, so the card does
        // not repeat it — and *nothing exists yet, so a typo costs nothing* was
        // reassurance about a state the reader is not in danger from.
        ? (env.cs ? '<p class="why">The mail is the login: clicking its link is what proves the address works.</p>' : '') +
          // **The composer is simply there** (Ed, 2026-08-21). *Wrong address?*
          // was a button whose whole job was to put the field back — so the
          // field stays, and typing in it is the correction. Resending moved to
          // the commit row, where every other act on this surface lives.
          '<span class="fld"><input type="email" data-txt="myemail" value="' + esc(S.myemail) + '" placeholder="you@example.com"></span>' +
          (BIRTH ? '' : '<div style="margin-top:var(--s3)"><button class="btn" data-act="openmail">Open your inbox</button></div>') +
          (BIRTH ? ''
            : '<p class="setnote">In the mockup the inbox is a pretend one — the mail in it is the magic link, and clicking it proves the address works' + (env.cs ? '.' : ' and creates the document at ' + docAddr(esc(S.slug)) + '.') + '</p>')
        // the send button and the two explanatory blocks left on Ed's word
        // (2026-08-19): ✒️ sends it, and the card is a field with a title over
        // it — which is the whole of what it has ever been asking for
        : (S.emailErr
            ? '<p class="why"><b>' + esc(S.emailErr) + '</b></p>'
            : '') +
          (env.cs
            ? '<p class="why">Your address is the only way back in — there are no passwords — so a new one has to prove it works before it replaces the old.</p>'
            : '') +
          '<span class="fld"><input type="email" data-txt="myemail" value="' + esc(S.myemail) + '" placeholder="you@example.com"></span>'),
      // the standing pair for the *keep* block, the draft for the composer
      // (Q1327); the applicant's `apppic` passes no draft and reads one value
      myname: () => nameBody(me(), { optional: viewerIsClerk(), pick: namePickNow(),
        draft: S.mynameDraft, locked: !!(env.cs && !docOpen()) }),
      mypic: () => pictureBody(me(), { pick: picPickNow(), draft: S.mypicDraft,
        locked: !!(env.cs && !docOpen()) }),
      // 🌂 (Q1400, Ed 2026-09-16): the warning is the whole body — *if you
      // give up your membership you may not be able to rejoin* — and the
      // row's ✓ is the act (`data-act="resign"`, the same press *Leave* was)
      leave: () => '<p class="why">' + PAGE_COPY.cards.leave.body + '</p>',
      // **Whether the founder is in it is its own question** (Ed, 2026-08-18).
      // It had been the top half of the roster card, which made a decision about
      // one person a preamble to a list of everybody — and the founder is a hat
      // worn over a role rather than a role itself (SPEC §9.0a), so the hat and
      // the roster are two things.
      // The box is drawn only where it can send (Q812): before the start
      // anybody may be brought in freely, and after it only the pen invites
      // directly — with the shield alone, or with neither power, inviting is a
      // proposal like any other and the sentence says so rather than offering
      // a field that answers nothing (Q813).
      // **✉️ is where invitations are made** (Ed, 2026-08-26, entry 94): the
      // box that was 🪪's, on the door — drawn only where the viewer's word can
      // send (Q812): the founder before the start or holding the door's ✒️,
      // any member while 🪪 stands at ✒️. Otherwise the door is a composer,
      // and the sentence says what the proposal will cost.
      // …and where it composes instead, nothing but the composer (Ed's card
      // review round 3, 2026-09-05, 63): the price is 🪪's clause to state
      invite: () => (constituted() && !directInvite()
        ? doorErrHtml('invite')
        // and where the document is stuck on a question nobody can answer, the
        // card leads with *why you are here* (Q828) — the remedy above the door
        : oneVoiceAsk() +
        // **One box** (Ed's card review, 2026-09-02, Q1166): the single-address
        // field with its own ✒️, the *Several at once* eyebrow and the two
        // explanatory paragraphs are gone. What is left is the multi-line box —
        // its placeholder the two lines Ed wrote — and the send is the commit
        // row's ✒️ (the act moved from the body to the row; Y24's *word sends*
        // test still decides whether this branch is drawn at all). The box
        // keeps what is in it across a close, like every other field here: a
        // pasted list of addresses is the most expensive thing anybody types
        // on this card (Ed, 2026-08-21).
        '<div class="roster">' +
        '<textarea placeholder="name@example.com&#10;one address per line" data-emails="1">' + esc(S.inviteMany) + '</textarea>' +
        '</div>' +
        // the arrived-count sentence and its two reassurances are cut (Ed's QA,
        // 2026-09-02 pm) — who has arrived is the membership list's to say
        doorErrHtml('invite')),
      // **❌ with the pen is exile at will** (Ed, 2026-08-26): immediate, and
      // every answer the member was standing on leaves with them — the card
      // says so in the sentence, and the button is the whole of the act
      // **❌ names its subject with one control** (entry 96, Ed 2026-08-26): a
      // dropdown of **members and invitees alike** — withdrawing an invitation
      // is a kind of removal — in place of the per-row *❌ Remove* list, which
      // put the same act on as many buttons as there were people.
      // **The acts live on the commit row** (Ed's QA, 2026-09-02 pm): you
      // choose the person, then press the commit that is the act — ✒️ removes
      // at will, the route's commit proposes. The at-will explanation and the
      // policy recap are cut: the policy is 🥾's clause to state, and this is
      // the place a removal is *done*.
      remove: () => (directRemove()
        ? (constituted() ? ''
            : '<p class="why">' + PAGE_COPY.door.removeBeforeStart + '</p>') +
          removeSubjectPicker() +
          doorErrHtml('remove')
        // a member's card is unchanged by that QA — Ed reviewed the founder's
        : '<p class="why">' + ({
            consent: 'Removing a member is a proposal every member answers, including them — nobody leaves against their will.',
            assembly: 'Removing a member is a proposal every other member answers; they see it running.',
            proposal: 'Removing a member is a proposal the membership decides.' })[removalPrice()] +
          ' Anybody may leave at any time.</p>' + doorErrHtml('remove')),

      // **The door, apart from the register** (Ed, 2026-08-18). The policy is
      // the constitutional act; each application that arrives through it is
      // its ordinary consequence.
      applications: () =>
        // **Who may join** (Ed, 2026-08-18, with the Applicants subsection):
        // the gate the Apply card hangs off. An application becomes an
        // ordinary proposal to grant membership, judged like any other.
        // Q506: the holder left this card for the power tabs; delegated by
        // default like every constitutional setting, so the members' option
        // leads the list the way it does on ⏰ or 🌍.
        (() => { const V = ladderView('applications');
        return '<div class="choice" role="radiogroup" aria-label="Who may join">' +
        theyDecide('applications') +
        rungOpt(V, 'joinBy', 'invite', APPL_RULE('invite')) +
        rungOpt(V, 'joinBy', 'apply', APPL_RULE('apply')) +
        '</div>'; })(),
      // **Admissions** (Ed, 2026-08-26, entry 94): one price for every route
      // in — a member's invitation, a stranger's application — on the same
      // three-verb scale as 🥾. The Founder's own hand is the ✉️ door's.
      admission: () =>
        // the options are the clause sentences themselves (Q1109) — the why
        // paragraph and per-option explainers went with the same ruling
        (() => { const V = ladderView('admission');
        return '<div class="choice" role="radiogroup" aria-label="The price of admission">' +
        theyDecide('admission') +
        rungOpt(V, 'admission', 'assembly', ADM_RULE.assembly) +
        rungOpt(V, 'admission', 'proposal', ADM_RULE.proposal) +
        rungOpt(V, 'admission', 'pen', ADM_RULE.pen) +
        '</div>'; })(),
      ending: () => (() => { const V = ladderView('ending');
        return '<div class="choice" role="radiogroup">' +
        theyDecide('ending') +
        // **The picker stands inside the sentence** (Ed's card review
        // 2026-09-02, Q1137's pattern): the block states the rule with the
        // date where its number goes, so *At a set time* retired with the
        // stacked field. The chips a shape's unit once grew above the field
        // left with 🧭 (Q1363).
        opt(V, 'ending', 'ends',
          'No more changes to the document may be made after ' +
          '<input class="num numin datein" type="datetime-local" data-txt="endsAt" value="' + V.endsAt + '">.') +
        rungOpt(V, 'ending', 'perpetual', ENDING_NEVER) +
        '</div>'; })(),
      quorum: () =>
        // **The form joins the question** (Ed, 2026-09-02, Q1162 — Q341
        // reversed for 👥 alone, R-082): two blocks, each the rule as it would
        // stand with its number inline (Q1137's pattern). The *Asked as* /
        // *The number* eyebrows and the *I set it* rung fold into them;
        // picking a block or typing in its box chooses that form (F6) and
        // takes the question back.
        (() => { const V = ladderView('quorum');
        return '<div class="choice" role="radiogroup">' +
        theyDecide('quorum') +
        // …and since Q1439 the sentence is Ed's own (ruling p) with the
        // numbers after the share (ruling m), the box running **1 to 100**
        // since Q1490 (R-139): the whole scale, with `quorumSlot` under each
        // block saying what the number comes to at either end of it.
        opt(V, 'quorumForm', 'share',
          RULE_QUORUM.share(numIn(V, 'quorumPct', SHARE.min, SHARE.max) + '%',
            shareSlot('quorum', V.quorumPct, E())) +
          quorumSlot('quorum', 'share', V.quorumPct, E()), '') +
        opt(V, 'quorumForm', 'count',
          RULE_QUORUM.count(numIn(V, 'quorumN', 1, 40)) +
          quorumSlot('quorum', 'count', V.quorumN, E()), '') +
        '</div>'; })(),
      authorship: () =>
        (() => { const V = ladderView('authorship');
        return '<div class="choice" role="radiogroup">' +
        theyDecide('authorship') +
        rungOpt(V, 'authorship', 'anonymous', AUTH_RULE.anonymous) +
        rungOpt(V, 'authorship', 'anonymousElective', AUTH_RULE.anonymousElective) +
        rungOpt(V, 'authorship', 'sealed', AUTH_RULE.sealed) +
        rungOpt(V, 'authorship', 'sealedElective', AUTH_RULE.sealedElective) +
        rungOpt(V, 'authorship', 'public', AUTH_RULE.public) +
        // the choose-this-yourself warning cut by Ed with the review
        // (2026-09-02) — §3.5a's protection is unchanged, only the note goes
        '</div>'; })(),
      judgments: () =>
        (() => { const V = ladderView('judgments');
        return '<div class="choice" role="radiogroup">' +
        theyDecide('judgments') +
        rungOpt(V, 'judgments', 'never', JUDG_RULE.never) +
        rungOpt(V, 'judgments', 'decision', JUDG_RULE.decision) +
        rungOpt(V, 'judgments', 'after', JUDG_RULE.after) +
        '</div>'; })(),
      rate: () =>
        '<div class="choice" role="radiogroup">' +
        theyDecide('rate') +
        // **⏱️ is one number** (Ed, 2026-09-02, Q1160/Q1161, R-083): the grant
        // and the maximum are the mechanism's fixed 3 and are not on the card;
        // the sentence carries the number in the card's own unit with a
        // minutes/hours/days selector beside it — input only, minutes stored.
        (() => { const V = ladderView('rate');
          const p = dripParts(V.dripMin);
          const unit = V.dripUnit || (p ? p.unit : 'minutes');
          // the typed number rides only while the minutes do (Q1161 rescales
          // one from the other): blank minutes are a blank block
          const shown = isNum(V.dripN) && p ? V.dripN : (p ? p.n : '');
          const sel = '<select class="num numin dripunit" data-dripunit="1">' +
            ['minutes', 'hours', 'days'].map((u) =>
              '<option value="' + u + '"' + (u === unit ? ' selected' : '') + '>' + u + '</option>').join('') +
            '</select>';
          return opt(V, 'rateBy', 'founder',
            'Members may make a new proposal ✏️ every ' +
            '<input class="num numin" type="number" data-num="dripN" min="1" max="2880"' +
            (shown === '' ? '' : ' value="' + shown + '"') + '> ' + sel + '.', ''); })() +
        '</div>',
      chamber: () =>
        (() => { const V = ladderView('chamber');
        return '<div class="choice" role="radiogroup">' +
        theyDecide('chamber') +
        // most-private-first, the order every ladder on the surface reads in
        rungOpt(V, 'chamber', 'closed', CHAMBER_RULE.closed()) +
        rungOpt(V, 'chamber', 'link', CHAMBER_RULE.link()) + '</div>'; })(),
      lapse: () =>
        (() => { const V = ladderView('lapse');
        return '<div class="choice" role="radiogroup">' +
        theyDecide('lapse') +
        // **The card leads with lapsing** (Ed, 2026-09-02, Q1149 — the options
        // swap, the sentences stand as he wrote them; display order is not
        // aggregation order, so the consent direction is untouched). The day
        // count stands inside the clause (Q1137's pattern), and typing into it
        // still chooses the rung (F6).
        // …and since Q1439 the period is stated in minutes, hours or days
        // (ruling j): the unit is a picker inside the sentence, ⏱️'s pattern,
        // input only — the spell itself is what is stored (`lapseMs`).
        (() => { const p = lapseParts(V.lapseMs);
          // the founder's own pick, else the unit the spell in the box
          // divides into, else the unit of what stands (the settled ladder
          // blanks a field that equals it), else days
          const unit = V.lapseUnit || (p ? p.unit : ((V.__stand && V.__stand.lapseUnit) || 'days'));
          const b = LAPSE_BOUNDS[unit] || LAPSE_BOUNDS.days;
          // the typed number rides only while the spell does (the picker
          // rescales one from the other): a blank spell is a blank block
          const shown = isNum(V.lapseN) && p ? V.lapseN : (p ? p.n : '');
          return opt(V, 'lapse', 'days',
            'After <input class="num numin" type="number" data-num="lapseN" min="' + b[0] +
            '" max="' + b[1] + '"' + (shown === '' ? '' : ' value="' + shown + '"') + '> ' +
            unitSel(unit, 'data-lapseunit="1"') +
            ', inactive members lapse and automatically abstain from votes.', ''); })() +
        rungOpt(V, 'lapse', 'never', LAPSE_RULE('never'), '') +
        '</div>'; })(),
      removal: () =>
        (() => { const V = ladderView('removal');
        return '<div class="choice" role="radiogroup">' +
        theyDecide('removal') +
        rungOpt(V, 'removal', 'consent', REMOVAL_RULE.consent) +
        rungOpt(V, 'removal', 'assembly', REMOVAL_RULE.assembly) +
        rungOpt(V, 'removal', 'proposal', REMOVAL_RULE.proposal) +
        '</div>'; })(),
    };


    // ---- the applicant's seat (ported from founding-ceremony, Ed 361) -------
    // Plain tasks: the same rail entries and the same card shell, asking for
    // the only things an application is. The email is the identity (verified
    // by magic link before anything can be submitted), member emails are
    // unique, and an empty application is a real application.
    const APPLICANT = { get judged() {
      // live, the server counts on the motion (Q1281): a count, never who
      if (env.cs && env.cs.isRemote) return (env.cs.v && env.cs.v.applicant && env.cs.v.applicant.judged) || 0;
      if (!env.cs || !S.app.csId) return 2; // fixture until the module holds it
      const a = env.cs.applicantRecords().get(S.app.csId);
      const rec = a && a.motion ? env.cs.motionRecords().get(a.motion) : null;
      if (!rec) return 0;
      if (rec.status === 'carried') return E();
      // **The count is on the applicant's own motion** (entry 138): this read
      // the setting key `'admission'`, which entry 96 moved every admit motion
      // off — its key is `adm:<applicant>` now, and `motionTargets` is the one
      // place that is spelled, so the readout cannot drift from the card again.
      return judgedOn(rec, motionTargets(rec));
    } };
    const MEMBER_EMAILS = { has: (e2) => S.roster.some((r) => (r.e || '').toLowerCase() === e2) };
    const APPCARDS = () => {
      const a = S.app;
      // one label each (not settings, so no `n`); the words are copy.js's
      const T = PAGE_COPY.appcards;
      // **🪪 is news once the door has shut under you** (SURFACE E33, Q901):
      // the title says what happened instead of asking for an application that
      // cannot be made, and the card is done once the OK has been given. It is
      // the card's own `t` rather than an `n`, because `n` would also stand on
      // a *submitted* application, which is a different done.
      // …and the same rule where the answer was no (Q1473): the title says
      // what happened, since *Apply for Membership* over a refusal offers an
      // application that has already been made and answered
      const shut = applyShutOnMe();
      const base = [{ k: 'apply', g: '🪪',
        t: a.refused ? T.refusedTitle : a.admitted ? T.admittedTitle : shut ? T.shutTitle : T.apply, own: 'you',
        kind: 'personal', done: () => a.submitted || (shut && a.shutAcked) }];
      if (!a.started) return base;
      return base.concat([
        { k: 'appmail', g: '📧', t: T.appmail, own: 'you', kind: 'personal', done: () => a.emailVerified },
        { k: 'appname', g: '✋', t: T.appname, own: 'you', kind: 'personal', done: () => !!a.name.trim() },
        { k: 'apppic', g: '🖼️', t: T.apppic, own: 'you', kind: 'personal', done: () => !!a.pic },
        { k: 'apptext', g: '👋', t: T.apptext, own: 'you', kind: 'personal', optional: true, done: () => !!a.text.trim() },
      ]);
    };
    // **An application refused at the door** (Q901, SURFACE E33, entry 97): 🤝
    // shut after the applicant verified and before they submitted. The poll
    // can know — the applicant's view carries `applyOpen`, computed as the
    // stranger's door computes it — so the card says so *before* the press
    // (Y25's shape: one sentence under the control that tried) and Submit is
    // dark. The fixture reads the same expression `renderRail` uses.
    // **And since Q901 the sentence is a news card that takes an OK** (Ed,
    // 2026-09-14): it asked nothing, so nothing recorded that the applicant had
    // ever met it. The refusal stays derived — the rule as it stands is the
    // whole of it — and only the OK is persisted, on their own row.
    const APPLY_SHUT = PAGE_COPY.appcards.shut;
    const applyShutOnMe = () => {
      const a = S.app;
      if (!a.emailVerified || a.submitted) return false;
      // shut means 🤝 no: at ✒️ the door is open and a verified applicant's
      // submit admits them (issue #36 F3) — `applyOpen` alone read that as shut
      if (env.cs && env.cs.isRemote) {
        return env.cs.v && env.cs.v.applyOpen === false && env.cs.v.joinOpen === false;
      }
      return policyNow() !== 'apply';
    };
    const appCtx = {
      get open() { return S.open; }, get E() { return E(); },
      mustAct: (c) => !c.done() && !(c.optional && S.app.submitted),
      yours: (c) => c.k === 'apply' && S.app.submitted,
      // every one of the five stays in the rail, done ones grey (Q1392): the
      // way back to an answer — the rationale most of all — is its entry
      pinAll: true,
      // the shut door is news, not an ask (SURFACE E33, Q901) — the only news
      // an applicant is ever served, and grey the moment they OK it
      news: (c) => c.k === 'apply' && applyShutOnMe() && !S.app.shutAcked,
      waiting: (c) => c.k === 'appmail' && S.app.emailSent && !S.app.emailVerified,
      fillOf: (c) => (c.k === 'apply' && S.app.submitted
        ? Math.round(APPLICANT.judged / E() * 100) + '%' : '100%'),
      summary: (c) => (c.k === 'apply'
        // a shut door says so in the title since Q901, so the teaser that
        // used to carry it would now be the same sentence twice (C13)
        // submitted, the entry says what is happening to it, in the words the
        // rest of the surface uses (Q1391, Ed 2026-09-16: *before the members
        // — a proposal like any other* is a baffling thing for a queue card to say)
        ? (S.app.refused ? PAGE_COPY.appcards.refused : S.app.admitted ? PAGE_COPY.appcards.admitted : S.app.submitted ? 'Submitted — the members are deciding' : applyShutOnMe() ? '' : S.app.started ? (['appname', 'apppic'].every((k2) => APPCARDS().find((x) => x.k === k2).done()) ? 'Ready to submit' : 'Three small tasks') : 'Membership is by application')
        : c.k === 'appmail' ? (S.app.emailVerified ? S.app.email + ' · verified'
          : S.app.emailSent ? 'Check your inbox' : 'Your identity here')
        : c.k === 'appname' ? (S.app.name || 'What members will call you')
        : c.k === 'apppic' ? (S.app.pic ? 'Chosen' : 'An emoji, or a picture of your own')
        : (S.app.text ? 'Written' : 'A few words — optional')),
      value: (c) => appCtx.summary(c), isRoom: () => false,
    };
    const APPBODY = {
      apply: () => {
        const a = S.app;
        const ready2 = a.started && a.emailVerified && a.name.trim() && a.pic;
        // **what the application holds so far** (Q1366, Ed 2026-09-15): the
        // three cards send nothing — a ✓ on ✋ 🖼️ 👋 closes and keeps — and
        // nothing on the surface said what had been kept until Submit, so a
        // picture chosen and closed looked unsaved. One row per thing the
        // submission carries, as given or as not yet given; the card says
        // what the application *is*, never what Submit does (T45).
        const H = PAGE_COPY.appcards.holds;
        const holdRow = (g, label, val) => '<div class="approw"><span class="g">' + glyphHtml(g) + '</span><span>' + esc(label) + ' · </span>' + val + '</div>';
        const holds = '<div class="applist">' +
          holdRow('✋', H.name, a.name.trim() ? '<b>' + esc(a.name.trim()) + '</b>' : '<i>' + esc(H.noName) + '</i>') +
          holdRow('🖼️', H.picture, a.pic ? avHtml({ n: a.name, pic: a.pic }) : '<i>' + esc(H.noPicture) + '</i>') +
          holdRow('👋', H.words, a.text.trim() ? '<b>' + esc(a.text.trim()) + '</b>' : '<i>' + esc(H.noWords) + '</i>') +
          '</div>';
        // **the answer, where it was no** (Q1473, Ed 2026-09-19): a refused
        // application read *Submitted — the members are deciding* for ever,
        // and Ed's ruling makes the refusal the ordinary case at 🏛️. One
        // sentence, naming nobody and counting nothing; the explainer above
        // it goes with the vote it explains.
        if (a.refused) return '<p class="why">' + esc(PAGE_COPY.appcards.refused) + '</p>';
        // …and where it was yes (issue #29 F2): the promise of a mail has been kept
        if (a.admitted) return '<p class="why">' + esc(PAGE_COPY.appcards.admitted) + '</p>';
        // what it goes before, by 🪪's price (issue #29 F3); nothing at ✒️ once
        // submitted, the race having opened at whatever price it met
        const price = admissionPrice();
        const WHY = PAGE_COPY.appcards.why;
        return (a.submitted && price === 'pen' ? ''
          : '<p class="why">' + esc(WHY[price] || WHY.proposal) + '</p>') +
          (a.submitted
            ? '<div class="lockline">' + TICK + '<span>Submitted. ' + APPLICANT.judged + ' of ' + E() + ' have voted on it — you will get an email either way.</span></div>'
            : a.started
            ? holds + '<p class="setnote">' + (ready2 ? 'Everything needed is in — the words are optional.' : 'The email, the name and the picture are needed; the words are optional.') + '</p>'
            : '<p class="setnote">Nothing is collected before you begin, and nothing is sent until you submit.</p>');
      },
      // **A body holds choices; an action is the row's** (Q1399, Ed
      // 2026-09-16: *avoid body buttons that are an action rather than a
      // choice*). The send is the row's 📧 (below, with the stranger's rule);
      // the pretend inbox stays a mockup device, as the founder's is (BIRTH).
      appmail: () => {
        const a = S.app;
        return a.emailVerified
          ? '<div class="lockline">' + TICK + '<span>Verified — <b>' + esc(a.email) + '</b> is your identity here.</span></div>'
          : a.emailSent
          ? '<p class="why">Sent to <b>' + esc(a.email) + '</b>. Nothing is submitted until the address has proved it works — it is your identity here, and the only way the answer can reach you.</p>' +
            (env.cs && env.cs.isRemote ? '' : '<div style="margin-top:var(--s3)"><button class="btn" data-appmailopen="1">Open your inbox</button></div>') +
            // **the field stays** (Q609, 2026-08-22): *Wrong address?* was a button
            // whose whole job was to put the field back, as on 📧 — so the field
            // stays under the sent note, and typing a different address is the
            // correction: it un-sends, and the send button returns
            '<span class="fld"><label>Your email</label><input type="email" data-appmail="1" value="' + esc(a.email) + '" placeholder="you@example.com"></span>'
          : '<p class="why">Your email is your <b>identity</b> here — the magic link is the login, the answer to your application arrives on it, and no two members may share one. It has to prove it works before you can submit.</p>' +
            '<span class="fld"><label>Your email</label><input type="email" data-appmail="1" value="' + esc(a.email) + '" placeholder="you@example.com"></span>' +
            (appAddrTaken() ? '<p class="setnote"><b>Already a member’s address.</b> A member email is one identity — if it is yours, log in with it instead of applying.</p>' : '');
      },
      appname: () => '<p class="why">What the members will call you — in the application, and in the membership if it passes.</p>' +
        '<span class="fld"><label>Your name</label><input data-appname="1" value="' + esc(S.app.name) + '" placeholder="Your name"></span>',
      // **The founder's own card** (Q733) — one body, two seats, so they cannot
      // drift. It used to be a hand-rolled copy with no uploader in it at all.
      apppic: () => pictureBody({ n: S.app.name, pic: S.app.pic },
        { picAttr: 'data-apppic', into: 'app', pickKey: 'appPicPick', pick: appPicPickNow() }),
      apptext: () => '<p class="why">A few words to the members, if you want them — who you are, why this document. Optional: an empty application is a real application.</p>' +
        '<div class="lanebox"><div class="lp editlane' + (S.app.text ? '' : ' blank') + '" contenteditable="plaintext-only"' +
        ' spellcheck="false" data-apptext="1" data-ph="To the members…">' + esc(S.app.text) + '</div></div>',
    };
    /**
     * **The applicant's five, on the one shell** (Q1541 stage 5): placeless —
     * there is nothing of theirs in the document yet — so each heads with its
     * title as the label (grammar §2.3, the placeless exception) and opens at
     * the top of the band where it always has. The body is what it always
     * was; the acts move to the row unchanged: *Begin*, *Submit*, the 📧 that
     * sends the link, and ✓ that closes and keeps (Q1366) — dark until the
     * card is done, as before. A shut door's news takes its OK (E33). No bin
     * where it can never have a job (1541.9): only 🖼️'s choice can be put
     * back. A submitted application's card asks nothing, so it has no row —
     * the module has no withdrawal for 1541.9 (b)'s bare 🗑️ to draw.
     */
    function applicantShell(key) {
      const c = APPCARDS().find((x) => x.k === (key || S.open));
      if (!c) return null;
      const a = S.app;
      const T = PAGE_COPY.appcards;
      let body = APPBODY[c.k]();
      const acts = [];
      let owed = null;
      if (c.k === 'apply') {
        const shut = applyShutOnMe();
        // the door has shut (E33): the sentence stands before the press; a
        // refusal from the wire lands in the same place through `doorErrHtml`;
        // both retire the way Y25 says — the door opening again, or a keystroke
        if (!shut && S.doorErr && S.doorErr.k === 'apply') S.doorErr = null;
        // **and a shut door's card is the sentence and nothing else** (Q901)
        if (shut) body = '';
        if (a.started && !a.submitted) {
          body += shut && !doorErrOn('apply') ? '<p class="why">' + esc(APPLY_SHUT) + '</p>' : doorErrHtml('apply');
        }
        if (a.submitted) { /* asks nothing */ }
        else if (shut) { if (!a.shutAcked) owed = { kind: 'ok', attrs: ' data-appshutok="1"', word: 'OK' }; }
        // a word, not 🏛️: an application becomes an ordinary motion, and the
        // 🏛️ glyph belongs to the assembly-press hold
        else if (!a.started) acts.push({ kind: 'commit', cls: 'btn-approve wordbtn', attrs: ' data-appstart="1"', glyphHtml: esc(T.begin), title: T.begin });
        else {
          acts.push({ kind: 'commit', cls: 'btn-approve wordbtn', attrs: ' data-appsubmit="1"', glyphHtml: esc(T.submit),
            title: T.submitTitle, until: a.name.trim() && a.pic ? null : 'choose' });
        }
      } else if (c.k === 'appmail' && !a.emailSent && !a.emailVerified) {
        // the send is the row's 📧, armed by a valid address that is nobody
        // else's — the stranger's 📧 rule (reading 1194, T47), since Q1399
        acts.push({ kind: 'commit', glyph: '📧', glyphHtml: glyphHtml('📧'), cls: 'btn-approve emojibtn',
          attrs: ' data-appmailsend="1"', title: T.sendLink, until: appAddrOk() ? null : 'type' });
      } else {
        if (c.k === 'apppic') {
          const dirty = openCardDirty();
          acts.push({ kind: 'bin', title: PAGE_COPY.binPutBack,
            attrs: dirty ? ' data-revert="1"' : ' data-act="bin"', until: dirty ? null : 'nothing-yours' });
        }
        acts.push({ kind: 'commit', glyph: '✓', glyphHtml: TICK, cls: 'btn-approve', attrs: ' data-close="1"',
          until: c.done() || c.optional ? null : (c.k === 'apppic' ? 'choose' : 'type') });
      }
      // the opening sentence (or lockline), else a field, leads the card
      const lead = /^\s*(<p class="why">[\s\S]*?<\/p>|<div class="lockline">[\s\S]*?<\/span><\/div>|<span class="fld">[\s\S]*?<\/span>)/.exec(body);
      const first = lead ? lead[1] : '';
      const rest = lead ? body.slice(lead[0].length) : body;
      return {
        kind: 'applicant',
        frame: { cls: 'sugg setupcard', attrs: ' role="tabpanel" data-setupcard="' + esc(c.k) + '"' },
        label: { text: c.t },
        // **one drawing with the stranger's two** (the coordinator's call 10
        // (b), stage 5): the first line is what the card asks — its opening
        // sentence, or its address box where it has none; 🖼️ has neither, its
        // blocks being the whole of it, so it carries the strip alone
        head: { html: window.SETUP.headHtml(c, appCtx, [c], first ? '<div class="headrule asblock">' + first + '</div>' : '') },
        body: rest ? { html: rest } : null,
        acts, owed,
      };
    }
    // drawn from `stateOf`, as the band's kinds are (the door source)
    function applicantCardHtml() {
      if (!applicantShell()) return '';
      return glyphify(window.CARD_SHELL.cardHtml(window.CARD_STATE.stateOf(S.open)));
    }
    /** the applicant's address is already a member's — one identity per address (§9.7½) */
    const appAddrTaken = () => MEMBER_EMAILS.has(S.app.email.trim().toLowerCase());
    /** an address the 📧 will send to: well-formed and nobody else's */
    const appAddrOk = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(S.app.email) && !appAddrTaken();

    // ---- a setting's change, told (hoisted out of cardFor for stage 3a, so
    // the shell's settings cards and the old bodies read one pair) ----------
    // **A pen change is an amendment, and reads like one** (Ed, 2026-08-22:
    // *a unilateral rule change by the founder is still just a kind of
    // amendment and so should be treated in the same way in terms of how
    // it's communicated and reported*). So this stopped reading the
    // setting's own last-set fields and reads **the amendment record**,
    // which is where every route already lives — and the dividend is that a
    // clause now carries its history whoever changed it, the founder's pen
    // and the membership's motion in one line with one shape.
    //
    // Who it names follows the route, and has to: the pen is attributed by
    // construction, so the founder's name and face are on it; a raised
    // motion's mover is **sealed until the record** (§3.4), so that one is
    // the membership's act and wears the featureless disc.
    // The module hands back `MotionRecord`s and the wire hands back
    // `MotionView`s, and they name two of these fields differently — so
    // they are normalised here into the one shape the copy below reads,
    // rather than each caller remembering which it is holding.
    function lastAmendment(k) {
      if (!env.cs) return null;
      const mid = midOf(k);
      let best = null;
      try {
        for (const m of env.cs.motionRecords().values()) {
          if (m.status !== 'carried') continue;
          if (!m.payload || m.payload.kind !== 'set' || m.payload.setting !== mid) continue;
          const at = m.at !== undefined && m.at !== null ? m.at : (m.settledAtT || 0);
          const from = m.from !== undefined && m.from !== null ? m.from
            : (env.cs.amendedFrom ? env.cs.amendedFrom(m.id) : null);
          const one = { route: m.route, why: m.why || null, at, from };
          if (!best || one.at >= best.at) best = one;
        }
      } catch (e) { return null; }
      return best;
    }
    // what was Q530's two halves: the Founder's reason lane stays; the
    // reader's *has changed … from … to …* line retired with 1564.5 (b)
    // (Ed, 2026-09-27) — a change's history is its record behind the tab
    function changeHalf(cc) {
      const k = cc.k;
      if (cc.ansFor || cc.isGate || cc.door || !PW_KEYS.includes(k) || k === 'text') return '';
      // the founder, about to change something that already stands: a lane
      // — where they still can (entry 62). A rationale field on a setting
      // whose pen is down, or on a closed document, is asking for the reason
      // for a change that cannot be made.
      // **One lane, both routes** (entry 161): the same sentence rides the
      // pen as `setWhy` (T25, attributed by construction) and the proposal
      // as `openMotion`'s `why` (K12, C11) — a reason is owed for the
      // change, not for the road it takes. `founderProposal` reads it here.
      if (amFounder() && env.cs && founderDirect(cc) && isChange(k) && !motionOn(cc) && !membersHold(cc)) {
        const v = (S.setWhy && S.setWhy[k]) || '';
        // no heading over it (Q1560 (2)): its placeholder is its words, as on
        // a text proposal's rationale
        return '<div class="body whyset">' + founderSpeakerLane(v) + '</div>';
      }
      // …and nothing for anybody else: **a change's history lives only in its
      // record behind the rule's tab** (Ed, 2026-09-27, 1564.5 (b), amending
      // SURFACE §2's L7) — the *has changed … from … to …* line, its reason
      // and its date, left the composer, the rule card and the clause
      return '';
    }

    // ---- stage 3a: the band's settings on the one shell (Q1541) ------------
    // **A settings card is its rule, opened** (answers.md 1541.3, .5, .47): the
    // label *Current rule* above the first line (Part 4 .3); the first line the
    // rule as the Rules paragraph states it, without its powers line (1541.10),
    // wearing the **standing pill** — who chose it (T48) — which for a reader
    // who can choose is the chosen radio of the card's own group, pressed on
    // open, so choosing it again cancels a change (`data-standpick`); the other
    // options below a hairline, what stands omitted by value (Q620, Q1293);
    // the reason box always shown on a card that can take a change (1541.21
    // (b)); the bin dark until there is something of yours on the card
    // (1541.9); the Founder's ✒️ not drawn at all until Founder Actions is
    // accepted (Part 4 .19). Four kinds, each its card-audit `data-kind`:
    //
    //   setting      the Founder's own card — at the birth, in the founding,
    //                and live on a setting whose pen they hold (SURFACE §9's
    //                *setting (founder, pen)* row)
    //   watching     the rule read by somebody who cannot choose it now — a
    //                member before the start, the Founder before Founder
    //                Actions or whose hand is off it — and any settings card
    //                while its news is owed, the OK its row
    //   answer       a blind question put to a member (`ans-*`)
    //   birth-email  📧 before the save
    //
    //   power        a power tab ✒️ 🛡️ (stage 3b, 1541.48): the label its ask,
    //                the first line this power's own clause naming its
    //                subject, wearing the pill; the other state below, for
    //                the Founder whose hand it is — read by anybody else
    //   composer     a member's settled card, the composer (K1, stage 3b):
    //                the rule wearing the pill as the chosen radio of the
    //                composer's own group, the setting's controls below, the
    //                reason box, 🗑️ and the route's commit
    //
    // 🪪 🤝 and 🎩 are settings cards like the rest (stage 3b): 🎩 is no
    // catalogue setting, so it is named here; locked at 🍾, it is read. Motions
    // are stage 4's; the stranger's is stage 1's.
    /** the setting a card is about — an answer card's own setting */
    const hostCard = (c) => (c && c.ansFor ? card(c.ansFor) : c);
    /** the Founder's own body path — the card `cardFor` gives the founder's
     *  ladder (BODY) rather than the read body; the same test it asks */
    const founderBody = (c) => amFounder() && !founderHandOff(c) && c.own !== 'you' && !doorDirect(c);
    /** has this reader a commit on the Founder's own card: 🪶 at the birth,
     *  the ✒️ once Founder Actions is accepted (Part 4 .19). A card with none
     *  cannot take a change here, so it reads as the rule (principle 4) */
    const founderCanCommit = () => !env.cs || (mayPen() && docOpen());
    /** is a member's composer holding something typed and not sent — the
     *  news never takes a composer out from under a draft (the P1 sweep) */
    const composing = (c) => S.open === c.k && !!S.draft && S.draft.k === c.k && !!(S.draft.to || S.draft.why);
    /** has this member accepted the powers this composer sends with — ✏️
     *  Proposals for an ordinary route, 🏛️ Constitutional Proposals for a
     *  constitutional one, both where the route follows the value (329a). A
     *  commit for a power not yet accepted is not drawn (answers Part 4 .19),
     *  so until they are the settled card reads as the rule and says which to
     *  accept */
    const composerWaits = (c) => {
      const routes = c.routeOf ? ['ordinary', 'constitutional'] : [routeFor(c, '')];
      return [['ordinary', 'canpropose', 'proposals'], ['constitutional', 'grant-voice', 'constitutional']]
        .filter(([r, k]) => routes.includes(r) && !acked(k)).map(([, , w]) => w);
    };
    /**
     * **A card that only reads, on the one shell** (Q1541 stage 10): its
     * label, the paragraph's own sentence as its first line — which says who
     * is deciding a rule nothing stands on yet — and, where the caller has
     * one, a sentence beneath; no row. What the door shows of a rule still
     * being decided (Q510), and the card whose subject left the page while it
     * stood open (`kind: 'read'`), which the old bodies drew one way each.
     */
    function readState(c, sibs, cx, note) {
      const line = decisionLine(c, false);
      return {
        kind: 'read', acts: [], owed: null,
        frame: { cls: 'sugg setupcard', attrs: ' role="tabpanel" data-setupcard="' + esc(c.k) + '"' },
        label: { text: window.SETUP.labelOf(c, cx) },
        head: line ? { html: window.SETUP.headHtml(c, cx, sibs || [c],
          '<div class="headrule" data-fact="place">' + window.CARDS.linkify(esc(line)).replace(/\n/g, '<br>') + '</div>') } : null,
        body: note ? { html: '<p class="why">' + esc(note) + '</p>' } : null,
      };
    }
    function settingKind(c) {
      if (!c || atTheDoor() || isStranger() || S.viewer === 'applicant') return null;
      if (c.ansFor) return MANAGED_KEYS.includes(c.ansFor) ? 'answer' : null;
      if (c.k === 'myemail') return !env.cs ? 'birth-email' : null;
      // a power tab (stage 3b)
      // (a motion running on it is its own `mo:` tab since Q1367)
      if (c.power) return 'power';
      // 🎩 (stage 3b): the Founder's until 🍾, read after it and from any
      // other seat (Q1503)
      if (c.k === 'hat') {
        if (stateOf(c, ctx) === 'news') return 'watching';
        return amFounder() && !constituted() && docOpen() && founderCanCommit() ? 'setting' : 'watching';
      }
      if (!MANAGED_KEYS.includes(c.k)) return null;
      if (c.record || c.isGate || c.door || c.kind === 'personal' || c.admit || c.release ||
        c.held || c.departure || c.mailgiveup || c.isBegin || c.isClosing) return null;
      // a motion in flight on the setting is stage 4's card
      if (motionOn(c)) return null;
      const news = stateOf(c, ctx) === 'news';
      // a member's settled card is the composer (K1) — unless its news is owed,
      // which the composer defers to (as `cardFor` does), and never under a
      // draft being typed there
      // …and until the member has accepted the powers it sends with, reads the
      // rule (Part 4 .19, principle 4)
      if (composerOn(c) && (!news || composing(c))) return composerWaits(c).length ? 'watching' : 'composer';
      if (news) return 'watching';
      if (founderBody(c) && founderCanCommit()) return 'setting';
      return 'watching';
    }
    const W3 = () => window.COPY.shell;
    /** is a delegated question still collecting — nothing stands yet */
    const collecting = (c) => isRoom(c) && !!(csState(c.k) || {}).collecting;
    /** the first line's words: the rule as the Rules paragraph states it,
     *  without its powers line (1541.10) — on an answer card, its setting's */
    const lineOf = (c) => {
      // a power card: this power's own clause, naming its subject (1541.48)
      if (c.power) return esc(powerParts(c).line);
      // 🎩: the sentence that stands, or that the Founder is deciding it
      if (c.k === 'hat') { const h0 = hatCurrent(); return esc(h0 ? W3().hat[h0] : W3().hat.deciding); }
      const h = hostCard(c);
      if (h.k === 'title' && !env.cs && !titleStands()) return null;   // the title box is the first line
      if (h.k === 'myemail') return esc(decisionLine(h, false) || '');
      const rule = settled(h) && !collecting(h) && ctx.headFor ? ctx.headFor(h, true) : null;
      return rule != null ? rule : window.CARDS.linkify(esc(decisionLine(h, false) || '')).replace(/\n/g, '<br>');
    };
    /** who chose what stands, for the pill — only where something stands */
    const pillOf = (c) => {
      if (c.ansFor || c.k === 'myemail') return null;
      // a power is always in one state or the other, and only the Founder puts
      // it there; 🎩 once answered
      if (c.power) return window.CARD_STATE.provenanceOf(c.k);
      if (c.k === 'hat') return hatCurrent() ? window.CARD_STATE.provenanceOf(c.k) : null;
      if (c.k === 'title' ? !titleStands() : !settled(c)) return null;
      if (collecting(c)) return null;
      return window.CARD_STATE.provenanceOf(c.k);
    };
    /** the reason a dark commit waits: a card you type into waits on typing */
    const waitsOn = (c) => ((c.k === 'title' || c.k === 'slug' || c.k === 'myemail') ? 'type' : 'choose');
    /** is there something of this reader's on the card, not yet sent — what
     *  lights the bin and releases the pill: the open card's own fields
     *  against what it stood as, or a composer's motion being typed */
    const shellDirty = (c) => (settingKind(c) === 'composer' ? composing(c) : S.open === c.k && openCardDirty());
    /** what the reader may send here — the bin, and the commits */
    function settingActs(c) {
      const kind = settingKind(c);
      if (!kind || kind === 'watching') return [];
      const dirty = shellDirty(c);
      // the composer's 🗑️ discards the motion being typed and closes (Q1560
      // (3)'s bin); every other card's puts the card back as it stood
      if (kind === 'composer') {
        const acts = [{ kind: 'bin', title: PAGE_COPY.discardMotion,
          attrs: dirty ? ' data-dropmotion="1"' : ' data-act="bin"', until: dirty ? null : 'nothing-yours' }];
        // the route's commit, drawn by the page since it swaps in place as a
        // value is typed (329a)
        acts.push({ kind: 'commit', html: commitFor(c) });
        return acts;
      }
      // a power card read by anybody but the Founder whose hand it is — and a
      // state the Founder may not choose — asks nothing: no row
      if (kind === 'power' && !powerParts(c).editable) return [];
      const acts = [{ kind: 'bin', title: PAGE_COPY.binPutBack,
        attrs: dirty ? ' data-revert="1"' : ' data-act="bin"', until: dirty ? null : 'nothing-yours' }];
      if (kind === 'birth-email' && S.emailSent && !S.emailVerified) {
        acts.push({ kind: 'commit', glyph: '📨', glyphHtml: glyphHtml('📨'), cls: 'btn-approve emojibtn',
          attrs: ' data-resend="1"', title: resendTitle(), until: EMAIL_OK.test(S.myemail) ? null : 'type' });
        return acts;
      }
      // ✒️ on a power card sets the power's state — the Founder's own act, not
      // pen-gated (Y7) — and on 🎩 the Founder's membership (Q1503)
      if (kind === 'power') {
        acts.push({ kind: 'commit', glyph: '✒️', glyphHtml: glyphHtml('✒️'), cls: 'btn-approve emojibtn',
          attrs: ' data-confirm="1"', title: PAGE_COPY.setIt, until: powerParts(c).chosen ? null : 'choose' });
        return acts;
      }
      if (c.k === 'hat') {
        const ready = !!S.hatPick && S.hatPick !== hatCurrent() && mayPen() && docOpen();
        acts.push({ kind: 'commit', glyph: '✒️', glyphHtml: glyphHtml('✒️'), cls: 'btn-approve emojibtn',
          attrs: ' data-confirm="1"', title: PAGE_COPY.setIt, until: ready ? null : 'choose' });
        return acts;
      }
      const glyph = !env.cs ? '🪶' : kind === 'answer' ? '🏛️' : '✒️';
      const ready = commitReady(c) && (glyph !== '✒️' || mayPenOn(c.k) || (mayPen() && docOpen() && takingBack(c.k)));
      acts.push({ kind: 'commit', glyph, glyphHtml: glyphHtml(glyph), cls: 'btn-approve emojibtn',
        attrs: ' data-confirm="1"', title: commitTitle(c), until: ready ? null : waitsOn(c) });
      // the route's own commit beside the pen, where the Founder may also put
      // the change to the membership (entry 161) — drawn by the page, since it
      // swaps in place as a value is typed (329a)
      if (kind === 'setting') { const fc = founderCommit(c); if (fc) acts.push({ kind: 'commit', html: fc }); }
      return acts;
    }
    /** what this reader owes the card: the OK on its news, while owed */
    function settingOwed(c) {
      if (settingKind(c) !== 'watching' || stateOf(c, ctx) !== 'news') return null;
      return { kind: 'ok', attrs: ' data-ok="' + esc(isRoom(c) ? 'res-' + c.k : 'set-' + c.k) + '"', word: 'OK' };
    }
    /** the news of a change, told as the rule it replaced (Part 4 .11) and
     *  the reason it changed, under the rule that now stands — the Q1556 (7)
     *  deferral; the *Last amended* history retires with it, the records
     *  behind the rule's tab being where a change's history is kept */
    function newsParts(c) {
      const am = amFounder() ? null : lastAmendment(c.k);
      if (!am) return { blocks: [], body: '' };
      const from = am.from || changedFrom(c.k);
      const was = from != null ? (sentenceFor(c.k, from) || wordsFor(c.k, from)) : null;
      const back = c.k === 'lapse' ? ((csState(c.k) || {}).returned || []) : [];
      const returned = back.length ? '<p class="cpv">' + PAGE_COPY.lapseReturned(
        listOf(back.map((mid2) => esc(nameOfMember(mid2)))), back.length) + '</p>' : '';
      return {
        // the Founder's reason drawn as a signed rationale's, the face on the disc
        // and no name line (Q1560's note, taken at stage 4)
        body: (am.route === 'pen' ? founderFace(am.why) : window.CARDS.speakerHtml(am.why)) + returned,
        blocks: was ? [{ label: W3().previousRule, fact: 'previous', html: '<p class="cpv">' + esc(was) + '</p>' }] : [],
      };
    }
    /** **the card's slots**, handed to card-state.js's `present` */
    function settingPresent(c, hints) {
      const kind = settingKind(c);
      if (!kind) return {};
      const k = c.k;
      const closed = !!(env.cs && env.cs.closed);
      // the label (1541.46 (a)): what the first line is — *Current rule*, and
      // *Rule at the close* on a closed document (Part 4 .16); on 📧 at the
      // birth, and 🪶 before a title stands, the card's ask (a question card)
      // …and on a power card its ask, today's title (1541.48, Part 4), and on
      // 🎩 while the Founder has not answered (1541.46 (a))
      const askCard = kind === 'birth-email' || kind === 'power' || (k === 'title' && !env.cs && !titleStands()) ||
        (k === 'hat' && !hatCurrent());
      const label = askCard ? window.SETUP.labelOf(c, ctx) : closed ? W3().ruleAtClose : W3().currentRule;
      const stand = pillOf(c);
      const pp = kind === 'power' ? powerParts(c) : null;
      // the pill is the chosen radio of the card's own group for a reader who
      // can choose (1541.47) — the Founder's own card, a power the Founder may
      // lay down, a member's composer — and a fact for everybody else (P26)
      const chooses = kind === 'setting' || kind === 'composer' || (kind === 'power' && pp.editable);
      const pill = !stand ? ''
        : chooses ? window.CARD_SHELL.pickPillHtml(stand, !shellDirty(c))
        : window.CARD_SHELL.pillHtml(stand);
      let line = lineOf(c);
      let input = '';
      let options = '';
      let body = '';
      let blocks = [];
      if (kind === 'birth-email') {
        const field = BODY.myemail();
        if (line) input = field; else line = field;
      } else if (kind === 'answer') {
        body = amFounder() && viewerIsMember() ? '<p class="unlocks">' + esc(PAGE_COPY.asMember) + '</p>' : '';
        options = ANSWER[c.ansFor](S.myAns, E(), c.ansFor === 'quorum' ? S.quorumForm : undefined, roomNow(),
          ANSTYPED, clauseCtx());
      } else if (kind === 'setting' && k === 'hat') {
        // 🎩's other sentence, what stands omitted by value (Q620) and nothing
        // pressed on open (F6); no reason box — a founder's first set carries
        // none (CP3), and 🎩 is set only before the start
        const cur = hatCurrent();
        const o = { hatPick: S.hatPick };
        options = '<div class="choice" role="radiogroup">' + ['member', 'clerk'].filter((v) => v !== cur)
          .map((v) => opt(o, 'hatPick', v, W3().hat[v], '', '', false)).join('') + '</div>';
      } else if (kind === 'power') {
        // the other state, where the Founder may choose it; why not, where
        // they may not (`powerParts`)
        options = powerOtherHtml(pp);
        body = pp.notes.map((n) => '<p class="setnote">' + n + '</p>').join('');
      } else if (kind === 'composer') {
        // **the settled card is the composer** (K1): the setting's own controls
        // below the rule, what stands omitted by value (Q620), and the reason
        // box always shown (1541.21 (b)) — the member's drawn as the
        // Founder's, *We should change this because…* its words (Q1560 (9))
        const d = (S.draft && S.draft.k === k) ? S.draft : { k, to: '', why: '' };
        options = PROPOSE[k] ? PROPOSE[k](d)
          : '<div class="lanebox"><div class="lp editlane" contenteditable="plaintext-only" spellcheck="false"' +
            ' data-motionlane="to" data-ph="' + esc(PAGE_COPY.composeNote.valueLane) + '">' + esc(d.to) + '</div></div>';
        input = whyLane(d);
      } else if (kind === 'setting') {
        const b = BODY[k]();
        // 🪶 before a title stands: the title box is the first line (P1's
        // fourth exception); 📍 before the save: its field is an input, not a
        // choice among options
        if (line == null) line = b;
        else if (k === 'slug' && !env.cs) input = b;
        else options = b + delegateRung(c);
        // the reason box, on a card that can take a change (1541.21 (b)) —
        // the lane's own placeholder is its words, so no label stands over it
        const why = changeHalf(c);
        if (why) input += why;
        body = founderPairNote(c) + (c.knote ? '<p class="setnote">' + c.knote + '</p>' : '');
      } else if (kind === 'watching' && stateOf(c, ctx) === 'news') {
        const n = newsParts(c);
        body = n.body; blocks = n.blocks;
      } else if (kind === 'watching' && composerOn(c) && composerWaits(c).length) {
        // the composer waits on a power not yet accepted: the rule, and the
        // one sentence saying which (the grants are in the rail)
        body = '<p class="setnote">' + esc(W3().composeOnceAccepted(composerWaits(c))) + '</p>';
      }
      body += doorErrHtml(k);
      return {
        kind,
        // `data-draft` says the card holds something of yours not yet sent —
        // what lights the bin, and what card-audit's P24 reads
        frame: { cls: 'sugg setupcard', attrs: ' role="tabpanel" data-setupcard="' + esc(k) + '"' +
          (shellDirty(c) ? ' data-draft="1"' : '') },
        label: { text: label },
        head: { html: window.SETUP.headHtml(c, ctx, (hints && hints.siblings) || [c],
          '<div class="headrule asblock" data-fact="place">' + (line || '') + pill + '</div>') },
        body: body ? { html: body } : null,
        blocks,
        options: options ? { html: options } : null,
        input: input ? { html: input } : null,
      };
    }

    // ---- the band: two piles, and the card one of them opens into ----------
    // **One title, one place, at every step** (backlog 33). The big heading at
    // the top of the page is the *pre-save* heading: before the document exists
    // it is the only place the name appears, and the title card opens over it.
    // From the save the name stands at the head of the prose column instead
    // (`textAnchor`) — where the outline points, where the charter begins, and
    // where the founder is about to write — so this row goes rather than saying
    // it again a screen higher. It is keyed on **the name the band has just
    // drawn** — not on `cs`, and not on the hairline beside it — and that is the
    // whole of the guard: one is what the rule asks for, and zero would be worse
    // than two. The hairline is the wrong key because `textAnchor` draws it even
    // when it does not draw the name: opening 📄 (or either of its power tabs)
    // replaces the title's own paragraph with the card, which is the clause-opens
    // grammar working correctly — but with the hairline as the key that left the
    // document with no name anywhere on the page, on the last task of every
    // founding. An applicant is served no band until they have given their
    // address, so on that seat this heading is still the document's only name and
    // stays. The row, not the heading: an emptied `.cpara` would keep its own
    // margin and leave a gap where the title used to be. It wraps the band rather
    // than standing inside it because three of the seats below return early, and
    // a display left over from the last seat rendered is the one way this rule
    // can end up showing zero.
    function renderBand() {
      drawBand();
      // **🪶 and 📍's tabs arrive at the pen's OK** (Q1560 (5)): withheld from
      // the save until then (`penTabsWithheld`), they return as a birth, not a
      // pop. `birthPass` remembers every key it has seen and these tabs were
      // seen at the birth, so the returning pile carries a key of its own that
      // exists only once this page has seen the OK pressed over withheld tabs
      // (`penTabsArrive`) — new the render the OK lands, known on every
      // render after, and never set on a page loaded after the pen was
      // accepted, whose first renders may run before its OKs are hydrated
      if (penTabsArrive() && amFounder()) {
        ['title', 'slug'].forEach((k) => {
          const tab = band.querySelector('[data-tab="' + k + '"]');
          const col = tab && tab.closest('.chipcol');
          if (col) col.setAttribute('data-born', 'pen-tabs:' + k);
        });
      }
      // the open shell card's row and pill against its fields, now that they
      // are in the page (`syncShellRow`)
      if (S.open) syncShellRow(card(S.open));
      // **…and after the birth the title stands in both places** (Ed,
      // 2026-09-16: *I want the title both at the top of the document above
      // the constitution and also at the top of the text*): from 🍾 the row
      // shows whatever the band draws, and only the founder's pre-🍾 column
      // head takes its place.
      document.getElementById('titlepara').closest('.titlerow').style.display =
        band.querySelector('.doctitle.dochead') && !constituted() ? 'none' : '';
    }
    function drawBand() {
      if (isStranger()) {
        const tp0 = document.getElementById('titlepara');
        tp0.classList.remove('open');
        tp0.querySelectorAll('.setupcard').forEach((el) => el.remove());
        const own = STRCARDS().some((c) => c.k === S.open);
        // patched as the member's band is (stage 10): the door's own card
        // holds a typed address, and a poll under it keeps the box
        window.PATCH.set(band, (own
          ? '<div class="setrow constsec"><div class="csec"><div class="cpara open">' + strangerCardHtml() + '</div></div></div>' : '') +
          (env.cs ? bandHtml(groups(), env.strCtx, strangerReadCard) : ''));
        fitBand(band);
        return;
      }
      if (S.viewer === 'applicant') {
        const tp0 = document.getElementById('titlepara');
        tp0.classList.remove('open');
        tp0.querySelectorAll('.setupcard').forEach((el) => el.remove());
        // their own five open as their cards; every other tab is the rule as it
        // stands, read-only, exactly as the door opens it (Q1183) — an
        // applicant is a stranger who has knocked (Q1281). This used to wrap an
        // empty open paragraph around any settings tab an applicant pressed.
        const own = APPCARDS().some((c) => c.k === S.open);
        // patched (stage 10): the applicant's five hold their name, their
        // words and their picture as they type them
        window.PATCH.set(band, (own
          ? '<div class="setrow constsec"><div class="csec"><div class="cpara open">' + applicantCardHtml() + '</div></div></div>' : '') +
          (settled(card('myemail')) ? bandHtml(groups(), env.strCtx, strangerReadCard) : ''));
        fitBand(band);
        return;
      }
      const cardFor = (g) => {
        const c = card(S.open);
        // **every card on the one shell** (Q1541 stage 10): the card state
        // the band source hands over, the strip the pile this card opened
        // from; a card the source draws no frame for — its subject left the
        // page while it stood open — is `readState`'s, never an old body
        const st = window.CARD_STATE.stateOf(c.k, { siblings: g.cards });
        return glyphify(window.CARD_SHELL.cardHtml(st.frame ? st : readState(c, g.cards, ctx, PAGE_COPY.noLongerOutstanding)));
      };
      // the title card opens in the title's own paragraph, whatever else
      // the band is doing — the clause, opened, with its tab in its strip
      const tp = document.getElementById('titlepara');
      // only at the birth: post-save the title opens at its own clause in
      // the constitution (titleGovPara), never over the heading
      tp.classList.toggle('open', !env.cs && S.open === 'title' && !settled(card('title')));
      tp.querySelectorAll('.setupcard').forEach((el) => el.remove());
      if (!env.cs && S.open === 'title' && !settled(card('title'))) tp.insertAdjacentHTML('beforeend', cardFor(groups()[0]));
      // **The constitution starts writing itself at the birth** (Ed,
      // 2026-08-21, amending *before the save there is no constitution*): each
      // answer lands as its own clause and fades onto the page, so the founder
      // sees the document forming, is shown that their answer was received,
      // and learns the fading-clause mechanic before there is a document to
      // use it on. Until the first answer there is still nothing to state, and
      // the open card alone stands in the band's own geometry.
      if (!settled(card('myemail'))) {
        window.PATCH.set(band, settled(card('title'))
          ? bandHtml(groups(), ctx, cardFor)
          : (S.open && S.open !== 'title')
          ? '<div class="setrow constsec"><div class="csec"><div class="cpara open">' + cardFor(groups()[0]) + '</div></div></div>'
          : '');
      } else {
        // **patched, not replaced** (U1, redesign stage 9): a render under the
        // reader's caret, open select or scrolled grid leaves them standing
        window.PATCH.set(band, bandHtml(groups(), ctx, cardFor));
      }
      fitBand(band);
      fitBand(tp.closest('.titlerow'));
      fitTitleCard();
    }

    // **Opening the title must not move the title** (Ed, 2026-08-18: *the
    // title jumps*), **and the tab must still meet the card** (Ed, same day:
    // *the clause-tab doesn't meet the card*). The first build satisfied the
    // first rule by shifting the whole card onto the heading's text and
    // dragging the strip back onto the closed tab — which pulled the strip
    // off the card's edge, because the strip hangs on the card's box. So the
    // two corrections go to different owners: the **vertical** one moves the
    // card (a card moving up does not break the strip's contact with its own
    // edge), and the **horizontal** one moves the head **text** only — the
    // card box, and the strip flush on it, never move sideways. With the
    // closed tab standing on the card's edge too (see #titlechip .chipcol in
    // setup.css), the tab needs pinning only in Y. All measured, from text
    // rects rather than boxes, because the title wraps and paddings differ.
    const textRect = (el) => { const r = document.createRange();
      r.selectNodeContents(el); const rs = r.getClientRects(); return rs.length ? rs[0] : null; };
    function fitTitleCard() {
      if (S.open !== 'title' || env.cs) return; // post-save fitBand owns the card
      const cardEl = document.querySelector('#titlepara > .setupcard');
      // **on the one shell the label stands where the heading's first line
      // stood** (Q1541 stage 3a, `space-above`'s `fit`): the title box, the
      // card's first line, stands the label's room below it — at the page's
      // top, where no scroll can take the room, the first line moves down by
      // it (answers Part 6.4) — and the strip hangs off that first line
      const shellSlot = cardEl && cardEl.classList.contains('gshell') && cardEl.querySelector(':scope > .glabslot');
      const hd = cardEl && (shellSlot || cardEl.querySelector('.headdoct'));
      const d = document.getElementById('doctitle');
      if (!cardEl || !hd || !d) return;
      cardEl.style.marginTop = ''; hd.style.marginLeft = '';
      d.style.display = '';
      const want = textRect(d);
      d.style.display = 'none';
      const have = shellSlot ? shellSlot.getBoundingClientRect() : textRect(hd);
      if (want && have) {
        const dy = want.top - have.top, dx = want.left - have.left;
        if (Math.abs(dy) > 0.5) cardEl.style.marginTop =
          ((parseFloat(getComputedStyle(cardEl).marginTop) || 0) + dy).toFixed(1) + 'px';
        if (Math.abs(dx) > 0.5 && !shellSlot) hd.style.marginLeft = dx.toFixed(1) + 'px';
      }
      // how far the first line stands below where the heading's did — the
      // label's room, on the shell; nothing on the old card
      const lineShift = shellSlot && want
        ? (window.CARD_SHELL.lineTop(cardEl.querySelector('.clausehead .rtext')) || want.top) - want.top : 0;
      // pin the tab vertically onto the re-materialised closed tab — one
      // unpainted beat, never shown. No horizontal pin: the strip's x is the
      // card's edge, which is where the closed tab now stands by rule.
      const col = cardEl.querySelector('.chipcol');
      const chipHost = document.getElementById('titlechip');
      if (col && chipHost) {
        col.style.transform = '';
        d.style.display = '';
        chipHost.innerHTML = pileHtml([card('title')], ctx);
        const refG = chipHost.querySelector('.achip span');
        const wantG = refG && refG.getBoundingClientRect();
        chipHost.innerHTML = '';
        d.style.display = 'none';
        const haveG = col.querySelector('.achip span');
        if (wantG && haveG) {
          const dy2 = wantG.top + lineShift - haveG.getBoundingClientRect().top;
          if (Math.abs(dy2) > 0.5) col.style.transform = 'translateY(' + dy2.toFixed(1) + 'px)';
        }
      }
    }

    // what the commit says it will do — one expression, because the button is
    // written by the render and corrected live by refreshCommit, and a title
    // that only the render knows how to write goes stale the moment a number
    // wakes the button
    // 📨 says which act it is: a resend to the address that was written to, or
    // a first send to one that has been edited since. Typing does not re-render
    // the card (it would take the caret), so the label is corrected in place.
    // which act it is lives in the tooltip now: a send to an address that has
    // been edited since is not a resend
    const resendTitle = () => (S.myemail === S.sentAddr ? 'Send the link again' : 'Send the link to this address');
    const commitTitle = (c) => (c.k === 'title'
      // 🪶's own wording: the title card is the one that is typed into, so it
      // says what is missing rather than that nothing has been answered
      ? (commitReady(c) ? (env.cs ? 'Set it — yours to change any time' : 'Name it') : 'Give it a name first')
      // 📍 says which of its three reasons it is dark for: *not answered yet*
      // is a lie about an address that is answered and refused
      : c.k === 'slug' && !ready(c)
        ? (!SLUG_OK.test(S.slug) ? PAGE_COPY.slugNote.illegal
          : slugRefused() ? 'That address is taken'
          : 'Checking the address…')
      // 📄's commit names what it commits. Blank is a real answer (§9.0b), so
      // `ready('text')` is unconditionally true and the commit is live from the
      // instant the card appears — which means a founder who has not realised
      // they may type can start an empty document without ever being told that
      // is what they are doing. Since Q798 the press is an OK rather than a set,
      // so the tooltip states the fact being acknowledged rather than an act —
      // and the empty branch keeps the warning, which is the whole reason the
      // two branches exist.
      : c.k === 'text' ? (proseCounts().blocks
        ? 'The document begins from what is in the column'
        : 'The document begins empty')
      // CP8 (Q1107): the label states the act even while the commit is dark —
      // *Answer*, *Save*, *Set it* greyed — and the state (*Not answered yet*)
      // lives in the title, which commitTitle already carries.
      : (c.ansFor ? 'Answer' : c.kind === 'personal' ? 'Save' : 'Set it'));
    // **The whole commit row follows the typing** (Ed, 2026-08-21: *the 🗑️
    // button on "Your Email" doesn't work — check the other cards also*).
    // Typing deliberately does not re-render, because a render would take the
    // caret, so everything on the row whose state depends on what has been
    // typed must be corrected in place. Only the commit and the title card's
    // own bin ever were — which left every 🗑️ on a card you *type* into (the
    // address, the numbers, the dates, a motion's draft) wearing whatever the
    // render drew before the first keystroke, and that is always disabled. A
    // bin woke only where the change was a radio, because a radio re-renders.
    // Each line below states exactly the predicate its own render states.
    function refreshCommit() {
      const c = S.open ? card(S.open) : null;
      const b = document.querySelector('[data-confirm]');
      if (b && c) { b.disabled = !commitReady(c); b.title = commitTitle(c); }
      // …and the Founder's second commit beside it (entry 161), **swapped in
      // place** for the reason the composer's own commit is (329a): a keystroke
      // into ⏰'s date field or ⏱️'s numbers moves the route as well as the
      // value, and a full render would rebuild the field under the caret. The
      // pen above is a `disabled` flip because its words never change; this one
      // is a swap because its glyph, its words and its hold all can.
      if (c && founderPairOn(c)) {
        // the commit may stand beside a countdown since Q1486 (E), and that
        // is not part of the node being swapped — left in place it would
        // stack a second one on every keystroke
        document.querySelectorAll('.setupcard .pdrip, .setupcard .pvoice').forEach((n) => n.remove());
        const slot = document.querySelector(
          '.setupcard [data-putmotion], .setupcard [data-holdmotion]');
        if (slot) slot.outerHTML = founderCommit(c);
      }
      // …and nothing else on the row has a live state to correct: since the
      // bin is always pressable there is no dirty predicate left to keep in
      // step, which is four fewer copies of "what this card stands as".
      // **…except on the one shell** (Q1541 stage 3a): there the bin is dark
      // until there is something of yours on the card (1541.9), and the
      // standing pill is pressed exactly while nothing else is chosen
      // (1541.47) — so a keystroke that makes the card differ from what
      // stands lights the one and releases the other, in place, and the
      // commit's `data-until` follows its state
      syncShellRow(c);
    }
    /** the shell's row and pill, corrected in place against what is on the
     *  open card. Asked on every keystroke (`refreshCommit`) **and after
     *  every band render**: the dirty test reads the card's own fields
     *  (`cardKeys()`), which are not in the page while the shell builds the
     *  markup — so a card reopened holding a value you typed and closed on
     *  (closing is not discarding, C3) was drawn with its bin dark and its
     *  pill pressed, and the 🗑️ could not put it back (journey L9, *build
     *  hand*; Q1541 stage 3a) */
    function syncShellRow(c) {
      const sh = c && settingKind(c) && document.querySelector('.setupcard.gshell[data-setupcard="' + c.k + '"]');
      if (sh) {
        const dirty = shellDirty(c);
        sh.toggleAttribute('data-draft', dirty);
        // the composer's bin discards the motion; every other card's puts back
        const act = settingKind(c) === 'composer' ? 'data-dropmotion' : 'data-revert';
        const bin = sh.querySelector('[data-slot="row"] [' + act + '], [data-slot="row"] [data-act="bin"]');
        if (bin) {
          bin.disabled = !dirty;
          if (dirty) { bin.removeAttribute('data-act'); bin.removeAttribute('data-until'); bin.setAttribute(act, '1'); }
          else { bin.removeAttribute(act); bin.setAttribute('data-act', 'bin'); bin.setAttribute('data-until', 'nothing-yours'); }
        }
        const pill = sh.querySelector('[data-standpick]');
        if (pill) pill.setAttribute('aria-pressed', String(!dirty));
        const own = settingActs(c).find((a) => a.kind === 'commit' && a.html == null);
        const cb = sh.querySelector('[data-slot="row"] [data-confirm], [data-slot="row"] [data-resend]');
        if (own && cb) {
          cb.disabled = !!own.until;
          if (own.until) cb.setAttribute('data-until', own.until); else cb.removeAttribute('data-until');
          if (own.title) cb.title = own.title;
        }
      }
    }

    const renderMail = () => (isStranger() ? renderMailModal(false, MAILS.verify(S.title, '', S.slug))
      : S.viewer === 'applicant'
      ? renderMailModal(S.app.mailOpen, MAILS.applyVerify(S.title || 'this document', S.app.email))
      : renderMailModal(S.mailOpen, MAILS.verify(S.title, S.myemail, S.slug)));

    // **A render under the caret puts it back** (Q1327). The band is rebuilt
    // wholesale, so a 4s poll landing while ✋'s field holds the caret, or while
    // 🖼️'s grid is scrolled, replaced the very control in use: the text
    // survived on the draft but the caret was gone and the grid was back at the
    // top. Render state re-applied after the rebuild — the same shape as
    // `settleLift` and the wallet's spend-preview — and only while the open
    // card is the one it was: a card that has just opened takes `focusOpened`.
    // **Every field on the card, not two of them** (Q1486 (B), the nh2026
    // convention 2026-09-20). This knew `data-txt` and `data-num`, which are
    // the founder's own value fields, and knew nothing of the five a *motion*
    // is composed with — so a 4s poll landing while a member typed into ⏱️'s
    // or 👥's composer replaced the field under the caret, and WebKit and
    // Gecko fire no `change` on removal, so what was typed was simply gone.
    // In a room of twelve that is about four seconds to compose in. The
    // attribute is found rather than listed twice: whichever of the seven the
    // focused field carries is the one the restore looks it up by.
    // **…and a member's answer fields** (the P1 sweep, 2026-09-23): `ans-*`
    // cards are composed in `data-ansnum` and `data-ansdate`, and a poll
    // landing while a member typed an answer took the caret the same way.
    // 👥's two boxes share one key, so the field is found again by its place
    // among the fields carrying that key, not by the key alone. A date box
    // holds no value until it is whole, so a half-typed one comes back empty
    // with the caret in it — Q1513.
    // …and ✉️'s address boxes, the Founder's and a member's, which are
    // textareas (Q1541 stage 5: a render landing while an address was typed
    // took the caret, and the next keys went nowhere)
    const KEEP_ATTRS = ['data-txt', 'data-num', 'data-mtext', 'data-mslug',
      'data-mpace', 'data-mrate', 'data-mnum', 'data-ansnum', 'data-ansdate', 'data-emails', 'data-mjoin'];
    const keptSel = (attr, key) => '.setupcard :is(input, textarea)[' + attr + '="' + key + '"]';
    const renderKeep = () => {
      const a = document.activeElement;
      const inp = a && a.closest && a.closest('.setupcard') &&
        a.matches(KEEP_ATTRS.map((x) => 'input[' + x + '], textarea[' + x + ']').join(', ')) ? a : null;
      const attr = inp ? KEEP_ATTRS.find((x) => inp.hasAttribute(x)) : null;
      const nth = attr ? [...document.querySelectorAll(keptSel(attr, inp.getAttribute(attr)))].indexOf(inp) : 0;
      const box = document.querySelector('.setupcard .emojibox');
      let sel = null;
      try { if (inp) sel = [inp.selectionStart, inp.selectionEnd]; } catch (e) { /* type=email has none */ }
      // …and the Founder's reason lane (found building issue #34): a
      // plaintext-only editable rather than an input, so it is held by
      // character offset — a poll landing mid-sentence took the caret and the
      // rest of the reason went nowhere, and ✒️ sent the half that was left
      let why = null;
      const lane = a && a.closest && a.closest('.setupcard [data-setwhy]');
      if (lane) {
        const s = getSelection();
        if (s && s.rangeCount && lane.contains(s.getRangeAt(0).endContainer)) {
          const r = document.createRange();
          r.selectNodeContents(lane); r.setEnd(s.getRangeAt(0).endContainer, s.getRangeAt(0).endOffset);
          why = r.toString().length;
        } else why = lane.textContent.length;
      }
      return { open: S.open, key: attr ? inp.getAttribute(attr) : null, attr, nth,
        sel, why, scroll: box ? box.scrollTop : 0 };
    };
    const renderRestore = (k) => {
      if (!k || !k.open || k.open !== S.open) return;
      if (k.attr) {
        const all = document.querySelectorAll(keptSel(k.attr, k.key));
        const el = all[k.nth] || all[0];
        if (el && document.activeElement !== el) {
          el.focus({ preventScroll: true });
          if (k.sel && typeof k.sel[0] === 'number') {
            try { el.setSelectionRange(k.sel[0], k.sel[1]); } catch (e) { /* not a text control */ }
          } else if (el.type === 'number' && el.value !== '') {
            // a number box has no selection to restore, and focus puts the
            // caret at its start — so the next digit went in front of the
            // ones typed; setting the value again leaves it at the end
            const v = el.value; el.value = ''; el.value = v;
          }
        }
      }
      if (k.why !== null && k.why !== undefined) {
        const lane = document.querySelector('.setupcard [data-setwhy]');
        if (lane && document.activeElement !== lane) {
          lane.focus({ preventScroll: true });
          const w = document.createTreeWalker(lane, NodeFilter.SHOW_TEXT);
          let n = k.why, node = w.nextNode();
          const r = document.createRange();
          while (node && n > node.length) { n -= node.length; node = w.nextNode(); }
          if (node) r.setStart(node, n); else { r.selectNodeContents(lane); r.collapse(false); }
          r.collapse(true);
          const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        }
      }
      const box = document.querySelector('.setupcard .emojibox');
      if (box && k.scroll) box.scrollTop = k.scroll;
    };
    const render = () => {
      const kept = renderKeep();
      // the roster rows ARE the people now (per-user state, Ed 362): the
      // identity cards write their commits onto the viewer's row — and the
      // rows follow the module's register first
      syncFromCs();
      resolveCounts();
      syncGrantAcks();
      syncOwedOks();
      syncOwedReleases();
      syncOwedMailGiveUps();
      syncOwedDepartures();
      syncOwedHeld();
      // the address is checked because it is the address (see `checkSlug`): a
      // pre-filled 📍 nobody edited would otherwise reach the send unasked.
      // Idempotent — a repeat ask about an address already answered is a
      // string comparison.
      if (SLUG_OK.test(S.slug || '')) checkSlug(S.slug);
      // one snapshot per opening — after the module has had its say, so the
      // bin puts the card back to what stands rather than to what was on screen
      // **What you have typed survives a close** (Ed, 2026-08-21: *my inputs
      // are lost … they should remain unless I press 🗑️*). The title lane used
      // to be dropped whenever the open card changed, which made it the one
      // control on the surface where closing a card threw work away — every
      // other provisional value (a radio, a number, a motion's draft) already
      // lives in S until the bin takes it. The snapshot the bin restores to is
      // still taken once per opening.
      if (S.open && !snaps[S.open]) takeSnap(S.open);
      renderDev();
      // **the document's own close, before anything reads it** (CP9; Q1479 (a),
      // issue #30 finding 2). Not the same fact as the wallets going, which
      // waits on the farewell below — this one is true the moment the clock
      // runs out, and `syncCharter` on the next line hands the column to
      // `bindData`, whose `withheld` asks it. Set after that render it was
      // false at the boot's own `render()`, and a closed document has no
      // movement for the poll to re-render on, so a quiet closed page never
      // rendered again and the record never arrived.
      const closedNow = !!(env.cs && env.cs.closed);
      SESSION.setDocClosed(closedNow);
      SESSION.setSigned(closedNow && signedClose());
      renderTitle(); renderRail(); renderBand(); syncCharter(); renderMail(); renderPowerWallets();
      window.PATCH.set(document.getElementById('mebtn'), avHtml(
        S.viewer === 'applicant' ? { n: S.app.name || '?', pic: S.app.pic }
        : isStranger() ? { n: '?', pic: '' } : me(), 'face'));
      if (S.open && S.open !== env.lastOpen) {
        const el = document.querySelector('.setupcard');
        if (el) { CC.expandCard(el, () => {}); focusOpened(el, S.open); }
      }
      renderRestore(kept);
      env.setLastOpen(S.open);
      // what is born arrives (setup.js birthPass): a stagehand act — seat
      // switch, ⏩ — mutes the entrances rather than replaying fifteen at once
      window.SETUP.birthPass(band, rail, birthsMuted, () => SESSION.drawWires());
      launchGrant();
      launchFarewell();
      // the closed page: every clause grey, typing opens nothing, the wallets
      // gone once the farewell has flown (or at once, for a reader arriving
      // after) — which is why these stay here, below `launchFarewell()`, while
      // the document's own close is read above
      document.getElementById('doc').classList.toggle('closedpage', closedNow);
      const gone = closedNow && (env.WAL.farewellDone || signedClose() || !viewerIsMember());
      SESSION.setClosed(gone || atTheDoor());
      // the pulse is the room's (SPEC §3.5), and neither seat at the door is in it
      const pulse = document.getElementById('pulse');
      if (pulse) pulse.style.display = gone || atTheDoor() ? 'none' : '';
      birthsMuted = false;
    };
    let birthsMuted = false;

    return {
      render, refreshCommit, roomNow, syncShare, standingBlock, unchangedCard,
      // stage 3a's settings cards, for the band's card-state source (Q1541)
      settingKind, settingActs, settingOwed, settingPresent, lineOf, readState,
      // stage 5: the doors' bodies, for their cards on the one shell
      BODY,
      // stage 4: a motion's card heads with its host's rule and pill (Q1541)
      pillOf,
      // stage 3b: the composer's commit swaps in place as a motion is typed,
      // and its bin and pill follow (Q1541 stage 3b)
      syncShellRow,
      foundedAt, foundedClause, closedAtWords, resendTitle, APPLICANT, MEMBER_EMAILS, APPCARDS,
      appCtx,
      // stage 5: the applicant's five as shell states, for card-state's door source
      applicantShell,
      // the rail asks this (SURFACE E33, Q901): a door that shut under a
      // verified applicant is news owed an OK, and the news has to be
      // reachable — `renderRail` empties the applicant's rail the moment 🤝
      // shuts, which is right for four of the five cards and wrong for 🪪
      applyShutNews: () => applyShutOnMe() && !S.app.shutAcked,
      // the band's own render state, set by three of the page's handlers
      get birthsMuted() { return birthsMuted; },
      set birthsMuted(v) { birthsMuted = v; },
    };
  }
  return { make };
})();
