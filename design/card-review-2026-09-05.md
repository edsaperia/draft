# Card review, round 3 — Ed, 2026-09-05

Ed's notes on the Card Specimen Sheet (https://claude.ai/code/artifact/bdd96cfd-768a-4354-adf1-619cf827ccb5), captured from the tree at 84eb3d1, pulled verbatim from the sheet's own store (collection `notes/round-2026-09-05/cards`) and **not yet read or sorted by a session**. Keys are the sheet's `walk·key`; the number is the specimen's position on the sheet. The handover for how comments are taken is `design/card-review-2026-09-02.md`. A pass file: delete once folded.

44 cards carry a note.

## 01 · 🪶 Title (`founding·title`)

Remove top hairline

## 02 · 📍 Link (`founding·slug`)

Remove title and top hairline
Button shouldn't have a green background!

## 03 · 🧭 What Type of Document Is This? (`founding·shape`)

Remove "What Type of Document Is This? A shape sets the rules the way a document of that kind usually runs. You can change any of them afterwards."
"A meeting" => "This document is for a meeting"
"A conference" => "This document is for a conference"
"Ongoing" => "This document is perpetual"
"Custom" => "The Founder will decide every setting by hand"

With the helper copy on each of the presets, can you instead write all the preset clauses as they would appear in the constitution? Only the ones that are preset by the choice, not the ones that must still be chosen.

## 06 · 🖼️ Your Picture (`founding·mypic`)

It shouldn't say "Anonymous" but instead show the Anonymous avatar

## 07 · ✒️ Founder Actions (`founding·grant-pen`)

"You can give up these powers if you choose to." => "You can give up these powers later if you choose to.

## 08 · 🛡️ Founder Veto (`founding·grant-shield`)

"You can later give up this power if you choose to." => "You can give up this power later if you choose to."

## 09 · 🌍 Visibility (`founding·chamber`)

"The membership are deciding if the document can be seen by anyone with the link." => "The membership will decide if the document can be seen only be members or by anyone with the link."

## 10 · 🪪 Admissions (`founding·admission`)

"Members may propose to invite people to join the membership, and all members must agree 🏛️." => "Any member may propose to invite someone to join the membership, but all members must agree 🏛️."
"Members may propose to invite people to join the membership, and the membership decides ✏️." => "Any member may propose to invite someone to join the membership, and the membership decides ✏️."
"Members may invite people to join the membership at will ✒️." => "Any members may invite someone to join the membership at will ✒️."

## 11 · 🤝 Applications (`founding·applications`)

"The membership are deciding whether anyone with the link may apply to become a member." => "The membership are deciding whether new members may only join by invitation or whether anyone with the link may apply."

## 16 · ✉️ Invite a Member (`founding·invite`)

Submit button should not be green.

## 19 · 🌡️ Proposal Pass Threshold (`founding·bar`)

"docs.vote uses the Bradley–Terry–Davidson voting method to decide whether a proposal ✏️ passes. It uses probability to compensate for when only a small fraction of the membership vote — read more." is important and shouldn't be in tiny text, but also shouldn't be in clause text. Maybe use a blue highlight box that we use elsewhere.

## 23 · 🍾 Begin (`founding·begin`)

Button should not be green.
The text/membership/everything else power selection is a bad design. Switches was better, but maybe there is something better still. Would you like to propose something? We have 3 x 2 binary choices to make, ideally it should stay with the existing card design language as much as possible but clarity and compactness are important.

## 24 · 🌍 Visibility (`delegated·chamber`)

No green on the button.
"The membership are deciding if the document can be seen by anyone with the link." => "The membership will decide if the document can only be seen by members or by anyone with the link."

## 29 · 🪶 Title (`settled·title`)

The new title option should start out unfilled and in a composer box that has an outline. Text the same size as the status quo.

## 30 · 📍 Link (`settled·slug`)

Alternative option should start out blank
Remove "docs.vote/d/the-hollow-oak-club-house-charter is taken, so this one is docs.vote/d/the-hollow-oak-club-house-charter-3b3f."
No green on button.

## 31 · 🌍 Visibility (`settled·chamber`)

"Members only" => "The document can only be seen by members."
No green on button.

## 32 · Passed: Anyone with the link (`settled·rec:chamber:0`)

Remove the top "Anyone with the link" and top two hairlines.
"members only" => "The document can only be seen by members."
"anyone with the link" => "The document can be seen by anyone with the link."

## 35 · 🪪 Admissions (`settled·admission`)

