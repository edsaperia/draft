# Design notes — the session view (default surface), second pass

Desktop-first · light mode · Bootstrap-plain (visual design deferred) · content from run clubhouse-1 · the race-card mockup is this surface's escalation state.

These notes used to live at the bottom of `design/session-view.html`. They were moved out on 2026-08-15 (Ed, 76): nothing sits underneath the three-column view any more. The mockup is the artefact; this is its reasoning.

**How to read this.** The sections run roughly in the order the decisions were taken, each headed with Ed's number for the instruction that prompted it, so an argument can be traced back to the moment it was had. Where a later pass overturned an earlier one the earlier section says so and points forward — nothing is deleted, because the reasoning that was rejected is usually the reasoning you need when the question comes round again. **The design system below is the current state**; everything after it is how it got there.

## The design system (housekeeping pass, 2026-08-16)

The stylesheet is tokenised. Anything hard-coded outside this list is a mistake rather than a decision.

**Colour.** Ink and ground: `--bg --fg --muted --border --light`. One accent, `--primary` and its hover/subtle/emphasis, used for every open card, every wire, and every selection (Ed, 198). One success, `--ok` and its hover/subtle, meaning *decided* and nothing else — the winning text in a record, and the tick that commits.

**Lifecycle** is its own five-part palette, held as raw RGB channels because the wash varies its strength: `--lc-urgent` (🔥 orange), `--lc-open` (💡 ❌ yellow), `--lc-deciding` (⏳ blue), `--lc-yours` (✏️ and a green 💡 — a proposal of your own, added 2026-08-16 with the composer), `--lc-closed` (✅ ❎ 🔄 ☑️ grey). One rule governs it — **colour means you can still affect it; grey means the door is shut** (Ed, 164) — and it is applied identically in three places: the queue card's wash, the paragraph's wash in the document, and the mark in the gutter.

Green was available in the rail precisely because of 164: every decided state washes grey there, so `--ok` appears only *inside* cards and the two greens never meet. That is a real dependency between two decisions rather than a coincidence, and it is the thing to check first if either moves (Q264).

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

**Clamped**, and originally clamped *by tier* so it rode the compression ladder from 104 rather than fighting it: five lines on the 🔥 card, two on a hot one, one on a warm one, none on a cold one. The ladder went on 2026-08-16 and every open card now gets four lines, five on the 🔥 one — see *Fewer cards, each saying its whole piece*.

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

The compression ladder — since removed — could not be judged, because the rail held three hot entries, two warm and exactly one cool. Ten more live suggestions now spread down the urgency range — ordinary charter housekeeping, the kind of thing a convention actually spends an afternoon on: a joke about an armchair that is not a rule, a year that should be two years, a flat ban on power tools that only somebody unemployed could obey.

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

## The edit-wallet (Ed, 2026-08-16)

A token is renamed to an **edit** and drawn as the writing glyph: `your edits ✏️✏️✏️✏️✏️`, one leaving each time you spend, with a tray under the next one that fills as the drip accrues. The rename is the substance of it. "You have five tokens" needs a sentence somewhere explaining what a token is for; "you have five edits" needs none, and it lands on the same glyph that 241 gave to writing, so the wallet, the propose button and an unproposed draft of your own are visibly the same currency.

**The tray is the queue card's wash, reused.** Same device — a hard-stopped linear gradient whose fill is a fraction — carrying a second magnitude rather than inventing a second mechanism for it. It sits under the **next** pencil rather than behind the whole row, which is a small decision worth writing down: a wash behind the row fills left-to-right *across pencils you already hold*, and reads as "some of my edits are highlighted" rather than "this much of the way to another one". Under a single ghost pencil it can only mean the one thing.

The two magnitudes stay separate under use: spending removes a pencil and leaves the tray exactly where it was, because how many you have and how close the next one is are unrelated facts.

**Three states.** Holding some: pencils plus tray. At the cap: pencils, no tray, because nothing is accruing and a tray that can never fill is furniture. Empty: no pencils, the label goes quiet, and the propose button greys with the reason in its tooltip — the same *grey means the door is shut* rule the rest of the surface uses, applied to a door shut by economics rather than by lifecycle.

**The price is said at the point of sale, in words.** The button reads *✏️ Propose something else · costs one edit*. The leading ✏️ is the action; the cost is spelled out rather than drawn, because two pencils in one button would be two meanings wearing one glyph. The *balance* lives in the wallet and nowhere else, which retires the `propose (4 left)` placeholder from 234 — that was explicitly a stopgap until the token UX was designed, and this is it.

**What the mockup cannot show, and the open question underneath.** The drip is one edit per 10% of the window, so the tray fills over roughly a quarter of an hour of real session time — not something a mockup can animate meaningfully, so the fixture simply sits at three-fifths. More importantly, §7's calibration note (sim evidence, 2026-08-14) says participants **sit near the cap** at v1 defaults: a real member would see eight full pencils all session and a device that never moves. Two risks in that, recorded as Q251. A wallet that never changes is not earning its place. And a visibly depleting wallet reintroduces psychological friction that the economy does not actually require — people are thriftier with four visible pencils than with an abstract balance they never see — which cuts against the whole point of a composer designed to make proposing feel free. Either the economy tightens enough for the display to be honest, or the wallet stays quiet while it is full.

Ed's later note closes part of that loop: the **starting number and the drip rate are creation-time constitutional parameters** (SPEC §9.0), alongside quorum and the bar. A document meant to move quickly and one meant to be hard to change want different answers, and members can read the difference off their own wallets from the first minute.

## The composer (Ed, 224–241; built 2026-08-16)

There is no composing surface. **You compose by editing the charter.** Every clause carries a caret; the first character you type opens that clause into two lanes — what it says on the left, what you are making it say on the right — with your rationale above and Propose / Cancel below. The briefing, the drafting desk and the arrival bar of `design/composer.html` are superseded by this. What survives of that mockup is the briefing, and only as an escalation state that unrolls above the lanes where there is no live judgment left to contaminate (SPEC §3.5).

Ed's instruction was one sentence — *you should start composing just by editing the document as if it were WYSIWYG* — and almost everything below is a consequence of taking it literally.

### The caret is the offer, and the keystroke is the door

The paragraph is no longer a button. Clicking a challenged clause used to open its decision card; that is now the **gutter mark's** job and only its job (Ed, 224), which is why the mark grew from a 14px glyph with two pixels of padding into a real 24×22 target with a ground that comes up under the pointer. It had been the label on a much larger target, and now it *is* the target.

What the text does instead is take a caret. Every clause in the charter is `contenteditable`, and **every input into one is refused**: `beforeinput` is intercepted on the whole document, the keystroke never lands in the prose, and what it does instead is open the composer with that character already applied. This is the part worth being careful about, because it is what makes it safe to put a caret in a constitutional document at all — nothing you do in the prose can change it, because changing it is a thing you *propose*. The charter is never edited in place, not even for a frame.

Three consequences fall out of the same rule. **Backspace and paste work** — they are inputs like any other, so they open the composer with the deletion or the pasted run already applied. **Enter at the end of a clause makes a new clause and leaves the old one alone** (Ed, 231), which needs no special case: the lane holds a run of paragraphs, so a newline at the end is simply an empty second block. And **nothing is spent by any of it**: opening the composer, writing in it and cancelling are all free, because SPEC §3.3 charges the stake at *submission*. A caret in every paragraph would be a threat if it cost something to touch.

### The clause becomes the card

The editing-card **replaces** the paragraph rather than opening beneath it. This is the one place the surface departs from card-under-clause, and it is a deliberate departure: a card below would leave the original standing above its own copy and read as a form that had appeared *about* the paragraph, rather than as the paragraph itself opening up. The left lane carries the clause's `data-key`, so the wires, the margin geometry and the scroll anchoring all keep working on it without knowing it is a card.

That last part took a measurement to get right. The card puts a rationale field above the lanes, so the clause ends up about 80px lower inside the card than the paragraph was — and `keepStill`, holding whatever was nearest the read line, dutifully held the *paragraphs above* and let the words under the caret slide 82px down the screen at the exact moment you started typing. **Measured at 82px before, 0px after**: the composer now names its own anchor (`holdSel` asks the draft first), so the clause you are writing in does not move and everything above it gives way instead. That is the right way round — the caret is the thing the reader is looking at.

For the same reason the editing-card is the **one card that does not animate**. Every other card unrolls under its clause, where growing from nothing reads as the card arriving; this one stands where the clause stood, so an unroll would mean the paragraph vanishing and something else growing in the hole. It swaps, held still, and that also keeps the caret out of a zero-height `overflow: hidden` box, which is where focus goes strange.

### A draft is a suggestion like any other

Held in `SUGGS` with `mine` and `unproposed` set. That is not tidiness, it is most of the build: the rail, the wires, the folding, the contents-rail marks and the margin's pinning all work on a draft without being told what it is. It also makes the composer's whole lifecycle a matter of flipping two flags rather than a second state machine running beside the first.

**A site is a run of adjacent clauses.** Editing across a paragraph break joins the two into one piece of text (Ed, 225) rather than making a second place; editing somewhere else entirely makes a second site, and then the draft is a patch in the making (Ed, 232) — a card at each place, one Propose for the lot, the sibling entries cabled together on the spine the multi-site machinery already draws (Ed, 237). Adjacency is literal and needs no rule of its own: a heading between two clauses means they are not neighbours in `DOC`, so they never merge.

There is **one draft at a time**, because there is one caret. Proposing frees the composer by giving the candidate a real id, so the next thing you write starts clean.

### Green, and what it is for

Ed asked for a new lifecycle whose card is green and which stays pinned until it is resolved-and-read. It is the fifth state, `yours`, and it covers a proposal of your own from the first keystroke to the moment it seals.

**Green was free.** Under 164 every decided state washes grey, so `--ok`'s green survives only *inside* cards — the winning text in a record, the tick that commits — and never appears in a margin. So the rail could take it without collision. What it means there is the thing 164's rule is about: you can still act on this. Cancel it while it is a draft, withdraw it once it is in (Ed, 240).

**It sits outside the judge's ladder entirely**, and that is the honest reason it needed its own state rather than a tint on an existing one. It is not a question put to you — SPEC §3.3 counts your preference for your own candidate without asking — and it is not settled either. The other four states are all positions in *your relationship to a question*; this one is a fact about *your relationship to a text*.

**Two shapes, and the difference between them is writing versus waiting.** While it is a draft it is a full card in the rail, because that entry is where you read your own rationale back as you type it — Ed asked for the preview explicitly, and it appears from the first keystroke and disappears if you cancel. It carries **no fill**, because there is nothing yet to be close to: an unproposed draft is not in a race, so the wash is flat rather than a progress bar sitting at zero. Once proposed it becomes **one line**, because nothing is being asked of you and a card explaining itself would be a card with nothing to say — and the fill arrives, which is the whole of the feedback you get on your own proposal (Ed, 227).

**It is never crowded off the screen.** The rail admits by *judgment* leverage, and a proposal of yours scores nothing there by construction — yet it is the entry with the largest act still attached to it. Rather than give it a fictional urgency, it is taken out of the ranking, force-kept alongside the flame and the open card. Ed's 240 is the argument: green cards can always be withdrawn, so there is always something to do, and quite a significant something.

The marks follow 241's rule — *what act is wanted here*. **✏️ while it is a draft**, which is the same overload 241 already blessed: the pencil is the writing action and the state of your own unproposed writing, and subject and act agree because in both cases it is you, writing. **💡 once you propose it**, because the thing on the table is then an ordinary proposal and green is what says it is yours. (Q260 records the cost of that: the contents rail draws marks without their card colour, so up there a proposal of yours and somebody else's are the same bulb.)

### Two ways in from a card you are reading

**✏️ on either lane** (Ed, 228): take *this* wording as your starting point. It puts that text on the left and an editable copy on the right, which is exactly what you want when the thing that inspired you is a rival's proposal rather than the charter — Ed's 229, *or against whatever text inspired you to propose*. On a quick card or a patch the left lane is the current text, so its ✏️ needs no seed at all; the right lane's carries the proposal as it would stand.

**"Propose something else"** survives only on a **deadlocked** race. That is the one card where drafting is the ask rather than an extra: no judgment can move it (SPEC §8.3), and what it wants is not a better version of either side but something spanning both (SPEC §6.3, Q168). On an ordinary card two lane buttons are already two routes to the composer and a third would be ink for its own sake. It no longer states a price either, because it no longer charges one.

**The price moved to the point of sale.** 668's rule — say the cost in words, where the sale happens — still holds; the sale simply turned out to be somewhere else. Opening the composer is free, so the cost is stated on the **Propose** button, which reads *✏️ Propose · costs one edit* and greys with its reason in the tooltip when the wallet is empty. That retires 234's `propose (4 left)` placeholder for the second and last time.

### What the card says, and what it refuses to

The footer states the one thing a member cannot see: whether this **opens** a race against the current text or **joins** one already running (Ed, 229). If it joins, it says you will still be asked to judge yours against the others — Ed's 236, and the half of §3.3 that is not automatic. Your own preference is counted without asking; everything else in the race is still a question put to you.

The proposed card then says the same fact from the other end, in the one block of prose on the surface that is addressed to you as author: *nobody asks you to judge it — a proposal you are still standing behind counts as your preference for as long as it is live, and counts toward quorum.* That is SPEC §3.3 and §8.2 in a sentence, and it is the single least obvious thing about the mechanism from a member's chair. Your proposal is on the **right**, which is where it will be wherever it is shown to you (Ed, 229).

**Withdrawal is an ordinary outline button, not a red one.** SPEC §3.3a returns the stake in full, and §7's reasoning is that charging somebody to tidy up prices exactly the behaviour worth encouraging. Rewording is withdraw-and-write-again, which the footer says; there is no revise, because revising in place would be a second candidate wearing the first one's evidence.

### What this does to the wallet

It makes it move, which Q251 said it did not. Proposing spends a pencil and withdrawing gives it back, so the wallet is now the only thing on the surface that answers your own actions — and the fixture is small enough to watch it do so. That does not settle Q251: at v1 defaults a real member still sits near the cap and would see eight pencils all session. But the device is no longer purely decorative, and the two magnitudes stay separate under use, which was the thing worth checking.

### What was measured

The clause under the caret travels **0px** when the composer opens, and **0px** when an adjacent clause is absorbed into an open one (82px before the anchor fix). Every card kind opens and closes without error — race, patch, quick, insert, diagonal, deadlocked, still-deciding, unread seal, sealed dot, and now editing and proposed. Propose, withdraw, cancel, both lane routes, the deadlocked bridge route and folding-with-the-composer-open all run clean, and the wallet returns to where it started after a propose-then-withdraw round trip. The one overlap the margin still shows at two scroll positions is **Q244, unchanged**: confirmed identical on the pre-composer build at the same offsets, pinned-over-flow, same shape as reported.

### Three corrections the first build needed (Ed, 2026-08-16)

**✏️ all the way to the seal** (Ed, 260). It had been ✏️ while unproposed and then the ordinary 💡, on the reading that a proposal of yours is a proposal like any other and the green says whose. That works wherever the green travels with the mark — the queue card, the paragraph's wash — but the `contents-rail` draws marks with **no colour at all**, deliberately, so up there your own work and somebody else's were the same bulb, and a section holding nothing but your own proposals looked like a section wanting your judgment. The pencil is the answer, and it is the rule 241's own note was already reaching for: **✏️ means *you wrote this***, and subject and act agree because in both cases it is you, writing. The alphabet stays one question wide — *what act is wanted here* — with the pencil answering it for the two cases that are yours.

**The right lane marks its own changes** (Ed, 263), the same way every other pair does: 91's treatment exactly, the result rather than a redline, only the new wording lit and nothing struck through. It is the right answer to the question it was given, and it is better than the one I had proposed.

I had suggested that a draft with no net change should quietly cancel itself, so a stray keystroke never advertised a proposal nobody meant to make. That would have had the surface making a judgment about somebody's typing on their behalf, which is the one thing an editor must not do. Marking the changes solves it from the other end and gives up nothing: **a draft that changes nothing shows no green at all**, so it is visibly not a draft of anything, and the decision about what to do with it stays where it belongs. The general shape is worth keeping — where a surface is tempted to act for the reader, showing them the thing they would have acted on is usually available and usually better.

It also means a proposal of yours reads, while you are writing it, exactly as it will read to everybody else when they judge it. The diff is word-level with whitespace as its own token, so a changed word lights the word rather than the sentence; a space caught between two new words joins them, because rewriting three words is one change and should be one mark; and insertions only, because what was removed is one column to the left in full.

*What this costs, recorded because the product should not inherit it.* Marking as you type means rewriting the lane's markup under the caret, so the caret is taken out by character offset and put back — the same hold-by-position rule the scroll anchoring uses, for the same reason. That works, and it discards the browser's native undo stack: ctrl-Z does nothing in that lane. A real editor (ProseMirror, CodeMirror) does this job while keeping undo, which is an argument for reaching for one when this is built for real rather than for showing the design without its highlighting.

One knock-on: the editing lane's ring is now the **blue** rather than green. Green inside a lane means *new wording* now, and a green box drawn around green words would be two meanings in one hue an inch apart. Blue is what 198 already reserves for the active thing.

**The cable lands on the card, not inside it.** The wire targeted the left-hand lane, on the reasoning that the lane is the original standing in for the clause the card replaced. But a wire arrives from the right, and the left lane's right edge is in the *middle* of the card — so every cable ran straight through the lane you were typing in and stopped in the gutter between the two. Both the wire and the rail entry now take the whole card as their target, which also fixes a second-order version of the same problem: the entry had been levelled against the clause *inside* the card and so sat about eighty pixels below where its own cable left. Measured after: the entry sits level with the card and the wire runs flat to its right edge.

Worth naming the rule this is the third instance of. **A wire says where a judgment lives, and the thing it points at has to be the thing the entry stands for.** The diagonal broke it by falling through a dead colour lookup, the sealed dots broke it by letting a row stand in for the glyphs inside it, and this broke it by letting a lane stand in for the card. Same shape each time: a part standing in for its whole, and nothing complaining.

## The QA pass on the card (Ed, 2026-08-16)

Four notes, of which two were instructions and two were invitations to go and look.

### The rails stop explaining themselves

The long paragraph at the top of the `needs-you-queue` and the shorter one under the `contents-rail` are gone. Both were written while the rail's grammar was being argued out, and both had become a design note printed inside the design — the surface telling the reader what it means instead of meaning it. The queue's note in particular had grown to eight sentences explaining colour, fill, urgency, admission and the three quiet states, which is a fair summary of everything decided between 104 and 223 and exactly the wrong thing to hand a member who has opened the charter to read it. Where those rules are still true they should be legible from the rail; where they are not, the note was propping them up. The two eyebrows stay, because a column of things wants a name.

### Depth is a light source, not a halo

The elevation ladder was Bootstrap's, and Bootstrap's is built for dialogs floating over an empty backdrop: `--shadow-lg` was three rems of blur at 17.5% black. On a card the size of a paragraph, sitting inside a column of text, that reads as a dark glow round the edge rather than as height — the card looks lit from behind instead of resting above the page.

Each step is now a **contact shadow** — one pixel, tight, the card meeting the paper — plus a single soft cast whose blur stays near two and a half times its offset, which is roughly what a real light source does. Total ink is about halved. What did not change is the ladder itself: still three steps, still neutral rather than tinted, still the same three users (a rail card, a rail card under the pointer, an open decision card). Only the shape of the thing.

Worth noticing what this exposed: with the glow gone, the open card is held almost entirely by its blue outline. That is the right answer — 198 already made the blue the one accent — but it is also why the inner boxes started to look like a second statement of something already said, which is half of 269.

### The card reads in a new order

Ed's third note set the sequence: **status quo, then the texts being compared, then the rationale with the lifecycle mark to its left, then the buttons.** That reverses 87, which had put the reason above the wording so you met the argument first. Both orders have a case. 87's was that a rationale explains why you are being asked at all. The new one's is stronger: you form your own view of the wording before anybody tells you what to think of it, which matters more on a surface whose whole discipline is blind judgment. The cost is real and should be said — a rationale explaining an unusual choice now arrives after the choice has been read, so a proposal that looks wrong until you know why will look wrong for a second longer.

The mark hangs in the card's **left padding** rather than in the flow. Put in the flow it would need a column of its own, which would shunt a race's two rationales right by the width of a glyph and break the alignment 95 built between each rationale and its lane. In the padding they stay in their columns and the glyph reads as a margin annotation — which is also what it is doing in the other two places it appears.

The status quo is the interesting half, because *where* it goes turned out to depend on what the card is actually asking. On a **race** the answer is unambiguous: both lanes are challengers, nothing on the card can vote to keep the clause — displacement is settled by the adoption-threshold (SPEC §5), not by this judgment — so the block is reference only, greyed, with no controls at all. And it was genuinely missing: a reader was being asked to choose between two rewrites of a clause without being shown the clause. On a **quick card or a patch** the incumbent *is* one of the two things being judged, and it can sit on top or stay in its lane. That one is switchable and is 268; building both made the case fairly clearly, and it is written up there.

### The lanes stop being buttons

