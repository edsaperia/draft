/* fixture-session.js — the Hollow Oak session: the charter (DOC) and its
 * forty-two items (SUGGS), plus the fixture's parameters. Loaded by the
 * merged page only as ?fixture=session (stage 8, 2026-08-21); the served
 * page never carries it. Moved verbatim from session-view.html's inline
 * script. Hand-authored: content, progress and state ride each item — never
 * parallel literals kept in sync by hand. */
window.FIXTURE_SESSION = (function () {
  // The charter: parts (level 1), chapters (level 2), sections (level 3).
  // A heading owns everything until the next heading of the same level or above.
  const DOC = [
    { t: 'title', x: 'The Hollow Oak Club — House Charter' },
    { t: 'p', x: 'The Hollow Oak Club exists so that its members may have a place of their own: to meet, make, cook, argue, garden, and put the world to rights.' },
    { t: 'p', x: 'What follows is the whole of the Club’s law. Where it is silent, the membership decides; where it speaks, it binds until it is changed by the process set out at the end.' },

    { t: 'h', level: 1, x: 'Part I — The Club' },
    { t: 'h', level: 2, x: 'Founding' },
    { t: 'h', level: 3, x: 'Purpose' },
    { t: 'p', x: 'The Club is a society of friends keeping a house together. It is not a business, not a charity, and not a landlord; it exists for the common enjoyment of its members and for nothing else.' },
    { t: 'p', x: 'No part of the Club’s money or property may be applied to the private benefit of any member, except by way of the ordinary hospitality of the house and the reimbursement of expenses properly incurred on its behalf.' },
    { t: 'p', x: 'The Club may do anything reasonably incidental to keeping the house well: buy tools, insure its possessions, engage a plumber, print a rota, and lay in more coffee than any reasonable household requires.' },
    { t: 'h', level: 3, x: 'Name and Seat' },
    { t: 'p', x: 'The Club is called The Hollow Oak Club, after the tree that stood in the garden until the storm of the second winter, and which the Workshop has been slowly turning into furniture ever since.' },
    { t: 'p', x: 'Its seat is the clubhouse at 44 Aldermoss Lane. The Club has no other premises and does not meet elsewhere except by a decision recorded in the Members’ Book.' },
    { t: 'h', level: 2, x: 'The Trust’s Reservation' },
    { t: 'h', level: 3, x: 'What the Trust Keeps' },
    { t: 'p', x: 'The clubhouse is held on a long lease from the Marchmont Trust, which reserves to itself the fabric of the building, the lease itself, insurance, and compliance with the law.' },
    { t: 'p', x: 'Everything else about the life of the house is the Club’s to govern, and the Trust has undertaken in writing not to concern itself with it.' },
    { t: 'p', x: 'The Trust appoints one visitor, who may attend any meeting of the Club, may speak, and may not vote. The visitor has attended twice in nine years and on both occasions stayed for dinner.' },
    { t: 'h', level: 3, x: 'What Reverts' },
    { t: 'p', x: 'Should the Club cease to operate any part of house life, its management reverts to the Trust, which will run it plainly on the Club’s behalf.' },
    { t: 'p', x: 'Reversion is not a sanction, and any function may be reclaimed by a valid decision of the membership at any time.' },

    { t: 'h', level: 1, x: 'Part II — The House' },
    { t: 'h', level: 2, x: 'The Ground Floor' },
    { t: 'h', level: 3, x: 'The Common Room' },
    { t: 'p', x: 'The Common Room is the heart of the house and is open to every member at every hour. Nobody may reserve it, and no gathering in it may be closed to a member who wishes to sit down.' },
    { t: 'p', key: 'armchair', x: 'Furniture in the Common Room may be moved but must be put back. The armchair by the window is not anybody’s, whatever Hollis says.' },
    { t: 'p', x: 'A member may hold a private conversation in the Common Room and expect not to be joined, if they say so plainly. Nobody is obliged to leave, and nobody is obliged to notice.' },
    { t: 'h', level: 3, x: 'The Kitchen' },
    { t: 'p', key: 'kitchen', x: 'The Kitchen is common to all members and is governed by one rule: you leave it as you would wish to find it at seven in the morning.' },
    { t: 'p', key: 'larderfood', x: 'Food in the larder marked with a name belongs to that member. Food not marked belongs to the house and may be eaten by anyone.' },
    { t: 'p', key: 'knives', x: 'The good knives are sharpened by the Steward and are not to be used on bone, frozen food, or the garden.' },
    { t: 'h', level: 3, x: 'The Larder' },
    { t: 'p', x: 'The house keeps a standing larder of the things nobody wants to discover are missing: flour, salt, tinned tomatoes, tea, coffee, and a bottle of something for emergencies.' },
    { t: 'p', x: 'Any member who takes the last of a standing item writes it on the board. This is the whole of the system and it works about half the time.' },
    { t: 'h', level: 2, x: 'The Upper Floors' },
    { t: 'h', level: 3, x: 'The Guest Bedroom' },
    { t: 'p', x: 'The Guest Bedroom goes to whoever claims it first, and guests leave it as they found it.' },
    { t: 'p', key: 'claims', x: 'A claim is made by writing in the book on the landing. A claim more than a month ahead may be displaced by a member with a nearer need, who tells the displaced member within a day and offers them the next free week.' },
    { t: 'p', x: 'No guest may occupy the room for more than a fortnight in any quarter without a decision of the house.' },
    { t: 'h', level: 3, x: 'The Library Corner' },
    { t: 'p', x: 'The Library Corner holds the Club’s books, which may be borrowed by any member for as long as they are being read and no longer.' },
    { t: 'p', key: 'books', x: 'Books belonging to a member and left in the Corner become the house’s after a year, unless the member says otherwise in the book on the shelf.' },
    { t: 'h', level: 2, x: 'The Outbuildings' },
    { t: 'h', level: 3, x: 'The Workshop' },
    { t: 'p', x: 'The Workshop is available to any member who has been shown its dangers by the Steward or by a member the Steward has named.' },
    { t: 'p', key: 'powertools', x: 'Power tools are not used when the member is alone in the house, and not after the beginning of quiet hours.' },
    { t: 'p', x: 'Work left on the bench for more than a fortnight may be moved to the shelf; work left on the shelf for a season may be moved to the shed, with a note.' },
    { t: 'h', level: 3, x: 'The Garden' },
    { t: 'p', key: 'garden', x: 'The Garden is kept up by a rota posted in the shed, with a Garden Steward to keep it organised and call heroic weekends when it gets ahead of us.' },
    { t: 'p', x: 'The beds nearest the wall are given over to whatever a member wishes to grow, one bed to a member, allotted each spring by the Garden Steward.' },
    { t: 'p', x: 'Produce belongs to the member who grew it, but a good crop has always been shared and the Club would think less of anyone who stopped.' },
    // The one heading the fixture argues about (Q897). A heading is an
    // addressable block like any other, so it carries an explicit key and
    // `quick-shedhead` below points at it — which is what makes the charter
    // walk able to open a heading's card and notice when it opens nothing.
    { t: 'h', level: 3, key: 'shedhead', x: 'The Shed, the Cellar and the Space Under the Stairs' },
    { t: 'p', x: 'The shed holds garden tools and the rota. The cellar holds everything the house cannot bear to throw away and does not wish to look at.' },
    { t: 'p', key: 'cellar', x: 'Once a year, before the spring meeting, the Steward opens the cellar and the house decides together what may go.' },

    { t: 'h', level: 1, x: 'Part III — Membership' },
    { t: 'h', level: 2, x: 'Admission' },
    { t: 'h', level: 3, x: 'Nomination, Seconding and the Standing of a Candidate' },
    // The clause does not yet carry the household bar — that is what the race
    // below it was about, and what did not clear the threshold. Written this way
    // round because a fixture proposal identical to its own incumbent is not a
    // proposal: the dedup-gate would never have let it race.
    { t: 'p', key: 'nomination', x: 'A candidate for membership is nominated by one member and seconded by another.' },
    { t: 'p', x: 'The nomination is posted in the Common Room for one month before it is considered, so that every member has the chance to meet the candidate over a dinner.' },
    { t: 'p', key: 'twiceyear', x: 'No candidate may be nominated twice in one year.' },
    { t: 'h', level: 3, x: 'Objection' },
    { t: 'p', x: 'Any member may object to a nomination, in writing to the Steward, at any time before the decision.' },
    { t: 'p', x: 'An objection is put to the meeting without the objector’s name unless they choose to give it, and the candidate is told that an objection exists but not what it says.' },
    { t: 'p', x: 'Two objections defeat a nomination without a vote. One objection is decided by the meeting in the ordinary way.' },
    { t: 'h', level: 3, x: 'Probation' },
    { t: 'p', key: 'probation', x: 'A new member is on probation for six months, during which they hold every right of membership except the right to vote on admissions.' },
    { t: 'p', x: 'At the end of probation the Steward asks the meeting whether anything stands in the way, and if nothing does, the member is confirmed without a vote.' },
    { t: 'h', level: 2, x: 'Standing' },
    { t: 'h', level: 3, x: 'Rights of a Member' },
    { t: 'p', x: 'Every member may enter the house at any hour, use every room, bring a guest, stand for office, vote at meetings, and inspect the accounts.' },
    { t: 'p', x: 'Every member may put any matter on the agenda of any meeting, and may require that it be minuted whether or not it is decided.' },
    { t: 'p', x: 'No right in this section may be suspended except under Part VIII, and never for longer than a season.' },
    { t: 'h', level: 3, x: 'The Duties of a Member Towards the House and Towards Each Other' },
    { t: 'p', x: 'Every member pays their subscription, takes their turn on the rotas, locks up when they are last out, and tells the Steward when something is broken.' },
    { t: 'p', key: 'attendance', x: 'Every member is expected at three of the four quarterly meetings; a member who attends none in a year is asked, kindly, whether they still want to be a member.' },
    { t: 'p', x: 'No duty in this section is enforced by any penalty other than the good opinion of the house, which has always been sufficient.' },
    { t: 'h', level: 3, x: 'Lapsing and Return' },
    { t: 'p', x: 'A member who gives notice of a long absence keeps their membership, pays a reduced subscription set by the meeting, and gives up their key until they return.' },
    { t: 'p', x: 'A member who returns within three years resumes their old standing. After three years they are nominated afresh, though the house has never yet objected to one of its own.' },
    { t: 'h', level: 2, x: 'Departure' },
    { t: 'h', level: 3, x: 'Resignation' },
    { t: 'p', x: 'A member may resign at any time by telling the Steward, and owes nothing further beyond the quarter then running.' },
    { t: 'p', x: 'A resigning member’s key returns to the Steward, and their bed in the garden passes to whoever the Garden Steward allots it to next spring.' },
    { t: 'h', level: 3, x: 'Removal' },
    { t: 'p', x: 'A member may be removed only by a reserved decision, only for conduct that makes the house unliveable for others, and only after the process in Part VIII has run its course.' },
    { t: 'p', x: 'A removed member may not be nominated again for three years, and may not be removed a second time without the matter being heard afresh.' },
    { t: 'p', x: 'Removal is the gravest thing the Club can do and has happened once, which the house does not discuss.' },

    { t: 'h', level: 1, x: 'Part IV — Money' },
    { t: 'h', level: 2, x: 'Subscriptions' },
    { t: 'h', level: 3, x: 'Rates' },
    { t: 'p', x: 'Every member contributes equally into the common purse, on a fixed schedule the membership sets and may revise at any meeting, payable promptly when due.' },
    { t: 'p', key: 'subs', x: 'The subscription is set once a year at the spring meeting, and may not be raised by more than a quarter in any year without a reserved decision.' },
    { t: 'h', level: 3, x: 'Hardship' },
    { t: 'p', key: 'hardship', x: 'A member in difficulty may ask the Purse-holder to reduce or suspend their subscription, and the Purse-holder may do so for up to two quarters without telling anyone why.' },
    { t: 'p', x: 'Beyond two quarters the matter goes to the meeting, which considers it without naming the member if the member prefers.' },
    { t: 'p', x: 'No member has ever been asked to leave for want of money and the Club would rather sell the good knives.' },
    { t: 'h', level: 3, x: 'Arrears' },
    { t: 'p', key: 'arrears', x: 'A member more than two quarters in arrears, who has not asked for hardship, is reminded once by the Purse-holder and once by the Steward, in that order and not more.' },
    { t: 'p', x: 'Arrears are never announced at a meeting or written in the Members’ Book.' },
    { t: 'h', level: 2, x: 'The Purse' },
    { t: 'h', level: 3, x: 'The Purse-holder' },
    { t: 'p', key: 'purse', x: 'The Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.' },
    { t: 'p', x: 'The Purse-holder may hold the Club’s money in an account in their own name, there being no other kind of account available to a society of fourteen friends.' },
    { t: 'p', x: 'The Purse-holder may not also be the Steward, and may not hold the office for more than three years running.' },
    { t: 'h', level: 3, x: 'Spending' },
    { t: 'p', key: 'spending', x: 'Ordinary spending on the running of the house needs nobody’s permission. Anything above a quarter’s subscriptions needs the meeting’s.' },
    { t: 'p', x: 'A member who spends their own money on the house may claim it back within the quarter, and after that only with the meeting’s indulgence, which is always given.' },
    { t: 'h', level: 3, x: 'Accounts and Inspection' },
    { t: 'p', key: 'accounts', x: 'The Purse-holder keeps the accounts in whatever way suits them, and shows them to any member who asks.' },
    { t: 'p', x: 'The accounts are read out at the spring meeting, in summary, and the tin is passed round so that anyone who wishes may look in it.' },
    { t: 'p', x: 'Two members who are not the Purse-holder check the accounts once a year. They have never found anything and are not looking very hard.' },
    { t: 'h', level: 2, x: 'Larger Sums' },
    { t: 'h', level: 3, x: 'Capital Works' },
    { t: 'p', x: 'Work on the fabric of the house is the Trust’s, but work on what the house contains is the Club’s, and is decided by the meeting on a plan and a price.' },
    { t: 'p', x: 'No capital work may begin until the money for it is in the purse.' },
    { t: 'h', level: 3, x: 'Borrowing' },
    { t: 'p', x: 'The Club does not borrow. A member may lend it money interest-free, and is repaid before any other call on the purse.' },
    { t: 'p', x: 'A loan from a member is written in the Members’ Book on the day it is made, with the date it falls due.' },

    { t: 'h', level: 1, x: 'Part V — The Common Life' },
    { t: 'h', level: 2, x: 'The Table' },
    { t: 'h', level: 3, x: 'The Thursday Dinner' },
    { t: 'p', x: 'Dinner happens every Thursday; the Steward posts a proper rota in the Kitchen each term, and anyone who can’t make their night arranges a swap and tells the Steward in good time.' },
    { t: 'p', x: 'The cook chooses the food, and no member may complain about a meal they did not offer to cook.' },
    { t: 'p', x: 'The Thursday Dinner has not been missed in nine years, including the week of the storm, when it was eaten cold in the Common Room by candlelight.' },
    { t: 'h', level: 3, x: 'Cooking and Clearing' },
    { t: 'p', x: 'Whoever cooks does not clear. Whoever clears does not have to have eaten.' },
    { t: 'p', x: 'The house buys the food for the Thursday Dinner from the purse; a cook who wants to spend more than the usual may, out of their own pocket, and may not be reimbursed for showing off.' },
    { t: 'h', level: 2, x: 'Guests' },
    { t: 'h', level: 3, x: 'Bringing a Guest' },
    { t: 'p', key: 'guests', x: 'Friends of the house are welcome whenever a member is in.' },
    { t: 'p', x: 'A member is responsible for their guest: for what the guest breaks, for what the guest is told about the other members, and for the guest’s knowing when to go home.' },
    { t: 'p', x: 'A guest who has been brought a dozen times is generally nominated, and the house has learned to be glad of this rather than awkward about it.' },
    { t: 'h', level: 3, x: 'Guests Staying Over' },
    { t: 'p', x: 'A guest may stay in the Guest Bedroom if it is claimed for them, or on the Common Room sofa if it is not, and in the latter case must be up before the first member comes down.' },
    { t: 'p', key: 'guestkey', x: 'No guest holds a key, and no guest is left alone in the house.' },
    { t: 'h', level: 2, x: 'Keys and Access' },
    { t: 'h', level: 3, x: 'Front-door Keys' },
    { t: 'p', key: 'keys', x: 'Every member holds a front-door key, and members may lend or cut spares for regulars they trust.' },
    { t: 'p', key: 'lostkey', x: 'A member who loses a key tells the Steward the same day, and the house decides at the next meeting whether the locks are worth changing.' },
    { t: 'h', level: 3, x: 'Locking Up' },
    { t: 'p', key: 'lockup', x: 'The last member out locks the front door, closes the Workshop, and puts out the lamp in the Common Room.' },
    { t: 'p', x: 'A member who finds the house unlocked in the morning says nothing to anyone but the Steward, who says nothing to anyone at all.' },

    { t: 'h', level: 1, x: 'Part VI — Offices' },
    { t: 'h', level: 2, x: 'The Offices' },
    { t: 'h', level: 3, x: 'The Steward' },
    { t: 'p', x: 'The Steward keeps the house running: the rotas, the repairs, the Members’ Book, and the calling of meetings.' },
    { t: 'p', x: 'The Steward may spend from the purse on the ordinary running of the house without asking, and tells the Purse-holder afterwards.' },
    { t: 'p', key: 'nohead', x: 'The Steward is not the Club’s head. The Club has no head, and has managed for nine years without noticing the lack.' },
    { t: 'h', level: 3, x: 'The Purse-holder’s Office' },
    { t: 'p', key: 'purseOffice', x: 'The club has a Steward and a Purse-holder, chosen by acclaim, who do what needs doing until they stop.' },
    { t: 'p', x: 'Neither office carries any authority over a member, and neither may be used to settle a dispute in which the office-holder has an interest.' },
    { t: 'h', level: 3, x: 'The Garden Steward' },
    { t: 'p', x: 'The Garden Steward keeps the rota, allots the beds, and calls the heroic weekends.' },
    { t: 'p', x: 'The office is held for a growing year and by long custom passes to whoever complained most loudly about the state of the beds.' },
    { t: 'h', level: 2, x: 'Holding Office' },
    { t: 'h', level: 3, x: 'Election' },
    { t: 'p', x: 'Offices are filled at the spring meeting by acclaim, and only by a vote if more than one member is willing, which has happened twice.' },
    { t: 'p', x: 'A member may hold no more than one office at a time.' },
    { t: 'p', x: 'A member may decline an office without giving a reason and may not be pressed.' },
    { t: 'h', level: 3, x: 'Term and Handover' },
    { t: 'p', x: 'An office runs from the spring meeting to the next, and an office-holder stays in place until their successor takes it up.' },
    { t: 'p', x: 'On handover, everything the office holds — the book, the tin, the keys to the shed — passes to the successor within a fortnight.' },
    { t: 'h', level: 3, x: 'Standing Down' },
    { t: 'p', x: 'An office-holder may stand down at any time by telling the meeting or, between meetings, the Steward.' },
    { t: 'p', x: 'An office left vacant is filled at the next meeting; in the meantime its duties fall to the Steward, and if the Steward’s office is vacant, to the house at large.' },

    { t: 'h', level: 1, x: 'Part VII — Decisions' },
    { t: 'h', level: 2, x: 'Meetings' },
    { t: 'h', level: 3, x: 'Calling a Meeting' },
    { t: 'p', key: 'calling', x: 'House matters are decided at a meeting called with at least seven days’ notice to all members, by majority of those present, with the proposal and result minuted in the Members’ Book.' },
    { t: 'p', x: 'The Club meets four times a year without being called, on the first Thursday of each quarter, after dinner.' },
    { t: 'p', x: 'Any three members may require the Steward to call a meeting, and the Steward may call one at any time.' },
    { t: 'h', level: 3, x: 'Notice' },
    { t: 'p', key: 'notice', x: 'Notice of a meeting is given by writing it in the Members’ Book and telling every member by whatever means reaches them.' },
    { t: 'p', x: 'A matter not on the notice may still be decided if every member present agrees to take it, and not otherwise.' },
    { t: 'h', level: 3, x: 'Quorum' },
    { t: 'p', key: 'quorum', x: 'A meeting needs half the membership present to decide anything, and two-thirds to decide anything reserved.' },
    { t: 'p', x: 'A meeting that falls short of quorum may still be held, and may still talk, and may minute what it thinks, but decides nothing.' },
    { t: 'h', level: 2, x: 'Deciding' },
    { t: 'h', level: 3, x: 'Ordinary Decisions' },
    { t: 'p', x: 'An ordinary decision is taken by a majority of those present and voting, and takes effect at the close of the meeting unless it says otherwise.' },
    { t: 'p', x: 'Abstentions are counted and minuted but do not tell against the majority.' },
    { t: 'p', x: 'A decision may be revisited at any later meeting, but not at the same one.' },
    { t: 'h', level: 3, x: 'Reserved Decisions' },
    { t: 'p', x: 'Removing a member, changing these rules, spending beyond a year’s subscriptions, and dissolving the Club are reserved, and need two-thirds of those present at a quorate meeting.' },
    { t: 'p', x: 'A reserved decision must be on the notice, in the words in which it will be put.' },
    { t: 'h', level: 3, x: 'Decisions Between Meetings' },
    { t: 'p', x: 'Between meetings the Steward may decide anything that will not wait, and reports it to the next meeting, which may undo it but not undo what has already been done in reliance on it.' },
    { t: 'p', x: 'Nothing reserved may ever be decided between meetings.' },

    { t: 'h', level: 1, x: 'Part VIII — Disputes' },
    { t: 'h', level: 2, x: 'Raising a Matter' },
    { t: 'h', level: 3, x: 'Talking First' },
    { t: 'p', x: 'Disputes among members are the house’s to settle: talk first, then a house meeting if talking fails, with judgments recorded in the Members’ Book.' },
    { t: 'p', x: 'A member may ask another member to sit with them while they talk, and neither may refuse a reasonable choice of companion.' },
    { t: 'h', level: 3, x: 'Confidence' },
    { t: 'p', key: 'confidence', x: 'Any member may bring any worry to any other in confidence, and confidence is kept; nothing undisclosed to a respondent may ever count against them.' },
    { t: 'p', x: 'A member who receives a confidence may seek advice on it without names, and may break it only where someone is in danger.' },
    { t: 'p', x: 'The Steward keeps no record of a confidence unless the member who gave it asks for one.' },
    { t: 'h', level: 2, x: 'Hearing a Matter' },
    { t: 'h', level: 3, x: 'The House Meeting' },
    { t: 'p', x: 'A dispute that talking has not settled is heard at a meeting called for the purpose, at which both members speak and the house asks its questions.' },
    { t: 'p', x: 'Neither member may be represented, and neither may be prevented from speaking last.' },
    { t: 'p', x: 'The house decides by majority what it thinks happened, and by majority what should follow.' },
    { t: 'h', level: 3, x: 'Sanctions' },
    { t: 'p', key: 'sanctions', x: 'The house may ask for an apology, may suspend a right for a season, or in the last resort may remove a member under Part III.' },
    { t: 'p', x: 'A sanction is minuted with its reason and its end date, and expires on that date without anyone having to remember it.' },
    { t: 'p', x: 'No sanction may touch a member’s subscription or their standing in the garden.' },
    { t: 'h', level: 3, x: 'Appeal' },
    { t: 'p', x: 'A member sanctioned may ask the next quarterly meeting to look again, once, and the meeting hears it before any other business.' },
    { t: 'p', x: 'The Trust’s visitor may sit with the appeal at the member’s request, and may say what they think.' },

    { t: 'h', level: 1, x: 'Part IX — The Lease' },
    { t: 'h', level: 2, x: 'The Marchmont Trust' },
    { t: 'h', level: 3, x: 'The Lease' },
    { t: 'p', x: 'The Trust reserves the fabric and lease of the house, its insurance, and all legal obligations; within everything else, what the Club validly decides, the Trust treats as decided.' },
    { t: 'p', x: 'The lease runs to the year the Club’s youngest founder turns eighty, and is renewable on the same terms if the Club still exists.' },
    { t: 'p', x: 'The Club pays no rent and never has. The Trust has been asked why twice and has changed the subject both times.' },
    { t: 'h', level: 3, x: 'Insurance and Compliance' },
    { t: 'p', x: 'The Trust insures the building; the Club insures its own possessions, and tells its members that it does not insure theirs.' },
    { t: 'p', x: 'Where the law requires something of the house, the Trust does it, and the Club does not argue with it at meetings.' },
    { t: 'h', level: 2, x: 'If the Club Falters' },
    { t: 'h', level: 3, x: 'Reversion' },
    { t: 'p', x: 'If the Club stops doing something the house needs — the accounts, the rota, the locking up — the Trust may take it over on notice, and does so plainly and without comment.' },
    { t: 'p', x: 'The Trust may not take over the deciding. If the Club cannot decide, nothing is decided.' },
    { t: 'h', level: 3, x: 'Reclaiming a Function' },
    { t: 'p', x: 'The Club reclaims a reverted function by a decision at a quorate meeting, and the Trust hands it back at the end of that quarter.' },
    { t: 'p', x: 'No function has ever reverted, though the accounts came close in the fourth year.' },

    { t: 'h', level: 1, x: 'Part X — Amendment' },
    { t: 'h', level: 2, x: 'Changing These Rules' },
    { t: 'h', level: 3, x: 'Ordinary Amendment' },
    { t: 'p', x: 'These rules change by the same process as any house decision: proposed with notice, agreed by two-thirds at a quorate meeting, and minuted in the Members’ Book.' },
    { t: 'p', x: 'An amendment must be circulated in the words in which it will be put, and may be amended at the meeting only with the proposer’s agreement.' },
    { t: 'p', x: 'The Steward keeps every version of these rules, so that the house can always see what it used to think.' },
    { t: 'h', level: 3, x: 'Entrenched Rules' },
    { t: 'p', x: 'The rule that the Club has no head, the rule that confidence is kept, and this rule may be changed only with the agreement of every member.' },
    { t: 'p', x: 'Nothing else in these rules is entrenched, including the parts the founders were most attached to.' },
    { t: 'h', level: 2, x: 'Dissolution' },
    { t: 'h', level: 3, x: 'Winding Up' },
    { t: 'p', x: 'The Club may dissolve itself by a reserved decision at two consecutive meetings, so that nobody dissolves it in an evening.' },
    { t: 'p', x: 'On dissolution the purse pays what is owed, returns any member’s loan, and gives what remains to a society of the same kind, chosen at the last meeting.' },
    { t: 'p', x: 'The house and its fabric return to the Trust, and the tools return to whoever brought them, if they can remember.' },
    { t: 'h', level: 3, x: 'The Last Meeting' },
    { t: 'p', x: 'The last meeting of the Club is held at the table, over dinner, and is not quorate for any purpose except deciding that it is the last.' },
    { t: 'p', x: 'Adopted at the house, by the fourteen, over pasta.' },
  ];

  // One entry per queue item, carrying its own content, progress and state.
  // state: 'needs' (white) | 'deciding' (judged, still open) | 'sealed' (locked).
  // Every proposal carries a `rationale` — the author's one pinned paragraph
  // (SPEC §2.6). A quick card and a patch have one; a race has one per candidate.
  // Races used to carry `candidates` and `pairsJudged` as well, for the counts
  // in the card subtitle; 184 removed the subtitle and the fixture went on
  // writing them for another eight decisions. Hand-authored data that nothing
  // reads is data that quietly goes wrong, so it is gone.
  const SUGGS = [
    {
      id: 'race-purse', kind: 'race', keys: ['purse'], state: 'needs',
      qLabel: '§ The Purse-holder',
      urgency: 0.92,
      pct: 72, cap: 'close — a few good votes from decided',
      race: {
        a: {
          text: 'The Purse-holder pays only bills approved under the budget or by a house decision, reimburses claims against receipts, keeps accounts and receipts open to any member on request, and reports income and spending at every meeting.',
          rationale: 'Whoever holds the purse must be watched: "reimburses what seems fair" with receipts "in the tin" is unchecked discretion. This ties spending to approval and forces open reporting.'
        },
        b: {
          text: 'The Purse-holder pays the house’s bills and reimburses members’ reasonable claims as trust and good sense direct, keeping accounts in whatever simple way suits, and is glad to talk any member through them who asks.',
          rationale: 'The old rule buries our volunteer in budget sign-offs and minute-taking. We’re friends who trust each other — spare whoever takes this on the paperwork.'
        }
      }
    },
    {
      id: 'patch-rename', kind: 'patch', keys: ['purse', 'purseOffice', 'accounts'], state: 'needs',
      qLabel: 'Whole charter',
      urgency: 0.4,
      pct: 35, cap: 'gathering — needs roughly 6 more votes',
      rationale: '"Purse-holder" is twee and confuses newcomers. One rename, all three places it appears, plus a handover line so the tin doesn’t wander between office-holders.',
      sites: [
        { key: 'purse', label: '§ The Purse-holder', marked: 'The <del>Purse-holder</del> <ins>Treasurer</ins> pays the bills and reimburses what seems fair, <del>and</del> keeps the receipts in the tin<ins>, and hands the tin and books to their successor</ins>.' },
        { key: 'accounts', label: '§ Accounts and Inspection', marked: 'The <del>Purse-holder</del> <ins>Treasurer</ins> keeps the accounts in whatever way suits them, and shows them to any member who asks.' },
        { key: 'purseOffice', label: '§ The Purse-holder’s Office', marked: 'The club has a Steward and a <del>Purse-holder</del> <ins>Treasurer</ins>, chosen by acclaim, who do what needs doing until they stop.' },
      ]
    },
    {
      id: 'quick-keys', kind: 'quick', keys: ['keys'], state: 'needs',
      qLabel: '§ Front-door Keys',
      urgency: 0.86,
      pct: 60, cap: 'three of the fourteen have weighed in — quorum is 5',
      marked: 'Every member holds a front-door key, and <del>members</del> may lend or cut <del>spares</del> <ins>a spare</ins> for <del>regulars</del> <ins>a regular</ins> they trust<ins>, provided the Steward keeps a simple note of who holds one</ins>.',
      rationale: 'Keys are a security matter, not a vibe. A one-line log with the Steward costs nothing and means we can account for who can get in.'
    },
    // The salience diagonal (SPEC §8.3, ~1 slot in 10; Ed, 221). It compares
    // two *disputes* rather than two texts — which open question deserves more
    // of the room's attention — so it is a patch turned inside out: one
    // judgment, two anchors in different parts of the charter. Its lanes hold
    // the two contested clauses as they stand, and choosing one says only that
    // it matters more, never that its text is better.
    {
      id: 'diag-quorum-keys', kind: 'diagonal', state: 'needs',
      qLabel: 'Which matters more?', urgency: 0.44,
      pct: 30, cap: 'salience — this ranks the questions, never the answers',
      pair: [
        { key: 'quorum', name: 'Quorum', why: 'How many must be in the room before the house can decide anything at all.' },
        { key: 'keys', name: 'Front-door Keys', why: 'Who may hold a key to the house, and whether anyone keeps a note of it.' },
      ]
    },
    {
      id: 'race-quorum', kind: 'race', keys: ['quorum'], state: 'needs',
      qLabel: '§ Quorum',
      urgency: 0.58,
      pct: 44, cap: 'gathering — needs roughly 5 more votes',
      race: {
        a: {
          text: 'A meeting needs eight members present to decide anything, and ten to decide anything reserved, counted at the moment the question is put.',
          rationale: 'Fractions of a membership that changes size are a trap. Fixed numbers can be checked by looking round the room, and cannot be argued about afterwards.'
        },
        b: {
          text: 'A meeting needs half the membership present to decide anything, and two-thirds to decide anything reserved; a member who has given their view in writing to the Steward counts as present for quorum but not for the vote.',
          rationale: 'People travel and people work nights. Letting a written view hold your place stops the house from being unable to act because three of us are away.'
        }
      }
    },
    {
      id: 'insert-quiet', kind: 'quick', insertAfterKey: 'guests', state: 'needs',
      qLabel: 'After Bringing a Guest',
      urgency: 0.22,
      pct: 20, cap: 'new — evidence just starting',
      isInsert: true, newHeading: 'Quiet Hours',
      marked: '<ins>The house keeps quiet hours from eleven at night to eight in the morning: voices low in the Common Areas, the Workshop’s louder tools asleep, and any gathering still going moves to the Garden or winds down.</ins>',
      rationale: 'We’ve never written down the one rule everyone already tiptoes around. Guests stay over, members work early — saying it out loud beats resenting each other politely.'
    },
    // Ten more live suggestions spread down the urgency range (Ed, 194), so the
    // rail can be judged against a realistic spread rather than against one
    // example of each kind. Ordinary housekeeping, mostly: the kind of thing a
    // convention actually spends its afternoon on. (They were asked for to
    // calibrate the compression ladder, which has since gone; the spread turned
    // out to matter more for the admission ranking that replaced it.)
    {
      id: 'quick-armchair', kind: 'quick', keys: ['armchair'], state: 'needs',
      qLabel: '§ The Common Room', urgency: 0.14,
      pct: 18, cap: 'new — evidence just starting',
      marked: 'Furniture in the Common Room may be moved but must be put back<del>. The armchair by the window is not anybody’s, whatever Hollis says</del><ins> before the room is left empty</ins>.',
      rationale: 'The joke about Hollis is lovely and it is not a rule. Charters that wink at people age badly, and whoever inherits this will not know who Hollis was.'
    },
    {
      id: 'quick-books', kind: 'quick', keys: ['books'], state: 'needs',
      qLabel: '§ The Library Corner', urgency: 0.31,
      pct: 34, cap: 'gathering — needs roughly 4 more votes',
      marked: 'Books belonging to a member and left in the Corner become the house’s after <del>a year</del> <ins>two years</ins>, unless the member says otherwise in the book on the shelf.',
      rationale: 'A year is one long absence. Two years still clears the shelves of anything genuinely abandoned, without swallowing the library of somebody who spent a winter abroad.'
    },
    {
      id: 'quick-powertools', kind: 'quick', keys: ['powertools'], state: 'needs',
      qLabel: '§ The Workshop', urgency: 0.47,
      pct: 52, cap: 'gathering — needs roughly 3 more votes',
      marked: 'Power tools are not used when the member is alone in the house<ins>, unless another member knows they are there and when they expect to finish</ins>, and not after the beginning of quiet hours.',
      rationale: 'The flat ban means the only person who can use the lathe on a weekday is somebody who does not work. Telling one person where you are gets the same safety at a fraction of the cost.'
    },
    // A proposal on a **heading** (Q897): the same quick card as any other,
    // pointed at a section title rather than at a paragraph. It is in the
    // fixture because it is the case the charter walk could not reach — the
    // document render dropped every heading before it reached the branch that
    // emits a card, so this one opened nothing at all.
    {
      id: 'quick-shedhead', kind: 'quick', keys: ['shedhead'], state: 'needs',
      qLabel: '§ The Shed, the Cellar and the Space Under the Stairs', urgency: 0.24,
      pct: 26, cap: 'gathering — needs roughly 4 more votes',
      marked: 'The <del>Shed, the Cellar and the Space Under the Stairs</del> <ins>Outdoor Stores</ins>',
      rationale: 'The contents rail is a column of headings, and this one wraps to three lines in it. Naming the section for what it is leaves the joke where it belongs, in the clause underneath.'
    },
    {
      id: 'quick-twiceyear', kind: 'quick', keys: ['twiceyear'], state: 'needs',
      qLabel: '§ Objection', urgency: 0.08,
      pct: 12, cap: 'new — evidence just starting',
      marked: 'No candidate may be nominated twice in one year<ins>, counted from the date of the first nomination</ins>.',
      rationale: 'Nobody has ever disagreed about this and one clerk has already asked. Say which year it means and the question stops being asked.'
    },
    {
      id: 'quick-attendance', kind: 'quick', keys: ['attendance'], state: 'needs',
      qLabel: '§ The Duties of a Member Towards the House and Towards Each Other', urgency: 0.61,
      pct: 58, cap: 'gathering — needs roughly 3 more votes',
      marked: 'Every member is expected at three of the four quarterly meetings; a member who attends none in a year is asked, kindly, whether they still want to be a member<ins>, and the asking is done by the Steward in private</ins>.',
      rationale: 'As written, "asked kindly" could happen at a meeting, in front of everyone. That is the opposite of kind. Name who asks and where.'
    },
    {
      id: 'quick-subs', kind: 'quick', keys: ['subs'], state: 'needs',
      qLabel: '§ Subscriptions', urgency: 0.29,
      pct: 30, cap: 'gathering — needs roughly 4 more votes',
      marked: 'The subscription is set once a year at the spring meeting, and may not be raised by more than <del>a quarter</del> <ins>a tenth</ins> in any year without a reserved decision.',
      rationale: 'A quarter is a lot to be voted onto somebody by a simple majority. A tenth still covers ordinary inflation and makes a real rise something the house has to agree properly.'
    },
    // ---- one clause wearing the whole alphabet (Ed, 2026-08-17) ---------
    // Five suggestions on 'guests', deliberately one of each kind, so the
    // `clause-tab` stack can be looked at with every hue and every state in it
    // at once: 💡 open, ⏳ judged-and-running, ✏️ yours, ⚔️ deadlocked, ☑️ filed.
    // It is a stress case rather than a typical clause — the point is to see
    // what five tabs of five colours do to the gutter and to the card that
    // opens under them.
    {
      id: 'quick-guests-hours', kind: 'quick', keys: ['guests'], state: 'needs',
      qLabel: '§ Guests', urgency: 0.34,
      pct: 30, cap: 'gathering — needs roughly 4 more votes',
      marked: 'Friends of the house are welcome whenever a member is in<ins>, and until the quiet hours begin</ins>.',
      rationale: 'Welcome and “welcome at three in the morning” are different offers, and only one of them is fair on whoever is asleep upstairs.'
    },
    {
      id: 'quick-guests-count', kind: 'quick', keys: ['guests'], state: 'deciding',
      verdict: 'kept the current text', pick: 'keep',
      qLabel: '§ Guests — numbers', urgency: 0.2,
      pct: 61, cap: 'still deciding — a way from resolution yet',
      marked: 'Friends of the house are welcome whenever a member is in<ins>, up to three at a time without telling anybody</ins>.',
      rationale: 'Nobody minds two friends. Nine is a party, and a party is a thing you mention.'
    },
    {
      // **A deadlock you find out about by judging** (Ed, 297/298). This one is
      // stuck and says nothing about it: it is an ordinary 💡 race until you
      // have judged it, and turns ⚔️ the moment you do. The pair below it is
      // already judged, so the two states can be seen side by side.
      id: 'race-guests-notice', kind: 'quick', keys: ['guests'], state: 'needs',
      deadlocked: true, bounty: 0.55, judges: 9, comparisons: 21,
      qLabel: '§ Guests — notice', urgency: 0.42,
      pct: 48, cap: 'gathering — needs roughly 4 more votes',
      marked: 'Friends of the house are welcome whenever a member is in<del>. </del><ins>, and a member expecting more than one says so in the Members’ Book. </ins>',
      rationale: 'The house splits cleanly on this and has not moved in a week: half want it written down, half think a rule about friends is the beginning of the end. Somebody needs to find the version both halves can live with.'
    },
    {
      id: 'mine-guests-wording', kind: 'draft', mine: true, state: 'needs',
      qLabel: '§ Guests', urgency: 0.3,
      pct: 12, cap: 'yours · just in, evidence starting',
      rationale: '“Whenever a member is in” is doing the work already — it is the being-in that makes it hospitality rather than a key.',
      sites: [{ key: 'guests', keys: ['guests'], label: '§ Guests',
        text: 'Friends of the house are welcome whenever a member is in, which is what makes them guests and not visitors.',
        origin: [{ t: 'p', key: 'guests', x: 'Friends of the house are welcome whenever a member is in.' }] }]
    },
    {
      id: 'quick-guests-pets', kind: 'quick', keys: ['guests'], state: 'sealed',
      verdict: 'kept the current text', pick: 'keep',
      qLabel: '§ Guests — dogs', urgency: 0,
      pct: 100, cap: 'sealed — the current text stood · vote locked',
      // the oldest decision at this clause, and it is declared first because the
      // filed pile reads declaration order as time
      decided: { outcome: 'retired — the current text stood', when: 'Monday, 17:40', p: 0.38, bar: 0.69, judges: 6 },
      optionA: 'Friends of the house are welcome.',
      optionB: 'Friends of the house are welcome, and so are their dogs, on the ground floor.',
      rationale: 'Hollis’s lurcher has been coming for two years and nobody has ever objected. Write down what we already do.'
    },
    // § Bringing a Guest carries the charter's longest history, which is what
    // makes it the clause to test the filed pile on: four decisions already
    // taken here, three of them refused, under four still live.
    {
      id: 'quick-guests-inhouse', kind: 'quick', keys: ['guests'], state: 'sealed',
      verdict: 'preferred the new wording', pick: 'b',
      qLabel: '§ Guests — a member being in', urgency: 0,
      pct: 100, cap: 'sealed — adopted · the charter changed here',
      won: 'b',
      decided: { outcome: 'adopted', when: 'Tuesday, 11:20', p: 0.81, bar: 0.66, judges: 9 },
      optionA: 'Friends of the house are welcome.',
      optionB: 'Friends of the house are welcome whenever a member is in.',
      rationale: 'As it stood it invited people to a house with nobody in it. The guest is a member’s guest, and the member should be here.'
    },
    {
      id: 'quick-guests-three', kind: 'quick', keys: ['guests'], state: 'sealed',
      verdict: 'kept the current text', pick: 'keep',
      qLabel: '§ Guests — how many at once', urgency: 0,
      pct: 100, cap: 'sealed — the current text stood',
      decided: { outcome: 'retired — the current text stood', when: 'Wednesday, 09:05', p: 0.31, bar: 0.68, judges: 8 },
      optionA: 'Friends of the house are welcome whenever a member is in.',
      optionB: 'Friends of the house are welcome whenever a member is in, to a maximum of three at a time.',
      rationale: 'The Common Room holds nine at a push. Four of us bringing three friends each is not an evening, it is an incident.'
    },
    {
      id: 'quick-guests-book', kind: 'quick', keys: ['guests'], state: 'sealed',
      verdict: 'kept the current text', pick: 'keep',
      qLabel: '§ Guests — signing in', urgency: 0,
      pct: 100, cap: 'sealed — the current text stood',
      decided: { outcome: 'retired — the current text stood', when: 'Thursday, 19:44', p: 0.44, bar: 0.70, judges: 7 },
      optionA: 'Friends of the house are welcome whenever a member is in.',
      optionB: 'Friends of the house are welcome whenever a member is in, and are written in the book on the landing.',
      rationale: 'If the house burns down we should know who was in it. It costs a line of a pen.'
    },
    {
      id: 'quick-guests-children', kind: 'quick', keys: ['guests'], state: 'sealed',
      verdict: 'kept the current text', pick: 'keep',
      qLabel: '§ Guests — children', urgency: 0,
      pct: 100, cap: 'sealed — the current text stood',
      decided: { outcome: 'retired — the current text stood', when: 'Thursday, 20:12', p: 0.22, bar: 0.70, judges: 7 },
      optionA: 'Friends of the house are welcome whenever a member is in.',
      optionB: 'Friends of the house are welcome whenever a member is in; children under twelve are welcome in the Garden only.',
      rationale: 'The Library Corner is not a place for a four-year-old and none of us wants to be the one who says so.'
    },
    {
      id: 'quick-guests-late', kind: 'quick', keys: ['guests'], state: 'sealed',
      verdict: 'kept the current text', pick: 'keep',
      qLabel: '§ Guests — arriving late', urgency: 0,
      pct: 100, cap: 'sealed — the current text stood',
      decided: { outcome: 'retired — the current text stood', when: 'Friday, 08:31', p: 0.49, bar: 0.71, judges: 10 },
      optionA: 'Friends of the house are welcome whenever a member is in.',
      optionB: 'Friends of the house are welcome whenever a member is in, and are not brought in after ten in the evening.',
      rationale: 'The Upper Floors hear everything. Ten is not early and the rule would be kind to whoever is asleep.'
    },
    {
      id: 'quick-guests-dinner', kind: 'quick', keys: ['guests'], state: 'sealed',
      verdict: 'preferred the new wording', pick: 'b',
      qLabel: '§ Guests — at the Thursday Dinner', urgency: 0,
      pct: 100, cap: 'sealed — the current text stood',
      decided: { outcome: 'retired — the current text stood', when: 'Friday, 12:07', p: 0.66, bar: 0.72, judges: 11 },
      optionA: 'Friends of the house are welcome whenever a member is in.',
      optionB: 'Friends of the house are welcome whenever a member is in, though not at the Thursday Dinner unless the cook is told the day before.',
      rationale: 'The cook buys for the number they are given. A guest nobody mentioned is somebody else going without.'
    },
    {
      id: 'quick-guests-wine', kind: 'quick', keys: ['guests'], state: 'sealed',
      verdict: 'kept the current text', pick: 'keep',
      qLabel: '§ Guests — bringing something', urgency: 0,
      pct: 100, cap: 'sealed — the current text stood',
      decided: { outcome: 'retired — the current text stood', when: 'Friday, 16:55', p: 0.18, bar: 0.72, judges: 6 },
      optionA: 'Friends of the house are welcome whenever a member is in.',
      optionB: 'Friends of the house are welcome whenever a member is in; a member bringing the same guest twice in a week brings the wine.',
      rationale: 'Half a joke, but the house does keep buying drink for people who are not in it.'
    },
    {
      id: 'quick-guestkey', kind: 'quick', keys: ['guestkey'], state: 'needs',
      qLabel: '§ Guests Staying Over', urgency: 0.19,
      pct: 22, cap: 'new — evidence just starting',
      marked: 'No guest holds a key, and no guest is left alone in the house<ins> unless the member who brought them says so and is reachable</ins>.',
      rationale: 'Half of us have left a guest making toast while we went for milk. The rule as written makes ordinary hospitality a breach.'
    },
    {
      id: 'quick-nohead', kind: 'quick', keys: ['nohead'], state: 'needs',
      qLabel: '§ The Steward', urgency: 0.37,
      pct: 40, cap: 'gathering — needs roughly 4 more votes',
      marked: 'The Steward is not the Club’s head. The Club has no head<del>, and has managed for nine years without noticing the lack</del>.',
      rationale: 'The second half is a boast about our own history, and it will read strangely in ten years. The first sentence is the rule and it is enough.'
    },
    {
      id: 'quick-cellar', kind: 'quick', keys: ['cellar'], state: 'needs',
      qLabel: '§ The Shed and Cellar', urgency: 0.11,
      pct: 15, cap: 'new — evidence just starting',
      marked: 'Once a year, before the spring meeting, the Steward opens the cellar and the house decides together what may go<ins>, and anything nobody speaks for is offered to members before it is thrown</ins>.',
      rationale: 'Things get thrown that somebody would have taken. One sentence, one afternoon saved, and nobody has to argue about a bicycle.'
    },
    {
      id: 'quick-lostkey', kind: 'quick', keys: ['lostkey'], state: 'needs',
      qLabel: '§ Front-door Keys — loss', urgency: 0.53,
      pct: 47, cap: 'gathering — needs roughly 3 more votes',
      marked: 'A member who loses a key tells the Steward <del>the same day</del><ins> as soon as they know</ins>, and the house decides at the next meeting whether the locks are worth changing.',
      rationale: 'You often do not know the day you lost it. "As soon as they know" is the honest version and does not make a rule nobody can keep.'
    },
    {
      id: 'quick-arrears', kind: 'quick', keys: ['arrears'], state: 'needs',
      qLabel: '§ Arrears',
      urgency: 0.97,
      pct: 88, cap: 'one vote from decided',
      marked: 'A member more than two quarters in arrears, who has not asked for hardship, is reminded once by the Purse-holder and once by the Steward, in that order <del>and not more</del><ins>. No further reminder is given by anyone</ins>.',
      rationale: '"In that order and not more" reads as though the Steward is limited to one reminder. The point is that the house stops after two, from anybody. Same rule, said properly.'
    },
    // A proposal of your own, already in (Ed, 2026-08-16). It is a suggestion
    // like any other — everyone else sees an ordinary 💡 card at § Spending —
    // but from your side it is the one entry on the surface that is about you
    // as *author*: nothing is asked of you, because your preference for your
    // own candidate is already counted (SPEC §3.3), and the only act left is
    // to withdraw it. `sites` rather than `keys` alone, because a draft can
    // grow to cover several clauses (Ed, 232) and one shape has to carry both.
    {
      id: 'mine-spending', kind: 'draft', mine: true, keys: ['spending'], state: 'needs',
      qLabel: '§ Spending',
      urgency: 0,
      pct: 26, cap: 'yours · in the race, gathering votes',
      rationale: 'Nobody wants to ask permission to buy a mop. But "anything above a quarter’s subscriptions" is most of a year of somebody’s hardship, and the house only finds out at the spring meeting. A note in the book is not a sign-off.',
      sites: [{
        keys: ['spending'],
        label: 'Spending',
        text: 'Ordinary spending on the running of the house needs nobody’s permission. Anything above a quarter’s subscriptions needs the meeting’s, and the Purse-holder writes anything above a month’s in the Members’ Book within the week.',
      }],
    },
    {
      // Already judged, so it wears ⚔️ on load — the state you reach by getting
      // through a race, without having to get through one first.
      id: 'race-sanctions', kind: 'race', keys: ['sanctions'], state: 'deciding', deadlocked: true,
      pick: 'a', verdict: 'preferred “The house may ask for an apology or…”',
      qLabel: '§ Sanctions',
      // judgment leverage is nil here, which is what deadlocked *means*; the
      // rail ranks it on `bounty` instead — resolvable disagreement × salience,
      // the score that outlived the board it was named for (Ed, 223)
      urgency: 0.05, bounty: 0.86,
      pct: 100, cap: 'gathering — needs roughly 3 more votes',
      judges: 11, comparisons: 34,
      // **Eight wordings** (Ed, 2026-08-17: *maybe I need to see a race with 8
      // proposals to really understand what's happening here*). This is what a
      // constitutional argument looks like when it has genuinely stuck: not two
      // options that split the room, but eight attempts at the same sentence,
      // most of them answering the ones before them, arranged in two camps
      // nobody has yet bridged. `race` survives beneath it for the pairwise
      // machinery; `fieldOf` prefers `slate`, which is what the card shows.
      slate: [
        { text: 'The house may ask for an apology or suspend a right for a season; removal under Part III is available only where a sanction has already been imposed and has not been kept to.',
          rationale: 'Removal should never be the first thing reached for. Making it conditional on a broken sanction gives everyone a step back from the cliff.' },
        { text: 'The house may ask for an apology, may suspend a right for a season, or in the last resort may remove a member under Part III; every sanction is proposed by a member who is not party to the dispute.',
          rationale: 'The problem isn’t the ladder of sanctions, it’s who proposes them. An uninvolved proposer stops a hearing turning into the aggrieved party naming their own remedy.' },
        { text: 'The house may ask for an apology or suspend a right for a season. Removal is not a sanction and is dealt with only under Part III, at a meeting called for that purpose alone.',
          rationale: 'Putting removal in the same sentence as an apology makes them the same kind of thing. They are not, and a charter that lists them together will eventually be read as a menu.' },
        { text: 'The house may ask for an apology, suspend a right for a season, or remove a member under Part III. No sanction may be proposed by a member party to the dispute, and none may be decided at the meeting it was proposed at.',
          rationale: 'Both halves of the argument are right and they do not conflict. A neutral proposer and a night’s sleep between proposing and deciding cost nothing and prevent most of what we are worried about.' },
        { text: 'The house may ask for an apology or suspend a right for a season. Where a sanction has been imposed twice in a year and not kept to, the house may remove a member under Part III.',
          rationale: 'The one-broken-sanction version is still a two-step to the door. Twice in a year is a pattern, and a pattern is the only honest ground for removing somebody.' },
        { text: 'The house may ask for an apology, may suspend a right for a season, or in the last resort may remove a member under Part III. Every sanction expires when its reason does, and the Steward says so at the next meeting.',
          rationale: 'We keep arguing about the ladder and nobody has said what happens afterwards. A sanction with no end is a removal in instalments.' },
        { text: 'The house may ask for an apology or suspend a right for a season. Removal under Part III requires the agreement of two thirds of those present, and may not be proposed by a member party to the dispute.',
          rationale: 'If removal is going to stay on the list, it should be harder to reach than a suspension. A bare majority is the same bar as choosing the wine.' },
        { text: 'The house may ask for an apology or suspend a right for a season, and may ask the Trust’s visitor to sit with the matter. Removal under Part III is available only where the visitor has been asked and the matter has not settled.',
          rationale: 'We have a visitor and never use them. An outside pair of eyes before the door is opened is cheaper than any of the rules being argued over here.' },
      ],
      race: {
        a: {
          text: 'The house may ask for an apology or suspend a right for a season; removal under Part III is available only where a sanction has already been imposed and has not been kept to.',
          rationale: 'Removal should never be the first thing reached for. Making it conditional on a broken sanction gives everyone a step back from the cliff.'
        },
        b: {
          text: 'The house may ask for an apology, may suspend a right for a season, or in the last resort may remove a member under Part III; every sanction is proposed by a member who is not party to the dispute.',
          rationale: 'The problem isn’t the ladder of sanctions, it’s who proposes them. An uninvolved proposer stops a hearing turning into the aggrieved party naming their own remedy.'
        }
      }
    },
    {
      id: 'quick-confidence', kind: 'quick', keys: ['confidence'], state: 'deciding',
      verdict: 'approved (recorded as: proposal beats current text)', pick: 'approve',
      qLabel: '§ Confidence',
      urgency: 0.5,
      pct: 84, cap: 'still deciding — close to resolution',
      marked: 'Any member may bring any worry to any other in confidence, and <ins>that</ins> confidence is kept; nothing <del>undisclosed to</del> <ins>kept from</ins> a respondent may ever count against them.',
      rationale: '"Nothing undisclosed to a respondent" dangles. "Kept from" says the same thing in plain words. No change of substance.'
    },
    {
      id: 'race-hardship', kind: 'race', keys: ['hardship'], state: 'deciding',
      verdict: 'preferred “Hardship is asked for and given…”', pick: 'b',
      qLabel: '§ Hardship',
      urgency: 0.5,
      pct: 66, cap: 'still deciding — your vote moved it',
      race: {
        a: {
          text: 'A member in difficulty may ask the Purse-holder to reduce or suspend their subscription for up to two quarters, and the Purse-holder tells no one, including the Steward and the meeting.',
          rationale: 'The current wording says the Purse-holder need not say why. It should say they may not say at all — the discretion belongs to the member in difficulty, not the office-holder.'
        },
        b: {
          text: 'A member in difficulty may reduce or suspend their own subscription for up to two quarters by telling the Purse-holder, who may not refuse and may not ask why.',
          rationale: 'Asking permission to be poor is the humiliating part. Make it a notification, not a request, and the office-holder never has to weigh a friend’s circumstances.'
        }
      }
    },
    {
      id: 'quick-probation', kind: 'quick', keys: ['probation'], state: 'deciding',
      verdict: 'kept the current text', pick: 'keep',
      qLabel: '§ Probation',
      urgency: 0.5,
      pct: 52, cap: 'still deciding — a way from resolution yet',
      marked: 'A new member is on probation for <del>six months</del> <ins>a full year</ins>, during which they hold every right of membership except the right to vote on <del>admissions</del> <ins>admissions, removals, or changes to these rules</ins>.',
      rationale: 'Six months is two meetings. You cannot know how someone handles a hard evening in the house until you have seen one, and there is usually one a year.'
    },
    {
      // The one **ground shift** on the surface (SPEC §4.4), rebuilt 2026-08-17
      // so that it is actually one. It had the 🔄 glyph and a tooltip, and a
      // `marked` string identical to the clause — so the card showed a proposal
      // that proposed nothing, against a text that had visibly not moved.
      //
      // The story it now tells: you judged this clause when it was one line
      // about the rota. Somebody else's patch adding the Garden Steward carried,
      // which changed the text under you — so your comparison was against a
      // wording that no longer exists, and it is locked (§4.4). A live candidate
      // is now arguing about the heroic weekends, against the new ground.
      id: 'quick-garden', kind: 'quick', keys: ['garden'], state: 'deciding', locked: true,
      verdict: 'preferred the posted rota', pick: 'keep',
      qLabel: '§ The Garden',
      urgency: 0.5,
      pct: 90, cap: 'still deciding — close to resolution',
      shifted: 'The Garden Steward was adopted here after you voted, so your vote was about a wording that no longer exists.',
      wasGround: 'The Garden is kept up by a rota posted in the shed.',
      marked: 'The Garden is kept up by a rota posted in the shed, with a Garden Steward to keep it organised and <del>call heroic weekends when it gets ahead of us</del><ins>set two working weekends a year, in spring and in autumn</ins>.',
      rationale: 'Heroic weekends are called by whoever minds most, which means the same four people. Two dates in the calendar are something everyone can plan around.'
    },
    // A sealed race with a field rather than a pair (Ed, 120): five proposals,
    // one of which stands. `slate` replaces the a/b pair when there were more
    // than two — the record has to show the whole field, not a sample of it.
    {
      id: 'race-claims', kind: 'race', keys: ['claims'], state: 'sealed', unread: true,
      verdict: 'voted on three pairs — twice for the wording that stood', pick: null,
      qLabel: '§ The Guest Bedroom — claims',
      urgency: 0,
      pct: 100, cap: 'sealed — adopted · vote locked',
      decided: { outcome: 'adopted', when: 'yesterday, 20:15', p: 0.86, bar: 0.72, judges: 7 },
      // the text the winner displaced — the document no longer holds it
      replaced: 'A claim is made by writing in the book on the landing. A claim more than a month ahead may be displaced by a member with a nearer need, on notice and with apologies.',
      slate: [
        {
          text: 'A claim is made by writing in the book on the landing. Claims are taken in the order they are written and are not displaced for any reason.',
          rationale: 'A rule with an exception in it is a rule people argue about at ten at night. First come, first served is the only version nobody can lawyer.',
          p: 0.58
        },
        {
          text: 'A claim is made by writing in the book on the landing. A claim more than a month ahead may be displaced by a member with a nearer need, who tells the displaced member within a day and offers them the next free week.',
          rationale: 'Displacement is fine — it is being displaced silently that stings. Say it to their face within a day and hand them something back, and the rule stops being a way to lose your mother’s visit.',
          p: 0.86, won: true
        },
        {
          text: 'A claim is made by writing in the book on the landing. A claim may be displaced by a member with a nearer need, at the Steward’s discretion.',
          rationale: 'Somebody has to weigh a wedding against a fortnight of decorating. That is what we have a Steward for, and they can see the whole book.',
          p: 0.49
        },
        {
          text: 'The Guest Bedroom is booked by asking the Steward, who keeps the calendar and settles clashes.',
          rationale: 'The book on the landing is lost twice a year. One person with one calendar is how every other house in the world does this.',
          p: 0.21
        },
        {
          text: 'A claim is made by writing in the book on the landing. No member may hold more than two claims at once, and none more than a season ahead.',
          rationale: 'The problem is not displacement, it is the two of us who book out the whole summer in February. Cap the hoarding and the clashes mostly go away.',
          p: 0.35
        },
      ]
    },
    // Sealed judgments carry their whole record (Ed, 112): both texts, which
    // one stood, and the numbers it stood on. `unread` ones pin themselves to
    // the screen until you have opened them.
    // Three of these share a section, so their dots stack (Ed, 106).
    {
      id: 'quick-kitchen', kind: 'quick', keys: ['kitchen'], state: 'sealed',
      verdict: 'approved the seven-in-the-morning test', pick: 'approve',
      qLabel: '§ The Kitchen',
      urgency: 0,
      pct: 100, cap: 'sealed — adopted · vote locked',
      optionA: 'The Kitchen is common to all members and is to be kept clean and tidy at all times.',
      optionB: 'The Kitchen is common to all members and is governed by one rule: you leave it as you would wish to find it at seven in the morning.',
      won: 'b',
      decided: { outcome: 'adopted', when: 'yesterday, 16:05', p: 0.84, bar: 0.66, judges: 6 },
      rationale: '"Clean and tidy" is what everyone already thinks they are being. A test you can picture settles arguments that an adjective cannot.'
    },
    {
      // Retired, unread, and **you never judged it** — so it never pins: it is
      // already a filed ✖ dot on load. The § Nomination race beside it is the
      // other half of the rule, retired and judged, and it does pin.
      id: 'quick-larderfood', kind: 'quick', keys: ['larderfood'], state: 'sealed', unread: true,
      verdict: null, pick: null,
      qLabel: '§ The Kitchen — larder',
      urgency: 0,
      pct: 100, cap: 'sealed — retired · the current text stood',
      optionA: 'Food in the larder marked with a name belongs to that member. Food not marked belongs to the house and may be eaten by anyone.',
      optionB: 'Food in the larder belongs to the house after a fortnight, marked or not, and may be eaten by anyone.',
      won: 'a',
      decided: { outcome: 'retired — the current text stood', when: 'yesterday, 18:12', p: 0.41, bar: 0.70, judges: 6 },
      rationale: 'Half the marked food in there is somebody’s week of lunches. A fortnight rule turns the larder into a race.'
    },
    {
      id: 'quick-knives', kind: 'quick', keys: ['knives'], state: 'sealed', unread: true,
      verdict: null, pick: null,
      qLabel: '§ The Kitchen — knives',
      urgency: 0,
      pct: 100, cap: 'sealed — adopted · vote locked',
      optionA: 'The good knives are sharpened by the Steward and are not to be used on bone or frozen food.',
      optionB: 'The good knives are sharpened by the Steward and are not to be used on bone, frozen food, or the garden.',
      won: 'b',
      decided: { outcome: 'adopted', when: 'this morning, 09:20', p: 0.88, bar: 0.71, judges: 5 },
      rationale: 'Somebody cut twine with the carving knife. Naming the garden costs three words and saves an edge.'
    },
    // These two were the old `CHANGES` fixture — adoptions that had happened
    // while you were away, reported by a separate "changed just now" chip and
    // change card. They are adoptions like any other, so they are sealed
    // decisions like any other (Ed, 203), and the second mechanism is gone.
    {
      id: 'quick-calling', kind: 'quick', keys: ['calling'], state: 'sealed', unread: true,
      verdict: null, pick: null,
      qLabel: '§ Calling a Meeting',
      urgency: 0,
      pct: 100, cap: 'sealed — adopted · vote locked',
      optionA: 'House matters are settled by whoever is in the room when they come up.',
      optionB: 'House matters are decided at a meeting called with at least seven days’ notice to all members, by majority of those present, with the proposal and result minuted in the Members’ Book.',
      won: 'b',
      decided: { outcome: 'adopted', when: 'a few minutes ago', p: 0.87, bar: 0.72, judges: 6 },
      rationale: '"Whoever is in the room" is how a house ends up governed by whoever happens to be free on a Tuesday. Notice, a majority, and a line in the book — the smallest thing that makes a decision findable afterwards.'
    },
    {
      id: 'quick-lockup', kind: 'quick', keys: ['lockup'], state: 'sealed', unread: true,
      verdict: 'preferred this wording', pick: 'approve',
      qLabel: '§ Locking Up',
      urgency: 0,
      pct: 100, cap: 'sealed — adopted · vote locked',
      optionA: 'The last member out locks the front door and puts out the lamp in the Common Room.',
      optionB: 'The last member out locks the front door, closes the Workshop, and puts out the lamp in the Common Room.',
      won: 'b',
      decided: { outcome: 'adopted', when: 'a few minutes ago', p: 0.79, bar: 0.74, judges: 5 },
      rationale: 'The Workshop door swings open in a draught and nobody thinks to check it. Add it to the same list as the lamp and it gets done with everything else.'
    },
    {
      id: 'quick-notice', kind: 'quick', keys: ['notice'], state: 'sealed',
      verdict: 'approved the plainer wording', pick: 'approve',
      qLabel: '§ Notice',
      urgency: 0,
      pct: 100, cap: 'sealed — adopted · vote locked',
      optionA: 'Notice of a meeting shall be effected by entry in the Members’ Book and by such further communication to each member as the Steward shall deem sufficient in the circumstances.',
      optionB: 'Notice of a meeting is given by writing it in the Members’ Book and telling every member by whatever means reaches them.',
      won: 'b',
      decided: { outcome: 'adopted', when: 'yesterday, 19:40', p: 0.91, bar: 0.68, judges: 7 },
      rationale: 'We are fourteen people in a house, not a company with a secretary. Say it the way we would say it.'
    },
    {
      id: 'race-nomination', kind: 'race', keys: ['nomination'], state: 'sealed', unread: true,
      verdict: 'preferred “A candidate for membership is nominated…”', pick: 'a',
      qLabel: '§ Nomination, Seconding and the Standing of a Candidate',
      urgency: 0,
      pct: 100, cap: 'sealed — retired · the current text stood',
      // neither challenger cleared the bar, so the incumbent stood: no winner
      won: null,
      decided: { outcome: 'retired — the current text stood', when: 'yesterday, 21:03', p: 0.52, bar: 0.74, judges: 5 },
      race: {
        a: {
          text: 'A candidate for membership is nominated by one member and seconded by another, neither of whom may be the candidate’s household.',
          rationale: 'A household nominating and seconding its own candidate is two names out of one kitchen. The bar costs nothing and keeps the door honest.',
          p: 0.52
        },
        b: {
          text: 'A candidate for membership is nominated by any two members.',
          rationale: 'The household bar reads as suspicion of our own members. Two names are two names — and if the house has doubts, the meeting is where they belong.',
          p: 0.29
        }
      }
    },
  ];

  // The roster and its quorum: F = min(⌈E/3⌉, F_max) distinct movers before
  // anything can be adopted (SPEC §8.2, where it is called the *floor*). The
  // interface says **quorum** (Ed, 190) — it is quorum for a decision rather
  // than for a meeting, which is the intuition people already have. This is
  // the number that is actually a headcount; the adoption-threshold beside it
  // is a confidence, not a vote share.
  const ROSTER = 14, FLOOR = 5;

  // Creation-time constitution (SPEC §9.0). The starting number of edits and
  // the rate they come back are per-document parameters chosen when the
  // document is made, exactly like quorum and the bar (Ed, 2026-08-16) — so
  // they are held here as named rules rather than as numbers scattered
  // through the render.
  const EDIT_RULES = { grant: 4, cap: 8, stake: 1 };
  // Where this member stands: five held, three fifths of the way to a sixth.
  // Worth knowing that a real session would probably show eight — §7's
  // calibration note says participants sit near the cap at v1 defaults, which
  // is the open question behind Q251.
  const editsHeld = 5, editsToNext = 0.6;
  // the window this document was given at creation (SPEC §9.0), in minutes —
  // the drip is one edit per tenth of it, which is what the wallet counts down
  const SESSION_MINUTES = 8 * 60;

  return { DOC, SUGGS, ROSTER, FLOOR, EDIT_RULES, SESSION_MINUTES, editsHeld, editsToNext };
})();
