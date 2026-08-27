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
 *
 * **And since entry 167 it takes five of them** (Ed: *yes, please do this
 * everywhere*) — 👥 ⏱️ 💤 🪜 🌡️, every setting whose answer is a number
 * rather than a rung with a name. The rules the sentences obey are Ed's:
 *
 * 1. **A meaning names its own dependence.** 👥's and 🌡️'s is the room, ⏱️'s
 *    the window, 🪜's 🌡️'s own number, and 💤's is the spell alone — so 💤's
 *    sentence names no room, because a false dependence is as wrong as a
 *    missing one.
 * 2. **Meanings live on the card, never in the clause.** The clause is the
 *    rule; this is advice at the moment of choosing, and would be false by
 *    next week. Nothing here is written into the constitution.
 * 3. **One consequence per value** (STYLE T37), under H4's 200 characters.
 */

import type {
  LapseValue, PaceValue, PercentValue, QuorumValue, RateValue, SettingValue,
} from './values.js';
import { VOTES_NEEDED_HI_PCT, VOTES_NEEDED_LO_PCT, VOTES_NEEDED_MAX_N, votesNeeded } from './threshold.js';
import { quorumCount } from './populations.js';

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

/**
 * The room a meaning is about — **everything a sentence here may depend on,
 * and nothing else** (entry 167, rule 1: a meaning names its own dependence).
 *
 * `e` alone since entry 165; the other three arrived with the settings that
 * need them and are **optional on purpose**. A caller with nothing to say
 * about the window or the approval threshold leaves the field out, and the
 * writer that wanted it returns `null` — the card then prints no line, which
 * is T13's *say nothing rather than guess* and the rule this whole file is
 * built on. An absent field is never read as a zero.
 */
export interface Room {
  /** E — the members who count, as the page's own `E()` gives it. */
  e: number;
  /** ⏰ as it stands: a time, `null` for never, absent where it is unknown. */
  endsAtMs?: number | null;
  /** The caller's clock, since nothing in this package reads one. */
  nowMs?: number;
  /** 🌡️'s number as it stands, `null` while unset. Read by 🪜 alone. */
  barPct?: number | null;
}

/**
 * *one* reads better than *1* at the head of a sentence; the rest are digits.
 * Exported because the page builds the same phrase for `ceilingNote`, and two
 * copies of *a room of one* are two copies to keep in step (T5).
 */
export function roomPhrase(e: number): string {
  return e <= 1 ? 'one' : String(Math.floor(e));
}
const roomOf = roomPhrase;

/**
 * **A sentence that will not fit is no sentence.** card-audit's H4 caps a
 * helper line at 200 characters and these are read under a rung on four
 * surfaces, so every writer ends here: over the budget the card prints
 * nothing rather than a line that overflows its box, and `meaning.test.ts`
 * walks the whole value table so that a wording change which trips this is
 * red in the module before it reaches a card.
 */
export const MEANING_MAX = 200;
const fit = (s: string): string | null => (s.length <= MEANING_MAX ? s : null);

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
    return fit('In a room of ' + roomOf(room.e) +
      ', nothing can pass at ' + Math.floor(pct) + '% until more members arrive.');
  }
  if (w.n === 1) return fit('In a room of one, the one vote must be for it.');
  if (w.k === w.n) return fit('In a room of ' + w.n + ', all ' + w.n + ' must vote for it by the end.');
  return fit('In a room of ' + w.n + ', ' + w.k + ' of ' + w.n + ' must vote for it by the end.');
}

/* ---- the spans, worded --------------------------------------------------
   **A span is a phrase, never a number of milliseconds** (T16). One ladder,
   coarsening as it climbs, because a reader choosing a rate does not want
   *4,320 minutes* and cannot use *2.9 days* either: whole minutes under two
   hours, whole hours under two days, whole days after that. Seconds never
   appear — nothing this file describes is measured in them — and neither
   does a decimal. */
function spanPhrase(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 120) return mins === 1 ? '1 minute' : mins + ' minutes';
  const hours = Math.round(ms / 3600000);
  if (hours < 48) return hours + ' hours';
  return Math.round(ms / 86400000) + ' days';
}

