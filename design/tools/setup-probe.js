/* setup-probe.js — the contamination guard for the constitution swap
 * (plan 367a, commit 8; the session-probe discipline applied to a surface
 * you have to *drive*).
 *
 * Injected into setup.html — live, or the frozen copy in
 * /reference/setup-pre-constitution/ — in the page's MAIN world. It runs an
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

  /* Diffs expected from the swap, keyed 'scenario:step:region'. Seeded from
   * the known mock bugs the module fixes; empty for the self-proof run. */
  const ALLOWLIST = [];

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
    topbar: '.topbar',
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
    snap.geo.cards = Array.from(document.querySelectorAll('.setupcard')).map(rect);
    snap.geo.cparas = Array.from(document.querySelectorAll('.cpara')).map(rect);
    snap.geo.rail = Array.from((document.getElementById('rail') || { children: [] }).children).map(rect);
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
  const founding = [
    ['arrive', () => null],
    ['open-title', () => openTab('title')],
    ['type-title', () => typeInto('.setupcard [data-titlelane]', 'Hollow Oak Club Charter')],
    ['confirm-title', () => click('.setupcard [data-confirm]')],
    ['open-email', () => openTab('myemail')],
    ['type-email', () => typeInto('.setupcard input[type="email"]', 'ada@example.org')],
    ['send-verify', () => click('[data-act="sendverify"]')],
    ['click-magic-link', () => click('[data-act="clickmail"]')],
    ['confirm-link', () => click('.setupcard [data-confirm]')],
    ['open-policy', () => openTab('policy')],
    ['choose-holder', () => click('.setupcard [data-set="rosterBy"][data-val="roster"]')],
    ['choose-join', () => click('.setupcard [data-set="joinBy"][data-val="invite"]')],
    ['confirm-policy', () => click('.setupcard [data-confirm]')],
    ['open-membership', () => openTab('roster')],
    ['paste-invites', () => typeInto('.setupcard [data-emails]',
      'bo@example.org\ncy@example.org')],
    ['send-invites', () => click('.setupcard [data-act="invite"]')],
    ['confirm-membership', () => click('.setupcard [data-confirm]')],
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
    ['close-card', () => click('.setupcard [data-close]')],
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
          (ALLOWLIST.includes(k) ? report.allowed : report.diffs).push(k + ' — ' + detail);
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
