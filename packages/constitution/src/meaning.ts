/**
 * **What choosing this would do, in this room** (entry 165, Ed 2026-08-27:
 * *we need to help them with 3 preset buttons, and they can edit the precise %
 * if they really want to*).
 *
 * A percent is not a thing anybody has an opinion about. *In a room of 5, 4 of
 * 5 must vote for it by the end* is. So each rung a card offers carries a
 * sentence saying what taking it would mean for the room **as it stands**, read
 * live on every render the way `barCeilingPct` already is — which is why the
 * sentence names its own dependence (*in a room of 5*, never a bare *4 of 5*):
 * when a sixth member arrives, the reader can see what moved and why.
 *
 * Two things live here rather than page-side:
 *
 * - **The rung labels**, because there are three readers of them — the
 *   founder's card, the member's blind answer card and the distribution strip —
 *   and *one label per rung everywhere* (STYLE T5, Q620) is a rule a shared
 *   list keeps and three literals do not.
 * - **The arithmetic**, because it is the engine's and the page cannot reach
 *   the engine. See `winsNeededPct` below.
 *
 * `meaningOf` is deliberately one function over `(setting, value, room)` rather
 * than a helper per card: every other ladder on the surface wants the same
 * sentence, and this is the shape that takes them.
 */

import type { PaceValue, PercentValue, SettingValue } from './values.js';
import { VOTES_NEEDED_HI_PCT, VOTES_NEEDED_LO_PCT, VOTES_NEEDED_MAX_N, votesNeeded } from './threshold.js';

/**
 * 🌡️'s three presets, **most protective first** — the order 👁️ and 🪪 already
 * read in, and the one a ladder of refusals has to read in for *the most I will
 * accept* to mean anything.
 *
 * Ed listed them ascending; they are ordered the other way here for that rule.
 * Ed asked for the 60 step, and 70 is deliberately absent: 60 and 70 are the
 * same rung in most small rooms and 70 and 80 collide nearly as often, while
 * 60 · 80 · 90 separate at every roster from four members up.
 */
export const BAR_RUNGS: readonly { pct: number; label: string }[] = [
  { pct: 90, label: 'Nearly everyone' },
  { pct: 80, label: 'Broad agreement' },
  { pct: 60, label: 'A bare majority' },
];

/** The fourth rung: the precise number, for whoever really wants it. */
export const OWN_RUNG_LABEL = 'A number of my own';

/**
 * **How many of a room of `e` must vote for a change to carry it at `pct`** —
 * `null` where no number of them can (Q840's ceiling, seen from this side), and
 * `undefined` where this cannot say.
 *
 * The arithmetic is engine-core's `winsNeeded`, and the page carries no
 * engine-core, so what it reads is `VOTES_NEEDED` — the table entry 163 copied
 * out of the same fit for the explainer at /pairwise. It is the same claim
 * under a different name: a cell there is `k` votes for and `n − k` against on
 * the incumbent pair, and a room of `e` where everybody votes is exactly
 * `n = e`. There is no second table, and `test/meaning.test.ts` re-runs the
 * engine cell by cell to keep this reading of it honest.
 *
 * The two names differ where the reading does, and the difference matters:
 * /pairwise counts **votes cast**, and says nothing about who has not voted;
 * this counts **the room**, and assumes everybody does. Hence *in a room of 5*
 * in the sentence and *of 5 votes* on the chart.
 *
 * `undefined`, never a guess (STYLE T13): past the table's last room, or at a
 * bar it does not hold, the card says nothing rather than a clamped number.
 * A room smaller than one reads as one — the founder is always in it, which is
 * `barCeilingPct`'s own reasoning about a count that arrives empty.
 */
