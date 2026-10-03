/**
 * Document persistence (Q368): one append-only JSONL of hash-chained
 * LogEntry per document — the ConstitutionSession's own log, verbatim.
 * Loading is replay (chain verified by the module); persisting a command
 * is appending the entries it emitted. One deliberate sidecar sits beside
 * the log: provisional.json, the founder's not-yet-confirmed starting
 * text (§9.7a v0.55) — exactly the state the log must NOT hold, because
 * nothing about it has been decided. Everything decided is in the log,
 * which is the §11 property made operational: the log IS the document.
 *
 * Since PRODUCTION.md stage 2 this class is storage-agnostic: where the
 * bytes live is the Persistence seam's business, and this file keeps only
 * the logic — replay, the slug index, the fresh-entry slice.
 */
import { ConstitutionSession, InMemoryPeople, PEOPLE_SCHEMA_VERSION, slugify, versionOf }
  from '../../constitution/src/index.js';
import type { LogEntry, PersonFields, PersonId } from '../../constitution/src/index.js';
import type { OpenInput } from '../../constitution/src/index.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Persistence, PersonRow, RegistryRow } from './persistence.js';

/**
 * The module's `People` port over the store (decision 1253): the rows a
 * document was loaded with, plus which of them a command has touched since
 * the last persist. `persist` takes the dirty set and writes it beside the
 * fresh entries in one act; the module itself never learns that anything
 * is being persisted, which is what keeps it pure.
 */
export class StorePeople extends InMemoryPeople {
  private dirty = new Set<PersonId>();

  constructor(rows: readonly PersonRow[] = []) {
    super(rows.map((r) => [r.personId, { email: r.email, name: r.name, picture: r.picture }] as const));
  }

  override set(id: PersonId, patch: Partial<PersonFields>): void {
    super.set(id, patch);
    this.dirty.add(id);
  }

  /** The rows touched since the last call, as the store writes them. */
  takeDirty(): PersonRow[] {
    const out: PersonRow[] = [];
    for (const id of this.dirty) {
      const row = this.get(id);
      if (row !== null) out.push({ personId: id, ...row });
    }
    this.dirty.clear();
    return out;
  }

  /**
   * **Rows an append did not land stay dirty** (issue #7). `takeDirty`
   * empties the set before the append is awaited, and there was no way back:
   * one transient store error — a Postgres transaction that rolls back rows
   * and entries together — dropped those rows for ever, because the next
   * persist re-sends the entries and the set no longer names the rows. The
   * log holds no identity (decision 1253), so what was lost was a member's
   * only address, name and picture: after the next boot they could not log
   * in by magic link again and read as erased to everybody, while the log
   * itself was complete and nothing was quarantined or even logged.
   *
   * Adding back is safe under a command that landed mid-append: the set is a
   * set, and a person touched while the append was in flight is named by it
   * already, so the next persist writes whatever their row says then.
   */
  restoreDirty(rows: readonly PersonRow[]): void {
    for (const row of rows) this.dirty.add(row.personId);
  }
}

export interface LoadedDoc {
  id: string;
  cs: ConstitutionSession;
  /** The rows beside the log, the same object `cs.people` is (decision 1253). */
  people: StorePeople;
  /** How many log entries are already persisted. */
  persisted: number;
  /**
   * How many of those have had the mail they imply written into the outbox
   * (issue #7). Its own cursor, because the two steps are two acts and only
   * the first of them is the source of truth: the relay ran off what
   * `store.persist` returned, and that cursor had already advanced — so a
   * throw anywhere after the append (the engine persist, the token flush,
   * the outbox write) meant those entries' mail was never sent by anybody,
   * leaving an invitee listed with no mail, no link and nothing to resend.
   * Never ahead of `persisted`: mail follows the fold, and a relay before
   * the append would promise what the log does not hold.
   */
  relayed: number;
  /** The founder's unconfirmed starting text (§9.7a v0.55), or null. */
  provisional: string | null;
  /** When the last save was rejected by the store for a reason a retry
   *  will not clear — another writer holds this document's log (Q1345):
   *  a 23505 under Postgres — or null while saves land. The page reads it
   *  as `stalled` and flies a red flag (Q1346). */
  stalled?: number | null;
  /**
   * **An ephemeral document is persisted by nobody** (design/DEMO.md D1,
   * Stage 1): the demo document lives in memory only, rebuilt from its preset
   * at every boot and every reset. `persist` advances its cursor and writes
   * nothing, the engine persist returns at once, and the write path relays no
   * mail for it (D3). Absent on every other document.
   */
  ephemeral?: true;
  /**
   * When anything last asked for this document (Scaling Stage 2, issue #219):
   * a request that resolved it, a tick that drove it. Its idle clock.
   */
  lastUsedMs?: number;
  /** How many requests in flight hold it (Stage 2): never unloaded above 0. */
  holds?: number;
}

