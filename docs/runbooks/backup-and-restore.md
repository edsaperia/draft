# Runbook — backups and the restore drill (stage 11)

Written 2026-08-20 as stage 11 landed. The tool is `dist/draft-tools.mjs`
(see `postgres-cutover.md` for its verbs); the oracle everywhere is the
hash chain: a backup is good when every rolling hash in it is identical
to the source's and it replays from genesis to the same last hash.

## What a backup is

The file layout is itself the backup format. It is what the service wrote
before stage 6, what the importer reads, and what `export` writes. A
directory in that layout can be booted directly (`DRAFT_DATA_DIR=<dir>`,
`DRAFT_STORE` unset), which is the strongest possible restore test: the
service runs on the backup.

Everything `export` writes (`persistence.ts`'s `FilePersistence`; the same
list, annotated, is `docs/OPERATING.md` §5):

| Path | What it holds |
|---|---|
| `docs/<id>/log.jsonl` | the constitution's hash-chained log — the source of truth |
| `docs/<id>/people.json` | **the people rows** (decision 1253): every member's and applicant's email, name and picture, keyed by the person id the log carries — **and nowhere else**. A backup without this restores a room of erased people |
| `docs/<id>/provisional.json` | the founder's pre-save text |
| `docs/<id>/engine.jsonl` | the engine's own hash-chained log |
| `docs/<id>/bridge.json` | the engine bridge's pairing state |
| `tokens.json` | magic-link tokens, sha256-hashed, single-use, expiring |
| `pending.json` | the pre-save text stash |
| `mail-outbox.json` | **the durable mail queue**: mail accepted and not yet sent. A backup without this un-sends whatever had not gone out |

Two files live in the data directory and are **not** part of a copy, because
no store writes them through the persistence seam: `outbox.jsonl` (the dev
inbox — every magic link ever minted locally) and `bots-outbox.jsonl`
(`docs/OPERATING.md` §10). `errors.jsonl` (§11) and `secret.txt` are the
deployment's, not the data's, and are likewise not copied.

**A backup directory is as sensitive as the room.** `people.json` carries
every address and `log.jsonl` every founding answer in plaintext — the
blindness design withholds at the projection, not at storage. Delete an
export as soon as it has served its purpose.

Since the cutover of 2026-08-20 Postgres is the only live store. The rule
that survives from the transition is the mandate's: **no JSONL log is ever
deleted** — a backup directory is never pruned, by hand or by tooling.

## Taking a backup

The service serves from Postgres (since 2026-08-20; there is no disk). A
restore point in the file layout, from the Render shell:

    node dist/draft-tools.mjs export "$DATABASE_URL" /tmp/backup-$(date +%F)

`/tmp` does not survive a deploy, so copy it off the machine if it matters
(`tar -czf - -C /tmp backup-$(date +%F) | base64` and paste). `export` is re-runnable into
the same directory: documents already complete are left alone, longer
ones are finished, a diverged one is refused.

**Off-site copies are Render's managed Postgres backups** (Ed, decision 499a, 2026-08-20): nothing further is automated, and the consequence — database and backup under one provider account — is accepted. An exported directory under `/tmp` is a restore point for a bad migration, not a backup; copy it to a local machine (the disk was retired the same night, decision 498b).

## The restore drill

    node dist/draft-tools.mjs export "$DATABASE_URL" /tmp/drill-src
    node dist/draft-tools.mjs drill /tmp/drill-src "$DATABASE_URL"

Exports the live database to a directory, then imports that directory into a throwaway schema in the same database, exports
that schema to a throwaway directory, verifies the directory against the
original disk (every hash, both logs, replay from genesis, sidecars), and
drops both. Touches no live table, deletes nothing it did not create.
The last line must read `N documents survived disk → Postgres → disk with
every hash identical`; exit 1 with a named document and seq otherwise.

