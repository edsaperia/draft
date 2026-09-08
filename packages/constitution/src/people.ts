/**
 * The `People` port (PRODUCTION.md decision 436, landed under decision 1253
 * on 2026-09-08): where a person's identity lives, **beside the log and never
 * in it**.
 *
 * A member's or applicant's email, name and picture are the three things a
 * person may one day ask to have erased, and an append-only hash-chained log
 * cannot erase anything: a byte removed breaks every hash after it. So the
 * events carry a `PersonId` and nothing else about the person, and the fields
 * live in a row keyed by that id, which the host may delete. Deleting the row
 * breaks no hash — that is the whole point of the split, and
 * `test/people.test.ts` asserts it: erase, replay, identical chain.
 *
 * The port is an **argument** to the session, never a global: the module stays
 * pure, a test or the browser fixture hands it an `InMemoryPeople`, and the
 * server hands it one backed by its store. Replay never writes rows — the rows
 * are state *beside* the log, not derived from it — and every read of a
 * person's fields goes through `get` at read time, so an erased person reads
 * as `null` fields from the moment the row is gone.
 *
 * Ids are minted by the fold like member ids (`p-1`, `p-2`, …): a counter
 * rebuilt from the log on replay, so the module generates no randomness
 * (SPEC §11's seeded-RNG rule) and needs no minting seam at any call site.
 * The id is a join key inside one document's store, never a capability, so
 * its guessability is of no consequence.
 */

export type PersonId = string;

export interface PersonFields {
  email: string;
  name: string | null;
  picture: string | null;
}

export interface People {
  /** The row, or null where none exists — never existed, or erased. */
  get(id: PersonId): PersonFields | null;
  /** Create or merge: a missing row is born from the patch (email first). */
  set(id: PersonId, patch: Partial<PersonFields>): void;
  /** The person holding this address, case-blind, or null. */
  byEmail(email: string): PersonId | null;
}

/** The three fields as a reader meets them: null throughout once erased. */
export interface ResolvedPerson {
  email: string | null;
  name: string | null;
  picture: string | null;
  /** True where no row stands for the id the log names. */
  erased: boolean;
}

export const ERASED: ResolvedPerson =
  Object.freeze({ email: null, name: null, picture: null, erased: true });

/** One read, one shape, wherever a record resolves its person. */
export function resolvePerson(people: People, id: PersonId): ResolvedPerson {
  const row = people.get(id);
  if (row === null) return ERASED;
  return { email: row.email, name: row.name, picture: row.picture, erased: false };
}

/**
 * The port as a map: tests, the fixture and the browser bundle. The server
 * extends it to notice writes (`StorePeople`); nothing here persists.
 */
export class InMemoryPeople implements People {
  protected readonly rows = new Map<PersonId, PersonFields>();

  constructor(rows: Iterable<readonly [PersonId, PersonFields]> = []) {
    for (const [id, fields] of rows) this.rows.set(id, { ...fields });
  }

  get(id: PersonId): PersonFields | null {
    const row = this.rows.get(id);
    return row === undefined ? null : { ...row };
  }

  set(id: PersonId, patch: Partial<PersonFields>): void {
    const had = this.rows.get(id) ?? { email: '', name: null, picture: null };
    const next: PersonFields = { ...had };
    if (patch.email !== undefined) next.email = patch.email;
    if (patch.name !== undefined) next.name = patch.name;
    if (patch.picture !== undefined) next.picture = patch.picture;
    this.rows.set(id, next);
  }

  byEmail(email: string): PersonId | null {
    const want = email.toLowerCase();
    for (const [id, row] of this.rows) {
      if (row.email.toLowerCase() === want) return id;
    }
    return null;
  }

  /** Erasure: the row goes, the log stands. Returns whether a row was there. */
  erase(id: PersonId): boolean {
    return this.rows.delete(id);
  }

  /** Every row, for freezing and for the store's first write. */
  entries(): Array<readonly [PersonId, PersonFields]> {
    return [...this.rows.entries()].map(([id, row]) => [id, { ...row }] as const);
  }
}