export function winsNeededPct(e: number, pct: number): number | null | undefined {
  if (!Number.isFinite(e) || !Number.isFinite(pct)) return undefined;
  if (pct < VOTES_NEEDED_LO_PCT || pct > VOTES_NEEDED_HI_PCT) return undefined;
  const n = Math.max(1, Math.floor(e));
  if (n > VOTES_NEEDED_MAX_N) return undefined;
  const k = votesNeeded(n, Math.floor(pct));
  return k === 0 ? null : k;
}

/** The room a meaning is about. Widened by whatever else needs one. */
export interface Room {
  /** E — the members who count, as the page's own `E()` gives it. */
  e: number;
}

/** *one* reads better than *1* at the head of a sentence; the rest are digits. */
const roomOf = (e: number): string => (e <= 1 ? 'one' : String(Math.floor(e)));

/**
 * The shared half of both sentences: how many of the room, or null where the
 * bar is out of the room's reach, or undefined where nothing can be said.
 */
function winsClause(e: number, pct: number): { k: number; n: number } | null | undefined {
  const k = winsNeededPct(e, pct);
  if (k === undefined || k === null) return k;
  return { k, n: Math.max(1, Math.floor(e)) };
}

function barMeaning(pct: number, room: Room): string | null {
  const w = winsClause(room.e, pct);
  if (w === undefined) return null;
  if (w === null) {
    // **The out-of-reach sentence names its own percent.** Two rungs can be
    // out of reach of the same room, and *nothing can pass at this one* said
    // twice under two different numbers is the same sentence twice (T36) as
    // well as the less useful half of what there is to say.
    return 'In a room of ' + roomOf(room.e) +
      ', nothing can pass at ' + Math.floor(pct) + '% until more members arrive.';
  }
  if (w.n === 1) return 'In a room of one, the one vote must be for it.';
  if (w.k === w.n) return 'In a room of ' + w.n + ', all ' + w.n + ' must vote for it by the end.';
  return 'In a room of ' + w.n + ', ' + w.k + ' of ' + w.n + ' must vote for it by the end.';
}

/**
 * **Never *the bar***, on the surface (STYLE T15, and card-audit is what
 * caught it): the thing that climbs is the approval threshold, and it is named
 * in full every time even though it is the longer phrase.
 */
const CLIMBS = ', and the approval threshold climbs from there.';

function paceMeaning(startPct: number, room: Room): string | null {
  const w = winsClause(room.e, startPct);
  if (w === undefined) return null;
  if (w === null) {
    return 'In a room of ' + roomOf(room.e) + ', nothing can pass at a ' +
      Math.floor(startPct) + '% start until more members arrive.';
  }
  if (w.n === 1) return 'In a room of one, the one vote is enough when voting opens' + CLIMBS;
  if (w.k === w.n) {
    return 'In a room of ' + w.n + ', all ' + w.n + ' must vote for it when voting opens' + CLIMBS;
  }
  return 'In a room of ' + w.n + ', ' + w.k + ' of ' + w.n + ' is enough when voting opens' + CLIMBS;
}

/**
 * **What this value would mean for this room**, or `null` where there is
 * nothing true to say — in which case the card prints no line at all rather
 * than an approximation.
 *
 * *by the end* on 🌡️ because the number is the bar at the close, where the
 * ramp has finished rising; *when voting opens* on 🪜 because that is the one
 * moment its start describes. A fixed pace has no start to explain, so it
 * returns null: the sentence would be 🌡️'s, said twice.
 *
 * Every setting with no case here returns `null`, which is what makes this
 * safe to call from a generic rung builder.
 */
export function meaningOf(setting: string, value: SettingValue | null | undefined, room: Room): string | null {
  if (!value) return null;
  if (setting === 'bar') {
    const pct = (value as PercentValue).pct;
    return typeof pct === 'number' ? barMeaning(pct, room) : null;
  }
  if (setting === 'pace') {
    const v = value as PaceValue;
    if (v.shape !== 'ramp' || typeof v.startPct !== 'number') return null;
    return paceMeaning(v.startPct, room);
  }
  return null;
}
