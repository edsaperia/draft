# Design notes — the session view (default surface), second pass

Desktop-first · light mode · Bootstrap-plain (visual design deferred) · content from run clubhouse-1 · the race-card mockup is this surface's escalation state.

These notes used to live at the bottom of `design/session-view.html`. They were moved out on 2026-08-15 (Ed, 76): nothing sits underneath the three-column view any more. The mockup is the artefact; this is its reasoning.

**How to read this.** The sections run roughly in the order the decisions were taken, each headed with Ed's number for the instruction that prompted it, so an argument can be traced back to the moment it was had. Where a later pass overturned an earlier one the earlier section says so and points forward — nothing is deleted, because the reasoning that was rejected is usually the reasoning you need when the question comes round again. **The design system below is the current state**; everything after it is how it got there.

## The design system (housekeeping pass, 2026-08-16)

The stylesheet is tokenised. Anything hard-coded outside this list is a mistake rather than a decision.

**Colour.** Ink and ground: `--bg --fg --muted --border --light`. One accent, `--primary` and its hover/subtle/emphasis, used for every open card, every wire, and every selection (Ed, 198). One success, `--ok` and its hover/subtle, meaning *decided* and nothing else — the winning text in a record, and the tick that commits.

**Lifecycle** is its own four-part palette, held as raw RGB channels because the wash varies its strength: `--lc-urgent` (🔥 orange), `--lc-open` (💡 ❌ yellow), `--lc-deciding` (⏳ blue), `--lc-closed` (✅ ❎ 🔄 ☑️ grey). One rule governs it — **colour means you can still affect it; grey means the door is shut** (Ed, 164) — and it is applied identically in three places: the queue card's wash, the paragraph's wash in the document, and the mark in the gutter.