/**
 * **What the load life-cycle asks of the host** (Scaling Stage 2): the engine
 * is the host's (`engine-host.ts`), so the store hands a freshly folded
 * document to `afterLoad` to resume its engine, and asks `rowOf` for the
 * registry row a document leaves behind when it is unloaded.
 */
export interface DocLifecycle {
  afterLoad(doc: LoadedDoc): Promise<void>;
  rowOf(doc: LoadedDoc, nowMs: number): RegistryRow;
}

/** One load, for `/healthz`'s slowest recent load (issue #70's gap). */
export interface LoadRecord { ms: number; atMs: number; why: 'request' | 'tick' | 'boot' }

/** What the load life-cycle did since boot (Stage 2), served on `/healthz`. */
export interface LoadStats {
  loads: number;
  unloads: number;
  /** loads that threw: the document is quarantined, as a boot's would be */
  failed: number;
  /** registry rows rebuilt from the log at boot: missing, or behind the log */
  rebuilt: number;
  /** the loads of the last hour, newest last */
  recent: LoadRecord[];
}

/** How long `/healthz` remembers a load for its slowest-recent figure. */
export const RECENT_LOAD_MS = 60 * 60_000;

/** The one loud line a skipped document earns at boot (decision 1253). */
export const preShapeLine = (id: string): string =>
  `[store] ${id} is the pre-people shape (decision 1253): not loaded`;

export class DocStore {
  /** The documents in memory now. */
  private readonly docs = new Map<string, LoadedDoc>();
  /** Every slug a document has ever worn routes to it (§9.7: no link breaks) —
   *  loaded or not, since Stage 2. */
  private readonly slugIndex = new Map<string, string>();
  /**
   * **Every document this host knows, loaded or not** (Scaling Stage 2): its
   * registry row, or null where it is loaded and no row has been written for
   * it in this process. A row is what the tick reads for a document that is
   * not in memory.
   */
  private readonly registry = new Map<string, RegistryRow | null>();
  /** Loads in flight: concurrent first requests for a cold document share one. */
  private readonly loading = new Map<string, Promise<LoadedDoc | null>>();
  /** The request scope (Stage 2): every document a request opens is held until it ends. */
  private readonly scopes = new AsyncLocalStorage<{ held: Set<LoadedDoc>; open: boolean }>();
  /** The engine's half of a load, and the row an unload leaves; set by the host. */
  lifecycle: DocLifecycle | null = null;
  readonly loadStats: LoadStats = { loads: 0, unloads: 0, failed: 0, rebuilt: 0, recent: [] };
  /** Documents whose logs hold the pre-people shape, skipped at boot (decision 1253). */
  private readonly preShape: string[] = [];
  private readonly quarantine: string[] = [];

  constructor(private readonly persistence: Persistence) {}

  /**
   * **The boot before Stage 2** (`DRAFT_LOAD=eager`): every document read,
   * folded and its engine resumed before `/healthz` answers.
   */
  async loadAll(): Promise<void> {
    for (const id of await this.persistence.listDocIds()) {
      this.registry.set(id, null);
      await this.loadOne(id, 'boot');
    }
  }