/**
 * ⏱️'s drip, which is the one span a member meets as a *rhythm* rather than
 * as a length: under five minutes the exact figure is noise, and *every few
 * minutes* is the honest reading of a rate that fast.
 */
const dripPhrase = (dripMinutes: number): string =>
  (dripMinutes < 5 ? 'few minutes' : spanPhrase(dripMinutes * 60000));

/** 💤's spell, which has three lengths people actually name. */
function spellPhrase(afterMs: number): string {
  const days = Math.round(afterMs / 86400000);
  if (days === 7) return 'a week';
  if (days === 14) return 'two weeks';
  if (days >= 28 && days <= 31) return 'a month';
  return spanPhrase(afterMs);
}

/* ---- 👥 -----------------------------------------------------------------
   Two shapes of the same sentence. The **count** form leads with the room,
   like 🌡️'s; the **share** form leads with the arithmetic, because a share
   is the one answer whose consequence the reader cannot do in their head —
   *34% of a room of 5 is 2* is the whole of what a share is asking them to
   agree to, and it moves when somebody joins.

   The verb is **freezes**, not *pauses*: the topbar's clock already says
   *Frozen — 3 must return* and the glossary names the state `freeze`, so one
   word for one state across the surface (T5). */
function quorumBody(q: number, n: number): string {
  if (q > n) {
    return q + ' of you must have voted before a change can pass, so nothing can pass ' +
      'until more members arrive.';
  }
  if (n === 1) return 'your own vote is the whole quorum, and nothing waits on anybody else.';
  if (q >= n) {
    return 'all ' + n + ' of you must have voted on a change before it can pass — one member ' +
      'away and the document freezes.';
  }
  // a quorum of one never holds anything up and never freezes a room with
  // anybody in it, so the second clause would be a consequence that cannot
  // happen (T37: one consequence, and it has to be a real one)
  if (q <= 1) return 'one vote meets quorum, so a change never waits for more people to arrive.';
  return 'at least ' + q + ' of you must have voted on a change before it can pass; with fewer ' +
    'than ' + q + ' still here the document freezes.';
}

function quorumMeaning(v: QuorumValue, room: Room): string | null {
  if (typeof v.n !== 'number' || !Number.isFinite(v.n)) return null;
  const n = Math.max(1, Math.floor(room.e));
  const q = quorumCount(v, n);
  if (!Number.isFinite(q)) return null;
  const body = quorumBody(q, n);
  return fit(v.form === 'share'
    ? Math.round(v.n) + '% of a room of ' + roomOf(n) + ' is ' + q + ': ' + body
    : 'In a room of ' + roomOf(n) + ', ' + body);
}

/* ---- ⏱️ -----------------------------------------------------------------
   **The window is ⏱️'s dependence** (rule 1), the way the room is 👥's: three
   numbers mean one thing over an afternoon and quite another over a month,
   and the total is the figure a member would actually weigh. It is *about*
   because a spent ✏️ that carries is refunded, so the real number is at
   least this one. */
function rateMeaning(v: RateValue, room: Room): string | null {
  const { grant, cap, dripMinutes } = v;
  if (![grant, cap, dripMinutes].every((x) => typeof x === 'number' && Number.isFinite(x))) return null;
  if (dripMinutes <= 0) return null;
  const drip = dripPhrase(dripMinutes);
  const end = room.endsAtMs;
  const now = room.nowMs;
  // **⏰ unanswered is not ⏰ answered *never***, and the difference is the
  // whole sentence: the founder meets ⏱️ before ⏰ in the founding order, so
  // promising *for as long as it runs* there would answer a question they
  // have not been asked. Absent → nothing said; `null` → never; a date
  // already past → nothing said either, the session it measured being over.
  if (end === undefined) return null;
  if (end === null) {
    return fit('With no end date, ' + grant + ' proposals to start with and one more every ' + drip +
      ' for as long as it runs, never more than ' + cap + ' in hand.');
  }
  if (typeof now !== 'number' || !(end > now)) return null;
  const windowMs = end - now;
  // *about*, because a proposal that carries is refunded: the real number is
  // at least this one, never fewer
  const total = grant + Math.floor(windowMs / 60000 / dripMinutes);
  const whole = 'Over a session of ' + spanPhrase(windowMs) + ', about ' + total +
    ' proposals each — ' + grant + ' to start with and one more every ' + drip +
    ', never more than ' + cap + ' in hand.';
  // the tail is the cheapest thing to lose: the total is the consequence and
  // the three numbers are on the control right beside it
  return fit(whole) ?? fit('Over a session of ' + spanPhrase(windowMs) + ', about ' + total +
    ' proposals each.');
}