**Type** is five sizes and a caption: `--t-lead` (the document's title), `--t-body` (a clause under judgment), `--t-ui` (card and rail titles, buttons, the rationale), `--t-small` (one-line entries, footnotes), `--t-cap` (captions and footers), `--t-micro` (eyebrow labels only). The `.eyebrow` class carries the one upper-case label treatment, so the six or seven places that use it cannot drift apart.

**Spacing** is a 4px grid, `--s1` to `--s5`, with three radii — `--r-sm` for an anchor or a chip, `--r-md` for a rail card or a button, `--r-lg` for the document and an open decision card. **Elevation** is Bootstrap's own three-step ladder, neutral rather than tinted: the document is the ground, rail cards rest just above it, an open decision card floats highest.

**Layout** constants live as tokens too — `--rail-left`, `--rail-right`, `--nav-h` — because three separate rules were independently asserting the same widths and the sticky offsets had to agree with them.

**Motion.** There is almost none, and that is deliberate rather than accidental: the queue's pulse went at 172 and the freshness fade at 203. What is left is the card open/close sequence, the rail's slide-in for a newly judged entry, and hover transitions. Everything animated has a `prefers-reduced-motion` escape.

## Suggestion-mode with escalation

This is the surface a member lives in: **the current document, readable top to bottom**, with pending suggestions anchored where they bite. Text under challenge carries a wash in its own lifecycle colour, and a mark in the gutter says what is being asked of you. The machinery stays invisible until the document's conflict density summons it.

*(As first built, the wash was always yellow and a left rule named the kind — green singleton, yellow race, blue patch. Kind left the rails at 184 and 199, and the rule went with it at 200; the wash now says lifecycle instead.)*

## Three rails: contents, document, session (Ed, 61)

The document sits in the middle with a rail either side, and the two rails answer different questions. On the left the **contents-rail** — the charter's own headings, generated from the document, following the reader as they scroll — answers *where am I in this text*. On the right the **needs-you queue** answers *what wants me*. Putting the reading aid on the left and the work list on the right matches how the two get used: the contents is a map you glance at, the queue is a pile you work through, and neither should be mistaken for the other. A proposed new section is deliberately **absent** from the contents until it's adopted — the rail is a picture of the charter as it stands, not as it might become; the proposal is discoverable in the document itself, as a held-open gap.

## One geometry for suggestions and races (Ed, 62 and 66)

A quick suggestion uses the race card's shape exactly: the paragraph **highlighted yellow in the document**, a **wide pink-bordered box** below it, and **two lanes — Option A and Option B**. The only difference from a race is what sits in Option A: on a race both lanes are challengers, and on a quick card **Option A is the current text**. Everything else — the labels, the geometry, the gesture — is the same, so escalation to a race stops being a re-layout and becomes a substitution: a rival proposal moves in, the incumbent moves out, and the member's hands already know where to go.

This also removed a duplicate control rather than adding one. Choosing A on a quick card *is* keeping the current text, so the separate Keep button went with it. The card is now a literal picture of the judgment the engine records — one lane per thing being compared — where the previous pass showed the incumbent as scenery in a band above and then asked for a verdict on a single lane. The two cards used to say so in a prompt line — a race asking *if this text changes, which change is better*, a quick card asking *which should stand here, the text as it is or the change* — because on a quick card keep-current is genuinely on the table where SPEC §8.3 forbids it on rival cards. Those prompts are gone (95); what carries the distinction now is the lane labels, and on a race nothing states it at all — Ed's call, 2026-08-16: "they don't have to learn the rules on every card every time." The pill enforces §8.3 whether or not the card explains it.

The card also carries **indifference** (Ed, 69): "genuinely can't split them", the same control a race offers. It matters more here than there. On a rival card, indifference is between two challengers; on a quick card one side *is* the incumbent, and incumbent-involving indifference is precisely the signal SPEC §3.2 feeds the care map (Q13). This is the card that generates that data, so this is the card that must be able to record it.

## The patch card is the same object too (Ed, 85)

All three cards now have one shape: a bordered box and two lanes, with the charter as it stands on the left and the change on the right. A patch differs only in what fills a lane — every site, rather than one — because the judgment is single and so each lane has to carry the whole of its side of it. Option A shows all three places as they read now; Option B shows the same three places with the change marked in; choosing A is keep-current, exactly as on a quick card.

The patch also inherits **indifference**, which it lacked before: a patch is incumbent-versus-challenger like a quick card, so incumbent-involving indifference is available here too and feeds the care map the same way (SPEC §3.2).

This also finished the colour job left over from 67 — the patch card was the last one still bordered blue while the other two had gone pink. Blue now survives only on the anchor rule and the still-deciding wash, where it means *kind*, not *card*.

## Above the lanes: the rationale, and nothing else (Ed, 86–87; ledger removed, 93)

Passes 86 and 87 built a **ledger** above the lanes: a drop/add list summarising what each proposal did, with the rationale folded in underneath. It is gone. Nothing in the mechanism produces such a thing — SPEC §2.6 gives a candidate a patch, a footprint, an author, a stake and *one pinned rationale*, and §3.4 is explicit that the rationale is the whole of what anyone says about a proposal. The ledger was a fabrication of the mockup: plausible-looking data with no source, which would have had to be invented by an author at submission time (a form nobody has agreed to) or by an LLM at read time (a summariser nobody has specced). Either would be a real product decision, and the mockup was quietly assuming it had been taken.

Worth recording what it was good at, because if we ever do spec a source it is the case for building one. Two proposals of four or five lines are hard to hold in the head at once; two three-item summaries could be read across in a second, with the full texts below as confirmation rather than comprehension. And the `drop`/`add` pairing forced an author to name what was being given up, not only what was being gained — a rewrite whose summary was all `add` was visibly hiding something. That pressure is not available from a rationale, which is free prose and can simply decline to mention the loss.

**What survives is the placement.** The rationale still sits above the lanes — one on a quick card and a patch, two side by side on a race, column-aligned with the lane each belongs to. That was Ed's 87 and it holds without the ledger: you ask what a proposal is *for* before you read it closely, and a reason sitting underneath the text meant reading cold and being told afterwards what you should have been looking for. The card divides in half — argument above, the text being judged below — and the lanes are identical in structure, a label and a piece of prose, so nothing about their shape can suggest a favourite.

The card is shorter for it, and it now shows only things the engine can actually hand it.

## The lanes show the result, not the redline (Ed, 91)

Quick and patch lanes used to carry a full redline — struck-through words in red beside their replacements in green. They now show the text **as it would stand**, with only the new wording lit. Nothing is struck through anywhere on a decision card.

The redline was answering a question the card had already answered. Option A is the current text, in full, one column to the left — every word the change would remove is right there, in its own context, on the same screen. Restating the loss a second time, interleaved with the winning text, bought nothing and cost the thing that matters most on this card: **Option B stopped being readable as prose**. You cannot judge a sentence you have to mentally un-strike as you read it, and the two lanes were no longer like for like — A a clean paragraph, B a marked-up one — which is exactly the asymmetry the last three passes were spent removing.

It also brings the three cards into line. A race lane was never redlined (both sides are whole alternatives, so there is no baseline to mark against), so the redline was a quick-and-patch peculiarity rather than a grammar. Now every lane on every card reads the same way: a label and a piece of prose you could put in the charter unchanged.

The **fixture keeps the full diff**; `resultOnly` in session-view.html:847 strips the `<del>` runs and tidies the whitespace they leave behind at render time. That is deliberate — the diff is the truth about a suggestion, and other surfaces still want both sides. The change card ("what changed here", the doorway from a `freshness-highlight`) is one of them and is untouched: it is a *record* of an edit already made, not a choice between two texts, so seeing what went is the whole point of it (Q92 asks whether Ed agrees).

Green now carries one meaning in the series — **new wording** — and red none. A proposed new section is therefore entirely green, which is correct: all of it is new.

## Stripping the card back to the judgment (Ed, 95)

Four things came off the decision cards, and one moved. Gone: the **title bar** (*Race · § Quorum*, *One suggestion · 3 places*) and its subtitle (*escalated: two proposals collide here*); the **instruction line** (*Should this section stand in the charter, or should the charter stay as it is?*); the **labels** on the rationales (*Why · unsigned*, *Why · Option A*); and the **box** the rationale sat in. Moved: the **evidence-meter**, from directly under the title to the foot of the card, below Submit, with its captions.

The common thread is that a card opened *in place* under the paragraph it argues about doesn't need to introduce itself. The title said what the queue card already said and what the yellow wash in the document already showed. The instruction line explained a layout that had, over passes 85–88, become self-explaining: two labelled lanes and a three-way pill, with Option A subtitled *the current text*. Prose that describes a control the reader is looking at is usually a sign the control isn't finished; here it was left over from when it wasn't.

**The meter's move is the substantive one.** At the top it read as a status header — the first thing you met, before you'd seen what was being argued, and it invited the reading it must never have (*how is this going?*). At the foot it arrives after you've formed a view, where it answers a different and legitimate question: how much more evidence does this want, and how much of it is mine to supply. A hairline rule separates it from the Submit row so it reads as a note on the card rather than another control. Its captions are unchanged — the closeness magnitude, the never-which-way-it-leans disclaimer, and, on a race, the count and your coverage.

Two consequences worth naming. First, the card's whole visible top is now the **argument** — the rationales — which is the right first thing to meet. Second, a race no longer states anywhere that keep-current is off the table; the conditional prompt was the only place SPEC §8.3's rival-card rule was ever said out loud. Ed ruled that acceptable (2026-08-16) — a card teaches the rules once, not every time — so the constraint now lives only in what the pill offers. Note this makes SPEC §8.3's clause "the rival card's prompt states the conditional framing plainly" false of this surface; the spec sentence should lose that half when it is next amended.

**The rationale lost its frame.** No border, no fill, no label: on a quick card and a patch it is simply a paragraph above the lanes, and on a race the two sit side by side divided by a hairline down the middle of the gutter, column-aligned with the lanes below so each rationale is plainly above its own text. The column is enough to say whose it is — a labelled box was two devices doing one job — and the divider does the separating the two boxes used to do, at a fraction of the ink.

**But it is not a caption** (Ed, 119). The first pass at the unframed version set it in light grey italics, which is the typography of an aside, and this is the opposite of an aside: it is the *only* thing anyone gets to say about a proposal (SPEC §3.4 — to argue is to draft). It now takes the weight and colour of a queue card's title — 14px, semibold, full-strength text — against the lanes' 15px regular. The card reads as a standfirst over two bodies of text: the short strong claim about what this is for, then the two things you are actually choosing between. Grey italics were saying "skip this if you like", which is exactly wrong on the one line of human argument the mechanism allows.

## Non-local edits: inline is about discovery, not representation (Ed, point 50)

A rename that touches the whole document cannot *be* a local suggestion — but it can be **locally discoverable everywhere it touches**. A multi-site patch gets an anchor at every site; opening any anchor opens the *same single card* — one judgment object, with the author's rationale up top and every site's change below — and while it's open, its sibling anchors light up (dashed outline), so the patch's whole footprint is visible on the page. One suggestion, many doorways, one verdict. The queue lists it once. If a patch is too scattered even for this, the rationale carries the load and the sites become its receipts — and truly document-scale rewrites are arguably not suggestions at all but successor documents, which is a different ceremony.

## Escalation in place

When a span has rival proposals, its anchor is yellow and its inline card is the race: both candidates side by side, and the question is conditional — *if* this text changes, which change is better (SPEC §8.3: no keep-current on rival cards, and rival cards only get served once at least one challenger plausibly displaces the incumbent). The full race-card view (queue of races, comparison modes, discontinuous patches) is one level deeper — this surface embeds the compact version so easy sessions never leave the page.

## The rail became a margin (Ed, 104–108)

The `needs-you-queue` no longer ranks anything. Every entry stands **beside the clause it argues about**, in the charter's own order, and the rail is as tall as the document so it travels with the page rather than sticking to the viewport (107). Urgency — how much a thing wants *you* — moved out of position and into the card's own appearance.

The argument for it is stronger than tidiness. **A ranked list makes a claim**, and this one shouldn't. Everything else on this surface is careful to show magnitude without direction, and then the rail quietly asserted that one argument mattered more than another by putting it first. Document order asserts nothing. It also makes the left and right rails two indexes of one spine — `contents-rail` for structure, this for contested points — and it makes true a thing the notes had only claimed: that working the rail and reading the charter top to bottom are the same sequence.

Three things fell out for free. **The wires stopped crossing** — queue order and document order used to be unrelated, so the runs tangled; now they are flat by construction, and the whole apparatus for scrolling until a wire came out level (74) is gone, replaced by a much smaller `bringIntoView` that only moves the page when the clause you just picked is off-screen. **The order stopped moving** under other people's judgments, because document position doesn't change when someone votes. And the collision rule gave the open card a natural privilege: it holds its exact line and everything else gives way around it, which is what makes its wire read flat.

What it costs is real and worth writing down: SPEC §8.1's whole point is that scarce judgment lands at decision margins, and a document-ordered rail doesn't steer anyone there. Two things make that survivable at v1 scale. A rail of sixteen entries is scanned, not consumed top-down — ordering is a weak signal at this size. And urgency still has to pull the eye; if it doesn't, the loss is real. At 200 open suggestions this would be a filing system rather than a feed.

**Urgency is colour strength, and admission** (104, 105; revised 2026-08-16). Colour saturation carries how much an entry wants you — a wash of the primary from 5% to 30% alpha. It used to carry a second signal as well: the amount of card drawn fell with it, so **hot** kept its caption, **warm** dropped it, and **cool** was a single line. That compression ladder is gone — see *Fewer cards, each saying its whole piece* below — and urgency now decides which questions are on the screen instead of how much each is allowed to say.

The first build of this made the tint a flat fill and so quietly deleted the **progress wash** — the left-to-right gradient that had always shown closeness to resolution across the whole rail. That was a loss I introduced without flagging it (Ed caught it, 116). It is back, and the two magnitudes now share one device rather than competing for two: **how far the fill reaches** is closeness, **how strong the colour is** is urgency. A deadlocked race still washes grey rather than blue, so *more judgment won't move this* stays visible as its own thing (SPEC §8.3). Worth watching whether one device carrying two numbers reads cleanly; the fallback is a separate hairline `evidence-meter` on each card, at the cost of more ink.

**The most urgent card never leaves** (Ed, 115). Whatever wants you most is exempt from the fit cap and holds its place however crowded the rail gets. This is the one place the rail asserts a ranking — but it asserts it about a *single* card, by drawing attention rather than by reordering, so document order survives intact. It is also what keeps 110's fit cap honest for someone who has been away: whatever else is crowded out, the thing that most wants them is on the screen.

**It used to breathe, and no longer does** (Ed, 172). A slow pulse of the wash was how it announced itself when colour meant urgency and every card was the same blue — the only way to find one card among twelve without reading. Once it acquired its own glyph (🔥) and its own hue (orange), that was a third device saying what two already said, and the weakest of the three: motion is the most expensive way to say a thing, it cannot be seen in a screenshot or a printout, and it is the first thing an accessibility setting removes. Two static signals that everyone gets beat three where one is conditional.

A pleasant side effect: **the rail now has no motion in it at all**, so the reduced-motion path and the ordinary path are the same page. The only animation left on the surface is the `freshness-highlight` cooling in the document, which is a genuine change-over-time rather than an emphasis. Ed's read is that colour-as-meaning is temporary and symbols will eventually do this work; saturation is what we use for now. The word used to collide with the mechanism's own — a race that the spec called *saturated* (§8.3, more judgments won't move it) being a different thing entirely — and Ed settled that on 2026-08-16 by renaming the mechanism's sense to **deadlocked**, which is also the plainer word for what it describes. Saturation now means colour and nothing else. A deadlocked race still reads as one of the least urgent entries on the rail, which is right: it has left the judgment stream for the bounty board.

Urgency is **not** closeness. The meter still carries closeness-to-resolution; urgency is your leverage — unheard on a race near its floor, in the hot set, one judgment from decided. A race at 88% may not want you at all. Two magnitudes, two channels.

**Judged entries shrink, sealed ones become dots** (106). Still-deciding is one grey line — label, your verdict, and a ⟳ if the ground moved under it, with the whole story in the tooltip — still clickable to change your mind. Sealed is a **green dot**, and dots whose clauses fall near each other in the charter share a row rather than each taking a line, so a section that has been fully argued out reads as a little run of full stops in the margin. Clicking one opens what was decided. This answers the old objection to keeping sealed items in a feed: they are no longer in a feed, they are in a map, and a map should show settled ground.

**A patch appears at every site it touches** (108). One judgment, several entries — each beside its own clause, each drawn with a dashed border and labelled *2 of 3 places*. Clicking any one activates all of them, opens the single decision card, and strings the entries together on a spine down the gutter, with each entry's own wire running on into the document. The footprint stops being a claim in a caption and becomes a shape you can see. It is the same job the dashed sibling outlines do from inside the open card, arriving from the other end.

## Work does not scroll away (Ed, 110)

The margin as first built had an honest flaw: if the work is on page twelve and you are reading page three, the rail beside you is empty. So the column now carries two populations with different physics.

**Pinned** — everything that still needs you. An entry takes its clause's own line while that clause is on screen, and once the clause leaves, the card holds at the edge it left by. Cards above you pile against the top of the band, cards below against the bottom, and the whole set stays in document order throughout. Scroll to the end of the charter and every entry is stacked at the top; scroll to the start and they are all at the bottom, waiting. What you always have is a contiguous run of the charter's open questions, positioned as close to true as the screen allows.

**Flow** — judged lines and sealed dots. These stay with their clauses and scroll away, because they are a map of settled ground rather than work. A flow entry that a pinned card would sit on top of **steps around it** rather than hiding (Ed, 112): to the nearer edge of the pinned block, above or below. It gives up only when the pinned pile leaves it nowhere within reach, which is exactly the case Ed named — when active work has genuinely crowded the rail out. The first build hid them, on the reasoning that nudging makes the rail crawl as you scroll; that was the wrong trade. People want to know what was decided, and a dot that moves is better than a dot that vanishes. Flow keeps its CSS transition so the stepping-aside reads as movement rather than a jump.

**When it doesn't fit**, the rail keeps the most urgent entries and counts the rest — *+N further off in the charter*, pinned at the foot of the band. Nothing is ever dropped silently.

This was nearest-your-reading-position first until 2026-08-16, chosen so the visible set was one unbroken run of the charter rather than an assortment of whichever cards happened to be small. See *Fewer cards, each saying its whole piece* below for why it changed.

**Clicking an entry has to move two things** (Ed, 118). Pinning the rail broke the old promise from 74 that clicking a queue card brings its wire flat, in three separate ways, and all three needed fixing.

First, `wireTargets` only ever looked for *chips*, and a settled clause carries its judgment id on the paragraph with no chip at all — so sealed decisions had no targets, and clicking their dots moved the page not at all. It now unions chips, paragraphs and insert gaps.

Second, the scroll aimed for the middle of the screen, which put most of a tall decision card below the fold. It now aims for a read line near the top, with a narrow accept band so a clause already up there isn't nudged for nothing.

Third and most of the work: **an entry's final position depends on the pile above it**. Scroll to a clause late in the charter and every earlier entry clamps against the top of the band — six or eight of them, four or five hundred pixels — so the open entry sits far below the clause it points at. Levelling that means scrolling until entry and clause meet, which is the old `levelWire` problem back again in a new form, so it has the old guards: at most two passes, stop as soon as a pass stops improving, and **refuse outright if levelling would push the clause past half the screen**, because then the card has nowhere to unroll. When it refuses, the wire runs at an angle and that is the honest picture.

One thing had to change to make any of this work: the levelling happens *before* the card is inserted (Ed's 75 — close, move, open), so the entry has to already be in its final population by then. `pendingId` therefore counts as open for layout purposes; otherwise a sealed dot would be measured as flow, levelled to that position, and then jump when opening moved it into the pinned pile. Measured after the fix: quick, race, patch, insert, still-deciding and sealed all land within 3px of flat, with the whole card on screen.

**The band still wins.** The open entry gets first claim on its clause's line — its wire is the one that has to read flat — but if the pile can't fit around it, the band takes priority and the wire runs at an angle. That is a real cost and it shows up most on an open patch: the decision card is inserted at the first site and is tall, which pushes the second and third sites hundreds of pixels down the document, and their entries cannot follow them and stay on screen. The spine still cables the three together and each wire still points at its own site, but only the topmost is level (Q111).

Everything here is measured against the viewport, so the margin is re-laid on every scroll rather than only on structural change, and pinned entries carry no CSS transition — a card that eases toward its new position lags visibly behind a scroll.

## Fewer cards, each saying its whole piece (Ed, 2026-08-16)

Ed's first instruction was to stop pinning the cards that showed no rationale at all — the bottom rung of the compression ladder, where a card was a title and nothing else. He then replaced it with the better version: *more text on active queue cards rather than more cards on screen, and let urgency decide which ones to show — so we see fewer and more urgent ones, and as they're dealt with the less urgent ones surface, rather than cut off at a certain level of urgency.*

The second is better than the first for a reason worth keeping. Not pinning the coolest cards is a **threshold**: it draws a line on the urgency scale and everything below it loses its claim on the screen permanently, however empty the rail happens to be. What Ed asked for instead is a **ranking**, which never says *no* to anything — it says *not yet*, and the rail's own capacity decides how far down the order today's answer reaches. Judge the top of the queue and the next questions arrive behind them.

Three things follow.

**The compression ladder is gone.** It existed to fit more cards into the band, which is exactly the trade Ed has now reversed. Every open card gets four lines of rationale, five on the 🔥 card, plus its place count and its caption. The old ladder had the perverse property that the cards you were least likely to open were the ones told to explain themselves least — so the only way to find out what a quiet question was about was to open it, which is precisely the cost the rail exists to save. The `hot`/`warm`/`cool` classes went with it; what is left is `needs`, `wants` (deadlocked), `deciding` and `unread`, which are states rather than volumes.

**Urgency stops being a second visual channel and becomes the gate.** It still tints the wash, but its real work is now admission. That makes the *number* matter much more than it did — a wrong urgency used to cost a shade of colour and now costs a member sight of a question — which is recorded against 98, still open, on where a race's single urgency figure should come from.

**Two exemptions survive the ranking**, and one is new. The 🔥 card is still exempt from the fit cap (115). And whatever is **open** is now force-kept too: under nearest-first it was safe by construction, since the page had just scrolled to it, but under a ranking you can perfectly well open something far down the order and the rail would drop the entry out from under its own wire.

One judgment call inside this, worth flagging rather than burying: **an unread decision has no urgency of its own** — it is a notification, not a question — so it is ranked at the middle of the scale, 0.5. Ranking them top would let a member returning after two sessions have their rail filled with things that are already decided; ranking them bottom would quietly undo 114's promise that an unread decision stays put until acknowledged. The middle is a guess, and a one-line change if Ed wants it elsewhere.

The visible cost: the shown set is no longer a contiguous run of the charter, so cards can stand beside clauses that are pages apart, and more of them pile at the band edges with their clauses off screen. That is the trade being made on purpose — the rail is now answering *what most wants you* rather than *what is near you*.

## Everything opens, and decisions are read or unread (Ed, 112)

**Every entry in the rail opens a decision card**, sealed dots included. A locked judgment can't be changed, but it can always be read — and the reason to read one is not the verdict, it's the two texts. What did we not adopt? A record that only names the winner teaches nothing; the loser is half the information.

**A record is not symmetrical** (Ed, 120). The first version of the sealed card reused the live geometry exactly — two equal lanes, winner tinted green. That was wrong twice over. A live card is symmetrical *on purpose*: nothing about the layout may suggest a favourite. A record is the opposite — the favourite is the entire fact. And two lanes cannot hold a real race anyway: § The Guest Bedroom — claims had five proposals, and showing two of them would have been a sample presented as a record.

**And the field can simply be ranked** (Ed, 121). The `ranking-model` is Bradley–Terry, which carries a strength for every candidate in the race, so a total order and a win probability for each falls straight out of what the engine already computed. There is no new machinery here, only a decision to show it. Nothing about it fights SPEC §8.3's no-standings rule either: that rule governs **live** feeds and sort tabs, where knowing who is ahead would make judging strategic. Once a race is sealed, judgments are locked and nothing can be influenced — and the `record-builder` publishes rankings at close anyway, so this is the same information arriving a little earlier (Q122).

So a sealed card is now a ranked list, every proposal **full width, in order, the adopted one first**, each carrying **its own probability against the current text** and whether that cleared the bar. § The Guest Bedroom — claims reads 0.86 (cleared the bar of 0.72), then 0.58, 0.49, 0.35, 0.21. That single column of numbers is the most informative thing on the card: it says not only what won but *by how far*, and that four quite different theories of the problem were all some way from carrying. § Nomination reads 0.52 and 0.29 against a bar of 0.74 — the whole field short, which is why the incumbent held.

The **incumbent is not in the ranking**. It was never proposed; it is what everything else was measured against, so it gets its own block — above the field as *the charter as it stands · nothing displaced it* where it held, and below the field as *the text it replaced* where a challenger carried. Without that split the card printed "the current text: not adopted", which is nonsense, and counted the incumbent as one of the proposals. It is not struck through: 91 took strikethrough out of the series and a record is not the place to bring it back.

Nothing is thrown away — the losing four are exactly what SPEC §6.1's graveyard exists to preserve, so nobody redrafts a proposal the house has already turned down. Below the field sits the **record**: the win probability it reached, the bar it had to clear *at the time*, how many distinct judges moved it, and what you yourself did (including "you never judged this", which is the honest thing to say and the thing a queue usually hides). The bar matters because the adoption-threshold rises through the session (SPEC §2), so a judgment that cleared 0.66 early is not a weaker judgment than one that cleared 0.74 late — it is a judgment against a different bar, and the record has to say which.

A race can seal with **no winner at all**: § Nomination retired at p=0.52 against a bar of 0.74, so neither challenger stood and the charter kept the text it had. The incumbent block then leads the card and says in as many words that nothing cleared the bar, because "retired" on its own reads like a verdict against the proposals rather than what it is — and with the field ranked underneath, the two numbers make the point without needing the sentence at all.

The same card opens from the document side too: a settled paragraph carries its *judged ✓* chip and is clickable, so the two indexes stay symmetrical.

**Read and unread.** A decision you have not acknowledged is **unread**: it takes a single line in the changed-since-you-looked purple, and it *pins itself to the screen* until you deal with it. Reading it is not enough — you can open the record, study it, close it again, and it is still unread (Ed, 114). What clears it is the **OK, I've seen this** button on the card, after which it settles into a green dot at its own clause and joins the flow. That is deliberately a higher bar than the `freshness-highlight`, which fades whether or not anyone looked: a decision is a thing the house did to the document, and "I opened a card" is weak evidence that anyone took it in. It is the same gesture as the change card's *Fine by me*, and the two should probably converge. That is the same promise the `freshness-highlight` makes in the document — a change you were not there for will find you once — but where the highlight is ambient and fades whether or not you saw it, an unread decision waits. The two mechanisms cover the two failure modes: the highlight catches you if you are there, the unread pin catches you if you weren't.

It is also the first thing on this surface that is genuinely *about you* rather than about the document. Everything else in the rail is the same for everybody; read state is per-member, and it is the reason two people can look at the same charter and see a different margin.

## The rationale is the comment (Ed, 123)

The rail now quotes each suggestion's **rationale**, clamped to a line or two. That is a small change with a large framing consequence: it makes the margin read like the margin of any other editor, where an entry beside a paragraph is *somebody saying something about that paragraph*. Until now the entries carried only bookkeeping — a section name, a kind chip, a closeness caption — which is a queue wearing a margin's clothes. The rationale is the only human speech the mechanism permits (SPEC §3.4), so it is the obvious and probably the only thing that belongs there.

It also finishes what 119 started at the other end. Having promoted the rationale to title weight on the card, leaving it invisible in the rail was inconsistent about how much the sentence matters.

**Clamped by tier**, so it rides the compression ladder from 104 rather than fighting it: **five lines on the 🔥 card**, two on a hot one, one on a warm one, none on a cold one.

The 🔥 exception (Ed, 214) follows from what the flame is for. Ed's own argument for it was that you never have to think about prioritisation — *just always do that one* — and a card you are meant to act on without deliberating is the one card whose argument should be complete rather than cut off mid-sentence. Five lines holds every rationale in the fixture whole. It is also the only entry that can afford the room: exempt from the fit cap already, it costs the rail nothing that the rail was not already spending on it. Urgency therefore governs how much of somebody's argument you are shown, which is the right coupling — a cold entry is one you are being told not to worry about, and half a sentence of argument would be an invitation to worry.

**A race gets one per proposal, stacked with a hairline between** (Ed's suggestion, and it is right). Stacked rather than columned: the rail is 290px, which will not carry two readable columns of prose, and the hairline does the same work the divider does between the two rationales on the open card — the same device at two scales. The pair shown is the pair you would be served, so the rail is quoting the actual next question rather than sampling the field.

**A patch quotes itself at every site** (Ed, 183). The first build quoted only the topmost, on the reasoning that the same comment three times down the margin is noise — but that was true only while all three entries were also *titled* the same. Now that each is titled by its own section (below), each reads as a comment standing beside that clause rather than as a repeat of the one above, and the sites are far enough apart in the charter that you rarely see two at once. It also makes the three siblings the same height again, which the earlier version had broken.

**What it costs: fewer entries fit.** A hot card grew from ~76px to ~117px, a race with two teasers to ~164px, so 110's fit cap bites much sooner — on an 800px window, seven or eight of twelve rather than all twelve, with the rest counted in the overflow. That is the first time the overflow rule has actually fired outside a contrived test, and it works, but it is a real trade: the rail now says more about fewer things. Whether that is the right side of the trade is Q124.

## Lifecycle marks (Ed, 147–157)

Every rail entry now carries a glyph at its top left saying where it stands in **your** relationship to it — not what kind of judgment it is, which stays a word beside it. Two marks, two axes.

💡 a proposal, and it wants your judgment · 🔥 the one that wants you most · ⏳ you've judged, the race runs on · 🔄 the ground moved and this one comes back rebuilt · ✅ decided and the charter changed · ❎ decided and the incumbent held · ☑️ decided and filed.

**A decision says which way it went** (Ed, 160), not merely that it happened. ✅ and ❎ are a matched pair — the same green square, check or cross — so the outcome is legible before you open anything, and the two cases are genuinely different news: one means the text under that clause is not what it was, the other means an argument was had and settled nothing. Making a member open the card to learn which would have been the kind of small withholding this surface is otherwise careful to avoid. It also makes the unread queue honest about its own weight: three purple lines of which two are changes and one is a non-change is a lighter afternoon than three changes.

Ed chose pictographs over the abstract set I proposed (a filling circle: ○ ◐ ●). The trade is real and worth recording. The circle family reads as a *progression* and has to be learnt; the pictographs are legible on sight and don't. For a surface most people will use for one convention and then never again, sight-legible wins — nobody is going to learn a notation for a fortnight's work.

Two consequences fell out of building it. **The acknowledged mark is the whole card**: a filed decision was already a bare dot, so ☑️ simply replaces the dot rather than sitting inside one — the card visibly shrinks to its own glyph. And **the ✓/⟳ markers went**, since the lifecycle mark now says what they said, more precisely: ⟳ meant "locked" where 🔄 means "coming back", which is the truer fact.

**🔄 rather than 🔒 for a ground shift** (Ed, 155). Writing out what SPEC §4.4 actually does settled this: your judgment locks and stops counting, but it stays in the record, pairs on the new ground are served fresh, and the re-opened race gets a 1.5× routing boost. So nothing is asked of you and nothing was lost — the question comes back rebuilt, quite soon. A padlock would have said "you are shut out", which is both wrong and slightly punitive.

**The emoji arrive with their own colour**, which was a problem for a day — ❓ red and ☑️ purple-blue both landed on top of palette meanings — and then became the answer, below.

## Colour follows the glyph (Ed, 162)

Seeing the marks in place settled a question that had been drifting since 105: **what the rail's colour is actually for**. It was urgency — a blue wash whose strength rose with how much a card wanted you. It is now **lifecycle**, one hue per state, matching each glyph: 🔥 orange · ❓ yellow · ⏳ blue · 🔄 purple · ✅❎ green · ☑️ grey.

This is a better assignment than the one it replaces, and the reason is that colour was carrying the *weakest* of the three things a card knows. Urgency is a scalar with no natural hue, and it is already said twice over — by how much of the card is drawn, and by the one card that breathes. State is categorical, which is what colour is good at, and it is the thing you want first: *is this mine to do, or is it news?* A rail you can sort by eye into questions and outcomes without reading a word is a different object from one where everything is blue.

Two consequences worth having. **Purple keeps its meaning and gains precision** — it meant "changed since you looked" on the `freshness-highlight`, and a ground shift is exactly that, the document moving under your judgment, so 🔄 purple is the same idea rather than a new one. And **the urgency ramp survives inside the new scheme**: needs-you cards wash yellow at a strength that still rises with urgency, and the single most urgent goes orange, which reads as the top of that ramp rather than as a separate colour. Hot yellow *is* orange.

**The wash now reaches the one-line states.** A still-deciding entry used to be flat grey; it washes blue to its own closeness, so a compressed line keeps its progress bar. Nothing about having been judged makes a race's progress less interesting.

**☑️ is greyed with a CSS filter**, since an emoji's own colour can't be set. That answers "filed is grey" and fixes 158(b) at the same time. It desaturates on hover, which is a small pleasure: the mark colours up as you reach for it.

## Colour means you can still affect it (Ed, 164)

Then the palette halved, and got a principle. Green for decided and purple for ground-shifted are gone: the **cards** behind ✅ ❎ 🔄 ☑️ all go grey, and only the three live states keep a hue — 🔥 orange, ❓ yellow, ⏳ blue.

**The glyph keeps its own colour** (Ed, 165). My first pass desaturated the emoji along with the card, which was a misreading and a worse design: it left a closed entry with nothing legible on it at all. Grey belongs to the *card*, because the card is the thing that is or isn't yours to act on. The mark is then the one bright thing on a quiet surface — and a small run of coloured checks down a grey column is much easier to pick out than a run of grey ones. It also sorts the two problems 158 raised into their proper places: ☑️'s purple is fine once nothing around it is purple, and colour-vs-grey now separates live from closed more strongly than any pair of hues could.

The line it draws is exactly the right one: **colour means there is still something you can do; grey means the door is shut.** ⏳ stays blue because a still-deciding judgment is revisable while its race lives (SPEC §4.4) — it is genuinely still yours. 🔄 goes grey because a ground-shifted one is not: that is the whole content of the state. And a decided judgment is grey whether or not you have acknowledged it, because acknowledging is housekeeping, not influence.

What this buys is that the rail stops competing with itself. Under the previous scheme every entry was some saturated colour and the eye had nowhere to rest; now the closed half of a session recedes into a grey band and the live half is the only coloured thing on the page. A member arriving mid-session sees what is theirs immediately, and the record is still right there, quiet, in document order.

**Unread stays findable without being loud.** It keeps full weight and its pin — it is quiet, not unimportant — and against a page of grey a solid grey line still stands out from a 22px chip.

**A filed decision is a tiny card, not a bare glyph** (Ed, 164). It had been a mark floating on the page background, which read as decoration rather than as something you could open; a 24×22 card in the same closed grey, with the same shadow as everything else in the rail, says "this is an entry, it is just very small". The card is the smallest member of the family rather than a different kind of object — and it carries ☑️ at full colour like every other closed entry, so a row of them reads as a row of decisions rather than a row of dots.

## No borders (Ed, 164)

Queue cards lost their outlines. A rule round the outside was competing with the wash for the job of saying *this is one thing*, and since the wash also carries meaning — hue for state, extent for closeness, strength for urgency — the border was the part with nothing to say. Cards are now defined by wash plus the `--shadow-sm` that lifts them, which is the elevation grammar 90 already established for the rest of the page.

Two things had been riding on borders and had to go somewhere. **Selection** is now a ring drawn in `box-shadow` rather than a border, so opening a card doesn't reflow the rail by two pixels. And the **patch siblings' dashed outline** is simply gone: the "1 of 3 places" line was already saying it, and the spine down the gutter says it properly once the card is open. Reinforcement, not information.

**What was left over.** ❓ rendered red against a yellow card, which read as deliberate rather than alarming — road sign, not error — so it stayed at the time (158a). It has since gone: see *The alphabet says what act is wanted* below. The remaining collision is **the kind chips**, and the calmer the rail gets the more they show: QUICK is green, RACE is yellow, PATCH is blue, and every one of those hues now means something else. A green QUICK chip on an orange most-urgent card says "settled" and "burning" two centimetres apart. Q163.

## Stuck, and where you unstick it (Ed, 166, 173)

A **deadlocked race** gets ❌ — the same yellow as its neighbours, because it is still an open question, with the cross saying *this one is stuck*. More judgment cannot move it (SPEC §8.3); only a new proposal can. And **💡 marks every place the action is to write one**: the propose button on a race card, the propose button on a change card, and wherever else drafting is offered later.

That split is the useful part. **The rail says what is true; the buttons say what you can do.** A mark in the margin describes the state of a clause — it is not a control and should not pretend to be one — while 💡 appears only on things you can press. Marking the queue entry 💡 would have implied you could draft from the margin, which you cannot: you open the card, and there the button is.

Two consequences for how a deadlocked entry is drawn.

**It stops being grey.** It had been washing grey along with the closed states, which under 164's principle says "nothing here is yours to do" — the exact opposite of the truth. A deadlocked race is arguably the most actionable thing in the rail. It now carries the open yellow at a fixed strength, so colour still means *you can act* and the glyph carries what is different about the acting.

**And it stops riding the urgency ramp.** Urgency is judgment leverage, which for a deadlocked race is zero — so it was landing at the bottom tier and compressing to a single line, hiding the one entry whose instructions differ from every other. It got its own tier, drawn full, with its caption promoted from a progress note to an instruction: *deadlocked — more judgments won't move it; only a new proposal can*. (The tiers themselves went on 2026-08-16 and every open card is now drawn full, so this reads as history; what survives is the caption and the fact that a zero on the urgency scale must not be read as *unimportant*.) A deadlocked race is not a low-urgency race, it is a differently addressed one.

## The same marks in the contents rail (Ed, 177)

Each heading in the `contents-rail` now carries the lifecycle marks of the questions inside it, small and tight to the right edge. The left rail stops being a bare table of contents and becomes a **map of where the session's weight is** — you can see from twenty feet that Money is all open questions and the Kitchen is settled, without reading a word or scrolling the document.

It closes the loop the three rails were always implying. The `needs-you-queue` says *what is being asked of you*, in document order. The contents rail now says *where in the charter the asking is happening*, at section granularity. Same alphabet, two zoom levels, and the document itself in between.

Two rules make it behave. **Ownership is innermost** — a mark appears on exactly one heading, the nearest above its clause, so nothing is double-counted down the tree. Except that a **folded** heading takes its descendants' marks, because while it is shut they have no line of their own; that reuses the same collapse logic as the "N suggestions inside" hint and means folding a Part summarises it rather than hiding it. And a **patch counts once per section it touches**, not once per site, which is why the rename shows a single 💡 against each of the three offices it renames rather than three against one.

Capped at four with a `+n` overflow, on the same principle as the queue's fit cap: never silently truncate.

**The cap spends its space on whatever still wants something from you** (Ed, 178). Filed decisions drop first, then the states with nothing to do at all — ground-shifted, then still-deciding — and an open question is the last thing dropped. Selection is by that priority; *display* stays in document order, so the row still reads as a little map of the section rather than as a ranking. Fold Part II of the charter and it collapses to ☑️✅✅🔄+1: one settled decision is enough to say "there is history here", and the space goes to the two that want acknowledging and the one that came unstuck.

The count still reports everything dropped, including the quiet ones. A margin that says "+1" is honest; one that silently shows four of nine is the thing 110 was careful to avoid.

**A heading with exactly one question in it *is* that question** (Ed, 179), so clicking it opens the card rather than merely arriving nearby — with the same scroll, wire-levelling and card-expansion as clicking the entry in the right-hand rail. With several inside there is nothing to disambiguate on, so it stays what it was: navigation. This makes the contents rail a working surface rather than an index, and at the granularity most of the charter actually has — most sections hold one argument, not five.

One structural consequence. The contents rail used to be rendered only when the fold tree changed — it was static text — and it now depends on lifecycle state, so it re-renders with everything else. `renderAll` is therefore ordered document → queue → contents: the queue settles which card is most urgent, and the contents rail needs to know before it can draw 🔥.

## A patch judges once but reads many times (Ed, 181)

The patch card used to be a single object at the topmost site, with every place stacked inside its two lanes. It is now **a card at every place the patch touches**, each showing only that clause's before and after, each carrying the rationale and the verdict controls.

The reason the old shape was wrong is that it made you read the change *out of context*. Three clauses in two columns is a comparison table; what you actually want to know about a rename is whether it reads properly in each sentence where it lands — and that means seeing it in the paragraph it belongs to, with the charter above and below it. The card at each site does that, and the change becomes a set of small local judgments that happen to be taken together.

**It is still one judgment, and the cards say so at every level.** They share a `picked` state, so choosing on card two moves the pill on cards one and three at the same instant; Submit from any of them commits the whole thing; and each footer says plainly that choosing here chooses everywhere. That last part matters more than it did before: with the sites on one card, the singleness was obvious from the layout. Split across three cards, it has to be asserted, and asserted where the choosing happens.

**The entries are titled locally too** (Ed, 183): each says *§ Accounts and Inspection* rather than *Whole charter*, with "2 of 3 places" underneath. In a margin the local name is the useful one — the entry's job is to tell you what *this* clause has hanging over it, and "Whole charter" answers a question nobody standing at that paragraph is asking. The patch-ness is still said twice, by the kind chip and by the place count, which is enough.

**The stepper** — ↑ and ↓ in each card's header, greyed at the ends — walks between the places without leaving the judgment. All the cards are already open, so it is pure navigation: it brings the next place to the same reading line the queue uses.

The cost, and it is real: three cards of ~450px each push the patch's sites much further apart than three lanes did, so `foldBetweenSites` no longer gets the whole footprint onto one screen. That is precisely what the stepper is for — the footprint stops being a *view* and becomes a *walk* — but it means the shape of a wide patch is now something you traverse rather than something you see, and the queue-wire spine down the gutter is doing more of the work of saying "these are one thing". Worth watching on a patch with six sites rather than three (Q182).

## The rail says the thing, not the category (Ed, 184)

Two things came off every queue card: the **kind chip** (`QUICK` / `RACE` / `PATCH`) and the **subtitle** that restated it in words — *copy edit*, *6 proposals racing*, *one suggestion*. What is left is the lifecycle mark, the section name, the author's rationale, and — on the hot and stuck tiers — the caption saying how much more evidence is wanted.

They went because the card's own shape already says what they said. **One teaser is a suggestion. Two teasers divided by a hairline is a race.** A place count is a patch. The chip was a label for something the reader could already see, and the subtitle was a label for the label. Neither survives the test of being worth a line in a 290px column.

It also answers Q163 by deletion rather than by re-tinting. The chips were the last thing in the rail wearing a colour that meant something else — green for *quick* where green means decided, blue for *patch* where blue means still deciding — and rather than finding them a neutral grey, the better answer turned out to be that they had nothing to say.

**The one survivor is "2 of 3 places"**, because it is not a category but a position: it tells you which of a patch's clauses you are standing beside, which nothing else on the card does.

What this costs is that the word "race" now appears nowhere in the rail. A member never learns the vocabulary from this surface — they learn it from the cards, where a race's two lanes and its conditional framing do the teaching. That seems right for a surface whose whole ambition is that most of a session should feel like approving typo fixes: the machinery should not introduce itself in the margin.

## Two numbers, and only one of them is a headcount (Ed, 186)

Ed asked whether the adoption bar could be stated as people rather than as a fraction — ">7 of 13" instead of 0.74. It cannot, and the reason is worth writing down because the question will recur every time someone new meets this mechanism.

**The adoption-threshold is a confidence, not a share.** It is the bar a challenger's *win-probability against the current text* must clear — P(this beats what we have) > 0.74 — estimated by the Bradley–Terry model from blind pairwise comparisons. There is no number of people it corresponds to. Six judges who all prefer B produce a different posterior from twelve judges who split nine-three, and both can land either side of 0.74 depending on how the comparisons were sampled. Rendering it as "7 of 13" would be a plain misstatement of what the engine computes.

Worse, the nearby honest-sounding version — *"three more preferring this would carry it"* — is exactly the standings leak §8.3 forbids. It tells you where the race currently stands and which way it leans, on a surface built so that nobody can judge strategically. That version must never be built, and it is the one somebody will eventually ask for.

**But the underlying instinct is right**, and there *is* a real headcount in the mechanism: the **floor**, F = min(⌈E/3⌉, F_max) distinct movers before anything can be adopted (§8.2). With fourteen members that is five, and "5 of 14" is literally and exactly true. So the navbar now carries both, named for what they are — *confidence bar 0.74 ▲* and *voices needed 5 of 14* — and the sealed record leads with the headcount before the confidence: **5 of 14 weighed in · floor was 5**, then *confidence 0.52 against a bar of 0.74*.

That ordering is deliberate. The headcount is the number a member can act on ("has enough of us looked at this?"); the confidence is the number the machine acts on. Leading with the human one, and labelling the other as a confidence rather than leaving a bare decimal to be misread as a vote share, is most of what was wrong.

The floor also carries the mechanism's most humane rule, which the phrasing should keep visible: **silence is never imputed** (§8.2, Q43). A race short of its floor waits; it does not adopt around a member who has not spoken.

## Quorum, not floor (Ed, 190)

The interface calls the adoption floor **quorum**. SPEC §8.2 keeps *floor* as the mechanism's name — F = min(⌈E/3⌉, F_max), and it is literally a floor on evidence — but the word a constitutional convention already owns is quorum, and Ed's framing is the right one: it is *quorum for a decision rather than for a meeting*. Do we have enough people to settle this question.

I had argued against the analogy on the grounds that quorum counts presence while the floor counts participation. That objection dissolves in an asynchronous session, where there is no presence to count — participation is the only observable there is. What is left of the difference is that quorum is per-meeting and this is per-question, which the phrasing carries rather than contradicts.

So: *quorum 5 of 14* in the navbar, *5 of 14 weighed in · quorum was 5* in the record. The confidence bar sits beside it labelled as a confidence, because the two numbers are different in kind and the old bare decimal invited exactly the misreading Ed had (Q186).

One collision to keep an eye on: the charter being drafted contains its own **§ Quorum** clause, so the word appears on screen meaning both the house's rule about meetings and the machinery's rule about deciding. Context separates them, but it is the same family of muddle as hot/warm/cool (Q189).

## Yellow means "under challenge", whatever kind (Ed, 195)

A patch's clauses were marked in the document by a blue left rule alone, with no wash — the yellow highlight belonged to quick suggestions and races. So the same fact, *this sentence is being argued about*, looked like two different facts depending on how many other sentences were being argued about with it. All three kinds now take the yellow wash, and the left rule alone names the kind: green singleton, yellow race, blue patch.

The dashed sibling outline went with it. It had been standing in for the wash on patch anchors — the only thing marking them as touched — and with a real wash underneath, a dashed box around it was two devices for one job. The siblings of an open patch now take a brighter inset rule instead, which reads as emphasis on a mark that is already there rather than as a second mark.

## The fixture had one example per tier (Ed, 194)

The compression ladder could not be judged, because the rail held three hot entries, two warm and exactly one cool. Ten more live suggestions now spread down the urgency range — ordinary charter housekeeping, the kind of thing a convention actually spends an afternoon on: a joke about an armchair that is not a rule, a year that should be two years, a flat ban on power tools that only somebody unemployed could obey.

The distribution that falls out at the current thresholds (0.66 and 0.33) is **3 hot, 8 warm, 8 cool**, and the middle bucket being the largest is very likely the crowding Ed was reacting to. The rail's fit cap now bites properly too — between two and seven entries fall to the overflow count depending on where you are in the charter — which is the first time it has been exercised by the fixture rather than by a contrived window size.

**Ed's own argument for the design, worth recording** (2026-08-16): the single 🔥 card means *you never have to think about prioritisation at all — just always do that one.* That is what 115's exemption from the fit cap is for. Everything else in the rail can be a map; one thing in it is an instruction.

## The lanes are the buttons (Ed, 197)

"Option A" and "Option B" are gone, and with them the `verdict-pill`. **You choose a text by clicking the text.** That is the most direct statement the card can make of what it is asking, and it explains why the labels existed at all: they were never for the reader, they were so that a control underneath could refer back up to a lane. Remove the control and the labels have no job.

**Choosing is still not committing** (Ed, 88, and it survives intact): a click selects the lane — blue fill, inset ring — and nothing leaves the card until Submit. That mattered more here than it did with the pill, because a lane is a large target and a stray click should never be a judgment.

**Indifference could not move onto a lane**, and this is the part worth being careful about. It is a judgment about the *pair* (SPEC §3.2 — tie evidence for the ranking, the instrument of behavioural dedup, the care map in aggregate), not about either text, so there is nowhere among the lanes to put it. It keeps a control of its own — *🤷 Can't split them* — sitting with Skip and Submit. The three-way choice §3.1 requires is intact; it is just no longer drawn as three equal segments, which was always slightly false anyway, since two of the three are texts and one is a shrug.

**A race has no lane headers at all now.** Both sides are proposals, the rationale above each column says whose it is, and there is nothing left to name. On a quick card and a patch the headers survive as descriptions rather than labels — *the current text*, *the proposed change*, *this clause as it stands*.

Two knock-ons. The **sealed record** dropped its letters too: a ranked field is numbered 1..5, and the rank identifies a proposal better than a letter ever did. And the **recorded verdict for a race** had to stop saying "preferred A" — it now quotes the first few words of the text you chose, which is both label-free and more informative, since it names the thing rather than its position on a screen.

## One blue (Ed, 198)

Wires were three colours by kind and cards were pink; both are now the single blue of a selected queue card. Kind is not something a wire was ever asked to say — a wire says *where this judgment lives* — and three colours for it competed with the lifecycle palette, which is where colour now genuinely earns its meaning. The pink was a leftover from 67, when the problem being solved was that yellow was doing two jobs; that problem was solved elsewhere long ago. A fuller design and branding pass comes later; until then colour is doing quite enough work in the rails.

## One alphabet in all three columns (Ed, 199)

The chip-gutter carried its own little vocabulary of word-chips — *6 racing*, *1 of 3*, *judged ✓* — which was a third naming system beside the queue's and the contents rail's. It now carries **the same lifecycle marks**, so 💡 means the same thing in the left rail, in the document's margin, and in the right rail, and the eye can move between the three columns without translating.

The detail that made this worth doing rather than merely tidy: a paragraph's gutter and its queue entry now show *the same glyph*, so the wire between them is confirming something you can already see rather than establishing it. What the chips were carrying that the marks are not — which of a patch's places this is — moved into the tooltip, where it is available without occupying the margin.

## The document reads by lifecycle too (Ed, 200)

A challenged paragraph now wears **the same colour as its queue card**, and the left rule is gone. So § Arrears washes orange because it is the one thing most wanting you; § The Purse-holder washes yellow; a judged clause washes blue; a stranded one grey. The charter itself becomes readable at a glance: where is the work, where is the waiting, where is the settled ground.

This is the last of the three columns to join. The `contents-rail` says where the asking is happening, the gutter glyph says what is being asked, the queue card says the same thing in the margin — and now the paragraph itself carries it. One object seen four times, in one alphabet and one palette. Nothing in the layout has to *explain* the relationship any more; the wire, when a card is open, confirms something the colour has already said.

**The left rule had to go for the idea to work.** It was the last thing in the document saying *kind* — green singleton, yellow race, blue patch — after 184 and 199 had removed kind from both rails. Keeping it would have meant a paragraph stating its kind on the left and its lifecycle across the rest, which is the same two-vocabularies problem in miniature. With the rule gone the wash is the whole mark, and 195's fix (all kinds wash alike) turns out to have been a step toward this rather than a destination.

**A filed clause washes nothing at all.** Under 164's rule grey means closed, and a tint would have been consistent — but a charter that settles gradually into an entirely grey-washed document reads as *disabled*, not as *finished*. So a decision you have acknowledged leaves the paragraph clean, with only its dot in the gutter; an *un*acknowledged one keeps a grey tint, because it still owes you something. The document ends the session looking like a document.

Two small things fell out. The **kin** treatment is gone: an open patch simply deepens the wash on all its clauses at once, which says "these are one judgment" better than an inset rule did. And `topUrgentId` now has to be settled *before* anything draws rather than inside the queue render, because the document needs to know which paragraph is the orange one and it is rendered first.

## A proposed section is a blank gap (Ed, 201)

The `insert-anchor` was a dashed box captioned *＋ proposed new section — Quiet Hours*. It is now nothing: a couple of blank lines with 💡 in the gutter beside them.

Drawing a labelled box around it made an absence look like a presence — like something already in the charter, in a different style. A proposed section is a *hole*, and the honest rendering of a hole is a hole. What remains is the gap the section would fill and a mark in the margin asking about it, which is the same grammar every other clause uses; the mark is doing exactly the job it does everywhere else.

**It does take the wash**, though (Ed, 205). I had left it colourless on the reasoning that there is no text here to be under challenge — but the gap *is* the thing being argued about, and a proposal that replaces nothing is still a proposal. Colourless made it read as document rather than as question, and it broke the rule 200 had just established, that everything contested wears its lifecycle hue. Blank of text, not blank of colour.

## Bare lanes (Ed, 206)

The lane descriptions went too — *the current text*, *the proposed change*, *this clause as it stands*. A decision card is now two washed boxes of prose and nothing else above them but the rationale.

The argument is the same one that retired "Option A" at 197, carried one step further: the left lane on a quick card *is* the paragraph you can see immediately above the card, unchanged, and the right one is visibly different from it. Saying so in a label was describing a comparison the reader is already making. And with the label gone the two lanes are literally identical in structure, which is the strongest form of the symmetry every pass since 85 has been working toward — nothing at all distinguishes them but their words.

The **sealed record keeps its labels**, and should: *The charter as it stands*, *The text it replaced*, the rank numbers. Those name parts of a record rather than sides of a choice, and a record with five ranked proposals genuinely needs to say which block is which.

What this leans on is position — left is always the incumbent — plus the card's footer, which still says that choosing the current text records a judgment for it. Worth watching whether that holds for someone meeting the surface for the first time (Q207).

## One mechanism for an adoption (Ed, 203)

The `freshness-highlight` and its change card are gone. They existed since 63 to report adoptions that happened while you were away: a purple chip saying *changed just now*, a paragraph that lit up and cooled, a small card with a redline and a *Fine by me*.

An unacknowledged sealed decision reports exactly the same event, and reports it better — the whole field ranked, the confidence it cleared, the quorum it met, what you yourself did — with a real acknowledgement rather than a shrug of a button. Two mechanisms for one fact, and the older one was the thinner. Q113(c) had already noticed the overlap and asked which should count as having seen a change; the answer turns out to be that there was only ever one thing to see.

So the two adoptions in the fixture became **sealed decisions like any other**, and everything else went with the mechanism: `CHANGES`, `seenChanges`, `openChange`, the chip, the card, the *Fine by me* and *Propose a change* buttons, the `--fresh-fade` token, the `freshFade` keyframes and the negative-delay clock that resumed them across re-renders.

Two things fall out. **Q92 is moot** — it asked whether the change card should keep its redline now that decision cards had dropped theirs; there is no change card. And the **document now has no animation at all**: the freshness fade was the last of it, after 172 took the pulse off the queue. The surface is entirely still, which was not a goal but is probably a virtue for a document people are meant to read.

What is lost is the *ambient* half. The old highlight caught you passively — you noticed a paragraph glowing while reading, without going near the rail. An unread seal is quieter: a grey wash, a green mark in the gutter, a pinned line in the margin. It will always find you, but it no longer taps you on the shoulder. That seems the right trade for a surface that has spent this whole pass learning to stop shouting.

## Choosing, unchoosing, and where Submit lives (Ed, 202, 204)

Three changes to the commit row, all in the same direction.

**Submit appears only once something is chosen**, and the **shrug steps out** as it does (Ed, 209) — one slot, one control, so the row never offers two next-steps at once. A disabled button is a thing you are being told off by; an absent one is simply the next step not having arrived yet.

**Both are glyphs alone** (Ed, 213): 🤷 and, once you have chosen, a solid green ✓. The row is two gestures rather than two sentences, and losing "Can't split them" costs nothing a tooltip cannot carry — the shrug is the most legible emoji on the surface and it is doing the same job it does in every chat window in the world.

The tick is the one **solid green** thing on a decision card, which is worth the exception to 198's one-blue rule: green already means *decided* in the lifecycle palette, and Submit is the act that decides. Everything else on the card is a choice; this is the commitment, and it should look like a different kind of thing. Both controls sit in the same 52×40 box, so the swap is a substitution rather than a reflow.

That leaves one asymmetry worth naming: with the shrug hidden, an indifferent verdict can only be undone by picking a lane and then unpicking it — two clicks where a lane's own undo is one. It has not bitten in use, but it is the seam (Q211).

**The lanes hover strongly** (Ed, 209). A lane is the button now, so it has to answer the pointer as firmly as a button would: a blue tint and a 2px inset ring, deliberately short of the selected state's fill so the two never read as the same thing. This is the part of 197 that was under-built — a large clickable area with a barely-visible hover reads as decoration, and the whole point of moving the control onto the text was to make the thing you press obvious.

**Clicking what is already chosen unchooses it.** Nothing is committed until Submit, so changing your mind before that should cost the same single click that making it up did. This applies to the shrug as much as to a lane, so the three-way choice is genuinely three-way and genuinely reversible.

**Skip survives only on the 🔥 card**, relabelled *Not this one, not now*. The reasoning is worth keeping because it generalises: **skip belongs wherever the surface insists, and nowhere it merely offers.** Everywhere else in the rail you are looking at a map and closing a card already says "not now" — more honestly, since SPEC §3.1 makes skipping a non-move anyway. But the 🔥 card is exempt from the fit cap and always on screen: the one thing the design pushes at you. Without an escape it would be a nag you cannot dismiss. Ed's instinct and the mechanism agree here, which is usually a sign the line is in the right place.

## The meter leaves the decision card (Ed, 210)

The `evidence-meter` is off the decision cards entirely. It had moved to their foot at 95, below Submit, where it answered *how much more evidence does this want* after you had formed a view — a good position for it. But the queue card beside the same clause already carries that: since 116 the **wash is the progress bar**, its fill reaching as far as the judgment has got, with the caption underneath saying it in words.

So the card was repeating, a few inches away, what the margin had already said — and repeating it in a second visual language, a thin bar where the rail uses a fill. Removing it takes ~60px off every card and leaves the card holding only the things that belong to *deciding*: the argument, the two texts, and the controls.

The whole `meterHtml` builder went with it, since the queue never used it — the rail's progress is a gradient, not an element. What survives is `.mcap`, the caption class, which the queue cards and the sealed record still use.

Worth noting what is now *only* on the queue card: closeness, and the race's "you've judged 2 of the pairs you'll be asked for". If a member opens a card from the document rather than the rail, they see neither. That has been true of the coverage line since 95 and is now true of closeness too (Q212).

## Judging happens in place (Ed, 215, 216, 217)

Three changes that turn out to be one idea: **the card is where a judgment lives, before and after it is cast.**

**The revise note moved under the commit row** (215). *You approved · choosing again replaces your earlier judgment…* had been sitting at the top of the card, above the argument — an instruction issued before the reader had seen the texts it applies to. It is a footnote to the button, so it belongs beneath the button, and it now reads as one: centred, quiet, no border.

**The tick has a pressed state** (216). Once submitted it presses in — inset shadow, pale green fill — and stays that way while your selection matches what is on the record. Choose anything else and it springs back out, solid green, live again. This is SPEC §4.4's revisable judgment made visible in a single control: the card can now say *this is cast*, *this is cast and you are about to change it*, and *nothing is cast* without any prose at all. It needed a second piece of state — what is **committed**, as against what is merely **selected** — which the mockup had been conflating.

**And submitting no longer closes the card** (217). It stays open and simply becomes what it now is: tick pressed, note underneath, queue entry turned ⏳ beside it. Closing was the only way the surface used to acknowledge the act, and the pressed tick does that better — you can see the thing you did, still on screen, still attached to the text it was about. It also stops the document jumping under a reader who was mid-clause.

Together they close a small loop the surface had been leaving open since 88, when choosing and committing were first separated: the card now shows the whole life of a judgment — untouched, chosen, cast, being reconsidered — in one place, without a state change ever taking the evidence away.

## Housekeeping: what the sweep found (2026-08-16)

A tokenising and debugging pass over the whole mockup, at the point where it stopped being a sketch. Three kinds of finding, worth separating.

**Dead weight, removed.** Five class families no longer rendered by anything: `.receipts` and `.hist` (two abandoned attempts at a session log), `.mono` and `.small` (utilities nothing used), `.site-block` (the patch card's old stacked-sites layout, gone since 181), `.rr` and `.rcand .btn` (from when the lanes carried their own buttons, before 88). Four dead tokens — `--race-bg`, `--race-border`, `--changed-bg`, `--orange` — and the `del` element rule, which has had nothing to style since 91 took strikethrough out of the series. The stylesheet came down by about a fifth.

**Duplication, collapsed.** `.queue button.deciding` was declared three times in three places with overlapping properties; the wash was applied by two rules that had drifted apart; the eyebrow label treatment was written out six times with two different sizes. Each of these is the same small failure — a rule added near the change that prompted it rather than near the rule it belonged with — and each was invisible until the file was read end to end.

**One real bug.** `.doc .anch` was setting `margin-left: -12px` to pull the wash into the gutter, but `.doc p` (one class plus one type) outranks a bare class, so the margin never applied and every anchored paragraph sat 12px right of the unanchored ones. Nobody noticed because the indent is small and the wash disguised it. Found by measuring rather than by looking, which is the honest lesson: **specificity bugs do not announce themselves, they just make the page slightly wrong.** The same class of bug had bitten once before this session, when `.btn.vindiff` outranked `.hidden` and the shrug silently refused to hide (209).

Verified afterwards by exercising every path: all ten card kinds open and close, a patch judges from any of its three cards with the ticks pressing together, an unread decision acknowledges into a dot, skip works on the 🔥 card, folding and unfolding a Part rebuilds the contents rail, and the margin survives scroll-and-resize churn with seventeen pinned entries, no overlaps and nothing off-screen. No console errors on any path.

## The salience diagonal comes home (Ed, 221)

SPEC §8.3 gives about one slot in ten to a **diagonal**: a card that compares two *disputes* rather than two texts, asking which open question deserves more of the room's attention. It was built in design/race-card.html and had no home here — every zone on this surface assumed a judgment attached to one clause.

It turns out to need nothing new. **A diagonal is a patch turned inside out**: one judgment, two anchors in different parts of the charter, so it reuses the multi-entry machinery whole — two queue entries standing beside their own clauses, a mark in each gutter, a wire spine joining them. And the card is the lane geometry unchanged, because two lanes side by side is exactly the shape of *which of these two*. The only difference is what fills them: a question's name, a line on what it is about, and the clause as it currently stands, greyed, because **the text is context here rather than the thing being judged**.

Three details the mechanism forced.

**Its own glyph, ⚖️** (Ed's, and the one I had picked). By the rule established at 166 — colour says whether you can act, the glyph says what the act *is* — a diagonal is a different ask and must not wear the ordinary mark. Weighing two things is exactly what the scales say.

**It can never be the 🔥 card.** 🔥 means *an ordinary judgment that wants you most, just do it*, and a card carrying ⚖️ while being the flame would say two things at once. So the two differently-addressed kinds — a stuck race and a diagonal — are both excluded from the flame, and 🔥 keeps its single meaning.

**The footer has to be explicit that nothing changes either way.** This is the one card on the surface where choosing does not touch a text: it steers whose argument gets the room's time next. A member who mistook it for a verdict would think they had just voted on the quorum rule. Hence *this ranks the questions, never the answers*, and an indifference that reads "they matter equally" rather than "can't split them".

## The queue is a courtesy, not a conveyor

"Needs you" is meant to be the router's ordering — hottest races first, floors-near races where you're unheard, then quick approvals — but every item is also anchored in the document, so a member who prefers to just read the charter top to bottom encounters exactly the same work in document order. Two navigation styles, one underlying set of judgments.

**Superseded by 104–108**, above: the rail is ordered by the document, not by hotness, and leverage is carried visually instead. The paragraph stands because the second half of it — that both routes reach the same work — is now literally true.

## The queue-wire (Ed, 71; narrowed 78)

The **open** card draws a **wire**: out of its queue card's left edge, along the gutter between the two rails, and left into every place in the document it refers to. It answers the question the queue can't — *where does this actually live* — and it stays drawn while you judge.

It earns its keep most on **multi-site patches**, where one queue entry sprouts a wire to each site at once and the patch's footprint becomes visible as a shape rather than a claim in a caption. That is the same job the dashed sibling outlines do from inside an open card, approached from the other end. It does the same for the **salience diagonal**, whose two anchors sit in different parts of the charter and would otherwise read as two unrelated questions.

Every wire is one colour (Ed, 198). It used to take the colour of the suggestion's kind, on the theory that the line could say what sort of work was waiting before you arrived; once colour became lifecycle, a second colour system running down the gutter competed with the one that had a rule behind it. Kind is not a thing the wire was ever asked to say — it says *where this judgment lives*.

The first pass drew the wire on **hover** as well, on the theory that you would want to ask "where is this?" without committing to a click. In use that was wrong (Ed, 78): the pointer crosses several queue cards on the way to the one you want, so the gutter flicked through three or four different wires before you arrived — a lot of motion in exchange for an answer nobody had asked for yet. Hover is a cursor passing through, not a question. The wire is now tied to the open card only, which also makes it mean something more definite: this line is *the thing you are working on*, not *the thing under your mouse*.

**Clicking** a queue card scrolls the document until that wire is **horizontal** (Ed, 74). The queue card stays exactly where it is and the charter slides to meet it, which is the right way round: the queue is the fixed thing you are working from, the document is the thing being navigated. It also means the eye never has to search after a click — the target arrives at the height your attention is already at, joined to the card you clicked by a straight line. A multi-site patch levels on its **topmost** site, and its other wires fan off that flat line, so the shape of the footprint stays readable rather than being centred on nothing in particular.

Three wrinkles worth knowing:

1. The queue rail is sticky, so a single scroll can move both ends of the wire at once; the alignment measures again after the scroll settles and corrects, stopping as soon as a pass stops improving.
2. Past the end of the charter the rail runs out of container and rides with the page. Both ends of the wire then move together, so scrolling further down can never flatten it — it only travels. The alignment predicts that case and refuses the pass rather than chasing it.
3. The document carries a **scroll runway** below it (`main` has a tall bottom padding) so that an anchor near the end of the charter can still be brought up to the rail's height. Without it the levelling silently stops working for the last few sections.

### Two ways the wires went missing (Ed, 2026-08-16)

Both were the same mistake in different clothes: **a lookup that had quietly become a constant, and a container standing in for the thing inside it.** Worth recording because the failure mode is identical each time — the wires are drawn, they are just drawn as nothing, so there is no error to find.

The **diagonal** had no cable at all. When every kind's wire became one blue (198), the per-kind colour map survived with all three entries set to the same value: it looked like a lookup while being none, and nothing depended on it any more. The first new kind after that — the diagonal — fell straight through it to `undefined`. SVG discards an invalid `stroke` rather than complaining, so the paths were present, correctly shaped, and invisible. The map is now a single constant, which is what it had actually been since 198; a new kind can no longer be forgotten in it, because there is nothing left to forget.

Looking for others of the same shape turned up a **sealed dot** with the same symptom for an unrelated reason. Dots that fall near each other in the charter share a row (106), and the row carried only the *first* dot's id — so clicking the second or third dot opened its card with no cable to it. The row was standing in for the dots inside it, which is fine while a row holds one. Each dot now carries its own id and its own clause, and the wire leaves the **glyph you clicked** rather than the left edge of a row of five — which is more honest anyway: with a row of dots, "which one did I just open" is exactly the question the wire should be answering.

A note on method: the second bug was only found by sweeping *every* entry in the rail rather than the one that was reported. It cost one probe. The corollary is that this surface now has enough kinds — quick, race, patch, insert, diagonal, deciding, unread seal, sealed dot — that a check of one is no longer evidence about the rest.

## Folding sections (Ed, 79)

Every heading carries a **section-toggle** — a triangle, in the contents rail and again in the document's left gutter, in line with the anchor chips. The two are one control in two places: fold from either and both turn. A section owns everything from its heading down to the next one; the preamble above the first heading belongs to no section and never folds.

The triangle is **asymmetric by state** (Ed, 81): a folded section always shows its triangle, because it is the only handle on text you cannot see; an unfolded one hides it until you hover the heading. Thirteen permanent triangles down the contents rail read as chrome — a control the surface is nagging you to use — when folding is something a reader does occasionally and deliberately. Hiding the resting state leaves the rail as a list of section names, and the fold marks that remain are then informative rather than decorative: every triangle you can see is a section that is actually closed. It fades on opacity rather than `display`, so the row never twitches as it appears, and keyboard focus reveals it too.

Two places this had to be more than hiding text.

**A folded section must not hide work.** The queue keeps listing suggestions whose text is folded away, so it is possible to fold a section and then click something that lives inside it. Rather than have that click do nothing visible, the section **unfolds itself** before the document is measured — and for a multi-site patch, *every* section it touches unfolds, because the wire fans to all of them. The counterpart also holds: folding a section that contains the open card closes that card, since leaving it open would strand a judging surface with no visible text to judge.

**A folded section says what it is swallowing.** A folded heading that contains pending suggestions appends a quiet "*2 suggestions inside*". Without it, folding is a way to hide work from yourself — the queue would still be pointing at text you can no longer see, and the count is the cheapest honest signal that something is in there.

Fold state is deliberately *not* a judgment about anything: it is per-reader view state, invisible to everyone else and to the engine. Nothing about it enters the event log.

## The fixture also has to carry fields, not just pairs (Ed, 120)

A sealed race stores a **`slate`** — every proposal that was in the argument, in order, with the winner flagged — rather than the `race: { a, b }` pair a live card uses. § The Guest Bedroom — claims runs five: first-come-no-exceptions, the notice-and-offer version that carried, Steward's discretion, a Steward-kept calendar, and a cap on how many claims one member may hold. They are deliberately five *different theories of the problem* rather than five wordings of one, because that is what a real race looks like and it is what makes the graveyard worth keeping.

The quick cards keep their pair (`optionA`/`optionB` with `won`), and the renderer normalises all three shapes into one slate, so the card body doesn't care which kind of judgment it is showing.

## The fixture (Ed, 82)

The mockup runs on a single `SUGGS` array where each queue item carries its own content, progress and state, and a `DOC` array of charter lines. It used to be five parallel literals kept in sync by hand, with two of the queue states painted on as fakes that could not be opened; consolidating them is what made a bigger example cheap rather than laborious.

It is hand-authored, not generated. `sim-harness` has no session-state exporter — it writes metrics CSVs — and even with one, the fixture holds marked-up diffs, in-character rationales and English meter captions that the engine has no opinion about. The sim would supply the skeleton and leave the flesh.

Current shape: **93 headings** (10 parts, 24 chapters, 59 sections), **147 paragraphs**, **13 queue items** — seven needing you, four still deciding, two sealed — including a deadlocked race, a judgment locked by a ground-shift, two freshness-highlighted paragraphs and a patch spanning three sites in two different parts.

**Heading levels.** A heading owns everything until the next heading of its own level or above, so sections form a tree rather than a list. Folding a part takes its chapters and their sections with it, in the document and in the contents rail alike; the "*N suggestions inside*" count on a folded heading reaches all the way down its branch, so folding Part IV reports the four suggestions living in its sections. Everything that indexes sections — fold state, wire targets, the patch's between-folding — walks the ancestor chain rather than assuming a flat sequence. The patch-folding gets a nice property out of this for free: folding between two sites two parts apart folds *the intervening part*, one line, rather than its thirteen descendants.

**Big races.** The card is still pairwise, because the mechanism is. What changes with six proposals instead of two is what the surface *says*: "6 proposals racing · you've judged 4 of the pairs you'll be asked for". A magnitude and a coverage — how big the argument is and how far through your share of it you are. Neither is a standing, so neither trips SPEC §8.3. The anchor chip carries the same count in the gutter, so the size of an argument is visible before you commit to opening it.

## A patch draws its sites together (Ed, 80)

Opening a multi-site patch folds the sections **between** its sites — never the ones holding a site — so the whole footprint arrives on one screen instead of at either end of a scroll. Letting go of the patch (opening something else, closing it, or judging it) unfolds them again. In the clubhouse charter that means § Money and § Offices come to sit either side of three folded headings, and the patch stops being a claim you have to take on trust from a caption and becomes a thing you can look at.

The folds are tracked in a set of their own, apart from the reader's. A section the reader had already folded by hand is never adopted, so releasing the patch does not unfold it; and unfolding an auto-folded section by hand hands it back, so it is not restored later either. The reader's view state is theirs — the patch borrows what is left over.

Every fold change happens at the same moment in the open sequence: after the old card has collapsed, before anything is measured. That matters, because folding changes the height of the document exactly like a card does. Do it after the measurement and the wire lands somewhere else entirely.

Worth knowing what this does *not* fix: the open patch card is itself the bulk of the distance between the two sites (about 450px of the 825px gap in the clubhouse charter). Folding three sections recovers roughly 280px. Both sites do land on one screen, but it is the card, not the intervening charter, that sets the floor on how close they can get.

## Three steps, never overlapping (Ed, 75; reordered 2026-08-16)

Opening one card while another closes was doing both in a single frame, and since a card's height is part of the document, the page lurched: the ground moved while the eye was travelling. The first answer was to **refuse to overlap** the three things that happen — the old card **collapses** out of the document (~190ms), then the document **moves**, then the new card **expands** (~230ms) — so that nothing is ever re-laid-out underneath a scroll in progress.

That was right about the diagnosis and wrong about the cure, and Ed reported the result as the page jumping about. Sequencing the three steps stops them *interfering*; it does not stop them being **three separate movements**, and the first of them was the worst. A race card is over a thousand pixels tall. Collapsing it drags every clause below it up the screen — and since you have just asked to go somewhere else, the charter rushes up, stops, and then eases back down to the clause you actually asked for. Nothing was wrong with the destination. The page simply moved twice to get there.

### One movement, and the swap hidden inside it

The order is now: fold, **move**, then swap the cards on arrival — with the old card leaving in the same frame the new one arrives, at the end of the scroll rather than the start of it.

That frame changes the height of the charter above you, so it is paired with a scroll correction of exactly the same size, applied synchronously before anything is painted. The two cancel: the clause you travelled to does not move by so much as a pixel while, underneath it, one card is removed and another inserted. This is the browser's own scroll-anchoring done by hand, which it has to be, because the document is re-rendered wholesale and the native mechanism has nothing stable to hold on to.

Three details that matter:

1. **Hold by selector, not by element.** The node measured before the re-render does not exist after it. A clause is found again by its key; a *proposed section* has no key — it is a gap where text is not yet — so it is found by the entry it belongs to. This one was quiet when wrong: the fallback held some other clause still and let the gap you were sent to slide 400px off the top of the screen.
2. **Several candidates, not one.** The change may be a fold that takes the held clause away with it, so the reference is a short list and the first survivor wins.
3. **Closing with nothing to open is the exception.** There the collapse is worth watching — nothing else is happening, so the card rolls up in place and the charter closes over it.

### Levelling, removed (Ed, 118; removed 2026-08-16)

There was a second scroll after the first: it levelled the *entry* against its clause so the wire read flat. It was the other half of what Ed was seeing — the charter rose to bring the clause to the reading line, then sank again to line that clause up with wherever its entry had ended up in the pile.

It was also aiming at the wrong thing, and had been since 110. An entry stands at its clause's own height whenever it can, and the open entry gets **first claim** on that line, so the wire is flat by construction and there is nothing to level. The only time it isn't flat is when the rail is too crowded to grant the claim — and then the entry's position is an artifact of crowding, not a place the reader asked to be taken. The rail already says this where it does the piling: *an angled wire is the price of a full rail*. Levelling was paying that price out of the one thing the reader was actually looking at.

**Known consequence, not yet addressed:** with levelling gone, a crowded rail can leave the open entry a long way from its clause — up to ~870px in the current fixture — and the wire runs at a steep angle. The honest fix is in the rail rather than the scroll: when the band is full, the open entry's claim on its clause's line should win, and the entries above it should be dropped into the overflow count rather than displacing it.

The same collapse runs when you *judge* a card, which is the other way a card leaves the document — it shrinks out while its queue entry slides down into the still-deciding band, instead of vanishing and dropping the page. And a click that lands mid-transition supersedes the one in flight rather than being ignored: each sequence carries a token and every step stands down if a newer one has started, so the surface never feels stuck while an animation finishes.

## The verdict-pill: choosing, then committing (Ed, 88; the pill itself retired at 197)

*The separation of choosing from committing survives and is the durable half of this section. The control that carried it does not: the lanes became the buttons at 197, and the shrug-and-tick row replaced the pill at 209/213. Read the shape below as history, the principle as current.*

The verdict is no longer carried by two buttons inside the lanes. It is a single three-part **verdict-pill** below them — ⬆️ Option A · 🤷 Can't split them · ⬆️ Option B — with **Skip** and **Submit** on their own row underneath. The arrows point up at the lane each segment stands for; the shrug sits between them because that is where indifference belongs.

Three things this changes, beyond the shape.

**Indifference stops being a footnote.** It used to be an outline button in a row of leftovers, next to Skip, which read as *give up* rather than as a verdict. Given a third of the pill it is plainly one of the three things you can say, and it is the one the care map is built from (SPEC §3.2) — so a surface that made it look like a cop-out was quietly starving the record.

**Choosing and committing separate.** Every earlier version fired a judgment the instant you clicked a preference; there was no held state, so no way to weigh A against B with your choice provisionally made. Submit stays disabled until a segment is chosen, and choosing updates the pill in place without re-rendering, so the document does not move under a reader who is still deciding.

**The lanes are now purely evidential.** With the rationales above and the verdict below, a lane holds nothing but a label and a text. There is no longer anything to click inside either candidate, which removes the last way the layout could favour one — no button placement, no visual weight, nothing but the two texts side by side.

Reopening a still-deciding card shows the pill as you left it, so revising a judgment (decision 50) is a matter of moving the selection and submitting again rather than remembering what you said.

*Noted, not fixed: the ⬆️ emoji carries its own blue tile, which sits a little muddily on the selected blue segment. Legible in both states, but a text arrow that inherited the segment's colour would be cleaner if the pill survives to visual design.*

## What approval means (and why there's no owner)

The approve button is the familiar gesture with a different engine behind it: it records a pairwise judgment (proposal vs current text) rather than an owner's acceptance. A suggestion lands when its win-probability clears the session's rising bar with enough distinct judges — the threshold-plus-floor is what replaces the document owner. For an easy typo early in the session, that's a handful of quiet approvals; nobody sees machinery.

## Progression: the evidence meter (Ed, 2026-08-14)

Every suggestion carries a thin **evidence meter** — how close it is to being decided (adopted *or* retired), never which way it leans. This is the spec's own "closeness-to-resolution as a single number" (§8.3), the one race statistic that is public by design because a scalar magnitude can't leak direction. The captions speak in what's missing, not who's ahead: "needs 2 more voices to reach its floor", "a few good judgments from decided", "new — evidence just starting". A deadlocked race's meter goes grey and its caption sends it to the bounty board: more judgments won't move it; only a new proposal can.

On a decision card the meter sits at the **foot**, under Submit (Ed, 95); in the queue it stays on the card face, where it is what the sort order is made of.

And the queue order **is** this number, weighted by your personal leverage — races near their floor that *you* haven't judged rank highest, because your judgment moves them most (the router's unheard boost). The meter is the queue's visible rationale: sort order stops being mysterious the moment each entry shows why it's worth your attention.

## One rail, three states (Ed, 51)

The queue rail (on the right since 61) is a single list with no dividers — colour is the grammar. White cards with a pale blue wash **need you**. Once judged they slide down into the **still deciding** band: wash still filling (your judgment moved the race but didn't close it), your verdict shown, and — decision 50 — **clickable to change your mind**, because a judgment is a living opinion while its question lives. When a race resolves it turns **sealed**: green, full, locked, inert. A judgment also locks when the ground shifts under it — the Garden entry demonstrates: your verdict became a fact about text that no longer exists, and new pairs will be served fresh (SPEC §4.4).

## When the ground moves under you (Ed, point 3; revised 63; superseded 203)

The document can change after you've cleared your queue. The banner that used to announce this went at 63 — a modal-ish strip at the top of the page made an ambient fact into an interruption, and announced it in the wrong place: at the top of the document rather than at the paragraph that moved. Its replacement was the **freshness-highlight**: a paragraph adopted since you last looked lit purple and cooled over a few minutes, with a chip in the gutter opening a small "what changed here" card.

**All of that is now gone too** (Ed, 203). An adoption you have not seen is an unacknowledged sealed decision, which says the same thing with the whole ranked field, the confidence, the quorum and a real acknowledgement. See *One mechanism for an adoption*, above. The lesson worth keeping from the two passes is the one 63 established and 203 finished: an ambient fact should be reported **at the place it happened**, and it should only ever be reported once.

## Chips in the gutter, gaps in the text (Ed, 64 and 65)

Anchor chips have moved out of the text and into a **chip-gutter** down the left margin. Floating right, they interrupted the ragged edge of the paragraph and read as part of the sentence; stacked in the margin they read as marginalia, which is what they are — and a paragraph carrying two of them (§ Money, in both a race and a rename) now shows both without either shoving the other around. The prose column is left unbroken, which is the whole premise of the surface: it should be a document you can read.

The **insert-anchor** is three lines deep rather than a hairline rule. A proposed new section is the one suggestion that has no text of its own to attach to, and giving it a hairline made it read as a divider between existing sections rather than as an absence. At three lines it is a **held-open gap** — the document visibly makes room for something that isn't there yet, which is both more honest about what is being proposed and much harder to scroll past.

## Elevation (Ed, 90)

Three planes, on Bootstrap's own shadow ladder. The **document is the ground** and carries no shadow at all — it is the thing everything else is about, and giving it a lift would put the charter on the same footing as the machinery. **Queue cards** rest just above it on `--shadow-sm`, and gain `--shadow-md` on hover, so the rail reads as a stack of things you can pick up. The **open decision card** floats highest on `--shadow-lg`, which is what you want from a surface that has interrupted the document to ask you something.

The shadows are **neutral, not tinted**. The previous ones were coloured to match each card's border, which read as a glow — an emphasis effect — rather than as height. The border already says what kind of card this is; the shadow only has to say how far off the page it sits, and a grey shadow says that more honestly than a pink one.

Nothing inside a card is elevated: rationales, lanes and the commit row are all flat. A card should read as one object that has risen off the page, not as a tray of smaller objects each at its own height.

## What is deliberately absent

- **No authors, no counts, no standings.** Rationales are unsigned; nothing shows how many approvals a suggestion has or which way they lean. (The anchor chips name the *kind* of attention needed, never the direction of evidence.)
- **No red-pen clutter by default.** Suggestions are anchors until opened; the document stays a document, not a battlefield diagram.
- **Nothing underneath the view** (Ed, 76). The three columns are the whole page; there is no footer, no notes, no second region to scroll into. What lies below the last line of the charter is empty scroll runway, not content.


## The alphabet says what act is wanted (Ed, 241)

Ed's observation: a rail entry is somebody's **proposal**, not a question the system invented, so ❓ was describing the wrong object. My first answer was to resist — 💡 was already spoken for by *write one*, and if every ordinary entry wore a lightbulb the surface would lose its ability to say "this one is different: don't judge it, draft" — which is the whole job of ❌.

He then made the move I had missed: promote the *action* to its own glyph. **❓ → 💡, and 💡 → ✏️.** The objection dissolves, because nothing is overloaded — and each glyph lands nearer its job than before. A bulb is about having had an idea, which is the object sitting on the table; a pencil is about writing, which is the act. It also quietly fixes a clash the notes had already flagged and shrugged at: ❓ renders red in most emoji fonts while its card washes yellow, so glyph and hue disagreed. 💡 is yellow.

The reason this alphabet keeps surviving contact is that it answers exactly one question — *what act is wanted here* — and every proposed change gets tested against that. 💡 judge this · ❌ draft, judging won't help · ⚖️ rank these two questions · ✏️ write · ⏳ nothing, it's running · ✅❎ read the outcome · ☑️ nothing at all.

One consequence to build into the composing surface: ✏️ is both an action on a button and the state of *your own* draft before you propose it. That is the same overload I objected to in 💡, but it is harmless here because the subject and the act agree — in both cases it is you, writing. Under the old scheme 💡-as-state would have meant somebody else's idea while 💡-as-button meant your writing, which is two subjects wearing one mark.

## Two rail rules settled (Ed, 222 and 223)

**The open entry's claim is now absolute.** It always had first claim on its clause's line in principle, but a later band-clamping pass could overrule it, and on a clause late in the charter with a dozen entries above it that shoved the open entry hundreds of pixels from the clause its wire points at — measured at **893px** on the previous build. Entries that cannot fit around the open one are now dropped into the *+N further off in the charter* count instead. Measured after: **0px, every time.** The trade only became fair once the rail admitted by urgency, because "what did not fit" is now the ordinary reported outcome rather than an exception. The oddity to accept is that a higher-ranked entry can be dropped to keep a lower-ranked open one flat, which is right on the grounds that the open card is the thing the reader is actually looking at.

**A deadlocked race is ranked by its bounty score.** Ranking it on urgency buried it, because a deadlocked race scores ~0 there *by definition* — no judgment of yours can move it (SPEC §8.3). But that is not a low-value entry; it is the highest-leverage thing on the surface, and the scale was simply measuring the wrong act: judgment leverage is nil precisely because *drafting* leverage is maximal. It now ranks on resolvable disagreement × salience, which engine-core already computes for the bounty board, mapped to the top of the range — so the rail and the board agree with each other instead of disagreeing. It can out-rank the flame in the sort, which costs nothing: the flame is kept regardless of room, so its primacy rests on the exemption rather than on where it sits in the order.
