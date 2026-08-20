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
import { ConstitutionSession, slugify } from '../../constitution/src/index.js';
import type { LogEntry } from '../../constitution/src/index.js';
import type { OpenInput } from '../../constitution/src/index.js';
import type { Persistence } from './persistence.js';

export interface LoadedDoc {
  id: string;
  cs: ConstitutionSession;
  /** How many log entries are already persisted. */
  persisted: number;
  /** The founder's unconfirmed starting text (§9.7a v0.55), or null. */
  provisional: string | null;
}

export class DocStore {
  private readonly docs = new Map<string, LoadedDoc>();
  /** Every slug a document has ever worn routes to it (§9.7: no link breaks). */
  private readonly slugIndex = new Map<string, string>();

  constructor(private readonly persistence: Persistence) {}

  async loadAll(): Promise<void> {
    for (const id of await this.persistence.listDocIds()) {
      try {
        const log = await this.persistence.readDocLog(id);
        const cs = ConstitutionSession.replay(log);
        const provisional = await this.persistence.readProvisional(id);
        this.register({ id, cs, persisted: log.length, provisional });
      } catch (e) {
        // one corrupt log must not stop every other document serving
        // (review #1, finding 11): quarantine loudly — the document 404s
        // until its log is repaired, and nothing here ever rewrites it
        console.error(`document '${id}' failed to load — quarantined:`, e);
      }
    }
  }

  async create(id: string, input: OpenInput, t: number): Promise<LoadedDoc> {
    if (this.docs.has(id)) throw new Error(`document '${id}' already exists`);
    await this.persistence.createDoc(id);
    const cs = ConstitutionSession.open(input, t);
    const doc: LoadedDoc = { id, cs, persisted: 0, provisional: null };
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

  /** Append everything emitted since the last persist; re-index slugs. */
  async persist(doc: LoadedDoc): Promise<LogEntry[]> {
    const log = doc.cs.logEntries();
    const fresh = log.slice(doc.persisted);
    if (fresh.length > 0) {
      await this.persistence.appendDocLog(doc.id, fresh);
      doc.persisted = log.length;
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
