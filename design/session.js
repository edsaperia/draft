/* session.js — the session-view's own machinery, lifted out of the page
 * (stage 8, 2026-08-21) so the merged surface and the fixture page share one
 * implementation. The body below is session-view.html's inline script moved
 * verbatim: nothing renamed, nothing reformatted. What changed is mechanical —
 * the fixture data, the DOM handles and everything that ran at load now arrive
 * through `SESSION.init(env)`, and seven hooks (`env.hooks`) let a host hear a
 * judgment, a proposal, a withdrawal, an OK, a ❄️, a text change and the
 * Founder's answer to a text 👑 question; with no
 * hook given every path does exactly what it did. Proven by
 * design/tools/session-probe.js against design/reference/.
 *
 * Load order: **session-view.html's own script-tag block is the source of
 * truth** (:428–452, fourteen files), never a list restated here — the list
 * that was here named three of them and would have broken the page (issue
 * #21). What this file needs standing before it is evaluated: copy.js and
 * cards.js, and flights.js and composer.js, whose `make(env)` it calls at
 * load (Q1352). The page's own script — the fixture and `SESSION.init` —
 * comes after. */
(function () {
  // Every member-readable string this surface renders lives in copy.js (Ed's
  // brief, 2026-09-05, Part 3: copy edits touch that file only); `T` is the
  // session surface's own section of it.
  const T = window.COPY.session;
  // the fixture's parameters, handed in at init (they were consts in the page)
  let DOC, SUGGS, ROSTER, FLOOR, EDIT_RULES, SESSION_MINUTES;
  let editsHeld, editsToNext;
  // the mounts, resolved at init
  let doc, queueEl, tocEl, wiresEl, walletEl, pulseEl;
  // the host's seams; every one optional
  let hooks = {};
  // the closed page (Q470): typing opens nothing and the wallet is gone
  let closedMode = false;
  const setClosed = (on) => { closedMode = !!on; renderWallet(); };
  // **The document's own close is a second fact, and it is not this one**
  // (CP9, Q1106). `closedMode` says *the wallets are gone* — the farewell has
  // flown, or the reader is a stranger — and the host also sets it for the
  // stranger's door, where nothing has closed at all. What a card needs is
  // whether the **document** has closed, which is true for a member the
  // moment the clock runs out and stays true whether or not they have signed.
  // Two facts under one name is the mistake this file already has a
  // post-mortem for, so the second one gets its own.
  let docClosed = false;
  const setDocClosed = (on) => { docClosed = !!on; };
  // **A host's own rail entries** (stage 8, the merge): the setup tasks are
  // entries in this rail, laid out by the same margin-index rules as every
  // other. The host hands them in as {id, html, anchor(), pinned, rank, u,
  // mine}; renderQueue appends them and layoutQueue/drawWires read their
  // meta here instead of from SUGGS. With no host (the fixture page) the map
  // stays empty and nothing below changes.
  let extra = null;
  let extraMeta = new Map();

  const lineOf = (key) => DOC.find((l) => l.key === key);

  // The nearest heading above a clause, which is what a draft of your own is
  // labelled by in the rail. The same deterministic fallback the `race-labeler`
  // uses when the oracle has nothing to say (Q49).
  function headingForKey(key) {
    let h = '';
    // a gap sits under the heading of whatever stands before it
    const gapN = /^G(\d+)$/.test(String(key || '')) ? +String(key).slice(1) : null;
    for (const l of DOC) {
      if (gapN !== null && l.key && !l.gap && +(/(\d+)$/.exec(l.key) || [0, -1])[1] >= gapN) return h;
      if (l.t === 'h') h = l.x;
      if (l.key === key) return h;
    }
    return h;
  }

  // The roster and its quorum: F = min(⌈E/3⌉, F_max) distinct movers before
  // anything can be adopted (SPEC §8.2, where it is called the *floor*). The
  // interface says **quorum** (Ed, 190) — it is quorum for a decision rather
  // than for a meeting, which is the intuition people already have. Since
  // Q1362 it is the **only** number in the adoption test: the text on a
  // footprint is whichever candidate the ranking puts on top once this many
  // members have weighed in, and the confidence that used to stand beside it
  // is pinned and out of the member's sight.

  // Creation-time constitution (SPEC §9.0). The starting number of edits and
  // the rate they come back are per-document parameters chosen when the
  // document is made, exactly like the quorum (Ed, 2026-08-16) — so
  // they are held here as named rules rather than as numbers scattered
  // through the render.
  // Where this member stands: five held, three fifths of the way to a sixth.
  // Worth knowing that a real session would probably show eight — §7's
  // calibration note says participants sit near the cap at v1 defaults, which
  // is the open question behind Q251.
  // the window this document was given at creation (SPEC §9.0), in minutes —
  // the drip is one edit per tenth of it, which is what the wallet counts down

  let openId = null;
  let pendingId = null;   // the card being opened, while the sequence is running
  const focusId = () => openId ?? pendingId;
  const collapsed = new Set();   // folded-away section indices
  let seqToken = 0;       // supersedes an in-flight open/move/close sequence
  const resolved = new Set();
  const pendingJudge = new Set();   // a pair whose judgment is between press and filing (#37)
  // **A vote refused at the press says so on its card** (Q1505, SURFACE Y25):
  // item id → Y25's *That was refused: …*, drawn above the commit row and
  // retired by the next choice on the card (`choose`)
  const refusedSay = new Map();
  const refusedFoot = (s) => (refusedSay.has(s.id)
    ? '<div class="foot refusal" role="alert">' + esc(refusedSay.get(s.id)) + '</div>' : '');

  // ---- the card grammar lives in cards.js now (2026-08-18) ----------------
  // The decision-card machinery was lifted into design/cards.js so the setup
  // surfaces can render cards with this surface's own code instead of
  // imitating it. The bodies are unchanged — the seam is the env bag below,
  // every key a function read at call time (topUrgentId is a reassigned let,
  // chilled a mutable Set, laneMode mutable: nothing here may be captured at
  // make() time). The lift is proven by design/tools/session-probe.js against
  // design/reference/: card HTML byte-identical, geometry 0.0px.
  const {
    esc, resultOnly, laneHtml, stripTags, pct, plainLabel, URG_LO, URG_HI,
    TICK, MARK, DRAWN, mkHtml, markHtml,
    // the drawn glyphs (Q1401): the commit row's buttons, the units in an
    // eyebrow, and the glyphs inside the charter column's own sentences
    glyphHtml, glyphify,
    tokens, diffPieces, markHtml2, MARK_FLOOR, wordingHtml, laneBlocks, mdBlocksHtml,
    originText, mdToHtml, mdStrip, mdLine, readLane,
    laneSeed, laneProposeHtml, laneCtlHtml, laneNameId, laneGroupAttrs, speakerHtml, fieldHtml, fieldOf, groundNote,
    headOnlyHeight, cardBody, COLLAPSE_MS, EXPAND_MS,
    // the abstention clock: the note the rail draws beside a live entry
    // (Q1460 (e)) and the one pass over the page that ticks every note on it,
    // card and rail alike, run from a timer of its own in `init` and never
    // from a render
    abstainNoteHtml, tickAbstain,
  } = window.CARDS;
  // **A power is not held until it has been acknowledged** (Ed, 2026-08-21).
  // The host says whether this reader may propose and may judge; both default
  // open, so a surface that never sets them behaves exactly as before. They
  // are read at call time, never captured — the answer changes the moment an
  // OK is pressed, with no reload and no remount.
  // **A press in progress, visible to the host**, so a poll does not rebuild
  // the surface under a hold. This was once the whole fix for a live
  // proposal never going in; it was one door of three, and the hold itself
  // has since been rebuilt to survive the other two (see the propose hold
  // above `renderDoc`). Worth keeping regardless: nothing should move under
  // a hand mid-gesture, whether or not the gesture would now survive it.
  let holdInFlight = false;
  let MAY_PROPOSE = () => true;
  let MAY_JUDGE = () => true;
  // ✒️ on the Text (R-058, entry 160): does this reader's own hand amend the
  // document? **Defaults false**, so any surface that never sets it behaves
  // exactly as it does today; the page sets it to `mayPenOn('text')`.
  let MAY_PEN = () => false;
  // **Edit mode** (backlog 204, Ed 2026-08-28): the text is always a card with
  // two modes, and the 📝 tab is the door between them. Read mode has no
  // caret and no row; edit mode lifts the column and shows the proposal-row.
  // The host owns the state (it is page-only, provisional, nothing in the
  // log) and lends it here read-at-call-time like the capabilities above.
  // **Defaults true**, so a surface that never sets it is today's always-on
  // column.
  let EDITING = () => true;
  // …and the door into it (Q170): *re-make it here* on a stranded proposal is
  // a way to a caret, so it opens edit mode the way 📝 does (SURFACE K13). A
  // no-op in the fixture, which has no mode to be in.
  let ENTER_EDITING = () => {};
  // …and the way out, for the one act that ends the writing (Q1485 (A), Ed
  // 2026-09-21: *Close, and say so*). Proposing consumes the whole draft, so
  // there is nothing left to write and the lifted column is a room with
  // nobody in it. Deliberately **not** the page's `leaveEditMode`, which
  // closes the open card first: the card has already collapsed by the time
  // this is called, and a second close would animate nothing twice.
  let LEAVE_EDITING = () => {};
  // the sign control (Q770): null means no elective 👤 rung — no control
  let SIGNING = () => null;
  let SIGNER = () => '';
  // **The face the room will see** (K30, backlog 255). `SIGNING` answers only
  // *is there a choice*, which is the control's question; the speaker's is
  // *will a name be attached*, and under `public` it is yes with no choice at
  // all. So the rung itself is read whole, and the viewer as the room would
  // see them — name and picture — beside it. Both default inert: a surface
  // that sets neither draws the sealed disc it always drew.
  let AUTHOR_RUNG = () => null;
  let SIGNER_PERSON = () => null;
  const {
    laneBarHtml, clauseHeadHtml, proposalHtml, commitRowHtml, vinBlockHtml, commitBarHtml, reviseNote,
    laneBoxHtml, draftFaceHtml, collapseCard, expandCard, openCardEls, runOnCards,
    collapseCards, expandCards, stillRef, restoreStill, keepStill,
  } = window.CARDS.make({
    authorRung: () => AUTHOR_RUNG(),
    signerPerson: () => SIGNER_PERSON(),
    mayPropose: () => MAY_PROPOSE(),
    // **CP9 (Q1106): a closed document's judgment cards can never commit, so
    // they show no commit** — Q354 keeps every filed pile openable and Q470
    // says it asks nothing, and a locked card is already exactly that shape:
    // 🗑️ closes and the ✓ is not drawn at all. `MAY_JUDGE` cannot carry this,
    // `canJudge()` being `constitutedAtT !== null` and never having
    // asked about the close — the same omission that had every settled card
    // on a closed page drawing a live motion composer.
    lockedOf: () => !MAY_JUDGE() || docClosed,
    pickOf: (s) => pickOf(s),
    stateOf: (s) => stateOf(s),
    isCast: (s) => isCast(s),
    isJudged: (s) => isJudged(s),
    verdictOf: (s) => verdicts.get(pairKeyOf(s)),
    isTopUrgent: (s) => s.id === topUrgentId,
    isChilled: (id) => chilled.has(id),
    washFor: (s, k) => anchWash(s, true, k),
    ownChip: (s) => ownChipHtml(s),
    currentTextFor: (k) => currentTextFor(k),
    markerFor: (k) => markerFor(k),
    root: () => doc,
    readLine: () => READ_LINE,
    reduced: () => REDUCED(),
    onExpand: () => drawWires(),
  });

  // Always-on typing (Ed, 224): every clause in the charter carries a caret.
  // `plaintext-only` rather than plain `true` because the charter is prose, not
  // a rich-text field — a paste should arrive as words, and there is no
  // formatting in this document for a keystroke to apply.
  // **One editing host for the whole charter, not one per block** (Ed,
  // 2026-08-17: *I still don't seem to be able to select multiple paragraphs*).
  // A native selection cannot leave the `contenteditable` element it began in —
  // a drag stops dead at the boundary — so making every clause its own host
  // made cross-block selection impossible for a *user* while leaving it
  // perfectly possible for a Range built in code, which is exactly how the
  // first build came to be tested green and be wrong.
  //
  // `true` rather than `plaintext-only` because the host now contains block
  // children, and it is safe for the same reason it always was: **every**
  // beforeinput is refused, so the browser never modifies the charter whatever
  // it thinks it is allowed to do.
  // A function rather than a constant since 2026-08-21: **you are not shown an
  // act you cannot take**, and a caret is the offer of one. A reader who may
  // not propose — before the 💡 grant is acknowledged, or on a document whose
  // rules they have not yet accepted — gets prose they can read and select but
  // not type into. The `beforeinput` refusal below stays as the second lock:
  // `contenteditable` is a hint to the browser, never a permission model.
  // …and since backlog 204 the caret is edit mode's alone: in read mode the
  // column is prose you can read and select, and a click there beats the 📝
  // tab (the host's job — `#ridetab`), which is the door in.
  const PROSE = () => '<div class="prose' + (srcMode() ? ' mdsrc' : '') + '" contenteditable="' +
    (MAY_PROPOSE() && EDITING() ? 'true' : 'false') + '" spellcheck="false">';

  // ---- one rendering of a block for reading (Q1294, Ed 2026-09-10) ---------
  // The column renders markdown for reading: `mdLine` draws the inline marks
  // and links the docs.vote addresses, and a bullet block (`line.bullet`,
  // read off a `- ` prefix by the host's `blocksOf` exactly as `# ` makes a
  // heading) takes its class here.
  // **Edit mode is the source, always** (Q1467, Ed 2026-09-19: *I can't edit
  // headings in the text. the #s are not editable*). Until this the marker
  // stood in a `contenteditable="false"` span so the caret offsets stayed
  // offsets into `line.x` — and Chrome will not stand a caret before such a
  // span, so a click on the `#` and Home in a heading both landed at the end
  // of the paragraph above. Now the block *is* its source line, marker and
  // inline marks as ordinary editable text, dimmed but selectable, so a
  // caret offset in a block is an offset into that line and there is nothing
  // to convert. A block keeps its rank while it is edited: the element is
  // still the heading or the bullet it was.
  const srcMode = () => EDITING() && !closedMode;
  const markerOf = (l) => (l.t === 'h' ? '#'.repeat(l.level || 1) + ' ' : l.bullet ? '- ' : '');
  const blockHtml = (l) =>
    (srcMode()
      ? (markerOf(l) ? '<span class="mdmark">' + esc(markerOf(l)) + '</span>' : '') + esc(l.x)
      : mdLine(l.x));
  const bulletCls = (l) => (l.bullet ? ' bullet' : '');

  // ---- gap sites (backlog 204, Q261) ---------------------------------------
  // A **gap** is the place between two clauses, or after the last: key `G<n>`,
  // `n` the line the insertion goes before, so `n === nLines` is the end. The
  // host keys real blocks by line (`L<n>`) or by index (`c<n>` / `h<n>` in the
  // fixture); either way the number is the order, and a gap's own number is
  // read off its neighbour's — never off the next *rendered* block, which
  // skips blank lines the engine still counts.
  const isGapKey = (key) => /^G\d+$/.test(String(key || ''));
  const keyNum = (key) => { const m = /(\d+)$/.exec(String(key || '')); return m ? +m[1] : -1; };
  const gapAfter = (key) => 'G' + (keyNum(key) + 1);
  const gapBefore = (key) => 'G' + keyNum(key);
  // the last real block standing before a gap — where its card renders
  const blockBeforeGap = (key) => {
    const n = keyNum(key);
    let at = -1;
    DOC.forEach((l, i) => { if (!l.gap && l.key && keyNum(l.key) < n) at = i; });
    return at;
  };
  // **A gap site carries its own bookkeeping** (Q1311, Ed 2026-09-10): the
  // gap's key and the block it follows — `insertAfterKey`, null at the very
  // start — live on the *site*, so a patch holding two gaps draws two anchors
  // and two cards. They lived on the draft until this, and a second gap had
  // nowhere to stand. A live item from the host (a race, a crown, a park —
  // `siteOfSpan`) is one site and carries the same two fields on itself, so
  // `gapOf` finds whichever holds a key's gap and `gapHolders` lists every
  // held-open anchor the column draws: one per gap site, one per live item.
  // **…and what that block said** (Q1463): a gap has no wording of its own,
  // so the only thing that can carry it across a text change is the clause it
  // was made after, remembered as it read then. `insertAfterKey` moves with
  // the document; `afterText` never does — it is the gap's origin.
  const gapFields = (key) => {
    const at = blockBeforeGap(key);
    return { gapKey: key, insertAfterKey: at >= 0 ? DOC[at].key : null,
      afterText: at >= 0 ? sourceTextFor(DOC[at].key) : null };
  };
  const gapOf = (s, key) => (s && s.sites ? s.sites.find((x) => x.gapKey === key) || null : s);
  // **A deleted clause's record holds its gap open while it is unread, and
  // leaves the margin once filed** (Q1333): the record stands where the clause
  // stood, asking for its OK; filed, it wants nothing, and there is no clause
  // for a pile of its own — a room's every deletion held open as a grey ✔ for
  // ever would be the closed gutter M13 keeps filed marks off.
  const gapHolders = () => SUGGS.filter((g) => !(g.state === 'sealed' && !isUnread(g))).flatMap((g) => (g.sites
    ? g.sites.filter((x) => x.gapKey).map((x) => ({ g, key: x.gapKey, after: x.insertAfterKey ?? null, site: true }))
    : g.gapKey || g.insertAfterKey ? [{ g, key: g.gapKey ?? null, after: g.insertAfterKey ?? null, site: false }] : []));
  // the head label of a draft on a gap: which gap, in the reader's terms
  const gapLabel = (key) => {
    const at = blockBeforeGap(key);
    if (at < 0) return T.gap.atStart;
    const prev = DOC[at];
    const after = DOC.slice(at + 1).some((l) => !l.gap && l.key);
    if (!after) return T.gap.atEnd;
    const words = String(prev.x || '').trim();
    return T.gap.after(words.length > 40 ? words.slice(0, 40).replace(/\s+\S*$/, '') + '…' : words);
  };

  // The text a suggestion is arguing against, for the quick card's yellow band.
  function currentTextFor(key) {
    const line = DOC.find((l) => l.key === key);
    return line ? line.x : '';
  }
  // …and the same block as the **source line** the engine holds — the marker
  // and the words (Q1403): what a lane is seeded with and what a proposal
  // sends, so a heading's rank is text the member can edit rather than a
  // class the origin re-applies. `markerFor` is the marker alone.
  const markerFor = (key) => { const l = DOC.find((x) => x.key === key); return l ? markerOf(l) : ''; };
  const sourceTextFor = (key) => markerFor(key) + currentTextFor(key);
  // **The head is the whole run** (Q1308, Ed's bot room 2026-09-10): a race
  // whose contested span covers several blocks — a merge, a patch across
  // neighbours — is keyed to every block in the run, and its head showed the
  // first block alone while every candidate ran on into the second. The head
  // reads the run as one piece, as a composer site does (225).
  function runTextFor(s, key) {
    const keys = (s && s.keys) || [];
    // the source lines (Q1406): the head renders blocks, so a run keeps its
    // paragraph breaks and a heading its rank
    if (keys.length < 2 || !keys.includes(key) || keys.some(isGapKey)) return sourceTextFor(key);
    return keys.map(sourceTextFor).filter(Boolean).join('\n');
  }
  // …and the blocks that run is made of, for ✏️ *propose edit* (Q1483): the
  // same run `runTextFor` reads, and a patch site's own. A run of one and a
  // run holding a gap are no run — a gap site's bookkeeping is its own
  // (Q1311) and never merges with the clause beside it.
  function proposeRunFor(s, key) {
    const run = (ks) => (ks && ks.length > 1 && !ks.some(isGapKey) ? ks.slice() : null);
    if (s && s.kind === 'patch') {
      const site = (s.sites || []).find((x) => x.key === key) || (s.sites || [])[0];
      return site ? run(site.keys || [site.key]) : null;
    }
    return run((s && s.keys) || []);
  }
  // the insert head's line: *(no text here)*, whatever stands either side —
  // the eyebrow, *The gap as it stands*, says the rest (Q1379, Ed 2026-09-15;
  // it was Q1308's sentence naming the neighbours in their first words)
  function gapNothing() {
    return window.COPY.grammar.head.noText;      // the head's copy is the card grammar's
  }
  // the head of a card keyed to a clause or to a gap: the run's text, or the
  // gap's own label and sentence
  function headOpts(s, key) {
    if ((s && s.isInsert) || isGapKey(key)) return { text: null, nothing: gapNothing(gapOf(s, key)), label: T.insert.headLabel, key: key };
    return { text: runTextFor(s, key), key: key };
  }

  // Headings form a tree: level 1 parts, level 2 chapters, level 3 sections. A
  // heading owns everything until the next heading of its own level or above, so
  // folding a part takes its chapters and their sections down with it.
  let HEADS;

  // The enclosing chain of a heading, outermost first, excluding itself.
  function ancestorsOf(n) {
    const out = [];
    let want = HEADS[n];
    for (let i = n - 1; i >= 0 && want > 1; i--) {
      if (HEADS[i] < want) { out.unshift(i); want = HEADS[i]; }
    }
    return out;
  }

  const buriedBy = (n) => ancestorsOf(n).some((a) => collapsed.has(a));
  const hiddenSection = (n) => n >= 0 && (collapsed.has(n) || buriedBy(n));

  // The innermost heading a paragraph sits under. The preamble before the first
  // heading belongs to no section and never folds.
  function sectionForKey(key) {
    let sec = -1;
    for (const line of DOC) {
      if (line.t === 'h') sec++;
      if (line.key === key) return sec;
    }
    return -1;
  }

  function suggestionSections(id) {
    const s = SUGGS.find((x) => x.id === id);
    if (!s) return [];
    const keys = [...(s.keys ?? [])];
    // a gap stands in the section of the block before it — each gap site's
    // own (Q1311), or the item's where it is one site
    for (const h of s.sites ? s.sites : [s]) if (h.insertAfterKey) keys.push(h.insertAfterKey);
    if (s.pair) keys.push(...s.pair.map((c) => c.key));      // a diagonal sits in two
    return [...new Set(keys.map(sectionForKey).filter((n) => n >= 0))];
  }

  // "inside" reaches all the way down: a folded part counts what its sections hold.
  const suggestionsInSection = (n) => SUGGS.filter((s) => s.state !== 'sealed' &&
    suggestionSections(s.id).some((m) => m === n || ancestorsOf(m).includes(n))).length;

  function toggleSection(n) {
    if (collapsed.has(n)) {
      collapsed.delete(n);
      autoFolded.delete(n);   // unfolded by hand: stop treating it as ours
    } else {
      collapsed.add(n);
      // don't leave a card open inside something you have just folded away
      if (openId && suggestionSections(openId).includes(n)) openId = null;
    }
    renderToc();
    renderAll();
  }

  // A queue card can point into a folded section — unfold before measuring.
  function expandFor(id) {
    let changed = false;
    for (const n of suggestionSections(id)) {
      // the whole chain, or the section stays buried under a folded part
      for (const a of [...ancestorsOf(n), n]) if (collapsed.delete(a)) changed = true;
    }
    return changed;
  }

  // A patch's sites can be pages apart. While it is open, fold the sections
  // *between* them — never the ones holding a site — so the whole footprint
  // sits on one screen. Tracked apart from `collapsed` so that letting go of
  // the patch restores exactly these and leaves the reader's own folds alone.
  const autoFolded = new Set();

  function restoreAutoFolds() {
    if (!autoFolded.size) return false;
    for (const n of autoFolded) collapsed.delete(n);
    autoFolded.clear();
    return true;
  }

  function foldBetweenSites(id) {
    const secs = suggestionSections(id).sort((a, b) => a - b);
    if (secs.length < 2) return false;
    // never fold a site, nor anything a site lives inside
    const keep = new Set();
    for (const n of secs) { keep.add(n); for (const a of ancestorsOf(n)) keep.add(a); }
    let changed = false;
    for (let n = secs[0] + 1; n < secs[secs.length - 1]; n++) {
      if (keep.has(n) || collapsed.has(n)) continue;   // already folded by hand: not ours to restore
      if (buriedBy(n)) continue;                       // an outer fold already covers it
      collapsed.add(n);
      autoFolded.add(n);
      changed = true;
    }
    return changed;
  }

  function toggleHtml(n, cls) {
    return window.CARDS.secToggleHtml(n, !collapsed.has(n), cls);
  }

  // **One proposal, one tab per place** (Ed, 2026-09-16, the tims-birthday
  // room: *for my whole-document rewrite I now see a blue proposal tab beside
  // every clause. It should only be shown once, against the first clause*).
  // An item made of sites — a proposal of yours, a draft, a patch — stands at
  // each site's **first** block and at no other block the site runs over: one
  // site, one tab, where its card opens (`swallowOpen`, `site.keys[0]`). **And
  // a race or a pair spanning several blocks stands at its first block alone**
  // (Ed, 2026-09-16, closing Q1408's open half: *yes, except with a
  // multi-site patch*) — Q1308's tab at every block of the run is retired; the
  // card still swallows the whole span when it opens.
  // **And a sealed record takes the same rule** (Q1418, Ed 2026-09-17, from
  // the proposal-shapes pass PF3/PF4): Q1408 was written for what is live, so
  // a record over a run of blocks — a split adopted, a heading and its
  // paragraph rewritten — wore a filed tab in every one of those gutters and
  // the run stood under its own open card. A decided question is one question,
  // and stands where its run begins, exactly as the race it came from did.
  // `tabAt` is that one test, asked by every gutter: the live strip
  // (`suggFor`), the filed pile (`filedFor`) and the record's own door
  // (`sealedAt`).
  const tabKeysOf = (s) => (s.sites
    ? s.sites.map((x) => (x.keys ? x.keys[0] : x.key)).filter(Boolean)
    : (s.keys ?? []).slice(0, 1));
  const tabAt = (s, key) => tabKeysOf(s).includes(key);
  function suggFor(key) {
    // Anchors persist while a race is still deciding — a judged suggestion
    // is revisable until it seals or its ground shifts.
    return SUGGS.filter((s) => s.state !== 'sealed' && served(s) &&
      (tabAt(s, key) || (s.pair ?? []).some((c) => c.key === key)));
  }

  const verdicts = new Map();
  let justArrived = null;
  // ---- the pair a judgment is about (Q1200, Q1201, Q1367) ---------------
  // Provisional judgment state — `resolved`, `verdicts`, `picked`,
  // `committed`, the arrival receipt — is about a **pair**, never a race.
  // **One item is one pair** (Q1367, Ed 2026-09-15: *decision cards in rival
  // races show past votes on the card itself, whereas these should be in
  // separate tabs in the stack*): the host builds an item per pair the
  // router dealt you and per pair you have judged, so a race with three
  // pairs is three tabs and three entries, and the card shows the pair it
  // is about and nothing else. The deck (Q1200: one entry re-lighting with
  // the next pair) and the ledger (Q1201: the judged pairs listed beneath)
  // both went with that ruling. Keyed by item id plus the pair's ids where
  // an item carries a pair, and by the id alone where it does not — the
  // fixture's items, the diagonals, the motions — so every reader keeps
  // working through these helpers.
  const pairKey = (id, a, b) => id + ':' + [a, b].sort().join(':');
  // the pair the item is about, and the rail's state
  const frontKeyOf = (g) => (g.card ? pairKey(g.id, g.card.a, g.card.b) : g.id);
  const pairKeyOf = frontKeyOf;
  const activeCardOf = (g) => g.card || null;
  // Decisions have a read state (Ed, 112): one you haven't opened pins itself
  // to the screen, and settles down into a dot at its clause once you have.
  const readSeals = new Set();
  // Which clauses have had their filed pile opened out. Keyed by clause rather
  // than by card, because the pile belongs to the clause and not to whichever
  // decision you happen to be reading it from.
  const filedOpen = new Set();



  // needs-you (white) · still-deciding (blue wash + your verdict) · sealed (green).
  // A card starts in whichever state the fixture gives it, and moves when you act.
  // A proposal of your own is its own state (Ed, 2026-08-16). It is not a
  // question put to you — your preference for it is derived rather than asked
  // for (SPEC §3.3) — and it is not settled either, because you can withdraw
  // it right up until it seals. So it sits outside the judge's ladder
  // altogether, and takes green: colour means you can still act (Ed, 164).
  const stateOf = (g) => g.state === 'sealed' ? 'sealed'
    : g.mine ? 'yours'
    : (g.state === 'deciding' || resolved.has(frontKeyOf(g))) ? 'deciding' : 'needs';
  // judged is about the item's own pair (Q1367): a judged pair is its own
  // item, in state `deciding`, with the verdict it was given as its `pick`
  const isJudged = (g) => stateOf(g) !== 'needs';
  // **A deadlock is not shown until you have paid into it** (Ed, 297/298,
  // 2026-08-17: *force drafters to do all the judging in the race first, and
  // then encourage them to propose alternatives*). Until you have judged, a
  // stuck race is an ordinary 💡 race and asks you for the one thing you can
  // still contribute; only when it has nothing left to ask you does it turn
  // ⚔️ and ask for a draft instead.
  //
  // Which makes deadlock a **personal** state, like ⏳, and finally makes the
  // whole alphabet consistent: a mark says what the document wants *from you*,
  // not what state the machine is in. It is not only clearer, it is better
  // evidence — the judgments this extracts are exactly the ones most likely to
  // unstick the race, and a deadlock declared before the room has finished
  // judging is declared early.
  const stuck = (g) => !!g.deadlocked && isJudged(g);

  // ---- the end of the queue (SPEC §8.3a, Q291b) ------------------------
  // A salience diagonal is not a rate. It is served only where prioritisation
  // is actually needed and only to somebody with nothing else to judge, so in
  // this surface it cannot be a standing rail entry at all — it appears at the
  // end of the queue and nowhere else.
  //
  // **Nothing else to judge** means no live proposal is waiting on you. A
  // deadlocked race does not count: it wants a draft rather than a judgment
  // (SPEC §8.3), so it can sit in the rail all day without being work you can
  // do. Your own proposals and everything already judged are not work either.
  const isDiagonal = (g) => g.kind === 'diagonal';
  // An unserved diagonal is not in the rail *and not in the gutter either*: it
  // has not been put to you, so nothing about it should be on the surface.
  //
  // **Served, not offered** (Ed, 2026-08-17, reversing the offer this was built
  // with a day earlier). The offer needed somewhere to live and the only place
  // for it was the top of the rail, which is the wrong place for anything: the
  // rail is a margin index, and a panel pinned above it is a banner. And the
  // question it asked — *would you like to help prioritise?* — is one nobody
  // benefits from being asked, since the whole reason a diagonal is cheap here
  // is that the member has nothing else to do. So the card simply arrives when
  // the queue empties, like every other card does when it becomes yours to
  // judge.
  const served = (g) => !isDiagonal(g) || g.state === 'deciding' || resolved.has(frontKeyOf(g)) ||
    (nothingToJudge() && liveQuestions() >= ROSTER);
  const judgeable = (g) => stateOf(g) === 'needs' && !isDiagonal(g);
  const nothingToJudge = () => !SUGGS.some(judgeable);
  // The volume gate: as many live **questions** as there are people on the
  // roster, a race counting once — which it does here, because a suggestion in
  // this fixture *is* a question.
  // …and a race is one question however many of its pairs are items (Q1367)
  const liveQuestions = () => new Set(
    SUGGS.filter((g) => stateOf(g) !== 'sealed' && !g.unproposed && !isDiagonal(g))
      .map((g) => g.raceId || g.id)).size;
  // **What pins itself, and why** (Ed, 2026-08-17, in two passes). An adopted
  // decision always pins: the text under your eye moved, which is news whether
  // or not you had anything to do with it. A retired one is not news — somebody
  // proposed, nobody liked it, the charter is exactly as it was — so it does not
  // pin *unless you judged it*, in which case it is not news but it is an
  // **answer you are owed**: you put something in and would otherwise be left
  // wondering what became of it (Ed: *otherwise I'll wonder what happened to
  // it*). A retired race you never touched goes straight to a filed dot — grey
  // ✖, findable, openable, silent.
  //
  // The general rule underneath, worth keeping: **a decision announces itself if
  // it changed the document, or if you are part of why it did not.**
  const youJudged = (g) => !!(verdicts.get(pairKeyOf(g)) || g.verdict);
  // **And you are part of why if one of the wordings was yours** (Q1451, Ed
  // 2026-09-18: *X symbol should be for any kind of proposal you made that was
  // rejected or refused, ordinary or constitutional — you should know the
  // outcome of things you propose*). The rule above held for everybody who put
  // something in *as a judgment*, and an author is never asked to judge their
  // own lone proposal (E13, Q1340) — so the one person whose wording it was
  // read the outcome as a silent grey dot. `mineIn` is the ids of the viewer's
  // own candidates in this record's field, joined from the view by live.js.
  //
  // **One proposal, one acknowledgement.** A wording closed early by Q1440 is
  // told to its author at once, on a card of its own keyed `rec:early:<id>`,
  // and that press acknowledges *that proposal*. So when the race finally ends
  // the full record speaks only for the wordings of mine nobody has answered
  // for yet — while an adoption still announces itself through `carried`,
  // because the charter moved and that is news whatever I proposed.
  const EARLY_SEAL = 'rec:early:';
  const minePending = (g) => (g.mineIn || []).some((id) => !readSeals.has(EARLY_SEAL + id));
  const isUnread = (g) => stateOf(g) === 'sealed' && g.unread &&
    (carried(g) || youJudged(g) || minePending(g)) && !readSeals.has(g.id);

  // Urgency — how much this wants *you* (leverage), not how close it is to
  // resolution (that stays the meter's job). It is carried by the strength of
  // the card's colour (Ed, 105) and, since 2026-08-16, by whether the card is
  // on the screen at all: it decides *which* questions the rail shows, not how
  // much each of them is allowed to say. The ramp's two ends, `URG_LO` and
  // `URG_HI`, are cards.js's, shared with setup.js's band entries.
  // A deadlocked race is not a low-urgency one, it is a *differently* addressed
  // one (Ed, 166): no judgment of yours can move it, so the urgency ramp does
  // not apply, and it says so in its own words.
  // The rail button's own class: `yours` on a proposal of your own, which
  // system.css styles, and nothing otherwise. It used to emit `wants`/`needs`
  // too, which no stylesheet ever read (Q611, 2026-08-22) — the lifecycle is
  // said by the mark and the wash, not by a class on the button.
  const classFor = (g) => (g.mine ? 'yours' : '');
  const tint = (hue, a) => 'rgba(var(--lc-' + hue + '), ' + a.toFixed(3) + ')';
  // Colour says lifecycle (Ed, 162); the wash is still the progress bar it
  // always was, so how far the fill reaches is closeness to resolution — and
  // since Q1362 (c) that is **how far the room has got toward the quorum**:
  // the voters a race has collected over the voters it needs, the one number
  // the room controls. On a needs-you card the strength of the colour is also
  // urgency — one device, three readings. A deadlocked race washes grey: more
  // judgment won't move it (SPEC §8.3), which is the one case where the state
  // is not the whole story.
  //
  // Split into a colour and a fill (Ed, 2026-08-17). It used to be one
  // hard-stopped linear-gradient, which said the same thing but could not be
  // *transitioned*: no browser interpolates between two gradients, so every
  // change of lifecycle hue arrived as a jump. Painted instead as a bar whose
  // width is the fill and whose background-color is the hue, both of which
  // animate — so the wash now moves when it means something has moved.
  const washCol = (hue, u) => tint(hue, u == null ? 0.16 : URG_LO + (URG_HI - URG_LO) * u);
  // **The flame sits above the ramp, not at the top of it** (2026-08-17, making
  // Ed's yellow flame actually work). Dropping 🔥's own hue left it as the
  // deepest yellow in the rail, which sounded sufficient and measured at 0.292
  // against a neighbouring 💡 at 0.280 — a difference nobody can see, and it is
  // not a fixture accident: the flame is usually only *marginally* the most
  // urgent, because someone has to be first among a set of close things.
  //
  // Which is the actual point. 🔥 does not mean *the highest number on the
  // urgency ramp*, it means **the question you are being asked next** — a
  // category, and a ramp cannot express a category. So it takes a fixed value
  // clear of the ramp's ceiling, and the ramp runs underneath it. Same hue,
  // decisively more of it: *hot for actions* applied one level down, where the
  // one action being asked for right now is louder than the ones that can wait.
  const FLAME_A = 0.44;
  const wash = (g, hue, u) => ({
    col: (g && g.id === topUrgentId && hue === 'open') ? tint(hue, FLAME_A) : washCol(hue, u),
    fill: g.pct + '%' });
  // what a wash is *about*: the rail entry, or the clause in the document
  const qKey = (g, e) => 'q:' + g.id + ':' + (e.site ?? '');

  // ---- fading a wash across a re-render --------------------------------
  // The document and the rail are both rebuilt wholesale, so a CSS transition
  // has nothing to run from: the new element is born wearing the new colour.
  // So each washed element is rendered wearing its **previous** colour and
  // carrying the new one in a data attribute; one forced reflow later, the new
  // value is assigned and the transition runs. Keyed by what the wash is
  // *about* rather than by element, which is why a clause and the head of the
  // card that swallows it share one key — opening a card deepens its wash
  // rather than repainting it.
  const WASH_MS = 700;
  const prevWash = new Map();
  // The ground under the whole card, in the same hue as its bar (Ed, 285). The
  // wash is a progress bar, so it stopped where the fill stopped and the rest
  // of the card was white on a white page — the card had no visible extent, and
  // *width* is the one dimension of a rail entry that carries no meaning and so
  // has no excuse for being the one you cannot see. Now the card **is** its
  // colour and the bar reads as how far through that colour you are.
  //
  // Derived from the bar's own colour by swapping its alpha rather than passed
  // in beside it: one source, so a ground can never end up a different hue from
  // the bar above it. The bar is a child box painted over this ground, so it
  // composites — whatever the urgency, the filled part is always the stronger.
  const GROUND_A = 0.06;
  // **Confidences read as percentages** (Ed, 2026-08-17). 0.74 is the number the
  // model holds; 74% is the number a person holds. It also helps the one thing
  // the tooltip has always had to say in words — *this is not a vote share* —
  // because a bare decimal beside a headcount reads more like a share, not less.
  // Rounded to whole percent: the second decimal was never doing anything but
  // suggesting the model is more precise than it is.
  //
  // **Paper on a desk, the mockup** (Q1516 (6), round 3; Ed 2026-09-23: *adjust
  // the colours of the queue cards slightly, to make them stand out better
  // from the desk*): under `?paper=1` a rail entry is a white slip on a grey
  // desk, and at 0.06 its hue barely told it from the desk. So there, and only
  // there, a **queue** wash (keys `q:`, and `set:` for the band's own entries,
  // session-view.html's `entryOf`) takes twice the alpha, ground and bar
  // alike: the bar is still the ground's own colour with its alpha swapped, so
  // the evidence meter keeps its magnitude. The clause washes in the document
  // are not rail entries and keep theirs. Without the switch the factor is 1
  // and every string below is the one it always was.
  // (asked defensively: clock-check evaluates this file with a stub root)
  const rootClasses = document.documentElement && document.documentElement.classList;
  const QUEUE_WASH_K = rootClasses && rootClasses.contains('paper') ? 2 : 1;
  const isQueueWash = (key) => QUEUE_WASH_K !== 1 && /^(q|set):/.test(String(key));
  const groundAOf = (key) => (isQueueWash(key) ? GROUND_A * QUEUE_WASH_K : GROUND_A);
  const scaledCol = (col) => String(col).replace(/([\d.]+)(\s*\)\s*)$/,
    (_, a, tail) => Math.min(1, +a * QUEUE_WASH_K).toFixed(3) + tail);
  const groundOf = (col, key) => String(col).replace(/[\d.]+\s*\)\s*$/, groundAOf(key) + ')');
  function washAttrs(key, col, fill) {
    if (isQueueWash(key)) col = scaledCol(col);
    const from = prevWash.get(key) || { col, fill };
    const varsOf = (w) => '--washcol: ' + w.col + '; --washbg: ' + groundOf(w.col, key) +
      (fill == null ? '' : '; --fill: ' + w.fill);
    return ' data-washkey="' + esc(key) + '" data-wash="' + col + '"' +
      (fill == null ? '' : ' data-fill="' + fill + '"') +
      ' style="' + varsOf(from) + '"';
  }
  function settleWashes() {
    const els = [...document.querySelectorAll('[data-washkey]')];
    if (!els.length) return;
    void document.body.offsetHeight;        // one reflow, so the "from" value is painted
    for (const el of els) {
      if (el.dataset.wash == null) continue;
      el.style.setProperty('--washcol', el.dataset.wash);
      el.style.setProperty('--washbg', groundOf(el.dataset.wash, el.dataset.washkey));
      if (el.dataset.fill != null) el.style.setProperty('--fill', el.dataset.fill);
      prevWash.set(el.dataset.washkey, { col: el.dataset.wash, fill: el.dataset.fill });
    }
  }
  let topUrgentId = null;   // the one card that is never dropped

  // Where in the charter an entry stands. A patch has one per site (Ed, 108);
  // a proposed new section stands in the gap it would fill.
  function docIndexOf(g, siteKey) {
    if (g.insertAfterKey) return DOC.findIndex((l) => l.key === g.insertAfterKey) + 0.5;
    // `docIndexOfKey` reads a gap's own place — half a step after the block
    // before it — so a draft on the gap at the very start sorts above the
    // first clause rather than at findIndex's -1 (backlog 204)
    return docIndexOfKey(siteKey ?? (g.keys ?? [])[0]);
  }

  // What the rail quotes from a suggestion. A race carries one per proposal —
  // the pair you would be served. A patch quotes itself at every site (Ed, 183):
  // now that each entry is titled by its own section it reads as a comment
  // beside that clause rather than as a repeat, and its sites are far enough
  // apart in the charter that you rarely see two at once.
  function teasersFor(g, e) {
    // **A stuck entry says what is stuck, not what people argued** (Ed,
    // 2026-08-17). A teaser is somebody's case for their proposal, which is the
    // right thing to show while the question is *which of these* — and the
    // wrong thing entirely once the question is *can you write a better one*.
    // Quoting two of eight arguments there is picking a side by accident and
    // saying nothing about the state the entry is actually in.
    // A teaser is `{ why, by }` since 2026-09-12 (Ed: *[user avatar]
    // Rationale text*) — the rationale behind its speaker, the disc or the
    // face where the name is attached (`railSpeakerHtml`). The deadlock
    // sentence is nobody's and rides as a plain line (`by: false`).
    if (stuck(g)) return [{ why: T.rail.deadlocked(g.judges ?? 0, g.comparisons ?? 0), plain: true }];
    if (g.kind === 'race') return [g.race && g.race.a, g.race && g.race.b]
      .filter((c) => c && c.rationale).map((c) => ({ why: c.rationale, by: c.by }));
    // A diagonal quotes nothing (Ed, 2026-08-17). A teaser is a *rationale* —
    // somebody's argument for their wording — and a diagonal has none, because
    // nobody proposed anything: it is the surface asking which of two questions
    // deserves the room's time. Its title now says exactly that, and the
    // description it used to quote was the system explaining itself twice.
    if (g.kind === 'diagonal') return [];
    return g.rationale ? [{ why: g.rationale, by: g.by }] : [];
  }
  const teaserHtml = (t) => (t.plain
    ? '<span class="qwhy">' + esc(t.why) + '</span>'
    : window.CARDS.railSpeakerHtml(t.why, t.by));

  function queueEntries() {
    const out = [];
    for (const g of SUGGS) {
      // (A task you have no right to do is not in SUGGS at all — `withheld`,
      // applied at ingest in bindData, so the rail needs no rule of its own.)
      // a patch's entry is titled by the section it stands in, not by the patch
      // as a whole (Ed, 183) — in a margin, the local name is the useful one
      if (g.kind === 'patch') g.sites.forEach((site, i) =>
        out.push({ g, site: site.key, label: site.label, n: i + 1, of: g.sites.length }));
      // A draft of your own is a patch in the making: edit in two places at
      // once and it stands beside both, cabled together, one Propose for the
      // lot (Ed, 232, 237). A site is a *run* of adjacent clauses, because
      // editing across a paragraph break joins them rather than making a second
      // place (Ed, 225) — so the entry stands at the run's first clause.
      // **Except where you are writing it inside another card** (Ed,
      // 2026-08-17). The `deadlock-card` holds its own desk, so a draft started
      // there put a second entry in the rail beside the ⚔️ one, at the same
      // clause, for a proposal nobody else can see yet. The rail entry earns its
      // place on an ordinary draft because it is where you read your rationale
      // back as you type — and on the deadlock card that field is six inches
      // away on the card you are looking at. It appears when you propose, which
      // is when there is something to point at.
      else if (g.kind === 'draft') g.sites.forEach((site, i) => {
        const host = SUGGS.find((x) => x.id === openId);
        if (g.unproposed && host && stuck(host) && (host.keys ?? []).includes(site.keys[0])) return;
        out.push({ g, site: site.keys[0], label: site.label, n: i + 1, of: g.sites.length });
      });
      // A diagonal gets **one** entry, not one per clause (Ed, 2026-08-17). Two
      // entries were the patch grammar borrowed — a patch has one judgment at
      // several places, so standing at each of them is telling you where the
      // work is. A diagonal is one judgment about two *questions*, and neither
      // clause is where it lives; standing at both said "there is something
      // here" twice about a card that is really about the pair. So it stands at
      // the earlier of the two and says what it is asking in its own title.
      // A diagonal is in the rail only once it has actually been served —
      // which SPEC §8.3a allows only at the end of the queue, and only if the
      // member takes the offer (Q291b). Judged ones stay, so the rail still
      // shows what you did.
      else if (!served(g)) continue;
      else if (g.kind === 'diagonal') {
        // named in document order, so the one it stands beside is the one it
        // names first
        const inOrder = g.pair.slice().sort((a, b) =>
          DOC.findIndex((l) => l.key === a.key) - DOC.findIndex((l) => l.key === b.key));
        // The title is set over four lines in the rail (Ed, 284) — `Prioritise:`
        // then a name, then `vs`, then a name — so `prio` carries the two names
        // and `label` stays a flat string for tooltips and anywhere a title has
        // to be one line.
        out.push({ g, site: inOrder[0].key, n: 1, of: 1,
                   prio: [inOrder[0].name, inOrder[1].name],
                   label: 'Prioritise ' + inOrder[0].name + ' vs ' + inOrder[1].name });
      }
      else out.push({ g, site: (g.keys ?? [])[0] ?? null, label: g.qLabel, n: 1, of: 1 });
    }
    return out.sort((a, b) => docIndexOf(a.g, a.site) - docIndexOf(b.g, b.site));
  }

  // Document order, never urgency order (Ed, 104): the rail is an index of the
  // charter's contested points, so it makes no claim about what matters most.
  // Lifecycle marks (Ed, 147–157): where an entry stands in *your* relationship
  // to it, at the top left of every card. Kind (quick/race/patch) stays a word
  // beside it — two marks, two axes.
  // the text-presentation selector: forces a glyph rather than an emoji, which
  // is what lets these take the palette instead of bringing their own
  // **Drawn, not typed** (Ed, 2026-08-17: *I still see the calligraphic check*).
  // He was right and the font was the reason: system-ui has no U+2714, so it
  // falls through to Segoe UI Symbol, where the heavy check mark is a tapered
  // brush stroke. At 34px in a test that reads as a solid tick; at 18px in a
  // gutter chip it is a thin calligraphic squiggle beside a geometric ✖, which
  // is the exact mismatch the pair was chosen to avoid — and it would be a
  // different mismatch on every machine.
  //
  // So the two marks that have to match are **two SVG paths on one stroke
  // width**. They cannot drift, they scale, they take `currentColor` so the
  // lifecycle classes still colour them, and the match is a property of the
  // drawing rather than a hope about a font. ↻ stays a character: it has no
  // partner whose weight it must equal, and no font disagrees about an arrow.
  // **Ed's own pair, for now** (2026-08-17): 👤 for how many weighed in and 👍
  // for the reading of the membership. Drawn line art was tried first — a gauge
  // and a hurdle on the same stroke as ✔ and ✖ — and the honest finding is that
  // at eyebrow size line art does not survive: the gauge read as a caret and the
  // hurdle as a Greek letter. A coloured picture does survive there, so both
  // units are the Fluent Flat drawings since Q1401 (👍 from 2026-09-16, Ed:
  // *👍 should be drawn*), through the one renderer, so the pair is the same
  // picture on every machine. A third unit, ✒️ for the line a reading had to
  // cross, went with the bar (Q1362), and 👍 itself with the reading it
  // stood beside (Q1481, Ed 2026-09-19): 👤 is the one unit left.
  const PEOPLE = '<span class="unit">' + glyphHtml('👤') + '</span>';
  // did anything displace the incumbent?
  const carried = (g) => fieldOf(g).some((c) => c.won);
  // Whatever wants you most keeps its place on the screen whatever else is
  // going on (Ed, 115). Settled before anything draws, because the document's
  // own highlights need it too now (200) and they are rendered first.
  // **❄️ — not this one, not now** (Ed, 2026-08-17, and it is the first design
  // for Skip that puts it anywhere). It is a **toggle on the flame**, not an act
  // on the judgment: nothing is skipped, recirculated or decayed, and no
  // evidence changes. What it says is *stop putting this at the front of my
  // queue*, and it says it by taking the card out of the running for 🔥 — the
  // card drops back to an ordinary 💡 and the next most urgent question takes
  // the flame. Which is exactly what a member means when they want to move on,
  // and it is reversible, because a mood is.
  //
  // That it is a toggle is what earns it a place beside the ✓ rather than a
  // sentence of its own: both are things you do to this card and only one of
  // them is a judgment.
  const chilled = new Set();

  function settleTopUrgent() {
    // 🔥 always means "an ordinary judgment that wants you most", so the two
    // differently-addressed kinds are never it: a stuck race wants a draft and
    // a diagonal wants a ranking, and both say so with their own glyph.
    const live = queueEntries().filter((e) =>
      stateOf(e.g) === 'needs' && !stuck(e.g) && e.g.kind !== 'diagonal' && !chilled.has(e.g.id));
    topUrgentId = live.length
      ? live.reduce((best, e) => ((e.g.urgency ?? 0) > (best.urgency ?? 0) ? e.g : best), live[0].g).id
      : null;
  }

  function renderQueue() {
    const entries = queueEntries();
    let seenTop = false;
    let html = '';
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const g = e.g;
      const st = stateOf(g);

      // **A filed decision is a full-width line like everything else** (Ed,
      // 2026-08-17, retiring the dot rows of 106). Two things were wrong with
      // collapsing them into a shared row of dots. It broke the rail's one rule —
      // *every entry stands beside its own clause* — because a row packed up to
      // eight document positions into one position; and the cable then had to
      // land on a 20px dot inside a row that was not beside the clause it was
      // pointing at, which is the interaction Ed did not like. Space was the
      // argument for the dots, and the rail has since stopped drawing what does
      // not fit, so it was paying for a saving it no longer needs.
      if (st === 'sealed') {
        const d = g.decided || {};
        html += '<li class="qitem" data-q="' + g.id + '" data-site="' + (e.site ?? '') + '">' +
          '<button class="unread' + (isUnread(g) ? '' : ' filed') + '" data-q="' + g.id +
          '" aria-current="' + (openId === g.id) + '"' +
          washAttrs(qKey(g, e), wash(g, anchHue(g) || 'closed').col, wash(g, anchHue(g) || 'closed').fill) +
          ' title="' + esc(d.outcome || 'sealed') +
          (isUnread(g) ? ' — you haven’t opened this one yet' : '') + '">' +
          '<span class="ql">' + markHtml(markKindOf(g)) +
          '<span class="qt">' + esc(plainLabel(e.label || g.qLabel)) + '</span>' +
          '<span class="qv when">' + esc(d.when || '') + '</span></span>' +
          '</button></li>';
        continue;
      }

      // Yours (Ed, 2026-08-16). Two shapes, and the difference between them is
      // the difference between writing and waiting.
      //
      // While it is a **draft** it is a full card, because the rail entry is
      // where you read your own rationale back as you type it — that is what
      // it is for, and Ed asked for it explicitly. It has no fill, because
      // there is nothing yet to be close to: an unproposed draft is not in a
      // race, so the wash is flat rather than a bar at 0%.
      //
      // Once **proposed** it becomes one line. Nothing is being asked of you
      // (SPEC §3.3 counts your preference without asking), so a card explaining
      // itself would be a card with nothing to say — and the fill arrives,
      // which is the whole of the feedback you get on your own proposal
      // (Ed, 227). It stays pinned regardless, because there is always an act
      // available and a significant one: withdraw (Ed, 240).
      if (st === 'yours') {
        const drafting = !!g.unproposed;
        const why = (g.rationale || '').trim();
        const where = e.of > 1
          ? '<span class="qs"><span class="sibn">' + T.rail.placesOf(e.n, e.of) + '</span></span>' : '';
        html +=
          '<li class="qitem" data-q="' + g.id + '" data-site="' + (e.site ?? '') + '">' +
          '<button class="yours' + (drafting ? ' drafting' : '') + '" data-q="' + g.id + '"' +
          ' aria-current="' + (openId === g.id) + '"' +
          // a draft has no fill: there is nothing yet to be close to
          // …and the hue comes from `anchHue`, not from the literal it used
          // to be (Q1484): a stranded proposal of yours is red, and the rail
          // entry, the gutter tab and the card head have to agree about that
          // as they agree about everything else
          washAttrs(qKey(g, e), drafting ? tint(anchHue(g) || 'yours', 0.20) : wash(g, anchHue(g) || 'yours').col,
            drafting ? '100%' : wash(g, anchHue(g) || 'yours').fill) +
          ' title="' + esc(drafting
            ? T.rail.draftTitle
            : (g.cap || T.rail.yoursInRace)) + '">' +
          (drafting
            // ✏️, or ↻ where the text moved out from under a site of it
            // (Q1463): the gutter tab reads `markKindOf` and the rail said
            // `propose` whatever had happened, so the two disagreed
            ? '<span class="ql">' + markHtml(markKindOf(g)) + '<span>' + esc(plainLabel(e.label || g.qLabel)) + '</span></span>' +
              where +
              '<span class="qwhy' + (why ? '' : ' empty') + '">' +
              (why ? esc(why) : T.rail.noReason) + '</span>' +
              ''
            // **✏️ does not say "yours"** (Ed, 2026-08-17). The pencil means *you
            // wrote this* and the entry is the accent blue; a word saying it a third
            // time is the surface reading its own glossary aloud. The place count
            // survives, because it says *which* place and nothing else does.
            // …and the same mark once it is proposed (issue #66): this branch
            // hard-coded ✏️, so a stranded proposal of yours wore ↻ in the
            // gutter and the contents rail and ✏️ here, at the same moment.
            // SURFACE §6 is one alphabet in all three columns.
            : '<span class="ql">' + markHtml(markKindOf(g)) + esc(plainLabel(e.label || g.qLabel)) +
              (e.of > 1 ? '<span class="qv"> · ' + T.rail.placesOf(e.n, e.of) + '</span>' : '') + '</span>' +
              // **and for a few seconds after the press, one sentence** (Q1485
              // (A)): the card has just closed, so without this the whole of
              // the feedback on a proposal is a one-line entry that was
              // already there. It is taken away by `flashProposed`'s patch.
              (proposedFlash === g.id ? '<span class="qwhy qjust">' + esc(T.rail.justProposed) + '</span>' : '')) +
          '</button></li>';
        continue;
      }

      // the receipt is the front pair's: true for the pair you just judged,
      // and false the moment the next pair is the entry's card (Q1200)
      const justJudged = resolved.has(frontKeyOf(g)) && g.state === 'needs';
      const locked = st === 'sealed';
      const verdict = verdicts.get(pairKeyOf(g)) || g.verdict;
      const u = g.urgency ?? 0.5;
      const stateCls = (st === 'deciding' && !stuck(g)) ? 'deciding' : classFor(g);
      // A stuck race says what it is only once it has stopped asking you to
      // judge; before that it carries an ordinary race's caption, because it
      // *is* one until you are through with it.
      // A stuck entry has no caption: its teaser now says the whole thing, and
      // the caption said two thirds of it again in smaller type (2026-08-17).
      // There is no progress to report either — that is what deadlock means.
      const cap = stuck(g) ? ''
        : justJudged ? T.rail.stillDeciding : g.cap;
      const sib = e.of > 1 ? ' sib' : '';

      // A judged entry is one line: label, your verdict, and — if the ground
      // moved under it — a lock mark, with the whole story in the tooltip.
      // Judged entries collapse to one line because nothing is being asked of
      // them. A stuck race is the exception in both directions: you have judged
      // it, and it is now asking for the largest thing on the surface.
      const oneLine = st === 'deciding' && !stuck(g);
      const top = !oneLine && !stuck(g) && g.id === topUrgentId && !seenTop;
      if (top) seenTop = true;
      // **The pile: the rivals still to come on this clause** (`queue-card-stack`,
      // Q1462, Ed 2026-09-18). The engine deals one pair per race at a time
      // (SPEC §8.3, Q1312), so a crowded clause arrives as one entry and says
      // nothing about the queue behind it; the entry is drawn as a pile of
      // cards, **depth alone and capped at five** (three until Ed's note of
      // 2026-09-19) — an edge per rival still to come, no number and no words.
      // It is the tab stack's own convention one column over (M12): edges the
      // entry's own width that peek, inert, carrying the hue and nothing else.
      // **The button keeps its box and the `li` takes the pile's depth** as
      // padding (system.css), so `layoutQueue` stands the entry beneath that
      // much further off and the pile can be seen; the hue goes over whole
      // and the stylesheet mixes it into the ground, opaque, since the edges
      // lie over one another.
      // the hue is read only where there is a pile to colour: a one-line
      // entry's wash has never asked `anchHue` and must not start now
      const pile = (!oneLine && st !== 'sealed') ? Math.min(5, Math.max(0, g.beneath | 0)) : 0;
      const pileHue = pile ? (anchHue(g) || 'open') : null;
      html +=
        '<li class="qitem' + (top ? ' mosturgent' : '') + '" data-q="' + g.id + '" data-site="' + (e.site ?? '') + '"' +
        (pile ? ' data-pile="' + pile + '" style="--pilecol: ' + tint(pileHue, 1) + '"' : '') + '>' +
        '<button class="' + [stateCls, sib.trim(), top ? 'mosturgent' : '',
          oneLine && g.shifted ? 'shifted' : '', justArrived === frontKeyOf(g) ? 'arriving' : '']
          .filter(Boolean).join(' ') +
        '" data-q="' + g.id + '"' +
        (locked ? ' tabindex="-1"' : '') + ' aria-current="' + (openId === g.id) + '"' +
        // **`shifted` is a flag everywhere but here, where it is the story.**
        // Five of its six readers only ask whether it is truthy; this one
        // prints it, and `esc` throws on anything that is not a string — so a
        // caller handing over a boolean took the whole rail down with it, not
        // just this entry (the live path did exactly that, 2026-09-01). The
        // flag is honoured, the story is used when there is one.
        (cap ? ' title="' + esc(typeof g.shifted === 'string' ? g.shifted : cap) + '"' : '') +
        (() => {
          // the hue comes from `anchHue` so the rail entry and the clause it
          // stands beside cannot drift apart — one lifecycle, one colour
          const w = oneLine ? wash(g, g.shifted ? 'closed' : 'deciding')
            : wash(g, anchHue(g) || 'open', stuck(g) ? 0.55 : u);
          // **A diagonal has no progress** (Ed, 2026-08-17). The fill is
          // closeness-to-resolution — how far the room has got toward the
          // quorum — and a diagonal never resolves: salience is a continuous
          // ranking with no floor to meet, which is exactly why it can be
          // advisory. A bar on it was claiming a finish line that does not
          // exist. So it washes flat, for the same reason an unproposed draft
          // does — there is nothing to be close to.
          return washAttrs(qKey(g, e), w.col, isDiagonal(g) ? '100%' : w.fill);
        })() + '>' +
        (oneLine
          // **No verdict on the line** (Ed, 2026-08-17). It quoted the wording you
          // preferred, which on a one-line entry beside a title is six characters and
          // an ellipsis — unreadable, and unreadable text is worse than none, because
          // it looks like something you are failing to read. The mark already says you
          // have judged; the card says what you said, in full, when you open it.
          ? '<span class="ql">' + markHtml(g.shifted ? 'shifted' : 'deciding') +
            esc(plainLabel(e.label || g.qLabel)) + '</span>'
          : '<span class="ql">' +
            markHtml(markKindOf(g)) +
            (e.prio
              // four lines, so the two names can be read against each other
              // rather than colliding and truncating on one (Ed, 284)
              ? '<span class="qprio">Prioritise:<b>' + esc(plainLabel(e.prio[0])) +
                '</b><i>vs</i><b>' + esc(plainLabel(e.prio[1])) + '</b></span>'
              : '<span>' + esc(plainLabel(e.label || g.qLabel)) + '</span>') +
            // **The entry carries the clock too, in the last day** (Q1460
            // (e), Ed 2026-09-19: *the rail should only show the clock when
            // it's less than 24 hrs*). A vote you have not cast can hide
            // behind an unopened card, so the entry says when silence here
            // will be counted — the glyph and the figures, and nothing else,
            // because the sentence is on the card the entry opens. The
            // twenty-four hours is the renderer's own rule (`rail`), so the
            // rail is quiet on anything further off; a passed moment reads
            // *abstained* here as it does there. An entry with no live
            // deadline carries none: a pair this seat has answered, a race
            // it cannot vote on, 💤 at *never*.
            abstainNoteHtml(g.abstainAt, 'rail') + '</span>' +
            // No kind chip and no "copy edit"/"3 proposals racing" line (Ed,
            // 184): both restated in words what the card's own shape already
            // shows — one teaser is a suggestion, two divided teasers are a
            // race, a place count is a patch. Only the place count survives,
            // because it says *which* place, which nothing else does.
            (e.of > 1
              ? '<span class="qs"><span class="sibn">' + e.n + ' of ' + e.of +
                (g.kind === 'diagonal' ? ' questions' : ' places') + '</span></span>'
              : '') +
            // Every open card says its whole piece now. It used to depend on
            // the card's tier, which meant the least urgent said nothing at all
            // and you had to open it to find out what it was.
            // **No progress caption** (Ed, 2026-08-17: *💡 doesn't need to say how
            // many left to decide*). Every open card carried one — *gathering, needs
            // roughly 4 more judgments* — which is the `evidence-meter` restated in
            // words directly above the bar that already draws it. Two devices, one
            // magnitude, and the words on every card. It survives as the entry's
            // tooltip, where it costs nothing and answers the reader who wants the
            // number the bar is only showing them.
            // **The flame carries no rationale — while it is following you**
            // (Ed, 2026-08-17, in two passes). Every other entry's teaser is
            // doing a job: it is what makes you decide whether this is the one to
            // open. 🔥 has already been decided *for* you — the mark and the hue
            // are what get it your attention, not the argument inside it — so
            // while the flame is piled against the band edge, miles from the
            // clause it belongs to, the teaser is answering a question nobody is
            // asking.
            //
            // But that is a fact about being **pinned**, not about being the
            // flame. Scroll to its own clause and it is standing in the margin
            // beside the text it is about, among neighbours that all carry
            // theirs — *then it is an ordinary 💡* (Ed), and reading as the odd
            // one out is the opposite of what dropping the teaser was for.
            //
            // So the teaser is always here, and `layoutQueue` hides it for the
            // one case: the flame, with its clause off screen. That test is on
            // the **anchor's** position rather than on where the entry landed,
            // which is what keeps it from oscillating — showing a teaser makes
            // the entry taller, and a rule that read the entry's own position
            // could hide what it had just shown.
            teasersFor(g, e).map(teaserHtml).join('')) +
        '</button></li>';
    }
    extraMeta = new Map();
    if (extra && extra.entries) {
      for (const x of extra.entries()) { extraMeta.set(x.id, x); html += x.html; }
    }
    queueEl.innerHTML = html;
    justArrived = null;
    // Everything in the rail opens, sealed dots included (Ed, 112): a locked
    // judgment can't be changed, but it can always be read.
    queueEl.querySelectorAll('button[data-q]').forEach((b) =>
      b.addEventListener('click', () => { toggle(b.dataset.q, true); })
    );
    layoutQueue();
  }

  // The heading a folded-away clause hides behind, so its entry still has
  // somewhere to stand.
  function foldedHeadingFor(idx) {
    let n = -1;
    for (let i = 0; i < idx; i++) if (DOC[i].t === 'h') n++;
    if (n < 0) return null;
    let target = collapsed.has(n) ? n : null;
    for (const a of ancestorsOf(n)) if (collapsed.has(a)) { target = a; break; }
    return target === null ? null : document.getElementById('sec-' + target);
  }

  // A rail entry may stand for several judgments — a row of sealed dots — so
  // "is this the open one" is a question about the buttons inside it.
  const holdsFocus = (el) => (!!focusId() && !!el.querySelector('button[data-q="' + focusId() + '"]')) ||
    (!!extra && !!extra.isOpen && extraMeta.has(el.dataset.q) && extra.isOpen(el.dataset.q));

  function anchorForEntry(id, siteKey) {
    const g = SUGGS.find((x) => x.id === id);
    if (!g && extraMeta.has(id)) return extraMeta.get(id).anchor() || null;
    if (!g) return null;
    // a gap draft hangs on its own held-open anchor, including the one at the
    // very start of the column, whose `insertAfterKey` is null (backlog 204)
    // — **each gap site on its own** (Q1311): a draft's anchors carry the
    // site's key, a live item's one anchor carries none
    // — and an open gap card stands where its anchor stood (Q1379)
    if (g.sites) {
      if (isGapKey(siteKey)) return doc.querySelector('.insert-anchor[data-anchor="' + id + '"][data-site="' + siteKey + '"]') ||
        doc.querySelector('.sugg[data-card="' + id + '"][data-site="' + siteKey + '"]');
    } else if (g.insertAfterKey || g.gapKey) return doc.querySelector('.insert-anchor[data-anchor="' + id + '"]') ||
      doc.querySelector('.sugg[data-card="' + id + '"]');
    const k = siteKey || (g.keys ?? [])[0] || (g.pair && g.pair[0].key);
    // The entry has to stand where its wire lands (Ed, 264): while the composer
    // is open the clause is a card, and a rail entry levelled against the
    // *clause inside* it would sit eighty pixels below where its own cable
    // leaves. One target for both.
    // Any card that has swallowed its clause is the target, not the clause
    // inside it — the composer was the first case, and in `stacked` every open
    // card is one. A rail entry levelled against the head *inside* the card
    // would sit below where its own cable leaves.
    const swallowed = doc.querySelector('.sugg[data-site="' + k + '"]');
    if (swallowed) return swallowed;
    return doc.querySelector('[data-key="' + k + '"]') || foldedHeadingFor(DOC.findIndex((l) => l.key === k));
  }

  // Lay the rail out as a margin — but never let work walk off the screen
  // (Ed, 110). Two populations share the column:
  //
  //   pinned  — work that still needs you *and has something to say about
  //             itself*. Each wants its clause's height and takes it while the
  //             clause is in view; once the clause leaves the screen the card
  //             holds at the edge it left by, so the set on screen is always a
  //             contiguous run of the charter around where you are reading.
  //             What will not fit is dropped, and counted.
  //   flow    — judged lines, sealed dots, and the coolest questions. These stay
  //             with their clauses and scroll away, because they are a map of
  //             the ground rather than a claim on your attention.
  //
  // A flow entry that would end up underneath a pinned card is hidden rather
  // than nudged: nudging makes the whole rail crawl as you scroll.
  const QGAP = 8, BAND_TOP = 70, BAND_BOT = 24;
  // **At most three unacknowledged decisions pin at once, oldest first** (Q113,
  // Ed 2026-09-14). A pinned entry is exempt from the fit cap and hides any flow
  // entry that would fall underneath it, so the one population that nothing
  // expires — a decision owed you an OK — was the one that could crowd the
  // margin out on its own: come back after a long absence and the rail is a wall
  // of green ticks with the document's live work hidden behind it. The cap is on
  // *pinning*, not on the entries: the fourth owed decision and every one after
  // it stands at its own clause as an ordinary green entry, shown when it fits,
  // scrolling with the text, opening and taking its OK exactly as a pinned one
  // does. Each OK pins the next oldest. Nothing announces the count — an
  // "and n more" line would be the tally 2026-08-17 retired, an apology for a
  // limit nobody experiences as one.
  const NEWS_PIN_CAP = 3;
  // A deadlocked race ranks above every ordinary question (Ed, 223). It can
  // out-rank the flame in the *order*, which costs nothing: the flame is kept
  // regardless of room, so its primacy rests on the exemption rather than on
  // where it sits in the sort.
  const DEADLOCK_FLOOR = 0.9;
  const DIAGONAL_FLOOR = 0.75;
  // Pulled out of `layoutQueue` so the **gutter stack and the rail share one
  // comparator** (Ed, 2026-08-17). They must: they are two columns annotating
  // the same clause, and whichever decision the gutter would open is the one the
  // rail should show. When the rail first got this tiebreak they disagreed
  // immediately — the rail promoted the more urgent of two 💡 at § Bringing a
  // Guest while the gutter's front tab was still whichever came first in the
  // fixture — and a duplicated formula would have gone on disagreeing quietly
  // every time either end was touched.
  const leverage = (g) => (isUnread(g) ? 0.5
    : stuck(g) ? DEADLOCK_FLOOR + (1 - DEADLOCK_FLOOR) * (g.bounty ?? 0.5)
    : g.kind === 'diagonal' ? Math.max(g.urgency ?? 0, DIAGONAL_FLOOR)
    : (g.urgency ?? 0));

  function layoutQueue() {
    // **Narrow is a mode, not a stylesheet** (design/MOBILE.md §1.0, §1.3;
    // the first cut, 2026-09-12): below `NARROW_Q` the rail is a drawer, and
    // *beside its clause* has no meaning there — so nothing is positioned.
    // The wide layout's absolute tops would put each entry at a large
    // negative offset here, `aside.queue` sitting below `main`.
    //
    // **The drawer holds only what asks something of you** (Q1351, Ed
    // 2026-09-12): the same four pinning kinds as the wide rail's — 🔥, an
    // unread ✔✖ owed to you, ✏️ yours, 🌶️ served — plus whatever is open,
    // most urgent first. The first cut listed every entry with a clause, and
    // on a real document that was forty grey filed rows between the six hot
    // ones: a list cannot say *where*, so the filed population, whose whole
    // claim is a position, belongs to the gutter tabs alone on a phone. The
    // door's number is the drawer's length, and means the same thing.
    //
    // **`NEWS_PIN_CAP` does not reach the drawer** (Q113, Ed 2026-09-14). The
    // cap is a rule about *pinning*, and pinning is a wide-margin fact: it buys
    // exemption from the fit cap and hides the flow underneath. A drawer has
    // neither — it is an ordered list that scrolls — so capping here would not
    // demote a fourth owed decision to a flow position, there being none; it
    // would delete it from the one place a phone lists what asks something of
    // you, and an OK you are owed asks something of you.
    if (NARROW()) {
      const navH = (document.querySelector('.navbar') || {}).offsetHeight || BAND_TOP;
      const rows = [];
      for (const el of queueEl.children) {
        const a = anchorForEntry(el.dataset.q, el.dataset.site);
        el.style.top = '';
        el.style.order = '';
        el.classList.remove('pinned');
        if (!a) { el.style.display = 'none'; continue; }
        const g = SUGGS.find((x) => x.id === el.dataset.q);
        const x = !g && extraMeta.has(el.dataset.q) ? extraMeta.get(el.dataset.q) : null;
        const kind = g ? markKindOf(g) : null;
        // **↻ is in the drawer too** (Q1484 (c), the nh2026 convention
        // 2026-09-20). The wide rail's own list (`live`, below) has carried
        // `stranded` since it existed — SURFACE §6's *pins: yes* — and this
        // one never did, so on a phone a proposal the text moved out from
        // under was in the one place that lists what asks something of you
        // and in the door's count, and in neither. A stranded proposal wants
        // an act of yours, which is the whole admission rule here.
        const live = holdsFocus(el) || (x ? !!x.pinned
          : g ? (kind === 'urgent' || kind === 'propose' || kind === 'stranded' ||
            kind === 'weigh' || isUnread(g)) : false);
        if (!live) { el.style.display = 'none'; continue; }
        el.style.display = '';
        const ay = a.getBoundingClientRect().top;
        el.classList.toggle('offclause', ay < navH + 12 || ay > innerHeight - BAND_BOT);
        rows.push({ el, want: ay + scrollY, u: x ? (x.u ?? 0) : leverage(g), open: holdsFocus(el) });
      }
      rows.sort((p, q) => (q.open - p.open) || (q.u - p.u) || (p.want - q.want));
      rows.forEach((r, i) => { r.el.style.order = String(i); });
      queueEl.style.height = '';
      // the right-hand door wears the count (the drawer is the page's, so
      // the page may not have one), red while it is more than nothing
      const badge = document.getElementById('drawercount');
      if (badge) badge.textContent = String(rows.length);
      const door = document.getElementById('drawerright');
      if (door) door.classList.toggle('asks', rows.length > 0);
      return;
    }
    const railRect = queueEl.getBoundingClientRect();
    const railTop = railRect.top + scrollY;
    const pinned = [], flow = [];
    // The owed queue's own order (Q113). Neither population carries a settle
    // time the page can sort on — a record's `when` is already a sentence by the
    // time it reaches here, and a setting's owed OK is a bare id in a set — but
    // both arrive in the order they were owed: the view lists its records in log
    // order, and `extra` lists the band's settings in the founding order they
    // were settled in. So the queue is that arrival order, `i`, with the band's
    // ahead of the charter's, `fam`: every setting a member is owed was decided
    // by the founding or by a motion on the constitution, and the heaviest pile
    // of all — one OK for every delegated question, all landing at the settle —
    // is the band's, standing before the document has a record to its name.
    let idx = -1;
    for (const el of queueEl.children) {
      idx++;
      const a = anchorForEntry(el.dataset.q, el.dataset.site);
      if (!a) { el.style.display = 'none'; continue; }
      el.style.display = '';
      const g = SUGGS.find((x) => x.id === el.dataset.q);
      if (!g && extraMeta.has(el.dataset.q)) {
        const x = extraMeta.get(el.dataset.q);
        const ay0 = a.getBoundingClientRect().top;
        el.classList.toggle('offclause', ay0 < BAND_TOP || ay0 > innerHeight - BAND_BOT);
        const row = { el, want: (a.getBoundingClientRect().top + scrollY) - railTop, h: el.offsetHeight,
          mine: !!x.mine, u: x.u ?? 0, rank: x.rank ?? 0, news: !!x.news, fam: 0, i: idx };
        ((x.pinned || holdsFocus(el)) ? pinned : flow).push(row);
        continue;
      }
      // Is this entry on screen **in its own right** — that is, would it be here
      // even if it were not pinned? It would exactly when its clause is inside
      // the band the rail lays out in. Only the flame reads this (see the teaser
      // in `renderQueue`), and it is set before `offsetHeight` below, so the
      // layout measures the height the entry is actually about to have.
      const ay = a.getBoundingClientRect().top;
      el.classList.toggle('offclause', ay < BAND_TOP || ay > innerHeight - BAND_BOT);
      const row = { el, want: (a.getBoundingClientRect().top + scrollY) - railTop, h: el.offsetHeight,
        // The ranking is over **judgment leverage**, so an entry that is not
        // asking for a judgment cannot be ranked on it.
        //
        // An unacknowledged decision is a notification rather than a question,
        // and takes the middle of the scale — competing on equal terms rather
        // than either jumping the queue or sinking out of sight.
        //
        // A **deadlocked** race is the opposite case and took some getting to
        // (Ed, 223). It scores ~0 on urgency because no judgment of yours can
        // move it (SPEC §8.3), so ranking it that way buried the only card
        // whose instructions differ from every other. But it is not a low-value
        // entry at all: judgment leverage there is nil precisely because
        // *drafting* leverage is the highest available anywhere on the surface.
        // The scale was measuring the wrong act. It is ranked instead by its
        // bounty score — resolvable disagreement × salience, which engine-core
        // already computes for the bounty board (SPEC §6.2) — mapped to the top
        // of the range, so the most valuable stuck race stands near the flame,
        // several of them queue among themselves in the order the bounty board
        // would give, and the rail and the board agree with each other.
        // A proposal of your own is not ranked at all: it is force-kept below,
        // on the same grounds as the flame and the open card.
        // A `salience-diagonal` has the same trouble as a deadlocked race, from
        // the other end (Ed, 2026-08-17 — "they don't seem to appear"). Its
        // urgency is an ordinary judgment-leverage number, and on a full rail
        // that buried it: measured at 0.44 it sat eighth, one place below the
        // cut, so both of its entries vanished at every scroll position. But
        // what a diagonal buys is not the judgment it collects — it is the
        // *ordering* it fixes for everything else, and it is rare (roughly one
        // card in ten, SPEC §8.3) and cheap to answer. Ranking it by the act it
        // asks for measures the wrong thing, exactly as it did for a stuck
        // race. So it gets a floor: above ordinary questions, below the flame
        // and below the stuck races, which have drafting leverage on top.
        mine: !!g.mine, u: leverage(g) };
      // Whatever is open is pinned for as long as it is open, whatever its
      // state: it is the thing you are looking at, and its wire has to hold.
      // `pendingId` counts as open — the document is moved *before* the card
      // is inserted (Ed, 75), so the entry has to be in its final population
      // by then or its wire aims at a position it will not end up in.
      // **Four things pin, and an ordinary question is not one of them** (Ed,
      // 2026-08-17: *there's a load of stuff in the sidebar and it doesn't feel
      // like it relates to what's in front of you when you move around*).
      //
      // Every `needs` entry used to pin, which followed from 110 — *never let
      // work walk off the screen* — and that rule turns out to be right about
      // the wrong population. A rail of pinned questions is a to-do list wearing
      // a margin's clothes: it travels with you, so wherever you are reading,
      // most of what is beside you is about somewhere else, and the one claim
      // the `needs-you-queue` makes — *this entry stands beside its own clause*
      // — is false for nearly every row on screen.
      //
      // What survives is the set of things that are genuinely about you rather
      // than about the document, and each pins for its own reason:
      //   🔥 the one question the surface is asking you to answer next, which is
      //      the whole of what 110 was actually protecting;
      //   ✔✖ a decision you have not acknowledged — it is owed to you, and it
      //      leaves the moment you press OK;
      //   ✏️ a proposal of your own, because the act it carries is withdrawal
      //      and nobody else can do it;
      //   🌶️ a prioritisation, which is served rather than found and would be
      //      absurd to have to scroll to.
      // Everything else stands beside its clause and scrolls with it, which is
      // what a margin index is. Nothing is lost: the document is right there.
      const kind = markKindOf(g);
      // **Entries at one clause compete in the tab stack's order** (Ed,
      // 2026-08-17, closing 309). `want` is a position in the document, and
      // several decisions at one clause all want the same one — so the tie was
      // being broken by fixture order, which meant the rail and the gutter could
      // disagree about which decision at a clause comes first. They should not:
      // they are two columns annotating the same clause, and *whichever the
      // gutter would open, the rail should show*.
      //
      // This is the rail's own admission rule (most urgent first, never a
      // ranking over position) reaching a case it had never had to think about,
      // because until a clause carried twelve decisions no tie was ever tight
      // enough to notice. It is also why the rail needs no pile of its own: it
      // already knew how to choose, it just did not know how to choose *here*.
      row.rank = stackRank(kind);
      row.news = isUnread(g); row.fam = 1; row.i = idx;
      const live = kind === 'urgent' || kind === 'propose' || kind === 'stranded' ||
        kind === 'weigh' || isUnread(g) || holdsFocus(el);
      (live ? pinned : flow).push(row);
    }
    // The cap, applied across both populations as one queue (Q113, Ed
    // 2026-09-14): the oldest `NEWS_PIN_CAP` owed decisions pin, the rest are
    // demoted to the flow, where they stand at their own clauses. Whatever is
    // open pins for being open whatever its state (C6), so an owed decision you
    // have opened from further down the queue keeps its place while it is open —
    // the cap counts it, it simply does not evict it.
    const owed = pinned.filter((r) => r.news).sort((x, y) => x.fam - y.fam || x.i - y.i);
    for (const r of owed.slice(NEWS_PIN_CAP)) {
      if (holdsFocus(r.el)) continue;
      pinned.splice(pinned.indexOf(r), 1);
      flow.push(r);
    }
    // Position, then the tab stack's lifecycle order, then urgency. The third
    // key matters more than it looks: two 💡 at one clause tie on the second,
    // and the rail's own admission rule has always been *most urgent first* —
    // so this is where that rule finally applies, rather than the array order
    // it was quietly falling through to.
    const order = (x, y) => x.want - y.want || x.rank - y.rank || y.u - x.u;
    pinned.sort(order);
    flow.sort(order);

    // the visible band, in the rail's own coordinates
    const bandTop = scrollY + BAND_TOP - railTop;
    const bandBot = scrollY + innerHeight - BAND_BOT - railTop;

    // As many as fit, **most urgent first** (Ed, 2026-08-16).
    //
    // It used to be nearest-your-reading-position first, so what you saw was one
    // unbroken run of the charter. That was the right rule while a card was a
    // line or two and a dozen fitted in the band. Now that every open card
    // carries its argument, only a handful fit — and spending those few on
    // proximity means the question that most wants you can be off the screen
    // while its quieter neighbours sit on it.
    //
    // Note this is a ranking, not a threshold: nothing is ever too unimportant
    // to appear. The rail simply runs out of room, and as the urgent ones are
    // dealt with the next ones down surface behind them. What did not fit is
    // counted, never silently dropped.
    let room = bandBot - bandTop;
    const keep = new Set();
    // Three hold their places however crowded the rail gets: the most urgent
    // card (115); whatever is open — which under a ranking is no longer safe by
    // construction, since you may well have opened something far down the
    // order; and **anything of your own**, draft or proposal (Ed, 240). The
    // last is the same argument as the flame from the other end: the rail
    // admits by *judgment* leverage, and a proposal of yours scores nothing
    // there because it asks for no judgment — yet it is the entry with the
    // largest act still attached to it. A ranking cannot see that, so it is
    // taken out of the ranking rather than given a fictional score.
    for (const r of pinned) {
      if (!r.el.classList.contains('mosturgent') && !holdsFocus(r.el) && !r.mine) continue;
      if (keep.has(r)) continue;
      keep.add(r); room -= r.h + QGAP;
    }
    for (const r of [...pinned].sort((x, y) => y.u - x.u || x.want - y.want)) {
      if (keep.has(r)) continue;
      if (room - r.h - QGAP < 0) break;
      room -= r.h + QGAP;
      keep.add(r);
    }
    let shown = pinned.filter((r) => keep.has(r));
    const drop = (r) => { r.el.style.display = 'none'; };
    pinned.filter((r) => !keep.has(r)).forEach(drop);

    // Settle the pile. Each entry wants its clause's line and takes it where the
    // clause is on screen; where it isn't, the card holds at the edge the clause
    // left by.
    shown.forEach((r) => { r.top = Math.min(Math.max(r.want, bandTop), bandBot - r.h); });

    const k = shown.findIndex((r) => holdsFocus(r.el));
    if (k >= 0) {
      // **The open entry's claim on its clause's line is absolute** (Ed, 222).
      //
      // It used to be a preference that the band could overrule: the pile gave
      // way outward from the open entry, and then a forward pass from the top of
      // the band pushed everything down again to stop it overlapping — which,
      // on a clause late in the charter with a dozen entries above it, shoved
      // the open entry hundreds of pixels below the clause its wire points at.
      // Measured at ~870px at worst. A second scroll used to hide that by
      // dragging the *document* until the two met, and removing that scroll
      // (which is what stopped the page lurching) left the geometry exposed.
      //
      // So the open entry does not move, and the entries that cannot fit around
      // it are **dropped into the count** rather than displacing it. That is a
      // fair trade now for a reason it would not have been before: since the
      // rail admits by urgency, "what did not fit" is already the ordinary,
      // reported outcome rather than an exception — the tally at the foot goes
      // from +15 to +17 and says so. The one oddity to accept is that a
      // higher-ranked entry can be dropped to keep a lower-ranked open one flat,
      // which is right on the grounds that the open card is the thing the reader
      // is actually looking at.
      const open = shown[k];
      const cut = [];
      let lim = open.top - QGAP;
      for (let i = k - 1; i >= 0; i--) {
        const r = shown[i];
        r.top = Math.min(r.top, lim - r.h);
        if (r.top < bandTop) { cut.push(r); continue; }
        lim = r.top - QGAP;
      }
      let cur = open.top + open.h + QGAP;
      for (let i = k + 1; i < shown.length; i++) {
        const r = shown[i];
        r.top = Math.max(r.top, cur);
        if (r.top + r.h > bandBot) { cut.push(r); continue; }
        cur = r.top + r.h + QGAP;
      }
      cut.forEach(drop);
      shown = shown.filter((r) => !cut.includes(r));
    } else {
      // Nothing open: settle from both ends, forward so nothing starts above the
      // band or on top of the entry before it, backward so nothing ends below it.
      let cur = bandTop;
      shown.forEach((r) => { r.top = Math.max(r.top, cur); cur = r.top + r.h + QGAP; });
      let lim = bandBot;
      for (let i = shown.length - 1; i >= 0; i--) {
        shown[i].top = Math.min(shown[i].top, lim - shown[i].h);
        lim = shown[i].top - QGAP;
      }
    }
    shown.forEach((r) => { r.el.classList.add('pinned'); r.el.style.top = Math.round(r.top) + 'px'; });

    // Flow steps around the pinned cards rather than hiding under them (Ed, 112):
    // what was decided is worth seeing. It only gives up when the pinned pile
    // leaves it nowhere within reach — which is when active work has genuinely
    // crowded the rail out.
    const blocks = [];
    for (const [a, b] of shown.map((r) => [r.top, r.top + r.h]).sort((x, y) => x[0] - y[0])) {
      const last = blocks[blocks.length - 1];
      if (last && a <= last[1] + QGAP) last[1] = Math.max(last[1], b);
      else blocks.push([a, b]);
    }
    const clash = (t, h) => blocks.some(([a, b]) => t < b + QGAP && t + h > a - QGAP);
    const freeFor = (want, h) => {
      if (!clash(want, h)) return want;
      const hit = blocks.find(([a, b]) => want < b + QGAP && want + h > a - QGAP);
      for (const c of [hit[0] - QGAP - h, hit[1] + QGAP]) if (!clash(c, h)) return c;
      return null;
    };
    let bottom = 0, prev = -Infinity;
    for (const r of flow) {
      r.el.classList.remove('pinned');
      let t = freeFor(r.want, r.h);
      if (t !== null && t < prev + QGAP) { t = prev + QGAP; if (clash(t, r.h)) t = null; }
      r.el.style.display = t === null ? 'none' : '';
      if (t === null) continue;
      r.el.style.top = Math.round(t) + 'px';
      prev = t + r.h;
      bottom = Math.max(bottom, t + r.h);
    }
    queueEl.style.height = Math.round(bottom + 24) + 'px';
    // The "+n further off in the charter" tally is gone (Ed, 2026-08-17). It
    // came in under 110 — *counted, never silently dropped* — and that rule was
    // right while the rail's admission cap felt like a failure to show
    // everything. It no longer does: the rail is a margin index of a document
    // you can scroll, the entries it cannot fit are a few inches away in the
    // thing they annotate, and a running count of them at the foot was a
    // permanent apology for a limit nobody experiences as one.
  }


  // queue-wire: out of the left edge of the queue card, down (or up) the gutter
  // between the two rails, then left into every place the suggestion touches.
  // The wire is drawn in its own entry's **lifecycle hue** (Ed, 287), which
  // ties the three columns together one degree more tightly: mark, wash and
  // cable all saying the same thing about the same judgment.
  //
  // 198's one-colour rule was about *kind* — kind is not a thing the wire was
  // ever asked to say, and three colours for it competed with the palette.
  // Lifecycle is different: it is what the wash and the mark already say, so
  // the wire agreeing with them adds no vocabulary. And the blue is free to go,
  // because only the open judgment ever draws a wire — its existence already
  // says "this is the open one", which is the whole job the accent was doing.
  //
  // Mixed toward the ink rather than used raw. A hue tuned for a wash at 0.06
  // alpha across a whole card has no business being a 1.5px line on white:
  // --lc-open at full strength is a highlighter yellow that simply does not
  // carry. One mix ratio for every hue, so the rule stays one rule.
  //
  // A filed decision has no hue at all — its clause washes nothing, because the
  // document should look settled — so it takes the grey its own mark and its
  // sealed dot already wear. Falling back to the accent there would have left
  // the blue meaning "filed", which is the one thing it has never meant.
  //
  // **The colour of the queue card, which is a wash over white** (Ed,
  // 2026-08-17). Three versions to get here and the last two are one lesson.
  // The first mixed the hue 28% toward the ink so a 1.5px line would carry —
  // darker than the card it came out of, so it read as a different object. The
  // second took the wash literally and drew it at wash alpha, which is the
  // right colour and the wrong medium: a translucent cable shows the charter
  // through it. The third went fully opaque at full hue, which is the right
  // medium and now the wrong colour — a card at 0.13 alpha *looks* pale, and
  // matching it means matching what the eye sees, not what the token says.
  //
  // So: the card's own composited colour — its wash over the ground, over
  // white — painted **on top of a white cable of the same weight**. Opaque as
  // an object, identical as a colour. `wireUnder` is that underlay.
  //
  // The wash lives on the entry's *button*, which is where `washAttrs` puts it,
  // so the lookup goes to whatever carries `data-washkey` rather than to the
  // row the wire happens to start from. A sealed dot carries none — its grey is
  // a fixed 0.16 in the stylesheet — so that is the fallback, and it matches
  // the dot the wire is leaving exactly.
  //
  // Returned as a **hue and an alpha kept apart**, not as one rgba string (Ed,
  // 2026-08-17: "the ball colour is covering the cable colour so comes out
  // darker"). Painting translucent shapes one over another composites them
  // twice: the cap sat on the end of the run it was capping, so the landing
  // came out at roughly double alpha — and a patch's spine did the same thing
  // to every run it crossed. The colour layer is therefore drawn at *full*
  // strength inside a group carrying the alpha, so the union of every run, cap
  // and spine composites exactly once, however many of them overlap.
  const wireColor = (g, el) => {
    const host = !el ? null
      : (el.dataset && el.dataset.washkey ? el : el.querySelector('[data-washkey]'));
    const raw = host ? getComputedStyle(host).getPropertyValue('--washcol').trim() : '';
    const m = raw.match(/^rgba\((.+?),\s*([\d.]+)\s*\)$/);
    if (!m) return { rgb: 'rgb(var(--lc-' + ((g && anchHue(g)) || 'closed') + '))', a: 0.16 };
    const a = +m[2];
    const ga = groundAOf(host.dataset.washkey);   // the paper's queue ground, else GROUND_A
    return { rgb: 'rgb(' + m[1] + ')', a: +(a + ga * (1 - a)).toFixed(3) };
  };
  const WIRE_UNDER = '#FFFFFF';
  const SVGNS = 'http://www.w3.org/2000/svg';

  // Everywhere in the document this judgment bites. A chip carries the id when
  // several suggestions share a paragraph; the paragraph itself carries it when
  // there is only one, and a settled clause carries it with no chip at all —
  // which is why the chip-only version of this quietly stopped finding sealed
  // decisions, and clicking their dots moved nothing (Ed, 118).
  function wireTargets(id) {
    const chips = [...doc.querySelectorAll('.achip[data-anchor="' + id + '"]')]
      .map((c) => c.closest('p'))
      .filter(Boolean);
    const paras = [...doc.querySelectorAll('p[data-anchor="' + id + '"]')];
    const inserts = [...doc.querySelectorAll('.insert-anchor[data-anchor="' + id + '"]')];
    // While you are writing, the clause *is* the card — the paragraph has been
    // replaced by the two lanes — so the **card** is what the wire lands on
    // (Ed, 264). It used to land on the left-hand lane, on the reasoning that
    // the lane is the original standing in for the clause; but a wire enters
    // from the right, and the left lane's right edge is in the middle of the
    // card, so every cable ran straight through the lane you were typing in and
    // stopped in the gutter between them. A wire says *where this judgment
    // lives*, and while you are writing it lives in the card.
    // …and in `stacked` that is true of every open card, not only the
    // composer's: the paragraph is gone, so the card is where the judgment is.
    const swallowed = [...doc.querySelectorAll('.sugg[data-card="' + id + '"][data-site]')];
    return [...new Set([...chips, ...paras, ...inserts, ...swallowed])];
  }

  // Only the open judgment gets wires. Drawing them on hover made the gutter
  // flicker as the pointer crossed the queue (Ed, 78). Now that entries stand
  // beside their clauses the runs are short; a patch's several entries are also
  // strung together on a spine down the gutter, so one judgment reads as one
  // object however many places it touches (Ed, 108).
  function drawWires() {
    if (!wiresEl) return;
    while (wiresEl.firstChild) wiresEl.removeChild(wiresEl.firstChild);
    // A wire from a dock at the foot of the window to a clause anywhere on
    // the page says nothing (MOBILE.md §1.3): narrow draws none.
    if (NARROW()) return;
    const id = openId ?? pendingId ?? (extra && extra.openId ? extra.openId() : null);
    if (!id) return;
    const s = SUGGS.find((x) => x.id === id) || (extraMeta.has(id) ? null : undefined);
    if (s === undefined) return;
    // Where the wires leave from. A sealed dot shares its row with its
    // neighbours (Ed, 106) and the row carries only the *first* dot's id, so
    // looking for rows alone found nothing for any dot but the lead — click the
    // third dot along and the card opened with no cable to it. Each dot is its
    // own start point, which also has the wire leave the glyph you clicked
    // rather than the left edge of a row of five.
    const starts = [];
    for (const row of queueEl.querySelectorAll('.qitem')) {
      if (row.style.display === 'none') continue;
      const dots = row.querySelectorAll('.sealdot[data-q="' + id + '"]');
      if (dots.length) { for (const d of dots) starts.push({ el: d, site: d.dataset.site }); continue; }
      if (row.dataset.q === id) starts.push({ el: row, site: row.dataset.site });
    }
    if (!starts.length) return;

    const mainR = document.querySelector('main').getBoundingClientRect();
    const color = wireColor(s, starts[0].el);
    // The gutter runs between the two rails, so it is measured from the rail's
    // own edge — a dot sits inset within its row and would pull it rightwards.
    const railX = (starts[0].el.closest('.qitem') || starts[0].el).getBoundingClientRect().left;
    const gx = (mainR.right + railX) / 2;

    // Only the **document** end is capped (Ed, 2026-08-17). A dot at the rail
    // end sat against the card it was leaving and said nothing the card did not
    // already say; at the document end it is a landing mark, which is where the
    // wire is making a claim — *this clause, here* — so that one grew instead.
    // The whole cable is drawn twice — every white run first, then every
    // coloured run on top — rather than each run twice. Painting them in pairs
    // would have a patch's second white run erase the first coloured one where
    // they meet on the spine, which is precisely where they always meet.
    //
    // Each pass goes into its own `<g>`, and the colour pass carries the alpha
    // on the group rather than on the shapes: overlapping translucent shapes
    // composite once that way, so a cap does not darken the run it caps and a
    // spine does not darken the runs it crosses.
    const lines = [], dots = [];
    const dot = (x, y) => dots.push([x, y]);
    const line = (d) => lines.push(d);
    const shapes = (g, col, w) => {
      for (const d of lines) {
        const p = document.createElementNS(SVGNS, 'path');
        p.setAttribute('d', d);
        p.setAttribute('stroke', col);
        if (w) p.setAttribute('stroke-width', w);
        g.appendChild(p);
      }
      for (const [x, y] of dots) {
        const c = document.createElementNS(SVGNS, 'circle');
        c.setAttribute('class', 'cap');
        c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 7);
        c.setAttribute('fill', col);
        g.appendChild(c);
      }
    };
    const paint = (col, alpha) => {
      const g = document.createElementNS(SVGNS, 'g');
      if (alpha != null) { g.setAttribute('class', 'ink'); g.setAttribute('opacity', alpha); }
      shapes(g, col);
      wiresEl.appendChild(g);
      return g;
    };

    // **The cable and the cards cast one shadow between them** (Ed, 2026-08-17:
    // *there's no way to join two things and have them cast a shadow
    // together?*). There is, and it is the right answer — the previous fix
    // pulled the ink back off the cards so nothing could cast onto them, which
    // stopped the artefact by breaking the join.
    //
    // Two joined objects at one height cast the shadow of their **union**: a
    // silhouette with no shadow anywhere inside it. So the cable's shadow is
    // drawn by hand — the same shapes, offset and blurred — and then **clipped
    // to everything that is not a card**. The holes are the cards and rail
    // entries the cable joins, so no shadow can fall inside the union, and the
    // ink goes back to meeting them: the ball centred on the card's edge, the
    // run starting at the entry's.
    //
    // A CSS `filter` on the container could not do this. A filter has no way to
    // be told which of the things underneath it are part of the same object.
    // **Two groups, not one** — the clip on the outer, the offset on the inner.
    // A `clip-path` is resolved in the user space of the element that
    // references it *after* that element's own transform, so putting both on
    // one group moved the holes down with the shadow: the card's hole sat 3px
    // low, and a 3px sliver of shadow survived along the top edge of every card
    // the cable met. Which is exactly what it looked like — fine on a decision
    // card, where the cable arrives well below the top, and plainly wrong on a
    // rail entry, where it arrives at one (Ed, 2026-08-17).
    const shadow = (dy, blur, alpha) => {
      const outer = document.createElementNS(SVGNS, 'g');
      outer.setAttribute('clip-path', 'url(#wire-not-cards)');
      outer.setAttribute('opacity', alpha);
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('filter', 'url(#wire-blur-' + blur + ')');
      g.setAttribute('transform', 'translate(0 ' + dy + ')');
      shapes(g, '#000');
      outer.appendChild(g);
      wiresEl.appendChild(outer);
    };
    // Every card on the surface is punched out, not only the ones this cable
    // joins (Ed, 2026-08-17 — *I can still see a shadow*). The first version
    // holed only the two ends, which is right about the join and wrong about
    // everything else: the rail is a **layer** of cards at one height, and a
    // cable at that height passes several of them on its way down the gutter.
    // A thing does not shadow its own layer, so nothing at card height takes
    // one. What is left falls on the page, which is where a shadow belongs.
    const clipHoles = () => {
      const defs = document.createElementNS(SVGNS, 'defs');
      // `.achip` joined the list when the patch link moved into the chip-gutter
      // (2026-08-17): a `clause-tab` is an object at card height with a contact
      // shadow of its own, and it sits *outside* its card's box, so punching the
      // cards alone left the new cable shadowing every tab it ran between —
      // including the two it joins.
      const boxes = [
        ...document.querySelectorAll('.sugg'),
        ...document.querySelectorAll('.achip'),
        ...queueEl.querySelectorAll('button'),
      ].map((e) => e.getBoundingClientRect()).filter((r) => r.width && r.height);
      // **Overlapping holes have to be merged, not stacked.** The clip is one
      // path with `evenodd`, so two hole rectangles that overlap XOR back to
      // solid in their intersection — the shadow reappears exactly where two
      // objects meet. It never showed until the tab stack, because until then
      // nothing at card height overlapped anything else; a pile of tabs overlaps
      // by 26px of every 30. Union them by bounding box: over-punching where two
      // objects genuinely overlap is right, since a thing does not shadow its
      // own layer whichever of them is on top.
      const merged = [];
      for (const r of boxes) {
        let cur = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        for (let i = merged.length - 1; i >= 0; i--) {
          const m = merged[i];
          if (cur.left < m.right && m.left < cur.right && cur.top < m.bottom && m.top < cur.bottom) {
            cur = {
              left: Math.min(cur.left, m.left), top: Math.min(cur.top, m.top),
              right: Math.max(cur.right, m.right), bottom: Math.max(cur.bottom, m.bottom),
            };
            merged.splice(i, 1);
          }
        }
        merged.push(cur);
      }
      let d = 'M0 0H' + innerWidth + 'V' + innerHeight + 'H0Z';
      for (const r of merged) {
        d += 'M' + r.left + ' ' + r.top + 'H' + r.right + 'V' + r.bottom + 'H' + r.left + 'Z';
      }
      const cp = document.createElementNS(SVGNS, 'clipPath');
      cp.setAttribute('id', 'wire-not-cards');
      cp.setAttribute('clipPathUnits', 'userSpaceOnUse');
      const p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('clip-rule', 'evenodd');
      cp.appendChild(p);
      defs.appendChild(cp);
      for (const b of [1, 3]) {
        const f = document.createElementNS(SVGNS, 'filter');
        f.setAttribute('id', 'wire-blur-' + b);
        const fe = document.createElementNS(SVGNS, 'feGaussianBlur');
        fe.setAttribute('stdDeviation', b);
        f.appendChild(fe);
        defs.appendChild(f);
      }
      wiresEl.appendChild(defs);
    };

    for (const { el, site } of starts) {
      const t = anchorForEntry(id, site);
      if (!t) continue;
      const b = el.getBoundingClientRect();
      const r = t.getBoundingClientRect();
      const sx = b.left, sy = b.top + Math.min(b.height / 2, 18);
      // The wire leaves the entry at its own natural height and arrives at the
      // *same* height on the card, clamped into the card's box (Ed, 2026-08-17
      // — "cables aren't quite aligned"). It used to take a fixed 16px inset at
      // the card end against the entry's 18px, so a wire between two things
      // that layoutQueue had levelled exactly still ran 2px downhill. A card is
      // taller than an entry in every real case, so the clamp almost never
      // bites and the wire is flat by construction rather than by coincidence.
      const tx = r.right;
      const ty = Math.min(Math.max(sy, r.top + 8), Math.max(r.top + 8, r.bottom - 8));
      const down = ty > sy;
      const rad = Math.max(0, Math.min(8, Math.abs(ty - sy) / 2, (sx - gx) / 2, (gx - tx) / 2));
      line('M ' + sx + ' ' + sy +
        ' H ' + (gx + rad) +
        ' Q ' + gx + ' ' + sy + ' ' + gx + ' ' + (sy + (down ? rad : -rad)) +
        ' V ' + (ty + (down ? -rad : rad)) +
        ' Q ' + gx + ' ' + ty + ' ' + (gx - rad) + ' ' + ty +
        ' H ' + tx);
      dot(tx, ty);
    }
    // **A patch is joined at its cards, not in the rail** (Ed, 2026-08-17).
    // The spine used to run down the middle of the gutter, bracketing the runs
    // where they left the rail — which said *these three pointers are one*
    // rather than *these three clauses are one*, and at three sites it read as a
    // bracket rather than as an object. The link now runs down the
    // `chip-gutter`, between the `clause-tab`s of the patch's own cards: it
    // joins the things themselves, in the column where the document says what is
    // happening to it. It is also the only cable on the surface whose two ends
    // are both already marked, so it carries no cap — a landing ball says *this
    // clause, here*, and both of these ends are a tab that has already said it.
    //
    // It leaves each tab by the **side** and curves up or down onto a run just
    // outside the column (Ed, 2026-08-17), which is the same shape every other
    // cable on the surface makes — a stub, a corner, a straight run — and it is
    // what settles the stacking problem outright. Drawn end-to-end between the
    // tabs it had to pick a lane through a clause that stacks several, and the
    // first version ran straight down through the tab below its own; a cable
    // that never enters the column cannot cross anything in it, and it can leave
    // from the patch's own tab rather than from the strip that happens to hold
    // it. Consecutive segments share the run and overlap at each middle tab,
    // which costs nothing — the ink group carries the alpha, so a shape drawn
    // twice is not drawn darker — and gives the middle sites a proper drop off a
    // through-run rather than two cables meeting end to end.
    const tabs = [...doc.querySelectorAll('.sugg[data-card="' + id + '"] .achip.wmark')]
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.width && r.height)
      .sort((a, b) => a.top - b.top);
    if (tabs.length > 1) {
      const bx = Math.min(...tabs.map((r) => r.left)) - 16;
      for (let i = 1; i < tabs.length; i++) {
        const a = tabs[i - 1], b = tabs[i];
        const ay = a.top + a.height / 2, by = b.top + b.height / 2;
        const rad = Math.max(0, Math.min(10, (by - ay) / 2, (a.left - bx) / 2, (b.left - bx) / 2));
        line('M ' + a.left + ' ' + ay +
          ' H ' + (bx + rad) +
          ' Q ' + bx + ' ' + ay + ' ' + bx + ' ' + (ay + rad) +
          ' V ' + (by - rad) +
          ' Q ' + bx + ' ' + by + ' ' + (bx + rad) + ' ' + by +
          ' H ' + b.left);
      }
    }
    // shadow of the union first, then the cable over it
    clipHoles();
    shadow(1, 1, 0.13);
    shadow(3, 3, 0.20);
    paint(WIRE_UNDER, null);
    // **A cable changes colour when its card does** (Ed, 2026-08-17), and by
    // the same means the washes do: the wire is rebuilt from scratch on every
    // draw, so a CSS transition has nothing to run from unless the new shapes
    // are born wearing the **previous** colour and handed the new one after one
    // forced reflow. Keyed by the judgment, so a wire that is simply redrawn at
    // a new scroll position does not re-run the fade.
    const from = prevWire.get(id) || color;
    const ink = paint(from.rgb, from.a);
    if (from.rgb !== color.rgb || from.a !== color.a) {
      void wiresEl.getBoundingClientRect();
      ink.setAttribute('opacity', color.a);
      ink.querySelectorAll('path').forEach((p) => p.setAttribute('stroke', color.rgb));
      ink.querySelectorAll('circle').forEach((c) => c.setAttribute('fill', color.rgb));
    }
    prevWire.set(id, color);
  }
  const prevWire = new Map();



  // What you already said, and that you may still change it. Below the commit
  // row (Ed, 215): it is a note *about* the button you are looking at, and at
  // the top of the card it read as an instruction before you had seen the texts.
  // A **locked** card said the opposite of the truth (found 2026-08-17). Every
  // judged card carried one note — *choosing again replaces your earlier
  // judgment, allowed while the race is still deciding* — including the cards
  // where it is not allowed, whose controls were disabled with no explanation
  // anywhere on them. The one sentence that would have explained it, the ground
  // shift itself, existed only as a `title` on the rail entry.
  // The author's pinned rationale (SPEC §2.6, §3.4) is drawn by `speakerHtml`
  // now — attached to its own proposal, behind a blank disc. `.swhy` survives
  // only on the `salience-diagonal`, where the text under each question is a
  // description of the question rather than somebody's argument for it.

  // Choosing and committing are separate acts (Ed, 88): a click selects, and
  // nothing leaves the card until Submit.
  const picked = new Map();
  // an explicit null means "deselected in this session", which has to outrank
  // the fixture's own pick on a card you have judged before and reopened.
  // A judged pair's item arrives with its verdict pre-selected (Q1201, Q1367)
  // — the view's own record of what you said, as the item's `pick`, until
  // you choose otherwise.
  const pickOf = (s) => (picked.has(pairKeyOf(s)) ? picked.get(pairKeyOf(s)) : (s.pick ?? null));
  // What is actually on the record, as against what is merely selected. The
  // tick reads pressed while the two agree and springs back out the moment you
  // choose something else (Ed, 216) — so a reopened judgment shows plainly that
  // it is already cast, and equally plainly when you have an uncommitted change.
  const committed = new Map();
  const committedOf = (s) => (committed.has(pairKeyOf(s)) ? committed.get(pairKeyOf(s)) : (s.pick ?? null));
  const isCast = (s) => isJudged(s) && pickOf(s) !== null && pickOf(s) === committedOf(s);

  // 197 made the lane itself the button. Retired at Ed's QA of 2026-08-16: the
  // gesture it wanted — click a paragraph of the charter — is the same one the
  // composer now means by *put a caret here* (224), and a whole clause is in
  // any case a very large target for a very precise claim. The choosing moves
  // into a strip at the foot of each text, next to the ✏️ that was already
  // there.
  //
  // What may live in a lane is exactly what is about that lane. Indifference is
  // a judgment about the *pair* (SPEC §3.2) and Submit commits the card, so
  // both stay underneath.

  // Submit appears only once something is chosen (Ed, 202) — a disabled button
  // is a thing you are being told off by; an absent one is simply the next step
  // not having arrived yet.
  //
  // Skip survives only on the one card the surface *insists* on (Ed, 202). Skip
  // exists to say "not this, not now", and everywhere else the rail merely
  // offers — closing a card already says that, and says it more honestly, since
  // SPEC §3.1 makes skipping a non-move anyway. The 🔥 card is the exception
  // because it is exempt from the fit cap and always on screen, so without an
  // escape it would be a nag you cannot dismiss.
  // Writing something *else* — as against editing one of the two texts in front
  // of you, which is what the lane buttons do (Ed, 228). It survives only on a
  // **deadlocked** race, where it is the ask rather than an extra: no judgment
  // can move that race, and what it wants is not a better version of either
  // side but something spanning both (SPEC §6.3, Q168). On an ordinary card two
  // lane buttons are already two routes to the composer and a third would be
  // ink for its own sake.
  //
  // ✏️ on a lane: take *this* wording as your starting point (Ed, 228). A null
  // seed means the clause's own current text, which is what the composer uses
  // by default — so the left-hand lane of a quick card or a patch, which is the
  // current text, needs no seed at all.
  // ---- the card ---------------------------------------------------------

  // A sealed judgment opens like any other — same two lanes, same geometry —
  // but as a record rather than a question (Ed, 112): the text that stood is
  // marked, and the numbers it stood on are stated. Nothing here is clickable.
  /**
   * The Founder's pen amended this clause, and everybody who had no say is
   * told beside the clause it changed (SURFACE E35, Q1034; Ed 2026-08-29,
   * decision D47). **It is news, not a decision**: the document has already
   * moved and nothing is being asked but that you have seen it, so the card
   * takes the green ✔ every settled decision wears while it is unread and the
   * one OK the sealed commit row already draws.
   *
   * Everything `sealedCardHtml` below draws about a *contest* is deliberately
   * absent: no ranking, no scores, no 50% incumbent row, no bar, no judge
   * count, no verdict line. Nothing was judged — there was no race and no
   * threshold — so every one of those would be apparatus about a contest that
   * never ran. What is left is the clause as it now reads, the reason, and
   * the text it replaced.
   *
   * **The founder speaks in their own name** (Ed, 2026-08-22: *the rationale
   * should have the founder's name and avatar on it … even if they have no
   * name or avatar*, which is what `founderSpeaker` already does on the
   * settings side). A ✒️ act is attributed by construction, so this reaches
   * into no anonymity ladder either way — the page hands it the founder as the
   * room sees them, and *The Founder* stands where they have given no name.
   * The **record** is the other half and is unchanged: `amendmentBlocks` names
   * the office, because a record outlives whoever held it.
   */
  function amendmentCardHtml(s) {
    const skey = (s.keys ?? [])[0];
    return (
      '<div class="sugg sealed-open" data-card="' + s.id + '"' +
      (skey ? ' data-site="' + skey + '"' : '') + '>' +
      '<div class="rechead"><span>' + T.record.amended + '</span>' +
      '<span class="sub">' + esc((s.decided || {}).when || '') + '</span></div>' +
      (skey
        ? clauseHeadHtml(s, {
            text: sourceTextFor(skey), key: skey, chips: chipsFor(skey, s.id),
            label: null,
          })
        : '') +
      speakerHtml(s.rationale, undefined, s.by || T.record.founder) +
      // in the same `rsub` vocabulary the record uses for *the text that
      // stood*; silent where the server could not say what stood before
      (s.replaced
        ? '<div class="field"><div class="ranked wasthere">' +
          '<div class="rtag"><span class="rsub">' + T.record.replaced + '</span></div>' +
          '<div class="rtext">' + esc(s.replaced) + '</div></div></div>'
        : '') +
      (isUnread(s)
        ? '<div class="race-mid commitrow"><span></span>' +
          '<button class="btn btn-approve okbtn" data-seen="' + s.id + '"' +
          ' title="' + T.record.okTitle + '">' + T.record.ok + '</button></div>'
        : '') +
      '</div>'
    );
  }

  function sealedCardHtml(s) {
    if (s.amendment) return amendmentCardHtml(s);
    const d = s.decided || {};
    // The Bradley–Terry model that ran the race carries a strength for every
    // candidate, so a sealed race can be ranked outright (Ed, 121) — and the
    // record-builder publishes rankings anyway. §8.3's no-standings rule is
    // about *live* feeds; nothing here can be influenced any more.
    // Everything full width, in order, the adopted one first.
    const field = fieldOf(s);
    const held = !field.some((c) => c.won);
    const yours = verdicts.get(pairKeyOf(s)) || s.verdict;
    // **One list, and the incumbent is in it** (Ed, 2026-08-17: *the list of the
    // whole field, with the winner at the top, and the incumbent clearly
    // marked*). It used to be three bands — the clause at the head, the text it
    // replaced in a band of its own, then the field — which on a clause whose
    // rewrite changed one sentence printed two near-identical paragraphs before
    // the reader reached anything ranked.
    //
    // The incumbent belongs *in* the ranking, and there is a true place for it:
    // every score is the probability that proposal beats the current text, so the
    // current text sits at **50%** by construction. Slotting it there is not a
    // layout convenience — it is the line that says *these two beat what we had
    // and those three did not*, which is the most useful sentence on the card and
    // was nowhere on it before.
    const incumbent = held ? currentTextFor((s.keys ?? [])[0]) : (s.replaced ?? s.optionA ?? null);
    const ranked = field.slice()
      .concat(incumbent ? [{ label: '', text: incumbent, why: null, p: 0.5, incumbent: true }] : [])
      .sort((x, y) => (y.p ?? -1) - (x.p ?? -1));
    // **The bar is said once, not once per proposal** (Ed, 2026-08-17): every
    // block used to carry *against the current text · below the bar of 0.72*,
    // which on a field of five is the same number five times and a sixth in the
    // record below. The axis and the bar moved up to the field label, where they
    // are stated once and govern everything under them.
    //
    // **And the scores line up down the right edge.** They had a line of their
    // own under each rank, so five numbers meant to be compared sat at five
    // different offsets with a paragraph between each pair, while the row above
    // them was half empty. A set of comparable numbers wants a column.
    // The incumbent shows its 50% too, quietly. Without a number in the column
    // it simply sits between two rows and the placement says nothing; with one,
    // the column explains itself — everything above beat the text we had, and
    // everything below did not. It is a construction rather than a measurement,
    // which is what the muted weight is for.
    // The incumbent's 50% was true and unhelpful — a construction dressed as a
    // measurement, in a column of real ones. It says what it *is* instead (Ed,
    // 2026-08-17), which is the thing its position in the column already implies
    // and which nothing else on the card was saying in words.
    // Where it held, the incumbent is the clause at the head and is not previous
    // anything — its label already says it stood, and the slot stays empty.
    // **Every alternative carries its score, as a percentage** (the sealed
    // record's rule; corrected here 2026-08-22, Q611 — this comment used to say
    // the opposite of what the line below does). Each score is the probability
    // that proposal beats the text it was measured on, right-aligned into one
    // column, so the incumbent's 50% is a construction the others are read
    // against: everything above it beat the charter, everything below did not.
    // The five-decimal raw numbers went; the percentage stayed because the
    // column is the comparison the card exists to make.
    //
    // The eyebrow keeps its two, because there the numbers are the point: what
    // the room came to, and what it had to clear.
    const line = (c) => (c.incumbent
      ? (held || und ? '' : '<span class="pline ref">Previous text</span>')
      : c.p == null ? '' : '<span class="pline">' + pct(c.p) + '</span>');
    const skey = (s.keys ?? [])[0];
    // Whichever text is the clause at the head does not print itself again: the
    // winner where it carried, the incumbent where it held. That is the whole of
    // the duplication, and it is the same rule in both directions.
    const atHead = (c) => (c.won || (c.incumbent && held));
    // **The card starts at the top of the field** (Ed, 2026-08-17). There was a
    // clause-head above it labelled *the clause as it now stands*, and then the
    // same text again as the first entry — because on a decided card the top of
    // the ranking **is** the clause: the winner where it carried, the incumbent
    // where it held. Two ways of saying that were one too many, and the head was
    // the one carrying no information the ranking did not already have.
    //
    // So the top entry *is* the head. It keeps the head's machinery — the gutter
    // mark that closes the card, the washed block on the paragraph's own axis,
    // the geometry the opening motion is measured against — and gives up only
    // its label, which becomes the entry's own rank, outcome and score.
    //
    // It also loses its box. A green-bordered panel round the winner was saying
    // *this one* to a reader who could already see it at the top of a ranked
    // list, under a green ✔, at the head of a card (Ed: *remove the box that it
    // is in*).
    // **The head is the clause, and the clause is not always the top of the
    // ranking.** `ranked.slice(1)` assumed it was — true on an adopted card,
    // where the winner both is the clause and leads the field, and false on a
    // retired one the moment a challenger outscores the incumbent without
    // clearing the bar. Then the head printed the clause (it always prints
    // `currentTextFor`), the incumbent printed the same paragraph again as *the
    // text that stood*, and the proposal the eyebrow's own headline number
    // belongs to was dropped off the card altogether. `atHead` had been written
    // for exactly this and never called.
    const top = skey ? ranked.find(atHead) : null;
    // **Where the clause has changed again since** (Q1333), the head is the
    // clause as it stands *now* — which is no longer the top of this ranking
    // — so the top entry prints in the field like everything else: the head
    // keeps its machinery and a line under it says why the two differ.
    const rest = s.changedSince ? ranked : ranked.filter((c) => c !== top);

    // Where the incumbent is in the list its right-hand slot now names it, so the
    // left-hand tag would be saying it twice; where it is at the *head* it kept
    // the clause and there is no previous text to point at, so the label carries
    // the fact and the slot stays empty.
    // **No rank number** (Ed, 2026-08-17). The list is in order, so a numeral on
    // each box was counting the boxes for a reader who can see them — and it made
    // the field look like a leaderboard, when what a record wants to say is *here
    // is everything that was tried, best first*. The score at the right is the
    // one that carries something the ordering does not: how close each came.
    // undecided at the close (Q470): the paragraph at the head is the best
    // wording, not an adoption, and the text that stood is still the text
    const und = !!s.undecided;
    const tag = (c) => (c.incumbent && held ? '<span class="rsub">the text that stood</span>'
      : c.incumbent && und ? '<span class="rsub">the text that stands</span>' : '');
    // the record names an author where the anonymity ladder allows it — and
    // says which rung *this* proposal was made under where the room moved the
    // ladder while the document was open (entry 31, R-050: a proposal keeps
    // the privacy it was made under). Silent where the rungs agree, which is
    // every ordinary record; the words arrive finished from the page.
    const under = (c) => (c.underNote ? '<span class="rsub">' + esc(c.underNote) + '</span>' : '');
    // and where a resolution had a reason somebody gave, it says so: the
    // Founder's refusal under 🛡️ on the Text (R-056), which is the one place
    // an author is told *why* rather than only that the text stood. The words
    // arrive finished from the host — the office is not enough here, since the
    // act is the Founder's own hand.
    const refused = (c) => (c.refusal ? '<span class="rsub">' + esc(c.refusal) + '</span>' : '');
    // the note sits **under a speaker** (SURFACE §9's sealed-record row), so a
    // proposal that carries one draws the speaker even where it has neither a
    // rationale nor a name — an unsigned anonymous-era proposal with an empty
    // reason, whose note would otherwise float under the wording with nothing
    // above it to be *under*.
    const spk = (c) => (c.why || c.by || c.underNote || c.refusal
      ? speakerHtml(c.why, undefined, c.by) + under(c) + refused(c) : '');
    return (
      '<div class="sugg sealed-open" data-card="' + s.id + '"' +
      (skey ? ' data-site="' + skey + '"' : '') + '>' +
      // **A wording closed early carries no eyebrow at all** (Q1451, Ed
      // 2026-09-18). Its author is told at once, while the clause is still
      // racing, and what they may be told is only that their own wording can
      // no longer pass — never how many weighed in, never how far anything
      // got, because the race has not sealed and a live race may not say which
      // way the room is going (SPEC §3.5, SURFACE C12). The server withholds
      // every one of those numbers from the row; the eyebrow goes here so the
      // card cannot print a nought and call it a reading. What is left is the
      // clause at the head, their own wording under it with its rationale and
      // *Rejected — it could no longer pass*, and the OK.
      (s.early ? '' :
      // **The whole record in one line** (Ed, 2026-08-17). It was three places —
      // an eyebrow, a rank label under it, and a record band at the foot — for
      // numbers that belong together: how many weighed in and what they came to.
      // Each gets its unit and they read as one sentence. Quorum and your own
      // verdict move into the tooltip, where they are still there for anybody
      // who wants them and cost no ink.
      // **The comparator went with the bar** (Q1362, 2026-09-15). The line used
      // to end *86% 👍 > 72% ✒️*: two quantities of different kinds — what the
      // membership came to think, and the line that had to be crossed. There is
      // no line to cross, so there is nothing to compare the reading against,
      // and the ✒️ that stood for it here — the one place on the surface where
      // the pen glyph did not mean the Founder's own hand — goes with it.
      // **And the reading went after it** (Q1481, Ed 2026-09-19: *is this
      // percentage still accurate?*). It was the ranking model's confidence
      // that the winner beats the text it replaced — the number the bar was
      // asked about, and since Q1439 the number nothing is asked about: what
      // decides is the count, which the line beneath states in full. A reader
      // took *86% 👍* for a share of voters, which it never was. The
      // percentages on the ranked field below stay: there they order what was
      // tried.
      '<div class="rechead">' +
      '<span>' + (und ? T.record.undecided : T.record.decided) + ' · ' + (d.judges ?? 0) + '/' + ROSTER + PEOPLE + '</span>' +
      '<span class="sub">' + esc(d.when || '') + '</span></div>' +
      // **The counts are printed, not hovered** (Q1452, Ed 2026-09-18: *print the
      // count line on the card*): the sentence was a `title` on the head, which a
      // phone never shows and a mouse only finds by resting — and it is the
      // record's own account of why the outcome was the outcome. Same `rsub`
      // vocabulary as the notes beneath it.
      // **How many preferred it, where the record knows** (Q1439, ruling a):
      // the quorum counts approvals now, so the line carries that count
      // beside the count of everybody who weighed in — `d.approvals` comes
      // from the race record (`RaceView.approvals`, the engine's, through
      // `itemsFromView`), and where it is absent the line reads as it always
      // did. `FLOOR` is the view's own `floor` (set in `setData`), which is
      // per race from the same change.
      // **And how many did not answer in time** (Q1452, Ed 2026-09-18):
      // `d.abstained`, the same road — the decision's own count of the
      // members 💤's period had already taken out of the group, so a
      // proposal that carried on two approvals says so beside a 👥 clause
      // that goes on naming the whole membership. Null where the record
      // carries no number; the copy omits the clause at zero too.
      '<span class="rsub reccounts">' + esc(T.record.counts(d.judges ?? 0, ROSTER, d.floor ?? FLOOR,
        yours ? T.record.youSaid(yours) : T.record.youNever,
        typeof d.approvals === 'number' ? d.approvals : null,
        typeof d.abstained === 'number' ? d.abstained : null)) + '</span>') +
      // **The cap line** (SPEC §4.2, R-051; Q945, Ed 2026-08-27). Where the
      // ranking fit this decision was taken on ran out of its iteration cap,
      // the record says so — one line, in the same `rsub` vocabulary as *the
      // text that stood* and *made under ‹rung›, before the rule changed*,
      // under the eyebrow and above the head. Ed's own sentence from the
      // ruling, verbatim: nothing here may say *fit*, *gradient*,
      // *converged* or *iteration*, and neither number appears (STYLE §1,
      // §2). The decision stands — that is the whole of the ruling, and
      // refusing the batch was the option it rejected.
      (d.capped
        ? '<span class="rsub">' + T.record.capped + '</span>'
        : '') +
      // a deleted clause's record heads with its gap, as a race on a gap does
      // (M19, `headOpts`): the two neighbours named, no text
      (top
        ? clauseHeadHtml(s, Object.assign(headOpts(s, skey), {
            key: skey, chips: chipsFor(skey, s.id), label: null,
          })) +
          // **This clause has changed again since** (Q1333): one line under
          // the head where the clause no longer reads as this record left it,
          // and *removed* where the clause is gone and the head is its gap
          (s.changedSince
            ? '<span class="rsub">' + esc(s.gone ? T.record.gone : T.record.changedSince) + '</span>'
            : spk(top))
        : '') +
      // No label on the rest of the field (Ed, 2026-08-17): the hairline above it
      // already says *and here is everything else*, and the axis those numbers are
      // on is now stated in the eyebrow, in the units themselves.
      (rest.length
        ? '<div class="field">' +
          rest.map((c) => {
            return '<div class="ranked' + (c.incumbent ? ' wasthere' : '') + '">' +
            '<div class="rtag">' + tag(c) + line(c) + '</div>' +
            // read as the clause is (Q1368): a candidate's text is markdown
            '<div class="rtext">' + mdBlocksHtml(null, c.text) + '</div>' +
            // the same blank disc a live card gives it: whoever argued for this is
            // still sealed unless the session's visibility setting says otherwise
            spk(c) + '</div>';
          }).join('') + '</div>'
        : '') +
      // The record band is gone (Ed, 2026-08-17): every number in it is in the
      // eyebrow now, each with its unit, and the two that are not — quorum, and
      // what you said — are in the eyebrow's tooltip, which costs no ink.
      // Reading is not acknowledging (Ed, 114). A decision stays unread — and
      // stays pinned to the screen — until you say you have taken it in.
      (isUnread(s)
        // **Filing it is a commit, so it commits where every other card does**
        // (Ed, 2026-08-17): the right of a bottom row, glyph only, the same
        // object as the judgment row's ✓ and the proposal row's ✏️.
        //
        // The glyph is an **arrow into a tray**, drawn in the same stroke
        // vocabulary as ✔ and ✖. It cannot be a tick: a tick is now the *outcome*
        // mark and a green one would sit two inches from the green ✔ this card is
        // about. And it says what pressing it does — this leaves your margin and
        // goes into the record — rather than *OK*, which says only that you have
        // stopped reading.
        // **A word, not a glyph** (Ed, 2026-08-17). The tray-and-arrow read as
        // *download*, which is the wrong verb entirely — nothing is being taken
        // away, it is being put down. Every other candidate had the same trouble:
        // an archive box says *storage*, an eye says *seen* and not *done*, and
        // there is no glyph in common use for *I have taken this in*. When a set
        // has no member, the word is not a fallback — it is the answer.
        // No *Not filed yet* beside it (Ed, 2026-08-17): the button says what
        // pressing it does, the entry in the rail says it has not been pressed, and
        // a label whose whole job is to be there until you act is a caption for the
        // absence of an act.
        ? '<div class="race-mid commitrow"><span></span>' +
          '<button class="btn btn-approve okbtn" data-seen="' + s.id + '"' +
          ' title="' + T.record.okTitle + '">' + T.record.ok + '</button></div>'
        : '') +
      '</div>'
    );
  }

  // ---- the composer -------------------------------------------------------
  // design/composer.js since refactor Q1352 (i): made here, where the code
  // stood, so its `laneRemark` map is the same object at
  // the same moment it always was. The bag is in three parts, and which
  // part a name is in is a fact about this file, not a style: a value is a
  // name defined by now and never reassigned; a call is one `init` replaces;
  // an accessor is one the page swaps under the surface after load.
  const COMPOSER = window.COMPOSER.make({
    blockBeforeGap, blockHtml, chipsFor, currentTextFor, sourceTextFor, markerFor, drawWires,
    gapAfter, gapBefore, gapFields, gapLabel, headingForKey, isGapKey,
    layoutQueue, lineOf, renderAll, stuck, toggle,
    // this surface's own instance of the card grammar's factory half — the
    // pure half composer.js takes off `window.CARDS` itself
    clauseHeadHtml, draftFaceHtml, keepStill, laneBoxHtml,
    // `init` replaces all five, so none can be captured; `caretPulse` is a
    // `const` below this line and is still in its dead zone as this runs
    MAY_PEN: () => MAY_PEN(), SIGNING: () => SIGNING(), SIGNER: () => SIGNER(),
    AUTHOR_RUNG: () => AUTHOR_RUNG(), SIGNER_PERSON: () => SIGNER_PERSON(),
    caretPulse: () => caretPulse(),
    // the data at every bind, the DOM handle at init, the open card at every
    // press, the wallet at every spend and every drip
    get DOC() { return DOC; },
    get SUGGS() { return SUGGS; },
    get EDIT_RULES() { return EDIT_RULES; },
    get editsHeld() { return editsHeld; },
    get doc() { return doc; },
    get openId() { return openId; },
    // when the next ✏️ lands, as an absolute moment (Q1486 (E)) — a function
    // and not a value, since the composer reads it at every draw
    dripAt: () => dripAtMs(),
  });
  const { DRAFT_ID, draftOf, docIndexOfKey, siteFor, syncDraftKeys,
    dropDraft, dropDraftSite,
    caretRangeIn, selectedBlocks, laneCaret, placeCaret,
    startDraft, startDraftFromTyping, startDraftFromRun,
    laneRemark, syncEditCtl, markSelection,
    commitBtnHtml, proposalRowHtml, proposeCtlTitles, draftRowState, setDraftSigned,
    editCardHtml, mineCardHtml, strandedCardHtml } = COMPOSER;
  let mineSeq = 0;                      // proposing frees the composer for the next draft

  /* **A proposal closes its card and says one sentence** (Q1485 (A), Ed
     2026-09-21: *Close, and say so*; reverses his own *one lifecycle, not two
     screens* of 2026-08-17 for the moment of the press). The card the member
     was writing in collapses onto its clause with the ordinary closing
     animation, edit mode ends where the draft it held has gone — and the only
     thing left saying the proposal is in is the rail entry, which is one line
     naming a heading. So for a few seconds it carries a sentence instead, and
     then settles into the one-line `yours` form it keeps for the rest of its
     life.

     **The sentence is taken away by a patch, never by a render** (the caret
     rule, plan rule 6): five seconds after a press is long enough for the
     member to be typing somewhere else, and a render under that caret would
     take it. `layoutQueue` after it, because the entry's height has changed
     and the rail stands its neighbours off it. */
  const PROPOSED_MS = 5000;
  let proposedFlash = null;             // the id of the entry wearing the sentence
  let proposedTimer = null;
  function flashProposed(id) {
    proposedFlash = id;
    if (proposedTimer) clearTimeout(proposedTimer);
    proposedTimer = setTimeout(() => {
      proposedTimer = null;
      if (proposedFlash !== id) return;
      proposedFlash = null;
      const el = queueEl || document;
      let moved = false;
      el.querySelectorAll('.qjust').forEach((n) => { n.remove(); moved = true; });
      if (moved) layoutQueue();
    }, PROPOSED_MS);
  }

  // The gutter marks belonging to a clause, minus the one whose card we are
  // building. A stacked card replaces its paragraph, so any *other* live
  // suggestion at the same clause would lose its way in — the marks travel up
  // into the head instead.
  // A gutter mark wears its own lifecycle hue as a resting ground, so the chip
  // and the rail's sealed dot are visibly the same object in two columns.
  const chipStyle = (g, extra) => ' style="--chiphue: var(--lc-' + (anchHue(g) || 'closed') + ')' +
    (extra ? '; ' + extra : '') + '"';

  // **The pile is fitted to the gutter it has, not to a constant.** This is the
  // half of Ed's suggestion that makes the collision *structurally* impossible
  // rather than merely rarer: a stack may reach down as far as the next mark in
  // the gutter and no further, so two anchors can never claim the same strip.
  // That is the question 294 could not answer — each `chipcol` is laid out
  // inside its own anchor and knows nothing of the one below — and it is
  // answerable here only because this pass runs over the whole column at once,
  // after layout, which is what the `needs-you-queue` already does when it steps
  // entries around a pinned card.
  //
  // A chipcol's own top does not depend on `--peek` (it is absolutely positioned
  // against its block), so there is no reflow loop: every top is final before
  // the first write.
  function fitStacks() {
    const all = [...doc.querySelectorAll('.chipcol')];
    const tops = all.map((c) => c.getBoundingClientRect().top);
    all.forEach((c, i) => {
      if (!c.classList.contains('stack')) return;
      const n = c.children.length;
      // the next mark down the gutter, whatever block it belongs to
      const next = tops.findIndex((t, j) => j > i && t > tops[i] + 1);
      const avail = next < 0 ? 1e4 : tops[next] - tops[i] - 4;
      // 4px is a sliver you can see; 1.5px is one you can still tell is there.
      // Below that the pile would be claiming a depth it cannot draw, so it
      // stops shrinking and accepts a small overhang — see 308.
      c.style.setProperty('--peek',
        Math.max(1.5, Math.min(4, (avail - 30) / (n - 1))).toFixed(2) + 'px');
    });
  }

  // **The card grows to hold its strip** (Ed, 2026-08-17). A card's height has
  // always come from its content, which was safe while the strip was shorter
  // than anything it could sit beside — open a filed pile of six and it is not.
  // The strip is absolutely positioned in the head, so it never pushes the card
  // and would simply have hung out of the bottom of it.
  //
  // A floor rather than a height: the card is still as tall as it needs to be
  // for what it says, and the strip only ever stops it being shorter than that.
  // No reflow loop, because the strip's own height does not depend on the card's.
  function fitCards() {
    doc.querySelectorAll('.sugg[data-card]').forEach((card) => {
      card.style.minHeight = '';
      const col = card.querySelector('.chipcol');
      if (!col) return;
      const c = card.getBoundingClientRect();
      const need = col.getBoundingClientRect().bottom - c.top + 14;
      if (need > c.height) card.style.minHeight = Math.ceil(need) + 'px';
    });
  }

  // Everything decided at this clause that you have already acknowledged. Note
  // what is *not* in here: a decision that is decided but unread is still asking
  // for its OK, so it stays in the live part of the strip with everything else
  // that wants something. Filed is the state that wants nothing.
  // …and it files at the record's **first** block, never at every block of its
  // run (Q1418) — one decided question, one tab, like the live one it was.
  function filedFor(key) {
    return key ? SUGGS.filter((g) => tabAt(g, key) &&
      stateOf(g) === 'sealed' && !isUnread(g)) : [];
  }

  // The tab of the card you are reading: the same control it was in the gutter,
  // in the same place, so the thing you clicked to open the card is the thing
  // you click to close it.
  const ownChipHtml = (g) =>
    '<span class="achip wmark" role="button" tabindex="0" data-anchor="' + g.id + '"' +
    chipStyle(g) + ' title="' + T.chip.closeThis + '">' + mkHtml(markKindOf(g)) + '</span>';

  const achipHtml = (g, key, o) =>
    '<span class="achip' + (o.inert ? ' behind' : '') + '"' +
    (o.inert ? ' aria-hidden="true"' : ' role="button" tabindex="0"') +
    ' data-anchor="' + g.id + '"' + chipStyle(g, o.z ? 'z-index:' + o.z : '') +
    (o.inert ? '' : ' title="' + esc(plainLabel(g.qLabel)) +
      (g.kind === 'patch'
        ? T.nav.placeOf(g.sites.findIndex((x) => x.key === key) + 1, g.sites.length)
        : '') + (o.title || T.chip.openIt) + '"') +
    '>' + mkHtml(markKindOf(g)) + '</span>';

  // **The filed pile** (Ed, 2026-08-17, answering 294). A card's tab strip lines
  // the live decisions up at full height, and the ones already filed sit at the
  // **bottom of that line, still stacked** — the closed posture, inside a strip
  // that is otherwise open — until you click the pile, when they line up too and
  // the card grows to hold them.
  //
  // Which is the whole idea of the stack applied one level down, and it is what
  // makes the answer to *where does history live* cost nothing: a busy clause
  // shows what is happening at it, with what has happened at it folded into one
  // object underneath, in the one place you are already looking. No history tab,
  // no separate surface, no rule about when a filed mark is allowed to appear.
  //
  // **Newest at the top**, which is the one ordering question a pile of records
  // has and it is settled by the closed state: only the top glyph shows, so the
  // top must be the last thing that happened at this clause. Expanded it then
  // reads down into the past, which is how every record anybody keeps is read.
  // Ranking it by anything other than time would be a claim about which past
  // decision mattered, and nothing here is entitled to make one.
  function filedPileHtml(key, gs0, activeId) {
    const gs = gs0.slice().reverse();
    // **A pile never closes over the card you are reading.** If the active card
    // is one of these, the pile is open and is not a toggle — its box carries no
    // handle, so the only way to shut it is to leave the clause. Anything else
    // would hide the tab that says where you are.
    const holdsActive = gs.some((g) => g.id === activeId);
    const open = filedOpen.has(key) || holdsActive;
    return '<span class="filedpile' + (open ? ' open' : '') + '"' +
      (holdsActive ? '' : ' data-filed="' + key + '"') +
      (open ? '' : ' role="button" tabindex="0" title="' + T.chip.filedPile(gs.length) + '"') + '>' +
      gs.map((g, i) => (g.id === activeId ? ownChipHtml(g) : achipHtml(g, key, {
        inert: !open, z: gs.length - i, title: T.chip.theRecord,
      }))).join('') + '</span>';
  }

  function chipsFor(key, activeId) {
    // Same order as the gutter stack, for the same reason (see `stackOrder`):
    // the card's tab strip is that stack expanded, so the two must not disagree
    // about what sits where. The active card's tab is marked **in place** and
    // never lifted (Ed, 2026-08-17) — see `clauseHeadHtml`.
    const live = stackOrder(key ? suggFor(key) : [])
      .map((g) => (g.id === activeId ? ownChipHtml(g) : achipHtml(g, key, {}))).join('');
    const filed = filedFor(key);
    return live + (filed.length ? filedPileHtml(key, filed, activeId) : '');
  }

  // **What a ground shift actually looks like** (SPEC §4.4, built 2026-08-17).
  // A 🔄 card is not a locked card with a note on it: the whole point is that
  // the text moved *underneath a judgment you already made*, so the card has to
  // show the wording you judged against. Without it the reader is told their
  // comparison is void and shown nothing that would make that make sense.
  //
  // It sits directly under the head, in the same dashed band the sealed record
  // uses for the text a winner displaced — which is the same fact in a different
  // tense: this is a wording the charter no longer holds.
  // ---- the deadlock card -------------------------------------------------
  // **⚔️ is a different card, not a race card with a button on it** (Ed,
  // 2026-08-17). And "replaces the race card" was the wrong way to put it, as
  // Ed pointed out: by the time you see this, the race has nothing left to ask
  // you (§8.3b), so there is no live judgment card here to replace. What was
  // there was a record of pairs you had already decided, with the option to
  // change your mind — which is a thing you can still do, from the same rail
  // entry, and is not what this card is for.
  //
  // **No standings, and therefore no lock** (Ed, 303: *if we don't give
  // numbers, do we still need to lock?* — the question is the design). A card
  // showing the field's *rankings* would be the briefing SPEC §3.5 permits on a
  // race out of the judgment stream, and would have to close your judgments
  // with it: a member who reads the standings and then revises is casting an
  // informed judgment in a blind field, which is the one thing §3.5 exists to
  // prevent. A card showing only the **wordings and their arguments** leaks
  // nothing at all — every candidate text and rationale is already public — so
  // it takes nothing away, needs no warning, and needs no rule. The cheaper
  // card is also the better one.
  //
  // Order is arrival, oldest first: it is the only ordering that is not a
  // ranking, and it happens to be the useful one, because a field of eight is
  // largely a conversation in which each wording answers the ones before it.
  function deadlockCardHtml(s) {
    const key = (s.keys ?? [])[0];
    const cur = runTextFor(s, key);        // the run's text: what a candidate is diffed against (Q1308)
    const field = fieldOf(s);
    const yours = verdicts.get(pairKeyOf(s)) || s.verdict;
    // **The desk is on the card** (Ed, 2026-08-17: *at the bottom we should have
    // a full proposal edit box, with discard and submit buttons*). Which is the
    // move that makes the whole thing make sense: the eight wordings are not a
    // reference you go away from, they are what you write against, so the
    // reading room and the desk are one surface and the field stays on screen
    // above the box while you use it. It is the same `laneBoxHtml` the
    // `editing-card` uses, and the same commit row — 🗑️ at the very left, hold-
    // ✏️ at the very right — so the proposal's lifecycle is the one row it is
    // everywhere else, and the pencil still flies out of the wallet to pay.
    const d = draftOf();
    const site = d && siteFor(d, key);
    const broke = editsHeld < EDIT_RULES.stake;
    return (
      '<div class="sugg dead-open" data-card="' + s.id + '"' +
      (key ? ' data-site="' + key + '"' : '') + '>' +
      // **the head is the whole run** (Q1308's rule, reaching the ⚔️ card at
      // last — Q1487): the field beneath is read against `cur`, which has
      // been the run's text since Q1308, while the head read the first block
      // alone. A card headed *Step 3…* over three wordings that each read
      // lines 22–24 is the *off by one line* Ed saw in the room.
      clauseHeadHtml(s, { text: cur, key: key, chips: chipsFor(key, s.id),
                          label: T.dead.headLabel }) +
      // The card's own voice, and the only place it raises it. On a race card a
      // line like this is a caveat at the foot; here it is the whole point of
      // the card, so it goes at the top and is the first thing read.
      // GONE (Ed, 2026-08-17). The card's own voice band said what the queue
      // entry already says, to a reader who has just clicked that entry: it is
      // the second time in two seconds, and the ⚔️ tab and the desk's own label
      // say it a third and fourth. The card is now the clause, the field and the
      // desk — reference, then work — and nothing on it explains itself.
      // Kept here for the record: the band read "11 of the 14 have judged this
      // and it has not separated. More judging will not decide it."
      // The count folded in (Ed, 2026-08-17: *what purpose is this serving?*).
      // A record band at the foot said what you preferred, how many pairs you
      // judged and how many people had weighed in — the sealed record's shape,
      // carried over without asking what it was for here. Two thirds of it
      // helped nobody write anything. The one part that did is the **weight of
      // evidence**, because it is what makes the claim above it credible: this
      // is stuck, not merely unlooked-at. So it belongs *in* the claim, and the
      // rest is gone.
      '<div class="field"><div class="fieldlab">' + T.dead.fieldLab(field.length) + '</div>' +
      // `result-only`, marked, **with the floor forced off** (Ed, 2026-08-17).
      // Left to itself the floor marks three of the eight and silences the
      // rest, because each of these is far enough from the clause to count as a
      // rewrite (Q92) — so the card that most needs the marking is the one the
      // floor was turning off. The floor exists to stop a *lane* being lit end
      // to end beside its incumbent; here the incumbent is at the head and
      // comparison is the entire purpose of the band.
      //
      // Each carries ✏️ *propose edit* at its foot, as every wording on this
      // surface does — the lane bar minus its radio, since nothing here votes.
      // Which is also the answer to *how do I use all this*: you take whichever
      // came closest and write from it.
      // ✏️ sits **at the foot of the block**, under the reason and to the right
      // — the place a lane bar sits on every other card (Ed, 2026-08-17,
      // reversing his own earlier note and mine). It had gone above the reason on
      // the argument that the control is about the wording rather than about the
      // block; true, and outweighed by the fact that a reader who has learnt
      // where a card puts its controls should not have to learn again here.
      // Consistency across the surface beats local precision inside one card.
      field.map((c, i) =>
        '<div class="propblock">' +
        '<div class="rtext">' + wordingHtml(cur, c.text, true) + '</div>' +
        (c.why ? speakerHtml(c.why) : '') +
        (MAY_PROPOSE()
          ? '<div class="lanebar solo">' + laneProposeHtml(s, 'slate:' + i, key) + '</div>' : '') +
        '</div>').join('') + '</div>' +
      // **The desk is an offer, so it goes rather than greys** (Ed,
      // 2026-08-21). A reader who may not yet propose keeps the whole reading
      // room — the wordings, the rationales, what they said — and simply is
      // not handed a pen. The ask on this card is a draft, and a card cannot
      // ask for one from somebody who cannot give it.
      (MAY_PROPOSE()
        ? '<div class="field bridgedesk"><div class="fieldlab">' +
          glyphify(T.dead.deskLab) + '</div>' +
          '<div class="propblock">' + laneBoxHtml(d, site, site ? null : key) + '</div></div>' +
      // The same row as the editing card's, and it stays the same row: 🗑️ at
      // the very left for the whole of a proposal's life, the commit control at
      // the very right. The ✏️ is greyed until there is something to propose,
      // which is what gives an untouched desk its shape. **🗑️ is never
      // disabled** (Q613, 2026-08-22, the one-bin rule): it is the way out of
      // the card, and with nothing to put back it simply closes it.
          '<div class="race-mid commitrow">' +
          '<button class="btn btn-withdraw glyphbtn" data-act="draft-cancel"' +
          ' title="' + (site ? T.row.discardThis : T.row.closeNothing) + '">' + glyphHtml('🗑️') + '</button>' +
          commitBtnHtml({
            disabled: !(site && !broke),
            title: T.row.holdPropose + T.row.editCost,
            penDisabled: !site,
            penTitle: T.row.amend + T.row.penCost,
          }) +
          '</div>'
        : '') +
      '</div>'
    );
  }

  // **A race waiting behind a park on the same clause** (SURFACE E36, R-100;
  // Ed, 2026-09-09, Q1015): the batch passes it over until the Founder
  // answers a park it overlaps, and every card the race can open says so in
  // one sentence — the quick card and the race card alike. The
  // item carries the sentence itself (`blockedByPark`), read off copy by the
  // page, so this draws it and never words it.
  const parkNote = (s) => (s.blockedByPark
    ? '<p class="setnote">' + glyphify(esc(s.blockedByPark)) + '</p>' : '');
  function suggCardHtml(s, siteKey) {
    if (stateOf(s) === 'sealed') return sealedCardHtml(s);
    if (stuck(s)) return deadlockCardHtml(s);
    if (s.kind === 'draft') {
      const site = (siteKey && siteFor(s, siteKey)) || s.sites[0];
      // three readings of one object: not proposed yet, in, and **stranded** —
      // proposed, then left behind by a text change the engine could not carry
      // it across (Q170, SURFACE E38). The third is the second plus a sentence
      // and a different pair of acts; the order matters, since a stranded
      // proposal is never `unproposed`.
      // …and since Q1463 a **fourth**: a draft not proposed yet that the text
      // moved out from under. It is the first reading, not the third — there
      // is no candidate to withdraw or re-make, only words in a lane and a
      // site with nowhere to go — so it stays the editing card and says so
      // there. `unproposed` is tested first for exactly that.
      if (s.stranded && !s.unproposed) return strandedCardHtml(s, site, closedMode);
      return s.unproposed ? editCardHtml(s, site) : mineCardHtml(s, site);
    }
    if (s.kind === 'diagonal') {
      // The same card as everything else (Ed, 276), holding two *questions*
      // rather than two answers. Choosing one says only that it deserves more
      // of the room's attention; nothing here touches either text (SPEC §8.3).
      //
      // Its head is the one head on the surface that is not a clause, because
      // a diagonal has no clause — it spans two, in different parts of the
      // charter, which is what makes it a diagonal. What the head slot is
      // actually for is *the thing you need before the field makes sense*, and
      // here that is the question being put.
      //
      // No `sealed-speaker` on either block either, and that is the mechanism
      // rather than an omission: the line under each question describes the
      // dispute, it is not somebody's argument for it. Drawing a person behind
      // it would claim an author the thing does not have.
      // the lane's name is the question's own name (Q1395 (a)), which on this
      // card is the `.rtag` rather than the wording — the block's text is a
      // description of the dispute, the tag is the thing being weighed
      const q = (c, v) => {
        const nameId = laneNameId(s, null, v);
        return '<div class="propblock">' +
          '<div class="rtag" id="' + nameId + '">' + esc(c.name) + '</div>' +
          '<div class="rtext">' + esc(c.why) + '</div>' +
          '<div class="qclause">' + esc(currentTextFor(c.key)) + '</div>' +
          laneBarHtml(s, v, { edit: false, nameId }) + '</div>';
      };
      return (
        '<div class="sugg diag-open" data-card="' + s.id + '" data-site="' +
        (siteKey || s.pair[0].key) + '"' + laneGroupAttrs(s, null) + '>' +
        clauseHeadHtml(s, { label: T.diag.headLabel,
                            html: T.diag.question }) +
        fieldHtml(q(s.pair[0], 'first') + q(s.pair[1], 'second'), 2, T.diag.fieldLab) +
        // **The commit row is the card's bottom band, on every card**
        // (housekeeping pass, 2026-08-17). Three card types printed their
        // one-line type note *after* it, and a locked card its lock note, so on
        // half the cards the row that ends the card had something under it.
        //
        // Both notes belong above it on their own merits, too. A type note is
        // about the field — *neither of these has to win*, *one judgment for all
        // three places* — so it reads as the last thing said about what you are
        // looking at, rather than as a footnote to the act. And a lock note is
        // the reason the controls below it are dead, which is worth knowing
        // before you reach for them rather than after.
        reviseNote(s) +
        '<div class="foot">' + T.diag.foot + '</div>' +
        refusedFoot(s) +
        commitRowHtml(s) +
        '</div>'
      );
    }
    // 🛡️ on the Text (R-056): the room passed a change and it waits on the
    // Founder. A decision card like every other — the clause it rewrites at
    // the head, the wording as the single proposal block against it — and
    // **the 👑 question takes the pattern whole** (CP5, Q1100, 2026-08-31,
    // striking Y20's clause): 🗑️ closes it pending, and the two reserved
    // powers are the two answers — ✒️ passes it, 🛡️ holds it. No lane
    // radios: this is not a judgment, and nothing about the room's decision
    // is being re-asked.
    if (s.kind === 'crown') {
      const ckey = (s.keys ?? [])[0];
      return (
        '<div class="sugg quick-open" data-card="' + s.id + '" data-site="' + (ckey || '') + '">' +
        clauseHeadHtml(s, Object.assign(headOpts(s, ckey), { chips: chipsFor(ckey, s.id) })) +
        fieldHtml(proposalHtml(s, { html: laneHtml(s.marked), why: s.rationale, by: s.by })) +
        '<div class="foot">' + T.crown.foot + '</div>' +
        '<div class="race-mid commitrow">' +
        '<button class="btn glyphbtn" data-act="clear-close" title="' + T.crown.close + '">' + glyphHtml('🗑️') + '</button>' +
        '<span class="rightpair">' +
        '<button class="btn glyphbtn" data-act="crown-refuse"' +
        ' title="' + T.crown.refuse + '">' + glyphHtml('🛡️') + '</button>' +
        '<button class="btn btn-approve glyphbtn" data-act="crown-accept"' +
        ' title="' + T.crown.accept + '">' + glyphHtml('✒️') + '</button>' +
        '</span></div>' +
        '</div>'
      );
    }
    // **The room's side of a park** (SURFACE E36; Ed, 2026-09-09, Q1015; Ed
    // 2026-08-29: *a ⏳ whose card says "Awaiting assent from the Founder 🛡️"
    // [OK]*). The membership passed a change to this clause and the Founder
    // has not answered: the clause at the head, one sentence, and OK — the
    // card asks nothing but to have been seen. No wording and no author: the
    // words are the Founder's 👑 card's, one seat over. The mark is ⏳ like a
    // race you have voted on, and the sentence is what says which wait this
    // is — the room has finished, the Founder has not (Q1286 (a)). OK is
    // `data-seen`, so it is remembered per seat the way a sealed record's is,
    // and the entry stays ⏳ until the park resolves (E36's Close cell).
    if (s.kind === 'park') {
      const pkey = (s.keys ?? [])[0];
      return (
        '<div class="sugg quick-open park-open" data-card="' + s.id + '" data-site="' + (pkey || '') + '">' +
        clauseHeadHtml(s, Object.assign(headOpts(s, pkey), { chips: chipsFor(pkey, s.id) })) +
        '<p class="setnote">' + glyphify(esc(s.parkNote || '')) + '</p>' +
        (s.unread && !readSeals.has(s.id)
          ? '<div class="race-mid commitrow"><span></span>' +
            '<button class="btn btn-approve okbtn" data-seen="' + s.id + '"' +
            ' title="' + T.record.okTitle + '">' + T.record.ok + '</button></div>'
          : '<div class="race-mid commitrow">' +
            '<button class="btn glyphbtn" data-act="clear-close" title="' + window.COPY.grammar.commit.binLocked + '">' + glyphHtml('🗑️') + '</button>' +
            '<span></span></div>') +
        '</div>'
      );
    }
    // **The card is about one pair, and one pair is one item** (Q1200, Q1201,
    // Q1367): the two judgment cards below draw the item's own pair and
    // nothing of any other pair on the race — the other pairs are their own
    // tabs in the clause's stack.
    const sv = s;
    if (sv.kind === 'race') {
      // The clause, which this card had never shown (Ed, QA 2026-08-16) — a
      // reader was being asked to choose between two rewrites without being
      // shown what they rewrite. It carries no control here because **this
      // pair is not about it**: two challengers were dealt, and a judgment is
      // of two candidates. The current text is a peer in the field like any
      // other (Q1362 (a)), and where the router deals it as one of the pair
      // the host builds the item as a quick card — whose head carries
      // the lane, in the same words as the proposal's. The old reason here
      // was that displacement was settled by the adoption threshold rather
      // than by this judgment; there is no threshold, and the ranking these
      // judgments feed is what decides.
      const rkey = (sv.keys ?? [])[0];
      const cur = runTextFor(sv, rkey);    // the run's text, as the head reads it (Q1308)
      return (
        '<div class="sugg race-open" data-card="' + sv.id + '" data-site="' + rkey + '"' +
        laneGroupAttrs(sv, rkey) + '>' +
        clauseHeadHtml(sv, Object.assign(headOpts(sv, rkey), { chips: chipsFor(rkey, sv.id) })) +
        // two replies to the same post; each states its own change against the
        // clause above, and carries its own argument and controls
        fieldHtml(
          proposalHtml(sv, { v: 'a', html: wordingHtml(cur, sv.race.a.text), why: sv.race.a.rationale, by: sv.race.a.by }) +
          proposalHtml(sv, { v: 'b', html: wordingHtml(cur, sv.race.b.text), why: sv.race.b.rationale, by: sv.race.b.by }), 2) +
        reviseNote(sv) + parkNote(sv) +
        // The one thing a race card cannot say any other way: the pair on it
        // is two challengers, so nothing on the card says *the clause above
        // is fine as it is*, and a reader could reasonably think one of them
        // must win. Neither has to: the clause above is in the same ranking
        // and stays unless the room comes to prefer one of them (Q1362 (a)).
        '<div class="foot">' + T.race.foot + '</div>' +
        refusedFoot(sv) +
        commitRowHtml(sv) +
        '</div>'
      );
    }
    if (sv.kind === 'patch') {
      // A card at every place the patch touches (Ed, 181), each showing only
      // that clause — but one judgment for all of them, so every card reads the
      // same `picked` state, highlights the same lane, and commits the whole
      // thing. The stepper is how you read the rest before you commit.
      const n = s.sites.length;
      const i = Math.max(0, s.sites.findIndex((x) => x.key === siteKey));
      const site = s.sites[i];
      const step = (to, label, glyph) => (to === null
        ? '<span class="pstep off">' + glyph + '</span>'
        : '<button class="pstep" data-step="' + s.id + ':' + s.sites[to].key + '" title="' + esc(label) + '">' + glyph + '</button>');
      return (
        '<div class="sugg patch-open" data-card="' + s.id + '" data-site="' + site.key + '"' +
        laneGroupAttrs(s, site.key) + '>' +
        '<div class="pnav">' +
        '<span class="pwhere">' + esc(site.label) + T.nav.placeOf(i + 1, n) + '</span>' +
        '<span class="psteps">' +
        step(i > 0 ? i - 1 : null, T.nav.prev, '↑') +
        step(i < n - 1 ? i + 1 : null, T.nav.next, '↓') +
        '</span></div>' +
        // Here the clause *is* one of the two things being judged, so its head
        // picks like any proposal. The fixture's `marked` is already the full
        // diff, so a stacked proposal can state its own change without
        // recomputing one.
        clauseHeadHtml(s, { text: sourceTextFor(site.key), key: site.key, v: 'keep',
                            chips: chipsFor(site.key, s.id) }) +
        fieldHtml(proposalHtml(s, { v: 'approve', html: laneHtml(site.marked), why: s.rationale, by: s.by, key: site.key })) +
        reviseNote(s) +
        '<div class="foot">' + T.patch.foot(n) + '</div>' +
        // **The vote floats** (Q1382, Ed 2026-09-15: *the vote for a patch is
        // also floating, since there is no single card for it to sit on*): the
        // Indifferent block is an answer and stays on every site card; the
        // bar — 🗑️ · ❄️? · ✓ — is the proposal-row's, once, at the foot of the
        // window (`renderPatchRow`), where the one judgment for all sites is cast
        refusedFoot(s) +
        vinBlockHtml(s) +
        '</div>'
      );
    }
    // quick (including insert) — the race card's own geometry, with the
    // current text on the left. **Both lanes read the same words** (Q1362 (a)):
    // the current text is a candidate in the field authored by nobody, so it is
    // preferred or not preferred exactly as its rival is. The lane's id stays
    // `keep`, which is the value `judge()` sends and the server knows.
    // A proposed section has no clause of its own to edit into, so neither
    // lane offers ✏️ — writing a rival section is a different gesture and
    // nobody has designed it (Q261).
    const key = (sv.keys ?? [])[0];
    const noEdit = sv.isInsert ? false : undefined;
    // a proposed section is the one case with no clause to redline against, so
    // it states itself whole and its new heading, where it brings one, is
    // all-new (a live insertion is one line and brings none — Q1308)
    const prop = sv.isInsert
      ? (sv.newHeading ? '<div class="rtext"><ins>' + esc(sv.newHeading) + '</ins></div>' : '') +
        '<div class="rtext">' + laneHtml(sv.marked) + '</div>'
      : laneHtml(sv.marked);
    return (
      '<div class="sugg quick-open" data-card="' + sv.id + '" data-site="' + (key || '') + '"' +
      laneGroupAttrs(sv, key) + '>' +
      clauseHeadHtml(sv, Object.assign(headOpts(sv, key), { v: 'keep', edit: noEdit,
                          chips: chipsFor(key, sv.id) })) +
      groundNote(sv) +
      fieldHtml(proposalHtml(sv, { v: 'approve', html: prop, why: sv.rationale, by: sv.by, edit: noEdit })) +
      reviseNote(sv) + parkNote(sv) +
      refusedFoot(sv) +
      commitRowHtml(sv) +
      '</div>'
    );
  }

  // committing
  // **Hold to propose, and the edit flies out of your wallet to pay for it**
  // (Ed, 2026-08-17). A whimsical idea that turns out to be the most literal
  // thing on the surface: the confirmation gesture and the price are the same
  // object, because what you are holding down for is the time it takes one of
  // your pencils to travel from the wallet to the button. Let go and it flies
  // home and nothing is spent.
  //
  // It replaces the two-press arming built an hour earlier, which said the
  // price in words at the moment of confirming. This says it by moving the
  // thing being spent, which is better in the way a diagram is better than a
  // caption — and it keeps the standing rule that the price is stated *at*
  // Propose rather than in advance.
  //
  // Under reduced motion the pencil does not travel: it fades at the wallet
  // and arrives at the button. Same gesture, same duration, no flight.
  //
  // **The length of every hold on the surface, and there is only one**
  // (Ed, 2026-08-29, backlog 206: *all "hold" times should now be only 1
  // second long*, QA on the commit-gesture switch). It used to be a ladder —
  // a second for the pen and the quill, three for the pencil, ten for the
  // assembly — on the idea that the length of a hold said the gravity of the
  // act. It is one number now, declared here because this file loads first,
  // exported as `SESSION.holdMs` and read by `session-view.html` for its
  // wallet commits and its assembly rather than copied. What still says an
  // act's gravity is what flies (SURFACE §7.2, R-059).
  const HOLD_MS = 1000;
  let holding = null;
  const flyStop = (fired) => {
    if (!holding) return;
    const { el, pencil, timer, anim, pen } = holding;
    holding = null; holdInFlight = false;
    clearTimeout(timer);
    el.classList.remove('holding');
    el.removeAttribute('aria-disabled');
    // ✒️ spends nothing, so there is no wallet to un-ghost and nothing to fly
    // home — the control simply comes back, whether it landed or was let go
    if (pen) return;
    // Fired: the edit is spent, and act() renders the wallet one lighter — so
    // the reserved gap is released without a render of its own, or the wallet
    // would show the old count for a frame before the spend lands.
    if (fired) { FLIGHT.walletGhost = false; if (pencil) pencil.remove(); return; }
    if (!pencil) { FLIGHT.walletGhost = false; renderWallet(); return; }
    // Let go early and it comes home **along its own arc** — the flight run
    // backwards rather than a second, straighter journey, because the way it
    // came is the way it goes back. Faster than it left: rewinding at the
    // speed it flew would punish a late change of mind with a wait as long
    // as the hold, and the return is not a gesture anybody is performing.
    //
    // Since Q531 the return is `nudgeHome`, shared with the pen and the
    // quill, which adds the quarter floor: a press too short to be a hold
    // still carries the pencil a quarter of the way before it comes back.
    // **288ms, not 250** — this flight's easing is slow off the mark, and
    // the floor is a quarter of the *distance*, not of the time (see
    // `nudgeHome`). The fraction is a property of the curve rather than of
    // the length: `cubic-bezier(.45, .05, .3, 1)` has covered a quarter of
    // the way at **0.288** of its duration whatever that duration is, so 864
    // of 3000 and 288 of 1000 are the same point on the same arc. The linear
    // flights' 250 is the same solve for `linear` at the same length. The old
    // `HOLD_MS / 4 + 60` safety timeout is gone with it: the fallback now
    // derives from the actual journey, which a literal cannot do once there
    // is a push phase in front of the rewind.
    nudgeHome({ anim, el: pencil }, { floorAt: 288,
      onDone: () => {
        FLIGHT.walletGhost = false;
        // the pencil is home, so the preview may resume — but only if the
        // pointer never left the button that was asking for it
        resumeLean(el);
        renderWallet();
      } });
  };
  // the draft a commit is for: the card's, or — on the proposal-row at the
  // foot of the window, which stands in no card (Q1382) — the one draft there is
  const cardIdOf = (el) => { const c = el.closest('.sugg'); return c ? c.dataset.card : (draftOf() || {}).id; };
  const flyStart = (el) => {
    flyStop(false);
    if (el.disabled) return;
    // **✒️ has no flight, and that is the honest reading** (R-058, entry 160).
    // A pencil crossing the screen means *an edit is being spent*, and no edit
    // is spent by a decree; the ✒️ token that could fly instead lives in
    // `session-view.html`'s own wallet state (`penGhost`, `setWalletGhost`),
    // which this file does not own and this plan does not reach into. So the
    // gesture is the whole of it: the same three listeners, the same landing
    // by id, at the one hold length every commit on the surface takes.
    const pen = el.dataset.pen === '1';
    if (pen) {
      el.classList.add('holding');
      el.setAttribute('aria-disabled', 'true');   // inert, never `disabled` (184)
      holdInFlight = true;
      const penId = cardIdOf(el);
      const penD0 = draftOf();
      holding = { el, pencil: null, anim: null, pen: true, timer: setTimeout(() => {
        flyStop(true);
        if (draftOf() === penD0) act(penId, 'draft-pen');
      }, HOLD_MS) };
      return;
    }
    // the token is about to leave for real, so it stops straining at the leash
    stopLean();
    // The slot the pencil leaves and the pencil that leaves are the same
    // object: ghosting the wallet marks it, and the mark is what we measure
    // from. It is render state, not a poke at the DOM — the drip re-renders
    // the wallet every second and used to put the flying pencil straight back
    // (Ed, 2026-08-17).
    FLIGHT.walletGhost = true;
    renderWallet();
    const src = walletEl.querySelector('.gone');
    let pencil = null, anim = null;
    if (src) {
      const a = src.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      pencil = document.createElement('div');
      pencil.className = 'flypencil';
      pencil.innerHTML = glyphHtml('✏️');
      pencil.style.left = (a.left + a.width / 2) + 'px';
      pencil.style.top = (a.top + a.height / 2) + 'px';
      document.body.appendChild(pencil);
      anim = REDUCED()
        ? pencil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: HOLD_MS, fill: 'both' })
        : pencil.animate(arcFrames(a, b, 0, -24),
            { duration: HOLD_MS, easing: 'cubic-bezier(.45, .05, .3, 1)', fill: 'both' });
    }
    el.classList.add('holding');
    // **Inert, never `disabled`** (backlog 184). Under the click gesture the
    // control is out of play for the length of the flight, and `.holding` is
    // already what says so; this is the same fact for a screen reader. A real
    // `disabled` would be the 2026-08-22 bug shape again — a render mid-flight
    // rebuilds the button anyway, and `holdWallet`'s sibling below refuses a
    // disabled control, so the timer's click on one is a silent no-op.
    // `holding` being non-null is the real guard.
    el.setAttribute('aria-disabled', 'true');
    holdInFlight = true;
    const id = cardIdOf(el);
    // **The draft that is proposed is the one the pencil left for.** `act`
    // resolves by id, and the id is `DRAFT_ID` for every draft in turn — so
    // under `click`, where the member is free for the whole flight,
    // 🗑️ and a fresh composition would put a *different* draft in and spend
    // an edit nobody asked to spend. The object identity is the test, and it
    // survives a data swap, which is what the id-by-node fix was about
    // (`setData` carries the same unproposed draft across).
    const d0 = draftOf();
    holding = { el, pencil, anim, timer: setTimeout(() => {
      flyStop(true);
      if (draftOf() === d0) act(id, 'draft-propose');
    }, HOLD_MS) };
  };
