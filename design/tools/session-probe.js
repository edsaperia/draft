/* session-probe.js — the contamination guard for the cards.js extraction.
 *
 * Injected into session-view (live or the frozen /reference/ copy) in the
 * page's MAIN world — e.g. by appending a <script src="/tools/session-probe.js">
 * element — so it can reach the page's machinery: window.SESSION since stage 8
 * (session.js), or the script-global lexicals (SUGGS, toggle) on the frozen
 * reference copy.
 *
 * What it does, on load:
 *   1. Stubs motion: wraps matchMedia so prefers-reduced-motion reports true
 *      (REDUCED() reads it per call, so collapse/expand complete synchronously)
 *      and replaces smoothScrollBy (a function declaration, so reassignable)
 *      with an instant jump. The backgrounded automation tab never fires rAF;
 *      the probe therefore only ever measures end-states.
 *   2. Walks every SUGGS id: records the closed geometry of its clause(s) and
 *      gutter chips, opens it with toggle(id, false) — no scrolling, so all
 *      rects are viewport-stable — records the open card's geometry, the
 *      zero-movement deltas (chip travel, clause-text travel), and a
 *      whitespace-normalized hash of the card's outerHTML, then closes it.
 *   3. Records the rail (.qitem rects + wash custom properties), the document
 *      paragraphs and the toc, as a broad accidental-breakage net.
 *   4. Stores the payload in localStorage under probe:ref or probe:live
 *      (chosen from location.pathname; both pages share the origin), and if
 *      both payloads exist, compares them and writes a small report to
 *      window.__probeReport and a #probe-report <pre> appended to <body>
 *      (after all measurement, so it cannot disturb layout that matters).
 *
 * The comparison gate for Phase 2 of the extraction: zero geometry deltas
 * (|d| > 0.01px reported) and byte-identical normalized card HTML.
 */
