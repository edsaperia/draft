#!/usr/bin/env bash
# ci-walks.sh <group> — one group of CI's `walks` job (plan-ci-speed.md §2,
# Stage 1). The job used to run every walk in series on one runner behind
# one server, 43 minutes a push; it is now a matrix over the five groups
# below, each on its own runner with its own server, so a push is decided by
# the slowest group rather than by the sum.
#
#   bash scripts/ci-walks.sh seat-member|seat-clerk|journey|motions|doors|repros
#
# (`repros`, the sixth, since Stage 4: the guards CLAUDE.md named and no
# workflow ran.)
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
  *) echo "usage: ci-walks.sh seat-member|seat-clerk|journey|motions|doors|repros"; exit 2 ;;
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
  seat-member|seat-clerk)
    HAT="${GROUP#seat-}"
    boot "$GROUP" "$PORT_MAIN"; BASE=$BOOTED
    walk "seat-matrix --hat=$HAT" npm run seat-matrix -- "$BASE" --hat="$HAT" --out="$TMP/seat-matrix-$HAT.json"
    ;;

  # the founding → 🍾 → grants → caret → proposal on the live path, which the
  # probes and founding-walk never reach; the long single walk, so alone
  journey)
    boot journey "$PORT_MAIN"; BASE=$BOOTED
    walk "journey" npm run journey -- "$BASE"
    ;;

  motions)
    boot motions "$PORT_MAIN"; BASE=$BOOTED
    # **the aim** (Q1477, the nh2026 convention): a page that polled across
    # 🍾 kept the founder's text, drew the document in a line space that was
    # not the engine's and aimed its proposals two lines low. The plan's own
    # hunt — a rival's insertion at the head of the text, a draft begun
    # beneath it — is walked beside it and is green.
    walk "head-insertion-aim" npm run head-insertion-aim -- "$BASE"
    # **the places** (Q1492): a selection dragged across an open editing card
    # made a second place over the lines of the first, and the host refused
    # the patch whole with the member's work in it.
    walk "overlapping-sites" npm run overlapping-sites -- "$BASE"
    # **a settings motion composed with real key presses** (Q1486): the only
    # walk that types into a field composer rather than setting `.value` or
    # posting by `fetch`.
    walk "rate-motion" npm run rate-motion -- "$BASE"
    # **A laid-down pen is laid down** (entry 62, K2/K29): every setting the
    # founder's own card sets, under both hats, before 🍾, after it and on a
    # closed document, plus ⏰ as the control that keeps its pen. **The base
    # is an argument, not a default**: its own fallback is 8199.
    walk "powers-walk" npm run powers-walk -- "$BASE"
    ;;

  doors)
    boot doors "$PORT_MAIN"; BASE=$BOOTED
    # slug-walk asserts what happens when an address is *taken*, so one has
    # to be taken first — the curl its own header documents. -fsS, so a
    # refusal names itself rather than surfacing later as a walk that cannot
    # find its collision.
    if ! curl -fsS -o /dev/null -X POST "$BASE/api/docs" \
        -H 'content-type: application/json' \
        -d '{"title":"Test Charter","slug":"test-charter","email":"a@b.com"}'; then
      echo "::error::could not reserve test-charter for slug-walk"; exit 1
    fi
    # room-walk's own server, for **isolation**: the one walk that builds a
    # room rather than a document (fifteen members in phase A, the
    # twenty-strong ladder cast in phase B). `DRAFT_COOLDOWN_MS=0` is stated
    # though the host default is 0 since R-086, because room-walk refuses a
    # server whose `/healthz` reports any other value.
    boot room "$PORT_ROOM" DRAFT_COOLDOWN_MS=0; ROOM_BASE=$BOOTED

    # the founder answering their own delegated question, alone in the
    # room, and 🍾 refusing to begin on one voice (R-015, R-045).
    # Self-starting: it serves design/ itself and takes no base URL (Q1177)
    walk "founder-answers" npm run founder-answers
    # 🪪's three prices: the walk's three assertions are one per price
    walk "applicants-walk (proposal)" npm run applicants-walk -- "$BASE"
    walk "applicants-walk --price=assembly" npm run applicants-walk -- "$BASE" --price=assembly
    walk "applicants-walk --price=pen" npm run applicants-walk -- "$BASE" --price=pen
    # a member's page across 🍾 when every power is laid down (Q1364)
    walk "after-begin-walk" npm run after-begin-walk -- "$BASE"
    # a member's invitation motion on the surface (Q1370)
    walk "invite-walk" npm run invite-walk -- "$BASE"
    # **The first keys into an empty column**: real key presses, the server
    # compared with the literal strings typed
    walk "first-keys-walk" npm run first-keys-walk -- "$BASE"
    # a member arrives while the founder has left 🎩 unanswered and delegated
    # ⏱️ 👥 (Q1365, Q1372)
    walk "member-questions-walk" npm run member-questions-walk -- "$BASE"
    walk "slug-walk" npm run slug-walk -- "$BASE" test-charter
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
    # 👥 born untouched, and its two blocks (Q779, Q1162). Serves design/
    # itself
    walk "slider-walk" npm run slider-walk
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
    # a proposal aims at its own line: the two cases CLAUDE.md names, a
    # seed that is not an origin (Q1483, `shapes`) and a record's span in
    # one line space (Q1488, `record`). The walk's other six cases were
    # green too when this group was built, but the whole walk is twelve
    # minutes on its own, which would make this the slowest group by half
    walk "wrong-line-room --case=shapes" node scripts/repro/wrong-line-room.mjs "$BASE" --case=shapes
    walk "wrong-line-room --case=record" node scripts/repro/wrong-line-room.mjs "$BASE" --case=record
    ;;
esac

echo
echo "walks group $GROUP — ${#VERDICTS[@]} walks, ${#FAILED[@]} red"
for v in "${VERDICTS[@]}"; do echo "  $v"; done
if [ "${#FAILED[@]}" -gt 0 ]; then exit 1; fi
exit 0
