/* copy.js — every string a member can read, in one file.
 *
 * The move (Ed's brief, 2026-09-05, Part 3): member-readable copy had grown
 * inline through five large files, beside comments quoting older wordings and
 * duplicates in design/reference/, and edits kept matching the wrong
 * occurrence — the structural cause of the copy mangling. The strings live
 * here now; the files that render them hold references. **Copy edits touch
 * this file only.**
 *
 * What belongs here: sentences, labels, titles, tooltips, placeholders —
 * anything STYLE.md §1 audits. What stays behind: glyph constants and drawn
 * marks (iconography, not sentences), class names, selectors, data-* values,
 * and every comment — comments are not copy, and the reasoning stays beside
 * the code it argues for. A comment *inside* a moved table travels with its
 * rows, because a note about the chamber sentences belongs where the chamber
 * sentences are.
 *
 * Templates with interpolation are small functions taking named-ish
 * arguments; the caller escapes what needs escaping before it interpolates,
 * exactly as the inline strings did.
 *
 * Load order: constitution.js → **copy.js** → cards.js → setup.js →
 * session.js → inline. Everything below cards.js may read window.COPY.
 */
window.COPY = (function () {
  'use strict';

  // ---- the clause sentences, one home -------------------------------------
  // **One value, one sentence, the document's own** (Q1112 (b), Ed 2026-09-01:
  // *we should try and use clause sentences whenever we can*): the member's
  // blind ladder, the composer's lane, the settled strip and the readback all
  // read this table through cards.js's `clauseOf`/`clauseRungs`. Ed's card
  // review of 2026-09-02 rewrote most of these sentences verbatim
  // (design/card-review-2026-09-02.md, Part B); 👤's *at the end* is his Q995
  // ruling holding, and 🥾's *apart from them* lost its emphasis because
  // clause text is escaped at its reading sites and markup cannot ride the
  // table. `spec-check`'s `checkComposer` reads this literal from this file.
  const RULES = {
    // Ed's sentences (card review round 3, 2026-09-05, 10): *any member*,
    // *someone*, and the 🏛️ rung's *but*
    admission: {
      assembly: 'Any member may propose to invite someone to join the membership, but all members must agree 🏛️.',
      proposal: 'Any member may propose to invite someone to join the membership, and the membership decides ✏️.',
      pen: 'Any member may invite someone to join the membership at will ✒️.' },
    removal: {
      consent: 'To remove a member, all members must agree 🏛️.',
      assembly: 'To remove a member, all members apart from them must agree 🏛️.',
      proposal: 'To remove a member, a majority of members must agree ✏️.' },
    authorship: {
      anonymous: 'All proposals are made anonymously.',
      anonymousElective: 'Proposals may be made anonymously.',
      sealed: 'All proposals are made anonymously, and all names are revealed at the end.',
      sealedElective: 'Proposals may be made anonymously, and all names are revealed at the end.',
      public: 'Proposals may not be made anonymously.' },
    judgments: {
      never: 'Votes are never revealed.',
      after: 'Votes are revealed when the document is finished, and not before.' },
    // **Foundership carries a read, whatever 🌍 says** (Ed, 2026-08-22), said
    // only where it is a deviation: a founder who is a member is covered by
    // the sentence already, and under link or public everybody reads anyway.
    // Where it *is* a deviation it is **one sentence naming both audiences**
    // (Ed's QA, 2026-09-02): a second sentence after a first that has just
    // excluded the reader reads as an afterthought about the rule, where one
    // sentence simply says who can read it.
    chamber: {
      closed: (x) => (x.founderIsMember ? 'The document can only be seen by members.'
        : 'The document can only be seen by members and the Founder.'),
      link: () => 'The document can be seen by anyone with the link.',
      public: () => 'The document is public — listed and readable by anyone.' },
    // 🤝 is one switch; what an application costs is 🪪's sentence (entry 94)
    // — a tie the card no longer states (Ed's rewrite dropped *voted on like
    // an invitation*; SPEC §9.7½ still holds it)
    applications: {
      invite: () => 'New members may only join by invitation.',
      apply: (x) => (x.admissionPrice === 'pen' ? 'Anyone with the link joins on arrival.'
        : 'Anyone with the link may apply to become a member.') },
  };

  // ---- the decision-card grammar (cards.js) --------------------------------
  // Keyed by the builder that renders each string; a name here appears beside
  // its reference in cards.js, so a copy edit can be traced to its card site
  // in one grep.
  const grammar = {
    // **A rail entry's title names its own subject** (Q1523, Ed 2026-09-24):
    // the words a change is about, computed from the entry alone — never
    // by comparison with its neighbours. `railChange` / `railPair` in
    // cards.js are the only builders; the snippet inside a quote is member
    // text and is escaped by the renderer, never here.
    railTitle: {
      quote: (s) => '‘' + s + '’',
      // a proposal that replaces words, or a record of one: what went out, what came in
      arrow: (was, now) => was + ' → ' + now,
      // two wordings put side by side, as the card presents them
      or: (a, b) => a + ' or ' + b,
      // a pair where one side simply has words the other lacks — drawn as the
      // words struck through (Q1523 (c)); this is the tooltip's reading, and
      // `struckPair` the words a screen reader hears before the struck quote
      withOrWithout: (q) => 'with or without ' + q,
      // a decided change that only took words out, the same way
      without: (q) => 'without ' + q,
      struck: 'without ',
      struckPair: 'with or without ',
      // a change of punctuation or spacing alone: the clause's own name, said so
      punctuation: (name) => name + ' (punctuation)',
      // a snippet cut short, and a change with more to it than the title shows
      more: '…',
    },
    // `railWhen`: a rail entry's moment, 24-hour, shortest by distance —
    // *15:25* today, *Sun 15:25* this week, *20 Sep* this year, *20 Sep 2025*
    railWhen: {
      days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },
    // `longWhen` / `longDay`: a moment on a card, in full and always 24-hour
    // (Q1523 (a), STYLE T16) — *Sunday, 20 September, 11:12*, the year after
    // the month where it is not this one; `longDay` the date alone
    longWhen: {
      days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'],
      day: (d, month, year) => d + ' ' + month + (year ? ' ' + year : ''),
      full: (weekday, day, hm) => weekday + ', ' + day + ', ' + hm,
    },
    // `reasonHtml`: a link in a reason that leaves docs.vote (Q1533) — what a
    // screen reader hears after the link's words; the ↗ is drawn by the CSS
    reasonLink: {
      leaves: ' (opens outside docs.vote)',
    },
    // laneSeed: the note under a draft opened from an existing proposal
    seedNote: 'the proposal you are editing',
    // laneProposeHtml: ✏️ on a lane
    proposeEdit: {
      title: 'Write your own version of this proposal. Free to open — proposing costs one edit.',
      label: '✏️ propose edit',
    },
    // speakerHtml: the sealed disc and the words beside it
    speaker: {
      wroteThis: (escName) => escName + ' wrote this.',
      sealed: 'A member wrote this. Who, is sealed until the closing record.',
      noReason: 'No reason given.',
    },
    // secToggleHtml: the fold triangle
    sectoggle: { fold: 'Fold this section away', unfold: 'Unfold this section' },
    // fieldHtml: the band label over the candidates
    field: {
      proposed: 'Proposed',
      rivals: (n) => 'Proposed · ' + n + ' rival proposals',
    },
    // groundNote: the text a shifted judgment was cast on
    ground: {
      tag: 'The text you voted on',
      sub: 'the clause changed after you voted',
    },
    // laneBarHtml: the pick control
    lane: {
      pickTitle: 'Say you prefer this proposal — nothing leaves the card until you submit',
      prefer: 'Prefer this',
      preferred: 'Preferred',
      // the third register (Ed, 2026-09-06): where picking the option and
      // committing *creates* a proposal — the composer's lanes and field
      // blocks — the radio says what the press will do
      proposeTitle: 'Propose this — nothing leaves the card until you submit',
      propose: 'Propose this',
      proposed: 'Proposed',
      // **A deletion's lane is a sentence, not a blank** (Q1412, Ed
      // 2026-09-17): a proposal that removes a clause has no wording to show,
      // and a lane drawn empty is the one rendering that cannot be told from
      // unchanged. The lane says what the proposal would do instead, wherever
      // a candidate is *read* — the pair card, your own proposal, the record's
      // field. The editing lane keeps its own pseudo-element, having nothing
      // to serialise back into the draft.
      removed: 'This clause would be removed.',
    },
    // clauseHeadHtml: the clause lifted into the head
    head: {
      label: 'The clause as it stands',
      // the gap's head (Q1379, Ed 2026-09-15: *gap text should just say (no
      // text here)*): one line under the eyebrow, whatever stands either side
      // — a bracketed literal Ed asked for by name, the one beside T49's
      // `[redacted]` (STYLE T49). It was Q1308's sentence naming the
      // neighbours in their first words, in four variants.
      noText: '(no text here)',
    },
    // commitRowHtml: the row every decision card ends in
    commit: {
      indifferent: 'Indifferent',
      vinDiagonal: 'They matter equally',
      vinPair: 'I can’t split them',
      // the park and the Text's crown card still close by a bin; a judgment
      // has none since Q1500
      binLocked: 'Close — your vote stays on the record',
      chillOn: 'Cooled — this one will not be put at the front of your queue. Press again to allow it.',
      chillOff: 'Not this one, not now — it stays open and stops being the most urgent',
      cast: 'Recorded — choose again to change it',
      submit: 'Submit this vote',
      choose: 'Choose one of the three first',
      // **What silence here will come to mean** (Q1460, Ed 2026-09-18, in the
      // residency room: *a countdown for when not voting will count as a
      // lapse* · *same size and font and place as the "propose edit" text* ·
      // *actually "💤 abstain in hh:mm"*). His words, whole: the glyph names
      // the rule 💤 stands for, and `left` is the time remaining, rounded up,
      // so it never reads 00:00 while there is time to vote.
      abstainIn: (left) => '💤 abstain in ' + left,
      // **And past a day it counts in days** (Q1460 (f), Ed 2026-09-19: *If
      // it's more than a day away, the card should show e.g. "abstain in 3
      // days & hh:mm"*). Whole days, then the hours and minutes left over;
      // the *&* is his own. Under twenty-four hours the line is the hh:mm
      // alone and this template is never reached.
      abstainDays: (n, hhmm) => n + (n === 1 ? ' day' : ' days') + ' & ' + hhmm,
      // **And once the period has run the spot stays and says so** (Q1460
      // (a), Ed 2026-09-18, choosing this over the line going and over *— you
      // can still vote*). A statement about this seat's silence, not a
      // refusal: a late vote is still taken, and casting one clears the line
      // exactly as answering in time always did.
      abstained: '💤 abstained',
      // **The rail says the same thing in the room it has** (Q1460 (e), Ed
      // 2026-09-19: *the rail should only show the clock when it's less than
      // 24 hrs*): inside the last day the entry carries the glyph and the
      // figures alone — the card beside it is where the sentence is — and
      // once the period has run it carries `abstained` like the card.
      abstainShort: (hhmm) => '💤 ' + hhmm,
      // **And the same shape where the wallet is empty** (Q1486 (E), Ed
      // 2026-09-21, widening his own question: *dark, with ✏️ hh:mm countdown
      // (for proposals as well as rule changes, the same anywhere you would
      // want to press the button but you have no ✏️s)*). His words, and the
      // countdown machinery is the abstention clock's — one timer, patching
      // the figures in place, never a render. The moment is the wallet's own
      // next drip as the view serves it.
      dripIn: (hhmm) => '✏️ ' + hhmm,
    },
    // reviseNote: what a locked judgment says for itself
    revise: {
      you: 'You ',
      voted: 'voted',
      shiftedTail: ' You cannot change it, because it was not a vote about this text.',
    },
    // draftFaceHtml: the face on a rationale being written
    draftFace: {
      signed: 'This is how your reason will reach everybody else: with your name on it.',
      sealedLead: 'This is how your reason will reach everybody else: with your name off it',
      forever: ', permanently.',
      untilClose: ' until the closing record.',
    },
    // laneBoxHtml: the editing surface's controls and placeholder
    fmt: {
      bold: 'Bold (the markdown is **like this**)',
      italic: 'Italic (the markdown is *like this*)',
    },
    whyPlaceholder: 'We should change this because…',
  };

  // ---- the session surface (session.js) ------------------------------------
  // The charter column, the margin rail, the composer, the records and the
  // clock. Keyed by the renderer that speaks each string.
  const session = {
    // the needs-you-queue's own words
    rail: {
      draftTitle: 'Your draft — not proposed yet.',
      yoursInRace: 'Yours, in the race',
      // **what the entry says for a few seconds after the press** (Q1485 (A),
      // Ed 2026-09-21: *Close, and say so*). The card has just collapsed onto
      // its clause, so this is the only thing on the surface saying the
      // proposal went out; it settles to the one-line `yours` form after it.
      justProposed: 'Proposed — the members are deciding',
      noReason: 'no reason given yet — say what this is for',
      placesOf: (n, of) => n + ' of ' + of + ' places',
      // the `task-sheet`'s bar on a phone (Ed, 2026-09-24): beside the most
      // urgent entry's own title, how many more the sheet holds
      sheetMore: (n) => '+' + n + ' more',
      // a live race's tooltip (Q1200): it wants your vote while the router
      // holds a pair for you on it — voted on or not — and says you have
      // voted only once nothing is left to ask
      wantsVote: 'wants your vote',
      votedStillRunning: 'you have voted on this — it is still running',
      stillDeciding: 'still deciding — click to change your mind',
      deadlocked: (judges, comparisons) => 'Deadlocked — ' + judges +
        ' people can’t agree on a proposal even after ' + comparisons +
        ' votes. Can you propose something everyone will agree on?',
    },
    // the room's side of a park (SURFACE E36, E37; Ed, 2026-09-09, Q1015):
    // the membership passed a change and the Founder has not answered. The
    // ⏳ card's one sentence, the sentence a race waiting behind that park on
    // the same clause wears instead, and the author's own line — Ed's words
    park: {
      awaiting: 'Awaiting assent from the Founder 🛡️',
      blocked: 'Waiting on the Founder’s answer about another change to this clause 🛡️',
      yours: 'Yours · passed — awaiting the Founder 🛡️',
    },
    // a proposal of yours the text moved under (SURFACE E38; Ed, 2026-09-14,
    // Q170): the clause it rewrote was replaced, and it could not be carried
    // across to the new wording. It is out of every race and held for you
    // until you re-make it here — which keeps the edit it already cost, and
    // its place — or withdraw it, which gives the edit back. The card's
    // sentence, its rail line, and the right-hand act; the 🗑️ beside it keeps
    // the withdrawal's own words (`row`).
    // **and the ground shift says what happened** (SURFACE E16). The server's
    // `shifted` is a flag — *a judgment of mine locked by a ground shift* —
    // and this is the rail entry's tooltip, as the fixture has always
    // supplied it. It names no candidate because the view does not carry
    // which one was adopted, only that this wording is no longer the one you
    // judged.
    shifted: 'The wording was changed here after you voted, so your vote was about a wording that no longer exists.',
    stranded: {
      note: 'The document changed here, and your proposal could not be carried across to the new wording.',
      cap: 'Yours · the text moved under it',
      remake: 'Re-make it here — write it against the clause as it now stands, and propose it again',
      // …and the tail the composer's own commit wears while that draft is the
      // one being written: it re-makes the proposal you already have, so there
      // is nothing left to pay and an empty wallet cannot stop it
      keepsCost: ' — it keeps its place and the edit it already cost',
      // …and the same fact one step earlier (Q1463, Ed 2026-09-18: *follow the
      // paragraph, and refuse if lost*): a draft you have **not** proposed
      // yet, whose clause an adoption replaced while you were writing. Your
      // words stay in the lane — nothing typed is ever discarded — but the
      // site has no paragraph left to stand against, so it cannot go out until
      // it is written against what now stands.
      drafted: 'The document changed here, and your draft could not be carried across to the new wording — write it against the clause as it now stands.',
    },
    // **what a draft's card says when its press sent nothing or came back
    // refused** (Ed, 2026-09-19: *yes*, move them — they were five literals in
    // live.js, the first of them in three copies). Two ways the text can have
    // moved under a draft — the page's own check before the press (Q1463) and
    // the host's stale-version answer after it — read as one sentence, because
    // to the member they are one event; the verb follows the act, ✏️ propose
    // or ✒️ amend.
    refusal: {
      movedPropose: 'The text moved while you were writing — your draft is kept; read the new wording and propose again.',
      movedAmend: 'The text moved while you were writing — your draft is kept; read the new wording and amend again.',
      // **and what a selection across an open card is told** (Q1492): a
      // selection dragged over a card sees the blocks on either side of it
      // and none of the ones beneath, so it is not one run and cannot be one
      // place. The draft already there is untouched, and this says so.
      crossesCard: 'That selection runs across an open card, so it is not one place — close the card, or select the paragraphs on one side of it.',
      // …and the backstop under it: two places over the same lines is a
      // patch the document cannot take, and the press sends nothing.
      overlapping: 'Two of the places you have changed cover the same lines — discard one of them and propose again.',
      notProposed: (reason) => 'That could not be proposed: ' + reason + '.',
      notAmended: (reason) => 'That could not be amended: ' + reason + '.',
      noAnswer: 'the server did not answer',
    },
    // the gap a draft stands in, named for the rail and the editing head
    gap: {
      atStart: 'A new clause at the start',
      atEnd: 'A new clause at the end',
      after: (words) => 'A new clause after: ' + words,
    },
    // the sealed record and the Founder's amendment card
    record: {
      amended: 'The Founder amended this',
      founder: 'The Founder',
      replaced: 'the text it replaced',
      ok: 'OK',
      okTitle: 'It leaves your margin and stays in the record',
      // **The quorum counts who preferred it** (Q1439, ruling a): the middle
      // clause is the count the floor was read against, and the first stays
      // the count of everybody who voted, whichever way — the two are
      // different numbers now, and the record says both. `approvals` is
      // omitted where the view does not carry it, which is every document
      // until the engine branch lands, and the line then reads as it always
      // did.
      // **And how many never answered** (Q1452, Ed 2026-09-18): the 👥 clause
      // goes on naming the whole membership — *(5 of 10)* — while a proposal
      // carries on two approvals, because 💤's period takes a silent member
      // out of the group the quorum is read against. The clause stays as it
      // is and the outcome card says the rest: how many people did not answer
      // in time. Omitted at zero and where the record does not carry the
      // number at all — a decision nobody ran out of time on has nothing to
      // report, and neither has one taken before the rule existed.
      counts: (judges, roster, floor, yoursLine, approvals, abstained) =>
        judges + ' of ' + roster + ' weighed in · ' +
        (approvals === null || approvals === undefined ? '' : approvals + ' preferred it · ') +
        (abstained ? abstained + ' did not answer in time · ' : '') +
        'quorum was ' + floor + ' · ' + yoursLine,
      youSaid: (verdict) => 'you ' + verdict,
      youNever: 'you never voted on this',
      // Ed's words (Q1456, 2026-09-18), one phrase for a proposal the clock
      // cut off, a wording and a motion alike
      undecided: 'Proposal ran out of time',
      decided: 'Decided',
      capped: 'the ranking maths stopped short on this one; the decision stands',
      // under the head, where the clause no longer reads as the record left it (Q1333)
      changedSince: 'This clause has changed again since.',
      gone: 'This clause has since been removed.',
      // **Why a proposal ended** (Q1440, Ed 2026-09-18): the sentence beside
      // a wording the room closed before the document did — no answer still
      // to come could have carried it. It stands where the Founder's
      // *Proposal refused by ‹name› 🛡️* stands, the two being the only two
      // places an author is told *why* rather than only that the text stood.
      // *Rejected* is the membership's word for it and *refused* is the
      // Founder's (STYLE T8); the verb is *pass*, never *carry* and never
      // *adopted*.
      dominated: 'Rejected — it could no longer pass',
      // **A wording passed at the close before it was put against every rival**
      // (Q1538, Ed 2026-09-25, ruling 7): the wait for rivals is waived when
      // the clock runs out (SPEC §4.6), and the record says how far it got —
      // a count, never a verdict (T12). Under the wording that passed.
      measuredAtClose: (k, m) => 'Passed when the document closed, voted against ' + k +
        ' of its ' + m + (m === 1 ? ' rival' : ' rivals'),
      // **Why a wording showing the higher percentage did not pass** (Q1539,
      // Ed 2026-09-25, ruling 6: *can we say exactly how many members
      // preferred the current text to this?* — the majority's count only).
      // The percentages rank every vote in the race together; a head-to-head
      // majority for the text is what kept it. `m` is everyone who answered
      // the pair, Indifferent included. Under the losing wording.
      rankedBelow: (n, m) => n + ' of ' + m + ' members preferred the current text to this',
      // **One OK per clause** (Q1536, Ed 2026-09-24): a clause with several
      // records owed is one rail entry and one card — its eyebrow, the rail
      // entry's caption and tooltip, the line under a head marked with the
      // net change, the line under a head nothing changed, the label over the
      // list of its records, each row's tooltip, the way back to that list
      // from one of its records, and the OK's tooltip. **Shorter, please**
      // (Ed, 2026-09-25, on the builder's call 10): the fewest words that
      // stay clear.
      foldHead: (n) => n + ' decisions',
      foldCap: (n) => n + ' new decisions',
      foldSince: 'Marked against the text before them',
      foldSame: 'Unchanged: none passed',
      foldList: 'Oldest first',
      foldOpen: 'Open',
      foldBack: 'Back',
      foldOkTitle: (n) => 'All ' + n + ' leave your margin',
      // **what a sealed record's own entry says it is** (Q1493's list, the
      // nh2026 convention 2026-09-20): the rail entry's tooltip, and the
      // caption under the mark. They were four literals in `live.js`, on the
      // road Q1484 and Q1485 walked; the rule is that every string a member
      // can read lives here.
      capAdopted: 'decided — adopted',
      capStood: 'decided — the current text stood',
      capUndecided: 'undecided at the close — the text stood',
      outAdopted: 'adopted',
      outStood: 'retired — the current text stood',
      outUndecided: 'undecided',
    },
    // **a proposal of your own, as its line says it** (Q1493's list): the
    // three faces the caption wears between the press and the race, and the
    // tail a signed one takes. `stranded` and `park` above carry the other
    // two states.
    yours: {
      justIn: 'yours · just in, evidence starting',
      inRace: 'yours · in the race',
      signedTail: ' · signed',
    },
    // the proposal row and the commit titles either side of the ✏️ hold
    row: {
      placesChanged: (n) => (n === 1 ? '1 place changed' : n + ' places changed'),
      discardAll: 'Discard the whole draft — nothing has been spent on it',
      // a card's 🗑️ is its own site's; the row's above is the whole draft's (Q1306)
      discardThis: 'Discard this change — nothing has been spent on it',
      closeNothing: 'Close — there is nothing here to put back',
      broke: 'No ✏️ left — another arrives as the drip accrues',
      holdPropose: 'Hold to propose this',
      inAllPlaces: (n) => ' in all ' + n + ' places',
      signedSuffix: ' — signed',
      editCost: ' — one edit leaves your wallet to pay for it',
      amend: 'Amend the document',
      penCost: ' — it passes at once and costs nothing',
      withdraw: 'Withdraw',
      allPlaces: (n) => ' all ' + n + ' places',
      withdrawCost: ' — the edit comes back in full',
      idle: 'Nothing has changed yet — type in the document to start a draft',
    },
    // the sign control (Q770): whether your name goes on the draft
    sign: {
      anonymousName: 'Anonymous',
      anonLabel: 'Anonymous',
      anonExpLead: 'Nobody is told who proposed this',
      expEver: ' — ever.',
      expUntil: ' until the document is finished.',
      signedAs: (escName) => 'Signed — as ' + escName,
      signedExp: 'Your name goes on it from the moment you propose it, and stays there.',
    },
    // the place-stepper a patch and a multi-site draft share
    nav: {
      prev: 'The place before',
      next: 'The next place',
      placeOf: (i, n) => ' · place ' + i + ' of ' + n,
    },
    // the editing card's own labels
    compose: {
      fieldLab: 'What you are proposing',
      proposedLab: 'What you proposed',
      draftLabel: 'Your draft',
      rivalNote: 'Yours joins the proposals already racing here',
      allPlacesNote: (n) => 'All ' + n + ' places go in as one change',
    },
    // the gutter tabs and the filed pile
    chip: {
      closeThis: 'Close this one',
      openIt: ' — open it',
      theRecord: ' — the record',
      decided: ' — decided',
      gapSection: ' — a section proposed for this gap',
      filedPile: (n) => n + ' decided and filed at this clause — open them',
      // **the grey tab a newcomer sees** (Q1413, Ed 2026-09-17): the questions
      // standing at this clause are not theirs until they have accepted
      // Voting, so the gutter says the document has life in it and asks for
      // nothing. One sentence, in the third person: none of this is about you
      // yet.
      held: 'The membership is deciding this — it is yours to vote on once you accept Voting',
    },
    // **a contents-rail mark is a control** (Q1520, Ed 2026-09-23: *clicking
    // on the icons next to the table of contents should open those cards*):
    // it opens its own entry's card, and its name is the entry's title and
    // what it wants of you — the rail's own words where the rail has them,
    // SURFACE §6's *wants* column where it does not. Filed marks are never
    // in the contents rail (M10), so they have no words here.
    toc: {
      markState: {
        needs: 'wants your vote',
        urgent: 'wants your vote first',
        stuck: 'deadlocked — wants a new proposal',
        weigh: 'asks which of two questions matters more',
        deciding: 'you have voted — it is still running',
        shifted: 'the wording changed after you voted — you will be asked again',
        adopted: 'passed — the text changed here',
        retired: 'rejected — the text stands',
        propose: 'your proposal',
        stranded: 'your proposal — the text moved under it',
      },
      markName: (label, state) => label + (state ? ' — ' + state : ''),
      // the `+n` tally goes to the section, as the heading does
      more: (n) => n + ' more in this section — go to it',
    },
    // the deadlock card: the reading room and the desk
    dead: {
      headLabel: 'The clause as it stands — and it is still standing',
      fieldLab: (n) => 'Everything in flight · ' + n + ' proposals, oldest first',
      deskLab: '✏️ propose something everyone can agree on',
    },
    // 🛡️ on the Text: the 👑 question and the note on a live race under it
    crown: {
      foot: 'The membership passed this. Until you answer, the clause above stands.',
      close: 'Close — the question stays pending',
      refuse: 'Refuse — the Founder Veto holds it, and the clause above stands',
      accept: 'Accept — a Founder Action passes it now',
    },
    // the salience diagonal
    diag: {
      headLabel: 'This card asks',
      question: 'Which of these deserves more of the membership’s attention?',
      fieldLab: 'The two questions',
      foot: 'This ranks the questions, never the answers — neither text changes either way.',
    },
    race: {
      foot: 'Neither of these has to win — the clause above stands unless the membership comes to prefer one of them.',
    },
    patch: {
      foot: (n) => 'One vote for all ' + n + ' places — choosing here chooses everywhere.',
    },
    insert: {
      headLabel: 'The gap as it stands',
    },
    // the empty clause and the gap block, out of the text flow
    blank: {
      gap: 'Start a new clause here.',
      mayPropose: 'Nothing here yet — start typing to propose the first paragraph.',
      plain: 'Nothing here yet.',
    },
    // what a cast judgment reads back as (the locked card's own sentence)
    verdict: {
      approve: 'approved (recorded as: proposal beats current text)',
      keep: 'kept the current text',
      matters: (name) => 'said ' + name + ' matters more',
      theFirst: 'the first',
      theSecond: 'the second',
      preferred: (quoted) => 'preferred ' + quoted,
      equal: 'said they matter equally',
      indifferent: 'indifferent',
      skipped: 'skipped (recirculates with decay)',
    },
    // the session-clock's ladder (Q466/Q471); the date in words is
    // `grammar.longWhen`'s, through cards.js's `longDay`
    clock: {
      closed: (dateWords) => 'Closed ' + dateWords,
      closingNow: 'closing now',
      daysLeft: (d) => d + ' days left',
      hoursLeft: (h) => h + ' hours left',
      hmLeft: (h, mm) => h + 'h ' + mm + 'm left',
      minutesLeft: (m) => m + ' minutes left',
      underTen: 'under 10 minutes left',
    },
  };

  // ---- the page's own script (session-view.html) ---------------------------
  // The founder surface, the band, the doors and the birth. Pass 1 of the
  // page move (Ed, 2026-09-05, item 4: two passes): the untangled strings.
  // The big checker-read tables keep their key structure in the page; where
  // only their sentence values moved, the reference stands in the value slot.
  // **What (x of y) looks like, once** (Q1439, ruling m) — the numbers that
  // follow a share of the membership. It is a local const rather than a
  // second entry under `val` so that `val.quorumPct` and `val.quorumTail`
  // cannot drift: the bracket, the word and the spacing are written here and
  // nowhere else. Missing numbers print nothing, which is what a blind card
  // with no number typed yet has to show.
  const quorumTail = (n, e) => (n === null || n === undefined || e === null || e === undefined
    ? '' : ' (' + n + ' of ' + e + ')');
  const page = {
    // **A rule change's rail title is the rule's glyph and its value, old →
    // new** (Q1523, Ed 2026-09-24: *⏱️ 10 → 5 minutes*, *👥 6 → 8*, *⏰ Sun
    // 17:10 → never*), the value alone where nothing stood before it (Q1523
    // (b)). One short phrase per value, the words the
    // clause sentence already carries wherever it has them; the glyph says
    // which rule, the mark and the card say who changed it and how it ended.
    // Read by the page's `railRuleTitle`, one value at a time.
    railVal: {
      title: (text) => grammar.railTitle.quote(text),
      slug: (slug) => slug,
      never: 'never',
      // the count alone (Q1523 (e), Ed 2026-09-24): the membership moves, so
      // *of 12* would print today's number against an older change
      quorumCount: (n) => String(n),
      quorumShare: (pct) => pct + '%',
      authorship: { anonymous: 'never named', anonymousElective: 'named by choice',
        sealed: 'named at the close', sealedElective: 'at the close, or by choice',
        public: 'named from the start' },
      judgments: { never: 'votes never shown', after: 'votes shown at the end' },
      chamber: { closed: 'members only', link: 'anyone with the link', public: 'public' },
      rate: (n, unit) => n + ' ' + (n === 1 ? { days: 'day', hours: 'hour', minutes: 'minute' }[unit] : unit),
      lapse: (spell) => spell,
      removal: { consent: 'all agree, them included', assembly: 'all others agree', proposal: 'a vote' },
      admission: { assembly: 'all agree', proposal: 'a vote', pen: 'any member invites' },
      applications: { apply: 'anyone may apply', invite: 'invitation only' },
      // a running motion has no *old* on its title: the rule stands beside it
      to: (now) => '→ ' + now,
    },
    // who removed you, and the register's departure lines
    departed: {
      byFounder: (day) => 'The Founder removed you from this document on ' + day + '.',
      bySelf: (day) => 'You left this document on ' + day + '.',
      byMembers: (day) => 'The membership removed you from this document on ' + day + '.',
      someone: 'a member',
      lineSelf: (who, day) => who + ' left on ' + day + '.',
      lineMembers: (who, day) => 'The membership removed ' + who + ' on ' + day + '.',
      lineFounder: (who, day) => 'The Founder removed ' + who + ' on ' + day + '.',
    },
    // 💤's change line names the members the change returned (SURFACE Y26,
    // Q902): `names` is already `listOf`-joined and escaped by the caller
    lapseReturned: (names, n) => names + (n === 1 ? ' is' : ' are') +
      ' active again — ' + (n === 1 ? 'their membership had' : 'their memberships had') +
      ' lapsed under the old rule.',
    // 📝's value slot: the column, counted — and, before anything is written,
    // **the empty document's placeholder** (Q518 (c), Ed 2026-08-29): grey,
    // not document text, drawn out of the flow (`.prose.empty.writeready::before`
    // reads it off `data-placeholder`), never seen by `proseText()`, gone for
    // good at the first keystroke. The first line suggests the shape of a
    // charter; the invitation beneath it says how to begin. Ed's wording to
    // come; the shape is the point.
    prose: {
      // two paragraphs of lorem ipsum for now (Ed, 2026-09-17: the sentence
      // about pressing 📝 and typing had become misleading)
      writeready: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor ' +
        'incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud ' +
        'exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\n' +
        'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat ' +
        'nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui ' +
        'officia deserunt mollit anim id est laborum.',
      nothingYet: 'Nothing written yet.',
      paragraph: 'paragraph',
      heading: 'heading',
      below: ', below.',
    },
    // the riding tab's tooltip and the pre-🍾 prose row
    // **the constitution section's heading reads Rules** (Q1516 (5), Ed
    // 2026-09-23): groups drafting a constitution read *the constitution of
    // the constitution*; *Settings* was offered and set aside as reading like
    // preferences. The band's heading and the contents rail's entry both;
    // `constitution-section` and `#cs-constitution` stay the code's names
    rulesHeading: 'Rules',
    // the stranger's door while the founding is still under way (door.js's
    // `HOLDING.drafting`), in the same word
    rulesDrafting: 'The rules are being drafted.',
    ride: {
      writing: 'you are writing; press to stop',
      pressToWrite: 'press to write',
      readOnly: 'read only',
      textDash: 'Text — ',
    },
    proseRow: {
      discard: 'Put the column back to the text as it stands',
      save: 'Save the text — the document begins from whatever stands here',
      saved: 'Saved — the document begins from whatever stands here',
    },
    // ❌'s picker and the doors' shared fallbacks
    door: {
      nobodyToRemove: 'There is nobody to remove.',
      choose: 'Choose somebody to remove…',
      invitedNotHere: ' — invited, not yet here',
      anonymous: 'Anonymous',
    },
    refuseSet: (reason) => 'That could not be set: ' + reason + '.',
    // every other refusal, under the card that sent it (Q1330, SURFACE Y25)
    refused: (reason) => 'That was refused: ' + reason + '.',
    // **The one module sentence the page says in its own words** (Q1486 (E),
    // Ed 2026-09-21). The engine refuses a press an empty wallet cannot pay
    // for with *insufficient ✏️ for the stake (§7)* — a § pointer, which
    // `plainRefusal` already strips, and *stake*, which is engine vocabulary
    // (STYLE §1: the surface says what a thing costs, never what it stakes).
    // The page's own controls are dark before that refusal can be reached now
    // (`walletBroke`), so nobody should meet it; it is kept in the member's
    // words for the day a road reaches it that nothing here foresaw.
    noPencil: 'you have no ✏️ left to spend on this',
    // **the two rails' names** (Q1394 (c), Ed 2026-09-18): what a reader
    // navigating by landmark hears for the contents rail and the task rail,
    // and the tooltip on the narrow drawer door that opens each — one string
    // per rail, so the name heard and the door tapped cannot drift apart
    rails: {
      contents: 'Contents',
      tasks: 'What needs you',
    },
    // the host's two flags (Q1345, Q1346; Ed, 2026-09-12): the announced
    // pause, drawn as a modal over the whole page while a deploy runs, and
    // the red flag on a document whose saves the store rejects
    host: {
      paused: 'This document is paused while we do some quick database maintenance.',
      pausedWait: (minutes) => (minutes <= 1 ? 'It should be back in about a minute.'
        : 'It should be back in about ' + minutes + ' minutes.'),
      pausedOver: 'Nearly there — hold on a moment longer.',
      stalled: 'This document cannot save changes at the moment. Nothing you do here will be kept.',
      // **the page has lost the host** (Q1505, Ed 2026-09-23: warn before
      // anybody acts, never after): a red bar along the top, the page still
      // readable, the cause added only where the page knows it
      reconnecting: 'Reconnecting…',
      offline: 'Your device is offline.',
      notAnswering: 'docs.vote is not answering.',
      // every commit's tooltip while the bar stands
      held: 'Waiting to reconnect — what you have typed is kept',
    },
    // the wire did not answer, or answered with a status and no sentence
    noAnswer: (status) => (status ? 'the server answered ' + status : 'the server could not be reached'),
    binPutBack: 'Put it back as it stands',
    // 👑/📯 in the topbar
    founderMark: {
      crowned: 'Some of the rules are reserved: changing them needs the founder’s assent',
      none: 'The Founder reserves nothing — no special part in the document',
    },
    // **The lockline tells the truth about who set it** (Q510 (a), Ed
    // 2026-08-21): the line under the value on a settled card. It had said
    // *Set by the founder when the document was made* on every rule, the ones
    // the room decided by consent included, and the *when* survives only
    // where it is true. Three surfaces print the pair — the member's card,
    // the stranger's door and the shared settled body's own fallback — which
    // is why it is one entry rather than three spellings (issue #19).
    lockline: {
      members: 'Decided by the members.',
      founder: 'Set by the founder when the document was made.',
    },
    // 📍's verdict fragments, composed around the bold address
    slugNote: {
      // why the ✒️ is dark on an address that fails the grammar; one
      // character is enough (Q1288, Ed 2026-09-08)
      illegal: 'Lower case, digits and hyphens',
      taken: ' is taken.',
      free: ' is free.',
      suggested: 'Suggested from the title — ',
      takenSo: ' is taken, so this one is ',
    },
    // 🖼️'s four refusals, said in the uploader's own box. Written inline in
    // `wirePicDrop` and unreadable until 2026-09-17: nothing rendered the
    // `.picnote` they were written into, so every refused file closed the
    // file dialog and left the card exactly as it was. They are refusals and
    // not helper text — the drag-note and the what-nothing-means paragraph
    // Ed's card review took off this card (Q1165) stay gone, and the box
    // says nothing until a file is turned away.
    picNote: {
      notImage: 'That is not a picture.',
      tooBig: 'That picture is too big to open here.',
      unreadable: 'That picture could not be opened.',
      tooHeavy: 'That picture will not compress small enough — try a simpler one.',
    },
    // the settings cards (CARDS): two labels each (Q1209, Q331 (b), Ed
    // 2026-09-07) — `t` the ask a card wears while it is outstanding, an
    // imperative or a question (STYLE T2); `n` the noun it wears once settled,
    // the pile at the head of the document reading as rules. `labelOf` in
    // setup.js is the one reader. The doors and 📝 have one label, having no
    // settled state (a door) or never being a task (K31). Then the
    // aggregation rules and the settled strip's takes-lines. Fixture values
    // (result, dist…) stay with the fixture.
    cards: {
      title: { t: 'Name the Document', n: 'Title' },
      myemail: { t: 'Enter Your Email', n: 'Your Email' },
      slug: { t: 'Choose the Link', n: 'Link' },
      admission: { t: 'How Does Somebody Join?', n: 'Admissions',
        rule: 'Each member says the <b>cheapest</b> admission they would accept, and the document takes the dearest — one member who wants everyone asked keeps everyone asked.',
        takes: 'The document takes the dearest' },
      invite: { t: 'Invite a Member', n: 'Invites' },
      remove: { t: 'Remove a Member', n: 'Removals' },
      hat: { t: 'Is the Founder a Member?', n: 'Founder’s Membership' },
      applications: { t: 'Can Strangers Apply?', n: 'Applications',
        rule: 'Each member says the <b>most open</b> door they would accept, and the document takes the least open of them — one member who wants invitation only keeps it so.' },
      myname: { t: 'Choose Your Name', n: 'Your Name' },
      mypic: { t: 'Choose Your Picture', n: 'Your Picture' },
      // 🌂 (Q1400, Ed 2026-09-16): a door on your own row, one label in every
      // state, and its body is the warning
      leave: { t: 'Leave the Membership',
        body: 'If you give up your membership you may not be able to rejoin: the membership will have to decide whether to re-admit you. Leaving is immediate, and nobody has to agree.' },
      text: { t: 'Text' },
      ending: { t: 'When Does It End?', n: 'Ending',
        routeNote: 'What this takes depends on what you write. A different date is a proposal ✏️ like any other. <b>Never</b> — no end date at all — needs every member to agree, because every change made so far was made under a promise that the document would seal on a date and be signed.',
        rule: 'Each member says when they want it to end, and the document takes the <b>latest</b> answer — <b>never</b> being later than any date — so nobody is cut off before they were ready.',
        takes: 'The document takes the latest' },
      quorum: { t: 'Choose the Quorum', n: 'Quorum',
        rule: 'Each member says the lowest they will accept, and the document takes the highest.',
        takes: 'The document takes the highest' },
      authorship: { t: 'Are Proposals Anonymous?', n: 'Anonymous Proposals',
        rule: 'This one is about privacy, so it runs the other way: the document takes the <b>most private</b> answer, and one member who wants to stay unnamed keeps everybody unnamed.',
        takes: 'The document takes the most private' },
      judgments: { t: 'When Are Votes Revealed?', n: 'Vote Reveal',
        rule: 'Also about privacy, so the <b>most private</b> answer wins: one member who wants them kept private keeps them private.',
        takes: 'The document takes the most private' },
      rate: { t: 'Set the Proposal Rate', n: 'Proposal Rate',
        rule: 'Each member says the <b>most generous</b> they would accept, and the document takes it.',
        takes: 'The document takes the most generous' },
      chamber: { t: 'Who Can See the Document?', n: 'Visibility',
        rule: 'This one is about privacy, so the <b>most private</b> answer wins: one member who wants it kept closed keeps it closed.',
        takes: 'The document takes the most private' },
      removal: { t: 'How Is a Member Removed?', n: 'Removals',
        rule: 'Each member says the easiest they would accept, and the document takes the hardest — one member who wants everybody asked keeps everybody asked.' },
      lapse: { t: 'Do Memberships Lapse?', n: 'Lapsing',
        rule: 'Each member says the shortest gap they would accept, and the document takes the longest — <b>never</b> being longer than any of them — so nobody loses their membership faster than they accepted.',
        takes: 'The document takes the longest' },
    },
    // the applicant's five tasks (APPCARDS): not settings, one label each,
    // moved here from the page unchanged (Q1209's build) because a member
    // reads them
    // **the demo's one-tap seat** (design/DEMO.md Stage 3; Q1535): the
    // stranger's card on the demo document alone, where joining needs no
    // address — a made-up name, the grants already accepted
    strtry: {
      title: 'Try It',
      why: 'Join as a member under a made-up name. No email needed, and you can propose and vote straight away.',
      summary: 'Join in one tap',
      press: 'Join as a member',
    },
    // **the Join card on an open-door document** (issue #36 F1; Q509 (a), whose
    // ruling ended *the Join affordance comes back*): 🤝 yes with 🪪 at ✒️, where
    // arriving is joining — the door's 🪪 card becomes a join, and its link seats
    strjoin: {
      title: 'Join',
      why: 'Anyone with the link may join. Your email is your identity here — the link it sends makes you a member.',
      sent: 'Follow the link to join — the address is your identity here.',
    },
    appcards: {
      apply: 'Apply for Membership',
      appmail: 'Your Email',
      appname: 'Your Name',
      apppic: 'Your Picture',
      apptext: 'Your Application',
      // **the door shut under you** (SURFACE E33, Q901): the sentence the 🪪
      // card wears once 🤝 has shut and before Submit, moved here from the page
      // with the OK that now closes it. `shutTitle` replaces *Apply for
      // Membership* while it stands — the card is news at that point and a
      // title asking for an application would offer one that cannot be made
      shut: 'The rule has changed since you began: this document is now invitation-only, so your application cannot be submitted.',
      shutTitle: 'Applications Have Closed',
      // **and the answer, when it is no** (Q1473, Ed 2026-09-19). A refused
      // application left the surface saying *Submitted — the members are
      // deciding* for ever: nothing on the applicant's page had a word for
      // the one status it can end in badly, and nothing mailed them either.
      // Ed's ruling makes it the ordinary case at 🏛️ — one member's vote
      // against ends the application there and then — so the card says so.
      // **It names nobody and counts nothing**: which members answered, and
      // how, is theirs (§3.5).
      refused: 'The membership did not agree to it.',
      refusedTitle: 'Your Application Was Not Accepted',
      // **…and when it is yes** (issue #29 F2): an admitted applicant still
      // read *Submitted — the members are deciding* above a promise of a mail
      // that had already arrived
      admitted: 'The membership admitted you. The email sent to you is your way in.',
      admittedTitle: 'Your Application Was Accepted',
      // **what an application goes before, by 🪪's price** (issue #29 F3): the
      // ✏️ sentence stood at every price, and *sure enough* is not the words
      // for a vote everybody must agree to (STYLE §1). At ✒️ the door is free,
      // said only before submitting — a submitted application is already in a
      // race opened at the price it met, so nothing is said there
      why: {
        assembly: 'Your application goes before the members as a constitutional proposal (🏛️) — it passes only if every member agrees.',
        proposal: 'Your application goes before the members as a proposal (✏️) — it passes if the membership is sure enough.',
        pen: 'Anyone may join: submitting your application makes you a member straight away.',
      },
      // **what the application holds so far** (Q1366, Ed 2026-09-15): the 🪪
      // card lists the three things a submission carries, each as given or as
      // not yet given, so a ✓ on ✋ 🖼️ 👋 is visibly kept before Submit — the
      // three cards send nothing themselves, and until this list nothing on
      // the surface said what had been kept
      holds: {
        name: 'Your name', picture: 'Your picture', words: 'Your words',
        noName: 'not yet given', noPicture: 'not yet chosen', noWords: 'none — the words are optional',
      },
    },
    // **What a socket says: the symbol, then the verb** (Ed, 2026-08-22:
    // *don't name the item — just have the symbol, larger than in the wallet,
    // and then explain what it is using the verb; keep the language as clear
    // and functional as possible, using verbs and nouns that relate to
    // concrete things on the page*). So no *"The shield."* opening — naming a
    // thing is not explaining it, and the glyph has already said which one
    // this is. Each sentence starts with **who can do what**, and every noun
    // in it is something the reader can point at: the document, the settings,
    // a ✒️ tab, the membership, an address.
    //
    // Held and not-held are different sentences, and the difference is the
    // subject. Holding it, the sentence is about **you** and says what it
    // costs and what comes back. Not holding it, the sentence names **who
    // can** — which answers the question a struck-through tool actually
    // raises, and does it without a word of apology.
    //
    // One table, both channels: the bubble draws it, and the tooltip is the
    // same sentence, so the two can never drift.
    wallet: {
      quillSpending: 'You can name this document, choose its address and verify your email. Each one spends a feather. The last feather stays, and starts a new document.',
      quillSpent: 'You can start a new document.',
      // the one capability the bubble would swallow, so the navigation moves
      // inside it: the link under the 🪶 sentence
      startNew: 'Start a new document',
      proposeHeld: 'You can propose changes to the text. A ✏️ comes back if the membership passes yours, and more arrive as the document runs.',
      proposeNot: 'Members can propose changes to the text, once the document has begun.',
      // the count is the settings this founder's own hand still reaches
      penHeld: (n) => 'You can change ' + n + (n === 1 ? ' setting' : ' settings') +
        ' yourself, without asking anybody. Each setting’s ✒️ tab says whether you can.',
      penNot: 'The Founder can change some settings without asking anybody, where they have kept Founder Actions.',
      shieldHeld: (n) => 'You can refuse a change the membership passes on ' + n +
        (n === 1 ? ' setting' : ' settings') + '. Nothing changes there until you accept it.',
      shieldNot: 'The Founder can refuse a change the membership passes, where they have kept the Founder Veto.',
      voiceNot: 'Any member can propose a constitutional change 🏛️; all members must agree for it to pass.',
      voiceOut: 'You are asking all members to agree to a constitutional change. This comes back when that question settles, or when you withdraw it.',
      voiceHeld: 'You can ask all members to agree to a constitutional change. One question at a time.',
    },
    // the power tabs' titles (T6–T9) and the synthetic cards' titles
    pwTitle: {
      inviteU: 'Can the Founder Invite at Will?',
      inviteA: 'Does the Founder Have a Veto over Invitations?',
      removeU: 'Can the Founder Remove at Will?',
      removeA: 'Does the Founder Have a Veto over Removals?',
      genericU: 'Can the Founder Make Amendments at Will?',
      genericA: 'Does the Founder Have a Veto?',
    },
    synth: {
      anApplicant: 'an applicant',
      // **a rail entry about a person names them, in a sentence** (Q1375, Ed
      // 2026-09-15: *"A Member Has Left" can be "[avatar] [name] has left",
      // and similar with other member-related queue cards. Use [email] if no
      // name chosen*): the face leads the entry, the name — or the address —
      // follows, and the sentence is a sentence, not Title Case (STYLE T1's
      // one exception). The old departure titles named nobody so the walk
      // golden would not gain a string per departure; the walks name one
      // fixed person now, and the fixture its own
      hasJoined: (who) => who + ' has joined',
      admitLead: 'Admit ',
      admitTail: '?',
      released: 'What the Founder Has Laid Down',
      mailGaveUp: 'An Invitation Did Not Send',
      // the departure news cards (SURFACE E31, E32, E40; Q901). Two sentences,
      // because *removed* and *left* are two different things to be told
      departedRemoved: (who) => who + ' has been removed',
      departedLeft: (who) => who + ' has left',
      passedLead: 'Passed: ',
      // a change the Founder's ✒️ made (the pen route) was never put to
      // anybody, so it did not *pass* (Q1514, Ed 2026-09-23): the news card's
      // own phrasing, naming the office, never the person
      founderChangedLead: 'Changed by the Founder: ',
      rejectedLead: 'Rejected: ',
      // the failed-motion news card's own title (SURFACE E41; Q1447). The
      // record's `rejectedLead` states the outcome to the room; this one is
      // addressed to the mover, so it says whose proposal it was — the same
      // difference the departure titles above make, and the same reason the
      // verb stays the neutral one: which hand refused it is the card's
      // sentence to say, not the title's
      heldLead: 'Your proposal did not pass: ',
      anonymous: 'Anonymous',
      // a person whose row has been erased (PRODUCTION.md stage 12, decision
      // 1253): the log still names their seat, the record still holds what
      // they did, and this stands where their name would. The one bracketed
      // stand-in on the surface (STYLE T49; Ed, 2026-09-08, Q1287 (b)): the
      // brackets say *this is not a name*, the word says the record was
      // struck rather than that the person left
      redacted: '[redacted]',
    },
    // the Founder's two powers: the joined verb phrases (Q516i), the nouns
    // the veto sentence names, the option blocks and the release notes. The
    // page keeps each table's key structure (spec-check reads the keys);
    // the words live here.
    pw: {
      phrase: {
        star: { u: 'amend this at will', a: 'refuse proposals that the membership pass' },
        invite: { u: 'invite people at will', a: 'refuse invitations and applications that the membership pass' },
        remove: { u: 'remove members at will', a: 'refuse removals that the membership pass' },
        text: { u: 'amend the text at will', a: 'refuse changes to the text that the membership pass' },
      },
      // **On the decision card the phrase names its setting** (Q1429, Ed
      // 2026-09-17: *from looking at the card text you don't know what setting
      // they're referring to*). The star phrase's *this* is written to stand
      // under the setting's own paragraph, and the card **replaces** that
      // paragraph — so on a card the two verb phrases take the noun below, in
      // the shape `phrase.text` already has. The three settings that name
      // their object already (`text`, and the doors' `invite` / `remove`)
      // keep their own wording on both surfaces.
      amendNoun: (noun) => 'amend ' + noun + ' at will',
      refuseChangesTo: (noun) => 'refuse changes to ' + noun +
        ' that the membership pass',
      may: (parts, aside) => 'The Founder' + (aside ? ' (that’s you!)' : '') +
        ' may ' + parts.join(', and ') + '.',
      mayNotYet: (parts) => 'From the start, the Founder may not ' + parts.join(', or ') + '.',
      mayNot: (phrase) => 'The Founder may not ' + phrase + '.',
      // **A noun that reads in both frames** (Q1429). These were written for
      // one sentence — *a veto over proposals passed by the membership about
      // X* — where a bare *quorum* or *visibility* reads well enough. Since
      // the card's own sentences take them too, each has to survive *amend X
      // at will* and *changes to X*, which want a thing rather than a topic:
      // so the ones that name a rule say so. The doors' two are the acts'
      // (entry 94) and are only ever the veto sentence's.
      noun: {
        title: 'the title', slug: 'the link', text: 'the text',
        ending: 'the ending', quorum: 'the quorum rule',
        authorship: 'the anonymity rule', judgments: 'the vote-reveal rule',
        chamber: 'the visibility rule', rate: 'the proposal rate', lapse: 'the lapse rule',
        removal: 'the removal rule',
        admission: 'the admission price', applications: 'the applications rule',
        invite: 'invitations', remove: 'removals',
        fallback: 'this',
      },
      veto: (has, noun) => 'The Founder ' + (has ? 'has' : '<b>does not</b> have') +
        ' a veto over proposals passed by the membership about ' + noun + '.',
      // (the `opts` table — a paraphrase per power and a grey helper line under
      // each — left with Q1378, Ed 2026-09-15: *option text is not document
      // text* — an option block is the clause sentence `pwLine` writes for the
      // head, held or given, and nothing beneath it)
      chooseThis: 'Choose this',
      chosen: 'Chosen',
      // the two-commit card (Ed, 2026-09-06): a founder holding the pen may
      // decree the pick or put it to the room, so the radio names both, the
      // second glyph being the route's own commit — ✏️ or 🏛️
      chooseOrPropose: (routeGlyph) => 'Choose ✒️ or Propose ' + routeGlyph + ' this',
      chosenOrProposed: (routeGlyph) => 'Chosen ✒️ or Proposed ' + routeGlyph,
      // **What a `reserve` motion says, away from its tab** (Q386, Ed
      // 2026-09-14): a rail subtitle, a deck line and a record title are read
      // with no head over them, so this one names the setting. The 🛡️ half is
      // `vetoLabel`'s own sentence, which already does. The road back closed
      // with Q1404, so nothing on the surface composes one; the sentence
      // survives for the record of one a log already carries.
      amendAtWill: (noun) => 'The Founder may amend ' + noun + ' at will.',
      // the four read-only notes (*The Founder holds this…*, *Given up…*)
      // went with Ed's card review round 3 (2026-09-05, 52/53): a tab with
      // nothing to set is its head sentence and a close-only OK
      // …and the three tails stand alone under the founder's *given* block
      // since Q1378 took the helper line they used to follow
      notes: {
        // (*the road back is the members’ to give* until Q1404 closed it)
        oneWayTail: 'One way — it cannot be taken back.',
        delegatesTail: 'Neither power would be left, so it hands the question to the membership straight away.',
        atBeginTail: 'It takes effect when the document begins.',
        vetoNeedsPen: 'A veto can only be held where the Founder still amends it at will — take back the ✒️ first.',
        opensWithValue: 'Opens once this setting has a value.',
        revisable: 'Revisable until the document begins. Giving both up hands the question to the members — delegation is exactly the state of holding neither.',
      },
    },
    // a settled motion's record card (Q942) and the before/after pair (Q1167)
    motionRec: {
      gone: 'This record is no longer on the document.',
      passed: 'Passed',
      rejected: 'Rejected',
      // a ✒️ change was put to nobody, so it did not pass (Q1514, Q1522 (1))
      changedByFounder: 'Changed by the Founder',
      // a Founder's 🛡️ refusal: *refuse* is the Founder's word, *reject* the
      // membership's (STYLE T8; Q1526 (a), Ed 2026-09-24)
      refusedByFounder: 'Refused by the Founder',
      // the labels of the record's second box (Q1522 (3), (4), Ed 2026-09-24)
      previousRule: 'Previous rule',
      rejectedProposal: 'Rejected proposal',
      // …and on a record the Founder's 🛡️ refused, its box says so (Q1526
      // amended, Ed 2026-09-24; STYLE T8)
      refusedProposal: 'Refused proposal',
      // *the Founder*, never *the reserve* — the engine's word (Q386's follow-up,
      // Ed 2026-09-14); the one-power path says the same
      reserveReturned: (what) => 'The membership returned ' + what + ' to the Founder.',
      // the both-powers motion's own title, the record's line before it settles
      returnsTitle: (what) => 'Returns ' + what + ' to the Founder',
      reserveKept: (what) => 'The membership kept ' + what + ' with the membership.',
      titleNoun: 'the document’s title',
      ruleNoun: 'this rule',
      keptLead: 'The membership kept ',
      keptAsStoodWas: ' as it stood: ',
      keptAsStood: ' as it stood',
      // the two provenance labels, and the only two (Q1188, Ed 2026-09-05):
      // one wording for a founding choice and a later amendment alike
      provPen: 'Chosen by the Founder ✒️',
      provMembers: 'Chosen by the membership',
      // a proposal that passed without changing anything (Q1348 (b), Ed
      // 2026-09-14): what it asked for was already the rule by the time it
      // settled, and the record says which hand had got there first
      mootPen: 'The Founder ✒️ had already set this rule, so nothing changed.',
      mootMembers: 'Another proposal had already set this rule, so nothing changed.',
    },
    // **A motion of yours that failed** (SURFACE E41; Q1447, Ed 2026-09-17:
    // *someone that proposes a motion should get an acknowledgement task if
    // it fails*). Three sentences, one per way a proposal can end without
    // carrying, on the card the mover alone is served. A proposal on a rule
    // reads the record's own body instead — the dateline and the two blocks
    // — so these are the doors' (✉️ ❌), where nothing files a record.
    // The verb is the actor's (STYLE T8): *refuse* is the Founder's word,
    // *reject* the membership's. The third is neither, because nobody
    // decided anything — the proposal never reached the room, and the
    // sentence says where the ✏️ went, which is the whole of what the mover
    // has lost track of.
    heldNews: {
      membershipRejected: (what) => 'The membership rejected your proposal: ' + what + '.',
      founderRefused: (what) => 'The Founder refused your proposal: ' + what + '.',
      couldNotBePut: 'Your proposal could not be put to the membership, and your ✏️ is back in your wallet.',
    },
    // the Proposals preamble (Y21): the gates' fragments, composed
    preamble: {
      beforeBegin: 'When the document begins, members may propose changes to rules and vote on proposals.',
      voteOnly: 'Members may vote on proposals.',
      voteWhenDecided: 'Members may begin voting on proposals when all the rules have been decided.',
      proposeAtBegin: ' They may propose changes to rules when the document begins.',
      proposeLead: 'Members may propose changes to rules ',
      onceAnswered: 'once they have answered the questions the Founder delegated',
      asArrive: 'as soon as they arrive',
      andVote: ', and may vote on proposals.',
      voteTail: '. They may begin voting on proposals when all the rules have been decided.',
      passOrdinary: 'A proposal ✏️ passes once it is preferred by enough of the membership, and by more than prefer the current text.',
      passConstitutional: 'A constitutional proposal 🏛️ passes only when all members agree.',
    },
    // 👥's rule, in Ed's own words (Q1439, ruling t, 2026-09-18: *A proposal
    // cannot pass until it is preferred by at least 50% of the membership
    // (5 of 10).*). It read *At least 50% (5 of 10) of the membership must
    // prefer a proposal before it can be adopted* for a day (ruling p): the
    // verb is **pass**, STYLE T8's word and not *adopted*, and the emphasis
    // sits on the bar rather than on the membership. The quorum counts the
    // members who prefer the proposal to the current text, so the sentence
    // says *preferred by* rather than *voted on by*: a vote against no longer
    // helps a proposal reach its quorum.
    //
    // **The numbers follow the whole share** (ruling m), which is why `share`
    // takes two pieces rather than one: the percentage — or the number's own
    // box, which is how it stands inside the clause on the founder's card, the
    // member's answer card and the composer's lane (Q1137) — and then the
    // `(x of y)` that follows *of the membership*. `val.quorumPct` is still
    // the one writer of a share where a share is printed whole.
    quorumRule: {
      share: (share, tail) => 'A proposal ✏️ cannot pass until it is preferred by at least ' +
        share + ' of the membership' + (tail || '') + '.',
      count: (n) => 'A proposal ✏️ cannot pass until it is preferred by at least ' + n + ' members.',
    },
    // **👥 is the one card that says what its number comes to** (Q1490, Ed
    // 2026-09-21 → why: R-139), a deliberate exception to Q1439 ruling u,
    // which took the meaning line off every card. The scale runs 1 to 100 now
    // and both of its ends need a sentence the number does not carry: above
    // half, how few can stop a proposal; below the seconder, that two is the
    // floor whatever is asked for. One is printed at a time and only once a
    // number has been typed — a blind card shows nothing it would come to —
    // and neither is printed in a membership of one, where every quorum is
    // the whole of it. Their one home is here; `quorumNote` in setup.js
    // chooses between them and every surface repaints that in place.
    quorumStop: (k) => 'With this quorum, ' + (k === 1 ? 'one member' : k + ' members') +
      ' preferring the current text can stop a proposal.',
    quorumFloorMin: 'The minimum quorum is 2: the author and one other member.',
    titledLead: 'The document is titled ',
    // the 📧 clause in the birth tab left open once the document exists
    // (issue #38 F4): the text typed here is no longer sent, so it says so
    birthMade: (slug) => 'This document now lives at docs.vote/d/' + slug +
      '. What is typed here no longer reaches it.',
    // the card value lines (VALUE) — the label-vocabulary strings that MVAL
    // keys on stay in the page until pass 2 moves that cluster whole
    val: {
      blocks: (n) => n + ' blocks',
      startsEmpty: 'Starts empty — the membership writes it',
      nothingYet: 'Nothing yet',
      notNamed: 'Not named yet',
      verifiedTail: ' · verified',
      checkInbox: 'Check your inbox',
      notGiven: 'Not given yet',
      chosen: 'Chosen',
      initials: 'Your initials',
      fixedNoEnd: 'Fixed — no end date to rise towards',
      risingFrom: (n) => 'Rising from ' + n + '%',
      quorumOf: (n, e) => n + ' of ' + e,
      // **Every share of the membership is followed by the numbers** (Ed,
      // 2026-09-17, Q1439 ruling m: *wherever we show a % of membership, we
      // should have (x of y) after showing the actual numbers*). `quorumPct`
      // is the one writer of a share, so the rule sentence, the clause, the
      // strip's taken line and the composer's lane cannot spell it three
      // ways; `quorumTail` is the same numbers alone, for the cards, whose
      // own box repaints them in place while the number is being typed.
      quorumTail,
      quorumPct: (pct, n, e) => pct + '%' + quorumTail(n, e),
      oneEvery: (phrase) => 'One every ' + phrase,
      // the spell arrives worded — *7 days*, *36 hours*, *90 minutes* — by
      // the module's `spellWords`, never as a bare day count (Q1321)
      lapseAfter: (spell) => 'After ' + spell + ' without logging in',
      // (the gates' *Open* / *Waiting on …* lines left with Q1374: a rail
      // entry carries a subtitle only on a motion)
      begun: 'Begun',
      notBegun: 'Not yet begun',
      closed: 'Closed',
      untitled: 'Untitled',
    },
    // the member's answer card: the ask line and the readback frame
    said: (s) => 'You said: “' + s + '”',
    // …and on the Founder's own answer card, which hat is answering (Q1300,
    // Ed 2026-09-10: *a blue box that says something like "This is your
    // answer to this question as a member"*)
    asMember: 'This is your answer to this question as a member.',
    ask: {
      lowest: 'The lowest you will accept',
      latest: 'The latest you will accept',
      most: 'The most you will accept',
      mostOpen: 'The most open you will accept',
      shortest: 'The shortest you will accept',
      cheapest: 'The cheapest you will accept',
      easiest: 'The easiest you will accept',
      mostGenerous: 'The most generous you will accept',
    },
    penWait: 'Founder Actions ✒️ are waiting in your tasks — accept them and this turns.',
    doorEmpty: {
      invite: 'Nobody has been invited yet.',
      remove: 'Nobody is proposed for removal.',
    },
    // **The Membership subsections** (F21; Q1557, Ed 2026-09-26): an
    // invitation sent stands under *Members*, and every vote still running on
    // letting somebody in — a member's proposal to invite and a stranger's
    // own application alike — under *Applications for Membership*
    memHeads: {
      members: 'Members',
      applications: 'Applications for Membership',
      lapsed: 'Lapsed',
      removal: 'Proposed for removal',
      // everybody who has left, each with the day in a pill (Q1557 (e))
      alumni: 'Alumni',
    },
    // the grey row a subsection that carries a control stands on when empty
    memEmpty: {
      applications: '(no applications at the moment)',
      removal: '(nobody proposed for removal)',
      alumni: '(nobody has left)',
    },
    // **A tag says only what its heading does not** (Q1557 (c)): *invited*
    // on an invitation sent and not yet followed, *email failed* in its place
    // on the Founder's page where the mail gave up (E34), *lapsed* only under
    // *Proposed for removal*, and *you* on your own row
    memTags: {
      invited: 'invited',
      emailFailed: 'email failed',
      lapsed: 'lapsed',
      you: 'you',
    },
    theFounder: 'The Founder',
    crownHand: 'The founder’s own hand — a Founder Action ✒️, not a proposal',
    // the founder's own rationale lane on a settled card: the field's label,
    // and the placeholder in the lane beneath it
    whyChangingLabel: 'Why are you changing this?',
    whyChangingPlaceholder: 'I am changing this because…',
    clerkNoPencil: 'You are not a member, so there is no ✏️ for you to spend — this one is yours to set.',
    nothingToPut: 'That could not be proposed: nothing is chosen on this card.',
    // **a number a field will not take** (Q1486 (G), the nh2026 convention
    // 2026-09-20): the field's own min and max, said once, where the module's
    // validator prose — *dripMinutes must be …* — used to land on the card
    outOfRange: (lo, hi) => 'That has to be a whole number between ' + lo + ' and ' + hi + '.',
    // the composer's free sentences. The lane pairs that are still the page's
    // are ⏰'s and 💤's *never* rungs alone, beside MVAL's cluster: since
    // issue #19 every lane whose rung the clause table already has a sentence
    // for — 🪪 🥾 👤 ⚖️ 🌍 🤝 — draws it from RULES above.
    composeNote: {
      redirect: 'Every link the document has ever had keeps working — a change leaves a redirect behind.',
      neverNeedsAll: 'Taking the end date away needs all members to agree — every change made so far was made under a promise that the document would seal on a date and be signed.',
      removalSeen: 'Whoever it is will see the proposal — nobody is removed in secret.',
    },
    // a constitutional motion's consent card: the question and the answers
    // **The consent card is three clause blocks** (Ed's card review round 3,
    // 2026-09-05, Q1182; STYLE T48): what stands with *Keep this*, what is
    // proposed with *Prefer this*, and *Abstain* on its own. The explanations
    // of the consent rule, the counts and the blind note all went with it.
    consent: {
      // (*Keep this / Kept* and *Abstain* left with Q1377, Ed 2026-09-15:
      // *Keep should be Prefer* — the standing text is a peer since Q1362,
      // so its radio reads like its rival's, and the textless block's
      // names the act as the race card's does, *Indifferent*)
      // an invitation or a removal has no rule sentence, so its blocks say
      // what the membership would be either way
      staysAsIs: 'The membership stays as it is.',
      joins: (name) => name + ' joins the membership.',
      staysIn: (name) => name + ' stays in the membership.',
      leaves: (name) => name + ' leaves the membership.',
      removeSelfWhy: 'Whether <b>you</b> leave the membership. Under this document’s rule that is decided by <b>everyone but you</b> — you see it running, and your answer is not asked.',
      removeSelfCount: (judged, others) => judged + ' of ' + others + ' have answered. One refusal keeps you in.',
    },
    // 🍾's power table (Q1181, Ed 2026-09-05; one row per setting since
    // Q1195 (c), Ed 2026-09-09): the two column heads name the powers in the
    // surface's own words, and each cell's glyph toggle carries one of the
    // three tooltips — kept, laid down, or already given on its own tab
    begin: {
      keptTip: 'Kept — press to lay it down at the start',
      downTip: 'Laid down at the start — press to keep it',
      givenTip: 'Already given up on its own card — it comes back only there',
    },
    // 🥂's line about whose names the record reveals. **The record says who
    // is named; the card reads the record** (Q770, entry 31): a sentence
    // derived from the rung alone is wrong the moment one person signs, so
    // live the count comes from the field entries the server has already
    // passed through the one reveal rule — the first five. The fixture has no
    // record and keeps a plain sentence from the standing rung, the elective
    // rungs riding their base (Q767) — the last three.
    closingNames: {
      nothing: 'Nothing was proposed, so the record names nobody.',
      none: 'The record names nobody: every proposal keeps the privacy it was made under.',
      all: (proposers) => 'The record names every one of the ' + proposers + '.',
      some: (named, proposers) => 'The record names ' + named + ' of the ' + proposers + '.',
      // **honour**: the rule moved while the document was open — some
      // proposals were made under one rung and stand under another
      honour: ' Proposals keep the privacy they were made under: the rule moved while the document was open.',
      sealed: 'Authorship stays sealed: the record names nobody.',
      public: 'Authorship was public throughout.',
      unsealed: 'Authorship is unsealed: the record names who proposed what.',
    },
    // 🥂's batch (SURFACE E24, §9's 🥂 row). The rest of the list is still
    // literal in `begin.js` — issue #19 moved the names line above and no
    // more; this one sentence was written after the rule that the words live
    // in this file, so it starts here.
    //
    // **The line for what the clock found running** (Q1450, Ed 2026-09-18).
    // A motion still open when the document closes fails at that moment, on
    // either route, and nothing on the surface said so: the ordinary one
    // raised its mover a card no shut document lets them press, and the
    // constitutional one — which SURFACE E41 already said 🥂 spoke for —
    // was spoken for by nothing. The verb is **pass** (STYLE T8), and the
    // line is omitted at zero rather than reading *0 motions*, unlike the
    // lines around it: it appears when there is something to say.
    closeBatch: {
      stillOpenOne: 'motion was still open and did not pass',
      stillOpenMany: 'motions were still open and did not pass',
    },
    // the gates and grants (GATES): titles, bodies, locklines
    gate: {
      canpropose: {
        title: 'Proposals',
        why: 'A proposal is a change you write to the document, for the membership to vote on.',
        waiting: 'Waiting on the start.',
        done: 'Open — members can propose as soon as they arrive.',
      },
      canjudge: {
        title: 'Voting',
        why: 'A vote is your say on a proposal: you are shown two at a time and choose the one you prefer, or neither.',
        waiting: 'Waiting on the rules.',
        done: 'Open — the rules are settled.',
      },
      voice: {
        // **the 🏛️ grant is the membership's own door** (Q1502, Ed
        // 2026-09-22: *Activate your membership*); its body is about 🏛️
        // alone, and — by the same ruling — says what activating it opens,
        // the one grant body that does (T45's exception). Its title is the
        // power's name since Q1556 (14) (Ed 2026-09-26): while owed the rail
        // and tab read *Accept Constitutional Proposals*, the card's own
        // words, and *Activate Your Membership* went
        title: 'Constitutional Proposals',
        why: 'A 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all members agree. You are already a member; activating it opens every question, proposal and vote on the rules.',
        waiting: 'Waiting on your arrival.',
        // *Accept 🏛️* like every grant (Q1541.24 (a), Ed 2026-09-25),
        // replacing Q1502's *Activate 🏛️*
        accept: 'Accept 🏛️',
      },
      pen: {
        title: 'Founder Actions',
        why: 'As the founder of this document, you have the power to change settings and edit the document at will. Founder Actions are denoted by ✒️. You can give up these powers later if you choose to.',
        waiting: 'Waiting on the save.',
      },
      shield: {
        title: 'Founder Veto',
        why: 'As the founder of this document, you have the power to veto choices that the membership make. Founder Veto is denoted by 🛡️. You can give up this power later if you choose to.',
        waiting: 'Waiting on the save.',
      },
      // **a grant is accepted, not OK'd** (Q1501, Ed 2026-09-22; T44 amended
      // for the grants alone): the commit names the act and the power it
      // hands you — 💡's power is ✏️ — and 🏛️'s reads its own word above
      accept: (glyph) => 'Accept ' + glyph,
      begin: { title: 'Begin' },
      closing: { title: 'The Close' },
    },
  };

  // ---- the card shell's words (Q1541 stage 1, design/redesign/) ------------
  // **Ed's words, one at a time** (answers.md Part 4, 2026-09-25): the one
  // label above a card's first line, and each block's label on its own first
  // line. Only the words the stage's pilots draw are here — the stranger's
  // settled rule card and a sealed record on a clause; each later stage adds
  // the words its kinds draw. `card-shell.js` reads this table and nothing
  // else of the page's copy.
  const shell = {
    // .3 — the label above a rule card's first line
    currentRule: 'Current rule',
    // .4 — a record's label: its outcome, then when (`longWhen`, M23)
    outcome: {
      passed: 'Passed',
      rejected: 'Rejected',
      refused: 'Refused by the Founder',
      ranOut: 'Ran out of time',
    },
    // .5 — a record whose wording has since been changed
    sinceReplaced: 'since replaced',
    // .11 — what a change replaced
    previousText: 'Previous text',
    // .8, .9, .12 — a wording on a record: the live label, then its share
    proposed: 'Proposed',
    proposedBy: (name) => 'Proposed by ' + name,
    proposedByYou: 'Proposed by you',
    // the joint in every label: *Passed · Tuesday, 29 September, 16:05*,
    // *Proposed · 23%*
    sep: ' · ',
    // ---- stage 2: the acknowledgement cards ----
    // .23, .24 — a grant's label is its act while it is owed (the grants,
    // and 💡 ⚖️ drawn like grants); once accepted the card asks nothing and
    // its label is what its first line is, *Current rule* (.3) — the
    // ask-then-rule Ed ruled for 👑 (answers Part 6.1). **The rail entry and
    // the tab read the same words while the grant is owed** (Q1556 (14), Ed
    // 2026-09-26: *the rail matches the card*), through `labelOf`
    accept: {
      'grant-pen': 'Accept Founder Actions',
      'grant-shield': 'Accept the Founder Veto',
      'grant-voice': 'Accept Constitutional Proposals',
      canpropose: 'Accept Proposals',
      canjudge: 'Accept Voting',
    },
    // 6.8 — 🍾's label is today's title until Q1542 reworks the card
    begin: 'Begin',
    // .22 — 🍾's dark commit, waiting on the membership's answers
    waitingFor: (n) => 'Waiting for ' + n + (n === 1 ? ' member' : ' members') + ' to answer questions.',
    // …and where no answer can end the wait (Q1556 (3), Ed 2026-09-26, his
    // words with the verb made plural): a question handed to a membership of
    // one (`one-voice`), and invitations not yet followed (`invitation-open`)
    beginOneVoice: 'Delegated questions need at least two responses.',
    beginInvited: 'Waiting for invited members to arrive.',
    // .1 — the label above a clause's first line (the park's, stage 2)
    currentText: 'Current text',
  };

  // ---- the spectator feed (feed.html, Q1466) --------------------------------
  // **A second page, for somebody watching** (Ed, 2026-09-19: *a feed of new
  // proposals and proposals that pass, with enough context that you can
  // understand what's happening*). Every entry is a change and the place it
  // bites; nothing here counts, ranks or says which way anything is going
  // (SPEC §3.5). The verb is **pass** (STYLE T8), the office is **the
  // Founder**, and an unnamed author is *Anonymous*, the door's own word.
  const feed = {
    name: 'Feed',
    tabTitle: (title) => title + ' — feed',
    // an entry's eyebrow, by kind
    proposed: 'New proposal',
    passed: 'Passed',
    // **how long it took** (Ed, 2026-09-19: *"Passed in 23 minutes"*), from
    // the moment it was proposed; the two largest units and no more
    passedIn: (durationWords) => 'Passed in ' + durationWords,
    // **…and the numbers ride the title** (Ed, 2026-09-19: *"x of y voted" and
    // the other stats should all be in the title … as they are on decision
    // cards*): one line, the record head's own shape — what happened, a dot,
    // what it came to
    titled: (what, counts) => (counts ? what + ' · ' + counts : what),
    underMinute: 'under a minute',
    minutes: (n) => (n === 1 ? '1 minute' : n + ' minutes'),
    hours: (n) => (n === 1 ? '1 hour' : n + ' hours'),
    days: (n) => (n === 1 ? '1 day' : n + ' days'),
    // **a passed entry's numbers are the passed card's** (Ed, same message:
    // *the same stats as one on a passed card*): `record.counts`' sentence
    // word for word, less its last clause — *you said* — since nobody watching
    // a feed has a vote in it. A clause whose number an older log does not
    // carry is omitted, as the record omits it.
    counts: (voted, roster, floor, approvals, abstained) =>
      [voted + ' of ' + roster + ' weighed in',
        approvals === null || approvals === undefined ? '' : approvals + ' preferred it',
        abstained ? abstained + ' did not answer in time' : '',
        floor === null || floor === undefined ? '' : 'quorum was ' + floor]
        .filter(Boolean).join(' · '),
    decreed: 'The Founder amended this',
    // where a change is, under the eyebrow: the section, or the top
    top: 'At the top of the document',
    // a change's two readings
    stood: 'The clause as it stood',
    put: 'The proposal',
    nowStands: 'The clause as it stands',
    after: 'A new clause, after',
    first: 'A new clause, first in its section',
    // a deletion that passed: the card's own sentence (`lane.removed`) is in the
    // conditional, which is right for a proposal and wrong once it has happened
    removed: 'This clause was removed.',
    // whose hand an amendment is: the office, never the person
    founder: 'The Founder',
    anonymous: 'Anonymous',
    redacted: '[redacted]',
    // **a proposal about a rule** (Ed, 2026-09-19: *of course motions on
    // settings should appear in the feed* … *proposals on settings should have
    // that setting's icon instead of 💡*). The title says which way it was put,
    // since *all members must agree* is a different thing to watch than a vote;
    // the place is the Rules section (Q1516 (5)) and the setting's own noun
    // (`page.cards`).
    proposedConstitutional: 'New constitutional proposal 🏛️',
    constitution: 'Rules',
    ruleStood: 'The rule as it stood',
    ruleNow: 'The rule as it stands',
    noRule: 'No rule had been set.',
    // **the rules' own sentences, for the settings whose sentence is a number
    // or a date.** The ladder settings read `RULES` through `clauseOf` like
    // every card; these are spelled by the page's own clause writers
    // (`ENDING_RULE`, `LAPSE_RULE`, `RATE_RULE` in session-view.html, and
    // `page.quorumRule` here), word for word — two homes for one sentence
    // until the page reads these, which is a change to the regular page and
    // waits for its own pass.
    rule: {
      endingNever: 'Changes to the document may be made perpetually.',
      endingAfter: (when) => 'No more changes to the document may be made after ' + when + '.',
      lapseNever: 'Inactive members never lapse and are still counted towards votes.',
      lapseAfter: (spell) => 'After ' + spell + ', inactive members lapse and automatically abstain from votes.',
      rate: (phrase) => 'Members may make a new proposal ✏️ every ' + phrase + '.',
      unit: { days: 'day', hours: 'hour', minutes: 'minute' },
      units: (n, unit) => n + ' ' + unit,
      address: (slug) => 'The document lives at docs.vote/d/' + slug + '.',
    },
    // the page's states
    loading: 'Loading…',
    notBegun: 'The document has not begun. Proposals will appear here once it has.',
    empty: 'Nothing has been proposed yet.',
    closed: (dateWords) => 'Closed ' + dateWords,
    unreachable: 'The feed could not be reached. It will try again.',
    // the host's red flag, said about the document to a reader who cannot act
    stalled: 'This document cannot save changes at the moment, so nothing here will change until it can.',
    missing: 'There is no document at this address.',
  };

  return { RULES, grammar, session, page, shell, feed };
})();
