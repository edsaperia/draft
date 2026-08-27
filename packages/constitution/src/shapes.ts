/**
 * **The shapes are one table in one file** (Ed, 2026-08-27, plan-queue entry
 * 166): easy to inspect, change, add to and remove from. A shape is what the
 * founder chooses at 🧭 before the birth — *a meeting*, *a conference*,
 * *ongoing* — and the save folds its `sets` as **the founder's own pre-start
 * `setting-set` events** at the birth (SPEC §9.0a): every setting stays
 * convenor-held with both powers and its question shut, nothing is delegated,
 * and a set made before the start is owed nothing (§9.6a). The values are
 * *given*, never defaulted, and the band says so on each shaped clause until
 * the founder touches it (`SettingView.shaped`).
 *
 * **Custom is not a row**: it is the absence of a shape (`null`), and the page
 * offers it as the fourth rung. A row with an empty `sets` would be a shape
 * that shapes nothing, and every assertion `checkShapes` makes would have to
 * except it.
 *
 * **The numbers are placeholders** until `alpha-preset` sweeps each shape on
 * *alive* (Q960): changing one is editing one cell. The meeting row's ⏱️ is
 * the one cell with evidence behind it — it is the sweep's own *ALPHA PRESET*.
 *
 * `spec-check`'s `checkShapes` asserts the table off the bundle: every row
 * sets every id in `SHAPED`, every value passes `validateFor`, no row names an
 * id in `UNSHAPED`, `hides ⊆ keys(sets)`, a perpetual row sets 🪜 fixed, and
 * a row with a `unit` leaves ⏰ for the card.
 */

import type { SettingId } from './catalogue.js';
import type { SettingValue } from './values.js';

export type ShapeName = 'meeting' | 'conference' | 'ongoing';

export interface Shape {
  name: ShapeName;
  /** The rung's bold label. */
  title: string;
  /** One consequence line under the label — by consequence, never by name alone (Ed). */
  say: string;
  /** What ⏰'s chips count in; null where the shape sets ⏰ itself. */
  unit: 'hours' | 'days' | null;
  /** What the save folds, as the founder's own sets. */
  sets: Partial<Record<SettingId, SettingValue>>;
  /** Shaped settings whose cards are not shown at all (a decision nobody has — the 🎲 rule). */
  hides: readonly SettingId[];
}

/** The settings **every** shape must set. 🥾 is here on the plan's proposal, not Ed's list (Q960). */
export const SHAPED: readonly SettingId[] = [
  'bar', 'pace', 'quorum', 'authorship', 'judgments', 'chamber', 'rate', 'lapse', 'machines', 'removal',
];

/** Ed's unavoidables: the settings no shape may name. 🎩 and 🍾 are not settings and cannot appear. */
export const UNSHAPED: readonly SettingId[] = [
  'title', 'link', 'startingText', 'admission', 'applications', 'displayName', 'picture',
];

const DAY_MS = 24 * 3600 * 1000;

export const SHAPES: readonly Shape[] = [
  {
    name: 'meeting',
    title: 'A meeting',
    say: 'A few hours in one room: everyone is here, changes pass easily early on, and nobody is removed or lapses.',
    unit: 'hours',
    sets: {
      // Ed: ramp 60→80; 80 is 🌡️'s *Broad agreement* rung. Mind Q840: a room
      // of one tops out at 79, and 🌡️'s ceiling note already says so.
      bar: { pct: 80 },
      pace: { shape: 'ramp', startPct: 60 },
      // as a share (Ed); everyone is in the room at a meeting
      quorum: { form: 'share', n: 50 },
      // names at the end, or earlier by choice — the rung the sign control belongs to
      authorship: { rung: 'sealedElective' },
      // the most protective rung; votes stay private unless a room decides otherwise
      judgments: { rung: 'never' },
      // a meeting's document is passed round by its address
      chamber: { rung: 'link' },
      // **is** alpha-preset's measured *ALPHA PRESET*: the one cell with evidence
      rate: { grant: 6, cap: 8, dripMinutes: 5 },
      // Ed: hidden for a meeting — a decision nobody has
      lapse: { afterMs: null },
      // Ed: off
      machines: { enabled: false, budget: 0 },
      // nobody is put out of a meeting — leave only
      removal: { price: 'consent' },
    },
    hides: ['lapse'],
  },
  {
    name: 'conference',
    title: 'A conference',
    say: 'A few days with people coming and going: a third of the room is enough to move, one proposal an hour each.',
    unit: 'days',
    sets: {
      bar: { pct: 80 },
      pace: { shape: 'ramp', startPct: 60 },
      quorum: { form: 'share', n: 33 },
      authorship: { rung: 'sealedElective' },
      // placeholder — QA may prefer *after* for a conference
      judgments: { rung: 'never' },
      chamber: { rung: 'link' },
      // drip in hours
      rate: { grant: 4, cap: 8, dripMinutes: 60 },
      lapse: { afterMs: null },
      machines: { enabled: false, budget: 0 },
      removal: { price: 'consent' },
    },
    hides: ['lapse'],
  },
  {
    name: 'ongoing',
    title: 'Ongoing',
    say: 'No end date, members only: a quarter of the room can move, one proposal a day each, and a member away a month lapses.',
    unit: null,
    sets: {
      // Ed: *never* is what *ongoing* already said — folded first, because
      // the module refuses a ramp under a perpetual ending
      ending: { endsAtMs: null },
      // fixed 80 for ongoing (perpetual forces fixed)
      bar: { pct: 80 },
      pace: { shape: 'fixed' },
      quorum: { form: 'share', n: 25 },
      authorship: { rung: 'sealedElective' },
      judgments: { rung: 'never' },
      // an ongoing document is the members'
      chamber: { rung: 'closed' },
      // drip in days
      rate: { grant: 4, cap: 6, dripMinutes: 1440 },
      // Ed: about 30 days for ongoing
      lapse: { afterMs: 30 * DAY_MS },
      machines: { enabled: false, budget: 0 },
      // an ongoing room needs the door
      removal: { price: 'assembly' },
    },
    hides: [],
  },
];

/** The row, or a throw — a name the table does not know is a caller's bug, never a silent custom. */
export function shapeOf(name: string): Shape {
  const row = SHAPES.find((s) => s.name === name);
  if (!row) throw new Error(`'${name}' is not a shape`);
  return row;
}

/** Is this string one of the table's names? The server's read of `body.shape` (anything else is no shape). */
export function isShapeName(v: unknown): v is ShapeName {
  return typeof v === 'string' && SHAPES.some((s) => s.name === v);
}
