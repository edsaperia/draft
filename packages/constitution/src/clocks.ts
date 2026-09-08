/**
 * Lapse and crown clock arithmetic (SPEC §9.5a), pure. The package has no
 * wall clock: hosts call tick(t) and these functions say what is due.
 * Warnings go by email before a lapse happens — **a week, a day and an hour
 * before it, and a member gets all three** (R-097, Ed 2026-09-08, Q1285:
 * *only three — a week, a day, and an hour — and you get all three*). Until
 * this date one warning went at three quarters of the spell, a lead that
 * scaled with the spell and was the wrong shape at both ends: a week's
 * notice on a month is more than anybody needs to act on, and fifteen
 * minutes on an hour is less than a mail takes to be read. Only the leads
 * that fit inside the spell fire: a week's warning on a seven-day spell
 * would go at the moment of the member's last act, which is no warning.
 * A spell under an hour — the sim rooms, most tests; the 💤 card collects
 * whole days, 7–365 — warns nobody at all.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** The three leads, longest first. Exported so a host can render the schedule. */
export const WARN_LEADS: ReadonlyArray<number> = [7 * DAY_MS, DAY_MS, HOUR_MS];

export interface LapseDue {
  /** The warning points that fit inside the spell, longest lead first. */
  warnAt: ReadonlyArray<{ lead: number; t: number }>;
  lapseAtT: number;
}

/** null afterMs (never) returns null: no clock runs. */
export function lapseDue(lastActivityT: number, afterMs: number | null): LapseDue | null {
  if (afterMs === null) return null;
  const lapseAtT = lastActivityT + afterMs;
  return {
    warnAt: WARN_LEADS.filter((lead) => lead < afterMs)
      .map((lead) => ({ lead, t: lapseAtT - lead })),
    lapseAtT,
  };
}

/**
 * Which warning is owed now, if any: the **shortest** lead whose point has
 * passed and that is shorter than any already sent. So a host that was down
 * across two points sends the one that is still true — *a day* — and never
 * the stale *a week* after it; and a ladder walked one tick at a time sends
 * all three in order. `warnedLead` is the shortest lead sent in this quiet
 * spell, null where none has been.
 */
export function warningDue(due: LapseDue, warnedLead: number | null, t: number): number | null {
  let owed: number | null = null;
  for (const w of due.warnAt) {
    if (t < w.t) break;                                   // longest first: the rest are later still
    if (warnedLead !== null && w.lead >= warnedLead) continue;
    owed = w.lead;                                         // the shortest passed wins
  }
  return owed;
}
