/** A routing address belongs to one document for its whole history. */
export class SlugTakenError extends Error {
  constructor(readonly slug: string) { super('that address is taken'); }
}

export interface SlugOwner { slug: string; documentId: string }
