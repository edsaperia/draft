#!/usr/bin/env bash
# ci-walks.sh <group> — one group of CI's `walks` job (plan-ci-speed.md §2,
# Stage 1), or of the sprint tier's (Q1546). The job used to run every walk
# in series on one runner behind one server, 43 minutes a push; it is now a
# matrix over the groups below, each on its own runner with its own server,
# so a push is decided by the slowest group rather than by the sum.
#
#   bash scripts/ci-walks.sh seat-member|seat-clerk|journey|motions|doors|repros|repros-b
#   bash scripts/ci-walks.sh sprint-doors|sprint-motions|sprint-pages
#
# (`repros`, since Stage 4: the guards CLAUDE.md named and no workflow ran;
# `repros-b` its second half. The `sprint-*` groups are the sprint tier's,
# run by .github/workflows/sprint.yml and never by ci.yml — their header,
# above the first of them, says why.)
#
# **Q917 (a)'s guarantee, kept in shell.** In the old job every walk was a
# step with `if: always()`, so one walk's failure could not hide the next
# one's. Here: every walk in the group runs whatever the one before it did,
# each walk's output sits inside its own `::group::`, one verdict line
# follows each, and the script exits red at the end if any walk was red.
# Nothing is translated: a walk's own exit code is its verdict, so the seat
# matrix's exit 3 (an unread §2 cell, Q1354) is red here exactly as any
# other non-zero is.
#
# **The servers are the job's, unchanged.** Every group that attaches boots
# `npm run server` (the dev path: no RESEND_API_KEY, so the dev outbox and
# the ladder's ⏭ exist) with its own PORT, DRAFT_DATA_DIR and
# DRAFT_BASE_URL, and room-walk keeps its isolated cooldown-0 second server
# inside `doors`. The variables are given to the server process alone, never
# exported into this shell, so the walks see exactly the environment they
# saw as steps — a walk reads its base from its argument first, and a
# stray PORT or DRAFT_BASE_URL would otherwise be a fallback it picks up.
#
# Runs locally too (Git Bash or any POSIX shell): without RUNNER_TEMP it
# works in a fresh temp directory and prints where. Ports are distinct per
# group so two groups can run side by side on one machine.
set -u

GROUP="${1:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 2
TMP="${RUNNER_TEMP:-$(mktemp -d)}"
SHA="${GITHUB_SHA:-$(git rev-parse HEAD)}"

case "$GROUP" in
  seat-member) PORT_MAIN=8161 ;;
  seat-clerk)  PORT_MAIN=8163 ;;
  journey)     PORT_MAIN=8165 ;;
  motions)     PORT_MAIN=8167 ;;
  doors)       PORT_MAIN=8169; PORT_ROOM=8162 ;;
  repros)      PORT_MAIN=8171; PORT_DESIGN=8164 ;;
  repros-b)    PORT_MAIN=8173; PORT_DESIGN=8166 ;;
  sprint-doors)   PORT_MAIN=8175; PORT_DEMO=8168 ;;
  sprint-motions) PORT_MAIN=8177 ;;
  sprint-pages)   ;;
  *) echo "usage: ci-walks.sh seat-member|seat-clerk|journey|motions|doors|repros|repros-b|sprint-doors|sprint-motions|sprint-pages"; exit 2 ;;
esac

PIDS=()
stop_servers() {
  for pid in "${PIDS[@]}"; do
    # npm → tsx → node: take the children down with the wrapper, or the
    # port stays held (memory: TaskStop orphans tsx)
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill -TERM "$pid" 2>/dev/null || true
  done
  if [ "${GITHUB_ACTIONS:-}" = true ]; then pkill -f 'src/main.ts' 2>/dev/null || true; fi
}
trap stop_servers EXIT

