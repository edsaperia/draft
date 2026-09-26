/**
 * card-audit.mjs — every decision card on the surface, read at once.
 *
 * Ten STYLE.md passes have each audited whatever had just been built, which
 * leaves two blind spots. A chronological audit cannot see *between* cards —
 * T5's *one label per rung, everywhere*, T9's *one voice*, §1's glyph table
 * all quantify over the whole surface, and nothing has ever read card 1
 * against card 40. And every finding in ten passes is a sentence; none is a
 * measurement, though the rules governing Ed's three lenses are numeric and
 * already written down (`.commitrow .btn { height: 2.5rem }`, the `--t-*`
 * scale, the `--s1`–`--s5` grid, *every radio lines up down its left edge*,
 * *one flat disabled look*).
 *
 * So this is one instrument with one payload: the strings of every card, and
 * beside them the pixels. It borrows rather than invents — the founding drive
 * and the `snap()` shape from `scripts/founding-walk.mjs`, the motion stubs,
 * the `SESSION.toggle` walk and `rect()` from `design/tools/session-probe.js`.
 *
 *   node design/tools/card-audit.mjs              # the summary, + the payload on disk
 *   node design/tools/card-audit.mjs --json       # the payload on stdout
 *   node design/tools/card-audit.mjs --walk=charter,founding
 *   node design/tools/card-audit.mjs --width=1280 --height=900 --out=b.json
 *   node design/tools/card-audit.mjs --baseline=b.json   # keep only what both sizes saw
 *   node design/tools/card-audit.mjs --strict     # …and exit 1 if anything is left
 *
 * **Two harness rules it encodes**, both learned here already: one window
 * size and scroll 0 on every run — a restored scroll position reads as a
 * constant offset in every rect — and a real pointer wherever a hold is
 * involved, since a synthetic `.click()` does not choose a rung.
 *
 * It is a **review**: it opens cards, measures them and writes JSON. It
 * changes nothing, and a geometry finding it reports is a candidate until it
 * has been re-run at a second window size (findings that move with the
 * viewport are layout facts, not defects).
 *
 * **And the exit code says so**: 0 whatever the run finds, which is what CI
 * reads. `--strict` is the other reading, for a caller who wants a verdict
 * rather than a report — exit 1 while anything is left in the list. Nothing
 * a lens excuses ever reaches that list: the power tabs' ✒️ and 🛡️, the
 * lifecycle marks and 📧 are exempted where G2 counts, a motion wearing its
 * host's glyph counts as its host (SURFACE E10, M18), the hostless
 * paragraphs are named in P8, and under `--baseline` a finding that moved
 * with the window is dropped as a layout fact. So a strict red is a card
 * nobody has excused, and the flag exists so that the gotchas naming this
 * instrument can be given a guard that goes red the day that is wanted.
 *
 * **The surface redesign's checks, P13–P33** (Q1541 stage 0, 2026-09-25) —
 * `design/redesign/checks.md`'s *checks as ruled* is their specification and
 * `design/redesign/answers.md` wins over it. They read the same openings as
 * P1–P12 plus two of their own: P13 opens each card again **by its own tab**
 * from a scroll that leaves its label room above it (the general case) and
 * the walk's first card at scroll 0 (the page-top case), and reads the glass,
 * not the page. They print as their own table, as ruled and v2-comparable,
 * and they are **held only for the kinds in `GRAMMAR_KINDS`**:
 *
 *   node design/tools/card-audit.mjs --walk=all             # the nine walks, P13–P33 among the findings
 *   node design/tools/card-audit.mjs --strict --kinds=GRAMMAR_KINDS --walk=fixture   # CI's fast pass
 *   node design/tools/card-audit.mjs --width=390 --height=844 --baseline=<1600 payload>  # P31
 *
 * `--walk=fixture` is the four walks that open `?fixture=session` and need no
 * founding drive, and since Q1541 stage 1 `stranger` beside them (the band
 * pilot's one home, reached by the in-page ⏩); `--walk=all` adds
 * `sessionband` and `closedband` to the
 * default seven (which `copy-check --walk` freezes, so they stay its default).
 */
import { createServer } from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const DESIGN = join(ROOT, 'design');

const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.split('=').slice(1).join('=') : dflt;
};
const AS_JSON = process.argv.includes('--json');
/** a verdict instead of a report — see the header. The default exit never moves. */
const STRICT = process.argv.includes('--strict');
const VIEWPORT = { width: +arg('width', 1600), height: +arg('height', 1000) };
const OUT = arg('out', join(DESIGN, 'tools', 'card-audit.json'));
/** every walk opens the one surface */
const pageUrl = (base, query) => base + '/session-view.html' + (query || '');
const BASELINE = arg('baseline', null);
/** an extra query on every page the audit opens — `--query=a=1` audits the
 *  page as that switch draws it (kept from the paper mockup, Q1516 (6));
 *  absent, every address is unchanged */
const EXTRA_Q = arg('query', '');
const withQuery = (u) => (EXTRA_Q ? u + (u.includes('?') ? '&' : '?') + EXTRA_Q : u);
/** where to keep the specimens the card sheet is built from; off when absent */
const SPECIMENS = arg('specimens', null);
/** how big a box has to be before a specimen flattens it; 0 keeps the default */
const HEAVY = +arg('heavy', 0);
/**
 * **Which engine reads the cards** (2026-09-17). `--browser=` or
 * `DRAFT_BROWSER`, chromium by default — the default is the compatibility
 * promise, since every number this instrument has ever reported was measured
 * in Blink. A typo is refused rather than silently run as chromium, which
 * would make a clean cross-browser run out of a misspelling.
 */
const ENGINES = { chromium, webkit, firefox };
const BROWSER = arg('browser', process.env.DRAFT_BROWSER || 'chromium');
if (!ENGINES[BROWSER]) {
  console.error('no such browser: ' + BROWSER + ' — engines are ' + Object.keys(ENGINES).join(', '));
  process.exit(2);
}
/**
 * **The walks.** The first seven are the audit's own and its default, since
 * `copy-check --walk` freezes what they open; `sessionband` and `closedband`
 * (Q1541 stage 0, from phase one's inventory) open the band's cards on the
 * session and closed fixtures, which no other walk reaches — 🥂 and every
 * closed Rules card among them. `--walk=all` runs the nine, `--walk=fixture`
 * the four that open `?fixture=session` and so need no founding drive, and
 * `stranger` beside them: the fast strict pass CI runs (BUILD.md §2).
 */
/*
 * **`stranger`** (Q1541 stage 1) is the outsiders walk's stranger seat alone:
 * the band pilot, the stranger's settled rule card, lives there and on no
 * fixture (the session fixture seats no stranger at a band), so the fast
 * pass takes it beside the four fixture walks — it needs the in-page ⏩ and
 * no server. `--walk=all` leaves it out, `outsiders` already walking it.
 */
const ALL_WALKS = ['founding', 'answers', 'delegated', 'settled', 'outsiders', 'charter', 'closed', 'sessionband', 'closedband', 'stranger'];
const DEFAULT_WALKS = ALL_WALKS.slice(0, 7);
const FIXTURE_WALKS = ['charter', 'closed', 'sessionband', 'closedband', 'stranger'];
const WALK_ARG = arg('walk', DEFAULT_WALKS.join(','));
const WALKS = (WALK_ARG === 'all' ? ALL_WALKS.filter((w) => w !== 'stranger') : WALK_ARG === 'fixture' ? FIXTURE_WALKS : WALK_ARG.split(',')).filter(Boolean);
/**
 * **`GRAMMAR_KINDS` — the card kinds the redesign's checks hold strictly**
 * (BUILD.md §2). Empty in stage 0: every check P13–P33 reports and nothing
 * is held. Each stage that converts a family adds its kinds here, so a
 * converted card can never slide back while an unconverted one is not yet
 * held to rules it cannot meet. A kind is `kindOf(key)`'s answer.
 *
 * `--strict --kinds=GRAMMAR_KINDS` reads this list; `--kinds=a,b` names one
 * explicitly. With `--kinds` the verdict is the redesign checks' findings on
 * those kinds (and a walk that threw or measured nothing), never P1–P12's —
 * which is what lets CI hold the converted kinds while the older lenses stay
 * the report they have always been. Without `--kinds`, `--strict` is exactly
 * what it was.
 */
const GRAMMAR_KINDS = [
  // stage 1 (Q1541): the one shell's two pilots, one on each side of the page —
  // the stranger's settled rule card on the band, and a sealed record filed
  // on a clause of the charter. Both are declared by the shell itself
  // (`data-kind`), since neither is a key family: a stranger's 🌍 is the
  // founder's 🌍 by key, and a filed record is keyed as the quick card it was.
  'stranger-rule',
  'record-filed',
  // stage 2 (Q1541): the read-only and acknowledgement cards — the three
  // grants and the two gates drawn like them (*Accept*, answers Part 4 .23,
  // .24), 🍾 in every state (Part 6.8), and the room's side of a park on the
  // charter. The fast pass meets each: `sessionband` the grants, gates and 🍾
  // accepted, `charter` the park; their owed states are the founding walks'
  'grant',
  'gate',
  'begin',
  'park',
];
/**
 * **The stage the build has reached, and the stage each check turns strict
 * at** — BUILD.md §2's *strict from* column, for the checks it puts later
 * than the family's own stage. A held kind's finding on a check whose stage
 * has not come is reported, never held (Q1541 stage 2: the grants and 🍾 are
 * opened on the closed band too, where P29 is stage 7's).
 */
const STAGE = 2;
const STRICT_FROM = { 'closed-page': 7, 'closed-keeps-content': 7, 'closed-powers': 7, 'zone-overlap': 8, 'place-head': 6 };
const KINDS_ARG = arg('kinds', null);
const KINDS = KINDS_ARG == null ? null
  : KINDS_ARG === 'GRAMMAR_KINDS' ? GRAMMAR_KINDS : KINDS_ARG.split(',').filter(Boolean);
