/**
 * Persistence (PRODUCTION.md stage 2): the one seam between the server's
 * logic and where its bytes live. Everything above this interface —
 * replay, slug indexing, token single-use, stash expiry — is storage-
 * agnostic logic in store.ts/auth.ts/stash.ts/engine-host.ts; everything
 * below it is one backend. FilePersistence is today's backend and keeps
 * the exact on-disk layout the server has always written (docs/<id>/
 * log.jsonl + provisional.json + engine.jsonl + bridge.json, tokens.json,
 * pending.json), so existing data directories keep working unchanged.
 * The Postgres backend (stage 6, decision 436) implements the same
 * interface — the storage swap must be a substitution, not a rewrite.
 *
 * Ordering: callers serialize writes per document (server.ts's commit
 * chain); the interface promises only that each call is durable before
 * its promise resolves. takeToken is the one atomic primitive — delete-
 * and-return in a single act, because a single-use token must not verify
 * twice for two racing requests (here: one synchronous map operation;
 * Postgres: DELETE … RETURNING).
 */
import {
  appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync,
  rmSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { LogEntry, ShapeName } from '../../constitution/src/index.js';

export interface PendingCreate {
  title: string;
  slug: string;
  email: string;
  isMember: boolean;
  /** Hash of the pre-save text stash's capability id (§9.7a v0.55). */
  stashKey?: string;
  /** The 🧭 shape chosen before 📧 (entry 166); absent is custom. Restated by every send. */
  shape?: ShapeName;
}

export interface TokenRecord {
  kind: 'create' | 'login' | 'apply';
  email: string;
  expMs: number;
  docId?: string;
  memberId?: string;
  applicantId?: string;
  pending?: PendingCreate;
}

export interface StashRecord {
  text: string;
  expMs: number;
  /** The address promised at the birth (Q460/462b): reserved while the
   *  pending creation lives, released when it is claimed or expires. */
  slug?: string;
  /** The document this pending creation became (Q519). A re-send mints a
   *  second link against one creation, and every link stays live: the first
   *  one followed creates the document and records it here, and the rest
   *  forward to it rather than founding a twin. Set at the save, so a stash
   *  carrying it is spent; swept with the rest at expiry. */
  docId?: string;
}

/**
 * One pending mail (PRODUCTION.md stage 6's outbox, review #1 finding 15).
 * Written after the commit that implies it and before anything is handed
 * to a provider, so a transient refusal is a row that is still there next
 * minute rather than an invitation the log says was sent.
 *
 * `attempts` is the whole of the state machine: a row with `sentMs` set is
 * done, a row without one is **pending** below `OUTBOX_MAX_ATTEMPTS` and
 * **failed** at or above it — so nothing has to remember to write a status
 * column, and refusing an address for good is `attempts = max` with the
 * reason in `lastError`.
 */
export interface OutboxRow {
  /** Random, ours: the id is what makes a re-send idempotent. */
  id: string;
  /** The document the mail is about; null for the operator notification. */
  documentId: string | null;
  to: string;
  subject: string;
  body: string;
  /** The magic link, kept beside the body so the dev inbox stays easy to drive. */
  link?: string;
  /**
   * The sha256 of the token the link carries, where it carries one. A row
   * that exhausts its attempts has its token revoked: a link nobody
   * received must not stay live for the week its expiry promised.
   */
  tokenHash?: string;
  createdMs: number;
  attempts: number;
  lastAttemptMs: number | null;
  lastError: string | null;
  sentMs: number | null;
}

/**
 * How many times a mail is offered to the provider before it is left for
 * an operator. Six attempts spread over the backoff below is a little
 * under three hours — long enough to ride out a provider incident, short
 * enough that a genuinely dead address is visible in `/healthz` the same
 * morning.
 */
export const OUTBOX_MAX_ATTEMPTS = 6;

/** Exponential, from half a minute, capped at an hour. Attempt 0 is due
 *  immediately; the argument is how many attempts have already failed. */
export function outboxBackoffMs(attempts: number): number {
  if (attempts <= 0) return 0;
  return Math.min(3_600_000, 30_000 * 2 ** (attempts - 1));
}

/** Whether a row is ready to be offered again. Both backends ask this. */
export const outboxDue = (row: OutboxRow, nowMs: number): boolean =>
  row.sentMs === null && row.attempts < OUTBOX_MAX_ATTEMPTS &&
  (row.lastAttemptMs === null ||
    row.lastAttemptMs + outboxBackoffMs(row.attempts) <= nowMs);

export interface Persistence {
  /* -- documents: one append-only hash-chained log each ------------------ */
  listDocIds(): Promise<string[]>;
  createDoc(id: string): Promise<void>;
  readDocLog(id: string): Promise<LogEntry[]>;
  appendDocLog(id: string, entries: readonly LogEntry[]): Promise<void>;
  readProvisional(id: string): Promise<string | null>;
  writeProvisional(id: string, text: string | null): Promise<void>;

  /* -- the engine beside it: its own log, plus the bridge state --------- */
  readEngineLog(id: string): Promise<unknown[]>;
  appendEngineLog(id: string, entries: readonly unknown[]): Promise<void>;
  /** The serialized bridge state, or null if the engine never ran. */
  readBridgeState(id: string): Promise<string | null>;
  writeBridgeState(id: string, serialized: string): Promise<void>;

  /* -- magic-link tokens, keyed by their hash ---------------------------- */
  putTokens(entries: ReadonlyArray<readonly [string, TokenRecord]>): Promise<void>;
  /** Atomic single use: delete and return in one act; null if absent. */
  takeToken(hash: string): Promise<TokenRecord | null>;
  /** Drop every token whose expMs is before nowMs. */
  sweepTokens(nowMs: number): Promise<void>;

  /* -- the pre-save text stash (§9.7a v0.55) ----------------------------- */
  putStash(key: string, rec: StashRecord): Promise<void>;
  getStash(key: string): Promise<StashRecord | null>;
  deleteStash(key: string): Promise<void>;
  sweepStashes(nowMs: number): Promise<void>;
  /** The key of the live stash holding this slug, or null (Q462b). */
  findStashBySlug(slug: string): Promise<string | null>;

  /* -- the mail outbox (finding 15) -------------------------------------- */
  /** Durably enqueue; the caller's promise resolving means the mail cannot
   *  be lost by a provider refusal or a restart. */
  putOutbox(rows: readonly OutboxRow[]): Promise<void>;
  /** Unsent rows below the attempt cap whose backoff has elapsed, oldest
   *  first. `dueMs` is the latest `lastAttemptMs + backoff` a row may carry
   *  and still be served; a row never attempted is always due. */
  listPendingOutbox(nowMs: number, limit: number): Promise<OutboxRow[]>;
  /**
   * One document's rows to one address, oldest first — the join a dead mail
   * makes back to a register row, which is by address because `OutboxRow`
   * carries no member id (SURFACE E34). Sent rows included: the forced
   * give-up is about mail that has been offered, not only mail that is due.
   */
  listOutboxFor(documentId: string, to: string): Promise<OutboxRow[]>;
  /**
   * A row is done. **The link goes with it**: the queue is not an archive,
   * and a delivered row that keeps its magic link turns the outbox into a
   * permanent plaintext store of every credential the server has ever
   * minted — which is exactly what `Auth.revoke` exists to prevent for the
   * undelivered ones.
   */
  markOutboxSent(id: string, sentMs: number): Promise<void>;
  /** Record one failed attempt: the new count, when it was made, and why. */
  markOutboxFailed(id: string, attempts: number, lastAttemptMs: number,
    lastError: string): Promise<void>;
  /** `/healthz`'s two numbers: unsent under the cap, and unsent at it. */
  outboxCounts(): Promise<{ pending: number; failed: number }>;
  /**
   * Drop rows that finished before `beforeMs`. The queue is a queue: nothing
   * reads a sent row, the file store rewrites its whole map on every mark
   * (so an unpruned outbox makes every send quadratic), and a mail body is
   * member-written text nobody asked us to keep. Failed rows are left
   * standing — they are what `/healthz` is counting.
   */
  pruneOutbox(beforeMs: number): Promise<number>;

  /* -- lifecycle ---------------------------------------------------------- */
  /** Release what the backend holds (a connection pool); called once at
   *  shutdown after every commit has drained. Optional: files need none. */
  close?(): Promise<void>;
}

export class FilePersistence implements Persistence {
  private readonly docsDir: string;
  private readonly tokensPath: string;
  private readonly stashPath: string;
  private readonly outboxPath: string;
  private readonly tokens: Map<string, TokenRecord>;
  private readonly stashes: Map<string, StashRecord>;
  private readonly outbox: Map<string, OutboxRow>;

  constructor(dataDir: string) {
    this.docsDir = join(dataDir, 'docs');
    mkdirSync(this.docsDir, { recursive: true });
    this.tokensPath = join(dataDir, 'tokens.json');
    this.stashPath = join(dataDir, 'pending.json');
    // **Not `outbox.jsonl`**, which the dev inbox has owned since the
    // mailer was written and which `GET /api/dev/outbox` tails: that file
    // is a record of what was *sent*, this one is a queue of what has not
    // been. Two different things, and one name for both would make the
    // developer's inbox fill with mail nobody had received yet.
    this.outboxPath = join(dataDir, 'mail-outbox.json');
    this.tokens = loadJsonMap<TokenRecord>(this.tokensPath);
    this.stashes = loadJsonMap<StashRecord>(this.stashPath);
    this.outbox = loadJsonMap<OutboxRow>(this.outboxPath);
  }

  /* -- documents ---------------------------------------------------------- */

  async listDocIds(): Promise<string[]> {
    return readdirSync(this.docsDir)
      .filter((id) => existsSync(join(this.docsDir, id, 'log.jsonl')));
  }

  async createDoc(id: string): Promise<void> {
    mkdirSync(join(this.docsDir, id), { recursive: true });
  }

  async readDocLog(id: string): Promise<LogEntry[]> {
    return readJsonl<LogEntry>(join(this.docsDir, id, 'log.jsonl'));
  }

  async appendDocLog(id: string, entries: readonly LogEntry[]): Promise<void> {
    appendJsonl(join(this.docsDir, id, 'log.jsonl'), entries);
  }

  async readProvisional(id: string): Promise<string | null> {
    const path = join(this.docsDir, id, 'provisional.json');
    if (!existsSync(path)) return null;
    return (JSON.parse(readFileSync(path, 'utf8')) as { text: string }).text;
  }

  async writeProvisional(id: string, text: string | null): Promise<void> {
    const path = join(this.docsDir, id, 'provisional.json');
    if (text === null) rmSync(path, { force: true });
    else writeFileSync(path, JSON.stringify({ text }), 'utf8');
  }

  /* -- the engine --------------------------------------------------------- */

  async readEngineLog(id: string): Promise<unknown[]> {
    return readJsonl<unknown>(join(this.docsDir, id, 'engine.jsonl'));
  }

  async appendEngineLog(id: string, entries: readonly unknown[]): Promise<void> {
    appendJsonl(join(this.docsDir, id, 'engine.jsonl'), entries);
  }

  async readBridgeState(id: string): Promise<string | null> {
    const path = join(this.docsDir, id, 'bridge.json');
    return existsSync(path) ? readFileSync(path, 'utf8') : null;
  }

  async writeBridgeState(id: string, serialized: string): Promise<void> {
    // temp-then-rename: a crash mid-write must not leave a half-written
    // file that fails to parse at the next boot (review #2, finding 1)
    const path = join(this.docsDir, id, 'bridge.json');
    writeFileSync(path + '.tmp', serialized, 'utf8');
    renameSync(path + '.tmp', path);
  }

  /* -- tokens -------------------------------------------------------------- */

  async putTokens(entries: ReadonlyArray<readonly [string, TokenRecord]>): Promise<void> {
    for (const [hash, rec] of entries) this.tokens.set(hash, rec);
    this.saveTokens();
  }

  async takeToken(hash: string): Promise<TokenRecord | null> {
    const rec = this.tokens.get(hash) ?? null;
    if (rec !== null) {
      this.tokens.delete(hash);
      this.saveTokens();
    }
    return rec;
  }

  async sweepTokens(nowMs: number): Promise<void> {
    let dropped = false;
    for (const [hash, rec] of this.tokens) {
      if (rec.expMs < nowMs) { this.tokens.delete(hash); dropped = true; }
    }
    if (dropped) this.saveTokens();
  }

  /* -- stashes -------------------------------------------------------------- */

  async putStash(key: string, rec: StashRecord): Promise<void> {
    this.stashes.set(key, rec);
    this.saveStashes();
  }

  async getStash(key: string): Promise<StashRecord | null> {
    return this.stashes.get(key) ?? null;
  }

  async deleteStash(key: string): Promise<void> {
    if (this.stashes.delete(key)) this.saveStashes();
  }

  async findStashBySlug(slug: string): Promise<string | null> {
    for (const [key, rec] of this.stashes) if (rec.slug === slug) return key;
    return null;
  }

  async sweepStashes(nowMs: number): Promise<void> {
    let dropped = false;
    for (const [key, rec] of this.stashes) {
      if (rec.expMs < nowMs) { this.stashes.delete(key); dropped = true; }
    }
    if (dropped) this.saveStashes();
  }

  /* -- the mail outbox ------------------------------------------------------ */

  async putOutbox(rows: readonly OutboxRow[]): Promise<void> {
    if (rows.length === 0) return;
    for (const row of rows) this.outbox.set(row.id, row);
    this.saveOutbox();
  }

  async listPendingOutbox(nowMs: number, limit: number): Promise<OutboxRow[]> {
    return [...this.outbox.values()]
      .filter((r) => outboxDue(r, nowMs))
      .sort((a, b) => a.createdMs - b.createdMs || (a.id < b.id ? -1 : 1))
      .slice(0, limit);
  }

  async listOutboxFor(documentId: string, to: string): Promise<OutboxRow[]> {
    const at = to.toLowerCase();
    return [...this.outbox.values()]
      .filter((r) => r.documentId === documentId && r.to.toLowerCase() === at)
      .sort((a, b) => a.createdMs - b.createdMs || (a.id < b.id ? -1 : 1));
  }

  async markOutboxSent(id: string, sentMs: number): Promise<void> {
    const row = this.outbox.get(id);
    if (row === undefined) return;
    // the link and its token hash leave with the send: a delivered row is a
    // receipt, not a credential store
    const rest = { ...row };
    delete rest.link;
    delete rest.tokenHash;
    this.outbox.set(id, { ...rest, sentMs, lastError: null });
    this.saveOutbox();
  }

  async pruneOutbox(beforeMs: number): Promise<number> {
    let dropped = 0;
    for (const [id, row] of this.outbox) {
      if (row.sentMs !== null && row.sentMs < beforeMs) { this.outbox.delete(id); dropped += 1; }
    }
    if (dropped > 0) this.saveOutbox();
    return dropped;
  }

  async markOutboxFailed(id: string, attempts: number, lastAttemptMs: number,
    lastError: string): Promise<void> {
    const row = this.outbox.get(id);
    if (row === undefined) return;
    this.outbox.set(id, { ...row, attempts, lastAttemptMs, lastError });
    this.saveOutbox();
  }

  async outboxCounts(): Promise<{ pending: number; failed: number }> {
    let pending = 0;
    let failed = 0;
    for (const r of this.outbox.values()) {
      if (r.sentMs !== null) continue;
      if (r.attempts >= OUTBOX_MAX_ATTEMPTS) failed += 1;
      else pending += 1;
    }
    return { pending, failed };
  }

  /* -- enumeration for the copier (copy-store.ts), never for the server -- */

  async dumpTokens(): Promise<Array<readonly [string, TokenRecord]>> {
    return [...this.tokens.entries()];
  }

  async dumpStashes(): Promise<Array<readonly [string, StashRecord]>> {
    return [...this.stashes.entries()];
  }

  async dumpOutbox(): Promise<OutboxRow[]> {
    return [...this.outbox.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  }

  private saveOutbox(): void {
    writeFileSync(this.outboxPath,
      JSON.stringify(Object.fromEntries(this.outbox), null, 2), 'utf8');
  }

  private saveTokens(): void {
    writeFileSync(this.tokensPath,
      JSON.stringify(Object.fromEntries(this.tokens), null, 2), 'utf8');
  }

  private saveStashes(): void {
    writeFileSync(this.stashPath,
      JSON.stringify(Object.fromEntries(this.stashes), null, 2), 'utf8');
  }
}

/* -------------------------------------------------------------------------- */

function loadJsonMap<T>(path: string): Map<string, T> {
  return new Map(
    existsSync(path)
      ? Object.entries(JSON.parse(readFileSync(path, 'utf8')) as Record<string, T>)
      : [],
  );
}

function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split('\n')
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as T);
}

function appendJsonl(path: string, entries: readonly unknown[]): void {
  if (entries.length === 0) return;
  appendFileSync(path, entries.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
}

/**
 * Per-key write serialization: two commits to one document must not
 * interleave their read-slice-append sequences, or the second slices the
 * log before the first has recorded what it persisted and the tail is
 * written twice. One chain per key; a failed link reports to its own
 * caller and never breaks the chain for the next.
 */
export class WriteChain {
  private readonly tails = new Map<string, Promise<unknown>>();

  run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const tail = this.tails.get(key) ?? Promise.resolve();
    const next = tail.then(fn, fn);
    this.tails.set(key, next.catch(() => undefined));
    return next;
  }

  /** Resolve once every chain's current tail has settled (PRODUCTION.md
   *  stage 7): shutdown waits on this before closing the store, so a
   *  deploy's SIGTERM never tears an append. Links enqueued after the
   *  call are not waited for — the caller stops accepting first. */
  async drain(): Promise<void> {
    await Promise.all([...this.tails.values()]);
  }
}
