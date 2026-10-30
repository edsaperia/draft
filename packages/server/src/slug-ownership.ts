import type { ConstitutionSession } from '../../constitution/src/session.js';

/** A routing address or an open proposal's reservation belongs to one document. */
export class SlugTakenError extends Error {
  constructor(readonly slug: string) { super('that address is taken'); }
}

export interface SlugOwner { slug: string; documentId: string }

export interface CreationClaim { key: string; email: string }

/** A creation token raced a resend or another verified creation link.
 * The route re-reads the pending creation and forwards/retries safely. */
export class CreationChangedError extends Error {
  constructor() { super('pending creation changed'); }
}

/** Q1604: awaiting assent is still open. Terminal outcomes release only
 * unused reservations; historical ownership is recorded separately. */
export function reservedSlugs(cs: ConstitutionSession): string[] {
  return [...new Set([...cs.motionRecords().values()].flatMap((motion) => {
    const p = motion.payload;
    return (motion.status === 'running' || motion.status === 'awaiting-crown') &&
      p.kind === 'set' && p.setting === 'link' ? [(p.value as { slug: string }).slug] : [];
  }))];
}
