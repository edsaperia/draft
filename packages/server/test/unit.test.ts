/**
 * Unit tests for the storage seam and the logic over it (PRODUCTION.md
 * stage 2). These pin the behaviour a Postgres backend must reproduce at
 * stage 6: byte-compatible reload, token single-use and expiry, stash
 * take-consumes, and the WriteChain's guarantee that two commits to one
 * key cannot interleave. The integration walk lives in server.test.ts;
 * this file tests the parts alone.
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FilePersistence, WriteChain } from '../src/persistence.js';
import { Auth } from '../src/auth.js';
import { Stash } from '../src/stash.js';
import { DocStore, uniqueSlug } from '../src/store.js';
import { MAILS, deliverable, makeMailer } from '../src/mailer.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'draft-unit-'));

describe('FilePersistence', () => {
  it('round-trips a document log byte for byte and lists what it holds', async () => {
    const dir = tmp();
    const p = new FilePersistence(dir);
    await p.createDoc('d-1');
    expect(await p.listDocIds()).toEqual([]); // no log yet — not a document
    const entries = [
      { seq: 0, hash: 'h0', prevHash: '', event: { type: 'x', t: 1 } },
      { seq: 1, hash: 'h1', prevHash: 'h0', event: { type: 'y', t: 2 } },
    ] as never[];
    await p.appendDocLog('d-1', entries);
    expect(await p.listDocIds()).toEqual(['d-1']);
    // a reopened store reads exactly what was appended
    const back = new FilePersistence(dir);
    expect(await back.readDocLog('d-1')).toEqual(entries);
    // and the on-disk format is the one the server has always written:
    // one JSON object per line
    const raw = readFileSync(join(dir, 'docs', 'd-1', 'log.jsonl'), 'utf8');
    expect(raw.split('\n').filter(Boolean)).toHaveLength(2);
  });

  it('provisional text is a sidecar: set, survive reopen, clear', async () => {
    const dir = tmp();
    const p = new FilePersistence(dir);
    await p.createDoc('d-1');
    expect(await p.readProvisional('d-1')).toBeNull();
    await p.writeProvisional('d-1', 'draft charter');
    expect(await new FilePersistence(dir).readProvisional('d-1')).toBe('draft charter');
    await p.writeProvisional('d-1', null);
    expect(await p.readProvisional('d-1')).toBeNull();
  });

  it('takeToken is delete-and-return: the second take gets nothing', async () => {
    const p = new FilePersistence(tmp());
    await p.putTokens([['hash-a', { kind: 'login', email: 'a@x.org', expMs: 99 }]]);
    expect(await p.takeToken('hash-a')).toMatchObject({ email: 'a@x.org' });
    expect(await p.takeToken('hash-a')).toBeNull();
  });

  it('sweepTokens drops only what has expired', async () => {
    const p = new FilePersistence(tmp());
    await p.putTokens([
      ['old', { kind: 'login', email: 'a@x.org', expMs: 10 }],
      ['live', { kind: 'login', email: 'b@x.org', expMs: 100 }],
    ]);
    await p.sweepTokens(50);
    expect(await p.takeToken('old')).toBeNull();
    expect(await p.takeToken('live')).not.toBeNull();
  });
});

describe('WriteChain', () => {
  it('serializes writes per key and keeps keys independent', async () => {
    const chain = new WriteChain();
    const order: string[] = [];
    const slow = chain.run('a', async () => {
      await new Promise((r) => setTimeout(r, 30));
      order.push('a1');
    });
    const fast = chain.run('a', async () => { order.push('a2'); });
    const other = chain.run('b', async () => { order.push('b1'); });
    await Promise.all([slow, fast, other]);
    // a2 waited for a1; b1 did not
    expect(order.indexOf('a1')).toBeLessThan(order.indexOf('a2'));
    expect(order[0]).toBe('b1');
  });

  it('a failed link reports to its caller and never breaks the chain', async () => {
    const chain = new WriteChain();
    const boom = chain.run('k', async () => { throw new Error('boom'); });
    await expect(boom).rejects.toThrow('boom');
    expect(await chain.run('k', async () => 'still running')).toBe('still running');
  });
});

describe('Auth over the seam', () => {
  it('mints hashed, uses once, refuses expiry', async () => {
    const dir = tmp();
    const auth = new Auth('secret', new FilePersistence(dir));
    const token = await auth.mintToken({ kind: 'login', email: 'a@x.org' }, 1000);
    // the store holds the hash, never the token
    const stored = readFileSync(join(dir, 'tokens.json'), 'utf8');
    expect(stored).not.toContain(token);
    expect(await auth.useToken(token, 2000)).toMatchObject({ email: 'a@x.org' });
    expect(await auth.useToken(token, 2000)).toBeNull(); // single use
    const brief = await auth.mintToken({ kind: 'login', email: 'b@x.org' }, 1000);
    expect(await auth.useToken(brief, 1000 + 8 * 24 * 3600_000)).toBeNull(); // expired
  });

  it('deferred mints persist in one flush and survive a reopen', async () => {
    const dir = tmp();
    const p = new FilePersistence(dir);
    const auth = new Auth('secret', p);
    const t1 = auth.mintDeferred({ kind: 'login', email: 'a@x.org' }, 1000);
    const t2 = auth.mintDeferred({ kind: 'login', email: 'b@x.org' }, 1000);
    await auth.flush(1000);
    const back = new Auth('secret', new FilePersistence(dir));
    expect(await back.useToken(t1, 2000)).not.toBeNull();
    expect(await back.useToken(t2, 2000)).not.toBeNull();
  });

  it('cookies verify, and a tampered signature or foreign secret does not', () => {
    const auth = new Auth('secret', new FilePersistence(tmp()));
    const cookie = auth.cookieFor('d-1', 'founder', 1000);
    expect(auth.verifyCookie(cookie, 2000)).toEqual({ docId: 'd-1', memberId: 'founder' });
    expect(auth.verifyCookie(cookie + 'x', 2000)).toBeNull();
    const forged = new Auth('other-secret', new FilePersistence(tmp()));
    expect(forged.verifyCookie(cookie, 2000)).toBeNull();
    // expiry is honoured
    expect(auth.verifyCookie(cookie, 1000 + 91 * 24 * 3600_000)).toBeNull();
  });
});

describe('Stash over the seam', () => {
  it('opens empty, updates while live, refuses after expiry, take consumes', async () => {
    const stash = new Stash(new FilePersistence(tmp()));
    await stash.open('k', 1000);
    expect(await stash.update('k', 'draft', 500)).toBe(true);
    expect(await stash.update('missing', 'x', 500)).toBe(false);
    expect(await stash.update('k', 'late', 2000)).toBe(false); // expired
    expect(await stash.take('k', 500, 'd-1')).toBe('draft');
    expect(await stash.take('k', 500, 'd-1')).toBe(''); // the text is spent
    // …but the claim stays, so every other link to this creation can find
    // the document it became (Q519), and nothing may paste into it again
    expect(await stash.claimedBy('k', 500)).toBe('d-1');
    expect(await stash.update('k', 'after the save', 500)).toBe(false);
  });
});

describe('DocStore', () => {
  it('a slug collision takes a short suffix', () => {
    const taken = new Set(['charter', 'charter-2']);
    expect(uniqueSlug('Charter', (s) => taken.has(s))).toBe('charter-3');
    expect(uniqueSlug('Fresh Title', (s) => taken.has(s))).toBe('fresh-title');
  });

  it('creates, persists and reloads to an identical rolling hash', async () => {
    const dir = tmp();
    const p = new FilePersistence(dir);
    const store = new DocStore(p);
    const doc = await store.create('d-1', {
      title: 'Charter', slug: 'charter',
      convenor: { id: 'founder', email: 'a@x.org', isMember: true },
    }, 1000);
    doc.cs.invite(1001, 'b@x.org');
    await store.persist(doc);
    const back = new DocStore(new FilePersistence(dir));
    await back.loadAll();
    expect(back.bySlug('charter')!.cs.rollingHash()).toBe(doc.cs.rollingHash());
  });
});

describe('stage 7: the two cutover switches, read inertly', () => {
  it('absent DRAFT_STORE means file; pg needs a URL; anything else refuses', async () => {
    const { configFromEnv } = await import('../src/config.js');
    const env = { DRAFT_DATA_DIR: tmp() };
    expect(configFromEnv(env).store).toBe('file');
    expect(configFromEnv({ ...env, DATABASE_URL: 'postgres://x' }).store).toBe('file');
    expect(configFromEnv({ ...env, DRAFT_STORE: 'pg', DATABASE_URL: 'postgres://x' }))
      .toMatchObject({ store: 'pg', databaseUrl: 'postgres://x' });
    expect(() => configFromEnv({ ...env, DRAFT_STORE: 'pg' })).toThrow(/DATABASE_URL/);
    expect(() => configFromEnv({ ...env, DRAFT_STORE: 'sqlite' })).toThrow(/DRAFT_STORE/);
    // the data directory is named, never created, by config: on Postgres
    // with a platform secret nothing needs it (and on 2026-08-20 it was an
    // unwritable path left over from a deleted disk)
    const { existsSync } = await import('node:fs');
    const ghost = join(tmp(), 'never-made');
    configFromEnv({ DRAFT_DATA_DIR: ghost, DRAFT_SECRET: 's', DRAFT_STORE: 'pg', DATABASE_URL: 'postgres://x' });
    expect(existsSync(ghost)).toBe(false);
  });

  /**
   * **The cooldown knob** (entry 77, Q946). The adoption cooldown is engine
   * tuning and never constitutional (§4.2), so it is correctly not a setting
   * — and was therefore not adjustable at all, which at the shipped five
   * minutes gives a 15-minute room three moments when the document can
   * change. Ed's answer is one minute; this is the only way to say so.
   */
  it('DRAFT_COOLDOWN_MS: absent means no cooldown, present means the room is paced', async () => {
    const { configFromEnv, COOLDOWN_MAX_MS, HOST_COOLDOWN_MS } = await import('../src/config.js');
    const env = { DRAFT_DATA_DIR: tmp(), DRAFT_SECRET: 's' };
    // absent: the host default, which is no cooldown at all (Ed,
    // 2026-09-05, R-086) — never the engine's shipped five minutes, which
    // is what docs.vote silently ran at while the variable went unset
    expect(HOST_COOLDOWN_MS).toBe(0);
    expect(configFromEnv(env).engineTuning).toEqual({ cooldownMs: 0 });
    expect(configFromEnv({ ...env, DRAFT_COOLDOWN_MS: '  ' }).engineTuning).toEqual({ cooldownMs: 0 });
    expect(configFromEnv({ ...env, DRAFT_COOLDOWN_MS: '60000' }).engineTuning)
      .toEqual({ cooldownMs: 60_000 });
    // 0 is legal and is not "absent": a test host wants adoptions in one
    // second, and `??` on the value would have read it as unset
    expect(configFromEnv({ ...env, DRAFT_COOLDOWN_MS: '0' }).engineTuning)
      .toEqual({ cooldownMs: 0 });
    expect(COOLDOWN_MAX_MS).toBe(5 * 60_000);
    // §4.2's ceiling is a refusal, not a clamp: an operator asking for ten
    // minutes has misread the rule, and a silent clamp leaves them thinking
    // it took
    expect(() => configFromEnv({ ...env, DRAFT_COOLDOWN_MS: '600000' }))
      .toThrow(/DRAFT_COOLDOWN_MS/);
    expect(() => configFromEnv({ ...env, DRAFT_COOLDOWN_MS: '-1' }))
      .toThrow(/DRAFT_COOLDOWN_MS/);
    expect(() => configFromEnv({ ...env, DRAFT_COOLDOWN_MS: 'soon' }))
      .toThrow(/DRAFT_COOLDOWN_MS/);
  });

  it('drain resolves once every chain has settled', async () => {
    const chain = new WriteChain();
    const landed: string[] = [];
    void chain.run('a', async () => { await new Promise((r) => setTimeout(r, 30)); landed.push('a'); });
    void chain.run('b', async () => { await new Promise((r) => setTimeout(r, 10)); landed.push('b'); });
    void chain.run('a', async () => { landed.push('a2'); });
    await chain.drain();
    expect(landed).toEqual(['b', 'a', 'a2']);
  });
});

