# REPORT-sunday-readiness.md — what could kill the first live test

**Date:** 2026-09-17, overnight · **HEAD:** `8d7230e` · **Live build (`x-build`, read 00:27 UTC):** `b819e95` — the surface is current, the commits since are tooling and QUESTIONS.

**Precedence.** This is a *reading*, not a ruling. Nothing here amends SPEC, SURFACE, STYLE or any rule file; where this report and a rule file disagree, the rule file wins. Where a fact could be checked it was checked — by DNS query, by read-only HTTP GET against docs.vote, by reading the source, or by running a local browser engine. Uncertain items say so. No file in `packages/`, `design/` or `scripts/` was changed by the reading; no server was started; nothing was written to docs.vote. Written by the session from a read-only subagent's findings (the subagent was not permitted to write files).

Target: the first live test with **real human users and a real document, Sunday 2026-09-20**. Every automated walk to date has run on headless **Chromium only**; every bot room has used `@bots.docs.vote` mail, which is caught by the host and **never handed to Resend** (`packages/server/src/mailer.ts:137-141`).

---

## 1. Mail deliverability

**The DNS is correct and Resend-aligned.** Queried against `8.8.8.8`:

| Name | Type | Value (verbatim) |
|---|---|---|
| `docs.vote` | CNAME | `draft-x290.onrender.com` → `gcp-us-west1-1.origin.onrender.com` → `…cdn.cloudflare.net` |
| `send.mail.docs.vote` | TXT | `"v=spf1 include:amazonses.com ~all"` |
| `send.mail.docs.vote` | MX | `10 feedback-smtp.eu-west-1.amazonses.com` |
| `resend._domainkey.mail.docs.vote` | TXT | `"p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDjDCpMi81MhORd/…"` (1024-bit) |
| `_dmarc.docs.vote` | TXT | `"v=DMARC1; p=none;"` |
| `_dmarc.mail.docs.vote` | — | NXDOMAIN — falls back to the organizational domain's record. Correct |
| `mail.docs.vote` | TXT | none — correct: SPF belongs at the bounce domain |

A second, older Resend verification also exists at the apex (`resend._domainkey.docs.vote`, `send.docs.vote`). Harmless, but DNS alone cannot say which identity the host uses. `docs.vote` is a CNAME at the apex, so no TXT can live there (`docs/OPERATING.md:445-448`, trap 6) — which is why `mail.docs.vote` exists.

**Alignment:** From `@mail.docs.vote`; DKIM `d=mail.docs.vote` → strict alignment; bounce domain `send.mail.docs.vote` → relaxed SPF alignment. DMARC passes, and at `p=none` would not reject even if it failed. Two gaps: **no `rua=`**, so no visibility into what is junked; and the DKIM key is 1024-bit (accepted everywhere; Google prefers 2048).

**The From address.** `packages/server/src/config.ts:210` — `mailFrom: env.DRAFT_MAIL_FROM ?? 'docs.vote <invitations@mail.docs.vote>'`. The code default is right, **but the variable is `sync: false`** (`render.yaml:51-52`): set in the Render dashboard and not readable from the tree. `docs/OPERATING.md:423-432` (trap 2) records that it *was* Resend's sandbox sender, "which delivers only to the Resend account's own address". `PRODUCTION.md:47` says the sandbox sender was cleared and one real send to a non-Resend address happened, **on Ed's word, 2026-09-07, date unrecorded**. That is the weakest evidence in this report, and it guards the whole test.

**`/healthz` proves less than it looks.** It reports `"mail":"on"`, `"outbox":{"pending":0,"failed":0}` — but the only real Resend traffic recently is the operator birth notice to `cfg.notifyEmail` (`config.ts:215`), which is *exactly the address a sandbox sender still delivers to*. Every bot address bypasses Resend. **A green outbox is fully consistent with a sending identity that reaches only Ed.**

**Mail is plain text only** — `mailer.ts:148-160` POSTs `{from, to, subject, text}`, no `html`. Not a deliverability blocker at this volume. No `List-Unsubscribe`; Gmail's bulk rules start at 5,000/day. Templates: `mailer.ts:186-271`.

