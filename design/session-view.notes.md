# Design notes — the session view (default surface), second pass

Desktop-first · light mode · Bootstrap-plain (visual design deferred) · content from run clubhouse-1 · the race-card mockup is this surface's escalation state.

These notes used to live at the bottom of `design/session-view.html`. They were moved out on 2026-08-15 (Ed, 76): nothing sits underneath the three-column view any more. The mockup is the artefact; this is its reasoning.

## Suggestion-mode with escalation

This is the surface a member lives in: **the current document, readable top to bottom**, with pending suggestions anchored where they bite. Text under challenge carries a **yellow wash**, and the left rule names the kind: green for a **singleton suggestion**, yellow for a **race** where proposals collided, blue for a **multi-site patch**. The machinery stays invisible until the document's conflict density summons it.

## Three rails: contents, document, session (Ed, 61)

The document sits in the middle with a rail either side, and the two rails answer different questions. On the left the **contents-rail** — the charter's own headings, generated from the document, following the reader as they scroll — answers *where am I in this text*. On the right the **needs-you queue** answers *what wants me*. Putting the reading aid on the left and the work list on the right matches how the two get used: the contents is a map you glance at, the queue is a pile you work through, and neither should be mistaken for the other. A proposed new section is deliberately **absent** from the contents until it's adopted — the rail is a picture of the charter as it stands, not as it might become; the proposal is discoverable in the document itself, as a held-open gap.

## One geometry for suggestions and races (Ed, 62 and 66)

A quick suggestion uses the race card's shape exactly: the paragraph **highlighted yellow in the document**, a **wide pink-bordered box** below it, and **two lanes — Option A and Option B**. The only difference from a race is what sits in Option A: on a race both lanes are challengers, and on a quick card **Option A is the current text**. Everything else — the labels, the geometry, the gesture — is the same, so escalation to a race stops being a re-layout and becomes a substitution: a rival proposal moves in, the incumbent moves out, and the member's hands already know where to go.

This also removed a duplicate control rather than adding one. Choosing A on a quick card *is* keeping the current text, so the separate Keep button went with it. The card is now a literal picture of the judgment the engine records — one lane per thing being compared — where the previous pass showed the incumbent as scenery in a band above and then asked for a verdict on a single lane. The prompt changes to match: a race asks *if this text changes, which change is better*, a quick card asks *which should stand here, the text as it is or the change*, because on a quick card keep-current is genuinely on the table (SPEC §8.3 forbids it only on rival cards).

The card also carries **indifference** (Ed, 69): "genuinely can't split them", the same control a race offers. It matters more here than there. On a rival card, indifference is between two challengers; on a quick card one side *is* the incumbent, and incumbent-involving indifference is precisely the signal SPEC §3.2 feeds the care map (Q13). This is the card that generates that data, so this is the card that must be able to record it.

## The patch card is the same object too (Ed, 85)

All three cards now have one shape: a pink-bordered box, a prompt, and two lanes with the charter as it stands on the left and the change on the right. A patch differs only in what fills a lane — every site, rather than one — because the judgment is single and so each lane has to carry the whole of its side of it. Option A shows all three places as they read now; Option B shows the same three places with the change marked in; choosing A is keep-current, exactly as on a quick card.

The **ledger** sits above the lanes rather than inside Option B. It describes the change, so it belongs to B by rights, but putting it there would both unbalance the lanes and bury the one-line answer to "what is this?" under six blocks of text. Above the fold it orients you before you read either side, and the lanes stay symmetrical — which is the whole point of the exercise.

**Every card now carries one** (Ed, 86). A quick card and a patch have a single ledger above the lanes; a race has **two, side by side**, in the same columns as the lanes they describe, headed *In short · Option A* and *In short · Option B*. That last arrangement turns out to be the most useful thing on a race card: two proposals of four or five lines each are hard to hold in the head at once, but two three-item ledgers can be read across in a second, and the full texts below are then confirmation rather than comprehension. The ledger says what a proposal *does*; the diff says what it *changes*; the rationale says why someone wanted it. Three different questions, and previously only the middle one had an answer on the card.

Ledger items are `drop` and `add` — never a neutral "changes", because the point of the form is to force the author to say what is being given up as well as what is being gained. A ledger that is all `add` is a legitimate shape (a new section adds and drops nothing) but a substantive rewrite that claims to drop nothing is usually hiding something, and having the two chips side by side makes that visible.