197 made the lane itself the control, on the argument that clicking the text you prefer is the most direct statement a card can make of what it is asking. Ed's own reading is that this was wrong, and the reason it was wrong is not aesthetic. Since 224 every paragraph of the charter carries a caret, and clicking a paragraph means *put the caret here* — so the one gesture the surface had trained into the reader was now being asked to mean two incompatible things depending on whether the paragraph happened to be inside a card. A whole clause is in any case a very large target for a very precise claim.

So each text grows a **lane-bar** at its foot: a radio marked *Prefer this*, and the ✏️ *edit this* that was already living there and reading well. The rule that decides what may go in it is worth stating, because it will decide the next control too — **a lane may carry what is about that lane, and nothing else.** Indifference is a judgment about the *pair* (SPEC §3.2) and Submit commits the whole card, so both stay underneath, which is what Ed asked for and also what the mechanism requires.

A radio rather than a button because that is exactly the shape of the thing: one choice among the texts on this card, or none of them yet. It also makes the incumbent's own claim legible on a quick card — with the status quo on top carrying a radio of its own, "keep the clause" stops being *the lane on the left* and becomes an option in a list, which is what it always was.

Two implementation notes. The pick control carries both labels in the markup with CSS choosing between them, so `choose()` stays a single attribute flip and a patch's several open cards keep moving together without re-rendering. And the whole change cost nothing in the selection machinery: `data-v` simply moved from the lane div to the button inside it.

### The lab

Two of these are not settled, and the honest way to hold an unsettled visual question is not to argue about it in prose. There is a small dashed panel at the bottom left of session-view with two switches — where the status quo goes, and whether lanes are boxed or divided by a hairline. It is deliberately out of world: monospace, dashed, in the corner, obviously scaffolding. It goes when the two questions have answers (268, 269).

Building both sides of both axes was worth more than the switches are. `on top` on a quick card puts the same sentence on screen three times in thirty centimetres — the clause in the charter, the block restating it, the proposal repeating all but a few words — which is a thing you cannot see from a description, because the description does not mention that a card opens *directly beneath the clause it argues about*. The incumbent was never missing from the screen; it was missing from the race card only. And `hairline` turned out to fix something the boxes were hiding: with the boxes gone the rule between the two lanes lines up exactly with the rule between the two rationales below them, and the card reads as two columns rather than as two objects with a gap between them.

### One thing found while measuring

The responsive rules for the two rails had never worked. `@media (max-width: 1240px) { .toc { display: none } }` sat above `.toc { display: flex }` in the same sheet at the same specificity, so the later rule won and the media query was dead — and the same for both rules in the 900px block. Below 1240px the contents rail stayed visible and took the document's column, leaving the charter in the 290px one meant for the margin. It had simply never been looked at below 1240, which is the width the design has always been read at. Fixed by scoping the overrides to `.layout > .toc` so they outrank the base rules.

Two things to keep from that. A media query that loses on specificity fails **silently and completely** — there is no warning, and the layout it was protecting is only wrong at widths nobody opens. And the reason it surfaced at all is that a measurement pass opens the page at whatever width the tooling gives you rather than at the width you designed for, which is an argument for doing more of them.

## Rebuilding the card as a post and its replies (Ed, 2026-08-16)

Ed's second note on the QA build was the substantial one, and it came in four parts: the clause in the document sitting above the card should be lifted into it or otherwise connected to it; the cards conform to no recognised UX pattern; the rationale is *the comment*, so it belongs at the foot of *the post* — but nothing says a person is saying it; and there should be one card, with only small changes between types.

Those look like four notes. They are one.

### What the card actually is

Work out what object is on the screen and the pattern names itself. Somebody has proposed a change to a clause. Others may have proposed rival changes. Each of them argued for theirs. You are being asked which you prefer. That is a post and its replies — and the reply is where the argument lives, because the argument belongs to the person who made it and not to the card.

Once you see it that way the first note is not a separate request. The post *is* the clause. If the card is a post-with-replies then the clause has to be inside it, and if the clause is inside it then it cannot also be outside it. So:

**The card is the clause, opened.** It replaces its paragraph rather than sprouting beneath it. The clause becomes the head of the card, the field of proposals sits under it, and the thing being proposed about appears exactly once on the screen.

That is not a new mechanism — it is what the composer has done since 224, and 265 was already asking why the composer replaced its clause when nothing else did. The answer turns out to be that nothing else *should* have been different.

### One card, and the small changes

| | head | field |
|---|---|---|
| quick card | the clause, and it picks | one proposal |
| a proposed section | the gap, and it picks | one proposal, heading and all |
| patch | the clause at this place, and it picks | one proposal · plus the ↑↓ stepper |
| race | the clause, **and it does not pick** | two proposals |
| your live proposal | the clause | your proposal · Withdraw instead of a commit row |
| sealed record | the clause as it now stands | the whole field, ranked, with its numbers |

The one structural difference in that table is the race's head, and it is not a style choice: on a race both candidates are challengers and **nothing on the card can vote to keep the clause**. Displacement is settled by the adoption-threshold (SPEC §5), not by this judgment. So the head carries a pick control exactly where the judgment can actually keep the clause, and on a race it is reference. That was also the thing the race card had been missing outright — a reader was being asked to choose between two rewrites without being shown what they rewrite.

Worth naming the confirmation: **the sealed record already had this shape** — the text that stands, then the whole field ranked beneath it (112/120/121). The live card was moved to match the record rather than the other way about, and a live card and its record are now the same object in two tenses. That is most of what "one card" means in practice, and it is a good sign that the shape was already there in the one place where the design had had to be complete.

### Somebody said this

The rationale was drawn bold, at UI weight, above the lanes. Bold is what a *heading* is, and a heading is something the system wrote. Ed's word for it is the comment, and a comment has an author.

The author is exactly what this mechanism will not tell you (SPEC §3.4, sealed until the record). So the disc is blank — head and shoulders, drawn in the ground colour, the placeholder every product uses for somebody it cannot name. Drawing the speaker and leaving them faceless **states the discipline instead of hiding it**: you can see that a person argued this, and see that you are not allowed to know who. A rationale with no speaker at all was quietly pretending the question of authorship did not arise.

It also fixes something the old card got wrong on a race. Two rationales in a row beneath two lanes made you map column to column to work out whose argument was whose. Attached to its own proposal, each argument is simply where its wording is.

The disc had to be drawn rather than left as a plain grey circle: a bare disc reads as a bullet, and a bullet says *list item* where this has to say *person*.

### What the stacking cost, and what it forced

**A proposal has to show what it removes.** 91 said the lanes show the result rather than a redline, and it was right *while the current text was in the next column* — you could see what had gone by looking left. Stacked, nothing is in the next column, and a proposal whose only change is a deletion would render as a sentence identical to the clause above it. So a proposal states both halves of its own change, which is also what the pattern Ed is pointing at does.

Two things came out of building that, both of them measurements rather than opinions. A redline is informative in proportion to how much of the sentence survives it, and the fixture's own races are whole rewrites rather than edits — one clause came back with nineteen cuts and twenty insertions, which is confetti, not a comparison. So there is a floor: below half surviving, the proposal states itself plainly and the comparison is with the clause one line above. And punctuation had to become its own token, because glued to the word a clause that merely gained a comma rendered as the word deleted and an identical word inserted — *used on ~~bone~~ bone,* — which is nonsense the reader has to see through. Both improve the composer's own marking as a side effect.

**Cards no longer animate open.** A card standing where its clause stood has no gap to unroll into; animating one reads as the paragraph vanishing and a card growing in the hole. That is why the composer has never animated, and now nothing does. It is a real loss and it is logged as 273 rather than glossed over — the swap is at least instant, and the honest animation for a substitution is a cross-fade rather than an unroll, if it turns out to be wanted.

**Marks belonging to other suggestions had to travel.** A clause can carry more than one live proposal, and its gutter held a mark for each. Swallow the paragraph and the others lose their way in — so they move into the head, labelled *also here*, because an unlabelled 💡 beside the card's own 💡 is one glyph meaning two things a hand's width apart.

**The rail had to be told.** A wire says where a judgment lives, and it now lives in the card at every clause rather than only under the composer. Same rule, third and fourth application: `anchorForEntry` and `wireTargets` take the card, never the clause inside it.

### Found on the way

The sealed record had two defects that only became visible once it had a head above it. Its ranked blocks were printing the field label a second time as their own — *What was proposed✓ this is the text that stands* — and `.rtag` / `.rsub` were scoped to `.rcand`, so the record's own blocks had never picked up either rule and the verdict ran on into the end of the label. Both fixed. The second is the same shape as the dead media queries found in the previous pass: **a rule that never matched fails silently**, and the only thing that finds it is looking at the thing it was supposed to style.

### Settling it: the trio, and the last paired card (Ed, 2026-08-16)

**Stacked, so the lab goes.** The `paired` code paths and the switch are deleted rather than left in place. A lab exists because an answer is not known; keeping it after the answer is known just leaves two designs to maintain and a quiet invitation to relitigate.

**Indifference is the last radio in the trio.** 209 and 213 had the shrug and the tick sharing one slot, both drawn as emoji, on the reasoning that the row was two gestures rather than two sentences. That was built when nothing else on the card was a control — the lanes *were* the buttons, so the only two controls on the surface were at the bottom and could afford to be pictograms.

Now every candidate carries a radio, and the question the card asks has exactly three answers: this one, that one, neither. Drawing two of them as radios and the third as a shrug said they were different kinds of act, and they are not. So indifference joins the alphabet: same radio, same label treatment, the word rather than the glyph.

What does *not* change is where it sits. Indifference is a judgment about the **pair** (SPEC §3.2), not about either text, so it cannot go in a lane — it stays at the foot with the other act that is about the whole card. Being last in the trio and first in the row is exactly right for it: it is the answer you reach for when the two above have not settled it.

**The tick is always there, greyed.** 202 said a disabled button is a thing you are being told off by, and an absent one is simply the next step not having arrived. Against that: an absent button gives the row no shape, and gives a reader who has just opened their first card no idea what finishing looks like. A greyed tick in the bottom-right corner says *this is where this ends* from the moment the card opens, and it costs nothing, because nothing about it nags — it is the quietest thing on the card until you have chosen. It greys properly rather than merely fading, too: a pale green tick reads as a tick that has already been pressed, which is the one thing it must not say.

🤷 has left the surface. Worth noticing that the whole commit row is now wordless-free — no emoji at all in the card's controls, where it used to have two.

**And the composer stops being the exception.** Ed asked why the editing card was still paired, and the honest answer is that there was no good reason. What I had written down was that while writing you want the original beside you rather than above you, level with what you are typing line for line. It does not survive contact with the built thing: the original is one line up; your own additions are marked green as you type (263), so you can see your change without a reference column; and a full-width lane is a far better place to write a paragraph of constitutional prose than a 300px one. The real reason it stayed paired is that it had been signed off in that shape and I did not re-examine it when the ground moved.

So it is now clause-at-the-head like everything else, with your draft as the single reply. That took 270 with it: the rationale field moved out of the top of the card and into the `sealed-speaker`'s own slot beneath the wording, behind the same blank disc everybody else's sits behind. Which turns out to be the better answer for a reason I had not seen — **you write the sentence in the place, and at the weight, that everybody else will read it in.** The old card had you composing a rationale in a form field at the top and then discovering later what it looked like as a comment. Now there is nothing to discover.

One box survives on the whole surface: the editing lane. A text editor says it is one by looking like one, and it is the only thing here that is typed into.

### The card grows out of its own clause (Ed, 273)

The swap that came in with the stacked card was correct and jarring, which are not incompatible. Correct, because a card standing where its clause stood has no gap to unroll *into*: growing it from zero meant the paragraph blinking out and something else inflating in the hole. Jarring, because instant tells you nothing — the charter below you has just moved several hundred pixels and nothing said so.

The way out is to stop treating zero as the natural starting height. **The card grows from exactly the height at which only its own head is showing** — and its head is the clause, at the size and in the place the clause already occupied. So:

- Frame one looks like the document with the paragraph still in it, wearing a card's frame.
- The gap then slides open *beneath* the clause, and the field arrives inside it.
- The body fades in sixty milliseconds behind the height, so the motion and the arrival do not compete for the same instant.
- The clause never moves. `keepStill` has already pinned it, and everything that grows, grows below it.

Closing runs the same thing backwards, down to head height — and the swap back to a plain paragraph happens at a size where a card and a paragraph are the same shape, so the substitution is never seen. On the way down the body goes first and faster, so the gap closes over something already gone rather than crushing it.

Measured on all four card kinds: the clause moves **0px**, and the gap that opens is 283px (quick), 480px (race), 411px (diagonal), 335px (record).

What appears at once rather than sliding is the card's own frame and its head label — about 84px on a quick card, most of which is the clause rewrapping to the card's narrower measure. That is not a defect to be animated away: it is the card materialising *around* the clause, which is the honest description of what has happened.

*How this was verified in a backgrounded tab, where transitions never advance.* Setting a transition's end value synchronously means reading the element's inline style afterwards always returns the end state — the start is never observable that way. But a transition that has not advanced still reports the **start** value through `getComputedStyle`, so comparing that against `headOnlyHeight()` proves the animation begins where it claims to. Worth keeping: it is the only way to check an animation's first frame in this environment.

### The diagonal joins the pattern (Ed, 276)

It had been the acknowledged exception, on the grounds that it has no clause to lift. That is true and it is not a reason: what the head slot is *for* is the thing you need before the field makes sense, and on a diagonal that is the question being put. So the head holds the ask, the field holds the two questions, and each question block carries its name, its description, the clause it is about quoted underneath, and a *Prefer this*.

Two things about it are the mechanism rather than styling. There is **no `sealed-speaker`** on either block: the line under each question describes the dispute, it is not somebody's argument for it, and drawing a person behind it would claim an author the thing does not have. And the clause sits *under* the description rather than in the wording slot, because on this card the clause is not what is being chosen between — the question is.

It left one thing behind, and it is the same shape as the complaint that started the whole rebuild. A diagonal spans two clauses and swallows only the one it stands in, so the far clause is quoted in the card while its paragraph is still in the document. Where both are on screen, the same sentence is visible twice. Logged as 277 rather than quietly accepted, because "the clause appears exactly once" is the rule the card is built on and this is the one place it does not hold.

### The redline floor, since it was asked about (Ed, 274)

A redline is informative in proportion to how much of the sentence survives it. Mark two words and the eye goes straight to them. Mark two thirds of a clause and you have not shown a change, you have shredded two sentences into one and asked the reader to reassemble them.

Race candidates are usually whole rewrites rather than edits — that is what a race *is*, two people who each wrote the clause afresh. Measured on the fixture's own races, one clause came back with nineteen cuts and twenty insertions. So below half the non-whitespace characters surviving, a proposal states itself plainly and the comparison is with the clause at the head of the card, one line above. That is also what a reader does anyway once a diff gets dense.

The rule is not in doubt; the **number** is. 0.5 was chosen because it is roughly where "an edit" stops being a fair description of what happened, and it has never been swept — the fixture has nothing between about 0.9 (a word or two changed) and about 0.2 (a rewrite), so it cannot discriminate. A real corpus would settle it, and the cost of being wrong is small and symmetrical: too low and a rewrite renders as confetti, too high and a substantial edit loses its marks.

The other half of the change is not a guess. **Punctuation is its own token**, without which a clause that merely gained a comma rendered as the word deleted and an identical word re-inserted — *used on ~~bone~~ bone,* — which is nonsense the reader has to see through. That one improves the composer's own marking as a side effect.

### The clause keeps its colour and its mark (Ed, 2026-08-17)

Two notes that turned out to be one fix.

The card had been swallowing its clause and then dropping both of the things that identified it: the lifecycle wash, and the gutter mark you had just clicked to open it. Ed's word for the result was disorientating, which is exact — you press a mark, and the mark and the colour both vanish while the text stays.

The move is to stop treating the head as a new kind of block. **The washed block inside the head is given the same box as a `.anch` paragraph** — the same negative margin, the same padding, the same radius. Everything else falls out of that: the wash lands on the same rectangle, and a `.chipcol` inside it lands in exactly the gutter column the document puts its marks in, because that column is defined relative to the same box. The card's own geometry was then set so its content column sits on the prose's axis (its width is the prose measure plus its own padding and border, centred the same way), so nothing shifts sideways either.

Measured after: the mark moves **0px in both axes** on every kind of card, and the clause text sits on the prose axis to the pixel. One correction was needed to get the vertical to zero — `data-key` had to move from the text to the washed block, because that block is what a `<p>` *is*, and holding the text instead left the scroll anchoring six pixels out. Six pixels is exactly the paragraph's own padding-top, which the text does not carry.

Two things worth keeping from this. The mark in the head is the *same control* it was in the gutter, so it closes the card as well as opening it — a toggle that never moves under the pointer. And the other suggestions at that clause no longer need the "also here" label they briefly had: they stack under the card's mark exactly as they stacked beside the paragraph, and the column says what they are because it is the same column.

### Washes move now

Ed asked for the colour change to fade rather than jump, and then generalised it: everywhere, queue cards included. Two obstacles, both instructive.

**A gradient cannot be transitioned.** The queue entry's wash was one hard-stopped `linear-gradient` carrying both the hue and the fill, and no browser interpolates between two of those. It is now a bar — a `::before` whose `width` is the fill and whose `background-color` is the hue — which gains something the gradient could not have: the fill *slides* as well, so a card getting closer to resolution shows it moving rather than being redrawn a little longer.

**A re-rendered element has nothing to transition from.** The document and the rail are both rebuilt wholesale, so the new element is born wearing the new colour and the transition never runs. So each washed element is rendered wearing its **previous** colour and carrying the new one in a data attribute; one forced reflow later the new value is assigned and the transition runs. `void document.body.offsetHeight` rather than `requestAnimationFrame`, deliberately: rAF never fires in a backgrounded tab, so a rAF version would have left the colour stuck at the old value in exactly the environment these are measured in.

The keying is the part worth remembering. A wash is keyed by **what it is about** — the clause, the rail entry — not by the element carrying it. Which is why a paragraph and the head of the card that swallows it share one key, and opening a card *deepens* its colour over 700ms instead of repainting it. The identity survives the element.

### Cables

The wire took a fixed 16px inset at the card end and 18px at the entry end, so two things `layoutQueue` had levelled exactly still ran two pixels downhill. It now leaves the entry at its own natural height and arrives at the *same* height on the card, clamped into the card's box — flat by construction rather than by coincidence, and self-correcting for a short entry against a tall card. Measured: every entry-to-card wire is exactly 0. The remaining non-zero paths are the spine that joins a patch's several entries, which is vertical on purpose.

### Why the diagonal was never in the rail

Not a rendering bug: `queueEntries()` had always produced both of its entries. The rail was simply full, and the diagonal's urgency of 0.44 put it eighth — one place below the cut — at every scroll position.

That is the same trouble a deadlocked race had, from the other end (223). Its urgency is an honest judgment-leverage number, and judgment leverage is the wrong measure for it: what a diagonal buys is not the judgment it collects but the **ordering it fixes for everything else**, and it is rare (about one card in ten, SPEC §8.3) and cheap to answer. So it gets a floor, above ordinary questions and below both the flame and the stuck races — which have drafting leverage on top of everything else. The number is a guess and is logged as such.

Found on the way, and logged as 280: the admission loop `break`s at the first entry too tall for the room left, so a shorter one further down never gets the leftover space. Measured 38px spare with a 29px entry available.

### Disclosure becomes constitutional (Ed, 2026-08-17)

Ed's instinct — make anonymous-or-signed a constitutional choice rather than a preference — turned out to fit the founding ceremony's existing rule without amending it, which is the sort of thing that suggests the rule was right.

The ceremony's consent device is *each member states the lowest they will accept, and the document takes the maximum*. That reads naturally for quorum and the bar because they are numbers. The disclosure settings are not numbers, but they are **ordered by privacy**: anonymous is more private than sealed, which is more private than public; nobody-signs than each-chooses than everybody-signs. So each member states the **most exposure they will accept**, and the document takes the **most private** answer. Same rule, seen from the other end — nobody ends up more exposed than they said they would accept, so there is still nothing imposed and still no vote to govern.

That also delivers **anonymous as a strong default** structurally rather than by preselection. Anonymous sits at the top of the lattice, so it holds unless *every* member is content with more — one person who wants to stay unnamed keeps the whole document unnamed. A default you have to argue out of by unanimity is a far stronger thing than a radio button that happens to be ticked, and it means a room only becomes visible to itself when it has genuinely all agreed to be.

Ed's other extension — that judgments could be revealed after the decisions they contributed to — gets its own ladder, one rung shorter: never, or after the fact. Live is not on it, and that is not a preference either: §8.3's no-standings rule is what keeps judgment blind while it is still being collected, so it is the one rung the constitution may not reach.

Folded into SPEC v0.19 at §3.5a, §9.0a and Appendix A. Nothing about the *surface* is designed yet — how the ceremony asks, how a signed rationale renders beside the blank-disc ones it sits among, what the record shows when judgments are revealed.

### The editor learns to select (Ed, 2026-08-17)

Two rulings, and both simplify rather than complicate. **A contiguous run deleted together is one candidate, not a patch.** **A heading edited with its paragraph is one candidate too.**

