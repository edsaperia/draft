/* card-state.js — one description of a card's state (Q1541 stage 1).
 *
 * The redesign's first cause (design/redesign/grammar.md §2.1, BUILD.md §1):
 * every card body re-derived the state it needed — the founder's page state
 * for a member's card (plain bug 1, *Set to undefined*), the provenance in
 * three places (`provOf`, the stranger's `lockline`, a record's eyebrow) —
 * so the same fact could read differently on two cards, or undefined on one.
 * Here each fact has **one reader**, and a card is built from one value,
 * `CardState`, made by `stateOf(key)`:
 *
 *   card          kind, id, anchor, the shell kind the audit holds it to
 *   reader        who is looking: founder-member · founder-clerk · member ·
 *                 stranger · applicant
 *   phase         birth · founding · live · closed
 *   place         the anchor as the document draws it now (`placeOf`)
 *   standing      who chose what stands (`provenanceOf`)
 *   power         a power card's power (`powersOf`)
 *   acts          what this reader may send here now (`actsOf`)
 *   alternatives  what may be chosen (`alternativesOf`)
 *   owed          what this reader owes the card: nothing · OK
 *   record        how a record ended, and its field (`outcomeOf`)
 *   draft, notes  unsent choices; the clocks about an act
 *
 * **The readers ask the surfaces for raw facts and decide here.** A surface
 * — the band (session-view.html) and the charter (session.js) — registers a
 * source with `register(name, src)`: `owns(key)` says which keys are its,
 * and the rest are raw getters (a setting's `settledBy`, a record's field).
 * What the facts *mean* — which of two words says who chose a rule, what a
 * record's outcome was, which wording heads it — is decided once, here.
 * Where a card needs a fragment only the page can draw (the paragraph
 * renderer's words, the gutter's strip), the source's `present` hands it
 * over already drawn, so `card-shell.js` reads nothing but the state.
 *
 * Only the kinds a stage has converted are built from `stateOf` (BUILD.md §4;
 * stage 1: the stranger's settled rule card and a sealed record on a clause).
 * The readers answer for every key all the same — `design/tools/card-state-
 * check.mjs` and `packages/server/test/card-state.test.ts` hold them against
 * what today's builders derive, epoch by epoch.
 *
 * Load order: constitution.js → copy.js → cards.js → **card-state.js** →
 * **card-shell.js** → setup.js → … → session.js → inline. Nothing here runs
 * at load but the table itself.
 */