describe('stage 11: the torn-tail repair tool', () => {
  it('names a torn last line, refuses a torn middle, and writes only on --write', async () => {
    const { inspectTail, main } = await import('../src/tools.js');
    const { appendFileSync, readFileSync: read, writeFileSync: write, readdirSync } = await import('node:fs');
    const dataDir = tmp();
    const store = new DocStore(new FilePersistence(dataDir));
    const doc = await store.create('d-1', { title: 'T', slug: 't',
      convenor: { id: 'founder', email: 'f@example.org', isMember: true } }, 1);
    doc.cs.invite(2, 'a@example.org');
    await store.persist(doc);
    const path = join(dataDir, 'docs', 'd-1', 'log.jsonl');
    const intact = read(path, 'utf8');
    expect(inspectTail(path).torn).toBeNull();
    appendFileSync(path, '{"seq":2,"hash":"abc","prevHa'); // the crash
    const r = inspectTail(path);
    expect(r.torn).toContain('"seq":2');
    expect(r.prefixOk).toBe(true);
    expect(r.prefix).toBe(intact);
    // dry run changes nothing
    expect(await main(['repair-tail', dataDir, 'd-1'])).toBe(0);
    expect(read(path, 'utf8')).not.toBe(intact);
    // --write keeps the original aside and restores the intact prefix
    expect(await main(['repair-tail', dataDir, 'd-1', '--write'])).toBe(0);
    expect(read(path, 'utf8')).toBe(intact);
    const aside = readdirSync(join(dataDir, 'docs', 'd-1')).find((f) => f.startsWith('log.jsonl.torn-'));
    expect(aside).toBeTruthy();
    expect(read(join(dataDir, 'docs', 'd-1', aside!), 'utf8')).toBe(intact + '{"seq":2,"hash":"abc","prevHa');
    // a torn middle is not a tail
    write(path, 'not json\n' + intact);
    expect(() => inspectTail(path)).toThrow(/not the last/);
  });
});

