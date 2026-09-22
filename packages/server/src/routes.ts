/**
 * The route families' shared ground (refactor Q1352 (m), (n), 2026-09-14).
 *
 * `route()` was one if-chain of some 1,100 lines over `(method, path)`,
 * every branch reaching into `createDraftServer`'s closure for the store,
 * the auth, the write path and a handful of per-request guards. The chain
 * is five family modules now — `routes-dev`, `routes-admin`, `routes-auth`,
 * `routes-member`, `routes-surface` — each a `Route[]` in the chain's own
 * order, and this file is what they all read:
 *
 *  - `RouteContext`, the server's own state, made once at boot. Three of its
 *    fields are **mutable on purpose**: a surface upload (Q1347) moves
 *    `designDir`, `buildSha` and `surfaceSha` together, and the static
 *    rows and `/healthz` must see the move.
 *  - `Route`, one row of the table, and `routeMatches`, the whole of the
 *    dispatch.
 *  - `Req`, the request as the chain had already parsed it — url, path,
 *    segments, the clock — plus the four guards every family used
 *    (`docOr404`, `tooMany`, `bearerRefused`, `devOff`), each of which
 *    answers the request itself and says so by returning true.
 *  - the response helpers (`json`, `html`, `redirect`, `serveFile`), the
 *    body readers, the cookie pair and the rate limiter.
 *
 * Moved, not edited: every body here is the body it had in `server.ts`.
 * Nothing in this file imports `server.ts`, so the direction is one way.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import type { Auth } from './auth.js';
import type { ServerConfig } from './config.js';
import type { DocStore, LoadedDoc } from './store.js';
import type { Persistence, WriteChain } from './persistence.js';
import type { Mailer } from './mailer.js';
import type { MailOutbox } from './outbox.js';
import type { Stash } from './stash.js';
import type { PauseState, WritePath } from './write-path.js';
import type { RaceCounts } from './error-log.js';
import { str } from './commands.js';

/**
 * What the server holds and the families read. One of these is made in
 * `createDraftServer` and handed to every family on every request.
 */
export interface RouteContext {
  readonly cfg: ServerConfig;
  readonly store: DocStore;
  /** the backend itself, for the one thing that is not a document: the
   *  error log, which is a row of the store since plan stage 5a */
  readonly persistence: Persistence;
  readonly auth: Auth;
  readonly mailer: Mailer;
  readonly outbox: MailOutbox;
  readonly stash: Stash;
  /** the per-document chain: the birth's persist and a first command cannot interleave */
  readonly commits: WriteChain;
  /** commit, the mail it relays, the give-up door and the metronome (Q1352 (l)) */
  readonly writes: WritePath;
  /** the announced pause (Q1345): the admin family makes it, every view carries it */
  readonly pause: PauseState;
  /** the throws nobody handled (entry 77), as `/healthz` serialises them */
  readonly errors: {
    total: number; request: number; tick: number; outbox: number;
    last: null | { at: number; where: string; kind: string };
  };
  /** the refusals a member did nothing wrong to meet (Q1493 (a)): a race with
   *  the poll, answered by the page and counted rather than logged */
  readonly races: RaceCounts;
  readonly bootedAtMs: number;
  /** an https baseUrl: HSTS, the proxy redirect and the cookie's Secure flag */
  readonly httpsOn: boolean;
  /** **mutable** (Q1347): where the page files are served from, and which
   *  commit answers in `x-build` — a surface upload moves all three. */
  designDir: string;
  buildSha: string | null;
  surfaceSha: string | null;
}

/** The request, parsed once, with the guards the chain built per request. */
export interface Req {
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
  readonly url: URL;
  readonly path: string;
  readonly seg: string[];
  readonly nowMs: number;
  /** the one origin every Origin header on this request is checked against */
  readonly baseOrigin: string;
  /** 404 for a document that isn't there; hand back whatever is. */
  docOr404(doc: LoadedDoc | null): LoadedDoc | null;
  /** 429 a mail-minting door when its per-IP bucket overflows. `refused`
   *  writes the answer in the caller's own shape where JSON is the wrong
   *  one — a door a person is looking at owes them a page (issue #69, F3). */
  tooMany(route: string, max?: number, refused?: () => void): boolean;
  /** the operator's key, as every admin route and the bot outbox gate on it */
  bearerRefused(): boolean;
  /** a route that exists on a dev host only: an unknown path anywhere else */
  devOff(): boolean;
}