# boot <name> <port> [extra VAR=value ...] — sets BOOTED to the base URL.
# Never called in $(...): the subshell would keep the PID from stop_servers.
# Five variables and one absence, as the job always set them.
# DRAFT_DATA_DIR keeps the log out of packages/server/data; DRAFT_BASE_URL
# must name 127.0.0.1 rather than the default localhost, because the magic
# links the outbox hands back are built from cfg.baseUrl and the walks
# attach at 127.0.0.1 — a link on the other origin lands the page on a
# different origin from the one the walk started at, which is the cookie
# trap applicants-walk's DOCBASE comment describes (and `devCrossSite`
# refuses the ladder's POST without it). DRAFT_BUILD_SHA names the commit
# in x-build. And **no RESEND_API_KEY**: its absence is what selects the dev
# outbox and makes devMail true, and the ladder bar's ⏭ exists only then.
boot() {
  local name="$1" port="$2"; shift 2
  local base="http://127.0.0.1:$port"
  local log="$TMP/walk-server-$name.log"
  env PORT="$port" DRAFT_DATA_DIR="$TMP/walk-data-$name" DRAFT_BASE_URL="$base" \
    DRAFT_BUILD_SHA="$SHA" "$@" npm run server > "$log" 2>&1 &
  PIDS+=("$!")
  # poll rather than sleep: a fixed wait is either slow or flaky
  local up=""
  for _ in $(seq 1 60); do
    if curl -fsS -o /dev/null "$base/healthz" 2>/dev/null; then up=1; break; fi
    sleep 0.5
  done
  if [ -z "$up" ]; then
    echo "::error::the $name server never answered /healthz on $port — its log follows" >&2
    cat "$log" >&2
    exit 1
  fi
  BOOTED="$base"
}

# boot_design <port> — the static design server (`npm run design`), for a
# walk that opens the fixture pages the product server does not serve.
# Sets BOOTED like boot().
boot_design() {
  local port="$1" base="http://127.0.0.1:$1"
  local log="$TMP/walk-server-design.log"
  node scripts/design-server.mjs "$port" > "$log" 2>&1 &
  PIDS+=("$!")
  local up=""
  for _ in $(seq 1 60); do
    if curl -fsS -o /dev/null "$base/session-view.html" 2>/dev/null; then up=1; break; fi
    sleep 0.5
  done
  if [ -z "$up" ]; then
    echo "::error::the design server never answered on $port — its log follows" >&2
    cat "$log" >&2
    exit 1
  fi
  BOOTED="$base"
}

FAILED=()
VERDICTS=()
# walk <label> <command...> — run one walk to its end, whatever it returns
walk() {
  local label="$1"; shift
  local start=$SECONDS code
  echo "::group::$label"
  echo "\$ $*"
  "$@"
  code=$?
  echo "::endgroup::"
  local secs=$(( SECONDS - start ))
  local line
  if [ "$code" -eq 0 ]; then
    line="PASS  $label  (${secs}s)"
  else
    line="FAIL  $label  (exit $code, ${secs}s)"
    FAILED+=("$label")
    echo "::error title=walk red::$label exited $code"
  fi
  VERDICTS+=("$line")
  echo "verdict · $line"
}

echo "walks group $GROUP · build $SHA · temp $TMP"

