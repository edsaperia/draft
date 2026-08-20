/**
 * The operator's store tools (PRODUCTION.md stages 6 and 11), built to
 * dist/draft-tools.mjs beside the server. Four verbs, every one of them
 * safe to run beside a live service and none of them deleting anything:
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
 *
 * The oracle everywhere is copy-store.ts's: every rolling hash identical,
 * and the destination replaying to the source's last hash. The process
 * exits 0 only if the oracle held for every document.
 *
 *   node dist/draft-tools.mjs import /var/data "$DATABASE_URL"
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FilePersistence } from './persistence.js';
import { PgPersistence } from './pg-persistence.js';
import { copyStore, verifyStores } from './copy-store.js';
import type { CopyReport } from './copy-store.js';

const USAGE = `usage:
  draft-tools import <dataDir> <databaseUrl>
  draft-tools export <databaseUrl> <dataDir>
  draft-tools verify <dataDir> <databaseUrl>
  draft-tools drill  <dataDir> <databaseUrl>`;

const say = (line: string): void => console.log(line);

function summarise(verb: string, r: CopyReport): void {
  say(`${verb}: ${r.documents} documents (${r.copied.length} copied, ` +
    `${r.unchanged.length} already complete), ${r.docEntries} document entries, ` +
    `${r.engineEntries} engine entries, ${r.tokens} tokens, ${r.stashes} stashes — ` +
    'every hash identical');
}

export async function main(argv: readonly string[]): Promise<number> {
  const [verb, a, b] = argv;
  if (verb === undefined || a === undefined || b === undefined) {
    console.error(USAGE);
    return 2;
  }
  switch (verb) {
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
if (process.argv[1] !== undefined && /draft-tools|tools\.(ts|mjs|js)$/.test(process.argv[1])) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e instanceof Error ? e.message : e);
      console.error('STOPPED: the hash oracle or the store refused — nothing was deleted');
      process.exit(1);
    });
}
