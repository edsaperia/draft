/**
 * The operator's store tools (PRODUCTION.md stages 6, 11 and 12), built to
 * dist/draft-tools.mjs beside the server. Five copying verbs, none of them
 * deleting anything, and each safe while the service serves from the
 * *other* store (import beside a file-served service, export beside a
 * Postgres-served one): the copier takes no lock on its destination, so
 * never run it against the store that is live. Then three for the people
 * rows (decision 1253) — two that read or delete one row, and the wipe.
 *
 *   people <store> <docId>              list a document's person rows: id,
 *                                        address, whether a name and a
 *                                        picture stand — so an operator can
 *                                        find the one to erase
 *   erase  <store> <docId> <personId>   erasure: delete the row and print
 *                                        what it held; the log stands and
 *                                        every hash holds. **Run against a
 *                                        stopped service, or restart it
 *                                        after**: a running server holds the
 *                                        rows in memory until it reloads.
 *   wipe   <store> --i-understand-this-deletes-every-document=<name>
 *                                        every document and every sidecar,
 *                                        gone. Refuses without the flag, and
 *                                        with any <name> but the store's own
 *                                        (the data directory's basename, or
 *                                        the database's name), printing the
 *                                        count it would have deleted. **Runs
 *                                        only on Ed's word at the time.**
 *
 * `<store>` is a data directory, or a `postgres://` URL.
 *
 *   import  <dataDir> <databaseUrl>     disk → Postgres, hash-asserted,
 *                                        re-runnable (finishes a partial
 *                                        run; refuses a diverged one)
 *   export  <databaseUrl> <dataDir>     Postgres → a disk directory in the
 *                                        file layout: the backup
 *   verify  <dataDir> <databaseUrl>     compare both, writing nothing
 *   drill   <dataDir> <databaseUrl>     the restore drill: import into a
 *                                        throwaway schema, export it to a
 *                                        throwaway directory, verify the
 *                                        copy disk-against-disk, drop both
 *   repair-tail <dataDir> <docId> [--write]
 *                                        a log whose last line is half
 *                                        written (a crash mid-append, before
 *                                        stage 7's drain) is quarantined at
 *                                        boot; this names the torn line and,
 *                                        only with --write, moves the whole
 *                                        file aside untouched and writes the
 *                                        intact prefix in its place. Nothing
 *                                        is deleted: the original keeps its
 *                                        bytes under log.jsonl.torn-<time>.
 *
 * The oracle everywhere is copy-store.ts's: every rolling hash identical,
 * and the destination replaying to the source's last hash. The process
 * exits 0 only if the oracle held for every document.
 *
 *   node dist/draft-tools.mjs import /var/data "$DATABASE_URL"
 */
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ConstitutionSession } from '../../constitution/src/index.js';
import type { LogEntry } from '../../constitution/src/index.js';
import { FilePersistence } from './persistence.js';
import { PgPersistence } from './pg-persistence.js';
import { copyStore, verifyStores } from './copy-store.js';
import type { CopyReport } from './copy-store.js';

/** The one flag the wipe accepts, spelled out in full so it cannot be typed by habit. */
export const WIPE_FLAG = '--i-understand-this-deletes-every-document';
/** The one flag the delete accepts: the id again, so it cannot be typed by habit (Q1322). */
export const DELETE_FLAG = '--i-understand-this-deletes-the-document';

const USAGE = `usage:
  draft-tools import <dataDir> <databaseUrl>
  draft-tools export <databaseUrl> <dataDir>
  draft-tools verify <dataDir> <databaseUrl>
  draft-tools drill  <dataDir> <databaseUrl>
  draft-tools repair-tail <dataDir> <docId> [--write]
  draft-tools people <store> <docId>
  draft-tools erase  <store> <docId> <personId>
  draft-tools wipe   <store> ${WIPE_FLAG}=<name>
  draft-tools delete <store> <docId> ${DELETE_FLAG}=<docId>
    <store> is a data directory or a postgres:// URL; <name> is the data
    directory's basename or the database's name, typed in full; <docId> is
    the document's id (d-…), typed twice`;

const say = (line: string): void => console.log(line);

const isPgUrl = (s: string): boolean => /^postgres(ql)?:\/\//.test(s);

/** A store by its address: a directory, or a Postgres URL. `name` is what
 *  the wipe must be told; `shown` is the address with any credential removed. */