## 2. Magic-link consumption

**A bare GET does not consume the token.** `packages/server/src/routes-auth.ts:162-185` serves an interstitial; the comment: *"magic links are GETs, and a GET must not consume a single-use token — mail scanners prefetch links and would burn them (stage 3, defect 6)."* Consumption is in the POST handlers `/auth/create` (`:194`), `/auth/apply` (`:367`), `/auth/login` (`:419`), each calling `auth.useToken`.

**But a scanner that executes JavaScript WOULD burn it.** The interstitial auto-submits on load — `routes-auth.ts:442-451`, ending `document.forms[0].submit()`, a `<noscript>` Continue button behind it. A sandbox that detonates the URL in a real browser (some Defender for Office 365 and Proofpoint configurations) posts the form and consumes the token before the human clicks. The code path is certain; whether a given scanner detonates is not.

**Single use — and expiry consumes too.** `packages/server/src/auth.ts:62-66`: `useToken` calls `persistence.takeToken` (delete-and-return) *before* checking `expMs`. Lifetime **7 days** (`auth.ts:18`).

**What a member sees on a spent or expired link:** a raw JSON body — `json(res, 400, { error: 'that link has been used or has expired' })` at `routes-auth.ts:196-197`, `:369`, `:422-423`. Not a page, not styled, no "send me another", no way back. The remedy exists unsignposted: the document URL and `POST /api/d/:slug/login` (`:258`).

**One creation, however many links** (`routes-auth.ts:200-223`, Q519).

## 3. Cookie lifetime and revival

- **Cookie: 90 days** — `auth.ts:19`, `routes.ts:308-311` (`HttpOnly; SameSite=Lax; Secure; Max-Age=7776000`).
- **Monday still works.** If cookies were cleared, the mailed link works only if never followed; otherwise `/d/:slug` → a fresh login mail.
- **One cookie per document** (`draft_session_<docId>`, `routes.ts:132-133`); two documents do not evict each other.
- **Two devices both work.** Stateless HMAC over `(docId, memberId, exp)`, no session table (`auth.ts:1-10`, `:68-88`); a host restart logs nobody out. Corollary: no per-device revocation short of rotating `DRAFT_SECRET`.

## 4. Hosting state

`GET https://docs.vote/healthz`, 2026-09-17 00:27 UTC:

```json
{"ok":true,"build":"b819e9500c8798c7bb5d5025aa22852f30f5be21","surface":"b819e95…","store":"pg","documents":10,"documentsSkipped":0,"documentsQuarantined":3,"documentsStalled":0,"paused":null,"uptimeSeconds":19066,"mail":"on","devMail":false,"outbox":{"pending":0,"failed":0},"errors":{"total":0,"request":0,"tick":0,"outbox":0,"last":null},"cooldownMs":0}
```

- **Postgres** (`"store":"pg"`), per the 2026-08-20 cutover (`docs/OPERATING.md:19`).
- **Render plan `starter`, frankfurt, `autoDeploy: false`** (`render.yaml:17-18`, `:30`). Starter does not sleep: no cold start on production. The dev host is `free` and does sleep (`render.yaml:87`).
- **`cooldownMs: 0`**, `documentsStalled: 0`, errors 0, uptime ~5.3 h.
- **Three documents quarantined** — failed to replay at boot, 404, named once in the boot log (`store.ts:101-106`; `docs/OPERATING.md:259-265`). A new document is unaffected.
- **A restart during a live room:** no disk (`render.yaml:31-34`); Render starts the new instance before stopping the old. Boot replays every document from its log sequentially (`store.ts:83-96`). **No boot-timing instrumentation exists** (no `bootMs`/`replayMs`), so replay time for a 20-member room is unmeasured. A full deploy pauses the host first (`announced-pause`, Q1345) and every open page reloads itself when `x-build` changes (`design/live.js:47-51`).
- Cloudflare in front; `cf-cache-status: DYNAMIC` everywhere.

