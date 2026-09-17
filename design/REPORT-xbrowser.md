# The walks under three engines — 2026-09-17

A reading, taken three days before the first live test (Sunday 2026-09-20). It
**changes nothing on the page**: every page defect below is a finding, not a
fix. The only files it touched are the five harness files that carry the new
`--browser=` seam, and one of those carries a harness fix that is itself a
finding (finding 1).

- HEAD: `c6b8cfab557eb53218896be6cf1eabe36fa5af46`
- Engines, as `browser.version()` reports them:
  - **chromium 151.0.7922.34** — `HeadlessChrome/151.0.7922.34`
  - **webkit 26.5** — UA `Version/26.5 Safari/605.1.15`, Playwright's WebKit
    build **on Windows**
  - **firefox 153.0** — `rv:153.0`, well above the 136 floor
    `design/REPORT-sunday-readiness.md` §5 worries about

**Precedence.** SURFACE.md and SPEC.md are the rules; this is an observation of
what three engines do with the tree at one commit, and it states no rule. Where
it and a rule file disagree the rule file wins, and the disagreement is a
finding for Ed. Nothing here is a ruling and nothing here was folded anywhere.

## The seam

`browserFor(argv, env)` in `scripts/lib/walk.mjs:43` reads `--browser=` then
`DRAFT_BROWSER`, defaults to chromium and answers the Playwright launcher; an
engine that is not one of the three is refused rather than silently run as
chromium. `scripts/journey-walk.mjs:111` and `design/tools/drawer-walk.mjs:87`
import it. `design/tools/card-audit.mjs:63` and `design/tools/a11y-audit.mjs:67`
keep their own `arg` helper and read `--browser` through it, as those two files
do everything else.

**The chromium default is unchanged.** `node design/tools/card-audit.mjs
--walk=charter` before and after the whole edit produces JSON identical in every
field but `meta.seconds`, which is the run's own wall clock. A non-chromium run
adds `meta.browser` and `meta.browserVersion` and names the engine on the header
line; a chromium run adds and says nothing.

## Walk × engine

Wall clock in seconds; the engines ran with other runs in flight beside them, so
treat the times as within ±20%.

| Walk | chromium | webkit | firefox |
|---|---|---|---|
| `card-audit` (1600×1000, all 7 walks) | **pass** 175s · 263 cards · 10 findings · 0 errors | **pass** 177s · 263 · 10 · 0 | **pass** 181s · 263 · 10 · 0 |
| `card-audit:narrow` (390×844) | **pass** 169s · 263 · 10 · 0 | **pass** 175s · 263 · 10 · 0 | **pass** 181s · 263 · 10 · 0 |
| `drawer-walk` (390×844, touch) | **pass** 4s | **pass** 4s | **pass** 6s |
| `journey` (live server, 8175) | **pass** 296s · 0 FAIL | **pass** 299s · 0 FAIL | **FAIL** 209s · 6 FAIL (finding 2) |
| `a11y-audit` (1600×1000) | see *a11y* below | see below | see below |

The card-audit rows are the numbers **after** finding 1's harness fix. Before
it, webkit measured 251 cards and reported **no error**.

`journey` ran against a server this pass booted itself: `PORT=8175
DRAFT_DATA_DIR=<scratch>/xb-data DRAFT_COOLDOWN_MS=0
DRAFT_BUILD_SHA=$(git rev-parse HEAD) npm run server`, driven with
`DRAFT_BASE_URL=http://localhost:8175`. **`127.0.0.1` is not a synonym here**:
the server's own `baseUrl` defaults to `http://localhost:8175`, so a magic link
arrives on `localhost` and a walk pointed at `127.0.0.1` sends its commands to
an origin holding no cookie — every seat after the founder answers *log in
first*, on all three engines. An environment note, not a finding.

Payloads (scratchpad, not in the tree):
`C:/Users/edsap/AppData/Local/Temp/claude/C--users-edsap-dev-draft/d40d775f-4976-4994-9e93-fc47a0fb57d9/scratchpad/xb/`
— `<engine>-{wide,narrow}.json`, `journey-<engine>.log`, `drawer-<engine>.log`,
`a11y-<engine>.{json,log}`, `shots/`.

## Findings