The first was almost already true. A `draft-site` has been a *run* of adjacent clauses since 225 — the composer joins them when you type across a paragraph break. What was missing was only the ability to *select* a run rather than having to type your way across it. So the mechanism did not move: the run is flattened to one string with a newline between blocks, the selection is located in that string rather than in any one block, and the edit is applied to it. Deleting four blocks is therefore not four deletions coordinated afterwards; it is one edit to one piece of text, which is exactly why it comes out as one candidate. Ed's ruling and the existing data structure agreed with each other, which is usually a sign both are right.

The second needed headings to become addressable blocks — they had no keys at all, because only clauses had ever been proposed against. Giving them keys is what lets a section be renamed, and it is also the only way a heading and its paragraph can be *one* candidate rather than two coordinated ones.

Two things that had to come with it. The block **type** travels with each origin, so a section title still reads as a title in the lane and in the proposal rather than being silently flattened to body text. And `renderDoc`'s loop had to be restructured: the composer check sat *below* the heading branch, so a draft that began at a heading rendered nothing at all — the heading was emitted and the loop moved on before anything asked whether a draft covered it.

### Three smaller things

**The clause changed size when its card opened.** Having gone to some trouble to keep it in exactly the same place, the one remaining movement was the more conspicuous for being the only one: `--t-body` was a notch under the document's own size. A clause under judgment *is* the document's text, so the token is now the document's size and the head, the proposals and the editing lane all follow.

**The caret.** Ed asked for a heavier, serifed vertical bar. CSS gives `caret-color` and nothing else — no width, no shape — so what changed is the **mouse pointer**: a drawn I-beam, bolder, white-haloed so it survives a yellow or green wash. The blinking caret is merely coloured. Getting the caret itself means hiding the native one and drawing a div at the selection rectangle, kept in step with typing, blinking, IME composition, selection changes and scroll — in a contenteditable that is a real source of bugs, and it is the one element that must never be wrong. Logged as 281 rather than attempted.

**The wallet counts and ticks.** Four held is four pencils, because "+1" costs exactly the space it saves; five is three pencils and a +2, so the row stays one length whatever you hold and a spend is visible as a change in the number even when it is not visible as a missing pencil. The countdown carries the drip's own wash — the fill *is* how far the tenth has run — so the thing that says *when* and the thing that shows *how far* are one object rather than two saying it twice, which retires the ghost pencil whose only job was the fraction. And it runs: seconds only mean anything if they move, so the wallet is the one thing on this surface that changes without being touched.

### The selection bug I tested green (Ed, 2026-08-17)

Ed: *I still don't seem to be able to select multiple paragraphs at once, or a paragraph and a heading.* He was right, and the way the first build came to be wrong is worth keeping.

**A native selection cannot leave the `contenteditable` element it began in.** Every clause was its own editing host, so a drag stopped dead at the paragraph boundary. What it *could* do was accept a Range built in code — `setStart` in one block, `setEnd` in another — which is exactly how every one of my tests had built one. The machinery underneath was right; the only thing that could not reach it was a user.

That is the lesson rather than the fix. **A test that constructs the state it is testing has not tested the path to it.** The selection tests should have gone through `caretRangeFromPoint` plus `Selection.extend` from the start — the path a drag actually takes — and they now do.

The fix is one editing host for the whole prose column instead of one per block. `contenteditable="true"` rather than `plaintext-only`, because the host now contains block children; safe for the same reason it always was, which is that **every** beforeinput is refused, so the browser never modifies the charter whatever it believes it is allowed to do. The blocks keep their class and their key and stop being hosts. One consequence in the handler: the block being typed in comes from the *selection* now rather than from the event's target, because the target is the column.

### The caret, on the second reading

Ed meant the blinking caret, not the mouse pointer, and the I-beam is reverted — the pointer was never the thing that was hard to find.

What is available is `caret-color` and nothing else. So the caret is the accent blue, and **where it lands is announced**: a short flash at the new position that shrinks onto the bar and fades over 460ms, only in the charter and only for a collapsed selection so dragging a range does not strobe. It answers the question the request was really asking — *where did it just go?* — and it costs nothing, where faking the caret itself would mean hiding the native one and keeping a div in step with typing, blinking, IME composition, selection changes and scroll, on the one element that must never be wrong.

**And the flash found its moment.** Bound to `selectionchange` it fired every time you clicked in the document, which is noise: a click is you putting the caret somewhere and you already know where it went. Ed named the moment that actually needs announcing — you start typing in the charter, the charter cannot be edited in place, and the caret is carried off into the proposing lane of a card that has just appeared. That is the one caret move the reader did not make. So the pulse is called at the landing rather than bound to an event, which is both quieter and more accurate: **announce what the surface did, not what the reader did.**

### Markdown, and where the editing controls live (Ed, 2026-08-17)

Ed's answer settled both halves of the question at once. *Most people will want the rich edit/view; but some will appreciate switching to monospace markdown to make sure that their edit is totally accurate.*

That second clause decides the storage question, not just the view. "To make sure that their edit is totally accurate" only means anything if the characters you are shown **are** what is stored — so a candidate's text is markdown, and rich is a rendering of it. It is also the one arrangement where the two views cannot disagree: there is a single source and two ways of drawing it, rather than two representations that have to be kept in step.

The cost is that rich mode has to serialise back. The lane holds real `<strong>` and `<em>` elements, and every keystroke reads them out as markdown again — otherwise editing rendered would silently drop the emphasis it was showing you. Round-trip verified lossless.

The subtler cost is the caret. **An offset does not mean the same thing in the two views**: markdown counts the syntax characters and rich does not, so the same place in the text is a different number of characters along. Switching therefore converts rather than assuming — without which the caret drifts two characters for every bold word above it, which is exactly the class of error the mode exists to help somebody catch.

*And the toolbar moved.* Ed had said the topbar; his answer here is the top right of the editing box, "that's the only time we'll need it". That is the better home and the reason generalises: **a control belongs where the thing it acts on is.** Nothing outside an open card can be edited on this surface — that is the whole premise of `always-on-typing` — so a topbar toolbar would have been greyed out for the entire session except the minute you were writing.

Inline only: bold, italic, code. A charter is prose, and block structure is already carried by the run of clauses, so headings and lists have nowhere to go that `draft-site` does not already handle.

It left one thing behind, logged as 282. The charter fixture is plain text, so the composer can take a caret offset straight from the DOM and use it against the clause's source. The moment the *document* renders markdown, that stops being true — a DOM selection measures the rendered text — and every offset the composer computes is wrong by two for each mark above the caret. The lane already has the answer in miniature; the document side would need the same mapping everywhere, and it is invisible until somebody bolds a word near the top of a long paragraph.

### One entry for a diagonal (Ed, 277)

The duplication is accepted; what changed is the rail. A diagonal had been taking one entry per clause, which was the patch grammar borrowed without checking whether it applied. A patch stands at several places because that is where its work is — each site is a place you will be asked about. **Neither clause is where a diagonal lives.** It is one judgment about the relative worth of two questions, so standing at both said "there is something here" twice about a card that is really about the pair.

It now takes one entry, at the earlier of its two clauses, titled *Prioritise A vs B* — which is the first entry title on the surface that states the question rather than naming the place, and it can, because for once the question is not "what should this say".

### Depth instead of outline (Ed, 2026-08-17)

*I'd like for active boxes to be highlighted purely through depth and not a blue border… they need to really look like they're lifting off the page.*

This retires 198's one-blue-for-every-card as a **boundary**, and the reason is one 164 had already found from the other end: a rule round the outside competes with the wash inside it for the job of saying *this is one thing*. 198's blue was doing two jobs — naming the accent and drawing an edge — and the edge was the weaker of them. The accent survives as an accent: wires, selections, controls that are on.

What replaces it has to be a real lift, so there is a fourth step on the elevation ladder and it is the only one allowed to be big. It is still a light source rather than the halo the 2026-08-16 pass removed: the offset grows with the blur, the blur stays near two and a half times it, and a one-pixel contact shadow keeps the near edge crisp — which is what makes a card read as *lifted* rather than as *blurred*. Three casts stacked, not one enormous one.

It applies everywhere "active" is said: the decision card, the open rail entry (which loses its ring), and the drafting box. The last is the interesting one, because a border there was doing real work — a text editor says it is one by looking like one. So it is replaced rather than removed: the box sits above the card at rest and higher again while the caret is in it, which says *editable* and *focused* with the device the whole surface now uses for *open*. The rationale field follows the same rule one step lower.

### Hot for actions, cold for information (Ed, 2026-08-17)

Ed gave the palette a rule it had been obeying without stating: **hot colours for actions, cold for information.** Orange and yellow are the two states that want something from you; blue and grey are the two that are telling you where things stand.

A stated rule earns its keep by deciding the next case, and it did immediately. A `salience-diagonal` wants a judgment, so it has to be hot — it cannot be blue however much it feels like a system-generated thing. But it is a *different kind* of judgment from a proposal: it asks which of two questions deserves the room's time, and nothing about a wording. So it cannot be the same hot as a proposal either. Pink is the remaining warm hue that reads as neither alarm nor caution, and the diagonal now carries it in the rail, in the gutter and in its card's head.

The queue's hue also stopped being computed separately from the document's — both come from `anchHue` now, so a lifecycle cannot show one colour in the margin and another in the charter.

**And it needs no rationale.** A teaser in the rail quotes somebody's *argument for their wording*; a diagonal has none, because nobody proposed anything. Its title says what it is asking — *Prioritise A vs B* — and the description it used to quote was the system explaining itself twice.

### One editing surface (Ed, 283)

Ed's note had been the single fragment "rationale box", and I logged three readings rather than guess. None of them was right, which is the useful part: I had read it as a question about the box's *depth* — is it too flat, should it lift more — and his answer was about where its **edges** are.

