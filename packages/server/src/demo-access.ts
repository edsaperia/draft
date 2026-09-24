/**
 * **Who is Ed, and which document is the demo** (design/DEMO.md Stage 2;
 * Q1535) — the one small module every demo-shaped route asks, so the panel's
 * rows, the view's `demoPanel` flag and the bots (Stages 4–5) share one
 * answer to each question:
 *
 *  - `hasDemoKey(ctx, req)` — does this request carry a valid `draft_demo`
 *    cookie? The cookie is `<exp>.<base64url hmac-sha256(key, 'draft-demo.' +
 *    exp)>`: it holds an HMAC keyed on `DRAFT_DEMO_KEY`, never the key, so
 *    changing the key kills every cookie minted under the old one. False
 *    whenever the key is unset.
 *  - `demoDoc(ctx)` — the current generation's document, or null (the demo
 *    off, slug-held or failed). Its `cs` is the ConstitutionSession and
 *    `asEngineDoc(doc).bridge` the engine, exactly as for any document.
 *  - `isDemoDoc(ctx, doc)` — is this document the demo's current generation?
 *
 * The key itself is compared once, where it is typed (`/d/demo?demokey=`),
 * in constant time; everything after that reads the cookie.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { RouteContext } from './routes.js';
import type { LoadedDoc } from './store.js';

export const DEMO_COOKIE = 'draft_demo';
/** A year: Ed sets his browser once (DEMO.md §2.5). */
export const DEMO_COOKIE_MS = 365 * 24 * 3600_000;

const sign = (key: string, exp: number): string =>
  createHmac('sha256', key).update(`draft-demo.${exp}`).digest('base64url');

/** A fresh cookie value for the key, good for a year from `nowMs`. */
export function mintDemoCookie(key: string, nowMs: number): string {
  const exp = nowMs + DEMO_COOKIE_MS;
  return `${exp}.${sign(key, exp)}`;
}

/** Is `value` a cookie minted under `key` and not yet expired? Constant time. */
export function demoCookieValid(value: string, key: string, nowMs: number): boolean {
  const dot = value.indexOf('.');
  if (dot <= 0) return false;
  const exp = Number(value.slice(0, dot));
  if (!Number.isSafeInteger(exp) || exp < nowMs) return false;
  const given = Buffer.from(value.slice(dot + 1), 'utf8');
  const want = Buffer.from(sign(key, exp), 'utf8');
  return given.length === want.length && timingSafeEqual(given, want);
}

/** The typed key against the configured one, in constant time (`bearerOk`'s discipline). */
export function demoKeyMatches(given: string, key: string): boolean {
  const a = Buffer.from(given, 'utf8');
  const b = Buffer.from(key, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * **Wrong guesses are rate-limited** (Ed, 2026-09-24): the key may be a
 * human-readable passphrase (`oven-marble-quiet-harbour-seven`), which is
 * guessable at a rate a random token is not, so every route that checks the
 * key or its cookie counts a wrong try against the address it came from, and
 * **five wrong in a minute lock that address out for five minutes** — every
 * try refused, the right key included, until the lock lifts. In memory, per
 * process: a restart forgets it, which costs a guesser nothing they did not
 * already have. The key is never logged: the request log drops the query,
 * the error log records the path alone, and nothing here prints it.
 */
export const GUESS_LIMIT = 5;
export const GUESS_WINDOW_MS = 60_000;
export const GUESS_LOCK_MS = 5 * 60_000;
const guesses = new Map<string, { fails: number[]; lockedUntil: number }>();

/** Is this address locked out of the demo key? */
export function guessLocked(ip: string, nowMs: number): boolean {
  const g = guesses.get(ip);
  return g !== undefined && g.lockedUntil > nowMs;
}

/** Count a wrong try from this address; lock it at the fifth inside the window. */
export function guessFailed(ip: string, nowMs: number): void {
  const g = guesses.get(ip) ?? { fails: [], lockedUntil: 0 };
  g.fails = g.fails.filter((t) => t > nowMs - GUESS_WINDOW_MS);
  g.fails.push(nowMs);
  if (g.fails.length >= GUESS_LIMIT) { g.lockedUntil = nowMs + GUESS_LOCK_MS; g.fails = []; }
  guesses.set(ip, g);
  // the map sweeps itself: nothing older than a lock is worth keeping
  if (guesses.size > 10_000) {
    for (const [k, v] of guesses) if (v.lockedUntil < nowMs && v.fails.every((t) => t < nowMs - GUESS_WINDOW_MS)) guesses.delete(k);
  }
}

/** Forget every address's count — the tests' reset, never a route's. */
export function forgetGuesses(): void {
  guesses.clear();
}

/** The `draft_demo` cookie's value on this request, or null. */
function cookieValue(req: IncomingMessage): string | null {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const s = part.trim();
    if (s.startsWith(`${DEMO_COOKIE}=`)) return s.slice(DEMO_COOKIE.length + 1);
  }
  return null;
}

/** **Does this request carry Ed's key?** False wherever `DRAFT_DEMO_KEY` is unset. */
export function hasDemoKey(ctx: RouteContext, req: IncomingMessage, nowMs: number = Date.now()): boolean {
  const key = ctx.cfg.demoKey ?? null;
  if (key === null) return false;
  const v = cookieValue(req);
  return v !== null && demoCookieValid(v, key, nowMs);
}

/** The demo's current document, or null where there is none. */
export function demoDoc(ctx: RouteContext): LoadedDoc | null {
  return ctx.demo.doc();
}

/** Is `doc` the demo's current generation? */
export function isDemoDoc(ctx: RouteContext, doc: LoadedDoc): boolean {
  return doc.ephemeral === true && ctx.demo.doc() === doc;
}