/**
 * One row of the route table (refactor Q1352 (n)).
 *
 * **Ordered, because the chain's order is load-bearing.** Each family module
 * exports its rows as an array in exactly the order its branches stood in,
 * and `server.ts` concatenates the seven arrays into one; dispatch is the
 * first row whose method and match both agree.
 *
 *  - `method` is the method the branch tested, or `'*'` where it tested none
 *    — the member view/cmd branch is the only `'*'` in the table.
 *  - `match` is an exact path where the branch compared one, and a predicate
 *    over the parsed request where it read segments, an extension or a pair
 *    of paths. A predicate must stay **pure**: it is asked of every request
 *    that reaches its row.
 *  - `handler` answers, and says so. **A row may decline**: returning false
 *    leaves the request unanswered and the walk goes on to the next row,
 *    which is how the one branch that fell through the old chain still does.
 *  - `name` is for a reader, and for anything that wants to print the table.
 */
export interface Route {
  readonly name: string;
  readonly method: 'GET' | 'POST' | 'HEAD' | '*';
  readonly match: string | ((r: Req) => boolean);
  readonly handler: (ctx: RouteContext, r: Req) => Promise<boolean> | boolean;
}

/** Does this row answer this request? Method and match, in that order. */
export function routeMatches(entry: Route, r: Req): boolean {
  if (entry.method !== '*' && entry.method !== r.req.method) return false;
  return typeof entry.match === 'string' ? r.path === entry.match : entry.match(r);
}

/**
 * One cookie per document (review #1, finding 13): a single name meant
 * logging into one document logged you out of every other. The document
 * id is a hex string, cookie-name-safe by construction; the legacy name
 * is still read, for its own document only, until those cookies expire.
 */
const LEGACY_COOKIE = 'draft_session';
export const cookieName = (docId: string): string =>
  `draft_session_${docId.replace(/[^A-Za-z0-9_-]/g, '')}`;

/** Q346 territory, minimally: the mail-minting doors are rate-limited
 *  per address+route — in memory, generous, a brake not a wall. */
const BUCKET = new Map<string, { n: number; resetMs: number }>();
export function rateLimited(key: string, nowMs: number, max = 20, windowMs = 600_000): boolean {
  const b = BUCKET.get(key);
  if (!b || b.resetMs < nowMs) { BUCKET.set(key, { n: 1, resetMs: nowMs + windowMs }); return false; }
  b.n += 1;
  return b.n > max;
}

/** The limiter's own housekeeping, swept by the minute's metronome. */
export function sweepBuckets(nowMs: number): void {
  for (const [key, b] of BUCKET) if (b.resetMs < nowMs) BUCKET.delete(key);
}

/** `Authorization: Bearer <key>` against the configured key, in constant
 *  time (the cookie check's own discipline, auth.ts): a comparison must not
 *  leak how far it matched. */
function bearerOk(header: string | undefined, key: string): boolean {
  const m = /^Bearer\s+(\S+)$/i.exec(header ?? '');
  if (m === null) return false;
  const given = Buffer.from(m[1]!, 'utf8');
  const want = Buffer.from(key, 'utf8');
  return given.length === want.length && timingSafeEqual(given, want);
}

/** The request as the families meet it: the parse the chain's head did,
 *  and the four guards it defined before the first branch. */
export function makeReq(ctx: RouteContext, req: IncomingMessage, res: ServerResponse,
  nowMs: number, url: URL, baseOrigin: string): Req {
  const path = url.pathname;
  const seg = path.split('/').filter((s) => s.length > 0);
  const tooMany = (route: string, max = 20, refused?: () => void): boolean => {
    if (!rateLimited(`${route}:${ipOf(req, ctx.cfg)}`, nowMs, max)) return false;
    if (refused) refused(); else json(res, 429, { error: 'too many requests — try again shortly' });
    return true;
  };
  return {
    req, res, url, path, seg, nowMs, baseOrigin,
    docOr404: (doc) => {
      if (doc === null) json(res, 404, { error: 'no such document' });
      return doc;
    },
    tooMany,
    // an unknown path without a key configured, 401 (and the limiter) with a
    // wrong one; true means the answer has been written
    bearerRefused: () => {
      if (!ctx.cfg.botKey) { json(res, 404, { error: 'not found' }); return true; }
      if (bearerOk(req.headers.authorization, ctx.cfg.botKey)) return false;
      if (!tooMany('bots')) json(res, 401, { error: 'unauthorized' });
      return true;
    },
    devOff: () => {
      if (ctx.mailer.dev) return false;
      json(res, 404, { error: 'not found' });
      return true;
    },
  };
}

/** The actor's kind is parsed here, once: an `app:` seat is an applicant. */
export function cookieSession(auth: Auth, req: IncomingMessage, docId: string):
  { memberId: string; applicantId: string | null } | null {
  const header = req.headers.cookie ?? '';
  const pairs = header.split(';').map((s) => s.trim());
  const own = cookieName(docId);
  const pair = pairs.find((s) => s.startsWith(`${own}=`)) ??
    pairs.find((s) => s.startsWith(`${LEGACY_COOKIE}=`));
  if (!pair) return null;
  const parsed = auth.verifyCookie(pair.slice(pair.indexOf('=') + 1), Date.now());
  if (parsed === null || parsed.docId !== docId) return null;
  const { memberId } = parsed;
  return { memberId,
    applicantId: memberId.startsWith('app:') ? memberId.slice(4) : null };
}