case "$GROUP" in

  # **The seat matrix** (Q1205, Ed 2026-09-14: *fix 1282, then the harness
  # joins CI*). Seven seats × three epochs, asserting SURFACE §2's Audience
  # column per seat per step — the only guard over that column anywhere.
  # Both hats, because green means both; each hat is its own document and
  # its own run (the harness loops over them with nothing carried between),
  # so one hat per group asserts exactly what `--hat=both` did, in parallel.
  # The clerk hat's `ifHat: 'member'` rows — E10, E11, E39 and the removal
  # motion they hang off — are issue #17's F4 and are not asserted on the
  # clerk hat yet.
  #
  # **Exit 3 reddens the group** (Q1354, Ed 2026-09-14: *a cell nobody has
  # written a rule for reddens the job until it is read*). A §2 cell the
  # harness cannot read is *no rule*, and since Q1356 so is a row that passed
  # over an empty audience — red on purpose, never forgiven here, never a
  # predicate invented in the script. The payload goes to the group's
  # artifact rather than into the tree, where it is gitignored by design.
  #
  # **The sprint tier's since Q1546 (d)** (Ed, 2026-09-26): sprint.yml runs
  # these two groups, never ci.yml. At the push, `spec-check` runs
  # `seat-matrix --static`, the same reading of the tables, so an unread §2
  # row is still red in seconds; what only a run can see is read here.
  seat-member|seat-clerk)
    HAT="${GROUP#seat-}"
    boot "$GROUP" "$PORT_MAIN"; BASE=$BOOTED
    walk "seat-matrix --hat=$HAT" npm run seat-matrix -- "$BASE" --hat="$HAT" --out="$TMP/seat-matrix-$HAT.json"
    ;;

  # the founding → 🍾 → grants → caret → proposal on the live path, which the
  # probes and founding-walk never reach; the long single walk, so alone.
  # WALK_TIMING=1 (Stage 6): every line carries the milliseconds since the
  # one before, so the log is the walk's profile — `sort -t+ -k2 -n` on it
  journey)
    boot journey "$PORT_MAIN"; BASE=$BOOTED
    walk "journey" env WALK_TIMING=1 npm run journey -- "$BASE"
    ;;

  motions)
    boot motions "$PORT_MAIN"; BASE=$BOOTED
    # **the places** (Q1492): a selection dragged across an open editing card
    # made a second place over the lines of the first, and the host refused
    # the patch whole with the member's work in it.
    walk "overlapping-sites" npm run overlapping-sites -- "$BASE"
    # **a settings motion composed with real key presses** (Q1486): the only
    # walk that types into a field composer rather than setting `.value` or
    # posting by `fetch`.
    walk "rate-motion" npm run rate-motion -- "$BASE"
    ;;

  doors)
    boot doors "$PORT_MAIN"; BASE=$BOOTED
    # room-walk's own server, for **isolation**: the one walk that builds a
    # room rather than a document (fifteen members in phase A, the
    # twenty-strong ladder cast in phase B). `DRAFT_COOLDOWN_MS=0` is stated
    # though the host default is 0 since R-086, because room-walk refuses a
    # server whose `/healthz` reports any other value.
    boot room "$PORT_ROOM" DRAFT_COOLDOWN_MS=0; ROOM_BASE=$BOOTED

    # 🪪's three prices are one assertion each; `assembly` is the one that
    # caught a product bug at the push (Q1546), so it stays here and the
    # other two run in `sprint-doors`
    walk "applicants-walk --price=assembly" npm run applicants-walk -- "$BASE" --price=assembly
    # the four live-only news families, opened on a live document at both
    # widths (Q1541 stage 2): a release, an amendment, a mail give-up, a departure
    walk "news-walk" npm run news-walk -- "$BASE"
    walk "news-walk --width=390" npm run news-walk -- "$BASE" --width=390 --height=844
    # **The first keys into an empty column**: real key presses, the server
    # compared with the literal strings typed
    walk "first-keys-walk" npm run first-keys-walk -- "$BASE"
    walk "ladder" npm run ladder -- "$BASE"
    # the whole loop: propose → every member served → vote → adopt, twice,
    # then the 🛡️ park-and-crown path on a ladder document (Q1178)
    walk "room-walk" npm run room-walk -- "$ROOM_BASE"
    ;;

  # **The guards that ran nowhere** (plan-ci-speed.md Stage 4; the shape
  # issue #17 found on 2026-09-17). Each is named in CLAUDE.md as the guard
  # over a gotcha, and until this group none was run by any workflow — so
  # *red on the pre-fix page* was worth nothing, nothing ran the page.
  # `spec-check` now lists any guard CLAUDE.md names that no workflow runs.
  repros)
    boot repros "$PORT_MAIN"; BASE=$BOOTED
    boot_design "$PORT_DESIGN"; DESIGN_BASE=$BOOTED
    # a Windows paste puts no carriage return in a draft (Q1491). Serves
    # design/ itself
    walk "crlf-paste" npm run crlf-paste
    # a paste keeps only the backslash escapes docs.vote needs (Ed,
    # 2026-09-24, ruling 14). Serves design/ itself
    walk "escape-paste" npm run escape-paste
    # a judged card that races the 4 s poll files as closed (Q1493 (a))
    walk "poll-race" npm run poll-race -- "$BASE"
    # an unproposed draft follows its paragraph (Q1463)
    walk "stale-key" node scripts/repro/stale-key.mjs "$BASE"
    # Enter at a clause's end makes a gap the sentence is not torn from
    # (Q1461); `--gap` is the half that needs no bots and asserts
    walk "focus-steal --gap" node scripts/repro/focus-steal.mjs "$BASE" --gap
    # a heading's `#` is reachable from the column (Q1467); the fixture page,
    # so the design server
    walk "heading-marker" node scripts/repro/heading-marker.mjs "$DESIGN_BASE"
    # a rename has its tab (Q1474)
    walk "title-motion-tab" node scripts/repro/title-motion-tab.mjs "$BASE"
    ;;

  # **The second half of the repros** (2026-09-23): the group had grown to
  # twelve minutes with the P1 batch's guards and set the push's time, so the
  # long wrong-line-room cases and the batch's own guards run beside it on a
  # runner of their own, with their own two servers.
  repros-b)
    boot repros-b "$PORT_MAIN"; BASE=$BOOTED
    boot_design "$PORT_DESIGN"; DESIGN_BASE=$BOOTED
    # a proposal aims at its own line: a record's span in one line space
    # (Q1488, `record`). Its sibling case CLAUDE.md names, a seed that is
    # not an origin (Q1483, `shapes`), is four minutes and runs in
    # `sprint-motions` since Q1546. The walk's other six cases were green
    # too when this group was built, but the whole walk is twelve minutes on
    # its own, which would make this the slowest group by half
    walk "wrong-line-room --case=record" node scripts/repro/wrong-line-room.mjs "$BASE" --case=record
    # the P1 batch's own guards (2026-09-23): Enter at a lane's end makes a
    # line (#78, the fixture page); a refused vote or withdrawal is taken
    # back and a hung command releases the chain (#37); a carried change
    # parked on the Founder's 🛡️ is the Founder's to crown (#32, Q1475)
    walk "lane-enter" node scripts/repro/lane-enter.mjs "$DESIGN_BASE"
    walk "refused-acts" node scripts/repro/refused-acts.mjs "$BASE"
    walk "crown-rail" node scripts/repro/crown-rail.mjs "$BASE"
    # the spectator feed's scroll hold (#87) — no server, design/feed.html
    # from disk
    walk "feed-scroll-hold" node scripts/repro/feed-scroll-hold.mjs
    # a stranger reads a closed document's ✔s where 🌍 lets them (Q1508)
    walk "stranger-records" node scripts/repro/stranger-records.mjs "$BASE"
    # one OK per clause, and OK walking to the next owed record (Q1536)
    walk "review-walk" node scripts/repro/review-walk.mjs "$BASE"
    ;;

  # ======================================================================
  # **The sprint tier's groups** (Q1546 (b), Ed 2026-09-26), run by
  # .github/workflows/sprint.yml on a push to main that carries a merge, and
  # by hand — never at a plain push. The audit of all 215 CI runs since
  # 2026-08-20 found five real product catches at the push and none of them
  # by these fifteen guards, which cost about half the push's runner-minutes.
  # Ed moved all fifteen here, and ruled with them (Q1547) that **a walk or
  # repro written for one bug joins these groups from its first day**: the
  # push groups above grow only by Ed's word. `seat-member` and `seat-clerk`
  # at the top of this file run in the sprint tier too since Q1546 (d), the
  # tables' half of their no-rule verdict being `spec-check`'s at the push.
  # ======================================================================

  # the doors and the demo: a product server, and the demo's stub-bot server
  sprint-doors)
    boot sprint-doors "$PORT_MAIN"; BASE=$BOOTED
    # slug-walk asserts what happens when an address is *taken*, so one has
    # to be taken first — the curl its own header documents. -fsS, so a
    # refusal names itself rather than surfacing later as a walk that cannot
    # find its collision.
    if ! curl -fsS -o /dev/null -X POST "$BASE/api/docs" \
        -H 'content-type: application/json' \
        -d '{"title":"Test Charter","slug":"test-charter","email":"a@b.com"}'; then
      echo "::error::could not reserve test-charter for slug-walk"; exit 1
    fi
    # the founder answering their own delegated question, alone in the
    # room, and 🍾 refusing to begin on one voice (R-015, R-045).
    # Self-starting: it serves design/ itself and takes no base URL (Q1177)
    walk "founder-answers" npm run founder-answers
    # 🪪's other two prices (`assembly` runs at the push, in `doors`)
    walk "applicants-walk (proposal)" npm run applicants-walk -- "$BASE"
    walk "applicants-walk --price=pen" npm run applicants-walk -- "$BASE" --price=pen
    # a member's page across 🍾 when every power is laid down (Q1364)
    walk "after-begin-walk" npm run after-begin-walk -- "$BASE"
    # a member's invitation motion on the surface (Q1370)
    walk "invite-walk" npm run invite-walk -- "$BASE"
    # a member arrives while the founder has left 🎩 unanswered and delegated
    # ⏱️ 👥 (Q1365, Q1372)
    walk "member-questions-walk" npm run member-questions-walk -- "$BASE"
    walk "slug-walk" npm run slug-walk -- "$BASE" test-charter
    # **the demo's bots** (design/DEMO.md Stage 4, Q1535) on their own server:
    # the stub model, so CI never calls Claude, the walk's demo key, and a
    # ten-second heartbeat lapse — ▶️, ⏸️, the lapse, the run clock and the cap
    boot demo "$PORT_DEMO" DRAFT_DEMO_KEY=walk DRAFT_DEMO_STUB=1 DRAFT_DEMO_LAPSE_MS=10000; DEMO_BASE=$BOOTED
    # the whole demo first (Stages 1–5): key, Reset, two phones, the bots on
    # the demo document, a visitor's vote, ⏸️ ▶️, the lapse, Reset clearing
    # it all — then the phones' own page walk — and only then demo-bots-walk,
    # whose dev target route re-points the bots at a ladder document
    walk "demo-walk" npm run demo-walk -- "$DEMO_BASE"
    walk "demo-join" node scripts/repro/demo-join.mjs "$DEMO_BASE" --key=walk
    walk "demo-bots-walk" npm run demo-bots-walk -- "$DEMO_BASE"
    ;;

  # the aim, the pen, the line and the red bar: a product server
  sprint-motions)
    boot sprint-motions "$PORT_MAIN"; BASE=$BOOTED
    # **the aim** (Q1477, the nh2026 convention): a page that polled across
    # 🍾 kept the founder's text, drew the document in a line space that was
    # not the engine's and aimed its proposals two lines low. The plan's own
    # hunt — a rival's insertion at the head of the text, a draft begun
    # beneath it — is walked beside it and is green.
    walk "head-insertion-aim" npm run head-insertion-aim -- "$BASE"
    # **A laid-down pen is laid down** (entry 62, K2/K29): every setting the
    # founder's own card sets, under both hats, before 🍾, after it and on a
    # closed document, plus ⏰ as the control that keeps its pen. **The base
    # is an argument, not a default**: its own fallback is 8199.
    walk "powers-walk" npm run powers-walk -- "$BASE"
    # a seed that is not an origin (Q1483): the `shapes` case of the walk
    # whose `record` case runs at the push in `repros-b`
    walk "wrong-line-room --case=shapes" node scripts/repro/wrong-line-room.mjs "$BASE" --case=shapes
    # the red Reconnecting… bar (Q1505): offline, a 502, a hung poll, the
    # pause keeping its modal, and a vote refused at the press
    walk "reconnecting" node scripts/repro/reconnecting.mjs "$BASE"
    ;;

  # the self-starting walks: each serves design/ itself and takes no base URL
  sprint-pages)
    # 👥 born untouched, and its two blocks (Q779, Q1162). Serves design/
    # itself
    walk "slider-walk" npm run slider-walk
    # the contents rail: every click lands clear of the topbar (M17), and
    # since Q1384 its marks queue rightwards out of the rail and cover the
    # document's edge, unclipped, at 1600 · 1280 · 1920 (the wide step).
    # In ci.yml's `probe` job until Q1546
    walk "toc-travel" npm run toc-travel
    # **The take-back** (Q1318, Ed 2026-09-11: *I should be able to choose a
    # value to take it back with ✒️, but I wasn't able to do that here*): hand
    # a setting to the membership, then reclaim it with the pen and a value
    # in one act — the card's radios before the press, the module's holder
    # after it, the clause no longer waiting, the founder's own answer card
    # gone from the rail, and 🍾 beginning with nothing left delegated. Two
    # shapes, because the defect had three causes and they do not show on one
    # card: 🤝, whose value and holder are separate fields and is Ed's own
    # case, and 🌍, where they are the same field. In ci.yml's `probe` job
    # until Q1546; about 27 s each
    walk "founding-walk --takeback=applications" node scripts/founding-walk.mjs --takeback=applications
    walk "founding-walk --takeback=chamber" node scripts/founding-walk.mjs --takeback=chamber
    # **The copy golden** (entry 128; Q1546 (c)): every card's strings on
    # every walk, keyed by walk and card key, against
    # design/tools/card-copy.golden.json. A STYLE.md pass is a snapshot and
    # nothing pinned a card's words between passes, so the next change
    # silently undid the last audit; now a copy change is red here until
    # `npm run copy-freeze`, and that freeze's diff is what the next pass
    # reads. **Expect red after an intentional copy change** — that is the
    # point, not a defect. Its own `copy-walk` job at the push until Q1546;
    # its raw-value rule stays at the push, in ci.yml's `probe` job, as
    # `copy-check --walk --raw-only`. About eight and a half minutes
    walk "copy-check --walk" npm run copy-check -- --walk
    ;;
esac

echo
echo "walks group $GROUP — ${#VERDICTS[@]} walks, ${#FAILED[@]} red"
for v in "${VERDICTS[@]}"; do echo "  $v"; done
if [ "${#FAILED[@]}" -gt 0 ]; then exit 1; fi
exit 0
