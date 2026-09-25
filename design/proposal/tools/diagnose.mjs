/**
 * diagnose.mjs — Q1541 stage 2: count every inconsistency class from
 * design/proposal/inventory.json, plus three static scans of the product source
 * (per-key branches in the card builders, the commit-row emitters, the
 * stylesheet's off-scale literals) and the hand tagging of CLAUDE.md's Gotchas.
 *
 *   node design/proposal/tools/diagnose.mjs          # writes diagnosis-counts.json, prints a summary
 *
 * Read-only against the product: it opens files under design/ and packages/
 * for reading and writes only design/proposal/diagnosis-counts.json (beside
 * diagnosis.md, not in data/, which is gitignored).
 *
 * A *record* is one card opened at one width in one walk (inventory.json's
 * unit: key × walk × width). Counts are records unless a class says otherwise;
 * `pairs` in a class is the same count folded across the two widths (a fault
 * seen at 1600 and at 390 counts once), which is the fairer number where the
 * fault does not depend on the width.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROP = resolve(HERE, '..');
const DESIGN = resolve(PROP, '..');
const ROOT = resolve(DESIGN, '..');
const J = JSON.parse(await readFile(join(PROP, 'inventory.json'), 'utf8'));
const R = J.records;

/* --- helpers ----------------------------------------------------------------- */
const tally = (arr) => { const m = {}; for (const k of arr) m[k] = (m[k] || 0) + 1; return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1])); };
const pairKey = (r) => r.key + '|' + r.walk;                       // the record folded across widths
const pairs = (rs) => new Set(rs.map(pairKey)).size;
const kindsOf = (rs) => tally(rs.map((r) => r.kind));
const shotOf = (r) => r.shot || r.shotOf || null;
const ex = (rs, n = 4) => {
  // one example per kind first, so the evidence is spread across the card kinds
  const seen = new Set(); const out = [];
  for (const r of rs) if (!seen.has(r.kind) && out.length < n) { seen.add(r.kind); out.push({ record: r.id, shot: shotOf(r) }); }
  for (const r of rs) if (out.length < n && !out.some((o) => o.record === r.id)) out.push({ record: r.id, shot: shotOf(r) });
  return out;
};
const isClosed = (r) => /(^|_)closed/.test(r.walk) || r.walk.startsWith('closed');
const walkRoot = (r) => r.walk.replace(/_(m-\d|founder|stranger)$/, '').replace(/:.*/, '');
const buttons = (r) => r.controls.filter((c) => c.kind === 'button');
const radios = (r) => r.controls.filter((c) => c.kind === 'radio');
const inputs = (r) => r.controls.filter((c) => c.kind === 'input');
const PROVENANCE_RADIO = /^Chosen by /;
// the strip's tab labels are inside the head's text; take them out before
// reading the card's own words, so a tab naming the rule is not a repeat
const ownText = (r) => {
  let t = r.strings.all || '';
  for (const h of r.strings.hints || []) {
    const label = h.split(' — ')[0];
    if (label && label.length > 3) t = t.split(label).join(' ');
  }
  return t;
};
const classes = [];
// every class hands over the records it touches (`affected`, the benign parts
// left out) and a severity: 3 — a card misstates the document's state or offers
// an act its state forbids; 2 — a reader meets noise, a doubled or empty thing,
// a control that does nothing; 1 — measurement: a box off the grid, a drift in
// words that costs nothing to read. `records × severity` is the ranking.
const touched = new Map();                                      // record id → classes
const add = (c) => {
  const aff = [...new Set((c.affected || []).map((r) => r.id))];
  for (const id of aff) touched.set(id, [...(touched.get(id) || []), c.id]);
  c.records = aff.length; c.pairs = new Set((c.affected || []).map(pairKey)).size;
  c.score = c.records * c.severity;
  delete c.affected;
  classes.push(c); return c;
};

/* ============================================================================
   D1 — the frame is drawn whatever it holds (orphan hairlines, empty slots)
   ========================================================================== */
{
  const orphan = R.filter((r) => r.orphanHairlines.length);
  const drawnEmptyRow = R.filter((r) => r.slots.some((s) => s.role === 'commit row') && r.commitRow.length === 0);
  // a head with no words that still takes its box: the strip rides in it, so
  // the head exists, and its 12px + margin stands blank over the body
  const emptyHead = R.filter((r) => !(r.strings.head || '').trim() && !(r.strings.eyebrow || '').trim() &&
    r.slots.some((s) => s.role === 'head' && s.h > 0));
  const emptyField = R.filter((r) => r.slots.some((s) => s.role === 'field' && !s.text.trim() && s.h > 0) &&
    inputs(r).length === 0 && radios(r).length === 0);
  add({ id: 'D1', name: 'The frame is drawn whatever it holds: orphan hairlines, empty slots that keep their box',
    severity: 2, affected: [...orphan, ...drawnEmptyRow, ...emptyHead, ...emptyField],
    count: new Set([...orphan, ...drawnEmptyRow, ...emptyHead, ...emptyField]).size,
    parts: {
      orphanHairline: { records: orphan.length, pairs: pairs(orphan), kinds: kindsOf(orphan), examples: ex(orphan),
        where: tally(orphan.map((r) => r.orphanHairlines.map((h) => h.kind + ' ' + h.a).join(', '))) },
      commitRowDrawnEmpty: { records: drawnEmptyRow.length, pairs: pairs(drawnEmptyRow), kinds: kindsOf(drawnEmptyRow), walks: tally(drawnEmptyRow.map(walkRoot)), examples: ex(drawnEmptyRow) },
      headBlankButBoxed: { records: emptyHead.length, pairs: pairs(emptyHead), kinds: kindsOf(emptyHead), examples: ex(emptyHead, 6),
        headHeights: tally(emptyHead.map((r) => Math.round(r.slots.find((s) => s.role === 'head').h))) },
      fieldBlankNoControls: { records: emptyField.length, kinds: kindsOf(emptyField), examples: ex(emptyField) },
    } });
}

