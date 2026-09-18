/**
 * The thin server (Q368): node:http, no framework. Documents are
 * ConstitutionSessions persisted as their own hash-chained logs; identity
 * is an emailed magic link; the cookie is the only actor any command ever
 * gets; view() is the only read a member is ever served. Mail rides the
 * event log — invitations, lapse warnings and the lapse package are sent
 * by watching what the fold emitted, so a host renders notifications and
 * never invents them.
 *
 * Since PRODUCTION.md stage 2 storage sits behind the Persistence seam
 * and every commit runs on a per-document WriteChain: a 200 means the
 * entries are durable, and two commits to one document cannot interleave.
 *
 * What is left here after refactor Q1352 (m) and (n): the boot, the error
 * counters, the request wrapper and its catch, the headers every answer
 * carries, and `route()` — which is now the ordered walk of one route
 * table and nothing else. The rows themselves are `routes-dev`,
 * `routes-admin`, `routes-auth`, `routes-member` and `routes-surface`,
 * over the `RouteContext` made below.
 */
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { Auth } from './auth.js';
import type { ServerConfig } from './config.js';
import { DocStore } from './store.js';
import { FilePersistence, WriteChain } from './persistence.js';
import type { Persistence } from './persistence.js';
import { PgPersistence } from './pg-persistence.js';
import { Stash } from './stash.js';
import { makeMailer } from './mailer.js';
import { logError } from './error-log.js';
import { MailOutbox } from './outbox.js';
import { asEngineDoc, resumeBridge } from './engine-host.js';
import type { Mailer } from './mailer.js';
import { PauseState, WritePath } from './write-path.js';
import { json, makeReq, pathOf, routeMatches, sweepBuckets } from './routes.js';
import type { Route, RouteContext } from './routes.js';
import { devLadderTable, devMailTable } from './routes-dev.js';
import { healthTable, operatorTable } from './routes-admin.js';
import { authTable } from './routes-auth.js';
import { memberTable } from './routes-member.js';
import { surfaceTable } from './routes-surface.js';

/**
 * **The route table, in the chain's own order** (Q1352 (m), (n)). The order
 * is load-bearing and this array is the whole of it: health answered before
 * the dev mail pair, the operator's key-gated routes between the two dev
 * halves, and the static rows last, because a document's page is what
 * `/d/:slug` means only once nothing else has claimed it. Two families are
 * split in two for exactly this reason — the paths they hold are disjoint,
 * so nothing would break if they were joined, but preserving the order
 * costs one extra export apiece and settles the question.
 *
 * The two dev arrays are **empty in the production artifact**: their rows
 * are pushed inside a `DEV:`-labelled statement, which the build drops
 * bodily, so the row, its path and its handler go together.
 */
const ROUTES: Route[] = [
  ...healthTable,
  ...devMailTable,
  ...operatorTable,
  ...devLadderTable,
  ...authTable,
  ...memberTable,
  ...surfaceTable,
];

export interface DraftServer {
  server: Server;
  store: DocStore;
  auth: Auth;
  mailer: Mailer;
  /** The durable mail queue and its sender (finding 15). */
  outbox: MailOutbox;
  /** Drive the clocks (§9.5/§9.5a): call periodically; safe to call any time. */
  tick(nowMs?: number): Promise<void>;
  /**
   * Graceful shutdown (PRODUCTION.md stage 7): stop accepting, let every
   * in-flight commit land, close idle connections, release the store.
   * A deploy's SIGTERM must never tear an append.
   */
  close(): Promise<void>;
}

/** The storage backend the configuration names (stage 6's two switches):
 *  `pg` connects and migrates; `file` is the JSONL layout under dataDir.
 *  Neither falls back to the other. */
export async function openPersistence(cfg: ServerConfig): Promise<Persistence> {
  if (cfg.store === 'pg') {
    if (cfg.databaseUrl === null) throw new Error('DRAFT_STORE=pg requires DATABASE_URL');
    return PgPersistence.open(cfg.databaseUrl);
  }
  return new FilePersistence(cfg.dataDir);
}

