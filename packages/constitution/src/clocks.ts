/**
 * Lapse and crown clock arithmetic (SPEC §9.5a), pure. The package has no
 * wall clock: hosts call tick(t) and these functions say what is due.
 * Warnings go by email before a lapse happens — the warning point is a
 * fraction of the consented quiet spell (author call: 75%, exported so a
 * host can render the schedule).
 */

export const WARN_FRACTION = 0.75;

export interface LapseDue {
  warnAtT: number;
  lapseAtT: number;
}

/** null afterMs (never) returns null: no clock runs. */
export function lapseDue(lastActivityT: number, afterMs: number | null): LapseDue | null {
  if (afterMs === null) return null;
  return {
    warnAtT: lastActivityT + afterMs * WARN_FRACTION,
    lapseAtT: lastActivityT + afterMs,
  };
}