**The rationale moved up into the ledger too** (Ed, 87), under a quiet *Why · unsigned*. The card now divides cleanly in half: everything above the lanes is argument — what this does, and why someone wanted it — and the lanes below hold nothing but the text being judged and the button that judges it. That ordering matches the order the questions actually arrive in. You ask what a proposal is for before you read it closely; having the reason sitting underneath the text meant reading the text cold and then being told, afterwards, what you were supposed to have been looking for.

It also made the card materially shorter, because a rationale set beside its ledger is denser than one stacked under a lane, and it removed the last asymmetry between the two sides: the lanes are now identical in structure — a label and a text — so nothing about their shape can suggest that one is the favourite.

Two things fall out of the symmetry. The lanes are flex columns with the buttons pushed to the bottom, so however uneven the two sides are the verdicts line up. And the patch inherits **indifference**, which it lacked before: a patch is incumbent-versus-challenger like a quick card, so incumbent-involving indifference is available here too and feeds the care map the same way (SPEC §3.2).

This also finished the colour job left over from 67 — the patch card was the last one still bordered blue while the other two had gone pink. Blue now survives only on the anchor rule and the still-deciding wash, where it means *kind*, not *card*.

## Non-local edits: inline is about discovery, not representation (Ed, point 50)

A rename that touches the whole document cannot *be* a local suggestion — but it can be **locally discoverable everywhere it touches**. A multi-site patch gets an anchor at every site; opening any anchor opens the *same single card* — one judgment object, with a summary ledger up top and every site's change below — and while it's open, its sibling anchors light up (dashed outline), so the patch's whole footprint is visible on the page. One suggestion, many doorways, one verdict. The queue lists it once. If a patch is too scattered even for this, the ledger carries the load and the sites become its receipts — and truly document-scale rewrites are arguably not suggestions at all but successor documents, which is a different ceremony.

## Escalation in place

When a span has rival proposals, its anchor is yellow and its inline card is the race: both candidates side by side with the conditional prompt ("if this text changes, which change is better?" — SPEC §8.3: no keep-current on rival cards, and rival cards only get served once at least one challenger plausibly displaces the incumbent). The full race-card view (queue of races, comparison modes, discontinuous patches) is one level deeper — this surface embeds the compact version so easy sessions never leave the page.

## The queue is a courtesy, not a conveyor

"Needs you" is the router's ordering — hottest races first, floors-near races where you're unheard, then quick approvals — but every item is also anchored in the document, so a member who prefers to just read the charter top to bottom encounters exactly the same work in document order. Two navigation styles, one underlying set of judgments.

## The queue-wire (Ed, 71; narrowed 78)

The **open** card draws a **wire**: out of its queue card's left edge, along the gutter between the two rails, and left into every place in the document it refers to. It answers the question the queue can't — *where does this actually live* — and it stays drawn while you judge.

It earns its keep most on **multi-site patches**, where one queue entry sprouts a wire to each site at once and the patch's footprint becomes visible as a shape rather than a claim in a ledger. That is the same job the dashed sibling outlines do from inside an open card, approached from the other end. The wire takes the colour of the suggestion's kind, so it also says what sort of work is waiting before you arrive.

The first pass drew the wire on **hover** as well, on the theory that you would want to ask "where is this?" without committing to a click. In use that was wrong (Ed, 78): the pointer crosses several queue cards on the way to the one you want, so the gutter flicked through three or four different wires before you arrived — a lot of motion in exchange for an answer nobody had asked for yet. Hover is a cursor passing through, not a question. The wire is now tied to the open card only, which also makes it mean something more definite: this line is *the thing you are working on*, not *the thing under your mouse*.

**Clicking** a queue card scrolls the document until that wire is **horizontal** (Ed, 74). The queue card stays exactly where it is and the charter slides to meet it, which is the right way round: the queue is the fixed thing you are working from, the document is the thing being navigated. It also means the eye never has to search after a click — the target arrives at the height your attention is already at, joined to the card you clicked by a straight line. A multi-site patch levels on its **topmost** site, and its other wires fan off that flat line, so the shape of the footprint stays readable rather than being centred on nothing in particular.

Three wrinkles worth knowing:

1. The queue rail is sticky, so a single scroll can move both ends of the wire at once; the alignment measures again after the scroll settles and corrects, stopping as soon as a pass stops improving.
2. Past the end of the charter the rail runs out of container and rides with the page. Both ends of the wire then move together, so scrolling further down can never flatten it — it only travels. The alignment predicts that case and refuses the pass rather than chasing it.
3. The document carries a **scroll runway** below it (`main` has a tall bottom padding) so that an anchor near the end of the charter can still be brought up to the rail's height. Without it the levelling silently stops working for the last few sections.

