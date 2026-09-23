/**
 * a11y-audit.mjs — the surface read by the rules a screen reader and a
 * keyboard go by, at every epoch at once.
 *
 * PRODUCTION.md stage 13 has stood at *not started — no audit has run;
 * nothing in the tree names one* since the stage table was written. This is
 * the measurement that sentence is waiting for. It is **a review, not a
 * guard**: it opens cards, reads the DOM and writes JSON, and it changes
 * nothing — the same contract `card-audit` keeps, and for the same reason
 * (a surface change would move the frozen references, which is Ed's call).
 *
 *   node design/tools/a11y-audit.mjs                  # the summary, + the payload
 *   node design/tools/a11y-audit.mjs --json           # the payload on stdout
 *   node design/tools/a11y-audit.mjs --scene=session  # one scene
 *   node design/tools/a11y-audit.mjs --width=390 --height=844 --out=narrow.json
 *   node design/tools/a11y-audit.mjs --cards=0        # scenes only, no card sweep
 *
 * **Two instruments, divided by what each can see.** `axe-core` owns the
 * standard WCAG sweep — contrast, roles, labels, the rules everybody's
 * checker knows — and is used when it is installed, skipped with a line when
 * it is not, so this file is useful with no dependency at all. Everything
 * under `PROBES` is the half axe cannot see, because it is a fact about *this*
 * surface: a commit that is reached only by holding a pointer down, a
 * radiogroup whose options are all called the same thing by design (CP1), a
 * glyph that is the whole of a control's name, a card that replaces its own
 * paragraph and leaves the focus where the paragraph was.
 *
 * **It borrows its driving from the probes rather than inventing any.** The
 * design server, the viewport discipline and the motion stubs are
 * `card-audit`'s and `session-probe`'s; cards are opened with
 * `SESSION.toggle(id, false)`, which is how every other instrument here opens
 * one. The automation tab is backgrounded, so only end-states are measured.
 *
 * **What a finding here is.** A row names the rule, what the rule asks, what
 * the page does, and where — the element's own selector path, so it resolves
 * to a file by grep. It is a candidate until somebody reads it: several of
 * these are deliberate design properties with rulings behind them, and this
 * instrument does not know which. Sorting them is the stage's job, not the
 * script's.
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
const VIEWPORT = { width: +arg('width', 1600), height: +arg('height', 1000) };
const OUT = arg('out', join(DESIGN, 'tools', 'a11y-audit.json'));
const WITH_CARDS = arg('cards', '1') !== '0';
/** an explicit axe-core build, for a tree that does not carry the package */
const AXE_PATH = arg('axe', null);
/**
 * **Which engine reads the surface** (2026-09-17): `--browser=` or
 * `DRAFT_BROWSER`, chromium by default. axe-core's own rule set is the same
 * everywhere, but what the DOM *is* — a focusable, a computed name, a contrast
 * pair — is the engine's, so a finding on one engine and not another is a
 * cross-browser fact rather than an axe disagreement.
 */
const ENGINES = { chromium, webkit, firefox };
const BROWSER = arg('browser', process.env.DRAFT_BROWSER || 'chromium');
if (!ENGINES[BROWSER]) {
  console.error('no such browser: ' + BROWSER + ' — engines are ' + Object.keys(ENGINES).join(', '));
  process.exit(2);
}
/**
 * Which position of SURFACE §7.2's commit-gesture switch to read. The shipped
 * position is **click**, and at click A14 has nothing to find — which is how
 * the first run of this audit reported an empty hold row and meant only *not
 * asked*. `?gesture=hold` is the page's own by-eye comparison (`COMMIT_GESTURE`
 * in session.js), and it is where a keyboard has no equivalent gesture at all,
 * so the audit can reach the question rather than record a silence.
 */
const GESTURE = arg('gesture', 'click');
if (!['click', 'hold'].includes(GESTURE)) {
  console.error('no such gesture: ' + GESTURE + ' — the switch is click or hold (SURFACE §7.2)');
  process.exit(2);
}
const withGesture = (url) =>
  GESTURE === 'hold' ? url + (url.includes('?') ? '&' : '?') + 'gesture=hold' : url;

/**
 * The epochs. Each is a URL the fixture already serves — the birth is the
 * page with no query, the session and the closed page are `fixture-session.js`
 * (CLAUDE.md, `remoteCS`) — so nothing here stages a state of its own and a
 * scene cannot drift from what the page actually does.
 */
