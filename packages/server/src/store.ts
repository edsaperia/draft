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
}

export interface LoadedDoc {
  id: string;
  cs: ConstitutionSession;
  /** The rows beside the log, the same object `cs.people` is (decision 1253). */
  people: StorePeople;
  /** How many log entries are already persisted. */
  persisted: number;
  /** The founder's unconfirmed starting text (§9.7a v0.55), or null. */
  provisional: string | null;
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
        this.register({ id, cs, people, persisted: log.length, provisional });
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
    const doc: LoadedDoc = { id, cs, people, persisted: 0, provisional: null };
    this.register(doc);
    await this.persist(doc);
    return doc;
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
    if (fresh.length > 0 || rows.length > 0) {
      await this.persistence.appendDocLog(doc.id, fresh, rows);
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
