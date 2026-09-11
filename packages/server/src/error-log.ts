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
 * One JSON line per event in `errors.jsonl` in the data dir, the outbox's
 * own shape and the outbox's own reader (`outboxTail`): the time, what kind
 * of failure, the status the wire got, the document (id and slug), the seat
 * as the **member id and never the address** — the log is an operator's and
 * the people rows are the only place an address belongs (decision 1253) —
 * the command and its arguments, and the reason the module or the route
 * gave. **A file for both stores, deliberately**: the bot outbox already
 * lives beside a Postgres store the same way (Q1310), `cfg.dataDir` exists
 * under either, and a table would have been an hour of persistence seam for
 * a log whose reader is `tail`. On docs.vote the file is on the ephemeral
 * disk, so a deploy takes it — read it while the room is running, or copy
 * it off first.
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
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { outboxTail } from './mailer.js';

export const ERROR_LOG_FILE = 'errors.jsonl';
export const errorLogPath = (dataDir: string): string => join(dataDir, ERROR_LOG_FILE);

/** How much of a command's arguments one line keeps. */
export const ARGS_CAP = 2000;

export interface ErrorRow {
  /** `refused`: the module or a route said no, and the member was told (4xx).
   *  `failed`: the route threw something carrying a system code (500). */
  kind: 'refused' | 'failed';
  status: number;
  method: string;
  path: string;
  /** the document's id and slug, where the request had one */
  doc?: string | null;
  slug?: string | null;
  /** the seat that sent it — a member or applicant id, never an address */
  seat?: string | null;
  cmd?: string | null;
  args?: unknown;
  reason: string;
}

/** The arguments as one string, capped — `argsTruncated` says when. */
export function capArgs(args: unknown): { args: string; argsTruncated?: true } {
  let s: string;
  try { s = JSON.stringify(args === undefined ? null : args); } catch { s = String(args); }
  if (s === undefined) s = 'undefined';
  return s.length > ARGS_CAP ? { args: s.slice(0, ARGS_CAP), argsTruncated: true } : { args: s };
}

/** Append one line. Never throws: a failure to log is one console line. */
export function logError(dataDir: string, row: ErrorRow, at = Date.now()): void {
  try {
    mkdirSync(dataDir, { recursive: true });
    const { args, ...rest } = row;
    const line = { at, ...rest, ...(args === undefined ? {} : capArgs(args)) };
    appendFileSync(errorLogPath(dataDir), JSON.stringify(line) + '\n', 'utf8');
  } catch (e) {
    console.error('the error log could not be written:', e);
  }
}

/** The tail, newest first — the outbox's reader, so the two dev routes answer in one shape. */
export function errorTail(dataDir: string, n = 50): unknown[] {
  return outboxTail(errorLogPath(dataDir), n);
}
