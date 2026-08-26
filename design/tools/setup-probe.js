/* setup-probe.js — the contamination guard for the constitution swap
 * (plan 367a, commit 8; the session-probe discipline applied to a surface
 * you have to *drive*).
 *
 * Injected into session-view.html — live, or the frozen copy in
 * /reference/ (tag post-merge) — in the page's MAIN world. It runs an
 * IDENTICAL public-DOM script on both pages (data-* attributes and page ids
 * only, no internals), snapshots after every step, stores the run under
 * localStorage, and when both runs exist compares them step by step.
 *
 * Determinism stubs, installed before anything runs:
 *   - matchMedia reports prefers-reduced-motion, so open/close/collapse
 *     complete synchronously (the backgrounded automation tab never fires
 *     rAF or un-clamped timers);
 *   - every setTimeout is captured, never scheduled; flushTimers() drains
 *     the queue in FIFO rounds (arrival theatre, the 10s assembly hold, the
 *     mail beat — all complete instantly and in one order);
 *   - Math.random returns 0.5, so the arrival jitter cannot differ.
 *
 * A step that cannot find its target records the miss as data — a miss on
 * both pages compares equal, a miss on one is exactly the kind of diff the
 * guard exists to catch. Diffs fail unless their scenario:step:region key
 * is in ALLOWLIST (allowlisted diffs are still printed).
 *
 * Commit-8 discipline: run live-vs-frozen while the live page is still
 * untouched and require IDENTICAL with an EMPTY allowlist — proving the
 * harness before it gates anything.
 */
