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
import type { Persistence, PersonRow } from './persistence.js';

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
}

/** The one loud line a skipped document earns at boot (decision 1253). */
export const preShapeLine = (id: string): string =>
  `[store] ${id} is the pre-people shape (decision 1253): not loaded`;

export class DocStore {
  private readonly docs = new Map<string, LoadedDoc>();
  /** Every slug a document has ever worn routes to it (§9.7: no link breaks). */
  private readonly slugIndex = new Map<string, string>();
  /** Documents whose logs hold the pre-people shape, skipped at boot (decision 1253). */
  private readonly preShape: string[] = [];
  private readonly quarantine: string[] = [];

  constructor(private readonly persistence: Persistence) {}

  async loadAll(): Promise<void> {
    for (const id of await this.persistence.listDocIds()) {
      try {
        const log = await this.persistence.readDocLog(id);
        // **The old shape is refused, never read** (decision 1253): named
        // once, counted for `/healthz`, and neither migrated nor allowed to
        // crash the host — a dev data dir may hold such a document until its
        // own wipe; production holds none after it
        if (log.some((e) => versionOf(e) < PEOPLE_SCHEMA_VERSION)) {
          console.error(preShapeLine(id));
          this.preShape.push(id);
          continue;
        }
        const people = new StorePeople(await this.persistence.readPeople(id));
        const cs = ConstitutionSession.replay(log, people);
        const provisional = await this.persistence.readProvisional(id);
        // `relayed` starts level with `persisted` (issue #7): what a past
        // instance persisted, it relayed — a boot must not re-send the mail
        // of every invitation the document has ever carried
        this.register({ id, cs, people, persisted: log.length,
          relayed: log.length, provisional });
      } catch (e) {
        // one corrupt log must not stop every other document serving
        // (review #1, finding 11): quarantine loudly — the document 404s
        // until its log is repaired, and nothing here ever rewrites it
        // — and counted (Q1322): the health route said *errors 0* over a
        // production document that had just vanished
        console.error(`document '${id}' failed to load — quarantined:`, e);
        this.quarantine.push(id);
      }
    }
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
    if (this.docs.has(id)) throw new Error(`document '${id}' already exists`);
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
    if (this.docs.has(id)) throw new Error(`document '${id}' already exists`);
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
    for (const [slug, owner] of this.slugIndex) if (owner === id) this.slugIndex.delete(slug);
  }

  /** Set or clear the provisional starting text (§9.7a v0.55). */
  async setProvisional(doc: LoadedDoc, text: string | null): Promise<void> {
    doc.provisional = text !== null && text.length > 0 ? text : null;
    await this.persistence.writeProvisional(doc.id, doc.provisional);
  }

  byId(id: string): LoadedDoc | null {
    return this.docs.get(id) ?? null;
  }

  bySlug(slug: string): LoadedDoc | null {
    const id = this.slugIndex.get(slug);
    return id === undefined ? null : this.byId(id);
  }

  slugTaken(slug: string): boolean {
    return this.slugIndex.has(slug);
  }

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