// a misspelt walk otherwise runs nothing, finds nothing and exits 0 — which is
// the one outcome this instrument treats as worse than a red run
const UNKNOWN = WALKS.filter((w) => !ALL_WALKS.includes(w));
if (!WALKS.length || UNKNOWN.length) {
  console.error('no such walk: ' + (UNKNOWN.join(', ') || '(none given)') + ' — walks are ' + ALL_WALKS.join(', '));
  process.exit(2);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

/** design/ over a free port, no traversal — probe.mjs's server. */
function serveDesign() {
  const server = createServer(async (req, res) => {
    // the decode is inside the guard: a malformed escape throws a URIError,
    // and an async handler that throws is an unhandled rejection, which takes
    // the whole run down rather than the one request
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = normalize(join(DESIGN, path === '/' ? '/session-view.html' : path));
      if (!file.startsWith(DESIGN + sep) && file !== DESIGN) { res.writeHead(403); return res.end(); }
      const s = await stat(file);
      const body = await readFile(s.isDirectory() ? join(file, 'index.html') : file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

/* ============================================================================
   The in-page half. Installed before anything runs, so the motion stubs are in
   place for the page's own boot: a backgrounded automation tab never fires
   rAF, so every transition has to complete synchronously or the instrument
   measures a frame that is still moving.
   ========================================================================== */
const IN_PAGE = () => {
  const mmReal = window.matchMedia.bind(window);
  window.matchMedia = (q) => (/prefers-reduced-motion/.test(q)
    ? { matches: true, media: q, addListener() {}, removeListener() {},
        addEventListener() {}, removeEventListener() {}, onchange: null, dispatchEvent() { return false; } }
    : mmReal(q));

  const R2 = (x) => Math.round(x * 100) / 100;
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [R2(r.left + window.scrollX), R2(r.top + window.scrollY), R2(r.width), R2(r.height)];
  };
  /**
   * **Text as a member reads it, which is not `textContent`.** The surface
   * keeps both labels of a two-state control in the markup and lets CSS pick
   * one (`.lanepick .on { display: none }`), so a plain read returns
   * “Prefer thisPreferred” and “IndifferentIndifferent” — and then T5's *one
   * label per rung* compares a doubled label against a clean one and reports
   * agreement as drift, or drift as agreement. Hidden subtrees are skipped.
   */
  const visText = (el) => {
    let s = '';
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { s += n.nodeValue; continue; }
      if (n.nodeType !== 1) continue;
      const st = getComputedStyle(n);
      if (st.display === 'none' || st.visibility === 'hidden') continue;
      // **A drawn glyph reads as its character** (Q1401). Since the subject,
      // wallet and commit glyphs became pictures they contribute nothing to
      // the text — so a commit button would read as empty, every label would
      // lose its glyph, and G2's *a subject glyph names one thing* would
      // compare nothing against nothing and pass. `data-char` is the
      // character the picture stands for, which is what a member reads.
      const ch = n.getAttribute && n.getAttribute('data-char');
      if (ch && String(n.tagName).toLowerCase() === 'svg') { s += ch; continue; }
      s += visText(n);
    }
    return s;
  };
  const txt = (el) => (el ? visText(el).replace(/\s+/g, ' ').trim() : null);
  const px = (v) => R2(parseFloat(v) || 0);

  /** The design system's own tokens, read off :root rather than copied. */
  const tokens = () => {
    const cs = getComputedStyle(document.documentElement);
    const raw = (n) => cs.getPropertyValue(n).trim();
    const rootPx = parseFloat(cs.fontSize) || 16;
    const hex2rgb = (h) => {
      const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
      if (!m) return h.trim();
      const n = parseInt(m[1], 16);
      return 'rgb(' + ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ')';
    };
    const rem = (n) => R2(parseFloat(raw(n)) * (/rem/.test(raw(n)) ? rootPx : 1));
    return {
      rootPx,
      ink: { bg: hex2rgb(raw('--bg')), fg: hex2rgb(raw('--fg')), muted: hex2rgb(raw('--muted')),
             border: hex2rgb(raw('--border')), light: hex2rgb(raw('--light')),
             primary: hex2rgb(raw('--primary')), primarySubtle: hex2rgb(raw('--primary-subtle')),
             primaryEmphasis: hex2rgb(raw('--primary-emphasis')), ok: hex2rgb(raw('--ok')) },
      type: { lead: rem('--t-lead'), body: rem('--t-body'), ui: rem('--t-ui'),
              small: rem('--t-small'), cap: rem('--t-cap'), micro: rem('--t-micro'),
              // the document's heading ladder (Q1402): the title standing in
              // its card, and its composer lane, are set at `--h-title`
              hTitle: rem('--h-title'), h1: rem('--h1'), h2: rem('--h2'), h3: rem('--h3') },
      space: [1, 2, 3, 4, 5].map((i) => px(raw('--s' + i))),
      shadow: { sm: raw('--shadow-sm'), md: raw('--shadow-md'), lg: raw('--shadow-lg'), xl: raw('--shadow-xl') },
    };
  };

  /* --- the three lenses, per open card ----------------------------------- */

  /** Ed's *buttons* lens: every control on the card's one commit row. */
  const buttons = (card) => Array.from(card.querySelectorAll('.commitrow button, .race-mid button')).map((b) => {
    const s = getComputedStyle(b);
    return {
      label: txt(b) || null, title: b.title || null,
      cls: b.className, disabled: !!b.disabled,
      pressed: b.getAttribute('aria-pressed'),
      r: rect(b),
      h: R2(b.getBoundingClientRect().height),
      bg: s.backgroundColor, border: s.borderTopColor, borderWidth: px(s.borderTopWidth),
      color: s.color, fontSize: px(s.fontSize), fontWeight: s.fontWeight,
      shadow: s.boxShadow === 'none' ? 'none' : s.boxShadow,
      opacity: s.opacity, radius: px(s.borderTopLeftRadius),
    };
  });

  /**
   * Ed's *positioning* lens. The radio is the loudest thing in a lane, and
   * every radio on a card lines up down its left edge — so what is measured
   * is the dot, not the button, since the button's box is the lane.
   */
  const radios = (card) => {
    // P5 needs the vertical too, and the box that carries it is the *row* —
    // the `.pick`, which holds the pill, its explanation and any fields the
    // option brings with it. Two rows are only comparable when nothing is
    // rendered between them: adjacent within one `.choice`, or the last of one
    // group and the first of the next with the two groups themselves adjacent.
    // Anything else (quorum's eyebrow, a trailing note) is a gap about
    // something other than the rhythm of the rungs.
    const flush = (a, b) => {
      if (!a || !b || a === b) return false;
      if (a.nextElementSibling === b) return true;
      const ga = a.parentElement; const gb = b.parentElement;
      return !!ga && !!gb && ga !== gb && ga.nextElementSibling === gb
        && a === ga.lastElementChild && b === gb.firstElementChild;
    };
    let prevRow = null;
    // `[role="switch"]` joins them (Ed, 254) so 🍾's power table stays measured
    // now that it is drawn with `.switch` rather than `.pick > .lanepick`. It
    // costs P1 nothing — that pass filters on `dot`, and a switch has none, so
    // a control with no radio mark never enters the left-edge comparison.
    return Array.from(card.querySelectorAll(
      '.lanepick, [role="radio"], [role="switch"], .pick > button')).map((b) => {
      const dot = b.querySelector('.dot');
      const row = b.closest('.pick') || b;
      const rr = rect(row);
      // the gap is taken from the two live rects and rounded once: rounding
      // top and height first and adding them put a 0.01 hair on a gap that
      // is exactly 16 whenever a row's height is fractional, which every row
      // in the document's face is at a 24.8px line box (Q1402)
      const gap = (prevRow && rr && flush(prevRow, row))
        ? R2(row.getBoundingClientRect().top - prevRow.getBoundingClientRect().bottom) : null;
      prevRow = row;
      return { label: txt(b), x: (rect(dot) || rect(b))[0], dot: !!dot,
               on: b.getAttribute('aria-pressed') === 'true'
                   || b.getAttribute('aria-checked') === 'true'
                   || b.classList.contains('on'),
               y: rr ? rr[1] : null, h: rr ? R2(row.getBoundingClientRect().height) : null,
               gap };
    });
  };

  /** Ed's *helper text* lens: everything on a card that is not the decision. */
  const HELPERS = '.lockline, .setnote, .rsub, .qwhy, .exp, .why, [data-placeholder], [data-ph]';
  const helpers = (card) => Array.from(card.querySelectorAll(HELPERS)).map((el) => {
    const s = getComputedStyle(el);
    return {
      cls: el.className || el.tagName.toLowerCase(),
      text: txt(el) || el.getAttribute('data-placeholder') || el.getAttribute('data-ph') || '',
      fontSize: px(s.fontSize), color: s.color, fontStyle: s.fontStyle,
      margin: [px(s.marginTop), px(s.marginRight), px(s.marginBottom), px(s.marginLeft)],
      y: (rect(el) || [0, 0])[1],
    };
  });

  /**
   * The spacing lens. Structural boxes only: a card's own frame, its head,
   * its field, its blocks and its row. Every element with a class would be
   * noise — what the 4px grid is a rule about is the boxes the card is
   * built from.
   */
  const BOXES = ['.setupcard', '.sugg', '.clausehead', '.headclause', '.field', '.propblock',
    '.lanebar', '.lanebox', '.commitrow', '.race-mid', '.pick', '.choice', '.fld',
    '.lockline', '.setnote', '.rsub', '.propblock .rtext'];
  const boxes = (card) => {
    const out = [];
    const done = new Set();     // one card element is often two selectors deep
    for (const sel of BOXES) {
      const els = card.matches(sel) ? [card] : [];
      els.push(...card.querySelectorAll(sel));
      els.slice(0, 4).forEach((el, i) => {
        if (done.has(el)) return;
        done.add(el);
        const s = getComputedStyle(el);
        out.push({ sel: sel + (i ? '[' + i + ']' : ''),
          m: [px(s.marginTop), px(s.marginRight), px(s.marginBottom), px(s.marginLeft)],
          p: [px(s.paddingTop), px(s.paddingRight), px(s.paddingBottom), px(s.paddingLeft)],
          gap: s.gap && s.gap !== 'normal' ? px(s.gap) : null,
          r: rect(el) });
      });
    }
    return out;
  };

  /**
   * **P12's reading — the card's hairlines, and what stands between them**
   * (Ed, 2026-09-24: *two hairlines with nothing between them on a card is a
   * defect and must never appear*). A hairline is a separator, not a box: an
   * element drawing a top or a bottom border and no side one (a `.recbox` or
   * a lane is boxed, and is content), or an `<hr>`. Content is what a reader
   * can see — a text run, a control, a picture, a box a caret can go in —
   * measured by its rect, never by the DOM order, since an empty `.field` or
   * a margin is exactly the nothing this is about. The strip is not the
   * card's body: its tabs hang outside the card's left edge.
   */
  const hairlines = (card, ghair) => {
    const vis = (el) => {
      for (let n = el; n && n !== card.parentElement; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
      }
      return true;
    };
    const inStrip = (el) => !!el.closest('.chipcol');
    const shown = (s, side) => px(s['border' + side + 'Width']) > 0 && s['border' + side + 'Style'] !== 'none' &&
      !/rgba\(0, 0, 0, 0\)|transparent/.test(s['border' + side + 'Color']);
    const name = (el) => el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : '');
    const lines = [];
    const content = [];
    const CONTENT = 'img, svg, input, textarea, select, button, canvas, video, [contenteditable="true"], ' +
      '[contenteditable="plaintext-only"], .av, .emojiface, .lanebox, .recbox';
    for (const el of card.querySelectorAll('*')) {
      if (inStrip(el)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      if (!vis(el)) continue;
      const s = getComputedStyle(el);
      if (el.matches(CONTENT)) { content.push([r.top, r.bottom]); continue; }
      if (el.tagName === 'HR' || (ghair && el.classList.contains('ghair'))) { lines.push({ y: r.top, el: name(el) }); continue; }
      if (el.closest('button, .btn, .lanepick, .lanebox, .recbox, .av')) continue;
      if (shown(s, 'Left') || shown(s, 'Right')) continue;
      if (shown(s, 'Top')) lines.push({ y: r.top, el: name(el) + ' (top)' });
      if (shown(s, 'Bottom')) lines.push({ y: r.bottom, el: name(el) + ' (bottom)' });
    }
    // every visible text run, by its own line boxes
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (!t.textContent.trim() || !t.parentElement || inStrip(t.parentElement) || !vis(t.parentElement)) continue;
      const range = document.createRange();
      range.selectNodeContents(t);
      for (const r of range.getClientRects()) if (r.width && r.height) content.push([r.top, r.bottom]);
    }
    lines.sort((a, b) => a.y - b.y);
    const between = (lo, hi) => content.some(([t, b]) => (t + b) / 2 > lo && (t + b) / 2 < hi);
    const out = [];
    if (lines.length && !between(-Infinity, lines[0].y)) out.push({ kind: 'top', a: lines[0].el });
    for (let i = 1; i < lines.length; i++) {
      // one line drawn twice at one height (a border and its neighbour's) is
      // one hairline to the eye, and a doubled weight is not this rule's
      if (lines[i].y - lines[i - 1].y < 1.5) continue;
      if (!between(lines[i - 1].y, lines[i].y)) {
        out.push({ kind: 'pair', a: lines[i - 1].el, b: lines[i].el, gap: R2(lines[i].y - lines[i - 1].y) });
      }
    }
    if (lines.length && !between(lines[lines.length - 1].y, Infinity)) out.push({ kind: 'bottom', a: lines[lines.length - 1].el });
    return out;
  };

  /**
   * **The glyph, not the tab.** The active tab is *supposed* to grow 8px out
   * to the left — the 8px goes on `padding-left` as well as on `width`, so
   * with `border-box` the content box stays 34px and the glyph still centres
   * in it. The promise is about the glyph, so the measurement has to be too,
   * and reading the tab's own rect reports the design as a defect on every
   * card. The content box is derived rather than read off a child element,
   * because the two surfaces put different markup inside the tab.
   */
  const glyphBox = (tab) => {
    if (!tab) return null;
    const r = tab.getBoundingClientRect();
    const s = getComputedStyle(tab);
    const l = r.left + window.scrollX + px(s.paddingLeft) + px(s.borderLeftWidth);
    const t = r.top + window.scrollY + px(s.paddingTop) + px(s.borderTopWidth);
    const w = r.width - px(s.paddingLeft) - px(s.paddingRight) - px(s.borderLeftWidth) - px(s.borderRightWidth);
    const h = r.height - px(s.paddingTop) - px(s.paddingBottom) - px(s.borderTopWidth) - px(s.borderBottomWidth);
    return [R2(l + w / 2), R2(t + h / 2), R2(w), R2(h)];
  };

  /** The strings, so one payload serves the copy lens too — founding-walk's `snap()` shape. */
  const strings = (card) => ({
    // the label above the first line: the eyebrow on today's builders, the
    // label slot on a card built on the one shell (Q1541 stage 1)
    eyebrow: txt(card.querySelector('.headlab, :scope > [data-slot="label"]')),
    head: txt(card.querySelector('.headrule, .headtitle, .clausehead .rtext')),
    // the standing rule drawn as block one (Q1167 (a)) — the F6 lens below
    // asks whether anything beneath it repeats or pre-answers it (Q1293)
    standing: (() => { const h = card.querySelector('.headrule.asblock');
      if (!h) return null;
      const r = h.querySelector('.lanepick, .standpill');
      return txt(h).replace(r ? txt(r) : '', '').trim(); })(),
    lock: txt(card.querySelector('.lockline')),
    // …and a shell card's field is its fact line, its body and its blocks
    body: txt(card.querySelector('.field, .lanes')) ??
      (card.querySelector(':scope > [data-slot="blocks"], :scope > [data-slot="fact"], :scope > [data-slot="body"]')
        ? [...card.querySelectorAll(':scope > [data-slot="fact"], :scope > [data-slot="body"], :scope > [data-slot="blocks"]')].map(txt).join('') : null),
    // **A composer's lane is an option like any other** (issue #19). It draws
    // `data-mval`, whose value is the clause sentence the lane would set — no
    // use at all to a reader asking *which rung is this*, which is what T5
    // compares. A lane that types a catalogue rung says so in `data-mset` /
    // `data-mrung`, and those are read first, so the lane, the founder's radio
    // (`data-set` / `data-val`) and the member's ladder (`data-ans` /
    // `data-ansval`) name one rung and T5 can put the three side by side.
    options: Array.from(card.querySelectorAll('[data-set],[data-ans],[data-val],[data-mval],[data-motion]')).map((el) => ({
      set: el.dataset.set || el.dataset.ans || el.dataset.mset || null,
      val: el.dataset.val || el.dataset.ansval || el.dataset.mrung || el.dataset.mval || el.dataset.motion || null,
      on: el.classList.contains('on') || el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-pressed') === 'true',
      // the option's name is its block's text since CP1 (2026-08-31): every
      // radio reads *Prefer this / Preferred*, so reading the button made T5
      // compare pressed states, not rung labels
      label: (() => { const p = el.closest('.pick');
        const t = p && p.querySelector('.opttext');
        return t ? txt(t) : txt(el); })(),
    })),
    inputs: Array.from(card.querySelectorAll('input,textarea')).map((i) => ({
      type: i.type || 'text', value: i.value, ph: i.placeholder || null,
    })),
    foot: Array.from(card.querySelectorAll('.commitrow button, .race-mid button')).map((b) => ({
      label: txt(b) || b.title, title: b.title || null, disabled: b.disabled,
    })),
    all: txt(card),
    /**
     * The card's **copy**, which is a narrower thing than its text: the
     * strings a member reads as the surface's own voice. The 🖼️ picker's
     * emoji are excluded by name — a face claims nothing about the
     * vocabulary, and scanning them reported 150 animals and fruit as
     * glyphs off the stable table.
     */
    copy: (() => {
      const bits = [];
      const add = (el) => { const t = txt(el); if (t) bits.push(t); };
      // `.rtext` is deliberately absent: on the charter a clause head is the
      // *members' own words*, and scanning them for project-speak reports the
      // Hollow Oak charter's "Ordinary spending on the running of the house"
      // as engine vocabulary. What the surface says is `.headrule`/`.headtitle`.
      card.querySelectorAll('.headlab, .headrule, .headtitle, .lockline, ' +
        '.setnote, .rsub, .qwhy, .exp, .why, .lanepick, .switch, ' +
        '.commitrow button, .race-mid button').forEach(add);
      card.querySelectorAll('input[placeholder],[data-placeholder],[data-ph]').forEach((el) => {
        if (el.closest('.emojibox, .avpick')) return;
        const t = el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || el.getAttribute('data-ph');
        if (t) bits.push(t);
      });
      card.querySelectorAll('button[title],[role="button"][title]').forEach((el) => {
        if (el.title && !el.closest('.emojibox, .avpick')) bits.push(el.title);
      });
      return bits.join(' · ');
    })(),
    /**
     * **A control's own help, which repeats by construction.** A tooltip and a
     * placeholder belong to the control they hang on, so two lanes carrying
     * the same *Say you prefer this proposal* is one string on two instances
     * of one control, not one fact with two homes. T36 subtracts these; every
     * other copy rule still reads them, since project-speak in a tooltip is
     * still project-speak.
     */
    hints: (() => {
      const out = [];
      card.querySelectorAll('input[placeholder],[data-placeholder],[data-ph]').forEach((el) => {
        if (el.closest('.emojibox, .avpick')) return;
        const t = el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || el.getAttribute('data-ph');
        if (t) out.push(t);
      });
      card.querySelectorAll('[title]').forEach((el) => {
        if (el.title && !el.closest('.emojibox, .avpick')) out.push(el.title);
      });
      return [...new Set(out)];
    })(),
  });

  /**
   * The closed geometry of a card's own tab and clause, taken *before* it is
   * opened, so *the tab you click does not move* can be checked as a delta
   * rather than asserted.
   */
  const closedGeo = (key) => {
    // …the birth's 🪶 included: its tab stands in #titlepara, not the band,
    // and went unmeasured for as long as this looked in the band alone (the
    // 10px step of 2026-09-06 lived exactly there)
    const tab = document.querySelector('#band [data-tab="' + CSS.escape(key) + '"], ' +
      '#titlepara [data-tab="' + CSS.escape(key) + '"], ' +
      '#charter .achip[data-anchor="' + CSS.escape(key) + '"], .achip[data-anchor="' + CSS.escape(key) + '"]');
    const para = tab ? tab.closest('.cpara, .anch, p') : null;
    /**
     * **A tab in a pile is not where its card is.** The tabs behind the front
     * one slide up under it, leaving a sliver each (`--peek`), so a stacked
     * tab's own rect is a position in the pile rather than a position beside
     * a clause — and a travel measured from it says nothing. Only the front
     * of a stack is measurable, and the rest are recorded as stacked.
     */
    const col = tab ? tab.closest('.chipcol') : null;
    const front = !!tab && !tab.classList.contains('behind') &&
      (!col || col.querySelector('.achip') === tab);
    /**
     * **Was this tab riding a row in the register?** P6 is a promise about the
     * identity pile on your own row, and ✋ 🖼️ 📧 exist before there is a
     * register to have a row in — 📧 is answered at the birth, where the card
     * is the founder's own address and no members list has been drawn. Read
     * from the *closed* posture, so the rule still fires when the card opens
     * somewhere else entirely, which is the bug it is for.
     */
    const onRow = !!(tab && tab.closest('.memrow'));
    /**
     * **Was this tab on a held-open gap?** A gap site's anchor and a live
     * insertion's are the one `.insert-anchor`, a box blank of text whose
     * height is the whole of what it says — and Q1334 fixes that height at
     * the tab's own 30px. Read closed, as the tab is: the gap is a resting
     * object in the margin, and the card that opens beneath it has a head of
     * its own.
     */
    const gap = tab ? tab.closest('.insert-anchor') : null;
    // the redesign checks' closed reading (Q1541): the closed paragraph's words and first line, the zones,
    // and whether another card already stood open (then this is a switch)
    // a gap's anchor is its paragraph; an item with no tab of its own (behind
    // a pile) is found by the clause its engine key names
    let gpara = tab ? tab.closest('.cpara, .anch, .insert-anchor, p') : null;
    if (!gpara && window.SESSION && window.SESSION.clauseKeysOf) {
      try {
        const ck = (window.SESSION.clauseKeysOf(key) || [])[0];
        if (ck) gpara = document.querySelector('#charter [data-key="' + String(ck).replace(/["\\]/g, '\\$&') + '"]');
      } catch (e) { /* not a charter item */ }
    }
    const textEl = gpara && (gpara.querySelector('.cpv, .cptext') || gpara);
    const g = atZero(() => ({ glyph: glyphBox(tab), line: firstLine(textEl, '.headlab') }));
    return { tab: rect(tab), glyph: g.glyph, front, onRow,
             line: g.line, ptext: plainText(textEl, '.headlab, .lanebar, .speaker, button'),
             para: gpara ? nameOf(gpara) : null, anyOpen: !!openCardEl(), zones: stillZones(),
             gapH: gap ? R2(gap.getBoundingClientRect().height) : null,
             gapTabTop: gap && tab ? R2(tab.getBoundingClientRect().top - gap.getBoundingClientRect().top) : null,
             tabW: tab ? R2(tab.getBoundingClientRect().width) : null,
             text: rect(para && (para.querySelector('.cpv') || para)) };
  };

  /**
   * **The tab you click, where the eye has it.** `closedGeo`'s boxes are in
   * document coordinates, which is right for a walk that never scrolls: the
   * whole per-card loop runs at scroll 0 and a document reading and a viewport
   * reading are the same number there. The switch pass is the one place they
   * come apart, because the promise is kept by moving the *page* — the band
   * above the tab loses the closing card's height and the scroll gives back
   * exactly that much in the same frame — so a document-coordinate reading
   * would report the correction as the defect. This is what a member's eye is
   * doing, and nothing else in the payload is in these units.
   */
  const bandTabSeen = (key) => {
    // a quoted attribute value, so quotes and backslashes are the whole of
    // what the key has to be protected from — `CSS.escape` is for identifiers
    const q = String(key).replace(/["\\]/g, '\\$&');
    const g = glyphBox(document.querySelector('#band [data-tab="' + q + '"], #titlepara [data-tab="' + q + '"]'));
    return g ? [R2(g[0] - window.scrollX), R2(g[1] - window.scrollY), g[2], g[3]] : null;
  };

  /**
   * **What the card stands above.** A travel of `[0, 0]` says the *tab* did not
   * move; it does not say the *card* landed where the tab is, because a card
   * rendered somewhere else grows a tab strip of its own and the promise is
   * kept about the wrong object. The cheap witness is the next heading in
   * document order: the identity card drawn in your own row under *Members*
   * has *Applications for Membership* below it (Q1557), and one appended after the last subsection has
   * *Proposed for removal* above it and nothing below. The fold triangle is
   * skipped — it is furniture inside the heading, not the heading's name.
   */
  const nextHeadAfter = (el) => {
    const h = [...document.querySelectorAll('h2.docline')]
      .find((x) => el.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (!h) return null;
    return [...h.childNodes]
      .filter((n) => !(n.nodeType === 1 && n.classList.contains('sectoggle')))
      .map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim() || null;
  };

  /* --- the specimen, for the sheet --------------------------------------- */

  /**
   * **A specimen is the page, pruned to the boxes that position this card.**
   * The sheet's promise is that what you are looking at is draft's own markup
   * at its own geometry rather than a redrawing, so the card and its rail
   * entry are carried across untouched, with every ancestor they hang from.
   * What is *not* the specimen is flattened: a heavy block box outside it
   * keeps its tag, its classes and its measured size and loses its children,
   * because the only thing it contributes to the card is the space it takes.
   *
   * Two rules make the flattening geometry-neutral, and the sheet's own
   * verify pass proves it card by card rather than taking it on trust.
   * `box-sizing` is forced, since a measured rect is a border box and the
   * stub might be styled content-box; and nothing inside a marked element is
   * ever stubbed, however heavy — the 🖼️ picker draws the whole of Unicode
   * and is still part of the card it is on.
   */
  // chars of innerHTML worth flattening; `--heavy=` raises it, and a number
  // no page can reach is the control that says whether pruning moved anything
  const HEAVY = window.__CA_HEAVY || 600;
  const BLOCKISH = /^(block|flow-root|flex|grid|list-item|table|table-row-group|table-row|table-cell)$/;
  const specimen = (card, key) => {
    const rail = document.querySelector('#rail .qitem[data-q="' + CSS.escape(key) + '"]');
    const marks = [[card, 'card'], [rail, 'rail']].filter((m) => m[0]);
    marks.forEach((m) => m[0].setAttribute('data-specimen', m[1]));
    const keep = new Set();
    marks.forEach((m) => { for (let n = m[0]; n; n = n.parentElement) keep.add(n); });
    const inside = (n) => marks.some((m) => m[0].contains(n));
    const live = document.documentElement;
    const clone = live.cloneNode(true);
    const prune = (l, c) => {
      if (!l || !c || l.nodeType !== 1 || c.nodeType !== 1) return;
      if (!keep.has(l) && !inside(l) && c.innerHTML.length > HEAVY) {
        const s = getComputedStyle(l);
        if (BLOCKISH.test(s.display)) {
          const r = l.getBoundingClientRect();
          c.textContent = '';
          c.setAttribute('style', (c.getAttribute('style') || '') + ';box-sizing:border-box;width:'
            + R2(r.width) + 'px;height:' + R2(r.height) + 'px;');
          return;
        }
      }
      const lk = l.children; const ck = c.children;
      for (let i = 0; i < lk.length && i < ck.length; i++) prune(lk[i], ck[i]);
    };
    prune(live, clone);
    clone.querySelectorAll('script, link[rel="stylesheet"], template').forEach((n) => n.remove());
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.ceil(r.width), h: Math.ceil(r.height) };
    };
    /**
     * **The page's own stylesheet travels with the specimen.** `system.css`
     * and `setup.css` are two of three: session-view carries a third inline in
     * its head, and a mount given only the two files draws the card with a
     * slice of its rules missing — a few pixels of height on anything with a
     * field in it, which is exactly the kind of drift a sheet like this exists
     * to catch and would instead have been reporting as a defect.
     */
    const out = {
      html: clone.querySelector('body').outerHTML,
      css: [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n'),
      card: box(card), rail: box(rail),
    };
    marks.forEach((m) => m[0].removeAttribute('data-specimen'));
    return out;
  };

  /* --- the redesign's readings (Q1541: phase one's grammar-audit, carried in at stage 0) */
  /** every card root either page may draw: today's two, the prototype's one */
  const CARD_ROOTS = '.setupcard, .sugg[data-card], .gcard';
  const openCardEl = () => document.querySelector(CARD_ROOTS);
  const isVis = (el, stop) => {
    // the engine's own answer where it has one (Chromium, recent WebKit and
    // Gecko): an ancestor walk of computed styles per text node is most of a
    // card's reading time otherwise
    if (el.checkVisibility) return el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    for (let n = el; n && n !== stop; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    }
    return true;
  };
  /** things in a card that are not the card's own content: the strip and the fold */
  const NOT_CONTENT = '.chipcol, .sectoggle, script, style, template';
  /**
   * Every measurement of the still check is taken **at scroll 0**, then the
   * scroll is put back in the same task: a rail click travels to its card, so a
   * reading at whatever scroll the walk left would move every fixed or sticky
   * box by the travel, and the promise is about layout, not about the scroll.
   */
  const atZero = (fn) => {
    const sx = window.scrollX; const sy = window.scrollY;
    if (sx || sy) window.scrollTo(0, 0);
    try { return fn(); } finally { if (sx || sy) window.scrollTo(sx, sy); }
  };
  /** the first thing drawn in `el`, as its first line box: the first visible
   *  text run (or a drawn glyph standing for a character), ignoring the strip,
   *  the fold and anything in `skip` */
  const firstLine = (el, skip) => {
    if (!el) return null;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.currentNode; n; n = w.nextNode()) {
      const host = n.nodeType === 3 ? n.parentElement : n;
      if (!host || host.closest(NOT_CONTENT) || (skip && host.closest(skip))) continue;
      if (n.nodeType === 1) {
        if (!(String(n.tagName).toLowerCase() === 'svg' && n.getAttribute('data-char'))) continue;
        if (!isVis(n, el.parentElement)) continue;
        const r = n.getBoundingClientRect();
        if (r.width && r.height) return [R2(r.left + window.scrollX), R2(r.top + window.scrollY), R2(r.width), R2(r.height)];
        continue;
      }
      if (!n.nodeValue.trim() || !isVis(host, el.parentElement)) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width && r.height) return [R2(r.left + window.scrollX), R2(r.top + window.scrollY), R2(r.width), R2(r.height)];
      }
    }
    return null;
  };
  /** visible text, glyphs as their characters, minus the strip and `skip` */
  const plainText = (el, skip) => {
    if (!el) return null;
    const walk = (e) => {
      let s = '';
      for (const n of e.childNodes) {
        if (n.nodeType === 3) { s += n.nodeValue; continue; }
        if (n.nodeType !== 1) continue;
        if (n.matches(NOT_CONTENT) || (skip && n.matches(skip))) continue;
        const st = getComputedStyle(n);
        if (st.display === 'none' || st.visibility === 'hidden') continue;
        const ch = n.getAttribute('data-char');
        if (ch && String(n.tagName).toLowerCase() === 'svg') { s += ch; continue; }
        // a block boundary is a space to the reader
        s += (/^(block|flex|grid|list-item)$/.test(st.display) ? ' ' : '') + walk(n);
      }
      return s;
    };
    return walk(el).replace(/\s+/g, ' ').trim();
  };
  /** the paper, the column, the topbar and the contents rail — G1's still list */
  const stillZones = () => atZero(() => {
    const doc = document.getElementById('doc') || document.querySelector('.doc');
    const sheets = [...document.querySelectorAll('.desksheets .sheet')].filter((s) => {
      const r = s.getBoundingClientRect(); return r.width > 0 && r.height > 0 && isVis(s, null);
    }).map((s) => { const r = rect(s); return { cls: String(s.className), l: r[0], r: R2(r[0] + r[2]), t: r[1] }; });
    const pr = document.getElementById('prose');
    return { sheets, doc: rect(doc), prose: pr && pr.getBoundingClientRect().width ? rect(pr) : null,
      topbar: rect(document.querySelector('.navbar')), toc: rect(document.querySelector('nav.toc')) };
  });
  /** the card's head, by the grammar's reading: the prototype's head slot, or
   *  today's clause head, rule head or title head */
  const HEAD_SEL = ['[data-slot="head"]', '.clausehead .headclause .rtext', '.headrule', '.headtitle', '.clausehead .rtext'];
  const headOf = (card) => {
    for (const s of HEAD_SEL) {
      const el = card.querySelector(s);
      if (el && isVis(el, card.parentElement)) return { el, sel: s };
    }
    return null;
  };
  /** does `el` hold anything a reader can see, the strip aside */
  const CONTENTISH = 'img, svg, input, textarea, select, button, canvas, video, [contenteditable="true"], ' +
    '[contenteditable="plaintext-only"], .av, .emojiface, .lanebox, .recbox';
  const hasContent = (el) => {
    if (el.matches(NOT_CONTENT)) return true;          // the strip is its own thing
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const host = n.nodeType === 3 ? n.parentElement : n;
      if (!host || host.closest(NOT_CONTENT)) continue;
      if (n.nodeType === 3) {
        if (n.nodeValue.trim() && isVis(host, el.parentElement)) return true;
        continue;
      }
      if (n.matches(CONTENTISH)) {
        const r = n.getBoundingClientRect();
        if (r.width && r.height && isVis(n, el.parentElement)) return true;
      }
    }
    // a placeholder drawn by CSS is a lane saying what to type
    return !!el.querySelector('[data-placeholder], [data-ph], [placeholder]');
  };
  const nameOf = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
    (el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : '') +
    (el.dataset && el.dataset.slot ? '[data-slot=' + el.dataset.slot + ']' : '');
  /** a control's token as a reader reads it: its glyph, or its word */
  const tokenOf = (b) => {
    const t = (txt(b) || '').trim();
    if (!t && b.querySelector('svg.mkg')) return '✓';           // the drawn tick carries no data-char
    return t;
  };
  const okRgb = (() => { let v = null; return () => {
    if (v) return v;
    const p = document.createElement('span'); p.style.color = 'var(--ok)'; document.body.appendChild(p);
    v = getComputedStyle(p).color; p.remove(); return v; }; })();
  const RAW_RE = /\bundefined\b|\bNaN\b|\bnull\b|\[object|Invalid Date/;
  /** **v2's readings** (grammar.md v2 §2.3a, §2.5, G5, G6, P4): the labels,
   *  the note slot, the top edge, the blank under a card, and what a closed
   *  card says. DOM-generic, so today's page and the prototype read alike. */
  const LABEL_SEL = '.glab, .headlab, .fieldlab, .rechead, .rtag, .glabel, .pwhere, .eyebrow';
  const BLOCK_SEL = '.propblock, .pick:not(.vinblock), .ranked, .recbox, .replaced';
  const inkAboveOf = (card) => {
    let el = card.closest('.cpara.open') || card;
    for (let i = 0; i < 6 && el; i++) {
      let prev = el.previousElementSibling;
      while (prev && (!prev.getBoundingClientRect().height || getComputedStyle(prev).display === 'none' ||
        prev.matches('.chipcol, script, style, [hidden]'))) prev = prev.previousElementSibling;
      if (prev) {
        const w = document.createTreeWalker(prev, NodeFilter.SHOW_TEXT);
        let last = null;
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          if (!n.nodeValue.trim()) continue;
          const h = n.parentElement;
          if (!h || h.closest('.chipcol, .sr, [hidden]')) continue;
          last = n;
        }
        if (last) {
          const r = document.createRange(); r.selectNodeContents(last);
          const rs = [...r.getClientRects()].filter((q) => q.width > 0 && q.height > 0);
          if (rs.length) return Math.max(...rs.map((q) => q.bottom));
        }
        return prev.getBoundingClientRect().bottom;
      }
      el = el.parentElement;
      if (el && el.matches('.doc, #doc, #band, body')) break;
    }
    return null;
  };
  /** a label's drawing: size, weight, case, colour (P21 as ruled — one
   *  drawing, `--t-cap`, 700, upper case, `--muted`) */
  const drawOf = (el) => {
    const st = getComputedStyle(el);
    return { fs: R2(parseFloat(st.fontSize)), fw: String(st.fontWeight), tt: st.textTransform, color: st.color };
  };
  const v2Of = (card, key, head) => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && isVis(e, card.parentElement); };
    const firstTop = (el) => { const l = firstLine(el, LABEL_SEL); return l ? l[1] - window.scrollY : null; };
    const labels = [...card.querySelectorAll(LABEL_SEL)].filter((e) => !e.closest('.chipcol') && vis(e) && !(e.parentElement && e.parentElement.closest(LABEL_SEL)));
    const headTop = head ? firstTop(head.el) : null;
    // the blocks: outermost, visible, not inputs
    const blocks = [...card.querySelectorAll(BLOCK_SEL)].filter((b) => vis(b) && !(b.parentElement && b.parentElement.closest(BLOCK_SEL)) &&
      !(head && head.el.contains(b)) && !b.querySelector('[contenteditable="true"], textarea, input[type="text"], input:not([type])'));
    const out = { blocks: [], headLabel: null, headNeedsLabel: false };
    for (const b of blocks) {
      const live = [...b.querySelectorAll('.lanepick, [role="radio"]')].some((r) => !r.disabled && vis(r));
      const bt = firstTop(b);
      const own = labels.filter((l) => b.contains(l));
      let prev = b.previousElementSibling;
      while (prev && !vis(prev)) prev = prev.previousElementSibling;
      const above = prev && prev.matches(LABEL_SEL) ? prev : null;
      const lab = own[0] || above;
      const lt = lab ? lab.getBoundingClientRect().top : null;
      out.blocks.push({ cls: String(b.className).split(' ')[0], live, labelled: !!lab, label: lab ? txt(lab) : null,
        misplaced: !!(own[0] && bt != null && lt != null && lt > bt + 1), shared: !own.length && !!above && above.nextElementSibling !== b,
        // Q1541 stage 0 (P21 as ruled): is the label the block's first line —
        // its own, standing at or above the block's first words — and how it
        // is drawn
        first: !!(own[0] && (bt == null || (lt != null && lt <= bt + 1))),
        pick: b.matches('.pick'), draw: lab ? drawOf(lab) : null });
    }
    // the head's label: a label drawn above the head's first line, outside any block
    if (headTop != null) {
      const hl = labels.find((l) => !blocks.some((b) => b.contains(l)) && l.getBoundingClientRect().bottom <= headTop + 1);
      out.headLabel = hl ? { text: txt(hl), top: R2(hl.getBoundingClientRect().top) } : null;
      out.headNeedsLabel = blocks.length > 0 && !!(head && txt(head.el));
    }
    // Q1541 stage 0 (P15, P21): how many labels stand above the head's first
    // line, and how the first is drawn
    const hl1 = headLabelOf(card, head);
    out.headLabels = hl1 ? hl1.n : 0;
    if (hl1 && hl1.n) { out.headLabelDraw = drawOf(hl1.el); out.headLabelText = txt(hl1.el); }
    // P32: how many first lines the card shows — the head elements drawn,
    // outermost only, none inside a block
    out.heads = [...card.querySelectorAll(HEAD_SEL.join(', '))]
      .filter((e, i, a) => vis(e) && !e.closest('.chipcol') && !a.some((o) => o !== e && o.contains(e)) &&
        !blocks.some((b) => b.contains(e))).length;
    // the note slot: each dark commit's reason, as text in the row
    const rows = [...card.querySelectorAll('.commitrow, .race-mid, [data-slot="row"]')].filter((r) => vis(r) && !r.parentElement.closest('.commitrow, .race-mid, [data-slot="row"]'));
    out.notes = rows.map((r) => {
      const btns = [...r.querySelectorAll('button')].filter(vis);
      const dark = btns.filter((b) => b.disabled && !/^(OK|Accept|Activate)/.test((b.textContent || '').trim()) && !/🗑/.test(txt(b) || ''));
      let t = '';
      const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) { if (n.parentElement.closest('button') || !vis(n.parentElement)) continue; t += n.nodeValue; }
      const untils = new Set(dark.map((b) => b.getAttribute('data-until') || b.title || ''));
      return { dark: dark.length, reasons: untils.size, note: t.replace(/\s+/g, ' ').trim(), lines: r.querySelectorAll('.greason').length,
        // Q1541 stage 0 (P23): each dark commit, so its reason can be read
        darks: dark.map((b) => ({ tok: tokenOf(b).slice(0, 30), until: b.getAttribute('data-until'), title: b.title || null })) };
    });
    const boxes = [...card.querySelectorAll('textarea, input[type="email"], input.addr')].filter(vis);
    out.litOverEmpty = boxes.length > 0 && boxes.every((i) => !(i.value || '').trim()) &&
      rows.some((r) => [...r.querySelectorAll('button')].some((b) => vis(b) && !b.disabled && !/🗑/.test(txt(b) || '') && !/^(OK|Accept|Activate)/.test((b.textContent || '').trim())));
    // the top edge (G5)
    const cr = card.getBoundingClientRect();
    const ink = inkAboveOf(card);
    out.top = { card: R2(cr.top), ink: ink == null ? null : R2(ink), label: out.headLabel ? out.headLabel.top : null };
    // the blank under the last drawn slot (G6)
    let bottom = null;
    for (const ch of card.children) {
      if (ch.matches('.chipcol, .ghair') || !vis(ch)) continue;
      const st = getComputedStyle(ch);
      if (st.position === 'absolute' || st.position === 'fixed') continue;
      const r = ch.getBoundingClientRect(); bottom = bottom == null ? r.bottom : Math.max(bottom, r.bottom);
    }
    const pb = parseFloat(getComputedStyle(card).paddingBottom) || 0;
    out.blank = bottom == null ? null : R2(cr.bottom - pb - bottom);
    // a closed card's words (P4 v2)
    out.text = (txt(card) || '').slice(0, 2000);
    // Q1541 stage 0 — P17: the card against its strip (the floor, 1541.16 (c))
    const strip = card.querySelector('.chipcol');
    out.floor = { card: R2(cr.height), strip: strip && vis(strip) ? R2(strip.getBoundingClientRect().height) : null };
    // P20: the drawn slots' tops in reading order — the label, the head, each
    // block, each input outside a block, each row (grammar §2.3's order; the
    // fact and body slots carry no mark on today's page, so they are not read)
    const order = [];
    if (hl1 && hl1.n) order.push({ slot: 'label', y: hl1.top });
    if (headTop != null) order.push({ slot: 'head', y: R2(headTop) });
    for (const b of blocks) { const y = firstTop(b); if (y != null) order.push({ slot: 'block', y: R2(y) }); }
    const INPUTS = 'textarea, input[type="text"], input[type="email"], input:not([type]), [contenteditable="true"], [contenteditable="plaintext-only"], select';
    for (const i of [...card.querySelectorAll(INPUTS)]
      .filter((i) => vis(i) && !blocks.some((b) => b.contains(i)) && !(head && head.el.contains(i)))) {
      order.push({ slot: 'input', y: R2(i.getBoundingClientRect().top) });
    }
    for (const r of rows) order.push({ slot: 'row', y: R2(r.getBoundingClientRect().top) });
    out.order = order;
    // P21's words: what the card's own tab and rail entry call it — today's
    // titles, which Part 4 keeps for ✋ 🖼️ 📧 🌂 🎩 and the power cards
    const kq = CSS.escape(key);
    const ownTab = card.querySelector('.chipcol [data-tab="' + kq + '"], .chipcol [data-anchor="' + kq + '"], .chipcol [data-chip="' + kq + '"]');
    const railLi = document.querySelector('#rail [data-q="' + kq + '"], #rail [data-card="' + kq + '"]');
    out.asks = [ownTab && ownTab.title, railLi && txt(railLi.closest('li') || railLi)].filter(Boolean);
    // P33: the data-fact roles
    const facts = {};
    card.querySelectorAll('[data-fact]').forEach((e) => { if (!e.closest('.chipcol')) facts[e.dataset.fact] = (facts[e.dataset.fact] || 0) + 1; });
    out.facts = facts;
    // P19's presence half (Q1541 stage 1): on a card built on the one shell,
    // the slots drawn against the shell's own predicates over the card's
    // state — a slot drawn that the state says is empty, or missing that it
    // says is not
    if (card.hasAttribute('data-kind') && window.CARD_STATE && window.CARD_SHELL) {
      try {
        const st = window.CARD_STATE.stateOf(key);
        const P = window.CARD_SHELL.PRESENT;
        out.presence = [];
        for (const slot of ['label', 'fact', 'body', 'blocks', 'input', 'row']) {
          const drawn = !!card.querySelector(':scope > [data-slot="' + slot + '"]');
          if (drawn !== !!P[slot](st)) out.presence.push(slot + (drawn ? ' drawn, and the state says it is empty' : ' missing, and the state says it is not'));
        }
      } catch (e) { out.presence = ['the state could not be read: ' + (e && e.message)]; }
    }
    // P29's card half: a ✒️ or 🛡️ tab in this card's strip
    out.powerTabs = strip ? [...strip.querySelectorAll('.achip')].filter((t) => {
      const k = t.dataset.tab || t.dataset.anchor || t.dataset.chip || '';
      const g = [...t.querySelectorAll('svg[data-char]')].map((e) => e.getAttribute('data-char')).join('') + (t.textContent || '');
      return /^pw:/.test(k) || /[✒🛡]/.test(g);
    }).map((t) => t.dataset.tab || t.dataset.anchor || t.dataset.chip || '?') : [];
    // P24: can anything be typed on this card (a lane, a box, a composer)
    out.typeable = [...card.querySelectorAll(INPUTS)].some((i) => vis(i) && i.tagName !== 'SELECT');
    out.isRecord = card.matches('.sealed-open') || !!card.querySelector('.rechead, .gtone-ok') ||
      /^(rec:|held:)/.test(key);
    return out;
  };
  /** the grammar's readings of one open card; `before` is the closed reading */
  const grammarOf = (card, key, before) => {
    const out = {};
    const head = headOf(card);
    const openTab = card.querySelector('.achip[data-tab="' + CSS.escape(key) + '"], ' +
      '.achip[data-anchor="' + CSS.escape(key) + '"], [data-tab="' + CSS.escape(key) + '"]');
    // still, open half (doc coordinates at scroll 0)
    out.still = atZero(() => ({ glyph: glyphBox(openTab), line: head ? firstLine(head.el, '.headlab, .glab') : null }));
    out.still.zones = stillZones();
    // **the label's room** (Q1541 stage 1): how far the first line stands
    // below the label above it — the height the card makes above its first
    // line (1541.44), which is what the first line stands lower *in the
    // document* while it stands still on the glass (P14, below)
    const hlRoom = head ? headLabelOf(card, head) : null;
    out.room = hlRoom && hlRoom.n && out.still.line ? R2(out.still.line[1] - (hlRoom.top + window.scrollY)) : 0;
    // head-registration and head-form — the standing pill is who chose the
    // line, never the line's words (1541.47), so it is read out of them
    out.head = head ? { sel: head.sel, text: plainText(head.el, '.headlab, .glab, .lanebar, .speaker, .lanepick, button, [data-fact="pill"]'),
      el: nameOf(head.el) } : null;
    if (head) {
      const above = [];
      const w = document.createTreeWalker(card, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        if (head.el.contains(n) || n.contains && n.contains(head.el)) continue;
        if (!(n.compareDocumentPosition(head.el) & Node.DOCUMENT_POSITION_FOLLOWING)) break;
        const host = n.nodeType === 3 ? n.parentElement : n;
        if (!host || host.closest(NOT_CONTENT) || !isVis(host, card.parentElement)) continue;
        if (n.nodeType === 3) { if (n.nodeValue.trim()) above.push(n.nodeValue.trim()); }
        else if (n.matches('button, input, textarea, select, [role="radio"]')) above.push('[' + nameOf(n) + ']');
        else if (String(n.tagName).toLowerCase() === 'svg' && n.getAttribute('data-char')) above.push(n.getAttribute('data-char'));
      }
      out.head.above = above.join(' ').replace(/\s+/g, ' ').slice(0, 160);
      out.head.eyebrow = !!card.querySelector('.headlab') && isVis(card.querySelector('.headlab'), card.parentElement)
        ? txt(card.querySelector('.headlab')) : null;
    }
    // hairline-gap: P12's reading with the prototype's .ghair counted as a rule
    out.hair = hairlines(card, true);
    // empty-slot: direct children of the root, and of the head's container
    const empties = [];
    const heads = [...card.children].filter((c) => c.matches('.clausehead, [data-slot="head"]'));
    for (const par of [card, ...heads]) {
      for (const c of par.children) {
        if (c.matches(NOT_CONTENT)) continue;
        // a drawn rule is not a slot: the prototype's hairlines are elements
        // (`.ghair`), and hairline-gap is the check that judges them
        if (c.matches('.ghair, hr')) continue;
        const r = c.getBoundingClientRect();
        if (r.height <= 0 || !isVis(c, card.parentElement)) continue;
        if (!hasContent(c)) empties.push({ el: (par === card ? '' : nameOf(par) + ' > ') + nameOf(c), h: R2(r.height) });
      }
    }
    out.empty = empties;
    // the controls, strip aside
    const controls = [...card.querySelectorAll('button, input, textarea, select, [role="radio"], [role="switch"], .lanepick')]
      .filter((b, i, a) => !b.closest('.chipcol') && a.indexOf(b) === i && b.type !== 'hidden')
      .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && isVis(b, card.parentElement); })
      .map((b) => {
        const s = getComputedStyle(b);
        return { el: nameOf(b), tok: tokenOf(b).slice(0, 40), title: b.title || null,
          disabled: !!b.disabled || b.getAttribute('aria-disabled') === 'true',
          until: b.getAttribute('data-until'),
          radio: b.matches('.lanepick, [role="radio"]'),
          on: b.getAttribute('aria-checked') === 'true' || b.getAttribute('aria-pressed') === 'true' ||
            (b.matches('.lanepick') && (b.classList.contains('on') || !!(b.closest('.pick') && b.closest('.pick').classList.contains('on')))),
          sign: b.hasAttribute('data-sign'), close: b.hasAttribute('data-close'),
          green: s.backgroundColor === okRgb(),
          // Q1541 stage 0 (P26): the ink too, so an armed ✓ drawn green is seen
          inkGreen: s.color === okRgb(),
          inRow: !!b.closest('.commitrow, .race-mid, [data-slot="row"]') };
      });
    out.controls = controls;
    // the row(s), left to right
    const rows = [...card.querySelectorAll('.commitrow, .race-mid, [data-slot="row"]')]
      .filter((r, i, a) => !a.some((o) => o !== r && o.contains(r)))
      .filter((r) => { const b = r.getBoundingClientRect(); return b.height > 0 && isVis(r, card.parentElement); });
    out.rows = rows.map((r) => ({ el: nameOf(r), shape: r.getAttribute('data-shape'),
      tokens: [...r.querySelectorAll('button')].filter((b) => { const q = b.getBoundingClientRect(); return q.width > 0 && isVis(b, r.parentElement); })
        .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
        .map((b) => ({ t: tokenOf(b), title: b.title || null, disabled: !!b.disabled })) }));
    // an unsent value on the card
    out.unsent = [...card.querySelectorAll('input, textarea')].some((i) =>
      !/^(radio|checkbox|hidden|file|range|color|button|submit)$/.test(i.getAttribute('type') || i.type) && i.value && i.value.trim()) ||
      [...card.querySelectorAll('[contenteditable="true"], [contenteditable="plaintext-only"]')].some((e) => (e.textContent || '').trim()) ||
      !!card.querySelector('[data-draft]');
    out.bins = controls.filter((c) => /🗑/.test(c.tok)).map((c) => ({ title: c.title, inRow: c.inRow,
      // Q1541 stage 0 (P24): dark or lit, and whether it carries words
      disabled: c.disabled, word: c.tok.replace(/🗑️?/gu, '').trim() }));
    // raw values in the card and its rail entry
    const raw = [];
    const ct = txt(card) || '';
    const m1 = ct.match(RAW_RE);
    if (m1) raw.push('card: …' + ct.slice(Math.max(0, m1.index - 40), m1.index + 30) + '…');
    const q = String(key).replace(/["\\]/g, '\\$&');
    const li = document.querySelector('#rail [data-q="' + q + '"], #rail [data-card="' + q + '"]');
    const rt = li ? txt(li.closest('li') || li) || '' : '';
    const m2 = rt.match(RAW_RE);
    if (m2) raw.push('rail: …' + rt.slice(Math.max(0, m2.index - 40), m2.index + 30) + '…');
    out.raw = raw;
    // tooltips on the card's strip and its rail entry (closed-page)
    out.tips = [...card.querySelectorAll('.chipcol [title]')].map((e) => e.title)
      .concat(li ? [...(li.closest('li') || li).querySelectorAll('[title]')].map((e) => e.title).concat((li.closest('li') || li).title || []) : [])
      .filter(Boolean);
    out.closedBefore = before || null;
    try { out.v2 = v2Of(card, key, head); } catch (e) { out.v2 = { error: String(e && e.message || e) }; }
    return out;
  };
  /** the zones, on the glass at scroll 0, for zone-overlap */
  const zonesNow = () => atZero(() => {
    const W = window.innerWidth; const H = window.innerHeight;
    const clip = (el) => {
      if (!el || !isVis(el, null)) return null;
      const r = el.getBoundingClientRect();
      const l = Math.max(0, r.left); const t = Math.max(0, r.top);
      const rr = Math.min(W, r.right); const b = Math.min(H, r.bottom);
      return rr - l > 0.5 && b - t > 0.5 ? [R2(l), R2(t), R2(rr), R2(b)] : null;
    };
    const union = (els) => {
      const bs = els.map(clip).filter(Boolean);
      if (!bs.length) return null;
      return [Math.min(...bs.map((b) => b[0])), Math.min(...bs.map((b) => b[1])), Math.max(...bs.map((b) => b[2])), Math.max(...bs.map((b) => b[3]))];
    };
    const inDrawer = (el) => !!(el && el.closest('[class*="drawer"], [aria-modal="true"], dialog, .modal'));
    const z = [];
    const add = (name, group, box, el) => { if (box) z.push({ name, group, box, drawer: inDrawer(el) }); };
    const nav = document.querySelector('.navbar');
    add('topbar', 'topbar', clip(nav), nav);
    const toc = document.querySelector('nav.toc');
    add('contents-rail', 'toc', clip(toc), toc);
    const queue = document.querySelector('aside.queue');
    add('queue-rail', 'queue', clip(queue), queue);
    const sheets = [...document.querySelectorAll('.desksheets .sheet')];
    const doc = document.getElementById('doc') || document.querySelector('.doc');
    add('sheet', 'sheet', sheets.length ? union(sheets) : clip(doc), doc);
    const fl = new Set();
    document.querySelectorAll('#editdoor > *, #proserow, #patchrow, .proposalrow, [data-proposalrow]').forEach((e) => fl.add(e));
    // a card's own commit row can carry `.proposalrow` too; only what floats counts
    for (const e of fl) if (!e.closest(CARD_ROOTS)) add('floating:' + nameOf(e), 'floating', clip(e), e);
    // G4 v2: an overlay may cross a zone's edge but never a line of text
    for (const x of z) {
      if (x.group !== 'floating') continue;
      let covers = 0;
      for (const root of document.querySelectorAll('#doc, aside.queue, nav.toc')) {
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          if (!n.nodeValue.trim() || !n.parentElement || n.parentElement.closest('#editdoor, #proserow, #patchrow, .proposalrow')) continue;
          const r = document.createRange(); r.selectNodeContents(n);
          for (const q of r.getClientRects()) {
            if (!q.width || !q.height) continue;
            const ow = Math.min(q.right, x.box[2]) - Math.max(q.left, x.box[0]);
            const oh = Math.min(q.bottom, x.box[3]) - Math.max(q.top, x.box[1]);
            if (ow > 1 && oh > 1 && isVis(n.parentElement, null)) covers++;
          }
        }
      }
      x.covers = covers;
    }
    return z;
  });
  /** the page's tab and rail tooltips, for closed-page's page-wide half */
  const pageTips = () => [...document.querySelectorAll('.achip[title], #rail [title], #rail li[title]')]
    .map((e) => ({ key: e.dataset.anchor || e.dataset.tab || e.dataset.chip || e.dataset.q ||
      (e.closest('li') && e.closest('li').dataset.q) || null, title: e.title }));
  /** close whatever card stands open, by its own pressed tab */
  const closeOpenCard = (key) => {
    if (window.SESSION && window.SESSION.openId && document.querySelector('.sugg[data-card]')) {
      try { window.SESSION.toggle(window.SESSION.openId, false); return 'toggle'; } catch (e) { /* fall through */ }
    }
    const card = openCardEl();
    if (!card) return null;
    const k = key == null ? null : String(key).replace(/["\\]/g, '\\$&');
    const mark = (k && card.querySelector('.chipcol .achip[data-tab="' + k + '"], .chipcol .achip[data-anchor="' + k + '"]')) ||
      card.querySelector('.chipcol .achip.wmark') || card.querySelector('.chipcol .achip');
    if (!mark) return null;
    mark.click();
    return 'tab';
  };

  /* --- the redesign's on-screen reading (Q1541 stage 0: P13, P16, P31) ---
   *
   * `space-above` (answers 1541.44) is a promise about the **glass**, not the
   * page: the content above an opened card slides up and the scroll moves in
   * the same frame, so the first line and the pressed tab stay still *on
   * screen* while both move in document coordinates. Every other reading in
   * this file is taken at scroll 0 (`atZero`) for exactly the opposite
   * reason, so these are their own: viewport coordinates, at whatever scroll
   * the walk stands at, with the scroll recorded beside them.
   * ------------------------------------------------------------------------ */
  const vbox = (r) => [R2(r.left), R2(r.top), R2(r.width), R2(r.height)];
  /** where the glass starts: the topbar's foot when it is fixed or sticky
   *  (it is at both widths — two rows at 390), else the window's top */
  const glassTop = () => {
    const nav = document.querySelector('.navbar');
    if (!nav) return 0;
    const s = getComputedStyle(nav);
    return (s.position === 'fixed' || s.position === 'sticky') ? Math.max(0, R2(nav.getBoundingClientRect().bottom)) : 0;
  };
  /** the zones P13 holds still, on the glass: the topbar and the contents
   *  rail whole, each sheet by its left and right edges only (its top is
   *  content above — checks.md P13) */
  const glassZones = () => {
    const r = (el) => (el && isVis(el, null) ? vbox(el.getBoundingClientRect()) : null);
    const sheets = [...document.querySelectorAll('.desksheets .sheet')].filter((s) => {
      const q = s.getBoundingClientRect(); return q.width > 0 && q.height > 0 && isVis(s, null);
    }).map((s) => { const q = s.getBoundingClientRect(); return { cls: String(s.className), l: R2(q.left), r: R2(q.right) }; });
    return { topbar: r(document.querySelector('.navbar')), toc: r(document.querySelector('nav.toc')), sheets };
  };
  /** the foot of the last ink above `el` — its previous visible sibling's last
   *  text line, climbing out of wrappers — on the glass */
  const inkAboveFrom = (start) => {
    let el = start;
    for (let i = 0; i < 6 && el; i++) {
      let prev = el.previousElementSibling;
      while (prev && (!prev.getBoundingClientRect().height || getComputedStyle(prev).display === 'none' ||
        prev.matches('.chipcol, script, style, [hidden]'))) prev = prev.previousElementSibling;
      if (prev) {
        const w = document.createTreeWalker(prev, NodeFilter.SHOW_TEXT);
        let last = null;
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          if (!n.nodeValue.trim()) continue;
          const h = n.parentElement;
          if (!h || h.closest('.chipcol, .sr, [hidden]') || !isVis(h, null)) continue;
          last = n;
        }
        if (last) {
          const r = document.createRange(); r.selectNodeContents(last);
          const rs = [...r.getClientRects()].filter((q) => q.width > 0 && q.height > 0);
          if (rs.length) return R2(Math.max(...rs.map((q) => q.bottom)));
        }
        return R2(prev.getBoundingClientRect().bottom);
      }
      el = el.parentElement;
      if (el && el.matches('.doc, #doc, #band, body')) break;
    }
    return null;
  };
  /** a key's tab in the gutter and the paragraph it stands on — closedGeo's
   *  finding, shared so the glass reading and the page reading agree */
  const anchorOf = (key) => {
    const q = CSS.escape(key);
    const tab = document.querySelector('#band [data-tab="' + q + '"], #titlepara [data-tab="' + q + '"], ' +
      '#charter .achip[data-anchor="' + q + '"], .achip[data-anchor="' + q + '"]');
    let para = tab ? tab.closest('.cpara, .anch, .insert-anchor, p') : null;
    if (!para && window.SESSION && window.SESSION.clauseKeysOf) {
      try {
        const ck = (window.SESSION.clauseKeysOf(key) || [])[0];
        if (ck) para = document.querySelector('#charter [data-key="' + String(ck).replace(/["\\]/g, '\\$&') + '"]');
      } catch (e) { /* not a charter item */ }
    }
    const col = tab ? tab.closest('.chipcol') : null;
    // a tab in an open card's strip is a tab like any other; in a closed
    // pile only the front one is a way in
    const front = !!tab && !tab.classList.contains('behind') &&
      (!col || !!col.closest(CARD_ROOTS) || col.querySelector('.achip') === tab);
    return { tab, para, front, textEl: para && (para.querySelector('.cpv, .cptext') || para) };
  };
  /** the glyph of a tab, on the glass */
  const glyphOnGlass = (tab) => { const b = glyphBox(tab); return b && [R2(b[0] - window.scrollX), R2(b[1] - window.scrollY)]; };
  const lineOnGlass = (el, skip) => { const l = firstLine(el, skip); return l && [R2(l[0] - window.scrollX), R2(l[1] - window.scrollY)]; };
  /** the head label: a label drawn above the head's first line and in no block */
  const headLabelOf = (card, head) => {
    if (!head) return null;
    const lt = firstLine(head.el, LABEL_SEL);
    if (!lt) return null;
    const top = lt[1] - window.scrollY;
    const blocks = [...card.querySelectorAll(BLOCK_SEL)];
    const labs = [...card.querySelectorAll(LABEL_SEL)].filter((l) => !l.closest('.chipcol') && isVis(l, card.parentElement) &&
      l.getBoundingClientRect().height > 0 && !(l.parentElement && l.parentElement.closest(LABEL_SEL)) &&
      !blocks.some((b) => b.contains(l)) && l.getBoundingClientRect().bottom <= top + 1);
    return labs.length ? { n: labs.length, el: labs[0], top: R2(labs[0].getBoundingClientRect().top),
      bottom: R2(labs[0].getBoundingClientRect().bottom) } : { n: 0 };
  };
  /**
   * **The glass, closed**: the key's tab glyph, its paragraph's first line,
   * the ink above it, the zones and the scroll. `ok` is false where there is
   * nothing to hold still (no tab and no paragraph).
   */
  const glassClosed = (key) => {
    const a = anchorOf(key);
    return { ok: !!(a.tab || a.para), scrollY: R2(window.scrollY), glass: glassTop(), front: a.front,
      glyph: a.front ? glyphOnGlass(a.tab) : null, line: a.textEl ? lineOnGlass(a.textEl, '.headlab') : null,
      above: a.para ? inkAboveFrom(a.para) : null, zones: glassZones() };
  };
  /**
   * **The glass, open**: the same readings off the open card — its pressed
   * tab, its head's first line (the label skipped), the ink above the card —
   * and the label room. **The label room is the height the head label takes
   * above the first line**: from the label's top to the first line's top,
   * the label's own line and the air under it (BUILD.md §2: *the room made
   * equals the label slot's height*). No head label, no room.
   */
  const glassOpen = (key) => {
    const card = openCardEl();
    if (!card) return { ok: false };
    const head = headOf(card);
    const q = CSS.escape(key);
    const tab = card.querySelector('.achip[data-tab="' + q + '"], .achip[data-anchor="' + q + '"], [data-tab="' + q + '"]');
    const line = head ? lineOnGlass(head.el, LABEL_SEL) : null;
    const lab = headLabelOf(card, head);
    const room = lab && lab.n && line ? R2(Math.max(0, line[1] - lab.top)) : 0;
    const cr = card.getBoundingClientRect();
    return { ok: true, scrollY: R2(window.scrollY), glass: glassTop(), glyph: glyphOnGlass(tab), line,
      above: inkAboveFrom(card.closest('.cpara.open') || card), room,
      label: lab && lab.n ? { top: lab.top, bottom: lab.bottom, n: lab.n } : null,
      cardTop: R2(cr.top), cardBottom: R2(cr.bottom), zones: glassZones() };
  };
  /**
   * **The glass before a switch.** Within one strip the target's tab is in
   * the open card's strip and the first line that must not move is the open
   * card's head; across strips it is the target's own paragraph, as closed.
   */
  const glassSwitch = (key) => {
    const card = openCardEl();
    const q = CSS.escape(key);
    const inStrip = card && card.querySelector('.chipcol [data-tab="' + q + '"], .chipcol [data-anchor="' + q + '"]');
    if (!inStrip) return { ...glassClosed(key), within: false };
    const head = headOf(card);
    return { ok: true, within: true, scrollY: R2(window.scrollY), glass: glassTop(), glyph: glyphOnGlass(inStrip),
      line: head ? lineOnGlass(head.el, LABEL_SEL) : null, above: inkAboveFrom(card.closest('.cpara.open') || card),
      zones: glassZones() };
  };
  /** scroll so the key's first line stands `room` px under the glass — a
   *  scroll that lets the card make its label's room above it (P13's general
   *  case); where the page cannot scroll that far the reading says so */
  const placeFor = (key, room) => {
    const a = anchorOf(key);
    const el = a.textEl || a.tab;
    if (!el) return null;
    const l = firstLine(el, '.headlab') || rect(el);
    const want = l[1] - glassTop() - room;
    window.scrollTo(window.scrollX, Math.max(0, want));
    return R2(window.scrollY);
  };
  /** press a key's own tab in the gutter — only a front tab a pointer could
   *  reach, since a tab behind a pile is a place in the pile, not a way in */
  const pressTab = (key) => {
    const a = anchorOf(key);
    if (!a.tab || !a.front) return 'no front tab';
    const r = a.tab.getBoundingClientRect();
    if (!(r.width && r.height)) return 'tab not drawn';
    const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
    if (cy < glassTop() || cy > window.innerHeight || cx < 0 || cx > window.innerWidth) return 'tab off the glass';
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || !(a.tab === hit || a.tab.contains(hit))) return 'tab covered';
    a.tab.click();
    return null;
  };
  /** P29's page half: on a closed document, every powers line left in a
   *  paragraph and every ✒️ 🛡️ tab left in a strip */
  const POWER_LINE = /\b(From the start, )?[Tt]he Founder (\(that’s you!\) )?(may|could)(?! not)\b[^.]{0,60}/;
  const closedPowers = () => {
    const out = [];
    document.querySelectorAll('#band .cpara, #band p').forEach((p) => {
      if (p.closest('.setupcard, .sugg') || !isVis(p, null)) return;
      const t = plainText(p, 'button') || '';
      const m = t.match(POWER_LINE);
      if (m) out.push({ where: 'paragraph', key: (p.querySelector('[data-tab]') || { dataset: {} }).dataset.tab || null, text: m[0] });
    });
    document.querySelectorAll('.chipcol .achip').forEach((t) => {
      if (!isVis(t, null) || !t.getBoundingClientRect().width) return;
      const k = t.dataset.tab || t.dataset.anchor || t.dataset.chip || '';
      const g = [...t.querySelectorAll('svg[data-char]')].map((e) => e.getAttribute('data-char')).join('') + (t.textContent || '');
      if (/^pw:/.test(k) || /[✒🛡]/.test(g)) out.push({ where: 'strip', key: k, text: g.trim() });
    });
    return out;
  };
  /** P21's reference drawing: `--t-cap` in px and `--muted` as a colour,
   *  resolved by the page's own stylesheet */
  const labelRef = () => {
    const p = document.createElement('span');
    p.style.fontSize = 'var(--t-cap)'; p.style.color = 'var(--muted)';
    document.body.appendChild(p);
    const s = getComputedStyle(p);
    const out = { cap: R2(parseFloat(s.fontSize)), muted: s.color };
    p.remove();
    return out;
  };
  /** P31's 390 half: how far each gutter tab at rest stands from the glass */
  const tabsFromGlass = () => [...document.querySelectorAll('#band .chipcol .achip, #charter .chipcol .achip, #titlepara .chipcol .achip')]
    .filter((t) => t.getBoundingClientRect().width > 0 && isVis(t, null))
    .map((t) => ({ key: t.dataset.tab || t.dataset.anchor || null, l: R2(t.getBoundingClientRect().left + window.scrollX) }));

  window.__CA = {
    tokens, rect, txt,
    specimen,
    tokens, rect, txt,
    /** the glyph's box inside a tab, **as seen** — against the window, not the
     *  page, since the promise is kept by scrolling (P11's strip pass) */
    seen: (tab) => { const b = glyphBox(tab); return b && [R2(b[0] - window.scrollX), R2(b[1] - window.scrollY), b[2], b[3]]; },
    /** every card the surface is currently offering, by key, wherever it stands */
    offered: () => {
      const keys = new Set();
      document.querySelectorAll('#rail [data-card], #rail [data-tab], #band [data-card], #band [data-tab], ' +
        '#charter [data-card], #charter [data-tab]').forEach((el) => {
        const k = el.dataset.card || el.dataset.tab;
        if (k) keys.add(k);
      });
      return [...keys];
    },
    closedGeo,
    bandTabSeen,
    /** the open card, measured. `sel` picks the surface's card element. */
    grammarOf, zonesNow, pageTips, closeOpenCard, stillZones, openCardEl: () => !!openCardEl(),
    glassClosed, glassOpen, glassSwitch, placeFor, pressTab, closedPowers, tabsFromGlass, labelRef,
    measure: (sel, key, before) => {
      const card = document.querySelector(sel);
      if (!card) return null;
      const openTab = card.querySelector('.achip[data-tab="' + CSS.escape(key) + '"], ' +
        '.achip[data-anchor="' + CSS.escape(key) + '"], [data-tab="' + CSS.escape(key) + '"]');
      const openText = card.querySelector('.clausehead .rtext, .headrule, .headtitle');
      // tabs for this card standing **outside** it while it is open (Q1379):
      // an open card replaces its paragraph or its held-open gap, so its one
      // tab is the strip's; a second, on an anchor the card did not replace,
      // is the doubled 🔥 Ed saw
      // — the charter's tabs, keyed data-anchor; the band's piles are
      // setup.js's, whose open card is measured by P7's switch pass
      const outside = [...document.querySelectorAll('.achip[data-anchor="' + CSS.escape(key) + '"]')]
        // …a patch opens a card at every place it touches (Ed, 181; §9's patch
        // row), so a tab inside one of its other cards is not outside it
        .filter((t) => !t.closest('.sugg[data-card="' + CSS.escape(key) + '"]')).length;
      const s = getComputedStyle(card);
      const travel = (a, b) => (a && b ? [Math.round((b[0] - a[0]) * 100) / 100, Math.round((b[1] - a[1]) * 100) / 100] : null);
      return {
        key,
        // the kind a card built on the one shell declares (Q1541 stage 1,
        // card-shell.js's `data-kind`): what `GRAMMAR_KINDS` holds it by, so
        // a record filed on a clause is not a live quick card for the audit
        shellKind: card.getAttribute('data-kind') || null,
        // off unless --specimens asked for it: the payload is the page, and
        // 270 of them would drown the numbers this instrument exists for
        ...(window.__CA_SPEC ? { spec: specimen(card, key) } : {}),
        strings: strings(card),
        grammar: (() => { try { return grammarOf(card, key, before); } catch (e) { return { error: String(e && e.message || e) }; } })(),
        // a judgment card (Q1500): a charter card whose lanes are radios and
        // which is not the Text's 👑 question — the kinds that carry no 🗑️
        // a grant (Q1501, Q1502): the commit's word as the glyphs read, and the
        // hue its own tab wears in the card's strip
        grant: /^(grant-(pen|shield|voice)|canpropose|canjudge)$/.test(key) ? {
          accept: ((b) => (b ? window.CARDS.glyphTextOf(b).replace(/\s+/g, ' ').trim() : null))(card.querySelector('[data-ok]')),
          tabHue: ((t) => (t ? ((t.getAttribute('style') || '').match(/--lc-([a-z]+)/) || [])[1] || null : null))(
            card.querySelector('.chipcol [data-chip="' + CSS.escape(key) + '"]')),
        } : null,
        judgment: card.matches('.sugg:not(.setupcard)') && !!card.querySelector('[data-v]') &&
          !card.querySelector('[data-act^="crown-"]'),
        buttons: buttons(card),
        radios: radios(card),
        helpers: helpers(card),
        boxes: boxes(card),
        hairlines: hairlines(card),
        // the screen the card was measured on: a box wider than the layout
        // viewport, or a viewport the page has pushed wider than the window,
        // is a card a phone cannot show whole (V1, Q1389)
        screen: { w: window.innerWidth, scrollW: document.documentElement.scrollWidth,
                  // the thing that pushed the page wide, named — a finding
                  // that says 444px and not what measured 444px is a hunt
                  widest: (() => {
                    let best = null;
                    // a fixed box and everything in it is off the page's
                    // own axis — the drawers rest translated off the glass
                    const fixed = [...document.querySelectorAll('body *')].filter((el) => getComputedStyle(el).position === 'fixed');
                    for (const el of document.querySelectorAll('body *')) {
                      const cs = getComputedStyle(el);
                      if (cs.display === 'none' || fixed.some((f) => f.contains(el))) continue;
                      const r = el.getBoundingClientRect();
                      if (r.width && (!best || r.right > best.right)) {
                        best = { right: R2(r.right), sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
                          (el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : '') };
                      }
                    }
                    return best;
                  })() },
        card: { r: rect(card), shadow: s.boxShadow === 'none' ? 'none' : s.boxShadow,
                border: px(s.borderTopWidth), radius: px(s.borderTopLeftRadius) },
        // the card's identity is the glyph on its own tab, not the first
        // glyph in its head — a grant card's head is the Founded line, which
        // wears 👑 for a different reason entirely
        tabGlyph: openTab ? (txt(openTab) || '').replace(/\s/g, '').slice(0, 3) : null,
        // **Whose card this is, where the card is not its own subject.** A
        // motion is its own tab and its own entry since Q1367, and it wears
        // its **host's** glyph by design (SURFACE E10, M18) — the motion on
        // 🌍 is a 🌍 card. Nothing in `mo:<id>` says so, and the identity
        // lens below reads glyphs against keys, so it saw every running
        // motion as a second card claiming its host's glyph. The host names
        // itself at the front of the strip: the rule's own tab is the first
        // chip of its pile and of its strip (P8, Q1299/Q1320).
        host: /^mo:/.test(key)
          ? (() => { const f = card.querySelector('.chipcol .achip');
              return (f && (f.dataset.chip || f.dataset.tab)) || null; })()
          : null,
        tab: { closed: before && before.tab, open: rect(openTab), front: !!(before && before.front),
               onRow: !!(before && before.onRow),
               closedW: before && before.tabW, openW: openTab ? Math.round(openTab.getBoundingClientRect().width * 100) / 100 : null,
               boxTravel: travel(before && before.tab, rect(openTab)),
               rightEdge: openTab && card ? R2(openTab.getBoundingClientRect().right - card.getBoundingClientRect().left) : null,
               outside,
               gapH: before && before.gapH != null ? before.gapH : null,
               gapTabTop: before && before.gapTabTop != null ? before.gapTabTop : null,
               travel: travel(before && before.glyph, glyphBox(openTab)) },
        clause: { closed: before && before.text, open: rect(openText),
                  travel: travel(before && before.text, rect(openText)) },
        nextHead: nextHeadAfter(card),
        // **Nothing on a card draws a glyph as a character** (Q1401, G1). The
        // subject, wallet and commit glyphs are pictures from one set now, and
        // the way that fails is quiet: a site the conversion missed keeps
        // rendering the platform's emoji beside thirty that are drawn, and
        // every geometric check passes because a box is a box. So the page is
        // asked the direct question — is there a mapped character left in a
        // text node anywhere on this card, its rail entry or the topbar.
        //
        // Three exclusions, all of them the ruling's own: the contenteditable
        // prose column (the document's text is the member's, and a picture
        // inside a caret's reach becomes harvested markup), the mail modal
        // (it previews another medium and is off the design system) and the
        // stagehand furniture (the dev switch and the ladder bar).
        rawGlyphs: (() => {
          const G = (window.CARDS && window.CARDS.GLYPH) || {};
          const chars = Object.keys(G).map((k) => G[k][0]);
          if (!chars.length) return ['(no GLYPH table)'];
          const SKIP = '[contenteditable="true"], #prose, .mailmodal, .mailwrap, .devswitch, .ladderbar, #probe-report';
          const seen = new Set();
          const scan = (root, where) => {
            if (!root) return;
            const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            for (let n = w.nextNode(); n; n = w.nextNode()) {
              const p = n.parentElement;
              if (!p || p.closest(SKIP)) continue;
              for (const c of chars) if (n.nodeValue.indexOf(c) !== -1) seen.add(where + ' ' + c);
            }
          };
          scan(card, 'card');
          scan(document.querySelector('#rail'), 'rail');
          scan(document.querySelector('.navbar'), 'topbar');
          return [...seen];
        })(),
      };
    },
  };
};

/* ============================================================================
   The rules. They live in node rather than in the page so that one list reads
   as a list — and so that a rule can quote the number it wants beside the
   number it found.
   ========================================================================== */
const near = (a, b, tol = 0.51) => a !== null && b !== null && Math.abs(a - b) <= tol;
const onGrid = (v) => v === 0 || Math.abs(v % 4) < 0.01 || Math.abs((v % 4) - 4) < 0.01;

/** the three cards that ride your own row in the members list, and what stands under it */
const ID_KEYS = ['myname', 'mypic', 'myemail'];
const ID_NEXT_HEAD = 'Applications for Membership';

/** the glyph alphabet STYLE §1 calls stable, plus the lifecycle family */
const STABLE_GLYPHS = ['🪶', '📍', '🪪', '🤝', '💤', '🥾', '⏱️', '⏰', '👥',
  '👤', '✍️', '👁️', '🌍', '📝', '🎩', '💡', '⚖️', '👑', '📯', '✒️', '🛡️', '✏️', '🏛️', '🍾',
  '🥂', '📧', '✋', '🖼️', '👋', '✉️', '❌', '❄️', '🔥', '⚔️', '🌶️', '⏳', '↻', '⏸', '🗑️', '📨',
  '📬', '⏩', '⏭', '✔', '✖', '✓', '✕', '·', '▸', '∞'];
// U+2300–U+23FF is not optional: ⏰ ⏱️ ⏳ ⏸ ⏩ ⏭ all live there, six of them
// are in the table above, and without the range a clock-family glyph is
// invisible to G1 *and* drops its whole card out of G2's identity map.
const GLYPH_RE = /[\u{1F300}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]\u{FE0F}?/gu;

function rulesFor(card, tok) {
  const out = [];
  const at = (rule, lens, said, saw, note) => out.push({ rule, lens, said, saw, note: note || null });

  /* --- buttons ---------------------------------------------------------- */
  const rowH = tok.rootPx * 2.5;
  for (const b of card.buttons) {
    if (!b.r) continue;
    if (!near(b.h, rowH, 0.6)) {
      at('B1', 'buttons', 'a commit row is one height — .commitrow .btn { height: 2.5rem }, ' + rowH + 'px',
        (b.label || b.cls) + ' is ' + b.h + 'px');
    }
    if (b.disabled) {
      // one flat disabled look (Ed, 2026-08-21): --light ground, --border
      // edge, --muted ink, no lift. The pressed-and-disabled states that
      // mean something carry more classes and legitimately win.
      const meaningful = b.pressed === 'true';
      if (!meaningful) {
        if (b.bg !== tok.ink.light) at('B2', 'buttons', 'one flat disabled look — ground ' + tok.ink.light, (b.label || b.cls) + ' ground ' + b.bg);
        if (b.border !== tok.ink.border) at('B2', 'buttons', 'one flat disabled look — edge ' + tok.ink.border, (b.label || b.cls) + ' edge ' + b.border);
        if (b.color !== tok.ink.muted) at('B2', 'buttons', 'one flat disabled look — ink ' + tok.ink.muted, (b.label || b.cls) + ' ink ' + b.color);
      }
      // an *inset* shadow is not a lift: a submitted ✏️ and a cast ✓ are
      // pressed-and-disabled states that mean something, and say so by sinking
      if (b.shadow !== 'none' && !/inset/.test(b.shadow)) {
        at('B3', 'buttons', 'a disabled control does not lift', (b.label || b.cls) + ' carries ' + b.shadow);
      }
    } else if (b.pressed !== 'true' && b.shadow === 'none') {
      at('B3', 'buttons', 'at rest a commit control carries --shadow-md', (b.label || b.cls) + ' carries no shadow');
    }
    if (/emojibtn/.test(b.cls) && !b.disabled && b.bg === tok.ink.primary) {
      at('B4', 'buttons', 'a glyph commit sits on accent-subtle, never the full accent', (b.label || b.cls) + ' is on ' + b.bg);
    }
    // a glyph tunes a silhouette to a box rather than text to a scale, so a
    // button whose whole label is one is allowed its literal
    const wordy = b.label && !GLYPH_ONLY.test(b.label.trim());
    if (wordy && b.fontSize && !near(b.fontSize, tok.type.ui, 0.3)) {
      at('B5', 'buttons', 'a button label is --t-ui (' + tok.type.ui + 'px)', '“' + b.label + '” at ' + b.fontSize + 'px');
    }
    // **B6 — one glyph size, in every state** (Ed, 2026-09-06: the buttons
    // should be and stay the same size). The literal is `.btn.glyphbtn`'s
    // 1.35rem; it had run 12 → 14 → 19.2 → 21.6px by card kind and by
    // whether the commit was armed, on what §9.1 calls one control.
    if (/glyphbtn/.test(b.cls) && b.fontSize && !near(b.fontSize, 21.6, 0.3)) {
      at('B6', 'buttons', 'a glyph commit is 1.35rem (21.6px) inert, armed or held',
        (b.label || b.cls) + (b.disabled ? ' (inert)' : '') + ' at ' + b.fontSize + 'px');
    }
  }
  const heights = [...new Set(card.buttons.filter((b) => b.r).map((b) => b.h))];
  if (heights.length > 1) at('B1', 'buttons', 'one row, one height', heights.length + ' heights sharing one row: ' + heights.join(', ') + 'px');

  /* --- positioning ------------------------------------------------------ */
  const xs = [...new Set(card.radios.filter((r) => r.dot).map((r) => r.x))];
  // 🍾 is the surface's one two-column card (Q1103 (b)), so its radios stand
  // in two columns by ruling — EXEMPT from the one-edge promise, pass 4.
  if (card.key !== 'begin' && xs.length > 1 && Math.max(...xs) - Math.min(...xs) > 0.51) {
    at('P1', 'positioning', 'every radio lines up down the card\'s left edge',
      xs.length + ' left edges: ' + xs.map((x) => x + 'px').join(', '));
  }
  // Only the front of a pile has a position beside a clause to be measured
  // against; and only the horizontal promise is a resting-state fact — the
  // clause head stands under the card's own eyebrow, so a vertical travel is
  // the eyebrow's height, which every card has and no card is wrong about.
  if (card.tab.front && card.tab.travel && Math.abs(card.tab.travel[0]) > 0.01) {
    at('P2', 'positioning', 'the 8px goes on padding-left as well as width, so the glyph does not move',
      'the glyph moves ' + card.tab.travel[0] + 'px sideways when the card opens');
  }
  if (card.tab.front && card.tab.closedW !== null && card.tab.openW !== null && card.tab.openW !== card.tab.closedW) {
    const grew = Math.round((card.tab.openW - card.tab.closedW) * 100) / 100;
    const left = card.tab.boxTravel ? card.tab.boxTravel[0] : null;
    // 8px of growth to the left, and 2px of tuck under the card on the right
    // (system.css `.clausehead .achip`, 2026-09-06: the tuck's 2px is padding,
    // so the glyph stays put) — 10px of box, all of the visible part leftward
    if (!near(grew, 10, 0.51) || (left !== null && !near(left, -8, 0.51))) {
      at('P3', 'positioning', 'the active tab grows 8px to the left, plus the 2px tuck under the card',
        'it grows ' + grew + 'px and its left edge moves ' + left + 'px');
    }
  }
  // **V1 — a card fits the screen it is on** (Q1389, Ed's phone 2026-09-16:
  // *does not fit on screen*). The stranger's Apply card carried a 20rem
  // email box inline, and a 320px box in a card 88px in pushed a 390px
  // phone's layout viewport out to 444 — the page scrolled sideways and the
  // card's right third was off the glass. Two readings of one fact: the
  // card's own right edge against the window, and the page's scroll width
  // against it, since a widened layout viewport hides the first.
  if (card.screen && card.card.r) {
    const right = Math.round((card.card.r[0] + card.card.r[2]) * 100) / 100;
    if (right > card.screen.w + 0.5) {
      at('V1', 'positioning', 'a card fits the screen it is on — its right edge inside ' + card.screen.w + 'px (Q1389)',
        'the card runs to ' + right + 'px');
    }
    if (card.screen.scrollW > card.screen.w + 0.5) {
      at('V1', 'positioning', 'a card fits the screen it is on — the page no wider than ' + card.screen.w + 'px (Q1389)',
        'with this card open the page is ' + card.screen.scrollW + 'px wide' +
          (card.screen.widest ? ' — ' + card.screen.widest.sel + ' runs to ' + card.screen.widest.right + 'px' : ''));
    }
  }
  // **P10 — one tab per open card** (Q1379, Ed 2026-09-15: *why am I seeing
  // the 🔥 tab twice*). A gap race's held-open anchor drew its own tab above
  // the card while the card's strip drew the same race's tab at its left
  // edge; the open card replaces its anchor now, as it replaces a clause's
  // paragraph, so with the card open no tab for it stands outside it.
  if (card.tab.outside) {
    at('P10', 'positioning', 'one tab per open card — the strip\'s, none outside it (Q1379)',
      card.tab.outside + ' tab' + (card.tab.outside === 1 ? '' : 's') + ' for this card stand outside it while it is open');
  }
  // **P12 — a hairline has something on both sides of it** (Ed, 2026-09-24:
  // *two hairlines with nothing between them on a card is a defect and must
  // never appear*). The 🪶 card's standing block gone left the head's rule
  // and the commit row's facing each other across an empty field; a card's
  // separators are read off the page, and a pair with no visible content
  // between them, or one with nothing above it or below it in the card's
  // body, is the finding (`hairlines`, above).
  for (const h of card.hairlines || []) {
    at('P12', 'positioning', 'a hairline separates two things — never two hairlines with nothing between, never one at the top or foot of a card',
      h.kind === 'pair' ? h.a + ' and ' + h.b + ' face each other ' + h.gap + 'px apart with nothing between'
        : h.a + ' is the ' + (h.kind === 'top' ? 'first' : 'last') + ' thing on the card');
  }
  // **P9 — a held-open gap is the height of a tab** (Q1334, Ed 2026-09-11:
  // *gaps for proposed insertions should be the same vertical height as a
  // tab*). The anchor a gap site or a live insertion stands on is a box with
  // no text, so its height is the whole of what it says in the margin: the
  // tab's own 30px, and the tab flush with it. Measured on the closed anchor
  // before the card opened; it stood 51px with the tab 2.4px in.
  if (card.tab.gapH !== null) {
    if (!near(card.tab.gapH, 30, 0.51)) {
      at('P9', 'positioning', 'a held-open gap is the height of a tab — 30px (K31, Q1334)',
        'the gap stands ' + card.tab.gapH + 'px tall');
    }
    if (card.tab.gapTabTop !== null && !near(card.tab.gapTabTop, 0, 0.51)) {
      at('P9', 'positioning', 'the gap\'s tab sits flush with its box (K31, Q1334)',
        'the tab starts ' + card.tab.gapTabTop + 'px into the gap');
    }
  }
  // **P5 — stacked radio rows are spaced on the scale** (Q762). P1 was the
  // only thing this instrument said about a radio, and it is horizontal — so
  // the one defect Ed's *spacing* lens was pointed straight at, two rungs
  // touching at 0px, went through six walks unremarked. Only flush pairs carry
  // a gap (see `radios`), so what is measured is the rhythm of the rungs and
  // nothing else.
  for (const r of card.radios) {
    if (r.gap === null || r.gap === undefined) continue;
    if (Math.abs(r.gap) < 0.01) {
      at('P5', 'positioning', 'stacked radio rows are spaced on the --s1–--s5 scale',
        '“' + (r.label || '?') + '” sits flush against the rung above it — 0px');
    } else if (!onGrid(r.gap)) {
      at('P5', 'positioning', 'stacked radio rows are spaced on the --s1–--s5 scale',
        '“' + (r.label || '?') + '” is ' + r.gap + 'px below the rung above it');
    }
  }
  /* --- the card pattern (SURFACE §9.3, pass 4, 2026-08-31) --------------- */
  // CP7 — 🗑️ leads every row that commits anything besides OK. Y20's five
  // stay out by shape rather than by name: an OK-only row asks only to have
  // been seen, and ❄️ is a toggle on the flame, not a commit.
  {
    const bl = card.buttons.filter((b) => b.r);
    const substantive = bl.filter((b) => !/^OK$/.test((b.label || '').trim()) && !/chill/.test(b.cls));
    const first = bl[0];
    // …but never on a judgment card (Q1500, Ed 2026-09-22): quick · insert ·
    // race · patch · diagonal · the ⏳ judged pair carry no 🗑️ at all
    if (card.judgment) {
      const bin = bl.find((b) => /🗑/.test(b.label || ''));
      if (bin) at('CP7', 'pattern', 'no 🗑️ on a judgment card (Q1500)', 'the row carries “' + (bin.label || bin.cls) + '”');
    } else if (substantive.length && first && !/🗑/.test(first.label || '')) {
      at('CP7', 'pattern', '🗑️ leads every commit row (C4; Y20 by shape)',
        'the row opens with “' + ((first.label || first.cls) + '').slice(0, 40) + '”');
    }
  }
  // GA1 — a grant not yet accepted says so (Q1501, Q1502, Ed 2026-09-22):
  // its commit reads *Accept* and the power it hands you (🏛️ too since Q1541.24),
  // and its tab wears the *yours* hue; once accepted it is grey like any
  // settled card and its OK only closes
  if (card.grant) {
    const WORD = { 'grant-pen': 'Accept ✒️', 'grant-shield': 'Accept 🛡️', 'grant-voice': 'Accept 🏛️',
      canpropose: 'Accept ✏️', canjudge: 'Accept ⚖️' };
    const g = card.grant;
    if (g.accept !== null && g.accept !== WORD[card.key]) {
      at('GA1', 'pattern', 'a grant not yet accepted commits with ' + WORD[card.key], 'the commit reads “' + g.accept + '”');
    }
    if (g.accept !== null && g.tabHue !== 'yours') {
      at('GA1', 'pattern', 'a grant not yet accepted wears the yours hue on its tab', 'its tab wears ' + g.tabHue);
    }
  }
  // CP2 — the radio names the register (re-ruled 2026-08-31): a dotted radio
  // says Prefer this / Preferred (a choice put to more than one person),
  // Choose this / Chosen (the chooser alone decides), or Indifferent, and
  // nothing else; the option's own words live on its block. Since Q1167 (a)
  // and Q1176 (Ed's QA round 2, taught to the audit 2026-09-05) provenance is
  // the standing block's radio label, so *Chosen by …* forms are sanctioned.
  for (const r of card.radios) {
    if (!r.dot || !r.label) continue;
    if (/^Chosen by /.test(r.label.trim())) continue;
    // the founder's two-commit card names both acts, the route's glyph second (Ed, 2026-09-06)
    if (/^(Choose ✒️ or Propose|Chosen ✒️ or Proposed) (✏️|🏛️)( this)?$/u.test(r.label.trim())) continue;
    // …and Propose this / Proposed where the press creates a proposal (Ed, 2026-09-06)
    // …and the textless block's act-naming form, Indifferent, on a judgment
    // and a consent alike (CP2, T48; Q1182, Q1331, Q1377 — *Keep this / Kept*
    // and *Abstain* left with Q1377, Ed 2026-09-15: *Keep should be Prefer*)
    if (!['Prefer this', 'Preferred', 'Choose this', 'Chosen', 'Propose this', 'Proposed', 'Indifferent']
      .includes(r.label.trim())) {
      at('CP2', 'pattern', 'radio vocabulary — Prefer this / Preferred · Choose this / Chosen · Propose this / Proposed · Indifferent (§9.3)',
        '“' + r.label.trim().slice(0, 40) + '”');
    }
  }
  // CP8 — a commit label states the act; the state lives in the title.
  for (const b of card.buttons) {
    if (b.label && /^(Not answered yet|Recorded\b)/.test(b.label.trim())) {
      at('CP8', 'pattern', 'the label states the act; the state lives in the title (§9.3)',
        '“' + b.label.trim().slice(0, 50) + '”');
    }
  }
  if (card.tab.front && card.tab.rightEdge !== null && !near(card.tab.rightEdge, 0, 0.01)) {
    at('P4', 'positioning', 'every tab\'s right edge lands exactly on the card\'s left edge',
      'the open tab overshoots by ' + card.tab.rightEdge + 'px');
  }
  // **P6 — the identity card opens in your own row's place** (entry 188). P2 is
  // deliberately horizontal, and its comment is right about every other card:
  // a clause head stands under the card's own eyebrow, so a vertical travel
  // there is the eyebrow's height, which every card has. ✋ 🖼️ 📧 are the
  // exception, because they have somewhere they are *supposed* to open — the
  // row wearing their pile — so for those three the vertical half is a
  // resting-state fact too, and the next heading says the card is in the
  // Members rows rather than appended after the last subsection. `onRow`
  // is the precondition, not a convenience: before the save 📧 is the birth's
  // own address card and there is no register for it to open in.
  if (ID_KEYS.includes(card.key) && card.tab.front && card.tab.onRow) {
    if (card.tab.travel && Math.abs(card.tab.travel[1]) > 0.01) {
      at('P6', 'positioning', 'the identity card opens in your own row\'s place, so its tab does not move',
        'the glyph moves ' + card.tab.travel[1] + 'px down when the card opens');
    }
    if (card.nextHead !== undefined && card.nextHead !== ID_NEXT_HEAD) {
      at('P6', 'positioning', 'the identity card stands in the Members rows, above “' + ID_NEXT_HEAD + '”',
        card.nextHead ? 'the card stands above “' + card.nextHead + '”' : 'no subsection heading stands below the card');
    }
  }

  /* --- spacing ---------------------------------------------------------- */
  for (const box of card.boxes) {
    const bad = [];
    box.m.forEach((v, i) => {
      // `.pick > .inner > .choice`'s −2px is the P1 takeback that keeps nested
      // radios on the card's edge — EXEMPT by pass 4 (F-G, 2026-08-31)
      if (box.sel.startsWith('.choice') && i === 3 && v === -2) return;
      if (!onGrid(v)) bad.push('margin-' + 'trbl'[i] + ' ' + v + 'px');
    });
    box.p.forEach((v, i) => { if (!onGrid(v)) bad.push('padding-' + 'trbl'[i] + ' ' + v + 'px'); });
    if (box.gap !== null && !onGrid(box.gap)) bad.push('gap ' + box.gap + 'px');
    if (bad.length) at('S1', 'spacing', 'the --s1–--s5 grid: 4, 8, 12, 16, 24', box.sel + ' — ' + bad.join(' · '));
  }

  /* --- helper text ------------------------------------------------------ */
  const scale = Object.entries(tok.type);
  const GLYPH_SIZES = [18, 19.2, 21.6, 16.8];
  for (const h of card.helpers) {
    if (!h.text) continue;
    const named = scale.find(([, v]) => near(v, h.fontSize, 0.3));
    if (!named && !GLYPH_SIZES.some((g) => near(g, h.fontSize, 0.3))) {
      at('H1', 'helper text', 'every piece of text is on the --t-* scale (' + scale.map(([k, v]) => k + ' ' + v).join(', ') + ')',
        '.' + String(h.cls).split(' ')[0] + ' at ' + h.fontSize + 'px', h.text.slice(0, 70));
    }
    if (/lockline|setnote|rsub|qwhy/.test(String(h.cls)) && h.color === tok.ink.fg) {
      at('H2', 'helper text', 'a note that asks nothing wears muted ink',
        '.' + String(h.cls).split(' ')[0] + ' is full --fg', h.text.slice(0, 70));
    }
  }
  // where the lockline stands relative to the field is recorded rather than
  // ruled on: it opens a read-only body and closes a grant's, and which of
  // those is right is a question for Ed, not drift against a ruling. The
  // cross-card pass reports the variance.
  const lock = card.helpers.find((h) => /lockline/.test(String(h.cls)));
  const field = card.boxes.find((b) => b.sel === '.field');
  card.lockAbove = (lock && field && field.r) ? lock.y <= field.r[1] + 1 : null;

  /* --- copy, the lens the other ten passes did read --------------------- */
  const said = card.strings.copy || card.strings.all || '';
  for (const g of said.match(GLYPH_RE) || []) {
    const bare = g.replace(/\uFE0F/g, '');
    if (!STABLE_GLYPHS.some((s) => s.replace(/\uFE0F/g, '') === bare)) {
      at('G1', 'copy', 'the glyph names are stable (STYLE §1)', g + ' is not in the table');
    }
  }
  // *judgment* and the maths behind it join the list (entry 164, Ed 2026-08-27:
  // the surface says **vote**). **And *threshold* itself since 2026-09-15**
  // (Q1362): the bar left the mechanism a member meets, so entry 163's one
  // sanctioned sentence — 🌡️'s link to the explainer — has gone with the card
  // and the page, and the word has no site left to protect.
  for (const word of ['ordinary', 'roster', 'participant', 'ceremony', 'token', 'the bar', 'economy', 'queue-card', 'convenor', 'admin',
    'judgment', 'judge', 'judged', 'judging', 'comparison', 'confidence', 'threshold']) {
    // the plural is the same breach: *never "tokens"*, *never "participants"*
    const re = new RegExp('(^|[^a-z])' + word + 's?([^a-z]|$)', 'i');
    if (re.test(said)) at('T15', 'copy', 'no project-speak, no engine jargon', 'says "' + word + '"', excerpt(said, word));
  }
  if (/§\s*\d/.test(said)) at('T14', 'copy', 'no spec references in surface copy', 'cites a §-number', excerpt(said, '§'));

  // **T38 — the retired grant sentences** (entry 58, Ed's QA of batch B,
  // 2026-08-25: *don't mix "pen" and "key" metaphors … redraft it so that
  // someone who has just started using the product a minute ago won't be
  // confused*). These are the specific sentences ✒️ and 🛡️ were carrying at
  // the save, listed by hand so that a re-addition is a finding rather than
  // something somebody has to remember. **Not** a general vocabulary rule —
  // T15 above is that; this is the sentences themselves.
  for (const phrase of RETIRED) {
    if (said.toLowerCase().includes(phrase)) {
      at('T38', 'copy', 'a grant reads for someone one minute in — the retired pen and shield phrases (entry 58)',
        'says "' + phrase + '"', excerpt(said, phrase));
    }
  }

  // **T36 — one fact, one home** (Q765/Q766). A sentence stating a rule of the
  // mechanism appears once on a card. This lens read every string on every
  // card and measured nothing about them, so ⏱️, 👥 and 🥾 could each say one
  // sentence twice, verbatim, a few lines apart, through six walks. Sentences
  // under 40 characters are not compared: a rung label, a commit word and a
  // *Choose this* are all legitimately repeated, and none of them is a rule.
  const sentences = new Map();
  const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
  const hints = new Set((card.strings.hints || []).map(normalise));
  for (const s of said.split(/\s+·\s+|(?<=[.!?])\s+/)) {
    const norm = normalise(s);
    if (norm.length < 40 || hints.has(norm)) continue;
    sentences.set(norm, (sentences.get(norm) || 0) + 1);
    if (sentences.get(norm) === 2) {
      at('T36', 'copy', 'one fact, one home — a sentence stating a rule appears once on a card',
        'said twice', s.trim().slice(0, 90));
    }
  }

  // **F6 — what stands is not offered back, and nothing is pre-answered**
  // (Q1293, Ed 2026-09-09, reading (a)). Under a standing block — the
  // settled rule drawn as block one with its provenance radio (Q1167 (a)) —
  // the founder's own ladder drew every rung, the standing one lit from `S`:
  // the same sentence twice, two pressed radios meaning two things. T36 never
  // saw it, its `said` being the copy lens's strings rather than the blocks.
  // Two claims, read off the blocks themselves: no option beneath a standing
  // block repeats its sentence, and none of them is pressed on open.
  if (card.strings.standing) {
    const stand = normalise(card.strings.standing);
    for (const o of card.strings.options || []) {
      const lab = normalise(o.label || '');
      if (lab.length >= 20 && (stand === lab || stand.startsWith(lab + ' ') || lab.startsWith(stand + ' '))) {
        at('F6', 'pattern', 'what stands is not offered back — the standing block is block one and no option repeats it (Q620, Q1293)',
          'an option repeats the standing rule', (o.label || '').slice(0, 90));
      }
      if (o.on && o.set) {
        at('F6', 'pattern', 'nothing is pre-answered — under a standing block no rung is pressed on open (F6, Q1293)',
          'pressed on open', (o.label || '').slice(0, 90));
      }
    }
  }

  // **H4 — a body is subject plus one consequence** (Q764/Q766; H3 is the
  // cross-card lens below, so this one is H4). Ed's budget
  // for a `.why`: what the setting is, and the one consequence that would
  // change your answer; every other mechanic belongs to the act that performs
  // it (STYLE T17). Two sentences do not run past this, so anything that does
  // is carrying a third thing.
  const WHY_BUDGET = 200;
  for (const h of card.helpers) {
    if (!/(^|\s)why(\s|$)/.test(String(h.cls)) || !h.text) continue;
    if (h.text.length > WHY_BUDGET) {
      at('H4', 'helper text', 'a body is subject plus one consequence — ' + WHY_BUDGET + ' characters',
        h.text.length + ' characters', h.text.slice(0, 90));
    }
  }

  return out;
}
/**
 * The sentences Ed retired from the ✒️ and 🛡️ grant bodies on 2026-08-25
 * (entry 58): the second metaphor a pen "turns" in, the not-spent mechanic,
 * and the vocabulary a founder one minute in has not met. Lower case; the
 * comparison is too. They survive in `design/DECISIONS.md`, which is design
 * reasoning and exempt, and in two code comments, which nobody reads off the
 * surface — this list is only ever matched against a card's own copy.
 */
const RETIRED = [
  'a pen is not spent',
  'a shield is not spent',
  'one pen, many locks',
  'one shield, many locks',
  'where it turns',
  'amends a setting at will',
  'the shield refuses',
];
const GLYPH_ONLY = /^[^\p{L}\p{N}]{1,4}$/u;

/* ============================================================================
   **The redesign's checks, P13–P33** (Q1541; design/redesign/checks.md, *The
   checks as ruled*, which is the specification — answers.md over it). In
   node, over the readings `grammarOf`, `glassOpen`/`glassClosed` and the
   walks took in the page. Stage 0 runs every one in **report mode**: they
   are held strictly only for the kinds in `GRAMMAR_KINDS`, which each stage
   of BUILD.md §4 extends as it converts a family.

   Each finding is `{ check, walk, key, ex, sub?, excepted?, ruled? }`:
   - `check` is the card-audit number and the checks.md name (`P14 head-registration`);
   - `sub` separates the kinds one check reports;
   - `excepted` names **a stated exception** of the check as ruled — kept in
     the payload and in the v2-comparable count, never in the as-ruled count
     or the strict verdict (so the unchanged checks still reproduce
     checks.md's *today* column while saying which of it the ruling excuses);
   - `ruled: 'new'` marks a finding the ruling added to a check checks.md
     calls unchanged — in the as-ruled count, out of the v2-comparable one.
   ========================================================================== */
const TOL = 0.5;
/** on the glass a scroll lands on whole pixels while layout does not */
const GLASS_TOL = 1;
const CHECKS = [
  ['P13', 'still'], ['P14', 'head-registration'], ['P15', 'head-form'], ['P16', 'space-above'],
  ['P17', 'strip-floor'], ['P18', 'hairline-gap'], ['P19', 'empty-slot'], ['P20', 'slot-order'],
  ['P21', 'label-slot'], ['P22', 'no-job'], ['P23', 'note-visible'], ['P24', 'bin-job'],
  ['P25', 'row-vocabulary'], ['P26', 'role-drawing'], ['P27', 'closed-page'], ['P28', 'closed-keeps-content'],
  ['P29', 'closed-powers'], ['P30', 'zone-overlap'], ['P31', 'width-invariance'], ['P32', 'place-head'],
  ['P33', 'one-home'], ['—', 'raw-value'],
];
const CHECK = Object.fromEntries(CHECKS.map(([n, name]) => [name, n + ' ' + name]));
/** checks.md's *unchanged* set (BUILD.md stage 0's acceptance): their
 *  v2-comparable count is read against checks.md's *today* column */
const UNCHANGED = new Set(['head-registration', 'head-form', 'hairline-gap', 'empty-slot', 'slot-order',
  'row-vocabulary', 'closed-page', 'raw-value']);
/** P22 as ruled: the reasons a dark control may wait on — `accept:<power>`
 *  is not among them, since a commit for a power not yet accepted is not
 *  drawn at all (answers Part 4 .19) */
const UNTIL_OK = /^(choose|type|drip|voice-out|readiness|reconnect|flight|nothing-yours)$/;
const WITHDRAWS = /withdraw|comes? back/i;
const CLOSED_WALKS = new Set(['closed', 'closedband']);
const CLOSED_TIPS = /waiting on you|yours to take|give your answer/i;
const COMMIT_GLYPHS = new Set(['✓', '✒', '✏', '🏛', '🪶', '🍾', '📧', '📨']);
const PAIRS = [['✒', '✏'], ['✒', '🏛'], ['❄', '✓'], ['🛡', '✒']];
/** P21's words, answers Part 4: the label above a card (.1–.7, .15, .16,
 *  .23–.26) — or today's title, which Part 4 keeps for ✋ 🖼️ 📧 🌂 🎩 and
 *  the power cards (read off the card's own tab and rail entry) */
const HEAD_WORDS = [
  /^Current (text|rule)( · \d+ of \d+)?$/i,
  /^(Passed|Rejected|Refused by the Founder|Changed by the Founder|Ran out of time)( · .+)?$/i,
  /^Final text$/i, /^Rule at the close$/i,
  /^Accept (Founder Actions|the Founder Veto|Constitutional Proposals|Proposals|Voting)$/i,
  /^Add your closing comment$/i, /^Accept This Change\?$/i,
];
/** …and on a block's first line (Part 4 .8–.14) */
const BLOCK_WORDS = /^(Proposed( by .+)?|Previous (text|rule))( · (\d+%|Ran out of time))?$/i;

/** a row control as a token: its leading glyph (variation selector dropped), or its words */
const tokNorm = (t) => {
  const s = String(t || '').replace(/️/g, '').trim();
  const m = s.match(/^([\u{1F300}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}])/u);
  return m ? m[1] : s;
};
const d2 = (a, b) => [r2(b[0] - a[0]), r2(b[1] - a[1])];
const moved = (d) => Math.abs(d[0]) > TOL || Math.abs(d[1]) > TOL;
const clip = (s, n = 60) => { const t = String(s == null ? '' : s); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

/**
 * **A card's kind**, for `GRAMMAR_KINDS`: the key's family where the key
 * names one (`pw:`, `mo:`, `rec:`, `held:`, `adm:`, the charter's `quick-` …
 * prefixes, the grants and the two gates), else the key itself — a band
 * setting, 🍾, 🥂 or an identity card is its own kind.
 */
function kindOf(key) {
  const k = String(key || '');
  if (/^pw:/.test(k)) return 'power';
  if (/^mo:/.test(k)) return 'motion';
  if (/^held:/.test(k)) return 'failed-motion-news';
  if (/^rec:/.test(k)) return 'record';
  if (/^adm:/.test(k)) return 'admission';
  if (/^grant-/.test(k)) return 'grant';
  if (/^(canpropose|canjudge)$/.test(k)) return 'gate';
  const m = k.match(/^(quick|race|insert|patch|mine|park|diag|draft)-/);
  return m ? m[1] : k;
}

/** the six shapes of grammar §2.6, as answers Part 4 .24 and 1541.9 (b) keep them */
function classifyRow(tokens) {
  const toks = tokens.map((t) => tokNorm(t.t));
  if (!toks.length) return { bad: 'a row drawn with no control in it' };
  const bins = toks.map((t, i) => (t === '🗑' ? i : -1)).filter((i) => i >= 0);
  if (bins.length > 1 || (bins.length && bins[0] !== 0)) return { bad: '🗑️ not alone at the left: ' + toks.join(' ') };
  const bin = bins.length === 1;
  const rest = bin ? toks.slice(1) : toks;
  if (!rest.length) {
    return WITHDRAWS.test(tokens[0].title || '') ? { shape: 'withdraw' }
      : { bad: '🗑️ alone, not withdrawing (title “' + clip(tokens[0].title || '', 50) + '”)' };
  }
  if (rest.length === 1) {
    const r = rest[0];
    if (r === 'OK') return bin ? { bad: '🗑️ + OK' } : { shape: 'acknowledge' };
    if (/^(Accept|Activate)\b/.test(r)) return bin ? { bad: '🗑️ + ' + r } : { shape: 'accept' };
    if (COMMIT_GLYPHS.has(r)) return { shape: 'commit' };
    return { bad: 'a commit outside the set: ' + (bin ? '🗑️ ' : '') + r };
  }
  if (rest.length === 2 && PAIRS.some(([a, b]) => rest[0] === a && rest[1] === b)) return { shape: 'pair' };
  return { bad: 'no shape: ' + toks.join(' ') };
}

/**
 * **P13's zones on the glass**: the topbar and the contents rail whole, each
 * sheet by its left and right edges (its top is content above — checks.md
 * P13, 1541.44).
 */
function glassZoneMoves(a, b, dScroll) {
  const out = [];
  if (!a || !b) return out;
  const box = (name, x, y, rides) => {
    if (!x || !y) return;
    ['x', 'y', 'width', 'height'].forEach((lab, i) => {
      const d = y[i] - x[i];
      // **a rail that has not yet stuck rides the page** (Q1541 stage 1): at
      // the page's top the contents rail sits below its sticky line, so the
      // scroll the shortfall rule itself asks for (answers Part 6.4) carries
      // it with the page until it sticks — against the scroll, and never
      // further than the scroll went. That is the page moving, not the rail;
      // a rail that moves any other way is still a finding
      if (rides && lab === 'y' && dScroll && Math.sign(d) === -Math.sign(dScroll) &&
        Math.abs(d) <= Math.abs(dScroll) + GLASS_TOL) return;
      if (Math.abs(d) > GLASS_TOL) out.push(name + ' ' + lab + ' ' + r2(d) + 'px');
    });
  };
  box('topbar', a.topbar, b.topbar);
  box('contents rail', a.toc, b.toc, true);
  const sa = a.sheets || []; const sb = b.sheets || [];
  if (sa.length !== sb.length) out.push('the sheets went from ' + sa.length + ' to ' + sb.length);
  for (let i = 0; i < Math.min(sa.length, sb.length); i++) {
    const nm = 'sheet ' + (sa[i].cls.replace(/^sheet\s*/, '') || i);
    if (Math.abs(sb[i].l - sa[i].l) > GLASS_TOL) out.push(nm + ' left ' + r2(sb[i].l - sa[i].l) + 'px');
    if (Math.abs(sb[i].r - sa[i].r) > GLASS_TOL) out.push(nm + ' right ' + r2(sb[i].r - sa[i].r) + 'px');
  }
  return out;
}

/**
 * **P13 `still`, as ruled (1541.44)**, over one glass reading pair `a` → `b`.
 *
 * *The page top is wherever room runs out* (Ed, 2026-09-25; answers Part 6.4): the page scrolls
 * as far as it can, and the first line moves down only by the shortfall —
 * wherever the label, kept above a still first line, would otherwise land
 * above the visible area or under the topbar. So one formula covers the
 * general case and the page-top case: the **shortfall** is
 * `max(0, glass + room − line)`, 0 wherever the room fits under the topbar,
 * and the page-top case is simply a reading where it is not 0 (reported as
 * its own `sub`, *measured separately*).
 *
 * **Close and switch follow the same no-movement geometry as open** (Ed,
 * 2026-09-25; answers Part 6.5): on close the content above takes the room back and the
 * clause stays still — it moves up only by what the scroll cannot give back
 * (`max(0, room − scrollY)`); on a switch the target's first line and tab
 * stay still, less the new card's shortfall.
 */
function p13Rules(c, at) {
  for (const e of c.p13 || []) {
    if (e.unread) continue;
    const { a, b } = e;
    if (!a || !b || !a.ok || !b.ok) continue;
    let dy = 0; let room = 0;
    if (e.sub === 'close') {
      room = a.room || 0;
      dy = -Math.max(0, room - (a.scrollY || 0));
    } else {
      room = b.room || 0;
      dy = a.line ? Math.max(0, r2((a.glass || 0) + room - a.line[1])) : 0;
    }
    const sub = e.sub === 'page-top' || (e.sub !== 'close' && dy > GLASS_TOL) ? 'page-top' : e.sub;
    const bits = [];
    const want = (what, p, q) => {
      if (!p || !q) return;
      const d = d2(p, q);
      if (Math.abs(d[0]) > GLASS_TOL || Math.abs(d[1] - dy) > GLASS_TOL) {
        bits.push(what + ' moves ' + d[0] + ', ' + d[1] + 'px on screen' + (dy ? ' (the shortfall allows 0, ' + dy + ')' : ''));
      }
    };
    want('the first line', a.line, b.line);
    if (a.glyph && b.glyph) want('the pressed tab', a.glyph, b.glyph);
    // the content above: up by the room on open (less the shortfall), down by
    // it on close (less what the scroll could not give back); a switch's
    // above is the old card's room given back and the new one's taken, which
    // no reading here separates, so it is not held
    if (e.sub !== 'switch' && a.above != null && b.above != null) {
      const expect = e.sub === 'close' ? room + dy : dy - room;
      const got = r2(b.above - a.above);
      if (Math.abs(got - expect) > GLASS_TOL) bits.push('the ink above moves ' + got + 'px (the room says ' + r2(expect) + ')');
    }
    bits.push(...glassZoneMoves(a.zones, b.zones, (b.scrollY || 0) - (a.scrollY || 0)));
    if (bits.length) at('still', e.sub + ': ' + bits.join(' · '), sub);
  }
}

function grammarRules(c, ref) {
  const out = [];
  const g = c.grammar;
  const at = (check, ex, sub, more) => out.push({ check, walk: c.walk, key: c.key, ex: clip(ex, 160), ...(sub ? { sub } : {}), ...(more || {}) });
  if (!g || g.error) { if (g && g.error) at('still', 'the grammar reading threw: ' + g.error, 'error'); return out; }
  const v = g.v2 && !g.v2.error ? g.v2 : null;
  const before = g.closedBefore;
  const closed = CLOSED_WALKS.has(c.walk);
  const isRecord = !!(v && v.isRecord);

  /* P13 still — on the glass, from both scroll positions (BUILD.md §2) */
  p13Rules(c, at);

  /* P14 head-registration — the closed paragraph's words and first line.
   * Stated exceptions (checks.md P14): a record (the wording it recorded), a
   * multi-place proposal (the place it shows), a gap (*(no text here)*), 🪶
   * at the birth (the title box); a rule card's first line is the rule
   * without its powers line (the trim, as v2 had it); a power card's first
   * line is **the power's own clause, naming its subject** (1541.48) — so its
   * text is not the paragraph's, and is held to starting *The Founder* instead */
  if (before && !c.switchOpen && before.ptext != null && before.para) {
    const why = isRecord ? 'a record heads with the wording it recorded'
      : /^patch-/.test(c.key) ? 'a multi-place proposal heads with the place it shows'
      : /insert-anchor/.test(before.para) ? 'a gap heads with (no text here)'
      : c.key === 'title' && c.walk === 'founding' ? '🪶 at the birth heads with the title box'
      : null;
    if (!g.head) at('head-registration', 'no head element on the card (closed paragraph ' + before.para + ': “' + clip(before.ptext, 60) + '”)', 'missing');
    else {
      const norm = (s) => String(s || '').replace(/️/g, '').replace(/\s+/g, ' ').trim();
      const trimPow = (s) => norm(s).replace(/\s*(From the start, )?The Founder( \(that’s you!\))? may[^.]*\.(\s*From the start, the Founder may not[^.]*\.)?\s*$/, '').trim();
      if (norm(g.head.text) !== norm(before.ptext) && norm(g.head.text) !== trimPow(before.ptext)) {
        const power = /^pw:/.test(c.key);
        at('head-registration', 'text: paragraph “' + clip(norm(before.ptext), 70) + '” · head (' + g.head.sel + ') “' + clip(norm(g.head.text), 70) + '”', 'text',
          why ? { excepted: why } : power ? { excepted: 'a power card heads with its own clause (1541.48)' } : null);
      }
      if (/^pw:/.test(c.key) && !/^(From the start, )?The Founder\b/.test(norm(g.head.text))) {
        at('head-registration', 'power-clause: the power card heads “' + clip(norm(g.head.text), 70) + '”, not the power\'s own clause', 'power-clause', { ruled: 'new' });
      }
      if (before.line && g.still.line) {
        // **lands on the paragraph's line on the glass** (1541.44): a card
        // that makes its label's room above its first line stands that line
        // the room lower in the document, and the scroll takes it back — P13
        // holds the glass; here the document's drop is read net of the room
        const d = d2(before.line, g.still.line);
        d[1] = r2(d[1] - (g.room || 0));
        if (moved(d)) at('head-registration', 'offset: head first line Δx ' + d[0] + ' Δy ' + d[1] + 'px' + (g.room ? ' (net of the label\'s room, ' + g.room + 'px)' : ''), 'offset', why ? { excepted: why } : null);
      } else if (!g.still.line) at('head-registration', 'offset: the head draws no first line to measure', 'offset', why ? { excepted: why } : null);
    }
  }

  /* P15 head-form — nothing between the label and the first line: the label
   * is the one thing allowed above it, in the room `space-above` makes, so a
   * card whose only thing above the head is one label is excepted (the v2
   * count still carries it — v2 allowed nothing above the head) */
  if (g.head && (g.head.eyebrow || g.head.above)) {
    const onlyLabel = v && v.headLabels === 1 && v.headLabelText != null &&
      String(g.head.above || '').replace(/\s+/g, ' ').trim() === String(v.headLabelText).replace(/\s+/g, ' ').trim();
    at('head-form', 'above the head: “' + clip(g.head.above || g.head.eyebrow, 90) + '”' + (g.head.eyebrow ? ' (a .headlab eyebrow)' : ''), null,
      onlyLabel ? { excepted: 'the label, the one thing above the first line (1541.44–.46)' } : null);
  }

  /* P16 space-above (replaces top-edge; 1541.15, .35, .44): the card never
   * covers the ink above it; the label stands inside the card, clear of that
   * ink; the room made between the ink above and the first line equals the
   * label slot's height (read off the general open, on the glass) */
  if (v && v.top && v.top.ink != null) {
    if (v.top.card < v.top.ink - TOL) at('space-above', 'the card\'s top covers the ink above it by ' + r2(v.top.ink - v.top.card) + 'px', 'covers');
    if (v.top.label != null && v.top.label < v.top.ink + 1) at('space-above', 'the label stands ' + r2(v.top.ink + 1 - v.top.label) + 'px into the ink above', 'label-in-ink');
  }
  if (v && v.top && v.top.label != null && v.top.label < v.top.card - TOL) at('space-above', 'the label stands ' + r2(v.top.card - v.top.label) + 'px above the card\'s box', 'label-outside');
  for (const e of c.p13 || []) {
    if (e.sub !== 'open' || e.unread || !e.a || !e.b || !e.a.ok || !e.b.ok) continue;
    const { a, b } = e;
    if (!a.line || !b.line || a.above == null || b.above == null) continue;
    const made = r2((b.line[1] - b.above) - (a.line[1] - a.above));
    if (Math.abs(made - (b.room || 0)) > GLASS_TOL) at('space-above', 'the room made above the first line is ' + made + 'px, the label slot ' + (b.room || 0) + 'px', 'room');
  }

  /* P17 strip-floor (replaces strip-blank; 1541.16 (c)) */
  if (v && v.floor && v.floor.strip != null && v.floor.card < v.floor.strip - TOL) {
    at('strip-floor', 'the card is ' + v.floor.card + 'px tall, its strip ' + v.floor.strip + 'px');
  }

  /* P18 hairline-gap (P12 kept beside it). The ruling's addition — a hairline
   * between a rule card's standing first line and its other options (1541.47)
   * — has no first line to read until stage 3 draws one */
  for (const h of g.hair || []) {
    at('hairline-gap', h.kind === 'pair' ? h.a + ' and ' + h.b + ' with nothing between (' + h.gap + 'px)'
      : h.a + ' has nothing ' + (h.kind === 'top' ? 'above it but the card top' : 'below it but the card foot'), h.kind);
  }

  /* P19 empty-slot. Stated exceptions (principle 6 as ruled): the reason box
   * on a card that can take a change, always drawn (1541.21 (b)); the floor's
   * padding under the last slot (P17) is the card's own padding, never a
   * child, so it is never read here. `presence` is read on a card built on
   * the one shell, against the shell's own predicates (stage 1) */
  for (const e of g.empty || []) {
    const reason = /rationale|reason|why|\.lane/i.test(e.el) && !closed;
    at('empty-slot', e.el + ' is ' + e.h + 'px tall with nothing in it', null,
      reason ? { excepted: 'the reason box, always shown on a card that can take a change (1541.21 (b))' } : null);
  }
  for (const p of (v && v.presence) || []) at('empty-slot', 'presence: ' + p, 'presence');

  /* P20 slot-order — the drawn slots top to bottom in grammar §2.3's order,
   * the label first; the fact and body slots carry no mark on today's page */
  if (v && v.order && v.order.length > 1) {
    const RANK = { label: 0, head: 1, block: 2, input: 3, row: 4 };
    const seq = v.order.slice().sort((x, y) => x.y - y.y || RANK[x.slot] - RANK[y.slot]);
    for (let i = 1; i < seq.length; i++) {
      if (RANK[seq[i].slot] < RANK[seq[i - 1].slot]) {
        at('slot-order', 'a ' + seq[i].slot + ' drawn below a ' + seq[i - 1].slot + ' (' + seq[i].y + ' under ' + seq[i - 1].y + ')', seq[i].slot);
        break;
      }
    }
  }

  /* P21 label-slot, as ruled (1541.45, .46, .27; answers Part 4). **Every
   * label, card and block alike, is drawn at `--t-cap`** (Ed, 2026-09-25;
   * answers Part 6.2),
   * 700, upper case, `--muted` — a record's outcome in its colour */
  if (v) {
    if (v.headLabels !== 1) at('label-slot', v.headLabels ? v.headLabels + ' labels above the first line' : 'no label above the first line', v.headLabels ? 'labels' : 'no-label');
    const drawn = (d, record) => {
      if (!d || !ref) return null;
      const bad = [];
      if (ref.cap != null && Math.abs(d.fs - ref.cap) > 0.1) bad.push(d.fs + 'px, not --t-cap ' + ref.cap + 'px');
      if (d.fw !== '700') bad.push('weight ' + d.fw);
      if (d.tt !== 'uppercase') bad.push(d.tt === 'none' ? 'not upper case' : d.tt);
      if (!record && ref.muted && d.color !== ref.muted) bad.push('colour ' + d.color);
      return bad.length ? bad.join(', ') : null;
    };
    if (v.headLabels === 1) {
      const bad = drawn(v.headLabelDraw, isRecord);
      if (bad) at('label-slot', 'the label above the first line is drawn ' + bad, 'drawing');
      const t = String(v.headLabelText || '').replace(/\s+/g, ' ').trim();
      const ask = (v.asks || []).some((s) => String(s).replace(/\s+/g, ' ').trim().toLowerCase().startsWith(t.toLowerCase()) && t.length > 3);
      if (!HEAD_WORDS.some((re) => re.test(t)) && !ask) at('label-slot', 'the label “' + clip(t, 50) + '” is not in answers Part 4\'s words', 'words');
    }
    for (const b of v.blocks || []) {
      // a settings rung with a live radio is labelled by its radio's words (CP1, CP2)
      if (b.pick && b.live) continue;
      if (!b.labelled) { at('label-slot', 'a ' + b.cls + ' with no label on its first line', 'block'); continue; }
      if (!b.first) at('label-slot', 'the label “' + clip(b.label, 40) + '” is not its ' + b.cls + '\'s first line', 'block-place');
      const bad = drawn(b.draw, isRecord);
      if (bad) at('label-slot', 'the block label “' + clip(b.label, 30) + '” is drawn ' + bad, 'drawing');
      if (!BLOCK_WORDS.test(String(b.label || '').replace(/\s+/g, ' ').trim())) at('label-slot', 'the block label “' + clip(b.label, 40) + '” is not in answers Part 4\'s words', 'words');
    }
  }

  /* P22 no-job, static form as ruled */
  for (const k of g.controls || []) {
    if (k.close && /^OK$/i.test(k.tok)) at('no-job', 'an OK that only closes (data-close)', 'close-ok');
    if (!k.disabled || closed) continue;
    if (k.until && !UNTIL_OK.test(k.until)) at('no-job', 'a dark control with data-until="' + k.until + '"', 'until');
    else if (!k.until) at('no-job', 'a dark ' + (k.radio ? 'radio' : 'control') + ' “' + clip(k.tok || k.el, 30) + '” with no data-until', 'until');
    // a commit waiting on a power's acceptance is not drawn at all (Part 4 .19)
    if (k.inRow && /\baccept/i.test((k.title || '') + ' ' + (k.until || ''))) at('no-job', 'a dark commit “' + clip(k.tok, 20) + '” waiting on a power not yet accepted (' + clip(k.title || k.until, 50) + ')', 'unaccepted');
  }
  if (v && v.litOverEmpty && !closed) at('no-job', 'a lit commit over an empty required input', 'lit-empty');

  /* P23 note-visible, narrowed to Part 4 .17–.22: a dark commit waiting on
   * `drip`, `voice-out` or `readiness` shows its note as text in the row; one
   * waiting on `choose` or `type`, and the dark bin, shows none. Today's page
   * carries no `data-until`, so the reason is read off the commit's tooltip */
  const reasonOf = (d) => {
    if (d.until) return d.until;
    const t = (d.title || '') + ' ' + (d.tok || '');
    if (/\b\d{1,2}:\d{2}\b|next ✏|✏️? in /i.test(t)) return 'drip';
    if (/at a time|withdraw yours|🏛️? (is )?(out|in use)|one 🏛/i.test(t)) return 'voice-out';
    if (/🍾/.test(d.tok || '') || /still answering|waiting for .* answer/i.test(t)) return 'readiness';
    return 'choose-or-type';
  };
  if (v && !closed) {
    for (const n of v.notes || []) {
      if (!n.dark) continue;
      const rs = (n.darks || []).map(reasonOf);
      const due = rs.filter((r) => /^(drip|voice-out|readiness)$/.test(r));
      if (due.length && !n.note) at('note-visible', 'a dark commit waiting on ' + [...new Set(due)].join(', ') + ' and no note in the row', 'missing');
      if (!due.length && n.note) at('note-visible', 'a note “' + clip(n.note, 40) + '” beside commits waiting only on a choice or a keystroke', 'extra');
    }
  }

  /* P24 bin-job, as ruled (1541.9 with Ed's note): 🗑️ is drawn exactly when
   * the card can ever give it a job for this reader — something to type, a
   * choice to put back, or something of theirs to withdraw — dark while there
   * is nothing to remove, lit while there is; a withdraw is the bare glyph.
   * A radio choice among blocks that include Indifferent is undone by another
   * choice, so a judgment can never give it one (grammar J2, Q1500).
   * Without `CardState` the *can ever* is read from the card: stage 1's
   * `acts` replaces this reading */
  if (!closed) {
    const bins = g.bins || [];
    const withdraw = bins.some((b) => WITHDRAWS.test(b.title || ''));
    const indifferent = !!c.judgment || (g.controls || []).some((k) => /indifferent/i.test(k.tok || ''));
    const radios = (g.controls || []).some((k) => k.radio && !k.disabled);
    // a glyph toggle — 🍾's power table — gives the bin no job: it is undone
    // by toggling it back (Q1556 (2), Ed 2026-09-26; grammar.md's *no other
    // control on it can undo*), so 🍾 carries no bin and one there is red
    const commit = (g.rows || []).some((r) => r.tokens.some((t) => COMMIT_GLYPHS.has(tokNorm(t.t))));
    const canEver = !isRecord && (!!(v && v.typeable) || withdraw || (radios && !indifferent && commit));
    if (bins.length && !canEver) at('bin-job', '🗑️ on a card that can never give it a job (title “' + clip(bins[0].title || '', 50) + '”)', 'no-job-ever');
    if (!bins.length && canEver) at('bin-job', 'no 🗑️ on a card that can give it a job', 'missing');
    for (const b of bins) {
      const wd = WITHDRAWS.test(b.title || '');
      if (!b.disabled && !g.unsent && !wd) at('bin-job', '🗑️ lit with nothing of yours to remove (title “' + clip(b.title || '', 50) + '”)', 'lit-empty');
      if (b.disabled && g.unsent) at('bin-job', '🗑️ dark over an unsent value', 'dark-with-draft');
      if (wd && b.word) at('bin-job', 'a withdraw carries a word: “' + clip(b.word, 30) + '”', 'withdraw-word');
    }
  }

  /* P25 row-vocabulary — the six shapes; *withdraw* is the bare 🗑️ */
  c.shapes = [];
  if (!(g.rows || []).length) c.shapes.push('absent');
  for (const r of g.rows || []) {
    const k = classifyRow(r.tokens);
    if (k.bad) at('row-vocabulary', k.bad);
    else c.shapes.push(k.shape);
    if (r.shape && k.shape && r.shape !== k.shape) at('row-vocabulary', 'data-shape="' + r.shape + '" but the row reads as ' + k.shape);
    if (k.shape === 'withdraw' && /\p{L}/u.test(String(r.tokens[0].t || '').replace(/🗑️?/gu, ''))) {
      at('row-vocabulary', 'a withdraw with a word: “' + clip(r.tokens[0].t, 30) + '”', 'withdraw-word', { ruled: 'new' });
    }
  }

  /* P26 role-drawing, as ruled (1541.13 (c), .50): today's drawings kept; ✓
   * accent blue when armed, never green; no solid-green button; a block
   * nobody may choose has no radio */
  const anyCommit = (g.rows || []).some((r) => r.tokens.some((t) => tokNorm(t.t) !== '🗑'));
  for (const k of g.controls || []) {
    if (k.green) at('role-drawing', 'a button on solid --ok green: “' + clip(k.tok || k.el, 30) + '”', 'green');
    if (!k.disabled && k.inkGreen && tokNorm(k.tok) === '✓') at('role-drawing', 'an armed ✓ drawn green', 'green-tick');
    if (k.radio && (k.disabled || !anyCommit)) at('role-drawing', 'a radio “' + clip(k.tok, 30) + '” on a block nobody may choose' + (k.on ? ' (pressed)' : ''), 'unchoosable');
  }

  /* P27 closed-page (as measured): nothing enabled but the tabs, 🥂 and a
   * multi-place proposal's ↑ ↓; no dark control, no radio, no *waiting on
   * you* tooltip */
  if (closed) {
    for (const k of g.controls || []) {
      if (k.sign) continue;
      if (/pstep/.test(k.el)) continue;
      const why = k.radio ? 'a radio' : !k.disabled ? 'an enabled control' : 'a dark control';
      at('closed-page', why + ': “' + clip(k.tok || k.el, 30) + '”' + (k.title ? ' (' + clip(k.title, 40) + ')' : ''));
    }
    for (const t of g.tips || []) if (CLOSED_TIPS.test(t)) at('closed-page', 'a tooltip on a closed document: “' + clip(t, 70) + '”', 'tooltip');
  }

  /* raw-value (a copy-check --walk rule too, strict there) */
  for (const r of g.raw || []) at('raw-value', r);

  if (v && closed) {
    /* P28 closed-keeps-content: every card that raced — a live race, patch,
     * motion or proposal, or a record of one the close cut off — still draws
     * its proposals, and says *Ran out of time* (Part 4 .4, .14) */
    const cutOff = isRecord && /undecided|ran out of time/i.test(v.text || '');
    const raced = (/^(quick|race|insert|patch|mine)-|^mo:/.test(c.key) && !isRecord) || cutOff;
    if (raced) {
      const more = cutOff ? { ruled: 'new' } : null;
      if (!v.blocks.length) at('closed-keeps-content', 'what was in flight at the close is not on the card: the head alone', 'lost', more);
      else if (!/ran out of time/i.test(v.text)) at('closed-keeps-content', 'the proposals stand, and nothing says *Ran out of time*', 'unsaid', more);
    }
    /* P29 closed-powers, the card half (replaces closed-tense; 1541.34, .52):
     * no powers line in the card and no ✒️ 🛡️ tab in its strip; a rule card's
     * label *Rule at the close*, a text card's *Final text*. 🍾's table of the
     * powers kept at the start is a stated survivor */
    if (c.key !== 'begin') {
      const m = (v.text || '').match(/\b(From the start, )?[Tt]he Founder (\(that’s you!\) )?(may|could)(?! not) [^.]{0,40}/);
      if (m) at('closed-powers', 'a powers line on a closed document: “' + clip(m[0], 70) + '”', 'card-line');
      if ((v.powerTabs || []).length) at('closed-powers', 'a ✒️ 🛡️ tab in the strip: ' + v.powerTabs.join(', '), 'strip-tab');
    }
    const t = String(v.headLabelText || '').trim();
    if (c.walk === 'closed' && !isRecord && !/^Final text$/i.test(t)) at('closed-powers', 'a text card labelled “' + clip(t, 40) + '”, not *Final text*', 'label');
    const ruleCard = c.walk === 'closedband' && !/^(pw:|grant-|adm:|rec:|held:)/.test(c.key) &&
      !['closing', 'begin', 'myname', 'mypic', 'myemail', 'canpropose', 'canjudge', 'resign'].includes(c.key);
    if (ruleCard && !isRecord && !/^Rule at the close$/i.test(t)) at('closed-powers', 'a rule card labelled “' + clip(t, 40) + '”, not *Rule at the close*', 'label');
  }

  /* P32 place-head — one first line per card */
  if (v && v.heads > 1) at('place-head', v.heads + ' heads on one card');

  /* P33 one-home — at most one element per data-fact role; a card with no
   * roles cannot be read, and is counted in `unread` rather than here */
  if (v && v.facts) for (const [role, n] of Object.entries(v.facts)) if (n > 1) at('one-home', n + ' elements claim data-fact="' + role + '"', role);

  return out;
}

/**
 * The walk-level readings: P30 zone-overlap, P27's page-wide tooltips, P13's
 * switch pass (card-audit P7's), P29's page half, P31's flush tabs.
 */
function walkGrammar(zones, tips, switches, restReads) {
  const out = [];
  for (const z of zones) {
    const zs = z.zones.filter((x) => !x.drawer);
    for (let i = 0; i < zs.length; i++) {
      for (let j = i + 1; j < zs.length; j++) {
        const a = zs[i]; const b = zs[j];
        if (a.group === b.group) continue;
        if (a.group === 'floating' || b.group === 'floating') continue;
        const pair = [a.group, b.group].sort().join('×');
        if (VIEWPORT.width <= 900 && ['floating×sheet', 'queue×sheet', 'sheet×toc'].includes(pair)) continue;
        const w = Math.min(a.box[2], b.box[2]) - Math.max(a.box[0], b.box[0]);
        const h = Math.min(a.box[3], b.box[3]) - Math.max(a.box[1], b.box[1]);
        if (w > TOL && h > TOL) {
          out.push({ check: 'zone-overlap', walk: z.walk, key: z.when + (z.key ? ':' + z.key : ''),
            ex: a.name + ' and ' + b.name + ' overlap ' + r2(w) + '×' + r2(h) + 'px (' + z.when + ')' });
        }
      }
    }
    for (const x of z.zones) {
      if (x.group !== 'floating' || !x.covers) continue;
      // **the floating 📝 door is a named exception** (1541.17, Ed: *the fact
      // that it sometimes overlaps things is what makes it stand out*)
      const door = /editdoor/.test(x.name);
      out.push({ check: 'zone-overlap', walk: z.walk, key: z.when + (z.key ? ':' + z.key : ''), sub: 'covers-text',
        ex: x.name + ' covers ' + x.covers + ' line(s) of text (' + z.when + ')',
        ...(door ? { excepted: 'the floating 📝 door may overlap (1541.17)' } : {}) });
    }
  }
  for (const t of tips) {
    const seen = new Set();
    for (const x of t.tips) {
      if (!CLOSED_TIPS.test(x.title) || seen.has(x.key + x.title)) continue;
      seen.add(x.key + x.title);
      out.push({ check: 'closed-page', walk: t.walk, key: x.key || '(page)', sub: 'tooltip',
        ex: 'a tab or rail tooltip on the closed page: “' + clip(x.title, 70) + '”' });
    }
  }
  for (const s of switches) {
    if (!s.travel) continue;
    if (Math.abs(s.travel[0]) <= SWITCH_TOL && Math.abs(s.travel[1]) <= SWITCH_TOL) continue;
    out.push({ check: 'still', walk: s.walk, key: s.click, sub: 'switch-across',
      ex: 'switch (P7): with ' + s.open + ' open, clicking ' + s.click + ' moves its glyph ' + s.travel.join(', ') + 'px' });
  }
  for (const r of restReads) {
    /* P29's page half: every powers line in a Rules paragraph and every ✒️ 🛡️
     * tab left in a strip, on a closed document — **both go** (Ed, 2026-09-25;
     * answers Part 6.6: the powers sentence leaves the Rules paragraphs as
     * well as the cards and tabs) — read on `closedband`,
     * which unfolds Rules (the charter's closed walk leaves it folded, and
     * would count the same tabs twice) */
    if (r.walk === 'closedband') {
      for (const p of r.powers || []) {
        out.push({ check: 'closed-powers', walk: r.walk, key: p.key || '(page)', sub: p.where === 'strip' ? 'page-tab' : 'paragraph',
          ex: (p.where === 'strip' ? 'a ✒️ 🛡️ tab on the closed page: ' : 'a powers line in a closed Rules paragraph: “') + clip(p.text, 60) + (p.where === 'strip' ? '' : '”') });
      }
    }
    /* P31's 390 half: at the phone the tabs stand flush with the glass's left
     * edge (1541.20) */
    if (VIEWPORT.width <= 900) {
      const off = (r.tabs || []).filter((t) => t.l > TOL);
      if (off.length) out.push({ check: 'width-invariance', walk: r.walk, key: '(rest)', sub: 'not-flush',
        ex: off.length + ' of ' + r.tabs.length + ' tabs stand off the glass\'s left edge (nearest ' + Math.min(...off.map((t) => t.l)) + 'px)' });
    }
  }
  return out;
}

/**
 * **P31 width-invariance** against `--baseline` (the 1600 run): each P13
 * reading's travel — the first line and the pressed tab, on the glass — must
 * agree across the widths. **Stated exception: the active tab** grows 8 px at
 * 1600 and highlights in place at 390, split at the 900 px line (1541.53), so
 * the tab's sideways travel is not compared.
 */
function widthRules(cards, baseline) {
  const out = [];
  if (!baseline || !Array.isArray(baseline.cards)) return out;
  const travel = (e) => {
    if (!e || e.unread || !e.a || !e.b || !e.a.ok || !e.b.ok) return null;
    return { line: e.a.line && e.b.line ? d2(e.a.line, e.b.line) : null, tab: e.a.glyph && e.b.glyph ? d2(e.a.glyph, e.b.glyph) : null };
  };
  const base = new Map();
  for (const c of baseline.cards) for (const e of c.p13 || []) base.set(c.walk + '·' + c.key + '·' + e.sub, travel(e));
  for (const c of cards) {
    for (const e of c.p13 || []) {
      if (e.sub === 'page-top') continue; // the shortfall is a fact about the window's height, not a travel
      const x = base.get(c.walk + '·' + c.key + '·' + e.sub); const y = travel(e);
      if (!x || !y) continue;
      const bits = [];
      if (x.line && y.line && (Math.abs(x.line[0] - y.line[0]) > GLASS_TOL || Math.abs(x.line[1] - y.line[1]) > GLASS_TOL)) bits.push('first line ' + x.line.join(', ') + ' → ' + y.line.join(', '));
      if (x.tab && y.tab && Math.abs(x.tab[1] - y.tab[1]) > GLASS_TOL) bits.push('tab ' + x.tab[1] + ' → ' + y.tab[1] + 'px down');
      if (bits.length) out.push({ check: 'width-invariance', walk: c.walk, key: c.key, sub: e.sub, ex: e.sub + ': ' + bits.join(' · ') + ' (1600 → ' + VIEWPORT.width + ')' });
    }
  }
  return out;
}
const excerpt = (s, needle) => {
  const i = s.toLowerCase().indexOf(String(needle).toLowerCase());
  return i < 0 ? null : s.slice(Math.max(0, i - 50), i + 60);
};

/**
 * **P7 — the tab you click does not move, with another card open** (Ed's QA of
 * batch S: *the 🤚 tab moves when you click it*). P2 and P6 are green and stay
 * green, and they are both about a tab opened from rest: `walkSettled` closes
 * each card by its own mark before opening the next, so no walk had ever put
 * the surface in the state that breaks the promise — a card standing open in
 * one paragraph, and then a tab clicked in another, where the collapse takes
 * several hundred pixels out of the band above the tab that was pressed.
 *
 * It is not a fact about one card, so it does not belong in `rulesFor`; it is
 * a fact about a *pair*, and it files with the cross-card findings for the
 * same reason they do.
 *
 * **Tolerance is a pixel, not P2's hundredth.** The promise is kept by a
 * scroll correction, and `restoreStill` deliberately ignores a drift of half a
 * pixel or less rather than jittering the page — so a correct surface lands
 * within a pixel and never on zero, and a hundredth would be red on a page
 * doing exactly the right thing. The defect this is for is in the hundreds.
 */
const SWITCH_TOL = 1;
function switchRules(switches) {
  const out = [];
  for (const s of switches) {
    if (!s.travel) continue;                       // the pass files its own error
    const [dx, dy] = s.travel;
    if (Math.abs(dx) <= SWITCH_TOL && Math.abs(dy) <= SWITCH_TOL) continue;
    out.push({ rule: 'P7', lens: 'positioning',
      said: 'the tab you click does not move, with another card open elsewhere in the band — ' +
        'within ' + SWITCH_TOL + 'px of 0 in both axes',
      saw: 'with ' + s.open + ' open, clicking ' + s.click + ' moves its glyph ' +
        dx + 'px across and ' + dy + 'px down',
      note: s.walk + ' · ' + s.room + 'px of page stood above the tab when it was pressed' });
  }
  return out;
}

/**
 * **P11 — a card's strip is its clause's, and a switch inside it is a morph**
 * (Ed, 2026-09-24, the green tab; SURFACE M12, M13). A clause carrying one
 * record still owed its OK and one filed: with the green ✔ open the strip held
 * both, and a click on the grey tab opened the filed record and took the green
 * one out of the strip — it had stood there only as the open card's own tab,
 * being in neither the live strip nor the filed pile. So two readings, both
 * charter-only, both over every clause carrying a sealed record:
 *
 * - **the same tabs whichever card is open** — every card opened at one clause
 *   draws the same set of tabs in its strip; a tab that is there only while
 *   its own card is open is the defect.
 * - **a switch keeps the strip and the tab** — with one card open, a click on
 *   another tab of the strip (opening the filed pile first where the tab is in
 *   it) leaves the strip holding the same tabs, and the tab clicked within
 *   `SWITCH_TOL` of where it was (M12: *the tab you click does not move*).
 *
 * Only switches with a sealed record on at least one side are driven: the
 * live-only switch is `card-morph`'s, measured elsewhere, and driving every
 * pair of a busy clause would be minutes for no new promise.
 *
 * **The travel is read on every switch, live to record included** (Q1524 (a),
 * Ed 2026-09-24). A switch between a live card and a record moved the strip by
 * the record's own eyebrow row, 28.85px at 1600 on § Guests: the charter held
 * the clause's card still (`keepStill`), not the tab, and the record's head
 * stands one row lower. Ed ruled the tab held as every other switch holds it,
 * so a mixed switch (`mixed`, kept in the payload) is measured like the rest.
 */
function stripRules(strips) {
  const out = [];
  const byKey = new Map();
  for (const s of strips.filter((x) => x.kind === 'open')) {
    if (!byKey.has(s.key)) byKey.set(s.key, []);
    byKey.get(s.key).push(s);
  }
  for (const [key, ss] of byKey) {
    const all = [...new Set(ss.flatMap((s) => s.tabs))];
    for (const s of ss) {
      const missing = all.filter((t) => !s.tabs.includes(t));
      if (!missing.length) continue;
      out.push({ rule: 'P11', lens: 'positioning',
        said: 'a card\'s strip is its clause\'s — the same tabs whichever card at the clause is open (M12, M13; the green tab, 2026-09-24)',
        saw: 'at ' + key + ', with ' + s.id + ' open the strip lacks ' + missing.join(', '),
        note: s.walk });
    }
  }
  // **the pile says how deep it is** (Ed, 2026-09-24: a pile of two records
  // read as one tab): closed, its front tab wears one edge per record behind
  // it, capped at four; opened by a click, no edges at all
  const edgesFor = (behind) => Math.max(0, Math.min(behind, 4));
  for (const s of strips.filter((x) => x.kind === 'open' && x.pile && !x.pile.open)) {
    if (s.pile.edges === edgesFor(s.pile.n - 1)) continue;
    out.push({ rule: 'P11', lens: 'positioning',
      said: 'a closed filed pile draws one edge per record behind its front tab, capped at four (the queue card stack\'s edges; Ed, 2026-09-24)',
      saw: 'at ' + s.key + ', with ' + s.id + ' open, a closed pile of ' + s.pile.n + ' draws ' + s.pile.edges + ' edge(s)',
      note: s.walk });
  }
  for (const s of strips.filter((x) => x.kind === 'pile' || (x.kind === 'open' && x.pile && x.pile.open))) {
    if (!s.pile.anyEdges) continue;
    out.push({ rule: 'P11', lens: 'positioning',
      said: 'an open filed pile draws no edges — its records stand as tabs (Ed, 2026-09-24)',
      saw: 'at ' + s.key + ', with ' + s.id + ' open, the open pile still draws edges on ' + s.pile.anyEdges + ' tab(s)',
      note: s.walk });
  }
  const UNREAD_KINDS = new Set(['adopted', 'retired']);
  for (const d of strips.filter((x) => x.kind === 'door')) {
    // the door is the record still owed its OK, where there is one (the green tab)
    const unread = [...new Set(strips.filter((x) => x.kind === 'open' && x.key === d.key)
      .flatMap((x) => Object.entries(x.kinds || {}).filter(([, k]) => UNREAD_KINDS.has(k)).map(([id]) => id)))];
    if (unread.length && !UNREAD_KINDS.has(d.mark)) {
      out.push({ rule: 'P11', lens: 'positioning',
        said: 'a record still owed its OK is the one the gutter shows — the door never stands a read record over it (the green tab, 2026-09-24)',
        saw: 'at ' + d.key + ', the door shows ' + d.door + ' (' + d.mark + ') over ' + unread.join(', '),
        note: d.walk });
    }
    if (d.edges === edgesFor(d.records - 1)) continue;
    out.push({ rule: 'P11', lens: 'positioning',
      said: 'a record door in the gutter draws one edge per other record at its clause, capped at four (Ed, 2026-09-24)',
      saw: 'at ' + d.key + ', ' + d.records + ' records stand behind a door (' + d.door + ') drawing ' + d.edges + ' edge(s)',
      note: d.walk });
  }
  for (const s of strips.filter((x) => x.kind === 'switch')) {
    const lost = s.before.filter((t) => !s.after.includes(t));
    const gained = s.after.filter((t) => !s.before.includes(t));
    if (lost.length || gained.length) {
      out.push({ rule: 'P11', lens: 'positioning',
        said: 'a switch inside a strip keeps the strip — the same tabs before and after (M12, M13; the green tab, 2026-09-24)',
        saw: 'at ' + s.key + ', with ' + s.open + ' open, clicking ' + s.click + ' ' +
          [lost.length ? 'took ' + lost.join(', ') + ' out of the strip' : '',
            gained.length ? 'put ' + gained.join(', ') + ' into it' : ''].filter(Boolean).join(' and '),
        note: s.walk });
    }
    if (!s.travel) continue;
    const [dx, dy] = s.travel;
    if (Math.abs(dx) <= SWITCH_TOL && Math.abs(dy) <= SWITCH_TOL) continue;
    out.push({ rule: 'P11', lens: 'positioning',
      said: 'the tab you click inside a strip does not move — within ' + SWITCH_TOL + 'px of 0 in both axes (M12)',
      saw: 'at ' + s.key + ', with ' + s.open + ' open, clicking ' + s.click + ' moves its glyph ' +
        dx + 'px across and ' + dy + 'px down',
      note: s.walk });
  }
  return out;
}

/**
 * **P8 — the rule's own tab tops its pile, and names its rule** (Q1299, Q1320;
 * SURFACE §6's news row and §8's `ans-*` row). Two promises about a band
 * paragraph's pile, closed or opened into a strip: the setting the paragraph is
 * about is the first chip — the front of the pile, the top of the strip — with
 * the records, the power tabs and the answer task behind it; and that front
 * chip wears the setting's own glyph rather than the drawn ✔, in every state
 * but a vote of yours. Ed's 2026-09-11 screenshot was the second promise
 * broken while the first held: 🤝's own tab, in `news`, wearing the ✔ a filed
 * record wears, so a green ✔ stood on the pile where the rule's glyph should.
 *
 * Read off the DOM rather than the payload because a pile is not a card: the
 * cards are measured one at a time and the order of the chips beside them is a
 * fact about the paragraph. Paragraphs whose pile has no host — *Founded by*,
 * which holds the two grants — are exempt by name.
 */
const HOSTLESS_PARAS = new Set(['founded']);
function pileRules(piles) {
  const out = [];
  const seen = new Set();
  const file = (rule, said, saw, note) => {
    if (seen.has(saw)) return;
    seen.add(saw);
    out.push({ rule, lens: 'positioning', said, saw, note });
  };
  for (const p of piles) {
    if (HOSTLESS_PARAS.has(p.para)) continue;
    const where = (p.open ? 'the strip' : 'the pile') + ' at ' + p.para +
      (p.opened && p.opened !== p.para ? ' (opened by ' + p.opened + ')' : '');
    if (p.front !== p.para) {
      file('P8', 'the rule\'s own tab is the first chip of its pile and of its strip — the records, the power tabs and the answer task behind it (Q1299, Q1320)',
        where + ' leads with ' + p.front + ' — ' + p.order.join(' · '), p.walk);
    } else if (p.tick) {
      file('P8', 'the front of a setting\'s pile wears the setting\'s own glyph, never the drawn ✔ (Q1320: *setting itself with setting icon should sit at the top of setting tab stacks*)',
        where + ' wears the drawn ✔ on its front tab, in state ' + p.state, p.walk);
    }
  }
  return out;
}

/* ============================================================================
   The cross-card lenses. These are the findings the per-pass audits
   structurally cannot see, and they only exist once every card is in one
   table — so they run last, over the whole payload at once.
   ========================================================================== */
function crossCard(cards) {
  const out = [];

  // T5 — one label per rung, everywhere. The founder's radio, the member's
  // ladder and the composer's lane must say the same words for one value.
  // **And the composer's lane is one of the three** (issue #19). It was not:
  // a lane's only identity in the payload was `data-mval`, whose value is the
  // sentence the lane would set, so a lane joined nothing — every one of them
  // was a rung of its own with one label, the size-2 test never fired, and
  // the lens read as coverage of three surfaces while seeing two. 👤 ⚖️ 🌍
  // and 🤝 each drew a third wording underneath it for as long as that held.
  // The lane says which rung it is now (`data-mset` / `data-mrung`, read
  // ahead of `data-mval` where `strings.options` is built), and the three
  // surfaces meet here. `data-motion` is deliberately still unjoined: a
  // consent card's *yes* is not a rung of anything, and its block's text is
  // whatever that one motion proposes.
  // One thing this does not distinguish, and it is a real one: a rung whose
  // sentence names a fact about the room — 🌍's clerk deviation, 🤝's 🪪
  // price — is two sentences in two rooms, so a walk seated differently from
  // the rest would report it as two labels and be right about the strings
  // and wrong about the defect.
  // The status-quo *keep* rungs (Ed's QA, 2026-09-02 pm) are exempt by
  // design: their label IS the member's own standing value — a name, a
  // picture — so two seats rightly label them two ways.
  // …and since Ed's card review round 3 (2026-09-05, A7) the *Anonymous*
  // picture rung too: its label is the avatar you would wear anonymous —
  // your own initials where you have a name — so it is a value rung as well.
  const VALUE_RUNGS = new Set(['namePick=keep', 'picPick=keep', 'appPicPick=keep', 'picPick=anon', 'appPicPick=anon']);
  const byRung = new Map();
  for (const c of cards) {
    for (const o of c.strings.options) {
      if (!o.set || !o.val || !o.label) continue;
      const k = o.set + '=' + o.val;
      if (VALUE_RUNGS.has(k)) continue;
      if (!byRung.has(k)) byRung.set(k, new Map());
      const seen = byRung.get(k);
      const label = o.label.replace(/\s+/g, ' ').trim();
      if (!seen.has(label)) seen.set(label, []);
      seen.get(label).push(c.walk + '·' + c.key);
    }
  }
  for (const [rung, labels] of byRung) {
    if (labels.size < 2) continue;
    out.push({ rule: 'T5', lens: 'cross-card',
      said: 'one label per rung, everywhere — the founder\'s radio, the member\'s ladder and the composer\'s lane say the same words',
      saw: rung + ' is labelled ' + labels.size + ' ways',
      note: [...labels].map(([l, where]) => '“' + l + '” (' + where.slice(0, 3).join(', ') + ')').join(' · ') });
  }

  // §1 — one glyph, one meaning. A glyph that appears against two different
  // card keys is not by itself wrong (✏️ is everywhere); what this reports
  // is the *head* glyph of a card, which is its identity.
  const LIFECYCLE = ['💡', '🔥', '⚔️', '🌶️', '⏳', '↻', '⏸', '✏️', '✔', '✖'].map((g) => g.replace(/️/g, ''));
  const glyphOf = new Map();
  for (const c of cards) {
    const g = ((c.tabGlyph || '').match(GLYPH_RE) || [])[0];
    // Two exclusions, both by design rather than by drift. The two power tabs
    // wear ✒️ and 🛡️ on every setting — that is the tab group. And a
    // lifecycle mark says where a decision stands, so it is *supposed* to
    // head every card in that state; only a subject glyph names one thing.
    if (!g || /^pw:[ua]:/.test(c.key) || LIFECYCLE.includes(g.replace(/️/g, ''))) continue;
    // 📧 may be used twice — your own email card and the stranger's login
    // (Ed, pass 4 F-F, 2026-08-31: the exemption, not a new glyph)
    if (g === '📧') continue;
    // **A motion is not a second subject** (SURFACE E10, M18; Q1367). One
    // motion is one tab and one entry, keyed `mo:<id>`, standing in its
    // host's own pile and wearing the host's glyph — the motion on 🌍 is a
    // 🌍 card, and that is the rule rather than a breach of it. Counted by
    // its key it was a second card claiming the glyph, so every running
    // setting motion the `settled` walk seeds filed a G2 against the very
    // setting it belongs to, three of them on every run. It counts as its
    // host, which keeps the lens able to see the real defect: a motion
    // wearing a glyph that is not its host's still lands in the wrong set.
    const key = (c.host || c.key).replace(/^(ans|str)[-:]?/, '');
    if (!glyphOf.has(g)) glyphOf.set(g, new Set());
    glyphOf.get(g).add(key);
  }
  for (const [g, keys] of glyphOf) {
    if (keys.size > 1) {
      out.push({ rule: 'G2', lens: 'cross-card', said: 'a subject glyph names one thing (STYLE §1)',
        saw: g + ' heads ' + keys.size + ' different cards', note: [...keys].join(', ') });
    }
  }

  /* **Every glyph is drawn** (Q1401, Ed 2026-09-16). One picture per glyph,
     from Microsoft's Fluent Flat set — so a mapped character surviving in a
     text node is a site the conversion missed, and it will go on drawing
     whatever emoji font the reader's machine carries beside thirty that do
     not. Reported per character with the places it was seen, because that is
     what names the site; `rawGlyphs` is collected on every card. */
  const rawWhere = new Map();
  for (const c of cards) {
    for (const r of c.rawGlyphs || []) {
      if (!rawWhere.has(r)) rawWhere.set(r, new Set());
      rawWhere.get(r).add(c.walk + '·' + c.key);
    }
  }
  for (const [r, where] of rawWhere) {
    const [zone, ch] = r.split(' ');
    out.push({ rule: 'G1', lens: 'cross-card',
      said: 'every subject, wallet and commit glyph is drawn — the character is its name, never its picture',
      saw: ch + ' is still a character in the ' + zone + ' on ' + where.size
        + (where.size === 1 ? ' card' : ' cards'),
      note: [...where].slice(0, 10).join(', ') });
  }

  // Where the lockline stands. It opens a read-only body and closes a grant's,
  // and one surface reading two ways is the kind of thing only a pass over
  // every card at once can see.
  const above = cards.filter((c) => c.lockAbove === true).map((c) => c.walk + '·' + c.key);
  const below = cards.filter((c) => c.lockAbove === false).map((c) => c.walk + '·' + c.key);
  if (above.length && below.length) {
    out.push({ rule: 'H3', lens: 'cross-card',
      said: 'the lockline is one object, so it stands in one place',
      saw: 'it opens the body on ' + above.length + ' cards and closes it on ' + below.length,
      note: 'above: ' + [...new Set(above.map((s) => s.split('·')[1]))].slice(0, 10).join(', ') +
        ' — below: ' + [...new Set(below.map((s) => s.split('·')[1]))].slice(0, 10).join(', ') });
  }

  // One word, one size. The same label at two font sizes on two cards is the
  // per-pass audits' blind spot in its plainest form.
  const sizeOf = new Map();
  for (const c of cards) {
    for (const b of c.buttons) {
      if (!b.label || !b.fontSize) continue;
      const l = b.label.replace(/\s+/g, ' ').trim();
      // a glyph tunes a silhouette to its box, not text to a scale — B5's own
      // exemption, applied to the cross-card compare too (pass 4: the charter
      // 🗑️ at 19.2px against the band's 14px is two boxes, not two sizes)
      if (GLYPH_ONLY.test(l)) continue;
      if (!sizeOf.has(l)) sizeOf.set(l, new Map());
      if (!sizeOf.get(l).has(b.fontSize)) sizeOf.get(l).set(b.fontSize, []);
      sizeOf.get(l).get(b.fontSize).push(c.walk + '·' + c.key);
    }
  }
  for (const [label, sizes] of sizeOf) {
    if (sizes.size < 2) continue;
    out.push({ rule: 'B6', lens: 'cross-card', said: 'one control, one size — a button label is --t-ui',
      saw: '“' + label + '” is set at ' + [...sizes.keys()].join('px and ') + 'px',
      note: [...sizes].map(([s, where]) => s + 'px on ' + where.length + ' (' + where.slice(0, 3).join(', ') + ')').join(' · ') });
  }

  // T9 — one voice, only the object changing. Every power sentence should be
  // the same shape; a card whose ✒️ or 🛡️ line deviates is the finding.
  const voice = cards.filter((c) => /^pw:u:/.test(c.key)).map((c) => (c.strings.head || '').replace(/\s+/g, ' '));
  const shapes = new Set(voice.map((v) => v.replace(/(^|\s)(the )?[A-Z][^.]*?(?= at will)/i, '<object>')));
  if (shapes.size > 2) {
    out.push({ rule: 'T9', lens: 'cross-card', said: 'one voice, only the object changing — every ✒️ line is *the Founder [does X] at will*',
      saw: shapes.size + ' distinct shapes across the ✒️ cards', note: [...shapes].slice(0, 6).join(' · ') });
  }

  // T4 — a task you have to do carries no subtitle; subtitles survive on a
  // motion and on news. Read off the rail rather than the card.
  return out;
}

/* ============================================================================
   The walks.
   ========================================================================== */
const wait = (page, ms) => page.waitForTimeout(ms);

/** zone-overlap's readings, one at rest and one with a card open, per walk;
 *  and the closed walks' page-wide tooltips (closed-page) */
const zoneReads = [];
const tipReads = [];
/** per walk, at rest: P29's page half (every powers line and ✒️ 🛡️ tab left
 *  on a closed page) and P31's flush tabs */
const restReads = [];
async function zonesFor(page, walk, when, key) {
  if (zoneReads.some((z) => z.walk === walk && z.when === when)) return;
  try {
    const zones = await page.evaluate(() => window.__CA.zonesNow());
    zoneReads.push({ walk, when, key: key || null, zones });
    if (when === 'rest' && /^closed/.test(walk)) tipReads.push({ walk, tips: await page.evaluate(() => window.__CA.pageTips()) });
    if (when === 'rest') {
      restReads.push({ walk, ...(await page.evaluate(() => ({
        powers: window.__CA.closedPowers(), tabs: window.__CA.tabsFromGlass() }))) });
    }
  } catch (e) { /* recorded as missing in the summary */ }
}

/**
 * **P13's two openings** (BUILD.md §2, *opening from a scroll that allows
 * compensation*). The general case opens a card with its first line
 * `P13_ROOM` px under the glass — more than any label's room — so the page
 * can make the room above it and keep the line still; the page-top case
 * opens the walk's first card at scroll 0, the band's first card or the
 * first clause. Both press the card's own tab, never the rail.
 */
const P13_ROOM = 200;
async function glassPress(page, key, sub) {
  return page.evaluate(([k, room, s]) => {
    const C = window.__CA;
    C.placeFor(k, room);
    const a = s === 'switch' ? C.glassSwitch(k) : C.glassClosed(k);
    const why = C.pressTab(k);
    return { a, pressed: !why, why };
  }, [key, P13_ROOM, sub]);
}
const pageTopDone = new Set();
/** the shortfall reading, once per walk and per kind built on the shell */
const shortDone = new Set();
async function pageTopPass(page, key, walk, p13, errors) {
  if (pageTopDone.has(walk)) return;
  pageTopDone.add(walk);
  const r = await page.evaluate((k) => {
    window.scrollTo(0, 0);
    const a = window.__CA.glassClosed(k);
    return { a, why: window.__CA.pressTab(k) };
  }, key);
  if (r.why) { p13.push({ sub: 'page-top', unread: r.why }); return; }
  await wait(page, 300);
  p13.push({ sub: 'page-top', a: r.a, b: await page.evaluate((k) => window.__CA.glassOpen(k), key) });
  await page.evaluate((k) => window.__CA.closeOpenCard(k), key);
  await wait(page, 220);
  if (await page.evaluate(() => window.__CA.openCardEl())) errors.push(walk + ': ' + key + ' did not close after the page-top pass');
}

async function openAndMeasure(page, key, cardSel, walk, cards, errors) {
  // **The review walk may already have opened it** (Q1536, Ed 2026-09-25): an
  // OK on owed news opens the next owed card, so a grant accepted leaves the
  // next grant open. Closed first, it is measured from rest as it always was;
  // pressed while open, its tab would shut it and read as opening nothing.
  if (await page.evaluate((k) => [...document.querySelectorAll('.setupcard[data-setupcard], .sugg[data-card]')]
    .some((c) => (c.dataset.setupcard || c.dataset.card) === k), key)) {
    await page.evaluate((k) => window.__CA.closeOpenCard(k), key);
    await wait(page, 400);
  }
  const before = await page.evaluate((k) => window.__CA.closedGeo(k), key);
  if (!before.anyOpen) await zonesFor(page, walk, 'rest');
  const clickIn = () => page.evaluate((k) => {
    const sel = '[data-card="' + CSS.escape(k) + '"], [data-tab="' + CSS.escape(k) + '"]';
    const el = document.querySelector('#rail ' + sel) || document.querySelector('#band ' + sel) ||
      document.querySelector('#charter ' + sel) || document.querySelector(sel);
    if (!el) return false;
    el.click();
    return true;
  }, key);
  const p13 = [];
  // P13's page-top case: the walk's first card from rest, opened by its tab
  // at scroll 0 and closed again before the walk's own way in
  if (!before.anyOpen) await pageTopPass(page, key, walk, p13, errors);
  // P13's switch: with another card open, the target is scrolled to where its
  // label could have room and **its own tab is pressed** — the rail travels,
  // and a travel would read as the tab moving
  let switchGlass = null;
  let opened;
  if (before.anyOpen) {
    const sw = await glassPress(page, key, 'switch');
    switchGlass = sw;
    opened = sw.pressed || await clickIn();
  } else opened = await clickIn();
  if (!opened) { errors.push(walk + ': no way in to ' + key); return null; }
  await wait(page, 300);
  const m = await page.evaluate((a) => window.__CA.measure(a[0], a[1], a[2]), [cardSel, key, before]);
  if (!m) { errors.push(walk + ': ' + key + ' opened nothing'); return null; }
  m.walk = walk;
  m.switchOpen = !!before.anyOpen;
  m.p13 = p13;
  if (switchGlass) {
    if (switchGlass.pressed) p13.push({ sub: 'switch', a: switchGlass.a, b: await page.evaluate((k) => window.__CA.glassOpen(k), key) });
    else p13.push({ sub: 'switch', unread: switchGlass.why });
  }
  await zonesFor(page, walk, 'open', key);
  /**
   * **still, the close half.** A card opened from rest is closed again by its
   * own pressed tab and the closed reading taken a second time — on the page
   * (`reclosed`) and on the glass (P13's close) — then **reopened by its own
   * tab from a scroll that leaves room above it**, which is P13's general
   * case, so the walk goes on with the card open exactly as before. Where
   * there is no front tab a pointer could press, the reopening is the walk's
   * own way in and P13's open half is recorded as unread. A card opened while
   * another stood open is a switch, and has no rest to return to.
   */
  if (!before.anyOpen) {
    try {
      const a = await page.evaluate((k) => window.__CA.glassOpen(k), key);
      const how = await page.evaluate((k) => window.__CA.closeOpenCard(k), key);
      await wait(page, 220);
      const still = await page.evaluate(() => window.__CA.openCardEl());
      const again = await page.evaluate((k) => window.__CA.closedGeo(k), key);
      m.grammar.reclosed = still ? { error: 'the card did not close (' + how + ')' } : again;
      if (!still) {
        p13.push({ sub: 'close', a, b: await page.evaluate((k) => window.__CA.glassClosed(k), key) });
        const op = await glassPress(page, key, 'open');
        if (op.pressed) {
          await wait(page, 300);
          p13.push({ sub: 'open', a: op.a, b: await page.evaluate((k) => window.__CA.glassOpen(k), key) });
          /* **Where room runs out** (Q1541 stage 1; answers Part 6.4): the
           * page top is not the only place the scroll cannot give the room —
           * a first line just under the topbar is another, and the walk's
           * first card may have all the room it needs at scroll 0 (the
           * band's does). So once per walk and per kind built on the one
           * shell, the card is opened again with its first line 10px under
           * the glass, where it must come down by the shortfall and its
           * label land clear of the topbar — read as P13's page-top case. */
          if (m.shellKind && !shortDone.has(walk + '·' + m.shellKind)) {
            shortDone.add(walk + '·' + m.shellKind);
            await page.evaluate((k) => window.__CA.closeOpenCard(k), key);
            await wait(page, 220);
            const sh = await page.evaluate((k) => {
              const C = window.__CA;
              C.placeFor(k, 10);
              const a = C.glassClosed(k);
              return { a, why: C.pressTab(k) };
            }, key);
            await wait(page, 300);
            if (sh.why) { p13.push({ sub: 'page-top', unread: sh.why }); await clickIn(); await wait(page, 300); }
            else p13.push({ sub: 'page-top', short: true, a: sh.a, b: await page.evaluate((k) => window.__CA.glassOpen(k), key) });
          }
        } else {
          p13.push({ sub: 'open', unread: op.why });
          await clickIn();
          await wait(page, 300);
        }
        if (!await page.evaluate(() => window.__CA.openCardEl())) errors.push(walk + ': ' + key + ' did not reopen after the close pass');
      } else p13.push({ sub: 'close', unread: 'the card did not close' });
    } catch (e) { errors.push(walk + ': close pass on ' + key + ' threw — ' + (e && e.message)); }
  }
  cards.push(m);
  return m;
}


/**
 * **The switch pass** — a card open in one paragraph, a tab clicked in
 * another. Appended at the end of `walkSettled` and additive by construction:
 * it pushes nothing into `cards`, so every geometry number the instrument
 * already has, and every `closed` baseline the per-card loop measures from,
 * is exactly what it was.
 *
 * Two pairs, because one would read as a special case for the identity cards.
 * 🥾 above the members list and then ✋ is the pair Ed met the defect on;
 * 🌍 and then 💤 is an ordinary clause pair, so the rule reads as the general
 * promise it is.
 */
const SWITCH_PAIRS = [['removal', 'myname'], ['chamber', 'lapse']];
const r2 = (v) => Math.round(v * 100) / 100;

async function switchPass(page, walk, switches, errors) {
  const closeOpen = () => page.evaluate(() => {
    const mark = document.querySelector('.setupcard .chipcol .achip.wmark, .gcard .chipcol .achip.wmark') ||
      document.querySelector('.setupcard .chipcol .achip, .gcard .chipcol .achip');
    if (mark) mark.click();
  });
  const clickTab = (key) => page.evaluate((k) => {
    const el = document.querySelector('#band [data-tab="' + String(k).replace(/["\\]/g, '\\$&') + '"]');
    if (!el) return false;
    el.click();
    return true;
  }, key);

  for (const [open, click] of SWITCH_PAIRS) {
    await closeOpen();
    await wait(page, 250);
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(page, 150);
    if (!await clickTab(open)) { errors.push(walk + ': switch pass — no band tab for ' + open); continue; }
    await wait(page, 320);
    /**
     * **The tab has to be on screen, and the page has to have somewhere to go.**
     * The promise is kept by scrolling up by what the closing card took out
     * from above, so a tab pressed at scroll 0 cannot be held still by any
     * amount of correcting — the measurement would be about the scroll floor
     * rather than about the switch. `block: 'start'` puts the most page above
     * it that the surface has to give; `room` is recorded so a red finding
     * says whether it had the room.
     */
    const room = await page.evaluate((k) => {
      const el = document.querySelector('#band [data-tab="' + String(k).replace(/["\\]/g, '\\$&') + '"]');
      if (!el) return null;
      el.scrollIntoView({ block: 'start' });
      return Math.round(window.scrollY * 100) / 100;
    }, click);
    if (room === null) { errors.push(walk + ': switch pass — no band tab for ' + click); continue; }
    await wait(page, 200);
    const before = await page.evaluate((k) => window.__CA.bandTabSeen(k), click);
    await clickTab(click);
    await wait(page, 420);
    const after = await page.evaluate((k) => window.__CA.bandTabSeen(k), click);
    if (!before || !after) errors.push(walk + ': switch pass — ' + click + ' had no glyph to measure');
    switches.push({ walk, open, click, room, before, after,
      travel: before && after ? [r2(after[0] - before[0]), r2(after[1] - before[1])] : null });
  }
  await closeOpen();
  await wait(page, 200);
}

/** the birth, verbatim from founding-walk.mjs — three cards and a magic link */
async function birth(page) {
  const clickIn = async (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el || el.disabled) return false;
    el.click(); return true;
  }, sel);
  const typeIn = async (sel, v) => page.evaluate((a) => {
    const el = document.querySelector(a[0]);
    if (!el) return false;
    if (el.isContentEditable) { el.textContent = a[1]; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
    else { el.value = a[1]; el.dispatchEvent(new Event('input', { bubbles: true })); }
    return true;
  }, [sel, v]);
  return { clickIn, typeIn };
}

/**
 * Walk 1 — the founding, as the founder meets it: every card in `ORDER`,
 * opened before it is answered, which is the only state in which its
 * question, its helper text and its dark commit can be read.
 */
async function walkFounding(page, base, cards, errors, opts = {}) {
  await page.goto(withQuery(pageUrl(base)));
  await page.waitForSelector('#rail .qitem', { timeout: 20_000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(page, 300);
  const { clickIn, typeIn } = await birth(page);
  const walk = opts.walk || 'founding';

  await openAndMeasure(page, 'title', '.setupcard', walk, cards, errors);
  await typeIn('.setupcard [data-titlelane]', 'Hollow Oak Club Charter');
  await clickIn('.setupcard [data-confirm]'); await wait(page, 320);
  await openAndMeasure(page, 'slug', '.setupcard', walk, cards, errors);
  await clickIn('.setupcard [data-confirm]'); await wait(page, 320);
  await openAndMeasure(page, 'myemail', '.setupcard', walk, cards, errors);
  await typeIn('.setupcard input[type="email"]', 'ada@example.org');
  await clickIn('.setupcard [data-confirm]'); await wait(page, 400);
  await clickIn('[data-act="clickmail"]'); await wait(page, 700);

  // then whatever the rail asks for, one at a time, exactly as the founder
  // meets it — the order IS the dependency list
  const seen = new Set(['title', 'slug', 'myemail']);
  for (let i = 0; i < 40; i++) {
    const next = await page.evaluate((done) => {
      const li = [...document.querySelectorAll('#rail li')].map((el) => el.dataset.q ||
        (el.querySelector('[data-card]') || { dataset: {} }).dataset.card).filter(Boolean);
      return li.find((k) => !done.includes(k)) || null;
    }, [...seen]);
    // a founding that stops at the save is a walk that could not go on, not a
    // short founding — said, so a three-card run is not read as coverage
    if (!next && i === 0) errors.push(walk + ': the rail offered nothing after the save — the founding stopped at 📧');
    if (!next) break;
    seen.add(next);
    const m = await openAndMeasure(page, next, '.setupcard', walk, cards, errors);
    if (!m) continue;
    // **The state the other six pass through** (Q766). A card is measured
    // *before* it is answered on the founding walk and *after* on the settled
    // one; the state in between — handed to the room and still collecting — is
    // where the delegate rung and the blind-collection note stand together,
    // and it was measured nowhere. `delegateAll` chooses the rung and
    // re-measures the same open card in place, so the walk reports the
    // collecting body rather than the untouched one. A card with no rung to
    // choose is dropped from this walk and answered the ordinary way: leaving
    // it unanswered stalls the founding, which is what a rail with nothing new
    // on it means.
    const handedOver = opts.delegateAll && await clickIn('.setupcard .delegrung [data-val="roster"]');
    if (handedOver) {
      await wait(page, 320);
      const d = await page.evaluate((a) => window.__CA.measure(a[0], a[1], a[2]), ['.setupcard', next, null]);
      if (d) {
        d.walk = walk;
        // the grammar's closed readings are the card's, not the delegation's
        if (d.grammar && m.grammar) { d.grammar.closedBefore = m.grammar.closedBefore; d.grammar.reclosed = m.grammar.reclosed; d.grammar.remeasured = true; }
        d.switchOpen = m.switchOpen;
        cards[cards.length - 1] = d;
      }
    } else if (next === opts.delegate) {
      await clickIn('.setupcard .delegrung [data-val="roster"]');
    } else {
      if (opts.delegateAll) cards.pop();
      const opt = m.strings.options.find((o) => o.set && o.val && !o.on);
      if (opt) {
        const ok = await clickIn('.setupcard [data-set="' + opt.set + '"][data-val="' + opt.val + '"]');
        if (!ok) await clickIn('.setupcard [data-ans="' + opt.set + '"][data-ansval="' + opt.val + '"]');
      }
    }
    // with no defaults a card waits for its numbers: fill whatever is empty
    await page.evaluate(() => {
      document.querySelectorAll('.setupcard input, .setupcard textarea').forEach((inp) => {
        // **The attribute, not the property** (2026-09-17, the cross-browser
        // pass). An engine that does not implement an input type reports
        // `type` as `text` — WebKit does exactly this for `datetime-local` —
        // so the branch below fell through and wrote *Ada Lovell* into ⏰'s
        // Ends field. The card could not settle, the founding stalled at ⏰,
        // and the three founding walks each lost the four cards after it with
        // **no error raised**: 251 cards where chromium measured 263, and the
        // summary read as coverage. What the markup *says* the field is does
        // not vary by engine, so that is what is asked.
        const type = inp.getAttribute('type') || inp.type;
        if (inp.value || /^(email|radio|checkbox|file|hidden|range|color)$/.test(type)) return;
        if (type === 'number') inp.value = String(Math.max(+inp.min || 1, 5));
        else if (type === 'datetime-local') inp.value = '2026-09-18T18:00';
        else inp.value = 'Ada Lovell';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    await wait(page, 200);
    (await clickIn('.setupcard [data-confirm]')) || (await clickIn('.setupcard [data-ok]'));
    await wait(page, 300);
  }
}

/**
 * Walk 2 — the founder's own answer cards. A delegated question is served
 * back to the founder as `ans-<key>`, and that card exists on no other
 * drive: with the founder alone on the roster the ordinary walk can never
 * reach it (`founding-walk.mjs --delegate`).
 */
const walkAnswers = (page, base, cards, errors) =>
  walkFounding(page, base, cards, errors, { delegate: 'chamber', walk: 'answers' });

/**
 * Walk 7 — every delegable setting **open and collecting** (Q766): the
 * founder's own view of a question he has just handed to the room. See
 * `delegateAll` in `walkFounding` for why the other six never reach it.
 */
const walkDelegated = (page, base, cards, errors) =>
  walkFounding(page, base, cards, errors, { delegateAll: true, walk: 'delegated' });

/**
 * Walk 3 — the settled surface: every card the band offers once the founding
 * is over, which is where a settled card's head, its composer and the ✒️/🛡️
 * power tabs live. ⏩ is the stagehand that gets there in one press.
 */
async function walkSettled(page, base, cards, errors, seat, switches, piles) {
  await page.goto(withQuery(pageUrl(base)));
  await page.waitForSelector('#rail .qitem', { timeout: 20_000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(page, 300);
  await page.click('#devff');
  await wait(page, 900);
  const walk = seat ? 'seat:' + seat : 'settled';
  /**
   * **Two settled motions, so the band's record chips have something to
   * hold** (Q942, entry 72). ⏩ leaves a document with no motion in its life
   * at all, so the record card — a chip filed behind its rule's tab — had no
   * instance on any walk and nothing to measure or read.
   *
   * The pair is chosen by what the module will actually do. 👥 `quorum` is
   * delegated by ⏩'s own `FILL`, so a carried constitutional motion on it
   * lands in the document rather than parking at the 👑; and a **constitutional
   * motion never settles as rejected** — a `keep` answer simply leaves it
   * running until the close — so the rejected half has to be an *ordinary*
   * one, adjudicated `held` through the dev seam, which is ⏱️ `rate`. It was
   * 🌡️ `bar` until 2026-09-15, when that card left the surface (Q1362): 👥 is
   * the constitutional number the founding still collects.
   *
   * Seeded **before the seat switch**, so the `seat:` walks measure the record
   * from a member's chair too, where the mover is the sealed string.
   */
  /**
   * **The page's own field goes with the module, or the instrument seeds the
   * defect it then reports.** The 🌍 set below is made in the module, and the
   * founder's settled ladder is drawn from `S` — the page's provisional layer
   * — which no module call touches. `ladderView` blanks the rung that stands
   * (Q1293), so a page whose `S.chamber` still held the founding's answer drew
   * that answer lit beneath a standing block saying the opposite, and F6 —
   * *nothing is pre-answered* — was red on `settled·chamber` on every run,
   * against a page with nothing wrong with it. A finding nobody can act on is
   * a finding everybody learns to scroll past, which costs the lens the one
   * thing it has.
   *
   * So the page's half of the set is made the way a founder makes it: the
   * rung is pressed on the card. Only the **commit** stays the module's, since
   * a founder's post-🍾 commit on a held setting is the ✒️ hold and this
   * instrument owns no pointer that holds. Pressed **before** the module's
   * set, because `rungOpt` omits whatever stands — once the module has moved,
   * the rung that would bring `S` into line is no longer drawn.
   */
  const chamberTo = await page.evaluate(() =>
    (((window.cs && window.cs.settingState('chamber').value) || {}).rung === 'link' ? 'closed' : 'link'));
  await page.evaluate(() => {
    const el = document.querySelector('#band [data-tab="chamber"], #band [data-card="chamber"]');
    if (el) el.click();
  });
  await wait(page, 350);
  const rungPressed = await page.evaluate((val) => {
    const b = document.querySelector('.setupcard [data-set="chamber"][data-val="' + val + '"]');
    if (!b) return false;
    b.click();
    return true;
  }, chamberTo);
  if (!rungPressed) errors.push(walk + ': 🌍 offered no ' + chamberTo + ' rung to press before the seed');
  await wait(page, 250);
  // closed again, because every card in the loop below is measured against its
  // own closed baseline
  await page.evaluate(() => {
    const mark = document.querySelector('.setupcard .chipcol .achip.wmark, .gcard .chipcol .achip.wmark') ||
      document.querySelector('.setupcard .chipcol .achip, .gcard .chipcol .achip');
    if (mark) mark.click();
  });
  await wait(page, 250);
  const seeded = await page.evaluate((chamberTo) => {
    try {
      const cs = window.cs;
      if (!cs || cs.constitutedAtT === null) return { error: 'no constituted session on the page' };
      let t = Date.now();
      const tick = () => (t += 1000);
      const voters = cs.motionElectorate();
      if (voters.length < 2) return { error: 'an electorate of ' + voters.length + ' cannot carry a motion' };
      const mover = voters.find((id) => id !== 'founder') || voters[0];
      const q = cs.settingState('quorum').value || { form: 'share', n: 33 };
      const m1 = cs.openMotion(tick(), mover,
        { kind: 'set', setting: 'quorum',
          value: { form: q.form, n: q.n + (q.form === 'count' ? 1 : 5) } },
        'The charter should not change until more of us have had our say.');
      for (const id of voters) if (id !== mover) cs.answerMotion(tick(), id, m1, 'accept');
      // the interval is the whole setting since Q1160 (grant and cap fixed
      // at 3), so the rejected ordinary motion proposes a faster drip
      const rate = cs.settingState('rate').value || { grant: 3, cap: 3, dripMinutes: 180 };
      const m2 = cs.openMotion(tick(), mover,
        { kind: 'set', setting: 'rate',
          value: { grant: rate.grant, cap: rate.cap,
            dripMinutes: Math.max(5, Math.round(rate.dripMinutes / 2)) } },
        'Half the wait would let people write while the thought is warm.');
      cs.adjudicateOrdinaryMotion(tick(), m2, 'held');
      // **Pass 4's census reaches three more states** (2026-08-31): a
      // constitutional motion **parked at the 👑** (👁️ is founder-held
      // post-⏩, so carrying goes to assent and the crown card is measurable
      // on the founder's walk), one **mid-flight** (👤, nobody answers, so
      // the consent picks are measurable on every seat), and a founder's
      // post-start **set** (🌍), so the set-news card reaches seat:1. A
      // state the instrument never opens reads as clean — the probe-coverage
      // lesson — so these are seeded, not sampled.
      // Both the set-news and the crown park ride 🌍 — the one setting ⏩
      // leaves in the founder's hand (a carried motion on a delegated
      // setting lands in the document; only a reserved one parks). The set
      // fires E5's news first; the motion then parks at the 👑.
      // the rung the page was already pressed on, above — the two halves of
      // one act, so the card's ladder and the module agree afterwards
      cs.setSetting(tick(), 'chamber', { rung: chamberTo },
        'Readers who are not members should see what we are building.');
      const cv2 = (cs.settingState('chamber').value || {}).rung;
      const m3 = cs.openMotion(tick(), mover,
        { kind: 'set', setting: 'chamber', value: { rung: cv2 === 'link' ? 'closed' : 'link' } },
        'Who reads the document should be the membership’s call.');
      for (const id of voters) if (id !== mover) cs.answerMotion(tick(), id, m3, 'accept');
      const av = (cs.settingState('authorship').value || {}).rung;
      // a second mover, because m3 is still live and a member has one 🏛️
      // out at a time (§9.6)
      const mover2 = voters.find((id) => id !== mover) || mover;
      const m4 = cs.openMotion(tick(), mover2,
        { kind: 'set', setting: 'authorship', value: { rung: av === 'anonymous' ? 'sealed' : 'anonymous' } },
        'Names put pressure on people; the writing should stand alone.');
      // **…and an ordinary motion in flight** (Q1331): ⏱️ again, by the first
      // mover — an ordinary motion costs a ✏️, not the one 🏛️ a member has
      // out — so the race card the room is served on a setting is measured on
      // every seat; the founder's too, since the motion card comes before the
      // composer. m2 on the same setting is settled, so this one is the live
      // one behind ⏱️'s tab.
      const rate2 = cs.settingState('rate').value || rate;
      const m5 = cs.openMotion(tick(), mover,
        { kind: 'set', setting: 'rate',
          value: { grant: rate2.grant, cap: rate2.cap, dripMinutes: rate2.dripMinutes * 2 } },
        'Fewer, better proposals — let the wait be longer.');
      return { carried: [m1, cs.motionRecords().get(m1).status],
        held: [m2, cs.motionRecords().get(m2).status],
        crowned: [m3, cs.motionRecords().get(m3).status],
        running: [m4, cs.motionRecords().get(m4).status],
        ordinary: [m5, cs.motionRecords().get(m5).status] };
    } catch (e) { return { error: String((e && e.message) || e) }; }
  }, chamberTo);
  if (seeded.error) errors.push(walk + ': the motion seed failed — ' + seeded.error);
  else {
    if (seeded.carried[1] !== 'carried') errors.push(walk + ': the seeded ' + seeded.carried[0] + ' is ' + seeded.carried[1] + ', not carried');
    if (seeded.held[1] !== 'held') errors.push(walk + ': the seeded ' + seeded.held[0] + ' is ' + seeded.held[1] + ', not held');
    if (seeded.crowned && seeded.crowned[1] !== 'awaiting-crown')
      errors.push(walk + ': the seeded ' + seeded.crowned[0] + ' is ' + seeded.crowned[1] + ', not awaiting-crown');
    if (seeded.running && seeded.running[1] !== 'running')
      errors.push(walk + ': the seeded ' + seeded.running[0] + ' is ' + seeded.running[1] + ', not running');
    if (seeded.ordinary && seeded.ordinary[1] !== 'running')
      errors.push(walk + ': the seeded ordinary ' + seeded.ordinary[0] + ' is ' + seeded.ordinary[1] + ', not running');
  }
  // a render, so the seeded records reach the piles before anything is
  // measured: the seat switch is one, and the seatless walk asks for one
  await page.evaluate((v) => {
    const sel = document.getElementById('devwho');
    if (v) sel.value = v;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, seat || null);
  await wait(page, 600);
  /**
   * The piles as they stand, for P8: every band paragraph holding more than
   * one chip, the front chip's key, its state, whether its mark is the drawn
   * ✔, and the whole order. Read closed here, and again as each card opens
   * (the open paragraph only — its pile is now the strip).
   */
  const readPiles = (opened) => page.evaluate((opened) => {
    const out = [];
    for (const para of document.querySelectorAll('#band [data-para]')) {
      const chips = [...para.querySelectorAll('.chipcol .achip')];
      if (chips.length < 2) continue;
      const front = chips[0];
      const mark = front.firstElementChild;
      out.push({ para: para.dataset.para, open: para.classList.contains('open'), opened,
        front: front.dataset.chip, state: (front.className.match(/st-([a-z]+)/) || [])[1] || null,
        // **The drawn ✔, not merely a drawn mark** (Q288, Ed 2026-09-14): since
        // every lifecycle mark is drawn, a class the whole alphabet shares
        // reports ⏳ on a vote of yours as the ✔ this rule forbids. Q288 told
        // them apart by stroke against fill; since Q1360 every mark is one of
        // the same set's pictures, so the question is put to the picture — and
        // `data-mk` is what names it, the band's settled mark being the
        // charter's own check.
        tick: !!(mark && mark.querySelector('[data-mk="check"]')),
        order: chips.map((c) => c.dataset.chip) });
    }
    return out;
  }, opened);
  const filePiles = async (opened) => {
    if (!piles) return;
    for (const p of await readPiles(opened)) if (opened === null || p.open) piles.push({ walk, ...p });
  };
  await filePiles(null);
  const keys = await page.evaluate(() => window.__CA.offered());
  const seen = new Set(keys);
  const strip = () => page.evaluate(() =>
    [...document.querySelectorAll('.setupcard .chipcol .achip[data-tab], .gcard .chipcol .achip[data-tab]')].map((el) => el.dataset.tab));
  for (const k of keys) {
    await openAndMeasure(page, k, '.setupcard', walk, cards, errors);
    await filePiles(k);
    /**
     * **A tab behind the front of a pile has no key on it.** `pileHtml` marks
     * every chip after the first `inert`, and `chipHtml`'s inert branch emits
     * no `data-tab` at all — so `offered()`, which reads `data-card`/`data-tab`,
     * cannot see the ✒️/🛡️ power tabs, and neither can anything that clicks by
     * key. They become addressable only once their own setting's card is open
     * and the strip draws every chip live. Harvested here, or no power card is
     * ever measured on any run and T9 has nothing to read.
     */
    for (const t of await strip()) {
      if (seen.has(t)) continue;
      seen.add(t);
      await openAndMeasure(page, t, '.setupcard', walk, cards, errors);
      await filePiles(t);
    }
    // a card is closed by its own mark — the **active** one, since clicking any
    // other chip in the strip morphs to that card rather than closing this one,
    // and the next card's "closed" baseline would then be an open tab
    await page.evaluate(() => {
      const mark = document.querySelector('.setupcard .chipcol .achip.wmark, .gcard .chipcol .achip.wmark') ||
        document.querySelector('.setupcard .chipcol .achip, .gcard .chipcol .achip');
      if (mark) mark.click();
    });
    await wait(page, 200);
  }
  // last, and only on the seatless walk: the seats are three audits sharing a
  // name and the promise is not a fact about who is looking, so measuring it
  // four times would only quadruple one number
  if (switches && !seat) await switchPass(page, walk, switches, errors);
}

/**
 * Walk 4 — the charter: every id in `SUGGS` (quick · insert · race · patch ·
 * deadlock ⚔️ · diagonal 🌶️ · editing · mine · sealed record), driven through
 * `SESSION.toggle(id, false)` so nothing scrolls and every rect is
 * viewport-stable — session-probe's own discipline.
 */
/**
 * **D1 — the floating 📝 stands in the row's ✏️'s box** (Q1335, Ed
 * 2026-09-11: *in the same place and size as the floating ✏️ appears in edit
 * mode*). Three boxes in viewport coordinates at scroll 0: the door before
 * entering, the row's ✏️ once edit mode is open (the door gone), the door
 * again once 📝 on the tab has left — equal within half a pixel, and the
 * glyph at B6's one size. Not a fact about a card, so it files with the
 * cross-card findings; the per-card lenses never see the row.
 */
async function walkDoor(page, doors, errors, walk) {
  // **No door on a phone** (MOBILE.md, Q1350): below 900px the composer is
  // not drawn, so there is no D1 to measure — the narrow run (`npm run
  // card-audit:narrow`, Q1351) is about the cards, and clicking a hidden
  // door would only time out and take the rest of the walk with it.
  if (VIEWPORT.width <= 900) return;
  const DOOR = '#editdoor [data-act="edit-door"]';
  const ROW = '#charter [data-proposalrow] [data-act="row-commit"]';
  const box = (sel) => page.evaluate((s) => {
    const els = document.querySelectorAll(s);
    const el = els[els.length - 1];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const R = (x) => Math.round(x * 100) / 100;
    return { r: [R(r.left), R(r.top), R(r.width), R(r.height)], fontSize: R(parseFloat(getComputedStyle(el).fontSize)), title: el.title, radius: getComputedStyle(el).borderRadius };
  }, sel);
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(page, 150);
  const before = await box(DOOR);
  if (!before) { errors.push(walk + ': no floating 📝 in read mode (Q1335)'); return; }
  // **D3 — the door hides while the resting tab is below it** (Q1380). On the
  // fixture the tab rests 30px under the navbar, always above a door at the
  // foot of a 1000px window, so the case is made by the window: 160px high,
  // the door's top is above the resting tab's bottom and the door must be
  // hidden; the window restored, it must be back. Its box is kept either way.
  await page.setViewportSize({ width: VIEWPORT.width, height: 160 });
  await wait(page, 250);
  const short = await page.evaluate(() => {
    const d = document.querySelector('#editdoor [data-act="edit-door"]');
    const c = document.querySelector('#ridetab .achip[data-tab="text"]');
    if (!d || !c) return null;
    return { chipBottom: c.getBoundingClientRect().bottom, doorTop: d.getBoundingClientRect().top, hidden: getComputedStyle(d).visibility === 'hidden' };
  });
  await page.setViewportSize({ width: VIEWPORT.width, height: VIEWPORT.height });
  await wait(page, 250);
  const restored = await box(DOOR);
  const restoredHidden = await page.evaluate(() => getComputedStyle(document.querySelector('#editdoor [data-act="edit-door"]')).visibility === 'hidden');
  // the window as a fixed box sees it — the visual viewport, never
  // `documentElement`'s client box, which is the whole document on this page
  const win = await page.evaluate(() => ({ w: visualViewport.width, h: visualViewport.height,
    s5: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s5')),
    edge: (() => {
      const sh = document.querySelector('.sheet-text');
      const el = sh && sh.offsetWidth ? sh : document.querySelector('.doc');
      return el ? el.getBoundingClientRect().right : null;
    })() }));
  await page.click(DOOR);
  await wait(page, 400);
  const commit = await box(ROW);
  // every button the proposal-row draws in edit mode (🗑️, ✏️, ✒️ beside it) —
  // D4's population: the door's place must meet none of them
  const rowBtns = await page.evaluate(() => [...document.querySelectorAll('[data-proposalrow] .btn, #patchrow .btn')].map((b) => {
    const r = b.getBoundingClientRect();
    return { act: b.dataset.act || b.className, r: [r.left, r.top, r.width, r.height] };
  }).filter((b) => b.r[2] > 0));
  const doorWhileEditing = await box(DOOR);
  const editing = await page.evaluate(() => document.getElementById('doc').classList.contains('editing'));
  await page.evaluate(() => document.querySelector('#ridetab .achip[data-tab="text"]').click());
  await wait(page, 400);
  const after = await box(DOOR);
  doors.push({ walk, before, commit, rowBtns, win, doorWhileEditing, editing, after, short, restored, restoredHidden });
}

/**
 * **The queue card stack, against the entry it is drawn on** (R1, Q1462).
 *
 * The pile is a hint and nothing else: pressing the entry opens the same
 * pair, and **the entry's own button keeps its size and its left edge**. Since
 * Ed's note of 2026-09-19 (*cards beneath them should be commensurately
 * further away so you can see the stack*) the pile **does** take room: the
 * `li` carries its depth as padding, which is what `layoutQueue` measures, so
 * the entry beneath stands that much lower. So the measurement is a
 * comparison: the same entries read twice, once as the fixture serves them
 * and once with `beneath` deleted and the rail re-rendered — a piled entry's
 * button must be the same size at the same left edge, and must stand within
 * the piles' own depth of where it stood bare — lower where a pile above took
 * room, or **higher** where the entry is held against the foot of the pinned
 * band and the only room for its pile is upward (the fixture's 🔥).
 * The second half is the count — `min(beneath, 5)` edges drawn, Ed's cap
 * (three on 2026-09-18, five on 2026-09-19).
 *
 * Edges are box-shadow layers, so they are counted off the computed style:
 * the pile's are the only layers with no blur, `--shadow-sm`'s two both
 * carrying one — and an edge is two of them, its face and its rule.
 */
async function walkRail(page, rails, walk) {
  const read = () => page.evaluate(() => {
    const R2 = (x) => Math.round(x * 100) / 100;
    // split a box-shadow list on its top-level commas — a layer's own colour
    // carries commas of its own inside parentheses
    const layers = (s) => {
      const out = []; let depth = 0, cur = '';
      for (const ch of s) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
      }
      if (cur.trim()) out.push(cur.trim());
      return out;
    };
    return [...document.querySelectorAll('#rail .qitem')].map((li) => {
      const b = li.querySelector('button');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      const anchor = li.dataset.site || '';
      return { q: li.dataset.q, anchor, pile: +(li.dataset.pile || 0),
        box: [R2(r.left), R2(r.top + window.scrollY), R2(r.width), R2(r.height)],
        // a layer reads `<colour> 0px <y>px 0px 0px`: no blur and no spread is the
        // pile's alone, and an edge is two of them — its face and its rule
        edges: layers(getComputedStyle(b).boxShadow).filter((l) => / 0px \d+px 0px 0px$/.test(l)).length / 2 };
    }).filter(Boolean);
  });
  const withPile = await read();
  // **the stranded entry is red** (R2, Q1484, Ed 2026-09-21: *Red entry,
  // words unchanged*). Its ground is a wash of the surface's one red and its
  // ↻ is painted the same; the channels are read back off `:root` rather than
  // written down here, so the audit cannot disagree with the palette about
  // what red is. Asked which entry is stranded rather than told: a check that
  // cannot find its subject has not run, and says so.
  const stranded = await page.evaluate(() => {
    const red = getComputedStyle(document.documentElement).getPropertyValue('--lc-wrong').trim();
    const mine = (window.SESSION.SUGGS || []).filter((s) => s.mine && s.stranded);
    const out = [];
    for (const s of mine) {
      const li = document.querySelector('#rail .qitem[data-q="' + String(s.id).replace(/["\\]/g, '\\$&') + '"]');
      const b = li && li.querySelector('button');
      const mk = li && li.querySelector('.qmark .mk, .mk');
      out.push({ id: s.id, there: !!b,
        wash: b ? getComputedStyle(b).getPropertyValue('--washcol').trim().replace(/\s+/g, ' ') : null,
        ink: mk ? getComputedStyle(mk).color : null, mk: mk ? mk.className : null });
    }
    return { red, rows: out };
  });
  // **a passed ✔ is green, a held ✖ grey** (R3, Q1517, Ed 2026-09-23). The
  // drawn fill of every unfiled decided mark on the page — rail, gutter,
  // contents rail, card heads — read against the palette's own tokens, each
  // resolved to rgb through a probe element rather than written down here.
  // The token is read **where the mark stands**: the desk gives the rails a
  // darker `--muted` for AA on grey (system.css, `--desk-muted`,
  // `--slip-muted`; Q1516 (6)), and a ✖ there is painted that local grey.
  const decided = await page.evaluate(() => {
    const probe = document.createElement('span');
    document.body.appendChild(probe);
    const TOKEN = { adopted: '--ok', retired: '--muted' };
    const resolve = (raw) => { probe.style.color = ''; probe.style.color = raw; return getComputedStyle(probe).color; };
    const want = { adopted: resolve('var(--ok)'), retired: resolve('var(--muted)') };
    const seen = {}, wanted = {};
    for (const kind of ['adopted', 'retired']) {
      seen[kind] = []; wanted[kind] = [];
      for (const mk of document.querySelectorAll('.mk-' + kind)) {
        const here = resolve(getComputedStyle(mk).getPropertyValue(TOKEN[kind]).trim());
        for (const p of mk.querySelectorAll('svg path')) { seen[kind].push(getComputedStyle(p).fill); wanted[kind].push(here); }
      }
    }
    probe.remove();
    return { want, seen, wanted };
  });
  const beneath = await page.evaluate(() =>
    Object.fromEntries(window.SESSION.SUGGS.filter((s) => s.beneath).map((s) => [s.id, s.beneath])));
  // the same rail with the field off, so the comparison is this page's own
  // geometry rather than a remembered number
  const saved = await page.evaluate(() => {
    const keep = window.SESSION.SUGGS.filter((s) => s.beneath).map((s) => [s.id, s.beneath]);
    for (const s of window.SESSION.SUGGS) delete s.beneath;
    window.SESSION.refreshRail();
    return keep;
  });
  await wait(page, 250);
  const without = await read();
  await page.evaluate((keep) => {
    const by = new Map(keep);
    for (const s of window.SESSION.SUGGS) if (by.has(s.id)) s.beneath = by.get(s.id);
    window.SESSION.refreshRail();
  }, saved);
  await wait(page, 250);
  rails.push({ walk, withPile, without, beneath, stranded, decided });
}
function railRules(rails) {
  const out = [];
  const file = (rule, said, saw, note) => out.push({ rule, lens: 'positioning', said, saw, note });
  // R3 — the unfiled ✔ in --ok, the unfiled ✖ in --muted (Q1517). A walk
  // with none of a kind says nothing; the run says so if no walk had any.
  const R3_SAID = { adopted: 'a passed ✔ is drawn in the palette’s `--ok` green (Q1517, Ed 2026-09-23)',
    retired: 'a held ✖ is drawn in the palette’s `--muted` grey (Q1517, Ed 2026-09-23)' };
  for (const kind of ['adopted', 'retired']) {
    let any = 0;
    for (const r of rails) {
      const d = r.decided;
      if (!d) continue;
      const fills = d.seen[kind] || [];
      const wants = (d.wanted && d.wanted[kind]) || fills.map(() => d.want[kind]);
      any += fills.length;
      const off = fills.map((f, i) => [f, wants[i]]).filter(([f, w]) => f !== w);
      if (off.length) {
        file('R3', R3_SAID[kind], off.length + ' of ' + fills.length + ' .mk-' + kind + ' path(s) fill '
          + [...new Set(off.map(([f, w]) => f + ' (wanted ' + w + ')'))].join(' / '), r.walk);
      }
    }
    if (!any) file('R3', R3_SAID[kind].replace(/ \(Q1517.*$/, '') + ' — measured at all (Q1517)',
      'no unfiled .mk-' + kind + ' mark on any walked page', rails.map((r) => r.walk).join(','));
  }
  for (const r of rails) {
    // R2 — the stranded entry's ground and its ↻, both the surface's one red
    const st = r.stranded || { red: '', rows: [] };
    const chans = String(st.red).split(',').map((x) => x.trim()).filter(Boolean);
    if (chans.length !== 3) {
      file('R2', 'the palette states a red in channel form, so a wash can be made of it (Q1484)',
        '`--lc-wrong` on :root reads ' + JSON.stringify(st.red), r.walk);
    } else if (!st.rows.length) {
      file('R2', 'the fixture carries a stranded proposal, so the red is measured at all (Q1484)',
        'no item on the charter is `mine && stranded`', r.walk);
    } else {
      const want = 'rgb(' + chans.join(', ') + ')';
      for (const e of st.rows) {
        if (!e.there) { file('R2', 'a stranded proposal of yours has a rail entry', e.id + ' has none', r.walk); continue; }
        if (!String(e.wash).startsWith('rgba(' + chans.join(', ') + ',')) {
          file('R2', 'a stranded entry’s ground is a wash of the surface’s one red (Q1484, Ed 2026-09-21: *Red entry, words unchanged*)',
            e.id + ' washes ' + e.wash + ', where --lc-wrong is ' + chans.join(', '), r.walk);
        }
        if (e.ink !== want) {
          file('R2', 'a stranded entry’s ↻ is painted that same red (Q1484)',
            e.id + '’s ' + e.mk + ' is ' + e.ink + ', wanted ' + want, r.walk);
        }
      }
    }
    const drawn = r.withPile.filter((e) => e.pile > 0);
    if (!Object.keys(r.beneath).length) {
      file('R1', 'the fixture carries queue card stacks, so the pile is measured at all (Q1462)',
        'no rail entry on the charter carried `beneath`', r.walk);
      continue;
    }
    // matched on both fields rather than on a joined key: an id and a site
    // are member-written strings, and a separator is a thing to get wrong
    const bareOf = (e) => r.without.find((x) => x.q === e.q && x.anchor === e.anchor);
    for (const e of drawn) {
      const want = Math.min(5, r.beneath[e.q] || 0);
      if (e.edges !== want) {
        file('R1', 'a queue card stack draws min(beneath, 5) edges and no more — depth hints, capped at five, no number (Q1462, Ed 2026-09-19)',
          e.q + ' says beneath ' + r.beneath[e.q] + ' and draws ' + e.edges + ' edge(s)', r.walk);
      }
      const was = bareOf(e);
      if (!was) { file('R1', 'an entry keeps its place when its pile is taken away', e.q + ' left the rail when `beneath` was deleted', r.walk); continue; }
      if (was.edges !== 0) file('R1', 'no pile is drawn where there is nothing beneath', e.q + ' still drew ' + was.edges + ' edge(s) with no `beneath`', r.walk);
      // left, width and height to the pixel; the top within every pile on the
      // rail put together (3px an edge), either way — down under a pile above
      // it, up where the band's foot holds it
      const room = 3 * drawn.reduce((n, x) => n + x.pile, 0);
      const same = [0, 2, 3].every((i) => Math.abs(e.box[i] - was.box[i]) <= 0.5);
      const drop = e.box[1] - was.box[1];
      if (!same || Math.abs(drop) > room + 0.5) {
        file('R1', 'a piled entry keeps its own button — the size it would be with no pile, at the same left edge — and moves by no more than the piles take (Q1462, Ed 2026-09-19)',
          e.q + ' is ' + e.box.join(',') + ' piled and ' + was.box.join(',') + ' bare', r.walk);
      }
    }
  }
  return out;
}

function doorRules(doors) {
  const out = [];
  const same = (a, b) => !!a && !!b && a.r.every((v, i) => Math.abs(v - b.r[i]) <= 0.5);
  for (const d of doors) {
    // **its own corner, about 1.5× the row's circles** (Q1516 (3), (4), Ed
    // 2026-09-23 — it had stood in the row's ✏️'s own box since Q1335): the
    // door's right and bottom edges `--s5` off the window's, its diameter 1.5×
    // the row's ✏️'s, and the same box before and after a round trip
    const said = 'the floating 📝 straddles the page\'s right edge (Ed, 2026-09-24), `--s5` off the window\'s foot, at 1.5× the proposal-row\'s circles, the same box before and after edit mode (Q1516 (3), (4))';
    if (!d.editing || !d.commit) {
      out.push({ rule: 'D1', lens: 'positioning', said, saw: 'pressing the door ' + (d.editing ? 'drew no row' : 'did not enter edit mode'), note: d.walk });
      continue;
    }
    if (d.doorWhileEditing) out.push({ rule: 'D1', lens: 'positioning', said, saw: 'the door is still drawn in edit mode, beside the row', note: d.walk });
    const offRight = d.win.w - (d.before.r[0] + d.before.r[2]), offBottom = d.win.h - (d.before.r[1] + d.before.r[3]);
    const wantRight = d.win.edge == null ? d.win.s5 : Math.max(d.win.s5, d.win.w - d.win.edge - d.before.r[2] / 2);
    if (Math.abs(offRight - wantRight) > 0.5 || Math.abs(offBottom - d.win.s5) > 0.5) out.push({ rule: 'D1', lens: 'positioning', said,
      saw: 'the door stands ' + Math.round(offRight * 100) / 100 + 'px off the window\'s right and ' + Math.round(offBottom * 100) / 100 + 'px off its foot, against ' + Math.round(wantRight * 100) / 100 + ' and ' + d.win.s5, note: d.walk });
    if (Math.abs(d.before.r[2] - 1.5 * d.commit.r[2]) > 1) out.push({ rule: 'D1', lens: 'positioning', said,
      saw: 'the door ' + d.before.r[2] + 'px across, the row\'s ✏️ ' + d.commit.r[2] + 'px (1.5× is ' + Math.round(1.5 * d.commit.r[2] * 100) / 100 + ')', note: d.walk });
    if (!same(d.before, d.after)) out.push({ rule: 'D1', lens: 'positioning', said,
      saw: 'the door at ' + d.before.r.join('×') + ' before, ' + (d.after ? d.after.r.join('×') : 'gone') + ' after leaving', note: d.walk });
    // **D4 — the door never shares the proposal row's place** (Q1516 (3): it
    // covered 🗑️ ✏️ and 🗑️ ❄️ ✓): its read-mode box meets no button the row
    // draws in edit mode
    const meets = (a, b) => a[0] < b[0] + b[2] - 0.5 && b[0] < a[0] + a[2] - 0.5 && a[1] < b[1] + b[3] - 0.5 && b[1] < a[1] + a[3] - 0.5;
    for (const b of d.rowBtns || []) {
      if (meets(d.before.r, b.r)) out.push({ rule: 'D4', lens: 'positioning', said: 'the floating 📝 never shares the proposal row\'s place: its box meets none of the row\'s buttons (Q1516 (3))',
        saw: 'the door at ' + d.before.r.join('×') + ' meets the row\'s ' + b.act + ' at ' + b.r.map((v) => Math.round(v * 100) / 100).join('×'), note: d.walk });
    }
    // **D2 — a floating control is a circle** (Q1380, Ed 2026-09-15): the door,
    // the row's ✏️ and 🗑️ are `--float-d` across (3rem since Ed's 2026-09-16
    // *larger, and stand out more*) and fully round, lifted by shadow; the
    // commit-row buttons inside cards stay 2.5rem rounded rectangles (B-rules).
    const circle = (b) => !!b && Math.abs(b.r[2] - b.r[3]) <= 0.5 && b.radius === '50%';
    if (!circle(d.before) || !circle(d.commit)) out.push({ rule: 'D2', lens: 'buttons', said: 'a floating control — the door, the row\'s ✏️ and 🗑️ — is a circle: width is height, border-radius 50% (Q1380)',
      saw: 'the door ' + d.before.r[2] + '×' + d.before.r[3] + ' r=' + d.before.radius + ', the row\'s ✏️ ' + (d.commit ? d.commit.r[2] + '×' + d.commit.r[3] + ' r=' + d.commit.radius : 'absent'), note: d.walk });
    // **D3 — the door hides while the resting 📝 tab is below it** (Q1380): hidden
    // exactly when the tab's bottom is under the door's top, shown otherwise,
    // the box unchanged.
    const shortSaid = 'the floating 📝 is hidden while the resting 📝 tab is below it, and back once the tab is above (Q1380)';
    if (!d.short) out.push({ rule: 'D3', lens: 'positioning', said: shortSaid, saw: 'no door or no riding tab to measure in a 160px window', note: d.walk });
    else if (d.short.hidden !== (d.short.chipBottom > d.short.doorTop)) out.push({ rule: 'D3', lens: 'positioning', said: shortSaid,
      saw: 'in a 160px window the tab\'s bottom is at ' + Math.round(d.short.chipBottom) + ' and the door\'s top at ' + Math.round(d.short.doorTop) + ', and the door is ' + (d.short.hidden ? 'hidden' : 'shown'), note: d.walk });
    if (d.restoredHidden || !same(d.before, d.restored)) out.push({ rule: 'D3', lens: 'positioning', said: shortSaid,
      saw: 'the window restored, the door is ' + (d.restoredHidden ? 'still hidden' : 'at ' + (d.restored ? d.restored.r.join('×') : 'gone') + ' against ' + d.before.r.join('×')), note: d.walk });
    if (!near(d.before.fontSize, 43.2, 0.3)) out.push({ rule: 'B6', lens: 'buttons', said: 'the floating 📝 glyph is twice B6\'s size, 2.7rem (43.2px) (Ed, 2026-09-24)',
      saw: 'the floating 📝 at ' + d.before.fontSize + 'px', note: d.walk });
  }
  return out;
}

/**
 * P11's pass (see `stripRules`): every card at a clause carrying a sealed
 * record opened in turn and its strip read, then every switch from it to a
 * tab of its strip where either side is a record. Driven by `toggle` to open
 * and by a click to switch, since the switch is the thing the promise is about.
 */
async function stripPass(page, walk, strips, errors) {
  const q = (k) => String(k).replace(/["\\]/g, '\\$&');
  const plan = await page.evaluate(() => {
    const S = window.SESSION;
    const keyOf = (g) => (S.clauseKeysOf(g.id) || [])[0];
    const recKeys = new Set(S.SUGGS.filter((g) => g.state === 'sealed').map(keyOf).filter(Boolean));
    return S.SUGGS.filter((g) => recKeys.has(keyOf(g)) && g.kind !== 'diagonal')
      .map((g) => ({ id: g.id, sealed: g.state === 'sealed' }));
  });
  const sealed = new Set(plan.filter((p) => p.sealed).map((p) => p.id));
  // the gutter first, every card closed: a clause whose one tab is a record's
  // door, and how many records stand there to be its edges
  await page.evaluate(() => {
    const open = window.SESSION.openId;
    if (open) { try { window.SESSION.toggle(open, false); } catch (e) { /* already closed */ } }
  });
  await wait(page, 200);
  const doorsSeen = await page.evaluate(() => {
    const S = window.SESSION;
    const keyOf = (g) => (S.clauseKeysOf(g.id) || [])[0];
    const recs = new Map();
    for (const g of S.SUGGS.filter((x) => x.state === 'sealed')) {
      const k = keyOf(g);
      if (k) recs.set(k, (recs.get(k) || 0) + 1);
    }
    const out = [];
    for (const [key, n] of recs) {
      const block = document.querySelector('#charter [data-key="' + key + '"]');
      const chips = block ? [...block.querySelectorAll(':scope > .chipcol > .achip')] : [];
      if (chips.length !== 1) continue;                  // a live pile, not a door
      const g = S.SUGGS.find((x) => x.id === chips[0].dataset.anchor);
      if (!g || g.state !== 'sealed') continue;
      const kindOf = (el) => { const m = el.querySelector('.mk'); const c = m && [...m.classList].find((x) => x.startsWith('mk-')); return c ? c.slice(3) : null; };
      out.push({ key, door: g.id, mark: kindOf(chips[0]), records: n, edges: +(chips[0].dataset.pile || 0) });
    }
    return out;
  });
  for (const d of doorsSeen) strips.push({ walk, kind: 'door', ...d });
  // the strip of the open card, as the anchors it holds, and the clause it heads
  const readStrip = (id) => page.evaluate((sel) => {
    const card = document.querySelector(sel);
    if (!card) return null;
    const head = card.querySelector('.clausehead .headclause');
    // the filed pile, if the strip has one: how many records, whether it is
    // open, and the edges its front tab wears (`data-pile`, none drawn as 0)
    const pile = card.querySelector('.clausehead .filedpile');
    const front = pile && pile.querySelector('.achip');
    return { key: head ? head.dataset.key || null : null,
      tabs: [...card.querySelectorAll('.clausehead .chipcol .achip[data-anchor]')].map((el) => el.dataset.anchor),
      // each tab's mark kind, so the gutter's door can be read against them
      kinds: Object.fromEntries([...card.querySelectorAll('.clausehead .chipcol .achip[data-anchor]')].map((el) => {
        const m = el.querySelector('.mk'); const c = m && [...m.classList].find((x) => x.startsWith('mk-'));
        return [el.dataset.anchor, c ? c.slice(3) : null];
      })),
      pile: pile ? { n: pile.querySelectorAll('.achip').length, open: pile.classList.contains('open'),
        edges: front ? +(front.dataset.pile || 0) : 0,
        anyEdges: pile.querySelectorAll('.achip[data-pile]').length } : null };
  }, '#charter .sugg[data-card="' + q(id) + '"]');
  const closeAll = () => page.evaluate(() => {
    const open = window.SESSION.openId;
    if (open) { try { window.SESSION.toggle(open, false); } catch (e) { /* already closed */ } }
  });
  const openOne = async (id) => {
    await closeAll();
    await wait(page, 120);
    await page.evaluate((k) => window.SESSION.toggle(k, false), id);
    await wait(page, 200);
  };
  for (const { id } of plan) {
    await openOne(id);
    const s = await readStrip(id);
    if (!s) { errors.push(walk + ': P11 — ' + id + ' opened no card at its clause'); continue; }
    strips.push({ walk, kind: 'open', id, key: s.key, tabs: s.tabs, kinds: s.kinds, pile: s.pile });
    // …and the same pile opened by a click, where it was closed: no edges then
    if (s.pile && !s.pile.open) {
      await page.evaluate((sel) => { const p = document.querySelector(sel); if (p) p.click(); },
        '#charter .sugg[data-card="' + q(id) + '"] .clausehead .filedpile[data-filed]');
      await wait(page, 200);
      const o = await readStrip(id);
      if (o && o.pile) strips.push({ walk, kind: 'pile', id, key: s.key, pile: o.pile });
    }
    for (const t of s.tabs) {
      if (t === id || (!sealed.has(id) && !sealed.has(t))) continue;
      await openOne(id);
      const card = '#charter .sugg[data-card="' + q(id) + '"]';
      // a tab inside a closed filed pile is inert: the pile opens first, and
      // the tab is measured once it stands where the click will find it
      await page.evaluate((a) => {
        const tab = document.querySelector(a[0] + ' .clausehead .achip[data-anchor="' + a[1] + '"]');
        const pile = tab && tab.closest('.filedpile[data-filed]:not(.open)');
        if (pile) pile.click();
      }, [card, q(t)]);
      await wait(page, 200);
      // centred, so the page has room to scroll either way: the promise is
      // kept by a scroll correction, and at scroll 0 none is possible (P7)
      await page.evaluate((a) => {
        const tab = document.querySelector(a[0] + ' .clausehead .achip[data-anchor="' + a[1] + '"]');
        if (tab) tab.scrollIntoView({ block: 'center' });
      }, [card, q(t)]);
      await wait(page, 150);
      const before = await page.evaluate((a) => {
        const tab = document.querySelector(a[0] + ' .clausehead .achip[data-anchor="' + a[1] + '"]');
        return tab ? window.__CA.seen(tab) : null;
      }, [card, q(t)]);
      const beforeTabs = (await readStrip(id) || { tabs: [] }).tabs;
      const clicked = await page.evaluate((a) => {
        const tab = document.querySelector(a[0] + ' .clausehead .achip[data-anchor="' + a[1] + '"]');
        if (!tab) return false;
        tab.click();
        return true;
      }, [card, q(t)]);
      if (!clicked) { errors.push(walk + ': P11 — with ' + id + ' open, no tab for ' + t + ' to click'); continue; }
      await wait(page, 320);
      const after = await readStrip(t);
      if (!after) { errors.push(walk + ': P11 — with ' + id + ' open, clicking ' + t + ' opened no card'); continue; }
      const glyph = await page.evaluate((sel) => {
        const tab = document.querySelector(sel);
        return tab ? window.__CA.seen(tab) : null;
      }, '#charter .sugg[data-card="' + q(t) + '"] .clausehead .achip[data-anchor="' + q(t) + '"]');
      strips.push({ walk, kind: 'switch', key: s.key, open: id, click: t, before: beforeTabs, after: after.tabs,
        mixed: sealed.has(id) !== sealed.has(t),
        travel: before && glyph ? [r2(glyph[0] - before[0]), r2(glyph[1] - before[1])] : null });
    }
  }
  await closeAll();
  await wait(page, 150);
}

async function walkCharter(page, base, cards, errors, { closed, doors, rails, strips } = {}) {
  await page.goto(withQuery(pageUrl(base, '?fixture=session' + (closed ? '&closed=1&band=1' : ''))));
  await page.waitForFunction(() => !!(window.SESSION && window.SESSION.SUGGS.length && document.querySelector('.qitem')),
    null, { timeout: 20_000 });
  await page.evaluate(() => { window.scrollTo(0, 0); window.SESSION.smoothScrollBy = (dy, done) => { window.scrollBy(0, dy); if (done) done(); }; });
  await wait(page, 300);
  const walk = closed ? 'closed' : 'charter';
  const ids = await page.evaluate(() => window.SESSION.SUGGS.map((s) => s.id));
  for (const id of ids) {
    const before = await page.evaluate((k) => window.__CA.closedGeo(k), id);
    // **T2 — one proposal, one tab per place** (Ed, 2026-09-16: *for my
    // whole-document rewrite I now see a blue proposal tab beside every
    // clause. It should only be shown once, against the first clause*).
    // `mine-guests-wording` runs over two blocks; closed, it carries one tab.
    if (id === 'mine-guests-wording') {
      const tabs = await page.evaluate(() => document.querySelectorAll('#charter .achip[data-anchor="mine-guests-wording"]').length);
      if (tabs !== 1) errors.push(walk + ': T2 — mine-guests-wording should carry one tab, at its first block; saw ' + tabs);
    }
    // **A way in, and then a card** — the two halves `openAndMeasure` has
    // always told apart and this walk never did (Q897). It drives `toggle()`
    // rather than a click, so it can open something the surface offers no
    // route to, and an unserved salience diagonal is exactly that: not in the
    // rail and not in the gutter either, by SPEC §8.3a. Where there *is* a way
    // in, opening it and getting no card is the defect that presents as
    // *nothing happens*, and it was the one shape this walk could not see.
    //
    // `data-q` is in the list because it is the charter rail's own key — the
    // band and the founding rail say `data-card`, a `.qitem` says `data-q`,
    // and leaving it out made this test answer *no way in* for the very bug it
    // was written for: a heading proposal has no gutter mark until the fix,
    // but it has had a rail entry all along.
    // The key goes into a **quoted attribute value**, not into a selector
    // identifier, so `CSS.escape` is the wrong escaper for it: it would turn a
    // digit-leading id into a `\3X ` numeric escape, which inside quotes means
    // some other character entirely and matches nothing. Quotes and backslashes
    // are the whole of what a CSS string has to be protected from.
    const wayIn = await page.evaluate((k) => {
      const q = String(k).replace(/["\\]/g, '\\$&');
      return !!document.querySelector(['data-card', 'data-tab', 'data-anchor', 'data-q']
        .map((a) => '[' + a + '="' + q + '"]').join(', '));
    }, id);
    if (!before.anyOpen) await zonesFor(page, walk, 'rest');
    // P13's page-top case: the walk's first card, by its own tab at scroll 0
    const p13 = [];
    if (!before.anyOpen) await pageTopPass(page, id, walk, p13, errors);
    const threw = await page.evaluate((k) => { try { window.SESSION.toggle(k, false); return null; } catch (e) { return String(e); } }, id);
    if (threw) { errors.push(walk + ': ' + id + ' threw on toggle — ' + threw); continue; }
    await wait(page, 200);
    const m = await page.evaluate((a) => window.__CA.measure(a[0], a[1], a[2]),
      ['.sugg[data-card="' + id + '"]', id, before]);
    if (m) { m.walk = walk; m.switchOpen = !!before.anyOpen; await zonesFor(page, walk, 'open', id); cards.push(m); }
    else if (wayIn) errors.push(walk + ': ' + id + ' opened nothing');
    // **T1 — a text is read in blocks** (Q1406, Ed 2026-09-16: *"The clause
    // as it stands" doesn't seem to render linebreaks (and perhaps other
    // formatting)*). `race-quorum` runs over two paragraphs and its candidate
    // a ends in a bullet: the head must hold two `.lp` blocks, each lane at
    // least two, the bullet dressed as one, and no block marker printed as
    // characters — the head and the lanes went through the one-line
    // renderer before, so a run read as one paragraph.
    if (m && id === 'race-quorum') {
      const t1 = await page.evaluate(() => {
        const c = document.querySelector('.sugg[data-card="race-quorum"]');
        if (!c) return null;
        const lanes = [...c.querySelectorAll('.propblock .rtext')].map((r) => r.querySelectorAll('.lp').length);
        return { head: c.querySelectorAll('.clausehead .rtext .lp').length, lanes,
          bullets: c.querySelectorAll('.propblock .rtext .lp.bullet').length,
          rawMarker: /(^|\n)(#{1,3}|-) /.test(c.textContent) };
      });
      const ok = !!t1 && t1.head === 2 && t1.lanes.length === 2 && t1.lanes.every((n) => n >= 2) && t1.bullets === 1 && !t1.rawMarker;
      if (!ok) errors.push(walk + ': T1 — race-quorum should read in blocks (head 2, lanes ≥2 each, one bullet, no raw marker): ' + JSON.stringify(t1));
    }
    // P13's close reading starts on the open card, on the glass
    const openGlass = m && !before.anyOpen ? await page.evaluate((k) => window.__CA.glassOpen(k), id) : null;
    await page.evaluate((k) => { try { window.SESSION.toggle(k, false); } catch (e) { /* already closed */ } }, id);
    await wait(page, 120);
    // still, the close half: the same closed reading, taken again
    if (m && m.grammar && !before.anyOpen) {
      const open = await page.evaluate(() => window.__CA.openCardEl());
      m.grammar.reclosed = open ? { error: 'the card did not close' } : await page.evaluate((k) => window.__CA.closedGeo(k), id);
      // **P13 on the charter** (BUILD.md §2): the close on the glass, then an
      // open by the card's own tab from a scroll that leaves its label room
      // above it — the general case — and closed again for the next card
      if (!open && openGlass) {
        p13.push({ sub: 'close', a: openGlass, b: await page.evaluate((k) => window.__CA.glassClosed(k), id) });
        const op = await glassPress(page, id, 'open');
        if (op.pressed) {
          await wait(page, 300);
          p13.push({ sub: 'open', a: op.a, b: await page.evaluate((k) => window.__CA.glassOpen(k), id) });
          await page.evaluate((k) => window.__CA.closeOpenCard(k), id);
          await wait(page, 120);
          if (await page.evaluate(() => window.__CA.openCardEl())) errors.push(walk + ': ' + id + ' did not close after P13\'s open');
          // where room runs out (answers Part 6.4), as `openAndMeasure`
          // reads it: once per walk and per kind built on the one shell
          else if (m.shellKind && !shortDone.has(walk + '·' + m.shellKind)) {
            shortDone.add(walk + '·' + m.shellKind);
            const sh = await page.evaluate((k) => {
              const C = window.__CA;
              C.placeFor(k, 10);
              const a = C.glassClosed(k);
              return { a, why: C.pressTab(k) };
            }, id);
            await wait(page, 300);
            if (sh.why) p13.push({ sub: 'page-top', unread: sh.why });
            else {
              p13.push({ sub: 'page-top', short: true, a: sh.a, b: await page.evaluate((k) => window.__CA.glassOpen(k), id) });
              await page.evaluate((k) => window.__CA.closeOpenCard(k), id);
              await wait(page, 120);
            }
          }
        } else p13.push({ sub: 'open', unread: op.why });
      }
    }
    if (m) m.p13 = p13;
  }
  // the floating 📝 (D1): the live session only — a closed document draws no door
  if (!closed && doors) await walkDoor(page, doors, errors, walk);
  // the rail's own pile (R1, Q1462)  the live charter only; a closed page
  // asks nothing of anybody, so nothing on it stands for a race still running
  if (!closed && rails) await walkRail(page, rails, walk);
  // the strips at every clause holding a record (P11, the green tab)
  if (!closed && strips) await stripPass(page, walk, strips, errors);
  if (closed) {
    // **The backlog's own records, checked rather than re-opened** (Q1339).
    // A backlog paragraph is keyed `U:<raceId>` **as a block of the document**
    // and its mark carries the *record's* id, `rec:<raceId>` — two different
    // names for two different things. This block read the marks and filtered
    // them for `U:`, which matches none of them, so it announced *no backlog
    // records on the page* on every run while the two the closed fixture
    // draws sat at the end of the payload: the loop above walks
    // `SESSION.SUGGS`, and a closed document's records are in it.
    //
    // So the guarantee is the one worth holding — every backlog record the
    // closed page draws has been measured — and it is asked of the page's own
    // structure rather than of a key shape: the paragraphs `U:` names, the
    // marks they carry, and the walk's own cards.
    const recs = await page.evaluate(() => [...new Set(
      [...document.querySelectorAll('#charter [data-key^="U:"] .achip[data-anchor]')]
        .map((el) => el.dataset.anchor).filter(Boolean))]);
    if (!recs.length) errors.push(walk + ': no backlog records on the closed page — nothing measured for the backlog');
    const measured = new Set(cards.filter((c) => c.walk === walk).map((c) => c.key));
    const missed = recs.filter((k) => !measured.has(k));
    if (missed.length) errors.push(walk + ': the backlog is drawn but unmeasured — ' + missed.join(', '));
  }
}

/* ============================================================================
   Go.
   ========================================================================== */
async function main() {
  const server = await serveDesign();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await ENGINES[BROWSER].launch();
  const version = browser.version();
  const context = await browser.newContext({
    viewport: VIEWPORT, deviceScaleFactor: 1, locale: 'en-GB', timezoneId: 'Europe/London',
  });
  await context.addInitScript(IN_PAGE);
  if (SPECIMENS) await context.addInitScript(() => { window.__CA_SPEC = true; });
  if (SPECIMENS && HEAVY) await context.addInitScript((h) => { window.__CA_HEAVY = h; }, HEAVY);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('page error: ' + String(e)));

  const cards = [];
  const switches = [];
  const piles = [];
  const doors = [];
  const rails = [];
  const strips = [];
  const t0 = Date.now();
  const run = async (name, fn) => {
    if (!WALKS.includes(name)) return;
    const n = cards.length;
    try { await fn(); } catch (e) { errors.push(name + ' walk threw: ' + (e && e.message)); }
    // a walk that measures nothing and says nothing is the worst outcome the
    // instrument has: it reads as coverage in the summary line
    if (cards.length === n) errors.push(name + ' walk measured no cards');
    if (!AS_JSON) console.log('  ' + name + ': ' + (cards.length - n) + ' cards');
  };

  // the engine names itself only when it is not the default, so a chromium run
  // prints and writes exactly what it always did
  if (!AS_JSON) console.log('card-audit @ ' + VIEWPORT.width + '×' + VIEWPORT.height +
    (BROWSER === 'chromium' ? '' : ' · ' + BROWSER + ' ' + version));
  await run('founding', () => walkFounding(page, base, cards, errors));
  await run('answers', () => walkAnswers(page, base, cards, errors));
  await run('delegated', () => walkDelegated(page, base, cards, errors));
  await run('settled', () => walkSettled(page, base, cards, errors, null, switches, piles));
  await run('outsiders', async () => {
    // one seat at a time, each with its own net: the three seats are three
    // separate audits sharing a name, and a seat that throws must not take
    // the seats after it with it
    // the applicant seat is EXEMPT here, not fixed (pass 4): `allApplicants`
    // reads `cs.isRemote`'s view, so the file page can never seat one —
    // the applicant's five and the adm: cards are walked end to end, on the
    // live path, by `npm run applicants-walk` at all three prices.
    for (const seat of ['1', 'stranger']) {
      const n = cards.length;
      try { await walkSettled(page, base, cards, errors, seat, null, piles); }
      catch (e) { errors.push('seat:' + seat + ' threw: ' + (e && e.message)); }
      if (cards.length === n) errors.push('seat:' + seat + ' offered no cards — nothing was measured for it');
    }
  });
  await run('stranger', () => walkSettled(page, base, cards, errors, 'stranger', null, piles));
  await run('charter', () => walkCharter(page, base, cards, errors, { doors, rails, strips }));
  await run('closed', () => walkCharter(page, base, cards, errors, { closed: true }));
  // phase one's inventory walks (Q1541 stage 0): the band's cards on the session and closed
  // fixtures, which the audit's charter walks never open (🥂 among them)
  await run('sessionband', () => walkBand(page, base, cards, errors, '?fixture=session&band=1', 'sessionband'));
  await run('closedband', () => walkBand(page, base, cards, errors, '?fixture=session&closed=1&band=1', 'closedband'));
  const tok = await page.evaluate(() => window.__CA.tokens());
  const ref = await page.evaluate(() => window.__CA.labelRef());
  await browser.close();
  server.close();
  return finish(cards, errors, tok, ref, version, switches, piles, doors, rails, strips, t0);
}

async function walkBand(page, base, cards, errors, query, walk) {
  await page.goto(withQuery(pageUrl(base, query)));
  await page.waitForFunction(() => !!(window.SESSION && document.querySelector('#rail .qitem')),
    null, { timeout: 20_000 });
  await page.evaluate(() => { window.scrollTo(0, 0); if (window.SESSION) window.SESSION.smoothScrollBy = (dy, done) => { window.scrollBy(0, dy); if (done) done(); }; });
  await wait(page, 400);
  // unfold whatever the band holds folded (the closed page folds Rules)
  for (let i = 0; i < 6; i++) {
    const n = await page.evaluate(() => {
      const t = [...document.querySelectorAll('#band .sectoggle')].find((b) =>
        b.getAttribute('aria-expanded') === 'false');
      if (!t) return 0;
      t.click(); return 1;
    });
    if (!n) break;
    await wait(page, 300);
  }
  // the band's tabs where it draws any, and every rail entry that is not a
  // charter item (🥂 on the closed page is one)
  const keys = await page.evaluate(() => {
    const charter = new Set(window.SESSION.SUGGS.map((s) => s.id));
    return [...new Set([...document.querySelectorAll('#band [data-tab], #band [data-card], #rail [data-card], #rail li[data-q]')]
      .map((el) => el.dataset.card || el.dataset.tab || el.dataset.q).filter((k) => k && !charter.has(k) && !/^rec:fx/.test(k)))];
  });
  // a rail entry keyed data-q is opened through its button, which openAndMeasure's
  // selector does not name; mark it so the click lands
  await page.evaluate(() => document.querySelectorAll('#rail li[data-q] > button[data-q]').forEach((b) => {
    if (!b.dataset.card) b.dataset.card = b.dataset.q;
  }));
  const seen = new Set(keys);
  const strip = () => page.evaluate(() =>
    [...document.querySelectorAll('.setupcard .chipcol .achip[data-tab], .gcard .chipcol .achip[data-tab]')].map((el) => el.dataset.tab));
  const closeOpen = () => page.evaluate(() => {
    const mark = document.querySelector('.setupcard .chipcol .achip.wmark, .gcard .chipcol .achip.wmark') ||
      document.querySelector('.setupcard .chipcol .achip, .gcard .chipcol .achip');
    if (mark) mark.click();
  });
  for (const k of keys) {
    await page.evaluate(() => document.querySelectorAll('#rail li[data-q] > button[data-q]').forEach((b) => {
      if (!b.dataset.card) b.dataset.card = b.dataset.q;
    }));
    await openAndMeasure(page, k, '.setupcard', walk, cards, errors);
    for (const t of await strip()) {
      if (seen.has(t)) continue;
      seen.add(t);
      await openAndMeasure(page, t, '.setupcard', walk, cards, errors);
    }
    await closeOpen();
    await wait(page, 200);
  }
}

async function finish(cards, errors, tok, ref, version, switches, piles, doors, rails, strips, t0) {
  for (const c of cards) c.findings = rulesFor(c, tok);
  const cross = [...crossCard(cards), ...switchRules(switches), ...pileRules(piles), ...doorRules(doors), ...railRules(rails), ...stripRules(strips)];
  /**
   * **The rollup is the finding; the card is where it shows.** A stylesheet
   * fact — `.headclause` padded 6px, an OK label at --t-cap — is one defect
   * appearing on twenty cards, and printing it twenty times buries the
   * twenty-first that is only on one. Deduped by what was said and what was
   * seen, carrying the cards it was seen on.
   */
  const roll = new Map();
  for (const c of cards) {
    for (const f of c.findings) {
      const k = f.rule + '|' + f.said + '|' + f.saw;
      if (!roll.has(k)) roll.set(k, { ...f, cards: [] });
      roll.get(k).cards.push(c.walk + '·' + c.key);
    }
  }
  const rollup = [...roll.values()].sort((a, b) => b.cards.length - a.cards.length || a.rule.localeCompare(b.rule));

  /**
   * **A geometry finding that moves with the window is a layout fact.** Two
   * of them did on the first outing — a charter card's auto side margins, and
   * the tab travel derived from them — and both read as defects at one size
   * and as different defects at the other. So the second size is not a manual
   * step somebody remembers to do: `--baseline` is another run's payload, and
   * a finding it did not also see is marked unstable and kept out of the
   * artifact rather than deleted, since *which* findings moved is itself worth
   * reading.
   */
  const keyOf = (f) => f.rule + '|' + f.saw;
  let baseline = null;
  if (BASELINE) {
    try { baseline = JSON.parse(await readFile(BASELINE, 'utf8')); }
    catch { errors.push('baseline unreadable: ' + BASELINE); }
  }
  if (baseline) {
    const seen = new Set([...(baseline.rollup || []), ...(baseline.cross || [])].map(keyOf));
    for (const f of [...rollup, ...cross]) f.stable = seen.has(keyOf(f));
  }
  /**
   * The specimens leave the payload before it is written: they are the page,
   * the numbers are what the instrument is for, and one file holding both
   * would be a hundred megabytes of markup with the findings buried in it.
   */
  const specs = [];
  // the page's inline CSS is the same string on every card of a surface, so it
  // is kept once and pointed at — 270 copies of it would be most of the file
  const sheets = [];
  for (const c of cards) {
    if (!c.spec) continue;
    const { css, ...rest } = c.spec;
    let sheet = sheets.indexOf(css);
    if (sheet < 0) { sheet = sheets.length; sheets.push(css); }
    specs.push({ walk: c.walk, key: c.key, glyph: c.tabGlyph, head: c.strings && c.strings.head, sheet, ...rest });
    delete c.spec;
  }
  if (SPECIMENS) {
    await writeFile(SPECIMENS, JSON.stringify({
      meta: { viewport: VIEWPORT, walks: WALKS, n: specs.length }, sheets, specs,
    }));
  }

  /* **The redesign's checks** (P13–P33 and raw-value), per card and per walk,
   * and the table over them. `findings` is the count **as ruled** (stated
   * exceptions out); `v2` is the count comparable with checks.md's *today*
   * column (the exceptions in, the ruling's new findings out), read for the
   * checks checks.md calls unchanged */
  const grammar = [];
  // a card's kind is the one its shell declares where it is built on the one
  // shell (Q1541 stage 1), else its key's family — and a walk-level finding
  // about that card (a switch, the width pass) takes the same kind
  const shellKinds = new Map(cards.filter((c) => c.shellKind).map((c) => [c.walk + '·' + c.key, c.shellKind]));
  const kindFor = (walk, key) => shellKinds.get(walk + '·' + key) || kindOf(key);
  for (const c of cards) {
    const fs = grammarRules(c, ref);
    for (const f of fs) f.kind = kindFor(c.walk, c.key);
    grammar.push(...fs);
  }
  grammar.push(...walkGrammar(zoneReads, tipReads, switches, restReads));
  grammar.push(...widthRules(cards, baseline));
  for (const f of grammar) {
    if (!f.kind) {
      const k = String(f.key).replace(/^(open|rest):/, '');
      f.kind = kindFor(f.walk, k);
    }
    f.check = CHECK[f.check] || f.check;
  }
  const shapes = {};
  for (const c of cards) for (const s of c.shapes || []) shapes[s] = (shapes[s] || 0) + 1;
  const table = CHECKS.map(([n, name]) => {
    const all = grammar.filter((f) => f.check === CHECK[name]);
    const fs = all.filter((f) => !f.excepted);
    const subs = {};
    for (const f of fs) if (f.sub) subs[f.sub] = (subs[f.sub] || 0) + 1;
    const v2 = all.filter((f) => f.ruled !== 'new');
    return { n, check: name, unchanged: UNCHANGED.has(name), findings: fs.length,
      cards: new Set(fs.map((f) => f.walk + '·' + f.key)).size,
      v2: v2.length, v2cards: new Set(v2.map((f) => f.walk + '·' + f.key)).size,
      excepted: all.length - fs.length, subs,
      examples: fs.filter((f, i) => fs.findIndex((x) => x.ex === f.ex) === i).slice(0, 2).map((f) => f.walk + '·' + f.key + ' — ' + f.ex) };
  });
  // what the tool could not read, said rather than silently counted as clean
  const unread = {
    noClosedParagraph: cards.filter((c) => c.grammar && c.grammar.closedBefore && !c.grammar.closedBefore.para && !c.switchOpen).map((c) => c.walk + '·' + c.key),
    noReclose: cards.filter((c) => c.grammar && !c.switchOpen && !c.grammar.reclosed).map((c) => c.walk + '·' + c.key),
    grammarErrors: cards.filter((c) => c.grammar && c.grammar.error).map((c) => c.walk + '·' + c.key + ': ' + c.grammar.error),
    zoneReads: zoneReads.map((z) => z.walk + ':' + z.when),
    // P13: the readings a pointer could not take (a tab behind a pile)
    p13: cards.flatMap((c) => (c.p13 || []).filter((e) => e.unread).map((e) => c.walk + '·' + c.key + ' ' + e.sub + ': ' + e.unread)),
    // P33: the cards with no data-fact role at all (every card, until stage 1)
    noFactRoles: cards.filter((c) => c.grammar && c.grammar.v2 && c.grammar.v2.facts && !Object.keys(c.grammar.v2.facts).length).length,
    // P30's drawer width and P18's standing-line hairline are not measured
    // yet; P19's presence half is read on the shell's cards since stage 1
    notMeasured: ['P19 presence on a card not yet built on the shell (no predicate to read)', 'P30 the contents drawer\'s width at 390 (no walk opens it)',
      'P18 the hairline under a rule card\'s standing first line (no standing first line until stage 3)'],
  };

  const payload = {
    meta: { viewport: VIEWPORT, walks: WALKS, cards: cards.length, seconds: Math.round((Date.now() - t0) / 100) / 10,
      grammarKinds: GRAMMAR_KINDS, kinds: KINDS, labelRef: ref,
      ...(BROWSER === 'chromium' ? {} : { browser: BROWSER, browserVersion: version }) },
    table, shapes, grammar, unread, zones: zoneReads, closedTips: tipReads, rest: restReads,
    tokens: tok, cards, switches, doors, rails, strips, rollup, cross, errors,
  };
  const printTable = () => {
    console.log('\nthe redesign checks (Q1541, design/redesign/checks.md) @ ' + VIEWPORT.width + '×' + VIEWPORT.height +
      ' (' + cards.length + ' cards; GRAMMAR_KINDS: ' + (GRAMMAR_KINDS.length ? GRAMMAR_KINDS.join(', ') : 'none') + ')');
    console.log('  ' + 'check'.padEnd(26) + 'as ruled'.padStart(9) + 'cards'.padStart(7) + 'v2'.padStart(7) + 'exc.'.padStart(6) + '   kinds');
    for (const r of table) {
      console.log('  ' + (r.n + ' ' + r.check + (r.unchanged ? ' *' : '')).padEnd(26) + String(r.findings).padStart(9) + String(r.cards).padStart(7) +
        String(r.v2).padStart(7) + String(r.excepted).padStart(6) + '   ' + Object.entries(r.subs).map(([k, v]) => k + ' ' + v).join(' · '));
      for (const e of r.examples) console.log('      e.g. ' + e);
    }
    console.log('  (* unchanged by the answers: its v2 count reads against checks.md\'s today column)');
    console.log('  row shapes: ' + Object.entries(shapes).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(' · '));
    console.log('  unread: ' + unread.noClosedParagraph.length + ' cards with no closed paragraph, ' + unread.noReclose.length +
      ' not re-closed, ' + unread.grammarErrors.length + ' reading errors, ' + unread.p13.length + ' P13 readings no pointer could take, ' +
      unread.noFactRoles + ' cards with no data-fact role; zones read on ' + unread.zoneReads.length);
  };

  /**
   * **The verdict, under `--strict` only.** Read off the same list the summary
   * prints — the `stable !== false` half, so a finding `--baseline` says moved
   * with the window is not held against the tree. Set as an exit **code**
   * rather than an exit: the payload is still written and the summary still
   * printed, because a red verdict with nothing to read it against is the one
   * shape of failure this instrument must not have.
   *
   * **With `--kinds`** (BUILD.md §2, the fast strict pass CI runs) the verdict
   * is the redesign checks' as-ruled findings on those kinds, and any walk
   * that threw, measured nothing or met a page error — never P1–P12's, which
   * stay the report they have always been. With `GRAMMAR_KINDS` empty, as in
   * stage 0, only a broken walk can redden it.
   */
  const verdict = () => {
    if (!STRICT) return;
    if (KINDS) {
      const want = new Set(KINDS);
      // **a check is held from the stage BUILD.md §2 names for it**, never
      // before (Q1541 stage 2): the closed page's three are strict from
      // stage 7 and report until then, so a kind the closed band also opens
      // — the grants, the gates, 🍾 — is not held to rules its stage cannot
      // yet meet there; `zone-overlap` waits for stage 8, `place-head` for 6
      const held = grammar.filter((f) => !f.excepted && want.has(f.kind) && (STRICT_FROM[String(f.check).replace(/^P\d+ /, '')] || 0) <= STAGE);
      const broken = errors.filter((e) => /walk threw|measured no cards|page error|offered no cards/.test(e));
      // **a held kind no card was measured as is a broken walk** (Q1541
      // stage 1): the kind is declared by the card's own shell, so a card
      // that slid back onto an old builder would drop out of the list rather
      // than fail it — over the canonical walk sets, every held kind must be
      // met at least once
      if (WALK_ARG === 'fixture' || WALK_ARG === 'all') {
        const met = new Set(cards.map((c) => c.shellKind || kindOf(c.key)));
        for (const k of KINDS) if (!met.has(k)) broken.push('the held kind ' + k + ' was measured on no card');
      }
      if (!AS_JSON) {
        console.log('\n--strict --kinds=' + (KINDS_ARG === 'GRAMMAR_KINDS' ? 'GRAMMAR_KINDS (' + (KINDS.join(', ') || 'none') + ')' : KINDS.join(',')) + ': ' +
          held.length + ' finding' + (held.length === 1 ? '' : 's') + (held.length ? ' — ' + [...new Set(held.map((f) => f.check))].join(', ') : '') +
          (broken.length ? '; ' + broken.length + ' broken walk' + (broken.length === 1 ? '' : 's') + ' — ' + broken.slice(0, 3).join(' | ') : ''));
        for (const f of held.slice(0, 20)) console.log('  ' + f.check + ' · ' + f.walk + '·' + f.key + ' — ' + f.ex);
      }
      process.exitCode = held.length || broken.length ? 1 : 0;
      return;
    }
    const left = [...rollup, ...cross].filter((f) => f.stable !== false);
    if (!AS_JSON) {
      console.log('\n--strict: ' + (left.length
        ? left.length + ' finding' + (left.length === 1 ? '' : 's') + ' nothing exempts — ' +
          [...new Set(left.map((f) => f.rule))].sort().join(', ')
        : 'nothing left in the list'));
    }
    process.exitCode = left.length ? 1 : 0;
  };

  if (AS_JSON) { console.log(JSON.stringify(payload, null, 1)); verdict(); return; }

  await writeFile(OUT, JSON.stringify(payload, null, 1));
  const per = new Map();
  for (const f of [...rollup, ...cross]) per.set(f.rule, (per.get(f.rule) || 0) + 1);
  console.log('\n' + cards.length + ' cards · ' + (rollup.length + cross.length) +
    ' distinct findings (' + (cards.reduce((n, c) => n + c.findings.length, 0) + cross.length) +
    ' sightings) · ' + payload.meta.seconds + 's');
  for (const [rule, n] of [...per].sort()) console.log('  ' + rule + ': ' + n);
  if (baseline) {
    const moved = [...rollup, ...cross].filter((f) => !f.stable);
    console.log('\nagainst ' + BASELINE + ' (' + baseline.meta.viewport.width + '×' + baseline.meta.viewport.height + '): ' +
      ([...rollup, ...cross].length - moved.length) + ' stable, ' + moved.length + ' moved with the window');
    for (const f of moved) console.log('  moved: ' + f.rule + ' — ' + f.saw);
  }
  for (const f of [...rollup, ...cross].filter((f) => f.stable !== false).slice(0, 40)) {
    console.log('\n  ' + f.rule + ' · ' + f.lens + ' · ' + (f.cards ? f.cards.length + ' cards' : 'cross-card'));
    console.log('    said: ' + f.said);
    console.log('    saw:  ' + f.saw + (f.note ? '  [' + f.note + ']' : ''));
    if (f.cards) console.log('    on:   ' + f.cards.slice(0, 8).join(', ') + (f.cards.length > 8 ? ' …' : ''));
  }
  if (errors.length) { console.log('\nerrors:'); for (const e of errors.slice(0, 20)) console.log('  ' + e); }
  printTable();
  console.log('\npayload → ' + OUT);
  if (SPECIMENS) console.log('specimens → ' + SPECIMENS + ' (' + specs.length + ')');
  verdict();
}

main().catch((e) => { console.error(e); process.exit(2); });