*It should be as high as the text edit box (and maybe the user avatar too, since they're connected) — this is the whole "editing surface", as you're expected to fill in both.*

So the wording lane and the reason are not two boxes to be levelled against each other. They are one surface with two fields in it, and the speaker's disc belongs inside because it belongs to the words beside it. The rationale row moved inside the drafting box, a hairline separates the two without dividing them, and the field lost the elevation it had been given — it needs none, because the surface carries both. `:focus-within` lifts the whole thing whichever field you are in, which is now the truthful behaviour rather than a convenience.

Worth keeping the shape of the mistake. Having just built an elevation vocabulary, I read a note about two adjacent things as a question about their relative heights — the answer was that they should not have been two things. **A new vocabulary makes you read every subsequent note in it.**

## The rail-and-radio pass (284–287)

Four notes from Ed's QA, and they turned out to be one job: three of them are about
the queue rail's legibility and the fourth is about the loudest thing on a decision
card. Building them together mattered, because 285 and 287 are the same idea applied
twice — a card carrying its hue, a cable carrying its hue — and approving them one at
a time would have hidden how much colour the surface was gaining in total.

### 284 — the diagonal's title, over four lines

The entry now carries the two section names as `prio` and keeps the flat
`Prioritise A vs B` string for tooltips and anywhere else a title has to be one line.
On one line at 290px the two names collided and truncated, which is the single thing
this entry must never do: it exists so the two can be weighed against each other.
Stacked, they are the same shape in the same place and the eye compares them directly.
`Prioritise:` and `vs` drop back to muted caption type, because they are the frame and
the names are the content.

### 285 — a card with no right edge

Ed's complaint was exact. The wash is a progress bar, so it stops where the fill stops,
and the rest of the card was white on a white page. The card therefore had no visible
extent — and *width* is the one dimension of a rail entry that carries no meaning, so
it is the one with no excuse for being the dimension you cannot see.

He offered two ways out: a very light wash of the card's own hue across the whole
background, or stronger edges. The first is right on the palette's own logic, and it
was built: the card now **is** its colour, and the bar reads as how far through that
colour you are rather than as the only coloured thing on it. Stronger edges would have
added a rule the palette has spent three passes taking away — 164 removed the border,
198's blue ring went at the depth pass, and putting an outline back to solve a colour
problem would have undone both.

Two things made it work that the note did not anticipate.

The ground is **derived from the bar's own colour** rather than passed in beside it —
one regex swapping the alpha, in `washAttrs`, where the bar's colour is already known.
Passing both would have been two sources for one fact, and the failure mode of two
sources is a card whose ground is a different hue from its bar for one render.

And at the bottom of the urgency scale the fix nearly cancelled itself. `URG_LO` is
0.05, so the least urgent card's bar is 0.07 over a 0.06 ground — a boundary of almost
nothing, and **the boundary is the whole of what a progress bar says**. Rather than
raise the floor (which would have compressed the urgency range to buy back contrast
the ground had just spent), the bar's leading edge is drawn a second time in its own
colour, `inset -1px 0 0 var(--washcol)`, so the edge composites to roughly double alpha
and stays a crisp datum at every urgency. Same variable, so it cannot drift.

### 286 — the radio is the judgment

It had been caption type with a 12px dot in a hairline pill: quieter than the
`✏️ edit this` beside it, and far quieter than the tick. That is the wrong way round.
Since 197 was retired the radio *is* the judgment — the whole act the card exists for —
so it is now UI size at weight 600, in the document's own ink rather than muted, on a
1.5px edge with a ground that separates it from the lane behind it. The dot grew with
it: a 12px ring at caption size reads as a bullet, a 15px one at UI size reads as a
radio, which is the whole of what it is trying to say.

The `.lanepick.vin` height patch went with it — it existed to lift the commit row's
pill to the same height as the buttons beside it, and the new base padding does that
by itself. A rule that has become a no-op is worse than no rule, because it looks like
it is holding something up.

### 287 — the wire in the entry's hue

198 held that the wire is one colour for every kind, and that still stands: kind is not
something the wire was ever asked to say. Lifecycle is different — it is exactly what
the entry's mark and its wash already say, so the wire agreeing with them adds no
vocabulary, and the three columns tie together one degree more tightly.

The worry logged with the question was that the blue means *this is the open one*. It
does not need to: only the open judgment ever draws a wire, so its existence already
says that, and the accent was doing a job that was already done.

The other worry was real. A hue tuned for a 0.06 wash across a card is not a 1.5px line
on white — `--lc-open` at full strength is a highlighter yellow that simply does not
carry. One mix, `color-mix(in srgb, rgb(var(--lc-X)), var(--fg) 28%)`, applied to every
hue so the rule stays one rule; yellow lands on a gold that reads, and blue stays
plainly blue.

One case the note missed: a **filed** decision has no hue at all, because its clause
washes nothing — the document should look settled. Falling back to `--primary` there
would have left the accent meaning "filed", which is the one thing it has never meant,
so it takes the grey its own mark and its sealed dot already wear.

### Testing, again

The background automation tab bit in a new way. `bringIntoView` runs a smooth scroll
through `requestAnimationFrame`, which never fires in a backgrounded tab, so every
card open stalled before `open()` and the sweep reported "no card" for everything.
Patching rAF onto `setTimeout` only converts it into a 1s-per-frame animation, which
then blows the 45s CDP timeout on a 31-card sweep. The way through is to satisfy the
early exit instead: `bringIntoView` returns immediately when the target is already
between 100 and 300px from the top, so scrolling the target chip to 220 first makes
the whole open path synchronous. Worth remembering — **the cheapest way past an
animation is usually the branch that skips it, not a faster clock.**

## The QA of 2026-08-17, second pass

Six notes, and unusually for a QA round three of them were bugs rather than
judgments. Worth separating, because the bugs all had the same shape: a rule
stated in the notes and the glossary that the code had quietly stopped honouring.

### The record printed its answer twice

A decided-and-adopted card showed the clause at the head and then the winning
proposal below it — and once a proposal has carried, those are the same sentence.
The one text a reader of a decided card actually wants is the wording it
*replaced*, and that was present only as a redline inside the winner's block,
where it has to be reconstructed rather than read.

The fix was already half-written: a `.replaced` style had been in the sheet since
the record was designed, with a comment saying the displaced text sits after the
field, and nothing had ever emitted it. It is emitted now, and directly **under
the head** rather than after the field, because the second thing you want on a
decided card is what it used to say. The winning block states no wording at all —
it says *the wording is at the head of this card* — and every losing proposal
states its own text plainly rather than as a redline against a text that is
itself no longer in the document.

That last part quietly anticipates 274. It was not the reason for the change, but
it is a data point for it: the record reads better in plain sentences, and the
thing the redline was protecting (you cannot see what a deletion removed) is
solved here by having the old text on the card in full.

### Cables: match what the eye sees, not what the token says

Three versions in one session, and the middle two are the lesson.

1. The hue mixed 28% toward the ink, so a 1.5px line would carry. Ed: *a bit
   dark*. It read as a different object from the card it came out of.
2. The card's literal wash colour, composited over its ground. Right colour,
   wrong medium — at 6px a translucent cable shows the charter through it.
3. Fully opaque at full hue. Right medium, wrong colour again: a card at 0.13
   alpha *looks* pale, and matching a card means matching what the eye sees.

Ed's own diagnosis closed it — *the colour should match the queue card, which
happens to be perceived as lighter because it's transparent; maybe put white
underneath it*. So the cable is drawn twice: a white cable, then the card's own
translucent colour on top. Opaque as an object, identical as a colour. It gains
something nobody asked for, which is usually the sign of a right answer: because
a card's wash carries urgency, so now does its cable, and the 🔥 cable is visibly
the strongest cord on the surface.

One implementation note: the two passes are *whole-cable* passes, not per-run
pairs. A patch's runs meet on the spine, so painting each run white-then-colour
would have the second run's white erase the first run's colour exactly where they
join.

The rail-end cap went and the document-end cap grew to 10px. A dot against the
card it was leaving restated what the card already said; the far end is where the
wire makes a claim — *this clause, here* — so that is the end that gets a landing
mark.

### The gutter mark as an object

Ed: *these are great and do a lot of work; they should read more obviously as
buttons*. Three things say it, and none of them is an outline — the palette has
spent three passes removing outlines and it would be strange to reintroduce one at
24px. A resting **ground** in the mark's own lifecycle hue plus the contact
shadow, which makes it exactly the object the rail's sealed dot already is; a
**size** that matches its job (30×27, glyph at document size — it had been a 13px
glyph in a 24px box, a target sized like a control and a glyph sized like an
annotation); and a **press**, lifting on hover and going down on pointer-down.
Depth is how this surface says *active*, so a control that never moves in depth
never says it was pressed.

The flatter glyph set Ed also asked for is Q288: the design series is
self-contained single files with no network, so there is no pack to point at, and
the honest options all cost something.

### Radios in a column

A locked card centred its lone Indifferent pill, and the code had a comment
explaining why: pushing a single disabled radio to the left edge leaves the other
end of the card empty. True, and beside the point — Ed's rule is that the
alignment is what says the three radios are answers to one question, and a card
you cannot judge is exactly the card that most needs to look like the ones you
can. Measured after: 24px from the card's left edge on every card, every state.

### Closing, and a dead control

*Cards on the document should be smoother when they close.* The collapse animated
the card's height down to `headOnlyHeight` and then handed over to a re-render
that swapped it for a paragraph. Symmetrical with the opening on paper; wrong in
use, because **a card at head height is not a paragraph**. It is a lifted white
box with an eyebrow over the clause, 14px of padding, and its top edge 34px above
where the paragraph's will be. So a 190ms motion ran smoothly to a shape that was
still 93px too tall, and *then* everything jumped.

Opening survives the same discrepancy because the jump happens in the frame of
the click, before the motion. Closing put it after, which is the one order the eye
cannot forgive.

Now the collapse animates the whole box onto the paragraph's box: height down to
the `.headclause` — which *is* the paragraph's box by construction, same padding,
same negative margin, same width — padding to zero, eyebrow shut, shadow and white
ground gone, and `margin-top` growing by exactly what the padding and the eyebrow
give up, so the clause does not move a pixel while everything around it leaves.
Measured: the card's final top lands at 197px, the clause's original top was
197px. The last frame is a paragraph and the swap has nothing left to do. Given
240ms and a curve that lands softly rather than accelerating into a jump it was
never going to make.

Half the problem was also that **the card's own mark was inert**. A guard dropped
any click whose target sat inside a `.sugg`, which predates the rebuild that
lifted the clause and its marks into the card's head — so the glyph you pressed to
open a card did nothing when you pressed it again, and the only way out was the
rail. The glossary had been claiming otherwise for a day.

### The composer's three

*I can't write spaces into the proposal text.* The lane rewrites its own markup on
every keystroke so the green marking can follow the caret, which means a space you
have just typed is round-tripped through the model and re-rendered as HTML — where
an ordinary trailing space collapses to nothing. You typed, nothing appeared. Set
the lane's blocks `pre-wrap`, which is safe because the lane's markup is
concatenated with no incidental whitespace in it.

*I can't delete the helper text for the rationale.* Of course not: it was a
`::before`, and as ordinary inline content it sat *in* the line, so an empty field
put the caret after it. You could see a text cursor at the end of a sentence and
backspace at it all day. Taken out of flow it is what it always claimed to be —
something printed behind an empty field.

And the copy: *Why this change?* invited an answer to a different question. *We
should change this because…* is an opening clause rather than a prompt, so what
you write finishes a sentence, and it states the act — you are writing the case
for a change, not a note about one.

### The cable, lifted (289a) — and composited once

Ed's *raised to the height of the cards they join* meant elevation, and the
reason it is right is the surface's own rule: depth is the only thing here that
says where something is. A 6px opaque cord lying flat between two objects that
are visibly off the page was the odd one out. It now casts what a card casts —
the same three-layer light as `--shadow-xl`, written as chained `drop-shadow`s
because a filter takes no spread.

On the **container**, not on the paths. Per-path, the white underlay would cast
its own shadow under the colour it exists to sit behind, and the cable would be
carrying two shadows of itself.

The same note caught a compositing bug: *the ball colour is covering the cable
colour so comes out darker*. Two translucent shapes painted over each other
composite twice, so the cap doubled the alpha of the run it capped — and, less
visibly, a patch's spine doubled it along every run it crossed. The fix is to
stop making the shapes translucent: the colour pass is drawn at full hue inside
a `<g>` that carries the alpha, so the **union** of every run, cap and spine
composites exactly once however many of them overlap. `wireColor` therefore
returns a hue and an alpha kept apart rather than one rgba string, which is the
shape the problem actually had.

Worth keeping as a rule: **translucency belongs to the layer, not to the
shapes** — the moment two shapes in one conceptual object are separately
translucent, every overlap in that object becomes a visible seam.

### Shadows darker and less diffuse, and a cord's shadow is a cord's

Ed, on the cables: *our shadows should be darker and less diffuse. Note that the
cables cast shadows on the cards they connect, which doesn't seem right.*

The first half is the whole ladder, not just the cable — the cable's filter was
a copy of `--shadow-xl`, so changing one without the other would break the rule
that they are the same light. The 2.5× blur ratio was tuned in 2026-08-16 when
shadows were the faintest thing that would read; once depth had to carry *open*
on its own (the outline came off), they were being asked to be **seen**, and a
wide faint cast that is asked to be seen is exactly the halo that retune
removed. So the alphas roughly double and the blur comes in to ~1.6× the offset:
the same ink arrives concentrated instead of spread, and the edge of a shadow is
a shape rather than a fade.

The second half is a different mistake, and a good one. The cable had been given
`--shadow-xl` *verbatim* — a 470px card's cast applied to a 6px cord, which is
40px of grey landing on everything either side of it. What that reads as is the
cable floating *above* the cards, because a thing at the same height as its
neighbours does not shadow them. The correction is the same light and the same
darkness with the cast **scaled to the object**: a cord's shadow is a cord's
width. Same lesson as the wire colour, arrived at from the other side — *lit
like a card, not shadowed like one*.

### Result-only, and the end of the redline (274)

Ed: *result-only, and if it's a pure deletion we give a helper in place saying
"(all text removed)".*

Which is option (a) plus a patch for the case option (a) fails worst at. The
blind spot the redline existed to cover — a stacked card where a proposal's only
change is a cut renders as a sentence that looks like the clause above it — is
accepted for a *partial* cut and closed for a total one, where result-only would
have printed **blank space**, the one rendering that cannot be told from
unchanged.

Two things worth keeping.

The rendering was already there. `resultOnly` was written for 91, abandoned when
274 brought redlines back, and left in the file; the fixture has always carried
the full diff and every card has always been a *rendering* of it. That is why
this was a fifteen-minute change in both directions, and it is the argument for
keeping fixture data richer than any one view of it.

And the recommendation lost to a better answer. Mine was (b), a machine-drafted
sentence saying what changed — which is more informative and depends entirely on
generating good prose, and a bad mechanical sentence is worse than none. Ed's
costs nothing and fails safe.

The helper is drawn as a pseudo-element on an empty block rather than as text.
In the editing lane that matters twice: there is nothing for `htmlToMd` to
serialise back into the candidate, and nothing for the caret to land behind —
the same bug the rationale placeholder had an hour earlier, avoided this time by
having just had it.

### The cable, told where to stop

Ed again: *they still cast onto cards.* The tighter shadow was not the fix,
because the shadow cannot be told where to stop — it falls on whatever the ink
is over, and the wire has to paint **above** the cards: its horizontal run
crosses the document column's own opaque white ground on the way in, so pushing
the layer under the cards would hide most of the cable rather than only its
shadow. (Measured: `.doc` is white and spans the whole middle column; the gutter
between the columns is 24px.)

So the *ink* stops instead. The run begins a cap-radius outside the rail entry
and ends a ball-radius outside the card, and the landing ball sits **tangent** to
the card's edge rather than centred on it — it had been centred on `r.right`,
which put half a 14px ball, and all of its shadow, on the card. Nothing overlaps
now, so nothing casts onto anything it is level with, and touching still reads as
landing. Measured: ball left edge 1484, card right edge 1484.

The general form is worth keeping, because it came up twice in one hour in two
different disguises: **when a shadow lands somewhere it should not, move the
object, not the shadow.**

### Diagonals are not a rate (SPEC v0.20 §8.3a)

Ed: *diagonals are only useful if there really are too many decisions to make and
time must be prioritised … one in every 10 being a ⚖️ to help prioritise 15
things, which is really just deciding which one is 🔥, seems overkill.*

That is a mechanism change, not a UI one, and it is right: at low volume the
salience question degenerates into the urgency question, which the surface
already answers. Two gates, both required.

**Volume** — at least E live *questions*, counting a race once however many
candidates it holds, because they all prioritise to the same place. Ed's own
correction, and it matters: counting candidates would have let a single busy race
open the tap.

**Audience** — only a participant with nothing else to judge. This is the better
half. It is not a heuristic about who is keen: a diagonal costs an idle member
nothing and costs a busy one a judgment, and judging is the act that resolves
questions where prioritising only orders them.

Ed also closed the hole his own rule opens — an empty queue must not become an
endless stream of prioritisations — so it terminates on the same active-sampling
rule races already use (serve only while a pair would still move the ranking),
with a hard ceiling of three in a row, then *you are up to date*.

What this costs is written into the spec rather than hidden: salience is then
measured on the members who reach the end of their queue, who are systematically
the most active. It is tolerable only because the ranking is advisory — routing
weight, bounty order, backlog order — and never touches adoption.

The consequence for this mockup is that the diagonal, designed across 221, 276,
277 and 284, has nowhere to appear in a fixture built around a **full** queue.
That is Q291.

### The end of the queue (Q291b)

§8.3a took the diagonal out of the stream, and the fixture models a member with
a full queue — so the card designed across 221, 276, 277 and 284 had nowhere to
appear. Ed chose to build the state it actually belongs to rather than caption
the impossible one, which was the right call for a reason beyond the diagonal:
**the end of the queue was a moment this surface had nothing at all to say
about.** A rail that empties and simply goes blank is not a design.

Three states, and they are the three sentences the mechanism can truthfully say:

- nothing is waiting on your judgment;
- nothing is waiting, **and** the room has more open questions than members — so
  it could use a hand deciding which ones deserve the time (the offer, with the
  live count in it, because *22 questions* is the argument);
- nothing is waiting, and the priorities are as clear as more answers would
  make them.

**Offered, never served.** Another card arriving unasked is the opposite of
being told you are finished, and the difference is the whole reason the audience
gate is defensible: a diagonal that costs an idle member nothing must not be
allowed to cost them the feeling of having finished.

Two build notes worth keeping.

Until the offer is taken, the diagonal is **nowhere on the surface** — not in
the rail and not in the gutter. That took a second gate (`served`) inside
`suggFor`, because a suggestion's marks are drawn from the clause it anchors to
rather than from the rail; without it the ⚖️ marks sat in the margin advertising
a card the member could not open.

And the panel pins at the top of the band, so it has to **take the top of the
band with it** — `bandTop` moves down by its height before anything else is laid
out. Rendered at the end of `layoutQueue` it simply sat on top of the judged
entries, which is what it looked like for the first pass.

### Testing note: a clamped timeout looks exactly like a broken feature

Submitting a judgment runs `renderAll` inside `setTimeout(…, 240)` so the rail
entry can animate out first. In a backgrounded automation tab `setTimeout` is
clamped to ~1s, so a loop that judges twenty cards and then checks the state
sees **none** of them judged — and the natural conclusion is that submitting is
broken. It is not; the conclusion cost twenty minutes. A loop over an animated
action has to wait out the animation, or the test has to read the state through
something the animation does not gate.

### A lock should not dim the record

Ed: *decisions that I have decided on and are waiting for other responses (⏳)
should have the radio that I chose selected.* They did — except on a **locked**
card, where `[disabled]` faded the whole trio to 55% including the answer. The
greying is saying *you cannot change this*, which is true; dimming your own
answer with it says something else. The unchosen options fade now; yours does
not.

### Served, not offered — and the panel goes

Built the offer on Monday's reasoning and Ed removed it the same day, correctly:
*the top of the queue-sidebar is a bad place to put things; rather than ask
people if they want to prioritise, let's just serve them a card as soon as their
active queue is empty.*

Two things wrong with the offer, and the second is the one I should have seen.
The panel needed somewhere to live and the only place was above the rail — but
the rail is a **margin index**, where position means *where in the charter this
is*, and a panel pinned on top of it is a banner in a column that has no room
for banners. And the question was one nobody benefits from being asked: the
entire justification for the audience gate is that a diagonal costs an idle
member nothing, so asking whether they mind is asking a question whose answer
the gate has already assumed.

What survives is better than what it replaced: `served()` now derives from the
state rather than from a flag somebody set, and the whole end-of-queue panel —
markup, styles, three copy states, and a height that had to be subtracted from
the band — is gone. **A rule that can be derived should not be a mode.**

### A diagonal has no progress

Ed: *if salience has no ratification threshold, why does the diagonal card have
a progress bar?* It should not, and the bar was inherited rather than chosen —
every rail entry gets `pct` from the fixture and the wash paints it.

The fill means closeness-to-resolution. Salience never resolves: it is a
continuous ranking with no bar to clear and no quorum to ratify, which is
exactly the property that lets it be advisory and stay out of adoption. A
progress bar on it claims a finish line that does not exist. It washes flat now,
for the same reason an unproposed draft does — there is nothing to be close to —
and the rule is in §8.3a so no future surface draws one.

Worth noting what caught it: not a rendering that looked wrong, but a **mechanism
fact noticed on a surface**. The wash is a good enough instrument that it can be
read back against the spec.

### The same technique, applied wrongly

*How is it you managed to join two things that share a shadow with the left
gutter tabs, but not with the cables?* It is the same technique, and it was
applied wrongly.

`clip-path` resolves in the user space of the element referencing it **after**
that element's own transform. The shadow group carried both the clip and the
`translate(0 3)` that makes it a shadow, so the holes moved down with it: every
card's hole sat 3px low, and a 3px sliver of shadow survived along its top edge.
That is why it looked fixed on decision cards and not on queue cards — a cable
arrives at a decision card well below its top edge, and at a rail entry right at
it.

Two groups now, clip on the outer and offset on the inner. The rule to keep:
**a clip and a transform on the same element are not independent.**

### Ed on the resolved document

*This is the first time I've seen a document with every card resolved — it looks
great, like a document with a set of loading bars down the side, which is exactly
correct.*

Worth recording because it was not designed for: the `evidence-meter` was built
to say closeness-to-resolution on one card at a time, and the emergent reading at
rest — a charter with a column of fills beside it — turns out to be the clearest
statement of session state the surface makes. It is also the argument for the
meter surviving future passes: it earns its place twice, once per card and once
in aggregate.

### 🌶️ instead of ⚖️

Ed: *it's about saying which one is more urgent — judge makes no sense because
all cards are judgements. Then it also matches the pink background; ⚖️ was hard
to read.*

Three arguments and each is sufficient on its own, which is usually the sign of a
glyph that was chosen for its dictionary meaning rather than its job. Scales say
*weigh this*, and weighing is what every card on this surface asks for, so they
distinguished nothing. What a diagonal actually asks is which question is
**hotter**, which is a temperature and not a balance. And ⚖️ is a fine-detailed
figure that turns to mush at 13px, where a chilli is one silhouette — and one
already in the hue its card wears.

Worth watching: 🔥 and 🌶️ are now both heat. They are distinguishable in kind —
🔥 is *this ordinary judgment wants you most*, 🌶️ is *which of these two
questions is hotter* — but if the alphabet is ever reviewed as a whole, that
adjacency is the first thing to test on somebody who has not read this file.

### A cable follows its card

Ed: *cables should change colour when the card changes colour.* They now do, over
the same 700ms and by exactly the technique the washes use: the wire is rebuilt
from scratch on every draw, so the new shapes are born wearing the **previous**
colour and handed the new one after a forced reflow. Keyed by the judgment rather
than by the element, so a wire merely redrawn at a new scroll position does not
re-run the fade.

This is the third place that trick has been needed — rail entries, document
clauses, and now the cable. It is the standing consequence of rebuilding
wholesale on every render, and it is cheaper than the alternative (diffing the
DOM) for a surface this size. Worth stating as a rule: **anything rebuilt
wholesale that is supposed to animate needs its previous value carried across the
rebuild.**

### The shadow, third attempt

The clip was right for the two cards a cable joins and wrong about everything
else. The rail is a **layer** of cards at one height, and a cable at that height
passes several of them on the way down the gutter — so it was shadowing cards it
merely went past. Every card on the surface is punched out now, not just the two
ends. *A thing does not shadow its own layer.*

A testing note that cost real time: `onViewportChange` drives the redraw through
`requestAnimationFrame`, which never fires in a backgrounded automation tab. So
after any capture — and captures **scroll the page** — the wires and their clip
holes are stale, and a zoomed screenshot shows the shadow landing exactly where
the clip says it should not. Two separate false diagnoses came out of that before
I made the shadow layer bright red and looked at where it actually painted.

### Colour leaves the prose

Ed: *I want to try removing the highlights on document text, instead keep the
coloured background behind the left gutter emoji when they are acting as tabs.*

Built as read: the wash comes off `.anch` and off the `clause-head`'s block, and
the whole of the lifecycle colour on that side of the screen now lives in the
gutter. The charter reads as a charter. It is also the north star arriving where
it was always headed — *most of a session should feel like approving typo fixes;
the machinery earns its visibility* — because the machinery is now entirely in
the margin and the text is just text.

Two consequences worth stating.

The **geometry stays**. `.anch` and `.headclause` keep their padding and negative
margin even with nothing painted on them, because the card-opening motion is
measured against those two boxes being identical. Removing the paint is safe;
removing the box would have cost the 0px clause movement that took a day to get.

And the **active tab keeps its colour** rather than taking the card's white
surface, which reverses yesterday's tab treatment. White was right when the card
head carried the hue: the tab joined a coloured thing. With the head white, a tab
that goes white on opening throws away the only lifecycle colour left on that
side. It deepens instead — 0.34 against the 0.18 of the marks stacked under it —
and the join is carried by the width and the lift, which were doing most of the
work anyway.

They also finally have a name: **`clause-tab`**. They are one per decision at a
clause, they carry the `lifecycle mark`, they are the only way into a decision
card from the document, and when a card is open they are its tabs. The name says
where they live and what they become.

### 🔥 to 🔥

Ed: *when I resolve the 🔥 card, a new one should appear in my sidebar
immediately, rather than me having to deselect it first. I think the main
workflow will be jumping from 🔥 to 🔥 until everything is done.*

`settleTopUrgent` was already promoting the next flame on the same render — the
fault was one line further out. `renderAll` rebuilt the rail without laying it
out, so the newly-promoted entry sat at its clause's own position, six thousand
pixels down, until a scroll or a card-close happened to run `layoutQueue`.
Closing the card ran it, which is exactly why deselecting "worked".

`layoutQueue` is now part of `renderAll` rather than a habit at eight call sites.
A rebuilt rail always needs positioning; making that a rule removes the class of
bug rather than this instance of it.

Worth keeping as a diagnostic pattern: **"it works if I do X first" almost always
means X is running something the first path forgot**, not that X is required.

### Two removals

The rails have **no titles**. "Amendments" — one turn old — scrolled away with
the page while "Contents" stayed put, and Ed's read was that the asymmetry cost
more than either label was worth. Both columns say what they are by what is in
them, which is the same argument that took the explanatory notes off them a day
earlier.

And the **"+n further off in the charter"** tally is gone. It came in under 110's
*counted, never silently dropped*, and that rule was right while the rail's
admission cap felt like a failure to show everything. It no longer does: the rail
annotates a document you can scroll, and the entries it cannot fit are a few
inches away in the thing they annotate. A running count of them at the foot was a
permanent apology for a limit nobody experiences as one.

### The palette becomes one idea

Ed: *⏳ should be grey and ✏️ should be blue. Also all the greys should be
lighter grey.*

Two moves, and between them the palette goes from six colours to four hues and a
grey — which is the first time it has been describable in one sentence.

**⏳ goes grey.** It is the purest piece of information on the surface: you have
judged, the race runs on without you, nothing is being asked. It was wearing the
accent, which is the loudest thing in the system. And once it is grey it is
saying exactly what ✅ ❎ ☑️ say, so they share a hue and the palette loses one.

**✏️ goes blue**, and specifically `--primary`. Your own work is the one state
that is about *you* rather than about the question, and the accent is already
what this surface uses for you — your caret, your selection, any control you have
turned on. The wallet's drip fills, hard-coded to that blue since they were
built, now route through `--lc-yours` honestly rather than by coincidence: they
are about your edits, so they were always this hue.

The unplanned dividend is **Q264**, which asked what green was doing meaning
several things at once. Green leaves the margin entirely: `--ok` now means
*decided* and only that, on the tick and the winning text, both inside cards.

What it costs is worth writing down rather than quietly dropping. 164 said
*colour means you can still affect it; grey means the door is shut* — and a ⏳
race is revisable right up until it seals, so grey there is a lie under the old
rule. The replacement is narrower and true: **grey means nothing is being asked
of you.** 🔄 is the entry that strains even that, since a ground shift does come
back around; it keeps grey on the reading that what it is telling you is that
your old judgment is gone, not that it wants a new one yet.

Worth noticing how the rule changed: not by argument, but because two colour
moves made the old wording false and the new one obvious. **A palette rule is a
description of a palette, and it has to be re-derived whenever the palette
moves** — the alternative is a rule that everybody quotes and nothing obeys.

### The 🔄 card was saying the opposite of the truth

Looking into Ed's (cut-off) note about the 🔄 example turned up a real fault, and
a second one underneath it.

Every judged card carried the same footnote — *choosing again replaces your
earlier judgment, allowed while the race is still deciding* — including the cards
where it is not allowed. `quick-garden` is locked: its ground moved, its
comparison is spent, and its radios are disabled. It was telling the reader they
could change their mind while refusing to let them, and offering no reason
anywhere on the card. The one sentence that would have explained it — *the text
changed after your judgment* — existed only as a `title` attribute on the rail
entry, which is to say nowhere a reader will find it.

Fixed: a locked card says why it is locked, in the grey its dead controls wear,
with the ground-shift wording where the revision offer used to be.

The deeper fault is not fixed, because fixing it means writing charter fiction
and that is Ed's. **The fixture's 🔄 is not a ground shift.** Its `marked` string
carries no `<del>` and no `<ins>`, so the proposal renders word-for-word
identical to the clause above it, and nothing on the card shows what moved
underneath the judgment. A ground shift is *the text changed under you*; this one
shows no text changing anywhere. It is a judged card wearing a 🔄 and a tooltip.

What it would need: the clause as it now stands, a candidate that actually
proposes something against it, and — the thing that makes it a ground shift
rather than a lock — **the text you judged against**, shown as what it was. That
is one new sentence of the Hollow Oak charter and one new fixture field.

### A real ground shift, and a clause wearing the whole alphabet

**The 🔄** is now one. The story it tells: you judged The Garden when the clause
was a single line about the rota; somebody else's patch adding the Garden Steward
carried, which changed the text under you; a live candidate is now arguing about
the heroic weekends against the new ground. So the card shows the clause as it
now stands, **the text you judged against** in the dashed band the sealed record
uses for a displaced wording — the same fact in a different tense, a wording the
charter no longer holds — a proposal that actually proposes something, and your
locked judgment with the reason it is locked.

The band is the whole difference between a ground shift and a lock. Without it
the reader is told their comparison is void and shown nothing that would make
that make sense.

**One clause wearing the whole alphabet.** `guests` now carries four suggestions
chosen to be one of each kind — 💡 open, ⏳ judged and running, ❌ deadlocked, ✏️
yours — so the `clause-tab` stack can be looked at with four hues and four states
in it at once. It is a stress case rather than a typical clause, and that is the
point.

What it exposed, and I have left alone: the fifth kind, a **filed** decision,
does not get a tab there. `suggFor` excludes sealed suggestions, and `renderDoc`
gives a clause its filed chip only when the clause has no live ones — so a clause
where something was decided *and* something is still running shows no trace of
the decision in the gutter at all. That is arguably a gap rather than a choice,
but it is a behaviour change nobody asked for.

### The tabs go opaque

Ed: *I think their background is transparent so the tabbed-ness is acting
strange.* Exactly right, and the diagnosis is in the word *tab*. A translucent
ground was fine while these were marks lying on the page — but a tab **overlaps
the card it is attached to**, and the card's edge and shadow showed straight
through the overlap, so the join the tab exists to make was the one place you
could see the seam.

Same colour, mixed with the page rather than laid over it: `color-mix(…, var(--bg))`
at the alphas they already had. The rule generalises — **anything that overlaps
something else cannot be translucent**, which is the third time that has come up
today (the cap over the run, the spine over the runs, and now the tab over the
card).

### room-pulse

Ed: *I want some kind of indicator when any judgement or proposal is made by
anyone, just to show the document is live and changing. It can be very subtle.*

One grey dot in the topbar, one beat per action by anybody — including you,
because the pulse is *the room* and you are in it.

The design constraint that matters is what it must **not** carry. Blind judgment
(SPEC §3.5) is the thing this whole surface protects, so a liveness indicator has
to be content-free: no count, no direction, no author, no which-race. What
survives is *the room is moving*, and that is a fact about other people's work
that a live surface is allowed to carry precisely because there is nothing in it
to read. A dot that showed a number would be a standings feed with the numbers
filed off.

Two smaller calls. It is **grey at rest and grey at its brightest**, because
activity is information and nothing is being asked of you, which is what grey
now means here. And it beats by growing a **ring** rather than by changing
colour: a colour change in the topbar reads as a state, and this is an event.

The other fourteen members are a timer, on a fixed **irregular** cycle. Irregular
because a metronome reads as a machine ticking over and the thing being said is
that people are working; fixed rather than random because a mockup that behaves
differently every time is one you cannot QA — the same reason `Math.random` has
stayed out of this file.

### Withdraw moves to the commit corner

Ed: *withdraw button on your proposal cards should be on the right side, where
submit usually is: 🗑️*

Right, and the reason is stronger than symmetry: withdrawal is this card's
version of the same act. Every other card has exactly one control that finishes
what you are looking at, and it lives bottom right; your own proposal has one
too, and it was sitting centred in the middle of the card where no other commit
lives. As a glyph it matches the ✓ it stands in for, and the wording — including
the place count on a patch — moves into the tooltip.

It stays an ordinary outline button rather than a red one. The stake comes back
in full (SPEC §3.3a), so withdrawing is a real thing to do and not a danger, and
the surface should not flinch at it.

### One row for the whole life of a proposal

Ed corrected the withdraw placement into something much better than where I had
put it: *this is really about the proposal lifecycle. When you are editing you
have "✏️ propose (costs one edit)" on the left and then "cancel" on the right. In
fact it should have 🗑️ on the very left and ✏️ on the very right, and ✏️ goes to
"submitted" once it's pressed and the card becomes a your-proposal, which then
still has 🗑️ on the very left.*

So the commit row **does not move as the proposal advances**. 🗑️ at the very
left throughout; the commit control at the very right, changing from the act to
the fact of it — *✏️ Propose · costs one edit* becomes a pressed *✏️ Submitted* —
which is precisely what the judgment row's ✓ does when it is cast. Measured: both
controls sit at 24px from their respective card edges on both cards, so nothing
shifts under the pointer when the draft becomes a proposal.

Two things fall out of it.

**Cancel was in the commit slot.** A word on the right saying *leave this*, where
every other card on the surface puts *finish this*. Discarding and committing had
been given each other's positions, which is why neither read as part of a
sequence.

**Discard and withdraw are one gesture at two moments.** The only difference is
that one of them hands an edit back, and that difference belongs in the tooltip,
not in the glyph or the position. Both stay outline buttons rather than red ones:
a draft has cost nothing and a withdrawal is refunded in full (SPEC §3.3a), so
neither is a danger and the surface should not flinch at either.

One consequence I took without being asked, and it should be easy to reverse if
it is wrong: **Propose goes blue.** Green means *decided* and only that in this
palette — a submission is the start of a decision, not one — and since ✏️ became
the accent, a green button was the one part of your own proposal that did not
look like yours.

### The gap belongs to the mark, not the row

Ed, on the queue entries again: *the gap between ✏️ and title is not consistent
with the rest.* The fixed-width mark had fixed the glyph-advance problem and left
a second one underneath it.

A one-line entry — ⏳, ☑️, ✏️, 🔄 — sets its `.ql` to `display: block` so the
title can ellipsis. A block box has no `gap`. So the rows that could least afford
it were the ones losing the space entirely, while the flex rows kept theirs, and
the fix for the *first* problem had made the second one uniform rather than
removing it.

The space is now the mark's own `margin-right`, and the row's `gap` is gone. **A
margin belongs to the thing it follows and travels with it into either layout**,
where a gap belongs to a container and only exists in some of them. Measured
after: 6px between mark and title on every visible entry, in both display modes,
across all seven glyphs.

### Propose asks twice, and the price is the asking

Ed: *the proposing editor's submit button should just be a ✏️, but we should
require a second click to confirm it.*

Built so the confirmation and the price are the **same step**. The button is a
bare ✏️; the first press arms it and it grows into *✏️ Propose · costs one edit*;
the second press spends it. Anything else you touch on the card disarms it,
because a button that stays armed while you go back to editing is a trap waiting
for a stray click.

The reason this shape rather than a "sure?" dialog or a hold: the surface already
had a rule that *the edit is spent at Propose, which is where the price is said
in words*. A confirm step bolted on top would have had two places saying two
things. Making the armed state the place the price appears keeps one rule and
gets the certainty measure for free — you cannot spend an edit without having
read what it costs, because reading it is the state you have to pass through.

### Three smaller corrections

**The italic button is a serif I.** A sans italic capital I is a slash with no
serifs on it — it reads as punctuation, which is the one thing a letterform
button must not do. The serifs are what make it a letter while it is leaning.

**The mode control is one button.** `[]`, off by default, pressed for markdown.
The two-segment Rich/Markdown switch spent most of its width saying that a thing
which is off is off; a single toggle carries the state in its own pressed-ness,
which is what every other control here does. The note that argued for two
segments — *a single button would have to name either the mode you are in or the
one you would get, and both read as a lie half the time* — is answered by not
naming a mode at all: `[]` names the **thing**, and pressed means you are in it.

**"✏️ edit this" becomes "✏️ propose edit."** What the button starts is a
proposal; "edit this" promises an edit, which is the one thing this surface never
lets you do to the charter directly.

### The tabs line up

All four right edges now land exactly on the card's left edge, so the strip has
one vertical edge instead of three — the inactive tabs had been stopping 2px
short and the active one overshooting 4px into the card.

The active tab loses the extra 6px it was using to carry under the card and kill
the seam. It turns out not to need it: the tab is a **descendant** of the card, so
it paints over the card's own shadow where they meet, and the seam it was hiding
was already hidden. What marks it as active is the deeper ground and the lift —
which is what the design system says should mark anything as active anyway.

### Hold to propose, and watch the edit go

Ed called it a silly idea. It is the most literal thing on the surface: you hold
the ✏️, one of your pencils leaves the wallet and travels to the button, and the
proposal goes in **when it arrives**. Let go and it flies home with nothing
spent.

What makes it more than whimsy is that the gesture and the price become one
object. Hold-to-confirm is usually an arbitrary duration — you are waiting out a
timer for no reason connected to the act — and here the duration *is* the cost
crossing the screen. Nobody has to be told what proposing costs, because they
watch it being paid.

It replaces the two-press arming built an hour earlier, which put the price in
words at the moment of confirming. This says the same thing by moving the thing
being spent, which is better the way a diagram is better than a caption. The
standing rule survives in a stronger form: the price is still stated **at**
Propose rather than in advance — it is just no longer stated in words.

Two build notes. The pencil lives on `body` rather than in either end, because it
belongs to neither and must not be clipped by the card; it is
`pointer-events: none`, since you are still holding the button underneath it.
And it flies from the **last drawn pencil** rather than from the `+N` counter,
even when the counter exists — the thing that should visibly leave is a pencil.

One regression this caused and the shape of it is worth keeping: making
`.btn-propose` a 3.25rem glyph squashed the proposed card's *✏️ Submitted* to
52px, because both wear that class. **A rule about a control belongs on the act,
not on the class** — it is scoped to `[data-act="draft-propose"]` now.

### Three seconds, and a pass over the helper text

**The flight is 3s.** Ed: *slightly too fast to fulfil its purpose as a delay.*
900ms was a confirmation you could complete by accident; three seconds is a
decision. It is long enough to be a real hesitation and short enough that the
thing you are watching stays interesting, which is the whole reason the delay is
a pencil crossing the screen rather than a spinner.

**Helper text.** The `.foot` on a card had become the place the design explained
itself — *authorship sealed*, *no counts, no standings*, *the adoption-threshold
rises through the session* — printed under every card, every time, for a reader
who either already knows or is not going to learn it from a footnote. It is the
same fault the rails had before their notes came off in the QA of 2026-08-16, and
the same fix.

Eighteen of twenty-three cards now carry no foot at all. Five keep one sentence,
and the test each survivor passed is that **it changes what pressing something
does, and nothing else on the card says it**:

- a **race**: *neither of these has to win — the clause above stands unless the
  leader clears the bar.* Both candidates are challengers, so nothing on the card
  votes to keep the clause, and a reader could reasonably think one must win.
- a **patch**: *one judgment for all 3 places — choosing here chooses everywhere.*
- a **diagonal**: *this ranks the questions, never the answers.* The card looks
  exactly like a judgment and is not one.
- the **editing card**: only where it is joining an existing race, or covers
  several places. What it costs is no longer said, because it is now shown.

The revise note went the same way: it says what you said and that you can change
it, and stops. Why you can, and when you stop being able to, was explanation —
and the *locked* variants keep their full reason, because there the controls are
dead and the reader is owed one.

The rule the pass ran on: **a footnote that appears on every card is a design
note, not information.** Information is what differs between cards.

---

## The refund flies home, and no two flights are alike (2026-08-17)

Three things, and the first one is a bug Ed caught while playing with the second.

**The flying pencil was being put back.** Hold Propose and the pencil takes off,
leaving a gap in the wallet — except the gap was a `visibility: hidden` poked
onto the source element, and the drip re-renders the wallet every second, which
rebuilt the row with the pencil in it. So for most of a three-second hold the
edit was on the screen twice, and the duplicate only vanished when the flight
landed and the spend re-rendered the wallet honestly.

The fix is the same one the washes and the cables needed: **anything that must
survive a wholesale re-render has to be render state, not a poke at the DOM.**
The wallet now carries two flags, and both say the same thing from opposite ends
— *an edit in flight is drawn once, and it is drawn where it actually is*:

- `walletGhost` — draw the count, but leave the traveller's slot empty. Used
  outbound, because the edit is **not spent until it lands**: let go and it comes
  home, so the wallet keeps its five and shows a hole where the fifth is.
- `walletShow` — draw *this* count instead of what is held. Used inbound, because
  the edit is **not yours again until it lands**: the wallet keeps its old number
  until the pencil is in it.

Ghosting rather than decrementing matters outbound because the wallet counts past
four: five held is three pencils and a `+2`, four is four pencils, so a spend
that reflowed the row mid-flight would rearrange the tray under the pencil that
had just left it. Hiding a slot keeps the row's shape and reopens nothing when
the pencil comes back.

A useful side effect: the ghosted slot **is** the launch point. `flyStart` sets
the flag, renders, and measures `.gone` — so the pencil that leaves and the gap
it leaves behind are one object by construction rather than two things kept in
step.

**Withdrawing flies it home** (Ed: *of course, when you wastebasket a your-edit
the pencil should fly back and refund there too*). Withdrawal returns the stake
in full (SPEC §3.3a), and what comes back is the same object that paid — so it
makes the return journey, leaving in the pose it arrived in and landing flat,
which is the outbound tilt run backwards. 640ms, not 3000: the outbound duration
*is* the confirmation gesture, and a refund is not a gesture anybody is
performing, so it only has to be long enough to see where it went.

Where it lands is measured by rendering the after-state, reading whichever slot
changed, and rendering the before-state back — two synchronous renders with no
paint between them, so the wallet never flickers forward. **Which slot changed is
not always a pencil**: past four the wallet counts, and there the landing is the
`+2` ticking to `+3`. That is the right target and it took writing the wrong one
first (the last drawn pencil, which does not move at all when five becomes six).

Two edges. At the **cap** nothing flies: the refund is real but the wallet cannot
hold it, and a pencil landing in a full tray would say otherwise. And
**discarding an unproposed draft flies nothing**, which is the whole point of the
symmetry — a draft has cost nothing, so there is nothing to hand back. The 🗑️ is
the same glyph in both places precisely because the difference is whether an edit
comes out of it.

**The arc.** Ed: *is it easy to give the pencils slightly different curved flight
paths each time?* Yes, once the animation stops being a CSS transition. A shape
that changes every flight cannot be a keyframe rule, so the journey is now a
quadratic — bowed off the straight run by a signed amount drawn fresh each time,
sampled into 21 keyframes and handed to the Web Animations API. Which side it
swings and how far are the whole of the variation; everything else about the
journey is fixed, which is what keeps it from reading as a glitch. The bow runs
9–24% of the flight's length, so the curve peaks 4–12% off the straight line:
enough to see, not enough to look thrown.

Two details the arc forced. The rotation runs **alongside** the curve rather than
following it — an emoji has its own axis, so a pencil steered by its path points
its tip somewhere different in every font, and `offset-rotate: auto` was the
first thing tried and the first thing removed. And every keyframe carries a
`translate(-50%, -50%)` in front, because the element is placed at the *centre*
of its slot and has to be pulled back by half itself; the alternative is
measuring the glyph before it exists.

WAAPI also bought a better let-go. The pencil now comes home **along its own
arc** — the flight run backwards at four times the speed — rather than taking a
second, straighter journey home, which is what the old fixed 220ms transition
did. The way it came is the way it goes back. Four times, not one, because
rewinding at the speed it flew would punish a late change of mind with a
three-second wait.

Both landings carry a `setTimeout` backstop beside `onfinish`: a document
timeline is paused while a tab is hidden, and the one thing that must not happen
is a wallet left holding a gap for an edit that is no longer in the air.

---

## The patch is joined at its cards, and a deadlock waits until you have judged (2026-08-17)

**Patch cables.** The spine used to run down the middle of the gutter,
bracketing the runs where they left the rail. That says *these three pointers
are one*, which is a claim about the margin index; the thing that is actually
one is the three clauses. At three sites it read as a bracket rather than as an
object.

The link now runs down the `chip-gutter`, between the `clause-tab`s of the
patch's own cards. It joins the things themselves, in the column where the
document says what is happening to it — and it is the only cable on the surface
whose two ends are both already marked, so it carries no cap: a landing ball
says *this clause, here*, and both of these ends are a tab that has already
said it.

Two versions. The first ran end to end, from one tab's bottom edge to the next
one's top, which covers no glyph and looked right until it met a clause that
stacks several tabs and ran straight down through the one below its own. Ed's
correction — *out of the left of the clause-tab, curving neatly upwards or
downwards* — is the right shape for a better reason than it not crossing
anything: it is the shape every other cable on this surface makes, a stub, a
corner and a straight run. And **a cable that never enters the column cannot
cross what is in it**, which retires the whole problem rather than routing
around it. It also lets the cable leave from the patch's *own* tab rather than
from whatever strip happens to hold it.

Consecutive segments share the run and overlap at each middle tab. That costs
nothing — the ink group carries the alpha, so a shape drawn twice is not drawn
darker, which is the same property that let a spine cross its own runs — and it
gives the middle sites a proper drop off a through-run instead of two cables
meeting end to end.

`clause-tab`s joined the shadow's clip holes at the same time. A tab is an
object at card height with a contact shadow of its own, and it sits *outside*
its card's box, so punching only the cards left the new cable shadowing every
tab it ran between, including the two it joins. Same rule as before, one more
member of the layer: **a thing does not shadow its own layer.**

**Deadlock waits.** Ed's ruling on 297/298: *force drafters to do all the
judging in the race first, and then encourage them to propose alternatives* —
per race, not per document. So a deadlocked race is an ordinary 💡 until you
have judged it, and turns ⚔️ only when it has nothing left to ask you.

This is not only clearer, it is better evidence. The judgments it extracts are
exactly the ones most likely to unstick the race, and **a deadlock declared
before the room has finished judging is declared early**. The old surface told
you the race was stuck before you had contributed the one thing you could still
contribute.

It also makes deadlock a **personal** state, like ⏳, which is what finally
makes the alphabet consistent: *a mark says what the document wants from you,
not what state the machine is in.* ⚔️ is tested before ⏳ everywhere, because it
is the state that replaces it — you have judged, and where an ordinary race
would now go grey and run on without you, this one still wants something.
Yellow still, and the palette rule is why: hot for actions, and a bridge is an
action. What changed is *which* action, and that is the glyph's job to say.

Three consequences fell out. A stuck entry does not collapse to one line, since
it is asking for the largest thing on the surface. Its caption is a second
string (`capStuck`), because before you are through with it the entry is an
ordinary race and must say ordinary-race things. And the bridge button moved
off the race card onto every card type: what makes a bridge the ask is that
judging has stopped moving the question, not what shape the question has.

**⚔️ rather than ❌.** A cross says *this failed*, which is both wrong and
discouraging — nothing failed, the room disagrees, and the disagreement is
exactly what makes writing a bridge worth doing. Crossed swords say two things
are still fighting. It also stops the mark being read as a close button, which
at 13px beside a card it plainly was.

The fixture carries one of each: `race-sanctions` is already judged, so ⚔️ is on
the surface at load; `race-guests-notice` is stuck and says nothing about it, so
the transition can be watched. Judging it turns the entry, keeps the card open,
and puts the pen in the commit row you have just used.

**And the pencil tumbles.** One flight in five turns once, one in twenty twice,
one in a hundred three times — in the direction it was thrown, since the curve
and the tumble come off the same flick. Whole turns only, so it always lands in
the pose it would have landed in anyway. A rarity you cannot make happen is
worth more than one you can: the point is the flight you were not expecting, and
a pencil that spun every time would just be a pencil that spins.

---

## The deadlock card, and what eight proposals taught (2026-08-17)

Ed's objection to ⚔️ as I first built it — a race card with a bridge button on
it — was stronger than he put it. It isn't only that a re-vote control sits
oddly beside a call to action: showing you the field *and* leaving your vote
open is exactly the informed-judgment-in-a-blind-field that SPEC §3.5 exists to
prevent. And the converse is the permission that makes the card possible at all.
§3.5 allows the briefing — standings, splits, camps — in one circumstance: a
race that has left the judgment stream. §8.3b now says that happens, for you,
when the race stops asking you things.

**Then Ed asked the question that removed the whole problem: *if we don't give
numbers, do we still need to lock?*** No. A card showing the field's rankings is
the briefing, and would have to close your judgments with it. A card showing
only **wordings and their arguments** leaks nothing at all — every candidate text
and rationale is already public — so it takes nothing away, needs no warning,
and needs no rule. The cheaper card is also the better one, and it needed asking
rather than designing around.

He also caught a sloppy word. I had written that the deadlock card *replaces*
the race card; it can't, because by the time you see it the race has nothing
left to ask you. There is no live judgment card there to replace — what was
there was a record of pairs you had already decided.

**The shape.** The clause at the head, reference only. Then the card's own voice
in the band the field would otherwise start — *the room has stopped moving on
this; more judging will not decide it* — which on any other card would be a
caveat at the foot and here is the point, so it goes first. Then the field:
everything in flight, full width, oldest first. Arrival order is the only
ordering that is not a ranking, and it happens to be the useful one, because a
field of eight is largely a conversation in which each wording answers the ones
before it. Then what you said, as a grey record line rather than a control — one
line for however many pairs it took, since the card is about the race and not
about any pair in it. Then ✏️ **Write a bridge**, at the right where every
commit control lives.

### What eight proposals taught

Ed asked to see a race with eight, and it was the right instinct: the design
question only appears at that size. **The field is a wall of near-identical
sentences.** They all open *The house may ask for an apology* and diverge in the
middle, so you have to read each one whole and hold it in your head.

Two fixes tried and rejected, both worth recording.

**Marking against the clause** — `result-only`, what every other card does —
marks **three of the eight**. The floor in `wordingHtml` is measured against the
incumbent, and a wording this far from the clause is a rewrite rather than an
edit, so it states itself plain by design (Q92). Half a field wearing green
reads as arbitrary, which is worse than none of it.

**Ranking** is unavailable by construction. Being level is what deadlock *means*,
so the axis a decided card sorts on is precisely the one that says nothing here.

The finding underneath both is the useful one, and it is now Q301: **at eight,
the comparison you need is not each-against-the-clause but each-against-the-
others**, and nothing computed against the incumbent can draw that. Q305 (a
six-word advisory label per wording) and Q306 (the `camp-map`) are the two ways
out, and 305 is the cheaper: two candidates with near-identical labels are
visibly one camp without anything having to say so.

---

## The deadlock card gets its desk (2026-08-17)

Three notes from Ed, and each of them made the card more like the rest of the
surface rather than less.

**The green marking, with the floor forced off.** I had left the eight wordings
plain because `result-only` marked only three of them, and half a field wearing
green reads as arbitrary. Ed asked for the green anyway, and he is right — the
fix was to look at *why* three. The floor in `wordingHtml` is measured against
the incumbent, and each of these is far enough from the clause to count as a
rewrite, so the card that most needed the marking was the one the floor was
silencing. But the floor exists to stop a **lane** being lit end to end beside
its incumbent (Q92); here the incumbent is at the head and comparison is the
entire purpose of the band. So the deadlock card forces it off, and the effect
is the thing I had gone looking for camps to provide: the shared spine stays
black, each attempt's own move lights up, and eight wordings become scannable
in one pass. It weakens the case for Q305/Q306 considerably — they are now
improvements rather than rescues.

**✏️ propose edit on every candidate**, as every wording on this surface
carries: the lane bar minus its radio, since nothing here votes. It is also the
answer to *what do I do with all this* — you take whichever came closest and
write from it. `laneSeed` grew a `slate:N` case for the seed.

**The desk on the card.** *At the bottom we should have a full proposal edit
box, with discard and submit buttons.* This is the move that makes the whole
thing cohere: the eight wordings are not a reference you go away from, they are
what you write **against**, so the reading room and the desk are one surface and
the field stays on screen above the box while you use it.

It is the same `laneBoxHtml` the `editing-card` uses — extracted for the
occasion, because *two boxes that drift apart is exactly what "full" must not
come to mean* — and the same commit row, 🗑️ at the very left and hold-✏️ at the
very right, so the proposal's lifecycle is the one row it is everywhere else and
the pencil still flies out of the wallet to pay.

Two things fell out of the extraction.

The whole box's styling was scoped to `.editcard`, so on the deadlock card the
placeholder, the blue caret and the lift all silently did not apply. Rescoped to
`.lanebox`, which is what they were always about. **A component that moves needs
its CSS to be about the component, not about where it used to live.**

And the empty state needed a mechanism. The desk is there before any draft
exists, so the lane holds the clause and is a real editor, and the first
keystroke opens the draft with that character already applied —
`startDraftFromTyping` doing the whole job unchanged, because the box carries
`data-key` exactly as a paragraph does. Which is the tell that this is
`always-on-typing` and not a second mechanism resembling it. The rationale gets
the same treatment, since people do sometimes write the reason first.

One guard: `startDraft` normally opens the draft's own card, which would have
carried the surface away from the field you came for. It now keeps a stuck host
card open and simply re-renders, with the desk backed by a real site.

### Five corrections, and one of them was a question (2026-08-17)

**✏️ moved above the reason.** On an ordinary card the lane bar carries a radio
as well, and that radio is a judgment about the whole block — text and argument
together — so it belongs at the foot of both. Here the only control is ✏️, which
is about the *wording*: it seeds the desk with these words, not with this
reason. **A control belongs against the thing it acts on.** It also goes to the
right rather than sliding into the space the missing radio left.

**The desk lost its blue ground.** It had one on the argument that it is the one
band on the card that is not reference. But the box inside it is already lifted
and is already the only thing on the card you can put a caret in — a tint behind
a lifted box says the same thing twice, and it made the desk look like a
different kind of object from the wordings it answers.

**The desk starts with the clause, in the document's own ink.** It was greyed as
an "invitation"; that was a mockup conceit dressed as a state. It is text you are
about to work on, so it looks like text.

**The record band is gone**, and the question that removed it is a good one to
keep: *what purpose is this serving?* It said what you preferred, how many pairs
you judged, and how many people had weighed in — the sealed record's shape,
carried across without asking what it was for **here**. Two thirds of it helped
nobody write anything. The part that did is the weight of evidence, because it
is what makes the claim above it credible: this is stuck, not merely unlooked-at.
So it moved *into* the claim, and the band went.

**The commit buttons are lifted**, because they are actions for the box above
them and the box is lifted (Ed). A flat control under a raised surface reads as
belonging to the card rather than to the thing it acts on; putting them at its
height joins them to it. They go down on press and stay flat while disabled —
nothing to act on, nothing to raise.

### Four more, and a rename (2026-08-17)

**✏️ propose edit did nothing on the second press.** `startDraft` seeded a site
only when creating one, so once the desk held a draft — which on a deadlock card
it does from the first press, or from the first keystroke — every later ✏️ was
inert. Which is precisely the use the card is built around: reading eight and
trying two of them. A seed now **replaces** what is in the box, and the origin
travels with it, so the green marking is measured against the proposal you took
rather than against the clause. The cost is that it overwrites what you have
typed; 🗑️ is beside it, and Ed's instruction was explicit.

**The lift was there and invisible.** `--shadow-sm` under a bordered button is
nothing you can see; the box beside it wears `--shadow-md`, and matching the box
was the whole point. Lesson repeated from the cable: **match what the eye sees,
not what the token says.**

**The stuck entry says what is stuck, not what people argued.** A teaser is
somebody's case for their proposal — the right thing while the question is
*which of these*, and the wrong thing entirely once it is *can you write a
better one*. Quoting two of eight arguments there picks a side by accident and
says nothing about the state the entry is in. It now reads: *Deadlocked — 11
people can't agree on a proposal even after 34 judgments. Can you propose
something everyone will agree on?* The caption under it went with the change:
it said two thirds of the same thing in smaller type, and there is no progress
to report on a deadlock anyway — that is what deadlock means.

**"Wordings" became "proposals" throughout** (Ed). Worth recording why it was
ever *wordings*: the word was doing real work in a race, where two candidates
differ only in how they say the same thing, and *proposals* felt too heavy for a
comma. But it is jargon the surface invented, the objects are proposals
everywhere else in the product, and a reader meeting a new noun for a thing they
already have a name for assumes it must be a different thing.

### The helper text comes off the rail too (2026-08-17)

The same pass the cards had, run on the queue entries, and the same rule
decided it: **a line that appears on every entry of a kind is a design note,
not information. Information is what differs between entries.**

**The progress caption is gone from every open card.** *Gathering — needs
roughly 4 more judgments* sat directly above the `evidence-meter` that already
draws exactly that magnitude as a bar. Two devices, one fact, and the words on
every card in the rail. It survives as the entry's tooltip, where it costs no
ink and still answers a reader who wants the number the bar is only showing
them.

**✏️ no longer says "yours".** The pencil means *you wrote this*, the entry is
the accent blue, and a word saying it a third time is the surface reading its
own glossary aloud. The place count survives, because it says *which* place and
nothing else does. The unproposed draft's caption went from *a draft of yours ·
not proposed yet* to *not proposed yet* — the first half was the same
redundancy, the second half is a real state.

**✅ and ❎ give just the time.** The tick already says *decided, and the charter
changed*; the cross already says *decided, and the incumbent held*. Writing
"decided" beside them was the glyph's own meaning spelled out, which left the
one thing the reader actually wants — *when* — carrying a preamble.

What stayed, and why: the teaser on an open card (somebody's argument, different
on every card), the verdict on a ⏳ or 🔄 (what *you* said, which is the thing
you are most likely to have forgotten), the place count on a patch, and ⚔️'s
sentence — which is not a caption but the entry's whole content, and is
different in kind because it states a situation rather than a progress reading.

### Long titles, and the last of the helper text (2026-08-17)

**Three sections got long names** — *The Shed, the Cellar and the Space Under
the Stairs*, *Nomination, Seconding and the Standing of a Candidate*, *The
Duties of a Member Towards the House and Towards Each Other* — because a charter
really does have sections named like that and the fixture had been quietly
flattering the design with short ones. All three columns hold: the contents rail
wraps to three lines, an open card's title wraps and takes the height it needs,
and a sealed entry ellipses against its right-aligned time. **Worth watching:**
a long title on a sealed entry truncates hard, because the time now claims a
fixed slot at the right — *The Guest Bedroom — …* is about all that fits. The
tooltip carries the outcome, but if that reads badly the fix is a shorter time
format in the rail rather than giving the slot back.

**The time is right-aligned on ✅ and ❎**, which needed the row to become a flex
rather than one truncating line: the title takes what is left and ellipses, the
time never gets eaten by a long one. It is also the one thing on a sealed entry
you scan *down* a column for, so a ragged right was making a column out of the
wrong edge.

**The verdict came off ⏳ and 🔄.** It quoted the wording you had preferred,
which on a one-line entry beside a title is six characters and an ellipsis.
Unreadable text is worse than none, because it looks like something you are
failing to read. The mark already says you have judged; the card says what you
said, in full, when you open it.

**The draft's caption went entirely.** *Not proposed yet* was true and it was
also the state you are plainly in, since you are typing into the box beside it.

**The deadlock card lost its voice band.** It said what the queue entry says, to
a reader who has just clicked that entry — the second time in two seconds, with
the ⚔️ tab and the desk's own label saying it a third and fourth. The card is now
clause, field, desk: reference, then work, and nothing on it explaining itself.

**☑️ left the contents rail** (Ed). It was already the first mark dropped when
they would not fit, so this is the honest version of that rule: a filed decision
is finished, and the rail is the column read as *where is there anything*. In
the gutter it stays, because there the question is *what has happened here* —
a different question with a different answer.

### A rhythm audit of the decision cards (2026-08-17)

Measured every card type's bands — quick, race, patch, your-proposal, editing,
deadlock, sealed — and the good news first: the **band rhythm was already
consistent**, and it is a single rule. *Twelve above and twelve below every
hairline.* Card padding 14/24, the `clause-head` closing on 12, each `field`
opening on a hairline with 12 above and below, the commit row the same, a `foot`
hanging 8 under it with no rule.

Five strays, all of them inner boxes tuned in isolation rather than against the
rhythm around them:

- `.pnav`, the patch stepper: `gap: 10px; margin-bottom: 10px` beside a
  `padding-bottom` of 8. Three different numbers in one three-line rule.
- `.ranked` and `.replaced`, the sealed record's blocks: `padding: 10px 14px`,
  where their sibling `.stoodblock` used `12px 14px`. Three boxes in one card,
  two vertical paddings.
- `.replaced` again and `.stoodblock`: `margin-bottom: 14px`, where every band on
  every card closes on 12.
- The deadlock desk: `margin-top: 16px` on a band whose hairline everything else
  clears by 12 — and its field's blocks at 16/16, which I had set deliberately
  for a long field and which is exactly the kind of local reasoning this audit
  exists to catch. The hairline separates them; it does not need help.
- `.lanectl`, the B / I / [] strip: `padding: 5px 8px 0`. 5 is not on the grid at
  all.

All now on the 4px scale and on the card's own rhythm. Nothing moved more than
4px, which is the point: **these are the errors you cannot see one at a time and
can feel all at once.**

**And the commit buttons follow the box up.** The lift was already matched at
rest — both `--shadow-md` — but the box climbs to `--shadow-xl` on
`:focus-within`, so for the whole time anybody is actually writing, the buttons
sat visibly below the thing they belong to. Keyed off the card, since a box
cannot style its own siblings.

**The draft entry no longer appears while you write in the ⚔️ desk** (Ed). It put
a second rail entry beside the ⚔️ one, at the same clause, for a proposal nobody
else can see yet. The entry earns its place on an ordinary draft because it is
where you read your rationale back as you type; on the deadlock card that field
is six inches away on the card you are looking at. It appears when you propose,
which is when there is something to point at.

### The four decided marks stop being plates (2026-08-17)

Ed: *they carry their own background unlike all the other symbols.* Exactly
right, and it is the one structural difference in the alphabet. 💡🔥🌶️✏️⏳⚔️ are
silhouettes — a shape on the page. ✅❎☑️🔄 are a **coloured plate with a shape
knocked out of it**, so beside the others they read as a different *kind* of
object rather than as a different state, which is the one thing a single
alphabet must not do.

They are now text-presentation glyphs — `✔` `✘` `✓` `↻`, each with U+FE0E to stop
the font reaching for the emoji — which means they take a `color` like any other
character. Three consequences, and the second and third are the reason this was
worth doing beyond the plates:

- **The palette chooses the colour**, not whichever emoji font the reader
  happens to have. Segoe, Apple and Noto all draw ✅ differently and none of them
  asked us.
- **It is the same in all four columns.** They are drawn through one `mkHtml`,
  so the queue, the contents rail, the gutter tab and a card's head cannot
  drift.
- The two ticks stay distinguishable in code as well as on screen: `✔` heavy for
  *adopted*, `✓` light for *filed*, which also puts the lighter glyph on the
  quieter state.

Kept at the colours the emoji happened to have, so that the change under review
is the plate and nothing else. **Two of those colours should probably not
survive** and are raised with Ed rather than decided here: a **green ✘** is a
strange object once we are choosing it rather than inheriting it — *the
incumbent held* is a decision, but drawing it in the adopted colour says the
opposite of what a cross says; and the marks now carry colour **in the contents
rail**, which the surface's own rule says they do not.

Also, ✏️ *propose edit* went back under the rationale on the deadlock card, at
the right — the place a lane bar sits on every other card. It had gone above the
reason on the argument that the control is about the wording rather than about
the block, which is true and is outweighed: a reader who has learnt where a card
puts its controls should not have to learn again here. **Consistency across the
surface beats local precision inside one card.**

### The matched pair, and filed keeps its answer (2026-08-17)

Ed asked whether there is an X the same shape as ✔. There is, and it is **not**
the one Unicode designed for the job: the pair is 2714/2718 ✔✘, and 2718 is
calligraphic — tapered strokes with a lean — so beside a solid heavy tick it
reads lighter and tilted. **U+2716 ✖** is the same solid uniform weight and sits
upright, which is what a pair has to do at 13px in a margin. Rendered all five
candidate pairings at 34px to see it; the difference is obvious once they are
side by side and invisible in a spec table.

**Green ✔ / green ✖ for decided, grey ✔ / grey ✖ for filed.** Which way it went
is the glyph; whether it still wants something from you is the colour. That is
the rule the whole palette already runs on, arrived at from the other end.

The grey ✖ is new, and it is the better half of the change. ☑️ **collapsed both
outcomes** into one mark the moment you acknowledged them — so a settled clause
in the margin stopped telling you the one thing anybody ever wants from it:
*did this change, or not?* A row of sealed dots used to be four identical ticks;
it now reads ✔✖✖✔, which is a summary of what happened here.

One refactor came with it, and it was overdue. Two states now share a character,
so nothing can identify a mark by its glyph any more. `markKindOf` returns the
**state** and `MARK` maps state to glyph — which also collapsed the duplicated
ternary that `markOf` and the colour lookup had each grown a copy of. Missing
three call sites that still passed glyphs printed `undefined` in the rail, which
is the good kind of bug: loud, immediate, and impossible to ship.

### Green for what changed, and the marks get drawn (2026-08-17)

**Ed: *I still see the calligraphic check.*** He did, and the font was the
reason. U+2714 was the right code point and the wrong object: system-ui has no
glyph for it, so it falls through to Segoe UI Symbol, where the heavy check mark
is a **tapered brush stroke**. At 34px in a comparison it reads as a solid tick;
at 18px in a gutter chip it is a thin calligraphic squiggle beside a geometric
✖ — the exact mismatch the pair was chosen to avoid, and a *different* mismatch
on every machine.

So the two marks that have to match are now **two SVG paths on one stroke
width**. They cannot drift, they scale, and they take `currentColor`, so the
lifecycle classes still colour them. ↻ stays a character: it has no partner
whose weight it must equal, and no font disagrees about an arrow.

The lesson is the cable's, again, one level down: **testing a glyph at display
size tells you nothing about it at 13px**, and a font stack is a hope rather
than a specification.

**And green comes back to the margin, for one state only.** Ed's own caveat was
the sharper half: an adopted decision *changed the document you are reading*; a
retired one did not — somebody proposed, nobody liked it, the charter is exactly
as it was. Grey for both said they were the same event.

- **✅ adopted, unread → a light green wash** (`--lc-changed`). It is news.
- **❎ retired → grey, and it no longer pins.** Acknowledgement is for news;
  there is nothing to review, so it goes straight to a filed dot — findable,
  openable, silent.

This tightens the palette rather than loosening it. The rule is *grey means
nothing is being asked of you*, and a ✅ that pins itself to your screen until
you press **OK, I've seen this** is asking for something — it was the one place
the rule was being broken. Q264 survives intact: green enters the margin as a
*wash*, never as `--ok` itself, which is the same relationship every other
lifecycle hue has to its card.

One line did it: `isUnread` now requires `carried`, and everything else — the
sealed dot, the missing OK button, the urgency floor — falls out of that.

### What pins itself, finally (2026-08-17)

Ed, on the un-pinning: *I want to see ❎ if I have judged on it and not
otherwise, because otherwise I'll wonder what happened to it.* Which is the
half I had missed, and it completes the rule rather than reversing it.

An **adopted** decision always pins: the text under your eye moved, which is
news whether or not you had anything to do with it. A **retired** one is not
news — nobody liked the proposal, the charter is exactly as it was — so it does
not pin *unless you judged it*, in which case it is not news but it is an
**answer you are owed**. You put something in; being left to wonder what became
of it is its own small failure, and a cheap one to avoid. A retired race you
never touched goes straight to a filed ✖ dot: findable, openable, silent.

The general rule, which is the thing worth keeping: **a decision announces
itself if it changed the document, or if you are part of why it did not.**

One correction fell out of it immediately. A pinned-but-retired entry was taking
the green `--lc-changed` wash, because green had been attached to *pinning*
rather than to *changing*. It is grey: green is for what changed, and this one
holds a slot in the margin for a different reason. The fixture now shows both —
§ Nomination retired and judged, pinned in grey; the larder's food rule retired
and never judged, already a filed dot on load.

### A one-line self-inflicted wound (2026-08-17)

Clicking the pinned § Nomination entry opened nothing, silently. The cause was
mine and it is worth writing down because the mistake is so easy to repeat:
tidying an unused `const yours` out of the `deadlock-card`, I ran a *single*
string replace on `const yours = verdicts.get(s.id) || s.verdict;` — and that
line appears twice, with `sealedCardHtml`'s copy first in the file. So the
deadlock card kept its dead binding and the **sealed record lost its live one**,
which threw a ReferenceError inside the render and left the click doing nothing
at all.

Two rules from it. **A "remove the unused variable" edit is not a text edit** —
the line that is unused in one function is load-bearing three hundred lines up.
And a silent failure to open is worth treating as a thrown error until proved
otherwise: nothing on the surface said anything, and the console had been saying
`yours is not defined` since the moment it broke.

### The dot rows go (2026-08-17)

Ed: *for retired (grey) queue-cards, let's try them back as full-width
one-liners; I don't like the way they interact with cables and they feel
inconsistent with how the queue works.* Both halves are right and the second is
the deeper one.

The dot rows broke the rail's own rule. `needs-you-queue` is a **margin index**
— *every entry stands beside its own clause, so where an entry sits is never a
claim about importance* — and a shared row packed up to eight document positions
into one position. Everything else in that column is one entry at one clause;
these were several clauses at one entry, which is why they felt like a different
mechanism rather than a quieter state.

The cable is the same fault made visible. A wire had to land on a 20px dot
inside a row that was not beside the clause it pointed at, so the one thing a
cable says — *this clause, here* — was being said by a shape standing somewhere
else.

Space was the argument for the dots (106), and the rail has since stopped
drawing what does not fit at all: the "+n further off in the charter" tally went
at Ed's word earlier today. So the saving was being paid for after it had
stopped being needed — which is the general shape of a lot of this, and worth
naming. **When a constraint is lifted, the things built to live under it do not
remove themselves.**

A filed line is now the same object as an unacknowledged one, quieter: same
shape, muted weight and colour, and the mark still says which way it went.

### The sealed record, cleaned (2026-08-17)

**The acknowledgement commits where every other card commits.** It was a
labelled button at the *left* of a row of its own, with a caption beside it
saying what would happen if you did not press it. It is now a glyph at the
bottom right, which is where the judgment row's ✓ and the proposal row's ✏️ both
live — the same object doing the same job on a different card.

**The glyph is an arrow into a tray**, drawn on the same stroke as ✔ and ✖ so a
control and a mark never look like they came from different sets. It cannot be a
tick: a tick is now the *outcome* mark, and a green one would sit two inches
from the green ✔ this card is about. And a tray says what pressing it does —
this leaves your margin and goes into the record — where *OK* says only that you
have stopped reading.

**Then the same audit the cards had.** A record of five proposals was saying
several things five and six times over:

- Every block carried *against the current text · below the bar of 0.72*. That
  is the same number printed five times, and a sixth in the record beneath. The
  axis and the bar moved **up to the field label**, where they are stated once
  and govern everything under them, and a block now states only its own score.
- Four blocks said *not adopted*, which the rank numbers 2–5 already said, and
  the winner said *✓ this is the text that stands* directly under a head labelled
  *the clause as it now stands*.
- The eyebrow said *Decided · adopted*, which the head label and the gutter ✔ had
  each already said.
- *The text it replaced* was followed by *the charter no longer holds this*.
- The commit row's caption explained what not pressing the button would do.

**And the scores became a column.** They had a line of their own under each
rank, so five numbers meant to be compared sat at five different offsets with a
paragraph between each pair — while the row above them was half empty. They now
right-align in the rank row: 86 · 58 · 49 · 35 · 21, readable as a single fall.
A set of comparable numbers wants a column, and the space for it was already
there.

**Percentages, not decimals** (Ed). 0.74 is the number the model holds; 74% is
the number a person holds. It also helps the one thing this figure's tooltip has
always had to say in words — *this is not a vote share* — because a bare decimal
beside a headcount reads *more* like a share, not less. Whole percent: the second
decimal was only ever suggesting the model is more precise than it is.

---

### One list, and the incumbent is in it (2026-08-17)

Ed: *it should be the list of the whole field, with the winner at the top, and
the incumbent clearly marked, and OK at the bottom. At the moment it has current
text as previous text twice.*

The card was three bands before the reader reached anything ranked — the clause
at the head, the text it replaced in a band of its own, then the field — and on
a clause whose rewrite changed one sentence, the first two are two paragraphs
that look identical. The fix is his: one list.

**The incumbent has a true place in it.** Every score on this card is the
probability that proposal beats the current text, so the current text sits at
**50%** by construction. Slotting it there is not a layout convenience — it is
the line that says *these two beat what we had and those three did not*, which
is the most useful sentence on the card and was nowhere on it before. On § the
Guest Bedroom the column now reads 86 · 58 · **50** · 49 · 35 · 21, and the
whole outcome is legible as one fall of numbers.

It shows its 50% too, quietly. Without a number in the column it just sits
between two rows and the placement says nothing; with one, the column explains
itself. Muted weight, because it is a construction rather than a measurement.

**And whichever text is the clause at the head does not print itself again** —
the winner where it carried, the incumbent where it held. The same rule in both
directions, and it is the whole of the duplication the three bands were making.

**The button is a word.** The tray-and-arrow read as *download*, which is the
wrong verb entirely: nothing is being taken away, it is being put down. Every
other candidate has the same trouble — an archive box says *storage*, an eye
says *seen* rather than *done* — and there is no glyph in common use for *I have
taken this in*. **When a set has no member, the word is not a fallback, it is
the answer.**

(Ed's 👏-if-it-passed / 🎻-if-it-failed is the funniest thing proposed all
session and has to be declined for a real reason: authorship is sealed, and a
violin is the surface editorialising about somebody whose name it will not
print.)

---

### The card starts at the top of the field (2026-08-17)

Ed: *I don't want "the clause as it now stands" at the top — I want the card to
start at the top entry in the field, with the text. And instead of highlighting
it green, remove the box that it's in.*

The head was printing the clause and the field was printing the same text again
as its first entry, because **on a decided card the top of the ranking is the
clause** — the winner where it carried, the incumbent where it held. Two ways of
saying that were one too many, and the head was the one carrying nothing the
ranking did not already have.

So the top entry *is* the head. It keeps the head's machinery — the gutter mark
that closes the card, the washed block sitting on the paragraph's own axis, the
geometry the opening motion is measured against — and gives up only its label,
which becomes the entry's own rank, outcome and score: **1 · adopted · 86%**, or
**the text that stood · 50%** where nothing displaced it. Its rationale follows
directly beneath, and the rest of the field follows that.

The winner also loses its box, which is the better half of Ed's note. A
green-bordered panel was saying *this one* to a reader who could already see it
at the top of a ranked list, under a green ✔, at the head of a card. Four
devices for one fact.

One consequence worth noting: the field label went with the head, so the bar
moved up into the eyebrow — *Decided · the bar was 72%* — where it governs every
number on the card including the one now in the head. That is the third home
that sentence has had today and the first one that is above everything it
describes.

---

### Units, and the label the hairline made redundant (2026-08-17)

**The field label went** — *the rest of the field · scored against the text they
were measured on*. The hairline above it already says *and here is everything
else*, and the axis those numbers sit on moved into the eyebrow, in the units
themselves. A band label that repeats what a rule already draws is the same
mistake as a caption that repeats what a bar already shows.

**The incumbent says what it is where its number was.** Its 50% was true and
unhelpful: a construction dressed as a measurement, standing in a column of real
ones. *Previous text* is the thing its position in the column already implies
and that nothing else on the card said in words — and where it **held**, the
slot stays empty, because the clause at the head is not previous anything and
its label already says it stood.

**And the eyebrow states the outcome, in units** (Ed's idea). Two quantities are
being compared and they are different in kind: what the room came to think, and
the line that had to be crossed. With a mark on each, the whole result is one
line — **86%👍 > 72%✒️**, or **41%👍 < 70%✒️** — and the comparator does the work
a sentence was doing.

Line art was tried first: a gauge for the reading, a hurdle for the bar, drawn
on the same stroke as ✔ and ✖ so a unit would not look like it came from a
different set. The honest finding is that **at eyebrow size line art does not
survive** — at ~11px the gauge read as a caret and the hurdle as a Greek letter,
and enlarging it to ~16px made it legible but far too loud for a unit. Emoji are
bitmapped for exactly this size, which is the one job they do better than
anything we can draw; the cost is that they bring their own colour back, which
is what we had just spent an hour removing from the marks. Ed's pair for now.

---

### The whole record in one line (2026-08-17)

Three more off the decided card, and together they collapse it to its bones.

**The head's label went.** It said *1 · adopted · 86%* directly under an eyebrow
that was already about the same decision — a rank for the top of a list you can
see is the top, an outcome the ✔ in the gutter says, and a score that now sits
one line above. `clauseHeadHtml` grew a `label: null` for it, which is worth
having anyway: a head whose eyebrow would only repeat what is around it should
be able to have none.

**The hairline went.** Every entry below it is in a box of its own, and a rule
above a row of boxes is a second boundary for the same edge. This is the third
time today a separator has turned out to be doing a job something else was
already doing — the queue's caption over its bar, the field label over its
hairline, and now the hairline over its boxes.

**And the record band went into the eyebrow.** It was three places for four
numbers that belong together: an eyebrow, a rank label under it, and a band at
the foot. Now it is one line, each number with its unit —

> **Decided · 7/14👤 · 86%👍 > 72%✒️**

— *seven of the fourteen weighed in, they came to 86%, and it had to clear 72%*,
in the space the word "Decided" used to have to itself. The two facts that do
not fit that shape, the quorum and what you yourself said, moved into the
eyebrow's tooltip, where they are still there for anybody who wants them and
cost no ink at all.

A thing worth noticing about the sequence: none of the three removals would have
been visible a week ago. They only become obvious once the numbers around them
are compact enough to sit on one line, which is what the units bought — **the
units did not save space, they made the redundancy legible.**

### The alternatives lose their numbers (2026-08-17)

Ed: *we don't need the number for each alternative in the race.* Right, and
for a reason the last change made visible: the list is in order, so a box's place
already says where it came — and the one comparison anybody actually makes is
against the text they had, which **the incumbent's own position makes without a
single number**: everything above it beat the charter, everything below did not.
Five decimals were answering a question the ordering had already answered.

The eyebrow keeps its two, because there the numbers *are* the point: what the
room came to, and what it had to clear. That is the shape this card has been
converging on all evening — **the quantities live in one line at the top, and
everything below it is text in the order the room put it**.

Correction, same minute: Ed meant the number at the top **left** — the rank —
not the score at the right. So the scores came straight back and the numerals
went instead, which is the better cut of the two. A numeral on each box was
counting the boxes for a reader who can see them, and it made the field look
like a leaderboard when what a record wants to say is *here is everything that
was tried, best first*. The score is the one that carries something the ordering
does not: how close each came.

Worth keeping the shape of the mistake, since it is a cheap one to repeat: the
argument I wrote for removing the scores — *the ordering already says it* — was
a perfectly good argument, and it was an argument about the **other** number.
A justification that fits the thing you removed is not evidence you removed the
right thing.

### Three last cuts on the decided card (2026-08-17)

**"Not filed yet" went.** The button says what pressing it does and the entry in
the rail says it has not been pressed — a label whose whole job is to sit there
until you act is a caption for the *absence* of an act.

**The hairline above the action row went**, for the same reason as the one above
the field: the boxes above it and the button in it are both objects with their
own edges, so the rule was drawing a third boundary between two things already
separated. Two hairlines removed in one evening, both of them separating things
that were already apart.

**And the winner's reason got room.** It is the head's reason, not a field
entry's, so it wants space above to sit *under* the text rather than against it,
and more space below to close the group off before the field starts. 12 above,
16 below — the only place on the card where the rhythm deliberately opens, and
it opens because that is where one thing ends and a list begins.

---

### ❄️ — the first design for Skip that had somewhere to go (2026-08-17)

Skip has been homeless for weeks: an act with no obvious place, no obvious
glyph, and a meaning nobody could state in one line. Ed's design settles all
three at once, and it does it by **changing what Skip is**.

It is not an act on the judgment. Nothing is skipped, recirculated or decayed,
and no evidence is touched. It is a **toggle on the flame**: what it says is
*stop putting this at the front of my queue*, and it says it by taking the card
out of the running for 🔥, so the card drops back to an ordinary 💡 and the next
most urgent question takes the flame.

That is what a member actually means when they want to move on — and it is
reversible, because a mood is. Which in turn is what earns it a place beside the
✓ rather than a sentence of its own: **both are things you do to this card, and
only one of them is a judgment.** The old control said *Not this one, not now*
in five words in the middle of the row, because it could not say what it did in
fewer; a snowflake says it, and a pressed snowflake says the state as well.

The two acts share the right-hand corner in the order you reach for them — ❄️
first because it is the one that says *not now*, then the ✓ that says *now* —
grouped in a pair so `space-between` does not float the snowflake into the
middle of the row.

**Pressing it closes the card, and un-pressing it does not.** *Not this one, not
now* means you are going somewhere else, and leaving the card open behind you
would be the surface disagreeing; coming back to it is the opposite gesture and
wants the card to stay.

Ed also spotted that the ✓ was still the typed character while the outcome marks
had become drawn ones. It is the drawn tick now, which is right for the reason
the drawn set exists — a control and a mark should not look like they came from
different alphabets — and safe because the two never share a card: the commit ✓
lives on a live judgment, the adopted ✔ on a sealed record.

### The head is the clause, and the clause is not always top of the ranking (2026-08-17)

Ed, on § Nomination: *why does it have "the text that stood" box when that's
already at the top of the card?*

It printed the same paragraph twice, and the cause was one line:

    const top  = skey ? ranked[0] : null;
    const rest = top ? ranked.slice(1) : ranked;

`slice(1)` drops whatever leads the ranking, on the assumption that the leader
is also what the head is showing. The head shows `currentTextFor(skey)` — the
clause — unconditionally, and it must, because the head is the paragraph the
card opened out of: same axis, same washed block, same gutter mark, and the
whole opening motion is measured against those being identical. So the
assumption holds only while the clause happens to lead the field.

On an **adopted** card it always does: the winner is the clause and it is top by
definition. On a **retired** card it holds only until a challenger outscores the
incumbent's constructed 50% without clearing the bar — which is not an exotic
case, it is the most interesting outcome a retired race has. § Nomination is
exactly that: a at 52%, the bar at 74%. So `ranked[0]` was a, the head printed
the clause, the incumbent printed the clause **again** under *the text that
stood*, and a — the proposal the eyebrow's own headline number belongs to — was
sliced off the card entirely.

That second half is the worse one, and it is the reason to record this rather
than just patch it: the visible symptom was a duplicate paragraph, and the
actual damage was a **missing proposal**. The eyebrow said *52% 👍 < 74% ✒️*
over a field whose best entry was 29%. A card that repeats itself is annoying;
a record that omits a candidate is a record that is wrong.

The fix is a function that was already written and never called. `atHead` states
the rule in one line — *the winner where it carried, the incumbent where it
held* — and had been sitting three lines above the bug since the card was
rebuilt. `top` finds it; `rest` filters it out by identity rather than by
position. **A predicate that names the rule is not the same as an index that
happens to satisfy it**, and writing the first while shipping the second is how
you get a bug that is invisible in every fixture until one number crosses
another.

The fixture had been hiding it, too, and in a way worth naming. § Nomination's
candidate a was **word-for-word identical to the clause** — so before the fix
the duplication was between the head and the incumbent, and after the fix it
would have been between the head and a. A proposal identical to its incumbent
is one the `dedup-gate` would never have let race; it is a fixture that cannot
occur. The clause now reads without the household bar and a is the proposal that
would have added it, which is what both rationales were arguing about all along.
**Check the fixture is a state the engine can produce** — an impossible one
does not just fail to test the code, it disguises what the code is doing.

What the fix costs is 307: with the incumbent at the head it is out of the list,
and the list loses the line it was rebuilt to carry — *these beat what we had,
those did not*.

### Four tabs is already too many (2026-08-17)

Ed asked what I made of § Bringing a Guest with its card closed. Measured, not
looked at:

- the clause is 36px tall; its `chipcol` holds four tabs at a 33px pitch, so the
  column is **129px** — a 93px overhang;
- three of the four therefore stand beside prose they have nothing to do with,
  and the fourth (✏️) is level with the **next paragraph**;
- the held-open gap below the clause has a `chipcol` of its own, whose 💡 sits
  at y676 while the clause's ⏳ occupies 661–691. **They overlap by 15px** and
  render as a single blob with two glyphs sliced through it.

294 anticipated the first of these and put the threshold at twenty. It is four.
It did not anticipate the second at all, and the second is the more structural
one: each `chipcol` is laid out inside its own anchor, with no knowledge of the
anchor below, so nothing in the system can even detect the collision — let alone
decide who yields. The volume question is really two questions, and the one
nobody has asked is *what owns a strip of gutter when two anchors claim it*.

Worth saying plainly because it changes the priority: this is not a
degrades-gracefully-at-scale problem to be handled when rosters get big. The
fixture is a roster of fourteen with an ordinary number of live suggestions at
one clause, and the gutter is already lying about which text a mark belongs to.

### The tab stack (2026-08-17)

Ed's own suggestion, and it is the right one: *make them into a "tab stack"
which, when clicked on, opens the card they refer to, which then has the tabs
down the side of it.*

The first thing worth recording is that **half of it already shipped**. The tab
strip down the side of an open card has existed since the tabs travelled into
the `clause-head`, and it works — a card is ~380px tall, so four tabs at a 33px
pitch fit inside it with room to spare. The failure was never the strip. It was
the strip drawn at full height in a **36px gutter**. So the whole of the fix
belongs in the closed state, and the closed state has an obvious right answer
because the metaphor already contains it: **a strip of tabs seen closed is a
pile.**

That is why this reads as inevitable rather than clever. Nothing new is invented
— no badge, no cap, no overflow control, no second navigation route. The same
objects, in the same column, in the posture they take when the thing they are
attached to is shut.

**Four rules it needed.**

*What is at the front.* The pile has one target, so something has to lead, and
having to answer that is what closes 294's ordering question — before the stack
the gutter drew tabs in fixture order, which was arbitrary and harmless only
because every tab was its own target.

It is deliberately **not** `KEEP_ORDER`, and this is the part worth keeping. The
two lists look like the same list and answer different questions. The contents
rail ranks by **what must not be lost**: there ✏️ sits above 💡, because a
proposal of your own carries the largest remaining act and dropping it off the
screen is worse than dropping one 💡 out of many. The stack ranks by **what most
wants you**, because the front tab is the one that opens — and ✏️ wants nothing.
It is your own work, waiting. You do not click into a pile to be shown it.

**Retention and priority are different questions with the same-looking answer.**
The first version reused `KEEP_ORDER` and § Bringing a Guest immediately showed
why it could not: the pile led with your own draft and clicking it opened your
own draft, past two 💡 asking for a judgment.

*What the ones behind say.* Slivers of their own lifecycle hue. Colour is the
whole vocabulary on this surface, so an orange sliver says *something in here is
urgent* without drawing a flame, and the pile says how many by being a pile. The
alternative was a count — `+3` — which is precisely the tally Ed took out of the
queue this morning, and a tally in a margin is a permanent apology for a limit.

Two calibrations the first cut got wrong. The sliver needs a **stronger mix than
a tab face** (42% against 18%): the face is 30px tall and carrying a glyph, four
pixels of the same mix is a smudge, and the hue is the entire reason to draw the
pile rather than count it. And the slivers are **squared at the top**, because
a 6px radius eats most of a 4px band; the pile's own bottom edge keeps its
corners, so a stack still ends like a tab and not like a cut.

*The slivers are inert.* One stack, one target — which is what "opens the card
they refer to" means, singular. A 4px sliver is not a control to ask anybody to
hit, and the full strip is one click away. The cost, and it is real: you can no
longer go straight from the gutter to the third decision at a clause. The queue
is the other route in and the card's strip is the third, so nothing is
unreachable, but the gutter has stopped being a random-access index of a clause
and become a way in to it.

*The pile is fitted, not fixed.* This is the half that goes beyond the ask, and
it is what makes the collision **structurally impossible** rather than merely
rarer. `fitStacks()` runs after layout across the whole gutter and shrinks each
stack's peek until it reaches no further than the next mark — so a stack may use
the space down to the next mark and no further, and two anchors can never claim
one strip. Measured across all 32 columns in the fixture: zero collisions, and
§ Bringing a Guest went from 129px to 42px with 6px clear of the gap's own mark.

That rule is the answer 294 could not reach, and the reason it could not is
worth naming: **each `chipcol` is laid out inside its own anchor and knows
nothing of the one below**, so no amount of per-anchor cleverness can see the
collision, let alone resolve it. It takes a pass over the whole column at once —
which is exactly what the `needs-you-queue` already does when it steps entries
around a pinned card. *The gutter had not yet learned what the rail already
knew.*

A chipcol's top does not depend on `--peek` (it is absolutely positioned against
its block), so every top is final before the first write and there is no reflow
loop.

**And a bug that was already there.** The wire-shadow clip is one path with
`evenodd`, so two hole rectangles that overlap XOR back to **solid** — the
shadow reappears exactly where two punched objects meet. A pile overlaps by 26px
of every 30, so the stack would have made this glaring; going to look, 74 boxes
in the fixture were already resolving to 48 non-overlapping regions, meaning
twenty-six overlaps were already XOR-ing the shadow back on, most of them where
an active tab carries under its own card's left edge. Merged by bounding box
before punching. Over-punching where two objects genuinely overlap is right:
a thing does not shadow its own layer, whichever of them is on top.

**A new thing to be careful of.** `evenodd` on a union of shapes is only a union
while the shapes are disjoint. Nothing said so, and it held for months because
nothing at card height overlapped anything else — the invariant was real and
undocumented, and the first design that broke it would have been blamed for the
artefact it revealed.

### The filed pile, and two helper texts that went with it (2026-08-17)

Ed's answer to 294: *we open the decision card where tabs now line up nicely,
except that filed decisions sit at the bottom of that line still stacked, and
only open when we click on the filed stack. If there are too many, the decision
card gets longer until it can hold them all.*

Which is the tab stack applied one level down — the closed posture, inside a
strip that is otherwise open — and it is worth noticing how much it costs:
nothing. No history tab, no separate surface, no rule about when a filed mark is
allowed to appear. A busy clause shows what is happening at it, with what has
happened at it folded into one object underneath, in the place you are already
looking. The idea that arrived this morning to bound a gutter turns out to
answer a question that had been open since the gutter existed.

**Newest at the top**, which is the one ordering question a pile of records has,
and the closed state settles it: only the top glyph shows, so the top has to be
the last thing that happened here. Opened, it then reads down into the past,
which is how every record anybody keeps is read.

**What is not in the pile**: a decision that is decided but *unread*. It is still
asking for its OK, so it stays with the live tabs. Filed is precisely the state
that wants nothing, which is the same line the palette draws with its greys.

**And the card grows** — a floor on its height, not a height. The strip is
absolutely positioned in the head, so it never pushes the card and would simply
have hung out of the bottom of it. Eight filed decisions expand to 261px against
a card of 382px, and the card goes to 448px.

**The bug the pile revealed.** Clicking a filed tab opened nothing, on all eight.
The document only ever swallowed a clause into its record where the clause had
*nothing live on it* — and that had never been wrong, because until this
afternoon there was no way to reach a filed decision from a clause that had live
ones. The gutter hid every filed mark the moment anything live shared the clause,
which is the whole of what 294 was complaining about. So the missing branch and
the complaint were the same fact seen from two ends, and fixing the one exposed
the other instantly. **A feature that was never reachable was never tested**, and
"it has always worked" means only "nothing has ever asked".

### Two helper texts, removed (Ed, same session)

The `yoursnote` opened every proposal of your own with three sentences of
mechanism: that nothing is asked of you, that standing behind a proposal counts
as preferring it, that you will still be served the rest of the race against it.
Every one is a fact about *all* your proposals, which is why it appeared on all
of them — and **a footnote that appears on every card is a design note, not
information**. The card already says the two things a reader needs: there is no
radio on it, and the one control is a withdrawal.

The ⏳ card's *You kept the current text · You can change this while the race
runs* had been trimmed once already, from a longer sentence about revision, down
to what you said plus the fact it can change. Both halves are drawn elsewhere on
the same card. The radio on the lane you chose reads **Preferred** — that is what
you said. It is still a live radio — that is what *you can change this* means. A
line of prose restating two controls the reader is looking at is the design
explaining itself.

The two locked variants keep theirs, and the contrast is the reason: on a settled
or ground-shifted card the controls are *dead*, so the card cannot say it by
being itself, and a sentence is the only thing left that can. **Prose earns its
place where a control cannot speak.**

### Four QA notes on the strip and the rail (2026-08-17)

**The pile shuts when the stack does.** *Every time I open a tab-stack, the
retired stack should start as piled.* Being piled is a **posture of the closed
stack**, not a setting you have chosen — and a preference you never set is one
you will not remember setting, so it should not follow you around. It survives
exactly one thing: moving between the tabs of a single stack, which is one
continuous piece of looking at a clause and where shutting the pile behind you
would take away the row you just picked out of. Everything else is arriving
somewhere, and arriving starts piled.

Two rules fell out of building it. Opening a filed record **is** opening the
pile, however you got there — from the queue, from the pile, from anywhere — so
that is recorded as state rather than inferred at paint time, which is what lets
you step from a filed record to a live card at the same clause and find the pile
where you left it. And **a pile never closes over the card you are reading**: if
the active card is inside it, it is open and carries no handle, because the only
alternatives are hiding the tab that says where you are or moving it out of the
pile, and Ed had just ruled out moving tabs.

**The strip does not reorder.** *When I click between tabs on a card, they
shouldn't move around.* The card's own tab was prepended, so every switch dealt
the column again and the tab you were aiming at moved out from under the pointer
at the moment of arrival — the worst possible time, because you are still
looking at where it was.

**A tab strip is a fixed set of places you move a highlight around.** That is the
whole of what makes it a strip rather than a list of shortcuts, and the previous
behaviour was quietly denying it.

The reason it had been prepended is the 0px claim: the mark you click in the
gutter must not move when the card opens. That turns out to survive untouched,
because the gutter is a **pile** now and a pile only ever opens its *front* tab —
which is index 0 in the same stack order the strip uses. The constraint that
forced the reordering was retired by the tab-stack that morning without anybody
noticing.

**And the active tab grows 8px out to the left.** With it no longer at the top,
depth and a deeper ground were all that said which one you were reading, and both
are quiet beside a silhouette. Width is the loud one, and leftward is the only
direction available: the column is right-aligned onto the card's edge, so growing
*is* growing left, and the strip keeps its single vertical joint. The 8px goes on
`padding-left` as well as `width`, so with `border-box` the content box is still
34px and the glyph does not move.

### Only four things pin (Ed, same session)

*Queue-card pinning is too aggressive — otherwise there's a load of stuff in the
sidebar and it doesn't feel like it relates to what's in front of you when you
move around.*

Every `needs` entry pinned, which followed from 110 — *never let work walk off
the screen* — and 110 turns out to be right about the wrong population. **A rail
of pinned questions is a to-do list wearing a margin's clothes.** It travels with
you, so wherever you are reading, most of what is beside you is about somewhere
else, and the one claim the `needs-you-queue` makes — *this entry stands beside
its own clause* — is false for nearly every row on screen. The rail was
contradicting its own premise in order to obey a rule about not losing work.

What survives is the set of things that are about **you** rather than about the
document, and each has its own reason: 🔥 is the question the surface is asking
you next, which is what 110 was actually protecting; an unacknowledged decision
is owed to you and leaves the moment you press OK; a proposal of your own carries
an act nobody else can perform; a prioritisation is served rather than found and
would be absurd to have to scroll to. Everything else stands beside its clause
and scrolls with it, which is what a margin index *is*.

Measured: **8 pinned of 44, against 20 before.**

Nothing is lost, and that is the part worth stating, because 110's fear was
real. The document is right there. An ordinary question you scroll past is a
question at a clause you scrolled past, and the whole design of this surface is
the claim that those two are the same thing.

### One comparator, two columns (2026-08-17, closing 309)

I raised 309 with a proposal: a pile in the rail, one entry per clause expanding
on click, mirroring the `tab-stack`. Ed: *rather than have queue-card piles, we
want to prioritise them in the sidebar in the same way that the tabs prioritise.*

He is right, and the reason is worth writing down because it is the cheaper move
by a long way. **The rail already knew how to choose.** Its admission rule has
been *most urgent first, a ranking over admission and never over position* since
110. What it had no answer for was entries at the **same** position — several
decisions at one clause all want one line of the rail — and with no tiebreak it
fell through to fixture order. That had never mattered, because until § Bringing
a Guest carried twelve decisions no tie was ever tight enough to notice.

So the fix is a tiebreak, not an object. Sort same-clause entries by the tab
stack's own keys and the two columns agree: **whichever decision the gutter would
open is the one the rail shows.** No new control, no new gesture, nothing to
learn — and the rail keeps being a rail, where a pile in it would have been a
second kind of entry with its own rules in a column where every rule written so
far assumes an entry is one judgment.

**And building it found the mirror of the bug.** The first version gave the rail
a `y.u - x.u` tiebreak and the two columns disagreed *immediately*: at § Bringing
a Guest the rail promoted the more urgent of two 💡 while the gutter's front tab
was still whichever came first in the fixture — because `stackOrder` had no
tiebreak either. Two orderings meant to express one idea, each incomplete in a
different place.

The fix was not to add a matching tiebreak to the gutter but to **give them one
comparator**: `leverage(g)` pulled out of `layoutQueue`, used by both. A
duplicated formula would have agreed on the day it was written and drifted the
first time either end was touched.

**When two surfaces annotate the same thing, an ordering they do not share is a
disagreement waiting to be noticed.** Both of these had been wrong for as long as
they had existed, and neither was visible until a clause got busy enough to make
the tie bite.

Measured at § Bringing a Guest: the gutter's four-tab pile leads with
`race-guests-notice`, and `race-guests-notice` is the entry the rail shows.
Across all 31 clauses carrying gutter marks, no disagreement.

### The flame says nothing but its own name (2026-08-17)

Ed: *🔥 doesn't need the rationale in its queue-card when it's unselected; the
fact that it's 🔥 is what gets it attention, not the rationale (which is always
one click away anyway).*