**Payload (measured, brotli):** HTML 194 KB + session.js 100 KB + system.css 58 KB + constitution.js 46 KB + band.js 40 KB + cards.js 39 KB + setup.js 38 KB + live.js 31 KB + fluent-glyphs.svg 30 KB + rest ≈ **693 KB**, plus **139 KB** Charis woff2 ≈ **830 KB per cold load**. **No `Cache-Control`, `ETag` or `Last-Modified`** on `/`, `/session.js`, `/system.css` — heuristic caching only; the `x-build` reload re-pays most of it.

## 5. Browser support

**Chromium is the only engine any automation has used.** `import { chromium } from 'playwright'` is hardcoded in ~20 runners; `webkit`/`firefox` appear nowhere in `package.json`, `scripts/` or `design/tools/`; no `playwright.config.*`. Installed locally: chromium, **webkit-2336** (on disk, never used); Firefox was installed during this pass.

**`contenteditable="plaintext-only"` is a FALSE ALARM for Safari** — recorded so it is not raised again. The value originated in WebKit (Safari 5+ / iOS 4.2+ / Chrome 51+ / Firefox 136+). Verified by launching the installed engines against a `plaintext-only` element and typing: webkit 26.5 and chromium 151 both editable, typed result `"aXYZ"`. The **real** exposure is **Firefox below 136** (March 2025), notably **ESR 128**: the attribute maps to `inherit` and the element is silently not editable. Sites: `design/band.js:355`, `:363`, `:791`, `:1213`; `design/begin.js:485`; `design/cards.js:1405`; `design/session-view.html:5071`, `:5461`. No `@supports`, `CSS.supports` or feature detection anywhere in the surface.

| Feature | Sites | Floor (Safari / Firefox) | Effect where unsupported |
|---|---|---|---|
| `color-mix()` | `system.css:1027`, `:1559`, `:1584`, `:1597`, `:1605`, `:1900`, `:1907`; `setup.css:533` | 16.2 / 113 | picked/selected state paints no background (iOS ≤ 16.1) |
| `:has()` | `system.css:1078`, `:1243`, `:1299`, `:1305-1307`, `:1428` | 15.4 / 121 | spacing; `:1306`'s `content: none` → doubled bullet marker on FF ESR 115 |
| `::-webkit-slider-runnable-track` fill + ticks, no `::-moz-` equivalent | `setup.css:395-412` vs `:420` | — | Firefox range inputs show no fill and no ticks |
| `@property --measure` | `system.css:1197` | 16.4 / 128 | cosmetic |
| `text-wrap: balance` | `setup.css:632`, `system.css:1285`, `session-view.html:124` | 17.5 / 121 | typography only |
| `overscroll-behavior: contain` | `system.css:495`, `:576` | 16 / 59 | iOS ≤ 15: flicking a rail scrolls the page |
| no `dvh`/`svh`; `100vh`/`95vh` used | `system.css:553`, `:1067`, `:1224`, `:1233`; `session-view.html:326`, `:8485` | — | iOS: box bottoms under the collapsing toolbar |
| `viewport-fit=cover` with one `env(safe-area-inset-*)` rule (`system.css:496`) | — | — | navbar and `inset:0` modals under the notch / home indicator |
| `createImageBitmap(file, {imageOrientation:'from-image'})` | `setup.js:1204` | Blob form 15 / 42; the option: uncertain, plausibly Safari ~17 | EXIF-rotated photos upload sideways where ignored |
| `<input type="datetime-local">` | `setup.js:1397`, `session-view.html:5498` | 14.1 / 93 | supported; iPhone draws a wheel, Firefox a plain field |

Confirmed absent: `@container`, `popover`, `<dialog>`, `@starting-style`, `scrollbar-gutter`, `subgrid`, `backdrop-filter`, `structuredClone`, `Object.hasOwn`, `toSorted`, `findLast`, `.at(`, `replaceAll`, `navigator.share`, `CSS.escape`, `crypto.randomUUID`, `ResizeObserver`, `IntersectionObserver`, regex lookbehind. `localStorage` is try/catch-wrapped (`live.js:879-880`, `wallets.js:633-635`). Fonts woff2 with `font-display: swap` and a real fallback stack.

## 6. Pictures

**Every client-side refusal is silent.** `design/setup.js:1193-1196`:

