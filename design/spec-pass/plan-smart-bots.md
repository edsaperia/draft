# Smart bots — ruled by Ed on 2026-09-23, Q1510

**What this is.** Ed, 2026-09-23: *it would be nice to have a bot test harness
that had smarter bots that interact with the document more intelligently;
maybe sonnet level? They read the document and proposals and make intelligent
choices, based on a set of personalities* — and, shaping it the same morning,
*I want to be able to add them to rooms along with a prompt; invite as member
as they are now with a prompt afterwards like "john.smith@bots.docs.vote makes
helpful suggestions and doesn't vote" or "refuse.everything@bots.docs.vote
always votes for status quo"*. **This file is the contract** for the build; it
is deleted once built, its notes lifted into `design/DECISIONS.md`.

**Precedence.** SPEC and SURFACE win over this file; CLAUDE.md's conventions
bind every commit. The bots are **members like any other** and speak only the
member HTTP surface (`GET /api/d/:slug/view`, `POST /api/d/:slug/cmd`) with a
seat's own cookie — no backdoor, no engine access, no view a person would not
get (CLAUDE.md, V1 decisions: *no sim backdoor*).

## The rulings (Q1510)

1. **A prompt rides the invitation, as a hidden feature.** On the ✉️ invite
   box, text typed after an address **at `bots.docs.vote`** is that bot's
   prompt: `john.smith@bots.docs.vote makes helpful suggestions and doesn't
   vote`. Nothing on the surface explains it; for any other address the box
   behaves exactly as today (an address with trailing text is refused as it
   is now).
2. **The prompt reaches the harness through the bot outbox**, beside the
   login link it already carries (`bot-outbox`, `isBotAddress`,
   `GET /api/bots/outbox` under `DRAFT_BOT_KEY`). It is never in any member's
   view, never in the document's log, never on the feed.
3. **Every bot is smart.** A bot invited without a prompt gets the default:
   *a thoughtful member who reads carefully and votes their honest view*. The
   dice bots stay in `room-bots` for speed work (crowded races, load).
4. **Sonnet-level, on Ed's Max plan**: the model is `claude-sonnet-5`, called
   through the Claude Agent SDK as `packages/sim-harness/src/subscription-persona.ts`
   already does (single-turn, tool-less, `settingSources: []` so no CLAUDE.md
   leaks in). No API key, no bill; personal use on Ed's machine.
5. **Purpose: a room to watch.** Rooms of people-like members with a
   one-line *why* per act in the harness log; not a CI guard (a model is not
   deterministic).

## Stage 1 — the prompt at the invite (page + server; needs a deploy)

- **Page** (`design/`): the ✉️ box's send, where the typed text starts with an
  address whose domain is `bots.docs.vote` followed by whitespace and more
  text, sends the address as the invitee and the rest as `botPrompt`. Every
  other input unchanged. Copy: none (hidden).
- **Server** (`packages/server`): the invite commands (the Founder's direct
  invite and a member's invitation motion alike) accept an optional
  `botPrompt` — **refused unless `isBotAddress(email)`**, capped (500
  characters), trimmed. It is **not** written into the document's log: the
  host files it straight into the bot outbox as a prompt record keyed by
  document slug and address (`{ kind: 'prompt', slug, to, prompt, at }`), at
  the moment the command is accepted, so a motion carried later still has
  it. **Re-prompting a bot already in the room**: inviting the same bot
  address again with new text files a new prompt record even though the
  invitation itself is refused as a duplicate (its ordinary refusal stands on
  the page) — the latest record wins. That is how Ed changes a personality
  mid-room.
- **Guards**: `bots.test.ts` — a bot address with a prompt files a prompt
  record; a non-bot address with `botPrompt` is refused; the prompt is in no
  view, no log entry, no feed entry; a second prompt for a seated bot files
  and supersedes. `invite-walk` unchanged and green.

## Stage 2 — the harness (`scripts/smart-bots.mjs`; local only)

`npm run smart-bots -- <url> [--key] [--min 30s] [--max 5m] [--for 60m]
[--only a@bots.docs.vote,…]`, attaching like `room-bots` (read its header):
`--key` reads the bot outbox on docs.vote with `DRAFT_BOT_KEY`, otherwise the
dev outbox. Reuse room-bots' seating (outbox → login link → cookie per seat);
move what both need into `scripts/lib/` rather than copying.

Each bot, on its own jittered clock:

1. **Reads its seat's view** and builds a compact brief: the document text
   with line numbers; the pairs and questions dealt to *this* seat (the race
   cards, motion ballots, answer cards); what it has proposed and their
   state; news owed an OK; its wallet (✏️ count). Only what that seat's view
   holds — the brief is built from the view and nothing else.
2. **Asks the model for one act** with a JSON schema: `judge` (which pair,
   `a`/`b`/`tie`), `propose` (lines replaced, the new text, a rationale),
   `withdraw`, a motion vote or move, `ok` (a news key), or `wait`, plus a
   one-line `why`. The system prompt is the bot's prompt (or the default)
   over a short fixed frame: what docs.vote is, what each act does, that it
   is one member among others, that it must stay in character.
3. **Validates the act against the view** (the pair is really dealt, the
   lines really exist, the wallet has a ✏️) and sends it through the same
   commands a page sends; a refusal is logged with its reason, never retried
   blind.
4. **Logs one line**: time, bot, act, target, *why*.
5. **Re-reads its prompt** from the outbox each cycle (Stage 1's latest
   record wins), so a re-prompt lands within one cycle.

Ends on `--for`, Ctrl-C, or the document closing, with a **report**: acts per
bot by kind, refusals with reasons, page or command errors, and any moment a
bot's *why* says it could not tell what it was looking at (a surface
finding).

**Guards**: a unit test for the brief builder over a recorded view (blind:
no author, no standings); a smoke run documented in the script's header —
three bots with contrasting prompts on a fresh dev server for ten minutes,
every bot acting, zero page errors — run by hand, **not in CI** (it spends
Ed's plan and is not deterministic).

## Not built

A bot marker on the page; bots reachable from the page by prompt edits other
than re-inviting; running bots on the server; API-key transport (Ed chose
the Max plan; sim-harness keeps its API persona for measurement runs).

## Stage notes

(One line per stage as it lands: commit, what was found, what was left.)