## Folding sections (Ed, 79)

Every heading carries a **section-toggle** — a triangle, in the contents rail and again in the document's left gutter, in line with the anchor chips. The two are one control in two places: fold from either and both turn. A section owns everything from its heading down to the next one; the preamble above the first heading belongs to no section and never folds.

The triangle is **asymmetric by state** (Ed, 81): a folded section always shows its triangle, because it is the only handle on text you cannot see; an unfolded one hides it until you hover the heading. Thirteen permanent triangles down the contents rail read as chrome — a control the surface is nagging you to use — when folding is something a reader does occasionally and deliberately. Hiding the resting state leaves the rail as a list of section names, and the fold marks that remain are then informative rather than decorative: every triangle you can see is a section that is actually closed. It fades on opacity rather than `display`, so the row never twitches as it appears, and keyboard focus reveals it too.

Two places this had to be more than hiding text.

**A folded section must not hide work.** The queue keeps listing suggestions whose text is folded away, so it is possible to fold a section and then click something that lives inside it. Rather than have that click do nothing visible, the section **unfolds itself** before the document is measured — and for a multi-site patch, *every* section it touches unfolds, because the wire fans to all of them. The counterpart also holds: folding a section that contains the open card closes that card, since leaving it open would strand a judging surface with no visible text to judge.

**A folded section says what it is swallowing.** A folded heading that contains pending suggestions appends a quiet "*2 suggestions inside*". Without it, folding is a way to hide work from yourself — the queue would still be pointing at text you can no longer see, and the count is the cheapest honest signal that something is in there.

Fold state is deliberately *not* a judgment about anything: it is per-reader view state, invisible to everyone else and to the engine. Nothing about it enters the event log.

## The fixture (Ed, 82)

The mockup runs on a single `SUGGS` array where each queue item carries its own content, progress and state, and a `DOC` array of charter lines. It used to be five parallel literals kept in sync by hand, with two of the queue states painted on as fakes that could not be opened; consolidating them is what made a bigger example cheap rather than laborious.

It is hand-authored, not generated. `sim-harness` has no session-state exporter — it writes metrics CSVs — and even with one, the fixture holds marked-up diffs, in-character rationales and English meter captions that the engine has no opinion about. The sim would supply the skeleton and leave the flesh.

Current shape: **93 headings** (10 parts, 24 chapters, 59 sections), **147 paragraphs**, **13 queue items** — seven needing you, four still deciding, two sealed — including a saturated race, a judgment locked by a ground-shift, two freshness-highlighted paragraphs and a patch spanning three sites in two different parts.

**Heading levels.** A heading owns everything until the next heading of its own level or above, so sections form a tree rather than a list. Folding a part takes its chapters and their sections with it, in the document and in the contents rail alike; the "*N suggestions inside*" count on a folded heading reaches all the way down its branch, so folding Part IV reports the four suggestions living in its sections. Everything that indexes sections — fold state, wire targets, the patch's between-folding — walks the ancestor chain rather than assuming a flat sequence. The patch-folding gets a nice property out of this for free: folding between two sites two parts apart folds *the intervening part*, one line, rather than its thirteen descendants.

**Big races.** The card is still pairwise, because the mechanism is. What changes with six proposals instead of two is what the surface *says*: "6 proposals racing · you've judged 4 of the pairs you'll be asked for". A magnitude and a coverage — how big the argument is and how far through your share of it you are. Neither is a standing, so neither trips SPEC §8.3. The anchor chip carries the same count in the gutter, so the size of an argument is visible before you commit to opening it.

## A patch draws its sites together (Ed, 80)

Opening a multi-site patch folds the sections **between** its sites — never the ones holding a site — so the whole footprint arrives on one screen instead of at either end of a scroll. Letting go of the patch (opening something else, closing it, or judging it) unfolds them again. In the clubhouse charter that means § Money and § Offices come to sit either side of three folded headings, and the patch stops being a claim you have to take on trust from a ledger and becomes a thing you can look at.

The folds are tracked in a set of their own, apart from the reader's. A section the reader had already folded by hand is never adopted, so releasing the patch does not unfold it; and unfolding an auto-folded section by hand hands it back, so it is not restored later either. The reader's view state is theirs — the patch borrows what is left over.