// **The press outlives the button, here too** (Ed, 2026-08-22: *I cannot
// submit it even if I hold it — the pencil flies back*). This hold used to
// be built inside `renderDoc`, bound per button and released on
// **pointerleave**, and both halves of that were fatal. A render during a
// hold detaches the button under the pointer, so the browser fires
// pointerleave at the node it just removed and the hold silently cancels —
// measured, not deduced: after a render the held button reports
// `isConnected: false` while its timer is still running. And `.holding`
// applies `scale(0.97)`, which insets the hit box by 0.78px, so a press
// landing within a pixel of the edge cancels itself on the spot with no
// render involved at all. Deferring the poll (the earlier fix) closed only
// the third of the three doors.
//
// So it takes the ✒️ pen hold’s shape, which has never had this bug: bound
// once on the document, released on **pointerup and pointercancel only**.
// Sliding off to cancel goes with it, deliberately — the pen has never
// offered it, and letting go is the cancel. What made the timer survivable
// already was that it commits through `act(id, …)`, which resolves the
// draft by id rather than by node: verified by holding through a render and
// watching the proposal land from a button that no longer existed.
//
// **Under the click gesture nothing here starts the flight** (backlog 184).
// `flyStart`/`flyStop` are the flight and the landing in both positions and
// are untouched; only who calls them moves. Under `click` the press does
// nothing at all and the click that follows is the gesture (see the
// `draft-propose` branch of the `.sugg [data-act]` binding), and no release
// ends a flight but its own timer — so W16 governs the hold position, where
// these three listeners are byte-for-byte what they always were.
document.addEventListener('pointerdown', (ev) => {
  if (GESTURE !== 'hold') return;
  // …and the charter's proposal-row's ✏️ / ✒️, which is the hold itself since
  // Q1382 (never the founder's pre-🍾 row in `#proserow`, whose ✒️ is the
  // page's own `confirm-starting-text`)
  const b = ev.target.closest && ev.target.closest('[data-act="draft-propose"], #charter [data-proposalrow] [data-act="row-commit"]');
  if (!b || ev.button !== 0) return;
  ev.preventDefault(); ev.stopPropagation();
  // …and on the row, with the draft's card closed, the press opens the card
  // and starts no flight (Q1296): the review comes before the commit
  if (b.dataset.act === 'row-commit') {
    const d = draftOf();
    if (!d) return;
    if (openId !== d.id) { toggle(d.id, true); return; }
  }
  flyStart(b);
});
document.addEventListener('pointerup', () => { if (GESTURE === 'hold') flyStop(false); });
document.addEventListener('pointercancel', () => { if (GESTURE === 'hold') flyStop(false); });

  // ---- the document, in its passes (refactor Q1352 (g), 2026-09-14) -------
  // `renderDoc` was one 665-line function doing four unrelated jobs in a row,
  // and it is the sequence of them now. Each pass below is the job it always
  // was, in the order it always ran and with its body unchanged: the column's
  // markup is built, swapped in and measured, and then the three families of
  // control standing on it are wired — the column's own, the gutter's, and
  // the cards'.
  //
  // The passes share nothing but `doc` and the markup the first hands the
  // second, which is why this could be a split rather than a rewrite: every
  // local the clause pass declares (`cardDone`, `headIdx`, `writing`,
  // `holders` and the four helpers over them) dies with it, and no listener
  // below ever read one. The wiring divides where it does because that is
  // where it already divided — the three groups are contiguous runs of the
  // old body, so no listener is registered in a different order than before.
  function renderDoc() {
    placementPass(clausePass());
    columnPass();
    gutterPass();
    cardPass();
  }

  // **The clause pass**: the column's whole markup as one string — every
  // block with its mark, the cards that swallow their own clause, the
  // anchors every gap site stands on, and the proposal-row at the foot.
  function clausePass() {
    // **The lane controls, one strip for the column** (Q1294 (b), Ed
    // 2026-09-10: *top right of the edit box*): drawn exactly where the
    // proposal-row is — edit mode, a reader who may propose, the document
    // open — as a sticky box before the column so it rides at the card's top
    // right as the row sticks to its foot (the viewport is the card). Outside
    // the contenteditable, since a button inside one is harvested text.
    const strip = EDITING() && MAY_PROPOSE() && !closedMode;
    let html = (strip ? '<div class="editctl">' + laneCtlHtml() + '</div>' : '') + PROSE();
    let cardDone = false;
    let headIdx = 0;
    // The draft being written, if the composer is open on it. `pendingId`
    // counts, for the same reason the rail counts it: the document is measured
    // and moved before the card is inserted (Ed, 75).
    const writing = (() => {
      const d = draftOf();
      return d && d.unproposed && (openId === d.id || pendingId === d.id) ? d : null;
    })();

    // In `stacked`, an open card **replaces** its clause rather than sprouting
    // beneath a copy of it (Ed, QA 2026-08-16). That is what the composer has
    // always done, and doing it everywhere is what makes the clause and the
    // card one object instead of two: the thing being proposed about appears
    // exactly once, at the head of the card that is arguing about it. It also
    // settles 265, which asked why the two behaved differently.
    //
    // **A filed record opens from a clause that also has live decisions.** It
    // could not before, and there was no bug to see, because there was no way
    // to *reach* one from here — the gutter hid every filed mark the moment
    // anything live shared the clause, which is the whole of what 294
    // complained about. The filed pile put eight of them one click away and the
    // document quietly rendered nothing for all eight, because the branch that
    // swallows a clause into its record only ran where the clause had nothing
    // live on it.
    //
    // A helper rather than a run of statements inside the paragraph branch
    // since Q897, and that is the whole of the heading fix: **a heading is an
    // addressable block like any other**, and this ran for paragraphs only, so
    // a submitted proposal on a section title had nowhere to open and the rail
    // re-rendered into the same emptiness. The composer's half was lifted over
    // the heading branch on 2026-08-17 for exactly this reason; the
    // submitted-proposal half was never lifted with it.
    const swallowOpen = (key, live) => {
      const openSugg = live.find((x) => x.id === openId);
      // **The open record is looked up by id, read or not** (Q1298, Ed's bot
      // room 2026-09-10: a green ✔ entry whose click opened nothing). This
      // door read `filedFor(key)`, which files only what has been read (M13),
      // so a decided-but-unread record at a clause that also carried a live
      // item had no door at all — `live` never holds a sealed item — and the
      // press changed nothing on the page, against M17.
      const openSealed = SUGGS.find((x) => x.id === openId && stateOf(x) === 'sealed' &&
        (x.keys ?? []).includes(key));
      const card = (s, k) => ({ html: '</div>' + suggCardHtml(s, k) + PROSE(), swallowed: true });
      if (openSealed && !cardDone) { cardDone = true; return card(openSealed, undefined); }
      if (!openSugg) return { html: '', swallowed: false };
      if (openSugg.kind === 'patch') {
        // a card at *every* place a patch touches (Ed, 181)
        if (!openSugg.sites.some((x) => x.key === key)) return { html: '', swallowed: false };
        cardDone = true;
        return card(openSugg, key);
      }
      if (openSugg.kind === 'draft') {
        // a site is a run of clauses; the card stands where the run began and
        // the rest of the run is inside it
        const site = siteFor(openSugg, key);
        if (!site) return { html: '', swallowed: false };
        if (site.keys[0] !== key) return { html: '', swallowed: true };
        cardDone = true;
        return card(openSugg, key);
      }
      // **An open card swallows every block of its span** (Q1407, Ed
      // 2026-09-16): a run's card stands where the run begins and the rest of
      // the run is inside it — its head is the whole run (Q1308) — exactly as
      // a draft site's is above, so the text is never on the page twice with
      // the run's tabs standing under the card that already holds it. A
      // diagonal is the one multi-key card this does not reach: its two keys
      // are two clauses it stands beside, not a run it replaces.
      if (openSugg.kind !== 'diagonal' && (openSugg.keys ?? []).length > 1 &&
          openSugg.keys.includes(key) && openSugg.keys[0] !== key) return { html: '', swallowed: true };
      if (cardDone) return { html: '', swallowed: false };
      // the key matters to a diagonal, which spans two clauses and needs to say
      // which of them it is standing in
      cardDone = true;
      return card(openSugg, key);
    };

    // **A run's later blocks are swallowed though they carry no tab** (Q1409,
    // the proposal-shapes walk 2026-09-17). Q1408 put a run's tab at its first
    // block alone, and `suggFor` reads exactly that list — so for every block
    // of a run but the first the live set came back empty, `swallowOpen` was
    // never called, and Q1407's branch above could not fire: the run stood on
    // the page in full underneath the card that already held it, the text
    // twice, one day after Q1407 took it off. The open item is therefore asked
    // **directly** rather than through the tab list, and asked of every block,
    // so a later block carrying some other item's tab is swallowed too. One
    // tab, at the first block, is untouched: this decides what is *drawn*.
    //
    // A diagonal is the exception Q1407 named: its two keys are two clauses it
    // stands beside, not a run it replaces. A patch draws a card at each of
    // its sites (Ed, 181), so its blocks are the card's and not a run's.
    const swallowedByOpen = (key) => {
      if (!key || !openId) return false;
      const g = SUGGS.find((x) => x.id === openId);
      if (!g || g.kind === 'diagonal') return false;
      if (g.sites) {
        const site = g.sites.find((x) => (x.keys ?? []).includes(key));
        return !!site && site.keys[0] !== key;
      }
      const keys = g.keys ?? [];
      return keys.length > 1 && keys.includes(key) && keys[0] !== key;
    };

    // **The tab stack** (Ed, 2026-08-17). A clause used to give every live
    // decision a tab at full height, which is fine at one and a lie at four:
    // § Bringing a Guest ran a 129px column down the side of a 36px clause, so
    // three of its four marks stood beside prose they had nothing to do with,
    // and the overhang landed *on top of* the held-open gap's own mark below —
    // two tabs rendering as one blob.
    //
    // Ed's answer is the physical one, and it is right because the tab metaphor
    // already contains it: **a strip of tabs seen closed is a pile.** The front
    // one is the object; the rest are slivers of their own lifecycle colour
    // behind it. So the gutter says *there are four here, and one of them is
    // urgent* in the space of one tab, and the full strip — which already
    // exists, and already works, because a card is 380px tall — is one click
    // away down the side of the card.
    //
    // The slivers are inert. The stack has exactly one target, which is what
    // "opens the card they refer to" means, and a 3px sliver is not a control
    // anybody should be asked to hit.
    const chipStackHtml = (live, key) => {
      const stack = stackOrder(live);
      const chips = stack.map((g, i) => {
        const siteIdx = g.kind === 'patch' ? g.sites.findIndex((x) => x.key === key) : -1;
        const where = g.kind === 'patch' ? ' · place ' + (siteIdx + 1) + ' of ' + g.sites.length : '';
        const behind = i > 0;
        return '<span class="achip' + (behind ? ' behind' : '') + '"' +
          (behind ? ' aria-hidden="true"' : ' role="button" tabindex="0"') +
          ' data-anchor="' + g.id + '"' + chipStyle(g, 'z-index:' + (stack.length - i)) +
          (behind ? '' : ' title="' + esc(plainLabel(g.qLabel)) + where +
            (stack.length > 1
              ? ' — open it; the ' + (stack.length - 1) + ' behind it are down the side of the card'
              : ' — open it') + '"') +
          '>' + mkHtml(markKindOf(g)) + '</span>';
      }).join('');
      return '<span class="chipcol' + (stack.length > 1 ? ' stack' : '') +
        '" contenteditable="false">' + chips + '</span>';
    };

    // **The pile a newcomer sees** (Q1413, Ed 2026-09-17: *keep the rule, but
    // the charter's tabs draw greyed behind the OKs*). The same object in the
    // same gutter, in the one posture this surface has always used for *this
    // wants nothing from you*: the hourglass, drained to grey, in the closed
    // hue — **grey means nothing is being asked of you** (SURFACE §6). It is
    // not a control: no `data-anchor`, so no handler binds to it and a press
    // opens nothing, which is C14 whole — no act before the power. And it is
    // no entry: the rail and the contents rail never see these items, because
    // a margin index is a list of what asks you.
    //
    // One tab per question, in the live pile's own order and geometry, so
    // `fitStacks` fits it like any other and the gutter says *how many* without
    // saying what or how urgent — neither of which is a newcomer's business
    // until the power is theirs.
    const heldStackHtml = (held) => {
      const stack = stackOrder(held);
      const chips = stack.map((g, i) => {
        const behind = i > 0;
        return '<span class="achip held' + (behind ? ' behind' : '') + '"' +
          (behind ? ' aria-hidden="true"' : ' title="' + T.chip.held + '"') +
          ' style="--chiphue: var(--lc-closed); z-index:' + (stack.length - i) + '">' +
          mkHtml('deciding') + '</span>';
      }).join('');
      return '<span class="chipcol' + (stack.length > 1 ? ' stack' : '') +
        '" contenteditable="false">' + chips + '</span>';
    };

    // **A gap at the very start has no block before it** (backlog 204, Q261:
    // *at the very start on the gap before it*). `G0`'s `insertAfterKey` is
    // null, so the anchor the gap card hangs on cannot be emitted after a
    // neighbour — it is emitted here, above the first block, or the draft
    // would render nowhere at all and the keystroke that opened it would look
    // as though it had done nothing.
    //
    // **Every gap site stands on its own anchor** (Q1311, Ed 2026-09-10; Q1308
    // for two races at one gap): the holders are listed once, and the anchors
    // after a block are emitted by one helper at every way out of the loop
    // below — a gap after a heading, or after a clause the draft has
    // swallowed, used to fall through the `continue` above the old loop and
    // draw nothing. The gap stays inside the prose column so its gutter mark
    // lines up with every other mark in the margin. The anchor draws **the
    // gap's own site** (Q1134's other half): `suggCardHtml` falls back to
    // `sites[0]`, which on a draft that also holds a clause site is that
    // clause's card — the very duplicate the gap block branch avoids. A draft's
    // anchors carry `data-site`, so a rail entry and a wire find their own; a
    // draft draws a card on each, a live item once.
    const holders = gapHolders();
    // **The open card replaces its anchor** (Q1379, Ed 2026-09-15: *why am I
    // seeing the 🔥 tab twice*): a clause's card replaces its paragraph, and
    // a gap's card replaces its held-open anchor the same way — the anchor
    // drew its own tab above the card while the card's strip drew the same
    // race's tab at its left edge, one race wearing two tabs a hundred
    // pixels apart. Open, the strip is the tab; closed, the anchor is. A
    // draft's gap sites keep their anchors under the editing card as they
    // were: the editing card is edit mode's own (K13, K31), each site's
    // anchor is where its card hangs and the wire lands (Q1311), and the
    // floating row's rules are Q1380's and Q1382's, not this one's.
    const anchorHtml = (h) => {
      if (openId === h.g.id && !h.site && !cardDone) {
        cardDone = true;
        return '</div>' + suggCardHtml(h.g, h.key) + PROSE();
      }
      let out = '<div class="insert-anchor" data-anchor="' + h.g.id + '"' + (h.site ? ' data-site="' + h.key + '"' : '') +
        ' title="' + esc(plainLabel(h.g.qLabel)) + T.chip.gapSection + '"' +
        anchWash(h.g, openId === h.g.id) + '>' +
        '<span class="chipcol"><span class="achip"' + chipStyle(h.g) + ' data-anchor="' + h.g.id + '">' +
        mkHtml(markKindOf(h.g)) + '</span></span></div>';
      if (openId === h.g.id && h.site) out += '</div>' + suggCardHtml(h.g, h.key) + PROSE();
      return out;
    };
    const gapsAfter = (key) => (key ? holders.filter((h) => h.after === key).map(anchorHtml).join('') : '');
    for (const h of holders.filter((h) => h.after == null)) html += anchorHtml(h);

    for (const line of DOC) {
      if (line.t === 'title') { html += '<div class="doctitle">' + esc(line.x) + '</div>'; continue; }
      let secN = -1;
      if (line.t === 'h') {
        secN = headIdx++;
        if (buriedBy(secN)) continue;                   // an outer fold hides this heading too
      } else if (headIdx > 0 && hiddenSection(headIdx - 1)) {
        continue;              // a paragraph goes with the innermost heading above it
      }
      // **The trailing gap is drawn only in edit mode** (backlog 204): a blank
      // block after the last clause saying a new one may start here. Read
      // mode, the closed page, the stranger's bars and the TOC never see it.
      if (line.gap && (!EDITING() || !MAY_PROPOSE() || closedMode)) continue;

      // A draft of your own **replaces** the blocks it is editing, so they open
      // into the composer where they stand rather than sprouting a card
      // underneath their own copy (Ed, 2026-08-16). One card per site; the rest
      // of a site's run is inside it. This is checked before the heading is
      // drawn, because a run may *start* at a heading now (Ed, 2026-08-17) —
      // it used to sit below the heading branch, which is why a draft on a
      // section title opened nothing at all.
      if (writing && siteFor(writing, line.key)) {
        const site = siteFor(writing, line.key);
        // **A gap site's card hangs on its own `insert-anchor`, never on the
        // gap block** (Q1134). The two stand at the same place in the document
        // — after the clause the insertion goes before — and the anchor is
        // where every gap draft's card is emitted, mid-document ones included,
        // so drawing one here as well would put two of the same card on the
        // page. It never showed until edit mode survived the card opening:
        // `EDITING()` was false by then, and the gap block above was skipped
        // wholesale.
        if (!line.gap && site.keys[0] === line.key) {
          html += '</div>' + editCardHtml(writing, site) + PROSE();
        }
        html += gapsAfter(line.key);
        continue;
      }

      // …and every other open card swallows the rest of its run the same way
      // (Q1409). Asked here, above both branches, because it is one question
      // about one block and the answer does not depend on which tabs the
      // block carries — a heading inside a run is as swallowed as a
      // paragraph, and a block inside the run that also carries some other
      // decision's tab is swallowed with it. The anchors standing in the gap
      // after it are still emitted: they belong to the gap, not the block.
      if (swallowedByOpen(line.key)) { html += gapsAfter(line.key); continue; }

      if (line.t === 'h') {
        // A heading is an addressable block like any other (Q897), so a
        // proposal on a section title opens where the title stands and wears
        // its mark in the same gutter column as every other block's. Both
        // halves used to live below this branch's `continue`, which is why a
        // heading-targeted proposal had no mark to press and opened nothing
        // when the rail pressed it for you.
        //
        // **And a decided one, the same way.** `suggFor` drops a sealed
        // entry, so keying the whole branch off it left the heading's *record*
        // exactly where its live proposal had been: no mark in the gutter, and
        // a rail entry that opened nothing the moment the thing it points at
        // was filed. A paragraph has had the `wasResolved` half for as long as
        // it has had the live one, so the heading takes both or neither.
        const hlive = line.key ? suggFor(line.key) : [];
        // at the run's first block alone, as the live tab was (Q1418)
        const hSealedAt = (g) => (resolved.has(frontKeyOf(g)) || g.state === 'sealed') && tabAt(g, line.key);
        // **The open record is the one that opens, not the first one found**
        // (Ed, 2026-09-11, the moon room: *queue card that does not open
        // decision card* — a ✔ on the Food heading). Two records landed on
        // one heading, `find` returned the first, and a press on the second
        // compared its id against the first's and drew nothing — Q1298's
        // defect again, one branch over. The mark still shows the front one.
        const hOpen = line.key && !hlive.length
          ? SUGGS.find((g) => g.id === openId && hSealedAt(g)) : undefined;
        const hDecided = line.key && !hlive.length
          ? (hOpen || SUGGS.find(hSealedAt))
          : undefined;
        let marks = '';
        if (hlive.length) {
          const swallow = swallowOpen(line.key, hlive);
          if (swallow.swallowed) { html += swallow.html + gapsAfter(line.key); continue; }
          marks = chipStackHtml(hlive, line.key);
        } else if (hDecided) {
          if (openId === hDecided.id && !cardDone) {
            html += '</div>' + suggCardHtml(hDecided) + PROSE();
            cardDone = true;
            html += gapsAfter(line.key);
            continue;
          }
          marks = '<span class="chipcol" contenteditable="false"><span class="achip" tabindex="0"' +
            chipStyle(hDecided) + ' data-anchor="' + hDecided.id + '" title="' +
            esc(plainLabel(hDecided.qLabel)) + T.chip.decided + '">' + mkHtml(markKindOf(hDecided)) + '</span></span>';
        }
        // a heading is an addressable block like any other (Q897), so a
        // question held back from this reader greys in its gutter too (Q1413)
        if (!marks) {
          const heldHead = heldFor(line.key);
          if (heldHead.length) marks = heldStackHtml(heldHead);
        }
        const inside = collapsed.has(secN) ? suggestionsInSection(secN) : 0;
        html += '<h2 class="docline editable' + (marks ? ' marked' : '') +
          ' lvl' + (line.level ?? 1) + '" id="sec-' + secN + '"' +
          ' data-key="' + line.key + '">' + marks +
          '<span class="nocaret" contenteditable="false">' + toggleHtml(secN) + '</span>' + blockHtml(line) +
          (inside ? '<span class="sechint" contenteditable="false">' + inside +
            (inside === 1 ? ' suggestion' : ' suggestions') + ' inside</span>' : '') +
          '</h2>';
        html += gapsAfter(line.key);
        continue;
      }

      const live = line.key ? suggFor(line.key) : [];
      // a settled clause still opens its record from the document side (Ed, 112)
      // the open one first, where two records share a clause (Q1298): the
      // first in `SUGGS` order is otherwise the only one this door can draw
      // …and it stands at the run's first block alone (Q1418)
      const sealedAt = (g) => (resolved.has(frontKeyOf(g)) || g.state === 'sealed') && tabAt(g, line.key);
      const wasResolved = line.key && !live.length
        ? (SUGGS.find((g) => g.id === openId && sealedAt(g)) ?? SUGGS.find(sealedAt))
        : undefined;

      if (live.length) {
        const primary = live.find((x) => x.id === openId) ?? live[0];
        const swallow = swallowOpen(line.key, live);
        html += swallow.html;

        if (!swallow.swallowed) {
          html +=
            '<p class="anch editable' + (openId === primary.id ? ' active' : '') + bulletCls(line) + '" data-key="' + line.key +
            '" data-anchor="' + primary.id + '"' +
            anchWash(primary, openId === primary.id, line.key) + '>' +
            chipStackHtml(live, line.key) + blockHtml(line) + '</p>';
        }
      } else {
        // a settled clause opens its record the same way — the record's head is
        // the clause, so leaving the paragraph above it would print it twice
        const swallowed = wasResolved && openId === wasResolved.id && !cardDone;
        if (swallowed) {
          html += '</div>' + suggCardHtml(wasResolved) + PROSE();
          cardDone = true;
        } else {
          // An empty clause — the one block of an empty document (Q649 (a)) —
          // keeps a line's height and says what it is, in grey and out of the
          // text flow so the caret lands at offset 0. The sentence promises
          // typing only to somebody who may propose.
          const blank = line.key && !line.x && !wasResolved;
          // **and a question this reader may not act on yet stands greyed in
          // the gutter** (Q1413): only where nothing else claims the column,
          // which is every clause of a busy document for somebody who has not
          // accepted Voting — the gutter is one column wide and the live or
          // filed tab already says there is something here.
          const heldHere = wasResolved ? [] : heldFor(line.key);
          // …and the gap block takes the same treatment with its own sentence
          // (Q1090: one rule, two sentences — the rule is the geometry)
          html += '<p class="editable' + (wasResolved ? ' anch resolved' : '') + (heldHere.length ? ' anch held' : '') + (blank ? ' blank' : '') + (line.gap ? ' gap' : '') + bulletCls(line) + '"' +
            (wasResolved ? ' data-anchor="' + wasResolved.id + '"' +
              anchWash(wasResolved, openId === wasResolved.id, line.key) : '') +
            (line.key ? ' data-key="' + line.key + '"' : '') +
            (blank ? ' data-placeholder="' + (line.gap ? T.blank.gap : MAY_PROPOSE()
              ? T.blank.mayPropose
              : T.blank.plain) + '"' : '') + '>' +
            (wasResolved ? '<span class="chipcol" contenteditable="false"><span class="achip" tabindex="0"' + chipStyle(wasResolved) + ' data-anchor="' + wasResolved.id +
              '" title="' + esc(plainLabel(wasResolved.qLabel)) + T.chip.decided + '">' + mkHtml(markKindOf(wasResolved)) + '</span></span>' : '') +
            (heldHere.length ? heldStackHtml(heldHere) : '') +
            blockHtml(line) + '</p>';
        }
      }

      // everything standing in the gap after this block, each on its own
      // anchor (Q1308, Q1311 — see `holders` above)
      html += gapsAfter(line.key);
    }
    html += '</div>';
    // **the proposal-row, in edit mode** (backlog 204): the foot of the text's
    // card, and the post-🍾 commit follows entry 160's glyph rule — ✒️ where
    // the Founder holds the pen on the Text, ✏️ otherwise. **The hold is the
    // row's** (Q1382, Ed 2026-09-15: *a floating ✏️ to submit all of them and
    // a floating 🗑️ to discard all of them*): the row's ✏️ used to open the
    // editing card and press the card's own commit by proxy; the card commits
    // nothing now — its 🗑️ is its only control — so the pencil flies from
    // here, and the tooltip is the hold's own (`proposeCtlTitles`). Only where
    // this reader may propose: read mode has no row. Where the pen is held the
    // row offers ✏️ beside it (entry 161): this reader may propose, being
    // inside `MAY_PROPOSE()`, and holds the pen too.
    if (EDITING() && MAY_PROPOSE() && !closedMode) {
      const rs = draftRowState();
      const pen = MAY_PEN();
      const idle = T.row.idle;
      const pt = proposeCtlTitles(draftOf());
      html += proposalRowHtml({
        count: rs.changedCount, changed: rs.changed, pen, pair: pen,
        // the wallet is what is stopping this press, and the row says when
        // that stops being true (Q1486 (E))
        broke: pt.broke && rs.changed,
        disabled: !rs.changed || pt.broke, penDisabled: !rs.changed,
        discardDisabled: !rs.count,
        title: !rs.changed ? idle : pen ? pt.penTitle : pt.title,
        proposeTitle: !rs.changed ? idle : pt.title,
      });
    }
    return html;
  }

  // **The propose controls follow the draft as it is typed** (Q1461, Ed's
  // screenshot from the residency room, 2026-09-18: *why can't I make a
  // proposal* — a new clause typed into a gap, three edits in the wallet, and
  // a ✏️ that would not wake). The row and the single-site card's commit were
  // evaluated where the column is drawn and nowhere else. A clause's first
  // keystroke *is* a draw, with the change already in it, which is what hid
  // this; a gap is drawn by the Enter that makes it, **before** anything is
  // typed, so its controls were born reading *nothing has changed yet* and
  // stayed that way until something else happened to rebuild the column.
  // Patched in place on every lane input — never a render under a caret — by
  // the same two readers the draw uses, so the two cannot disagree; and a
  // draft typed back to its origin greys them again, which it never did.
  // **And not only in edit mode** (Q1476; Ed's screenshot from the tea room,
  // 2026-09-19: *why can't I submit — after a wait then I could*, the wallet
  // not empty). ✏️ *propose edit* on a proposal's own wording opens a draft
  // without entering edit mode, seeded with that wording — so its card is
  // born reading *nothing has changed yet*, exactly as a gap's is — and this
  // returned at once wherever `EDITING()` was false, leaving the ✏️ asleep
  // until some other render redrew it. The row is drawn only in edit mode, so
  // outside it the row's selectors find nothing and the card's own commit is
  // all this touches. Guard: `scripts/repro/propose-edit-wakes.mjs`.
  function syncProposeCtls() {
    if (!doc || !MAY_PROPOSE() || closedMode) return;
    const rs = draftRowState();
    const pt = proposeCtlTitles(draftOf());
    const idle = T.row.idle;
    doc.querySelectorAll('[data-proposalrow] [data-act="row-commit"], .sugg [data-act="draft-propose"]').forEach((b) => {
      const pen = !!b.dataset.pen;
      const inRow = b.dataset.act === 'row-commit';
      b.disabled = pen ? !rs.changed : (!rs.changed || pt.broke);
      b.title = inRow && !rs.changed ? idle : pen ? pt.penTitle : pt.title;
    });
    // **and the countdown appears with the dark button, not one render later**
    // (Q1486 (E), and Q1461's own lesson): the note is drawn where the wallet
    // is what stops the press, and whether that is true changes as the draft
    // is typed — so it is put in and taken out here, beside the `disabled` it
    // belongs to. Never rebuilt while it stands: its figures are the 1 s
    // timer's, and a replaced node would restart at the whole minute.
    const wantDrip = pt.broke && rs.changed;
    doc.querySelectorAll('[data-proposalrow], .sugg .race-mid.commitrow').forEach((row) => {
      const btn = row.querySelector('[data-act="row-commit"]:not([data-pen]), [data-act="draft-propose"]:not([data-pen])');
      if (!btn) return;
      const note = row.querySelector('.pdrip');
      if (!wantDrip) { if (note) note.remove(); return; }
      if (note) return;
      const html = abstainNoteHtml(dripAtMs(), 'drip');
      if (html) btn.insertAdjacentHTML('beforebegin', html);
    });
    doc.querySelectorAll('[data-proposalrow] [data-act="row-discard"]').forEach((b) => { b.disabled = !rs.count; });
    doc.querySelectorAll('[data-proposalrow] .rowmid').forEach((m) => {
      m.textContent = rs.changedCount ? T.row.placesChanged(rs.changedCount) : '';
    });
  }

  // **The placement pass**: the column swapped in, then measured. The two
  // fits run after the swap and in this order — a stack is fitted to the
  // gutter it has (`fitStacks`), and a card to the stack beside it.
  function placementPass(html) {
    doc.innerHTML = html;
    fitStacks();
    fitCards();
  }

  // **The column pass**: the prose column's own controls — the fold
  // triangles in its headings, the proposal-row's two ends, and the lane
  // strip's three buttons with the sync that says which of them are live.
  function columnPass() {
    doc.querySelectorAll('[data-sec-toggle]').forEach((b) =>
      b.addEventListener('click', (ev) => { ev.stopPropagation(); toggleSection(+b.dataset.secToggle); })
    );
    // the proposal-row's two ends: the bin drops the whole draft (leaving is
    // not discarding, but this is the one control that is), the commit opens
    // the editing card on the draft's first site
    doc.querySelectorAll('[data-proposalrow] [data-act="row-discard"]').forEach((b) =>
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        dropDraft();
        renderAll(); drawWires();
      })
    );
    // **B and I act on the lane that holds the caret** (Q1294 (b)): the
    // strip is the column's, so the lane is found at the press — the focused
    // editable, which the prevented mousedown leaves focused. Since Q1467 a
    // lane is always markdown source, so the act is always the characters
    // themselves around the selection, and a second press takes them off
    // again (`markSelection`). Then the lane's own re-mark (`laneRemark`),
    // since the diff and the site's text are the lane's to keep. With no lane
    // focused the two are disabled (`syncEditCtl`) and no press arrives.
    doc.querySelectorAll('[data-editctl] .lfmt').forEach((b) =>
      b.addEventListener('mousedown', (ev) => {
        ev.preventDefault(); ev.stopPropagation();  // keep the selection in the lane
        const ae = document.activeElement;
        const lane = ae && ae.closest ? ae.closest('[data-lane]') : null;
        if (!lane || !doc.contains(lane)) return;
        lane.focus({ preventScroll: true });
        markSelection(b.dataset.fmt === 'bold' ? '**' : '*',
          (n) => { const el = n.nodeType === 1 ? n : n.parentElement; return el && el.closest ? el.closest('.lp') : null; });
        const remark = laneRemark.get(lane);
        if (remark) remark();
      })
    );
    syncEditCtl();
    // **The row's commit is the commit** (Q1296, Q1297 — Ed's bot room,
    // 2026-09-10: *the 📝 area ✏️ button at the bottom of the screen should
    // submit that proposal*; *as the founder … click on ✒️ to submit it* —
    // and Q1382, Ed 2026-09-15: the site cards commit nothing). It was a
    // proxy: with no card open it opened the editing card, with the card open
    // it pressed the card's own ✏️. The card's ✏️ is gone, so the flight
    // starts on this button and lands by the draft's id (`flyStart` resolves
    // the id from `draftOf()` where the button is not inside a card), inert
    // while one is in the air. Under the hold gesture the click is not the
    // gesture — the document's `pointerdown` listener below starts the hold
    // on this button as it does on any `draft-propose` control.
    doc.querySelectorAll('[data-proposalrow] [data-act="row-commit"]').forEach((b) =>
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const d = draftOf();
        if (!d) return;
        // **With the draft's card closed, the press opens it** (Q1296): the
        // review comes before the commit, and a draft kept through a click
        // outside (Q1315) is reopened from here. With it open, the press —
        // the hold, or the click where the click is the gesture — proposes.
        if (openId !== d.id) { toggle(d.id, true); return; }
        if (GESTURE === 'hold' || holding) return;
        if (b.disabled || b.getAttribute('aria-disabled') === 'true') return;
        flyStart(b);
      })
    );
  }

  // **The gutter pass**: the `chip-gutter`'s own controls — every mark, every
  // gap anchor and the filed pile. This is the whole of the way into a
  // decision card from the document side (M12): the text is a thing you write
  // in, the glyph beside it is the thing you press.
  function gutterPass() {
    // Opening a decision card from the document is now the **mark's** job and
    // only the mark's (Ed, 224). Clicking the text puts a caret in it, because
    // the text is a thing you write in; the glyph in the gutter is the thing
    // you press. A proposed section keeps its whole gap clickable, since there
    // is no text there to put a caret into.
    // Marks **inside** a card are live too (fixed 2026-08-17). A guard here
    // dropped every click whose target sat inside a `.sugg`, which predates the
    // rebuild that lifted the clause — and its marks — into the card's head. It
    // left the card's own mark inert, so the glyph you pressed to open a card
    // did nothing when you pressed it again, and the only way out was the rail.
    // That is also half of why closing felt abrupt: the gesture that should
    // have run the collapse was not reaching it.
    doc.querySelectorAll('.achip[data-anchor], .insert-anchor[data-anchor]').forEach((el) =>
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        toggle(el.dataset.anchor, false);
      })
    );
    doc.querySelectorAll('.achip[data-anchor]').forEach((el) =>
      el.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault(); ev.stopPropagation();
        toggle(el.dataset.anchor, false);
      })
    );
    // The filed pile opens as one object and closes the same way. When it is
    // open its chips are ordinary tabs and handle their own clicks, so this only
    // fires on the pile's own box — which is what closes it again.
    doc.querySelectorAll('[data-filed]').forEach((el) => {
      const flip = (ev) => {
        ev.stopPropagation();
        const k = el.dataset.filed;
        if (filedOpen.has(k)) filedOpen.delete(k); else filedOpen.add(k);
        renderAll(); drawWires();
      };
      el.addEventListener('click', (ev) => { if (ev.target === el || !el.classList.contains('open')) flip(ev); });
      el.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault(); flip(ev);
      });
    });
  }

  // **The card pass**: what an open card carries — the routes into the
  // composer and its lanes, the desk on a deadlocked race, the choosing, the
  // commit row and the OK that marks a record read.
  function cardPass() {
    // ✏️ on a lane: start writing from that wording (Ed, 228).
    doc.querySelectorAll('[data-propose-from]').forEach((b) =>
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const [id, lane, key] = b.dataset.proposeFrom.split('|');
        const s = SUGGS.find((x) => x.id === id);
        if (!s) return;
        // **the draft opens over the whole run the lane's wording reads**
        // (Q1483): the head shows the run (`runTextFor`), the seed is the
        // candidate's reading of the run, so the draft has to be the run's
        startDraft(key || (s.keys ?? [])[0], laneSeed(s, lane, key, markerFor),
          null, proposeRunFor(s, key || (s.keys ?? [])[0]));
      })
    );
    // The composer's own fields. Neither re-renders the document: a re-render
    // would take the caret with it, and the point of always-on typing is that
    // the caret never goes anywhere you did not put it. What they do update is
    // the **rail**, so your rationale reads back beside the clause as you write
    // it (Ed, 2026-08-16) — the rail is a separate subtree, so rebuilding it
    // cannot disturb a selection living in the document.
    // The `deadlock-card`'s desk before it is backed by anything: the lane holds
    // the clause and is a real editor, and the first keystroke opens the draft
    // with that character already applied. `startDraftFromTyping` does the whole
    // job unchanged, because the box carries `data-key` exactly as a paragraph
    // does — which is the tell that this is `always-on-typing` and not a second
    // mechanism that resembles it.
    doc.querySelectorAll('[data-deadlane]').forEach((el) =>
      el.addEventListener('beforeinput', (ev) => {
        ev.preventDefault();
        startDraftFromTyping(el, ev);
      })
    );
    // Same for the reason, which people do sometimes write first. The draft is
    // opened on the clause as it stands — you have changed nothing yet — and the
    // character is applied to the rationale once it exists.
    doc.querySelectorAll('[data-deadwhy]').forEach((el) =>
      el.addEventListener('beforeinput', (ev) => {
        if (ev.inputType !== 'insertText' && ev.inputType !== 'insertFromPaste') return;
        ev.preventDefault();
        const ch = ev.inputType === 'insertText'
          ? (ev.data || '')
          : ((ev.dataTransfer && ev.dataTransfer.getData('text/plain')) || '');
        const key = el.dataset.deadwhy;
        startDraft(key, null, { text: sourceTextFor(key), caret: 0 });
        const d = draftOf();
        if (d) d.rationale = ch;
        renderQueue();
        const why = doc.querySelector('.dead-open [data-why]');
        if (why) { why.textContent = ch; why.classList.toggle('blank', !ch); placeCaret(why, ch.length); }
      })
    );
    const echo = () => { renderQueue(); drawWires(); };
    doc.querySelectorAll('.edit-why').forEach((el) => {
      el.addEventListener('input', () => {
        const d = draftOf();
        if (!d) return;
        d.rationale = el.innerText.replace(/\n+/g, ' ').trim();
        el.classList.toggle('blank', !el.textContent.trim());
        echo();
      });
    });
    // **A refusal is retired by the next keystroke on its card** (SURFACE Y25,
    // Q1330; found drifting by Q1463's builder, whose sentence stayed until a
    // later press passed). In place, like everything a keystroke does here: the
    // flag goes and the one element with it, and nothing is rendered under the
    // caret. The lane and the reason both count as the card.
    const retireRefusal = (el) => {
      const d = draftOf();
      if (!d || !d.refusal) return;
      d.refusal = null;
      const card = el.closest('.sugg');
      const said = card && card.querySelector('.foot.refusal');
      if (said) said.remove();
    };
    doc.querySelectorAll('[data-lane], .edit-why').forEach((el) =>
      el.addEventListener('input', () => retireRefusal(el)));
    doc.querySelectorAll('[data-lane]').forEach((el) => {
      // Re-marking as you type means rewriting the lane's own markup under the
      // caret, so the caret is taken out by character offset and put back after
      // — the same hold-by-position rule the scroll anchoring works by, for the
      // same reason: the nodes measured before the rewrite do not exist after
      // it. Skipped mid-composition, because an IME needs its own text left
      // alone until it is finished with it.
      //
      // Worth knowing what this technique costs, since the product will not use
      // it: rewriting a contenteditable's markup discards the browser's native
      // undo stack, so ctrl-Z does not work in this lane. A real editor
      // (ProseMirror, CodeMirror) does the same job while keeping it. That is a
      // reason to reach for one when this is built for real, not a reason to
      // show the design without its highlighting.
      const remark = () => {
        const d = draftOf();
        const site = d && siteFor(d, el.dataset.lane);
        if (!site) return;
        site.text = readLane(el);
        const off = laneCaret(el);
        el.innerHTML = laneBlocks(site.text, originText(site));
        if (off != null) placeCaret(el, off);
        syncProposeCtls();
        layoutQueue(); drawWires();
      };
      el.addEventListener('input', (ev) => { if (!ev.isComposing) remark(); });
      el.addEventListener('compositionend', remark);
      // The lane has no controls of its own since Q1294 (b): B and I are the
      // column's strip, wired above, and reach this lane's re-mark
      // through `laneRemark` when the caret is here.
      laneRemark.set(el, remark);
      // The lane is a rich editable, because Enter has to make a real paragraph
      // (Ed, 231) and `plaintext-only` gives a line break instead. The one cost
      // of that is paste, which would otherwise arrive carrying somebody else's
      // markup into the charter.
      el.addEventListener('paste', (ev) => {
        ev.preventDefault();
        const t = (ev.clipboardData && ev.clipboardData.getData('text/plain')) || '';
        document.execCommand('insertText', false, t.replace(/\r/g, ''));
      });
    });
    // Choosing: marks the selection in place, so the document doesn't move
    // under you. The lanes carry this now as well as the indifference button,
    // so a click anywhere in a lane's box is the choice (Ed, 197).
    // Clicking what is already chosen unchooses it (Ed, 204) — nothing here is
    // committed until Submit, so changing your mind before that should cost the
    // same one click that making it up did.
    const choose = (el) => {
      const card = el.closest('.sugg');
      const s = SUGGS.find((x) => x.id === card.dataset.card);
      if (!s) return;
      const now = pickOf(s) === el.dataset.v ? null : el.dataset.v;
      picked.set(pairKeyOf(s), now);
      // the next choice on a card retires its refusal (Y25, Q1505): in place,
      // like the choice itself
      if (refusedSay.delete(s.id)) {
        openCardEls(s.id).forEach((c) => c.querySelectorAll('.foot.refusal').forEach((f) => f.remove()));
      }
      // One judgment, however many cards it is showing on (181): every card
      // for this suggestion moves its selection together.
      const syncSubmit = (submit) => {
        if (!submit) return;
        // greyed rather than absent (Ed, 2026-08-16): the corner keeps its
        // shape from the moment the card opens
        submit.disabled = now === null;
        const cast = isJudged(s) && now !== null && now === committedOf(s);
        submit.setAttribute('aria-pressed', String(cast));
        submit.title = cast ? window.COPY.grammar.commit.cast
          : now ? window.COPY.grammar.commit.submit : window.COPY.grammar.commit.choose;
      };
      openCardEls(s.id).forEach((c) => {
        // **A radio says `aria-checked`, a button says `aria-pressed`** (Q1395
        // (a)): a lane on a decision card is `role="radio"` now, and writing
        // `aria-pressed` onto one is an `aria-allowed-attr` failure — so the
        // flip asks the element which it is rather than assuming. Anything
        // else wearing `data-v` keeps the attribute it always had.
        c.querySelectorAll('[data-v]').forEach((o) =>
          o.setAttribute(o.getAttribute('role') === 'radio' ? 'aria-checked' : 'aria-pressed',
            String(now !== null && o.dataset.v === now)));
        syncSubmit(c.querySelector('[data-act="submit"]'));
      });
      // …and a patch's ✓, which floats at the foot of the window (Q1382)
      syncSubmit(document.querySelector('#patchrow [data-patchrow="' + s.id + '"] [data-act="submit"]'));
    };
    doc.querySelectorAll('.sugg [data-v]').forEach((b) => {
      b.addEventListener('click', (ev) => { ev.stopPropagation(); choose(b); });
      if (b.getAttribute('role') === 'button') {
        b.addEventListener('keydown', (ev) => {
          if (ev.key !== 'Enter' && ev.key !== ' ') return;
          ev.preventDefault(); ev.stopPropagation(); choose(b);
        });
      }
    });
    // stepping between a patch's places: the cards are all open already, so
    // this is pure navigation — bring the next one to the reading line
    doc.querySelectorAll('[data-step]').forEach((b) =>
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const [id, key] = b.dataset.step.split(':');
        const target = doc.querySelector('.sugg[data-card="' + id + '"][data-site="' + key + '"]');
        if (!target) return;
        smoothScrollBy(target.getBoundingClientRect().top - READ_LINE, () => { layoutQueue(); drawWires(); });
      })
    );
    doc.querySelectorAll('.sugg [data-act]').forEach((b) =>
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (b.dataset.act === 'draft-propose') {
          if (GESTURE === 'hold') return;                // held, not clicked
          // and under `click` the click IS the gesture: it starts the same
          // flight, and a second one while the pencil is in the air — the
          // other half of a double click, or an impatient press — is
          // swallowed. The timer's `flyStop(true); act(id, 'draft-propose')`
          // is unchanged, so the send still happens exactly when the pencil
          // lands and still resolves the draft by id rather than by node.
          if (holding) return;
          flyStart(b);
          return;
        }
        // the sign choice patches the open card rather than re-rendering it
        if (b.dataset.act === 'draft-sign') { setDraftSigned(b.dataset.signed === '1'); return; }
        const card = b.closest('.sugg');
        const id = card.dataset.card;
        const what = b.dataset.act === 'submit'
          ? pickOf(SUGGS.find((x) => x.id === id) || {}) : b.dataset.act;
        if (!what) return;                       // nothing chosen yet
        // the card's own site travels with the press: a 🗑️ on a patch is that
        // place's (Q1306), and the card at each place knows which it is
        act(id, what, card.dataset.site);
      })
    );
    // acknowledging a sealed decision: the only thing that marks it read, and
    // the card closes behind it so the entry visibly settles into its dot
    doc.querySelectorAll('[data-seen]').forEach((el) =>
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const id = el.dataset.seen;
        readSeals.add(id);
        if (hooks.seen) hooks.seen(id);
        const shut = () => { if (openId === id) openId = null; renderAll(); drawWires(); };
        if (openId === id) collapseCards(id, shut); else shut();
      })
    );
  }

  // Own the animation rather than asking for behavior:'smooth' — native smooth
  // scrolling is silently a no-op in some browser configurations, and this also
  // gives us a definite "it has landed" moment to re-measure from.
  // **Nothing rebuilds under a travel** (Ed, 2026-09-16: *sometimes when I
  // click on a queue card, the corresponding decision card is not brought
  // into view correctly*). The move runs with the old card still standing and
  // the swap happens on arrival — but a render landing *during* the move
  // (the live 4s poll, in a bot room most polls) re-laid the column under the
  // scroll and invalidated the arrival: measured on the fixture, a re-render
  // 150ms into a travel left no card open and the page at the top. So a
  // travel is a gesture in flight, like a hold, and both polls defer on it
  // (`pressInFlight` reads `SESSION.travelling`). Never a name copied at
  // make time: the flag is read live, as the hold's is. **The window is the
  // whole open sequence, not the scroll alone**: measured again, the render
  // that lost the card landed 150ms after the click, before the scroll had
  // begun — the folds and the old card's collapse run first — so the flag
  // reads `pendingId`, set at `toggle` and cleared at its `settle`, capped at
  // three seconds so a sequence that never settles cannot stop the polls.
  let travelling = false;
  let travelSince = 0;
  function smoothScrollBy(delta, done) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      scrollTo(0, scrollY + delta);
      done();
      return;
    }
    const from = scrollY;
    const dur = Math.min(700, Math.max(260, Math.abs(delta) * 0.5));
    const t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    travelling = true;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      scrollTo(0, from + delta * ease(t));
      if (t < 1) requestAnimationFrame(step); else { travelling = false; done(); }
    };
    requestAnimationFrame(step);
  }

  // Levelling the wire by scrolling (74) is no longer a thing that has to be
  // done: an entry stands at its clause's own height, so the run is flat by
  // construction. What is left is making sure you can see where you just sent
  // your attention — bring the topmost site into a comfortable band, or leave
  // the page alone if it is already there. A patch uses its topmost site.
  // Bring the clause to the top of the page, because that is where the card
  // will unroll from — aiming for the middle of the screen (the first version
  // of this) left most of a tall decision card below the fold. A narrow accept
  // band, so a clause already up there doesn't get nudged for nothing.
  const READ_LINE = 150;

  // **Two target lines, because two different things are being brought into
  // view** (backlog 214). `READ_LINE` above is for arriving at a *card*: the
  // card unrolls downward out of its clause, so the clause wants to be high
  // with the screen below it free. A contents-rail click is reading rather than
  // acting — the reader wants the heading and as much of the section under it
  // as the window holds — so its line is the first readable one, immediately
  // under the sticky bar. The rule is *what is being brought into view*, never
  // which rail was clicked.
  //
  // Read at click time rather than cached at load: `--nav-h` is a CSS custom
  // property, and a cached copy would be a second source of truth for the
  // height of the bar.
  const navBarH = () => {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'));
    return Number.isFinite(v) ? v : 58;          // the token's own value, if it ever goes missing
  };
  // 14, because 58 + 14 is the 72 that this file has carried since the charter's
  // rail was written: the existing arrivals must not move by a pixel, or every
  // geometry baseline under design/tools acquires a delta about nothing.
  const HEAD_GAP = 14;
  const headLine = () => navBarH() + HEAD_GAP;

  // One path for every heading the contents rail points at, whoever supplied
  // the entry. It animates through `smoothScrollBy` and never `scrollIntoView`
  // or `behavior:'smooth'`, because `SESSION.smoothScrollBy` is the seam the
  // probes and the card-audit swap for an instant jump — a second way to move
  // the page would be a scroll none of them could hold still.
  function scrollToHeading(el, done) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    // a target with no layout box — a section hidden on this fixture — reports
    // a rect of all zeros, which would scroll the page to the top: a worse
    // answer than none
    if (!r.width && !r.height) return;
    smoothScrollBy(r.top - headLine(), done || (() => {}));
  }

  // **A rail click always arrives somewhere** (SURFACE M17, F9). An entry can
  // name a heading that is inside something *folded* — the constitution pile
  // shut over its own sections is the ordinary case, a prose heading shut over
  // the ones beneath it the other — and the rail goes on listing it, because a
  // contents list that hides what is folded is a worse contents list. Until
  // this existed the click cancelled the browser's own jump, `scrollToHeading`
  // found a target with no layout box and declined, and the reader was left
  // exactly where they were with nothing changed: the surface's own
  // `dead-click-nudge` complaint, one column to the left.
  //
  // The rail already **mirrors** the fold state — every entry carries its own
  // `sectoggle` — so this is a lookup rather than a new mechanism: walk out to
  // the entries at outer levels above this one and press the ones that read
  // shut, whoever bound them. Pressing the rail's own control is what keeps the
  // host's fold keys the host's business; nothing here knows what `cs-…` or
  // `ph:…` mean.
  const reachable = (id) => {
    const el = id && document.getElementById(id);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return !!(r.width || r.height);
  };
  const tocLvl = (li) => +((li.className.match(/lvl(\d)/) || [0, 9])[1]);
  // The chain of outer-level entries above this one, outermost last: each step
  // out is a strictly smaller `lvl`, which is the same reading of the rail that
  // `foldProse` and `buriedBy` make of their own columns.
  function foldedOver(id) {
    const links = [...tocEl.querySelectorAll('a[href^="#"]')];
    const i = links.findIndex((a) => a.getAttribute('href') === '#' + id);
    const li = i < 0 ? null : links[i].closest('li');
    if (!li) return [];
    const keys = [];
    let lvl = tocLvl(li);
    for (let j = i - 1; j >= 0 && lvl > 1; j--) {
      const up = links[j].closest('li');
      if (!up || tocLvl(up) >= lvl) continue;
      lvl = tocLvl(up);
      const b = up.querySelector('[data-sec-toggle]');
      if (b && b.getAttribute('aria-expanded') === 'false') keys.push(b.dataset.secToggle);
    }
    return keys;
  }

  // Unfold, then travel — and in that order, because the unfold is what puts
  // the heading somewhere to travel to. Each press rebuilds the rail, so the
  // control is re-found by its own key rather than held across the render.
  function travelToHeading(id) {
    if (!reachable(id)) {
      for (const k of foldedOver(id)) {
        const b = tocEl.querySelector('[data-sec-toggle="' + k + '"]');
        if (b) b.click();
      }
      // one reflow, so the scroll is measured against the layout the unfold
      // just made and not the one it replaced
      void document.body.offsetHeight;
    }
    scrollToHeading(id && document.getElementById(id), () => markCurrentSection());
  }

  const topTarget = (targets) => targets.reduce((a, c) =>
    (c.getBoundingClientRect().top < a.getBoundingClientRect().top ? c : a));
  // The clause a move is aimed at — a patch's topmost site, everyone else's only
  // one — as a selector that will still find it after the re-render.
  const holdSel = (id) => {
    // Opening the composer is the one case where the thing to hold still is not
    // in the document yet: the clause is about to *become* the card, and the
    // card puts a rationale field above the lanes, so the clause ends up ~80px
    // lower inside it than the paragraph was. Held by anything else, the words
    // under the caret slide down the screen at the exact moment you start
    // typing. So the composer names its own anchor, and everything above it
    // gives way instead. Measured: 82px of travel before, 0 after.
    const d = draftOf();
    if (d && d.id === id && d.focusKey) return '[data-key="' + d.focusKey + '"]';
    const t = wireTargets(id);
    if (!t.length) return null;
    const el = topTarget(t);
    return el.dataset.key ? '[data-key="' + el.dataset.key + '"]'
      : el.classList.contains('insert-anchor') ? '.insert-anchor[data-anchor="' + id + '"]'
      : el.classList.contains('sugg') ? '.sugg[data-card="' + id + '"]'
      : null;
  };

  // One scroll, and only one (Ed, 2026-08-16).
  //
  // There used to be a second pass here that levelled the *entry* against its
  // clause by scrolling further, so the wire read flat (Ed, 118). It was written
  // when the rail's geometry was different, and it had become the main reason
  // opening a card felt unsettled: the charter would rise to bring the clause to
  // the reading line, then immediately sink again to line the clause up with
  // wherever the entry had ended up in the pile. Two animations, usually in
  // opposite directions, for one click.
  //
  // It was also aiming at the wrong thing. An entry sits at its clause's own
  // height whenever it can, and the open entry gets first claim on that line —
  // so the wire is flat by construction and there is nothing to level. The only
  // time it isn't flat is when the rail is too crowded to grant the claim, and
  // then the pile position is an artifact of crowding, not a place the reader
  // asked to be taken. The rail already says as much where it does the piling:
  // an angled wire is the price of a full rail. Dragging the document to hide
  // that price moved the one thing the reader was actually looking at.
  // how much of a card's head must show for the head to count as on screen
  const HEAD_SHOWS = 56;
  // **Only as far as needed to fit** (Q1465): an opened card that runs off the
  // foot of the window rises until its commit row is in reach — and never so
  // far that its head leaves the top, so a card taller than the window keeps
  // its head and gives up its foot. After the unroll, never during it: the
  // three steps of an open do not overlap.
  function fitOpened(id) {
    const el = [...doc.querySelectorAll('.sugg')].find((c) => c.dataset.card === id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const by = Math.min(r.bottom - (innerHeight - HEAD_GAP), r.top - headLine());
    if (by > 1) smoothScrollBy(by, () => { layoutQueue(); drawWires(); });
  }

  function bringIntoView(id, done) {
    let targets = wireTargets(id);
    // **Every entry travels, whether or not its tab is drawn** (Ed, 2026-09-11:
    // *when I click on green ✔ tasks whose clauses are outside the viewport,
    // I'm not moved*). A wire target is a drawn tab, and a filed record in a
    // crowded pile has none until the pile opens — which happens *after* the
    // scroll, so the click opened the card somewhere off screen and looked
    // dead; a candidate on a heading had none either, `wireTargets` keeping
    // only paragraphs. The clause the entry stands beside is the fallback:
    // `anchorForEntry` is what levels the entry against it, so the two agree.
    if (!targets.length) { const a = anchorForEntry(id); if (a) targets = [a]; }
    if (!targets.length) { drawWires(); return done(); }
    const y = topTarget(targets).getBoundingClientRect().top;
    const arrive = () => { layoutQueue(); drawWires(); done(); };
    // **A card whose head is already on screen does not move the view** (Q1465,
    // Ed 2026-09-19: *a decision card whose top part is already on the screen
    // shouldn't move the view*; ruled *move only as far as needed to fit*). The
    // band that stood here left the page alone only between 100 and 300px and
    // carried everything else to the reading line — so pressing an entry whose
    // clause you were already looking at still slid the document under you.
    // Anywhere under the bar with its head showing, it stays; what a card low
    // in the window then owes — its ✓ row in reach — is `fitOpened`'s, after it
    // has unrolled, and by no more than it takes. `stayed` tells the open so.
    if (y >= headLine() && y <= innerHeight - HEAD_SHOWS) { layoutQueue(); drawWires(); return done(true); }
    smoothScrollBy(y - READ_LINE, arrive);
  }

  // Opening and closing a card changes the height of the document under the
  // scroll, so doing both in one frame makes the page lurch. Collapse the old
  // card, *then* move, *then* expand the new one — three steps, never overlapping.
  const REDUCED = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // **How wide is the screen** — one literal, the same one `system.css`'s
  // narrow rules key on (MOBILE.md §1.1), read per call and never captured:
  // `layoutQueue` and `drawWires` ask it on every pass, so a window crossing
  // the line re-lays on its next render without a reload.
  const NARROW_Q = '(max-width: 900px)';
  const NARROW = () => matchMedia(NARROW_Q).matches;
  // **The commit gesture is a switch** (backlog 184, Ed, 2026-08-28: *I'd like
  // to try this*). Every consequential commit on this product has been a hold:
  // the token flies for the length of the press and the act lands when it
  // arrives, and letting go early flies it home with nothing spent. The trial
  // keeps the whole of that — the same flight, the same length, the same
  // landing — and moves only what starts it: **a single click starts the
  // flight, the control is inert while it is in the air, and the act lands
  // when the flight lands**. Nothing is sent early, letting go no longer
  // cancels, and a second click during the flight does nothing.
  //
  // One constant, because *easy to revert* is the whole point: this word is
  // the only line to change. It lives here rather than in the page because
  // both files need it and this one loads first, and the page reads it as
  // `SESSION.gesture`. `?gesture=hold` is the by-eye comparison; the
  // `window.COMMIT_GESTURE_OVERRIDE` seam is the walks', a query being the one
  // thing a `page.addInitScript` cannot carry across a `goto`.
  //
  // Two frozen instruments are frozen against `click`: `card-copy.golden.json`
  // (the 🏛️ label follows the switch) and SURFACE §7.2's bold word, which
  // `spec-check` reads against this constant. So flipping the trial is this
  // word, that word, and a `npm run copy-freeze` — not one word.
  const COMMIT_GESTURE = 'click';
  const GESTURE = (() => {
    const ok = (v) => (v === 'hold' || v === 'click' ? v : null);
    try {
      const q = ok(new URLSearchParams(location.search).get('gesture'));
      if (q) return q;
    } catch (e) { /* no location, no query */ }
    return ok(window.COMMIT_GESTURE_OVERRIDE) || COMMIT_GESTURE;
  })();
  // A click during a transition supersedes it rather than being swallowed: each
  // sequence carries a token, and every step drops out if a newer one has begun.
  // `after` runs the moment the new card exists and the margin has been laid
  // out around it — before it finishes unrolling. That is where the composer
  // puts the caret back, so the character you typed and the caret that follows
  // it arrive in the same frame rather than a quarter of a second apart.
  // Every clause a suggestion stands at, whatever kind it is.
  const clauseKeysOf = (id) => {
    const g = SUGGS.find((x) => x.id === id);
    if (!g) return [];
    return [].concat(g.keys ?? [],
      (g.sites ?? []).flatMap((s) => s.keys ?? (s.key ? [s.key] : [])),
      (g.pair ?? []).map((c) => c.key)).filter(Boolean);
  };

  function toggle(id, scroll, after) {
    const closing = openId;
    const next = openId === id ? null : id;
    if (!closing && !next) return;
    // …and the host is told **whose** card is opening (Q1134): the editing card
    // is edit mode's own — a keystroke in edit mode is what opens it (K13) — so
    // it is not one of K31's *any other card opening*, and it must not leave.
    if (next && extra && extra.closeOthers) extra.closeOthers(next === DRAFT_ID);
    // **The pile shuts when the stack does** (Ed, 2026-08-17). Opening a
    // tab-stack always starts from the same place, filed decisions piled,
    // because being piled is a *posture of the closed stack* rather than a
    // setting you have chosen — and a preference you never set is one you will
    // not remember setting.
    //
    // It survives exactly one thing: moving between the tabs of one stack,
    // which is a single continuous piece of looking at a clause, and where
    // shutting the pile behind you would take away the row you just picked out
    // of. Everything else is arriving somewhere, and arriving starts piled.
    if (!next || !closing ||
        !clauseKeysOf(next).some((k) => clauseKeysOf(closing).includes(k))) {
      filedOpen.clear();
    }
    // Opening a filed record *is* opening the pile, however you got there — from
    // the queue, from a link, from the pile itself. Recorded as state rather
    // than inferred at paint time so that moving from it to a live card at the
    // same clause leaves the pile where you left it.
    if (next && SUGGS.some((g) => g.id === next && stateOf(g) === 'sealed' && !isUnread(g))) {
      clauseKeysOf(next).forEach((k) => filedOpen.add(k));
    }
    const my = ++seqToken;
    const alive = () => my === seqToken;
    pendingId = next;                             // keeps the wire drawn throughout
    travelSince = Date.now();                     // …and the polls off it (`travelling`)

    const settle = () => { if (!alive()) return; pendingId = null; drawWires(); };

    const thenMove = () => {
      if (!alive()) return;
      // Every fold change happens here, before anything is measured: letting go
      // of the last patch, unfolding whatever this card points into, and drawing
      // a patch's sites together. Then the document is still for the scroll —
      // and still where it was, because folding a section above you would
      // otherwise pull the charter up before the scroll had said anything.
      const ref = stillRef();
      let touched = restoreAutoFolds();
      if (!next) {
        if (touched) { renderToc(); renderAll(); restoreStill(ref); }
        return settle();
      }
      if (expandFor(next)) touched = true;
      if (foldBetweenSites(next)) touched = true;
      if (touched) { renderToc(); renderAll(); restoreStill(ref); }
      // Arrival, in a single frame: the card you were reading goes, the one you
      // asked for is put in, and the clause you have just travelled to is held
      // exactly where the scroll left it. Removing the old card usually takes
      // several hundred pixels out of the charter above here, so the scroll is
      // corrected by that much in the same frame — a move that cancels itself
      // and is therefore never seen.
      const open = (stayed) => {
        if (!alive()) return;
        const hold = holdSel(next);
        // **Where the held thing stood, in case its own card swallows it** (Ed's
        // screenshot from the residency room, 2026-09-19: *I clicked on this
        // queue card and this is where it opened* — the card's foot under the
        // topbar and its head 264px above the window). A gap race is held by its
        // `insert-anchor`, and since Q1379 an open gap card **replaces** its
        // anchor: after the render the selector finds nothing, `restoreStill`
        // falls through to the next paragraph down — which the newborn card has
        // just pushed — and the page chases that instead. Measured on the live
        // room: five switches of five onto a gap card landed at −252…−264, every
        // other at 117…259. The card's head is what stands where the anchor
        // stood, so it is held there.
        const heldEl = hold ? doc.querySelector(hold) : null;
        const heldTop = heldEl ? heldEl.getBoundingClientRect().top : null;
        keepStill(() => { openId = next; renderAll(); }, hold);
        focusOpenedCard(next);
        if (heldTop !== null && !doc.querySelector(hold)) {
          const born = [...doc.querySelectorAll('.sugg')].find((c) => c.dataset.card === next);
          const drift = born ? born.getBoundingClientRect().top - heldTop : 0;
          if (Math.abs(drift) > 0.5) scrollTo(0, scrollY + drift);
        }
        // the card made the document taller, so every entry below it has moved
        layoutQueue();
        if (after) after();
        expandCards(next, () => {
          if (!alive()) return;
          layoutQueue();
          if (stayed === true) fitOpened(next);
          settle();
        });
      };
      // The scroll runs with the old card still standing, so the geometry it
      // aims at cannot move underneath it; the swap happens on arrival.
      if (scroll) bringIntoView(next, open); else open();
    };

    // Closing with nothing to open is the one case where the collapse is worth
    // watching: nothing else is happening, so the card rolls up in place and the
    // charter closes over it. Everywhere else the old card leaves during the
    // move, where its going costs no motion of its own (Ed, 2026-08-16).
    if (closing && !next) {
      collapseCards(closing, () => {
        if (!alive()) return;
        openId = null;
        keepStill(() => renderAll());
        thenMove();
      });
    } else {
      thenMove();
    }
  }

  function act(id, what, siteKey) {
    // your own moves beat too — the pulse is *the room*, and you are in it
    if (what !== 'propose') beat();
    const s = SUGGS.find((x) => x.id === id);
    // ---- the composer ------------------------------------------------
    // "Propose something else", on a deadlocked race: the composer opens on the
    // clause, seeded from the current text, and nothing is spent by opening it.
    if (what === 'propose') { startDraft((s.keys ?? [])[0], null); return; }

    // Cancelling leaves nothing behind — no candidate, no cost, no trace in the
    // rail (Ed, 2026-08-16). That is what makes the always-on caret an offer
    // rather than a commitment.
    // **On a patch, a card's 🗑️ takes its own site and no other** (Q1306 (a),
    // Ed 2026-09-10): that card closes onto its paragraph, the draft stays open
    // at every other place, and the row at the foot of the window is still the
    // bin for the whole of it. A one-site draft is the whole draft, so its
    // card's 🗑️ and the row's mean the same thing.
    if (what === 'draft-cancel') {
      const d = draftOf();
      const own = d && d.sites.length > 1 ? siteFor(d, siteKey) : null;
      const key = own ? own.keys[0] : d && d.sites[0] ? d.sites[0].keys[0] : null;
      const shut = () => {
        if (own) dropDraftSite(own);
        else { if (openId === DRAFT_ID) openId = null; dropDraft(); }
        // the lanes become the paragraph again, and it does not move while they do
        keepStill(() => renderAll(), key ? '[data-key="' + key + '"]' : null);
        drawWires();
      };
      const ownCard = own && doc.querySelector('.sugg[data-card="' + DRAFT_ID + '"][data-site="' + key + '"]');
      if (ownCard) collapseCard(ownCard, shut);
      else if (openId === DRAFT_ID && !own) collapseCards(DRAFT_ID, shut);
      else shut();
      return;
    }

    // **The guard behind the follow** (Q1463, Ed 2026-09-18: *follow the
    // paragraph, and refuse if lost*). The follow re-keys a draft's sites as
    // the document moves under them; this asks the host, at the press and
    // against the text it is about to send a version number for, whether
    // every site's key still names the wording the site was written against —
    // a question answered with no reference to the follow, which is the whole
    // point of a backstop. Refused, nothing goes out, no edit is spent, and
    // the card says why in the slot every other refusal uses.
    const standDown = (d) => {
      const why = hooks.misaimed ? hooks.misaimed(d) : null;
      // a press that passes clears whatever the last one said
      if (!why) { d.refusal = null; return false; }
      d.refusal = why;
      if (openId === d.id) renderAll(); else toggle(d.id, false);
      return true;
    };

    // Proposing is the point of sale: this is where the edit is spent (SPEC
    // §3.3 — the stake is paid at submission), and the only place a price is
    // stated in words. The draft stops being a draft and becomes a candidate
    // like any other, so it takes a real id and frees the composer for the next
    // one; from your side it keeps the green, because you can still withdraw it.
    // **✒️ passes at once** (SPEC §9.7 rule 8, R-058, entry 160): the Founder's
    // amendment *is* the document the moment they submit it, so there is no
    // proposal, no stake and nothing left in the rail — the draft simply
    // leaves, and what replaces it is the document the host re-renders from.
    // A refusal comes back through `hooks.pen`, which puts the draft back
    // unproposed with the refusal on the card, exactly as `propose` does.
    if (what === 'draft-pen') {
      const d = draftOf();
      if (!d) return;
      if (standDown(d)) return;
      const shut = () => {
        if (openId === d.id) openId = null;
        const i = SUGGS.indexOf(d);
        if (i >= 0) SUGGS.splice(i, 1);
        if (hooks.pen) hooks.pen(d);
        renderAll();
        drawWires();
      };
      if (openId === d.id) collapseCards(d.id, shut); else shut();
      return;
    }

    if (what === 'draft-propose') {
      const d = draftOf();
      if (!d) return;
      if (standDown(d)) return;
      // **A re-made proposal is not a second one** (Q170): the draft was seeded
      // from a stranded proposal of yours and this press confirms *that*
      // candidate against the text as it now stands, so it keeps its id and the
      // edit it already cost. Nothing is staked here and nothing may be.
      const remake = !!d.rebaseOf;
      if (!remake && editsHeld < EDIT_RULES.stake) return;
      if (!remake) editsHeld -= EDIT_RULES.stake;
      const key = d.sites[0].keys[0];
      const wasOpen = openId === d.id;
      // **The card closes at the press, the way every other commit does**
      // (Q1485 (A), Ed 2026-09-21: *Close, and say so*). It stayed open
      // wearing a pressed *✏️ Submitted*, and a round trip later the refresh
      // took it away with no animation — so the one word saying the proposal
      // was in showed for as long as the host took and then vanished in a
      // snap. It collapses onto its clause first, and what says the thing is
      // in is the rail's own sentence, `flashProposed`. A refusal from the
      // wire re-opens the draft card under its sentence (`hooks.propose`).
      const send = () => {
        d.id = 'mine-' + key + '-' + (++mineSeq);
        d.unproposed = false;
        d.qLabel = d.sites[0].label;
        d.pct = 6;
        d.cap = T.yours.justIn + (d.signed ? T.yours.signedTail : '');
        if (hooks.propose) { const r = hooks.propose(d); if (typeof r === 'string') d.id = r; }
        if (wasOpen) openId = null;
        flashProposed(d.id);
        // **and the writing is over** (Q1485 (A)): the press consumed the
        // whole draft, every site of it, so the lifted column has nothing
        // left in it. Asked of the model rather than assumed, because that is
        // the rule Ed gave — *edit mode ends where no other draft site is left*.
        if (EDITING() && !draftOf()) LEAVE_EDITING();
        keepStill(() => renderAll(), '[data-key="' + key + '"]');
        layoutQueue(); drawWires();
      };
      if (wasOpen) collapseCards(d.id, send); else send();
      return;
    }

    // **Re-make it here** (Ed, 2026-09-14, Q170; SURFACE E38). The text moved
    // under this proposal and the engine could not carry it across (SPEC §2.4),
    // so the act that saves it is writing it again against the clause as it now
    // reads — which is the composer, seeded from your own wording, the way ✏️
    // on a lane seeds it from somebody else's (K24).
    //
    // The stranded entry **becomes** the draft rather than standing beside one:
    // there is one caret and one draft (Q266), and two entries of your own at
    // one clause would be two readings of the same object. Its sites already
    // hold exactly what the seed would be — the wording you proposed as the
    // text, the clause as it now stands as the origin, which is what the lane
    // marks the change against — so nothing is re-derived and the rationale and
    // the sign choice travel with it. `rebaseOf` is the whole of what is new:
    // the id the commit confirms, instead of opening a second proposal.
    if (what === 'draft-remake') {
      if (!s || !(s.sites || []).length) return;
      const other = draftOf();
      if (other && other !== s) dropDraft();
      const key = s.sites[0].keys[0];
      const wasOpen = openId === id;
      s.rebaseOf = s.candidate || null;
      s.id = DRAFT_ID;
      s.unproposed = true;
      s.stranded = false;
      s.focusKey = key;
      s.qLabel = s.sites[0].label || s.qLabel;
      s.cap = '';
      s.pct = 0;
      syncDraftKeys(s);
      if (wasOpen) openId = DRAFT_ID;
      // 📝 is the door to a caret (SURFACE K13), and this press is a door too
      if (!EDITING()) ENTER_EDITING();
      keepStill(() => renderAll(), '[data-key="' + key + '"]');
      layoutQueue(); drawWires();
      return;
    }

    // Withdrawal returns the stake in full (SPEC §3.3a, §7): charging somebody
    // to tidy up would price exactly the behaviour worth encouraging. It is the
    // reason a proposal of yours stays pinned — there is always an act
    // available, and a significant one (Ed, 240).
    if (what === 'draft-withdraw') {
      // The rect is read before anything moves: the card is about to collapse
      // out from under the button, and the pencil is fixed-positioned, so the
      // launch point has to be the one the button occupied when you pressed it.
      const btn = doc.querySelector('.sugg[data-card="' + id + '"] [data-act="draft-withdraw"]');
      const before = editsHeld;
      editsHeld = Math.min(EDIT_RULES.cap, editsHeld + EDIT_RULES.stake);
      // At the cap there is nothing to fly: the refund is real but the wallet
      // cannot hold it, and a pencil landing in a full tray would say otherwise.
      if (btn && editsHeld > before) refundFlight(btn.getBoundingClientRect(), before);
      const shut = () => {
        if (openId === id) openId = null;
        const i = SUGGS.findIndex((x) => x.id === id);
        if (i >= 0) SUGGS.splice(i, 1);
        if (hooks.withdraw) hooks.withdraw(id);
        renderAll();
        drawWires();
      };
      if (openId === id) collapseCards(id, shut); else shut();
      return;
    }
    // 🛡️ on the Text (R-056): the Founder's two answers. Accept adopts what
    // the room passed, Refuse retires it — either way the question is
    // answered, so the entry leaves the rail with the card. The outcome
    // words are the module's (`accept` / `reject`); the *card* says Refuse,
    // which is the Founder's word for it (SURFACE §9).
    if (what === 'crown-accept' || what === 'crown-refuse') {
      const outcome = what === 'crown-accept' ? 'accept' : 'reject';
      const question = s && s.question;
      const shut = () => {
        if (openId === id) openId = null;
        const i = SUGGS.findIndex((x) => x.id === id);
        if (i >= 0) SUGGS.splice(i, 1);
        if (hooks.crownAnswer) hooks.crownAnswer(question, outcome);
        renderAll();
        drawWires();
      };
      if (openId === id) collapseCards(id, shut); else shut();
      return;
    }
    // Without lane letters, a race verdict has to name the text itself (197).
    // The first few words are enough to recognise, and they are the words the
    // member actually chose rather than a position on a screen.
    // the words alone: a text carries its block markers since Q1406
    const quote = (t) => '“' + String(t || '').replace(/^(#{1,3}|-)\s+/gm, '').split(/\s+/).slice(0, 6).join(' ') + '…”';
    // the verdict names the item's own pair (Q1367)
    const sv = s;
    const verdict =
      what === 'approve' ? T.verdict.approve
      : what === 'keep' ? T.verdict.keep
      : what === 'first' ? T.verdict.matters(s.pair ? '“' + s.pair[0].name + '”' : T.verdict.theFirst)
      : what === 'second' ? T.verdict.matters(s.pair ? '“' + s.pair[1].name + '”' : T.verdict.theSecond)
      : what === 'a' ? T.verdict.preferred(quote(sv.race && sv.race.a.text))
      : what === 'b' ? T.verdict.preferred(quote(sv.race && sv.race.b.text))
      : what === 'indifferent' ? (s.kind === 'diagonal' ? T.verdict.equal : T.verdict.indifferent)
      : T.verdict.skipped;
    // **🗑️ on a judgment clears the choice and closes** (CP7, Q1102): the bin
    // puts back un-actioned input only (C4), so an uncommitted pick clears and
    // a cast vote stays on the record exactly as it stood.
    if (what === 'clear-close') {
      const s0 = SUGGS.find((x) => x.id === id);
      if (s0 && !resolved.has(pairKeyOf(s0))) s0.pick = null;
      const shut = () => { if (openId === id) openId = null; renderAll(); drawWires(); };
      if (openId === id) collapseCards(id, shut); else shut();
      return;
    }
    // **❄️ cools the flame and closes the card** (Ed, 2026-08-17). It is not a
    // judgment, so nothing about the race changes and no evidence is touched —
    // the entry simply stops being eligible for 🔥 and the next most urgent
    // question takes it. Closing on the way is the whole gesture: *not this one,
    // not now* means you are going somewhere else, and leaving the card open
    // behind you would be the surface disagreeing.
    //
    // Un-cooling does **not** close, because there you are coming back to it.
    if (what === 'chill') {
      const on = !chilled.has(id);
      if (on) chilled.add(id); else chilled.delete(id);
      if (hooks.chill) hooks.chill(id, on);
      const shut = () => {
        if (openId === id) openId = null;
        if (restoreAutoFolds()) renderToc();
        renderAll();
        drawWires();
      };
      if (on && openId === id) collapseCards(id, shut); else { renderAll(); drawWires(); }
      return;
    }
    // **Submitting closes the card and files it as ⏳** (Ed, 2026-08-22, Q576 —
    // reversing Ed, 217, which kept it open so the pressed tick could be read).
    // A judgment is a commit like every other on the surface, and every other
    // commit closes; the ⏳ tab in the gutter is the receipt that says
    // *revisable and still running*, and clicking it reopens the card to
    // revise. The card runs its closing motion onto its own paragraph, the
    // queue entry re-renders around it.
    // **A judgment is about a pair, and the item is the pair** (Q1200, Q1201,
    // Q1367). The receipt fires on the first judgment of each pair, every
    // one being a commit, and the host is told which pair the verdict goes
    // back on.
    const key = pairKeyOf(s);
    // **one press, one judgment** (issue #37): `firstTime` is read at the
    // press and `resolved.add` runs in the timeout below, so a double-click
    // sent `judge-race` twice — the second refused as *not in a live race*,
    // a refusal shown for a vote that worked. The pair is held until the
    // first one has been filed.
    if (pendingJudge.has(key)) return;
    pendingJudge.add(key);
    const pair = activeCardOf(s);
    const firstTime = !resolved.has(key);
    const btn = queueEl.querySelector('[data-q="' + id + '"]');
    if (firstTime && btn) btn.classList.add('leaving');
    setTimeout(() => {
      pendingJudge.delete(key);
      verdicts.set(key, verdict);
      picked.set(key, what);
      committed.set(key, what);      // this is now the thing on the record
      resolved.add(key);
      justArrived = firstTime ? key : null;
      if (hooks.judge) hooks.judge(id, what, pair);
      const held = !!document.activeElement && !!document.activeElement.closest &&
        !!document.activeElement.closest('.sugg[data-card], [data-patchrow]');
      const shut = () => { if (openId === id) openId = null; renderAll(); drawWires(); if (held) focusTabOf(id); };
      if (openId === id) collapseCards(id, shut); else shut();
    }, firstTime && btn ? 240 : 0);
  }

  // contents-rail: the document's own headings, in document order.
  // The same lifecycle marks, in the contents rail (Ed, 177): each heading
  // carries the marks of the questions inside it, so the shape of the session
  // is legible from the left as well as the right. Ownership is innermost —
  // a mark appears on exactly one line — except that a *folded* heading takes
  // its descendants' marks, since they have no line of their own while it is
  // shut. In document order, capped, with an overflow count.
  const TOC_MARKS = 4;

  // Everything the charter is being asked about inside a heading, in document
  // order. A patch appears once per section it touches, not once per site.
  function entriesForSection(n) {
    return queueEntries().filter((e) => {
      if (e.n !== 1) return false;
      const secs = suggestionSections(e.g.id);
      return collapsed.has(n)
        ? secs.some((m) => m === n || ancestorsOf(m).includes(n))
        : secs.includes(n);
    }).map((e) => e.g);
  }

  // A challenged paragraph wears the same colour as its queue card (Ed, 200):
  // the lifecycle hue, not a generic "under challenge" yellow, so the charter
  // itself becomes readable by state. A filed decision washes nothing at all —
  // its clause is settled and the document should look settled — while an
  // unacknowledged one keeps a tint, because it still owes you something.
  const anchHue = (g) => {
    const st = stateOf(g);
    // Green is for what **changed**, not for what pinned itself: a retired
    // decision you judged holds a slot in the margin because you are owed an
    // answer, and it still moved nothing, so it stays grey.
    if (st === 'sealed') return isUnread(g) ? (carried(g) ? 'changed' : 'closed') : null;
    // **A stranded proposal is red** (Q1484, Ed 2026-09-21: *make the card a
    // colour that suggests something needs to be done (red?)* → *Red entry,
    // words unchanged*). It is yours and it is waiting on you, so under Q170
    // it took the ordinary `yours` blue — and blue says *yours* and nothing
    // more, which is the whole of what Ed watched a proposer fail to read.
    // One hue in three columns, as this function exists to guarantee: the
    // rail entry's ground, the clause's gutter tab, and the head of the card
    // the entry opens all follow from here.
    if (st === 'yours') return g.stranded ? 'wrong' : 'yours';
    // ⚔️ is tested **before** ⏳, because it is the state that replaces it: you
    // have judged, and where an ordinary race would now go grey and run on
    // without you, this one still wants something. Yellow, still — the palette's
    // rule is hot for actions, and a bridge is an action; what changed is which
    // action, and that is the glyph's job to say, not the hue's.
    if (stuck(g)) return 'open';
    if (st === 'deciding') return g.shifted ? 'closed' : 'deciding';
    // a diagonal asks for a *ranking*, not a judgment about a wording, so it
    // gets its own hot hue rather than borrowing a proposal's (Ed, 2026-08-17)
    if (g.kind === 'diagonal') return 'weigh';
    // **🔥 is yellow** (Ed, 2026-08-17). It had a hue of its own, and the
    // question that retires it is the one the palette has been asked all day:
    // what does this colour say that nothing else on the card says? A flame is
    // *an ordinary judgment that wants you most* — the same kind of thing as a
    // bulb, with a priority on it — so a hue of its own was claiming a
    // difference in kind to express a difference in degree.
    //
    // Degree is already drawn, and better: `washCol` sets a wash's alpha from
    // its urgency, so the flame comes out the **deepest yellow in the rail**
    // without a second hue. Same colour, more of it, which is what more-urgent
    // actually means. The glyph says the rest.
    return 'open';
  };
  // Keyed by the clause rather than by the element, so the paragraph and the
  // head of the card that swallows it are one washed thing: opening a card
  // deepens the clause's colour rather than repainting it, and the deepening
  // is visible as a movement (Ed, 2026-08-17).
  const anchWash = (g, active, key) => {
    const hue = anchHue(g);
    return washAttrs('doc:' + (key ?? (g.keys ?? [])[0] ?? g.id),
      hue ? tint(hue, active ? 0.30 : 0.17) : 'transparent');
  };

  // **The state, not the glyph.** Two states share one picture — a filed tick
  // and an adopted one are the same check, one of them desaturated — so
  // everything that used to compare marks compares *kinds* instead. It also
  // collapses the duplicated ternary that markOf and its colour lookup had
  // each grown.
  const markKindOf = (g) => {
    const st = stateOf(g);
    // the third filed mark (Q469): a race unresolved at the close is
    // *undecided*, distinct from kept — the pause button, grey from the start
    return st === 'sealed' ? (g.undecided ? 'filedUndecided'
                              : isUnread(g) ? (carried(g) ? 'adopted' : 'retired')
                                          : (carried(g) ? 'filedYes' : 'filedNo'))
      // ✏️ all the way to the seal (Ed, 260). It had been ✏️ while unproposed
      // and then the ordinary 💡, on the reading that a proposal of yours is a
      // proposal like any other and green says whose. That works wherever the
      // green goes with it — but the contents rail then drew marks with **no
      // colour** (it draws them in their own hue since Q288, the marks being
      // drawn), so up there your work and somebody else's were the same bulb,
      // and a section holding only your own proposals looked like a section
      // wanting your judgment. The pencil means *you wrote this*, which is the
      // rule 241's own note was already reaching for: subject and act agree,
      // because in both cases it is you, writing.
      // **A stranded proposal is still yours, and says what happened to it**
      // (Ed, 2026-09-14, Q170; SURFACE E38): the text was replaced under it and
      // the engine could not carry it across, so it is out of every race and
      // held until you re-make it here or withdraw it. ↻ — the ground moved —
      // in `yours` blue rather than the judge's grey, because unlike E16 it is
      // asking you for something.
      : st === 'yours' ? (g.stranded ? 'stranded' : 'propose')
      // before ⏳, and for the same reason `anchHue` tests it first: ⚔️ is what
      // a race becomes *instead of* going quiet on you
      : stuck(g) ? 'stuck'
      : st === 'deciding' ? (g.shifted ? 'shifted' : 'deciding')
      : g.kind === 'diagonal' ? 'weigh'
      : g.id === topUrgentId ? 'urgent'
      : 'needs';
  };
  // `markOf` — the bare glyph, unwrapped — is gone (Q288). Every mark is drawn
  // now, so a site that printed the glyph without `mkHtml`'s `.mk-<kind>` span
  // printed one the palette could not reach; the gap anchor's tab was the last
  // such site and it is the same `mkHtml(markKindOf(g))` as every other tab.

  // When more marks than fit, the space goes to whatever still wants something
  // from you (Ed, 178). Filed decisions go first, then the states with nothing
  // to do at all, and an open question is the last thing to be dropped.
  // 🌶️ is in the list (Q607, 2026-08-22): a diagonal asks for a judgment, so it
  // is kept ahead of the states that only tell you where things stand, and
  // behind ✏️ for the reason the next comment gives. The third filed mark,
  // undecided, files with the other two — they are one family, dropped first.
  // ↻ blue sits immediately ahead of ✏️ (Q170): it is a proposal of your own
  // like any other, and the act on it is larger — a proposal nobody can carry
  // across but you, against text that has already moved once.
  const KEEP_ORDER = ['urgent', 'stuck', 'stranded', 'propose', 'weigh', 'needs', 'adopted', 'retired', 'deciding', 'shifted', 'filedYes', 'filedNo', 'filedUndecided'];
  // the three filed marks — ✔ ✖ and undecided — as one set, so a rule about
  // *filed* cannot quietly apply to two of them (Q607)
  const FILED_KINDS = new Set(['filedYes', 'filedNo', 'filedUndecided']);
  const keepRank = (kind) => {
    const i = KEEP_ORDER.indexOf(kind);
    return i < 0 ? KEEP_ORDER.length : i;
  };

  // **What sits at the front of a tab stack** (Ed, 2026-08-17). The stack has
  // one click target, so something has to be in front, and having to answer that
  // settles 294's *order* question by making it consequential — before the stack
  // the gutter drew tabs in `SUGGS` order, which is fixture order, which is
  // arbitrary, and which was harmless only because every tab was its own target.
  //
  // It is **not** `KEEP_ORDER`, and the difference is worth naming because the
  // two look like the same list. The rail ranks by **what must not be lost**:
  // there ✏️ sits third, above 💡, because a proposal of your own carries the
  // largest remaining act and dropping it off screen is worse than dropping one
  // 💡 out of many. The stack ranks by **what most wants you**, because the
  // front tab is the one that opens — and ✏️ wants nothing at all. It is your
  // own work, waiting; you do not click into a pile to be shown it. So the hot
  // marks lead (🔥 ⚔️ 💡 🌶️), then the decisions owed an acknowledgement, then
  // your own, then the ones that are only telling you where things stand.
  //
  // Retention and priority are different questions with the same-looking answer,
  // and this is the first place on the surface where they disagree: § Bringing a
  // Guest holds a ✏️ of yours and two 💡, and under the rail's order clicking
  // that pile opened your own draft.
  // ↻ blue leads ✏️ here for the same reason it does in the rail, and for once
  // the two orders agree about a mark of your own: unlike a proposal in the
  // race, a stranded one *is* waiting on an act of yours, so opening its pile
  // should reach it before it reaches work that is merely yours (Q170).
  const STACK_ORDER = ['urgent', 'stuck', 'needs', 'weigh', 'adopted', 'retired',
    'stranded', 'propose', 'deciding', 'shifted', 'filedYes', 'filedNo', 'filedUndecided'];
  const stackRank = (kind) => {
    const i = STACK_ORDER.indexOf(kind);
    return i < 0 ? STACK_ORDER.length : i;
  };
  // Lifecycle first, then leverage — the same two keys, in the same order, that
  // the rail sorts by within a clause (see `leverage`). Two 💡 at one clause tie
  // on the first, and until they were made to agree the gutter fell through to
  // fixture order while the rail promoted the more urgent, so the front tab and
  // the rail entry were different judgments about the same clause.
  const stackOrder = (gs) =>
    gs.slice().sort((a, b) => stackRank(markKindOf(a)) - stackRank(markKindOf(b)) ||
      leverage(b) - leverage(a));

  function tocMarksHtml(n) {
    // **☑️ is not in the contents rail** (Ed, 2026-08-17). It was already the
    // first thing dropped when the marks would not fit; the rule this makes is
    // simply the honest version of that — a filed decision is finished, and the
    // rail is the one column read as *where is there anything*. In the gutter it
    // still stands beside its clause, because there the question is *what has
    // happened here*, which is a different question with a different answer.
    // The `+n` tally counts what it hides, so a section of nothing but filed
    // decisions now reads as empty rather than as a row of ticks.
    const marks = entriesForSection(n).map(markKindOf).filter((k) => !FILED_KINDS.has(k));
    if (!marks.length) return '';
    // choose by what is actionable, then draw in document order
    const keep = new Set(marks.map((m, i) => [m, i])
      .sort((a, b) => keepRank(a[0]) - keepRank(b[0]) || a[1] - b[1])
      .slice(0, TOC_MARKS).map(([, i]) => i));
    const shown = marks.filter((_, i) => keep.has(i));
    // the `.run` is the marks' own box — their ground and their width — inside
    // a zero-width span, so they queue rightwards out of the rail (Q1384)
    return '<span class="tocmarks" aria-hidden="true"><span class="run">' + shown.map(mkHtml).join('') +
      (marks.length > shown.length ? '<span class="more">+' + (marks.length - shown.length) + '</span>' : '') +
      '</span></span>';
  }

  function renderToc() {
    const heads = DOC.filter((l) => l.t === 'h');
    tocEl.innerHTML = (extra && extra.tocLead ? extra.tocLead() : '') + heads
      .map((h, i) => buriedBy(i) ? '' :        // a folded part closes its branch of the rail too
        '<li class="lvl' + (h.level ?? 1) + '">' + toggleHtml(i) +
        '<a href="#sec-' + i + '" data-toc="' + i + '">' + esc(h.x) + '</a>' + tocMarksHtml(i) + '</li>')
      .join('');
    tocEl.querySelectorAll('[data-sec-toggle]').forEach((b) => {
      if (!/^\d+$/.test(b.dataset.secToggle)) return;   // the host's own fold keys are its business
      b.addEventListener('click', (ev) => { ev.preventDefault(); toggleSection(+b.dataset.secToggle); });
    });
    tocEl.querySelectorAll('[data-toc]').forEach((a) =>
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const n = +a.dataset.toc;
        // A heading with exactly one question in it *is* that question, so
        // clicking it opens the card rather than merely arriving nearby
        // (Ed, 179). With several, there is nothing to disambiguate on and it
        // stays what it was: navigation.
        const only = entriesForSection(n);
        if (only.length === 1 && openId !== only[0].id) return toggle(only[0].id, true);
        // same owned animation as the queue-wire, and clear of the sticky navbar
        travelToHeading('sec-' + n);
      })
    );
    // Everything the host contributed above the charter's own headings — the
    // Constitution pile head, one entry per live constitution section, the
    // title, and the founder's prose headings — is a bare in-page anchor with
    // no `data-toc`, so nothing bound it, the browser handled it, and the
    // heading arrived instantly at y = 0: underneath the sticky bar, which is
    // to say the one word the reader had just clicked was the one thing they
    // could not see (Ed, QA of batch S).
    //
    // Bound here by selector rather than by a marker attribute the lead would
    // have to emit: `setup-probe.js` hashes `#toc`'s outerHTML, so a cosmetic
    // `data-` hook would turn a behaviour-only change into a reference
    // re-freeze. And it is bound in this file rather than in the page's
    // `afterToc` because the rail's navigation is the rail's, whoever supplied
    // the entry — one handler is what stops the two halves drifting apart
    // again.
    tocEl.querySelectorAll('a[href^="#"]:not([data-toc])').forEach((a) =>
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        // the id off the anchor's own href, never a guessed prefix: the lead
        // emits four kinds (#cs-constitution, #cs-<key>, #dochead, #h<i>)
        const id = (a.getAttribute('href') || '').slice(1);
        travelToHeading(id);
      })
    );
    if (extra && extra.afterToc) extra.afterToc();
  }

  // The rail follows the reader: the last heading to have crossed the top.
  function markCurrentSection() {
    const links = tocEl.querySelectorAll('[data-toc]');
    let current = 0;
    links.forEach((a, i) => {
      const el = document.getElementById('sec-' + i);
      if (el && el.getBoundingClientRect().top <= 120) current = i;
    });
    links.forEach((a, i) => a.classList.toggle('current', i === current));
  }

  // Order matters. The document first: the right rail measures against it, so
  // its anchors must exist before the margin can be laid out. Then the queue,
  // which settles which card is most urgent. Then the contents rail, whose
  // marks depend on both — it now carries lifecycle state (177), so it can no
  // longer be rendered only when the fold tree changes.
  // ---- the flights and the ✏️ wallet -----------------------------------
  // design/flights.js since refactor Q1352 (h): made here, where the code
  // stood. The five names it reads out of this file are every one of them
  // reassigned after load, so each goes in as an accessor rather than a
  // value — and `walletGhost` comes back as a property, because the propose
  // hold below still sets it raw, without a render.
  const FLIGHT = window.FLIGHTS.make({
    REDUCED, NARROW,
    dripIn: (...a) => dripIn(...a),
    get walletEl() { return walletEl; },
    get editsHeld() { return editsHeld; },
    get editsToNext() { return editsToNext; },
    get EDIT_RULES() { return EDIT_RULES; },
    get closedMode() { return closedMode; },
  });
  const { arcFrames, refundFlight, flyGlyph, nudgeHome, pencilStorm,
    setWalletHeld, setWalletGhost, setWalletTitle, renderWallet,
    applyLean, startLean, stopLean, addSpendProbe, resumeLean } = FLIGHT;

  // How long until the next edit arrives. The drip is one per tenth of the
  // window (SPEC §7), so what is left of the current tenth is the wait. Stated
  // to the second (Ed, 2026-08-17) — a wallet you are waiting at wants a clock,
  // not a rounding, and the seconds are what make it read as running.
  function dripIn() {
    // a live wallet has no clock of its own yet — the view says how many you
    // hold and nothing about when the next lands, so the tray says nothing
    // rather than inventing a time (stage 8; the title still says it accrues)
    if (!isFinite(SESSION_MINUTES)) return '';
    const secs = Math.max(0, Math.round((1 - Math.max(0, Math.min(1, editsToNext))) * SESSION_MINUTES * 6));
    const m = Math.floor(secs / 60), s = secs % 60;
    // mm:ss (Ed, 2026-08-17) — a clock reads as a clock, and the fixed shape
    // stops the row twitching as the digits change
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  /**
   * **The same wait, as a moment rather than a reading** (Q1486 (E), Ed
   * 2026-09-21: *dark, with ✏️ hh:mm countdown*). `dripIn` is what the tray
   * shows, recomputed at every render; a countdown that ticks under a press
   * needs one absolute instant it can be patched against, so this answers
   * when the next ✏️ lands and `abstainNoteHtml`'s clock does the rest.
   *
   * Null where there is nothing to wait for: at the cap the wallet cannot
   * take another, and a document whose rate drips at all is the only one
   * with a moment to name (`SESSION_MINUTES` is Infinity otherwise, live and
   * in the fixture alike). Both live and fixture arrive at the same number —
   * `syncWallet` sets `editsToNext` to `1 - nextDripInMs / dripIntervalMs`
   * and `SESSION_MINUTES` to a sixth of the interval in seconds, so the
   * product below *is* `nextDripInMs`.
   */
  function dripAtMs() {
    if (!isFinite(SESSION_MINUTES)) return null;
    if (editsHeld >= EDIT_RULES.cap) return null;
    const left = Math.max(0, 1 - Math.max(0, Math.min(1, editsToNext))) * SESSION_MINUTES * 6 * 1000;
    return Date.now() + left;
  }

  // settleWashes before the wires, and both after everything else. Every washed
  // element has just been rendered wearing its *previous* colour, and
  // settleWashes is what hands it the new one so the transition has something
  // to run from (Ed, 2026-08-17).
  //
  // The wires have to come **after** it, because a cable takes its colour by
  // reading its own rail entry's `--washcol` — and until the washes settle, that
  // is still the previous colour. Drawn first, the cable read the old value and
  // nothing ever redrew it, so it kept the hue of a state its card had left
  // (Ed, 2026-08-17: *cables don't change colour when the cards change colour*).
  // The wire's own fade is unaffected by the order: it carries its previous
  // value in `prevWire` rather than reading it off the DOM.
  // **Where the keyboard stands survives the column being rebuilt** (Q1397,
  // Ed 2026-09-22: focus stays on the card after an act). `renderAll` rebuilds
  // every card, tab and entry wholesale, so the element holding focus stopped
  // existing on every render and a keyboard was dropped back to the top of the
  // page. The focused control is named by what it is — a card's lane or act,
  // a clause tab — and found again after the rebuild. A caret has keepers of
  // its own (`heldCaret`, the lane's `remark`), so editables are left alone.
  const focusKeep = () => {
    const a = document.activeElement;
    if (!a || a === document.body || !doc.contains(a) || a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return null;
    const card = a.closest('.sugg[data-card]');
    if (card) return { card: card.dataset.card, v: a.dataset.v || null, act: a.dataset.act || null, anchor: a.dataset.anchor || null };
    const tab = a.closest('.achip[data-anchor]');
    return tab ? { tab: tab.dataset.anchor } : null;
  };
  const focusRestore = (k) => {
    if (!k) return;
    const q = (v) => String(v).replace(/["\\]/g, '\\$&');
    let el = null;
    if (k.card) {
      const card = doc.querySelector('.sugg[data-card="' + q(k.card) + '"]');
      if (!card) return;
      el = (k.v && card.querySelector('[data-v="' + q(k.v) + '"]')) ||
        (k.act && card.querySelector('[data-act="' + q(k.act) + '"]')) ||
        (k.anchor && card.querySelector('.achip[data-anchor="' + q(k.anchor) + '"]'));
    } else if (k.tab) {
      el = doc.querySelector('.achip[role="button"][data-anchor="' + q(k.tab) + '"]');
    }
    if (el && document.activeElement !== el) { try { el.focus({ preventScroll: true }); } catch (e) { /* gone */ } }
  };
  // **Opening puts the keyboard on the main decision** (SURFACE C5, Q1397):
  // the chosen lane, else the first, never the commit row; a card with no
  // lane — a record — takes its own tab in the strip, which is inside it.
  // The editing card is the caret's (K13) and is left to the composer.
  const focusOpenedCard = (id) => {
    if (id === DRAFT_ID) return;
    const card = [...doc.querySelectorAll('.sugg[data-card]')].find((c) => c.dataset.card === id);
    // the tab pressed rides into the card's strip, so the keyboard may already
    // be inside — it still goes on to the decision, unless it is on one
    if (!card || (card.contains(document.activeElement) && document.activeElement.matches('[data-v]'))) return;
    const el = card.querySelector('[data-v][aria-checked="true"]:not([disabled])') ||
      card.querySelector('[data-v]:not([disabled])') ||
      card.querySelector('.achip[role="button"]');
    if (el) { try { el.focus({ preventScroll: true }); } catch (e) { /* gone */ } }
  };
  // …and **an act that closes a card hands the keyboard to its tab**
  // (Q1397): the card runs back onto its paragraph and the tab is what stands
  // there, so a keyboard carries on from the card it acted on
  // A tab filed behind others in its pile is inert (`behind`), so the pile's
  // front tab — the way back into that clause — takes the keyboard instead.
  const focusTabOf = (id) => {
    const mine = [...doc.querySelectorAll('.achip[data-anchor]')].filter((x) => x.dataset.anchor === id && !x.closest('.sugg'));
    const t = mine.find((x) => x.getAttribute('role') === 'button') ||
      (mine[0] && mine[0].closest('.chipcol') && mine[0].closest('.chipcol').querySelector('.achip[role="button"]'));
    if (t) { try { t.focus({ preventScroll: true }); } catch (e) { /* gone */ } }
  };
  function renderAll() {
    const kept = focusKeep();
    // `layoutQueue` belongs here rather than at each call site (Ed, 2026-08-17:
    // *when I resolve the 🔥 card, a new one should appear in my sidebar
    // immediately, rather than me having to deselect it first*). The rail was
    // being rebuilt without being laid out, so the entry promoted to 🔥 by the
    // judgment sat at its clause's own position — six thousand pixels down —
    // until the next scroll or card-close happened to run the layout. A rebuilt
    // rail always needs positioning; making that a rule rather than a habit at
    // eight call sites removes the whole class of bug. It is idempotent, so the
    // sites that still call it explicitly are harmless.
    settleTopUrgent(); renderDoc(); renderPatchRow(); renderQueue(); renderToc();
    markCurrentSection(); renderWallet(); settleWashes(); settleLift(); layoutQueue(); drawWires();
    // the host's riding tab carries the draft's count (backlog 204) — a DOM
    // poke on the host's side, never a render, so this cannot recurse
    if (hooks.rendered) hooks.rendered();
    focusRestore(kept);
  }

  // **The patch row** (Q1382, Ed 2026-09-15: *the vote for a patch is also
  // floating, since there is no single card for it to sit on*). A patch race
  // is a card at every site it touches (§9's patch row) and one judgment for
  // all of them, so its bar of acts — no 🗑️ since Q1500, ❄️
  // where the race offers it, ✓ commits the pick — is drawn once, in the
  // door's own slot at the foot of the window, while a patch card is open;
  // the site cards keep their radios and the Indifferent block and carry no
  // button. Read mode only: opening any card leaves edit mode. The door steps
  // aside for it (`.doc.patchrow`, system.css) and is back when the card
  // closes. The acts are the card's own, dispatched by the race's id.
  function renderPatchRow() {
    const mount = document.getElementById('patchrow');
    if (!mount) return;
    const s = SUGGS.find((x) => x.id === openId && x.kind === 'patch');
    const on = !!s && !EDITING() && !closedMode;
    const host = document.getElementById('doc');
    if (host) host.classList.toggle('patchrow', on);
    mount.innerHTML = on ? commitBarHtml(s, '', 'proposalrow') : '';
    if (!on) return;
    mount.querySelectorAll('[data-act]').forEach((b) =>
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const what = b.dataset.act === 'submit' ? pickOf(s) : b.dataset.act;
        if (!what) return;
        act(s.id, what);
      })
    );
  }

  // **A keystroke in read mode enters edit mode with that character applied**
  // (backlog 204). The host hears it — a non-editable column is not a keydown
  // target, so the listener is the document's and the host filters — and
  // hands the character here: applied at the caret if the reader has put one
  // in a block, else at the end of the last clause, exactly as always-on
  // typing would have applied it.
  function typeAt(ch) {
    if (!MAY_PROPOSE() || closedMode) return false;
    const picked = selectedBlocks();
    let p = picked && picked.blocks.length === 1 ? picked.blocks[0] : null;
    // a caret on the column itself — its whitespace, a select-all — picks no
    // block and is refused, exactly as always-on typing refuses it (the
    // journey's *host caret* case); the fallback below is for no caret at all
    const sel0 = getSelection();
    if (!p && sel0 && sel0.rangeCount && doc.contains(sel0.getRangeAt(0).startContainer)) return false;
    if (!p) {
      const all = [...doc.querySelectorAll('.editable[data-key]')].filter((el) => !el.closest('.sugg') && !el.classList.contains('gap'));
      p = all[all.length - 1] || null;
    }
    if (!p) return false;
    const key = p.dataset.key;
    const sel = picked && picked.blocks[0] === p ? caretRangeIn(p) : null;
    const src = sourceTextFor(key);
    // an offset in the column is an offset into the source line (Q1467), and
    // so is the lane's — nothing is added on the way in
    const a = sel && sel.start != null ? Math.min(sel.start, src.length) : src.length;
    startDraft(key, null, { text: src.slice(0, a) + ch + src.slice(a), caret: a + ch.length });
    return true;
  }

  // The drip runs. Seconds in the countdown only mean anything if they move, so
  // the wallet is the one thing here that changes without being touched: the
  // tenth advances, the wash creeps, and when it lands an edit arrives. Only
  // the wallet re-renders — the document and the rail are not involved.


  // Always-on typing, bound once on the container rather than per paragraph:
  // the document is re-rendered wholesale, so a listener on every clause would
  // be a hundred and fifty of them rebuilt on every keystroke elsewhere.
  //
  // **Every** input is refused. The charter is never edited in place — the
  // keystroke opens the composer with that character already applied, and all
  // further typing happens in the card's right-hand lane. Which is what makes
  // it safe to put a caret in a constitutional document: nothing you do in the
  // prose can change it, because changing it is a thing you propose.

  // Where the caret just went — announced **only when the surface moved it**
  // (Ed, 2026-08-17). It first fired on every selection change, which meant it
  // flashed every time you clicked in the document; a click is you putting the
  // caret somewhere and you already know where. The moment that actually needs
  // announcing is the one you did not ask for: you start typing in the charter,
  // the charter cannot be edited in place, and the caret is carried off into
  // the proposing lane of a card that has just appeared. So this is called at
  // the landing rather than bound to `selectionchange`.
  const caretPulse = (() => {
    let el = null;
    return () => {
      if (REDUCED()) return;
      const sel = getSelection();
      if (!sel || !sel.rangeCount || !sel.isCollapsed) return;
      const r = sel.getRangeAt(0);
      // a collapsed range has no width, and sometimes no rect at all until it
      // is asked for its client rects rather than its bounding box
      let rect = r.getBoundingClientRect();
      if (!rect || !rect.height) rect = (r.getClientRects() || [])[0];
      if (!rect || !rect.height) return;
      // `isConnected` as well as null: the closure would otherwise keep a
      // detached node for ever if anything removed it from the page
      if (!el || !el.isConnected) {
        el = document.createElement('div'); el.className = 'caretpulse';
        document.body.appendChild(el);
      }
      el.style.left = (rect.left + scrollX) + 'px';
      el.style.top = (rect.top + scrollY) + 'px';
      el.style.height = rect.height + 'px';
      el.classList.remove('go');
      void el.offsetHeight;                       // restart the animation
      el.classList.add('go');
    };
  })();

  // The queue is sticky and the wires are drawn in viewport space, so both the
  // rail highlight and the wires have to be recomputed as the page moves.
  let ticking = false;
  const onViewportChange = () => {
    if (ticking) return;
    ticking = true;
    // Pinned entries are measured against the viewport, so the margin has to be
    // re-laid on every scroll, not only on structural change (Ed, 110).
    requestAnimationFrame(() => { layoutQueue(); markCurrentSection(); drawWires(); syncEditCtl(); ticking = false; });
  };

  // ---- room-pulse (Ed, 2026-08-17) -------------------------------------
  // One beat per action by anybody. It carries no count, no direction and no
  // author — the room is moving, and that is the whole message. That is also
  // what keeps it inside §3.5: a content-free heartbeat cannot leak standings,
  // because there is nothing in it to read.
  //
  // In the mockup the other fourteen members are a timer. The intervals are a
  // fixed irregular cycle rather than random, so the page behaves the same way
  // twice — a mockup that is different every time is one you cannot QA. They
  // are deliberately uneven: a metronome reads as a machine ticking over, and
  // what this is trying to say is that people are working.
  function beat() {
    if (!pulseEl) return;
    pulseEl.classList.remove('beat');
    void pulseEl.offsetWidth;                 // restart the animation
    pulseEl.classList.add('beat');
    setTimeout(() => pulseEl.classList.remove('beat'), 900);
  }
  const BEATS = [4200, 9700, 2600, 15400, 6100, 3300, 11800, 5200, 7600, 2900];
  let beatAt = 0;
  // A resize re-wraps the document, so every clause moves and the margin has to
  // be measured again — the rail's positions are in page space, not viewport.


  // ---- init ---------------------------------------------------------------
  // What used to run at load, in the order it ran. A host calls this once,
  // after cards.js and after the DOM it names exists.
  function init(env) {
    env = env || {};
    hooks = env.hooks || {};
    extra = env.extra || null;
    const m = env.mounts || {};
    doc = m.doc || document.getElementById('doc');
    queueEl = m.queue || document.getElementById('queue');
    tocEl = m.toc || document.getElementById('toc');
    wiresEl = m.wires || document.getElementById('wires');
    walletEl = m.wallet || document.getElementById('wallet');
    pulseEl = m.pulse || document.getElementById('pulse');
    ROSTER = env.ROSTER ?? 14; FLOOR = env.FLOOR ?? 5;
    EDIT_RULES = env.EDIT_RULES || { grant: 4, cap: 8, stake: 1 };
    if (env.mayPropose) MAY_PROPOSE = env.mayPropose;
    if (env.mayJudge) MAY_JUDGE = env.mayJudge;
    if (env.mayPen) MAY_PEN = env.mayPen;
    if (env.editing) EDITING = env.editing;
    if (env.enterEditing) ENTER_EDITING = env.enterEditing;
    if (env.leaveEditing) LEAVE_EDITING = env.leaveEditing;
    // the sign control's two reads (Q770): the elective base, if any, and
    // what a signature would read as — both at call time, like the two above
    if (env.signing) SIGNING = env.signing;
    if (env.signerName) SIGNER = env.signerName;
    // and the speaker's two (K30): the rung whole, and the viewer's own face
    if (env.authorRung) AUTHOR_RUNG = env.authorRung;
    if (env.signerPerson) SIGNER_PERSON = env.signerPerson;
    SESSION_MINUTES = env.SESSION_MINUTES ?? 8 * 60;
    editsHeld = env.editsHeld ?? 5; editsToNext = env.editsToNext ?? 0.6;
    bindData(env.DOC || [], env.SUGGS || []);
    renderAll();

    setInterval(() => {
      if (editsHeld >= EDIT_RULES.cap) return;
      editsToNext += 1 / (SESSION_MINUTES * 6);
      const was = editsHeld;
      if (editsToNext >= 1) { editsToNext = 0; editsHeld = Math.min(EDIT_RULES.cap, editsHeld + 1); }
      renderWallet();
      // the fixture's own drip lands here rather than through `setWallet`, so
      // it wakes the propose row the same way a live one does (Q1486 (E)) —
      // only where an ✏️ actually arrived, since this ticks every second
      if (editsHeld !== was) syncProposeCtls();
    }, 1000);

    // **The abstention clock is a timer, not a render** (Q1460): one pass a
    // second over every countdown on the page, patching the minutes where
    // they moved and taking the line away once its moment has passed.
    // Deliberately neither the 4s poll — which would step the number four
    // seconds at a time — nor a render, which under a press is the one thing
    // this surface must not do.
    setInterval(() => tickAbstain(document), 1000);

    doc.addEventListener('beforeinput', (ev) => {
      const t = ev.target && ev.target.closest ? ev.target : null;
      if (!t || t.closest('.sugg')) return;      // the composer's own fields are real editors
      // the closed page (Q470): a caret in a closed document opens nothing
      if (closedMode) { ev.preventDefault(); return; }
      // nor does one in a document you may not yet propose to (Ed, 2026-08-21).
      // `contenteditable` is off in that state, but a paste, a drag-drop or an
      // IME can still raise beforeinput, and a refusal here is the lock that
      // actually holds.
      if (!MAY_PROPOSE()) { ev.preventDefault(); return; }
      // nor in read mode (backlog 204): the caret is edit mode's; a paste or an
      // IME reaching a read-mode column is refused the same way
      if (!EDITING()) { ev.preventDefault(); return; }
      // The host is the whole prose column now, so the block being typed in comes
      // from the *selection* rather than from the event's target — the target is
      // the column itself.
      // A caret on the column itself — its whitespace, an empty charter, a
      // select-all — picks no block, and used to fall through here *without*
      // refusing, so the browser edited the host in place: no card, no
      // proposal, wiped by the next render (Ed, 2026-08-22: the founder typing
      // freely into a begun document). Refused like every other input.
      const picked = selectedBlocks();
      if (!picked) { ev.preventDefault(); return; }
      ev.preventDefault();
      // One block or several: the same keystroke, told apart by what is selected.
      if (picked.blocks.length > 1) return startDraftFromRun(picked, ev);
      startDraftFromTyping(picked.blocks[0], ev);
    });

    addEventListener('scroll', onViewportChange, { passive: true });
    // the strip's B and I follow the caret: live while an editing lane holds
    // it, disabled otherwise (focusout fires before the new focus lands, so
    // the read waits a tick)
    document.addEventListener('focusin', () => syncEditCtl());
    document.addEventListener('focusout', () => setTimeout(() => syncEditCtl(), 0));

    // the fixture's other members are a timer; a live host beats the pulse
    // itself, once per movement the poll sees
    if (env.fixturePulse !== false) (function nextBeat() {
      setTimeout(() => { beat(); nextBeat(); }, BEATS[beatAt++ % BEATS.length]);
    })();

    addEventListener('resize', () => { layoutQueue(); onViewportChange(); });
    // **A font that lands after the first layout is a resize** (Q1402): the
    // document's face is `font-display: swap`, so the page lays itself out
    // in Charter or Georgia and the rail, the wires and the band's fits are
    // measured against those metrics; when Charis arrives the text reflows
    // and every absolutely placed thing beside it is 25px stale until the
    // next scroll or poll. Every handler that re-measures on a resize is the
    // set that must re-run, so the page hands itself one.
    //
    // **And each face is its own arrival** (2026-09-21, the session-probe's
    // 43 rail differences read): `loadingdone` fires once, when the *last*
    // pending face is in, and Regular landing is what moves every clause —
    // so with Bold a second behind it the rail stood a line off the text for
    // that second, and for three where nothing else re-laid it. A face's own
    // `loaded` promise is the moment the text moves; one that is never asked
    // for stays pending and costs nothing. Guard: `npm run rail-font-walk`.
    if (document.fonts && document.fonts.addEventListener) {
      const relay = () => dispatchEvent(new Event('resize'));
      document.fonts.addEventListener('loadingdone', relay);
      if (document.fonts.forEach) {
        document.fonts.forEach((f) => { if (f.loaded && f.loaded.then) f.loaded.then(relay, () => {}); });
      }
    }
    // the wallet has a phone form (`renderWallet`), so a width crossing the
    // line redraws it once — never per resize event, which a flight in the
    // air would not survive
    matchMedia(NARROW_Q).addEventListener('change', () => renderWallet());
  }

  // **You do not see a card you have no right to act on** (Ed, 2026-08-21,
  // answering Q523 (b) and Q525 (c) together). Not the rail entry, not the
  // gutter tab, not the contents-rail mark, and no card behind any of them:
  // for a reader who has not yet acknowledged ⚖️ the charter is simply prose,
  // and every mark arrives at once when the grant is pressed — which turns
  // the acknowledgment into a visible event rather than a formality.
  //
  // **Filtered at ingest, not at each render site.** Seven places read SUGGS
  // to draw something — the document, the rail, the TOC, the wires, the
  // section marks, the diagonal's serve test, the open-card lookup — and a
  // rule restated seven times is a rule six of them will eventually forget.
  // Filtering the array itself makes them agree by construction, and it is
  // honest about what it means: this reader's document does not contain
  // these questions yet.
  //
  // **No task is served until its main action can be taken** (SURFACE C9 as
  // amended by Q1328 — Ed, 2026-09-11: *I shouldn't be served a task until I
  // can do its main action, so until I accept ⚖️ I shouldn't be given
  // races*). Until Q1328 only 'needs' went — a pair asked of you — and a
  // race in any other state stood in the rail and the gutter as grey
  // information. Now **every entry a race made** waits behind the ⚖️ OK,
  // whatever its state: the pair asked of you, a race being weighed by other
  // people, a deadlock, a diagonal, a shifted judgment and the sealed record
  // alike — the record's OK is remembered per seat (`readSeals`), so it is
  // owed exactly as it was once the OK lands. What stays is what no race
  // made and ⚖️ is not the action of: a **park** (E36 — information to
  // everyone, one sentence and an OK), a draft of **your own** (✏️ is its
  // action, and `mayPropose()` gates that elsewhere) and the Founder's 👑
  // crown card (the Founder's gates are self-set, Y27, so this is never
  // reached for them). What makes this safe to re-run is that the
  // capability is part of the charter column's data key, so an
  // acknowledgment re-keys and the full set is handed back in.
  //
  // **Two things this never governed** (Q1479 (a), Ed 2026-09-19; issue #30).
  // *A closed document*: the rule above is *no task before the power it
  // needs*, and on a closed page there is no ⚖️ left to press — the rail
  // keeps only 🥂 — so every `rec:` the server sent would wait for ever and
  // the final document would read as still being decided to anybody whose OK
  // is in another browser. Once the clock has run nothing waits behind ⚖️:
  // the record is not a task, it is what the document ended up saying.
  // *The Founder's amendment*: an `amd:` card is a ✒️ act reported (SURFACE
  // E35, R-058), not a race, and ⚖️ is not the action it asks for. Neither
  // is `mine`, which would send both down the *yours* road — force-kept, ✏️,
  // 🗑️ to withdraw — and none of that is true of a sealed record.
  const KEPT_UNJUDGED = new Set(['park', 'draft', 'crown']);
  const withheld = (g) => !docClosed && !g.amendment &&
    !KEPT_UNJUDGED.has(g.kind) && !g.mine && !MAY_JUDGE();

  // **…but the document does not read as empty while they wait** (Q1413, Ed
  // 2026-09-17, from the proposal-shapes walk's surprise: a new member of a
  // busy document boots to zero proposals and a rail of OKs). The rule above
  // stands whole — no rail entry, no card, no act before the power — and the
  // **gutter** alone says the document has life in it: every question held
  // back draws a greyed tab beside its clause, opening nothing. So what a
  // newcomer meets is a document with questions standing in the margin and a
  // queue of OKs that leads to them, rather than prose and a rail of
  // paperwork. They are kept here rather than in `SUGGS` so that the seven
  // readers of that array are untouched — the whole point of filtering at
  // ingest — and one render site reads this one.
  let HELD = [];
  const heldFor = (key) => (key ? HELD.filter((g) => tabAt(g, key)) : []);

  // ---- a draft follows its paragraph (Q1463) -------------------------------
  // **Follow the paragraph, and refuse if lost** (Ed, 2026-09-18). A draft's
  // sites are keyed by engine line (`L8`, a gap `G9`) and the hunks it sends
  // are read straight off those keys — so an adoption that inserts or removes
  // a line *above* the draft leaves the key naming somebody else's clause, and
  // the proposal that goes out replaces that one instead. Silently, and
  // accepted: the version sent is the current one, so the engine's *targets
  // version N* guard never fires. Nothing re-keyed anything, because `setData`
  // carries the unproposed draft across the swap untouched — right about the
  // words, wrong about the place.
  //
  // So each site is carried to the new position of its **origin wording**, the
  // one thing about a site that names a paragraph rather than a line number.
  // It is done inside `bindData` because this is the one moment both documents
  // are in hand — the caller passes the one being replaced — and because
  // everything downstream (`gapFields`, `syncDraftKeys`, the labels, the
  // render, the hunks) then reads keys that have already been re-written. An
  // already-proposed candidate needs none of it: the host derives its sites
  // from the server's own spans on every poll.
  //
  // A **source line** is compared, not a rendered one, and loosely enough that
  // a marker respaced on the way through `blocksOf` is still the same
  // paragraph.
  const normSrc = (t) => String(t == null ? '' : t)
    .replace(/^(#{1,3}|-)\s+/, '$1 ').replace(/\s+$/, '');
  const srcOfLine = (l) => (l ? normSrc(markerOf(l) + (l.x || '')) : null);
  // the engine-keyed blocks of a document, in order: a gap is not a block, and
  // a fixture's own `c3`/`h1` keys are not line numbers, so it never follows
  const realBlocks = (arr) => (arr || []).filter((l) => !l.gap && /^L\d+$/.test(l.key || ''));

  // A site whose paragraph is gone still has to stand somewhere — the member's
  // words are in its card and are never discarded — so it is put at the
  // nearest line that still exists and refuses to be proposed from there. Its
  // origin is left alone, so the wording coming back brings the site back too.
  function clampLost(s, is) {
    if (!is.length || s.keys.every((k) => is.some((l) => l.key === k))) return;
    const n = keyNum(s.keys[0]);
    let best = is[0];
    for (const l of is) if (Math.abs(keyNum(l.key) - n) < Math.abs(keyNum(best.key) - n)) best = l;
    if (isGapKey(s.keys[0])) {
      const gk = 'G' + (keyNum(best.key) + 1);
      s.keys = [gk]; s.gapKey = gk; s.insertAfterKey = best.key;
      if (s.origin && s.origin[0]) s.origin[0].key = gk;
    } else {
      s.keys = [best.key];
    }
    s.label = headingForKey(s.keys[0]);
  }

  function followSites(d, prev, now) {
    const was = realBlocks(prev);
    const is = realBlocks(now);
    if (!was.length || !is.length) return;
    const oldS = was.map(srcOfLine);
    const newS = is.map(srcOfLine);
    // an adoption is one changed region, so what matches from the top and what
    // matches from the bottom say exactly how far a given line has moved
    let pre = 0;
    while (pre < oldS.length && pre < newS.length && oldS[pre] === newS[pre]) pre++;
    let suf = 0;
    while (suf < oldS.length - pre && suf < newS.length - pre
      && oldS[oldS.length - 1 - suf] === newS[newS.length - 1 - suf]) suf++;
    const delta = newS.length - oldS.length;
    if (pre >= oldS.length && !delta) return;    // the same document, re-keyed
    const posIn = (arr, key) => arr.findIndex((l) => l.key === key);
    // where a block that stood at `p` should be looked for now: unmoved if the
    // change is below it, shifted by the net change above it if it is not
    const expect = (p) => (p < pre ? p : p + delta);
    // **Ambiguity is the net shift's to break, and then it is lost** (Ed's
    // ruling): two identical paragraphs give two candidates, the nearer to the
    // expected position wins, and a dead heat is not guessed at.
    const findRun = (needle, from) => {
      const hits = [];
      for (let p = 0; p + needle.length <= newS.length; p++) {
        let ok = true;
        for (let i = 0; i < needle.length; i++) if (newS[p + i] !== needle[i]) { ok = false; break; }
        if (ok) hits.push(p);
      }
      if (!hits.length) return -1;
      const want = expect(from);
      hits.sort((a, b) => Math.abs(a - want) - Math.abs(b - want) || a - b);
      if (hits.length > 1 && Math.abs(hits[0] - want) === Math.abs(hits[1] - want)) return -1;
      return hits[0];
    };
    for (const s of d.sites || []) {
      if (isGapKey(s.keys[0])) {
        // **a gap follows the clause it sits after** (its own bookkeeping,
        // Q1311): a gap has no wording of its own, so what identifies it is
        // the block before it — and a gap at the very top has no such block
        // and stays at the top, whatever is inserted beneath it.
        if (s.insertAfterKey == null) { s.lost = false; continue; }
        // a site seeded from a proposal of yours (`draft-remake`, `siteOfSpan`)
        // carries the key and not the wording, so the first swap reads it off
        // the document being replaced — where the key is still good
        if (s.afterText == null) s.afterText = srcOfLine(was.find((l) => l.key === s.insertAfterKey));
        if (s.afterText == null) { s.lost = false; continue; }
        const at = findRun([normSrc(s.afterText)], Math.max(0, posIn(was, s.insertAfterKey)));
        if (at < 0) { s.lost = true; clampLost(s, is); continue; }
        const gk = 'G' + (keyNum(is[at].key) + 1);
        s.keys = [gk]; s.gapKey = gk; s.insertAfterKey = is[at].key;
        if (s.origin && s.origin[0]) s.origin[0].key = gk;
        s.label = headingForKey(gk);
        s.lost = false;
        continue;
      }
      const needle = (s.origin || []).map((o) => normSrc(o.text));
      if (!needle.length) continue;
      const at = findRun(needle, Math.max(0, posIn(was, s.keys[0])));
      if (at < 0) { s.lost = true; clampLost(s, is); continue; }
      // a run follows as a run: one site is one piece of text over adjacent
      // blocks, and it is only itself where all of them are still adjacent
      s.keys = is.slice(at, at + needle.length).map((l) => l.key);
      s.origin.forEach((o, i) => { o.key = s.keys[i]; });
      s.label = headingForKey(s.keys[0]);
      s.lost = false;
    }
    // …and a draft that has lost a place is **stranded**, the state a proposal
    // the text moved under already has (Q170, SURFACE E38): the ↻ mark, its
    // own sentence on the card, and nothing sent until it is re-aimed.
    d.stranded = (d.sites || []).some((s) => s.lost);
    if (d.focusKey && !(d.sites || []).some((s) => s.keys.includes(d.focusKey))) {
      d.focusKey = d.sites[0] && d.sites[0].keys[0];
    }
  }

  // The data, keyed and seeded exactly as the page did it at load. `prev` is
  // the document being replaced, where there is one (Q1463).
  function bindData(d, s, prev) {
    DOC = d; SUGGS = s.filter((g) => !withheld(g));
    HELD = s.filter((g) => withheld(g));
    // a card that has just been withheld cannot stay open behind it
    if (openId != null && !SUGGS.some((g) => g.id === openId)) openId = null;
    // Always-on typing means *every* clause can be edited, so every clause needs
    // an identity to hang a draft on — until now only the ones the fixture had
    // something to say about carried a key. Index-derived, and stable for as long
    // as DOC is (which is the life of the mockup).
    // Headings carry keys too (Ed, 2026-08-17). A section that cannot be renamed
    // is a section the charter cannot revise, and Ed's ruling is that a heading
    // edited together with its paragraph is **one candidate** — which it can only
    // be if the heading is an addressable block like any other.
    DOC.forEach((l, i) => { if ((l.t === 'p' || l.t === 'h') && !l.key) l.key = (l.t === 'h' ? 'h' : 'c') + i; });
    // **the trailing gap** (backlog 204): the host's `blocksOf` appends one keyed
    // by engine line; a fixture hands in none, so it takes one keyed by index —
    // rendered only in edit mode, and never on a closed document.
    // **A host that keys by engine line has already decided** (`L<n>`): it
    // appends the gap itself, and deliberately omits it for the empty
    // document, whose one empty clause *is* the place to write (Q649 (a)) —
    // so a second gap here would draw two blank paragraphs on every empty
    // document and fail `journey --empty-text`'s *no trailing gap*.
    const hostKeyed = DOC.some((l) => /^L\d+$/.test(l.key || ''));
    if (DOC.length && !hostKeyed && !DOC.some((l) => l.gap) && !closedMode && !DOC.some((l) => /^[US]:/.test(l.key || ''))) {
      DOC.push({ t: 'p', x: '', key: 'G' + DOC.length, gap: true });
    }
    HEADS = DOC.filter((l) => l.t === 'h').map((l) => l.level ?? 1);
    // **before anything reads the keys** (Q1463): an unproposed draft is the
    // one item carried across a swap by hand, so it is the one item whose
    // keys can be stale — everything else in SUGGS was just derived from the
    // document standing here.
    if (prev && prev !== DOC) {
      const mine = SUGGS.find((x) => x.id === DRAFT_ID && x.unproposed && (x.sites || []).length);
      if (mine) followSites(mine, prev, DOC);
    }
    SUGGS.filter((s) => s.kind === 'draft').forEach((d) => {
      d.sites.forEach((s) => {
        if (!s.origin) s.origin = s.keys.map((k) => ({ key: k, text: sourceTextFor(k), note: null }));
        // a site keyed to a gap carries its own anchor's bookkeeping (Q1311)
        if (isGapKey(s.keys[0]) && !s.gapKey) Object.assign(s, gapFields(s.keys[0]));
      });
      syncDraftKeys(d);
    });
  }

  // A host that derives the document and its items from a server view hands
  // them in here; the page is rebuilt wholesale, as after any render.
  function setData(next) {
    const textChanged = !!(next && next.DOC && next.DOC !== DOC);
    const prevDoc = DOC;
    // **The items are about the document that arrives with them, not the one
    // it replaces** (issue #66, 2026-09-19). A host that hands in both passes
    // its items as a thunk, because an argument is evaluated before the call:
    // the derivation reads the bound document — each site's remembered
    // wording (`origin`) and every entry's label — so a caller that computed
    // the items itself built them against the *previous* text, one render
    // behind the column beside them. A site would then be keyed in the new
    // line space and its wording looked up in the old column: blank where the
    // key is new, somebody else's clause where a line went away above it, and
    // that stale wording read straight back by the guard the ✏️ Re-make press
    // is refused by. Resolved here, after the document moves and before
    // `bindData` replaces SUGGS, which the derivation reads to find the
    // candidate being re-made. One `setData`, because each one is a whole
    // render.
    let suggs = (next && next.SUGGS) || SUGGS;
    if (typeof suggs === 'function') { DOC = (next && next.DOC) || DOC; suggs = suggs(); }
    // **An unproposed draft is local, and has to survive a data swap** (Ed,
    // 2026-08-21: *when I ✒️ any constitutional question the text
    // disappears*). Live, SUGGS is rebuilt from the server on every render
    // and every 4s poll, and a draft you have not proposed yet exists
    // nowhere but in this array — so opening any other card destroyed what
    // you had typed. The host's own guard only holds while the draft card
    // is the open one; this holds whatever is open, which is the case that
    // was losing work. It is the same rule the surface already keeps for
    // every other provisional value: closing a card is not discarding.
    if (next && next.SUGGS) {
      const mine = SUGGS.find((x) => x.id === DRAFT_ID && x.unproposed);
      if (mine && !suggs.some((x) => x.id === DRAFT_ID)) suggs = suggs.concat([mine]);
    }
    const held = heldCaret();
    bindData((next && next.DOC) || DOC, suggs, prevDoc);
    renderAll();
    if (held) restoreCaret(held);
    if (textChanged && hooks.textChanged) hooks.textChanged();
  }

  // **A data swap keeps the caret** (Ed, from the residency room, 2026-09-18:
  // *when typing in a rationale … my focus is pulled away from the box by some
  // other common event (perhaps someone voting?)*). The host's typing guard
  // spares the column a rebuild while the draft card is open — but only where
  // the charter's key has not moved, and an adoption anywhere moves it: the
  // text changed, so the whole column is rebuilt under the hand, and the box
  // being typed in is replaced by a new one holding the same words and no
  // caret (measured: seven times in a minute in a fast room, each 24–88 ms
  // after a full `setData`, the draft card open throughout). The words were
  // never lost — the draft model has them — so what is owed is the caret: it
  // is taken out by position before the rebuild and put back after, the same
  // hold-by-position rule the lane's own re-marking works by. A box is found
  // again by its place among its kind, which an adoption elsewhere does not
  // change. **And the rationale's raw text comes back with it**: the model
  // keeps it trimmed, so a space typed just before the swap would be dropped
  // and the next word run into the last.
  function heldCaret() {
    const sel = getSelection();
    if (!doc || !sel || !sel.rangeCount) return null;
    const node = sel.getRangeAt(0).endContainer;
    const at = node && (node.nodeType === 1 ? node : node.parentElement);
    const box = at && (at.closest('.edit-why') || at.closest('[data-lane]'));
    const el = document.activeElement;
    if (!box || !doc.contains(box) || !el || !(el === box || box.contains(el) || el.contains(box))) return null;
    const why = box.classList.contains('edit-why');
    const kind = why ? '.edit-why' : '[data-lane]';
    let off = null;
    if (why) {
      const r = document.createRange();
      r.selectNodeContents(box);
      r.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
      off = r.toString().length;
    } else off = laneCaret(box);
    return { kind, why, i: [...doc.querySelectorAll(kind)].indexOf(box), off, raw: why ? box.textContent : null };
  }
  function restoreCaret(held) {
    const box = [...doc.querySelectorAll(held.kind)][held.i];
    if (!box) return;
    if (!held.why) { box.focus({ preventScroll: true }); placeCaret(box, held.off); return; }
    if (held.raw !== null && held.raw.replace(/\n+/g, ' ').trim() === box.textContent) {
      box.textContent = held.raw;
      box.classList.toggle('blank', !held.raw.trim());
    }
    box.focus({ preventScroll: true });
    const r = document.createRange();
    const text = box.firstChild && box.firstChild.nodeType === 3 ? box.firstChild : null;
    if (text) r.setStart(text, Math.min(held.off == null ? text.length : held.off, text.length));
    else r.selectNodeContents(box);
    r.collapse(!!text);
    const s = getSelection();
    s.removeAllRanges(); s.addRange(r);
  }

  // everything renderAll does except the charter itself — a host whose band
  // changed (a setup card opened, a task settled) re-lays the rail and redraws
  // the wire without rebuilding the document column
  function refreshRail() {
    settleTopUrgent(); renderQueue(); renderToc();
    markCurrentSection(); settleWashes(); settleLift(); layoutQueue(); drawWires();
  }

  // **The open entry lifts, it does not jump** (Ed, 2026-08-21: *when I click
  // on a queue card it jerks up into its raised state*). The rail is rebuilt
  // wholesale on every render, so the entry you just clicked is a **new**
  // element born already wearing the open shadow — and a transition cannot
  // run from a value the element never had. Same fix as the washes above:
  // paint it at rest, force one reflow, then hand it the lift, so the
  // 220ms box-shadow transition has something to travel from. Only the entry
  // that has just become the open one is handled; one already open is left
  // alone, or it would re-lift on every unrelated render.
  let liftedId = null;
  function settleLift() {
    const el = queueEl && queueEl.querySelector('button[aria-current="true"]');
    const id = el ? el.dataset.q : null;
    if (id !== liftedId && el) {
      el.setAttribute('aria-current', 'false');
      void el.offsetHeight;
      el.setAttribute('aria-current', 'true');
    }
    liftedId = id;
  }

  function closeCard() {
    const id = openId;
    if (id == null) return;
    toggle(id, false);
  }

  function setWallet(w) {
    if (w && w.rules) EDIT_RULES = w.rules;
    if (w && w.held != null) editsHeld = w.held;
    if (w && w.toNext != null) editsToNext = w.toNext;
    // a live wallet's clock (stage 8, Q503a): the drip interval in seconds,
    // carried as the tenth-of-window the fixture's clock was built on —
    // dripIn reads SESSION_MINUTES × 6 seconds per tick, so an interval of
    // d seconds is SESSION_MINUTES = d / 6; null says the document does not drip
    if (w && w.dripSeconds !== undefined) SESSION_MINUTES = w.dripSeconds == null ? Infinity : w.dripSeconds / 6;
    renderWallet();
    // **and the ✏️ wakes when the ✏️ arrives** (Q1486 (E), Ed 2026-09-21).
    // The wallet is not part of the charter column's data key — rightly: the
    // column does not change when your purse does — so a drip landing under
    // an open draft left the row's commit dark and its countdown standing
    // until something else happened to redraw the column. Patched in place
    // by the same reader the draw uses, never a render: this runs on every
    // poll, and a render here would be the caret rule broken four times a
    // minute.
    syncProposeCtls();
  }
  // the room the records speak of (stage 8): E and the floor, from the view
  // ---- `session-clock` (Q466/Q471) ----------------------------------------
  // One plain line saying where the document is in its life. **The ladder**:
  // days beyond a week, hours inside one, 20-minute steps inside six hours,
  // 10-minute steps inside the hour — never finer, never seconds. Every
  // figure rounds *down* to its step, so the clock is never optimistic.
  // Cold at every distance: the last hours' urgency belongs to the questions.
  const MONTHS = T.clock.months;
  // a date in words, the year only when it is not this one (STYLE §2: raw
  // values are not copy); `todayMs` is a seam for the check script
  function dateWords(ms, todayMs) {
    const d = new Date(ms), now = new Date(todayMs ?? Date.now());
    return d.getDate() + ' ' + MONTHS[d.getMonth()] +
      (d.getFullYear() === now.getFullYear() ? '' : ' ' + d.getFullYear());
  }
  const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  // state: {kind:'none'} | {kind:'left', ms} | {kind:'closed', atMs, todayMs?}
  // (no 'frozen': there is no freeze since v0.99, R-088)
  function clockText(state) {
    if (!state || state.kind === 'none') return '';
    if (state.kind === 'closed') return T.clock.closed(dateWords(state.atMs, state.todayMs));
    const ms = state.ms;
    if (ms <= 0) return T.clock.closingNow;  // the clock has passed; the close is landing
    if (ms > 7 * DAY) { const d = Math.floor(ms / DAY); return T.clock.daysLeft(d); }
    if (ms > 6 * HOUR) { const h = Math.floor(ms / HOUR); return T.clock.hoursLeft(h); }
    if (ms > HOUR) {
      const steps = Math.floor(ms / (20 * MIN)), h = Math.floor(steps / 3), m = (steps % 3) * 20;
      return T.clock.hmLeft(h, String(m).padStart(2, '0'));
    }
    const m = Math.floor(ms / (10 * MIN)) * 10;
    return m >= 10 ? T.clock.minutesLeft(m) : T.clock.underTen;
  }

  function setRoom(r) {
    if (r && r.E != null) ROSTER = r.E;
    if (r && r.floor != null) FLOOR = r.floor;
  }

  // **A judgment the host refused is un-filed** (issue #37). The press files
  // the pair as ⏳ before any answer (Q576's receipt), and nothing took it
  // back: `stateOf` reads `resolved` over the view, so a vote the server
  // never took read as cast for as long as the tab lived. The live hook calls
  // this on a refusal; only the verdict it was sent with is taken back, since
  // a later revision of the same pair may already be in flight — and the
  // entry asks again, the view having kept the pair unanswered.
  // **…and says so under its card** (Q1505, Ed 2026-09-23; SURFACE Y25):
  // `said` is the sentence, which the card carries until the next choice on
  // it; the card is re-opened, as Y25's band cards are, unless the member has
  // since opened another charter card — a refusal does not take a card away
  // from somebody reading one.
  function unjudge(id, what, said) {
    const s = SUGGS.find((x) => x.id === id);
    if (!s) return false;
    const key = pairKeyOf(s);
    if (committed.get(key) !== what) return false;
    resolved.delete(key); verdicts.delete(key); picked.delete(key); committed.delete(key);
    if (justArrived === key) justArrived = null;
    if (said) refusedSay.set(id, said);
    renderAll(); drawWires();
    // a quick refusal lands while the press's own close is still running
    // (`collapseCards` → `shut`), so the re-open waits for the card to be
    // shut rather than toggling it closed a second time; a card still open
    // after that is simply open, the sentence already drawn on it
    let tries = 0;
    const reopen = () => {
      if (!said || !refusedSay.has(id)) return;
      if (openId === null) { toggle(id, true); return; }
      if (openId === id && ++tries < 10) setTimeout(reopen, 150);
    };
    reopen();
    return true;
  }

  window.SESSION = {
    init, setData, renderAll, toggle, clauseKeysOf, closeCard, setWallet, setRoom, setClosed,
    unjudge,
    setDocClosed,
    clockText, dateWords,
    // a block as the engine's source line — marker and words (Q1403): the
    // live layer builds a proposal's origins with it
    sourceTextFor, markerFor,
    // edit mode's shared pieces (backlog 204): the row both hosts draw, the
    // read-mode keystroke, and what the riding tab says about the draft
    proposalRowHtml, typeAt, draftRowState, dropDraft,
    // the column's one strip (Q1294 (b)), shared with the founder's pre-🍾
    // column since Q1313: its sync, and the one act B and I make (Q1467)
    syncEditCtl, markSelection,
    arcFrames, flyGlyph, pencilStorm, renderWallet, beat, act, narrow: NARROW,
    // the hold vocabulary, shared with the founder's own wallets in the page:
    // `nudgeHome` brings a released flight back (never travelling less than a
    // quarter), `startLean`/`stopLean` are the spend-preview, and `applyLean`
    // is what any wallet render must call at its tail to survive its own rebuild
    nudgeHome, startLean, stopLean, applyLean, addSpendProbe, resumeLean, setWalletHeld, setWalletTitle,
    setWalletGhost,
    refreshRail, renderToc, layoutQueue, drawWires, washAttrs,
    get DOC() { return DOC; },
    get SUGGS() { return SUGGS; },
    get openId() { return openId; },
    /** true while a propose hold is in the air — the host must not re-render */
    get holding() { return holdInFlight; },
    // a rail click's travel to its card, still running (the polls defer on it)
    get travelling() { return travelling || (pendingId !== null && Date.now() - travelSince < 3000); },
    // the commit gesture, resolved once at load — the page and setup.js read
    // this rather than keeping a second copy of the constant (backlog 184)
    get gesture() { return GESTURE; },
    // and the length of every hold on the surface, for the same reason and in
    // the same place (backlog 206): one number, owned by the file that loads
    // first, read by the page's wallet commits and its assembly rather than
    // copied into either
    get holdMs() { return HOLD_MS; },
    get readSeals() { return readSeals; },
    get verdicts() { return verdicts; },
    get editsHeld() { return editsHeld; },
    // the rate as it stands, and when the next ✏️ lands (Q1486 (E)): the
    // band's own composer draws the same dark commit and the same countdown,
    // and reads both from here rather than keeping a second copy of either
    get EDIT_RULES() { return EDIT_RULES; },
    get dripAt() { return dripAtMs(); },
    // the id the one unproposed draft is held under in SUGGS: the page carries
    // such a draft across a data swap by this id, so it reads it here rather
    // than keeping a copy of the literal
    DRAFT_ID,
    // the probe replaces the scroll with an instant jump; smoothScrollBy is a
    // function declaration inside this closure, so the seam is a setter
    get smoothScrollBy() { return smoothScrollBy; },
    set smoothScrollBy(fn) { smoothScrollBy = fn; },
  };
})();