/** The whole body as text, refused past `maxBytes` — the one reader behind
 *  the token form and the JSON commands, each with its own cap. */
async function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > maxBytes) throw new Error('request too large');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** The token from an interstitial form (urlencoded) or a JSON body. */
export async function readTokenBody(req: IncomingMessage): Promise<string> {
  const text = await readBody(req, 10_000);
  const ct = req.headers['content-type'] ?? '';
  if (ct.includes('application/json')) {
    return String((JSON.parse(text) as { token?: unknown }).token ?? '');
  }
  return new URLSearchParams(text).get('token') ?? '';
}

export async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  // a cross-origin form cannot send application/json without a preflight,
  // so this plus SameSite=Lax is the CSRF story until tokens are needed
  // (PRODUCTION row 6, deliberately no tokens).
  //
  // **The gate is the MIME essence, never a substring** (issue #20): what
  // decides whether a browser preflights is the type before the first
  // semicolon, so `text/plain;x=application/json` is CORS-safelisted and
  // sent with no preflight at all — and a substring match let it through,
  // which is the whole of the defence gone. Parameters are the caller's
  // business: `application/json; charset=utf-8` is what a real client sends.
  const ct = req.headers['content-type'] ?? '';
  if (ct.split(';')[0]!.trim().toLowerCase() !== 'application/json') {
    throw new Error('content-type must be application/json');
  }
  const text = await readBody(req, 1_000_000);
  if (text.length === 0) return {};
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('body must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

/** commands.ts's `str`, with the wire's stricter no-empty rule. */
export function expectString(body: Record<string, unknown>, key: string): string {
  return str(body, key, false);
}

export function ipOf(req: IncomingMessage, cfg: ServerConfig): string {
  // Behind Render every socket shares the proxy's address, which would
  // make the limiter one global bucket — a one-person denial of service
  // (stage 3, defect 3).
  //
  // Stage 3 answered that with "the client is the rightmost
  // x-forwarded-for entry: the one hop we know appended it", and staging
  // proved it wrong on 2026-08-20 — the first defect the deploy caught
  // that no source review could. Render fronts every service with
  // Cloudflare, so *two* hops append, and the rightmost entry is a
  // Cloudflare edge address that rotates request to request. Every
  // request therefore got its own bucket: 135 in a row, none limited,
  // spoofed or not. A limiter that never limits is worse than none,
  // because the defect list says it is fixed.
  //
  // The client's true address is the one Cloudflare states, and it
  // overwrites any copy the client sends, so it cannot be spoofed by
  // anybody arriving the way everybody arrives. Falling back to a hop
  // count keeps this honest on a host without Cloudflare: counting from
  // the right is the only spoof-resistant way to read the header, since
  // a client may prepend entries but never append them.
  if (cfg.trustProxy) {
    const cf = req.headers['cf-connecting-ip'];
    const stated = Array.isArray(cf) ? cf[0] : cf;
    if (stated !== undefined && stated.trim() !== '') return stated.trim();
    const xff = req.headers['x-forwarded-for'];
    const list = (Array.isArray(xff) ? xff.join(',') : xff ?? '')
      .split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    if (list.length > 0) {
      return list[Math.max(0, list.length - (cfg.proxyHops ?? 1))]!;
    }
  }
  return req.socket.remoteAddress ?? 'unknown';
}

export function json(res: ServerResponse, code: number, payload: unknown): void {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

/** A page, at 200 unless the caller has a refusal to state — the spent-link
 *  page answers 410, and a refusal a person reads is still a page. */
export function html(res: ServerResponse, body: string, code = 200): void {
  res.writeHead(code, { 'content-type': 'text/html; charset=utf-8' });
  res.end(body);
}

/** The request's path with the query dropped — magic-link tokens travel there. */
export const pathOf = (req: IncomingMessage): string => (req.url ?? '/').split('?')[0]!;

export function redirect(res: ServerResponse, to: string): void {
  res.writeHead(302, { location: to });
  res.end();
}

export function setCookie(res: ServerResponse, docId: string, value: string, secure: boolean): void {
  res.setHeader('set-cookie',
    `${cookieName(docId)}=${value}; Path=/; HttpOnly; SameSite=Lax` +
    `${secure ? '; Secure' : ''}; Max-Age=${90 * 24 * 3600}`);
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
};

export function serveFile(res: ServerResponse, filePath: string): void {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    json(res, 404, { error: 'not found' });
    return;
  }
  const stream = createReadStream(filePath);
  // a file deleted between stat and read, or fd pressure, is a dropped
  // response — never a dead process (review #1, finding 14)
  stream.on('error', (e) => { console.error('serveFile:', e); res.destroy(); });
  res.writeHead(200, {
    'content-type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
  });
  stream.pipe(res);
}
