# Changelog

**[docs.vote](https://docs.vote)** is a place for a group to write a document together. Anybody may propose a change; rival wordings of the same passage race each other; the membership votes on them in blind pairs (*which of these two wordings?*, no names attached, no scores shown), and the wording that comes out on top is adopted once enough of the membership has voted. The document's own rules are decided the same way, inside the document.

docs.vote has been live, in alpha, since 2026-08-20. This file runs newest first, back to the project's first commit on 2026-08-13. The mechanism's full rules are in [`SPEC.md`](SPEC.md) (v0.140 today), and what the page shows a member is in [`SURFACE.md`](SURFACE.md).

---

## 2026-09-25: a task list for phones

### New
- **On a phone, your tasks sit in a sheet at the bottom of the screen.** Its edge peeks up with the most urgent task's title and how many more are waiting; tap it, swipe it up or press ≣ to raise it, and it tucks away while you read down the document.

### Changed
- **Proposing and voting arrive once you have activated your membership.** A new member meets 🏛️ first, and 💡 Proposals and ⚖️ Voting follow after, so nobody is asked to vote before they are a full member.
- **The title card is tidier.** Its open tab is white like the others that need nothing from you, the page's edge no longer moves when the card opens, and the card never shows two lines with nothing between them.

## 2026-09-24, night: calmer margins and bigger headings

### Changed
- **The document's headings are larger.** Every level is one step bigger, so even the smallest heading now stands above the text beneath it.
- **Tabs and entries that need nothing from you are white** rather than grey, in the margin, in the list of tasks and on the lines that join them, so the ones with a colour stand out.
- **On a narrower desktop window the tabs keep their space** from the page's edge, as they do on a wide one.

## 2026-09-24, late evening: the demo, tuned

### Changed
- **The 📝 button sits on the right edge of the page** rather than in the window's corner, and the 📝 on it is twice the size.
- **The red that says something needs your attention is lighter.**
- **In the demo document, a proposal needs six members' votes to pass** rather than three, so most proposals are still open when you arrive and your vote can count.

## 2026-09-24, evening: a demo anyone can try

### New
- **[docs.vote/d/demo](https://docs.vote/d/demo), a demonstration document.** It holds the agenda of *PizzaCon 2027*, a fictional three-day conference, with proposals already racing on its sessions. Anyone who opens it can tap **👋 Try It** to join as a member with a made-up name and start voting and proposing at once; a phone keeps its seat when it comes back, and an idle seat ends after half an hour. The document is reset from time to time, and nothing written there is kept.
- **The conference's speakers can take part as AI members** during a live demonstration, proposing and voting in character. They only act while the presenter has started them, and they sit out when stopped.

## 2026-09-24, later afternoon: a proposal that loses to a rival stays in the running

### Changed
- **When one wording wins a clause, the other proposals for that clause carry on** against the new wording, keeping the votes that compared them with the winner. Before, every one of them was handed back to its author with a red ↻, and all their votes were lost. A proposal the members had already preferred the winner to is closed straight away, and its author is told. A proposal that only partly overlapped the winner is still handed back, because nobody has voted on what it would now make.
- **The same holds when the Founder changes the text directly,** and for rival proposals on the document's rules.
- **A clause can now carry more than one record**, one for each time its wording changed.

## 2026-09-24, afternoon: records that show what changed

### New
- **Links in reasons.** A reason can now carry a web address or a `[link](address)`, and **bold** and *italic* words. Links to other sites open in a new tab and say so.

### Changed
- **A record shows what changed, in green.** On a passed change the new words are highlighted green; the wordings that lost keep the yellow they had while racing. On a change that was turned down, the words the proposal would have removed are highlighted green in the text that stayed.
- **One record at a time stays pinned** in your task list while you owe it an OK, instead of three; news about the rules and new powers still pin as before.
- **A proposal the Founder vetoed says so**: its record reads *Refused by the Founder*, and its box *Refused proposal*.
- **Task titles are tidier.** Removed words are shown struck through; a rule set for the first time shows its value; a quorum count reads as the number alone; a rewritten passage fills the line.
- **Dates read the same everywhere**, on the 24-hour clock and in docs.vote's own words, whatever language your browser is set to. Cards show the full date, the task list the short one.
- **Fewer buttons that do nothing.** The closing card and the card saying a member left have no bin, and no buttons at all once you have answered them.

### Fixed
- **Clicking between tabs on a clause no longer makes the card jump** when one of them is a decided change.

## 2026-09-24, night: tasks you can tell apart, and records that read cleanly

### Changed
- **Each task in the list says what it is about.** A rule change reads as the change itself (*⏱️ 10 → 5 minutes*), and a pair of wordings or a decided change reads as the words that differ, instead of a long list of entries all starting *Members…* or the same section name. Dates are shorter and always on the 24-hour clock: *15:25* today, *Sun 15:25* this week, *20 Sep* before that.
- **A record of a rule change reads top to bottom.** When it happened and how it ended come first (*Changed by the Founder*, *Passed* or *Rejected*); then the rule it set, who proposed it and why; then the rule it replaced, in its own box. A record you have already read has no buttons, because there is nothing on it to do.
- **A pile of filed records shows its depth.** Records you have already acknowledged sit in a pile beside their clause; the pile now shows a card edge for each record behind the front one, so a pile of three no longer looks like one.

### Fixed
- **Every record you have not yet acknowledged keeps its tab.** On a clause with several decided changes, only the one you had open showed a tab, and the rest vanished when you clicked another.
- **Stray backslashes are gone from the text.** Text pasted from some editors carries backslashes before full stops and brackets (*5\\. Expiry*); they are no longer shown when reading, and they are left out when you paste. Nothing already written was changed.

## 2026-09-24, later: the wire's border removed

### Changed
- **The line joining a task to its place in the document has no border again.** The previous deploy gave it a darker outline so it would stand out more against the page; it read as a border, and it is gone.

## 2026-09-24: the fix batch after the first real document

Twenty high-priority issues (filed after a review of every user flow and after the first real document), three accessibility defects and a round of Founder feedback, all fixed in one deploy. Most of it makes the page tell you the truth, faster, when something goes wrong.

### New
- **A red *Reconnecting…* bar.** If your device goes offline or docs.vote stops answering, a red bar appears along the top of the page, with the cause where it is known (*Your device is offline.* or *docs.vote is not answering.*). Every button that would send something is held until the connection comes back. The page stays readable and anything you have typed is kept. Until now you only found out when an action failed, and the rule now is to warn before anybody acts.
- **Strangers can read a closed document's history.** Where a closed document is readable by anyone with the link, or by everyone, a visitor who isn't signed in sees what a member sees: every passed change marked ✔ where it landed, the signatures and the amendments. Those records are sealed exactly as a member's are.
- **Begin waits in the open.** While members are still answering a question the Founder handed to them, the Founder sees a waiting Begin task that names each member still to answer, with their face.
- **A document open to anybody can be joined from the page.** Before, it could only be joined by applying.
- **A refused applicant is emailed**, and so is a member the membership votes out. Before, only people the Founder removed got a mail. An applicant's page now says when they have been admitted.
- **Grants say they must be accepted.** A new power arrives in its own colour with a gentle sparkle until you take it, and its button says what it does (*Accept ✏️*). The 🏛️ grant is now titled *Activate Your Membership*.

### Changed
- **The Constitution section is now called *Rules*** everywhere a member reads it.
- **The paper look.** The document sits as a sheet of paper on a desk, with balanced margins, a stronger tint on the task list, and a clear break between the Rules and the Text.
- **Green for passed.** A passed change's ✔ is green and a rejected ✖ is grey. Before, both were purple.
- **📝 has its own corner.** The floating edit button sits bottom-right at one and a half times its old size, and sparkles until you first press it. The 📝 tab beside the text stays where the text begins instead of following you down the page.
- **No bin on a vote card.** Members read the 🗑️ on a vote card as *skip*, but all it did was close the card. To take a vote back, choose differently or pick *Indifferent*. To close the card, click outside it.
- **A Founder's direct change reads *Changed by the Founder:*** in a rule's history, never *Passed:*, which now means only a change the membership voted through.
- **Each mark in the contents rail opens its card**, the way the task list's entry does.
- **The spectator feed is leaner.** Each author's picture now travels once rather than with every entry, which took a convention-sized live feed from 1.38 MB to 289 KB. A closed document's feed now serves its whole history rather than the last 200 entries.
- **A magic link waits for you to press *Continue*.** Mail scanners and link previews can no longer use up your link before you do. A link that was cut short in transit now says so, instead of claiming it was already used.
- **Faster checks for contributors.** A push to `main` is now decided in about ten minutes instead of 43, because the walks run side by side ([#96](https://github.com/edsaperia/draft/pull/96)).
- **We measured how far one server goes.** Tools that seed hundreds of realistic documents found where today's hosting stops coping (at around 200 documents), and a new check warns before start-up time creeps towards the host's limit. The plan to go further is in `design/spec-pass/plan-scaling.md`.

### Fixed
- A vote or withdrawal the server refused used to look as if it had worked, and one stuck request could block every later one. The page now believes the server, and a hung request gives up after 20 seconds ([#37](https://github.com/edsaperia/draft/issues/37)).
- A proposal the server failed to save could still stand in memory, so everybody else kept it while the proposer was told it had failed. Now nothing stands unless it was saved, and any failed save raises the document's red flag ([#79](https://github.com/edsaperia/draft/issues/79)).
- Pressing Enter at the end of a clause you were drafting was dropped, which glued your next sentence onto the one before ([#78](https://github.com/edsaperia/draft/issues/78)).
- A ⏰ question handed to the membership could only ever settle on *Never*, and a number typed into an answer card was lost on the first press ([#75](https://github.com/edsaperia/draft/issues/75)).
- When the Founder changed a rule directly, the membership was told nothing, and the reason the Founder gave was lost ([#80](https://github.com/edsaperia/draft/issues/80), [#34](https://github.com/edsaperia/draft/issues/34)).
- The proposer of a 🏛️ change could vote against their own proposal, which killed it ([#88](https://github.com/edsaperia/draft/issues/88)).
- A member who left or was removed kept supporting the proposal they had left behind. And if every member lapsed at once, every live proposal was thrown away ([#65](https://github.com/edsaperia/draft/issues/65)).
- A link followed after the document closed, or a refused application's link, showed raw JSON. The closing email now signs a member straight in ([#35](https://github.com/edsaperia/draft/issues/35)).
- A creation link sent to a mistyped address could found the document for whoever held that address. It is now refused with a sentence saying the Founder has since changed the address ([#38](https://github.com/edsaperia/draft/issues/38)).
- A rules proposal the membership had rejected stayed on the spectator feed as if it were still live ([#87](https://github.com/edsaperia/draft/issues/87)).
- An applicant who picked an emoji face someone else already used was told that person's name ([#33](https://github.com/edsaperia/draft/issues/33)).
- The 🎩 card (*Is the Founder a Member?*) showed no answer after a reload.
- A closed document showed at most fifty ✔s, so the convention's earlier passed changes were missing from its closed page.
- A poll arriving while you typed a number or a date into an answer card took your cursor and your half-typed value.
- **Accessibility:** after you open a card, vote or press OK, the keyboard stays on the card instead of jumping to the top of the page.
- **Accessibility:** the lines joining a task to its passage were too faint to see in several colours. Each now has a thin darker edge, so every one is clearly visible.

### Security
- The host's own maintenance routes (pause, resume, page upload) now take a separate administrator key. The key that serves test bots opens their outbox and nothing else ([#10](https://github.com/edsaperia/draft/issues/10)).
- A malformed or oversized request to a sign-in link is now counted against the rate limit before it is read ([#89](https://github.com/edsaperia/draft/issues/89)).
- An email address with characters outside plain ASCII is refused where it is typed.

---

## 2026-09-20 to 2026-09-22: the first real document

**Milestone: the first real use.** On 2026-09-20 a Newspeak House convention of twelve members drafted its charter on docs.vote, in free play, supervised by its Founder. The document closed itself at 17:10 as its rules said it would. It produced 93 adoptions and a clear list of what went wrong. Everything the convention found was fixed and live by the evening of 2026-09-22.

### New
- **A quorum can be anything from one member to everybody.** The quorum scale now runs from 1% to 100%. The card says what either end means, and prints the number of members the rule actually requires. Before, a quorum was capped at half the membership, and a 50% quorum was met by 6 of 12, not the majority of 7 a member would expect.
- **An empty ✏️ wallet says when your next proposal arrives.** Every ✏️ goes dark with a countdown beside it, instead of letting you press and be refused.
- **The error log lives in the database**, so a deploy no longer deletes it. The page also reports its own crashes to the same log. Before, the convention's refusals survived only because someone copied the file off the server by hand.

### Changed
- **A proposal closes its card as it goes out**, and the task list says *sent* for a few seconds. Before, the card stayed open and the proposer couldn't tell whether it was live.
- **A proposal stranded by a change underneath it turns red.** It's the one colour on the page that means something needs your attention.
- **✏️ *propose edit* starts from the whole passage** its wording covers, not just its first line.
- A member can now change the proposal rate with one press, and the field shows what you typed.

### Fixed
- A line pasted from Windows carried an invisible character, and after that nobody could propose a change to that line.
- Withdrawing an invitation nobody had opened left a question stuck, so the Founder couldn't Begin.
- A member's card could show a proposal against the line above the one it changed, after the text shifted under it. The convention hit several versions of this bug and all were fixed.
- Dragging a selection across an open card made two overlapping changes, and the server refused the whole proposal.
- A vote that crossed paths with the page's 4-second refresh was shown to the member as an error. A withdrawn invitee's old link answered with an internal error.

---

## 2026-09-19: the spectator feed, and ready for real use

The day before the convention. The page learned to project itself and to fail more gracefully, and the host was rehearsed end to end. This batch went live just after midnight.

### New
- **Milestone: the spectator feed.** Every document has a feed at `/d/<address>/feed`: a dark timeline made for a projector on the wall. It shows proposals as they are made and as they pass, each with the text it replaced and a paragraph either side, and the proposer's reason in a speech bubble. Proposals to change the rules appear there too, in the rule's own words. It is built on a strictly public view of the document, so it can never show a vote, a standing or anything a member's page keeps sealed. The document's visibility setting decides who may read it.
- **A pile under a crowded clause.** When rival wordings are still waiting on one clause, its task-list entry shows the edges of the cards behind it, up to five.
- **Your draft follows its paragraph.** If an adoption elsewhere moves the text you were editing, your draft moves with it. If the words it was about are gone, you are told, on the card your words are in, before anything is sent. Every proposal now carries the wording it replaces, and the server refuses one aimed at the wrong place.
- **Edit mode shows the Markdown source.** Headings, bullets, bold and italic appear as the characters that make them, so there is no longer a second view to switch to.
- A runbook for operators hosting a live session: the morning checks, the projector, what to tell the members.

### Changed
- A single vote against now ends a 🏛️ proposal, whatever it is about. A constitutional change needs everybody, so one *no* is final.
- A change held for the Founder's veto now asks the Founder, and keeps the membership's vote counts.
- The sign-in limits are sized for twenty phones on one venue's Wi-Fi.

### Fixed
- Signing a closed document emptied its record on everybody else's page ([#30](https://github.com/edsaperia/draft/issues/30)).
- After a rival wording carried, an open page could show the wrong clause on your own proposal, and *Re-make* sent nothing ([#66](https://github.com/edsaperia/draft/issues/66)).
- A line reading *undefined* appeared under every text proposal when the Founder kept their veto on the text ([#58](https://github.com/edsaperia/draft/issues/58)).
- An open feed never showed a new constitutional proposal or a Founder's direct change. It now also says when the host is paused and holds a reader's scroll position still ([#68](https://github.com/edsaperia/draft/issues/68)).
- Refused sign-ins and knocks at the door now answer with a page saying what happened, not raw data or *a link was sent* ([#45](https://github.com/edsaperia/draft/issues/45), [#53](https://github.com/edsaperia/draft/issues/53), [#69](https://github.com/edsaperia/draft/issues/69)).

---

## 2026-09-17 to 2026-09-18: a review of the whole tree, and votes that count

An automated review of the whole codebase filed 27 issues (#2 to #28). The Founder ruled on them one at a time, and most were fixed within a day. Alongside that, the rules for when a change passes were tightened around *who actually said yes*.

### New
- **Silence becomes an abstention, with a clock you can see.** If you don't vote on a proposal within the lapse period, you abstain on that proposal alone. The *Indifferent* button shows how long you have left, and the task list shows it too in the last day. The record says how many members ran out of time.
- **A proposal needs a seconder, and counts approvals.** The quorum now counts the members who preferred a change, not merely those who looked at it. A proposal can't pass on its author's say-so alone.
- **A proposal that can never win is closed early.** Once no answer still to come could carry it, it closes, and its author is told straight away.
- **You hear when your proposal fails.** A rule change you proposed that is voted down, or a wording of yours that is rejected, now tells you, even if you never voted.
- A proposal still running when the document closes is filed as *Proposal ran out of time*, and the closing card counts them.

### Changed
- **Only a proposal that passes gets its ✏️ back.** It gets back exactly the one it cost.
- The shortest lapse period is five minutes, and a lapse can be stated in minutes, hours or days.
- A spent or expired magic link is answered with a page, not raw data.
- The picture uploader says out loud why it refused a file. Before, a refused upload simply closed the file dialog.

### Fixed
- Proposal numbers were reused after a restart, overwriting an earlier proposal ([#2](https://github.com/edsaperia/draft/issues/2)).
- A member acting between the document's ending and the next minute's tick stopped the document from ever closing ([#3](https://github.com/edsaperia/draft/issues/3)).
- A proposal rate under one minute could hang the whole host ([#4](https://github.com/edsaperia/draft/issues/4)).
- A write that half-failed could silently lose people's names or queued mail ([#7](https://github.com/edsaperia/draft/issues/7)).
- An invitation priced *members must vote* was never actually put to a vote ([#6](https://github.com/edsaperia/draft/issues/6)).
- Open pages reloaded on a new deploy and threw away drafts that hadn't been proposed ([#12](https://github.com/edsaperia/draft/issues/12)).
- A member with no ✏️ left could freeze a document by proposing a removal ([#26](https://github.com/edsaperia/draft/issues/26)).
- The page drifted from the server in several small ways: a departed member still listed, a boot that never retried, a closed card undoing what you'd typed ([#11](https://github.com/edsaperia/draft/issues/11)).
- One unreadable document aborted the whole backup ([#13](https://github.com/edsaperia/draft/issues/13)). The quorum's rounding was off by one at some sizes ([#24](https://github.com/edsaperia/draft/issues/24)).
- **Accessibility:** the page now declares its language, a vote's two wordings are a proper radio group each named by its own text, and the grey text meets the contrast standard.

### Security
- A command-name check could reach more than it should, letting a member read beyond their own view of a document. Text members wrote could also run as script in other members' task lists. Both were closed ([#5](https://github.com/edsaperia/draft/issues/5)).
- A request's content type is now checked exactly, the mail provider has a deadline, and magic links followed during a maintenance pause are no longer used up ([#9](https://github.com/edsaperia/draft/issues/9), [#20](https://github.com/edsaperia/draft/issues/20)).

---

## 2026-09-15 to 2026-09-16: the current text is a peer, and the page gets a typeface

The biggest change to the mechanism since launch. It was followed by a day on how the page looks and a first measure of how accessible it is.

### Changed
- **The current text is just another wording in the race** (SPEC v0.128). A change is adopted when the ranking puts it above the current text and enough members have voted. A tie leaves the current text standing. The confidence bar a Founder used to set, and its ramp, are gone from the page, along with the `/pairwise` page that explained them. **Why it matters:** the old rule made the status quo a gatekeeper with a number nobody could reason about. Now it competes on the same terms as every proposal, and the quorum is the only brake. A simulated study measured how often a text now flips back and forth, and the approval rule added on 2026-09-17 cut that by about two thirds.
- **The birth is three steps again**: the title, the address, your email. The document-type presets added in August are gone.
- **A power the Founder lays down stays down.** Its tab leaves the pile and there is no road back (SPEC v0.130). **Why it matters:** the Founder starts with every power and can only give them away, so members can trust that what was handed over stays handed over.
- **One question, one tab, one entry.** Every pair of wordings you are asked about, and every rule change in progress, is its own tab and its own task-list entry.
- The 🏛️ grant arrives the moment you become a member, before any question that needs it.
- A member is no longer held back by how far the Founder has got. A question handed to the membership is yours the moment it is handed over.
- A proposal's wording is shown as the clause is shown, with Markdown rendered, not as raw asterisks.

### New
- **Milestone: the first accessibility audit** ([`design/REPORT-a11y.md`](design/REPORT-a11y.md)). The whole surface was read by an automated WCAG sweep and a dozen hand probes, at desktop and phone widths, and it changed nothing. Its findings have been fixed since, in the 2026-09-18 and 2026-09-23 batches.
- **Charis SIL for the document's text**, with the page's controls in the system sans, on one modular type scale.
- **Every glyph is drawn**: the lifecycle marks, wallets, subjects and buttons all use one consistent emoji set (Fluent Flat), in colour, so they look the same on every device.
- 🌂 **Leave**: resigning is a card in your own row, and its body warns that the membership would have to vote to re-admit you.
- What an applicant fills in at the door (name, picture) arrives with them when they're admitted.

### Fixed
- After Begin, a setting the Founder had handed over was sometimes asked again as if it were a new question.
- A new clause between two others was drawn with two tabs, and the phone's task drawer let its entries overlap.

---

## 2026-09-12 to 2026-09-14: phones, deploys you can survive, and a big tidy

### New
- **Milestone: docs.vote on a phone.** The first cut of the phone layout: one column, with the contents and the task list as drawers on either side, and enough to read the document and vote. Proposing on a phone, the two-tap confirm and full tap targets are still to come ([`design/MOBILE.md`](design/MOBILE.md)).
- **Announced maintenance.** A deploy now pauses the host first, and your page shows a maintenance notice instead of losing what you did. A document that can't save raises a red flag instead of failing quietly.
- **Stranded proposals are marked.** If the text changes under your proposal, it wears ↻ and offers to re-make it on the new text or withdraw it. At the close, a stranded proposal goes into the backlog instead of vanishing.
- A departure, a removal or a refused application now owes every member one acknowledgement.

### Changed
- New wording is highlighted yellow in a proposal. Green now means *decided* and nothing else.
- Page-only updates no longer restart the host.
- The code was reorganised in nineteen behaviour-preserving moves: the engine's routing and ranking, the rules' motions and fold, the server's routes and write path, and the page's scripts each got a file of their own. It is a good moment to start reading the code.

### Security
- Sign-in links are now rate-limited per email address as well as per network address.

### Fixed
- A pasted list of invitees now names every address it refused. Two proposals for the same rule change are refused on either route.

---

## 2026-09-08 to 2026-09-11: identity out of the log, bots as members, and speed

### Changed
- **Names and emails no longer live in the permanent record.** Each document's history is a tamper-evident, hash-chained log, and until now it held people's emails, names and pictures in plain text, where they could never be deleted without breaking the chain. Identity now lives in a separate, deletable table the log points at. An erased person reads as *[withdrawn]*, and the rest of the history still checks out.
- **The text is Markdown, rendered.** Bold, italic, headings and bullets display as rich text. **B** and *I* sit at the top of the editing column.
- **Every live proposal can ask for your vote.** Before, a busy document could leave some proposals waiting behind others.
- A lapse is warned a week, a day and an hour before it happens. One-character document addresses are allowed.
- The ⏳ mark now means only *waiting for other people to vote*. A proposal you can still act on stays lit.
- Every task-list entry now scrolls the page to its card, even when the card is off screen.

### New
- **Test bots on docs.vote.** Mail to any address at `bots.docs.vote` is caught by the host and never sent, so a Founder can fill a document with bot members that propose, vote and move, and see a busy document for themselves (`npm run room-bots`).
- A refused action now says why on screen, and goes into an error log.

### Fixed
- **A data-loss bug:** under heavy load the host could skip saving some actions, and the gap only showed up on restart. One bot-heavy document on docs.vote lost its entries after that point. The save bookkeeping is fixed, and a document that fails to load is now counted and reported instead of hidden.
- **Speed:** with 31 members acting at once, a page refresh took up to 10 seconds. After the fixes the same load answers in 27 ms at the 95th percentile, and 240 open pages stay under 60 ms. Measured on the live host, the limit is now about 140 bots acting at once ([`PRODUCTION.md`](PRODUCTION.md) § *Measurements*).

---

## 2026-08-31 to 2026-09-07: one shape for every card, and the quorum means one thing

A stretch of close design review. The Founder read every card on the page, three times over, and the notes were built each time.

### Changed
- **Every choice looks the same.** Each option is a block with its text, and a radio beneath it: *Prefer this* where the choice is put to the membership, *Choose this* where it is yours alone. Nothing is ever preselected.
- **📝 is the door to editing.** You read by default and press 📝 to edit, instead of every click putting a cursor in the text.
- **The quorum is the floor and only that** (SPEC v0.99). *Signing out* and *freezing* a document are gone. Quorum is the minimum support a change needs, and presence no longer freezes anything.
- **Your votes on one clause form a deck.** You can be asked about several pairs on the same clause, and the ⏳ card keeps your own record of how you voted, which you can revise.
- The proposal rate is one number: how often a new ✏️ arrives. You start with three and can hold at most three.
- The rules read as the document's own sentences, in the third person, the same for every reader.
- Every string a member can read now lives in one file and is checked against a style guide at every push.
- The host no longer enforces a pause between adoptions unless it is configured to.

### New
- [dev.docs.vote](https://dev.docs.vote): a throwaway second instance with a control that walks a document through its whole life, for trying things out. Never put anything real there.
- An applicant has a live page of their own.

---

## 2026-08-27 to 2026-08-30: the Founder's powers, and the text as a card

### New
- **Signed or anonymous, your choice.** Where the rules allow it, a proposer chooses at the moment of proposing whether their name goes on the proposal. The record shows the choice as it was made.
- **The Founder's pen and veto on the text.** A Founder who kept ✒️ can amend the text directly, and members get a news card beside the changed clause. A Founder who kept 🛡️ can hold an adopted change for their assent.
- **Begin lays powers down in one table.** At 🍾 the Founder sees every setting with ✒️ and 🛡️ switches and chooses what to keep. Anything not kept is laid down. Powers laid down together arrive as one news card with one OK.
- **The text is the open card.** 📝 opens edit mode, a new clause can go between any two, and a proposal can touch several places at once.
- **You hear when mail fails.** If an invitation couldn't be delivered, the Founder is told on the page and can resend it.
- A member Founder can resign like anybody else after the start.
- A seat-by-seat test harness checks what every kind of member is shown at every stage of a document's life.

### Changed
- **The surface says *vote***, never *judgment*, and *the membership*, never *the room*.
- The 🤖 *AI Proposals* setting left the page.
- An author is never asked to vote on their own proposal against the current text.
- Every hold-to-confirm button takes one second.

---

## 2026-08-22 to 2026-08-26: the membership's doors, and the rules as tables

### New
- **Admissions and applications.** 🪪 *Admissions* sets one price for every way in: all members must agree, members vote, or any member may invite. 🤝 *Applications* decides whether strangers may ask to join at all. ✉️ invites, ❌ proposes a removal, and 🥾 prices removal on the same scale. The open-join link admits the visitor straight away.
- **A reason with every change.** When the Founder changes a setting they write a reason, and everybody else is told what changed and why. A Founder's direct change is filed as an amendment.
- **Faces in the topbar**: a row of avatars of everybody who has arrived, instead of *n in the room*.
- **Emoji faces from Unicode's own list**, with skin tones, one face per member.
- Begin says what it is waiting for, and offers the fix.
- A phone plan was written ([`design/MOBILE.md`](design/MOBILE.md)).
- A beta criterion was written down: every combination of role, stage and setting has to be visited by an automated seat or a scripted tester, and two supervised sessions in a row have to pass with no control doing the wrong thing.

### Changed
- **The spec became tables.** The rules were rewritten as numbered rules and tables, each pointing at its reasoning, with an automated check that holds the code to them. [`SURFACE.md`](SURFACE.md) was born to state what the page tells a member and what each control does.

### Fixed
- **A hold is released by letting go, and by nothing else.** A background refresh could interrupt a hold-to-confirm and lose the action, or fire it twice. Nothing on the page now rebuilds under a press.
- A reserved or test email address is refused before any mail is sent.

---

## 2026-08-20 to 2026-08-21: docs.vote goes live

### New
- **Milestone: docs.vote is live** (2026-08-20). A document is created by naming it and verifying an email address. Invitations come from `mail.docs.vote`. Every page carries a banner: *docs.vote is in alpha*.
- **Milestone: Postgres.** The same night, at 23:30, the live service moved from files on disk to Postgres. It was drilled with a full backup and restore, and every hash was checked.
- **Milestone: one page** (2026-08-21). Birth, founding and the live document are one page. The separate setup screens are gone, and text proposals race through the real engine end to end.
- **🍾 Begin.** The Founder's explicit act of starting the document.
- **🥂 The close and the signed record.** The clock closes the document; nobody presses anything. Each member then gets a closing card, and pressing OK on it signs the document, with an optional closing comment. **Why it matters:** the output isn't just the agreed text. It is a record, signed by the people who made it, of what was contested, by how much, and what is left in the backlog.
- **Wallets.** Every power is something you hold and can see in the topbar: ✏️ proposals, 🏛️ your constitutional voice, and the Founder's ✒️ and 🛡️. None arrives without your acknowledgement.
- **Nothing arrives already decided.** Every setting starts with the Founder, unanswered, and handing a question to the membership is what opens it to a blind vote.
- **The stranger's door.** There is no login screen. A visitor sees the document as its visibility setting allows, with one card offering a way in.
- CI deploys on green and verifies the live host afterwards; a health check, backups and a restore drill.

### Security
- Nine defects found in a pre-launch review were fixed before go-live. They covered session cookies and HTTPS, rate limiting behind the proxy, escaping of stored text, input limits, cross-site request protection, what applicants could read, and security headers. A second review the same night fixed fourteen of sixteen findings.
- Staging caught a rate limiter that never limited, and it was fixed the same day.
- A Founder's name could run as script for any visitor at a document's door. It was fixed on 2026-08-21 and pinned by a test.

---

## 2026-08-13 to 2026-08-19: before docs.vote (the spec, the engine, the simulations, the mockups)

There was no public service yet. This week produced the ideas and the machinery the product runs on.

- **The spec** (v0.5 to v0.58). The core idea is that rival wordings of the same passage race each other, and the membership ranks them by **blind pairwise votes**: *which of these two?*, with no names and no running scores. The result is fitted to a ranking model (Bradley–Terry with ties). **Why it matters:** comparing two wordings is easy for a person, hard to game, and needs no one to design a ballot. Blindness keeps anyone from voting with the crowd.
- **Two kinds of decision.** Ordinary settings change the way text does, by a vote. A *constitutional* change, one that would make past decisions mean something different, needs everybody (🏛️).
- **The blind founding.** Before drafting starts, each member privately states the least they will accept on each rule, and the document takes the highest of those minimums. **Why it matters:** it is a consent rule, not a vote, which lets a group set up its own rules without first needing rules to set them up with.
- **The Founder's powers:** the Founder starts with the power to change any setting alone and to veto, and can only lay these powers down.
- **The engine** (`engine-core`): a pure, dependency-free TypeScript library for diffs, racing proposals, the ranking, the proposal rate and a hash-chained event log.
- **The simulator** (`sim-harness`): scripted and AI-played members speak the same interface a human does, with a welfare score and a calibration sweep. Its findings set several of the spec's defaults. It also includes a live commentator for simulated runs.
- **The rules package** (`@draft/constitution`): the settings catalogue, the blind founding, motions on both routes, applications and lapse, with its own log.
- **The mockups:** the vote card went through six versions in a day, and then the session view made the document itself the surface. Then came the session view, the founding and the composer, all set in one fictional charter (the Hollow Oak Club).
- **The server:** a thin host with magic-link sign-in and the engine riding every save.
- MIT licence (2026-08-14).
