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
import type { LogEntry } from '../../constitution/src/index.js';

export interface PendingCreate {
  title: string;
  slug: string;
  email: string;
  isMember: boolean;
  /** Hash of the pre-save text stash's capability id (§9.7a v0.55). */
  stashKey?: string;
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
}

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

  /* -- lifecycle ---------------------------------------------------------- */
  /** Release what the backend holds (a connection pool); called once at
   *  shutdown after every commit has drained. Optional: files need none. */
  close?(): Promise<void>;
}

export class FilePersistence implements Persistence {
  private readonly docsDir: string;
  private readonly tokensPath: string;
  private readonly stashPath: string;
  private readonly tokens: Map<string, TokenRecord>;
  private readonly stashes: Map<string, StashRecord>;

  constructor(dataDir: string) {
    this.docsDir = join(dataDir, 'docs');
    mkdirSync(this.docsDir, { recursive: true });
    this.tokensPath = join(dataDir, 'tokens.json');
    this.stashPath = join(dataDir, 'pending.json');
    this.tokens = loadJsonMap<TokenRecord>(this.tokensPath);
    this.stashes = loadJsonMap<StashRecord>(this.stashPath);
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

  /* -- enumeration for the copier (copy-store.ts), never for the server -- */

  async dumpTokens(): Promise<Array<readonly [string, TokenRecord]>> {
    return [...this.tokens.entries()];
  }

  async dumpStashes(): Promise<Array<readonly [string, StashRecord]>> {
    return [...this.stashes.entries()];
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
