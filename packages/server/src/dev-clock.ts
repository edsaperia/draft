/**
 * **The dev clock** (Q1455, Ed 2026-09-18): move **one** document's clock
 * forward, so that a walk which needs somebody to lapse does not have to sit
 * through the five minutes the validator now insists on (Q1453,
 * `LAPSE_MIN_MS`). The seat matrix is its one caller; nothing else in the
 * repo asks for it and nothing on the surface knows it exists.
 *
 * **The mechanism is an offset, not a rewritten past.** A document's own
 * clock is `foldTime` — the wall clock, or the last event of either of its
 * logs where that is later — so adding a skew there moves everything that
 * reads the document's time and nothing else. Two other mechanisms were
 * considered and are worth naming, because each looks simpler until you
 * price it:
 *
 *  · **Writing the past backwards** is what the phase ladder does, and it
 *    cannot be done here: the log is append-only and the seat matrix's
 *    document already has one. Ruled out.
 *  · **Writing one event at a future timestamp** and letting `foldTime`'s
 *    own maximum carry the document along afterwards would need no
 *    production hook at all — but it *freezes* the document's clock for as
 *    long as the jump lasts: every later act stamps at the same instant
 *    until real time catches up, which stalls the adoption metronome and
 *    every clock that measures a span. An offset keeps time flowing, merely
 *    shifted, which is what the rest of a walk needs.
 *
 * **Nothing about the offset is written down and nothing needs to be.** What
 * reaches the log is the *time*, and the time is in the log — so a replay,
 * in this process or another, reproduces the document entry for entry with
 * no knowledge of the skew (`dev-clock.test.ts`'s last case is that
 * assertion, and it is the one that would have condemned the design). A
 * restarted host forgets the skew and the document's clock falls back to
 * real now, which cannot move it backwards because `foldTime` is a maximum.
 *
 * **It never lapses anybody.** The route moves the clock and stops; the
 * host's ordinary minute `tick()` is what finds the quiet member stale and
 * writes `member-lapsed`, exactly as it would have if the time had really
 * passed. That was Ed's condition at the ruling and it is the whole of what
 * the walk still exercises for real.
 *
 * **`present` is how the other seats survive the jump.** A five-minute spell
 * and a jump of an hour would lapse *everybody*, the founder included
 * (§9.7's crown lapses on the same clock), because nobody's last act is
 * inside the spell any more. So the caller names the seats whose pages are
 * open when the clock moves, and each is stamped through the ordinary
 * presence door — `cs.seen`, the same call an authenticated read makes. It
 * happens inside this one handler, before anything is awaited, so the host's
 * tick cannot land between the jump and the stamp and lapse a seat nobody
 * meant to lose.
 *
 * **Which is why a short jump with `present` is refused.** Presence is
 * throttled to one event an hour per member (`SEEN_EVERY_MS` in
 * `session.ts`, not exported), so a jump shorter than that records nothing
 * and the named seats would lapse anyway — silently, on a later tick, a long
 * way from here. Better a refusal that says so.
 *
 * Dev only, and absent from the production artifact: this module is reached
 * solely through a dynamic `import()` inside a `DEV:`-labelled block, which
 * esbuild's `dropLabels` removes bodily, and `installDevClock`'s body wears
 * the same label — so the artifact holds the read in `foldTime` and no way
 * at all to write it. `scripts/build-server.mjs` greps its own output.
 */
import type { LoadedDoc } from './store.js';
import type { DocStore } from './store.js';
import { foldTime, installDevClock } from './engine-host.js';

/** Per document, how far ahead of the wall clock it is being run. The one
 *  writer of it is `advanceClock` below; the reader is `foldTime`. */
const OFFSETS = new Map<string, number>();

installDevClock((docId: string): number => OFFSETS.get(docId) ?? 0);

/** A dev clock is not a time machine: a year is more than any walk wants and
 *  a fat-fingered zero is how a document ends up past its own close. */
const MAX_ADVANCE_MS = 365 * 24 * 3600_000;

/** `SEEN_EVERY_MS` in `packages/constitution/src/session.ts`, which does not
 *  export it: at most one presence event an hour per member. A jump shorter
 *  than this cannot refresh anybody, and this module refuses rather than
 *  pretend it did. */
const SEEN_THROTTLE_MS = 60 * 60_000;

export interface ClockHost {
  store: DocStore;
  /** `WritePath.tOf` — the document's fold clock, the close met on the way. */
  tOf: (doc: LoadedDoc) => number;
  /** `WritePath.commit`, whose `null` is the announced pause (issue #9). */
  commit: (doc: LoadedDoc, nowMs: number) => Promise<number | null>;
}

