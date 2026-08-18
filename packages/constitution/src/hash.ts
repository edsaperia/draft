/**
 * Hash-chained log support (SPEC §11), byte-identical in contract to
 * engine-core/src/hash.ts: key-sorted JSON serialization, undefined fields
 * dropped, chainHash = sha256Hex(prevHash + stableStringify(event)) with
 * genesis prevHash ''. The only difference is that sha256 here is pure TS
 * (./sha256.ts) so the module loads in a browser; the parity of the two
 * implementations is asserted in test/sha256.test.ts.
 */

import { sha256Hex } from './sha256.js';

export { sha256Hex };

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = sortValue(v);
    }
    return out;
  }
  return value;
}

/** Rolling hash: H(prevHash + stableJson(event)). Genesis prevHash is ''. */
export function chainHash(prevHash: string, event: unknown): string {
  return sha256Hex(prevHash + stableStringify(event));
}