  /**
   * **The boot since Stage 2** (issue #219): no document is folded. The
   * registry is read in one go and checked against both logs' lengths; a row
   * that still describes its log routes the document's slugs and tells the
   * tick when it is due. A document with no row, or whose row is behind its
   * log — a crash after a commit, a deploy's old instance, a rollback's build
   * — has its constitution log read and folded for its slugs and phase (tens
   * of milliseconds, the engine left alone), and its row rewritten with no
   * due time this code vouches for, so the tick loads it when it can.
   *
   * Returns the documents the caller should warm before `/healthz` answers
   * (`warm`): those whose engine would replay `minTail` entries or more.
   */
  async loadRegistry(nowMs: number = Date.now(),
    warm?: { codeVersion: string; minTail: number }): Promise<string[]> {
    // one after another, never in parallel: four reads at once opened four
    // pool connections per host where boot had always used one, and a test
    // file holding dozens of hosts ran Postgres out of connections
    const ids = await this.persistence.listDocIds();
    const rows = await this.persistence.readRegistry();
    const lengths = await this.persistence.docLengths();
    const snaps = warm === undefined ? new Map<string, { codeVersion: string; eseq: number }>()
      : await this.persistence.snapshotVersions();
    // **the documents whose first load would replay a long engine tail**:
    // no snapshot this code can take, or one far behind the log — after a
    // deploy that changed the engine, every convention. Folded at a request,
    // one would hold the event loop past the health check (~30 s on Render
    // for nh2026's size), so the caller loads them inside the boot window
    const warmIds: string[] = [];
    if (warm !== undefined) {
      for (const id of ids) {
        const eseq = lengths.get(id)?.eseq ?? 0;
        const snap = snaps.get(id);
        const from = snap !== undefined && snap.codeVersion === warm.codeVersion && snap.eseq <= eseq ? snap.eseq : 0;
        if (eseq - from >= warm.minTail) warmIds.push(id);
      }
    }
    for (const id of ids) {
      const row = rows.get(id);
      const len = lengths.get(id);
      if (row !== undefined && len !== undefined && row.seq === len.seq && row.eseq === len.eseq) {
        this.registry.set(id, row);
        for (const slug of row.slugs) this.slugIndex.set(slug, id);
        continue;
      }
      try {
        const log = await this.persistence.readDocLog(id);
        if (log.some((e) => versionOf(e) < PEOPLE_SCHEMA_VERSION)) {
          console.error(preShapeLine(id));
          this.preShape.push(id);
          continue;
        }
        const people = new StorePeople(await this.persistence.readPeople(id));
        const cs = ConstitutionSession.replay(log, people);
        const fresh: RegistryRow = { slugs: [...cs.slugs],
          phase: cs.closed ? 'closed' : cs.constitutedAtT === null ? 'founding' : 'live',
          // no due time this code vouches for (`clockVersion` empty), so the
          // tick loads it; the constitution's own next clock rides as the
          // order the minute's budget takes such documents in
          dueT: cs.constitutedAtT === null || cs.closed ? null : cs.nextClockT(), lastT: log.length > 0 ? log[log.length - 1]!.event.t : 0, clockVersion: '',
          seq: log.length, eseq: len?.eseq ?? 0, writtenMs: nowMs };
        this.registry.set(id, fresh);
        for (const slug of fresh.slugs) this.slugIndex.set(slug, id);
        this.loadStats.rebuilt += 1;
        await this.persistence.writeRegistry(id, fresh);
      } catch (e) {
        console.error(`document '${id}' failed to load — quarantined:`, e);
        this.quarantine.push(id);
      }
    }
    return warmIds.filter((id) => this.registry.has(id) && !this.quarantine.includes(id));
  }

  /**
   * **Fold one document from the store** — the body `loadAll` always had, and
   * since Stage 2 also every lazy load: the log replayed (its chain verified
   * by the module), the people beside it, the provisional text, and the
   * engine resumed from its snapshot by the host's `afterLoad`.
   */
  private async loadOne(id: string, why: LoadRecord['why']): Promise<LoadedDoc | null> {
    const t0 = performance.now();
    try {
      const log = await this.persistence.readDocLog(id);
      // **The old shape is refused, never read** (decision 1253): named
      // once, counted for `/healthz`, and neither migrated nor allowed to
      // crash the host — a dev data dir may hold such a document until its
      // own wipe; production holds none after it
      if (log.some((e) => versionOf(e) < PEOPLE_SCHEMA_VERSION)) {
        console.error(preShapeLine(id));
        if (!this.preShape.includes(id)) this.preShape.push(id);
        return null;
      }
      const people = new StorePeople(await this.persistence.readPeople(id));
      const cs = ConstitutionSession.replay(log, people);
      const provisional = await this.persistence.readProvisional(id);
      // `relayed` starts level with `persisted` (issue #7): what a past
      // instance persisted, it relayed — a boot must not re-send the mail
      // of every invitation the document has ever carried
      const doc: LoadedDoc = { id, cs, people, persisted: log.length,
        relayed: log.length, provisional };
      if (this.lifecycle !== null) await this.lifecycle.afterLoad(doc);
      this.register(doc);
      this.loadStats.loads += 1;
      this.noteLoad({ ms: Math.round(performance.now() - t0), atMs: Date.now(), why });
      return doc;
    } catch (e) {
      // one corrupt log must not stop every other document serving
      // (review #1, finding 11): quarantine loudly — the document 404s
      // until its log is repaired, and nothing here ever rewrites it
      // — and counted (Q1322): the health route said *errors 0* over a
      // production document that had just vanished
      console.error(`document '${id}' failed to load — quarantined:`, e);
      if (!this.quarantine.includes(id)) this.quarantine.push(id);
      this.loadStats.failed += 1;
      return null;
    }
  }