export interface ClockRequest {
  slug?: unknown;
  advanceMs?: unknown;
  /** The seats that were at their desks when the clock moved, by email or by
   *  member id; the convenor answers to either too. Everyone else is quiet,
   *  and quiet past 💤's spell is what the next tick lapses. */
  present?: unknown;
}

export interface ClockAnswer {
  ok: true;
  slug: string;
  advanceMs: number;
  /** the whole skew standing on this document now, this jump included */
  offsetMs: number;
  /** the document's clock after the jump, and the wall clock beside it */
  documentNowMs: number;
  realNowMs: number;
  /** the names, as given, that were stamped present at the new time */
  present: string[];
}

/** Whatever the route should answer: a status and a body, nothing else. */
export type ClockResult =
  | { status: 200; body: ClockAnswer }
  | { status: 400; body: { error: string } };

/**
 * Advance one document's clock. The document has already been found by the
 * route (a slug nobody knows is its 404, not this module's 400).
 */
export async function advanceClock(host: ClockHost, doc: LoadedDoc,
  body: ClockRequest, nowMs: number): Promise<ClockResult> {
  const advanceMs = body.advanceMs;
  if (typeof advanceMs !== 'number' || !Number.isFinite(advanceMs) || advanceMs <= 0) {
    return { status: 400,
      body: { error: 'advanceMs must be a positive, finite number of milliseconds — ' +
        'a dev clock advances and never rewinds' } };
  }
  if (advanceMs > MAX_ADVANCE_MS) {
    return { status: 400,
      body: { error: `advanceMs must be at most ${MAX_ADVANCE_MS} ms (a year)` } };
  }
  if (doc.cs.closed) {
    return { status: 400,
      body: { error: 'this document is closed, and a closed document has no clock left to move' } };
  }

  // who is here when it moves, resolved before anything is changed
  const names = body.present === undefined ? [] : body.present;
  if (!Array.isArray(names) || names.some((n) => typeof n !== 'string')) {
    return { status: 400, body: { error: 'present must be an array of emails or member ids' } };
  }
  const present: string[] = names as string[];
  const seats: { name: string; member: string; lastActivityT: number }[] = [];
  for (const name of present) {
    const seat = seatNamed(doc, name);
    if (seat === null) {
      return { status: 400,
        body: { error: `no arrived seat at this document answers to '${name}'` } };
    }
    seats.push({ name, ...seat });
  }

  // …and whether the jump is long enough for presence to record it. The
  // check is arithmetic on the time the jump *would* reach, so a refusal
  // costs nothing: no offset is installed and no event is emitted.
  const wouldBe = foldTime(doc, nowMs + advanceMs);
  const lapse = doc.cs.settingState('lapse').value as { afterMs: number | null } | null;
  const spell = lapse === null ? null : lapse.afterMs;
  if (spell !== null) {
    for (const s of seats) {
      const quiet = wouldBe - s.lastActivityT;
      if (quiet >= spell && quiet < SEEN_THROTTLE_MS) {
        return { status: 400, body: { error:
          `'${s.name}' would be ${quiet} ms quiet at the new time, past 💤's ${spell} ms spell, ` +
          `and presence records at most one event every ${SEEN_THROTTLE_MS} ms — so this seat ` +
          'cannot be kept present across a jump this short. Advance further, or drop it from present.' } };
      }
    }
  }

  OFFSETS.set(doc.id, (OFFSETS.get(doc.id) ?? 0) + advanceMs);
  // from here the document's clock is the new one. `tOf` is the ordinary
  // fold clock, so a document whose ending the jump passed closes here,
  // through the same door a real minute would have taken.
  const t = host.tOf(doc);
  for (const s of seats) doc.cs.seen(t, s.member);
  await host.commit(doc, nowMs);

  return { status: 200,
    body: { ok: true, slug: doc.cs.slug, advanceMs, offsetMs: OFFSETS.get(doc.id)!,
      documentNowMs: host.tOf(doc), realNowMs: nowMs, present } };
}

/** The member or convenor a name picks out — by address or by id, arrived
 *  only, since presence is not a thing an invitation has yet. */
function seatNamed(doc: LoadedDoc,
  name: string): { member: string; lastActivityT: number } | null {
  for (const m of doc.cs.memberRecords().values()) {
    if (m.removed || m.arrivedAtT === null) continue;
    if (m.id === name || m.email === name) {
      return { member: m.id, lastActivityT: m.lastActivityT };
    }
  }
  const c = doc.cs.convenorRecord();
  if (c.id === name || c.email === name) {
    return { member: c.id, lastActivityT: c.lastActivityT };
  }
  return null;
}