describe('the slug reservation rides the stash (Q462b)', () => {
  it('holds the address while the stash lives, releases it on take and at expiry', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'draft-stash-'));
    const stash = new Stash(new FilePersistence(dir));
    const t0 = 1_000_000;
    await stash.open('k1', t0 + 1000, 'oak');
    await stash.open('k2', t0 + 1000);           // a stash with no address reserves nothing
    expect(await stash.reservedBy('oak', t0)).toBe('k1');
    expect(await stash.reservedBy('elm', t0)).toBeNull();
    // an update keeps the reservation
    await stash.update('k1', 'pasted text', t0);
    expect(await stash.reservedBy('oak', t0)).toBe('k1');
    // expired: the reservation is gone even before a sweep
    expect(await stash.reservedBy('oak', t0 + 2000)).toBeNull();
    // and a restart reads the same reservation back from disk
    const again = new Stash(new FilePersistence(dir));
    expect(await again.reservedBy('oak', t0)).toBe('k1');
    // the save takes the text and with it the hold: from here the document
    // holds the address, and the stash keeps only its claim (Q519)
    expect(await again.take('k1', t0, 'd-oak')).toBe('pasted text');
    expect(await again.reservedBy('oak', t0)).toBeNull();
    expect(await again.claimedBy('k1', t0)).toBe('d-oak');
  });
});

