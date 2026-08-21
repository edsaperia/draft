/* cards.js — the decision-card grammar, lifted out of session-view.html
 * (2026-08-18, the system.css move again: two copies of one card drift, and
 * the setup surfaces had been imitating this machinery by hand).
 *
 * Two layers:
 *   - pure exports: string in → HTML out (the diff/markdown engine, the card
 *     sub-builders that read only their own arguments, the drawn glyphs);
 *   - CARDS.make(env): the builders that read surface state — who picked
 *     what, what is locked, what the wash is — with that state crossing the
 *     seam as functions **evaluated at call time**, never as values captured
 *     at make() time. Session-view's `topUrgentId` is a reassigned `let`,
 *     its `chilled` a mutable Set, its `laneMode` mutable: a value captured
 *     once would be silently stale forever.
 *
 * The function bodies are session-view's own, comments and all — the only
 * changes are the seam lines (env.* where a module global stood, the two new
 * clauseHeadHtml params, and `valAttr` where `data-v` was hard-coded, so a
 * surface whose radios speak data-mval can use the same builder). The
 * contamination guard for the lift is design/tools/session-probe.js against
 * design/reference/: card HTML byte-identical, geometry 0.0px.
 */
window.CARDS = (function () {
  'use strict';

  // Full five-character escaping (PRODUCTION.md stage 3, defect 4): esc'd
  // strings land in attribute values as well as text (a lane's valAttr
  // carries member-proposed setting values on the live page), and an
  // unescaped quote there is an injection, not a rendering quirk. For text
  // nodes the extra entities parse back to the identical DOM.
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Decision cards show the text as it would *stand*, not a redline: the struck
  // words come out and only what is new stays lit. The fixture keeps the full
  // diff, because this is a rendering — which is what made it cheap to put the
  // redline back in 274 and cheap to take it out again when Ed reversed that
  // 2026-08-17. Nothing about the data changed either time.
  //
  // A proposal that removes the text **entirely** would come out of here as an
  // empty string, and blank is the one rendering that cannot be told from
  // unchanged — so that case says so in words (Ed, 274).
  function resultOnly(marked) {
    const out = marked
      .replace(/\s*<del>[\s\S]*?<\/del>\s*/g, ' ')          // a cut leaves one space behind…
      .replace(/\s+((?:<\/?ins>)*)([,.;:!?’”)])/g, '$1$2')  // …which closes up before punctuation
      .replace(/(<ins>)\s+/g, '$1')                          // a highlight never opens on a space
      .replace(/\s{2}/g, ' ')
      .trim();
    return out.replace(/<[^>]*>/g, '').trim()
      ? out : '<div class="lp empty"><br></div>';
  }

  const stripTags = (h) => String(h).replace(/<[^>]+>/g, '');

  // Rounded to whole percent: the second decimal was never doing anything but
  // suggesting the model is more precise than it is.
  const pct = (x) => Math.round((x ?? 0) * 100) + '%';

  // The rail is already a margin against the document; the section sign is a
  // citation mark, and nothing here is being cited (Ed, 188).
  const plainLabel = (t) => String(t ?? '').replace(/^§\s*/, '');

  // **The drawn marks** (Ed, 2026-08-17): ✔ U+2714 has no glyph in system-ui,
  // so it fell through to Segoe UI Symbol's tapered brush stroke — a different
  // mismatch on every machine. Two SVG paths on one stroke width cannot drift,
  // they scale, and they take `currentColor` so the lifecycle classes still
  // colour them.
  const TICK = "<svg class=\"mkg\" viewBox=\"0 0 12 12\" aria-hidden=\"true\"><path d=\"M2 6.4 L4.7 9.2 L10 2.9\"/></svg>";
  const CROSS = "<svg class=\"mkg\" viewBox=\"0 0 12 12\" aria-hidden=\"true\"><path d=\"M2.9 2.9 L9.1 9.1 M9.1 2.9 L2.9 9.1\"/></svg>";
  // **The third filed mark** (Ed, Q469, 2026-08-20: *⏸️ it is! — but draw
  // your own to match ✔️*). A race unresolved at the close is *undecided*,
  // distinct from kept (SPEC §4.6): two vertical bars at the tick and
  // cross's own stroke width, spanning the cross's height, in currentColor.
  const PAUSE = "<svg class=\"mkg\" viewBox=\"0 0 12 12\" aria-hidden=\"true\"><path d=\"M4.3 2.9 L4.3 9.1 M7.7 2.9 L7.7 9.1\"/></svg>";
  // **The ramp** (Ed, 2026-08-21: *the icon for ramp should be a filled
  // incline in the style of ✔️ rather than a jagged rising graph*). 📈 the
  // emoji is a chart — several segments, a plate behind them, a colour of
  // its own — where what this mark says is one thing: it goes up. A filled
  // wedge on the tick's own bounds, taking currentColor like the rest of
  // the family, so the lifecycle classes still colour it.
  const RAMP = "<svg class=\"mkg fill\" viewBox=\"0 0 12 12\" aria-hidden=\"true\"><path d=\"M2 9.2 L10 2.9 L10 9.2 Z\"/></svg>";
  const VS16 = "︎";
  const MARK = {
    // A rail entry is somebody's proposal, not a question the system invented,
    // so it wears a lightbulb rather than a question mark (Ed, 241). The move
    // that makes this work is promoting the *action* to its own glyph: ✏️ is
    // more literal than 💡 for "write one" anyway — a bulb is about having had
    // an idea, a pencil is about writing — so each glyph ends up nearer its own
    // job. It also settles a small clash: ❓ renders red in most emoji fonts
    // while its card washes yellow, and 💡 is yellow.
    needs: '💡',      // an idea is on the table, and it wants your judgment
    urgent: '🔥',     // the one that wants you most
    // The rail says what is true; the buttons say what you can do. So a
    // deadlocked race is marked "stuck" — same yellow as 💡, because it is
    // still open — and ✏️ lives on the drafting it leads to (Ed, 173, 241).
    //
    // ⚔️ rather than ❌ (Ed, 2026-08-17). A cross says *this failed*, which is
    // both wrong and discouraging: nothing failed, the room disagrees, and the
    // disagreement is exactly what makes writing a bridge worth doing. Crossed
    // swords say two things are still fighting, which is the true statement and
    // the one that makes the ask legible. It also stops ❌ being read as a close
    // button, which at 13px beside a card it plainly was.
    stuck: '⚔️',      // judging cannot move this; only a new draft can
    // ✏️ is the writing action *and* the state of a draft of your own that is
    // not yet proposed (Ed, 241). The overload is harmless because subject and
    // act agree — in both cases it is you, writing. Once you propose it, the
    // thing on the table is an ordinary proposal and wears the ordinary 💡;
    // what says it is *yours* is the green.
    propose: '✏️',    // ...and this is where you write one
    // A salience diagonal: which of two questions is the more **urgent**.
    // 🌶️ rather than ⚖️ (Ed, 2026-08-17). The scales were the wrong idea twice
    // over: weighing is what *every* card on this surface asks for, so a pair
    // of scales says nothing that distinguishes this one — and what a diagonal
    // actually asks is which question is hotter, which is a temperature rather
    // than a balance. It also reads: ⚖️ is a fine-detailed glyph that turns to
    // mush at 13px, where a chilli is one silhouette, and it is the hue the
    // card is already wearing.
    weigh: '🌶️',
    deciding: '⏳',   // yours is in; the race runs on
    // **The four decided marks are drawn glyphs, not emoji** (Ed, 2026-08-17:
    // *they carry their own background unlike all the other symbols*). ✅❎☑️🔄
    // are the only marks in the alphabet that come as a coloured plate with a
    // white shape knocked out of it, so beside 💡🔥✏️⏳⚔️ — all silhouettes —
    // they read as a different *kind* of object rather than as a different
    // state. Text-presentation glyphs (U+FE0E) take `color` like any other
    // character, so the colour is now chosen here rather than by whichever
    // emoji font the reader happens to have, and it is the same in every column.
    // the ground moved under a judgment of yours, so that judgment is void and
    // the race will ask you again — nothing is rewritten, and no new candidate
    // appears: what comes back is a pair to judge, on wordings that already exist
    shifted: '↻',
    // A decision says which way it went, not just that it happened (Ed, 160):
    // a matched pair — same green square, check or cross — so the outcome is
    // legible before you open anything.
    // **✔ U+2714 and ✖ U+2716**, and the second one is a considered choice
    // (Ed, 2026-08-17: *is there an X that's the same shape as ✔?*). The pair
    // Unicode *designed* is 2714/2718 ✔✘, and it is the wrong one: 2718 is
    // calligraphic — tapered strokes with a lean — so beside a solid heavy tick
    // it reads lighter and tilted. 2716 is the same solid uniform weight and
    // sits upright, which is what a pair has to do at 13px in a margin.
    adopted: TICK,   // a proposal carried: the charter changed here
    retired: CROSS,  // the incumbent held: nothing changed
    // **Filed keeps which way it went** (Ed, 2026-08-17). ☑️ collapsed both
    // outcomes into one mark the moment you acknowledged them, which threw away
    // the only thing about a settled clause anybody ever wants from a margin:
    // *did this change or not*. Same two glyphs, grey — because the difference
    // between decided and filed is whether it still wants something from you,
    // and grey is exactly what this surface uses to say that.
    filedYes: TICK,  // filed, and the charter changed
    filedNo: CROSS,  // filed, and the incumbent held
    filedUndecided: PAUSE, // filed at the close, nothing decided: the incumbent stands, undecided
  };
  // Which of the four drawn marks this is, so CSS can colour it. Only they
  // need it: every other mark is an emoji and brings its own colour with it.
  const DRAWN = ['adopted', 'retired', 'filedYes', 'filedNo', 'filedUndecided', 'shifted'];
  // The glyph, wrapped so it can be coloured wherever it is drawn — the queue,
  // the contents rail, the gutter tab and a card's head all show the same mark
  // and must show it the same way.
  const mkHtml = (kind) => (DRAWN.includes(kind)
    ? '<span class="mk mk-' + kind + '">' + MARK[kind] + '</span>' : MARK[kind]);
  const markHtml = (kind) => '<span class="qmark" aria-hidden="true">' + mkHtml(kind) + '</span>';

  // ---- the diff / markdown engine -----------------------------------------

  const tokens = (s) => String(s).split(/(\s+|[.,;:!?()\[\]"'’‘“”—–]+)/).filter((t) => t !== '' && t !== undefined);
  // Pieces are `[text, mark]` with mark one of null, 'ins', 'del'. `withDel`
  // asks for the removed words as well as the added ones — a stacked proposal
  // needs both (see the redline note in the stylesheet), the editing lane needs
  // only the additions.
  function diffPieces(oldText, newText, withDel) {
    const A = tokens(oldText), B = tokens(newText);
    const n = A.length, m = B.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = [];
    const push = (t, mark) => {
      const last = out[out.length - 1];
      if (last && last[1] === mark) last[0] += t; else out.push([t, mark]);
    };
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { push(B[j], null); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { if (withDel) push(A[i], 'del'); i++; }
      else { push(B[j], 'ins'); j++; }
    }
    while (j < m) { push(B[j], 'ins'); j++; }
    if (withDel) while (i < n) { push(A[i], 'del'); i++; }
    // A space between two new words is matched against the old text's own
    // spaces and comes back "unchanged", which would draw two new words as two
    // separate pills with a white gap between them. Rewriting three words is
    // one change, so it should be one mark.
    const joined = [];
    for (let k = 0; k < out.length; k++) {
      const cur = out[k], next = out[k + 1];
      const last = joined[joined.length - 1];
      // …and only where both sides of the gap carry the *same* mark, or a
      // space between a cut and an addition would end up inside one of them
      if (!cur[1] && last && next && last[1] && last[1] === next[1] && /^\s+$/.test(cur[0])) {
        last[0] += cur[0]; continue;
      }
      if (last && last[1] === cur[1]) last[0] += cur[0];
      else joined.push([cur[0], cur[1]]);
    }
    return joined;
  }
  // A highlight never opens or closes on a space — the same tidying `resultOnly`
  // does to the hand-authored diffs in the fixture.
  const markHtml2 = (t, mark, render) => {
    const m = t.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const tag = mark === 'del' ? 'del' : 'ins';
    const r = render || esc;
    return esc(m[1]) + (m[2] ? '<' + tag + '>' + r(m[2]) + '</' + tag + '>' : '') + esc(m[3]);
  };
  // **Result-only** (Ed, 274, retiring the redline). A proposal states the text
  // as it would stand, with what it adds marked and nothing struck through.
  // Ed's reason is about the reader rather than the tuning — *normal people
  // struggle to read or interpret redlines* — and it takes the old floor
  // question with it, since that floor existed to stop a redline turning into
  // confetti.
  //
  // What the deletions were there for is still real: in a stacked card, a
  // proposal whose only change is a cut renders as a sentence that looks like
  // the clause above it. Ed's answer is to cover the case where that is worst
  // and accept it elsewhere — a proposal that removes the text **entirely**
  // would otherwise render as blank space, so it says so in words instead. A
  // partial cut is left to be found by reading against the clause at the head,
  // which is one line up.
  //
  // A marking floor survives, now measured on the *new* text: below half of it
  // surviving from the clause, the proposal states itself plainly. Rival
  // candidates in a race are whole rewrites rather than edits, so this is what
  // keeps a race lane from being marked green end to end (Q92).
  // `force` skips the floor. The `deadlock-card` sets it (Ed, 2026-08-17 — *I'd
  // like to see the green highlights like elsewhere*): its field is eight
  // rewrites of one sentence, each of which falls below the floor on its own
  // and would state itself plain, so the card that most needs the marking is
  // the one the floor silences. The floor exists to stop a *lane* being lit end
  // to end beside its incumbent; here the incumbent is at the head and the
  // whole point of the band is comparison.
  const MARK_FLOOR = 0.5;
  function wordingHtml(oldText, newText, force) {
    if (!String(newText ?? '').trim()) return '<div class="lp empty"><br></div>';
    const pieces = diffPieces(oldText, newText, false);
    let same = 0, all = 0;
    for (const [t, mk] of pieces) {
      if (/^\s+$/.test(t)) continue;
      all += t.length;
      if (!mk) same += t.length;
    }
    if (!force && (!all || same / all < MARK_FLOOR)) return mdToHtml(newText);
    // rendered, not raw: a proposal is read, not checked, so emphasis in it
    // should look like emphasis rather than like asterisks
    return pieces.map(([t, mk]) => (mk ? markHtml2(t, mk, mdToHtml) : mdToHtml(t))).join('');
  }
  // Blocks are split on newlines *after* the diff, so a run of new wording that
  // spans a paragraph break is still one comparison rather than two.
  // `heads` marks which blocks of the run were headings, so a section title
  // still reads as one wherever the run is shown. Matched by position, which
  // holds while the block count does — and where the author has added or
  // removed lines it simply stops claiming, which is the honest failure.
  function laneBlocks(text, oldText, heads, raw) {
    // `raw` is markdown mode: the characters as they are, monospace, nothing
    // rendered — which is the whole point of the mode, since it exists to let
    // somebody check that their edit is exactly what they meant.
    const render = raw ? esc : mdToHtml;
    // Result-only (274): the diff marks what a proposal adds and never what it
    // cut, in the lane exactly as on the card.
    const pieces = oldText == null ? [[String(text), null]] : diffPieces(oldText, text, false);
    const blocks = [[]];
    for (const [t, mark] of pieces) {
      const parts = t.split('\n');
      parts.forEach((part, k) => {
        if (k > 0) blocks.push([]);
        if (part) blocks[blocks.length - 1].push([part, mark]);
      });
    }
    // An emptied block keeps its `<br>` — it is still a line you can put a
    // caret in — and says what it is through a pseudo-element, so the helper is
    // drawn without being *content*: nothing for `htmlToMd` to serialise back
    // into the candidate, and nothing for the caret to land after.
    return blocks.map((ps, i) => {
      const inner = ps.map(([t, mark]) => (mark ? markHtml2(t, mark, render) : render(t))).join('');
      return '<div class="lp' + (heads && heads[i] ? ' hblock' : '') +
        (inner ? '' : ' empty') + '">' + (inner || '<br>') + '</div>';
    }).join('');
  }
  const headFlags = (site) => site.origin.map((o) => o.t === 'h');

  // ---- markdown -------------------------------------------------------
  // A candidate's text **is** markdown (Ed, 2026-08-17). Most people want to
  // edit it rendered; some want to see the characters, "to make sure that
  // their edit is totally accurate" — which only means anything if the
  // characters are what is stored. So the source is the truth and `rich` is a
  // rendering of it, which is also the one arrangement where the two views
  // cannot disagree.
  //
  // Inline only, and deliberately: bold, italic, code. A charter is prose. The
  // block structure is already carried by the run of clauses, so headings and
  // lists have nowhere to go that `draft-site` does not already handle.
  const MD_RX = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
  function mdToHtml(src) {
    return String(src).split(MD_RX).map((part) => {
      if (/^\*\*[\s\S]+\*\*$/.test(part)) return '<strong>' + esc(part.slice(2, -2)) + '</strong>';
      if (/^\*[\s\S]+\*$/.test(part)) return '<em>' + esc(part.slice(1, -1)) + '</em>';
      if (/^`[\s\S]+`$/.test(part)) return '<code>' + esc(part.slice(1, -1)) + '</code>';
      return esc(part);
    }).join('');
  }
  // …and back. Walks what the browser made of the lane and writes the markdown
  // for it, so editing rich never silently drops the marks it is showing.
  // `<ins>`/`<del>` are the diff's own wrappers and contribute nothing.
  function htmlToMd(node) {
    let out = '';
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { out += n.nodeValue; continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName.toLowerCase();
      const inner = htmlToMd(n);
      if (!inner && tag !== 'br') continue;
      out += tag === 'strong' || tag === 'b' ? '**' + inner + '**'
        : tag === 'em' || tag === 'i' ? '*' + inner + '*'
        : tag === 'code' ? '`' + inner + '`'
        : inner;
    }
    return out;
  }
  // Plain words, for measuring a change rather than showing one.
  const mdStrip = (src) => String(src).replace(MD_RX, (m) =>
    m.startsWith('**') ? m.slice(2, -2) : m.slice(1, -1));

  // A caret offset does **not** mean the same thing in the two views: markdown
  // mode shows the syntax characters and rich mode does not, so the same place
  // in the text is a different number of characters along. Switching view
  // therefore converts rather than assuming — otherwise the caret drifts by two
  // characters for every bold word above it, which is exactly the class of bug
  // the mode exists to help somebody catch.
  const MD_ONE = /^(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)$/;
  const mdLead = (p) => (p.startsWith('**') ? 2 : 1);
  const mdInner = (p) => (p.startsWith('**') ? p.slice(2, -2) : p.slice(1, -1));
  const mdParts = (src) => String(src).split(MD_RX).filter((p) => p !== '' && p != null);

  function richToSource(src, off) {
    let s = 0, r = 0;
    for (const part of mdParts(src)) {
      const mark = MD_ONE.test(part);
      const inner = mark ? mdInner(part) : part;
      if (off <= r + inner.length) return s + (mark ? mdLead(part) : 0) + (off - r);
      r += inner.length; s += part.length;
    }
    return String(src).length;
  }
  function sourceToRich(src, off) {
    let s = 0, r = 0;
    for (const part of mdParts(src)) {
      const mark = MD_ONE.test(part);
      const inner = mark ? mdInner(part) : part;
      if (off <= s + part.length) {
        return r + Math.max(0, Math.min(inner.length, off - s - (mark ? mdLead(part) : 0)));
      }
      r += inner.length; s += part.length;
    }
    return mdStrip(src).length;
  }
  const originText = (site) => site.origin.map((o) => o.text).join('\n');
  // Read back whatever the browser made of the editing: blocks separated by
  // newlines, however they ended up nested.
  // Read the lane back as **markdown source**, which is what a candidate is.
  // In markdown mode the visible characters already are the source; in rich
  // mode the marks are real elements and have to be written back out, so that
  // editing rendered never silently drops the emphasis it is showing you.
  function readLane(el) {
    const raw = el.classList.contains('md');
    const blocks = [...el.children].filter((c) => c.classList && c.classList.contains('lp'));
    const src = blocks.length
      ? blocks.map((b) => (raw ? b.innerText : htmlToMd(b))).join('\n')
      : (raw ? el.innerText : htmlToMd(el));
    return src.replace(/ /g, ' ').replace(/\r/g, '')
      .replace(/\n{2,}/g, '\n').replace(/\n$/, '');
  }

  // ---- pure card sub-builders ---------------------------------------------

  // ✏️ on a lane: take *this* wording as your starting point (Ed, 228). A null
  // seed means the clause's own current text, which is what the composer uses
  // by default — so the left-hand lane of a quick card or a patch, which is the
  // current text, needs no seed at all.
  function laneSeed(s, lane, key) {
    if (lane === 'keep') return null;
    const note = 'the proposal you are editing';
    // a `deadlock-card`'s field is a slate, so the lane is its index in it
    if (String(lane).startsWith('slate:')) {
      const c = (s.slate || [])[+String(lane).slice(6)];
      return c ? { text: c.text, note } : null;
    }
    if (s.kind === 'race') return { text: lane === 'a' ? s.race.a.text : s.race.b.text, note };
    if (s.kind === 'patch') {
      const site = s.sites.find((x) => x.key === key) || s.sites[0];
      return { text: stripTags(resultOnly(site.marked)), note };
    }
    return { text: stripTags(resultOnly(s.marked)), note };
  }
  const laneProposeHtml = (s, lane, key) =>
    '<button class="lanepropose" data-propose-from="' + s.id + '|' + lane + '|' + (key || '') +
    '" title="Write your own version of this proposal. Free to open — proposing costs one edit.">' +
    // "propose edit" rather than "edit this" (Ed, 2026-08-17): what the button
    // starts is a *proposal*, and "edit this" promises an edit — which is the
    // one thing this surface never lets you do to the charter directly.
    '✏️ propose edit</button>';

  // Somebody said this, and you are not allowed to know who (SPEC §3.4). The
  // disc is the person; its blankness is the seal. Without it the rationale
  // was a bold line of text that read as a heading the system had written.
  // `title` is optional (2026-08-18): the setup surfaces carry an audited
  // copy of the seal tooltip with no spec citation in it; absent, the
  // session-view's own wording stands, byte for byte.
  // `who` (the close, 2026-08-21): at the record the seal lifts where the
  // anonymity ladder says so — the disc stays, and the name stands beside it.
  // Absent, the markup is what it always was, byte for byte.
  const speakerHtml = (why, title, who) =>
    '<div class="speaker' + (who ? ' revealed' : '') + '">' +
    '<span class="disc" aria-hidden="true" title="' + (title || (who ? esc(who) + ' wrote this.' : 'A member of the roster wrote this. Who, is sealed until the record (SPEC §3.4).')) + '"></span>' +
    (who ? '<span class="who">' + esc(who) + '</span>' : '') +
    (why
      ? '<div class="said">' + esc(why) + '</div>'
      : '<div class="said none">No reason given.</div>') +
    '</div>';

  // The fold triangle — one control on every surface (2026-08-19, lifted
  // from session-view when setup grew its own copy). Fold state lives with
  // each page, so `open` arrives as a fact rather than being read here.
  const secToggleHtml = (key, open, cls) =>
    '<button class="sectoggle' + (cls ? ' ' + cls : '') + '" data-sec-toggle="' + esc(String(key)) + '"' +
    ' aria-expanded="' + open + '" title="' + (open ? 'Fold this section away' : 'Unfold this section') +
    '"><span class="tri">▸</span></button>';

  // The field label names the band and, where there is more than one candidate,
  // says how many — which is a fact about this card rather than a standing, so
  // §8.3 has nothing to say about it.
  const fieldHtml = (inner, n, label) =>
    '<div class="field"><div class="fieldlab">' +
    (label || (n > 1 ? 'Proposed · ' + n + ' rival proposals' : 'Proposed')) +
    '</div>' + inner + '</div>';

  // The field a sealed judgment was decided from — only things that were
  // *proposed*. The incumbent is not a proposal: it is what they were all
  // measured against, so it gets its own block rather than a place in the
  // ranking (which would otherwise print "the current text: not adopted").
  // The rank number identifies a proposal in the record, so it needs no letter
  // either (Ed, 197) — a field of five reads 1..5, and a lone proposal is
  // named by what it is.
  function fieldOf(s) {
    // `by` rides only where a record has unsealed an author (the close)
    if (s.slate) return s.slate.map((c) => ({ label: '', text: c.text, why: c.rationale, p: c.p, won: !!c.won, by: c.by || null }));
    if (s.kind === 'race') return [
      { label: '', text: s.race.a.text, why: s.race.a.rationale, p: s.race.a.p, won: s.won === 'a', by: s.race.a.by || null },
      { label: '', text: s.race.b.text, why: s.race.b.rationale, p: s.race.b.p, won: s.won === 'b', by: s.race.b.by || null },
    ];
    // no label: the band above already says "what was proposed", and printing
    // it again on the only thing in the band said it twice
    return [{ label: '', text: s.optionB, why: s.rationale, p: (s.decided || {}).p, won: s.won === 'b', by: s.by || null }];
  }

  const groundNote = (s) => (!s.shifted || !s.wasGround ? ''
    : '<div class="replaced"><div class="rtag">The text you judged against' +
      '<span class="rsub">it changed under you — SPEC §4.4</span></div>' +
      '<div class="rtext">' + esc(s.wasGround) + '</div></div>');

  // ---- geometry, the pure half --------------------------------------------

  // The collapse now travels the card's whole box back onto its paragraph
  // rather than stopping at head height, so it is given a little longer and a
  // curve that *lands* — fast out, soft in — where the old one accelerated into
  // a jump it was never going to make gracefully.
  const COLLAPSE_MS = 240, EXPAND_MS = 230;

  const headOnlyHeight = (el) => {
    const head = el.querySelector('.clausehead');
    if (!head) return 0;                       // no clause to grow from: from nothing
    const cs = getComputedStyle(el);
    return (head.getBoundingClientRect().bottom - el.getBoundingClientRect().top) +
      parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth);
  };
  // everything except the clause: what the opening gap reveals
  const cardBody = (el) => [...el.children].filter((c) => !c.classList.contains('clausehead'));

  // ---- the factory --------------------------------------------------------
  // `env` keys are functions, read at call time. Defaults are the inert
  // surface: nothing picked, nothing locked beyond what `s` says, no wash, no
  // chip strip, radios speaking `data-v`.
  function make(env0) {
    const env = Object.assign({
      pickOf: () => null,
      stateOf: () => '',
      isCast: () => false,
      isJudged: () => false,
      verdictOf: () => '',
      isTopUrgent: () => false,
      isChilled: () => false,
      washFor: () => '',
      ownChip: () => '',
      speakerTitle: '',   // falsy → speakerHtml's own default wording
      laneRaw: () => false,
      currentTextFor: () => '',
      valAttr: 'data-v',
      root: () => document,
      readLine: () => 150,
      reduced: () => matchMedia('(prefers-reduced-motion: reduce)').matches,
      onExpand: () => {},
    }, env0 || {});

    // The pick control. Two labels rather than one rewritten in JS, so the
    // existing `choose()` — which only ever flips aria-pressed — keeps working
    // untouched across every card a patch is showing on.
    function laneBarHtml(s, v, opts) {
      const o = opts || {};
      return '<div class="lanebar">' +
        '<button class="lanepick" type="button" ' + env.valAttr + '="' + esc(String(v)) + '"' +
        ' aria-pressed="' + (env.pickOf(s) === v) + '"' + (s.locked ? ' disabled' : '') +
        ' title="Say you prefer this proposal — nothing leaves the card until you submit">' +
        '<i class="dot" aria-hidden="true"></i>' +
        '<span class="off">Prefer this</span><span class="on">Preferred</span></button>' +
        (o.edit === false ? '' : laneProposeHtml(s, o.lane || v, o.key)) +
        '</div>';
    }

    // The clause, lifted out of the document into the head of the card. It is
    // the same text at the same size, because it *is* the document — only the
    // label above says it has been picked up. The gutter marks come with it, so
    // a second live suggestion at this clause keeps the way in that it had while
    // the paragraph was there.
    // The clause keeps its highlight when it becomes a head, and its gutter mark
    // keeps its place (Ed, 2026-08-17). Both fall out of one move: the washed
    // block inside the head is given the same box as a `.anch` paragraph — the
    // same negative margin, the same padding — so the wash lands on the same
    // rectangle and the `.chipcol` inside it lands in the same gutter column.
    // The mark you clicked therefore does not move at all, which is what makes
    // the card feel like the clause opening rather than something replacing it.
    function clauseHeadHtml(s, o) {
      const opt = !!o.v;
      // **The strip does not reorder** (Ed, 2026-08-17: *when I click between tabs
      // on a card, they shouldn't move around*). The card's own tab used to be
      // prepended, so every switch dealt the column again and the tab you were
      // aiming at moved out from under the pointer on arrival. A tab strip is a
      // fixed set of places you move a highlight around — that is the whole of
      // what makes it a strip rather than a list of shortcuts.
      //
      // It costs nothing that the active one is no longer first: the gutter's pile
      // only ever opens its *front* tab, which is index 0 in the same stack order
      // the strip uses, so the mark you clicked is still at index 0 when the card
      // arrives and the 0px claim holds.
      //
      // `o.chips` is the whole strip when it is given. A card built without one —
      // the diagonal, which stands at no clause of its own — still needs its own
      // mark, because that mark is how it closes.
      //
      // `o.marks` (seam, 2026-08-18) replaces the chipcol wrapper wholesale: the
      // setup surfaces' strip builders return an *already-wrapped* chipcol, and
      // without this they would arrive double-wrapped.
      const marks = o.marks !== undefined ? o.marks
        : '<span class="chipcol">' +
        (o.chips && o.chips.includes('data-anchor="' + s.id + '"')
          ? o.chips
          : env.ownChip(s) + (o.chips || '')) + '</span>';
      return '<div class="clausehead">' +
        // `label: null` means *no eyebrow*: the decided card's head is the top of a
        // ranking whose rank, outcome and score are all in the card's own eyebrow
        // one line above, so a second label under it was the third telling.
        (o.label === null ? ''
          : '<div class="headlab"><span>' + (o.label || 'The clause as it stands') + '</span></div>') +
        // `data-key` sits on the washed block, not on the text inside it, because
        // that is the box `.anch` is: hold the text instead and the scroll
        // anchoring lands six pixels out, which is exactly the paragraph's own
        // padding-top that the text does not carry.
        '<div class="headclause"' + (o.key ? ' data-key="' + o.key + '"' : '') +
        (o.washAttrs !== undefined ? o.washAttrs
          : o.wash === false ? '' : env.washFor(s, o.key)) + '>' + marks +
        // `html` for the one head built of several paragraphs: a composer site is
        // a run of clauses joined into one piece of text (225)
        (o.html !== undefined
          ? '<div class="rtext">' + o.html + '</div>'
          : o.text === null
          ? '<div class="rtext none">Nothing stands here — the charter runs straight from Bringing a Guest to Guests Staying Over.</div>'
          : '<div class="rtext">' + esc(o.text) + '</div>') +
        '</div>' +
        (opt ? laneBarHtml(s, o.v, { lane: 'keep', key: o.key, edit: o.edit }) : '') +
        '</div>';
    }

    // One candidate: what it would make the clause say, who argued for it, and
    // what you can do about it. A reply, in the shape a reply has everywhere.
    const proposalHtml = (s, o) =>
      '<div class="propblock">' +
      (o.tag ? '<div class="rtag">' + o.tag + '</div>' : '') +
      '<div class="rtext">' + o.html + '</div>' +
      speakerHtml(o.why, env.speakerTitle) +
      (o.v ? laneBarHtml(s, o.v, { lane: o.lane || o.v, key: o.key, edit: o.edit }) : '') +
      '</div>';

    function commitRowHtml(s, extra) {
      const pick = env.pickOf(s);
      const insists = env.isTopUrgent(s) && env.stateOf(s) === 'needs';
      // Indifference is the last radio in the trio (Ed, 2026-08-16), not a glyph
      // of its own. 209/213 had the shrug and the tick sharing one slot and both
      // drawn as emoji; that was built when nothing else on the card was a
      // control. Now that every candidate carries a radio, indifference is
      // plainly one more thing you can say about the same question — *neither of
      // these*, alongside *this one* and *that one* — and it belongs in the same
      // alphabet. It stays out of the lanes, because it is a judgment about the
      // *pair* rather than about any text (SPEC §3.2), so it sits at the foot
      // where the acts about the whole card live.
      //
      // Submit is always rendered and greyed until something is chosen (Ed,
      // 2026-08-16, revising 202/204). The old argument was that a disabled
      // button is a thing you are being told off by; against it, an absent one
      // gives the row no shape and the reader no idea what finishing looks like.
      // A greyed tick in the corner says *this is where this ends* from the
      // moment the card opens.
      // **Every radio on a card lines up down its left edge** (Ed, 2026-08-17),
      // locked or not. A locked card used to keep the centred row on the argument
      // that a lone disabled radio pushed left leaves the other end of the card
      // empty — which is true and does not matter, because the alignment is what
      // says the three radios are answers to one question. One of them wandering
      // to the middle breaks the column, and a card the reader cannot judge is
      // exactly the card that most needs to look like the ones they can.
      return '<div class="race-mid commitrow">' +
        '<button class="lanepick vin" type="button" ' + env.valAttr + '="indifferent"' +
        ' aria-pressed="' + (pick === 'indifferent') + '"' + (s.locked ? ' disabled' : '') +
        ' title="' + (s.kind === 'diagonal' ? 'They matter equally' : 'I can’t split them') + '">' +
        '<i class="dot" aria-hidden="true"></i>' +
        '<span class="off">Indifferent</span><span class="on">Indifferent</span></button>' +
        (extra || '') +
        // The two acts on this card share the right-hand corner, in the order you
        // would reach for them: ❄️ first because it is the one that says *not now*,
        // then the ✓ that says *now*. Grouped, so space-between does not float the
        // snowflake into the middle of the row.
        '<span class="rightpair">' +
        ((insists || env.isChilled(s.id))
          ? '<button class="btn glyphbtn chill" data-act="chill"' +
            ' aria-pressed="' + env.isChilled(s.id) + '" title="' +
            (env.isChilled(s.id)
              ? 'Cooled — this one will not be put at the front of your queue. Press again to allow it.'
              : 'Not this one, not now — it stays open and stops being the most urgent') + '">❄️</button>'
          : '') +
        (s.locked ? '' : '<button class="btn btn-approve glyphbtn"' +
          (pick ? '' : ' disabled') +
          ' data-act="submit" aria-pressed="' + env.isCast(s) + '" title="' +
          (env.isCast(s) ? 'Recorded — choose again to change it'
            : pick ? 'Submit this judgment' : 'Choose one of the three first') + '">' + TICK + '</button>') +
        '</span>' +
        '</div>';
    }

    function reviseNote(s) {
      if (!env.isJudged(s)) return '';
      const said = '<span class="rl">You ' + (env.verdictOf(s) || s.verdict || 'judged') + '</span>';
      if (s.shifted) {
        return '<div class="srationale locked">' + said + esc(s.shifted) +
          ' You cannot change it, because it was not a judgment about this text (SPEC §4.4).</div>';
      }
      if (s.locked) {
        return '<div class="srationale locked">' + said +
          'This one is settled, so your judgment is on the record as it stands (SPEC §4.4).</div>';
      }
      // **The unlocked case says nothing at all** (Ed, 2026-08-17). It had been
      // trimmed once already, to what you said plus the fact it can change, and
      // both halves turn out to be drawn elsewhere on the same card: the radio on
      // the lane you chose reads *Preferred*, which is what you said, and it is
      // still a live radio, which is what *you can change this* means. A line of
      // prose restating two controls the reader is looking at is the design
      // explaining itself.
      //
      // The two locked cases above keep theirs, and the contrast is the whole
      // reason: there the controls are dead, so the card cannot say it by being
      // itself and a sentence is the only thing that can.
      return '';
    }

    // **The editing surface itself**, extracted so the `editing-card` and the
    // `deadlock-card` share one rather than each growing their own (Ed,
    // 2026-08-17 asked the deadlock card for *a full proposal edit box*, and two
    // boxes that drift apart is exactly what "full" must not come to mean).
    //
    // `blank` is the state before a draft exists: the lane holds the clause and
    // is a real editor, but nothing is backing it yet, so the first keystroke
    // opens the draft with that character already applied. Which is
    // `always-on-typing`, applied to a box instead of to a paragraph — the same
    // idea and, it turns out, the same function underneath.
    function laneBoxHtml(d, site, blank) {
      return '<div class="lanebox' + (blank ? ' blanklane' : '') + '">' +
        // The italic button is a **serif capital I** (Ed, 2026-08-17). A sans
        // italic I is a slash with no serifs on it — it reads as punctuation
        // rather than as a letter, which is the one thing a letterform button
        // must not do. The serifs are what make it an I while it is still leaning.
        //
        // And the mode control is **one button, not a pair** (Ed, 2026-08-17):
        // `[]` off by default, pressed for markdown. A two-segment Rich/Markdown
        // switch spent a lot of the strip saying that a thing which is off is
        // off; a single toggle says the same with the state in its own pressed-
        // ness, which is what every other control on this surface does.
        '<div class="lanectl">' +
        '<button class="lfmt" data-fmt="bold" title="Bold (the markdown is **like this**)"><b>B</b></button>' +
        '<button class="lfmt" data-fmt="italic" title="Italic (the markdown is *like this*)">' +
        '<span class="ital">I</span></button>' +
        '<button class="lmode" data-mode="' + (env.laneRaw() ? 'rich' : 'md') + '"' +
        ' aria-pressed="' + env.laneRaw() + '"' +
        ' title="Markdown — see and type the characters exactly as they are stored">[]</button>' +
        '</div>' +
        (blank
          ? '<div class="editlane" contenteditable="true" data-deadlane data-key="' + blank +
            '" spellcheck="false"><div class="lp">' + esc(env.currentTextFor(blank)) + '</div></div>'
          : '<div class="editlane' + (env.laneRaw() ? ' md' : '') + '" contenteditable="true" data-lane="' +
            site.keys[0] + '" spellcheck="false">' +
            laneBlocks(site.text, originText(site), headFlags(site), env.laneRaw()) + '</div>') +
        // The rationale is **inside** the same surface (Ed, 2026-08-17): you are
        // expected to fill in both, so they are one editing surface at one
        // height rather than two boxes at different ones — and the speaker's
        // disc comes with it, because it belongs to the words beside it. A
        // hairline separates them without dividing them, which is the card's own
        // band grammar applied one level down.
        '<div class="speaker">' +
        '<span class="disc" aria-hidden="true" title="This is how your reason will reach everybody else: with your name off it (SPEC §3.4)."></span>' +
        '<div class="said edit-why" contenteditable="plaintext-only"' +
        (blank ? ' data-deadwhy="' + blank + '"' : ' data-why') + ' spellcheck="false"' +
        // Ed, 2026-08-17. A question invited an answer to a different question —
        // "because it's clearer" — where an opening clause invites the sentence
        // the field is actually for. It also states the act: what you are writing
        // is the case for a change, not a note about one.
        ' data-placeholder="We should change this because…">' +
        esc((d && d.rationale) || '') + '</div></div>' +
        '</div>';
    }

    // ---- open/close geometry ----------------------------------------------

    // **The card grows out of its own clause** (Ed, 273; replacing the swap that
    // came in with the stacked card, which was correct but jarring).
    //
    // The old unroll grew a card from nothing *underneath* its clause. That
    // stopped making sense once the card became the clause opened: growing from
    // zero meant the paragraph blinking out and something else inflating in the
    // hole. The swap that replaced it was honest and instant, and instant is the
    // problem — nothing tells you where the rest of the charter went.
    //
    // So the card does not grow from nothing. It grows from **exactly the height
    // at which only its own head is showing** — which is the clause, at the size
    // and place the clause already was. Frame one therefore looks like the
    // document with the paragraph still in it; the gap then slides open beneath
    // the clause and the field arrives inside it, fading in a beat behind the
    // motion so the two do not compete. The clause itself never moves: keepStill
    // has already pinned it, and everything that grows, grows below it.
    //
    // Closing runs the same thing backwards, down to head height, and the swap
    // back to a plain paragraph happens at a size where the two are the same
    // shape — so the substitution is never seen.

    // **A card closes all the way back into its paragraph** (Ed, 2026-08-17: the
    // close "feels quite abrupt … the whole card disappears and the text above
    // shifts").
    //
    // It used to collapse to `headOnlyHeight` — the height at which only the head
    // shows, which is where *opening* starts — and then hand over to a re-render
    // that swapped the card for a plain paragraph. Symmetrical on paper, and
    // wrong in use, because a card at head height is not a paragraph: it is a
    // lifted white box with an eyebrow over the clause, 14px of padding round it
    // and its top edge 34px higher than the paragraph's will be. So the animation
    // ran smoothly to a shape that was still 93px too tall and 38px too high, and
    // *then* everything jumped. Opening gets away with the same discrepancy
    // because the jump happens in the frame of the click, before the motion;
    // closing puts it after, which is the one order the eye cannot forgive.
    //
    // So the collapse animates the card's whole box onto the paragraph's box —
    // its height down to the `.headclause` (which is the paragraph's own box by
    // construction: same padding, same negative margin, same width), its padding
    // away, its eyebrow shut, its lift and its white ground out. The margin-top
    // grows by exactly what the padding and the eyebrow gave up, so the clause
    // itself does not move a pixel while everything around it leaves. The last
    // frame *is* a paragraph, and the swap that follows has nothing left to do.
    function collapseCard(el, done) {
      if (!el || env.reduced()) return done();
      // A card that has scrolled off the top is not worth animating: for 190ms it
      // would shrink where nobody can see it while hauling the rest of the charter
      // up the screen, and the delay is 190ms the click doesn't answer in. It goes
      // at once, and the caller's keepStill takes up the slack in the same frame.
      if (el.getBoundingClientRect().bottom < env.readLine()) { el.style.display = 'none'; return done(); }
      const cs = getComputedStyle(el);
      const hc = el.querySelector('.clausehead .headclause');
      const lab = el.querySelector('.clausehead .headlab');
      const h = el.offsetHeight;
      const body = cardBody(el);
      // Falls back to the old head-height collapse where there is no clause to
      // land on — an `insert-anchor` card has no head, so there is no paragraph
      // for it to become.
      const end = hc ? hc.offsetHeight : headOnlyHeight(el);
      const padT = parseFloat(cs.paddingTop) || 0;
      const labH = lab ? lab.getBoundingClientRect().height +
        (parseFloat(getComputedStyle(lab).marginBottom) || 0) : 0;
      const mt = parseFloat(cs.marginTop) || 0;
      const para = env.root().querySelector('.prose p');
      const endMB = para ? getComputedStyle(para).marginBottom : cs.marginBottom;

      el.style.clipPath = 'inset(-60px -100px 0px -100px)';
      el.style.height = h + 'px';
      void el.offsetHeight;
      const ease = COLLAPSE_MS + 'ms cubic-bezier(.32, .72, 0, 1)';
      el.style.transition = ['height', 'padding-top', 'padding-bottom', 'margin-top',
        'margin-bottom', 'box-shadow', 'background-color'].map((p) => p + ' ' + ease).join(', ');
      if (hc) {
        el.style.height = end + 'px';
        el.style.paddingTop = '0px';
        el.style.paddingBottom = '0px';
        // the top edge descends by exactly what it stops holding, so the clause
        // stays put while the card leaves from every other side
        el.style.marginTop = (mt + padT + labH) + 'px';
        el.style.marginBottom = endMB;
        el.style.boxShadow = 'none';
        el.style.backgroundColor = 'transparent';
        if (lab) {
          lab.style.transition = 'opacity 90ms ease-in, height ' + ease + ', margin-bottom ' + ease;
          lab.style.overflow = 'hidden';
          lab.style.height = '0px';
          lab.style.marginBottom = '0px';
          lab.style.opacity = '0';
        }
      } else {
        el.style.height = end + 'px';
      }
      // the body goes first and faster, so the gap is closing over something
      // already gone rather than crushing it
      body.forEach((c) => {
        c.style.transition = 'opacity ' + (COLLAPSE_MS - 70) + 'ms ease-in';
        c.style.opacity = '0';
      });
      setTimeout(done, COLLAPSE_MS);
    }

    function expandCard(el, done) {
      if (!el || env.reduced()) return done();
      const h = el.offsetHeight;
      const start = Math.min(headOnlyHeight(el), h);
      const body = cardBody(el);
      el.style.clipPath = 'inset(-60px -100px 0px -100px)';
      el.style.height = start + 'px';
      body.forEach((c) => { c.style.opacity = '0'; });
      void el.offsetHeight;
      // an ease-out on the height so the gap opens quickly and settles, and the
      // fade held back 60ms so the field reads as arriving *into* the gap rather
      // than the two happening at once
      el.style.transition = 'height ' + EXPAND_MS + 'ms cubic-bezier(.22, .61, .36, 1)';
      el.style.height = h + 'px';
      body.forEach((c) => {
        c.style.transition = 'opacity ' + (EXPAND_MS - 60) + 'ms ease-out 60ms';
        c.style.opacity = '1';
      });
      setTimeout(() => {
        el.style.height = ''; el.style.clipPath = ''; el.style.transition = '';
        body.forEach((c) => { c.style.opacity = ''; c.style.transition = ''; });
        env.onExpand();
        done();
      }, EXPAND_MS);
    }

    // A patch has a card at every site (181), so open and close operate on a set.
    const openCardEls = (id) => [...env.root().querySelectorAll('.sugg[data-card="' + id + '"]')];
    const runOnCards = (fn) => (id, done) => {
      const els = openCardEls(id);
      if (!els.length) return done();
      let left = els.length;
      els.forEach((el) => fn(el, () => { if (--left === 0) done(); }));
    };
    const collapseCards = runOnCards(collapseCard);
    const expandCards = runOnCards(expandCard);

    // Keeping the page still across a layout change (Ed, 2026-08-16).
    //
    // Opening a card is meant to be *one* movement: the charter slides once and
    // stops. But three things in the sequence change the height of content that
    // may be sitting above where you are reading — the old card closing, sections
    // folding and unfolding, and the re-render that follows each — and each of
    // them drags everything below it, so the page lurched before the scroll had
    // begun and then eased back. Nothing was wrong with the destination; the
    // charter simply moved twice to get there.
    //
    // The remedy is the browser's own scroll-anchoring, done by hand because the
    // document is re-rendered wholesale and the native version has nothing stable
    // to hold on to. Note a clause you can see and where it sits, make the change,
    // then move the scroll by however far that clause has travelled — so it has
    // not travelled at all. Several candidates, because the change may be a fold
    // that takes the first one away with it.
    // Held by *selector*, not by element: the document is re-rendered wholesale,
    // so the node measured before the change no longer exists after it, and the
    // selector is the only thing that survives. A clause is found by its key; a
    // proposed section has no key — it is a gap where text is not yet — so it is
    // found by the entry it belongs to. Getting this wrong is quiet: the fallback
    // holds some *other* clause still and the one you were sent to slides away.
    const STILL_KEYS = 8;
    function stillRef(preferSel) {
      const sels = [];
      const add = (sel) => {
        const el = sel && env.root().querySelector(sel);
        if (el && !sels.some((m) => m.sel === sel)) sels.push({ sel, top: el.getBoundingClientRect().top });
      };
      add(preferSel);
      for (const el of env.root().querySelectorAll('[data-key]')) {
        if (el.getBoundingClientRect().bottom <= env.readLine()) continue;   // scrolled past
        add('[data-key="' + el.dataset.key + '"]');
        if (sels.length >= STILL_KEYS) break;
      }
      return sels;
    }

    function restoreStill(ref) {
      if (!ref || !ref.length) return;
      for (const m of ref) {
        const el = env.root().querySelector(m.sel);
        if (!el) continue;                                   // folded away by the change
        const drift = el.getBoundingClientRect().top - m.top;
        if (Math.abs(drift) > 0.5) scrollTo(0, scrollY + drift);
        return;
      }
    }

    // Measure, change, correct — in one synchronous run, so the drift is never
    // painted. `preferSel` names the clause the move is *about*, which is the
    // right thing to hold once we have arrived at it.
    function keepStill(fn, preferSel) {
      const ref = stillRef(preferSel);
      const out = fn();
      restoreStill(ref);
      return out;
    }

    return {
      laneBarHtml, clauseHeadHtml, proposalHtml, commitRowHtml, reviseNote,
      laneBoxHtml, collapseCard, expandCard, openCardEls, runOnCards,
      collapseCards, expandCards, stillRef, restoreStill, keepStill,
    };
  }

  return {
    esc, resultOnly, stripTags, pct, plainLabel,
    TICK, CROSS, PAUSE, RAMP, VS16, MARK, DRAWN, mkHtml, markHtml,
    tokens, diffPieces, markHtml2, MARK_FLOOR, wordingHtml, laneBlocks,
    headFlags, originText, MD_RX, mdToHtml, htmlToMd, mdStrip,
    MD_ONE, mdLead, mdInner, mdParts, richToSource, sourceToRich, readLane,
    laneSeed, laneProposeHtml, speakerHtml, secToggleHtml, fieldHtml, fieldOf, groundNote,
    headOnlyHeight, cardBody, COLLAPSE_MS, EXPAND_MS,
    make,
  };
})();