/* ============================================================================
   D2 — one fact stated twice on one card
   ========================================================================== */
{
  const statline = R.filter((r) => r.readBodyStatline);
  // a whole sentence of the card's own words (tab labels removed) that appears
  // twice. A 28-character window was tried first and rejected: a proposal
  // shares most of its words with the clause it amends, and a setting's option
  // blocks share their sentence frame, so the window counted the diff, not a
  // repeat. A sentence repeated whole is a repeat by any reading.
  const repeats = [];
  for (const r of R) {
    const sents = ownText(r).replace(/\s+/g, ' ').split(/(?<=[.?!])/).map((s) => s.trim()).filter((s) => s.length >= 20 && /[a-z]{3}/i.test(s));
    const seen = new Set(); let hit = null;
    for (const s of sents) { if (seen.has(s)) { hit = s; break; } seen.add(s); }
    if (hit) repeats.push({ r, hit });
  }
  // the same moment (a time of day) stated twice
  const timeTwice = R.filter((r) => { const m = (ownText(r).match(/\d\d:\d\d on \d+ \w+/g) || []); return m.length > 1 && new Set(m).size < m.length; });
  // who decided it, said more than once (radio, lockline, record eyebrow)
  const provPhr = /(Chosen by the (Founder|membership)|Decided by the members|Set by the founder[^.]*|Changed by the Founder)/g;
  const prov = R.map((r) => ({ r, p: (ownText(r).match(provPhr) || []) })).filter((x) => x.p.length > 1);
  add({ id: 'D2', name: 'One fact stated twice on one card',
    severity: 2, affected: [...statline, ...timeTwice, ...prov.map((x) => x.r)],
    // the whole-sentence repeats are rival wordings sharing a sentence on a
    // race card — the diff, not a fault — so they are reported and not counted
    count: new Set([...statline, ...timeTwice, ...prov.map((x) => x.r)]).size,
    parts: {
      setToBlock: { what: 'readBody\'s *Set to … / Set by …* under a standing block that already says the rule and who chose it',
        records: statline.length, pairs: pairs(statline), kinds: kindsOf(statline), walks: tally(statline.map(walkRoot)), examples: ex(statline, 6) },
      repeatedWords: { what: 'a whole sentence of the card\'s own words (tab labels removed) appearing twice',
        records: repeats.length, pairs: pairs(repeats.map((x) => x.r)), kinds: kindsOf(repeats.map((x) => x.r)),
        samples: tally(repeats.map((x) => x.r.kind + ' :: ' + x.hit.trim())), examples: ex(repeats.map((x) => x.r), 6) },
      sameMomentTwice: { records: timeTwice.length, kinds: kindsOf(timeTwice), examples: ex(timeTwice) },
      provenanceSaidMoreThanOnce: { records: prov.length, pairs: pairs(prov.map((x) => x.r)), kinds: kindsOf(prov.map((x) => x.r)),
        shapes: tally(prov.map((x) => x.p.map((s) => s.replace(/Set by the founder.*/, 'Set by the founder …')).join(' + '))), examples: ex(prov.map((x) => x.r)) },
    } });
}