Every fold change happens at the same moment in the open sequence: after the old card has collapsed, before anything is measured. That matters, because folding changes the height of the document exactly like a card does. Do it after the measurement and the wire lands somewhere else entirely.

Worth knowing what this does *not* fix: the open patch card is itself the bulk of the distance between the two sites (about 450px of the 825px gap in the clubhouse charter). Folding three sections recovers roughly 280px. Both sites do land on one screen, but it is the card, not the intervening charter, that sets the floor on how close they can get.

## Three steps, never overlapping (Ed, 75)

Opening one card while another closes was doing both in a single frame, and since a card's height is part of the document, the page lurched: the ground moved while the eye was travelling. The change is to **refuse to overlap** the three things that happen. The old card **collapses** out of the document (height, padding and margins to nothing, ~190ms); only then is the scroll measured and the document **moved**; only then does the new card **expand** (~230ms). Each step ends before the next begins, so nothing is ever re-laid-out underneath a scroll in progress.

Measuring the scroll in the gap between the two — old card gone, new card not yet in — is what makes the landing exact. Measure before the collapse and every anchor below the old card is at the wrong height; measure after the expand and you have already jumped. The card being opened also keeps its wire drawn for the whole sequence, so there is a line to follow while the document is moving rather than a page that slides and then explains itself.

The same collapse runs when you *judge* a card, which is the other way a card leaves the document — it shrinks out while its queue entry slides down into the still-deciding band, instead of vanishing and dropping the page. And a click that lands mid-transition supersedes the one in flight rather than being ignored: each sequence carries a token and every step stands down if a newer one has started, so the surface never feels stuck while an animation finishes.

## The verdict-pill: choosing, then committing (Ed, 88)

The verdict is no longer carried by two buttons inside the lanes. It is a single three-part **verdict-pill** below them — ⬆️ Option A · 🤷 Can't split them · ⬆️ Option B — with **Skip** and **Submit** on their own row underneath. The arrows point up at the lane each segment stands for; the shrug sits between them because that is where indifference belongs.

Three things this changes, beyond the shape.

**Indifference stops being a footnote.** It used to be an outline button in a row of leftovers, next to Skip, which read as *give up* rather than as a verdict. Given a third of the pill it is plainly one of the three things you can say, and it is the one the care map is built from (SPEC §3.2) — so a surface that made it look like a cop-out was quietly starving the record.

**Choosing and committing separate.** Every earlier version fired a judgment the instant you clicked a preference; there was no held state, so no way to weigh A against B with your choice provisionally made. Submit stays disabled until a segment is chosen, and choosing updates the pill in place without re-rendering, so the document does not move under a reader who is still deciding.

**The lanes are now purely evidential.** With the ledgers above and the verdict below, a lane holds nothing but a label and a text. There is no longer anything to click inside either candidate, which removes the last way the layout could favour one — no button placement, no visual weight, nothing but the two texts side by side.

Reopening a still-deciding card shows the pill as you left it, so revising a judgment (decision 50) is a matter of moving the selection and submitting again rather than remembering what you said.

*Noted, not fixed: the ⬆️ emoji carries its own blue tile, which sits a little muddily on the selected blue segment. Legible in both states, but a text arrow that inherited the segment's colour would be cleaner if the pill survives to visual design.*

## What approval means (and why there's no owner)

The approve button is the familiar gesture with a different engine behind it: it records a pairwise judgment (proposal vs current text) rather than an owner's acceptance. A suggestion lands when its win-probability clears the session's rising bar with enough distinct judges — the threshold-plus-floor is what replaces the document owner. For an easy typo early in the session, that's a handful of quiet approvals; nobody sees machinery.

## Progression: the evidence meter (Ed, 2026-08-14)

Every suggestion carries a thin **evidence meter** — how close it is to being decided (adopted *or* retired), never which way it leans. This is the spec's own "closeness-to-resolution as a single number" (§8.3), the one race statistic that is public by design because a scalar magnitude can't leak direction. The captions speak in what's missing, not who's ahead: "needs 2 more voices to reach its floor", "a few good judgments from decided", "new — evidence just starting". A saturated race's meter goes grey and its caption sends it to the bounty board: more judgments won't move it; only a new proposal can.

And the queue order **is** this number, weighted by your personal leverage — races near their floor that *you* haven't judged rank highest, because your judgment moves them most (the router's unheard boost). The meter is the queue's visible rationale: sort order stops being mysterious the moment each entry shows why it's worth your attention.

