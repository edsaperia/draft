# Runbook — backups and the restore drill (stage 11)

Written 2026-08-20 as stage 11 landed. The tool is `dist/draft-tools.mjs`
(see `postgres-cutover.md` for its verbs); the oracle everywhere is the
hash chain: a backup is good when every rolling hash in it is identical
to the source's and it replays from genesis to the same last hash.

## What a backup is

The file layout — `docs/<id>/log.jsonl`, `engine.jsonl`, `bridge.json`,
`provisional.json`, plus `tokens.json` and `pending.json` — is itself the
backup format. It is what the service wrote before stage 6, what the
importer reads, and what `export` writes. A directory in that layout can
be booted directly (`DRAFT_DATA_DIR=<dir>`, `DRAFT_STORE` unset), which is
the strongest possible restore test: the service runs on the backup.

Two sources of truth exist during the transition, and the rule is the
mandate's: **no JSONL log is ever deleted**, and the disk stays the live
fallback until the restore drill has passed against the database.

## Taking a backup

While the service serves from the disk (`/healthz` says `"store":"file"`):

    # the data directory *is* the backup; copy it somewhere independent
    tar -czf draft-$(date +%F).tgz -C /var/data .

Once it serves from Postgres (`"store":"pg"`):

    node dist/draft-tools.mjs export "$DATABASE_URL" /var/data/backup-$(date +%F)

then copy that directory off the machine. `export` is re-runnable into
the same directory: documents already complete are left alone, longer
ones are finished, a diverged one is refused.

**Off-site copies are Render's managed Postgres backups** (Ed, decision 499a, 2026-08-20): nothing further is automated, and the consequence — disk, database and backup under one provider account — is accepted. An exported directory on the service disk is a restore point for a bad migration, not a backup. Once the disk is retired (decision 498b) the export goes to a local machine instead.

## The restore drill

    node dist/draft-tools.mjs drill /var/data "$DATABASE_URL"

Imports the disk into a throwaway schema in the same database, exports
that schema to a throwaway directory, verifies the directory against the
original disk (every hash, both logs, replay from genesis, sidecars), and
drops both. Touches no live table, deletes nothing it did not create.
The last line must read `N documents survived disk → Postgres → disk with
every hash identical`; exit 1 with a named document and seq otherwise.

Run it **before the cutover** (it is what makes the import believable),
**after any migration**, and **within seven days before go-live** (the
checklist in PRODUCTION.md). It takes seconds at alpha scale.

To drill a backup directory rather than the live disk, give it that
directory instead of `/var/data`.

## Restoring

From a backup directory, onto the disk:

    # stop the service first (Render: suspend), then
    cp -r backup-2026-08-20/. /var/data/
    # unset DRAFT_STORE, resume; /healthz must report the document count

Into Postgres:

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

    node dist/draft-tools.mjs repair-tail /var/data <docId>            # dry run
    node dist/draft-tools.mjs repair-tail /var/data <docId> --write    # repair

The dry run names the torn line and confirms the intact prefix replays.
`--write` copies the original file aside as `log.jsonl.torn-<time>` —
every byte kept — and writes the intact prefix in its place. A line that
fails to parse anywhere but at the end, or a prefix that does not replay,
is **refused**: that is corruption, not a torn tail, and no tool here
shortens a history. Restart the service after a repair.

## What is deliberately not here

- Automated off-site copies (decision 499a: Render's own backups suffice).
- Point-in-time recovery (the log is append-only and hash-chained; any
  prefix is a consistent state, so "restore to before seq N" is truncating
  a copy of the log, which is a deliberate act to do by hand with the
  original kept, never a tool).
