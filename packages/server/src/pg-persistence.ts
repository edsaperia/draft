/**
 * The Postgres backend (PRODUCTION.md stage 6): the same Persistence
 * contract FilePersistence keeps, with the bytes in tables. The hash-
 * chained logs are the source of truth — `document_log` and `engine_log`,
 * one row per entry, primary key (document_id, seq) — and everything else
 * the file layout kept as a sidecar is a row keyed by document.
 *
 * Three decisions worth knowing before touching the schema:
 *
 * - **The event is stored as `text`, not `jsonb`.** The chain hash is
 *   over key-sorted JSON (constitution/src/hash.ts), so key order would
 *   survive jsonb — but jsonb rejects `\u0000` and lone surrogates, both
 *   of which can arrive in a member's free text, and an insert error
 *   there would fail the document's commit. Text is the bytes the file
 *   store has always held; `event::jsonb` is available to any projection
 *   that wants it and can tolerate the rejection.
 * - **The primary key is the cross-process guard.** Within one process
 *   the WriteChain serialises commits per document; across processes (a
 *   deploy overlapping its predecessor, an importer run beside a live
 *   server) two writers appending seq N both succeed on a file and
 *   silently fork the chain. Here the second violates the key and
 *   throws, and the advisory lock makes the whole batch one act.
 * - **`pg` is the project's first runtime dependency** — spent here and
 *   only here, by design.
 *
 * Migrations are applied at open, idempotently, recorded in
 * `schema_migrations`; a backend opened against a newer schema than it
 * knows refuses, because an older build must not write a shape the newer
 * one has moved past.
 */
import pg from 'pg';
import type { LogEntry } from '../../constitution/src/index.js';
import { OUTBOX_MAX_ATTEMPTS, outboxBackoffMs } from './persistence.js';
import type { OutboxRow, Persistence, StashRecord, TokenRecord } from './persistence.js';

