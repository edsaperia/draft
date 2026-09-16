/**
 * design/composer.js — the composer (lifted out of session.js as refactor
 * Q1352 (i), 2026-09-14).
 *
 * The argument for the thing is the banner below, where it always was
 * (SURFACE §9.2, K13–K26). What moved is its parts: the draft model, the
 * caret arithmetic that survives a clause turning into a card, the four ways
 * a draft opens — a keystroke, a selection, a join at a clause edge, a seed
 * off somebody else's lane — the column's `[]` preference and the strip's
 * own state, the sign control, the commit button and the proposal-row, and
 * the two cards a draft wears: the `editing-card` while you are writing it
 * and the read-only one once it is in.
 *
 * `make(env)` is called by session.js where this code stood. Six of the
 * names it reads out of that file are reassigned after load — `DOC`, `SUGGS`
 * and `EDIT_RULES` at every bind, `doc` at init, `openId` at every press,
 * `editsHeld` at every spend and every drip — so each is read off `env` at
 * call time rather than copied in. The host's five answers (`MAY_PEN`,
 * `SIGNING`, `SIGNER`, `AUTHOR_RUNG`, `SIGNER_PERSON`) go in as calls for
 * the same reason, `init` replacing every one of them; `caretPulse` goes in
 * as a call for a different one, being a `const` below the line `make` is
 * called on and so still in its temporal dead zone. `laneMode` travels the
 * other way: the strip's own handler and the page's `SESSION.setLaneRaw`
 * both write it, so it comes back as a settable property rather than only
 * through `laneRaw`.
 *
 * Two things deliberately did not come. `mineSeq` names a draft at the
 * moment it is proposed and is `act`'s alone, so it stays beside `act`. And
 * the composer's DOM listeners stay in `renderDoc`'s passes: they are bound
 * to the column the placement pass has just swapped in, interleaved there
 * with the judging and the ledger, and lifting them would have meant
 * registering them in a different order than the page has always used.
 *
 * Load order: before session.js, which calls `make` as it is evaluated.
 */
