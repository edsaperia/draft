import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FilePersistence, OUTBOX_MAX_ATTEMPTS } from '../src/persistence.js';
import { MailOutbox } from '../src/outbox.js';

describe('one email carrying several login links', () => {
  it('revokes every link after permanent delivery failure, including after reopening the store', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'draft-multi-mail-'));
    let persistence = new FilePersistence(dir);
    const revoked: string[] = [];
    let now = 1_700_000_000_000;
    const make = () => new MailOutbox({ persistence,
      mailer: { dev: false, send: async () => { throw new Error('delivery refused'); } },
      mailOff: () => false, revoke: async (hash) => { revoked.push(hash); }, now: () => now });
    await make().enqueue([{ documentId: null, to: 'reader@example.org', subject: 'Your documents',
      text: 'Two links', tokenHashes: ['first', 'second'] }], now);
    persistence = new FilePersistence(dir);
    const outbox = make();
    for (let i = 0; i < OUTBOX_MAX_ATTEMPTS; i++) {
      await outbox.run(now);
      now += 3_600_001;
    }
    expect(revoked.sort()).toEqual(['first', 'second']);
  });

  it('revokes all links in a retired undeliverable email', async () => {
    const persistence = new FilePersistence(mkdtempSync(join(tmpdir(), 'draft-multi-retired-')));
    const revoked: string[] = [];
    const outbox = new MailOutbox({ persistence,
      mailer: { dev: false, send: async () => { throw new Error('must not send'); } },
      mailOff: () => false, revoke: async (hash) => { revoked.push(hash); } });
    await outbox.enqueue([{ documentId: null, to: 'reader@ladder.invalid', subject: 'Links', text: 'Links',
      tokenHash: 'first', tokenHashes: ['first', 'second'] }], 1);
    await outbox.run(1);
    expect(revoked.sort()).toEqual(['first', 'second']);
    const [row] = await persistence.dumpOutbox();
    expect(row?.tokenHash).toBeUndefined();
    expect(row?.tokenHashes).toBeUndefined();
  });
});