/** Each migration runs once, in order, inside one transaction. */
const MIGRATIONS: ReadonlyArray<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE documents (
        id          text PRIMARY KEY,
        created_at  timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE document_log (
        document_id    text   NOT NULL REFERENCES documents(id),
        seq            int    NOT NULL,
        prev_hash      text   NOT NULL,
        hash           text   NOT NULL,
        event          text   NOT NULL,
        schema_version int,
        PRIMARY KEY (document_id, seq)
      );
      CREATE TABLE engine_log (
        document_id    text   NOT NULL REFERENCES documents(id),
        seq            int    NOT NULL,
        prev_hash      text   NOT NULL,
        hash           text   NOT NULL,
        event          text   NOT NULL,
        schema_version int,
        PRIMARY KEY (document_id, seq)
      );
      CREATE TABLE provisional (
        document_id text PRIMARY KEY REFERENCES documents(id),
        text        text NOT NULL
      );
      CREATE TABLE bridge_state (
        document_id text PRIMARY KEY REFERENCES documents(id),
        state       text NOT NULL
      );
      CREATE TABLE tokens (
        hash    text   PRIMARY KEY,
        record  text   NOT NULL,
        exp_ms  bigint NOT NULL
      );
      CREATE INDEX tokens_exp ON tokens (exp_ms);
      CREATE TABLE stashes (
        key     text   PRIMARY KEY,
        text    text   NOT NULL,
        exp_ms  bigint NOT NULL
      );
      CREATE INDEX stashes_exp ON stashes (exp_ms);
    `,
  },
  {
    // Q460/462b: the address chosen at the birth is reserved while the
    // pending creation lives, so a second founder is told "taken"
    version: 2,
    sql: `
      ALTER TABLE stashes ADD COLUMN slug text;
      CREATE INDEX stashes_slug ON stashes (slug);
    `,
  },
  {
    // Q519: a re-send mints a second link against one creation and every
    // link stays live, so the stash records the document it became — the
    // first link followed creates it, the rest forward to it
    version: 3,
    sql: `
      ALTER TABLE stashes ADD COLUMN doc_id text;
    `,
  },
  {
    // The mail outbox (review #1, finding 15): a durable queue, so a
    // provider refusal is a row still standing rather than an invitation
    // the log records as sent. `addressee` rather than `to`, which is a
    // reserved word and would have to be quoted at every site; no foreign
    // key on `document_id`, because the operator notification belongs to
    // no document and a mail must never be the reason a document cannot
    // be removed. The index is the sender loop's own query.
    version: 4,
    sql: `
      CREATE TABLE outbox (
        id              text   PRIMARY KEY,
        document_id     text,
        addressee       text   NOT NULL,
        subject         text   NOT NULL,
        body            text   NOT NULL,
        link            text,
        token_hash      text,
        created_ms      bigint NOT NULL,
        attempts        int    NOT NULL DEFAULT 0,
        last_attempt_ms bigint,
        last_error      text,
        sent_ms         bigint
      );
      CREATE INDEX outbox_unsent ON outbox (sent_ms, attempts, created_ms);
    `,
  },
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version;

interface LogRow {
  seq: number;
  prev_hash: string;
  hash: string;
  event: string;
  /** NULL where the entry was written without one (stage 5: absent
   *  means 1, and `versionOf` is how it is read). Kept nullable rather
   *  than defaulted so an export reproduces the source byte for byte. */
  schema_version: number | null;
}

interface ChainedEntry {
  seq: number;
  hash: string;
  prevHash: string;
  event: unknown;
  schemaVersion?: number;
}

/** The outbox as Postgres hands it back: bigints arrive as strings. */
interface OutboxDbRow {
  id: string;
  document_id: string | null;
  addressee: string;
  subject: string;
  body: string;
  link: string | null;
  token_hash: string | null;
  created_ms: string;
  attempts: number;
  last_attempt_ms: string | null;
  last_error: string | null;
  sent_ms: string | null;
}

/** …and the same absent-stays-absent rule the log envelope keeps, so a
 *  round trip through here is identical to the file store's row. */
const outboxOf = (r: OutboxDbRow): OutboxRow => ({
  id: r.id,
  documentId: r.document_id,
  to: r.addressee,
  subject: r.subject,
  body: r.body,
  ...(r.link === null ? {} : { link: r.link }),
  ...(r.token_hash === null ? {} : { tokenHash: r.token_hash }),
  createdMs: Number(r.created_ms),
  attempts: Number(r.attempts),
  lastAttemptMs: r.last_attempt_ms === null ? null : Number(r.last_attempt_ms),
  lastError: r.last_error,
  sentMs: r.sent_ms === null ? null : Number(r.sent_ms),
});

export interface PgOptions {
  /** A schema to live in (tests: one per run, dropped after). Default: the
   *  connection's search_path, i.e. `public`. */
  schema?: string;
  /** Pool size; the server is single-instance and serialises per
   *  document, so a handful is plenty. */
  max?: number;
}

export class PgPersistence implements Persistence {
  private constructor(
    private readonly pool: pg.Pool,
    readonly schema: string | null,
  ) {}

  /** Connect, create the schema if asked for one, migrate, and hand back
   *  a backend ready for `DocStore.loadAll`. */
  static async open(databaseUrl: string, opts: PgOptions = {}): Promise<PgPersistence> {
    const schema = opts.schema ?? null;
    if (schema !== null && !/^[a-z_][a-z0-9_]*$/.test(schema)) {
      throw new Error(`schema name '${schema}' is not a plain identifier`);
    }
    const pool = new pg.Pool({
      connectionString: databaseUrl,
      max: opts.max ?? 5,
      // fail fast rather than wait unboundedly (finding 14): a wedged
      // connection otherwise becomes a wedged shutdown
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 60_000,
      options: `-c statement_timeout=30000${schema !== null ? ` -c search_path=${schema}` : ''}`,
    });
    // a pool error on an idle client must not be an uncaught exception
    pool.on('error', (e) => console.error('pg pool:', e));
    const p = new PgPersistence(pool, schema);
    try {
      if (schema !== null) await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
      await p.migrate();
    } catch (e) {
      await pool.end();
      throw e;
    }
    return p;
  }

  private async migrate(): Promise<void> {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      // one migrator at a time: two processes booting together must not
      // both create the tables
      // two-key locks keep the namespaces apart (review #2, finding 10):
      // class 0 is the migrator, class 1 the per-document append
      await c.query('SELECT pg_advisory_xact_lock(0, 727001)');
      // the lock-then-read below assumes read committed; pin it, so a
      // server-level isolation default cannot make the loser of the lock
      // read a pre-winner snapshot (finding 11)
      await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await c.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
        version    int PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);
      const { rows } = await c.query<{ version: number }>(
        'SELECT version FROM schema_migrations ORDER BY version');
      const applied = new Set(rows.map((r) => Number(r.version)));
      const newest = rows.length > 0 ? Number(rows[rows.length - 1]!.version) : 0;
      if (newest > SCHEMA_VERSION) {
        throw new Error(`database schema is version ${newest}; this build knows ` +
          `${SCHEMA_VERSION} — refusing to write an older shape`);
      }
      for (const m of MIGRATIONS) {
        if (applied.has(m.version)) continue;
        await c.query(m.sql);
        await c.query('INSERT INTO schema_migrations (version) VALUES ($1)', [m.version]);
      }
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
  }

  /* -- documents ---------------------------------------------------------- */

  async listDocIds(): Promise<string[]> {
    // a document is one with at least one log entry, as on disk (a
    // directory without log.jsonl is not listed there either)
    const { rows } = await this.pool.query<{ id: string }>(
      `SELECT d.id FROM documents d
        WHERE EXISTS (SELECT 1 FROM document_log l WHERE l.document_id = d.id)
        ORDER BY d.created_at, d.id`);
    return rows.map((r) => r.id);
  }

  async createDoc(id: string): Promise<void> {
    await this.pool.query(
      'INSERT INTO documents (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [id]);
  }

  async readDocLog(id: string): Promise<LogEntry[]> {
    return (await this.readChain('document_log', id)) as LogEntry[];
  }

  async appendDocLog(id: string, entries: readonly LogEntry[]): Promise<void> {
    await this.appendChain('document_log', id, entries);
  }

  async readProvisional(id: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ text: string }>(
      'SELECT text FROM provisional WHERE document_id = $1', [id]);
    return rows[0]?.text ?? null;
  }

  async writeProvisional(id: string, text: string | null): Promise<void> {
    if (text === null) {
      await this.pool.query('DELETE FROM provisional WHERE document_id = $1', [id]);
    } else {
      await this.pool.query(
        `INSERT INTO provisional (document_id, text) VALUES ($1, $2)
          ON CONFLICT (document_id) DO UPDATE SET text = EXCLUDED.text`, [id, text]);
    }
  }

  /* -- the engine --------------------------------------------------------- */

  async readEngineLog(id: string): Promise<unknown[]> {
    return this.readChain('engine_log', id);
  }

  async appendEngineLog(id: string, entries: readonly unknown[]): Promise<void> {
    await this.appendChain('engine_log', id, entries as readonly ChainedEntry[]);
  }

  async readBridgeState(id: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ state: string }>(
      'SELECT state FROM bridge_state WHERE document_id = $1', [id]);
    return rows[0]?.state ?? null;
  }

  async writeBridgeState(id: string, serialized: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO bridge_state (document_id, state) VALUES ($1, $2)
        ON CONFLICT (document_id) DO UPDATE SET state = EXCLUDED.state`, [id, serialized]);
  }

  /* -- tokens -------------------------------------------------------------- */

  async putTokens(entries: ReadonlyArray<readonly [string, TokenRecord]>): Promise<void> {
    if (entries.length === 0) return;
    const hashes = entries.map(([h]) => h);
    const records = entries.map(([, r]) => JSON.stringify(r));
    const exps = entries.map(([, r]) => r.expMs);
    await this.pool.query(
      `INSERT INTO tokens (hash, record, exp_ms)
        SELECT * FROM unnest($1::text[], $2::text[], $3::bigint[])
        ON CONFLICT (hash) DO UPDATE SET record = EXCLUDED.record, exp_ms = EXCLUDED.exp_ms`,
      [hashes, records, exps]);
  }

  async takeToken(hash: string): Promise<TokenRecord | null> {
    // single use as one statement: two racing requests cannot both get it
    const { rows } = await this.pool.query<{ record: string }>(
      'DELETE FROM tokens WHERE hash = $1 RETURNING record', [hash]);
    return rows.length === 0 ? null : JSON.parse(rows[0]!.record) as TokenRecord;
  }

  async sweepTokens(nowMs: number): Promise<void> {
    await this.pool.query('DELETE FROM tokens WHERE exp_ms < $1', [nowMs]);
  }

  /* -- stashes -------------------------------------------------------------- */

  async putStash(key: string, rec: StashRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO stashes (key, text, exp_ms, slug, doc_id) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (key) DO UPDATE SET text = EXCLUDED.text, exp_ms = EXCLUDED.exp_ms,
          slug = EXCLUDED.slug, doc_id = EXCLUDED.doc_id`,
      [key, rec.text, rec.expMs, rec.slug ?? null, rec.docId ?? null]);
  }

  async getStash(key: string): Promise<StashRecord | null> {
    const { rows } = await this.pool.query<{ text: string; exp_ms: string; slug: string | null;
      doc_id: string | null }>(
      'SELECT text, exp_ms, slug, doc_id FROM stashes WHERE key = $1', [key]);
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return { text: r.text, expMs: Number(r.exp_ms),
      ...(r.slug === null ? {} : { slug: r.slug }),
      ...(r.doc_id === null ? {} : { docId: r.doc_id }) };
  }

  async deleteStash(key: string): Promise<void> {
    await this.pool.query('DELETE FROM stashes WHERE key = $1', [key]);
  }

  async sweepStashes(nowMs: number): Promise<void> {
    await this.pool.query('DELETE FROM stashes WHERE exp_ms < $1', [nowMs]);
  }

  async findStashBySlug(slug: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ key: string }>(
      'SELECT key FROM stashes WHERE slug = $1 LIMIT 1', [slug]);
    return rows.length === 0 ? null : rows[0]!.key;
  }

  /* -- the mail outbox ------------------------------------------------------ */

  async putOutbox(rows: readonly OutboxRow[]): Promise<void> {
    if (rows.length === 0) return;
    await this.pool.query(
      `INSERT INTO outbox (id, document_id, addressee, subject, body, link, token_hash,
                           created_ms, attempts, last_attempt_ms, last_error, sent_ms)
        SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                             $6::text[], $7::text[], $8::bigint[], $9::int[], $10::bigint[],
                             $11::text[], $12::bigint[])
        ON CONFLICT (id) DO UPDATE SET
          document_id = EXCLUDED.document_id, addressee = EXCLUDED.addressee,
          subject = EXCLUDED.subject, body = EXCLUDED.body, link = EXCLUDED.link,
          token_hash = EXCLUDED.token_hash, created_ms = EXCLUDED.created_ms,
          attempts = EXCLUDED.attempts, last_attempt_ms = EXCLUDED.last_attempt_ms,
          last_error = EXCLUDED.last_error, sent_ms = EXCLUDED.sent_ms`,
      [
        rows.map((r) => r.id), rows.map((r) => r.documentId), rows.map((r) => r.to),
        rows.map((r) => r.subject), rows.map((r) => r.body), rows.map((r) => r.link ?? null),
        rows.map((r) => r.tokenHash ?? null), rows.map((r) => r.createdMs),
        rows.map((r) => r.attempts), rows.map((r) => r.lastAttemptMs),
        rows.map((r) => r.lastError), rows.map((r) => r.sentMs),
      ]);
  }

  async listPendingOutbox(nowMs: number, limit: number): Promise<OutboxRow[]> {
    // **The backoff is stated twice and asserted equal once.** `outboxDue`
    // is the file store's copy of this predicate; a pg test walks the same
    // attempt counts through both, so the two cannot drift silently. The
    // formula is `outboxBackoffMs`: nothing on the first attempt, then 30s
    // doubling to a ceiling of an hour. `attempts <= 0` is stated on its
    // own because `POWER(2, attempts - 1)` is 0.5 there, not 0 — the one
    // count at which the SQL and `outboxBackoffMs` would otherwise disagree.
    // It is a **zero backoff, not a bypass**: written as its own OR arm it
    // made every attempts-0 row due whatever the clock said, which is not
    // what `outboxDue` does with the same row and is how a pass running at
    // an earlier instant than the last attempt would re-offer a mail.
    const { rows } = await this.pool.query<OutboxDbRow>(
      `SELECT id, document_id, addressee, subject, body, link, token_hash, created_ms,
              attempts, last_attempt_ms, last_error, sent_ms
         FROM outbox
        WHERE sent_ms IS NULL AND attempts < $2
          AND (last_attempt_ms IS NULL
               OR last_attempt_ms + (CASE WHEN attempts <= 0 THEN 0
                    ELSE LEAST($3::bigint, $4::bigint * POWER(2, attempts - 1)) END) <= $1)
        ORDER BY created_ms, id
        LIMIT $5`,
      // both magic numbers read out of the shared function rather than
      // repeated: `outboxBackoffMs(1)` is the base, and any large attempt
      // count is the ceiling
      [nowMs, OUTBOX_MAX_ATTEMPTS, outboxBackoffMs(64), outboxBackoffMs(1), limit]);
    return rows.map(outboxOf);
  }

  async listOutboxFor(documentId: string, to: string): Promise<OutboxRow[]> {
    const { rows } = await this.pool.query<OutboxDbRow>(
      `SELECT id, document_id, addressee, subject, body, link, token_hash, created_ms,
              attempts, last_attempt_ms, last_error, sent_ms
         FROM outbox
        WHERE document_id = $1 AND lower(addressee) = lower($2)
        ORDER BY created_ms, id`, [documentId, to]);
    return rows.map(outboxOf);
  }

  async markOutboxSent(id: string, sentMs: number): Promise<void> {
    // the link and its token hash leave with the send: a delivered row is a
    // receipt, not a credential store
    await this.pool.query(
      `UPDATE outbox SET sent_ms = $2, last_error = NULL, link = NULL, token_hash = NULL
        WHERE id = $1`, [id, sentMs]);
  }

  async pruneOutbox(beforeMs: number): Promise<number> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM outbox WHERE sent_ms IS NOT NULL AND sent_ms < $1', [beforeMs]);
    return rowCount ?? 0;
  }

  async markOutboxFailed(id: string, attempts: number, lastAttemptMs: number,
    lastError: string): Promise<void> {
    await this.pool.query(
      `UPDATE outbox SET attempts = $2, last_attempt_ms = $3, last_error = $4
        WHERE id = $1`, [id, attempts, lastAttemptMs, lastError]);
  }

  async outboxCounts(): Promise<{ pending: number; failed: number }> {
    const { rows } = await this.pool.query<{ pending: string; failed: string }>(
      `SELECT count(*) FILTER (WHERE attempts < $1) AS pending,
              count(*) FILTER (WHERE attempts >= $1) AS failed
         FROM outbox WHERE sent_ms IS NULL`, [OUTBOX_MAX_ATTEMPTS]);
    return { pending: Number(rows[0]?.pending ?? 0), failed: Number(rows[0]?.failed ?? 0) };
  }

  /* -- enumeration for the copier (copy-store.ts), never for the server -- */

  async dumpOutbox(): Promise<OutboxRow[]> {
    const { rows } = await this.pool.query<OutboxDbRow>(
      `SELECT id, document_id, addressee, subject, body, link, token_hash, created_ms,
              attempts, last_attempt_ms, last_error, sent_ms
         FROM outbox ORDER BY id`);
    return rows.map(outboxOf);
  }

  async dumpTokens(): Promise<Array<readonly [string, TokenRecord]>> {
    const { rows } = await this.pool.query<{ hash: string; record: string }>(
      'SELECT hash, record FROM tokens ORDER BY hash');
    return rows.map((r) => [r.hash, JSON.parse(r.record) as TokenRecord] as const);
  }

  async dumpStashes(): Promise<Array<readonly [string, StashRecord]>> {
    const { rows } = await this.pool.query<{ key: string; text: string; exp_ms: string;
      slug: string | null; doc_id: string | null }>(
      'SELECT key, text, exp_ms, slug, doc_id FROM stashes ORDER BY key');
    return rows.map((r) => [r.key, { text: r.text, expMs: Number(r.exp_ms),
      ...(r.slug === null ? {} : { slug: r.slug }),
      ...(r.doc_id === null ? {} : { docId: r.doc_id }) }] as const);
  }

  /* -- lifecycle ------------------------------------------------------------ */

  async close(): Promise<void> {
    await this.pool.end();
  }

  /** Tests only: drop the schema this backend was opened in, then close. */
  async dropSchemaAndClose(): Promise<void> {
    // the one irreversible statement in the file: only a throwaway schema
    // (finding 9) — never public, never anything a server was opened in
    if (this.schema === null || !/^(t|drill)_/.test(this.schema)) {
      throw new Error(`refusing to drop schema '${this.schema ?? 'public'}' — not a throwaway`);
    }
    await this.pool.query(`DROP SCHEMA ${this.schema} CASCADE`);
    await this.close();
  }

  /* -- the chains ----------------------------------------------------------- */

  private async readChain(table: 'document_log' | 'engine_log', id: string):
    Promise<ChainedEntry[]> {
    const { rows } = await this.pool.query<LogRow>(
      `SELECT seq, prev_hash, hash, event, schema_version FROM ${table}
        WHERE document_id = $1 ORDER BY seq`, [id]);
    return rows.map((r) => ({
      seq: Number(r.seq),
      hash: r.hash,
      prevHash: r.prev_hash,
      event: JSON.parse(r.event) as unknown,
      // absent stays absent (stage 5: absent means 1, read via versionOf),
      // so a round trip through here is byte-identical to the file
      ...(r.schema_version === null ? {} : { schemaVersion: Number(r.schema_version) }),
    }));
  }

  private async appendChain(table: 'document_log' | 'engine_log', id: string,
    entries: readonly ChainedEntry[]): Promise<void> {
    if (entries.length === 0) return;
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      // one writer per document per batch; the primary key catches the
      // writer that slipped in between
      await c.query('SELECT pg_advisory_xact_lock(1, hashtext($1))', [id]);
      await c.query(
        `INSERT INTO ${table} (document_id, seq, prev_hash, hash, event, schema_version)
          SELECT $1, * FROM unnest($2::int[], $3::text[], $4::text[], $5::text[], $6::int[])`,
        [
          id,
          entries.map((e) => e.seq),
          entries.map((e) => e.prevHash),
          entries.map((e) => e.hash),
          entries.map((e) => JSON.stringify(e.event)),
          entries.map((e) => e.schemaVersion ?? null),
        ]);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
  }
}