  private noteLoad(rec: LoadRecord): void {
    const recent = this.loadStats.recent;
    recent.push(rec);
    while (recent.length > 0 && rec.atMs - recent[0]!.atMs > RECENT_LOAD_MS) recent.shift();
    if (recent.length > 1000) recent.splice(0, recent.length - 1000);
  }

  /** The slowest load of the last hour, or null (issue #70's gap). */
  slowestRecentLoad(nowMs: number): LoadRecord | null {
    let worst: LoadRecord | null = null;
    for (const r of this.loadStats.recent) {
      if (nowMs - r.atMs > RECENT_LOAD_MS) continue;
      if (worst === null || r.ms > worst.ms) worst = r;
    }
    return worst;
  }

  /**
   * **A document, loaded if it is not** (Scaling Stage 2): the one way a
   * request or a tick reaches a document by id. Null for an id this host does
   * not know, a quarantined one, or one whose load threw. Concurrent callers
   * for a cold document share one load. Inside a request scope the document
   * is held until the request ends, so it is never unloaded under it.
   */
  async open(id: string, why: LoadRecord['why'] = 'request'): Promise<LoadedDoc | null> {
    let doc = this.docs.get(id) ?? null;
    if (doc === null) {
      if (!this.registry.has(id) || this.quarantine.includes(id)) return null;
      let pending = this.loading.get(id);
      if (pending === undefined) {
        pending = this.loadOne(id, why).finally(() => this.loading.delete(id));
        this.loading.set(id, pending);
      }
      doc = await pending;
      if (doc === null) return null;
    }
    this.use(doc);
    return doc;
  }

  /** `open` by any slug the document has worn. */
  async openSlug(slug: string, why: LoadRecord['why'] = 'request'): Promise<LoadedDoc | null> {
    const id = this.slugIndex.get(slug);
    return id === undefined ? null : this.open(id, why);
  }

  /** Mark a loaded document used now, and held by the request in scope if any. */
  use(doc: LoadedDoc, nowMs: number = Date.now()): void {
    doc.lastUsedMs = nowMs;
    // **only a scope still open holds** (Stage 2): work a request started
    // and did not await — the outbox pass a commit kicks, and the give-up it
    // may write back — runs on in that request's context after it settles,
    // and a hold taken there would never be released
    const scope = this.scopes.getStore();
    if (scope !== undefined && scope.open && !scope.held.has(doc)) {
      scope.held.add(doc);
      doc.holds = (doc.holds ?? 0) + 1;
    }
  }

  /**
   * **Run `fn` as one request** (Stage 2): every document it opens is held
   * until it settles, so an unload can never land between a request's lookup
   * and its commit. A push stream outlives its request and is counted by the
   * hub instead.
   */
  async scope<T>(fn: () => Promise<T>): Promise<T> {
    const scope = { held: new Set<LoadedDoc>(), open: true };
    try {
      return await this.scopes.run(scope, fn);
    } finally {
      scope.open = false;
      const now = Date.now();
      for (const doc of scope.held) {
        doc.holds = Math.max(0, (doc.holds ?? 1) - 1);
        doc.lastUsedMs = now;
      }
    }
  }

  /** Whether the document is in memory now. */
  isLoaded(id: string): boolean {
    return this.docs.has(id);
  }

  /** Whether a load of it is in flight. */
  isLoading(id: string): boolean {
    return this.loading.has(id);
  }

  /** A document's registry row, or null where it has none in this process. */
  rowOf(id: string): RegistryRow | null {
    return this.registry.get(id) ?? null;
  }

  /** Every document id this host knows, loaded or not. */
  ids(): string[] {
    return [...this.registry.keys()];
  }

  /** How many documents this host knows, loaded or not. */
  registeredCount(): number {
    return this.registry.size;
  }