## One rail, three states (Ed, 51)

The queue rail (on the right since 61) is a single list with no dividers — colour is the grammar. White cards with a pale blue wash **need you**. Once judged they slide down into the **still deciding** band: wash still filling (your judgment moved the race but didn't close it), your verdict shown, and — decision 50 — **clickable to change your mind**, because a judgment is a living opinion while its question lives. When a race resolves it turns **sealed**: green, full, locked, inert. A judgment also locks when the ground shifts under it — the Garden entry demonstrates: your verdict became a fact about text that no longer exists, and new pairs will be served fresh (SPEC §4.4).

## When the ground moves under you (Ed, point 3; revised 63)

The document can change after you've cleared your queue. The banner that used to announce this is **gone** — a modal-ish strip at the top of the page made an ambient fact into an interruption, and it announced changes in the wrong place: at the top of the document rather than at the paragraph that moved. In its place, a paragraph adopted since you last looked simply **lights up purple and cools back down** over a few minutes — the **freshness-highlight**. You catch it if you're there, the way you'd catch a colleague's cursor moving in a shared doc; if you're not, the document doesn't nag you about it later.

What survives the fade is the small purple chip in the gutter (kept, Ed 68 — its own treatment left for a later pass), because it is the only doorway to the "what changed here" card — what changed, at what confidence, with "Fine by me" or "Propose a change" as the recourse. Fading the chip too would make the change genuinely undiscoverable to anyone who stepped out, which is the job the banner used to do badly; leaving it is the cheapest way to keep that path open without shouting. The **⟳ flags** on judged queue entries whose text has since changed again are unaffected.

The colour grammar after this pass (Ed, 67): **yellow** is the in-document mark — this text is under challenge; **pink** is the card where it gets argued; the left rule still names the kind (green singleton, yellow race, blue patch); **purple** stays reserved for changed-since-you-looked. Splitting yellow from pink means the document and the cards can no longer be confused for one another, which matters more now that a quick card and a race card are the same object.

*In the mockup the fade runs in 75 seconds so it can be watched in one sitting — the `--fresh-fade` token at the top of the stylesheet is the single place that changes. Reload to replay it.*

## Chips in the gutter, gaps in the text (Ed, 64 and 65)

Anchor chips have moved out of the text and into a **chip-gutter** down the left margin. Floating right, they interrupted the ragged edge of the paragraph and read as part of the sentence; stacked in the margin they read as marginalia, which is what they are — and a paragraph carrying two of them (§ Money, in both a race and a rename) now shows both without either shoving the other around. The prose column is left unbroken, which is the whole premise of the surface: it should be a document you can read.

The **insert-anchor** is three lines deep rather than a hairline rule. A proposed new section is the one suggestion that has no text of its own to attach to, and giving it a hairline made it read as a divider between existing sections rather than as an absence. At three lines it is a **held-open gap** — the document visibly makes room for something that isn't there yet, which is both more honest about what is being proposed and much harder to scroll past.

## Elevation (Ed, 90)

Three planes, on Bootstrap's own shadow ladder. The **document is the ground** and carries no shadow at all — it is the thing everything else is about, and giving it a lift would put the charter on the same footing as the machinery. **Queue cards** rest just above it on `--shadow-sm`, and gain `--shadow-md` on hover, so the rail reads as a stack of things you can pick up. The **open decision card** floats highest on `--shadow-lg`, which is what you want from a surface that has interrupted the document to ask you something.

The shadows are **neutral, not tinted**. The previous ones were coloured to match each card's border, which read as a glow — an emphasis effect — rather than as height. The border already says what kind of card this is; the shadow only has to say how far off the page it sits, and a grey shadow says that more honestly than a pink one.

Nothing inside a card is elevated: ledgers, lanes and the verdict-pill are all flat. A card should read as one object that has risen off the page, not as a tray of smaller objects each at its own height.

## What is deliberately absent

- **No authors, no counts, no standings.** Rationales are unsigned; nothing shows how many approvals a suggestion has or which way they lean. (The anchor chips name the *kind* of attention needed, never the direction of evidence.)
- **No red-pen clutter by default.** Suggestions are anchors until opened; the document stays a document, not a battlefield diagram.
- **Nothing underneath the view** (Ed, 76). The three columns are the whole page; there is no footer, no notes, no second region to scroll into. What lies below the last line of the charter is empty scroll runway, not content.
