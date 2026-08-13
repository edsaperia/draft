/**
 * Hash-chained log support (SPEC §11). SHA-256 via node:crypto —
 * a platform builtin, not a dependency. Serialization is key-sorted
 * JSON so hashes are stable across engines and replays.
 */

import { createHash } from 'node:crypto';

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

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** Rolling hash: H(prevHash + stableJson(event)). Genesis prevHash is ''. */
export function chainHash(prevHash: string, event: unknown): string {
  return sha256Hex(prevHash + stableStringify(event));
}