window.CARD_STATE = (function () {
  'use strict';

  const SURFACES = [];
  /** a surface's source: `{ owns(key), …raw getters, present?(st) }` —
   *  registered once, replaced by name (a page re-made by a seat switch) */
  function register(name, src) {
    const i = SURFACES.findIndex((s) => s.name === name);
    if (i >= 0) SURFACES.splice(i, 1);
    SURFACES.push({ name, src });
  }
  const sourceOf = (key) => {
    for (const s of SURFACES) {
      try { if (s.src.owns(key)) return s.src; } catch (e) { /* a surface mid-render owns nothing */ }
    }
    return null;
  };
  /** the page's own facts — the seat and the document's era — asked of
   *  whichever surface can answer them (the band's source, on this page) */
  const pageAsk = (fn, dflt) => {
    for (const s of SURFACES) {
      if (typeof s.src[fn] === 'function') { try { const v = s.src[fn](); if (v != null) return v; } catch (e) { /* ask the next */ } }
    }
    return dflt;
  };
  const C = () => (window.COPY || {});

  /* ---- reader and phase: one reader each ------------------------------ */

  /** who is looking — the one reader of the seat */
  function readerOf() { return pageAsk('reader', 'member'); }
  /** where the document is in its life — the one reader of the era */
  function phaseOf() { return pageAsk('phase', 'live'); }

  /* ---- provenance: the one reader of who chose a rule ----------------- */

  /**
   * **Who chose what stands**, in the two words the surface has for it
   * (Q1188, T48): the membership, by a founding question or a carried
   * motion; or the Founder ✒️, by a founding choice or an amendment at will.
   * `crown` is two hands (Q1293): the module writes it for the Founder's own
   * post-start pen and for a membership motion the Founder assented to, and
   * the latest carried set on the setting tells them apart. Nothing set yet
   * reads as the Founder's, which is what the page has always said of it.
   * The one reader: the page's `provOf` asks this, the stranger's card asks
   * this, and so will every rule card as its stage converts it.
   */
  function provenanceOf(key) {
    const src = sourceOf(key);
    if (!src || typeof src.standing !== 'function') return null;
    const st = src.standing(key);
    if (!st) return null;
    const by = st.settledBy;
    const pen = !by || by === 'convenor' || (by === 'crown' && st.lastRoute === 'pen');
    const words = (C().page || {}).motionRec || {};
    return { by: pen ? 'founder' : 'membership', label: pen ? words.provPen : words.provMembers,
      settled: !!st.settled };
  }

  /* ---- place: the anchor as the document draws it now ------------------ */

  /**
   * **The anchor as the column's own renderer draws it** (grammar S2): for a
   * rule, its sentence without its powers line (1541.10), which on a closed
   * document has no powers line at all (1541.52) — the phase is inside the
   * source's answer, so no card can print a power the document no longer
   * holds; for a clause, its text. `{ kind, html, text }`, the html already
   * the renderer's.
   */
  function placeOf(key) {
    const src = sourceOf(key);
    if (!src || typeof src.place !== 'function') return null;
    return src.place(key, phaseOf()) || null;
  }

  /* ---- powers, acts, alternatives -------------------------------------- */

  /** a power card's power, its clause and its holder — `null` off a power
   *  card. No pilot draws one in stage 1; stage 3b converts the power cards */
  function powersOf(key) {
    const src = sourceOf(key);
    if (!src || typeof src.power !== 'function') return null;
    return src.power(key) || null;
  }

  /**
   * **What this reader may send here now** — the `may*` family asked once,
   * with the phase inside it (1541.19 (a)). Each act is `{ act, glyph, until? }`;
   * a dark act carries the reason it waits (`until`: choose, type, drip,
   * voice-out, readiness, reconnect, flight). **An act for a power not yet
   * accepted is absent, not dark** (answers Part 4 .19). On a closed
   * document nothing is offered but 🥂's signature, which is the closed
   * page's own card; a stranger and an applicant send nothing from a card.
   */
  function actsOf(key) {
    const phase = phaseOf();
    const reader = readerOf();
    if (phase === 'closed') return [];
    if (reader === 'stranger' || reader === 'applicant') return [];
    const src = sourceOf(key);
    if (!src || typeof src.acts !== 'function') return [];
    return (src.acts(key) || []).filter((a) => a && a.accepted !== false);
  }

  /** what may be chosen here — filtered by value (what stands is never among
   *  them, Q620) and by `acts` (nothing no act could send). Empty for a
   *  reader who can choose nothing */
  function alternativesOf(key) {
    if (!actsOf(key).length) return [];
    const src = sourceOf(key);
    if (!src || typeof src.alternatives !== 'function') return [];
    return src.alternatives(key) || [];
  }

  /* ---- outcome: the one reader of how a record ended ------------------- */

  /**
   * **How a record ended, and what it recorded** — the facts the sealed
   * card drew by its own derivation, decided once (Q1522's outcome first,
   * answers Part 4 .4, .5, .12). The source hands over the record's raw
   * field; this decides:
   *
   * - **the outcome** — *Passed* where a wording carried; *Refused by the
   *   Founder* where the text stood and the Founder's 🛡️ said why (R-056);
   *   *Ran out of time* where the clock cut it off (§4.6); *Rejected*
   *   otherwise, a wording closed early among them (Q1451);
   * - **the head** — the wording the record recorded (answers Part 5 (1)):
   *   the winner where it carried, the text that stood where it did not, the
   *   best wording at the close; marked against what it was proposed against,
   *   and green where it holds what passed (Q1531 as amended);
   * - **since replaced** — where the clause no longer reads as the record
   *   left it (Q1333), said once, in the label (.5);
   * - **the field** — every other wording, best first, each labelled on its
   *   own first line with its live label and its share (.12), and *Previous
   *   text* on what the change replaced (.11);
   * - **the participation line** (answers Part 6.3), and the cap line
   *   (R-051) joined to it — one fact line.
   */
  function outcomeOf(key) {
    const src = sourceOf(key);
    if (!src || typeof src.record !== 'function') return null;
    const r = src.record(key);
    if (!r) return null;
    const W = C().shell || {};
    const field = r.field || [];
    const held = !field.some((c) => c.won);
    const und = !!r.undecided;
    const refused = held && field.some((c) => !!c.refusal);
    const outcome = und ? 'ranOut' : !held ? 'passed' : refused ? 'refused' : 'rejected';
    // the incumbent in the ranking at its own 50% (Ed, 2026-08-17): the text
    // that stood where it held, the text replaced where a wording carried
    const incumbentText = held ? r.currentText : (r.replaced != null ? r.replaced : r.optionA);
    const ranked = field.slice()
      .concat(incumbentText != null ? [{ text: incumbentText, why: null, p: 0.5, incumbent: true }] : [])
      .sort((x, y) => (y.p == null ? -1 : y.p) - (x.p == null ? -1 : x.p));
    const top = ranked.find((c) => c.won || (c.incumbent && held)) || null;
    const rest = ranked.filter((c) => c !== top);
    // what passed is green, what lost stays yellow (Q1531 amended): the kept
    // text on a ✖ record passed against its top-ranked loser
    const keptPassed = held && !und && !r.early;
    const topLoser = keptPassed ? field.filter((c) => !c.won && c.text != null)
      .sort((x, y) => (y.p == null ? -1 : y.p) - (x.p == null ? -1 : x.p))[0] || null : null;
    const markOf = (c) => (c.incumbent
      ? (topLoser && String(c.text == null ? '' : c.text).trim() ? { against: topLoser.text } : null)
      : { base: r.base });
    const passedOf = (c) => !!(c.won || (c.incumbent && !!topLoser));
    const since = !!r.changedSince;
    const label = W.outcome ? W.outcome[outcome] + (r.when ? W.sep + r.when : '') + (since ? W.sep + W.sinceReplaced : '') : null;
    const share = (p) => (p == null ? null : Math.round(p * 100) + '%');
    const blockLabel = (c) => {
      if (c.incumbent) return W.previousText;
      const who = c.mine ? W.proposedByYou : c.by ? W.proposedBy(c.by) : W.proposed;
      const s = share(c.p);
      return who + (s ? W.sep + s : '');
    };
    // the participation line — never on a wording closed early (Q1451), whose
    // race has not sealed and may not say which way the room went
    const counts = r.early || !r.counts ? null : r.counts;
    const fact = [counts, r.capped || null].filter(Boolean).join(W.sep || ' · ') || null;
    return {
      outcome, label, green: outcome === 'passed', since,
      head: top ? { text: top.text, mark: since ? null : markOf(top), passed: !since && passedOf(top),
        incumbent: !!top.incumbent,
        speaker: top.incumbent ? null : { why: top.why, by: top.by || null, underNote: top.underNote || null, refusal: top.refusal || null } } : null,
      fact,
      field: rest.map((c) => ({
        role: c.incumbent ? 'previous' : 'proposed',
        label: blockLabel(c),
        author: !c.incumbent && !!c.by,
        text: c.text, mark: markOf(c), passed: passedOf(c),
        speaker: c.incumbent ? null : { why: c.why, by: c.by || null, underNote: c.underNote || null, refusal: c.refusal || null },
      })),
    };
  }

  /* ---- the one value ---------------------------------------------------- */

  /**
   * **`CardState`**, made once per card per render. Plain data, plus the
   * fragments only the page can draw (`src.present`), so the shell's slots
   * read this and nothing else (S1, `state-only`). `hints` is what only the
   * caller knows about where the card is drawn — the band's strip, the pile
   * the card opened from (Q1541 stage 2) — handed to `present` untouched.
   */
  function stateOf(key, hints) {
    const src = sourceOf(key);
    const base = {
      card: src && typeof src.card === 'function' ? src.card(key) : { kind: null, id: key, anchor: null },
      reader: readerOf(),
      phase: phaseOf(),
      place: placeOf(key),
      standing: provenanceOf(key),
      power: powersOf(key),
      acts: actsOf(key),
      alternatives: alternativesOf(key),
      owed: src && typeof src.owed === 'function' ? (src.owed(key) || null) : null,
      record: outcomeOf(key),
      draft: null,
      notes: null,
    };
    return src && typeof src.present === 'function' ? Object.assign(base, src.present(key, base, hints || {}) || {}) : base;
  }

  return { register, stateOf, readerOf, phaseOf, provenanceOf, placeOf, powersOf, actsOf, alternativesOf, outcomeOf,
    get surfaces() { return SURFACES.map((s) => s.name); } };
})();
