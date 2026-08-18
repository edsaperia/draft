import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { sha256Hex } from '../src/sha256.js';
import { chainHash, stableStringify } from '../src/hash.js';
import {
  chainHash as engineChainHash,
  sha256Hex as engineSha256Hex,
} from '../../engine-core/src/hash.js';

const nodeSha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

describe('pure-TS sha256 (the browser-loadability blocker, plan 367a)', () => {
  it('matches the FIPS 180-4 vectors', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('matches node:crypto on multi-byte, boundary-length and long inputs', () => {
    const samples = [
      'the quick brown fox',
      'наräkî 中文 🏛️✏️👑', // 2-, 3- and 4-byte sequences
      '\u{1f3db}️'.repeat(100),
      'a'.repeat(55), // one byte short of needing a second padding block
      'a'.repeat(56), // exactly spills the length field into a new block
      'a'.repeat(64),
      'a'.repeat(65),
      'x'.repeat(100_000),
      JSON.stringify({ deep: { nested: [1, 2, 3], s: 'värde' } }),
    ];
    for (const s of samples) expect(sha256Hex(s)).toBe(nodeSha(s));
  });

  it('replaces lone surrogates the way Node does', () => {
    for (const s of ['\ud800', 'a\udc00b', '\ud800\ud800', 'tail\ud83c']) {
      expect(sha256Hex(s)).toBe(nodeSha(s));
    }
  });
});

describe('chain-hash parity with engine-core (SPEC §11, one contract)', () => {
  it('sha256Hex agrees with engine-core byte for byte', () => {
    for (const s of ['', 'abc', '🏛️ motion', 'x'.repeat(1000)]) {
      expect(sha256Hex(s)).toBe(engineSha256Hex(s));
    }
  });

  it('chainHash agrees with engine-core on real event shapes', () => {
    const events = [
      { type: 'created', t: 0, title: 'Hollow Oak Club Charter', slug: 'hollow-oak' },
      { type: 'answer-given', t: 5, member: 'm1', setting: 'bar', value: { pct: 66 }, und: undefined },
      { type: 'motion-opened', t: 9, by: 'm2', setting: 'ending', value: { endsAtMs: null } },
    ];
    let mine = '';
    let theirs = '';
    for (const e of events) {
      mine = chainHash(mine, e);
      theirs = engineChainHash(theirs, e);
      expect(mine).toBe(theirs);
    }
  });

  it('stableStringify drops undefined and sorts keys, as engine-core does', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 }, u: undefined })).toBe(
      stableStringify({ a: { c: 3, d: 2 }, b: 1 }),
    );
  });
});