describe('mail to a reserved address is refused at the mailer (Q680)', () => {
  it('knows which addresses can never receive', () => {
    // the ones that can
    expect(deliverable('ada@example.org')).toBe(true); // the tests' own inbox
    expect(deliverable('ada@docs.vote')).toBe(true);
    expect(deliverable('ada@sub.domain.co.uk')).toBe(true);
    // the ones that cannot (RFC 2606 §2, RFC 6761)
    expect(deliverable('ladder-1@ladder.invalid')).toBe(false);
    expect(deliverable('ada@somewhere.test')).toBe(false);
    expect(deliverable('ada@anything.example')).toBe(false);
    expect(deliverable('ada@localhost')).toBe(false);
    expect(deliverable('ADA@LADDER.INVALID')).toBe(false); // case is not a way round
    expect(deliverable('not-an-address')).toBe(false);
  });

  it('writes nothing to the dev outbox for one, and everything for the others', async () => {
    const dir = tmp();
    const mailer = makeMailer({ resendApiKey: null, mailFrom: 't <t@example.org>', dataDir: dir });
    await mailer.send({ to: 'ladder-1@ladder.invalid', subject: 'hush', text: 'x' });
    await mailer.send({ to: 'ada@example.org', subject: 'real', text: 'y' });
    const lines = readFileSync(join(dir, 'outbox.jsonl'), 'utf8')
      .split('\n').filter((l) => l.length > 0).map((l) => JSON.parse(l) as { to: string });
    expect(lines.map((m) => m.to)).toEqual(['ada@example.org']);
  });
});

describe('the exile mail names the office and carries no login (Q901, E31)', () => {
  it('says who did it by office, offers the document’s address, and mints no token', () => {
    const m = MAILS.removed('Gate Charter', 'https://docs.vote/d/gate');
    expect(m.subject).toBe('You are no longer a member of “Gate Charter”');
    expect(m.text).toContain('The Founder has removed you from the membership of “Gate Charter”.');
    expect(m.text).toContain('Your answers and votes no longer count in it.');
    expect(m.text).toContain('https://docs.vote/d/gate');
    expect(m.text).not.toContain('?token=');
    expect(m.link).not.toContain('?token=');
    // no reason travels: `remove` takes none
    expect(m.text).not.toMatch(/because|reason/i);
  });
});