```js
const refuse = (zone, msg) => {
  const note = zone && zone.querySelector('.picnote');
  if (note) note.textContent = msg;
};
```

`.picnote` appears in exactly two places: the CSS rule `setup.css:551` and that `querySelector`. **`pictureBody` never renders the element** (`setup.js:921-924` builds `.picdrop > .picact > label.btn + input[type=file]`), so `note` is always `null` and `refuse` is a no-op on all four paths: not an image (`:1200`), larger than 20 MB (`:1201`), **decode failed** (`:1202-1205`), will not compress under 40 KB (`:1232-1234`). **The member sees the file dialog close and nothing happen.**

`accept="image/*"` (`:923`); the type gate passes `image/heic`. iOS Safari normally hands over a transcoded JPEG for an `accept="image/*"` input, so the iPhone case is largely safe; the exposure is a desktop `.heic` in Chrome or Firefox → `createImageBitmap` throws → silence. Cap `LIMITS.picture = 40_000` (`commands.ts:51`, enforced `:103`, format gate `:113`); client mirror `PIC_MAX_STORED` (`setup.js:1191`). Canvas fixed 256×256 (`:1188`, `:1206-1207`), so the canvas is not the memory risk, but `createImageBitmap` materialises the full bitmap (~48 MB for 12 MP) before the downscale, released at `:1218`. `imageOrientation: 'from-image'` present at `:1204`.

**Automation: none, ever.** `setInputFiles` has zero hits repo-wide; every walk's picture is an emoji face.

## 7. Phone journey coverage

Narrow automation is three scripts, one in CI: `card-audit:narrow` (`package.json:24`), `a11y-audit:narrow` (`:26`), `drawer-walk` (`:29`, 390×844 hardcoded, `drawer-walk.mjs:32`); `.github/workflows/ci.yml:257` runs **drawer-walk alone** at 390. `mobile-walk` is specified in full in `design/MOBILE.md:149-171` and does not exist.

| Journey | Driven at 390? | Evidence |
|---|---|---|
| arrive via a magic link | **no** | real arrivals are wide only: `journey-walk.mjs:232-233`, `applicants-walk.mjs:177-178`, `invite-walk.mjs:64-65` |
| judge a pair | **no** | the only narrow commit is `a11y-audit.mjs:534-546`, on an already-enabled ✓; no narrow script clicks a lane |
| propose text | **structurally impossible** | `card-audit.mjs:1653` returns early below 900; `MOBILE.md:39`: `#ridetab`, `#editdoor`, `#prosectl` and *propose edit* are not drawn below 900. **On a phone a member cannot propose at all.** |
| task drawer | yes | `drawer-walk.mjs:71`, `:127`, `:132`, `:138-141`, `:147` — the only touch-driven automation |
| picture upload | never, at any width | §6 |
| found a document | fixture-only, gesture-free | `card-audit.mjs:1363-1371`; commits are synthetic `el.click()` |

Touch emulation exists once (`hasTouch: true`, `drawer-walk.mjs:88`); `playwright.devices` never imported; no WebKit context anywhere. `MOBILE.md:40` lists as not built: the two-tap confirm, tap targets, the keyboard and `dvh` rules, `mobile-walk`.

## 8. Pacing and defaults for humans

**The measured preset is obsolete, and its main lever no longer exists.** `PRODUCTION.md:290-320` gives the alpha preset (bar 85%, rate 6/8, one per 5 min, window 20 min) and records at `:320` that Q1362 retired the bar; finding 1 (`:324-326`) was *the bar is the only knob that moves anything at this scale*; finding 2 (`:327-335`) that the cooldown and the rate changed nothing in simulation.

**The rate is barely a knob.** `session-view.html:1127` — `rate: () => ({ grant: 3, cap: 3, dripMinutes: +S.dripMin })` (Q1160), `catalogue.ts:260-264`. A member starts with **3 proposals** and gets one more every `dripMinutes`.

**What a founder sees: a blank field.** `S.dripMin` initialises to `''` (`session-view.html:1463`), `ready()` demands a positive number (`:3379`). `meaningOf` (`packages/constitution/src/meaning.ts`) prints a consequence sentence but recommends nothing. **No recommended operating point exists on the surface or in a current document.**

