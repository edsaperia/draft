# Runbook — a room of real people on docs.vote

**Written for the room of 2026-09-20** (Ed, the night before: *the demo is tomorrow*), from the
operator workarounds in the user-flow issues #29–#74 and the two outages of 2026-09-19 (Q1469,
Q1470). `docs/OPERATING.md` wins wherever the two disagree; this page cites it rather than
restating it. Re-read it before the next room and delete what has been fixed since.

**Rule zero: nothing is pushed on the day.** A push to `main` is a deploy, a deploy pauses every
open page, and on 2026-09-12 one split a demo document for good (Q1345). The last push is the
night before (Ed's issues review, item 18: *one deploy Friday or Saturday, never Sunday*).

## The morning, at least an hour before

1. **Read `/healthz`.** `build` and `booted` are last night's commit, `paused` is `null`,
   `documentsStalled`, `documentsQuarantined` and `errors.total` are 0.

       curl -s https://docs.vote/healthz

2. **No bots are running, anywhere.** Boot time is the liveness risk: a host that must replay a
   big room cannot come back inside Render's health-check window (Q1470), and a bot room is what
   grows one overnight. Small rooms stay where they are (Ed, 2026-09-19: *leave the rooms, just
   make sure no bots are running*); `documents` in `/healthz` should be the number you expect.
3. **Consider one restart, now and not later**, for a fresh heap: both unexplained deaths of
   2026-09-19 followed hours of uptime under a big room, and `/healthz` reports no memory (#70).
   OPERATING §3, *Restarting the live host*: pause, then *Manual Deploy → Restart*, then read
   `/healthz` again. Last night's push was a full deploy, so the restarted host serves the same
   page files (`surface: null` is right).
4. **Found the document yourself, early**, and open it on the machine that drives the projector.

## Setting the document up

- **Invite by email; leave 🤝 shut.** `invite` is on the seated path, which no limiter touches;
  the stranger's door is budgeted per network address and a venue is one address (#69).
- **Set 👥 as a share, or a count no higher than half the room** — a larger count is printed in
  the constitution while the engine adopts at half (#72).
- **Let the clock close it.** Set ⏰ to the minute you want the close; no press closes a document
  on docs.vote, and the dev host's ⏭ invents signatures (#74).
- **The room can move the close, and will.** Moving the closing time is an ordinary proposal
  (SPEC §9.6): in the rehearsal of 2026-09-20 a bot moved ⏰ two hours on and the rest approved
  it, five minutes before the document was due to close. If the close has to hold, **keep 🛡️ on
  ⏰ at 🍾**, so a carried change to it waits on your Accept — and then answer it.
- **Never script "a member leaves, then their proposal carries"** (#65).

## What to tell the room

- **Follow the link in your invitation mail first, then keep that tab.** A seated page meets no
  limiter; twenty unseated pages on one Wi-Fi share one budget (#69, raised the night before to
  forty phones' worth).
- **Put the document's address on a slide.** A link that says *already used* — a mail scanner or
  the Back button spent it (#67) — is answered at the address itself: 📧 *Log In* mails a fresh
  one. Anybody on a Microsoft 365 or Proofpoint work address should use a personal one.
- **Press OK on your welcomes as they arrive.** A member who has not is shown nothing that is
  waiting (Q1478; Ed, 2026-09-19: as built for this room, and said aloud).
- **On a phone: keep it upright, and press ✓ rather than leaving a choice selected while you
  talk** — pull-to-refresh discards it (#73).

## The projector

- The feed is `docs.vote/d/<slug>/feed`. Since the night before it says so itself when the host is
  paused, when the store has stopped saving, or when its own poll was refused (#68); a reload is
  still the first thing to try on a screen that looks wrong.
- **A proposal that lost, or that the Founder refused, stays on the feed as *New proposal*** (Ed,
  2026-09-19: left for this room). Only a proposal its author takes back leaves.

## If something goes wrong

| What you see | What to do |
|---|---|
| One member's page looks stale or odd | They reload — after proposing or copying whatever they are typing: an unproposed draft lives only in the page. |
| *This link has already been used* | The page's own resend form, or 📧 *Log In* at the document's address. |
| Every page draws the maintenance modal | The host is paused. It lifts itself within fifteen minutes; by hand, `POST /api/admin/resume` with `DRAFT_BOT_KEY` (OPERATING §3). |
| A red flag, bottom of the page | The document is `stalled` — the store is refusing its saves. OPERATING §11. Do not restart on a guess; read the error log first. |
| `/healthz` does not answer | Render dashboard → `draft` → **Logs first** (nobody has yet read the log of a death — Q1470 — and one screenshot settles the heap guess), then *Restart*. A small store is back in under two minutes. |
| It will not come back | `docs/runbooks/wipe.md`, *When the shell will not open*. The room's document is lost; found a new one and re-invite. |

**To watch it while the room runs** (from any terminal, every thirty seconds):

    while true; do curl -s -m 10 https://docs.vote/healthz | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const h=JSON.parse(s);console.log(new Date().toTimeString().slice(0,8),'up',h.uptimeSeconds,'docs',h.documents,'stalled',h.documentsStalled,'paused',h.paused,'errors',h.errors.total)}catch(e){console.log(new Date().toTimeString().slice(0,8),'NO ANSWER')}})"; sleep 30; done

## Afterwards

Export before deleting anything (`docs/runbooks/backup-and-restore.md`), and write down what
surprised the room while it is fresh: every one of those is a question or an issue.
