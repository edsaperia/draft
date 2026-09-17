# Runbook — the Postgres cutover, and the way back (stage 6)

> **Executed 2026-08-20 23:30.** docs.vote serves from Postgres; the drill
> passed on the live database (2 documents, 16 entries, every hash
> identical) and the disk was deleted the same night (498b). Kept as the
> record of the procedure, and for the production service of 481(a) when it
> is created. `/var/data` below was the disk's mount path; on a service with
> no disk, use a directory under `/tmp` for imports and exports.

Written 2026-08-20 as stage 6 landed. The design it executes — the cutover
is two variables — is `docs/OPERATING.md` §7; this is the procedure.

## The two switches

| Variable | What it is | When to set it |
|---|---|---|
| `DATABASE_URL` | where Postgres is — the managed database's **internal** connection string, same region as the service | any time; inert on its own |
| `DRAFT_STORE` | `file` (absent) or `pg` — **the cutover** | only after step 4 below has passed |

Absent `DRAFT_STORE` means the disk, exactly as before stage 6. `pg` with
no `DATABASE_URL` is refused at boot. Any other value is refused at boot.
The switch never falls back silently.

## The tool

`dist/draft-tools.mjs` is built beside the server by `npm run build` and
is on the service's disk after every deploy. **Ten verbs, three of which
delete** — `node dist/draft-tools.mjs` with no arguments prints the list,
which is the one of record (`tools.ts` `USAGE`).

Four are the copiers, and all four are safe beside a live service:

    node dist/draft-tools.mjs import <dataDir> <databaseUrl>   # disk → Postgres
    node dist/draft-tools.mjs export <databaseUrl> <dataDir>   # Postgres → disk
    node dist/draft-tools.mjs verify <dataDir> <databaseUrl>   # compare, write nothing
    node dist/draft-tools.mjs drill  <dataDir> <databaseUrl>   # the restore drill

`repair-tail <dataDir> <docId> [--write]` is not a copier: it rewrites one
document's log in place (keeping the original byte for byte beside it),
carries no hash oracle, and must not be run against a store a service is
serving from. Its procedure is in
[backup-and-restore.md](backup-and-restore.md).

Two read: `people <store> <docId>` lists a document's person rows, and
`errors <dataDir> [n]` prints the tail of the error log (`docs/OPERATING.md`
§11; a `postgres://` URL is the wrong address for it and it says so).

**Three delete**, each behind its own typed refusal — nothing here deletes
on a bare verb:

    node dist/draft-tools.mjs erase  <store> <docId> <personId>
    node dist/draft-tools.mjs delete <store> <docId> --i-understand-this-deletes-the-document=<docId>
    node dist/draft-tools.mjs wipe   <store> --i-understand-this-deletes-every-document=<name>

`erase` deletes one person's row (the log stands, every hash holds).
`delete` (Q1322) deletes one document and every row it holds — log, engine
log, people, provisional text, bridge state. `wipe` deletes every document
and every sidecar. `docs/OPERATING.md` §5 has all three in full; `wipe`'s
own runbook is [wipe.md](wipe.md).

Every copier ends with the oracle: **every rolling hash identical** between
source and destination, both logs, and the destination replaying from
genesis to the source's last hash. Exit 0 means it held for every
document **and that every document was copied**. Exit 1 means it did not,
and the output names the document and the seq — or names a document it
**skipped** because the source itself cannot replay it (issue #13: a
quarantined document does not abort the run, but it does make the run
incomplete, and the exit code says so). **Never relax the oracle.** If it
fails, stop and write it up.

`import` is re-runnable: a document already complete is reported
"already complete"; a partial earlier run is finished from where it
stopped; a destination that has *diverged* is refused with nothing
written past it.

## The cutover, step by step

Each step has a rollback, which is the step before it.

1. **Provision** a managed Postgres (version 17, same region as the
   service — frankfurt). Copy its internal connection string.
2. **Set `DATABASE_URL`** on the service. Deploy (or let the next push
   deploy). The service still serves from the disk; `/healthz` says
   `"store":"file"`. Nothing has changed.
3. **Import.** In the service's shell (Render → Shell), on the live disk:

       node dist/draft-tools.mjs import /var/data "$DATABASE_URL"

   Read the last line. It must end `every hash identical`. Documents that
   change while the import runs are fine: the next run finishes them.
4. **Verify** — the same walk, writing nothing:

       node dist/draft-tools.mjs verify /var/data "$DATABASE_URL"

   Run the import once more immediately before the next step so the
   database holds everything the disk does as of that moment. (Between
   that run and the restart, a commit to the disk is possible; step 6
   catches it.)
5. **Cut over.** Set `DRAFT_STORE=pg`. Restart the service. Watch the boot
   line: `draft server on https://docs.vote (store: pg, …)`, and
   `/healthz` saying `"store":"pg"` with the same `documents` count the
   disk reported.
6. **Confirm.** `npm run verify https://docs.vote` from anywhere; open a
   document and act in it. Then run `verify` one last time: it reads the
   disk as the source, so any commit that landed on the disk between
   step 4 and the restart shows up as the database being *shorter* — if
   it does, unset `DRAFT_STORE`, restart, and go back to step 3.

## The way back

Unset `DRAFT_STORE`. Restart. The service is on the disk it never stopped
writing to before step 5. Anything written to Postgres *after* step 5 is
not on the disk — export it first if it matters:

    node dist/draft-tools.mjs export "$DATABASE_URL" /var/data

Export uses the same re-runnable copy: documents already complete on the
disk are left alone, longer ones in the database are finished onto it,
and a diverged one is refused.

## What the schema is

One row per log entry: `document_log` and `engine_log`, primary key
`(document_id, seq)`, columns `prev_hash`, `hash`, `event` (text — the
exact serialised bytes; `event::jsonb` where a reader wants it),
`schema_version` (nullable: absent means 1). `documents` lists them;
`provisional`, `bridge_state` keyed by document; `people` keyed
`(document_id, person_id)` and holding every address, name and picture
(migration 5, decision 1253); `tokens` and `stashes` keyed by hash and key
with an expiry index; `outbox` is the durable mail queue (migration 4,
review #1 finding 15); `schema_migrations` records what has been applied.

**Five migrations so far** (`pg-persistence.ts` `MIGRATIONS`, and
`SCHEMA_VERSION` is the last one's number):

| # | What it adds | Why |
|---|---|---|
| 1 | the first schema: `documents`, `document_log`, `engine_log`, `provisional`, `bridge_state`, `tokens`, `stashes` | stage 6 |
| 2 | `stashes.slug` and its index | Q460/462 — the address reserved at the birth |
| 3 | `stashes.doc_id` | Q519 — a re-sent link forwards to the document the first one made |
| 4 | `outbox` and its `outbox_unsent` index | review #1 finding 15 — the durable mail queue |
| 5 | `people` | decision 1253 — the addresses leave the log and live beside it |

Every migration runs at boot, once, under an advisory lock; a build that
finds a newer schema than it knows refuses to start.

Writes to a document's log take a per-document advisory lock for the
batch, and the primary key refuses a second writer on the same seq — a
deploy overlapping its predecessor cannot fork a chain.

## Local rehearsal

The pinned container: `postgres:17-alpine`, `127.0.0.1:5433`, user /
password / database `draft` (`docs/OPERATING.md` §7 has the `docker run`). The
whole server test suite runs over it with

    DRAFT_TEST_STORE=pg DRAFT_TEST_DATABASE_URL=postgres://draft:draft@127.0.0.1:5433/draft npm test -w @draft/server

and CI does the same against a service container on every push.