async function openStore(where: string): Promise<{
  p: FilePersistence | PgPersistence; name: string; shown: string; close: () => Promise<void>;
}> {
  if (isPgUrl(where)) {
    const u = new URL(where);
    const p = await PgPersistence.open(where);
    return { p, name: u.pathname.replace(/^\//, ''), shown: `${u.protocol}//${u.host}${u.pathname}`,
      close: () => p.close() };
  }
  const dir = resolve(where);
  if (!existsSync(dir)) throw new Error(`no data directory at ${dir}`);
  return { p: new FilePersistence(dir), name: basename(dir), shown: dir, close: async () => undefined };
}

function summarise(verb: string, r: CopyReport): void {
  say(`${verb}: ${r.documents} documents (${r.copied.length} copied, ` +
    `${r.unchanged.length} already complete), ${r.docEntries} document entries, ` +
    `${r.engineEntries} engine entries, ${r.tokens} tokens, ${r.stashes} stashes, ` +
    `${r.outbox} queued mails — every hash identical`);
}

/**
 * Inspect a document log for a torn tail. Every line but the last must
 * parse; the last may be a partial write. The intact prefix must still
 * replay (so a torn *middle* is not "repaired" into a shorter history —
 * that is corruption, and the tool says so). Returns what it found.
 */
export function inspectTail(path: string): {
  lines: number; torn: string | null; prefixOk: boolean; prefix: string;
} {
  const raw = readFileSync(path, 'utf8');
  const lines = raw.split('\n');
  if (lines[lines.length - 1] === '') lines.pop(); // the trailing newline
  let torn: string | null = null;
  const parsed: LogEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      parsed.push(JSON.parse(lines[i]!) as LogEntry);
    } catch {
      if (i === lines.length - 1) { torn = lines[i]!; break; }
      throw new Error(`line ${i + 1} of ${lines.length} does not parse and is not the ` +
        'last — this is not a torn tail, and no tool here will shorten a history');
    }
  }
  let prefixOk = true;
  try { ConstitutionSession.replay(parsed); } catch { prefixOk = false; }
  return { lines: lines.length, torn, prefixOk,
    prefix: parsed.map((e) => JSON.stringify(e)).join('\n') + (parsed.length > 0 ? '\n' : '') };
}

