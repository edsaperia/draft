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
      REMOVAL_RULE, ENDING_NEVER, WHAT, OPTHEADLESS, EMAIL_OK, SLUG_OK, penWaitTitle } = env;
    // the page's own functions, wrappers read when called
    const { APPL_RULE, E, LAPSE_RULE, STRCARDS, acked, admissionPrice, admitCardOf, amFounder,
      appPicPickNow, applicantById, applicantName, atTheDoor, beginBody, binBtn, card, cardHtml,
      changedFrom, checkSlug, chosenRadio, clauseCtx, closingBody, commitFor, commitReady,
      composerOn, consentBody, constituted, csState, cs_titleNow, decidingOf, decisionLine,
      departureLine, directInvite, directRemove, docAddr, docOpen, doorDirect, doorErrHtml, doorErrOn,
      dripParts, endsAtMsOf, fieldsOf, focusOpened, founderCommit, founderDirect,
      founderHandOff, founderInfo, founderMark, founderPairNote, founderPairOn, founderSpeaker,
      founderSpeakerLane, grantProv, groups, iDraft, isChange, isNum, isRoom, isStranger,
      heldBody, hostKeyOf, judgedOn, launchFarewell, launchGrant, liveMotionRec,
      mailGiveUpBatch, mailGiveUpBody,
      mayPen, mayPenOn, me, membersHold, midOf, motionAbstainAt, motionBlocks, motionOn, motionPicked,
      motionTargets, nameOfMember, namePickNow, oneVoiceAsk, ordinaryBody, owedDeparture,
      pairWords, penOkFor,
      perpetual, picPickNow, policyNow, powerBody,
      proseCounts, pwPair, readinessOf, ready,
      recordBody, releaseBatch, releaseBody, removalPrice, removeSubjectPicker, renderDev,
      renderPowerWallets, renderRail, renderTitle, resolveCounts, routeOfM, sentenceFor,
      serverNow, settled, signedClose, slugNoteHtml, slugRefused, standsTyped,
      strangerCardHtml, strangerReadCard, syncCharter, syncFromCs, syncGrantAcks,
      syncOwedDepartures, syncOwedHeld, syncOwedMailGiveUps, syncOwedOks, syncOwedReleases,
      takeSnap, takenOf, takenValOf,
      takingBack, textDivs, titlePending, titleStands, viewerId, viewerIsClerk, viewerIsMember,
      wantsDelegate, whyLane, wordsFor } = env;
    // the shared module, the same names the page destructures from it
    const { esc, TICK, ARROW_OUT, avHtml, bandHtml, fitBand, nameBody, pictureBody, opt, num, numIn,
      ctlWord, ANSWER, stateOf, nounOf, MAILS, renderMailModal, gateBody, pileHtml, readBody,
      routeFor, listOf,
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
      // Blindness is still said to the person it protects, on the member's own
      // answer card (`BLINDNOTE`).
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
      return ' at ' + p2(d0.getHours()) + ':' + p2(d0.getMinutes()) + ' on ' +
        d0.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
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
      return ' at ' + p2(d0.getHours()) + ':' + p2(d0.getMinutes()) + ' on ' +
        d0.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
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
      hat: () => {
        const started = !!(env.cs && env.cs.constitutedAtT !== null);
        // the radio is the session-view's own opt(), over the derived current
        // (the pw() pattern): the generic data-set handler lands S.hatPick
        // nothing is preselected until it has been answered once
        const o = { hatPick: S.hatPick || (S.seen.has('hat') ? (iDraft() ? 'member' : 'clerk') : null) };
        // 🎩 has no clause in the constitution, so its two sentences live here
        // alone, in the clause voice (Q1109; STYLE §3 — third person, about
        // the document)
        return '<div class="choice" role="radiogroup">' +
          // the consequences cut, the fact kept (Ed's card review, 2026-09-02);
          // *a clerk can stay unnamed* survives on ✋'s clerk branch alone
          opt(o, 'hatPick', 'member', 'The Founder is part of the membership.', '', '', started) +
          opt(o, 'hatPick', 'clerk', 'The Founder is not part of the membership.', '', '', started) +
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
        '<input data-slug="1" value="' + esc(S.slug) + '" spellcheck="false">' +
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
            : '<p class="why">Until the document begins, taking somebody off the list is yours alone — an invitation withdrawn is nobody else’s business yet.</p>') +
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
        t: a.refused ? T.refusedTitle : shut ? T.shutTitle : T.apply, own: 'you',
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
      if (env.cs && env.cs.isRemote) return env.cs.v && env.cs.v.applyOpen === false;
      return !(policyNow() === 'apply' && admissionPrice() !== 'pen');
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
        ? (S.app.refused ? PAGE_COPY.appcards.refused : S.app.submitted ? 'Submitted — the members are deciding' : applyShutOnMe() ? '' : S.app.started ? (['appname', 'apppic'].every((k2) => APPCARDS().find((x) => x.k === k2).done()) ? 'Ready to submit' : 'Three small tasks') : 'Membership is by application')
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
        return '<p class="why">Your application goes before the members as a proposal (✏️) — it passes if the membership is sure enough.</p>' +
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
    function applicantCardHtml() {
      const c = APPCARDS().find((x) => x.k === S.open);
      if (!c) return '';
      const a = S.app;
      let foot;
      let body = APPBODY[c.k]();
      if (c.k === 'apply') {
        const shut = applyShutOnMe();
        // the door has shut (E33): the sentence stands before the press; a
        // refusal from the wire lands in the same place through `doorErrHtml`;
        // both retire the way Y25 says — the door opening again, or a keystroke
        if (!shut && S.doorErr && S.doorErr.k === 'apply') S.doorErr = null;
        // **and a shut door's card is the sentence and nothing else** (Q901):
        // what an application is and what it will cost is copy for somebody who
        // can still make one, so it goes while the door stands shut
        if (shut) body = '';
        foot = a.submitted ? binBtn()
          // **a shut door commits with OK** (SURFACE E33, Q901): the card is
          // news, and a Submit standing dark beside it would be a commit on a
          // card that asks nothing (§9.1, CP9). Once acknowledged the OK goes
          // too and the bin is the way out, exactly as an acked gate's is
          : shut ? (a.shutAcked ? binBtn()
            : binBtn() + '<button class="btn btn-approve okbtn" data-appshutok="1">OK</button>')
          : !a.started ? '<button class="btn btn-approve" data-appstart="1">Begin</button>'
          // a word, not 🏛️: an application becomes an ordinary motion, and
          // the 🏛️ glyph belongs to the assembly-press hold — a plain click
          // wearing it claimed the constitutional route it does not take
          : binBtn() +
            '<button class="btn btn-approve"' + (a.name.trim() && a.pic ? '' : ' disabled') +
            ' data-appsubmit="1" title="Your application goes before the members">Submit</button>';
        if (a.started && !a.submitted) {
          body += shut && !doorErrOn('apply')
            ? '<p class="why">' + esc(APPLY_SHUT) + '</p>'
            : doorErrHtml('apply');
        }
      } else if (c.k === 'appmail' && !a.emailSent && !a.emailVerified) {
        // the send is the row's 📧, armed by a valid address that is nobody
        // else's — the stranger's 📧 rule (reading 1194, T47), since Q1399
        foot = binBtn() +
          '<button class="btn btn-approve glyphbtn emojibtn"' + (appAddrOk() ? '' : ' disabled') +
          ' data-appmailsend="1" title="Send the link">' + glyphHtml('📧') + '</button>';
      } else {
        foot = binBtn() +
          '<button class="btn btn-approve glyphbtn"' + (c.done() || c.optional ? '' : ' disabled') + ' data-close="1">' + TICK + '</button>';
      }
      return cardHtml(c, appCtx, body, foot, [c]);
    }
    /** the applicant's address is already a member's — one identity per address (§9.7½) */
    const appAddrTaken = () => MEMBER_EMAILS.has(S.app.email.trim().toLowerCase());
    /** an address the 📧 will send to: well-formed and nobody else's */
    const appAddrOk = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(S.app.email) && !appAddrTaken();

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
        band.innerHTML = (own
          ? '<div class="setrow constsec"><div class="csec"><div class="cpara open">' + strangerCardHtml() + '</div></div></div>' : '') +
          (env.cs ? bandHtml(groups(), env.strCtx, strangerReadCard) : '');
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
        band.innerHTML = (own
          ? '<div class="setrow constsec"><div class="csec"><div class="cpara open">' + applicantCardHtml() + '</div></div></div>' : '') +
          (settled(card('myemail')) ? bandHtml(groups(), env.strCtx, strangerReadCard) : '');
        fitBand(band);
        return;
      }
      // **The 👑 takes the pattern whole** (CP5, Q1100, Ed's refinement):
      // 🗑️ closes the card with the question kept pending, and the two
      // reserved powers are the two answers — a Founder Action passes it, the
      // Founder Veto holds it. The word-buttons retired 2026-08-31. Both wear
      // their power's glyph and both exercise it, which is what T44 asks of a
      // glyphed commit. One implementation since Q1475, the admission card
      // having needed the same row: the pair groups at the far right, the
      // veto immediately left of the pen (Ed, 2026-09-02, Q1154).
      const crownPairRow = () => (amFounder()
        ? binBtn() + '<span class="rightpair">' +
          '<button class="btn glyphbtn emojibtn" data-crownq="reject"' +
          ' title="Refuse — the Founder Veto holds it, and what stands stands">' + glyphHtml('🛡️') + '</button>' +
          '<button class="btn btn-approve glyphbtn emojibtn" data-crownq="accept"' +
          ' title="Accept — a Founder Action passes it now">' + glyphHtml('✒️') + '</button></span>'
        : binBtn());
      const cardFor = (g) => {
        const c = card(S.open);
        // A card the room owns keeps its own body — choosing to hand it over is
        // the founder's decision and stays editable — and grows a **watching**
        // half underneath, which is the whole of what anybody may see of a blind
        // question while it runs.
        if (c.isBegin) {
          const rd = readinessOf();
          const can = !constituted() && amFounder() && (!rd || rd.ready);
          // a begun document's 🍾 asks nothing and takes the close-only OK
          // (Ed's card review round 3, 2026-09-05, 45; reading 1190)
          return cardHtml(c, ctx, beginBody(c, rd),
            constituted() ? binBtn() + '<button class="btn btn-approve okbtn" data-close="1">OK</button>'
              : binBtn() +
                '<button class="btn btn-approve glyphbtn emojibtn btn-pen" data-confirm="1" data-begin="1"' + (can ? '' : ' disabled') +
                ' title="' + (can ? 'Begin the document — a full one-second hold' : 'The document cannot begin yet') + '">' + glyphHtml('🍾') + '</button>',
            g.cards);
        }
        // **The admit judgment, on its own card** (entry 96): the applicant at
        // the head in their own words, then the judgment 🪪's price asks for.
        // The lanes and `liveJudgeAdmit` are the ones the 🪪 clause used to
        // carry; what is new is that anything reaches them at all (Q900).
        if (c.admit) {
          const ap = applicantById(c.admit);
          if (!ap) return cardHtml(c, ctx, '<p class="why">This application is no longer open.</p>',
            binBtn(), g.cards);
          const price = admissionPrice();
          const words = (ap.words || '').trim();
          const said = '<div class="memrow">' + avHtml({ n: ap.name, pic: ap.picture }) +
            '<span class="mn">' + esc(applicantName(ap)) + '</span></div>' +
            '<p class="why">' + esc(ap.email) + (words ? ' · <i>' + esc(words) + '</i>' : '') + '</p>';
          // **✒️ — news.** They are already in; the card says so and asks only to
          // have been seen, like every other thing that happened rather than
          // being decided.
          if (price === 'pen') {
            return cardHtml(c, ctx, said +
              '<p class="why">Anybody may join on their own word here, so ' +
              esc(applicantName(ap)) + ' is a member from the moment they asked.</p>',
              binBtn() + '<button class="btn btn-approve okbtn" data-ok="' + esc(c.k) + '">OK</button>',
              g.cards);
          }
          // **The membership has agreed and the Founder has not answered**
          // (Q1475, Ed 2026-09-19, the Founder of a live room: *I did have
          // founder veto but I wasn't served a queue card for it*). ✉️'s 🛡️
          // is held, so a carried admission parks on the Founder's assent
          // (§9.7 rule 9) and the module opens the 👑 question — and this
          // card had no branch for it at either price: it went on drawing the
          // vote, so the Founder was shown a question they had answered and
          // a member pressing an answer was refused *the motion is not
          // running*. It reads as the passed card it is now, in the settled
          // motion's own grammar (CP5, Q1100, the `awaiting-crown` branch
          // below): the two blocks with the membership's choice marked
          // chosen, the pair of powers for the Founder, and for everybody
          // else the park's own sentence and nothing to press.
          const parked = liveMotionRec(c);
          if (parked && parked.status === 'awaiting-crown') {
            return cardHtml(c, ctx, said +
              '<div class="pick"><span class="opttext">' + esc(PAGE_COPY.consent.staysAsIs) + '</span></div>' +
              '<div class="pick on"><span class="opttext">' +
              esc(PAGE_COPY.consent.joins(applicantName(ap))) + '</span>' +
              chosenRadio('Chosen by the membership') + '</div>' +
              (amFounder() ? '' : '<p class="setnote">' +
                esc(window.COPY.session.park.awaiting) + '</p>'),
              crownPairRow(), g.cards);
          }
          // **🏛️ — everybody's consent**, which is the constitutional motion the
          // room already knows: the shared picks, and the generic commit path,
          // reached because `motionTargets` points this motion at this card.
          if (price === 'assembly') {
            // the consent card's own three blocks (Q1182): the applicant's
            // words are the reason under the proposed block, 🏛️ commits.
            // Drawn by the motion grammar on its constitutional row since
            // Q1331 — this was the one caller the rename missed, and the card
            // threw on open until the assembly-priced applicants-walk caught it.
            return cardHtml(c, ctx, said +
              motionBlocks(c.k, PAGE_COPY.consent.staysAsIs, PAGE_COPY.consent.joins(applicantName(ap)), null, 'constitutional'),
              binBtn() + '<button class="btn btn-approve glyphbtn emojibtn"' +
              (motionPicked(c) ? '' : ' disabled') + ' data-confirm="1" title="Give your answer">' + glyphHtml('🏛️') + '</button>',
              g.cards);
          }
          // **✏️ — the membership decides**, its own one-candidate race against
          // the membership as it stands
          const rc = admitCardOf(c.admit);
          const pick = S['adm:' + c.admit] || null;
          // **An admission at ✏️ price is an ordinary motion, so it wears the
          // clock** (Q1460 (c)): the applicant's own race is this card's
          // alone, so the deadline on it is exactly this seat's silence here.
          // On the textless block, which is this card's Indifferent row.
          const absAt = motionAbstainAt(c);
          // option blocks (CP1); Indifferent is a textless block whose radio
          // names the act instead of *Prefer this* (CP4, Q1099)
          const lane = (v, label) => {
            const note = (v === 'either' && absAt != null) ? window.CARDS.abstainNoteHtml(absAt) : '';
            return '<div class="pick' + (pick === v ? ' on' : '') + (note ? ' absrow' : '') + '">' +
            // `ctl` (T46): *Admit them* is the lane's own act, not the clause
            (label ? '<span class="opttext ctl">' + label + '</span>' : '') +
            '<button class="lanepick" aria-pressed="' + (pick === v) +
            '" data-admitpick="' + esc(c.admit) + '" data-v="' + v + '">' +
            '<span class="dot"></span>' + (v === 'either' ? '<span>Indifferent</span>'
              : '<span class="off">Prefer this</span><span class="on">Preferred</span>') +
            '</button>' + note + '</div>';
          };
          return cardHtml(c, ctx, said +
            '<p class="why">The membership decides this.</p>' +
            (rc ? '<div class="choice" role="radiogroup" aria-label="Admit them?">' +
              lane('admit', 'Admit them') +
              lane('stands', 'Keep the membership as it is') +
              lane('either', '') + '</div>'
              : '<p class="setnote">Before the members — you have voted on it.</p>'),
            binBtn() + '<button class="btn btn-approve glyphbtn" data-admitgo="' +
            esc(c.admit) + '"' + (rc && pick ? '' : ' disabled') + '>' + TICK + '</button>',
            g.cards);
        }
        // **What one act laid down, in one card** (entry 162, Q1013): the whole
        // batch stated, grouped by the constitution's own sections, taking one
        // OK. The commit row is the ✒️-price admit card's — 🗑️ and an OK — a
        // release having happened rather than been decided.
        if (c.release) {
          const b = releaseBatch(c.release);
          if (!b) return cardHtml(c, ctx, '<p class="why">This is no longer outstanding.</p>',
            binBtn(), g.cards);
          return cardHtml(c, ctx, releaseBody(b),
            binBtn() + '<button class="btn btn-approve okbtn" data-ok="' + esc(c.k) + '">OK</button>',
            g.cards);
        }
        // **A mail that gave up, in one card** (SURFACE E34): the addresses the
        // pass could not reach, stated once, taking one OK. The commit row is
        // the release card's — 🗑️ and an OK — a give-up having happened rather
        // than been decided.
        if (c.mailgiveup) {
          const b = mailGiveUpBatch(c.mailgiveup);
          if (!b) return cardHtml(c, ctx, '<p class="why">This is no longer outstanding.</p>',
            binBtn(), g.cards);
          return cardHtml(c, ctx, mailGiveUpBody(b),
            binBtn() + '<button class="btn btn-approve okbtn" data-ok="' + esc(c.k) + '">OK</button>',
            g.cards);
        }
        // **A departure, in one card** (SURFACE E31, E32, E40; Q901): the
        // register's own sentence about who left and by whose act, stated
        // once, taking one OK. The commit row is the release card's — 🗑️ and
        // an OK — a departure having happened rather than been decided, and
        // the body is `departureLine`'s so the card and the grey line under
        // *Members* can never say two different things about one act.
        if (c.departure) {
          const d = owedDeparture(c.departure);
          if (!d) return cardHtml(c, ctx, '<p class="why">This is no longer outstanding.</p>',
            binBtn(), g.cards);
          return cardHtml(c, ctx, '<p class="why">' + departureLine(d) + '</p>',
            binBtn() + '<button class="btn btn-approve okbtn" data-ok="' + esc(c.k) + '">OK</button>',
            g.cards);
        }
        // **A motion of yours that failed** (SURFACE E41; Q1447), and the one
        // card in the family whose body is another card's: where the motion
        // filed a record this **is** that record, so it draws `recordBody` —
        // the dateline, *Rejected*, the rule that stands marked as standing
        // and the wording that did not, with the reason — and the only thing
        // that differs from the grey chip's own card is that its OK is owed
        // rather than a close. A door's motion files no record, so there the
        // body is the one sentence saying what happened, `departureLine`'s
        // shape and for its reason.
        if (c.held) {
          return cardHtml(c, ctx, heldBody(c),
            binBtn() + '<button class="btn btn-approve okbtn" data-ok="' + esc(c.k) + '">OK</button>',
            g.cards);
        }
        if (c.isClosing) {
          const signed = signedClose();
          return cardHtml(c, ctx, closingBody(c),
            signed || !viewerIsMember()
              ? binBtn()
              : binBtn() +
                '<button class="btn btn-approve okbtn" data-sign="1" title="OK signs the document; your comment goes on the record">OK</button>',
            g.cards);
        }
        if (c.isGate) {
          // **A grant's commit is OK, like every other acknowledgment** (Ed,
          // 2026-09-01, backlog 263, Q1121: *you should only click a button with
          // 🛡️ on it when you're actually doing a veto*). Entry 180 had it wear
          // the power's glyph and a verb — **✒️ Take the pen** — on 🍾 Begin's
          // accent-subtle ground, because the press is the one act after which you
          // hold something you did not hold before. That is still true, and the
          // **mark** still says it (`grants`, in the tab and the rail entry); the
          // commit may not, because a glyphed commit is a promise that pressing it
          // exercises that power, and this one only acknowledges. So every gate
          // and grant commits with the plain OK on the solid accent (T18, T44),
          // and the object still flies from the press — the flight reads `grants`,
          // never the commit's words. It stays a **click**: nothing here is
          // destructive, and the hold question is entry 184's. `data-ok` and the
          // key are deliberately unchanged — the handler, `pendingGrant`,
          // `saveGrants` and every walk press this selector.
          //
          // **And an acknowledged gate takes the bin alone**, exactly as 🥂
          // does once it is signed: the tab stays in the band and opens, so
          // without this the founder — for whom `acked` is true from 🍾 and
          // never becomes false (Y27) — is offered an OK for ever on a power
          // they already hold, and the press re-fires `pendingGrant`'s pencil
          // storm into a full wallet. A card that asks nothing commits nothing
          // (SURFACE §9.1, CP9).
          // …and an acked gate keeps an OK that only closes (Ed's QA,
          // 2026-09-02 pm, 1167 b's grammar): no ACK_KEYS entry, nothing
          // tracked — the friendlier way out beside the bin.
          // **An open gate is its head and its OK** (Ed's card review round 3,
          // 2026-09-05, 46 💡 / 47 ⚖️): the provenance line, the explainer, the
          // *Open —* line and the wallet count all go once the gate is open —
          // the head's clause says what members may do. A gate still waiting
          // keeps its blockers list, which is what the card is for until 🍾;
          // the three grants (✒️ 🛡️ 🏛️) keep their sentence, being news of a
          // power rather than a gate.
          const gateOpenBare = c.isGate && !c.isGrant && c.open();
          return cardHtml(c, ctx, gateOpenBare ? '' : grantProv(c) + gateBody(c),
            acked(c.k) ? binBtn() + '<button class="btn btn-approve okbtn" data-close="1">OK</button>'
              : binBtn() +
                '<button class="btn btn-approve okbtn"' +
                (c.open() ? '' : ' disabled') +
                ' data-ok="' + c.k + '">OK</button>', g.cards);
        }
        // **A record, opened** (Q942): what was proposed at its head, the outcome
        // and the reason in the field, and 🗑️ alone at the foot — a record asks
        // nothing, so it has no OK (SURFACE §9, the sealed record's *nothing*).
        // The bin is the band's one always-live close (Q613 (a)).
        // **the record's OK only closes** (Q1167 b): a word, not a glyph — no
        // ACK_KEYS entry, nothing tracked, nobody owes a press
        if (c.record) return cardHtml(c, ctx, recordBody(c),
          binBtn() + '<button class="btn btn-approve okbtn" data-close="1">OK</button>', g.cards);
        // 403/405 (Ed, 2026-08-19): a power tab, opened — the ✒️ or 🛡️
        // half of a setting's governance, its head the rule as it stands
        if (c.power) {
          /* A return still in flight — a `reserve` a log made before Q1404
             carries, or the ladder's stagehand put — is answered on its own
             motion card exactly as a constitutional motion is answered
             anywhere: the same blocks, the same 🏛️, the mover's 🗑️
             withdrawing. The member's offer to put one (Q386) left with
             Q1404: the road back is closed, and a laid-down power's tab is
             not drawn, so the founder's own card below is the only tab a
             power has. */
          const pm = motionOn(c);
          if (pm) {
            return cardHtml(c, ctx, consentBody(c, pm),
              (pm.by === viewerId()
                ? '<button class="btn glyphbtn" data-withdrawmotion="' + c.k + '" title="Withdraw it — your 🏛️ comes back whole">' + glyphHtml('🗑️') + '</button>'
                : binBtn()) +
              '<button class="btn btn-approve glyphbtn emojibtn"' + (motionPicked(c) ? '' : ' disabled') +
              ' data-confirm="1" title="Give your answer">' + glyphHtml('🏛️') + '</button>', g.cards);
          }
          const pHeld = c.power === 'u' ? pwPair(c.base).u : pwPair(c.base).a;
          // …and never on a closed document (entry 62): `relinquish` and
          // `reclaim` both `requireOpen`, so this ✒️ posted a command the server
          // answers 400. It is not pen-gated (SURFACE Y7) and stays so.
          const editable = amFounder() && docOpen() && !(env.cs && env.cs.constitutedAtT !== null && !pHeld);
          // ✒️, not ✓: giving up a power is the founder's unilateral set,
          // and ✒️ is the pen every unilateral set on this surface commits
          // with — the ✓ is reserved for answering a shared question
          // …and a tab with nothing to set takes the close-only OK (Ed's card
          // review round 3, 2026-09-05, 52/53; reading 1190 — every card whose
          // row was 🗑️ alone): a word, no ACK_KEYS entry, nobody owes a press
          return cardHtml(c, ctx, powerBody(c),
            (editable ? binBtn() +
              '<button class="btn btn-approve glyphbtn emojibtn" data-confirm="1"' +
              ' title="Set it">' + glyphHtml('✒️') + '</button>'
              : binBtn() + '<button class="btn btn-approve okbtn" data-close="1">OK</button>'),
            g.cards);
        }
        const m = motionOn(c);
        // **Reserved is assent, not silence** (§9.7): the room passed it, and
        // it now sits with the founder — Accept applies it, Reject files it.
        if (m && m.status === 'awaiting-crown') {
          // **the two-block pair** (Q1167 a as refined, Ed 2026-09-02): the
          // standing rule, then the change the membership has already chosen.
          // Both blocks carry the full clause sentence and the provenance is a
          // chosen radio — *Chosen by the membership* — rather than a note
          // (Ed's QA, 2026-09-02 pm): the pair reads as the option card it is,
          // the vote being over and the card waiting on the founder's own act.
          const rec0 = liveMotionRec(c);
          const rawV = rec0 && rec0.payload && rec0.payload.kind === 'set' ? rec0.payload.value : null;
          // the full clause sentence, never the short label (Ed's card review
          // round 3, 2026-09-05, 31 🌍: *"Members only" => "The document can
          // only be seen by members."*)
          const toClause = (rawV !== null && sentenceFor(hostKeyOf(c), rawV)) || m.to;
          return cardHtml(c, ctx,
            '<div class="pick"><span class="opttext">' + esc(decisionLine(c)) + '</span></div>' +
            '<div class="pick on"><span class="opttext">' + esc(toClause) + '</span>' +
            chosenRadio('Chosen by the membership') + '</div>' +
            (m.why ? window.CARDS.speakerHtml(m.why) : ''),
            crownPairRow(), g.cards);
        }
        // a live motion takes the route its own value asks for (329a)
        if (m && routeOfM(m, c) === 'ordinary') {
          // **The ordinary motion card is the consent card's shape** (Q1331,
          // Ed 2026-09-11: *all of it*): no head, the standing rule as block
          // one with *Keep this*, the proposed rule beneath with the
          // proposer's sealed reason and *Prefer this*, *Indifferent* as its
          // own textless block; no explainer, no eyebrow, no count. The
          // commit is ✓ — a judgment, binding nobody but you (§9.1) — and the
          // pick still feeds `liveJudge` / the dev seam as stands · proposed ·
          // either.
          return cardHtml(c, ctx, ordinaryBody(c, m),
            // one bin on every card, always live (Q613 (a), 2026-08-22): for the
            // mover it withdraws, for anybody else it simply closes the card
            (m.by === viewerId()
              // …glyph alone since 2026-09-05 (Ed, closing T47's one exception
              // for the word *Withdraw*: both motion cards' 🗑️ match)
              ? '<button class="btn glyphbtn" data-withdrawmotion="' + c.k + '" title="Withdraw it — the ✏️ comes back in full">' + glyphHtml('🗑️') + '</button>'
              : binBtn()) +
            // **the mover is not asked to judge their own motion** (K8, Q1370):
            // their preference is derived, never cast (§3.3), so their card
            // offers withdraw and no ✓ — the entry is theirs (M3), not an ask
            (m.by === viewerId() ? ''
              : '<button class="btn btn-approve glyphbtn"' + (motionPicked(c) ? '' : ' disabled') +
                ' data-confirm="1">' + TICK + '</button>'),
            g.cards);
        }
        if (m) {
          // **The consent card takes the settled shape** (Ed's card review
          // round 3, 2026-09-05, 58, Q1182): the standing rule as block one
          // with *Keep this*, the proposed rule beneath with the proposer's
          // sealed reason and *Prefer this*, *Abstain* on its own row like
          // Indifferent — full clause text on every block, no *Re-opened*
          // paragraph, no count, no privacy sentence, no explainers, no blind
          // note. **The mover's 🗑️ still withdraws** — Ed, 2026-09-05, correcting
          // the build's first reading: the note was about the word *Withdraw*
          // on the button, not the act — so it wears the glyph alone (T47), at
          // the very left where 🗑️ always is, and hands the 🏛️ back whole.
          // The commit is 🏛️ — your consent, given (C4).
          return cardHtml(c, ctx, consentBody(c, m),
            (m.by === viewerId()
              ? '<button class="btn glyphbtn" data-withdrawmotion="' + c.k + '" title="Withdraw it — your 🏛️ comes back whole">' + glyphHtml('🗑️') + '</button>'
              : binBtn()) +
            '<button class="btn btn-approve glyphbtn emojibtn"' + (motionPicked(c) ? '' : ' disabled') +
            ' data-confirm="1" title="Give your answer">' + glyphHtml('🏛️') + '</button>', g.cards);
        }
        // — unless it is a decision you are owed: the OK comes before the
        // motion, since an unacknowledged rule sits in the rail until it is
        // pressed (the composer returns the moment it is)
        if (composerOn(c) && stateOf(c, ctx) !== 'news') {
          // **The settled card is the composer** (Ed, 2026-08-18): the rule as
          // it stands at the head, the alternatives as the setting's own
          // controls, session-view's rationale lane, 🗑️ and the route's commit.
          const d = (S.draft && S.draft.k === c.k) ? S.draft : { k: c.k, to: '', why: '' };
          const route = routeFor(c, d.to);
          const body2 = (PROPOSE[c.k] ? PROPOSE[c.k](d)
              : '<div class="lanebox"><div class="lp editlane" contenteditable="plaintext-only" spellcheck="false"' +
                ' data-motionlane="to" data-ph="The value you are proposing">' + esc(d.to) + '</div></div>') +
            whyLane(d) +
            // the price is not said in words (Ed, 2026-08-19): the pencil
            // flying out of the wallet is what teaches it, and a sentence
            // beside the flight is the surface explaining its own animation.
            // The *goes to the Founder, who may assent or refuse* note went the
            // same way with Ed's card review round 3 (2026-09-05, reading
            // 1189): the 🛡️ tab beside the card already says the veto stands.
            doorErrHtml(c.k);
          return cardHtml(c, ctx, body2 + changeHalf(c),
            '<button class="btn glyphbtn" data-dropmotion="1"' +
            ' title="Discard this motion">' + glyphHtml('🗑️') + '</button>' +
            commitFor(c), g.cards);
        }
        // the room reaches the answer bodies as a fourth argument (entry 167):
        // `setup.js` writes the controls but must not learn where a room comes
        // from, so the caller hands it one built by `roomNow`
        // …and the clause context as a sixth (Q1112 (b)), for the same reason:
        // two of the clause sentences name a fact outside their own setting —
        // 🌍's clerk deviation and 🤝's price — and a ladder that omitted it
        // would say the rung a second way, which is the T5 finding this ends
        // **The Founder's own answer card says which hat is answering** (Q1300,
        // Ed 2026-09-10): a founder who is a member answers what they delegated
        // on a separate card (§9.0b) that otherwise wears the setting's own
        // title, so the note is the one thing telling the two apart. `.unlocks`
        // is the surface's blue box; a clerk-founder owes no answer and sees none.
        const body = c.ansFor ? (amFounder() && viewerIsMember()
              ? '<p class="unlocks">' + esc(PAGE_COPY.asMember) + '</p>' : '') +
            ANSWER[c.ansFor](S.myAns, E(),
            c.ansFor === 'quorum' ? S.quorumForm : undefined, roomNow(), ANSTYPED,
            clauseCtx())
          // a card that is not yours to answer reads as the rule it is —
          // the founder's settings are read-only from any other chair
          // **…and from the founder's own, once the pen on it is down** (entry
          // 62). The seat was the whole test, so a founder who had laid a pen
          // down still met the lane and the radios that pen paid for — live,
          // pressable, and refused by the server with a console warning nobody
          // reads. `founderHandOff` is the same question the composer swap has
          // always asked, put to the body.
          : ((!amFounder() || founderHandOff(c)) && c.own !== 'you' && !doorDirect(c))
          // **The watch-half is retired** (Q1176, Ed 2026-09-02 pm): *What the
          // membership said*, the distribution strip, the taken line and the
          // running count all leave the delegated cards; provenance is the
          // standing block's own chosen radio, and the per-question counts move
          // to 🍾 (design finished with Q1169).
          ? readBody(c, ctx)
          : BODY[c.k]() + delegateRung(c);
        // **The route left the card bodies** (Ed's copy pass, 2026-08-19,
        // finishing what the kind-eyebrow removal started): every card carried
        // a kind line restating the preamble, and the preamble is where the
        // routes are stated once — the clause states its deviations, and the
        // controls convey the rest (a 🏛️ hold, a 👑 note). What survives is
        // the one sentence only its own card can say: the ⏰ card's
        // whether/when split, where the constitutional line falls inside a
        // single setting.
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
        // the two halves of Q530, chosen by which side of the act you are on
        // **Declared, not assigned, so the composer above can reach it.** A
        // member's settled card post-start renders through the composer's own
        // early return, which is *before* this point in the function — so as an
        // arrow const the history was drawn on the news card and lost the
        // moment the OK turned it back into a composer. Ed's answer was that
        // the clause keeps it permanently, and a settled clause is exactly
        // where somebody goes to ask why a rule is the way it is.
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
            return '<div class="body whyset"><p class="eyebrow fieldlab">Why are you changing this?</p>' +
              founderSpeakerLane(v) + '</div>';
          }
          // anybody else, reading what happened: what changed, and their reason
          const am = lastAmendment(k);
          if (!am || amFounder()) return '';
          const from = am.from || changedFrom(k);
          if (!from) return '';
          const was = wordsFor(k, from);
          const now2 = wordsFor(k, (csState(k) || {}).value);
          if (!was) return '';
          const what = esc(WHAT[k] || (k === 'title' ? 'the document’s title' : nounOf(cc).toLowerCase()));
          const who = am.route === 'pen' ? 'The Founder has changed ' : 'The membership has changed ';
          // **Long values are shown, not narrated** (2026-08-22). *from x to y*
          // reads well for a rung, a percentage or a date, and badly for ⏱️,
          // whose value is three numbers in a sentence — *from 4 ✏️ to start, up
          // to 8, one more every 180 minutes to 2 ✏️ to start, up to 8, one more
          // every 180 minutes* buries the one number that moved and loses its
          // own *to* in the middle. Past a short value the pair goes on two
          // aligned lines instead, where the eye finds the difference itself.
          const longish = was.length > 32 || (now2 || '').length > 32;
          // **News says what happened; history says when.** The same block does
          // both jobs, because it is the same fact — but an amendment you have
          // already acknowledged is no longer being announced to you, and a
          // line on a settled clause that a reader may meet months later has to
          // date itself or it reads as something that has just happened.
          const dated = stateOf(cc, ctx) === 'news' ? ''
            : '<p class="eyebrow fieldlab">Last amended' +
              (am.at ? ' ' + esc(new Date(am.at).toLocaleDateString(undefined,
                { day: 'numeric', month: 'long' })) : '') + '</p>';
          // **A 💤 change names the members it returned** (SURFACE Y26, Q902):
          // turning it off or lengthening it past somebody's quiet returns them
          // at once (entry 97), and who the change put back is part of what
          // changed. The module's own record of the set (`returned`, ids) is
          // named off the register — who is a member is public (§9.0c).
          const back = k === 'lapse' ? ((csState(k) || {}).returned || []) : [];
          const returned = back.length
            ? '<p class="cpv">' + PAGE_COPY.lapseReturned(
              listOf(back.map((mid2) => esc(nameOfMember(mid2)))), back.length) + '</p>'
            : '';
          return '<div class="body changed">' + dated +
            (longish
              ? '<p class="cpv">' + who + what + '.</p>' +
                '<p class="waswas"><span>was</span>' + esc(was) + '</p>' +
                (now2 ? '<p class="waswas"><span>now</span>' + esc(now2) + '</p>' : '')
              : '<p class="cpv">' + who + what +
                ' from ' + esc(was) + (now2 ? ' to ' + esc(now2) : '') + '.</p>') +
            returned +
            (am.route === 'pen' ? founderSpeaker(am.why)
              : window.CARDS.speakerHtml(am.why)) + '</div>';
        }
        const kindLine = c.knote ? '<p class="setnote">' + c.knote + '</p>' : '';
        const newsKey = isRoom(c) ? 'res-' + c.k : 'set-' + c.k;
        // **The ground belongs to the glyph, never to the card's kind** (Ed's
        // QA, 2026-08-21: *the buttons during the birth are many different
        // colours*). Two rules chose the commit's look and they were keyed on
        // different things: the *glyph* on whether the document exists yet (at
        // the birth every commit is the 🪶, whoever the card is about), the
        // *quiet ground* on the card's kind. On 📧 — a personal card, so ✓ by
        // kind — they disagreed, and the third feather of the birth stood on
        // the solid green the drawn ✓ owns, between two on the accent-subtle.
        // One expression now decides both: an emoji needs a quiet ground
        // wherever it sits, and the ✓ stays the one solid green thing.
        // **…and an answer to a constitutional question commits with 🏛️**
        // (Ed, 2026-09-05, Q1182 — SURFACE C4 amended): the founding answer
        // cards and the consent card are the same act, your consent given, and
        // §7's *the founding answers are a kind of 🏛️* is now literal. ✓ is
        // left to ordinary judgments and the cards about yourself.
        const commitGlyph = !env.cs ? '🪶' : c.ansFor ? '🏛️' : c.kind === 'personal' ? TICK : '✒️';
        // **A door whose act is in the body has nothing left to commit** (Ed,
        // entry 37: *the main action in the bottom right is just ✔️, closing the
        // card*). ✉️ in its direct form sends from the field — so the row's ✒️
        // was a pen over a card with no value to set: its press walked the
        // `[data-confirm]` keys, found `invite` in `DOOR_KEYS` and not in
        // `MANAGED_KEYS`, and closed the card having done nothing — after
        // running the one-second hold and flying the pen out of `#penwallet`,
        // a flight for an act that does not happen. What is left is the drawn ✓
        // on `data-close`, which is the applicant's cards' own foot: the bin
        // puts back what is typed, the ✓ closes and **keeps** it (the boxes keep
        // what is in them across a close, Ed 2026-08-21).
        // The test is `c.k === 'invite' && doorDirect(c)`, and it stands ahead of
        // the non-founder branch below — a member inviting at 🪪 *pen* is not the
        // founder, and would otherwise get the bin alone. ❌'s direct form keeps
        // its ✒️ for now: its act is a dropdown plus *❌ Remove*, and that is a
        // change of its own.
        const foot = c.leaveDoor
          // 🌂 (Q1400): the warning is the body, the ✓ is the act — the same
          // `resign` press *Leave* was, free and nobody's to refuse (E32)
          ? binBtn() + '<button class="btn btn-approve glyphbtn" data-act="resign" title="' + PAGE_COPY.cards.leave.t + '">' + ARROW_OUT + '</button>'
          : (c.k === 'invite' && doorDirect(c))
          // **the send is the row's commit** (Q1166): ✒️ where the viewer's
          // word sends, beside the route's commit where the founder holds both
          // (the pair at the right, ✒️ immediately left — Q1154). A click, not
          // a hold: a direct invitation spends nothing, and it is never
          // disabled on an empty box, the refusal sentence (Y25) being what an
          // empty box is owed.
          ? binBtn() + '<span class="rightpair">' +
            '<button class="btn btn-approve glyphbtn emojibtn" data-act="invite"' +
            ' title="Send the invitations — your word sends">' + glyphHtml('✒️') + '</button>' +
            founderCommit(card('invite')) + '</span>'
          // …and the same for a founder whose hand is off this setting (entry
          // 62): the body above is already the settled card, and a settled card
          // commits nothing. 🗑️ is the band's always-live close (Q613 (a)).
          : (c.k === 'remove' && directRemove())
          // **the acts are the row's** (Ed's QA, 2026-09-02 pm): choose the
          // person in the body, then press the act — ✒️ removes on your word
          // (the old ❌ Remove button, now the pen it always was), the route's
          // commit beside it proposes instead. Q1154's order: the power
          // immediately left of the route's commit.
          ? binBtn() + '<span class="rightpair">' +
            '<button class="btn btn-approve glyphbtn emojibtn" data-exile="1"' +
            (S.removeWho ? '' : ' disabled') +
            ' title="Remove them — your word removes">' + glyphHtml('✒️') + '</button>' +
            founderCommit(card('remove')) + '</span>'
        : ((!amFounder() || founderHandOff(c)) && c.own !== 'you' && !c.ansFor)
          ? (stateOf(c, ctx) === 'news'
            ? binBtn() +
              '<button class="btn btn-approve okbtn" data-ok="' + newsKey + '">OK</button>'
            : binBtn())
          : (c.k === 'myname' || c.k === 'mypic')
          // **The bin clears un-actioned input and never touches what is set**
          // (Q520, Ed 2026-08-21). ✋ and 🖼️ were the two bins whose act was to
          // *delete* the value rather than put the card back, which was
          // survivable while a bin greyed out unless there was something to
          // throw away — and a trap once the bin became always live and also
          // the way out of a card. They take the shared bin: it restores what
          // stands, so a name that has been saved is safe from it. Emptying a
          // saved name is still a thing you can do — by emptying the field, the
          // way you set it — and a picture is removed by choosing initials.
          ? binBtn() +
            // Q449 (Ed, 2026-08-20): a name or a picture binds nobody (§9.0c),
            // so it commits with ✓ — the pen is for sets that bind the document
            '<button class="btn btn-approve glyphbtn"' + (ready(c) ? '' : ' disabled') +
            ' data-confirm="1" title="Save">' + TICK + '</button>'
          : c.k === 'title'
          // the title's lane rides the snapshot like every other provisional
          // value now, so this card keeps the shared bin (2026-08-21); the pen
          // and the route's commit group at the far right (Q1154)
          ? binBtn() + '<span class="rightpair">' +
            '<button class="btn btn-approve glyphbtn emojibtn"' +
            // the lock, not the wallet (entry 62): 🪶 at the birth, and after it
            // the pen **on the title**. The tooltip still asks the wallet, since
            // *your pen is waiting in your tasks* is only ever the right
            // explanation when the wallet is what is missing.
            (commitReady(c) && (!env.cs || mayPenOn('title')) ? '' : ' disabled') +
            ' data-confirm="1" title="' + (!env.cs || mayPen() ? commitTitle(c) : penWaitTitle) + '">' +
            glyphHtml(env.cs ? '✒️' : '🪶') + '</button>' +
            // …and the room's route beside it, where the pen is still held
            // (entry 161): the Founder's own act stays where their eye already
            // goes and putting it to the membership is the deliberate second
            // reach, so this is **after** the pen and never in front of it.
            founderCommit(c) + '</span>'
          // 📧 in flight: the act is resending, and it spends nothing, so it is
          // a click rather than a hold (the ladder is for what comes out of a
          // wallet). The first send is still the 🪶 commit below.
          // 📨 says it by itself (Ed, 2026-08-21) — the word was doing nothing
          // the glyph and the tooltip were not already doing, and it is the
          // same 52px glyph button every other commit row uses
          // …and its 🗑️ is the ordinary one (Ed, 2026-08-21). It had been
          // hard-wired off, on the reading that a sent address has nothing to
          // put back — but the field is live here on purpose (typing in it is
          // how a wrong address is corrected), so the bin has exactly the job
          // it has everywhere else: put back the address the link went to.
          : c.k === 'myemail' && S.emailSent && !S.emailVerified
          ? binBtn() +
            '<button class="btn btn-approve glyphbtn emojibtn" data-resend="1"' +
            (EMAIL_OK.test(S.myemail) ? '' : ' disabled') +
            ' title="' + resendTitle() + '">' + glyphHtml('📨') + '</button>'
          : c.k === 'hat'
          ? (() => {
              // **CP9 (Q1106): locked at 🍾 for ever, so no commit at all** —
              // a permanently dark ✒️ promised a thaw that never comes; dark
              // means *not yet* (Y19), and 🎩 after the start is *never*.
              // 🗑️ stays as the close, with 1167 b's close-only OK beside it
              // (Ed's QA, 2026-09-02 pm).
              if (env.cs && env.cs.constitutedAtT !== null) return binBtn() +
                '<button class="btn btn-approve okbtn" data-close="1">OK</button>';
              const cur = S.seen.has('hat') ? (iDraft() ? 'member' : 'clerk') : null;
              const dirty = !!S.hatPick && S.hatPick !== cur;
              return binBtn() +
                '<button class="btn btn-approve glyphbtn emojibtn"' +
                // 🎩 has no power pair, so it keeps the wallet question — plus
                // `docOpen()`, since `set-convenor-membership` is refused after
                // the close like everything else (entry 62, Ed B25 (a)).
                (dirty && mayPen() && docOpen() ? '' : ' disabled') +
                ' data-confirm="1" title="' + (mayPen() ? 'Set it' : penWaitTitle) + '">' + glyphHtml('✒️') + '</button>'; })()
          : stateOf(c, ctx) === 'news'
          ? binBtn() +
            '<button class="btn btn-approve okbtn" data-ok="' + newsKey + '">OK</button>'
          // **CP9 (Q1106): once the document is closed there is no commit left
          // to draw.** What reaches here on a closed page is what
          // `founderHandOff` does not cover — the power tabs and the two doors,
          // which it excludes by name — and every one of them would draw the
          // fall-through's ✒️ permanently dark, since `mayPenOn` carries
          // `docOpen()`. Dark means *not yet* (Y19); after the close it is
          // *never*, and a bin that closes is the whole row. The news branch
          // stands above this deliberately: 🥂's OK is the signature, and
          // `acknowledgeClose` is the one command the close does not refuse.
          : env.cs && !docOpen()
          ? binBtn()
          // …and one bin under all of them (Q521(a), Ed 2026-08-21). An answer
          // is a provisional value like any other — it rides the snapshot as
          // its own `ans:` key — and a card whose value lives elsewhere (the
          // register, the text) simply has nothing to put back, so the bin
          // there is the close it always was under another name.
          //
          // (📄's OK stood here until backlog 204 — Q744's no-bin and Q798's OK;
          // the text is no card body now and its commit is the proposal-row's,
          // so nothing special-cases it)
          : (binBtn() + '<span class="rightpair">' +
          // ✒️ is the founder's pen (Ed, 360): a set of a setting binds the
          // document. Q449 (Ed, 2026-08-20): an answer to a shared question
          // and a setting about yourself — your name, picture, email — bind
          // nobody (§9.0c), so they commit with ✓, never the pen. The pen and
          // the route's commit group at the far right (Q1154).
          '<button class="btn btn-approve glyphbtn' + (commitGlyph === TICK ? '' : ' emojibtn') + '"' +
          // the card decides the ✒️, the wallet decides the sentence (entry 62)
          // — and a card equal to what stands is dark (Q1293, `commitReady`);
          // a delegated card with a value chosen is the take-back, which the
          // per-setting lock cannot see (Q1318, `takingBack`)
          (commitReady(c) && (penOkFor(commitGlyph, c) ||
            (commitGlyph === '✒️' && mayPen() && docOpen() && takingBack(c.k))) ? '' : ' disabled') +
          ' data-confirm="1" title="' +
          // the drawn glyph, unless the commit is the ✓ — cards.js's stroked
          // `TICK`, already markup and deliberately not a picture (Q1360: a
          // commit greys and lights on `currentColor`, which no picture can do)
          (penOkFor(commitGlyph) ? commitTitle(c) : penWaitTitle) + '">' +
          (commitGlyph === TICK ? TICK : glyphHtml(commitGlyph)) + '</button>' +
          // the route's own commit, after the pen (entry 161) — see the title
          // branch above for why it stands second. **Never a door here**: ❌
          // reaches this branch (its row keeps an inert ✒️), and a door's second
          // act belongs beside the door's own, in the body (Q1024, §9.1) — which
          // `BODY.remove` draws. Without this it was drawn twice.
          (c.door ? '' : founderCommit(c)) + '</span>');
        // the refusal line, under the body and beside the commit row that tried
        // (entry 62). The two doors draw it inside their own bodies already, so
        // they are excluded here rather than carrying it twice.
        return cardHtml(c, ctx,
          body + changeHalf(c) + founderPairNote(c) + kindLine +
          (c.door ? '' : doorErrHtml(c.k)), foot, g.cards);
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
        band.innerHTML = settled(card('title'))
          ? bandHtml(groups(), ctx, cardFor)
          : (S.open && S.open !== 'title')
          ? '<div class="setrow constsec"><div class="csec"><div class="cpara open">' + cardFor(groups()[0]) + '</div></div></div>'
          : '';
      } else {
        band.innerHTML = bandHtml(groups(), ctx, cardFor);
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
      const hd = cardEl && cardEl.querySelector('.headdoct');
      const d = document.getElementById('doctitle');
      if (!cardEl || !hd || !d) return;
      cardEl.style.marginTop = ''; hd.style.marginLeft = '';
      d.style.display = '';
      const want = textRect(d);
      d.style.display = 'none';
      const have = textRect(hd);
      if (want && have) {
        const dy = want.top - have.top, dx = want.left - have.left;
        if (Math.abs(dy) > 0.5) cardEl.style.marginTop =
          ((parseFloat(getComputedStyle(cardEl).marginTop) || 0) + dy).toFixed(1) + 'px';
        if (Math.abs(dx) > 0.5) hd.style.marginLeft = dx.toFixed(1) + 'px';
      }
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
          const dy2 = wantG.top - haveG.getBoundingClientRect().top;
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
        const slot = document.querySelector(
          '.setupcard [data-putmotion], .setupcard [data-holdmotion]');
        if (slot) slot.outerHTML = founderCommit(c);
      }
      // …and nothing else on the row has a live state to correct: since the
      // bin is always pressable there is no dirty predicate left to keep in
      // step, which is four fewer copies of "what this card stands as".
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
    const renderKeep = () => {
      const a = document.activeElement;
      const inp = a && a.closest && a.closest('.setupcard') &&
        a.matches('input[data-txt], input[data-num]') ? a : null;
      const box = document.querySelector('.setupcard .emojibox');
      let sel = null;
      try { if (inp) sel = [inp.selectionStart, inp.selectionEnd]; } catch (e) { /* type=email has none */ }
      return { open: S.open, key: inp ? (inp.dataset.txt || inp.dataset.num) : null,
        attr: inp ? (inp.dataset.txt ? 'data-txt' : 'data-num') : null,
        sel, scroll: box ? box.scrollTop : 0 };
    };
    const renderRestore = (k) => {
      if (!k || !k.open || k.open !== S.open) return;
      if (k.key) {
        const el = document.querySelector('.setupcard input[' + k.attr + '="' + k.key + '"]');
        if (el && document.activeElement !== el) {
          el.focus({ preventScroll: true });
          try { if (k.sel && typeof k.sel[0] === 'number') el.setSelectionRange(k.sel[0], k.sel[1]); } catch (e) { /* not a text control */ }
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
      renderTitle(); renderRail(); renderBand(); syncCharter(); renderMail(); renderPowerWallets();
      document.getElementById('mebtn').innerHTML = avHtml(
        S.viewer === 'applicant' ? { n: S.app.name || '?', pic: S.app.pic }
        : isStranger() ? { n: '?', pic: '' } : me(), 'face');
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
      foundedAt, foundedClause, closedAtWords, resendTitle, APPLICANT, MEMBER_EMAILS, APPCARDS,
      appCtx,
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