/* ============================================================================
   D3 — a control with no job in its state
   ========================================================================== */
{
  const binAlone = R.filter((r) => r.commitRow.length === 1 && r.commitRow[0] === '🗑️');
  const binLabel = (r) => (buttons(r).find((b) => b.label === '🗑️') || {}).title || '';
  const withdraw = binAlone.filter((r) => /Withdraw|Discard this (motion|change)/.test(binLabel(r)));
  // 🗑️ "puts back" on a card where nothing can be put back: no input, and no
  // radio but the inert provenance one. The instrument records radios and
  // <input>s but not a contenteditable lane, a <select> or 🍾's glyph toggles,
  // so the kinds whose body holds one of those are left out rather than
  // counted wrongly: 🍾, ✉️, ❌, identity, and the birth's two before they settle.
  const UNSEEN_CONTROLS = new Set(['begin', 'door-invite', 'door-remove', 'identity', 'editing', 'stranger']);
  const putBackNothing = R.filter((r) => /Put it back/.test(binLabel(r)) && inputs(r).length === 0 &&
    !UNSEEN_CONTROLS.has(r.kind) && !(r.kind === 'birth' && /^(founding|answers|delegated)/.test(r.walk)) &&
    radios(r).every((x) => PROVENANCE_RADIO.test(x.label) || x.label === 'Chosen'));
  // a commit that can never arm: disabled, on a closed document
  const darkForever = R.filter((r) => isClosed(r) && buttons(r).some((b) => b.disabled && b.label !== '🗑️'));
  // the same act offered twice on one screen: the editing card's row and the proposal-row
  const doubled = R.filter((r) => r.proposalRow && r.commitRow.some((g) => (r.proposalRow.buttons || []).some((b) => b.t === g && g !== '🗑️')));
  const pressedOnOpen = R.filter((r) => r.findings.some((f) => /F6: pressed on open/.test(f)));
  const offersStanding = R.filter((r) => r.findings.some((f) => /F6: an option repeats/.test(f)));
  add({ id: 'D3', name: 'A control with no job in its state',
    severity: 2, affected: [...binAlone.filter((r) => !withdraw.includes(r)), ...putBackNothing, ...darkForever, ...doubled],
    count: new Set([...binAlone.filter((r) => !withdraw.includes(r)), ...putBackNothing, ...darkForever, ...doubled]).size,
    parts: {
      binAloneRow: { what: 'a commit row of 🗑️ alone (CP9: never)', records: binAlone.length, pairs: pairs(binAlone), kinds: kindsOf(binAlone),
        byRule_withdraw: withdraw.length, cp9Cases: binAlone.length - withdraw.length, walks: tally(binAlone.map(walkRoot)), examples: ex(binAlone, 6) },
      binPutsBackNothing: { what: '🗑️ titled *Put it back as it stands* on a card with nothing to put back', records: putBackNothing.length, pairs: pairs(putBackNothing), kinds: kindsOf(putBackNothing), examples: ex(putBackNothing, 6) },
      darkCommitOnClosed: { what: 'a disabled commit on a closed document — a thaw that never comes (CP9)', records: darkForever.length, kinds: kindsOf(darkForever),
        buttons: tally(darkForever.flatMap((r) => buttons(r).filter((b) => b.disabled && b.label !== '🗑️').map((b) => r.kind + ' ' + (b.label || b.title)))), examples: ex(darkForever) },
      sameActTwiceOnScreen: { what: 'the editing card\'s ✏️ and the proposal-row\'s ✏️, both live, one act', records: doubled.length, examples: ex(doubled) },
      pressedOnOpen: { records: pressedOnOpen.length, examples: ex(pressedOnOpen) },
      optionRepeatsStanding: { what: 'card-audit F6: an option block offers back the rule that stands', records: offersStanding.length, kinds: kindsOf(offersStanding), examples: ex(offersStanding) },
    } });
}

/* ============================================================================
   D4 — the same idea drawn two (or more) ways
   ========================================================================== */
{
  // how a card's head is built, per kind
  const headForm = (r) => r.strings.eyebrow ? 'eyebrow + clause'
    : (r.strings.head || '').trim() ? (radios(r).some((x) => PROVENANCE_RADIO.test(x.label)) ? 'rule as block + provenance radio' : 'title or sentence')
    : 'no head (strip only)';
  const forms = {}; for (const r of R) { (forms[r.kind] = forms[r.kind] || new Set()).add(headForm(r)); }
  const headFormsAll = tally(R.map(headForm));
  // the ways a card that only asks to be seen is closed / acknowledged
  const ackFaces = tally(R.filter((r) => buttons(r).some((b) => /acknowledge|OK|Accept|Activate/.test((b.label || '') + (b.title || '') + b.does)))
    .map((r) => r.commitRow.join(' ')));
  // withdraw said with the one glyph under three wordings, discard under two, close under two
  const binMeanings = tally(R.flatMap((r) => buttons(r).filter((b) => b.label === '🗑️').map((b) => b.title)));
  const rowShapes = tally(R.map((r) => r.commitRow.join(' ') || '(no row / empty)'));
  // the open card's vertical offset of its own tab: the band (0) against the charter (the eyebrow)
  const front = R.filter((r) => r.source !== 'live' && r.tab && r.tab.front && r.tab.travel && Math.abs(r.tab.travel[1]) <= 150);
  const tabDy = {}; for (const r of front) { const k = r.kind; (tabDy[k] = tabDy[k] || new Set()).add(Math.round(r.tab.travel[1])); }
  const clauseDy = {}; for (const r of R.filter((r) => r.source !== 'live' && r.clauseTravel && Math.abs(r.clauseTravel[1]) <= 150)) { (clauseDy[r.kind] = clauseDy[r.kind] || new Set()).add(Math.round(r.clauseTravel[1])); }
  // the records wearing a minority drawing of a shared idea: a 🗑️ that is not
  // *put back*, an acknowledgement that is not the plain OK
  const minority = R.filter((r) => buttons(r).some((b) => b.label === '🗑️' && !/^Put it back/.test(b.title || '')) ||
    /Accept|Activate/.test(r.commitRow.join(' ')));
  add({ id: 'D4', name: 'The same idea drawn two ways',
    severity: 1, affected: minority,
    count: Object.keys(headFormsAll).length + Object.keys(binMeanings).length + Object.keys(ackFaces).length,
    parts: {
      headForms: { what: 'how a card heads itself', forms: headFormsAll,
        kindsWithMoreThanOne: Object.fromEntries(Object.entries(forms).filter(([, v]) => v.size > 1).map(([k, v]) => [k, [...v]])) },
      binMeanings: { what: 'the tooltips one 🗑️ glyph carries', distinct: Object.keys(binMeanings).length, meanings: binMeanings },
      acknowledgeFaces: { what: 'the commit rows of cards whose act is to acknowledge or accept', distinct: Object.keys(ackFaces).length, faces: ackFaces },
      commitRowShapes: { distinct: Object.keys(rowShapes).length, shapes: rowShapes },
      tabDropOnOpenByKind: Object.fromEntries(Object.entries(tabDy).map(([k, v]) => [k, [...v].sort((a, b) => a - b)])),
      clauseDropOnOpenByKind: Object.fromEntries(Object.entries(clauseDy).map(([k, v]) => [k, [...v].sort((a, b) => a - b)])),
    } });
}

