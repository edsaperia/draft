/* patch.js — the keyed re-render (principle 10; grammar U1, U2; redesign stage 9).

   **Nothing you are in the middle of is taken by the page updating.** The page
   draws itself as HTML strings, and it used to put each one in with
   `innerHTML`, which throws every node away and builds new ones — so a render
   landing under a caret, an open select, a scrolled grid or a press took it,
   and five flags deferred the poll case by case to keep it from happening
   (`pressInFlight`, `dateInFlight`, `heldCaret`, `penHold`, `SESSION.holding`).

   `PATCH.set(el, html)` puts the same string in by **patching**: the new markup
   is parsed off-page and walked against the nodes already there, and a node
   that is the same node with new data — same tag, same key (U2) — keeps its
   identity and takes only the difference (text, attributes, classes, a form
   control's value). A node the new markup does not have leaves; one it has
   and the page does not is put in. The DOM that results is the DOM `innerHTML`
   would have made — attribute order included — with one exception, which is
   the point (U1): **a node holding something of the reader's in flight is
   never replaced, and what it holds is not touched**:

   · the focused control keeps its value, its selection and its caret, and a
     focused editable or select keeps its children — the render's copy of what
     it holds is the one that is stale;
   · a control mid-press (`.holding`, `.penholding`) keeps those classes;
   · a scrolled box keeps its scroll, because it is the same box.

   **The key** is the first of `KEY_ATTRS` an element carries — the card's id,
   the slot, the tab, the clause — so a list that gains an entry above keeps
   every entry below it; an element with none is matched by position among its
   unkeyed siblings of the same tag, which is what a fixed template is.

   `?render=replace` restores wholesale replacement (`PATCH.mode`), in the
   manner of `Session.memo`, so the two can be compared on any walk.
   `render-hold-walk` is the guard. */
