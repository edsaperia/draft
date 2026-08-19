/**
 * Document persistence (Q368): one append-only JSONL of hash-chained
 * LogEntry per document — the ConstitutionSession's own log, verbatim.
 * Loading is replay (chain verified by the module); persisting a command
 * is appending the entries it emitted. There is no other state on disk,
 * which is the §11 property made operational: the log IS the document.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ConstitutionSession } from '../../constitution/src/index.js';
import type { LogEntry } from '../../constitution/src/index.js';
import type { OpenInput } from '../../constitution/src/index.js';

export interface LoadedDoc {
  id: string;
  cs: ConstitutionSession;
  /** How many log entries are already on disk. */
  persisted: number;
}

export class DocStore {
  private readonly docsDir: string;
  private readonly docs = new Map<string, LoadedDoc>();
  /** Every slug a document has ever worn routes to it (§9.7: no link breaks). */
  private readonly slugIndex = new Map<string, string>();

  constructor(dataDir: string) {
    this.docsDir = join(dataDir, 'docs');
    mkdirSync(this.docsDir, { recursive: true });
  }

  loadAll(): void {
    for (const id of readdirSync(this.docsDir)) {
      const logPath = join(this.docsDir, id, 'log.jsonl');
      if (!existsSync(logPath)) continue;
      const lines = readFileSync(logPath, 'utf8').split('\n').filter((l) => l.length > 0);
      const log = lines.map((l) => JSON.parse(l) as LogEntry);
      const cs = ConstitutionSession.replay(log);
      this.register({ id, cs, persisted: log.length });
    }
  }

  create(id: string, input: OpenInput, t: number): LoadedDoc {
    if (this.docs.has(id)) throw new Error(`document '${id}' already exists`);
    mkdirSync(join(this.docsDir, id), { recursive: true });
    const cs = ConstitutionSession.open(input, t);
    const doc: LoadedDoc = { id, cs, persisted: 0 };
    this.register(doc);
    this.persist(doc);
    return doc;
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
  persist(doc: LoadedDoc): LogEntry[] {
    const log = doc.cs.logEntries();
    const fresh = log.slice(doc.persisted);
    if (fresh.length > 0) {
      const lines = fresh.map((e) => JSON.stringify(e)).join('\n') + '\n';
      appendFileSync(join(this.docsDir, doc.id, 'log.jsonl'), lines, 'utf8');
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

/** A slug from a title, docs.vote style; caller uniquifies. */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 48)
    .replace(/^-+|-+$/g, '');
  return base.length > 0 ? base : 'untitled';
}

/** A collision takes a short suffix (SPEC §9.7a). */
export function uniqueSlug(title: string, taken: (slug: string) => boolean): string {
  const base = slugify(title);
  if (!taken(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken(candidate)) return candidate;
  }
}
