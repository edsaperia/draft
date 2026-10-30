import { expect } from 'vitest';
import { ConstitutionSession } from '../../constitution/src/index.js';
import type { Persistence } from '../src/persistence.js';
import { CreationChangedError } from '../src/slug-ownership.js';
import { Stash } from '../src/stash.js';

/** The pending-creation promise is the same on disk and PostgreSQL. */
export async function creationClaimContract(p: Persistence): Promise<void> {
  const now = Date.now();
  const pending = { slug: 'promised', email: 'founder@example.org', text: 'draft', expMs: now + 60_000 };
  await p.putStash('pending', pending);
  await p.createDoc('a');
  await p.createDoc('b');
  const a = ConstitutionSession.open({ title: 'A', slug: 'promised',
    convenor: { id: 'f', email: pending.email, isMember: true } }, now);
  await expect(p.appendDocLog('a', a.logEntries(), [], ['promised'])).rejects.toThrow('that address is taken');
  await expect(p.appendDocLog('a', a.logEntries(), [], ['promised'],
    { key: 'pending', email: 'old-mistype@example.org' })).rejects.toBeInstanceOf(CreationChangedError);
  expect(await p.readDocLog('a')).toEqual([]);
  expect(await p.getStash('pending')).toEqual(pending);
  await p.appendDocLog('a', a.logEntries(), [], ['promised'], { key: 'pending', email: pending.email });
  expect(await p.getStash('pending')).toMatchObject({ docId: 'a', text: 'draft' });
  expect(await new Stash(p).take('pending', now, 'a')).toBe('draft');
  expect(await p.putStash('pending', pending, pending)).toBe(false);
  await expect(p.putStash('pending', pending)).rejects.toThrow('that address is taken');
  await expect(p.appendDocLog('b', a.logEntries(), [], ['promised'],
    { key: 'pending', email: pending.email })).rejects.toBeInstanceOf(CreationChangedError);
  expect(await p.readDocLog('b')).toEqual([]);
  await p.deleteStash('pending');
  await expect(p.claimSlugs([{ slug: 'promised', documentId: 'b' }])).rejects.toThrow('that address is taken');

  await p.putStash('expired', { text: '', slug: 'reusable', expMs: now - 1 });
  await p.putStash('live', { text: '', slug: 'reusable', expMs: now + 60_000 });
  expect(await new Stash(p).reservedBy('reusable', now)).toBe('live');
  await p.deleteStash('live');
  await p.claimSlugs([{ slug: 'reusable', documentId: 'b' }]);

  const old = { text: 'old', slug: 'old-pending', expMs: now + 60_000 };
  await p.putStash('moved', old);
  await p.putStash('moved', { ...old, slug: 'new-pending' }, old);
  expect(await p.putStash('moved', { ...old, text: 'late text' }, old)).toBe(false);
  expect(await p.getStash('moved')).toMatchObject({ slug: 'new-pending', text: 'old' });
}