The sharp part is what it says about every *other* entry's teaser. A rationale in
the rail is doing one job: **it is what makes you decide whether this is the one
to open.** On 🔥 that decision has already been made for you — that is the entire
content of the mark — so the teaser there is answering a question nobody is
asking, in the one place on the surface where the answer is already given.

Same test as the `yoursnote` and the revise line earlier today, from a different
angle: not *is this true* but *is anybody asking*.

I dropped it in **both** states rather than only the unselected one. Ed scoped it
to unselected because that is where he met it, and the two readings differ only
when the card is open — where the document is showing the same words in full
three inches away, and where keeping the teaser would make the flame the rail's
only element that **grows a paragraph when you select it**. Nothing in the rail
changes size on selection, and this would have been a poor first exception.

One side effect worth keeping. With the words gone the entry is 37px of nearly
solid orange, and the `evidence-meter` — which was a stripe under a paragraph —
now fills the whole card. The most urgent question in the document is also the
clearest progress bar in the rail, which is what you want from the one entry that
is meant to be answered next.

### 🔥 gives up its hue (2026-08-17)

Ed: *We could give 🔥 a yellow background like 💡, what do you think? the icon is
already doing a lot of the work.*

Yes, and the argument is the one the palette has been asked all day: what does
this colour say that nothing else on the card says? A flame means **an ordinary
judgment that wants you most** — the same *kind* of thing as a bulb, with a
priority on it. So orange was claiming a difference in kind to express a
difference in degree, which is the one thing a separate hue must never do. Three
hues and a grey now, and `--lc-urgent` is gone.

