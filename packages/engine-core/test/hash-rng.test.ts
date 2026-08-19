import { describe, expect, it } from 'vitest';
import { chainHash, sha256Hex, stableStringify } from '../src/hash.js';
import { makeRng } from '../src/rng.js';

describe('stable serialization and hash chain (SPEC §11)', () => {
  it('stableStringify is key-order independent', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(
      stableStringify({ a: { c: 3, d: 2 }, b: 1 }),
    );
  });

  it('drops undefined fields so optional-field presence is canonical', () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }));
  });

  it('sha256 matches a known vector', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('chainHash depends on both the previous hash and the event', () => {
    const h1 = chainHash('', { type: 'x' });
    expect(chainHash(h1, { type: 'y' })).not.toBe(chainHash('', { type: 'y' }));
    expect(chainHash(h1, { type: 'y' })).not.toBe(chainHash(h1, { type: 'z' }));
  });
});

describe('seeded rng', () => {
  it('is deterministic per seed and diverges across seeds', () => {
    const a1 = makeRng('seed-a');
    const a2 = makeRng('seed-a');
    const b = makeRng('seed-b');
    const seqA1 = Array.from({ length: 10 }, () => a1.next());
    const seqA2 = Array.from({ length: 10 }, () => a2.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA1).toEqual(seqA2);
    expect(seqA1).not.toEqual(seqB);
  });

  it('stays in [0,1) and int stays in range', () => {
    const rng = makeRng('bounds');
    for (let i = 0; i < 1000; i++) {
      const x = rng.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      const k = rng.int(7);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(7);
    }
  });

  it('forks are independent and stable per label', () => {
    const rng = makeRng('root');
    const f1 = rng.fork('a').next();
    const f2 = makeRng('root').fork('a').next();
    expect(f1).toBe(f2);
    expect(rng.fork('a').next()).not.toBe(rng.fork('b').next());
  });
});

describe('the pure sha256 matches node:crypto (367b: the engine goes node-free)', () => {
  it('agrees byte for byte, lone surrogates included', async () => {
    const { createHash } = await import('node:crypto');
    const nodeHash = (s: string) =>
      createHash('sha256').update(s, 'utf8').digest('hex');
    const cases = [
      '',
      'abc',
      'The club meets on Tuesdays.\n',
      'ветер по морю гуляет 🌊',
      'lone surrogate: \ud800 and pair: 😀',
      'x'.repeat(1000),
    ];
    for (const c of cases) expect(sha256Hex(c)).toBe(nodeHash(c));
  });
});