/* ---- 💤 -----------------------------------------------------------------
   **No room phrase here, and that is the rule working** (rule 1): what a
   lapse depends on is the spell and nothing else, and a false dependence is
   as wrong as a missing one. */
function lapseMeaning(v: LapseValue): string | null {
  if (v.afterMs === null) return fit('Nobody ever drops out of the count, however long they are away.');
  if (typeof v.afterMs !== 'number' || !Number.isFinite(v.afterMs) || v.afterMs <= 0) return null;
  return fit('A member who says nothing for ' + spellPhrase(v.afterMs) +
    ' drops out of the count — the document can go on without them, and they are back the ' +
    'moment they log in.');
}

/* ---- 🪜 -----------------------------------------------------------------
   **🪜's dependence is 🌡️'s number, not the room** (rule 1, entry 167). Entry
   165's sentence counted votes at the start — *in a room of 5, 3 of 5 is
   enough when voting opens* — which is 🌡️'s own sentence in the opening
   tense, and left the reader to find the number it climbs *to* on another
   card. What a start percent means is where the climb begins and where it
   ends, so the sentence names both rungs and says which way the pacing
   leans; with 🌡️ unset there is nothing to climb towards and the card says
   nothing at all. */
const rungName = (pct: number): string => {
  const r = BAR_RUNGS.find((x) => x.pct === Math.floor(pct));
  return r ? r.label.charAt(0).toLowerCase() + r.label.slice(1) + ' (' + Math.floor(pct) + '%)'
    : Math.floor(pct) + '%';
};

function paceMeaning(v: PaceValue, room: Room): string | null {
  const close = room.barPct;
  if (typeof close !== 'number' || !Number.isFinite(close)) return null;
  if (v.shape === 'fixed') {
    return fit('Stays at ' + rungName(close) + ' from the moment voting opens to the end.');
  }
  if (typeof v.startPct !== 'number' || !Number.isFinite(v.startPct)) return null;
  return fit('Starts at ' + rungName(v.startPct) + ' when voting opens and climbs to ' +
    rungName(close) + ' by the end — early changes pass more easily.');
}

/**
 * **What this value would mean for this room**, or `null` where there is
 * nothing true to say — in which case the card prints no line at all rather
 * than an approximation.
 *
 * *by the end* on 🌡️ because the number is the bar at the close, where the
 * ramp has finished rising; *when voting opens* on 🪜 because that is the one
 * moment its start describes.
 *
 * **Five settings, and every other one returns `null`** — 👤 👁️ 🌍 🪪 🥾 🤝
 * 🤖 ⏰, the personal cards and the text, whose own rung sentences say what
 * they mean without arithmetic. `null` is what makes this safe to call from a
 * generic rung builder: a caller that gets one prints nothing and never falls
 * back to a sentence of its own.
 */
export function meaningOf(
  setting: string,
  value: SettingValue | null | undefined,
  room: Room = { e: 1 },
): string | null {
  if (!value) return null;
  switch (setting) {
    case 'bar': {
      const pct = (value as PercentValue).pct;
      return typeof pct === 'number' ? barMeaning(pct, room) : null;
    }
    case 'pace':
      return paceMeaning(value as PaceValue, room);
    case 'quorum':
      return quorumMeaning(value as QuorumValue, room);
    case 'rate':
      return rateMeaning(value as RateValue, room);
    case 'lapse':
      return lapseMeaning(value as LapseValue);
    default:
      return null;
  }
}