**But the first version did not work, and finding out why was the whole job.**

Dropping the hue left the flame as the deepest yellow in the rail, because
`washCol` already sets a wash's alpha from its urgency — same colour, more of
it, which sounded exactly right. Measured: **0.292 against a neighbouring 💡 at
0.280.** Nobody can see that.

And it is not a fixture accident. The flame is usually only *marginally* the most
urgent, because somebody has to be first among a set of close things — that is
what being first in a ranking of similar items means. Any design that leans on
the gap between first and second on this ramp will keep failing for the same
reason.

Which is the actual insight, and it is about what 🔥 *is*. **It does not mean
"the highest number on the urgency ramp". It means "the question you are being
asked next" — and that is a category, not a point on a scale.** A ramp cannot
express a category. So the flame takes a fixed alpha clear of the ramp's ceiling
(0.44 against the ramp's 0.30) and the ramp runs underneath it. Same hue,
decisively more of it, which is what more-urgent should have looked like all
along.

*Hot for actions* applied one level down: the action being asked for **now** is
louder than the ones that can wait.

Two things fall out for free. The queue wire takes its colour from the card's
wash composited over white, so the flame's cable is still the strongest on the
surface — the glossary's claim survives the hue change without a line of code.
And ❄️ still works: chill the flame and the deep yellow travels to whatever takes
it, because the value is attached to `topUrgentId` rather than to a card.

The general shape, worth keeping: **when you remove a device, check what the
remaining ones actually measure — not what they are supposed to express.** The
urgency ramp was supposed to express urgency and does; it just does not have the
resolution to carry a categorical claim, and nothing said so until the hue that
was carrying it went away.

## The housekeeping pass (2026-08-17)

Ed, after a long run of feature work on the queue and the decision cards: *time
to do housekeeping, refactor, and review everything for consistency.*

Everything below was found by **measuring rather than looking** — opening all
thirty-two cards and dumping the computed geometry of every button, band and
label, then diffing the results against each other. Every one of these had been
on the screen for days without being visible, which is the argument for the
method: a surface built one instruction at a time drifts in ways that are
invisible from inside any single instruction.

### The class written to stop eyebrows drifting had no users

`.eyebrow` was added with the comment *one rule, so they cannot drift apart*. It
had **zero consumers**. Every eyebrow on the surface was a hand-rolled copy of
it, and the copies had drifted to three sizes: `.headlab` and `.fieldlab` at
0.65rem, `.rtag` and `.rechead` at 0.7rem, and `.eyebrow` itself at a 0.75rem
that appeared nowhere else on the page. `--t-micro`'s own comment has said
*eyebrow labels only* since the scale was written.

So the rule now names its users in its selector, which is what makes it a rule —
a new eyebrow cannot be added without touching that line — and each of them keeps
colour and layout and nothing else. **A shared rule nothing points at is not a
shared rule, it is a fifth opinion.**

### The type scale had six steps and the stylesheet used thirteen

0.58, 0.62, 0.7, 0.75, 0.78, 0.8, 0.85 and 0.95rem all appeared as literals,
most within half a pixel of a token that already existed. Snapped onto the six
steps. What is left as a literal is now exactly one category and it is worth
stating so it stays that way: **glyph sizes**. `.achip` at 1.125rem, the glyph
buttons at 1.2 and 1.35, the serif italic *I* at 1.05 — these tune a *silhouette*
to a box, not text to a scale, and a glyph's optical size has no business
being on the same ladder as prose.

### The contents rail's hierarchy was upside down

lvl1 12px, lvl2 **13px**, lvl3 12.48px. The outermost level was the smallest text
in the column and a leaf outranked the Part containing it. The document's own
headings had always descended correctly (15.2 / 12.8 / 11.52); only the rail was
inverted, and three off-scale sizes were exactly what hid it — no two of them
were comparable at a glance.

A Part is a **divider**, so it is set as one: upper-case, bold, `--t-cap`, below
the entries rather than above them. The two levels under it are the same size and
are told apart by weight and indent, which is the job indentation was already
doing.

### A commit row is one object, so its controls share a height

They did not. The judgment ✓ and 🗑️ were 40px; the deadlock desk's hold-✏️ was
**30px sitting in the same row as a 40px 🗑️**; the sealed record's OK was 34px;
and the proposed card's *✏️ Submitted* was 34px beside its own 40px 🗑️. Four
independent little rules about particular buttons — and independent rules about
buttons that stand in a row together is precisely how a row stops being one.

Height belongs to the row, so the row sets it. Width still belongs to the
control, so a glyph stays 52px and a labelled button stays as wide as its label.

The same for the lift. It was scoped to the editing card and the deadlock desk
because that is where Ed asked for it — and the reason he gave, *they are actions
for that box*, is just as true of the ✓, the ❄️ and the OK. Worse, the two cards
it missed contain the surface's only **outline** buttons, which are the ones with
no fill to read as a control instead.

And the deadlock desk's propose button now says `glyphbtn` in its class list
instead of restating that class's geometry in a rule of its own — which is how it
came to have the width and not the height.

### Three controls sized by their own contents

**B** was 26×20, *I* 26×**23**, the mode toggle 26×20 — the italic one three
pixels taller than the bold one beside it and sitting two pixels higher, because
each button's height was coming from whatever glyph happened to be inside it.
A fixed box, centred, so an optical adjustment to a glyph can never move the
control around it again. **A button sized by its content is a button whose size
is a coincidence.**

### The commit row is the card's bottom band — on every card now

Three card types printed their one-line type note *after* the row, and a locked
card its lock note, so on half the cards the band that ends the card had
something under it. Both belong above it on their own merits: a type note is
about the field, so it reads as the last thing said about what you are looking
at; and a lock note is the reason the controls below it are dead, which is worth
knowing before you reach for them rather than after.

**And moving them broke the row's hairline**, which is the most useful thing this
pass turned up. The rule was `.field + .race-mid` — an *adjacent sibling*
selector, true for exactly as long as the field was always the band immediately
above. Put anything between them and the commit row silently loses its rule and
its 12px band. It is now `.race-mid.commitrow`. **An adjacent-sibling selector is
a rule about order being used to say something about identity**, and it fails
silently the first time the order changes.

### Dead code

Nine CSS rule-sets whose class no longer appears in anything the page emits —
the bounty board's next-pencil pip, the line-art unit glyphs, the sealed record's
action row and its green winner box, the queue's caption line, the dot rows of
filed decisions, the deadlock card's raised box, the record band. Three functions
with no callers (`insHtml`, `isHeadingKey`, `proposeBtnHtml`) and one local that
went with the `yoursnote`. After it: 198 declarations, none unreferenced.

### Two things found and left for Ed

**The three type notes.** A race card, a patch card and a diagonal each carry one
sentence saying what that kind of card does. They are the same species as the
three footnotes Ed cut earlier the same day — but these are per *type* rather
than per card, and each says something the card cannot say any other way (that
neither race candidate has to win; that one judgment lands in three places; that
a diagonal changes no text). Worth his ruling rather than mine.

**`locked` without `shifted`.** `reviseNote` has a branch for it — *this one is
settled, so your judgment is on the record as it stands* — and no fixture reaches
it, because the only locked card in the fixture is also ground-shifted and
`shifted` is tested first. Either the state is reachable and wants a fixture, or
it is not and the branch should go; I could not convince myself which, since a
settled race becomes a sealed record rather than a locked judgment card.

### The flame keeps its rationale at its own clause (2026-08-17)

Ed, refining this morning's cut: *the 🔥 queue-card ought to get its rationale
when it's on screen in its own right (not because it's pinned) — because then
it's an ordinary 💡.*

