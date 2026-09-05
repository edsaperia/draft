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

  return { RULES, grammar };
})();