export async function main(argv: readonly string[]): Promise<number> {
  const [verb, a, b0, c] = argv;
  if (verb === undefined || a === undefined) {
    console.error(USAGE);
    return 2;
  }
  if (verb === 'wipe') {
    // **Written and not run** (PRODUCTION.md decision 1253): the wipe runs
    // only on Ed's word at the time, and this refusal is what stands
    // between a typed verb and the alpha's documents.
    const flag = argv.slice(2).find((x) => x.startsWith(`${WIPE_FLAG}=`));
    const store = await openStore(a);
    try {
      const n = (await store.p.listDocIds()).length;
      const would = `${n} document${n === 1 ? '' : 's'} in ${store.shown}`;
      if (flag === undefined) {
        console.error(`wipe: refusing — this would delete ${would}. To proceed, pass ` +
          `${WIPE_FLAG}=<name>, where <name> is the data directory's basename or the ` +
          'database\'s name, typed in full. Nothing was deleted.');
        return 1;
      }
      const given = flag.slice(WIPE_FLAG.length + 1);
      if (given !== store.name) {
        console.error(`wipe: refusing — '${given}' does not name this store, which holds ${would}. ` +
          'Nothing was deleted.');
        return 1;
      }
      const gone = await store.p.wipe();
      say(`wipe: deleted ${gone} document${gone === 1 ? '' : 's'} and every sidecar from ${store.shown}`);
    } finally { await store.close(); }
    return 0;
  }
  if (b0 === undefined) {
    console.error(USAGE);
    return 2;
  }
  if (verb === 'delete') {
    // **One document, on Ed's word, typed twice** (Q1322, 2026-09-11: a
    // production document quarantined behind a broken chain, and *delete 1,
    // do your fixes, we'll start from scratch*). The same discipline as the
    // wipe: the refusal stands between a typed verb and a document, and
    // the flag must carry the id itself. Run against a stopped service, or
    // restart after — a running server keeps the document in memory.
    const flag = argv.slice(3).find((x) => x.startsWith(`${DELETE_FLAG}=`));
    const store = await openStore(a);
    try {
      const ids = await store.p.listDocIds();
      if (!ids.includes(b0)) {
        console.error(`delete: no document '${b0}' in ${store.shown}. Nothing was deleted.`);
        return 1;
      }
      if (flag === undefined || flag.slice(DELETE_FLAG.length + 1) !== b0) {
        console.error(`delete: refusing — this would delete document '${b0}' and every row it ` +
          `holds from ${store.shown}. To proceed, pass ${DELETE_FLAG}=${b0}. Nothing was deleted.`);
        return 1;
      }
      const gone = await store.p.deleteDoc(b0);
      say(gone ? `delete: document '${b0}' and its rows are gone from ${store.shown}`
        : `delete: document '${b0}' was already gone from ${store.shown}`);
    } finally { await store.close(); }
    return 0;
  }
  const b: string = b0;
  switch (verb) {
    /* -- the people rows (decision 1253) ---------------------------------- */
    case 'people': {
      const store = await openStore(a);
      try {
        const rows = await store.p.readPeople(b);
        if (rows.length === 0) { say(`${b}: no person rows`); return 0; }
        say(`${b}: ${rows.length} person row${rows.length === 1 ? '' : 's'}`);
        for (const r of rows.sort((x, y) => (x.personId < y.personId ? -1 : 1))) {
          say(`  ${r.personId}  ${r.email}  name: ${r.name === null ? '—' : 'set'}  ` +
            `picture: ${r.picture === null ? '—' : 'set'}`);
        }
      } finally { await store.close(); }
      return 0;
    }
    case 'erase': {
      if (c === undefined) { console.error(USAGE); return 2; }
      const store = await openStore(a);
      try {
        const row = (await store.p.readPeople(b)).find((r) => r.personId === c);
        if (row === undefined) {
          console.error(`${b}: no person row '${c}' — nothing to erase (draft-tools people ${a} ${b} lists them)`);
          return 1;
        }
        await store.p.deletePerson(b, c);
        say(`${b}: erased ${c} — the row held ${row.email}` +
          `${row.name === null ? '' : ', a name'}${row.picture === null ? '' : ', a picture'}; ` +
          'the log stands and every hash holds');
        say('if a server is serving this store, restart it: it holds the rows in memory until it reloads');
      } finally { await store.close(); }
      return 0;
    }
    case 'repair-tail': {
      const path = join(a, 'docs', b, 'log.jsonl');
      if (!existsSync(path)) { console.error(`no log at ${path}`); return 2; }
      const r = inspectTail(path);
      if (r.torn === null) {
        say(`${b}: ${r.lines} lines, every one parses — nothing to repair` +
          (r.prefixOk ? '' : ' (but the chain does not replay: this is not a torn tail)'));
        return r.prefixOk ? 0 : 1;
      }
      say(`${b}: line ${r.lines} is torn (${r.torn.length} bytes: ${JSON.stringify(r.torn.slice(0, 60))}…)`);
      if (!r.prefixOk || r.lines < 2) {
        // an empty prefix "replays" (to nothing); a log whose only line is
        // torn lost its genesis, and no tool here writes a document with
        // no birth (review #2, finding 3)
        console.error('the intact prefix does not replay, or there is none — refusing: this is not a torn tail');
        return 1;
      }
      if (existsSync(join(a, 'docs', b, 'engine.jsonl'))) {
        say('note: an engine log stands beside this document; its bridge cursor may now point ' +
          'past the shortened log — resume catches a cursor *behind* the log, not ahead, so ' +
          'move engine.jsonl and bridge.json aside too and let the engine be reborn');
      }
      say(`the first ${r.lines - 1} lines replay cleanly`);
      if (!argv.includes('--write')) {
        say('dry run — pass --write to move the original aside and keep the intact prefix');
        return 0;
      }
      const aside = `${path}.torn-${Date.now()}`;
      copyFileSync(path, aside);
      writeFileSync(path, r.prefix, 'utf8');
      say(`original kept byte for byte at ${aside}; log.jsonl now holds the ${r.lines - 1} intact lines`);
      return 0;
    }
    case 'import': {
      const pg = await PgPersistence.open(b);
      try {
        summarise('import', await copyStore(new FilePersistence(a), pg, { log: say }));
      } finally { await pg.close(); }
      return 0;
    }
    case 'export': {
      const pg = await PgPersistence.open(a);
      try {
        summarise('export', await copyStore(pg, new FilePersistence(b), { log: say }));
      } finally { await pg.close(); }
      return 0;
    }
    case 'verify': {
      const pg = await PgPersistence.open(b);
      try {
        const n = await verifyStores(new FilePersistence(a), pg, { log: say });
        say(`verify: ${n} documents, every hash identical`);
      } finally { await pg.close(); }
      return 0;
    }
    case 'drill': {
      // a throwaway schema in the same database, so the drill exercises
      // the real connection and the real migrations without touching the
      // live tables; a throwaway directory for the export
      const schema = `drill_${Date.now().toString(36)}`;
      const out = mkdtempSync(join(tmpdir(), 'draft-drill-'));
      const pg = await PgPersistence.open(b, { schema });
      try {
        const disk = new FilePersistence(a);
        say(`drill: importing ${a} into schema ${schema}`);
        summarise('drill/import', await copyStore(disk, pg, { log: say }));
        say(`drill: exporting schema ${schema} to ${out}`);
        summarise('drill/export', await copyStore(pg, new FilePersistence(out), { log: say }));
        const n = await verifyStores(disk, new FilePersistence(out), { log: say });
        say(`drill: ${n} documents survived disk → Postgres → disk with every hash identical`);
      } finally {
        await pg.dropSchemaAndClose();
        rmSync(out, { recursive: true, force: true });
        say(`drill: dropped schema ${schema} and ${out}`);
      }
      return 0;
    }
    default:
      console.error(USAGE);
      return 2;
  }
}

// built as its own entry point; never imported by the server
if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e instanceof Error ? e.message : e);
      console.error('STOPPED: the hash oracle or the store refused — nothing was deleted');
      process.exit(1);
    });
}
