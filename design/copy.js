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

  return { RULES, grammar, session };
})();