Vertical spacing is inconsistent.

## 36 · 🤝 Applications (`settled·applications`)

Remove "One motion proposes one rule; what you do not touch stands."

## 37 · 💤 Do Memberships Lapse? (`settled·lapse`)

The "A membership lapses" option should have a radio button.

## 39 · 🎩 Is the Founder a Member? (`settled·hat`)

It should just be the "Choose this" option button that's greyed out, not everything on the card.
Remove "Settled. Now that people are voting, the Founder joins the same way as anybody else."

## 41 · 🖼️ Your Picture (`settled·mypic`)

"Anonymous" should be the avatar, not the word.

## 42 · 📧 Your Email (`settled·myemail`)

Email composer is the second option, so there should be a "Choose this" radio

## 43 · ✉️ Invite a Member (`settled·invite`)

No green on button

## 44 · ❌ Remove a Member (`settled·remove`)

Can you make the dropdown taller; its text should be clause-text sized.

## 45 · 🍾 Begin (`settled·begin`)

This should have an "OK" button.

## 46 · 💡 Proposals (`settled·canpropose`)

Remove "The Founder began the document, granting every member the right to propose changes to it. A proposal is a change you write to the document, for the membership to vote on. Open — members can propose as soon as they arrive. You hold 5 ✏️s to propose with."

## 47 · ⚖️ Voting (`settled·canjudge`)

Remove "The Founder began the document, granting every member the right to vote on what is proposed. A vote is your say on a proposal: you are shown two at a time and choose the one you prefer, or neither. Open — the constitution is settled."

## 49 · ⏱️ Proposal Rate (`settled·rate`)

No green on button
"Members may make a new proposal ✏️ every 3 hours." should have "Chosen by [whoever it was chosen by]"

## 50 · Rejected: 6 each, up to 8, one every 180 minutes (`settled·rec:rate:0`)

"a new proposal every 90 minutes" should be the full constitutional sentence

## 51 · ⏰ When Does It End? (`settled·ending`)

"The drafting process will end on" should have a radio button "Prefer this"

## 52 · ✒️ Can the Founder Make Amendments at Will? (`settled·pw:u:ending`)

remove "Given up — one way. The road back is the members’ reserve motion." and the hairline above it
This should have an "OK"

## 53 · 🛡️ Does the Founder Have a Veto? (`settled·pw:a:ending`)

remove "Given up — one way. The road back is the members’ reserve motion." and the hairline above it
This should have an "OK"

## 54 · 🌡️ Proposal Pass Threshold (`settled·bar`)

"A proposal passes when the members are" should have a radio button "Prefer this", since it is an option
"docs.vote uses the Bradley–Terry–Davidson voting method to decide whether a proposal ✏️ passes. It uses probability to compensate for when only a small fraction of the membership vote — read more." should be in a blue box

## 56 · Passed: 82% sure at the end (`settled·rec:bar:0`)

Remove "82% sure at the end" and double hairline
The chosen "82%" should be a full sentence.

## 57 · 👥 Quorum (`settled·quorum`)

"Quorum is []% of the membership." should have a radio button "Prefer this"

## 58 · 👤 Anonymous Proposals (`settled·authorship`)

This doesn't seem to conform to the pattern set by other cards at all, in several ways. We should talk about it.

## 60 · What the Founder Has Laid Down (`seat:1·rel:rel-1`)

When is someone shown this card?

## 61 · 🪶 Title (`seat:1·title`)

Remove "If it passes it goes to the Founder, who may assent or refuse."

## 62 · 🌡️ Proposal Pass Threshold (`seat:1·bar`)

The second option should have a "Prefer this" radio

## 63 · ✉️ Invite a Member (`seat:1·invite`)

Remove "Anyone may be proposed as a new member, and every member has to agree — one refusal keeps them out."
Remove "An invitation is constitutional, because the membership is what quorum is a fraction of: all members must agree, and one who says no keeps them out."
We have replaced the single invite box with the multi-invite. There shouldn't be an invite button; the submit button actions the invite.

## 64 · 🪶 Title (`seat:stranger·title`)

This seems wrong. When is this card shown?

## 65 · 📍 Link (`seat:stranger·slug`)

This seems wrong. When is this card shown?

## 66 · 📧 Log In (`seat:stranger·strlogin`)

Remove the title, hairline, "Members log in by email: enter the address the membership knows you by, and follow the link it sends. Nothing here says whether an address is a member’s.", "your email",
Send the link should be a submit button in the bottom right.