**1 · WebKit has no `datetime-local`, and the card audit lost twelve cards to it
in silence.** *(webkit · `card-audit`, all three founding walks · the walk's,
and fixed here.)* In Playwright's WebKit an `<input type="datetime-local">`
reports `type === "text"`: no picker, `valueAsNumber` null, the string value
kept verbatim. Chromium and Firefox both report `datetime-local`. The audit's
field filler tested `inp.type`, so on WebKit ⏰'s *Ends* field
(`design/setup.js:1397`, and the founder's own at `design/band.js:556`) was
filled with *Ada Lovell*; ⏰ could not settle, the founding stalled there, and
each of `founding`, `answers` and `delegated` lost the four or five cards that
come after it — 👥 quorum, 👤 authorship, ⚖️ judgments, 🍾 begin,
`ans-chamber`. **251 cards against chromium's 263, with `errors: []` and a
summary that read as coverage** — the exact shape of the *a card the probe never
opens can never produce a dead step* gotcha. Asking the markup rather than the
engine fixes it (`design/tools/card-audit.mjs:1436`: `inp.getAttribute('type')
|| inp.type`), and every count in the table above is post-fix. The chromium
payload is unchanged by it, since there the attribute and the property agree.

The **page** half of this is not settled by the run and is finding 6.

**2 · Firefox: `journey`'s synthetic paste delivers nothing, and six steps fall
over behind it.** *(firefox · `journey` · the walk's.)* Failing steps: `strip
pre`, `text`, `paste ✒️`, `edit mode`, `column`, `caret`; the walk also records
one refused command, `400 POST /api/d/<slug>/stash {"text":""} → 'text' must be
a non-empty string`, which is the empty column being stashed. The cause is one
line: `scripts/journey-walk.mjs:306` (and 492, 506) pastes by constructing
`new ClipboardEvent('paste', { clipboardData: dt })`. Probed directly, all three
engines hand the listener a `clipboardData` object, but **Firefox's
`getData('text/plain')` answers the empty string** where chromium and webkit
answer the payload — Gecko will not read a `DataTransfer` back out of an
untrusted clipboard event. So the column stays empty, and `column`, `caret` and
the rest have nothing to work on. I believe this is the walk's and not the
page's: a real Ctrl+V in Firefox is a trusted event carrying real clipboard
data, which this never becomes. **It is not proven** — see doubt 1 — and the
fix (a real clipboard write plus a real `Control+V`, or a `text/plain`-only
fallback the page also serves) is somebody's next commit, not this one's.

**3 · Firefox draws neither the fill nor the ticks on a range input — and no
card on the surface has one.** *(firefox · hand probe (b) · the page's, and
latent.)* Confirmed by eye at 2×:
`…/scratchpad/xb/shots/{chromium,webkit,firefox}-b-range.png`. Chromium and
WebKit both draw the blue fill up to the thumb and the tick marks, because both
honour `::-webkit-slider-runnable-track`'s three stacked backgrounds
(`design/setup.css:395–411`); Firefox shows a flat empty grey track with the
thumb on it, because `::-moz-range-track` at `design/setup.css:420–423` sets one
plain `background: var(--light)` and there is no `::-moz-range-progress`. The
readiness pass's §5 prediction is **confirmed as CSS**. It is **latent**: the
audit walked every card on all three engines and found no `input[type=range]`
anywhere, `npm run slider-walk` now drives 👥 through two number boxes and says
so, and `slider()` at `design/setup.js:1060–1082` is dead code left from the
consent-slider Q1162 retired. Nothing a member meets on Sunday is a track.

**4 · A 0.3px rounding difference, and it is the whole of the cross-engine
finding list.** *(firefox · `card-audit` wide · neither — it is arithmetic.)*
The existing S1 finding — `.sugg` margin-r/l off the `--s1`–`--s5` grid — reads
`15.13px` on chromium and webkit and `14.83px` on firefox, so the deduper files
it as two findings rather than one. Same rule, same element, same defect. At
390×844 even that disappears: **all ten findings are identical on all three
engines.**

**5 · Nothing else moved.** No page error on any engine in any run; no card
present on one engine and absent on another; `drawer-walk`'s spacing,
tap-to-close and drag assertions all green on all three, including the drag,
which is the one that needed a real pointer.

**6 · The page leans on `datetime-local`, and this pass cannot tell you whether
that matters on a phone.** *(webkit · finding 1's other half · the page's —
open.)* ⏰ and the motion composer at `design/session-view.html:5498` both ask
for a datetime through `<input type="datetime-local">`, and both read
`ev.target.value` as a string (`design/session-view.html:7124–7125`), never
`valueAsNumber` — so where the control degrades to a plain text box the page
still stores what is typed, and the loss is the **picker**, not the value. Real
Safari on macOS and iOS has supported `datetime-local` since 14.1, so this is
most likely an artefact of Playwright's WebKit build on Windows and not a
Safari fact at all. It is listed because it is the one place the run found the
page depending on an input type an engine may not have, and because nothing in
the tree tests what a founder sees if it is missing.

## The three hand probes

Script: `…/scratchpad/xb/probes.mjs` (scratchpad, uncommitted), serving
`design/` over a free port the way `card-audit`'s `serveDesign` does.

**(a) `contenteditable="plaintext-only"` — all three type, and read back.** The
birth page's title lane (`design/band.js:355`, `.lp.editlane.titlelane`) is the
only plaintext-only host at boot, behind 🪶's card. Clicked, typed *Hollow Oak
Club* with real key presses, read back:

| engine | `contentEditable` echo | `isContentEditable` | read back |
|---|---|---|---|
| chromium 151 | `plaintext-only` | true | `"Hollow Oak Club"` ✓ |
| webkit 26.5 | `plaintext-only` | true | `"Hollow Oak Club"` ✓ |
| firefox 153.0 | `plaintext-only` | true | `"Hollow Oak Club"` ✓ |

Firefox 153 is far above the 136 floor, so this **refutes the prediction for a
current Firefox** and says nothing about an old one. A member on Firefox 135 or
below is untested and untestable here — no such build is installed. Screenshots:
`shots/<engine>-a-titlelane.png`.

**(b) the range input** — finding 3. No card renders one; the screenshots are of
a synthetic `.cs` control injected into the live page so the stylesheet could
still be read per engine. `shots/<engine>-b-range.png`.

**(c) WebKit at 390×844, `hasTouch`, `isMobile` — nothing is cut off, because
nothing is there.** At the top of the page, at the bottom, and with the task
drawer open, measured against `window.innerHeight` = 844 (`visualViewport.height`
844, `offsetTop` 0 — headless has no collapsing toolbar):

- topbar `0,0 390×83`, bottom 83 — fully on screen in all three states.
- the task drawer `.layout > .queue` `x 390 → 54.6` when opened, `83 → 844`,
  bottom **exactly 844**: its foot meets the viewport foot and does not pass it.
- `#editdoor [data-editdoor]`, `.proposalrow` and `#ridetab` all measure
  `0×0` — **by design**, not cut off: `design/system.css:2697` hides
  `#ridetab, #editdoor, #prosectl, .lanepropose` at narrow, which is MOBILE.md's
  first cut (read + judge, no composer).
- the alpha flag is `position: static` at ≤900px by `design/session-view.html:99`
  and therefore scrolls away with the document (measured `y` −22555 at the foot);
  that is the rule, not a defect.

Chromium and Firefox measure the same to within 0.1px. Screenshots:
`shots/<engine>-c-{top,bottom,drawer}.png`.

## What this does NOT cover

- **Safari on a real iPhone is not WebKit-in-Playwright.** No collapsing
  toolbar, so `100vh` and `100dvh` behave identically here and the iOS `100vh`
  box is untested; no HEIC, so the picture upload's re-encode and its
  `imageOrientation: 'from-image'` are untested on the one format an iPhone
  actually produces; no real touch — `hasTouch` synthesises events but there is
  no finger, no long-press menu, no rubber-band scroll, no keyboard shoving the
  viewport up. Playwright's WebKit is also a Windows build, which is where
  finding 1's missing `datetime-local` comes from and is not something Safari
  does.
- **Firefox below 136** — the version the readiness pass names — is not
  installed and was not run.
- **No Android, no Chrome on iOS** (which is WebKit), no Edge, no Samsung
  Internet.
- **`color-mix()` and `:has()` floors were not probed directly.** Every engine
  here supports both, so the run cannot tell you what an older one does; the
  audits agreeing on all 263 cards is evidence about *these three builds* only.
- **A real paste is untested on every engine.** Every paste in this pass was a
  constructed `ClipboardEvent`, which is exactly what finding 2 turns on.
- **Only five walks carry the seam.** `applicants-walk`, `seat-matrix`,
  `founding-walk`, `slug-walk`, `room-walk`, `ladder`, `powers-walk`,
  `member-questions-walk`, `after-begin-walk`, `invite-walk`, the two probes and
  `toc-travel` all still hardcode chromium, so none of them has ever run
  anywhere else.
- **Nothing was run against docs.vote**, and nothing was pushed.
