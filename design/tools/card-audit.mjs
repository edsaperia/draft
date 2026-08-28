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
 */
import { createServer } from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const DESIGN = join(ROOT, 'design');

const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.split('=').slice(1).join('=') : dflt;
};
const AS_JSON = process.argv.includes('--json');
const VIEWPORT = { width: +arg('width', 1600), height: +arg('height', 1000) };
const OUT = arg('out', join(DESIGN, 'tools', 'card-audit.json'));
const BASELINE = arg('baseline', null);
const ALL_WALKS = ['founding', 'answers', 'delegated', 'settled', 'outsiders', 'charter', 'closed'];
const WALKS = arg('walk', ALL_WALKS.join(',')).split(',').filter(Boolean);
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
              small: rem('--t-small'), cap: rem('--t-cap'), micro: rem('--t-micro') },
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
    return Array.from(card.querySelectorAll('.lanepick, [role="radio"], .pick > button')).map((b) => {
      const dot = b.querySelector('.dot');
      const row = b.closest('.pick') || b;
      const rr = rect(row);
      const pr = prevRow ? rect(prevRow) : null;
      const gap = (pr && rr && flush(prevRow, row)) ? R2(rr[1] - (pr[1] + pr[3])) : null;
      prevRow = row;
      return { label: txt(b), x: (rect(dot) || rect(b))[0], dot: !!dot,
               on: b.getAttribute('aria-pressed') === 'true' || b.classList.contains('on'),
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
    eyebrow: txt(card.querySelector('.headlab')),
    head: txt(card.querySelector('.headrule, .headtitle, .clausehead .rtext')),
    lock: txt(card.querySelector('.lockline')),
    body: txt(card.querySelector('.field, .lanes')),
    options: Array.from(card.querySelectorAll('[data-set],[data-ans],[data-val],[data-mval],[data-motion]')).map((el) => ({
      set: el.dataset.set || el.dataset.ans || null,
      val: el.dataset.val || el.dataset.ansval || el.dataset.mval || el.dataset.motion || null,
      on: el.classList.contains('on') || el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-pressed') === 'true',
      label: txt(el),
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
        '.setnote, .rsub, .qwhy, .exp, .why, .lanepick, .commitrow button, .race-mid button').forEach(add);
      card.querySelectorAll('input[placeholder],[data-placeholder],[data-ph]').forEach((el) => {
        if (el.closest('.emojibox, .avpick, .freemoji')) return;
        const t = el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || el.getAttribute('data-ph');
        if (t) bits.push(t);
      });
      card.querySelectorAll('button[title],[role="button"][title]').forEach((el) => {
        if (el.title && !el.closest('.emojibox, .avpick, .freemoji')) bits.push(el.title);
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
        if (el.closest('.emojibox, .avpick, .freemoji')) return;
        const t = el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || el.getAttribute('data-ph');
        if (t) out.push(t);
      });
      card.querySelectorAll('[title]').forEach((el) => {
        if (el.title && !el.closest('.emojibox, .avpick, .freemoji')) out.push(el.title);
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
    const tab = document.querySelector('#band [data-tab="' + CSS.escape(key) + '"], ' +
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
    return { tab: rect(tab), glyph: glyphBox(tab), front, onRow,
             tabW: tab ? R2(tab.getBoundingClientRect().width) : null,
             text: rect(para && (para.querySelector('.cpv') || para)) };
  };

  /**
   * **What the card stands above.** A travel of `[0, 0]` says the *tab* did not
   * move; it does not say the *card* landed where the tab is, because a card
   * rendered somewhere else grows a tab strip of its own and the promise is
   * kept about the wrong object. The cheap witness is the next heading in
   * document order: the identity card drawn in your own row under *Members*
   * has *Invitees* below it, and one appended after the last subsection has
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

  window.__CA = {
    tokens, rect, txt,
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
    /** the open card, measured. `sel` picks the surface's card element. */
    measure: (sel, key, before) => {
      const card = document.querySelector(sel);
      if (!card) return null;
      const openTab = card.querySelector('.achip[data-tab="' + CSS.escape(key) + '"], ' +
        '.achip[data-anchor="' + CSS.escape(key) + '"], [data-tab="' + CSS.escape(key) + '"]');
      const openText = card.querySelector('.clausehead .rtext, .headrule, .headtitle');
      const s = getComputedStyle(card);
      const travel = (a, b) => (a && b ? [Math.round((b[0] - a[0]) * 100) / 100, Math.round((b[1] - a[1]) * 100) / 100] : null);
      return {
        key,
        strings: strings(card),
        buttons: buttons(card),
        radios: radios(card),
        helpers: helpers(card),
        boxes: boxes(card),
        card: { r: rect(card), shadow: s.boxShadow === 'none' ? 'none' : s.boxShadow,
                border: px(s.borderTopWidth), radius: px(s.borderTopLeftRadius) },
        // the card's identity is the glyph on its own tab, not the first
        // glyph in its head — a grant card's head is the Founded line, which
        // wears 👑 for a different reason entirely
        tabGlyph: openTab ? (txt(openTab) || '').replace(/\s/g, '').slice(0, 3) : null,
        tab: { closed: before && before.tab, open: rect(openTab), front: !!(before && before.front),
               onRow: !!(before && before.onRow),
               closedW: before && before.tabW, openW: openTab ? Math.round(openTab.getBoundingClientRect().width * 100) / 100 : null,
               boxTravel: travel(before && before.tab, rect(openTab)),
               rightEdge: openTab && card ? R2(openTab.getBoundingClientRect().right - card.getBoundingClientRect().left) : null,
               travel: travel(before && before.glyph, glyphBox(openTab)) },
        clause: { closed: before && before.text, open: rect(openText),
                  travel: travel(before && before.text, rect(openText)) },
        nextHead: nextHeadAfter(card),
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
const ID_NEXT_HEAD = 'Invitees';

/** the glyph alphabet STYLE §1 calls stable, plus the lifecycle family */
const STABLE_GLYPHS = ['🪶', '📍', '🪪', '🤝', '💤', '🥾', '⏱️', '🤖', '⏰', '👥', '🌡️', '🪜',
  '👤', '✍️', '👁️', '🌍', '📄', '🎩', '💡', '⚖️', '👑', '📯', '✒️', '🛡️', '✏️', '🏛️', '🍾',
  '🥂', '📧', '✋', '🖼️', '📝', '✉️', '❌', '❄️', '🔥', '⚔️', '🌶️', '⏳', '↻', '⏸', '🗑️', '📨',
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
  }
  const heights = [...new Set(card.buttons.filter((b) => b.r).map((b) => b.h))];
  if (heights.length > 1) at('B1', 'buttons', 'one row, one height', heights.length + ' heights sharing one row: ' + heights.join(', ') + 'px');

  /* --- positioning ------------------------------------------------------ */
  const xs = [...new Set(card.radios.filter((r) => r.dot).map((r) => r.x))];
  if (xs.length > 1 && Math.max(...xs) - Math.min(...xs) > 0.51) {
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
    if (!near(grew, 8, 0.51) || (left !== null && !near(left, -8, 0.51))) {
      at('P3', 'positioning', 'the active tab grows exactly 8px, and grows it to the left',
        'it grows ' + grew + 'px and its left edge moves ' + left + 'px');
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
    box.m.forEach((v, i) => { if (!onGrid(v)) bad.push('margin-' + 'trbl'[i] + ' ' + v + 'px'); });
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
  // the surface says **vote**). **Not** `bradley`: 🌡️'s one linking sentence
  // (entry 163) is designed to name the method, and a guard that goes red on
  // the one sanctioned sentence teaches everyone to ignore the guard.
  for (const word of ['ordinary', 'roster', 'participant', 'ceremony', 'token', 'the bar', 'economy', 'queue-card', 'convenor', 'admin',
    'judgment', 'judge', 'judged', 'judging', 'comparison', 'confidence']) {
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
const excerpt = (s, needle) => {
  const i = s.toLowerCase().indexOf(String(needle).toLowerCase());
  return i < 0 ? null : s.slice(Math.max(0, i - 50), i + 60);
};

/* ============================================================================
   The cross-card lenses. These are the findings the per-pass audits
   structurally cannot see, and they only exist once every card is in one
   table — so they run last, over the whole payload at once.
   ========================================================================== */
function crossCard(cards) {
  const out = [];

  // T5 — one label per rung, everywhere. The founder's radio, the member's
  // ladder and the composer's lane must say the same words for one value.
  const byRung = new Map();
  for (const c of cards) {
    for (const o of c.strings.options) {
      if (!o.set || !o.val || !o.label) continue;
      const k = o.set + '=' + o.val;
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
    const key = c.key.replace(/^(ans|str)[-:]?/, '');
    if (!glyphOf.has(g)) glyphOf.set(g, new Set());
    glyphOf.get(g).add(key);
  }
  for (const [g, keys] of glyphOf) {
    if (keys.size > 1) {
      out.push({ rule: 'G2', lens: 'cross-card', said: 'a subject glyph names one thing (STYLE §1)',
        saw: g + ' heads ' + keys.size + ' different cards', note: [...keys].join(', ') });
    }
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

async function openAndMeasure(page, key, cardSel, walk, cards, errors) {
  const before = await page.evaluate((k) => window.__CA.closedGeo(k), key);
  const opened = await page.evaluate((k) => {
    const sel = '[data-card="' + CSS.escape(k) + '"], [data-tab="' + CSS.escape(k) + '"]';
    const el = document.querySelector('#rail ' + sel) || document.querySelector('#band ' + sel) ||
      document.querySelector('#charter ' + sel) || document.querySelector(sel);
    if (!el) return false;
    el.click();
    return true;
  }, key);
  if (!opened) { errors.push(walk + ': no way in to ' + key); return null; }
  await wait(page, 300);
  const m = await page.evaluate((a) => window.__CA.measure(a[0], a[1], a[2]), [cardSel, key, before]);
  if (!m) { errors.push(walk + ': ' + key + ' opened nothing'); return null; }
  m.walk = walk;
  cards.push(m);
  return m;
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
  await page.goto(base + '/session-view.html');
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
  // 🧭 (entry 166): measured unanswered, then answered *custom*, so the rest
  // of the walk is today's founding and the card's strings reach the golden
  await openAndMeasure(page, 'shape', '.setupcard', walk, cards, errors);
  await clickIn('.setupcard [data-set="docShape"][data-val="custom"]'); await wait(page, 200);
  await clickIn('.setupcard [data-confirm]'); await wait(page, 320);
  await openAndMeasure(page, 'myemail', '.setupcard', walk, cards, errors);
  await typeIn('.setupcard input[type="email"]', 'ada@example.org');
  await clickIn('.setupcard [data-confirm]'); await wait(page, 400);
  await clickIn('[data-act="clickmail"]'); await wait(page, 700);

  // then whatever the rail asks for, one at a time, exactly as the founder
  // meets it — the order IS the dependency list
  const seen = new Set(['title', 'slug', 'shape', 'myemail']);
  for (let i = 0; i < 40; i++) {
    const next = await page.evaluate((done) => {
      const li = [...document.querySelectorAll('#rail li')].map((el) => el.dataset.q ||
        (el.querySelector('[data-card]') || { dataset: {} }).dataset.card).filter(Boolean);
      return li.find((k) => !done.includes(k)) || null;
    }, [...seen]);
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
      if (d) { d.walk = walk; cards[cards.length - 1] = d; }
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
        if (inp.value || /^(email|radio|checkbox|file|hidden|range|color)$/.test(inp.type)) return;
        if (inp.type === 'number') inp.value = String(Math.max(+inp.min || 1, 5));
        else if (inp.type === 'datetime-local') inp.value = '2026-09-18T18:00';
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
async function walkSettled(page, base, cards, errors, seat) {
  await page.goto(base + '/session-view.html');
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
   * The pair is chosen by what the module will actually do. 🌡️ `bar` is
   * delegated by ⏩'s own `FILL`, so a carried constitutional motion on it
   * lands in the document rather than parking at the 👑; and a **constitutional
   * motion never settles as rejected** — a `keep` answer simply leaves it
   * running until the close — so the rejected half has to be an *ordinary*
   * one, adjudicated `held` through the dev seam, which is ⏱️ `rate`.
   *
   * Seeded **before the seat switch**, so the `seat:` walks measure the record
   * from a member's chair too, where the mover is the sealed string.
   */
  const seeded = await page.evaluate(() => {
    try {
      const cs = window.cs;
      if (!cs || cs.constitutedAtT === null) return { error: 'no constituted session on the page' };
      let t = Date.now();
      const tick = () => (t += 1000);
      const voters = cs.motionElectorate();
      if (voters.length < 2) return { error: 'an electorate of ' + voters.length + ' cannot carry a motion' };
      const mover = voters.find((id) => id !== 'founder') || voters[0];
      const bar = cs.settingState('bar').value || { pct: 78 };
      const m1 = cs.openMotion(tick(), mover,
        { kind: 'set', setting: 'bar', value: { pct: Math.min(95, bar.pct + 4) } },
        'The charter should not change on a bare majority of the evidence.');
      for (const id of voters) if (id !== mover) cs.answerMotion(tick(), id, m1, 'accept');
      const rate = cs.settingState('rate').value || { grant: 4, cap: 8, dripMinutes: 180 };
      const m2 = cs.openMotion(tick(), mover,
        { kind: 'set', setting: 'rate',
          value: { grant: rate.grant + 2, cap: rate.cap, dripMinutes: rate.dripMinutes } },
        'Two more to start would let people write before they have to choose.');
      cs.adjudicateOrdinaryMotion(tick(), m2, 'held');
      return { carried: [m1, cs.motionRecords().get(m1).status],
        held: [m2, cs.motionRecords().get(m2).status] };
    } catch (e) { return { error: String((e && e.message) || e) }; }
  });
  if (seeded.error) errors.push(walk + ': the motion seed failed — ' + seeded.error);
  else {
    if (seeded.carried[1] !== 'carried') errors.push(walk + ': the seeded ' + seeded.carried[0] + ' is ' + seeded.carried[1] + ', not carried');
    if (seeded.held[1] !== 'held') errors.push(walk + ': the seeded ' + seeded.held[0] + ' is ' + seeded.held[1] + ', not held');
  }
  // a render, so the seeded records reach the piles before anything is
  // measured: the seat switch is one, and the seatless walk asks for one
  await page.evaluate((v) => {
    const sel = document.getElementById('devwho');
    if (v) sel.value = v;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, seat || null);
  await wait(page, 600);
  const keys = await page.evaluate(() => window.__CA.offered());
  const seen = new Set(keys);
  const strip = () => page.evaluate(() =>
    [...document.querySelectorAll('.setupcard .chipcol .achip[data-tab]')].map((el) => el.dataset.tab));
  for (const k of keys) {
    await openAndMeasure(page, k, '.setupcard', walk, cards, errors);
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
    }
    // a card is closed by its own mark — the **active** one, since clicking any
    // other chip in the strip morphs to that card rather than closing this one,
    // and the next card's "closed" baseline would then be an open tab
    await page.evaluate(() => {
      const mark = document.querySelector('.setupcard .chipcol .achip.wmark') ||
        document.querySelector('.setupcard .chipcol .achip');
      if (mark) mark.click();
    });
    await wait(page, 200);
  }
}

/**
 * Walk 4 — the charter: every id in `SUGGS` (quick · insert · race · patch ·
 * deadlock ⚔️ · diagonal 🌶️ · editing · mine · sealed record), driven through
 * `SESSION.toggle(id, false)` so nothing scrolls and every rect is
 * viewport-stable — session-probe's own discipline.
 */
async function walkCharter(page, base, cards, errors, { closed } = {}) {
  await page.goto(base + '/session-view.html?fixture=session' + (closed ? '&closed=1&band=1' : ''));
  await page.waitForFunction(() => !!(window.SESSION && window.SESSION.SUGGS.length && document.querySelector('.qitem')),
    null, { timeout: 20_000 });
  await page.evaluate(() => { window.scrollTo(0, 0); window.SESSION.smoothScrollBy = (dy, done) => { window.scrollBy(0, dy); if (done) done(); }; });
  await wait(page, 300);
  const walk = closed ? 'closed' : 'charter';
  const ids = await page.evaluate(() => window.SESSION.SUGGS.map((s) => s.id));
  for (const id of ids) {
    const before = await page.evaluate((k) => window.__CA.closedGeo(k), id);
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
    const threw = await page.evaluate((k) => { try { window.SESSION.toggle(k, false); return null; } catch (e) { return String(e); } }, id);
    if (threw) { errors.push(walk + ': ' + id + ' threw on toggle — ' + threw); continue; }
    await wait(page, 200);
    const m = await page.evaluate((a) => window.__CA.measure(a[0], a[1], a[2]),
      ['.sugg[data-card="' + id + '"]', id, before]);
    if (m) { m.walk = walk; cards.push(m); }
    else if (wayIn) errors.push(walk + ': ' + id + ' opened nothing');
    await page.evaluate((k) => { try { window.SESSION.toggle(k, false); } catch (e) { /* already closed */ } }, id);
    await wait(page, 120);
  }
  if (closed) {
    // the closed page's own furniture: the backlog's ⏸ records and the
    // signatures, which exist nowhere else
    // `offered()` reads `data-card`/`data-tab`; a backlog paragraph's mark is
    // an `.achip[data-anchor]`, so it has to be asked for by name or this
    // block silently matches nothing and the closed page's own furniture
    // never gets measured at all.
    const keys = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-card],[data-tab],[data-anchor]')]
      .map((el) => el.dataset.card || el.dataset.tab || el.dataset.anchor)
      .filter((k) => k && /^U:/.test(k)))]);
    if (!keys.length) errors.push(walk + ': no backlog (U:) records on the page — nothing measured for the backlog');
    for (const k of keys.slice(0, 4)) await openAndMeasure(page, k, '.sugg, .setupcard', walk, cards, errors);
  }
}

/* ============================================================================
   Go.
   ========================================================================== */
async function main() {
  const server = await serveDesign();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT, deviceScaleFactor: 1, locale: 'en-GB', timezoneId: 'Europe/London',
  });
  await context.addInitScript(IN_PAGE);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('page error: ' + String(e)));

  const cards = [];
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

  if (!AS_JSON) console.log('card-audit @ ' + VIEWPORT.width + '×' + VIEWPORT.height);
  await run('founding', () => walkFounding(page, base, cards, errors));
  await run('answers', () => walkAnswers(page, base, cards, errors));
  await run('delegated', () => walkDelegated(page, base, cards, errors));
  await run('settled', () => walkSettled(page, base, cards, errors));
  await run('outsiders', async () => {
    // one seat at a time, each with its own net: the three seats are three
    // separate audits sharing a name, and a seat that throws must not take
    // the seats after it with it
    for (const seat of ['1', 'applicant', 'stranger']) {
      const n = cards.length;
      try { await walkSettled(page, base, cards, errors, seat); }
      catch (e) { errors.push('seat:' + seat + ' threw: ' + (e && e.message)); }
      if (cards.length === n) errors.push('seat:' + seat + ' offered no cards — nothing was measured for it');
    }
  });
  await run('charter', () => walkCharter(page, base, cards, errors));
  await run('closed', () => walkCharter(page, base, cards, errors, { closed: true }));

  const tok = await page.evaluate(() => window.__CA.tokens());
  await browser.close();
  server.close();

  for (const c of cards) c.findings = rulesFor(c, tok);
  const cross = crossCard(cards);
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
  const payload = {
    meta: { viewport: VIEWPORT, walks: WALKS, cards: cards.length, seconds: Math.round((Date.now() - t0) / 100) / 10 },
    tokens: tok, cards, rollup, cross, errors,
  };

  if (AS_JSON) { console.log(JSON.stringify(payload, null, 1)); return; }

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
  console.log('\npayload → ' + OUT);
}

main().catch((e) => { console.error(e); process.exit(2); });