/* ============================================================================
   D5 — two different things drawn alike
   ========================================================================== */
{
  const provRadio = R.filter((r) => radios(r).some((x) => PROVENANCE_RADIO.test(x.label)));
  const provOn = R.filter((r) => radios(r).some((x) => PROVENANCE_RADIO.test(x.label) && x.on));
  // one 🗑️, three acts that cost different things
  const binActs = { putBack: 0, withdraw: 0, discard: 0, close: 0 };
  for (const r of R) for (const b of buttons(r).filter((b) => b.label === '🗑️')) {
    const t = b.title || '';
    if (/^Put it back/.test(t)) binActs.putBack++; else if (/^Withdraw/.test(t)) binActs.withdraw++;
    else if (/^Discard/.test(t)) binActs.discard++; else binActs.close++;
  }
  const unnamedRadio = R.filter((r) => radios(r).some((x) => !x.label));
  // *Prefer this* on the keep lane of a quick card and on the standing rule of a consent card:
  // one label for "keep what stands" and for "choose the change" (sanctioned by Q1362/Q1377)
  const crownGreen = R.filter((r) => r.kind === 'crown-text');
  add({ id: 'D5', name: 'Two different things drawn alike',
    severity: 2, affected: [...provRadio, ...unnamedRadio, ...crownGreen],
    count: provRadio.length + unnamedRadio.length + crownGreen.length,
    parts: {
      provenanceAsRadio: { what: 'who chose a rule drawn as a pressed radio (*Chosen by …*), the same pill as a choice the reader made', records: provRadio.length, pressed: provOn.length, pairs: pairs(provRadio), kinds: kindsOf(provRadio), examples: ex(provRadio, 5) },
      oneBinManyActs: { what: '🗑️ for putting back an unsent value, for withdrawing a spent proposal (refund), for discarding a draft, and for closing', uses: binActs },
      unnamedRadio: { what: 'a radio with no label', records: unnamedRadio.length, kinds: kindsOf(unnamedRadio), examples: ex(unnamedRadio) },
      acceptDrawnAsDecided: { what: 'the 👑 Text question\'s ✒️ accept drawn solid green, which §9.1 keeps for ✓ (*decided*) — inventory finding 9', records: crownGreen.length, examples: ex(crownGreen) },
    } });
}

/* ============================================================================
   D6 — geometry that moves on open, or differs across widths
   ========================================================================== */
{
  // fixture walks only (the live walks travel the page to open a card), and a
  // travel past 150px is the walk's previous card collapsing above this one —
  // card-audit's P7 case, not this card's own geometry — so it is set aside
  const fx = R.filter((r) => r.source !== 'live');
  const own = (v) => Math.abs(v) <= 150;
  const artifacts = fx.filter((r) => (r.tab && r.tab.travel && !own(r.tab.travel[1])) || (r.clauseTravel && !own(r.clauseTravel[1])));
  const tabDrop = fx.filter((r) => r.tab && r.tab.front && r.tab.travel && Math.abs(r.tab.travel[1]) > 0.5 && own(r.tab.travel[1]));
  const tabSide = fx.filter((r) => r.tab && r.tab.front && r.tab.travel && Math.abs(r.tab.travel[0]) > 0.5);
  // the charter's closed clause is measured as its .anch box (12px padding
  // included) and the open one as its text, so the recorded 12px sideways is
  // the padding, not movement — checked by hand on quick-keys and race-purse
  const clauseSide = [];
  const clauseDrop = fx.filter((r) => r.clauseTravel && Math.abs(r.clauseTravel[1]) > 0.5 && own(r.clauseTravel[1]));
  // the same card's tab drop differing between 1600 and 390
  const byPair = {}; for (const r of tabDrop) (byPair[pairKey(r)] = byPair[pairKey(r)] || {})[r.width] = Math.round(r.tab.travel[1]);
  const widthDependent = Object.entries(byPair).filter(([, v]) => v[1600] !== undefined && v[390] !== undefined && v[1600] !== v[390]);
  const narrowGutters = tally(R.filter((r) => r.width === 390).map((r) => 'left ' + Math.round(r.card.r[0]) + ' · right ' + Math.round(390 - r.card.r[0] - r.card.r[2])));
  const hscroll = R.filter((r) => r.screen && r.screen.scrollW > r.screen.w);
  add({ id: 'D6', name: 'Geometry that moves on open, or across widths',
    severity: 2, affected: tabDrop,
    count: tabDrop.length + clauseSide.length,
    parts: {
      tabDropsOnOpen: { what: 'the front tab moves down when its card opens (card-audit P2 measures only sideways, by design)', records: tabDrop.length, pairs: pairs(tabDrop), kinds: kindsOf(tabDrop),
        drops: tally(tabDrop.map((r) => r.kind + ' ' + Math.round(r.tab.travel[1]) + 'px')), examples: ex(tabDrop, 5) },
      tabMovesSideways: { records: tabSide.length },
      clauseMovesSideways: { what: 'none: the recorded 12px is the closed box\'s padding (see the note above)', records: clauseSide.length },
      clauseMovesDown: { records: clauseDrop.length, kinds: kindsOf(clauseDrop), drops: tally(clauseDrop.map((r) => r.kind + ' ' + Math.round(r.clauseTravel[1]) + 'px')) },
      walkArtifactsSetAside: artifacts.length,
      widthDependentDrop: { what: 'one card, a different tab drop at 1600 and at 390', cards: widthDependent.length, sample: widthDependent.slice(0, 6) },
      narrowGutters,
      horizontalScroll: hscroll.length,
    } });
}