**Cooldown on docs.vote is 0** (`config.ts:30`), so the dead-room worry does not apply. The post-Q1362 measurement is `packages/sim-harness/REPORT-churn.md`: churn "real, substantial, and braked by the floor" — a room of fifteen over a 4-hour window showed ~18 adoptions, ~8 flips, ~5.5 reversions per seed. A supervised hour with humans is likelier to read as *churny* than as dead.

## 9. The window end

**Correct, low risk.** `setup.js:1397` renders `datetime-local`; converted at `session-view.html:1121`, `:1140` by `Date.parse(v)` — a date-time with no offset parses as local time in every modern engine; the inverse `msToLocal` (`:1041-1046`) is symmetric. The close runs on the absolute instant server-side: `packages/constitution/src/session.ts:1297-1298` on the minute `tick()`. Readers see the end in their own locale (`session-view.html:4995`). Residual: a wrong device clock on the founder's machine; `toLocaleString` differs by engine in its *string* only.

## 10. Errors a real user can hit

**A refusal shows a debug box to real members.** `session-view.html:1011-1017` — `refusalNoted` sets the card's door error (`copy.js:406`, `:408`) **and** calls `showErrLine` (`:1018-1037`, styled `:141-146`): the command name, up to 200 chars of JSON arguments, the path, the seat id, an ISO timestamp, tooltip *"Dev only — a refusal, with what was sent; click to dismiss"* — **nothing gates it on dev.** Deliberate in origin (Q1330, Ed 2026-09-11; `error-log.ts:1-12`); flagged only because a member will see it and it reads like a crash.

**A deploy or restart shows a real modal.** `live.js:53-94`: on a 503 carrying `paused`, `#pausemodal` with a progress track; copy `copy.js:413-416`. A store refusing saves raises `.stalledflag` (`live.js:61-68`; `copy.js:417`).

**A network blip is invisible and self-healing.** The poll is a `setInterval` (`live.js:689`); failures go to `console.warn` (`live.js:161`, `:244`). **Nothing appears on screen**; the page quietly stops updating until the next successful poll. A *command* with no answer does surface: `live.js:131-134` → *"the server could not be reached"* (`copy.js:420`).

**Client-side error reporting: none.** `session-view.html:323-333` installs `error`/`unhandledrejection` listeners only under `?debug=1`, and sends nothing anywhere. The server's `errors.jsonl` records refused commands only, on the ephemeral disk (`error-log.ts:20-24`). **If a member's page throws, nobody will know.**

## 11. Concurrent editing

**The stranded path is built and walked.** `scripts/seat-matrix.mjs:660-710` drives it: the Founder's pen rewrites a clause under another member's live proposal, the rebase fails, the candidate is asserted `rebase-pending` and the entry read (`:709-710`). The member sees a ↻ entry in the *yours* hue (`cards.js:226`) and `strandedCardHtml` (`composer.js:933-945`) with `copy.js:202-209`'s note, caption and a free ✏️ Re-make (`composer.js:663-671`). SPEC §2.6; `views.ts:231-240`; `commands.ts:391`. **The gap:** wide width only, and only via the pen — an *adoption* landing under a member's draft on a phone is not separately driven.

## 12. Founder mistakes

| Can the founder… | Answer | Rule / file:line |
|---|---|---|
| undo a wrong setting after 🍾 | yes wherever ✒️ was kept; 🍾 keeps the pen by default except the Text if never opened | `SPEC.md:279` rules 5, 8; `BEGIN_ROWS` |
| …after laying that power down | **no road back** | `SPEC.md:279` rule 4 (v0.130, Q1404) |
| remove a wrongly-invited address before they arrive | free before 🍾; after 🍾 at 🥾's price unless ✒️ is held at ❌ | `SPEC.md:277`, rule 9; `session.ts:646-655`; `session-view.html:7696-7725` |
| change the title | yes, any time (ordinary, not delegable) | `catalogue.ts:127-128` |
| change the address | yes; every old link keeps working | `SPEC.md:379`; `store.ts:171`, `:178` |
| extend the window before the close | yes (a date to a date is ordinary) | `catalogue.ts:139-149` |
| extend after the close | **no** — final | `engine-core/src/session.ts:173-177`, `:891`; SPEC §4.6 |

