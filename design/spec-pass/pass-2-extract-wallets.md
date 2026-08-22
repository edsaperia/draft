# Extraction — wallets, sockets, the hold ladder, grants and acknowledgements, flights, the four verbs

Spec pass 2, family extraction. Read-only; nothing in the repo was edited. Sources: `CLAUDE.md` (glossary entries `wallets` and sub-bullets, `🍾 Begin`, `the four verbs`, `quill line`, `reserved`/👑, `assembly-press`, `proposal-row`, `Nothing rebuilds under a press`), `SURFACE.md` (C4, C9, C16, E4, E8, E9, L8, Y7, Y11, §5), `design/session.js`, `design/session-view.html` (NUL-bearing; read with `tr -d '\000'`), `design/setup.js`, `design/system.css`, `design/setup.css`, `scripts/journey-walk.mjs`, `scripts/spec-check.mjs`. All line numbers are as of HEAD 936b554.

---

## 1. The wallets table

One row per wallet / verb. "Ladder" = who has to agree (CLAUDE.md `the four verbs`).

| | 🪶 quill-wallet | ✒️ draft-wallet | 🛡️ (shield) | ✏️ propose-wallet | 🏛️ consensus-wallet | 🍾 Begin (no wallet) |
|---|---|---|---|---|---|---|
| **Verb** | founding | drafting | *(not a verb in the four-verb ladder; "the pen's other half" — session-view.html:6096)* | proposing | consensus (wording open, Q450) | beginning — "a moment that happens once" (Q516) |
| **Who has to agree** | nobody — nothing exists yet | nobody — you hold the power | nobody (a refusal power) | enough of the room, at the approval threshold | everybody | the founder alone (`amFounder()`), refused only while a judge-gate question is still being decided |
| **Element id** | `#quill` (`<a class="quill" id="quill" href="/">`, session-view.html:154) | `#penwallet` (`.wallet.powerwallet`, :168) | `#shieldwallet` (:169) | `#wallet` (:167; rendered by session.js `renderWallet`) | `#voicewallet` (:170) | none; the commit is `<button … btn-pen data-confirm data-begin>🍾 Begin</button>` (:3881) |
| **Quantity rule** | 4 feathers at the birth; 3 spent (title, link, mail), the 4th permanent and *is* the logo. `spent = cs ? 3 : seen(title)+seen(slug)+emailSent`, `left = 4 - min(3, spent)` (:6032–6033). Not dripped, not refunded. | One, perpetual, never spent. Drawn as `✒️` + `∞` in the count slot (:6066–6068). | One, perpetual, never spent; drawn `🛡️` + `∞` (:6102–6103). | Many. Spent 1 per Propose (`EDIT_RULES.stake`, session.js:3380), refunded in full on withdraw (session.js:3405, capped at `EDIT_RULES.cap`), dripped (fixture: `1/(SESSION_MINUTES*6)` per second, session.js:4236–4240; live: the view's `wallet`/`walletInfo`, session-view.html:6600–6610). Fixture defaults `{grant: 4, cap: 8, stake: 1}`, `editsHeld` 5 (session.js:4228, 4232). Live initial `editsHeld: 0` (session-view.html:6615). | One at a time, returned whole on withdrawal or settlement. `heldMotion()` (session-view.html:6024–6029) ghosts the glyph while a motion of yours is running (:6108). | none — "a wallet for it is a button with a balance drawn on it" (CLAUDE.md `🍾 Begin`) |
| **What a spend pays for** | a founding act: title, link, the first 📧 send | a direct set of a setting where the ✒️ tab turns (and laying down a power — exempt from the gate, see W9) | nothing is spent; holding it makes a passed change wait on the founder's accept | one proposal against the text (or an ordinary motion) | one constitutional motion (an invite / remove included) | the start of the document: the 🍾 batch (`BEGIN_BATCH`, :6240–6244) |
| **Hold length** | **1000 ms** — `PEN_HOLD_MS = 1000` (session-view.html:6462), via `holdWallet` returning `{g:'🪶', sel:'#quill i'}` when `!cs` and the button text contains 🪶 (:6467) | **1000 ms** — same constant; branch `cs && /✒️/ && mayPen()` → `{g:'✒️', sel:'#penwallet i'}` (:6481) | no hold — it is never a commit | **3000 ms** — `HOLD_MS = 3000` (session.js:3058), `flyStart`/`flyStop` on `[data-act="draft-propose"]` | **10000 ms** — `HOLD_MS = 10000` (session-view.html:4823), `conveneAssembly` on `[data-holdmotion]` | **1000 ms** — same `PEN_HOLD_MS`; branch `cs && /🍾/` → `{g:'🍾', sel:null, to:'#doctitle, .doctitle'}` (:6475) |
| **Quarter-way nudge (`floorAt`)** | 250 ms (`penRelease`, :6572) | 250 ms (same) | — | 864 ms (`flyStop`, session.js:3085) | none — release disperses the assembly, no token, no nudge (:4860–4866) | 250 ms (same `penRelease`) |
| **Grant key · who gives it (grant sentence)** | **no task** — "you are conferred your feathers by navigating to docs.vote" (:1133–1134) | `grant-pen` — *You founded this document, and the pen came with it.* / *The membership returned the pen to you.* (:6360–6364) | `grant-shield` — *You founded this document, and the shield came with it.* / *The membership returned the shield to you.* (:6369–6373) | `canpropose` (the 💡 Proposing gate **is** the grant card, Q461a) — *The Founder began the document, granting every member the right to propose changes to it.* (:6388) | `grant-voice` — four sentences by `arrival.via`/`by`: *You founded this document, and every member holds a voice in it.* / *The membership admitted you on your application…* / *The membership agreed to invite you…* / *The Founder invited you into the membership…* (:6374–6387) | no grant; 🍾 is itself a task (`isBegin`, :1178) committed with the hold; after the press the OK key `begin` is added (:4494) |
| **When it arrives** | arrival at docs.vote | the save (`open: !!cs && amFounder() && holdsPenAnywhere()`, :1145; `dep: ['slug']`; `ORDER[3]`) | the save (`open: !!cs && amFounder() && holdsShieldAnywhere()`, :1167; `ORDER[4]`, immediately after `grant-pen`) | 🍾 (`hide: !constituted()`, `open: cs.canPropose(viewerId())`, :1116–1117) | `open: !!cs && viewerIsMember() && !!viewerRow().in` (:1139) — **but** it sits at `ORDER[21]`, after `canjudge`, so `orderReady` holds it back until every non-gate setting above it in ORDER is settled (:1896–1903). See D6. | `open: constituted()` (:1179); `mustAct` for the founder while `!constituted()` (:1776) |
| **Ack key · persistence** | none | `grant-pen` ∈ `GRANT_KEYS` ⊂ `ACK_KEYS`; `localStorage['draft:grants:<LIVESLUG>:<cs.v.me>']` (`grantsKey`, :6584), live only (`saveGrants` returns if `!LIVEMODE`, :6586) | `grant-shield` — same | `canpropose` — same | `grant-voice` — same | `begin` — written to `S.okd` (:4494) but **not** in `ACK_KEYS`, so not persisted |
| **Socket states** | count of feathers (4→1); ghost `.gone` on the last during a 🪶 hold (:6034–6035). Never `notheld`. | `notheld` (struck), or `✒️∞`; `.gone` ghost on both `<i>` and `.pmore` during a hold or the grant flight (:6066–6068) | `notheld`, or `🛡️∞` (no ghost while held — nothing flies out of it) | `notheld` (struck `✏️`), `empty` (0 held, muted + countdown), drawn 1–4, counted `✏️✏️✏️+n` above 4, `full` at cap (session.js:3920–3961) | `notheld`, or `🏛️`, or `.gone` ghost while a motion of yours is out (`heldMotion()`) or during the grant flight (:6108) | — |
| **Flight** | outbound: `flyGlyph('🪶', last #quill i → button, 1000, {r0:-30, r1:0, easing:'linear'})` (:6518); return: `nudgeHome` floor 250, rewind ×4; reduced motion: fade at the destination (flyGlyph, session.js:3772–3774) | same as 🪶 with `'✒️'`; grant inbound: `flyGlyph('✒️', OK button → #penwallet i, 640)` (:6449); farewell: `flyGlyph('✒️', socket → 🥂 card, 640, {r0:0,r1:25})` (:6320) | grant inbound only: `flyGlyph('🛡️', OK → #shieldwallet i, 640)` (:6449). **No farewell flight** (:6318 lists only voicewallet and penwallet). | outbound: `arcFrames(a,b,0,-24)` over 3000 ms, bezier `(.45,.05,.3,1)` (session.js:3119–3120); return `nudgeHome` floor 864; refund: `refundFlight`, 640 ms (`REFUND_MS`, session.js:3728); grant: `pencilStorm(OK → #wallet, max(n,3))`, `STORM_MS` 900 ±, 70 ms stagger, cap 12 (session.js:3880–3891; session-view.html:6432); farewell: `pencilStorm(#wallet → 🥂, max(n,2))` (:6316). Reduced motion: fades in place, same duration. | grant inbound `flyGlyph('🏛️', OK → #voicewallet i, 640)`; farewell (:6320); the motion hold flies nothing — the assembly ring is the meter (`#assembly .seat`, setup.css:458–470) | the cork: `flyGlyph('🍾', button → #doctitle, 1000, linear)` (:6512–6518) — "a pop, not a spend"; return by `nudgeHome` like the pen |
| **`may*` gate** | none (pre-save; `holdWallet` only needs `#quill i` to exist) | `mayPen = !!cs && amFounder() && holdsPenAnywhere() && acked('grant-pen')` (:2241) | `mayShield = !!cs && amFounder() && holdsShieldAnywhere() && acked('grant-shield')` (:2249) | `mayPropose = canPropose() && viewerIsMember() && acked('canpropose')` (:2238); handed to session.js as `env.mayPropose` (:6628) → `MAY_PROPOSE` (session.js:4229) | `mayVoice = !!cs && viewerIsMember() && !!viewerRow().in && acked('grant-voice')` (:2240) | none — `can = !constituted() && amFounder() && (!rd || rd.ready)` (:3877) |

Also in `ACK_KEYS` but with no wallet: `canjudge` (⚖️ Judging) — `mayJudge = canJudge() && viewerIsMember() && acked('canjudge')` (:2239), `MAY_JUDGE` in session.js; its grant sentence *The Founder began the document, granting every member the right to judge what is proposed.* (:6389).

### Declarations, verbatim

- `const GRANT_KEYS = ['canpropose', 'grant-pen', 'grant-shield', 'grant-voice'];` — session-view.html:810
- `const ACK_KEYS = GRANT_KEYS.concat(['canjudge']);` — :811
- `const ORDER = ['title', 'slug', 'myemail', 'grant-pen', 'grant-shield', 'chamber', 'policy', 'hat', 'myname', 'mypic', 'roster', 'lapse', 'removal', 'ending', 'bar', 'quorum', 'authorship', 'signing', 'judgments', 'canpropose', 'canjudge', 'grant-voice', 'rate', 'machines', 'text', 'begin'];` — :1863–1868
- `const PEN_HOLD_MS = 1000;` — :6462
- `const HOLD_MS = 10000;` (assembly-press) — :4823
- `const HOLD_MS = 3000;` (propose hold) — session.js:3058
- `const REFUND_MS = 640;` — session.js:3728
- `const STORM_MS = 900;` — session.js:3880
- `const LEAN_MS = 900, LEAN_PX = 6;` — session.js:3994
- `nudgeHome` defaults: `rewind 4, push 160, hang 90, minRate 1.8` — session.js:3842
- `pencilStorm` clamp `max(1, min(12, count))`, per-pencil duration `STORM_MS - 200 + rand(300)`, delay `i*70 + rand(40)` — session.js:3882–3889
- `const grantsKey = () => 'draft:grants:' + LIVESLUG + ':' + ((cs && cs.v && cs.v.me) || '');` — :6584
- `--nav-h: 58px;` — system.css:180; `--shadow-in` — :161; `--slash: #8e2116` — :168; `:root[data-slash="muted"] { --slash: var(--muted); }` — :182
- socket: `.navbar .quill, .navbar .wallet { min-height: 24px; padding: 0 7px; border-radius: 999px; background: rgba(0,0,0,0.028); box-shadow: var(--shadow-in); }` — system.css:1674–1677
- strike: `.navbar .notheld::after { width: 23px; height: 2px; … background: var(--slash); transform: rotate(-45deg); }` — :1704–1708
- topbar markup order: `#wallet`, `#penwallet`, `#shieldwallet`, `#voicewallet`, `#mebtn` — session-view.html:167–171

---

## 2. Socket-state table

| State | Class / markup | Look | When | What the mark means |
|---|---|---|---|---|
| not held | `.wallet.notheld` (session.js:3921; session-view.html:6093 `el.classList.toggle('notheld', !gone && !held)`) | the tool drawn in the socket at `opacity: .55; filter: grayscale(1)` (system.css:1697), a 23×2 px `--slash` red bar at −45° hung on the socket's `::after` (:1704–1708) | your role does not include this power: stranger, applicant, clerk, a member before 🍾 or before accepting the grant, a founder before accepting the pen/shield; i.e. `!may*()` | the strike says *not your tool*; the bubble names who can (SAY, :6160–6180) |
| empty | `.wallet.empty` (session.js:3930) | `color: var(--muted)` (system.css:298); no pencil drawn; `.pwhen` countdown with the drip's fill | ✏️ only: held, `editsHeld === 0` | you hold the power and have spent it; the tray says when the next lands. **Never struck** |
| count | `.pencils i` × n, `.pmore` `+n` past four (session.js:3940–3953) | up to four glyphs; at 5+ three glyphs and `+n`; `.pwhen` unless full | ✏️ held, n ≥ 1 | a token is an edit; the number moves when a glyph cannot |
| full | `.wallet.full` (session.js:3930) | no `.pwhen` tray | `editsHeld >= EDIT_RULES.cap` | nothing more will arrive |
| ∞ | `<span class="pencils"><i>✒️</i><span class="pmore">∞</span></span>` (:6066–6068); same for 🛡️ (:6102–6103) | text ∞ in `.pmore` (700, `--fg`), never an `<i>` | ✒️ / 🛡️ held | a quantity that is not one; the token is the `<i>`, the count is not flyable |
| ghost (`.gone`) | `visibility: hidden` on the token / count (system.css:284, 1656, 1659) | slot kept, glyph invisible | a token is in the air: the hold's outbound, the return, the grant inbound, a 🏛️ out on a motion | the row does not close up; the traveller is drawn once |
| gone | `.navbar .gonewallet { display: none }` (system.css:1695; toggled :6094) | socket absent | the closed page after the farewell, or a non-member / signed reader of a closed document | the tools were taken away (Q532 residual (a): kept by Ed's choice) |
| storm-hidden | `#wallet.style.display = 'none'` while `stormHolding` (:3425) | ✏️ socket absent for ~1 s | between the 💡 OK and the storm landing (safety net at 4000 ms, :6433) | the pencils fly into an empty wallet |
| quill count | `#quill` holds 4→1 `<i>🪶</i>` (:6032–6036) | feathers, the last one the logo | the birth | what remains of the founding; the fourth starts a new document |
| bubble | `.walletsay` (system.css:1724–1746; `showSay`, :6185) | a fixed bubble below the socket with `.saysym` at 1.5 rem and `.saytxt` = the socket's `title` | a click on any socket; Escape, resize or an outside click closes | one sentence per tool in both channels (tooltip and bubble) |

---

## 3. Hold ladder table

| Control | Hold | What flies | Early release | Trailing-click guard |
|---|---|---|---|---|
| 🪶 commit (pre-save: title, link, first 📧 send) — `[data-confirm]` whose text has 🪶 | 1000 ms, `PEN_HOLD_MS`; timer in the document `pointerdown` listener (:6501–6543) | the last `#quill i` feather → the button, linear, r −30→0 | `penRelease` on `pointerup`/`pointercancel` (:6566–6579): `nudgeHome(flight, {floorAt: 250})` — pushed to ¼ of the arc at ≥1.8× if released earlier, 90 ms hang, then rewind at ×4; ghost cleared on landing | `penPointerDown` stays true through the hold; the click listener swallows `held && isPenCommit(held) && !penHoldFired && penPointerDown` (:4569); the hold's own synthetic `click()` runs with `penHoldFired = true` for exactly its dispatch (:6520, :6541); `if (held && !penHoldFired) penPointerDown = false` (:4588). Keyboard/script clicks act at once. |
| ✒️ commit (post-save settings, 🎩, title) | 1000 ms, same | `#penwallet i` → the button; `penGhost` ghosts pen and ∞ | same | same; additionally `holdWallet` asks `mayPen()` not the DOM (:6481) |
| 🍾 Begin (`[data-begin][data-confirm]`) | 1000 ms, same | the cork, from the **button** to `#doctitle, .doctitle` (:6475, :6510–6512) | same `penRelease` (floor 250) | same; the click then lands in `[data-begin]` → `cs.begin(now())` (:4492–4496) |
| ✏️ Propose (`[data-act="draft-propose"]`) | 3000 ms, `HOLD_MS` (session.js:3058) | the last drawn ✏️ (`.gone` slot) → the button, bezier `(.45,.05,.3,1)`, r 0→−24; `walletGhost` holds the slot; `holdInFlight = true` (session.js:3123) | `flyStop(false)` on `pointerup`, **`pointerleave`**, `pointercancel` (session.js:3128–3129): `nudgeHome({anim, el}, {floorAt: 864})`; `resumeLean` when home | none needed: `pointerdown` calls `preventDefault()` + `stopPropagation()` and the act fires from the timer (`act(id,'draft-propose')`, session.js:3125), not from a click |
| 🏛️ Hold to ask everyone (`[data-holdmotion]`) | 10000 ms, `HOLD_MS` (session-view.html:4823) | nothing — the `#assembly` ring of `room` avatars (members `in` and not clerk), seats appear at `80 + i*(HOLD_MS-800)/n` ms (:4846–4848); `.done` scales seats 1.14; motion put via `cs.openMotion` at the timer (:4851) | `disperseAssembly` on `pointerup`/`pointercancel` (:4860–4866, `.gone` then removed at 260 ms); nothing sent | `pointerdown` `preventDefault()` (:4869); no click path exists for the motion |
| 🛡️ | none — never a commit | — | — | — |
| OK (grants, gates, news) | click | after the render, `launchGrant` flies the grant's object from the OK button's rect (`pendingGrant.from`, :4516) | — | — |

Also: the spend-preview (`startLean`/`applyLean`, session.js:4011–4050) runs on any `[data-confirm]` that `holdWallet` resolves with a `sel` (so 🪶, ✒️; **not** 🍾, which has `sel: null`; not 🏛️, not ✏️ via this probe — the charter registers its own probe) — a 6 px lean along the chord over 900 ms, phase-locked by `startTime`; stopped by `pointerover` on anything that does not spend, `pointerdown`, or the button leaving the DOM; never by `:hover`.

---

## 4. Rules (W-numbered)

- **W1 Every power is an object you hold, kept where you can see it, spent by flying it.** Four currencies (🪶 ✒️ ✏️ 🏛️), four scarcity rules, one gesture (`flyGlyph`/`arcFrames`). 🛡️ is a fifth object in the toolbar but not a verb and never flies out of anything (only in, at its grant).
- **W2 The four verbs are a ladder of who has to agree**: 🪶 nobody (nothing exists), ✒️ nobody (you hold it), ✏️ enough of the room at the threshold, 🏛️ everybody. The pre-start blind founding answers are a kind of 🏛️.
- **W3 The quill line falls at the save**: 🪶 covers the acts before anybody in the world could reach the document; the pen is issued when the URL goes live. Code: `commitGlyph = !cs ? '🪶' : … '✒️'` (:4093), `holdWallet`'s `!cs` / `cs` branches (:6467, :6481).
- **W4 A member's power is limited in quantity and unlimited in scope; the founder's is unlimited in quantity and limited in scope.** ✏️ many, ∞ on ✒️/🛡️; per-setting permission is a property of the lock (the ✒️ tab), never of the wallet — `holdsPenAnywhere()` is what puts the pen in the topbar (:737–740).
- **W5 No power arrives without acknowledgment.** Each grant is a task (news-green, drawn ✔, OK); the object flies into the wallet from that press, per member on their own clock. 🪶 takes no task. Grants stage behind the constitutional OKs (`staged`, :815).
- **W6 A power is not held until it has been acknowledged.** `may* = can* && viewerIsMember() && acked(k)` (:2238–2249); `may*` is the only thing a control may ask; `can*` is what the document permits and is read only by the grant card itself.
- **W7 An offer disappears; a question you may not answer is not shown at all.** The caret (`contenteditable` follows `MAY_PROPOSE()`, session.js:150), ✏️ propose edit, the ⚔️ desk, the motion composer; `withheld = stateOf(g) === 'needs' && !MAY_JUDGE()` filtered at ingest in `bindData` (session.js:4297–4301), never per render site. ✒️ commits are the documented exception to "disappears": they are rendered **disabled** with `penWaitTitle` (see D8).
- **W8 An acknowledgment covers this holding, not the fact for ever.** `syncGrantAcks` (:790–803) drops the OK only on a seen held→not-held transition, keyed by seat and grant; a first sighting only records.
- **W9 The ✒️/🛡️ power tabs are exempt from pen gating** — laying a power down must stay possible (SURFACE Y7). (Not re-verified in code here; `commitPower` is outside this family's source list.)
- **W10 The pen blocks the founding order; every other gate/grant holds its place without blocking.** `blocksOrder = p.k === 'grant-pen' ? amFounder() && p.open() && !acked('grant-pen') : !p.isGate && !settled(p)` (:1894–1896). The rail at the save holds exactly `['grant-pen']` (journey-walk.mjs:125–131).
- **W11 A grant says who gave it, in the office's name, third person** (`grantedBy`, :6357–6391), read from `memberRecords().arrival` and `SettingState.powerFrom`, never inferred from who holds the roster.
- **W12 Every acknowledgment that confers a power persists** (`ACK_KEYS` ⊃ `GRANT_KEYS`), one `localStorage` key per document and seat, live only; loaded into `S.okd` at boot (:5614).
- **W13 Nothing rebuilds under a press.** Both polls defer while `penHold || SESSION.holding` (:5597, :5625); the pen hold re-finds the live commit control if its button was replaced (:6534–6541); `SESSION.holding` is the module-level `holdInFlight` (session.js:101, 4447).
- **W14 A completed hold clicks for you, and that click must not look like the user's** — `penHoldFired` true for exactly the synthetic dispatch (:6520–6541); the guard at :4569/:4588.
- **W15 Nothing may infer a power from the DOM.** `holdWallet` asks `mayPen()` (:6481), not `#penwallet i`, since every socket now draws its tool.
- **W16 The ghost must never become a removal.** `.gone` is `visibility: hidden`; `holdWallet` tests token existence; the trailing-click guard depends on `isPenCommit(held)` (:6555–6565).
- **W17 A hold has to say so before it is held**: the spend-preview leans the paying token on hover (render state, phase-locked, never `:hover`); a short press always carries the token ≥ ¼ of the distance (floor, not jump; push at ≥1.8× or 160 ms), then home.
- **W18 The toolbar is a toolbar, and every wallet is a socket.** All shown to everybody from the start; `notheld` ≠ `empty`; only `notheld` is struck; the strike hangs on the socket, not the glyph; `--slash` is the only red on the surface; sockets are 24 px so the navbar height does not move; a socket says what it is when pressed (`walletsay`, one sentence per tool in both channels).
- **W19 A wallet says how many, and the pen's answer is ∞** in the count slot (`.pmore`), text ∞ not ♾️, never an `<i>`. 🛡️ identical.
- **W20 A wallet must not depend on its own animation finishing** — the storm's `land` has a 4000 ms safety net (:6428–6433); `flyGlyph` has its own `ms + delay + 80` fallback (session.js:3782); `nudgeHome` a `total + 80` one (session.js:3874).
- **W21 An edit in flight is drawn exactly once** — `walletGhost` outbound, `walletShow` inbound; render state, never a DOM poke (session.js:3892–3915).
- **W22 🍾 has no wallet; the cork flies out of the button into the document**, held one second like every consequential act; the 🍾 card states its whole batch; readiness informs and never blocks except for judge-gate questions still being decided (`readinessOf`, `beginBody`, :6233–6275).
- **W23 Wallets fly out at the close**: the farewell from the 🥂 OK — ✏️s storm into the card, 🏛️ and ✒️ fly in at 640 ms, then `.gonewallet` (:6310–6323).
- **W24 The crown is the reserved powers seen from the room's side**: 👑 beside anyone holding ✒️ or 🛡️ anywhere, 📯 beside one holding none; the two powers are held and relinquished separately and one-way (CLAUDE.md `reserved`).
- **W25 One 🏛️ out per member at a time**, returned whole — `heldOut` disables the hold with *One 🏛️ each — withdraw yours first* (setup.js:900–903); the socket ghosts the glyph while out (:6108).

---

## 5. Exceptions

| # | What | Rule broken | Why | Ruling |
|---|---|---|---|---|
| X1 | 🪶 has no grant task | W5 | you are conferred your feathers by navigating to docs.vote; nothing exists to acknowledge | Q448/453, 2026-08-21 |
| X2 | 🍾 has no wallet and no socket; the cork flies out of the button, not out of a balance | W1 | beginning is a moment, not a capacity | Q516 |
| X3 | 🛡️ is in the toolbar but is not one of the four verbs, has no hold, no spend, no farewell flight | W1/W2 | a refusal is not an act that spends; it is the pen's other half | Q532(3), 2026-08-22 |
| X4 | The ✒️ commit does not disappear when the pen is unacknowledged — it renders disabled with `penWaitTitle` | W7 ("an offer disappears") | the card the commit sits on is still a card the founder is reading; the title says where the pen is | 2026-08-21 (`penOkFor`, :2257–2258) |
| X5 | The ✒️/🛡️ power tabs commit without `mayPen()` | W6 | laying a power down must stay possible for a founder who gave up their last pen while still holding shields | SURFACE Y7 |
| X6 | `grant-pen` blocks the founding order; every other gate and grant does not | C14 / W10 | everything below ✒️ commits with the very pen it hands over; 🏛️ is spent only on motions; a clerk never opens 🏛️ | Ed, 2026-08-22 |
| X7 | The 💡 Proposing gate doubles as the ✏️ grant card (`canpropose` is in `GRANT_KEYS`) | one card per decision | the gate opening *is* the grant of ✏️s; `grantNote` states the count | Q461a |
| X8 | `canjudge` is acknowledged and persisted but nothing flies | W1 | judging is a right, not an object; `ACK_KEYS` is wider than `GRANT_KEYS` for it | 2026-08-21 |
| X9 | The ✏️ socket is hidden outright during the pencil storm (`stormHolding`) | W18 (every socket always shown) | a struck-through ✏️ in the target would be a lie for the length of the flight | 2026-08-22 (:3419–3425) |
| X10 | The closed page hides the sockets (`.gonewallet`) rather than striking them | W18 | the farewell flew the tools out; a finished ceremony | Q532 residual (a), Ed: *the sockets only make sense when the document is in session* |
| X11 | `begin` is OK'd into `S.okd` but is not in `ACK_KEYS` and is not persisted | W12 | the module's `constituted` is the truth of it; the OK is the press itself | — (implicit) |
| X12 | The ✏️ hold cancels on `pointerleave`; the pen/quill/cork hold does not | hold ladder symmetry | the ✏️ hold binds per button inside `renderDoc`; the pen hold is a document listener that survives a re-render | session.js:3128; session-view.html:6577–6578 |
| X13 | The 🏛️ hold has no token and no quarter-way nudge; release disperses the ring | W17 | the assembly is the meter; there is nothing to nudge | Ed, 2026-08-18 |
| X14 | The spend-preview never previews 🍾 (`sel: null`) or 🏛️ (no `holdWallet` branch) | W17 | no token leaves a wallet for either | Q531 |
| X15 | The 🛡️ socket renders `∞` with no ghost path | W19 parity with ✒️ | nothing is ever held out of it | — |

---

## 6. Drift findings

**D1 — Hold lengths: CLAUDE.md states them in four places and they agree with each other and with the code.** `wallets › The hold ladder` (CLAUDE.md:262): "🪶 and ✒️ one second each … ✏️ held for its flight, 🏛️ the ten-second assembly-press". SURFACE C4: same. Code: `PEN_HOLD_MS = 1000` (:6462), `HOLD_MS = 3000` (session.js:3058), `HOLD_MS = 10000` (:4823). The one thing **no prose states** is the ✏️ number itself: "held for its flight" is 3000 ms in code and the figure never appears in CLAUDE.md or SURFACE.md. A checker can assert 3000; the documents cannot. Also a stale comment: session-view.html:6453 still says *"a feather spent on a founding act flies from the wallet to the button — a click, not a hold: only 🪶 happens at the speed of thought (Q444)"* immediately above the paragraph that retires it — contradicts CLAUDE.md:262 and the code two lines below.

**D2 — "🪶 `#quill` in the brand, ✏️ ✒️ 🏛️ as `#wallet` `#penwallet` `#voicewallet`" (CLAUDE.md:254) omits `#shieldwallet`.** Code has four sockets: `#wallet #penwallet #shieldwallet #voicewallet` (session-view.html:167–170). The same line says "the grants as tasks (`grant-voice`, `grant-pen`, the 💡 gate for ✏️)" — three — where `GRANT_KEYS` has four (:810). The later bullet (CLAUDE.md:292) knows about `grant-shield`; the headline entry does not. Also CLAUDE.md:272: "`GRANT_KEYS`, which is only the three that *fly*" — it is four; the code comment at :806 says "the three that *fly*" too.

**D3 — The topbar order.** CLAUDE.md:289 (`toolbar`): "Right-hand order **✏️ ✒️ 🛡️ 🏛️**". Code markup :167–170 matches. But system.css:1650–1652 still says "✏️ ✒️ 🏛️ stand on the right beside `me`, in that order" and session-view.html:6017 "✏️ ✒️ 🏛️ on the right" — three, stale.

**D4 — "a founder should have to acknowledge both separately" is in code; the code comment at the `mayShield` site contradicts it.** session-view.html:2242–2248: "**The shield rides the pen's acknowledgment** (Q532) … Giving 🛡️ a grant task of its own would be the purer reading … and is the residual on Q532". The very next line reads `acked('grant-shield')` (:2249). CLAUDE.md:292 and QUESTIONS.md:347 say the own-grant was built (d20f67a). The comment is stale.

**D5 — `localStorage['draft:grants:<slug>:<me>']`.** CLAUDE.md:254 says `<slug>:<me>`. Code: `'draft:grants:' + LIVESLUG + ':' + (cs.v.me || '')` (:6584). Matches in shape; `<me>` is the member id from the view (`cs.v.me`), not a name. Fixture mode never persists (`saveGrants` bails on `!LIVEMODE`, :6586) — CLAUDE.md's "a soft gap: the module holds no grant-OK state" still true. SURFACE E4/L8 say "`ACK_KEYS` per seat" — consistent.

**D6 — "🏛️ at arrival" (CLAUDE.md:266 "🏛️ at arrival, ✒️ at the save, ✏️ at 🍾") vs the founding order.** `grant-voice.open` is `!!cs && viewerIsMember() && !!viewerRow().in` (:1139) — arrival — but the card is at `ORDER[21]`, after `canjudge`, and `visible` requires `orderReady` (:1905–1911), which waits until every non-gate card above it is settled. So for a founder-member the 🏛️ grant arrives at the **end of the constitution**, not at arrival; for an invitee arriving into a settled document it is at arrival. CLAUDE.md's own `setup-queue` entry (:~205) says "A grant is still news rather than a question (✒️ at the save, 🏛️ at arrival) and stands alongside; it simply stands in its document place" — the two halves of that sentence pull against each other. SURFACE E4 lists `grant-voice` under "The document begins 🍾" (keys column), a third timing. `tasksFor` hangs `grant-voice` off `canjudge` (:2042).

**D7 — The pencil storm fires at the 💡 OK, not at 🍾.** CLAUDE.md:266: "✏️ at 🍾; each grant is a task and each animation fires from that press" — internally consistent once "that press" is read as the OK. Code: `pendingGrant` is set in the `[data-ok]` handler (:4516), and `launchGrant` (:6409–6434) runs `pencilStorm(g.from = the OK button's rect, → #wallet)`. SURFACE E4 ("✏️ storm" in the 🍾 row's channel) reads as if the storm is part of the begin event; it is part of the OK on `canpropose`, one member at a time. E8 has it right.

**D8 — "An offer disappears … a ✒️ commit" (CLAUDE.md:270).** Code renders the ✒️ commit **disabled** with `title = penWaitTitle` (*Your pen is waiting in your tasks — accept it and this turns.*) at :4120, :4145, :4160–4162 — it does not leave. The pen-blocks-order rule (W10) means such a card is normally not visible to the founder at all, so the disabled state is reachable only for cards outside ORDER or after a pen re-grant (Q526). CLAUDE.md's sentence and the code's `penWaitTitle` describe different behaviours for the same control.

**D9 — The pen's ∞ placement.** CLAUDE.md:293: "The ∞ goes in the **count slot** (`.pmore`, wrapped in `.pencils` like the ✏️ row)". Code :6066–6068 matches exactly (`<span class="pencils"><i>✒️</i><span class="pmore">∞</span></span>`). 🛡️ same (:6102–6103). No drift. CLAUDE.md:292 "It takes the ∞ too" — matches.

**D10 — The navbar height.** CLAUDE.md:289: "a socket taller than the 26px the avatar already sets moves every card … 24px; verify 48.5px before and after". system.css has `--nav-h: 58px` (:180) — a layout token the rails stick under (:326) — and `.me .face` 26px (:259), sockets `min-height: 24px` (:1675). 48.5 px is not stated anywhere in CSS; it is a measured value (padding 10+10 + ~27.5 content + 1 border). `--nav-h` 58 ≠ 48.5: either the token carries slack deliberately or the number in CLAUDE.md is the measured bar and the token is something else. Worth one measurement before a checker asserts either.

**D11 — SURFACE C9 vs code on *filtered at ingest*.** C9: "a question you may not answer is not shown at all — filtered at ingest". Code: `withheld` filters only `stateOf(g) === 'needs' && !MAY_JUDGE()` (session.js:4297). Everything else that "may not be answered" (e.g. motion cards for a non-member) is handled at render sites in session-view.html (`mustAct`, `visible`). The rule is true of the charter column and overstated for the constitution band.

**D12 — `walletHeld` set from `charterOn() && mayPropose()` (:3426).** CLAUDE.md `toolbar`: notheld = "a member before 🍾 or before accepting the grant". `charterOn = !!(cs && cs.textConfirmed)` (:378) — so a document whose text is confirmed but not begun also reads *held* only if `mayPropose()` (which needs `canPropose = cs.textConfirmed`, :2232, **not** `constituted()`) and `acked('canpropose')`. Since `canpropose` is hidden until `constituted()` (:1116) the ack cannot exist pre-🍾, so the outcome matches the prose — but `canPropose()` itself does not ask `constituted()`, which is one gate fewer than CLAUDE.md's "✏️ at 🍾" implies; the hide does the work.

**D13 — Farewell omits 🛡️.** CLAUDE.md `closing-card`: "remaining ✏️s and the 🏛️ fly into the card … the founder's ✒️ leaves the same way". Code :6318 flies `voicewallet` and `penwallet` only; `#shieldwallet` is simply hidden by `.gonewallet`. Prose and code agree with each other; both predate the shield's socket. Nothing says what the shield does at the close.

**D14 — `ACK_KEYS` in spec-check.** scripts/spec-check.mjs:68–72 computes `ACK_KEYS: grant.concat(arr('ACK_KEYS'))` by regex over `const ACK_KEYS = GRANT_KEYS.concat([…])` — it works today but the regex `(?:GRANT_KEYS\.concat\()?` is the only thing tying it to the concat shape; a refactor to a literal array would silently double-count. SURFACE §4 lists `grant-pen grant-shield grant-voice canpropose canjudge` as "grants and gates" — matches `ACK_KEYS`.

**D15 — Comment at session-view.html:6016–6021** ("✏️ ✒️ 🏛️ on the right: shown once their grant is acknowledged … A clerk's topbar holds nothing but 🪶") predates Q532: the sockets are now always shown and a clerk's topbar holds four struck sockets plus 🪶.

**D16 — CLAUDE.md `propose-wallet` note: "Above four it counts rather than draws (`✏️✏️✏️✏️+5`)".** Code draws **three** glyphs plus `+n` when held > 4 (`drawn = held <= 4 ? held : 3`, session.js:3940) — so five held is `✏️✏️✏️+2`, never four glyphs and a count. The example string in CLAUDE.md cannot occur.

**D17 — Quill wallet spend accounting.** CLAUDE.md: "three spent on the birth's own acts". Code counts `S.emailSent` as the third spend (:6032) — the send, not the verification; a resend is "a click rather than a hold" and spends nothing (:4122–4124). Consistent, but the resend path has no 🪶 in its text, so `holdWallet` returns null and the spend-preview never previews it — correct by W17.

**D18 — SURFACE C16 says "struck when not held, empty when spent"** — matches W18. SURFACE has no row for the hold ladder beyond C4's one sentence and no mention of the quarter-way nudge, the spend-preview, the ghost rule, or `walletsay`; those live only in CLAUDE.md and code.

---

## 7. What a checker could assert mechanically

| Assertion | Where |
|---|---|
| `GRANT_KEYS` literal equals `['canpropose','grant-pen','grant-shield','grant-voice']` and every key is a card `{ k: '…' }` with `isGate: true` | session-view.html:810; cards :1115, :1138, :1144, :1166 |
| `ACK_KEYS = GRANT_KEYS ∪ ['canjudge']`; SURFACE §4 "grants and gates" list equals `ACK_KEYS` | :811; SURFACE.md §4 |
| every `GRANT_KEYS` entry except `canpropose` has a `LANDS` row with an id that exists in the topbar markup | :6439–6443 vs :167–170 |
| `LANDS` ids ⊂ `{penwallet, shieldwallet, voicewallet}`; `#wallet` is the `canpropose` target | :6412–6433 |
| `ORDER` contains `grant-pen` immediately followed by `grant-shield`, then `chamber`; contains `canpropose, canjudge, grant-voice` contiguous; `begin` last | :1863–1868 |
| `blocksOrder` names exactly `grant-pen` as the one blocking gate | :1894–1896 |
| `PEN_HOLD_MS === 1000`; assembly `HOLD_MS === 10000`; session.js propose `HOLD_MS === 3000`; `REFUND_MS === 640`; grant inbound and farewell flights use `640` | :6462; :4823; session.js:3058, :3728; :6449, :6320 |
| `penRelease` passes `floorAt: 250`; `flyStop` passes `floorAt: 864`; `nudgeHome` default `minRate 1.8`, `push 160`, `rewind 4`, `hang 90` | :6572; session.js:3085, :3842 |
| `holdWallet` has exactly three branches (🪶 pre-`cs`, 🍾, ✒️) and the ✒️ branch calls `mayPen()`; the 🍾 branch has `sel: null` | :6465–6483 |
| each `may*` is `can*/open && viewerIsMember()/amFounder() && acked('<key>')` for its key; `acked(k) === S.okd.has(k)` | :2237–2249 |
| `session.js` exports `setWalletHeld`, `setWalletTitle`, `nudgeHome`, `startLean`, `stopLean`, `applyLean`, `addSpendProbe`, `resumeLean`, `flyGlyph`, `pencilStorm`, `arcFrames`, and a `holding` getter | session.js:4434–4447 |
| both 4 s polls test `penHold || SESSION.holding` | :5597, :5625 |
| `renderWallet` sets class `wallet notheld` when `!walletHeld`, `wallet empty` when 0, `wallet full` at cap; `drawn = held <= 4 ? held : 3` | session.js:3920–3940 |
| socket CSS: `.navbar .quill, .navbar .wallet { min-height: 24px }`; `.navbar .notheld::after { background: var(--slash) }`; `--slash` is the only `#8e…` red token; `:root[data-slash="muted"]` exists; `.navbar .gonewallet { display: none }`; `.wallet .gone`, `.navbar .powerwallet .gone`, `.navbar .quill i.gone` are `visibility: hidden` | system.css:1674–1708, :168, :182, :1695, :284, :1656, :1659 |
| `SAY` has a branch for each of `quill, wallet, penwallet, shieldwallet, voicewallet` and every socket's `title` is `SAY(el).t` | :6150–6181; :6110–6116 |
| the ✒️ and 🛡️ sockets' held markup is `<span class="pencils"><i>G</i><span class="pmore">∞</span></span>` with the text character U+221E, not U+267E | :6066–6068, :6102–6103 |
| `grantsKey()` prefix is `'draft:grants:'` and `saveGrants` filters `S.okd` by `ACK_KEYS` | :6584–6587 |
| `grantedBy` returns a non-empty office-named sentence for every `ACK_KEYS` entry when `c.open()` | :6357–6391 |
| `BEGIN_BATCH` has four lines naming ✒️ 🛡️ ✏️, judging and the stamp | :6240–6244 |
| `journey-walk` asserts the rail at the save is exactly `['grant-pen']` and no `/api/` response ≥ 400 | scripts/journey-walk.mjs:38, :125–131 |
| measured: navbar height before/after any socket change (CLAUDE.md says 48.5 px; `--nav-h` token is 58 px — see D10) | system.css:180 |
