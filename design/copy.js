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
    admission: {
      assembly: 'Members may propose to invite people to join the membership, and all members must agree 🏛️.',
      proposal: 'Members may propose to invite people to join the membership, and the membership decides ✏️.',
      pen: 'Members may invite people to join the membership at will ✒️.' },
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
    },
    // clauseHeadHtml: the clause lifted into the head
    head: {
      label: 'The clause as it stands',
      nothing: 'Nothing stands here — the charter runs straight from Bringing a Guest to Guests Staying Over.',
    },
    // commitRowHtml: the row every decision card ends in
    commit: {
      indifferent: 'Indifferent',
      vinDiagonal: 'They matter equally',
      vinPair: 'I can’t split them',
      binLocked: 'Close — your vote stays on the record',
      bin: 'Clears your choice and closes — there is nothing here to put back',
      chillOn: 'Cooled — this one will not be put at the front of your queue. Press again to allow it.',
      chillOff: 'Not this one, not now — it stays open and stops being the most urgent',
      cast: 'Recorded — choose again to change it',
      submit: 'Submit this vote',
      choose: 'Choose one of the three first',
    },
    // reviseNote: what a locked judgment says for itself
    revise: {
      you: 'You ',
      voted: 'voted',
      shiftedTail: ' You cannot change it, because it was not a vote about this text.',
      lockedTail: 'This one is settled, so your vote is on the record as it stands.',
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
      mdMode: 'Markdown — see and type the characters exactly as they are stored',
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
      noReason: 'no reason given yet — say what this is for',
      placesOf: (n, of) => n + ' of ' + of + ' places',
      stillDeciding: 'still deciding — click to change your mind',
      deadlocked: (judges, comparisons) => 'Deadlocked — ' + judges +
        ' people can’t agree on a proposal even after ' + comparisons +
        ' votes. Can you propose something everyone will agree on?',
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
      tooltip: (judges, roster, floor, yoursLine) =>
        judges + ' of ' + roster + ' weighed in · quorum was ' + floor + ' · ' + yoursLine,
      youSaid: (verdict) => 'you ' + verdict,
      youNever: 'you never voted on this',
      undecided: 'Undecided at the close',
      decided: 'Decided',
      capped: 'the ranking maths stopped short on this one; the decision stands',
    },
    // the proposal row and the commit titles either side of the ✏️ hold
    row: {
      placesChanged: (n) => (n === 1 ? '1 place changed' : n + ' places changed'),
      discardAll: 'Discard the whole draft — nothing has been spent on it',
      discardDraft: 'Discard this draft — nothing has been spent on it yet',
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
      submitted: '✏️ Submitted',
      submittedTitle: 'Proposed — one edit spent. It is in the race now.',
      idle: 'Nothing has changed yet — type in the document to start a draft',
      reviewAmend: 'Review and amend the document',
      reviewPropose: 'Review and propose this',
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
    },
    // the deadlock card: the reading room and the desk
    dead: {
      headLabel: 'The clause as it stands — and it is still standing',
      fieldLab: (n) => 'Everything in flight · ' + n + ' proposals, oldest first',
      deskLab: '✏️ propose something everyone can agree on',
    },
    // 🛡️ on the Text: the 👑 question and the note on a live race under it
    crown: {
      waits: 'If it passes it goes to the Founder, who may assent or refuse before it lands.',
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
      foot: 'Neither of these has to win — the clause above stands unless the leader clears the approval threshold.',
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
    // the session-clock's ladder (Q466/Q471) and the date in words
    clock: {
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'],
      frozen: 'Frozen',
      mustReturn: (n) => ' — ' + n + ' must return',
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
  const page = {
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
    // 📝's value slot: the column, counted
    prose: {
      nothingYet: 'Nothing written yet.',
      paragraph: 'paragraph',
      heading: 'heading',
      below: ', below.',
    },
    // the riding tab's tooltip and the pre-🍾 prose row
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
    binPutBack: 'Put it back as it stands',
    // 👑/📯 in the topbar
    founderMark: {
      crowned: 'Part of the constitution is reserved: changing it needs the founder’s assent',
      none: 'The Founder reserves nothing — no special part in the document',
    },
    // 📍's verdict fragments, composed around the bold address
    slugNote: {
      taken: ' is taken.',
      free: ' is free.',
      suggested: 'Suggested from the title — ',
      takenSo: ' is taken, so this one is ',
    },
    // the settings cards (CARDS): titles (the rail's names since Q1151),
    // aggregation rules and the settled strip's takes-lines. Fixture values
    // (result, dist…) stay with the fixture.
    cards: {
      title: { t: 'Title' },
      myemail: { t: 'Your Email' },
      slug: { t: 'Link' },
      shape: { t: 'What Type of Document Is This?' },
      admission: { t: 'Admissions',
        rule: 'Each member says the <b>cheapest</b> admission they would accept, and the document takes the dearest — one member who wants everyone asked keeps everyone asked.',
        takes: 'The document takes the dearest' },
      invite: { t: 'Invite a Member' },
      remove: { t: 'Remove a Member' },
      hat: { t: 'Is the Founder a Member?' },
      applications: { t: 'Applications',
        rule: 'Each member says the <b>most open</b> door they would accept, and the document takes the least open of them — one member who wants invitation only keeps it so.' },
      myname: { t: 'Your Name' },
      mypic: { t: 'Your Picture' },
      text: { t: 'Text' },
      ending: { t: 'When Does It End?',
        routeNote: 'What this takes depends on what you write. A different date is a proposal ✏️ like any other. <b>Never</b> — no end date at all — needs every member to agree, because with no end date the approval threshold cannot rise, and every change made so far was made under one that did.',
        rule: 'Each member says when they want it to end, and the document takes the <b>latest</b> answer — <b>never</b> being later than any date — so nobody is cut off before they were ready.',
        takes: 'The document takes the latest' },
      bar: { t: 'Proposal Pass Threshold',
        rule: 'Each member says the lowest they will accept, and the document takes the highest — so it is never easier to change than any one of them wanted.',
        takes: 'The document takes the highest' },
      pace: { t: 'Rising Approval Threshold?' },
      quorum: { t: 'Quorum',
        rule: 'Each member says the lowest they will accept, and the document takes the highest.',
        takes: 'The document takes the highest' },
      authorship: { t: 'Anonymous Proposals',
        rule: 'This one is about privacy, so it runs the other way: the document takes the <b>most private</b> answer, and one member who wants to stay unnamed keeps everybody unnamed.',
        takes: 'The document takes the most private' },
      judgments: { t: 'When Are Votes Revealed?',
        rule: 'Also about privacy, so the <b>most private</b> answer wins: one member who wants them kept private keeps them private.',
        takes: 'The document takes the most private' },
      rate: { t: 'Proposal Rate',
        rule: 'Each member says the <b>most generous</b> they would accept, and the document takes it.',
        takes: 'The document takes the most generous' },
      chamber: { t: 'Visibility',
        rule: 'This one is about privacy, so the <b>most private</b> answer wins: one member who wants it kept closed keeps it closed.',
        takes: 'The document takes the most private' },
      removal: { t: 'How Is a Member Removed?',
        rule: 'Each member says the easiest they would accept, and the document takes the hardest — one member who wants everybody asked keeps everybody asked.' },
      lapse: { t: 'Do Memberships Lapse?',
        rule: 'Each member says the shortest gap they would accept, and the document takes the longest — <b>never</b> being longer than any of them — so nobody loses their membership faster than they accepted.',
        takes: 'The document takes the longest' },
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
      hasJoined: ' Has Joined',
      admitLead: 'Admit ',
      admitTail: '?',
      released: 'What the Founder Has Laid Down',
      mailGaveUp: 'An Invitation Did Not Send',
      passedLead: 'Passed: ',
      rejectedLead: 'Rejected: ',
      anonymous: 'Anonymous',
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
      may: (parts, aside) => 'The Founder' + (aside ? ' (that’s you!)' : '') +
        ' may ' + parts.join(', and ') + '.',
      mayNotYet: (parts) => 'From the start, the Founder may not ' + parts.join(', or ') + '.',
      mayNot: (phrase) => 'The Founder may not ' + phrase + '.',
      noun: {
        title: 'the title', slug: 'the link', text: 'the text',
        ending: 'the ending', bar: 'the approval threshold',
        pace: 'how the approval threshold rises', quorum: 'quorum',
        authorship: 'anonymous proposals', judgments: 'vote reveal',
        chamber: 'visibility', rate: 'the proposal rate', lapse: 'membership lapse',
        removal: 'member removal',
        admission: 'the price of admission', applications: 'applications',
        invite: 'invitations', remove: 'removals',
        fallback: 'this',
      },
      veto: (has, noun) => 'The Founder ' + (has ? 'has' : '<b>does not</b> have') +
        ' a veto over proposals passed by the membership about ' + noun + '.',
      opts: {
        star: {
          u: { held: ['The Founder changes it at will.', 'No proposal needed for the Founder’s own hand.'],
               given: ['Only by proposal, like anybody.', 'The Founder proposes like a member.'] },
          a: { held: ['', 'Each one comes as a 👑 question — assent or refuse.'],
               given: ['', 'Nothing waits on the Founder.'] },
        },
        invite: {
          u: { held: ['The Founder invites at will.', 'Nobody else has to agree when the Founder brings somebody in.'],
               given: ['Only as Admissions says, like anybody.', 'The Founder proposes a member like anybody, at the price the document sets.'] },
          a: { held: ['', 'Each invitation, and each application, comes as a 👑 question — assent or refuse.'],
               given: ['', 'An invitation the membership passes needs nobody’s assent.'] },
        },
        remove: {
          u: { held: ['The Founder removes at will.', 'A member the Founder removes is gone at once — nobody else has to agree.'],
               given: ['Only as Removal says, like anybody.', 'The Founder proposes a removal like anybody, at the price the document sets.'] },
          a: { held: ['', 'Each removal comes as a 👑 question — assent or refuse.'],
               given: ['', 'A removal the membership passes needs nobody’s assent.'] },
        },
        text: {
          u: { held: ['The Founder edits the text at will.', 'No proposal needed for the Founder’s own hand on the text.'],
               given: ['Only by proposal, like anybody.', 'The Founder proposes a change to the text like a member.'] },
          a: { held: ['', 'Each one comes as a 👑 question before it lands — assent or refuse.'],
               given: ['', 'A change the membership passes lands in the text at once.'] },
        },
      },
      chooseThis: 'Choose this',
      chosen: 'Chosen',
      notes: {
        holds: 'The Founder holds this. Giving it up is the Founder’s, one way; taking a held power from them is a constitutional motion, the members’ to move.',
        givenFromStart: '<b>Given up from the start.</b> The Founder holds it until the document begins.',
        given: '<b>Given up.</b> The road back is a constitutional motion, the members’ to move.',
        givenOneWay: '<b>Given up — one way.</b> The road back is the members’ reserve motion.',
        oneWayTail: ' One way — the road back is the members’ to give.',
        delegatesTail: ' Neither power would be left, so it hands the question to the membership straight away.',
        atBeginTail: ' It takes effect when the document begins.',
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
      reserveReturned: (what) => 'The membership returned ' + what + ' to the founder’s reserve.',
      reserveKept: (what) => 'The membership kept ' + what + ' with the membership.',
      titleNoun: 'the document’s title',
      ruleNoun: 'this rule',
      keptLead: 'The membership kept ',
      keptAsStoodWas: ' as it stood: ',
      keptAsStood: ' as it stood',
      provPen: 'Chosen by Founder Action ✒️',
      provMembers: 'Chosen by the membership',
    },
    // the Proposals preamble (Y21): the gates' fragments, composed
    preamble: {
      beforeBegin: 'When the document begins, members may propose changes to rules and vote on proposals.',
      voteOnly: 'Members may vote on proposals.',
      voteWhenDecided: 'Members may begin voting on proposals when the whole constitution has been decided.',
      proposeAtBegin: ' They may propose changes to rules when the document begins.',
      proposeLead: 'Members may propose changes to rules ',
      onceAnswered: 'once they have answered the questions the Founder delegated',
      asArrive: 'as soon as they arrive',
      andVote: ', and may vote on proposals.',
      voteTail: '. They may begin voting on proposals when the whole constitution has been decided.',
      passOrdinary: 'A proposal ✏️ passes when it meets the approval threshold.',
      passConstitutional: 'A constitutional proposal 🏛️ passes only when all members agree.',
    },
    titledLead: 'The document is titled ',
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
      quorumPct: (pct, n, e) => pct + '% — ' + n + ' of ' + e,
      oneEvery: (phrase) => 'One every ' + phrase,
      lapseAfter: (d) => 'After ' + d + ' days without logging in',
      open: 'Open',
      waitingStart: 'Waiting on the start',
      waitingConstitution: 'Waiting on the constitution',
      begun: 'Begun',
      notBegun: 'Not yet begun',
      closed: 'Closed',
      untitled: 'Untitled',
    },
    // the member's answer card: the ask line and the readback frame
    said: (s) => 'You said: “' + s + '”',
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
    underMotion: 'Under motion — ',
    penWait: 'Founder Actions ✒️ are waiting in your tasks — accept them and this turns.',
    doorEmpty: {
      invite: 'Nobody has been invited yet.',
      remove: 'Nobody is proposed for removal.',
    },
    theFounder: 'The Founder',
    crownHand: 'The founder’s own hand — a Founder Action ✒️, not a proposal',
    whyChangingPlaceholder: 'I am changing this because…',
    clerkNoPencil: 'You are not a member, so there is no ✏️ for you to spend — this one is yours to set.',
    nothingToPut: 'That could not be proposed: nothing is chosen on this card.',
    // the composer's free sentences (the lane pairs stay with MVAL's cluster)
    composeNote: {
      redirect: 'Every link the document has ever had keeps working — a change leaves a redirect behind.',
      neverNeedsAll: 'Taking the end date away needs all members to agree — with no end date the approval threshold cannot rise.',
      oneMotionOneRule: 'One motion proposes one rule; what you do not touch stands.',
      inviteConstitutional: 'An invitation is constitutional, because the membership is what quorum is a fraction of: all members must agree, and one who says no keeps them out.',
      removalSeen: 'Whoever it is will see the proposal — nobody is removed in secret.',
      somebodyToInvite: 'Somebody to invite',
      inviteBtn: 'Invite',
    },
    // a constitutional motion's consent card: the question and the answers
    consent: {
      inviteWhy: (name) => 'Whether <b>' + name + '</b> joins the membership. Adding a member changes what quorum is a fraction of, so it is constitutional: the most restrictive answer wins, and one member who says no keeps them out.',
      inviteNo: ['I would rather they did not', 'They stay out. Nobody is told who said so.'],
      inviteYes: ['I accept them joining', 'They start with the ✏️s everyone got, plus what the drip has added since, and quorum recomputes.'],
      inviteAbstain: ['Abstain', 'An answer, not a block: they can join without your consent counting either way.'],
      removeSelfWhy: 'Whether <b>you</b> leave the membership. Under this document’s rule that is decided by <b>everyone but you</b> — you see it running, and your answer is not asked.',
      removeSelfCount: (judged, others) => judged + ' of ' + others + ' have answered. One refusal keeps you in.',
      removeWhy: (name) => 'Whether <b>' + name + '</b> leaves the membership. Removing a member changes what quorum is a fraction of, so it is constitutional — ',
      removeByOthers: 'decided by everyone but them; they see it running.',
      removeByAll: 'and their own answer counts among everyone’s.',
      removeNo: ['They stay', 'Nobody is told who said so.'],
      removeYes: ['I accept their leaving', 'Their votes already cast keep counting; quorum recomputes.'],
      removeAbstain: ['Abstain', 'An answer, not a block.'],
      honour: '<b>Proposals keep the privacy they were made under.</b> ',
      setWhy: (to, stands) => 'Whether <b>' + to + '</b> replaces <i>' + stands + '</i>. There is no vote here: you state what you will accept, and one refusal keeps what stands.',
      setNo: ['Keep what stands', 'Nobody is told who said so.'],
      setYes: (e) => ['I accept the change', 'It passes once all ' + e + ' stand at accept — or abstain.'],
      setAbstain: ['Abstain', 'An answer, not a block: the motion can pass without your consent counting either way.'],
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
        waiting: 'Waiting on the constitution.',
        done: 'Open — the constitution is settled.',
      },
      voice: {
        title: 'Constitutional Proposals',
        waiting: 'Waiting on your arrival.',
      },
      pen: {
        title: 'Founder Actions',
        why: 'As the founder of this document, you have the power to change settings and edit the document at will. Founder Actions are denoted by ✒️. You can give up these powers if you choose to.',
        waiting: 'Waiting on the save.',
      },
      shield: {
        title: 'Founder Veto',
        why: 'As the founder of this document, you have the power to veto choices that the membership make. Founder Veto is denoted by 🛡️. You can later give up this power if you choose to.',
        waiting: 'Waiting on the save.',
      },
      begin: { title: 'Begin' },
      closing: { title: 'The Close' },
    },
  };

  return { RULES, grammar, session, page };
})();
