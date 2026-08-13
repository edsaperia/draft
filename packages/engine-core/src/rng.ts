/**
 * Deterministic seeded RNG (splitmix64-derived, sfc32 core).
 * The seed string is published in the constitution and released with the
 * record (SPEC §8.5, §11); every routing decision must be reproducible.
 */

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [0, n). */
  int(n: number): number;
  /** Fork a labeled, independent stream (stable per label). */
  fork(label: string): Rng;
}

function hashSeed(seed: string): [number, number, number, number] {
  // FNV-1a over the seed, expanded to four 32-bit lanes.
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  let h3 = 0x84222325;
  let h4 = 0x9dc5811c;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x01000193);
    h3 = Math.imul(h3 ^ c, 0x01000193);
    h4 = Math.imul(h4 ^ c, 0x01000193);
  }
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export function makeRng(seed: string): Rng {
  let [a, b, c, d] = hashSeed(seed);
  // sfc32
  const next = (): number => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  // Warm up past seed correlations.
  for (let i = 0; i < 12; i++) next();
  return {
    next,
    int(n: number): number {
      if (n <= 0) throw new Error('rng.int: n must be positive');
      return Math.floor(next() * n);
    },
    fork(label: string): Rng {
      return makeRng(`${seed}/${label}`);
    },
  };
}
