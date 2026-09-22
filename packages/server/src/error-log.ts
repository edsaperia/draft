/**
 * **The error log** (Q1330; Ed, 2026-09-11: *we don't expect users to
 * encounter refusals — refusals should print an error on screen with a
 * debug message, and create some kind of error log we can debug*).
 *
 * Until this, a refused command was a 400 on the wire and nothing else:
 * `/healthz` counts the throws nobody handled (`errors.request`) and keeps
 * nothing about them, and a module refusal is deliberately not even counted
 * there, since a member proposing without a pen is the product working. So
 * when Ed pressed 🏛️ on a card the module refused as *not collecting*, the
 * page had nothing to say and the host had nothing to look up.
 *
 * One line per event: the time, what kind of failure, the status the wire
 * got, the document (id and slug), the seat as the **member id and never
 * the address** — the log is an operator's and the people rows are the only
 * place an address belongs (decision 1253) — the command and its arguments,
 * and the reason the module or the route gave.
 *
 * **It goes through the store** (plan stage 5a, after the nh2026
 * convention): `errors.jsonl` in the data dir under the file store, a row
 * of the `errors` table under Postgres. It was a file under both until
 * then, on the argument that a log whose reader is `tail` was not worth an
 * hour of persistence seam — and on docs.vote the data dir is the ephemeral
 * disk, so **every deploy and every restart deleted the whole record**, and
 * the convention's forty refusals were read the morning after only because
 * somebody remembered to copy the file off first. The shape did not change:
 * `ErrorLine` (persistence.ts) is the same JSON either store holds.
 *
 * **Arguments are capped**, not redacted: a refused 🖼️ carries forty
 * thousand characters of picture, and a line that long helps nobody; two
 * thousand is enough to see what was sent. An invitation's arguments carry
 * the invitee's address, and that stays — the log is as private as the data
 * dir it sits in, which already holds every answer in plaintext, and a
 * refused invitation with its address blanked is a refusal you cannot
 * debug.
 *
 * **Writing must never throw**: this runs inside the request's catch, and a
 * log that takes the request down with it turns one refusal into a 500.
 */
import type { ErrorLine, Persistence } from './persistence.js';

/** How much of a command's arguments one line keeps. */
export const ARGS_CAP = 2000;

/** What a caller states. The line adds `at` and caps the arguments;
 *  `ErrorLine` (persistence.ts) is what either store then holds. */
export type ErrorRow = Omit<ErrorLine, 'at' | 'args' | 'argsTruncated'> & { args?: unknown };

/** The half of the store this file is handed — nothing here can reach a
 *  read, let alone a wipe, and a test can be a one-method object. */
export type ErrorSink = Pick<Persistence, 'appendError'>;

/** The arguments as one string, capped — `argsTruncated` says when. */
export function capArgs(args: unknown): { args: string; argsTruncated?: true } {
  let s: string;
  try { s = JSON.stringify(args === undefined ? null : args); } catch { s = String(args); }
  if (s === undefined) s = 'undefined';
  return s.length > ARGS_CAP ? { args: s.slice(0, ARGS_CAP), argsTruncated: true } : { args: s };
}

/**
 * Append one line. **Never throws, and never waits**: every caller is
 * inside a request's catch, so a store that is slow must not hold the
 * answer up and a store that refuses must not turn one refusal into a 500.
 * A failure here is one console line and nothing else — including the
 * rejection a Postgres insert can now make, which is what the `.catch`
 * below is for and why this stays a `void`-returning function.
 */
export function logError(sink: ErrorSink, row: ErrorRow, at = Date.now()): void {
  try {
    const { args, ...rest } = row;
    const line: ErrorLine = { at, ...rest, ...(args === undefined ? {} : capArgs(args)) };
    void sink.appendError(line).catch((e: unknown) => {
      console.error('the error log could not be written:', e);
    });
  } catch (e) {
    console.error('the error log could not be written:', e);
  }
}

/**
 * **The refusals nobody did anything wrong to meet** (Q1493 (a), Ed
 * 2026-09-21: *The page handles both*).
 *
 * Sixteen of the nh2026 convention's forty refusals were a race with the 4 s
 * poll: a judgment on a candidate that closed between the card being drawn
 * and the ✓ being pressed, and a proposal pressed in the second after
 * somebody else's adoption — the author's own words refused though nothing
 * of theirs had moved. In a cooldown-0 document with twelve people these are
 * ordinary, and Q1330 says a member is not expected to meet a refusal at all.
 *
 * So the page answers both itself (`design/live.js`) and they stop being
 * refusals here: **tallied, not logged**. The error log is for things an
 * operator should read, and sixteen lines of *the room was faster than you*
 * buried the five that mattered. The count stays, by kind, on `/healthz`
 * beside `errors` — a room that produces a great many of these is saying
 * something about its pace, which is worth knowing and is not a defect.
 *
 * Matched on the command **and** the sentence: *is not live* from any other
 * door is a different fact, and a sentence alone would swallow it.
 */
export type RaceKind = 'judged-closed' | 'stale-version';
export function raceRefusal(cmd: string | null | undefined, reason: string): RaceKind | null {
  if (cmd === 'judge-race') {
    return /is not in a live race|is not live|stale card/.test(reason) ? 'judged-closed' : null;
  }
  if (cmd === 'propose-text' || cmd === 'rebase-text' || cmd === 'pen-text') {
    return /^patch targets version \d+; current is \d+$/.test(reason) ? 'stale-version' : null;
  }
  return null;
}

/** What `/healthz` reports beside `errors`: the same shape, counted by kind. */
export interface RaceCounts {
  total: number;
  'judged-closed': number;
  'stale-version': number;
  last: null | { at: number; kind: RaceKind };
}
export const newRaceCounts = (): RaceCounts =>
  ({ total: 0, 'judged-closed': 0, 'stale-version': 0, last: null });
export function noteRace(c: RaceCounts, kind: RaceKind, at = Date.now()): void {
  c.total += 1;
  c[kind] += 1;
  c.last = { at, kind };
}
