/**
 * Hash-chained log support (SPEC §11). SHA-256 in pure TypeScript since
 * 367b (sha256.ts), so the engine carries no platform imports and loads
 * in a browser. Serialization is key-sorted JSON so hashes are stable
 * across engines and replays.
 */

import { sha256Hex } from './sha256.js';
export { sha256Hex } from './sha256.js';

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
