/**
 * The consent rule (SPEC §9.0a): each member states, blind, the least they
 * will accept, and the document takes the maximum of the stated minimums —
 * "maximum" read along the setting's own protective direction, which the
 * catalogue supplies as a total order. No vote to govern: the result
 * satisfies every stated minimum by construction.
 */

import type { CatalogueEntry } from './catalogue.js';
import type { SettingValue } from './values.js';
import { stableStringify } from './hash.js';

export interface ConsentResolution {
  /** What the document takes: the maximum under the setting's order. */
  value: SettingValue;
  /**
   * The published shape of what people asked for, without names (§9.0a) —
   * every answered value, most protective first, ties broken canonically
   * so the distribution is deterministic under replay.
   */
  distribution: SettingValue[];
}

export function resolveConsent(
  entry: CatalogueEntry,
  answers: readonly SettingValue[],
): ConsentResolution {
  const consent = entry.consent;
  if (!consent) throw new Error(`${entry.id} is not a consent question`);
  if (answers.length === 0) throw new Error(`${entry.id}: nothing to resolve — no answers`);
  const distribution = [...answers].sort((a, b) => {
    const byOrder = consent.order(b, a);
    if (byOrder !== 0) return byOrder;
    return stableStringify(a) < stableStringify(b) ? -1 : 1;
  });
  return { value: distribution[0]!, distribution };
}