That is the better rule, and it exposes what was wrong with mine. I had read
*the flame does not need a teaser* as a fact about **the flame**. It is a fact
about **being pinned**. A pinned entry is on your screen because it followed you
there, not because you are anywhere near what it is about — and a paragraph
arguing a case, attached to a clause six thousand pixels away, is answering a
question nobody asked. Scroll to § Arrears and none of that holds: the entry is
standing in the margin beside its own text, among neighbours that all carry
theirs, and an entry that alone had nothing to say would read as the odd one out
— which is the exact opposite of what dropping the teaser was for.

**The same object is doing two jobs, and the rule belongs to the job rather than
to the object.** Following you, it is a reminder. Beside its clause, it is a
margin index entry like every other one.

So the teaser is always in the markup and `layoutQueue` hides it for the one
case. The measurement that makes it safe: **the test is on the anchor's position,
not the entry's.** An entry displaced to the band edge is the obvious thing to
test, and it is a feedback loop — showing the teaser makes the entry taller,
which can push it off its clause, which would hide the teaser, which shrinks it
back. Testing whether the *clause* is in the band is a fact about the document
and the scroll, so it cannot be changed by what the rail does about it. Walked
across the boundary in 60px steps: one clean transition, no thrash.

The class is set before `offsetHeight` is read, so the layout measures the height
the entry is about to have rather than the one it is leaving.

