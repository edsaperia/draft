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
 * Load order: cards.js → session.js → the page's own script (the fixture +
 * init). */
(function () {
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
  // than for a meeting, which is the intuition people already have. This is
  // the number that is actually a headcount; the adoption-threshold beside it
  // is a confidence, not a vote share.

  // Creation-time constitution (SPEC §9.0). The starting number of edits and
  // the rate they come back are per-document parameters chosen when the
  // document is made, exactly like quorum and the bar (Ed, 2026-08-16) — so
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

  // ---- the card grammar lives in cards.js now (2026-08-18) ----------------
  // The decision-card machinery was lifted into design/cards.js so the setup
  // surfaces can render cards with this surface's own code instead of
  // imitating it. The bodies are unchanged — the seam is the env bag below,
  // every key a function read at call time (topUrgentId is a reassigned let,
  // chilled a mutable Set, laneMode mutable: nothing here may be captured at
  // make() time). The lift is proven by design/tools/session-probe.js against
  // design/reference/: card HTML byte-identical, geometry 0.0px.
  const {
    esc, resultOnly, stripTags, pct, plainLabel,
    TICK, CROSS, MARK, DRAWN, mkHtml, markHtml,
    tokens, diffPieces, markHtml2, MARK_FLOOR, wordingHtml, laneBlocks,
    headFlags, originText, mdToHtml, htmlToMd, mdStrip,
    richToSource, sourceToRich, readLane,
    laneSeed, laneProposeHtml, speakerHtml, fieldHtml, fieldOf, groundNote,
    headOnlyHeight, cardBody, COLLAPSE_MS, EXPAND_MS,
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
    laneBarHtml, clauseHeadHtml, proposalHtml, commitRowHtml, reviseNote,
    laneBoxHtml, draftFaceHtml, collapseCard, expandCard, openCardEls, runOnCards,
    collapseCards, expandCards, stillRef, restoreStill, keepStill,
  } = window.CARDS.make({
    authorRung: () => AUTHOR_RUNG(),
    signerPerson: () => SIGNER_PERSON(),
    mayPropose: () => MAY_PROPOSE(),
    lockedOf: (s) => !!s.locked || !MAY_JUDGE(),
    pickOf: (s) => pickOf(s),
    stateOf: (s) => stateOf(s),
    isCast: (s) => isCast(s),
    isJudged: (s) => isJudged(s),
    verdictOf: (s) => verdicts.get(s.id),
    isTopUrgent: (s) => s.id === topUrgentId,
    isChilled: (id) => chilled.has(id),
    washFor: (s, k) => anchWash(s, true, k),
    ownChip: (s) => ownChipHtml(s),
    laneRaw: () => laneRaw(),
    currentTextFor: (k) => currentTextFor(k),
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
  const PROSE = () => '<div class="prose" contenteditable="' + (MAY_PROPOSE() && EDITING() ? 'true' : 'false') +
    '" spellcheck="false">';

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
  // the head label of a draft on a gap: which gap, in the reader's terms
  const gapLabel = (key) => {
    const at = blockBeforeGap(key);
    if (at < 0) return 'A new clause at the start';
    const prev = DOC[at];
    const after = DOC.slice(at + 1).some((l) => !l.gap && l.key);
    if (!after) return 'A new clause at the end';
    const words = String(prev.x || '').trim();
    return 'A new clause after: ' + (words.length > 40 ? words.slice(0, 40).replace(/\s+\S*$/, '') + '…' : words);
  };

  // The text a suggestion is arguing against, for the quick card's yellow band.
  function currentTextFor(key) {
    const line = DOC.find((l) => l.key === key);
    return line ? line.x : '';
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
    if (s.insertAfterKey) keys.push(s.insertAfterKey);
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

  function suggFor(key) {
    // Anchors persist while a race is still deciding — a judged suggestion
    // is revisable until it seals or its ground shifts.
    return SUGGS.filter((s) => s.state !== 'sealed' && served(s) &&
      ((s.keys ?? []).includes(key) || (s.pair ?? []).some((c) => c.key === key)));
  }

  const verdicts = new Map();
  let justArrived = null;
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
    : (g.state === 'deciding' || resolved.has(g.id)) ? 'deciding' : 'needs';
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
  const served = (g) => !isDiagonal(g) || g.state === 'deciding' || resolved.has(g.id) ||
    (nothingToJudge() && liveQuestions() >= ROSTER);
  const judgeable = (g) => stateOf(g) === 'needs' && !isDiagonal(g);
  const nothingToJudge = () => !SUGGS.some(judgeable);
  // The volume gate: as many live **questions** as there are people on the
  // roster, a race counting once — which it does here, because a suggestion in
  // this fixture *is* a question.
  const liveQuestions = () =>
    SUGGS.filter((g) => stateOf(g) !== 'sealed' && !g.unproposed && !isDiagonal(g)).length;
  const diagonalsAvailable = () =>
    SUGGS.some((g) => isDiagonal(g) && stateOf(g) === 'needs');
  window.__q291 = () => ({ live: liveQuestions(), more: diagonalsAvailable(),
    nothing: nothingToJudge(), needs: SUGGS.filter(judgeable).map((g) => g.id) });
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
  const youJudged = (g) => !!(verdicts.get(g.id) || g.verdict);
  const isUnread = (g) => stateOf(g) === 'sealed' && g.unread &&
    (carried(g) || youJudged(g)) && !readSeals.has(g.id);

  // Urgency — how much this wants *you* (leverage), not how close it is to
  // resolution (that stays the meter's job). It is carried by the strength of
  // the card's colour (Ed, 105) and, since 2026-08-16, by whether the card is
  // on the screen at all: it decides *which* questions the rail shows, not how
  // much each of them is allowed to say.
  const URG_LO = 0.05, URG_HI = 0.30;
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
  // always was, so how far the fill reaches is closeness to resolution. On a
  // needs-you card the strength of the colour is also urgency — one device,
  // three readings. A deadlocked race washes grey: more judgment won't move it
  // (SPEC §8.3), which is the one case where the state is not the whole story.
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
  const groundOf = (col) => String(col).replace(/[\d.]+\s*\)\s*$/, GROUND_A + ')');
  function washAttrs(key, col, fill) {
    const from = prevWash.get(key) || { col, fill };
    const varsOf = (w) => '--washcol: ' + w.col + '; --washbg: ' + groundOf(w.col) +
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
      el.style.setProperty('--washbg', groundOf(el.dataset.wash));
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
    if (stuck(g)) return ['Deadlocked — ' + (g.judges ?? 0) + ' people can’t agree on a proposal even ' +
      'after ' + (g.comparisons ?? 0) + ' votes. Can you propose something everyone will agree on?'];
    if (g.kind === 'race') return [g.race && g.race.a && g.race.a.rationale, g.race && g.race.b && g.race.b.rationale].filter(Boolean);
    // A diagonal quotes nothing (Ed, 2026-08-17). A teaser is a *rationale* —
    // somebody's argument for their wording — and a diagonal has none, because
    // nobody proposed anything: it is the surface asking which of two questions
    // deserves the room's time. Its title now says exactly that, and the
    // description it used to quote was the system explaining itself twice.
    if (g.kind === 'diagonal') return [];
    return g.rationale ? [g.rationale] : [];
  }

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
  // **Ed's own pair, for now** (2026-08-17): 👍 for the reading of the room and
  // ✒️ for the line it had to cross. Drawn line art was tried first — a gauge and
  // a hurdle on the same stroke as ✔ and ✖ — and the honest finding is that at
  // eyebrow size line art does not survive: the gauge read as a caret and the
  // hurdle as a Greek letter. Emoji are bitmapped for exactly this size, which
  // is the one job they do better than anything we can draw. They bring their
  // own colour back, which is the cost.
  const PEOPLE = "<span class=\"unit\">👤</span>";
  const JUDG = "<span class=\"unit\">👍</span>";
  const BAR = "<span class=\"unit\">✒️</span>";
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
          '<span class="qt">' + plainLabel(e.label || g.qLabel) + '</span>' +
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
          ? '<span class="qs"><span class="sibn">' + e.n + ' of ' + e.of + ' places</span></span>' : '';
        html +=
          '<li class="qitem" data-q="' + g.id + '" data-site="' + (e.site ?? '') + '">' +
          '<button class="yours' + (drafting ? ' drafting' : '') + '" data-q="' + g.id + '"' +
          ' aria-current="' + (openId === g.id) + '"' +
          // a draft has no fill: there is nothing yet to be close to
          washAttrs(qKey(g, e), drafting ? tint('yours', 0.20) : wash(g, 'yours').col,
            drafting ? '100%' : wash(g, 'yours').fill) +
          ' title="' + esc(drafting
            ? 'Your draft — not proposed yet.'
            : (g.cap || 'Yours, in the race')) + '">' +
          (drafting
            ? '<span class="ql">' + markHtml('propose') + '<span>' + esc(plainLabel(e.label || g.qLabel)) + '</span></span>' +
              where +
              '<span class="qwhy' + (why ? '' : ' empty') + '">' +
              (why ? esc(why) : 'no reason given yet — say what this is for') + '</span>' +
              ''
            // **✏️ does not say "yours"** (Ed, 2026-08-17). The pencil means *you
            // wrote this* and the entry is the accent blue; a word saying it a third
            // time is the surface reading its own glossary aloud. The place count
            // survives, because it says *which* place and nothing else does.
            : '<span class="ql">' + markHtml('propose') + esc(plainLabel(e.label || g.qLabel)) +
              (e.of > 1 ? '<span class="qv"> · ' + e.n + ' of ' + e.of + ' places</span>' : '') + '</span>') +
          '</button></li>';
        continue;
      }

      const justJudged = resolved.has(g.id) && g.state === 'needs';
      const locked = g.locked || st === 'sealed';
      const verdict = verdicts.get(g.id) || g.verdict;
      const u = g.urgency ?? 0.5;
      const stateCls = (st === 'deciding' && !stuck(g)) ? 'deciding' : classFor(g);
      // A stuck race says what it is only once it has stopped asking you to
      // judge; before that it carries an ordinary race's caption, because it
      // *is* one until you are through with it.
      // A stuck entry has no caption: its teaser now says the whole thing, and
      // the caption said two thirds of it again in smaller type (2026-08-17).
      // There is no progress to report either — that is what deadlock means.
      const cap = stuck(g) ? ''
        : justJudged ? 'still deciding — click to change your mind' : g.cap;
      const sib = e.of > 1 ? ' sib' : '';

      // A judged entry is one line: label, your verdict, and — if the ground
      // moved under it — a lock mark, with the whole story in the tooltip.
      // Judged entries collapse to one line because nothing is being asked of
      // them. A stuck race is the exception in both directions: you have judged
      // it, and it is now asking for the largest thing on the surface.
      const oneLine = st === 'deciding' && !stuck(g);
      const top = !oneLine && !stuck(g) && g.id === topUrgentId && !seenTop;
      if (top) seenTop = true;
      html +=
        '<li class="qitem' + (top ? ' mosturgent' : '') + '" data-q="' + g.id + '" data-site="' + (e.site ?? '') + '">' +
        '<button class="' + [stateCls, sib.trim(), top ? 'mosturgent' : '',
          oneLine && g.shifted ? 'shifted' : '', justArrived === g.id ? 'arriving' : '']
          .filter(Boolean).join(' ') +
        '" data-q="' + g.id + '"' +
        (locked ? ' tabindex="-1"' : '') + ' aria-current="' + (openId === g.id) + '"' +
        (cap ? ' title="' + esc(g.shifted || cap) + '"' : '') +
        (() => {
          // the hue comes from `anchHue` so the rail entry and the clause it
          // stands beside cannot drift apart — one lifecycle, one colour
          const w = oneLine ? wash(g, g.shifted ? 'closed' : 'deciding')
            : wash(g, anchHue(g) || 'open', stuck(g) ? 0.55 : u);
          // **A diagonal has no progress** (Ed, 2026-08-17). The fill is
          // closeness-to-resolution, and a diagonal never resolves: salience is
          // a continuous ranking with no bar to clear and no threshold to
          // ratify, which is exactly why it can be advisory. A bar on it was
          // claiming a finish line that does not exist. So it washes flat, for
          // the same reason an unproposed draft does — there is nothing to be
          // close to.
          return washAttrs(qKey(g, e), w.col, isDiagonal(g) ? '100%' : w.fill);
        })() + '>' +
        (oneLine
          // **No verdict on the line** (Ed, 2026-08-17). It quoted the wording you
          // preferred, which on a one-line entry beside a title is six characters and
          // an ellipsis — unreadable, and unreadable text is worse than none, because
          // it looks like something you are failing to read. The mark already says you
          // have judged; the card says what you said, in full, when you open it.
          ? '<span class="ql">' + markHtml(g.shifted ? 'shifted' : 'deciding') +
            plainLabel(e.label || g.qLabel) + '</span>'
          : '<span class="ql">' +
            markHtml(markKindOf(g)) +
            (e.prio
              // four lines, so the two names can be read against each other
              // rather than colliding and truncating on one (Ed, 284)
              ? '<span class="qprio">Prioritise:<b>' + esc(plainLabel(e.prio[0])) +
                '</b><i>vs</i><b>' + esc(plainLabel(e.prio[1])) + '</b></span>'
              : '<span>' + plainLabel(e.label || g.qLabel) + '</span>') + '</span>' +
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
            teasersFor(g, e).map((t) => '<span class="qwhy">' + esc(t) + '</span>').join('')) +
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
    if (g.insertAfterKey || g.gapKey) return doc.querySelector('.insert-anchor[data-anchor="' + id + '"]');
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
    const railRect = queueEl.getBoundingClientRect();
    const railTop = railRect.top + scrollY;
    const pinned = [], flow = [];
    for (const el of queueEl.children) {
      const a = anchorForEntry(el.dataset.q, el.dataset.site);
      if (!a) { el.style.display = 'none'; continue; }
      el.style.display = '';
      const g = SUGGS.find((x) => x.id === el.dataset.q);
      if (!g && extraMeta.has(el.dataset.q)) {
        const x = extraMeta.get(el.dataset.q);
        const ay0 = a.getBoundingClientRect().top;
        el.classList.toggle('offclause', ay0 < BAND_TOP || ay0 > innerHeight - BAND_BOT);
        const row = { el, want: (a.getBoundingClientRect().top + scrollY) - railTop, h: el.offsetHeight,
          mine: !!x.mine, u: x.u ?? 0, rank: x.rank ?? 0 };
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
      const live = kind === 'urgent' || kind === 'propose' || kind === 'weigh' ||
        isUnread(g) || holdsFocus(el);
      (live ? pinned : flow).push(row);
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
    return { rgb: 'rgb(' + m[1] + ')', a: +(a + GROUND_A * (1 - a)).toFixed(3) };
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
  // the fixture's own pick on a card you have judged before and reopened
  const pickOf = (s) => (picked.has(s.id) ? picked.get(s.id) : (s.pick ?? null));
  // What is actually on the record, as against what is merely selected. The
  // tick reads pressed while the two agree and springs back out the moment you
  // choose something else (Ed, 216) — so a reopened judgment shows plainly that
  // it is already cast, and equally plainly when you have an uncommitted change.
  const committed = new Map();
  const committedOf = (s) => (committed.has(s.id) ? committed.get(s.id) : (s.pick ?? null));
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
      '<div class="rechead"><span>The Founder amended this</span>' +
      '<span class="sub">' + esc((s.decided || {}).when || '') + '</span></div>' +
      (skey
        ? clauseHeadHtml(s, {
            text: currentTextFor(skey), key: skey, chips: chipsFor(skey, s.id),
            label: null,
          })
        : '') +
      speakerHtml(s.rationale, undefined, s.by || 'The Founder') +
      // in the same `rsub` vocabulary the record uses for *the text that
      // stood*; silent where the server could not say what stood before
      (s.replaced
        ? '<div class="field"><div class="ranked wasthere">' +
          '<div class="rtag"><span class="rsub">the text it replaced</span></div>' +
          '<div class="rtext">' + esc(s.replaced) + '</div></div></div>'
        : '') +
      (isUnread(s)
        ? '<div class="race-mid commitrow"><span></span>' +
          '<button class="btn btn-approve" data-seen="' + s.id + '"' +
          ' title="It leaves your margin and stays in the record">OK</button></div>'
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
    const yours = verdicts.get(s.id) || s.verdict;
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
    // the highest any proposal reached against the text it was measured on —
    // the number the bar was actually being asked about
    const best = Math.max(0, ...field.map((c) => c.p ?? 0));
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
    const rest = ranked.filter((c) => c !== top);

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
      // The axis and the bar moved up here when the field label went: they govern
      // every number on the card, including the one now in the head.
      // **The eyebrow states the outcome, in units** (Ed, 2026-08-17). Two
      // quantities are being compared and they are different in kind — what the
      // room came to think, and the line that had to be crossed — so each gets a
      // mark: a gauge for the reading, a hurdle for the bar. With those, the whole
      // result is one line: *86% cleared 72%*, or *41% did not*. The comparator
      // does the work a sentence was doing.
      // **The whole record in one line** (Ed, 2026-08-17). It was three places —
      // an eyebrow, a rank label under it, and a record band at the foot — for
      // four numbers that belong together: how many weighed in, what they came
      // to, and what it had to clear. Each gets its unit and they read as one
      // sentence. Quorum and your own verdict move into the tooltip, where they
      // are still there for anybody who wants them and cost no ink.
      '<div class="rechead" title="' +
      esc((d.judges ?? 0) + ' of ' + ROSTER + ' weighed in · quorum was ' + FLOOR +
        ' · ' + (yours ? 'you ' + yours : 'you never voted on this')) + '">' +
      '<span>' + (und ? 'Undecided at the close' : 'Decided') + ' · ' + (d.judges ?? 0) + '/' + ROSTER + PEOPLE +
      // an undecided race with no reading prints no numbers: 0% > 0% is a
      // sentence about nothing
      (und && !(d.bar > 0) ? '' : ' · ' + pct(best) + JUDG +
        (best >= (d.bar ?? 0) ? ' &gt; ' : ' &lt; ') + pct(d.bar) + BAR) + '</span>' +
      '<span class="sub">' + esc(d.when || '') + '</span></div>' +
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
        ? '<span class="rsub">the ranking maths stopped short on this one; '
          + 'the decision stands</span>'
        : '') +
      (top
        ? clauseHeadHtml(s, {
            text: currentTextFor(skey), key: skey, chips: chipsFor(skey, s.id),
            label: null,
          }) + spk(top)
        : '') +
      // No label on the rest of the field (Ed, 2026-08-17): the hairline above it
      // already says *and here is everything else*, and the axis those numbers are
      // on is now stated in the eyebrow, in the units themselves.
      (rest.length
        ? '<div class="field">' +
          rest.map((c) => {
            return '<div class="ranked' + (c.incumbent ? ' wasthere' : '') + '">' +
            '<div class="rtag">' + tag(c) + line(c) + '</div>' +
            '<div class="rtext">' + esc(c.text) + '</div>' +
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
          '<button class="btn btn-approve" data-seen="' + s.id + '"' +
          ' title="It leaves your margin and stays in the record">OK</button></div>'
        : '') +
      '</div>'
    );
  }

  /* ===================================================================
     The composer (Ed, 2026-08-16; decisions 224–241).

     There is no composing *surface*. You compose by editing the charter: every
     clause carries a caret, and the first character you type opens the clause
     into two lanes — what it says on the left, what you are making it say on
     the right — with your rationale above and 🗑️ and the ✏️ hold below. The
     briefing, the drafting desk and the arrival bar from design/composer.html
     are all superseded by this; what survives of that mockup is the briefing,
     and only as an escalation state (SPEC §3.5).

     Three things follow from "it is just the document":
       · there is **one** draft at a time, because there is one caret;
       · a draft is a suggestion like any other, held in SUGGS with `mine` and
         `unproposed` set, so the rail, the wires, the folding and the margin
         geometry all work on it without knowing what it is;
       · nothing is spent until you press Propose. Opening the composer, typing
         in it, and cancelling are all free (SPEC §3.3 charges the stake at
         submission), which is what lets the surface put a caret in every
         paragraph without that being a threat.
     =================================================================== */
  const DRAFT_ID = 'draft-yours';
  let mineSeq = 0;                      // proposing frees the composer for the next draft
  const draftOf = () => SUGGS.find((x) => x.id === DRAFT_ID);
  // a gap that is not in DOC (it is rendered only in edit mode) stands half a
  // place after the block before it — `docIndexOf`'s own +0.5 for an insert
  const docIndexOfKey = (key) => {
    const i = DOC.findIndex((l) => l.key === key);
    if (i >= 0 || !isGapKey(key)) return i;
    return blockBeforeGap(key) + 0.5;
  };
  const siteFor = (d, key) => (d.sites || []).find((s) => s.keys.includes(key));

  function ensureDraft() {
    let d = draftOf();
    if (!d) {
      d = {
        id: DRAFT_ID, kind: 'draft', mine: true, unproposed: true, state: 'needs',
        keys: [], sites: [], rationale: '', qLabel: 'Your draft',
        urgency: 0, pct: 0, cap: '',
        // the sign choice (Q770): the base is the default, signing the opt-in
        signed: false,
      };
      SUGGS.push(d);
    }
    return d;
  }

  // Editing across a paragraph break joins the two rather than making a second
  // place (Ed, 225): a site is a **run** of adjacent clauses replaced by one
  // piece of text. Editing somewhere else entirely is the other case — a new
  // site, cabled to the first, which is a patch in the making (Ed, 232).
  // Returns the site and where in its text the new clause begins, so the caret
  // can be put back at the character you just typed rather than at the start of
  // whatever run it landed in.
  function addDraftSite(d, key, text, seed) {
    const at = docIndexOfKey(key);
    const orig = originOf(key, seed);
    // a gap never merges with a neighbour: an insertion at a boundary is its
    // own hunk (`start === end`), and joining it to the clause beside it would
    // turn a pure insert into that clause's rewrite
    // The gap is taken out of the candidate list rather than the list being
    // emptied: a draft that already holds one still merges two adjacent
    // *clauses* into one run, which is what a run is for.
    for (const s of isGapKey(key) ? [] : d.sites.filter((x) => !x.keys.some(isGapKey))) {
      const first = docIndexOfKey(s.keys[0]);
      const last = docIndexOfKey(s.keys[s.keys.length - 1]);
      // adjacency is literal: a heading in between means DOC[last+1] is the
      // heading, so the two clauses are not neighbours and never merge
      if (at === last + 1) {
        s.keys.push(key); s.origin.push(orig);
        const off = s.text.length + 1;
        s.text += '\n' + text;
        return { site: s, offset: off };
      }
      if (at === first - 1) {
        s.keys.unshift(key); s.origin.unshift(orig);
        s.text = text + '\n' + s.text;
        return { site: s, offset: 0 };
      }
    }
    const s = { keys: [key], origin: [orig], text, label: headingForKey(key) };
    d.sites.push(s);
    d.sites.sort((a, b) => docIndexOfKey(a.keys[0]) - docIndexOfKey(b.keys[0]));
    return { site: s, offset: 0 };
  }
  // What a site records about each block it replaces. The block *type* travels
  // with it (Ed, 2026-08-17) so a heading still reads as a heading in the lane
  // and in the proposal — otherwise editing a section title alongside its
  // paragraph would silently flatten it into body text.
  function originOf(key, seed) {
    const l = lineOf(key) || {};
    // a gap has nothing standing in it: an empty paragraph origin, marked so
    // the card's head can say which gap and the host can send an insertion
    if (isGapKey(key)) return { key, text: '', note: seed ? seed.note : null, t: 'p', gap: true };
    return { key, text: seed ? seed.text : currentTextFor(key), note: seed ? seed.note : null,
             t: l.t, level: l.level };
  }

  // A **run** of blocks taken as one site. Ed's ruling (2026-08-17): four
  // contiguous paragraphs deleted together are one candidate, and not even a
  // patch — a patch is one judgment shown at several *separate* places, and a
  // run is one place that happens to be several blocks long. So this makes a
  // single site whatever the run's length, which is what `draft-site` has meant
  // since 225; all that is new is being able to select one rather than having
  // to type your way across it.
  function addDraftRun(d, keys, text) {
    const s = { keys: keys.slice(), origin: keys.map((k) => originOf(k, null)),
                text, label: headingForKey(keys[0]) };
    d.sites.push(s);
    d.sites.sort((a, b) => docIndexOfKey(a.keys[0]) - docIndexOfKey(b.keys[0]));
    return s;
  }

  const syncDraftKeys = (d) => { d.keys = d.sites.flatMap((s) => s.keys); };

  // A site's left lane is the clauses it replaces, which the fixture must not
  // restate: hand-copied charter text is the "parallel literals kept in sync by
  // hand" failure the mockup's own conventions warn against. So a seeded
  // proposal gives keys and its new wording, and the original is read out of
  // the document. Only a lane-seeded draft (Ed, 228) carries its own, because
  // there the thing being edited is somebody else's proposal rather than the
  // charter.

  // Something already proposed at this clause — so the card can say whether you
  // are opening a race or joining one (Ed, 229).
  const liveRivalFor = (d, site) => SUGGS.find((x) =>
    x !== d && x.state !== 'sealed' && !x.mine && (x.keys ?? []).some((k) => site.keys.includes(k)));

  function dropDraft() {
    const i = SUGGS.findIndex((x) => x.id === DRAFT_ID);
    if (i >= 0) SUGGS.splice(i, 1);
  }

  // ---- the caret ------------------------------------------------------
  // Typing has to survive the clause turning into a card: the character you
  // pressed is already in the right-hand lane when it appears, and the caret
  // lands just after it. Held as a character offset rather than as a node,
  // because the node measured before the render does not exist after it — the
  // same rule the scroll anchoring works by.
  // Everything a block carries that is not its text: the gutter marks on a
  // clause, the fold triangle on a heading. All of it sits *before* the words,
  // so its length is a constant to subtract rather than a position to track.
  const leadLen = (block) => [...block.querySelectorAll('.chipcol, .nocaret')]
    .reduce((n, el) => n + el.textContent.length, 0);

  // Where a point in the document falls inside one block, in characters.
  function offsetIn(block, node, off) {
    if (!block.contains(node)) return null;
    const r = document.createRange();
    r.selectNodeContents(block);
    try { r.setEnd(node, off); } catch (e) { return null; }
    return Math.max(0, r.toString().length - leadLen(block));
  }

  function caretRangeIn(p) {
    const sel = getSelection();
    if (!sel || !sel.rangeCount) return null;
    const r0 = sel.getRangeAt(0);
    if (!p.contains(r0.startContainer) || !p.contains(r0.endContainer)) return null;
    return { start: offsetIn(p, r0.startContainer, r0.startOffset),
             end: offsetIn(p, r0.endContainer, r0.endOffset) };
  }

  // The run of blocks a selection touches. One block is the ordinary case; more
  // than one is Ed's — select across paragraphs, or across a heading and its
  // paragraph, and act on the lot as a single candidate (2026-08-17).
  function selectedBlocks() {
    const sel = getSelection();
    if (!sel || !sel.rangeCount) return null;
    const r = sel.getRangeAt(0);
    const blockOf = (n) => {
      const el = n.nodeType === 1 ? n : n.parentElement;
      const b = el && el.closest ? el.closest('.editable[data-key]') : null;
      return b && !b.closest('.sugg') ? b : null;
    };
    const a = blockOf(r.startContainer), b = blockOf(r.endContainer);
    if (!a || !b) return null;
    const all = [...doc.querySelectorAll('.editable[data-key]')].filter((el) => !el.closest('.sugg'));
    const i = all.indexOf(a), j = all.indexOf(b);
    if (i < 0 || j < 0) return null;
    return { blocks: all.slice(Math.min(i, j), Math.max(i, j) + 1), range: r, a, b };
  }

  function setCaretIn(block, n) {
    const sel = getSelection();
    const r = document.createRange();
    const walk = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let node = walk.nextNode(), acc = 0;
    while (node) {
      if (acc + node.length >= n) { r.setStart(node, n - acc); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); return; }
      acc += node.length;
      node = walk.nextNode();
    }
    r.selectNodeContents(block); r.collapse(false);       // an empty block has no text node
    sel.removeAllRanges(); sel.addRange(r);
  }

  // Where the caret is in a lane, counted in characters across its blocks with
  // one for each newline between them — the same coordinate `placeCaret` takes,
  // so the pair survives the lane being rewritten underneath them.
  function laneCaret(lane) {
    const sel = getSelection();
    if (!sel || !sel.rangeCount) return null;
    const r0 = sel.getRangeAt(0);
    if (!lane.contains(r0.endContainer) && r0.endContainer !== lane) return null;
    let off = 0;
    for (const b of lane.children) {
      if (b === r0.endContainer || b.contains(r0.endContainer)) {
        const r = document.createRange();
        r.selectNodeContents(b);
        r.setEnd(r0.endContainer, r0.endOffset);
        return off + r.toString().length;
      }
      off += b.textContent.length + 1;
    }
    return null;
  }

  function placeCaret(lane, off) {
    const blocks = [...lane.children];
    if (!blocks.length) return lane.focus({ preventScroll: true });
    let n = off == null ? Infinity : off;
    for (const b of blocks) {
      const len = b.textContent.length;
      if (n <= len) return setCaretIn(b, n);
      n -= len + 1;                                       // the newline between blocks
    }
    setCaretIn(blocks[blocks.length - 1], blocks[blocks.length - 1].textContent.length);
  }

  // ---- opening the composer -------------------------------------------
  // `initial` carries the keystroke that started it: the clause with that one
  // character already applied, and where the caret should sit afterwards.
  function startDraft(key, seed, initial) {
    if (!key) return;
    const d = ensureDraft();
    let site = siteFor(d, key), offset = 0;
    if (site) {
      if (initial) site.text = initial.text;
      // **A seed replaces what is in the box** (Ed, 2026-08-17: *clicking a
      // "propose edit" puts that text in it instead*). It used to seed only on
      // the way in, so pressing ✏️ on a second wording — or on any wording once
      // the desk already held a draft — did nothing at all, which is exactly
      // the case the `deadlock-card` is built around: reading eight and trying
      // two of them. The origin travels with it, so the green marking is
      // measured against the wording you took rather than against the clause.
      else if (seed) {
        const at = site.keys.indexOf(key);
        site.text = seed.text;
        site.keys = [key];
        site.origin = [originOf(key, seed)];
        if (at < 0) site.label = headingForKey(key);
      }
    }
    else {
      const added = addDraftSite(d, key, (initial ? initial.text : (seed ? seed.text : currentTextFor(key))), seed);
      site = added.site; offset = added.offset;
    }
    syncDraftKeys(d);
    // a draft on a gap renders in the gap: the held-open `.insert-anchor`
    // after the block before it is where its card stands (the read side's
    // existing shape for a proposed section, Q261's smaller half)
    if (isGapKey(key)) {
      const at = blockBeforeGap(key);
      d.insertAfterKey = at >= 0 ? DOC[at].key : null;
      d.gapKey = key;
    }
    d.focusKey = key;                    // what holdSel keeps still, and where the caret goes
    const caret = initial ? offset + initial.caret : null;
    const land = () => {
      const lane = doc.querySelector('[data-lane="' + site.keys[0] + '"]');
      if (!lane) return;
      lane.focus({ preventScroll: true });      // the card may still be unrolling
      placeCaret(lane, caret);
      caretPulse();          // the one caret move the reader did not make
    };
    // A `deadlock-card` holds its own composer at its foot, so a draft started
    // there must not carry the surface off to the draft's own card: the field
    // you are writing against is the whole reason you are there (Ed,
    // 2026-08-17). It stays open and re-renders with the desk now backed by a
    // real site.
    const host = SUGGS.find((x) => x.id === openId);
    if (host && stuck(host) && (host.keys ?? []).includes(key)) {
      keepStill(() => renderAll(), '[data-card="' + host.id + '"]');
      land();
      layoutQueue(); drawWires();
      return;
    }
    if (openId === d.id) {
      keepStill(() => renderAll(), '[data-key="' + key + '"]');
      land();
      layoutQueue(); drawWires();
      return;
    }
    toggle(d.id, true, land);
  }

  // The first keystroke in a clause. Every input is intercepted: the charter
  // itself is never modified in place — what the character does is open the
  // composer with that character already in it, which is what makes typing in
  // the document safe to offer everywhere (Ed, 224).
  function startDraftFromTyping(p, ev) {
    const key = p.dataset.key;
    if (!key) return;
    const orig = currentTextFor(key);
    const sel = caretRangeIn(p) || { start: orig.length, end: orig.length };
    let a = Math.min(sel.start, orig.length), b = Math.min(sel.end, orig.length);
    // **Enter at a clause edge inserts rather than rewrites** (backlog 204,
    // Q261): a collapsed caret at the very end of an unmodified clause opens a
    // draft on the gap after it, at the very start on the gap before it — a
    // new clause, and the neighbour untouched. Mid-clause keeps the split
    // below. The gap block itself takes Enter as any other keystroke.
    const enter = ev.inputType === 'insertParagraph' || ev.inputType === 'insertLineBreak';
    const d0 = draftOf();
    if (enter && a === b && !isGapKey(key) && !(d0 && siteFor(d0, key))) {
      if (a === orig.length) return startDraft(gapAfter(key), null, { text: '', caret: 0 });
      if (a === 0 && orig.length) return startDraft(gapBefore(key), null, { text: '', caret: 0 });
    }
    let ins = '';
    switch (ev.inputType) {
      case 'insertText': ins = ev.data == null ? '' : ev.data; break;
      // Enter at the end of a clause makes a new one and leaves the old alone
      // (Ed, 231) — which falls out of this for free: the lane holds a run of
      // paragraphs, so a newline at the end is simply an empty second block.
      case 'insertParagraph': case 'insertLineBreak': ins = '\n'; break;
      case 'insertFromPaste':
        ins = (ev.dataTransfer && ev.dataTransfer.getData('text/plain')) || ''; break;
      case 'deleteContentBackward': if (a === b) { if (a === 0) return; a -= 1; } break;
      case 'deleteContentForward': if (a === b) { if (b >= orig.length) return; b += 1; } break;
      default: return;                       // formatting commands have nothing to do here
    }
    startDraft(key, null, { text: orig.slice(0, a) + ins + orig.slice(b), caret: a + ins.length });
  }

  // What the same keystroke means when the selection spans more than one block
  // (Ed, 2026-08-17). The run is flattened to one string with a newline between
  // blocks — which is exactly what a `draft-site` already is — the selection is
  // located in *that* string rather than in any one block, and the edit is
  // applied to it. Deleting four paragraphs is therefore not four deletions
  // coordinated afterwards: it is one edit to one piece of text, which is why
  // it comes out as one candidate and not as a patch.
  function startDraftFromRun(picked, ev) {
    const keys = picked.blocks.map((b) => b.dataset.key);
    const texts = keys.map(currentTextFor);
    const run = texts.join('\n');
    const flat = (block, node, off) => {
      const i = picked.blocks.indexOf(block);
      const within = offsetIn(block, node, off);
      if (i < 0 || within == null) return null;
      return texts.slice(0, i).reduce((n, t) => n + t.length + 1, 0) + Math.min(within, texts[i].length);
    };
    const r = picked.range;
    let a = flat(picked.a, r.startContainer, r.startOffset);
    let b = flat(picked.b, r.endContainer, r.endOffset);
    if (a == null || b == null) return;
    if (a > b) { const t = a; a = b; b = t; }
    let ins = '';
    switch (ev.inputType) {
      case 'insertText': ins = ev.data == null ? '' : ev.data; break;
      case 'insertParagraph': case 'insertLineBreak': ins = '\n'; break;
      case 'insertFromPaste':
        ins = (ev.dataTransfer && ev.dataTransfer.getData('text/plain')) || ''; break;
      case 'deleteContentBackward': case 'deleteContentForward':
      case 'deleteByCut': case 'deleteWordBackward': case 'deleteWordForward':
        break;                                 // the selection itself is what goes
      default: return;
    }
    const d = ensureDraft();
    const site = addDraftRun(d, keys, run.slice(0, a) + ins + run.slice(b));
    syncDraftKeys(d);
    d.focusKey = keys[0];
    const caret = a + ins.length;
    const land = () => {
      const lane = doc.querySelector('[data-lane="' + site.keys[0] + '"]');
      if (!lane) return;
      lane.focus({ preventScroll: true });
      placeCaret(lane, caret);
      caretPulse();          // the one caret move the reader did not make
    };
    if (openId === d.id) {
      keepStill(() => renderAll(), '[data-key="' + keys[0] + '"]');
      land(); layoutQueue(); drawWires(); return;
    }
    toggle(d.id, true, land);
  }

  // The right-hand lane marks what is new, exactly as every other pair does
  // (Ed, 263, applying 91: the *result*, never a redline — only the new wording
  // is lit, and nothing is ever struck through). It earns its place twice over
  // here. It is the ordinary grammar of the surface, so a proposal of yours
  // reads the way somebody else's will read to you. And it answers the thing
  // that raised the question: a draft that changes nothing shows **no green at
  // all**, so a stray keystroke is visibly not a draft of anything, without the
  // surface having to quietly throw somebody's typing away on their behalf.
  //
  // Word-level, with whitespace as its own token, so a changed word lights the
  // word rather than the sentence. Insertions only: what was removed is one
  // column to the left, in full, which is the whole argument of 91.
  // Punctuation is its own token as well as whitespace. Glued to the word, a
  // clause that only gains a comma renders as the word being deleted and an
  // identical word inserted — "used on ~~bone~~ bone," — which is nonsense the
  // reader has to see through. Split off, the comma is the only thing that
  // lights, which is the truth.
  // Rich by default; markdown is the checking view (Ed, 2026-08-17). One
  // preference rather than one per card \u2014 it is how *you* like to work, and it
  // would be strange for it to reset every time a different clause opened.
  let laneMode = 'rich';
  const laneRaw = () => laneMode === 'md';

  // **The sign control** (Q770, Ed 2026-08-25: *a new control that's part of
  // the rationale composer area that switches between signed and anonymous,
  // that shows when anonymity is allowed*). Drawn only under an elective 👤
  // rung — `SIGNING()` returns that rung's base, or null for every fixed rung,
  // the fixture and a page with no module — because a fixed rung offers no
  // choice. The base comes first as the default; signing is the opt-in, per
  // proposal, and fixed at Propose: once submitted the choice is part of the
  // record (`mine` says *signed* and offers no switch). The radio is the
  // session-view's own (`.lanepick`), in the `.choice`/`.pick` shape every
  // settings choice takes, so `card-audit`'s rules read it.
  // A nameless member signs *as Anonymous* (§9.0c: it is a name, not a gap) —
  // the label says what the signature will read, and they may go and set one.
  /**
   * The commit at the right of the composer's row, and **✒️ beside ✏️ where
   * the Founder holds the pen on the Text** (R-058, entry 160; the pair is
   * entry 161, applied to the text at Ed's QA of 2026-08-30 — a founder who
   * is a member has both routes and is offered both). The pen first, the
   * room's route after it, as every band card orders them: the Founder's own
   * act where the eye already goes, putting it to the membership the
   * deliberate second reach. Under the pen nothing is staked (an empty ✏️
   * wallet cannot stop it) and the glyph, the price and the duration differ;
   * the gesture is the same hold.
   *
   * `data-pen` is how the hold below knows which act it is landing, and it is
   * on the button rather than in a closure because the hold survives a render
   * and re-finds its control by selector.
   */
  function commitBtnHtml(o) {
    const pen = MAY_PEN();
    const propose = '<button class="btn btn-propose glyphbtn emojibtn" data-act="draft-propose"' +
      (o.disabled ? ' disabled' : '') + ' title="' + esc(o.title) + '">✏️</button>';
    if (!pen) return propose;
    return '<button class="btn btn-propose glyphbtn emojibtn" data-act="draft-propose" data-pen="1"' +
      (o.penDisabled ? ' disabled' : '') + ' title="' + esc(o.penTitle) + '">✒️</button>' + propose;
  }
  /**
   * **The proposal-row** (backlog 204, SURFACE §9.1, K31): the commit row of
   * the text as a card, drawn at the foot of the column in edit mode and
   * stuck to the bottom of the window while the foot is out of view. 🗑️ at
   * the very left, always live, discards the whole draft; the commit at the
   * very right, greyed until a site differs from its origin; the middle says
   * how many places have changed. One helper for both hosts: session.js draws
   * it under the charter post-🍾, and the page draws it under `#prose` before
   * the start with the founder's ✒️ (which is `confirm-starting-text`, not
   * the pen — the era gate is the page's, R-058).
   *
   * **The pair** (`o.pair`, entry 161 at Ed's QA of 2026-08-30): post-🍾 a
   * Founder who holds the pen and is a member is offered ✒️ *and* ✏️, the pen
   * first; either press opens the editing card, where the two holds live.
   * Pre-🍾 there is no membership to propose to, so the page never asks for
   * the pair and the confirm stays one ✒️.
   */
  function proposalRowHtml(o) {
    o = o || {};
    const n = o.count || 0;
    const mid = n === 0 ? '' : n === 1 ? '1 place changed' : n + ' places changed';
    const btn = (pen, title) => '<button class="btn btn-propose glyphbtn emojibtn" data-act="row-commit"' +
      (pen ? ' data-pen="1"' : '') + (o.disabled ? ' disabled' : '') +
      ' title="' + esc(title || '') + '">' + (pen ? '✒️' : '✏️') + '</button>';
    return '<div class="race-mid commitrow proposalrow" data-proposalrow="1">' +
      '<button class="btn btn-withdraw glyphbtn" data-act="row-discard"' + (o.discardDisabled ? ' disabled' : '') +
      ' title="' + esc(o.discardTitle || 'Discard the whole draft — nothing has been spent on it') + '">🗑️</button>' +
      '<span class="rowmid">' + esc(mid) + '</span>' +
      (o.pen ? btn(true, o.title) + (o.pair ? btn(false, o.proposeTitle) : '') : btn(false, o.title)) +
      '</div>';
  }
  // what the row says about the draft as it stands
  const draftRowState = () => {
    const d = draftOf();
    const sites = d && d.unproposed ? d.sites : [];
    // **The middle counts places that have *changed*** (SURFACE K31, Q1089),
    // which is not the same as places the draft has touched: type a character
    // into a clause and take it out again and the site survives with its
    // origin's own wording, so `sites.length` would say *1 place changed*
    // beside a greyed commit.
    const dirty = sites.filter((s) => s.text !== s.origin.map((x) => x.text).join('\n'));
    return { count: sites.length, changedCount: dirty.length, changed: dirty.length > 0 };
  };
  function signControlHtml(d) {
    const base = SIGNING();
    if (!base) return '';
    const name = (SIGNER() || '').trim() || 'Anonymous';
    const pick = (on, val, ttl, exp) =>
      '<div class="pick' + (on ? ' on' : '') + '">' +
      '<button class="lanepick" type="button" aria-pressed="' + on + '" data-act="draft-sign" data-signed="' + val + '">' +
      '<span class="dot"></span><span>' + ttl + '</span></button>' +
      '<span class="exp">' + exp + '</span></div>';
    return '<div class="choice signctl" role="radiogroup" data-signbase="' + base + '">' +
      pick(!d.signed, '0', 'Anonymous', 'Nobody is told who proposed this' +
        (base === 'anonymous' ? ' — ever.' : ' until the document is finished.')) +
      pick(!!d.signed, '1', 'Signed — as ' + esc(name),
        'Your name goes on it from the moment you propose it, and stays there.') +
      '</div>';
  }
  // **What the room will see on a proposal of yours that is already out** (K30):
  // your own person where the name went with it — you signed it, or the rung is
  // `public` — and nothing where it did not, which draws the blank disc. It is
  // the same test `draftFaceHtml` makes one step earlier, with the choice now
  // fixed in the record rather than sitting under a radio.
  const mineSpeaker = (d) => {
    const named = AUTHOR_RUNG() === 'public' || !!(d && d.signed);
    return (named && SIGNER_PERSON()) || undefined;
  };
  // the press flips the draft's choice and patches the card in place — never
  // a render under a lane being typed in (the caret rule, `setData`'s guard)
  function setDraftSigned(on) {
    const d = draftOf();
    if (!d || !SIGNING()) return;
    d.signed = !!on;
    doc.querySelectorAll('.sugg[data-card="' + DRAFT_ID + '"]').forEach((card) => {
      card.querySelectorAll('.signctl .pick').forEach((p) => {
        const b = p.querySelector('[data-signed]');
        const here = b && b.dataset.signed === (d.signed ? '1' : '0');
        p.classList.toggle('on', !!here);
        if (b) b.setAttribute('aria-pressed', String(!!here));
      });
      // the ✏️, never the ✒️ beside it — a decree leaves with no signature to name
      const pb = card.querySelector('[data-act="draft-propose"]:not([data-pen])');
      if (pb) pb.title = pb.title.replace(/( — signed)?( — one edit)/, (d.signed ? ' — signed' : '') + '$2');
      // **The face follows the choice** (K30): signing is the moment the room
      // stops being told nothing about you, so the disc gives way to your own
      // picture as the radio moves. One element is swapped — never the `.said`
      // beside it, which is the lane holding the caret.
      const sp = card.querySelector('.lanebox .speaker');
      const face = sp && sp.firstElementChild;
      if (face) {
        const tmp = document.createElement('div');
        tmp.innerHTML = draftFaceHtml(d);
        if (tmp.firstElementChild) sp.replaceChild(tmp.firstElementChild, face);
      }
    });
  }

  function editCardHtml(d, site) {
    const n = d.sites.length;
    const i = d.sites.indexOf(site);
    const broke = editsHeld < EDIT_RULES.stake;
    const rival = liveRivalFor(d, site);
    const seeded = site.origin.find((o) => o.note);
    const step = (to, label, glyph) => (to === null
      ? '<span class="pstep off">' + glyph + '</span>'
      : '<button class="pstep" data-step="' + d.id + ':' + d.sites[to].keys[0] + '" title="' + esc(label) + '">' + glyph + '</button>');
    return (
      '<div class="sugg editcard" data-card="' + d.id + '" data-anchor="' + d.id + '" data-site="' + site.keys[0] + '">' +
      (n > 1
        ? '<div class="pnav"><span class="pwhere">' + esc(site.label) + ' · place ' + (i + 1) + ' of ' + n + '</span>' +
          '<span class="psteps">' + step(i > 0 ? i - 1 : null, 'The place before', '↑') +
          step(i < n - 1 ? i + 1 : null, 'The next place', '↓') + '</span></div>'
        : '') +
      // The clause at the head, like every other card (Ed, 2026-08-16, closing
      // Q275). It had stayed paired on the argument that while you are writing
      // you want the original beside you rather than above you — which does not
      // survive contact: the original is one line up, your own additions are
      // marked green as you type (263), and a full-width lane is a far better
      // place to write a paragraph of prose than a 300px column.
      clauseHeadHtml(d, {
        // a gap's head names the gap, there being no clause to show
        label: seeded ? seeded.note : site.origin[0] && site.origin[0].gap ? gapLabel(site.keys[0]) : undefined,
        html: site.origin.map((o) => '<div class="lp' + (o.t === 'h' ? ' hblock' : '') + '" data-key="' + o.key + '">' + esc(o.text) + '</div>').join(''),
      }) +
      // and your draft as the one reply, in the reply's own order: the wording,
      // then the argument for it behind the same blank disc everybody else's
      // sits behind — which is what the rest of the roster will see (§3.4).
      '<div class="field"><div class="fieldlab">What you are proposing</div>' +
      '<div class="propblock">' + laneBoxHtml(d, site) + '</div>' +
      // …and, under an elective 👤 rung, whether your name goes on it (Q770):
      // part of the rationale composer area, above the row that commits it
      signControlHtml(d) + '</div>' +
      // **The proposal's lifecycle is one row** (Ed, 2026-08-17). Discard on the
      // very left, commit on the very right, and the row does not move when the
      // draft becomes a proposal — only the right-hand control changes from the
      // act to the fact of it, exactly as the judgment row's ✓ goes from
      // available to pressed. Cancel was a word on the right, which put *leave
      // this* where every other card puts *finish this*.
      '<div class="race-mid commitrow">' +
      '<button class="btn btn-withdraw glyphbtn" data-act="draft-cancel"' +
      ' title="Discard this draft — nothing has been spent on it yet">🗑️</button>' +
      // **✏️, and a second press to mean it** (Ed, 2026-08-17). Proposing is
      // the one irreversible-feeling act on this surface — it spends an edit and
      // puts your wording in front of the room — and it was a single click on a
      // button sitting under the text you were typing in.
      //
      // The confirmation is not a dialog and not a hold. The button starts as a
      // bare ✏️ and the first press **arms** it, at which point it says what it
      // will cost. That keeps the rule the price has always had — *the edit is
      // spent at Propose, which is where the price is said in words* — and
      // makes the price itself the confirmation step, rather than bolting a
      // "sure?" onto it. Pressing anything else disarms it.
      commitBtnHtml({
        disabled: broke,
        title: broke ? 'No ✏️ left — another arrives as the drip accrues'
          : 'Hold to propose this' + (n > 1 ? ' in all ' + n + ' places' : '') +
            // the hold's tooltip says what leaves: a signed one leaves with your name
            (d.signed ? ' — signed' : '') +
            ' — one edit leaves your wallet to pay for it',
        penTitle: 'Amend the document' + (n > 1 ? ' in all ' + n + ' places' : '') +
          ' — it passes at once and costs nothing',
      }) +
      '</div>' +
      // Only the two facts that change what pressing ✏️ *does* (Ed, 2026-08-17).
      // What it costs is now shown rather than said — the pencil crosses the
      // screen — and the rest was the design explaining itself.
      (rival || n > 1
        ? '<div class="foot">' +
          (rival ? 'Yours joins the proposals already racing here' : '') +
          (rival && n > 1 ? ' · ' : '') +
          (n > 1 ? 'All ' + n + ' places go in as one change' : '') + '.</div>'
        : '') +
      // a live refusal (the text moved under the draft) is said on the card,
      // where the draft still is — never lost to a console
      (d.refusal ? '<div class="foot refusal">' + esc(d.refusal) + '</div>' : '') +
      '</div>'
    );
  }

  // Once it is in, the same geometry read-only, and your proposal on the right
  // (Ed, 229) — the side it will always be on wherever it is shown to you.
  function mineCardHtml(d, site) {
    const n = d.sites.length;
    const i = Math.max(0, d.sites.indexOf(site));
    const s = site || d.sites[0];
    // (`liveRivalFor` went with the `yoursnote`: the note was its only reader.)
    const step = (to, label, glyph) => (to === null
      ? '<span class="pstep off">' + glyph + '</span>'
      : '<button class="pstep" data-step="' + d.id + ':' + d.sites[to].keys[0] + '" title="' + esc(label) + '">' + glyph + '</button>');
    return (
      '<div class="sugg minecard" data-card="' + d.id + '" data-site="' + s.keys[0] + '">' +
      (n > 1
        ? '<div class="pnav"><span class="pwhere">' + esc(s.label) + ' · place ' + (i + 1) + ' of ' + n + '</span>' +
          '<span class="psteps">' + step(i > 0 ? i - 1 : null, 'The place before', '↑') +
          step(i < n - 1 ? i + 1 : null, 'The next place', '↓') + '</span></div>'
        : '') +
      // The `yoursnote` is gone (Ed, 2026-08-17). It opened every card of your
      // own with three sentences of mechanism — that nothing is asked of you,
      // that standing behind a proposal counts as preferring it, that you will
      // still be served the rest of the race against it — and every one of them
      // is a fact about *all* your proposals, so it appeared on every one. A
      // footnote that appears on every card is a design note, not information.
      // The card already says the two things that matter here: there is no
      // radio, and the one control is a withdrawal.
      // Your own proposal is a proposal like any other, so it is drawn like
      // any other: the clause it rewrites at the head, your wording under it
      // stating its own change, your argument behind the same disc everybody
      // else's sits behind. What differs is only what you can do — nothing is
      // asked of you, and the one act is withdrawal.
      // **And the disc is what the room sees, not what you know** (K30): your
      // own face where the name is attached — you signed it, or the rung is
      // `public` — and the blank disc where it is sealed, which is the point.
      // The line is your only reading of your own proposal, so it has to be
      // the room's reading of it.
      clauseHeadHtml(d, { text: s.origin.map((o) => o.text).join(' '), key: s.keys[0],
                          chips: chipsFor(s.keys[0], d.id) }) +
      fieldHtml('<div class="propblock"><div class="rtext">' +
        laneBlocks(s.text, originText(s), headFlags(s)) + '</div>' +
        speakerHtml(d.rationale, undefined, mineSpeaker(d)) + '</div>',
        1, 'What you proposed') +
      // **The same row the editing card had, one step further on** (Ed,
      // 2026-08-17). 🗑️ stays exactly where it was — discarding a draft and
      // withdrawing a proposal are the same gesture at two moments, and the
      // only difference is that one of them hands an edit back. And the right
      // slot keeps the ✏️ that was *Propose*, now reading **Submitted**: the
      // act has become the fact of it, which is what the judgment row's ✓ does
      // when it is pressed. Nothing moves between the two cards, which is the
      // point — it is one lifecycle, not two screens.
      '<div class="race-mid commitrow">' +
      '<button class="btn btn-withdraw glyphbtn" data-act="draft-withdraw" title="Withdraw' +
      (n > 1 ? ' all ' + n + ' places' : '') + ' — the edit comes back in full">🗑️</button>' +
      '<button class="btn btn-propose" aria-pressed="true" disabled' +
      ' title="Proposed — one edit spent. It is in the race now.">✏️ Submitted</button>' +
      '</div>' +
      '</div>'
    );
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
  function filedFor(key) {
    return key ? SUGGS.filter((g) => (g.keys ?? []).includes(key) &&
      stateOf(g) === 'sealed' && !isUnread(g)) : [];
  }

  // The tab of the card you are reading: the same control it was in the gutter,
  // in the same place, so the thing you clicked to open the card is the thing
  // you click to close it.
  const ownChipHtml = (g) =>
    '<span class="achip wmark" role="button" tabindex="0" data-anchor="' + g.id + '"' +
    chipStyle(g) + ' title="Close this one">' + mkHtml(markKindOf(g)) + '</span>';

  const achipHtml = (g, key, o) =>
    '<span class="achip' + (o.inert ? ' behind' : '') + '"' +
    (o.inert ? ' aria-hidden="true"' : ' role="button" tabindex="0"') +
    ' data-anchor="' + g.id + '"' + chipStyle(g, o.z ? 'z-index:' + o.z : '') +
    (o.inert ? '' : ' title="' + esc(plainLabel(g.qLabel)) +
      (g.kind === 'patch'
        ? ' · place ' + (g.sites.findIndex((x) => x.key === key) + 1) + ' of ' + g.sites.length
        : '') + (o.title || ' — open it') + '"') +
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
      (open ? '' : ' role="button" tabindex="0" title="' + gs.length +
        ' decided and filed at this clause — open them"') + '>' +
      gs.map((g, i) => (g.id === activeId ? ownChipHtml(g) : achipHtml(g, key, {
        inert: !open, z: gs.length - i, title: ' — the record',
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
    const cur = currentTextFor(key);
    const field = fieldOf(s);
    const yours = verdicts.get(s.id) || s.verdict;
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
      clauseHeadHtml(s, { text: currentTextFor(key), key: key, chips: chipsFor(key, s.id),
                          label: 'The clause as it stands — and it is still standing' }) +
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
      '<div class="field"><div class="fieldlab">Everything in flight · ' + field.length +
      ' proposals, oldest first</div>' +
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
          '✏️ propose something everyone can agree on</div>' +
          '<div class="propblock">' + laneBoxHtml(d, site, site ? null : key) + '</div></div>' +
      // The same row as the editing card's, and it stays the same row: 🗑️ at
      // the very left for the whole of a proposal's life, the commit control at
      // the very right. The ✏️ is greyed until there is something to propose,
      // which is what gives an untouched desk its shape. **🗑️ is never
      // disabled** (Q613, 2026-08-22, the one-bin rule): it is the way out of
      // the card, and with nothing to put back it simply closes it.
          '<div class="race-mid commitrow">' +
          '<button class="btn btn-withdraw glyphbtn" data-act="draft-cancel"' +
          ' title="' + (site ? 'Discard this draft — nothing has been spent on it yet'
                             : 'Close — there is nothing here to put back') + '">🗑️</button>' +
          commitBtnHtml({
            disabled: !(site && !broke),
            title: 'Hold to propose this — one edit leaves your wallet to pay for it',
            penDisabled: !site,
            penTitle: 'Amend the document — it passes at once and costs nothing',
          }) +
          '</div>'
        : '') +
      '</div>'
    );
  }

  // Q440 (2026-08-21): 🛡️ held on the Text — a live item carries crownWaits,
  // and the card says a carried change waits on the Founder before it lands
  const crownNote = (s) => (s.crownWaits
    ? '<p class="setnote">If it passes it goes to the Founder, who may assent or refuse before it lands.</p>' : '');
  function suggCardHtml(s, siteKey) {
    if (stateOf(s) === 'sealed') return sealedCardHtml(s);
    if (stuck(s)) return deadlockCardHtml(s);
    if (s.kind === 'draft') {
      const site = (siteKey && siteFor(s, siteKey)) || s.sites[0];
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
      const q = (c, v) =>
        '<div class="propblock">' +
        '<div class="rtag">' + esc(c.name) + '</div>' +
        '<div class="rtext">' + esc(c.why) + '</div>' +
        '<div class="qclause">' + esc(currentTextFor(c.key)) + '</div>' +
        laneBarHtml(s, v, { edit: false }) + '</div>';
      return (
        '<div class="sugg diag-open" data-card="' + s.id + '" data-site="' +
        (siteKey || s.pair[0].key) + '">' +
        clauseHeadHtml(s, { label: 'This card asks',
                            html: 'Which of these deserves more of the membership’s attention?' }) +
        fieldHtml(q(s.pair[0], 'first') + q(s.pair[1], 'second'), 2, 'The two questions') +
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
        '<div class="foot">This ranks the questions, never the answers — neither text changes either way.</div>' +
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
        clauseHeadHtml(s, { text: currentTextFor(ckey), key: ckey, chips: chipsFor(ckey, s.id) }) +
        fieldHtml(proposalHtml(s, { html: resultOnly(s.marked), why: s.rationale, by: s.by })) +
        '<div class="foot">The membership passed this. Until you answer, the clause above stands.</div>' +
        '<div class="race-mid commitrow">' +
        '<button class="btn glyphbtn" data-act="clear-close" title="Close — the question stays pending">🗑️</button>' +
        '<span class="rightpair">' +
        '<button class="btn glyphbtn" data-act="crown-refuse"' +
        ' title="Refuse — the shield holds it, and the clause above stands">🛡️</button>' +
        '<button class="btn btn-approve glyphbtn" data-act="crown-accept"' +
        ' title="Accept — the pen passes it now">✒️</button>' +
        '</span></div>' +
        '</div>'
      );
    }
    if (s.kind === 'race') {
      // The clause, which this card had never shown (Ed, QA 2026-08-16) — a
      // reader was being asked to choose between two rewrites without being
      // shown what they rewrite. It carries no control, because nothing on a
      // race can vote to keep it: displacement is settled by the
      // adoption-threshold, not by this judgment (SPEC §5).
      const rkey = (s.keys ?? [])[0];
      const cur = currentTextFor(rkey);
      return (
        '<div class="sugg race-open" data-card="' + s.id + '" data-site="' + rkey + '">' +
        clauseHeadHtml(s, { text: cur, key: rkey, chips: chipsFor(rkey, s.id) }) +
        // two replies to the same post; each states its own change against the
        // clause above, and carries its own argument and controls
        fieldHtml(
          proposalHtml(s, { v: 'a', html: wordingHtml(cur, s.race.a.text), why: s.race.a.rationale, by: s.race.a.by }) +
          proposalHtml(s, { v: 'b', html: wordingHtml(cur, s.race.b.text), why: s.race.b.rationale, by: s.race.b.by }), 2) +
        reviseNote(s) + crownNote(s) +
        // The one thing a race card cannot say any other way: neither of its
        // two candidates has an incumbent radio, so nothing on the card votes
        // to keep the clause, and a reader could reasonably think one of them
        // must win. Everything else that used to be here was the design
        // explaining itself.
        '<div class="foot">Neither of these has to win — the clause above stands unless the leader clears the approval threshold.</div>' +
        commitRowHtml(s) +
        '</div>'
      );
    }
    if (s.kind === 'patch') {
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
        '<div class="sugg patch-open" data-card="' + s.id + '" data-site="' + site.key + '">' +
        '<div class="pnav">' +
        '<span class="pwhere">' + esc(site.label) + ' · place ' + (i + 1) + ' of ' + n + '</span>' +
        '<span class="psteps">' +
        step(i > 0 ? i - 1 : null, 'The place before', '↑') +
        step(i < n - 1 ? i + 1 : null, 'The next place', '↓') +
        '</span></div>' +
        // Here the clause *is* one of the two things being judged, so its head
        // picks like any proposal. The fixture's `marked` is already the full
        // diff, so a stacked proposal can state its own change without
        // recomputing one.
        clauseHeadHtml(s, { text: currentTextFor(site.key), key: site.key, v: 'keep',
                            chips: chipsFor(site.key, s.id) }) +
        fieldHtml(proposalHtml(s, { v: 'approve', html: resultOnly(site.marked), why: s.rationale, by: s.by, key: site.key })) +
        reviseNote(s) +
        '<div class="foot">One vote for all ' + n +
        ' places — choosing here chooses everywhere.</div>' +
        commitRowHtml(s) +
        '</div>'
      );
    }
    // quick (including insert) — the race card's own geometry, with the
    // incumbent on the left, so choosing the left lane *is* keep-current.
    // A proposed section has no clause of its own to edit into, so neither
    // lane offers ✏️ — writing a rival section is a different gesture and
    // nobody has designed it (Q261).
    const key = (s.keys ?? [])[0];
    const cur = s.isInsert ? null : currentTextFor(key);
    const noEdit = s.isInsert ? false : undefined;
    // a proposed section is the one case with no clause to redline against, so
    // it states itself whole and its new heading is all-new
    const prop = s.isInsert
      ? '<div class="rtext"><ins>' + esc(s.newHeading) + '</ins></div><div class="rtext">' + resultOnly(s.marked) + '</div>'
      : resultOnly(s.marked);
    return (
      '<div class="sugg quick-open" data-card="' + s.id + '" data-site="' + (key || '') + '">' +
      clauseHeadHtml(s, { text: cur, key: key, v: 'keep', edit: noEdit,
                          label: s.isInsert ? 'The gap as it stands' : undefined,
                          chips: chipsFor(key, s.id) }) +
      groundNote(s) +
      fieldHtml(proposalHtml(s, { v: 'approve', html: prop, why: s.rationale, by: s.by, edit: noEdit })) +
      reviseNote(s) + crownNote(s) +
      commitRowHtml(s) +
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
    if (fired) { walletGhost = false; if (pencil) pencil.remove(); return; }
    if (!pencil) { walletGhost = false; renderWallet(); return; }
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
        walletGhost = false;
        // the pencil is home, so the preview may resume — but only if the
        // pointer never left the button that was asking for it
        resumeLean(el);
        renderWallet();
      } });
  };
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
      const penId = el.closest('.sugg').dataset.card;
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
    walletGhost = true;
    renderWallet();
    const src = walletEl.querySelector('.gone');
    let pencil = null, anim = null;
    if (src) {
      const a = src.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      pencil = document.createElement('div');
      pencil.className = 'flypencil';
      pencil.textContent = '✏️';
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
    const id = el.closest('.sugg').dataset.card;
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
  const b = ev.target.closest && ev.target.closest('[data-act="draft-propose"]');
  if (!b || ev.button !== 0) return;
  ev.preventDefault(); ev.stopPropagation();
  flyStart(b);
});
document.addEventListener('pointerup', () => { if (GESTURE === 'hold') flyStop(false); });
document.addEventListener('pointercancel', () => { if (GESTURE === 'hold') flyStop(false); });

  function renderDoc() {
    let html = PROSE();
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
      const openFiled = filedFor(key).find((x) => x.id === openId);
      const card = (s, k) => ({ html: '</div>' + suggCardHtml(s, k) + PROSE(), swallowed: true });
      if (openFiled && !cardDone) { cardDone = true; return card(openFiled, undefined); }
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
      if (cardDone) return { html: '', swallowed: false };
      // the key matters to a diagonal, which spans two clauses and needs to say
      // which of them it is standing in
      cardDone = true;
      return card(openSugg, key);
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

    // **A gap at the very start has no block before it** (backlog 204, Q261:
    // *at the very start on the gap before it*). `G0`'s `insertAfterKey` is
    // null, so the anchor the gap card hangs on cannot be emitted after a
    // neighbour — it is emitted here, above the first block, or the draft
    // would render nowhere at all and the keystroke that opened it would look
    // as though it had done nothing.
    const headIns = SUGGS.find((g) => g.gapKey && g.insertAfterKey == null);
    if (headIns) {
      html += '<div class="insert-anchor" data-anchor="' + headIns.id + '" title="' +
        esc(plainLabel(headIns.qLabel)) + ' — a section proposed for this gap"' +
        anchWash(headIns, openId === headIns.id) + '>' +
        '<span class="chipcol"><span class="achip"' + chipStyle(headIns) + ' data-anchor="' + headIns.id + '">' +
        markOf(headIns) + '</span></span></div>';
      if (openId === headIns.id && !cardDone) {
        cardDone = true; html += '</div>' + suggCardHtml(headIns) + PROSE();
      }
    }

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
        if (site.keys[0] === line.key) {
          html += '</div>' + editCardHtml(writing, site) + PROSE();
        }
        continue;
      }

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
        const hDecided = line.key && !hlive.length
          ? SUGGS.find((g) => (resolved.has(g.id) || g.state === 'sealed') && (g.keys ?? []).includes(line.key))
          : undefined;
        let marks = '';
        if (hlive.length) {
          const swallow = swallowOpen(line.key, hlive);
          if (swallow.swallowed) { html += swallow.html; continue; }
          marks = chipStackHtml(hlive, line.key);
        } else if (hDecided) {
          if (openId === hDecided.id && !cardDone) {
            html += '</div>' + suggCardHtml(hDecided) + PROSE();
            cardDone = true;
            continue;
          }
          marks = '<span class="chipcol" contenteditable="false"><span class="achip" tabindex="0"' +
            chipStyle(hDecided) + ' data-anchor="' + hDecided.id + '" title="' +
            esc(plainLabel(hDecided.qLabel)) + ' — decided">' + mkHtml(markKindOf(hDecided)) + '</span></span>';
        }
        const inside = collapsed.has(secN) ? suggestionsInSection(secN) : 0;
        html += '<h2 class="docline editable' + (marks ? ' marked' : '') +
          ' lvl' + (line.level ?? 1) + '" id="sec-' + secN + '"' +
          ' data-key="' + line.key + '">' + marks +
          '<span class="nocaret" contenteditable="false">' + toggleHtml(secN) + '</span>' + esc(line.x) +
          (inside ? '<span class="sechint" contenteditable="false">' + inside +
            (inside === 1 ? ' suggestion' : ' suggestions') + ' inside</span>' : '') +
          '</h2>';
        continue;
      }

      const live = line.key ? suggFor(line.key) : [];
      // a settled clause still opens its record from the document side (Ed, 112)
      const wasResolved = line.key && !live.length
        ? SUGGS.find((g) => (resolved.has(g.id) || g.state === 'sealed') && (g.keys ?? []).includes(line.key))
        : undefined;

      if (live.length) {
        const primary = live.find((x) => x.id === openId) ?? live[0];
        const swallow = swallowOpen(line.key, live);
        html += swallow.html;

        if (!swallow.swallowed) {
          html +=
            '<p class="anch editable' + (openId === primary.id ? ' active' : '') + '" data-key="' + line.key +
            '" data-anchor="' + primary.id + '"' +
            anchWash(primary, openId === primary.id, line.key) + '>' +
            chipStackHtml(live, line.key) + esc(line.x) + '</p>';
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
          // …and the gap block takes the same treatment with its own sentence
          // (Q1090: one rule, two sentences — the rule is the geometry)
          html += '<p class="editable' + (wasResolved ? ' anch resolved' : '') + (blank ? ' blank' : '') + (line.gap ? ' gap' : '') + '"' +
            (wasResolved ? ' data-anchor="' + wasResolved.id + '"' +
              anchWash(wasResolved, openId === wasResolved.id, line.key) : '') +
            (line.key ? ' data-key="' + line.key + '"' : '') +
            (blank ? ' data-placeholder="' + (line.gap ? 'Start a new clause here.' : MAY_PROPOSE()
              ? 'Nothing here yet — start typing to propose the first paragraph.'
              : 'Nothing here yet.') + '"' : '') + '>' +
            (wasResolved ? '<span class="chipcol" contenteditable="false"><span class="achip" tabindex="0"' + chipStyle(wasResolved) + ' data-anchor="' + wasResolved.id +
              '" title="' + esc(plainLabel(wasResolved.qLabel)) + ' — decided">' + mkHtml(markKindOf(wasResolved)) + '</span></span>' : '') +
            esc(line.x) + '</p>';
        }
      }

      const ins = line.key
        ? SUGGS.find((g) => g.insertAfterKey === line.key)
        : undefined;
      if (ins) {
        // the gap stays inside the prose column so its gutter mark lines up
        // with every other mark in the margin
        html += '<div class="insert-anchor" data-anchor="' + ins.id + '" title="' +
          esc(plainLabel(ins.qLabel)) + ' — a section proposed for this gap"' +
          anchWash(ins, openId === ins.id) + '>' +
          '<span class="chipcol"><span class="achip"' + chipStyle(ins) + ' data-anchor="' + ins.id + '">' +
          markOf(ins) + '</span></span></div>';
        if (openId === ins.id && !cardDone) { cardDone = true; html += '</div>' + suggCardHtml(ins) + PROSE(); }
      }
    }
    html += '</div>';
    // **the proposal-row, in edit mode** (backlog 204): the foot of the text's
    // card, and the post-🍾 commit follows entry 160's glyph rule — ✒️ where
    // the Founder holds the pen on the Text, ✏️ otherwise. Pressing it opens
    // the editing card, where the rationale, the sign choice and the hold live
    // unchanged. Only where this reader may propose: read mode has no row.
    // Where the pen is held the row offers ✏️ beside it (entry 161): this
    // reader may propose, being inside `MAY_PROPOSE()`, and holds the pen too.
    if (EDITING() && MAY_PROPOSE() && !closedMode) {
      const rs = draftRowState();
      const pen = MAY_PEN();
      const idle = 'Nothing has changed yet — type in the document to start a draft';
      html += proposalRowHtml({
        count: rs.changedCount, changed: rs.changed, pen, pair: pen, disabled: !rs.changed,
        discardDisabled: !rs.count,
        title: !rs.changed ? idle : pen ? 'Review and amend the document' : 'Review and propose this',
        proposeTitle: !rs.changed ? idle : 'Review and propose this',
      });
    }
    doc.innerHTML = html;
    fitStacks();
    fitCards();

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
    doc.querySelectorAll('[data-proposalrow] [data-act="row-commit"]').forEach((b) =>
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const d = draftOf();
        if (!d || openId === d.id) return;
        toggle(d.id, true);
      })
    );
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
    // ✏️ on a lane: start writing from that wording (Ed, 228).
    doc.querySelectorAll('[data-propose-from]').forEach((b) =>
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const [id, lane, key] = b.dataset.proposeFrom.split('|');
        const s = SUGGS.find((x) => x.id === id);
        if (!s) return;
        startDraft(key || (s.keys ?? [])[0], laneSeed(s, lane, key));
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
        startDraft(key, null, { text: currentTextFor(key), caret: 0 });
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
        el.classList.toggle('md', laneRaw());
        el.innerHTML = laneBlocks(site.text, originText(site), headFlags(site), laneRaw());
        if (off != null) placeCaret(el, off);
        layoutQueue(); drawWires();
      };
      el.addEventListener('input', (ev) => { if (!ev.isComposing) remark(); });
      el.addEventListener('compositionend', remark);
      // The lane's own controls. Bold and italic go through execCommand in rich
      // mode, which is the cheapest thing that produces real elements for
      // `htmlToMd` to write back; in markdown mode they wrap the selection in
      // the characters themselves, because that is what the mode is *for*.
      const box = el.closest('.lanebox');
      if (box) {
        box.querySelectorAll('.lfmt').forEach((b) => b.addEventListener('mousedown', (ev) => {
          ev.preventDefault();                    // keep the selection in the lane
          el.focus({ preventScroll: true });
          if (laneRaw()) {
            const marks = b.dataset.fmt === 'bold' ? '**' : '*';
            document.execCommand('insertText', false, marks + getSelection().toString() + marks);
          } else {
            document.execCommand(b.dataset.fmt);
          }
          remark();
        }));
        // Switching view keeps your place — but the offset has to be converted,
        // because markdown mode counts the syntax characters and rich mode does
        // not (see richToSource / sourceToRich).
        box.querySelectorAll('.lmode').forEach((b) => b.addEventListener('mousedown', (ev) => {
          ev.preventDefault();
          if (laneMode === b.dataset.mode) return;
          const site0 = (() => { const d0 = draftOf(); return d0 && siteFor(d0, el.dataset.lane); })();
          let off = laneCaret(el);
          if (off != null && site0) {
            off = b.dataset.mode === 'md'
              ? richToSource(site0.text, off)
              : sourceToRich(site0.text, off);
          }
          laneMode = b.dataset.mode;
          // one button now, so it carries the state and the *next* mode both:
          // pressed while markdown is on, and its data-mode is where it would
          // take you
          b.dataset.mode = laneRaw() ? 'rich' : 'md';
          b.setAttribute('aria-pressed', String(laneRaw()));
          const d = draftOf();
          const site = d && siteFor(d, el.dataset.lane);
          if (!site) return;
          el.classList.toggle('md', laneRaw());
          el.innerHTML = laneBlocks(site.text, originText(site), headFlags(site), laneRaw());
          el.focus({ preventScroll: true });
          if (off != null) placeCaret(el, off);
          layoutQueue(); drawWires();
        }));
      }
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
      if (!s || s.locked) return;
      const now = pickOf(s) === el.dataset.v ? null : el.dataset.v;
      picked.set(s.id, now);
      // One judgment, however many cards it is showing on (181): every card
      // for this suggestion moves its selection together.
      openCardEls(s.id).forEach((c) => {
        c.querySelectorAll('[data-v]').forEach((o) =>
          o.setAttribute('aria-pressed', String(now !== null && o.dataset.v === now)));
        const submit = c.querySelector('[data-act="submit"]');
        if (submit) {
          // greyed rather than absent (Ed, 2026-08-16): the corner keeps its
          // shape from the moment the card opens
          submit.disabled = now === null;
          const cast = isJudged(s) && now !== null && now === committedOf(s);
          submit.setAttribute('aria-pressed', String(cast));
          submit.title = cast ? 'Recorded — choose again to change it'
            : now ? 'Submit this vote' : 'Choose one of the three first';
        }
      });
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
        const id = b.closest('.sugg').dataset.card;
        const what = b.dataset.act === 'submit'
          ? pickOf(SUGGS.find((x) => x.id === id) || {}) : b.dataset.act;
        if (!what) return;                       // nothing chosen yet
        act(id, what);
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
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      scrollTo(0, from + delta * ease(t));
      if (t < 1) requestAnimationFrame(step); else done();
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
  function bringIntoView(id, done) {
    const targets = wireTargets(id);
    if (!targets.length) { drawWires(); return done(); }
    const y = topTarget(targets).getBoundingClientRect().top;
    const arrive = () => { layoutQueue(); drawWires(); done(); };
    // already sitting comfortably: don't nudge the page for nothing
    if (y >= 100 && y <= 300) return arrive();
    smoothScrollBy(y - READ_LINE, arrive);
  }

  // Opening and closing a card changes the height of the document under the
  // scroll, so doing both in one frame makes the page lurch. Collapse the old
  // card, *then* move, *then* expand the new one — three steps, never overlapping.
  const REDUCED = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    if (next && extra && extra.closeOthers) extra.closeOthers();
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
      const open = () => {
        if (!alive()) return;
        const hold = holdSel(next);
        keepStill(() => { openId = next; renderAll(); }, hold);
        // the card made the document taller, so every entry below it has moved
        layoutQueue();
        if (after) after();
        expandCards(next, () => {
          if (!alive()) return;
          layoutQueue();
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

  function act(id, what) {
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
    if (what === 'draft-cancel') {
      const d = draftOf();
      const key = d && d.sites[0] ? d.sites[0].keys[0] : null;
      const shut = () => {
        if (openId === DRAFT_ID) openId = null;
        dropDraft();
        // the lanes become the paragraph again, and it does not move while they do
        keepStill(() => renderAll(), key ? '[data-key="' + key + '"]' : null);
        drawWires();
      };
      if (openId === DRAFT_ID) collapseCards(DRAFT_ID, shut); else shut();
      return;
    }

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
      if (!d || editsHeld < EDIT_RULES.stake) return;
      editsHeld -= EDIT_RULES.stake;
      const key = d.sites[0].keys[0];
      const wasOpen = openId === d.id;
      d.id = 'mine-' + key + '-' + (++mineSeq);
      d.unproposed = false;
      d.qLabel = d.sites[0].label;
      d.pct = 6;
      d.cap = 'yours · just in, evidence starting' + (d.signed ? ' · signed' : '');
      if (hooks.propose) { const r = hooks.propose(d); if (typeof r === 'string') d.id = r; }
      if (wasOpen) openId = d.id;
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
    const quote = (t) => '“' + String(t || '').split(/\s+/).slice(0, 6).join(' ') + '…”';
    const verdict =
      what === 'approve' ? 'approved (recorded as: proposal beats current text)'
      : what === 'keep' ? 'kept the current text'
      : what === 'first' ? 'said ' + (s.pair ? '“' + s.pair[0].name + '”' : 'the first') + ' matters more'
      : what === 'second' ? 'said ' + (s.pair ? '“' + s.pair[1].name + '”' : 'the second') + ' matters more'
      : what === 'a' ? 'preferred ' + quote(s.race && s.race.a.text)
      : what === 'b' ? 'preferred ' + quote(s.race && s.race.b.text)
      : what === 'indifferent' ? (s.kind === 'diagonal' ? 'said they matter equally' : 'indifferent')
      : 'skipped (recirculates with decay)';
    // **🗑️ on a judgment clears the choice and closes** (CP7, Q1102): the bin
    // puts back un-actioned input only (C4), so an uncommitted pick clears and
    // a cast vote stays on the record exactly as it stood.
    if (what === 'clear-close') {
      const s0 = SUGGS.find((x) => x.id === id);
      if (s0 && !resolved.has(id)) s0.pick = null;
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
    const firstTime = !resolved.has(id);
    const btn = queueEl.querySelector('[data-q="' + id + '"]');
    if (firstTime && btn) btn.classList.add('leaving');
    setTimeout(() => {
      verdicts.set(id, verdict);
      picked.set(id, what);
      committed.set(id, what);       // this is now the thing on the record
      resolved.add(id);
      justArrived = firstTime ? id : null;
      if (hooks.judge) hooks.judge(id, what);
      const shut = () => { if (openId === id) openId = null; renderAll(); drawWires(); };
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
    if (st === 'yours') return 'yours';
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

  // **The state, not the glyph.** Two states can now share a character — a
  // filed tick and an adopted one are the same ✔ in two colours — so everything
  // that used to compare marks compares *kinds* instead. It also collapses the
  // duplicated ternary that markOf and its colour lookup had each grown.
  const markKindOf = (g) => {
    const st = stateOf(g);
    // the third filed mark (Q469): a race unresolved at the close is
    // *undecided*, distinct from kept — PAUSE, grey from the start
    return st === 'sealed' ? (g.undecided ? 'filedUndecided'
                              : isUnread(g) ? (carried(g) ? 'adopted' : 'retired')
                                          : (carried(g) ? 'filedYes' : 'filedNo'))
      // ✏️ all the way to the seal (Ed, 260). It had been ✏️ while unproposed
      // and then the ordinary 💡, on the reading that a proposal of yours is a
      // proposal like any other and green says whose. That works wherever the
      // green goes with it — but the contents rail draws marks with **no
      // colour**, so up there your work and somebody else's were the same bulb,
      // and a section holding only your own proposals looked like a section
      // wanting your judgment. The pencil means *you wrote this*, which is the
      // rule 241's own note was already reaching for: subject and act agree,
      // because in both cases it is you, writing.
      : st === 'yours' ? 'propose'
      // before ⏳, and for the same reason `anchHue` tests it first: ⚔️ is what
      // a race becomes *instead of* going quiet on you
      : stuck(g) ? 'stuck'
      : st === 'deciding' ? (g.shifted ? 'shifted' : 'deciding')
      : g.kind === 'diagonal' ? 'weigh'
      : g.id === topUrgentId ? 'urgent'
      : 'needs';
  };
  const markOf = (g) => MARK[markKindOf(g)];

  // When more marks than fit, the space goes to whatever still wants something
  // from you (Ed, 178). Filed decisions go first, then the states with nothing
  // to do at all, and an open question is the last thing to be dropped.
  // 🌶️ is in the list (Q607, 2026-08-22): a diagonal asks for a judgment, so it
  // is kept ahead of the states that only tell you where things stand, and
  // behind ✏️ for the reason the next comment gives. The third filed mark,
  // undecided, files with the other two — they are one family, dropped first.
  const KEEP_ORDER = ['urgent', 'stuck', 'propose', 'weigh', 'needs', 'adopted', 'retired', 'deciding', 'shifted', 'filedYes', 'filedNo', 'filedUndecided'];
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
  const STACK_ORDER = ['urgent', 'stuck', 'needs', 'weigh', 'adopted', 'retired',
    'propose', 'deciding', 'shifted', 'filedYes', 'filedNo', 'filedUndecided'];
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
    return '<span class="tocmarks" aria-hidden="true">' + shown.map(mkHtml).join('') +
      (marks.length > shown.length ? '<span class="more">+' + (marks.length - shown.length) + '</span>' : '') +
      '</span>';
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
        scrollToHeading(document.getElementById('sec-' + n), () => markCurrentSection());
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
        scrollToHeading(id && document.getElementById(id), () => markCurrentSection());
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
  // The wallet: one glyph per edit you hold, and a tray under the next one
  // whose fill is how far the drip has got toward it. Spending removes a
  // pencil; the tray keeps whatever it had accrued, which is what makes the
  // two magnitudes legible as separate things.

  // **The arc.** A pencil crossing the room does not travel in a straight line,
  // and it does not travel the same line twice (Ed, 2026-08-17), so the flight
  // is a quadratic bowed off the straight run by a signed amount drawn fresh
  // each time — which side it swings and how far are the whole of the variation
  // and everything else about the journey is fixed. It has to be sampled into
  // keyframes because a shape that changes every flight cannot be a CSS rule.
  // The rotation runs alongside the curve rather than following it: an emoji has
  // its own axis, so a pencil steered by the path points its tip somewhere
  // different in every font.
  function arcFrames(a, b, r0, r1) {
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    const dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
    const len = Math.hypot(dx, dy) || 1;
    const side = Math.random() < 0.5 ? -1 : 1;
    const bow = len * (0.09 + Math.random() * 0.15) * side;
    const cx = dx / 2 - (dy / len) * bow, cy = dy / 2 + (dx / len) * bow;
    // **Sometimes it tumbles** (Ed, 2026-08-17): one turn in five flights, two in
    // twenty, three in a hundred. A rarity you cannot make happen is worth more
    // than one you can — the point is the flight you were not expecting, and a
    // pencil that spun every time would just be a pencil that spins. It turns
    // the way it was thrown, because the curve and the tumble come off the same
    // flick of the wrist, and the whole-turn count means it always lands in the
    // pose it would have landed in anyway.
    const r = Math.random();
    const spin = (r < 0.01 ? 3 : r < 0.06 ? 2 : r < 0.26 ? 1 : 0) * 360 * side;
    return Array.from({ length: 21 }, (_, i) => {
      const t = i / 20, u = 1 - t;
      return { transform: 'translate(-50%, -50%) translate(' +
        (2 * u * t * cx + t * t * dx).toFixed(1) + 'px, ' +
        (2 * u * t * cy + t * t * dy).toFixed(1) + 'px) rotate(' +
        (r0 + (r1 - r0 + spin) * t).toFixed(1) + 'deg)' };
    });
  }

  // **The refund, flying home.** Withdrawing hands the edit back in full (SPEC
  // §3.3a), and what comes back is the same object that paid — so it makes the
  // return journey, and the wallet holds at its old count until the pencil is
  // actually in it (Ed, 2026-08-17). It leaves in the pose it arrived in and
  // lands flat, which is the outbound tilt run backwards.
  //
  // Where it lands is measured by rendering the after-state, reading whichever
  // slot changed, and rendering the before-state back — two synchronous renders
  // with no paint between them, so the wallet never flickers forward. Which
  // slot changed is not always a new pencil: past four the wallet counts, and
  // there the landing is the counter itself ticking up.
  const REFUND_MS = 640;
  function refundFlight(from, before) {
    renderWallet();
    const grew = (editsHeld <= 4 ? editsHeld : 3) > (before <= 4 ? before : 3);
    const slot = grew ? [...walletEl.querySelectorAll('.pencils i')].pop()
                      : walletEl.querySelector('.pmore');
    const to = (slot || walletEl).getBoundingClientRect();
    walletShow = before;
    renderWallet();
    const land = () => { walletShow = null; renderWallet(); };
    const pencil = document.createElement('div');
    pencil.className = 'flypencil';
    pencil.textContent = '✏️';
    pencil.style.left = (from.left + from.width / 2) + 'px';
    pencil.style.top = (from.top + from.height / 2) + 'px';
    document.body.appendChild(pencil);
    const anim = REDUCED()
      ? pencil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: REFUND_MS, fill: 'both' })
      : pencil.animate(arcFrames(from, to, -24, 0),
          { duration: REFUND_MS, easing: 'cubic-bezier(.3, 0, .2, 1)', fill: 'both' });
    const done = () => { pencil.remove(); land(); };
    anim.onfinish = done;
    setTimeout(() => { if (pencil.isConnected) done(); }, REFUND_MS + 60);
  }
  // **One gesture, four currencies** (Q444, 2026-08-21): every power is an
  // object you hold, spent by flying it — so a feather, a pen and the
  // consensus voice travel the same bowed arc the pencil does. `flyGlyph`
  // is that arc for any glyph, between any two rects; `pencilStorm` is the
  // grant's flurry (Q442 b.ii): a decorative scatter of pencils from the
  // card you pressed OK on, resolving into the real count in the wallet.
  // Reduced motion: fade at the destination, no travel, same duration.
  function flyGlyph(glyph, from, to, ms, opts) {
    const o = opts || {};
    const el = document.createElement('div');
    el.className = 'flypencil' + (o.cls ? ' ' + o.cls : '');
    el.textContent = glyph;
    const start = REDUCED() ? to : from;
    el.style.left = (start.left + start.width / 2) + 'px';
    el.style.top = (start.top + start.height / 2) + 'px';
    document.body.appendChild(el);
    const anim = REDUCED()
      ? el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, fill: 'both' })
      : el.animate(arcFrames(from, to, o.r0 ?? -24, o.r1 ?? 0),
          { duration: ms, easing: o.easing || 'cubic-bezier(.3, 0, .2, 1)', fill: 'both', delay: o.delay || 0 });
    let finished = false;
    const done = () => { if (finished) return; finished = true; el.remove(); if (o.onLand) o.onLand(); };
    anim.onfinish = done;
    const fb = setTimeout(() => { if (el.isConnected) done(); }, ms + (o.delay || 0) + 80);
    // **A flight can be handed back** (Q531): a caller that means to bring the
    // glyph home rather than let it land has to take ownership first, because
    // both the `onfinish` above and the belt-and-braces timeout beside it will
    // otherwise remove the traveller at the landing moment — and a release at
    // 990ms of a 1000ms flight rewinds for another 250ms, well past it. So the
    // glyph would vanish in mid-air on exactly the presses this exists for.
    // `disarm` transfers that responsibility; `cancel` is unchanged and still
    // the right thing where the flight simply stops meaning anything.
    const disarm = () => { clearTimeout(fb); anim.onfinish = null; finished = true; };
    return { anim, el, disarm, cancel: () => { try { anim.cancel(); } catch (e) {} el.remove(); } };
  }
  // **A press always carries the token a quarter of the way** (Q531, Ed
  // 2026-08-22: *when someone just clicks and doesn't hold, the token jumps 1/4
  // the way towards the button, so that it's hard to miss that you're making
  // something happen*). Nobody realised these buttons had to be held, and the
  // reason is that a tap showed almost nothing: 80ms of a 1000ms flight is 8%
  // of the arc, and on the pen path the glyph was not even flown home — it was
  // deleted where it stood. So a release short of the floor is rounded **up**
  // to it.
  //
  // Three things this is careful about.
  //
  // **The floor is distance, not time.** "A quarter of the way" is ambiguous by
  // 60%: the pen flies `linear`, so a quarter of its duration is a quarter of
  // its arc, but the pencil flies `cubic-bezier(.45, .05, .3, 1)`, whose slow
  // start means a quarter of *its* duration is only 18% of the arc. Distance is
  // what the eye reads — there is no track on the surface, so nobody can
  // perceive a fraction of a duration at all — so each caller passes the
  // *time at which its own easing reaches a quarter of the way*: 250ms of 1000
  // for the pen, 288ms of 1000 for the pencil (the solve for that bezier —
  // 0.288 of the duration, whatever the duration is, which is why the floor
  // moved with the hold when every hold became one second, backlog 206).
  //
  // **It is a floor, not a jump.** `t >= floorAt` rewinds from where it got to,
  // so letting go at nine-tenths never snaps backwards to a quarter — which
  // would be a worse lie than the one below.
  //
  // **The push runs at a speed the hold cannot produce.** A fixed ~160ms flick
  // means the token is *thrown* rather than slid: from a standing start on the
  // pencil, whose floor is 288 of 1000, that is `minRate` exactly — 1.8x the
  // hold's own pace, the slowest a throw is allowed to be. (It was 5.4x while
  // the pencil ran for three seconds; the floor came down with the hold and
  // the rate floor is what holds the gesture up now.) This is the whole reason
  // the exaggeration is honest. Position on an arc is only a progress reading if
  // there is a scale to read it against, and there deliberately is none — so
  // what a viewer can perceive is departure, distance and return, not "this is
  // 25%". A floor on time in the air instead would be unimpeachable and
  // useless: 100ms of the pencil's easing is 3% of the arc, under 20px, which
  // is nothing at all at the corner of your eye.
  //
  // It takes an animation rather than a distance, which is what makes reduced
  // motion free: there the flight is an opacity fade, so a quarter of the way
  // is a quarter of a fade, and nothing here needs to know the difference.
  const nudgeHome = (flight, opts) => {
    const o = opts || {};
    const anim = flight && flight.anim, el = flight && flight.el;
    if (!anim || !el) { if (o.onDone) o.onDone(); return { cancel: () => {} }; }
    if (flight.disarm) flight.disarm();
    // `push` is the *longest* the throw may take and `minRate` the slowest it
    // may go, and the second is what makes it read as a throw. Measured on the
    // pen: a quarter of its arc is 250ms of a 1000ms flight, so covering the
    // last 150ms of that over a fixed 160ms push came out at **0.94x** — the
    // token drifting forward *slower* than the hold moves it, which is the
    // exact opposite of the point. A floor on the rate means the flick is
    // always a speed the hold itself cannot produce, on a pen press and a
    // pencil one alike, and the duration falls out of it.
    const rewind = o.rewind || 4, push = o.push || 160, hang = o.hang || 90, minRate = o.minRate || 1.8;
    const dur = Number((anim.effect && anim.effect.getTiming().duration) || 0) || 0;
    const floorAt = dur ? Math.min(o.floorAt || 0, dur) : (o.floorAt || 0);
    const t = Math.max(0, Number(anim.currentTime) || 0);
    let done = false, timers = [];
    const finish = () => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      try { anim.cancel(); } catch (e) { /* already gone */ }
      el.remove();
      if (o.onDone) o.onDone();
    };
    // the reversal is the existing idiom — the flight run backwards along its
    // own arc rather than a second, straighter journey — and `onfinish` is
    // attached only once the rate is negative, or a forward push that happens
    // to reach the end would fire it early
    const reverse = (from) => { anim.playbackRate = -rewind; anim.play(); anim.onfinish = finish; return from / rewind; };
    let total;
    if (t >= floorAt) { total = reverse(t); }
    else {
      const rate = Math.max(minRate, (floorAt - t) / push);
      const pushMs = (floorAt - t) / rate;
      anim.playbackRate = rate;
      anim.play();
      // land exactly on the floor rather than wherever the rate has carried it,
      // then hold still, so the turn reads as a decision and not a bounce
      timers.push(setTimeout(() => { try { anim.currentTime = floorAt; anim.pause(); } catch (e) { /* gone */ } }, pushMs));
      timers.push(setTimeout(() => reverse(floorAt), pushMs + hang));
      total = pushMs + hang + floorAt / rewind;
    }
    // belt and braces on both paths, derived from the journey rather than a
    // literal: a document timeline is paused while the tab is hidden, so
    // `onfinish` can be arbitrarily late, and what must not happen is a wallet
    // left holding a gap for a token that is no longer in the air
    timers.push(setTimeout(finish, total + 80));
    return { cancel: finish };
  };
  const STORM_MS = 900;
  function pencilStorm(from, to, count, onLand) {
    const n = Math.max(1, Math.min(12, count));
    let landed = 0;
    for (let i = 0; i < n; i++) {
      // each pencil takes its own arc and its own moment, so the flurry reads
      // as a scatter rather than a queue
      flyGlyph('✏️', from, to, STORM_MS - 200 + Math.round(Math.random() * 300),
        { delay: Math.round(i * 70 + Math.random() * 40), r0: -40 + Math.random() * 80, r1: 0,
          onLand: () => { landed++; if (landed === n && onLand) onLand(); } });
    }
  }
  // **An edit in flight is drawn once.** Both flights hold the wallet at the
  // count that has not happened yet — outbound, the edit is not spent until it
  // lands (let go and it comes home), so the wallet keeps its five and leaves
  // the traveller's slot empty; inbound, it is not yours again until it lands,
  // so the wallet keeps its old count until the pencil arrives. Two pieces of
  // *render* state rather than a poke at the DOM, because the drip re-renders
  // the wallet every second and was putting the flying pencil back (Ed,
  // 2026-08-17).
  //   `walletShow` — draw this count instead of what is held (the refund's hold)
  //   `walletGhost` — draw the count, but leave the last slot empty (the spend's)
  //   `walletHeld` — whether this reader holds the power at all (Q532). Not the
  //     same question as how many they have: a member with an empty wallet still
  //     holds it and the drip is running, which is `.empty` and a countdown. This
  //     one is *your role does not include proposing* — a stranger, an applicant,
  //     a clerk, a member before the document begins or before they have accepted
  //     the grant — and it draws the tool struck through in its socket instead of
  //     hiding the socket, which is what the toolbar is for.
  //   `walletTitle` — the host's own sentence for this socket, if it has one.
  //     Since Q532 the page keeps one copy per tool feeding both the tooltip and
  //     the bubble a press opens, and this wallet is the one the page does not
  //     render itself — without a seam the drip would overwrite the page's
  //     sentence every second with this file's, and the two channels would
  //     disagree about the same tool.
  let walletShow = null, walletGhost = false, walletHeld = true, walletTitle = null;
  const setWalletHeld = (v) => { if (walletHeld !== !!v) { walletHeld = !!v; renderWallet(); } };
  // The ghost, for a hold this file does not run (Q614, 2026-08-22): the page's
  // `holdWallet` flies a ✏️ out of `#wallet` for a motion's Propose, and the
  // drip would put the traveller straight back unless the wallet is told its
  // last slot is in the air. Same rule as `flyStart` above — render state, set
  // for the hold and cleared when the token lands or flies home.
  const setWalletGhost = (v) => { if (walletGhost !== !!v) { walletGhost = !!v; renderWallet(); } };
  const setWalletTitle = (s) => { if (walletTitle !== s) { walletTitle = s; if (walletEl) walletEl.title = s || ''; } };
  function renderWallet(showAs) {
    if (closedMode) { walletEl.className = 'wallet'; walletEl.innerHTML = ''; walletEl.title = ''; return; }
    if (!walletHeld) {
      walletEl.className = 'wallet notheld';
      const nh = '<span class="pencils"><i>✏️</i></span>';
      if (walletEl.innerHTML !== nh) walletEl.innerHTML = nh;
      walletEl.title = walletTitle || '';
      applyLean();
      return;
    }
    const held = showAs != null ? showAs : (walletShow != null ? walletShow : editsHeld);
    const full = held >= EDIT_RULES.cap;
    walletEl.className = 'wallet' + (full ? ' full' : '') + (held === 0 ? ' empty' : '');
    walletEl.title = walletTitle || (held === 0
      ? 'No ✏️ left. Another arrives as the drip accrues; proposing costs one.'
      : 'Your ✏️s — proposing one costs ' + EDIT_RULES.stake +
        '. You hold ' + held + ' of a possible ' + EDIT_RULES.cap +
        (full ? ', which is the cap.' : '; the tray shows how far the drip has got toward the next.'));
    // The wallet draws at most four slots wide, and counts when it cannot fit
    // (Ed, 2026-08-17). Four held is four pencils, because "+1" costs exactly
    // the space it saves and reads as an abbreviation of nothing. Five is three
    // pencils and a +2 — the count takes a glyph's width, so the row stays the
    // same length whatever you hold, and a spend is always visible as a change
    // in the number even when it is not visible as a missing pencil.
    const drawn = held <= 4 ? held : 3;
    const rest = held - drawn;
    // The empty slot a flight leaves behind: hidden, not removed, so the row
    // does not close up around the gap and reopen when the pencil comes back.
    const gh = (i) => (walletGhost && i === drawn - 1 ? ' class="gone"' : '');
    // No label (Ed, 2026-08-17). A row of pencils next to a clock is not
    // ambiguous enough to need naming, and the words were the widest thing in
    // it; the title still says what it is for anybody who hovers.
    walletEl.innerHTML =
      '<span class="pencils">' +
      Array.from({ length: drawn }, (_, i) => '<i' + gh(i) + '>✏️</i>').join('') +
      (rest > 0 ? '<span class="pmore' + (walletGhost && !drawn ? ' gone' : '') +
        '">+' + rest + '</span>' : '') +
      // The countdown carries the drip's own wash: the fill *is* how far the
      // tenth has run, so the thing that says **when** and the thing that shows
      // **how far** are one object rather than two saying it twice. That
      // retires the ghost pencil, whose only job was the fraction.
      (full ? '' : '<span class="pwhen" style="--fill: ' +
        (Math.max(0, Math.min(1, editsToNext)) * 100).toFixed(1) + '%">' + dripIn() + '</span>') +
      '</span>';
    applyLean();
  }

  // ---- spend-preview (Q531, Ed 2026-08-22) ---------------------------------
  // **Hover a button that spends, and the token that will pay leans toward it.**
  // Nobody was realising these buttons had to be held, and the surface's whole
  // explanation of the gesture lived *inside* it — a glyph crossing the air
  // between the wallet and the button, while the eye is on the button. So the
  // wallet says, before anything is pressed, *this one, and it is going over
  // there*: the token strains a few pixels along the run it would fly, and back,
  // over and over, like a thing on a leash.
  //
  // A lean rather than a glow or a ring because the wallet is 400–700px from the
  // pointer: peripheral vision is poor at colour and detail and good at motion,
  // and of the motions available only this one also says **where**.
  //
  // **Phase-locked, because the wallet is rebuilt under it.** Every wallet on
  // this surface rebuilds its own innerHTML wholesale — the ✏️ row every second
  // on the drip, the power wallets on every render — so the token wearing the
  // lean is a different element moments later and a CSS animation would restart
  // from frame one, visibly, every second. So the preview is *render state* like
  // `walletGhost` beside it: a flag naming the button, re-applied at the tail of
  // each render, and the new animation is given the old one's `startTime` on the
  // shared document timeline. Same phase, no seam, one number of state.
  //
  // **And it re-validates rather than trusting `pointerout`.** A button can be
  // removed from under the cursor — the card commits and closes, or a poll
  // replaces the row mid-hover — and a `pointerout` that never arrives would
  // leave a preview running for ever. Checking `:hover` on every render means a
  // missed exit self-corrects within one tick, structurally, which matters
  // because the ✏️ path re-binds its handlers on every render.
  const LEAN_MS = 900, LEAN_PX = 6;
  let leanBtn = null, leanPick = null, leanT0 = 0, leanAnim = null;
  // where the lean points: the straight run from the token to the button, not
  // the arc's own opening tangent — the flight's bow is drawn fresh each time
  // and swings either way (`arcFrames`), so there is no one arc it will fly,
  // and the chord is the honest average of all of them.
  function leanFrames(token, btn) {
    if (REDUCED()) return [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }];
    const a = token.getBoundingClientRect(), b = btn.getBoundingClientRect();
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const len = Math.hypot(dx, dy) || 1;
    const x = (dx / len * LEAN_PX).toFixed(1), y = (dy / len * LEAN_PX).toFixed(1);
    return [{ transform: 'translate(0, 0)' },
            { transform: 'translate(' + x + 'px, ' + y + 'px)' },
            { transform: 'translate(0, 0)' }];
  }
  // the token that would pay: the last one drawn, which is what every other
  // part of this already means by it — the slot the ghost empties and the rect
  // the flight measures from
  const payingToken = () => { try { return (leanPick && leanPick()) || null; } catch (e) { return null; } };
  function dropLean() {
    if (leanAnim) { try { leanAnim.cancel(); } catch (e) { /* gone */ } leanAnim = null; }
  }
  function applyLean() {
    if (!leanBtn) { dropLean(); return; }
    // the self-heal, and the one that matters: a card commits and closes, or a
    // poll replaces the row, and the button is gone from under the cursor with
    // no exit event to be had. Checked on every render, which for the ✏️ row is
    // every second, so a lost button cannot leave a preview running for ever.
    //
    // **Deliberately not `matches(':hover')`.** That was the first version and
    // it was wrong twice over: it is false in headless Chromium even with the
    // pointer parked on the button, so every harness would have been blind to
    // this feature — and more importantly, hover is a *paint* state to ask CSS
    // about, not a fact to hang correctness on. The pointer is over exactly one
    // element chain at a time, so a `pointerover` on anything that does not
    // spend is itself the proof it has left, and that is what ends a preview.
    if (!leanBtn.isConnected) { stopLean(); return; }
    const token = payingToken();
    if (!token) { dropLean(); return; }
    if (leanAnim && leanAnim.effect && leanAnim.effect.target === token) return;
    dropLean();
    leanAnim = token.animate(leanFrames(token, leanBtn),
      { duration: LEAN_MS, iterations: Infinity, easing: 'ease-in-out' });
    try { leanAnim.startTime = leanT0; } catch (e) { /* a timeline that will not take it */ }
  }
  function startLean(btn, pick) {
    if (leanBtn === btn) return;
    stopLean();
    leanBtn = btn; leanPick = pick;
    // the phase origin, kept across every rebuild for as long as this preview
    // lasts, so the lean carries on rather than starting again
    leanT0 = document.timeline.currentTime || 0;
    applyLean();
  }
  function stopLean() { leanBtn = null; leanPick = null; dropLean(); }
  // **One listener, and each surface says what spends.** Both halves of this
  // page have hold-commits with different rules — the charter's ✏️ Propose here,
  // the constitution's 🪶 and ✒️ commits in the page's own script — and a
  // listener each would fight: whichever ran second would see a control it did
  // not recognise and stop the preview the first had just started. So they
  // register a *probe* (a target → `{btn, pick}` or null) and one listener asks
  // each in turn. It is also delegated rather than bound per button because
  // `renderDoc` re-binds its handlers on every render, and a per-button
  // listener would be re-attached on each pass and carry state across a swap it
  // cannot see.
  const spendProbes = [];
  const addSpendProbe = (fn) => spendProbes.push(fn);
  // the button the pointer is actually on, kept whether or not a preview is
  // running — a press stops the preview without the pointer having moved, and
  // this is how the token knows to start straining again when it gets home
  let hoverSpend = null;
  document.addEventListener('pointerover', (ev) => {
    let hit = null;
    for (const fn of spendProbes) {
      try { hit = fn(ev.target); } catch (e) { hit = null; }
      if (hit) break;
    }
    hoverSpend = hit;
    if (hit) startLean(hit.btn, hit.pick); else stopLean();
  });
  // leaving the window fires no `pointerover` anywhere, so this is the one exit
  // the rule above cannot see
  document.addEventListener('pointerout', (ev) => { if (!ev.relatedTarget) { hoverSpend = null; stopLean(); } });
  const resumeLean = (btn) => { if (hoverSpend && hoverSpend.btn === btn) startLean(btn, hoverSpend.pick); };
  addSpendProbe((t) => {
    const b = t && t.closest && t.closest('[data-act="draft-propose"]');
    // ✒️ spends nothing, so no pencil leans toward it (R-058)
    if (!b || b.disabled || b.dataset.pen === '1' || !walletEl) return null;
    return { btn: b, pick: () => [...walletEl.querySelectorAll('.pencils i')].pop() };
  });

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
  function renderAll() {
    // `layoutQueue` belongs here rather than at each call site (Ed, 2026-08-17:
    // *when I resolve the 🔥 card, a new one should appear in my sidebar
    // immediately, rather than me having to deselect it first*). The rail was
    // being rebuilt without being laid out, so the entry promoted to 🔥 by the
    // judgment sat at its clause's own position — six thousand pixels down —
    // until the next scroll or card-close happened to run the layout. A rebuilt
    // rail always needs positioning; making that a rule rather than a habit at
    // eight call sites removes the whole class of bug. It is idempotent, so the
    // sites that still call it explicitly are harmless.
    settleTopUrgent(); renderDoc(); renderQueue(); renderToc();
    markCurrentSection(); renderWallet(); settleWashes(); settleLift(); layoutQueue(); drawWires();
    // the host's riding tab carries the draft's count (backlog 204) — a DOM
    // poke on the host's side, never a render, so this cannot recurse
    if (hooks.rendered) hooks.rendered();
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
    const orig = currentTextFor(key);
    const sel = picked && picked.blocks[0] === p ? caretRangeIn(p) : null;
    const a = sel && sel.start != null ? Math.min(sel.start, orig.length) : orig.length;
    startDraft(key, null, { text: orig.slice(0, a) + ch + orig.slice(a), caret: a + ch.length });
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
    requestAnimationFrame(() => { layoutQueue(); markCurrentSection(); drawWires(); ticking = false; });
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
      if (editsToNext >= 1) { editsToNext = 0; editsHeld = Math.min(EDIT_RULES.cap, editsHeld + 1); }
      renderWallet();
    }, 1000);

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

    // the fixture's other members are a timer; a live host beats the pulse
    // itself, once per movement the poll sees
    if (env.fixturePulse !== false) (function nextBeat() {
      setTimeout(() => { beat(); nextBeat(); }, BEATS[beatAt++ % BEATS.length]);
    })();

    addEventListener('resize', () => { layoutQueue(); onViewportChange(); });
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
  // The line is the palette's own: **hot for actions, cold for information**.
  // Only 'needs' goes — a ⏳ you have judged, a filed ✔✖ and a draft of your
  // own report where things stand and are owed to you whatever you hold.
  // ⚔️ and 🌶️ need no clause here, since neither can arise before you have
  // judged. What makes this safe to re-run is that the capability is part of
  // the charter column's data key, so an acknowledgment re-keys and the full
  // set is handed back in.
  const withheld = (g) => stateOf(g) === 'needs' && !MAY_JUDGE();

  // The data, keyed and seeded exactly as the page did it at load.
  function bindData(d, s) {
    DOC = d; SUGGS = s.filter((g) => !withheld(g));
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
    SUGGS.filter((s) => s.kind === 'draft').forEach((d) => {
      d.sites.forEach((s) => {
        if (!s.origin) s.origin = s.keys.map((k) => ({ key: k, text: currentTextFor(k), note: null }));
      });
      syncDraftKeys(d);
    });
  }

  // A host that derives the document and its items from a server view hands
  // them in here; the page is rebuilt wholesale, as after any render.
  function setData(next) {
    const textChanged = !!(next && next.DOC && next.DOC !== DOC);
    // **An unproposed draft is local, and has to survive a data swap** (Ed,
    // 2026-08-21: *when I ✒️ any constitutional question the text
    // disappears*). Live, SUGGS is rebuilt from the server on every render
    // and every 4s poll, and a draft you have not proposed yet exists
    // nowhere but in this array — so opening any other card destroyed what
    // you had typed. The host's own guard only holds while the draft card
    // is the open one; this holds whatever is open, which is the case that
    // was losing work. It is the same rule the surface already keeps for
    // every other provisional value: closing a card is not discarding.
    let suggs = (next && next.SUGGS) || SUGGS;
    if (next && next.SUGGS) {
      const mine = SUGGS.find((x) => x.id === DRAFT_ID && x.unproposed);
      if (mine && !suggs.some((x) => x.id === DRAFT_ID)) suggs = suggs.concat([mine]);
    }
    bindData((next && next.DOC) || DOC, suggs);
    renderAll();
    if (textChanged && hooks.textChanged) hooks.textChanged();
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
  }
  // the room the records speak of (stage 8): E and the floor, from the view
  // ---- `session-clock` (Q466/Q471) ----------------------------------------
  // One plain line saying where the document is in its life. **The ladder**:
  // days beyond a week, hours inside one, 20-minute steps inside six hours,
  // 10-minute steps inside the hour — never finer, never seconds. Every
  // figure rounds *down* to its step, so the clock is never optimistic.
  // Cold at every distance: the last hours' urgency belongs to the questions.
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  // a date in words, the year only when it is not this one (STYLE §2: raw
  // values are not copy); `todayMs` is a seam for the check script
  function dateWords(ms, todayMs) {
    const d = new Date(ms), now = new Date(todayMs ?? Date.now());
    return d.getDate() + ' ' + MONTHS[d.getMonth()] +
      (d.getFullYear() === now.getFullYear() ? '' : ' ' + d.getFullYear());
  }
  const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  // state: {kind:'none'} | {kind:'left', ms} | {kind:'frozen', mustReturn?}
  //      | {kind:'closed', atMs, todayMs?}
  function clockText(state) {
    if (!state || state.kind === 'none') return '';
    if (state.kind === 'frozen') {
      return 'Frozen' + (state.mustReturn > 0 ? ' — ' + state.mustReturn + ' must return' : '');
    }
    if (state.kind === 'closed') return 'Closed ' + dateWords(state.atMs, state.todayMs);
    const ms = state.ms;
    if (ms <= 0) return 'closing now';       // the clock has passed; the close is landing
    if (ms > 7 * DAY) { const d = Math.floor(ms / DAY); return d + ' days left'; }
    if (ms > 6 * HOUR) { const h = Math.floor(ms / HOUR); return h + ' hours left'; }
    if (ms > HOUR) {
      const steps = Math.floor(ms / (20 * MIN)), h = Math.floor(steps / 3), m = (steps % 3) * 20;
      return h + 'h ' + String(m).padStart(2, '0') + 'm left';
    }
    const m = Math.floor(ms / (10 * MIN)) * 10;
    return m >= 10 ? m + ' minutes left' : 'under 10 minutes left';
  }

  function setRoom(r) {
    if (r && r.E != null) ROSTER = r.E;
    if (r && r.floor != null) FLOOR = r.floor;
  }

  window.SESSION = {
    init, setData, renderAll, toggle, clauseKeysOf, closeCard, setWallet, setRoom, setClosed,
    clockText, dateWords,
    // edit mode's shared pieces (backlog 204): the row both hosts draw, the
    // read-mode keystroke, and what the riding tab says about the draft
    proposalRowHtml, typeAt, draftRowState, dropDraft,
    arcFrames, flyGlyph, pencilStorm, renderWallet, beat, act,
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
    // the probe replaces the scroll with an instant jump; smoothScrollBy is a
    // function declaration inside this closure, so the seam is a setter
    get smoothScrollBy() { return smoothScrollBy; },
    set smoothScrollBy(fn) { smoothScrollBy = fn; },
  };
})();
