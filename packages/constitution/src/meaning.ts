/**
 * **What choosing this would do, in this room** (entry 165, Ed 2026-08-27:
 * *we need to help them with 3 preset buttons, and they can edit the precise %
 * if they really want to*).
 *
 * A number is not a thing anybody has an opinion about. *In a membership of 5,
 * 4 of 5 must vote before a proposal can pass* is. So each rung a card offers
 * carries a sentence saying what taking it would mean for the room **as it
 * stands**, read live on every render — which is why the sentence names its own
 * dependence (*in a membership of 5*, never a bare *4 of 5*): when a sixth
 * member arrives, the reader can see what moved and why.
 *
 * The labels live here rather than page-side because there are three readers of
 * them — the founder's card, the member's blind answer card and the
 * distribution strip — and *one label per rung everywhere* (STYLE T5, Q620) is
 * a rule a shared list keeps and three literals do not.
 *
 * `meaningOf` is deliberately one function over `(setting, value, room)` rather
 * than a helper per card: every other ladder on the surface wants the same
 * sentence, and this is the shape that takes them.
 *
 * **Three settings** — 👥 ⏱️ 💤, every setting whose answer is a number rather
 * than a rung with a name. It was five until 2026-09-15 (Q1362 (b), R-117),
 * when 🌡️ and 🪜 left the surface with the bar itself: `BAR_RUNGS`,
 * `OWN_RUNG_LABEL`, `winsNeededPct`, `barMeaning`, `paceMeaning`, `rungName`
 * and `Room.barPct` described cards nobody will be served again and are gone
 * with them, the page having stopped importing them in the same pass. The
 * threshold machinery they read (`threshold.ts`) stays a release longer,
 * pinned and unable to bite. The rules the sentences obey are Ed's:
 *
 * 1. **A meaning names its own dependence.** 👥's is the room, ⏱️'s the
 *    window, and 💤's is the spell alone — so 💤's sentence names no room,
 *    because a false dependence is as wrong as a missing one.
 * 2. **Meanings live on the card, never in the clause.** The clause is the
 *    rule; this is advice at the moment of choosing, and would be false by
 *    next week. Nothing here is written into the constitution.
 * 3. **One consequence per value** (STYLE T37), under H4's 200 characters.
 */

import type {
  LapseValue, QuorumValue, RateValue, SettingValue,
} from './values.js';
import { quorumCount } from './populations.js';

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
}

/**
 * *one* reads better than *1* at the head of a sentence; the rest are digits.
 * Exported because the page built the same phrase for `ceilingNote`, and two
 * copies of *a membership of one* are two copies to keep in step (T5). That
 * caller went with 🌡️ (Q1362) and the export stays for the next one. The
 * name stays `roomPhrase`: it is an identifier, not copy (entry 215).
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

/**
 * **A lapse spell, worded in the unit that divides it** (Q1321, Ed
 * 2026-09-11: *it's not actually 0 days — you should intelligently show days
 * or hours or minutes*). Days where the spell is whole days, else hours where
 * it is whole hours, else minutes — 7 days → *7 days*, 36 h → *36 hours*,
 * 90 min → *90 minutes*, singular at one. The one writer of the number every
 * lapse sentence carries: the meaning below, and the page's clause, value
 * line and composer read it through the bundle, so a spell under a day can
 * never again print as *0 days*. Nothing to say — no spell, or one that is
 * not positive — is `''`, T13's silence rather than a stand-in.
 */
export function spellWords(afterMs: number): string {
  if (typeof afterMs !== 'number' || !Number.isFinite(afterMs) || afterMs <= 0) return '';
  const ms = Math.round(afterMs);
  const unit = (n: number, one: string): string => n + ' ' + one + (n === 1 ? '' : 's');
  if (ms % 86400000 === 0) return unit(ms / 86400000, 'day');
  if (ms % 3600000 === 0) return unit(ms / 3600000, 'hour');
  return unit(Math.max(1, Math.round(ms / 60000)), 'minute');
}

/** 💤's spell, which has three lengths people actually name; the rest is `spellWords`. */
function spellPhrase(afterMs: number): string {
  const ms = Math.round(afterMs);
  const days = ms % 86400000 === 0 ? ms / 86400000 : null;
  if (days === 7) return 'a week';
  if (days === 14) return 'two weeks';
  if (days !== null && days >= 28 && days <= 31) return 'a month';
  return spellWords(ms);
}

/* ---- 👥 -----------------------------------------------------------------
   Two shapes of the same sentence. The **count** form leads with the room,
   like 🌡️'s; the **share** form leads with the arithmetic, because a share
   is the one answer whose consequence the reader cannot do in their head —
   *34% of a room of 5 is 2* is the whole of what a share is asking them to
   agree to, and it moves when somebody joins.

   Every branch ends in the floor and nothing else (Ed, 2026-09-06, Q1196;
   R-088). Until v0.99 three of them ended in *the document freezes*, which
   was 👥's other job; there is no freeze now, so the one consequence each
   sentence states (T37) is the only one the setting has — how many must
   have voted on a change before it can pass. */
function quorumBody(q: number, n: number): string {
  if (q > n) {
    return q + ' of you must have voted before a change can pass, so nothing can pass ' +
      'until more members arrive.';
  }
  if (n === 1) return 'your own vote is the whole quorum, and nothing waits on anybody else.';
  if (q >= n) return 'all ' + n + ' of you must have voted on a change before it can pass.';
  if (q <= 1) return 'one vote is enough for a change to pass, so nothing waits for anybody else.';
  return 'at least ' + q + ' of you must have voted on a change before it can pass.';
}

function quorumMeaning(v: QuorumValue, room: Room): string | null {
  if (typeof v.n !== 'number' || !Number.isFinite(v.n)) return null;
  const n = Math.max(1, Math.floor(room.e));
  const q = quorumCount(v, n);
  if (!Number.isFinite(q)) return null;
  const body = quorumBody(q, n);
  return fit(v.form === 'share'
    ? Math.round(v.n) + '% of a membership of ' + roomOf(n) + ' is ' + q + ': ' + body
    : 'In a membership of ' + roomOf(n) + ', ' + body);
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