**A rule that reads what it is about to change is a rule that can chase itself.**

### Running the workflow end to end (2026-08-17)

Ed: *follow the workflow "click on 🔥, make judgement, click on next 🔥, make
judgement, repeat" from a fresh mockup until all active cards are resolved.*

Done as a scripted run of the **real** path — clicking the rail entry from
wherever the page happened to be, so every step included the scroll, the card
swap and the re-render. The automation tab has no `requestAnimationFrame`, which
normally makes `bringIntoView` hang forever; the way through is that
`smoothScrollBy` has a reduced-motion branch that scrolls instantly and calls
its callback synchronously, so **emulating `prefers-reduced-motion` makes the
whole flow testable** without stubbing anything the product owns. Worth
remembering: it is the one lever that turns this surface's animation-gated logic
into something a headless run can walk through.

**Eighteen judgments, no failures, no errors.** What the run actually measured:

- every 🔥 opened on the **first click**, 18 of 18;
- the flame handed over on every submit — never stale, never two;
- **the clause moved 0px on every submit**, all eighteen. That is `keepStill`
  holding through a re-render that rebuilds the rail, the marks, the wash and the
  wire underneath it;
- cards arrived at the reading line: 15 of 18 at y116–117, after scrolls of up to
  **±6,281px** between consecutive flames;
- the ending is correct — the last judgment empties the queue, the salience
  diagonal is **served** (§8.3a), and answering it leaves nothing.

One probe assertion fired and was wrong, which is worth recording because the
thing it caught is a feature: `race-guests-notice` had no ✓ after its judgment,
because judging out the last pair turned it into a **⚔️ deadlock card**. That is
Q297/298 working exactly as specified — you never see ⚔️ until the race has
nothing left to ask *you*. **A test that asserts the shape of the surface will
fail on the states that change shape**, and reading the failure rather than the
assertion is the whole skill.

### And it ends in silence (Q313)

The mechanics are sound and the run is **completely unacknowledged**. You answer
the last question, the diagonal arrives, you answer that, and the screen is a
screen with nothing on it that wants you. Q291 recorded a third state — a panel
saying the priorities are as clear as more answers would make them — and it went
out with the *offer* when the diagonal became *served, not offered*. Right about
the offer; it took the completion state with it by accident, and those are
different things.

Underneath it is a larger one. The topbar's *confidence bar 74%* and *quorum 5 of
14* are **static markup**, never re-rendered — eighteen judgments move neither.
In a mockup that is fidelity rather than a bug, but the shape of the problem is
real: a workflow made entirely of judging is exactly the one that never touches
the only place a session's vital signs live, so the member contributing most is
shown the least evidence that contributing did anything.

The surface already has a place that says *something happened* — the
`room-pulse`. It has no place that says *something changed*.

## Two new surfaces: setting a document up, and opening it (2026-08-17)

Ed: *take a quick pass at an "admin sets up a document and invites a roster"
screen and an "opening ceremony" screen — at least make these screens and put
all the required controls onto them and we can see what we're looking at.* So
these err towards completeness rather than restraint; Q259 has always asked that
he see every option before any are cut.

### The ruling that shaped both

I asked whether the ceremony is compulsory, because the spec disagreed with
itself: §9.0a offered quorum and threshold as convenor-set *or* roster-decided,
while §3.5a said of the disclosure family that **none is decided by the
convenor**. Read strictly that made the ceremony mandatory and the convenor-set
option merely a way of removing two of its questions.

Ed: **fully optional.** A convenor may settle the whole constitution alone,
disclosure included, and the document opens straight into drafting. SPEC amended
to v0.25 at §3.5a, §9.0a and the parameter table — and with it, honestly, the
thing that ruling costs: *anonymous is the strong default* was a **structural**
claim, true because anonymity sits at the top of the privacy lattice and one
person could hold the whole document there. Where the convenor decides, that
guarantee is simply not available. Anonymity is then a default like any other
and a convenor can open a document in which members are named without their
having agreed to it. Written into the spec rather than left implied, because it
is the kind of property that quietly stops being true.

### What Ed said about the ceremony, which was better than any option I offered

I asked what a member should see while stating their minimum — the scale
explained, a bare field, or a suggested default — and he answered none of them:
*they should see who else is on the roster — they're making a judgement about
how much they trust the other people.*

Which reframes the surface. The question is not **what number is right**, it is
**how much of *these* people do I need behind a change before it moves** — and
the answer depends entirely on whether you know them. So the roster stands beside
the questions, fourteen names with yours marked, and the copy says what the
answer is actually about: *fourteen people will hold this charter between them.*

Three things follow that are worth keeping.

**Nothing is preselected**, which is the one option I had recommended against
myself: a suggested value is exactly the anchoring blind collection exists to
prevent, and it would be a strange kind of blind that told everybody the same
number before asking them. **But a range control with no default still has to put
its thumb somewhere**, and a browser paints the track filled to it in the accent
— so an untouched slider reads as a made choice. It is greyed and half-faded
until touched. A control with no default needs to *look* like it has none.

**The privacy-ladder dims the rungs above your answer rather than hiding them**,
because *the most exposure I will accept* only reads as a ladder if you can see
what you are refusing.

**The waiting state shows a count and nothing else** — no names, no values, no
running maximum. Every one of those would let the room read itself before it had
finished answering, which is the whole of what blind collection protects. And the
settled state publishes the distribution **without names**, with a line saying
what the consent rule cost: *eleven of you would have accepted less than the
charter settled on.* That is worth printing rather than hiding, because it is the
sentence that makes the result liveable — and it is also the honest bill.

### The readback

`document-creation` has ten sections of controls, and the thing a convenor
actually wants to check is not any single setting but the **shape** of the
document they are about to make. So a sticky panel says it back in plain English,
in the words the members will meet it in, written from the state rather than from
the controls — which is what stops the summary and the form drifting apart the
way two descriptions of the same thing always do.