---

## Risks ranked

KILL = could kill the test · DEGRADE = visibly wrong for someone · COSMETIC.

| # | Risk | Severity | Confidence | Testable tonight? | Needs Ed? |
|---|---|---|---|---|---|
| 1 | `DRAFT_MAIL_FROM` in the Render dashboard may still be the sandbox sender (delivers only to Ed) while `/healthz` stays green | KILL | medium | partly: read the dashboard; one invitation to a non-Ed mailbox, inbox and spam | yes |
| 2 | A spent or expired link shows raw JSON, no page, no way to ask for another (`routes-auth.ts:196-197`, `:369`, `:422-423`); a JS-detonating scanner strands people there | KILL | high on the code | yes: `curl -X POST https://docs.vote/auth/login -d token=x` | decision: a page before Sunday |
| 3 | Every picture-upload refusal is silent (`setup.js:1193-1196` vs `:921-924`); never automated | KILL (first interaction, fails mute) | certain | yes | decision: fix or brief |
| 4 | A phone cannot propose at all (`MOBILE.md:39`); judging at 390 never driven | KILL if phone-first | certain | yes: WebKit at 390 with `hasTouch` | yes: laptops or phones |
| 5 | A push to main is a deploy and lands mid-room (split a demo once, 2026-09-12) | KILL | certain | n/a | yes: no pushes Sunday |
| 6 | A network blip is invisible; the page keeps a stale face (`live.js:161`, `:244`) | DEGRADE | certain | yes | no |
| 7 | No client error reporting; nobody knows if a page throws | DEGRADE | certain | decide `?debug=1` links or tail the log | yes |
| 8 | A refusal shows a "Dev only" debug panel to members (`session-view.html:1018-1037`) | DEGRADE | certain | yes | yes (Q1330) |
| 9 | Firefox < 136 (ESR 128) cannot type anywhere; Safari is fine | KILL for that user only | high | yes, Firefox now installed | decision |
| 10 | No recommended operating point; grant/cap fixed 3/3; blank drip field | DEGRADE | high | `npm run churn` | yes: drip, quorum, window |
| 11 | Firefox sliders show no fill or ticks (`setup.css:395-420`) | DEGRADE, Firefox | certain | yes | no |
| 12 | iOS layout: no `dvh`, one safe-area rule | DEGRADE | high | yes: WebKit 390 | no |
| 13 | `color-mix()` on iOS ≤ 16.1 drops selected backgrounds | DEGRADE, old iPhones | high | read the CSS | no |
| 14 | EXIF rotation may be ignored by some engines (`setup.js:1204`) | COSMETIC | low-medium | yes: WebKit upload | no |
| 15 | 830 KB cold load, no cache headers | COSMETIC → DEGRADE on bad wifi | certain | throttle and time | no |
| 16 | Three quarantined documents on the live host | COSMETIC | certain | read the boot log | no |
| 17 | DMARC has no `rua=`; DKIM 1024-bit | COSMETIC | certain | DNS edit | yes |

### Testable tonight, in one list

1. Read `DRAFT_MAIL_FROM` in the Render dashboard; send one real invitation to a non-Ed mailbox; check inbox and spam (risk 1).
2. `curl -X POST https://docs.vote/auth/login -d 'token=nonsense'` (risk 2).
3. Drop a `.heic` and a 25 MB file into the picture upload locally (risk 3).
4. Run the walks under `webkit-2336` (risks 9, 12, 13, 14).
5. WebKit at 390×844 with `hasTouch` through arrive → judge → propose (risk 4).
6. Go offline mid-poll on a live document (risk 6).
7. `npm run churn -w @draft/sim-harness` before choosing the drip, quorum and window (risk 10).
8. Firefox: the same walks (risks 9, 11).
9. Read the Render boot log for the quarantined documents and the replay duration (risk 16, §4).