(function () {
  'use strict';

  /* Diffs expected from a change in hand, keyed 'scenario:step:region'
   * (exact) or matched by pattern. Empty since the post-merge freeze
   * (stage 8, 2026-08-21): the reference is the merged page itself, so a
   * fresh comparison needs no allowances. Seed these only for an
   * intentional change, name each, and re-freeze when it lands. History:
   * the constitution swap allowlisted confirm-membership's band and rail
   * (invented p-fixture tallies became real blind counts); the merge
   * allowlisted geo.rail (tasks became margin-index entries) and the
   * post-confirm toc (headings from session.js). */
  const ALLOWLIST = [];
  /* Empty since the re-freeze of 2026-08-22 (the glyph rename: the
   * threshold 🌡️, the ramp 🪜, removal 🥾 — and with it the Proposals
   * preamble freeze the previous run had left pending). A fresh
   * comparison needs no allowances. */
  const ALLOW_RE = [];
  const allowed = (k) => ALLOWLIST.includes(k) || ALLOW_RE.some((re) => re.test(k));

  /* ---- determinism stubs -------------------------------------------------- */
  const mmReal = window.matchMedia.bind(window);
  window.matchMedia = (q) => {
    if (/prefers-reduced-motion/.test(q)) {
      return { matches: true, media: q, addListener() {}, removeListener() {},
               addEventListener() {}, removeEventListener() {}, onchange: null,
               dispatchEvent() { return false; } };
    }
    return mmReal(q);
  };
  const timerQ = [];
  window.setTimeout = (fn) => { timerQ.push(fn); return timerQ.length; };
  window.clearTimeout = (id) => { if (id >= 1) timerQ[id - 1] = null; };
  Math.random = () => 0.5;
  function flushTimers() {
    for (let round = 0; round < 24 && timerQ.length; round++) {
      const batch = timerQ.splice(0, timerQ.length);
      for (const fn of batch) { if (typeof fn === 'function') { try { fn(); } catch (e) { /* recorded via snapshot divergence */ } } }
    }
  }

  /* ---- snapshot ----------------------------------------------------------- */
  const R2 = (x) => Math.round(x * 100) / 100;
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return [R2(r.left + scrollX), R2(r.top + scrollY), R2(r.width), R2(r.height)];
  };
  const norm = (s) => s.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
  const hash = (s) => {
    let h1 = 5381, h2 = 52711;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = ((h1 * 33) ^ c) >>> 0;
      h2 = ((h2 * 31) + c) >>> 0;
    }
    return h1.toString(36) + '.' + h2.toString(36);
  };
  const REGIONS = {
    topbar: '.navbar',
    toc: '#toc',
    titlepara: '#titlepara',
    band: '#band',
    prose: '#prose',
    rail: '#rail',
  };
  function snapshot(err) {
    flushTimers();
    const snap = { err: err || null, geo: {} };
    for (const k of Object.keys(REGIONS)) {
      const el = document.querySelector(REGIONS[k]);
      snap[k] = el ? hash(norm(el.outerHTML)) : 'MISSING';
    }
    // the rail's entries by content: the margin index writes its layout onto
    // them (top, the wash fade's data-wash/data-fill, pinned/offclause), and
    // the frozen page wrapped them in a <ul>; neither is what the guard is for
    snap.rail = hash(Array.from(document.querySelectorAll('#rail .qitem')).map((li) => norm(li.outerHTML
      .replace(/ style="[^"]*"/g, '')
      .replace(/ data-(wash|fill|washkey)="[^"]*"/g, '')
      .replace(/<li class="[^"]*"/, '<li'))).join(''));
    snap.geo.cards = Array.from(document.querySelectorAll('.setupcard')).map(rect);
    snap.geo.cparas = Array.from(document.querySelectorAll('.cpara')).map(rect);
    snap.geo.rail = Array.from(document.querySelectorAll('#rail .qitem')).map(rect);
    snap.geo.chips = Array.from(document.querySelectorAll('.achip')).map(rect);
    return snap;
  }

  /* ---- public-DOM drivers ------------------------------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const click = (sel) => {
    const el = $(sel);
    if (!el) return 'no such target: ' + sel;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return null;
  };
  const typeInto = (sel, text) => {
    const el = $(sel);
    if (!el) return 'no such target: ' + sel;
    if ('value' in el && el.tagName !== 'DIV' && el.tagName !== 'SPAN') {
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      el.textContent = text;
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    return null;
  };
  const setSeat = (value) => {
    const sel = document.getElementById('devwho');
    if (!sel) return 'no dev dropdown';
    if (!Array.from(sel.options).some((o) => o.value === value)) {
      return 'no seat: ' + value;
    }
    sel.value = value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return null;
  };
  const hold = (sel) => {
    const el = $(sel);
    if (!el) return 'no such target: ' + sel;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    flushTimers(); // the assembly convenes and completes inside the queue
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return null;
  };

  /* ---- the scenarios ------------------------------------------------------ */
  /* Selector map verified against the live page, 2026-08-18: the title/email/
   * link birth order, the policy holder radios, the membership textarea, the
   * devff fast-forward, the seat dropdown values ('0' founder, '1'/'2' the
   * two invited members), the settled-card composer (data-mnum + the
   * 🏛️ data-holdmotion hold), and motion judging via data-motion/confirm. */
  const openTab = (k) =>
    click('#rail [data-card="' + k + '"], #rail [data-tab="' + k + '"], ' +
      '#doc [data-card="' + k + '"], #doc [data-tab="' + k + '"]');
  /* Re-derived 2026-08-21 (Q504(a)), against the founding as it now runs: the
   * birth is 🪶 → 📍 → 📧 and the ✒️/🪶 commit IS the send (there is no
   * separate sendverify control any more, which is what had been missing on
   * both sides since the commit-row grammar landed); the settings then arrive
   * one at a time in the constitution's own order, so a step can only reach
   * the card the one before it opened. Nothing is pre-answered, so every
   * choice here is a real click. */
  const founding = [
    ['arrive', () => null],
    ['open-title', () => openTab('title')],
    ['type-title', () => typeInto('.setupcard [data-titlelane]', 'Hollow Oak Club Charter')],
    ['confirm-title', () => click('.setupcard [data-confirm]')],
    ['open-link', () => openTab('slug')],
    ['confirm-link', () => click('.setupcard [data-confirm]')],
    ['open-email', () => openTab('myemail')],
    ['type-email', () => typeInto('.setupcard input[type="email"]', 'ada@example.org')],
    ['send-verify', () => click('.setupcard [data-confirm]')],
    ['click-magic-link', () => click('[data-act="clickmail"]')],
    ['open-the-pen', () => openTab('grant-pen')],
    ['ok-the-pen', () => click('.setupcard [data-ok]')],
    // 🛡️ takes its own place in ORDER, right behind the pen, and had never
    // been opened here (Q914). It is not a dead step and never could be: a
    // grant blocks nothing in ORDER, so the founding runs past an
    // unacknowledged shield and --strict has no miss to report — which is
    // exactly the shape that hid 🖼️ for four days (Q732). The two grants
    // are not interchangeable: the shield's card is the one carrying the
    // veto radios that name the setting they refuse (STYLE T6–T9).
    ['open-the-shield', () => openTab('grant-shield')],
    ['ok-the-shield', () => click('.setupcard [data-ok]')],
    ['open-visibility', () => openTab('chamber')],
    ['choose-visibility', () => click('.setupcard [data-set="chamber"][data-val="closed"]')],
    ['confirm-visibility', () => click('.setupcard [data-confirm]')],
    // 🪪 Admissions opens the Membership section, and the scenario never
    // learned it was there (Q910). Entry 94 (2026-08-26) re-typed 🪪 from
    // the register of members into the *price of admission* and moved it
    // above 🤝 — and since ORDER **is** the dependency list, an unanswered
    // 🪪 kept 🤝, 🎩, ✋ and 🖼️ from ever being born. One missing step, and
    // thirteen below it missed as one: the whole of the founding from the
    // Membership section down had no probe coverage.
    ['open-admissions', () => openTab('roster')],
    ['choose-admission', () => click('.setupcard [data-set="admission"][data-val="assembly"]')],
    ['confirm-admissions', () => click('.setupcard [data-confirm]')],
    // then 🤝, which asks only whether strangers may apply at all: what an
    // application costs is 🪪's, answered above
    ['open-applications', () => openTab('policy')],
    ['choose-join', () => click('.setupcard [data-set="joinBy"][data-val="invite"]')],
    ['confirm-applications', () => click('.setupcard [data-confirm]')],
    ['open-hat', () => openTab('hat')],
    ['choose-hat', () => click('.setupcard [data-set="hatPick"][data-val="member"]')],
    // 🎩 commits through the one commit control like every other setting
    // (Q522, 2026-08-21); it used to carry a data-hatgo of its own
    ['confirm-hat', () => click('.setupcard [data-confirm]')],
    ['open-name', () => openTab('myname')],
    ['type-name', () => typeInto('.setupcard input[data-txt="myname"]', 'Ada Lovell')],
    ['confirm-name', () => click('.setupcard [data-confirm]')],
    // 🖼️ is step 10 of the founding order and the probe had never opened it
    // (Q732, 2026-08-23) — which is how an emoji face rendered at 7px on the
    // Founded line for four days with every check green.
    ['open-picture', () => openTab('mypic')],
    // the picker is Unicode's now and opens on the first category, so a
    // named glyph is reached by searching for it — which is the control
    // Q732 added and the one worth walking
    ['search-emoji', () => typeInto('.setupcard [data-emojisearch]', 'fox')],
    ['choose-emoji', () => click('.setupcard .avopt[data-pic="e🦊"]')],
    ['confirm-picture', () => click('.setupcard [data-confirm]')],
    ['fast-forward', () => click('#devff')],
    ['seat-bo', () => setSeat('1')],
    ['seat-founder', () => setSeat('0')],
  ];

  const motions = [
    ['seat-bo', () => setSeat('1')],
    ['open-bar', () => openTab('bar')],
    ['raise-bar', () => typeInto('.setupcard [data-mnum]', '85')],
    ['hold-assembly', () => hold('.setupcard [data-holdmotion]')],
    ['seat-founder', () => setSeat('0')],
    ['open-bar-judging', () => openTab('bar')],
    ['pick-answer', () => click('.setupcard [data-motion]')],
    ['commit-answer', () => click('.setupcard [data-confirm]')],
    ['seat-cy', () => setSeat('2')],
    ['open-bar-cy', () => openTab('bar')],
    ['pick-answer-cy', () => click('.setupcard [data-motion]')],
    ['commit-answer-cy', () => click('.setupcard [data-confirm]')],
    ['reopen-bar', () => openTab('bar')],
    // *Close* left the surface with Q521(a); a card is closed by its own
    // mark, which is the one way in and out of every card there has ever been
    ['close-card', () => click('.setupcard .chipcol .achip')],
    ['seat-founder-final', () => setSeat('0')],
  ];

  const SCENARIOS = [['founding', founding], ['motions', motions]];

  /* ---- run, store, compare ------------------------------------------------ */
  const SIDE = /\/reference\//.test(location.pathname) ? 'ref' : 'live';
  const KEY = 'setup-probe:';
  const run = {};
  for (const [scName, steps] of SCENARIOS) {
    if (scName === 'motions') {
      // one fresh document per scenario: reload-free reset is not public
      // DOM, so motions runs on the state founding left behind plus its own
      // fast-forward — deterministic on both sides, which is all that matters
    }
    const out = [];
    for (const [stName, drive] of steps) {
      let err = null;
      try { err = drive(); } catch (e) { err = 'threw: ' + (e && e.message); }
      out.push([stName, snapshot(err)]);
    }
    run[scName] = out;
  }
  try { localStorage.setItem(KEY + SIDE, JSON.stringify(run)); } catch (e) { /* quota */ }

  const otherRaw = (() => {
    try { return localStorage.getItem(KEY + (SIDE === 'ref' ? 'live' : 'ref')); }
    catch (e) { return null; }
  })();
  const report = { side: SIDE, compared: false, diffs: [], allowed: [], steps: 0 };
  if (otherRaw) {
    report.compared = true;
    const mine = run;
    const theirs = JSON.parse(otherRaw);
    for (const [scName, steps] of SCENARIOS) {
      const a = mine[scName] || [];
      const b = theirs[scName] || [];
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        report.steps += 1;
        const [stName, sa] = a[i] || ['(missing)', null];
        const sb = (b[i] || [])[1] || null;
        const keyOf = (region) => scName + ':' + stName + ':' + region;
        const note = (region, detail) => {
          const k = keyOf(region);
          (allowed(k) ? report.allowed : report.diffs).push(k + ' — ' + detail);
        };
        if (!sa || !sb) { note('step', 'present on one side only'); continue; }
        if ((sa.err || null) !== (sb.err || null)) note('err', sa.err + ' vs ' + sb.err);
        for (const r of Object.keys(REGIONS)) {
          if (sa[r] !== sb[r]) note(r, 'html hash differs');
        }
        for (const g of Object.keys(sa.geo)) {
          const ga = JSON.stringify(sa.geo[g]);
          const gb = JSON.stringify((sb.geo || {})[g]);
          if (ga !== gb) note('geo.' + g, 'geometry differs');
        }
      }
    }
  }
  window.__probeReport = report;
  const pre = document.createElement('pre');
  pre.id = 'probe-report';
  pre.textContent = JSON.stringify(report, null, 1);
  document.body.appendChild(pre);
})();
