# MOBILE.md — docs.vote on a phone

A working document like PRODUCTION.md: stages get checked off as they land, decisions are numbered from the project sequence, and the device log at the foot grows. Written 2026-08-23 from the plan Ed commissioned that day; the 2026-08-20 mobile plan lived only in chat and left behind Q419–429, which §4 answers. Rules that come out of this document go into SURFACE.md when built — SURFACE wins where they disagree, the same way it wins over the notes files.

## 0. Context and the decisions already made

Every surface is the `session-view`: three columns — contents rail · document · needs-you rail — and the gesture *whatever the document wants from you goes in the right-hand rail, and everything that wants something is a card*. Every mockup and the one live page were built for a desktop window, and a Newspeak House cohort will read and judge on phones.

**Decisions (Ed, 2026-08-22):**

1. **Scope of the first mobile version: read + judge, and the birth.** Read the document and the constitution; act on every rail card — judgments, founding answers, OKs, applications, sign-out. **The birth is in too** (Ed, 2026-08-23, Q663: *there's no real reason not to support births on mobile — it is just doing three cards, and the mobile experience must be able to let you interact with cards*): 🪶 title, 📍 link, 📧 email, each a 🪶 hold and so each a two-tap on touch. Proposing text (the composer), the founding that follows the birth, and composing motions come later — but the architecture must make each a slot-in, never a re-layout (§1.7).
2. **One responsive `session-view.html`.** No separate mobile page. `cards.js`, `constitution.js` and every SURFACE.md rule stay single-sourced.
3. **PWA · push · offline is a later stage** (§3), sequenced after layout and touch.
4. **Timed holds become a two-tap confirm on touch.** The flight plays *after* the confirm as the announcement, not *during* as the meter. SURFACE §7.2's hold table is asserted by `spec-check`; touch gets its own column there (§1.6).
5. This document lives at `design/MOBILE.md`, with two pointer rows in PRODUCTION.md's stage table (17, 18) and one line in CLAUDE.md's Documents list.
6. Devices that define *works*: **iPhone Safari** and **Pixel-class Android Chrome**. Tablets get whatever the 1240px two-column breakpoint gives them; not a target.
7. Q419–429 each get a recommended answer (§4); Ed accepts or vetoes by number; accepted ones fold into SURFACE.md at build time and leave QUESTIONS.md.
8. The contents rail on a phone is **a drawer behind a topbar button**: the headings with their lifecycle marks (M10 survives), tapping travels.

### What the survey found (2026-08-22, read-only)

- **No `<meta name="viewport">`** in `session-view.html` — iOS renders the page at 980 CSS px, so none of the existing narrow CSS ever fires on a phone.
- **Six dormant `max-width: 900px` rules** in `design/system.css` (:311 two-column at 1240px, :315 one column, :635 `.doc` padding, :658 `.sectoggle` static, :851 `.chipcol` → horizontal row, :1668 `#wires` hidden). A first attempt, partly wrong: the `.chipcol` row breaks `fitStacks` (it measures a vertical gutter) and `fitBand` (which filters neighbouring marks by `|left − left| < 20`, `setup.js:567`); `layoutQueue` (`session.js:870`) writes absolute `top`s from the rail's own rect, and `aside.queue` sits *below* `main` in the DOM, so in one column every entry lands at a large negative offset. `.queue` is `position: relative`, not sticky — `session.js:4224`'s comment is stale.
- **Touch**: `touch-action: none` exists on exactly one element (`.holdmotion`, the 🏛️ button). The 3s propose hold (`session.js:2744`) and the 1s `holdWallet` holds (`session-view.html:6685`) would be scrolled away and `pointercancel`led.
- **Hover-only**: the fold triangle (`system.css:367`), the spend-preview lean (`session.js:4106`), `.queue button:hover`, `.achip:hover`, `.doctitle[data-card]:hover`, and ~66 native `title=` tooltips across the four files. `.walletsay` dismisses on `resize`, which a mobile keyboard opening fires.
- **Editing**: one `contenteditable` host for the whole charter (`session.js:150`); `startDraftFromTyping` (`session.js:2017`) switches on `inputType` and `default: return`s — `insertCompositionText` (Android keyboards' ordinary typing) opens no draft. Out of v1 scope; the seam is §1.7.
- **Fixed pixels**: `--rail-left 210`, `--rail-right 290`, `--nav-h 58`, `.doc` left padding 132px *is* the gutter, `.achip` 34×30 (active 42), `READ_LINE 150`, `BAND_TOP 70`, `BAND_BOT 24`, `QGAP 8`, `.walletsay` 264px, `.wrap` 1440px, `.toc` max-height in `100vh`.
- **Judging is never a hold** — ✓ is a click (SURFACE §9.1). In a read + judge v1 the only hold a phone meets is the founder's 🪶 at `/`.
- **The commit row is 40px by rule** and the sockets 24px by W11 — a 44px target rule collides unless hit area and drawn box may differ (§1.4).
- **Server**: static files by basename from `design/` (`server.ts:1058–1090`); `serveFile` (:1271) sets no `Cache-Control`, ETag or compression; `x-build: <sha>` is already sent on every response (the asset-versioning seed a service worker needs); `/api/*` is `no-store`. No service worker, manifest, VAPID or push anywhere; notifications are email only (`relay()`, `server.ts` ~113). The `?since=` poll already answers *did anything move* content-free.
- **Decision 436's `people` table is adopted but unbuilt** (schema v1: `documents`, `document_log`, `engine_log`, `provisional`, `bridge_state`, `tokens`, `stashes`), so Q428's target does not exist yet.
- **localStorage**: `draft:seen:<slug>:<me>`, `draft:grants:<slug>:<me>` — seat-and-slug scoped, live only.
- **`npm run journey` is not in CI**; the `probe` job serves `design/` statically. Both probes run at 1600×1000 (`scripts/probe.mjs:37`) in a non-touch context, with `matchMedia` stubbed only for reduced motion.

## 1. Layout and touch (read + judge)

### 1.0 The architectural consequence

**Narrow is not a stylesheet, it is a mode.** Four measurement passes (`layoutQueue`, `drawWires`, `fitStacks`, `fitBand`) each need a *named* narrow behaviour rather than being left to misfire. Two of them (`fitStacks`, `fitBand`) keep working unchanged **provided the gutter survives as a vertical column** — so the plan keeps the gutter and deletes the `:851` rule that flattened it, rather than teaching the passes a second geometry. `layoutQueue` cannot be saved by CSS; but pinning is already a JS concern (`.queue` is merely `relative`; `layoutQueue` writes `top`), so the narrow form can be a JS concern too.

### 1.1 The mechanism: two orthogonal flags, one literal each

*How wide is the screen* and *what is the pointer* are different facts (a touch laptop is wide + coarse; a phone with a mouse is narrow + fine).

- **`narrow`** — one media-query literal, `NARROW_Q = '(max-width: 900px)'`, a constant in `session.js` and the same literal in `system.css`; **`spec-check` asserts the two agree** (as it asserts `HOLD_MS` against SURFACE §7.2). Mirrored on the root as `html[data-layout="narrow"|"wide"]` by a three-line inline script at the top of `<body>` (flash-free first paint) plus a `matchMedia` `change` listener. CSS keys on the media query for static layout and on the attribute for anything JS also drives (dock height, drawer state). `SESSION.narrow()` is the predicate the passes read **per call**, never captured (the `REDUCED()` pattern, `session.js:3275`).
- **`coarse`** — `(pointer: coarse)` for hit areas, `(hover: none)` for hover replacements, mirrored as `html[data-pointer]`. But **the hold ladder keys on the press, not the screen**: `ev.pointerType === 'touch'` at `pointerdown` decides hold-vs-two-tap for *that press*. A mouse on a tablet holds; a finger on a touch laptop taps twice.

Why 900: the dormant rules already name it; 290 (rail) + ~640 (70ch prose) + 132 (gutter) does not fit below ~1100 anyway; the 1240 rule already drops the TOC; at 768 (iPad portrait) two columns would leave ~430px of document beside a 290px rail, worse than one column with a dock. ≤900 one column · 901–1240 doc + rail · >1240 three columns. (Q655.)

### 1.2 What each zone becomes at 390px

- **Topbar** — stays sticky, one row. **The sockets are hidden on narrow in v1** (Ed, 2026-08-23, Q656: *no proposing in mobile view so no real need to see sockets*) — a narrow exception to W11 (*every socket shown from the start*) that ends at stage 6, when proposing arrives and the ✏️ wallet is spent from a phone. What stays: 🪶, the title (ellipsis, `.sess` hidden), a ☰ contents control, the **clock and quorum** (the session-clock is the door to ⏰ and *Frozen — n must return* has nowhere else to stand), and `me`. **No pulse on narrow** (Q423, Ed: *no pulse in the mobile app*). `--nav-h` stays 58 and declared; **`BAND_TOP` is measured** anyway (`navEl.offsetHeight + 12`) so a future second row costs nothing.
- **The constitution band** — unchanged in structure (it already shares the charter's gutter geometry, `setup.css:474`; `fitBand` is measured in both axes). Needs only the gutter at a narrower width; the open `.setupcard`'s `margin-left: -14px` and the active tab's 8px outward growth set the gutter's minimum.
- **The charter and the chip gutter** — the gutter survives as a column. Narrow: `.doc` padding-left **56px**, `.chipcol` `margin-right` **8px** (was 14), `.wrap` side padding 8, `.doc` right padding 12, `.doc` border and radius removed (the document *is* the page; a hairline box 8px from the bezel is noise). 390 − 8 − 56 − 12 − 8 = **306px of prose, ~41ch at 15px** (~46ch on 430px phones). **Prose renders at 15px on narrow** (Ed, 2026-08-23, Q660) — a narrow override of `--t-body` on the document column only; the recommendation was 16px (the scale is the scale) and was declined for the extra characters per line. iOS's 16px focus-zoom floor is about *editables*, which stay ≥ 16px regardless (§1.8). The 95vh runway stays (`bringIntoView` needs it).
- **The rail → the dock (Q420; Q657).** A full entry is ~90px; in-flow entries double the document's length and put two objects per clause in a column that affords one, against the surface's own claim that the margin does the work (`suggestion-anchor`). The gutter tab carries everything the *flow* population carries except the teaser — which is one tap away inside the card. What the gutter cannot carry is the **pinned** population: 🔥 following you, an unread ✔✖ owed to you, ✏️ yours, 🌶️ served — M1's four kinds plus the open entry. `aside.queue` becomes `position: fixed; left:0; right:0; bottom: env(safe-area-inset-bottom)` on narrow and `layoutQueue`'s narrow branch lays the pinned set into it. Not a new rule — the existing rules at a limit: M2 (*the rail runs out of room*) with a band the dock's height; M3's exemptions unchanged; M5's *pile against the band edge* where the band edge is the dock. Entries keep their one-line forms (`.unread`/`.yours`/`.deciding` already are; 🔥 keeps its title and drops its teaser as `offclause` already does — M9). Capacity ≤ 40% of the small viewport height, most-urgent-first, the same `keep` loop (`session.js:1014–1024`). Tapping a dock entry → `toggle(id, true)` → `bringIntoView`, as now. In-flow entries stay possible later (the DOM is canonical) but nothing in v1 needs them.
- **The contents rail → a drawer** (decision 8): `nav.toc` `position: fixed; inset: 0 auto 0 0; transform: translateX(-100%)`, opened from ☰, closed by tap-outside / a heading / Escape. M10's marks per heading stay; `max-height` goes to `100dvh`; `markCurrentSection` keeps running.
- **Q419 (DOM order): no `order:` anywhere.** With the TOC a drawer and the queue a dock, both are out of flow on narrow; visual order is nav → document, and the DOM order (toc, main, queue) is already the desktop reading order. What Q419 really asks — has anybody tabbed the desktop? — becomes a stage-0 measurement (§2.1 #10); a fault found there is a desktop fault, fixed in the DOM. Within the document `.chipcol` is the paragraph's first child — the mark before the clause in focus and reading order — which is right and stays.
- **Q421 (fold triangle): always visible under `(hover: none)`, hover-revealed on hover devices; one rule, two renderings** (Q658). The rule (`system.css:364`) is *only there when you reach for it*: on a hover device reaching is hovering, on touch there is no reaching, so the triangle stands. Making it permanent on desktop adds a glyph to every heading to serve a device that is not in the room. `:658`'s `static` rule is deleted — the triangle stays in the gutter in line with the marks.
- **Q425 (lanes): closes as already stacked.** `.propblock + .propblock` stacks with a hairline (`system.css:1126`); the editing card's side-by-side pair was retired (`:1277`); nothing on a card is side by side except the commit row (two controls fit at 320px) and B · I · []. Asserted as no `.sugg` with `scrollWidth > clientWidth` at 360px.
- **Q427 (hairlines): a second named token, not a darker `--border`** (Q659). `--border` #DEE2E6 (~1.3:1) is fine for structural rules the layout already carries. The load-bearing edges — whose *absence* changes meaning: the incumbent's dashed edge in the sealed record, the `.qwhy + .qwhy` divider between quoted proposals, the outline ground of 🗑️ and Refuse (§9.1: outline is their whole look) — get `--border-strong` = `--muted` #6C757D (4.7:1), **its users named in the selector** as `.eyebrow` names its (`system.css:208`). Surface-wide: one edge, one contrast; geometry-neutral (probe-safe) but visibly darker on ~5 desktop edges. Measured in §2.1 #9.

### 1.3 The four passes' narrow behaviour, named

- **`layoutQueue`** — extract the classification (`session.js:874–976`, `anchorForEntry`, pinned/flow) into `classifyEntries()` shared by both layouts; if `SESSION.narrow()`, `layoutQueueNarrow()`: flow entries `display:none`, the same `keep` loop with `room` = dock capacity, kept entries stacked in the dock with `QGAP`, `--dock-h` set on the root (the alpha flag and `bringIntoView` read it), `.offclause` judged against `[navH, innerHeight − dockH]` so M9 holds unchanged.
- **`drawWires`** — if narrow, clear the SVG and return (`:1668` stays as belt-and-braces). A wire from a dock to a clause anywhere on the page says nothing.
- **`fitStacks`** / **`fitBand`** — unchanged, because the gutter stays a column. `fitStacks`'s `(avail − 30)` assumes the 30px chip, so the chip's *visual* size never changes on coarse pointers — hit areas grow by pseudo-element (§1.4).
- **`bringIntoView` / `readLine()`** — `READ_LINE` becomes mode-dependent: wide 150, narrow `navH + 32`; the *already comfortable* window `[100, 300]` becomes `[navH + 8, innerHeight − dockH − 120]`. `readLine()` is already exported (`session.js:123`) so setup's `scrollToCard` follows for free.
- **`onViewportChange`** — also subscribed to `visualViewport` `resize`/`scroll` (§1.8).

### 1.4 Tap targets without moving any geometry (Q662)

The chip is 34×30 and `fitStacks` and the probe depend on it; the commit row is 40px by rule; the sockets 24px by W11. **Hit areas grow with a `::before` pseudo (`inset: -7px -5px`) under `(pointer: coarse)`** on `.achip` (front tab only; `.behind` is already `pointer-events: none`), the sockets and `me`, `.sealdot`, `.sectoggle`, `.lanepick` and labels, `.clock`; `.toc a` takes `min-height: 44px` (a drawer list can grow); commit-row buttons `min-height: 44px` on coarse. `.achip` needs `position: relative` — the pseudo inherits the card's `clip-path` like the tab does, so it is safe. Pseudo hit areas are invisible to `getBoundingClientRect`, hence §2.1 #3 measures by `elementFromPoint`.

### 1.5 `touch-action`, callouts, highlights, sticky hover, tooltips

- `touch-action: manipulation` on every control (kills the 300ms delay and double-tap zoom while keeping pinch-zoom; no `user-scalable=no`). `-webkit-tap-highlight-color: transparent` on the same set — depth is this surface's press feedback and the grey flash competes with it. `-webkit-touch-callout: none` + `user-select: none` on chips, entries, sockets, the commit row; **the prose keeps selection** — in read + judge it is reading text.
- **On coarse pointers the charter's `contenteditable` is off** — set by `bindData`/`renderDoc`, not CSS — so a tap places no caret and raises no `beforeinput`; the `MAY_PROPOSE()` refusal (`session.js:4298`) is the fallback. This is the seam for Q424 (§1.7).
- **Every `:hover` rule that changes geometry or visibility is wrapped in `@media (hover: hover)`** (~25 rules) — iOS makes `:hover` sticky after a tap. Desktop-invisible by construction.
- **Spend-preview lean** becomes the *armed* state of the two-tap: the first tap leans the token (`startLean`), the second flies it — the same sentence the preview says on desktop, said at the only moment touch can say it; `addSpendProbe`'s gating means an unaffordable commit previews nothing.
- `.doctitle[data-card]`'s dotted underline is permanent under `(hover: none)` — the only hint the title opens a card.
- **`title` tooltips → the `say` bubble.** The sockets already solved it (`.walletsay`, `SAY(el)` falling back to `el.title`, `session-view.html:6395`). Generalise in one place: under coarse pointers a **long-press (450ms, `contextmenu` suppressed) on any element with a `title`** shows the bubble via the existing `showSay` clamping. **No markup changes** — the title stays in the HTML, so every card's `outerHTML` stays byte-identical for the session-probe (a `data-say` attribute would force a re-freeze for nothing). A long-press on a control shows and does not activate (the `penHoldFired` flag pattern swallows the click); on prose it is left to the browser. `showSay`/`hideSay`/`SAY` move out of the wallet block into a `say` helper on `SESSION`.

### 1.6 The two-tap confirm as one helper (decision 4; Q661)

Three hold sites today, each owning its own `pointerdown` → timer → fire body: the charter ✏️ (`session.js:2744`), `holdWallet`'s family (`session-view.html:6682–6818`, 🪶 ✒️ 🍾 1000ms, motion ✏️ 3000ms), the assembly (`:5071`, 10000ms). The fire bodies are the valuable part and are already id-resolving. Extract each into a named `fire()` and route the *gesture* through **`SESSION.press(ev, spec)`**, `spec = { ms, floorAt, fire, flight: {start, stop, nudgeHome}, arm: {lean, unlean}, key }`:

- `pointerType !== 'touch'` → the hold exactly as now; W16 untouched; `spec-check`'s release-set assertion keeps passing because the release binding stays where it is.
- `pointerType === 'touch'` → **arm**: the control takes `.armed`, its label becomes the confirm phrase (*Tap again to propose* / *…to ask everyone* / *…to begin* — one string per glyph, STYLE.md-audited), the token leans, and **the armed state lives in module state keyed by `spec.key` (card id or setting key, never the node)** with a 6s timeout. A second tap on the re-found live control calls `fire()` immediately, then plays the flight **as announcement over `REFUND_MS` 640** — already the surface's length for *an object arriving*; W13 is satisfied by construction because the act has landed. Tap elsewhere / Escape / timeout disarms (token home via the quarter floor, label restored).
- **Both polls defer while armed** (`SESSION.holding || SESSION.armed`), and the armed state is re-applied at the tail of every render like `walletGhost` — W9 applied to a state.
- The assembly on touch: the ring convenes *after* the second tap, seats staggered over ~1s; `RADIUS` clamped to `min(innerWidth, innerHeight)/2 − 40`.

SURFACE §7.2's holds table gains an **on touch** column (*two taps; the flight announces* on every hold row, *—* on OK) plus an exception row in §3, and `spec-check` asserts exactly three sites call `SESSION.press`. **In v1 the holds a phone meets are the birth's three 🪶 commits at `/`** — judging is a click — and the birth is supported in full (Q663), so the two-tap gesture has three live exercises and `mobile-walk` births from the phone context.

### 1.7 Extensibility seams (build now, use later)

- `SESSION.narrow()` / `coarse()` and the root attributes — composer, founding, motions read them rather than re-deriving.
- `classifyEntries()` split from `layoutQueue` — any later in-flow entry rendering reuses the classification and comparator; `layoutQueueNarrow` is the only place that knows about the dock.
- `readLine()` / `bandRect()` as functions — the keyboard later shrinks the band; the composer's `bringIntoView` needs the caret's card above the keyboard.
- `SESSION.press` at all three sites now — the composer, founding and motions add **no gesture code** later.
- The prose's `contenteditable` gated per pointer — **the Q424 seam**: on coarse the way into a draft is not the caret but a door the card already has (`propose-edit` ✏️ on a lane opens the editing card, whose `.editlane` is a real editor where IME composition works natively). The later stage adds a touch door on a clause (long-press → editing card via `caretRangeFromPoint`) and suspends the lane's keystroke re-render between `compositionstart`/`compositionend` (K23's rewrite-per-keystroke is what breaks `insertCompositionText`). Nothing in v1 is re-laid for it.
- The `say` helper — the founding's many titles and the motion cards' route tooltips ride it unchanged.
- `--dock-h` — keyboard handling and PWA chrome read it.

### 1.8 Virtual keyboard, safe area, `dvh`, iOS, the fixed chrome

- **Meta**: `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content`. No `maximum-scale`.
- `100vh` → `100dvh` at `system.css:327` (the `vh` line kept as fallback). The `.doc` 95vh runway stays `vh` deliberately.
- Safe area: the dock's `bottom`/`padding-bottom` use `env(safe-area-inset-bottom)`; the navbar's `padding-top` uses the top inset (standalone mode only; costs nothing now).
- Keyboard: `onViewportChange` subscribes to `visualViewport`; while an editable is focused (`focusin` on `[contenteditable=true], input, textarea`) the dock hides (`html[data-kbd]`) and returns on `focusout` — on iOS the layout viewport does not shrink and a fixed dock would float over the keyboard. In v1 the only editables are the 🥂 comment and the identity cards; the rule is general.
- `.walletsay` dismisses on **width** change only, and on `visualViewport` scroll (the bubble is fixed and would drift as iOS pans).
- iOS: every editable ≥ 16px (`.edit-why` is 13px — on coarse it takes `--t-body`, else iOS zooms on focus and the card's geometry lies); `-webkit-text-size-adjust: 100%` on `html`; `overscroll-behavior: contain` on drawer and dock.
- `.alphaflag` on narrow → `bottom: calc(var(--dock-h, 0px) + env(safe-area-inset-bottom) + 8px)`, still `pointer-events: none`. `.devswitch` (dev only, hidden live) → top-right under the nav.

### 1.9 The dormant rules and the contamination guard

**Replace, not extend.** `:311` (1240) stays. `:315` rewritten (one column; `.queue` fixed dock; `.toc` drawer — and its `display: flex` line, which would *un-hide* the TOC above the document, goes). `:635` rewritten (gutter 56, no border). `:658` deleted. `:851` deleted (the rule that breaks both fitting passes). `:1668` kept plus the JS early return.

**Desktop-invisible by construction**: anything inside `(max-width: 900px)`, `(pointer: coarse)`, `(hover: none)`, or gated on `SESSION.narrow()`/`coarse()`/`pointerType === 'touch'`. The probes run at 1600×1000 with a fine pointer and hover; `matchMedia` is stubbed only for reduced motion (`session-probe.js:33`), so `NARROW_Q` reports false.

**Needs a probe re-run (re-freeze only if card HTML intentionally changes)**: the `readLine()`/`classifyEntries()`/`press` refactors in `session.js`; the `holdWallet`/assembly extraction in `session-view.html` (setup-probe, 42 steps, no allowances); `--border-strong` (geometry-neutral but the sheet is frozen); the viewport meta. `npm run journey` after every stage that touches a hold.

**A second guard for narrow**: parametrise `scripts/probe.mjs`'s viewport from argv; after stage 1 record `design/reference/session-baseline-narrow.json` (390×844, `hasTouch`). It cannot compare against the frozen reference (the reference at 390 is the broken page); it compares against its own last freeze and checks the same invariants: chip travel 0.0px on open, clause-text travel 0.0px, `fitBand` 0px both axes, no negative `.qitem` tops, no horizontal overflow.

## 2. Verification

### 2.1 `scripts/mobile-walk.mjs` (`npm run mobile-walk`)

A sibling of `journey-walk.mjs` against a running dev server with the outbox; non-zero on any failed assertion, any `pageerror`, any 4xx/5xx on `/api/` (journey's refusal net, verbatim). One `chromium.launch()`, two contexts:

- **Desktop context** (1600×1100, no touch) plays the founder: birth → founding → 🪪 invite one address → 🍾 → propose one text edit with the held ✏️ (exactly as journey does). This produces the one thing a judging walk needs that journey never has: a race whose candidate is *not the judge's own*.
- **Mobile context** (`devices['iPhone 13']`, then `devices['Pixel 7']` — viewport, DPR, `isMobile`, `hasTouch`, UA) plays the member: reads the invitation from `/api/dev/outbox`, follows the link, lands on `/d/:slug`, OKs 💡/⚖️ with `page.tap`, opens the 🔥 entry, taps a lane, taps ✓; the walk watches the wire for `judge-race`.

**Shared helpers** (Q664): lift journey's `press`, `open`, `clickIn`, `typeIn`, the birth block and the founding loop into `scripts/walk-lib.mjs`; journey imports them, its assertions and docstring untouched. Otherwise the two walks fork 120 lines and drift (the reference-copy failure mode CLAUDE.md already records).

**Assertions** — each a `page.evaluate` measurement, reported `label · value` per device, run at load and again after every card the walk opens (a card open is where overflow appears: the tab strip hangs at `right: 100%` outside the card box):

1. Viewport meta present and honoured: `innerWidth === viewport.width`, `visualViewport.scale === 1`.
2. No horizontal overflow: `scrollWidth <= innerWidth`, **and per visible element** `rect.right <= innerWidth + 0.5 && rect.left >= -0.5` — catches a strip or `.chipcol` transformed off-screen without widening the page. First five offenders by selector path.
3. Every interactive target ≥ 44×44, **measured as hit area, not box**: probe `elementFromPoint` at centre ± 22px on both axes, each probe must resolve to the target or a descendant. Candidates: `button, a[href], input, textarea, [role=button], .lanepick, .achip, .qitem, .sectoggle, .toc a, .commitrow .btn`. Disabled controls exempt; the 24px sockets are **not** (they are pressable — `walletsay`).
4. The dock holds only pinned entries, each resolvable to a clause; flow entries are absent; **the DOM is identical between wide and narrow** (the DOM is canonical — Q419's premise — so CSS placement is the only thing that changes).
5. A judgment commits at the wire: the POST carrying `judge-race` is 2xx; afterwards the 🔥 entry is gone and a ⏳ tab present (Q576). Page state is not trusted, for the reason journey distrusts it for `propose-text`.
6. Two-tap confirm needs exactly two taps (on 🪶 Title in the mobile context — the only hold a read+judge walk meets): one tap → no POST, a confirming state visible, **and the state survives a 4.5s wait across a poll**; second tap → exactly one 2xx POST; tap-then-tap-elsewhere → no POST, state cleared; three rapid taps → still one POST (the 2026-08-22 double-fire class, caught at the wire).
7. Nothing is hover-gated: precondition `matchMedia('(hover: none)').matches`; for every element a `:hover` rule reveals (today `.sectoggle` via `.toc li:hover`, `.filedpile:not(.open):hover .achip`, `.navbar .me:hover .face`), computed `opacity >= 1` and `visibility: visible` **at rest**. Q421 by measurement.
8. The poll lives: two `view?since=` responses ≥ 4s apart in the mobile context; one `SESSION.beat()` observed after the desktop context acts (wrap `window.SESSION.beat` as a spy).
9. Hairline contrast (Q427): contrast ratio of `borderColor` against effective background for `.sealed .incumbent` and the other `--border-strong` users ≥ 3:1. A colour assertion no probe can make (probes hash outerHTML and measure rects).
10. Desktop focus order (Q419): tab through until it cycles; assert the `activeElement` sequence is in DOM order.

End line per device: `iPhone 13 · overflow 0 · targets 0 small · dock ok · judge-race 200 · two-tap 1 post · hover-gated 0 · errors none · refused none`.

### 2.2 CI (Q665, Q666)

Nothing in CI runs a live walk today. A third job **`walks`** beside `probe`: `npm ci`, the Playwright cache step copied from `probe`, `npm run build`, boot the **dev** path (`npm run server` via tsx — the prod artifact has no outbox, decision 437) with `DRAFT_DATA_DIR=$RUNNER_TEMP/data PORT=8199`, wait on `/healthz`, then `npm run journey` and `npm run mobile-walk`. `continue-on-error: true` for its first week as `probe` was, then gating. This puts journey in CI for the first time. Chromium-only first — Playwright's iPhone descriptors emulate viewport/DPR/touch/UA under Chromium but not WebKit's engine; WebKit joins the matrix once green.

### 2.3 What headless cannot see

Anything rAF-driven (flights, washes, the lift — only the two-tap's *state* is asserted); real IME behaviour (Q424, out of scope); iOS Safari's dynamic toolbar vs `100vh`; safe-area insets (`env()` resolves to 0 in Playwright — read the stylesheet rule, not the computed value); scroll-bounce on a sticky topbar; the 300ms tap delay (gone with the viewport meta, provable only on a device); install prompts; Google Fonts on a slow radio. These are the device checklist's (§6).

### 2.4 Proving the desktop did not change

No new instruments. Every narrow rule lives under `(max-width: 900px)`, `(hover: none)` or `(pointer: coarse)`; both probes run at 1600×1000 with a mouse, where **not one of them applies** — `npm run probe -- --strict` IDENTICAL (43 cards 0.0px; 42 steps 0 diffs) is the proof and fails loudly if a mobile rule leaks out of its media query. The probes record `.qitem` rects, so any DOM re-parenting of rail entries would show — hence **the narrow form is CSS-and-JS-branch only, the DOM stays canonical**. `npm run founding-golden` keeps the founder's order and sentences; `npm run journey` keeps the 3s held ✏️ on a mouse — the assertion that two-tap is the touch branch only. Re-freeze `design/reference/` only for an *intentional* desktop change (`--border-strong`), noted in the commit.

## 3. Stage 5 — PWA · push · offline (sequenced)

Order: caching before a service worker (a SW over unversioned assets is the stale-shell trap on a deploy-on-push server); manifest before push (iOS needs the home-screen install for notifications); push last — it is the only step that touches the schema.

### 3.a Cache-Control, ETag, compression, versioning (prerequisite; Q667)

In `serveFile` (`server.ts` ~1271): `ETag: W/"<buildSha>:<size>"` (dev: mtime), 304 on `If-None-Match`. HTML `no-cache` (always revalidate — `/d/:slug` must never serve a stale shell silently); assets `no-cache` unless the request carries `?v=<sha>` equal to `cfg.buildSha`, then `immutable`. `session-view.html` gets a tiny serve-time rewrite appending `?v=<sha>` to its relative `<link>/<script>` references (no asset pipeline exists; hashed filenames arrive with one — PRODUCTION stage 8). gzip/brotli for text and JS/JSON/manifest with `Vary: Accept-Encoding` — the page alone is ~6900 lines, the single biggest win of the stage. `scripts/verify-deploy.mjs` gains: `/` is `no-cache` + ETag + 304s; `/system.css?v=<x-build>` is `immutable`; `/api/d/…/view` still `no-store`.

### 3.b Manifest and icons — Q426: one icon art, a manifest per document (Q669)

The server is stateless per document (one cookie per document, no *my documents* surface, `/` is the birth), so an app with `start_url: /` opens a blank birth for a member of three documents. Serve the manifest **per document** at `/d/:slug/manifest.webmanifest` (`name` = the title, `id`/`start_url` = `/d/:slug`, `scope: /`, `display: standalone`), one shared icon — the quill, already the logo (SURFACE §7). Installing from a document gives a home-screen entry named for it. No manifest link at `/`. Add `.webmanifest` to the asset whitelist (`server.ts` ~1058) and `MIME`. Icons: `icon-192/512.png`, a maskable variant, `apple-touch-icon.png` 180.

### 3.c Service worker — a read-only offline shell (Q429; the blind-projection hazard; Q668)

`design/sw.js` at `/sw.js` (root scope covers every `/d/:slug`); the server rewrites a `__BUILD__` token with the sha so every deploy changes its bytes. Precache = the shell only (the page HTML, `system.css`, `setup.css`, `cards.js`, `setup.js`, `session.js`, `constitution.js`, manifest, icons — all `?v=<sha>`); Google Fonts not precached, the shell must read on system fonts offline. **Never cache `/api/*`** — the page keeps its own last-good view in IndexedDB under `view:<slug>:<me>` (same key grammar as the two localStorage keys), stamped with the `receivedAtMs` the live path already records.

**The hazard as a rule**: a cached view is a frozen blind projection — every race card a question that may no longer exist, every count as-of-then, and a judgment on it is the E16 ground-shift case with nobody there to re-serve the pair. So offline is **read-only by construction**: `mayJudge()`/`mayPropose()` — the only things a control may ask (W4) — return false while `S.offline`, which hides every ask the way an unacknowledged ⚖️ already does. The clock line (the slot that carries *Frozen — n must return*) says *Offline — as of HH:MM*. `api.refresh`'s catch sets `S.offline`; the first successful poll clears it. Nothing provisional is discarded on reconnect.

**Deploy safety**: no `skipWaiting`, no `clients.claim`. The page compares the `x-build` header on each view response with its own build; on mismatch it reloads at the next quiet moment — the poll's own guard (no open card, no hold, nothing provisional).

**Q429: no budget** (Ed, 2026-08-23) — the shell is cached whole; revisit if it gets slow. The recommendation (1 MB / 250 KB enforced in `spec-check`) was declined. Current estimate ~600–800 KB uncompressed.

### 3.d Web push — Q428 and the channel (Q670–673)

- **Keys**: `DRAFT_VAPID_PUBLIC/PRIVATE/SUBJECT` in `config.ts` and `render.yaml`; optional — absent means push off, like a missing `RESEND_API_KEY`; `/healthz` reports `push: on|off`; `GET /api/push/key` public.
- **Sending**: the **`web-push` package** (Ed, 2026-08-23, Q670) — the server's second runtime dependency after `pg`, spent in `packages/server/src/push.ts` alone. The hand-rolled alternative (~150 lines on `node:crypto`, RFC 8291's vector as the test) was offered and declined.
- **Storage**: **never the hash-chained log** — a subscription is deletable per-device state. The `people` table (decision 436) is adopted but unbuilt, so Q428's target does not exist yet. New table `push_subscriptions (endpoint PK, document_id, member_id, person_id NULL, p256dh, auth, ua, created_ms, last_ok_ms)` in migration v2, `person_id` nullable to join `people` later without a second migration; the file store mirrors it as `push.jsonl`. `Persistence` gains put/delete/list/deleteFor — four methods, both stores, covered by the server walk that already runs over both (`DRAFT_TEST_STORE=pg`). Routes `POST`/`DELETE /api/d/:slug/push` (seat required, rate-limited). A 404/410 from the push service deletes the row. Removing a member or erasing a person deletes their rows — the first deletable per-person state in the system, a rehearsal for stage 12 (Q673).
- **What push carries** (Ed, 2026-08-23, Q672: **asks only**): SURFACE §2's channel column gains `push`. **C17: push carries asks — things with a ✓, an answer or a draft — never owed OKs and never standings** (§3.5) — payload `{slug, title, kind}`, the body is the rail entry's own sentence. Rows gaining `push`: E1 (a founding question), E10 (a constitutional motion), E12 (a 👑 question), E13 (a race wants a judgment — served, so the router decides who), E17 (a deadlock wants a draft), E21 (an admit race), E24 (the close — its OK is a signature, an answer). **Not pushed**: the owed OKs — E4, E5/E7, E14, E15 — which wait until the page is opened; E22 lapse (reaching the absent is mail's job), E23 freeze, E25/E26 and invitations (the magic link is the login; a push cannot carry a seat). **E27 never**: off the page the beat *rate* becomes legible as activity — the leak the dot avoids by being where you already are. Coalesced on the server's minute tick: one notification per member per document per tick, *"<title>: n things want you"* (n = your rail length, never standings). Hook: `relay()` (`server.ts` ~113) as a second queue beside mail; engine-log events (E13/E14/E17) need the same relay over the bridge's fresh entries. (Q672.)
- **Opt-in**: a 🔔 *Notifications* rail task after ⚖️'s OK — grant-shaped (news entry, OK → `requestPermission` → subscribe → POST), persisted per document and seat like `ACK_KEYS`. A new card kind for SURFACE §9 (Q671).
- **SW handlers**: `push` → `showNotification` with `tag: slug` so repeats collapse; `notificationclick` → focus an existing `/d/:slug` client or open one.

### 3.e Q422 — judging offline: no

No queued judgment, ever: a judgment against a pair the room has moved past is a judgment on a question that no longer exists, and the server already treats that as a ground shift (E16 ↻). One free softening: the unsent radio position survives the outage in memory (closing is not discarding) and, if on reconnect the **same pair** is still served (same candidate ids, same `textVersion`), the radio is restored and ✓ goes live; otherwise discarded silently with the ↻ receipt saying why. The member presses ✓. Nothing sends on their behalf.

### 3.f Q423 — no pulse on narrow

**Ed, 2026-08-23: *no pulse in the mobile app*.** The dot does not render under `NARROW_Q`, so the third-state question does not arise there. What survives of the recommendation is the offline *word*: while `S.offline` the clock line carries *Offline — as of HH:MM* (§3.c), and on `visibilitychange` → visible the page treats itself stale until the first poll answers. On wide the dot is unchanged.

## 4. Q419–429, answered (Ed, 2026-08-23 — by number through Q655–673, and directly for 422/423/429)

- **419** No `order:` anywhere; the DOM is canonical and the desktop pass tabs the page and asserts DOM order (§2.1 #10). A fault found is a desktop fault, fixed in the DOM.
- **420** **Marks in the gutter + the pinned population in a bottom dock** (§1.2) — *reverses* the 2026-08-20 tentative answer (in-flow entries). Asserted by §2.1 #4.
- **421** Always visible under `(hover: none)`, hover-revealed on hover devices — one rule, two renderings (§1.2). Alternative: visible everywhere, with a desktop re-freeze.
- **422** No queued judging; restore-if-same-pair softening (§3.e).
- **423** **No pulse on narrow** (§3.f); the offline word stays on the clock line.
- **424** Stays open, deferred: v1 is read + judge; touch drafting is stage 6 (§1.7 is the seam).
- **425** Closes as already stacked — nothing on a card is side by side; asserted as no `.sugg` overflow at 360px.
- **426** One icon art, a manifest per document, many installs (§3.b).
- **427** A second named token `--border-strong` (= `--muted`, 4.7:1) for the ~5 load-bearing edges, users named in the selector; surface-wide (§1.2); measured in §2.1 #9 since no probe sees colour; needs a human look at the desktop.
- **428** `push_subscriptions`, own table, nullable `person_id`, both stores, never the log (§3.d).
- **429** **No budget** (§3.c).

## 5. Decisions 655–673 — all answered by Ed, 2026-08-23

**As recommended**: 655, 657, 658, 659, 661, 662, 664, 665, 666, 667, 668, 669, 671, 673. **Otherwise**: **656** — *no proposing in mobile view so no real need to see sockets*: the sockets are hidden on narrow in v1 and the topbar stays one row (§1.2); **660** — 15px prose on narrow; **663** — the birth is **supported** on a phone, not merely reachable (§0 decision 1); **670** — the `web-push` package, not hand-rolled; **672** — push carries **asks only**, never owed OKs (§3.d). The text below is as put to him.

**Layout and touch**
- **655** Breakpoint 900 (the number the dormant rules already name); two columns 901–1240; three above. Alternative 768 for iPad portrait — not recommended (~430px document beside a 290 rail).
- **656** Topbar on narrow: sockets and room line on a second row inside the sticky nav (~84px), `BAND_TOP` measured. Alternative: one row, room line behind a tap on the pulse. W11 says every socket is shown from the start, and a phone is where a new member most often meets them.
- **657** Q420 reversed: marks in the gutter + a pinned dock, not in-flow entries (§1.2). Needs a yes because it reverses the earlier tentative answer.
- **658** Q421: triangle visible on touch, hover-revealed on desktop — one rule. Alternative: visible everywhere.
- **659** Q427: `--border-strong` surface-wide (~5 desktop edges visibly darker — needs Ed's eye). Alternative: narrow-only override.
- **660** Prose stays 16px on narrow (~38ch at 390). Alternative 15px for ~41ch — not recommended (iOS focus-zoom floor; the scale is the scale).
- **661** Where two-tap is written down: an **on touch** column in SURFACE §7.2 plus an exception row in §3 (*on a coarse pointer the hold is a tap and a confirming tap; the flight announces*), the armed state in module state (W9 applied to a state) — rather than weakening any W-rule. Armed phrase *Tap again to …* per glyph, 6s disarm, 640ms announcement.
- **662** 40px commit row and 24px sockets vs 44px targets: drawn box unchanged, hit area by pseudo-element under `(pointer: coarse)`, measured by `elementFromPoint`. Alternative: a 44px row on touch — changes an asserted rule.
- **663** The birth on a phone in v1: reachable and unsupported (no block, no banner) so two-tap has one live exercise on 🪶. Alternative: block `/` on touch.

**Verification**
- **664** `scripts/walk-lib.mjs` extracted from journey so mobile-walk does not fork 120 lines. Yes.
- **665** A `walks` CI job running journey (for the first time in CI) and mobile-walk; advisory a week, then gating. Yes; ~2 min.
- **666** WebKit in the CI matrix — Chromium first, WebKit once green.

**PWA · push · offline (stage 5)**
- **667** `?v=<sha>` rewrite now vs waiting for an asset pipeline. Rewrite; ~15 lines, reversible.
- **668** SW update policy: silent reload-when-quiet on `x-build` mismatch (the poll's own guard) vs a visible *new version* prompt.
- **669** Per-document manifest, one icon art, vs one app at `/` (needs a *your documents* surface the stateless server cannot produce).
- **670** Hand-rolled VAPID/`aes128gcm` in `push.ts` (zero external deps kept; RFC 8291 vector as the test) vs the `web-push` dependency.
- **671** The 🔔 opt-in card (grant-shaped, after ⚖️'s OK, persisted like `ACK_KEYS`) vs asking on first visit.
- **672** Push rows in the event matrix and C17 (*push carries asks and owed OKs, never standings*; E27 never pushes) — amends SURFACE.md; `spec-check` then asserts the channel vocabulary.
- **673** `push_subscriptions` now, nullable `person_id`, vs building `people` (decision 436) first. Now — the first deletable per-person state, a rehearsal for stage 12.

## 6. Stages

| # | Stage | What it makes measurable |
|---|---|---|
| 0 | ☐ **Measure the breakage** — `mobile-walk` stage-0 form against the fixtures (iPhone 13 descriptor): overflow, negative `.qitem` tops, sub-44 targets, triangle opacity 0, `.doc` padding-left, `#wires` visibility; the desktop Tab-order audit (Q419); the probe viewport parametrisation. No product change. | All of it fails today — the baseline. |
| 1 | ☐ **The mode and the one-column layout** — viewport meta; `NARROW_Q` + CSS literal + `spec-check`; root-attribute boot script; the six rules replaced; `classifyEntries`/`layoutQueueNarrow`/dock; `drawWires` return; `readLine()`/`bandRect()`; measured `BAND_TOP`; TOC drawer; topbar second row; `--border-strong`; `.walletsay` width-only. | Stage 0 green on overflow/tops/padding/wires; at 390 chip travel and clause-text travel 0.0px on open; `fitBand` 0px both axes on the founding fixture; no `.sugg` overflow at 360; dock ≤ capacity in urgency order. Desktop: probes 0 deltas, journey green. |
| 2 | ☐ **Touch** — hit-area pseudos; `touch-action`/highlight/callout; the `(hover: hover)` sweep; triangle under `(hover: none)`; permanent title underline; `say` long-press; `contenteditable` gating; `SESSION.press` at the three sites, polls deferring on armed, SURFACE §7.2 column, `spec-check` three-sites assertion. | §2.1 #3, #6, #7; a `hasTouch` journey variant taps 🪶 twice and asserts at the wire; one tap + 7s asserts no request; long-press on a chip shows the bubble and opens no card. |
| 3 | ☐ **Keyboard, safe area, dvh, fixed chrome** (§1.8). | Focusing the 🥂 lane sets `html[data-kbd]` and hides the dock, restored on blur; the dock's `bottom` rule names the safe-area term; `.toc`'s rule names `dvh`. |
| 4 | ☐ **Live walk, freeze and fold** — the full §2.1 mobile-walk on the live path; the `walks` CI job; narrow baseline recorded; `design/reference/` re-frozen under a new tag; QUESTIONS.md closes 419/420/421/425/427; SURFACE.md gains the narrow rules (an M-rule: *on one column the rail is the dock — the pinned population, nothing else*; the holds table's touch column; §6's note that the teaser is in the card on narrow); CLAUDE.md glossary lines for `narrow`/`coarse`/`press`/`say`/`dock`; the device checklist run on a real iPhone and Pixel and logged. | CI green with `walks`; device log rows for both devices. |
| 5 | ☐ **PWA · push · offline** (§3, in its own order a–d). | `verify-deploy` caching checks; `spec-check` budget; push end to end on a real device, logged. |
| 6 | ☐ **Composer, founding and motions on touch** (Q424) — doors and IME handling on the §1.7 seams; no layout. | A `hasTouch` journey walking propose → judge → motion. |

## 7. Device checklist

Run on a real device, against a build named by its `x-build` from `/healthz`; one log row per item per device.

1. Viewport honoured: no zoom-out on load; pinch-zoom still works.
2. No horizontal scroll at rest and with every card kind open.
3. Every control hits at a finger's width; the chip pile's front tab opens on the first tap.
4. The dock holds the pinned entries and nothing else; tapping one travels to its clause.
5. A judgment: lane tap → ✓ → the entry leaves and the ⏳ tab appears.
6. Two-tap on 🪶: first tap arms and says so; second commits; the feather flies after.
7. The fold triangle is visible without hovering; tapping folds.
8. Long-press on a chip or socket shows its bubble; nothing opens.
9. iOS toolbar collapse does not hide the topbar; the sticky nav does not jitter on scroll.
10. Keyboard open (the 🥂 comment): the dock hides; the page does not zoom; the card's geometry holds.
11. Safe area: the dock clears the home indicator.
12. Tap on a clause puts no caret and opens nothing (v1); selection of prose still works.
13. Rotation: the layout re-fits; `.walletsay` does not vanish on the keyboard.
14. Add to Home Screen (stage 5): the entry is named for the document; it opens at `/d/:slug`.

## 8. Device log

| date | device · OS · browser | x-build | item | result | by |
|---|---|---|---|---|---|
| — | — | — | — | — | — |
