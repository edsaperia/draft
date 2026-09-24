# Runbook — showing docs.vote/d/demo

**Written for Ed's demo of 2026-09-24.** What the demo is and why each piece is the way it is:
`design/DEMO.md` (Q1535). What an operator needs: `docs/OPERATING.md` §12. This page is the plain
steps for the evening; where it and OPERATING disagree, OPERATING wins.

## Before the evening (once)

1. **The code has to be live.** Branch `demo-int` holds everything; nothing of it is on
   docs.vote until it is merged to `main` and pushed — and a push is a deploy. Do it well before
   the demo, never while a real room sits on the host.
2. **Two settings on the Render dashboard** (service `draft`, *Environment*), both new:
   - `DRAFT_DEMO_KEY` — your passphrase for the panel, e.g. `oven-marble-quiet-harbour-seven`.
     Not the admin key.
   - `DRAFT_DEMO_ANTHROPIC_KEY` — the Claude key the bots spend. Best made in its own Anthropic
     Console workspace, with a monthly limit set there. Without it the demo still works, but the
     panel says *No Claude key on this host* and ▶️ stays dark.
   Saving environment variables restarts the host; a restart builds a fresh demo.
3. **Check it is built**: `curl -s https://docs.vote/healthz` shows `"demo":{"state":"built",…}`.

## Setting your browser (once per browser)

4. On the laptop you will present from, open **`https://docs.vote/d/demo?demokey=<your key>`**.
   The address bar turns back into `docs.vote/d/demo` and the **demo panel** appears at the
   bottom left: a dashed orange strip. That browser keeps it for a year.
   - Nothing appears? The key was mistyped. Five wrong tries in a minute lock your address out
     for five minutes — wait, then try once more, carefully.
   - A different browser or a private window needs this step again.

## The panel, left to right

- **`demo built · gen N · built … ago · N visitors`** — which build of the demo this is, and how
  many phones have joined it.
- **The seat** — who you are sitting as. Pick **Professor Lucia Ferrante — Founder** to show the
  Founder's side, or any speaker to show an ordinary member's. The page reloads as that person.
  The bots sit in the speakers' seats in list order (with 4 bots, the first four speakers under
  the Founder). Sit in a bot's seat and **that bot sits out** while you are there — the readout
  says *4 (1 is you)* — and it picks up again as soon as you switch away. You never share a
  seat with a bot.
- **↺ Reset** — asks to confirm, then throws the whole demo away and rebuilds it from the prepared
  programme: every visitor, every proposal, every vote, gone. It also stops the bots.
- **▦ QR** — the join code, full screen (below).
- **▶️ / ⏸️** — start or pause the bots (below).
- **bots · pace · model** — how many bots (4 up to 13), how busy (calm, lively, frantic), and
  which Claude (Haiku 4.5, the default; Sonnet 5; Opus 5.5). These can only be changed while the
  bots are paused or stopped.
- **The readout** — what the bots are doing: the run's clock (*0:25 of 10:00*), proposals (and
  swaps), votes, and the spend so far (*$0.31 of $3*).

## Letting the room join

5. Press **▦ QR**. The code fills the screen, black on white, with `docs.vote/d/demo` under it.
   Put that window on the projector (or drag it to the projector screen before pressing).
   It is **one code for the whole room**.
6. People scan it and land on the demo with **👋 Try It** already open. One tap and they are a
   member with a made-up name (*Crispy Basil*), ready to vote and propose — no email, nothing to
   accept first.
   - **One seat per phone**: scanning again brings a phone back to its own seat.
   - A phone that does nothing for **30 minutes** leaves the document; scanning again joins anew.
7. **Escape**, the ✕, or a click on the white closes the code.

## The bots

8. Choose the number of bots, the pace (**lively** is right for a demo) and the model (**Haiku
   4.5**), then press **▶️**. Within a minute the speakers start voting, proposing new wordings
   and swapping sessions, each partial to their own session.
9. **⏸️** pauses them; **▶️** carries on. **Keep the panel's tab open** — the bots pause by
   themselves:
   - **2 minutes after the tab closes** (or the laptop sleeps) — the tab is the heartbeat;
   - **after 10 minutes of running** — press ▶️ for another ten;
   - **at $3 of Claude spend in a run** — press ▶️ for a fresh $3.
   The readout says which pause it was.
10. Never run **frantic** if a real group is using docs.vote at the same time — the panel says so.

## If something goes wrong

- **Someone wrote something you would rather not show** → **↺ Reset**. That is the remedy; nothing
  moderates.
- **The bots are too busy, or doing something odd** → **⏸️**.
- **You want a calm screen for the projector** → open **`docs.vote/d/demo/feed`** there: the
  spectator feed, a dark timeline of what was proposed and what passed, made for a projector.
  It needs no key and shows no controls.
- **The panel has gone** → open `docs.vote/d/demo?demokey=<your key>` again.
- **▶️ is dark and the readout says *No Claude key on this host*** → `DRAFT_DEMO_ANTHROPIC_KEY` is
  not set (step 2).
- **Reset says *the preset did not build*** → the prepared programme file has an error; the old
  demo keeps running, so carry on with it (or ⏸️ the bots and use it as it is).
- **The page shows a maintenance message** → the host is being deployed or restarted; wait a
  minute. A restart forgets the demo and builds a fresh one — everyone who joined has to scan
  again.

## Afterwards

11. Press **⏸️** (the bots would pause by themselves within two minutes of closing the tab
    anyway). Optionally **↺ Reset**, so the next person to open `/d/demo` finds it fresh.