(function () {
  const q = (() => { try { return new URLSearchParams(location.search).get('render'); } catch (e) { return null; } })();
  const MODE = q === 'replace' ? 'replace' : 'patch';
  // the attributes that name what an element is *about* (U2): the first one an
  // element carries is its key among its siblings
  const KEY_ATTRS = ['id', 'data-setupcard', 'data-card', 'data-tab', 'data-slot', 'data-q',
    'data-para', 'data-key', 'data-k', 'data-site', 'data-anchor'];
  // classes the page puts on a pressed control at runtime, never in its markup:
  // a render landing mid-press must not take them off (the press is in flight)
  const PRESS_CLASSES = ['holding', 'penholding'];

  const keyOf = (n) => {
    if (n.nodeType !== 1) return null;
    for (const a of KEY_ATTRS) { const v = n.getAttribute(a); if (v !== null) return a + '=' + v; }
    return null;
  };
  // an unkeyed element's kind is its tag and its first class — the base
  // class a template names it by (`memrow`, `cpara`, `said`), which a state
  // class after it (`open`, `blank`) never changes — so a row added above an
  // open card is a new row, not the card turned into one
  const kindOf = (n) => n.nodeType !== 1 ? '#' + n.nodeType
    : n.nodeName + '.' + ((n.getAttribute('class') || '').trim().split(/\s+/)[0] || '');
  const sameKind = (a, b) => kindOf(a) === kindOf(b);

  // **in flight** (U1): what the reader is holding on this node. Focus alone
  // is not a thing held — a button keeps it after its own press — so only a
  // control that holds typing, a choice being made or a caret counts
  const ENTRY = /^(INPUT|TEXTAREA|SELECT)$/;
  const focusedHere = (el) => el === document.activeElement && el !== document.body &&
    (ENTRY.test(el.nodeName) || el.isContentEditable);
  const pressed = (el) => el.classList && PRESS_CLASSES.some((c) => el.classList.contains(c));
  // **the block the reader is writing in**, whose children the render leaves
  // alone: a focused select or textarea; in an editable, the block holding the
  // caret — its clause (`data-key`), its lane (`data-lane`) or the lane's line
  // — never the whole editing host, which in edit mode is the column itself
  // and must still take a card opening in it. Read once per `set`.
  let hold = null;
  const holdOf = () => {
    const a = document.activeElement;
    if (!a || a === document.body) return null;
    if (a.nodeName === 'SELECT' || a.nodeName === 'TEXTAREA') return a;
    if (!a.isContentEditable) return null;
    const sel = getSelection();
    const n = sel && sel.rangeCount ? sel.getRangeAt(0).startContainer : null;
    const el = n && (n.nodeType === 1 ? n : n.parentElement);
    const blk = el && el.closest && el.closest('[data-key], [data-lane], .lp');
    return blk && a.contains(blk) ? blk : a;
  };

  function patchAttrs(el, nu) {
    const keepPress = pressed(el) ? PRESS_CLASSES.filter((c) => el.classList.contains(c)) : [];
    const want = [];
    for (const a of nu.attributes) want.push([a.name, a.value]);
    if (keepPress.length) {
      const cls = want.find((x) => x[0] === 'class');
      const add = keepPress.filter((c) => !(cls ? cls[1].split(/\s+/) : []).includes(c));
      if (add.length) { if (cls) cls[1] = (cls[1] + ' ' + add.join(' ')).trim(); else want.push(['class', add.join(' ')]); }
    }
    const have = [...el.attributes].map((a) => a.name);
    const sameOrder = have.length === want.length && have.every((n, i) => n === want[i][0]);
    // (never on the focused node itself: taking `contenteditable` or
    // `tabindex` off it for a moment could blur it — an ancestor's attributes
    // come off and go back in one task, which no focus fix-up sees)
    if (!sameOrder && el !== document.activeElement) {
      // the attribute *order* is part of the markup `innerHTML` would have
      // made, and the probes read markup: rebuilt in the new order, on the
      // same element
      for (const n of have) el.removeAttribute(n);
      for (const [n, v] of want) el.setAttribute(n, v);
      return;
    }
    const wantNames = new Set(want.map((x) => x[0]));
    for (const n of have) if (!wantNames.has(n)) el.removeAttribute(n);
    for (const [n, v] of want) if (el.getAttribute(n) !== v) el.setAttribute(n, v);
  }
  // a form control's live value is a property, not the attribute: a control
  // nobody is holding takes the value its new markup states, as a fresh node
  // would; the focused one keeps what the reader has put in it
  function patchValue(el, nu) {
    // the focused control keeps what the reader put in it — except where the
    // render states a different value, which is the page's own act (a list
    // sent and cut down to the refused lines): taken, with the selection put
    // back where it can stand. A date box is never touched while focused: a
    // half-typed one reads as no value at all (Q1513)
    if (focusedHere(el)) {
      if (el.nodeName !== 'INPUT' && el.nodeName !== 'TEXTAREA') return;
      if (el.nodeName === 'INPUT' && /^(date|datetime-local|time|month|week|checkbox|radio|file)$/.test(el.type)) return;
      const v = el.nodeName === 'TEXTAREA' ? nu.value : (nu.getAttribute('value') ?? '');
      if (el.value === v) return;
      let ss = null;
      try { ss = [el.selectionStart, el.selectionEnd]; } catch (e) { /* type=email has none */ }
      el.value = v;
      if (ss && typeof ss[0] === 'number') {
        try { el.setSelectionRange(Math.min(ss[0], v.length), Math.min(ss[1], v.length)); } catch (e) { /* none */ }
      }
      return;
    }
    const t = el.nodeName;
    if (t === 'INPUT') {
      if (el.type === 'checkbox' || el.type === 'radio') { el.checked = nu.hasAttribute('checked'); return; }
      if (el.type === 'file') return;
      const v = nu.getAttribute('value');
      if (el.value !== (v === null ? '' : v)) el.value = v === null ? '' : v;
    } else if (t === 'TEXTAREA') {
      if (el.value !== nu.value) el.value = nu.value;
    } else if (t === 'SELECT') {
      const i = [...nu.options].findIndex((o) => o.hasAttribute('selected'));
      const want = i >= 0 ? i : (nu.options.length ? 0 : -1);
      if (el.selectedIndex !== want) el.selectedIndex = want;
    }
  }

  function patchNode(el, nu) {
    if (el.nodeType === 3 || el.nodeType === 8) {
      if (el.nodeValue !== nu.nodeValue) el.nodeValue = nu.nodeValue;
      return;
    }
    patchAttrs(el, nu);
    if (el !== hold) patchChildren(el, nu);
    patchValue(el, nu);
  }

  function patchChildren(parent, nuParent) {
    const olds = [...parent.childNodes];
    const used = new Set();
    // keyed old children, by key; unkeyed ones are taken in order
    const byKey = new Map();
    for (const o of olds) { const k = keyOf(o); if (k !== null && !byKey.has(k)) byKey.set(k, o); }
    let cursor = 0;
    // the next unkeyed old node of the same kind, from where the last match
    // left off: nodes of other kinds between are skipped (they will be matched
    // or leave on their own), so an insertion never shifts a match down a row
    const nextUnkeyed = (nu) => {
      const want = kindOf(nu);
      for (let i = cursor; i < olds.length; i++) {
        const o = olds[i];
        if (used.has(o) || keyOf(o) !== null || kindOf(o) !== want) continue;
        cursor = i + 1;
        return o;
      }
      return null;
    };
    const plan = [];
    for (const nu of [...nuParent.childNodes]) {
      const k = keyOf(nu);
      let o = null;
      if (k !== null) {
        const c = byKey.get(k);
        if (c && !used.has(c) && sameKind(c, nu)) o = c;
      } else o = nextUnkeyed(nu);
      if (o) used.add(o);
      plan.push([o, nu]);
    }
    // what the new markup does not have leaves: a card the page has closed is
    // closed, whatever was in it
    for (const o of olds) if (!used.has(o)) o.remove();
    // then in order: each kept node patched and put where the new markup has
    // it (moved only if it is not already there), each new node put in
    let at = parent.firstChild;
    for (const [o, nu] of plan) {
      const node = o || nu;
      if (o) patchNode(o, nu);
      if (node === at) { at = at.nextSibling; continue; }
      parent.insertBefore(node, at);
    }
  }

  const scratch = () => document.createElement('template');
  // put `html` into `el`: patched, or replaced under `?render=replace`
  function set(el, html) {
    if (!el) return;
    if (MODE === 'replace') { el.innerHTML = html; return; }
    const t = scratch();
    t.innerHTML = html;
    hold = holdOf();
    try { patchChildren(el, t.content); } finally { hold = null; }
  }
  window.PATCH = { mode: MODE, set, keyOf };
})();