const SCENES = [
  { name: 'birth', url: '/session-view.html', what: 'a founder at a blank arrival' },
  { name: 'session', url: '/session-view.html?fixture=session', what: 'the Hollow Oak session, live' },
  { name: 'band', url: '/session-view.html?fixture=session&band=1', what: 'the session with the constitution band' },
  { name: 'closed', url: '/session-view.html?fixture=session&closed=1', what: 'the closed page, every clause filed' },
];
const WANT = arg('scene', SCENES.map((s) => s.name).join(',')).split(',').filter(Boolean);
const UNKNOWN = WANT.filter((w) => !SCENES.some((s) => s.name === w));
if (!WANT.length || UNKNOWN.length) {
  console.error('no such scene: ' + (UNKNOWN.join(', ') || '(none given)') +
    ' — scenes are ' + SCENES.map((s) => s.name).join(', '));
  process.exit(2);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

/** design/ over a free port, no traversal — probe.mjs's server, verbatim. */
function serveDesign() {
  const server = createServer(async (req, res) => {
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

/**
 * The motion stubs, `session-probe`'s: reduced motion reported true so a
 * collapse completes synchronously, and the smooth scroll made an instant
 * jump. Installed before the page's own scripts, as an init script.
 */
const STUB_MOTION = () => {
  const mmReal = window.matchMedia.bind(window);
  window.matchMedia = (q) => {
    if (/prefers-reduced-motion/.test(q)) {
      return {
        matches: true, media: q, addListener() {}, removeListener() {},
        addEventListener() {}, removeEventListener() {}, onchange: null,
        dispatchEvent() { return false; },
      };
    }
    return mmReal(q);
  };
};

/**
 * The in-page half. One object on `window`, installed as an init script so
 * every navigation has it, holding the census and the probes that read it.
 * Everything here is a pure read of the DOM as it stands.
 */
const IN_PAGE = () => {
  const R2 = (x) => Math.round(x * 100) / 100;

  /** a stable, greppable path to an element: the shape a finding is read by */
  const pathOf = (el) => {
    const bit = (e) => {
      let s = e.tagName.toLowerCase();
      if (e.id) return s + '#' + e.id;
      const cls = (e.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (cls.length) s += '.' + cls.join('.');
      for (const a of ['data-act', 'data-card', 'data-key', 'data-setupcard', 'data-q', 'role']) {
        if (e.hasAttribute(a)) { s += '[' + a + '="' + e.getAttribute(a) + '"]'; break; }
      }
      return s;
    };
    const out = [];
    for (let e = el; e && e.nodeType === 1 && out.length < 4; e = e.parentElement) {
      out.unshift(bit(e));
      if (e.id) break;
    }
    return out.join(' > ');
  };

  /**
   * An accessible name, near enough. Not the full accname algorithm — it does
   * not walk labelledby recursively or resolve every role's name-from-content
   * rule — but it agrees with a screen reader on the cases this surface
   * produces, which are aria-label, a label element, text content and title.
   */
  const accName = (el) => {
    const al = el.getAttribute('aria-label');
    if (al && al.trim()) return al.trim();
    const lb = el.getAttribute('aria-labelledby');
    if (lb) {
      const t = lb.split(/\s+/).map((id) => {
        const e = document.getElementById(id);
        return e ? (e.textContent || '') : '';
      }).join(' ').trim();
      if (t) return t;
    }
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      if (el.id) {
        const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (l && (l.textContent || '').trim()) return l.textContent.trim();
      }
      const l2 = el.closest('label');
      if (l2 && (l2.textContent || '').trim()) return l2.textContent.trim();
      const ph = el.getAttribute('placeholder');
      if (ph && ph.trim()) return ph.trim();
      const ti = el.getAttribute('title');
      if (ti && ti.trim()) return ti.trim();
      if (el.type === 'submit' || el.type === 'button') return (el.value || '').trim();
      return '';
    }
    if (el.tagName === 'IMG') return (el.getAttribute('alt') || '').trim();
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (txt) return txt;
    const ti = el.getAttribute('title');
    if (ti && ti.trim()) return ti.trim();
    return '';
  };

  /** is the name nothing but pictures — an emoji, a tick, a triangle */
  const GLYPHY = /^[\p{Extended_Pictographic}\p{Emoji_Component}︎️‍←-⇿⌀-⏿■-➿\s·—–\-–]+$/u;
  const glyphOnly = (s) => !!s && GLYPHY.test(s);

  const visible = (el) => {
    try {
      return el.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true });
    } catch {
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    }
  };

  const NATIVE = 'a[href],button,input,select,textarea,summary,iframe,audio[controls],video[controls]';
  /** reachable by Tab: natively focusable or given a non-negative tabindex */
  const focusable = (el) => {
    if (el.hasAttribute('disabled')) return false;
    if (el.closest('[inert]')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const ti = el.getAttribute('tabindex');
    if (ti !== null && Number(ti) < 0) return false;
    if (!visible(el)) return false;
    if (ti !== null && Number(ti) >= 0) return true;
    if (el.isContentEditable) return true;
    return el.matches(NATIVE);
  };

  /**
   * What the page treats as a control. Two nets, deliberately: the surface's
   * own hooks (`data-act` and the classes its delegated listeners close over),
   * and anything the stylesheet gives a pointer cursor — the second catches a
   * control invented after this file was written, which the first cannot.
   */
  const HOOKS = [
    '[data-act]', '[role="button"]', '.btn', '.lanepick', '.achip', '.qitem',
    '.sectoggle', '.pick', '[data-setupcard]', '[data-set]', '[data-ans]',
    '[data-toc]', '.socket', '.emojicell', '.faceswatch', '.picdrop', '.doclink',
  ].join(',');

  /**
   * **A card is read inside its own box.** The card sweep opens forty-eight
   * cards on one page, and a probe that reads `document` each time counts the
   * contents rail's eighty anchors forty-eight times — twenty-five thousand
   * sightings of one defect, which buries every finding that is only on one
   * card. So every probe takes the root it is asked about: the page for a
   * scene, the open card for a card.
   */
  const controls = (root) => {
    const r = root || document;
    const out = new Set();
    for (const el of r.querySelectorAll(HOOKS)) out.add(el);
    for (const el of r.querySelectorAll('*')) {
      if (out.has(el)) continue;
      if (!visible(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.cursor !== 'pointer') continue;
      // a pointer cursor inherited from a control's own box is that control's,
      // not a second one: only the outermost element of a pointer run counts
      const p = el.parentElement;
      if (p && p !== document.body && getComputedStyle(p).cursor === 'pointer') continue;
      out.add(el);
    }
    /**
     * **A wrapper is not a control.** `.qitem` is a list row holding a button,
     * `.pick` is the block an `option-block`'s radio sits in (CP1) — neither
     * is focusable and neither should be, because the thing inside it is. A
     * census that counted them reported a hundred and forty-eight keyboard
     * findings that a Tab key would have walked straight through. So an
     * element that is not itself focusable but contains something that is
     * leaves the census: whatever is wrong there is wrong about the child.
     */
    return [...out].filter((el) => {
      if (!visible(el)) return false;
      if (focusable(el)) return true;
      return !el.querySelector(NATIVE + ',[tabindex]');
    });
  };

  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { w: R2(r.width), h: R2(r.height) };
  };

  /**
   * What kind of control this is, in the surface's own vocabulary: the leaf of
   * its path, minus the per-instance keys. A finding rolled by kind says *the
   * tabs behind a stack* rather than *sixty-eight elements*, which is the
   * difference between a row somebody can act on and a number.
   */
  const kindOf = (el) => {
    let s = el.tagName.toLowerCase();
    const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
    if (cls.length) s += '.' + cls.join('.');
    if (el.hasAttribute('data-act')) s += '[data-act="' + el.getAttribute('data-act') + '"]';
    return s;
  };

  /** the census one scene's probes all read from */
  const census = (root) => controls(root).map((el) => ({
    path: pathOf(el),
    kind: kindOf(el),
    tag: el.tagName.toLowerCase(),
    role: el.getAttribute('role') || '',
    name: accName(el).slice(0, 80),
    focusable: focusable(el),
    ariaHidden: el.getAttribute('aria-hidden') === 'true',
    // **a disabled control is *meant* to be unfocusable**, and this surface is
    // full of them on purpose: the ✓ is greyed until something is chosen
    // (SURFACE §9.1) and a closed document takes no edit at all, which
    // `powers-walk` asserts. Counting those as keyboard defects put 88
    // sightings of correct behaviour at the top of the first run.
    disabled: el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true',
    tabindex: el.getAttribute('tabindex'),
    act: el.getAttribute('data-act') || '',
    ...box(el),
  }));

  /** every tab stop under `root`, in document order */
  const tabStops = (root) => [...(root || document).querySelectorAll('*')]
    .filter((el) => focusable(el))
    .map((el) => ({ path: pathOf(el), name: accName(el).slice(0, 60) }));

  window.__A11Y = {
    pathOf, accName, glyphOnly, focusable, visible, census, tabStops, box, R2,

    /**
     * A1 · a control with no accessible name at all. An `aria-hidden` one is
     * not asked: it has been taken out of the accessibility tree deliberately,
     * so *what is it called* is not a question about it — whether it should be
     * hidden at all is, and that is A3's row.
     */
    unnamed: (root) => census(root).filter((c) => !c.name && !c.ariaHidden),

    /** A2 · a control whose whole name is a picture */
    glyphNamed: (root) => census(root).filter((c) => c.name && window.__A11Y.glyphOnly(c.name)),

    /** A3 · a control the keyboard cannot reach, disabled ones excepted */
    unreachable: (root) => census(root).filter((c) => !c.focusable && !c.disabled),

    /** how many controls are off the keyboard because they are disabled */
    disabled: (root) => census(root).filter((c) => c.disabled).length,

    /** A4 · a control below WCAG 2.2 SC 2.5.8's 24×24 (exceptions not applied) */
    small: (root) => census(root).filter((c) => c.w > 0 && c.h > 0 && (c.w < 24 || c.h < 24)),

    /** A5 · how long the Tab road is */
    stops: (root) => {
      const t = tabStops(root);
      return { n: t.length, first: t.slice(0, 6), last: t.slice(-3) };
    },

    /**
     * A6 · a radiogroup whose options are all called the same thing. This is
     * CP1's *every radio on a card says the same words* seen from the other
     * side: the option's name lives on the block, the button only says
     * *Prefer this*, and a reader moving through the group by arrow key hears
     * one sentence repeated.
     */
    sameName: (root) => {
      const out = [];
      /**
       * **The group is the card, not a `radiogroup`.** The first cut of this
       * probe asked `[role="radiogroup"], fieldset` for its options and came
       * back empty on all four epochs — which read as *the surface is clear*
       * and was nothing of the kind: there is no `radiogroup` on the charter
       * at all, and a `.lanepick` carries no role either. The options of one
       * decision are simply the choice controls inside one card, so that is
       * what is asked.
       */
      const groups = [...(root || document).querySelectorAll('[role="radiogroup"], fieldset, .sugg, .setupcard')];
      if (root && root.matches && root.matches('.sugg, .setupcard')) groups.unshift(root);
      for (const g of groups) {
        if (!window.__A11Y.visible(g)) continue;
        const opts = [...g.querySelectorAll('[role="radio"], input[type="radio"], .lanepick')]
          .filter((el) => window.__A11Y.visible(el));
        if (opts.length < 2) continue;
        const names = opts.map((o) => window.__A11Y.accName(o).replace(/\s+/g, ' ').slice(0, 60));
        const roles = opts.map((o) => o.getAttribute('role') || (o.tagName === 'INPUT' ? 'radio' : ''));
        const uniq = new Set(names.filter(Boolean));
        if (uniq.size < names.length) {
          out.push({
            path: window.__A11Y.pathOf(g), n: opts.length, names, distinct: uniq.size,
            roles: [...new Set(roles)],
            grouped: !!g.closest('[role="radiogroup"],fieldset') || g.matches('[role="radiogroup"],fieldset'),
          });
        }
      }
      return out;
    },

    /** A7 · an inline drawing with neither a name nor a hand over its eyes */
    bareSvg: (root) => [...(root || document).querySelectorAll('svg')]
      .filter((s) => window.__A11Y.visible(s))
      .filter((s) => s.getAttribute('aria-hidden') !== 'true' &&
        !s.getAttribute('aria-label') && !s.querySelector('title') && !s.getAttribute('role'))
      .map((s) => ({ path: window.__A11Y.pathOf(s), ...window.__A11Y.box(s) })),

    /** A8 · what would announce a change that arrives on its own */
    liveRegions: () => [...document.querySelectorAll('[aria-live],[role="status"],[role="alert"],[role="log"]')]
      .map((el) => ({ path: window.__A11Y.pathOf(el), live: el.getAttribute('aria-live') || el.getAttribute('role') })),

    /** A9 · the landmarks a reader navigates a page by */
    landmarks: () => [...document.querySelectorAll('main,nav,header,footer,aside,[role="main"],[role="navigation"],[role="banner"],[role="contentinfo"],[role="complementary"]')]
      .filter((el) => window.__A11Y.visible(el))
      .map((el) => ({ path: window.__A11Y.pathOf(el), tag: el.tagName.toLowerCase(), role: el.getAttribute('role') || '' })),

    /** A10 · a heading level stepped over */
    headingSkips: (root) => {
      const hs = [...(root || document).querySelectorAll('h1,h2,h3,h4,h5,h6')]
        .filter((h) => window.__A11Y.visible(h))
        .map((h) => ({ lvl: +h.tagName[1], text: (h.textContent || '').trim().slice(0, 50), path: window.__A11Y.pathOf(h) }));
      const out = [];
      let prev = 0;
      for (const h of hs) {
        if (prev && h.lvl > prev + 1) out.push({ ...h, after: prev });
        prev = h.lvl;
      }
      return { n: hs.length, first: hs[0] || null, skips: out };
    },

    /** A13 · the editable surfaces, and whether a reader is told what they are */
    editables: (root) => [...(root || document).querySelectorAll('[contenteditable="true"]')]
      .filter((el) => window.__A11Y.visible(el))
      .map((el) => ({
        path: window.__A11Y.pathOf(el),
        role: el.getAttribute('role') || '',
        name: window.__A11Y.accName(el).slice(0, 40),
        labelled: !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')),
        multiline: el.getAttribute('aria-multiline') || '',
      })),

    /** A15 · the page's own declarations */
    page: () => ({
      lang: document.documentElement.getAttribute('lang') || '',
      title: (document.title || '').slice(0, 80),
      h1: document.querySelectorAll('h1').length,
      skipLink: !!document.querySelector('a[href^="#"].skip, a[href^="#"][class*="skip"]'),
    }),
  };
};

/**
 * A12 · is a focus ring ever drawn? Read off the stylesheets rather than by
 * focusing something, because the automation tab's focus is not the user's and
 * `:focus-visible` does not match under a synthetic focus.
 */
const focusRules = () => {
  const out = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    // a nested rule carries BOTH a selectorText of its own and child cssRules,
    // so the recursion must not stand in for reading the rule — the first cut
    // of this walk `continue`d on any rule with children and reported that a
    // stylesheet holding nine `&:focus-visible` rules held none
    const walk = (list) => {
      for (const r of list) {
        if (r.selectorText && /:focus(-visible)?\b/.test(r.selectorText)) {
          out.push({ sel: r.selectorText.slice(0, 120), visible: /:focus-visible/.test(r.selectorText) });
        }
        if (r.cssRules) walk(r.cssRules);
      }
    };
    walk(rules);
  }
  return out;
};

/**
 * A16 · **where the keyboard is left standing.** Driven rather than read: a
 * card is opened from its own tab with the Enter key, and a judgment is
 * committed with the Enter key, and after each the audit asks what holds
 * focus. This is the half no static probe can see — a card *replaces its own
 * paragraph* when it opens and runs its whole box back onto that paragraph
 * when it closes (CLAUDE.md, `decision card`), so the element the keyboard was
 * standing on stops existing at both ends of the act.
 *
 * Bounded to a few cards on purpose: it is the same answer every time, and
 * forty-eight of them would cost a minute to say it forty-eight times.
 */
async function focusWalk(page, base, url, errors) {
  const out = { opened: [], committed: [] };
  const CARDS = 3;
  try {
    await page.goto(base + url, { waitUntil: 'networkidle' });

    // opening: Enter on a clause tab, which is the only way into a card from
    // the document (CLAUDE.md, `clause-tab`)
    // **the page rebuilds under the act**, so a handle taken before the press
    // is detached by the time the next one is wanted — the whole charter
    // column re-renders when a card opens. Each tab is therefore found afresh
    // on a freshly loaded page, which is also the only way each open is
    // measured from the same starting state.
    const anchors = await page.evaluate((n) =>
      [...document.querySelectorAll('.achip[role="button"][tabindex="0"]')]
        .map((el) => el.getAttribute('data-anchor')).filter(Boolean).slice(0, n), CARDS);
    for (const anchor of anchors) {
      try {
        await page.goto(base + url, { waitUntil: 'networkidle' });
        const sel = '.achip[role="button"][data-anchor="' + anchor.replace(/"/g, '\\"') + '"]';
        await page.focus(sel);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(400);
        out.opened.push({
          card: anchor,
          focus: await page.evaluate(() => {
            const a = document.activeElement;
            if (!a || a === document.body) return 'body';
            return window.__A11Y.pathOf(a);
          }),
          insideCard: await page.evaluate((id) => {
            const a = document.activeElement;
            const card = document.querySelector('.sugg[data-card="' + (id || '').replace(/"/g, '\\"') + '"]');
            return !!(a && card && card.contains(a));
          }, anchor),
        });
      } catch (e) { errors.push('focus open ' + anchor + ': ' + (e && e.message)); }
    }

    // committing: Enter on an enabled ✓, then where the keyboard stands
    await page.goto(base + url, { waitUntil: 'networkidle' });
    const ids = await page.evaluate(() => {
      const S = window.SESSION;
      if (!S || !S.SUGGS) return [];
      const live = [];
      for (const s of S.SUGGS) {
        S.toggle(s.id, false);
        const b = document.querySelector('.sugg[data-card="' + s.id.replace(/"/g, '\\"') + '"] [data-act="submit"]');
        if (b && !b.hasAttribute('disabled')) live.push(s.id);
        S.toggle(s.id, false);
        if (live.length >= 3) break;
      }
      return live;
    });
    for (const id of ids) {
      try {
        await page.evaluate((c) => window.SESSION.toggle(c, false), id);
        const sel = '.sugg[data-card="' + id.replace(/"/g, '\\"') + '"] [data-act="submit"]';
        await page.focus(sel);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(900);
        out.committed.push({
          card: id,
          focus: await page.evaluate(() => {
            const a = document.activeElement;
            if (!a || a === document.body) return 'body';
            return window.__A11Y.pathOf(a);
          }),
          cardGone: await page.evaluate((c) => !document.querySelector('.sugg[data-card="' + c.replace(/"/g, '\\"') + '"]'), id),
        });
      } catch (e) { errors.push('focus commit ' + id + ': ' + (e && e.message)); }
    }
  } catch (e) {
    errors.push('focus walk threw: ' + (e && e.message));
  }
  return out;
}

/**
 * A17 · **nothing repeats by itself once reduced motion is asked for.** Read
 * with `prefers-reduced-motion: reduce` emulated: every element whose
 * computed animation runs for ever. `sparkles` counts the grant sparkle
 * (Q1501) so a run can say whether it met one at all.
 */
const motionProbe = () => {
  const path = (e) => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const running = [...document.querySelectorAll('*')].filter((e) => {
    const cs = getComputedStyle(e);
    return cs.animationName && cs.animationName !== 'none' && /infinite/.test(cs.animationIterationCount);
  }).map((e) => ({ path: path(e), name: getComputedStyle(e).animationName }));
  // …and the grant sparkle's still form, asked of the stylesheet even where
  // no grant is waiting in this scene: a probe span in the first rail entry,
  // read and taken out again
  let sparkle = null;
  const host = document.querySelector('.queue button:not(.sealdot)');
  if (host) {
    const probe = document.createElement('span');
    probe.className = 'sparkle';
    host.insertBefore(probe, host.firstChild);
    sparkle = getComputedStyle(probe).animationName;
    probe.remove();
  }
  return { running, sparkles: document.querySelectorAll('.sparkle').length, sparkle };
};

/**
 * A14 · a commit that is only ever a held pointer. The page states its own
 * gesture (SURFACE §7.2's switch, read through `SESSION.holdMs` and the
 * `.holding` machinery), so this asks the page rather than guessing: a control
 * the surface arms on `pointerdown` and fires on a timer has no key that does
 * the same thing, whatever its tabindex says.
 */
const holdProbe = () => {
  const S = window.SESSION;
  const out = { holdMs: S && S.holdMs ? S.holdMs : null, holders: [] };
  for (const el of document.querySelectorAll('[data-act], .btn, [role="button"]')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none') continue;
    // the surface marks a hold's own target with the touch-action it needs and
    // the class the gesture toggles; either is the tell
    const cls = el.getAttribute('class') || '';
    if (/\bhold(ing)?\b/.test(cls) || cs.touchAction === 'none') {
      out.holders.push({
        path: window.__A11Y.pathOf(el),
        name: window.__A11Y.accName(el).slice(0, 50),
        focusable: window.__A11Y.focusable(el),
        cls: cls.slice(0, 60),
      });
    }
  }
  return out;
};

/**
 * The whole hand-probe pass over one root — the page when `sel` is null, the
 * open card when it names one. The page-wide questions (landmarks, the lang
 * attribute, the live regions) are asked only of the page: a card has no
 * opinion about them, and asking anyway is how the first cut of this file
 * reported one missing `lang` forty-eight times.
 */
const PROBES = (sel) => {
  const A = window.__A11Y;
  const root = sel ? document.querySelector(sel) : null;
  if (sel && !root) return null;
  const out = {
    stops: A.stops(root),
    unnamed: A.unnamed(root),
    glyphNamed: A.glyphNamed(root),
    unreachable: A.unreachable(root),
    small: A.small(root),
    sameName: A.sameName(root),
    bareSvg: A.bareSvg(root),
    headings: A.headingSkips(root),
    editables: A.editables(root),
    controls: A.census(root).length,
    disabledControls: A.disabled(root),
  };
  if (!sel) {
    out.page = A.page();
    out.liveRegions = A.liveRegions();
    out.landmarks = A.landmarks();
  }
  return out;
};

/* ------------------------------------------------------------------------ */

async function loadAxe() {
  const tries = [];
  if (AXE_PATH) tries.push(AXE_PATH);
  tries.push(join(ROOT, 'node_modules', 'axe-core', 'axe.min.js'));
  for (const p of tries) {
    try { return { src: await readFile(p, 'utf8'), from: p }; } catch { /* next */ }
  }
  return null;
}

/** axe over the current page, or over one element when `within` is given */
async function runAxe(page, within) {
  return page.evaluate(async (sel) => {
    if (!window.axe) return null;
    const opts = {
      resultTypes: ['violations'],
      // the standard AA sweep plus the rules axe still calls experimental,
      // which is where target-size lives (WCAG 2.2 SC 2.5.8)
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice', 'experimental'] },
    };
    const ctx = sel ? { include: [sel] } : document;
    let res;
    try { res = await window.axe.run(ctx, opts); } catch (e) { return { error: String(e && e.message || e) }; }
    return res.violations.map((v) => ({
      id: v.id, impact: v.impact, help: v.help, n: v.nodes.length,
      tags: v.tags.filter((t) => /^wcag|best-practice/.test(t)),
      nodes: v.nodes.slice(0, 6).map((n) => ({
        target: (n.target || []).join(' '),
        summary: (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 180),
      })),
    }));
  }, within || null);
}

async function main() {
  const server = await serveDesign();
  const base = 'http://127.0.0.1:' + server.address().port;
  const axe = await loadAxe();
  const browser = await ENGINES[BROWSER].launch();
  const context = await browser.newContext({
    viewport: VIEWPORT, deviceScaleFactor: 1, locale: 'en-GB', timezoneId: 'Europe/London',
  });
  await context.addInitScript(STUB_MOTION);
  await context.addInitScript(IN_PAGE);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('page error: ' + String(e)));

  if (!AS_JSON) {
    console.log('a11y-audit @ ' + VIEWPORT.width + '×' + VIEWPORT.height +
      (axe ? ' · axe-core ' + axe.from.replace(ROOT + sep, '') : ' · no axe-core (hand probes only)'));
  }

  const scenes = [];
  const t0 = Date.now();

  for (const s of SCENES) {
    if (!WANT.includes(s.name)) continue;
    const scene = { name: s.name, what: s.what, url: s.url };
    try {
      await page.goto(base + withGesture(s.url), { waitUntil: 'networkidle' });
      await page.evaluate(() => window.scrollTo(0, 0));
      if (axe) await page.addScriptTag({ content: axe.src });
      scene.probes = await page.evaluate(PROBES, null);
      scene.focusRules = await page.evaluate(focusRules);
      scene.holds = await page.evaluate(holdProbe);
      // A17 · what still moves when the reader has asked for stillness (Q1501's
      // sparkle is the first motion on the surface that repeats by itself):
      // the stylesheet's own reduced-motion branch, read with the media
      // emulated, every element whose animation never ends
      await page.emulateMedia({ reducedMotion: 'reduce' });
      scene.motion = await page.evaluate(motionProbe);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      if (axe) scene.axe = await runAxe(page);

      /**
       * The card sweep. A card *is* the product — every decision a member
       * makes is made on one — and a scene measured with every card shut has
       * measured the page around the thing that matters. Each is opened,
       * read and shut again, exactly as `session-probe` does it.
       */
      if (WITH_CARDS) {
        const ids = await page.evaluate(() => {
          const S = window.SESSION;
          return S && S.SUGGS ? S.SUGGS.map((x) => x.id) : [];
        });
        scene.cards = [];
        for (const id of ids) {
          const opened = await page.evaluate((cid) => {
            try { window.SESSION.toggle(cid, false); } catch (e) { return String(e); }
            return null;
          }, id);
          if (opened) { errors.push(s.name + ' card ' + id + ': ' + opened); continue; }
          const sel = '.sugg[data-card="' + id.replace(/"/g, '\\"') + '"]';
          const has = await page.evaluate((q) => !!document.querySelector(q), sel);
          if (!has) { await page.evaluate((cid) => { try { window.SESSION.toggle(cid, false); } catch { /* shut */ } }, id); continue; }
          const card = { id, probes: await page.evaluate(PROBES, sel) };
          if (axe) card.axe = await runAxe(page, sel);
          scene.cards.push(card);
          await page.evaluate((cid) => { try { window.SESSION.toggle(cid, false); } catch { /* shut */ } }, id);
        }
      }

      // the driven pass, on the one scene that has cards to drive
      if (s.name === 'session') scene.focus = await focusWalk(page, base, withGesture(s.url), errors);
    } catch (e) {
      scene.threw = String(e && e.message || e);
      errors.push(s.name + ' scene threw: ' + scene.threw);
    }
    scenes.push(scene);
    if (!AS_JSON) {
      const p = scene.probes;
      console.log('  ' + s.name.padEnd(8) + ' · ' + (p ? p.controls + ' controls · ' + p.stops.n + ' tab stops' : 'threw') +
        (scene.cards ? ' · ' + scene.cards.length + ' cards' : '') +
        (scene.axe ? ' · axe ' + scene.axe.length : ''));
    }
  }

  await browser.close();
  server.close();

  /**
   * **The rollup is the finding; the element is where it shows.** One
   * stylesheet fact is one defect appearing on forty controls, and printing it
   * forty times buries the forty-first that is only on one. Grouped by rule
   * and by what was seen, carrying where it was seen.
   */
  const roll = new Map();
  const add = (rule, asks, saw, where, scene) => {
    const k = rule + '|' + saw;
    if (!roll.has(k)) roll.set(k, { rule, asks, saw, where: [], scenes: new Set(), cards: new Set(), n: 0 });
    const r = roll.get(k);
    r.n++;
    // the epoch is what a reader wants in the summary line; *which* of the
    // forty-eight cards it was on belongs in the payload, not in four lines
    // of card keys across the terminal
    const [epoch, card] = String(scene).split('·');
    r.scenes.add(epoch);
    if (card) r.cards.add(card);
    if (r.where.length < 8 && where) r.where.push(where);
  };

  for (const s of scenes) {
    const p = s.probes;
    if (!p) continue;
    const every = [{ tag: s.name, probes: p }, ...(s.cards || []).map((c) => ({ tag: s.name + '·' + c.id, probes: c.probes }))];
    for (const { tag, probes } of every) {
      if (!probes) continue;
      for (const c of probes.unnamed) add('A1 name', 'every control tells a reader what it is', 'no accessible name · ' + c.kind, c.path, tag);
      for (const c of probes.glyphNamed) add('A2 glyph name', 'a name is words, not a picture', 'the name is the glyph ' + c.name + ' · ' + c.kind, c.path, tag);
      for (const c of probes.unreachable) {
        add('A3 keyboard', 'every control is reachable by Tab',
          (c.ariaHidden ? 'aria-hidden, so not focusable' : c.tabindex ? 'tabindex ' + c.tabindex : 'no tabindex, not natively focusable') +
          ' · ' + c.kind, c.path, tag);
      }
      for (const c of probes.small) {
        // the short side is what the rule is about; rolling by it keeps one
        // row per control kind instead of one per rendered width
        add('A4 target', 'a target is at least 24×24 (SC 2.5.8)',
          'shortest side ' + Math.min(c.w, c.h) + 'px · ' + c.kind, c.path, tag);
      }
      for (const g of probes.sameName) {
        add('A6 one voice', 'the options of one decision are told apart by name, and grouped',
          g.n + ' options, ' + g.distinct + ' distinct name(s) ' + JSON.stringify(g.names.slice(0, 3)) +
          (g.grouped ? '' : ' · in no radiogroup') +
          ' · role ' + JSON.stringify(g.roles), g.path, tag);
      }
      for (const v of probes.bareSvg) add('A7 drawing', 'a drawing is named or hidden', 'neither aria-hidden nor a name', v.path, tag);
      for (const h of probes.headings.skips) add('A10 headings', 'a heading level is not stepped over', 'h' + h.after + ' → h' + h.lvl + ' (' + h.text + ')', h.path, tag);
      for (const e of probes.editables.filter((e) => !e.labelled)) add('A13 editable', 'an editable region says what it is', 'contenteditable, no aria-label' + (e.role ? ' (role ' + e.role + ')' : ', no role'), e.path, tag);
    }
    if (p.liveRegions && !p.liveRegions.length) add('A8 live', 'a change that arrives on its own is announced', 'no aria-live, role=status, role=alert or role=log anywhere on the page', s.name, s.name);
    if (p.landmarks && !p.landmarks.length) add('A9 landmarks', 'the page has landmarks to navigate by', 'no main, nav, header, footer or aside', s.name, s.name);
    if (!p.page.lang) add('A15 lang', 'the document declares its language', 'no lang on <html>', s.name, s.name);
    if (p.page.h1 === 0) add('A15 h1', 'the page has one first-level heading', 'no h1', s.name, s.name);
    if (p.headings.n && p.headings.first && p.headings.first.lvl !== 1) add('A10 headings', 'the first heading is h1', 'the first heading is h' + p.headings.first.lvl, p.headings.first.path, s.name);
    if (s.focusRules && !s.focusRules.some((r) => r.visible)) add('A12 focus ring', 'a focused control is visibly focused', 'no :focus-visible rule in any stylesheet', s.name, s.name);
    if (s.focus) {
      for (const o of s.focus.opened) {
        if (!o.insideCard) {
          add('A16 focus', 'opening a card leaves the keyboard inside it',
            'the card opened and focus is on ' + o.focus, o.card, s.name);
        }
      }
      for (const c of s.focus.committed) {
        if (c.focus === 'body') {
          add('A16 focus', 'a committed card hands the keyboard on, it does not drop it',
            'the card closed and focus fell to <body> — the keyboard is back at the top of the page',
            c.card, s.name);
        }
      }
    }
    if (s.motion) {
      for (const m of s.motion.running) add('A17 motion', 'nothing repeats by itself under reduced motion', 'animation ' + m.name + ' runs for ever', m.path, s.name);
      if (s.motion.sparkle && s.motion.sparkle !== 'none') {
        add('A17 motion', 'nothing repeats by itself under reduced motion', 'the grant sparkle runs ' + s.motion.sparkle + ' (Q1501)', '.queue button > .sparkle', s.name);
      }
    }
    if (s.holds && s.holds.holders.length) {
      for (const h of s.holds.holders.filter((h) => !h.focusable)) {
        add('A14 hold', 'a commit made by holding has a key that does the same', 'a ' + (s.holds.holdMs || '?') + 'ms hold, not focusable', h.path, s.name);
      }
    }
  }

  /** axe's own rows, rolled the same way so one list reads end to end */
  const axeRoll = new Map();
  for (const s of scenes) {
    const every = [{ tag: s.name, axe: s.axe }, ...(s.cards || []).map((c) => ({ tag: s.name + '·' + c.id, axe: c.axe }))];
    for (const { tag, axe: rows } of every) {
      if (!Array.isArray(rows)) continue;
      for (const v of rows) {
        if (!axeRoll.has(v.id)) axeRoll.set(v.id, { id: v.id, impact: v.impact, help: v.help, tags: v.tags, nodes: 0, where: [], scenes: new Set() });
        const r = axeRoll.get(v.id);
        r.nodes += v.n;
        r.scenes.add(tag.split('·')[0]);
        for (const n of v.nodes) if (r.where.length < 6) r.where.push(n.target);
      }
    }
  }

  const rollup = [...roll.values()]
    .map((r) => ({ ...r, scenes: [...r.scenes], cards: [...r.cards] }))
    .sort((a, b) => b.n - a.n || a.rule.localeCompare(b.rule));
  const axeRows = [...axeRoll.values()]
    .map((r) => ({ ...r, scenes: [...r.scenes] }))
    .sort((a, b) => b.nodes - a.nodes);

  const payload = {
    meta: {
      viewport: VIEWPORT, scenes: WANT, cards: WITH_CARDS,
      axe: axe ? axe.from.replace(ROOT + sep, '') : null,
      seconds: Math.round((Date.now() - t0) / 100) / 10,
    },
    scenes, rollup, axe: axeRows, errors,
  };

  if (AS_JSON) { console.log(JSON.stringify(payload, null, 1)); return; }

  await writeFile(OUT, JSON.stringify(payload, null, 1));

  const sightings = rollup.reduce((n, r) => n + r.n, 0);
  console.log('\n' + rollup.length + ' distinct hand findings (' + sightings + ' sightings)' +
    (axe ? ' · ' + axeRows.length + ' axe rules (' + axeRows.reduce((n, r) => n + r.nodes, 0) + ' nodes)' : '') +
    ' · ' + payload.meta.seconds + 's');

  for (const r of rollup) {
    console.log('\n  ' + r.rule + ' · ' + r.n + ' · ' + r.scenes.join(', ') +
      (r.cards.length ? ' · on ' + r.cards.length + ' card(s)' : ''));
    console.log('    asks: ' + r.asks);
    console.log('    saw:  ' + r.saw);
    if (r.where.length) console.log('    at:   ' + r.where.slice(0, 3).join(' | ') + (r.n > 3 ? ' …' : ''));
  }

  if (axeRows.length) {
    console.log('\naxe-core:');
    for (const r of axeRows) {
      console.log('  ' + (r.impact || '?').padEnd(8) + ' ' + r.id + ' · ' + r.nodes + ' node(s) · ' + r.scenes.join(', '));
      console.log('           ' + r.help);
      if (r.where.length) console.log('           at: ' + r.where.slice(0, 3).join(' | '));
    }
  }

  if (errors.length) {
    console.log('\nerrors:');
    for (const e of errors.slice(0, 20)) console.log('  ' + e);
  }
  console.log('\npayload → ' + OUT);
}

main().catch((e) => { console.error(e); process.exit(2); });