/* ============================================================================
   D7 — spacing and type off the scales
   ========================================================================== */
const css = await readFile(join(DESIGN, 'system.css'), 'utf8');
{
  const s1 = R.flatMap((r) => r.findings.filter((f) => f.startsWith('S1')).map((f) => f.slice(4).split(' — ')[0]));
  const s1Values = tally(R.flatMap((r) => r.findings.filter((f) => f.startsWith('S1')).map((f) => f.slice(4))));
  const h = R.flatMap((r) => r.findings.filter((f) => /^H\d/.test(f)));
  // the stylesheet: font sizes not on the type scale, and px lengths in margin/padding/gap off the 4px grid
  const lines = css.split(/\r?\n/);
  const fontOff = []; const spaceOff = [];
  lines.forEach((ln, i) => {
    const code = ln.replace(/\/\*.*?\*\//g, '');
    for (const m of code.matchAll(/font-size:\s*([^;}]+)/g)) {
      const v = m[1].trim();
      if (!/var\(--(t-|h\d|h-title)/.test(v) && !/^(inherit|1em|100%)$/.test(v)) fontOff.push({ line: i + 1, v });
    }
    for (const m of code.matchAll(/\b(margin|padding|gap)(-[a-z]+)?:\s*([^;}]+)/g)) {
      for (const px of m[3].matchAll(/(-?\d+(?:\.\d+)?)px/g)) {
        const n = Math.abs(+px[1]);
        if (n !== 0 && n % 4 !== 0 && n !== 1 && n !== 2) spaceOff.push({ line: i + 1, prop: m[1] + (m[2] || ''), v: px[0] });
      }
    }
  });
  add({ id: 'D7', name: 'Spacing and type off the scales',
    severity: 1, affected: R.filter((r) => r.findings.some((f) => /^(S1|H2|H4)/.test(f))),
    count: s1.length,
    parts: {
      cardAuditS1: { what: 'card-audit S1 sightings (a card box off the --s1…--s5 grid)', sightings: s1.length, bySelector: tally(s1), values: s1Values },
      helperText: tally(h.map((f) => f.split(':')[0] + ': ' + f.split(': ').slice(1).join(': '))),
      cssFontSizeOffScale: { declarations: fontOff.length, values: tally(fontOff.map((x) => x.v)), lines: fontOff.map((x) => x.line) },
      cssSpacingOffGrid: { declarations: spaceOff.length, values: tally(spaceOff.map((x) => x.v)), sample: spaceOff.slice(0, 20) },
    } });
}

/* ============================================================================
   D8 — copy saying the same thing in different words
   ========================================================================== */
{
  const all = R.map((r) => ownText(r)).join('\n');
  const phr = (re) => tally([...all.matchAll(re)].map((m) => m[0]));
  const provenance = phr(/(Chosen by the (Founder|membership)|Decided by the members\.|Set by the founder when the document was made\.|Changed by the Founder)/g);
  const withdraws = tally(R.flatMap((r) => buttons(r).filter((b) => /^Withdraw/.test(b.title || '')).map((b) => b.title)));
  const oks = tally(R.flatMap((r) => buttons(r).filter((b) => b.label === 'OK').map((b) => b.title || '(no title)')));
  const clauseEyebrows = tally(R.map((r) => r.strings.eyebrow).filter(Boolean).map((s) => s.replace(/:.*/, ': …')));
  const closeMoment = phr(/(closed at \d\d:\d\d|final as of \d\d:\d\d|No more changes to the document may be made after)/g);
  const radioWords = tally(R.flatMap((r) => radios(r).map((x) => x.label)));
  // the records carrying a minority phrasing of provenance, withdrawal or the closing moment
  const minorityCopy = R.filter((r) => /(Decided by the members\.|Set by the founder when the document was made\.|final as of \d\d:\d\d)/.test(ownText(r)) ||
    buttons(r).some((b) => /^Withdraw it/.test(b.title || '')));
  add({ id: 'D8', name: 'Copy saying the same thing in different words',
    severity: 1, affected: minorityCopy,
    count: Object.keys(provenance).length + Object.keys(withdraws).length + Object.keys(clauseEyebrows).length + Object.keys(closeMoment).length,
    parts: { provenancePhrasings: provenance, withdrawPhrasings: withdraws, okTooltips: oks, placeEyebrows: clauseEyebrows, closingMoment: closeMoment, radioWords } });
}

