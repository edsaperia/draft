# Runbook — wiping the store (decision 1253)

**When:** once, at Ed's word, after the people split deployed (2026-09-08). Every document
written before it is the pre-people shape and is skipped at boot (`/healthz` counts them under
`documentsSkipped`); the wipe removes them and every sidecar, and leaves the schema migrated so
the next document is born into the split. It is not a routine operation: after this one run, the
store never holds the old shape again and there is nothing left for `wipe` to do.

**Where:** the `draft` service's shell in the Render dashboard, where `DATABASE_URL` is the
frankfurt database's internal connection string and `dist/draft-tools.mjs` is the built artifact.
Nothing here runs from a laptop: the internal string does not resolve outside Render.

## Steps

1. **No restore point can be written by the tool** — `export` replays every log through the hash
   oracle, and the oracle refuses the pre-people shape by the same decision this wipe serves
   (found on the day: *entry 0 is schema version 1, below 2 … STOPPED*). Render's managed
   backups of the database are the restore point, on Render's own schedule; nothing else is
   possible, and for a store of test documents nothing else is wanted.

2. **The refusal, first.** Run the wipe without its flag. It prints the count it would delete and
   the store it is looking at, deletes nothing, and exits 1:

       node dist/draft-tools.mjs wipe "$DATABASE_URL"

   Read the count. It should equal `/healthz`'s `documents` + `documentsSkipped`.

3. **The wipe.** The flag takes the database's own name — the last path segment of the URL —
   typed in full; the tool refuses any other name and never echoes the expected one:

       node dist/draft-tools.mjs wipe "$DATABASE_URL" --i-understand-this-deletes-every-document="${DATABASE_URL##*/}"

   (If the URL carries a query string, name the database by hand instead of the expansion.)

4. **Restart the service** — the running host still holds what it loaded at boot. Render
   dashboard → the `draft` service → *Manual Deploy → Restart* (or redeploy the same commit).

5. **Verify:** `https://docs.vote/healthz` reports `documents: 0`, `documentsSkipped: 0`,
   `store: "pg"`. Then found a document at `https://docs.vote/` and read its `/healthz` count go to
   1 — the first document born into the split.

6. **Record it:** the date and the count go into `docs/OPERATING.md` §5's wipe paragraph and
   PRODUCTION.md's decision 1253 row.

## What it does not touch

`dev.docs.vote` runs the file store on an ephemeral disk and is wiped by every deploy; nothing
to do there. Render's managed backups of the database are Render's and are not deleted by the
tool; they age out on Render's schedule.