window.COMPOSER = (function () {
  // the two shared files session.js reads, read the same way: every string a
  // member can see is copy.js's, and the card grammar's **pure layer** is
  // cards.js's. Only the pure layer can be taken off `window.CARDS` here —
  // the four names below that come out of `CARDS.make(env)` are session.js's
  // own instance of it, and arrive through `env` like anything else of its.
  const T = window.COPY.session;
  const { esc, fieldHtml, laneBlocks, originText, speakerHtml } = window.CARDS;
  // the drawn glyphs (Q1401): the row's circles and the card's own buttons are
  // pictures from the one set, the sentences beside them take glyphify
  const { glyphHtml, glyphify } = window.CARDS;

  function make(env) {
    // defined by the time this runs — a `const` above the call site, or a
    // hoisted declaration — and never reassigned, so each can be a value
    const { blockBeforeGap, blockHtml, chipsFor, currentTextFor, sourceTextFor, markerFor, drawWires,
      gapAfter, gapBefore, gapFields, gapLabel, headingForKey, isGapKey,
      layoutQueue, lineOf, renderAll, stuck, toggle,
      clauseHeadHtml, draftFaceHtml, keepStill, laneBoxHtml } = env;
    // and these are calls, not values: see the note above
    const { MAY_PEN, SIGNING, SIGNER, AUTHOR_RUNG, SIGNER_PERSON, caretPulse } = env;
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
    const draftOf = () => env.SUGGS.find((x) => x.id === DRAFT_ID);
    // a gap that is not in DOC (it is rendered only in edit mode) stands half a
    // place after the block before it — `docIndexOf`'s own +0.5 for an insert
    const docIndexOfKey = (key) => {
      const i = env.DOC.findIndex((l) => l.key === key);
      if (i >= 0 || !isGapKey(key)) return i;
      return blockBeforeGap(key) + 0.5;
    };
    const siteFor = (d, key) => (d.sites || []).find((s) => s.keys.includes(key));

    function ensureDraft() {
      let d = draftOf();
      if (!d) {
        d = {
          id: DRAFT_ID, kind: 'draft', mine: true, unproposed: true, state: 'needs',
          keys: [], sites: [], rationale: '', qLabel: T.compose.draftLabel,
          urgency: 0, pct: 0, cap: '',
          // the sign choice (Q770): the base is the default, signing the opt-in
          signed: false,
        };
        env.SUGGS.push(d);
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
      // a gap site is born with its own anchor's bookkeeping (Q1311): the
      // held-open `.insert-anchor` after the block before it is where its card
      // stands (the read side's shape for a proposed section, Q261's smaller half)
      if (isGapKey(key)) Object.assign(s, gapFields(key));
      d.sites.push(s);
      d.sites.sort((a, b) => docIndexOfKey(a.keys[0]) - docIndexOfKey(b.keys[0]));
      return { site: s, offset: 0 };
    }
    // What a site records about each block it replaces. Its text is the
    // block's **source line** — marker and words (Q1403; the type travelled
    // as flags until then, Ed 2026-08-17) — so a heading reads as a heading
    // in the lane and in the proposal because its `# ` is in the text, where
    // the member can also delete it. The block's kind still rides along for
    // anything that asks what the block *was* (the card's head).
    function originOf(key, seed) {
      const l = lineOf(key) || {};
      // a gap has nothing standing in it: an empty paragraph origin, marked so
      // the card's head can say which gap and the host can send an insertion
      if (isGapKey(key)) return { key, text: '', note: seed ? seed.note : null, t: 'p', gap: true };
      return { key, text: seed ? seed.text : sourceTextFor(key), note: seed ? seed.note : null,
               t: l.t, level: l.level, bullet: !!l.bullet };
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
    const liveRivalFor = (d, site) => env.SUGGS.find((x) =>
      x !== d && x.state !== 'sealed' && !x.mine && (x.keys ?? []).some((k) => site.keys.includes(k)));

    function dropDraft() {
      const i = env.SUGGS.findIndex((x) => x.id === DRAFT_ID);
      if (i >= 0) env.SUGGS.splice(i, 1);
    }
    // **A card's 🗑️ discards its own site** (Q1306 (a), Ed 2026-09-10: *the 🗑️
    // for the edit in one place should only discard that edit, not the whole
    // patch*). The site's blocks become the paragraph again and the rest of the
    // draft stands; with one site left the patch is a plain candidate, which the
    // row already says by counting; with none left the draft goes. A gap site
    // takes its anchor with it, the bookkeeping being its own (Q1311) — nothing
    // is re-derived. Returns the draft, or null once it is gone.
    function dropDraftSite(site) {
      const d = draftOf();
      if (!d || !site) return d || null;
      d.sites = d.sites.filter((s) => s !== site);
      if (!d.sites.length) { dropDraft(); return null; }
      syncDraftKeys(d);
      if (d.focusKey && site.keys.includes(d.focusKey)) d.focusKey = d.sites[0].keys[0];
      return d;
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
        const added = addDraftSite(d, key, (initial ? initial.text : (seed ? seed.text : sourceTextFor(key))), seed);
        site = added.site; offset = added.offset;
      }
      syncDraftKeys(d);
      // a draft on a gap renders in the gap, on the site's own anchor
      // (`addDraftSite`, Q1311) — the draft itself holds no gap
      d.focusKey = key;                    // what holdSel keeps still, and where the caret goes
      const caret = initial ? offset + initial.caret : null;
      const land = () => {
        const lane = env.doc.querySelector('[data-lane="' + site.keys[0] + '"]');
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
      const host = env.SUGGS.find((x) => x.id === env.openId);
      if (host && stuck(host) && (host.keys ?? []).includes(key)) {
        keepStill(() => renderAll(), '[data-card="' + host.id + '"]');
        land();
        layoutQueue(); drawWires();
        return;
      }
      if (env.openId === d.id) {
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
      // the caret is measured in the **words** — the column's marker is a
      // `.nocaret` span, drawn and never counted — and the lane holds the
      // **source line**, marker first (Q1403), so every offset moves past the
      // marker on its way from the one to the other
      const orig = currentTextFor(key);
      const mark = markerFor(key);
      const src = mark + orig;
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
      a += mark.length; b += mark.length;
      let ins = '';
      switch (ev.inputType) {
        case 'insertText': ins = ev.data == null ? '' : ev.data; break;
        // Enter at the end of a clause makes a new one and leaves the old alone
        // (Ed, 231) — which falls out of this for free: the lane holds a run of
        // paragraphs, so a newline at the end is simply an empty second block.
        case 'insertParagraph': case 'insertLineBreak': ins = '\n'; break;
        case 'insertFromPaste':
          ins = (ev.dataTransfer && ev.dataTransfer.getData('text/plain')) || ''; break;
        case 'deleteContentBackward':
          // **Backspace at the words' start of a heading or bullet takes the
          // marker off whole** (Q1403): the block becomes a paragraph with the
          // caret where it was, and the next backspace — now at a paragraph's
          // start — is Q1302's join. From the column the caret cannot stand
          // inside the marker, so this is the one way the keystroke reaches
          // it; in the open lane the marker is ordinary text.
          if (a === b) {
            if (mark && a === mark.length) { a = 0; }
            else if (a === 0) return joinWithNeighbour(key, -1, d0);
            else a -= 1;
          }
          break;
        case 'deleteContentForward':
          if (a === b) { if (b >= src.length) return joinWithNeighbour(key, 1, d0); b += 1; }
          break;
        default: return;                       // formatting commands have nothing to do here
      }
      startDraft(key, null, { text: src.slice(0, a) + ins + src.slice(b), caret: a + ins.length });
    }

    // **Backspace at the start of a clause joins it to the one above** (Q1302,
    // Ed's bot room 2026-09-10: *I should be able to backspace at the start of a
    // clause to join it to the previous clause*), and Delete at its end joins
    // the one below: a run of the two blocks with their texts run together and
    // the caret at the seam — K15's two-block run, one site, one candidate,
    // made by the keystroke a text editor makes it with. It used to be swallowed
    // and do nothing. Nothing to join at a gap, above the first clause or
    // below the last; a neighbour already in a draft keeps its own lane. The
    // joined line takes the upper block's rank — its source line, marker and
    // all, leads and the lower block's words follow (Q1403; `hunksOf` sends
    // the lane's lines as they are) — so a paragraph pulled up into a heading
    // becomes part of the heading, as it would anywhere.
    function joinWithNeighbour(key, dir, d0) {
      if (isGapKey(key)) return;
      const at = docIndexOfKey(key);
      const nb = at >= 0 ? env.DOC[at + dir] : null;
      if (!nb || !nb.key || isGapKey(nb.key)) return;
      if (d0 && (siteFor(d0, key) || siteFor(d0, nb.key))) return;
      const [k1, k2] = dir < 0 ? [nb.key, key] : [key, nb.key];
      const t1 = sourceTextFor(k1);
      const d = ensureDraft();
      const site = addDraftRun(d, [k1, k2], t1 + currentTextFor(k2));
      syncDraftKeys(d);
      d.focusKey = k1;
      const caret = t1.length;
      const land = () => {
        const lane = env.doc.querySelector('[data-lane="' + site.keys[0] + '"]');
        if (!lane) return;
        lane.focus({ preventScroll: true });
        placeCaret(lane, caret);
        caretPulse();
      };
      if (env.openId === d.id) {
        keepStill(() => renderAll(), '[data-key="' + k1 + '"]');
        land(); layoutQueue(); drawWires(); return;
      }
      toggle(d.id, true, land);
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
      // the run is the blocks' source lines (Q1403); a caret measured in a
      // block's words moves past that block's own marker
      const texts = keys.map(sourceTextFor);
      const marks = keys.map((k) => markerFor(k).length);
      const run = texts.join('\n');
      const flat = (block, node, off) => {
        const i = picked.blocks.indexOf(block);
        const within = offsetIn(block, node, off);
        if (i < 0 || within == null) return null;
        return texts.slice(0, i).reduce((n, t) => n + t.length + 1, 0) + Math.min(within + marks[i], texts[i].length);
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
        const lane = env.doc.querySelector('[data-lane="' + site.keys[0] + '"]');
        if (!lane) return;
        lane.focus({ preventScroll: true });
        placeCaret(lane, caret);
        caretPulse();          // the one caret move the reader did not make
      };
      if (env.openId === d.id) {
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
    // **And since Q1294 it is the column's, not the lane's** (Ed, 2026-09-10):
    // the `[]` toggle sits with B and I in the one strip at the top right of
    // the lifted column (`laneCtlHtml`, Q1294 (b): *top right of the edit box*)
    // and flips every clause and every open lane at once (`srcMode`,
    // `laneBlocks`); outside edit mode there is no strip and the column is
    // always rendered.
    let laneMode = 'rich';
    const laneRaw = () => laneMode === 'md';
    // ---- the strip's state (Q1294 (b)) ----------------------------------------
    // Each editing lane's re-mark (the rewrite of its own markup after a change,
    // bound in `renderDoc`), keyed by the lane, so the column's B and I can reach
    // the lane the caret is in.
    const laneRemark = new WeakMap();
    // Two things the strip reads off the page rather than off a render: whether
    // an editing lane holds the caret — B and I are acts on a selection, so they
    // are disabled while none does — and whether the strip has left its rest at
    // the card's top edge and is riding over the prose, when it takes a ground
    // and a shadow as the riding tab does (`detached`). Read at every focus
    // change, every scroll frame and every render.
    // **One sync for either column's strip** (Q1313, Ed 2026-09-11: *same
    // strip as after 🍾*): the page hands in its own strip and its own answer
    // to *does the founder's pre-🍾 column hold the caret*, since that column
    // is `#prose` and not a `[data-lane]`; called bare, it is the charter's.
    function syncEditCtl(strip, inLane) {
      strip = strip || env.doc.querySelector('.editctl');
      if (!strip) return;
      if (inLane == null) {
        const ae = document.activeElement;
        inLane = !!(ae && ae.closest && ae.closest('[data-lane]') && env.doc.contains(ae));
      }
      strip.querySelectorAll('.lfmt').forEach((b) => { b.disabled = !inLane; });
      const rest = parseFloat(getComputedStyle(strip).top) || 0;
      strip.classList.toggle('detached', strip.getBoundingClientRect().top <= rest + 0.5);
    }

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
        (o.disabled ? ' disabled' : '') + ' title="' + esc(o.title) + '">' + glyphHtml('✏️') + '</button>';
      if (!pen) return propose;
      return '<button class="btn btn-propose glyphbtn emojibtn" data-act="draft-propose" data-pen="1"' +
        (o.penDisabled ? ' disabled' : '') + ' title="' + esc(o.penTitle) + '">' + glyphHtml('✒️') + '</button>' + propose;
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
     *
     * The `[]` markdown toggle stood beside 🗑️ for one morning (Q1294 (a)) and
     * is the column's strip since Q1294 (b) (Ed, 2026-09-10: *top right of the
     * edit box*) — `laneCtlHtml`, drawn by `renderDoc` before the column. The
     * row is 🗑️, the count and the commit, and nothing else.
     */
    function proposalRowHtml(o) {
      o = o || {};
      const n = o.count || 0;
      const mid = n === 0 ? '' : T.row.placesChanged(n);
      // **The row's ✏️ is the hold itself** (Q1382, Ed 2026-09-15): it was a
      // proxy that opened the editing card and pressed the card's own ✏️, and
      // the card carries no commit now — so the pencil flies from here, the
      // ✒️ decrees from here, and the tooltips are the hold's (`proposeCtlTitles`).
      const btn = (pen, title) => '<button class="btn btn-propose glyphbtn emojibtn" data-act="row-commit"' +
        // the ✒️ takes its own `penDisabled` where the caller states one (the
        // charter's row: a decree needs no edit in the wallet), else `disabled`
        // like the ✏️ (the founder's pre-🍾 row states one flag for its one ✒️)
        (pen ? ' data-pen="1"' : '') + ((pen && o.penDisabled !== undefined ? o.penDisabled : o.disabled) ? ' disabled' : '') +
        ' title="' + esc(title || '') + '">' + glyphHtml(pen ? '✒️' : '✏️') + '</button>';
      return '<div class="race-mid commitrow proposalrow" data-proposalrow="1">' +
        '<button class="btn btn-withdraw glyphbtn" data-act="row-discard"' + (o.discardDisabled ? ' disabled' : '') +
        ' title="' + esc(o.discardTitle || T.row.discardAll) + '">' + glyphHtml('🗑️') + '</button>' +
        '<span class="rowmid">' + esc(mid) + '</span>' +
        (o.pen ? btn(true, o.title) + (o.pair ? btn(false, o.proposeTitle) : '') : btn(false, o.title)) +
        '</div>';
    }
    // **What the row's commits say they will do** (Q1382): the hold's price,
    // the places it lands in, the signature it carries, and the one case where
    // the edit costs nothing — re-making a stranded proposal (Q170), whose edit
    // was spent when it was first proposed and never given back, so an empty
    // wallet cannot stop the act that gets it back into the race. Computed once
    // for the row, since the site cards commit nothing.
    function proposeCtlTitles(d) {
      const n = d ? d.sites.length : 0;
      const remake = !!(d && d.rebaseOf);
      const broke = !remake && env.editsHeld < env.EDIT_RULES.stake;
      return {
        broke,
        title: broke ? T.row.broke
          : T.row.holdPropose + (n > 1 ? T.row.inAllPlaces(n) : '') +
            // the hold's tooltip says what leaves: a signed one leaves with your name
            (d && d.signed ? T.row.signedSuffix : '') +
            (remake ? T.stranded.keepsCost : T.row.editCost),
        penTitle: T.row.amend + (n > 1 ? T.row.inAllPlaces(n) : '') + T.row.penCost,
      };
    }
    // the single-site card's own commit (Ed, 2026-09-16): the row's ✏️ / ✒️
    // pair, drawn on the card under the card's act names, so the hold and
    // the click handlers that always answered `draft-propose` serve it
    const singleSiteCommitHtml = (d) => {
      const rs = draftRowState();
      const pt = proposeCtlTitles(d);
      const btn = (pen) => '<button class="btn btn-propose glyphbtn emojibtn" data-act="draft-propose"' +
        (pen ? ' data-pen="1"' : '') + ((pen ? !rs.changed : (!rs.changed || pt.broke)) ? ' disabled' : '') +
        ' title="' + esc(pen ? pt.penTitle : pt.title) + '">' + glyphHtml(pen ? '✒️' : '✏️') + '</button>';
      return MAY_PEN() ? btn(true) + btn(false) : btn(false);
    };
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
      const name = (SIGNER() || '').trim() || T.sign.anonymousName;
      const pick = (on, val, ttl, exp) =>
        '<div class="pick' + (on ? ' on' : '') + '">' +
        '<button class="lanepick" type="button" aria-pressed="' + on + '" data-act="draft-sign" data-signed="' + val + '">' +
        '<span class="dot"></span><span>' + ttl + '</span></button>' +
        '<span class="exp">' + exp + '</span></div>';
      return '<div class="choice signctl" role="radiogroup" data-signbase="' + base + '">' +
        pick(!d.signed, '0', T.sign.anonLabel, T.sign.anonExpLead +
          (base === 'anonymous' ? T.sign.expEver : T.sign.expUntil)) +
        pick(!!d.signed, '1', T.sign.signedAs(esc(name)),
          T.sign.signedExp) +
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
      env.doc.querySelectorAll('.sugg[data-card="' + DRAFT_ID + '"]').forEach((card) => {
        card.querySelectorAll('.signctl .pick').forEach((p) => {
          const b = p.querySelector('[data-signed]');
          const here = b && b.dataset.signed === (d.signed ? '1' : '0');
          p.classList.toggle('on', !!here);
          if (b) b.setAttribute('aria-pressed', String(!!here));
        });
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
      // the row's ✏️ — never the ✒️ beside it, a decree leaving with no
      // signature to name — says so in its tooltip, patched in place like the
      // card (Q1382: the hold is the row's)
      env.doc.querySelectorAll('[data-proposalrow] [data-act="row-commit"]:not([data-pen]), .sugg [data-act="draft-propose"]:not([data-pen])').forEach((pb) => {
        pb.title = pb.title.replace(/( — signed)?( — one edit)/, (d.signed ? ' — signed' : '') + '$2');
      });
    }

    function editCardHtml(d, site) {
      const n = d.sites.length;
      const i = d.sites.indexOf(site);
      // (the price and the stranded re-make's free pass are the row's tooltips
      // now — `proposeCtlTitles` — since the card commits nothing, Q1382)
      const rival = liveRivalFor(d, site);
      const seeded = site.origin.find((o) => o.note);
      const step = (to, label, glyph) => (to === null
        ? '<span class="pstep off">' + glyph + '</span>'
        : '<button class="pstep" data-step="' + d.id + ':' + d.sites[to].keys[0] + '" title="' + esc(label) + '">' + glyph + '</button>');
      return (
        '<div class="sugg editcard" data-card="' + d.id + '" data-anchor="' + d.id + '" data-site="' + site.keys[0] + '">' +
        (n > 1
          ? '<div class="pnav"><span class="pwhere">' + esc(site.label) + T.nav.placeOf(i + 1, n) + '</span>' +
            '<span class="psteps">' + step(i > 0 ? i - 1 : null, T.nav.prev, '↑') +
            step(i < n - 1 ? i + 1 : null, T.nav.next, '↓') + '</span></div>'
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
          html: site.origin.map((o) => '<div class="lp' + (o.t === 'h' ? ' hblock lvl' + (o.level || 1) : o.bullet ? ' bullet' : '') +
            '" data-key="' + o.key + '">' + blockHtml({ x: o.text, t: o.t, level: o.level, bullet: o.bullet }) + '</div>').join(''),
        }) +
        // and your draft as the one reply, in the reply's own order: the wording,
        // then the argument for it behind the same blank disc everybody else's
        // sits behind — which is what the rest of the roster will see (§3.4).
        '<div class="field"><div class="fieldlab">' + T.compose.fieldLab + '</div>' +
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
        // …and 🗑️ here is *this* site's (Q1306): on a patch each place's card
        // puts its own place back, and the row at the foot is the bin for all.
        // **And it is the card's only control** (Q1382, Ed 2026-09-15: *each
        // patch should have a 🗑️ to discard only it, but there should be a
        // floating ✏️ to submit all of them and a floating 🗑️ to discard all
        // of them*). The ✏️ hold — and the ✒️ beside it where the Founder holds
        // the pen — lived here too, one per site, so a two-place draft offered
        // two commits for one act; they are the proposal-row's now, at the foot
        // of the window (`proposeCtlTitles`), and a site card commits nothing.
        '<button class="btn btn-withdraw glyphbtn" data-act="draft-cancel"' +
        ' title="' + T.row.discardThis + '">' + glyphHtml('🗑️') + '</button>' +
        // **…except on a single-site draft, whose card carries the commit
        // too** (Ed, 2026-09-16: *proposal cards don't have ✏️ any more — we
        // removed them from multi-site patches to make it clearer that
        // they're multi-site, but they should be there for single-site
        // edits*). One place, one card, so the ✏️ — and the ✒️ beside it
        // where the Founder holds the pen — stands where the act is read,
        // the same hold as the row's and disabled by the same rule; a patch
        // keeps only the row's *submit all*.
        (n === 1 ? singleSiteCommitHtml(d) : '') +
        '</div>' +
        // Only the two facts that change what pressing ✏️ *does* (Ed, 2026-08-17).
        // What it costs is now shown rather than said — the pencil crosses the
        // screen — and the rest was the design explaining itself.
        (rival || n > 1
          ? '<div class="foot">' +
            (rival ? T.compose.rivalNote : '') +
            (rival && n > 1 ? ' · ' : '') +
            (n > 1 ? T.compose.allPlacesNote(n) : '') + '.</div>'
          : '') +
        // a live refusal (the text moved under the draft) is said on the card,
        // where the draft still is — never lost to a console
        (d.refusal ? '<div class="foot refusal">' + esc(d.refusal) + '</div>' : '') +
        '</div>'
      );
    }

    // **What a proposal of yours looks like once it is in** — the place
    // stepper, the clause at the head and your wording under it — shared by
    // the two cards that show one: `mineCardHtml` below, and the stranded
    // card beside it (Q170), which is the same reading of the same object
    // with a different pair of acts under it.
    function proposedBodyHtml(d, site) {
      const n = d.sites.length;
      const i = Math.max(0, d.sites.indexOf(site));
      const s = site || d.sites[0];
      // (`liveRivalFor` went with the `yoursnote`: the note was its only reader.)
      const step = (to, label, glyph) => (to === null
        ? '<span class="pstep off">' + glyph + '</span>'
        : '<button class="pstep" data-step="' + d.id + ':' + d.sites[to].keys[0] + '" title="' + esc(label) + '">' + glyph + '</button>');
      return (
        (n > 1
          ? '<div class="pnav"><span class="pwhere">' + esc(s.label) + T.nav.placeOf(i + 1, n) + '</span>' +
            '<span class="psteps">' + step(i > 0 ? i - 1 : null, T.nav.prev, '↑') +
            step(i < n - 1 ? i + 1 : null, T.nav.next, '↓') + '</span></div>'
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
          laneBlocks(s.text, originText(s)) + '</div>' +
          speakerHtml(d.rationale, undefined, mineSpeaker(d)) + '</div>',
          1, T.compose.proposedLab)
      );
    }

    // Once it is in, the same geometry read-only, and your proposal on the right
    // (Ed, 229) — the side it will always be on wherever it is shown to you.
    function mineCardHtml(d, site) {
      const n = d.sites.length;
      const s = site || d.sites[0];
      return (
        '<div class="sugg minecard" data-card="' + d.id + '" data-site="' + s.keys[0] + '">' +
        proposedBodyHtml(d, site) +
        // **The same row the editing card had, one step further on** (Ed,
        // 2026-08-17). 🗑️ stays exactly where it was — discarding a draft and
        // withdrawing a proposal are the same gesture at two moments, and the
        // only difference is that one of them hands an edit back. And the right
        // slot keeps the ✏️ that was *Propose*, now reading **Submitted**: the
        // act has become the fact of it, which is what the judgment row's ✓ does
        // when it is pressed. Nothing moves between the two cards, which is the
        // point — it is one lifecycle, not two screens.
        // **A passed proposal is not its author's to withdraw** (SPEC §9.7 rule
        // 8, SURFACE E37): once the membership has passed it and it waits on the
        // Founder, 🗑️ is dead — the room has decided, and the line on the rail
        // says so. The row otherwise stands exactly as it did.
        '<div class="race-mid commitrow">' +
        '<button class="btn btn-withdraw glyphbtn" data-act="draft-withdraw"' + (d.awaiting ? ' disabled' : '') +
        ' title="' + (d.awaiting ? esc(d.cap || '') : T.row.withdraw +
        (n > 1 ? T.row.allPlaces(n) : '') + T.row.withdrawCost) + '">' + glyphHtml('🗑️') + '</button>' +
        '<button class="btn btn-propose" aria-pressed="true" disabled' +
        ' title="' + T.row.submittedTitle + '">' + glyphify(T.row.submitted) + '</button>' +
        '</div>' +
        '</div>'
      );
    }

    // **The text moved under it** (Ed, 2026-09-14, Q170; SURFACE E38). The
    // clause this proposal rewrote was replaced, and the engine could not
    // carry the patch across to the new wording (SPEC §2.4): it is out of
    // every race, nobody is being asked about it, and it waits on its author.
    //
    // So it is the same card as `mineCardHtml` — the clause **as it now
    // reads** at the head, your wording under it, your reason behind the same
    // disc — with one sentence saying what happened and a different pair of
    // acts. The right slot is no longer *Submitted*, because it is not in any
    // more; it is ✏️ again, and pressing it opens the column with this
    // wording already in the lane, to be fixed against the text that now
    // stands. That press re-makes **this** proposal rather than opening a
    // second one, so it keeps its place and the edit it already cost; 🗑️
    // withdraws it and hands the edit back, exactly as it always did.
    // `dead` is the closed document: neither act exists there — the engine
    // refuses a confirmation and a withdrawal alike once the clock has run —
    // so the row states them and offers neither, as every closed card does.
    function strandedCardHtml(d, site, dead) {
      const n = d.sites.length;
      const s = site || d.sites[0];
      const off = dead ? ' disabled' : '';
      return (
        '<div class="sugg minecard strandedcard" data-card="' + d.id + '" data-site="' + s.keys[0] + '">' +
        proposedBodyHtml(d, site) +
        '<p class="setnote">' + esc(T.stranded.note) + '</p>' +
        '<div class="race-mid commitrow">' +
        '<button class="btn btn-withdraw glyphbtn" data-act="draft-withdraw"' + off +
        ' title="' + (T.row.withdraw + (n > 1 ? T.row.allPlaces(n) : '') + T.row.withdrawCost) + '">' + glyphHtml('🗑️') + '</button>' +
        '<button class="btn btn-propose glyphbtn" data-act="draft-remake"' + off +
        ' title="' + esc(T.stranded.remake) + '">' + glyphHtml('✏️') + '</button>' +
        '</div>' +
        '</div>'
      );
    }

    return { DRAFT_ID, draftOf, docIndexOfKey, siteFor, syncDraftKeys,
      dropDraft, dropDraftSite,
      caretRangeIn, selectedBlocks, laneCaret, placeCaret,
      startDraft, startDraftFromTyping, startDraftFromRun,
      laneRaw, laneRemark, syncEditCtl,
      commitBtnHtml, proposalRowHtml, proposeCtlTitles, draftRowState, setDraftSigned,
      editCardHtml, mineCardHtml, strandedCardHtml,
      // the column's `[]` preference, written from two places outside this
      // file — the strip's own handler in `columnPass`, and the page through
      // `SESSION.setLaneRaw` — so it goes back as the variable rather than as
      // a copy of whatever it held at make time
      get laneMode() { return laneMode; },
      set laneMode(v) { laneMode = v; } };
  }
  return { make };
})();