/* ============================================================================
   D9 — state contradictions
   ========================================================================== */
{
  const closed = R.filter(isClosed);
  const liveRadiosOnClosed = closed.filter((r) => radios(r).some((x) => /^(Choose this|Prefer this|Propose this|Choose ✒️)/.test(x.label)));
  const liveCommitOnClosed = closed.filter((r) => buttons(r).some((b) => !b.disabled && !['🗑️', 'OK'].includes(b.label) && !(r.kind === 'closing')));
  const askingOnClosed = closed.filter((r) => (r.strings.hints || []).some((h) => /waiting on you|yours to take|Give your answer/.test(h)));
  const takeBack = closed.filter((r) => /takes it back/.test(r.strings.all || ''));
  const undef = R.filter((r) => /undefined|NaN|\[object/.test(r.strings.all || ''));
  // provenance naming two different parties on one card
  const twoParties = R.filter((r) => { const t = ownText(r); return /members|membership/.test((t.match(/(Chosen by the membership|Decided by the members)/) || [''])[0]) && /(Chosen by the Founder|Changed by the Founder|Set by the founder)/.test(t) && /(Chosen by the membership|Decided by the members)/.test(t); });
  add({ id: 'D9', name: 'State contradictions — a card saying or offering what its state forbids',
    severity: 3, affected: [...liveRadiosOnClosed, ...liveCommitOnClosed, ...askingOnClosed, ...undef, ...twoParties],
    count: new Set([...liveRadiosOnClosed, ...liveCommitOnClosed, ...askingOnClosed, ...undef, ...twoParties]).size,
    parts: {
      actionRadiosOnClosedDocument: { records: liveRadiosOnClosed.length, pairs: pairs(liveRadiosOnClosed), kinds: kindsOf(liveRadiosOnClosed), walks: tally(liveRadiosOnClosed.map(walkRoot)), examples: ex(liveRadiosOnClosed, 6) },
      liveCommitOnClosedDocument: { records: liveCommitOnClosed.length, kinds: kindsOf(liveCommitOnClosed),
        commits: tally(liveCommitOnClosed.flatMap((r) => buttons(r).filter((b) => !b.disabled && !['🗑️', 'OK'].includes(b.label)).map((b) => walkRoot(r) + ' · ' + r.kind + ' · ' + (b.label || '✓') + ' — ' + (b.title || '')))), examples: ex(liveCommitOnClosed, 6) },
      tabAsksOnClosedDocument: { records: askingOnClosed.length, hints: tally(askingOnClosed.flatMap((r) => r.strings.hints.filter((h) => /waiting on you|yours to take|Give your answer/.test(h)).map((h) => walkRoot(r) + ' · ' + h))), examples: ex(askingOnClosed) },
      takeBackOnClosed: { records: takeBack.length, examples: ex(takeBack) },
      undefinedPrinted: { records: undef.length, examples: ex(undef) },
      provenanceTwoParties: { what: 'one card saying both the Founder and the membership chose the same value', records: twoParties.length, kinds: kindsOf(twoParties), examples: ex(twoParties) },
    } });
}

/* ============================================================================
   D10 — one place, several headings depending on how you got there
   ========================================================================== */
{
  // the rail entry's words against the front tab's tooltip against the card
  const mism = [];
  for (const r of R.filter((r) => r.rail && r.rail.text)) {
    const front = (r.strings.hints || []).find((h) => / — (close it|open it)$/.test(h));
    if (!front) continue;
    const tabLabel = front.split(' — ')[0].trim();
    const railLabel = r.rail.text.replace(r.rail.mark || '', '').trim();
    if (tabLabel && railLabel && !railLabel.startsWith(tabLabel) && !tabLabel.startsWith(railLabel.slice(0, 20))) mism.push({ r, tabLabel, railLabel: railLabel.slice(0, 60) });
  }
  // one key opened on different walks: distinct eyebrows/heads that are not value changes
  const byKey = {}; for (const r of R) { if (!r.strings.eyebrow) continue; (byKey[r.key] = byKey[r.key] || new Set()).add(r.strings.eyebrow.replace(/:.*/, ': …')); }
  const multi = Object.entries(byKey).filter(([, v]) => v.size > 1);
  // the rail naming the change and the tab naming the clause is M22 / C13 by
  // rule, so only the two faults are counted: the gap with two heads, and the
  // park card whose front tab is a patch's place
  const gapHeads = R.filter((r) => /^(The gap as it stands|A new clause after)/.test(r.strings.eyebrow || ''));
  const parkPlace = R.filter((r) => r.kind === 'park' && (r.strings.hints || []).some((h) => /place \d of \d/.test(h)));
  add({ id: 'D10', name: 'One place, several headings by entry point',
    severity: 1, affected: [...gapHeads, ...parkPlace],
    count: mism.length,
    parts: {
      railVsTab: { what: 'the rail entry and the front tab name the card differently', records: mism.length, pairs: pairs(mism.map((x) => x.r)), kinds: kindsOf(mism.map((x) => x.r)),
        samples: tally(mism.map((x) => x.r.kind + ' :: rail “' + x.railLabel + '” · tab “' + x.tabLabel + '”')), examples: ex(mism.map((x) => x.r)) },
      keysWithSeveralEyebrows: Object.fromEntries(multi.map(([k, v]) => [k, [...v]])),
      gapTwoHeads: { what: 'a gap is *The gap as it stands* on a race and *A new clause after: …* on your own draft', records: gapHeads.length, heads: tally(gapHeads.map((r) => r.kind + ' :: ' + r.strings.eyebrow.replace(/:.*/, ': …'))), examples: ex(gapHeads) },
      parkTabIsAPlace: { what: 'the park card\'s front tab tooltip names a patch place (*Whole charter · place 2 of 3*), not the clause', records: parkPlace.length, examples: ex(parkPlace) },
    } });
}

/* ============================================================================
   Static structure: the source's own shape
   ========================================================================== */
const SRC = ['cards.js', 'setup.js', 'band.js', 'session.js', 'session-view.html', 'live.js', 'composer.js', 'begin.js', 'door.js', 'wallets.js'];
const structure = {};
for (const f of SRC) {
  const t = await readFile(join(DESIGN, f), 'utf8');
  structure[f] = {
    lines: t.split(/\n/).length,
    commitRowEmitters: (t.match(/commitrow/g) || []).length,
    binBtnCalls: (t.match(/binBtn\(\)/g) || []).length,
    rightpairBuilders: (t.match(/rightpair/g) || []).length,
    perKeyBranches: (t.match(/\b(c\.k|k|key|c\.key)\s*(===|!==)\s*'/g) || []).length,
    locklineSites: (t.match(/lockline/g) || []).length,
  };
}
const sum = (f) => Object.values(structure).reduce((a, s) => a + s[f], 0);
structure.total = { commitRowEmitters: sum('commitRowEmitters'), binBtnCalls: sum('binBtnCalls'), rightpairBuilders: sum('rightpairBuilders'), perKeyBranches: sum('perKeyBranches'), locklineSites: sum('locklineSites') };

/* ============================================================================
   CLAUDE.md's Gotchas, hand-tagged by the class of mistake (stage 2's reading).
   The tag is a judgment, made once here so the count is reproducible:
     render   — state living in the DOM or in a render, destroyed or stale when the page re-renders (press, caret, drag, poll)
     readers  — one fact derived in two places (or one name meaning two things), and the two drifting
     frame    — the frame's geometry fixed per case: a tab, a hairline, a padding, a size that did not know its content
     presence — a part deciding its own presence or availability locally and the condition being missed
     alike    — two things drawn alike, or one thing built two ways
     twice    — one fact drawn twice
     nojob    — a control offered with no job, or a job with no control
     other    — engine, server, tooling, copy, rules: not a card-grammar mistake
   ========================================================================== */
const GOTCHAS = [
  ['open is said by depth', 'frame'], ['every radio says the same words', 'alike'], ['hold released by letting go', 'render'],
  ['a state class is a name two things answer to', 'readers'], ['nothing rebuilds under a press', 'render'], ['poll detached the held button', 'render'],
  ['both polls defer during a hold', 'render'], ['completed hold clicks twice', 'render'], ['wallet waits on its animation', 'render'],
  ['open rail entry lifts, not jumps', 'render'], ['closed pile margin 0 / tab 0px', 'frame'], ['display:contents defeats selector', 'frame'],
  ['tuck is padding as well as margin', 'frame'], ['one glyph size in every state', 'alike'], ['tab moved 570px (keepStill not adopted by the band)', 'alike'],
  ['rail a line off while fonts land', 'frame'], ['avatars align by box', 'frame'], ['7px emoji face specificity', 'frame'],
  ['imageOrientation load-bearing', 'other'], ['data swap under a caret', 'render'], ['half-typed date', 'render'],
  ['caret before non-editable span', 'other'], ['a keystroke never travels', 'render'], ['control evaluated only where drawn', 'presence'],
  ['tightened validator, stale generators', 'other'], ['current version is not a current place', 'readers'], ['a walk that pastes never types', 'other'],
  ['swallowed boot error', 'other'], ['every gap race shares one incumbent id', 'readers'], ['one comparison per race (page re-filtered the engine)', 'readers'],
  ['stale server over today\'s page', 'other'], ['a card the probe never opens', 'other'], ['🛡️ blind spot in the probe', 'other'],
  ['⏩ keeps 🌍 with the founder', 'other'], ['message written where nothing renders', 'presence'], ['a change carries a reason', 'other'],
  ['a pen change is an amendment', 'other'], ['who is owed an acknowledgement', 'other'], ['🍾 borrowed ✒️\'s glyph', 'alike'],
  ['every string passes STYLE', 'other'], ['the prose column invites', 'other'], ['write channel moves with the caret', 'presence'],
  ['blind slider unset is null vs undefined', 'readers'], ['a drag is a press held down', 'render'], ['title is an ask then a noun', 'readers'],
  ['settled ladder offered what stands back', 'twice'], ['debounce re-asks its guard', 'render'], ['press reads its answer from an older view', 'render'],
  ['page assumed a room bigger than one', 'other'], ['readout says which not why', 'other'], ['walk drives a control the surface reads differently', 'other'],
  ['evidence meter at 50%', 'other'], ['confidence bounded by evidence', 'other'], ['one card per decision', 'other'],
  ['composer lane with no MVAL key', 'readers'], ['🎩 settled() lived only in S', 'readers'], ['✋ 🖼️ null vs asked', 'readers'],
  ['unproposed draft survives a data swap', 'render'], ['saving is not discarding (stash)', 'render'], ['clicking a rail entry travels (constitution rail never did)', 'alike'],
  ['charter key NUL', 'other'], ['your own row clears the tab', 'frame'], ['meRow found the founder', 'readers'],
  ['an address is checked because it is the address', 'other'], ['the address is the machine\'s', 'other'], ['wide gate drawn, narrow gate acted', 'readers'],
  ['a grant is the holder\'s (hide missing)', 'presence'], ['data-set meant two things', 'readers'], ['may* vs can*', 'readers'],
  ['a wallet question is not a lock', 'readers'], ['syncGrantAcks reads a transition', 'render'], ['never infer a power from the DOM', 'readers'],
  ['spend-preview never on :hover', 'render'], ['quarter-way floor', 'other'], ['walletHeld is render state', 'render'],
  ['payload is text, the page escapes', 'other'], ['reading a document is a write', 'other'], ['none of the ladder ships', 'other'],
  ['engine log seeded with names', 'other'], ['a delegated card could not be taken back (three readers)', 'readers'], ['a gap race wore its tab twice', 'twice'],
  ['askOn rebuilt every race', 'other'], ['a helper handed over on one side only', 'presence'], ['a race changes with no event', 'other'],
  ['held by the membership read as asked', 'readers'], ['admit entry wore decided green', 'readers'], ['a member\'s invitation motion invisible', 'presence'],
  ['markdown printed as source (two renderers)', 'alike'], ['member paced by founder (visible walks ORDER)', 'readers'], ['🏛️ grant arrived with its question', 'presence'],
  ['version 0 means two things', 'readers'], ['a selection across an open card', 'other'], ['a paragraph listing its own tabs stops learning', 'alike'],
  ['proposal went out with a pressed Submitted', 'nojob'], ['stranded wore the live blue', 'alike'], ['✏️ lit on an empty wallet', 'nojob'],
  ['wallet not in the column\'s data key', 'render'], ['a control swapped in place stacks', 'render'], ['a race with the 4 s poll', 'render'],
  ['withdrawn invitee\'s link', 'other'], ['control read only on change', 'render'], ['log beside the store', 'other'],
  ['page errors written nowhere', 'other'], ['a CR in a line', 'other'], ['the road that lifts a hold ran no check', 'other'],
  ['a record\'s span in two line spaces', 'other'], ['a seed is not an origin', 'readers'], ['a record keyed by race id', 'readers'],
  ['a record owed its OK was in neither half of the strip', 'presence'],
];
const gotchas = { total: GOTCHAS.length, byClass: tally(GOTCHAS.map((g) => g[1])),
  surfaceShare: GOTCHAS.filter((g) => g[1] !== 'other').length };

/* --- out ---------------------------------------------------------------------- */
const ranked = [...classes].sort((a, b) => b.score - a.score).map((c) => ({ id: c.id, name: c.name, records: c.records, pairs: c.pairs, severity: c.severity, score: c.score }));
const clean = R.filter((r) => !touched.has(r.id));
const coverage = { records: R.length, withAnyFault: touched.size, clean: clean.length,
  cleanByKind: tally(clean.map((r) => r.kind)), faultsPerRecord: tally([...touched.values()].map((v) => v.length)) };
const out = { generated: new Date().toISOString(), from: 'design/proposal/inventory.json (' + R.length + ' records)', ranked, coverage, classes, structure, gotchas };
await writeFile(join(PROP, 'diagnosis-counts.json'), JSON.stringify(out, null, 1));
for (const c of classes) {
  console.log('\n## ' + c.id + ' ' + c.name + ' — records ' + c.records + ' (pairs ' + c.pairs + ') × severity ' + c.severity + ' = ' + c.score);
  if (process.argv.includes('--full')) console.log(JSON.stringify(c.parts, null, 1).slice(0, 4000));
}
console.log('\nranked', JSON.stringify(ranked.map((x) => x.id + ':' + x.score)));
console.log('coverage', JSON.stringify(coverage));
console.log('\nstructure', JSON.stringify(structure.total), '\ngotchas', JSON.stringify(gotchas));
