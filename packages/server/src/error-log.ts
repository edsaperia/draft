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
 * **What the page may say about itself** (plan stage 5b, after the nh2026
 * convention). A refusal has been written down since Q1330; an error the
 * page *threw* was written down nowhere at all, and the only two the
 * project has ever caught were found by hand — the swallowed boot error of
 * Q1281 months later, the `?debug=1` strip's on a phone Ed happened to be
 * holding. So the surface posts its uncaught errors and rejections to
 * `POST /api/page-error` and they join the same log as `kind: 'page'`.
 *
 * **It is a production route, so what it accepts is the whole of the
 * privacy story**, and it is decided here rather than on the page: a client
 * can say anything, and a log an operator reads must not become a place a
 * member's words end up by accident.
 *
 *  - **Only these fields are read.** Anything else in the body is dropped
 *    on the floor — not validated, not logged, not answered about.
 *  - **The seat and the build are the host's**, never the client's word:
 *    the seat comes from the cookie, the build from what this process is
 *    serving. A body naming either is ignored.
 *  - **No text a member typed.** The stack never leaves the page; the
 *    message is the browser's own sentence, capped, its whitespace
 *    collapsed so a pasted paragraph cannot ride in on a newline. A
 *    message is not free text by design, but it can quote input — a
 *    `JSON.parse` failure does — so the cap is the defence, not the hope.
 *  - **A path is a path.** Query and hash go, both here and on the page:
 *    a magic link's token travels in a query string, and a report naming
 *    the address you were on must not be a way to write one down.
 */
export const PAGE_CAPS = { message: 200, source: 200, path: 200 } as const;
/** Per seat, per minute (the plan's *a few a minute*); the page holds
 *  itself to five per load besides, since a render that throws throws on
 *  every frame. */
export const PAGE_ERRORS_PER_MINUTE = 5;

/** One string, whitespace collapsed and capped, or undefined where there
 *  was nothing to keep. */
function capText(v: unknown, n: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.replace(/\s+/g, ' ').trim().slice(0, n);
  return s.length > 0 ? s : undefined;
}

/** A finite, non-negative whole number, or undefined. */
function capNum(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return undefined;
  return Math.min(Math.trunc(v), 10_000_000);
}

/** A path with its query and hash taken off. */
function capPath(v: unknown): string {
  const s = capText(v, PAGE_CAPS.path * 4)?.split('?')[0]!.split('#')[0] ?? '';
  const p = s.slice(0, PAGE_CAPS.path);
  return p.startsWith('/') ? p : '/';
}

/**
 * The line a page error becomes, or null where the body said nothing —
 * which is a 400 and not a line, since a log of empty reports is a log
 * nobody will read to the end of.
 */
export function pageErrorOf(body: Record<string, unknown>, at: {
  seat: string | null; doc: string | null; slug: string | null; build: string | null;
}): ErrorRow | null {
  const reason = capText(body.message, PAGE_CAPS.message);
  if (reason === undefined) return null;
  // a source is a URL the browser hands the page; its path is the useful
  // part and its query is not ours to keep
  const source = capText(body.source, PAGE_CAPS.source * 4);
  const file = source === undefined ? undefined
    : capText(source.replace(/^[a-z]+:\/\/[^/]+/i, '').split('?')[0]!.split('#')[0],
      PAGE_CAPS.source);
  const line = capNum(body.line);
  const col = capNum(body.col);
  return {
    kind: 'page', path: capPath(body.path), reason,
    doc: at.doc, slug: at.slug, seat: at.seat, build: at.build,
    ...(file === undefined ? {} : { source: file }),
    ...(line === undefined ? {} : { line }),
    ...(col === undefined ? {} : { col }),
  };
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