(function () {
  'use strict';

  /* ---- 1. motion stubs ---------------------------------------------------- */
  const mmReal = window.matchMedia.bind(window);
  window.matchMedia = (q) => {
    if (/prefers-reduced-motion/.test(q)) {
      return { matches: true, media: q, addListener() {}, removeListener() {},
               addEventListener() {}, removeEventListener() {}, onchange: null,
               dispatchEvent() { return false; } };
    }
    return mmReal(q);
  };
  // Since stage 8 the machinery lives in session.js behind window.SESSION (the
  // frozen reference still has script-global lexicals), so the probe reads
  // whichever the page offers.
  const S = window.SESSION || null;
  const jump = (dy, done) => { window.scrollBy(0, dy); if (done) done(); };
  if (S) S.smoothScrollBy = jump;
  else { try { smoothScrollBy = jump; } catch (e) { /* const on some future version: tab must be foregrounded */ } }
  const suggIds = () => S ? S.SUGGS.map((s) => s.id) : (typeof SUGGS !== 'undefined') ? SUGGS.map((s) => s.id) : [];
  const toggleCard = (id) => S ? S.toggle(id, false) : toggle(id, false);
  const keysOf = (id) => S ? S.clauseKeysOf(id) : (typeof clauseKeysOf === 'function') ? clauseKeysOf(id) : [];

  /* ---- helpers ------------------------------------------------------------ */
  const R2 = (x) => Math.round(x * 100) / 100;
  // Since the merge (stage 8) the live charter stands under the constitution
  // band inside the one surface, so every y is taken from the top of the
  // charter's own .prose — the same origin the frozen page has at its top.
  let oy = 0;
  const rect = (el, oyy) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [R2(r.left + window.scrollX), R2(r.top + window.scrollY - (oyy === undefined ? oy : oyy)), R2(r.width), R2(r.height)];
  };
  const rects = (els) => Array.from(els).map((el) => rect(el));   // not .map(rect): the index would read as an origin
  const norm = (s) => s.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
  const hash = (s) => {
    let h1 = 5381, h2 = 52711;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = ((h1 * 33) ^ c) >>> 0;
      h2 = ((h2 * 31) + c) >>> 0;
    }
    return h1.toString(16) + '-' + h2.toString(16);
  };

  const docEl = document.getElementById('charter') || document.getElementById('doc') || document.querySelector('.doc');
  const setOrigin = () => {
    const prose = docEl.querySelector('.prose');
    oy = prose ? prose.getBoundingClientRect().top + window.scrollY : 0;
  };
  const label = /\/reference\//.test(location.pathname) ? 'ref' : 'live';

  /* ---- 2/3. the walk ------------------------------------------------------ */
  function measureClosedFor(id) {
    const keys = keysOf(id);
    return {
      keys,
      anch: keys.map((k) => rect(docEl.querySelector('.anch[data-key="' + k + '"], [data-key="' + k + '"]'))),
      chip: rect(docEl.querySelector('.achip[data-anchor="' + id + '"]')),
    };
  }

  function measureOpenFor(id) {
    const cards = Array.from(docEl.querySelectorAll('.sugg[data-card="' + id + '"]'));
    if (!cards.length) return null;
    return cards.map((card) => ({
      card: rect(card),
      head: rect(card.querySelector('.clausehead')),
      headclause: rect(card.querySelector('.clausehead .headclause')),
      rtext: rect(card.querySelector('.clausehead .rtext')),
      chip: rect(card.querySelector('.achip[data-anchor="' + id + '"]')),
      strip: rects(card.querySelectorAll('.achip')),
      lanebars: rects(card.querySelectorAll('.lanebar')),
      lanepicks: rects(card.querySelectorAll('.lanepick')),
      commit: rect(card.querySelector('.commitrow')),
      blocks: rects(card.querySelectorAll('.propblock')),
      html: norm(card.outerHTML),
    }));
  }

  function run() {
    const payload = { meta: { label, w: window.innerWidth, h: window.innerHeight },
                      rail: [], doc: {}, cards: {} };
    setOrigin();

    payload.doc.anchs = rects(docEl.querySelectorAll('.anch'));
    payload.doc.chips = rects(docEl.querySelectorAll('.achip'));
    payload.rail = Array.from(document.querySelectorAll('.qitem')).map((q) => {
      const b = q.querySelector('button');
      const cs = b ? getComputedStyle(b) : null;
      return { r: rect(q), wash: cs ? cs.getPropertyValue('--washcol').trim() : '',
               fill: cs ? cs.getPropertyValue('--fill').trim() : '' };
    });
    // the charter's own headings only (the merged page's contents rail leads
    // with the constitution), measured from the first of them
    const tocAs = Array.from(document.querySelectorAll('#toc a[data-toc]'));
    const toy = tocAs.length ? tocAs[0].getBoundingClientRect().top + window.scrollY : 0;
    payload.doc.toc = tocAs.map((a) => rect(a, toy));

    const ids = suggIds();
    for (const id of ids) {
      const entry = { closed: measureClosedFor(id) };
      try { toggleCard(id); } catch (e) { entry.err = String(e); }
      const open = measureOpenFor(id);
      if (open) {
        entry.open = open.map(({ html, ...rest }) => rest);
        entry.htmlHash = open.map((o) => hash(o.html)).join('|');
        entry.htmlLen = open.reduce((n, o) => n + o.html.length, 0);
        try { localStorage.setItem('probe:' + label + ':html:' + id, open.map((o) => o.html).join('\n@@CARD@@\n')); }
        catch (e) { /* quota: excerpts unavailable for this id */ }
        // zero-movement: chip travel and clause-text travel, both axes
        const c0 = entry.closed.chip, c1 = open[0].chip;
        if (c0 && c1) entry.chipTravel = [R2(c1[0] - c0[0]), R2(c1[1] - c0[1])];
        const a0 = entry.closed.anch[0], t1 = open[0].rtext;
        if (a0 && t1) entry.textTravel = [R2(t1[0] - a0[0]), R2(t1[1] - a0[1])];
        try { toggleCard(id); } catch (e) { entry.errClose = String(e); }
      } else {
        entry.noopen = true;
      }
      payload.cards[id] = entry;
    }

    localStorage.setItem('probe:' + label, JSON.stringify(payload));
    return payload;
  }

  /* ---- 4. compare --------------------------------------------------------- */
  function firstDiff(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return { at: i, a: a.slice(Math.max(0, i - 60), i + 80), b: b.slice(Math.max(0, i - 60), i + 80) };
  }

  function cmpRect(path, a, b, out) {
    if (!a && !b) return;
    if (!a || !b) { out.push(path + ': ' + (a ? 'missing in live' : 'missing in ref')); return; }
    for (let i = 0; i < 4; i++) {
      if (Math.abs(a[i] - b[i]) > 0.01) { out.push(path + ': ref ' + JSON.stringify(a) + ' vs live ' + JSON.stringify(b)); return; }
    }
  }

  function compare() {
    const ref = JSON.parse(localStorage.getItem('probe:ref') || 'null');
    const live = JSON.parse(localStorage.getItem('probe:live') || 'null');
    if (!ref || !live) return { status: 'need both runs', have: { ref: !!ref, live: !!live } };
    const out = [];
    if (ref.meta.w !== live.meta.w || ref.meta.h !== live.meta.h) {
      out.push('VIEWPORT MISMATCH: ' + JSON.stringify(ref.meta) + ' vs ' + JSON.stringify(live.meta) + ' — rerun at one size');
    }
    const walk = (path, a, b) => {
      if (Array.isArray(a) && a.length === 4 && typeof a[0] === 'number') return cmpRect(path, a, b, out);
      if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) { out.push(path + ': length ' + a.length + ' vs ' + (b && b.length)); return; }
        a.forEach((v, i) => walk(path + '[' + i + ']', v, b[i]));
        return;
      }
      if (a && typeof a === 'object') {
        for (const k of new Set([...Object.keys(a), ...Object.keys(b || {})])) {
          if (k === 'html' || k === 'meta') continue;
          walk(path + '.' + k, a[k], (b || {})[k]);
        }
        return;
      }
      if (a !== (b === undefined ? a : b)) out.push(path + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b));
    };
    walk('doc', ref.doc, live.doc);
    walk('rail', ref.rail, live.rail);
    for (const id of new Set([...Object.keys(ref.cards), ...Object.keys(live.cards)])) {
      const a = ref.cards[id], b = live.cards[id];
      if (!a || !b) { out.push('cards.' + id + ': ' + (a ? 'missing in live' : 'missing in ref')); continue; }
      walk('cards.' + id, { ...a, htmlHash: 0 }, { ...b, htmlHash: 0 });
      if (a.htmlHash !== b.htmlHash) {
        const ha = localStorage.getItem('probe:ref:html:' + id) || '';
        const hb = localStorage.getItem('probe:live:html:' + id) || '';
        out.push('cards.' + id + ': HTML differs ' + JSON.stringify(firstDiff(ha, hb)));
      }
    }
    return { status: out.length ? 'DIFFS: ' + out.length : 'IDENTICAL', diffs: out.slice(0, 40) };
  }

  /* ---- go ----------------------------------------------------------------- */
  let report;
  try {
    const payload = run();
    const summary = {
      label,
      cards: Object.fromEntries(Object.entries(payload.cards).map(([id, c]) => [id, {
        hash: c.htmlHash || null, len: c.htmlLen || 0,
        chipTravel: c.chipTravel || null, textTravel: c.textTravel || null,
        noopen: !!c.noopen, err: c.err || null,
      }])),
      counts: { cards: Object.keys(payload.cards).length, rail: payload.rail.length,
                anchs: payload.doc.anchs.length, chips: payload.doc.chips.length },
    };
    report = { ok: true, summary, compare: compare() };
  } catch (e) {
    report = { ok: false, error: String(e && e.stack || e) };
  }
  window.__probeReport = report;
  const pre = document.createElement('pre');
  pre.id = 'probe-report';
  pre.style.display = 'none';
  pre.textContent = JSON.stringify(report);
  document.body.appendChild(pre);
})();