  /** The documents not in memory, with their rows (Stage 2's tick reads these). */
  *unloaded(): Iterable<{ id: string; row: RegistryRow }> {
    for (const [id, row] of this.registry) {
      if (row === null || this.docs.has(id) || this.quarantine.includes(id)) continue;
      yield { id, row };
    }
  }

  /**
   * **Unload one idle document** (Stage 2): its registry row written first,
   * so a host that dies a moment later still knows it, then dropped from
   * memory — its slugs stay routed, its next request loads it again. The
   * caller has checked that it is idle and owes the store nothing; this
   * checks again after the write, since a request may have arrived during it.
   * Never an ephemeral document. True when it went.
   */
  async unload(doc: LoadedDoc, nowMs: number,
    stillIdle: () => boolean): Promise<boolean> {
    if (doc.ephemeral === true || this.lifecycle === null) return false;
    if (this.docs.get(doc.id) !== doc) return false;
    const row = this.lifecycle.rowOf(doc, nowMs);
    await this.persistence.writeRegistry(doc.id, row);
    if (this.docs.get(doc.id) !== doc || (doc.holds ?? 0) > 0 || !stillIdle()) return false;
    this.docs.delete(doc.id);
    this.registry.set(doc.id, row);
    this.loadStats.unloads += 1;
    return true;
  }

  /** The documents `loadAll` could not replay (review #1 finding 11; counted since Q1322). */
  quarantined(): readonly string[] {
    return this.quarantine;
  }

  /** The documents `loadAll` skipped as the pre-people shape (decision 1253). */
  skippedPreShape(): readonly string[] {
    return this.preShape;
  }

  async create(id: string, input: OpenInput, t: number): Promise<LoadedDoc> {
    if (this.docs.has(id) || this.registry.has(id)) throw new Error(`document '${id}' already exists`);
    await this.persistence.createDoc(id);
    const people = new StorePeople();
    const cs = ConstitutionSession.open(input, t, people);
    const doc: LoadedDoc = { id, cs, people, persisted: 0, relayed: 0, provisional: null };
    this.register(doc);
    await this.persist(doc);
    // the birth's own entries relay nothing — they are the document coming
    // into existence, and the founder's creation mail is `sendNow`'s, sent
    // before this. Without this line the first commit after the save would
    // find `relayed` behind `persisted` and relay the genesis (issue #7)
    doc.relayed = doc.persisted;
    return doc;
  }

  /**
   * **A document the store never writes** (design/DEMO.md Stage 1): `create`
   * without `persistence.createDoc`, marked `ephemeral` so every later
   * persist is a cursor move and nothing more. Its slugs route like any
   * document's, which is what makes `/d/demo` serve and the birth's slug
   * check refuse the address.
   */
  createEphemeral(id: string, input: OpenInput, t: number): LoadedDoc {
    if (this.docs.has(id) || this.registry.has(id)) throw new Error(`document '${id}' already exists`);
    const people = new StorePeople();
    const cs = ConstitutionSession.open(input, t, people);
    const doc: LoadedDoc = { id, cs, people, persisted: 0, relayed: 0,
      provisional: null, ephemeral: true };
    this.register(doc);
    doc.persisted = cs.logEntries().length;
    doc.relayed = doc.persisted;
    return doc;
  }

  /**
   * **Retire an ephemeral document** (design/DEMO.md Stage 2's reset): gone
   * from memory and every slug it wore unrouted, so its id answers nothing and
   * its address is free for the next generation. The store has no deletion
   * for a real document and gains none: a persisted id is refused.
   */
  retire(id: string): void {
    const doc = this.docs.get(id);
    if (doc === undefined) return;
    if (doc.ephemeral !== true) {
      throw new Error(`document '${id}' is not ephemeral — the store deletes nothing`);
    }
    this.docs.delete(id);
    this.registry.delete(id);
    for (const [slug, owner] of this.slugIndex) if (owner === id) this.slugIndex.delete(slug);
  }

  /** Set or clear the provisional starting text (§9.7a v0.55). */
  async setProvisional(doc: LoadedDoc, text: string | null): Promise<void> {
    doc.provisional = text !== null && text.length > 0 ? text : null;
    await this.persistence.writeProvisional(doc.id, doc.provisional);
  }

  /** A document **in memory**, by id — never a load (Stage 2): `open` is the
   *  way to a document; this is for one the caller knows is loaded (the demo,
   *  a test that just made it). */
  byId(id: string): LoadedDoc | null {
    return this.docs.get(id) ?? null;
  }