export async function createDraftServer(cfg: ServerConfig,
  injected?: Persistence): Promise<DraftServer> {
  const bootedAtMs = Date.now();
  let closing: Promise<void> | null = null;

  /**
   * **Operator visibility during a session** (entry 77, the alpha-readiness
   * pass). There is no error reporting anywhere in this repo — Sentry is
   * PRODUCTION.md stage 16 and is not this — and for a supervised room the
   * minimum is being able to see *that the server threw*, on one endpoint,
   * between sessions. So: a count of the throws nobody handled, by where
   * they happened, served on `/healthz` beside the outbox's two numbers.
   *
   * What counts. A request that ends 500 is one — the route threw something
   * carrying a system code, and the member was told nothing. A tick failure
   * is one — §4.6's metronome missed a document, once a minute, and the
   * repeat is the alarm. An outbox pass failure is one. A **400 is not**:
   * a module refusal is the product working, and counting it would bury the
   * signal under ordinary traffic (a member proposing without a pen).
   *
   * `last` is a **kind** and a moment, not a message and not a stack: the
   * endpoint is public by the same call that made the catalogue public, and
   * the throws counted here are exactly the ones carrying a system code —
   * whose messages are the ones that quote a path (`ENOENT: … open
   * '/var/data/docs/<id>/log.jsonl'`), naming both the host's layout and an
   * opaque document id. So the wire gets the code (or the error's class),
   * which says *which* thing broke, and the full message stays where it was
   * always going anyway: the server's own log line.
   */
  const errors = { total: 0, request: 0, tick: 0, outbox: 0,
    last: null as null | { at: number; where: string; kind: string } };
  const noteError = (where: 'request' | 'tick' | 'outbox', e: unknown): void => {
    errors.total += 1;
    errors[where] += 1;
    const code = (e as { code?: unknown }).code;
    errors.last = { at: Date.now(), where,
      kind: typeof code === 'string' ? code
        : e instanceof Error ? e.constructor.name : typeof e };
  };
  // **A pause is announced, never guessed** (Q1345): the state, its two
  // constants and its sentence are `write-path.ts`'s `PauseState`, since
  // what a pause does is stop writing — this instance persists nothing,
  // refuses every command with 503 and ticks nothing. The admin family
  // makes it, lifts it, and carries its payload on every view answer.
  const pause = new PauseState();
  const persistence = injected ?? await openPersistence(cfg);
  const store = new DocStore(persistence);
  await store.loadAll();
  for (const doc of store.all()) {
    try {
      await resumeBridge(persistence, doc, cfg.engineTuning);
    } catch (e) {
      // review #2, finding 1: a half-written bridge state or engine log
      // must quarantine this document's engine, never the whole server —
      // the document itself still serves, as loadAll already ensures
      console.error(`document '${doc.id}': engine state failed to load — engine quarantined:`, e);
      asEngineDoc(doc).engineQuarantined = true;
    }
  }
  const auth = new Auth(cfg.secret, persistence);
  const mailer = makeMailer(cfg);
  const outbox: MailOutbox = new MailOutbox({
    persistence, mailer,
    mailOff: () => cfg.mailOff,
    revoke: (hash) => auth.revoke(hash),
    // **the give-up door** (SURFACE E34): one pass's dead mail, grouped by the
    // document it was about and handed to that document's own log, so an
    // invitation that never arrived stops looking like one nobody has opened.
    // The write path is made below, needing this outbox; the arrow reaches it
    // when a pass gives up, which is long after.
    gaveUp: (rows): Promise<void> => writes.tellGaveUp(rows),
  });
  const stash = new Stash(persistence);
  const commits = new WriteChain();

  /**
   * The write path (refactor Q1352 (l)): the mail door, the fold clock,
   * `commit` and the mail it relays, the outbox's give-up door and §4.6's
   * metronome — `write-path.ts`, made here with exactly what those read.
   * The error counters stay in this file, since the request path counts
   * into them and `/healthz` serialises them; `noteError` is the whole of
   * the write path's reach into them, so nothing there points back here.
   */
  const writes: WritePath = new WritePath({
    cfg, persistence, store, auth, mailer, outbox, commits, pause,
    noteError,
    closing: () => closing !== null,
    now: () => Date.now(),
  });

  const httpsOn = cfg.baseUrl.startsWith('https://');

  /**
   * What every route family reads (Q1352 (m)). Made once; the three surface
   * fields are mutable because a surface upload (Q1347) moves where the page
   * files come from and which commit answers in `x-build`, and both the
   * static family and `/healthz` must see the move.
   */
  const ctx: RouteContext = {
    cfg, store, auth, mailer, outbox, stash, commits, writes, pause,
    errors, bootedAtMs, httpsOn,
    designDir: cfg.designDir,
    buildSha: cfg.buildSha,
    surfaceSha: null,
  };

  /** The minute's other housekeeping rides the same metronome: the rate
   *  limiter's stale buckets, swept before the documents are driven. */
  const tick = async (nowMs?: number): Promise<void> => {
    // the buckets are the host's, so they sweep on the wall clock; the
    // documents are each asked for their own now, which is that same wall
    // clock everywhere but a document a dev walk has moved (Q1455)
    sweepBuckets(nowMs ?? Date.now());
    await writes.tick(nowMs);
  };

  const server = createServer((req, res) => {
    // one line per response (stage 7): method, path, status, duration.
    // The query string is dropped on purpose — magic-link tokens travel
    // there — and the health check is silent, or the platform's pings
    // would be most of the log.
    const startedMs = Date.now();
    const pathOnly = (req.url ?? '/').split('?')[0]!;
    if (pathOnly !== '/healthz') {
      res.on('finish', () => {
        console.log(`${req.method ?? '-'} ${pathOnly} ${res.statusCode} ` +
          `${Date.now() - startedMs}ms`);
      });
    }
    void route(req, res).catch((e: unknown) => {
      // module and validation errors are written for members and pass
      // through; anything carrying a system code (fs, net) is internal
      // and says nothing about itself (stage 3, defect 9)
      const internal = typeof (e as { code?: unknown }).code === 'string';
      if (internal) {
        noteError('request', e);
        console.error(`internal error (#${errors.total}) ${req.method ?? '-'} `
          + `${(req.url ?? '/').split('?')[0]}:`, e);
      }
      const message = e instanceof Error ? e.message : String(e);
      // **and every request that failed lands in the error log** (Q1330) —
      // a refusal the cmd route already wrote carries `logged`; everything
      // else is written here with what the catch knows: the path, the
      // status and the reason. The 500's reason is the full message, which
      // the wire never gets (stage 3, defect 9) and the operator's file may.
      if (!(e as { logged?: boolean }).logged) {
        logError(cfg.dataDir, { kind: internal ? 'failed' : 'refused',
          status: internal ? 500 : 400, method: req.method ?? '-', path: pathOf(req),
          reason: message });
      }
      if (!res.headersSent) {
        if (internal) json(res, 500, { error: 'something went wrong' });
        else json(res, 400, { error: message });
      }
    });
  });

  /**
   * The head of the old chain, and the dispatch that replaced its body: the
   * headers every answer carries, the two refusals that must be made before
   * any row sees the request, then the table in order until one row says it
   * has answered. The 404 at the end is the chain's own.
   */
  async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const nowMs = Date.now();
    const url = new URL(req.url ?? '/', cfg.baseUrl);
    // the one origin every Origin header on this request is checked against;
    // read per request, since cfg.baseUrl is settled after listen (port 0)
    const baseOrigin = new URL(cfg.baseUrl).origin;
    const r = makeReq(ctx, req, res, nowMs, url, baseOrigin);
    const { seg } = r;

    // security headers on everything (stage 3, defects 2/9); the page
    // ships large inline scripts, so a script CSP waits for the asset
    // pipeline — these directives bite without breaking it
    res.setHeader('x-content-type-options', 'nosniff');
    // which bytes are answering (see cfg.buildSha): CI polls this after a
    // deploy so that "verified" is a statement about the new build. **A
    // surface upload moves it** (Q1347), which is what makes an open page
    // reload — so this header names the page's commit, not the process's.
    // Which *process* is running is `booted` in `/healthz` (issue #8, F1),
    // and that is the field the deploy lane compares against.
    if (ctx.buildSha !== null) res.setHeader('x-build', ctx.buildSha);
    // tokens, views and interstitials must never sit in a cache
    // (review #1, finding 10)
    if (seg[0] === 'api' || seg[0] === 'auth') {
      res.setHeader('cache-control', 'no-store');
    }
    // a cross-site form must not consume tokens or clobber the session
    // (review #1, finding 13): the interstitial posts same-origin, and a
    // browser that sends Origin at all must agree with us
    if (req.method === 'POST' && seg[0] === 'auth') {
      const origin = req.headers.origin;
      if (origin !== undefined && origin !== baseOrigin) {
        json(res, 403, { error: 'cross-site request refused' });
        return;
      }
    }
    res.setHeader('referrer-policy', 'no-referrer');
    res.setHeader('content-security-policy',
      "frame-ancestors 'none'; object-src 'none'; base-uri 'none'");
    if (httpsOn) {
      res.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains');
      // behind the proxy, honour the original protocol: http gets one answer
      if (cfg.trustProxy && req.headers['x-forwarded-proto'] === 'http') {
        res.writeHead(301, { location: cfg.baseUrl + (req.url ?? '/') });
        res.end();
        return;
      }
    }

    // the table, first match wins — and a row may still decline, in which
    // case the walk goes on exactly as the old chain's fallthrough did
    for (const entry of ROUTES) {
      if (!routeMatches(entry, r)) continue;
      if (await entry.handler(ctx, r)) return;
    }

    json(res, 404, { error: 'not found' });
  }

  const close = (): Promise<void> => {
    closing ??= (async () => {
      // stop accepting, drop idle keep-alives, and give requests in flight
      // a moment to finish — but never wait on them indefinitely (review
      // #2, finding 5): one stalled POST must not stop the drain, the store
      // close and the clean exit that the 10s limit would otherwise cut
      const closed = new Promise<void>((resolve) => server.close(() => resolve()));
      server.closeIdleConnections();
      await Promise.race([closed, new Promise<void>((r) => setTimeout(r, 3_000).unref())]);
      await commits.drain();
      // …and the sender with them (finding 15): a send torn in half by a
      // deploy's SIGTERM leaves a row that is still pending, which the next
      // instance re-offers — so the member gets it twice
      await outbox.drain();
      server.closeAllConnections();
      await closed;
      await persistence.close?.();
    })();
    return closing;
  };

  return { server, store, auth, mailer, outbox, tick, close };
}