**`documentsQuarantined` non-zero** (`/healthz`) → the copy names each
skipped document and exits 1; **record the ids**. A document the source
itself cannot replay is passed over rather than aborting the run (issue
#13), so every other document and every sidecar is still copied — but the
backup has a hole in it, the exit code says so, and the lines to keep are

    export: SKIPPED <id> — <the reason it does not replay>
    export: N documents SKIPPED — unreadable at the source, nothing of them
    was written, and this run is NOT a complete backup. Record the ids …

`N` here must equal `documentsQuarantined`. If it does not, something else
is wrong and the difference is the thing to chase.

Run it **before the cutover** (it is what makes the import believable),
**after any migration**, and **within seven days before go-live** (the
checklist in PRODUCTION.md). It takes seconds at alpha scale.

To drill a backup directory rather than a fresh export, give `drill` that
directory as its first argument.

## Restoring

Into Postgres (the only live store now):

    node dist/draft-tools.mjs import backup-2026-08-20 "$DATABASE_URL"
    node dist/draft-tools.mjs verify backup-2026-08-20 "$DATABASE_URL"

`import` refuses a destination that has diverged from the backup — if it
does, the database holds history the backup does not (newer commits) or
a different history (corruption); read its message before doing anything
else, and never "fix" it by dropping rows.

## A torn log

A crash in the middle of an append — possible before stage 7's drain,
unlikely after — leaves a half-written last line. The document is then
**quarantined at boot** (it 404s, everything else serves, the log says
`failed to load — quarantined`). Nothing rewrites it automatically.

    node dist/draft-tools.mjs repair-tail <dataDir> <docId>            # dry run
    node dist/draft-tools.mjs repair-tail <dataDir> <docId> --write    # repair

(A file-store concern: a backup directory, or a local `npm run server`.
Postgres appends a batch in one transaction, so it cannot tear.)

The dry run names the torn line and confirms the intact prefix replays.
`--write` copies the original file aside as `log.jsonl.torn-<time>` —
every byte kept — and writes the intact prefix in its place. A line that
fails to parse anywhere but at the end, or a prefix that does not replay,
is **refused**: that is corruption, not a torn tail, and no tool here
shortens a history. Restart the service after a repair — and if that service
is ever the live one, `docs/OPERATING.md` §3's *Restarting the live host*
first: `repair-tail` must not be run against a store a service is serving
from at all, and the pause is what makes "serving from" false.

## Deleting a quarantined document

A document whose log will not replay is quarantined: it 404s, everything
else serves, `/healthz` counts it under `documentsQuarantined`, and every
export skips it and says so. Keeping it costs nothing but the skip line
(Ed kept three, Q1322). Deleting it is a separate, deliberate act — **on
Ed's word only** — and this is the sequence.

Everything below runs in a shell on the host: Render → service `draft` →
**Shell** (`docs/OPERATING.md` §5 and §11). `DATABASE_URL` is already set
there. Nothing here runs from a laptop.

**1 — name them.** Take an export and read its skip lines; the ids are in
them, and the same ids are in the boot log (`document '<id>' failed to
load — quarantined:`, Render → **Logs**).

    node dist/draft-tools.mjs export "$DATABASE_URL" /tmp/before-delete

Prints one `export: SKIPPED <id> — <reason>` line per quarantined document,
then the count, then `export: N documents SKIPPED …`, and **exits 1** —
which is the export working, not failing. Write the ids down.

**2 — pause the host, before the tool runs.** `delete` removes rows the
running server still holds in memory, and a commit that *touches* a person
writes that person's row straight back (`StorePeople.takeDirty`,
`store.ts`; `docs/OPERATING.md` §5), so the pause here is a data step and
not the courtesy it is before an ordinary restart. Paused, the write path
persists nothing at all, refuses every command with 503, and every open
page draws the maintenance modal rather than meeting an error.

    curl -fsS -X POST -H "authorization: Bearer $DRAFT_BOT_KEY" \
      -H 'content-type: application/json' -d '{}' \
      https://docs.vote/api/admin/pause

It lifts itself after fifteen minutes, so run steps 3 and 4 without a
break (`docs/OPERATING.md` §3, *Restarting the live host*).

**3 — delete each one, by id, typed twice.**

    node dist/draft-tools.mjs delete "$DATABASE_URL" <docId> --i-understand-this-deletes-the-document=<docId>

On success:
`delete: document '<docId>' and its rows are gone from postgres://…/draft`.
Anything short of the id twice is refused with
`delete: refusing — … Nothing was deleted.` and nothing happens. Run it
once per id.

It removes the document's log, engine log, people rows, provisional text
and bridge state. It does **not** remove tokens, stashes or queued mail
that named it; those are keyed by other things, expire on their own, and a
magic link into a document that is gone simply fails to resolve.

**4 — restart, so the running server forgets it.** Render → **Manual
Deploy → Restart**. A running server holds what it loaded until it
reloads, and the quarantine list is part of that. The restart lifts the
pause with the old process; if you stop short of it, lift the pause by hand
(`POST /api/admin/resume`, same key). Then check `/healthz`:
`documentsQuarantined` must now read 0, `paused` must read `null`, and
**read `surface` too** — a restart drops any surface upload the host was
serving and falls back to the artifact's own `design/`
(`docs/OPERATING.md` §3, *Restarting the live host*), so a `null` there
after a surface-lane push means the page has gone back a commit.

**5 — re-run the export and the drill, and read the exit codes.**

    node dist/draft-tools.mjs export "$DATABASE_URL" /tmp/drill-src
    node dist/draft-tools.mjs drill  /tmp/drill-src "$DATABASE_URL"

Both must now **exit 0** with no `SKIPPED` line anywhere, the export
ending `— every hash identical` and the drill ending
`N documents survived disk → Postgres → disk with every hash identical`
followed by `drill: dropped schema drill_… and /tmp/…`. Record the date
and the counts in PRODUCTION.md (stages 11 and 16).

**6 — delete the export directories. This is not optional.**

    rm -rf /tmp/before-delete /tmp/drill-src

An export holds **every address and every answer in plaintext** — it is a
copy of the members' inboxes and of everything they have said. `/tmp` on
Render does not survive a deploy, but it does survive until one, and the
shell is not the only thing that can read it.

## What is deliberately not here

- Automated off-site copies (decision 499a: Render's own backups suffice).
- Point-in-time recovery (the log is append-only and hash-chained; any
  prefix is a consistent state, so "restore to before seq N" is truncating
  a copy of the log, which is a deliberate act to do by hand with the
  original kept, never a tool).