  /** `byId` by slug: in memory only. */
  bySlug(slug: string): LoadedDoc | null {
    const id = this.slugIndex.get(slug);
    return id === undefined ? null : this.byId(id);
  }

  /**
   * **Whether a slug answers** without loading anything (Scaling Stage 2):
   * a known document's, not quarantined. The page rows ask this; the page's
   * own first view request is what loads the document. A truthy marker or null,
   * in `docOr404`'s shape.
   */
  servesSlug(slug: string): { id: string } | null {
    const id = this.slugIndex.get(slug);
    return id === undefined || this.quarantine.includes(id) ? null : { id };
  }

  slugTaken(slug: string): boolean {
    return this.slugIndex.has(slug);
  }

  /** The documents **in memory** (Stage 2): not every document this host knows. */
  all(): Iterable<LoadedDoc> {
    return this.docs.values();
  }

  /** Append everything emitted since the last persist, with the person rows
   *  those entries were written beside (decision 1253); re-index slugs. */
  async persist(doc: LoadedDoc): Promise<LogEntry[]> {
    const log = doc.cs.logEntries();
    const fresh = log.slice(doc.persisted);
    const rows = doc.people.takeDirty();
    if (doc.ephemeral === true) {
      // nothing reaches the store (design/DEMO.md D1): the cursor moves as if
      // it had, so everything downstream of `persisted` reads alike
      doc.persisted += fresh.length;
      for (const slug of doc.cs.slugs) this.slugIndex.set(slug, doc.id);
      return [...fresh];
    }
    if (fresh.length > 0 || rows.length > 0) {
      try {
        await this.persistence.appendDocLog(doc.id, fresh, rows);
      } catch (e) {
        // the rows go back in the dirty set, or a failed append loses them
        // for ever (issue #7): see `restoreDirty`. The entries need no such
        // care — the cursor below is what carries them, and it has not moved
        doc.people.restoreDirty(rows);
        throw e;
      }
      // **Advance by what was written, never to the log's length** (Q1322,
      // docs.vote 2026-09-11): `logEntries()` is the live array, and a
      // command applied while the append was in flight — seconds, under a
      // room of thirty — had already lengthened it. Setting the cursor to
      // the length skipped those entries for ever: the next append started
      // past them, the persisted chain broke at the gap, and the document
      // was quarantined at the next boot. Guard: unit.test.ts, *a command
      // applied during a slow append is still persisted*.
      doc.persisted += fresh.length;
      for (const slug of doc.cs.slugs) this.slugIndex.set(slug, doc.id);
    }
    return [...fresh];
  }

  /**
   * **A command the store could not write does not stand** (issue #79). The
   * command was applied in memory before `persist` threw, so every other
   * seat was already reading what the member was told had failed — and the
   * next commit that landed flushed it after all, so the member's retry put
   * it in the document twice. This takes the document back to what the
   * store holds: the persisted prefix of its own log, re-folded, which is
   * exactly what a boot would read. `persisted` is the cursor of what was
   * written, so nothing is read back from a store that is failing.
   *
   * `cs` is replaced, never mutated: a command applied to the old session
   * while this one's write was in flight is undone with it, and `commit`
   * tells that command so by the identity of the session it applied to.
   * The person rows stay as they are (an orphan row is harmless, and the
   * dirty set still names it for the next persist).
   */
  rewind(doc: LoadedDoc): void {
    const kept = doc.cs.logEntries().slice(0, doc.persisted)
      .map((entry) => structuredClone(entry));
    doc.cs = ConstitutionSession.replay(kept, doc.people);
    doc.relayed = Math.min(doc.relayed, doc.persisted);
  }

  private register(doc: LoadedDoc): void {
    this.docs.set(doc.id, doc);
    if (!this.registry.has(doc.id)) this.registry.set(doc.id, null);
    // **used from the moment it is in memory** (Stage 2): a birth or a load
    // is held by the request that made it and fresh on the idle clock, so no
    // tick can unload it under the hands still holding its object
    this.use(doc);
    for (const slug of doc.cs.slugs) this.slugIndex.set(slug, doc.id);
  }
}

export { slugify };

/** A collision takes a short suffix (SPEC §9.7a). */
export function uniqueSlug(title: string, taken: (slug: string) => boolean): string {
  const base = slugify(title);
  if (!taken(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken(candidate)) return candidate;
  }
}
